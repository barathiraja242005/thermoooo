/**
 * ThermaBuild engine: weather synthesis.
 *
 * Turns NASA POWER monthly means (data/climate.js) into a sub-hourly design weather series:
 *  - temperature: cosine segments, minimum at sunrise, maximum at 14:00
 *  - sun position: Spencer (1971) declination and equation of time
 *  - hourly global radiation: Collares-Pereira & Rabl (1979) daily-to-hourly ratio
 *  - diffuse split: Erbs, Klein & Duffie (1982)
 *  - radiation on walls and roof: isotropic sky (Liu & Jordan) with ground reflection
 *  - night sky temperature: Swinbank (1963), blended toward air temperature under cloud
 *  - air density at altitude: isothermal barometric formula, scale height 8,434 m
 * Solar geometry follows Duffie & Beckman, Solar Engineering of Thermal Processes (4th ed.).
 */
(function (g) {
  'use strict';
  const TB = (g.TB = g.TB || {});
  const D2R = Math.PI / 180;
  const REP_DAY = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344]; // Klein (1977) mean days
  const SIGMA = 5.670e-8;

  function site(key) {
    const c = g.TB_CLIMATE && g.TB_CLIMATE.sites[key];
    if (!c) throw new Error('No climate data for ' + key);
    return c;
  }

  /** Air density at elevation z (m), kg/m3. */
  const airDensity = (z) => 1.225 * Math.exp(-z / 8434);

  function solarGeometry(n) {
    const B = (2 * Math.PI * (n - 1)) / 365;
    const decl = 0.006918 - 0.399912 * Math.cos(B) + 0.070257 * Math.sin(B) - 0.006758 * Math.cos(2 * B) + 0.000907 * Math.sin(2 * B) - 0.002697 * Math.cos(3 * B) + 0.00148 * Math.sin(3 * B);
    const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B) - 0.014615 * Math.cos(2 * B) - 0.04089 * Math.sin(2 * B)); // minutes
    const G0n = 1367 * (1 + 0.033 * Math.cos((2 * Math.PI * n) / 365));
    return { decl, eot, G0n };
  }

  /** Incidence cosine on a surface with tilt beta and azimuth gamma (from south, west +), radians. */
  function cosIncidence(decl, lat, beta, gamma, w) {
    const sd = Math.sin(decl), cd = Math.cos(decl), sl = Math.sin(lat), cl = Math.cos(lat), sb = Math.sin(beta), cb = Math.cos(beta);
    return sd * sl * cb - sd * cl * sb * Math.cos(gamma) + cd * cl * cb * Math.cos(w) + cd * sl * sb * Math.cos(gamma) * Math.cos(w) + cd * sb * Math.sin(gamma) * Math.sin(w);
  }

  function erbs(kt) {
    if (kt <= 0.22) return 1 - 0.09 * kt;
    if (kt <= 0.8) return 0.9511 - 0.1604 * kt + 4.388 * kt * kt - 16.638 * kt ** 3 + 12.336 * kt ** 4;
    return 0.165;
  }

  /**
   * Build a weather series.
   * opts: { site: key, month: 0-11, days: total days, dt: seconds, orientation: deg (building rotation, + = west),
   *         coldSnap: bool (applies to the last `snapDays` days), snapDays, snapDrop (K, negative for a heatwave), snapSolar, albedo }
   * Facade order: S, W, N, E (building-relative), plus roof.
   */
  function weather(opts) {
    const o = Object.assign({ month: 0, days: 10, dt: 3600, orientation: 0, coldSnap: false, snapDays: 3, snapDrop: 8, snapSolar: 0.45, tempShift: 0, solarScale: 1 }, opts);
    const c = typeof o.site === 'string' ? site(o.site) : o.site;
    const m = o.month, n = REP_DAY[m];
    const lat = c.lat * D2R;
    const { decl, eot, G0n } = solarGeometry(n);
    const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(decl)))); // sunset hour angle
    const dayLen = (2 * ws) / (15 * D2R);
    // clock time (IST) of solar noon
    const noonClock = 12 - (4 * (c.lon - 82.5) + eot) / 60;
    const sunrise = noonClock - dayLen / 2;
    const tMax = 14.0;
    const H = c.ghi_kwh[m] * 1000 * o.solarScale;                 // Wh/m2/day all-sky
    const Hc = c.ghi_clear_kwh[m] * 1000;                          // Wh/m2/day clear-sky
    const cloudBase = Math.max(0, Math.min(1, 1 - c.ghi_kwh[m] / Math.max(1, c.ghi_clear_kwh[m])));
    const albedo = o.albedo != null ? o.albedo : (c.t_mean[m] < -2 ? 0.3 : 0.2);
    const tAnnual = c.t_mean.reduce((a, b) => a + b, 0) / 12;
    const tGround = (tAnnual + c.t_mean[m]) / 2;
    const facAz = [0, 90, 180, -90].map((a) => (a + o.orientation) * D2R);

    // Collares-Pereira & Rabl hourly ratio (per hour), used as a shape; renormalised below.
    const a = 0.409 + 0.5016 * Math.sin(ws - 60 * D2R), b = 0.6609 - 0.4767 * Math.sin(ws - 60 * D2R);
    const rt = (w) => (Math.PI / 24) * (a + b * Math.cos(w)) * (Math.cos(w) - Math.cos(ws)) / (Math.sin(ws) - ws * Math.cos(ws));

    const stepsPerDay = Math.round(86400 / o.dt), N = stepsPerDay * o.days;
    const T = new Float64Array(N), Tsky = new Float64Array(N), G = new Float64Array(N), I = [0, 1, 2, 3, 4].map(() => new Float64Array(N)), sunUp = new Uint8Array(N);
    const Ib = [0, 1, 2, 3].map(() => new Float64Array(N)), tanP = [0, 1, 2, 3].map(() => new Float64Array(N)); // beam on each wall, tan(profile angle) for overhangs
    const hourOf = new Float64Array(N), dayOf = new Uint16Array(N);

    // one day of solar shape, normalised so it integrates to H exactly
    const shape = new Float64Array(stepsPerDay), wArr = new Float64Array(stepsPerDay);
    let sum = 0;
    for (let s = 0; s < stepsPerDay; s++) {
      const clock = ((s + 0.5) * o.dt) / 3600; // mid-step
      const w = (clock - noonClock) * 15 * D2R;
      wArr[s] = w;
      shape[s] = Math.abs(w) < ws ? Math.max(0, rt(w)) : 0;
      sum += shape[s] * (o.dt / 3600);
    }
    for (let s = 0; s < stepsPerDay; s++) shape[s] = sum > 0 ? shape[s] / sum : 0;

    const snapStart = o.coldSnap ? o.days - o.snapDays : Infinity;
    for (let i = 0; i < N; i++) {
      const day = Math.floor(i / stepsPerDay), s = i % stepsPerDay;
      const clock = ((s + 0.5) * o.dt) / 3600;
      const snap = day >= snapStart;
      const tmin = c.t_min[m] + o.tempShift - (snap ? o.snapDrop : 0), tmax = c.t_max[m] + o.tempShift - (snap ? o.snapDrop : 0);
      let t;
      if (clock >= sunrise && clock <= tMax) t = tmin + (tmax - tmin) * (1 - Math.cos((Math.PI * (clock - sunrise)) / (tMax - sunrise))) / 2;
      else { const since = clock > tMax ? clock - tMax : clock + 24 - tMax; t = tmax - (tmax - tmin) * (1 - Math.cos((Math.PI * since) / (sunrise + 24 - tMax))) / 2; }
      T[i] = t; hourOf[i] = clock; dayOf[i] = day;

      const Hd = snap ? H * o.snapSolar : H;
      const cloud = snap && o.snapSolar < 1 ? Math.min(1, cloudBase + 0.5) : cloudBase;
      const w = wArr[s];
      const cz = Math.sin(decl) * Math.sin(lat) + Math.cos(decl) * Math.cos(lat) * Math.cos(w);
      const gh = Hd * shape[s];                  // W/m2 (Wh per hour)
      G[i] = gh; sunUp[i] = cz > 0.01 && gh > 0 ? 1 : 0;
      let dni = 0, dhi = gh;
      if (sunUp[i]) {
        const g0 = G0n * cz;
        const kt = Math.min(1, gh / Math.max(1, g0));
        dhi = erbs(kt) * gh;
        dni = Math.min(1100, (gh - dhi) / Math.max(0.087, cz)); // cap near the horizon
      }
      // solar azimuth from south, west positive (Duffie & Beckman eq. 1.6.6)
      const sz = Math.sqrt(Math.max(1e-9, 1 - cz * cz));
      const gs = sunUp[i] ? Math.sign(w || 1e-9) * Math.abs(Math.acos(Math.max(-1, Math.min(1, (cz * Math.sin(lat) - Math.sin(decl)) / (sz * Math.cos(lat)))))) : 0;
      for (let f = 0; f < 4; f++) {
        const ci = sunUp[i] ? Math.max(0, cosIncidence(decl, lat, 90 * D2R, facAz[f], w)) : 0;
        Ib[f][i] = dni * ci;
        I[f][i] = dni * ci + dhi * 0.5 + gh * albedo * 0.5;
        const cd = Math.cos(gs - facAz[f]);
        tanP[f][i] = sunUp[i] && cd > 1e-3 ? (cz / sz) / cd : 0; // tan(altitude)/cos(azimuth difference)
      }
      I[4][i] = gh; // flat roof
      const TaK = t + 273.15, TsClear = 0.0552 * Math.pow(TaK, 1.5);
      Tsky[i] = Math.pow(cloud * TaK ** 4 + (1 - cloud) * TsClear ** 4, 0.25) - 273.15;
    }
    return {
      site: c, month: m, dt: o.dt, days: o.days, stepsPerDay, N, T, Tsky, G, I, Ib, tanP, sunUp, hourOf, dayOf,
      tGround, wind: c.wind[m], rh: c.rh[m], rho: airDensity(c.elev_m), elev: c.elev_m,
      sunrise, sunset: sunrise + dayLen, noonClock, dayLen, albedo, cloud: cloudBase, H,
    };
  }

  /** Saturation vapour pressure over water/ice, Pa (Magnus form, ISO 13788 Annex E). */
  function psat(t) { return t >= 0 ? 610.5 * Math.exp((17.269 * t) / (237.3 + t)) : 610.5 * Math.exp((21.875 * t) / (265.5 + t)); }
  function dewPoint(p) { // inverse of psat
    if (p >= 610.5) { const x = Math.log(p / 610.5); return (237.3 * x) / (17.269 - x); }
    const x = Math.log(p / 610.5); return (265.5 * x) / (21.875 - x);
  }

  /** Heating and cooling degree-days (base 18 °C) from monthly means. */
  function degreeDays(key) {
    const c = site(key), days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let hdd = 0, cdd = 0;
    c.t_mean.forEach((t, i) => { hdd += Math.max(0, 18 - t) * days[i]; cdd += Math.max(0, t - 24) * days[i]; });
    return { hdd, cdd };
  }

  /** Design season: heating for cold sites, cooling for hot ones. */
  function season(key) {
    const c = site(key), { hdd, cdd } = degreeDays(key);
    const coldest = c.t_mean.indexOf(Math.min(...c.t_mean)), hottest = c.t_max.indexOf(Math.max(...c.t_max));
    return hdd > cdd * 1.5 ? { mode: 'heating', month: coldest, hdd, cdd } : { mode: 'cooling', month: hottest, hdd, cdd };
  }

  TB.climate = { site, weather, airDensity, psat, dewPoint, degreeDays, season, SIGMA, REP_DAY, cosIncidence, solarGeometry };
})(typeof globalThis !== 'undefined' ? globalThis : this);
