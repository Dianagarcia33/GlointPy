import asyncio
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
load_dotenv(".env")

from src.core.database import async_session_maker, Base, engine
from src.models.data_bank import DataBank
from sqlalchemy.future import select

BANKS_DATA = [
    {"id": 1, "banck": "BANCO DE BOGOTÁ", "code_banck": "1001"},
    {"id": 2, "banck": "BANCO POPULAR", "code_banck": "1002"},
    {"id": 3, "banck": "ITAU", "code_banck": "1006"},
    {"id": 4, "banck": "BANCOLOMBIA", "code_banck": "1007"},
    {"id": 5, "banck": "CITIBANK", "code_banck": "1009"},
    {"id": 6, "banck": "BANCO GNB SUDAMERIS", "code_banck": "1012"},
    {"id": 7, "banck": "BBVA COLOMBIA", "code_banck": "1013"},
    {"id": 8, "banck": "DAVIBANK (Anteriormente: Scotiabank Colpatria)", "code_banck": "1019"},
    {"id": 9, "banck": "BANCO DE OCCIDENTE", "code_banck": "1023"},
    {"id": 10, "banck": "BANCOLDEX S.A", "code_banck": "1031"},
    {"id": 11, "banck": "BANCO CAJA SOCIAL BCSC SA", "code_banck": "1032"},
    {"id": 12, "banck": "BANCO AGRARIO", "code_banck": "1040"},
    {"id": 13, "banck": "BANCO MUNDO MUJER", "code_banck": "1047"},
    {"id": 14, "banck": "BANCO DAVIVIENDA SA", "code_banck": "1051"},
    {"id": 15, "banck": "BANCO AV VILLAS", "code_banck": "1052"},
    {"id": 16, "banck": "BANCO W SA", "code_banck": "1053"},
    {"id": 17, "banck": "BANCO PROCREDIT COLOMBIA", "code_banck": "1058"},
    {"id": 18, "banck": "BANCAMIA S.A.", "code_banck": "1059"},
    {"id": 19, "banck": "BANCO PICHINCHA", "code_banck": "1060"},
    {"id": 20, "banck": "BANCOOMEVA", "code_banck": "1061"},
    {"id": 21, "banck": "BANCO FALABELLA S.A.", "code_banck": "1062"},
    {"id": 22, "banck": "BANCO FINANDINA S.A.", "code_banck": "1063"},
    {"id": 23, "banck": "BANCO SANTANDER DE NEGOCIOS COLOMBIA S.A", "code_banck": "1065"},
    {"id": 24, "banck": "BANCO COOPERATIVO COOPCENTRAL", "code_banck": "1066"},
    {"id": 25, "banck": "BANCO COMPARTIR S.A", "code_banck": "1067"},
    {"id": 26, "banck": "BANCO SERFINANZA S.A", "code_banck": "1069"},
    {"id": 27, "banck": "LULO BANK S.A", "code_banck": "1070"},
    {"id": 28, "banck": "BANCO J.P. MORGAN COLOMBIA S.A.", "code_banck": "1071"},
    {"id": 29, "banck": "FINANCIERA JURISCOOP S.A. COMPAÑÍA DE FINANCIAMIENTO", "code_banck": "1121"},
    {"id": 30, "banck": "COOPERATIVA FINANCIERA DE ANTIOQUIA", "code_banck": "1283"},
    {"id": 31, "banck": "JFK COOPERATIVA FINANCIERA", "code_banck": "1286"},
    {"id": 32, "banck": "COOTRAFA COOPERATIVA FINANCIERA", "code_banck": "1289"},
    {"id": 33, "banck": "CONFIAR COOPERATIVA FINANCIERA", "code_banck": "1292"},
    {"id": 34, "banck": "GIROS Y FINANZAS CF", "code_banck": "1303"},
    {"id": 35, "banck": "COLTEFINANCIERA S.A", "code_banck": "1370"},
    {"id": 36, "banck": "NEQUI", "code_banck": "1507"},
    {"id": 37, "banck": "DAVIPLATA", "code_banck": "1551"},
    {"id": 38, "banck": "BANCO CREDIFINANCIERA S.A.", "code_banck": "1558"},
    {"id": 39, "banck": "PIBANK", "code_banck": "1560"},
    {"id": 40, "banck": "IRIS", "code_banck": "1637"},
    {"id": 41, "banck": "MOVII", "code_banck": "1801"},
    {"id": 42, "banck": "DING TECNIPAGOS SA", "code_banck": "1802"},
    {"id": 43, "banck": "POWWI", "code_banck": "1803"},
    {"id": 44, "banck": "UALA", "code_banck": "1804"},
    {"id": 45, "banck": "BANCO BTG PACTUAL", "code_banck": "1805"},
    {"id": 46, "banck": "BOLD CF", "code_banck": "1808"},
    {"id": 47, "banck": "NU BANK", "code_banck": "1809"},
    {"id": 48, "banck": "RAPPIPAY", "code_banck": "1811"},
    {"id": 49, "banck": "COINK", "code_banck": "1812"},
    {"id": 50, "banck": "GLOBAL 66", "code_banck": "1814"},
    {"id": 51, "banck": "BRE-B", "code_banck": "9999"}
]

async def seed_banks():
    print("🚀 Creando tabla data_bancks si no existe...")
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS data_bancks (
                id BIGINT NOT NULL AUTO_INCREMENT,
                banck VARCHAR(255) NOT NULL,
                code_banck VARCHAR(50) NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """))

        print("🔍 Sincronizando catálogo de bancos oficiales (data_bancks)...")
        for item in BANKS_DATA:
            await conn.execute(text("""
                INSERT INTO data_bancks (id, banck, code_banck, created_at, updated_at)
                VALUES (:id, :banck, :code_banck, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    banck = VALUES(banck),
                    updated_at = NOW();
            """), item)

        print("✅ Catálogo de bancos sincronizado exitosamente (51 entidades).")

if __name__ == "__main__":
    asyncio.run(seed_banks())
