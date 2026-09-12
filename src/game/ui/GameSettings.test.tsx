import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { GameSettings } from './GameSettings';
import { createTestWorld } from '../../test/createTestWorld';
import { Scenario } from '../../ts/world/Scenario';
import { gameUiStore } from './gameUiStore';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('waits for a world before showing actionable settings', () => {
  render(<GameSettings world={null} />);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getByText(/Loading/)).toBeInTheDocument();
});

test('launches the selected visible scenario through the world API', () => {
  const world = createTestWorld();
  for (const [id, name, invisible] of [['city', 'City', false], ['hidden', 'Hidden', true]] as const) {
    const root = new THREE.Object3D();
    root.name = id;
    root.userData = { name, invisible: String(invisible) };
    world.scenarios.push(new Scenario(root, world));
  }
  const launch = vi.spyOn(world, 'launchScenario');
  render(<GameSettings world={world} />);
  expect(screen.queryByRole('option', { name: 'Hidden' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'city' } });
  expect(launch).toHaveBeenCalledWith('city');
  expect(world.getSettingsSnapshot().scenarioId).toBe('city');
  world.dispose();
});

test('updates graphics, input and debug behavior through named world setters', () => {
  const world = createTestWorld();
  render(<GameSettings world={world} />);
  fireEvent.click(screen.getByLabelText('FXAA'));
  fireEvent.click(screen.getByLabelText('Shadows'));
  fireEvent.click(screen.getByLabelText('Pointer lock'));
  fireEvent.change(screen.getByLabelText('Horizontal sensitivity'), { target: { value: '0.7' } });
  fireEvent.change(screen.getByLabelText('Vertical sensitivity'), { target: { value: '0.4' } });
  fireEvent.click(screen.getByLabelText('Physics debug'));
  fireEvent.click(screen.getByLabelText('FPS counter'));

  expect(world.params).toMatchObject({ FXAA: false, Shadows: false, Pointer_Lock: false, Mouse_Sensitivity: 0.7, Debug_Physics: true, Debug_FPS: true });
  expect(world.sky.csm.lights.every((light) => !light.castShadow)).toBe(true);
  expect(world.inputManager.pointerLock).toBe(false);
  expect(world.cameraOperator.sensitivity.x).toBe(0.7);
  expect(world.cameraOperator.sensitivity.y).toBeCloseTo(0.4);
  expect(world.cannonDebugRenderer).toBeDefined();
  expect(gameUiStore.getSnapshot().statsVisible).toBe(true);
  fireEvent.click(screen.getByLabelText('Physics debug'));
  expect(world.cannonDebugRenderer).toBeUndefined();
  world.dispose();
});

test('switches control scheme and mobile mode through named world setters', () => {
  const world = createTestWorld();
  render(<GameSettings world={world} />);

  fireEvent.change(screen.getByLabelText('Control scheme'), { target: { value: 'arrows' } });
  expect(world.params.Control_Scheme).toBe('arrows');
  expect(world.cameraOperator.actions.forward.eventCodes).toEqual(['ArrowUp']);

  fireEvent.change(screen.getByLabelText('Control scheme'), { target: { value: 'ijkl' } });
  expect(world.cameraOperator.actions.forward.eventCodes).toEqual(['KeyI']);

  fireEvent.click(screen.getByLabelText('Mobile mode'));
  expect(world.params.Mobile_Mode).toBe(true);
  expect(world.params.Pointer_Lock).toBe(false);
  world.dispose();
});

test('updates camera options and resets the view', () => {
  const world = createTestWorld();
  world.cameraOperator.theta = 90;
  world.cameraOperator.phi = -20;
  render(<GameSettings world={world} />);
  fireEvent.change(screen.getByLabelText('Free camera speed'), { target: { value: '0.12' } });
  fireEvent.click(screen.getByLabelText('Invert horizontal look'));
  fireEvent.click(screen.getByLabelText('Invert vertical look'));
  fireEvent.click(screen.getByRole('button', { name: 'Reset camera view' }));
  expect(world.cameraOperator.movementSpeed).toBe(0.12);
  expect(world.cameraOperator.invertLookX).toBe(true);
  expect(world.cameraOperator.invertLook).toBe(true);
  expect(world.cameraOperator.theta).toBe(0);
  expect(world.cameraOperator.phi).toBe(15);
  world.dispose();
});

