# Ruthless Eclipse — Handover for Claude (math v3 test brief)

Hi Claude — Torque here (Keith's other collaborator). You authored this
game's original math (Oct 2026); your generator is lost, so I rebuilt the
engine from your published catalogs and verified it by replaying all
200,000 of your books / 956,980 spins with a 100.0000% match on boards,
wins, cap chain, and totals (see `engine/FINDINGS.md`, `ENGINE_SPEC.md`).

## What changed in math v3, and why

Math v2 (my calibration) hit 96.26–96.33% RTP with unit-weight books, but
to get there it starved the game: base wild activation ~2%/reel vs your
measured 5.3–8.3%, eclipse free-spin activation throttled to 0.02 vs your
~0.22. Players felt it — boards with a wild: 10.8% of base spins vs your
29.6% (weighted). Keith's call: "lets try claudes way."

So v3 uses YOUR method:
- Generation at your measured densities (`engine/produce_v3.py`):
  measured base pay table (no anti-alignment tilts), q_base_scale 1.0,
  free-spin q = 0.22 for every feature including eclipse. 300k base +
  100k per buy mode, deterministic seeds.
- RTP centred by solved lookup weights (`engine/solve_weights.py`):
  exponential tilt w(p) = exp(-lambda * p / costCents), lambda bisected
  to exactly 96.30% per mode, quantized to integers at ~1e12 total
  scale and repaired to within 0.02pp. Your own lookups show the same
  signature (ESS 42–63%, weight ranges spanning ~7 orders of magnitude).
- No payout scaling (v2 scaled amounts; v3 does not). Book
  `payoutMultiplier` is INTEGER cents == finalWin == lookup payout.

## Tests we'd like you to run

1. **Evaluator replay** — `engine/verify.py` replays sampled books from
   `math_v3/publish_files/` through `engine/evaluator.py`: every spin's
   board, wins, cap chain, and the book total must match exactly.
2. **Lookup RTP** — per mode: sum(w * payout) / sum(w) / (100 * cost)
   from `lookUpTable_<mode>_0.csv` must equal 96.30% ± 0.05pp, inside
   Stake's 96.00–96.70% window. Costs: base 1, surge 75, fracture 100,
   echo 150, eclipse 300.
3. **Format** — every book's `payoutMultiplier` is an integer (hundredths
   of the base-bet multiplier); the studio's publisher rejects floats
   with ERR_INVALID_FORMAT. Assert payoutMultiplier == finalWin amount
   == lookup payout for every row.
4. **Weighted outcome stats vs your targets** — weighted by the v3
   lookups, compare against your original game's weighted stats:
   base first-spin hit 57.9%, base boards-with-a-wild 29.6%, weighted
   median payout as % of cost — surge 63.2 / fracture 59.2 / echo 60.4 /
   eclipse 13.1; dry share (<= 2.3% of cost) — eclipse 33.1%, other buys
   <= 0.7%. v3 should land close; flag any mode that's off by more than
   a few points.
5. **Cap behaviour** — no book may exceed the 20,000x round cap
   (2,000,000 cents); cap-truncated spins must show rawWin > win with
   the chain still summing to the book total.

## Layout

- `engine/` — evaluator, generator, draw model, v2 calibration
  (`calibrate.py`, `refine.py`, `produce.py`), v3 pipeline
  (`produce_v3.py`, `solve_weights.py`), verification.
- Your original catalogs and the shipped v2 bundle are NOT in this repo
  (size); your originals are your own files, and v2 is staged in Keith's
  Drive folder "IMPORT — Ruthless Eclipse Math v2". v3 supersedes v2 if
  these tests pass.
- `math_v3/` — raw v3 catalogs + `publish_files/` (the studio bundle:
  index.json, books_<mode>.jsonl.zst, lookUpTable_<mode>_0.csv) +
  `weights_report.json` from the solver.
- `ENGINE_SPEC.md` — the rules as measured from your books.

The frontend is not in this repo (it lives in the Stake Web SDK monorepo
and consumes these books unchanged). Questions or failures: leave them
as issues/notes in the repo and Keith will route them back to Torque.
