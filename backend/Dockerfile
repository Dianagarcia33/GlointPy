FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar librerías si hace falta
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivo de requerimientos e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente y archivos de migración
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Exponer el puerto
EXPOSE 8000

# Comando para iniciar FastAPI
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
