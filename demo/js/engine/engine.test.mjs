// Physics checks for the ThermaBuild engine. Run: node --test demo/js/engine/engine.test.mjs
// Writes demo/data/test-results.js so the methodology page can show the live count.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const demo = path.join(here, '..', '..');
['data/climate.js', 'js/engine/materials.js', 'js/engine/climate.js', 'js/engine/thermal.js', 'js/engine/design.js', 'js/engine/safety.js', 'js/engine/optimise.js', 'js/engine/analyse.js']
  .forEach((f) => require(path.join(demo, f)));
const TB = globalThis.TB;
const results = [];
const check = (name, fn) => test(name, () => { try { fn(); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, msg: String(e.message).slice(0, 200) }); throw e; } });

const good = { wall: 'mud_brick', ins: 0.1, roof: 'mud_poplar_ins', floor: 'earth_ins', glazing: 'double_lowe', wwrS: 0.35, trombe: true, ach: 0.6, shutters: true, aspect: 1.6 };
const sumBalance = (f) => f.windows + f.walls + f.roof + f.floor + f.vent + f.sky + f.solarOpaque + f.trombeGlass + f.solarWin + f.solarTrombe + f.internal + f.heater + f.cooler - f.stored;

// ---------- energy conservation ----------
for (const site of ['leh', 'dras', 'pangong', 'spiti', 'chennai', 'jaisalmer']) {
  check(`energy balance closes to 0.1 % over 3 days (${site}, multi-room, Trombe, shutters)`, () => {
    const wx = TB.climate.weather({ site, month: 0, days: 8, dt: 900 });
    const sp = TB.design.spec(good, { area: 100, type: 'home', layout: TB.design.layout({ width: 12.6, depth: 7.9, bedrooms: 2 }) });
    const r = TB.thermal.simulate(sp, wx, { reportDays: 3 });
    const f = r.flowsKWh, scale = Math.abs(f.solarWin) + Math.abs(f.internal) + Math.abs(f.walls) + 1;
    assert.ok(Math.abs(sumBalance(f)) / scale < 1e-3, `imbalance ${sumBalance(f)}`);
  });
}
check('energy balance closes with an ideal heater and cooler', () => {
  const wx = TB.climate.weather({ site: 'new_delhi', month: 5, days: 6, dt: 900 });
  const sp = TB.design.spec(TB.design.BASELINE.home, { area: 80, type: 'home', single: true });
  const r = TB.thermal.simulate(sp, wx, { reportDays: 2, coolpoint: 26, heaterW: 1e6 });
  assert.ok(r.coolerKWh > 0);
  assert.ok(Math.abs(sumBalance(r.flowsKWh)) < 1e-3 * r.coolerKWh);
});

