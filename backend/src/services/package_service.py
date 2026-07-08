from typing import List, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
import csv
import io
from src.models.package import Package
from src.schemas.package import PackageCreate, PackageUpdate

class PackageService:
    @staticmethod
    async def get_all_packages(db: AsyncSession) -> Sequence[Package]:
        result = await db.execute(select(Package))
        return result.scalars().all()

    @staticmethod
    async def get_package_by_id(db: AsyncSession, package_id: int) -> Package:
        result = await db.execute(select(Package).where(Package.id == package_id))
        package = result.scalars().first()
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Package not found"
            )
        return package

    @staticmethod
    async def create_package(db: AsyncSession, package_in: PackageCreate) -> Package:
        package = Package(**package_in.model_dump())
        db.add(package)
        try:
            await db.commit()
            await db.refresh(package)
            return package
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error creating package"
            )

    @staticmethod
    async def bulk_create_packages(db: AsyncSession, csv_text: str) -> dict:
        f = io.StringIO(csv_text)
        # Try different delimiters
        sniffer = csv.Sniffer()
        try:
            dialect = sniffer.sniff(csv_text[:1024])
        except csv.Error:
            dialect = csv.excel
        
        f.seek(0)
        reader = csv.DictReader(f, dialect=dialect)
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="El archivo CSV está vacío o no tiene cabeceras válidas.")
        
        # Normalize headers
        headers = [h.strip().lower() for h in reader.fieldnames]
        reader.fieldnames = headers

        success_count = 0
        errors = []
        row_num = 1

        for row in reader:
            row_num += 1
            try:
                # Find columns using normalized headers
                valor_str = row.get('valor', '') or row.get('value', '') or row.get('valor del paquete', '')
                acciones_str = row.get('acciones', '') or row.get('acciones otorgadas', '') or row.get('granted_shares', '') or row.get('granted shares', '')
                
                if not valor_str:
                    errors.append(f"Fila {row_num}: Falta el valor del paquete.")
                    continue
                
                try:
                    valor = int(float(valor_str.strip()))
                except ValueError:
                    errors.append(f"Fila {row_num}: El valor '{valor_str}' no es un número válido.")
                    continue

                try:
                    acciones = int(float(acciones_str.strip())) if acciones_str else 0
                except ValueError:
                    errors.append(f"Fila {row_num}: Las acciones '{acciones_str}' no son un número válido.")
                    continue
                
                activo_str = str(row.get('activo', row.get('estado', 'true'))).strip().lower()
                is_active = activo_str in ['true', '1', 'si', 'sí', 'activo']

                # Avoid duplicates? We can check if a package with this exact value exists, but maybe it's allowed.
                # Let's just create it.
                package_data = {
                    "value": valor,
                    "granted_shares": acciones,
                    "is_active": is_active
                }
                
                package = Package(**package_data)
                db.add(package)
                success_count += 1
            except Exception as e:
                errors.append(f"Fila {row_num}: Error inesperado: {str(e)}")

        if success_count > 0:
            try:
                await db.commit()
            except Exception as e:
                await db.rollback()
                raise HTTPException(status_code=400, detail=f"Error al guardar en base de datos: {str(e)}")

        return {
            "success": success_count,
            "errors": errors
        }
