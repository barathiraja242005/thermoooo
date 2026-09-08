# Contributing to ThermaBuild

Thank you for helping improve **ThermaBuild** — open-source intelligent thermal-aware house design platform!

## Ways to contribute

- **Bug reports** — open an issue with steps to reproduce and screenshots if UI-related
- **Thermal & CFD simulation** — refine PyFluent solver scripts, boundary conditions, and ECBC material tables
- **Bioclimatic spatial generator** — procedural floor plan packing algorithms and passive ventilation design
- **Documentation** — README, setup on Linux/Windows, PyFluent setup guides
- **CAD & 3D WebGL** — Three.js enhancements, FreeCAD parametric models, and STEP export routines

## Development setup

```bash
git clone <YOUR_REPO_URL>
cd ThermaBuild
./install.sh
source .venv/bin/activate
python scripts/server.py
```

## Pull request checklist

1. Branch from `main` with a descriptive name (`feat/pyfluent-boundary-mesh`, `fix/solar-gain-formula`)
2. Keep changes focused — one feature or fix per PR
3. Test your changes locally:
   ```bash
   python scripts/server.py
   ```
4. Describe **what** and **why** in the PR body

## Code style

- Python 3.12+, clean typing annotations
- Modern, minimalist light-glassmorphic UI aesthetics
- Prescriptive thermal physics referencing ECBC 2017 and ASHRAE 55
