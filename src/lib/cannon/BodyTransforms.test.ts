import * as CANNON from 'cannon';

test('physics world/local transforms round trip independently of render interpolation', () => {
  const body = new CANNON.Body({mass: 1});
  body.position.set(15, 1, -30);
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
  const local = new CANNON.Vec3(1, 2, 3);
  const point = body.pointToLocalFrame(body.pointToWorldFrame(local));
  const vector = body.vectorToLocalFrame(body.vectorToWorldFrame(local));
  for (const actual of [point, vector]) {
    expect(actual.x).toBeCloseTo(local.x);
    expect(actual.y).toBeCloseTo(local.y);
    expect(actual.z).toBeCloseTo(local.z);
  }
});
