import { applyControlScheme } from './ControlSchemes';
import { KeyBinding } from './KeyBinding';

test('remaps WASD codes to arrow keys and back, leaving other bindings untouched', () => {
	const actions = {
		up: new KeyBinding('KeyW'),
		jump: new KeyBinding('Space'),
	};

	applyControlScheme(actions, 'arrows');
	expect(actions.up.eventCodes).toEqual(['ArrowUp']);
	expect(actions.jump.eventCodes).toEqual(['Space']);

	applyControlScheme(actions, 'wasd');
	expect(actions.up.eventCodes).toEqual(['KeyW']);
});

test('switches directly between every directional control scheme', () => {
	const actions = { up: new KeyBinding('ArrowUp'), left: new KeyBinding('ArrowLeft') };
	applyControlScheme(actions, 'ijkl');
	expect(actions.up.eventCodes).toEqual(['KeyI']);
	expect(actions.left.eventCodes).toEqual(['KeyJ']);
	applyControlScheme(actions, 'wasd');
	expect(actions.up.eventCodes).toEqual(['KeyW']);
	expect(actions.left.eventCodes).toEqual(['KeyA']);
});
