/**
 * ThermaBuild engine: multi-zone transient heat balance.
 *
 * Each zone is the ISO 13790 / ISO 52016-1 simple hourly network (5R1C):
 *   air node θair — H_ve to outdoors, H_tr_is to the surface node
 *   surface node θs — H_tr_w (windows) to outdoors, H_tr_ms to the mass node
 *   mass node θm (capacity Cm) — H_tr_em to the outside of each opaque element
 * Opaque elements see their sol-air temperature (sun absorbed on the outside minus long-wave
 * loss to the night sky), the floor sees the ground (U from ISO 13370). An optional Trombe
 * (mass) wall adds two capacitive nodes behind south glazing. Zones exchange heat through
 * internal walls between surface nodes.
 *
 * The network is integrated with backward (implicit) Euler, which is unconditionally stable,
 * using an LU factorisation of the step matrix. Energy is conserved exactly by construction;
 * `engine.test.mjs` checks it independently from the returned flows.
 */
(function (g) {
  'use strict';
  const TB = (g.TB = g.TB || {});
  const H_IS = 3.45, H_MS = 9.1, H_SE = 25, H_R = 4.5, CP_AIR = 1005, LAMBDA_GROUND = 1.5;

  // ---------- small dense linear algebra ----------
  function lu(A, n) {
    const a = Float64Array.from(A), p = new Int32Array(n);
    for (let i = 0; i < n; i++) p[i] = i;
    for (let k = 0; k < n; k++) {
      let max = Math.abs(a[k * n + k]), r = k;
      for (let i = k + 1; i < n; i++) { const v = Math.abs(a[i * n + k]); if (v > max) { max = v; r = i; } }
      if (r !== k) { for (let j = 0; j < n; j++) { const t = a[k * n + j]; a[k * n + j] = a[r * n + j]; a[r * n + j] = t; } const t = p[k]; p[k] = p[r]; p[r] = t; }
      const d = a[k * n + k];
      for (let i = k + 1; i < n; i++) { const f = (a[i * n + k] /= d); if (f) for (let j = k + 1; j < n; j++) a[i * n + j] -= f * a[k * n + j]; }
    }
    return { a, p, n };
  }
  function luSolve(F, b, x) {
    const { a, p, n } = F; x = x || new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = b[p[i]]; for (let j = 0; j < i; j++) s -= a[i * n + j] * x[j]; x[i] = s; }
    for (let i = n - 1; i >= 0; i--) { let s = x[i]; for (let j = i + 1; j < n; j++) s -= a[i * n + j] * x[j]; x[i] = s / a[i * n + i]; }
    return x;
  }

  /** ISO 13370 slab-on-ground U-value for the whole floor. */
  function groundU(area, perimeter, Rf, wallThick) {
    const B = area / (0.5 * perimeter), dt = (wallThick || 0.4) + LAMBDA_GROUND * (0.17 + Rf + 0.04);
    return dt < B ? (2 * LAMBDA_GROUND / (Math.PI * B + dt)) * Math.log((Math.PI * B) / dt + 1) : LAMBDA_GROUND / (0.457 * B + dt);
  }

  const FAC = ['S', 'W', 'N', 'E'];
  const OCC = {
    // fraction of occupants present by hour (0-23)
    home: (h) => (h >= 9 && h < 17 ? 0.5 : 1),
    school: (h) => (h >= 9 && h < 15 ? 1 : 0),
    shelter: () => 1,
    post: () => 1,
    livestock: () => 1,
  };

  /**
   * Build the network for a building spec.
   * spec: { zones:[{name, area, height, fac:{S,W,N,E} (external wall length m), roof: bool, occupants, trombe: bool}],
   *         links:[{a,b,area}], wall, roof, floor (assemblies from TB.materials), glazing (key), wwr:{S,W,N,E},
   *         trombe (TB.materials.trombe or null), trombeFrac, ach, shutters, use, perimeter, gainsWm2, heatPerOcc }
   */
  function build(spec, wx, opts) {
    opts = opts || {};
    const MAT = TB.materials, gl = MAT.GLAZING[spec.glazing];
    const zones = spec.zones, nz = zones.length;
    const nodeOf = [];
    let n = 0;
    zones.forEach((z) => { const o = { air: n++, s: n++, m: n++ }; if (spec.trombe && z.fac.S > 0 && spec.trombeFrac > 0) { o.to = n++; o.ti = n++; } nodeOf.push(o); });
    const K = new Float64Array(n * n), C = new Float64Array(n);
    const bnd = []; // boundary links: {node, H, type, zone, elem}
    const gainMap = []; // per zone distribution factors
    const addH = (i, j, H) => { K[i * n + i] += H; K[j * n + j] += H; K[i * n + j] -= H; K[j * n + i] -= H; };
    const totalFloor = zones.reduce((a, z) => a + z.area, 0);
    const Ug = groundU(totalFloor, spec.perimeter || 4 * Math.sqrt(totalFloor), spec.floor.R - 0.17, spec.wall.thick);
    const rho = wx.rho, windF = Math.sqrt(Math.max(0.3, 0.5 + 0.125 * wx.wind));
    const Hve = [], Hw = [], Hwn = [], Aw = [], Atw = [];

    zones.forEach((z, zi) => {
      const o = nodeOf[zi], h = z.height || 2.7, V = z.area * h;
      const Af = z.area, At = 4.5 * Af;
      // windows and opaque areas per facade
      const aw = {}, aop = {};
      let atw = 0;
      FAC.forEach((f) => {
        const gross = (z.fac[f] || 0) * h;
        aw[f] = gross * (spec.wwr[f] || 0);
        if (f === 'S' && o.to != null) atw = Math.min(gross * spec.trombeFrac, Math.max(0, gross - aw.S) * 0.95);
        aop[f] = Math.max(0, gross - aw[f] - (f === 'S' ? atw : 0));
      });
      Aw.push(aw); Atw.push(atw);
      const Awin = FAC.reduce((a, f) => a + aw[f], 0);
      const Hwin = gl.U * Awin, HwinN = spec.shutters ? Awin / (1 / gl.U + 0.6) : Hwin;
      Hw.push(Hwin); Hwn.push(HwinN);
      // mass
      const partA = (spec.links || []).filter((l) => l.a === zi || l.b === zi).reduce((a, l) => a + l.area, 0) + (spec.partitionPerFloor || 0.6) * Af;
      const kPart = 1600 * 900 * 0.08; // mud-brick partition, 80 mm each side active
      const els = [];
      FAC.forEach((f) => { if (aop[f] > 0) els.push({ A: aop[f], k: spec.wall.kappa, U: spec.wall.U, type: 'wall', f }); });
      if (z.roof !== false) els.push({ A: Af, k: spec.roof.kappa, U: spec.roof.U, type: 'roof' });
      els.push({ A: Af, k: spec.floor.kappa, U: Ug, type: 'floor' });
      const Cm = els.reduce((a, e) => a + e.A * e.k, 0) + partA * kPart + Af * 10000; // + furniture 10 kJ/m2K
      const Am = Math.min(0.95 * At, (Cm * Cm) / (els.reduce((a, e) => a + e.A * e.k * e.k, 0) + partA * kPart * kPart + Af * 1e8));
      C[o.m] = Cm; C[o.air] = rho * CP_AIR * V * 3; C[o.s] = 0;
      const Htris = H_IS * At, Htrms = H_MS * Am;
      addH(o.air, o.s, Htris); addH(o.s, o.m, Htrms);
      const Hop = els.reduce((a, e) => a + e.U * e.A, 0);
      const Hem = Hop < 0.95 * Htrms ? 1 / (1 / Hop - 1 / Htrms) : Hop * 20;
      els.forEach((e) => {
        const H = (Hem * e.U * e.A) / Hop;
        K[o.m * n + o.m] += H;
        bnd.push({ node: o.m, H, type: e.type, f: e.f, zone: zi, alpha: e.type === 'roof' ? spec.roof.alpha : spec.wall.alpha, Fsky: e.type === 'roof' ? 1 : 0.5 });
      });
      // ventilation / infiltration (altitude-corrected mass flow)
      const ach = (z.ach != null ? z.ach : spec.ach) * windF;
      const hve = (rho * CP_AIR * ach * V) / 3600;
      Hve.push(hve);
      K[o.air * n + o.air] += hve; bnd.push({ node: o.air, H: hve, type: 'vent', zone: zi });
      // windows (day value in K; night swap handled by a second factorisation)
      K[o.s * n + o.s] += Hwin; bnd.push({ node: o.s, H: Hwin, Hn: HwinN, type: 'window', zone: zi });
      // Trombe wall
      if (o.to != null && atw > 0) {
        const t = spec.trombe, A = atw;
        C[o.to] = (t.rhoc * t.d * A) / 2; C[o.ti] = (t.rhoc * t.d * A) / 2;
        const Hq = (t.k * A) / (t.d / 4);
        const Hout = 1 / (1 / (t.Ugl * A) + 1 / Hq);
        K[o.to * n + o.to] += Hout; bnd.push({ node: o.to, H: Hout, type: 'trombe', zone: zi });
        addH(o.to, o.ti, (t.k * A) / (t.d / 2));
        addH(o.ti, o.s, 1 / (1 / Hq + 1 / (7.7 * A)));
      }
      const fm = Am / At, fst = Math.max(0, 1 - Am / At - Hwin / (H_MS * At));
      gainMap.push({ fm, fst, Af, occupants: z.occupants || 0 });
    });
    // inter-zone links (internal walls between surface nodes, plus door air exchange between air nodes)
    (spec.links || []).forEach((l) => {
      const Uint = 1 / (0.13 * 2 + 0.16 / 0.75); // 160 mm mud brick partition
      addH(nodeOf[l.a].s, nodeOf[l.b].s, Uint * l.area);
      addH(nodeOf[l.a].air, nodeOf[l.b].air, (rho * CP_AIR * 30) / 3600); // ~30 m3/h through doors
    });
    return { n, nz, K, C, bnd, nodeOf, gainMap, zones, Aw, Atw, Hve, Hw, Hwn, gl, spec, Ug };
  }

  /**
   * Run the model over the weather series.
   * opts: { setpoint: °C or null (free-running), setback: °C at night or null, coolpoint: °C or null, heaterW: total capacity W,
   *         heatZones: [bool] per zone (default all), heatHours: [from, to) clock hours,
   *         reportDays, record: bool (store per-step series), initial: node temperatures to start from }
   */
  function simulate(spec, wx, opts) {
    opts = Object.assign({ setpoint: null, heaterW: Infinity, reportDays: 3, record: true }, opts);
    const M = build(spec, wx, opts);
    const { n, nz, K, C, bnd, nodeOf, gainMap } = M;
    const dt = wx.dt, N = wx.N, spd = wx.stepsPerDay;
    const start = N - opts.reportDays * spd;
    const use = spec.use || 'home', occ = OCC[use] || OCC.home;
    const gl = M.gl, frame = 0.75, Fw = 0.9;
    // step matrices: day (window H) and night (shutters)
    const mk = (night) => {
      const A = new Float64Array(n * n);
      for (let i = 0; i < n * n; i++) A[i] = K[i];
      if (night) bnd.forEach((b) => { if (b.type === 'window') A[b.node * n + b.node] += b.Hn - b.H; });
      for (let i = 0; i < n; i++) A[i * n + i] += C[i] / dt;
      return lu(A, n);
    };
    const Fday = mk(false), Fnight = spec.shutters ? mk(true) : Fday;
    // unit responses for heaters at each zone air node
    const unit = (F) => nodeOf.map((o) => { const e = new Float64Array(n); e[o.air] = 1; return luSolve(F, e); });
    const heat = opts.setpoint != null, cool = opts.coolpoint != null;
    const Rday = heat || cool ? unit(Fday) : null, Rnight = heat || cool ? (spec.shutters ? unit(Fnight) : Rday) : null;
    const areaTot = gainMap.reduce((a, z) => a + z.Af, 0);

    // initial state: steady state of the first day's means
    const T = new Float64Array(n), rhs = new Float64Array(n), x = new Float64Array(n);
    if (opts.initial) for (let i = 0; i < n; i++) T[i] = opts.initial[i];
    else {
      let te = 0; for (let i = 0; i < spd; i++) te += wx.T[i]; te /= spd;
      const A = Float64Array.from(K); const b = new Float64Array(n);
      bnd.forEach((bb) => { b[bb.node] += bb.H * (bb.type === 'floor' ? wx.tGround : te); });
      gainMap.forEach((z, zi) => { const q = z.occupants * (spec.heatPerOcc ?? 75) * 0.8 + (spec.gainsWm2 ?? 2) * z.Af; b[nodeOf[zi].air] += q + (heat ? 0 : 0); });
      const s = luSolve(lu(A, n), b); for (let i = 0; i < n; i++) T[i] = s[i];
    }

    const R = opts.record, len = N - start;
    const out = R ? {
      hour: new Float64Array(len), te: new Float64Array(len), tsky: new Float64Array(len),
      air: nodeOf.map(() => new Float64Array(len)), op: nodeOf.map(() => new Float64Array(len)), surf: nodeOf.map(() => new Float64Array(len)), mass: nodeOf.map(() => new Float64Array(len)),
      heater: new Float64Array(len), wholeOp: new Float64Array(len), wholeAir: new Float64Array(len),
    } : null;
    const flows = { windows: 0, walls: 0, roof: 0, floor: 0, vent: 0, sky: 0, solarWin: 0, solarOpaque: 0, solarTrombe: 0, trombeGlass: 0, internal: 0, heater: 0, cooler: 0, stored: 0 };
    const flowSteps = { ...flows }; Object.keys(flowSteps).forEach((k) => (flowSteps[k] = null));
    let heaterJ = 0, heaterJreport = 0, coolerJreport = 0, minOp = Infinity, minOpAt = 0, maxOp = -Infinity, maxOpAt = 0, minZoneOp = nodeOf.map(() => Infinity);
    const phi = new Float64Array(nz);
    const hourFlows = R ? [] : null;
    const traceG = nodeOf.map(() => [0, 0, 0]);

    for (let i = 0; i < N; i++) {
      const te = wx.T[i], tsk = wx.Tsky[i], hourClock = wx.hourOf[i], hr = Math.floor(hourClock) % 24;
      const night = spec.shutters && (hourClock >= 17.5 || hourClock < 8.5);
      const F = night ? Fnight : Fday;
      for (let k = 0; k < n; k++) rhs[k] = (C[k] / dt) * T[k];
      // boundaries
      for (const b of bnd) {
        let tb = te;
        if (b.type === 'wall' || b.type === 'roof') {
          const Ii = b.type === 'roof' ? wx.I[4][i] : wx.I[FAC.indexOf(b.f)][i];
          tb = te + (b.alpha * Ii - b.Fsky * H_R * (te - tsk)) / H_SE;
        } else if (b.type === 'floor') tb = wx.tGround;
        rhs[b.node] += (night && b.type === 'window' ? b.Hn : b.H) * tb;
      }
      // gains
      let qInt = 0, qSolW = 0, qSkyW = 0, qSolT = 0;
      gainMap.forEach((z, zi) => {
        const o = nodeOf[zi], aw = M.Aw[zi];
        let solar = 0, skyw = 0;
        for (let f = 0; f < 4; f++) {
          const A = aw[FAC[f]]; if (!A) continue;
          // overhang over the windows: shaded share of the beam from the profile angle (window 1.4 m tall, 0.3 m gap)
          const ov = spec.overhang || 0, shade = ov > 0 && wx.Ib ? Math.max(0, Math.min(1, (ov * wx.tanP[f][i] - 0.3) / 1.4)) : 0;
          solar += A * frame * gl.g * Fw * (wx.I[f][i] - (wx.Ib ? wx.Ib[f][i] * shade : 0));
          skyw += 0.5 * (night ? M.Hwn[zi] : M.Hw[zi]) * (A / Math.max(1e-9, FAC.reduce((s, ff) => s + aw[ff], 0))) * (1 / H_SE) * H_R * (te - tsk);
        }
        const q = z.occupants * (spec.heatPerOcc ?? 75) * occ(hr) + (spec.gainsWm2 ?? 2) * z.Af + (use === 'home' && (hr === 7 || hr === 19) ? 600 * (z.Af / areaTot) : 0);
        const phiSol = solar - skyw;
        if (opts.trace) traceG[zi] = [0.5 * q, (1 - z.fm) * (0.5 * q + phiSol), z.fm * (0.5 * q + phiSol)];
        rhs[o.air] += 0.5 * q;
        rhs[o.s] += z.fst * (0.5 * q + phiSol);
        rhs[o.m] += z.fm * (0.5 * q + phiSol);
        // remainder of the split (ISO puts Φ_st and Φ_m on nodes; any residual goes to the surface node)
        rhs[o.s] += (1 - z.fst - z.fm) * (0.5 * q + phiSol);
        if (o.to != null) { const qt = M.spec.trombe.tau * M.spec.trombe.alpha * M.Atw[zi] * wx.I[0][i]; rhs[o.to] += qt; qSolT += qt; }
        qInt += q; qSolW += solar; qSkyW += skyw;
      });
      luSolve(F, rhs, x);
      if (opts.trace) opts.trace(i, { te, tsky: tsk, tGround: wx.tGround, g: traceG.map((a) => a.slice()), x: Array.from(x), night });
      // ideal heating / cooling: active set on zones outside the setpoints (linear superposition of unit responses)
      let qHeat = 0, qCool = 0;
      if (heat || cool) {
        const Rr = night ? Rnight : Rday;
        const onHrs = opts.heatHours, heatingNow = !onHrs || (hr >= onHrs[0] && hr < onHrs[1]);
        const lo = heat && heatingNow ? (opts.setback != null && (hr >= 23 || hr < 6) ? opts.setback : opts.setpoint) : -Infinity;
        const hi = cool ? opts.coolpoint : Infinity;
        const capZ = gainMap.map((z) => (opts.heaterW * z.Af) / areaTot);
        phi.fill(0);
        const zoneOn = opts.heatZones || null;
        const target = nodeOf.map((o, zi) => (zoneOn && !zoneOn[zi] ? null : x[o.air] < lo ? lo : x[o.air] > hi ? hi : null));
        let active = target.map((t) => t !== null);
        for (let it = 0; it < nz + 2 && active.some(Boolean); it++) {
          const idx = active.map((a, k) => (a ? k : -1)).filter((k) => k >= 0), m = idx.length;
          const A = new Float64Array(m * m), bb = new Float64Array(m);
          idx.forEach((zi, r) => { bb[r] = target[zi] - x[nodeOf[zi].air]; idx.forEach((zj, c) => { A[r * m + c] = Rr[zj][nodeOf[zi].air]; }); });
          const sol = luSolve(lu(A, m), bb);
          let changed = false;
          idx.forEach((zi, r) => {
            const wantHeat = target[zi] === lo;
            if ((wantHeat && sol[r] <= 0) || (!wantHeat && sol[r] >= 0)) { active[zi] = false; phi[zi] = 0; changed = true; }
            else phi[zi] = wantHeat ? Math.min(capZ[zi], sol[r]) : Math.max(-capZ[zi], sol[r]);
          });
          if (!changed) break;
        }
        for (let zi = 0; zi < nz; zi++) if (phi[zi] !== 0) { if (phi[zi] > 0) qHeat += phi[zi]; else qCool -= phi[zi]; const r = Rr[zi]; for (let k = 0; k < n; k++) x[k] += phi[zi] * r[k]; }
      }
      // energy bookkeeping over the report window
      if (i >= start) {
        let stored = 0; for (let k = 0; k < n; k++) stored += (C[k] / dt) * (x[k] - T[k]);
        const f = { windows: 0, walls: 0, roof: 0, floor: 0, vent: 0, sky: 0, solarOpaque: 0, trombeGlass: 0 };
        for (const b of bnd) {
          const H = night && b.type === 'window' ? b.Hn : b.H, tn = x[b.node];
          if (b.type === 'wall' || b.type === 'roof') {
            const Ii = b.type === 'roof' ? wx.I[4][i] : wx.I[FAC.indexOf(b.f)][i];
            f[b.type === 'wall' ? 'walls' : 'roof'] += H * (te - tn);
            f.solarOpaque += (H * b.alpha * Ii) / H_SE;
            f.sky -= (H * b.Fsky * H_R * (te - tsk)) / H_SE;
          } else if (b.type === 'floor') f.floor += H * (wx.tGround - tn);
          else if (b.type === 'vent') f.vent += H * (te - tn);
          else if (b.type === 'window') f.windows += H * (te - tn);
          else if (b.type === 'trombe') f.trombeGlass += H * (te - tn);
        }
        f.sky -= qSkyW;
        const J = dt;
        flows.windows += f.windows * J; flows.walls += f.walls * J; flows.roof += f.roof * J; flows.floor += f.floor * J; flows.vent += f.vent * J;
        flows.sky += f.sky * J; flows.solarOpaque += f.solarOpaque * J; flows.trombeGlass += f.trombeGlass * J;
        flows.solarWin += qSolW * J; flows.solarTrombe += qSolT * J; flows.internal += qInt * J; flows.heater += qHeat * J; flows.cooler -= qCool * J; flows.stored += stored * J;
        heaterJreport += qHeat * dt; coolerJreport += qCool * dt;
        if (R) {
          const j = i - start;
          out.hour[j] = (i - start) * (dt / 3600) + dt / 7200; out.te[j] = te; out.tsky[j] = tsk; out.heater[j] = qHeat - qCool;
          let wo = 0, wa = 0;
          nodeOf.forEach((o, zi) => {
            const op = 0.3 * x[o.air] + 0.7 * x[o.s];
            out.air[zi][j] = x[o.air]; out.surf[zi][j] = x[o.s]; out.mass[zi][j] = x[o.m]; out.op[zi][j] = op;
            wo += op * gainMap[zi].Af; wa += x[o.air] * gainMap[zi].Af;
            if (op < minZoneOp[zi]) minZoneOp[zi] = op;
          });
          out.wholeOp[j] = wo / areaTot; out.wholeAir[j] = wa / areaTot;
          if (dt <= 3600 && (j % Math.max(1, Math.round(3600 / dt)) === 0)) hourFlows.push(Object.assign({ solarWin: qSolW, solarTrombe: qSolT, internal: qInt, heater: qHeat, cooler: -qCool }, f));
        }
        let wo = 0; nodeOf.forEach((o, zi) => { wo += (0.3 * x[o.air] + 0.7 * x[o.s]) * gainMap[zi].Af; }); wo /= areaTot;
        if (wo < minOp) { minOp = wo; minOpAt = i; }
        if (wo > maxOp) { maxOp = wo; maxOpAt = i; }
        if (!R) nodeOf.forEach((o, zi) => { const op = 0.3 * x[o.air] + 0.7 * x[o.s]; if (op < minZoneOp[zi]) minZoneOp[zi] = op; });
      }
      heaterJ += qHeat * dt;
      for (let k = 0; k < n; k++) T[k] = x[k];
    }
    const toKWh = (J) => J / 3.6e6;
    const fl = {}; Object.keys(flows).forEach((k) => (fl[k] = toKWh(flows[k])));
    // inside-surface temperature of the external wall at the coldest moment (for condensation checks)
    return {
      model: M, series: out, flowsKWh: fl, hourFlows,
      minOp, minOpHour: wx.hourOf[minOpAt], maxOp, maxOpHour: wx.hourOf[maxOpAt], minZoneOp,
      heaterKWh: toKWh(heaterJreport), coolerKWh: toKWh(coolerJreport), heaterKWhAll: toKWh(heaterJ), reportDays: opts.reportDays,
      finalState: Float64Array.from(T),
    };
  }

  /** Inside surface temperature of an element with U-value U, given room and outdoor temps (ISO 13788, Rsi 0.25). */
  function innerSurface(U, ti, te, rsi) { return ti - (ti - te) * U * (rsi || 0.25); }

  TB.thermal = { build, simulate, groundU, innerSurface, lu, luSolve, FAC, OCC };
})(typeof globalThis !== 'undefined' ? globalThis : this);
