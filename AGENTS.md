# AGENTS.md

Orientation for coding agents working on `gta11`. See `README.md` for the user-facing overview and `docs/gta11-architecture.md` for the full architecture writeup — this file is the short version plus gotchas.

## Setup and commands

Package manager is pnpm (not npm — no `package-lock.json`).

```bash
pnpm install
pnpm dev          # vite dev server
pnpm test         # vitest run (full suite)
pnpm typecheck    # tsc -b --pretty false, no emit
pnpm build        # typecheck then production build
```

Before committing: `pnpm test && pnpm typecheck && pnpm build`. There is no lint script — `tslint.json` is a pre-Vite leftover, not wired to any command.

## Architecture boundary (load-bearing, do not violate)

R3F owns the canvas and frame loop; `World` (`src/ts/world/World.ts`) owns game logic. `src/game/runtime/GameRuntime.tsx` constructs `World` in "externally managed" mode (`runtime: { renderer, camera, canvas }`) and drives it via `useFrame`. In that mode `World` must never create its own `WebGLRenderer`, touch `document.body`, register a `resize` listener, or call `requestAnimationFrame` — doing so reintroduces a second render loop. The non-externally-managed constructor branch is legacy standalone mode, kept only for backward compat.

Legacy simulation code (`src/ts/**`) reaches the React UI only through `src/game/ui/gameUiStore.ts`, a hand-rolled external store (`useSyncExternalStore`). Don't have `src/ts/**` code touch the DOM or import React.

## Gotchas

- **Cannon.js import**: `import * as CANNON from 'cannon'` resolves via a Vite alias (`vite.config.ts`) to `src/lib/cannon/cannon.js`, not an npm package. This preserves the exact legacy physics build — don't "fix" it to point at `cannon-es` or similar.
- **Generated model files** (`src/game/models/*.tsx`, except `index.ts`): produced by `pnpm build:models` (gltfjsx) from `public/assets/*.glb`. Manual touch-ups required after regeneration are documented at the top of `tools/build-model-components.mjs` — read them before regenerating.
- **Asset paths**: GLBs are served from `public/assets/*` as stable root URLs. Each model's `.tsx` component exports a `MODEL_PATH` constant; consume that instead of hardcoding `/assets/*.glb` strings.
- **`GameSettings.tsx`** mutates simulation state only through named `World` setter methods (`setFxaa`, `setShadows`, `setDebugPhysics`, etc.), never by reaching into `world.params` directly.

## Code layout

- `src/ts/**` — legacy imperative simulation, mostly untouched by the React/R3F migration: `world/`, `characters/` (+ `character_states/`, `character_ai/`), `vehicles/`, `physics/` (colliders, spring-damper simulators), `core/` (`InputManager`, `CameraOperator`, `FunctionLibrary`, `LoadingManager`, `UIManager`, `InfoStack`, `KeyBinding`), `interfaces/`, `enums/`.
- `src/game/**` — the React/R3F shell: `runtime/GameRuntime.tsx` (World bridge), `ui/` (HUD components + `gameUiStore`), `models/` (generated GLTFJSX components).
- `tools/*.mjs` — asset-generation scripts (`build:map`, `build:models`), run manually, not part of the build.

## Tests

Vitest + Testing Library + jsdom. Tests sit next to the code they cover (`Foo.ts` / `Foo.test.ts`). `src/test/createTestWorld.ts` builds a `World` in tests without a real R3F canvas.
