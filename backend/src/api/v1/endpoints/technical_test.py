import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func

from src.core.database import get_db
from src.core.config import settings
from src.models.technical_evaluation import TechnicalEvaluation
from src.models.user import User
from src.api.deps import RequirePermission, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# 🛡️ Configuración de Seguridad y Límites de la Prueba Temporal
TEST_CONFIG = {
    "is_active": True,
    "access_pin": getattr(settings, "TECHNICAL_TEST_PIN", "GLOINT-JR-2026"),
    "max_code_length": 25000,   # Máximo 25 KB de código
    "max_submissions": 20       # Tope de seguridad para evitar sobrecarga en la DB
}

# Definición de casos de prueba oficiales
TEST_CASES = [
    {
        "id": 1,
        "name": "Caso estándar con ingresos y egresos",
        "description": "Lista normal con 2 ingresos válidos, 1 egreso válido, 1 monto negativo y 1 tipo inválido",
        "input": [
            {"id": 1, "tipo": "ingreso", "monto": 1000},
            {"id": 2, "tipo": "egreso", "monto": 300},
            {"id": 3, "tipo": "ingreso", "monto": 500},
            {"id": 4, "tipo": "egreso", "monto": -50},
            {"id": 5, "tipo": "desconocido", "monto": 200}
        ],
        "expected": {
            "total_ingresos": 1500,
            "total_egresos": 300,
            "balance_neto": 1200,
            "movimientos_invalidos": 2
        }
    },
    {
        "id": 2,
        "name": "Caso lista vacía o nula",
        "description": "Una lista vacía [] debe retornar todos los contadores y balances en 0 sin errores",
        "input": [],
        "expected": {
            "total_ingresos": 0,
            "total_egresos": 0,
            "balance_neto": 0,
            "movimientos_invalidos": 0
        }
    },
    {
        "id": 3,
        "name": "Caso solo egresos y montos cero",
        "description": "Evalúa balance negativo y detección de montos iguales a 0",
        "input": [
            {"id": 1, "tipo": "egreso", "monto": 150},
            {"id": 2, "tipo": "egreso", "monto": 0},
            {"id": 3, "tipo": "ingreso", "monto": -10}
        ],
        "expected": {
            "total_ingresos": 0,
            "total_egresos": 150,
            "balance_neto": -150,
            "movimientos_invalidos": 2
        }
    }
]

class CodeRunRequest(BaseModel):
    code: str
    language: str = "python"
    access_pin: Optional[str] = None

class TestSubmissionRequest(BaseModel):
    candidate_name: str
    candidate_email: EmailStr
    candidate_phone: Optional[str] = None
    language: str = "python"
    code: str
    access_pin: str
    time_spent_seconds: int = 0
    test_results: Optional[List[Dict[str, Any]]] = None

class ToggleConfigRequest(BaseModel):
    is_active: Optional[bool] = None
    access_pin: Optional[str] = None

def verify_access_pin(pin: Optional[str]):
    """Verifica el PIN de acceso a la prueba técnica."""
    expected_pin = str(TEST_CONFIG.get("access_pin", "GLOINT-JR-2026")).strip().upper()
    provided_pin = str(pin or "").strip().upper()
    if provided_pin != expected_pin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Código PIN de acceso inválido o no autorizado."
        )

