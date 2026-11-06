import os
import logging
from typing import List, Dict, Optional, Any
import httpx
from dotenv import dotenv_values
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
                pkg_res = await db.execute(select(Package).where(Package.is_active == True))
                packages = pkg_res.scalars().all()

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
    async def _simulate_response(cls, message: str, db: Optional[AsyncSession] = None) -> str:
        """
        Simulador inteligente de respaldo para pruebas locales o cuando no hay créditos de API disponibles.
        Genera respuestas naturales y precisas basadas en el markdown y la base de datos.
        """
        text = message.lower().strip()
        
        # Obtener paquetes y periodos de la base de datos si está disponible
        packages = []
        periods = []
        if db:
            try:
                pkg_res = await db.execute(select(Package).where(Package.is_active == True))
                packages = sorted(pkg_res.scalars().all(), key=lambda x: x.value)

                prd_res = await db.execute(select(Period).where(Period.is_active == True))
                periods = sorted(prd_res.scalars().all(), key=lambda x: x.months)
            except Exception as e:
                logger.warning(f"Error cargando config para simulador: {e}")

        # 1. Consulta sobre rentabilidad / rendimientos / plazos / tasas
        if any(w in text for w in ['rentabilidad', 'rendimiento', 'ganancia', 'interes', 'tasa', 'plazo', 'meses', 'tiempo', 'porcentaje']):
            if periods:
                items = "\n".join([f"• **{p.name or f'Plazo {p.months} Meses'}**: **{p.percentage}%** mensual estipulado por contrato." for p in periods])
                return (
                    f"En **GLOINT**, los rendimientos se pactan contractualmente de acuerdo con el plazo elegido:\n\n"
                    f"{items}\n\n"
                    f"Tus rendimientos se liquidan mes a mes y se abonan a tu billetera digital, desde donde puedes transferirlos a cualquier cuenta bancaria en Colombia."
                )
            return (
                "En **GLOINT** manejamos tasas de rentabilidad mensual fijas estipuladas directamente en el contrato de inversión según el plazo pactado (ej. 6 o 12 meses). "
                "Cada mes recibes el abono de tus rendimientos en tu billetera digital."
            )

        # 2. Consulta sobre paquetes / montos / cuánto invertir
        if any(w in text for w in ['paquete', 'monto', 'cuanto', 'cuánto', 'precio', 'valor', 'capital', 'invertir', 'minimo', 'mínimo']):
            if packages:
                items = "\n".join([
                    f"• **${p.value:,.0f} COP**" + (f" (incluye **{p.granted_shares}** acciones)" if p.granted_shares else "")
                    for p in packages
                ])
                return (
                    f"Operamos con **paquetes de inversión estructurados** para garantizar total transparencia y orden contable:\n\n"
                    f"{items}\n\n"
                    f"Además de la rentabilidad mensual pactada, varios de nuestros paquetes te otorgan **acciones patrimoniales**, convirtiéndote en copropietario del fondo."
                )
            return (
                "En **GLOINT** operamos con paquetes estructurados con montos predefinidos desde niveles accesibles hasta corporativos, con contratos y rentabilidades mensuales fijas."
            )

        # 3. Consulta sobre legalidad / contrato / seguridad / garantías / SARLAFT / NIT
        if any(w in text for w in ['contrato', 'legal', 'garantia', 'garantía', 'seguridad', 'sarlaft', 'nit', 'respaldo', 'empresa', 'demanda', 'estafa', 'confianza']):
            return (
                "**GLOINT INTERNATIONAL PARTNERS S.A.S.** (NIT: 901702380-5) es una sociedad colombiana legalmente constituida con sede principal en Bogotá (Edificio Telesentinel, Cra 7 #32-29):\n\n"
                "• **Contrato Legal Formal:** Cada inversión se formaliza a través de un contrato vinculante con términos, rentabilidades y plazos estipulados.\n"
                "• **Cumplimiento SARLAFT:** Filtro estricto contra lavado de activos para garantizar la legitimidad y protección de los fondos.\n"
                "• **Cuentas Bancarias Corporativas:** Todos los desembolsos y pagos se canalizan exclusivamente a través de cuentas institucionales en entidades como Bancolombia."
            )

        # 4. Consulta sobre métodos de pago / retiros / Bancolombia / Nequi / PSE
        if any(w in text for w in ['retiro', 'retirar', 'banco', 'bancolombia', 'nequi', 'pse', 'pagar', 'consignar', 'transferencia', 'abono']):
            return (
                "El manejo de tus fondos es ágil y seguro:\n\n"
                "• **Para Invertir:** Puedes fondear tu cuenta mediante **PSE**, **Bancolombia** y **Nequi** directamente hacia las cuentas oficiales de la compañía.\n"
                "• **Para Retiros:** Las rentabilidades mensuales y el capital al término de tu contrato se dispersan a tu cuenta bancaria personal (ahorros o corriente) certificada en Colombia."
            )

        # 5. Saludos y bienvenida
        if any(w in text for w in ['hola', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'que tal', 'quien eres']):
            return (
                "¡Hola! Te doy la bienvenida a **GLOINT**. 👋\n\n"
                "Soy tu asesor patrimonial con Inteligencia Artificial. Estoy a tu disposición para explicarte nuestro modelo de negocio, rentabilidades mensuales, opciones de inversión, paquetes y el respaldo legal de nuestros contratos.\n\n"
                "¿Qué información te gustaría consultar hoy?"
            )

        # Respuesta general guiada
        return (
            "En **GLOINT** estructuramos proyectos estratégicos de alta rentabilidad bajo contratos formales con rendimiento mensual fijo.\n\n"
            "Además, cuentas con el acompañamiento directo de un **Directivo de Inversión** que puede agendar una reunión privada contigo para revisar contratos y proyecciones a tu medida.\n\n"
            "¿Deseas conocer más sobre nuestras tasas de rentabilidad mensual o sobre el respaldo legal de nuestros contratos?"
        )

    @classmethod
    async def generate_response(
        cls, 
        message: str, 
        history: Optional[List[Dict[str, str]]] = None,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Consulta a la API de Google Gemini enviando el historial, la base de conocimiento y el mensaje actual.
        Si la clave es 'test', 'demo' o si la API de Google reporta problemas de cuota o saldo, 
        conmuta automáticamente al simulador inteligente para garantizar pruebas continuas.
        """
        # Cargar credenciales dinámicamente de .env para aplicar cambios al instante sin reiniciar
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        env_dict = dotenv_values(env_path) if os.path.exists(env_path) else {}
        api_key = (env_dict.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY or "").strip()
        model = (env_dict.get("GEMINI_MODEL") or os.getenv("GEMINI_MODEL") or settings.GEMINI_MODEL or "gemini-1.5-flash").strip()

        # Si el usuario configuró 'test' o 'demo' para probar sin gastar créditos
        if api_key.lower() in ["test", "demo", "simulacion", "mock", "sandbox"]:
            simulated_reply = await cls._simulate_response(message, db)
            return {
                "success": True,
                "reply": simulated_reply
            }

        # Si no hay key configurada
        if not api_key:
            simulated_reply = await cls._simulate_response(message, db)
            return {
                "success": True,
                "reply": simulated_reply,
                "is_simulated": True
            }

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
                    logger.warning(f"Respuesta no exitosa de Gemini API [{response.status_code}]: {error_data}")
                    
                    # Si falla por cuota, créditos o error de facturación en Google Cloud
                    if response.status_code in [429, 400, 403] or "quota" in error_data.lower() or "billing" in error_data.lower():
                        logger.info("Activando respuesta de simulador de respaldo por limitación de créditos en Gemini API.")
                        simulated_reply = await cls._simulate_response(current_msg, db)
                        return {
                            "success": True,
                            "reply": simulated_reply,
                            "fallback": True
                        }

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

                    # Si nada más funcionó, usar simulador para no dejar al usuario sin respuesta
                    simulated_reply = await cls._simulate_response(current_msg, db)
                    return {
                        "success": True,
                        "reply": simulated_reply
                    }

        except Exception as e:
            logger.error(f"Excepción al conectar con Gemini: {e}")
            simulated_reply = await cls._simulate_response(current_msg, db)
            return {
                "success": True,
                "reply": simulated_reply
            }
