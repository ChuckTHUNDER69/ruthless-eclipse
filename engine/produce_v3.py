"""Produce the Ruthless Eclipse v3 raw catalogs in ../math_v3/.

Math v3 is "Claude's way" (Keith, 2026-11-08): generate at Claude's
measured densities — base on the MEASURED pay table (no anti-alignment
tilts), q_base_scale 1.0, free-spin wild activation 0.22 for EVERY
feature including eclipse — then centre RTP with solved lookup weights
(solve_weights.py), the same method Claude's original used (his lookups
carry exponential-tilt weights: ESS 42-63%, ranges spanning ~7 orders
of magnitude). No payout scaling: book amounts stay the evaluator's
true amounts and payoutMultiplier is written as INTEGER cents.

Outputs per mode: books_<mode>.jsonl.zst + stats_<mode>.csv sidecar
(id, payout, firstHit, firstWild, fsSpins, fsWildSpins).
"""

import json
import os
import time
from multiprocessing import Pool

import zstandard as zstd

import generator as G

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'math_v3')
COUNTS = {'base': 300_000, 'surge': 100_000, 'fracture': 100_000,
          'echo': 100_000, 'eclipse': 100_000}
SEED0 = {'base': 991_000, 'surge': 992_000, 'fracture': 993_000,
         'echo': 994_000, 'eclipse': 995_000}
CHUNK = 10_000
PROCS = 4

PARAMS = {'q_base_scale': 1.0, 'q_surge': 0.22, 'q_fracture': 0.22,
          'q_echo': 0.22, 'q_eclipse': 0.053}

# Claude's measured base table — no tilts.
G.BASE_PAY_W = G.BASE_PAY_W_MEASURED

# V3.1 (measured 2026-11-08 from Claude's catalogs, first-spin BEFORE
# boards): his true base wild activation is FLAT ~9%/reel — the
# engine's Q_BASE (5.3-8.3% rising) was fit on a contaminated sample.
# His eclipse free spins draw at q=0.053 (0.49 wilds/spin before the
# stacked transform), not the 0.22 of the other features (2.06/spin).
G.Q_BASE = [0.0, 0.0897, 0.0884, 0.0903, 0.0907, 0.0888]


def book_stats(book):
    spins = [e for e in book['events'] if e['type'] == 'spin']
    first = spins[0]
    first_hit = 1 if first['win'] > 0 else 0
    first_wild = 1 if any(c == 6 for col in first['board']
                          for c in col) else 0
    fs = [e for e in spins[1:]] if len(spins) > 1 else []
    fs_wild = sum(1 for e in fs
                  if any(c == 6 for col in e['board'] for c in col))
    payout = next(e['amount'] for e in book['events']
                  if e['type'] == 'finalWin')
    k = sum(first['cores'])
    trig = k if k >= 4 else 0
    return payout, first_hit, first_wild, len(fs), fs_wild, trig


def generate_mode(mode, n):
    path = os.path.join(OUT, f'books_{mode}.jsonl.zst')
    args = []
    start = 0
    ci = 0
    while start < n:
        m = min(CHUNK, n - start)
        args.append((mode, PARAMS, start, m, SEED0[mode] + ci))
        start += m
        ci += 1
    total = 0
    with open(os.path.join(OUT, f'stats_{mode}.csv'), 'w') as stats, \
            open(path, 'wb') as fh:
        zw = zstd.ZstdCompressor(level=3).stream_writer(fh)
        with Pool(PROCS) as p:
            for books in p.imap(G.gen_chunk, args):
                for b in books:
                    pay, fh_, fw, nfs, fsw, tg = book_stats(b)
                    b['payoutMultiplier'] = pay  # integer cents
                    zw.write((json.dumps(b, separators=(',', ':')) +
                              '\n').encode())
                    stats.write(f"{b['id']},{pay},{fh_},{fw},{nfs},{fsw},{tg}\n")
                    total += pay
        zw.close()
    return total


def gen_forced_triggers(n, start_id, seed):
    """Extra base rounds with K in {4,5,6} forced, in the K-table
    tail's own proportions — Claude's base catalog is likewise
    enriched (0.67% trigger books vs the table's 0.04%), giving the
    weight solver resolution on the feature tail."""
    import random as _random
    rng = _random.Random(seed)
    orig = G.draw_cores
    books = []
    total = 0
    try:
        for i in range(n):
            k = rng.choices((4, 5, 6),
                            weights=(0.93024, 0.06957, 0.00025))[0]
            def forced(r, k=k):
                cores = [0] * 6
                for reel in r.sample(range(6), k):
                    cores[reel] = 1
                return cores, k
            G.draw_cores = forced
            events, paid = G.play_round(rng, PARAMS, 'base',
                                        want_events=True)
            G.draw_cores = orig
            b = {'id': start_id + i, 'events': events,
                 'payoutMultiplier': paid}
            books.append(b)
            total += paid
    finally:
        G.draw_cores = orig
    return books, total


def main():
    import sys
    only = sys.argv[1:] or None
    t0 = time.time()
    os.makedirs(OUT, exist_ok=True)
    print('params:', PARAMS, flush=True)
    prov = {'params': PARAMS, 'counts': COUNTS, 'seed0': SEED0,
            'method': 'claude-density generation + solved weights'}
    for mode, n in COUNTS.items():
        if only and mode not in only:
            continue
        total = generate_mode(mode, n)
        cost = G.MODE_COST[mode]
        rtp = total / (n * 100 * cost)
        prov.setdefault('raw_rtp', {})[mode] = rtp
        print(f'{mode}: generated {n:,} books, RAW RTP {rtp*100:.3f}%',
              flush=True)
    if not only or 'base' in only:
        # append forced-trigger enrichment to the base catalog
        books, tot = gen_forced_triggers(3000, COUNTS['base'], 996_000)
        path = os.path.join(OUT, 'books_base.jsonl.zst')
        with open(path, 'ab') as fh:
            zw = zstd.ZstdCompressor(level=3).stream_writer(fh)
            for b in books:
                zw.write((json.dumps(b, separators=(',', ':')) +
                          '\n').encode())
            zw.close()
        with open(os.path.join(OUT, 'stats_base.csv'), 'a') as stats:
            for b in books:
                pay, fh_, fw, nfs, fsw, tg = book_stats(b)
                stats.write(f"{b['id']},{pay},{fh_},{fw},{nfs},{fsw},{tg}\n")
        print(f'base: +3,000 forced-trigger books (raw total {tot:,})',
              flush=True)
    with open(os.path.join(OUT, 'production_v3.json'), 'w') as fh:
        json.dump(prov, fh, indent=2)
    print(f'done in {time.time()-t0:.0f}s', flush=True)


if __name__ == '__main__':
    main()
