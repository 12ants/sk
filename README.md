# gta11

A browser 3D game (Three.js + Cannon.js physics: characters, vehicles, scenarios), built with pnpm + Vite + React + TypeScript + React Three Fiber (R3F).

## Setup

```bash
pnpm install
```

## Commands

```bash
pnpm dev          # start the Vite dev server and capture output to debug
pnpm build        # typecheck (tsc -b) then build a production bundle
pnpm preview      # preview a production build
pnpm test         # run the vitest suite
pnpm typecheck    # tsc -b --pretty false, no emit
pnpm build:map    # regenerate the starting map GLB after editing its generator
pnpm build:models # regenerate JSX components for every remaining GLB
```

Before committing, run `pnpm test && pnpm typecheck && pnpm build`.

## Controls

Movement, camera, and vehicle controls are shown in-game on the welcome/controls overlay after the world finishes loading, and vary by scenario. Settings include WASD, arrow-key, and IJKL movement layouts plus independent horizontal/vertical look sensitivity and inversion, field of view, free-camera speed, and a camera reset action. Model settings provide solid or wireframe rendering and simple low, balanced, or high texture-quality presets. The global Shadows setting controls both lights and model shadow participation.

The World settings also allow live selection between the legacy Cannon solver and a warm-started sequential-impulse solver based on [svartaksi's physics engine](https://github.com/12ants/svartaksi/tree/main/src/physics). Both options retain Cannon's existing bodies and collision pipeline, so switching does not reset the running scenario.

## Assets

Runtime GLB models are served from `public/assets/*` as Vite public-dir files (stable root URLs, e.g. `/assets/small_plane.glb`). The original world and Blender sources have been removed; Git history retains them.

`src/game/models/*.tsx` contains the typed GLTFJSX components for every remaining asset,
following [the GLTFJSX workflow](https://sbcode.net/react-three-fiber/gltfjsx/).
Import a component's `Model` export inside a Canvas, for example
`import { Model as CarModel } from './game/models/Car'`.
`src/game/models/index.ts` re-exports each component's `MODEL_PATH` constant; the
legacy `LoadingManager`/`VehicleSpawnPoint`/`CharacterSpawnPoint` imperative loaders
consume those instead of hardcoding `/assets/*.glb` strings.
The supporting GLBs remain necessary for geometry, textures, and animation clips.
Generation preserves node names, groups, and metadata so the simulation's
collider, seat, spawn, and animation identifiers remain available.

The starting map uses a procedural concrete material with five-metre slab joints.
Its physics box uses half-extents, matching the visible 100-by-100-metre surface at y=0.
Scenario loading settles physics before showing Play so wheels and feet start on the ground.
Local worktrees are excluded from Git and test discovery.

## Architecture

See `docs/gta11-architecture.md` for how the React/R3F shell (`src/App.tsx`, `src/game/**`) integrates with the simulation core (`src/ts/**`), including the constraint that R3F owns the WebGL canvas and frame loop while `World` owns game logic. `AGENTS.md` has the short version plus gotchas for anyone (human or agent) making changes.
