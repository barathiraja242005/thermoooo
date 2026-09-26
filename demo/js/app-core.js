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
// Sites open on satellite imagery, close enough to see individual houses
const SITE_ZOOM = 17;
let leafletMarker = null;

// ==========================================
// 1. FLOW SWITCHER
// ==========================================
// Step Unlocking Registry per Flow (Gating Engine)
if (!ThermaState.unlockedSteps) {
  ThermaState.unlockedSteps = { 1: 1, 2: 1, 3: 1, 4: 1 };
}

function unlockStep(flowNum, stepNum) {
  if (!ThermaState.unlockedSteps) ThermaState.unlockedSteps = { 1: 1, 2: 1, 3: 1, 4: 1 };
  if (stepNum > (ThermaState.unlockedSteps[flowNum] || 1)) {
    ThermaState.unlockedSteps[flowNum] = stepNum;
  }
  updatePipelineStepperUI();
}

function isStepUnlocked(stepNum) {
  const maxUnlocked = ThermaState.unlockedSteps ? (ThermaState.unlockedSteps[ThermaState.activeFlow] || 1) : 1;
  return stepNum <= maxUnlocked;
}

function updatePipelineStepperUI() {
  const flow = ThermaState.activeFlow;
  const current = ThermaState.currentStep;
  const maxUnlocked = ThermaState.unlockedSteps ? (ThermaState.unlockedSteps[flow] || 1) : 1;

  const totalSteps = flow === 2 ? 4 : 5;
  const prefix = (flow === 1 || flow === 4) ? 'step-tab-' : (flow === 2 ? 'f2-tab-' : 'f3-tab-');

  for (let i = 1; i <= totalSteps; i++) {
    const tab = document.getElementById(`${prefix}${i}`);
    if (!tab) continue;

    tab.classList.remove('active', 'completed', 'locked');
    if (i === current) {
      tab.classList.add('active');
    } else if (i < current || (i <= maxUnlocked && i < current)) {
      tab.classList.add('completed');
    } else if (i > maxUnlocked) {
      tab.classList.add('locked');
    }
  }
}

function switchMainFlow(flowNum) {
  ThermaState.activeFlow = flowNum;

  // Update flow buttons and top navigation
  for (let f = 1; f <= 4; f++) {
    const btn = document.getElementById(`flow-card-${f}`);
    if (btn) {
      if (f === flowNum) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    const navBtn = document.getElementById(`nav-flow-${f}`);
    if (navBtn) {
      if (f === flowNum) navBtn.classList.add('active');
      else navBtn.classList.remove('active');
    }
  }

  // Update Stepper Rails
  const s1 = document.getElementById('stepper-flow-1');
  const s2 = document.getElementById('stepper-flow-2');
  const s3 = document.getElementById('stepper-flow-3');

  if (s1) s1.style.display = (flowNum === 1 || flowNum === 4) ? 'flex' : 'none';
  if (s2) s2.style.display = flowNum === 2 ? 'flex' : 'none';
  if (s3) s3.style.display = flowNum === 3 ? 'flex' : 'none';

  // Step names for the shared stepper (Flow 1: home, Flow 4: shelter)
  if (flowNum === 4) {
    setStepperTitles([
      { title: 'Pick your site', sub: 'Climate and orientation' },
      { title: 'Herd and shelter', sub: 'Animals, size and axis' },
      { title: 'Shelter plan', sub: 'Roof, walls and floor' },
      { title: 'See it in 3D', sub: 'Airflow through the ridge' },
      { title: 'Your report', sub: 'Heat stress and specs' }
    ]);
  } else if (flowNum === 1) {
    setStepperTitles([
      { title: 'Pick your site', sub: 'Climate and orientation' },
      { title: 'Shape the home', sub: 'Plot, rooms and facing' },
      { title: 'Choose materials', sub: 'Plan and envelope' },
      { title: 'See it in 3D', sub: 'Sun and heat' },
      { title: 'Your report', sub: 'Performance and specs' }
    ]);
  }

  // Initialize and go to Step 1
  goToStep(1);
}

function setStepperTitles(tabs) {
  for (let i = 1; i <= 5; i++) {
    const t = tabs[i - 1];
    if (!t) continue;
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
  // Gating check
  const maxUnlocked = ThermaState.unlockedSteps ? (ThermaState.unlockedSteps[ThermaState.activeFlow] || 1) : 1;
  if (stepNum > maxUnlocked) {
    alert(`Finish step ${maxUnlocked} first, then this one unlocks.`);
    return;
  }

  ThermaState.currentStep = stepNum;
  updatePipelineStepperUI();

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
    else if (stepNum === 5) { updateResidentialMaterialsReport(); runCFDSimulation(); }

  } else if (ThermaState.activeFlow === 4) {
    // Animal House (Flow 4: Steps 2..5)
    const target = document.getElementById(`animal-flow-step-${stepNum}`);
    if (target) target.style.display = 'block';

    if (stepNum === 3) updateAnimal2DLayout();
    else if (stepNum === 4) updateLinkedAnimal3DModel();
    else if (stepNum === 5) { updateLivestockMaterialsReport(); runAnimalSimulation(); }

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
      updateResidentialMaterialsReport();
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
      updateResidentialMaterialsReport();
      runCFDSimulation();
    }
  }
}

// Sequential Gated Progression Handlers
function proceedToStep2() {
  unlockStep(ThermaState.activeFlow, 2);
  goToStep(2);
}

function proceedToStep3() {
  unlockStep(ThermaState.activeFlow, 3);
  goToStep(3);
}

function proceedToStep4() {
  unlockStep(ThermaState.activeFlow, 4);
  goToStep(4);
}

function proceedToStep5() {
  unlockStep(ThermaState.activeFlow, 5);
  goToStep(5);
}

// Helper navigation functions for shared Step 4 & Step 5 panels
function navigateStep4Back() {
  if (ThermaState.activeFlow === 1) goToStep(3);
  else if (ThermaState.activeFlow === 2) goToStep(2);
  else if (ThermaState.activeFlow === 3) goToStep(3);
  else if (ThermaState.activeFlow === 4) goToStep(3);
}

