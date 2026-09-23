/**
 * ThermaBuild — 3D viewers
 * Home: a parametric house built from the current design, with a sun that moves
 * through the day by season and latitude, and a heat view that colours each
 * surface by how much sun it is taking.
 * Shelter: an open-sided livestock shed with animated airflow through the ridge.
 *
 * Overrides the placeholder viewer functions declared in app-core.js.
 */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- shared: minimal orbit control ----------
  function attachOrbit(el, camera, target, opts) {
    const state = { theta: opts.theta, phi: opts.phi, radius: opts.radius, dragging: false, lx: 0, ly: 0, autoSpin: !reduceMotion };
    function apply() {
      state.phi = Math.max(0.15, Math.min(1.35, state.phi));
      state.radius = Math.max(opts.min, Math.min(opts.max, state.radius));
      camera.position.set(
        target.x + state.radius * Math.sin(state.phi) * Math.sin(state.theta),
        target.y + state.radius * Math.cos(state.phi),
        target.z + state.radius * Math.sin(state.phi) * Math.cos(state.theta)
      );
      camera.lookAt(target);
    }
    el.addEventListener('pointerdown', (e) => { state.dragging = true; state.autoSpin = false; state.lx = e.clientX; state.ly = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!state.dragging) return;
      state.theta -= (e.clientX - state.lx) * 0.006;
      state.phi -= (e.clientY - state.ly) * 0.006;
      state.lx = e.clientX; state.ly = e.clientY;
      apply();
    });
    const stop = () => { state.dragging = false; };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('wheel', (e) => { e.preventDefault(); state.radius *= 1 + Math.sign(e.deltaY) * 0.08; apply(); }, { passive: false });
    apply();
    return { apply, state, tick(dt) { if (state.autoSpin) { state.theta += dt * 0.08; apply(); } } };
  }

  function makeRenderer(container) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(container.clientWidth, container.clientHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    if (r.outputColorSpace !== undefined) r.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(r.domElement);
    return r;
  }

  function fitOnResize(container, camera, renderer) {
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);
  }

  // ---------- HOME VIEWER ----------
  const home = { ready: false, time: 13, season: 'summer', mode: 'realistic', playing: false, surfaces: [], sunHours: null };
  // diverging heat ramp: cool blue -> neutral -> solar orange -> hot red
  const HEAT_STOPS = [[0, '#2F78B7'], [0.32, '#9DBAD3'], [0.5, '#E6E1D8'], [0.72, '#F2A33A'], [1, '#C8401A']].map(([t, c]) => [t, new THREE.Color(c)]);
  const heatColor = (t) => {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < HEAT_STOPS.length; i++) {
      if (t <= HEAT_STOPS[i][0]) { const [t0, c0] = HEAT_STOPS[i - 1], [t1, c1] = HEAT_STOPS[i]; return new THREE.Color().lerpColors(c0, c1, (t - t0) / (t1 - t0)); }
    }
    return HEAT_STOPS[HEAT_STOPS.length - 1][1].clone();
  };

  function facingRotation() {
    const f = (typeof ThermaState !== "undefined" && ThermaState.facing) || 'north';
    return { north: 0, east: -Math.PI / 2, south: Math.PI, west: Math.PI / 2 }[f] || 0;
  }

  function buildHouse(scene) {
    const W = Math.max(6, Math.min(18, (typeof ThermaState !== "undefined" && ThermaState.widthM) || 10));
    const L = Math.max(6, Math.min(20, (typeof ThermaState !== "undefined" && ThermaState.lengthM) || 12));
    const H = 3.2;
    const g = new THREE.Group();
    home.surfaces = [];

    const wallMat = () => new THREE.MeshStandardMaterial({ color: '#D9C8A9', roughness: 0.9 });
    const t = 0.3; // wall thickness

    function wall(w, h, d, x, y, z, normal, name) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat());
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      m.userData = { normal: normal.clone(), base: '#D9C8A9', name };
      g.add(m); home.surfaces.push(m);
      return m;
    }
    // walls: +z = south (entrance faces -z = north by default; group rotated by facing)
    wall(W, H, t, 0, H / 2, L / 2, new THREE.Vector3(0, 0, 1), 'south');
    wall(W, H, t, 0, H / 2, -L / 2, new THREE.Vector3(0, 0, -1), 'north');
    wall(t, H, L, W / 2, H / 2, 0, new THREE.Vector3(1, 0, 0), 'east');
    wall(t, H, L, -W / 2, H / 2, 0, new THREE.Vector3(-1, 0, 0), 'west');

    // roof slab + parapet
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.25, L + 0.2), new THREE.MeshStandardMaterial({ color: '#EFEAE0', roughness: 0.7 }));
    roof.position.y = H + 0.125; roof.castShadow = true; roof.receiveShadow = true;
    roof.userData = { normal: new THREE.Vector3(0, 1, 0), base: '#EFEAE0', name: 'roof' };
    g.add(roof); home.surfaces.push(roof);
    // parapet: four thin upstands around the roof edge
    const pm = new THREE.MeshStandardMaterial({ color: '#D9C8A9', roughness: 0.9 });
    [[W + 0.2, 0.12, 0, (L + 0.08) / 2], [W + 0.2, 0.12, 0, -(L + 0.08) / 2], [0.12, L + 0.2, (W + 0.08) / 2, 0], [0.12, L + 0.2, -(W + 0.08) / 2, 0]].forEach(([bw, bd, x, z]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.5, bd), pm); p.position.set(x, H + 0.5, z); p.castShadow = true; g.add(p);
    });

    // windows (recessed dark glass) with chhajja overhangs
    const glass = new THREE.MeshStandardMaterial({ color: '#25405F', roughness: 0.2, metalness: 0.4 });
    const shade = new THREE.MeshStandardMaterial({ color: '#B08A5E', roughness: 0.8 });
    function windowOn(side, u, w = 1.5, h = 1.3) {
      const y = 1.5;
      const win = new THREE.Mesh(new THREE.BoxGeometry(side === 'ns' ? w : 0.08, h, side === 'ns' ? 0.08 : w), glass);
      const chh = new THREE.Mesh(new THREE.BoxGeometry(side === 'ns' ? w + 0.6 : 0.7, 0.08, side === 'ns' ? 0.7 : w + 0.6), shade);
      chh.castShadow = true;
      if (side === 'ns') {
        win.position.set(u, y, L / 2 + 0.16); chh.position.set(u, y + h / 2 + 0.1, L / 2 + 0.35);
        const win2 = win.clone(), chh2 = chh.clone(); win2.position.z = -L / 2 - 0.16; chh2.position.z = -L / 2 - 0.35; g.add(win2, chh2);
      } else {
        win.position.set(W / 2 + 0.16, y, u); chh.position.set(W / 2 + 0.35, y + h / 2 + 0.1, u);
        const win2 = win.clone(), chh2 = chh.clone(); win2.position.x = -W / 2 - 0.16; chh2.position.x = -W / 2 - 0.35; g.add(win2, chh2);
      }
      g.add(win, chh);
    }
    windowOn('ns', -W * 0.28); windowOn('ns', W * 0.28);
    windowOn('ew', -L * 0.25); windowOn('ew', L * 0.25);

    // entrance porch on the north face (rotated with facing)
    const porch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 1.8), shade);
    porch.position.set(0, 2.5, -L / 2 - 0.9); porch.castShadow = true; g.add(porch);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), new THREE.MeshStandardMaterial({ color: '#6B4A2B', roughness: 0.8 }));
    door.position.set(0, 1.05, -L / 2 - 0.16); g.add(door);
    [-1.4, 1.4].forEach((x) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 8), shade); post.position.set(x, 1.25, -L / 2 - 1.7); g.add(post); });

    g.rotation.y = facingRotation();
    scene.add(g);
    home.group = g;
    home.dims = { W, L, H };
  }

  function buildSite(scene) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#7E9B6E', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const plot = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshStandardMaterial({ color: '#9BA98A', roughness: 1 }));
    plot.rotation.x = -Math.PI / 2; plot.position.y = 0.01; plot.receiveShadow = true; scene.add(plot);
    // trees
    const trunkM = new THREE.MeshStandardMaterial({ color: '#6B4A2B' }), leafM = new THREE.MeshStandardMaterial({ color: '#4F7A4A', roughness: 1 });
    [[-11, -9], [12, -10], [11, 9], [-12, 8], [0, -13]].forEach(([x, z]) => {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 8), trunkM); tr.position.set(x, 1.1, z); tr.castShadow = true;
      const lf = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 10), leafM); lf.position.set(x, 3.4, z); lf.castShadow = true;
      scene.add(tr, lf);
    });
    // compass N marker
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 4), new THREE.MeshStandardMaterial({ color: '#F2A33A' }));
    n.position.set(0, 0.2, -14.5); n.rotation.x = -Math.PI / 2; scene.add(n);
  }

  function sunVector(hour, season) {
    const lat = ((typeof ThermaState !== "undefined" && ThermaState.lat) || 20) * Math.PI / 180;
    const decl = (season === 'winter' ? -23.44 : 23.44) * Math.PI / 180;
    const ha = (hour - 12) * 15 * Math.PI / 180; // negative before noon
    const alt = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha));
    let cosAz = (Math.sin(decl) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat) || 1e-6);
    cosAz = Math.max(-1, Math.min(1, cosAz));
    let az = Math.acos(cosAz);           // from north, clockwise, morning side
    if (ha > 0) az = Math.PI * 2 - az;   // afternoon: sun moves to the west
    // scene axes: +x east, +z south, -z north
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)).normalize();
    return { dir, alt };
  }

  function updateSun() {
    if (!home.ready) return;
    const { dir, alt } = sunVector(home.time, home.season);
    const R = 40;
    home.sun.position.copy(dir).multiplyScalar(R);
    home.sunBall.position.copy(dir).multiplyScalar(R * 0.8);
    const day = Math.max(0, Math.min(1, (alt + 0.05) / 0.5));
    home.sun.intensity = 0.4 + 2.2 * day;
    home.sun.color.setHSL(0.09, 0.6, 0.55 + 0.35 * day);
    home.hemi.intensity = 0.35 + 0.5 * day;
    home.scene.background.setHSL(0.6, 0.35, 0.12 + 0.55 * day);
    home.sunBall.visible = alt > 0;

    // per-surface sun exposure (world-space normal · sun dir), and heat tint
    let hottest = null, hv = -1;
    home.surfaces.forEach((m) => {
      const n = m.userData.normal.clone().applyQuaternion(home.group.quaternion);
      const e = alt > 0 ? Math.max(0, n.dot(dir)) : 0;
      m.userData.exposure = e;
      if (m.userData.name !== 'roof' && e > hv) { hv = e; hottest = m.userData.name; }
      if (home.mode === 'thermal') { m.material.emissive.copy(heatColor(0.08 + e * 0.92)); m.material.color.set('#000000'); }
    });

    const t = document.getElementById('hud-time');
    const note = document.getElementById('hud-note');
    const h = Math.floor(home.time), mm = Math.round((home.time - h) * 60);
    if (t) t.textContent = `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
    if (note) {
      if (alt <= 0) note.textContent = 'Sun is below the horizon';
      else if (hv < 0.15) note.textContent = 'Sun is nearly overhead; the roof takes most of it';
      else note.textContent = `${hottest[0].toUpperCase() + hottest.slice(1)} wall takes the most sun now`;
    }
  }

  function drawSunPath(scene) {
    if (home.path) scene.remove(home.path);
    const pts = [];
    for (let h = 5; h <= 19; h += 0.25) { const { dir, alt } = sunVector(h, home.season); if (alt > 0) pts.push(dir.clone().multiplyScalar(32)); }
    if (pts.length < 2) return;
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    home.path = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: '#F2A33A', dashSize: 0.8, gapSize: 0.5, transparent: true, opacity: 0.8 }));
    home.path.computeLineDistances();
    scene.add(home.path);
  }

  window.init3DViewer = function () {
    const container = document.getElementById('viewer-3d');
    if (!container) return;
    if (home.ready) { rebuildHome(); return; }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9CC5E8');
    scene.fog = new THREE.Fog(scene.background, 45, 90);
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 200);
    const renderer = makeRenderer(container);

    home.hemi = new THREE.HemisphereLight('#DCE9F5', '#7E9B6E', 0.8); scene.add(home.hemi);
    home.sun = new THREE.DirectionalLight('#FFF1D6', 2.2);
    home.sun.castShadow = true;
    home.sun.shadow.mapSize.set(2048, 2048);
    home.sun.shadow.bias = -0.0004;
    home.sun.shadow.normalBias = 0.06;
    Object.assign(home.sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 });
    scene.add(home.sun);
    home.sunBall = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: '#FFD98A' }));
    scene.add(home.sunBall);

    buildSite(scene);
    buildHouse(scene);

    home.scene = scene; home.camera = camera; home.renderer = renderer;
    home.orbit = attachOrbit(container, camera, new THREE.Vector3(0, 1.6, 0), { theta: 0.7, phi: 1.0, radius: 26, min: 12, max: 60 });
    fitOnResize(container, camera, renderer);
    home.ready = true;
    drawSunPath(scene);
    updateSun();

    let last = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (home.playing) { home.time += dt * 1.6; if (home.time > 18.5) home.time = 6; const s = document.getElementById('sun-time'); if (s) s.value = home.time; updateSun(); }
      home.orbit.tick(dt);
      renderer.render(scene, camera);
    })(last);
  };

  function rebuildHome() {
    if (!home.ready) return;
    home.scene.remove(home.group);
    buildHouse(home.scene);
    setViewerMode(home.mode);
    drawSunPath(home.scene);
    updateSun();
  }

  window.setViewerMode = function (mode) {
    home.mode = mode;
    if (typeof ThermaState !== "undefined") ThermaState.viewerMode = mode;
    if (!home.ready) return;
    home.surfaces.forEach((m) => {
      m.material.wireframe = mode === 'wireframe';
      m.material.color.set(mode === 'wireframe' ? '#F2A33A' : m.userData.base);
      m.material.emissive.set('#000000');
    });
    updateSun();
  };

  window.setSunTime = function (v) { home.time = parseFloat(v); updateSun(); };
  window.setSeason = function (s) { home.season = s; if (home.ready) { drawSunPath(home.scene); updateSun(); } };
  window.toggleSunPath = function () {
    home.playing = !home.playing;
    const b = document.getElementById('play-day');
    if (b) b.textContent = home.playing ? 'Pause' : 'Play the day';
  };
  window.toggleAirflowVectors = function () {};
  window.rebuild3DHouse = rebuildHome;

  // ---------- SHELTER VIEWER ----------
  const shed = { ready: false };

  window.initAnimal3DViewer = function () {
    const container = document.getElementById('animal-shelter-canvas');
    if (!container || shed.ready) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#A9CBE3');
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 200);
    const renderer = makeRenderer(container);

    scene.add(new THREE.HemisphereLight('#E8F0F8', '#7E9B6E', 0.9));
    const sun = new THREE.DirectionalLight('#FFF1D6', 2.0); sun.position.set(18, 30, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 100 });
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#8FA070', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const L = 14, W = 7, eaves = 2.8, ridge = 4.3;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.15, W), new THREE.MeshStandardMaterial({ color: '#B9B3A6', roughness: 1 }));
    floor.position.y = 0.075; floor.receiveShadow = true; scene.add(floor);

    const post = new THREE.MeshStandardMaterial({ color: '#6B4A2B', roughness: 0.9 });
    for (let i = 0; i <= 4; i++) {
      const x = -L / 2 + (L / 4) * i;
      [-W / 2, W / 2].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, eaves, 10), post); p.position.set(x, eaves / 2, z); p.castShadow = true; scene.add(p); });
    }
    // low side wall (louvres)
    const louvre = new THREE.MeshStandardMaterial({ color: '#8C6A4A', roughness: 0.9 });
    for (let k = 0; k < 5; k++) {
      [-W / 2, W / 2].forEach((z) => { const s = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, 0.3), louvre); s.position.set(0, 0.5 + k * 0.28, z); s.rotation.x = 0.6 * (z > 0 ? 1 : -1); s.castShadow = true; scene.add(s); });
    }
    // roof: two pitched panels with a ridge gap and a raised cap
    const roofM = new THREE.MeshStandardMaterial({ color: '#C9A15A', roughness: 1 });
    const slope = Math.atan2(ridge - eaves, W / 2);
    const panelLen = Math.hypot(ridge - eaves, W / 2) - 0.35;
    [1, -1].forEach((s) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(L + 0.8, 0.22, panelLen), roofM);
      p.position.set(0, (eaves + ridge) / 2 - 0.1, s * (W / 4 + 0.17));
      p.rotation.x = -s * slope; p.castShadow = true; p.receiveShadow = true; scene.add(p);
    });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(L + 0.8, 0.15, 1.6), roofM);
    cap.position.y = ridge + 0.45; cap.castShadow = true; scene.add(cap);
    [-0.6, 0.6].forEach((z) => { const st = new THREE.Mesh(new THREE.BoxGeometry(L + 0.8, 0.5, 0.06), roofM); st.position.set(0, ridge + 0.2, z); scene.add(st); });

    // animals (simple bodies)
    const body = new THREE.MeshStandardMaterial({ color: '#E6DCCB', roughness: 1 });
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.3, 4, 8), body);
      c.rotation.z = Math.PI / 2; c.position.set(-L / 2 + 1.8 + i * 2.1, 0.95, (i % 2 ? 1.6 : -1.6)); c.castShadow = true; scene.add(c);
    }

    // airflow particles: enter low from both sides, rise, exit at ridge
    const N = 360;
    const pos = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) seed.push({ t: Math.random(), x: (Math.random() - 0.5) * L, side: Math.random() < 0.5 ? -1 : 1, jitter: (Math.random() - 0.5) * 0.6 });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#2F78B7', size: 0.16, transparent: true, opacity: 0.85 }));
    scene.add(pts);
    function place(i, t) {
      const s = seed[i];
      // path: outside low (z = side*W) -> inside (z = side*W/3, y 1.2) -> ridge (z 0, y ridge+0.8) -> above
      let x = s.x, y, z;
      if (t < 0.35) { const u = t / 0.35; z = s.side * (W * 0.85 - u * W * 0.5); y = 0.6 + u * 0.8; }
      else if (t < 0.8) { const u = (t - 0.35) / 0.45; z = s.side * (W * 0.35) * (1 - u); y = 1.4 + u * (ridge - 0.4 + 0.3); }
      else { const u = (t - 0.8) / 0.2; z = s.jitter * u * 2; y = ridge + 0.3 + u * 2.5; }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z + s.jitter * 0.3;
    }

    shed.orbit = attachOrbit(container, camera, new THREE.Vector3(0, 1.8, 0), { theta: 0.8, phi: 1.05, radius: 24, min: 10, max: 50 });
    fitOnResize(container, camera, renderer);
    shed.ready = true;

    let last = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!reduceMotion) for (let i = 0; i < N; i++) { seed[i].t = (seed[i].t + dt * 0.18) % 1; place(i, seed[i].t); }
      else for (let i = 0; i < N; i++) place(i, seed[i].t);
      geo.attributes.position.needsUpdate = true;
      shed.orbit.tick(dt);
      renderer.render(scene, camera);
    })(last);
  };

  window.setAnimalViewMode = function () {};
})();
