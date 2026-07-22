import os
import httpx
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.models.sarlaft_check import SarlaftCheck

logger = logging.getLogger(__name__)

TUSDATOS_BASE_URL = os.getenv("TUSDATOS_BASE_URL", "http://docs.tusdatos.co")
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
        
        # Limpiar documento de puntos o comas
        clean_doc = str(doc).replace(".", "").replace(",", "").strip()
        
        payload: Dict[str, Any] = {
            "doc": clean_doc,
            "typedoc": typedoc
        }
        if fecha_expedicion:
            payload["fechaE"] = fecha_expedicion

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
        Consulta el estado de una tarea lanzada en Tusdatos.co (/api/results/{jobkey})
        """
        url = f"{TUSDATOS_BASE_URL}/api/results/{job_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, auth=cls._get_auth())
                if response.status_code == 200:
                    return response.json()
                else:
                    return {"estado": "error", "message": f"Error {response.status_code}"}
            except Exception as e:
                return {"estado": "error", "message": str(e)}

    @classmethod
    async def get_report_json(cls, report_id: str) -> Dict[str, Any]:
        """
        Obtiene el desglose de hallazgos en formato JSON (/api/report_json/{id})
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
        investment_request_id: Optional[int] = None
    ) -> SarlaftCheck:
        """
        Ejecuta el flujo completo SARLAFT:
        1. Crea el registro SarlaftCheck con status='processing'
        2. Lanza la consulta en Tusdatos.co
        3. Pollea hasta finalizar (máx 12 reintentos con delay de 5s)
        4. Si finaliza, descarga el JSON y PDF y actualiza el registro en la BD.
        """
        import json

        # Crear registro inicial
        check = SarlaftCheck(
            user_id=user_id,
            investment_request_id=investment_request_id,
            tusdatos_status="processing",
            tusdatos_last_check=datetime.utcnow()
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

        check.job_id = job_id
        check.tusdatos_job_id = job_id
        await db.commit()

        # En ambiente de pruebas o producción, iterar polling
        max_attempts = 12
        for _ in range(max_attempts):
            await asyncio.sleep(5)
            results = await cls.poll_job_results(job_id)
            estado = results.get("estado", "").lower()

            if estado == "finalizado":
                report_id = results.get("id") or job_id
                check.report_id = report_id
                check.tusdatos_report_id = report_id
                check.status = "completed"
                check.tusdatos_status = "finalizado"
                check.has_findings = bool(results.get("hallazgo", False))
                check.tusdatos_last_check = datetime.utcnow()
                check.tusdatos_msg = "Consulta finalizada exitosamente"

                # Clasificar nivel de riesgo SARLAFT
                dict_hallazgos = results.get("dict_hallazgos") or {}
                altos = dict_hallazgos.get("altos", [])
                medios = dict_hallazgos.get("medios", [])

                if altos and len(altos) > 0:
                    check.risk_level = "HIGH"
                elif medios and len(medios) > 0:
                    check.risk_level = "MEDIUM"
                elif check.has_findings:
                    check.risk_level = "LOW"
                else:
                    check.risk_level = "CLEAN"

                check.tusdatos_hallazgos = json.dumps(results.get("hallazgos") or dict_hallazgos)
                check.details = {
                    "validado": results.get("validado", True),
                    "nombre": results.get("nombre", ""),
                    "hallazgos_resumen": results.get("hallazgos", ""),
                    "dict_hallazgos": dict_hallazgos
                }

                # Descargar PDF
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
