/**
 * ThermaBuild — Complete Interactive Functional Core Engine
 * Manages 4 Flows, 5 Steps, Leaflet GIS, 2D SVG Blueprint, 3D BIM WebGL, & CFD Simulation.
 */

// Global State
const ThermaState = {
  activeFlow: 1, // 1: New House, 2: 2D Plan, 3: Existing House, 4: Animal House
  currentStep: 1,
  city: 'leh',
  lat: 34.1526,
  lon: 77.5771,
  bhk: '2BHK',
  areaSqFt: 1200,
  widthM: 10.0,
  lengthM: 12.0,
  facing: 'north',
  wallMat: 'rammed_earth',
  roofMat: 'cool_roof',
  glazingMat: 'low_e_double',
  // Animal Shelter State
  animalSpecies: 'cattle',
  animalHerdCount: 20,
  animalOrientation: 'EW',
  animalRoof: 'thatch',
  animalFloor: 'grooved_concrete',
  // 3D Viewers
  viewerMode: 'realistic',
  sunPathActive: true,
  airflowActive: true,
  animalViewMode: 'thermal'
};

// Location Presets (Ladakh, Cold Regions & National Bioclimatic Zones)
const LOCATION_PRESETS = {
  leh: {
    name: 'Leh Main Bazaar, Ladakh (3,500m ASL)',
    lat: 34.1526,
    lon: 77.5771,
    zone: 'Cold Arid / High-Altitude Trans-Himalaya',
    summerTemp: '24.5 °C',
    winterTemp: '-18.2 °C',
    solarRad: '6.8 kWh/m²/day (1040 W/m² DNI)',
    wind: '4.2 m/s (WNW Mountain Breeze)',
    strategy: 'South-facing direct solar gain solarium, 450mm rammed earth thermal mass, airtight triple-glazing (U < 1.3), airlock buffer vestibule.'
  },
  nubra: {
    name: 'Diskit, Nubra Valley, Ladakh (3,144m ASL)',
    lat: 34.5428,
    lon: 77.5619,
    zone: 'Cold Arid Desert (Valley Microclimate)',
    summerTemp: '28.0 °C',
    winterTemp: '-15.0 °C',
    solarRad: '6.5 kWh/m²/day',
    wind: '3.8 m/s (North-Northwest)',
    strategy: 'High diurnal thermal damping, stone masonry cavity with straw-clay insulation, unshaded South Trombe wall.'
  },
  kargil: {
    name: 'Kargil Suru Valley, Ladakh (2,676m ASL)',
    lat: 34.5539,
    lon: 76.1349,
    zone: 'Cold Alpine Valley',
    summerTemp: '26.5 °C',
    winterTemp: '-16.5 °C',
    solarRad: '6.2 kWh/m²/day',
    wind: '3.5 m/s (West)',
    strategy: 'Poplar wood rafters, compressed mud flat roof with 120mm PUF board, greenhouse sunspace.'
  },
  dras: {
    name: 'Dras Valley, Ladakh (Coldest Inhabited, 3,280m ASL)',
    lat: 34.4294,
    lon: 75.7533,
    zone: 'Extreme Sub-Zero Cold Arid',
    summerTemp: '22.0 °C',
    winterTemp: '-28.5 °C',
    solarRad: '6.4 kWh/m²/day',
    wind: '5.1 m/s (High-Altitude Gale)',
    strategy: 'Super-insulated envelope (U < 0.18 W/m²K), triple argon glazing, sub-grade earth sheltering, airtight thermal airlock.'
  },
  pangong: {
    name: 'Pangong Tso, Changthang Plateau, Ladakh (4,250m ASL)',
    lat: 33.7595,
    lon: 78.6674,
    zone: 'High Plateau Tundra',
    summerTemp: '18.5 °C',
    winterTemp: '-24.0 °C',
    solarRad: '7.1 kWh/m²/day',
    wind: '6.0 m/s (Plateau Wind)',
    strategy: 'Aerodynamic wind-deflecting roof profile, heavy stone thermal storage, passive solar heat trap.'
  },
  spiti: {
    name: 'Kaza, Spiti Valley, Himachal Pradesh (3,650m ASL)',
    lat: 32.2276,
    lon: 78.0710,
    zone: 'Cold Mountain Desert',
    summerTemp: '23.0 °C',
    winterTemp: '-20.0 °C',
    solarRad: '6.6 kWh/m²/day',
    wind: '4.0 m/s (West-Northwest)',
    strategy: 'Thick mud-brick walls, compact cubic form factor, south-oriented glazed verandahs.'
  },
  new_delhi: {
    name: 'New Delhi (Composite Climate)',
    lat: 28.6139,
    lon: 77.2090,
    zone: 'Composite / Extreme Summer & Winter',
    summerTemp: '42.5 °C',
    winterTemp: '5.2 °C',
    solarRad: '5.2 kWh/m²/day',
    wind: '2.8 m/s (Northwest)',
    strategy: 'Heavy thermal insulation, low-SHGC fenestration, night cooling flush and mutual building self-shading.'
  },
  chennai: {
    name: 'Chennai (Warm & Humid)',
    lat: 13.0827,
    lon: 80.2707,
    zone: 'Warm & Humid / Coastal',
    summerTemp: '39.0 °C',
    winterTemp: '21.5 °C',
    solarRad: '5.6 kWh/m²/day',
    wind: '4.5 m/s (East-Southeast Sea Breeze)',
    strategy: 'Maximum cross-ventilation, expansive shaded overhangs, light-weight ventilated roofing with radiant barriers.'
  },
  jaisalmer: {
    name: 'Jaisalmer (Hot & Dry)',
    lat: 26.9157,
    lon: 70.9083,
    zone: 'Hot & Dry / Desert',
    summerTemp: '46.0 °C',
    winterTemp: '7.8 °C',
    solarRad: '6.4 kWh/m²/day',
    wind: '3.9 m/s (Southwest)',
    strategy: 'Dense central courtyard topology (Jharokha), evaporative water cooling, thick earthen cavity walls.'
  },
  bengaluru: {
    name: 'Bengaluru (Temperate)',
    lat: 12.9716,
    lon: 77.5946,
    zone: 'Temperate / Moderate Plateau',
    summerTemp: '34.0 °C',
    winterTemp: '15.5 °C',
    solarRad: '5.4 kWh/m²/day',
    wind: '3.1 m/s (West-Southwest)',
    strategy: 'Passive stack ventilation, optimized daylighting apertures, balanced thermal mass without AC reliance.'
  }
};

function selectMapPreset(key) {
  const sel = document.getElementById('location-select');
  if (sel) sel.value = key;
  onLocationPresetChange(key);
}

let leafletMap = null;
let leafletMarker = null;

