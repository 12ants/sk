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

test.each(['remove', 'replace'])('disposes discarded trimesh debug geometry after body %s without disposing shared primitives early', (change) => {
  const scene = new THREE.Scene();
  const world = new CANNON.World();
  const triangleBody = new CANNON.Body({ mass: 0 });
  triangleBody.addShape(new CANNON.Trimesh([0, 0, 0, 1, 0, 0, 0, 0, 1], [0, 1, 2]));
  const boxBody = new CANNON.Body({ mass: 0 });
  boxBody.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)));
  world.addBody(boxBody);
  world.addBody(triangleBody);
  const debug = new CannonDebugRenderer(scene, world);
  debug.update();
  const box = scene.children[0] as THREE.Mesh;
  const triangle = scene.children[1] as THREE.Mesh;
  const primitiveDispose = vi.spyOn(box.geometry, 'dispose');
  const triangleDispose = vi.spyOn(triangle.geometry, 'dispose');
  world.remove(triangleBody);
  if (change === 'replace') {
    const replacement = new CANNON.Body({ mass: 0 });
    replacement.addShape(new CANNON.Box(new CANNON.Vec3(2, 2, 2)));
    world.addBody(replacement);
  }

  debug.update();

  expect(triangle.parent).toBeNull();
  expect(primitiveDispose).not.toHaveBeenCalled();
  debug.dispose();
  expect(triangleDispose).toHaveBeenCalledTimes(1);
  expect(primitiveDispose).toHaveBeenCalledTimes(1);
});
