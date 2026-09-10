import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { GameRuntime } from './game/runtime/GameRuntime';
import { GameOverlay } from './game/ui/GameOverlay';
import type { World } from './ts/world/World';

export function App() {
  const [world, setWorld] = useState<World | null>(null);
  return (
    <main aria-label="gta11 game" className="game-app">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: false, toneMapping: ACESFilmicToneMapping }}
        camera={{ fov: 80, near: 0.1, far: 1010 }}
        onCreated={({ gl }) => { gl.domElement.tabIndex = 0; gl.domElement.setAttribute('aria-label', 'gta11 playfield'); }}
      >
        <GameRuntime worldScenePath="/assets/world.glb" onWorldReady={setWorld} />
      </Canvas>
      <GameOverlay world={world} />
    </main>
  );
}
