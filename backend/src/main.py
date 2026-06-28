from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from src.core.database import get_db

from src.api.v1.endpoints import auth

app = FastAPI(title="Gloint V2 API")

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])

# Configuración de CORS (Permite que el frontend en Vite haga peticiones)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "https://pruebas.gloint.com.co",
        "https://gloint.com.co"
    ],
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
