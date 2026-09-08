"""
Advanced interior render + camera walkthrough animation for property projects.
Env: CAD_PROJECT_DIR, CAD_PROJECT_ID, CAD_QUALITY (demo|high), CAD_CATALOG
"""
import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector, Euler

PROJECT_DIR = Path(os.environ["CAD_PROJECT_DIR"])
PROJECT_ID = os.environ["CAD_PROJECT_ID"]
QUALITY = os.environ.get("CAD_QUALITY", "demo")
CATALOG_PATH = Path(os.environ["CAD_CATALOG"])
CAD_ROOT = Path(os.environ.get("CAD_ROOT", str(PROJECT_DIR.parent.parent.parent)))
MANIFEST_PATH = CAD_ROOT / "assets" / "textures" / "manifest.json"
USE_PBR = QUALITY in ("photoreal", "high", "cinema") and MANIFEST_PATH.exists()

prop = json.loads((PROJECT_DIR / "property.json").read_text())
layout = json.loads((PROJECT_DIR / "interior_layout.json").read_text())
catalog = json.loads(CATALOG_PATH.read_text())

W = float(prop["dimensions_m"]["width"])
D = float(prop["dimensions_m"]["depth"])
WALL_H = float(layout.get("wall_height_m", 2.85))
WALL_T = float(layout.get("wall_thickness_m", 0.12))

FLOOR_MATS = {
    "oak_parquet": ([0.62, 0.45, 0.28, 1], 0.55),
    "marble_white": ([0.92, 0.90, 0.86, 1], 0.15),
    "marble_cream": ([0.88, 0.84, 0.76, 1], 0.12),
    "ceramic_tile": ([0.78, 0.78, 0.80, 1], 0.2),
    "laminate_warm": ([0.72, 0.58, 0.42, 1], 0.5),
}

_material_cache = {}
_texture_cache = {}


def load_image(path: Path):
    p = str(path)
    if p not in _texture_cache:
        if path.exists():
            _texture_cache[p] = bpy.data.images.load(p)
        else:
            _texture_cache[p] = None
    return _texture_cache[p]


