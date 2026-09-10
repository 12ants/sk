# Character Customizer + Vehicle Loader

Implement two in-game runtime panels in the existing R3F HUD: a **Character Customizer** for the active character and a **Vehicle Loader** for spawning user-supplied vehicle models.

## Goals

- Character Customizer: live-edit the player character's colors, texture, and bone scale; save/load named presets to `localStorage`.
- Vehicle Loader: upload a `.glb`, assign a physics preset, spawn a drivable vehicle at the player.
- Both are React panels inside `GameOverlay`; no new render loop, no DOM access from `src/ts/**`.

## Non-goals

- Full GLB export/import from the customizer (presets are JSON only).
- Vehicle model authoring (Blender-side `userData` markers are required).
- Texture persistence across sessions (textures are session-only).
- New vehicle subclasses beyond reusing `Car`.

## Architecture

### Panel integration

- Extend `Panel` union in `src/game/ui/GameOverlay.tsx:7` with `'Customizer' | 'Vehicles'`.
- Add toolbar buttons for both panels.
- Add conditional render branches in the panel section.

### Character Customizer

**Files:**
- `src/game/ui/CharacterCustomizer.tsx` (new)
- `src/game/ui/game-ui.css` (add styles)

**Data flow:**
1. Panel reads `world.characters[0]` (the player character) via the `world` prop from `GameOverlay`.
2. Exposes controls:
   - **Body color**: `<input type="color">` bound to the `Boxman` material color. Clones the material before mutating to avoid shared-material side effects.
   - **Texture upload**: `<input type="file" accept="image/*">`. Creates a `THREE.Texture` from the file via `URL.createObjectURL` + `THREE.TextureLoader`, assigns it to `material.map`, sets `material.needsUpdate = true`.
   - **Bone scales**: Discovers bones at mount by traversing `character.modelContainer` for `THREE.Bone` instances, builds a list of `{ name, path, currentScale }`. Renders `<input type="range">` sliders that write to `bone.scale.set(s, s, s)`.
3. **Presets** (`localStorage` key `gta11/character-presets`):
   ```ts
   type CharacterPreset = {
     name: string;
     bodyColor?: string;
     boneScales: Record<string, number>;
     // texture is NOT persisted
   };
   ```
   Save/load/delete via `gameUiStore` or local component state with `localStorage`.

**Risks:**
- Material sharing: must `.clone()` the material before editing.
- Bone names vary by model: UI must dynamically enumerate bones from the active character's skeleton.
- Extreme bone scales break animation: cap sliders to `[0.5, 2.0]`.

### Vehicle Loader

**Files:**
- `src/game/ui/VehicleLoader.tsx` (new)
- `src/game/ui/game-ui.css` (add styles)

**Data flow:**
1. Panel exposes:
   - **File picker**: `<input type="file" accept=".glb">`.
   - **Physics preset**: dropdown `Car` / `Truck` / `Light`.
   - **Spawn button**.
2. On file select: read `File` as `ArrayBuffer`, create `blobUrl = URL.createObjectURL(buffer)`, load via `LoadingManager.loadGLTF(blobUrl, ...)`.
3. On spawn: construct a `Car` (reuse existing subclass) and apply the selected physics preset. Add to `world` at the player's position + offset.
4. **Saved configs** (`localStorage` key `gta11/vehicle-configs`):
   ```ts
   type VehicleConfig = {
     name: string;
     physicsPreset: 'car' | 'truck' | 'light';
     // model blob is NOT persisted
   };
   ```

**Physics presets** (configurable values on `Car`):
| Preset | mass | engineForce | maxSpeed | suspensionStiffness |
|--------|------|-------------|----------|---------------------|
| Car | 50 | 500 | 22 | 20 |
| Truck | 150 | 800 | 18 | 30 |
| Light | 20 | 300 | 25 | 15 |

**Required simulation-layer changes:**
- `src/ts/vehicles/Car.ts`: expose or add a `configurePhysics(params)` method so the React layer can override mass, engine force, and `RaycastVehicle` tuning after construction. If these are currently hardcoded in the constructor, refactor to read from a config object.
- `src/ts/world/World.ts`: expose a `spawnVehicleAt(type: 'car', model: any, position: THREE.Vector3, physicsPreset?: VehiclePhysicsPreset)` helper, or let the React layer call `world.add(new Car(model))` directly and then `car.configurePhysics(...)`.

**Model requirements:**
- Uploaded `.glb` must contain `userData.data === 'wheel'`, `'seat'`, `'collision'` markers. The panel should show a warning if `readVehicleData` returns zero wheels/seats/colliders.
- `userData.type` on the root should be `'car'`; if missing, default to `'car'`.

**Risks:**
- Memory: revoke blob URLs with `URL.revokeObjectURL(blobUrl)` after load.
- Missing markers: gracefully fail with a `gameUiStore.setError(...)` message.
- Multiple vehicles: no hard limit; user can spawn repeatedly.

## Affected files

| File | Change |
|------|--------|
| `src/game/ui/GameOverlay.tsx` | Add `Customizer` and `Vehicles` to `Panel`; add toolbar buttons and panel render branches |
| `src/game/ui/gameUiStore.ts` | No changes required (use local state + localStorage for MVP) |
| `src/game/ui/CharacterCustomizer.tsx` | New panel component |
| `src/game/ui/VehicleLoader.tsx` | New panel component |
| `src/game/ui/game-ui.css` | Add `.game-customizer` and `.game-vehicle-loader` styles |
| `src/ts/vehicles/Car.ts` | Expose `configurePhysics(params)` or equivalent |
| `src/ts/world/World.ts` | Expose `add(entity)` is already public; no change needed if Car constructor is sufficient |

## Validation

1. `pnpm test` passes (existing tests must not break).
2. `pnpm typecheck` passes.
3. Manual smoke test:
   - Open Customizer panel, change body color → character updates live.
   - Upload a texture → texture appears on character.
   - Adjust bone sliders → bones scale.
   - Save preset, reload page, load preset → values restore.
   - Open Vehicles panel, upload a valid car `.glb`, select preset, click Spawn → vehicle appears and is drivable.
   - Upload a `.glb` without markers → error message shown.

## Out of scope

- Editable vehicle wheel/collision placement UI (requires prepared GLBs).
- Full model export from customizer.
- Texture persistence.
- Vehicle deletion UI (can be done by existing world-clear mechanisms).
