import * as CANNON from 'cannon';

/**
 * A warm-started sequential-impulse solver adapted to Cannon's equation API.
 *
 * It follows svartaksi's solver design: cache the previous tick's converged impulses,
 * apply them before relaxation, then clamp accumulated impulses while iterating. Keeping
 * Cannon's bodies, contacts, broadphase and raycasts makes the solver safe to select at
 * runtime without rebuilding the active game world.
 */
export class SvartaksiSolver extends CANNON.Solver
{
	public iterations = 8;
	public tolerance = 1e-7;
	private previousImpulses = new Map<string, number>();

	public solve(dt: number, world: CANNON.World): number
	{
		const equations = this.equations as Array<CANNON.Equation & {
			computeB(dt: number): number;
			computeGWlambda(): number;
			addToWlambda(delta: number): void;
			multiplier: number;
		}>;
		if (equations.length === 0 || dt <= 0)
		{
			this.previousImpulses.clear();
			return 0;
		}

		const bodies = world.bodies as Array<CANNON.Body & { linearFactor: CANNON.Vec3; angularFactor: CANNON.Vec3 }>;
		bodies.forEach((body) => {
			body.updateSolveMassProperties();
			body.vlambda.setZero();
			body.wlambda.setZero();
		});

		const keyOccurrences = new Map<string, number>();
		const keys = equations.map((equation) => {
			const pair = `${equation.constructor.name}:${equation.bi.id}:${equation.bj.id}`;
			const occurrence = keyOccurrences.get(pair) ?? 0;
			keyOccurrences.set(pair, occurrence + 1);
			return `${pair}:${occurrence}`;
		});
		const lambdas = equations.map((equation, index) => {
			const cached = this.previousImpulses.get(keys[index]) ?? 0;
			const lambda = Math.max(equation.minForce, Math.min(equation.maxForce, cached));
			if (lambda !== 0) equation.addToWlambda(lambda);
			return lambda;
		});
		const bs = equations.map((equation) => equation.computeB(dt));
		const inverseCs = equations.map((equation) => 1 / equation.computeC());
		const toleranceSquared = this.tolerance * this.tolerance;
		let completedIterations = 0;

		for (; completedIterations < this.iterations; completedIterations++)
		{
			let totalDelta = 0;
			for (let index = 0; index < equations.length; index++)
			{
				const equation = equations[index];
				const previous = lambdas[index];
				const delta = inverseCs[index] * (bs[index] - equation.computeGWlambda() - equation.eps * previous);
				const next = Math.max(equation.minForce, Math.min(equation.maxForce, previous + delta));
				const clampedDelta = next - previous;
				lambdas[index] = next;
				totalDelta += Math.abs(clampedDelta);
				equation.addToWlambda(clampedDelta);
			}
			if (totalDelta * totalDelta < toleranceSquared) break;
		}

		bodies.forEach((body) => {
			body.vlambda.x *= body.linearFactor.x;
			body.vlambda.y *= body.linearFactor.y;
			body.vlambda.z *= body.linearFactor.z;
			body.velocity.vadd(body.vlambda, body.velocity);
			body.wlambda.x *= body.angularFactor.x;
			body.wlambda.y *= body.angularFactor.y;
			body.wlambda.z *= body.angularFactor.z;
			body.angularVelocity.vadd(body.wlambda, body.angularVelocity);
		});

		const currentImpulses = new Map<string, number>();
		equations.forEach((equation, index) => {
			equation.multiplier = lambdas[index] / dt;
			currentImpulses.set(keys[index], lambdas[index]);
		});
		this.previousImpulses = currentImpulses;
		return completedIterations;
	}
}
