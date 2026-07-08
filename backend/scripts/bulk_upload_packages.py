import asyncio
import os
import sys
import csv
import logging
from dotenv import load_dotenv
from sqlalchemy.future import select

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
load_dotenv(".env")

from src.core.database import async_session_maker
from src.models.package import Package

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def bulk_upload_packages(csv_file_path: str):
    packages_to_insert = []
    
    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                try:
                    value = int(row['value'].strip())
                    packages_to_insert.append(Package(value=value))
                except (ValueError, KeyError) as e:
                    logger.error(f"Error parseando fila {row}: {e}")
                    continue
                    
    except FileNotFoundError:
        logger.error(f"El archivo {csv_file_path} no fue encontrado.")
        return
        
    if not packages_to_insert:
        logger.info("No se encontraron paquetes válidos para insertar.")
        return

    logger.info(f"Insertando {len(packages_to_insert)} paquetes...")
    
    async with async_session_maker() as db:
        db.add_all(packages_to_insert)
        await db.commit()
        
    logger.info("¡Carga masiva de paquetes completada con éxito!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python bulk_upload_packages.py <ruta_al_archivo.csv>")
        sys.exit(1)
        
    csv_path = sys.argv[1]
    asyncio.run(bulk_upload_packages(csv_path))
