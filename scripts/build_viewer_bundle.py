#!/usr/bin/env python3
"""Bundle all project data into demo/viewer/projects-data.js for offline/file:// use."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "samples"
OUTPUT = ROOT / "demo" / "output"
CATALOG = json.loads((ROOT / "scripts" / "interior_catalog.json").read_text())


def build() -> dict:
    projects = []
    for prop_path in sorted(SAMPLES.glob("project-*/property.json")):
        pid = prop_path.parent.name
        prop = json.loads(prop_path.read_text())
        layout_path = prop_path.parent / "interior_layout.json"
        layout = json.loads(layout_path.read_text()) if layout_path.exists() else {}
        out_dir = OUTPUT / pid
        vastu = {}
        if (out_dir / "vastu-report.json").exists():
            vastu = json.loads((out_dir / "vastu-report.json").read_text())
        astro = {}
        if (out_dir / "astro-vastu.json").exists():
            astro = json.loads((out_dir / "astro-vastu.json").read_text())
        projects.append({
            "id": pid,
            "property": prop,
            "layout": layout,
            "vastu": vastu,
            "astro": astro,
            "assets": {
                "hero": f"../output/{pid}/{pid}-hero.png",
                "living": f"../output/{pid}/{pid}-living.png",
                "bedroom": f"../output/{pid}/{pid}-bedroom.png",
                "walkthrough": f"../output/{pid}/{pid}-walkthrough.mp4",
                "glb": f"../output/{pid}/{pid}-scene.glb",
                "floorPlan": f"../output/{pid}/floor-plan.svg",
            },
        })
    return {"catalog": CATALOG, "projects": projects}


def main() -> None:
    data = build()
    out = ROOT / "demo" / "viewer" / "projects-data.js"
    out.write_text(
        "// Auto-generated — run: python scripts/build_viewer_bundle.py\n"
        f"window.CAD_PROJECTS = {json.dumps(data, indent=2)};\n"
    )
    print(f"Wrote {out} ({len(data['projects'])} projects)")


if __name__ == "__main__":
    main()
