import asyncio
from sqlalchemy import text
from sqlalchemy.future import select
from src.core.database import async_session_maker
from src.models.security import Permission, Role, role_permissions

async def migrate_permissions():
    # Los 156 permisos extraídos
    permisos_raw = [
        'receive_goal_notifications', 'ver_clientes', 'ver_dashboard_contratos_vencer', 'inversiones_v2_corregir_hallazgos', 
        'weekly_credit.manage', 'ver_configuracion_paquetes_inversion', 'ver_usuarios', 'ver_configuracion_etiquetas', 
        'ver_administracion', 'administrar_bodega', 'ver_plantillas', 'mensajes_contacto_eliminar', 
        'ver_notificaciones_aprobar_desembolso', 'referidos_recepcion_ver', 'ver_dashboard_contratos', 'ver_reservas_salas', 
        'inversiones_v2_admin', 'roles_eliminar', 'gestionar_movimientos', 'ver_todas_ventas', 'bancos_eliminar', 'users.edit', 
        'ver_dashboard', 'inversiones_v2_aprobar_aumento', 'gestionar_configuracion_fechas', 'paquetes_inversion_eliminar', 
        'inversiones_v2_acceso', 'plataformas_crear', 'ver_crm_prospectos_inversionistas_todos', 'ver_crm', 
        'paquetes_inversion_crear', 'plantillas_crear', 'referidos_recepcion_agregar_notas', 'ver_periodos_contrato', 
        'ver_admin_mercado', 'receive_investor_notifications', 'ver_retiros_admin', 'bonificaciones_eliminar', 
        'receive_pqr_notifications', 'prospectos_inversionistas_editar', 'users.create', 'ver_configuracion_ciudades', 
        'plantillas_editar', 'prospectos_inversionistas_crear', 'rendimientos_eliminar', 'gestionar_productos', 'ver_rendimientos', 
        'rendimientos_crear', 'inversiones_v2_marcar_venta', 'usuarios_editar', 'receive_referral_notifications', 
        'ver_configuracion_tipos_cuenta', 'usuarios_eliminar', 'inversionistas_crear', 'roles_editar', 'ver_dashboard_metas', 
        'ver_dashboard_crm', 'bancos_crear', 'inversiones_v2_ver_billetera', 'gestionar_transacciones_mercado', 'usuarios_crear', 
        'receive_task_notifications', 'gestionar_metas', 'gestionar_todas_reservas', 'prospectos_inversionistas_eliminar', 
        'inversiones_v2_solicitar_aumento', 'bancos_editar', 'crear_desembolso_admin', 'solicitar_envios', 
        'seguimiento_usuarios_crear', 'ver_chat', 'account_types_eliminar', 'receive_assignment_notifications', 
        'ver_inventario_global', 'cancelar_reservas_propias', 'users.view', 'ver_paquetes_inversion', 'bonificaciones_acreditar', 
        'ver_configuracion_periodos_contrato', 'bonificaciones_configurar', 'inversiones_v2_crear', 'manage_permissions', 
        'ver_acciones', 'etiquetas_crear', 'plataformas_eliminar', 'acciones_emitir', 'ver_registros_reunion', 'ver_roles', 
        'periodos_contrato_crear', 'seguimiento_usuarios_editar', 'roles_crear', 'inversionistas_editar', 'crear_reservas_salas', 
        'inversiones_v2_eliminar', 'plataformas_editar', 'gestionar_envios', 'inversiones_v2_ver_solicitudes', 'gestionar_salas', 
        'ver_contactos_dropshipper', 'etiquetas_editar'
    ]
    
    # Limpiar duplicados
    permisos_raw = list(set(permisos_raw))

    async with async_session_maker() as db:
        print("Iniciando migración a la nueva estructura relacional...")
        
        # 1. Asegurarnos de que el rol Admin existe (ID 1)
        result = await db.execute(select(Role).where(Role.id == 1))
        admin_role = result.scalars().first()
        if not admin_role:
            print("Error: El rol Admin (ID 1) no existe en la tabla roles.")
            return

        # 2. Iterar sobre todos los permisos, crearlos si no existen
        for perm_name in permisos_raw:
            # Buscar si el permiso ya existe en la tabla `permissions`
            result = await db.execute(select(Permission).where(Permission.name == perm_name))
            perm = result.scalars().first()
            
            if not perm:
                # Tratar de adivinar el modulo y acción a partir del nombre
                parts = perm_name.split('_') if '_' in perm_name else perm_name.split('.')
                module = parts[0] if len(parts) > 0 else "general"
                action = parts[-1] if len(parts) > 1 else "manage"
                
                perm = Permission(
                    name=perm_name,
                    module=module,
                    action=action,
                    description=f"Permiso migrado: {perm_name}"
                )
                db.add(perm)
                await db.commit()
                await db.refresh(perm)
                print(f"Creado permiso en tabla permissions: {perm_name}")

            # 3. Asignar el permiso al rol Admin usando raw SQL para la tabla puente
            # Comprobamos si la relación ya existe
            check_query = text("SELECT 1 FROM role_permissions WHERE role_id = :r_id AND permission_id = :p_id")
            rel_exists = await db.execute(check_query, {"r_id": admin_role.id, "p_id": perm.id})
            
            if not rel_exists.first():
                insert_query = text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:r_id, :p_id)")
                await db.execute(insert_query, {"r_id": admin_role.id, "p_id": perm.id})
                print(f"Asignado {perm_name} al rol Admin.")
        
        await db.commit()
        print("\n¡Migración completada exitosamente! El rol Admin ahora tiene todos los permisos en la nueva estructura relacional.")

if __name__ == "__main__":
    asyncio.run(migrate_permissions())
