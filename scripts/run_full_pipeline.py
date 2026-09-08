#!/usr/bin/env python3
"""Run complete automated pipeline: Vastu → plans → 3D → photoreal → bundles."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = sys.executable


def run(cmd: list[str], label: str) -> int:
    print(f"\n{'='*60}\n▶ {label}\n{'='*60}")
    r = subprocess.run(cmd, cwd=ROOT)
    if r.returncode != 0:
        print(f"⚠️  {label} exited {r.returncode}")
    return r.returncode


def main() -> int:
    quality = sys.argv[1] if len(sys.argv) > 1 else "demo"
    photoreal = quality in ("photoreal", "high", "cinema")

    steps = [
        ([PY, str(ROOT / "scripts" / "download_polyhaven_textures.py")], "Download Poly Haven PBR textures"),
        ([PY, str(ROOT / "scripts" / "run_demo.py")], "Vastu + Astro + 2D + FreeCAD + 3D"),
        ([PY, str(ROOT / "scripts" / "generate_hierarchical_plans.py")], "Hierarchical floor plans"),
    ]

    if photoreal:
        steps.append(
            ([PY, str(ROOT / "scripts" / "run_advanced_render.py"), "photoreal"], "Photoreal Cycles render (all projects)")
        )
    else:
        steps.append(
            ([PY, str(ROOT / "scripts" / "run_advanced_render.py")], "Advanced EEVEE + Cycles stills")
        )

    steps.extend([
        ([PY, str(ROOT / "scripts" / "build_viewer_bundle.py")], "Build viewer bundles"),
        ([PY, str(ROOT / "scripts" / "build_floorplan_bundle.py")], "Build floor plan viewer bundle"),
    ])

    for cmd, label in steps:
        run(cmd, label)

    print("\n" + "=" * 60)
    print("✅ Full pipeline complete")
    print("   ./scripts/serve_demo.sh")
    print("   Floor Plan Builder: http://localhost:8765/demo/floor-plan-viewer/index.html")
    print("   3D Viewer:          http://localhost:8765/demo/viewer/index.html")
    print("   Gallery:            http://localhost:8765/demo/index.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