// ==========================================
// 1. FLOW SWITCHER
// ==========================================
function switchMainFlow(flowNum) {
  ThermaState.activeFlow = flowNum;

  // Update flow buttons
  for (let f = 1; f <= 4; f++) {
    const btn = document.getElementById(`flow-card-${f}`);
    if (btn) {
      if (f === flowNum) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }

  // Update Stepper Rails
  const s1 = document.getElementById('stepper-flow-1');
  const s2 = document.getElementById('stepper-flow-2');
  const s3 = document.getElementById('stepper-flow-3');

  if (s1) s1.style.display = (flowNum === 1 || flowNum === 4) ? 'flex' : 'none';
  if (s2) s2.style.display = flowNum === 2 ? 'flex' : 'none';
  if (s3) s3.style.display = flowNum === 3 ? 'flex' : 'none';

  // Update Stepper Titles for Flow 1 (House) vs Flow 4 (Animal)
  if (flowNum === 4) {
    setStepperTitles([
      { title: 'Step 1: Farm GIS & Map', sub: 'Microclimate & Solar Vector' },
      { title: 'Step 2: Species & Specs', sub: 'Livestock, Herd & Axis' },
      { title: 'Step 3: 2D Shelter Plan', sub: 'Stall Layout & Vernacular' },
      { title: 'Step 4: 3D BIM & Tour', sub: 'Shelter Digital Twin' },
      { title: 'Step 5: ANSYS CFD & THI', sub: 'Heat Stress & Farmer BOQ' }
    ]);
  } else if (flowNum === 1) {
    setStepperTitles([
      { title: 'Step 1: Site & Map', sub: 'Leaflet & Climate' },
      { title: 'Step 2: Specs & Vastu', sub: 'BHK, Area & Facing' },
      { title: 'Step 3: 2D Plan & Specs', sub: 'Architectural & Materials' },
      { title: 'Step 4: 3D BIM & Tour', sub: 'Digital Twin Walkthrough' },
      { title: 'Step 5: ANSYS CFD Report', sub: 'Thermal & Aerothermal' }
    ]);
  }

  // Navigate to Step 1
  goToStep(1);
}

function setStepperTitles(tabs) {
  for (let i = 1; i <= 5; i++) {
    const t = tabs[i - 1];
    const titleEl = document.getElementById(`step-tab-title-${i}`);
    const subEl = document.getElementById(`step-tab-sub-${i}`);
    if (titleEl) titleEl.innerText = t.title;
    if (subEl) subEl.innerText = t.sub;
  }
}

// ==========================================
// 2. STEP NAVIGATION CONTROLLER
// ==========================================
function goToStep(stepNum) {
  ThermaState.currentStep = stepNum;

  // 1. Update Tabs Active State
  if (ThermaState.activeFlow === 1 || ThermaState.activeFlow === 4) {
    for (let i = 1; i <= 5; i++) {
      const tab = document.getElementById(`step-tab-${i}`);
      if (tab) {
        if (i === stepNum) tab.classList.add('active');
        else tab.classList.remove('active');
      }
    }
  } else if (ThermaState.activeFlow === 2) {
    for (let i = 1; i <= 4; i++) {
      const tab = document.getElementById(`f2-tab-${i}`);
      if (tab) {
        if (i === stepNum) tab.classList.add('active');
        else tab.classList.remove('active');
      }
    }
  } else if (ThermaState.activeFlow === 3) {
    for (let i = 1; i <= 5; i++) {
      const tab = document.getElementById(`f3-tab-${i}`);
      if (tab) {
        if (i === stepNum) tab.classList.add('active');
        else tab.classList.remove('active');
      }
    }
  }

  // 2. Hide all step panels
  const allPanels = document.querySelectorAll('.step-panel');
  allPanels.forEach(p => p.style.display = 'none');

  // 3. Show target panel based on active flow and step
  if (stepNum === 1) {
    // Step 1: Site Location & Map Selection (Shared across ALL 4 Flows)
    const target = document.getElementById('flow-step-1');
    if (target) target.style.display = 'block';
    setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 100);
    return;
  }

  if (ThermaState.activeFlow === 1) {
    // New House (Flow 1: Steps 2..5)
    const target = document.getElementById(`flow-step-${stepNum}`);
    if (target) target.style.display = 'block';

    if (stepNum === 3) generate2DPlan();
    else if (stepNum === 4) { updateLinked3DModel(); setTimeout(init3DViewer, 100); }
    else if (stepNum === 5) runCFDSimulation();

  } else if (ThermaState.activeFlow === 4) {
    // Animal House (Flow 4: Steps 2..5)
    const target = document.getElementById(`animal-flow-step-${stepNum}`);
    if (target) target.style.display = 'block';

    if (stepNum === 3) updateAnimal2DLayout();
    else if (stepNum === 4) updateLinkedAnimal3DModel();
    else if (stepNum === 5) runAnimalSimulation();

  } else if (ThermaState.activeFlow === 2) {
    // 2D Plan Fast-Track (Flow 2: 4 Steps: 1: Map -> 2: 2D Plan -> 3: 3D BIM -> 4: CFD)
    if (stepNum === 2) {
      const target = document.getElementById('flow2-step-1');
      if (target) target.style.display = 'block';
    } else if (stepNum === 3) {
      // Step 3 in Flow 2 is 3D BIM Walkthrough (Flow 1's Step 4)
      const target = document.getElementById('flow-step-4');
      if (target) target.style.display = 'block';
      updateLinked3DModel();
      setTimeout(init3DViewer, 100);
    } else if (stepNum === 4) {
      // Step 4 in Flow 2 is ANSYS CFD Report (Flow 1's Step 5)
      const target = document.getElementById('flow-step-5');
      if (target) target.style.display = 'block';
      runCFDSimulation();
    }

  } else if (ThermaState.activeFlow === 3) {
    // Existing House Audit (Flow 3: 5 Steps: 1: Map -> 2: Plan & Materials -> 3: Matrix -> 4: 3D BIM -> 5: CFD)
    if (stepNum === 2) {
      const target = document.getElementById('flow3-step-1');
      if (target) target.style.display = 'block';
    } else if (stepNum === 3) {
      const target = document.getElementById('flow3-step-2');
      if (target) target.style.display = 'block';
      updateRetrofitCalculation();
    } else if (stepNum === 4) {
      // Step 4 in Flow 3 is 3D BIM Retrofit Model (Flow 1's Step 4)
      const target = document.getElementById('flow-step-4');
      if (target) target.style.display = 'block';
      updateLinked3DModel();
      setTimeout(init3DViewer, 100);
    } else if (stepNum === 5) {
      // Step 5 in Flow 3 is Comparative CFD Report (Flow 1's Step 5)
      const target = document.getElementById('flow-step-5');
      if (target) target.style.display = 'block';
      runCFDSimulation();
    }
  }
}

// Helper navigation functions for shared Step 4 & Step 5 panels
function navigateStep4Back() {
  if (ThermaState.activeFlow === 1) goToStep(3);
  else if (ThermaState.activeFlow === 2) goToStep(2);
  else if (ThermaState.activeFlow === 3) goToStep(3);
  else if (ThermaState.activeFlow === 4) goToStep(3);
}

function navigateStep4Next() {
  if (ThermaState.activeFlow === 1) { runCFDSimulation(); goToStep(5); }
  else if (ThermaState.activeFlow === 2) { runCFDSimulation(); goToStep(4); }
  else if (ThermaState.activeFlow === 3) { runCFDSimulation(); goToStep(5); }
  else if (ThermaState.activeFlow === 4) { runAnimalSimulation(); goToStep(5); }
}

