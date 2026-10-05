import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { copyStarter } from './lib.mjs';
import { initProject } from './init-project.mjs';
const [directory, name, scope] = process.argv.slice(2);
if (!directory || !name || !scope)
  throw new Error('Usage: node scripts/create-project.mjs /absolute/new/directory name @scope');
const target = resolve(directory);
if (target === process.cwd() || target.startsWith(`${process.cwd()}/`))
  throw new Error('Use a separate project directory');
try {
  if ((await readdir(target)).length) throw new Error('Destination must be empty');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await copyStarter(target);
await initProject(target, name, scope);
console.log(
  `Created ${target}; run bootstrap, frozen install and Backlog init there as documented`,
);