function navigateStep4Next() {
  unlockStep(ThermaState.activeFlow, 5);
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
    brick_230: {
      name: 'Solid Clay Brick 230mm',
      flaw: 'Zero thermal insulation; high thermal conductivity (k=0.81 W/m·K); acts as heat sponge releasing stored daytime heat into bedrooms at night; high cold-bridge risk.',
      upgrade: '50mm External Expanded Polystyrene (EPS) + Lime Plaster',
      sol: 'Continuous exterior EIFS insulation shifts dew point outside masonry, eliminates thermal bridging, and blocks radiant heat penetration.',
      baseU: 2.15,
      optU: 0.42
    },
    stone_300: {
      name: 'Heavy Stone Masonry 300mm',
      flaw: 'Massive thermal mass without insulation; causes extreme winter interior chilling (U=2.65 W/m²K), high drafts, and internal condensation mould.',
      upgrade: '75mm External Rockwool Cavity Board + Breathable Lime Wash',
      sol: 'Breathable external insulation preserves stone mass benefits while adding R-2.2 continuous thermal resistance.',
      baseU: 2.65,
      optU: 0.40
    },
    concrete_200: {
      name: 'Solid Concrete Block 200mm',
      flaw: 'Severe conductive thermal bridges (k=1.40 W/m·K); rapid temperature swings; ceiling/wall junction dampness.',
      upgrade: '50mm External XPS Board with Fiber Mesh Basecoat',
      sol: 'Complete thermal envelope isolation; prevents internal surface condensation and drops wall heat ingress by 84.5%.',
      baseU: 2.45,
      optU: 0.38
    },
    mud_brick: {
      name: 'Vernacular Sun-Dried Mud Brick 350mm',
      flaw: 'Unstabilized mud brick suffers surface erosion, micro-cracks, and unbuffered monsoon humidity ingress (U=1.85 W/m²K).',
      upgrade: 'Lime-Stabilized Mud Plaster + 40mm Breathable Wood Fiber Board',
      sol: 'Preserves natural hygroscopic breathability while improving thermal resistance by 81.1%.',
      baseU: 1.85,
      optU: 0.35
    },
    aac_150: {
      name: 'Lightweight AAC Block 150mm',
      flaw: 'Unrendered AAC blocks absorb ambient rainwater causing loss of intrinsic thermal insulating properties.',
      upgrade: 'Hydrophobic Breathable Silicone Render + 30mm Mineral Wool',
      sol: 'Weatherproofs exterior envelope and brings overall U-value down to ECBC super-compliant levels.',
      baseU: 0.95,
      optU: 0.32
    }
  };

  const roofData = {
    rcc_uninsulated: {
      name: 'Bare Uninsulated RCC Slab 150mm',
      flaw: 'Absorbs 88% solar radiation; surface temp exceeds 58°C; severe radiant heating on top-floor occupants; thermal expansion cracking.',
      upgrade: 'High-Albedo Cool Roof SRI 104 Coating + 50mm Overdeck XPS',
      sol: 'High SRI coating reflects 92% solar rays; XPS insulation halts downward conductive heat flux into the structural slab.',
      baseU: 2.85,
      optU: 0.34
    },
    tin_sheet: {
      name: 'Corrugated Tin / Metal Sheet',
      flaw: 'Extreme heat transmitter (U=5.80 W/m²K); creates intolerable oven-like indoor conditions in summer and freezing cold in winter.',
      upgrade: '50mm Underdeck Glasswool with Aluminum Foil + Cool Roof Paint',
      sol: 'Blocks 95% of direct radiant and conductive transfer through metal sheet.',
      baseU: 5.80,
      optU: 0.30
    },
    clay_tile: {
      name: 'Single Terracotta Clay Tiles',
      flaw: 'Uninsulated tiled roof allows air infiltration and thermal radiation leakage through gaps (U=3.20 W/m²K).',
      upgrade: 'Under-Rafter Radiant Barrier Foil + 50mm Cellulose Insulation',
      sol: 'Creates airtight radiant reflection and thermal blanket under timber rafters.',
      baseU: 3.20,
      optU: 0.36
    },
    mud_flat: {
      name: 'Traditional Mud & Poplar Flat Roof',
      flaw: 'Heavy mud roof suffers winter heat loss and water leakage risks during unseasonal rains (U=2.10 W/m²K).',
      upgrade: 'Waterproof Elastomeric Breathable Membrane + 40mm XPS Screed',
      sol: 'Preserves vernacular ceiling aesthetics while providing airtight thermal barrier.',
      baseU: 2.10,
      optU: 0.28
    },
    asbestos: {
      name: 'Asbestos Cement Sheet',
      flaw: 'Hazardous fiber degradation; high solar heat ingress (U=5.30 W/m²K) with no thermal resistance.',
      upgrade: 'Full Encapsulation Polyurea Coating + 50mm Underdeck PUF Board',
      sol: 'Completely encapsulates fibers and drops solar heat ingress by 94.0%.',
      baseU: 5.30,
      optU: 0.32
    }
  };

  const glazeData = {
    single_al: {
      name: 'Single Clear Glass 4mm + Al Frame',
      flaw: 'Massive conductive heat loss/gain (U=5.70); uninsulated aluminum acts as direct thermal bridge; zero Low-E coating.',
      upgrade: 'Double Glazed Low-E Argon (6+12A+6) with uPVC Frame',
      sol: 'Low-E coating reflects infrared heat; argon gas gap cuts conductive transfer; multi-chamber uPVC stops frame bridging.',
      baseU: 5.70,
      optU: 1.40
    },
    single_wood: {
      name: 'Single Clear Glass 4mm + Wood Frame',
      flaw: 'Single 4mm glass allows 82% direct solar gain and high winter conduction loss (U=4.80 W/m²K).',
      upgrade: 'Double Glazed Low-E Retrofit Sash with EPDM Dual Compression Seals',
      sol: 'Reduces U-value to 1.35 W/m²K while preserving timber frame character.',
      baseU: 4.80,
      optU: 1.35
    },
    unsealed_louver: {
      name: 'Unsealed Louvered Slats',
      flaw: 'Unsealed louvers cause massive air infiltration (>2.5 ACH) and zero acoustic/thermal barrier (U=6.20 W/m²K).',
      upgrade: 'Airtight Double-Sealed uPVC Casement Windows with Insect Mesh',
      sol: 'Eliminates drafts and reduces conductive loss by 80.6%.',
      baseU: 6.20,
      optU: 1.20
    },
    double_clear: {
      name: 'Standard Double Glass (No Low-E)',
      flaw: 'Clear double glass lacks solar control Low-E coating, allowing high summer greenhouse overheating.',
      upgrade: 'Solar Control Low-E Retrofit Film (SHGC 0.30)',
      sol: 'Cuts radiant solar heat gain by 55% with minimal daylight loss.',
      baseU: 2.80,
      optU: 1.25
    }
  };

  const shadeData = {
    none: {
      name: 'Unshaded Apertures',
      flaw: '100% direct solar radiation penetrates windows (450 W/m²); creates intense internal greenhouse overheating and AC overload.',
      upgrade: 'Operable Bamboo / Aluminum External Louver Box Overhangs',
      sol: 'Intercepts direct sun before hitting the glass; provides 100% summer solar cutoff while allowing low winter solar warming.'
    },
    partial: {
      name: 'Small 300mm Concrete Chhajja',
      flaw: 'Small 300mm chhajja only shades overhead noon sun, leaving morning East and afternoon West sun unshaded.',
      upgrade: 'Extended Vertical Fin Louvers on East & West Windows',
      sol: 'Blocks low-angle afternoon solar rays responsible for peak evening cooling load.'
    },
    deep: {
      name: 'Deep Verandah Eaves 900mm',
      flaw: 'Deep fixed verandah blocks valuable daylight in winter, increasing artificial lighting energy.',
      upgrade: 'Adjustable Operable Louver Slats with Dual Summer/Winter Modes',
      sol: 'Maximizes winter solar warming and daylight while maintaining full summer shading.'
    }
  };

  const w = wallData[wallKey] || wallData.brick_230;
  const r = roofData[roofKey] || roofData.rcc_uninsulated;
  const g = glazeData[glazeKey] || glazeData.single_al;
  const s = shadeData[shadeKey] || shadeData.none;

  // Update Wall table
  const wallNameEl = document.getElementById('f3-matrix-wall-name');
  if (wallNameEl) wallNameEl.innerText = w.name;
  const wallFlawEl = document.getElementById('f3-matrix-wall-flaw');
  if (wallFlawEl) wallFlawEl.innerText = w.flaw;
  const wallUpgEl = document.getElementById('f3-matrix-wall-upgrade');
  if (wallUpgEl) wallUpgEl.innerText = w.upgrade;
  const wallSolEl = document.getElementById('f3-matrix-wall-sol');
  if (wallSolEl) wallSolEl.innerText = w.sol;
  const wallBaseEl = document.getElementById('f3-matrix-wall-u-base');
  if (wallBaseEl) wallBaseEl.innerText = `U = ${w.baseU.toFixed(2)}`;
  const wallOptEl = document.getElementById('f3-matrix-wall-u-opt');
  if (wallOptEl) wallOptEl.innerText = `U = ${w.optU.toFixed(2)}`;
  const wallDiffEl = document.getElementById('f3-matrix-wall-diff');
  const wallImp = (((w.baseU - w.optU) / w.baseU) * 100).toFixed(1);
  if (wallDiffEl) wallDiffEl.innerText = `-${wallImp}% Heat Ingress`;

  // Update Roof table
  const roofNameEl = document.getElementById('f3-matrix-roof-name');
  if (roofNameEl) roofNameEl.innerText = r.name;
  const roofFlawEl = document.getElementById('f3-matrix-roof-flaw');
  if (roofFlawEl) roofFlawEl.innerText = r.flaw;
  const roofUpgEl = document.getElementById('f3-matrix-roof-upgrade');
  if (roofUpgEl) roofUpgEl.innerText = r.upgrade;
  const roofSolEl = document.getElementById('f3-matrix-roof-sol');
  if (roofSolEl) roofSolEl.innerText = r.sol;
  const roofBaseEl = document.getElementById('f3-matrix-roof-u-base');
  if (roofBaseEl) roofBaseEl.innerText = `U = ${r.baseU.toFixed(2)}`;
  const roofOptEl = document.getElementById('f3-matrix-roof-u-opt');
  if (roofOptEl) roofOptEl.innerText = `U = ${r.optU.toFixed(2)}`;
  const roofDiffEl = document.getElementById('f3-matrix-roof-diff');
  const roofImp = (((r.baseU - r.optU) / r.baseU) * 100).toFixed(1);
  if (roofDiffEl) roofDiffEl.innerText = `-${roofImp}% Solar Gain`;

  // Update Glaze table
  const glazeNameEl = document.getElementById('f3-matrix-glaze-name');
  if (glazeNameEl) glazeNameEl.innerText = g.name;
  const glazeFlawEl = document.getElementById('f3-matrix-glaze-flaw');
  if (glazeFlawEl) glazeFlawEl.innerText = g.flaw;
  const glazeUpgEl = document.getElementById('f3-matrix-glaze-upgrade');
  if (glazeUpgEl) glazeUpgEl.innerText = g.upgrade;
  const glazeSolEl = document.getElementById('f3-matrix-glaze-sol');
  if (glazeSolEl) glazeSolEl.innerText = g.sol;
  const glazeBaseEl = document.getElementById('f3-matrix-glaze-u-base');
  if (glazeBaseEl) glazeBaseEl.innerText = `U = ${g.baseU.toFixed(2)}`;
  const glazeOptEl = document.getElementById('f3-matrix-glaze-u-opt');
  if (glazeOptEl) glazeOptEl.innerText = `U = ${g.optU.toFixed(2)}`;
  const glazeDiffEl = document.getElementById('f3-matrix-glaze-diff');
  const glazeImp = (((g.baseU - g.optU) / g.baseU) * 100).toFixed(1);
  if (glazeDiffEl) glazeDiffEl.innerText = `-${glazeImp}% Conduction`;

  // Update Shading
  const shadeNameEl = document.getElementById('f3-matrix-shade-name');
  if (shadeNameEl) shadeNameEl.innerText = s.name;
  const shadeFlawEl = document.getElementById('f3-matrix-shade-flaw');
  if (shadeFlawEl) shadeFlawEl.innerText = s.flaw;
  const shadeUpgEl = document.getElementById('f3-matrix-shade-upgrade');
  if (shadeUpgEl) shadeUpgEl.innerText = s.upgrade;
  const shadeSolEl = document.getElementById('f3-matrix-shade-sol');
  if (shadeSolEl) shadeSolEl.innerText = s.sol;

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

  leafletMap = L.map('map', { scrollWheelZoom: false, zoomControl: false, attributionControl: false, maxZoom: 19 }).setView([ThermaState.lat, ThermaState.lon], SITE_ZOOM);
  L.control.zoom({ position: 'topleft' }).addTo(leafletMap);
  L.control.attribution({ position: 'bottomright', prefix: false }).addTo(leafletMap);

  const esri = (path, opts) => L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${path}/MapServer/tile/{z}/{y}/{x}`, Object.assign({ maxZoom: 19 }, opts));
  // Esri's light-gray canvas has no buildings and ends at z16, so from z16 the map layer draws
  // OpenStreetMap building footprints itself (buildingsLayer below). Esri imagery is real down to
  // z18 across India; z19 is an upscale rather than Esri's "Map data not yet available" tiles.
  const buildings = buildingsLayer();
  const baseLayers = {
    map: L.layerGroup([
      esri('Canvas/World_Light_Gray_Base', { maxNativeZoom: 16, attribution: 'Tiles © Esri, HERE, Garmin, OpenStreetMap contributors' }),
      esri('Canvas/World_Light_Gray_Reference', { maxNativeZoom: 16, pane: 'shadowPane' }),
      buildings
    ]),
    satellite: L.layerGroup([
      esri('World_Imagery', { maxNativeZoom: 18, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' }),
      esri('Reference/World_Transportation', { minZoom: 13, maxNativeZoom: 18, pane: 'shadowPane' }),
      esri('Reference/World_Boundaries_and_Places', { maxNativeZoom: 18, pane: 'shadowPane' })
    ])
  };
  let activeLayer = 'satellite';
  baseLayers.satellite.addTo(leafletMap);
  mapContainer.classList.add('is-sat');
  window.setMapLayer = function (name) {
    if (!baseLayers[name] || name === activeLayer) return;
    leafletMap.removeLayer(baseLayers[activeLayer]);
    baseLayers[name].addTo(leafletMap);
    activeLayer = name;
    mapContainer.classList.toggle('is-sat', name === 'satellite');
    document.querySelectorAll('.map-layers .ml').forEach((b) => {
      const on = b.dataset.layer === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
  };
  document.querySelectorAll('.map-layers .ml').forEach((b) => b.addEventListener('click', () => window.setMapLayer(b.dataset.layer)));

  // "Use my location" button under the zoom buttons
  const Locate = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const bar = L.DomUtil.create('div', 'leaflet-bar map-locate');
      const a = L.DomUtil.create('a', '', bar);
      a.href = '#'; a.title = 'Use my location'; a.setAttribute('role', 'button'); a.setAttribute('aria-label', 'Use my location');
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></svg>';
      L.DomEvent.disableClickPropagation(bar);
      L.DomEvent.on(a, 'click', (e) => {
        L.DomEvent.preventDefault(e);
        if (!navigator.geolocation) return;
        bar.classList.add('is-busy');
        navigator.geolocation.getCurrentPosition((pos) => {
          bar.classList.remove('is-busy');
          const { latitude, longitude } = pos.coords;
          leafletMap.flyTo([latitude, longitude], SITE_ZOOM, { duration: 1.2 });
          setSiteLabel(null);
          updateLocationCoords(latitude, longitude);
          reverseLabelSite(latitude, longitude);
        }, () => bar.classList.remove('is-busy'), { timeout: 10000 });
      });
      return bar;
    }
  });
  new Locate().addTo(leafletMap);

  const pin = L.divIcon({
    className: 'site-pin',
    html: '<span class="pin-pulse"></span><svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43C17 43 3 26 3 15a14 14 0 0 1 28 0c0 11-14 28-14 28z" style="fill:var(--brand)" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="15" r="5.5" fill="#fff"/></svg>',
    iconSize: [34, 44],
    iconAnchor: [17, 43]
  });
  leafletMarker = L.marker([ThermaState.lat, ThermaState.lon], { draggable: true, icon: pin, keyboard: false }).addTo(leafletMap);

  leafletMap.on('click', function(e) {
    setSiteLabel(null);
    updateLocationCoords(e.latlng.lat, e.latlng.lng);
    reverseLabelSite(e.latlng.lat, e.latlng.lng);
  });

  leafletMarker.on('dragend', function(e) {
    const latlng = e.target.getLatLng();
    setSiteLabel(null);
    updateLocationCoords(latlng.lat, latlng.lng);
    reverseLabelSite(latlng.lat, latlng.lng);
  });

  // Wheel zoom only once the map has been clicked, so the page still scrolls past it
  leafletMap.on('focus click', () => leafletMap.scrollWheelZoom.enable());
  leafletMap.on('blur mouseout', () => leafletMap.scrollWheelZoom.disable());
}

// OpenStreetMap building footprints for the light map at z16+, fetched from Overpass per z15 tile
// and drawn on one canvas. Nothing is fetched or drawn further out.
function buildingsLayer() {
  const MIN_ZOOM = 16, TZ = 15;
  const group = L.layerGroup(), shapes = L.layerGroup();
  const renderer = L.canvas({ padding: 0.4 });
  const style = { renderer, color: '#B4B0A6', weight: 0.8, fillColor: '#DAD7CF', fillOpacity: 0.95, interactive: false };
  const loaded = new Set(), pending = new Set(), drawn = new Set();
  let map = null, timer = null;

  const tileOf = (lat, lon) => {
    const n = 2 ** TZ, r = lat * Math.PI / 180;
    return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2 * n)];
  };
  const tileBox = (x, y) => {
    const n = 2 ** TZ, lat = (t) => Math.atan(Math.sinh(Math.PI * (1 - 2 * t / n))) * 180 / Math.PI;
    return [lat(y + 1), x / n * 360 - 180, lat(y), (x + 1) / n * 360 - 180].map((v) => v.toFixed(5)).join(',');
  };

  function load() {
    if (!map || map.getZoom() < MIN_ZOOM) return;
    const b = map.getBounds(), [x0, y0] = tileOf(b.getNorth(), b.getWest()), [x1, y1] = tileOf(b.getSouth(), b.getEast());
    const want = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x + '/' + y; if (!loaded.has(k) && !pending.has(k)) want.push([k, x, y]); }
    if (!want.length) return;
    want.forEach(([k]) => pending.add(k));
    const q = `[out:json][timeout:20];(${want.map(([, x, y]) => `way["building"](${tileBox(x, y)});`).join('')});out geom;`;
    fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => {
        (d.elements || []).forEach((el) => {
          if (drawn.has(el.id) || !el.geometry) return;
          drawn.add(el.id);
          L.polygon(el.geometry.map((g) => [g.lat, g.lon]), style).addTo(shapes);
        });
        want.forEach(([k]) => loaded.add(k));
      })
      .catch(() => {})
      .finally(() => want.forEach(([k]) => pending.delete(k)));
  }
  const schedule = () => {
    const show = map && map.getZoom() >= MIN_ZOOM;
    if (show !== group.hasLayer(shapes)) show ? group.addLayer(shapes) : group.removeLayer(shapes);
    clearTimeout(timer); timer = setTimeout(load, 350);
  };

  group.on('add', function () { map = this._map; map.on('moveend', schedule); schedule(); });
  group.on('remove', function () { if (map) map.off('moveend', schedule); map = null; group.removeLayer(shapes); });
  return group;
}

// Name shown for a custom (non-preset) site: from a search pick or a reverse lookup of a map click.
function setSiteLabel(name) {
  ThermaState.siteLabel = name || null;
  const label = name || 'Dropped pin';
  const mp = document.getElementById('map-place');
  if (mp) mp.textContent = label;
  if (name) {
    const t = document.getElementById('climate-card-title');
    if (t) t.textContent = name;
    const rp = document.getElementById('report-place');
    if (rp) rp.textContent = name;
  }
}

let reverseSeq = 0;
function reverseLabelSite(lat, lon) {
  const seq = ++reverseSeq;
  fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`)
    .then((r) => r.json())
    .then((d) => {
      if (seq !== reverseSeq) return;
      const p = d && d.features && d.features[0] && d.features[0].properties;
      if (!p) return;
      const place = p.city || p.town || p.village || p.county || p.name;
      setSiteLabel([place, p.state].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(', '));
    })
    .catch(() => {});
}

