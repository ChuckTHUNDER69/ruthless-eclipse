"""Calibrate the Eclipse generator knobs to 96.30% RTP per mode.

Buy modes: bisect the feature's wild-activation q (monotone in RTP).
Base: bisect q_base_scale on a stratified estimator — the opening spin is
simulated directly (all core counts; it pays unmodified on a trigger), and
the rare natural features enter as an exact-probability constant built from
the calibrated buy-mode feature means (identical FS generators). This
removes the 1-in-2,466 trigger variance from the base estimate.

Writes calibration.json (consumed by produce.py) and CALIBRATION.md.
"""

import json
import math
import os
import random
import time
from multiprocessing import Pool

import generator as G
from evaluator import apply_modifier, cap_adjusted_win, evaluate_ways

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = 0.9630
PROCS = 4


def simulate(mode, params, n, seed0=1000):
    """Pooled MC of full rounds. Returns (mean_cents, se_cents)."""
    per = n // PROCS
    args = [(mode, params, per, seed0 + 7919 * i) for i in range(PROCS)]
    with Pool(PROCS) as p:
        res = p.map(G.sim_chunk, args)
    n_tot = sum(r[0] for r in res)
    tot = sum(r[1] for r in res)
    tot2 = sum(r[2] for r in res)
    mean = tot / n_tot
    var = tot2 / n_tot - mean * mean
    se = math.sqrt(max(var, 0.0) / n_tot)
    return mean, se


def base_open_chunk(args):
    """Opening-spin-only sim for base: returns (n, sum_paid, sum_sq)."""
    params, n, seed = args
    rng = random.Random(seed)
    q_list = G._q_list_base(params)
    tot = 0
    tot2 = 0
    for _ in range(n):
        cores, k = G.draw_cores(rng)
        before = G.draw_board(rng, G.BASE_PAY_W, q_list)
        board = apply_modifier(before, cores, G.BASE_MODIFIER.get(k))
        _, raw = evaluate_ways(board)
        paid = cap_adjusted_win(raw, 0)
        tot += paid
        tot2 += paid * paid
    return n, tot, tot2


def base_estimate(params, feature_const, n, seed0=555):
    per = n // PROCS
    args = [(params, per, seed0 + 104729 * i) for i in range(PROCS)]
    with Pool(PROCS) as p:
        res = p.map(base_open_chunk, args)
    n_tot = sum(r[0] for r in res)
    tot = sum(r[1] for r in res)
    tot2 = sum(r[2] for r in res)
    mean = tot / n_tot + feature_const
    var = tot2 / n_tot - (tot / n_tot) ** 2
    se = math.sqrt(max(var, 0.0) / n_tot)
    return mean, se


def bisect(eval_fn, lo, hi, target_cents, iters=9, label=''):
    """eval_fn(x) -> mean_cents. Assumes increasing in x."""
    f_lo = eval_fn(lo) - target_cents
    f_hi = eval_fn(hi) - target_cents
    print(f'  {label} bracket: f({lo:g})={f_lo:+.1f}  f({hi:g})={f_hi:+.1f}',
          flush=True)
    assert f_lo < 0 < f_hi, f'bracket does not straddle target: {f_lo} {f_hi}'
    best = None
    for _ in range(iters):
        mid = (lo + hi) / 2
        f = eval_fn(mid) - target_cents
        print(f'  {label} x={mid:.5f}  err={f:+.1f} cents', flush=True)
        if best is None or abs(f) < abs(best[1]):
            best = (mid, f)
        if f < 0:
            lo = mid
        else:
            hi = mid
    return best[0]


