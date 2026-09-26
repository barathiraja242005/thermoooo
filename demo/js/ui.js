/**
 * ThermaBuild — page behaviour (v2)
 * Paper grid, header state, parallax and float, section reveal, hero
 * quick-starts, read-only material cards, charts, and the small wrappers
 * that connect the page to app-core.js.
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const parseTemp = (s) => parseFloat(String(s).replace('−', '-'));

  // ---------- toast ----------
  window.toast = function (msg) {
    const region = $('toast-region'); if (!region) return;
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    region.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2800);
  };
  window.alert = (m) => window.toast(String(m).replace(/^Upcoming Engineering Phase: /, ''));

  // ---------- paper grid: uneven ruling, glow and lit cell follow the cursor ----------
  (function paperGrid() {
    const root = document.documentElement, cell = $('paper-cell'), grid = document.querySelector('.paper-grid'), glow = document.querySelector('.paper-glow');
    if (!grid || !glow) return;
    // one repeating tile of unevenly spaced lines (px), so the ruling reads as hand-set rather than graph paper
    const T = 640;
    const X = [0, 88, 152, 296, 352, 472, 560];
    const Y = [0, 104, 168, 300, 384, 448, 552];
    const svg = (alpha) => {
      const l = (x1, y1, x2, y2, a) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(21,23,27,${a})" stroke-width="1"/>`;
      let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" shape-rendering="crispEdges">`;
      X.forEach((x, i) => { s += l(x + .5, 0, x + .5, T, alpha * (i % 3 === 1 ? .6 : 1)); });
      Y.forEach((y, i) => { s += l(0, y + .5, T, y + .5, alpha * (i % 3 === 2 ? .6 : 1)); });
      return `url("data:image/svg+xml,${encodeURIComponent(s + '</svg>')}")`;
    };
    [grid, glow].forEach((el, i) => { el.style.backgroundImage = svg(i ? .26 : .085); el.style.backgroundSize = `${T}px ${T}px`; });
    if (!cell || !finePointer) return;
    const bounds = (arr, v) => { const m = ((v % T) + T) % T; let k = 0; for (let i = 0; i < arr.length; i++) if (arr[i] <= m) k = i; const lo = arr[k], hi = k + 1 < arr.length ? arr[k + 1] : T; return [v - m + lo, hi - lo]; };
    let raf = 0, mx = -999, my = -999;
    const paint = () => {
      raf = 0;
      root.style.setProperty('--mx', `${mx}px`); root.style.setProperty('--my', `${my}px`);
      const [cx, cw] = bounds(X, mx), [cy, ch] = bounds(Y, my);
      cell.style.setProperty('--cx', `${cx}px`); cell.style.setProperty('--cy', `${cy}px`);
      cell.style.width = `${cw + 1}px`; cell.style.height = `${ch + 1}px`;
    };
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; cell.classList.add('on'); if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    document.addEventListener('pointerleave', () => cell.classList.remove('on'));
  })();

  // ---------- header ----------
  const header = $('site-header');
  const studio = $('studio');
  const progressBar = $('header-progress-bar');
  const navLinks = Array.from(document.querySelectorAll('.main-nav a'));
  const sections = ['how', 'climates', 'paths', 'studio'].map((id) => $(id)).filter(Boolean);

  // ---------- parallax: anything with data-depth drifts against the scroll ----------
  const depthEls = Array.from(document.querySelectorAll('[data-depth]'));
  function parallax() {
    if (reduceMotion) return;
    const vh = window.innerHeight;
    depthEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh; // -1 above centre .. 1 below
      el.style.setProperty('--py', (p * parseFloat(el.dataset.depth) * -140).toFixed(1));
    });
  }

  function onScroll() {
    const y = window.scrollY;
    const inStudio = document.body.classList.contains('studio-only');
    let state = 'top';
    if (inStudio) state = 'studio';
    else if (y > 24) state = 'scrolled';
    if (header.dataset.state !== state) header.dataset.state = state;

    let current = null;
    sections.forEach((s) => { if (y + 140 >= s.offsetTop) current = s.id; });
    navLinks.forEach((a) => a.classList.toggle('current', a.getAttribute('href') === `#${current}`));
    parallax();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  const toggle = $('menu-toggle'), nav = $('main-nav');
  toggle?.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); });
  nav?.addEventListener('click', (e) => { if (e.target.tagName === 'A') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });

  // ---------- hero: the pipeline built as a house of blocks ----------
  (function blockHouse() {
    const root = $('blocks'), svg = $('blocks-svg'); if (!root || !svg) return;
    const U = 36, C = 0.866, S = 0.5;
    const iso = (x, y, z) => [+((x - y) * C * U).toFixed(1), +((x + y) * S * U - z * U).toFixed(1)];
    const pts = (list) => list.map((p) => iso(...p).join(',')).join(' ');
    // '@b1'..'@b5' are brand shades from the active theme (js/themes.js), filled in by applyBrand()
    const paint = (c) => (c[0] === '@' ? `data-tok="${c.slice(1)}" data-base="#999" fill="#999"` : `data-base="${c}" fill="${c}"`);
    const face = (k, fill, list) => `<polygon class="${k === 'top' ? 'top' : ''}" data-k="${k}" ${paint(fill)} points="${pts(list)}"/>`;
    const win = (list, door) => { const [a, b, c, d] = list.map((p) => iso(...p)); return `<polygon class="${door ? 'door' : 'win'}" points="${[a, b, c, d].map((p) => p.join(',')).join(' ')}"/>${door ? '' : `<path class="win-glint" d="M${(a[0] * .7 + c[0] * .3).toFixed(1)} ${(a[1] * .7 + c[1] * .3 - 2).toFixed(1)} L${(a[0] * .45 + c[0] * .55).toFixed(1)} ${(a[1] * .45 + c[1] * .55 - 6).toFixed(1)}"/>`}`; };
    const winY = (y, a, b, c, d, door) => win([[a, y, c], [b, y, c], [b, y, d], [a, y, d]], door);
    const winX = (x, a, b, c, d) => win([[x, a, c], [x, b, c], [x, b, d], [x, a, d]]);
    const stud = (x, y, z, col) => {
      const r = 0.17, h = 0.13, rx = 1.2247 * r * U, ry = 0.7071 * r * U, [cx, yb] = iso(x, y, z), yt = yb - h * U;
      return `<path class="stud-side" data-k="right" ${paint(col[2])} d="M${cx - rx} ${yt} L${cx - rx} ${yb} A${rx} ${ry} 0 0 0 ${cx + rx} ${yb} L${cx + rx} ${yt} Z"/><ellipse data-k="top" ${paint(col[0])} cx="${cx}" cy="${yt}" rx="${rx}" ry="${ry}"/>`;
    };
    const box = (x0, x1, y0, y1, z0, z1, col) =>
      face('top', col[0], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]) +
      face('left', col[1], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]) +
      face('right', col[2], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]);
    const studGrid = (x0, x1, y0, y1, z, col, skip) => { let o = ''; for (let y = y0 + 0.5; y < y1; y++) for (let x = x0 + 0.5; x < x1; x++) if (!skip || !skip(x, y)) o += stud(x, y, z, col); return o; };

    const INK = ['#4A4E57', '#2E3138', '#22252A'], WHITE = ['#FFFFFF', '#F2F0EA', '#DEDBD2'], TERRA = ['#F6C3A8', '#EDA07E', '#D8805C'], SAND = ['#FBEBDD', '#F2D6BF', '#E0BC9E'];
    const Z1 = 0.7, Z2 = 2.3, Z3 = 3.4, ZR = 4.9;
    const underWalls = (x, y) => x > 0.5 && x < 6.5 && y > 0.5 && y < 4.5;
    const roofBack = (x0, x1) => face('back', '@b1', [[x0, 0.1, Z3], [x1, 0.1, Z3], [x1, 2.5, ZR], [x0, 2.5, ZR]]) + face('gable', '@b3', [[x1, 0.1, Z3], [x1, 2.5, Z3], [x1, 2.5, ZR]]);
    const roofFront = (x0, x1) => face('slope', '@b2', [[x0, 2.5, ZR], [x1, 2.5, ZR], [x1, 4.9, Z3], [x0, 4.9, Z3]]) + face('gable', '@b4', [[x1, 2.5, Z3], [x1, 4.9, Z3], [x1, 2.5, ZR]]) + face('left', '@b5', [[x0, 4.9, Z3 - 0.18], [x1, 4.9, Z3 - 0.18], [x1, 4.9, Z3], [x0, 4.9, Z3]]);

    const steps = [
      { layer: 'Foundation · inputs', title: 'User requirements', detail: 'House size, type, location, occupancy, winter comfort target', z: 0,
        draw: () => box(0, 3.5, 0, 5, 0, Z1, INK) + studGrid(0, 3.5, 0, 5, Z1, INK, underWalls), badge: [1.75, 5, 0.35] },
      { layer: 'Foundation · inputs', title: 'Climate data', detail: 'Winter sun, night lows, wind and humidity from the climate API', z: 0,
        draw: () => box(3.5, 7, 0, 5, 0, Z1, INK) + studGrid(3.5, 7, 0, 5, Z1, INK, underWalls), badge: [5.25, 5, 0.35] },
      { layer: 'Walls · design', title: 'Design selection model', detail: 'Picks a verified 2D CAD house plan', z: 1,
        draw: () => box(0.5, 2.5, 0.5, 4.5, Z1, Z2, WHITE) + winY(4.5, 1.05, 1.85, Z1, 1.95, true) + studGrid(0.5, 2.5, 0.5, 4.5, Z2, WHITE), badge: [2.15, 4.5, 1.15] },
      { layer: 'Walls · design', title: 'Extract 2D geometry', detail: 'DXF validated with ezdxf; walls, rooms, doors, windows', z: 1,
        draw: () => box(2.5, 4.5, 0.5, 4.5, Z1, Z2, WHITE) + winY(4.5, 2.95, 3.95, 1.25, 1.95) + studGrid(2.5, 4.5, 0.5, 4.5, Z2, WHITE), badge: [4.2, 4.5, 1.2] },
      { layer: 'Walls · design', title: 'Material recommendation', detail: 'Rammed-earth thermal mass, insulation and south-facing glazing', z: 1,
        draw: () => box(4.5, 6.5, 0.5, 4.5, Z1, Z2, TERRA) + winY(4.5, 4.95, 5.95, 1.25, 1.95) + winX(6.5, 0.9, 3.8, 1.05, 2.1) + studGrid(4.5, 6.5, 0.5, 4.5, Z2, TERRA), badge: [6.5, 4.18, 1.5] },
      { layer: 'Walls · design', title: 'FreeCAD + Python', detail: '3D house generated, materials assigned, STEP exported', z: 2,
        draw: () => box(0.5, 6.5, 0.5, 4.5, Z2, Z3, SAND) + winY(4.5, 1.1, 2.0, 2.55, 3.1) + winY(4.5, 3.05, 3.95, 2.55, 3.1) + winY(4.5, 5.0, 5.9, 2.55, 3.1) + winX(6.5, 0.9, 3.8, 2.5, 3.15) + studGrid(0.5, 6.5, 0.5, 4.5, Z3, SAND), badge: [6.5, 4.18, 2.85] },
      { layer: 'Roof · simulation', title: 'PyFluent → ANSYS Fluent', detail: 'Mesh, boundary conditions and solar setup', z: 3,
        draw: () => roofBack(0.1, 6.9), badge: [6.9, 1.45, 3.75] },
      { layer: 'Roof · simulation', title: 'Thermal simulation', detail: 'High-fidelity run, thermal results', z: 3,
        draw: () => roofFront(0.1, 6.9), badge: [3.5, 3.7, 4.12] },
      { layer: 'Roof · simulation', title: 'Report + 3D visualisation', detail: 'Temperatures, heat flow, comparisons', z: 4,
        draw: () => box(4.85, 5.6, 1.0, 1.7, 3.8, 5.55, INK) + box(4.75, 5.7, 0.9, 1.8, 5.55, 5.75, ['@b1', '@b2', '@b3']) + stud(5.22, 1.35, 5.75, ['@b1', '@b2', '@b3']), badge: [5.22, 1.7, 5.05] },
    ];
    const N = steps.length, paintOrder = [0, 1, 2, 3, 4, 5, 6, 8, 7];

    // layer tags down the left, each with a dashed leader to its layer
    const TAGX = -200;
    const tags = [
      { at: [0, 5, 0.35], n: '01–02', label: 'Inputs', show: 0 },
      { at: [0.5, 4.5, 1.5], n: '03–06', label: 'Design', show: 2 },
      { at: [0.1, 4.9, 3.4], n: '07–09', label: 'Simulation', show: 6 },
    ];
    const tagSvg = tags.map((t, i) => { const [x, y] = iso(...t.at); return `<g class="bk-tag" data-show="${t.show}"><line x1="${TAGX + 8}" y1="${y}" x2="${x - 6}" y2="${y}"/><circle cx="${x - 3}" cy="${y}" r="2.5"/><text x="${TAGX}" y="${y + 4}"><tspan class="n">${t.n}</tspan><tspan x="${TAGX}" dy="15">${t.label}</tspan></text></g>`; }).join('');

    const [SX, SY] = [22, 46], SR = 204;
    const [tx1, ty1] = iso(6.5, 2.3, 1.6), [tx2, ty2] = iso(6.5, 1.4, 2.85), [tx3, ty3] = iso(6.5, 3.2, 1.3);
    const sunX = SX + 150, sunY = SY - 118;
    const stars = [[-120, -70], [-60, -120], [10, -140], [80, -110], [-150, 10], [-100, -20], [130, -40], [-30, -90], [150, 60], [-160, 90]].map(([x, y], i) => `<circle cx="${SX + x}" cy="${SY + y}" r="${i % 3 ? 1.4 : 2}" style="--tw:${(i * 0.37).toFixed(2)}s"/>`).join('');
    const sky = `<defs>
        <radialGradient id="bk-day" cx="75%" cy="18%" r="90%"><stop offset="0" stop-color="#FFE7C7"/><stop offset=".55" stop-color="#FDF1E3"/><stop offset="1" stop-color="#F3F1EC"/></radialGradient>
        <radialGradient id="bk-night" cx="30%" cy="15%" r="95%"><stop offset="0" stop-color="#2B3A5C"/><stop offset=".6" stop-color="#1A2338"/><stop offset="1" stop-color="#121829"/></radialGradient>
        <radialGradient id="bk-warm" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FF9A5C" stop-opacity=".55"/><stop offset="1" stop-color="#FF9A5C" stop-opacity="0"/></radialGradient>
        <clipPath id="bk-clip"><circle cx="${SX}" cy="${SY}" r="${SR}"/></clipPath>
      </defs>
      <g class="sky">
        <circle class="sky-base" cx="${SX}" cy="${SY}" r="${SR}"/>
        <circle class="sky-day" cx="${SX}" cy="${SY}" r="${SR}" fill="url(#bk-day)"/>
        <circle class="sky-night" cx="${SX}" cy="${SY}" r="${SR}" fill="url(#bk-night)"/>
        <g class="sky-stars">${stars}</g>
        <g class="sky-moon"><circle cx="${SX - 118}" cy="${SY - 112}" r="17" fill="#F4EBD6"/><circle cx="${SX - 109}" cy="${SY - 118}" r="15" fill="#1F2A43"/></g>
        <g class="sky-sun"><circle class="sun-halo" cx="${sunX}" cy="${sunY}" r="34"/><circle cx="${sunX}" cy="${sunY}" r="17" fill="#FFB347"/></g>
        <ellipse class="sky-warm" cx="${iso(3.5, 2.5, 1.6)[0]}" cy="${iso(3.5, 2.5, 1.6)[1]}" rx="190" ry="130" fill="url(#bk-warm)" clip-path="url(#bk-clip)"/>
        <text class="sky-out" x="${SX - 136}" y="${SY + 124}"><tspan class="sky-out-n">−18.2 °C</tspan><tspan x="${SX - 136}" dy="16">outside, Leh</tspan></text>
      </g>`;
    const rays = `<g class="bk-rays">${[[tx1, ty1], [tx2, ty2], [tx3, ty3]].map(([x, y]) => `<line x1="${sunX - 12}" y1="${sunY + 12}" x2="${x}" y2="${y}"/>`).join('')}</g>`;
    const shadow = `<polygon class="bk-shadow" points="${pts([[-0.3, -0.3, 0], [7.6, -0.3, 0], [7.6, 5.6, 0], [-0.3, 5.6, 0]])}"/>`;
    const blocks = paintOrder.map((i) => { const st = steps[i], [bx, by] = iso(...st.badge); return `<g class="blk" data-i="${i}" style="--hd:${((4 - st.z) * 0.14).toFixed(2)}s">${st.draw()}<g class="bk-badge"><circle cx="${bx}" cy="${by}" r="10"/><text x="${bx}" y="${by}">${i + 1}</text></g></g>`; }).join('');
    const result = `<g transform="translate(168 -154)"><g class="bk-result" id="bk-result"><rect width="168" height="96" rx="16"/><text class="small" x="18" y="27">Indoors at 4 am · example</text><text class="small cold" x="18" y="46">Typical house 1 °C</text><text class="big" x="16" y="82">14 °C</text></g></g>`;
    // phones drop the side tags, so crop tighter and let the house fill the width
    const narrow = window.matchMedia('(max-width: 600px)');
    const fitView = () => svg.setAttribute('viewBox', narrow.matches ? '-188 -160 530 408' : '-262 -160 604 408');
    fitView(); narrow.addEventListener('change', fitView);
    svg.innerHTML = sky + shadow + tagSvg + blocks + rays + result;

    const groups = Array.from(svg.querySelectorAll('.blk')).sort((a, b) => a.dataset.i - b.dataset.i);
    const faces = Array.from(svg.querySelectorAll('[data-k]'));
    const tagEls = Array.from(svg.querySelectorAll('.bk-tag')), resultEl = $('bk-result');
    const numEl = $('bk-num'), layerEl = $('bk-layer'), titleEl = $('bk-title'), detailEl = $('bk-detail'), textEl = titleEl.parentElement, toggle = $('bk-toggle'), caption = $('bk-caption');

    // day: the sun-facing mass warms up; night: the walls glow as they hand the heat back
    const DAY = { top: '#FFE6C9', left: '#FBD0A2', right: '#F7A866', slope: '#6D3FE0', back: '#9B7BFF', gable: '#4F25B5' };
    const NIGHT = { top: '#F09A63', left: '#D9713F', right: '#E4804A', slope: '#2E1F5C', back: '#3A2A70', gable: '#22164A' };
    let curPal = null;
    const paintMode = (pal) => { curPal = pal; faces.forEach((f) => f.setAttribute('fill', pal ? pal[f.dataset.k] || f.dataset.base : f.dataset.base)); };
    function applyBrand() {
      const s = window.TBTheme ? TBTheme.shades() : { b1: '#9B7BFF', b2: '#6D3FE0', b3: '#5A2DC7', b4: '#4F25B5', b5: '#3F1D96', n1: '#2E1F5C', n2: '#3A2A70', n3: '#22164A' };
      svg.querySelectorAll('[data-tok]').forEach((f) => { f.dataset.base = s[f.dataset.tok]; });
      Object.assign(DAY, { slope: s.b2, back: s.b1, gable: s.b4 });
      Object.assign(NIGHT, { slope: s.n1, back: s.n2, gable: s.n3 });
      paintMode(curPal);
    }
    applyBrand();
    window.addEventListener('thermabuild:theme', applyBrand);

    let shownKey = '';
    function say(num, layer, title, detail, pct) {
      const key = num + title; caption.style.setProperty('--p', pct + '%');
      if (key === shownKey) return; shownKey = key;
      numEl.textContent = num; layerEl.textContent = layer; titleEl.textContent = title; detailEl.textContent = detail;
      textEl.classList.remove('swap'); void textEl.offsetWidth; textEl.classList.add('swap');
    }
    const sayStep = (i) => say(String(i + 1).padStart(2, '0'), steps[i].layer, steps[i].title, steps[i].detail, ((i + 1) / N) * 100);
    const setCur = (i) => groups.forEach((g, j) => g.classList.toggle('cur', j === i));

    // the timeline: nine drops, a winter day, a winter night, then take it apart
    const STEP_MS = 1500;
    const timeline = [];
    steps.forEach((_, i) => timeline.push({ ms: i === 0 ? 700 : STEP_MS, run: () => drop(i) }));
    timeline.push({ ms: 1500, run: () => { setCur(-1); root.classList.add('day'); paintMode(DAY); say('Day', 'Day · 1 pm in January', 'The sun charges the walls', 'Winter sun pours through south glass into the earth walls', 100); } });
    timeline.push({ ms: 3600, run: () => { root.classList.remove('day'); root.classList.add('night'); paintMode(NIGHT); resultEl.classList.add('on'); say('Night', 'Night · 4 am · example run', 'The walls give the heat back', '−18.2 °C outside. About 14 °C inside, no heater.', 100); } });
    timeline.push({ ms: 5200, run: takeApart });
    let step = 0, timer = null, playing = !reduceMotion, hovering = false;

    function drop(i) {
      const g = groups[i]; g.classList.remove('out'); g.classList.add('in', 'land'); setTimeout(() => g.classList.remove('land'), 700);
      setCur(i); sayStep(i);
      tagEls.forEach((t) => { if (+t.dataset.show <= i) t.classList.add('on'); });
    }
    function takeApart() {
      resultEl.classList.remove('on'); setCur(-1);
      [...groups].reverse().forEach((g, j) => setTimeout(() => { g.classList.remove('in'); g.classList.add('out'); }, j * 70));
      setTimeout(() => { root.classList.remove('day', 'night'); paintMode(null); tagEls.forEach((t) => t.classList.remove('on')); groups.forEach((g) => g.classList.remove('out')); }, N * 70 + 450);
    }
    function tick() {
      if (!playing || hovering) { timer = setTimeout(tick, 300); return; }
      timeline[step].run(); step = (step + 1) % timeline.length;
      timer = setTimeout(tick, timeline[step].ms);
    }
    function setPlaying(on) { playing = on; toggle.setAttribute('aria-pressed', String(on)); toggle.setAttribute('aria-label', on ? 'Pause' : 'Play'); }
    toggle.addEventListener('click', () => setPlaying(!playing));

    // hover a block: lift it and read out its step; the run waits meanwhile
    groups.forEach((g, i) => {
      g.addEventListener('pointerenter', () => { if (!g.classList.contains('in')) return; hovering = true; g.classList.add('lift'); setCur(i); sayStep(i); });
      g.addEventListener('pointerleave', () => { hovering = false; g.classList.remove('lift'); });
    });

    if (reduceMotion) { groups.forEach((g) => g.classList.add('in')); tagEls.forEach((t) => t.classList.add('on')); root.classList.add('night'); paintMode(NIGHT); resultEl.classList.add('on'); say('Night', 'Night · 4 am · example run', 'The walls give the heat back', '−18.2 °C outside. About 14 °C inside, no heater.', 100); setPlaying(false); }
    else timer = setTimeout(tick, timeline[0].ms);
  })();

  // ---------- hero: climate quick-starts ----------
  document.querySelectorAll('.start-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      choosePath(1, true);
      selectMapPreset(chip.dataset.start);
      enterStudio();
    });
  });

  // ---------- scroll reveal ----------
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  revealEls.forEach((el) => { const sib = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal')); el.style.setProperty('--stagger', `${Math.min(sib.indexOf(el), 6) * 0.08}s`); });
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  revealEls.forEach((el) => io.observe(el));

  // how-it-works line fill follows scroll
  const howSteps = $('how-steps'), howFill = $('how-line-fill');
  if (howSteps && howFill) {
    const upd = () => { const r = howSteps.getBoundingClientRect(); const vh = window.innerHeight; const p = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / r.height)); howFill.style.setProperty('--fill', `${p * 100}%`); };
    window.addEventListener('scroll', upd, { passive: true }); upd();
  }

  // subtle parallax inside path-card images
  if (!reduceMotion) {
    const inner = Array.from(document.querySelectorAll('[data-parallax-inner]'));
    const upd = () => { const vh = window.innerHeight; inner.forEach((img) => { const r = img.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; const p = (r.top + r.height / 2 - vh / 2) / vh; img.style.transform = `translateY(${p * -14}px) scale(1.08)`; }); };
    window.addEventListener('scroll', upd, { passive: true }); upd();
  }

  // ---------- climates: thermometer skyline (scrolls sideways) ----------
  (function skyline() {
    const track = $('sky-track'), scroller = $('sky-scroll'), sky = $('skyline'), axis = $('sky-axis'), bg = $('sky-bg'), read = $('sky-read');
    if (!track || !window.TB_PLACES) return;
    const MIN = -40, MAX = 50, frac = (t) => (t - MIN) / (MAX - MIN), pct = (t) => `${(frac(t) * 100).toFixed(2)}%`;
    const deg = (t, d = 0) => `${t < 0 ? '−' : ''}${Math.abs(t).toFixed(d)}`;
    const GROUPS = { cold: 'Cold regions', city: 'Cities' };
    const mid = (r) => (r.lo + r.hi) / 2;
    const rows = window.TB_PLACES.slice().sort((a, b) => (a.group === b.group ? mid(a) - mid(b) : a.group === 'cold' ? -1 : 1));
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));

    // Headline from the data: the coldest and hottest days on the chart
    const coldest = rows.reduce((a, b) => (b.rlo < a.rlo ? b : a)), hottest = rows.reduce((a, b) => (b.rhi > a.rhi ? b : a));
    const title = $('climates-title');
    if (title) title.textContent = `From ${deg(coldest.rlo)} °C in ${coldest.name} to ${deg(hottest.rhi)} °C in ${hottest.name}.`;

    // Scale (fixed on the left) and the grid and comfort band behind the scroller
    const ticks = [-40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
    axis.innerHTML = ticks.map((t) => `<span style="--yf:${frac(t).toFixed(4)}">${deg(t)}°</span>`).join('');
    bg.innerHTML = `<div class="sky-band" style="--lo:${pct(22)};--hi:${pct(27)}"></div>` + ticks.map((t) => `<i class="sky-grid${t === 0 ? ' zero' : ''}" style="--y:${pct(t)}"></i>`).join('');

    const col = (r, i) => `
      <button type="button" class="sky-col" role="listitem" data-key="${r.key}"
        style="--lo:${pct(r.lo)};--hi:${pct(r.hi)};--rlo:${pct(r.rlo)};--rhi:${pct(r.rhi)};--lo-f:${frac(r.lo).toFixed(4)};--hi-f:${frac(r.hi).toFixed(4)};--d:${Math.min(i, 12) * 0.06}s"
        aria-label="${r.name}, ${r.sub}: winter nights ${deg(r.lo, 1)} °C, summer afternoons ${deg(r.hi, 1)} °C. Design here.">
        <span class="sky-plotcol">
          <span class="sky-tube"><i class="sky-rec"></i><span class="sky-fill"></span><i class="sky-dot lo"></i><i class="sky-dot hi"></i></span>
          <span class="sky-val hi">${deg(r.hi)}°</span><span class="sky-val lo">${deg(r.lo)}°</span>
        </span>
        <span class="sky-name">${r.name}<small>${r.sub}</small></span>
      </button>`;
    let i = 0;
    track.innerHTML = Object.keys(GROUPS).map((g) => {
      const list = rows.filter((r) => r.group === g);
      return `<div class="sky-grp" data-g="${g}"><p class="sky-grp-h">${GROUPS[g]}<span>${list.length}</span></p><div class="sky-grp-cols">${list.map((r) => col(r, i++)).join('')}</div></div>`;
    }).join('');
    document.querySelectorAll('#sky-filter .seg').forEach((b) => { const n = b.dataset.g === 'all' ? rows.length : rows.filter((r) => r.group === b.dataset.g).length; b.querySelector('span').textContent = n; });

    // Readout under the chart: the hovered or focused place, else the selected one
    let selected = byKey[ThermaState.city] ? ThermaState.city : 'leh';
    function show(key) {
      const r = byKey[key]; if (!r) return;
      read.innerHTML = `
        <div class="sr-place"><strong>${r.name}</strong><span>${r.sub} · ${fmtInt(r.elev)} m</span></div>
        <dl class="sr-stats">
          <div><dt>${r.loM} nights</dt><dd class="c">${deg(r.lo, 1)} °C</dd></div>
          <div><dt>${r.hiM} afternoons</dt><dd class="h">${deg(r.hi, 1)} °C</dd></div>
          <div><dt>10-year extremes</dt><dd>${deg(r.rlo, 1)} to ${deg(r.rhi, 1)} °C</dd></div>
        </dl>
        <button type="button" class="btn btn-primary btn-sm sr-go" data-key="${r.key}">Design in ${r.name}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`;
    }
    const fmtInt = (n) => Math.round(n).toLocaleString('en-IN');
    function mark(key) {
      selected = key;
      track.querySelectorAll('.sky-col').forEach((b) => { const on = b.dataset.key === key; b.classList.toggle('active', on); b.setAttribute('aria-current', on ? 'true' : 'false'); });
      show(key);
    }
    mark(selected);

    // Start designing at a place: stored studio climate for presets, live NASA POWER for the rest
    function design(key) {
      const r = byKey[key]; if (!r) return;
      mark(key);
      choosePath(1, true);
      if (r.preset) selectMapPreset(r.preset);
      else {
        setSiteLabel(`${r.name}, ${r.sub.split(',').pop().trim()}`);
        updateLocationCoords(r.lat, r.lon);
        if (typeof leafletMap !== 'undefined' && leafletMap) leafletMap.setView([r.lat, r.lon], SITE_ZOOM, { animate: false });
        document.querySelectorAll('#preset-chips .chip').forEach((c) => c.classList.remove('active'));
      }
      toast(`Site set to ${r.name}`);
      enterStudio();
    }

    // Mouse: click designs straight away. Touch: the first tap selects (shows the readout), a second tap or the button designs.
    let lastPointer = 'mouse', dragged = false;
    track.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; }, true);
    track.addEventListener('click', (e) => {
      const b = e.target.closest('.sky-col'); if (!b) return;
      if (dragged) { e.preventDefault(); return; }
      if (lastPointer === 'touch' && b.dataset.key !== selected) { mark(b.dataset.key); return; }
      design(b.dataset.key);
    });
    read.addEventListener('click', (e) => { const b = e.target.closest('.sr-go'); if (b) design(b.dataset.key); });
    track.addEventListener('pointerover', (e) => { const b = e.target.closest('.sky-col'); if (b && e.pointerType === 'mouse') show(b.dataset.key); });
    track.addEventListener('focusin', (e) => { const b = e.target.closest('.sky-col'); if (b) show(b.dataset.key); });
    track.addEventListener('pointerleave', () => show(selected));
    track.addEventListener('focusout', (e) => { if (!track.contains(e.relatedTarget)) show(selected); });

    // Filter
    document.querySelectorAll('#sky-filter .seg').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('#sky-filter .seg').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
      track.querySelectorAll('.sky-grp').forEach((g) => { g.hidden = b.dataset.g !== 'all' && g.dataset.g !== b.dataset.g; });
      scroller.scrollTo({ left: 0, behavior: 'instant' });
      update();
    }));

    // Arrows, progress bar, edge fades
    const prev = $('sky-prev'), next = $('sky-next'), thumb = $('sky-thumb'), frame = $('sky-frame');
    function update() {
      const max = scroller.scrollWidth - scroller.clientWidth, x = scroller.scrollLeft;
      prev.disabled = x <= 2; next.disabled = x >= max - 2;
      frame.classList.toggle('at-start', x <= 2); frame.classList.toggle('at-end', x >= max - 2);
      const w = max > 0 ? scroller.clientWidth / scroller.scrollWidth : 1;
      thumb.style.width = `${w * 100}%`; thumb.style.transform = `translateX(${max > 0 ? (x / max) * ((1 - w) / w) * 100 : 0}%)`;
      thumb.parentElement.hidden = max <= 2;
    }
    const page = (dir) => scroller.scrollBy({ left: dir * Math.max(200, scroller.clientWidth * 0.8), behavior: reduceMotion ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => page(-1));
    next.addEventListener('click', () => page(1));
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Drag to scroll with a mouse (touch and trackpads scroll natively)
    let down = null;
    scroller.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = { x: e.clientX, left: scroller.scrollLeft }; dragged = false; });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (!dragged && Math.abs(dx) > 6) { dragged = true; scroller.classList.add('is-dragging'); }
      if (dragged) scroller.scrollLeft = down.left - dx;
    });
    window.addEventListener('pointerup', () => { if (!down) return; down = null; scroller.classList.remove('is-dragging'); setTimeout(() => { dragged = false; }, 0); });

    window.addEventListener('thermabuild:site', () => { if (!ThermaState.siteLabel && byKey[ThermaState.city]) mark(ThermaState.city); });
    sky.classList.add('ready');
  })();

  // ---------- paths ----------
  window.choosePath = function (n, quiet) {
    document.querySelectorAll('.path-card').forEach((c) => { const on = c.id === `flow-card-${n}`; c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on)); });
    switchMainFlow(n);
    const names = { 1: 'a new home', 2: 'a home from your plan', 3: 'an upgrade for your home', 4: 'a livestock shelter' };
    const short = { 1: 'New home', 2: 'Your plan', 3: 'Upgrade', 4: 'Shelter' };
    $('studio-path-name').textContent = names[n];
    $('header-status-path').textContent = short[n];
    if (!quiet) enterStudio();
  };

  // ---------- studio as its own page ----------
  // The landing page (hero, how it works, paths, climates) and the studio never scroll into each
  // other: choosing a path swaps to the studio view, Back (or the browser back button) returns.
  const LANDING = ['top', 'hero', 'how', 'paths', 'climates'];
  function showStudio(on) {
    document.body.classList.toggle('studio-only', on);
    window.scrollTo({ top: 0, behavior: 'instant' });
    onScroll();
    if (on) setTimeout(() => { if (typeof leafletMap !== 'undefined' && leafletMap) leafletMap.invalidateSize(); window.dispatchEvent(new Event('resize')); }, 60);
  }
  function enterStudio(push = true) {
    if (!document.body.classList.contains('studio-only')) showStudio(true);
    else window.scrollTo({ top: 0, behavior: 'instant' });
    if (push) history.pushState({ tb: 'studio' }, '', `?view=studio&path=${ThermaState.activeFlow}`);
  }
  function exitStudio(target = 'top', push = true) {
    if (document.body.classList.contains('studio-only')) showStudio(false);
    if (push) {
      if (history.state && history.state.tb === 'studio') { history.back(); return; } // popstate finishes
      history.replaceState({ tb: 'home' }, '', location.pathname);
    }
    const el = $(target);
    if (el && target !== 'top' && target !== 'hero') el.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  window.enterStudio = enterStudio;
  window.exitStudio = exitStudio;
  let exitTarget = 'top';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; // we place the scroll ourselves
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.tb === 'studio') enterStudio(false);
    else { const t = exitTarget; exitTarget = 'top'; exitStudio(t, false); }
  });
  $('studio-back')?.addEventListener('click', () => { exitTarget = 'top'; exitStudio('top'); });
  // In-page links: landing anchors leave the studio, studio anchors enter it (keeping progress)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const inStudio = document.body.classList.contains('studio-only');
    if (id === 'studio') { e.preventDefault(); enterStudio(!inStudio); return; }
    if (inStudio && LANDING.includes(id)) {
      e.preventDefault(); exitTarget = id;
      if (history.state && history.state.tb === 'studio') history.back();
      else exitStudio(id);
    }
  });

  // ---------- step navigation wrapper ----------
  const _goToStep = window.goToStep;
  window.goToStep = function (n) {
    const before = ThermaState.currentStep;
    _goToStep(n);
    if (ThermaState.currentStep !== n) return; // was locked
    const total = ThermaState.activeFlow === 2 ? 4 : 5;
    $('header-status-step').textContent = `Step ${n} of ${total}`;
    if (progressBar) progressBar.style.width = `${(n / total) * 100}%`;
    const visible = Array.from(document.querySelectorAll('.step-panel')).find((p) => p.style.display !== 'none');
    if (visible) { visible.classList.remove('panel-in'); void visible.offsetWidth; visible.classList.add('panel-in'); }
    if (before !== n) {
      const top = $('stepper-wrap').getBoundingClientRect().top + window.scrollY - 80;
      if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: reduceMotion || window.__instantNav ? 'auto' : 'smooth' });
      const tab = document.querySelector('.stepper .step-tab.active');
      if (tab) { const rail = tab.parentElement; rail.scrollTo({ left: tab.offsetLeft - rail.clientWidth / 2 + tab.offsetWidth / 2, behavior: 'smooth' }); }
    }
    if (n === 3) renderMaterialCards();
    if (n === 5 || (ThermaState.activeFlow === 2 && n === 4)) renderReport();
    if (ThermaState.activeFlow === 3 && n === 3) updateUBars();
  };

  // ---------- form helpers ----------
  window.seg = function (btn) { btn.parentElement.querySelectorAll('.seg').forEach((b) => b.classList.toggle('active', b === btn)); };
  window.stageTab = function (btn) { btn.parentElement.querySelectorAll('.stage-tab').forEach((b) => { const on = b === btn; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); }); };

  window.setBHK = function (val, label) { $('bhk-select').value = val; updateBHKSelection(val); $('bhk-badge').value = label; $('bhk-badge').textContent = label; syncAreaFromState(); };
  function syncAreaFromState() {
    const a = ThermaState.areaSqFt; $('plot-area-slider').value = a; $('area-slider-val').textContent = `${Number(a).toLocaleString()} sq ft (${(a * 0.092903).toFixed(1)} m²)`;
    $('plot-width-slider').value = ThermaState.widthM; $('width-slider-val').textContent = `${ThermaState.widthM.toFixed(1)} m`;
    $('plot-length-slider').value = ThermaState.lengthM; $('length-slider-val').textContent = `${ThermaState.lengthM.toFixed(1)} m`;
  }
  window.onAreaInput = function (v) { $('plot-area-input').value = v; updateDimensionsFromArea(v); syncAreaFromState(); };
  window.onPlotInput = function (which, v) { v = parseFloat(v); if (which === 'width') { ThermaState.widthM = v; $('plot-width-input').value = v; $('width-slider-val').textContent = `${v.toFixed(1)} m`; } else { ThermaState.lengthM = v; $('plot-length-input').value = v; $('length-slider-val').textContent = `${v.toFixed(1)} m`; } };
  const facingHints = { north: 'North entrances keep the main door out of direct sun and suit most Indian climates.', east: 'East entrances catch gentle morning sun; good for cold and mild climates.', south: 'South entrances take strong midday sun; add a deep porch or airlock.', west: 'West entrances face the hottest afternoon sun; shade them well.' };
  window.setFacing = function (f) { $('facing-select').value = f; calculateVastuScore(); $('facing-badge').textContent = f[0].toUpperCase() + f.slice(1); $('facing-hint').textContent = facingHints[f]; $('vastu-grid').dataset.facing = f; if (window.rebuild3DHouse) rebuild3DHouse(); };

  // dropzones: highlight on drag
  document.querySelectorAll('.dropzone').forEach((dz) => { ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.add('is-over'))); ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('is-over'))); });

  // ---------- best materials: read-only cards that follow the prediction engine ----------
  const section = (layers) => `<span class="best-section" aria-hidden="true">${layers.map(([w, c]) => `<i style="flex:${w};background:${c}"></i>`).join('')}</span>`;
  const WALLS = {
    rammed_earth: { name: 'Rammed earth, 350 mm', why: 'Heavy earth wall with lime render. Stores the day\'s heat and releases it slowly at night.', specs: ['U 0.45 W/m²K', '10.2 h heat delay'], layers: [[1, '#E8E1D3'], [9, '#B98A5E'], [1, '#E8E1D3']] },
    aac_aerogel: { name: 'AAC block, 200 mm', why: 'Lightweight aerated blocks with insulating plaster. Handles hot summers and cold winters.', specs: ['U 0.42 W/m²K', '6.8 h heat delay'], layers: [[1, '#E8E1D3'], [6, '#C9CCCB'], [1, '#E8E1D3']] },
    cavity_brick: { name: 'Cavity terracotta, 300 mm', why: 'Two clay skins with 50 mm rock wool between them. Keeps desert heat out of the rooms.', specs: ['U 0.36 W/m²K', '8.5 h heat delay'], layers: [[3, '#B8623C'], [2, '#E9CF6B'], [3, '#B8623C']] },
    cseb_cork: { name: 'Compressed earth block, 250 mm', why: 'Local soil blocks with a cork core. Low embodied carbon for a mild climate.', specs: ['U 0.39 W/m²K', '≈8 h heat delay'], layers: [[4, '#A87B55'], [1.5, '#8C6A4A'], [3, '#A87B55']] },
    clt_woodfiber: { name: 'Timber panel (CLT), 140 mm', why: 'Cross-laminated timber with wood-fibre insulation. Breathes in humid air.', specs: ['U 0.29 W/m²K', '≈9 h heat delay'], layers: [[4, '#D8B27A'], [3, '#C9A77F'], [1, '#E8E1D3']] }
  };
  const ROOFS = {
    cool_roof: { name: 'White cool roof, 100 mm insulation', why: 'Reflects most of the sun before it becomes heat. Insulation stops the rest.', specs: ['U 0.26 W/m²K', 'SRI 104'], layers: [[1, '#F4F4F0'], [3, '#D9D9D2'], [4, '#9A9A93']] },
    green_roof: { name: 'Planted green roof, 120 mm soil', why: 'Soil and plants cool the roof by evaporation and shade it all day.', specs: ['U 0.22 W/m²K', 'Evaporative'], layers: [[2, '#6FA36B'], [3, '#6E5237'], [3, '#9A9A93']] },
    poplar_mud: { name: 'Ventilated poplar-and-mud roof', why: 'The traditional Ladakhi roof, ventilated and lined so it holds warmth in winter.', specs: ['U 0.24 W/m²K', 'Vernacular'], layers: [[3, '#A8875F'], [2, '#D8B27A'], [3, '#A8875F']] },
    terracotta_double: { name: 'Double clay tile with reflective foil', why: 'Two tile layers with an air gap and foil. Sheds rain and bounces heat back.', specs: ['U 0.32 W/m²K', 'Radiant barrier'], layers: [[2, '#B8623C'], [1, '#E8E1D3'], [2, '#B8623C']] }
  };
  const GLAZING = {
    low_e_double: { name: 'Double glazed, low-E, argon', why: 'Lets daylight in and blocks most of the heat with it.', specs: ['U 1.35 W/m²K', 'SHGC 0.32'], layers: [[1, '#BFD6EC'], [2, '#EEF4FA'], [1, '#BFD6EC']] },
    krypton_triple: { name: 'Triple glazed, krypton', why: 'Three panes for sub-zero winters. Almost no heat escapes through the glass.', specs: ['U 0.78 W/m²K', 'SHGC 0.28'], layers: [[1, '#BFD6EC'], [1, '#EEF4FA'], [1, '#BFD6EC'], [1, '#EEF4FA'], [1, '#BFD6EC']] },
    smart_electrochromic: { name: 'Self-tinting smart glass', why: 'Tints itself in strong sun and clears on cloudy days. Daylight without the glare.', specs: ['U 1.10 W/m²K', 'SHGC 0.09–0.45'], layers: [[1, '#7FA6C9'], [2, '#3D5A7A'], [1, '#7FA6C9']] },
    single_clear: { name: 'Single clear glass', why: 'Ordinary glass, shown for comparison only.', specs: ['U 5.70 W/m²K', 'SHGC 0.82'], layers: [[1, '#DCE9F5']] }
  };
  const A_ROOFS = {
    thatch: { name: 'Layered paddy-straw thatch, 180 mm', why: 'Thick straw blocks overhead sun and holds warmth on cold nights.', layers: [[1, '#D9C27A'], [1, '#C4A85C'], [1, '#D9C27A']] },
    white_aluminum: { name: 'White aluminium with glass-wool lining', why: 'Reflects harsh sun. The lining stops the sheet radiating heat down.', layers: [[1, '#F4F4F0'], [2, '#E5D9A8']] },
    terracotta_tiles: { name: 'Clay tiles on bamboo trusses', why: 'Breathable clay for a mild climate. Bamboo keeps it light and cheap.', layers: [[2, '#B8623C'], [1, '#C9A77F']] },
    puff_sandwich: { name: '50 mm insulated sandwich panel', why: 'Sealed insulated panel for controlled sheds.', layers: [[1, '#D9D9D2'], [2, '#F0E7B6'], [1, '#D9D9D2']] }
  };
  const A_WALLS = {
    slatted_louvers: { name: 'Open timber louvres', why: 'About 15 air changes an hour. Breeze in, heat and ammonia out.', layers: [[1, '#C9A77F'], [1, '#F8F7FB'], [1, '#C9A77F'], [1, '#F8F7FB'], [1, '#C9A77F']] },
    poultry_mesh: { name: 'Wire mesh with roll-up curtains', why: 'About 18 air changes an hour for humid coasts. Curtains drop in storms.', layers: [[1, '#B9BDC2'], [1, '#F8F7FB'], [1, '#B9BDC2']] },
    rammed_half_wall: { name: 'Low earth wall with bamboo screen', why: 'Earth shields animals from cold wind. The screen above still lets air move.', layers: [[2, '#B98A5E'], [1, '#C9A77F']] }
  };
  const A_FLOORS = {
    grooved_concrete: { name: 'Grooved non-slip concrete with drain', why: 'Grip for hooves and a slope that drains quickly.', layers: [[1, '#9A9A93'], [1, '#B5B5AE']] },
    slatted_timber: { name: 'Raised timber slats with dung trays', why: 'Keeps birds and small stock off the wet floor.', layers: [[1, '#C9A77F'], [1, '#F8F7FB'], [1, '#C9A77F']] },
    vulcanized_rubber: { name: 'Rubber comfort mats', why: 'Soft, warm footing that cleans easily.', layers: [[1, '#3A3D42']] }
  };
  const CLIMATE_WORDS = { leh: 'cold, dry, high-altitude', dras: 'cold, dry, high-altitude', kargil: 'cold, dry, high-altitude', nubra: 'cold, dry, high-altitude', spiti: 'cold, dry, high-altitude', pangong: 'cold, dry, high-altitude', jaisalmer: 'hot, dry desert', chennai: 'warm, humid coastal', bengaluru: 'mild plateau', new_delhi: 'composite' };
  function placeName() { const p = LOCATION_PRESETS[ThermaState.city]; return p ? p.name.split(',')[0].replace(' Main Bazaar', '').replace(/\s*\(.*$/, '') : 'your site'; }
  function climateWords() { return CLIMATE_WORDS[ThermaState.city] || ($('climate-zone')?.textContent.split('/')[0].trim().toLowerCase() || 'local'); }
  const card = (part, m) => `<p class="best-part">${part}</p>${section(m.layers)}<p class="best-name">${m.name}</p><p class="best-why">${m.why}</p>${m.specs ? `<div class="best-specs">${m.specs.map((s) => `<span>${s}</span>`).join('')}</div>` : ''}`;
  const row = (part, m) => `${section(m.layers)}<div><p class="best-part">${part}</p><p class="best-name">${m.name}</p><p class="best-why">${m.why}</p></div>`;

  function renderMaterialCards() {
    const eng = window.TBApp && window.TBApp.engineCards ? window.TBApp.engineCards() : null;
    const w = eng ? eng.wall : WALLS[ThermaState.wallMat] || WALLS.rammed_earth, r = eng ? eng.roof : ROOFS[ThermaState.roofMat] || ROOFS.cool_roof, g = eng ? eng.glazing : GLAZING[ThermaState.glazingMat] || GLAZING.low_e_double;
    if ($('best-wall')) { $('best-wall').innerHTML = card('Walls', w); $('best-roof').innerHTML = card('Roof', r); $('best-glazing').innerHTML = card('Windows', g); }
    if ($('best-sub')) $('best-sub').textContent = eng ? `Chosen by simulation for ${placeName()}'s ${climateWords()} climate. The report is calculated on exactly these.` : `Chosen for ${placeName()}'s ${climateWords()} climate. The report is calculated on exactly these.`;
    if (eng && $('ai-predict-rationale')) $('ai-predict-rationale').textContent = eng.rationale;
    const ea = window.TBApp && window.TBApp.engineAnimalCards ? window.TBApp.engineAnimalCards() : null;
    const ar = ea ? ea.roof : A_ROOFS[$('animal-roof-material')?.value] || A_ROOFS.thatch, aw = ea ? ea.wall : A_WALLS[$('animal-wall-material')?.value] || A_WALLS.slatted_louvers, af = ea ? ea.floor : A_FLOORS[$('animal-floor-material')?.value] || A_FLOORS.grooved_concrete;
    if ($('best-animal-roof')) { $('best-animal-roof').innerHTML = row('Roof', ar); $('best-animal-wall').innerHTML = row('Side walls', aw); $('best-animal-floor').innerHTML = row('Floor', af); }
    const species = { cattle: 'dairy cattle', poultry: 'poultry', goat: 'goats and sheep' }[ThermaState.animalSpecies] || 'your animals';
    if ($('animal-best-sub')) $('animal-best-sub').textContent = `Chosen for ${placeName()}'s ${climateWords()} climate and ${species}.`;
    // the engine's own rationale, tidied for reading
    const rat = $('ai-predict-rationale'); if (rat && !eng) rat.textContent = rat.textContent.replace(/^Predicted for [^:]+:\s*/, '');
    const arat = $('animal-ai-predict-rationale'); if (arat) arat.textContent = ea ? ea.rationale : arat.textContent.replace(/^[^:]+:\s*/, '');
  }
  window.renderMaterialCards = renderMaterialCards;
  const _updRes = window.updateResidentialMaterialsReport, _updLive = window.updateLivestockMaterialsReport;
  window.updateResidentialMaterialsReport = function () { _updRes(); renderMaterialCards(); };
  window.updateLivestockMaterialsReport = function () { _updLive(); renderMaterialCards(); };
  const _selAnimalPlan = window.selectAnimalPlan;
  window.selectAnimalPlan = function (i) { _selAnimalPlan(i); renderMaterialCards(); };
  renderMaterialCards();

  // ---------- climate card hook (called by app-core after a location change) ----------
  window.onClimateUpdate = function (preset) {
    const lo = parseTemp($('climate-winter-temp').textContent), hi = parseTemp($('climate-summer-temp').textContent);
    if (!isNaN(lo) && !isNaN(hi)) { const MIN = -30, span = 80; const f = $('temp-fill'); f.style.setProperty('--l', `${((lo - MIN) / span) * 100}%`); f.style.setProperty('--w', `${((hi - lo) / span) * 100}%`); }
    const windText = $('climate-wind').textContent;
    const dirs = { 'north-northwest': 337, northwest: 315, 'west-northwest': 292, west: 270, 'west-southwest': 247, southwest: 225, 'south-southwest': 202, south: 180, 'south-southeast': 157, southeast: 135, 'east-southeast': 112, east: 90, northeast: 45, north: 0 };
    const key = Object.keys(dirs).sort((a, b) => b.length - a.length).find((k) => windText.toLowerCase().includes(k));
    const arrow = $('wind-arrow'); if (arrow) arrow.style.transform = `rotate(${key ? dirs[key] + 180 : 0}deg)`; // wind blows *from* the direction
    document.querySelectorAll('#preset-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.preset === ThermaState.city));
    $('climate-card-title').textContent = preset ? preset.name.split('(')[0].trim() : (ThermaState.siteLabel || 'Your site');
    $('report-place').textContent = preset ? preset.name.split('(')[0].trim() : (ThermaState.siteLabel || `${ThermaState.lat}° N, ${ThermaState.lon}° E`);
    renderMaterialCards();
    window.dispatchEvent(new Event('thermabuild:site'));
    if (window.rebuild3DHouse) rebuild3DHouse();
  };

  // ---------- report: computed by the engine (js/report.js) ----------
  function renderReport() {
    if (ThermaState.activeFlow === 4) return;
    if (window.TBApp && window.TBApp.renderHouse) window.TBApp.renderHouse();
  }
  window.renderReport = renderReport;

  function countUp(el, target, fmt) {
    if (!el) return;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    let t0 = null; const dur = 1400;
    const step = (now) => { if (t0 === null) t0 = now; const p = Math.max(0, Math.min(1, (now - t0) / dur)); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * e); if (p < 1) requestAnimationFrame(step); };
    el.textContent = fmt(0); requestAnimationFrame(step);
  }
  window.countUp = countUp;

  // ---------- flow 3: U-value bars ----------
  function updateUBars() {
    document.querySelectorAll('.upgrade .u-bars').forEach((bars) => {
      const now = bars.querySelector('.u-now'), fix = bars.querySelector('.u-fix');
      const a = parseFloat(now.querySelector('.u-val').textContent.replace(/[^\d.]/g, '')), b = parseFloat(fix.querySelector('.u-val').textContent.replace(/[^\d.]/g, ''));
      const max = 6; now.querySelector('.u-fill').style.setProperty('--w', `${Math.min(100, (a / max) * 100)}%`); fix.querySelector('.u-fill').style.setProperty('--w', `${Math.max(3, (b / max) * 100)}%`);
    });
  }
  window.updateUBars = updateUBars;
  const _updateRetrofit = window.updateRetrofitCalculation;
  window.updateRetrofitCalculation = function () { _updateRetrofit(); updateUBars(); };

  // ---------- header progress init ----------
  if (progressBar) progressBar.style.width = '20%';
})();

// Deep links for demos and testing: index.html?path=3&step=5 opens that step directly.
window.addEventListener('DOMContentLoaded', () => {
  const q = new URLSearchParams(location.search);
  const path = parseInt(q.get('path') || '1', 10), step = parseInt(q.get('step') || '0', 10);
  if (q.get('view') === 'studio') {
    document.body.classList.add('studio-only');
    history.replaceState({ tb: 'studio' }, '', location.search);
    if (!step) { choosePath(path, true); window.scrollTo(0, 0); return; }
  }
  if (!step) return;
  window.__instantNav = true;
  choosePath(path, true);
  for (let s = 2; s <= step; s++) unlockStep(path, s);
  goToStep(step);
  if (q.get('mode')) setTimeout(() => { setViewerMode(q.get('mode')); document.querySelectorAll('.stage-controls .seg').forEach((b) => { if (b.textContent.trim().toLowerCase() === { thermal: 'heat', wireframe: 'frame', realistic: 'model' }[q.get('mode')]) seg(b); }); }, 700);
  if (document.body.classList.contains('studio-only')) window.scrollTo(0, 0);
});