function navigateStep5Back() {
  if (ThermaState.activeFlow === 1) goToStep(4);
  else if (ThermaState.activeFlow === 2) goToStep(3);
  else if (ThermaState.activeFlow === 3) goToStep(4);
  else if (ThermaState.activeFlow === 4) goToStep(4);
}

// Flow 2 Custom 2D Plan Upload Handler
function flow2HandleCustomUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    
    // Update preview images
    const f2Img = document.getElementById('f2-plan-img');
    if (f2Img) f2Img.src = dataUrl;

    const fabImg = document.getElementById('fabricated-2d-plan-img');
    if (fabImg) fabImg.src = dataUrl;

    // Update title
    const titleEl = document.getElementById('f2-plan-title');
    if (titleEl) titleEl.innerText = `Custom Upload: ${file.name}`;

    const planTitle = document.getElementById('plan-title-display');
    if (planTitle) planTitle.innerText = `Custom Upload: ${file.name}`;

    // Deselect preset buttons
    for (let i = 0; i < 5; i++) {
      const btn = document.getElementById(`f2-plan-btn-${i}`);
      if (btn) btn.classList.remove('active');
    }
  };
  reader.readAsDataURL(file);
}

function flow2SelectPresetPlan(idx) {
  selectArchitecturalPlan(idx);

  const plan = window.THERMA_REAL_PLANS[idx];
  const f2Img = document.getElementById('f2-plan-img');
  if (f2Img) f2Img.src = plan.image;

  const titleEl = document.getElementById('f2-plan-title');
  if (titleEl) titleEl.innerText = `${plan.title} (${plan.dimensions.sqft} sq.ft)`;

  const vastuEl = document.getElementById('f2-plan-vastu');
  if (vastuEl) vastuEl.innerText = `Vastu Score: ${plan.vastuScore}/100`;

  const dimEl = document.getElementById('f2-plan-dim');
  if (dimEl) dimEl.innerText = `${plan.dimensions.width} × ${plan.dimensions.depth}`;

  for (let i = 0; i < 5; i++) {
    const btn = document.getElementById(`f2-plan-btn-${i}`);
    if (btn) {
      if (i === idx) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }
}

// Flow 3 Custom 2D Plan Upload Handler
function flow3HandleCustomUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    
    // Update preview images
    const f3Img = document.getElementById('f3-plan-img');
    if (f3Img) f3Img.src = dataUrl;

    const fabImg = document.getElementById('fabricated-2d-plan-img');
    if (fabImg) fabImg.src = dataUrl;

    // Update title
    const titleEl = document.getElementById('f3-plan-title');
    if (titleEl) titleEl.innerText = `Custom Upload: ${file.name}`;

    const planTitle = document.getElementById('plan-title-display');
    if (planTitle) planTitle.innerText = `Existing Plan Upload: ${file.name}`;

    // Deselect preset buttons
    for (let i = 0; i < 5; i++) {
      const btn = document.getElementById(`f3-plan-btn-${i}`);
      if (btn) btn.classList.remove('active');
    }

    updateRetrofitCalculation();
  };
  reader.readAsDataURL(file);
}

function flow3SelectPresetPlan(idx) {
  selectArchitecturalPlan(idx);

  const plan = window.THERMA_REAL_PLANS[idx];
  const f3Img = document.getElementById('f3-plan-img');
  if (f3Img) f3Img.src = plan.image;

  const titleEl = document.getElementById('f3-plan-title');
  if (titleEl) titleEl.innerText = `${plan.title} (${plan.dimensions.sqft} sq.ft)`;

  for (let i = 0; i < 5; i++) {
    const btn = document.getElementById(`f3-plan-btn-${i}`);
    if (btn) {
      if (i === idx) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }

  updateRetrofitCalculation();
}

// Flow 3 Comprehensive Retrofit Calculation
function updateRetrofitCalculation() {
  const wallKey = document.getElementById('f3-wall-select')?.value || 'brick_230';
  const roofKey = document.getElementById('f3-roof-select')?.value || 'rcc_uninsulated';
  const glazeKey = document.getElementById('f3-glazing-select')?.value || 'single_al';
  const shadeKey = document.getElementById('f3-shading-select')?.value || 'none';

  const wallData = {
    brick_230: { name: 'Solid Clay Brick 230mm', baseU: 2.15, optU: 0.42 },
    stone_300: { name: 'Stone Masonry 300mm', baseU: 2.65, optU: 0.40 },
    concrete_200: { name: 'Solid Concrete Block 200mm', baseU: 2.45, optU: 0.38 },
    mud_brick: { name: 'Vernacular Mud Brick 350mm', baseU: 1.85, optU: 0.35 },
    aac_150: { name: 'Lightweight AAC Block 150mm', baseU: 0.95, optU: 0.32 }
  };

  const roofData = {
    rcc_uninsulated: { name: 'Bare Uninsulated RCC Slab 150mm', baseU: 2.85, optU: 0.34 },
    tin_sheet: { name: 'Corrugated Tin / Metal Sheet', baseU: 5.80, optU: 0.30 },
    clay_tile: { name: 'Single Clay Tiles', baseU: 3.20, optU: 0.36 },
    mud_flat: { name: 'Traditional Mud & Poplar Flat Roof', baseU: 2.10, optU: 0.28 },
    asbestos: { name: 'Asbestos Cement Sheet', baseU: 5.30, optU: 0.32 }
  };

  const glazeData = {
    single_al: { name: 'Single Clear Glass 4mm + Al Frame', baseU: 5.70, optU: 1.40 },
    single_wood: { name: 'Single Clear Glass 4mm + Wood Frame', baseU: 4.80, optU: 1.35 },
    unsealed_louver: { name: 'Unsealed Louvered Slats', baseU: 6.20, optU: 1.20 },
    double_clear: { name: 'Standard Double Glass (No Low-E)', baseU: 2.80, optU: 1.25 }
  };

  const shadeData = {
    none: { name: 'Unshaded (100% Sun)' },
    partial: { name: 'Small Chhajja 300mm' },
    deep: { name: 'Deep Verandah 900mm' }
  };

  const w = wallData[wallKey] || wallData.brick_230;
  const r = roofData[roofKey] || roofData.rcc_uninsulated;
  const g = glazeData[glazeKey] || glazeData.single_al;
  const s = shadeData[shadeKey] || shadeData.none;

  // Update Wall table
  const wallNameEl = document.getElementById('f3-matrix-wall-name');
  if (wallNameEl) wallNameEl.innerText = w.name;
  const wallBaseEl = document.getElementById('f3-matrix-wall-u-base');
  if (wallBaseEl) wallBaseEl.innerText = `U = ${w.baseU.toFixed(2)} W/m²K`;
  const wallOptEl = document.getElementById('f3-matrix-wall-u-opt');
  if (wallOptEl) wallOptEl.innerText = `U = ${w.optU.toFixed(2)} W/m²K`;
  const wallDiffEl = document.getElementById('f3-matrix-wall-diff');
  const wallImp = (((w.baseU - w.optU) / w.baseU) * 100).toFixed(1);
  if (wallDiffEl) wallDiffEl.innerText = `-${wallImp}% Heat Ingress`;

  // Update Roof table
  const roofNameEl = document.getElementById('f3-matrix-roof-name');
  if (roofNameEl) roofNameEl.innerText = r.name;
  const roofBaseEl = document.getElementById('f3-matrix-roof-u-base');
  if (roofBaseEl) roofBaseEl.innerText = `U = ${r.baseU.toFixed(2)} W/m²K`;
  const roofOptEl = document.getElementById('f3-matrix-roof-u-opt');
  if (roofOptEl) roofOptEl.innerText = `U = ${r.optU.toFixed(2)} W/m²K`;
  const roofDiffEl = document.getElementById('f3-matrix-roof-diff');
  const roofImp = (((r.baseU - r.optU) / r.baseU) * 100).toFixed(1);
  if (roofDiffEl) roofDiffEl.innerText = `-${roofImp}% Solar Gain`;

  // Update Glaze table
  const glazeNameEl = document.getElementById('f3-matrix-glaze-name');
  if (glazeNameEl) glazeNameEl.innerText = g.name;
  const glazeBaseEl = document.getElementById('f3-matrix-glaze-u-base');
  if (glazeBaseEl) glazeBaseEl.innerText = `U = ${g.baseU.toFixed(2)} W/m²K`;
  const glazeOptEl = document.getElementById('f3-matrix-glaze-u-opt');
  if (glazeOptEl) glazeOptEl.innerText = `U = ${g.optU.toFixed(2)} W/m²K`;
  const glazeDiffEl = document.getElementById('f3-matrix-glaze-diff');
  const glazeImp = (((g.baseU - g.optU) / g.baseU) * 100).toFixed(1);
  if (glazeDiffEl) glazeDiffEl.innerText = `-${glazeImp}% Conduction`;

  // Update Shading name
  const shadeNameEl = document.getElementById('f3-matrix-shade-name');
  if (shadeNameEl) shadeNameEl.innerText = s.name;

  // Compute overall financial impact
  const totalBaseU = w.baseU + r.baseU + (g.baseU * 0.4);
  const totalOptU = w.optU + r.optU + (g.optU * 0.4);
  const avgReduction = (totalBaseU - totalOptU) / totalBaseU;

  const estimatedSavings = Math.round(avgReduction * 48000);
  const estimatedCost = Math.round(72000 + (w.baseU * 4500));
  const payback = (estimatedCost / Math.max(1, estimatedSavings)).toFixed(1);
  const co2 = (avgReduction * 3.8).toFixed(1);

  const costEl = document.getElementById('f3-cost-val');
  if (costEl) costEl.innerText = `₹${estimatedCost.toLocaleString('en-IN')}`;

  const savEl = document.getElementById('f3-savings-val');
  if (savEl) savEl.innerText = `₹${estimatedSavings.toLocaleString('en-IN')} / Year`;

  const payEl = document.getElementById('f3-payback-val');
  if (payEl) payEl.innerText = `${payback} Years`;

  const co2El = document.getElementById('f3-co2-val');
  if (co2El) co2El.innerText = `${co2} Tons CO₂ / Year`;
}

// ==========================================
// 3. STEP 1: LEAFLET GIS & CLIMATE
// ==========================================
function initLeafletMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer || leafletMap) return;

  leafletMap = L.map('map').setView([ThermaState.lat, ThermaState.lon], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(leafletMap);

  leafletMarker = L.marker([ThermaState.lat, ThermaState.lon], { draggable: true }).addTo(leafletMap);

  leafletMap.on('click', function(e) {
    updateLocationCoords(e.latlng.lat, e.latlng.lng);
  });

  leafletMarker.on('dragend', function(e) {
    const latlng = e.target.getLatLng();
    updateLocationCoords(latlng.lat, latlng.lng);
  });
}

