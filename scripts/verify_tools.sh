#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Desktop apps ==="
check "Sweet Home 3D" "test -d '/Applications/Sweet Home 3D.app'"
check "FreeCAD" "test -d '/Applications/FreeCAD.app'"
check "Blender" "command -v blender"
check "Inkscape" "command -v inkscape"
check "Krita" "test -d '/Applications/krita.app' || test -d '/Applications/Krita.app'"

echo ""
echo "=== Python stack ==="
source "$ROOT/.venv/bin/activate" 2>/dev/null || { echo "  ❌ venv missing — run ./install.sh"; exit 1; }
check "pyswisseph" "python -c 'import swisseph'"
check "kinvastu import" "PYTHONPATH=$ROOT/tools/kinvastu python -c 'from astro_vastu.astro.calculator import AstroCalculator'"
check "jyotish panchang" "cd $ROOT/tools/jyotish-dashboard && PYTHONPATH=. python -c 'from app.astrology.panchang import calculate_panchang'"

echo ""
echo "=== VastuFlow ==="
check "VastuFlow build" "test -d '$ROOT/tools/Vastuflow/vastuflow-app/.next'"

echo ""
echo "=== Sample projects ==="
for p in "$ROOT"/samples/project-*; do
  check "$(basename "$p")" "test -f '$p/property.json'"
done

echo ""
echo "Result: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