function updateLocationCoords(lat, lon) {
  ThermaState.lat = parseFloat(lat.toFixed(4));
  ThermaState.lon = parseFloat(lon.toFixed(4));
  if (leafletMarker) leafletMarker.setLatLng([ThermaState.lat, ThermaState.lon]);

  const coordsEl = document.getElementById('climate-coords');
  if (coordsEl) coordsEl.innerText = `${ThermaState.lat}° N, ${ThermaState.lon}° E`;
  const mapCoords = document.getElementById('map-coords');
  if (mapCoords) mapCoords.textContent = `${ThermaState.lat.toFixed(4)}° N, ${ThermaState.lon.toFixed(4)}° E`;

  // Predict materials automatically based on coordinates
  predictBioclimaticMaterials(ThermaState.city, ThermaState.lat, ThermaState.lon);
  if (window.onClimateUpdate) window.onClimateUpdate(null);

  // Climate for the new point is fetched from NASA POWER by report.js (loadClimateFor).
}

function onLocationPresetChange(val) {
  const p = LOCATION_PRESETS[val];
  if (!p) return;
  ThermaState.city = val;
  ThermaState.lat = p.lat;
  ThermaState.lon = p.lon;

  ThermaState.siteLabel = null;

  if (leafletMap) {
    // flyTo needs a laid-out map; while the studio page is hidden, jump instead
    if (leafletMap.getSize().x) leafletMap.flyTo([p.lat, p.lon], SITE_ZOOM, { duration: 1.4 });
    else leafletMap.setView([p.lat, p.lon], SITE_ZOOM, { animate: false });
    if (leafletMarker) leafletMarker.setLatLng([p.lat, p.lon]);
  }

  const coordsEl = document.getElementById('climate-coords');
  if (coordsEl) coordsEl.innerText = `${p.lat}° N, ${p.lon}° E`;
  const mapPlace = document.getElementById('map-place');
  if (mapPlace) mapPlace.textContent = p.name.split('(')[0].trim();
  const mapCoords = document.getElementById('map-coords');
  if (mapCoords) mapCoords.textContent = `${p.lat.toFixed(4)}° N, ${p.lon.toFixed(4)}° E`;

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

  // Automatically predict materials for this climate without requiring manual input
  predictBioclimaticMaterials(val, p.lat, p.lon);
  if (window.onClimateUpdate) window.onClimateUpdate(p);
}

