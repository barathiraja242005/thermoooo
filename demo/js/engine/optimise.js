/**
 * ThermaBuild engine: design search, uncertainty and the full analysis used by the report.
 *
 * Search: every combination of wall system and insulation, roof, glazing, south window share,
 * Trombe wall, airtightness, plan proportion and night shutters (~20,000 designs) is simulated
 * free-running over the coldest month's design day. Orientation is then refined on the best
 * designs. Designs that would grow mould on the inside of the walls are rejected. Designs too
 * airtight for a stove or for the number of people get a sized fresh-air vent instead of being
 * allowed through below the limit. The survivors form a Pareto front on dawn temperature, cost
 * and embodied carbon.
 */
(function (g) {
  'use strict';
  const TB = (g.TB = g.TB || {});

  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(rnd) { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const quantile = (arr, q) => { const s = Array.from(arr).sort((a, b) => a - b); const p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return s[lo] + (s[hi] - s[lo]) * (p - lo); };

  const GRID = {
    wallIns: [['rammed_earth', 0], ['rammed_earth', 0.05], ['rammed_earth', 0.1], ['rammed_earth', 0.15],
              ['mud_brick', 0], ['mud_brick', 0.05], ['mud_brick', 0.1], ['mud_brick', 0.15],
              ['stone', 0], ['stone', 0.05], ['stone', 0.1], ['stone', 0.15],
              ['cseb', 0], ['cseb', 0.05], ['cseb', 0.1], ['cseb', 0.15],
              ['conc_block', 0], ['conc_block', 0.05], ['conc_block', 0.1], ['conc_block', 0.15],
              ['straw_bale', 0]],
    roof: ['mud_poplar', 'mud_poplar_ins', 'rcc_ins'],
    glazing: ['double', 'double_lowe', 'triple'],
    wwrS: [0.15, 0.3, 0.45],
    trombe: [false, true],
    airtight: [0.3, 0.6, 1.0],
    aspect: [1.0, 1.6, 2.2],
    shutters: [false, true],
  };
  const gridSize = () => GRID.wallIns.length * GRID.roof.length * GRID.glazing.length * GRID.wwrS.length * GRID.trombe.length * GRID.airtight.length * GRID.aspect.length * GRID.shutters.length;

  /** Air changes needed: stove minimum and CO2 ≤ 1,400 ppm for the occupants. */
  function requiredACH(type, occupants, volume) {
    const T = TB.design.TYPES[type];
    const co2 = (occupants * 0.0052e-3 * 3600 * 1e6) / ((1400 - 420) * volume);
    return Math.max(T.stove ? TB.safety.MIN_ACH_COMBUSTION : 0, co2);
  }

  function ctxDefaults(ctx) {
    const s = TB.climate.season(ctx.site);
    return Object.assign({ type: 'home', area: 100, month: s.month, mode: s.mode, height: 2.7, price: 85 }, ctx);
  }

  /** Evaluate one design, single zone, free-running. Returns null if rejected (with reason). */
  function evaluate(v, ctx, wx, noReject) {
    const sp = TB.design.spec(v, { area: ctx.area, type: ctx.type, single: true, occupants: ctx.occupants });
    const V = sp.area * 2.7;
    const need = requiredACH(ctx.type, sp.occupants, V);
    const vented = v.airtight < need;
    sp.ach = Math.max(v.airtight, need);
    const T = TB.design.TYPES[ctx.type];
    // mould check on the external wall at the setpoint and the coldest hour
    const te = Math.min(...wx.T.slice(-wx.stepsPerDay));
    const sc = TB.safety.surfaceCheck(sp.wall.U, T.setpoint || 12, te, ctx.rh, T.humidityClass, TB.safety.moisture(sp.occupants, ctx.type), sp.ach * V);
    if (sc.mould && !noReject) return { rejected: 'mould', v, sc };
    const r = TB.thermal.simulate(sp, wx, { reportDays: 1, record: false });
    const q = TB.design.quantities(sp, v);
    return { v: Object.assign({}, v, { ach: sp.ach }), dawn: r.minOp, peak: r.maxOp, cost: q.total, carbon: q.carbon, vented, sc, mould: sc.mould };
  }

  function pareto(list) {
    // maximise dawn, minimise cost and carbon
    const s = list.slice().sort((a, b) => a.cost - b.cost);
    const front = [];
    for (const d of s) {
      if (!front.some((f) => f.dawn >= d.dawn && f.cost <= d.cost && f.carbon <= d.carbon && (f.dawn > d.dawn || f.cost < d.cost || f.carbon < d.carbon))) front.push(d);
    }
    return front.filter((d) => !front.some((f) => f !== d && f.dawn >= d.dawn && f.cost <= d.cost && f.carbon <= d.carbon && (f.dawn > d.dawn || f.cost < d.cost || f.carbon < d.carbon)));
  }

  /**
   * Run the search. Calls onProgress(done, total) now and then. Returns a summary.
   * Synchronous; the page runs it inside a Web Worker.
   */
  function search(ctxIn, onProgress) {
    const ctx = ctxDefaults(ctxIn);
    ctx.rh = TB.climate.site(ctx.site).rh[ctx.month];
    const t0 = Date.now();
    const wxBy = {};
    const wxFor = (orient) => (wxBy[orient] = wxBy[orient] || TB.climate.weather({ site: ctx.site, month: ctx.month, days: 5, dt: 3600, orientation: orient }));
    const wx0 = wxFor(0);
    const total = gridSize();
    const ok = []; let mould = 0, vented = 0, done = 0;
    const baseV = Object.assign({}, TB.design.BASELINE[ctx.type], { airtight: TB.design.BASELINE[ctx.type].ach });
    for (const [wall, ins] of GRID.wallIns) for (const roof of GRID.roof) for (const glazing of GRID.glazing) for (const wwrS of GRID.wwrS)
      for (const trombe of GRID.trombe) for (const airtight of GRID.airtight) for (const aspect of GRID.aspect) for (const shutters of GRID.shutters) {
        const v = { wall, ins, roof, floor: 'earth_ins', glazing, wwrS, trombe, airtight, aspect, shutters, orientation: 0 };
        const r = evaluate(v, ctx, wx0);
        if (r.rejected) mould++; else { ok.push(r); if (r.vented) vented++; }
        if (++done % 1000 === 0 && onProgress) onProgress(done, total);
      }
    // orientation refinement on the best 60 by dawn temperature
    const top = ok.slice().sort((a, b) => b.dawn - a.dawn).slice(0, 60);
    let refined = 0;
    for (const d of top) for (const orientation of [-20, -10, 10, 20]) {
      const r = evaluate(Object.assign({}, d.v, { airtight: d.v.airtight, orientation }), ctx, wxFor(orientation));
      refined++;
      if (!r.rejected) ok.push(r);
    }
    // Picks use materials a local mason can source; straw bale is reported as an alternative
    // because bales compete with winter fodder in Ladakh and Spiti.
    const isLocal = (d) => d.v.wall !== 'straw_bale';
    const front = pareto(ok.filter(isLocal));
    const strawBest = ok.filter((d) => !isLocal(d)).reduce((a, b) => (!a || b.dawn > a.dawn ? b : a), null);
    const base = evaluate(Object.assign({}, baseV), ctx, wx0, true);
    const best = front.reduce((a, b) => (b.dawn > a.dawn ? b : a), front[0]);
    const byCost = front.slice().sort((a, b) => a.cost - b.cost);
    // Balanced: the cheapest design within 1.5 °C of the warmest safe design
    const balanced = byCost.find((d) => d.dawn >= best.dawn - 1.5);
    // Budget: the cheapest design that closes at least half the gap between the ordinary build and the warmest
    const budget = byCost.find((d) => d.dawn >= (base.dawn + best.dawn) / 2) || balanced;
    if (onProgress) onProgress(total, total);
    const scatter = ok.filter((_, i) => i % Math.max(1, Math.floor(ok.length / 1500)) === 0).map((d) => [+d.cost.toFixed(0), +d.dawn.toFixed(2)]);
    return {
      site: ctx.site, month: ctx.month, type: ctx.type, area: ctx.area,
      total, refined, simulated: ok.length, rejectedMould: mould, ventSized: vented, ms: Date.now() - t0,
      front: front.map((d) => ({ v: d.v, dawn: d.dawn, cost: d.cost, carbon: d.carbon })),
      picks: { budget, balanced, warmest: best }, base, scatter, alternative: strawBest && { v: strawBest.v, dawn: strawBest.dawn, cost: strawBest.cost, carbon: strawBest.carbon, note: 'Straw bale walls: very warm and cheap, but bales compete with winter fodder, so supply is limited.' },
    };
  }

  /** Monte Carlo on a design: returns percentiles of dawn temperature and an hourly band. */
  function uncertainty(v, ctxIn, opts) {
    const ctx = ctxDefaults(ctxIn), o = Object.assign({ runs: 120, seed: 7, coldSnap: false, reportDays: 3 }, opts);
    const rnd = mulberry32(o.seed);
    const dawns = [], peaks = [], bands = [];
    for (let k = 0; k < o.runs; k++) {
      const wx = TB.climate.weather({ site: ctx.site, month: ctx.month, days: 5 + o.reportDays, dt: 3600, orientation: v.orientation || 0, coldSnap: o.coldSnap, snapDrop: o.snap ? o.snap.drop : 8, snapSolar: o.snap ? o.snap.solar : 0.45, tempShift: gauss(rnd) * 1.0, solarScale: 0.8 + rnd() * 0.35 });
      const sp = TB.design.spec(v, { area: ctx.area, type: ctx.type, single: true, occupants: ctx.occupants });
      const fU = 1 + gauss(rnd) * 0.08, fR = 1 + gauss(rnd) * 0.08;
      sp.wall = Object.assign({}, sp.wall, { U: sp.wall.U * fU, kappa: sp.wall.kappa * (1 + gauss(rnd) * 0.1) });
      sp.roof = Object.assign({}, sp.roof, { U: sp.roof.U * fR });
      sp.ach = v.ach * Math.exp(gauss(rnd) * 0.3);
      sp.gainsWm2 *= 1 + gauss(rnd) * 0.2;
      const r = TB.thermal.simulate(sp, wx, { reportDays: o.reportDays });
      dawns.push(r.minOp); peaks.push(r.maxOp);
      bands.push(r.series.wholeOp);
    }
    const len = bands[0].length;
    const p10 = new Float64Array(len), p50 = new Float64Array(len), p90 = new Float64Array(len);
    for (let i = 0; i < len; i++) { const col = bands.map((b) => b[i]); p10[i] = quantile(col, 0.1); p50[i] = quantile(col, 0.5); p90[i] = quantile(col, 0.9); }
    return { runs: o.runs, dawn: { p10: quantile(dawns, 0.1), p50: quantile(dawns, 0.5), p90: quantile(dawns, 0.9) }, peak: { p10: quantile(peaks, 0.1), p50: quantile(peaks, 0.5), p90: quantile(peaks, 0.9) }, band: { p10, p50, p90 } };
  }

  TB.optimise = { GRID, gridSize, requiredACH, evaluate, pareto, search, uncertainty, mulberry32, gauss, quantile };
})(typeof globalThis !== 'undefined' ? globalThis : this);
