#!/usr/bin/env python3
"""
Requirement-Driven Parametric House Layout & Geometry Engine for ThermaBuild.

Transforms high-level user requirements:
  Target Area (sq.ft / m2) + BHK + Rooms + Facing + Optional Vastu toggle
Into:
  1. Structured Engineering Geometry JSON (for FreeCAD Python & ANSYS Fluent CFD)
  2. Scalable 2D Vector CAD SVG (for Web browser visualizer)
  3. Dynamic Three.js WebGL scene manifest (demo/viewer/projects-data.js)
"""

from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from vastu_analyzer import analyze_property  # noqa: E402
from generate_floor_plan import generate_detailed_svg  # noqa: E402


class ParametricLayoutGenerator:
    """Requirement-driven parametric space planner and geometry synthesizer."""

    def __init__(
        self,
        area_sqft: float = 1000.0,
        bhk: int = 2,
        facing: str = "E",
        apply_vastu: bool = False,
        width_m: Optional[float] = None,
        depth_m: Optional[float] = None,
        project_id: str = "project-custom",
        name: str = "Custom House",
    ):
        self.area_sqft = max(400.0, float(area_sqft))
        self.bhk = max(1, min(4, int(bhk)))
        self.facing = facing.upper().strip() if facing else "E"
        self.apply_vastu = bool(apply_vastu)
        self.project_id = project_id
        self.name = name

        # Compute plot / envelope dimensions
        area_m2 = self.area_sqft * 0.092903
        if width_m and depth_m and width_m > 4.0 and depth_m > 4.0:
            self.width_m = round(float(width_m), 2)
            self.depth_m = round(float(depth_m), 2)
        else:
            # Optimal structural aspect ratio ~ 1 : 1.25
            aspect = 1.25
            w = math.sqrt(area_m2 / aspect)
            d = w * aspect
            self.width_m = round(max(7.0, w), 2)
            self.depth_m = round(max(8.0, d), 2)

        self.wall_ext_m = 0.23  # standard exterior 230mm brick/block
        self.wall_int_m = 0.115  # interior partition 115mm
        self.wall_height_m = 2.85  # standard floor-to-ceiling clear height

    def generate(self) -> Dict[str, Any]:
        """Runs space planning algorithm and produces SVG, geometry.json, and WebGL bundles."""
        # 1. Calculate usable interior bounding box inside setbacks
        eff_w = max(5.5, round(self.width_m - 0.4, 2))
        eff_d = max(6.0, round(self.depth_m - 0.4, 2))

        # 2. Solve Room Program
        if self.apply_vastu:
            rooms_spec, doors_spec = self._solve_vastu_layout(eff_w, eff_d)
            vastu_status = "Applied (Manduka Mandala)"
        else:
            rooms_spec, doors_spec = self._solve_functional_layout(eff_w, eff_d)
            vastu_status = "Standard Functional Adjacency"

        # 3. Build Structured Geometry JSON for FreeCAD CAD / CFD
        geometry_json = self._build_structured_geometry(rooms_spec, doors_spec)

        # 4. Build Property JSON & Interior Layout JSON for existing viewers
        prop_rooms = [{"name": r["name"], "direction": r.get("zone", "C"), "vastu_item": r["name"]} for r in rooms_spec]
        vastu_analysis = analyze_property(prop_rooms) if self.apply_vastu else {
            "compliance_score": 75,
            "grade": "Functional",
            "findings": [{"message": "Optimized for functional MEP adjacency and structural grid efficiency."}]
        }

        property_json = {
            "id": self.project_id,
            "name": self.name,
            "facing": self.facing,
            "dimensions_m": {"width": self.width_m, "depth": self.depth_m},
            "area_sqft": round(self.width_m * self.depth_m * 10.7639),
            "area_m2": round(self.width_m * self.depth_m, 1),
            "bhk": self.bhk,
            "apply_vastu": self.apply_vastu,
            "rooms": prop_rooms,
        }

        interior_layout_json = {
            "wall_height_m": self.wall_height_m,
            "wall_thickness_m": self.wall_ext_m,
            "style": "modern_passive",
            "rooms": rooms_spec,
            "doors": doors_spec,
        }

        # 5. Export Files to Disk
        out_dir = ROOT / "demo" / "output" / self.project_id
        out_dir.mkdir(parents=True, exist_ok=True)

        (out_dir / "property.json").write_text(json.dumps(property_json, indent=2))
        (out_dir / "interior_layout.json").write_text(json.dumps(interior_layout_json, indent=2))
        (out_dir / "geometry.json").write_text(json.dumps(geometry_json, indent=2))
        (out_dir / "vastu-report.json").write_text(json.dumps(vastu_analysis, indent=2))

        # 6. Generate 2D Vector Floor Plan SVG
        try:
            svg_content = generate_detailed_svg(property_json, interior_layout_json, vastu_analysis)
        except Exception:
            svg_content = self._generate_fallback_svg(rooms_spec)
            
        (out_dir / "floor-plan.svg").write_text(svg_content)

        # 7. Update WebGL bundle for Three.js viewer
        self._update_viewer_manifest(property_json, interior_layout_json, vastu_analysis)

        return {
            "status": "success",
            "project_id": self.project_id,
            "name": self.name,
            "bhk": self.bhk,
            "facing": self.facing,
            "apply_vastu": self.apply_vastu,
            "dimensions": f"{self.width_m}m × {self.depth_m}m",
            "builtup_area_sqft": round(self.width_m * self.depth_m * 10.7639),
            "builtup_area_sqm": round(self.width_m * self.depth_m, 1),
            "rooms_count": len(rooms_spec),
            "geometry_json_path": str(out_dir / "geometry.json"),
            "svg_url": f"output/{self.project_id}/floor-plan.svg",
            "geometry": geometry_json,
            "vastu_summary": {
                "applied": self.apply_vastu,
                "score": vastu_analysis.get("compliance_score", 75),
                "grade": vastu_analysis.get("grade", "Standard"),
            }
        }

    # -------------------------------------------------------------------------
    # LAYOUT SOLVER: Pure Functional Adjacency (Vastu Disabled)
    # -------------------------------------------------------------------------
    def _solve_functional_layout(self, w: float, d: float) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Arranges rooms strictly by functional zoning: Public, Private, Service, and Wet zones."""
        rooms: List[Dict[str, Any]] = []
        doors: List[Dict[str, Any]] = []

        # Split width: 55% for living/master bed, 45% for kitchen/secondary bed/baths
        col1_w = round(w * 0.56, 2)
        col2_w = round(w - col1_w - 0.2, 2)

        # Public Zone Frontage (Living & Dining)
        liv_d = round(d * 0.48, 2)
        rooms.append({
            "name": "Living & Dining",
            "rect": {"x": 0.2, "y": 0.2, "w": col1_w, "h": liv_d},
            "floor": "oak_parquet",
            "wall_color": [0.96, 0.95, 0.93, 1],
            "furniture": [
                {"type": "sofa", "x": round(col1_w * 0.4, 2), "y": round(liv_d * 0.7, 2), "rotation_deg": 0},
                {"type": "coffee_table", "x": round(col1_w * 0.4, 2), "y": round(liv_d * 0.5, 2), "rotation_deg": 0},
                {"type": "tv_unit", "x": round(col1_w * 0.4, 2), "y": 0.5, "rotation_deg": 0},
                {"type": "dining_table", "x": round(col1_w * 0.8, 2), "y": round(liv_d * 0.45, 2), "rotation_deg": 0},
                {"type": "ceiling_fan", "x": round(col1_w * 0.5, 2), "y": round(liv_d * 0.5, 2), "rotation_deg": 0},
            ],
            "windows": [{"wall": self.facing, "offset": 1.2, "width": 2.2, "height": 1.4, "sill_m": 0.9}],
            "zone": "Frontage",
        })

        # Service Zone: Kitchen (Adjacent to Dining & Entry)
        kitch_d = round(d * 0.40, 2)
        rooms.append({
            "name": "Kitchen",
            "rect": {"x": round(col1_w + 0.2, 2), "y": 0.2, "w": col2_w, "h": kitch_d},
            "floor": "ceramic_tile",
            "wall_color": [0.94, 0.94, 0.92, 1],
            "furniture": [
                {"type": "kitchen_counter", "x": round(col1_w + col2_w - 0.4, 2), "y": 1.2, "rotation_deg": 90},
                {"type": "fridge", "x": round(col1_w + 0.6, 2), "y": 0.6, "rotation_deg": 0},
            ],
            "windows": [{"wall": "E" if self.facing != "E" else "N", "offset": 1.0, "width": 1.2, "height": 1.2, "sill_m": 1.1}],
            "zone": "Service",
        })

        doors.append({"from": "Living & Dining", "to": "Kitchen", "x": round(col1_w, 2), "y": 1.0, "width": 0.9})

        # Private Zone Rear: Master Bedroom
        mbr_y = round(liv_d + 0.3, 2)
        mbr_d = round(d - mbr_y - 0.2, 2)
        rooms.append({
            "name": "Master Bedroom",
            "rect": {"x": 0.2, "y": mbr_y, "w": col1_w, "h": mbr_d},
            "floor": "hardwood",
            "wall_color": [0.95, 0.93, 0.90, 1],
            "furniture": [
                {"type": "bed_double", "x": round(col1_w * 0.45, 2), "y": round(mbr_y + mbr_d * 0.55, 2), "rotation_deg": 0},
                {"type": "wardrobe", "x": 0.6, "y": round(mbr_y + mbr_d * 0.3, 2), "rotation_deg": 90},
                {"type": "ceiling_fan", "x": round(col1_w * 0.45, 2), "y": round(mbr_y + mbr_d * 0.5, 2), "rotation_deg": 0},
            ],
            "windows": [{"wall": "S", "offset": 1.2, "width": 1.8, "height": 1.4, "sill_m": 0.9}],
            "zone": "Private",
        })

        doors.append({"from": "Living & Dining", "to": "Master Bedroom", "x": round(col1_w * 0.45, 2), "y": mbr_y, "width": 0.9})

        # Secondary Rooms based on BHK
        if self.bhk == 1:
            # Master Bathroom & Utility
            bath_y = round(kitch_d + 0.3, 2)
            bath_d = round(d - bath_y - 0.2, 2)
            rooms.append({
                "name": "Bathroom",
                "rect": {"x": round(col1_w + 0.2, 2), "y": bath_y, "w": col2_w, "h": bath_d},
                "floor": "slate_gray",
                "wall_color": [0.92, 0.92, 0.92, 1],
                "furniture": [
                    {"type": "toilet", "x": round(col1_w + col2_w * 0.5, 2), "y": round(bath_y + 0.8, 2), "rotation_deg": 0},
                    {"type": "sink", "x": round(col1_w + col2_w * 0.5, 2), "y": round(bath_y + bath_d - 0.6, 2), "rotation_deg": 180},
                ],
                "windows": [{"wall": "E", "offset": 0.8, "width": 0.6, "height": 0.6, "sill_m": 1.8}],
                "zone": "Wet",
            })
            doors.append({"from": "Living & Dining", "to": "Bathroom", "x": round(col1_w, 2), "y": round(bath_y + 0.8, 2), "width": 0.8})

        else:
            # 2BHK or 3BHK: Bedroom 2 + Bathroom suite
            bed2_y = round(kitch_d + 0.3, 2)
            bed2_d = round(mbr_d * 0.65, 2)
            bath_d = round(d - (bed2_y + bed2_d) - 0.3, 2)

            rooms.append({
                "name": "Bedroom 2",
                "rect": {"x": round(col1_w + 0.2, 2), "y": bed2_y, "w": col2_w, "h": bed2_d},
                "floor": "hardwood",
                "wall_color": [0.94, 0.95, 0.92, 1],
                "furniture": [
                    {"type": "bed_single", "x": round(col1_w + col2_w * 0.5, 2), "y": round(bed2_y + bed2_d * 0.5, 2), "rotation_deg": 0},
                    {"type": "study_desk", "x": round(col1_w + 0.6, 2), "y": round(bed2_y + 0.6, 2), "rotation_deg": 0},
                ],
                "windows": [{"wall": "E", "offset": 1.0, "width": 1.5, "height": 1.4, "sill_m": 0.9}],
                "zone": "Private",
            })
            doors.append({"from": "Living & Dining", "to": "Bedroom 2", "x": round(col1_w, 2), "y": round(bed2_y + 0.8, 2), "width": 0.85})

            # Common / Master Bathroom
            bath_y = round(bed2_y + bed2_d + 0.2, 2)
            rooms.append({
                "name": "Bathroom",
                "rect": {"x": round(col1_w + 0.2, 2), "y": bath_y, "w": col2_w, "h": bath_d},
                "floor": "slate_gray",
                "wall_color": [0.92, 0.92, 0.92, 1],
                "furniture": [
                    {"type": "toilet", "x": round(col1_w + col2_w * 0.5, 2), "y": round(bath_y + 0.6, 2), "rotation_deg": 0},
                    {"type": "sink", "x": round(col1_w + col2_w * 0.5, 2), "y": round(bath_y + bath_d - 0.5, 2), "rotation_deg": 180},
                ],
                "windows": [{"wall": "E", "offset": 0.6, "width": 0.6, "height": 0.6, "sill_m": 1.8}],
                "zone": "Wet",
            })
            doors.append({"from": "Master Bedroom", "to": "Bathroom", "x": round(col1_w, 2), "y": round(bath_y + 0.6, 2), "width": 0.8})

        return rooms, doors

    # -------------------------------------------------------------------------
    # LAYOUT SOLVER: Vastu Shastra 9-Grid (Vastu Enabled)
    # -------------------------------------------------------------------------
    def _solve_vastu_layout(self, w: float, d: float) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Arranges rooms aligned to Vedic 9-zone Manduka Mandala (Ishanya, Agni, Nairutya, Vayu)."""
        rooms: List[Dict[str, Any]] = []
        doors: List[Dict[str, Any]] = []

        mid_x = round(w * 0.54, 2)
        mid_y = round(d * 0.50, 2)

        # NE Zone: Living & Dining (Ishanya / Positive Daylight)
        liv_w = round(mid_x - 0.2, 2)
        liv_d = round(mid_y - 0.2, 2)
        rooms.append({
            "name": "Living & Dining",
            "rect": {"x": 0.2, "y": 0.2, "w": liv_w, "h": liv_d},
            "floor": "oak_parquet",
            "wall_color": [0.96, 0.95, 0.92, 1],
            "furniture": [
                {"type": "sofa", "x": round(liv_w * 0.45, 2), "y": round(liv_d * 0.65, 2), "rotation_deg": 0},
                {"type": "coffee_table", "x": round(liv_w * 0.45, 2), "y": round(liv_d * 0.45, 2), "rotation_deg": 0},
                {"type": "tv_unit", "x": round(liv_w * 0.45, 2), "y": 0.5, "rotation_deg": 0},
                {"type": "dining_table", "x": round(liv_w * 0.8, 2), "y": round(liv_d * 0.5, 2), "rotation_deg": 0},
                {"type": "ceiling_fan", "x": round(liv_w * 0.45, 2), "y": round(liv_d * 0.5, 2), "rotation_deg": 0},
            ],
            "windows": [{"wall": "N", "offset": 1.5, "width": 2.2, "height": 1.4, "sill_m": 0.9}],
            "zone": "NE",
        })

        # SE Zone: Kitchen (Agni Corner - Fire & Thermal Dissipation)
        kitch_w = round(w - mid_x - 0.2, 2)
        kitch_d = round(mid_y - 0.2, 2)
        rooms.append({
            "name": "Kitchen",
            "rect": {"x": mid_x, "y": 0.2, "w": kitch_w, "h": kitch_d},
            "floor": "ceramic_tile",
            "wall_color": [0.93, 0.93, 0.91, 1],
            "furniture": [
                {"type": "kitchen_counter", "x": round(mid_x + kitch_w - 0.5, 2), "y": 1.2, "rotation_deg": 90},
                {"type": "fridge", "x": round(mid_x + 0.6, 2), "y": 0.6, "rotation_deg": 0},
            ],
            "windows": [{"wall": "E", "offset": 1.2, "width": 1.4, "height": 1.2, "sill_m": 1.0}],
            "zone": "SE",
        })
        doors.append({"from": "Living & Dining", "to": "Kitchen", "x": mid_x, "y": 1.2, "width": 0.9})

        # SW Zone: Master Bedroom (Nairutya - Stability & Thermal Mass Protection)
        mbr_y = round(mid_y + 0.2, 2)
        mbr_d = round(d - mbr_y - 0.2, 2)
        rooms.append({
            "name": "Master Bedroom",
            "rect": {"x": 0.2, "y": mbr_y, "w": liv_w, "h": mbr_d},
            "floor": "hardwood",
            "wall_color": [0.95, 0.94, 0.91, 1],
            "furniture": [
                {"type": "bed_double", "x": round(liv_w * 0.45, 2), "y": round(mbr_y + mbr_d * 0.55, 2), "rotation_deg": 0},
                {"type": "wardrobe", "x": 0.6, "y": round(mbr_y + mbr_d * 0.35, 2), "rotation_deg": 90},
                {"type": "ceiling_fan", "x": round(liv_w * 0.45, 2), "y": round(mbr_y + mbr_d * 0.5, 2), "rotation_deg": 0},
            ],
            "windows": [{"wall": "S", "offset": 1.2, "width": 1.8, "height": 1.4, "sill_m": 0.9}],
            "zone": "SW",
        })
        doors.append({"from": "Living & Dining", "to": "Master Bedroom", "x": round(liv_w * 0.5, 2), "y": mbr_y, "width": 0.9})

        # NW Zone: Bedroom 2 / Guest (Vayu - Air Circulation)
        bed2_d = round(mbr_d * 0.65, 2)
        rooms.append({
            "name": "Bedroom 2",
            "rect": {"x": mid_x, "y": mbr_y, "w": kitch_w, "h": bed2_d},
            "floor": "hardwood",
            "wall_color": [0.94, 0.95, 0.93, 1],
            "furniture": [
                {"type": "bed_single", "x": round(mid_x + kitch_w * 0.5, 2), "y": round(mbr_y + bed2_d * 0.5, 2), "rotation_deg": 0},
                {"type": "study_desk", "x": round(mid_x + 0.6, 2), "y": round(mbr_y + 0.6, 2), "rotation_deg": 0},
            ],
            "windows": [{"wall": "W", "offset": 1.0, "width": 1.5, "height": 1.4, "sill_m": 0.9}],
            "zone": "NW",
        })
        doors.append({"from": "Living & Dining", "to": "Bedroom 2", "x": mid_x, "y": round(mbr_y + 0.8, 2), "width": 0.85})

        # Bathroom (West zone)
        bath_y = round(mbr_y + bed2_d + 0.2, 2)
        bath_d = round(d - bath_y - 0.2, 2)
        rooms.append({
            "name": "Bathroom",
            "rect": {"x": mid_x, "y": bath_y, "w": kitch_w, "h": bath_d},
            "floor": "slate_gray",
            "wall_color": [0.91, 0.91, 0.91, 1],
            "furniture": [
                {"type": "toilet", "x": round(mid_x + kitch_w * 0.5, 2), "y": round(bath_y + 0.5, 2), "rotation_deg": 0},
                {"type": "sink", "x": round(mid_x + kitch_w * 0.5, 2), "y": round(bath_y + bath_d - 0.5, 2), "rotation_deg": 180},
            ],
            "windows": [{"wall": "W", "offset": 0.6, "width": 0.6, "height": 0.6, "sill_m": 1.8}],
            "zone": "W",
        })
        doors.append({"from": "Living & Dining", "to": "Bathroom", "x": mid_x, "y": round(bath_y + 0.5, 2), "width": 0.8})

        return rooms, doors

    # -------------------------------------------------------------------------
    # STRUCTURED GEOMETRY JSON SYNTHESIS (CAD / CFD Ready)
    # -------------------------------------------------------------------------
    def _build_structured_geometry(self, rooms: List[Dict[str, Any]], doors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Constructs parametric 3D CAD/CFD boundary geometry."""
        w = self.width_m
        d = self.depth_m
        h = self.wall_height_m
        th_ext = self.wall_ext_m
        th_int = self.wall_int_m

        # 4 Outer Envelope Perimeter Walls
        exterior_walls = [
            {"id": "WALL_EXT_N", "orientation": "N", "start": [0.0, 0.0], "end": [w, 0.0], "thickness_m": th_ext, "height_m": h},
            {"id": "WALL_EXT_E", "orientation": "E", "start": [w, 0.0], "end": [w, d], "thickness_m": th_ext, "height_m": h},
            {"id": "WALL_EXT_S", "orientation": "S", "start": [w, d], "end": [0.0, d], "thickness_m": th_ext, "height_m": h},
            {"id": "WALL_EXT_W", "orientation": "W", "start": [0.0, d], "end": [0.0, 0.0], "thickness_m": th_ext, "height_m": h},
        ]

        # Interior Walls derived from room separation lines
        interior_walls = []
        for i, room in enumerate(rooms):
            rx, ry = room["rect"]["x"], room["rect"]["y"]
            rw, rd = room["rect"]["w"], room["rect"]["h"]
            interior_walls.append({
                "id": f"WALL_INT_{i}_H",
                "start": [rx, round(ry + rd, 2)],
                "end": [round(rx + rw, 2), round(ry + rd, 2)],
                "thickness_m": th_int,
                "height_m": h,
            })

        # Windows gathered from room specifications
        windows_list = []
        win_idx = 1
        for room in rooms:
            for win in room.get("windows", []):
                wall_dir = win.get("wall", "N")
                windows_list.append({
                    "id": f"WIN_{win_idx}_{room['name'].replace(' ', '_')}",
                    "room": room["name"],
                    "wall_orientation": wall_dir,
                    "width_m": win["width"],
                    "height_m": win["height"],
                    "sill_height_m": win.get("sill_m", 0.9),
                    "offset_m": win.get("offset", 1.0),
                })
                win_idx += 1

        # Doors formatted with CAD coordinates
        doors_list = []
        for i, door in enumerate(doors):
            doors_list.append({
                "id": f"DOOR_{i+1}",
                "from_room": door.get("from", "Living"),
                "to_room": door.get("to", "Room"),
                "width_m": door.get("width", 0.9),
                "height_m": 2.1,
                "x": door.get("x", 0.0),
                "y": door.get("y", 0.0),
            })

        return {
            "house": {
                "name": self.name,
                "project_id": self.project_id,
                "width_m": w,
                "depth_m": d,
                "height_m": h,
                "builtup_area_m2": round(w * d, 2),
                "builtup_area_sqft": round(w * d * 10.7639, 1),
                "bhk": self.bhk,
                "facing": self.facing,
                "apply_vastu": self.apply_vastu,
            },
            "exterior_walls": exterior_walls,
            "interior_walls": interior_walls,
            "rooms": [
                {
                    "id": f"ROOM_{idx}",
                    "name": r["name"],
                    "bounds": {"x": r["rect"]["x"], "y": r["rect"]["y"], "width": r["rect"]["w"], "depth": r["rect"]["h"]},
                    "floor_area_m2": round(r["rect"]["w"] * r["rect"]["h"], 2),
                    "zone": r.get("zone", "Living"),
                    "design_temp_comfort_c": 25.5,
                }
                for idx, r in enumerate(rooms)
            ],
            "doors": doors_list,
            "windows": windows_list,
        }

    def _generate_fallback_svg(self, rooms: List[Dict[str, Any]]) -> str:
        """Fallback SVG rendering in case detailed generator is missing."""
        scale = 35
        svg_w = int(self.width_m * scale + 80)
        svg_h = int(self.depth_m * scale + 80)
        lines = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_w} {svg_h}" width="{svg_w}" height="{svg_h}">',
            f'<rect width="{svg_w}" height="{svg_h}" fill="#FBF8F5"/>',
            f'<rect x="40" y="40" width="{self.width_m * scale}" height="{self.depth_m * scale}" fill="#FFFFFF" stroke="#1C1F22" stroke-width="4"/>',
        ]
        for r in rooms:
            rx = 40 + r["rect"]["x"] * scale
            ry = 40 + r["rect"]["y"] * scale
            rw = r["rect"]["w"] * scale
            rh = r["rect"]["h"] * scale
            lines.append(f'<rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" fill="#FFFDF9" stroke="#555" stroke-width="1.5"/>')
            lines.append(f'<text x="{rx + rw/2}" y="{ry + rh/2}" font-family="sans-serif" font-size="12" fill="#222" text-anchor="middle">{r["name"]}</text>')
        lines.append('</svg>')
        return '\n'.join(lines)

    def _update_viewer_manifest(self, prop: dict, layout: dict, vastu: dict) -> None:
        """Updates demo/viewer/projects-data.js so Three.js viewer can instantly render 3D."""
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

        filtered_projects = [p for p in existing_data.get("projects", []) if p.get("id") != self.project_id]

        new_entry = {
            "id": self.project_id,
            "property": prop,
            "layout": layout,
            "vastu": vastu,
            "astro": {},
            "assets": {
                "hero": f"../output/{self.project_id}/floor-plan.svg",
                "floorPlan": f"../output/{self.project_id}/floor-plan.svg",
            },
        }
        filtered_projects.insert(0, new_entry)
        existing_data["projects"] = filtered_projects

        projects_data_path.write_text(
            "// Auto-generated by ThermaBuild\n"
            f"window.CAD_PROJECTS = {json.dumps(existing_data, indent=2)};\n"
        )


def generate_house_layout(
    project_id: str = "project-custom",
    width_m: Optional[float] = None,
    depth_m: Optional[float] = None,
    facing: str = "E",
    bhk: int = 2,
    area_sqft: float = 1000.0,
    apply_vastu: bool = False,
    name: str = "Custom House",
    **kwargs: Any,
) -> Dict[str, Any]:
    """Top-level convenience factory function for the layout engine."""
    engine = ParametricLayoutGenerator(
        area_sqft=area_sqft,
        bhk=bhk,
        facing=facing,
        apply_vastu=apply_vastu,
        width_m=width_m,
        depth_m=depth_m,
        project_id=project_id,
        name=name,
    )
    return engine.generate()


if __name__ == "__main__":
    res = generate_house_layout(area_sqft=800, bhk=2, facing="E", apply_vastu=False)
    print(f"Generated layout: {res['name']} ({res['dimensions']}), {res['rooms_count']} rooms.")
    print(f"Geometry JSON written to: {res['geometry_json_path']}")
