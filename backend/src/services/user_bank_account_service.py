import csv
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from src.models.user import User
from src.models.user_bank_account import UserBankAccount

async def bulk_create_bank_accounts(db: AsyncSession, csv_file: bytes) -> tuple[int, list[str]]:
    success_count = 0
    errors = []
    
    try:
        content_str = csv_file.decode('utf-8-sig')
    except Exception:
        raise HTTPException(status_code=400, detail="El archivo debe tener codificación UTF-8 válida.")

    stream = io.StringIO(content_str)
    first_line = content_str.split('\n')[0]
    delimiter = ';' if ';' in first_line else ','
    
    reader = csv.DictReader(stream, delimiter=delimiter)
    
    for row_num, row in enumerate(reader, start=2):
        try:
            # Normalizar nombres de columnas a minúsculas y sin espacios
            cleaned_row = {k.strip().lower(): v for k, v in row.items() if k is not None}
            
            user_id_str = cleaned_row.get('usuario_id') or cleaned_row.get('user_id')
            banco = cleaned_row.get('banco')
            tipo_cuenta = cleaned_row.get('tipo_cuenta') or cleaned_row.get('tipo')
            numero_cuenta = cleaned_row.get('numero_cuenta') or cleaned_row.get('numero')

            if not user_id_str or not str(user_id_str).strip().isdigit():
                errors.append(f"Fila {row_num}: El campo 'usuario_id' es requerido y debe ser numérico.")
                continue
                
            if not banco or not str(banco).strip():
                errors.append(f"Fila {row_num}: El campo 'banco' es requerido.")
                continue

            if not tipo_cuenta or not str(tipo_cuenta).strip():
                errors.append(f"Fila {row_num}: El campo 'tipo_cuenta' es requerido.")
                continue

            if not numero_cuenta or not str(numero_cuenta).strip():
                errors.append(f"Fila {row_num}: El campo 'numero_cuenta' es requerido.")
                continue

            # Buscar si el usuario existe
            user_res = await db.execute(select(User).where(User.id == int(user_id_str)))
            user = user_res.scalars().first()
            if not user:
                errors.append(f"Fila {row_num}: No existe ningún usuario con ID '{user_id_str}'.")
                continue

            # Comprobar si ya existe la cuenta para este usuario
            existing_res = await db.execute(
                select(UserBankAccount).where(
                    UserBankAccount.user_id == user.id,
                    UserBankAccount.banco == str(banco).strip(),
                    UserBankAccount.numero_cuenta == str(numero_cuenta).strip()
                )
            )
            existing_account = existing_res.scalars().first()

            if existing_account:
                # Actualizar si hay cambios
                existing_account.tipo_cuenta = str(tipo_cuenta).strip()
                success_count += 1
            else:
                # Crear nueva cuenta
                new_account = UserBankAccount(
                    user_id=user.id,
                    banco=str(banco).strip(),
                    tipo_cuenta=str(tipo_cuenta).strip(),
                    numero_cuenta=str(numero_cuenta).strip(),
                    is_active=True
                )
                db.add(new_account)
                success_count += 1

        except Exception as e:
            errors.append(f"Fila {row_num}: Error inesperado: {str(e)}")

    if success_count > 0:
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al guardar las cuentas en la base de datos: {str(e)}")
            
    return success_count, errors
