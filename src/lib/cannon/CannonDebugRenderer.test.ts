import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CannonDebugRenderer } from './CannonDebugRenderer';

test('renders collision triangles with buffer geometry and releases debug resources', () => {
  const scene = new THREE.Scene();
  const world = new CANNON.World();
  const body = new CANNON.Body({ mass: 0 });
  body.addShape(new CANNON.Trimesh([0, 0, 0, 1, 0, 0, 0, 0, 1], [0, 1, 2]));
  world.addBody(body);
  const debug = new CannonDebugRenderer(scene, world);

  debug.update();
  const mesh = scene.children[0] as THREE.Mesh;
  expect(mesh.geometry.getAttribute('position').count).toBe(3);
  const disposed = vi.spyOn(mesh.geometry, 'dispose');
  debug.dispose();

  expect(scene.children).toHaveLength(0);
  expect(disposed).toHaveBeenCalledTimes(1);
});
