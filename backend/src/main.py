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

@app.on_event("startup")
async def on_startup():
    try:
        import src.models
        from src.core.database import engine, Base, async_session_maker
        from src.run_seed import seed_permissions_db
        from sqlalchemy import text

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

            # Migración ligera de columnas en commercial_sales si la tabla ya existía previamente
            try:
                await conn.execute(text("ALTER TABLE commercial_sales ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pendiente'"))
            except Exception:
                pass

            try:
                await conn.execute(text("ALTER TABLE commercial_sales ADD COLUMN settlement_id BIGINT NULL"))
            except Exception:
                pass

            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN commercial_id BIGINT NULL"))
            except Exception:
                pass

            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN rank_id INT NULL"))
            except Exception:
                pass

            try:
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS investment_ranks (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL UNIQUE,
                        slug VARCHAR(100) NOT NULL UNIQUE,
                        min_investment DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                        max_investment DECIMAL(15,2) NULL,
                        bonus_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                        color VARCHAR(50) NOT NULL DEFAULT '#EAB308',
                        icon VARCHAR(50) NOT NULL DEFAULT 'trophy',
                        priority_withdrawal BOOLEAN NOT NULL DEFAULT FALSE,
                        benefits JSON NULL,
                        `order` INT NOT NULL DEFAULT 1,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_ranks_slug (slug),
                        INDEX idx_ranks_order (`order`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
            except Exception as e:
                print(f"Error creating investment_ranks table: {e}")

            try:
                await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN file_url VARCHAR(500) NULL"))
            except Exception:
                pass

            try:
                await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN file_name VARCHAR(255) NULL"))
            except Exception:
                pass

            try:
                await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN file_type VARCHAR(50) NULL"))
            except Exception:
                pass

            try:
                await conn.execute(text("ALTER TABLE templates ADD COLUMN background_image LONGTEXT NULL"))
            except Exception:
                pass

            # Crear tabla investor_documents si no existe
            try:
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS investor_documents (
                        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        investor_id BIGINT UNSIGNED NOT NULL,
                        user_id BIGINT UNSIGNED NOT NULL,
                        template_id BIGINT UNSIGNED NULL,
                        title VARCHAR(255) NOT NULL,
                        document_type VARCHAR(100) NULL DEFAULT 'contract',
                        html_content LONGTEXT NOT NULL,
                        background_image LONGTEXT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_inv_docs_investor (investor_id),
                        INDEX idx_inv_docs_user (user_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
            except Exception as e:
                print(f"Error creating investor_documents table: {e}")

            # Ajuste de consistencia para paquetes con 0 acciones
            try:
                await conn.execute(text("UPDATE packages SET granted_shares = 1 WHERE (value = 50000 OR value = 50000.00) AND (granted_shares = 0 OR granted_shares IS NULL)"))
            except Exception:
                pass

            # Crear tablas external_apps y external_payment_orders si no existen
            try:
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS external_apps (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT NULL,
                        client_id VARCHAR(100) NOT NULL UNIQUE,
                        api_key_hash VARCHAR(255) NOT NULL,
                        webhook_url VARCHAR(500) NULL,
                        webhook_secret VARCHAR(255) NULL,
                        redirect_urls TEXT NULL,
                        is_active TINYINT(1) DEFAULT 1 NOT NULL,
                        created_by BIGINT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                        INDEX idx_ext_apps_client (client_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS external_payment_orders (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        payment_token VARCHAR(120) NOT NULL UNIQUE,
                        app_id BIGINT NOT NULL,
                        user_id BIGINT NULL,
                        order_reference VARCHAR(255) NOT NULL,
                        amount DECIMAL(15,2) NOT NULL,
                        currency VARCHAR(3) DEFAULT 'COP' NOT NULL,
                        description VARCHAR(500) NULL,
                        status ENUM('pending','completed','cancelled','expired','failed') DEFAULT 'pending' NOT NULL,
                        redirect_url VARCHAR(500) NULL,
                        metadata_json TEXT NULL,
                        webhook_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
                        webhook_attempts BIGINT DEFAULT 0 NOT NULL,
                        webhook_response TEXT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        expires_at DATETIME NULL,
                        completed_at DATETIME NULL,
                        INDEX idx_ext_orders_token (payment_token),
                        INDEX idx_ext_orders_app (app_id),
                        INDEX idx_ext_orders_user (user_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
            except Exception as e:
                print(f"Error creating external_apps tables: {e}")

            # Limpieza de valores nulos / escapados en referred_by
            try:
                await conn.execute(text("UPDATE investors SET referred_by = NULL WHERE referred_by = '\\\\N' OR referred_by = '\\N' OR referred_by = 'NULL' OR referred_by = ''"))
            except Exception:
                pass

        async with async_session_maker() as db:
            await seed_permissions_db(db)
            try:
                from src.services.commercial_sale_service import purge_ghost_bonuses
                await purge_ghost_bonuses(db)
            except Exception as pe:
                print(f"Error purging ghost bonuses on startup: {pe}")

            try:
                from src.services.investment_rank_service import InvestmentRankService
                await InvestmentRankService.sync_all_users_ranks(db)
                print("🏆 Rangos de inversión sincronizados y asignados automáticamente.")
            except Exception as re:
                print(f"Error syncing user ranks on startup: {re}")
    except Exception as e:
        print(f"Error on startup database initialization/seeding: {e}")
from fastapi.staticfiles import StaticFiles
import os

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Rutas seguras y autenticadas para uploads
from src.api.v1.endpoints import uploads
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])

# Rutas de la API
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
    return {"message": "¡Bienvenido a la API de Gloint (Clean Architecture)!"}

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

