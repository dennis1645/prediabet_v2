@echo off
echo ==============================================================================
echo 🚀 Menjalankan Server AI PrediaBeat (FastAPI + Hybrid GraphRAG)
echo ==============================================================================
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
