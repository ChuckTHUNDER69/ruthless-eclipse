# Ruthless Eclipse — Animation Choreography Spec (v1, 2026-11-08)

Purpose: the authored-motion layer that Vaultbreak never had. Every sequence below is
driven by book data the frontend already receives (before/board/cores/modifier/wins),
so choreography is deterministic per book and replay-safe. Timing budgets are for the
default (non-turbo) pace; turbo compresses all budgets ×0.45, autoplay ×0.8.

## Non-negotiable engineering rules (Vaultbreak lessons)
- Round flow is await-driven: the book handler awaits presentation completion.
  Every sequence MUST resolve its completion signal via a timer fuse as well as its
  animation end — a wedged tween must never freeze a round (V11 FS freeze).
- Tween targets are component-level reactive state, never fields of objects inside
  a state array (the V42–V45 frozen-debris bug).
- No code-drawn rectangles on any win path. Highlights are art: fx_light_burst,
  fx_ember_puff, fx_corona_ring, plate_light.
- Sprite sizing: width/height only; feedback factors fold into width/height with
  x/y compensation. Container scale is allowed.

## Base spin (budget ≈1,150 ms)
1. Dial press: dial rotates continuously while the round is live (already in v1).
2. Reels resolve left→right, 90 ms stagger: each column's `before` board drops in
   with a land squash + ember puff at the base (land state).
3. Core reveal (≈250 ms): pips light in reel order, 60 ms stagger, flare ring +
   rising chime per pip; unlit pips stay dark. This is the suspense beat — the player
   counts cores before the board changes.
4. Modifier set piece (see below) if cores 1–3; if 4–6, the board pays plain, then
   the FS intro takes over.
5. Ways presentation: winning symbols flare sequentially by pay value (highest
   first), win lines listed in the ways panel as they flare; running win counts up
   in the WIN readout (Cinzel). Non-winning symbols dim to 55% during the pass.
6. Settle: dim restores, total snaps to the book amount (finalWin authority).

## The set pieces (the game's signature — spend the craft here)
- SURGE (1 core / FS surge): for each wild-bearing reel, a teal energy flood pours
  down the column top→bottom (≈70 ms/cell); cells flip to WILD as the flood passes;
  a corona shimmer crosses the whole board at completion. Budget ≈600 ms.
- FRACTURE (2 cores / FS fracture): each wild cracks — crack-flash sprite + a sharp
  split: the cell divides and the column grows downward, new wilds pushing in with
  stone-dust puffs; neighbouring cells nudge. Amber palette. Budget ≈650 ms.
- ECHO (3 cores / FS echo): ghost copies of each wild streak horizontally to the
  target reel (180 ms, violet trail), solidify with a ripple ring (medallion motif);
  reel 6 echoes left. Snapshot semantics: all streaks launch simultaneously.
  Budget ≈550 ms.
- ECLIPSE (FS eclipse feature): Surge flood → Echo streaks → Fracture splits, in
  the evaluator's composition order, with the big corona ring expanding from the
  board centre at each stage boundary. Budget ≈1,400 ms. This is the 300× buy —
  it must feel like the most expensive thing in the game.

## Free spins
- Intro (≈1,600 ms): corona closes over the scene (bg_feature state), the feature
  medallion slams in on a plate, spin count pips as core orbs; title in Cinzel 900.
- Per-spin: base-spin choreography with the feature's modifier every spin; a
  persistent feature frame (rim light in the modifier's colour) stays up.
- Outro: total-win ceremony by tier (below), corona opens, board returns to base.

## Win tiers (× total bet of the round)
- <3×: readout count-up only.
- 3–15×: symbol flares + light sweep across the board.
- 15–50× BIG: full-board sweep, ember storm particles, counted roll-up with
  accelerating ticks, plate_light ceremony behind the amount.
- 50×+ MEGA: corona flare from the eclipse, screen-edge glow, longer roll-up,
  dial spins freely during the celebration.
- Cap (20,000×): MEGA treatment + the eclipse disc WILD corona at full screen.
All ceremonies are skippable on press (tap = snap to final amount), and every
ceremony carries a hard time cap with the completion fuse — celebration can never
hold the round hostage.

## Sound design targets (bank to produce/source for v2)
Identity: deep forge + celestial — no casino-generic beeps. Events: ui_click,
dial_press, reel_land ×6 (pitched stone), core_light (rising chime per count),
surge_flood, fracture_crack, echo_streak, eclipse_stage, win_small/big/mega
roll-up ticks, fs_intro (corona swell), fs_outro, buy_confirm. One format (mp3),
mixed to consistent loudness, total bank ≤1.5 MB.
