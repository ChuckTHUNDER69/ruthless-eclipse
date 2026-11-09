# Ruthless Eclipse — Art Bible & Production Spec (v1, 2026-11-08)

Gate artifact: `art/media-generation-reference-frame-v1-*.webp` (Keith's approval
pending). This bible fixes everything that does NOT depend on the gate verdict, so
production starts the hour the frame is approved. If Keith requests a variant, only
§1 (palette/materials) changes; geometry, states and QA stand.

## 1. Direction (from the reference frame, pending gate)
- Hand-painted 2D, matte textured brushwork, bold silhouettes readable at phone size.
- FORBIDDEN (the Vaultbreak rejection profile): glossy 3D-render symbols, glass-gradient
  UI plates, standard-font look, emoji-style icons, gold-rectangle win frames drawn in code.
- Palette: deep indigo night, bronze + anvil-stone materials, ember orange accents;
  core energies teal (surge-adjacent)/amber/violet per pip index, consistent everywhere.
- Scene: layered background (sky/eclipse halo layer, forge midground, ember particles) —
  never a single flat painting used twice.

## 2. Symbol set (7) — painted individually, silhouette-first
IDs per the math: 0 rune, 1 comet, 2 moon, 3 chalice, 4 phoenix, 5 crown, 6 WILD
(eclipse disc). Value hierarchy must read instantly: rune/comet = carved stone (cool,
muted), moon/chalice = worked gold (mid), phoenix/crown = ember-hot, fully rendered
(highs), WILD = the eclipse itself, brightest object on the board.
- Canvas: square tiles, transparent background, symbol mass ≥70% of tile in both axes
  (Vaultbreak failure mode: small symbols floating in big tiles).
- Every tile passes artifact QA before atlas packing: zoom 200%, check edges for
  splotches/bleed/wedges, alpha corners must be fully transparent, no baked text
  except WILD lettering (hand-checked).

## 3. Cores & frame hardware
- Core pip: socket ring (bronze, part of the board frame) + orb in 2 states (dark/lit)
  × 3 energy colours; lit state must read at 24 px. Reacting state = lit + flare ring.
- Board frame: carved dark metal with rune inlay, drawn as one plate + separate
  side hardware (chains/gears) so portrait/landscape crops never stretch the art.

## 4. UI plates & controls (all Eclipse-owned, no SDK sample surfaces)
- One plate family: dark bronze rim, stone face, painted — used by SPIN dial, AUTO/
  TURBO/INFO medallions, buy cards, modal frames. One border treatment, everywhere.
- SPIN dial: circular, rotating on spin (real rotation, not a text swap).
- Typography: display face for wordmark/headers/win text; UI labels in the same family
  at UI weight — no Proxima/system font on any player-facing surface.
- Icons drawn (lightning, circular arrows, i-mark), never emoji or font glyphs.
- Info (credit/bet/win) floats on the scene as gold display text — no boxed deck.

## 5. Animation states (authored, not tweens-on-stills)
- SymbolCell states wired in the scaffold: idle / land / win / transform.
  - idle: near-still painted life (ember shimmer on highs + WILD only; lows stay calm)
  - land: squash-settle with dust puff sprite
  - win: symbol-specific flare + light burst (no shared generic effect for all symbols)
  - transform: the set pieces — SURGE (column floods to wilds top-down with light
    cascade), FRACTURE (each wild splits into two with a crack flash, column grows),
    ECHO (ghost wild streaks sideways onto the neighbour reel and solidifies),
    ECLIPSE (all three composed, screen-edge corona pulse)
- Free spins: intro = eclipse corona closes over the scene; counter = core-orb pips;
  outro = corona opens, total-win plate ceremony scaled by win tier.
- Win tiers: small (text + symbol flare), big (≥15×: full-board light sweep + counted
  roll-up), mega (≥50×: corona flare + ember storm), cap (20,000×: full set piece).
- Background: slow corona breathing + drifting embers (sprite particles, not rectangles).

## 6. Bundle discipline (hard budget ≤12 MB zip, current scaffold ≈1.9 MB)
- One audio format (mp3). Atlas as webp WITH alpha preserved; pixel-check a known
  transparent corner of every regenerated atlas (PNG and webp) before shipping.
- Loader GIF ≤ 400 KB or replaced by the painted corona + progress ring.
- Every asset's bytes are listed in the build report; any single asset >1 MB needs
  a written reason in PORT_NOTES.

## 7. Ship gates (none optional)
1. Keith approves the reference frame (or variant).
2. Keith plays a share-link build and confirms feel.
3. Discord #request-game-feedback round BEFORE submitting (the gate cut in the
   Vaultbreak rush — restored).
4. Ship-verification pass: grep the build for code-drawn rectangles on the win path
   (must be zero), atlas alpha check, zip size check, modal ownership check.
