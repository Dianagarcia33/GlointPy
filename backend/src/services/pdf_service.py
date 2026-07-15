import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

class PDFService:
    @staticmethod
    def _build_elements(withdrawal, user_name: str, styles):
        elements = []
        
        # Traducir estados a español
        estado_str = str(withdrawal.estado.value).lower() if hasattr(withdrawal.estado, 'value') else str(withdrawal.estado).lower()
        estado_map = {
            "pending": "PENDIENTE",
            "approved": "APROBADO",
            "rejected": "RECHAZADO",
            "processed": "PROCESADO"
        }
        estado_str = estado_map.get(estado_str, estado_str.upper())

        tipo_str = str(withdrawal.tipo.value).lower() if hasattr(withdrawal.tipo, 'value') else str(withdrawal.tipo).lower()
        tipo_map = {
            "rendimiento": "Rendimiento",
            "capital": "Capital",
            "bono": "Bono"
        }
        tipo_str = tipo_map.get(tipo_str, tipo_str.capitalize())
        
        # Título
        title_style = ParagraphStyle(name='CenterTitle', alignment=1, fontSize=22, spaceAfter=10, fontName="Helvetica-Bold", textColor=colors.HexColor('#0f172a'))
        subtitle_style = ParagraphStyle(name='SubTitle', alignment=1, fontSize=12, spaceAfter=30, textColor=colors.HexColor('#475569'))
        
        elements.append(Paragraph("COMPROBANTE DE PAGO", title_style))
        elements.append(Paragraph("GLOINT - Ecosistema Empresarial", subtitle_style))
        
        # Fechas (usamos la fecha de aprobación si existe, si no, la fecha actual)
        fecha_texto = withdrawal.fecha_aprobacion.strftime("%Y-%m-%d %H:%M:%S") if withdrawal.fecha_aprobacion else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Datos del retiro
        data = [
            ["ID de Transacción", f"#{withdrawal.id}"],
            ["Beneficiario", user_name],
            ["Fecha de Pago", fecha_texto],
            ["Concepto", tipo_str],
            ["Monto Bruto", f"${withdrawal.monto:,.2f} COP"],
            ["Impuestos / Deducciones", f"${withdrawal.impuesto:,.2f} COP"],
            ["Monto Neto Transferido", f"${withdrawal.monto_neto:,.2f} COP"],
            ["Estado del Pago", estado_str],
            ["Origen de Fondos", str(withdrawal.origen).capitalize()],
            ["Método de Pago", str(withdrawal.metodo_pago or "Transferencia Bancaria")],
            ["Banco de Destino", str(withdrawal.banco or "N/A")],
            ["Tipo de Cuenta", str(withdrawal.tipo_cuenta or "N/A")],
            ["Número de Cuenta", str(withdrawal.numero_cuenta or "N/A")]
        ]
        
        t = Table(data, colWidths=[2.5 * inch, 3.5 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#334155')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#0f172a')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(t)
        
        # Disclaimer
        elements.append(Spacer(1, 0.6 * inch))
        disclaimer_style = ParagraphStyle(name='Disclaimer', fontSize=9, textColor=colors.HexColor('#94a3b8'), alignment=1)
        elements.append(Paragraph("Este comprobante es un documento generado de forma electrónica por el sistema GLOINT tras la verificación y procesamiento del retiro por parte del área financiera.", disclaimer_style))
        
        return elements

    @staticmethod
    def generate_withdrawal_receipt(withdrawal, user_name: str) -> str:
        """
        Genera un comprobante en PDF para un retiro aprobado y devuelve la ruta relativa del archivo.
        (Mantenido por compatibilidad si aún se quiere guardar en disco).
        """
        uploads_dir = os.path.join(os.getcwd(), 'uploads', 'receipts')
        os.makedirs(uploads_dir, exist_ok=True)
        
        filename = f"receipt_withdrawal_{withdrawal.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        filepath = os.path.join(uploads_dir, filename)
        relative_path = f"uploads/receipts/{filename}"
        
        doc = SimpleDocTemplate(filepath, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='CenterTitle', alignment=1, fontSize=18, spaceAfter=20, fontName="Helvetica-Bold"))
        
        elements = PDFService._build_elements(withdrawal, user_name, styles)
        doc.build(elements)
        
        return relative_path

    @staticmethod
    def generate_withdrawal_receipt_bytes(withdrawal, user_name: str) -> io.BytesIO:
        """
        Genera un comprobante en PDF y lo devuelve como un flujo de bytes en memoria (ideal para servir directamente).
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='CenterTitle', alignment=1, fontSize=18, spaceAfter=20, fontName="Helvetica-Bold"))
        
        elements = PDFService._build_elements(withdrawal, user_name, styles)
        doc.build(elements)
        
        buffer.seek(0)
        return buffer
