# Eclipse frontend source (Web SDK app)

- `eclipse-app/` — the game app (src, static assets, configs, PORT_NOTES.md).
  Lives in the Stake Engine Web SDK monorepo at `apps/eclipse`.
- `packages/` — the monorepo packages relevant to review: `pixi-svelte`
  (renderer/bootstrap), `state-shared` (bet-mode + game-rule metadata),
  `constants-shared`. The app imports other workspace packages too; the
  full SDK is Stake's own repo.

## 2026-11-09 path fix (Claude's catch, ratified)

DOM/CSS asset references were absolute (`/assets/...`) and broke under
any subpath (e.g. `/ruthless-eclipse/v6/`): loader corona + wordmark,
the Cinzel @font-face files, the cover background, modal plate and
stone-tile backgrounds — 9 references. All are now document-relative
(`assets/...`); the build inlines CSS into index.html, so they resolve
against the game folder in any deployment path. Pixi-loaded textures
were always base-relative via `game/assets.ts` (`import.meta.url`).

The "CanvasRenderer is not yet implemented" black screen reproduces
only where WebGL is unavailable (Pixi 8 has no full canvas fallback);
the same studio build passed four full browser playtests with WebGL
on. If your test browser disables WebGL, enable it to play.
