/**
 * ThermaBuild: step-4 fine-tuning. Orientation, south glass and overhang re-run the engine,
 * rebuild the 3D house and carry into the report. Materials stay as recommended.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fmtT = (x) => `${x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)} °C`;
  let timer = 0, dragging = false;

  function dialSVG(angle) {
    const a = angle * Math.PI / 180, R = 62, cx = 80, cy = 80;
    // the long south face of the building points along `angle` (0 = due south, + = toward west)
    const hx = cx - Math.sin(a) * R, hy = cy + Math.cos(a) * R;
    const ticks = Array.from({ length: 24 }, (_, i) => { const t = (i / 24) * Math.PI * 2, r1 = i % 6 === 0 ? 66 : 70; return `<line x1="${cx + Math.sin(t) * r1}" y1="${cy - Math.cos(t) * r1}" x2="${cx + Math.sin(t) * 74}" y2="${cy - Math.cos(t) * 74}"/>`; }).join('');
    const bw = 44, bd = 26;
    return `<svg viewBox="0 0 160 160" class="dial-svg" aria-hidden="true">
      <circle cx="80" cy="80" r="74" class="dial-face"/>
      <path class="dial-good" d="M${cx - Math.sin(-20 * Math.PI / 180) * 74} ${cy + Math.cos(-20 * Math.PI / 180) * 74} A74 74 0 0 0 ${cx - Math.sin(20 * Math.PI / 180) * 74} ${cy + Math.cos(20 * Math.PI / 180) * 74}"/>
      <g class="dial-ticks">${ticks}</g>
      <text x="80" y="20" class="dial-n">N</text><text x="146" y="84" class="dial-l">E</text><text x="80" y="150" class="dial-l">S</text><text x="14" y="84" class="dial-l">W</text>
      <g transform="rotate(${angle} 80 80)"><rect x="${80 - bw / 2}" y="${80 - bd / 2}" width="${bw}" height="${bd}" rx="3" class="dial-house"/><rect x="${80 - bw / 2}" y="${80 + bd / 2 - 4}" width="${bw}" height="4" class="dial-south"/></g>
      <line x1="80" y1="80" x2="${hx}" y2="${hy}" class="dial-arm"/><circle cx="${hx}" cy="${hy}" r="9" class="dial-knob"/>
    </svg>`;
  }

  function current(d) { return { orientation: d.v.orientation || 0, wwrS: d.v.wwrS, overhang: d.v.overhang || 0 }; }

  function render(d) {
    const card = $('tune-card'); if (!card || !d) return;
    card.hidden = false;
    const retro = ThermaState.activeFlow === 3; $('tune-orient').hidden = retro; $('tune-wwr-field').hidden = retro;
    const cur = current(d), rec = d.d.recommended || d.v, heat = d.c.mode === 'heating';
    $('tune-dial').innerHTML = dialSVG(cur.orientation);
    $('tune-dial').setAttribute('aria-valuenow', cur.orientation);
    $('tune-dial').setAttribute('aria-valuetext', `${Math.abs(cur.orientation)}° ${cur.orientation >= 0 ? 'west' : 'east'} of south`);
    $('tune-orient-v').textContent = cur.orientation === 0 ? 'Due south' : `${Math.abs(cur.orientation)}° ${cur.orientation > 0 ? 'west' : 'east'} of south`;
    $('tune-wwr').value = Math.round(cur.wwrS * 100); $('tune-wwr-v').textContent = `${Math.round(cur.wwrS * 100)} %`;
    $('tune-oh').value = cur.overhang; $('tune-oh-v').textContent = cur.overhang ? `${cur.overhang.toFixed(2)} m` : 'None';
    const s = d.typ.series, dawn = d.typ.minOp, peak = d.typ.maxOp;
    const southSun = s.hour.length ? (d.wTyp.I[0].slice(-96).reduce((a, b) => a + b, 0) * 0.25 / 1000) : 0;
    $('tune-out').innerHTML = `
      <div class="${heat ? 'is-main' : ''}"><dt>${heat ? 'Dawn indoors, no heater' : 'Peak indoors'}</dt><dd>${fmtT(heat ? dawn : peak)}</dd><small>ordinary build ${fmtT(heat ? d.base.minOp : d.base.maxOp)}</small></div>
      <div><dt>South glass</dt><dd>${d.bom.win.toFixed(1)} m²</dd><small>${d.bom.trombeA ? `+ ${d.bom.trombeA.toFixed(1)} m² Trombe wall` : 'no Trombe wall'}</small></div>
      <div><dt>Sun on the south wall</dt><dd>${southSun.toFixed(1)}</dd><small>kWh/m² a day in ${TB.analyse.MONTHS[d.c.month]}</small></div>`;
    const changed = cur.orientation !== (rec.orientation || 0) || Math.abs(cur.wwrS - rec.wwrS) > 1e-6 || Math.abs(cur.overhang - (rec.overhang || 0)) > 1e-6;
    $('tune-reset').disabled = !changed;
    $('tune-status').textContent = changed ? 'Your changes are used in the report.' : 'Showing the recommended design.';
  }

  function apply(k, val) {
    const T = window.TBApp; if (!T) return;
    T.tweaks[k] = val;
    clearTimeout(timer);
    $('tune-status').textContent = 'Re-simulating…';
    timer = setTimeout(() => { if (window.rebuild3DHouse) rebuild3DHouse(); }, 180);
  }

  function angleFromEvent(e) {
    const r = $('tune-dial').getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    let a = Math.round(Math.atan2(-x, y) * 180 / Math.PI / 5) * 5; // south = 0, west = +
    return Math.max(-45, Math.min(45, a));
  }

  function wire() {
    const dial = $('tune-dial'); if (!dial) return;
    dial.addEventListener('pointerdown', (e) => { dragging = true; dial.setPointerCapture(e.pointerId); const a = angleFromEvent(e); dial.innerHTML = dialSVG(a); apply('orientation', a); });
    dial.addEventListener('pointermove', (e) => { if (!dragging) return; const a = angleFromEvent(e); if (a !== window.TBApp.tweaks.orientation) { dial.innerHTML = dialSVG(a); $('tune-orient-v').textContent = a === 0 ? 'Due south' : `${Math.abs(a)}° ${a > 0 ? 'west' : 'east'} of south`; apply('orientation', a); } });
    dial.addEventListener('pointerup', () => { dragging = false; });
    dial.addEventListener('keydown', (e) => { const cur = window.TBApp.tweaks.orientation ?? (window.TBHouse.data ? window.TBHouse.data.v.orientation || 0 : 0); const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0; if (!step) return; e.preventDefault(); const a = Math.max(-45, Math.min(45, cur + step)); dial.innerHTML = dialSVG(a); apply('orientation', a); });
    $('tune-wwr').addEventListener('input', (e) => { $('tune-wwr-v').textContent = `${e.target.value} %`; apply('wwrS', +e.target.value / 100); });
    $('tune-oh').addEventListener('input', (e) => { const v = +e.target.value; $('tune-oh-v').textContent = v ? `${v.toFixed(2)} m` : 'None'; apply('overhang', v); });
    $('tune-reset').addEventListener('click', () => { window.TBApp.tweaks = {}; if (window.rebuild3DHouse) rebuild3DHouse(); });
  }
  window.TBTune = { render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
