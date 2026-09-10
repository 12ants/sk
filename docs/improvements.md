# project improvements

This doc captures concrete improvement ideas for `gta11`, grouped by area. Sorted roughly by impact and effort.

Status as of 2026-09-10: items 3 and 11 implemented (see `Done` markers). Item 4 partially implemented
(Prettier landed, ESLint blocked upstream). Item 6 implemented. Item 7's two bullets were checked and found
already-correct / actively harmful respectively — see notes inline. Items 1, 2, 5, 8, 9, 10 deferred with
reasons below.

---

## 1. Type safety

- Enable strict TypeScript in `tsconfig.app.json`: set `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. This will surface many latent `any` types (`InputManager.domElement`, object traversals in `FunctionLibrary`).
- Encapsulate `World` public mutable fields (`renderer`, `camera`, `canvas`, `graphicsWorld`, `physicsWorld`, `params`, `updatables`, etc.). Make them private/protected and expose only the minimal API needed by `GameRuntime.tsx` and `gameUiStore`. This enforces the externally-managed invariant at compile time.

**Deferred.** `strict: true` on a 700-line physics monolith with `allowJs` and a hand-rolled `cannon.d.ts` will
surface an unbounded number of errors that can't be triaged and fixed safely in one pass. `World.composer` and
`World.parallelPairs` (both called out above) were removed entirely as part of item 3 below, which already
shrinks the `any` surface. Recommend enabling `noUnusedLocals`/`noUnusedParameters` first in a follow-up PR,
checking the error count before committing to `strict`.

## 2. Reduce `World.ts` monolith

`src/ts/world/World.ts` (~700 lines) mixes scene loading, physics setup, render-loop timing, entity lifecycle, settings, FPS recording, and bounds checking. Extract into focused classes:

- `SceneLoader` — GLB parsing, scenario/spawn-point extraction
- `PhysicsManager` — Cannon world setup, stepping, debug renderer
- `EntityManager` — character/vehicle/updatable registries
- `RenderLoop` — delta time, FPS, bounds checks
- `SettingsManager` — settings snapshot/subscribe

**Deferred.** A five-way class extraction touches every code path in the game loop and can't be smoke-tested
in a browser from this environment. Green tests/typecheck/build would not catch a broken render or physics
step. Recommend doing this with a real browser open, one extraction at a time, each verified by playing the
game.

## 3. Remove legacy standalone branch — Done

The `if (!this.externallyManaged)` constructor branch in `World.ts` still creates its own `WebGLRenderer`, registers `resize`, calls `requestAnimationFrame`, and builds `EffectComposer`. This is dead code for the React app and adds complexity/risk. Mark it deprecated, then remove it after verifying no tests depend on it.

**Done.** Verified first: every `new World(...)` call site in the codebase (`GameRuntime.tsx`,
`createTestWorld.ts`, all of `GameRuntime.test.tsx`) always passes `runtime`, so `externallyManaged` was always
`true` and the standalone branch was never exercised. Removed the branch along with everything it alone used:
`composer`, `EffectComposer`/`RenderPass`/`ShaderPass`/`FXAAShader` imports, the `Detector.webgl` check, the
own-renderer/own-canvas fallback, the `resize` listener, the `render()` render-loop method, and the
now-dead `clock`/`renderDelta`/`logicDelta`/`requestDelta`/`sinceLastFrame`/`justRendered`/`animationFrameId`/
`onWindowResize`/`ownedDomNodes` fields. `WorldOptions.runtime` is now required instead of optional.
Also removed `World.parallelPairs` (an `any[]` that was only ever assigned `[]`, never read).
Production bundle shrank from 1910 KB to 1895 KB (pre-gzip) as a result.

Two things this leaves for follow-up:
- `src/lib/utils/Detector.ts` (the WebGL-support check) is no longer called by `World`, so a browser without
  WebGL no longer gets the `gameUiStore.setError(...)` message it used to get. R3F's `Canvas` has its own
  fallback story that could replace this; worth a deliberate decision rather than silently losing the check.
- Not smoke-tested in a real browser. `pnpm test`, `pnpm typecheck`, and `pnpm build` are all green, and
  `GameRuntime.test.tsx` exercises the externally-managed construction/dispose/tick path with a real R3F test
  renderer, but nothing here proves the game still renders correctly end to end.

## 4. Linting and formatting

- Add ESLint + `@typescript-eslint` + `eslint-plugin-react` + `eslint-plugin-jsx-a11y`.
- Wire it into a `pnpm lint` script.
- Add Prettier for consistent formatting. Currently there is no enforced style guide beyond ad-hoc conventions.

**Blocked upstream (ESLint half).** `typescript-eslint` 8.70.0 — both `latest` and the `canary` tag on npm as
of this writing — hard-throws `typescript-eslint does not support TS 7.0.` at module load, in both the parser
and the plugin package, regardless of whether type-aware rules are used. This project pins `typescript@7.0.2`.
Tracked upstream in `typescript-eslint#10940` (referenced directly in the error text). Do not downgrade the
project's TypeScript to work around a lint tool. Revisit once typescript-eslint ships TS 7 support.

