import { create } from '@react-three/test-renderer';
import { StrictMode } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { World } from '../../ts/world/World';
import { Character } from '../../ts/characters/Character';
import { GameRuntime } from './GameRuntime';
import { LoadingManager } from '../../ts/core/LoadingManager';
import { gameUiStore } from '../ui/gameUiStore';

function makeRuntime() {
  const canvas = document.createElement('canvas');
  const renderer = {
    domElement: canvas, shadowMap: {},
    setSize: vi.fn(), setPixelRatio: vi.fn(), render: vi.fn(), dispose: vi.fn(),
  } as unknown as THREE.WebGLRenderer;
  return { renderer, canvas, camera: new THREE.PerspectiveCamera(80, 1, 0.1, 1010) };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('injected World leaves canvas and host renderer untouched and clamps simulation time', () => {
  const runtime = makeRuntime();
  const existingNodes = [...document.body.children];
  const world = new World({ runtime });
  const updates: number[][] = [];
  world.registerUpdatable({ updateOrder: 10, update: (dt, unscaled) => updates.push([dt, unscaled]) });
  world.setTimeScale(0.5);
  world.tick(1 / 60);
  world.tick(1);
  world.dispose();
  world.tick(1);

  expect(updates).toEqual([[1 / 120, 1 / 60], [1 / 30, 1]]);
  expect(runtime.renderer.setSize).not.toHaveBeenCalled();
  expect(runtime.renderer.setPixelRatio).not.toHaveBeenCalled();
  expect(runtime.renderer.render).not.toHaveBeenCalled();
  expect(runtime.renderer.dispose).not.toHaveBeenCalled();
  expect([...document.body.children]).toEqual(existingNodes);
  expect(gameUiStore.getSnapshot().controls.length).toBeGreaterThan(0);
});

test('disposes owned scene resources once while keeping the host canvas attached', () => {
  const runtime = makeRuntime();
  document.body.appendChild(runtime.canvas);
  const world = new World({ runtime });
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const geometry = new THREE.BoxGeometry();
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  world.graphicsWorld.add(scene);
  const textureDispose = vi.spyOn(texture, 'dispose');
  const materialDispose = vi.spyOn(material, 'dispose');
  const geometryDispose = vi.spyOn(geometry, 'dispose');

  world.dispose();
  world.dispose();

  expect(textureDispose).toHaveBeenCalledTimes(1);
  expect(materialDispose).toHaveBeenCalledTimes(1);
  expect(geometryDispose).toHaveBeenCalledTimes(1);
  expect(scene.parent).toBeNull();
  expect(runtime.canvas.parentElement).toBe(document.body);
  runtime.canvas.remove();
});

test('disposes detached entity resources once while preserving resources shared with the current scene', () => {
  const world = new World({ runtime: makeRuntime() });
  const character = new Character({ scene: new THREE.Group(), animations: [new THREE.AnimationClip('idle', 1, [])] });
  const uniqueTexture = new THREE.Texture();
  const uniqueMaterial = new THREE.MeshStandardMaterial({ map: uniqueTexture });
  const uniqueGeometry = new THREE.BoxGeometry();
  const sharedTexture = new THREE.Texture();
  const sharedMaterial = new THREE.MeshStandardMaterial({ map: sharedTexture });
  const sharedGeometry = new THREE.BoxGeometry();
  character.add(new THREE.Mesh(uniqueGeometry, uniqueMaterial), new THREE.Mesh(sharedGeometry, sharedMaterial));
  world.add(character);
  world.graphicsWorld.add(new THREE.Mesh(sharedGeometry, sharedMaterial));
  const resources = [uniqueTexture, uniqueMaterial, uniqueGeometry, sharedTexture, sharedMaterial, sharedGeometry,
    character.raycastBox.geometry, character.raycastBox.material as THREE.Material];
  const disposals = resources.map((resource) => vi.spyOn(resource, 'dispose'));

  world.clearEntities();

  expect(character.parent).toBeNull();
  expect(character.raycastBox.parent).toBeNull();
  for (const dispose of disposals.slice(3, 6)) expect(dispose).not.toHaveBeenCalled();

  world.dispose();
  world.dispose();

  for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1);
});

test('ignores pending scene and entity loads after disposal without changing current UI state', () => {
  const load = vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(() => undefined);
  const world = new World({ worldScenePath: '/assets/world.glb', runtime: makeRuntime() });
  const entityLoaded = vi.fn();
  new LoadingManager(world).loadGLTF('/assets/boxman.glb', entityLoaded);
  world.dispose();
  gameUiStore.setLoading(true);
  const uiState = gameUiStore.getSnapshot();
  const scene = new THREE.Group();

  for (const [, loaded, , failed] of load.mock.calls) {
    loaded({ scene } as any);
    failed(new Error('Late load failure'));
  }

  expect(entityLoaded).not.toHaveBeenCalled();
  expect(scene.parent).toBeNull();
  expect(world.graphicsWorld.children).toHaveLength(0);
  expect(gameUiStore.getSnapshot()).toBe(uiState);
});

