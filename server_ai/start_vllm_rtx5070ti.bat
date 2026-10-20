@echo off
REM ==============================================================================
REM PrediaBeat: vLLM Server Launcher (NVIDIA RTX 5070 Ti 16GB VRAM)
REM ==============================================================================
REM Model: Qwen/Qwen2.5-7B-Instruct-GPTQ-Int8 (or AWQ 4-bit)
REM Port: 8000
REM GPU Memory Utilization: 0.85 (13.6 GB allocated, 2.4 GB buffer for system)
REM Max Context Length: 4096 tokens
REM ==============================================================================

echo ==============================================================================
echo 🏥 PREDIABEAT: MENJALANKAN vLLM INFERENCE ENGINE (RTX 5070 Ti 16GB)
echo ==============================================================================

python -m vllm.entrypoints.openai.api_server ^
    --model Qwen/Qwen2.5-7B-Instruct-GPTQ-Int8 ^
    --port 8000 ^
    --gpu-memory-utilization 0.85 ^
    --max-model-len 4096 ^
    --dtype auto ^
    --trust-remote-code

pause
