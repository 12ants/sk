import * as THREE from 'three';
import { TrimeshCollider } from './TrimeshCollider';

test.each([true, false])('converts a scaled buffer mesh into valid collision triangles (indexed: %s)', (indexed) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1], 3));
  if (indexed) geometry.setIndex([0, 1, 2]);
  const mesh = new THREE.Mesh(geometry);
  mesh.scale.set(2, 3, 4);
  mesh.position.set(5, 6, 7);

  const collider = new TrimeshCollider(mesh, {});
  const shape = collider.body.shapes[0] as any;

  expect(Array.from(shape.vertices)).toEqual([0, 0, 0, 2, 0, 0, 0, 0, 4]);
  expect(Array.from(shape.indices)).toEqual([0, 1, 2]);
  expect(collider.body.position).toMatchObject({ x: 5, y: 6, z: 7 });
  expect(Array.from(geometry.attributes.position.array)).toEqual([0, 0, 0, 1, 0, 0, 0, 0, 1]);
  geometry.dispose();
});
