# Ruthless Eclipse — Engine Findings (Phase: evaluator proof + draw model)

Oracle: Claude's catalogs in `../math/`. All probabilities below are weighted by
the lookup weights (the catalog is an enumerated/solved outcome set, not a
random sample — book order in the files carries no information).

## 1. Evaluator semantics — PROVEN EXACT

`validate.py` replayed **every spin of every book in all five modes**
(200,000 books, 956,980 spins) through `evaluator.py`:

| mode    | books  | spins   | board | wins list | rawWin | win (cap-adj) | book totals |
|---------|--------|---------|-------|-----------|--------|---------------|-------------|
| base    | 100000 | 106980  | 100%  | 100%      | 100%   | 100%          | 100%        |
| surge   | 25000  | 250000  | 100%  | 100%      | 100%   | 100%          | 100%        |
| fracture| 25000  | 250000  | 100%  | 100%      | 100%   | 100%          | 100%        |
| echo    | 25000  | 200000  | 100%  | 100%      | 100%   | 100%          | 100%        |
| eclipse | 25000  | 150000  | 100%  | 100%      | 100%   | 100%          | 100%        |

Zero mismatches in any class — no residual mismatch class to explain.
(Full output: `validation_results.txt`.)

The semantics that reproduce the books exactly:

- **Ways**: per symbol, per-reel count = (# symbol) + (# wilds); longest
  left-to-right run with count > 0; pays when length ≥ 3;
  amount = (product of run counts) × paytable[symbol][length−3], cents at 1×.
- **Surge**: any reel containing a wild becomes exactly `[6,6,6,6]`.
- **Fracture**: each wild is duplicated in place — a copy is inserted next to
  every wild, growing the column by one cell per wild (4 → up to 8 rows).
- **Echo**: from a snapshot of the incoming board, each wild's row position is
  set to wild on the neighbouring reel — to the **right**, except the last
  reel, which copies **left**. Copies never chain within one echo step.
- **Eclipse** = Surge → Echo → Fracture, composed in that order.
- **Round cap**: each spin's paid `win` = rawWin truncated so the round's
  cumulative paid win ≤ 2,000,000 cents (20,000×). Later spins in a capped
  round pay 0 while `rawWin` keeps counting (seen in base book 99999, the one
  capped base book: raw FS win 32,768,000 paid as 976,000).
- Base-game opening-spin modifier is a pure function of lit-core count
  (0→none, 1→surge, 2→fracture, 3→echo, 4–6→none) — verified on all 100,000
  base books with zero exceptions. In free spins the feature modifier applies
  to every spin regardless of the (decorative) cores shown.

## 2. Draw model — board (opening spins of base books, weighted)

**Paying symbols are ~iid per cell, near-uniform**, with small per-reel tilts
(full 6×7 table in `draw_model_output.txt`). Reel 1 leans rune/comet
(17.2%/16.9%) and light phoenix/crown (16.3%/16.4%); reels 2–6 sit within
≈15.9–16.7% for every symbol. Spot check: crown count on reel 6 matches
binomial(4, p) closely (49.9/37.4/11.0/1.4/0.3 obs vs 49.3/38.1/11.1/1.4/0.1).
A per-(reel, symbol) weight table fitted to the measured frequencies
reproduces the marginals; cells can be drawn independently.

**Wilds are NOT iid — they are placed by a per-reel cluster process:**

- Reel 1: never (0.000%).
- Each reel r ≥ 2 "activates" with probability q_r — measured as the
  wild-present rate: **q = [5.34%, 5.35%, 6.60%, 7.70%, 8.33%]** for reels 2–6.
- Given activation, the wild count follows a shared distribution, stable
  across reels: **1 → ~46%, 2 → ~30%, 3 → ~18%, 4 → ~6%** (mean ≈ 1.84).
  (Per-reel count table vs binomial in `draw_model_supplement.txt`: e.g.
  reel 2 counts 94.66/2.53/1.61/0.89/0.31% vs binomial 90.68/8.98/0.33/0.01/0.)
- Given the count, positions are **bottom-weighted**: pooled wild rate by row
  on reels 2–6 is ≈ 1.64% / 2.85% / 3.63% / 4.15% (top→bottom), i.e. relative
  row weights ≈ 1 : 1.74 : 2.22 : 2.53.
- Resulting per-cell wild rates: reel 2: 2.42%, 3: 2.43%, 4: 3.01%, 5: 3.59%,
  6: 3.89%; mean wild cells per board 0.613.
- Cross-reel independence of activations is consistent with the measured mean
  (Σq_r × 1.84 ≈ 0.60 ≈ 0.613) but was not directly tested — calibration-time
  check for the generator.

**Free-spin draws differ**: wild ≈ **10.2% of cells** on every reel 2–6
(flat), wild-present on ~22.1% of spins per reel → same cluster process with
q_FS ≈ 22% and the same conditional mean count (≈1.85). Paying symbols are
~uniform 14.5–15.3% per cell on all reels. FS cores light at the same
~15–17%/reel decorative rate. (FS stats are unweighted — 6,980 FS spins occur
inside base books; treat as indicative, refit during calibration.)

## 3. Draw model — cores (weighted, opening spins)

- Per-reel lit rate is exchangeable: 14.95–15.52% per reel, pooled
  **p̂ = 0.15326**, mean lit cores per spin 0.9196.
- Lit-count distribution vs binomial(6, p̂): matches for k = 0–3
  (obs/binomial ratios 0.989 / 0.997 / 1.045 / 1.069) but the tail is
  **suppressed ~15×**: k=4 → 0.0377% (binomial 0.593%), k=5 → 0.00282%,
  k=6 → 0.00001%. This suppression *is* the natural-trigger rarity:
  P(K≥4) = 0.0405% = 1 in 2,466.
- **Generator model: draw K from the measured count table
  [36.441, 39.918, 18.929, 4.671, 0.0377, 0.00282, 0.00001]%, then light a
  uniformly random K-subset of reels.** Evidence: pairwise joints average
  2.21%, matching this model's prediction E[K(K−1)]/30 = 2.213% (all 15 pairs
  within ±0.12pp of it, while sitting uniformly ~0.08–0.20pp *below* the
  independence product p_i·p_j — the signature of a shared count draw).
