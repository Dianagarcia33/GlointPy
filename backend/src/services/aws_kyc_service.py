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

def compress_image(image_bytes: bytes) -> bytes:
    """
    Decodifica, valida y comprime la imagen para AWS.
    Eliminamos el auto-recorte por contornos ya que causaba que
    se perdiera texto valioso de la cédula.
    """
    if not image_bytes:
        raise ValueError("El archivo de imagen está vacío.")

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Formato de imagen no soportado o archivo corrupto. Sube una foto en formato JPG o PNG.")
        
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
    is_success, buffer = cv2.imencode(".jpg", img, encode_param)
    return buffer.tobytes() if is_success else image_bytes

def parse_colombian_id_coordinates(blocks) -> dict:
    """
    Analiza los bloques devueltos por Textract usando coordenadas 
    para extraer inteligentemente la información de IDs colombianos.
    """
    extracted = {
        "documento": "",
        "name": "",
        "tipo_documento": "CC",
        "fecha_nacimiento": "",
        "biometrics_passed": True,
        "biometrics_message": "Identidad validada con éxito."
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
                
            # Número de documento (buscamos un número largo, puede tener puntos)
            clean_num = re.sub(r'[A-Za-z:]+', '', text) # Quitar letras como NUMERO o NO.
            clean_num = clean_num.replace(".", "").replace(" ", "").replace(",", "").strip()
            if re.fullmatch(r'\d{6,11}', clean_num) and not extracted['documento']:
                extracted['documento'] = clean_num
                
            # Nombre: Buscamos texto que no tenga números, no sea muy corto y no sea palabra clave
            if not re.search(r'\d', text) and len(text) > 4:
                ignore_words = [
                    "REPUBLICA", "COLOMBIA", "CEDULA", "CIUDADANIA", "IDENTIFICACION", 
                    "NOMBRES", "APELLIDOS", "FIRMA", "FECHA", "NACIMIENTO", "LUGAR", 
                    "ESTATURA", "SANGRE", "SEXO", "INDICE", "DERECHO", "NUMERO", 
                    "REGISTRADURIA", "NACIONAL", "ICA DE", "PUBLICA"
                ]
                if not any(word in text for word in ignore_words):
                    name_lines.append(text)
                    
            # Fecha de Nacimiento (heurística básica para fechas)
            if re.search(r'\d{2} [A-Z]{3} \d{4}', text) or re.search(r'\d{2}/\d{2}/\d{4}', text):
                extracted['fecha_nacimiento'] = text
    
    if name_lines:
        # Filtrar basuras y pedazos de holograma
        valid_names = [n for n in name_lines if len(n) >= 5]
        
        if len(valid_names) >= 2:
            # Tomamos las 2 líneas más largas (que suelen ser los nombres y apellidos reales)
            longest_two = sorted(valid_names, key=len, reverse=True)[:2]
            # Las ordenamos por su aparición original (arriba hacia abajo)
            longest_two.sort(key=lambda x: valid_names.index(x))
            extracted['name'] = " ".join(longest_two).strip()
        elif valid_names:
            extracted['name'] = valid_names[0]
            
    return extracted

def process_kyc_documents(front_bytes: bytes, back_bytes: bytes, selfie_bytes: bytes):
    """
    Procesa las imágenes usando OpenCV, Textract y Rekognition.
    """
    if not settings.AWS_ACCESS_KEY_ID:
        raise ValueError("AWS Credentials no configuradas. Por favor, agregue AWS_ACCESS_KEY_ID en el archivo .env.")

    cropped_front = compress_image(front_bytes)
    
    # 1. OCR (Textract)
    try:
        textract = get_textract_client()
        response = textract.detect_document_text(
            Document={'Bytes': cropped_front}
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
            extracted_data["biometrics_passed"] = False
            extracted_data["biometrics_message"] = "No se detectó una coincidencia facial clara. Requerirá validación manual."
        else:
            similarity = matches[0]['Similarity']
            if similarity < 85.0:
                extracted_data["biometrics_passed"] = False
                extracted_data["biometrics_message"] = f"Similitud facial baja ({similarity:.2f}%). Requerirá validación manual."
            
    except Exception as e:
        print(f"Error Rekognition: {e}")
        extracted_data["biometrics_passed"] = False
        extracted_data["biometrics_message"] = "No se pudo procesar la biometría automáticamente. Requerirá validación manual."
        
    return extracted_data
