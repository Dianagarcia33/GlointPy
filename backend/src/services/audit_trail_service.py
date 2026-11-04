from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request
from src.models.audit_log import AuditLog
from src.models.user import User
from src.core.audit_context import mark_detailed_logged, resolve_client_ip

async def log_audit_trail(
    db: AsyncSession,
    action: str,
    module: str,
    user: Optional[User] = None,
    user_id: Optional[int] = None,
    user_name: Optional[str] = None,
    user_email: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[Any] = None,
    description: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status: str = "SUCCESS",
    commit: bool = True,
    strict: bool = False,
) -> Optional[AuditLog]:
    """
    Registra de forma asíncrona un evento inmutable en la pista de auditoría (Audit Trail).
    Captura actor, acción, módulo, entidad afectada, detalles (diff), IP y User-Agent.

    Modo atómico (H-65): con `commit=False, strict=True` solo agrega y hace flush en la
    transacción del llamador (la guarda su propio commit) y NO traga errores: si no se puede
    auditar, la operación completa falla.
    """
    try:
        req_ip = ip_address
        req_ua = user_agent
        if request:
            # IP fiable (no el primer X-Forwarded-For, que el cliente puede inventar)
            req_ip = resolve_client_ip(request.headers, request.client.host if request.client else None)
            req_ua = request.headers.get("user-agent")

        u_id = user.id if user else user_id
        u_name = user.name if user else user_name
        u_email = user.email if user else user_email

        log_entry = AuditLog(
            user_id=u_id,
            user_name=u_name,
            user_email=u_email,
            action=action,
            module=module,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            description=description,
            details=details,
            ip_address=req_ip,
            user_agent=req_ua[:300] if req_ua else None,
            status=status
        )
        db.add(log_entry)
        if commit:
            await db.commit()
        else:
            await db.flush()
        mark_detailed_logged()
        return log_entry
    except Exception as e:
        if strict:
            raise
        print(f"[AuditTrailService] Error recording audit trail event: {e}")
        return None
