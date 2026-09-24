"""
Independent check of the ThermaBuild browser engine against the ISO 13790:2008 Annex C
hourly procedure (the reference 5R1C solution, Crank-Nicolson on the mass node).

The browser engine (demo/js/engine) is run through Node for one zone with no Trombe wall.
Its hourly boundary temperatures and heat gains are exported, then this script recomputes the
zone with the ISO closed-form equations, written here from the standard, with no shared code.
Differences come only from the time integration (the engine uses implicit Euler and gives the
air a small heat capacity for furniture) and should stay small.

Run: python3 scripts/check_engine_parity.py
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEMO = os.path.join(HERE, "..", "demo")

JS = r"""
const D = process.argv[1];
['data/climate.js','js/engine/materials.js','js/engine/climate.js','js/engine/thermal.js','js/engine/design.js'].forEach(f => require(D + '/' + f));
const cases = [];
for (const [site, v] of [
  ['leh',   { wall: 'mud_brick', ins: 0.1, roof: 'mud_poplar_ins', floor: 'earth_ins', glazing: 'double_lowe', wwrS: 0.35, trombe: false, ach: 0.6, shutters: false, aspect: 1.6 }],
  ['dras',  { wall: 'rammed_earth', ins: 0.05, roof: 'rcc_ins', floor: 'earth_ins', glazing: 'triple', wwrS: 0.25, trombe: false, ach: 0.8, shutters: false, aspect: 1.2 }],
  ['leh',   { wall: 'conc_block', ins: 0, roof: 'rcc_bare', floor: 'concrete', glazing: 'single', wwrS: 0.15, trombe: false, ach: 1.5, shutters: false, aspect: 1.2 }],
  ['chennai', { wall: 'cavity_brick', ins: 0, roof: 'cool_roof', floor: 'concrete', glazing: 'lowe_sc', wwrS: 0.15, trombe: false, ach: 3, shutters: false, aspect: 1.3 }],
]) {
  const wx = TB.climate.weather({ site, month: site === 'chennai' ? 4 : 0, days: 10, dt: 3600 });
  const sp = TB.design.spec(v, { area: 90, type: 'home', single: true });
  const steps = [];
  const r = TB.thermal.simulate(sp, wx, { reportDays: 10, trace: (i, t) => steps.push(t) });
  const M = r.model, o = M.nodeOf[0];
  const em = M.bnd.filter(b => b.node === o.m);
  const bt = (b, i) => {
    const te = wx.T[i], tsk = wx.Tsky[i];
    if (b.type === 'floor') return wx.tGround;
    const I = b.type === 'roof' ? wx.I[4][i] : wx.I[TB.thermal.FAC.indexOf(b.f)][i];
    return te + (b.alpha * I - b.Fsky * 4.5 * (te - tsk)) / 25;
  };
  const K = (a, b) => -M.K[a * M.n + b];
  cases.push({
    site, v,
    Hve: M.Hve[0], Htrw: M.Hw[0], Htris: K(o.air, o.s), Htrms: K(o.s, o.m),
    Htrem: em.reduce((s, b) => s + b.H, 0), Cm: M.C[o.m], Cair: M.C[o.air],
    te: Array.from(wx.T), teq: Array.from({ length: wx.N }, (_, i) => em.reduce((s, b) => s + b.H * bt(b, i), 0) / em.reduce((s, b) => s + b.H, 0)),
    g: steps.map(s => s.g[0]), air: steps.map(s => s.x[o.air]), m: steps.map(s => s.x[o.m]),
    x0: [steps[0].x[o.air], steps[0].x[o.s], steps[0].x[o.m]],
  });
}
process.stdout.write(JSON.stringify(cases));
"""


def iso_13790(c):
    """ISO 13790:2008 Annex C.3, equations C.1 to C.11 (free-running, θsup = θe)."""
    Hve, Hw, His, Hms, Hem, Cm = c["Hve"], c["Htrw"], c["Htris"], c["Htrms"], c["Htrem"], c["Cm"]
    H1 = 1 / (1 / Hve + 1 / His)
    H2 = H1 + Hw
    H3 = 1 / (1 / H2 + 1 / Hms)
    thm_prev = c["m"][0]  # start from the engine's mass temperature after its first hour
    air = []
    for i, (te, teq, (pia, pst, pm)) in enumerate(zip(c["te"], c["teq"], c["g"])):
        if i == 0:
            air.append(c["air"][0])
            continue
        # window and ventilation boundaries see θe; opaque elements see their sol-air temperature teq
        pmtot = pm + Hem * teq + H3 * (pst + Hw * te + H1 * (pia / Hve + te)) / H2
        thm = (thm_prev * (Cm / 3600 - 0.5 * (H3 + Hem)) + pmtot) / (Cm / 3600 + 0.5 * (H3 + Hem))
        thm_avg = (thm + thm_prev) / 2
        ths = (Hms * thm_avg + pst + Hw * te + H1 * (te + pia / Hve)) / (Hms + Hw + H1)
        tha = (His * ths + Hve * te + pia) / (His + Hve)
        air.append(tha)
        thm_prev = thm
    return air


def main():
    out = subprocess.run(["node", "-e", JS, os.path.abspath(DEMO)], capture_output=True, text=True, check=True).stdout
    worst = 0.0
    ok = True
    results = []
    for c in json.loads(out):
        iso = iso_13790(c)
        last = slice(len(iso) - 72, len(iso))  # compare the last three days, after warm-up
        diffs = [abs(a - b) for a, b in zip(iso[last], c["air"][last])]
        mean_iso = sum(iso[last]) / 72
        mean_js = sum(c["air"][last]) / 72
        d = max(diffs)
        worst = max(worst, d)
        passed = d < 1.0 and abs(mean_iso - mean_js) < 0.5
        ok &= passed
        results.append({"site": c["site"], "wall": c["v"]["wall"], "max_diff_K": round(d, 3), "mean_engine": round(mean_js, 2), "mean_iso": round(mean_iso, 2)})
        print(f"{c['site']:8s} {c['v']['wall']:13s} max |Δθair| {d:5.2f} K   mean engine {mean_js:6.2f} °C  ISO {mean_iso:6.2f} °C  {'PASS' if passed else 'FAIL'}")
    print(f"worst hourly difference {worst:.2f} K  ->  {'PASS' if ok else 'FAIL'}")
    with open(os.path.join(DEMO, "data", "parity.js"), "w") as f:
        f.write("// Written by scripts/check_engine_parity.py\n")
        f.write("window.TB_PARITY = " + json.dumps({"worst": round(worst, 3), "cases": len(results), "passed": ok, "rows": results}) + ";\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