**Partially done (Prettier half).** Added `prettier` + `.prettierrc.json` (`useTabs: true` to match the
codebase's existing tab-indent convention, avoiding a style flip-flop) and a `pnpm format` (`--check`) script.
Removed the now-obsolete `tslint.json` (TSLint has been deprecated since 2019 and nothing in the repo ran it).
Did **not** run `prettier --write` across the repo: 154 existing files don't match Prettier's formatting yet,
and reformatting all of them in this PR would produce a huge, unrelated diff. Recommended follow-up: a
dedicated "reformat with Prettier" PR (`pnpm exec prettier --write .`) with no other changes, so it's easy to
review and doesn't get tangled with functional diffs.

## 5. Testing gaps

- Core classes (`Character`, `Vehicle`, `Car`, `Scenario`, `CameraOperator`) have no visible tests.
- `src/test/createTestWorld.ts` is minimal. Expand it into a proper factory with mocked Three.js/Cannon objects so simulation logic can be tested without R3F.
- Add tests for `gameUiStore` (subscribe/getSnapshot contract) and `GameSettings.tsx` (setter-method invocations).

**Deferred.** Writing tests for `Character`/`Vehicle`/`Car`/`Scenario`/`CameraOperator` requires designing the
mocked-Three.js/Cannon test factory first (the second bullet), which is itself a design decision (how much of
the physics/render stack to fake vs. exercise for real) best made with the person who'll maintain these tests,
not assumed silently in this pass.

## 6. CI/CD and quality gates

- Add a GitHub Actions workflow running `pnpm install && pnpm test && pnpm typecheck && pnpm build` on PRs.
- Optionally add Husky + lint-staged for pre-commit checks.

**Done.** Added `.github/workflows/ci.yml` running exactly those four steps (`pnpm install --frozen-lockfile`,
`pnpm test`, `pnpm typecheck`, `pnpm build`) on pull requests and pushes to `main`, pinned to pnpm 12 / Node 22.
This is the same sequence verified green locally before every change in this pass, so the workflow is
verified by construction. Left the `pnpm lint` / Husky + lint-staged steps out, since item 4's ESLint half is
blocked (see above) and there's nothing to gate on yet.

## 7. Repository metadata

- Fix `package.json` `repository.url` — currently points to `https://github.com/12ants/sk.git`; update to the actual remote.
- Remove `pnpm-workspace.yaml` — the project is a single package with no `packages/` or `apps/` directories.

**Checked, first bullet already correct.** `git remote -v` shows `git@github.com:12ants/sk.git`, which is the
same repo as the `https://github.com/12ants/sk.git` already in `package.json` (only the protocol differs).
Nothing to change.

**Checked, second bullet would break the build — not applied.** `pnpm-workspace.yaml` doesn't define any
`packages:` glob; under pnpm 12 (the version pinned via `packageManager`-less lockfile and installed here) it
carries functional settings — `allowBuilds` (esbuild/sharp) and `minimumReleaseAgeExclude` — that pnpm moved
out of `.npmrc` in recent versions and that have no `.npmrc` equivalent. Deleting the file would silently drop
those settings. Left in place.

## 8. Asset pipeline automation

`tools/build-model-components.mjs` documents manual touch-ups required after each `pnpm build:models`. Automate these in the script so regenerating models is a single command.

**Deferred.** Requires reading the manual touch-up steps the script currently documents and re-running the
full model build pipeline (including visual verification of the regenerated components) to confirm automation
doesn't silently change output. Out of scope for a pass without asset regeneration in the loop.

## 9. Model index maintainability

`src/game/models/index.ts` manually maps GLB names to constants. Consider generating this index from `public/assets/` during `build:models`.

**Deferred, same reason as item 8** — this touches the same `build:models` pipeline and should land together
with it, verified against a real model build.

## 10. Physics engine health

Cannon.js is unmaintained. While the Vite alias to `src/lib/cannon/cannon.js` must be preserved per project rules, document a migration path to `cannon-es` or `rapier` so the project is not stuck on dead physics if a security or compatibility issue arises.

**Deferred, documentation-only note.** `cannon-es` is the actively-maintained TypeScript fork of Cannon.js with
a near-identical API (same `Body`/`World`/`Shape` model), making it the lower-effort migration target versus a
rewrite onto `rapier` (a different, Rust/WASM-based API). A future migration would: (1) replace the
`cannon` → `src/lib/cannon/cannon.d.ts` path alias in `tsconfig.app.json`/`vite.config.ts` with the real
`cannon-es` package, (2) diff `src/lib/cannon/cannon.js` (the vendored, patched fork this project builds on)
against upstream `cannon-es` to find which patches need porting, (3) re-verify every collider in
`src/ts/physics/colliders/` and vehicle raycast code in `src/ts/vehicles/`, since those are the most
API-sensitive integration points. Not attempted here — it's a cross-cutting change with real behavioral risk
that needs a browser to verify, not a doc-only or mechanical change.

## 11. Configuration

- Add `.env` support via Vite (`import.meta.env`) for debug flags, asset base paths, or physics tuning.
- Centralize magic numbers (world bounds in `isOutOfBounds`, time-scale limits, camera defaults) into a `constants.ts` or `WorldSettings` defaults.

**Done (second bullet).** Added `src/ts/world/WorldConstants.ts` with `WORLD_BOUNDS`, `PHYSICS_FRAME_RATE`,
`SETTLE_SCENE_STEPS`, `TIME_SCALE_BOTTOM_LIMIT`/`TIME_SCALE_CHANGE_SPEED`/`TIME_SCALE_LERP_FACTOR`,
`DEFAULT_MOUSE_SENSITIVITY`, `DEFAULT_CAMERA_FOV`/`NEAR`/`FAR`, `DEFAULT_SUN_ELEVATION`/`ROTATION`,
`FPS_SAMPLE_INTERVAL`, and `MAX_LOGIC_TIME_STEP`. Wired into `World.ts` (bounds check, settle-scene loop,
scroll time-scale, FPS sampling, tick clamp, default params) and into `App.tsx` (camera fov/near/far, replacing
the duplicated literals that had to match the ones in test helpers by coincidence).

**Deferred (first bullet).** `.env`/`import.meta.env` support is a Vite feature with no code to point at yet —
there are no debug flags, asset base paths, or physics tuning values currently read from the environment.
Adding it now would be speculative; add it when a concrete flag needs to vary by environment.
