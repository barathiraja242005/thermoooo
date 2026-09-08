#!/usr/bin/env python3
"""
Procedural Architectural Layout & Geometry Generator.

Takes user inputs (Width, Depth, Facing, BHK, Typology, Location) and automatically generates:
1. Valid property.json (Site dimensions, facing, room list)
2. Valid interior_layout.json (Room bounding boxes x, y, w, h, furniture, windows)
3. Vastu scoring report
4. 2D Architectural Floor Plan SVG
5. Dynamic Three.js WebGL 3D Model bundle
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from vastu_analyzer import analyze_property  # noqa: E402
from generate_floor_plan import generate_detailed_svg  # noqa: E402


def generate_house_layout(
    project_id: str,
    width_m: float,
    depth_m: float,
    facing: str = "E",
    bhk: int = 3,
    typology: str = "villa",
    city: str = "New Delhi",
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    passive_options: Dict[str, bool] = None,
) -> Dict[str, Any]:
    """Generates a complete parametric 2D floor plan and 3D bundle."""
    if passive_options is None:
        passive_options = {"vastu": True, "night_purge": True, "overhang": True}

    wall_thick = 0.23  # standard 230mm exterior wall
    effective_w = max(6.0, width_m - 0.4)
    effective_d = max(6.0, depth_m - 0.4)

    # Architectural Zoning based on Vastu + Solar Orientation
    rooms_data: List[Dict[str, Any]] = []
    prop_rooms: List[Dict[str, Any]] = []

    # Proportional Grid Splits
    mid_x = round(effective_w * 0.52, 2)
    mid_y = round(effective_d * 0.50, 2)

    # 1. Living & Dining (North-East quadrant)
    liv_w = round(mid_x - 0.2, 2)
    liv_h = round(mid_y - 0.2, 2)
    rooms_data.append({
        "name": "Living & Dining",
        "rect": {"x": 0.2, "y": 0.2, "w": liv_w, "h": liv_h},
        "floor": "oak_parquet",
        "wall_color": [0.96, 0.95, 0.92, 1],
        "furniture": [
            {"type": "sofa", "x": round(liv_w * 0.45, 2), "y": round(liv_h * 0.65, 2), "rotation_deg": 0},
            {"type": "coffee_table", "x": round(liv_w * 0.45, 2), "y": round(liv_h * 0.45, 2), "rotation_deg": 0},
            {"type": "tv_unit", "x": round(liv_w * 0.45, 2), "y": 0.5, "rotation_deg": 0},
            {"type": "dining_table", "x": round(liv_w * 0.8, 2), "y": round(liv_h * 0.5, 2), "rotation_deg": 0},
            {"type": "ceiling_fan", "x": round(liv_w * 0.45, 2), "y": round(liv_h * 0.5, 2), "rotation_deg": 0},
        ],
        "windows": [{"wall": "N", "offset": 1.5, "width": 2.2, "height": 1.4, "sill_m": 0.9}],
    })
    prop_rooms.append({"name": "Living & Dining", "vastu_item": "Family Photo", "direction": "NE"})

    # 2. Pooja Room / Study (Far North-East)
    pooja_w = round(effective_w - mid_x - 0.2, 2)
    pooja_h = round(mid_y * 0.45, 2)
    rooms_data.append({
        "name": "Pooja Room",
        "rect": {"x": mid_x, "y": 0.2, "w": pooja_w, "h": pooja_h},
        "floor": "marble_white",
        "wall_color": [0.98, 0.96, 0.90, 1],
        "furniture": [
            {"type": "pooja_mandir", "x": round(mid_x + pooja_w * 0.5, 2), "y": 0.6, "rotation_deg": 0},
            {"type": "ceiling_light", "x": round(mid_x + pooja_w * 0.5, 2), "y": round(pooja_h * 0.5, 2), "rotation_deg": 0},
        ],
        "windows": [],
    })
    prop_rooms.append({"name": "Pooja Room", "vastu_item": "Pooja/Mandir", "direction": "NE"})

    # 3. Kitchen (South-East quadrant - Agni Corner)
    kitch_y = round(pooja_h + 0.3, 2)
    kitch_h = round(effective_d - kitch_y - 0.2, 2)
    rooms_data.append({
        "name": "Kitchen",
        "rect": {"x": mid_x, "y": kitch_y, "w": pooja_w, "h": kitch_h},
        "floor": "ceramic_tile",
        "wall_color": [0.93, 0.93, 0.91, 1],
        "furniture": [
            {"type": "kitchen_counter", "x": round(mid_x + pooja_w - 0.5, 2), "y": round(kitch_y + 1.0, 2), "rotation_deg": 90},
            {"type": "stove", "x": round(mid_x + pooja_w - 0.5, 2), "y": round(kitch_y + 1.8, 2), "rotation_deg": 90},
            {"type": "fridge", "x": round(mid_x + 0.6, 2), "y": round(kitch_y + kitch_h - 0.6, 2), "rotation_deg": 0},
        ],
        "windows": [{"wall": "E", "offset": 1.2, "width": 1.4, "height": 1.1, "sill_m": 1.0}],
    })
    prop_rooms.append({"name": "Kitchen", "vastu_item": "Kitchen", "direction": "SE"})

    # 4. Master Bedroom (South-West quadrant - Heaviest Stability)
    mbr_w = round(mid_x - 0.2, 2)
    mbr_y = round(mid_y + 0.2, 2)
    mbr_h = round(effective_d - mbr_y - 0.2, 2)
    rooms_data.append({
        "name": "Master Bedroom",
        "rect": {"x": 0.2, "y": mbr_y, "w": mbr_w, "h": mbr_h},
        "floor": "oak_parquet",
        "wall_color": [0.95, 0.93, 0.96, 1],
        "furniture": [
            {"type": "bed_double", "x": round(mbr_w * 0.5, 2), "y": round(mbr_y + mbr_h * 0.5, 2), "rotation_deg": 0},
            {"type": "wardrobe", "x": 0.6, "y": round(mbr_y + mbr_h * 0.5, 2), "rotation_deg": 90},
            {"type": "side_table", "x": round(mbr_w * 0.2, 2), "y": round(mbr_y + mbr_h * 0.75, 2), "rotation_deg": 0},
            {"type": "side_table", "x": round(mbr_w * 0.8, 2), "y": round(mbr_y + mbr_h * 0.75, 2), "rotation_deg": 0},
            {"type": "ceiling_fan", "x": round(mbr_w * 0.5, 2), "y": round(mbr_y + mbr_h * 0.5, 2), "rotation_deg": 0},
        ],
        "windows": [{"wall": "W", "offset": 1.5, "width": 1.8, "height": 1.4, "sill_m": 0.9}],
    })
    prop_rooms.append({"name": "Master Bedroom", "vastu_item": "Master Bedroom", "direction": "SW"})

    # If 3BHK or more, add second bedroom / guest / courtyard
    if bhk >= 3:
        prop_rooms.append({"name": "Kids Bedroom", "vastu_item": "Kids Bedroom", "direction": "NW"})
    prop_rooms.append({"name": "Main Entrance", "vastu_item": "Entrance", "direction": facing})

    # Assemble JSON Objects
    property_json = {
        "id": project_id,
        "name": f"{bhk}BHK Bioclimatic {typology.title()}",
        "description": f"Generated for {city}. Facing {facing}. Area: {round(width_m * depth_m)} m².",
        "facing": facing,
        "north_rotation_deg": 0,
        "dimensions_m": {"width": width_m, "depth": depth_m},
        "location": {
            "city": city,
            "latitude": latitude,
            "longitude": longitude,
            "timezone": "Asia/Kolkata",
        },
        "rooms": prop_rooms,
    }

    interior_layout_json = {
        "wall_height_m": 3.0,
        "wall_thickness_m": wall_thick,
        "style": "bioclimatic_modern",
        "rooms": rooms_data,
        "doors": [
            {"from": "Living & Dining", "to": "Master Bedroom", "x": round(mbr_w * 0.5, 2), "y": mbr_y, "width": 0.9},
            {"from": "Living & Dining", "to": "Kitchen", "x": mid_x, "y": round(kitch_y + 1.2, 2), "width": 0.9},
        ],
    }

    # Run Vastu Analyzer
    vastu_result = analyze_property(prop_rooms)

    # Save to demo/output/<project_id>/
    out_dir = ROOT / "demo" / "output" / project_id
    out_dir.mkdir(parents=True, exist_ok=True)

    (out_dir / "property.json").write_text(json.dumps(property_json, indent=2))
    (out_dir / "interior_layout.json").write_text(json.dumps(interior_layout_json, indent=2))
    (out_dir / "vastu-report.json").write_text(json.dumps(vastu_result, indent=2))

    # Generate 2D Floor Plan SVG
    svg_content = generate_detailed_svg(property_json, interior_layout_json, vastu_result)
    plan_path = out_dir / "floor-plan.svg"
    plan_path.write_text(svg_content)

    # Update 3D projects-data.js so Three.js can render it live
    update_viewer_bundle(project_id, property_json, interior_layout_json, vastu_result)

    return {
        "project_id": project_id,
        "svg_url": f"output/{project_id}/floor-plan.svg",
        "dimensions": f"{width_m}m × {depth_m}m",
        "area_m2": round(width_m * depth_m, 1),
        "area_sqft": round(width_m * depth_m * 10.7639),
        "vastu_score": vastu_result.get("compliance_score", 85),
        "vastu_grade": vastu_result.get("grade", "Good"),
        "rooms_count": len(rooms_data),
    }


def update_viewer_bundle(project_id: str, prop: dict, layout: dict, vastu: dict) -> None:
    """Updates projects-data.js for instant Three.js 3D WebGL rendering."""
    catalog_path = ROOT / "scripts" / "interior_catalog.json"
    catalog = json.loads(catalog_path.read_text()) if catalog_path.exists() else {}

    projects_data_path = ROOT / "demo" / "viewer" / "projects-data.js"
    existing_data: Dict[str, Any] = {"catalog": catalog, "projects": []}

    if projects_data_path.exists():
        content = projects_data_path.read_text()
        if "window.CAD_PROJECTS = " in content:
            raw_json = content.split("window.CAD_PROJECTS = ")[1].rstrip(";\n ")
            try:
                existing_data = json.loads(raw_json)
            except Exception:
                pass

    # Filter out duplicate project_id if updating
    filtered_projects = [p for p in existing_data.get("projects", []) if p.get("id") != project_id]

    new_entry = {
        "id": project_id,
        "property": prop,
        "layout": layout,
        "vastu": vastu,
        "astro": {},
        "assets": {
            "hero": f"../output/{project_id}/floor-plan.svg",
            "floorPlan": f"../output/{project_id}/floor-plan.svg",
        },
    }
    filtered_projects.insert(0, new_entry)  # Insert as primary project
    existing_data["projects"] = filtered_projects

    projects_data_path.write_text(
        "// Auto-generated by ThermaBuild\n"
        f"window.CAD_PROJECTS = {json.dumps(existing_data, indent=2)};\n"
    )
