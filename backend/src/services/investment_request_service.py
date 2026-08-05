import csv
import io
import logging
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from sqlalchemy.future import select
from sqlalchemy import or_, func
from sqlalchemy.orm import selectinload
from typing import Dict, Any, Optional

from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
from src.models.user import User

logger = logging.getLogger(__name__)

class InvestmentRequestService:
    
    @staticmethod
    async def get_investment_requests(db: AsyncSession, page: int = 1, limit: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        from src.models.investor import Investor
        query = select(InvestmentRequest).options(
            selectinload(InvestmentRequest.user),
            selectinload(InvestmentRequest.package),
            selectinload(InvestmentRequest.investor).selectinload(Investor.package),
            selectinload(InvestmentRequest.investor).selectinload(Investor.period)
        )
        
        if search:
            search_pattern = f"%{search}%"
            query = query.join(InvestmentRequest.user).filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )
            
        # Count total (sin usar subquery para evitar problemas en SQLAlchemy)
        count_query = select(func.count(InvestmentRequest.id))
        if search:
            count_query = count_query.join(InvestmentRequest.user).filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )
            
        total_result = await db.execute(count_query)
        total = total_result.scalar_one_or_none() or 0
        
        # Pagination
        query = query.order_by(InvestmentRequest.id.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        requests = result.scalars().all()

        # Si alguna solicitud no tiene 'investor' cargado pero es aumento de capital, popularlo automáticamente
        for req in requests:
            if not req.investor:
                inv_id = None
                if req.investor_id:
                    inv_id = req.investor_id
                elif req.extra_data and isinstance(req.extra_data, dict) and req.extra_data.get("investor_id"):
                    inv_id = req.extra_data.get("investor_id")

                if inv_id:
                    inv_res = await db.execute(
                        select(Investor)
                        .options(selectinload(Investor.package), selectinload(Investor.period))
                        .where(Investor.id == inv_id)
                    )
                    req.investor = inv_res.scalars().first()
                elif req.extra_data and isinstance(req.extra_data, dict) and req.extra_data.get("es_aumento_capital"):
                    inv_res = await db.execute(
                        select(Investor)
                        .options(selectinload(Investor.package), selectinload(Investor.period))
                        .where(Investor.user_id == req.user_id)
                        .order_by(Investor.id.desc())
                    )
                    req.investor = inv_res.scalars().first()
        
        return {
            "data": requests,
            "total": total
        }

    @staticmethod
    def parse_datetime(date_str: str) -> datetime | None:
        if not date_str or date_str.strip() == "":
            return None
        # Intenta parsear con formato estándar de base de datos
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError:
            try:
                return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return None

    @staticmethod
    async def bulk_create_investment_requests(db: AsyncSession, csv_text: str) -> Dict[str, Any]:
        if csv_text.startswith('\ufeff'):
            csv_text = csv_text[1:]
            
        lines = csv_text.splitlines()
        first_line = lines[0] if lines else ""
        
        # Detect delimiter (Tab, Semicolon, or Comma)
        if first_line.count('\t') > first_line.count(';') and first_line.count('\t') > first_line.count(','):
            delim = '\t'
        elif first_line.count(';') >= first_line.count(','):
            delim = ';'
        else:
            delim = ','
        
        # Split line manually to normalize field names (handle BOM and spaces)
        raw_fieldnames = first_line.strip().split(delim)
        fieldnames = [f.replace('\ufeff', '').strip(' "') for f in raw_fieldnames]
        
        reader = csv.DictReader(io.StringIO(csv_text), delimiter=delim, fieldnames=fieldnames)
        
        # Skip the first row since we provided fieldnames manually
        next(reader, None)
        
        # Read all rows into memory to do bulk validation
        rows_data = list(reader)
        
        # Collect all user IDs to check existence
        user_ids_to_check = set()
        for row in rows_data:
            u_id = str(row.get("user_id", "")).strip(' "')
            r_by = str(row.get("reviewed_by", "")).strip(' "')
            if u_id.isdigit(): user_ids_to_check.add(int(u_id))
            if r_by.isdigit(): user_ids_to_check.add(int(r_by))
            
        valid_users = set()
        if user_ids_to_check:
            user_query = select(User.id).where(User.id.in_(user_ids_to_check))
            user_result = await db.execute(user_query)
            valid_users = set(user_result.scalars().all())
        
        success_count = 0
        errors = []
        
        for i, row in enumerate(rows_data, start=1):
            try:
                # Normalizamos las claves del diccionario por si alguna vino con espacios
                # y convertimos 'NULL' o '\N' a strings vacíos
                clean_row = {}
                for k, v in row.items():
                    if k is not None:
                        clean_k = k.strip(' "')
                        clean_v = str(v).strip() if v is not None else ""
                        if clean_v.upper() in ('NULL', '\\N', 'NONE'):
                            clean_v = ""
                        clean_row[clean_k] = clean_v
                row = clean_row
                
                # Si toda la fila está vacía, ignorarla (por si Excel deja filas extra al final)
                if not any(v for v in row.values()):
                    continue
                    
                user_id_str = row.get("user_id", "")
                paquete_id_str = row.get("paquete_inversion_id", "")
                monto_str = row.get("monto", "")
                
                if not user_id_str or not paquete_id_str or not monto_str:
                    errors.append(f"Fila {i}: 'user_id', 'paquete_inversion_id' y 'monto' son obligatorios.")
                    continue
                    
                try:
                    u_id = int(user_id_str)
                    if u_id not in valid_users:
                        errors.append(f"Fila {i}: El usuario con ID {u_id} no existe en el sistema. Fila omitida.")
                        continue
                except ValueError:
                    pass
                    
                status_str = row.get("status", "")
                if not status_str:
                    status_str = "pending"
                    
                req = InvestmentRequest(
                    user_id=int(user_id_str),
                    paquete_inversion_id=int(paquete_id_str),
                    monto=float(monto_str),
                    status=InvestmentRequestStatus(status_str)
                )
                
                req_id_str = row.get("id", "")
                if req_id_str:
                    req.id = int(req_id_str)
                
                # Campos opcionales numéricos
                inv_id = row.get("investor_id", "")
                if inv_id: req.investor_id = int(inv_id)
                
                prosp_id = row.get("prospecto_id", "")
                if prosp_id: req.prospecto_id = int(prosp_id)
                
                rev_by = row.get("reviewed_by", "")
                if rev_by: 
                    try:
                        r_id = int(rev_by)
                        if r_id in valid_users:
                            req.reviewed_by = r_id
                        else:
                            req.reviewed_by = None # Si el revisor no existe, lo dejamos nulo en vez de fallar toda la tabla
                    except ValueError:
                        pass
                
                # Campos opcionales de texto
                req.comprobante_path = row.get("comprobante_path", "") or None
                req.rejection_reason = row.get("rejection_reason", "") or None
                req.extra_data = row.get("extra_data", "") or None
                
                # Fechas
                if "reviewed_at" in row:
                    req.reviewed_at = InvestmentRequestService.parse_datetime(row.get("reviewed_at", ""))
                if "created_at" in row:
                    req.created_at = InvestmentRequestService.parse_datetime(row.get("created_at", ""))
                if "updated_at" in row:
                    req.updated_at = InvestmentRequestService.parse_datetime(row.get("updated_at", ""))
                if "deleted_at" in row:
                    req.deleted_at = InvestmentRequestService.parse_datetime(row.get("deleted_at", ""))
                    
                db.add(req)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Fila {i}: {str(e)}")
                
        try:
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error during bulk upload: {e}")
            errors.append("Error fatal al guardar los registros en la base de datos.")
            success_count = 0
            
        return {"success": success_count, "errors": errors}

    @staticmethod
    async def approve_request(db: AsyncSession, request_id: int, user_id: int, override_commercial_id: Optional[int] = None) -> InvestmentRequest:
        import random
        from src.models.investor import Investor
        from src.models.period import Period
        from src.models.acceleration import Acceleration
        from sqlalchemy.orm import selectinload
        from fastapi import HTTPException

        # 1. Fetch request
        result = await db.execute(
            select(InvestmentRequest)
            .where(InvestmentRequest.id == request_id)
        )
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        if req.status == InvestmentRequestStatus.approved:
            raise HTTPException(status_code=400, detail="La solicitud ya fue aprobada")

        # 2. Update request status
        req.status = InvestmentRequestStatus.approved
        req.reviewed_by = user_id
        req.reviewed_at = datetime.utcnow()

        # Extraer código de referido si viene en extra_data
        referred_code = None
        if req.extra_data and isinstance(req.extra_data, dict):
            referred_code = (
                req.extra_data.get("referred_by") or 
                req.extra_data.get("referral_code") or 
                req.extra_data.get("codigo_referido")
            )
            if referred_code:
                referred_code = str(referred_code).strip()

        # 3. Determinar si es un Aumento de Capital o Inversión Nueva
        is_upgrade = False
        if req.extra_data and isinstance(req.extra_data, dict):
            is_upgrade = bool(req.extra_data.get("es_aumento_capital") or req.extra_data.get("is_upgrade"))

        existing_investor = None
        if req.investor_id:
            inv_res = await db.execute(
                select(Investor)
                .options(
                    selectinload(Investor.package),
                    selectinload(Investor.period),
                    selectinload(Investor.withdrawals),
                    selectinload(Investor.accelerations)
                )
                .where(Investor.id == req.investor_id)
            )
            existing_investor = inv_res.scalars().first()

        if not existing_investor and (is_upgrade or req.investor_id):
            inv_res = await db.execute(
                select(Investor)
                .options(
                    selectinload(Investor.package),
                    selectinload(Investor.period),
                    selectinload(Investor.withdrawals),
                    selectinload(Investor.accelerations)
                )
                .where(Investor.user_id == req.user_id)
                .order_by(Investor.id.desc())
            )
            existing_investor = inv_res.scalars().first()

        period_id = None
        if req.extra_data and isinstance(req.extra_data, dict):
            period_id = req.extra_data.get("contract_period_id")

        if not period_id:
            period_res = await db.execute(select(Period).limit(1))
            period = period_res.scalars().first()
            if period:
                period_id = period.id
            else:
                raise HTTPException(status_code=400, detail="No se encontró un periodo de contrato y no hay periodo por defecto")

        if existing_investor and (is_upgrade or req.investor_id):
            # --- FLUJO DE AUMENTO DE CAPITAL ---
            from decimal import Decimal
            from datetime import timedelta
            from src.models.wallet import Wallet, WalletStatus, WalletTransaction
            from src.models.contract_history import ContractHistory
            from src.services.yield_calculator import calculate_investment_yield

            today = datetime.utcnow().date()
            start_d = existing_investor.start_date.date() if existing_investor.start_date else today

            # 1. Liquidar rendimientos generados hasta hoy
            yield_res = calculate_investment_yield(existing_investor, start_d, today)
            accrued_yield = float(yield_res.total_yield or 0.0)

            # 2. Transferir rendimientos a la Wallet del usuario
            if accrued_yield > 0:
                wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == req.user_id))
                wallet = wallet_res.scalars().first()
                if not wallet:
                    wallet = Wallet(user_id=req.user_id, balance=Decimal("0.00"), status=WalletStatus.ACTIVE)
                    db.add(wallet)
                    await db.flush()

                old_balance = float(wallet.balance or 0.0)
                new_balance = old_balance + accrued_yield
                wallet.balance = Decimal(str(new_balance))

                tx = WalletTransaction(
                    wallet_id=wallet.id,
                    amount=Decimal(str(accrued_yield)),
                    type="yield",
                    reference_type="investment_upgrade",
                    reference_id=existing_investor.id,
                    description=f"Rendimiento liquidado por aumento de capital (Contrato #{existing_investor.id})",
                    balance_after=Decimal(str(new_balance))
                )
                db.add(tx)

            # 3. Guardar snapshot en ContractHistory
            old_days = existing_investor.period.days if existing_investor.period else 365
            fecha_fin_prev = start_d + timedelta(days=int(old_days))
            old_pkg_val = float(existing_investor.package.value or 0) if existing_investor.package else float(req.monto)
            old_pct = f"{existing_investor.period.percentage}%" if existing_investor.period else "0%"

            history = ContractHistory(
                investor_id=existing_investor.id,
                paquete_inversion_id=existing_investor.package_id,
                contract_period_id=existing_investor.period_id,
                fecha_inicio=start_d,
                fecha_fin=fecha_fin_prev,
                dias_contrato=int(old_days),
                total_contrato=Decimal(str(old_pkg_val)),
                tasa_interes=old_pct,
                rendimiento_total_generado=Decimal(str(accrued_yield)),
                rendimiento_total_pagado=Decimal(str(accrued_yield)),
                motivo="Aumento de capital",
                observaciones=f"Actualización de contrato de paquete #{existing_investor.package_id} a paquete #{req.paquete_inversion_id}"
            )
            db.add(history)

            # 4. Actualizar contrato existente
            existing_investor.package_id = req.paquete_inversion_id
            if period_id:
                existing_investor.period_id = period_id
            existing_investor.start_date = datetime.utcnow()

            req.investor_id = existing_investor.id
            logger.info(f"Contrato #{existing_investor.id} actualizado por Aumento de Capital. Rendimientos liquidados a la wallet: {accrued_yield}")

        else:
            # --- FLUJO DE INVERSIÓN INICIAL (NUEVO CONTRATO) ---
            investors_codes = await db.execute(
                select(Investor.assigned_code)
                .where(Investor.assigned_code.like("IG%"))
            )
            codes = investors_codes.scalars().all()
            
            max_num = 0
            for c in codes:
                try:
                    num = int(c[2:].strip())
                    if num > max_num:
                        max_num = num
                except ValueError:
                    continue
                    
            next_num = max_num + 1
            code = f"IG{next_num}"
            
            investor = Investor(
                assigned_code=code,
                referred_by=referred_code,
                user_id=req.user_id,
                package_id=req.paquete_inversion_id,
                period_id=period_id,
                start_date=datetime.utcnow()
            )
            db.add(investor)
            await db.flush()
            
            req.investor_id = investor.id

            # Asegurar que el usuario tenga su Wallet creada
            from decimal import Decimal
            from src.models.wallet import Wallet, WalletStatus
            wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == req.user_id))
            wallet = wallet_res.scalars().first()
            if not wallet:
                wallet = Wallet(user_id=req.user_id, balance=Decimal("0.00"), currency="COP", status=WalletStatus.ACTIVE)
                db.add(wallet)
                await db.flush()

        # 4. Generar la Aceleración de Contrato por Referido (Bono del 5%)
        if referred_code:
            # Buscar el contrato del referente por su assigned_code
            referrer_res = await db.execute(
                select(Investor)
                .options(selectinload(Investor.package), selectinload(Investor.period))
                .where(Investor.assigned_code == referred_code)
            )
            referrer_investor = referrer_res.scalars().first()

            if referrer_investor and referrer_investor.package and referrer_investor.period:
                # Calcular bono del 5% del monto de la nueva inversión aprobada
                bonus_amount = float(req.monto) * 0.05

                # Calcular rendimiento diario del contrato objetivo del referente
                ref_package_val = float(referrer_investor.package.value or 0)
                ref_pct = float(referrer_investor.period.percentage or 0) / 100.0
                ref_months = float(referrer_investor.period.months or 0)
                ref_days = float(referrer_investor.period.days or 0)

                if ref_days > 0 and ref_package_val > 0:
                    rendimiento_mensual = ref_package_val * ref_pct
                    rendimiento_total = rendimiento_mensual * ref_months
                    daily_yield = rendimiento_total / ref_days

                    days_to_reduce = (bonus_amount / daily_yield) if daily_yield > 0 else 0.0
                else:
                    days_to_reduce = 0.0

                # Crear registro de aceleración (applied = True)
                acceleration = Acceleration(
                    investor_id=referrer_investor.id,
                    investment_request_id=req.id,
                    contract_period_id=referrer_investor.period_id,
                    original_days=referrer_investor.period.days,
                    acceleration_percentage=5.00,
                    days_to_reduce=days_to_reduce,
                    bonus_amount=bonus_amount,
                    applied=True
                )
                db.add(acceleration)
                logger.info(
                    f"Aceleración aplicada al contrato #{referrer_investor.id} ({referred_code}): "
                    f"monto_bono={bonus_amount}, días_reducidos={days_to_reduce}"
                )

        # 5. Adjudicar venta comercial si se seleccionó o determinó un Directivo de Inversiones
        c_id = override_commercial_id
        if c_id is None and req.extra_data and isinstance(req.extra_data, dict):
            c_id = (
                req.extra_data.get("commercial_id") or 
                req.extra_data.get("directivo_id") or 
                req.extra_data.get("asesor_id") or 
                req.extra_data.get("created_by_user_id")
            )
        
        investor_user_res = await db.execute(select(User).where(User.id == req.user_id))
        investor_user = investor_user_res.scalars().first()

        if c_id is None and investor_user:
            c_id = investor_user.commercial_id

        if c_id is None and referred_code:
            ref_user_res = await db.execute(
                select(User.id).where(
                    or_(
                        User.document_id == referred_code,
                        User.email == referred_code
                    )
                )
            )
            c_id = ref_user_res.scalar_one_or_none()

        if c_id:
            try:
                if investor_user and not investor_user.commercial_id:
                    investor_user.commercial_id = int(c_id)

                from src.services.commercial_sale_service import register_commercial_sale
                from src.schemas.commercial_sale import CommercialSaleCreate
                
                sale_type_str = "referido" if referred_code else ("reinversion" if (is_upgrade or existing_investor is not None) else "contrato_nuevo")
                doc_val = str((req.extra_data or {}).get("documento") or (investor_user and investor_user.document_id) or f"USER-{req.user_id}")
                name_val = str((req.extra_data or {}).get("nombre_completo") or (investor_user and investor_user.name) or "Cliente Inversionista")
                
                c_sale_create = CommercialSaleCreate(
                    client_document=doc_val,
                    client_name=name_val,
                    sale_type=sale_type_str,
                    amount=float(req.monto),
                    referrer_code=referred_code
                )
                await register_commercial_sale(
                    db,
                    commercial_id=int(c_id),
                    sale_data=c_sale_create
                )
                logger.info(f"Venta comercial de ${req.monto} adjudicada automáticamente al Directivo #{c_id}")
            except Exception as e:
                logger.error(f"Error al adjudicar venta comercial automática al Directivo #{c_id}: {e}")

        await db.commit()
        await db.refresh(req)
        return req


    @staticmethod
    async def reject_request(db: AsyncSession, request_id: int, user_id: int, reason: str) -> InvestmentRequest:
        from fastapi import HTTPException
        from decimal import Decimal
        from src.models.wallet import Wallet, WalletStatus, WalletTransaction

        result = await db.execute(
            select(InvestmentRequest)
            .where(InvestmentRequest.id == request_id)
        )
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        if req.status == InvestmentRequestStatus.rejected:
            raise HTTPException(status_code=400, detail="La solicitud ya fue rechazada")

        req.status = InvestmentRequestStatus.rejected
        req.rejection_reason = reason
        req.reviewed_by = user_id
        req.reviewed_at = datetime.utcnow()

        # Reembolso de dinero de billetera si la solicitud usó saldo de billetera
        if req.extra_data and isinstance(req.extra_data, dict):
            monto_billetera = float(req.extra_data.get("monto_billetera_usado") or 0.0)
            if monto_billetera > 0:
                wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == req.user_id))
                wallet = wallet_res.scalars().first()
                if not wallet:
                    wallet = Wallet(user_id=req.user_id, balance=Decimal("0.00"), currency="COP", status=WalletStatus.ACTIVE)
                    db.add(wallet)
                    await db.flush()

                old_balance = float(wallet.balance or 0.0)
                new_balance = old_balance + monto_billetera
                wallet.balance = Decimal(str(new_balance))

                tx = WalletTransaction(
                    wallet_id=wallet.id,
                    amount=Decimal(str(monto_billetera)),
                    type="refund",
                    reference_type="investment_request_rejection",
                    reference_id=req.id,
                    description=f"Reembolso de billetera por rechazo de solicitud #{req.id}",
                    balance_after=Decimal(str(new_balance))
                )
                db.add(tx)
                logger.info(f"Reembolso de ${monto_billetera} devuelto a la billetera del usuario #{req.user_id} por rechazo de solicitud #{req.id}")

        await db.commit()
        await db.refresh(req)
        return req
