"""Produce the Ruthless Eclipse v2 production catalogs in ../math_v2/.

Generates books with the calibrated generator (fixed seeds, deterministic),
builds unit-weight lookups, then centres each mode's EXACT catalog RTP on
96.30% with a payout-scale pass when needed: every win amount in every spin
is scaled by one per-mode factor (residual cent kept on the largest win
entry so each spin's win list still sums to its rawWin), finalWin is
re-derived and the 20,000x round cap re-applied. All factors are recorded
in production.json and surfaced in VERIFICATION.md.

Outputs per mode: books_<mode>.jsonl.zst, lookUpTable_<mode>.csv
(id,1,payoutCents), plus one index.json for the bundle.
"""

import io
import json
import os
import time
from multiprocessing import Pool

import zstandard as zstd

import generator as G
from evaluator import cap_adjusted_win

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'math_v2')
TARGET = 0.9630
TOL = 0.0005  # 0.05pp
COUNTS = {'base': 300_000, 'surge': 100_000, 'fracture': 100_000,
          'echo': 100_000, 'eclipse': 100_000}
SEED0 = {'base': 881_000, 'surge': 882_000, 'fracture': 883_000,
         'echo': 884_000, 'eclipse': 885_000}
CHUNK = 10_000
PROCS = 4


def book_payout(book):
    return next(e['amount'] for e in book['events'] if e['type'] == 'finalWin')


def generate_mode(mode, params, n):
    """Generate n books, write zst + lookup, return (total_cents, hits, max)."""
    path = os.path.join(OUT, f'books_{mode}.jsonl.zst')
    args = []
    start = 0
    ci = 0
    while start < n:
        m = min(CHUNK, n - start)
        args.append((mode, params, start, m, SEED0[mode] + ci))
        start += m
        ci += 1
    total = 0
    hits = 0
    mx = 0
    with open(os.path.join(OUT, f'lookUpTable_{mode}.csv'), 'w') as lut, \
            open(path, 'wb') as fh:
        zw = zstd.ZstdCompressor(level=3).stream_writer(fh)
        with Pool(PROCS) as p:
            for books in p.imap(G.gen_chunk, args):
                for b in books:
                    pay = book_payout(b)
                    zw.write((json.dumps(b, separators=(',', ':')) +
                              '\n').encode())
                    lut.write(f"{b['id']},1,{pay}\n")
                    total += pay
                    if pay > 0:
                        hits += 1
                    if pay > mx:
                        mx = pay
        zw.close()
    return total, hits, mx


def scale_book(book, f):
    """Scale every win amount by f; re-derive rawWin/win/finalWin with cap."""
    paid = 0
    for e in book['events']:
        if e['type'] != 'spin':
            continue
        if e['wins']:
            scaled = [round(w['amount'] * f) for w in e['wins']]
            diff = round(e['rawWin'] * f) - sum(scaled)
            if diff:
                i = max(range(len(scaled)), key=lambda j: scaled[j])
                scaled[i] += diff
            for w, a in zip(e['wins'], scaled):
                w['amount'] = a
            raw = sum(scaled)
        else:
            raw = 0
        e['rawWin'] = raw
        e['win'] = cap_adjusted_win(raw, paid)
        paid += e['win']
    for e in book['events']:
        if e['type'] == 'finalWin':
            e['amount'] = paid
    book['payoutMultiplier'] = round(paid / 100, 2)
    return paid


def scale_mode(mode, f):
    """Apply one scale pass over a mode's books file; rewrite lookup.
    Returns the mode's new total payout cents."""
    path = os.path.join(OUT, f'books_{mode}.jsonl.zst')
    tmp = path + '.tmp'
    total = 0
    with open(path, 'rb') as fh, open(tmp, 'wb') as out:
        reader = zstd.ZstdDecompressor().stream_reader(fh)
        zw = zstd.ZstdCompressor(level=3).stream_writer(out)
        lut_rows = []
        for line in io.TextIOWrapper(reader, encoding='utf-8'):
            if not line.strip():
                continue
            b = json.loads(line)
            pay = scale_book(b, f)
            zw.write((json.dumps(b, separators=(',', ':')) + '\n').encode())
            lut_rows.append((b['id'], pay))
            total += pay
        zw.close()
    os.replace(tmp, path)
    with open(os.path.join(OUT, f'lookUpTable_{mode}.csv'), 'w') as lut:
        for i, pay in lut_rows:
            lut.write(f'{i},1,{pay}\n')
    return total


def main():
    t0 = time.time()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(HERE, 'calibration.json')) as fh:
        calib = json.load(fh)
    params = calib['params']
    print('params:', params, flush=True)

    prov = {'params': params, 'counts': COUNTS, 'seed0': SEED0,
            'target_rtp': TARGET, 'modes': {}}
    for mode, n in COUNTS.items():
        cost = G.MODE_COST[mode]
        total, hits, mx = generate_mode(mode, params, n)
        rtp = total / (n * 100 * cost)
        print(f'{mode}: generated {n:,} books, exact RTP {rtp*100:.4f}% '
              f'(hits {hits:,}, max {mx:,})', flush=True)
        factors = []
        passes = 0
        while abs(rtp - TARGET) > TOL and passes < 4:
            f = TARGET / rtp
            total = scale_mode(mode, f)
            factors.append(f)
            passes += 1
            rtp = total / (n * 100 * cost)
            print(f'  scale pass {passes}: f={f:.6f} -> exact RTP '
                  f'{rtp*100:.4f}%', flush=True)
        prov['modes'][mode] = {'scale_factors': factors,
                               'final_total_cents': total,
                               'final_rtp': rtp}
    index = {'modes': [{'name': m, 'cost': G.MODE_COST[m],
                        'events': f'books_{m}.jsonl.zst',
                        'weights': f'lookUpTable_{m}.csv'}
                       for m in COUNTS]}
    with open(os.path.join(OUT, 'index.json'), 'w') as fh:
        json.dump(index, fh, indent=2)
    with open(os.path.join(OUT, 'production.json'), 'w') as fh:
        json.dump(prov, fh, indent=2)
    print(f'done in {time.time()-t0:.0f}s', flush=True)


if __name__ == '__main__':
    main()
