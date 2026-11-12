#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Node.js 22+ requis")'
command -v ollama >/dev/null || { echo 'Installer Ollama depuis https://ollama.com/ puis relancer.'; exit 1; }
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
curl -fsS http://127.0.0.1:11434/api/tags >/dev/null || { echo 'Démarrer ollama serve dans un autre terminal puis relancer.'; exit 1; }
ollama pull qwen3:0.6b
ollama create arms-qwen3 -f Modelfile
npm run lab
printf '%s\n' 'Installation prête. npm run agents ; .venv/bin/streamlit run dashboard/app.py --server.port 8502'
