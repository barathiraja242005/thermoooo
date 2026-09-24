/**
 * ThermaBuild: bring your own plan (flow 2).
 *
 * DXF: reads closed LWPOLYLINE / POLYLINE outlines as rooms and TEXT / MTEXT inside them as room
 * names, converts units ($INSUNITS, or a guess from the drawing size), then works out for every
 * room which walls face outdoors (and in which direction) and which walls it shares with other
 * rooms. That layout feeds the multi-room engine directly.
 * Images: the user drags a box over each room and gives one known dimension for scale.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- DXF ----------
  function parseDXF(text) {
    const lines = text.split(/\r?\n/);
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([parseInt(lines[i].trim(), 10), lines[i + 1].trim()]);
    let units = null;
    const ents = [];
    let section = null, cur = null, poly = null;
    for (let i = 0; i < pairs.length; i++) {
      const [c, v] = pairs[i];
      if (c === 0 && v === 'SECTION') { section = pairs[i + 1] && pairs[i + 1][1]; continue; }
      if (c === 9 && v === '$INSUNITS') { units = parseInt(pairs[i + 1][1], 10); continue; }
      if (section !== 'ENTITIES') continue;
      if (c === 0) {
        if (cur && cur.type !== 'VERTEX') ents.push(cur);
        if (v === 'VERTEX' && poly) { cur = { type: 'VERTEX' }; poly.pts.push(cur); continue; }
        if (v === 'SEQEND') { poly = null; cur = null; continue; }
        cur = { type: v, pts: [], layer: '' };
        if (v === 'POLYLINE') poly = cur;
        continue;
      }
      if (!cur) continue;
      if (c === 8) cur.layer = v;
      if (cur.type === 'LWPOLYLINE') { if (c === 10) cur.pts.push([+v, 0]); if (c === 20) cur.pts[cur.pts.length - 1][1] = +v; if (c === 70) cur.closed = (+v & 1) === 1; }
      else if (cur.type === 'POLYLINE') { if (c === 70) cur.closed = (+v & 1) === 1; }
      else if (cur.type === 'VERTEX') { if (c === 10) cur.x = +v; if (c === 20) cur.y = +v; }
      else if (cur.type === 'LINE') { if (c === 10) cur.x1 = +v; if (c === 20) cur.y1 = +v; if (c === 11) cur.x2 = +v; if (c === 21) cur.y2 = +v; }
      else if (cur.type === 'TEXT' || cur.type === 'MTEXT') { if (c === 10) cur.x = +v; if (c === 20) cur.y = +v; if (c === 1 || c === 3) cur.text = (cur.text || '') + v; }
    }
    if (cur && cur.type !== 'VERTEX') ents.push(cur);
    ents.forEach((e) => { if (e.type === 'POLYLINE') e.pts = e.pts.map((p) => [p.x, p.y]); });
    return { units, ents };
  }

  const area = (p) => Math.abs(p.reduce((a, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return a + x * y2 - x2 * y; }, 0) / 2);
  const signed = (p) => p.reduce((a, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return a + x * y2 - x2 * y; }, 0) / 2;
  function inside([x, y], p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
  const cleanText = (s) => String(s || '').replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '').trim();

  /** Rooms from parsed DXF → engine layout. north: which way "up" on the drawing faces. */
  function layoutFromDXF(dxf, opts) {
    const o = Object.assign({ height: 2.7, north: 'N' }, opts);
    const closed = dxf.ents.filter((e) => (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.closed && e.pts.length >= 3);
    if (!closed.length) throw new Error('No closed room outlines found. Draw each room as a closed polyline, or trace the plan as an image.');
    // units → metres
    const ext = closed.flatMap((e) => e.pts); const span = Math.max(Math.max(...ext.map((p) => p[0])) - Math.min(...ext.map((p) => p[0])), Math.max(...ext.map((p) => p[1])) - Math.min(...ext.map((p) => p[1])));
    const scale = { 1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1 }[dxf.units] || (span > 1000 ? 0.001 : span > 100 ? 0.01 : 1);
    let polys = closed.map((e) => ({ pts: e.pts.map(([x, y]) => [x * scale, y * scale]), layer: e.layer }));
    polys.forEach((p) => { p.a = area(p.pts); if (signed(p.pts) < 0) p.pts.reverse(); });
    // the outline is a polygon that contains the centres of all the others; it is not a room
    const cent = (p) => [p.pts.reduce((a, q) => a + q[0], 0) / p.pts.length, p.pts.reduce((a, q) => a + q[1], 0) / p.pts.length];
    polys.sort((a, b) => b.a - a.a);
    if (polys.length > 1 && polys.slice(1).every((q) => inside(cent(q), polys[0].pts))) polys = polys.slice(1);
    polys = polys.filter((p) => p.a >= 1.5 && p.a <= 400);
    if (!polys.length) throw new Error('Room outlines were found but none is between 1.5 and 400 m².');
    const texts = dxf.ents.filter((e) => (e.type === 'TEXT' || e.type === 'MTEXT') && e.text).map((e) => ({ t: cleanText(e.text), p: [e.x * scale, e.y * scale] }));
    // rotate so the engine's +y is north
    const rot = { N: 0, E: 90, S: 180, W: 270 }[o.north] * Math.PI / 180;
    const R = ([x, y]) => [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];
    polys.forEach((p) => { p.pts = p.pts.map(R); });
    texts.forEach((tx) => { tx.p = R(tx.p); });
    const zones = polys.map((p, i) => {
      const label = texts.find((tx) => inside(tx.p, p.pts));
      const name = label ? label.t.split(/\s{2,}|\n/)[0].slice(0, 28) : `Room ${i + 1}`;
      return { name, area: p.a, height: o.height, poly: p.pts, fac: { S: 0, W: 0, N: 0, E: 0 }, type: /bed/i.test(name) ? 'bedroom' : /liv|hall|sit|family/i.test(name) ? 'living' : /kit/i.test(name) ? 'kitchen' : /store|bath|toilet|wc|stair|util/i.test(name) ? 'service' : 'living' };
    });
    // classify every edge: external (with its facing) or shared with another room
    const links = {};
    zones.forEach((z, zi) => {
      const p = z.poly;
      for (let k = 0; k < p.length; k++) {
        const a = p[k], b = p[(k + 1) % p.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.2) continue;
        const nx = (b[1] - a[1]) / L, ny = -(b[0] - a[0]) / L; // outward normal for a counter-clockwise polygon
        let internal = 0; const seg = 8;
        for (let s = 0; s < seg; s++) {
          const f = (s + 0.5) / seg, mx = a[0] + (b[0] - a[0]) * f + nx * 0.35, my = a[1] + (b[1] - a[1]) * f + ny * 0.35;
          const other = zones.findIndex((q, qi) => qi !== zi && inside([mx, my], q.poly));
          if (other >= 0) { internal++; const key = zi < other ? `${zi}-${other}` : `${other}-${zi}`; links[key] = (links[key] || 0) + (L / seg) * o.height * 0.5; } // each side counts half
        }
        const ext = (L * (seg - internal)) / seg;
        if (ext > 0.05) { const ang = (Math.atan2(nx, ny) * 180) / Math.PI; const f = ang >= -45 && ang < 45 ? 'N' : ang >= 45 && ang < 135 ? 'E' : ang >= -135 && ang < -45 ? 'W' : 'S'; z.fac[f] += ext; }
      }
    });
    const linkArr = Object.entries(links).map(([k, a]) => { const [x, y] = k.split('-').map(Number); return { a: x, b: y, area: a }; });
    const all = zones.flatMap((z) => z.poly); const minX = Math.min(...all.map((q) => q[0])), maxX = Math.max(...all.map((q) => q[0])), minY = Math.min(...all.map((q) => q[1])), maxY = Math.max(...all.map((q) => q[1]));
    const perimeter = zones.reduce((a, z) => a + z.fac.S + z.fac.N + z.fac.E + z.fac.W, 0);
    return { zones, links: linkArr, perimeter, width: maxX - minX, depth: maxY - minY, source: 'dxf' };
  }

  // ---------- rendering the parsed plan ----------
  function drawPlan(lay) {
    const all = lay.zones.flatMap((z) => z.poly); const minX = Math.min(...all.map((q) => q[0])), maxX = Math.max(...all.map((q) => q[0])), minY = Math.min(...all.map((q) => q[1])), maxY = Math.max(...all.map((q) => q[1]));
    const W = 560, sc = (W - 60) / Math.max(maxX - minX, (maxY - minY) * 1.1), H = (maxY - minY) * sc + 70;
    const P = ([x, y]) => [30 + (x - minX) * sc, 30 + (maxY - y) * sc];
    const facCol = { S: '#E4572E', N: '#3D7BD9', E: '#80858E', W: '#80858E' };
    const edges = lay.zones.map((z) => { const p = z.poly; let out = ''; for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.2) continue; const nx = (b[1] - a[1]) / L, ny = -(b[0] - a[0]) / L; const probe = [(a[0] + b[0]) / 2 + nx * 0.35, (a[1] + b[1]) / 2 + ny * 0.35]; if (lay.zones.some((q) => q !== z && inside(probe, q.poly))) continue; const ang = (Math.atan2(nx, ny) * 180) / Math.PI; const f = ang >= -45 && ang < 45 ? 'N' : ang >= 45 && ang < 135 ? 'E' : ang >= -135 && ang < -45 ? 'W' : 'S'; const [x1, y1] = P(a), [x2, y2] = P(b); out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${facCol[f]}" stroke-width="4" stroke-linecap="round"/>`; } return out; }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="plan-svg" role="img" aria-label="Imported plan">
      ${lay.zones.map((z) => { const pts = z.poly.map(P); const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length; return `<polygon points="${pts.map((q) => q.join(',')).join(' ')}" fill="#fff" stroke="#15171B" stroke-width="1.2"/><text x="${cx}" y="${cy}" text-anchor="middle" class="room-n">${esc(z.name)}</text><text x="${cx}" y="${cy + 15}" text-anchor="middle" class="room-a">${z.area.toFixed(1)} m²</text>`; }).join('')}
      ${edges}
      <g class="compass"><text x="${W - 22}" y="22" text-anchor="middle">N</text><path d="M${W - 22} 28 l-5 12 l5 -3 l5 3z"/></g>
    </svg>`;
  }

  function summary(lay) {
    const A = lay.zones.reduce((a, z) => a + z.area, 0);
    const fac = { S: 0, N: 0, E: 0, W: 0 }; lay.zones.forEach((z) => Object.keys(fac).forEach((f) => (fac[f] += z.fac[f])));
    return `${lay.zones.length} rooms, ${A.toFixed(1)} m². Outside walls: south ${fac.S.toFixed(1)} m, north ${fac.N.toFixed(1)} m, east ${fac.E.toFixed(1)} m, west ${fac.W.toFixed(1)} m. ${lay.links.length} shared walls.`;
  }

  function useLayout(lay, name) {
    ThermaState.planLayout = lay;
    const fig = $('f2-plan-img').parentElement;
    let box = $('f2-plan-svg'); if (!box) { box = document.createElement('div'); box.id = 'f2-plan-svg'; fig.appendChild(box); }
    box.innerHTML = drawPlan(lay);
    $('f2-plan-img').style.display = 'none';
    $('f2-plan-title').textContent = `${name}`;
    $('f2-plan-dim').textContent = `${lay.width.toFixed(1)} m × ${lay.depth.toFixed(1)} m`;
    $('f2-plan-vastu').textContent = 'Imported plan';
    const info = $('f2-import-info'); if (info) { info.hidden = false; info.innerHTML = `<b>Read from your drawing.</b> ${summary(lay)} <span class="imp-key"><i style="background:#E4572E"></i>south wall <i style="background:#3D7BD9"></i>north wall</span>`; }
    for (let i = 0; i < 5; i++) { const b = $(`f2-plan-btn-${i}`); if (b) b.classList.remove('active'); }
    if (window.TBApp) { window.TBApp.analysisKey = null; window.TBApp.siteChanged(); }
    if (window.toast) toast(`Imported ${lay.zones.length} rooms`);
  }

  function importDXFText(text, name) {
    try {
      const north = $('f2-north')?.value || 'N';
      const lay = layoutFromDXF(parseDXF(text), { north });
      lay.rawText = text; lay.fileName = name;
      useLayout(lay, name);
    } catch (e) { if (window.toast) toast(e.message); const info = $('f2-import-info'); if (info) { info.hidden = false; info.textContent = e.message; } }
  }

  // ---------- image tracing ----------
  let trace = null;
  function startTrace(src) {
    const wrap = $('trace-wrap'); if (!wrap) return;
    wrap.hidden = false; $('trace-img').src = src;
    trace = { rects: [], drag: null };
    $('trace-list').innerHTML = '';
    const svg = $('trace-svg');
    const pt = (e) => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    svg.onpointerdown = (e) => { svg.setPointerCapture(e.pointerId); trace.drag = { a: pt(e), b: pt(e) }; paintTrace(); };
    svg.onpointermove = (e) => { if (trace.drag) { trace.drag.b = pt(e); paintTrace(); } };
    svg.onpointerup = () => {
      const d = trace.drag; trace.drag = null; if (!d) return;
      const x = Math.min(d.a[0], d.b[0]), y = Math.min(d.a[1], d.b[1]), w = Math.abs(d.a[0] - d.b[0]), h = Math.abs(d.a[1] - d.b[1]);
      if (w < 0.02 || h < 0.02) { paintTrace(); return; }
      const name = ['Living', 'Main bedroom', 'Bedroom 2', 'Kitchen', 'Store and bath', 'Bedroom 3', 'Room'][Math.min(6, trace.rects.length)];
      trace.rects.push({ x, y, w, h, name }); paintTrace();
    };
  }
  function paintTrace() {
    const svg = $('trace-svg'); if (!svg || !trace) return;
    const r = (q, cls) => `<rect class="${cls}" x="${q.x * 100}%" y="${q.y * 100}%" width="${q.w * 100}%" height="${q.h * 100}%"/>`;
    const d = trace.drag ? { x: Math.min(trace.drag.a[0], trace.drag.b[0]), y: Math.min(trace.drag.a[1], trace.drag.b[1]), w: Math.abs(trace.drag.a[0] - trace.drag.b[0]), h: Math.abs(trace.drag.a[1] - trace.drag.b[1]) } : null;
    svg.innerHTML = trace.rects.map((q, i) => r(q, 'tr-room') + `<text x="${(q.x + q.w / 2) * 100}%" y="${(q.y + q.h / 2) * 100}%" text-anchor="middle">${i + 1}</text>`).join('') + (d ? r(d, 'tr-drag') : '');
    $('trace-list').innerHTML = trace.rects.map((q, i) => `<li><span>${i + 1}</span><input value="${esc(q.name)}" data-i="${i}" aria-label="Name of room ${i + 1}"><button type="button" data-del="${i}" aria-label="Remove room ${i + 1}">×</button></li>`).join('');
    $('trace-list').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => { trace.rects[+inp.dataset.i].name = inp.value; }));
    $('trace-list').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { trace.rects.splice(+b.dataset.del, 1); paintTrace(); }));
  }
  function finishTrace() {
    if (!trace || !trace.rects.length) { toast('Drag a box over each room first.'); return; }
    const widthM = parseFloat($('trace-width').value);
    if (!(widthM > 2)) { toast('Enter the real width of the whole drawing in metres.'); return; }
    const img = $('trace-img'), aspect = img.naturalHeight / img.naturalWidth;
    const toM = (q) => { const x0 = q.x * widthM, x1 = (q.x + q.w) * widthM, y1 = (1 - q.y) * widthM * aspect, y0 = (1 - q.y - q.h) * widthM * aspect; return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; };
    // build a DXF in memory so traced and imported plans share one code path
    const ent = trace.rects.map((q) => { const p = toM(q); return `0\nLWPOLYLINE\n8\nROOMS\n90\n4\n70\n1\n${p.map(([x, y]) => `10\n${x.toFixed(3)}\n20\n${y.toFixed(3)}`).join('\n')}\n0\nTEXT\n8\nNAMES\n10\n${((p[0][0] + p[1][0]) / 2).toFixed(3)}\n20\n${((p[0][1] + p[2][1]) / 2).toFixed(3)}\n40\n0.3\n1\n${q.name}`; }).join('\n');
    const dxf = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${ent}\n0\nENDSEC\n0\nEOF\n`;
    importDXFText(dxf, 'Traced plan');
    $('trace-wrap').hidden = true;
  }

  // ---------- wiring ----------
  function wire() {
    const _up = window.flow2HandleCustomUpload;
    window.flow2HandleCustomUpload = function (event) {
      const file = event.target.files && event.target.files[0]; if (!file) return;
      if (/\.dxf$/i.test(file.name)) { const r = new FileReader(); r.onload = () => importDXFText(String(r.result), file.name); r.readAsText(file); return; }
      _up(event);
      if (/^image\//.test(file.type)) { const r = new FileReader(); r.onload = () => { $('f2-plan-img').style.display = ''; const b = $('f2-plan-svg'); if (b) b.innerHTML = ''; ThermaState.planLayout = null; startTrace(r.result); }; r.readAsDataURL(file); }
    };
    const _preset = window.flow2SelectPresetPlan;
    window.flow2SelectPresetPlan = function (i) { _preset(i); ThermaState.planLayout = null; $('f2-plan-img').style.display = ''; const b = $('f2-plan-svg'); if (b) b.innerHTML = ''; const info = $('f2-import-info'); if (info) info.hidden = true; if ($('trace-wrap')) $('trace-wrap').hidden = true; if (window.TBApp) window.TBApp.siteChanged(); };
    $('f2-sample')?.addEventListener('click', () => {
      fetch('assets/samples/ladakh_passive_house.dxf').then((r) => { if (!r.ok) throw new Error(); return r.text(); })
        .then((txt) => importDXFText(txt, 'Sample: Ladakhi passive-solar house (DXF)'))
        .catch(() => { if (window.TB_SAMPLE_DXF) importDXFText(window.TB_SAMPLE_DXF, 'Sample: Ladakhi passive-solar house (DXF)'); });
    });
    $('f2-north')?.addEventListener('change', () => { const L = ThermaState.planLayout; if (L && L.rawText) importDXFText(L.rawText, L.fileName); });
    $('trace-done')?.addEventListener('click', finishTrace);
    $('trace-cancel')?.addEventListener('click', () => { $('trace-wrap').hidden = true; });
  }
  window.TBPlan = { parseDXF, layoutFromDXF, drawPlan };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