function updateLocationCoords(lat, lon) {
  ThermaState.lat = parseFloat(lat.toFixed(4));
  ThermaState.lon = parseFloat(lon.toFixed(4));
  if (leafletMarker) leafletMarker.setLatLng([ThermaState.lat, ThermaState.lon]);

  const coordsEl = document.getElementById('climate-coords');
  if (coordsEl) coordsEl.innerText = `${ThermaState.lat}° N, ${ThermaState.lon}° E`;

  // Fetch from backend API
  fetch(`/api/climate?lat=${ThermaState.lat}&lon=${ThermaState.lon}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.climate_summary) {
        const s = data.climate_summary;
        const zoneEl = document.getElementById('climate-zone');
        if (zoneEl) zoneEl.innerText = s.zone_name || 'Calculated Microclimate';
        const summerEl = document.getElementById('climate-summer-temp');
        if (summerEl) summerEl.innerText = `${s.summer_peak_temp_c || 32.0} °C`;
        const winterEl = document.getElementById('climate-winter-temp');
        if (winterEl) winterEl.innerText = `${s.winter_extreme_temp_c || 10.0} °C`;
      }
    })
    .catch(() => console.log('Loaded offline telemetry.'));
}

function onLocationPresetChange(val) {
  const p = LOCATION_PRESETS[val];
  if (!p) return;
  ThermaState.city = val;
  ThermaState.lat = p.lat;
  ThermaState.lon = p.lon;

  if (leafletMap) {
    leafletMap.setView([p.lat, p.lon], 8);
    if (leafletMarker) leafletMarker.setLatLng([p.lat, p.lon]);
  }

  const coordsEl = document.getElementById('climate-coords');
  if (coordsEl) coordsEl.innerText = `${p.lat}° N, ${p.lon}° E`;

  const zoneEl = document.getElementById('climate-zone');
  if (zoneEl) zoneEl.innerText = p.zone;

  const summerEl = document.getElementById('climate-summer-temp');
  if (summerEl) summerEl.innerText = p.summerTemp;

  const winterEl = document.getElementById('climate-winter-temp');
  if (winterEl) winterEl.innerText = p.winterTemp;

  const radEl = document.getElementById('climate-solar-rad');
  if (radEl) radEl.innerText = p.solarRad;

  const windEl = document.getElementById('climate-wind');
  if (windEl) windEl.innerText = p.wind;

  const dirEl = document.getElementById('climate-directive');
  if (dirEl) dirEl.innerText = p.strategy;
}

function searchCityLocation() {
  const query = document.getElementById('city-search')?.value?.trim().toLowerCase();
  if (!query) return;

  if (LOCATION_PRESETS[query]) {
    onLocationPresetChange(query);
    const sel = document.getElementById('location-select');
    if (sel) sel.value = query;
    return;
  }

  // Geocode via Nominatim
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then(data => {
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        updateLocationCoords(lat, lon);
        if (leafletMap) leafletMap.setView([lat, lon], 10);
      }
    })
    .catch(() => alert('Could not find location coordinates.'));
}

// ==========================================
// 4. FLOW 1 - STEP 2: SPECS & VASTU
// ==========================================
function updateBHKSelection(val) {
  ThermaState.bhk = val;
  const areaMap = { '1BHK': 650, '2BHK': 1200, '3BHK': 1850, '4BHK': 2600 };
  const area = areaMap[val] || 1200;
  ThermaState.areaSqFt = area;
  const areaInput = document.getElementById('plot-area-input');
  if (areaInput) areaInput.value = area;
  updateDimensionsFromArea(area);
}

function updateDimensionsFromArea(areaVal) {
  const area = parseFloat(areaVal) || 1200;
  ThermaState.areaSqFt = area;
  // Convert sqft to sqm
  const sqm = area * 0.0929;
  const aspect = 1.2; // L/W ratio
  const width = Math.sqrt(sqm / aspect);
  const length = width * aspect;

  ThermaState.widthM = parseFloat(width.toFixed(1));
  ThermaState.lengthM = parseFloat(length.toFixed(1));

  const wInput = document.getElementById('plot-width-input');
  const lInput = document.getElementById('plot-length-input');
  if (wInput) wInput.value = ThermaState.widthM;
  if (lInput) lInput.value = ThermaState.lengthM;

  calculateVastuScore();
}

function calculateVastuScore() {
  const facing = document.getElementById('facing-select')?.value || 'north';
  ThermaState.facing = facing;

  const scoreMap = { north: 94, east: 92, south: 78, west: 82 };
  const score = scoreMap[facing] || 88;

  const badge = document.getElementById('vastu-score-badge');
  if (badge) {
    badge.innerText = `${score}% (${score >= 90 ? 'A+ Compliant' : 'B+ Moderately Aligned'})`;
  }
}

// ==========================================
// 5. FLOW 4 - STEP 2: ANIMAL SPECIES & CAPACITY
// ==========================================
function selectAnimalType(species) {
  ThermaState.animalSpecies = species;
  const slider = document.getElementById('animal-herd-slider');

  if (species === 'cattle') {
    if (slider) { slider.min = 5; slider.max = 100; slider.value = 20; }
    updateAnimalHerdCapacity(20);
    selectAnimalPlan(0);
  } else if (species === 'poultry') {
    if (slider) { slider.min = 10; slider.max = 500; slider.value = 50; }
    updateAnimalHerdCapacity(50);
    selectAnimalPlan(1);
  }
}

function setAnimalHerdPreset(val) {
  const slider = document.getElementById('animal-herd-slider');
  if (slider) slider.value = val;
  updateAnimalHerdCapacity(val);
}

function updateAnimalHerdCapacity(val) {
  const count = parseInt(val, 10) || 20;
  ThermaState.animalHerdCount = count;

  const valEl = document.getElementById('animal-herd-val');
  if (valEl) valEl.innerText = `${count} Head`;

  let coveredPerHead = 4.5; // m2
  let openPerHead = 9.0;    // m2
  let eaves = "2.8 m";
  let ridge = "4.2 m";

  if (ThermaState.animalSpecies === 'goat') {
    coveredPerHead = 1.4;
    openPerHead = 2.5;
    eaves = "2.4 m";
    ridge = "3.6 m";
  } else if (ThermaState.animalSpecies === 'poultry') {
    coveredPerHead = 0.12;
    openPerHead = 0.0;
    eaves = "2.6 m";
    ridge = "3.8 m";
  }

  const covArea = (count * coveredPerHead).toFixed(1);
  const opArea = (count * openPerHead).toFixed(1);
  const width = 6.0;
  const length = (covArea / width).toFixed(1);

  const covEl = document.getElementById('animal-covered-area');
  if (covEl) covEl.innerText = `${covArea} m²`;

  const opEl = document.getElementById('animal-open-area');
  if (opEl) opEl.innerText = `${opArea} m²`;

  const dimEl = document.getElementById('animal-shelter-dim');
  if (dimEl) dimEl.innerText = `${length} m × ${width} m`;

  const hEl = document.getElementById('animal-shelter-height');
  if (hEl) hEl.innerText = `${ridge} / ${eaves}`;
}

// ==========================================
// 6. STEP 3: 2D ARCHITECTURAL PLANS & DATASET
// ==========================================
window.THERMA_REAL_PLANS = [
  {
    id: "plan-1",
    title: "Plan 1: 2/3 BHK Executive Villa",
    bhk: "2BHK",
    facing: "East / South",
    vastuScore: 94,
    image: "assets/plan_1.png",
    dimensions: { width: "10.26m (33'-8\")", depth: "10.49m (34'-5\")", sqft: 1158 },
    rooms: [
      "🛏️ Bed 1: 294 × 294 cm (9'8\" × 9'8\")",
      "🛏️ Master Bed 2: 294 × 438 cm (9'8\" × 14'4\")",
      "🍽️ Dining: 312 × 444 cm (10'3\" × 14'7\")",
      "🍳 Kitchen: 324 × 240 cm (10'8\" × 7'10\")",
      "🛋️ Hall: 528 × 372 cm (17'4\" × 12'2\")",
      "🚿 W/C: 192 × 138 cm (6'4\" × 4'6\")",
      "📦 Store: 120 × 180 cm (3'11\" × 5'11\")",
      "🌿 Sit-Out: 312 × 138 cm (10'3\" × 4'6\")",
      "🪜 Staircase: Internal (UP)"
    ]
  },
  {
    id: "plan-2",
    title: "Plan 2: 4 BHK Suburban Residence",
    bhk: "4BHK",
    facing: "South / East",
    vastuScore: 92,
    image: "assets/plan_2.png",
    dimensions: { width: "8.00m (26'-3\")", depth: "9.50m (31'-2\")", sqft: 960 },
    rooms: [
      "🛏️ Master Bed: 4.00m × 3.35m + T&B",
      "🛏️ Bed 4: 4.00m × 3.50m",
      "🛏️ Bed 2: 2.80m × 3.00m",
      "🛏️ Bed 1: 2.80m × 3.00m",
      "🛋️ Living: 4.00m × 2.70m",
      "🍽️ Dining: 4.00m × 2.00m",
      "🍳 Kitchen: 3.80m × 2.00m",
      "🚿 Common Bath: 2.80m × 0.70m",
      "🏛️ Front Porch: 4.12m × 2.00m",
      "🧺 Laundry: 1.50m × 3.30m"
    ]
  },
  {
    id: "plan-3",
    title: "Plan 3: 5 BHK Luxury Manor",
    bhk: "4BHK",
    facing: "South / East",
    vastuScore: 95,
    image: "assets/plan_3.png",
    dimensions: { width: "12.80m (42'-0\")", depth: "9.00m (29'-6\")", sqft: 1240 },
    rooms: [
      "🛏️ Bed 1: 13.6 m² (NW)",
      "🛏️ Bed 2: 24.4 m² (North)",
      "🛏️ Master Suite: 20.2 m² (NE)",
      "🛏️ Bed 4: 14.7 m² (SW)",
      "🛏️ Bed 5: 12.9 m² (South)",
      "🛋️ Grand Living: 49.6 m²",
      "🍽️ Dining: 21.4 m²",
      "🛋️ Formal Living: 29.2 m²",
      "🚿 3 Luxury Baths (inc. 8.4 m² Master)",
      "🍳 Chef's Kitchen + Utility"
    ]
  },
  {
    id: "plan-4",
    title: "Plan 4: 1 BHK Minimalist Studio",
    bhk: "1BHK",
    facing: "South / East",
    vastuScore: 93,
    image: "assets/plan_4.png",
    dimensions: { width: "23'-10 3/4\"", depth: "20'-2 3/4\"", sqft: 483 },
    rooms: [
      "🛋️ Living: 10'-8\" × 10'-1\" (108 sq.ft)",
      "🍽️ Dining + Kitchen: 11'-10\" × 10'-3\"",
      "🛏️ Bedroom: 8'-3\" × 8'-5\" (70 sq.ft)",
      "💼 Office Nook: 6.7 sq.ft",
      "👗 Walk-in Closet (W.I.C): 7.2 sq.ft",
      "🚪 Entry Foyer: 42.6 sq.ft",
      "🛁 Full Bath with Tub: 45.4 sq.ft"
    ]
  },
  {
    id: "plan-5",
    title: "Plan 5: 1 BHK Solar Chamfer Villa",
    bhk: "1BHK",
    facing: "South / East",
    vastuScore: 91,
    image: "assets/plan_5.png",
    dimensions: { width: "26'-9\"", depth: "23'-0\"", sqft: 495 },
    rooms: [
      "🛋️ Living Room: 208 sq.ft (Angled Facade)",
      "📐 Chamfer Wall: 15'-4\" Solar Vector",
      "🛏️ Bedroom: 12'-10\" × 7'-11\" (101 sq.ft)",
      "🚪 Entrance Foyer: 87 sq.ft",
      "🛁 Full Bath with Tub: 53 sq.ft",
      "🍳 Gourmet Kitchen: 46 sq.ft"
    ]
  }
];

window.activePlanIndex = 0;

function getOptimalPlanIndex(bhk, area) {
  if (bhk === '1BHK') {
    return area >= 490 ? 4 : 3;
  } else if (bhk === '2BHK' || bhk === '3BHK') {
    return 0; // Plan 1
  } else if (bhk === '4BHK') {
    return area >= 1200 ? 2 : 1; // Plan 3 or Plan 2
  }
  return 0;
}

function selectArchitecturalPlan(idx) {
  if (idx < 0 || idx >= window.THERMA_REAL_PLANS.length) return;
  window.activePlanIndex = idx;
  const plan = window.THERMA_REAL_PLANS[idx];

  // Update image and titles
  const imgEl = document.getElementById('fabricated-2d-plan-img');
  if (imgEl) imgEl.src = plan.image;

  const titleEl = document.getElementById('plan-title-display');
  if (titleEl) titleEl.innerText = `${plan.title} (${plan.dimensions.sqft} sq.ft)`;

  const vastuBadge = document.getElementById('plan-vastu-badge');
  if (vastuBadge) vastuBadge.innerText = `Vastu Score: ${plan.vastuScore}/100`;

  const dimBadge = document.getElementById('plan-dim-badge');
  if (dimBadge) dimBadge.innerText = `${plan.dimensions.width} × ${plan.dimensions.depth}`;

  // Update room list
  const roomsListEl = document.getElementById('plan-room-schedule-list');
  if (roomsListEl) {
    roomsListEl.innerHTML = plan.rooms.map(r => `<li>${r}</li>`).join('');
  }

  // Sync state
  ThermaState.bhk = plan.bhk;
  ThermaState.areaSqFt = plan.dimensions.sqft;

  // Highlight button
  for (let i = 0; i < 5; i++) {
    const btn = document.getElementById(`plan-btn-${i}`);
    if (btn) {
      if (i === idx) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }

  // Update linked 3D model
  updateLinked3DModel();
}

function generate2DPlan() {
  const optIdx = getOptimalPlanIndex(ThermaState.bhk, ThermaState.areaSqFt);
  selectArchitecturalPlan(optIdx);
// 2D Real Animal Shelter Plans (Strictly User-Uploaded Blueprints)
window.THERMA_ANIMAL_PLANS = [
  {
    id: 'animal_plan_1',
    title: 'Plan 1: Dairy Cow Shed with Cubicles & Milking Bay',
    species: 'cattle',
    capacityText: 'Dairy Cows (5 Cubicles, Milking Place, Calf Pen, Chaff Cutter & Sump)',
    dimensions: { sqft: 515, width: '8.4m (28\')', depth: '5.7m (19\')' },
    ventilation: 'Natural Cross-Draft + Slope Drainage & Open Ridge Stack (14.2 ACH)',
    image: 'assets/animal_plan_1.png',
    rooms: [
      'Store Room (1.2m × 2.1m / 4\' × 7\')',
      'Milking Place (1.2m × 2.1m / 4\' × 7\')',
      '5 Cow Cubicles (1.2m each × 2.1m / 4\' × 7\')',
      'Central Sloped Dairy Drainage Passage (8.4m × 3.0m)',
      'Place for Chaff Cutter (1.2m × 1.5m / 4\' × 5\')',
      'Isolated Calf Pen (1.2m × 1.5m / 4\' × 5\')',
      'Walking & Feeding Line (3.4m Feed Trough, 1.2m Water, 1.2m Feed)'
    ],
    model3d: {
      id: '3b751ac688eb41319da3878b6a9901e9',
      name: 'Plan 1: Dairy Cow Barn 3D Digital Twin (LibraHades Barn Model)',
      embedUrl: 'https://sketchfab.com/models/3b751ac688eb41319da3878b6a9901e9/embed?autostart=1&ui_theme=dark&ui_watermark=0'
    },
    roofMat: 'thatch',
    floorMat: 'grooved_concrete'
  },
  {
    id: 'animal_plan_2',
    title: 'Plan 2: Poultry / Broiler / Layer House (Elevated Coop & Nests)',
    species: 'poultry',
    capacityText: '25-50 Birds (Elevated Roost with Dropping Tray & 5 Nest Boxes)',
    dimensions: { sqft: 72, width: '9\'-0" (2.7m)', depth: '8\'-0" (2.4m)' },
    ventilation: '1" Full Poultry Mesh Cross-Ventilation & 37" Elevated Under-Draft (18.5 ACH)',
    image: 'assets/animal_plan_3.png',
    rooms: [
      'Elevated Roost Assembly with Removable Dropping Tray (2"×2" Perch Poles)',
      '5-Compartment Egg-Laying Nest Box Unit (Below Roost)',
      '37" High Off-Ground Stilt Elevation (Predator Protection & Under-Draft)',
      'Roost Cleanout Door & Dedicated Nest Egg Collection Hatch',
      'Sloped 9\'-0" Aluminum / Galvanized Corrugated Roof with 2"×4" Rafters'
    ],
    model3d: {
      id: 'd4d6257cb2a24730b9d79216c94ba8c9',
      name: 'Plan 2: Poultry / Broiler / Layer House 3D Digital Twin (Solva Gabled Timber Structure)',
      embedUrl: 'https://sketchfab.com/models/d4d6257cb2a24730b9d79216c94ba8c9/embed?autostart=1&ui_theme=dark&ui_watermark=0'
    },
    roofMat: 'thatch',
    floorMat: 'rubber_mat'
  }
];

window.activeAnimalPlanIndex = 0;

function selectAnimalPlan(idx) {
  window.activeAnimalPlanIndex = idx;
  const plan = window.THERMA_ANIMAL_PLANS[idx];
  if (!plan) return;

  const imgEl = document.getElementById('animal-plan-img');
  if (imgEl) imgEl.src = plan.image;

  const titleEl = document.getElementById('animal-plan-title');
  if (titleEl) titleEl.innerText = `${plan.title} (${plan.dimensions.sqft} sq.ft)`;

  const capEl = document.getElementById('animal-plan-capacity');
  if (capEl) capEl.innerText = plan.capacityText;

  const dimEl = document.getElementById('animal-plan-dim');
  if (dimEl) dimEl.innerText = `${plan.dimensions.width} × ${plan.dimensions.depth} (Total: ${plan.dimensions.sqft} sq.ft)`;

  const ventEl = document.getElementById('animal-plan-vent');
  if (ventEl) ventEl.innerText = plan.ventilation;

  const roofEl = document.getElementById('animal-roof-material');
  if (roofEl) roofEl.value = plan.roofMat;

  const floorEl = document.getElementById('animal-floor-material');
  if (floorEl) floorEl.value = plan.floorMat;

  for (let i = 0; i < 5; i++) {
    const btn = document.getElementById(`animal-plan-btn-${i}`);
    if (btn) {
      if (i === idx) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }

  updateLinkedAnimal3DModel();
}

function animalHandleCustomUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    
    const imgEl = document.getElementById('animal-plan-img');
    if (imgEl) imgEl.src = dataUrl;

    const titleEl = document.getElementById('animal-plan-title');
    if (titleEl) titleEl.innerText = `Custom Shelter Blueprint: ${file.name}`;

    for (let i = 0; i < 5; i++) {
      const btn = document.getElementById(`animal-plan-btn-${i}`);
      if (btn) btn.classList.remove('active');
    }

    updateLinkedAnimal3DModel();
  };
  reader.readAsDataURL(file);
}

function updateLinkedAnimal3DModel() {
  const idx = window.activeAnimalPlanIndex || 0;
  const plan = window.THERMA_ANIMAL_PLANS[idx] || window.THERMA_ANIMAL_PLANS[0];
  const model = plan.model3d;

  const label = document.getElementById('animal-step4-plan-name');
  const ifrContainer = document.getElementById('iframe-animal-3d-container');
  const ifr = document.getElementById('iframe-animal-3d-model');
  const toggleBtns = document.getElementById('animal-3d-toggle-buttons');
  const canvasWrap = document.getElementById('animal-viewer-3d-container');

  if (model && model.id) {
    if (label) label.innerText = `Active 3D BIM Model: ${model.name}`;
    if (ifrContainer) ifrContainer.style.display = 'block';
    if (canvasWrap) canvasWrap.style.display = 'none';
    if (toggleBtns) toggleBtns.style.display = 'block';
    if (ifr) {
      const targetSrc = model.embedUrl || `https://sketchfab.com/models/${model.id}/embed?autostart=1&ui_theme=dark&ui_watermark=0`;
      if (!ifr.src || !ifr.src.includes(model.id)) {
        ifr.src = targetSrc;
      }
    }
  } else {
    if (label) label.innerText = `Active Shelter Blueprint: ${plan.title}`;
    if (ifrContainer) ifrContainer.style.display = 'none';
    if (canvasWrap) canvasWrap.style.display = 'block';
    if (toggleBtns) toggleBtns.style.display = 'none';
    setTimeout(initAnimal3DViewer, 100);
  }

  const prevImg = document.getElementById('animal-step4-preview-img');
  if (prevImg) {
    const mainImg = document.getElementById('animal-plan-img');
    prevImg.src = mainImg && mainImg.src ? mainImg.src : plan.image;
  }
}