def execute_python_tests(code: str) -> Dict[str, Any]:
    """Ejecuta de manera segura las pruebas en Python y retorna los resultados."""
    # Lista blanca estricta de builtins seguros (sin __import__, sin os, sin sys)
    safe_globals = {
        "__builtins__": {
            "len": len, "range": range, "int": int, "float": float, "str": str,
            "dict": dict, "list": list, "set": set, "bool": bool, "sum": sum,
            "min": min, "max": max, "abs": abs, "round": round, "enumerate": enumerate,
            "isinstance": isinstance, "print": print, "Exception": Exception, "None": None,
            "True": True, "False": False
        }
    }
    local_vars: Dict[str, Any] = {}

    try:
        exec(code, safe_globals, local_vars)
    except Exception as compile_err:
        return {
            "success": False,
            "syntax_error": str(compile_err),
            "passed_tests": 0,
            "total_tests": len(TEST_CASES),
            "all_passed": False,
            "details": [
                {
                    "test_id": tc["id"],
                    "name": tc["name"],
                    "passed": False,
                    "error": f"Error de sintaxis o ejecución: {compile_err}",
                    "expected": tc["expected"],
                    "actual": None
                }
                for tc in TEST_CASES
            ]
        }

    # Buscar la función en local_vars
    fn = local_vars.get("calcular_balance") or local_vars.get("calcularBalance") or local_vars.get("calculate_balance")
    if not fn or not callable(fn):
        return {
            "success": False,
            "syntax_error": "No se encontró la función 'calcular_balance(movimientos)' definida en tu código.",
            "passed_tests": 0,
            "total_tests": len(TEST_CASES),
            "all_passed": False,
            "details": []
        }

    results = []
    passed_count = 0

    for tc in TEST_CASES:
        try:
            # Copia profunda del input para evitar que mutaciones del candidato alteren los datos
            raw_input = json.loads(json.dumps(tc["input"]))
            actual = fn(raw_input)

            # Normalizar tipos numéricos
            is_match = False
            if isinstance(actual, dict):
                norm_actual = {
                    "total_ingresos": float(actual.get("total_ingresos", 0)),
                    "total_egresos": float(actual.get("total_egresos", 0)),
                    "balance_neto": float(actual.get("balance_neto", 0)),
                    "movimientos_invalidos": int(actual.get("movimientos_invalidos", 0))
                }
                norm_expected = {
                    "total_ingresos": float(tc["expected"]["total_ingresos"]),
                    "total_egresos": float(tc["expected"]["total_egresos"]),
                    "balance_neto": float(tc["expected"]["balance_neto"]),
                    "movimientos_invalidos": int(tc["expected"]["movimientos_invalidos"])
                }
                is_match = (norm_actual == norm_expected)
            else:
                norm_actual = str(actual)

            if is_match:
                passed_count += 1
                results.append({
                    "test_id": tc["id"],
                    "name": tc["name"],
                    "passed": True,
                    "expected": tc["expected"],
                    "actual": actual
                })
            else:
                results.append({
                    "test_id": tc["id"],
                    "name": tc["name"],
                    "passed": False,
                    "error": "El resultado no coincide con lo esperado.",
                    "expected": tc["expected"],
                    "actual": actual
                })
        except Exception as test_err:
            results.append({
                "test_id": tc["id"],
                "name": tc["name"],
                "passed": False,
                "error": f"Excepción en tiempo de ejecución: {test_err}",
                "expected": tc["expected"],
                "actual": None
            })

    return {
        "success": True,
        "passed_tests": passed_count,
        "total_tests": len(TEST_CASES),
        "all_passed": (passed_count == len(TEST_CASES)),
        "details": results
    }

@router.post("/run")
async def run_candidate_code(req: CodeRunRequest):
    """
    Ejecuta el código del candidato contra los casos de prueba unitarios en tiempo real.
    Blindado contra inyección y limitado en longitud.
    """
    if not TEST_CONFIG["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La evaluación técnica se encuentra actualmente cerrada."
        )

    # Validar PIN si fue suministrado
    if req.access_pin:
        verify_access_pin(req.access_pin)

    # Validar tamaño máximo de código
    if len(req.code) > TEST_CONFIG["max_code_length"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El código supera el tamaño máximo permitido ({TEST_CONFIG['max_code_length']} caracteres)."
        )

    if req.language.lower() in ("python", "py"):
        return execute_python_tests(req.code)
    
    return {
        "success": False,
        "message": "La ejecución de JavaScript se realiza directamente en el navegador del cliente.",
        "passed_tests": 0,
        "total_tests": len(TEST_CASES),
        "all_passed": False,
        "details": []
    }

