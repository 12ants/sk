# gta11 architecture

`gta11` is a browser 3D game — originally the "Sketchbook" engine (Three.js + Cannon.js physics: characters, vehicles, scenarios) — migrated from Webpack to pnpm + Vite + React + TypeScript + React Three Fiber (R3F) on the `gta11-r3f-vite` branch.

## What this is

The migration plan is tracked with checkboxes at `docs/superpowers/plans/2026-09-09-gta11-r3f-vite.md`; the design rationale is at `docs/superpowers/specs/2026-09-09-gta11-r3f-vite-design.md`. Read the plan doc's checkbox state before starting work to see what's done vs. remaining.

## Commands

Package manager is pnpm (not npm — `package-lock.json` was intentionally removed).

```bash
pnpm dev                              # vite dev server
pnpm build                            # tsc -b && vite build (typecheck gates the build)
pnpm preview                          # preview a production build
pnpm test                             # vitest run (full suite)
pnpm vitest run src/path/to.test.ts   # run a single test file
pnpm typecheck                        # tsc -b --pretty false, no emit
```

There is no lint script (`tslint.json` is a leftover from the pre-Vite Webpack setup, not wired to any command).

Before committing, the project convention (per the migration plan) is: `pnpm test && pnpm typecheck && pnpm build`.

## Architecture

### R3F owns the canvas; `World` owns the simulation

The core split is between the legacy imperative simulation (`src/ts/**`) and the React/R3F shell (`src/App.tsx`, `src/main.tsx`, `src/game/**`):

- `src/main.tsx` mounts React; `src/App.tsx` renders R3F's `<Canvas>` plus the HUD (`GameOverlay`).
- `src/game/runtime/GameRuntime.tsx` is the bridge: inside the `<Canvas>`, it reads R3F's `gl`/`camera` via `useThree()`, constructs a `World` in "externally managed" mode by passing `runtime: { renderer, camera, canvas }`, drives simulation ticks from `useFrame(() => world.tick(delta))`, and disposes the `World` on unmount.
- `src/ts/world/World.ts` (`World` class) is the simulation core — Cannon physics, GLTF scene loading, characters, vehicles, scenarios, input routing, the updatable registry. Its constructor branches on `this.externallyManaged` (true whenever `WorldOptions.runtime` is supplied): in that mode it must **never** create its own `WebGLRenderer`, append a canvas to `document.body`, register a `resize` listener, build an `EffectComposer`, or call `requestAnimationFrame` — R3F owns all of that. The non-externally-managed branch (legacy standalone constructor, `deprecated`) still does all of that itself and exists only for backward compat.
- This "R3F owns render/frame loop, `World` owns game logic" boundary is the load-bearing constraint of the whole migration — violating it in either direction (World touching the canvas, or GameRuntime calling `renderer.render` itself) reintroduces a second render/animation loop.

### UI bridge (imperative simulation → React)

`src/game/ui/gameUiStore.ts` is a small hand-rolled external store (`subscribe`/`getSnapshot`, consumed via `useSyncExternalStore`) that decouples the legacy simulation code from React. Legacy classes that used to touch the DOM directly now call into this store instead:

- `src/ts/core/UIManager.ts` → `setInterfaceVisible`, `setLoading`, `setStatsVisible`
- `src/ts/core/InfoStack.ts` → `pushMessage`
- `src/ts/core/LoadingManager.ts` → `setError` on asset load failure

`src/game/ui/GameOverlay.tsx` and `GameSettings.tsx` subscribe to this store and render the loading/error/welcome/controls/console/stats/settings UI that used to be generated DOM markup. `GameSettings` mutates simulation state only through named `World` setter methods (e.g. `setFxaa`, `setShadows`, `setDebugPhysics`), never by reaching into `world.params` directly from React.

### Simulation internals (`src/ts/**`, mostly untouched by the migration)

- `world/` — `World`, `Scenario` (spawn/scenario registration), `Sky`, `Ocean`, `Path`/`PathNode`, spawn points.
- `characters/` — `Character`, its state machine (`character_states/`, including vehicle entry/exit states), and AI behaviors (`character_ai/`).
- `vehicles/` — `Vehicle` base plus `Car`, `Airplane`, `Helicopter`, seats/doors/wheels.
- `physics/` — collider wrappers around Cannon shapes (`colliders/`) and spring-damper simulators used for camera/limb smoothing (`spring_simulation/`).
- `core/` — `InputManager` (keyboard/mouse/gamepad, now with an explicit `dispose()` for React unmount cleanup), `CameraOperator`, `FunctionLibrary` (math/utility helpers), `InfoStack`, `LoadingManager`, `UIManager`, `KeyBinding`.
- `interfaces/` — the contracts gluing the above together: `IWorldEntity`, `IUpdatable` (World's per-frame tick registry), `IControllable`, `IInputReceiver`, `ICharacterState`, `ICharacterAI`, `ICollider`, `ISpawnPoint`.
- `enums/` — `CollisionGroups`, `EntityType`, `SeatType`, `Side`, `Space`.
- `src/ts/sketchbook.ts` is a leftover barrel export (`export { World } from './world/World'`) from before the migration; nothing currently imports it.

### Physics import alias

Cannon.js is imported as the bare specifier `cannon` throughout `src/ts/**` (e.g. `import * as CANNON from 'cannon'`), resolved via a Vite alias in `vite.config.ts` to `src/lib/cannon/cannon.js` (typed by `src/lib/cannon/cannon.d.ts`). Don't "fix" these imports to point at an npm `cannon`/`cannon-es` package — the alias is intentional, preserving the exact legacy physics build.

### Assets

GLB models are served from `public/assets/*` (Vite public dir, stable root URLs like `/assets/small_plane.glb`). Each asset also has an editable GLTFJSX component in `src/game/models`, generated with `pnpm build:models`. Components retain the binary files for their geometry and textures. The simulation continues loading the original scene metadata for physics, seats, spawns, and animation state machines. The obsolete `world.glb` and Blender source files were removed; they remain recoverable from Git history. The pre-migration `build/` directory (Webpack bundle, `.d.ts` output, asset copies) was also removed once checksums confirmed `public/assets/*` matched.

### Tests

Vitest + Testing Library + jsdom (`src/test/setup.ts` wires `@testing-library/jest-dom/vitest`). `src/test/createTestWorld.ts` is a shared helper for constructing a `World` in tests without a real R3F canvas. Tests sit next to the code they cover (`Foo.ts` / `Foo.test.ts`).
