# ==============================================================================
# PrediaBeat Server AI: Hybrid GraphRAG + FastAPI (vLLM Client)
# ==============================================================================
FROM python:3.11-slim

WORKDIR /app

# Install system utilities and build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Setup virtual environment as requested
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip inside venv
RUN pip install --no-cache-dir --upgrade pip

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code, clinical knowledge base, and scripts
COPY app/ ./app/
COPY knowledge_base/ ./knowledge_base/
COPY scripts/ ./scripts/

ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
