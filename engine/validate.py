"""Validate evaluator.py against Claude's catalog books (the oracle).

Streams every book of every mode and, for each spin event, checks:
  1. board:  apply_modifier(before, cores, modifier) == book's board
  2. wins:   evaluate_ways(board) wins list == book's wins list
  3. rawWin: evaluate_ways(board) total == book's rawWin
  4. win:    rawWin truncated by the running round cap == book's win
  5. book:   sum of spin wins == finalWin amount

Also, as a diagnostic, checks the base-game rule that the opening spin's
modifier is a pure function of its lit-core count
(0 -> None, 1 -> surge, 2 -> fracture, 3 -> echo, 4-6 -> None).

Usage: python3 validate.py [mode ...]   (default: all five modes)
"""

import io
import json
import os
import sys
from collections import Counter

import zstandard as zstd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evaluator import apply_modifier, evaluate_ways, cap_adjusted_win

MATH_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'math')
MODES = ['base', 'surge', 'fracture', 'echo', 'eclipse']
CORE_TO_MODIFIER = {0: None, 1: 'surge', 2: 'fracture', 3: 'echo',
                    4: None, 5: None, 6: None}


def stream_books(mode):
    path = os.path.join(MATH_DIR, f'books_{mode}.jsonl.zst')
    with open(path, 'rb') as fh:
        reader = zstd.ZstdDecompressor().stream_reader(fh)
        for line in io.TextIOWrapper(reader, encoding='utf-8'):
            if line.strip():
                yield json.loads(line)


def wins_key(wins):
    return [(w['symbol'], w['length'], w['ways'], w['amount']) for w in wins]


def validate_mode(mode):
    stats = Counter()
    examples = {}
    derived_mod_mismatch = Counter()

    def note(kind, payload):
        stats[kind] += 1
        if kind not in examples:
            examples[kind] = payload

    for book in stream_books(mode):
        stats['books'] += 1
        paid = 0
        final_win = None
        spins = [e for e in book['events'] if e['type'] == 'spin']
        for si, e in enumerate(spins):
            stats['spins'] += 1
            mod = e.get('modifier')

            # diagnostic: base opening spin modifier vs lit-core count
            if mode == 'base' and si == 0:
                ncores = sum(e['cores'])
                if CORE_TO_MODIFIER[ncores] != mod:
                    derived_mod_mismatch[(ncores, mod)] += 1

            my_board = apply_modifier(e['before'], e['cores'], mod)
            if my_board != e['board']:
                note('board_mismatch', (book['id'], si, mod, e['before'],
                                        e['board'], my_board))
            else:
                stats['board_ok'] += 1

            my_wins, my_total = evaluate_ways(e['board'])
            if wins_key(my_wins) != wins_key(e['wins']):
                note('wins_mismatch', (book['id'], si, mod, e['board'],
                                       e['wins'], my_wins))
            else:
                stats['wins_ok'] += 1
            if my_total != e['rawWin']:
                note('raw_mismatch', (book['id'], si, mod, e['board'],
                                      e['rawWin'], my_total))
            else:
                stats['raw_ok'] += 1

            expect_win = cap_adjusted_win(e['rawWin'], paid)
            if expect_win != e['win']:
                note('win_mismatch', (book['id'], si, mod, paid,
                                      e['rawWin'], e['win'], expect_win))
            else:
                stats['win_ok'] += 1
            paid += e['win']

        for e in book['events']:
            if e['type'] == 'finalWin':
                final_win = e['amount']
        if final_win is not None and paid != final_win:
            note('book_total_mismatch', (book['id'], paid, final_win))
        else:
            stats['book_ok'] += 1

    return stats, examples, derived_mod_mismatch


def pct(ok, total):
    return f'{100.0 * ok / total:.4f}%' if total else 'n/a'


def main():
    modes = sys.argv[1:] or MODES
    grand = Counter()
    for mode in modes:
        stats, examples, dmm = validate_mode(mode)
        grand.update({f'{mode}.{k}': v for k, v in stats.items()})
        print(f'== {mode}: {stats["books"]} books, {stats["spins"]} spins')
        print(f'   board match : {stats["board_ok"]}/{stats["spins"]} = {pct(stats["board_ok"], stats["spins"])}')
        print(f'   wins match  : {stats["wins_ok"]}/{stats["spins"]} = {pct(stats["wins_ok"], stats["spins"])}')
        print(f'   rawWin match: {stats["raw_ok"]}/{stats["spins"]} = {pct(stats["raw_ok"], stats["spins"])}')
        print(f'   win (cap)   : {stats["win_ok"]}/{stats["spins"]} = {pct(stats["win_ok"], stats["spins"])}')
        print(f'   book totals : {stats["book_ok"]}/{stats["books"]} = {pct(stats["book_ok"], stats["books"])}')
        if dmm:
            print(f'   opening-spin modifier != f(lit cores): {dict(dmm)}')
        for kind, ex in examples.items():
            print(f'   FIRST {kind}: {ex}')
        print()
    print('done.')


if __name__ == '__main__':
    main()
