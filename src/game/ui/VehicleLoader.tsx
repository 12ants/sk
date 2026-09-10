import { useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { World } from '../../ts/world/World';
import { Car, type CarPhysicsParams } from '../../ts/vehicles/Car';

type PhysicsPresetName = 'car' | 'truck' | 'light';

const PHYSICS_PRESETS: Record<PhysicsPresetName, CarPhysicsParams> = {
  car: { mass: 50, engineForce: 500, maxSpeed: 22, suspensionStiffness: 20 },
  truck: { mass: 150, engineForce: 800, maxSpeed: 18, suspensionStiffness: 30 },
  light: { mass: 20, engineForce: 300, maxSpeed: 25, suspensionStiffness: 15 },
};

type VehicleConfig = { name: string; physicsPreset: PhysicsPresetName };

const STORAGE_KEY = 'gta11/vehicle-configs';

function loadConfigs(): VehicleConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConfigs(configs: VehicleConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function VehicleLoader({ world }: { world: World | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<PhysicsPresetName>('car');
  const [configName, setConfigName] = useState('');
  const [configs, setConfigs] = useState<VehicleConfig[]>(loadConfigs);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!world) return <p role="status">World not ready.</p>;

  const spawn = () => {
    if (!file) return;
    setBusy(true);
    setStatus(null);

    const blobUrl = URL.createObjectURL(file);
    new GLTFLoader().load(
      blobUrl,
      (gltf) => {
        URL.revokeObjectURL(blobUrl);
        const car = new Car(gltf);
        if (car.wheels.length === 0 || car.seats.length === 0 || car.collision.shapes.length === 0) {
          setStatus(`Warning: model is missing ${[
            car.wheels.length === 0 ? 'wheel' : null,
            car.seats.length === 0 ? 'seat' : null,
            car.collision.shapes.length === 0 ? 'collision' : null,
          ].filter(Boolean).join(', ')} markers. Spawned anyway, but it may not behave correctly.`);
        }

        car.configurePhysics(PHYSICS_PRESETS[preset]);

        const player = world.characters[0];
        const spawnPos = player
          ? player.position.clone().add(player.orientation.clone().multiplyScalar(3)).setY(player.position.y + 1)
          : new THREE.Vector3(0, 1, 0);

        const spawnPoint = new THREE.Object3D();
        spawnPoint.position.copy(spawnPos);
        car.spawnPoint = spawnPoint;

        car.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);
        world.add(car);

        setBusy(false);
        setFile(null);
      },
      undefined,
      (error) => {
        console.error(error);
        URL.revokeObjectURL(blobUrl);
        setStatus('Could not load this .glb file.');
        setBusy(false);
      },
    );
  };

  const saveConfig = () => {
    if (!configName.trim()) return;
    const config: VehicleConfig = { name: configName.trim(), physicsPreset: preset };
    const next = [...configs.filter((c) => c.name !== config.name), config];
    setConfigs(next);
    saveConfigs(next);
    setConfigName('');
  };

  const applyConfig = (config: VehicleConfig) => setPreset(config.physicsPreset);

  const deleteConfig = (name: string) => {
    const next = configs.filter((c) => c.name !== name);
    setConfigs(next);
    saveConfigs(next);
  };

  return (
    <section className="game-vehicle-loader" aria-label="Vehicle loader">
      {status ? <p role="alert">{status}</p> : null}
      <fieldset>
        <legend>Model</legend>
        <label className="game-field">
          <span>Vehicle .glb</span>
          <input type="file" accept=".glb" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="game-field">
          <span>Physics preset</span>
          <select value={preset} onChange={(event) => setPreset(event.target.value as PhysicsPresetName)}>
            <option value="car">Car</option>
            <option value="truck">Truck</option>
            <option value="light">Light</option>
          </select>
        </label>
        <button onClick={spawn} disabled={!file || busy}>{busy ? 'Loading…' : 'Spawn'}</button>
      </fieldset>
      <fieldset>
        <legend>Saved configs</legend>
        <label className="game-field">
          <span>Config name</span>
          <input type="text" value={configName} onChange={(event) => setConfigName(event.target.value)} />
        </label>
        <button onClick={saveConfig} disabled={!configName.trim()}>Save config</button>
        {configs.length > 0 ? (
          <ul className="game-preset-list">
            {configs.map((config) => (
              <li key={config.name}>
                <span>{config.name} ({config.physicsPreset})</span>
                <span className="game-preset-actions">
                  <button onClick={() => applyConfig(config)}>Load</button>
                  <button onClick={() => deleteConfig(config.name)} aria-label={`Delete ${config.name}`}>×</button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>
    </section>
  );
}
