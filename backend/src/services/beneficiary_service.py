from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from fastapi import HTTPException, status
from src.models.beneficiary import Beneficiary
from src.schemas.beneficiary import BeneficiaryCreate, BeneficiaryUpdate, BeneficiaryDistributionItem

def _centavos(valor) -> int:
    """Porcentaje -> centésimas de punto (evita errores de coma flotante al sumar)."""
    return int(round(float(valor or 0) * 100))


def validar_distribucion_completa(porcentajes) -> None:
    """H-91: la distribución de beneficiarios debe sumar exactamente 100 %."""
    total = sum(_centavos(p) for p in porcentajes)
    if total != 10000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"La distribución de beneficiarios debe sumar exactamente 100 %. "
                f"Con este cambio sumaría {total / 100:.2f} %"
                + (f" (faltan {(10000 - total) / 100:.2f} %)." if total < 10000 else f" (sobran {(total - 10000) / 100:.2f} %).")
                + " Ajusta los porcentajes para completar el 100 %."
            ),
        )


class BeneficiaryService:
    @staticmethod
    async def get_all_by_user(db: AsyncSession, user_id: int) -> Sequence[Beneficiary]:
        result = await db.execute(
            select(Beneficiary).where(Beneficiary.user_id == user_id).order_by(Beneficiary.id.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, beneficiary_id: int) -> Beneficiary:
        result = await db.execute(
            select(Beneficiary).where(Beneficiary.id == beneficiary_id)
        )
        beneficiary = result.scalars().first()
        if not beneficiary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Beneficiario no encontrado"
            )
        return beneficiary

    @staticmethod
    async def create(db: AsyncSession, user_id: int, data: BeneficiaryCreate) -> Beneficiary:
        # H-91: el resultado final debe sumar exactamente 100 %
        existing = await BeneficiaryService.get_all_by_user(db, user_id)
        validar_distribucion_completa([b.percentage for b in existing] + [data.percentage])

        payload = data.model_dump()
        payload['user_id'] = user_id

        # Renombrar 'relationship' si viene en data a la propiedad en modelo ORM
        if 'relationship' in payload:
            rel_val = payload.pop('relationship')
            payload['relationship_type'] = rel_val

        db_beneficiary = Beneficiary(**payload)
        db.add(db_beneficiary)
        await db.commit()
        await db.refresh(db_beneficiary)
        return db_beneficiary

    @staticmethod
    async def update(db: AsyncSession, beneficiary_id: int, user_id: int, data: BeneficiaryUpdate) -> Beneficiary:
        db_beneficiary = await BeneficiaryService.get_by_id(db, beneficiary_id)
        
        if db_beneficiary.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar este beneficiario"
            )

        update_data = data.model_dump(exclude_unset=True)

        if 'percentage' in update_data:
            existing = await BeneficiaryService.get_all_by_user(db, user_id)
            # H-91: el resultado final debe sumar exactamente 100 %
            validar_distribucion_completa(
                [b.percentage for b in existing if b.id != beneficiary_id] + [update_data['percentage']]
            )

        if 'relationship' in update_data:
            update_data['relationship_type'] = update_data.pop('relationship')

        for field, val in update_data.items():
            setattr(db_beneficiary, field, val)

        await db.commit()
        await db.refresh(db_beneficiary)
        return db_beneficiary

    @staticmethod
    async def delete(db: AsyncSession, beneficiary_id: int, user_id: int) -> None:
        db_beneficiary = await BeneficiaryService.get_by_id(db, beneficiary_id)
        if db_beneficiary.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar este beneficiario"
            )
        await db.delete(db_beneficiary)
        await db.commit()

    @staticmethod
    async def save_distribution(db: AsyncSession, user_id: int, items: Sequence[BeneficiaryDistributionItem]) -> Sequence[Beneficiary]:
        """H-91: aplica de forma atómica varios cambios (altas/ediciones) y exige que el total quede en 100 %.

        Cada ítem con ``id`` edita ese beneficiario (propio); sin ``id`` crea uno nuevo. Los beneficiarios que no
        vienen en la lista conservan su porcentaje. Si la suma final no es 100 % no se guarda nada (422).
        """
        existing = {b.id: b for b in await BeneficiaryService.get_all_by_user(db, user_id)}
        nuevos = {bid: float(b.percentage or 0) for bid, b in existing.items()}
        a_crear = []
        for item in items:
            datos = item.model_dump(exclude_unset=True, exclude={'id'})
            if item.id is not None:
                if item.id not in existing:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Beneficiario no encontrado")
                if 'percentage' in datos:
                    nuevos[item.id] = datos['percentage']
            else:
                if not (item.name or '').strip() or item.percentage is None:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                        detail="Un beneficiario nuevo requiere nombre y porcentaje")
                a_crear.append(item)
        validar_distribucion_completa(list(nuevos.values()) + [i.percentage for i in a_crear])

        for item in items:
            if item.id is None:
                continue
            datos = item.model_dump(exclude_unset=True, exclude={'id'})
            if 'relationship' in datos:
                datos['relationship_type'] = datos.pop('relationship')
            for field, val in datos.items():
                setattr(existing[item.id], field, val)
        for item in a_crear:
            payload = item.model_dump(exclude_unset=True, exclude={'id'})
            if 'relationship' in payload:
                payload['relationship_type'] = payload.pop('relationship')
            payload['user_id'] = user_id
            db.add(Beneficiary(**payload))
        await db.commit()
        return await BeneficiaryService.get_all_by_user(db, user_id)
