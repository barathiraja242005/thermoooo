#!/usr/bin/env python3
"""Download Poly Haven PBR texture sets for photoreal Blender renders (via API)."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXTURES_DIR = ROOT / "assets" / "textures"
API = "https://api.polyhaven.com/files"
RES = "1k"

# Local name → Poly Haven asset id
ASSETS = {
    "wood_floor": "wood_floor",
    "marble_floor": "marble_01",
    "ceramic_tile": "floor_tiles_06",
    "wall_plaster": "plastered_wall",
    "fabric_sofa": "fabric_pattern_07",
    "wood_furniture": "brown_planks_03",
}

# Map Poly Haven channels → our standard filenames for Blender script
CHANNEL_MAP = {
    "Diffuse": "diff_1k.jpg",
    "col_1": "diff_1k.jpg",
    "Rough": "rough_1k.jpg",
    "nor_gl": "nor_gl_1k.jpg",
}

FLOOR_MAP = {
    "oak_parquet": "wood_floor",
    "marble_white": "marble_floor",
    "marble_cream": "marble_floor",
    "ceramic_tile": "ceramic_tile",
    "laminate_warm": "wood_floor",
}


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "cad-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def download(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 1000:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "cad-pipeline/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as f:
            f.write(resp.read())
        return dest.exists() and dest.stat().st_size > 1000
    except Exception as exc:
        print(f"  skip {dest.name}: {exc}")
        return False


def pick_url(files: dict, channel: str) -> str | None:
    ch = files.get(channel, {})
    res = ch.get(RES, {})
    jpg = res.get("jpg", {})
    return jpg.get("url")


def main() -> None:
    manifest = {"sets": {}, "floor_map": FLOOR_MAP}
    for local_name, asset_id in ASSETS.items():
        dest_dir = TEXTURES_DIR / local_name
        files_out: dict[str, str | None] = {}
        try:
            meta = fetch_json(f"{API}/{asset_id}")
        except Exception as exc:
            print(f"❌ {local_name}: API error — {exc}")
            manifest["sets"][local_name] = {"dir": str(dest_dir.relative_to(ROOT)), "files": files_out}
            continue

        for channel, out_name in CHANNEL_MAP.items():
            if out_name in files_out and files_out[out_name]:
                continue
            url = pick_url(meta, channel)
            if not url:
                continue
            dest = dest_dir / out_name
            ok = download(url, dest)
            files_out[out_name] = str(dest.relative_to(ROOT)) if ok else None
            print(f"  {'✅' if ok else '❌'} {local_name}/{out_name}")

        manifest["sets"][local_name] = {"dir": str(dest_dir.relative_to(ROOT)), "files": files_out}

    (TEXTURES_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Manifest: {TEXTURES_DIR / 'manifest.json'}")


if __name__ == "__main__":
    main()
