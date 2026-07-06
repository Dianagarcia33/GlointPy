import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from src.core.database import async_session_maker
from src.models.security import Role

# Datos extraídos directamente de backup_gloint_db.sql
BACKUP_ROLES = {
    "admin": ["manage_permissions", "ver_notificaciones", "receive_contact_notifications", "receive_crm_notifications", "receive_investor_notifications", "receive_assignment_notifications", "receive_task_notifications", "receive_goal_notifications", "receive_referral_notifications", "users.view", "users.create", "users.edit", "users.assign_roles", "ver_dashboard", "ver_gestion_usuarios", "ver_inversionistas", "ver_usuarios", "ver_clientes", "ver_historia_desembolsos", "ver_estadisticas_desembolsos", "crear_desembolso_admin", "usuarios_crear", "usuarios_editar", "usuarios_eliminar", "ver_notificaciones_aprobar_desembolso", "ver_configuracion", "ver_configuracion_ciudades", "ver_configuracion_etiquetas", "ver_configuracion_plataformas", "ver_configuracion_bancos", "ver_configuracion_tipos_cuenta", "ver_configuracion_periodos_contrato", "ver_configuracion_paquetes_inversion", "ver_configuracion_rendimientos", "ver_configuracion_acciones", "acciones_actualizar_precio", "ver_configuracion_fechas", "gestionar_configuracion_fechas", "acciones_emitir", "gestionar_metas", "ver_retiros_admin", "gestionar_retiros", "ver_dashboard_metas", "ver_dashboard_contratos", "ver_dashboard_crm", "ver_dashboard_contratos_vencer", "ver_dashboard_actividad", "ver_crm", "ver_crm_seguimiento_usuarios", "seguimiento_usuarios_crear", "seguimiento_usuarios_editar", "seguimiento_usuarios_eliminar", "ver_crm_prospectos_inversionistas_todos", "ver_crm_prospectos_inversionistas_propios", "prospectos_inversionistas_crear", "prospectos_inversionistas_editar", "prospectos_inversionistas_eliminar", "ver_comunicacion", "ver_chat", "ver_mensajes_contacto", "mensajes_contacto_responder", "mensajes_contacto_eliminar", "bancos_crear", "bancos_editar", "bancos_eliminar", "ciudades_crear", "ciudades_editar", "ciudades_eliminar", "etiquetas_crear", "etiquetas_editar", "etiquetas_eliminar", "plataformas_crear", "plataformas_editar", "plataformas_eliminar", "rendimientos_crear", "rendimientos_editar", "rendimientos_eliminar", "account_types_crear", "account_types_editar", "account_types_eliminar", "paquetes_inversion_crear", "paquetes_inversion_editar", "paquetes_inversion_eliminar", "periodos_contrato_crear", "periodos_contrato_editar", "periodos_contrato_eliminar", "ver_administracion", "ver_roles", "roles_crear", "roles_editar", "roles_eliminar", "ver_plantillas", "plantillas_crear", "plantillas_editar", "plantillas_eliminar", "ver_bonificaciones", "bonificaciones_ver", "bonificaciones_crear", "bonificaciones_editar", "bonificaciones_eliminar", "bonificaciones_acreditar", "bonificaciones_configurar", "referidos_recepcion_ver", "referidos_recepcion_contactar", "referidos_recepcion_actualizar_estado", "referidos_recepcion_agregar_notas", "ver_inversionistas", "inversionistas_crear", "inversionistas_editar", "inversionistas_eliminar", "ver_paquetes_inversion", "paquetes_inversion_crear", "paquetes_inversion_editar", "paquetes_inversion_eliminar", "ver_rendimientos", "rendimientos_crear", "rendimientos_editar", "rendimientos_eliminar", "ver_periodos_contrato", "periodos_contrato_crear", "ver_registros_reunion", "periodos_contrato_editar", "periodos_contrato_eliminar", "ver_acciones", "acciones_editar", "ver_admin_mercado", "gestionar_transacciones_mercado", "ver_solicitudes_inversion", "gestionar_solicitudes_inversion", "weekly_credit.view_all", "weekly_credit.manage", "administrar_bodega", "ver_inventario_global", "gestionar_movimientos", "gestionar_categorias", "gestionar_productos", "gestionar_envios", "solicitar_envios", "ver_contactos_dropshipper", "ver_reportes", "pqr.view", "pqr.create", "pqr.manage", "receive_pqr_notifications", "gestionar_billetera_admin", "ver_reservas_salas", "gestionar_salas", "crear_reservas_salas", "cancelar_reservas_propias", "gestionar_todas_reservas", "inversiones_v2_acceso", "registrar_retiros_delegados", "inversiones_v2_solicitar_aumento", "inversiones_v2_regenerar_documentos", "inversiones_v2_ver_billetera", "inversiones_v2_ver_solicitudes", "ventas_eliminar", "ver_todas_ventas", "inversiones_v2_admin", "inversiones_v2_aprobar_aumento", "inversiones_v2_corregir_hallazgos", "inversiones_v2_crear", "inversiones_v2_editar", "inversiones_v2_eliminar", "inversiones_v2_finalizar_contrato", "inversiones_v2_marcar_venta"],
    "cliente": ["ver_notificaciones", "ver_dashboard", "crear_desembolso_rapido", "ver_desembolsos_cliente", "ver_notificaciones_cliente", "ver_factoring_logistico", "ver_mi_bodega", "solicitar_envio", "ver_mis_envios", "weekly_credit.view_own", "weekly_credit.request_increase", "ver_cash_back_logistico", "ver_dashboard_grafica_retiros", "solicitar_envios", "pqr.view", "pqr.create"],
    "directivo_de_inversiones": ["ver_dashboard", "prospectos_inversionistas_crear", "prospectos_inversionistas_editar", "prospectos_inversionistas_eliminar", "ver_crm", "ver_crm_prospectos_inversionistas_propios", "inversionistas_crear", "inversionistas_editar", "inversionistas_eliminar", "ver_inversionistas", "mensajes_contacto_responder", "ver_chat", "ver_comunicacion", "ver_mensajes_contacto", "ver_configuracion", "ver_configuracion_acciones", "ver_configuracion_bancos", "ver_configuracion_ciudades", "ver_configuracion_etiquetas", "ver_configuracion_paquetes_inversion", "ver_configuracion_periodos_contrato", "ver_configuracion_plataformas", "ver_configuracion_rendimientos", "ver_configuracion_tipos_cuenta", "ciudades_crear", "ciudades_editar", "bancos_crear", "bancos_editar", "account_types_crear", "account_types_editar", "etiquetas_crear", "etiquetas_editar", "plataformas_crear", "plataformas_editar", "periodos_contrato_crear", "periodos_contrato_editar", "ver_periodos_contrato", "paquetes_inversion_crear", "paquetes_inversion_editar", "ver_paquetes_inversion", "rendimientos_crear", "rendimientos_editar", "ver_rendimientos", "ver_gestion_usuarios", "receive_contact_notifications", "ver_dashboard_contratos", "ver_dashboard_contratos_vencer", "ver_dashboard_crm", "receive_crm_notifications", "receive_goal_notifications", "receive_investor_notifications", "receive_task_notifications", "ver_notificaciones", "receive_assignment_notifications", "gestionar_solicitudes_inversion", "ver_solicitudes_inversion", "ver_contactos_dropshipper", "inversiones_v2_acceso", "inversiones_v2_marcar_venta", "inversiones_v2_regenerar_documentos", "inversiones_v2_solicitar", "inversiones_v2_ver_billetera", "pqr.create", "pqr.view", "receive_pqr_notifications", "inversiones_v2_ver_solicitudes", "ver_mis_ventas", "inversiones_v2_solicitar_aumento", "inversiones_v2_aprobar_aumento"],
    "operaciones": ["ver_dashboard", "ver_historia_desembolsos", "ver_dashboard_actividad", "ver_dashboard_grafica_retiros", "ver_gestion_usuarios", "inversionistas_crear", "inversionistas_editar", "ver_inversionistas", "ver_notificaciones", "receive_task_notifications", "ver_chat", "ver_comunicacion", "gestionar_retiros", "ver_retiros_admin"],
    "inversionista": ["ver_notificaciones", "receive_investor_notifications", "ver_dashboard", "ver_mis_inversiones", "ver_mis_referidos", "ver_bonos_referidos", "ver_registros_reunion", "ver_calculadora_inversion", "beneficiarios_ver", "beneficiarios_gestionar", "pqr.view", "pqr.create", "crear_inversion_inversionista"],
    "contabilidad_": ["personalizar_dashboard", "ver_dashboard", "ver_dashboard_informacion", "ver_dashboard_metas", "ver_gestion_usuarios", "users.view", "usuarios_crear", "usuarios_editar", "users.edit", "users.create", "inversionistas_crear", "inversionistas_editar", "inversionistas_eliminar", "ver_inversionistas", "crear_desembolso_admin", "crear_desembolso_rapido", "pagos.desembolsos.crear", "pagos.desembolsos.exportar", "pagos.desembolsos.gestionar", "pagos.desembolsos.ver", "reportes.desembolsos", "ver_desembolsos_cliente", "ver_estadisticas_desembolsos", "ver_historia_desembolsos", "ver_notificaciones_aprobar_desembolso", "mensajes_contacto_eliminar", "mensajes_contacto_responder", "ver_chat", "ver_comunicacion", "gestionar_solicitudes_inversion", "gestionar_salas", "gestionar_retiros", "gestionar_movimientos", "reportes.clientes", "reportes.crm", "reportes.exportar", "reportes.inversionistas", "salas.crear", "salas.editar", "reportes.ver", "salas.eliminar", "salas.gestionar", "salas.reservar.crear", "salas.reservar.cancelar_todas", "salas.reservar.cancelar_propia", "salas.ver", "ver_reservas_salas", "ver_solicitudes_inversion", "pagos.retiros.exportar", "pagos.retiros.gestionar", "pagos.retiros.ver", "pagos.ver", "ver_retiros_admin", "inversiones_v2_acceso", "inversiones_v2_aprobar_aumento", "inversiones_v2_corregir_hallazgos", "inversiones_v2_solicitar", "inversiones_v2_solicitar_aumento", "inversiones_v2_ver_solicitudes", "inversiones_v2_ver_billetera", "pqr.create", "pqr.view", "receive_pqr_notifications"]
}

async def restore_roles_permissions():
    async with async_session_maker() as db:
        print("Iniciando restauración de permisos eliminados...")
        
        # Iterar sobre la data de respaldo
        for role_name, backup_perms in BACKUP_ROLES.items():
            stmt = select(Role).where(Role.name == role_name)
            result = await db.execute(stmt)
            role = result.scalar_one_or_none()
            
            if role:
                # Recuperar permisos existentes (por si hay algunos nuevos como los de admin.roles.manage)
                current_perms = role.permissions if isinstance(role.permissions, list) else []
                if isinstance(current_perms, str):
                    try:
                        current_perms = json.loads(current_perms)
                    except:
                        current_perms = []
                
                # Combinar permisos del backup con los actuales sin duplicar
                all_perms = set(current_perms + backup_perms)
                
                # Actualizar el rol
                role.permissions = list(all_perms)
                db.add(role)
                await db.commit()
                print(f"Permisos restaurados para el rol: {role_name}")
            else:
                print(f"Rol no encontrado: {role_name}, se omitió.")
                
        print("¡Restauración completada con éxito!")

if __name__ == "__main__":
    asyncio.run(restore_roles_permissions())
