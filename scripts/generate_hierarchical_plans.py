#!/usr/bin/env python3
"""Generate hierarchical floor plan data: property → rooms → furniture items."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "scripts" / "interior_catalog.json").read_text())
SAMPLES = ROOT / "samples"
OUTPUT = ROOT / "demo" / "output"

SCALE = 55
MARGIN = 80
STATUS = {"best": "#2e7d32", "good": "#66bb6a", "bad": "#ffa726", "worst": "#ef5350", "unknown": "#bdbdbd"}
FURN_LABELS = {
    "sofa": "Sofa", "coffee_table": "Coffee Table", "tv_unit": "TV Unit",
    "floor_lamp": "Floor Lamp", "plant": "Indoor Plant", "pooja_mandir": "Pooja Mandir",
    "kitchen_counter": "Kitchen Counter", "stove": "Cooktop", "fridge": "Refrigerator",
    "dining_table": "Dining Table", "dining_chair": "Dining Chair",
    "bed_double": "Double Bed", "bed_single": "Single Bed", "wardrobe": "Wardrobe",
    "side_table": "Side Table", "study_desk": "Study Desk", "office_chair": "Office Chair",
    "bookshelf": "Bookshelf", "toy_chest": "Toy Chest", "toilet": "Toilet", "sink": "Wash Basin",
    "shoe_rack": "Shoe Rack", "console_table": "Console Table", "ceiling_light": "Ceiling Light",
}

VASTU_TIPS = {
    "sofa": "Living seating — face East or North for positive energy flow.",
    "tv_unit": "Place TV in SE or NW wall; avoid NE (Pooja zone).",
    "kitchen_counter": "Kitchen belongs in SE (Agni corner) — ideal for stove.",
    "pooja_mandir": "NE corner is sacred — mandir placement is Vastu-optimal here.",
    "bed_double": "Master bedroom in SW strengthens stability and ownership.",
    "study_desk": "Study in W or NE enhances focus; face East while working.",
    "fridge": "SE or NW placement for appliances; avoid NE.",
}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def px(m: float) -> float:
    return m * SCALE


def furniture_footprint(spec: dict) -> tuple[float, float]:
    """Plan-view width × depth from catalog size [width, depth, height]."""
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


def furniture_rect(item: dict, catalog: dict, room_origin: dict | None = None) -> tuple[float, float, float, float]:
    spec = catalog.get(item["type"], {"size": [0.5, 0.5, 0.5]})
    w, d = furniture_footprint(spec)
    ox = room_origin["x"] if room_origin else 0
    oy = room_origin["y"] if room_origin else 0
    lx, ly = item["x"] - ox, item["y"] - oy
    return lx - w / 2, ly - d / 2, w, d


def room_detail_svg(room: dict, prop_room: dict | None, vastu_room: dict | None, catalog: dict) -> str:
    r = room["rect"]
    rw, rh = r["w"], r["h"]
    pad = 60
    svg_w = px(rw) + pad * 2
    svg_h = px(rh) + pad * 2 + 120
    ox, oy = pad, pad + 40
    status = vastu_room.get("status", "unknown") if vastu_room else "unknown"
    fill = STATUS.get(status, "#bdbdbd")

    parts = [
        f'<rect x="{ox}" y="{oy}" width="{px(rw)}" height="{px(rh)}" '
        f'fill="{fill}" fill-opacity="0.2" stroke="#333" stroke-width="2"/>',
    ]

    # Walls with dimension annotations
    parts.append(
        f'<text x="{ox + px(rw)/2}" y="{oy - 8}" text-anchor="middle" font-size="11" fill="#555">'
        f'Width: {rw:.2f} m</text>'
    )
    parts.append(
        f'<text x="{ox - 12}" y="{oy + px(rh)/2}" text-anchor="middle" font-size="11" fill="#555" '
        f'transform="rotate(-90,{ox - 12},{oy + px(rh)/2})">Depth: {rh:.2f} m</text>'
    )

    for wi, win in enumerate(room.get("windows", [])):
        wall = win["wall"]
        ww = win.get("width", 1.2)
        off = win.get("offset", 1.0)
        if wall == "N":
            parts.append(f'<rect x="{ox + px(off)}" y="{oy}" width="{px(ww)}" height="6" fill="#29b6f6"/>')
            parts.append(f'<text x="{ox + px(off + ww/2)}" y="{oy - 4}" font-size="8" fill="#0277bd">Window {ww}m</text>')
        elif wall == "S":
            parts.append(f'<rect x="{ox + px(off)}" y="{oy + px(rh) - 6}" width="{px(ww)}" height="6" fill="#29b6f6"/>')
        elif wall == "W":
            parts.append(f'<rect x="{ox}" y="{oy + px(off)}" width="6" height="{px(ww)}" fill="#29b6f6"/>')
        elif wall == "E":
            parts.append(f'<rect x="{ox + px(rw) - 6}" y="{oy + px(off)}" width="6" height="{px(ww)}" fill="#29b6f6"/>')

    items_data = []
    for i, item in enumerate(room.get("furniture", [])):
        fx, fy, fw, fd = furniture_rect(item, catalog, r)
        cx = ox + px(fx + fw / 2)
        cy = oy + px(fy + fd / 2)
        spec = catalog.get(item["type"], {})
        col = spec.get("color", [0.5, 0.5, 0.5, 1])
        rgb = f"rgb({int(col[0]*255)},{int(col[1]*255)},{int(col[2]*255)})"
        label = FURN_LABELS.get(item["type"], item["type"])
        item_id = f"{slug(room['name'])}-item-{i}"
        rot = item.get("rotation_deg", 0)
        pw, ph = px(fw), px(fd)
        txt = short_label(label, pw, ph)
        txt_col = label_text_color(col)
        parts.append(f'<g id="{item_id}" class="furniture-item" data-item-id="{item_id}">')
        parts.append(f'<g transform="translate({cx},{cy}) rotate({rot})">')
        parts.append(
            f'<rect x="{-pw/2}" y="{-ph/2}" width="{pw}" height="{ph}" '
            f'fill="{rgb}" stroke="#333" stroke-width="1.2" rx="3" style="cursor:pointer"/>'
        )
        if pw >= 20 and ph >= 14:
            parts.append(
                f'<text x="0" y="4" text-anchor="middle" font-size="{8 if pw > 36 else 7}" '
                f'fill="{txt_col}" font-weight="600">{txt}</text>'
            )
        parts.append("</g></g>")
        items_data.append({
            "id": item_id,
            "type": item["type"],
            "label": label,
            "x_m": item["x"] - r["x"],
            "y_m": item["y"] - r["y"],
            "size_m": [fw, fd, spec.get("size", [0, 0, 0])[2] if spec.get("size") else 0.5],
            "rotation_deg": rot,
            "vastu_tip": VASTU_TIPS.get(item["type"], "Verify placement with VastuFlow zone map."),
            "catalog_color": col,
        })

    title = room["name"]
    subtitle = f'{room.get("floor", "")} · {prop_room.get("direction", "") if prop_room else ""} · Vastu: {status}'
    if prop_room:
        subtitle += f' · {prop_room.get("vastu_item", "")}'

    info_y = oy + px(rh) + 30
    info = [
        f'<text x="{svg_w/2}" y="{info_y}" text-anchor="middle" font-size="10" fill="#444">{subtitle}</text>',
    ]
    if vastu_room:
        info.append(
            f'<text x="{svg_w/2}" y="{info_y + 14}" text-anchor="middle" font-size="9" fill="#666">'
            f'{vastu_room.get("note", "")}</text>'
        )

    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{svg_w}" height="{svg_h + 30}" '
        f'viewBox="0 0 {svg_w} {svg_h + 30}" data-room="{slug(room["name"])}">\n'
        f'<rect width="100%" height="100%" fill="#faf8f5"/>\n'
        f'<text x="{svg_w/2}" y="28" text-anchor="middle" font-size="15" font-weight="bold">{title}</text>\n'
        f'{"".join(parts)}\n{"".join(info)}\n</svg>',
        items_data,
    )


def main_layout_svg(prop: dict, layout: dict, vastu: dict, catalog: dict) -> str:
    w_m, d_m = prop["dimensions_m"]["width"], prop["dimensions_m"]["depth"]
    pw, ph = px(w_m), px(d_m)
    total_w = pw + MARGIN * 2
    total_h = ph + MARGIN * 2 + 60
    ox, oy = MARGIN, MARGIN + 50
    room_vastu = {r["name"]: r for r in vastu.get("rooms", [])}
    prop_rooms = {r["name"]: r for r in prop.get("rooms", [])}

    parts = [f'<rect x="{ox}" y="{oy}" width="{pw}" height="{ph}" fill="#fff" stroke="#222" stroke-width="2"/>']

    for room in layout.get("rooms", []):
        r = room["rect"]
        rx, ry = ox + px(r["x"]), oy + px(r["y"])
        rw, rh = px(r["w"]), px(r["h"])
        rs = slug(room["name"])
        v = room_vastu.get(room["name"], {})
        st = v.get("status", "unknown")
        fill = STATUS.get(st, "#bdbdbd")
        pr = prop_rooms.get(room["name"], {})
        parts.append(
            f'<g id="room-{rs}" class="room-zone" data-room-id="{rs}" style="cursor:pointer">'
            f'<rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" fill="{fill}" fill-opacity="0.35" '
            f'stroke="#444" stroke-width="1.5"/>'
            f'<text x="{rx + rw/2}" y="{ry + 16}" text-anchor="middle" font-size="11" font-weight="bold">{room["name"]}</text>'
            f'<text x="{rx + rw/2}" y="{ry + 28}" text-anchor="middle" font-size="8" fill="#444">'
            f'{r["w"]:.1f}×{r["h"]:.1f}m · {pr.get("direction","")} · {st}</text>'
            f'<text x="{rx + rw/2}" y="{ry + rh - 8}" text-anchor="middle" font-size="8" fill="#8b4513">Click to zoom →</text>'
            f'</g>'
        )
        for item in room.get("furniture", []):
            # Main overview uses property-global coordinates (not room-local)
            fx, fy, fw, fd = furniture_rect(item, catalog, None)
            cx = ox + px(fx + fw / 2)
            cy = oy + px(fy + fd / 2)
            spec = catalog.get(item["type"], {})
            col = spec.get("color", [0.5, 0.5, 0.5, 1])
            rgb = f"rgb({int(col[0]*255)},{int(col[1]*255)},{int(col[2]*255)})"
            pw, ph = px(fw), px(fd)
            parts.append(
                f'<rect x="{cx - pw/2}" y="{cy - ph/2}" width="{pw}" height="{ph}" '
                f'fill="{rgb}" fill-opacity="0.75" stroke="#333" stroke-width="0.5" pointer-events="none"/>'
            )

    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="{total_h}" viewBox="0 0 {total_w} {total_h}">\n'
        f'<rect width="100%" height="100%" fill="#faf8f5"/>\n'
        f'<text x="{total_w/2}" y="28" text-anchor="middle" font-size="16" font-weight="bold">{prop["name"]}</text>\n'
        f'<text x="{total_w/2}" y="46" text-anchor="middle" font-size="11" fill="#555">'
        f'{w_m}×{d_m}m · Facing {prop.get("facing","")} · Vastu {vastu.get("compliance_score","?")}/100</text>\n'
        f'{"".join(parts)}\n</svg>'
    )


def build_hierarchy(prop: dict, layout: dict, vastu: dict, catalog: dict) -> dict:
    room_vastu = {r["name"]: r for r in vastu.get("rooms", [])}
    prop_rooms = {r["name"]: r for r in prop.get("rooms", [])}
    rooms_h = []
    for room in layout.get("rooms", []):
        rs = slug(room["name"])
        svg, items = room_detail_svg(room, prop_rooms.get(room["name"]), room_vastu.get(room["name"]), catalog)
        rooms_h.append({
            "id": rs,
            "name": room["name"],
            "rect": room["rect"],
            "floor": room.get("floor"),
            "wall_color": room.get("wall_color"),
            "vastu": room_vastu.get(room["name"], {}),
            "property_room": prop_rooms.get(room["name"], {}),
            "items": items,
            "furniture_count": len(items),
            "windows": room.get("windows", []),
        })
    return {
        "levels": ["property", "room", "item"],
        "property": {
            "id": prop["id"],
            "name": prop["name"],
            "dimensions_m": prop["dimensions_m"],
            "facing": prop.get("facing"),
            "vastu_score": vastu.get("compliance_score"),
            "vastu_grade": vastu.get("grade"),
        },
        "rooms": rooms_h,
    }


def process_project(project_dir: Path) -> None:
    pid = project_dir.name
    prop = json.loads((project_dir / "property.json").read_text())
    layout_path = project_dir / "interior_layout.json"
    if not layout_path.exists():
        return
    layout = json.loads(layout_path.read_text())
    out = OUTPUT / pid
    out.mkdir(parents=True, exist_ok=True)
    vastu = json.loads((out / "vastu-report.json").read_text()) if (out / "vastu-report.json").exists() else {}

    hierarchy = build_hierarchy(prop, layout, vastu, CATALOG)
    (out / "hierarchy.json").write_text(json.dumps(hierarchy, indent=2))

    (out / "floor-plan-main.svg").write_text(main_layout_svg(prop, layout, vastu, CATALOG))

    rooms_dir = out / "rooms"
    rooms_dir.mkdir(exist_ok=True)
    for room in layout.get("rooms", []):
        rs = slug(room["name"])
        prop_rooms = {r["name"]: r for r in prop.get("rooms", [])}
        room_vastu = {r["name"]: r for r in vastu.get("rooms", [])}
        svg, items = room_detail_svg(room, prop_rooms.get(room["name"]), room_vastu.get(room["name"]), CATALOG)
        (rooms_dir / f"{rs}.svg").write_text(svg)
        (rooms_dir / f"{rs}.json").write_text(json.dumps({"items": items}, indent=2))

    print(f"  hierarchy: {out / 'hierarchy.json'} ({len(hierarchy['rooms'])} rooms)")


def main() -> None:
    for proj in sorted(SAMPLES.glob("project-*")):
        if (proj / "property.json").exists():
            print(f"=== {proj.name} ===")
            process_project(proj)


if __name__ == "__main__":
    main()
