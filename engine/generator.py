"""Ruthless Eclipse — book generator (v2 math, ours).

Implements the draw model fitted from Claude's catalogs (see FINDINGS.md):
  * paying symbols iid per cell from per-(reel, symbol) measured weights
  * wilds via a per-reel cluster process: activation prob q_r, shared
    conditional count distribution, bottom-weighted row positions;
    reel 1 never wild
  * FS boards: q flat per feature context (surge/fracture/echo ~0.22,
    eclipse ~0.05 — measured directly from Claude's buy books), FS symbol
    weights, decorative cores ~16.1%/reel
  * cores (base game): K drawn from the measured count table, uniform
    K-subset of reels, independent of the board
  * modifier from core count in base; fixed feature modifier in free spins
  * 20,000x round cap via evaluator.cap_adjusted_win

Book event schema mirrors Claude's books exactly; payoutMultiplier is in
BET UNITS (payoutCents/100, exact 2dp) per the v2 packaging rules.

Calibration knobs live in PARAMS: q_base_scale plus one wild-activation q
per FS context. Paytable, core table, costs and spin counts are fixed.
"""

import random

from evaluator import (apply_modifier, cap_adjusted_win, evaluate_ways,
                       CAP_CENTS, WILD)

N_REELS = 6
ROWS = 4

# --- measured model constants (FINDINGS.md / draw_model outputs) ---

# per-cell % for paying symbols on the base draw, per reel (wild cells are
# placed on top of an iid paying draw; weights are renormalised internally)
#
# V2 FITTED TABLE (see CALIBRATION.md): Claude's raw draw (the measured
# table below) pays ~499 cents on the opening spin alone — his catalog
# reached 96.00% only through solved lookup weights. A unit-weight catalog
# cannot: natural ways at this paytable are intrinsically worth ~113 cents
# with NO wilds at all. The v2 base table therefore adds per-reel
# anti-alignment tilts: reels 2-5 each lean 45% on a distinct low/mid
# symbol (rune / moon / comet / chalice), which breaks cross-reel run
# alignment and brings the no-wild opening EV to ~60 cents, leaving room
# for the wild/reaction contribution at q_base_scale ~0.3. Reels 1 and 6
# keep the measured tilts.
BASE_PAY_W_MEASURED = [
    [17.213, 16.895, 16.645, 16.584, 16.311, 16.351],
    [16.407, 16.663, 16.272, 16.266, 16.103, 15.874],
    [16.512, 16.502, 16.394, 16.156, 16.120, 15.887],
    [16.255, 16.091, 16.125, 16.424, 16.029, 16.064],
    [16.025, 16.000, 16.056, 15.999, 16.269, 16.063],
    [15.878, 16.028, 15.992, 15.985, 16.019, 16.207],
]

BASE_PAY_W = [
    BASE_PAY_W_MEASURED[0],
    [45.0, 11.0, 11.0, 11.0, 11.0, 11.0],   # reel 2 leans rune
    [11.0, 11.0, 45.0, 11.0, 11.0, 11.0],   # reel 3 leans moon
    [11.0, 45.0, 11.0, 11.0, 11.0, 11.0],   # reel 4 leans comet
    [11.0, 11.0, 11.0, 45.0, 11.0, 11.0],   # reel 5 leans chalice
    BASE_PAY_W_MEASURED[5],
]

# per-cell % for paying symbols on free-spin draws, per reel
FS_PAY_W = [
    [16.526, 16.948, 16.780, 16.465, 16.755, 16.526],
    [14.545, 14.853, 14.642, 15.312, 15.165, 15.283],
    [14.753, 15.000, 14.663, 15.229, 15.254, 15.029],
    [14.996, 14.961, 14.839, 14.832, 14.961, 15.147],
    [14.936, 14.900, 14.882, 14.842, 15.043, 15.021],
    [14.953, 14.853, 14.968, 14.989, 14.918, 14.996],
]

# base-game wild activation probability per reel (reels 2-6), measured
Q_BASE = [0.0, 0.05338, 0.05354, 0.06595, 0.07695, 0.08325]

# conditional wild-count distribution given activation, k = 1..4 (shared)
COUNT_DIST = [0.4581, 0.3013, 0.1817, 0.0589]

# bottom-weighted wild row placement weights, rows top->bottom
ROW_W = [1.0, 1.74, 2.22, 2.53]

# measured lit-core count table, K = 0..6 (base game)
CORE_K_TABLE = [0.3644078, 0.3991793, 0.1892928, 0.0467147,
                0.0003771, 0.0000282, 0.0000001]

FS_CORE_P = 0.161  # decorative core rate per reel in free spins

BASE_MODIFIER = {0: None, 1: 'surge', 2: 'fracture', 3: 'echo'}
TRIGGER_FEATURE = {4: 'surge', 5: 'echo', 6: 'eclipse'}
FEATURE_SPINS = {'surge': 10, 'fracture': 10, 'echo': 8, 'eclipse': 6}
MODE_COST = {'base': 1, 'surge': 75, 'fracture': 100, 'echo': 150,
             'eclipse': 300}

