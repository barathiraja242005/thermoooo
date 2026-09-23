#!/usr/bin/env python3
"""
Parametric FreeCAD CAD & STEP Solid Builder for ThermaBuild.
Auto-generated from structured geometry.json.
Project: test-functional
"""

import sys
import os
from pathlib import Path

try:
    import FreeCAD as App
    import Part
except ImportError:
    print("Error: FreeCAD Python API not detected. Run using: FreeCADCmd generate_cad.py")
    sys.exit(1)

doc = App.newDocument("ThermaBuild_test-functional")

# 1. Floor Slab (Reinforced Concrete)
floor_slab = Part.makeBox(7710.0, 9640.0, 150.0)
obj_floor = doc.addObject("Part::Feature", "Floor_Slab")
obj_floor.Shape = floor_slab

# 2. Roof Slab (High-Albedo Overdeck Insulated)
roof_slab = Part.makeBox(7710.0, 9640.0, 150.0)
roof_slab.translate(App.Vector(0, 0, 3000.0))
obj_roof = doc.addObject("Part::Feature", "Roof_Slab")
obj_roof.Shape = roof_slab

# 3. Exterior Perimeter Walls with Door & Window Cutouts
walls_list = []

# Wall WALL_EXT_N (N)
w_box = Part.makeBox(7710.0, 230.0, 2850.0)
w_box.translate(App.Vector(0.0, 0.0, 150.0))
walls_list.append(w_box)

# Wall WALL_EXT_E (E)
w_box = Part.makeBox(230.0, 9640.0, 2850.0)
w_box.translate(App.Vector(7710.0, 0.0, 150.0))
walls_list.append(w_box)

# Wall WALL_EXT_S (S)
w_box = Part.makeBox(7710.0, 230.0, 2850.0)
w_box.translate(App.Vector(0.0, 9640.0, 150.0))
walls_list.append(w_box)

# Wall WALL_EXT_W (W)
w_box = Part.makeBox(230.0, 9640.0, 2850.0)
w_box.translate(App.Vector(0.0, 0.0, 150.0))
walls_list.append(w_box)

# 4. Cutting Windows from Envelope Walls

# Window: WIN_1_Living_&_Dining
win_cut = Part.makeBox(400.0, 2200.0, 1400.0)
win_cut.translate(App.Vector(7410.0, 1200.0, 1050.0))
walls_list = [w.cut(win_cut) for w in walls_list]

# Window: WIN_2_Kitchen
win_cut = Part.makeBox(1200.0, 400.0, 1200.0)
win_cut.translate(App.Vector(1000.0, -50.0, 1250.0))
walls_list = [w.cut(win_cut) for w in walls_list]

# Window: WIN_3_Master_Bedroom
win_cut = Part.makeBox(1800.0, 400.0, 1400.0)
win_cut.translate(App.Vector(1200.0, 9340.0, 1050.0))
walls_list = [w.cut(win_cut) for w in walls_list]

# Window: WIN_4_Bedroom_2
win_cut = Part.makeBox(400.0, 1500.0, 1400.0)
win_cut.translate(App.Vector(7410.0, 1000.0, 1050.0))
walls_list = [w.cut(win_cut) for w in walls_list]

# Window: WIN_5_Bathroom
win_cut = Part.makeBox(400.0, 600.0, 600.0)
win_cut.translate(App.Vector(7410.0, 600.0, 1950.0))
walls_list = [w.cut(win_cut) for w in walls_list]

# Combine exterior walls
compound_walls = Part.Compound(walls_list)
obj_walls = doc.addObject("Part::Feature", "Exterior_Walls")
obj_walls.Shape = compound_walls

# 5. Export STEP Solid for ANSYS Fluent CFD
out_step = "/Users/barathiraja/Desktop/sih26051/thermoooo/demo/output/test-functional/house.step"
out_fcstd = "/Users/barathiraja/Desktop/sih26051/thermoooo/demo/output/test-functional/house.FCStd"

doc.recompute()
doc.saveAs(out_fcstd)

export_shapes = [obj_floor.Shape, obj_walls.Shape, obj_roof.Shape]
Part.export(export_shapes, out_step)
print(f"Successfully generated FreeCAD 3D CAD Model: {out_fcstd}")
print(f"Successfully exported STEP Model: {out_step}")
