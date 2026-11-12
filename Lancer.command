#!/bin/zsh
cd "${0:A:h}"
BASE="$PWD"
RUNTIME="$BASE/../tp-cyber/runtime"
export PATH="$RUNTIME/node_modules/node/bin:$PATH"
export OLLAMA_MODELS="$RUNTIME/ollama-models"
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_NO_CLOUD=1
export LLAMA_ARG_DEVICE=none
export LLAMA_ARG_KV_OFFLOAD=0
mkdir -p reports
if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  "$RUNTIME/ollama/ollama" serve > reports/ollama.log 2>&1 &
  for i in {1..20}; do
    curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break
    sleep 1
  done
fi
exec "$BASE/../tp-cyber/.venv/bin/python" -m streamlit run dashboard/app.py --server.port 8502
