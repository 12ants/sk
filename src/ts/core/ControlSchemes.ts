import { KeyBinding } from './KeyBinding';

export type ControlScheme = 'wasd' | 'arrows';

const WASD_TO_ARROWS: Record<string, string> = {
	KeyW: 'ArrowUp',
	KeyA: 'ArrowLeft',
	KeyS: 'ArrowDown',
	KeyD: 'ArrowRight',
};

const ARROWS_TO_WASD: Record<string, string> = {
	ArrowUp: 'KeyW',
	ArrowLeft: 'KeyA',
	ArrowDown: 'KeyS',
	ArrowRight: 'KeyD',
};

/** Remaps any WASD/arrow-key codes bound on the given actions to match the chosen scheme, leaving every other binding untouched. */
export function applyControlScheme(actions: { [action: string]: KeyBinding }, scheme: ControlScheme): void
{
	const map = scheme === 'arrows' ? WASD_TO_ARROWS : ARROWS_TO_WASD;
	for (const action in actions)
	{
		if (!actions.hasOwnProperty(action)) continue;
		actions[action].eventCodes = actions[action].eventCodes.map((code) => map[code] ?? code);
	}
}
