#!/usr/bin/env bash
# Install FOSS property design stack on macOS
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> 1/4 Homebrew apps (2D/3D/render)"
brew install --cask sweet-home3d freecad blender inkscape krita 2>/dev/null || true
# LibreCAD optional (deprecated cask); FreeCAD Draft covers 2D

echo "==> 2/4 Clone tools (if missing)"
mkdir -p tools
for repo in \
  "https://github.com/kentang2017/kinvastu.git|kinvastu" \
  "https://github.com/Nirmit-Angane/Vastuflow.git|Vastuflow" \
  "https://github.com/Aerofarmer/jyotish-dashboard.git|jyotish-dashboard"; do
  url="${repo%%|*}"
  dir="${repo##*|}"
  if [[ ! -d "tools/$dir/.git" ]]; then
    git clone --depth 1 "$url" "tools/$dir"
  fi
done

echo "==> 3/4 Python venv (kinvastu + jyotish) — Python 3.12 required"
PY=python3.12
command -v "$PY" >/dev/null || PY=python3
"$PY" -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r tools/kinvastu/requirements.txt
pip install -q -r tools/jyotish-dashboard/requirements.txt

# Swiss Ephemeris data for jyotish
mkdir -p tools/jyotish-dashboard/ephe
EPHE=tools/jyotish-dashboard/ephe
for f in seas_18.se1 semo_18.se1 sepl_18.se1; do
  if [[ ! -f "$EPHE/$f" ]]; then
    curl -sfL "https://www.astro.com/ftp/swisseph/ephe/$f" -o "$EPHE/$f"
  fi
done

echo "==> 4/4 VastuFlow (Next.js)"
source ~/.nvm/nvm.sh && nvm use 20
cd tools/Vastuflow/vastuflow-app
npm ci --silent 2>/dev/null || npm install --silent
npm run build --silent

cd "$ROOT"
chmod +x scripts/*.sh scripts/*.py 2>/dev/null || true
echo ""
echo "✅ Install complete. Run: ./scripts/verify_tools.sh && python scripts/run_demo.py"
