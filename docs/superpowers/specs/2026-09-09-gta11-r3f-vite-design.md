# gta11 R3F/Vite Migration Design

## Goal

Convert the existing Sketchbook Webpack application into `gta11`, a current pnpm-managed Vite, React, TypeScript, and React Three Fiber (R3F) application while preserving the existing world, physics, character, vehicle, input, scenario, and asset behavior.

## Chosen Approach

Use R3F to host the legacy simulation. The existing simulation code remains the authority for gameplay and physics. React and R3F become the authority for application bootstrap, DOM UI, WebGL canvas lifecycle, rendering, viewport sizing, and frame scheduling.

This avoids both a competing renderer loop and a high-risk rewrite of mature gameplay code.

## Runtime Architecture

- `src/main.tsx` mounts the React application.
- `src/App.tsx` renders the game canvas and React-owned HUD/overlay surface.
- A `GameRuntime` R3F component receives the canvas, renderer, camera, viewport data, and `useFrame` callback from R3F.
- `GameRuntime` creates the existing `World` in externally managed mode and calls `world.tick(delta)` from `useFrame`.
- Externally managed `World` receives R3F-owned renderer/camera/canvas dependencies. It does not create or append a renderer, install resize handling, or start its own animation loop.
- `World` continues to own Cannon physics, GLTF scene interpretation, characters, vehicles, scenarios, input routing, and its updatable registry.
- The R3F canvas is the sole render surface. Camera projection, pixel ratio, shadows, tone mapping, resizing, and final rendering remain R3F responsibilities.
- The existing FXAA option is migrated to R3F-compatible postprocessing rather than retaining an imperative `EffectComposer` render path.

## Assets and UI

- Existing GLB assets move or are exposed under Vite's `public/assets` path so their runtime URLs are stable.
- React components replace direct DOM construction/manipulation for loading state, controls, messages, stats, and settings panels.
- The UI retains the current functional states: loading, welcome, controls, messages, stats visibility, and game settings.
- Browser and package metadata, page title, visible game copy, and app identifiers use `gta11`.

## Build and Tooling

- pnpm is the package manager; `pnpm-lock.yaml` is regenerated from current compatible package releases.
- Vite uses the standard React TypeScript configuration (`vite.config.ts`, HTML root, `src/main.tsx`, and Vite-oriented TypeScript configs).
- Webpack configuration, legacy build artifacts, npm lockfile, and obsolete compiler declarations are removed where they conflict with the Vite application.
- TypeScript, React, React DOM, Three.js, R3F, Vite, and the React plugin are upgraded to current stable compatible versions.

## Failure Handling and Lifecycle

- Asset failures surface a React error overlay with a useful message.
- Runtime initialization errors surface through the same overlay.
- Unmounting disposes input listeners, runtime resources, and owned scene resources to prevent duplicated controls or leaked WebGL state during React lifecycle changes.

## Verification

- Add Vitest coverage for the externally managed runtime lifecycle and renamed application metadata.
- Run type checking, unit tests, and a production build.
- Use browser verification to confirm the `gta11` page title, mounted canvas, world asset load, and initial overlay/game state.

## Scope Boundaries

- Preserve existing gameplay behavior; do not redesign mechanics, assets, controls, or game content.
- Do not retain a second WebGL renderer, renderer-owned animation loop, or Webpack build path.
- Do not replace Cannon or rewrite the complete simulation into declarative React entities in this migration.
