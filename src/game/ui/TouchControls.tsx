import { useRef } from 'react';
import type { World } from '../../ts/world/World';

const JOYSTICK_RADIUS = 46;

type Vec = { x: number; y: number };

function moveCodes(scheme: 'wasd' | 'arrows'): { up: string; down: string; left: string; right: string } {
  return scheme === 'arrows'
    ? { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
    : { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
}

export function TouchControls({ world }: { world: World }) {
  const knobRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<Vec>({ x: 0, y: 0 });
  const pressedRef = useRef<Set<string>>(new Set());
  const lookOriginRef = useRef<Vec | null>(null);
  const draggingRef = useRef(false);

  const releaseAll = () => {
    pressedRef.current.forEach((code) => world.inputManager.simulateKeyboardEvent(code, false));
    pressedRef.current.clear();
  };

  const onJoystickDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const base = baseRef.current;
    if (!base) return;
    base.setPointerCapture?.(event.pointerId);
    draggingRef.current = true;
    const rect = base.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    onJoystickMove(event);
  };

  const onJoystickMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - centerRef.current.x;
    const dy = event.clientY - centerRef.current.y;
    const distance = Math.min(Math.hypot(dx, dy), JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * distance;
    const clampedY = Math.sin(angle) * distance;
    if (knobRef.current) knobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

    const codes = moveCodes(world.getSettingsSnapshot().Control_Scheme);
    const deadzone = JOYSTICK_RADIUS * 0.25;
    const next = new Set<string>();
    if (distance > deadzone) {
      if (clampedX > deadzone / 2) next.add(codes.right);
      if (clampedX < -deadzone / 2) next.add(codes.left);
      if (clampedY > deadzone / 2) next.add(codes.down);
      if (clampedY < -deadzone / 2) next.add(codes.up);
    }
    pressedRef.current.forEach((code) => { if (!next.has(code)) world.inputManager.simulateKeyboardEvent(code, false); });
    next.forEach((code) => { if (!pressedRef.current.has(code)) world.inputManager.simulateKeyboardEvent(code, true); });
    pressedRef.current = next;
  };

  const onJoystickUp = (event: React.PointerEvent<HTMLDivElement>) => {
    baseRef.current?.releasePointerCapture?.(event.pointerId);
    draggingRef.current = false;
    releaseAll();
    if (knobRef.current) knobRef.current.style.transform = 'translate(0, 0)';
  };

  const onLookDown = (event: React.PointerEvent<HTMLDivElement>) => {
    (event.target as HTMLDivElement).setPointerCapture?.(event.pointerId);
    lookOriginRef.current = { x: event.clientX, y: event.clientY };
  };

  const onLookMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = lookOriginRef.current;
    if (!origin) return;
    const deltaX = event.clientX - origin.x;
    const deltaY = event.clientY - origin.y;
    lookOriginRef.current = { x: event.clientX, y: event.clientY };
    world.inputManager.simulateMouseMove(deltaX * 2, deltaY * 2);
  };

  const onLookUp = () => { lookOriginRef.current = null; };

  const tap = (code: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      world.inputManager.simulateKeyboardEvent(code, true);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      world.inputManager.simulateKeyboardEvent(code, false);
    },
    onPointerCancel: () => world.inputManager.simulateKeyboardEvent(code, false),
  });

  return (
    <div className="game-touch" aria-label="Touch controls">
      <div
        ref={baseRef}
        className="game-touch-joystick"
        onPointerDown={onJoystickDown}
        onPointerMove={onJoystickMove}
        onPointerUp={onJoystickUp}
        onPointerCancel={onJoystickUp}
      >
        <div ref={knobRef} className="game-touch-knob" />
      </div>
      <div
        className="game-touch-look"
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookUp}
        onPointerCancel={onLookUp}
      />
      <div className="game-touch-buttons">
        <button className="game-touch-button" {...tap('KeyV')}>View</button>
        <button className="game-touch-button" {...tap('KeyF')}>Enter</button>
        <button className="game-touch-button" {...tap('KeyE')}>Use</button>
        <button className="game-touch-button" {...tap('ShiftLeft')}>Run</button>
        <button className="game-touch-button game-touch-jump" {...tap('Space')}>Jump</button>
      </div>
    </div>
  );
}
