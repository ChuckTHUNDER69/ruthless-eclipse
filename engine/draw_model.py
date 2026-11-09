"""Estimate the Ruthless Eclipse draw model from Claude's base catalog.

The catalog is an enumerated/stratified outcome set, NOT a random sample:
book order in the file is meaningless, so every statistic is weighted by the
exact-probability weights from lookUpTable_base.csv (id -> weight).

Measured on the OPENING spin of every base book (the base-game draw):
  * per-reel symbol frequencies (per cell), wild rate per reel
  * symbol frequency by row (uniformity check)
  * core-light probability per reel; lit-core count distribution
  * binomial(6, p) fit for the core count
  * core independence: pairwise joints vs product of marginals
  * core/board correlation: P(lit | wild on same reel), P(lit | symbol
    present on same reel), Pearson r between lit-core count and wild cells
Also compares free-spin `before` boards (draws inside triggered base books)
against the base draw, and the decorative FS core rate.

Usage: python3 draw_model.py
"""

import csv
import io
import json
import math
import os
import sys
from collections import Counter

import zstandard as zstd

HERE = os.path.dirname(os.path.abspath(__file__))
MATH_DIR = os.path.join(HERE, '..', 'math')
WILD = 6
NAMES = ['rune', 'comet', 'moon', 'chalice', 'phoenix', 'crown', 'WILD']


def load_weights():
    w = {}
    with open(os.path.join(MATH_DIR, 'lookUpTable_base.csv')) as f:
        for row in csv.reader(f):
            w[int(row[0])] = int(row[1])
    return w


def stream_books():
    path = os.path.join(MATH_DIR, 'books_base.jsonl.zst')
    with open(path, 'rb') as fh:
        reader = zstd.ZstdDecompressor().stream_reader(fh)
        for line in io.TextIOWrapper(reader, encoding='utf-8'):
            if line.strip():
                yield json.loads(line)