// Automated Climate-Driven Material Prediction Engine
function predictBioclimaticMaterials(cityKey, lat, lon) {
  const p = LOCATION_PRESETS[cityKey];
  const city = (cityKey || '').toLowerCase();
  
  let wall = 'rammed_earth';
  let roof = 'cool_roof';
  let glazing = 'low_e_double';
  let rationale = '';
  let badge = `Auto-Predicted for ${p ? p.name.split(',')[0] : 'Current Location'}`;

  let animalRoof = 'thatch';
  let animalWall = 'slatted_louvers';
  let animalFloor = 'grooved_concrete';
  let animalRationale = '';

  // 1. Extreme Cold Alpine / High Altitude (Leh, Dras, Kargil, Nubra, Spiti, Pangong)
  if (['leh', 'dras', 'kargil', 'nubra', 'spiti', 'pangong'].includes(city) || (lat > 32 && (!p || p.winterTemp.includes('-')))) {
    wall = 'rammed_earth';
    roof = 'poplar_mud';
    glazing = 'krypton_triple';
    rationale = `Predicted for Sub-Zero Alpine Region (${p?.winterTemp || '-18°C'} winter): 450mm Stabilized Rammed Earth (10.2h thermal mass lag) + Double-Ventilated Poplar Mud Roof + Triple Krypton Low-E fenestration (U=0.78 W/m²K) to eliminate artificial heating.`;
    
    animalRoof = 'thatch';
    animalWall = 'rammed_half_wall';
    animalFloor = (ThermaState.animalSpecies === 'poultry') ? 'slatted_timber' : 'grooved_concrete';
    animalRationale = `Cold-Arid Microclimate Protection: Thick layered vernacular thatch (82% thermal damping) + 1.2m rammed earth perimeter shield + deep straw bedding to prevent sub-zero livestock hypothermia.`;
  }
  // 2. Hot & Dry Desert (Jaisalmer, Rajasthan)
  else if (['jaisalmer'].includes(city) || (lat < 28 && lat > 24 && lon < 75)) {
    wall = 'cavity_brick';
    roof = 'cool_roof';
    glazing = 'low_e_double';
    rationale = `Predicted for Hot & Dry Desert (>45°C solar peak): Cavity Terracotta Brick (300mm) with mineral wool + High-Albedo Cool Roof (SRI 104) to reflect 92% direct solar insolation and reject intense daytime sol-air heat flux.`;

    animalRoof = (ThermaState.animalSpecies === 'poultry') ? 'white_aluminum' : 'thatch';
    animalWall = 'slatted_louvers';
    animalFloor = 'grooved_concrete';
    animalRationale = `Extreme Solar Radiation Rejection: SRI 104 high-reflectance roof assembly + 14.8 ACH cross-draft louvers to prevent heat-stress milk drop and broiler mortality.`;
  }
  // 3. Warm & Humid Coastal (Chennai, Mumbai, Kochi)
  else if (['chennai'].includes(city) || (lat < 15 && lon > 78)) {
    wall = 'clt_woodfiber';
    roof = 'green_roof';
    glazing = 'smart_electrochromic';
    rationale = `Predicted for Warm & Humid Coastal: Breathable Cross-Laminated Timber (CLT) + Extensive Sedum Green Roof for continuous evaporative cooling + Dynamic Smart Tint glazing to maximize daylight without thermal solar gain.`;

    animalRoof = 'white_aluminum';
    animalWall = 'poultry_mesh';
    animalFloor = (ThermaState.animalSpecies === 'cattle') ? 'grooved_concrete' : 'slatted_timber';
    animalRationale = `Maximum Aerothermal Evacuation: 1" Hexagonal mesh screen generating 18.5 ACH continuous breeze + raised slatted timber flooring to rapidly evacuate humidity and prevent fungal hoof rot.`;
  }
  // 4. Temperate Plateau (Bengaluru, Pune)
  else if (['bengaluru'].includes(city) || (lat < 15 && lat > 12 && lon < 78)) {
    wall = 'cseb_cork';
    roof = 'green_roof';
    glazing = 'low_e_double';
    rationale = `Predicted for Temperate Plateau: Compressed Earth Blocks (CSEB) + Vegetated Green Roof for natural bioclimatic harmony and near-zero operational energy footprint.`;

    animalRoof = 'terracotta_tiles';
    animalWall = 'slatted_louvers';
    animalFloor = 'grooved_concrete';
    animalRationale = `Bioclimatic Balance: Mangalore terracotta clay tiles on bamboo truss + slatted louvers maintaining year-round neutral livestock comfort zone.`;
  }
  // 5. Composite / Extreme Swings (New Delhi, North India)
  else {
    wall = 'aac_aerogel';
    roof = 'cool_roof';
    glazing = 'low_e_double';
    rationale = `Predicted for Composite Climate (Severe Summer Heat + Cold Winter): Lightweight AAC Block (200mm) + Aerogel Micro-Plaster + High-Albedo Cool Roof (SRI 104) + Low-E Argon double glazing for dual-season thermal performance.`;

    animalRoof = 'thatch';
    animalWall = 'slatted_louvers';
    animalFloor = 'grooved_concrete';
    animalRationale = `Dual-Season Agro-Engineering: Multi-layered vernacular thatch + convertible slatted louvers + non-slip grooved concrete with deep drainage slope.`;
  }

  // Update Global State
  ThermaState.wallMat = wall;
  ThermaState.roofMat = roof;
  ThermaState.glazingMat = glazing;
  ThermaState.animalRoof = animalRoof;
  ThermaState.animalFloor = animalFloor;

  // Update DOM selectors
  const wSel = document.getElementById('wall-mat-select');
  if (wSel) wSel.value = wall;
  const rSel = document.getElementById('roof-mat-select');
  if (rSel) rSel.value = roof;
  const gSel = document.getElementById('glazing-mat-select');
  if (gSel) gSel.value = glazing;

  const aRSel = document.getElementById('animal-roof-material');
  if (aRSel) aRSel.value = animalRoof;
  const aWSel = document.getElementById('animal-wall-material');
  if (aWSel) aWSel.value = animalWall;
  const aFSel = document.getElementById('animal-floor-material');
  if (aFSel) aFSel.value = animalFloor;

  // Update AI Banner texts
  const badgeEl = document.getElementById('ai-predict-badge');
  if (badgeEl) badgeEl.innerText = badge;
  const ratEl = document.getElementById('ai-predict-rationale');
  if (ratEl) ratEl.innerText = rationale;

  const aBadgeEl = document.getElementById('animal-ai-predict-badge');
  if (aBadgeEl) aBadgeEl.innerText = `Auto-Engineered for ${ThermaState.animalSpecies.toUpperCase()} in ${city.toUpperCase()}`;
  const aRatEl = document.getElementById('animal-ai-predict-rationale');
  if (aRatEl) aRatEl.innerText = animalRationale;

  // Refresh dynamic report tables
  updateResidentialMaterialsReport();
  updateLivestockMaterialsReport();
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
        if (leafletMap) leafletMap.setView([lat, lon], SITE_ZOOM);
      }
    })
    .catch(() => alert('Could not find that place. Try a larger town nearby, or click the map.'));
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
    badge.innerText = `${score}% aligned${score >= 90 ? '' : ' — consider a north or east entrance'}`;
  }
}

