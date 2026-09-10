import { InputManager } from './InputManager';
import type { World } from '../world/World';
import { createTestWorld } from '../../test/createTestWorld';

afterEach(() => vi.restoreAllMocks());

test('disposes every input listener, including active drag listeners, and unregisters the receiver', () => {
  const canvas = document.createElement('canvas');
  const registered = new Set();
  const world = {
    params: { Pointer_Lock: false },
    registerUpdatable: (item) => registered.add(item),
    unregisterUpdatable: (item) => registered.delete(item),
  } as unknown as World;
  const canvasAdds = vi.spyOn(canvas, 'addEventListener');
  const documentAdds = vi.spyOn(document, 'addEventListener');
  const canvasRemoves = vi.spyOn(canvas, 'removeEventListener');
  const documentRemoves = vi.spyOn(document, 'removeEventListener');
  const manager = new InputManager(world, canvas);
  canvas.dispatchEvent(new MouseEvent('mousedown'));
  const received = vi.fn();
  manager.setInputReceiver({
    actions: {},
    inputReceiverInit() {}, inputReceiverUpdate() {},
    handleKeyboardEvent: received, handleMouseButton: received,
    handleMouseMove: received, handleMouseWheel: received,
  });

  manager.dispose();
  manager.dispose();

  for (const args of canvasAdds.mock.calls) expect(canvasRemoves).toHaveBeenCalledWith(...args);
  for (const args of documentAdds.mock.calls) expect(documentRemoves).toHaveBeenCalledWith(...args);
  canvas.dispatchEvent(new MouseEvent('mousedown'));
  canvas.dispatchEvent(new MouseEvent('mousemove'));
  canvas.dispatchEvent(new MouseEvent('mouseup'));
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
  document.dispatchEvent(new WheelEvent('wheel'));
  expect(received).not.toHaveBeenCalled();
  expect(registered.size).toBe(0);
  expect(manager.inputReceiver).toBeUndefined();
});

test('releases pointer lock granted after a menu has blocked game input', () => {
  const world = createTestWorld();
  const exitPointerLock = vi.fn();
  Object.defineProperty(document, 'exitPointerLock', { configurable: true, value: exitPointerLock });
  world.inputManager.setUiBlocked(true);
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, value: world.canvas });

  document.dispatchEvent(new Event('pointerlockchange'));

  expect(exitPointerLock).toHaveBeenCalledTimes(1);
  expect(world.inputManager.isLocked).toBe(false);
  delete (document as any).pointerLockElement;
  delete (document as any).exitPointerLock;
  world.dispose();
});
