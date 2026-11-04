import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.api.routes import router
from app.core.neo4j_manager import neo4j_manager

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

# Static Files Mounting untuk Food Images dari Knowledge Base Baru
food_images_dir = os.path.join(settings.KNOWLEDGE_BASE_DIR, "food_images")
if os.path.exists(food_images_dir):
    app.mount("/food-images", StaticFiles(directory=food_images_dir), name="food-images")

app.include_router(router)

@app.on_event("startup")
async def startup_event():
    """
    Background worker untuk menghubungkan Neo4j begitu container Neo4j selesai inisialisasi.
    Mengatasi jeda boot 3-10 detik JVM Neo4j tanpa memblokir kesiapan server AI.
    """
    async def _reconnect_neo4j():
        for _ in range(20):
            if neo4j_manager.driver is not None:
                break
            await asyncio.sleep(2)
            try:
                neo4j_manager._connect()
                if neo4j_manager.driver is not None:
                    break
            except Exception:
                pass
    asyncio.create_task(_reconnect_neo4j())

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
