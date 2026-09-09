import type * as THREE from 'three';

export type WorldRuntimeDependencies = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
};
