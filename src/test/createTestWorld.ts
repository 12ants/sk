import * as THREE from 'three';
import { World } from '../ts/world/World';

export function createTestWorld() {
  const canvas = document.createElement('canvas');
  const renderer = {
    domElement: canvas,
    shadowMap: {},
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  } as unknown as THREE.WebGLRenderer;
  return new World({ runtime: { renderer, canvas, camera: new THREE.PerspectiveCamera(80, 1, 0.1, 1010) } });
}
