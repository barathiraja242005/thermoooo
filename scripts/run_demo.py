#!/usr/bin/env python3
"""End-to-end demo: vastu + astro + 2D plans + FreeCAD + Blender for sample properties."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "kinvastu"))
sys.path.insert(0, str(ROOT / "scripts"))

from vastu_analyzer import analyze_property  # noqa: E402

SAMPLES = ROOT / "samples"
OUTPUT = ROOT / "demo" / "output"
JYOTISH = ROOT / "tools" / "jyotish-dashboard"


def run_kinvastu_astro(owner: dict) -> dict:
    from astro_vastu.astro.calculator import AstroCalculator, is_swe_available

    calc = AstroCalculator(use_astro=True)
    result = calc.compute(
        birth_date=owner["birth_date"],
        birth_time=owner["birth_time"],
        birth_place=owner["birth_place"],
        latitude=owner["latitude"],
        longitude=owner["longitude"],
        utc_offset="+05:30",
    )
    from astro_vastu.personalized import room_placement_recommendations

    recs = room_placement_recommendations(result.lagna_sign)
    return {
        "swisseph_available": is_swe_available(),
        "lagna_sign": result.lagna_sign,
        "moon_sign": result.moon_sign,
        "used_precise_astro": result.used_vedastro,
        "messages": result.messages,
        "room_recommendations": recs,
    }


def run_jyotish_panchang(lat: float, lon: float, tz: str) -> dict:
    sys.path.insert(0, str(JYOTISH))
    from app.astrology.panchang import calculate_panchang

    today = date.today()
    pan = calculate_panchang(today, lat, lon, tz)
    return {
        "date": str(today),
        "tithi": pan.get("tithi", {}).get("name"),
        "nakshatra": pan.get("nakshatra", {}).get("name"),
        "yoga": pan.get("yoga", {}).get("name"),
        "vara": pan.get("vara", {}).get("name"),
        "rahukaal": pan.get("rahukaal"),
        "abhijit_muhurta": pan.get("abhijit_muhurta"),
    }


def run_freecad(project_id: str, property_data: dict, out_dir: Path) -> dict:
    script = ROOT / "scripts" / "freecad_build.py"
    fc = "/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd"
    if not Path(fc).exists():
        fc = "/Applications/FreeCAD.app/Contents/MacOS/FreeCAD"
    if not Path(fc).exists():
        return {"status": "skipped", "reason": "FreeCAD not installed"}
    out_dir.mkdir(parents=True, exist_ok=True)
    prop_copy = out_dir / "property.json"
    prop_copy.write_text(json.dumps(property_data, indent=2))
    env = {
        **dict(os.environ),
        "FC_PROPERTY_JSON": str(prop_copy),
        "FC_OUTPUT": str(out_dir / f"{project_id}.FCStd"),
    }
    cmd = [fc, str(script)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300, env=env)
    return {
        "status": "ok" if proc.returncode == 0 else "error",
        "file": str(out_dir / f"{project_id}.FCStd"),
        "stdout": proc.stdout[-500:] if proc.stdout else "",
        "stderr": proc.stderr[-500:] if proc.stderr else "",
    }


def run_blender(project_id: str, fcstd: Path, out_dir: Path) -> dict:
    from run_advanced_render import run_advanced

    sample_dir = SAMPLES / project_id
    if (sample_dir / "interior_layout.json").exists():
        return run_advanced(sample_dir, out_dir, quality="demo")
    # fallback basic shell render
    script = ROOT / "scripts" / "blender_render.py"
    blender = "/opt/homebrew/bin/blender"
    if not Path(blender).exists():
        blender = "/Applications/Blender.app/Contents/MacOS/Blender"
    if not Path(blender).exists():
        return {"status": "skipped", "reason": "Blender not installed"}
    png = out_dir / f"{project_id}-render.png"
    cmd = [blender, "-b", "-P", str(script), "--", str(fcstd), str(png)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    return {
        "status": "ok" if png.exists() else "error",
        "file": str(png) if png.exists() else None,
        "stderr": proc.stderr[-500:] if proc.stderr else "",
    }


def process_project(project_dir: Path) -> dict:
    prop_path = project_dir / "property.json"
    data = json.loads(prop_path.read_text())
    project_id = data["id"]
    out_dir = OUTPUT / project_id
    out_dir.mkdir(parents=True, exist_ok=True)

    vastu = analyze_property(data["rooms"])
    (out_dir / "vastu-report.json").write_text(json.dumps(vastu, indent=2))

    from generate_floor_plan import write_floor_plan

    plan_path = out_dir / "floor-plan.svg"
    write_floor_plan(prop_path, vastu, plan_path)

    astro = {}
    try:
        astro = run_kinvastu_astro(data["owner"])
    except Exception as exc:
        astro = {"error": str(exc)}
    (out_dir / "astro-vastu.json").write_text(json.dumps(astro, indent=2))

    panchang = {}
    try:
        o = data["owner"]
        panchang = run_jyotish_panchang(o["latitude"], o["longitude"], o["timezone"])
    except Exception as exc:
        panchang = {"error": str(exc)}
    (out_dir / "panchang-today.json").write_text(json.dumps(panchang, indent=2))

    fc = run_freecad(project_id, data, out_dir)
    blender = {"status": "skipped"}
    fc_path = Path(fc.get("file", ""))
    if fc.get("status") == "ok" and fc_path.exists():
        blender = run_blender(project_id, fc_path, out_dir)
    elif (SAMPLES / project_id / "interior_layout.json").exists():
        blender = run_blender(project_id, out_dir / "dummy.FCStd", out_dir)

    summary = {
        "project": data["name"],
        "facing": data["facing"],
        "vastu_score": vastu["compliance_score"],
        "vastu_grade": vastu["grade"],
        "issues_count": len(vastu["issues"]),
        "lagna_sign": astro.get("lagna_sign"),
        "outputs": {
            "floor_plan_svg": str(plan_path),
            "vastu_report": str(out_dir / "vastu-report.json"),
            "astro_vastu": str(out_dir / "astro-vastu.json"),
            "panchang": str(out_dir / "panchang-today.json"),
            "freecad": fc,
            "blender_render": blender,
            "advanced_render": blender if blender.get("files") else None,
        },
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    layout_src = project_dir / "interior_layout.json"
    if layout_src.exists():
        (out_dir / "interior_layout.json").write_text(layout_src.read_text())

    return summary


def main() -> int:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    projects = sorted(SAMPLES.glob("project-*"))
    if not projects:
        print("No sample projects found in samples/")
        return 1

    results = []
    for proj in projects:
        print(f"\n=== Processing {proj.name} ===")
        summary = process_project(proj)
        results.append(summary)
        print(f"  Vastu: {summary['vastu_score']}/100 ({summary['vastu_grade']})")
        print(f"  Issues: {summary['issues_count']}")
        print(f"  Lagna: {summary.get('lagna_sign', 'N/A')}")
        br = summary["outputs"]["blender_render"]
        if br.get("files"):
            print(f"  Hero: {br['files'].get('hero_still', '—')}")
            print(f"  Walkthrough: {br['files'].get('walkthrough_mp4', '—')}")
            print(f"  GLB: {br['files'].get('scene_gltf', '—')}")
        else:
            print(f"  Render: {br.get('file') or br.get('status')}")

    master = {"projects": results, "demo_output_dir": str(OUTPUT)}
    (OUTPUT / "demo-master.json").write_text(json.dumps(master, indent=2))

    import subprocess

    subprocess.run([sys.executable, str(ROOT / "scripts" / "generate_hierarchical_plans.py")], check=False)
    subprocess.run([sys.executable, str(ROOT / "scripts" / "build_viewer_bundle.py")], check=False)
    subprocess.run([sys.executable, str(ROOT / "scripts" / "build_floorplan_bundle.py")], check=False)

    print(f"\n✅ Demo complete. See {OUTPUT / 'demo-master.json'}")
    print(f"   Start viewer: ./scripts/serve_demo.sh")
    print(f"   Floor Plan:   http://localhost:8765/demo/floor-plan-viewer/index.html")
    print(f"   3D Viewer:    http://localhost:8765/demo/viewer/index.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
