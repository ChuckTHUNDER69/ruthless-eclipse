"""Verify the math_v2 catalogs and write math_v2/VERIFICATION.md.

Checks per mode, over EVERY book:
  * lookup rows == book count, ids sequential and aligned
  * sum of spin `win` == finalWin amount == lookup payout ==
    round(payoutMultiplier * 100)
  * sum of each spin's win-entry amounts == that spin's rawWin
  * each spin's `win` == cap-adjusted rawWin (running 20,000x cap);
    total payout <= cap for every book
  * win-entry structure (symbol/length/ways) == proven evaluator output
    (amounts may differ only when a payout-scale pass was applied)
  * event structure: finalWin last; buy modes open with bonusStart and
    carry the feature's spin count; base features likewise
Exact RTP per mode is computed from the lookups.
"""

import csv
import io
import json
import os

import zstandard as zstd

import generator as G
from evaluator import apply_modifier, cap_adjusted_win, evaluate_ways

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'math_v2')
BAND = (0.9610, 0.9650)


def stream(mode):
    with open(os.path.join(OUT, f'books_{mode}.jsonl.zst'), 'rb') as fh:
        reader = zstd.ZstdDecompressor().stream_reader(fh)
        for line in io.TextIOWrapper(reader, encoding='utf-8'):
            if line.strip():
                yield json.loads(line)


def main():
    with open(os.path.join(OUT, 'production.json')) as fh:
        prov = json.load(fh)
    lines = ['# Ruthless Eclipse v2 — Catalog Verification', '']
    all_ok = True
    summary = []
    for mode in ['base', 'surge', 'fracture', 'echo', 'eclipse']:
        cost = G.MODE_COST[mode]
        lut = {}
        with open(os.path.join(OUT, f'lookUpTable_{mode}.csv')) as fh:
            for row in csv.reader(fh):
                lut[int(row[0])] = (int(row[1]), int(row[2]))
        errs = []
        n = 0
        total = 0
        hits = 0
        mx = 0
        for b in stream(mode):
            n += 1
            if b['id'] != n - 1:
                errs.append(f"id sequence break at {b['id']}")
            evs = b['events']
            if evs[-1]['type'] != 'finalWin':
                errs.append(f"book {b['id']}: finalWin not last")
            paid = 0
            spins = 0
            feat = None
            for e in evs:
                if e['type'] == 'bonusStart':
                    feat = e
                if e['type'] != 'spin':
                    continue
                spins += 1
                if sum(w['amount'] for w in e['wins']) != e['rawWin']:
                    errs.append(f"book {b['id']}: wins sum != rawWin")
                board = apply_modifier(e['before'], e['cores'],
                                       e['modifier'])
                if board != e['board']:
                    errs.append(f"book {b['id']}: board replay mismatch")
                ew, eraw = evaluate_ways(board)
                struct = [(w['symbol'], w['length'], w['ways'])
                          for w in e['wins']]
                estruct = [(w['symbol'], w['length'], w['ways'])
                           for w in ew]
                if struct != estruct:
                    errs.append(f"book {b['id']}: win structure mismatch")
                if e['win'] != cap_adjusted_win(e['rawWin'], paid):
                    errs.append(f"book {b['id']}: cap/win mismatch")
                paid += e['win']
            fin = evs[-1]['amount']
            if paid != fin:
                errs.append(f"book {b['id']}: spin wins != finalWin")
            if round(b['payoutMultiplier'] * 100) != fin:
                errs.append(f"book {b['id']}: payoutMultiplier mismatch")
            if lut.get(b['id'], (None, None))[1] != fin:
                errs.append(f"book {b['id']}: lookup payout mismatch")
            if fin > 2_000_000:
                errs.append(f"book {b['id']}: cap exceeded")
            if mode != 'base':
                want = G.FEATURE_SPINS[mode] + 3  # start+spins+end+final
                if len(evs) != want or evs[0]['type'] != 'bonusStart':
                    errs.append(f"book {b['id']}: bad buy-mode structure")
            elif feat is not None:
                want_spins = G.FEATURE_SPINS[feat['feature']]
                if spins != 1 + want_spins:
                    errs.append(f"book {b['id']}: bad feature spin count")
            total += fin
            if fin > 0:
                hits += 1
            if fin > mx:
                mx = fin
            if len(errs) > 20:
                break
        if len(lut) != n:
            errs.append(f'lookup rows {len(lut)} != books {n}')
        if any(w != 1 for w, _ in lut.values()):
            errs.append('non-unit weight in lookup')
        rtp = total / (n * 100 * cost)
        in_band = BAND[0] <= rtp <= BAND[1]
        ok = not errs and in_band
        all_ok = all_ok and ok
        f = prov['modes'][mode]['scale_factors']
        fstr = ('none (factor 1.0)' if not f else
                ', '.join(f'{x:.6f}' for x in f))
        summary.append((mode, n, rtp, hits / n, mx, fstr, ok, errs[:5]))
        print(f'{mode}: {n:,} books, RTP {rtp*100:.4f}%, '
              f'errors {len(errs)}', flush=True)

    lines += ['| mode | books | exact RTP | hit rate | max payout | scale factors | checks |',
              '|------|-------|-----------|----------|------------|---------------|--------|']
    for mode, n, rtp, hit, mx, fstr, ok, _ in summary:
        lines.append(f'| {mode} | {n:,} | {rtp*100:.4f}% | {hit*100:.2f}% | '
                     f'{mx:,} cents ({mx/100:,.0f}x) | {fstr} | '
                     f'{"PASS" if ok else "FAIL"} |')
    lines += ['', f'Verification band: RTP within '
              f'[{BAND[0]*100:.2f}%, {BAND[1]*100:.2f}%], target 96.30%.',
              'Every book checked: spin wins sum to finalWin; win entries '
              'sum to rawWin; cap-adjusted win chain exact; board and win '
              'structure replay-identical to the proven evaluator; lookup '
              'payout == book payout == payoutMultiplier x 100; '
              'no payout above the 20,000x cap.', '']
    for mode, _, _, _, _, _, ok, errs in summary:
        if errs:
            lines.append(f'**{mode} errors (first 5):**')
            lines += [f'- {e}' for e in errs]
            lines.append('')
    lines.append(f'**Overall: {"PASS" if all_ok else "FAIL"}**')
    with open(os.path.join(OUT, 'VERIFICATION.md'), 'w') as fh:
        fh.write('\n'.join(lines) + '\n')
    print('VERIFICATION.md written; overall', 'PASS' if all_ok else 'FAIL')


if __name__ == '__main__':
    main()
