"""Ruthless Eclipse — pure board/win evaluator.

Semantics proven against Claude's catalog books (see validate.py / FINDINGS.md).
Boards are lists of 6 columns; each column is a list of symbol ids, top first.
Symbols 0-5 are paying symbols; 6 is WILD (never originates on reel 1).

All money values are cents at 1x base bet (the books' native unit).
Paytable is cents per way for run lengths 3/4/5/6 (== config.json / 100 x bet).
"""

WILD = 6
N_REELS = 6
BASE_ROWS = 4
CAP_CENTS = 2_000_000  # 20,000x base bet round cap

# cents per way, index [symbol][length-3]
PAYTABLE = [
    [5, 12, 25, 50],     # 0 rune
    [6, 15, 35, 70],     # 1 comet
    [8, 20, 45, 100],    # 2 moon
    [10, 25, 65, 125],   # 3 chalice
    [12, 35, 85, 175],   # 4 phoenix
    [15, 45, 120, 250],  # 5 crown
]


def _surge(board):
    """Every wild-bearing reel expands to exactly four wilds."""
    return [[WILD] * BASE_ROWS if WILD in col else list(col) for col in board]


def _fracture(board):
    """Each wild becomes two positions: a copy is inserted next to each wild,
    growing the column by one cell per wild (height 4 -> up to 8)."""
    out = []
    for col in board:
        new = []
        for s in col:
            new.append(s)
            if s == WILD:
                new.append(WILD)
        out.append(new)
    return out


def _echo(board):
    """Wild positions copy onto the neighbouring reel at the same row.
    Every reel copies to the reel on its right, except the last reel, which
    copies to the left. All copies are computed from a snapshot of the
    incoming board, so copies never chain within one echo step."""
    snap = [list(col) for col in board]
    out = [list(col) for col in board]
    n = len(board)
    for i, col in enumerate(snap):
        rows = [r for r, s in enumerate(col) if s == WILD]
        if not rows:
            continue
        t = i + 1 if i < n - 1 else i - 1
        for r in rows:
            if r < len(out[t]):
                out[t][r] = WILD
    return out


def apply_modifier(before_board, cores, modifier):
    """Reproduce a spin event's `board` from its `before` board.

    `cores` is the event's lit-core list (not needed by the transform itself:
    in the books the modifier is fully determined by the event context, but
    the argument is kept to mirror the event shape). `modifier` is the
    event's modifier: None, 'surge', 'fracture', 'echo' or 'eclipse'.
    Eclipse is the composition Surge -> Echo -> Fracture, applied in order.
    """
    board = [list(col) for col in before_board]
    if modifier is None:
        return board
    if modifier == 'surge':
        return _surge(board)
    if modifier == 'fracture':
        return _fracture(board)
    if modifier == 'echo':
        return _echo(board)
    if modifier == 'eclipse':
        return _fracture(_echo(_surge(board)))
    raise ValueError(f'unknown modifier: {modifier!r}')


def evaluate_ways(board):
    """Evaluate ways wins on a (post-modifier) board.

    For each paying symbol, count occurrences per reel where the count is
    (# of that symbol) + (# of wilds) on the reel. The longest consecutive
    run from reel 1 with count > 0 pays when its length is >= 3:
    amount = (product of the run's per-reel counts) * paytable[symbol][len-3].

    Returns (wins, total_cents) where wins is a list of dicts with keys
    symbol/length/ways/amount, in ascending symbol order — the exact shape
    the catalog books use.
    """
    wins = []
    total = 0
    for sym in range(6):
        ways = 1
        length = 0
        for col in board:
            c = col.count(sym) + col.count(WILD)
            if c == 0:
                break
            ways *= c
            length += 1
        if length >= 3:
            amount = ways * PAYTABLE[sym][length - 3]
            wins.append({'symbol': sym, 'length': length,
                         'ways': ways, 'amount': amount})
            total += amount
    return wins, total


def cap_adjusted_win(raw_win, already_paid):
    """A spin's paid `win` under the round cap: raw win truncated so the
    round's cumulative paid win never exceeds CAP_CENTS."""
    return max(0, min(raw_win, CAP_CENTS - already_paid))
