import { Canvas } from '@react-three/fiber';
import { EffectComposer, FXAA } from '@react-three/postprocessing';
import { Perf } from 'r3f-perf';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ACESFilmicToneMapping, PCFShadowMap } from 'three';
import { GameRuntime } from './game/runtime/GameRuntime';
import { GAME_WORLD_URL } from './game/runtime/assetPaths';
import { GameOverlay } from './game/ui/GameOverlay';
import { gameUiStore } from './game/ui/gameUiStore';
import type { World } from './ts/world/World';
import { DEFAULT_CAMERA_FOV, DEFAULT_CAMERA_NEAR, DEFAULT_CAMERA_FAR } from './ts/world/WorldConstants';

const subscribeToNothing = () => () => {};
const noSettings = () => null;

function GameEffects({ world }: { world: World | null }) {
  const settings = useSyncExternalStore(world?.subscribeSettings ?? subscribeToNothing, world?.getSettingsSnapshot ?? noSettings);
  if (!settings?.FXAA) return null;
  return (
    <EffectComposer>
      <FXAA />
    </EffectComposer>
  );
}

function GamePerfOverlay() {
  const state = useSyncExternalStore(gameUiStore.subscribe, gameUiStore.getSnapshot);
  if (!state.perfVisible) return null;
  return <Perf position="top-right" minimal={false} matrixUpdate />;
}

export function App() {
  const [world, setWorld] = useState<World | null>(null);
  useEffect(() => {
    document.title = 'gta11';
  }, []);
  return (
    <main aria-label="gta11 game" className="game-app">
      <Canvas
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: false, toneMapping: ACESFilmicToneMapping }}
        camera={{ fov: DEFAULT_CAMERA_FOV, near: DEFAULT_CAMERA_NEAR, far: DEFAULT_CAMERA_FAR }}
        onCreated={({ gl }) => { gl.domElement.tabIndex = 0; gl.domElement.setAttribute('aria-label', 'gta11 playfield'); }}
      >
        <GameRuntime worldScenePath={GAME_WORLD_URL} onWorldReady={setWorld} />
        <GameEffects world={world} />
        <GamePerfOverlay />
      </Canvas>
      <GameOverlay world={world} />
    </main>
  );
}
