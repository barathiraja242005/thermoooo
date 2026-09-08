#!/usr/bin/env python3
"""Bundle hierarchical floor plan data for drill-down viewer."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "demo" / "output"
CATALOG = json.loads((ROOT / "scripts" / "interior_catalog.json").read_text())


def main() -> None:
    projects = []
    for hier_path in sorted(OUTPUT.glob("project-*/hierarchy.json")):
        pid = hier_path.parent.name
        hierarchy = json.loads(hier_path.read_text())
        projects.append({
            "id": pid,
            "hierarchy": hierarchy,
            "assets": {
                "mainSvg": f"../output/{pid}/floor-plan-main.svg",
                "floorPlan": f"../output/{pid}/floor-plan.svg",
                "hero": f"../output/{pid}/{pid}-hero.png",
                "photoreal": f"../output/{pid}/{pid}-photoreal.png",
                "glb": f"../output/{pid}/{pid}-scene.glb",
                "walkthrough": f"../output/{pid}/{pid}-walkthrough.mp4",
            },
            "roomAssets": {
                r["id"]: {
                    "svg": f"../output/{pid}/rooms/{r['id']}.svg",
                    "json": f"../output/{pid}/rooms/{r['id']}.json",
                }
                for r in hierarchy.get("rooms", [])
            },
        })

    out = ROOT / "demo" / "floor-plan-viewer" / "floorplan-data.js"
    out.write_text(
        "// Auto-generated\n"
        f"window.CAD_FLOORPLANS = {json.dumps({'catalog': CATALOG, 'projects': projects}, indent=2)};\n"
    )
    print(f"Wrote {out} ({len(projects)} projects)")


if __name__ == "__main__":
    main()
