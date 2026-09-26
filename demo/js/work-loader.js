/* Work loaders: a card over the result area that ticks through what the engine is doing
   (plan zoning, 3D build, simulation) before the result is revealed. A loader only replays
   when the inputs it depends on have changed, so moving back and forth between steps is instant. */
(function () {
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lastSig = {};
  let entering = false, modelLoad = null;

  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  /** Show a loader over `host`. Resolves when the stages have played and `work` (optional promise) has settled. */
  function run(host, opts, work) {
    if (!host || host.querySelector(':scope > .work-veil')) return Promise.resolve();
    const steps = opts.steps || [];
    const total = reduceMotion ? 500 : (opts.ms || 2200);
    const veil = document.createElement('div');
    veil.className = 'work-veil' + (opts.dark ? ' is-dark' : '') + (opts.sticky ? ' is-sticky' : '');
    veil.setAttribute('role', 'status');
    veil.setAttribute('aria-live', 'polite');
    veil.innerHTML = `<div class="work-card">
        <div class="work-top"><span class="work-orb" aria-hidden="true"><i></i></span>
          <div><p class="work-title">${opts.title}</p><p class="work-sub" data-sub>${steps[0] || ''}</p></div>
          <span class="work-pct" data-pct>0%</span></div>
        <div class="work-bar"><span data-bar></span></div>
        <ol class="work-steps">${steps.map((s) => `<li><span class="work-dot">${TICK}</span>${s}</li>`).join('')}</ol>
      </div>`;
    host.classList.add('has-veil');
    host.appendChild(veil);
    const items = veil.querySelectorAll('.work-steps li'), bar = veil.querySelector('[data-bar]'), pct = veil.querySelector('[data-pct]'), sub = veil.querySelector('[data-sub]');

    let workDone = !work;
    if (work) Promise.resolve(work).catch(() => {}).then(() => { workDone = true; });

    return new Promise((resolve) => {
      const t0 = performance.now();
      let shown = -1;
      (function frame(now) {
        if (!veil.isConnected) return resolve();
        // Eased progress over the stage time; holds at 96% until the real work has finished
        let p = Math.min(1, (now - t0) / total);
        p = 1 - Math.pow(1 - p, 1.4);
        if (!workDone) p = Math.min(p, 0.96);
        const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
        if (idx !== shown) {
          items.forEach((li, i) => { li.classList.toggle('done', i < idx); li.classList.toggle('now', i === idx); });
          if (sub && steps[idx]) sub.textContent = steps[idx];
          shown = idx;
        }
        bar.style.width = `${Math.round(p * 100)}%`;
        pct.textContent = `${Math.round(p * 100)}%`;
        if (p >= 1) {
          items.forEach((li) => { li.classList.remove('now'); li.classList.add('done'); });
          sub.textContent = opts.done || 'Done';
          veil.classList.add('is-out');
          setTimeout(() => { veil.remove(); host.classList.remove('has-veil'); resolve(); }, reduceMotion ? 0 : 420);
          return;
        }
        requestAnimationFrame(frame);
      })(t0);
    });
  }

  // Only replay when what the result depends on has changed
  function changed(key, sig) {
    if (lastSig[key] === sig) return false;
    lastSig[key] = sig;
    return true;
  }
  const S = () => ThermaState;
  const siteSig = () => [S().lat, S().lon, S().city].join();
  const homeSig = () => [siteSig(), S().bhk, S().areaSqFt, S().widthM, S().lengthM, S().facing, window.activePlanIndex, S().planLayout ? S().planLayout.fileName + S().planLayout.zones?.length : ''].join('|');
  const animalSig = () => [siteSig(), S().animalSpecies, S().animalHerdCount, S().animalOrientation, S().animalRoof, S().animalFloor].join('|');
  const placeName = () => ($('climate-card-title')?.textContent || 'your site').trim();

  const PLAN = () => ({
    title: 'Generating your floor plan',
    steps: [`Reading the climate and sun path for ${placeName()}`, 'Zoning rooms to the sun: living south, stores north', 'Sizing south glazing and thermal mass', 'Checking Vastu, circulation and room sizes'],
    done: 'Plan ready', ms: 2300
  });
  const MODEL = () => ({
    title: 'Building your 3D model',
    steps: ['Extruding walls from the plan', 'Adding roof, glazing and the Trombe wall', `Placing the sun for latitude ${Number(S().lat).toFixed(1)}°`, 'Painting surface temperatures'],
    done: 'Model ready', ms: 2400, dark: true
  });
  const REPORT = () => ({
    title: 'Simulating your home',
    steps: [`Loading NASA POWER climate for ${placeName()}`, 'Running the hour-by-hour heat balance, three nights', 'Comparing with an ordinary build', 'Working out dawn temperatures room by room', 'Writing your report'],
    done: 'Report ready', ms: 3000, sticky: true
  });

  function onStep(n) {
    const f = S().activeFlow;
    if (f === 1 && n === 3 && changed('plan', homeSig())) run(document.querySelector('#flow-step-3 .plan-view'), PLAN());
    if (((f === 1 && n === 4) || (f === 2 && n === 3) || (f === 3 && n === 4)) && changed('3d', f + homeSig())) {
      // init3DViewer runs 100 ms after the panel opens; the bar also waits for that model load
      modelLoad = null;
      run(document.querySelector('#flow-step-4 .stage'), MODEL(), new Promise((r) => setTimeout(() => r(modelLoad), 160)));
    }
    if (((f === 1 && n === 5) || (f === 2 && n === 4) || (f === 3 && n === 5)) && changed('report', f + homeSig() + [S().wallMat, S().roofMat, S().glazingMat].join())) run($('flow-step-5'), REPORT());
    if (f === 3 && n === 3 && changed('retrofit', homeSig())) {
      run($('flow3-step-2'), { title: 'Testing upgrades on your home', steps: ['Measuring heat loss through walls, roof and windows', 'Trying each upgrade one at a time', 'Ranking upgrades by payback'], done: 'Upgrades ranked', ms: 2200, sticky: true });
    }
    if (f === 4 && n === 3 && changed('aplan', animalSig())) {
      run(document.querySelector('#animal-flow-step-3 .plan-view'), { title: 'Laying out the shelter', steps: ['Turning the ridge to the prevailing wind', `Sizing stalls for ${S().animalHerdCount} animals`, 'Placing vents and south glazing'], done: 'Layout ready', ms: 2100 });
    }
    if (f === 4 && n === 4 && changed('a3d', animalSig())) {
      run(document.querySelector('#animal-flow-step-4 .stage'), { title: 'Building the shelter in 3D', steps: ['Raising walls and the ridge roof', 'Opening vents low and at the ridge', 'Tracing airflow through the shelter'], done: 'Model ready', ms: 2300, dark: true });
    }
    if (f === 4 && n === 5 && changed('areport', animalSig())) {
      run($('animal-flow-step-5'), { title: 'Estimating heat stress', steps: [`Loading climate for ${placeName()}`, 'Working out indoor temperature and humidity', 'Scoring the temperature-humidity index (THI)', 'Writing your report'], done: 'Report ready', ms: 2600, sticky: true });
    }
  }

  function wire() {
    const _go = window.goToStep;
    window.goToStep = function (n) {
      entering = true;
      try { _go(n); } finally { entering = false; }
      if (ThermaState.currentStep === n) onStep(n);
    };
    const _init3d = window.init3DViewer;
    if (_init3d) window.init3DViewer = function () { modelLoad = _init3d.apply(this, arguments); return modelLoad; };

    // Picking another plan re-runs a short version of the plan loader
    const planSwap = (host, title) => run(host, { title, steps: ['Re-zoning rooms to the sun', 'Updating glazing and wall areas'], done: 'Plan updated', ms: 1100 });
    const _sel = window.selectArchitecturalPlan;
    if (_sel) window.selectArchitecturalPlan = function (i) { const r = _sel.apply(this, arguments); if (!entering && ThermaState.currentStep === 3 && ThermaState.activeFlow === 1) { lastSig.plan = homeSig(); planSwap(document.querySelector('#flow-step-3 .plan-view'), 'Switching floor plan'); } return r; };
    const _asel = window.selectAnimalPlan;
    if (_asel) window.selectAnimalPlan = function (i) { const r = _asel.apply(this, arguments); if (!entering && ThermaState.currentStep === 3 && ThermaState.activeFlow === 4) planSwap(document.querySelector('#animal-flow-step-3 .plan-view'), 'Switching shelter plan'); return r; };

    // Flow 2: reading an uploaded or sample drawing
    const readPlan = () => run(document.querySelector('#flow2-step-1 .plan-view'), { title: 'Reading your drawing', steps: ['Parsing layers, walls and openings', 'Detecting rooms', 'Measuring room areas and orientation'], done: 'Plan read', ms: 2000 });
    $('f2-upload-input')?.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f && /\.dxf$/i.test(f.name)) readPlan(); });
    $('f2-sample')?.addEventListener('click', readPlan);
    $('trace-done')?.addEventListener('click', readPlan);
  }

  window.TBLoader = { run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