// ==========================================
// 5. FLOW 4 - STEP 2: ANIMAL SPECIES & CAPACITY
// ==========================================
function selectAnimalType(species) {
  ThermaState.animalSpecies = species;
  const slider = document.getElementById('animal-herd-slider');

  // Update button active state
  ['cattle', 'poultry', 'goat'].forEach(sp => {
    const btn = document.getElementById(`species-btn-${sp}`);
    if (btn) {
      if (sp === species) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  if (species === 'cattle') {
    if (slider) { slider.min = 5; slider.max = 100; slider.value = 20; }
    updateAnimalHerdCapacity(20);
    selectAnimalPlan(0);
    const roofSel = document.getElementById('animal-roof-material');
    if (roofSel) roofSel.value = 'thatch';
    const floorSel = document.getElementById('animal-floor-material');
    if (floorSel) floorSel.value = 'grooved_concrete';
    const wallSel = document.getElementById('animal-wall-material');
    if (wallSel) wallSel.value = 'slatted_louvers';
  } else if (species === 'poultry') {
    if (slider) { slider.min = 10; slider.max = 500; slider.value = 50; }
    updateAnimalHerdCapacity(50);
    selectAnimalPlan(1);
    const roofSel = document.getElementById('animal-roof-material');
    if (roofSel) roofSel.value = 'white_aluminum';
    const floorSel = document.getElementById('animal-floor-material');
    if (floorSel) floorSel.value = 'slatted_timber';
    const wallSel = document.getElementById('animal-wall-material');
    if (wallSel) wallSel.value = 'poultry_mesh';
  } else if (species === 'goat') {
    if (slider) { slider.min = 5; slider.max = 150; slider.value = 30; }
    updateAnimalHerdCapacity(30);
    selectAnimalPlan(0);
    const roofSel = document.getElementById('animal-roof-material');
    if (roofSel) roofSel.value = 'terracotta_tiles';
    const floorSel = document.getElementById('animal-floor-material');
    if (floorSel) floorSel.value = 'slatted_timber';
    const wallSel = document.getElementById('animal-wall-material');
    if (wallSel) wallSel.value = 'rammed_half_wall';
  }

  updateLivestockMaterialsReport();
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
}

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

  if (label) label.innerText = model && model.id ? `Reference model: ${model.name}` : `Shelter plan: ${plan.title}`;
  // Load the third-party embed only when that tab is showing; the airflow view is the default.
  if (model && model.id && ifr && ifrContainer && ifrContainer.style.display !== 'none') {
    const targetSrc = model.embedUrl || `https://sketchfab.com/models/${model.id}/embed?autostart=1&ui_theme=dark&ui_watermark=0`;
    if (!ifr.src || !ifr.src.includes(model.id)) ifr.src = targetSrc;
  }
  if (canvasWrap && canvasWrap.style.display !== 'none') setTimeout(initAnimal3DViewer, 100);

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
  const wrap = document.getElementById('iframe-3d-container');
  // Load the third-party embed only when that tab is showing; the sun-and-heat view is the default.
  if (ifr && wrap && wrap.style.display !== 'none' && (!ifr.src || !ifr.src.includes(model.id))) {
    ifr.src = model.embedUrl;
  }
  const label = document.getElementById('step4-plan-name');
  if (label) {
    label.innerText = `Reference model of a similar home: ${model.name}. It is not generated from your plan.`;
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
    setTimeout(init3DViewer, 50);
  }
}

// The 3D viewers below are placeholders; js/viewer3d.js replaces them at load.
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
// The reports are computed in the browser by the heat-balance engine (js/engine, js/report.js)
// when their step opens; these names stay for the existing buttons and step handlers.
function runCFDSimulation() { /* report.js renders the house report when step 5 opens */ }

function runAnimalSimulation() {
  if (window.TBApp) setTimeout(() => window.TBApp.renderAnimal(), 0);
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

// Downloadable Report & Dossier Generators
function downloadPDFDossier() {
  window.print();
}

function downloadAnimalPDFDossier() {
  window.print();
}

function downloadCSVReport() { if (window.TBApp) window.TBApp.exportCSV(); }

function downloadJSONReport() { if (window.TBApp) window.TBApp.exportJSON(); }

function downloadAnimalCSVReport() { if (window.TBApp) window.TBApp.exportAnimalCSV(); }

function downloadAnimalJSONReport() {
  const A = window.TBApp && window.TBApp.animal; if (!A) return;
  const out = { generated: new Date().toISOString(), species: A.species, herd: A.ctx.herd, mode: A.mode, month: A.monthName, areaM2: A.area, ach: A.ach, cold: A.cold, thi: A.thi };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  a.download = 'ThermaBuild_livestock_shelter.json';
  a.click();
}

// ==========================================
// 8. DYNAMIC MATERIALS REPORT GENERATORS
// ==========================================
function updateResidentialMaterialsReport() {
  const wallKey = document.getElementById('wall-mat-select')?.value || ThermaState.wallMat || 'rammed_earth';
  const roofKey = document.getElementById('roof-mat-select')?.value || ThermaState.roofMat || 'cool_roof';
  const glazeKey = document.getElementById('glazing-mat-select')?.value || ThermaState.glazingMat || 'low_e_double';

  ThermaState.wallMat = wallKey;
  ThermaState.roofMat = roofKey;
  ThermaState.glazingMat = glazeKey;

  const wallSpecs = {
    rammed_earth: { name: 'Stabilized Rammed Earth 350mm + Lime Render', u: '0.45 W/m²K' },
    aac_aerogel: { name: 'Lightweight AAC Block 200mm + Aerogel Micro-Plaster', u: '0.42 W/m²K' },
    cavity_brick: { name: 'Cavity Terracotta Hollow Block 300mm + 50mm Mineral Wool', u: '0.36 W/m²K' },
    cseb_cork: { name: 'Compressed Earth Block (CSEB) 250mm + Corkboard Core', u: '0.39 W/m²K' },
    clt_woodfiber: { name: 'Cross-Laminated Timber (CLT) 140mm + Woodfiber Insulation', u: '0.29 W/m²K' }
  };
  const roofSpecs = {
    cool_roof: { name: 'High-Albedo Cool Roof (SRI 104) + 100mm Overdeck XPS', u: '0.26 W/m²K' },
    green_roof: { name: 'Extensive Sedum Vegetated Green Roof (120mm Substrate)', u: '0.22 W/m²K' },
    poplar_mud: { name: 'Double-Ventilated Poplar Mud Roof + Polyurethane Board', u: '0.24 W/m²K' },
    terracotta_double: { name: 'Mangalore Interlocking Double-Tile + Radiant Barrier Foil', u: '0.32 W/m²K' }
  };
  const glazeSpecs = {
    low_e_double: { name: 'Double Glazed Low-E Argon 6+12A+6 (SHGC=0.32) + uPVC Frame', u: '1.35 W/m²K' },
    krypton_triple: { name: 'Triple Glazed Krypton Super-Insulated 4+10Kr+4+10Kr+4', u: '0.78 W/m²K' },
    smart_electrochromic: { name: 'Dynamic Tint Electrochromic Glass (SHGC 0.09-0.45)', u: '1.10 W/m²K' },
    single_clear: { name: 'Baseline Single Float Glass (4mm) + Aluminum Frame', u: '5.70 W/m²K' }
  };

  const w = wallSpecs[wallKey] || wallSpecs.rammed_earth;
  const r = roofSpecs[roofKey] || roofSpecs.cool_roof;
  const g = glazeSpecs[glazeKey] || glazeSpecs.low_e_double;

  const wName = document.getElementById('rep-wall-name');
  const wU = document.getElementById('rep-wall-u');
  if (wName) wName.innerText = w.name;
  if (wU) wU.innerText = w.u;

  const rName = document.getElementById('rep-roof-name');
  const rU = document.getElementById('rep-roof-u');
  if (rName) rName.innerText = r.name;
  if (rU) rU.innerText = r.u;

  const gName = document.getElementById('rep-glaze-name');
  const gU = document.getElementById('rep-glaze-u');
  if (gName) gName.innerText = g.name;
  if (gU) gU.innerText = g.u;
}

function updateLivestockMaterialsReport() {
  const roofKey = document.getElementById('animal-roof-material')?.value || ThermaState.animalRoof || 'thatch';
  const wallKey = document.getElementById('animal-wall-material')?.value || 'slatted_louvers';
  const floorKey = document.getElementById('animal-floor-material')?.value || ThermaState.animalFloor || 'grooved_concrete';

  ThermaState.animalRoof = roofKey;
  ThermaState.animalFloor = floorKey;

  const roofSpecs = {
    thatch: { name: 'Multi-Layered Vernacular Thatch (Paddy Straw 180mm)', u: '0.35 W/m²K' },
    white_aluminum: { name: 'Reflective White Aluminum + 50mm Glasswool Foil', u: '0.38 W/m²K' },
    terracotta_tiles: { name: 'Mangalore Terracotta Clay Tiles on Bamboo Truss', u: '0.85 W/m²K' },
    puff_sandwich: { name: '50mm Food-Grade PUFF Sandwich Panel (PPGI Clad)', u: '0.42 W/m²K' },
    bamboo_shingle: { name: 'Treated Split-Bamboo Shingles with Bitumen Underlay', u: '0.48 W/m²K' }
  };
  const wallSpecs = {
    slatted_louvers: { name: 'Open Slatted Hardwood Louvers (60% Porosity, 14.8 ACH Draft)' },
    poultry_mesh: { name: '1" Galvanized Hexagonal Wire Mesh + Roll-Up Curtains (18.5 ACH Draft)' },
    rammed_half_wall: { name: '1.2m Rammed Earth Dwarf Wall + Upper Bamboo Screen (12.4 ACH Draft)' }
  };
  const floorSpecs = {
    grooved_concrete: { name: 'Grooved Non-Slip Concrete with 1:40 Lateral Drainage Gutter' },
    slatted_timber: { name: 'Raised Slatted Hardwood Flooring with Dung Trays' },
    vulcanized_rubber: { name: 'Interlocking Vulcanized Rubber Comfort Bedding Mats over Concrete' },
    rammed_murrum: { name: 'Compacted Murrum Earth Bedding with Straw Deep Litter' }
  };

  const r = roofSpecs[roofKey] || roofSpecs.thatch;
  const wl = wallSpecs[wallKey] || wallSpecs.slatted_louvers;
  const f = floorSpecs[floorKey] || floorSpecs.grooved_concrete;

  const rName = document.getElementById('rep-animal-roof-name');
  const rU = document.getElementById('rep-animal-roof-u');
  if (rName) rName.innerText = r.name;
  if (rU) rU.innerText = r.u;

  const wlName = document.getElementById('rep-animal-wall-name');
  if (wlName) wlName.innerText = wl.name;

  const fName = document.getElementById('rep-animal-floor-name');
  if (fName) fName.innerText = f.name;
}

// ==========================================
// 9. INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  initLeafletMap();
  switchMainFlow(1);

  // Attach change listeners for live materials updates
  document.getElementById('wall-mat-select')?.addEventListener('change', updateResidentialMaterialsReport);
  document.getElementById('roof-mat-select')?.addEventListener('change', updateResidentialMaterialsReport);
  document.getElementById('glazing-mat-select')?.addEventListener('change', updateResidentialMaterialsReport);
  document.getElementById('animal-roof-material')?.addEventListener('change', updateLivestockMaterialsReport);
  document.getElementById('animal-wall-material')?.addEventListener('change', updateLivestockMaterialsReport);
  document.getElementById('animal-floor-material')?.addEventListener('change', updateLivestockMaterialsReport);
});