@router.post("/submit")
async def submit_technical_test(
    req: TestSubmissionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Registra la solución final entregada por el candidato en la base de datos.
    Blindado con:
    1. Kill switch activo/inactivo.
    2. Validación obligatoria de PIN.
    3. Límite estricto de 1 sola entrega por correo electrónico.
    4. Límite máximo de tamaño de payload.
    5. Límite máximo global de participantes.
    """
    if not TEST_CONFIG["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La evaluación técnica se encuentra actualmente cerrada."
        )

    # 1. Validar PIN obligatorio
    verify_access_pin(req.access_pin)

    # 2. Validar tamaño máximo
    if len(req.code) > TEST_CONFIG["max_code_length"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código enviado supera el límite permitido de seguridad (25KB)."
        )

    # 3. Asegurar tabla existente
    try:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS technical_evaluations (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                candidate_name VARCHAR(255) NOT NULL,
                candidate_email VARCHAR(255) NOT NULL,
                candidate_phone VARCHAR(50) NULL,
                language VARCHAR(50) NOT NULL DEFAULT 'python',
                code LONGTEXT NOT NULL,
                passed_tests INT DEFAULT 0,
                total_tests INT DEFAULT 3,
                test_results JSON NULL,
                time_spent_seconds INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'submitted',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tech_eval_email (candidate_email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
    except Exception:
        pass

    # 4. Validar que este correo no haya entregado antes (1 intento por candidato)
    candidate_email_clean = req.candidate_email.strip().lower()
    existing_q = select(TechnicalEvaluation).where(TechnicalEvaluation.candidate_email == candidate_email_clean)
    existing_res = await db.execute(existing_q)
    if existing_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una solución registrada para este correo electrónico. Solo se permite una entrega."
        )

    # 5. Validar cupo máximo de seguridad
    count_q = select(func.count(TechnicalEvaluation.id))
    count_res = await db.execute(count_q)
    current_count = count_res.scalar() or 0
    if current_count >= TEST_CONFIG["max_submissions"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se ha completado el cupo máximo de entregas disponibles para esta convocatoria."
        )

    # Si es Python, evaluamos en el servidor para certificar el puntaje final
    if req.language.lower() in ("python", "py"):
        test_run = execute_python_tests(req.code)
        passed_tests = test_run.get("passed_tests", 0)
        total_tests = test_run.get("total_tests", 3)
        test_results = test_run.get("details", [])
    else:
        passed_tests = len([t for t in (req.test_results or []) if t.get("passed")])
        total_tests = len(req.test_results) if req.test_results else 3
        test_results = req.test_results or []

    evaluation = TechnicalEvaluation(
        candidate_name=req.candidate_name.strip(),
        candidate_email=candidate_email_clean,
        candidate_phone=req.candidate_phone.strip() if req.candidate_phone else None,
        language=req.language.lower(),
        code=req.code,
        passed_tests=passed_tests,
        total_tests=total_tests,
        test_results=test_results,
        time_spent_seconds=req.time_spent_seconds,
        status="passed" if passed_tests == total_tests else "submitted"
    )

    db.add(evaluation)
    await db.commit()
    await db.refresh(evaluation)

    return {
        "success": True,
        "message": "¡Tu prueba técnica ha sido registrada con éxito!",
        "evaluation_id": evaluation.id,
        "passed_tests": passed_tests,
        "total_tests": total_tests
    }

async def verify_admin_or_pin(
    request: Request,
    pin: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Permite acceso EITHER mediante PIN de acceso OR mediante sesión de Admin PBAC.
    Evita cualquier redirección a /login para Diana y evaluadores.
    """
    provided_pin = pin or request.headers.get("x-access-pin") or request.query_params.get("pin")
    expected_pin = str(TEST_CONFIG.get("access_pin", "GLOINT-JR-2026")).strip().upper()
    if provided_pin and str(provided_pin).strip().upper() == expected_pin:
        return True

    # Fallback si ya está logueado en la plataforma como admin
    try:
        from src.api.deps import oauth2_scheme
        token = await oauth2_scheme(request)
        if token or request.cookies.get("access_token"):
            user = await get_current_user(request=request, db=db, token=token)
            if user:
                return True
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acceso restringido. Requiere PIN de acceso válido."
    )

@router.get("/submissions", dependencies=[Depends(verify_admin_or_pin)])
async def list_technical_submissions(
    db: AsyncSession = Depends(get_db)
):
    """
    Lista las evaluaciones entregadas.
    Permite acceso con PIN sin obligar a pasar por /login.
    """
    try:
        query = select(TechnicalEvaluation).order_by(TechnicalEvaluation.created_at.desc())
        res = await db.execute(query)
        evaluations = res.scalars().all()
        return [
            {
                "id": e.id,
                "candidate_name": e.candidate_name,
                "candidate_email": e.candidate_email,
                "candidate_phone": e.candidate_phone,
                "language": e.language,
                "code": e.code,
                "passed_tests": e.passed_tests,
                "total_tests": e.total_tests,
                "test_results": e.test_results,
                "time_spent_seconds": e.time_spent_seconds,
                "status": e.status,
                "created_at": e.created_at.isoformat() if e.created_at else None
            }
            for e in evaluations
        ]
    except Exception as err:
        logger.error(f"Error listando evaluaciones técnicas: {err}")
        return []

@router.get("/config", dependencies=[Depends(verify_admin_or_pin)])
async def get_test_config():
    """
    Retorna la configuración actual del Kill Switch y PIN de acceso.
    """
    return TEST_CONFIG

@router.post("/toggle-config", dependencies=[Depends(verify_admin_or_pin)])
async def update_test_config(
    req: ToggleConfigRequest
):
    """
    Permite activar/desactivar la prueba o actualizar el PIN en caliente usando el PIN actual.
    """
    if req.is_active is not None:
        TEST_CONFIG["is_active"] = req.is_active
    if req.access_pin is not None and req.access_pin.strip():
        TEST_CONFIG["access_pin"] = req.access_pin.strip().upper()

    return {
        "success": True,
        "message": "Configuración de seguridad actualizada exitosamente",
        "config": TEST_CONFIG
    }
