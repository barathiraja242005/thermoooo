/**
 * ThermaBuild: the 3D house in step 4, built from the engine's design.
 *
 * Geometry comes from TBApp.design3D(): the room layout, every wall, roof and floor layer at its
 * real thickness, windows sized from the south/other glass shares, the Trombe wall, overhang,
 * night shutters, a bukhari flue and the sized fresh-air vent. The sun moves on the real path
 * for the site and design month. Views: model, infrared (heat escaping through each surface,
 * W/m², from the simulated room and outdoor temperatures), frame, exploded layers, roof off with
 * rooms coloured by temperature. Labels carry the engine's numbers.
 *
 * Replaces the home viewer in viewer3d.js; the livestock viewer there is unchanged.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D2R = Math.PI / 180;
  const fmtT = (x) => `${x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)} °C`;
  const H = {
    ready: false, time: 13, season: 'winter', mode: 'realistic', view: 'whole', labelsOn: true, playing: false,
    explode: 0, explodeTarget: 0, parts: [], labels: [], heatSurfaces: [], rooms: [], data: null, building: false, shutters: [],
  };
  window.TBHouse = H;

  // ---------- procedural textures ----------
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]);
    if (t.colorSpace !== undefined) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const TEX = {};
  function tex(kind) {
    if (TEX[kind]) return TEX[kind];
    const make = {
      whitewash: (g, w, h) => { g.fillStyle = '#F2EEE6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,100,80,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 2 + rnd() * 6); } },
      mudplaster: (g, w, h) => { g.fillStyle = '#CBB08E'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${90 + rnd() * 40},${60 + rnd() * 30},30,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 1 + rnd() * 4); } },
      stone: (g, w, h) => { g.fillStyle = '#6F6C66'; g.fillRect(0, 0, w, h); let y = 0; while (y < h) { const rh = 18 + rnd() * 16; let x = -rnd() * 30; while (x < w) { const rw = 26 + rnd() * 40; const v = 120 + rnd() * 50; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x + 2, y + 2, rw - 4, rh - 4); x += rw; } y += rh; } },
      brick: (g, w, h) => { g.fillStyle = '#D8CFC2'; g.fillRect(0, 0, w, h); const bh = 16, bw = 44; for (let r = 0; r * bh < h; r++) for (let x = (r % 2) * -bw / 2; x < w; x += bw) { const v = rnd() * 30; g.fillStyle = `rgb(${170 + v},${92 + v / 2},${60 + v / 3})`; g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); } },
      block: (g, w, h) => { g.fillStyle = '#B9B7B0'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(80,80,80,.35)'; g.lineWidth = 2; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 40; x < w; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } },
      steel: (g, w, h) => { for (let x = 0; x < w; x += 8) { const v = 150 + 40 * Math.sin(x / 8 * Math.PI); g.fillStyle = `rgb(${v},${v + 4},${v + 8})`; g.fillRect(x, 0, 8, h); } },
      snow: (g, w, h) => { g.fillStyle = '#EEF1F4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(150,165,185,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 10, 1 + rnd() * 5); } },
      earth: (g, w, h) => { g.fillStyle = '#CDB896'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(110,85,50,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 2 + rnd() * 6); } },
      twigs: (g, w, h) => { g.fillStyle = '#4B3A2B'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${110 + rnd() * 60},${80 + rnd() * 40},50,.8)`; g.lineWidth = 1 + rnd(); g.beginPath(); const x = rnd() * w, y = rnd() * h; g.moveTo(x, y); g.lineTo(x + 20 + rnd() * 40, y + (rnd() - 0.5) * 6); g.stroke(); } },
    }[kind];
    TEX[kind] = canvasTex(256, 256, make);
    return TEX[kind];
  }

  // Layer colours shared with the report's section swatches
  const LAYER_COL = { rammed_earth: '#B98A5E', mud_brick: '#A87B55', stone: '#8D8A82', cseb: '#A87B55', straw_bale: '#E1C878', conc_block: '#B5B5AE', brick: '#B8623C', eps: '#F2EFA8', wool_felt: '#EFE6D2', lime_plaster: '#EDE7DA', mud_plaster: '#D9C7A8', mud_screed: '#9C7A55', grass_twig: '#C9B27A', poplar: '#D8B27A', rcc: '#A9A9A2', gravel: '#C4C0B6', steel_sheet: '#7E858C', aac: '#D5D8D6', rock_wool: '#E9CF6B', cork: '#B98B5E', clt: '#D8B27A', wood_fibre: '#C9A77F', soil: '#6E5237', clay_tile: '#B8623C', air_gap: '#E9EEF2', timber_floor: '#C9A77F' };
  const outerFinish = (layers) => {
    const k = layers[0][0];
    if (k === 'eps' || k === 'rock_wool' || k === 'wool_felt' || k === 'lime_plaster') return { map: tex('whitewash'), color: '#FFFFFF' };
    if (k === 'mud_plaster') return { map: tex('mudplaster'), color: '#FFFFFF' };
    if (k === 'stone') return { map: tex('stone'), color: '#FFFFFF' };
    if (k === 'brick') return { map: tex('brick'), color: '#FFFFFF' };
    if (k === 'steel_sheet') return { map: tex('steel'), color: '#FFFFFF' };
    if (k === 'conc_block') return { map: tex('block'), color: '#FFFFFF' };
    return { color: LAYER_COL[k] || '#D9C8A9' };
  };

  // ---------- small helpers ----------
  const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.92, metalness: 0 }, o));
  function box(w, h, d, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = true; b.receiveShadow = true; return b; }
  function part(obj, kind, info, explode) {
    obj.userData.kind = kind; obj.userData.info = info || null; obj.userData.base = obj.position.clone(); obj.userData.explode = explode || new THREE.Vector3();
    H.parts.push(obj); H.root.add(obj); return obj;
  }
  function label(text, anchor, opts) {
    const el = document.createElement('div'); el.className = `l3 ${opts && opts.cls ? opts.cls : ''}`; el.innerHTML = text;
    $('l3-layer').appendChild(el);
    const L = { el, anchor: anchor.clone(), follow: opts && opts.follow, only: opts && opts.only, n: opts && opts.n ? opts.n.clone() : null, prio: H.labels.length }; H.labels.push(L); return L;
  }
  function spriteText(txt, color) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.font = '600 72px "IBM Plex Sans", system-ui, sans-serif'; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 68);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false })); s.scale.set(2.2, 2.2, 1); return s;
  }

  // ---------- sun ----------
  function sunAt(month, clock) {
    const site = H.data.site, lat = site.lat * D2R;
    const { decl, eot } = TB.climate.solarGeometry(TB.climate.REP_DAY[month]);
    const noon = 12 - (4 * (site.lon - 82.5) + eot) / 60, w = (clock - noon) * 15 * D2R;
    const cz = Math.sin(decl) * Math.sin(lat) + Math.cos(decl) * Math.cos(lat) * Math.cos(w);
    const alt = Math.asin(Math.max(-1, Math.min(1, cz))), sz = Math.sqrt(Math.max(1e-9, 1 - cz * cz));
    const gs = Math.sign(w || 1e-9) * Math.acos(Math.max(-1, Math.min(1, (cz * Math.sin(lat) - Math.sin(decl)) / (sz * Math.cos(lat)))));
    return { alt, gs, dir: new THREE.Vector3(-Math.sin(gs) * Math.cos(alt), Math.sin(alt), Math.cos(gs) * Math.cos(alt)).normalize(), noon };
  }
  const monthNow = () => (H.season === 'summer' ? H.data.site.t_max.indexOf(Math.max(...H.data.site.t_max)) : H.data.site.t_mean.indexOf(Math.min(...H.data.site.t_mean)));

  // ---------- scene ----------
  function initScene() {
    const container = $('viewer-3d');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 600);
    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2)); r.setSize(container.clientWidth, container.clientHeight);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    if (r.outputColorSpace !== undefined) r.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = ''; container.appendChild(r.domElement);
    let layer = $('l3-layer'); if (!layer) { layer = document.createElement('div'); layer.id = 'l3-layer'; layer.className = 'l3-layer'; $('viewer-3d-container').appendChild(layer); }
    H.hemi = new THREE.HemisphereLight('#E4EDF7', '#B9B1A4', 0.9); scene.add(H.hemi);
    H.sun = new THREE.DirectionalLight('#FFF3DE', 2.4); H.sun.castShadow = true; H.sun.shadow.mapSize.set(2048, 2048);
    H.sun.shadow.bias = -0.0004; H.sun.shadow.normalBias = 0.05; Object.assign(H.sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 140 }); scene.add(H.sun); scene.add(H.sun.target);
    // sun disc with glow
    const glow = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.25, 'rgba(255,236,190,.95)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    H.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, depthWrite: false, fog: false })); H.sunSprite.scale.set(22, 22, 1); scene.add(H.sunSprite);
    // stars for the night
    const sp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const th = rnd() * Math.PI * 2, ph = rnd() * 1.2; sp[i * 3] = 280 * Math.cos(th) * Math.sin(ph); sp[i * 3 + 1] = 280 * Math.cos(ph) + 20; sp[i * 3 + 2] = 280 * Math.sin(th) * Math.sin(ph); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    H.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false })); scene.add(H.stars);
    H.scene = scene; H.camera = camera; H.renderer = r;
    H.orbit = orbit(r.domElement, camera, new THREE.Vector3(0, 1.4, 0));
    new ResizeObserver(() => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); r.setSize(w, h); }).observe(container);
    r.domElement.addEventListener('click', pick);
    H.ready = true;
    let last = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (H.playing) { H.time += dt * 1.4; if (H.time > 20) H.time = 5; const s = $('sun-time'); if (s) s.value = Math.min(18.5, Math.max(6, H.time)); updateTime(); }
      if (Math.abs(H.explode - H.explodeTarget) > 1e-3) { H.explode += (H.explodeTarget - H.explode) * Math.min(1, dt * (reduceMotion ? 60 : 5)); applyExplode(); }
      H.shutters.forEach((s) => { s.rotation.y += (s.userData.target - s.rotation.y) * Math.min(1, dt * 4); });
      H.orbit.tick(dt);
      r.render(scene, camera);
      placeLabels();
    })(last);
  }

  function orbit(el, camera, target) {
    const st = { theta: 0.5, phi: 1.2, radius: 24, drag: false, lx: 0, ly: 0, auto: !reduceMotion };
    const apply = () => { st.phi = Math.max(0.12, Math.min(1.45, st.phi)); st.radius = Math.max(8, Math.min(90, st.radius)); camera.position.set(target.x + st.radius * Math.sin(st.phi) * Math.sin(st.theta), target.y + st.radius * Math.cos(st.phi), target.z + st.radius * Math.sin(st.phi) * Math.cos(st.theta)); camera.lookAt(target); };
    el.addEventListener('pointerdown', (e) => { st.drag = true; st.auto = false; st.lx = e.clientX; st.ly = e.clientY; st.moved = 0; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (!st.drag) return; st.theta -= (e.clientX - st.lx) * 0.006; st.phi -= (e.clientY - st.ly) * 0.006; st.moved += Math.abs(e.clientX - st.lx) + Math.abs(e.clientY - st.ly); st.lx = e.clientX; st.ly = e.clientY; apply(); });
    el.addEventListener('pointerup', () => { st.drag = false; }); el.addEventListener('pointercancel', () => { st.drag = false; });
    el.addEventListener('wheel', (e) => { e.preventDefault(); st.radius *= 1 + Math.sign(e.deltaY) * 0.08; apply(); }, { passive: false });
    apply();
    return { st, apply, target, tick(dt) { if (st.auto) { st.theta += dt * 0.06; apply(); } }, zoom(f) { st.radius *= f; st.auto = false; apply(); }, home() { st.theta = 0.5; st.phi = 1.2; st.radius = H.fitR || 24; apply(); } };
  }

  // ---------- site: ground, mountains, boulders, compass, sun path ----------
  function buildSite() {
    if (H.site) H.scene.remove(H.site);
    const g = new THREE.Group(); H.site = g; H.scene.add(g);
    const cold = H.data.c.mode === 'heating' && H.data.site.t_mean[H.data.c.month] < 2;
    const gt = tex(cold ? 'snow' : 'earth'); gt.repeat.set(24, 24);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 64), mat({ map: gt, color: '#FFFFFF', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    // mountains: a ring of low-poly peaks, snow caps at cold sites
    const rock = mat({ color: cold ? '#8C8479' : '#B79B78', flatShading: true }), snow = mat({ color: '#F4F6F8', flatShading: true });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.2, R = 150 + rnd() * 70, h = 28 + rnd() * 46, rad = 30 + rnd() * 26;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 5 + Math.floor(rnd() * 3), 1), rock); m.position.set(Math.cos(a) * R, h / 2 - 2, Math.sin(a) * R); m.rotation.y = rnd() * 3; g.add(m);
      if (cold || h > 55) { const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.36, h * 0.36, m.geometry.parameters.radialSegments, 1), snow); cap.position.set(m.position.x, h - h * 0.18 - 2, m.position.z); cap.rotation.y = m.rotation.y; g.add(cap); }
    }
    // boulders
    const bm = mat({ color: '#4E4C49', flatShading: true });
    for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, R = 13 + rnd() * 22, s = 0.4 + rnd() * 0.9; const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), bm); b.position.set(Math.cos(a) * R, s * 0.45, Math.sin(a) * R); b.scale.y = 0.6; b.castShadow = true; b.receiveShadow = true; g.add(b); }
    // compass ring with N E S W
    const ring = new THREE.Mesh(new THREE.RingGeometry(11.6, 11.75, 96), new THREE.MeshBasicMaterial({ color: '#17152A', transparent: true, opacity: 0.35 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2, L = k % 9 === 0 ? 0.9 : 0.4; const t = new THREE.Mesh(new THREE.PlaneGeometry(0.06, L), new THREE.MeshBasicMaterial({ color: '#17152A', transparent: true, opacity: 0.4 })); t.rotation.x = -Math.PI / 2; t.rotation.z = -a; t.position.set(Math.sin(a) * (11.7 - L / 2), 0.035, -Math.cos(a) * (11.7 - L / 2)); g.add(t); }
    [['N', 0, window.TBTheme ? TBTheme.shades().brand : '#6D3FE0'], ['E', 90, '#17152A'], ['S', 180, '#17152A'], ['W', 270, '#17152A']].forEach(([s, deg, col]) => { const sp = spriteText(s, col); const a = deg * D2R; sp.position.set(Math.sin(a) * 13, 0.9, -Math.cos(a) * 13); g.add(sp); });
    drawSunPath();
  }
  function drawSunPath() {
    if (H.path) H.scene.remove(H.path);
    const grp = new THREE.Group(); const pts = [];
    const m = monthNow();
    for (let h = 4; h <= 20.01; h += 0.25) { const s = sunAt(m, h); if (s.alt > 0) pts.push(s.dir.clone().multiplyScalar(60)); }
    if (pts.length > 1) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#E4A63A', dashSize: 1.6, gapSize: 1, transparent: true, opacity: 0.9, fog: false })); line.computeLineDistances(); grp.add(line);
      for (let h = 6; h <= 18; h += 2) { const s = sunAt(m, h); if (s.alt <= 0) continue; const d = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), new THREE.MeshBasicMaterial({ color: '#E4A63A', fog: false })); d.position.copy(s.dir.clone().multiplyScalar(60)); grp.add(d); }
    }
    H.path = grp; H.scene.add(grp);
  }

  // ---------- the house ----------
  function polysOf(lay) {
    return lay.zones.map((z) => z.poly ? z.poly.map((p) => p.slice()) : [[z.x, z.y], [z.x + z.w, z.y], [z.x + z.w, z.y + z.d], [z.x, z.y + z.d]]);
  }
  function insidePoly([x, y], p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }

  function buildHouse() {
    const D = H.data, v = D.v, sp = D.sp, M = TB.materials;
    if (H.root) { H.scene.remove(H.root); }
    H.labels.forEach((l) => l.el.remove()); H.labels = []; H.parts = []; H.heatSurfaces = []; H.rooms = []; H.shutters = [];
    H.trombeAnchor = H.porchAnchor = H.flueAnchor = H.ventAnchor = null;
    H.root = new THREE.Group(); H.scene.add(H.root);
    const polys = polysOf(D.lay);
    // make polygons counter-clockwise in plan (x east, y north)
    polys.forEach((p) => { const a = p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0); if (a < 0) p.reverse(); });
    const all = polys.flat(); const minX = Math.min(...all.map((q) => q[0])), maxX = Math.max(...all.map((q) => q[0])), minY = Math.min(...all.map((q) => q[1])), maxY = Math.max(...all.map((q) => q[1]));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const P = ([x, y]) => new THREE.Vector2(x - cx, cy - y); // plan → scene (x east, z south)
    const hWall = 2.7, plinth = 0.45, y0 = plinth;
    const wallLayers = sp.wall.layers, wallT = wallLayers.reduce((a, l) => a + l[1], 0);
    const roofLayers = sp.roof.layers, floorLayers = sp.floor.layers;
    const tOf = (d) => Math.max(0.012, d);
    const cold = D.c.mode === 'heating';
    H.fitR = Math.max(15, Math.max(maxX - minX, maxY - minY) * 1.55);

    // --- external wall segments with facade and owning room
    const segs = [];
    polys.forEach((p, zi) => {
      for (let k = 0; k < p.length; k++) {
        const a = p[k], b = p[(k + 1) % p.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) continue;
        const nx = (b[1] - a[1]) / L, ny = -(b[0] - a[0]) / L;
        const probe = [(a[0] + b[0]) / 2 + nx * 0.35, (a[1] + b[1]) / 2 + ny * 0.35];
        if (polys.some((q, qi) => qi !== zi && insidePoly(probe, q))) continue;
        const ang = (Math.atan2(nx, ny) * 180) / Math.PI; const f = ang >= -45 && ang < 45 ? 'N' : ang >= 45 && ang < 135 ? 'E' : ang >= -135 && ang < -45 ? 'W' : 'S';
        segs.push({ a: P(a), b: P(b), pa: a, pb: b, L, f, zi, n: new THREE.Vector2(nx, -ny) }); // scene normal: (x, z) with z = -north
      }
    });
    // --- openings per facade
    const facLen = { S: 0, N: 0, E: 0, W: 0 }; segs.forEach((s) => (facLen[s.f] += s.L));
    const winW = 1.2, winH = 1.4, sill = 0.9;
    const trombeA = D.bom.trombeA || 0, trombeW = trombeA / 2.4;
    const doorFace = ({ north: 'N', south: 'S', east: 'E', west: 'W' })[(ThermaState.facing || 'north')] || 'N';
    const openings = new Map(); // seg → [{u, w, kind}]
    ['S', 'N', 'E', 'W'].forEach((f) => {
      const list = segs.filter((s) => s.f === f); if (!list.length) return;
      const nWin = Math.max(f === 'N' && !sp.wwr[f] ? 0 : 1, Math.round((facLen[f] * hWall * (sp.wwr[f] || 0)) / (winW * winH)));
      const feats = [];
      for (let i = 0; i < nWin; i++) feats.push({ kind: 'win', w: winW });
      if (f === 'S' && trombeW > 0.5) { const k = Math.max(1, Math.round(trombeW / 3)); for (let i = 0; i < k; i++) feats.splice(Math.floor(feats.length / 2) + i, 0, { kind: 'trombe', w: trombeW / k }); }
      if (f === doorFace) feats.splice(Math.floor(feats.length / 2), 0, { kind: 'door', w: 1.0 });
      // distribute features over the facade's segments by length
      let fi = 0;
      const total = facLen[f];
      list.forEach((s, si) => {
        const share = si === list.length - 1 ? feats.length - fi : Math.round((s.L / total) * feats.length);
        const mine = feats.slice(fi, fi + share); fi += share;
        let need = mine.reduce((a, q) => a + q.w, 0);
        while (need > s.L - 0.6 * (mine.length + 1) && mine.length) { const drop = mine.findIndex((q) => q.kind === 'win'); if (drop < 0) break; need -= mine[drop].w; mine.splice(drop, 1); }
        const gap = (s.L - need) / (mine.length + 1); let u = gap; const out = [];
        mine.forEach((q) => { out.push(Object.assign({}, q, { u })); u += q.w + gap; });
        openings.set(s, out);
      });
    });

    H.plan = { polys, segs, openings, wallT, hWall, plinth, bbox: { minX, maxX, minY, maxY }, winH, sill };
    // --- walls: each layer, cut around openings
    const wallMats = wallLayers.map(([k], i) => i === 0 ? mat(outerFinish(wallLayers)) : mat({ color: LAYER_COL[k] || '#ccc' }));
    const innerMat = mat({ color: '#EFE9DD' });
    segs.forEach((s) => {
      const dir = new THREE.Vector2().subVectors(s.b, s.a).normalize(), out = new THREE.Vector3(s.n.x, 0, s.n.y);
      const ops = openings.get(s) || [];
      const rot = Math.atan2(-dir.y, dir.x);
      let depth = 0;
      const segGroup = [];
      for (let li = wallLayers.length - 1; li >= 0; li--) { // inner → outer
        const [key, d] = wallLayers[li], t = tOf(d), mid = depth + t / 2; depth += t;
        const pieces = [];
        let u0 = 0;
        const pushPiece = (ua, ub, ya, yb) => { if (ub - ua > 0.01 && yb - ya > 0.01) pieces.push([ua, ub, ya, yb]); };
        ops.forEach((o) => {
          pushPiece(u0, o.u, 0, hWall);
          if (o.kind === 'win') { pushPiece(o.u, o.u + o.w, 0, sill); pushPiece(o.u, o.u + o.w, sill + winH, hWall); }
          else if (o.kind === 'door') { pushPiece(o.u, o.u + o.w, 2.1, hWall); }
          else if (o.kind === 'trombe') { pushPiece(o.u, o.u + o.w, 0, 0.15); pushPiece(o.u, o.u + o.w, 2.55, hWall); }
          u0 = o.u + o.w;
        });
        pushPiece(u0, s.L, 0, hWall);
        pieces.forEach(([ua, ub, ya, yb]) => {
          const m = box(ub - ua, yb - ya, t, li === wallLayers.length - 1 ? innerMat : wallMats[li]);
          const c = s.a.clone().add(dir.clone().multiplyScalar((ua + ub) / 2));
          m.position.set(c.x + out.x * mid, y0 + (ya + yb) / 2, c.y + out.z * mid);
          m.rotation.y = rot;
          if (li === 0) { m.material = wallMats[0]; if (wallMats[0].map) { m.material = wallMats[0].clone(); m.material.map = wallMats[0].map.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set((ub - ua) / 2.2, (yb - ya) / 2.2); } }
          part(m, 'wall', { f: s.f, layer: li, key, zi: s.zi, U: sp.wall.U }, out.clone().multiplyScalar(1.9 + (wallLayers.length - 1 - li) * 0.55));
          if (li === 0) H.heatSurfaces.push({ mesh: m, U: sp.wall.U, zi: s.zi, kind: 'wall' });
          segGroup.push(m);
        });
      }
      // openings: glass, frames, Trombe, door, overhang, shutters
      ops.forEach((o) => {
        const c = s.a.clone().add(dir.clone().multiplyScalar(o.u + o.w / 2));
        const at = (off, y) => new THREE.Vector3(c.x + out.x * off, y, c.y + out.z * off);
        const ex = out.clone().multiplyScalar(1.9 + (wallLayers.length - 1) * 0.55);
        if (o.kind === 'win') {
          const g = new THREE.Mesh(new THREE.BoxGeometry(o.w, winH, 0.03), new THREE.MeshPhysicalMaterial({ color: '#9EC4E4', roughness: 0.05, metalness: 0.1, transmission: 0.2, transparent: true, opacity: 0.55, emissive: '#000000' }));
          g.position.copy(at(wallT * 0.4, y0 + sill + winH / 2)); g.rotation.y = rot; part(g, 'glass', { f: s.f, zi: s.zi }, ex);
          H.heatSurfaces.push({ mesh: g, U: M.GLAZING[v.glazing].U, zi: s.zi, kind: 'glass', f: s.f });
          if (cold) { // Ladakhi black window surround, wider at the bottom
            const shape = new THREE.Shape(); const a = o.w / 2 + 0.18, b = o.w / 2 + 0.32, hh = winH / 2 + 0.18;
            shape.moveTo(-b, -hh - 0.05); shape.lineTo(b, -hh - 0.05); shape.lineTo(a, hh); shape.lineTo(-a, hh); shape.lineTo(-b, -hh - 0.05);
            const hole = new THREE.Path(); hole.moveTo(-o.w / 2, -winH / 2); hole.lineTo(o.w / 2, -winH / 2); hole.lineTo(o.w / 2, winH / 2); hole.lineTo(-o.w / 2, winH / 2); shape.holes.push(hole);
            const fr = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat({ color: '#1C1B1A', side: THREE.DoubleSide }));
            fr.position.copy(at(wallT + 0.012, y0 + sill + winH / 2)); fr.rotation.y = rot; part(fr, 'frame', null, ex);
            const lintel = box(o.w + 0.8, 0.12, 0.25, mat({ color: '#6B4A2B' })); lintel.position.copy(at(wallT + 0.1, y0 + sill + winH + 0.28)); lintel.rotation.y = rot; part(lintel, 'frame', null, ex);
          } else { const fr = box(o.w + 0.12, winH + 0.12, 0.05, mat({ color: '#3A3D42' })); fr.position.copy(at(wallT * 0.4 - 0.01, y0 + sill + winH / 2)); fr.rotation.y = rot; part(fr, 'frame', null, ex); }
          if (v.shutters) { // two insulated timber leaves, hinged at the jambs, open by day
            [-1, 1].forEach((side) => {
              const pivot = new THREE.Group(); pivot.position.copy(at(wallT + 0.06, y0 + sill + winH / 2).add(new THREE.Vector3(dir.x * side * o.w / 2, 0, dir.y * side * o.w / 2)));
              pivot.rotation.y = rot; const leaf = box(o.w / 2, winH, 0.05, mat({ color: '#8A5A33' })); leaf.position.x = -side * o.w / 4; pivot.add(leaf);
              pivot.userData.side = side; pivot.userData.open = side * 1.75; pivot.userData.target = side * 1.75; pivot.rotation.y = rot + side * 1.75; pivot.userData.rot0 = rot;
              part(pivot, 'shutter', null, ex); H.shutters.push(pivot);
            });
          }
          if (v.overhang > 0 && s.f !== 'N') { const oh = box(o.w + 0.6, 0.08, v.overhang, mat({ color: '#7A5B3E' })); oh.position.copy(at(wallT + v.overhang / 2, y0 + sill + winH + 0.3)); oh.rotation.y = rot; part(oh, 'overhang', null, ex); }
        } else if (o.kind === 'trombe') {
          const tw = D.sp.trombe;
          const mass = box(o.w, 2.4, 0.3, mat({ color: '#2A211C', roughness: 0.6 })); mass.position.copy(at(0.15, y0 + 1.35)); mass.rotation.y = rot; part(mass, 'trombe', null, ex);
          const gl = new THREE.Mesh(new THREE.BoxGeometry(o.w, 2.4, 0.02), new THREE.MeshPhysicalMaterial({ color: '#BFD9EE', roughness: 0.05, transparent: true, opacity: 0.35 }));
          gl.position.copy(at(wallT + 0.08, y0 + 1.35)); gl.rotation.y = rot; part(gl, 'trombeglass', null, ex.clone().multiplyScalar(1.35));
          H.heatSurfaces.push({ mesh: gl, U: tw ? tw.Ugl : 2, zi: s.zi, kind: 'trombe' });
          const fr = box(o.w + 0.1, 2.5, 0.06, mat({ color: '#1C1B1A', wireframe: false })); fr.scale.z = 0.3; fr.position.copy(at(wallT + 0.1, y0 + 1.35)); fr.rotation.y = rot; fr.material.transparent = true; fr.material.opacity = 0.0; part(fr, 'frame', null, ex);
          if (!H.trombeAnchor) H.trombeAnchor = at(wallT + 0.2, y0 + 2.2);
        } else if (o.kind === 'door') {
          const d = box(o.w, 2.1, 0.07, mat({ color: '#5A3B22' })); d.position.copy(at(wallT * 0.5, y0 + 1.05)); d.rotation.y = rot; part(d, 'door', null, ex);
          if (cold) { const porch = new THREE.Group(); const pw = 2.2, pd = 1.6; const pm = mat(outerFinish(wallLayers)); const pr = mat({ color: '#6B4A2B' });
            const l = box(0.25, 2.3, pd, pm), r = box(0.25, 2.3, pd, pm), top = box(pw + 0.3, 0.22, pd + 0.2, pr);
            l.position.set(-pw / 2, 1.15, 0); r.position.set(pw / 2, 1.15, 0); top.position.set(0, 2.4, 0); porch.add(l, r, top);
            porch.position.copy(at(wallT + pd / 2, y0)); porch.rotation.y = rot; part(porch, 'porch', null, ex.clone().multiplyScalar(1.4)); H.porchAnchor = at(wallT + pd, y0 + 2.6); H.porchN = out.clone(); }
        }
      });
    });

    // --- plinth
    const pad = new THREE.Shape(); const e = wallT + 0.15;
    pad.moveTo(minX - cx - e, -(maxY - cy) - e); pad.lineTo(maxX - cx + e, -(maxY - cy) - e); pad.lineTo(maxX - cx + e, (cy - minY) + e); pad.lineTo(minX - cx - e, (cy - minY) + e);
    const plinthMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(pad, { depth: plinth, bevelEnabled: false }), mat({ map: tex('stone'), color: '#FFFFFF' }));
    plinthMesh.material.map = tex('stone').clone(); plinthMesh.material.map.repeat.set(0.5, 0.5); plinthMesh.material.map.needsUpdate = true;
    plinthMesh.rotation.x = Math.PI / 2; plinthMesh.position.y = plinth; plinthMesh.castShadow = true; plinthMesh.receiveShadow = true;
    part(plinthMesh, 'plinth', null, new THREE.Vector3(0, -1.4, 0));

    // --- floor layers per room (inner → top), roof layers per room, partitions, rooms
    const shapeOf = (p) => { const s = new THREE.Shape(); p.forEach((q, i) => { const v2 = P(q); if (i) s.lineTo(v2.x, -v2.y); else s.moveTo(v2.x, -v2.y); }); return s; };
    polys.forEach((p, zi) => {
      let y = y0;
      floorLayers.slice().reverse().forEach(([k, d], i) => { // top layer first
        const t = tOf(d); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf(p), { depth: t, bevelEnabled: false }), mat({ color: LAYER_COL[k] || '#bbb' }));
        m.rotation.x = -Math.PI / 2; m.position.y = y - t; y -= t; m.receiveShadow = true;
        part(m, 'floor', { layer: i, key: k }, new THREE.Vector3(0, -0.6 - i * 0.45, 0));
      });
      // room colour tile (roof-off view)
      const tile = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(p)), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, depthWrite: false }));
      tile.rotation.x = -Math.PI / 2; tile.position.y = y0 + 0.02; H.root.add(tile); H.rooms.push({ tile, zi, name: D.sp.zones[zi] ? D.sp.zones[zi].name : `Room ${zi + 1}` });
      // roof
      let yr = y0 + hWall;
      roofLayers.slice().reverse().forEach(([k, d], i) => { // inner (ceiling) first, going up
        const t = tOf(d); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf(p), { depth: t, bevelEnabled: false }), mat({ color: LAYER_COL[k] || '#bbb' }));
        m.rotation.x = -Math.PI / 2; m.position.y = yr; yr += t; m.castShadow = true; m.receiveShadow = true;
        const top = i === roofLayers.length - 1;
        if (top) { m.material = k === 'soil' ? mat({ color: '#6E9A5E' }) : mat({ map: tex(k === 'steel_sheet' ? 'steel' : k === 'lime_plaster' ? 'whitewash' : 'mudplaster'), color: '#FFFFFF' }); H.heatSurfaces.push({ mesh: m, U: sp.roof.U, zi, kind: 'roof' }); }
        part(m, 'roof', { layer: i, key: k }, new THREE.Vector3(0, 2.2 + i * 0.75, 0));
      });
      H.roofTop = yr;
    });
    H.plan.roofTop = H.roofTop - y0;
    const roofTop = H.roofTop;
    // roof over the external walls, parapet with a band of twigs (Ladakhi style) or plain
    segs.forEach((s) => {
      const dir = new THREE.Vector2().subVectors(s.b, s.a).normalize(), out = new THREE.Vector3(s.n.x, 0, s.n.y), rot = Math.atan2(-dir.y, dir.x);
      const c = s.a.clone().add(s.b).multiplyScalar(0.5);
      const cap = box(s.L + wallT * 2, roofTop - (y0 + hWall), wallT + 0.12, mat({ color: '#B8A58C' }));
      cap.position.set(c.x + out.x * (wallT / 2 + 0.06), (y0 + hWall + roofTop) / 2, c.y + out.z * (wallT / 2 + 0.06)); cap.rotation.y = rot;
      part(cap, 'roof', null, new THREE.Vector3(0, 2.2 + (roofLayers.length - 1) * 0.75, 0).add(out.clone().multiplyScalar(0.3)));
      const traditional = /mud_poplar/.test(v.roof);
      const par = box(s.L + wallT * 2 + 0.1, traditional ? 0.34 : 0.45, 0.32, traditional ? mat({ map: tex('twigs'), color: '#FFFFFF' }) : mat(outerFinish(wallLayers)));
      par.position.set(c.x + out.x * (wallT + 0.02), roofTop + (traditional ? 0.17 : 0.22), c.y + out.z * (wallT + 0.02)); par.rotation.y = rot;
      part(par, 'parapet', null, new THREE.Vector3(0, 2.2 + roofLayers.length * 0.75, 0));
      if (traditional && (s.f === 'S' || s.f === 'N')) { // poplar rafter ends showing under the roof
        const n = Math.floor(s.L / 0.6);
        for (let i = 1; i < n; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 8), mat({ color: '#8C6A45' })); r.rotation.z = Math.PI / 2; const q = s.a.clone().add(dir.clone().multiplyScalar(i * 0.6)); r.position.set(q.x + out.x * (wallT + 0.12), y0 + hWall - 0.05, q.y + out.z * (wallT + 0.12)); r.rotation.y = rot + Math.PI / 2; r.castShadow = true; part(r, 'rafter', null, new THREE.Vector3(0, 2.2, 0).add(out.clone().multiplyScalar(1.9))); }
      }
    });
    // partitions between rooms (shared edges)
    const pm = mat({ color: '#E8E1D3' });
    for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) {
      const A = polys[i], B = polys[j];
      for (let a = 0; a < A.length; a++) for (let b = 0; b < B.length; b++) {
        const p1 = A[a], p2 = A[(a + 1) % A.length], q1 = B[b], q2 = B[(b + 1) % B.length];
        const d = [p2[0] - p1[0], p2[1] - p1[1]], L = Math.hypot(...d); if (L < 0.3) continue;
        const u = [d[0] / L, d[1] / L];
        const off = (q) => Math.abs((q[0] - p1[0]) * u[1] - (q[1] - p1[1]) * u[0]);
        if (off(q1) > 0.05 || off(q2) > 0.05) continue;
        const t1 = (q1[0] - p1[0]) * u[0] + (q1[1] - p1[1]) * u[1], t2 = (q2[0] - p1[0]) * u[0] + (q2[1] - p1[1]) * u[1];
        const lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(L, Math.max(t1, t2)); if (hi - lo < 0.3) continue;
        const m0 = P([p1[0] + u[0] * (lo + hi) / 2, p1[1] + u[1] * (lo + hi) / 2]);
        const wall = box(hi - lo, hWall, 0.16, pm); wall.position.set(m0.x, y0 + hWall / 2, m0.y); wall.rotation.y = Math.atan2(u[1], u[0]);
        // leave a doorway in each partition
        part(wall, 'partition', null, new THREE.Vector3());
        if (hi - lo > 1.6) { const gap = box(0.9, 2.05, 0.2, mat({ color: '#6B4A2B' })); gap.position.set(m0.x, y0 + 1.03, m0.y); gap.rotation.y = wall.rotation.y; part(gap, 'partition', null, new THREE.Vector3()); }
      }
    }
    // chimney (bukhari flue) above the living room or kitchen
    const zones = D.sp.zones;
    let zi = zones.findIndex((z) => z.type === 'kitchen'); if (zi < 0) zi = zones.findIndex((z) => z.type === 'living'); if (zi < 0) zi = 0;
    const pc = polys[zi].reduce((a, q) => [a[0] + q[0] / polys[zi].length, a[1] + q[1] / polys[zi].length], [0, 0]);
    const cpos = P(pc);
    if (TB.design.TYPES[D.c.type].stove && D.c.mode === 'heating') {
      const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8, 14), mat({ color: '#1F1F1F', metalness: 0.5, roughness: 0.4 })); flue.position.set(cpos.x, roofTop + 0.9, cpos.y); flue.castShadow = true;
      const capM = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 14), mat({ color: '#1F1F1F', metalness: 0.5 })); capM.position.set(cpos.x, roofTop + 1.95, cpos.y);
      const ex = new THREE.Vector3(0, 2.2 + roofLayers.length * 0.75, 0);
      part(flue, 'flue', null, ex); part(capM, 'flue', null, ex);
      H.flueAnchor = new THREE.Vector3(cpos.x, roofTop + 2.1, cpos.y);
    }
    // fresh-air vent: a small grille high on the north (or first) wall of that room
    const vs = segs.find((s) => s.zi === zi && s.f === 'N') || segs.find((s) => s.zi === zi) || segs[0];
    if (vs && D.c.mode === 'heating') { const dir = new THREE.Vector2().subVectors(vs.b, vs.a).normalize(), out = new THREE.Vector3(vs.n.x, 0, vs.n.y); const c = vs.a.clone().add(dir.clone().multiplyScalar(Math.min(0.9, vs.L / 4)));
      const gr = box(0.3, 0.2, 0.05, mat({ color: '#3D7BD9' })); gr.position.set(c.x + out.x * (wallT + 0.02), y0 + hWall - 0.35, c.y + out.z * (wallT + 0.02)); gr.rotation.y = Math.atan2(-dir.y, dir.x); H.ventN = out.clone();
      part(gr, 'vent', null, out.clone().multiplyScalar(1.9 + (wallLayers.length - 1) * 0.55)); H.ventAnchor = gr.position.clone().add(new THREE.Vector3(0, 0.2, 0)); }

    // orientation of the whole building
    H.root.rotation.y = -((v.orientation || 0) * D2R);
    buildLabels(segs, wallT, y0, hWall, roofTop);
    applyExplode(); applyMode(); updateTime();
  }

  function buildLabels(segs, wallT, y0, hWall, roofTop) {
    const D = H.data, v = D.v, sp = D.sp, M = TB.materials;
    const southSeg = segs.filter((s) => s.f === 'S').sort((a, b) => b.L - a.L)[0] || segs[0];
    const mid = (s, off, y) => { const c = s.a.clone().add(s.b).multiplyScalar(0.5); return new THREE.Vector3(c.x + s.n.x * off, y, c.y + s.n.y * off); };
    const eastSeg = segs.find((s) => s.f === 'E') || segs[0], westSeg = segs.find((s) => s.f === 'W') || segs[0];
    const V = sp.area * 2.7, q = sp.ach * V, ventCm2 = Math.round(((q / 3600) / (0.6 * Math.sqrt((2 * 2) / 0.9))) * 1e4);
    const glassA = D.bom.win;
    const L = (t, p, o) => label(t, p, o);
    const nOf = (sg) => new THREE.Vector3(sg.n.x, 0, sg.n.y);
    L(`<b>Roof</b>${sp.roof.label}<i>U ${sp.roof.U.toFixed(2)} W/m²K</i>`, new THREE.Vector3(0, roofTop + 0.4, 0), { follow: 'roof' });
    L(`<b>Walls</b>${M.WALLS[v.wall].label}${v.ins ? ` + ${Math.round(v.ins * 1000)} mm insulation` : ''}<i>U ${sp.wall.U.toFixed(2)} · ${Math.round(sp.wall.thick * 1000)} mm</i>`, mid(eastSeg, wallT + 0.05, y0 + 1.9), { follow: 'wall', n: nOf(eastSeg) });
    L(`<b>South glass</b>${M.GLAZING[v.glazing].label}<i>${glassA.toFixed(1)} m² · g ${M.GLAZING[v.glazing].g.toFixed(2)}</i>`, mid(southSeg, wallT + 0.1, y0 + 2.3), { follow: 'glass', n: nOf(southSeg) });
    if (H.trombeAnchor) L(`<b>Trombe wall</b>300 mm dark mass behind glass<i>${D.bom.trombeA.toFixed(1)} m²</i>`, H.trombeAnchor, { follow: 'trombe', n: nOf(southSeg) });
    L(`<b>Floor</b>${sp.floor.label}`, mid(westSeg, wallT + 0.4, y0 - 0.2), { follow: 'floor', n: nOf(westSeg) });
    if (H.flueAnchor) L(`<b>Bukhari flue</b>sealed chimney above the roof`, H.flueAnchor, { follow: 'flue' });
    if (H.ventAnchor) L(`<b>Fresh-air vent</b>about ${ventCm2} cm² for ${sp.ach.toFixed(2)} ACH`, H.ventAnchor, { follow: 'vent', n: H.ventN });
    if (v.overhang > 0) L(`<b>Overhang</b>${v.overhang.toFixed(2)} m over the windows`, mid(southSeg, wallT + v.overhang, y0 + 2.7), { follow: 'overhang', n: nOf(southSeg) });
    if (v.shutters) L(`<b>Night shutters</b>close at dusk`, mid(southSeg, wallT + 0.3, y0 + 0.9), { follow: 'shutter', cls: 'l3-small', n: nOf(southSeg) });
    if (H.porchAnchor) L(`<b>Entrance airlock</b>stops cold air rushing in`, H.porchAnchor, { follow: 'porch', cls: 'l3-small', n: H.porchN });
    // layer labels, only in the exploded view
    sp.wall.layers.forEach(([k, d], li) => { const m = TB.materials.M[k]; L(`${m.name}<i>${Math.round(d * 1000)} mm</i>`, mid(southSeg, 0.1, y0 + 0.4 + li * 0.35), { follow: 'wall-layer-' + li, only: 'exploded', cls: 'l3-layer-lbl', n: nOf(southSeg) }); });
    sp.roof.layers.forEach(([k, d], i) => { const m = TB.materials.M[k]; L(`${m.name}<i>${Math.round(d * 1000)} mm</i>`, mid(westSeg, -1.2, y0 + hWall + 0.1), { follow: 'roof-layer-' + (sp.roof.layers.length - 1 - i), only: 'exploded', cls: 'l3-layer-lbl' }); });
    // room labels for the roof-off view
    H.rooms.forEach((r) => { const box3 = new THREE.Box3().setFromObject(r.tile); const c = box3.getCenter(new THREE.Vector3()); r.label = L(`<b>${r.name}</b><span class="l3-t">–</span>`, c.clone().setY(y0 + 0.4), { only: 'cut', cls: 'l3-room' }); });
  }

  // world position of a label anchor, moving with its part in the exploded view
  function anchorWorld(L) {
    const p = L.anchor.clone();
    if (L.follow && H.explode > 0) {
      const m = L.follow.match(/^(wall|roof)-layer-(\d+)$/);
      const pt = H.parts.find((q) => (m ? q.userData.kind === m[1] && q.userData.info && q.userData.info.layer === +m[2] && (m[1] === 'roof' || q.userData.info.f === 'S') : q.userData.kind === L.follow));
      if (pt) p.add(pt.userData.explode.clone().multiplyScalar(H.explode));
    }
    return p.applyMatrix4(H.root.matrixWorld);
  }
  function placeLabels() {
    const c = $('viewer-3d'); if (!c || !H.labels.length) return;
    const w = c.clientWidth, h = c.clientHeight, placed = [];
    const q = H.root.quaternion;
    H.labels.forEach((L) => {
      const vis = H.labelsOn && (!L.only || (L.only === 'exploded' && H.view === 'exploded' && H.explode > 0.6) || (L.only === 'cut' && H.view === 'cut'));
      const hideNormal = !L.only && (H.view === 'cut' || (H.view === 'exploded' && L.follow === 'floor'));
      const wp = anchorWorld(L);
      let facing = true;
      if (L.n && L.only !== 'exploded') { const nw = L.n.clone().applyQuaternion(q); facing = nw.dot(H.camera.position.clone().sub(wp)) > 0; }
      if (!vis || hideNormal || !facing) { L.el.style.display = 'none'; return; }
      const p = wp.project(H.camera);
      if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) { L.el.style.display = 'none'; return; }
      L.el.style.display = '';
      const bw = L.el.offsetWidth || 120, bh = L.el.offsetHeight || 36;
      let x = ((p.x + 1) / 2) * w, y = ((1 - p.y) / 2) * h;
      // stack upward past labels already placed so none overlap
      for (let tries = 0; tries < 6; tries++) {
        const hit = placed.find((r) => Math.abs(r.x - x) < (r.w + bw) / 2 + 4 && Math.abs(r.y - y) < (r.h + bh) / 2 + 4);
        if (!hit) break; y = hit.y - (hit.h + bh) / 2 - 6;
      }
      if (placed.some((r) => Math.abs(r.x - x) < (r.w + bw) / 2 && Math.abs(r.y - y) < (r.h + bh) / 2) || y - bh < 0) { L.el.style.display = 'none'; return; }
      placed.push({ x, y, w: bw, h: bh });
      L.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    });
  }

  function applyExplode() {
    const e = H.explode;
    H.parts.forEach((p) => { p.position.copy(p.userData.base).addScaledVector(p.userData.explode, e); });
    const cut = H.view === 'cut';
    H.parts.forEach((p) => { if (['roof', 'parapet', 'flue', 'rafter'].includes(p.userData.kind)) p.visible = !cut; });
    H.rooms.forEach((r) => { r.tile.material.opacity = cut ? 0.92 : 0; });
  }

  // ---------- time of day: sun, sky, night, shutters, heat and room colours ----------
  function stepIndex() {
    const s = H.data.typ.series, spd = s.hour.length / 3;
    return Math.max(0, Math.min(s.hour.length - 1, Math.round(2 * spd + (H.time / 24) * spd)));
  }
  function updateTime() {
    if (!H.data) return;
    const m = monthNow(), sun = sunAt(m, H.time);
    const up = sun.alt > 0, day = Math.max(0, Math.min(1, (sun.alt + 0.06) / 0.45));
    H.sun.position.copy(sun.dir.clone().multiplyScalar(80)); H.sun.target.position.set(0, 0, 0);
    H.sun.intensity = up ? 0.5 + 2.4 * day : 0; H.sun.color.setHSL(0.09, 0.55, 0.62 + 0.3 * day);
    H.hemi.intensity = 0.18 + 0.8 * day;
    const sky = new THREE.Color().lerpColors(new THREE.Color('#101B33'), new THREE.Color(H.data.c.mode === 'heating' ? '#BFD4EA' : '#CFE0F0'), day);
    H.scene.background = sky; H.scene.fog = new THREE.Fog(sky, 120, 320);
    H.sunSprite.position.copy(sun.dir.clone().multiplyScalar(250)); H.sunSprite.visible = up;
    H.stars.material.opacity = Math.max(0, 0.9 - day * 2);
    // shutters close at dusk
    const night = H.time < 8.5 || H.time > 17.5;
    H.shutters.forEach((s) => { s.userData.target = s.userData.rot0 + (night ? 0 : s.userData.side * 1.75); });
    // warm lit windows at night
    H.heatSurfaces.filter((x) => x.kind === 'glass').forEach((x) => { if (H.mode === 'realistic') x.mesh.material.emissive.set(night ? '#6E4A1E' : '#000000'); });
    colourByPhysics();
    drawSunPath();
    const s = H.data.typ.series, i = stepIndex();
    const t = $('hud-time'), note = $('hud-note');
    const hh = Math.floor(H.time), mm = Math.round((H.time - hh) * 60) % 60;
    if (t) t.textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'} · ${TB.analyse.MONTHS[m]}`;
    if (note) {
      const inside = s.wholeOp[i], out = s.te[i];
      note.innerHTML = m !== H.data.c.month ? `Sun ${up ? `${Math.round(sun.alt / D2R)}° high` : 'below the horizon'} · ${TB.analyse.MONTHS[m]} sun path` : `Outdoors ${fmtT(out)} · inside ${fmtT(inside)}${up ? ` · sun ${Math.round(sun.alt / D2R)}° high` : ''}${H.mode === 'thermal' ? '<br><span class="ir-key"><i></i>Heat escaping, 0 to 60 W/m²</span>' : ''}`;
    }
  }

  // infrared (heat flow out through each surface) and room temperatures from the simulation
  const irColor = (x) => { // 0..1 → thermal-camera palette
    const stops = [[0, [25, 12, 60]], [0.3, [120, 20, 120]], [0.55, [220, 50, 60]], [0.8, [250, 160, 40]], [1, [255, 245, 200]]];
    for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (x - a) / (b - a); return new THREE.Color(`rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * f)).join(',')})`); }
    return new THREE.Color('rgb(255,245,200)');
  };
  function colourByPhysics() {
    const s = H.data.typ.series, i = stepIndex(), te = s.te[i];
    if (H.mode === 'thermal') {
      H.heatSurfaces.forEach((x) => {
        const ti = s.air[x.zi] ? s.air[x.zi][i] : s.wholeAir[i];
        const q = Math.max(0, x.U * (ti - te)); // W/m² leaving through this surface
        const c = irColor(Math.min(1, q / 60));
        x.mesh.material.color.set('#000000'); x.mesh.material.emissive = c; if (x.mesh.material.map) { x.mesh.userData.map = x.mesh.userData.map || x.mesh.material.map; x.mesh.material.map = null; x.mesh.material.needsUpdate = true; }
      });
    }
    if (H.view === 'cut') H.rooms.forEach((r) => {
      const tv = s.op[r.zi] ? s.op[r.zi][i] : s.wholeOp[i];
      r.tile.material.color.set(window.TBApp && TBApp.tempColor ? TBApp.tempColor(tv) : '#ddd');
      if (r.label) r.label.el.querySelector('.l3-t').textContent = fmtT(tv);
    });
  }
  function applyMode() {
    const m = H.mode;
    H.parts.forEach((p) => p.traverse((o) => {
      if (!o.isMesh) return;
      o.material.wireframe = m === 'wireframe';
      if (m !== 'thermal') { if (o.userData.map) { o.material.map = o.userData.map; o.material.needsUpdate = true; } if (o.material.emissive) o.material.emissive.set('#000000'); if (o.userData.col0) o.material.color.copy(o.userData.col0); }
      else if (!o.userData.col0) o.userData.col0 = o.material.color.clone();
    }));
    if (m === 'thermal') {
      // everything that is not an outside surface goes neutral grey so the heat flow reads clearly
      const hs = new Set(H.heatSurfaces.map((x) => x.mesh));
      H.parts.forEach((p) => p.traverse((o) => { if (o.isMesh && !hs.has(o)) { if (!o.userData.col0) o.userData.col0 = o.material.color.clone(); o.material.color.set('#2A2D33'); } }));
    } else H.parts.forEach((p) => p.traverse((o) => { if (o.isMesh && o.userData.col0 && !H.heatSurfaces.some((x) => x.mesh === o)) o.material.color.copy(o.userData.col0); }));
    updateTime();
  }

  // click a part: a short explanation in the HUD
  const ray = new THREE.Raycaster();
  function pick(e) {
    if (!H.ready || H.orbit.st.moved > 6) return;
    const r = H.renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), H.camera);
    const hit = ray.intersectObjects(H.parts, true)[0]; if (!hit) return;
    let o = hit.object; while (o && !o.userData.kind) o = o.parent; if (!o) return;
    const k = o.userData.kind, info = o.userData.info || {}, D = H.data, sp = D.sp, s = D.typ.series, i = stepIndex();
    const zi = info.zi != null ? info.zi : 0, ti = s.air[zi] ? s.air[zi][i] : s.wholeAir[i], te = s.te[i];
    const txt = {
      wall: () => `${TB.materials.M[info.key].name} (${info.f} wall). Whole wall U ${sp.wall.U.toFixed(2)} W/m²K; right now ${Math.max(0, sp.wall.U * (ti - te)).toFixed(1)} W/m² escapes.`,
      glass: () => `${TB.materials.GLAZING[D.v.glazing].label}, U ${TB.materials.GLAZING[D.v.glazing].U.toFixed(2)}. Losing ${Math.max(0, TB.materials.GLAZING[D.v.glazing].U * (ti - te)).toFixed(0)} W/m² now${D.v.shutters ? '; shutters halve that at night' : ''}.`,
      roof: () => `${sp.roof.label}, U ${sp.roof.U.toFixed(2)}. Faces the whole night sky.`,
      trombe: () => `Trombe wall: 300 mm dark mass behind glass. It stores the day's sun and releases it into the room after dark.`,
      floor: () => `${sp.floor.label}. Ground U ${D.typ.model.Ug.toFixed(2)} W/m²K (ISO 13370).`,
      flue: () => 'Bukhari flue, sealed to above the roof so combustion gases never enter the room.',
      vent: () => `Closable fresh-air vent sized for ${sp.ach.toFixed(2)} air changes an hour.`,
      partition: () => 'Internal mud-brick wall: stores heat and shares it between rooms.',
    }[k];
    const note = $('hud-note'); if (note && txt) note.textContent = txt();
  }

  // ---------- public API used by the existing controls ----------
  async function load() {
    if (!window.TBApp || !TBApp.design3D) return;
    const hud = $('hud-note'); if (hud && !H.data) hud.textContent = 'Building your design…';
    const d = await TBApp.design3D();
    const first = !H.data || H.data.c.site !== d.c.site;
    H.data = d;
    if (first) { H.season = d.c.mode === 'heating' ? 'winter' : 'summer'; document.querySelectorAll('#season-seg .seg').forEach((b) => b.classList.toggle('active', b.dataset.season === H.season)); }
    if (!H.ready) initScene();
    buildSite(); buildHouse();
    if (first) H.orbit.home();
    if ($('drawings-container') && $('drawings-container').style.display !== 'none' && window.TBDrawings) TBDrawings.render();
    if (window.TBTune) TBTune.render(d);
  }
  window.init3DViewer = function () { const c = $('viewer-3d'); if (!c) return; H.loading = load(); return H.loading; };
  window.rebuild3DHouse = function () { if (H.ready) H.loading = load(); };
  window.addEventListener('thermabuild:theme', () => window.rebuild3DHouse()); // compass colour follows the theme
  window.setViewerMode = function (m) { H.mode = m; if (typeof ThermaState !== 'undefined') ThermaState.viewerMode = m; if (H.ready) applyMode(); };
  window.setSunTime = function (v) { H.time = parseFloat(v); if (H.ready) updateTime(); };
  window.setSeason = function (s) { H.season = s; if (H.ready) updateTime(); };
  window.toggleSunPath = function () { H.playing = !H.playing; const b = $('play-day'); if (b) b.textContent = H.playing ? 'Pause' : 'Play the day'; };
  window.set3DView = function (v) { H.view = v; H.explodeTarget = v === 'exploded' ? 1 : 0; if (H.ready) { applyExplode(); updateTime(); } };
  window.toggle3DLabels = function (btn) { H.labelsOn = !H.labelsOn; if (btn) { btn.classList.toggle('is-on', H.labelsOn); btn.setAttribute('aria-pressed', String(H.labelsOn)); } };
  window.zoom3D = function (f) { if (H.ready) (f ? H.orbit.zoom(f) : H.orbit.home()); };
})();
