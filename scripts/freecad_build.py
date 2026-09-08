"""Headless FreeCAD: build a simple 3D house shell from property.json."""
import json
import os
from pathlib import Path

prop_path = Path(os.environ["FC_PROPERTY_JSON"])
out_path = Path(os.environ["FC_OUTPUT"])

data = json.loads(prop_path.read_text())

import FreeCAD as App
import Part

doc = App.newDocument("Property3D")
w = float(data["dimensions_m"]["width"]) * 1000
d = float(data["dimensions_m"]["depth"]) * 1000
h = 3000

floor = Part.makeBox(w, d, 100)
floor_obj = doc.addObject("Part::Feature", "Floor")
floor_obj.Shape = floor

specs = [
    ("Wall_N", 0, 0, w, 200, h),
    ("Wall_S", 0, d - 200, w, 200, h),
    ("Wall_W", 0, 0, 200, d, h),
    ("Wall_E", w - 200, 0, 200, d, h),
]
for name, x, y, ww, wd, wh in specs:
    box = Part.makeBox(ww, wd, wh)
    box.translate(App.Vector(x, y, 100))
    obj = doc.addObject("Part::Feature", name)
    obj.Shape = box

facing = data.get("facing", "E")
entrance = Part.makeBox(900, 200, 2100)
if facing == "E":
    entrance.translate(App.Vector(w - 200, d / 2 - 450, 100))
elif facing == "W":
    entrance.translate(App.Vector(0, d / 2 - 450, 100))
elif facing == "S":
    entrance.translate(App.Vector(w / 2 - 450, 0, 100))
else:
    entrance.translate(App.Vector(w / 2 - 450, d - 200, 100))
door = doc.addObject("Part::Feature", "Entrance")
door.Shape = entrance

doc.recompute()
doc.saveAs(str(out_path))
print(f"Saved FreeCAD model: {out_path}")
