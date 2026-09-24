/* ThermaBuild design search, run off the main thread so the page stays responsive. */
/* global importScripts, TB */
importScripts('../../data/climate.js', 'materials.js', 'climate.js', 'thermal.js', 'design.js', 'safety.js', 'optimise.js');

self.onmessage = (e) => {
  const { id, ctx, extraSite } = e.data;
  try {
    if (extraSite) self.TB_CLIMATE.sites[extraSite.key] = extraSite.data;
    let last = 0;
    const result = TB.optimise.search(ctx, (done, total) => {
      const now = Date.now();
      if (now - last > 80 || done === total) { last = now; self.postMessage({ id, progress: done / total }); }
    });
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
