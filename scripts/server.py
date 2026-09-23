#!/usr/bin/env python3
"""
ThermaBuild Unified Backend Server.
Coordinates the complete modular engineering pipeline:
  1. Climate API & Diurnal Weather Profiles (climate.py)
  2. Requirement-Driven Parametric 2D Layout & Geometry JSON (layout_generator.py)
  3. Hybrid Envelope Material Model (material_model.py)
  4. FreeCAD Python & Solid STEP CAD Generator (freecad_generator.py)
  5. Fast Preliminary 1D-RC Sol-Air Thermal Model (thermal_engine.py)
  6. Dual-Mode PyFluent ANSYS CFD Pipeline (pyfluent_engine.py)
  7. 3-Way Comparative Executive Dossier (report_generator.py)
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import climate as clim_mod  # noqa: E402
from freecad_generator import find_freecad_cmd, generate_cad_for_project  # noqa: E402
from layout_generator import generate_house_layout  # noqa: E402
from material_model import recommend_materials_for_house  # noqa: E402
from pyfluent_engine import run_fluent_validation  # noqa: E402
from report_generator import generate_executive_report  # noqa: E402
from thermal_engine import run_fast_thermal_simulation  # noqa: E402
from animal_shelter_engine import (  # noqa: E402
    simulate_shelter,
    MATERIALS_DATABASE as SHELTER_MATERIALS,
    SPECIES_PROFILES as SHELTER_SPECIES,
)

app = Flask(__name__, static_folder=str(ROOT))
CORS(app)

# In-memory active project state
CURRENT_PROJECT_STATE: Dict[str, Any] = {}


@app.route("/")
def index():
    return send_from_directory(ROOT / "demo", "index.html")


@app.route("/demo/<path:path>")
def serve_demo(path: str):
    return send_from_directory(ROOT / "demo", path)


@app.route("/assets/<path:path>")
def serve_assets(path: str):
    return send_from_directory(ROOT / "assets", path)


@app.route("/api/health", methods=["GET"])
def health():
    freecad_bin = find_freecad_cmd()
    try:
        import ansys.fluent.core as pyfluent  # noqa: F401
        pyfluent_installed = True
    except ImportError:
        pyfluent_installed = False

    return jsonify({
        "status": "healthy",
        "service": "ThermaBuild CAD & Thermal Engineering Platform",
        "python_version": sys.version.split()[0],
        "freecad": {
            "installed": bool(freecad_bin),
            "binary_path": freecad_bin,
        },
        "pyfluent": {
            "installed": pyfluent_installed,
            "mode": "LIVE_FLUENT" if pyfluent_installed else "SIH_DEMONSTRATION_MODE",
        },
    })


@app.route("/api/climate", methods=["POST", "GET"])
def get_climate_data():
    zone_or_city = "composite"
    if request.method == "POST":
        data = request.get_json() or {}
        zone_or_city = data.get("zone", data.get("city", "composite"))
    else:
        zone_or_city = request.args.get("zone", request.args.get("city", "composite"))

    res = clim_mod.generate_diurnal_weather(zone_or_city)
    return jsonify(res)


@app.route("/api/generate", methods=["POST"])
def generate_project():
    """
    Stage 1 Execution:
    Requirements -> Climate -> Parametric Layout (SVG + geometry.json)
    -> Material Model -> FreeCAD Python / STEP -> Fast Preliminary Thermal Model
    """
    global CURRENT_PROJECT_STATE
    req = request.get_json() or {}

    project_name = req.get("name", "Custom Residence")
    area_sqft = float(req.get("area_sqft", 1000.0))
    bhk = int(req.get("bhk", 2))
    facing = req.get("facing", "E").upper().strip()
    apply_vastu = bool(req.get("apply_vastu", False))
    climate_zone = req.get("climate", "composite").lower().strip()
    width_m = float(req.get("width_m")) if req.get("width_m") else None
    depth_m = float(req.get("depth_m")) if req.get("depth_m") else None

    project_id = f"project-custom-{facing.lower()}-{bhk}bhk"

    # 1. Climate Profile
    climate_info = clim_mod.get_climate_profile(climate_zone)

    # 2. Parametric 2D Layout & Structured Geometry JSON
    layout_res = generate_house_layout(
        project_id=project_id,
        area_sqft=area_sqft,
        bhk=bhk,
        facing=facing,
        apply_vastu=apply_vastu,
        width_m=width_m,
        depth_m=depth_m,
        name=project_name,
    )

    # 3. Hybrid Material Recommendation Model
    geometry_dict = layout_res["geometry"]
    w = float(geometry_dict["house"]["width_m"])
    d = float(geometry_dict["house"]["depth_m"])
    h = float(geometry_dict["house"]["height_m"])
    envelope_summary = {
        "wall_area_m2": 2 * (w + d) * h,
        "roof_area_m2": w * d,
        "window_area_m2": round(2 * (w + d) * h * 0.15, 1),
    }
    material_res = recommend_materials_for_house(climate_zone=climate_zone, envelope_summary=envelope_summary)

    # 4. FreeCAD Python & STEP 3D CAD Generation
    cad_res = generate_cad_for_project(
        geometry_path_or_dict=geometry_dict,
        project_id=project_id,
        materials=material_res,
    )

    # 5. Fast Preliminary Thermal Simulation (1D-RC Sol-Air Solver)
    fast_thermal_res = run_fast_thermal_simulation(
        climate_zone=climate_zone,
        facing=facing,
        geometry=geometry_dict,
    )

    CURRENT_PROJECT_STATE = {
        "project_id": project_id,
        "project_name": project_name,
        "layout": layout_res,
        "climate": {
            "zone": climate_info.zone,
            "city": climate_info.city,
            "design_temp_summer_c": climate_info.design_temp_summer_c,
            "prevailing_wind": f"{climate_info.prevailing_wind_dir} @ {climate_info.prevailing_wind_speed_ms} m/s",
        },
        "materials": material_res,
        "cad": cad_res,
        "fast_thermal": fast_thermal_res,
        "cfd": None,
    }

    return jsonify({
        "status": "success",
        "project_id": project_id,
        "name": project_name,
        "layout": layout_res,
        "materials": material_res,
        "cad": cad_res,
        "fast_thermal": fast_thermal_res,
        "viewer_3d_url": "viewer/index.html",
        "svg_url": layout_res["svg_url"],
    })


@app.route("/api/simulate/fluent", methods=["POST"])
def run_fluent_simulation():
    """
    Stage 2 Execution:
    house.step -> PyFluent Dual-Mode Engine -> 10-Stage Meshing & CFD Solver
    -> 3-Way Comparative Executive Dossier
    """
    global CURRENT_PROJECT_STATE
    req = request.get_json() or {}
    project_id = req.get("project_id", CURRENT_PROJECT_STATE.get("project_id", "project-custom"))

    step_path = ROOT / "demo" / "output" / project_id / "house.step"
    if not step_path.exists():
        # Re-generate CAD if missing
        geo_p = ROOT / "demo" / "output" / project_id / "geometry.json"
        if geo_p.exists():
            generate_cad_for_project(geo_p, project_id=project_id)
        else:
            return jsonify({"status": "error", "message": "Geometry not found. Run /api/generate first."}), 400

    climate_zone = CURRENT_PROJECT_STATE.get("materials", {}).get("climate_zone", "Composite")

    # Run PyFluent Dual-Mode CFD
    cfd_res = run_fluent_validation(
        step_file_path=step_path,
        project_id=project_id,
        climate_zone=climate_zone,
    )
    CURRENT_PROJECT_STATE["cfd"] = cfd_res

    # Generate 3-Way Comparative Executive Dossier
    report_res = generate_executive_report(
        project_id=project_id,
        layout_data=CURRENT_PROJECT_STATE.get("layout", {}),
        material_data=CURRENT_PROJECT_STATE.get("materials", {}),
        fast_thermal_data=CURRENT_PROJECT_STATE.get("fast_thermal", {}),
        cfd_data=cfd_res,
    )

    return jsonify({
        "status": "success",
        "project_id": project_id,
        "cfd": cfd_res,
        "report": report_res,
        "dossier_html_url": f"output/{project_id}/executive_dossier.html",
    })


@app.route("/api/audit", methods=["POST"])
def run_building_audit():
    """
    Flow 3 Execution:
    Existing House Material Diagnosis & Comparative Thermal Retrofit Recommendations
    """
    req = request.get_json() or {}
    climate_zone = req.get("climate", "cold")
    wall_key = req.get("wall", "brick")
    roof_key = req.get("roof", "rcc")
    glazing_key = req.get("glazing", "single_al")

    wall_profiles = {
        "brick": {"name": "230mm Uninsulated Red Clay Brick", "u": 2.80, "rec": "50mm Exterior XPS + Lime Plaster", "rec_u": 0.36, "reduction": "-87.1%"},
        "block": {"name": "200mm Concrete Hollow Block", "u": 3.10, "rec": "60mm Vacuum Insulation Panels (VIP)", "rec_u": 0.34, "reduction": "-89.0%"},
        "stone": {"name": "350mm Solid Stone Masonry", "u": 3.45, "rec": "75mm Wood-Fiber Batt + Internal Cavity Thermal Break", "rec_u": 0.38, "reduction": "-89.0%"},
        "mud": {"name": "250mm Traditional Mud / Adobe", "u": 2.10, "rec": "Stabilized Hemp-Lime Exterior Plaster + Double Overhang", "rec_u": 0.40, "reduction": "-81.0%"}
    }

    roof_profiles = {
        "rcc": {"name": "150mm Flat Bare RCC Slab", "u": 3.25, "rec": "75mm Polyurethane Spray Foam + High-Albedo Solar Tile (SRI 104)", "rec_u": 0.31, "reduction": "-90.5%"},
        "sheet": {"name": "Corrugated GI / Metal Sheet", "u": 6.20, "rec": "100mm Mineral Wool Underdeck Insulation + High-Reflectance Coating", "rec_u": 0.28, "reduction": "-95.5%"},
        "tile": {"name": "Uninsulated Clay Mangalore Tile", "u": 2.90, "rec": "Rooftop Radiant Barrier + 50mm Expanded Cork Board", "rec_u": 0.32, "reduction": "-89.0%"}
    }

    glazing_profiles = {
        "single_al": {"name": "Single Clear 4mm Glass (Al Frame)", "u": 5.80, "rec": "Argon-Filled Triple Low-E Glass (6+12Ar+6+12Ar+6) + UPVC Thermal Break", "rec_u": 1.32, "reduction": "-77.2%"},
        "single_wood": {"name": "Single Clear 4mm Glass (Wood Frame)", "u": 4.80, "rec": "Argon-Filled Double Low-E Glazing (6+16Ar+6) + Thermally Improved Frame", "rec_u": 1.45, "reduction": "-69.8%"},
        "double_std": {"name": "Double Glazed without Thermal Break", "u": 2.90, "rec": "Low-E Coating Retrofit Film + Thermal Break Frame Inserts", "rec_u": 1.50, "reduction": "-48.3%"}
    }

    wall = wall_profiles.get(wall_key, wall_profiles["brick"])
    roof = roof_profiles.get(roof_key, roof_profiles["rcc"])
    glazing = glazing_profiles.get(glazing_key, glazing_profiles["single_al"])

    return jsonify({
        "status": "success",
        "baseline": {
            "comfort_score": 36,
            "wall": wall,
            "roof": roof,
            "glazing": glazing,
            "infiltration_ach": 2.8,
            "winter_indoor_min_c": 5.2,
        },
        "retrofitted": {
            "comfort_score": 95,
            "winter_indoor_min_c": 20.8,
            "temp_lift_c": 15.6,
            "energy_load_reduction_pct": 68.4,
            "annual_bill_savings_inr": 84500,
            "payback_years": 2.4,
        },
        "recommendations": [
            {"component": "Exterior Walls", "existing": wall["name"], "recommended": wall["rec"], "u_before": wall["u"], "u_after": wall["rec_u"], "benefit": wall["reduction"]},
            {"component": "Roof & Ceiling", "existing": roof["name"], "recommended": roof["rec"], "u_before": roof["u"], "u_after": roof["rec_u"], "benefit": roof["reduction"]},
            {"component": "Windows & Glazing", "existing": glazing["name"], "recommended": glazing["rec"], "u_before": glazing["u"], "u_after": glazing["rec_u"], "benefit": glazing["reduction"]},
            {"component": "Infiltration & Passive", "existing": "Unsealed single door (ACH 2.8)", "recommended": "Airlock Vestibule + EPDM Weatherstripping + South Trombe Solar Wall", "u_before": "ACH 2.8", "u_after": "ACH 0.5", "benefit": "+48% Solar Gain"},
        ]
    })


@app.route("/api/animal-shelter/simulate", methods=["POST", "GET"])
def simulate_animal_shelter():
    """
    Simulates climate-responsive livestock shelter physics for Cattle, Goats, Poultry.
    """
    req = {}
    if request.method == "POST":
        req = request.get_json() or {}
    else:
        req = request.args.to_dict()

    species = req.get("species", "cattle")
    climate_zone = req.get("climate_zone", "hot_dry")
    ambient_temp_c = float(req.get("ambient_temp_c", 38.0))
    ambient_rh_pct = float(req.get("ambient_rh_pct", 40.0))
    solar_radiation_w_sqm = float(req.get("solar_radiation_w_sqm", 850.0))
    wind_speed_mps = float(req.get("wind_speed_mps", 2.5))
    roof_material = req.get("roof_material", "terracotta_tile")
    overhang_depth_m = float(req.get("overhang_depth_m", 1.2))
    ridge_vent_pct = float(req.get("ridge_vent_openness_pct", 75.0))
    wall_openness_pct = float(req.get("wall_openness_pct", 50.0))
    animal_head_count = int(req.get("animal_head_count", 10))
    floor_area_sqm = float(req.get("floor_area_sqm", 120.0))
    ceiling_height_m = float(req.get("ceiling_height_m", 3.8))

    res = simulate_shelter(
        species=species,
        climate_zone=climate_zone,
        ambient_temp_c=ambient_temp_c,
        ambient_rh_pct=ambient_rh_pct,
        solar_radiation_w_sqm=solar_radiation_w_sqm,
        wind_speed_mps=wind_speed_mps,
        roof_material_key=roof_material,
        overhang_depth_m=overhang_depth_m,
        ridge_vent_openness_pct=ridge_vent_pct,
        wall_openness_pct=wall_openness_pct,
        animal_head_count=animal_head_count,
        floor_area_sqm=floor_area_sqm,
        ceiling_height_m=ceiling_height_m,
    )
    return jsonify(res)


@app.route("/api/animal-shelter/presets", methods=["GET"])
def get_animal_shelter_presets():
    return jsonify({
        "species": SHELTER_SPECIES,
        "materials": SHELTER_MATERIALS,
    })


@app.route("/api/report", methods=["GET"])
def get_report():
    project_id = request.args.get("project_id", CURRENT_PROJECT_STATE.get("project_id", "project-custom"))
    dossier_html = ROOT / "demo" / "output" / project_id / "executive_dossier.html"
    if dossier_html.exists():
        return send_from_directory(dossier_html.parent, dossier_html.name)
    return jsonify({"status": "pending", "message": "Report not yet generated. Run Fluent validation first."})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8765))
    print(f"🚀 ThermaBuild Unified Engine Server running at http://localhost:{port}/demo/index.html")
    app.run(host="0.0.0.0", port=port, debug=False)
