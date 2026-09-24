/**
 * ThermaBuild: connects the physics engine (js/engine) to the studio.
 * Every number the studio shows is computed here from TB.* — nothing is scripted.
 *
 *  - site climate from NASA POWER (offline table for the presets, live fetch for any map point)
 *  - design search in a Web Worker, cached per site, building type and floor area
 *  - live dawn-temperature pill in the studio header
 *  - "How we chose" panel in step 3 and engine-backed material cards
 *  - the report: three nights, uncertainty band, room-by-room view, heat flows, safety,
 *    year calendar, fuel and village impact, bill of materials, mason cards, exports
 *  - livestock (cold stress or heat stress) and retrofit (before/after) from the same engine
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const t = (k, v) => window.TBi18n.t(k, v);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtT = (x, d = 1) => `${x < 0 ? '−' : ''}${Math.abs(x).toFixed(d)} °C`;
  const fmtN = (x, d = 0) => Number(x).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
  const rupees = (x) => (x >= 1e5 ? `₹${(x / 1e5).toFixed(x >= 1e6 ? 1 : 2)} lakh` : `₹${fmtN(Math.round(x / 100) * 100)}`);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const S = {
    type: 'home', searches: {}, pending: {}, worker: null, workerOk: true, jobId: 0,
    analysis: null, analysisKey: null, animal: null, animalKey: null, view: 'typ', calView: 'design', villageN: 50, hour: null,
  };
  window.TBApp = S;

  // ======================================================================
  // Climate
  // ======================================================================
  function siteKey() {
    const c = window.TB_CLIMATE.sites.custom;
    if (c && ThermaState.useCustom && Math.abs(c.lat - ThermaState.lat) < 1e-3 && Math.abs(c.lon - ThermaState.lon) < 1e-3) return 'custom';
    return window.TB_CLIMATE.sites[ThermaState.city] ? ThermaState.city : 'leh';
  }
  function placeName() { const c = TB.climate.site(siteKey()); return c.name.split(',')[0]; }

  function paintClimateCard() {
    const key = siteKey(), c = TB.climate.site(key), se = TB.climate.season(key);
    const lo = Math.min(...c.t_min), hi = Math.max(...c.t_max), ghi = c.ghi_kwh.reduce((a, b) => a + b, 0) / 12, ws = c.wind.reduce((a, b) => a + b, 0) / 12;
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    if (key !== 'custom') set('climate-card-title', c.name.split(',')[0]);
    set('climate-winter-temp', fmtT(lo));
    set('climate-summer-temp', fmtT(hi));
    set('climate-solar-rad', `${ghi.toFixed(1)} kWh/m²/day`);
    const windEl = $('climate-wind'); if (windEl) { const dir = (windEl.textContent.match(/\(([^)]+)\)/) || [])[1]; windEl.textContent = `${ws.toFixed(1)} m/s${dir ? ` (${dir})` : ''}`; }
    const src = $('climate-source');
    if (src) src.textContent = `NASA POWER 2001–2020 monthly means${c.grid_elev_m ? `, corrected from the ${fmtN(c.grid_elev_m)} m grid cell to ${fmtN(c.elev_m)} m` : ''}. ${se.mode === 'heating' ? `Design month: ${TB.analyse.MONTHS[se.month]}.` : `Design month: ${TB.analyse.MONTHS[se.month]} (cooling).`}`;
    const f = $('temp-fill'); if (f) { f.style.setProperty('--l', `${((lo + 30) / 80) * 100}%`); f.style.setProperty('--w', `${((hi - lo) / 80) * 100}%`); }
  }

  /** Any point on the map: NASA POWER live, elevation from Open-Meteo, same lapse-rate correction as the offline table. */
  async function loadClimateFor(lat, lon) {
    const src = $('climate-source'); if (src) src.textContent = 'Fetching NASA POWER climate for this point…';
    try {
      const P = 'T2M,T2M_RANGE,ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN,RH2M,WS2M', MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const [pw, el] = await Promise.all([
        fetch(`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=${P}&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`).then((r) => r.json()),
        fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`).then((r) => r.json()).catch(() => null),
      ]);
      const p = pw.properties.parameter, grid = pw.geometry.coordinates[2];
      const elev = el && el.elevation ? el.elevation[0] : grid, dt = (grid - elev) * 0.0065;
      const m = (k) => MO.map((mo) => p[k][mo]);
      const mean = m('T2M').map((x) => x + dt), rng = m('T2M_RANGE');
      window.TB_CLIMATE.sites.custom = { name: `${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`, lat, lon, elev_m: Math.round(elev), grid_elev_m: Math.round(grid), t_mean: mean, t_max: mean.map((x, i) => x + rng[i] / 2), t_min: mean.map((x, i) => x - rng[i] / 2), ghi_kwh: m('ALLSKY_SFC_SW_DWN'), ghi_clear_kwh: m('CLRSKY_SFC_SW_DWN'), rh: m('RH2M'), wind: m('WS2M') };
      ThermaState.useCustom = true;
      const zone = $('climate-zone'), se = TB.climate.season('custom');
      if (zone) zone.textContent = se.mode === 'heating' ? `Heating climate, ${fmtN(elev)} m` : `Cooling climate, ${fmtN(elev)} m`;
      const t = $('climate-card-title'); if (t) t.textContent = 'Your site';
      paintClimateCard(); siteChanged();
    } catch (e) {
      ThermaState.useCustom = false;
      if (src) src.textContent = `Offline: using ${TB.climate.site(ThermaState.city).name}, the nearest preset with stored NASA POWER data.`;
    }
  }
  S.loadClimateFor = loadClimateFor;

  // ======================================================================
  // Context and search
  // ======================================================================
  function areaM2() {
    if (ThermaState.activeFlow === 2 && ThermaState.planLayout) return ThermaState.planLayout.zones.reduce((a, z) => a + z.area, 0);
    if (ThermaState.activeFlow !== 1) { const p = window.THERMA_REAL_PLANS[window.activePlanIndex || 0]; return p.dimensions.sqft * 0.092903; }
    return (ThermaState.areaSqFt || 1200) * 0.092903;
  }
  function ctx() {
    const site = siteKey(), se = TB.climate.season(site);
    const beds = parseInt(String(ThermaState.bhk || '2').replace(/\D/g, ''), 10) || 2;
    const c = { site, type: ThermaState.activeFlow === 1 ? S.type : 'home', area: Math.round(areaM2()), bedrooms: beds, month: se.month, mode: se.mode };
    if (ThermaState.activeFlow === 2 && ThermaState.planLayout) c.layout = ThermaState.planLayout;
    return c;
  }
  const searchKey = (c) => `${c.site}|${c.type}|${c.area}`;

  function getWorker() {
    if (S.worker || !S.workerOk) return S.worker;
    try { S.worker = new Worker('js/engine/optimise.worker.js'); S.worker.onerror = () => { S.workerOk = false; S.worker = null; }; } catch (e) { S.workerOk = false; }
    return S.worker;
  }

  /** Runs (or returns the cached) design search for a context. */
  function search(c) {
    const key = searchKey(c);
    if (S.searches[key]) return Promise.resolve(S.searches[key]);
    if (S.pending[key]) return S.pending[key];
    const extra = c.site === 'custom' ? { key: 'custom', data: window.TB_CLIMATE.sites.custom } : null;
    const job = { site: c.site, type: c.type, area: c.area };
    S.pending[key] = new Promise((resolve) => {
      const done = (r) => { S.searches[key] = r; delete S.pending[key]; progress(1); resolve(r); };
      const w = getWorker();
      if (w) {
        const id = ++S.jobId;
        const onMsg = (e) => {
          if (e.data.id !== id) return;
          if (e.data.progress != null) progress(e.data.progress);
          else if (e.data.result) { w.removeEventListener('message', onMsg); done(e.data.result); }
          else if (e.data.error) { w.removeEventListener('message', onMsg); S.workerOk = false; setTimeout(() => done(TB.optimise.search(job)), 0); }
        };
        w.addEventListener('message', onMsg);
        w.postMessage({ id, ctx: job, extraSite: extra });
      } else setTimeout(() => done(TB.optimise.search(job, progress)), 30); // file:// or no worker support
    });
    progress(0);
    return S.pending[key];
  }

  function progress(p) {
    const bar = $('search-progress'); if (bar) { bar.style.setProperty('--p', `${Math.round(p * 100)}%`); bar.classList.toggle('on', p < 1); }
    const pill = $('live-pill');
    if (pill && p < 1) { pill.hidden = false; pill.classList.add('busy'); $('live-value').textContent = `${Math.round(p * 100)} %`; $('live-sub').textContent = t('loading', { n: fmtN(TB.optimise.gridSize()) }); }
  }

  let siteTimer = 0;
  function siteChanged() {
    S.tweaks = {};
    clearTimeout(siteTimer);
    siteTimer = setTimeout(async () => {
      paintClimateCard();
      const c = ctx();
      if (ThermaState.activeFlow === 4) { renderPill(null); return; }
      if (c.mode !== 'heating') { renderPill(null, c); renderSearchPanel(null, c); if (window.renderMaterialCards) renderMaterialCards(); return; }
      const r = await search(c);
      if (searchKey(ctx()) !== searchKey(c)) return; // superseded
      renderPill(r, c); renderSearchPanel(r, c); if (window.renderMaterialCards) renderMaterialCards();
    }, 250);
  }
  S.siteChanged = siteChanged;

  /** Room-by-room dawn temperature of the recommended design and the ordinary build (what the report shows). */
  const roomCache = {};
  function roomDawn(r, c) {
    const key = `${searchKey(c)}|${c.layout ? 'plan' : ''}`;
    if (roomCache[key]) return roomCache[key];
    const run = (v) => TB.thermal.simulate(TB.analyse.specFor(Object.assign({}, v), c, false), TB.climate.weather({ site: c.site, month: c.month, days: 10, dt: 900, orientation: v.orientation || 0 }), { reportDays: 3, record: false }).minOp;
    return (roomCache[key] = { design: run(r.picks.balanced.v), base: run(TB.design.BASELINE[c.type]) });
  }

  function renderPill(r, c) {
    const pill = $('live-pill'); if (!pill) return;
    pill.classList.remove('busy');
    c = c || ctx();
    if (ThermaState.activeFlow === 4 || ThermaState.activeFlow === 3) { pill.hidden = true; return; }
    if (c.mode !== 'heating') {
      pill.hidden = false;
      $('live-label').textContent = `${placeName()} · ${TB.analyse.MONTHS[c.month]}`;
      $('live-value').textContent = 'Cooling';
      $('live-sub').textContent = 'Hot-climate site: the report shows peak temperatures';
      return;
    }
    if (!r) return;
    const q = roomDawn(r, c);
    pill.hidden = false;
    $('live-label').textContent = `Dawn indoors, ${TB.analyse.MONTHS[r.month]}, no heater`;
    $('live-value').textContent = fmtT(q.design);
    $('live-sub').textContent = `vs ${fmtT(q.base)} ordinary · ${fmtN(r.total + r.refined)} designs simulated in ${(r.ms / 1000).toFixed(1)} s`;
  }

  // ======================================================================
  // Designs per flow
  // ======================================================================
  function legacyV() {
    const L = TB.materials.LEGACY, w = L.wall[ThermaState.wallMat] || L.wall.rammed_earth;
    return { wall: w[0], ins: w[1], roof: L.roof[ThermaState.roofMat] || 'cool_roof', floor: 'concrete', glazing: L.glazing[ThermaState.glazingMat] || 'lowe_sc', wwrS: 0.15, wwrN: 0.15, wwrE: 0.08, wwrW: 0.08, trombe: false, ach: 2, aspect: 1.3, shutters: false, orientation: 0 };
  }
  const RETRO = {
    wall: { brick_230: ['brick', 0, 'brick', 0.05], stone_300: ['stone', 0, 'stone', 0.075], concrete_200: ['conc_block', 0, 'conc_block', 0.05], mud_brick: ['mud_brick', 0, 'mud_brick', 0.04], aac_150: ['aac', 0, 'aac', 0.03] },
    roof: { rcc_uninsulated: ['rcc_bare', 'rcc_ins'], tin_sheet: ['cgi_bare', 'cgi_ins'], clay_tile: ['tile_bamboo', 'tile_double'] },
    glazing: { single_al: ['single', 'double_lowe'], single_wood: ['single', 'double_lowe'] },
  };
  function retrofitVs(mode) {
    const w = RETRO.wall[$('f3-wall-select')?.value] || RETRO.wall.brick_230, r = RETRO.roof[$('f3-roof-select')?.value] || RETRO.roof.rcc_uninsulated, g = RETRO.glazing[$('f3-glazing-select')?.value] || RETRO.glazing.single_al;
    const base = { wall: w[0], ins: w[1], roof: r[0], floor: 'concrete', glazing: g[0], wwrS: 0.15, wwrN: 0.1, wwrE: 0.1, wwrW: 0.1, trombe: false, ach: 1.5, aspect: 1.2, shutters: false, orientation: 0 };
    const up = Object.assign({}, base, { ins: w[3], roof: r[1], glazing: mode === 'heating' ? g[1] : 'lowe_sc', ach: 0.8 });
    return { base, up, parts: { wall: { ins: w[3] }, roof: { roof: r[1] }, glazing: { glazing: up.glazing }, air: { ach: 0.8 } } };
  }

  /** The design shown in the report for the active flow, before the user's step-4 tweaks. */
  async function baseDesignFor(c) {
    const f = ThermaState.activeFlow;
    if (f === 3) { const r = retrofitVs(c.mode); return { v: r.up, baseV: r.base, label: 'Upgraded home', baseLabel: 'Your home today' }; }
    if (c.mode === 'heating') {
      const r = await search(c);
      return { v: Object.assign({}, r.picks.balanced.v), baseV: Object.assign({}, TB.design.BASELINE[c.type]), search: r, label: 'Your design', baseLabel: TB.design.BASELINE[c.type].label };
    }
    return { v: legacyV(), baseV: Object.assign({}, TB.design.BASELINE.home), label: 'Your design', baseLabel: 'Ordinary concrete-block house' };
  }
  /** Step-4 fine-tuning: orientation, south glass and overhang. Materials stay as recommended. */
  S.tweaks = {};
  const tweakKey = () => JSON.stringify(S.tweaks);
  async function designFor(c) {
    const d = await baseDesignFor(c);
    d.recommended = Object.assign({}, d.v);
    Object.entries(S.tweaks).forEach(([k, val]) => { if (val != null) d.v[k] = val; });
    return d;
  }
  S.designFor = designFor; S.ctx = ctx;

  /** Everything the 3D view and drawings need: the design, its room layout, and a quick three-night run. */
  const runCache = {};
  S.design3D = async function () {
    const c = ctx(); const d = await designFor(c);
    const key = `${ThermaState.activeFlow}|${searchKey(c)}|${c.layout ? 'plan' : ''}|${JSON.stringify(d.v)}`;
    if (runCache[key]) return runCache[key];
    const sp = TB.analyse.specFor(Object.assign({}, d.v), c, false);
    const lay = c.layout || { zones: sp.zones, links: sp.links, width: sp.zones.reduce((m, z) => Math.max(m, (z.x || 0) + (z.w || 0)), 0), depth: sp.zones.reduce((m, z) => Math.max(m, (z.y || 0) + (z.d || 0)), 0) };
    const T = TB.design.TYPES[c.type];
    if (T.stove) sp.ach = Math.max(sp.ach || 0, TB.optimise.requiredACH(c.type, sp.occupants, sp.area * 2.7));
    const wTyp = TB.climate.weather({ site: c.site, month: c.month, days: 10, dt: 900, orientation: d.v.orientation || 0 });
    const typ = TB.thermal.simulate(sp, wTyp, { reportDays: 3 });
    const bsp = TB.analyse.specFor(Object.assign({}, d.baseV), c, false);
    const base = TB.thermal.simulate(bsp, TB.climate.weather({ site: c.site, month: c.month, days: 10, dt: 900, orientation: 0 }), { reportDays: 1, record: false });
    const q = TB.design.quantities(sp, d.v);
    return (runCache[key] = { c, d, v: d.v, sp, lay, typ, wTyp, base, bom: q, site: TB.climate.site(c.site) });
  };

  // ======================================================================
  // Engine-backed material cards (step 3) and the search panel
  // ======================================================================
  const LAYER_COL = { rammed_earth: '#B98A5E', mud_brick: '#A87B55', stone: '#8D8A82', cseb: '#A87B55', straw_bale: '#E1C878', conc_block: '#B5B5AE', brick: '#B8623C', eps: '#F2EFA8', wool_felt: '#EFE6D2', lime_plaster: '#E8E1D3', mud_plaster: '#D9C7A8', mud_screed: '#9C7A55', grass_twig: '#C9B27A', poplar: '#D8B27A', rcc: '#A9A9A2', gravel: '#C4C0B6', steel_sheet: '#7E858C', aac: '#D5D8D6', rock_wool: '#E9CF6B', cork: '#B98B5E', clt: '#D8B27A', wood_fibre: '#C9A77F', soil: '#6E5237', clay_tile: '#B8623C', air_gap: '#F7F7F4', timber_floor: '#C9A77F' };
  const layersOf = (list) => list.map(([k, d]) => [Math.max(0.6, d * 40), LAYER_COL[k] || '#ccc']);
  function engineCards() {
    const c = ctx(); if (c.mode !== 'heating' || ThermaState.activeFlow !== 1) return null;
    const r = S.searches[searchKey(c)]; if (!r) return null;
    const v = r.picks.balanced.v, M = TB.materials;
    const w = M.wall(v.wall, v.ins), rf = M.roof(v.roof), gl = M.GLAZING[v.glazing];
    const insTxt = v.ins ? ` + ${Math.round(v.ins * 1000)} mm insulation outside` : '';
    return {
      wall: { name: `${M.WALLS[v.wall].label}${insTxt}`, why: `${v.ins ? 'Heavy wall on the warm side of the insulation: it stores the day’s heat and gives it back at night.' : 'Heavy wall that stores the day’s heat.'}`, specs: [`U ${w.U.toFixed(2)} W/m²K`, `Stores ${(w.kappa / 1000).toFixed(0)} kJ/m²K`], layers: layersOf(w.layers) },
      roof: { name: rf.label, why: 'A flat roof faces the whole night sky. This build keeps that loss small.', specs: [`U ${rf.U.toFixed(2)} W/m²K`], layers: layersOf(rf.layers) },
      glazing: { name: `${gl.label}${v.trombe ? ' + Trombe wall' : ''}`, why: `${Math.round(v.wwrS * 100)} % of the south wall is glass${v.trombe ? ', with a dark mass wall behind glass beside it' : ''}${v.shutters ? '. Insulated shutters close at dusk.' : '.'}`, specs: [`U ${gl.U.toFixed(2)}`, `g ${gl.g.toFixed(2)}`, v.shutters ? 'Night shutters' : 'No shutters'], layers: [[1, '#BFD6EC'], [2, '#EEF4FA'], [1, '#BFD6EC']] },
      rationale: (() => { const q = roomDawn(r, c); return `Chosen from ${fmtN(r.total + r.refined)} designs simulated for ${placeName()} in ${TB.analyse.MONTHS[r.month]}: the cheapest design within 1.5 °C of the warmest safe one. Simulated room by room, it holds ${fmtT(q.design)} at dawn with no heater, against ${fmtT(q.base)} in an ordinary build.`; })(),
    };
  }
  S.engineCards = engineCards;

  /** Cold sites: the livestock shelter the engine models (closed, insulated, south glazing). */
  function engineAnimalCards() {
    if (ThermaState.activeFlow !== 4) return null;
    const c = ctx(); if (c.mode !== 'heating') return null;
    const sp = TB.safety.SPECIES[ThermaState.animalSpecies] || TB.safety.SPECIES.cattle, M = TB.materials;
    const w = M.wall('mud_brick', 0.05), r = M.roof('mud_poplar_ins');
    return {
      roof: { name: 'Poplar and mud roof, insulated', why: `U ${r.U.toFixed(2)} W/m²K. Keeps the herd's body heat in on long nights.`, layers: layersOf(r.layers) },
      wall: { name: 'Closed mud-brick walls, 50 mm insulation, south polycarbonate', why: `U ${w.U.toFixed(2)} W/m²K. A third of the south wall is twin-wall polycarbonate for winter sun; no openings on the north.`, layers: layersOf(w.layers) },
      floor: { name: 'Earth floor with deep straw bedding', why: `Dry bedding keeps ${sp.young} off the frozen ground.`, layers: [[2, '#E1C878'], [2, '#9C7A55']] },
      rationale: `Cold site: the shelter is closed and insulated so ${sp.label.toLowerCase()} body heat (${Math.round(TB.safety.animalHeat(ThermaState.animalSpecies))} W a head) warms it, with a ridge vent sized for moisture and ammonia.`,
    };
  }
  S.engineAnimalCards = engineAnimalCards;

  function renderSearchPanel(r, c) {
    const card = $('search-card'); if (!card) return;
    c = c || ctx();
    if (!r || c.mode !== 'heating' || ThermaState.activeFlow !== 1) { card.hidden = c.mode !== 'heating' ? true : card.hidden; if (c.mode !== 'heating') return; if (!r) return; }
    card.hidden = false;
    $('search-sub').textContent = `Every combination of wall, insulation, roof, glass, Trombe wall, airtightness, plan shape and shutters, simulated through a ${TB.analyse.MONTHS[r.month]} night in ${placeName()}.`;
    const stat = (n, l) => `<div><dt>${l}</dt><dd>${n}</dd></div>`;
    $('search-stats').innerHTML = stat(fmtN(r.total + r.refined), 'designs simulated') + stat(fmtN(r.rejectedMould), 'rejected: mould risk') + stat(fmtN(r.ventSized), 'too airtight, vent sized') + stat(`${(r.ms / 1000).toFixed(1)} s`, 'in your browser');
    // Pareto scatter: cost vs dawn temperature
    const el = $('pareto'), W = el.clientWidth || 520, H = 260, m = { l: 44, r: 12, t: 12, b: 34 };
    const xs = r.scatter.map((p) => p[0]), ys = r.scatter.map((p) => p[1]).concat([r.base.dawn]);
    const x0 = Math.min(...xs, r.base.cost) * 0.95, x1 = Math.max(...xs) * 1.02, y0 = Math.floor(Math.min(...ys) - 1), y1 = Math.ceil(Math.max(...ys) + 1);
    const X = (v) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r), Y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
    const front = r.front.slice().sort((a, b) => a.cost - b.cost);
    const ticksY = []; for (let v = Math.ceil(y0 / 5) * 5; v <= y1; v += 5) ticksY.push(v);
    const ticksX = []; const span = x1 - x0, step = span > 1.2e6 ? 2e5 : span > 5e5 ? 1e5 : 5e4; for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) ticksX.push(v);
    const pick = (d, k, lbl) => `<g class="pk pk-${k}"><circle cx="${X(d.cost)}" cy="${Y(d.dawn)}" r="7"/><text x="${X(d.cost) + (k === 'warmest' ? -10 : 10)}" y="${Y(d.dawn) - 10}" text-anchor="${k === 'warmest' ? 'end' : 'start'}">${lbl}</text></g>`;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter of design cost against dawn temperature">
      <g class="grid">${ticksY.map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')}</g>
      <g class="axis">${ticksY.map((v) => `<text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v}°</text>`).join('')}${ticksX.map((v) => `<text x="${X(v)}" y="${H - 12}" text-anchor="middle">₹${(v / 1e5).toFixed(step < 1e5 ? 1 : 0)}L</text>`).join('')}</g>
      <g class="dots">${r.scatter.map((p) => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="1.6"/>`).join('')}</g>
      <path class="front" d="${front.map((d, i) => `${i ? 'L' : 'M'}${X(d.cost).toFixed(1)},${Y(d.dawn).toFixed(1)}`).join('')}"/>
      <g class="pk pk-base"><circle cx="${X(r.base.cost)}" cy="${Y(r.base.dawn)}" r="6"/><text x="${X(r.base.cost) + 10}" y="${Y(r.base.dawn) + 4}">Ordinary build</text></g>
      ${pick(r.picks.budget, 'budget', 'Budget')}${pick(r.picks.warmest, 'warmest', 'Warmest')}${pick(r.picks.balanced, 'balanced', 'Recommended')}
    </svg><figcaption>Each dot is a safe design: cost of the envelope (x) against the coldest indoor temperature at dawn with no heater (y). The line is the best trade-off.</figcaption>`;
    const M = TB.materials;
    const card3 = (k, d, title) => `<article class="pick ${k === 'balanced' ? 'is-rec' : ''}"><p class="pick-k">${title}${k === 'balanced' ? ' <span class="best-mark">Recommended</span>' : ''}</p><p class="pick-t">${fmtT(d.dawn)}<small> at dawn</small></p><p class="pick-c">${rupees(d.cost)} envelope · ${fmtN(d.carbon / 1000, 1)} t CO₂e</p><p class="pick-d">${M.WALLS[d.v.wall].label}${d.v.ins ? ` + ${Math.round(d.v.ins * 1000)} mm` : ''} · ${M.ROOFS[d.v.roof].label.toLowerCase()} · ${M.GLAZING[d.v.glazing].label.toLowerCase()}, ${Math.round(d.v.wwrS * 100)} % south${d.v.trombe ? ' · Trombe wall' : ''}${d.v.shutters ? ' · shutters' : ''}</p></article>`;
    $('picks').innerHTML = card3('budget', r.picks.budget, 'Budget') + card3('balanced', r.picks.balanced, 'Balanced') + card3('warmest', r.picks.warmest, 'Warmest');
    $('search-note').textContent = `Screening uses a fast whole-house model. The report then re-simulates the recommended design room by room, so its numbers differ slightly from the ones on this chart.`;
    $('search-alt').textContent = r.alternative ? `${r.alternative.note} If you can get them, straw-bale walls would reach ${fmtT(r.alternative.dawn)} for ${rupees(r.alternative.cost)}.` : '';
  }

  // ======================================================================
  // Charts
  // ======================================================================
  function lineChart(el, cfg) {
    el.innerHTML = '';
    const W = el.clientWidth || 800, H = el.clientHeight || 300, m = { t: 16, r: 16, b: 28, l: 38 };
    const all = cfg.lines.flatMap((l) => Array.from(l.y)).concat(cfg.band ? Array.from(cfg.band.lo).concat(Array.from(cfg.band.hi)) : []);
    const yMin = Math.floor(Math.min(...all) - 2), yMax = Math.ceil(Math.max(...all) + 2), tMax = cfg.t[cfg.t.length - 1];
    const x = (h) => m.l + (h / tMax) * (W - m.l - m.r), y = (v) => m.t + (1 - (v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
    const path = (arr) => Array.from(arr).map((v, i) => `${i ? 'L' : 'M'}${x(cfg.t[i]).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const yT = []; const st = yMax - yMin > 30 ? 10 : 5; for (let v = Math.ceil(yMin / st) * st; v <= yMax; v += st) yT.push(v);
    const band = cfg.band ? `<path class="band" d="${path(cfg.band.hi)}${Array.from(cfg.band.lo).map((v, i, a) => `L${x(cfg.t[a.length - 1 - i]).toFixed(1)},${y(a[a.length - 1 - i]).toFixed(1)}`).join('')}Z"/>` : '';
    const nights = (cfg.nights || []).map(([a, b]) => `<rect class="night" x="${x(Math.max(0, a))}" y="${m.t}" width="${Math.max(0, x(Math.min(tMax, b)) - x(Math.max(0, a)))}" height="${H - m.t - m.b}"/>`).join('');
    const cLo = Math.max(yMin, cfg.comfort[0]), cHi = Math.min(yMax, cfg.comfort[1]);
    const xT = []; for (let h = 0; h <= tMax; h += tMax > 30 ? 12 : 6) xT.push(h);
    const lbl = (h) => { const d = Math.floor(h / 24), hh = Math.round(h % 24); const s = hh === 0 ? '12 am' : hh === 12 ? '12 pm' : hh < 12 ? `${hh} am` : `${hh - 12} pm`; return tMax > 30 && hh === 0 ? `Day ${d + 1}` : s; };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `${nights}
      ${cHi > cLo ? `<rect class="comfort" x="${m.l}" y="${y(cHi)}" width="${W - m.l - m.r}" height="${y(cLo) - y(cHi)}" rx="3"/><text class="comfort-label" x="${m.l + 8}" y="${y(cHi) + 14}">${cfg.comfortLabel}</text>` : ''}
      <g class="grid">${yT.map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`).join('')}${yMin < 0 && yMax > 0 ? `<line class="zero" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>` : ''}</g>
      <g class="axis">${yT.map((v) => `<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}°</text>`).join('')}${xT.map((h) => `<text x="${x(h)}" y="${H - 8}" text-anchor="middle">${lbl(h)}</text>`).join('')}</g>
      ${band}
      ${cfg.lines.map((l) => `<path class="series ${l.cls} ${reduceMotion || l.cls === 's-out' ? '' : 'draw'}" d="${path(l.y)}"/>`).join('')}
      ${(cfg.marks || []).map((mk) => `<g class="peak"><circle cx="${x(mk.t)}" cy="${y(mk.v)}" r="5" fill="${mk.color}"/><text x="${x(mk.t) + 8}" y="${y(mk.v) + (mk.below ? 16 : -8)}">${mk.label}</text></g>`).join('')}
      <line class="crosshair" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}"/>
      <rect class="hover-rect" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"/>`;
    el.appendChild(svg);
    svg.querySelectorAll('.draw').forEach((p, i) => { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; requestAnimationFrame(() => { p.style.transition = `stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1) ${0.15 + i * 0.25}s`; p.style.strokeDashoffset = 0; }); });
    const tip = document.createElement('div'); tip.className = 'chart-tip'; el.appendChild(tip);
    const cross = svg.querySelector('.crosshair'), hr = svg.querySelector('.hover-rect');
    const n = cfg.t.length;
    hr.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
      const h = ((px - m.l) / (W - m.l - m.r)) * tMax; const i = Math.max(0, Math.min(n - 1, Math.round((h / tMax) * (n - 1))));
      cross.setAttribute('x1', x(cfg.t[i])); cross.setAttribute('x2', x(cfg.t[i])); cross.style.opacity = 1;
      tip.style.left = `${(x(cfg.t[i]) / W) * 100}%`; tip.style.top = `${(y(Math.max(...cfg.lines.map((l) => l.y[i]))) / H) * 100}%`; tip.style.opacity = 1;
      const hh = cfg.t[i] % 24, hm = `${Math.floor(hh)}:${String(Math.round((hh % 1) * 60)).padStart(2, '0')}`;
      tip.innerHTML = `${cfg.t.length > 100 ? `Day ${Math.floor(cfg.t[i] / 24) + 1}, ` : ''}${hm}<br>${cfg.lines.map((l) => `${l.name} <b>${fmtT(l.y[i])}</b>`).join('<br>')}${cfg.band ? `<br><small>Range ${fmtT(cfg.band.lo[i])} to ${fmtT(cfg.band.hi[i])}</small>` : ''}`;
    });
    hr.addEventListener('pointerleave', () => { cross.style.opacity = 0; tip.style.opacity = 0; });
  }

  const tempColor = (v) => {
    // cold blue → paper → warm ember
    const stops = [[-20, [38, 70, 140]], [-8, [80, 130, 205]], [2, [170, 200, 236]], [10, [238, 236, 226]], [16, [247, 214, 170]], [22, [240, 150, 100]], [30, [214, 76, 38]], [38, [150, 40, 20]]];
    if (v <= stops[0][0]) return `rgb(${stops[0][1]})`;
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (v - a) / (b - a); return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * f)).join(',')})`; }
    return `rgb(${stops[stops.length - 1][1]})`;
  };
  S.tempColor = tempColor;

  // ======================================================================
  // Report (flows 1–3)
  // ======================================================================
  function showLoading(on) {
    const el = $('report-loading'); if (el) el.hidden = !on;
    document.querySelectorAll('#flow-step-5 .rep-extra, #flow-step-5 .report-figures, #flow-step-5 .chart-card, #flow-step-5 .spec-card').forEach((n) => n.classList.toggle('is-loading', on));
  }

  async function renderHouse(opts) {
    const panel = $('flow-step-5'); if (!panel || panel.style.display === 'none') return;
    const c = ctx();
    const key = `${ThermaState.activeFlow}|${searchKey(c)}|${tweakKey()}|${c.layout ? 'plan' + c.layout.zones.length : ''}|${ThermaState.activeFlow === 3 ? [$('f3-wall-select')?.value, $('f3-roof-select')?.value, $('f3-glazing-select')?.value].join() : ''}|${ThermaState.activeFlow === 1 && c.mode !== 'heating' ? [ThermaState.wallMat, ThermaState.roofMat, ThermaState.glazingMat].join() : ''}`;
    if (S.analysisKey !== key) {
      showLoading(true);
      const d = await designFor(c);
      await new Promise((r) => setTimeout(r, 20));
      S.analysis = TB.analyse.house(c, d.v, d.baseV, { uncertaintyRuns: 80 });
      S.analysis.labels = d; S.analysisKey = key; S.hour = null;
      showLoading(false);
    }
    drawHouse(S.analysis, opts);
  }
  S.renderHouse = renderHouse;

  function drawHouse(A) {
    const heat = A.mode === 'heating', lang = window.TBi18n.lang;
    const HI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const place = A.site.name.split(',')[0], month = (lang === 'hi' ? HI_MONTHS : TB.analyse.MONTHS)[A.ctx.month];
    // --- head
    $('report-place').textContent = `${place} · ${A.typeLabel}${ThermaState.activeFlow === 3 ? ' · before and after' : ''}`;
    const diff = heat ? A.dawn - A.baseDawn : A.basePeak - A.peak, retro = ThermaState.activeFlow === 3 ? '_retro' : '';
    $('s5-title').innerHTML = t((heat ? 'head_heat' : 'head_cool') + retro, { month, v: fmtT(Math.abs(diff)) });
    const sub = document.querySelector('#flow-step-5 .report-sub');
    if (sub) sub.textContent = t((heat ? 'sub_heat' : 'sub_cool') + retro, { place, out: fmtT(heat ? A.outMin : A.outMax), yours: fmtT(heat ? A.dawn : A.peak), base: fmtT(heat ? A.baseDawn : A.basePeak) });
    if (window.countUp) countUp($('res-temp-diff'), Math.abs(diff), (v) => fmtT(v));
    // --- tiles
    const tile = (id, label, value) => { const el = $(id); if (!el) return; el.textContent = value; const s = el.parentElement.querySelector('span'); if (s) s.textContent = label; };
    const u = A.uncertainty;
    tile('res-peak-temp-base', t((heat ? 'tile_base_dawn' : 'tile_base_peak') + retro), fmtT(heat ? A.baseDawn : A.basePeak));
    tile('res-peak-temp-opt', t((heat ? 'tile_opt_dawn' : 'tile_opt_peak') + retro), fmtT(heat ? A.dawn : A.peak));
    const rangeEl = $('res-range'); if (rangeEl && u) { const p = heat ? u.typ.dawn : u.typ.peak; rangeEl.textContent = `Likely ${fmtT(p.p10, 0).replace(' °C', '')} to ${fmtT(p.p90, 0)}`; }
    tile('res-energy-savings', t(heat ? 'tile_fuel' : 'tile_cool'), `${Math.round(A.season.savedPct)} %`);
    tile('res-ach-val', t('tile_air'), `${A.safety.achDesign.toFixed(2)} ACH`);
    tile('res-pmv-val', A.pmv.when ? `${t('tile_pmv')}, ${A.pmv.when}` : t('tile_pmv'), `${A.pmv.design.pmv >= 0 ? '+' : '−'}${Math.abs(A.pmv.design.pmv).toFixed(2)} (${TB.safety.pmvLabel(A.pmv.design.pmv)})`);
    // --- chart
    $('chart-title').textContent = t(heat ? 'chart_title_heat' : 'chart_title_cool', { month });
    $('tab-typ').textContent = t('tab_typ'); $('tab-snap').textContent = t(heat ? 'tab_snap_heat' : 'tab_snap_cool');
    document.querySelectorAll('#report-legend [data-l]').forEach((s) => { s.lastChild.textContent = t(s.dataset.l + (s.dataset.l === 'lg_base' || s.dataset.l === 'lg_opt' ? retro : '')); });
    drawMainChart(A);
    // --- spec table from the engine
    const sp = A.design.sp, M = TB.materials, v = A.v;
    const setRow = (id, name, idU, U) => { if ($(id)) $(id).textContent = name; if ($(idU)) $(idU).textContent = `${U.toFixed(2)} W/m²K`; };
    setRow('rep-wall-name', `${M.WALLS[v.wall].label}${v.ins ? ` + ${Math.round(v.ins * 1000)} mm insulation outside` : ''}`, 'rep-wall-u', sp.wall.U);
    setRow('rep-roof-name', sp.roof.label, 'rep-roof-u', sp.roof.U);
    setRow('rep-glaze-name', `${M.GLAZING[v.glazing].label}${v.trombe ? `, plus ${A.bom.trombeA.toFixed(1)} m² Trombe wall` : ''}`, 'rep-glaze-u', M.GLAZING[v.glazing].U);
    const tb = $('flow1-materials-report-body');
    if (tb) {
      const rows = tb.querySelectorAll('tr');
      const notes = [`Stores ${(sp.wall.kappa / 1000).toFixed(0)} kJ/m²K on the room side`, `Absorbs ${Math.round(sp.roof.alpha * 100)} % of sunlight`, `g ${M.GLAZING[v.glazing].g.toFixed(2)}${v.shutters ? ', night shutters' : ''}`, `Ground U ${A.design.typ.model.Ug.toFixed(2)} W/m²K (ISO 13370)`];
      rows.forEach((r, i) => { const td = r.querySelectorAll('td'); if (td[1]) td[1].textContent = [`${Math.round(sp.wall.thick * 1000)} mm`, `${Math.round(sp.roof.thick * 1000)} mm`, '—', `${Math.round(sp.floor.thick * 1000)} mm`][i]; if (td[3]) td[3].textContent = notes[i]; if (td[4]) td[4].innerHTML = '<span class="tag tag-ok">Computed</span>'; });
      const fl = rows[3]; if (fl) { fl.querySelector('td').textContent = sp.floor.label; fl.querySelector('strong').textContent = `${A.design.typ.model.Ug.toFixed(2)} W/m²K`; }
      const head = tb.parentElement.querySelector('thead tr'); if (head && head.lastElementChild.textContent === 'ECBC') head.lastElementChild.textContent = 'Source';
    }
    drawRooms(A); drawFlows(A); drawWhy(A); drawSafety(A); drawCalendar(A); drawFuel(A); drawBom(A); drawBuild(A); drawMethod(A);
    document.querySelectorAll('#flow-step-5 [data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n, { month, sp: TB.design.TYPES[A.ctx.type].setpoint || 16, sb: TB.design.TYPES[A.ctx.type].setback || TB.design.TYPES[A.ctx.type].setpoint || 16, price: A.ctx.price || 85 }); });
    document.querySelectorAll('.lang-toggle .seg').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
  }

  function nightsFor(wx) { const out = []; for (let d = -1; d <= 3; d++) out.push([d * 24 + wx.sunset, (d + 1) * 24 + wx.sunrise]); return out; }

  function drawMainChart(A) {
    const heat = A.mode === 'heating', snap = S.view === 'snap';
    const d = snap ? A.design.snap : A.design.typ, b = snap ? A.base.snap : A.base.typ, wx = snap ? A.design.wSnap : A.design.wTyp;
    const s = d.series, n = s.hour.length, tt = Array.from(s.hour, (h, i) => (i * 72) / (n - 1));
    let band = null;
    if (A.uncertainty) {
      const u = snap ? A.uncertainty.snap : A.uncertainty.typ, un = u.band.p50.length;
      const at = (arr, i) => arr[Math.min(un - 1, Math.round((i / (n - 1)) * (un - 1)))];
      band = { lo: tt.map((_, i) => s.wholeOp[i] + at(u.band.p10, i) - at(u.band.p50, i)), hi: tt.map((_, i) => s.wholeOp[i] + at(u.band.p90, i) - at(u.band.p50, i)) };
    }
    const iMinD = s.wholeOp.indexOf(Math.min(...s.wholeOp)), iMinB = b.series.wholeOp.indexOf(Math.min(...b.series.wholeOp));
    const iMaxD = s.wholeOp.indexOf(Math.max(...s.wholeOp)), iMaxB = b.series.wholeOp.indexOf(Math.max(...b.series.wholeOp));
    lineChart($('report-chart'), {
      t: tt, band, nights: nightsFor(wx),
      comfort: heat ? [18, 24] : [22, 27], comfortLabel: heat ? 'Comfortable, 18–24 °C (WHO minimum 18 °C)' : 'Comfort band 22–27 °C',
      lines: [{ y: s.te, cls: 's-out', name: t('lg_out') }, { y: b.series.wholeOp, cls: 's-base', name: t('lg_base' + (ThermaState.activeFlow === 3 ? '_retro' : '')) }, { y: s.wholeOp, cls: 's-opt', name: t('lg_opt' + (ThermaState.activeFlow === 3 ? '_retro' : '')) }],
      marks: heat ? [{ t: tt[iMinB], v: b.series.wholeOp[iMinB], label: `${fmtT(b.series.wholeOp[iMinB])} ${ThermaState.activeFlow === 3 ? 'today' : 'ordinary'}`, color: '#E4572E', below: true }, { t: tt[iMinD], v: s.wholeOp[iMinD], label: `${fmtT(s.wholeOp[iMinD])} ${ThermaState.activeFlow === 3 ? 'upgraded' : 'yours'}`, color: '#3D7BD9' }]
        : [{ t: tt[iMaxB], v: b.series.wholeOp[iMaxB], label: `${fmtT(b.series.wholeOp[iMaxB])} ordinary`, color: '#E4572E' }, { t: tt[iMaxD], v: s.wholeOp[iMaxD], label: `${fmtT(s.wholeOp[iMaxD])} yours`, color: '#3D7BD9', below: true }],
    });
    const rows = []; for (let i = 0; i < n; i += Math.round(n / 24)) rows.push(i);
    $('report-chart-table').innerHTML = `<table><thead><tr><th>Time</th><th>Outdoors</th><th>Ordinary build</th><th>Your design</th>${band ? '<th>Likely range</th>' : ''}</tr></thead><tbody>${rows.map((i) => `<tr><td>Day ${Math.floor(tt[i] / 24) + 1}, ${Math.floor(tt[i] % 24)}:00</td><td>${fmtT(s.te[i])}</td><td>${fmtT(b.series.wholeOp[i])}</td><td>${fmtT(s.wholeOp[i])}</td>${band ? `<td>${fmtT(band.lo[i])} to ${fmtT(band.hi[i])}</td>` : ''}</tr>`).join('')}</tbody></table>`;
    $('report-chart').setAttribute('aria-label', `Line chart over three ${heat ? 'nights' : 'days'}: outdoors, ordinary build and your design, with a likely range band.`);
  }

  // --- room by room
  function drawRooms(A) {
    const box = $('rep-rooms'); if (!box) return;
    const zones = A.zones, heat = A.mode === 'heating';
    const r = S.view === 'snap' ? A.design.snap : A.design.typ, s = r.series, n = s.hour.length;
    if (S.hour == null || S.hour >= n) S.hour = heat ? s.wholeOp.indexOf(Math.min(...s.wholeOp)) : s.wholeOp.indexOf(Math.max(...s.wholeOp));
    const polys = zones.some((z) => z.poly);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    zones.forEach((z) => { const pts = z.poly || [[z.x, z.y], [z.x + z.w, z.y], [z.x + z.w, z.y + z.d], [z.x, z.y + z.d]]; pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }); z._pts = pts; });
    const Wm = maxX - minX, Dm = maxY - minY, W = 520, sc = (W - 60) / Math.max(Wm, Dm * 1.2), H = Dm * sc + 70;
    // generated layouts have the south band at y = 0, so south is drawn at the bottom; plans use y up = north
    const P = ([x, y]) => [30 + (x - minX) * sc, polys ? 30 + (maxY - y) * sc : 30 + (maxY - y) * sc];
    const hh = s.hour[S.hour] % 24, day = Math.floor(s.hour[S.hour] / 24) + 1;
    $('rooms-svg').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Plan with each room coloured by temperature">
      ${zones.map((z, i) => { const pts = z._pts.map(P); const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length; const tv = s.op[i][S.hour];
        return `<g class="room"><polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${tempColor(tv)}"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" class="room-n">${esc(z.name)}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" class="room-t">${fmtT(tv)}</text></g>`; }).join('')}
      <g class="compass"><text x="${W - 22}" y="22" text-anchor="middle">N</text><path d="M${W - 22} 28 l-5 12 l5 -3 l5 3z"/></g>
      <text class="side-s" x="${30 + (Wm * sc) / 2}" y="${H - 12}" text-anchor="middle">South · sun side</text>
    </svg>`;
    $('rooms-time').textContent = `Day ${day}, ${Math.floor(hh)}:${String(Math.round((hh % 1) * 60)).padStart(2, '0')} · outdoors ${fmtT(s.te[S.hour])}`;
    const sl = $('rooms-slider'); sl.max = n - 1; sl.value = S.hour;
    $('rooms-list').innerHTML = zones.map((z, i) => `<li><span class="sw" style="background:${tempColor(heat ? z.minTyp : Math.max(...s.op[i]))}"></span>${esc(z.name)}<b>${heat ? 'coldest' : 'hottest'} ${fmtT(heat ? (S.view === 'snap' ? z.minSnap : z.minTyp) : Math.max(...s.op[i]))}</b></li>`).join('');
  }

  // --- heat flows
  function drawFlows(A) {
    const box = $('flows-chart'); if (!box) return;
    const f = A.flowsPerDay, fb = A.flowsPerDayBase;
    const gains = ['solarWin', 'solarTrombe', 'solarOpaque', 'internal'].filter((k) => Math.abs(f[k]) > 0.05 || Math.abs(fb[k]) > 0.05);
    const losses = ['windows', 'walls', 'roof', 'floor', 'vent', 'sky', 'trombeGlass'].filter((k) => Math.abs(f[k]) > 0.05 || Math.abs(fb[k]) > 0.05);
    const max = Math.max(...gains.concat(losses).flatMap((k) => [Math.abs(f[k]), Math.abs(fb[k])]));
    const row = (k, kind) => { const a = Math.abs(f[k]), b = Math.abs(fb[k]); return `<div class="fl-row"><span class="fl-k">${t((kind === 'g' ? 'g_' : 'l_') + k)}</span><span class="fl-bars"><i class="fl-${kind}" style="--w:${(a / max) * 100}%"></i><i class="fl-base" style="--w:${(b / max) * 100}%"></i></span><span class="fl-v">${a.toFixed(1)}<small> / ${b.toFixed(1)}</small></span></div>`; };
    const sum = (ks, o) => ks.reduce((s, k) => s + Math.abs(o[k]), 0);
    box.innerHTML = `<p class="fl-h">${t('gains')} <small>${sum(gains, f).toFixed(0)} kWh · ${t('ordinary').toLowerCase()} ${sum(gains, fb).toFixed(0)}</small></p>${gains.map((k) => row(k, 'g')).join('')}
      <p class="fl-h">${t('losses')} <small>${sum(losses, f).toFixed(0)} kWh · ${t('ordinary').toLowerCase()} ${sum(losses, fb).toFixed(0)}</small></p>${losses.map((k) => row(k, 'l')).join('')}
      <p class="fl-legend"><span><i class="fl-g"></i>${t('yours')}</span><span><i class="fl-base"></i>${t('ordinary')}</span></p>`;
  }

  // --- why
  function drawWhy(A) {
    const box = $('why-list'); if (!box) return;
    if (!A.why.length) { box.innerHTML = '<p class="best-note">This hot-climate design is rated on peak temperature; see the spec table for each part.</p>'; return; }
    const max = Math.max(...A.why.map((w) => w.delta), 0.1);
    box.innerHTML = A.why.map((w) => `<li><div class="why-row"><span class="why-k">${esc(w.label)}</span><span class="why-bar"><i style="--w:${Math.max(2, (w.delta / max) * 100)}%"></i></span><b>+${w.delta.toFixed(1)} °C</b></div><p>${esc(w.detail)}</p></li>`).join('');
  }

  // --- safety
  function drawSafety(A) {
    const box = $('safety-list'); if (!box) return;
    const s = A.safety, V = A.design.sp.area * 2.7, q = s.achDesign * V, vent = Math.round(((q / 3600) / (0.6 * Math.sqrt((2 * 2) / 0.9))) * 1e4);
    const item = (lvl, title, body) => `<li class="sf sf-${lvl}"><span class="sf-dot" aria-hidden="true"></span><div><p class="sf-t">${title}<span class="sf-tag">${{ ok: 'Pass', caution: 'Note', warn: 'Check', danger: 'Risk' }[lvl]}</span></p><p>${body}</p></div></li>`;
    const heat = A.mode === 'heating';
    box.innerHTML = [
      item(s.achDesign >= s.achRequired - 1e-6 ? 'ok' : 'danger', t('s_air'), `${s.achDesign.toFixed(2)} air changes an hour for ${s.occupants} people${s.stove ? ' and a stove' : ''}; at least ${s.achRequired.toFixed(2)} needed. ${s.vented ? `The build is tighter than that, so a closable vent of about ${fmtN(vent)} cm² is specified.` : 'Met by normal air leakage.'}`),
      item(s.co2 <= 1400 ? 'ok' : 'warn', t('s_co2'), `About ${fmtN(s.co2)} ppm with everyone inside (outdoor air is about 420). The design keeps it at or below 1,400 ppm.`),
      heat && s.stove ? item(s.coUnflued <= s.coLimit ? 'caution' : 'warn', t('s_co'), `If the heat came from a kerosene heater with no chimney, carbon monoxide would settle near ${s.coUnflued.toFixed(1)} mg/m³ (WHO 24-hour guideline: ${s.coLimit}). Use a bukhari with a sealed flue. Assumes ${TB.safety.EF_CO} mg CO per MJ of fuel.`) : '',
      item(s.surface.mould ? 'danger' : 'ok', t('s_mould'), `Coldest hour: the inside of the outer wall stays at ${fmtT(s.surface.tsi)}, with ${Math.round(s.surface.rhs)} % humidity at its surface (mould starts at 80 %). Ordinary build: ${fmtT(s.surfaceBase.tsi)} and ${Math.round(s.surfaceBase.rhs)} %${s.surfaceBase.mould ? ', which risks mould.' : '.'}`),
      heat ? item(s.cold.level, t('s_cold'), `In a cold snap with no heater the coldest room-average reaches ${fmtT(A.dawnSnap)} (ordinary build ${fmtT(A.baseDawnSnap)}). ${s.cold.text}`) : '',
    ].join('');
  }

  // --- calendar
  function drawCalendar(A) {
    const box = $('cal-grid'); if (!box || !A.calendar) return;
    const g = S.calView === 'base' ? A.calendar.base : A.calendar.design;
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    box.innerHTML = `<div class="cal-hours"><span></span>${[0, 6, 12, 18].map((h) => `<span style="grid-column:${h + 2}">${h === 0 ? '12 am' : h === 12 ? '12 pm' : h < 12 ? `${h} am` : `${h - 12} pm`}</span>`).join('')}</div>` +
      g.map((row, m) => `<div class="cal-row"><span class="cal-m">${MON[m]}</span>${row.map((v, h) => `<i style="background:${tempColor(v)}" title="${MON[m]} ${h}:00, ${fmtT(v)}"></i>`).join('')}</div>`).join('');
    const inBand = (grid) => { let n = 0; grid.forEach((r) => r.forEach((v) => { if (v >= 18 && v <= 27) n++; })); return Math.round((n / 288) * 100); };
    $('cal-stat').textContent = `Comfortable (18–27 °C) without heating or cooling: ${inBand(A.calendar.design)} % of hours in yours, ${inBand(A.calendar.base)} % in the ordinary build.`;
    document.querySelectorAll('#cal-toggle .seg').forEach((b) => b.classList.toggle('active', b.dataset.v === S.calView));
  }

  // --- fuel and impact
  function drawFuel(A) {
    const box = $('fuel-body'); if (!box) return;
    const heat = A.mode === 'heating';
    const T = TB.design.TYPES[A.ctx.type];
    $('fuel-title').textContent = t(heat ? 'fuel_title_heat' : 'fuel_title_cool');
    const hText = A.season.design.heatingText || '';
    $('fuel-sub').textContent = t(heat ? 'fuel_sub_heat' : 'fuel_sub_cool', { heat: hText, price: A.ctx.price || 85 }).replace(/Bedrooms stay unheated, as in most Ladakhi homes\.|ज़्यादातर.*$/, A.ctx.type === 'home' ? '$&' : '');
    let yours, base, unit, savedPerHome, rsPerHome, co2PerHome;
    if (heat) { yours = A.fuel.design; base = A.fuel.base; unit = 'litres of kerosene'; savedPerHome = base.litres - yours.litres; rsPerHome = base.rupees - yours.rupees; co2PerHome = (base.co2kg - yours.co2kg) / 1000; }
    else { yours = { litres: A.power.design, rupees: A.power.rupeesDesign }; base = { litres: A.power.base, rupees: A.power.rupeesBase }; unit = 'kWh of electricity'; savedPerHome = base.litres - yours.litres; rsPerHome = base.rupees - yours.rupees; co2PerHome = (savedPerHome * 0.71) / 1000; }
    box.innerHTML = `<div class="fuel-cmp">
      <div class="fuel-c fuel-yours"><span>${t('yours')}</span><strong>${fmtN(yours.litres)}</strong><small>${unit} · ${rupees(yours.rupees)}</small></div>
      <div class="fuel-c fuel-base"><span>${t('ordinary')}</span><strong>${fmtN(base.litres)}</strong><small>${unit} · ${rupees(base.rupees)}</small></div>
    </div>
    <div class="village">
      <label for="village-n" class="field-row"><span class="field-label" id="village-label">${t('village', { n: S.villageN, place: A.site.name.split(',')[0] })}</span><output class="field-value" id="village-out">${S.villageN} homes</output></label>
      <input type="range" class="range" id="village-n" min="1" max="500" value="${S.villageN}">
      <dl class="village-stats">
        <div><dt>${heat ? 'Kerosene' : 'Electricity'}</dt><dd id="vil-l">${fmtN(savedPerHome * S.villageN)}</dd><small>${heat ? 'litres' : 'kWh'}</small></div>
        <div><dt>Money</dt><dd id="vil-r">${rupees(rsPerHome * S.villageN)}</dd><small>${t('village_note')}</small></div>
        <div><dt>Carbon dioxide</dt><dd id="vil-c">${fmtN(co2PerHome * S.villageN, 1)}</dd><small>tonnes</small></div>
      </dl>
    </div>`;
    $('village-n').addEventListener('input', (e) => {
      S.villageN = +e.target.value;
      $('village-out').textContent = `${S.villageN} homes`; $('village-label').textContent = t('village', { n: S.villageN, place: A.site.name.split(',')[0] });
      $('vil-l').textContent = fmtN(savedPerHome * S.villageN); $('vil-r').textContent = rupees(rsPerHome * S.villageN); $('vil-c').textContent = fmtN(co2PerHome * S.villageN, 1);
    });
  }

  // --- bill of materials
  function drawBom(A) {
    const box = $('bom-body'); if (!box) return;
    const q = A.bom, qb = A.bomBase, heat = A.mode === 'heating';
    const extra = q.total - qb.total;
    const yearly = heat ? A.fuel.base.rupees - A.fuel.design.rupees : A.power.rupeesBase - A.power.rupeesDesign;
    const payback = extra > 0 && yearly > 0 ? extra / yearly : 0;
    const perDeg = heat && A.dawn > A.baseDawn ? extra / (A.dawn - A.baseDawn) : null;
    const counts = Object.entries(q.counts).map(([k, v]) => ({ bricks: `${fmtN(v)} mud bricks (400 × 200 × 150 mm)`, earthM3: `${v} m³ of rammed earth`, stoneM3: `${v} m³ of stone`, insulationM3: `${v} m³ of insulation board` }[k])).filter(Boolean);
    box.innerHTML = `<div class="table-scroll"><table class="spec-table bom-table"><thead><tr><th>${t('bom_part')}</th><th>${t('bom_what')}</th><th class="num">${t('bom_qty')}</th><th class="num">${t('bom_rate')}</th><th class="num">${t('bom_cost')}</th></tr></thead><tbody>
      ${q.lines.map((l) => `<tr><th scope="row">${esc(l.part)}</th><td>${esc(l.what)}</td><td class="num">${l.qty.toFixed(1)} ${l.unit}</td><td class="num">₹${fmtN(Math.round(l.rate))}</td><td class="num"><strong>${rupees(l.cost)}</strong></td></tr>`).join('')}
      </tbody><tfoot><tr><th colspan="4">${t('bom_total')}</th><td class="num"><strong>${rupees(q.total)}</strong></td></tr></tfoot></table></div>
      <dl class="bom-stats">
        <div><dt>${t('bom_extra')}</dt><dd>${extra >= 0 ? rupees(extra) : `${rupees(-extra)} less`}</dd></div>
        <div><dt>${t('bom_payback')}</dt><dd>${extra <= 0 ? 'Costs less from day one' : payback && payback < 1 ? 'Within the first winter' : payback ? `${payback.toFixed(1)} ${heat ? t('winters') : t('years')}` : '—'}</dd></div>
        ${perDeg ? `<div><dt>Cost per °C warmer at dawn</dt><dd>${rupees(perDeg)}</dd></div>` : ''}
        <div><dt>${t('bom_carbon')}</dt><dd>${fmtN(q.carbon / 1000, 1)} t CO₂e <small>vs ${fmtN(qb.carbon / 1000, 1)}</small></dd></div>
      </dl>
      ${counts.length ? `<p class="best-note">For the site: ${counts.join(', ')}.</p>` : ''}`;
  }

  // --- mason cards
  const SKETCH = {
    found: '<path d="M10 70h100M20 70v-18h80v18M30 52v-12h60v12" /><path class="ins" d="M30 40h60v-6H30z"/><path d="M14 82h92" stroke-dasharray="3 4"/>',
    walls: '<path d="M30 20v70M52 20v70" /><path class="ins" d="M22 20h8v70h-8z"/><path class="mass" d="M30 20h22v70H30z"/><text x="80" y="40">IN</text><text x="2" y="40">OUT</text>',
    trombe: '<path class="mass" d="M60 20h18v70H60z"/><path d="M44 20v70" stroke-dasharray="6 3"/><circle cx="18" cy="24" r="8" class="sun"/><path d="M26 30l24 18M26 40l24 18" class="ray"/><path d="M84 60q10 -6 20 0" class="warm"/>',
    glass: '<path d="M20 20h70v70H20z"/><path d="M55 20v70"/><path class="ins" d="M90 20h8v70h-8z"/><circle cx="104" cy="14" r="6" class="moon"/>',
    roof: '<path class="mass" d="M10 30h100v12H10z"/><path class="ins" d="M10 42h100v10H10z"/><path d="M10 52h100v4H10z"/><path d="M10 62h100" stroke-dasharray="10 6"/>',
    airtight: '<path d="M20 20h70v70H20z"/><path d="M34 34h42v56H34z"/><path class="seal" d="M34 34h42M34 34v56M76 34v56"/>',
    vent: '<path d="M20 20h80v70H20z"/><path d="M30 28h20v10H30z"/><path d="M36 33h-22" class="ray"/><path d="M78 58v32h14V58z"/><path d="M85 58V20" />',
    stove: '<path d="M40 60h40v28H40z"/><path d="M56 60V16h8v44"/><path d="M60 16v-8" class="warm"/><circle cx="96" cy="30" r="7"/><text x="92" y="33" font-size="8">CO</text>',
    shade: '<path d="M20 30h70v60H20z"/><path d="M14 30h82" stroke-width="5"/><circle cx="104" cy="12" r="7" class="sun"/><path d="M98 18l-20 22" class="ray"/>',
    fans: '<circle cx="60" cy="50" r="6"/><path d="M60 50l-30 -6M60 50l30 6M60 50l-6 28M60 50l6 -28"/>',
  };
  function drawBuild(A) {
    const box = $('build-cards'); if (!box) return;
    const heat = A.mode === 'heating', v = A.v, M = TB.materials, lang = window.TBi18n.lang;
    const set = window.TBi18n.BUILD[heat ? 'heating' : 'cooling'].filter((c) => (c.k !== 'trombe' || v.trombe));
    const V = A.design.sp.area * 2.7, q = A.safety.achDesign * V, ventCm2 = Math.round(((q / 3600) / (0.6 * Math.sqrt((2 * 2) / 0.9))) * 1e4);
    const vars = {
      floorIns: /_ins/.test(v.floor) ? '50 mm EPS' : 'no', wall: M.WALLS[v.wall].label.toLowerCase() + (v.wall === 'mud_brick' || v.wall === 'rammed_earth' || v.wall === 'stone' ? ', 450 mm thick' : ''),
      ins: v.ins ? `${Math.round(v.ins * 1000)} mm EPS boards` : 'no insulation', trombeA: A.bom.trombeA.toFixed(1), glass: M.GLAZING[v.glazing === 'single' ? 'double' : v.glazing].label.toLowerCase(),
      win: A.bom.win.toFixed(1), roofIns: /_ins/.test(v.roof) ? '100 mm EPS boards' : '150 mm of dry straw-clay', ach: (v.ach || A.safety.achDesign).toFixed(1), q: fmtN(q), ventCm2: fmtN(ventCm2), roof: A.design.sp.roof.label.toLowerCase(),
    };
    const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
    box.innerHTML = set.map((c, i) => { const [title, body] = c[lang] || c.en; return `<article class="mason"><div class="mason-n">${i + 1}</div><svg viewBox="0 0 120 100" class="mason-svg" aria-hidden="true">${SKETCH[c.k] || ''}</svg><h5>${esc(title)}</h5><p>${esc(fill(body))}</p></article>`; }).join('');
  }

  function drawMethod(A) {
    const box = $('method-body'); if (!box) return;
    const tests = window.TB_TESTS, par = window.TB_PARITY;
    box.innerHTML = `<p>Hour-by-hour heat balance for every room (the ISO 13790 / ISO 52016 five-resistance, one-capacitance network, one per room, linked through internal walls), in 15-minute steps after a week of warm-up. Sun position, sun on each wall, night-sky cooling (Swinbank) and thinner air at ${fmtN(A.site.elev_m)} m are included. Climate: NASA POWER 2001–2020, corrected to the site's elevation. The likely range comes from ${A.uncertainty ? A.uncertainty.typ.runs : 0} runs with material, airtightness, weather and sunshine varied.</p>
      <ul class="method-proof">
        ${tests ? `<li><b>${tests.passed}/${tests.total}</b> physics checks passing (energy balance, hand calculations, time constants, ISO 7730 comfort cases)</li>` : ''}
        ${par ? `<li>Matches the ISO 13790 Annex C reference procedure within <b>${par.worst.toFixed(2)} °C</b>, hour by hour, in ${par.cases} test cases</li>` : ''}
        <li>Runs entirely in your browser; no server and no cloud</li>
      </ul>
      <a class="text-link" href="methodology.html">Read the full method, equations and limits</a>`;
  }

  // ======================================================================
  // Livestock report (flow 4)
  // ======================================================================
  function renderAnimal() {
    const panel = $('animal-flow-step-5'); if (!panel || panel.style.display === 'none') return;
    const c = ctx();
    const key = `${c.site}|${ThermaState.animalSpecies}|${ThermaState.animalHerdCount}|${ThermaState.animalRoof}`;
    if (S.animalKey !== key) { S.animal = TB.analyse.livestock({ site: c.site, species: ThermaState.animalSpecies, herd: ThermaState.animalHerdCount, roof: $('animal-roof-material')?.value }); S.animalKey = key; }
    const A = S.animal, sp = A.species, place = placeName();
    const tile = (id, label, value) => { const el = $(id); if (!el) return; el.textContent = value; const s = el.parentElement.querySelector('span'); if (s) s.textContent = label; };
    const tiles = panel.querySelectorAll('.figure-tile');
    const kicker = panel.querySelector('.report-kicker'), sub = panel.querySelector('.report-sub');
    const coldCard = $('animal-cold-card'), thiScale = panel.querySelector('.thi-scale');
    if (A.mode === 'heating') {
      const cd = A.cold;
      kicker.textContent = `${sp.label} shelter · ${place} · ${A.monthName}`;
      const dy = cd.baseYoung.hours - cd.designYoung.hours;
      $('a5-title').textContent = cd.designYoung.hours < 0.5 && cd.baseYoung.hours > 12 ? `Newborn ${sp.young} stay warm enough right through a cold snap.`
        : dy > 0.5 ? `Newborn ${sp.young} spend ${fmtN(dy, 0)} fewer hours a day in the cold.` : `Your ${sp.label.toLowerCase()} stay above ${fmtT(cd.minDesign)} through a cold snap.`;
      sub.textContent = `Computed for a three-day cold snap in ${A.monthName} with the herd's own body heat (${Math.round(A.heatPerHead)} W a head) warming the shelter. Adults are comfortable above about ${fmtT(sp.lct, 0)}, newborn ${sp.young} above about ${fmtT(sp.lctYoung, 0)} (approximate lower critical temperatures, NRC 1981).`;
      tile('animal-thi-baseline', 'Open stone pen, coldest hour', fmtT(cd.minBase));
      tile('animal-thi-optimized', 'Your shelter, coldest hour', fmtT(cd.minDesign));
      tile('animal-ach', 'Fresh air for the herd', `${A.ach.toFixed(1)} ACH`);
      const t4 = tiles[3]; if (t4) { t4.querySelector('span').textContent = `Hours a day too cold for ${sp.young}`; t4.querySelector('strong').textContent = `${fmtN(cd.designYoung.hours, 1)} h vs ${fmtN(cd.baseYoung.hours, 1)} h`; }
      if (thiScale) thiScale.hidden = true;
      if (coldCard) {
        coldCard.hidden = false;
        const s = A.design.snap.series, b = A.base.snap.series, n = s.hour.length, tt = Array.from(s.hour, (h, i) => (i * 72) / (n - 1));
        lineChart($('animal-chart'), { t: tt, nights: nightsFor(TB.climate.weather({ site: c.site, month: A.ctx.month, days: 1, dt: 3600 })), comfort: [sp.lctYoung, sp.lctYoung + 12], comfortLabel: `Warm enough for ${sp.young} (above ${fmtT(sp.lctYoung, 0)})`,
          lines: [{ y: s.te, cls: 's-out', name: 'Outdoors' }, { y: b.wholeAir, cls: 's-base', name: 'Open stone pen' }, { y: s.wholeAir, cls: 's-opt', name: 'Your shelter' }] });
        $('animal-feed').textContent = `Extra maintenance feed in the cold, about 1 % per °C below the adult comfort limit (NRC 1981 rule of thumb): ${fmtN(cd.feedDesign, 1)} % in your shelter vs ${fmtN(cd.feedBase, 1)} % in an open stone pen, during the cold snap.`;
      }
    } else {
      const th = A.thi;
      kicker.textContent = `${sp.label} shelter · ${place} · ${A.monthName}`;
      $('a5-title').textContent = `Heat stress drops from ${TB.safety.thiLabel(th.base)} to ${TB.safety.thiLabel(th.design)}.`;
      sub.textContent = `Temperature-humidity index at the hottest hour, using the shaded operative temperature under each roof. Below 72 is comfortable for most livestock; outdoors in the open it peaks at ${th.outdoor.toFixed(1)}.`;
      tile('animal-thi-baseline', 'Bare tin shed (THI)', `${th.base.toFixed(1)} (${TB.safety.thiLabel(th.base)})`);
      tile('animal-thi-optimized', 'Your shelter (THI)', `${th.design.toFixed(1)} (${TB.safety.thiLabel(th.design)})`);
      tile('animal-ach', 'Fresh-air changes', `${A.ach.toFixed(0)} ACH`);
      const t4 = tiles[3]; if (t4) { t4.querySelector('span').textContent = 'THI lower than a tin shed'; t4.querySelector('strong').textContent = `−${(th.base - th.design).toFixed(1)}`; }
      if (thiScale) {
        thiScale.hidden = false;
        const pos = (v) => `${Math.max(2, Math.min(98, ((v - 60) / 35) * 100))}%`;
        panel.querySelector('.thi-marker-base').style.left = pos(th.base); panel.querySelector('.thi-marker-opt').style.left = pos(th.design);
      }
      if (coldCard) coldCard.hidden = true;
    }
    const rU = $('rep-animal-roof-u'); if (rU) rU.textContent = `${A.design.sp.roof.U.toFixed(2)} W/m²K`;
    const body = $('animal-materials-report-body');
    if (body && A.mode === 'heating') {
      const V = A.area * 3, q = A.ach * V;
      body.innerHTML = [
        ['Roof', 'Poplar and mud, 100 mm insulation', `${Math.round(A.design.sp.roof.thick * 1000)} mm`, `${A.design.sp.roof.U.toFixed(2)} W/m²K`, 'Holds the herd\u2019s body heat in overnight'],
        ['Walls', 'Mud brick, 50 mm insulation outside', `${Math.round(A.design.sp.wall.thick * 1000)} mm`, `${A.design.sp.wall.U.toFixed(2)} W/m²K`, 'Closed on the north, east and west against the wind'],
        ['South glazing', 'Twin-wall polycarbonate, 35 % of the south wall', '10 mm', `U ${TB.materials.GLAZING.polycarb.U.toFixed(1)}, g ${TB.materials.GLAZING.polycarb.g.toFixed(2)}`, 'Winter sun warms the floor and bedding by day'],
        ['Floor', 'Earth floor with deep straw bedding', '100 mm straw', `Ground U ${A.design.typ.model.Ug.toFixed(2)} W/m²K`, `Keeps ${sp.young} off frozen ground`],
        ['Ridge vent', `Adjustable, sized for ${fmtN(q)} m³/h`, `${Math.round(A.ach * 10) / 10} ACH`, `${fmtN((q / 3600 / 0.8) * 1e4)} cm² open`, 'Clears moisture and ammonia without draughts'],
      ].map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td><td><strong>${r[3]}</strong></td><td>${r[4]}</td></tr>`).join('');
    }
  }
  S.renderAnimal = renderAnimal;

  // ======================================================================
  // Retrofit (flow 3): payback from the engine
  // ======================================================================
  function retrofitNumbers() {
    const c = ctx(); const { base, up, parts } = retrofitVs(c.mode);
    const cc = Object.assign({}, c, { type: 'home' });
    const eBase = TB.analyse.seasonEnergy(base, cc).kWh, eUp = TB.analyse.seasonEnergy(up, cc).kWh;
    const toRs = (kWh) => (c.mode === 'heating' ? TB.safety.fuel(kWh, 85).rupees : (kWh / 3) * 8);
    const toCO2 = (kWh) => (c.mode === 'heating' ? TB.safety.fuel(kWh).co2kg : (kWh / 3) * 0.71);
    const sp = TB.analyse.specFor(base, cc, true), q = TB.design.quantities(sp, base);
    const M = TB.materials.M;
    const cost = (up.ins - base.ins) * 10 * M.eps.cost * q.wallA + 400 * q.wallA * (up.ins > base.ins ? 1 : 0)
      + (TB.materials.roof(up.roof).cost - TB.materials.roof(base.roof).cost * 0.5) * q.roofA
      + TB.materials.GLAZING[up.glazing].cost * q.win + 150 * sp.area;
    const saved = toRs(eBase) - toRs(eUp);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('f3-cost-val', rupees(cost));
    set('f3-savings-val', `${rupees(saved)} / year`);
    set('f3-payback-val', saved > 0 ? `${(cost / saved).toFixed(1)} years` : '—');
    set('f3-co2-val', `${((toCO2(eBase) - toCO2(eUp)) / 1000).toFixed(1)} t CO₂ / year`);
    // what each upgrade alone is worth
    const each = Object.entries(parts).map(([k, ch]) => { const e = TB.analyse.seasonEnergy(Object.assign({}, base, ch), cc).kWh; return [k, toRs(eBase) - toRs(e)]; });
    const lbl = { wall: 'wall', roof: 'roof', glazing: 'glaze' };
    each.forEach(([k, rs]) => { const el = $(`f3-matrix-${lbl[k]}-diff`); if (el) el.textContent = `Saves ${rupees(rs)} a year on its own`; });
    if (c.mode === 'heating') {
      set('f3-matrix-roof-upgrade', TB.materials.roof(up.roof).label);
      set('f3-matrix-roof-sol', 'Insulation over the slab stops the warm room losing heat to the cold night sky.');
      set('f3-matrix-shade-upgrade', 'Keep south windows open to the winter sun');
      set('f3-matrix-shade-sol', 'In a cold climate, shading the south glass in winter throws away free heat. Use a removable summer awning instead.');
    }
    const note = $('f3-note'); if (note) note.textContent = `Computed by the heat-balance engine over a full ${c.mode === 'heating' ? 'heating' : 'cooling'} season for ${placeName()}, for a ${Math.round(sp.area)} m² home. ${c.mode === 'heating' ? 'Heating with kerosene at ₹85 a litre in a 55 % efficient stove.' : 'Cooling with air conditioning at COP 3 and ₹8 a unit.'} Rates are indicative.`;
  }
  S.retrofitNumbers = retrofitNumbers;

  // ======================================================================
  // Exports
  // ======================================================================
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
  function exportCSV() {
    const A = S.analysis; if (!A) return;
    const s = A.design.typ.series, b = A.base.typ.series, sn = A.design.snap.series, bn = A.base.snap.series;
    const rows = [['ThermaBuild report', A.site.name, A.typeLabel, new Date().toISOString()], ['Mode', A.mode, 'Design month', A.monthName], [],
      ['Hour', 'Outdoor (°C)', 'Ordinary build (°C)', 'Your design (°C)', ...A.zones.map((z) => `${z.name} (°C)`), 'Cold snap outdoor', 'Cold snap ordinary', 'Cold snap yours']];
    for (let i = 0; i < s.hour.length; i += 4) rows.push([s.hour[i].toFixed(2), s.te[i].toFixed(2), b.wholeOp[i].toFixed(2), s.wholeOp[i].toFixed(2), ...A.zones.map((_, z) => s.op[z][i].toFixed(2)), sn.te[i].toFixed(2), bn.wholeOp[i].toFixed(2), sn.wholeOp[i].toFixed(2)]);
    rows.push([], ['Bill of materials'], ['Part', 'What', 'Quantity', 'Unit', 'Rate ₹', 'Cost ₹']);
    A.bom.lines.forEach((l) => rows.push([l.part, `"${l.what}"`, l.qty.toFixed(2), l.unit, Math.round(l.rate), Math.round(l.cost)]));
    download(`ThermaBuild_${A.site.name.split(',')[0]}_report.csv`, rows.map((r) => r.join(',')).join('\n'), 'text/csv');
  }
  function exportJSON() {
    const A = S.analysis; if (!A) return;
    const out = { generated: new Date().toISOString(), site: A.site, type: A.typeLabel, mode: A.mode, month: A.monthName, design: A.v, baseline: A.baseV,
      dawn: { yours: A.dawn, ordinary: A.baseDawn, coldSnapYours: A.dawnSnap, coldSnapOrdinary: A.baseDawnSnap, likely: A.uncertainty && A.uncertainty.typ.dawn },
      peak: { yours: A.peak, ordinary: A.basePeak }, season: A.season, fuel: A.fuel, power: A.power, safety: A.safety, pmv: A.pmv, why: A.why, bom: A.bom,
      rooms: A.zones.map(({ _pts, ...z }) => z), flowsPerDay: A.flowsPerDay, engine: { tests: window.TB_TESTS && `${window.TB_TESTS.passed}/${window.TB_TESTS.total}`, isoParityK: window.TB_PARITY && window.TB_PARITY.worst } };
    download(`ThermaBuild_${A.site.name.split(',')[0]}_report.json`, JSON.stringify(out, null, 2), 'application/json');
  }
  function exportAnimalCSV() {
    const A = S.animal; if (!A) return;
    const d = A.design.snap.series, b = A.base.snap.series;
    const rows = [['ThermaBuild livestock shelter report', A.species.label, `${A.ctx.herd} head`, TB.climate.site(A.ctx.site).name, new Date().toISOString()], ['Mode', A.mode, 'Month', A.monthName], []];
    if (A.mode === 'heating') rows.push(['Coldest hour, your shelter (°C)', A.cold.minDesign.toFixed(2)], ['Coldest hour, open stone pen (°C)', A.cold.minBase.toFixed(2)], [`Hours a day below the newborn limit (${A.species.lctYoung} °C), yours`, A.cold.designYoung.hours.toFixed(1)], ['Same, open pen', A.cold.baseYoung.hours.toFixed(1)]);
    else rows.push(['Peak THI, your shelter', A.thi.design.toFixed(1)], ['Peak THI, bare tin shed', A.thi.base.toFixed(1)], ['Peak THI, outdoors', A.thi.outdoor.toFixed(1)]);
    rows.push(['Air changes per hour', A.ach.toFixed(2)], [], ['Hour', 'Outdoor (°C)', 'Your shelter air (°C)', 'Baseline air (°C)']);
    for (let i = 0; i < d.hour.length; i += 4) rows.push([d.hour[i].toFixed(2), d.te[i].toFixed(2), d.wholeAir[i].toFixed(2), b.wholeAir[i].toFixed(2)]);
    download(`ThermaBuild_${A.species.label.replace(/\s+/g, '_')}_shelter.csv`, rows.map((r) => r.join(',')).join('\n'), 'text/csv');
  }
  S.exportCSV = exportCSV; S.exportJSON = exportJSON; S.exportAnimalCSV = exportAnimalCSV;

  // ======================================================================
  // Page wiring
  // ======================================================================
  window.setBuildingType = function (type) {
    S.type = type;
    const T = TB.design.TYPES[type];
    $('btype-badge').textContent = T.label;
    const hint = { home: 'Family home: occupied mostly evenings and nights.', school: 'School: full in the day, empty at night; about one pupil per 2.5 m².', shelter: 'Relief shelter: crowded day and night, about one person per 4 m²; needs fast, cheap build.', post: 'High-altitude post: occupied round the clock, a stove always lit.' }[type];
    $('btype-hint').textContent = `${hint} About ${Math.max(1, Math.round((areaM2() / 10) * T.per10m2))} people.`;
    S.analysisKey = null; siteChanged();
  };

  function wire() {
    if (!window.TB || !TB.climate || !TB.thermal || !TB.analyse || !window.TB_CLIMATE) { console.warn('ThermaBuild engine did not load; the studio falls back to its static content.'); return; }
    // chart tabs
    document.querySelectorAll('#chart-tabs .seg').forEach((b) => b.addEventListener('click', () => { S.view = b.dataset.v; document.querySelectorAll('#chart-tabs .seg').forEach((x) => x.classList.toggle('active', x === b)); if (S.analysis) { drawMainChart(S.analysis); S.hour = null; drawRooms(S.analysis); } }));
    document.querySelectorAll('#cal-toggle .seg').forEach((b) => b.addEventListener('click', () => { S.calView = b.dataset.v; if (S.analysis) drawCalendar(S.analysis); }));
    const sl = $('rooms-slider'); if (sl) sl.addEventListener('input', () => { S.hour = +sl.value; if (S.analysis) drawRooms(S.analysis); });
    let playT = 0;
    const play = $('rooms-play'); if (play) play.addEventListener('click', () => {
      if (playT) { clearInterval(playT); playT = 0; play.textContent = 'Play the nights'; return; }
      play.textContent = 'Pause';
      playT = setInterval(() => { if (!S.analysis) return; const n = S.analysis.design.typ.series.hour.length; S.hour = (S.hour + 2) % n; drawRooms(S.analysis); }, 60);
    });
    document.querySelectorAll('.lang-toggle .seg').forEach((b) => b.addEventListener('click', () => { window.TBi18n.setLang(b.dataset.lang); if (S.analysis) drawHouse(S.analysis); }));
    $('print-cards')?.addEventListener('click', () => { document.body.classList.add('print-cards'); window.print(); setTimeout(() => document.body.classList.remove('print-cards'), 500); });

    // hook the existing flows
    const _goToStep = window.goToStep;
    window.goToStep = function (n) {
      _goToStep(n);
      if (ThermaState.currentStep !== n) return;
      renderPill(S.searches[searchKey(ctx())], ctx());
      if (ThermaState.activeFlow === 1 && n === 3) { const c = ctx(); if (c.mode === 'heating') search(c).then((r) => { renderSearchPanel(r, c); renderMaterialCards(); }); else { renderSearchPanel(null, c); } }
      if (ThermaState.activeFlow === 4 && n === 5) renderAnimal();
      if (ThermaState.activeFlow === 3 && n === 3) retrofitNumbers();
    };
    const _onLoc = window.onLocationPresetChange;
    window.onLocationPresetChange = function (val) { ThermaState.useCustom = false; _onLoc(val); siteChanged(); };
    const _upd = window.updateLocationCoords;
    window.updateLocationCoords = function (lat, lon) { _upd(lat, lon); loadClimateFor(ThermaState.lat, ThermaState.lon); };
    ['onAreaInput', 'setBHK', 'onPlotInput'].forEach((fn) => { const f = window[fn]; if (f) window[fn] = function () { const r = f.apply(this, arguments); siteChanged(); return r; }; });
    const _sel = window.selectArchitecturalPlan; window.selectArchitecturalPlan = function (i) { _sel(i); if (ThermaState.activeFlow !== 1) siteChanged(); };
    const _retro = window.updateRetrofitCalculation; window.updateRetrofitCalculation = function () { _retro(); if (ThermaState.activeFlow === 3 && ThermaState.currentStep >= 2) retrofitNumbers(); };
    const _switch = window.switchMainFlow; window.switchMainFlow = function (n) { _switch(n); siteChanged(); };
    // livestock species incl. yak
    const _species = window.selectAnimalType;
    window.selectAnimalType = function (sp) {
      if (sp === 'yak') { _species('cattle'); ThermaState.animalSpecies = 'yak'; const s = $('animal-herd-slider'); if (s) { s.min = 5; s.max = 120; s.value = 25; } updateAnimalHerdCapacity(25); }
      else _species(sp);
      document.querySelectorAll('#species-segmented .seg').forEach((b) => b.classList.toggle('active', b.id === `species-btn-${sp}`));
      const per = TB.safety.SPECIES[ThermaState.animalSpecies].floor, n = ThermaState.animalHerdCount;
      if (sp === 'yak') { $('animal-covered-area').textContent = `${(n * per).toFixed(1)} m²`; $('animal-shelter-dim').textContent = `${((n * per) / 6).toFixed(1)} m × 6.0 m`; }
    };
    window.addEventListener('resize', () => { if (S.analysis && $('flow-step-5').style.display !== 'none') { drawMainChart(S.analysis); drawRooms(S.analysis); } });
    paintClimateCard();
    siteChanged();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
