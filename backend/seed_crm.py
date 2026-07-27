import sys
import os
import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.future import select, and_

# Asegurar que el PATH incluya la raíz para importaciones de 'src'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from src.core.database import async_session_maker
    from src.models.crm import CRMProject, CRMLead, CRMActivity, CRMProjectStatus, CRMLeadStage, CRMActivityType
    from src.models.user import User
except ModuleNotFoundError:
    from core.database import async_session_maker
    from models.crm import CRMProject, CRMLead, CRMActivity, CRMProjectStatus, CRMLeadStage, CRMActivityType
    from models.user import User

async def seed_crm():
    print("🌱 Sembrando datos de prueba para el módulo CRM...")
    
    async with async_session_maker() as db:
        # Obtener un usuario comercial o admin por defecto para asignar
        user_res = await db.execute(select(User).limit(1))
        default_user = user_res.scalars().first()
        user_id = default_user.id if default_user else 1

        # 1. Proyectos de Prueba
        projects_data = [
            {
                "code": "PROJ-2026-01",
                "name": "Torre Gloint Tech Vistamar",
                "description": "Desarrollo de apartamentos inteligentes y suites ejecutivas con rentabilidad asegurada.",
                "target_amount": Decimal("600000000.00"),
                "status": CRMProjectStatus.ACTIVO,
                "start_date": datetime.utcnow() - timedelta(days=30),
                "end_date": datetime.utcnow() + timedelta(days=180)
            },
            {
                "code": "PROJ-2026-02",
                "name": "Fondo Inmobiliario Vistas del Sol II",
                "description": "Loteamiento campestre de alta valorización en zona de desarrollo turístico.",
                "target_amount": Decimal("850000000.00"),
                "status": CRMProjectStatus.ACTIVO,
                "start_date": datetime.utcnow() - timedelta(days=15),
                "end_date": datetime.utcnow() + timedelta(days=240)
            },
            {
                "code": "PROJ-2026-03",
                "name": "EcoResort Selva Verde",
                "description": "Cabañas ecológicas financiadas mediante participación accionaria directa.",
                "target_amount": Decimal("400000000.00"),
                "status": CRMProjectStatus.ACTIVO,
                "start_date": datetime.utcnow() - timedelta(days=45),
                "end_date": datetime.utcnow() + timedelta(days=120)
            }
        ]

        created_projects = []
        for p_data in projects_data:
            existing_p = await db.execute(select(CRMProject).where(CRMProject.code == p_data["code"]))
            p_obj = existing_p.scalars().first()
            if not p_obj:
                p_obj = CRMProject(**p_data)
                db.add(p_obj)
                await db.commit()
                await db.refresh(p_obj)
                print(f"  ✅ Proyecto creado: {p_obj.code} - {p_obj.name}")
            created_projects.append(p_obj)

        if not created_projects:
            print("⚠️ No se pudieron cargar los proyectos.")
            return

        proj1 = created_projects[0]
        proj2 = created_projects[1] if len(created_projects) > 1 else created_projects[0]

        # 2. Leads / Prospectos de prueba
        leads_data = [
            {
                "project_id": proj1.id,
                "name": "Carlos Eduardo Mendoza",
                "email": "carlos.mendoza@gmail.com",
                "phone": "+57 300 456 7890",
                "document_id": "1098765432",
                "estimated_amount": Decimal("50000000.00"),
                "stage": CRMLeadStage.LEAD_ENTRANTE,
                "source": "Web",
                "commercial_id": user_id
            },
            {
                "project_id": proj1.id,
                "name": "Ana María Gutiérrez",
                "email": "ana.gutierrez@outlook.com",
                "phone": "+57 311 234 5678",
                "document_id": "1012345678",
                "estimated_amount": Decimal("80000000.00"),
                "stage": CRMLeadStage.CONTACTADO,
                "source": "Referido",
                "commercial_id": user_id
            },
            {
                "project_id": proj1.id,
                "name": "Roberto Silva Ruiz",
                "email": "rsilva@empresa.co",
                "phone": "+57 320 987 6543",
                "document_id": "1023456789",
                "estimated_amount": Decimal("120000000.00"),
                "stage": CRMLeadStage.CITA_PRESENTACION,
                "source": "Evento",
                "commercial_id": user_id
            },
            {
                "project_id": proj1.id,
                "name": "Valentina López Bermúdez",
                "email": "valentina.lopez@yahoo.com",
                "phone": "+57 315 345 6789",
                "document_id": "1034567890",
                "estimated_amount": Decimal("150000000.00"),
                "stage": CRMLeadStage.NEGOCIACION,
                "source": "Directo",
                "commercial_id": user_id
            },
            {
                "project_id": proj1.id,
                "name": "Juan Pablo Morales",
                "email": "jpmorales@inversiones.com",
                "phone": "+57 301 654 9870",
                "document_id": "1045678901",
                "estimated_amount": Decimal("200000000.00"),
                "stage": CRMLeadStage.CIERRE_GANADO,
                "source": "Referido",
                "commercial_id": user_id
            },
            {
                "project_id": proj2.id,
                "name": "Betzy Patricia Gómez",
                "email": "betzy.gomez@gmail.com",
                "phone": "+57 318 765 4321",
                "document_id": "1056789012",
                "estimated_amount": Decimal("100000000.00"),
                "stage": CRMLeadStage.CIERRE_GANADO,
                "source": "Directo",
                "commercial_id": user_id
            },
            {
                "project_id": proj2.id,
                "name": "Jorge Iván Torres",
                "email": "jorge.torres@hotmail.com",
                "phone": "+57 314 890 1234",
                "document_id": "1067890123",
                "estimated_amount": Decimal("60000000.00"),
                "stage": CRMLeadStage.PERDIDO,
                "source": "Web",
                "commercial_id": user_id,
                "loss_reason": "Prefirió opción de menor plazo"
            }
        ]

        created_leads = []
        for l_data in leads_data:
            existing_l = await db.execute(
                select(CRMLead).where(
                    and_(CRMLead.name == l_data["name"], CRMLead.project_id == l_data["project_id"])
                )
            )
            l_obj = existing_l.scalars().first()
            if not l_obj:
                l_obj = CRMLead(**l_data)
                db.add(l_obj)
                await db.commit()
                await db.refresh(l_obj)
                print(f"  👤 Prospecto creado: {l_obj.name} (Etapa: {l_obj.stage})")
            created_leads.append(l_obj)

        # 3. Actividades de prueba para los leads
        if created_leads:
            lead1 = created_leads[0]
            activities_data = [
                {
                    "lead_id": lead1.id,
                    "user_id": user_id,
                    "type": CRMActivityType.NOTA,
                    "title": "Registro inicial de formulario web",
                    "description": "El cliente solicitó dossier digital del proyecto por WhatsApp."
                },
                {
                    "lead_id": lead1.id,
                    "user_id": user_id,
                    "type": CRMActivityType.LLAMADA,
                    "title": "Llamada de presentación preliminar",
                    "description": "Se explicaron los rendimientos del proyecto. Muestra interés por paquete de 50M."
                },
                {
                    "lead_id": lead1.id,
                    "user_id": user_id,
                    "type": CRMActivityType.TAREA,
                    "title": "Enviar propuesta personalizada",
                    "description": "Adjuntar simulación de rendimientos a 36 meses.",
                    "due_date": datetime.utcnow() + timedelta(days=2)
                }
            ]

            for a_data in activities_data:
                existing_a = await db.execute(
                    select(CRMActivity).where(
                        and_(CRMActivity.lead_id == a_data["lead_id"], CRMActivity.title == a_data["title"])
                    )
                )
                if not existing_a.scalars().first():
                    a_obj = CRMActivity(**a_data)
                    db.add(a_obj)
                    await db.commit()
                    print(f"  📌 Actividad creada: {a_obj.title}")

        print("✨ ¡Seeder de CRM ejecutado con éxito!")

if __name__ == "__main__":
    asyncio.run(seed_crm())
