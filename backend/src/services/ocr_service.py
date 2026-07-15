import boto3
import re
from typing import Dict
from src.core.config import settings

class OCRService:
    def __init__(self):
        # Inicializa cliente de Rekognition. Si las credenciales están en config, las usa.
        # De lo contrario usa el rol de IAM (útil en EC2/ECS).
        kwargs = {"region_name": settings.AWS_REGION}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            
        self.client = boto3.client('rekognition', **kwargs)

    def extract_colombian_id_data(self, image_bytes: bytes) -> Dict[str, str]:
        """
        Analiza una imagen usando AWS Rekognition y extrae heurísticamente
        el nombre completo y número de cédula de un documento colombiano.
        """
        try:
            response = self.client.detect_text(Image={'Bytes': image_bytes})
        except Exception as e:
            print(f"[OCR ERROR] {e}")
            return {"document_number": "", "full_name": ""}
            
        text_detections = response.get('TextDetections', [])
        
        # Filtramos solo por 'LINE' para mantener el agrupamiento de lectura
        lines = [d['DetectedText'].strip() for d in text_detections if d['Type'] == 'LINE']
        
        document_number = ""
        names = ""
        surnames = ""
        
        for i, line in enumerate(lines):
            text_upper = line.upper()
            
            # Buscar Apellidos (Heurística: Cédula Holograma y Digital)
            if "APELLIDO" in text_upper:
                if i + 1 < len(lines) and not self._is_keyword(lines[i+1]):
                    surnames = lines[i+1].strip()
                    # A veces el segundo apellido baja a la siguiente línea
                    if i + 2 < len(lines) and not self._is_keyword(lines[i+2]) and len(lines[i+2]) > 2:
                        surnames += " " + lines[i+2].strip()
                        
            # Buscar Nombres
            if "NOMBRE" in text_upper:
                if i + 1 < len(lines) and not self._is_keyword(lines[i+1]):
                    names = lines[i+1].strip()
                    if i + 2 < len(lines) and not self._is_keyword(lines[i+2]) and len(lines[i+2]) > 2 and not surnames:
                        names += " " + lines[i+2].strip()

            # Buscar Número de Documento (8 a 10 dígitos, con o sin puntos)
            # Regex: busca patrones como 1.123.456.789 o 1000123456
            num_match = re.search(r'\b\d{1,3}(?:\.\d{3}){2,3}\b|\b\d{8,11}\b', text_upper)
            if num_match:
                clean_num = num_match.group().replace('.', '')
                # Damos prioridad si vemos la palabra NUMERO, o si no hemos encontrado nada aún
                if "NUMERO" in text_upper or "NÚMERO" in text_upper or "CC" in text_upper or not document_number:
                    if len(clean_num) >= 8:
                        document_number = clean_num

        full_name = ""
        if names or surnames:
            full_name = f"{names} {surnames}".strip()
            # Limpieza básica de caracteres extraños que el OCR haya malinterpretado
            full_name = re.sub(r'[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]', '', full_name).strip()

        return {
            "document_number": document_number,
            "full_name": full_name
        }
        
    def _is_keyword(self, text: str) -> bool:
        """
        Determina si una línea es un título/etiqueta de la cédula en lugar de un valor.
        """
        keywords = [
            "APELLIDO", "NOMBRE", "NUMERO", "NÚMERO", "FIRMA", "FECHA", 
            "ESTATURA", "SEXO", "REPUBLICA", "COLOMBIA", "CEDULA", 
            "CÉDULA", "CIUDADANIA", "NACIMIENTO", "EXPEDICION", "G.S"
        ]
        text_upper = text.upper()
        return any(k in text_upper for k in keywords)

ocr_service = OCRService()