function switchAnimal3DViewerType(type) {
  const ifrWrap = document.getElementById('iframe-animal-3d-container');
  const canvasWrap = document.getElementById('animal-viewer-3d-container');

  if (type === 'iframe') {
    if (ifrWrap) ifrWrap.style.display = 'block';
    if (canvasWrap) canvasWrap.style.display = 'none';
    updateLinkedAnimal3DModel();
  } else {
    if (ifrWrap) ifrWrap.style.display = 'none';
    if (canvasWrap) canvasWrap.style.display = 'block';
    initAnimal3DViewer();
  }
}

function updateAnimal2DLayout() {
  selectAnimalPlan(window.activeAnimalPlanIndex || 0);
}

// ==========================================
// 7. STEP 4: LINKED 3D BIM MODELS & VIEWERS
// ==========================================
function get3DModelForState(bhk) {
  const planIdx = window.activePlanIndex || 0;

  if (planIdx === 2 || bhk === '4BHK' && planIdx === 2) {
    return {
      id: 'e12a98899af142e088e2c25140dbab53',
      name: 'Plan 3 — 5 BHK Luxury Manor Digital Twin',
      embedUrl: 'https://sketchfab.com/models/e12a98899af142e088e2c25140dbab53/embed?autostart=1&ui_theme=dark&ui_watermark=0'
    };
  } else if (planIdx === 1 || bhk === '4BHK') {
    return {
      id: 'bee019fae08d4389a125cb7fa1331fe8',
      name: 'Plan 2 — 4 BHK Suburban Residence 3D Model',
      embedUrl: 'https://sketchfab.com/models/bee019fae08d4389a125cb7fa1331fe8/embed?autostart=1&ui_theme=dark&ui_watermark=0'
    };
  } else if (planIdx === 3 || planIdx === 4 || bhk === '1BHK') {
    return {
      id: '215681b689434f82acbbe6d58a5207dd',
      name: 'Plan 4/5 — 1 BHK Studio 360° BIM Model',
      embedUrl: 'https://sketchfab.com/models/215681b689434f82acbbe6d58a5207dd/embed?autostart=1&ui_theme=dark&ui_watermark=0'
    };
  } else if (bhk === '3BHK') {
    return {
      id: '66f34987790e4deaa5d3c3a20fff3256',
      name: 'Plan 1 — 3 BHK West Branch Idea 1 Digital Twin',
      embedUrl: 'https://sketchfab.com/models/66f34987790e4deaa5d3c3a20fff3256/embed?autostart=1&ui_theme=dark&ui_watermark=0'
    };
  } else {
    // 2BHK Default
    return {
      id: 'e7cc06b3ddc241239bb4e84a180f451f',
      name: 'Plan 1 — 2 BHK HUB Residence Digital Twin',
      embedUrl: 'https://sketchfab.com/models/e7cc06b3ddc241239bb4e84a180f451f/embed?autostart=1&ui_theme=dark&ui_watermark=0'
    };
  }
}

