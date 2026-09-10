/// <reference types="node" />
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createTestWorld } from '../../test/createTestWorld';
import { LoadingManager } from '../core/LoadingManager';
import { Car } from '../vehicles/Car';
import { Airplane } from '../vehicles/Airplane';
import { Helicopter } from '../vehicles/Helicopter';

async function loadVehicleAsset(name: string) {
  const bytes = readFileSync(`public/assets/${name}.glb`);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  json.buffers[0].uri = `data:application/octet-stream;base64,${bytes.subarray(28 + jsonLength).toString('base64')}`;
  // Keep actual meshes and physics metadata; image decoding is a browser concern.
  json.materials = json.materials.map((material: {name: string}) => ({name: material.name}));
  return new GLTFLoader().parseAsync(JSON.stringify(json), '');
}

test('the shipped vehicles settle onto the starting ground', async () => {
  const world = createTestWorld();
  const ground = new CANNON.Body({mass: 0, shape: new CANNON.Box(new CANNON.Vec3(50, 0.5, 50)), position: new CANNON.Vec3(0, -0.5, 0)});
  world.physicsWorld.addBody(ground);
  const types = [[Car, 'car'], [Airplane, 'airplane'], [Helicopter, 'heli']] as const;
  for (const [VehicleType, name] of types) {
    const vehicle = new VehicleType(await loadVehicleAsset(name));
    vehicle.setPosition(15, 1, 15);
    vehicle.spawnPoint = new THREE.Object3D();
    world.add(vehicle);
    world.settleScene();
    expect(vehicle.collision.position.y).toBeLessThan(1.5);
    expect(Math.abs(vehicle.collision.velocity.y)).toBeLessThan(0.1);
    expect(vehicle.collision.position.x).toBeCloseTo(15, 1);
    expect(vehicle.collision.position.z).toBeCloseTo(15, 1);
    for (const wheel of vehicle.rayCastVehicle.wheelInfos) {
      expect(Math.abs(wheel.worldTransform.position.y - wheel.radius)).toBeLessThan(0.03);
    }
    if (name === 'heli') {
      vehicle.collision.computeAABB();
      expect(Math.abs(vehicle.collision.aabb.lowerBound.y)).toBeLessThan(0.03);
    }
    for (let i = 0; i < 300; i++) world.update(1 / 60, 1 / 60);
    expect(vehicle.collision.position.y).toBeLessThan(1.5);
    expect(Math.abs(vehicle.collision.velocity.y)).toBeLessThan(0.1);
    world.remove(vehicle);
  }
  world.dispose();
});

test('the shipped starting map collider matches the concrete surface and edges', async () => {
  const bytes = readFileSync('public/assets/small_plane.glb');
  const scene = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '');
  const world = createTestWorld();
  vi.spyOn(world, 'launchScenario').mockImplementation(() => {});
  world.loadScene(new LoadingManager(world), scene);
  const ground = scene.scene.getObjectByName('ground') as THREE.Mesh;
  const bounds = new THREE.Box3().setFromObject(ground);
  const collider = world.physicsWorld.bodies.find(body => body.mass === 0)!;
  collider.computeAABB();
  expect(collider.aabb.upperBound.y).toBeCloseTo(bounds.max.y);
  expect(collider.aabb.lowerBound.x).toBeCloseTo(bounds.min.x);
  expect(collider.aabb.upperBound.z).toBeCloseTo(bounds.max.z);
  expect((ground.material as THREE.MeshStandardMaterial).name).toBe('concrete');

  const body = new CANNON.Body({mass: 1, shape: new CANNON.Sphere(0.25), position: new CANNON.Vec3(2, 1, 2)});
  world.physicsWorld.addBody(body);
  world.settleScene();
  expect(body.position.y).toBeCloseTo(0.25, 2);
  expect(Math.abs(body.velocity.y)).toBeLessThan(0.01);
  world.dispose();
  vi.restoreAllMocks();
});
