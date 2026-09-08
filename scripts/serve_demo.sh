#!/usr/bin/env bash
# Serve demo over HTTP (required for viewer, videos, GLB — file:// blocks fetch/CORS)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-8765}"
cd "$ROOT"
source .venv/bin/activate 2>/dev/null || true
python scripts/build_viewer_bundle.py
python scripts/build_floorplan_bundle.py
echo ""
echo "🕉️  CAD Demo Server"
echo "   Gallery:      http://localhost:$PORT/demo/index.html"
echo "   Floor Plan:   http://localhost:$PORT/demo/floor-plan-viewer/index.html"
echo "   3D Viewer:    http://localhost:$PORT/demo/viewer/index.html"
echo ""
echo "Press Ctrl+C to stop."
exec python3 -m http.server "$PORT" --directory "$ROOT"