function updateLinked3DModel() {
  const model = get3DModelForState(ThermaState.bhk);
  const ifr = document.getElementById('iframe-3d-model');
  if (ifr && (!ifr.src || !ifr.src.includes(model.id))) {
    ifr.src = model.embedUrl;
  }
  const label = document.getElementById('step4-plan-name');
  if (label) {
    label.innerText = `Active 3D BIM Model: ${model.name}`;
  }
}

function switch3DViewerType(type) {
  const ifrWrap = document.getElementById('iframe-3d-container');
  const canvasWrap = document.getElementById('viewer-3d-container');

  if (type === 'iframe') {
    if (ifrWrap) ifrWrap.style.display = 'block';
    if (canvasWrap) canvasWrap.style.display = 'none';
    updateLinked3DModel();
  } else {
    if (ifrWrap) ifrWrap.style.display = 'none';
    if (canvasWrap) canvasWrap.style.display = 'block';
    init3DViewer();
  }
}

let scene3D, camera3D, renderer3D, houseMesh;
let animalScene, animalCamera, animalRenderer, shelterMesh;

function init3DViewer() {
  const container = document.getElementById('viewer-3d');
  if (!container || scene3D) return;

  const w = container.clientWidth || 600;
  const h = 400;

  scene3D = new THREE.Scene();
  scene3D.background = new THREE.Color(0x1a1a1a);

  camera3D = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera3D.position.set(15, 12, 18);
  camera3D.lookAt(0, 2, 0);

  renderer3D = new THREE.WebGLRenderer({ antialias: true });
  renderer3D.setSize(w, h);
  container.innerHTML = '';
  container.appendChild(renderer3D.domElement);

  // Lighting
  const ambLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene3D.add(ambLight);
  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  dirLight.position.set(20, 30, 15);
  scene3D.add(dirLight);

  // Ground Grid
  const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
  scene3D.add(grid);

  // House Geometry
  const geom = new THREE.BoxGeometry(8, 3.2, 10);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd9c5b2, roughness: 0.8 });
  houseMesh = new THREE.Mesh(geom, mat);
  houseMesh.position.y = 1.6;
  scene3D.add(houseMesh);

  // Pitched Roof
  const roofGeom = new THREE.ConeGeometry(7, 2, 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 });
  const roof = new THREE.Mesh(roofGeom, roofMat);
  roof.position.y = 4.2;
  roof.rotation.y = Math.PI / 4;
  scene3D.add(roof);

  function animate() {
    requestAnimationFrame(animate);
    if (houseMesh) houseMesh.rotation.y += 0.003;
    if (roof) roof.rotation.y += 0.003;
    renderer3D.render(scene3D, camera3D);
  }
  animate();
}

