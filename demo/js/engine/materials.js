/**
 * ThermaBuild engine: materials and assemblies.
 *
 * Thermal properties: CIBSE Guide A (2015) Table 3.x, ASHRAE Fundamentals (2021) ch. 26,
 * and Minke, Building with Earth (2012) for earth materials. Embodied carbon factors:
 * ICE database v3.0 (Hammond & Jones / Circular Ecology), cradle-to-gate, rounded.
 * Costs are indicative Leh-area 2025 figures including transport and labour, for comparing
 * options only. They are not quotes.
 */
(function (g) {
  'use strict';
  const TB = (g.TB = g.TB || {});

  // k W/mK, rho kg/m3, c J/kgK, ice kgCO2e/kg, cost ₹ per m2 per 100 mm of thickness
  const M = {
    rammed_earth: { name: 'Rammed earth (stabilised)', k: 1.10, rho: 1900, c: 900, ice: 0.024, cost: 780, src: 'Minke 2012; ICE v3 (5% cement)' },
    mud_brick:    { name: 'Sun-dried mud brick', k: 0.75, rho: 1600, c: 900, ice: 0.006, cost: 480, src: 'Minke 2012; ICE v3 (unfired clay)' },
    stone:        { name: 'Local stone rubble masonry', k: 1.70, rho: 2200, c: 840, ice: 0.079, cost: 820, src: 'CIBSE A; ICE v3 (local stone)' },
    cseb:         { name: 'Compressed stabilised earth block', k: 0.90, rho: 1800, c: 900, ice: 0.030, cost: 900, src: 'Auroville Earth Institute data; ICE v3' },
    straw_bale:   { name: 'Straw bale (laid flat)', k: 0.065, rho: 110, c: 1600, ice: 0.010, cost: 320, src: 'ASHRAE ch.26 (straw); FASBA tests' },
    conc_block:   { name: 'Solid concrete block', k: 1.30, rho: 2000, c: 1000, ice: 0.093, cost: 1050, src: 'CIBSE A; ICE v3' },
    brick:        { name: 'Fired clay brick', k: 0.81, rho: 1800, c: 840, ice: 0.213, cost: 1150, src: 'CIBSE A; ICE v3' },
    rcc:          { name: 'Reinforced concrete', k: 2.30, rho: 2400, c: 1000, ice: 0.159, cost: 1500, src: 'CIBSE A; ICE v3 (RC 25/30)' },
    mud_plaster:  { name: 'Mud plaster', k: 0.70, rho: 1600, c: 900, ice: 0.006, cost: 250, src: 'Minke 2012' },
    lime_plaster: { name: 'Lime plaster', k: 0.80, rho: 1600, c: 840, ice: 0.078, cost: 400, src: 'CIBSE A; ICE v3' },
    eps:          { name: 'EPS insulation', k: 0.035, rho: 20, c: 1450, ice: 3.29, cost: 850, src: 'CIBSE A; ICE v3' },
    wool_felt:    { name: 'Sheep/yak wool felt (experimental)', k: 0.042, rho: 30, c: 1300, ice: 0.8, cost: 1100, src: 'Zach et al. 2013 (sheep wool); local felt untested' },
    straw_clay:   { name: 'Light straw-clay', k: 0.20, rho: 700, c: 1100, ice: 0.02, cost: 300, src: 'Minke 2012 (light clay)' },
    poplar:       { name: 'Poplar timber', k: 0.13, rho: 450, c: 1600, ice: 0.30, cost: 900, src: 'CIBSE A (softwood); ICE v3 (timber, fossil only)' },
    grass_twig:   { name: 'Willow twigs and dry grass (talu)', k: 0.08, rho: 150, c: 1500, ice: 0.01, cost: 120, src: 'Estimated as loose straw, ASHRAE ch.26' },
    mud_screed:   { name: 'Compacted mud', k: 0.80, rho: 1700, c: 900, ice: 0.006, cost: 220, src: 'Minke 2012' },
    steel_sheet:  { name: 'Galvanised steel sheet (CGI)', k: 50, rho: 7800, c: 450, ice: 2.89, cost: 7000, src: 'CIBSE A; ICE v3' },
    gravel:       { name: 'Dry stone and gravel bed', k: 0.70, rho: 1800, c: 840, ice: 0.005, cost: 150, src: 'CIBSE A (gravel)' },
    timber_floor: { name: 'Timber floor boards', k: 0.13, rho: 450, c: 1600, ice: 0.30, cost: 900, src: 'CIBSE A' },
    aac:          { name: 'Autoclaved aerated concrete block', k: 0.16, rho: 600, c: 1000, ice: 0.28, cost: 700, src: 'CIBSE A; ICE v3' },
    rock_wool:    { name: 'Mineral (rock) wool', k: 0.038, rho: 60, c: 840, ice: 1.28, cost: 900, src: 'CIBSE A; ICE v3' },
    cork:         { name: 'Cork board', k: 0.040, rho: 120, c: 1800, ice: 0.19, cost: 1400, src: 'CIBSE A; ICE v3' },
    clt:          { name: 'Cross-laminated timber', k: 0.13, rho: 480, c: 1600, ice: 0.44, cost: 2600, src: 'CIBSE A; ICE v3 (CLT)' },
    wood_fibre:   { name: 'Wood-fibre board', k: 0.040, rho: 160, c: 2100, ice: 0.60, cost: 1000, src: 'Manufacturer data (EN 13171)' },
    soil:         { name: 'Green-roof substrate (moist)', k: 0.90, rho: 1400, c: 1500, ice: 0.01, cost: 500, src: 'FLL guideline typical' },
    clay_tile:    { name: 'Clay roof tile', k: 1.00, rho: 2000, c: 800, ice: 0.46, cost: 900, src: 'CIBSE A; ICE v3' },
    air_gap:      { name: 'Ventilated air gap with foil (equivalent)', k: 0.05, rho: 1.2, c: 1005, ice: 0, cost: 150, src: 'ISO 6946 low-emissivity cavity, R ≈ 0.5' },
  };

  // Assemblies are listed outside → inside. Wall systems take an optional external insulation layer.
  const WALLS = {
    rammed_earth: { label: 'Rammed earth', layers: [['lime_plaster', 0.02], ['rammed_earth', 0.45], ['mud_plaster', 0.02]], alpha: 0.70, labour: 900 },
    mud_brick:    { label: 'Mud brick', layers: [['mud_plaster', 0.025], ['mud_brick', 0.45], ['mud_plaster', 0.025]], alpha: 0.65, labour: 700 },
    stone:        { label: 'Stone masonry', layers: [['stone', 0.45], ['mud_plaster', 0.025]], alpha: 0.70, labour: 1100 },
    cseb:         { label: 'CSEB', layers: [['lime_plaster', 0.015], ['cseb', 0.30], ['lime_plaster', 0.015]], alpha: 0.65, labour: 800 },
    straw_bale:   { label: 'Straw bale', layers: [['lime_plaster', 0.03], ['straw_bale', 0.45], ['mud_plaster', 0.04]], alpha: 0.60, labour: 900 },
    conc_block:   { label: 'Concrete block', layers: [['lime_plaster', 0.015], ['conc_block', 0.20], ['lime_plaster', 0.015]], alpha: 0.65, labour: 700 },
    brick:        { label: 'Solid brick', layers: [['lime_plaster', 0.015], ['brick', 0.23], ['lime_plaster', 0.015]], alpha: 0.65, labour: 700 },
    cgi_hut:      { label: 'Sheet metal hut', layers: [['steel_sheet', 0.0006]], alpha: 0.60, labour: 250 },
    aac:          { label: 'AAC block', layers: [['lime_plaster', 0.015], ['aac', 0.20], ['lime_plaster', 0.015]], alpha: 0.55, labour: 700 },
    cavity_brick: { label: 'Cavity brick with rock wool', layers: [['brick', 0.115], ['rock_wool', 0.05], ['brick', 0.115], ['lime_plaster', 0.015]], alpha: 0.65, labour: 900 },
    cseb_cork:    { label: 'CSEB with cork core', layers: [['cseb', 0.12], ['cork', 0.04], ['cseb', 0.12]], alpha: 0.65, labour: 900 },
    clt_wf:       { label: 'CLT with wood-fibre', layers: [['lime_plaster', 0.01], ['wood_fibre', 0.06], ['clt', 0.14]], alpha: 0.55, labour: 800 },
    prefab_puf:   { label: 'Prefab panel', layers: [['steel_sheet', 0.0005], ['eps', 0.05], ['steel_sheet', 0.0005]], alpha: 0.55, labour: 400 },
  };
  const ROOFS = {
    mud_poplar:   { label: 'Traditional poplar and mud', layers: [['mud_screed', 0.15], ['grass_twig', 0.06], ['poplar', 0.03]], alpha: 0.70, labour: 600 },
    mud_poplar_ins: { label: 'Poplar and mud, insulated', layers: [['mud_screed', 0.10], ['eps', 0.10], ['grass_twig', 0.05], ['poplar', 0.03]], alpha: 0.70, labour: 750 },
    rcc_ins:      { label: 'Concrete slab, insulated', layers: [['mud_screed', 0.05], ['eps', 0.10], ['rcc', 0.15]], alpha: 0.65, labour: 900 },
    rcc_bare:     { label: 'Bare concrete slab', layers: [['rcc', 0.15], ['lime_plaster', 0.012]], alpha: 0.65, labour: 800 },
    cgi_bare:     { label: 'Bare CGI sheet', layers: [['steel_sheet', 0.0006]], alpha: 0.60, labour: 200 },
    cool_roof:    { label: 'White cool roof, insulated slab', layers: [['lime_plaster', 0.01], ['eps', 0.10], ['rcc', 0.15]], alpha: 0.25, labour: 1000 },
    green_roof:   { label: 'Green roof', layers: [['soil', 0.12], ['eps', 0.05], ['rcc', 0.15]], alpha: 0.50, labour: 1400 },
    tile_double:  { label: 'Double clay tile with foil', layers: [['clay_tile', 0.02], ['air_gap', 0.025], ['clay_tile', 0.02], ['rcc', 0.10]], alpha: 0.55, labour: 900 },
    thatch:       { label: 'Layered straw thatch', layers: [['grass_twig', 0.18]], alpha: 0.60, labour: 300 },
    white_metal:  { label: 'White metal sheet with wool lining', layers: [['steel_sheet', 0.0006], ['rock_wool', 0.05]], alpha: 0.25, labour: 350 },
    tile_bamboo:  { label: 'Clay tiles on bamboo', layers: [['clay_tile', 0.02], ['poplar', 0.01]], alpha: 0.60, labour: 300 },
    puf_panel:    { label: 'Insulated sandwich panel', layers: [['steel_sheet', 0.0005], ['eps', 0.05], ['steel_sheet', 0.0005]], alpha: 0.45, labour: 300 },
    cgi_ins:      { label: 'CGI with 100 mm insulation', layers: [['steel_sheet', 0.0006], ['eps', 0.10], ['poplar', 0.012]], alpha: 0.60, labour: 400 },
  };
  const FLOORS = {
    earth_ins:    { label: 'Mud floor on insulation and gravel', layers: [['gravel', 0.15], ['eps', 0.05], ['mud_screed', 0.10]], labour: 350 },
    earth:        { label: 'Mud floor on gravel', layers: [['gravel', 0.15], ['mud_screed', 0.10]], labour: 250 },
    concrete:     { label: 'Concrete slab on grade', layers: [['gravel', 0.10], ['rcc', 0.10]], labour: 400 },
    timber_raised:{ label: 'Raised timber floor', layers: [['timber_floor', 0.025]], labour: 500 },
  };
  // U W/m2K (whole window), g solar heat gain coefficient (glass), cost ₹/m2, carbon kgCO2e/m2
  const GLAZING = {
    single:       { label: 'Single glass', U: 5.7, g: 0.82, cost: 1800, carbon: 25, src: 'ISO 10077 typical; ICE v3 glass' },
    double:       { label: 'Double glass, clear', U: 2.8, g: 0.72, cost: 3800, carbon: 45 },
    polycarb:     { label: 'Twin-wall polycarbonate', U: 3.0, g: 0.70, cost: 1400, carbon: 18 },
    double_lowe:  { label: 'Double, high-solar-gain low-E', U: 1.8, g: 0.62, cost: 5200, carbon: 50 },
    triple:       { label: 'Triple glass', U: 1.0, g: 0.50, cost: 9000, carbon: 70 },
    lowe_sc:      { label: 'Double, solar-control low-E', U: 1.35, g: 0.32, cost: 5600, carbon: 50 },
    triple_kr:    { label: 'Triple glass, krypton', U: 0.78, g: 0.28, cost: 11000, carbon: 75 },
    electrochromic: { label: 'Electrochromic glass', U: 1.10, g: 0.25, cost: 22000, carbon: 90 },
  };

  // The studio's existing recommendation keys, mapped onto engine assemblies.
  const LEGACY = {
    wall: { rammed_earth: ['rammed_earth', 0], aac_aerogel: ['aac', 0], cavity_brick: ['cavity_brick', 0], cseb_cork: ['cseb_cork', 0], clt_woodfiber: ['clt_wf', 0] },
    roof: { cool_roof: 'cool_roof', green_roof: 'green_roof', poplar_mud: 'mud_poplar_ins', terracotta_double: 'tile_double' },
    animalRoof: { thatch: 'thatch', white_aluminum: 'white_metal', terracotta_tiles: 'tile_bamboo', puff_sandwich: 'puf_panel' },
    glazing: { low_e_double: 'lowe_sc', krypton_triple: 'triple_kr', smart_electrochromic: 'electrochromic', single_clear: 'single' },
  };

  const R_SI = 0.13, R_SE = 0.04, R_SI_ROOF = 0.10, R_SI_FLOOR = 0.17;

  /** U-value, inner areal heat capacity (ISO 13786 simplified: inner 100 mm, stop at insulation), cost, carbon. */
  function assembly(layers, opts) {
    const o = opts || {};
    let R = (o.rsi != null ? o.rsi : R_SI) + (o.rse != null ? o.rse : R_SE), cost = o.labour || 0, carbon = 0, thick = 0;
    layers.forEach(([key, d]) => { const m = M[key]; R += d / m.k; cost += m.cost * d / 0.1; carbon += m.rho * d * m.ice; thick += d; });
    let kappa = 0, depth = 0;
    const cap = Math.min(0.10, thick / 2);
    for (let i = layers.length - 1; i >= 0 && depth < cap; i--) {
      const [key, d] = layers[i], m = M[key];
      if (m.k < 0.08) break; // insulation layer: mass behind it is decoupled from the room
      const use = Math.min(d, cap - depth); kappa += m.rho * m.c * use; depth += use;
    }
    return { U: 1 / R, R, kappa, cost, carbon, thick };
  }

  /** Wall system with optional external insulation of `ins` metres (EPS unless `insKey`). */
  function wall(key, ins, insKey) {
    const w = WALLS[key];
    const layers = ins > 0 ? [[insKey || 'eps', ins], ...w.layers] : w.layers.slice();
    const a = assembly(layers, { labour: w.labour });
    return Object.assign(a, { key, label: w.label, layers, alpha: w.alpha, ins });
  }
  function roof(key) { const r = ROOFS[key]; return Object.assign(assembly(r.layers, { rsi: R_SI_ROOF, labour: r.labour }), { key, label: r.label, layers: r.layers, alpha: r.alpha }); }
  function floor(key) { const f = FLOORS[key]; return Object.assign(assembly(f.layers, { rsi: R_SI_FLOOR, rse: 0, labour: f.labour }), { key, label: f.label, layers: f.layers }); }

  /** Trombe (mass) wall: dark rammed earth or stone behind glazing. */
  function trombe(massKey, glazingKey) {
    const m = M[massKey], d = 0.30, gl = GLAZING[glazingKey];
    return {
      k: m.k, d, rhoc: m.rho * m.c, alpha: 0.92,
      tau: gl.g * 0.95,              // solar transmittance, slightly below g (g adds re-radiated heat)
      Ugl: 1 / (1 / gl.U + 0.17),    // glazing plus the air gap
      cost: m.cost * d / 0.1 + gl.cost + 600, carbon: m.rho * d * m.ice + gl.carbon,
      mass: massKey, glazing: glazingKey,
    };
  }

  TB.materials = { M, LEGACY, WALLS, ROOFS, FLOORS, GLAZING, assembly, wall, roof, floor, trombe, R_SI, R_SE };
})(typeof globalThis !== 'undefined' ? globalThis : this);