def main():
    weights = load_weights()
    W = 0  # total weight of processed books
    sym_cells = [[0] * 7 for _ in range(6)]     # [reel][symbol] weighted cells
    row_sym = [[0] * 7 for _ in range(4)]       # [row][symbol] weighted cells
    core_lit = [0] * 6
    core_joint = [[0] * 6 for _ in range(6)]
    core_count = Counter()
    lit_and_wild = [0] * 6    # per reel: weight lit & wild present
    wild_present = [0] * 6    # per reel: weight wild present
    lit_and_nowild = [0] * 6
    # pooled reel-slot stats: symbol presence vs lit
    slot_pres = [0] * 6       # reel-slots where symbol s present (s in 0..5)
    slot_pres_lit = [0] * 6
    slot_wild = 0             # reel-slots (reels 2-6) with a wild
    slot_wild_lit = 0
    slot_total_r2_6 = 0
    # pearson: lit-core count k vs wild cell count c
    sk = sc = skk = scc = skc = 0.0
    # FS comparison
    fs_spins = 0
    fs_sym_cells = [[0] * 7 for _ in range(6)]
    fs_core_lit = [0] * 6
    fs_wild_books = [0] * 6

    for book in stream_books():
        w = weights[book['id']]
        spins = [e for e in book['events'] if e['type'] == 'spin']
        if not spins:
            continue
        e = spins[0]
        W += w
        board = e['before']
        cores = e['cores']
        k = sum(cores)
        core_count[k] += w
        wild_cells = 0
        for r in range(6):
            col = board[r]
            wild_cells += col.count(WILD)
            for s in col:
                sym_cells[r][s] += w
            for row, s in enumerate(col):
                row_sym[row][s] += w
            if cores[r]:
                core_lit[r] += w
                for r2 in range(6):
                    if cores[r2]:
                        core_joint[r][r2] += w
            has_wild = WILD in col
            if has_wild:
                wild_present[r] += w
                if cores[r]:
                    lit_and_wild[r] += w
            elif cores[r]:
                lit_and_nowild[r] += w
            for s in range(6):
                if s in col:
                    slot_pres[s] += w
                    if cores[r]:
                        slot_pres_lit[s] += w
            if r >= 1:
                slot_total_r2_6 += w
                if has_wild:
                    slot_wild += w
                    if cores[r]:
                        slot_wild_lit += w
        wf = float(w)
        sk += wf * k; sc += wf * wild_cells
        skk += wf * k * k; scc += wf * wild_cells * wild_cells
        skc += wf * k * wild_cells

        for fe in spins[1:]:
            fs_spins += 1
            fb = fe['before']
            for r in range(6):
                for s in fb[r]:
                    fs_sym_cells[r][s] += 1
                if fe['cores'][r]:
                    fs_core_lit[r] += 1
                if WILD in fb[r]:
                    fs_wild_books[r] += 1

    Wf = float(W)
    print(f'base books processed: total lookup weight = {W:.6g}')
    print()
    print('== per-reel symbol frequency (% of cells, weighted)')
    print('reel   ' + ''.join(f'{n:>9}' for n in NAMES))
    for r in range(6):
        tot = 4.0 * Wf
        print(f'  {r+1}   ' + ''.join(f'{100.0*sym_cells[r][s]/tot:9.3f}' for s in range(7)))
    print()
    print('== symbol frequency by row (% of cells, pooled over reels)')
    for row in range(4):
        tot = 6.0 * Wf
        print(f' row {row+1} ' + ''.join(f'{100.0*row_sym[row][s]/tot:9.3f}' for s in range(7)))
    print()
    print('== core-light probability per reel (weighted)')
    for r in range(6):
        print(f'  reel {r+1}: {core_lit[r]/Wf*100:.4f}%')
    p_hat = sum(core_lit) / (6.0 * Wf)
    print(f'  pooled p = {p_hat:.6f}')
    print()
    print('== lit-core count distribution vs binomial(6, p_hat) (weighted %)')
    print('  k      observed    binomial   ratio')
    for k in range(7):
        obs = core_count[k] / Wf * 100
        exp = math.comb(6, k) * p_hat**k * (1 - p_hat)**(6 - k) * 100
        ratio = (obs / exp) if exp else float('inf')
        print(f'  {k}     {obs:9.5f}   {exp:9.5f}   {ratio:7.3f}')
    print()
    print('== pairwise core joints vs independence (weighted %)')
    worst = 0.0
    for r in range(6):
        for r2 in range(r + 1, 6):
            joint = core_joint[r][r2] / Wf * 100
            indep = (core_lit[r] / Wf) * (core_lit[r2] / Wf) * 100
            dev = joint - indep
            worst = max(worst, abs(dev))
            print(f'  reels {r+1}&{r2+1}: joint {joint:8.4f}  indep {indep:8.4f}  dev {dev:+.4f} pp')
    print(f'  max |dev| = {worst:.4f} pp')
    print()
    print('== core vs wild on the same reel (weighted %)')
    for r in range(6):
        pw = wild_present[r] / Wf
        if pw > 0:
            p_lit_w = lit_and_wild[r] / wild_present[r] * 100
            p_lit_nw = lit_and_nowild[r] / (W - wild_present[r]) * 100
            print(f'  reel {r+1}: wild rate {pw*100:6.3f}%  P(lit|wild) {p_lit_w:7.4f}%  P(lit|no wild) {p_lit_nw:7.4f}%')
        else:
            print(f'  reel {r+1}: wild rate  0.000%  P(lit) {core_lit[r]/Wf*100:7.4f}%')
    print(f'  pooled reels 2-6: P(lit|wild slot) {slot_wild_lit/slot_wild*100:.4f}%  '
          f'vs base rate {p_hat*100:.4f}%')
    print()
    print('== core vs paying symbol present on same reel (pooled reel-slots, %)')
    slot_total = 6.0 * Wf
    for s in range(6):
        rate = slot_pres_lit[s] / slot_pres[s] * 100
        print(f'  {NAMES[s]:8}: present on {slot_pres[s]/slot_total*100:6.3f}% of slots, P(lit|present) {rate:7.4f}%')
    print()
    mk, mc = sk / Wf, sc / Wf
    cov = skc / Wf - mk * mc
    var_k = skk / Wf - mk * mk
    var_c = scc / Wf - mc * mc
    pearson = cov / math.sqrt(var_k * var_c) if var_k > 0 and var_c > 0 else 0.0
    print(f'== Pearson r(lit-core count, wild cells on board) = {pearson:+.5f}')
    print(f'   mean lit cores {mk:.4f}, mean wild cells {mc:.4f}')
    print()
    if fs_spins:
        print(f'== free-spin draws inside base books ({fs_spins} spins, unweighted)')
        print('   wild %% of cells per reel: ' +
              ' '.join(f'{100.0*sum(1 for _ in [0])*fs_sym_cells[r][WILD]/(4*fs_spins):.3f}' for r in range(6)))
        print('   core lit % per reel (decorative): ' +
              ' '.join(f'{100.0*fs_core_lit[r]/fs_spins:.3f}' for r in range(6)))
        print('   wild-present % of spins per reel: ' +
              ' '.join(f'{100.0*fs_wild_books[r]/fs_spins:.2f}' for r in range(6)))


if __name__ == '__main__':
    main()
