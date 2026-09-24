/**
 * ThermaBuild engine: the analysis behind each report. Every figure the studio shows comes from here.
 */
(function (g) {
  'use strict';
  const TB = (g.TB = g.TB || {});
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function specFor(v, ctx, single) {
    const lay = single ? null : ctx.layout || TB.design.layout(Object.assign(TB.design.footprint(ctx.area, v.aspect || 1.3), { bedrooms: ctx.bedrooms || 2 }));
    const sp = TB.design.spec(v, { area: ctx.area, type: ctx.type, layout: lay || undefined, single: !!single, occupants: ctx.occupants, bedrooms: ctx.bedrooms });
    if (v.ach != null) sp.ach = v.ach;
    return sp;
  }

  function wx(ctx, v, o) { return TB.climate.weather(Object.assign({ site: ctx.site, month: ctx.month, orientation: (v && v.orientation) || 0 }, o)); }

  /** Free-running and heated runs of one design. */
  function runDesign(v, ctx, cache) {
    const T = TB.design.TYPES[ctx.type];
    const sp = specFor(v, ctx, false);
    const snapOpt = ctx.mode === 'heating' ? {} : { snapDrop: -4, snapSolar: 1 };
    const wTyp = wx(ctx, v, { days: 10, dt: 900 }), wSnap = wx(ctx, v, Object.assign({ days: 10, dt: 900, coldSnap: true }, snapOpt));
    const typ = TB.thermal.simulate(sp, wTyp, { reportDays: 3 });
    const snap = TB.thermal.simulate(sp, wSnap, { reportDays: 3 });
    const H = TB.design.heating(ctx.type, sp.zones);
    const hvac = ctx.mode === 'heating'
      ? TB.thermal.simulate(sp, wTyp, { reportDays: 3, setpoint: H.setpoint, setback: H.setback, heatHours: H.heatHours, heatZones: H.heatZones, heaterW: 200 * sp.area })
      : TB.thermal.simulate(sp, wTyp, { reportDays: 3, coolpoint: 26, heaterW: 200 * sp.area });
    return { sp, typ, snap, hvac, wTyp, wSnap };
  }

  function seasonEnergy(v, ctx) {
    // heating (or cooling) energy over the season: one design day per month, hourly, whole plan
    const T = TB.design.TYPES[ctx.type], c = TB.climate.site(ctx.site);
    const sp = specFor(v, ctx, false);
    const H = TB.design.heating(ctx.type, sp.zones);
    let kWh = 0; const months = [];
    for (let m = 0; m < 12; m++) {
      const need = ctx.mode === 'heating' ? c.t_mean[m] < 14 : c.t_max[m] > 30;
      if (!need) continue;
      const w = TB.climate.weather({ site: ctx.site, month: m, days: 5, dt: 3600, orientation: v.orientation || 0 });
      const r = ctx.mode === 'heating'
        ? TB.thermal.simulate(sp, w, { reportDays: 1, record: false, setpoint: H.setpoint, setback: H.setback, heatHours: H.heatHours, heatZones: H.heatZones, heaterW: 200 * sp.area })
        : TB.thermal.simulate(sp, w, { reportDays: 1, record: false, coolpoint: 26, heaterW: 200 * sp.area });
      const day = ctx.mode === 'heating' ? r.heaterKWh : r.coolerKWh;
      kWh += day * DAYS[m]; months.push({ m, kWhDay: day });
    }
    return { kWh, months, heatingText: H.text };
  }

  /** 12 × 24 grid of free-running whole-house operative temperature (one design day per month). */
  function calendar(v, ctx) {
    const sp = specFor(v, ctx, true);
    return MONTHS.map((_, m) => {
      const w = TB.climate.weather({ site: ctx.site, month: m, days: 5, dt: 3600, orientation: v.orientation || 0 });
      const r = TB.thermal.simulate(sp, w, { reportDays: 1 });
      return Array.from(r.series.wholeOp);
    });
  }

  /** How much each feature of the design is worth at dawn: switch it off and measure the drop. */
  function why(v, ctx) {
    const w = wx(ctx, v, { days: 5, dt: 3600 });
    const dawn = (vv) => TB.thermal.simulate(specFor(vv, ctx, true), w, { reportDays: 1, record: false })[ctx.mode === 'heating' ? 'minOp' : 'maxOp'];
    const ref = dawn(v);
    const tests = [];
    const add = (key, label, detail, change) => tests.push({ key, label, detail, vv: Object.assign({}, v, change) });
    if (ctx.mode === 'heating') {
      if (v.trombe) add('trombe', 'Trombe wall', 'Dark mass wall behind south glass stores the day’s sun and gives it back after dark.', { trombe: false });
      if (v.ins > 0) add('ins', `${Math.round(v.ins * 1000)} mm wall insulation`, 'Keeps the stored heat inside the walls instead of losing it outdoors.', { ins: 0 });
      if (/_ins$/.test(v.roof)) add('roof', 'Insulated roof', 'A flat roof faces the whole night sky; insulation stops most of that loss.', { roof: v.roof === 'rcc_ins' ? 'rcc_bare' : 'mud_poplar' });
      if (v.shutters) add('shutters', 'Night shutters', 'Closing insulated shutters at dusk halves the heat lost through the glass.', { shutters: false });
      if (v.wwrS >= 0.3) add('glass', `South glass, ${Math.round(v.wwrS * 100)} % of the wall`, 'Low winter sun shines deep into the rooms.', { wwrS: 0.15 });
      if (v.glazing === 'double_lowe' || v.glazing === 'triple') add('glazing', TB.materials.GLAZING[v.glazing].label, 'Loses less heat at night while still letting winter sun in.', { glazing: 'double' });
      if (v.ach != null && v.ach <= 0.7) add('airtight', 'Airtight build with a sized vent', 'Only the fresh air people and the stove need, not cold draughts.', { ach: 1.5 });
      if ((v.aspect || 1) >= 1.5) add('plan', 'Long east–west plan', 'A longer south face catches more sun for the same floor area.', { aspect: 1.0 });
    }
    return tests.map((t) => ({ key: t.key, label: t.label, detail: t.detail, v, delta: ref - dawn(t.vv) })).sort((a, b) => b.delta - a.delta);
  }

  /** Full analysis for homes, schools, shelters and posts. */
  function house(ctxIn, v, baseV, opts) {
    const o = Object.assign({ uncertaintyRuns: 80, calendar: true }, opts);
    const season = TB.climate.season(ctxIn.site);
    const ctx = Object.assign({ type: 'home', area: 100, month: season.month, mode: season.mode, price: 85 }, ctxIn);
    const T = TB.design.TYPES[ctx.type], S = TB.safety, c = TB.climate.site(ctx.site);
    const d = runDesign(v, ctx), b = runDesign(baseV, ctx);
    const V = d.sp.area * 2.7;
    const res = {
      ctx, mode: ctx.mode, monthName: MONTHS[ctx.month], site: c, typeLabel: T.label, v, baseV,
      design: d, base: b,
      dawn: d.typ.minOp, dawnSnap: d.snap.minOp, baseDawn: b.typ.minOp, baseDawnSnap: b.snap.minOp,
      peak: d.typ.maxOp, basePeak: b.typ.maxOp,
      outMin: Math.min(...d.typ.series.te), outMinSnap: Math.min(...d.snap.series.te), outMax: Math.max(...d.typ.series.te), outMaxSnap: Math.max(...d.snap.series.te),
      peakSnap: d.snap.maxOp, basePeakSnap: b.snap.maxOp,
    };
    // energy and fuel over the season
    const eD = seasonEnergy(v, ctx), eB = seasonEnergy(baseV, ctx);
    res.season = { design: eD, base: eB, savedPct: eB.kWh > 0 ? (1 - eD.kWh / eB.kWh) * 100 : 0 };
    if (ctx.mode === 'heating') { res.fuel = { design: S.fuel(eD.kWh, ctx.price), base: S.fuel(eB.kWh, ctx.price) }; }
    else { const tariff = 8; res.power = { design: eD.kWh / 3, base: eB.kWh / 3, rupeesDesign: (eD.kWh / 3) * tariff, rupeesBase: (eB.kWh / 3) * tariff }; } // COP 3 air conditioner, ₹8/kWh
    // uncertainty
    if (o.uncertaintyRuns) {
      const uT = TB.optimise.uncertainty(Object.assign({}, v, { ach: d.sp.ach }), ctx, { runs: o.uncertaintyRuns });
      const uS = TB.optimise.uncertainty(Object.assign({}, v, { ach: d.sp.ach }), ctx, { runs: Math.round(o.uncertaintyRuns / 2), coldSnap: true, seed: 11, snap: ctx.mode === 'heating' ? null : { drop: -4, solar: 1 } });
      res.uncertainty = { typ: uT, snap: uS };
    }
    // safety
    const coldestTe = Math.min(...d.typ.series.te);
    const G = S.moisture(d.sp.occupants, ctx.type);
    const sD = S.surfaceCheck(d.sp.wall.U, T.setpoint || 16, coldestTe, c.rh[ctx.month], T.humidityClass, G, d.sp.ach * V);
    const sB = S.surfaceCheck(b.sp.wall.U, T.setpoint || 16, coldestTe, c.rh[ctx.month], T.humidityClass, G, b.sp.ach * V);
    const need = TB.optimise.requiredACH(ctx.type, d.sp.occupants, V);
    const peakHeat = Math.max(0, ...Array.from(d.hvac.series.heater));
    res.safety = {
      achDesign: d.sp.ach, achRequired: need, vented: (v.airtight != null ? v.airtight : d.sp.ach) < need,
      co2: S.co2(d.sp.occupants, V, d.sp.ach), co2Base: S.co2(b.sp.occupants, V, b.sp.ach),
      coUnflued: S.coUnflued(peakHeat, V, d.sp.ach), coLimit: S.WHO_CO_24H,
      surface: sD, surfaceBase: sB,
      cold: S.coldLabel(d.snap.minOp), coldBase: S.coldLabel(b.snap.minOp), occupants: d.sp.occupants, stove: T.stove,
    };
    // comfort (PMV) in the evening with the stove holding the setpoint (heating) or free-running afternoon (cooling)
    const pmvAt = (r, clockH) => {
      const s = r.series, spd = s.hour.length / r.reportDays, i = Math.min(s.hour.length - 1, Math.round((r.reportDays - 1) * spd + (clockH / 24) * spd));
      const ta = s.wholeAir[i], tr = (s.wholeOp[i] - 0.3 * ta) / 0.7;
      return ctx.mode === 'heating' ? S.pmv(ta, tr, 0.1, 40, 1.2, 1.5) : S.pmv(ta, tr, 0.3, c.rh[ctx.month], 1.1, 0.5);
    };
    res.pmv = ctx.mode === 'heating' ? { design: pmvAt(d.hvac, 21), base: pmvAt(b.hvac, 21), clo: 1.5, when: '' }
      : { design: pmvAt(d.typ, 15), base: pmvAt(b.typ, 15), clo: 0.5, when: '3 pm, no air conditioning' };
    if (ctx.mode === 'heating') res.pmv.when = '9 pm, stove on';
    res.why = why(v, ctx);
    res.bom = TB.design.quantities(d.sp, v);
    res.bomBase = TB.design.quantities(b.sp, baseV);
    res.flowsPerDay = {}; Object.entries(d.typ.flowsKWh).forEach(([k, val]) => (res.flowsPerDay[k] = val / d.typ.reportDays));
    res.flowsPerDayBase = {}; Object.entries(b.typ.flowsKWh).forEach(([k, val]) => (res.flowsPerDayBase[k] = val / b.typ.reportDays));
    if (o.calendar) res.calendar = { design: calendar(v, ctx), base: calendar(baseV, ctx) };
    res.zones = d.sp.zones.map((z, i) => ({ name: z.name, area: z.area, x: z.x, y: z.y, w: z.w, d: z.d, band: z.band, minTyp: d.typ.minZoneOp[i], minSnap: d.snap.minZoneOp[i], poly: z.poly }));
    return res;
  }

  /** Livestock shelters: cold stress (hours below the lower critical temperature) or heat stress (THI). */
  function livestock(ctxIn) {
    const season = TB.climate.season(ctxIn.site);
    const ctx = Object.assign({ species: 'cattle', herd: 20, month: season.month, mode: season.mode }, ctxIn);
    const S = TB.safety, sp0 = S.SPECIES[ctx.species], c = TB.climate.site(ctx.site);
    const area = Math.max(8, ctx.herd * sp0.floor);
    const heat = S.animalHeat(ctx.species);
    const mk = (v, achOverride) => {
      const sp = TB.design.spec(v, { area, type: 'livestock', single: true, occupants: ctx.herd, heatPerOcc: heat });
      const V = area * 3;
      const ventAch = (ctx.herd * sp0.vent) / V;
      sp.ach = achOverride != null ? achOverride : Math.max(ventAch, v.ach || 0);
      sp.zones[0].height = 3; return sp;
    };
    let design, base;
    if (ctx.mode === 'heating') {
      design = { wall: 'mud_brick', ins: 0.05, roof: 'mud_poplar_ins', floor: 'earth', glazing: 'polycarb', wwrS: 0.35, trombe: false, aspect: 2.2, shutters: false, ach: 0, wwrN: 0, wwrE: 0.02, wwrW: 0.02 };
      base = { wall: 'stone', ins: 0, roof: 'cgi_bare', floor: 'earth', glazing: 'polycarb', wwrS: 0, trombe: false, aspect: 2, shutters: false, ach: 8, wwrN: 0, wwrE: 0, wwrW: 0 };
    } else {
      const rk = TB.materials.LEGACY.animalRoof[ctx.roof] || 'thatch';
      design = { wall: 'mud_brick', ins: 0, roof: rk, floor: 'earth', glazing: 'single', wwrS: 0, wwrN: 0, wwrE: 0, wwrW: 0, trombe: false, aspect: 2.5, shutters: false, ach: 40 };
      base = { wall: 'cgi_hut', ins: 0, roof: 'cgi_bare', floor: 'concrete', glazing: 'single', wwrS: 0, wwrN: 0, wwrE: 0, wwrW: 0, trombe: false, aspect: 2.5, shutters: false, ach: 12 };
    }
    const spD = mk(design, ctx.mode === 'heating' ? null : ctx.openAch || 40), spB = mk(base, ctx.mode === 'heating' ? Math.max(8, (ctx.herd * sp0.vent) / (area * 3)) : 12);
    const run = (sp, snap) => TB.thermal.simulate(sp, TB.climate.weather({ site: ctx.site, month: ctx.month, days: 10, dt: 900, orientation: 0, coldSnap: snap }), { reportDays: 3 });
    const dT = run(spD, false), bT = run(spB, false), dS = run(spD, true), bS = run(spB, true);
    const res = { ctx, mode: ctx.mode, species: sp0, area, heatPerHead: heat, design: { sp: spD, typ: dT, snap: dS }, base: { sp: spB, typ: bT, snap: bS }, monthName: MONTHS[ctx.month] };
    const below = (r, lct) => { const s = r.series.wholeAir, h = 24 / (s.length / r.reportDays); let hrs = 0, deg = 0; s.forEach((t) => { if (t < lct) { hrs += h; deg += (lct - t) * h; } }); return { hours: hrs / r.reportDays, degH: deg / r.reportDays }; };
    if (ctx.mode === 'heating') {
      res.cold = {
        design: below(dS, sp0.lct), base: below(bS, sp0.lct), designYoung: below(dS, sp0.lctYoung), baseYoung: below(bS, sp0.lctYoung),
        minDesign: dS.minOp, minBase: bS.minOp, minDesignTyp: dT.minOp, minBaseTyp: bT.minOp,
      };
      // NRC (1981) rule of thumb: about 1 % more maintenance feed per °C below the lower critical temperature
      res.cold.feedDesign = res.cold.design.degH / 24; res.cold.feedBase = res.cold.base.degH / 24;
      res.ach = spD.ach; res.achBase = spB.ach;
    } else {
      const rh = c.rh[ctx.month];
      const peakThi = (r) => Math.max(...Array.from(r.series.wholeOp).map((t) => S.thi(t, rh)));
      res.thi = { design: peakThi(dT), base: peakThi(bT), outdoor: Math.max(...Array.from(dT.series.te).map((t) => S.thi(t, rh))) };
      res.ach = spD.ach; res.achBase = spB.ach;
    }
    return res;
  }

  TB.analyse = { house, livestock, calendar, why, seasonEnergy, runDesign, specFor, MONTHS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
