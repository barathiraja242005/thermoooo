#!/usr/bin/env python3
"""Advanced Blender pipeline: interiors, multi-angle stills, walkthrough MP4, glTF export."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "scripts" / "interior_catalog.json"


def find_blender() -> str | None:
    for p in (
        "/opt/homebrew/bin/blender",
        "/Applications/Blender.app/Contents/MacOS/Blender",
    ):
        if Path(p).exists():
            return p
    return None


def run_advanced(project_dir: Path, out_dir: Path, *, quality: str = "demo") -> dict:
    """Run advanced Blender render for one project."""
    blender = find_blender()
    if not blender:
        return {"status": "skipped", "reason": "Blender not installed"}

    prop = json.loads((project_dir / "property.json").read_text())
    layout_path = project_dir / "interior_layout.json"
    if not layout_path.exists():
        return {"status": "skipped", "reason": "interior_layout.json missing"}

    out_dir.mkdir(parents=True, exist_ok=True)
    prop_copy = out_dir / "property.json"
    layout_copy = out_dir / "interior_layout.json"
    prop_copy.write_text(json.dumps(prop, indent=2))
    layout_copy.write_text(layout_path.read_text())

    pid = prop["id"]
    env = {
        **dict(os.environ),
        "CAD_PROJECT_DIR": str(out_dir),
        "CAD_PROJECT_ID": pid,
        "CAD_QUALITY": quality,
        "CAD_CATALOG": str(CATALOG),
        "CAD_ROOT": str(ROOT),
    }
    script = ROOT / "scripts" / "blender_advanced_render.py"
    cmd = [blender, "-b", "-P", str(script)]
    timeout = {"photoreal": 2400, "cinema": 3600, "high": 900}.get(quality, 420)
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)

    outputs = {
        "hero_still": out_dir / f"{pid}-hero.png",
        "living_still": out_dir / f"{pid}-living.png",
        "bedroom_still": out_dir / f"{pid}-bedroom.png",
        "walkthrough_mp4": out_dir / f"{pid}-walkthrough.mp4",
        "scene_gltf": out_dir / f"{pid}-scene.glb",
        "photoreal_still": out_dir / f"{pid}-photoreal.png",
    }
    result = {
        "status": "ok" if proc.returncode == 0 else "error",
        "returncode": proc.returncode,
        "files": {k: str(v) if v.exists() else None for k, v in outputs.items()},
        "stdout_tail": (proc.stdout or "")[-800:],
        "stderr_tail": (proc.stderr or "")[-800:],
    }
    (out_dir / "advanced-render.json").write_text(json.dumps(result, indent=2))
    return result


QUALITY_LEVELS = frozenset({"demo", "high", "photoreal", "cinema"})


def main() -> int:
    args = sys.argv[1:]
    target: str | None = None
    quality = "demo"
    if args:
        if args[0] in QUALITY_LEVELS:
            quality = args[0]
            target = args[1] if len(args) > 1 else None
        else:
            target = args[0]
            quality = args[1] if len(args) > 1 and args[1] in QUALITY_LEVELS else "demo"
    samples = ROOT / "samples"
    projects = [samples / target] if target else sorted(samples.glob("project-*"))

    for proj in projects:
        if not (proj / "property.json").exists():
            continue
        pid = json.loads((proj / "property.json").read_text())["id"]
        out = ROOT / "demo" / "output" / pid
        print(f"\n=== Advanced render: {proj.name} ===")
        r = run_advanced(proj, out, quality=quality)
        print(f"  Status: {r['status']}")
        for name, path in r.get("files", {}).items():
            if path:
                print(f"  ✅ {name}: {path}")
            else:
                print(f"  ⏭ {name}: not generated")
        if r.get("stderr_tail"):
            print(r["stderr_tail"][-300:])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
