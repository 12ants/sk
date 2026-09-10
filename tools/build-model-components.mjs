import { readdirSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = 'src/game/models';
mkdirSync(new URL(`../${output}`, import.meta.url), { recursive: true });

for (const file of readdirSync(new URL('../public/assets', import.meta.url)).filter(file => file.endsWith('.glb')).sort()) {
  const name = file.replace(/\.glb$/, '').split(/[-_]/).map(part => part[0].toUpperCase() + part.slice(1)).join('');
  const result = spawnSync(process.execPath, [
    'node_modules/gltfjsx/cli.js', `public/assets/${file}`,
    '--output', `${output}/${name}.jsx`, '--root', 'public',
    '--keepnames', '--keepgroups', '--meta', '--shadows', '--precision', '7',
  ], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
