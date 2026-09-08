#!/usr/bin/env python3
"""Scale interior_layout.json when property dimensions differ from template."""
import json
import sys
from pathlib import Path

REF_W, REF_D = 12.0, 10.0


def scale_layout(src: Path, dst: Path, target_w: float, target_d: float) -> None:
    data = json.loads(src.read_text())
    sx, sy = target_w / REF_W, target_d / REF_D
    for room in data["rooms"]:
        r = room["rect"]
        r["x"] = round(r["x"] * sx, 2)
        r["y"] = round(r["y"] * sy, 2)
        r["w"] = round(r["w"] * sx, 2)
        r["h"] = round(r["h"] * sy, 2)
        for f in room.get("furniture", []):
            f["x"] = round(f["x"] * sx, 2)
            f["y"] = round(f["y"] * sy, 2)
        for win in room.get("windows", []):
            win["offset"] = round(win.get("offset", 1) * sx, 2)
            win["width"] = round(win.get("width", 1.2) * sx, 2)
    for pt in data.get("camera_tour", []):
        pt["x"] = round(pt["x"] * sx, 2)
        pt["y"] = round(pt["y"] * sy, 2)
        if "look_at" in pt:
            pt["look_at"][0] = round(pt["look_at"][0] * sx, 2)
            pt["look_at"][1] = round(pt["look_at"][1] * sy, 2)
    dst.write_text(json.dumps(data, indent=2))


if __name__ == "__main__":
    template = Path(sys.argv[1])
    prop = json.loads(Path(sys.argv[2]).read_text())
    out = Path(sys.argv[3])
    w = prop["dimensions_m"]["width"]
    d = prop["dimensions_m"]["depth"]
    scale_layout(template, out, w, d)
    print(f"Wrote {out} ({w}x{d}m)")
