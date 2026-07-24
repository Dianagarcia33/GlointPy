from typing import Sequence, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func
from fastapi import HTTPException, status
from datetime import datetime
from src.models.potential_referral import PotentialReferral
from src.models.investor import Investor
from src.schemas.potential_referral import PotentialReferralCreate, PotentialReferralUpdate

class PotentialReferralService:
    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: int) -> Sequence[PotentialReferral]:
        # Buscar investor del usuario
        result = await db.execute(select(Investor).where(Investor.user_id == user_id))
        investors = result.scalars().all()
        if not investors:
            return []
        
        investor_ids = [inv.id for inv in investors]
        ref_result = await db.execute(
            select(PotentialReferral)
            .where(PotentialReferral.investor_id.in_(investor_ids))
            .order_by(PotentialReferral.id.desc())
        )
        return ref_result.scalars().all()

    @staticmethod
    async def get_all_admin(
        db: AsyncSession, 
        search: Optional[str] = None, 
        estado: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        query = select(PotentialReferral)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    PotentialReferral.nombre.ilike(search_term),
                    PotentialReferral.telefono.ilike(search_term),
                    PotentialReferral.email.ilike(search_term),
                    PotentialReferral.codigo_referido.ilike(search_term)
                )
            )

        if estado:
            query = query.where(PotentialReferral.estado == estado)

        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar_one()

        offset = (page - 1) * limit
        query = query.order_by(PotentialReferral.id.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        referrals = result.scalars().all()

        return {
            "data": referrals,
            "total": total,
            "page": page,
            "limit": limit
        }

    @staticmethod
    async def create_by_user(db: AsyncSession, user_id: int, data: PotentialReferralCreate) -> PotentialReferral:
        # Obtener el investor del usuario
        res = await db.execute(select(Investor).where(Investor.user_id == user_id))
        investor = res.scalars().first()
        if not investor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes tener un contrato de inversión activo para registrar referidos."
            )

        codigo = data.codigo_referido or investor.assigned_code

        payload = data.model_dump()
        payload["investor_id"] = investor.id
        payload["codigo_referido"] = codigo
        payload["estado"] = "pendiente"

        db_ref = PotentialReferral(**payload)
        db.add(db_ref)
        await db.commit()
        await db.refresh(db_ref)
        return db_ref

    @staticmethod
    async def update(db: AsyncSession, referral_id: int, data: PotentialReferralUpdate) -> PotentialReferral:
        res = await db.execute(select(PotentialReferral).where(PotentialReferral.id == referral_id))
        db_ref = res.scalars().first()
        if not db_ref:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referido potencial no encontrado"
            )

        update_data = data.model_dump(exclude_unset=True)
        if db_ref.estado == "registrado" and update_data.get("estado") and update_data.get("estado") != "registrado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede cambiar el estado de un referido que ya fue registrado como usuario."
            )

        for field, val in update_data.items():
            setattr(db_ref, field, val)

        await db.commit()
        await db.refresh(db_ref)
        return db_ref

    @staticmethod
    async def delete(db: AsyncSession, referral_id: int) -> None:
        res = await db.execute(select(PotentialReferral).where(PotentialReferral.id == referral_id))
        db_ref = res.scalars().first()
        if not db_ref:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referido potencial no encontrado"
            )

        await db.delete(db_ref)
        await db.commit()

    @staticmethod
    async def convert_to_investment_request(
        db: AsyncSession, 
        referral_id: int, 
        data: Any
    ) -> Dict[str, Any]:
        from decimal import Decimal
        from sqlalchemy import insert
        from src.models.user import User
        from src.models.security import Role, user_roles
        from src.models.wallet import Wallet, WalletStatus
        from src.models.user_bank_account import UserBankAccount
        from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
        from src.core.security import get_password_hash

        res = await db.execute(select(PotentialReferral).where(PotentialReferral.id == referral_id))
        referral = res.scalars().first()
        if not referral:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referido potencial no encontrado"
            )

        # 1. Validar correo duplicado
        user_check = await db.execute(select(User).where(User.email == data.email))
        if user_check.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ingresado ya está registrado en el sistema."
            )

        # 2. Obtener rol de Inversionista/Usuario
        role_res = await db.execute(select(Role).where(Role.name.in_(["Investor", "Inversionista", "Usuario"])))
        role = role_res.scalars().first()

        # 3. Crear Usuario (Usando el documento como contraseña inicial por defecto)
        raw_password = (data.password or data.documento).strip()
        hashed_pwd = get_password_hash(raw_password)
        new_user = User(
            name=data.name,
            email=data.email,
            hashed_password=hashed_pwd,
            is_active=True,
            document_id=data.documento
        )
        db.add(new_user)
        await db.flush()

        if role:
            await db.execute(insert(user_roles).values(user_id=new_user.id, role_id=role.id))

        # 4. Crear Billetera
        wallet = Wallet(
            user_id=new_user.id,
            balance=Decimal("0.00"),
            currency="COP",
            status=WalletStatus.ACTIVE
        )
        db.add(wallet)

        # 5. Crear Cuenta Bancaria (Bóveda)
        bank_acc = UserBankAccount(
            user_id=new_user.id,
            banco=data.banco,
            tipo_cuenta=data.tipo_cuenta,
            numero_cuenta=data.numero_cuenta
        )
        db.add(bank_acc)

        # 6. Crear Solicitud de Inversión (InvestmentRequest)
        req = InvestmentRequest(
            user_id=new_user.id,
            investor_id=None,
            paquete_inversion_id=data.paquete_id,
            monto=Decimal(str(data.monto)),
            comprobante_path=data.comprobante_path,
            status=InvestmentRequestStatus.pending,
            extra_data={
                "nombre_completo": data.name,
                "tipo_documento": data.tipo_documento,
                "documento": data.documento,
                "fecha_nacimiento": data.fecha_nacimiento,
                "numero_celular": data.numero_celular,
                "ciudad": data.ciudad,
                "banco": data.banco,
                "tipo_cuenta": data.tipo_cuenta,
                "numero_cuenta": data.numero_cuenta,
                "kyc_docs": data.kyc_docs,
                "contract_period_id": data.contract_period_id,
                "referred_by": referral.codigo_referido
            }
        )
        db.add(req)

        # 7. Actualizar el referido potencial a 'registrado'
        referral.estado = "registrado"

        await db.commit()

        return {
            "message": "Referido convertido exitosamente en solicitud de inversión",
            "request_id": req.id,
            "user_id": new_user.id
        }
