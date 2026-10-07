import os
import httpx
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.models.sarlaft_check import SarlaftCheck
from src.core.database import async_session_maker

logger = logging.getLogger(__name__)

TUSDATOS_BASE_URL = os.getenv("TUSDATOS_BASE_URL", "https://docs.tusdatos.co").rstrip("/")
TUSDATOS_USERNAME = os.getenv("TUSDATOS_USERNAME", "pruebas")
TUSDATOS_PASSWORD = os.getenv("TUSDATOS_PASSWORD", "password")

class TusdatosService:

    @staticmethod
    def _get_auth():
        return (TUSDATOS_USERNAME, TUSDATOS_PASSWORD)

    @classmethod
    async def launch_check(cls, doc: str, typedoc: str = "CC", fecha_expedicion: Optional[str] = None) -> Dict[str, Any]:
        """
        Lanza una consulta de antecedentes en la API de Tusdatos.co
        """
        url = f"{TUSDATOS_BASE_URL}/api/launch"
        
        # Limpiar documento de puntos, comas o guiones
        raw_doc = str(doc).replace(".", "").replace(",", "").replace("-", "").strip()
        clean_doc = int(raw_doc) if raw_doc.isdigit() else raw_doc
        
        payload: Dict[str, Any] = {
            "doc": clean_doc,
            "typedoc": typedoc
        }
        if fecha_expedicion:
            clean_fecha = str(fecha_expedicion).strip()
            # Si viene en formato YYYY-MM-DD (HTML5 date input), convertir a DD/MM/YYYY
            if "-" in clean_fecha:
                parts = clean_fecha.split("-")
                if len(parts) == 3 and len(parts[0]) == 4:
                    clean_fecha = f"{parts[2]}/{parts[1]}/{parts[0]}"
            payload["fechaE"] = clean_fecha

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, auth=cls._get_auth())
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    logger.error(f"Error launching Tusdatos check: {response.status_code} - {response.text}")
                    return {"error": f"Error HTTP {response.status_code}", "raw": response.text}
            except Exception as e:
                logger.error(f"Exception calling Tusdatos launch: {str(e)}")
                return {"error": str(e)}

    @classmethod
    async def poll_job_results(cls, job_id: str) -> Dict[str, Any]:
        """
        Consulta el estado de una tarea lanzada en Tusdatos.co (/api/results/{jobkey}).
        Maneja HTTP 200 (finalizado) y HTTP 207 (procesando).
        """
        url = f"{TUSDATOS_BASE_URL}/api/results/{job_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, auth=cls._get_auth())
                if response.status_code in [200, 207]:
                    return response.json()
                else:
                    return {"estado": "error", "message": f"Error {response.status_code}"}
            except Exception as e:
                return {"estado": "error", "message": str(e)}

    @classmethod
    async def get_report_json(cls, report_id: str) -> Dict[str, Any]:
        """
        Obtiene el desglose de hallazgos en formato JSON (/api/report_json/{id})
        con la categorización completa (dict_hallazgos).
        """
        url = f"{TUSDATOS_BASE_URL}/api/report_json/{report_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, auth=cls._get_auth())
                if response.status_code == 200:
                    return response.json()
                return {}
            except Exception as e:
                logger.error(f"Error fetching report_json: {e}")
                return {}

    @classmethod
    async def download_report_pdf(cls, report_id: str) -> Optional[str]:
        """
        Descarga el PDF del reporte (/api/v2/report_pdf/{id}) y lo guarda en uploads/sarlaft_reports/
        """
        url = f"{TUSDATOS_BASE_URL}/api/v2/report_pdf/{report_id}"
        os.makedirs("uploads/sarlaft_reports", exist_ok=True)
        filename = f"sarlaft_{report_id}.pdf"
        file_path = os.path.join("uploads/sarlaft_reports", filename)

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(url, auth=cls._get_auth())
                if response.status_code == 200 and "application/pdf" in response.headers.get("content-type", ""):
                    with open(file_path, "wb") as f:
                        f.write(response.content)
                    return f"/uploads/sarlaft_reports/{filename}"
            except Exception as e:
                logger.error(f"Error downloading SARLAFT PDF: {e}")
        return None

    @classmethod
    async def execute_full_sarlaft_check(
        cls, 
        db: AsyncSession, 
        user_id: int, 
        document_number: str, 
        document_type: str = "CC", 
        fecha_expedicion: Optional[str] = None,
        investment_request_id: Optional[int] = None,
        initial_details: Optional[Dict[str, Any]] = None
    ) -> SarlaftCheck:
        """
        Ejecuta el flujo completo SARLAFT:
        1. Crea o reutiliza el registro SarlaftCheck con status='processing'
        2. Lanza la consulta en Tusdatos.co (/api/launch)
        3. Pollea hasta finalizar (máx 15 reintentos con delay de 4s)
        4. Clasifica hallazgos según https://docs.tusdatos.co/redoc#section/Categorizacion-de-Hallazgos
        5. Descarga el JSON detallado y el reporte en PDF oficial.
        """
        import json

        # Crear registro inicial
        check = SarlaftCheck(
            user_id=user_id,
            investment_request_id=investment_request_id,
            document_number=document_number,
            document_type=document_type,
            tusdatos_status="processing",
            tusdatos_last_check=datetime.utcnow(),
            details=initial_details or {}
        )
        db.add(check)
        await db.commit()
        await db.refresh(check)

        # 1. Lanzar consulta
        launch_res = await cls.launch_check(document_number, document_type, fecha_expedicion)
        job_id = launch_res.get("jobid")

        if not job_id:
            check.status = "failed"
            check.tusdatos_status = "failed"
            check.tusdatos_msg = launch_res.get("error", "No se recibió jobid de Tusdatos")
            await db.commit()
            return check

        check.job_id = str(job_id)
        check.tusdatos_job_id = str(job_id)
        await db.commit()

        # Polling de resultados (máx 15 reintentos, intervalo 4 seg)
        max_attempts = 15
        for _ in range(max_attempts):
            await asyncio.sleep(4)
            results = await cls.poll_job_results(job_id)
            estado = str(results.get("estado", "")).lower()

            if estado == "finalizado":
                report_id = str(results.get("id") or job_id)
                check.report_id = report_id
                check.tusdatos_report_id = report_id
                check.status = "completed"
                check.tusdatos_status = "finalizado"
                check.has_findings = bool(results.get("hallazgo", False))
                check.tusdatos_last_check = datetime.utcnow()
                check.tusdatos_msg = "Consulta SARLAFT finalizada exitosamente"

                # Obtener desglose de categorización de hallazgos
                report_json = await cls.get_report_json(report_id)
                dict_hallazgos = report_json.get("dict_hallazgos") or results.get("dict_hallazgos") or {}

                # Clasificación oficial de riesgo según docs.tusdatos.co/redoc#section/Categorizacion-de-Hallazgos
                hallazgo_principal = str(results.get("hallazgos", "")).strip().capitalize()
                altos = dict_hallazgos.get("altos", [])
                medios = dict_hallazgos.get("medios", [])
                bajos = dict_hallazgos.get("bajos", [])

                if hallazgo_principal == "Alto" or (isinstance(altos, list) and len(altos) > 0):
                    check.risk_level = "HIGH"
                elif hallazgo_principal == "Medio" or (isinstance(medios, list) and len(medios) > 0):
                    check.risk_level = "MEDIUM"
                elif hallazgo_principal in ["Bajo", "Info"] or check.has_findings or (isinstance(bajos, list) and len(bajos) > 0):
                    check.risk_level = "LOW"
                else:
                    check.risk_level = "CLEAN"

                check.tusdatos_hallazgos = json.dumps(dict_hallazgos if dict_hallazgos else {"hallazgo_principal": hallazgo_principal})
                
                updated_details = dict(check.details or {})
                updated_details.update({
                    "validado": results.get("validado", True),
                    "nombre": results.get("nombre", ""),
                    "hallazgo_principal": hallazgo_principal,
                    "dict_hallazgos": dict_hallazgos,
                    "sources_results": results.get("results", {})
                })
                check.details = updated_details

                # Descargar PDF oficial
                pdf_path = await cls.download_report_pdf(report_id)
                if pdf_path:
                    check.pdf_path = pdf_path
                    check.tusdatos_evidencia_paths = [pdf_path]

                await db.commit()
                return check

            elif "error" in results or estado == "error":
                check.status = "failed"
                check.tusdatos_status = "error"
                check.tusdatos_msg = str(results.get("error") or results.get("message"))
                await db.commit()
                return check

        # Si agotó intentos y sigue en proceso
        check.status = "processing"
        check.tusdatos_status = "procesando"
        await db.commit()
        return check

    @classmethod
    async def execute_full_sarlaft_check_background(
        cls,
        user_id: int,
        document_number: str,
        document_type: str = "CC",
        fecha_expedicion: Optional[str] = None,
        initial_details: Optional[Dict[str, Any]] = None
    ):
        """
        Ejecuta la validación SARLAFT en segundo plano utilizando su propia sesión asíncrona.
        No bloquea el proceso de respuesta de la API.
        """
        try:
            async with async_session_maker() as db:
                await cls.execute_full_sarlaft_check(
                    db=db,
                    user_id=user_id,
                    document_number=document_number,
                    document_type=document_type,
                    fecha_expedicion=fecha_expedicion,
                    initial_details=initial_details
                )
        except Exception as e:
            logger.error(f"Error en validación SARLAFT en background para usuario {user_id}: {e}")

