from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.models.user import User
from src.models.security import Role
from src.core.security import get_password_hash
from fastapi import HTTPException
import csv
import io
from datetime import datetime

class UserService:
    @staticmethod
    async def get_all_users(
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20, 
        search: str = None, 
        role_id: int = None, 
        is_active: bool = None
    ) -> dict:
        from sqlalchemy import or_, func
        
        query = select(User)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    User.name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.document_id.ilike(search_term)
                )
            )
            
        if is_active is not None:
            query = query.where(User.is_active == is_active)
            
        if role_id is not None:
            query = query.join(User.roles).where(Role.id == role_id)
            
        # Contar total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        
        # Paginar y obtener data
        offset = (page - 1) * limit
        query = query.options(selectinload(User.roles).selectinload(Role.permissions))
        query = query.order_by(User.id.desc()).offset(offset).limit(limit)
        
        result = await db.execute(query)
        data = result.scalars().all()
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": data
        }

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> User:
        result = await db.execute(select(User).options(selectinload(User.roles).selectinload(Role.permissions)).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    @staticmethod
    async def create_user_admin(db: AsyncSession, user_data: dict) -> User:
        # Check if email exists
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user with default password
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            document_id=user_data.get("document_id"),
            phone_number=user_data.get("phone_number"),
            date_of_birth=user_data.get("date_of_birth"),
            password_hash=get_password_hash("Temp123!"),
            must_change_password=True,
            is_active=user_data.get("is_active", True)
        )
        
        # Asignar roles si se proveen
        if "role_ids" in user_data and user_data["role_ids"]:
            roles_result = await db.execute(select(Role).where(Role.id.in_(user_data["role_ids"])))
            user.roles = roles_result.scalars().all()
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        # Fetch again to eagerly load roles for response
        return await UserService.get_user_by_id(db, user.id)

    @staticmethod
    async def update_user_admin(db: AsyncSession, user_id: int, user_data: dict) -> User:
        user = await UserService.get_user_by_id(db, user_id)
        
        # If email changed, check uniqueness
        if "email" in user_data and user_data["email"] != user.email:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            if result.scalars().first():
                raise HTTPException(status_code=400, detail="Email already registered")

        for key, value in user_data.items():
            if key != "role_ids":
                setattr(user, key, value)

        # Update roles if provided
        if "role_ids" in user_data:
            if user_data["role_ids"]:
                roles_result = await db.execute(select(Role).where(Role.id.in_(user_data["role_ids"])))
                user.roles = roles_result.scalars().all()
            else:
                user.roles = []

        await db.commit()
        await db.refresh(user)
        return await UserService.get_user_by_id(db, user.id)

    @staticmethod
    async def bulk_create_users(db: AsyncSession, csv_content: str) -> dict:
        try:
            dialect = csv.Sniffer().sniff(csv_content[:1024])
            reader = csv.DictReader(io.StringIO(csv_content), dialect=dialect)
        except Exception:
            reader = csv.DictReader(io.StringIO(csv_content))
            
        success_count = 0
        errors = []
        
        # Load all roles to map names to objects
        roles_result = await db.execute(select(Role))
        all_roles = {r.name.lower(): r for r in roles_result.scalars().all()}
        
        print(f"--- Iniciando Carga Masiva de Usuarios ---", flush=True)

        for row_number, row in enumerate(reader, start=2):
            try:
                name = row.get("name", "").strip()
                email = row.get("email", "").strip()
                
                print(f"Procesando fila {row_number}: email={email}", flush=True)
                
                if not name or not email:
                    errors.append(f"Fila {row_number}: Nombre o Correo electrónico faltante.")
                    continue

                # Check if email exists
                existing = await db.execute(select(User).where(User.email == email))
                if existing.scalars().first():
                    errors.append(f"Fila {row_number}: El correo {email} ya existe en base de datos.")
                    continue
                
                user_id_str = row.get("id", "").strip()
                user_id = None
                if user_id_str and user_id_str.isdigit():
                    user_id = int(user_id_str)
                    existing_id = await db.execute(select(User).where(User.id == user_id))
                    if existing_id.scalars().first():
                        errors.append(f"Fila {row_number}: El ID {user_id} ya está en uso.")
                        continue
                
                doc_id = row.get("document_id", "").strip()
                if not doc_id:
                    errors.append(f"Fila {row_number}: Documento de identidad faltante (requerido para contraseña inicial).")
                    continue
                
                # Prevenir duplicados de documento en base de datos
                existing_doc = await db.execute(select(User).where(User.document_id == doc_id))
                if existing_doc.scalars().first():
                    errors.append(f"Fila {row_number}: El documento {doc_id} ya existe en base de datos.")
                    continue
                
                raw_dob = row.get("date_of_birth", "").strip()
                date_of_birth = None
                if raw_dob:
                    if "/" in raw_dob:
                        try:
                            date_of_birth = datetime.strptime(raw_dob, "%d/%m/%Y").strftime("%Y-%m-%d")
                        except ValueError:
                            try:
                                date_of_birth = datetime.strptime(raw_dob, "%Y/%m/%d").strftime("%Y-%m-%d")
                            except ValueError:
                                date_of_birth = raw_dob
                    else:
                        date_of_birth = raw_dob

                user = User(
                    name=name,
                    email=email,
                    document_id=doc_id,
                    phone_number=row.get("phone_number", "").strip() or None,
                    date_of_birth=date_of_birth,
                    password_hash=get_password_hash(doc_id),
                    must_change_password=True,
                    is_active=True
                )
                
                if user_id:
                    user.id = user_id

                roles_str = row.get("roles", "").strip()
                if roles_str:
                    role_names = [r.strip().lower() for r in roles_str.split(",")]
                    assigned_roles = []
                    for r_name in role_names:
                        if r_name in all_roles:
                            assigned_roles.append(all_roles[r_name])
                    user.roles = assigned_roles

                db.add(user)
                # Commit here to save each user individually
                await db.commit()
                success_count += 1
                print(f"-> Fila {row_number} guardada con éxito.", flush=True)
                
            except Exception as e:
                await db.rollback() # Limpiar la transacción en caso de error
                print(f"-> Error en fila {row_number}: {str(e)}", flush=True)
                errors.append(f"Fila {row_number}: Error inesperado - {str(e)}")

        print(f"--- Fin Carga Masiva. Exitosos: {success_count}, Errores: {len(errors)} ---", flush=True)
        return {
            "success": success_count,
            "errors": errors
        }
