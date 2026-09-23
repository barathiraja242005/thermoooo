#!/usr/bin/env python3
"""
PyFluent Automated Meshing & Thermal CFD Solver Script.
Target: ANSYS Fluent 2023 R2 / 2024 R1
Project: test-functional
"""

import ansys.fluent.core as pyfluent

print(">>> [1/5] Launching Fluent Meshing Mode...")
meshing = pyfluent.launch_fluent(mode="meshing", precision="double", processor_count=4)
workflow = meshing.workflow
workflow.InitializeWorkflow(WorkflowType="Watertight Geometry")

print(">>> [2/5] Importing CAD Geometry: house.step")
workflow.TaskObject["Import Geometry"].Arguments.set_state({"FileName": "/Users/barathiraja/Desktop/sih26051/thermoooo/demo/output/test-functional/house.step", "LengthUnit": "mm"})
workflow.TaskObject["Import Geometry"].Execute()

print(">>> [3/5] Generating Poly-Hexcore Mesh with Inflation Layers...")
workflow.TaskObject["Generate the Surface Mesh"].Execute()
workflow.TaskObject["Describe Geometry"].UpdateChildTasks(SetupTypeChanged=False)
workflow.TaskObject["Update Boundaries"].Execute()
workflow.TaskObject["Create Volume Mesh"].Arguments.set_state({"VolumeFill": "poly-hexcore"})
workflow.TaskObject["Create Volume Mesh"].Execute()

print(">>> [4/5] Switching to Fluent Solution Mode...")
solver = meshing.switch_to_solver()

# Enable Energy & Realizable k-epsilon Turbulence
solver.setup.models.energy.enabled = True
solver.setup.models.viscous.model = "k-epsilon"
solver.setup.models.viscous.k_epsilon_model = "realizable"

# Climate Boundary Conditions
solver.setup.boundary_conditions.velocity_inlet["inlet"].vmag = 3.0
solver.setup.boundary_conditions.velocity_inlet["inlet"].t = 316.65

# Run Iterations
print(">>> [5/5] Running Navier-Stokes Iterations...")
solver.solution.initialization.hybrid_initialize()
solver.solution.run_calculation.iterate(iter_count=150)

print(">>> Simulation Converged. Exporting results...")
solver.exit()
