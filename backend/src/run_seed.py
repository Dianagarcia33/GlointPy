import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
load_dotenv(".env")

from src.core.database import async_session_maker
from src.models.security import Permission, Role, role_permissions
from sqlalchemy.future import select
from sqlalchemy import insert

PERMISSIONS = [
    {"name": "commercial:view", "description": "Acceder y ver el panel comercial", "module": "commercial"},
    {"name": "commercial:create_sale", "description": "Registrar ventas en el panel comercial", "module": "commercial"},
    {"name": "commercial:adjudicate_sale", "description": "Adjudicar ventas comerciales del equipo", "module": "commercial"},
    {"name": "admin.commissions.settle", "description": "Liquidar comisiones y bonos del equipo comercial", "module": "commercial"},
    {"name": "admin.commercial.manage", "description": "Gestionar, auditar y adjudicar ventas comerciales del equipo", "module": "commercial"},
    {"name": "roles:view", "description": "Acceder y ver la lista de roles y matriz de permisos", "module": "roles"},
    {"name": "roles:manage", "description": "Crear, editar y actualizar la matriz de permisos PBAC", "module": "roles"},
    {"name": "admin.roles.manage", "description": "Gestionar roles y permisos del sistema", "module": "roles"},
    {"name": "users:view", "description": "Ver lista de usuarios de la plataforma", "module": "users"},
    {"name": "admin.users.manage", "description": "Gestionar usuarios y credenciales de la plataforma", "module": "users"},
    {"name": "admin.periods.manage", "description": "Gestionar periodos de inversión", "module": "periods"},
    {"name": "admin.packages.manage", "description": "Gestionar paquetes de inversión", "module": "packages"},
    {"name": "admin.investors.manage", "description": "Gestionar contratos de inversionistas", "module": "investors"},
    {"name": "admin.investors.wallet_adjust", "description": "Ajustar saldo de billetera de inversionistas (Lápiz)", "module": "investors"},
    {"name": "admin.investors.capital_increase", "description": "Solicitar o gestionar aumento de capital de contratos (+ Capital)", "module": "investors"},
    {"name": "admin.investors.delete", "description": "Eliminar contratos e inversionistas del sistema", "module": "investors"},
    {"name": "admin.investments.manage", "description": "Aprobar y rechazar solicitudes de inversión", "module": "investments"},
    {"name": "admin.payments.manage", "description": "Gestionar sección de pagos", "module": "payments"},
    {"name": "admin.withdrawals.manage", "description": "Gestionar y aprobar retiros", "module": "payments"},
    {"name": "admin.audits.manage", "description": "Auditoría y cálculo de rendimientos", "module": "audit"},
    {"name": "director.dashboard.view", "description": "Visualización del Dashboard Directivo de Inversiones", "module": "dashboard"},
    {"name": "dashboard:view_kpis", "description": "Ver KPIs en Dashboard", "module": "dashboard"},
    {"name": "dashboard:view_quick_actions", "description": "Ver acciones rápidas en Dashboard", "module": "dashboard"},
    {"name": "dashboard:view_investments", "description": "Ver mis inversiones", "module": "dashboard"},
    {"name": "dashboard:view_requests", "description": "Ver solicitudes pendientes", "module": "dashboard"},
    {"name": "wallets:view", "description": "Acceso a la página de mi billetera", "module": "wallets"},
    {"name": "wallets:view_balance", "description": "Ver saldo disponible en billetera", "module": "wallets"},
    {"name": "wallets:view_history", "description": "Ver historial de movimientos", "module": "wallets"},
    {"name": "wallets:request_withdrawal", "description": "Solicitar retiro de fondos", "module": "wallets"},
    {"name": "wallets:new_investment", "description": "Realizar nueva inversión desde billetera", "module": "wallets"},
    {"name": "bank_accounts:manage", "description": "Gestionar cuentas bancarias en la bóveda", "module": "bank_accounts"},
    {"name": "manage_system_events", "description": "Gestionar eventos del sistema", "module": "system_events"},
    {"name": "sarlaft:check", "description": "Realizar consultas Sarlaft", "module": "sarlaft"},
    {"name": "beneficiaries:view", "description": "Ver y gestionar beneficiarios", "module": "beneficiaries"},
    {"name": "referrals:view", "description": "Ver y gestionar referidos potenciales", "module": "referrals"},
    {"name": "admin.referrals.manage", "description": "Gestionar referidos potenciales comerciales", "module": "referrals"},
]

