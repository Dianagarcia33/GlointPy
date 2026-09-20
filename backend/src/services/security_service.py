from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from src.models.security import Role, Permission
from src.schemas.security import RoleCreate, RoleUpdate

class SecurityService:

    @staticmethod
    async def get_all_roles(db: AsyncSession):
        result = await db.execute(select(Role).options(selectinload(Role.permissions)))
        return result.scalars().all()

    @staticmethod
    async def get_role(db: AsyncSession, role_id: int):
        result = await db.execute(
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.id == role_id)
        )
        role = result.scalars().first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        return role

    @staticmethod
    async def create_role(db: AsyncSession, role_data: RoleCreate):
        # Verificar nombre duplicado
        existing = await db.execute(select(Role).where(Role.name == role_data.name))
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Role name already exists")

        new_role = Role(name=role_data.name, description=role_data.description)
        
        # Asignar permisos si vienen en el request
        if role_data.permission_ids:
            perms_result = await db.execute(
                select(Permission).where(Permission.id.in_(role_data.permission_ids))
            )
            new_role.permissions = perms_result.scalars().all()

        db.add(new_role)
        await db.commit()
        
        # Recargar con relaciones para evitar MissingGreenlet
        result = await db.execute(
            select(Role).options(selectinload(Role.permissions)).where(Role.id == new_role.id)
        )
        return result.scalars().first()

    @staticmethod
    async def update_role(db: AsyncSession, role_id: int, role_data: RoleUpdate):
        role = await SecurityService.get_role(db, role_id)
        
        if role.is_system_role == "1" and role_data.name and role_data.name != role.name:
            raise HTTPException(status_code=403, detail="Cannot rename system roles")

        if role_data.name is not None:
            # Check duplicate
            existing = await db.execute(select(Role).where(Role.name == role_data.name, Role.id != role_id))
            if existing.scalars().first():
                raise HTTPException(status_code=400, detail="Role name already exists")
            role.name = role_data.name
            
        if role_data.description is not None:
            role.description = role_data.description

        if role_data.permission_ids is not None:
            if not role_data.permission_ids:
                role.permissions = []
            else:
                perms_result = await db.execute(
                    select(Permission).where(Permission.id.in_(role_data.permission_ids))
                )
                role.permissions = perms_result.scalars().all()

        await db.commit()
        
        # Recargar con relaciones para evitar MissingGreenlet
        result = await db.execute(
            select(Role).options(selectinload(Role.permissions)).where(Role.id == role.id)
        )
        return result.scalars().first()

    @staticmethod
    async def delete_role(db: AsyncSession, role_id: int):
        role = await SecurityService.get_role(db, role_id)
        if role.is_system_role == "1":
            raise HTTPException(status_code=403, detail="Cannot delete system roles")
        
        # Verificar si hay usuarios con este rol
        from sqlalchemy import select, func
        from src.models.security import user_roles
        
        users_count_query = select(func.count()).select_from(user_roles).where(user_roles.c.role_id == role_id)
        result = await db.execute(users_count_query)
        count = result.scalar()
        
        if count > 0:
            raise HTTPException(status_code=400, detail="No se puede eliminar el rol porque hay usuarios que lo tienen asignado")
            
        await db.delete(role)
        await db.commit()

    @staticmethod
    async def get_all_permissions(db: AsyncSession):
        result = await db.execute(select(Permission).order_by(Permission.module, Permission.name))
        return result.scalars().all()

    @staticmethod
    async def sync_all_system_permissions(db: AsyncSession):
        from src.models.security import role_permissions
        from sqlalchemy import insert, delete

        SYSTEM_PERMISSIONS = [
            # Módulo Dashboard Inversionista
            {"name": "dashboard:view_kpis", "description": "Ver resumen ejecutivo de portafolio y KPIs", "module": "Dashboard"},
            {"name": "dashboard:view_quick_actions", "description": "Visualizar accesos rápidos de inversión y retiros", "module": "Dashboard"},
            {"name": "dashboard:view_investments", "description": "Ver listado y detalle de mis contratos de inversión", "module": "Dashboard"},
            {"name": "dashboard:view_requests", "description": "Ver solicitudes pendientes en el dashboard", "module": "Dashboard"},

            # Módulo Billetera y Bóveda
            {"name": "wallets:view", "description": "Acceso al módulo principal de billetera digital", "module": "Billetera"},
            {"name": "wallets:view_balance", "description": "Visualizar saldo disponible y capital en billetera", "module": "Billetera"},
            {"name": "wallets:view_history", "description": "Consultar historial de movimientos y extractos", "module": "Billetera"},
            {"name": "wallets:request_withdrawal", "description": "Solicitar retiros de capital o rendimientos a banco", "module": "Billetera"},
            {"name": "wallets:new_investment", "description": "Crear nueva inversión utilizando saldo de billetera", "module": "Billetera"},
            {"name": "bank_accounts:manage", "description": "Registrar y gestionar cuentas bancarias en la bóveda", "module": "Billetera"},
            {"name": "beneficiaries:view", "description": "Registrar y administrar beneficiarios vinculados", "module": "Billetera"},
            {"name": "referrals:view", "description": "Visualizar enlace y código de referidos propios", "module": "Billetera"},

            # Módulo Acciones
            {"name": "shares:access", "description": "Acceso a compra y venta en el mercado de acciones", "module": "Acciones"},
            {"name": "admin.shares.manage", "description": "Administrar emisiones, fijar precio oficial y auditar órdenes", "module": "Acciones"},

            # Módulo Comercial & Directivo
            {"name": "commercial:view", "description": "Acceso a la mesa de trabajo comercial y ventas", "module": "Comercial"},
            {"name": "director.dashboard.view", "description": "Panel de control y seguimiento del directivo de inversiones", "module": "Comercial"},
            {"name": "admin.commercial.manage", "description": "Gestionar, auditar y adjudicar ventas del equipo comercial", "module": "Comercial"},
            {"name": "admin.commissions.settle", "description": "Liquidar y procesar comisiones del equipo comercial", "module": "Comercial"},

            # Módulo Inversionistas
            {"name": "admin.investors.manage", "description": "Acceso y consulta de la tabla general de inversionistas", "module": "Inversionistas"},
            {"name": "admin.investors.create", "description": "Crear nuevos contratos e inversionistas (Crear Inversión)", "module": "Inversionistas"},
            {"name": "admin.investors.wallet_adjust", "description": "Ajustar saldo de billetera de inversionistas (Herramienta Lápiz)", "module": "Inversionistas"},
            {"name": "admin.investors.capital_increase", "description": "Gestionar aumentos de capital a contratos (+ Capital)", "module": "Inversionistas"},
            {"name": "admin.investors.delete", "description": "Eliminar contratos de inversión e inversionistas", "module": "Inversionistas"},

            # Módulo Inversiones
            {"name": "admin.investments.manage", "description": "Administrar y auditar la totalidad de solicitudes de inversión", "module": "Inversiones"},
            {"name": "admin.investments.solicitud_inversion", "description": "Permiso para abrir el formulario de nueva solicitud", "module": "Inversiones"},
            {"name": "admin.investments.approve", "description": "Aprobar solicitudes de inversión y formalizar contratos", "module": "Inversiones"},
            {"name": "admin.investments.reject", "description": "Rechazar solicitudes de inversión con justificación", "module": "Inversiones"},

            # Módulo Pagos & Auditoría
            {"name": "admin.payments.manage", "description": "Gestionar la pasarela de pagos y depósitos bancarios", "module": "Pagos"},
            {"name": "admin.withdrawals.manage", "description": "Auditar y autorizar solicitudes de retiro de fondos", "module": "Pagos"},
            {"name": "admin.audits.manage", "description": "Auditoría integral, cálculo y corte de rendimientos", "module": "Auditoría"},

            # Módulo Administración
            {"name": "admin.roles.manage", "description": "Gestionar roles de usuario y matriz de permisos PBAC", "module": "Administración"},
            {"name": "admin.users.manage", "description": "Gestionar usuarios, estados de cuenta y vinculaciones parentales", "module": "Administración"},
            {"name": "admin.periods.manage", "description": "Crear y administrar periodos fiscales de inversión", "module": "Administración"},
            {"name": "admin.packages.manage", "description": "Crear, parametrizar y activar paquetes de inversión", "module": "Administración"},
            {"name": "admin.rankings.manage", "description": "Administrar rangos, clubes de beneficios y niveles", "module": "Administración"},
            {"name": "admin.referrals.manage", "description": "Administrar referidos comerciales, asignaciones y conversiones", "module": "Administración"},
            {"name": "admin.external_apps.manage", "description": "Gestionar integraciones API, apps externas y pasarela Gloint Pay", "module": "Administración"},
            {"name": "admin.events.manage", "description": "Crear y administrar eventos oficiales corporativos", "module": "Administración"},
            {"name": "admin.notifications.manage", "description": "Emitir comunicados masivos y notificaciones push", "module": "Administración"},
            {"name": "admin.templates.manage", "description": "Administrar plantillas contractuales y documentos", "module": "Administración"},
            {"name": "manage_system_events", "description": "Gestionar calendario y eventos del sistema", "module": "Administración"},
            {"name": "sarlaft:check", "description": "Ejecutar validación de listas restrictivas Sarlaft", "module": "Administración"},

            # Módulo Chat
            {"name": "chat:view", "description": "Acceder y visualizar el módulo de chat corporativo", "module": "Chat"},
            {"name": "chat:send", "description": "Enviar mensajes y archivos en salas de chat", "module": "Chat"},
            {"name": "admin.chat.manage", "description": "Moderar, supervisar y administrar salas de chat", "module": "Chat"},

            # Módulo CRM
            {"name": "crm:view", "description": "Acceso a la vista de embudos, prospectos y calendario CRM", "module": "CRM"},
            {"name": "crm:leads:manage", "description": "Crear, mover y dar seguimiento a prospectos del CRM", "module": "CRM"},
            {"name": "crm:projects:manage", "description": "Crear y parametrizar proyectos de captación en el CRM", "module": "CRM"},
            {"name": "admin.crm.manage", "description": "Administración global, métricas e historial del CRM", "module": "CRM"},
        ]

        # 1. Sincronizar permisos en la tabla
        all_perms_map = {}
        for p in SYSTEM_PERMISSIONS:
            res = await db.execute(select(Permission).where(Permission.name == p["name"]))
            existing = res.scalars().first()
            if not existing:
                new_p = Permission(**p)
                db.add(new_p)
                await db.flush()
                all_perms_map[p["name"]] = new_p
            else:
                existing.description = p["description"]
                existing.module = p["module"]
                all_perms_map[p["name"]] = existing

        # 2. Limpiar permisos obsoletos con nombres en español o no estándar
        valid_names = set(all_perms_map.keys())
        all_db_perms = await db.execute(select(Permission))
        for p in all_db_perms.scalars().all():
            if p.name not in valid_names:
                # Quitar vínculos en role_permissions primero
                await db.execute(delete(role_permissions).where(role_permissions.c.permission_id == p.id))
                await db.delete(p)

        await db.commit()

        # 3. Asignar permisos por defecto a los roles estándar
        DEFAULT_ROLE_PERMS = {
            "inversionista": [
                "dashboard:view_kpis", "dashboard:view_quick_actions", "dashboard:view_investments", "dashboard:view_requests",
                "wallets:view", "wallets:view_balance", "wallets:view_history", "wallets:request_withdrawal", "wallets:new_investment",
                "bank_accounts:manage", "beneficiaries:view", "referrals:view", "shares:access",
                "chat:view", "chat:send"
            ],
            "cliente": [
                "dashboard:view_kpis", "dashboard:view_quick_actions", "dashboard:view_investments", "dashboard:view_requests",
                "wallets:view", "wallets:view_balance", "wallets:view_history", "wallets:request_withdrawal", "wallets:new_investment",
                "bank_accounts:manage", "beneficiaries:view", "referrals:view", "shares:access",
                "chat:view", "chat:send"
            ],
            "directivo_de_inversiones": [
                "commercial:view", "director.dashboard.view", "referrals:view", "admin.referrals.manage",
                "crm:view", "crm:leads:manage", "crm:projects:manage",
                "dashboard:view_kpis", "wallets:view", "wallets:view_balance", "wallets:view_history", "bank_accounts:manage",
                "chat:view", "chat:send"
            ],
            "operaciones": [
                "admin.investors.manage", "admin.investors.create", "admin.investors.capital_increase", "admin.investors.wallet_adjust",
                "admin.investments.manage", "admin.investments.solicitud_inversion", "admin.investments.approve", "admin.investments.reject",
                "admin.packages.manage", "admin.periods.manage", "sarlaft:check",
                "chat:view", "chat:send"
            ],
            "contabilidad_": [
                "admin.payments.manage", "admin.withdrawals.manage", "admin.audits.manage", "admin.commissions.settle",
                "chat:view", "chat:send"
            ]
        }

        roles_res = await db.execute(select(Role))
        roles = roles_res.scalars().all()

        for role in roles:
            r_name = role.name.lower()
            is_admin = "super" in r_name or "admin" in r_name

            perms_to_add = []
            if is_admin:
                perms_to_add = list(all_perms_map.values())
            elif r_name in DEFAULT_ROLE_PERMS:
                perms_to_add = [all_perms_map[p] for p in DEFAULT_ROLE_PERMS[r_name] if p in all_perms_map]

            for perm in perms_to_add:
                check = await db.execute(select(role_permissions).where(
                    (role_permissions.c.role_id == role.id) & 
                    (role_permissions.c.permission_id == perm.id)
                ))
                if not check.first():
                    await db.execute(insert(role_permissions).values(
                        role_id=role.id,
                        permission_id=perm.id
                    ))

        await db.commit()
        return {
            "message": "Permisos del sistema sincronizados exitosamente",
            "total_permissions": len(all_perms_map)
        }
        

