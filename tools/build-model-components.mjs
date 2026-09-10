import { readdirSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = 'src/game/models';
mkdirSync(new URL(`../${output}`, import.meta.url), { recursive: true });

// gltfjsx --types output needs manual touch-ups after each regeneration (v6.5.3):
// - `JSX.IntrinsicElements['group']` doesn't resolve under React 19 types; use `ThreeElements['group']` from '@react-three/fiber' instead.
// - models with no animations reference an undeclared `GLTFAction` type; replace `animations: GLTFAction[]` with `animations: THREE.AnimationClip[]`.
// - the `as GLTFResult` cast is rejected by tsc (insufficient overlap with drei's return type); cast through `unknown` first.
// - add `export const MODEL_PATH = '/assets/<file>'` and use it in place of the inlined path in `useGLTF(...)` / `useGLTF.preload(...)`.
for (const file of readdirSync(new URL('../public/assets', import.meta.url)).filter(file => file.endsWith('.glb')).sort()) {
  const name = file.replace(/\.glb$/, '').split(/[-_]/).map(part => part[0].toUpperCase() + part.slice(1)).join('');
  const result = spawnSync(process.execPath, [
    'node_modules/gltfjsx/cli.js', `public/assets/${file}`,
    '--output', `${output}/${name}.tsx`, '--root', 'public',
    '--keepnames', '--keepgroups', '--meta', '--shadows', '--precision', '7', '--types',
  ], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
