"""Refine calibration after the first bisection pass (calibrate.py).

Seeds (from calibrate.log's 600k-round confirmations):
  q_surge 0.10273 -> 95.640% | q_fracture 0.12202 -> 96.740%
  q_echo  0.12904 -> 96.185% | q_eclipse  0.02192 -> 93.664%
Each buy-mode q gets a secant refinement (two large-n points, step to the
root, keep the best point). Base is then calibrated against the fitted
anti-alignment tilt table in generator.BASE_PAY_W via the stratified
estimator (opening spin simulated; natural features enter as an
exact-probability constant from the refined feature means).

Writes calibration.json + CALIBRATION.md.
"""

import json
import os
import time

import generator as G
from calibrate import base_estimate, simulate

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = 0.9630

START = {'surge': 0.10273, 'fracture': 0.12202, 'echo': 0.12904,
         'eclipse': 0.02192}
N_BIG = {'surge': 900_000, 'fracture': 900_000, 'echo': 900_000,
         'eclipse': 2_400_000}


def refine_mode(mode, params):
    knob = 'q_' + mode
    cost = G.MODE_COST[mode]
    target_cents = TARGET * 100 * cost
    n = N_BIG[mode]
    pts = []

    def ev(q, seed0):
        pp = dict(params)
        pp[knob] = q
        mean, se = simulate(mode, pp, n, seed0=seed0)
        pts.append((q, mean))
        print(f'  {mode} q={q:.5f}: RTP {mean/(100*cost)*100:.3f}% '
              f'± {se/(100*cost)*100:.3f}pp', flush=True)
        return mean

    q0 = START[mode]
    m0 = ev(q0, 31_000)
    if abs(m0 - target_cents) > 0.0025 * 100 * cost:
        m1 = ev(q0 * 1.07, 32_000)
        (qa, ma), (qb, mb) = pts[0], pts[1]
        slope = (mb - ma) / (qb - qa)
        q_new = qa + (target_cents - ma) / slope
        q_new = min(max(q_new, 0.002), 0.45)  # keep inside sane range
        if all(abs(q_new - q) > 1e-6 for q, _ in pts):
            ev(q_new, 33_000)
    q_best, m_best = min(pts, key=lambda p: abs(p[1] - target_cents))
    params[knob] = q_best
    return {'knob': knob, 'value': q_best, 'mc_mean_cents': m_best,
            'mc_rtp': m_best / (100 * cost), 'n': n}


def main():
    t0 = time.time()
    params = dict(G.DEFAULT_PARAMS)
    report = {}
    for mode in ['surge', 'fracture', 'echo', 'eclipse']:
        print(f'== refine {mode}', flush=True)
        report[mode] = refine_mode(mode, params)

    p_trig = {4: G.CORE_K_TABLE[4], 5: G.CORE_K_TABLE[5],
              6: G.CORE_K_TABLE[6]}
    feat_of = {4: 'surge', 5: 'echo', 6: 'eclipse'}
    feature_const = sum(p_trig[k] * report[feat_of[k]]['mc_mean_cents']
                         for k in (4, 5, 6))
    print(f'== base: feature constant {feature_const:.2f} cents', flush=True)
    target_cents = TARGET * 100

    def ev_scale(s, n, seed0):
        pp = dict(params)
        pp['q_base_scale'] = s
        mean, se = base_estimate(pp, feature_const, n, seed0=seed0)
        print(f'  base scale={s:.4f}: RTP {mean:.3f}% ± {se:.3f}pp',
              flush=True)
        return mean

    lo, hi = 0.02, 0.9
    f_lo = ev_scale(lo, 600_000, 61_000) - target_cents
    f_hi = ev_scale(hi, 600_000, 62_000) - target_cents
    assert f_lo < 0 < f_hi, f'base bracket fails: {f_lo} {f_hi}'
    best = None
    for i in range(7):
        mid = (lo + hi) / 2
        f = ev_scale(mid, 600_000, 63_000 + i) - target_cents
        if best is None or abs(f) < abs(best[1]):
            best = (mid, f)
        if f < 0:
            lo = mid
        else:
            hi = mid
    s_best = best[0]
    params['q_base_scale'] = s_best
    pp = dict(params)
    mean, se = base_estimate(pp, feature_const, 3_000_000, seed0=71_000)
    report['base'] = {'knob': 'q_base_scale', 'value': s_best,
                      'mc_mean_cents': mean, 'mc_se_cents': se,
                      'mc_rtp': mean / 100, 'n': 3_000_000,
                      'feature_const_cents': feature_const}
    print(f'  -> q_base_scale = {s_best:.5f}; stratified RTP '
          f'{mean:.3f}% ± {se:.3f}pp', flush=True)

    out = {'target_rtp': TARGET, 'params': params, 'report': report}
    with open(os.path.join(HERE, 'calibration.json'), 'w') as f:
        json.dump(out, f, indent=2)

    lines = ['# Ruthless Eclipse v2 — Calibration', '',
             'Target: **96.30% RTP** per mode. Method: Monte-Carlo knob '
             'tuning (bisection + secant refinement, large-n '
             'confirmations below); the produced catalogs are then '
             'centred exactly by the documented per-mode payout-scale '
             'pass in produce.py (factors recorded in '
             'math_v2/VERIFICATION.md).', '',
             '| mode | knob | value | MC RTP | MC n |',
             '|------|------|-------|--------|------|']
    for mode in ['base', 'surge', 'fracture', 'echo', 'eclipse']:
        r = report[mode]
        lines.append(f"| {mode} | {r['knob']} | {r['value']:.5f} | "
                     f"{r['mc_rtp']*100:.3f}% | {r['n']:,} |")
    lines += ['',
              '## Why the base draw has anti-alignment tilts',
              '',
              "Claude's original reached 96.00% through solved lookup "
              'weights on a hot raw game: his opening spins average '
              '498.9 cents unweighted, and even with NO wilds the '
              'natural ways at this paytable are worth ~113 cents '
              '(measured identically in his catalog and in this '
              'generator: 113.8 vs 112.8). A unit-weight catalog '
              'therefore cannot reach 96.30% by wild-activation tuning '
              'alone. The v2 base draw adds per-reel tilts (the '
              'sanctioned secondary knob): reels 2-5 each lean 45% on '
              'a distinct low/mid symbol (rune, moon, comet, chalice; '
              'off-symbols 11%), breaking cross-reel run alignment. '
              'No-wild opening EV drops to ~60 cents, and '
              'q_base_scale ~0.3 restores the wild/reaction '
              'contribution. Consequence vs Claude\'s effective '
              '(weighted) game: base-game wild frequency is lower '
              '(activation ~1.7-2.7% per reel vs his effective '
              '5.3-8.3%); cores, reactions, features, paytable, '
              'costs and spin counts are unchanged. Free-spin draws '
              'keep the measured near-uniform tilts — the buy modes '
              'calibrate cleanly on q alone.',
              '',
              'Fixed (not tuned): paytable, core count table, wild '
              'count distribution, row weights, FS symbol tilts, mode '
              'costs, feature spin counts.',
              '',
              f"Base estimate is stratified: opening spin simulated "
              f"directly; natural features enter as an "
              f"exact-probability constant of {feature_const:.2f} "
              f"cents/round built from the calibrated feature means "
              f"(cap interaction between a huge opening win and its "
              f"feature is second-order and neglected).",
              '',
              f'Refinement wall time: {time.time()-t0:.0f}s.']
    with open(os.path.join(HERE, 'CALIBRATION.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'done in {time.time()-t0:.0f}s', flush=True)


if __name__ == '__main__':
    main()
