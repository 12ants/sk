import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { GameRuntime } from './game/runtime/GameRuntime';

export function App() {
  return (
    <main aria-label="gta11 game" style={{ width: '100vw', height: '100dvh' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: false, toneMapping: ACESFilmicToneMapping }}
        camera={{ fov: 80, near: 0.1, far: 1010 }}
      >
        <GameRuntime worldScenePath="/assets/world.glb" />
      </Canvas>
    </main>
  );
}
