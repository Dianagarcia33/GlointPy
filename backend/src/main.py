from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.future import select
from sqlalchemy.sql import func
from sqlalchemy.orm import selectinload

# Pre-cargar modelos para que SQLAlchemy registre las relaciones
# import src.models.user

from src.core.database import get_db


app = FastAPI(
    title="GlointPy API",
    description="API para el sistema de inversiones GlointPy",
    version="1.0.0"
)
from fastapi.staticfiles import StaticFiles
import os

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Rutas de la API
# Montar la carpeta uploads para servir archivos estáticos (imágenes y comprobantes)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Aquí se agregarán los nuevos endpoints migradas gradualmente
from src.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")


# Configuración de CORS (Permite que el frontend en Vite haga peticiones)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "¡Bienvenido a la API de Gloint V2 (Clean Architecture)!"}

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "message": "El backend está funcionando correctamente."}

@app.get("/api/v1/test-db")
async def test_db_connection(db: AsyncSession = Depends(get_db)):
    try:
        # Ejecuta una consulta para obtener el nombre de la base de datos actual
        result = await db.execute(text("SELECT DATABASE()"))
        db_name = result.scalar()
        return {
            "status": "ok", 
            "message": "¡Conexión asíncrona a MySQL exitosa!",
            "database": db_name
        }
    except Exception as e:
        return {"status": "error", "message": f"Error conectando a la base de datos: {str(e)}"}