- **Cores are independent of the board** for paying symbols: P(lit | symbol
  present on the reel) = 15.28–15.44% for all six symbols vs 15.33% base.
  One residual: a small *negative* association with wilds on reels 2–3
  (P(lit|wild) ≈ 12.9% / 13.5% vs ≈15.1% / 15.4% without), fading to zero on
  reels 5–6; Pearson r(lit count, wild cells) = −0.031. Most plausible cause
  is the catalog's weight-solving (wild-rich/feature books down-weighted to
  land exactly 96.0000%), not a generator rule. Generator: draw cores
  independently of the board; expected RTP impact is negligible but should be
  sanity-checked at calibration.

## 4. Notes / curiosities

- Book id 0 in every mode is a constructed degenerate book (rainbow board
  `[[0,0,0,0],[1,1,1,1],…]`, zero payout) — in base it carries ~0.2% of the
  total weight. The catalog mixes enumerated outcome classes with constructed
  rows; the weighted marginals above remain the correct fitting targets.
- Catalog RTP is exactly 96.0000% per mode (parent-verified). Our generator
  targets 96.30% per ENGINE_SPEC, so the draw parameters above are the
  *shape* to reproduce; final calibration scales from here.
- Only one base book in the catalog reaches the cap (id 99999) — the cap
  logic above rests on that book plus the buy-mode books, all consistent.

## 5. Generator spec checklist (next phase)

1. Base board: per reel, per cell — paying symbols iid from per-(reel,symbol)
   weights (measured table); wilds via activation q_r + shared count dist +
   bottom-weighted positions; fill non-wild cells from the paying table.
2. FS board: same structure, q ≈ 22% flat, wild cell rate ≈ 10.2%, paying
   symbols ~uniform.
3. Cores: K ~ measured count table; uniform K-subset; independent of board.
   FS cores: decorative, ~15.3%/reel.
4. Modifier from core count (base) / feature (FS); evaluator in
   `evaluator.py` is the proven reference implementation.
5. Calibrate a global scale/weights so each mode lands at 96.30% RTP in the
   [96.10, 96.50] verification band; verify book↔lookup consistency and
   replay-validate generated books with `validate.py` semantics.
