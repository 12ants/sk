import { gameUiStore } from './gameUiStore';

test('publishes loading, control, and error state to subscribers', () => {
  const listener = vi.fn();
  const unsubscribe = gameUiStore.subscribe(listener);

  gameUiStore.setLoading(true);
  gameUiStore.setControls([{ keys: ['W'], desc: 'Move forward' }]);
  gameUiStore.setError('world.glb could not be loaded');

  expect(gameUiStore.getSnapshot()).toMatchObject({
    loading: true,
    error: 'world.glb could not be loaded',
    controls: [{ keys: ['W'], desc: 'Move forward' }],
  });
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});
