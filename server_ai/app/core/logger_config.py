import os
import logging
from logging.handlers import RotatingFileHandler

# Direktori log global: /app/logs (di Docker) atau server_ai/logs / root logs (lokal)
# Cari root prediabeat_app jika ada, atau buat di server_ai/../logs
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) # app/core
SERVER_AI_DIR = os.path.dirname(CURRENT_DIR)             # app
ROOT_AI_DIR = os.path.dirname(SERVER_AI_DIR)             # server_ai

# Prioritas lokasi folder logs:
# 1. Environment variable LOG_DIR jika ada
# 2. /app/logs jika berjalan di Docker
# 3. ROOT_AI_DIR/logs (server_ai/logs) dan simlink/duplikat ke root logs bila memungkinkan
LOG_DIR = os.getenv("LOG_DIR")
if not LOG_DIR:
    if os.path.exists("/app") and os.path.isdir("/app"):
        LOG_DIR = "/app/logs"
    else:
        # Menempatkan di root project ../logs jika ada, atau server_ai/logs
        parent_dir = os.path.dirname(ROOT_AI_DIR)
        potential_root_log = os.path.join(parent_dir, "logs")
        if os.path.exists(os.path.join(parent_dir, "docker-compose.yml")):
            LOG_DIR = potential_root_log
        else:
            LOG_DIR = os.path.join(ROOT_AI_DIR, "logs")

os.makedirs(LOG_DIR, exist_ok=True)

# Format log terstandarisasi dengan timestamp detail
LOG_FORMAT = logging.Formatter(
    fmt="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

def _setup_logger(name: str, log_filename: str, level=logging.INFO) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False  # Jangan double print jika root logger aktif

    log_path = os.path.join(LOG_DIR, log_filename)
    
    # 5MB per file, simpan hingga 5 backup
    file_handler = RotatingFileHandler(
        log_path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(LOG_FORMAT)
    file_handler.setLevel(level)

    # Console handler juga agar docker logs tetap menampilkan output
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(LOG_FORMAT)
    console_handler.setLevel(level)

    # Bersihkan handler lama jika file ini di-reload uvicorn
    if not logger.handlers:
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger

# Tiga logger terpisah sesuai instruksi pengguna:
neo4j_logger = _setup_logger("neo4j", "neo4j.log", logging.DEBUG)
rag_logger = _setup_logger("rag", "rag.log", logging.DEBUG)
vllm_logger = _setup_logger("vllm", "vllm.log", logging.DEBUG)

# Log inisialisasi awal saat server AI boot
neo4j_logger.info("=== NEO4J LOGGER INITIALIZED (Target File: %s/neo4j.log) ===", LOG_DIR)
rag_logger.info("=== HYBRID GRAPHRAG LOGGER INITIALIZED (Target File: %s/rag.log) ===", LOG_DIR)
vllm_logger.info("=== VLLM INFERENCE LOGGER INITIALIZED (Target File: %s/vllm.log) ===", LOG_DIR)
