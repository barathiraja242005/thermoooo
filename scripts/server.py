#!/usr/bin/env python3
"""
ThermaBuild Unified Backend Server.
Serves the modern SaaS interface and provides future-proof REST APIs for:
1. Procedural 2D/3D house plan generation
2. Real-time microclimate intelligence (Open-Meteo API + EPW data)
3. Lumped parameter & PyFluent CFD thermal simulation
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict

import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from layout_generator import generate_house_layout  # noqa: E402
from thermal_engine import (  # noqa: E402
    REGIONAL_CLIMATE,
    ClimateConditions,
    PyFluentBridge,
    get_material_recommendations,
    run_diurnal_simulation,
)

app = Flask(__name__, static_folder=str(ROOT))
CORS(app)

pyfluent_bridge = PyFluentBridge()


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
    freecad_path = "/Applications/FreeCAD.app"
    blender_path = "/Applications/Blender.app"
    return jsonify({
        "status": "healthy",
        "service": "ThermaBuild CAD & Thermal Platform",
        "python_version": sys.version.split()[0],
        "freecad_installed": Path(freecad_path).exists(),
        "blender_installed": Path(blender_path).exists(),
        "pyfluent": pyfluent_bridge.check_availability(),
    })


@app.route("/api/climate", methods=["POST"])
def get_climate():
    data = request.get_json() or {}
    city_key = data.get("city_key", "delhi").lower()
    lat = data.get("latitude", 28.6139)
    lon = data.get("longitude", 77.2090)

    # Use regional base if exists
    climate_obj = REGIONAL_CLIMATE.get(city_key, REGIONAL_CLIMATE["delhi"])

    # Try live Open-Meteo fetch
    live_data: Dict[str, Any] = {}
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,direct_normal_irradiance&forecast_days=1"
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200:
            h = resp.json().get("hourly", {})
            temps = h.get("temperature_2m", [])
            hums = h.get("relative_humidity_2m", [])
            winds = h.get("wind_speed_10m", [])
            solars = h.get("direct_normal_irradiance", [])
            if temps:
                live_data = {
                    "peak_temp_c": round(max(temps), 1),
                    "min_temp_c": round(min(temps), 1),
                    "mean_humidity": round(sum(hums) / len(hums)),
                    "mean_wind": round(sum(winds) / len(winds), 1),
                    "peak_solar": round(max(solars), 1) if solars else climate_obj.solar_peak_w_m2,
                }
    except Exception:
        pass

    peak_t = live_data.get("peak_temp_c", climate_obj.peak_temp_c)
    min_t = live_data.get("min_temp_c", climate_obj.min_temp_c)

    return jsonify({
        "city": climate_obj.city,
        "zone": climate_obj.zone,
        "peak_temp_c": peak_t,
        "min_temp_c": min_t,
        "solar_peak_w_m2": live_data.get("peak_solar", climate_obj.solar_peak_w_m2),
        "wind_speed_m_s": live_data.get("mean_wind", climate_obj.wind_speed_m_s),
        "wind_dir": climate_obj.wind_dir,
        "humidity_pct": live_data.get("mean_humidity", climate_obj.humidity_pct),
        "latitude": lat,
        "longitude": lon,
        "live_api_active": bool(live_data),
    })


@app.route("/api/generate", methods=["POST"])
def generate_plan_and_simulate():
    req = request.get_json() or {}

    city_key = req.get("city_key", "delhi").lower()
    city_name = req.get("city_name", "New Delhi")
    lat = float(req.get("latitude", 28.6139))
    lon = float(req.get("longitude", 77.2090))
    width_m = float(req.get("width_m", 12.0))
    depth_m = float(req.get("depth_m", 10.0))
    facing = req.get("facing", "E").upper()
    bhk = int(req.get("bhk", 3))
    floors = req.get("floors", "G+1")
    typology = req.get("typology", "villa")
    passive_options = req.get("passive_options", {"vastu": True, "night_purge": True, "overhang": True})

    project_id = f"project-custom-{facing.lower()}-{bhk}bhk"

    # 1. Generate 2D Plan & 3D Spatial Bundle
    layout_res = generate_house_layout(
        project_id=project_id,
        width_m=width_m,
        depth_m=depth_m,
        facing=facing,
        bhk=bhk,
        typology=typology,
        city=city_name,
        latitude=lat,
        longitude=lon,
        passive_options=passive_options,
    )

    # 2. Get Microclimate Data
    clim_base = REGIONAL_CLIMATE.get(city_key, REGIONAL_CLIMATE["delhi"])
    clim_cond = ClimateConditions(
        city=city_name,
        zone=clim_base.zone,
        peak_temp_c=clim_base.peak_temp_c,
        min_temp_c=clim_base.min_temp_c,
        solar_peak_w_m2=clim_base.solar_peak_w_m2,
        wind_speed_m_s=clim_base.wind_speed_m_s,
        wind_dir=clim_base.wind_dir,
        humidity_pct=clim_base.humidity_pct,
        latitude=lat,
        longitude=lon,
    )

    # 3. Prescriptive Material Schedule
    materials = get_material_recommendations(clim_cond.zone)

    # 4. Diurnal Simulation
    sim_res = run_diurnal_simulation(clim_cond, materials, passive_options)

    return jsonify({
        "status": "ok",
        "project_id": project_id,
        "layout": layout_res,
        "climate": {
            "city": clim_cond.city,
            "zone": clim_cond.zone,
            "peak_temp_c": clim_cond.peak_temp_c,
            "solar_peak_w_m2": clim_cond.solar_peak_w_m2,
            "wind_speed_m_s": clim_cond.wind_speed_m_s,
            "wind_dir": clim_cond.wind_dir,
            "humidity_pct": clim_cond.humidity_pct,
        },
        "materials": materials,
        "simulation": sim_res,
        "viewer_3d_url": "viewer/index.html",
        "floor_plan_viewer_url": "floor-plan-viewer/index.html",
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8765))
    print(f"🚀 ThermaBuild API & Web Server running at http://localhost:{port}/demo/index.html")
    app.run(host="0.0.0.0", port=port, debug=False)