function setViewerMode(mode) {
  ThermaState.viewerMode = mode;
  if (!houseMesh) return;

  if (mode === 'thermal') {
    houseMesh.material = new THREE.MeshBasicMaterial({ color: 0xff3300, wireframe: false });
  } else if (mode === 'wireframe') {
    houseMesh.material = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
  } else if (mode === 'cutaway') {
    houseMesh.material = new THREE.MeshStandardMaterial({ color: 0x77aa99, transparent: true, opacity: 0.5 });
  } else {
    houseMesh.material = new THREE.MeshStandardMaterial({ color: 0xd9c5b2, roughness: 0.8 });
  }
}

function toggleSunPath() {
  ThermaState.sunPathActive = !ThermaState.sunPathActive;
  alert(`Sun Path Trajectory: ${ThermaState.sunPathActive ? 'Visible (Summer 72° Solstice Arc)' : 'Hidden'}`);
}

function toggleAirflowVectors() {
  ThermaState.airflowActive = !ThermaState.airflowActive;
  alert(`Airflow Streamlines: ${ThermaState.airflowActive ? 'Active (Natural Ventilation Streamlines)' : 'Disabled'}`);
}

function initAnimal3DViewer() {
  const container = document.getElementById('animal-shelter-canvas');
  if (!container || animalScene) return;

  const w = container.clientWidth || 600;
  const h = 400;

  animalScene = new THREE.Scene();
  animalScene.background = new THREE.Color(0x111e16);

  animalCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  animalCamera.position.set(16, 10, 16);
  animalCamera.lookAt(0, 1.5, 0);

  animalRenderer = new THREE.WebGLRenderer({ antialias: true });
  animalRenderer.setSize(w, h);
  container.innerHTML = '';
  container.appendChild(animalRenderer.domElement);

  const amb = new THREE.AmbientLight(0xffffff, 0.8);
  animalScene.add(amb);

  const dir = new THREE.DirectionalLight(0xffe0b2, 1.3);
  dir.position.set(15, 25, 10);
  animalScene.add(dir);

  const grid = new THREE.GridHelper(24, 24, 0x1b4d3e, 0x0f2b23);
  animalScene.add(grid);

  // Open Shelter Framing
  const geom = new THREE.BoxGeometry(12, 2.8, 6);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3d704d, wireframe: false });
  shelterMesh = new THREE.Mesh(geom, mat);
  shelterMesh.position.y = 1.4;
  animalScene.add(shelterMesh);

  function animateAnimal() {
    requestAnimationFrame(animateAnimal);
    if (shelterMesh) shelterMesh.rotation.y += 0.003;
    animalRenderer.render(animalScene, animalCamera);
  }
  animateAnimal();
}

