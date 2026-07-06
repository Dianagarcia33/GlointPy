import boto3
import cv2
import numpy as np
import re
from src.core.config import settings

def get_textract_client():
    return boto3.client(
        'textract',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

def get_rekognition_client():
    return boto3.client(
        'rekognition',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

def crop_document(image_bytes: bytes) -> bytes:
    """
    Usa OpenCV para encontrar el contorno más grande (el documento)
    y recortar la imagen a sus bordes exactos.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return image_bytes
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return image_bytes
        
    largest_contour = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest_contour)
    
    pad = 5
    y1 = max(0, y - pad)
    y2 = min(img.shape[0], y + h + pad)
    x1 = max(0, x - pad)
    x2 = min(img.shape[1], x + w + pad)
    
    cropped = img[y1:y2, x1:x2]
    
    is_success, buffer = cv2.imencode(".jpg", cropped)
    if is_success:
        return buffer.tobytes()
    return image_bytes

def parse_colombian_id_coordinates(blocks) -> dict:
    """
    Analiza los bloques devueltos por Textract usando coordenadas 
    para extraer inteligentemente la información de IDs colombianos.
    """
    extracted = {
        "documento": "",
        "name": "",
        "tipo_documento": "CC",
        "fecha_nacimiento": ""
    }
    
    name_lines = []
    
    for block in blocks:
        if block['BlockType'] == 'LINE':
            text = block.get('Text', '').strip().upper()
            box = block.get('Geometry', {}).get('BoundingBox', {})
            top = box.get('Top', 0)
            
            # Clasificación de documento
            if 'PERMISO' in text or 'PPT' in text or 'PROTECCION TEMPORAL' in text:
                extracted['tipo_documento'] = 'PPT'
            elif 'EXTRANJERIA' in text or 'EXTRANJERÍA' in text:
                extracted['tipo_documento'] = 'CE'
                
            # Número de documento (buscamos un número largo aislado)
            numbers = re.findall(r'\b\d{6,10}\b', text)
            if numbers and not extracted['documento'] and top > 0.1:
                # Evitar que tome números de la parte superior del encabezado
                extracted['documento'] = numbers[0]
                
            # Nombre: Usualmente está en el tercio medio superior (0.2 a 0.6)
            if 0.2 < top < 0.6 and not re.search(r'\d', text) and len(text) > 3:
                ignore_words = ["REPUBLICA DE COLOMBIA", "CEDULA DE CIUDADANIA", "IDENTIFICACION", "NOMBRES", "APELLIDOS", "FIRMA"]
                if not any(word in text for word in ignore_words):
                    name_lines.append(text)
                    
            # Fecha de Nacimiento (heurística básica para fechas)
            if re.search(r'\d{2} [A-Z]{3} \d{4}', text):
                extracted['fecha_nacimiento'] = text
    
    if name_lines:
        # Los dos primeros suelen ser apellidos y luego nombres en la cédula amarilla
        extracted['name'] = " ".join(name_lines[:2]).strip()
        
    return extracted

def process_kyc_documents(front_bytes: bytes, back_bytes: bytes, selfie_bytes: bytes):
    """
    Procesa las imágenes usando OpenCV, Textract y Rekognition.
    """
    if not settings.AWS_ACCESS_KEY_ID:
        raise ValueError("AWS Credentials no configuradas. Por favor, agregue AWS_ACCESS_KEY_ID en el archivo .env.")

    cropped_front = crop_document(front_bytes)
    
    # 1. OCR (Textract)
    try:
        textract = get_textract_client()
        response = textract.analyze_document(
            Document={'Bytes': cropped_front},
            FeatureTypes=[]
        )
        extracted_data = parse_colombian_id_coordinates(response.get('Blocks', []))
    except Exception as e:
        print(f"Error OCR: {e}")
        raise ValueError(f"Error procesando documento (Textract): {str(e)}")

    # 2. Biometría (Rekognition)
    try:
        rekognition = get_rekognition_client()
        rek_response = rekognition.compare_faces(
            SourceImage={'Bytes': cropped_front},
            TargetImage={'Bytes': selfie_bytes},
            SimilarityThreshold=85.0
        )
        
        matches = rek_response.get('FaceMatches', [])
        if not matches:
            raise ValueError("No se detectó el mismo rostro en el documento y en la selfie.")
            
        similarity = matches[0]['Similarity']
        if similarity < 85.0:
            raise ValueError(f"Similitud facial insuficiente ({similarity:.2f}%).")
            
    except Exception as e:
        if "No se detectó el mismo rostro" in str(e) or "Similitud facial" in str(e):
            raise
        print(f"Error Rekognition: {e}")
        raise ValueError(f"Error de biometría (Rekognition): {str(e)}")
        
    return extracted_data
