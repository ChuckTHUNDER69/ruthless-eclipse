# Ruthless Eclipse — v23 review brief for Claude (2026-11-20)

Hi Claude — Torque again. Since the math v3 handover, the frontend went
through eight builds (v16–v23). This brief is the current state of the
game and the questions we'd like your eyes on before we start the
submission pass. Your math is untouched and performing; this round is
about presentation judgment.

## Where the game stands (all verified live on the studio share link)

- **Math v3**: exactly 96.3000% lookup RTP in all five modes, your
  outcome distributions, integer payoutMultiplier. Staged on Drive,
  not yet imported for this game.
- **Money**: the frontend has reconciled to the cent in eight straight
  verified playthroughs (base spins + Fracture/Echo/Surge buys).
- **Motion package — COMPLETE** (this was the long war):
  - Idle: every symbol breathes/sways on the app ticker with per-cell
    phase, so copies of the same symbol are never pixel-identical
    (pixel-diff verified, ~57–64% of sampled pixels change).
  - Win pose: winners scale to ~1.18x + glow with a 1.1s minimum hold,
    verified caught in the base game and in features.
  - Fracture set piece: the splitting wild shows a branching amber
    fissure texture (redrawn after we measured the old art at an 8.5%
    pixel delta — one thin seam); grown duplicates now stay cracked
    from the board swap through the end of that spin's win
    presentation, then heal. Verified live at 3x zoom.
  - The Spine rig experiment was abandoned after six builds (pipe
    proven faulty by elimination); the shipped animation is a sprite
    transform layer. Rig assets still sit in the bundle (symbols.json).
- **Bundle**: 3.6 MB zip (Vaultbreak shipped 32 MB and got dinged for
  it). Painted silhouette-first art per art/ART_BIBLE.md, custom
  in-world modals only, one audio format, Cinzel display type.
- **Keith is playtesting v23 for feel right now** — his verdict is the
  next gate, then portrait rendering + on-device performance checks,
  then submission.

## Context you should weigh

Our other game (Vaultbreak) was rejected at 3.7/9 with three unanimous
tags: **Low quality assets, Poor animations, Poor bet UI bar**. The
publish floor is 6/9, but the commercial bar is 3 stars — only 3-star
games get category placement. Eclipse exists to prove a new
presentation stack before we backport it to Vaultbreak.

## Questions

1. **The three tags**: given the state above, where is Eclipse still
   exposed on assets / animations / bet UI? What would a Stake
   reviewer most plausibly ding first?
2. **Feel gaps**: benchmarked against top-studio games, what is the
   presentation still missing? (Our study notes: reactive scenery,
   ceremony scaled to win size, multi-cue anticipation, features that
   feel like a different room.) Where would you spend the next unit of
   effort?
3. **Bet UI**: floating medallion controls + bronze SPIN dial, info as
   floating text. Any structural concern vs the "poor bet UI bar" tag?
4. **Submission risks**: anything in the math/config/rules surface
   (ENGINE_SPEC.md, config.json) you would double-check before we
   request approval? Social-mode wording is mandatory (no "jackpot",
   win→play phrasing).
5. **Portrait + mobile**: what specifically would you verify before
   calling the build submission-ready?

Keith can share the live playtest link (share/ruthless-gaming/
ruthless-eclipse/3/22) if you want to play the current build. Please
be blunt — a polite pass helps nobody; the last polite estimate we
trusted predicted 7/9 for a game that scored 3.7.

— Torque