test('updates model materials, textures and shadows', () => {
  const world = createTestWorld();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  world.graphicsWorld.add(mesh);
  render(<GameSettings world={world} />);

  fireEvent.change(screen.getByLabelText('Model style'), { target: { value: 'wireframe' } });
  fireEvent.click(screen.getByLabelText('Shadows'));
  fireEvent.change(screen.getByLabelText('Texture quality'), { target: { value: 'low' } });

  expect(material.wireframe).toBe(true);
  expect(mesh.castShadow).toBe(false);
  expect(mesh.receiveShadow).toBe(false);
  expect(texture.magFilter).toBe(THREE.NearestFilter);
  expect(texture.minFilter).toBe(THREE.NearestMipmapNearestFilter);
  expect(texture.anisotropy).toBe(1);

  fireEvent.change(screen.getByLabelText('Texture quality'), { target: { value: 'high' } });
  expect(texture.magFilter).toBe(THREE.LinearFilter);
  expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
  expect(texture.anisotropy).toBe(16);
  world.dispose();
});

test('preserves time and sun controls and reacts to external settings updates', () => {
  const world = createTestWorld();
  render(<GameSettings world={world} />);
  fireEvent.change(screen.getByLabelText('Time scale'), { target: { value: '0.5' } });
  fireEvent.change(screen.getByLabelText('Sun elevation'), { target: { value: '90' } });
  fireEvent.change(screen.getByLabelText('Sun rotation'), { target: { value: '180' } });
  expect(world.params).toMatchObject({ Time_Scale: 0.5, Sun_Elevation: 90, Sun_Rotation: 180 });
  expect(world.timeScaleTarget).toBe(0.5);
  expect(world.sky.sunPosition.y).toBeCloseTo(10);

  act(() => { world.setFxaa(false); world.scrollTheTimeScale(1); });
  expect(screen.getByLabelText('FXAA')).not.toBeChecked();
  expect(Number((screen.getByLabelText('Time scale') as HTMLInputElement).value)).toBeCloseTo(0.5 / 1.3);
  world.dispose();
});

test('switches physics engines without replacing the physics world', () => {
  const world = createTestWorld();
  const physicsWorld = world.physicsWorld;
  const cannonSolver = physicsWorld.solver;
  render(<GameSettings world={world} />);

  fireEvent.change(screen.getByLabelText('Physics engine'), { target: { value: 'svartaksi' } });
  expect(world.params.Physics_Engine).toBe('svartaksi');
  expect(world.physicsWorld).toBe(physicsWorld);
  expect(world.physicsWorld.solver).not.toBe(cannonSolver);

  fireEvent.change(screen.getByLabelText('Physics engine'), { target: { value: 'cannon' } });
  expect(world.physicsWorld.solver).toBe(cannonSolver);
  world.dispose();
});

test('publishes immutable settings only on changes and lets consumers unsubscribe', () => {
  const world = createTestWorld();
  const first = world.getSettingsSnapshot();
  const notifications = vi.fn();
  const unsubscribe = world.subscribeSettings(notifications);
  world.setFxaa(false);
  const second = world.getSettingsSnapshot();
  world.setFxaa(false);
  expect(first.FXAA).toBe(true);
  expect(second.FXAA).toBe(false);
  expect(Object.isFrozen(second)).toBe(true);
  expect(world.getSettingsSnapshot()).toBe(second);
  expect(notifications).toHaveBeenCalledTimes(1);
  unsubscribe();
  world.setFxaa(true);
  expect(notifications).toHaveBeenCalledTimes(1);
  world.dispose();
});
