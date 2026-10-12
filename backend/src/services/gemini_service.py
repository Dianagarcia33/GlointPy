import os
import logging
from typing import List, Dict, Optional, Any
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.config import settings
from src.models.package import Package
from src.models.period import Period

logger = logging.getLogger(__name__)

class GeminiService:
    _cached_knowledge: Optional[str] = None
    _knowledge_mtime: float = 0.0

    @classmethod
    def _get_knowledge_content(cls) -> str:
        """
        Lee el archivo markdown de conocimiento. Si el archivo cambia en disco,
        se recarga automáticamente sin reiniciar el servidor.
        """
        knowledge_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            "knowledge", 
            "gloint_bot_knowledge.md"
        )
        try:
            if os.path.exists(knowledge_path):
                current_mtime = os.path.getmtime(knowledge_path)
                if cls._cached_knowledge is None or current_mtime > cls._knowledge_mtime:
                    with open(knowledge_path, "r", encoding="utf-8") as f:
                        cls._cached_knowledge = f.read()
                    cls._knowledge_mtime = current_mtime
                return cls._cached_knowledge or ""
        except Exception as e:
            logger.error(f"Error leyendo archivo de conocimiento del chatbot: {e}")
        
        return cls._cached_knowledge or "Eres el asistente y concierge de inversiones de GLOINT."

    @classmethod
    async def _build_system_instruction(cls, db: Optional[AsyncSession] = None) -> str:
        """
        Construye la instrucción de sistema combinando la base de conocimiento en Markdown
        con los paquetes y periodos activos en tiempo real desde la base de datos.
        """
        base_knowledge = cls._get_knowledge_content()
        db_context = ""

        if db:
            try:
                # Obtener paquetes activos
                pkg_res = await db.execute(select(Package).where(Package.is_active == True))
                packages = pkg_res.scalars().all()

                # Obtener periodos activos
                prd_res = await db.execute(select(Period).where(Period.is_active == True))
                periods = prd_res.scalars().all()

                if packages or periods:
                    db_context = "\n\n---\n## DATOS OFICIALES Y ACTIVOS EN PLATAFORMA (TIEMPO REAL):\n"
                    
                    if packages:
                        db_context += "### Paquetes de Inversión Disponibles:\n"
                        for p in sorted(packages, key=lambda x: x.value):
                            shares_text = f" | {p.granted_shares} acciones otorgadas" if p.granted_shares else ""
                            db_context += f"- Paquete: ${p.value:,.0f} COP{shares_text}\n"

                    if periods:
                        db_context += "\n### Plazos de Contrato y Rentabilidad Mensual Oficial:\n"
                        for prd in sorted(periods, key=lambda x: x.months):
                            db_context += f"- Plazo de {prd.months} Meses: {prd.percentage}% de rendimiento mensual garantizado en contrato.\n"
            except Exception as e:
                logger.warning(f"No se pudieron cargar datos dinámicos de paquetes/periodos para el bot: {e}")

        return f"{base_knowledge}{db_context}"

    @classmethod
    async def generate_response(
        cls, 
        message: str, 
        history: Optional[List[Dict[str, str]]] = None,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Consulta a la API de Google Gemini enviando el historial, la base de conocimiento y el mensaje actual.
        """
        api_key = (settings.GEMINI_API_KEY or "").strip()
        if not api_key:
            return {
                "success": False,
                "reply": (
                    "¡Hola! Soy el Concierge de Inversión de GLOINT. 👋\n\n"
                    "Actualmente estamos terminando de vincular la clave del motor de Inteligencia Artificial en el sistema. "
                    "Mientras tanto, puedes consultar nuestros paquetes oficiales en la parte superior o agendar una reunión privada "
                    "con uno de nuestros Directivos de Inversión."
                ),
                "needs_key": True
            }

        model = (settings.GEMINI_MODEL or "gemini-1.5-flash").strip()
        system_instruction = await cls._build_system_instruction(db)

        # Preparar historial en el formato de Gemini (alternando user y model)
        contents = []
        if history:
            for item in history:
                raw_role = item.get("role", "").lower()
                text = (item.get("content") or item.get("text") or "").strip()
                if not text:
                    continue

                gemini_role = "user" if raw_role in ["user", "human"] else "model"
                
                # Evitar roles consecutivos idénticos que Gemini rechaza
                if contents and contents[-1]["role"] == gemini_role:
                    contents[-1]["parts"][0]["text"] += f"\n{text}"
                else:
                    contents.append({
                        "role": gemini_role,
                        "parts": [{"text": text}]
                    })

        # Agregar el mensaje actual del usuario
        current_msg = message.strip()
        if not current_msg:
            return {"success": False, "reply": "¿En qué puedo asesorarte hoy sobre nuestras inversiones?"}

        if contents and contents[-1]["role"] == "user":
            contents[-1]["parts"][0]["text"] += f"\n{current_msg}"
        else:
            contents.append({
                "role": "user",
                "parts": [{"text": current_msg}]
            })

        # Estructura de la petición para Gemini REST API
        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 800
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            reply_text = parts[0]["text"].strip()
                            return {
                                "success": True,
                                "reply": reply_text
                            }
                    return {
                        "success": False,
                        "reply": "No pude generar una respuesta en este momento. ¿Te gustaría agendar una llamada con un directivo de inversión?"
                    }
                else:
                    error_data = response.text
                    logger.error(f"Error de Gemini API [{response.status_code}]: {error_data}")
                    
                    # Si el modelo específico da error 404, intentar fallback a gemini-1.5-flash
                    if response.status_code == 404 and model != "gemini-1.5-flash":
                        fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                        fallback_res = await client.post(fallback_url, json=payload, headers={"Content-Type": "application/json"})
                        if fallback_res.status_code == 200:
                            data = fallback_res.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                if parts and "text" in parts[0]:
                                    return {"success": True, "reply": parts[0]["text"].strip()}

                    return {
                        "success": False,
                        "reply": (
                            "En este momento tuvimos una pequeña demora conectando con el asistente de IA. "
                            "Puedes consultar los paquetes oficiales en el menú superior o solicitar una asesoría directa con nuestra Mesa Directiva."
                        )
                    }

        except Exception as e:
            logger.error(f"Excepción al conectar con Gemini: {e}")
            return {
                "success": False,
                "reply": (
                    "Lo siento, ocurrió una intermitencia temporal en la comunicación. "
                    "Por favor intenta de nuevo en unos segundos o déjanos tus datos para coordinar una reunión privada con un directivo."
                )
            }
