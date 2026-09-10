import { Canvas } from '@react-three/fiber';
import { EffectComposer, FXAA } from '@react-three/postprocessing';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { GameRuntime } from './game/runtime/GameRuntime';
import { GAME_WORLD_URL } from './game/runtime/assetPaths';
import { GameOverlay } from './game/ui/GameOverlay';
import type { World } from './ts/world/World';

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

export function App() {
  const [world, setWorld] = useState<World | null>(null);
  useEffect(() => {
    document.title = 'gta11';
  }, []);
  return (
    <main aria-label="gta11 game" className="game-app">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: false, toneMapping: ACESFilmicToneMapping }}
        camera={{ fov: 80, near: 0.1, far: 1010 }}
        onCreated={({ gl }) => { gl.domElement.tabIndex = 0; gl.domElement.setAttribute('aria-label', 'gta11 playfield'); }}
      >
        <GameRuntime worldScenePath={GAME_WORLD_URL} onWorldReady={setWorld} />
        <GameEffects world={world} />
      </Canvas>
      <GameOverlay world={world} />
    </main>
  );
}
