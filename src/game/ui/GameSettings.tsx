import { useSyncExternalStore } from 'react';
import type { World, WorldSettingsSnapshot } from '../../ts/world/World';

const subscribeToNothing = () => () => {};
const noSettings = () => null;

export function GameSettings({ world }: { world: World | null }) {
  const settings = useSyncExternalStore<WorldSettingsSnapshot | null>(
    world?.subscribeSettings ?? subscribeToNothing,
    world?.getSettingsSnapshot ?? noSettings,
  );
  if (!world || !settings) return <p role="status">Loading settings…</p>;

  return (
    <section className="game-settings" aria-label="Game settings">
      <label className="game-field">
        <span>Scenario</span>
        <select value={settings.scenarioId ?? ''} onChange={(event) => world.launchScenario(event.target.value)}>
          <option value="" disabled>Choose a scenario</option>
          {world.getScenarioOptions().map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      <fieldset>
        <legend>World</legend>
        <Range label="Time scale" value={settings.Time_Scale} max={1} step={0.01} onChange={(value) => world.setTimeScale(value)} />
        <Range label="Sun elevation" value={settings.Sun_Elevation} max={180} onChange={(value) => world.setSunElevation(value)} />
        <Range label="Sun rotation" value={settings.Sun_Rotation} max={360} onChange={(value) => world.setSunRotation(value)} />
      </fieldset>
      <fieldset>
        <legend>Graphics</legend>
        <Toggle label="FXAA" checked={settings.FXAA} onChange={(value) => world.setFxaa(value)} />
        <Toggle label="Shadows" checked={settings.Shadows} onChange={(value) => world.setShadows(value)} />
      </fieldset>
      <fieldset>
        <legend>Input</legend>
        <Toggle label="Pointer lock" checked={settings.Pointer_Lock} onChange={(value) => world.setPointerLock(value)} />
        <Range label="Mouse sensitivity" value={settings.Mouse_Sensitivity} max={1} step={0.01} onChange={(value) => world.setMouseSensitivity(value)} />
      </fieldset>
      <fieldset>
        <legend>Debug</legend>
        <Toggle label="Physics debug" checked={settings.Debug_Physics} onChange={(value) => world.setDebugPhysics(value)} />
        <Toggle label="FPS counter" checked={settings.Debug_FPS} onChange={(value) => world.setDebugFps(value)} />
      </fieldset>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange(value: boolean): void }) {
  return <label className="game-toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Range({ label, value, max, step = 1, onChange }: { label: string; value: number; max: number; step?: number; onChange(value: number): void }) {
  return (
    <label className="game-field">
      <span>{label} <span className="game-value" aria-hidden="true">{Number(value.toFixed(2))}</span></span>
      <input aria-label={label} type="range" min={0} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
