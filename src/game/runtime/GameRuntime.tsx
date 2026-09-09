import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { World, type WorldOptions } from '../../ts/world/World';
import { PerspectiveCamera } from 'three';

type Props = {
  worldScenePath: string;
  onWorldReady?(world: World): void;
  createWorld?(options: WorldOptions): World;
};

const createGameWorld = (options: WorldOptions): World => new World(options);

export function GameRuntime({ worldScenePath, onWorldReady, createWorld = createGameWorld }: Props) {
  const { gl, camera } = useThree();
  const worldRef = useRef<World | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const notifyReady = useEffectEvent((readyWorld: World) => onWorldReady?.(readyWorld));

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) throw new Error('GameRuntime requires a perspective camera.');
    const nextWorld = createWorld({
      worldScenePath,
      runtime: { renderer: gl, camera, canvas: gl.domElement },
    });
    worldRef.current = nextWorld;
    setWorld(nextWorld);
    try {
      notifyReady(nextWorld);
    } catch (error) {
      worldRef.current = null;
      nextWorld.dispose();
      throw error;
    }

    return () => {
      worldRef.current = null;
      nextWorld.dispose();
    };
  }, [gl, camera, worldScenePath, createWorld]);

  useFrame((_, delta) => worldRef.current?.tick(delta));

  return world ? <primitive object={world.graphicsWorld} dispose={null} /> : null;
}
