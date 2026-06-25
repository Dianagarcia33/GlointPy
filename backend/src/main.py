from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Gloint V2 API")

# Configuración de CORS (Permite que el frontend en Vite haga peticiones)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "¡Bienvenido a la API de Gloint V2 (Clean Architecture)!"}

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "message": "El backend está funcionando correctamente."}
