<div align="center">

# 🏛️ ThermaBuild

**Intelligent Thermal-Aware Bioclimatic House Design & Simulation Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-E07A43?style=for-the-badge)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](requirements.txt)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js&logoColor=white)](demo/viewer/)
[![FreeCAD](https://img.shields.io/badge/FreeCAD-BIM_STEP-CB333B?style=for-the-badge&logo=freecad&logoColor=white)](scripts/freecad_build.py)
[![PyFluent Ready](https://img.shields.io/badge/ANSYS_Fluent-PyFluent_Bridge-FFB71B?style=for-the-badge)](scripts/thermal_engine.py)

<br/>

*Design Better Homes. Build for the Climate.*

<br/>

```bash
# Clone & install dependencies
./install.sh

# Run the unified ThermaBuild platform
source .venv/bin/activate
python scripts/server.py
```

Open **http://localhost:8765/demo/index.html** in your browser.

</div>

---

## ✨ Highlights

- **Guided Bioclimatic Configurator** — Tune plot dimensions, facing direction, house typology (Villa, Courtyard, Row House), bedrooms, and passive design constraints.
- **Hyper-Local Climate Intelligence** — Automated microclimate analysis for ambient temperature swings, solar radiation, humidity, and wind vectors (integrated with Open-Meteo API & regional EPW data).
- **Procedural 2D Architectural Plans** — Dynamic generation of spatial layouts with furniture placement, window openings, and thermal room zoning in scalable SVG format.
- **Parametric 3D CAD & FreeCAD STEP Export** — OpenCASCADE solid geometry generation exporting standard `house.step` boundary files ready for CFD mesh generation.
- **Interactive Three.js 3D Dollhouse** — Real-time WebGL walkthroughs with cutaway walls, PBR materials, doors, and animated ceiling fans.
- **Conjugate Heat Transfer & Diurnal Simulation** — 24-hour diurnal thermal heat balance solver computing indoor operative temperatures, heat ingress mitigation (-40%+), and passive cooling energy savings.
- **Future-Proof PyFluent Bridge** — Clean decoupled driver interface ready to connect to local or remote ANSYS Fluent instances via gRPC.
- **Vedic Vastu Alignment** — Integrated room quadrant orientation analysis (NE pooja/water, SE kitchen/fire, SW master bed/earth).
- **Executive Thermal Design Dossier** — One-click generation of full-screen, print-ready client reports with U-value schedules and thermal compliance verdicts.

---

## 🧭 Architecture Flow

```mermaid
flowchart TD
  subgraph Input ["1. House Requirements"]
    REQ[Location, Dimensions, Facing, BHK, Typology, Passive Options]
  end

  subgraph Climate ["2. Climate Intelligence"]
    API[Open-Meteo API / Regional EPW Data]
    VEC[Solar Irradiance, Diurnal Range, Wind, Humidity]
    REQ --> API --> VEC
  end

  subgraph Geometry ["3. Spatial & CAD Generation"]
    PROC[layout_generator.py]
    SVG[2D Floor Plan SVG]
    FC[FreeCAD 3D Solid & STEP Export]
    TJ[Three.js WebGL Dollhouse]
    VEC --> PROC
    PROC --> SVG
    PROC --> FC
    PROC --> TJ
  end

  subgraph Thermal ["4. Simulation & Materials"]
    MAT[Prescriptive Material Schedule: ECBC 2017]
    SIM[thermal_engine.py: 1D-RC & PyFluent Bridge]
    DIUR[24-Hour Diurnal Operative Temp Curves]
    FC --> SIM
    MAT --> SIM
    SIM --> DIUR
  end

  subgraph Output ["5. Validation & Reporting"]
    DOS[ThermaBuild Thermal Specification Dossier]
    DIUR --> DOS
  end
```

---

## 🚀 Quick Start

### 1. Prerequisites & Installation

```bash
# Make scripts executable and run setup
chmod +x install.sh
./install.sh

# Sanity check installed tools
./scripts/verify_tools.sh
```

### 2. Launch the Unified Platform

```bash
source .venv/bin/activate
python scripts/server.py
```

### 3. Open Web Interfaces

| Interface | URL |
|-----------|-----|
| **ThermaBuild SaaS Studio** | http://localhost:8765/demo/index.html |
| **2D Floor Plan Builder** | http://localhost:8765/demo/floor-plan-viewer/index.html |
| **3D Interactive Dollhouse** | http://localhost:8765/demo/viewer/index.html |
| **System Health API** | http://localhost:8765/api/health |

---

## 📦 API Endpoints

ThermaBuild provides a future-proof REST API for external integrations:

### `POST /api/generate`
Generates a complete parametric 2D/3D house plan and solves the thermal simulation.

**Request Payload:**
```json
{
  "city_key": "jaipur",
  "city_name": "Jaipur",
  "latitude": 26.9124,
  "longitude": 75.7873,
  "width_m": 14.0,
  "depth_m": 12.0,
  "facing": "E",
  "bhk": 3,
  "floors": "G+1",
  "typology": "villa",
  "passive_options": {
    "vastu": true,
    "night_purge": true,
    "overhang": true
  }
}
```

**Response:**
Returns `{ status: "ok", project_id, layout, climate, materials, simulation, viewer_3d_url }`.

### `POST /api/climate`
Fetches live microclimate conditions for the specified latitude and longitude.

### `GET /api/health`
Returns driver readiness for Python, FreeCAD, Blender, and PyFluent.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Vanilla JS, Modern CSS Glassmorphism, Arfolit / Plus Jakarta Sans Typography |
| **3D WebGL** | Three.js, OrbitControls, GLTFLoader, PBR Shaders |
| **CAD / BIM** | FreeCAD (Python OpenCASCADE API), STEP Export, SVG Generators |
| **Thermal & CFD** | lumped parameter 1D-RC solver, PyFluent (`ansys.fluent.core`) Bridge |
| **Climate API** | Open-Meteo REST API, Swiss Ephemeris (`pyswisseph`) |
| **Backend** | Python 3.12, Flask, Flask-CORS |

---

## 📄 License

MIT License — see [LICENSE](LICENSE).