function setAnimalViewMode(mode) {
  ThermaState.animalViewMode = mode;
  if (!shelterMesh) return;

  if (mode === 'thermal') {
    shelterMesh.material = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: false });
  } else if (mode === 'realistic') {
    shelterMesh.material = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
  } else if (mode === 'vectors') {
    shelterMesh.material = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
  } else if (mode === 'stalls') {
    shelterMesh.material = new THREE.MeshStandardMaterial({ color: 0x446655, transparent: true, opacity: 0.6 });
  }
}

// ==========================================
// 8. STEP 5: SIMULATIONS & EXPORTS
// ==========================================
function runCFDSimulation() {
  fetch('/api/simulate-thermal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bhk: ThermaState.bhk,
      lat: ThermaState.lat,
      lon: ThermaState.lon,
      wall: ThermaState.wallMat,
      roof: ThermaState.roofMat,
      glazing: ThermaState.glazingMat
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data && data.peak_indoor_temp_c) {
        const peak = data.peak_indoor_temp_c.toFixed(1);
        const optEl = document.getElementById('res-peak-temp-opt');
        if (optEl) optEl.innerText = `${peak} °C`;
      }
    })
    .catch(() => console.log('Loaded offline thermal simulation metrics.'));
}

function runAnimalSimulation() {
  fetch('/api/animal-shelter/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      species: ThermaState.animalSpecies,
      herd_count: ThermaState.animalHerdCount,
      orientation: ThermaState.animalOrientation,
      roof: ThermaState.animalRoof
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data) {
        const thiEl = document.getElementById('animal-thi-optimized');
        if (thiEl && data.indoor_thi) thiEl.innerText = `${data.indoor_thi.toFixed(1)} (Optimal Comfort Zone)`;
        const achEl = document.getElementById('animal-ach');
        if (achEl && data.natural_ach) achEl.innerText = `${data.natural_ach.toFixed(1)} Air Changes/Hour`;
      }
    })
    .catch(() => console.log('Loaded offline livestock THI evaluation.'));
}

function downloadSTEPFile() {
  const blob = new Blob(['ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((\'ThermaBuild Bioclimatic BIM Model\'),\'2;1\');\nENDSEC;\nEND-ISO-10303-21;'], { type: 'application/step' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ThermaBuild_${ThermaState.bhk}_Model.step`;
  a.click();
}

function downloadCFDPythonScript() {
  const pyCode = `# ThermaBuild PyFluent CFD Conjugate Heat Transfer Script
import ansys.fluent.core as pyfluent

session = pyfluent.launch_fluent(precision="double", processor_count=4)
session.tui.file.read_case("house_mesh.cas.h5")
session.solver.root.models.energy.enabled = True
session.solver.root.models.viscous.model = "k-epsilon"
session.solver.root.solution.run_calculation.iterate(iter_count=250)
print("Simulation complete. Exporting thermal slices.")`;

  const blob = new Blob([pyCode], { type: 'text/x-python' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'run_pyfluent_thermal_cfd.py';
  a.click();
}

// ==========================================
// 9. INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  initLeafletMap();
  switchMainFlow(1);
});
