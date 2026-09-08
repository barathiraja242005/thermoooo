"""Headless Blender: render a simple 3D preview from property.json."""
import json
import sys
from pathlib import Path

args = sys.argv[sys.argv.index("--") + 1:]
fcstd_path = Path(args[0]) if args else None
out_png = Path(args[1]) if len(args) > 1 else Path("render.png")

import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)

prop_json = fcstd_path.parent / "property.json" if fcstd_path else None
if not prop_json or not prop_json.exists():
    raise SystemExit(f"property.json not found near {fcstd_path}")

data = json.loads(prop_json.read_text())
w = float(data["dimensions_m"]["width"])
d = float(data["dimensions_m"]["depth"])
h = 3.0


def add_box(name, loc, size):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    return obj


add_box("Floor", (w / 2, d / 2, 0.05), (w, d, 0.1))
add_box("WallN", (w / 2, 0.1, h / 2 + 0.1), (w, 0.2, h))
add_box("WallS", (w / 2, d - 0.1, h / 2 + 0.1), (w, 0.2, h))
add_box("WallW", (0.1, d / 2, h / 2 + 0.1), (0.2, d, h))
add_box("WallE", (w - 0.1, d / 2, h / 2 + 0.1), (0.2, d, h))

mat_wall = bpy.data.materials.new("WallMat")
mat_wall.use_nodes = True
bsdf = mat_wall.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.82, 0.75, 0.62, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.7

mat_floor = bpy.data.materials.new("FloorMat")
mat_floor.use_nodes = True
bsdf_f = mat_floor.node_tree.nodes.get("Principled BSDF")
if bsdf_f:
    bsdf_f.inputs["Base Color"].default_value = (0.55, 0.45, 0.35, 1.0)

for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    obj.data.materials.append(mat_floor if obj.name == "Floor" else mat_wall)

# World background (avoid pure black)
world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs["Color"].default_value = (0.65, 0.72, 0.85, 1.0)
    bg.inputs["Strength"].default_value = 1.0

# Sun + fill light
bpy.ops.object.light_add(type="SUN", location=(w, -d, h * 2))
sun = bpy.context.active_object
sun.data.energy = 4.0

bpy.ops.object.light_add(type="AREA", location=(w / 2, d / 2, h * 1.5))
fill = bpy.context.active_object
fill.data.energy = 800
fill.data.size = max(w, d)

# Camera — isometric-style view
cam_dist = max(w, d) * 1.8
bpy.ops.object.camera_add(location=(w / 2 + cam_dist * 0.7, -cam_dist * 0.5, h * 1.2))
cam = bpy.context.active_object
import mathutils

target = mathutils.Vector((w / 2, d / 2, h / 3))
direction = target - cam.location
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = cam

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.filepath = str(out_png)
bpy.ops.render.render(write_still=True)
print(f"Rendered: {out_png}")
