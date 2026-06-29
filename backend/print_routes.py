import sys; sys.path.append("backend"); from src.main import app; print([r.path for r in app.routes])
