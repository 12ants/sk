import { KeyBinding } from './KeyBinding';

export type ControlScheme = 'wasd' | 'arrows' | 'ijkl';

const DIRECTION_CODES: Record<ControlScheme, string[]> = {
	wasd: ['KeyW', 'KeyA', 'KeyS', 'KeyD'],
	arrows: ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
	ijkl: ['KeyI', 'KeyJ', 'KeyK', 'KeyL'],
};

/** Remaps any WASD/arrow-key codes bound on the given actions to match the chosen scheme, leaving every other binding untouched. */
export function applyControlScheme(actions: { [action: string]: KeyBinding }, scheme: ControlScheme): void
{
	const targetCodes = DIRECTION_CODES[scheme];
	const map = Object.fromEntries(
		Object.values(DIRECTION_CODES).flatMap((codes) => codes.map((code, index) => [code, targetCodes[index]])),
	);
	for (const action in actions)
	{
		if (!actions.hasOwnProperty(action)) continue;
		actions[action].eventCodes = actions[action].eventCodes.map((code) => map[code] ?? code);
	}
}