def main():
    t0 = time.time()
    params = dict(G.DEFAULT_PARAMS)
    report = {}

    # 1) buy modes first (independent q per feature context)
    for mode in ['surge', 'fracture', 'echo', 'eclipse']:
        knob = 'q_' + mode
        target_cents = TARGET * 100 * G.MODE_COST[mode]
        print(f'== {mode} (cost {G.MODE_COST[mode]}): bisect {knob}', flush=True)

        def eval_q(q, mode=mode, knob=knob):
            pp = dict(params)
            pp[knob] = q
            mean, _ = simulate(mode, pp, 120_000)
            return mean

        hi = 0.12 if mode == 'eclipse' else 0.45
        q = bisect(eval_q, 0.001, hi, target_cents, iters=8, label=mode)
        params[knob] = q
        mean, se = simulate(mode, params, 600_000, seed0=4242)
        rtp = mean / (100 * G.MODE_COST[mode])
        report[mode] = {'knob': knob, 'value': q, 'mc_mean_cents': mean,
                        'mc_se_cents': se, 'mc_rtp': rtp, 'n': 600_000}
        print(f'  -> {knob} = {q:.5f}; confirmation RTP '
              f'{rtp*100:.3f}% ± {se/(100*G.MODE_COST[mode])*100:.3f}pp',
              flush=True)

    # 2) base: feature constant from calibrated feature means
    p_trig = {4: G.CORE_K_TABLE[4], 5: G.CORE_K_TABLE[5],
              6: G.CORE_K_TABLE[6]}
    feat_of = {4: 'surge', 5: 'echo', 6: 'eclipse'}
    feature_const = sum(p_trig[k] * report[feat_of[k]]['mc_mean_cents']
                         for k in (4, 5, 6))
    print(f'== base: natural-feature constant = {feature_const:.2f} cents '
          f'({feature_const:.3f}% RTP)', flush=True)
    target_cents = TARGET * 100

    def eval_scale(s):
        pp = dict(params)
        pp['q_base_scale'] = s
        mean, _ = base_estimate(pp, feature_const, 400_000)
        return mean

    s = bisect(eval_scale, 0.01, 1.0, target_cents, iters=8, label='base')
    params['q_base_scale'] = s
    mean, se = base_estimate(params, feature_const, 2_000_000, seed0=999)
    rtp = mean / 100
    report['base'] = {'knob': 'q_base_scale', 'value': s,
                      'mc_mean_cents': mean, 'mc_se_cents': se,
                      'mc_rtp': rtp, 'n': 2_000_000,
                      'feature_const_cents': feature_const}
    print(f'  -> q_base_scale = {s:.5f}; stratified RTP {rtp*100:.3f}% '
          f'± {se:.3f}pp', flush=True)

    out = {'target_rtp': TARGET, 'params': params, 'report': report}
    with open(os.path.join(HERE, 'calibration.json'), 'w') as f:
        json.dump(out, f, indent=2)

    lines = ['# Ruthless Eclipse v2 — Calibration', '',
             f'Target: **96.30% RTP** per mode (Monte-Carlo knob tuning; '
             f'the produced catalogs are then centred exactly by the '
             f'documented payout-scale pass in produce.py — see '
             f'math_v2/VERIFICATION.md).', '',
             '| mode | knob | value | MC RTP | MC n |',
             '|------|------|-------|--------|------|']
    for mode in ['base', 'surge', 'fracture', 'echo', 'eclipse']:
        r = report[mode]
        lines.append(f"| {mode} | {r['knob']} | {r['value']:.5f} | "
                     f"{r['mc_rtp']*100:.3f}% | {r['n']:,} |")
    lines += ['',
              'Fixed (not tuned): paytable, core count table, per-reel base '
              'activation ratios, wild count distribution, row weights, '
              'symbol tilts, mode costs, feature spin counts.',
              '',
              f"Base estimate is stratified: opening spin simulated "
              f"directly; natural features enter as an exact-probability "
              f"constant of {feature_const:.2f} cents/round built from the "
              f"calibrated feature means (cap interaction between a huge "
              f"opening win and its feature is second-order and neglected).",
              '',
              f'Calibration wall time: {time.time()-t0:.0f}s.']
    with open(os.path.join(HERE, 'CALIBRATION.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'done in {time.time()-t0:.0f}s -> calibration.json, CALIBRATION.md',
          flush=True)


if __name__ == '__main__':
    main()
