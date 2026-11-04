from src.services.contract_terms import is_contract_active
from src.core.timezone import get_colombia_today
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, asc, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from typing import List, Optional
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
import re

from src.models.investment_rank import InvestmentRank
from src.models.user import User
from src.models.investor import Investor
from src.models.package import Package
from src.models.period import Period

class InvestmentRankService:
    @staticmethod
    def generate_slug(name: str) -> str:
        s = name.lower().strip()
        s = re.sub(r'[^\w\s-]', '', s)
        return re.sub(r'[-\s]+', '-', s)

    # H-114: el orden jerárquico se DERIVA del capital mínimo (a mayor capital, mayor nivel).
    # Tolerancia de contigüidad: un tramo que termina en 49.999.999 y otro que empieza en 50.000.000
    # son contiguos (no hay hueco).
    GAP_TOLERANCE = 1.0

    @staticmethod
    def derive_order(ranks: list) -> dict:
        """Orden derivado (1..n) de los rangos ACTIVOS por capital mínimo (desempate por id). {id: orden}"""
        activos = sorted(
            (r for r in ranks if r.is_active),
            key=lambda r: (float(r.min_investment or 0), r.id if r.id is not None else 10**12),
        )
        return {r.id: i + 1 for i, r in enumerate(activos)}

    @staticmethod
    def detect_gaps(ranks: list) -> list:
        """Avisos (no bloquean) de huecos de capital entre tramos activos consecutivos."""
        activos = sorted((r for r in ranks if r.is_active), key=lambda r: float(r.min_investment or 0))
        avisos = []
        for a, b in zip(activos, activos[1:]):
            if a.max_investment is None:
                continue
            hueco = float(b.min_investment or 0) - float(a.max_investment)
            if hueco > InvestmentRankService.GAP_TOLERANCE:
                avisos.append(
                    f"Hueco de capital entre '{a.name}' (hasta ${float(a.max_investment):,.0f} COP) y "
                    f"'{b.name}' (desde ${float(b.min_investment):,.0f} COP): el capital intermedio no calificaría a ningún tramo."
                )
        return avisos

    @staticmethod
    async def _active_ranks(db: AsyncSession) -> list:
        res = await db.execute(select(InvestmentRank).where(InvestmentRank.is_active == True))
        return list(res.scalars().all())

    @staticmethod
    async def _resequence_active_orders(db: AsyncSession) -> None:
        """Alinea el `order` almacenado de los rangos activos con el derivado del capital (solo en altas/ediciones)."""
        await db.flush()
        activos = await InvestmentRankService._active_ranks(db)
        for rid, orden in InvestmentRankService.derive_order(activos).items():
            for r in activos:
                if r.id == rid and r.order != orden:
                    r.order = orden

    @staticmethod
    async def gap_warnings_for(db: AsyncSession, rank_name: str) -> list:
        return [w for w in InvestmentRankService.detect_gaps(await InvestmentRankService._active_ranks(db)) if f"'{rank_name}'" in w]

    @staticmethod
    async def get_all_ranks(db: AsyncSession, only_active: bool = False) -> List[dict]:
        query = select(InvestmentRank)
        if only_active:
            query = query.where(InvestmentRank.is_active == True)
        # H-114: se ordena por capital mínimo y se devuelve el orden derivado para los rangos activos
        query = query.order_by(asc(InvestmentRank.min_investment), asc(InvestmentRank.id))

        result = await db.execute(query)
        ranks = result.scalars().all()
        derived = InvestmentRankService.derive_order(ranks)

        # Count users per rank
        ranks_data = []
        for r in ranks:
            # Count users assigned to this rank or qualifying for it
            user_count_res = await db.execute(
                select(func.count(User.id)).where(User.rank_id == r.id)
            )
            users_count = user_count_res.scalar_one()

            ranks_data.append({
                "id": r.id,
                "name": r.name,
                "slug": r.slug,
                "min_investment": float(r.min_investment or 0),
                "max_investment": float(r.max_investment) if r.max_investment is not None else None,
                "bonus_percentage": float(r.bonus_percentage or 0),
                "color": r.color or "#EAB308",
                "icon": r.icon or "trophy",
                "priority_withdrawal": bool(r.priority_withdrawal),
                "benefits": r.benefits if isinstance(r.benefits, list) else [],
                "order": derived.get(r.id, r.order or 1),
                "is_active": bool(r.is_active),
                "users_count": users_count,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None
            })

        return ranks_data

    @staticmethod
    async def get_rank_by_id(db: AsyncSession, rank_id: int) -> InvestmentRank:
        result = await db.execute(select(InvestmentRank).where(InvestmentRank.id == rank_id))
        rank = result.scalars().first()
        if not rank:
            raise HTTPException(status_code=404, detail="Rango no encontrado")
        return rank

    @staticmethod
    async def _validate_rank_ranges_and_order(
        db: AsyncSession,
        min_inv: float,
        max_inv: Optional[float],
        is_active: bool,
        exclude_rank_id: Optional[int] = None
    ):
        if min_inv < 0:
            raise HTTPException(status_code=400, detail="La inversión mínima no puede ser negativa")
        if max_inv is not None and min_inv > max_inv:
            raise HTTPException(status_code=400, detail="El capital mínimo no puede ser superior al capital máximo del rango")

        if not is_active:
            return

        # Consultar los demás rangos activos
        query = select(InvestmentRank).where(InvestmentRank.is_active == True)
        if exclude_rank_id:
            query = query.where(InvestmentRank.id != exclude_rank_id)
        res = await db.execute(query)
        other_ranks = res.scalars().all()

        for other in other_ranks:
            o_min = float(other.min_investment or 0)
            o_max = float(other.max_investment) if other.max_investment is not None else None

            # 1. Validación de solapamiento de capital
            is_overlap = False
            if max_inv is None and o_max is None:
                is_overlap = True
            elif max_inv is None:
                is_overlap = min_inv <= o_max
            elif o_max is None:
                is_overlap = max_inv >= o_min
            else:
                is_overlap = max(min_inv, o_min) <= min(max_inv, o_max)

            if is_overlap:
                o_max_str = f"${o_max:,.0f} COP" if o_max is not None else "Sin límite"
                raise HTTPException(
                    status_code=400,
                    detail=f"El capital se solapa con el rango activo '{other.name}' (${o_min:,.0f} COP a {o_max_str}). Los tramos de capital deben ser disjuntos."
                )

    @staticmethod
    async def create_rank(db: AsyncSession, rank_in: dict) -> InvestmentRank:
        name = rank_in.get("name", "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre del rango es requerido")

        slug = rank_in.get("slug") or InvestmentRankService.generate_slug(name)

        # Check uniqueness
        existing = await db.execute(
            select(InvestmentRank).where((InvestmentRank.name == name) | (InvestmentRank.slug == slug))
        )
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Ya existe un rango con este nombre o slug")

        min_investment = float(rank_in.get("min_investment", 0))
        max_investment = float(rank_in["max_investment"]) if rank_in.get("max_investment") is not None else None
        is_active = bool(rank_in.get("is_active", True))

        await InvestmentRankService._validate_rank_ranges_and_order(
            db, min_investment, max_investment, is_active
        )

        # H-114: el orden NO se acepta manual; se deriva del capital mínimo (posición entre los rangos activos)
        activos = await InvestmentRankService._active_ranks(db)
        order = 1 + sum(1 for r in activos if float(r.min_investment or 0) < min_investment)

        rank = InvestmentRank(
            name=name,
            slug=slug,
            min_investment=min_investment,
            max_investment=max_investment,
            bonus_percentage=float(rank_in.get("bonus_percentage", 0)),
            color=rank_in.get("color", "#EAB308"),
            icon=rank_in.get("icon", "trophy"),
            priority_withdrawal=bool(rank_in.get("priority_withdrawal", False)),
            benefits=rank_in.get("benefits", []),
            order=order,
            is_active=is_active
        )

        db.add(rank)
        await InvestmentRankService._resequence_active_orders(db)
        await db.commit()
        await db.refresh(rank)
        return rank

    @staticmethod
    async def update_rank(db: AsyncSession, rank_id: int, rank_in: dict) -> InvestmentRank:
        rank = await InvestmentRankService.get_rank_by_id(db, rank_id)

        name = rank_in.get("name", rank.name).strip()
        slug = rank_in.get("slug") or InvestmentRankService.generate_slug(name)

        # Check duplicate name/slug if changed
        if name != rank.name or slug != rank.slug:
            existing = await db.execute(
                select(InvestmentRank).where(
                    (InvestmentRank.id != rank_id) &
                    ((InvestmentRank.name == name) | (InvestmentRank.slug == slug))
                )
            )
            if existing.scalars().first():
                raise HTTPException(status_code=400, detail="Ya existe otro rango con este nombre o slug")

        eff_min = float(rank_in["min_investment"]) if "min_investment" in rank_in else float(rank.min_investment or 0)
        eff_max = float(rank_in["max_investment"]) if ("max_investment" in rank_in and rank_in["max_investment"] is not None) else (float(rank.max_investment) if ("max_investment" not in rank_in and rank.max_investment is not None) else None)
        eff_is_active = bool(rank_in["is_active"]) if "is_active" in rank_in else bool(rank.is_active)

        await InvestmentRankService._validate_rank_ranges_and_order(
            db, eff_min, eff_max, eff_is_active, exclude_rank_id=rank_id
        )

        rank.name = name
        rank.slug = slug
        if "min_investment" in rank_in:
            rank.min_investment = eff_min
        if "max_investment" in rank_in:
            rank.max_investment = eff_max
        if "bonus_percentage" in rank_in:
            rank.bonus_percentage = float(rank_in["bonus_percentage"])
        if "color" in rank_in:
            rank.color = rank_in["color"]
        if "icon" in rank_in:
            rank.icon = rank_in["icon"]
        if "priority_withdrawal" in rank_in:
            rank.priority_withdrawal = bool(rank_in["priority_withdrawal"])
        if "benefits" in rank_in:
            rank.benefits = rank_in["benefits"]
        if "is_active" in rank_in:
            rank.is_active = eff_is_active
        # H-114: `order` enviado manualmente se ignora; se re-deriva del capital mínimo
        await InvestmentRankService._resequence_active_orders(db)

        rank.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(rank)
        return rank

    @staticmethod
    async def delete_rank(db: AsyncSession, rank_id: int) -> dict:
        rank = await InvestmentRankService.get_rank_by_id(db, rank_id)
        
        # Unlink users from this rank
        await db.execute(
            User.__table__.update().where(User.rank_id == rank_id).values(rank_id=None)
        )
        
        await db.delete(rank)
        await db.commit()
        return {"message": f"Rango '{rank.name}' eliminado exitosamente"}

    @staticmethod
    async def seed_defaults(db: AsyncSession) -> List[dict]:
        existing_res = await db.execute(select(InvestmentRank))
        if existing_res.scalars().first():
            return await InvestmentRankService.get_all_ranks(db)

        default_ranks = [
            {
                "name": "Bronce",
                "slug": "bronce",
                "min_investment": 0,
                "max_investment": 4999999,
                "bonus_percentage": 0.0,
                "color": "#CD7F32",
                "icon": "medal",
                "priority_withdrawal": False,
                "benefits": [
                    "Acceso completo a la plataforma y billetera digital",
                    "Abono automático de rendimientos mensuales",
                    "Soporte al cliente estándar vía tickets",
                    "Participación en programa de referidos básico"
                ],
                "order": 1,
                "is_active": True
            },
            {
                "name": "Plata",
                "slug": "plata",
                "min_investment": 5000000,
                "max_investment": 19999999,
                "bonus_percentage": 0.25,
                "color": "#94A3B8",
                "icon": "shield",
                "priority_withdrawal": False,
                "benefits": [
                    "Bono de rendimiento mensual adicional (+0.25%)",
                    "Atención preferencial por canales digitales",
                    "Comisión 0% en retiros programados",
                    "Insignia exclusiva de inversionista Plata"
                ],
                "order": 2,
                "is_active": True
            },
            {
                "name": "Oro",
                "slug": "oro",
                "min_investment": 20000000,
                "max_investment": 49999999,
                "bonus_percentage": 0.50,
                "color": "#EAB308",
                "icon": "trophy",
                "priority_withdrawal": True,
                "benefits": [
                    "Bono de rendimiento mensual adicional (+0.50%)",
                    "Prioridad de desembolso bancario ACH",
                    "Línea directa con soporte VIP y asesor comercial",
                    "Acceso anticipado a rondas de inversión y proyectos",
                    "Insignia exclusiva de inversionista Oro"
                ],
                "order": 3,
                "is_active": True
            },
            {
                "name": "Platino",
                "slug": "platino",
                "min_investment": 50000000,
                "max_investment": 99999999,
                "bonus_percentage": 0.75,
                "color": "#06B6D4",
                "icon": "gem",
                "priority_withdrawal": True,
                "benefits": [
                    "Bono de rendimiento mensual adicional (+0.75%)",
                    "Desembolsos bancarios prioritarios en menos de 24 horas",
                    "Asesor patrimonial y financiero personalizado",
                    "Invitaciones exclusivas a asambleas y eventos corporativos",
                    "Insignia exclusiva de inversionista Platino"
                ],
                "order": 4,
                "is_active": True
            },
            {
                "name": "Diamante Black",
                "slug": "diamante-black",
                "min_investment": 100000000,
                "max_investment": None,
                "bonus_percentage": 1.00,
                "color": "#8B5CF6",
                "icon": "crown",
                "priority_withdrawal": True,
                "benefits": [
                    "Bono de rendimiento mensual adicional (+1.00%)",
                    "Prioridad máxima en todas las operaciones y desembolsos",
                    "Asesoría fiscal, jurídica y patrimonial personalizada",
                    "Membresía vitalicia al Club Diamante de Gloint",
                    "Certificado físico de honor e insignia dorada Black"
                ],
                "order": 5,
                "is_active": True
            }
        ]

        for r_data in default_ranks:
            rank = InvestmentRank(**r_data)
            db.add(rank)

        await db.commit()
        return await InvestmentRankService.get_all_ranks(db)

    @staticmethod
    async def get_user_rank_details(db: AsyncSession, user_id: int) -> dict:
        # 1. Fetch user
        user_res = await db.execute(
            select(User).options(selectinload(User.rank)).where(User.id == user_id)
        )
        user = user_res.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # 2. Calculate active invested capital from user's active contracts
        inv_res = await db.execute(
            select(Investor)
            .options(selectinload(Investor.package), selectinload(Investor.period), selectinload(Investor.accelerations))
            .where(Investor.user_id == user_id)
        )
        investments = inv_res.scalars().all()

        total_active_capital = 0.0
        active_contracts_count = 0
        today_date = get_colombia_today()  # H-156

        for inv in investments:
            pkg_val = float(inv.package.value) if inv.package else 0.0
            months = int(inv.period.months) if inv.period else 12
            is_active = is_contract_active(inv, today_date)  # regla única (H-140, H-180)
            
            if is_active:
                total_active_capital += pkg_val
                active_contracts_count += 1

        # 3. Fetch all active ranks sorted
        all_ranks_data = await InvestmentRankService.get_all_ranks(db, only_active=True)
        if not all_ranks_data:
            # Auto seed if empty
            all_ranks_data = await InvestmentRankService.seed_defaults(db)

        # 4. Determine user rank:
        # If user has a manually assigned rank, use it; otherwise compute based on total_active_capital
        current_rank = None
        if user.rank_id and user.rank and user.rank.is_active:
            for r in all_ranks_data:
                if r["id"] == user.rank_id:
                    current_rank = r
                    break

        if not current_rank:
            # Find the highest rank whose min_investment <= total_active_capital
            qualifying = [r for r in all_ranks_data if float(r["min_investment"]) <= total_active_capital]
            if qualifying:
                current_rank = qualifying[-1]  # Highest order
            else:
                current_rank = all_ranks_data[0] if all_ranks_data else None

        # Auto-update user.rank_id in database if different
        if current_rank and user.rank_id != current_rank["id"]:
            user.rank_id = current_rank["id"]
            await db.commit()

        # 5. Find next rank
        next_rank = None
        if current_rank:
            for r in all_ranks_data:
                if r["order"] > current_rank["order"] and float(r["min_investment"]) > total_active_capital:
                    next_rank = r
                    break

        # 6. Calculate progress to next rank
        progress_pct = 100.0
        amount_needed = 0.0
        if next_rank:
            current_min = float(current_rank["min_investment"])
            next_min = float(next_rank["min_investment"])
            gap = max(1.0, next_min - current_min)
            progress = max(0.0, total_active_capital - current_min)
            progress_pct = min(100.0, (progress / gap) * 100.0)
            amount_needed = max(0.0, next_min - total_active_capital)

        return {
            "user_id": user.id,
            "user_name": user.name,
            "total_active_capital": total_active_capital,
            "active_contracts_count": active_contracts_count,
            "current_rank": current_rank,
            "next_rank": next_rank,
            "progress_percentage": round(progress_pct, 1),
            "amount_needed": amount_needed,
            "all_ranks": all_ranks_data
        }

    @staticmethod
    async def sync_all_users_ranks(db: AsyncSession) -> dict:
        """
        Sincroniza y asigna automáticamente el rango a todos los usuarios de la plataforma
        según el capital activo de sus contratos de inversión vigentes.
        """
        # 1. Asegurar que existan rangos
        ranks_query = select(InvestmentRank).where(InvestmentRank.is_active == True).order_by(
            asc(InvestmentRank.min_investment), asc(InvestmentRank.id)
        )
        ranks_res = await db.execute(ranks_query)
        ranks = ranks_res.scalars().all()
        
        if not ranks:
            await InvestmentRankService.seed_defaults(db)
            ranks_res = await db.execute(ranks_query)
            ranks = ranks_res.scalars().all()

        # 2. Cargar todos los usuarios con sus inversiones
        users_res = await db.execute(
            select(User).options(
                selectinload(User.investments).selectinload(Investor.package),
                selectinload(User.investments).selectinload(Investor.period),
                selectinload(User.investments).selectinload(Investor.accelerations)
            )
        )
        users = users_res.scalars().all()

        today_date = get_colombia_today()  # H-156
        synced_count = 0
        distribution = {}

        for u in users:
            # Calcular capital activo
            total_active_capital = 0.0
            if u.investments:
                for inv in u.investments:
                    pkg_val = float(inv.package.value) if inv.package else 0.0
                    months = int(inv.period.months) if inv.period else 12
                    is_active = is_contract_active(inv, today_date)  # regla única (H-140, H-180)
                    
                    if is_active:
                        total_active_capital += pkg_val

            # Encontrar el rango que le corresponde (mayor orden con min_investment <= capital)
            matching_rank = None
            for r in reversed(ranks):
                if float(r.min_investment) <= total_active_capital:
                    matching_rank = r
                    break
            
            if not matching_rank and ranks:
                matching_rank = ranks[0]

            if matching_rank:
                u.rank_id = matching_rank.id
                synced_count += 1
                distribution[matching_rank.name] = distribution.get(matching_rank.name, 0) + 1

        await db.commit()

        return {
            "status": "success",
            "message": f"Se sincronizaron y asignaron rangos automáticamente para {synced_count} usuarios.",
            "total_users_synced": synced_count,
            "distribution": distribution
        }
