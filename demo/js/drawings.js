/**
 * ThermaBuild: architectural drawing sheet for the design in step 4.
 * Plan, section A–A with winter and summer noon sun angles, south and north elevations,
 * a hatched material legend and a title block. Uses the same geometry as the 3D house
 * (TBHouse.plan), so windows, the Trombe wall and the door sit in the same places.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = (x) => x.toFixed(2);

  const PAT = { rammed_earth: 'earth', mud_brick: 'earth', cseb: 'earth', mud_screed: 'earth', mud_plaster: 'plaster', lime_plaster: 'plaster', stone: 'stone', conc_block: 'conc', rcc: 'conc', aac: 'conc', brick: 'brick', clay_tile: 'brick', eps: 'ins', rock_wool: 'ins', wool_felt: 'ins', cork: 'ins', wood_fibre: 'ins', straw_bale: 'straw', grass_twig: 'straw', poplar: 'timber', clt: 'timber', timber_floor: 'timber', gravel: 'gravel', steel_sheet: 'steel', soil: 'earth', air_gap: 'air' };
  const defs = `<defs>
    <pattern id="h-earth" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#E9D6BD"/><circle cx="2" cy="2" r=".8" fill="#9C7A55"/><circle cx="6" cy="5" r=".6" fill="#9C7A55"/></pattern>
    <pattern id="h-plaster" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F4F0E8"/><circle cx="3" cy="3" r=".4" fill="#B8A88F"/></pattern>
    <pattern id="h-stone" width="16" height="12" patternUnits="userSpaceOnUse"><rect width="16" height="12" fill="#D6D3CC"/><path d="M0 6h7l2-6M9 12l1-6h6" stroke="#77736B" fill="none" stroke-width=".8"/></pattern>
    <pattern id="h-conc" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#DADAD6"/><circle cx="2" cy="3" r=".7" fill="#7D7D78"/><path d="M5 6l1.2-2 1.2 2z" fill="#7D7D78"/></pattern>
    <pattern id="h-brick" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E8B9A2"/><line x1="0" y1="0" x2="0" y2="6" stroke="#9E4A2A" stroke-width="1.2"/></pattern>
    <pattern id="h-ins" width="10" height="6" patternUnits="userSpaceOnUse"><rect width="10" height="6" fill="#FAF6C8"/><path d="M0 5 L2.5 1 L5 5 L7.5 1 L10 5" stroke="#A89A2A" fill="none" stroke-width=".8"/></pattern>
    <pattern id="h-straw" width="8" height="4" patternUnits="userSpaceOnUse"><rect width="8" height="4" fill="#F0DFA8"/><path d="M0 2h5" stroke="#B89A45" stroke-width=".8"/></pattern>
    <pattern id="h-timber" width="10" height="4" patternUnits="userSpaceOnUse"><rect width="10" height="4" fill="#EBD2A9"/><path d="M0 2 q5 -2 10 0" stroke="#A67C45" fill="none" stroke-width=".7"/></pattern>
    <pattern id="h-gravel" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#E4E1DA"/><circle cx="2" cy="2" r="1.4" fill="none" stroke="#8A867D" stroke-width=".6"/><circle cx="6" cy="6" r="1.1" fill="none" stroke="#8A867D" stroke-width=".6"/></pattern>
    <pattern id="h-steel" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#7E858C"/></pattern>
    <pattern id="h-air" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#F4F8FB"/></pattern>
    <pattern id="h-dark" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#3A302A"/><line x1="0" y1="0" x2="0" y2="5" stroke="#1C1612" stroke-width="1.5"/></pattern>
    <marker id="dim-t" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M2 8 L8 2" stroke="#15171B" stroke-width="1.4"/></marker>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#D9A21B"/></marker>
  </defs>`;
  const hatch = (k) => `url(#h-${PAT[k] || 'plaster'})`;

  function dim(x1, y1, x2, y2, text, off, vertical) {
    const o = off || 14;
    if (vertical) return `<g class="dw-dim"><line x1="${x1 - o}" y1="${y1}" x2="${x2 - o}" y2="${y2}" marker-start="url(#dim-t)" marker-end="url(#dim-t)"/><line x1="${x1 - o - 4}" y1="${y1}" x2="${x1 - 2}" y2="${y1}"/><line x1="${x2 - o - 4}" y1="${y2}" x2="${x2 - 2}" y2="${y2}"/><text x="${x1 - o - 6}" y="${(y1 + y2) / 2}" transform="rotate(-90 ${x1 - o - 6} ${(y1 + y2) / 2})" text-anchor="middle">${text}</text></g>`;
    return `<g class="dw-dim"><line x1="${x1}" y1="${y1 + o}" x2="${x2}" y2="${y2 + o}" marker-start="url(#dim-t)" marker-end="url(#dim-t)"/><line x1="${x1}" y1="${y1 + 2}" x2="${x1}" y2="${y1 + o + 4}"/><line x1="${x2}" y1="${y2 + 2}" x2="${x2}" y2="${y2 + o + 4}"/><text x="${(x1 + x2) / 2}" y="${y1 + o - 4}" text-anchor="middle">${text}</text></g>`;
  }

  function build() {
    const H = window.TBHouse; if (!H || !H.plan || !H.data) return '';
    const D = H.data, v = D.v, sp = D.sp, M = TB.materials, P = H.plan, site = D.site, cold = D.c.mode === 'heating';
    const { minX, maxX, minY, maxY } = P.bbox, wT = P.wallT, hW = P.hWall, pl = P.plinth, roofT = P.roofTop - hW;
    const Wm = maxX - minX, Dm = maxY - minY;
    const trad = /mud_poplar/.test(v.roof);
    let out = '';

    // ---------- PLAN ----------
    {
      const bx = 40, by = 70, bw = 640, bh = 440;
      const k = Math.min((bw - 90) / (Wm + 2 * wT), (bh - 90) / (Dm + 2 * wT));
      const ox = bx + 60 + (bw - 90 - (Wm + 2 * wT) * k) / 2 + wT * k, oy = by + 30 + wT * k;
      const X = (x) => ox + (x - minX) * k, Y = (y) => oy + (maxY - y) * k;
      let g = `<text x="${bx}" y="${by - 16}" class="dw-title">Plan</text>`;
      P.polys.forEach((p, zi) => {
        g += `<polygon points="${p.map(([x, y]) => `${f2(X(x))},${f2(Y(y))}`).join(' ')}" class="dw-room"/>`;
        const cx = p.reduce((a, q) => a + q[0], 0) / p.length, cy = p.reduce((a, q) => a + q[1], 0) / p.length;
        const z = sp.zones[zi]; g += `<text x="${X(cx)}" y="${Y(cy) - 2}" class="dw-rname" text-anchor="middle">${esc(z ? z.name : `Room ${zi + 1}`)}</text><text x="${X(cx)}" y="${Y(cy) + 12}" class="dw-rarea" text-anchor="middle">${(z ? z.area : 0).toFixed(1)} m²</text>`;
      });
      // partitions
      for (let i = 0; i < P.polys.length; i++) for (let j = i + 1; j < P.polys.length; j++) {
        const A = P.polys[i], B = P.polys[j];
        for (let a = 0; a < A.length; a++) for (let b = 0; b < B.length; b++) {
          const p1 = A[a], p2 = A[(a + 1) % A.length], q1 = B[b], q2 = B[(b + 1) % B.length], L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); if (L < 0.3) continue;
          const u = [(p2[0] - p1[0]) / L, (p2[1] - p1[1]) / L], off = (q) => Math.abs((q[0] - p1[0]) * u[1] - (q[1] - p1[1]) * u[0]);
          if (off(q1) > 0.05 || off(q2) > 0.05) continue;
          const t1 = (q1[0] - p1[0]) * u[0] + (q1[1] - p1[1]) * u[1], t2 = (q2[0] - p1[0]) * u[0] + (q2[1] - p1[1]) * u[1];
          const lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(L, Math.max(t1, t2)); if (hi - lo < 0.3) continue;
          const s = [p1[0] + u[0] * lo, p1[1] + u[1] * lo], e = [p1[0] + u[0] * hi, p1[1] + u[1] * hi], m = (lo + hi) / 2;
          const d1 = [p1[0] + u[0] * (m - 0.45), p1[1] + u[1] * (m - 0.45)], d2 = [p1[0] + u[0] * (m + 0.45), p1[1] + u[1] * (m + 0.45)];
          g += `<line x1="${X(s[0])}" y1="${Y(s[1])}" x2="${X(d1[0])}" y2="${Y(d1[1])}" class="dw-part"/><line x1="${X(d2[0])}" y1="${Y(d2[1])}" x2="${X(e[0])}" y2="${Y(e[1])}" class="dw-part"/>`;
        }
      }
      // external walls with openings
      P.segs.forEach((s) => {
        const [ax, ay] = s.pa, [bx2, by2] = s.pb, L = s.L, ux = (bx2 - ax) / L, uy = (by2 - ay) / L, nx = uy, ny = -ux;
        const pt = (u, o) => [ax + ux * u + nx * o, ay + uy * u + ny * o];
        const quad = (u1, u2, o1, o2, fill, cls) => { const q = [pt(u1, o1), pt(u2, o1), pt(u2, o2), pt(u1, o2)]; return `<polygon points="${q.map(([x, y]) => `${f2(X(x))},${f2(Y(y))}`).join(' ')}" fill="${fill}" class="${cls || 'dw-wall'}"/>`; };
        const ops = P.openings.get(s) || [];
        let u0 = 0;
        ops.forEach((o) => { g += quad(u0, o.u, 0, wT, hatch(sp.wall.layers[sp.wall.layers.length - 1][0])); u0 = o.u + o.w; });
        g += quad(u0, L, 0, wT, hatch(sp.wall.layers[sp.wall.layers.length - 1][0]));
        // insulation line on the outside face
        if (v.ins) g += quad(0, L, wT - v.ins, wT, hatch('eps'), 'dw-ins');
        ops.forEach((o) => {
          if (o.kind === 'win') { g += quad(o.u, o.u + o.w, 0, wT, '#fff', 'dw-open'); const a = pt(o.u, wT * 0.45), b = pt(o.u + o.w, wT * 0.45), c = pt(o.u, wT * 0.55), d = pt(o.u + o.w, wT * 0.55); g += `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" class="dw-glass"/><line x1="${X(c[0])}" y1="${Y(c[1])}" x2="${X(d[0])}" y2="${Y(d[1])}" class="dw-glass"/>`; }
          else if (o.kind === 'trombe') { g += quad(o.u, o.u + o.w, 0, 0.3, 'url(#h-dark)', 'dw-wall'); g += quad(o.u, o.u + o.w, 0.3, wT, '#fff', 'dw-open'); const a = pt(o.u, wT + 0.08), b = pt(o.u + o.w, wT + 0.08); g += `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" class="dw-glass"/>`; }
          else if (o.kind === 'door') { g += quad(o.u, o.u + o.w, 0, wT, '#fff', 'dw-open'); const h = pt(o.u, 0), e = pt(o.u + o.w, 0), sw = pt(o.u, -o.w); g += `<path d="M${X(h[0])} ${Y(h[1])} L${X(sw[0])} ${Y(sw[1])} A${o.w * k} ${o.w * k} 0 0 ${s.f === 'N' || s.f === 'E' ? 1 : 0} ${X(e[0])} ${Y(e[1])}" class="dw-door"/>`; }
        });
      });
      // dimensions and north arrow
      g += dim(X(minX) - wT * k, Y(minY) + wT * k + 10, X(maxX) + wT * k, Y(minY) + wT * k + 10, `${(Wm + 2 * wT).toFixed(2)} m`, 12);
      g += dim(X(minX) - wT * k - 16, Y(maxY) - wT * k, X(minX) - wT * k - 16, Y(minY) + wT * k, `${(Dm + 2 * wT).toFixed(2)} m`, 12, true);
      g += `<g transform="translate(${bx + bw - 30} ${by + 20})"><circle r="16" class="dw-na"/><path d="M0 -14 L6 8 L0 3 L-6 8z" fill="#E4572E"/><text y="-20" text-anchor="middle" class="dw-small">N</text></g>`;
      // section line A–A through the largest south room
      const sr = P.polys.map((p, i) => ({ p, i, a: sp.zones[i] ? sp.zones[i].area : 0, s: sp.zones[i] ? sp.zones[i].fac.S : 0 })).filter((r) => r.s > 0).sort((a, b) => b.a - a.a)[0] || { p: P.polys[0] };
      const secX = sr.p.reduce((a, q) => a + q[0], 0) / sr.p.length;
      H.secX = secX;
      g += `<line x1="${X(secX)}" y1="${Y(maxY) - wT * k - 14}" x2="${X(secX)}" y2="${Y(minY) + wT * k + 14}" class="dw-cut"/><text x="${X(secX) + 5}" y="${Y(maxY) - wT * k - 16}" class="dw-cutlbl">A</text><text x="${X(secX) + 5}" y="${Y(minY) + wT * k + 26}" class="dw-cutlbl">A</text>`;
      if (v.orientation) g += `<text x="${bx}" y="${by + bh - 4}" class="dw-small">Building turned ${Math.abs(v.orientation)}° ${v.orientation > 0 ? 'west' : 'east'} of due south; plan drawn with the long face at the bottom.</text>`;
      out += `<g class="dw-panel">${g}</g>`;
    }

    // ---------- SECTION A–A ----------
    {
      const bx = 730, by = 70, bw = 630, bh = 440;
      const totH = pl + hW + roofT + 0.4, totD = Dm + 2 * wT + 3.2; // leave room for the sun rays
      const k = Math.min((bw - 80) / totD, (bh - 70) / (totH + 1.2));
      const gy = by + bh - 40; // ground line
      const sx0 = bx + 40 + 2.2 * k; // south outer face
      const Z = (d) => sx0 + d * k; // d: metres from the south outer face toward north
      const Yh = (h) => gy - h * k;
      let g = `<text x="${bx}" y="${by - 16}" class="dw-title">Section A–A</text>`;
      g += `<line x1="${bx}" y1="${gy}" x2="${bx + bw}" y2="${gy}" class="dw-ground"/>`;
      const inner = Dm; // clear depth between the walls
      // plinth and floor layers
      g += `<rect x="${Z(0)}" y="${Yh(pl)}" width="${(inner + 2 * wT) * k}" height="${pl * k}" fill="url(#h-stone)" class="dw-cutline"/>`;
      let fy = pl; sp.floor.layers.slice().reverse().forEach(([key, d]) => { fy -= d; g += `<rect x="${Z(wT)}" y="${Yh(fy + d)}" width="${inner * k}" height="${Math.max(1, d * k)}" fill="${hatch(key)}" class="dw-cutline"/>`; });
      // walls (south: layers outside→inside from d=0; north mirrored)
      const layers = sp.wall.layers;
      const southOps = (() => { const s = P.segs.filter((q) => q.f === 'S').find((q) => Math.min(q.pa[0], q.pb[0]) <= H.secX && Math.max(q.pa[0], q.pb[0]) >= H.secX); if (!s) return null; const u = Math.abs(H.secX - s.pa[0]); return (P.openings.get(s) || []).find((o) => u >= o.u && u <= o.u + o.w) || null; })();
      const drawWall = (fromD, dirSign, ops) => {
        let d = 0;
        layers.forEach(([key, t]) => {
          const x = dirSign > 0 ? Z(fromD + d) : Z(fromD - d - t);
          if (ops && ops.kind === 'win') { g += `<rect x="${x}" y="${Yh(pl + hW)}" width="${t * k}" height="${(hW - P.sill - P.winH) * k}" fill="${hatch(key)}" class="dw-cutline"/><rect x="${x}" y="${Yh(pl + P.sill)}" width="${t * k}" height="${P.sill * k}" fill="${hatch(key)}" class="dw-cutline"/>`; }
          else if (ops && ops.kind === 'trombe') { /* drawn below */ }
          else g += `<rect x="${x}" y="${Yh(pl + hW)}" width="${Math.max(1, t * k)}" height="${hW * k}" fill="${hatch(key)}" class="dw-cutline"/>`;
          d += t;
        });
      };
      drawWall(0, 1, southOps);
      drawWall(inner + 2 * wT, -1, null);
      if (southOps && southOps.kind === 'win') g += `<line x1="${Z(wT * 0.45)}" y1="${Yh(pl + P.sill)}" x2="${Z(wT * 0.45)}" y2="${Yh(pl + P.sill + P.winH)}" class="dw-glass"/><line x1="${Z(wT * 0.55)}" y1="${Yh(pl + P.sill)}" x2="${Z(wT * 0.55)}" y2="${Yh(pl + P.sill + P.winH)}" class="dw-glass"/>`;
      if (southOps && southOps.kind === 'trombe') g += `<rect x="${Z(wT - 0.3)}" y="${Yh(pl + 2.55)}" width="${0.3 * k}" height="${2.4 * k}" fill="url(#h-dark)" class="dw-cutline"/><line x1="${Z(-0.08)}" y1="${Yh(pl + 0.15)}" x2="${Z(-0.08)}" y2="${Yh(pl + 2.55)}" class="dw-glass"/><text x="${Z(0)}" y="${Yh(pl + 1.3)}" class="dw-small" text-anchor="end" dx="-12">Trombe</text>`;
      // internal partitions crossed by the section line
      const ys = []; P.polys.forEach((p) => { const inside = p.some((q) => q[0] <= H.secX) && p.some((q) => q[0] >= H.secX); if (inside) p.forEach((q) => ys.push(q[1])); });
      [...new Set(ys.map((y) => +y.toFixed(2)))].filter((y) => y > minY + 0.2 && y < maxY - 0.2).forEach((y) => { const d = wT + (maxY - y); g += `<rect x="${Z(d) - 0.08 * k}" y="${Yh(pl + hW)}" width="${0.16 * k}" height="${hW * k}" fill="url(#h-earth)" class="dw-cutline"/>`; });
      // roof layers
      let ry = pl + hW; sp.roof.layers.slice().reverse().forEach(([key, t]) => { g += `<rect x="${Z(0)}" y="${Yh(ry + t)}" width="${(inner + 2 * wT) * k}" height="${Math.max(1, t * k)}" fill="${hatch(key)}" class="dw-cutline"/>`; ry += t; });
      g += `<rect x="${Z(0)}" y="${Yh(ry + (trad ? 0.34 : 0.45))}" width="${0.32 * k}" height="${(trad ? 0.34 : 0.45) * k}" fill="${trad ? '#4B3A2B' : 'url(#h-plaster)'}" class="dw-cutline"/><rect x="${Z(inner + 2 * wT - 0.32)}" y="${Yh(ry + (trad ? 0.34 : 0.45))}" width="${0.32 * k}" height="${(trad ? 0.34 : 0.45) * k}" fill="${trad ? '#4B3A2B' : 'url(#h-plaster)'}" class="dw-cutline"/>`;
      if (v.overhang > 0) g += `<rect x="${Z(-v.overhang)}" y="${Yh(pl + P.sill + P.winH + 0.34)}" width="${v.overhang * k}" height="${0.08 * k}" fill="#7A5B3E"/>`;
      // noon sun: winter and summer solstice
      const lat = site.lat, alts = [[`21 Dec noon, ${Math.round(90 - lat - 23.44)}°`, 90 - lat - 23.44, '#D9A21B'], [`21 Jun noon, ${Math.round(Math.min(90, 90 - lat + 23.44))}°`, Math.min(89, 90 - lat + 23.44), '#E4572E']];
      const hitY = pl + P.sill + P.winH, hitX = Z(v.overhang > 0 ? 0 : 0);
      alts.forEach(([t, a, col], i) => { const r = (a * Math.PI) / 180, len = 3.4; const x0 = hitX - Math.cos(r) * len * k, y0 = Yh(hitY) - Math.sin(r) * len * k; g += `<line x1="${x0}" y1="${y0}" x2="${hitX + (i ? 0 : Math.cos(r) * 1.4 * k)}" y2="${Yh(hitY) + (i ? 0 : Math.sin(r) * 1.4 * k)}" stroke="${col}" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#arr)"/><text x="${x0 - 4}" y="${y0 - 6 + i * 2}" class="dw-sun" fill="${col}">${t}</text>`; });
      g += dim(Z(0), gy + 6, Z(inner + 2 * wT), gy + 6, `${(inner + 2 * wT).toFixed(2)} m`, 12);
      g += dim(Z(inner + 2 * wT) + 30, Yh(pl + hW), Z(inner + 2 * wT) + 30, Yh(pl), `${hW.toFixed(2)} m clear`, 0, true);
      g += `<text x="${Z(inner / 2 + wT)}" y="${Yh(pl + hW / 2)}" class="dw-rname" text-anchor="middle">Room height ${hW.toFixed(1)} m</text>`;
      g += `<text x="${Z(0) - 6}" y="${gy + 34}" class="dw-small" text-anchor="start">South</text><text x="${Z(inner + 2 * wT)}" y="${gy + 34}" class="dw-small" text-anchor="end">North</text>`;
      out += `<g class="dw-panel">${g}</g>`;
    }

    // ---------- ELEVATIONS ----------
    const elevation = (face, bx, by, bw, bh) => {
      const totW = Wm + 2 * wT, totH = pl + hW + roofT + 0.5 + 2.2;
      const k = Math.min((bw - 40) / totW, (bh - 60) / totH);
      const gy = by + bh - 30, x0 = bx + (bw - totW * k) / 2;
      const X = (x) => face === 'S' ? x0 + (x - minX + wT) * k : x0 + (maxX - x + wT) * k, Yh = (h) => gy - h * k;
      let g = `<text x="${bx}" y="${by - 16}" class="dw-title">${face === 'S' ? 'South elevation' : 'North elevation'}</text>`;
      g += `<line x1="${bx}" y1="${gy}" x2="${bx + bw}" y2="${gy}" class="dw-ground"/>`;
      g += `<rect x="${x0}" y="${Yh(pl)}" width="${totW * k}" height="${pl * k}" fill="url(#h-stone)" class="dw-line"/>`;
      g += `<rect x="${x0}" y="${Yh(pl + hW)}" width="${totW * k}" height="${hW * k}" fill="${cold ? '#F4F0E8' : '#EDE6DA'}" class="dw-line"/>`;
      g += `<rect x="${x0 - 0.06 * k}" y="${Yh(pl + hW + roofT)}" width="${(totW + 0.12) * k}" height="${roofT * k}" fill="#C9B79C" class="dw-line"/>`;
      g += `<rect x="${x0}" y="${Yh(pl + hW + roofT + (trad ? 0.34 : 0.45))}" width="${totW * k}" height="${(trad ? 0.34 : 0.45) * k}" fill="${trad ? '#4B3A2B' : '#EDE6DA'}" class="dw-line"/>`;
      if (trad) for (let x = 0.3; x < totW; x += 0.6) g += `<circle cx="${x0 + x * k}" cy="${Yh(pl + hW - 0.05)}" r="${0.07 * k}" fill="#8C6A45"/>`;
      P.segs.filter((s) => s.f === face).forEach((s) => {
        const L = s.L, ux = (s.pb[0] - s.pa[0]) / L;
        (P.openings.get(s) || []).forEach((o) => {
          const xa = X(s.pa[0] + ux * o.u), xb = X(s.pa[0] + ux * (o.u + o.w)), l = Math.min(xa, xb), w = Math.abs(xb - xa);
          if (o.kind === 'win') {
            if (cold) g += `<path d="M${l - 0.32 * k} ${Yh(pl + P.sill - 0.23)} L${l + w + 0.32 * k} ${Yh(pl + P.sill - 0.23)} L${l + w + 0.18 * k} ${Yh(pl + P.sill + P.winH + 0.18)} L${l - 0.18 * k} ${Yh(pl + P.sill + P.winH + 0.18)}z" fill="#1C1B1A"/><rect x="${l - 0.4 * k}" y="${Yh(pl + P.sill + P.winH + 0.34)}" width="${w + 0.8 * k}" height="${0.12 * k}" fill="#6B4A2B"/>`;
            g += `<rect x="${l}" y="${Yh(pl + P.sill + P.winH)}" width="${w}" height="${P.winH * k}" fill="#CFE2F2" stroke="#15171B" stroke-width=".8"/><line x1="${l + w / 2}" y1="${Yh(pl + P.sill + P.winH)}" x2="${l + w / 2}" y2="${Yh(pl + P.sill)}" stroke="#15171B" stroke-width=".6"/>`;
            if (v.overhang > 0 && face !== 'N') g += `<rect x="${l - 0.3 * k}" y="${Yh(pl + P.sill + P.winH + 0.38)}" width="${w + 0.6 * k}" height="${0.08 * k}" fill="#7A5B3E"/>`;
          } else if (o.kind === 'trombe') g += `<rect x="${l}" y="${Yh(pl + 2.55)}" width="${w}" height="${2.4 * k}" fill="#2A211C" stroke="#15171B"/><path d="M${l + 4} ${Yh(pl + 2.4)} l${w * 0.3} ${w * 0.3}" stroke="#8FB3D0" stroke-width="1.2" opacity=".7"/>`;
          else if (o.kind === 'door') g += `<rect x="${l}" y="${Yh(pl + 2.1)}" width="${w}" height="${2.1 * k}" fill="#5A3B22" stroke="#15171B"/>`;
        });
      });
      // chimney
      const zones = sp.zones; let zi = zones.findIndex((z) => z.type === 'kitchen'); if (zi < 0) zi = 0;
      const cx = P.polys[zi].reduce((a, q) => a + q[0], 0) / P.polys[zi].length;
      if (TB.design.TYPES[D.c.type].stove && cold) g += `<rect x="${X(cx) - 0.1 * k}" y="${Yh(pl + hW + roofT + 1.8)}" width="${0.2 * k}" height="${1.8 * k}" fill="#1F1F1F"/><path d="M${X(cx) - 0.28 * k} ${Yh(pl + hW + roofT + 1.8)} l${0.28 * k} ${-0.25 * k} l${0.28 * k} ${0.25 * k}z" fill="#1F1F1F"/>`;
      g += dim(x0, gy + 2, x0 + totW * k, gy + 2, `${totW.toFixed(2)} m`, 14);
      g += dim(x0 - 8, Yh(pl + hW + roofT), x0 - 8, gy, `${(pl + hW + roofT).toFixed(2)} m`, 10, true);
      return `<g class="dw-panel">${g}</g>`;
    };
    out += elevation('S', 40, 590, 470, 330) + elevation('N', 540, 590, 440, 330);

    // ---------- LEGEND ----------
    {
      const bx = 1010, by = 580;
      const rows = [];
      const addLayers = (title, layers, U) => { rows.push({ t: title, U }); layers.forEach(([key, d]) => rows.push({ key, name: M.M[key].name, d })); };
      addLayers(`Walls, U ${sp.wall.U.toFixed(2)} W/m²K`, sp.wall.layers, sp.wall.U);
      addLayers(`Roof, U ${sp.roof.U.toFixed(2)} W/m²K`, sp.roof.layers.slice().reverse(), sp.roof.U);
      addLayers('Floor', sp.floor.layers.slice().reverse());
      let g = `<text x="${bx}" y="${by}" class="dw-title">Materials</text>`; let y = by + 18;
      rows.forEach((r) => {
        if (r.t) { g += `<text x="${bx}" y="${y + 10}" class="dw-leg-h">${esc(r.t)}</text>`; y += 16; return; }
        g += `<rect x="${bx}" y="${y}" width="22" height="11" fill="${hatch(r.key)}" stroke="#15171B" stroke-width=".6"/><text x="${bx + 30}" y="${y + 9.5}" class="dw-leg">${esc(r.name)}, ${Math.round(r.d * 1000)} mm</text>`; y += 15;
      });
      g += `<rect x="${bx}" y="${y + 2}" width="22" height="11" fill="#CFE2F2" stroke="#15171B" stroke-width=".6"/><text x="${bx + 30}" y="${y + 11.5}" class="dw-leg">${esc(M.GLAZING[v.glazing].label)}, U ${M.GLAZING[v.glazing].U.toFixed(2)}, g ${M.GLAZING[v.glazing].g.toFixed(2)}</text>`;
      out += `<g class="dw-panel">${g}</g>`;
    }

    // ---------- TITLE BLOCK ----------
    {
      const x = 1010, y = 830, w = 350, h = 125, place = site.name.split(',')[0];
      const tweaked = D.d.recommended && JSON.stringify(D.d.recommended) !== JSON.stringify(D.v);
      out += `<g class="dw-tb"><rect x="${x}" y="${y}" width="${w}" height="${h}"/><line x1="${x}" y1="${y + 38}" x2="${x + w}" y2="${y + 38}"/><line x1="${x}" y1="${y + 88}" x2="${x + w}" y2="${y + 88}"/><line x1="${x + 230}" y1="${y + 88}" x2="${x + 230}" y2="${y + h}"/>
        <text x="${x + 12}" y="${y + 25}" class="dw-tb-big">ThermaBuild</text><text x="${x + w - 12}" y="${y + 25}" class="dw-tb-s" text-anchor="end">Sheet A-101</text>
        <text x="${x + 12}" y="${y + 58}" class="dw-tb-m">${esc(TB.design.TYPES[D.c.type].label)}, ${esc(place)} (${site.elev_m.toLocaleString('en-IN')} m)</text>
        <text x="${x + 12}" y="${y + 76}" class="dw-tb-s">${tweaked ? 'Recommended design with your changes' : 'Recommended design'} · ${sp.area.toFixed(0)} m² · ${sp.zones.length} rooms</text>
        <text x="${x + 12}" y="${y + 104}" class="dw-tb-s">Dimensions in metres. Not to scale.</text>
        <text x="${x + 12}" y="${y + 118}" class="dw-tb-s">Check with an engineer before building.</text>
        <text x="${x + 240}" y="${y + 104}" class="dw-tb-s">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</text>
        <text x="${x + 240}" y="${y + 118}" class="dw-tb-s">Rev A</text></g>`;
    }
    return `<svg viewBox="0 0 1400 980" class="dw-sheet" id="dw-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plan, section and elevations of your design">${defs}<rect x="8" y="8" width="1384" height="964" class="dw-border"/>${out}</svg>`;
  }

  function render() { const box = $('drawings-sheet'); if (box) box.innerHTML = build(); }
  window.TBDrawings = { render, build };
  window.showDrawings = function (on) {
    const d = $('drawings-container'); if (!d) return;
    d.style.display = on ? 'block' : 'none';
    if (!on) return;
    const H = window.TBHouse;
    if (H && H.plan) render(); else { $('drawings-sheet').innerHTML = '<p class="drawings-wait">Drawing your design…</p>'; Promise.resolve(window.init3DViewer && window.init3DViewer()).then(render); }
  };
  function wire() {
    $('dw-print')?.addEventListener('click', () => { render(); document.body.classList.add('print-drawings'); window.print(); setTimeout(() => document.body.classList.remove('print-drawings'), 500); });
    $('dw-svg-dl')?.addEventListener('click', () => {
      render(); const svg = $('dw-svg'); if (!svg) return;
      const css = `<style>${[...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText).filter((t) => /\.dw-/.test(t)); } catch (e) { return []; } }).join('\n')}</style>`;
      const txt = svg.outerHTML.replace('</defs>', `</defs>${css}`);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' })); a.download = 'ThermaBuild_drawings.svg'; a.click();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
