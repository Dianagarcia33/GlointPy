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


async def bulk_create_or_update_wallet_transactions(db: AsyncSession, csv_file: bytes) -> tuple[int, list[str]]:
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
            id_str = row.get('id')
            wallet_id_str = row.get('wallet_id') or row.get('billetera_id')
            amount_str = row.get('amount') or row.get('monto') or row.get('valor')
            type_str = row.get('type') or row.get('tipo')
            ref_type_str = row.get('reference_type') or row.get('tipo_referencia')
            ref_id_str = row.get('reference_id') or row.get('id_referencia')
            desc_str = row.get('description') or row.get('descripcion')
            bal_after_str = row.get('balance_after') or row.get('saldo_despues')
            created_at_str = row.get('created_at') or row.get('fecha_creacion')
            updated_at_str = row.get('updated_at') or row.get('fecha_actualizacion')

            if not wallet_id_str or not str(wallet_id_str).strip().isdigit():
                errors.append(f"Fila {row_num}: El campo 'wallet_id' es requerido y debe ser numérico.")
                continue

            if not amount_str or not str(amount_str).strip():
                errors.append(f"Fila {row_num}: El campo 'amount' (monto) es requerido.")
                continue

            if not type_str or not str(type_str).strip():
                errors.append(f"Fila {row_num}: El campo 'type' (tipo) es requerido.")
                continue

            if not bal_after_str or not str(bal_after_str).strip():
                errors.append(f"Fila {row_num}: El campo 'balance_after' (saldo después) es requerido.")
                continue

            try:
                amount_val = Decimal(str(amount_str).replace('$', '').replace(',', '').strip())
            except Exception:
                errors.append(f"Fila {row_num}: El campo 'amount' debe ser un número decimal válido.")
                continue

            try:
                bal_after_val = Decimal(str(bal_after_str).replace('$', '').replace(',', '').strip())
            except Exception:
                errors.append(f"Fila {row_num}: El campo 'balance_after' debe ser un número decimal válido.")
                continue

            # Validate wallet exists
            wallet_res = await db.execute(select(Wallet).where(Wallet.id == int(wallet_id_str)))
            wallet = wallet_res.scalars().first()
            if not wallet:
                errors.append(f"Fila {row_num}: No existe ninguna wallet con ID '{wallet_id_str}'.")
                continue

            # Parse datetime fields if provided
            created_at_val = datetime.utcnow()
            if created_at_str and str(created_at_str).strip():
                try:
                    # Try common format 'YYYY-MM-DD HH:MM:SS'
                    created_at_val = datetime.strptime(str(created_at_str).strip(), '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    try:
                        created_at_val = datetime.fromisoformat(str(created_at_str).strip().replace('Z', '+00:00'))
                    except Exception:
                        pass # fallback to utcnow

            updated_at_val = created_at_val
            if updated_at_str and str(updated_at_str).strip():
                try:
                    updated_at_val = datetime.strptime(str(updated_at_str).strip(), '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    try:
                        updated_at_val = datetime.fromisoformat(str(updated_at_str).strip().replace('Z', '+00:00'))
                    except Exception:
                        pass # fallback to created_at_val

            # Parse optional fields
            id_val = None
            if id_str and str(id_str).strip().isdigit():
                id_val = int(id_str)

            ref_id_val = None
            if ref_id_str and str(ref_id_str).strip().isdigit():
                ref_id_val = int(ref_id_str)

            # Check if transaction with this id already exists (upsert)
            tx = None
            if id_val:
                tx_res = await db.execute(select(WalletTransaction).where(WalletTransaction.id == id_val))
                tx = tx_res.scalars().first()

            if tx:
                tx.wallet_id = wallet.id
                tx.amount = amount_val
                tx.type = str(type_str).strip()
                tx.reference_type = str(ref_type_str).strip() if ref_type_str else None
                tx.reference_id = ref_id_val
                tx.description = str(desc_str).strip() if desc_str else None
                tx.balance_after = bal_after_val
                tx.created_at = created_at_val
                tx.updated_at = updated_at_val
                success_count += 1
            else:
                new_tx = WalletTransaction(
                    id=id_val,
                    wallet_id=wallet.id,
                    amount=amount_val,
                    type=str(type_str).strip(),
                    reference_type=str(ref_type_str).strip() if ref_type_str else None,
                    reference_id=ref_id_val,
                    description=str(desc_str).strip() if desc_str else None,
                    balance_after=bal_after_val,
                    created_at=created_at_val,
                    updated_at=updated_at_val
                )
                db.add(new_tx)
                success_count += 1

        except Exception as e:
            errors.append(f"Fila {row_num}: Error inesperado: {str(e)}")

    if success_count > 0:
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al guardar las transacciones en la base de datos: {str(e)}")
            
    return success_count, errors
