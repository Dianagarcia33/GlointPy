from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.future import select
from sqlalchemy.sql import func
from sqlalchemy.orm import selectinload

# Pre-cargar modelos para que SQLAlchemy registre las relaciones
import src.models.user
import src.models.wallet
import src.models.security
import src.models.investment_request
import src.models.paquete_inversion

from src.core.database import get_db
from src.api.v1.endpoints import auth, wallets, investments, contract_periods, admin

app = FastAPI(title="Gloint V2 API")

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(wallets.router, prefix="/api/v1/wallets", tags=["wallets"])
app.include_router(investments.router, prefix="/api/v1/investments", tags=["investments"])
app.include_router(contract_periods.router, prefix="/api/v1/contract-periods", tags=["contract_periods"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])

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

@app.get("/api/v1/test-wallet")
async def test_wallet(db: AsyncSession = Depends(get_db)):
    from src.models.wallet import Wallet
    from src.models.user import User
    from sqlalchemy.future import select
    from sqlalchemy.sql import func
    from sqlalchemy.orm import selectinload
    try:
        # Test 1: User fetch
        res = await db.execute(select(User).options(selectinload(User.roles)).limit(1))
        u = res.scalars().first()
        if not u: return {"error": "No users found"}
        
        # Test 2: Wallet fetch
        res2 = await db.execute(select(func.sum(Wallet.balance)).where(Wallet.user_id == u.id))
        total = res2.scalar()
        
        return {"user_id": u.id, "balance": float(total) if total is not None else 0.0}
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
