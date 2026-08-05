import asyncio
import os
import sys
from dotenv import load_dotenv

# Asegurar importación correcta
file_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(file_dir, ".."))

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if file_dir not in sys.path:
    sys.path.insert(0, file_dir)

load_dotenv(".env")

try:
    from src.core.database import async_session_maker
    from src.models.security import Permission, Role, role_permissions
except ModuleNotFoundError:
    from core.database import async_session_maker
    from models.security import Permission, Role, role_permissions

from sqlalchemy.future import select
from sqlalchemy import insert

PERMISSIONS = [
    # Módulo Comercial
    {"name": "commercial:view", "description": "Acceder y ver el panel comercial", "module": "commercial"},
    {"name": "admin.commercial.manage", "description": "Gestionar, auditar y adjudicar ventas comerciales del equipo", "module": "commercial"},

    # Módulo Administración
    {"name": "admin.roles.manage", "description": "Gestionar roles y permisos del sistema", "module": "admin"},
    {"name": "admin.users.manage", "description": "Gestionar usuarios de la plataforma", "module": "admin"},
    {"name": "admin.periods.manage", "description": "Gestionar periodos de inversión", "module": "admin"},
    {"name": "admin.packages.manage", "description": "Gestionar paquetes", "module": "admin"},
    {"name": "admin.investors.manage", "description": "Gestionar contratos de inversionistas", "module": "investors"},
    {"name": "admin.investors.wallet_adjust", "description": "Ajustar saldo de billetera de inversionistas (Lápiz)", "module": "investors"},
    {"name": "admin.investments.manage", "description": "Aprobar y rechazar solicitudes de inversión", "module": "investments"},
    {"name": "admin.payments.manage", "description": "Gestionar sección de pagos", "module": "payments"},
    {"name": "admin.withdrawals.manage", "description": "Gestionar y aprobar retiros", "module": "payments"},
    {"name": "admin.audits.manage", "description": "Auditoría y cálculo de rendimientos", "module": "audit"},

    # Dashboard Inversionista
    {"name": "dashboard:view_kpis", "description": "Ver KPIs en Dashboard", "module": "dashboard"},
    {"name": "dashboard:view_quick_actions", "description": "Ver acciones rápidas en Dashboard", "module": "dashboard"},
    {"name": "dashboard:view_investments", "description": "Ver mis inversiones", "module": "dashboard"},
    {"name": "dashboard:view_requests", "description": "Ver solicitudes pendientes", "module": "dashboard"},

    # Billeteras y Bóveda Bancaria
    {"name": "wallets:view", "description": "Acceso a la página de mi billetera", "module": "wallets"},
    {"name": "wallets:view_balance", "description": "Ver saldo disponible en billetera", "module": "wallets"},
    {"name": "wallets:view_history", "description": "Ver historial de movimientos", "module": "wallets"},
    {"name": "wallets:request_withdrawal", "description": "Solicitar retiro de fondos", "module": "wallets"},
    {"name": "wallets:new_investment", "description": "Realizar nueva inversión desde billetera", "module": "wallets"},
    {"name": "bank_accounts:manage", "description": "Gestionar cuentas bancarias en la bóveda", "module": "bank_accounts"},

    # Fechas y Sarlaft
    {"name": "manage_system_events", "description": "Gestionar eventos del sistema", "module": "system_events"},
    {"name": "sarlaft:check", "description": "Realizar consultas Sarlaft", "module": "sarlaft"},

    # Módulo Chat
    {"name": "chat:view", "description": "Acceder y ver el módulo de chat en tiempo real", "module": "chat"},
    {"name": "chat:send", "description": "Enviar mensajes en las conversaciones del chat", "module": "chat"},
    {"name": "admin.chat.manage", "description": "Administrar y moderar todas las salas de chat", "module": "chat"},

    # Módulo CRM por Proyectos
    {"name": "crm:view", "description": "Acceder y ver el módulo CRM de proyectos y prospectos", "module": "crm"},
    {"name": "crm:leads:manage", "description": "Crear, editar y mover prospectos y actividades en el CRM", "module": "crm"},
    {"name": "crm:projects:manage", "description": "Crear y administrar proyectos de inversión en el CRM", "module": "crm"},
    {"name": "admin.crm.manage", "description": "Administración global de prospectos, proyectos y métricas del CRM", "module": "crm"},
]

async def seed_permissions():
    async with async_session_maker() as db:
        print("🔍 Sincronizando permisos del sistema...")
        all_perms_map = {}

        for p_data in PERMISSIONS:
            result = await db.execute(select(Permission).where(Permission.name == p_data["name"]))
            existing = result.scalars().first()
            if not existing:
                new_perm = Permission(**p_data)
                db.add(new_perm)
                await db.flush()
                print(f"✨ Permiso creado: {p_data['name']}")
                all_perms_map[p_data["name"]] = new_perm
            else:
                existing.description = p_data["description"]
                existing.module = p_data["module"]
                all_perms_map[p_data["name"]] = existing

        await db.commit()

        # Asignar automáticamente los permisos a todos los roles
        roles_res = await db.execute(select(Role))
        roles = roles_res.scalars().all()

        for role in roles:
            role_name_lower = role.name.lower()
            is_admin_role = "super" in role_name_lower or "admin" in role_name_lower

            for p_name, perm in all_perms_map.items():
                is_crm_perm = p_name in ["crm:view", "crm:leads:manage", "crm:projects:manage", "commercial:view", "chat:view", "chat:send"]
                
                if is_admin_role or is_crm_perm:
                    check = await db.execute(select(role_permissions).where(
                        (role_permissions.c.role_id == role.id) & 
                        (role_permissions.c.permission_id == perm.id)
                    ))
                    if not check.first():
                        await db.execute(insert(role_permissions).values(
                            role_id=role.id,
                            permission_id=perm.id
                        ))
            print(f"🔑 Permisos asignados a: {role.name}")

        await db.commit()
        print("✅ Permisos sincronizados y asignados correctamente.")

if __name__ == "__main__":
    asyncio.run(seed_permissions())
