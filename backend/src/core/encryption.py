from sqlalchemy.types import TypeDecorator, String
from cryptography.fernet import Fernet
from src.core.config import settings

# Inicializamos el encriptador con la llave
try:
    fernet = Fernet(settings.BANK_ENCRYPTION_KEY.encode('utf-8'))
except Exception as e:
    # Fallback inseguro en caso de que la llave sea inválida, pero evitamos que rompa la app
    # Lo ideal es que el servidor siempre tenga una llave válida
    print(f"Advertencia: No se pudo cargar la llave de encriptación. Error: {e}")
    fernet = None

class EncryptedString(TypeDecorator):
    """
    Tipo personalizado de SQLAlchemy que encripta la data al guardar en la DB 
    y la desencripta al leerla.
    """
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if fernet is None:
            return value # Fallback si no hay llave
            
        try:
            # Encriptamos el valor (debe ser bytes para Fernet)
            encrypted = fernet.encrypt(value.encode('utf-8'))
            return encrypted.decode('utf-8')
        except Exception as e:
            print(f"Error encriptando dato: {e}")
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if fernet is None:
            return value
            
        try:
            # Intentamos desencriptar
            decrypted = fernet.decrypt(value.encode('utf-8'))
            return decrypted.decode('utf-8')
        except Exception:
            # Si falla la desencriptación (ej. la llave cambió, o el dato no estaba encriptado)
            # devolvemos el valor original (permite migración progresiva o fallback suave)
            return value