# calibration knobs (defaults = measured values; calibrate.py tunes these)
DEFAULT_PARAMS = {
    'q_base_scale': 1.0,   # multiplies Q_BASE per reel
    'q_surge': 0.22,
    'q_fracture': 0.22,
    'q_echo': 0.22,
    'q_eclipse': 0.05,
}


def _weighted_rows(rng, k):
    """k distinct rows sampled without replacement, prop. to ROW_W."""
    pool = list(range(ROWS))
    out = []
    for _ in range(k):
        tot = sum(ROW_W[r] for r in pool)
        x = rng.random() * tot
        acc = 0.0
        for r in pool:
            acc += ROW_W[r]
            if x <= acc:
                out.append(r)
                pool.remove(r)
                break
    return out


def draw_board(rng, pay_w, q_list):
    """One 6x4 board: iid paying symbols + wild cluster process."""
    board = []
    for r in range(N_REELS):
        col = rng.choices(range(6), weights=pay_w[r], k=ROWS)
        q = q_list[r]
        if q > 0.0 and rng.random() < q:
            k = rng.choices((1, 2, 3, 4), weights=COUNT_DIST)[0]
            for row in _weighted_rows(rng, k):
                col[row] = WILD
        board.append(col)
    return board


def draw_cores(rng):
    """Base-game cores: K ~ CORE_K_TABLE, uniform K-subset. Returns
    (cores list of 0/1, K)."""
    k = rng.choices(range(7), weights=CORE_K_TABLE)[0]
    cores = [0] * N_REELS
    for r in rng.sample(range(N_REELS), k):
        cores[r] = 1
    return cores, k


def _fs_cores(rng):
    return [1 if rng.random() < FS_CORE_P else 0 for _ in range(N_REELS)]


def _q_list_fs(params, feature):
    q = params['q_eclipse'] if feature == 'eclipse' else params['q_' + feature]
    return [0.0, q, q, q, q, q]


def _q_list_base(params):
    s = params['q_base_scale']
    return [min(1.0, q * s) for q in Q_BASE]


def _spin(rng, before, cores, modifier, paid, index, want_events):
    board = apply_modifier(before, cores, modifier)
    wins, raw = evaluate_ways(board)
    win = cap_adjusted_win(raw, paid)
    if want_events:
        ev = {'type': 'spin', 'before': before, 'board': board,
              'cores': cores, 'modifier': modifier, 'wins': wins,
              'win': win, 'rawWin': raw, 'index': index}
        return ev, win
    return None, win


def play_round(rng, params, mode, want_events=True):
    """Play one round of `mode`; returns (events, total_paid_cents).
    With want_events=False, events is None (fast calibration path)."""
    events = [] if want_events else None
    paid = 0
    idx = 0

    def spin(before, cores, modifier):
        nonlocal paid, idx
        ev, win = _spin(rng, before, cores, modifier, paid, idx, want_events)
        if want_events:
            events.append(ev)
        paid += win
        idx += 1

    def bonus_start(feature):
        nonlocal idx
        if want_events:
            events.append({'type': 'bonusStart', 'feature': feature,
                           'spins': FEATURE_SPINS[feature], 'index': idx})
        idx += 1

    def bonus_end():
        nonlocal idx
        if want_events:
            events.append({'type': 'bonusEnd', 'index': idx})
        idx += 1

    def feature(feature):
        bonus_start(feature)
        q_list = _q_list_fs(params, feature)
        for _ in range(FEATURE_SPINS[feature]):
            spin(draw_board(rng, FS_PAY_W, q_list), _fs_cores(rng), feature)
        bonus_end()

    if mode == 'base':
        cores, k = draw_cores(rng)
        spin(draw_board(rng, BASE_PAY_W, _q_list_base(params)), cores,
             BASE_MODIFIER.get(k))
        if k in TRIGGER_FEATURE:
            feature(TRIGGER_FEATURE[k])
    else:
        feature(mode)

    if want_events:
        events.append({'index': idx, 'type': 'finalWin', 'amount': paid})
    return events, paid


def make_book(rng, params, mode, book_id):
    events, paid = play_round(rng, params, mode, want_events=True)
    return {'id': book_id, 'events': events,
            'payoutMultiplier': round(paid / 100, 2)}


# --- multiprocessing workers (top-level, picklable) ---

def sim_chunk(args):
    """Simulate n rounds of mode; return (n, sum_paid, sum_sq, hits, max)."""
    mode, params, n, seed = args
    rng = random.Random(seed)
    tot = 0
    tot2 = 0
    hits = 0
    mx = 0
    for _ in range(n):
        _, paid = play_round(rng, params, mode, want_events=False)
        tot += paid
        tot2 += paid * paid
        if paid > 0:
            hits += 1
        if paid > mx:
            mx = paid
    return n, tot, tot2, hits, mx


def gen_chunk(args):
    """Generate n books of mode starting at id start_id (deterministic)."""
    mode, params, start_id, n, seed = args
    rng = random.Random(seed)
    return [make_book(rng, params, mode, start_id + i) for i in range(n)]
