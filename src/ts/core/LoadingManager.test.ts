import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createTestWorld } from '../../test/createTestWorld';
import { gameUiStore } from '../../game/ui/gameUiStore';
import { LoadingManager } from './LoadingManager';
import { Scenario } from '../world/Scenario';

afterEach(() => vi.restoreAllMocks());

test('publishes scenario onboarding as text, keeps simulation paused, and creates no modal DOM', () => {
  const world = createTestWorld();
  const loader = vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(() => undefined);
  const existingNodes = [...document.body.children];
  const scenarioRoot = new THREE.Object3D();
  scenarioRoot.name = 'city';
  scenarioRoot.userData = {
    name: 'City', desc_title: 'Welcome to Sketchbook',
    desc_content: '<p>Explore <b>Sketchbook</b>.</p><p>Press <kbd>F</kbd> to drive.</p>',
  };
  const manager = new LoadingManager(world);
  manager.createWelcomeScreenCallback(new Scenario(scenarioRoot, world));
  manager.loadGLTF('/assets/city.glb', () => undefined);
  loader.mock.calls[0][1]({ scene: new THREE.Group() } as any);

  expect(gameUiStore.getSnapshot()).toMatchObject({
    loading: false,
    welcome: { title: 'Welcome to gta11', content: 'Explore gta11.\nPress F to drive.' },
  });
  expect(world.params.Time_Scale).toBe(0);
  expect([...document.body.children]).toEqual(existingNodes);
  world.dispose();
});

test('a new loading operation clears stale errors and welcome state', () => {
  const world = createTestWorld();
  gameUiStore.setError('/assets/old.glb could not be loaded');
  gameUiStore.setWelcome({ title: 'Old scenario', content: 'Old instructions' });

  new LoadingManager(world);

  expect(gameUiStore.getSnapshot()).toMatchObject({ loading: true, error: null, welcome: null });
  world.dispose();
});