async def seed_permissions_db(db):
    print("🔍 Registrando permisos en la base de datos...")
    all_perms_map = {}

    for p_data in PERMISSIONS:
        res = await db.execute(select(Permission).where(Permission.name == p_data["name"]))
        existing = res.scalars().first()
        if not existing:
            new_p = Permission(**p_data)
            db.add(new_p)
            await db.flush()
            print(f"✨ Permiso creado: {p_data['name']}")
            all_perms_map[p_data["name"]] = new_p
        else:
            existing.description = p_data["description"]
            existing.module = p_data["module"]
            all_perms_map[p_data["name"]] = existing

    await db.commit()

    roles_res = await db.execute(select(Role))
    roles = roles_res.scalars().all()

    for role in roles:
        # Si el rol ya tiene permisos asignados en la matriz, respetar la configuración manual del administrador
        role_has_perms = await db.execute(
            select(role_permissions).where(role_permissions.c.role_id == role.id)
        )
        if role_has_perms.first():
            continue

        r_name = role.name.lower()
        if "super" in r_name or "admin" in r_name:
            for p_name, perm in all_perms_map.items():
                check = await db.execute(select(role_permissions).where(
                    (role_permissions.c.role_id == role.id) & 
                    (role_permissions.c.permission_id == perm.id)
                ))
                if not check.first():
                    await db.execute(insert(role_permissions).values(
                        role_id=role.id,
                        permission_id=perm.id
                    ))
            print(f"🔑 Permisos asignados al rol: {role.name}")
        elif any(kw in r_name for kw in ["directiv", "comercial", "asesor", "lider", "director", "gerente"]):
            commercial_perms = [
                "director.dashboard.view", "commercial:view", 
                "referrals:view", "admin.referrals.manage", "dashboard:view_kpis", "wallets:view", 
                "wallets:view_balance", "wallets:view_history", "bank_accounts:manage"
            ]
            for p_name in commercial_perms:
                if p_name in all_perms_map:
                    perm = all_perms_map[p_name]
                    check = await db.execute(select(role_permissions).where(
                        (role_permissions.c.role_id == role.id) & 
                        (role_permissions.c.permission_id == perm.id)
                    ))
                    if not check.first():
                        await db.execute(insert(role_permissions).values(
                            role_id=role.id,
                            permission_id=perm.id
                        ))
            print(f"🔑 Permisos de Directivo / Comercial asignados a: {role.name}")
        elif "investor" in r_name or "inversionista" in r_name:
            investor_perms = [
                "beneficiaries:view", "referrals:view", "wallets:view", "wallets:view_balance", 
                "wallets:view_history", "wallets:request_withdrawal", 
                "wallets:new_investment", "dashboard:view_kpis", 
                "dashboard:view_quick_actions", "dashboard:view_investments", 
                "dashboard:view_requests", "bank_accounts:manage"
            ]
            for p_name in investor_perms:
                if p_name in all_perms_map:
                    perm = all_perms_map[p_name]
                    check = await db.execute(select(role_permissions).where(
                        (role_permissions.c.role_id == role.id) & 
                        (role_permissions.c.permission_id == perm.id)
                    ))
                    if not check.first():
                        await db.execute(insert(role_permissions).values(
                            role_id=role.id,
                            permission_id=perm.id
                        ))
            print(f"🔑 Permisos de Inversionista asignados a: {role.name}")

    await db.commit()
    print("✅ PERMISOS REGISTRADOS Y ASIGNADOS EXITOSAMENTE.")

async def main():
    async with async_session_maker() as db:
        await seed_permissions_db(db)

if __name__ == "__main__":
    asyncio.run(main())