test('loads scenario metadata without requiring a legacy settings GUI', () => {
  const load = vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(() => undefined);
  const world = new World({ worldScenePath: '/assets/world.glb', runtime: makeRuntime() });
  const scene = new THREE.Group();
  const scenario = new THREE.Object3D();
  scenario.name = 'free-roam';
  scenario.userData = { data: 'scenario', name: 'Free roam', default: 'true' };
  scene.add(scenario);

  load.mock.calls[0][1]({ scene } as any);

  expect(world.scenarios).toHaveLength(1);
  expect(world.scenarios[0].id).toBe('free-roam');
  expect(scene.parent).toBe(world.graphicsWorld);
  expect(gameUiStore.getSnapshot().loading).toBe(false);
  expect(gameUiStore.getSnapshot().interfaceVisible).toBe(true);
  world.dispose();
});

test('releases input listeners if world initialization throws', () => {
  const runtime = makeRuntime();
  const adds = vi.spyOn(document, 'addEventListener');
  const removes = vi.spyOn(document, 'removeEventListener');
  vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(() => { throw new Error('Loader failed'); });

  expect(() => new World({ worldScenePath: '/assets/world.glb', runtime })).toThrow('Loader failed');

  for (const args of adds.mock.calls) expect(removes).toHaveBeenCalledWith(...args);
});

test('updates shadow frustums when its host changes the camera projection', () => {
  const world = new World({ runtime: makeRuntime() });
  const farX = world.sky.csm.mainFrustum.vertices.far[0].x;
  world.camera.aspect = 2;
  world.camera.updateProjectionMatrix();

  world.tick(1 / 60);

  expect(world.sky.csm.mainFrustum.vertices.far[0].x).toBeCloseTo(farX * 2);
  world.dispose();
});

test('releases its world if the readiness callback throws', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(() => undefined);
  const createWorld = vi.fn((options) => new World(options));

  await expect(create(
    <GameRuntime
      worldScenePath="/assets/world.glb"
      createWorld={createWorld}
      onWorldReady={() => { throw new Error('Ready callback failed'); }}
    />,
  )).rejects.toThrow('Ready callback failed');

  expect(createWorld.mock.results[0].value.isDisposed).toBe(true);
});

test('keeps one active world through StrictMode and a scene-path change', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(() => undefined);
  const worlds: World[] = [];
  const createWorld = (options) => {
    const world = new World(options);
    worlds.push(world);
    return world;
  };
  const renderer = await create(
    <StrictMode><GameRuntime worldScenePath="/assets/world.glb" createWorld={createWorld} /></StrictMode>,
  );
  expect(worlds.filter((world) => !world.isDisposed)).toHaveLength(1);
  const previous = worlds.at(-1)!;

  await renderer.update(
    <StrictMode><GameRuntime worldScenePath="/assets/next-world.glb" createWorld={createWorld} /></StrictMode>,
  );

  expect(previous.isDisposed).toBe(true);
  expect(worlds.filter((world) => !world.isDisposed)).toHaveLength(1);
  await renderer.unmount();
  expect(worlds.every((world) => world.isDisposed)).toBe(true);
});

test('creates one externally managed world, advances real physics with R3F frames, and disposes it', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(() => undefined);
  const createWorld = vi.fn((options) => new World(options));
  const ready = vi.fn();
  const renderer = await create(
    <GameRuntime worldScenePath="/assets/world.glb" createWorld={createWorld} onWorldReady={ready} />,
  );
  const world = createWorld.mock.results[0].value as World;
  const tick = vi.spyOn(world, 'tick');
  const dispose = vi.spyOn(world, 'dispose');
  const body = new CANNON.Body({ mass: 1, position: new CANNON.Vec3(0, 20, 0) });
  body.addShape(new CANNON.Sphere(1));
  world.physicsWorld.addBody(body);
  world.setTimeScale(1);

  expect(ready).toHaveBeenCalledWith(world);
  expect(world.graphicsWorld.parent).not.toBeNull();
  expect(world.camera).toBe(createWorld.mock.calls[0][0].runtime.camera);
  expect(world.renderer).toBe(createWorld.mock.calls[0][0].runtime.renderer);

  await renderer.advanceFrames(1, 1 / 60);
  expect(tick).toHaveBeenCalledWith(1 / 60);
  expect(body.position.y).toBeLessThan(20);

  await renderer.update(
    <GameRuntime worldScenePath="/assets/world.glb" createWorld={createWorld} onWorldReady={() => undefined} />,
  );
  expect(createWorld).toHaveBeenCalledTimes(1);

  await renderer.unmount();
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(world.graphicsWorld.parent).toBeNull();
  expect(world.physicsWorld.bodies).toHaveLength(0);
  expect(world.updatables).toHaveLength(0);
});
