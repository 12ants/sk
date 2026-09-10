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