// ---------- analytical cases ----------
check('steady state matches U·A·ΔT by hand (no sun, no gains, constant weather)', () => {
  const wx = TB.climate.weather({ site: 'leh', month: 0, days: 30, dt: 3600 });
  wx.T.fill(-10); wx.Tsky.fill(-10); wx.I.forEach((a) => a.fill(0)); wx.tGround = -10;
  const sp = TB.design.spec(Object.assign({}, good, { trombe: false, shutters: false }), { area: 60, type: 'home', single: true });
  sp.gainsWm2 = 0; sp.zones[0].occupants = 0; sp.use = 'shelter';
  const r = TB.thermal.simulate(sp, wx, { reportDays: 1, setpoint: 20, heaterW: 1e7 });
  const M = r.model, Hwin = M.Hw[0], Hve = M.Hve[0];
  const Hwalls = M.bnd.filter((b) => b.type !== 'window' && b.type !== 'vent').reduce((a, b) => a + b.H, 0);
  // series network: surface→mass→outside path; compute the building's steady conductance directly from K
  const n = M.n, A = Float64Array.from(M.K), rhs = new Float64Array(n);
  const o = M.nodeOf[0];
  // fix air at 20 °C: solve remaining nodes, then heat = sum of boundary flows
  const solveFixed = () => { const idx = [...Array(n).keys()].filter((k) => k !== o.air); const m = idx.length; const B = new Float64Array(m * m), b = new Float64Array(m);
    idx.forEach((ri, r) => { idx.forEach((ci, c) => (B[r * m + c] = A[ri * n + ci])); b[r] = -A[ri * n + o.air] * 20 + M.bnd.filter((bb) => bb.node === ri).reduce((s, bb) => s + bb.H * -10, 0); });
    const x = TB.thermal.luSolve(TB.thermal.lu(B, m), b); const T = new Float64Array(n); idx.forEach((k, i) => (T[k] = x[i])); T[o.air] = 20; return T; };
  const T = solveFixed();
  const loss = M.bnd.reduce((s, bb) => s + bb.H * (T[bb.node] + 10), 0);
  const heater = (r.heaterKWh * 1000) / 24;
  assert.ok(Math.abs(heater - loss) / loss < 0.01, `heater ${heater.toFixed(1)} W vs hand ${loss.toFixed(1)} W`);
  assert.ok(Hwin > 0 && Hve > 0 && Hwalls > 0);
});
check('free cooling decays at the network\'s slowest time constant (no sun, no gains)', () => {
  // warm the house to 20 °C in 0 °C weather, switch the heater off, and compare the late decay with
  // exp(-t/τ), τ = 1/λmin of C⁻¹K found independently by inverse iteration on the network matrices
  const mk = (days) => { const wx = TB.climate.weather({ site: 'leh', month: 0, days, dt: 600 }); wx.T.fill(0); wx.Tsky.fill(0); wx.I.forEach((a) => a.fill(0)); wx.tGround = 0; return wx; };
  const sp = TB.design.spec(Object.assign({}, good, { trombe: false, shutters: false }), { area: 60, type: 'home', single: true });
  sp.gainsWm2 = 0; sp.zones[0].occupants = 0; sp.use = 'shelter';
  const warm = TB.thermal.simulate(sp, mk(20), { reportDays: 1, setpoint: 20, heaterW: 1e7 });
  const r = TB.thermal.simulate(sp, mk(6), { reportDays: 6, initial: warm.finalState });
  const s = r.series.wholeOp; for (let i = 1; i < s.length; i++) assert.ok(s[i] < s[i - 1], 'decay must be monotone');
  const M = r.model, n = M.n, F = TB.thermal.lu(M.K, n);
  let y = new Float64Array(n).fill(1), lam = 0;
  for (let it = 0; it < 200; it++) { const cy = y.map((v, i) => M.C[i] * v); const z = TB.thermal.luSolve(F, cy); const nz = Math.hypot(...z); lam = Math.hypot(...y) / nz; y = z.map((v) => v / nz); }
  const tau = 1 / lam, spd = s.length / 6, t1 = 3 * spd, t2 = 5 * spd;
  const measured = Math.log(s[t1] / s[t2]) / ((t2 - t1) * 600), expected = 1 / tau;
  assert.ok(Math.abs(measured - expected) / expected < 0.05, `decay rate ${measured} vs 1/τ ${expected} (τ = ${(tau / 3600).toFixed(1)} h)`);
});
check('time step convergence: 10-minute and 1-hour steps agree within 0.6 °C at dawn', () => {
  const a = TB.thermal.simulate(TB.design.spec(good, { area: 100, type: 'home', single: true }), TB.climate.weather({ site: 'leh', month: 0, days: 8, dt: 600 }), { reportDays: 1 });
  const b = TB.thermal.simulate(TB.design.spec(good, { area: 100, type: 'home', single: true }), TB.climate.weather({ site: 'leh', month: 0, days: 8, dt: 3600 }), { reportDays: 1 });
  assert.ok(Math.abs(a.minOp - b.minOp) < 0.6, `${a.minOp} vs ${b.minOp}`);
});

