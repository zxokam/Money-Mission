from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/debug")
def debug():
    import sys
    return {"python_path": sys.path, "cwd": __import__("os").getcwd()}
