"""Solve math_v3 lookup weights — Claude's method.

Per mode: exponential tilt over the raw catalog from produce_v3.py,
solved so the weighted mean payout is the target RTP (96.30%).
Buy modes use a one-parameter tilt w = exp(-lambda * p / costCents).

BASE is stratified like Claude's own catalog: his base pool is
enriched with forced-trigger rounds (0.67% of books vs the K-table's
true 0.04% trigger rate), so base uses a TWO-parameter tilt
w = exp(-lambda1 * p / costCents - lambda2 * 1[trigger]) solved on
two equations: weighted mean == target AND weighted trigger mass ==
the K-table tail (0.04054%). Weights are quantized at ~1e15 total
(Claude's lookups live at the same scale) and repaired with paired
shifts inside each stratum until the exact integer-weight RTP is
within 0.05pp of target.

Reports weighted outcome stats vs Claude's measured targets and the
weights' effective sample size. Outputs ../math_v3/publish_files/
with books re-streamed as single zstd frames.
"""

import csv
import io
import json
import math
import os

import zstandard as zstd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', 'math_v3')
PUB = os.path.join(ROOT, 'publish_files')
TARGET = 0.9630
TOTAL_W = 10**15
TRIG_TARGET = 0.0003771 + 0.0000282 + 0.0000001  # K-table tail
COST = {'base': 1, 'surge': 75, 'fracture': 100, 'echo': 150,
        'eclipse': 300}

CLAUDE_TARGETS = {
    'base': {'median_pct': 12.0, 'dry_pct': 42.1, 'hit': 57.9,
             'boards_wild': 29.6},
    'surge': {'median_pct': 63.2, 'dry_pct': 0.2},
    'fracture': {'median_pct': 59.2, 'dry_pct': 0.2},
    'echo': {'median_pct': 60.4, 'dry_pct': 0.7},
    'eclipse': {'median_pct': 13.1, 'dry_pct': 33.1},
}


def wmean(pays, ws):
    return sum(p * w for p, w in zip(pays, ws)) / sum(ws)


def solve_lambda(pays, cost_cents, target_mean):
    def mean_at(lam):
        ws = [math.exp(-lam * p / cost_cents) for p in pays]
        return wmean(pays, ws)
    if mean_at(0.0) <= target_mean:
        return 0.0
    lo, hi = 0.0, 1.0
    while mean_at(hi) > target_mean:
        hi *= 2
        if hi > 512:
            raise RuntimeError('tilt cannot reach target')
    for _ in range(70):
        mid = (lo + hi) / 2
        if mean_at(mid) > target_mean:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def solve_base(pays, trigs, cost_cents, target_mean):
    def stats(l1, l2):
        sw = swp = swt = 0.0
        for p, t in zip(pays, trigs):
            w = math.exp(-l1 * p / cost_cents - (l2 if t else 0.0))
            sw += w
            swp += p * w
            if t:
                swt += w
        return swp / sw, swt / sw
    l1 = l2 = 0.0
    for _ in range(10):
        lo, hi = -30.0, 30.0
        for _ in range(44):
            mid = (lo + hi) / 2
            _, tm = stats(l1, mid)
            if tm > TRIG_TARGET:
                lo = mid
            else:
                hi = mid
        l2 = (lo + hi) / 2
        lo, hi = 0.0, 64.0
        for _ in range(54):
            mid = (lo + hi) / 2
            m, _ = stats(mid, l2)
            if m > target_mean:
                lo = mid
            else:
                hi = mid
        l1 = (lo + hi) / 2
    return l1, l2


def quantize(raw_ws):
    scale = TOTAL_W / sum(raw_ws)
    return [max(1, round(w * scale)) for w in raw_ws]


