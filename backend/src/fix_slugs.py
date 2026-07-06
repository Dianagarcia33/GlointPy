import asyncio
import json
from sqlalchemy import text
from src.core.database import async_session_maker

async def fix_permissions_and_roles():
    async with async_session_maker() as db:
        print("🛠️  Iniciando corrección de slugs en la base de datos...")
        
        # 1. Corregir la tabla permissions
        print("\n1️⃣  Corrigiendo slugs en la tabla 'permissions'...")
        await db.execute(text("UPDATE permissions SET slug = 'ver_mis_inversiones' WHERE slug = '' OR name = 'ver_mis_inversiones'"))
        await db.execute(text("UPDATE permissions SET slug = 'wallets:view' WHERE slug = 'wallets-view'"))
        await db.commit()
        print("✅ Slugs corregidos en la tabla permissions.")

        # 2. Actualizar los arreglos JSON en la tabla roles
        print("\n2️⃣  Corrigiendo los permisos cacheados en la tabla 'roles'...")
        result = await db.execute(text("SELECT id, permissions FROM roles"))
        roles = result.fetchall()
        
        for r_id, perms_json in roles:
            if not perms_json:
                continue
                
            try:
                # Dependiendo del driver, perms_json podría ya ser un dict/list o un string
                if isinstance(perms_json, str):
                    perms_list = json.loads(perms_json)
                else:
                    perms_list = perms_json
                    
                if not isinstance(perms_list, list):
                    continue
                    
                needs_update = False
                new_perms = []
                for p in perms_list:
                    if p == "":
                        new_perms.append("ver_mis_inversiones")
                        needs_update = True
                    elif p == "wallets-view":
                        new_perms.append("wallets:view")
                        needs_update = True
                    else:
                        new_perms.append(p)
                
                # Quitar duplicados por si acaso
                new_perms = list(dict.fromkeys(new_perms))
                
                if needs_update:
                    await db.execute(
                        text("UPDATE roles SET permissions = :new_perms WHERE id = :r_id"),
                        {"new_perms": json.dumps(new_perms), "r_id": r_id}
                    )
                    print(f"✅ Rol ID {r_id} actualizado exitosamente: {new_perms}")
            except Exception as e:
                print(f"Error procesando el rol ID {r_id}: {e}")
                
        await db.commit()
        print("\n🎉 ¡Mantenimiento completado! Por favor cierra sesión y vuelve a iniciar.")

if __name__ == "__main__":
    asyncio.run(fix_permissions_and_roles())
