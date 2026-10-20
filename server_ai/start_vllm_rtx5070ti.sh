#!/bin/bash
# ==============================================================================
# PrediaBeat: vLLM Server Launcher (NVIDIA RTX 5070 Ti 16GB VRAM on WSL / Linux)
# ==============================================================================
# Model: Qwen/Qwen2.5-7B-Instruct-GPTQ-Int8
# Port: 8000
# GPU Memory Utilization: 0.85 (~13.6 GB allocated out of 16 GB)
# Max Model Len: 4096 tokens
# ==============================================================================

set -e

MODEL_NAME="Qwen/Qwen2.5-7B-Instruct-GPTQ-Int8"
PORT=8000
GPU_UTIL=0.85
MAX_LEN=4096

echo "=============================================================================="
echo "🏥 PREDIABEAT: MELUNCURKAN vLLM ENGINE (RTX 5070 Ti 16GB)"
echo "▶ Target Model         : $MODEL_NAME"
echo "▶ Port                 : $PORT"
echo "▶ GPU Memory Util      : $GPU_UTIL (13.6 GB / 16.0 GB VRAM)"
echo "▶ Max Context Length   : $MAX_LEN tokens"
echo "=============================================================================="

if command -v nvidia-smi &> /dev/null; then
    echo "• Status Hardware GPU:"
    nvidia-smi --query-gpu=index,name,memory.total,temperature.gpu --format=csv,noheader
fi

python3 -m vllm.entrypoints.openai.api_server \
    --model "$MODEL_NAME" \
    --port $PORT \
    --gpu-memory-utilization $GPU_UTIL \
    --max-model-len $MAX_LEN \
    --dtype auto \
    --trust-remote-code