// ---------- monotonic design responses ----------
const dawn = (v, site = 'leh') => TB.thermal.simulate(TB.design.spec(v, { area: 100, type: 'home', single: true }), TB.climate.weather({ site, month: 0, days: 6, dt: 3600 }), { reportDays: 1, record: false }).minOp;
for (const site of ['leh', 'dras', 'pangong']) {
  check(`more wall insulation never makes the dawn colder (${site})`, () => { let prev = -Infinity; for (const ins of [0, 0.05, 0.1, 0.15, 0.2]) { const d = dawn(Object.assign({}, good, { ins }), site); assert.ok(d >= prev - 1e-6, `${ins}: ${d} < ${prev}`); prev = d; } });
  check(`a Trombe wall never makes the dawn colder (${site})`, () => { assert.ok(dawn(Object.assign({}, good, { trombe: true }), site) >= dawn(Object.assign({}, good, { trombe: false }), site) - 0.05); });
  check(`night shutters never make the dawn colder (${site})`, () => { assert.ok(dawn(Object.assign({}, good, { shutters: true }), site) >= dawn(Object.assign({}, good, { shutters: false }), site) - 1e-6); });
  check(`less air leakage never makes the dawn colder (${site})`, () => { assert.ok(dawn(Object.assign({}, good, { ach: 0.5 }), site) >= dawn(Object.assign({}, good, { ach: 1.5 }), site)); });
  check(`the recommended style of design beats the ordinary build at dawn (${site})`, () => { assert.ok(dawn(good, site) > dawn(TB.design.BASELINE.home, site) + 5); });
}
check('a deep overhang never adds winter sun, and cuts the summer peak in Jaisalmer', () => {
  const v0 = Object.assign({}, good, { trombe: false, shutters: false, wwrS: 0.35 });
  const w = TB.climate.weather({ site: 'leh', month: 0, days: 6, dt: 3600 });
  const d0 = TB.thermal.simulate(TB.design.spec(v0, { area: 100, type: 'home', single: true }), w, { reportDays: 1, record: false });
  const d1 = TB.thermal.simulate(TB.design.spec(Object.assign({}, v0, { overhang: 1.2 }), { area: 100, type: 'home', single: true }), w, { reportDays: 1, record: false });
  assert.ok(d1.flowsKWh.solarWin <= d0.flowsKWh.solarWin + 1e-9);
  const hot = TB.climate.weather({ site: 'jaisalmer', month: 4, days: 6, dt: 3600 });
  const vh = Object.assign({}, v0, { wwrE: 0.2, wwrW: 0.2, ach: 2 });
  const h0 = TB.thermal.simulate(TB.design.spec(vh, { area: 100, type: 'home', single: true }), hot, { reportDays: 1, record: false });
  const h1 = TB.thermal.simulate(TB.design.spec(Object.assign({}, vh, { overhang: 0.9 }), { area: 100, type: 'home', single: true }), hot, { reportDays: 1, record: false });
  assert.ok(h1.maxOp < h0.maxOp, `${h1.maxOp} vs ${h0.maxOp}`);
});
check('a cold snap is colder than a typical night', () => {
  const sp = TB.design.spec(good, { area: 100, type: 'home', single: true });
  const a = TB.thermal.simulate(sp, TB.climate.weather({ site: 'leh', month: 0, days: 8, dt: 3600 }), { reportDays: 3 });
  const b = TB.thermal.simulate(sp, TB.climate.weather({ site: 'leh', month: 0, days: 8, dt: 3600, coldSnap: true }), { reportDays: 3 });
  assert.ok(b.minOp < a.minOp);
});
check('heating demand falls as insulation rises', () => {
  let prev = Infinity;
  for (const ins of [0, 0.05, 0.1, 0.15]) { const r = TB.thermal.simulate(TB.design.spec(Object.assign({}, good, { ins }), { area: 100, type: 'home', single: true }), TB.climate.weather({ site: 'leh', month: 0, days: 6, dt: 3600 }), { reportDays: 1, record: false, setpoint: 16, heaterW: 1e6 }); assert.ok(r.heaterKWh <= prev + 1e-9); prev = r.heaterKWh; }
});
check('a sheet-metal hut sits close to outdoor temperature at dawn', () => {
  const r = TB.thermal.simulate(TB.design.spec(TB.design.BASELINE.post, { area: 40, type: 'post', single: true }), TB.climate.weather({ site: 'leh', month: 0, days: 6, dt: 3600 }), { reportDays: 1 });
  const out = Math.min(...r.series.te); assert.ok(r.minOp - out < 4, `hut ${r.minOp} vs outdoor ${out}`);
});

// ---------- weather ----------
check('hourly sun integrates back to the NASA POWER daily total', () => {
  const wx = TB.climate.weather({ site: 'leh', month: 0, days: 1, dt: 600 }); const sum = wx.G.reduce((a, b) => a + b, 0) * (600 / 3600);
  assert.ok(Math.abs(sum - TB_CLIMATE.sites.leh.ghi_kwh[0] * 1000) < 1);
});
check('a south wall gets more winter sun than a north wall at every cold site', () => {
  for (const site of ['leh', 'nubra', 'kargil', 'dras', 'pangong', 'spiti']) { const wx = TB.climate.weather({ site, month: 0, days: 1, dt: 600 }); const s = wx.I[0].reduce((a, b) => a + b, 0), n = wx.I[2].reduce((a, b) => a + b, 0); assert.ok(s > n, site); }
});
check('clear night sky is colder than the air (Swinbank)', () => { const wx = TB.climate.weather({ site: 'leh', month: 0, days: 1, dt: 3600 }); for (let i = 0; i < wx.N; i++) assert.ok(wx.Tsky[i] <= wx.T[i] + 1e-9); });
check('air density at 3,500 m is about 66 % of sea level', () => { const r = TB.climate.airDensity(3500) / 1.225; assert.ok(r > 0.64 && r < 0.68); });
check('coldest temperature falls near sunrise and warmest in the afternoon', () => { const wx = TB.climate.weather({ site: 'leh', month: 0, days: 1, dt: 600 }); const iMin = wx.T.indexOf(Math.min(...wx.T)), iMax = wx.T.indexOf(Math.max(...wx.T)); assert.ok(Math.abs(wx.hourOf[iMin] - wx.sunrise) < 0.2); assert.ok(Math.abs(wx.hourOf[iMax] - 14) < 0.2); });

