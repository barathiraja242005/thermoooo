#!/usr/bin/env python3
"""Generate detailed SVG floor plans from interior_layout.json with furniture labels."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "scripts" / "interior_catalog.json").read_text())

SCALE = 42  # px per meter
MARGIN = 70
LEGEND_W = 200

FURN_LABELS = {
    "sofa": "Sofa", "coffee_table": "Coffee Table", "tv_unit": "TV Unit",
    "floor_lamp": "Lamp", "plant": "Plant", "pooja_mandir": "Pooja Mandir",
    "kitchen_counter": "Kitchen Counter", "stove": "Stove", "fridge": "Fridge",
    "dining_table": "Dining Table", "dining_chair": "Chair", "bed_double": "Double Bed",
    "bed_single": "Single Bed", "wardrobe": "Wardrobe", "side_table": "Side Table",
    "study_desk": "Study Desk", "office_chair": "Office Chair", "bookshelf": "Bookshelf",
    "toy_chest": "Toy Chest", "toilet": "Toilet", "sink": "Sink", "shoe_rack": "Shoe Rack",
    "console_table": "Console", "ceiling_light": "Light",
}

STATUS_COLORS = {
    "best": "#2e7d32", "good": "#66bb6a", "bad": "#ffa726",
    "worst": "#ef5350", "unknown": "#bdbdbd",
}


def m2px(v: float) -> float:
    return v * SCALE


def furniture_footprint(spec: dict) -> tuple[float, float]:
    sz = spec.get("size", [0.5, 0.5, 0.5])
    return sz[0], sz[1]


def label_text_color(col: list) -> str:
    lum = 0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2]
    return "#f5f5f5" if lum < 0.52 else "#1a1a1a"


def short_label(label: str, pw: float, ph: float) -> str:
    if pw < 28 or ph < 18:
        return label.split()[0][:4]
    if pw < 44 or ph < 28:
        return label.replace(" Table", "").replace(" Unit", "").replace(" Counter", "")
    return label


def furniture_svg(item: dict, room_name: str) -> str:
    ftype = item["type"]
    spec = CATALOG.get(ftype, {})
    w, d = furniture_footprint(spec)
    x = m2px(item["x"]) - m2px(w) / 2
    y = m2px(item["y"]) - m2px(d) / 2
    pw, ph = m2px(w), m2px(d)
    col = spec.get("color", [0.5, 0.5, 0.5, 1])
    fill = f"rgb({int(col[0]*255)},{int(col[1]*255)},{int(col[2]*255)})"
    label = FURN_LABELS.get(ftype, ftype.replace("_", " ").title())
    rot = item.get("rotation_deg", 0)
    cx, cy = m2px(item["x"]), m2px(item["y"])
    txt = short_label(label, pw, ph)
    txt_col = label_text_color(col)
    g = f'<g transform="rotate({rot},{cx},{cy})">'
    g += f'<rect x="{x}" y="{y}" width="{pw}" height="{ph}" fill="{fill}" fill-opacity="0.85" stroke="#333" stroke-width="1" rx="2"/>'
    if pw >= 20 and ph >= 14:
        g += f'<text x="{cx}" y="{cy + 3}" text-anchor="middle" font-size="{7 if pw > 36 else 6}" fill="{txt_col}" font-weight="600">{txt}</text>'
    g += "</g>"
    return g


def generate_detailed_svg(property_data: dict, layout: dict, vastu_result: dict) -> str:
    w_m = property_data["dimensions_m"]["width"]
    d_m = property_data["dimensions_m"]["depth"]
    pw = m2px(w_m)
    ph = m2px(d_m)
    total_w = pw + MARGIN * 2 + LEGEND_W
    total_h = ph + MARGIN * 2 + 80

    room_vastu = {r["name"]: r for r in vastu_result.get("rooms", [])}
    prop_rooms = {r["name"]: r for r in property_data.get("rooms", [])}

    parts = []
    ox, oy = MARGIN, MARGIN + 50

    parts.append(f'<rect x="{ox}" y="{oy}" width="{pw}" height="{ph}" fill="#fff" stroke="#222" stroke-width="2"/>')

    for room in layout.get("rooms", []):
        r = room["rect"]
        rx = ox + m2px(r["x"])
        ry = oy + m2px(r["y"])
        rw = m2px(r["w"])
        rh = m2px(r["h"])
        vinfo = room_vastu.get(room["name"], {})
        status = vinfo.get("status", "unknown")
        fill = STATUS_COLORS.get(status, "#bdbdbd")
        pinfo = prop_rooms.get(room["name"], {})
        direction = pinfo.get("direction", "—")
        vastu_item = pinfo.get("vastu_item", "")

        parts.append(
            f'<rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" '
            f'fill="{fill}" fill-opacity="0.25" stroke="#555" stroke-width="1.5"/>'
        )
        parts.append(
            f'<text x="{rx + rw/2}" y="{ry + 14}" text-anchor="middle" font-size="11" font-weight="bold">{room["name"]}</text>'
        )
        parts.append(
            f'<text x="{rx + rw/2}" y="{ry + 26}" text-anchor="middle" font-size="8" fill="#444">'
            f'{r["w"]:.1f}×{r["h"]:.1f}m · {direction} · {room.get("floor","")}</text>'
        )
        if vastu_item:
            parts.append(
                f'<text x="{rx + rw/2}" y="{ry + 36}" text-anchor="middle" font-size="7" fill="#666">'
                f'Vastu: {vastu_item} ({status})</text>'
            )
        for item in room.get("furniture", []):
            ftype = item["type"]
            spec = CATALOG.get(ftype, {})
            fw, fd = furniture_footprint(spec)
            cx = ox + m2px(item["x"])
            cy = oy + m2px(item["y"])
            col = spec.get("color", [0.5, 0.5, 0.5, 1])
            fill = f"rgb({int(col[0]*255)},{int(col[1]*255)},{int(col[2]*255)})"
            label = FURN_LABELS.get(ftype, ftype.replace("_", " ").title())
            rot = item.get("rotation_deg", 0)
            pw, ph = m2px(fw), m2px(fd)
            txt = short_label(label, pw, ph)
            txt_col = label_text_color(col)
            parts.append(f'<g transform="translate({cx},{cy}) rotate({rot})">')
            parts.append(
                f'<rect x="{-pw/2}" y="{-ph/2}" width="{pw}" height="{ph}" '
                f'fill="{fill}" fill-opacity="0.9" stroke="#222" stroke-width="0.8" rx="2"/>'
            )
            if pw >= 20 and ph >= 14:
                parts.append(
                    f'<text x="0" y="3" text-anchor="middle" font-size="{7 if pw > 36 else 6}" '
                    f'fill="{txt_col}" font-weight="600">{txt}</text>'
                )
            parts.append("</g>")

        for wi, win in enumerate(room.get("windows", [])):
            wall = win["wall"]
            ww, wh = win.get("width", 1.2), win.get("height", 1.2)
            off = win.get("offset", 1.0)
            if wall == "N":
                wx = rx + m2px(off)
                parts.append(f'<rect x="{wx}" y="{ry}" width="{m2px(ww)}" height="4" fill="#4fc3f7" stroke="#0288d1"/>')
            elif wall == "S":
                wx = rx + m2px(off)
                parts.append(f'<rect x="{wx}" y="{ry + rh - 4}" width="{m2px(ww)}" height="4" fill="#4fc3f7" stroke="#0288d1"/>')
            elif wall == "W":
                wy = ry + m2px(off)
                parts.append(f'<rect x="{rx}" y="{wy}" width="4" height="{m2px(ww)}" fill="#4fc3f7" stroke="#0288d1"/>')
            elif wall == "E":
                wy = ry + m2px(off)
                parts.append(f'<rect x="{rx + rw - 4}" y="{wy}" width="4" height="{m2px(ww)}" fill="#4fc3f7" stroke="#0288d1"/>')

    # Compass
    cx, cy = ox + pw + 40, oy + 30
    parts.append(f'<g transform="translate({cx},{cy})">')
    parts.append(f'<circle r="28" fill="none" stroke="#333" stroke-width="1.5"/>')
    for label, angle in [("N", 0), ("E", 90), ("S", 180), ("W", 270)]:
        import math
        rad = math.radians(angle - 90)
        lx, ly = 22 * math.cos(rad), 22 * math.sin(rad)
        parts.append(f'<text x="{lx}" y="{ly + 4}" text-anchor="middle" font-size="11" font-weight="bold">{label}</text>')
    parts.append("</g>")

    # Legend — room inventory
    lx = ox + pw + 25
    ly = oy + 80
    parts.append(f'<text x="{lx}" y="{ly}" font-size="12" font-weight="bold">Room Inventory</text>')
    ly += 16
    for room in layout.get("rooms", []):
        parts.append(f'<text x="{lx}" y="{ly}" font-size="9" font-weight="bold" fill="#8b4513">{room["name"]}</text>')
        ly += 12
        items = room.get("furniture", [])
        if not items:
            parts.append(f'<text x="{lx + 4}" y="{ly}" font-size="8" fill="#888">(empty)</text>')
            ly += 11
        for item in items:
            label = FURN_LABELS.get(item["type"], item["type"])
            parts.append(f'<text x="{lx + 4}" y="{ly}" font-size="8" fill="#333">• {label}</text>')
            ly += 11
        ly += 4

    name = property_data["name"]
    facing = property_data.get("facing", "—")
    score = vastu_result.get("compliance_score", "—")
    grade = vastu_result.get("grade", "")

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="{total_h}" viewBox="0 0 {total_w} {total_h}">
  <rect width="100%" height="100%" fill="#faf8f5"/>
  <text x="{total_w/2}" y="28" text-anchor="middle" font-size="16" font-weight="bold">{name}</text>
  <text x="{total_w/2}" y="46" text-anchor="middle" font-size="11" fill="#555">
    {w_m}m × {d_m}m · Facing {facing} · Vastu {score}/100 ({grade})
  </text>
  {''.join(parts)}
</svg>"""
    return svg


def write_floor_plan(property_json: Path, vastu_result: dict, out_path: Path) -> None:
    data = json.loads(property_json.read_text())
    layout_path = property_json.parent / "interior_layout.json"
    if layout_path.exists():
        layout = json.loads(layout_path.read_text())
    else:
        layout = {"rooms": []}
    out_path.write_text(generate_detailed_svg(data, layout, vastu_result))


if __name__ == "__main__":
    import sys
    prop = Path(sys.argv[1])
    vastu = json.loads(Path(sys.argv[2]).read_text())
    out = Path(sys.argv[3])
    write_floor_plan(prop, vastu, out)
    print(f"Wrote {out}")
