import csv
import io
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from src.models.user import User
from src.models.wallet import Wallet, WalletStatus

async def bulk_create_or_update_wallets(db: AsyncSession, csv_file: bytes) -> tuple[int, list[str]]:
    success_count = 0
    errors = []
    
    try:
        content_str = csv_file.decode('utf-8-sig')
    except UnicodeDecodeError:
        try:
            content_str = csv_file.decode('latin-1')
        except Exception:
            raise HTTPException(status_code=400, detail="El archivo debe tener codificación UTF-8 o Latin-1 válida.")

    stream = io.StringIO(content_str)
    
    # Use sniffer to detect dialect/delimiter automatically
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(content_str[:2048])
    except csv.Error:
        dialect = csv.excel
        
    stream.seek(0)
    reader = csv.DictReader(stream, dialect=dialect)
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="El archivo CSV está vacío o no tiene cabeceras válidas.")
        
    # Normalize headers
    headers = [h.strip().lower() for h in reader.fieldnames if h is not None]
    reader.fieldnames = headers
    
    for row_num, row in enumerate(reader, start=2):
        try:
            id_str = row.get('id') or row.get('wallet_id')
            user_id_str = row.get('usuario_id') or row.get('user_id')
            balance_str = row.get('balance') or row.get('saldo') or row.get('monto')
            currency_str = row.get('currency') or row.get('divisa') or 'COP'
            status_str = row.get('status') or row.get('estado') or 'active'

            if not user_id_str or not str(user_id_str).strip().isdigit():
                errors.append(f"Fila {row_num}: El campo 'usuario_id' es requerido y debe ser numérico.")
                continue
                
            if not balance_str or not str(balance_str).strip():
                errors.append(f"Fila {row_num}: El campo 'balance' (saldo) es requerido.")
                continue

            try:
                # Convert balance to Decimal, stripping dollar signs and commas
                balance_val = Decimal(str(balance_str).replace('$', '').replace(',', '').strip())
            except Exception:
                errors.append(f"Fila {row_num}: El campo 'balance' debe ser un número decimal válido.")
                continue

            # Normalize status
            status_normalized = str(status_str).strip().lower()
            if status_normalized in ['active', 'activo', 'activa']:
                status_enum = WalletStatus.ACTIVE
            elif status_normalized in ['frozen', 'congelado', 'congelada', 'inactive', 'inactivo']:
                status_enum = WalletStatus.FROZEN
            else:
                status_enum = WalletStatus.ACTIVE

            # Parse ID if provided
            id_val = None
            if id_str and str(id_str).strip().isdigit():
                id_val = int(id_str)

            # Check if user exists
            user_res = await db.execute(select(User).where(User.id == int(user_id_str)))
            user = user_res.scalars().first()
            if not user:
                errors.append(f"Fila {row_num}: No existe ningún usuario con ID '{user_id_str}'.")
                continue

            # Check for wallet conflicts if id is provided
            if id_val:
                conflict_res = await db.execute(select(Wallet).where(Wallet.id == id_val))
                conflict_wallet = conflict_res.scalars().first()
                if conflict_wallet and conflict_wallet.user_id != user.id:
                    errors.append(f"Fila {row_num}: El ID de wallet '{id_val}' ya está en uso por otro usuario (ID '{conflict_wallet.user_id}').")
                    continue

            # Check if wallet already exists for this user
            wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
            wallet = wallet_res.scalars().first()

            if wallet:
                # If ID is provided, verify it matches
                if id_val and wallet.id != id_val:
                    errors.append(f"Fila {row_num}: El usuario con ID '{user.id}' ya tiene la wallet ID '{wallet.id}', no se puede cambiar a ID '{id_val}'.")
                    continue
                # Update existing wallet balance
                wallet.balance = balance_val
                wallet.currency = str(currency_str).strip().upper()[:3]
                wallet.status = status_enum
                success_count += 1
            else:
                # Create new wallet
                new_wallet = Wallet(
                    id=id_val,  # Will be None if not provided (DB auto-increment)
                    user_id=user.id,
                    balance=balance_val,
                    currency=str(currency_str).strip().upper()[:3],
                    status=status_enum
                )
                db.add(new_wallet)
                success_count += 1

        except Exception as e:
            errors.append(f"Fila {row_num}: Error inesperado: {str(e)}")

    if success_count > 0:
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al guardar las billeteras en la base de datos: {str(e)}")
            
    return success_count, errors
