#!/usr/bin/env bash
# Start web UIs for interactive demo (run each in separate terminal or background)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/.venv/bin/activate"
source ~/.nvm/nvm.sh && nvm use 20

echo "Starting services..."
echo "  Kinvastu (Vastu+Astro):  http://localhost:8501"
echo "  VastuFlow:                 http://localhost:3000"
echo "  Jyotish Dashboard:         http://localhost:5001"
echo ""

cd "$ROOT/tools/kinvastu" && streamlit run streamlit_app.py --server.headless true --server.port 8501 &
KIN=$!

cd "$ROOT/tools/Vastuflow/vastuflow-app" && npm run start -- -p 3000 &
VF=$!

cd "$ROOT/tools/jyotish-dashboard" && export FLASK_APP=run.py && python run.py &
JY=$!

trap 'kill $KIN $VF $JY 2>/dev/null' EXIT
echo "Press Ctrl+C to stop all services."
wait
