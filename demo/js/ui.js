/**
 * ThermaBuild — page behaviour
 * Header state, scroll effects, hero compare slider, charts, form helpers,
 * and the small wrappers that connect the redesigned page to app-core.js.
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parseTemp = (s) => parseFloat(String(s).replace('−', '-'));

  // ---------- toast ----------
  window.toast = function (msg) {
    const region = $('toast-region'); if (!region) return;
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    region.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2800);
  };
  window.alert = (m) => window.toast(String(m).replace(/^Upcoming Engineering Phase: /, ''));

  // ---------- header ----------
  const header = $('site-header');
  const hero = $('hero');
  const studio = $('studio');
  const progressBar = $('header-progress-bar');
  const navLinks = Array.from(document.querySelectorAll('.main-nav a'));
  const sections = ['how', 'climates', 'paths', 'studio'].map((id) => $(id)).filter(Boolean);

  function onScroll() {
    const y = window.scrollY;
    document.documentElement.style.setProperty('--scroll', y);
    const heroBottom = hero ? hero.offsetTop + hero.offsetHeight - 80 : 0;
    const studioTop = studio ? studio.offsetTop - 120 : Infinity;
    let state = 'over-hero';
    if (y > studioTop) state = 'studio';
    else if (y > heroBottom - window.innerHeight * 0.85) state = 'scrolled';
    if (header.dataset.state !== state) header.dataset.state = state;

    // current nav link
    let current = null;
    sections.forEach((s) => { if (y + 140 >= s.offsetTop) current = s.id; });
    navLinks.forEach((a) => a.classList.toggle('current', a.getAttribute('href') === `#${current}`));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  const toggle = $('menu-toggle'), nav = $('main-nav');
  toggle?.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); });
  nav?.addEventListener('click', (e) => { if (e.target.tagName === 'A') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });

  // ---------- hero compare slider ----------
  (function compare() {
    const box = $('heat-compare'), range = $('heat-range'); if (!box || !range) return;
    const set = (v) => { v = Math.max(2, Math.min(98, v)); box.style.setProperty('--pos', `${v}%`); box.style.setProperty('--pos-frac', v / 100); range.value = v; };
    range.addEventListener('input', () => set(parseFloat(range.value)));
    let dragging = false;
    const fromEvent = (e) => { const r = box.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    box.addEventListener('pointerdown', (e) => { if (e.target === range) return; dragging = true; fromEvent(e); });
    window.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    window.addEventListener('pointerup', () => { dragging = false; });
    set(50);
    // one gentle sweep on load so the interaction is discoverable
    if (!reduceMotion) {
      let t0 = null;
      const sweep = (ts) => { if (!t0) t0 = ts; const p = Math.min(1, (ts - t0) / 1800); const e = 1 - Math.pow(1 - p, 3); set(50 + Math.sin(e * Math.PI) * 22); if (p < 1 && !dragging) requestAnimationFrame(sweep); };
      setTimeout(() => requestAnimationFrame(sweep), 1500);
    }
  })();

  // ---------- scroll reveal ----------
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  revealEls.forEach((el, i) => { const sib = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal')); el.style.setProperty('--stagger', `${Math.min(sib.indexOf(el), 6) * 0.08}s`); });
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

  // ---------- climate range chart ----------
  (function climateChart() {
    const wrap = $('climate-chart'), axis = $('climate-axis'); if (!wrap || !(typeof LOCATION_PRESETS !== "undefined")) return;
    const MIN = -30, MAX = 50, span = MAX - MIN;
    const pct = (t) => ((t - MIN) / span) * 100;
    const tempColor = (t) => { if (t <= 0) return '#2F78B7'; if (t <= 18) return '#7FA6C9'; if (t <= 30) return '#F2A33A'; return '#D9621A'; };
    const rows = Object.entries(LOCATION_PRESETS).map(([key, p]) => ({ key, name: p.name.split(',')[0].replace(' Main Bazaar', '').replace(/\s*\(.*$/, ''), zone: p.zone.split('/')[0].trim(), lo: parseTemp(p.winterTemp), hi: parseTemp(p.summerTemp) })).sort((a, b) => a.lo - b.lo);
    wrap.innerHTML = rows.map((r) => `
      <button type="button" class="climate-row" role="listitem" data-key="${r.key}" aria-label="${r.name}: ${r.lo} to ${r.hi} degrees. Design here.">
        <span class="name">${r.name}<small>${r.zone}</small></span>
        <span class="climate-track" style="--l:${pct(r.lo)}%; --w:${pct(r.hi) - pct(r.lo)}%; --c1:${tempColor(r.lo)}; --c2:${tempColor(r.hi)}">
          <span class="climate-zero" style="left:${pct(0)}%"></span>
          <span class="climate-bar"></span>
          <span class="climate-val lo">${r.lo} °C</span>
          <span class="climate-val hi">${r.hi} °C</span>
        </span>
      </button>`).join('');
    axis.innerHTML = `<i></i><div>${[-30, -20, -10, 0, 10, 20, 30, 40, 50].map((t) => `<span style="left:${pct(t)}%">${t}°</span>`).join('')}</div>`;
    wrap.addEventListener('click', (e) => { const b = e.target.closest('.climate-row'); if (!b) return; choosePath(1, true); selectMapPreset(b.dataset.key); toast(`Site set to ${b.querySelector('.name').firstChild.textContent}`); });
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
      // keep the active tab in view when the stepper scrolls horizontally (small screens)
      const tab = document.querySelector('.stepper .step-tab.active');
      if (tab) { const rail = tab.parentElement; rail.scrollTo({ left: tab.offsetLeft - rail.clientWidth / 2 + tab.offsetWidth / 2, behavior: 'smooth' }); }
    }
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

  const wallBadges = { rammed_earth: 'U 0.45 W/m²K, 10.2 h delay', aac_aerogel: 'U 0.42 W/m²K, 6.8 h delay', cavity_brick: 'U 0.36 W/m²K, 8.5 h delay', cseb_cork: 'U 0.39 W/m²K, ≈8 h delay', clt_woodfiber: 'U 0.29 W/m²K, ≈9 h delay' };
  window.pickWall = function (key) {
    document.querySelectorAll('#wall-assembly-grid .wall-card').forEach((c) => { const on = c.dataset.wall === key; c.classList.toggle('selected', on); c.setAttribute('aria-checked', String(on)); });
    $('wall-mat-select').value = key; $('wall-assembly-badge').textContent = wallBadges[key] || ''; updateResidentialMaterialsReport();
  };
  window.syncMaterialBadges = function () {
    const r = $('roof-mat-select'), g = $('glazing-mat-select');
    const rm = r.options[r.selectedIndex].text.match(/\(([^)]+)\)$/); $('roof-badge').textContent = rm ? rm[1].replace('U ', 'U ') + ' W/m²K' : '';
    const gm = g.options[g.selectedIndex].text.match(/\(([^)]+)\)$/); $('glazing-badge').textContent = gm ? gm[1] : '';
    updateResidentialMaterialsReport();
  };

  // dropzones: highlight on drag
  document.querySelectorAll('.dropzone').forEach((dz) => { ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.add('is-over'))); ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('is-over'))); });

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

    // chart
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
      <g class="peak"><circle cx="${x(base.indexOf(bPeak))}" cy="${y(bPeak)}" r="5" fill="#D9621A"/><text x="${x(base.indexOf(bPeak)) + 8}" y="${y(bPeak) - 8}">${bPeak.toFixed(1)}° ordinary</text></g>
      <g class="peak"><circle cx="${x(opt.indexOf(oPeak))}" cy="${y(oPeak)}" r="5" fill="#2F78B7"/><text x="${x(opt.indexOf(oPeak)) + 8}" y="${y(oPeak) + 16}">${oPeak.toFixed(1)}° yours</text></g>
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
    const t0 = performance.now(), dur = 1400;
    (function step(now) { const p = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * e); if (p < 1) requestAnimationFrame(step); })(t0);
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