def make_pbr_mat(name: str, tex_set_dir: Path, files: dict, fallback_rgba, roughness=0.5):
    if name in _material_cache:
        return _material_cache[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    if not bsdf or not USE_PBR:
        return make_mat(name, fallback_rgba, roughness)
    diff = load_image(tex_set_dir / "diff_1k.jpg")
    rough = load_image(tex_set_dir / "rough_1k.jpg")
    nor = load_image(tex_set_dir / "nor_gl_1k.jpg")
    if not diff:
        return make_mat(name, fallback_rgba, roughness)
    tex_coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    links.new(tex_coord.outputs["Generated"], mapping.inputs["Vector"])
    scale = 2.0
    mapping.inputs["Scale"].default_value = (scale, scale, scale)
    dn = nodes.new("ShaderNodeTexImage")
    dn.image = diff
    links.new(mapping.outputs["Vector"], dn.inputs["Vector"])
    links.new(dn.outputs["Color"], bsdf.inputs["Base Color"])
    if rough:
        rn = nodes.new("ShaderNodeTexImage")
        rn.image = rough
        links.new(mapping.outputs["Vector"], rn.inputs["Vector"])
        links.new(rn.outputs["Color"], bsdf.inputs["Roughness"])
    if nor:
        nn = nodes.new("ShaderNodeTexImage")
        nn.image = nor
        nn.image.colorspace_settings.name = "Non-Color"
        nmap = nodes.new("ShaderNodeNormalMap")
        links.new(mapping.outputs["Vector"], nn.inputs["Vector"])
        links.new(nn.outputs["Color"], nmap.inputs["Color"])
        links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    _material_cache[name] = mat
    return mat


def get_floor_mat(floor_key: str, name: str):
    fc, fr = FLOOR_MATS.get(floor_key, FLOOR_MATS["oak_parquet"])
    if USE_PBR and MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text())
        set_key = manifest.get("floor_map", {}).get(floor_key, "wood_floor")
        info = manifest.get("sets", {}).get(set_key, {})
        if info.get("dir"):
            return make_pbr_mat(name, CAD_ROOT / info["dir"], info.get("files", {}), fc, fr)
    return make_mat(name, fc, fr)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_mat(name, rgba, roughness=0.5, emission=0.0):
    if name in _material_cache:
        return _material_cache[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        if emission > 0 and "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = rgba
            bsdf.inputs["Emission Strength"].default_value = emission
    _material_cache[name] = mat
    return mat


def add_box(name, loc, size, mat, collection=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    if mat:
        obj.data.materials.append(mat)
    if collection:
        for c in obj.users_collection:
            c.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def setup_world():
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.65, 0.72, 0.82, 1)
        bg.inputs["Strength"].default_value = 1.2


def build_room(room, collection):
    r = room["rect"]
    x, y, rw, rd = r["x"], r["y"], r["w"], r["h"]
    cx, cy = x + rw / 2, y + rd / 2

    floor_key = room.get("floor", "oak_parquet")
    floor_mat = get_floor_mat(floor_key, f"floor_{room['name']}")

    wc = room.get("wall_color", [0.95, 0.93, 0.90, 1])
    wall_mat = make_mat(f"wall_{room['name']}", wc, 0.85)

    add_box(f"Floor_{room['name']}", (cx, cy, 0.02), (rw, rd, 0.04), floor_mat, collection)

    # Four walls (low boxes)
    add_box(f"WallN_{room['name']}", (cx, y + WALL_T / 2, WALL_H / 2), (rw, WALL_T, WALL_H), wall_mat, collection)
    add_box(f"WallS_{room['name']}", (cx, y + rd - WALL_T / 2, WALL_H / 2), (rw, WALL_T, WALL_H), wall_mat, collection)
    add_box(f"WallW_{room['name']}", (x + WALL_T / 2, cy, WALL_H / 2), (WALL_T, rd, WALL_H), wall_mat, collection)
    add_box(f"WallE_{room['name']}", (x + rw - WALL_T / 2, cy, WALL_H / 2), (WALL_T, rd, WALL_H), wall_mat, collection)

    # Ceiling (subtle)
    ceil_mat = make_mat(f"ceil_{room['name']}", (0.98, 0.98, 0.96, 1), 0.9)
    add_box(f"Ceil_{room['name']}", (cx, cy, WALL_H - 0.02), (rw, rd, 0.04), ceil_mat, collection)

    # Windows (emissive glass panels)
    for wi, win in enumerate(room.get("windows", [])):
        wall = win["wall"]
        offset = win.get("offset", 1.0)
        ww = win.get("width", 1.2)
        wh = win.get("height", 1.2)
        sill = win.get("sill_m", 0.9)
        gz = sill + wh / 2
        glass_mat = make_mat(f"glass_{room['name']}_{wi}", (0.7, 0.85, 0.95, 1), 0.05, 0.3)
        if wall == "N":
            wx, wy = x + offset + ww / 2, y + WALL_T
            add_box(f"Win_{room['name']}_{wi}", (wx, wy, gz), (ww, 0.06, wh), glass_mat, collection)
        elif wall == "S":
            wx, wy = x + offset + ww / 2, y + rd - WALL_T
            add_box(f"Win_{room['name']}_{wi}", (wx, wy, gz), (ww, 0.06, wh), glass_mat, collection)
        elif wall == "W":
            wx, wy = x + WALL_T, y + offset + ww / 2
            add_box(f"Win_{room['name']}_{wi}", (wx, wy, gz), (0.06, ww, wh), glass_mat, collection)
        elif wall == "E":
            wx, wy = x + rw - WALL_T, y + offset + ww / 2
            add_box(f"Win_{room['name']}_{wi}", (wx, wy, gz), (0.06, ww, wh), glass_mat, collection)

    for fi, item in enumerate(room.get("furniture", [])):
        place_furniture(
            item["type"], item["x"], item["y"],
            item.get("rotation_deg", 0), room["name"], fi, collection,
        )


def add_box_rot(name, loc, size, mat, collection, rot_z=0.0):
    obj = add_box(name, loc, size, mat, collection)
    obj.rotation_euler = Euler((0, 0, rot_z))
    return obj


def place_furniture(ftype, fx, fy, rot_deg, room_name, fi, collection):
    """Place multi-part furniture for richer visuals."""
    rot = math.radians(rot_deg)
    spec = catalog.get(ftype, {})
    if not spec:
        return
    col = spec.get("color", [0.5, 0.5, 0.5, 1])
    rough = spec.get("roughness", 0.5)
    emit = spec.get("emission", 0)
    base_mat = make_mat(f"furn_{ftype}_{fi}_{room_name}", col, rough, emit)
    wood = make_mat(f"wood_{ftype}_{fi}", [0.42, 0.28, 0.16, 1], 0.45)
    fabric = make_mat(f"fabric_{ftype}_{fi}", col, 0.88)
    dark = make_mat(f"dark_{ftype}_{fi}", [0.12, 0.10, 0.08, 1], 0.35)
    white = make_mat(f"white_{ftype}_{fi}", [0.95, 0.95, 0.97, 1], 0.12)
    gold = make_mat(f"gold_{ftype}_{fi}", [0.78, 0.58, 0.18, 1], 0.25, 0.1)

    def part(name, loc, size, mat):
        return add_box_rot(f"{ftype}_{name}_{room_name}_{fi}", loc, size, mat, collection, rot)

    if ftype == "sofa":
        part("seat", (fx, fy, 0.38), (2.0, 0.85, 0.38), fabric)
        part("back", (fx, fy - 0.38, 0.72), (2.0, 0.18, 0.72), fabric)
        part("arm_l", (fx - 0.95, fy, 0.45), (0.15, 0.85, 0.45), fabric)
        part("arm_r", (fx + 0.95, fy, 0.45), (0.15, 0.85, 0.45), fabric)
        part("cushion", (fx, fy + 0.05, 0.48), (1.7, 0.7, 0.12), make_mat(f"cush_{fi}", [0.52, 0.42, 0.35, 1], 0.92))
    elif ftype == "bed_double":
        part("frame", (fx, fy, 0.25), (2.05, 1.65, 0.35), wood)
        part("mattress", (fx, fy, 0.52), (1.95, 1.55, 0.28), fabric)
        part("headboard", (fx, fy - 0.72, 0.75), (2.05, 0.12, 0.9), wood)
        part("pillow_l", (fx - 0.55, fy - 0.55, 0.68), (0.55, 0.38, 0.12), make_mat(f"pil_{fi}", [0.98, 0.96, 0.92, 1], 0.95))
        part("pillow_r", (fx + 0.55, fy - 0.55, 0.68), (0.55, 0.38, 0.12), make_mat(f"pil2_{fi}", [0.98, 0.96, 0.92, 1], 0.95))
    elif ftype == "bed_single":
        part("frame", (fx, fy, 0.22), (1.05, 1.95, 0.32), wood)
        part("mattress", (fx, fy, 0.48), (0.95, 1.85, 0.22), fabric)
        part("headboard", (fx, fy - 0.88, 0.65), (1.05, 0.1, 0.75), wood)
    elif ftype == "kitchen_counter":
        part("base", (fx, fy, 0.45), (2.4, 0.62, 0.9), white)
        part("top", (fx, fy, 0.92), (2.42, 0.64, 0.04), make_mat(f"granite_{fi}", [0.35, 0.34, 0.33, 1], 0.15))
        part("upper", (fx, fy - 0.15, 1.65), (2.4, 0.35, 0.7), white)
    elif ftype == "pooja_mandir":
        part("base", (fx, fy, 0.15), (1.0, 0.45, 0.25), gold)
        part("mid", (fx, fy, 0.65), (0.85, 0.38, 0.55), gold)
        part("top", (fx, fy, 1.25), (0.7, 0.32, 0.45), gold)
        part("dome", (fx, fy, 1.65), (0.35, 0.35, 0.25), make_mat(f"dome_{fi}", [0.95, 0.75, 0.2, 1], 0.2, 0.4))
    elif ftype == "tv_unit":
        part("console", (fx, fy, 0.28), (1.8, 0.45, 0.45), wood)
        part("tv", (fx, fy - 0.05, 0.95), (1.5, 0.06, 0.85), dark)
        part("screen", (fx, fy - 0.05, 0.95), (1.42, 0.04, 0.78), make_mat(f"screen_{fi}", [0.05, 0.05, 0.08, 1], 0.05, 0.05))
    elif ftype == "dining_table":
        part("top", (fx, fy, 0.74), (1.2, 0.75, 0.06), wood)
        for i, (dx, dy) in enumerate([(-0.45, -0.28), (0.45, -0.28), (0.45, 0.28), (-0.45, 0.28)]):
            part(f"leg{i}", (fx + dx, fy + dy, 0.35), (0.08, 0.08, 0.7), wood)
    elif ftype == "dining_chair":
        part("seat", (fx, fy, 0.45), (0.42, 0.42, 0.06), wood)
        part("back", (fx, fy - 0.18, 0.72), (0.42, 0.06, 0.5), wood)
    elif ftype == "wardrobe":
        part("body", (fx, fy, 1.1), (0.6, 1.8, 2.2), wood)
        part("door_l", (fx - 0.12, fy + 0.44, 1.1), (0.02, 0.88, 2.0), make_mat(f"door_{fi}", [0.38, 0.28, 0.18, 1], 0.4))
        part("door_r", (fx - 0.12, fy - 0.44, 1.1), (0.02, 0.88, 2.0), make_mat(f"door2_{fi}", [0.38, 0.28, 0.18, 1], 0.4))
    elif ftype == "study_desk":
        part("top", (fx, fy, 0.74), (1.2, 0.6, 0.04), wood)
        part("leg1", (fx - 0.5, fy - 0.22, 0.36), (0.06, 0.06, 0.72), wood)
        part("leg2", (fx + 0.5, fy - 0.22, 0.36), (0.06, 0.06, 0.72), wood)
        part("monitor", (fx, fy - 0.15, 0.95), (0.55, 0.05, 0.38), dark)
    elif ftype == "plant":
        part("pot", (fx, fy, 0.18), (0.32, 0.32, 0.28), make_mat(f"pot_{fi}", [0.65, 0.42, 0.28, 1], 0.7))
        part("foliage", (fx, fy, 0.75), (0.5, 0.5, 0.7), make_mat(f"leaf_{fi}", [0.18, 0.52, 0.22, 1], 0.92))
    elif ftype == "fridge":
        part("body", (fx, fy, 0.88), (0.7, 0.65, 1.75), white)
        part("handle", (fx + 0.28, fy, 1.0), (0.04, 0.08, 0.4), dark)
    elif ftype == "coffee_table":
        part("top", (fx, fy, 0.4), (1.1, 0.6, 0.05), wood)
        part("leg1", (fx - 0.4, fy - 0.2, 0.18), (0.06, 0.06, 0.36), wood)
        part("leg2", (fx + 0.4, fy + 0.2, 0.18), (0.06, 0.06, 0.36), wood)
    elif ftype == "floor_lamp":
        part("base", (fx, fy, 0.04), (0.28, 0.28, 0.06), dark)
        part("pole", (fx, fy, 0.82), (0.04, 0.04, 1.5), dark)
        part("shade", (fx, fy, 1.55), (0.32, 0.32, 0.22), make_mat(f"shade_{fi}", [0.95, 0.88, 0.55, 1], 0.5, 1.2))
    elif ftype == "bookshelf":
        part("frame", (fx, fy, 0.9), (0.35, 1.0, 1.8), wood)
        for shelf in range(3):
            part(f"shelf{shelf}", (fx, fy, 0.35 + shelf * 0.55), (0.32, 0.92, 0.03), wood)
    else:
        sz = spec["size"]
        part("main", (fx, fy, sz[2] / 2), sz, base_mat)


def setup_lights(collection):
    bpy.ops.object.light_add(type="SUN", location=(W / 2, -2, 10))
    sun = bpy.context.active_object
    sun.data.energy = 6.0
    sun.data.angle = math.radians(4)
    sun.rotation_euler = Euler((math.radians(50), 0, math.radians(30)))

    for room in layout["rooms"]:
        r = room["rect"]
        cx, cy = r["x"] + r["w"] / 2, r["y"] + r["h"] / 2
        bpy.ops.object.light_add(type="AREA", location=(cx, cy, WALL_H - 0.15))
        lamp = bpy.context.active_object
        lamp.data.energy = 180
        lamp.data.size = min(r["w"], r["h"]) * 0.6
        lamp.data.color = (1.0, 0.94, 0.86)


def look_at(cam, target):
    direction = Vector(target) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(name, loc, target):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.active_object
    cam.name = name
    look_at(cam, target)
    cam.data.lens = 28
    return cam


def configure_render(engine="BLENDER_EEVEE"):
    sc = bpy.context.scene
    sc.render.engine = engine
    if hasattr(sc, "eevee"):
        for attr, val in [("use_gtao", True), ("use_bloom", True)]:
            if hasattr(sc.eevee, attr):
                setattr(sc.eevee, attr, val)
        if hasattr(sc.eevee, "bloom_intensity"):
            sc.eevee.bloom_intensity = 0.08
    if engine == "CYCLES":
        sc.cycles.device = "GPU"
        samples = {"photoreal": 256, "cinema": 512, "high": 128}.get(QUALITY, 64)
        sc.cycles.samples = samples
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            prefs.compute_device_type = "METAL"
            prefs.get_devices()
            for d in prefs.devices:
                d.use = True
        except Exception:
            pass
    if QUALITY in ("photoreal", "cinema", "high"):
        sc.render.resolution_x = 1920
        sc.render.resolution_y = 1080
    else:
        sc.render.resolution_x = 1280
        sc.render.resolution_y = 720
    sc.render.image_settings.file_format = "PNG"
    sc.view_settings.view_transform = "Filmic"
    sc.view_settings.look = "Medium High Contrast"


def render_still(filepath, camera):
    sc = bpy.context.scene
    sc.camera = camera
    sc.render.filepath = str(filepath)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered still: {filepath}")


def build_walkthrough_animation(camera):
    sc = bpy.context.scene
    tour = layout.get("camera_tour", [])
    if len(tour) < 2:
        return

    curve_data = bpy.data.curves.new("CamPath", type="CURVE")
    curve_data.dimensions = "3D"
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(tour) - 1)

    for i, pt in enumerate(tour):
        bp = spline.bezier_points[i]
        bp.co = (pt["x"], pt["y"], pt["z"])
        bp.handle_left_type = bp.handle_right_type = "AUTO"

    path_obj = bpy.data.objects.new("CamPathObj", curve_data)
    bpy.context.collection.objects.link(path_obj)

    follow = camera.constraints.new(type="FOLLOW_PATH")
    follow.target = path_obj
    follow.use_curve_follow = True
    follow.use_fixed_location = True

    duration = 120 if QUALITY == "demo" else 240
    path_obj.data.path_duration = duration
    sc.frame_start = 1
    sc.frame_end = duration

    follow.offset_factor = 0
    follow.keyframe_insert(data_path="offset_factor", frame=sc.frame_start)
    follow.offset_factor = 1
    follow.keyframe_insert(data_path="offset_factor", frame=sc.frame_end)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=tour[0].get("look_at", [W / 2, D / 2, 1]))
    track_empty = bpy.context.active_object
    track_empty.name = "LookTarget"

    track = camera.constraints.new(type="TRACK_TO")
    track.target = track_empty
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"

    step = max(1, duration // max(len(tour), 1))
    for frame in range(sc.frame_start, sc.frame_end + 1, step):
        idx = min(int((frame - 1) / duration * (len(tour) - 1)), len(tour) - 1)
        la = tour[idx].get("look_at", [W / 2, D / 2, 1])
        track_empty.location = la
        track_empty.keyframe_insert(data_path="location", frame=frame)


def render_png_sequence(frame_dir, camera):
    sc = bpy.context.scene
    sc.camera = camera
    frame_dir.mkdir(exist_ok=True)
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = str(frame_dir / "frame_")
    bpy.ops.render.render(animation=True)
    print(f"Rendered {sc.frame_end - sc.frame_start + 1} frames to {frame_dir}")


def encode_mp4(frame_dir, mp4_path, fps=24):
    import subprocess
    pattern = frame_dir / "frame_*.png"
    pngs = sorted(frame_dir.glob("frame_*.png"))
    if not pngs:
        print("No frames to encode")
        return False
    cmd = [
        "ffmpeg", "-y", "-framerate", str(fps),
        "-i", str(frame_dir / "frame_%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", str(mp4_path),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0:
        print(f"Encoded walkthrough: {mp4_path}")
        return True
    print(f"ffmpeg failed: {r.stderr[-400:]}")
    return False


def export_gltf(filepath):
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
    )
    print(f"Exported glTF: {filepath}")


# --- Main ---
reset_scene()
setup_world()

interior_col = bpy.data.collections.new("Interior")
bpy.context.scene.collection.children.link(interior_col)

for room in layout["rooms"]:
    build_room(room, interior_col)

setup_lights(interior_col)

# Cameras (no outer shell — keeps interior views clean)
hero_cam = add_camera("HeroCam", (W * 0.65, -D * 0.45, WALL_H * 1.25), (W / 2, D / 2, 1.0))
living_cam = add_camera("LivingCam", (4.2, 2.4, 1.58), (2.5, 2.2, 0.75))
bed_cam = add_camera("BedroomCam", (4.2, 7.8, 1.58), (2.5, 7.2, 0.65))
walk_cam = add_camera("WalkCam", (10, 9.5, 1.65), (5, 5, 1))

configure_render("CYCLES")
render_still(PROJECT_DIR / f"{PROJECT_ID}-hero.png", hero_cam)
render_still(PROJECT_DIR / f"{PROJECT_ID}-living.png", living_cam)
render_still(PROJECT_DIR / f"{PROJECT_ID}-bedroom.png", bed_cam)
if QUALITY in ("photoreal", "cinema"):
    photoreal_cam = add_camera("PhotorealCam", (W * 0.55, -D * 0.35, WALL_H * 1.1), (W / 2, D / 2, 1.0))
    photoreal_cam.data.lens = 24
    render_still(PROJECT_DIR / f"{PROJECT_ID}-photoreal.png", photoreal_cam)

configure_render("BLENDER_EEVEE")
build_walkthrough_animation(walk_cam)

sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x = 960 if QUALITY == "demo" else 1280
sc.render.resolution_y = 540 if QUALITY == "demo" else 720
sc.render.fps = 24

frame_dir = PROJECT_DIR / "frames"
mp4_path = PROJECT_DIR / f"{PROJECT_ID}-walkthrough.mp4"
render_png_sequence(frame_dir, walk_cam)
encode_mp4(frame_dir, mp4_path, fps=24)

export_gltf(PROJECT_DIR / f"{PROJECT_ID}-scene.glb")
print("Advanced render pipeline complete.")
