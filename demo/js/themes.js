/* Colour themes for review. Each theme only swaps brand and neutral tokens (see the end of site.css);
   heat, cold and comfort colours never change because they carry data. The choice is kept in
   localStorage and can be linked with ?theme=name. A small inline script in <head> applies the
   stored theme before first paint. */
(function () {
  const THEMES = [
    { id: 'iris', name: 'Iris', tone: 'Violet', sw: ['#6D3FE0', '#F8F7FB', '#17152A'],
      why: 'Stands apart from the green and blue most energy tools use. Premium and tech-forward, and neutral to heat and cold data.' },
    { id: 'ember', name: 'Ember', tone: 'Sun orange', sw: ['#C9441D', '#F7F7F4', '#15171B'],
      why: 'The original. Speaks directly to sun and warmth, but the brand shares its colour with heat in the charts.' },
    { id: 'blueprint', name: 'Blueprint', tone: 'Architect blue', sw: ['#2F54D6', '#F6F8FB', '#101828'],
      why: 'Architecture and engineering heritage; the most trusted colour. Sits close to the cold-data blue.' },
    { id: 'glacier', name: 'Glacier', tone: 'Himalayan teal', sw: ['#0B7285', '#F5F9FA', '#0E1C21'],
      why: 'Cold high-altitude air and ice for a cold-region product. Calm, and distinct from both heat orange and cold blue.' },
    { id: 'forest', name: 'Forest', tone: 'Sustainable green', sw: ['#1F6F54', '#F6F8F5', '#111A15'],
      why: 'The green-building signal judges expect. Overlaps with the green comfort band in charts.' },
    { id: 'clay', name: 'Clay', tone: 'Terracotta', sw: ['#A4442A', '#F9F6F1', '#1E1612'],
      why: 'Rammed earth and mud brick of Ladakhi homes. Warm and crafted, close to the heat colour.' },
    { id: 'saffron', name: 'Saffron', tone: 'Indian sun', sw: ['#B98100', '#FBF9F3', '#1B1810'],
      why: 'Indian identity and the sun, with dark text on buttons for contrast. The most energetic.' },
    { id: 'graphite', name: 'Graphite', tone: 'Monochrome', sw: ['#1F2128', '#F7F7F8', '#141518'],
      why: 'Swiss and editorial. Lets the data colours carry every meaning; the most serious look.' },
  ];
  const root = document.documentElement;
  const current = () => root.dataset.theme || 'iris';
  const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();

  // Brand shades for colours drawn from JavaScript (SVG attributes, canvas, three.js)
  const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  function shades() {
    const b = css('--brand') || '#6D3FE0', night = css('--night') || '#16132B';
    return { brand: b, b1: mix(b, '#FFFFFF', 0.32), b2: b, b3: mix(b, '#000000', 0.16), b4: mix(b, '#000000', 0.28), b5: mix(b, '#000000', 0.45),
      n1: mix(b, night, 0.62), n2: mix(b, night, 0.5), n3: mix(b, night, 0.72) };
  }

  function favicon() {
    const light = css('--brand-light') || '#B9A6FF', ink = css('--ink') || '#17152A';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${ink}"/><path d="M8 38 26 20l12 13 8-7 14 14" fill="none" stroke="${light}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"/><rect x="38" y="38" width="9" height="9" fill="${light}"/></svg>`;
    const link = document.querySelector('link[rel="icon"]'); if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = css('--paper');
  }

  function set(id, quiet) {
    if (!THEMES.some((t) => t.id === id)) id = 'iris';
    if (id === 'iris') delete root.dataset.theme; else root.dataset.theme = id;
    try { localStorage.setItem('tb-theme', id); } catch (e) { /* private mode */ }
    favicon();
    paintPanel();
    if (!quiet) window.dispatchEvent(new CustomEvent('thermabuild:theme', { detail: id }));
  }

  // ---------- switcher (bottom-left) ----------
  let btn, panel;
  function paintPanel() {
    if (!panel) return;
    const t = THEMES.find((x) => x.id === current());
    btn.querySelector('.th-cur').style.background = t.sw[0];
    btn.querySelector('.th-name').textContent = t.name;
    panel.querySelectorAll('.th-opt').forEach((o) => { const on = o.dataset.id === t.id; o.classList.toggle('active', on); o.setAttribute('aria-checked', String(on)); });
  }
  function build() {
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'th-btn'; btn.id = 'theme-btn';
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'theme-panel');
    btn.innerHTML = '<span class="th-cur" aria-hidden="true"></span><span class="th-lbl">Theme<b class="th-name"></b></span>';
    panel = document.createElement('div');
    panel.className = 'th-panel'; panel.id = 'theme-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Colour theme');
    panel.innerHTML = `<div class="th-head"><p class="th-title">Colour theme</p><p class="th-sub">Review tool. Heat, cold and comfort colours stay the same in every theme.</p></div>
      <div class="th-list" role="radiogroup" aria-label="Themes">${THEMES.map((t, i) => `
        <button type="button" class="th-opt" role="radio" data-id="${t.id}" aria-checked="false">
          <span class="th-sw" aria-hidden="true"><i style="background:${t.sw[0]}"></i><i style="background:${t.sw[1]}"></i><i style="background:${t.sw[2]}"></i></span>
          <span class="th-txt"><strong>${i + 1}. ${t.name} <em>${t.tone}</em></strong><small>${t.why}</small></span>
        </button>`).join('')}</div>
      <p class="th-foot">Keys: <kbd>[</kbd> <kbd>]</kbd> previous / next theme</p>`;
    document.body.append(panel, btn);
    const open = (on) => { panel.hidden = !on; btn.setAttribute('aria-expanded', String(on)); if (on) (panel.querySelector('.th-opt.active') || panel.querySelector('.th-opt')).focus(); };
    btn.addEventListener('click', () => open(panel.hidden));
    panel.addEventListener('click', (e) => { const o = e.target.closest('.th-opt'); if (o) set(o.dataset.id); });
    document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) open(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { open(false); btn.focus(); return; }
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '[' || e.key === ']') {
        const i = THEMES.findIndex((t) => t.id === current()), n = THEMES.length;
        set(THEMES[(i + (e.key === ']' ? 1 : -1) + n) % n].id);
        if (window.toast) window.toast(`Theme: ${THEMES.find((t) => t.id === current()).name}`);
      }
    });
    panel.addEventListener('keydown', (e) => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const opts = Array.from(panel.querySelectorAll('.th-opt')), i = opts.indexOf(document.activeElement);
      opts[(i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length].focus();
    });
    paintPanel();
  }

  window.TBTheme = { THEMES, set, current, shades };
  const q = new URLSearchParams(location.search).get('theme');
  set(q || current(), true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
