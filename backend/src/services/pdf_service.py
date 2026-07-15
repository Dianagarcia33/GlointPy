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
        
        # Título
        elements.append(Paragraph("Comprobante de Retiro", styles['CenterTitle']))
        elements.append(Paragraph("Gloint - Gestión de Pagos", styles['Normal']))
        elements.append(Spacer(1, 0.5 * inch))
        
        # Datos del retiro
        data = [
            ["ID del Retiro", str(withdrawal.id)],
            ["Usuario", user_name],
            ["Fecha de Consulta", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
            ["Monto Bruto", f"${withdrawal.monto:,.2f} COP"],
            ["Impuestos / Deducciones", f"${withdrawal.impuesto:,.2f} COP"],
            ["Monto Neto Pagado", f"${withdrawal.monto_neto:,.2f} COP"],
            ["Origen", str(withdrawal.origen)],
            ["Estado", str(withdrawal.estado).upper()],
            ["Método de Pago", str(withdrawal.metodo_pago or "N/A")],
            ["Banco", str(withdrawal.banco or "N/A")],
            ["Tipo de Cuenta", str(withdrawal.tipo_cuenta or "N/A")],
            ["Número de Cuenta", str(withdrawal.numero_cuenta or "N/A")]
        ]
        
        t = Table(data, colWidths=[2 * inch, 4 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(t)
        
        # Disclaimer
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(Paragraph("Este comprobante es generado dinámicamente por el sistema a partir de los datos históricos del retiro.", styles['Normal']))
        
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
