/**
 * ThermaBuild engine: safety, comfort, fuel and livestock checks.
 *
 * - Fresh air: combustion appliances need at least 0.5 air changes per hour. The optimiser can
 *   never select a design below it.
 * - Carbon dioxide from occupants: steady-state mass balance, 420 ppm outdoors, 0.0052 L/s CO2 per
 *   sedentary adult (ASHRAE 62.1 background).
 * - Carbon monoxide: steady state for a worst case, an unflued kerosene heater. The emission factor
 *   is an assumption (see EF_CO) and is shown to the user; WHO indoor guideline 7 mg/m3 (24 h).
 * - Surface condensation and mould: ISO 13788 humidity classes and the 80 % surface humidity limit.
 * - Thermal comfort: PMV per ISO 7730 (Fanger).
 */
(function (g) {
  'use strict';
  const TB = (g.TB = g.TB || {});
  const C = () => TB.climate;

  const MIN_ACH_COMBUSTION = 0.5;
  const EF_CO = 50;             // mg CO per MJ of kerosene burnt, unflued heater. Assumption, order of magnitude.
  const WHO_CO_24H = 7;         // mg/m3, WHO (2010) indoor air quality guidelines
  const WHO_MIN_INDOOR = 18;    // °C, WHO Housing and Health Guidelines (2018)
  const KEROSENE = { MJperL: 34.5, kgCO2perL: 2.5, stoveEff: 0.55 }; // LHV 43.1 MJ/kg × 0.80 kg/L; IPCC 2006 factor 71.9 t/TJ

  // ISO 13788 Annex A: indoor vapour excess (Pa) at θe ≤ 0 °C, falling linearly to 0 at 20 °C.
  const HUMIDITY_CLASS = { 1: 270, 2: 540, 3: 810, 4: 1080, 5: 1305 };

  function vapourExcess(cls, te) { const d = HUMIDITY_CLASS[cls] || 810; return te <= 0 ? d : te >= 20 ? 0 : d * (1 - te / 20); }

  /**
   * Surface humidity check for an element with U at room temperature ti and outdoor te, rh (0-100).
   * Indoor vapour: outdoor vapour plus moisture production G (g/h) diluted by the fresh-air flow Q (m3/h),
   * Δp = (G/Q)·Rv·T (ISO 13788 Annex A method), with the standard 1.1 safety factor. If G or Q is
   * missing, the ISO 13788 humidity class is used instead.
   * Returns inside surface temperature, surface RH, dew point and verdicts.
   */
  function surfaceCheck(U, ti, te, rh, cls, G, Q) {
    const pe = (rh / 100) * C().psat(te);
    const dp = G != null && Q ? ((G / 1000) / Q) * 461.5 * (ti + 273.15) : vapourExcess(cls, te);
    const pi = Math.min(C().psat(ti), pe + 1.1 * dp);
    const tsi = ti - (ti - te) * U * 0.25;
    const rhs = Math.min(100, (pi / C().psat(tsi)) * 100);
    const dew = C().dewPoint(pi);
    return { tsi, rhs, dew, pi, condensation: tsi < dew, mould: rhs >= 80, rhIndoor: Math.min(100, (pi / C().psat(ti)) * 100) };
  }
  /** Moisture production, g/h: 50 g/h per person (ISO 13788 Annex A typical) plus cooking and washing. */
  function moisture(people, type) { return people * 50 + ({ home: 250, school: 100, shelter: 200, post: 150 }[type] || 100); }

  /** CO2 (ppm) for n people in a room of volume V m3 at ACH. */
  function co2(n, V, ach) { const Q = Math.max(1e-6, ach * V); return 420 + (1e6 * n * 0.0052e-3 * 3600) / Q; } // Q in m3/h

  /** Steady-state CO (mg/m3) if the heating load were met by an unflued kerosene heater. */
  function coUnflued(heatW, V, ach) {
    const MJh = (heatW / KEROSENE.stoveEff) * 3600 / 1e6;
    return (EF_CO * MJh) / Math.max(1e-6, ach * V);
  }

  /** Fanger PMV, ISO 7730. ta, tr °C; vel m/s; rh %; met; clo. */
  function pmv(ta, tr, vel, rh, met, clo) {
    const pa = rh * 10 * Math.exp(16.6536 - 4030.183 / (ta + 235));
    const icl = 0.155 * clo, m = met * 58.15, w = 0, mw = m - w;
    const fcl = icl <= 0.078 ? 1 + 1.29 * icl : 1.05 + 0.645 * icl;
    const hcf = 12.1 * Math.sqrt(vel), taa = ta + 273, tra = tr + 273;
    let tcla = taa + (35.5 - ta) / (3.5 * icl + 0.1);
    const p1 = icl * fcl, p2 = p1 * 3.96, p3 = p1 * 100, p4 = p1 * taa, p5 = 308.7 - 0.028 * mw + p2 * Math.pow(tra / 100, 4);
    let xn = tcla / 100, xf = xn, hc = hcf, n = 0;
    do {
      xf = (xf + xn) / 2;
      const hcn = 2.38 * Math.pow(Math.abs(100 * xf - taa), 0.25);
      hc = hcf > hcn ? hcf : hcn;
      xn = (p5 + p4 * hc - p2 * Math.pow(xf, 4)) / (100 + p3 * hc);
      if (++n > 150) break;
    } while (Math.abs(xn - xf) > 0.00015);
    const tcl = 100 * xn - 273;
    const hl1 = 3.05 * 0.001 * (5733 - 6.99 * mw - pa), hl2 = mw > 58.15 ? 0.42 * (mw - 58.15) : 0;
    const hl3 = 1.7 * 0.00001 * m * (5867 - pa), hl4 = 0.0014 * m * (34 - ta);
    const hl5 = 3.96 * fcl * (Math.pow(xn, 4) - Math.pow(tra / 100, 4)), hl6 = fcl * hc * (tcl - ta);
    const ts = 0.303 * Math.exp(-0.036 * m) + 0.028;
    const v = ts * (mw - hl1 - hl2 - hl3 - hl4 - hl5 - hl6);
    return { pmv: v, ppd: 100 - 95 * Math.exp(-0.03353 * v ** 4 - 0.2179 * v ** 2) };
  }

  function pmvLabel(v) {
    if (v < -2.5) return 'cold'; if (v < -1.5) return 'cool'; if (v < -0.5) return 'slightly cool';
    if (v <= 0.5) return 'comfortable'; if (v <= 1.5) return 'slightly warm'; if (v <= 2.5) return 'warm'; return 'hot';
  }

  function coldLabel(t) {
    if (t < 0) return { level: 'danger', text: 'Below freezing indoors. Water pipes freeze and hypothermia is a real risk for infants and the elderly.' };
    if (t < 8) return { level: 'warn', text: 'Very cold indoors. Needs heating through the night.' };
    if (t < 14) return { level: 'caution', text: 'Cool indoors. Warm bedding and a small stove in the evening are enough.' };
    return { level: 'ok', text: 'Comfortable for sleeping with normal bedding.' };
  }

  /** Kerosene litres, cost and CO2 to deliver `kWh` of useful heat. */
  function fuel(kWh, pricePerL) {
    const L = (kWh * 3.6) / (KEROSENE.MJperL * KEROSENE.stoveEff);
    return { litres: L, rupees: L * (pricePerL || 85), co2kg: L * KEROSENE.kgCO2perL };
  }

  // ---------- livestock ----------
  // mass kg; LCT °C (lower critical temperature, dry and calm; approximate, NRC 1981 and Yousef 1985);
  // newborn LCT; minimum winter ventilation m3/h per head (moisture control, approx. MWPS-32/33 rates);
  // covered floor m2 per head.
  const SPECIES = {
    cattle:  { label: 'Dairy cattle', mass: 400, lct: -10, lctYoung: 10, vent: 85, floor: 4.5, young: 'calves' },
    yak:     { label: 'Yak', mass: 250, lct: -30, lctYoung: -5, vent: 60, floor: 3.5, young: 'yak calves' },
    goat:    { label: 'Goats and sheep', mass: 40, lct: -3, lctYoung: 15, vent: 30, floor: 1.4, young: 'kids and lambs' },
    poultry: { label: 'Poultry', mass: 1.8, lct: 13, lctYoung: 30, vent: 0.8, floor: 0.12, young: 'chicks' },
  };
  /** Sensible heat per head, W: CIGR (2002) maintenance 5.6·m^0.75, ×1.2 activity, 75 % sensible in cold. */
  function animalHeat(sp) { const s = SPECIES[sp]; return 0.75 * 1.2 * 5.6 * Math.pow(s.mass, 0.75); }
  /** Temperature-humidity index (NRC 1971). */
  function thi(t, rh) { return 1.8 * t + 32 - (0.55 - 0.0055 * rh) * (1.8 * t - 26); }
  function thiLabel(v) { return v < 72 ? 'comfortable' : v < 79 ? 'mild stress' : v < 89 ? 'severe stress' : 'danger'; }

  TB.safety = {
    MIN_ACH_COMBUSTION, EF_CO, WHO_CO_24H, WHO_MIN_INDOOR, KEROSENE, HUMIDITY_CLASS,
    vapourExcess, surfaceCheck, moisture, co2, coUnflued, pmv, pmvLabel, coldLabel, fuel, SPECIES, animalHeat, thi, thiLabel,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