def repair(pays, ws, strata, cost_cents, target_mean):
    """Paired shifts within a stratum (trigger mass preserved) until
    exact RTP is within 0.05pp of target."""
    n = len(pays)
    order = sorted(range(n), key=lambda i: pays[i])
    mid_pay = pays[order[n // 2]]
    for _ in range(4000):
        sw = sum(ws)
        mean = sum(p * w for p, w in zip(pays, ws)) / sw
        err_pp = (mean / cost_cents - TARGET) * 100
        if abs(err_pp) <= 0.05:
            return ws
        # find a same-stratum pair straddling the median
        done = False
        for a in order[::-1]:
            if pays[a] <= mid_pay:
                break
            for b in order:
                if pays[b] >= pays[a]:
                    break
                if strata[a] != strata[b] or ws[a if err_pp > 0 else b] <= 1:
                    continue
                gap = pays[a] - pays[b]
                need = abs(mean - target_mean) * sw / gap
                delta = max(1, int(need))
                hi_i, lo_i = (a, b) if err_pp > 0 else (b, a)
                if ws[hi_i] - delta < 1:
                    continue
                ws[hi_i] -= delta
                ws[lo_i] += delta
                done = True
                break
            if done:
                break
        if not done:
            return ws
    return ws


def weighted_stats(rows, ws, cost_cents):
    pairs = sorted((p, w) for (_, p, *_), w in zip(rows, ws))
    tot = sum(ws)
    acc = 0
    median = pairs[-1][0]
    for p, w in pairs:
        acc += w
        if acc >= tot / 2:
            median = p
            break
    dry = sum(w for (_, p, *_), w in zip(rows, ws)
              if p <= 0.023 * cost_cents) / tot * 100
    hit = sum(w for (_, _, h, *_), w in zip(rows, ws) if h) / tot * 100
    wild = sum(w for (_, _, _, wd, *_), w in zip(rows, ws) if wd) / tot * 100
    ess = tot * tot / sum(w * w for w in ws) / len(ws) * 100
    return median / cost_cents * 100, dry, hit, wild, ess


def restream_books(mode):
    src = os.path.join(ROOT, f'books_{mode}.jsonl.zst')
    dst = os.path.join(PUB, f'books_{mode}.jsonl.zst')
    with open(src, 'rb') as fh, open(dst, 'wb') as out:
        reader = zstd.ZstdDecompressor().stream_reader(fh)
        zw = zstd.ZstdCompressor(level=3).stream_writer(out)
        for line in io.TextIOWrapper(reader, encoding='utf-8'):
            if line.strip():
                zw.write(line.encode())
        zw.close()


def main():
    os.makedirs(PUB, exist_ok=True)
    report = {}
    for mode, cost in COST.items():
        cost_cents = 100 * cost
        target_mean = TARGET * cost_cents
        with open(os.path.join(ROOT, f'stats_{mode}.csv')) as fh:
            rows = []
            for r in csv.reader(fh):
                if not r:
                    continue
                vals = [int(x) for x in r]
                vals += [0] * (7 - len(vals))
                rows.append(tuple(vals))
        ids = [r[0] for r in rows]
        pays = [r[1] for r in rows]
        trigs = [r[6] > 0 for r in rows]
        if mode == 'base':
            l1, l2 = solve_base(pays, trigs, cost_cents, target_mean)
            raw_ws = [math.exp(-l1 * p / cost_cents - (l2 if t else 0.0))
                      for p, t in zip(pays, trigs)]
            lam_desc = f'lambda1={l1:.4f} lambda2={l2:.4f}'
        else:
            lam = solve_lambda(pays, cost_cents, target_mean)
            raw_ws = [math.exp(-lam * p / cost_cents) for p in pays]
            lam_desc = f'lambda={lam:.4f}'
        ws = quantize(raw_ws)
        ws = repair(pays, ws, trigs, cost_cents, target_mean)
        exact_rtp = wmean(pays, ws) / cost_cents
        trig_mass = sum(w for w, t in zip(ws, trigs) if t) / sum(ws)
        med, dry, hit, wild, ess = weighted_stats(rows, ws, cost_cents)
        t = CLAUDE_TARGETS[mode]
        print(f'{mode}: {lam_desc} -> exact RTP {exact_rtp*100:.4f}% | '
              f'median {med:.1f}% (Claude {t["median_pct"]}) dry '
              f'{dry:.1f}% (Claude {t["dry_pct"]}) ESS {ess:.0f}%',
              flush=True)
        if mode == 'base':
            print(f'   base hit {hit:.1f}% (Claude 57.9) boardsWild '
                  f'{wild:.1f}% (Claude 29.6) trigger mass '
                  f'{trig_mass*100:.4f}% (target {TRIG_TARGET*100:.4f}%)',
                  flush=True)
        report[mode] = {'tilt': lam_desc, 'exact_rtp': exact_rtp,
                        'median_pct': med, 'dry_pct': dry, 'ess_pct': ess,
                        'hit': hit, 'boards_wild': wild,
                        'trigger_mass': trig_mass}
        with open(os.path.join(PUB, f'lookUpTable_{mode}_0.csv'),
                  'w') as fh:
            for i, w, p in zip(ids, ws, pays):
                fh.write(f'{i},{w},{p}\n')
        restream_books(mode)
    index = {'modes': [{'name': m, 'cost': c,
                        'events': f'books_{m}.jsonl.zst',
                        'weights': f'lookUpTable_{m}_0.csv'}
                       for m, c in COST.items()]}
    with open(os.path.join(PUB, 'index.json'), 'w') as fh:
        json.dump(index, fh, indent=2)
    with open(os.path.join(ROOT, 'weights_report.json'), 'w') as fh:
        json.dump(report, fh, indent=2)
    print('publish_files written', flush=True)


if __name__ == '__main__':
    main()
