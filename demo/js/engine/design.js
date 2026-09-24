/**
 * ThermaBuild engine: building types, room layouts and design variables → network spec.
 */
(function (g) {
  'use strict';
  const TB = (g.TB = g.TB || {});
  const MAT = () => TB.materials;

  // Building types. per10m2 = occupants per 10 m² of floor, internal gains, humidity class (ISO 13788), whether a stove is used.
  const TYPES = {
    home:      { label: 'Family home', use: 'home', per10m2: 0.35, gainsWm2: 2.5, humidityClass: 3, stove: true, setpoint: 16, setback: null, heatHours: [6, 22], heatRooms: 'living' },
    school:    { label: 'School or community hall', use: 'school', per10m2: 4, gainsWm2: 3, humidityClass: 3, stove: true, setpoint: 16, setback: null, heatHours: [8, 15], heatRooms: 'all' },
    shelter:   { label: 'Disaster-relief shelter', use: 'shelter', per10m2: 2.5, gainsWm2: 1.5, humidityClass: 4, stove: true, setpoint: 12, setback: null, heatHours: null, heatRooms: 'all' },
    post:      { label: 'High-altitude post', use: 'post', per10m2: 2, gainsWm2: 3, humidityClass: 4, stove: true, setpoint: 15, setback: 12, heatHours: null, heatRooms: 'all' },
    livestock: { label: 'Livestock shelter', use: 'livestock', per10m2: 0, gainsWm2: 0, humidityClass: 5, stove: false, setpoint: null, setback: null },
  };

  /** The "ordinary build" each type is compared against. */
  const BASELINE = {
    home:      { wall: 'conc_block', ins: 0, roof: 'rcc_bare', floor: 'concrete', glazing: 'single', wwrS: 0.15, trombe: false, ach: 1.5, orientation: 0, aspect: 1.2, shutters: false, label: 'Ordinary concrete-block house' },
    school:    { wall: 'conc_block', ins: 0, roof: 'rcc_bare', floor: 'concrete', glazing: 'single', wwrS: 0.2, trombe: false, ach: 1.5, orientation: 0, aspect: 1.5, shutters: false, label: 'Ordinary concrete-block school' },
    shelter:   { wall: 'cgi_hut', ins: 0, roof: 'cgi_bare', floor: 'timber_raised', glazing: 'single', wwrS: 0.05, trombe: false, ach: 3.0, orientation: 0, aspect: 2, shutters: false, label: 'Uninsulated sheet-metal hut' },
    post:      { wall: 'cgi_hut', ins: 0, roof: 'cgi_bare', floor: 'timber_raised', glazing: 'single', wwrS: 0.05, trombe: false, ach: 2.5, orientation: 0, aspect: 2, shutters: false, label: 'Uninsulated sheet-metal hut' },
    livestock: { wall: 'stone', ins: 0, roof: 'cgi_bare', floor: 'earth', glazing: 'polycarb', wwrS: 0.0, trombe: false, ach: 8, orientation: 0, aspect: 2, shutters: false, label: 'Stone pen with a sheet roof' },
  };

  /**
   * Passive-solar room layout for a rectangular footprint.
   * width runs east–west (the long south face), depth runs north–south.
   * Living rooms and bedrooms go in the south band; kitchen, store and bath form a north buffer.
   */
  function layout(opt) {
    const W = opt.width, D = opt.depth, h = opt.height || 2.7;
    if (opt.single) {
      return { zones: [{ name: 'Whole building', area: W * D, height: h, fac: { S: W, N: W, E: D, W: D }, type: 'all' }], links: [], perimeter: 2 * (W + D), width: W, depth: D };
    }
    const bed = opt.bedrooms || 2;
    const sDepth = Math.min(D * 0.58, Math.max(3.2, D - 3));
    const nDepth = D - sDepth;
    const south = ['Living'].concat(Array.from({ length: Math.min(bed, 3) }, (_, i) => (i === 0 ? 'Main bedroom' : `Bedroom ${i + 1}`)));
    const north = ['Kitchen', 'Store and bath'].concat(bed > 3 ? ['Bedroom 4'] : []);
    const zones = [], links = [];
    const band = (names, y0, depth, side) => {
      const w = W / names.length, first = zones.length;
      names.forEach((nm, i) => {
        zones.push({
          name: nm, area: w * depth, height: h, x: i * w, y: y0, w, d: depth, band: side,
          fac: { S: side === 'S' ? w : 0, N: side === 'N' ? w : 0, W: i === 0 ? depth : 0, E: i === names.length - 1 ? depth : 0 },
          type: /bed/i.test(nm) ? 'bedroom' : /living/i.test(nm) ? 'living' : /kitchen/i.test(nm) ? 'kitchen' : 'service',
        });
        if (i > 0) links.push({ a: first + i - 1, b: first + i, area: depth * h });
      });
      return [first, names.length, w];
    };
    const [s0, sn, sw] = band(south, 0, sDepth, 'S');
    const [n0, nn, nw] = band(north, sDepth, nDepth, 'N');
    for (let i = 0; i < sn; i++) for (let j = 0; j < nn; j++) {
      const ov = Math.max(0, Math.min((i + 1) * sw, (j + 1) * nw) - Math.max(i * sw, j * nw));
      if (ov > 0.05) links.push({ a: s0 + i, b: n0 + j, area: ov * h });
    }
    return { zones, links, perimeter: 2 * (W + D), width: W, depth: D };
  }

  /** Footprint for a floor area and aspect ratio (width/depth), width along the south face. */
  function footprint(area, aspect) { const d = Math.sqrt(area / aspect); return { width: d * aspect, depth: d }; }

  /**
   * Design variables → network spec.
   * v: { wall, ins, insKey, roof, floor, glazing, wwrS, trombe, ach, shutters, orientation, aspect }
   * ctx: { area, type, layout (optional, from layout() or a parsed plan), occupants }
   */
  function spec(v, ctx) {
    const m = MAT(), T = TYPES[ctx.type || 'home'];
    const lay = ctx.layout || layout(Object.assign(footprint(ctx.area, v.aspect || 1.3), { single: ctx.single !== false, bedrooms: ctx.bedrooms }));
    const area = lay.zones.reduce((a, z) => a + z.area, 0);
    const occupants = ctx.occupants != null ? ctx.occupants : Math.max(1, Math.round((area / 10) * T.per10m2));
    // share occupants by room area (bedrooms and living take them)
    const living = lay.zones.filter((z) => z.type !== 'service' && z.type !== 'kitchen');
    const livingArea = (living.length ? living : lay.zones).reduce((a, z) => a + z.area, 0);
    lay.zones.forEach((z) => { z.occupants = (living.length ? living.includes(z) : true) ? (occupants * z.area) / livingArea : 0; });
    const trombe = v.trombe ? m.trombe(v.trombeMass || 'rammed_earth', v.glazing === 'single' ? 'double' : v.glazing) : null;
    return {
      zones: lay.zones, links: lay.links, perimeter: lay.perimeter,
      wall: m.wall(v.wall, v.ins || 0, v.insKey), roof: m.roof(v.roof), floor: m.floor(v.floor), glazing: v.glazing,
      wwr: { S: v.wwrS, N: v.wwrN != null ? v.wwrN : 0.05, E: v.wwrE != null ? v.wwrE : 0.08, W: v.wwrW != null ? v.wwrW : 0.08 },
      trombe, trombeFrac: v.trombe ? (v.trombeFrac || 0.45) : 0,
      ach: v.ach, shutters: !!v.shutters, overhang: v.overhang || 0, use: T.use, gainsWm2: T.gainsWm2, heatPerOcc: ctx.heatPerOcc || 75,
      occupants, type: ctx.type || 'home', area,
    };
  }

  /** Bill of quantities and cost for a spec. */
  function quantities(sp, v) {
    const m = MAT();
    const h = sp.zones[0].height || 2.7;
    let wallGross = 0, win = 0;
    sp.zones.forEach((z) => ['S', 'W', 'N', 'E'].forEach((f) => { const a = (z.fac[f] || 0) * h; wallGross += a; win += a * (sp.wwr[f] || 0); }));
    const trombeA = sp.trombe ? sp.zones.reduce((a, z) => a + Math.min(z.fac.S * h * sp.trombeFrac, Math.max(0, z.fac.S * h * (1 - sp.wwr.S)) * 0.95), 0) : 0;
    const wallA = Math.max(0, wallGross - win - trombeA), roofA = sp.area, floorA = sp.area;
    const gl = m.GLAZING[sp.glazing];
    const lines = [];
    const add = (part, what, qty, unit, rate, carbonPer) => lines.push({ part, what, qty, unit, rate, cost: qty * rate, carbon: qty * (carbonPer || 0) });
    add('Walls', `${sp.wall.label}${v.ins ? ` + ${Math.round(v.ins * 1000)} mm ${v.insKey === 'wool_felt' ? 'wool felt' : 'EPS'} outside` : ''}`, wallA, 'm²', sp.wall.cost, sp.wall.carbon);
    add('Roof', sp.roof.label, roofA, 'm²', sp.roof.cost, sp.roof.carbon);
    add('Floor', sp.floor.label, floorA, 'm²', sp.floor.cost, sp.floor.carbon);
    add('Windows', gl.label, win, 'm²', gl.cost, gl.carbon);
    if (sp.trombe) add('Trombe wall', `300 mm dark ${sp.trombe.mass.replace('_', ' ')} behind ${m.GLAZING[sp.trombe.glazing].label.toLowerCase()}`, trombeA, 'm²', sp.trombe.cost, sp.trombe.carbon);
    if (sp.shutters) add('Night shutters', 'Insulated timber shutters or quilted curtains', win, 'm²', 1200, 6);
    const airtight = { 0.3: 'Sealed: taped joints, gasketed doors, airlock entry', 0.6: 'Careful: sealed frames and door seals', 1.0: 'Standard workmanship' };
    const key = Object.keys(airtight).map(Number).reduce((a, b) => (Math.abs(b - v.ach) < Math.abs(a - v.ach) ? b : a), 1.0);
    const airCost = v.ach <= 0.35 ? 450 : v.ach <= 0.7 ? 220 : 0;
    if (airCost) add('Airtightness', airtight[key], sp.area, 'm² floor', airCost, 1);
    const total = lines.reduce((a, l) => a + l.cost, 0), carbon = lines.reduce((a, l) => a + l.carbon, 0);
    // rough counts for the site team
    const counts = {};
    if (/mud_brick/.test(sp.wall.key)) counts.bricks = Math.round(wallA * 0.45 / (0.4 * 0.2 * 0.15) * 1.05);
    if (/rammed_earth/.test(sp.wall.key)) counts.earthM3 = +(wallA * 0.45).toFixed(1);
    if (/stone/.test(sp.wall.key)) counts.stoneM3 = +(wallA * 0.45).toFixed(1);
    if (v.ins) counts.insulationM3 = +(wallA * v.ins + (/_ins|cool/.test(sp.roof.key) ? roofA * 0.1 : 0)).toFixed(1);
    return { lines, total, carbon, wallA, win, trombeA, roofA, floorA, counts };
  }

  /** Heating pattern for a building type: which rooms get the stove and when. */
  function heating(type, zones) {
    const T = TYPES[type];
    let on = zones.map(() => true);
    if (T.heatRooms === 'living') { const l = zones.map((z) => z.type === 'living' || z.type === 'kitchen' || z.type === 'all'); if (l.some(Boolean)) on = l; }
    return { setpoint: T.setpoint, setback: T.setback, heatHours: T.heatHours, heatZones: on,
      text: `${T.heatRooms === 'living' ? 'the living room and kitchen' : 'every room'} at ${T.setpoint} °C${T.heatHours ? ` from ${T.heatHours[0]}:00 to ${T.heatHours[1]}:00` : ' day and night'}${T.setback ? ` (${T.setback} °C late at night)` : ''}` };
  }

  TB.design = { TYPES, heating, BASELINE, layout, footprint, spec, quantities };
})(typeof globalThis !== 'undefined' ? globalThis : this);
