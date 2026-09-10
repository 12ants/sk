import { createCapsuleGeometry } from './FunctionLibrary';

test('creates a renderable capsule with the requested radius and cylinder height', () => {
  const geometry = createCapsuleGeometry(0.3, 1, 16);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  expect(bounds.max.x - bounds.min.x).toBeCloseTo(0.6);
  expect(bounds.max.y - bounds.min.y).toBeCloseTo(1.6);
  expect(bounds.max.z - bounds.min.z).toBeCloseTo(0.6);
  expect(geometry.getAttribute('normal').count).toBeGreaterThan(0);
  geometry.dispose();
});
