# Ruthless Eclipse — Web SDK Port Notes

Scaffold built 2026-11-08 by adapting the proven Vaultbreak app
(`apps/vaultbreak/`) to the Eclipse book schema and presentation model.
Art is placeholder throughout; structure, RGS plumbing and the playback
state machine are the deliverable.

## Build status

- `~/tools/bin/pnpm build` (from `apps/eclipse/`) is **green**:
  adapter-static writes the site to `build/` with no errors.
  (Sandbox quirk: the esbuild service child can keep the wrapper shell
  alive after "✔ done"; completion was verified on disk — output files,
  bundle contents, and the absence of any error lines in the log.)
- **Bundle: `build/` = 3.6 MB unzipped, ≈ 1.94 MiB zipped — well under
  the 12 MB hard budget.** Current contributors:
  - `stake-engine-loader.gif` — 1.3 MB (the Stake loader splash gif,
    inherited from Vaultbreak's static set; biggest single item)
  - JS bundle — ~1.1 MB (`_app/immutable/bundle.*.js`; SvelteKit also
    emits a ~1.1 MB `index.html`)
  - `assets/eclipse_cover.jpg` — 92 KB (placeholder cover)
  - `assets/audio/sounds.mp3` — 32 KB (silent placeholder bank)
  - everything else (rules icons, favicon, loader.gif) — a few KB each
- **Audio rule applied: ONE format only (mp3).** The four-format bank
  copied from Vaultbreak (mp3/ogg/m4a/ac3) was cut to mp3;
  `sounds.json`'s `src` lists only `./assets/audio/sounds.mp3`.
  When the real mix arrives, keep it one format and re-measure.

## Modal ownership (Keith directive, 2026-11-08)

The autopsy finding — Vaultbreak shipped the shared SDK **sample**
modals (components-ui-html `Modals`) — is **not** repeated here.
The shared `Modals` component is **not imported anywhere in this app**,
so no sample modal needs a "replace before ship" swap-out; every
surface below is an Eclipse-owned component in
`src/components/modals/`, driven by the same `stateModal` contract and
restyleable in-world:

| stateModal name | Shared sample (NOT used) | Eclipse-owned replacement |
|---|---|---|
| `error` | ModalError | `modals/ErrorModal.svelte` |
| `betAmountMenu` | ModalBetMenu | `modals/BetAmountMenuModal.svelte` |
| `buyBonus` | ModalBuyBonus | `modals/BuyBonusModal.svelte` |
| `buyBonusConfirm` | ModalBuyBonusConfirm | `modals/BuyBonusConfirmModal.svelte` |
| `autoSpin` | ModalAutoSpin | `modals/AutoSpinModal.svelte` |
| `autoSpinMessage` | ModalAutoSpinMessage | `modals/AutoSpinMessageModal.svelte` |
| `payTable` | ModalPayTable | `modals/RulesModal.svelte` |
| `gameRules` | ModalGameRules | `modals/RulesModal.svelte` |
| `settings` | ModalSettings | `modals/SettingsModal.svelte` |

Supporting changes for full ownership:

- Modal shell is ours: `modals/ModalShell.svelte` (flat in-world panel;
  final art restyles the shell, not the contracts).
- The buy-flow emitter type union (`bet`, `autoBet`, `buyBonusConfirm`,
  `soundPressGeneral`) is defined in-app in `game/typesEmitterEvent.ts`
  as `EmitterEventModal`; `game/eventEmitter.ts` no longer imports it
  from components-ui-html.
- Buy selection state is app-owned: `game/stateBonus.svelte.ts`
  (replaces components-ui-html's `stateBonus`).
- Functional contracts were replicated from the shared implementations:
  buy card → set selection → `buyBonusConfirm` broadcast → confirm sets
  `stateBet.activeBetModeKey` and broadcasts `bet`; autoplay start sets
  counter/limit amounts from the `stateUi` selections via the
  state-shared multiplier maps, resets a buy mode to BASE, broadcasts
  `autoBet`; error modal renders the RGS error shape the bet machine
  stores.
- Remaining components-ui-html touches are **not** modal surfaces:
  `GlobalStyle` (global CSS) in `routes/+layout.svelte`, and the i18n
  message-map merges in `src/i18n/` (string tables for SDK shared
  components). The buy panel does not yet embed bet stepping (the
  shared modal had a toggle); the floating steppers cover it — embed
  before ship if design wants it.

## Art swappability (Keith directive, 2026-11-08)

Symbols, cores, plates and backgrounds arrive later as one painted
atlas set (after the art-direction gate). The scaffold is structured
for that swap:

- `game/constants.ts` exports **`TEXTURE_KEYS`** — the atlas frame keys
  every renderer stands in for (`symbol_rune`…`symbol_wild`,
  `core_lit`/`core_unlit`, `plate_wide`/`plate_light`/`spin_dial`,
  `bg_base`/`bg_feature`). `game/assets.ts` documents exactly where the
  atlases register when they land.
- **Layout math comes only from the geometry constants**
  (`CELL_WIDTH`, gaps, board/block sizes) — never from placeholder
  drawing code — so painted frames drop into unchanged geometry.
- `components/SymbolCell.svelte` takes a **`state`** prop with the four
  animation hooks — `idle` / `land` / `win` / `transform` — stubbed
  today (gold pulse frame, cyan transform pop). Board derives the state
  per cell from the playback state (highlighted → `win`,
  modifier-changed → `transform`, spinning → `land`). The
  Surge/Fracture/Echo transformations are authored set pieces in the
  final build and will animate on the `transform` hook.
- `components/CorePip.svelte` is a separate component with
  `lit`/`reacting` props standing in for `core_lit`/`core_unlit`.
- `components/Background.svelte` switches base/feature on
  `stateGame.gameType`, ready to swap shapes for the two bg frames.

## Reused from Vaultbreak vs rewritten

**Reused (structure/contracts kept, branding adapted):**

- App shell: `routes/`, `app.html`, `hooks.server.ts`, SvelteKit/vite/
  lingui configs, `package.json` (renamed `eclipse`).
- RGS/session plumbing: `game/actor.ts` pattern (utils-xstate primary
  machines), `game/stateXstate.ts`, `game/context.ts`,
  `game/stateLayout.ts`, `components/EnableGameActor.svelte`,
  `components/ResumeBet.svelte`, `components/EnableSound.svelte`,
  `Authenticate`/`LoaderStakeEngine` flow in `+layout.svelte`.
- Control wiring: `components/EclipseControls.svelte` is
  VaultControls' contract set (bet/stop emitter events, bet stepping
  over `stateConfig.betAmountOptions`, buy modal, autoplay modal,
  turbo/sound toggles, space-bar = bet button, paytable refresh at the
  current bet) re-skinned with placeholder plates. No boxed deck;
  readouts float on the scene.
- `components/Sound.svelte` subscription pattern; `winLevelMap`
  thresholds pattern; the paytable-at-current-bet refresh idea.

**Rewritten for Eclipse:**

- `game/typesBookEvent.ts` — the Eclipse schema (see below).
- `game/bookEventHandlerMap.ts` — the playback state machine
  (`spin` / `bonusStart` / `bonusEnd` / `finalWin` /
  `createBonusSnapshot`), running totals, FS state, win-level
  derivation, stop-button skip (waits poll `stateGame.skipRequested`).
- `game/stateGame.svelte.ts` — plain reactive board state (columns of
  symbol ids, cores, wins, highlights). Deliberately NOT Vaultbreak's
  utils-slots cascading-reel machinery: an Eclipse spin is a static
  board swap (`before` → `board`), so that machinery has no job here.
- `game/config.ts` / `game/meta.ts` — Eclipse modes, paytable, rules.
- Board + presentation components: `Board`, `SymbolCell`, `CorePip`,
  `Background`, `FreeSpinIntro/Counter/Outro`, `Win`, `LoadingScreen`,
  `PressToContinue` (all placeholder rendering).
- The whole modal layer (above). Vaultbreak's tumble/multiplier/spine
  components were deleted, not adapted; storybook stories were dropped.

## Schema / plumbing mismatches bridged

1. **Event vocabulary.** SDK plumbing (utils-xstate `getBetType`,
   utils-book helpers) is built around Vaultbreak/sample events
   (`reveal`, `setTotalWin`, `freeSpinTrigger`…). Eclipse books use
   only `spin`, `bonusStart`, `bonusEnd`, `finalWin`. Bridged at app
   level (no shared-package edits):
   - `checkIsBonusGame` in `game/actor.ts` checks for a `bonusStart`
     event instead of `checkIsMultipleRevealEvents` (which counts
     `reveal`s and would never fire).
   - Win accounting rides on `finalWin` + handler-accumulated running
     totals written to `stateBet.winBookEventAmount`; there is no
     `setTotalWin` event to lean on.
   - `winLevel` is absent from Eclipse books, so win presentation
     level is derived in the handler map from payout multiple of the
     round's total cost (`game/winLevelMap.ts`).
2. **`bonusStart` field name.** The books use `spins`, not
   `spinsAwarded` (prototype brief wording). Types follow the books.
3. **Amounts.** Eclipse book amounts are in the SDK's standard book
   units (100 = 1× base bet), so `bookEventAmountToCurrencyString`
   reconciles displays exactly: per-spin wins, the running WIN readout
   and `finalWin` all come straight from book fields; `finalWin`
   snaps the displayed total to the book amount. Verified against the
   catalogs: across 105,010 sampled spins, Σ `wins[].amount` ==
   `rawWin` always, `win` ≤ `rawWin` (cap), and no-modifier spins
   always have `board` == `before`.
4. **Column heights.** Fracture grows columns to 8. The board renders
   each column inside the fixed board height (cells divide it — the
   prototype's flex-column behaviour), so 4–8 rows need no layout
   change; ways count is the product of live column lengths.
5. **Resume.** `convertToResumableBet` keeps **all** pre-resume events
   in the snapshot (Vaultbreak filtered to four types) because the
   Eclipse snapshot handler rebuilds the board, feature state and
   running totals by scanning them.
6. **Mode keys.** `stateMeta.betModeMeta` keys/`mode` values and
   `config.betModes` match `math_v2/index.json` exactly
   (`base` 1, `surge` 75, `fracture` 100, `echo` 150, `eclipse` 300);
   RTPs in config/meta are the exact math_v2 lookup values (~96.3%).

## Placeholder inventory (must be replaced by final art/audio)

- `SymbolCell` — flat colour plates + letters (palette from the
  prototype). Replace with atlas sprites + state animations.
- `CorePip` — flat rounded squares with ✦/· glyphs.
- `Background` — flat navy field, soft disc + star speckle shapes.
- `Board` cabinet — flat framed rectangle; modifier banner is a flat
  colour bar + text.
- `EclipseControls` plates/dial — flat rectangles and a flat disc.
- `FreeSpinIntro` / `FreeSpinOutro` / `Win` — flat panels + text
  (Win has a working count-up tween; outro amount is static text —
  add the count-up when art lands).
- `LoadingScreen` + the `+layout` branded loader — flat field, title
  text, `assets/eclipse_cover.jpg` placeholder cover (PIL-drawn).
- `modals/*` — flat HTML panels (functional, placeholder styling).
- `static/assets/rules/*.png` — flat letter tiles used as modal
  paytable/rules icons.
- Audio — **silent** mp3 bank; every name in `game/sound.ts` is a
  contract only (`bgm_main`, `bgm_freespin`, `sfx_*`). Real mix must
  keep the one-format (mp3) rule.
- `static/favicon.svg` — simple crescent mark.
- Fonts — everything renders in proxima-nova (typekit) text; no
  bitmap/display font yet.

## INTEGRATION — production art wired in (2026-11-08)

The production art set (`art/production/`, see its INVENTORY.md) is
integrated. Rebuild the textures any time with
`art/production/make_game_assets.py` (masters → game-resolution assets).

**Asset layout (all under `static/assets/`):**

- `sprites/game/game.{json,webp}` — the game atlas (TexturePacker hash
  format, 2048×1990, 21 frames): 7 symbols @256, 4 cores @128,
  4 medallions @256, spin dial @512, fx_light_burst @512,
  fx_ember_puff @256, fx_corona_ring @1024, plate_wide 768×192,
  plate_light 320×320. Registered as `gameAtlas` (type `sprites`) in
  `game/assets.ts`; frames register under the TEXTURE_KEYS names.
- `sprites/scene/bg_base.webp` (2048×1152) + `wordmark.webp`
  (1400×700, alpha) — type `sprite` entries keyed `bg_base`/`wordmark`.
- `plates/plate_{wide,light}.png`, `medallions/{surge,fracture,echo,eclipse}.webp`,
  `sprites/scene/stone_tile.webp` — statics for the HTML modal layer.
- `rules/*.png` — the flat letter tiles were overwritten with real art
  renders (symbols from the tiles, features from the medallions).

**Open key questions from the inventory — resolved:**

- **Core colourways:** TEXTURE_KEYS gained `coreLitByReel` =
  `[core_lit_teal, core_lit_amber, core_lit_violet]` + `coreLitKey(reel)`
  (reel 0 teal, 1 amber, 2 violet, repeat). CorePip takes a `reel` prop.
  Round assets (cores, medallions, dial) got circular alpha masks fitted
  to the painted disc — no runtime tinting of a single master.
- **Feature medallions:** keys `medallion_{surge,fracture,echo}` from the
  masters; `medallion_eclipse` was derived (dial-centre stone disc +
  corona ring composite) since no eclipse medallion was commissioned.
  Buy panel shows them via `meta.ts` modeAssets → `assets/medallions/*.webp`;
  board banner + FS intro/outro use the atlas frames.
- **bg_feature:** derived at runtime, no asset — `Background.svelte`
  layers `fx_corona_ring` (additive, breathing) over `bg_base` in free
  spins. The old `backgroundFeature` key was removed from TEXTURE_KEYS.
- **plate_wide / plate_light:** no plate asset was commissioned, so both
  were synthesised from the spin-dial plate family (dial-centre stone
  fill, mirror-tiled; rim strips sampled from the dial's engraved rings;
  rounded-corner alpha). Every pixi plate (controls, banner, FS panels,
  counter) and every modal button uses them — the four CSS gradients in
  the modal layer (ModalShell panel, .buy, .confirm, .start) are gone.
- **Wordmark:** luma-keyed from its black ground to alpha
  (ramp 14→110), shipped as a `sprite` asset; used by Background,
  LoadingScreen and the DOM ff-loader (which also got the real scene
  cover — `eclipse_cover.jpg` is now a bg_base render, not PIL art).

**Alpha discipline (Vaultbreak V27/V28 lesson):** the atlas webp was
saved from the RGBA atlas image (never via RGB). Pixel checks, recorded
from the packing run: plate_wide rounded corner → alpha 0 in BOTH
`atlas/game.png` (QA copy, kept in `art/production/atlas/`, not shipped)
and the shipped `game.webp`; medallion_surge square corner → alpha 0 in
both; wordmark corner → (0,0,0,0). (Atlas pixel (0,0) is a frame pixel —
the corona ring's black ground — not padding.) Both outputs are RGBA.

**Renderer wiring:** SymbolCell renders atlas sprites; states keep the
scaffold contract — `win` = additive light burst behind the tile,
`transform` = tinted burst/pops per modifier (surge teal, fracture
amber, echo violet + ember-puff streak, eclipse gold), `land` = ember
puff at the cell foot, idle WILD = faint burst shimmer. CorePip renders
socket sprites + a reacting flare. The SPIN dial is the painted dial
sprite with the app-rendered SPIN/STOP label centred on its empty stone
centre, really rotating while a round plays; hover/press factors fold
into width/height everywhere (no `scale` + width/height anywhere).
Board cabinet rectangle removed — the board floats on the scene.

**Build:** green (`pnpm build`, verified on disk; bundle references the
new keys/atlas). Distribution zip
`~/workspace/projects/ruthless-eclipse/builds/eclipse_frontend_v1.zip`
= **3,116,786 B (2.97 MiB)** — budget ≤12 MB ✓. Build dir 4.6 MiB.
Largest shipped files: index.html 1.08 MB, JS bundle 1.06 MB,
game.webp 0.58 MB, wordmark.webp 0.27 MB, plate statics 0.16/0.15 MB,
bg_base.webp 0.14 MB. No art asset >1 MB.
(Previous zip 4,273,757 B; the drop is the loader swap below.)

**Still placeholder / not yet done (explicit):**

- **Loader — DONE (2026-11-09).** The stock `stake-engine-loader.gif`
  (1,297,992 B) is deleted from `static/` and unreferenced. Stage 1 of
  the loading flow is now the Eclipse-owned `components/LoaderEclipse.svelte`,
  mirroring the LoaderStakeEngine/LoaderBase contract (~2 s dwell, fade,
  oncomplete → the branded ff-loader): the luma-keyed wordmark over the
  painted corona ring (standalone `assets/sprites/scene/corona_ring.webp`,
  extracted from the `fx_corona_ring` atlas frame; the frame ships on
  black, so the DOM renders it with `mix-blend-mode: screen`, the CSS
  equivalent of the game's additive FX) plus a gold CSS progress bar.
  The pixi `LoadingScreen` also turns the corona ring (additive, slow
  rotation) behind the wordmark. **Loader art cost: 304,536 B total**
  (wordmark 269,268 — shared with the scene — + corona 35,268), inside
  the art bible §6 ≤400 KB loader budget.
- **Authored animation sequences** — Surge flood / Fracture crack /
  Echo streak are placeholder-fidelity FX overlays on the `transform`
  hook (bursts/puffs/tints), not frame-authored set pieces. Symbol
  idle/land/win are stubs of the same kind. Win-tier ceremonies
  (big ≥15× / mega ≥50× / cap) beyond the Win burst are not built;
  FS outro amount is still static text (no count-up).
- **Audio** — still the silent mp3 bank; every `game/sound.ts` name is
  a contract only.
- **Display font — DONE (2026-11-09).** **Cinzel Decorative** (by
  Natanael Gama; SIL Open Font License 1.1 — license text ships at
  `static/assets/fonts/OFL-CinzelDecorative.txt`), an engraved Roman
  display serif matching the painted gold wordmark. Self-hosted latin
  woff2 subsets, weights 700 + 900 (15,488 + 14,568 B; no external
  requests at runtime), registered via `@font-face` in
  `routes/+layout.svelte`, which also preloads both weights via
  `document.fonts.load` so pixi text renders in the face from its first
  frame. Pixi components reference it via `DISPLAY_FONT_FAMILY` in
  `game/constants.ts`. Applied to: LoadingScreen "LOADING" +
  PressToContinue, Win title + amount, FreeSpinIntro/Outro titles and
  amounts, the Board modifier banner, the EclipseControls readout
  values (BALANCE/WIN/BET), the FreeSpinCounter feature-win line, both
  loader "LOADING" labels, all modal titles (ModalShell `h2`) and the
  buy-card titles. Body, rules and list text stay in proxima-nova.
- **plate_light** is packed and shipped as a static but currently has
  no near-square surface using it; reserved for the settings/bet-menu
  restyle.
- **`loader.gif` (78 KB)** — small generic spinner in static/, unused
  by the new loading flow.
- Buy panel still has no embedded bet stepping (noted in the scaffold
  section above; floating steppers cover it).

## V2 FIXES — first live playtest defects (2026-11-09)

Distribution zip `~/workspace/projects/ruthless-eclipse/builds/eclipse_frontend_v2.zip`
= **3,117,719 B (2.97 MiB)** — budget ≤12 MB ✓. Build green (verified on
disk; bundle spot-checked for the new strings). Math, book data and mode
config untouched.

**A. Base-game modifier visibility — investigated; cause is the math,
not the playback path.** The spin handler
(`game/bookEventHandlerMap.ts`, step 2) applies the reaction for every
spin unconditionally — `inFeature` gates only the FS counters/totals,
never the transform: it computes `changedCells`, shows the banner, and
swaps `stateGame.board = bookEvent.board` mid-banner in base game and
features alike; `Board.svelte` derives the `transform` cell state from
`changedCells` with no feature condition. The books agree: in a 60,000
base-book sample the modifier is a pure function of lit cores
(1→surge, 2→fracture, 3→echo, 0/4/5→none), zero exceptions. **But the
board only actually changes on ~10% of lit-core base spins** (surge
2,443/23,829, fracture 1,233/11,277, echo 285/2,754 changed) — math_v2's
base wild activation is only ~1.7–2.7% per reel, so ~90% of lit-core
base spins have no wild-bearing reel for the reaction to act on;
`board == before`, the banner shows, and nothing visibly transforms.
That is correct behaviour for those books, not a missed application.
When a transformation does occur it is now harder to miss: fix D makes
the lit pips actually visible (they were under the wordmark), and fix E
keeps the transform rim-halo readable without the white-out.

**B. Feature win-line list did not sum to the spin's win — stale state,
plus a latent cap.** Two defects: (1) the previous spin's win list
stayed on screen through the next spin's roll + core-light + banner
phases (~1.4 s of every spin) because `currentWins` was only cleared
*after* the roll wait — during features an observer reads the prior
spin's lines (e.g. $14.93) against the current spin's increment
($75.12) while the cumulative readouts stay correct. (2) `Board.svelte`
rendered `currentWins.slice(0, 4)` plus a "+ N MORE WINS" line with no
amount — a latent truncation (sampled books max out at 4 lines/spin
today, but the format allows one line per paying symbol = 6).
Fixes: the handler now clears `currentWins`/highlights/changed cells
(and the new `stateGame.currentSpinWin`/`currentSpinRawWin`) at spin
start, before the roll, and records the spin's `win`/`rawWin` when the
wins present; `beginRound` clears them too. The list renders **every**
win line — one column up to 4 lines, two columns at 5–6 — and a footer
reconciles it: `TOTAL — $X` (the spin's paid win), or `TOTAL AFTER
20,000× CAP — $X` on the rare spins where the book's lines sum to
`rawWin` but the cap paid less. The list appears complete with the win
presentation and persists until the next spin starts.

**C. ENTER THE FORGE sub-label clipped its final "×".** The one-line
string ("SURGE 75× · FRACTURE 100× · ECHO 150× · ECLIPSE 300×", 52
glyphs ≈ 380 px at 11 px + letter-spacing) exceeded both plate widths
(300 landscape / 220 stacked). Fix: the plate button takes a second
sub-line; the label now runs "SURGE 75× · FRACTURE 100×" /
"ECHO 150× · ECLIPSE 300×" at 10 px, no letter-spacing — each line
≈150 px, fitting the 220 px stacked plate with ~35 px margin per side.
Main label drops to 15 px in the two-line layout; plate size/positions
unchanged in both layouts.

**D. Core pips overlapped the wordmark.** `Background.svelte` placed
the wordmark at a fixed canvas slot (y=16, up to 440×220 px) while the
board block is stage-centred and scaled — e.g. on a 1600×900 canvas the
pips row lands at y≈123–166, squarely inside the wordmark's 16–236
band, and the board renders after the background, so the pips drew over
the letters. Fix: the pips stay where the approved reference frame puts
them (sockets on the board frame's top rail); the wordmark moved
up/back onto the eclipse halo and is now sized from the board's own
layout math — the main stage transform (`mainLayout.scale`) gives the
pips row's exact canvas-space top edge, and the wordmark's width is
capped so its bottom always ends ≥5 px above it, at every aspect
(verified arithmetically for desktop 1600×900, landscape-phone
800×360, portrait 450×800 and square-tablet cases). A soft additive
corona ring now sits behind the wordmark so it reads as riding the
halo; if a viewport is too short for a ≥30 px wordmark it is hidden
rather than allowed to collide.

**E. Surge flare washed out the WILD lettering.** The transform burst
ran at 2.1× cell size and up to 0.85 additive alpha; sibling draw order
means each cell's burst is painted after the previous cells' tiles, so
the oversized glow flooded transformed columns and bleached the WILD
art. Fix (`SymbolCell.svelte`): the transform burst is now a rim halo —
1.45× cell size, alpha 0.18 + pulse×0.16 (max ~0.34) — still behind the
tile; the echo ghost puff moved from over the symbol (1.8×, up to 0.65
alpha) to behind it (1.3×, ≤0.28). The transformation still reads
clearly via the tinted rim, the pop, and the tile swap itself; win-state
bursts are unchanged.

## PHASE 2B — authored animation layer + provisional sound (2026-11-09)

Distribution zip `~/workspace/projects/ruthless-eclipse/builds/eclipse_frontend_v3.zip`
= **3,564,570 B (3.40 MiB)** — budget ≤12 MB ✓. Build green (verified on
disk; bundle spot-checked for the new sound names). Math, book data and
mode config untouched; v1/v2 zips untouched.

**Transformation set pieces — AUTHORED (replacing the placeholder
tinted-burst treatment).** Intermediate frames are computed by
`game/transforms.ts`, a TypeScript port of the proven Python evaluator
(surge = wild reels fill to four wilds; echo = snapshot copies to the
right, last reel left; fracture = a copy inserted after each wild;
eclipse = surge → echo → fracture). The port was validated offline
against the catalogs before integration: 37,047 modifier spins sampled
across all five modes, applyModifier / stage-plan final boards / stage
diffs all matching the books exactly. The book's `board` remains the
settle authority — the handler snaps to it after the final stage, so a
choreography bug could only ever cost a mid-animation frame, never a
settled board.

- **SURGE:** a teal flood wash (ember-puff column wash + light-burst
  front, board-level overlays) pours down each wild-bearing column;
  the handler flips cells to WILD row by row (~75 ms/row) in step with
  the front, then a settle beat. Rim halos mark flipped cells.
- **FRACTURE:** wild cells crack first — amber crack flash + a
  positional jitter (240 ms) — then the board swaps to the grown
  columns: duplicates pop in with the transform state and a stone-dust
  puff at the cell foot (380 ms settle).
- **ECHO:** ghost WILD tiles (violet-tinted atlas sprites) streak
  simultaneously from every source wild to its target cell on an eased
  arc (300 ms), the board swaps, and corona-ring ripples expand on the
  targets as they solidify (220 ms).
- **ECLIPSE:** the three stages compose in evaluator order at 0.72×
  stage scale (total ≈1.4 s) with an expanding corona pulse + swell at
  each stage boundary.
- A modifier whose book board changes nothing (no wild-bearing reel —
  the common base-game case from V2 fix A) still gets its banner +
  pip flare beat, shortened; no fake board changes are ever shown.

**Base-spin choreography (spec §Base spin) — AUTHORED.** Columns drop
in left → right (70 ms stagger, 150 ms ease-out drop, ember puff on
landing, pitched stone land sound per reel). Core reveal is now the
suspense beat it was specced to be: pips sweep in reel order at 38 ms
steps, an unrevealed pip renders as a dim socket, the freshest lit pip
flares, and each lit pip chimes at a pitch rising with the lit count.
Ways pass: win lines flare highest-value first (cumulative highlights)
while the list prints in book order — both complete together and the
reconciling TOTAL footer appears only on completion, preserving V2
fix B's exact-sum invariant. Non-winning symbols dim to 55% per spec
(was 32%).

**Win ceremonies — AUTHORED, tiered on round multiple (spec):**
<3× readout only; 3–15× a gold light sweep crosses the board (no
overlay); 15–50× BIG — overlay with plate_light behind the amount,
ember storm, accelerating roll-up (cubicIn count-up + handler-driven
ticks accelerating 130 ms → 42 ms over a coin-shimmer loop); 50×+ MEGA
adds an expanding corona flare + screen-edge glow and a longer window;
round-cap totals get MAX WIN + a full-screen corona. **Every overlay
ceremony is skippable on press** (full-screen press layer in Win.svelte
sets `skipRequested`; the dial/stop path also works) — a skip snaps the
count-up to the exact book amount — and hard-capped: the ceremony loop
is bounded by the same duration it presents. A stop press that
fast-forwarded the spins does not eat the ceremony: it starts
un-skipped and only a fresh press during it snaps.

**Free spins — AUTHORED.** Intro: the derived bg_feature corona is up
behind the overlay (gameType flips first), the feature medallion slams
in with a back-out overshoot, and the awarded spin count lights up as
core orbs in sequence. During the feature a soft rim back-glow in the
modifier's colour burns behind the board. Outro: the feature total now
counts up (was static text) while a corona ring opens behind the
medallion; BIG/MEGA/cap feature totals then earn the full overlay
ceremony as before.

**Pacing — spec factors.** The handler's waits now apply turbo ×0.45 /
autoplay ×0.8 (replacing the SDK timeScale ÷2, which read ×0.5 and
ignored autoplay). All choreography clocks the render layer paints
from (stage duration, spin start) are the pace-scaled real durations,
so visuals and flow stay in step.

**Engineering rules held:** every awaited presentation resolves via
bounded skip-polling waits (40 ms slices) — components never gate flow,
their rAF clocks only paint progress against handler timestamps;
tween/animation values are component-level `$state` primitives or
wholesale-replaced arrays (streak/fx descriptors are written once per
stage, never mutated); no `scale` alongside width/height anywhere;
no code-drawn shapes on the win path (all celebration visuals are the
FX atlas sprites; the Win scrim is the pre-existing dim backdrop).

**Sound — PROVISIONAL synthesized bank.** The spec's event list is
wired at the presentation beats (dial/spin via the existing contracts;
per-reel pitched land thumps; per-count rising core chimes; surge /
fracture / echo / eclipse-stage stingers; win small/big/mega +
roll-up tick + coin loop; fs intro/end; buy-confirm forge clang in the
confirm modal; ambient pad loops for bgm_main / bgm_freespin).
The bank itself is **programmatic synthesis, not a produced mix**:
`art/production/make_sounds.py` (ffmpeg + numpy) builds bells from
inharmonic sine partials, stone thumps and cracks from filtered noise,
sweeps from bandpassed noise, and seamless pad loops from periodic
synthesis, assembles them into one Howler audiosprite
(`static/assets/audio/sounds.mp3`, 519,985 B — under the 1.5 MB cap,
mp3 only), RMS-normalised per segment; sprite offsets were verified
against a decode pass (0 ms encoder lag after compensation).
`game/sound.ts` names are the permanent contract — a produced mix only
replaces the sprite media. Identity (deep forge + celestial) and event
shapes are right; timbral richness is placeholder-grade.

**Still provisional / not done after 2b:** the sound bank's production
quality (above); symbol idle motion remains the WILD shimmer stub (no
per-symbol idle loops); the loader `loader.gif` generic spinner and
`plate_light`'s modal-surface use are unchanged from the integration
notes; buy panel still has no embedded bet stepping.

## Playback summary (what the state machine does)

- **Base spin:** placeholder roll → `before` board lands → cores light
  (pip row above the board) → if a modifier fired, banner shows and
  the board swaps to `board` with changed cells marked `transform`
  → wins highlight (`win` state), the ways-win list prints each book
  win line (symbol ×length — ways — amount), and the WIN readout
  rolls to the running round total.
- **Free spins:** `bonusStart` → intro panel (feature + spins) and FS
  music → spins play with the counter (played/total + feature win)
  → `bonusEnd` → outro panel with the feature total → big-win
  presentation when the feature total qualifies.
- **Buys:** ENTER THE FORGE → owned buy panel (4 buys at
  bet × 75/100/150/300) → owned confirm → bet plays.
- **Reconciliation:** balance/bet come from the SDK bet machine and
  session state; every win figure displayed is a book amount in book
  units through the SDK's own converters — no frontend arithmetic on
  payouts beyond summing the book's own per-spin `win` fields, and
  `finalWin` is authoritative.

## V4 — playtest/GPT-round fixes SHIPPED (2026-11-09)

eclipse_frontend_v4.zip 2,853,731 B, byte-verified in Drive folder
"Ruthless Eclipse — Stake Engine upload" (1wJg2gy7QsfqkXX5O6R6m-ZVGGz9r3ZSp);
~711 KB lighter than v3. Fixes: win-list backing plate + TOTAL footer
16px bright gold (was occluded/dim); outro CONTINUE click-through killed
via stateGame.inputLockUntil (+700ms) + dial guard while theatre is up;
SDK sample metadata stripped from packages/state-shared DEFAULT metas
(bundle greps: SUPERANTE / "example banner" / test-fart all 0); rules
PNG→WebP (−707 KB); Eclipse buy card copy "6 free spins · SURGE → ECHO →
FRACTURE"; core pips unified amber. Bundle dedup investigated —
index.html references the external bundle.js by name, both copies stay.

## Math v3 ("Claude's way") — verified + staged (2026-11-09)

Generated at Claude's densities (base flat ~9% wild/reel, eclipse FS
q=0.053, 3,000 forced-trigger base books) and solved by exponential
tilting: lookup RTP exactly 96.3000% all five modes; 584 sampled books
replay clean through the evaluator; trigger mass pinned to 0.04054%.
Staged in Drive "IMPORT — Ruthless Eclipse Math v3"
(1S5o0YuTbamd_v92HQcNnydTxWiNe4G7D), 11 files byte-verified. Private
GitHub repo ChuckTHUNDER69/ruthless-eclipse holds engine + v3 bundle +
HANDOVER_FOR_CLAUDE.md for Claude's connector test round.

## V5 — v4-playtest fixes SHIPPED (2026-11-09)

eclipse_frontend_v5.zip 2,853,852 B, byte-verified in the Eclipse
upload folder. From the /3/5 playtest (reconciliation exact,
$1,000 → $1,514.71; math v3 feel confirmed — wilds on 4/12 base spins,
Echo feature $584.59, Eclipse $378.31; click-through substantively
dead — outros are timed auto-dismiss cards, no Continue button by
design): (1) TOTAL footer made unmistakable — 19px saturated gold
0xffd24a, gold rule above, plate alpha 0.8, no em-dash (v4's footer
matched the lines' styling and read as another line); (2)
FreeSpinCounter moved top-right → top-left (it sat under the player's
sound control and clipped); (3) bonusEnd restores INITIAL_BOARD so a
Fracture-grown 8-high board no longer lingers as the idle board.
Observed once: control overlaps at a 667×548 viewport when the test
window resized itself — likely harness artifact, watch on real devices.
