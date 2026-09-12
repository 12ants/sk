import * as CANNON from 'cannon';
import { SvartaksiSolver } from './SvartaksiSolver';

test('settles a dynamic body on a static surface', () => {
	const world = new CANNON.World();
	world.gravity.set(0, -9.81, 0);
	world.solver = new SvartaksiSolver();
	const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
	ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
	const body = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.5) });
	body.position.set(0, 2, 0);
	world.addBody(ground);
	world.addBody(body);

	for (let step = 0; step < 180; step++) world.step(1 / 60);

	expect(body.position.y).toBeCloseTo(0.5, 1);
	expect(Math.abs(body.velocity.y)).toBeLessThan(0.1);
});
