#!/usr/bin/env python3
"""
End-to-End Test Suite for ThermaBuild Engineering Pipeline.
Verifies all 8 modular stages.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import climate
import freecad_generator
import layout_generator
import material_model
import pyfluent_engine
import report_generator
import thermal_engine


def test_e2e_pipeline():
    print("=== [1/8] Testing Climate API ===")
    clim = climate.generate_diurnal_weather("composite")
    assert clim["climate_profile"]["city"] == "New Delhi"
    assert len(clim["hourly_weather"]) == 24
    print("✓ Climate API passed.")

    print("\n=== [2/8] Testing Functional 2D Space Planner (Vastu Disabled) ===")
    layout_func = layout_generator.generate_house_layout(
        project_id="test-functional",
        area_sqft=800,
        bhk=2,
        facing="E",
        apply_vastu=False,
        name="Functional 2BHK Test",
    )
    assert layout_func["status"] == "success"
    assert layout_func["bhk"] == 2
    assert Path(layout_func["geometry_json_path"]).exists()
    print("✓ Functional Space Planner passed.")

    print("\n=== [3/8] Testing Vastu 2D Space Planner (Vastu Enabled) ===")
    layout_vastu = layout_generator.generate_house_layout(
        project_id="test-vastu",
        area_sqft=1200,
        bhk=3,
        facing="E",
        apply_vastu=True,
        name="Vastu 3BHK Test",
    )
    assert layout_vastu["status"] == "success"
    assert layout_vastu["vastu_summary"]["applied"] is True
    print("✓ Vastu Space Planner passed.")

    print("\n=== [4/8] Testing Hybrid Material Model ===")
    mats = material_model.recommend_materials_for_house("composite")
    rec_wall = mats["recommended_materials"]["wall"]["name"]
    rec_roof = mats["recommended_materials"]["roof"]["name"]
    reduction = mats["energy_metrics"]["heat_transmission_reduction_pct"]
    assert "AAC" in rec_wall or "Cavity" in rec_wall
    assert reduction > 50.0
    print(f"✓ Material Model passed: {rec_wall} + {rec_roof} (-{reduction}% heat transmission).")

    print("\n=== [5/8] Testing FreeCAD Python & STEP Generation ===")
    cad = freecad_generator.generate_cad_for_project(
        geometry_path_or_dict=layout_func["geometry"],
        project_id="test-functional",
        materials=mats,
    )
    assert Path(cad["freecad_script"]).exists()
    assert Path(cad["step_model_path"]).exists()
    print("✓ FreeCAD Generator passed: generate_cad.py & house.step verified.")

    print("\n=== [6/8] Testing Fast Preliminary Thermal Model ===")
    fast = thermal_engine.run_fast_thermal_simulation(
        climate_zone="composite",
        facing="E",
        geometry=layout_func["geometry"],
    )
    m = fast["metrics"]
    assert m["cooling_load_reduction_pct"] > 50.0
    assert m["indoor_temp_delta_c"] > 3.0
    print(f"✓ Fast Thermal Model passed: ΔT = {m['indoor_temp_delta_c']} °C, Cooling Drop = {m['cooling_load_reduction_pct']} %.")

    print("\n=== [7/8] Testing PyFluent Dual-Mode CFD Engine ===")
    cfd = pyfluent_engine.run_fluent_validation(
        step_file_path=cad["step_model_path"],
        project_id="test-functional",
        climate_zone="composite",
    )
    assert len(cfd["stages"]) == 10
    assert cfd["cfd_results"]["airflow_patterns"]["air_changes_per_hour_ach"] > 2.0
    assert Path(cfd["pyfluent_script"]).exists()
    assert Path(cfd["fluent_journal"]).exists()
    print(f"✓ PyFluent Engine passed: 10 stages verified ({cfd['execution_label']}).")

    print("\n=== [8/8] Testing Dynamic 3-Way Comparative Dossier ===")
    rep = report_generator.generate_executive_report(
        project_id="test-functional",
        layout_data=layout_func,
        material_data=mats,
        fast_thermal_data=fast,
        cfd_data=cfd,
    )
    assert Path(rep["json_path"]).exists()
    assert Path(rep["html_path"]).exists()
    print("✓ Report Generator passed: executive_dossier.html generated.")

    print("\n=======================================================")
    print("🎉 ALL 8 MODULAR PIPELINE STAGES PASSED SUCCESSFULLY!")
    print("=======================================================")


if __name__ == "__main__":
    test_e2e_pipeline()
