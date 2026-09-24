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
    const studioTop = studio ? studio.offsetTop - 120 : Infinity;
    let state = 'top';
    if (y > studioTop) state = 'studio';
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
    const face = (k, fill, list) => `<polygon class="${k === 'top' ? 'top' : ''}" data-k="${k}" data-base="${fill}" fill="${fill}" points="${pts(list)}"/>`;
    const win = (list, door) => { const [a, b, c, d] = list.map((p) => iso(...p)); return `<polygon class="${door ? 'door' : 'win'}" ${door ? 'style="fill:#8F2F10"' : ''} points="${[a, b, c, d].map((p) => p.join(',')).join(' ')}"/>${door ? '' : `<path class="win-glint" d="M${(a[0] * .7 + c[0] * .3).toFixed(1)} ${(a[1] * .7 + c[1] * .3 - 2).toFixed(1)} L${(a[0] * .45 + c[0] * .55).toFixed(1)} ${(a[1] * .45 + c[1] * .55 - 6).toFixed(1)}"/>`}`; };
    const winY = (y, a, b, c, d, door) => win([[a, y, c], [b, y, c], [b, y, d], [a, y, d]], door);
    const winX = (x, a, b, c, d) => win([[x, a, c], [x, b, c], [x, b, d], [x, a, d]]);
    const stud = (x, y, z, col) => {
      const r = 0.17, h = 0.13, rx = 1.2247 * r * U, ry = 0.7071 * r * U, [cx, yb] = iso(x, y, z), yt = yb - h * U;
      return `<path class="stud-side" data-k="right" data-base="${col[2]}" fill="${col[2]}" d="M${cx - rx} ${yt} L${cx - rx} ${yb} A${rx} ${ry} 0 0 0 ${cx + rx} ${yb} L${cx + rx} ${yt} Z"/><ellipse data-k="top" data-base="${col[0]}" fill="${col[0]}" cx="${cx}" cy="${yt}" rx="${rx}" ry="${ry}"/>`;
    };
    const box = (x0, x1, y0, y1, z0, z1, col) =>
      face('top', col[0], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]) +
      face('left', col[1], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]) +
      face('right', col[2], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]);
    const studGrid = (x0, x1, y0, y1, z, col, skip) => { let o = ''; for (let y = y0 + 0.5; y < y1; y++) for (let x = x0 + 0.5; x < x1; x++) if (!skip || !skip(x, y)) o += stud(x, y, z, col); return o; };

    const INK = ['#4A4E57', '#2E3138', '#22252A'], WHITE = ['#FFFFFF', '#F2F0EA', '#DEDBD2'], TERRA = ['#F6C3A8', '#EDA07E', '#D8805C'], SAND = ['#FBEBDD', '#F2D6BF', '#E0BC9E'];
    const Z1 = 0.7, Z2 = 2.3, Z3 = 3.4, ZR = 4.9;
    const underWalls = (x, y) => x > 0.5 && x < 6.5 && y > 0.5 && y < 4.5;
    const roofBack = (x0, x1) => face('back', '#F07B55', [[x0, 0.1, Z3], [x1, 0.1, Z3], [x1, 2.5, ZR], [x0, 2.5, ZR]]) + face('gable', '#C94A22', [[x1, 0.1, Z3], [x1, 2.5, Z3], [x1, 2.5, ZR]]);
    const roofFront = (x0, x1) => face('slope', '#E4572E', [[x0, 2.5, ZR], [x1, 2.5, ZR], [x1, 4.9, Z3], [x0, 4.9, Z3]]) + face('gable', '#B8431E', [[x1, 2.5, Z3], [x1, 4.9, Z3], [x1, 2.5, ZR]]) + face('left', '#9E3818', [[x0, 4.9, Z3 - 0.18], [x1, 4.9, Z3 - 0.18], [x1, 4.9, Z3], [x0, 4.9, Z3]]);

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
        draw: () => box(4.85, 5.6, 1.0, 1.7, 3.8, 5.55, INK) + box(4.75, 5.7, 0.9, 1.8, 5.55, 5.75, ['#F07B55', '#E4572E', '#C2431C']) + stud(5.22, 1.35, 5.75, ['#F07B55', '#E4572E', '#C2431C']), badge: [5.22, 1.7, 5.05] },
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
    const DAY = { top: '#FFE6C9', left: '#FBD0A2', right: '#F7A866', slope: '#E4572E', back: '#F07B55', gable: '#B8431E' };
    const NIGHT = { top: '#F09A63', left: '#D9713F', right: '#E4804A', slope: '#4B3027', back: '#5A3A2E', gable: '#3A241C' };
    const paintMode = (pal) => faces.forEach((f) => f.setAttribute('fill', pal ? pal[f.dataset.k] || f.dataset.base : f.dataset.base));

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
      $('studio').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
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

  // ---------- climates: thermometer skyline ----------
  (function skyline() {
    const plot = $('sky-plot'), names = $('sky-names'), sky = $('skyline'); if (!plot || typeof LOCATION_PRESETS === 'undefined') return;
    const MIN = -30, MAX = 50, pct = (t) => `${((t - MIN) / (MAX - MIN)) * 100}%`;
    const short = { leh: ['Leh', 'Ladakh'], dras: ['Dras', 'Ladakh'], kargil: ['Kargil', 'Ladakh'], nubra: ['Diskit', 'Nubra'], spiti: ['Kaza', 'Spiti'], pangong: ['Pangong', 'Ladakh'], new_delhi: ['Delhi', 'Composite'], chennai: ['Chennai', 'Humid coast'], jaisalmer: ['Jaisalmer', 'Desert'], bengaluru: ['Bengaluru', 'Plateau'] };
    const rows = Object.entries(LOCATION_PRESETS).map(([key, p]) => ({ key, name: (short[key] || [p.name.split(',')[0]])[0], sub: (short[key] || ['', p.zone.split('/')[0]])[1], lo: parseTemp(p.winterTemp), hi: parseTemp(p.summerTemp) })).sort((a, b) => (a.lo + a.hi) - (b.lo + b.hi));
    const fmt = (t) => `${t < 0 ? '−' : ''}${Math.abs(t)}°`;
    plot.style.setProperty('--n', rows.length); names.style.setProperty('--n', rows.length);
    plot.innerHTML =
      `<div class="sky-band" style="--lo:${pct(22)};--hi:${pct(27)}"><span>Comfortable indoors</span></div>` +
      [-30, -20, -10, 0, 10, 20, 30, 40, 50].map((t) => `<div class="sky-grid ${t === 0 ? 'zero' : ''}" style="--y:${pct(t)}"><span>${fmt(t)}</span></div>`).join('') +
      `<div class="sky-cols">${rows.map((r, i) => `
        <button type="button" class="sky-col" role="listitem" data-key="${r.key}" style="--lo:${pct(r.lo)};--hi:${pct(r.hi)};--lo-f:${((r.lo - MIN) / (MAX - MIN)).toFixed(4)};--hi-f:${((r.hi - MIN) / (MAX - MIN)).toFixed(4)};--d:${i * 0.07}s" aria-label="${r.name}: ${r.lo} to ${r.hi} degrees. Design here.">
          <span class="sky-tube"><span class="sky-fill"></span><i class="sky-dot lo"></i><i class="sky-dot hi"></i></span>
          <span class="sky-val hi">${fmt(r.hi)}</span><span class="sky-val lo">${fmt(r.lo)}</span>
        </button>`).join('')}</div>`;
    names.innerHTML = rows.map((r) => `<span data-key="${r.key}">${r.name}<small>${r.sub}</small></span>`).join('');
    const mark = (key) => { plot.querySelectorAll('.sky-col').forEach((b) => b.classList.toggle('active', b.dataset.key === key)); names.querySelectorAll('span').forEach((s) => s.classList.toggle('active', s.dataset.key === key)); };
    mark(ThermaState.city);
    plot.addEventListener('click', (e) => { const b = e.target.closest('.sky-col'); if (!b) return; mark(b.dataset.key); choosePath(1, true); selectMapPreset(b.dataset.key); toast(`Site set to ${rows.find((x) => x.key === b.dataset.key).name}`); $('studio').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); });
    window.addEventListener('thermabuild:site', () => mark(ThermaState.city));
  })();

  // ---------- paths ----------
  window.choosePath = function (n, quiet) {
    document.querySelectorAll('.path-card').forEach((c) => { const on = c.id === `flow-card-${n}`; c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on)); });
    switchMainFlow(n);
    const names = { 1: 'a new home', 2: 'a home from your plan', 3: 'an upgrade for your home', 4: 'a livestock shelter' };
    const short = { 1: 'New home', 2: 'Your plan', 3: 'Upgrade', 4: 'Shelter' };
    $('studio-path-name').textContent = names[n];
    $('header-status-path').textContent = short[n];
    if (!quiet) $('studio').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

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
    slatted_louvers: { name: 'Open timber louvres', why: 'About 15 air changes an hour. Breeze in, heat and ammonia out.', layers: [[1, '#C9A77F'], [1, '#F7F7F4'], [1, '#C9A77F'], [1, '#F7F7F4'], [1, '#C9A77F']] },
    poultry_mesh: { name: 'Wire mesh with roll-up curtains', why: 'About 18 air changes an hour for humid coasts. Curtains drop in storms.', layers: [[1, '#B9BDC2'], [1, '#F7F7F4'], [1, '#B9BDC2']] },
    rammed_half_wall: { name: 'Low earth wall with bamboo screen', why: 'Earth shields animals from cold wind. The screen above still lets air move.', layers: [[2, '#B98A5E'], [1, '#C9A77F']] }
  };
  const A_FLOORS = {
    grooved_concrete: { name: 'Grooved non-slip concrete with drain', why: 'Grip for hooves and a slope that drains quickly.', layers: [[1, '#9A9A93'], [1, '#B5B5AE']] },
    slatted_timber: { name: 'Raised timber slats with dung trays', why: 'Keeps birds and small stock off the wet floor.', layers: [[1, '#C9A77F'], [1, '#F7F7F4'], [1, '#C9A77F']] },
    vulcanized_rubber: { name: 'Rubber comfort mats', why: 'Soft, warm footing that cleans easily.', layers: [[1, '#3A3D42']] }
  };
  const CLIMATE_WORDS = { leh: 'cold, dry, high-altitude', dras: 'cold, dry, high-altitude', kargil: 'cold, dry, high-altitude', nubra: 'cold, dry, high-altitude', spiti: 'cold, dry, high-altitude', pangong: 'cold, dry, high-altitude', jaisalmer: 'hot, dry desert', chennai: 'warm, humid coastal', bengaluru: 'mild plateau', new_delhi: 'composite' };
  function placeName() { const p = LOCATION_PRESETS[ThermaState.city]; return p ? p.name.split(',')[0].replace(' Main Bazaar', '').replace(/\s*\(.*$/, '') : 'your site'; }
  function climateWords() { return CLIMATE_WORDS[ThermaState.city] || ($('climate-zone')?.textContent.split('/')[0].trim().toLowerCase() || 'local'); }
  const card = (part, m) => `<p class="best-part">${part}</p>${section(m.layers)}<p class="best-name">${m.name}</p><p class="best-why">${m.why}</p>${m.specs ? `<div class="best-specs">${m.specs.map((s) => `<span>${s}</span>`).join('')}</div>` : ''}`;
  const row = (part, m) => `${section(m.layers)}<div><p class="best-part">${part}</p><p class="best-name">${m.name}</p><p class="best-why">${m.why}</p></div>`;

  function renderMaterialCards() {
    const w = WALLS[ThermaState.wallMat] || WALLS.rammed_earth, r = ROOFS[ThermaState.roofMat] || ROOFS.cool_roof, g = GLAZING[ThermaState.glazingMat] || GLAZING.low_e_double;
    if ($('best-wall')) { $('best-wall').innerHTML = card('Walls', w); $('best-roof').innerHTML = card('Roof', r); $('best-glazing').innerHTML = card('Windows', g); }
    if ($('best-sub')) $('best-sub').textContent = `Chosen for ${placeName()}'s ${climateWords()} climate. The report is calculated on exactly these.`;
    const ar = A_ROOFS[$('animal-roof-material')?.value] || A_ROOFS.thatch, aw = A_WALLS[$('animal-wall-material')?.value] || A_WALLS.slatted_louvers, af = A_FLOORS[$('animal-floor-material')?.value] || A_FLOORS.grooved_concrete;
    if ($('best-animal-roof')) { $('best-animal-roof').innerHTML = row('Roof', ar); $('best-animal-wall').innerHTML = row('Side walls', aw); $('best-animal-floor').innerHTML = row('Floor', af); }
    const species = { cattle: 'dairy cattle', poultry: 'poultry', goat: 'goats and sheep' }[ThermaState.animalSpecies] || 'your animals';
    if ($('animal-best-sub')) $('animal-best-sub').textContent = `Chosen for ${placeName()}'s ${climateWords()} climate and ${species}.`;
    // the engine's own rationale, tidied for reading
    const rat = $('ai-predict-rationale'); if (rat) rat.textContent = rat.textContent.replace(/^Predicted for [^:]+:\s*/, '');
    const arat = $('animal-ai-predict-rationale'); if (arat) arat.textContent = arat.textContent.replace(/^[^:]+:\s*/, '');
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
    $('climate-card-title').textContent = preset ? preset.name.split('(')[0].trim() : 'Your site';
    $('report-place').textContent = preset ? preset.name.split('(')[0].trim() : `${ThermaState.lat}° N, ${ThermaState.lon}° E`;
    renderMaterialCards();
    window.dispatchEvent(new Event('thermabuild:site'));
    if (window.rebuild3DHouse) rebuild3DHouse();
  };

  // ---------- report: hero figure, 24-hour chart ----------
  function dayCurves() {
    const p = LOCATION_PRESETS[ThermaState.city] || {};
    const peak = parseTemp(p.summerTemp) || 34;
    const swing = Math.min(16, Math.max(8, peak * 0.32));
    const mean = peak - swing / 2;
    const wallU = { rammed_earth: 0.45, aac_aerogel: 0.42, cavity_brick: 0.36, cseb_cork: 0.39, clt_woodfiber: 0.29 }[ThermaState.wallMat] || 0.45;
    const roofU = { cool_roof: 0.26, green_roof: 0.22, poplar_mud: 0.24, terracotta_double: 0.32 }[ThermaState.roofMat] || 0.26;
    const glazeU = { low_e_double: 1.35, krypton_triple: 0.78, smart_electrochromic: 1.1, single_clear: 5.7 }[ThermaState.glazingMat] || 1.35;
    const envelope = (wallU + roofU + glazeU * 0.35) / (2.15 + 2.85 + 5.7 * 0.35); // vs. an ordinary build
    const hours = Array.from({ length: 25 }, (_, h) => h);
    const out = hours.map((h) => mean + (swing / 2) * Math.sin(((h - 9) / 24) * Math.PI * 2));
    const base = hours.map((h) => mean + 2.4 + (swing / 2) * 0.85 * Math.sin(((h - 10) / 24) * Math.PI * 2));
    const lagH = 3 + (1 - envelope) * 5;
    const opt = hours.map((h) => mean - 1.2 + (swing / 2) * (0.15 + envelope * 0.55) * Math.sin(((h - 9 - lagH) / 24) * Math.PI * 2));
    return { hours, out, base, opt };
  }

  function renderReport() {
    if (ThermaState.activeFlow === 4) return;
    const { hours, out, base, opt } = dayCurves();
    const bPeak = Math.max(...base), oPeak = Math.max(...opt), diff = oPeak - bPeak;
    $('res-peak-temp-base').textContent = `${bPeak.toFixed(1)} °C`;
    $('res-peak-temp-opt').textContent = `${oPeak.toFixed(1)} °C`;
    const savings = Math.max(28, Math.min(74, Math.round(-diff * 4.6 + 22)));
    $('res-energy-savings').textContent = `${savings}%`;
    const pmv = (0.35 - Math.min(0.3, -diff * 0.02)).toFixed(2);
    $('res-pmv-val').textContent = `+${pmv} (comfortable)`;
    $('res-ach-val').textContent = `${(6 + (parseFloat((LOCATION_PRESETS[ThermaState.city] || {}).wind) || 3) * 0.8).toFixed(1)} ACH`;
    countUp($('res-temp-diff'), Math.abs(diff), (v) => `${v.toFixed(1)} °C`);

    const el = $('report-chart'); el.innerHTML = '';
    const W = el.clientWidth || 800, H = el.clientHeight || 300, m = { t: 16, r: 16, b: 28, l: 36 };
    const all = [...out, ...base, ...opt]; const yMin = Math.floor(Math.min(...all) - 2), yMax = Math.ceil(Math.max(...all) + 2);
    const x = (h) => m.l + (h / 24) * (W - m.l - m.r), y = (t) => m.t + (1 - (t - yMin) / (yMax - yMin)) * (H - m.t - m.b);
    const path = (arr) => arr.map((t, i) => `${i ? 'L' : 'M'}${x(hours[i]).toFixed(1)},${y(t).toFixed(1)}`).join('');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const yTicks = []; for (let t = Math.ceil(yMin / 5) * 5; t <= yMax; t += 5) yTicks.push(t);
    const cLo = Math.max(yMin, 22), cHi = Math.min(yMax, 27);
    svg.innerHTML = `
      ${cHi > cLo ? `<rect class="comfort" x="${m.l}" y="${y(cHi)}" width="${W - m.l - m.r}" height="${y(cLo) - y(cHi)}" rx="3"/><text class="comfort-label" x="${m.l + 8}" y="${y(cHi) + 14}">Comfort band 22–27 °C</text>` : ''}
      <g class="grid">${yTicks.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
      <g class="axis">${yTicks.map((t) => `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}°</text>`).join('')}${[0, 6, 12, 18, 24].map((h) => `<text x="${x(h)}" y="${H - 8}" text-anchor="middle">${h === 0 || h === 24 ? '12 am' : h === 12 ? '12 pm' : h < 12 ? `${h} am` : `${h - 12} pm`}</text>`).join('')}</g>
      <path class="series s-out" d="${path(out)}"/>
      <path class="series s-base ${reduceMotion ? '' : 'draw'}" d="${path(base)}"/>
      <path class="series s-opt ${reduceMotion ? '' : 'draw'}" d="${path(opt)}"/>
      <g class="peak"><circle cx="${x(base.indexOf(bPeak))}" cy="${y(bPeak)}" r="5" fill="#E4572E"/><text x="${x(base.indexOf(bPeak)) + 8}" y="${y(bPeak) - 8}">${bPeak.toFixed(1)}° ordinary</text></g>
      <g class="peak"><circle cx="${x(opt.indexOf(oPeak))}" cy="${y(oPeak)}" r="5" fill="#3D7BD9"/><text x="${x(opt.indexOf(oPeak)) + 8}" y="${y(oPeak) + 16}">${oPeak.toFixed(1)}° yours</text></g>
      <line class="crosshair" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}"/>
      <rect class="hover-rect" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"/>`;
    el.appendChild(svg);
    svg.querySelectorAll('.draw').forEach((p, i) => { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; requestAnimationFrame(() => { p.style.transition = `stroke-dashoffset 1.5s cubic-bezier(.16,1,.3,1) ${0.2 + i * 0.3}s`; p.style.strokeDashoffset = 0; }); });
    const tip = document.createElement('div'); tip.className = 'chart-tip'; el.appendChild(tip);
    const cross = svg.querySelector('.crosshair'), hr = svg.querySelector('.hover-rect');
    hr.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; const h = Math.round(((px - m.l) / (W - m.l - m.r)) * 24); if (h < 0 || h > 24) return;
      cross.setAttribute('x1', x(h)); cross.setAttribute('x2', x(h)); cross.style.opacity = 1;
      tip.style.left = `${(x(h) / W) * 100}%`; tip.style.top = `${(y(Math.max(out[h], base[h], opt[h])) / H) * 100}%`; tip.style.opacity = 1;
      tip.innerHTML = `${h % 24}:00<br>Outdoors <b>${out[h].toFixed(1)}°</b><br>Ordinary <b>${base[h].toFixed(1)}°</b><br>Yours <b>${opt[h].toFixed(1)}°</b>`;
    });
    hr.addEventListener('pointerleave', () => { cross.style.opacity = 0; tip.style.opacity = 0; });
    $('report-chart-table').innerHTML = `<table><thead><tr><th>Hour</th><th>Outdoors</th><th>Ordinary build</th><th>Your design</th></tr></thead><tbody>${hours.filter((h) => h % 3 === 0 && h < 24).map((h) => `<tr><td>${h}:00</td><td>${out[h].toFixed(1)} °C</td><td>${base[h].toFixed(1)} °C</td><td>${opt[h].toFixed(1)} °C</td></tr>`).join('')}</tbody></table>`;
  }
  window.renderReport = renderReport;

  function countUp(el, target, fmt) {
    if (!el) return;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    let t0 = null; const dur = 1400;
    const step = (now) => { if (t0 === null) t0 = now; const p = Math.max(0, Math.min(1, (now - t0) / dur)); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * e); if (p < 1) requestAnimationFrame(step); };
    el.textContent = fmt(0); requestAnimationFrame(step);
  }

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
  window.addEventListener('resize', () => { if ($('flow-step-5').style.display !== 'none') renderReport(); });
})();

// Deep links for demos and testing: index.html?path=3&step=5 opens that step directly.
window.addEventListener('DOMContentLoaded', () => {
  const q = new URLSearchParams(location.search);
  const path = parseInt(q.get('path') || '1', 10), step = parseInt(q.get('step') || '0', 10);
  if (q.get('view') === 'studio') document.body.classList.add('studio-only');
  if (!step) return;
  window.__instantNav = true;
  choosePath(path, true);
  for (let s = 2; s <= step; s++) unlockStep(path, s);
  goToStep(step);
  if (q.get('mode')) setTimeout(() => { setViewerMode(q.get('mode')); document.querySelectorAll('.stage-controls .seg').forEach((b) => { if (b.textContent.trim().toLowerCase() === { thermal: 'heat', wireframe: 'frame', realistic: 'model' }[q.get('mode')]) seg(b); }); }, 700);
  if (document.body.classList.contains('studio-only')) window.scrollTo(0, 0);
});
