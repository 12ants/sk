# gta11

A browser 3D game (Three.js + Cannon.js physics: characters, vehicles, scenarios), built with pnpm + Vite + React + TypeScript + React Three Fiber (R3F).

## Setup

```bash
pnpm install
```

## Commands

```bash
pnpm dev          # start the Vite dev server
pnpm build        # typecheck (tsc -b) then build a production bundle
pnpm preview      # preview a production build
pnpm test         # run the vitest suite
pnpm typecheck    # tsc -b --pretty false, no emit
```

Before committing, run `pnpm test && pnpm typecheck && pnpm build`.

## Controls

Movement, camera, and vehicle controls are shown in-game on the welcome/controls overlay after the world finishes loading, and vary by scenario.

## Assets

Runtime GLB models are served from `public/assets/*` as Vite public-dir files (stable root URLs, e.g. `/assets/world.glb`), not bundled as JS modules.

## Architecture

See `docs/gta11-architecture.md` for how the React/R3F shell (`src/App.tsx`, `src/game/**`) integrates with the simulation core (`src/ts/**`), including the constraint that R3F owns the WebGL canvas and frame loop while `World` owns game logic.
