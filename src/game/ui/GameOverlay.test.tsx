import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { gameUiStore } from './gameUiStore';
import { GameOverlay } from './GameOverlay';
import { createTestWorld } from '../../test/createTestWorld';

beforeEach(() => {
  gameUiStore.setLoading(false);
  gameUiStore.setInterfaceVisible(true);
  gameUiStore.setError(null);
  gameUiStore.setWelcome(null);
  gameUiStore.setStatsVisible(false);
  gameUiStore.setControls([{ keys: ['Shift', '+', 'W'], desc: 'Run forward' }]);
});

afterEach(cleanup);

test('shows gta11 loading state and asset errors', () => {
  gameUiStore.setLoading(true);
  gameUiStore.setError('Failed to load /assets/world.glb');
  render(<GameOverlay />);

  expect(screen.getByRole('heading', { name: 'gta11' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Failed to load /assets/world.glb');
  expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
});

test('discloses semantic controls only when requested and follows live store changes', () => {
  render(<GameOverlay />);
  expect(screen.queryByRole('list', { name: 'Game controls' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Controls' }));
  const controls = screen.getByRole('list', { name: 'Game controls' });
  expect(within(controls).getByText('Run forward')).toBeInTheDocument();
  expect(controls.querySelectorAll('kbd')).toHaveLength(2);

  act(() => gameUiStore.setControls([{ keys: ['F'], desc: 'Enter vehicle' }]));
  expect(within(controls).getByText('Enter vehicle')).toBeInTheDocument();
  expect(within(controls).queryByText('Run forward')).not.toBeInTheDocument();
});

test('renders console messages as text and reports measured FPS accessibly', () => {
  const world = createTestWorld();
  render(<GameOverlay world={world} />);
  act(() => {
    gameUiStore.pushMessage('<img src=x onerror=alert(1)>');
    world.setDebugFps(true);
    for (let frame = 0; frame < 31; frame++) world.tick(1 / 60);
  });
  expect(screen.getByRole('status', { name: 'Frame rate' })).toHaveTextContent('60 FPS');
  fireEvent.click(screen.getByRole('button', { name: /Messages/ }));
  const log = screen.getByRole('log');
  expect(log).toHaveTextContent('<img src=x onerror=alert(1)>');
  expect(log.querySelector('img')).toBeNull();
  world.dispose();
});

test('continues the welcome screen into play and returns focus to the canvas', () => {
  const world = createTestWorld();
  document.body.appendChild(world.canvas);
  world.canvas.tabIndex = 0;
  world.setTimeScale(0);
  gameUiStore.setWelcome({ title: 'Welcome to gta11', content: 'Explore the world and its vehicles.' });
  render(<GameOverlay world={world} />);

  const dialog = screen.getByRole('dialog', { name: 'Welcome to gta11' });
  expect(within(dialog).getByText('Explore the world and its vehicles.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(world.params.Time_Scale).toBe(1);
  expect(world.canvas).toHaveFocus();
  world.dispose();
  world.canvas.remove();
});

test('gates held movement and camera input while a menu is open and releases the gate on unmount', () => {
  const world = createTestWorld();
  world.tick(1 / 60);
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  expect(world.cameraOperator.actions.forward.isPressed).toBe(true);
  const { unmount } = render(<GameOverlay world={world} />);

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(world.cameraOperator.actions.forward.isPressed).toBe(false);
  const theta = world.cameraOperator.theta;
  world.inputManager.onMouseMove({ movementX: 30, movementY: 10 } as MouseEvent);
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  expect(world.cameraOperator.theta).toBe(theta);
  expect(world.cameraOperator.actions.forward.isPressed).toBe(false);

  unmount();
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  expect(world.cameraOperator.actions.forward.isPressed).toBe(true);
  world.dispose();
});

test('closing a menu with Escape restores canvas focus', () => {
  const world = createTestWorld();
  document.body.appendChild(world.canvas);
  world.canvas.tabIndex = 0;
  render(<GameOverlay world={world} />);
  fireEvent.click(screen.getByRole('button', { name: 'Controls' }));
  fireEvent.keyDown(screen.getByRole('button', { name: 'Controls' }), { key: 'Escape', code: 'Escape' });

  expect(screen.queryByRole('list', { name: 'Game controls' })).not.toBeInTheDocument();
  expect(world.canvas).toHaveFocus();
  world.dispose();
  world.canvas.remove();
});