// ---------- safety ----------
check('the fresh-air rule: a stove never runs below 0.5 air changes per hour', () => {
  const s = TB.optimise.search({ site: 'leh', type: 'home', area: 100 });
  for (const d of s.front) assert.ok(d.v.ach >= 0.5 - 1e-9, `design at ${d.v.ach} ACH`);
});
check('crowded rooms get enough air to keep CO2 at or below 1,400 ppm', () => {
  const ach = TB.optimise.requiredACH('post', 10, 50 * 2.7); assert.ok(TB.safety.co2(10, 50 * 2.7, ach) <= 1400 + 1e-6);
});
check('mould check: an uninsulated block wall in Leh flags, an insulated one passes', () => {
  const bad = TB.safety.surfaceCheck(TB.materials.wall('conc_block', 0).U, 16, -16, 50, 3, 450, 135), ok = TB.safety.surfaceCheck(TB.materials.wall('conc_block', 0.1).U, 16, -16, 50, 3, 450, 135);
  assert.ok(bad.rhs > ok.rhs); assert.equal(ok.mould, false);
});
check('PMV reference case: 22 °C, 0.5 clo, 1.2 met gives about −0.75 (ISO 7730 Table D.1)', () => { const p = TB.safety.pmv(22, 22, 0.1, 60, 1.2, 0.5); assert.ok(Math.abs(p.pmv - -0.75) < 0.1, `PMV ${p.pmv}`); });
check('PMV reference case: 27 °C, 0.5 clo, 1.2 met gives about +0.77 (ISO 7730 Table D.1)', () => { const p = TB.safety.pmv(27, 27, 0.1, 60, 1.2, 0.5); assert.ok(Math.abs(p.pmv - 0.77) < 0.1, `PMV ${p.pmv}`); });
check('kerosene: 1 litre delivers about 5.3 kWh of useful heat in a 55 % efficient stove', () => { const f = TB.safety.fuel(5.27); assert.ok(Math.abs(f.litres - 1) < 0.01); });

// ---------- optimiser ----------
check('the search checks more than 20,000 designs in under 3 seconds', () => { const t = Date.now(); const s = TB.optimise.search({ site: 'dras', type: 'home', area: 90 }); assert.ok(s.total >= 20000); assert.ok(Date.now() - t < 3000, `${Date.now() - t} ms`); });
check('every Pareto design is non-dominated', () => {
  const s = TB.optimise.search({ site: 'spiti', type: 'home', area: 90 });
  for (const a of s.front) for (const b of s.front) if (a !== b) assert.ok(!(b.dawn >= a.dawn && b.cost <= a.cost && b.carbon <= a.carbon && (b.dawn > a.dawn || b.cost < a.cost || b.carbon < a.carbon)));
});
check('uncertainty band is ordered P10 ≤ P50 ≤ P90', () => { const u = TB.optimise.uncertainty(Object.assign({}, good, { ach: 0.6 }), { site: 'leh', type: 'home', area: 100 }, { runs: 30 }); assert.ok(u.dawn.p10 <= u.dawn.p50 && u.dawn.p50 <= u.dawn.p90); });
check('the same inputs always give the same answer', () => {
  const a = TB.analyse.house({ site: 'kargil', type: 'home', area: 90 }, Object.assign({}, good, { ach: 0.6 }), TB.design.BASELINE.home, { uncertaintyRuns: 10, calendar: false });
  const b = TB.analyse.house({ site: 'kargil', type: 'home', area: 90 }, Object.assign({}, good, { ach: 0.6 }), TB.design.BASELINE.home, { uncertaintyRuns: 10, calendar: false });
  assert.equal(a.dawn, b.dawn); assert.equal(a.uncertainty.typ.dawn.p50, b.uncertainty.typ.dawn.p50);
});

// ---------- livestock ----------
check('animals in a closed, insulated shelter are warmer than in an open stone pen', () => { const l = TB.analyse.livestock({ site: 'leh', species: 'goat', herd: 30 }); assert.ok(l.cold.minDesign > l.cold.minBase); });
check('a shaded shelter lowers the heat-stress index versus a bare tin shed', () => { const l = TB.analyse.livestock({ site: 'jaisalmer', species: 'cattle', herd: 20, roof: 'thatch' }); assert.ok(l.thi.design < l.thi.base); });

after(() => {
  const passed = results.filter((r) => r.ok).length;
  const out = { passed, total: results.length, at: new Date().toISOString(), node: process.version, results };
  fs.writeFileSync(path.join(demo, 'data', 'test-results.js'), `// Written by engine.test.mjs\n(function (g) { g.TB_TESTS = ${JSON.stringify(out)}; })(typeof globalThis !== 'undefined' ? globalThis : this);\n`);
});
