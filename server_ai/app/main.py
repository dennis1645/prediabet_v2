from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend AI Asisten Dr. Predi berbasis Hybrid GraphRAG (Neo4j + ChromaDB) dan vLLM Engine untuk NVIDIA RTX 5070 Ti (16GB VRAM)."
)

# CORS Configuration agar Frontend React (5173) dan Express (5000) bisa terhubung mulus
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {
        "message": "PrediaBeat Hybrid GraphRAG vLLM AI Server is Running",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
