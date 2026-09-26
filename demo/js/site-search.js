/* Site search with type-ahead suggestions (step 1).
   Stored presets match instantly; towns, street addresses, landmarks and PIN codes come from
   Photon (OpenStreetMap), limited to India. Picking an address zooms in on satellite imagery. */
(function () {
  const input = document.getElementById('city-search');
  const list = document.getElementById('place-suggest');
  const box = document.getElementById('place-search');
  const btn = document.getElementById('city-search-btn');
  if (!input || !list || !box) return;

  const INDIA_BBOX = '68,6,98,37.5';
  const TYPE_LABEL = { city: 'City', town: 'Town', village: 'Village', hamlet: 'Hamlet', suburb: 'Area', locality: 'Locality', district: 'District', county: 'District', state: 'State', administrative: 'Region' };
  const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const HOUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M10 20v-5h4v5"/></svg>';
  const ROAD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3 4 21M17 3l3 18M12 4v3M12 11v3M12 18v2"/></svg>';
  const SNOW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M4.2 7l15.6 10M4.2 17 19.8 7M9 4l3 3 3-3M9 20l3-3 3 3"/></svg>';

  const cache = new Map();
  let items = [], active = -1, timer = null, ctrl = null, lastQ = '';

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mark = (text, q) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (!q || i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  };

  function presetItems(q) {
    const s = q.toLowerCase();
    return Object.entries(LOCATION_PRESETS)
      .filter(([k, p]) => !s || k.replace('_', ' ').includes(s) || p.name.toLowerCase().includes(s))
      .map(([k, p]) => {
        const [main, ...rest] = p.name.split('(')[0].trim().split(',');
        return { preset: k, name: main.trim(), sub: rest.join(',').trim() || 'India', tag: 'Stored climate', lat: p.lat, lon: p.lon };
      });
  }

  // Towns and cities before villages and hamlets of the same name
  const TIER = { city: 0, town: 1, district: 2, county: 2, administrative: 2, state: 3, suburb: 4, village: 4, locality: 5, hamlet: 5 };
  const tier = (p) => TIER[p.osm_value] ?? TIER[p.type] ?? 4;

  function photonItems(features) {
    const seen = new Set();
    return features
      .filter((f) => f.properties.countrycode === 'IN')
      .map((f, i) => ({ f, i, t: tier(f.properties) }))
      .sort((a, b) => a.t - b.t || a.i - b.i)
      .map(({ f }) => {
        const p = f.properties, [lon, lat] = f.geometry.coordinates;
        const parent = [p.county && p.county !== p.name ? p.county : null, p.state].filter(Boolean);
        return { name: p.name, sub: parent.join(', ') || 'India', tag: TYPE_LABEL[p.osm_value] || TYPE_LABEL[p.type] || 'Place', lat, lon };
      })
      .filter((it) => { const k = it.name + '|' + it.sub; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 5);
  }

  // Streets, buildings, landmarks and PIN codes
  const words = (t) => t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  function addressItems(features) {
    const seen = new Set();
    return features
      .filter((f) => f.properties.countrycode === 'IN' && (f.properties.type === 'house' || f.properties.type === 'street' || f.properties.osm_value === 'postcode'))
      .map((f) => {
        const p = f.properties, [lon, lat] = f.geometry.coordinates;
        const road = [p.housenumber, p.street].filter(Boolean).join(' ');
        const kind = p.osm_value === 'postcode' ? 'postcode' : p.type;
        const name = kind === 'postcode' ? `PIN ${p.name}` : (p.name || road || 'Unnamed address');
        const town = p.city || p.county;
        const sub = [road && road !== name ? road : null, p.district, town, p.state, kind === 'postcode' ? null : p.postcode]
          .filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(', ');
        const tag = kind === 'postcode' ? 'PIN code' : kind === 'street' ? 'Street' : (p.osm_value && p.osm_value !== 'yes' ? words(p.osm_value) : 'Building');
        return { address: kind, name, sub: sub || 'India', label: [name, town || p.state].filter(Boolean).join(', '), tag, lat, lon };
      })
      .filter((it) => { const k = it.name + '|' + it.sub; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 6);
  }

  function render(q, remote, loading) {
    remote = remote || { places: [], addrs: [] };
    const local = presetItems(q).slice(0, 3);
    const far = remote.places.filter((r) => !local.some((l) => Math.abs(l.lat - r.lat) < 0.05 && Math.abs(l.lon - r.lon) < 0.05));
    // An address-looking query (digits, commas, road words) lists addresses before towns
    const addrFirst = /\d|,|\b(road|rd|street|st|lane|marg|nagar|colony|sector|block|near|opp)\b/i.test(q);
    const groups = [['Stored climates (instant)', local]].concat(addrFirst
      ? [['Addresses and landmarks', remote.addrs], ['Towns and districts', far]]
      : [['Towns and districts', far], ['Addresses and landmarks', remote.addrs]]);
    items = [];
    let html = '';
    groups.forEach(([title, group]) => {
      if (!group.length) return;
      html += `<li class="ps-group" role="presentation">${title}</li>` + group.map((it) => row(it, items.push(it) - 1, q)).join('');
    });
    active = items.length ? 0 : -1;
    if (!items.length && !loading && q.length >= 2) html = '<li class="ps-empty" role="presentation">No matches. Try a nearby landmark, a PIN code or a larger town, or click the map.</li>';
    list.innerHTML = html;
    setOpen(!!html);
    paintActive();
  }

  function row(it, i, q) {
    return `<li class="ps-item${it.preset ? ' is-preset' : ''}" role="option" id="ps-opt-${i}" data-i="${i}" aria-selected="false">
      <span class="ps-ico">${it.preset ? SNOW : it.address === 'street' ? ROAD : it.address === 'house' ? HOUSE : PIN}</span>
      <span class="ps-txt"><strong>${mark(it.name, q)}</strong><small>${esc(it.sub)}</small></span>
      ${it.preset ? '' : `<span class="ps-tag">${esc(it.tag)}</span>`}
    </li>`;
  }

  function setOpen(on) {
    list.hidden = !on;
    input.setAttribute('aria-expanded', on);
    box.classList.toggle('is-open', on);
  }

  function paintActive(scroll) {
    list.querySelectorAll('.ps-item').forEach((li) => {
      const on = +li.dataset.i === active;
      li.classList.toggle('active', on);
      li.setAttribute('aria-selected', on);
      if (on && scroll) li.scrollIntoView({ block: 'nearest' });
    });
    if (active >= 0) input.setAttribute('aria-activedescendant', 'ps-opt-' + active);
    else input.removeAttribute('aria-activedescendant');
  }

  function fetchPlaces(q) {
    if (cache.has(q)) return Promise.resolve(cache.get(q));
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    const base = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=en&bbox=${INDIA_BBOX}`;
    const get = (url) => fetch(url, { signal: ctrl.signal }).then((r) => r.json()).then((d) => d.features || []);
    box.classList.add('is-loading');
    return Promise.all([
      get(`${base}&limit=12&layer=city&layer=locality&layer=district&layer=county`),
      get(`${base}&limit=15`).catch(() => [])
    ])
      .then(([towns, all]) => { const out = { places: photonItems(towns), addrs: addressItems(all) }; cache.set(q, out); return out; })
      .finally(() => box.classList.remove('is-loading'));
  }

  function update() {
    const q = input.value.trim();
    lastQ = q;
    clearTimeout(timer);
    if (!q) { setOpen(false); return; }
    if (q.length < 2) { render(q, null, false); return; }
    render(q, cache.get(q), !cache.has(q));
    if (cache.has(q)) return;
    timer = setTimeout(() => {
      fetchPlaces(q).then((res) => { if (lastQ === q && document.activeElement === input) render(q, res, false); }).catch(() => {});
    }, 220);
  }

  function pick(it) {
    if (!it) return;
    setOpen(false);
    if (it.preset) {
      input.value = it.name;
      selectMapPreset(it.preset);
      return;
    }
    input.value = `${it.name}, ${it.sub}`;
    setSiteLabel(it.label || `${it.name}, ${it.sub.split(',').pop().trim()}`);
    updateLocationCoords(it.lat, it.lon);
    // A street or building is shown up close on satellite imagery so the plot can be checked
    const zoom = { house: 18, postcode: 14 }[it.address] || SITE_ZOOM;
    if (it.address === 'house' || it.address === 'street') window.setMapLayer && window.setMapLayer('satellite');
    if (typeof leafletMap !== 'undefined' && leafletMap) leafletMap.flyTo([it.lat, it.lon], zoom, { duration: 1.2 });
    document.querySelectorAll('#preset-chips .chip').forEach((c) => c.classList.remove('active'));
  }

  function submit() {
    const q = input.value.trim();
    if (!q) return;
    if (!list.hidden && items[active]) return pick(items[active]);
    const local = presetItems(q);
    if (local.length && local[0].name.toLowerCase() === q.toLowerCase()) return pick(local[0]);
    fetchPlaces(q).then((res) => {
      render(q, res, false);
      if (items[0]) pick(items[0]);
    }).catch(() => { if (local[0]) pick(local[0]); });
  }

  input.addEventListener('input', update);
  input.addEventListener('focus', update);
  input.addEventListener('blur', () => setTimeout(() => setOpen(false), 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) { update(); return; }
      if (!items.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      paintActive(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  });
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => { const li = e.target.closest('.ps-item'); if (li) pick(items[+li.dataset.i]); });
  list.addEventListener('mousemove', (e) => { const li = e.target.closest('.ps-item'); if (li && +li.dataset.i !== active) { active = +li.dataset.i; paintActive(); } });
  if (btn) btn.addEventListener('click', submit);
})();
