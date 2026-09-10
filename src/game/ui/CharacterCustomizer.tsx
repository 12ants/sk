import { useEffect, useState } from 'react';
import * as THREE from 'three';
import type { World } from '../../ts/world/World';

type CharacterPreset = {
  name: string;
  bodyColor?: string;
  boneScales: Record<string, number>;
};

type BoneEntry = { name: string; bone: THREE.Bone };

const STORAGE_KEY = 'gta11/character-presets';
const BONE_SCALE_MIN = 0.5;
const BONE_SCALE_MAX = 2.0;

function loadPresets(): CharacterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: CharacterPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function CharacterCustomizer({ world }: { world: World | null }) {
  const character = world?.characters[0] ?? null;
  const [, forceRender] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<CharacterPreset[]>(loadPresets);
  const [presetName, setPresetName] = useState('');
  const [material, setMaterial] = useState<THREE.MeshStandardMaterial | null>(null);
  const [bones, setBones] = useState<BoneEntry[]>([]);

  // Clones the shared material once (marked via userData) so edits here don't leak into other
  // instances of the same model, and persist across panel close/reopen instead of reverting.
  useEffect(() => {
    if (!character) { setMaterial(null); setBones([]); return; }
    const current = character.materials[0] as THREE.MeshStandardMaterial | undefined;
    if (!current) { setMaterial(null); setBones([]); return; }

    let target = current;
    if (!current.userData.gta11Customized) {
      target = current.clone();
      target.userData.gta11Customized = true;
      character.modelContainer.traverse((child: any) => {
        if (child.isMesh && child.material === current) child.material = target;
      });
      const materialIndex = character.materials.indexOf(current);
      if (materialIndex >= 0) character.materials[materialIndex] = target;
    }

    const foundBones: BoneEntry[] = [];
    character.modelContainer.traverse((child: any) => {
      if (child.isBone) foundBones.push({ name: child.name, bone: child });
    });

    setMaterial(target);
    setBones(foundBones);
  }, [character]);

  if (!world || !character || !material) return <p role="status">No active character.</p>;

  const setBodyColor = (hex: string) => {
    material.color.set(hex);
    forceRender((n) => n + 1);
  };

  const setBoneScale = (bone: THREE.Bone, scale: number) => {
    // Animation clips carry scale tracks on most bones, so the override must be reapplied
    // by Character.update() every frame after the mixer tick, not just set here once.
    character.boneScaleOverrides.set(bone, scale);
    bone.scale.setScalar(scale);
    forceRender((n) => n + 1);
  };

  const onTextureUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
        URL.revokeObjectURL(url);
        forceRender((n) => n + 1);
      },
      undefined,
      () => {
        setError('Could not load texture.');
        URL.revokeObjectURL(url);
      },
    );
  };

  const currentBoneScales = (): Record<string, number> =>
    Object.fromEntries(bones.map(({ name, bone }) => [name, bone.scale.x]));

  const savePreset = () => {
    if (!presetName.trim()) return;
    const preset: CharacterPreset = {
      name: presetName.trim(),
      bodyColor: `#${material.color.getHexString()}`,
      boneScales: currentBoneScales(),
    };
    const next = [...presets.filter((p) => p.name !== preset.name), preset];
    setPresets(next);
    savePresets(next);
    setPresetName('');
  };

  const loadPreset = (preset: CharacterPreset) => {
    if (preset.bodyColor) setBodyColor(preset.bodyColor);
    for (const { name, bone } of bones) {
      const scale = preset.boneScales[name];
      if (scale !== undefined) setBoneScale(bone, scale);
    }
  };

  const deletePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    savePresets(next);
  };

  return (
    <section className="game-customizer" aria-label="Character customizer">
      {error ? <p role="alert">{error}</p> : null}
      <fieldset>
        <legend>Appearance</legend>
        <label className="game-field">
          <span>Body color</span>
          <input type="color" value={`#${material.color.getHexString()}`} onChange={(event) => setBodyColor(event.target.value)} />
        </label>
        <label className="game-field">
          <span>Texture</span>
          <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onTextureUpload(file); }} />
        </label>
      </fieldset>
      {bones.length > 0 ? (
        <fieldset>
          <legend>Bone scale</legend>
          {bones.map(({ name, bone }) => (
            <label className="game-field" key={name}>
              <span>{name} <span className="game-value" aria-hidden="true">{bone.scale.x.toFixed(2)}</span></span>
              <input
                aria-label={`${name} scale`}
                type="range"
                min={BONE_SCALE_MIN}
                max={BONE_SCALE_MAX}
                step={0.01}
                value={bone.scale.x}
                onChange={(event) => setBoneScale(bone, Number(event.target.value))}
              />
            </label>
          ))}
        </fieldset>
      ) : null}
      <fieldset>
        <legend>Presets</legend>
        <label className="game-field">
          <span>Preset name</span>
          <input type="text" value={presetName} onChange={(event) => setPresetName(event.target.value)} />
        </label>
        <button onClick={savePreset} disabled={!presetName.trim()}>Save preset</button>
        {presets.length > 0 ? (
          <ul className="game-preset-list">
            {presets.map((preset) => (
              <li key={preset.name}>
                <span>{preset.name}</span>
                <span className="game-preset-actions">
                  <button onClick={() => loadPreset(preset)}>Load</button>
                  <button onClick={() => deletePreset(preset.name)} aria-label={`Delete ${preset.name}`}>×</button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>
    </section>
  );
}
