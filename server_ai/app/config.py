import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "PrediaBeat Hybrid GraphRAG AI Server"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # vLLM Configuration (RTX 5070 Ti 16GB VRAM)
    MODEL_ID: str = os.getenv("MODEL_ID", "Qwen/Qwen2.5-7B-Instruct-GPTQ-Int8")
    VLLM_API_BASE: str = os.getenv("VLLM_API_BASE", "http://localhost:8000/v1")
    VLLM_API_KEY: str = os.getenv("VLLM_API_KEY", "EMPTY")
    VLLM_GPU_MEMORY_UTILIZATION: float = 0.85  # ~13.6 GB allocated out of 16 GB
    VLLM_MAX_MODEL_LEN: int = 4096
    VLLM_DTYPE: str = "auto"
    VLLM_TEMPERATURE: float = 0.6
    VLLM_TOP_P: float = 0.9
    VLLM_MAX_TOKENS: int = 1536

    # Neo4j Enterprise / Community Graph Database
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "prediabeat2026")
    NEO4J_DATABASE: str = os.getenv("NEO4J_DATABASE", "neo4j")

    # Express.js Backend URL (Data Source for Isolated User Medical Context)
    EXPRESS_BACKEND_URL: str = os.getenv("EXPRESS_BACKEND_URL", "http://localhost:5000/api")

    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    KNOWLEDGE_BASE_DIR: str = os.path.join(BASE_DIR, "knowledge_base")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
