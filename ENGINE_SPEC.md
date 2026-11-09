# Ruthless Eclipse — Math Engine Spec (Phase 0 output, 2026-11-08)

Source of truth: the published rules text in the prototype frontend (app.js showRules)
plus probability structure measured from Claude's catalogs (the verification oracle).
Goal: an engine whose distribution matches the catalogs' shape, calibrated to
**96.30% RTP per mode** (Stake window 96.00–96.70).

## Game shape
- 6 reels × 4 rows, ways pays. Symbol counts per reel can vary (books show column
  heights 4–8 in events after modifiers; base draw is 4 rows).
- Symbols 0–5: rune, comet, moon, chalice, phoenix, crown. Symbol 6: WILD,
  substitutes for all paying symbols, never originates on reel 1.
- Ways: a symbol pays when it appears on 3+ consecutive reels from the left;
  only the longest consecutive run pays per symbol; the run's per-reel counts
  multiply into ways. Paytable (× base bet per way, for 3/4/5/6 of a kind):
  rune .05/.12/.25/.50 · comet .06/.15/.35/.70 · moon .08/.20/.45/1.00 ·
  chalice .10/.25/.65/1.25 · phoenix .12/.35/.85/1.75 · crown .15/.45/1.20/2.50.
- Round cap: total round win truncated at 20,000× base bet (base spin + all FS).

## Eclipse cores (measured from Claude's base catalog)
- Each reel independently lights its core with p ≈ 0.155 (opening-spin lit-core
  counts fit a binomial(6, p) closely: 0→36.44%, 1→39.92%, 2→18.93%, 3→4.67%,
  4→0.038%, 5→0.003%, 6→~0.00001%). Fit p exactly during engine calibration.
- Base-game reactions by lit cores on the spin:
  1 → SURGE: every wild-bearing reel expands to four wilds.
  2 → FRACTURE: each wild counts as two positions.
  3 → ECHO: wild positions copy onto the reel to the right (from reel 6, to the
  left); snapshot of original wild reels; never onto reel 1.
  4–6 → board pays unmodified, then free spins.
- Free spins: 4 cores → 10 Surge spins; 5 → 8 Echo spins; 6 → 6 Eclipse spins
  (Surge, then Echo, then Fracture combined). Modifier always active in FS.
  No retrigger; cores in FS are decorative.
- Measured natural trigger rates (catalog): any feature 1 in 2,466 base spins
  (surge 1 in 2,652; echo 1 in 35,399; eclipse 1 in ~9.0M). Reactions fire on
  ~63.5% of base spins — the base game hook is the reactions, FS is buy-driven.
  DESIGN QUESTION for Keith: keep the natural trigger this rare?

## Modes
base 1× (core game) · surge buy 75× / 10 FS · fracture buy 100× / 10 FS ·
echo buy 150× / 8 FS · eclipse buy 300× / 6 FS. Every mode targets 96.30% RTP
relative to its full cost. No ante.

## Catalog reference stats (Claude's, at 96.0000%)
- Base: hit 57.90%; RTP by bucket — 0–1×: 13.70, 1–5×: 26.40, 5–20×: 26.99,
  20–100×: 19.52, 100–1000×: 8.27, 1000×+: 1.13 (points of RTP).
- Weights are exact-probability integers (total base weight 6.75e13,
  3,151 distinct weights, GCD 1) — a solved/enumerated distribution.

## Packaging (studio conventions, learned from Vaultbreak)
- Publish layout: index.json + books_<mode>.jsonl.zst + lookUpTable_<mode>_0.csv.
- Lookup row format id,weight,payoutCents; book payoutMultiplier in BET UNITS
  (Claude's books store cents — convert). Event win sums must equal finalWin
  exactly, in cents, after the cap.
- Verify before staging: exact lookup RTP per mode in [96.10, 96.50] band,
  book↔lookup consistency sample, then byte-verified Drive staging.
