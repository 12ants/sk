import { GAME_WORLD_URL } from './assetPaths';

test('uses the Vite public URL for the world asset', () => {
  expect(GAME_WORLD_URL).toBe('/assets/world.glb');
});
