# Ruthless Eclipse v2 — Calibration

Target: **96.30% RTP** per mode. Method: Monte-Carlo knob tuning (bisection + secant refinement, large-n confirmations below); the produced catalogs are then centred exactly by the documented per-mode payout-scale pass in produce.py (factors recorded in math_v2/VERIFICATION.md).

| mode | knob | value | MC RTP | MC n |
|------|------|-------|--------|------|
| base | q_base_scale | 0.33625 | 95.917% | 3,000,000 |
| surge | q_surge | 0.10328 | 96.246% | 900,000 |
| fracture | q_fracture | 0.12176 | 96.436% | 900,000 |
| echo | q_echo | 0.12904 | 96.411% | 900,000 |
| eclipse | q_eclipse | 0.02221 | 95.876% | 2,400,000 |

## Why the base draw has anti-alignment tilts

Claude's original reached 96.00% through solved lookup weights on a hot raw game: his opening spins average 498.9 cents unweighted, and even with NO wilds the natural ways at this paytable are worth ~113 cents (measured identically in his catalog and in this generator: 113.8 vs 112.8). A unit-weight catalog therefore cannot reach 96.30% by wild-activation tuning alone. The v2 base draw adds per-reel tilts (the sanctioned secondary knob): reels 2-5 each lean 45% on a distinct low/mid symbol (rune, moon, comet, chalice; off-symbols 11%), breaking cross-reel run alignment. No-wild opening EV drops to ~60 cents, and q_base_scale ~0.3 restores the wild/reaction contribution. Consequence vs Claude's effective (weighted) game: base-game wild frequency is lower (activation ~1.7-2.7% per reel vs his effective 5.3-8.3%); cores, reactions, features, paytable, costs and spin counts are unchanged. Free-spin draws keep the measured near-uniform tilts — the buy modes calibrate cleanly on q alone.

Fixed (not tuned): paytable, core count table, wild count distribution, row weights, FS symbol tilts, mode costs, feature spin counts.

Base estimate is stratified: opening spin simulated directly; natural features enter as an exact-probability constant of 3.13 cents/round built from the calibrated feature means (cap interaction between a huge opening win and its feature is second-order and neglected).

Refinement wall time: 1886s.
