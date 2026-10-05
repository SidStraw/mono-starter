import { spawnSync } from 'node:child_process';
import { readFile, readdir, lstat, mkdir, cp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parse } from 'yaml';

export const root = process.cwd();
export const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
export const yaml = async (path) => parse(await readFile(path, 'utf8'));
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed (${result.status ?? result.signal})`);
  return result;
}
export async function packages(base = root) {
  const found = [];
  for (const folder of ['apps', 'packages']) {
    for (const entry of await readdir(join(base, folder), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink())
        throw new Error(`Invalid workspace entry: ${entry.name}`);
      const directory = join(base, folder, entry.name);
      found.push({
        directory,
        relative: `${folder}/${entry.name}`,
        manifest: await json(join(directory, 'package.json')),
      });
    }
  }
  return found;
}
export async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      ['node_modules', 'dist', '.git', '.toolchain', '.vite', '.cache', '.DS_Store'].includes(
        entry.name,
      )
    )
      continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Source symlink rejected: ${path}`);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported source file type: ${path}`);
  }
  return files;
}
export async function copyStarter(destination) {
  await mkdir(destination, { recursive: true });
  for (const path of [
    'apps',
    'packages',
    'scripts',
    'maintenance',
    '.github',
    'docs',
    'AGENTS.md',
    'README.md',
    '.gitignore',
    '.node-version',
    'package.json',
    'pnpm-workspace.yaml',
    'pnpm-lock.yaml',
    'tsconfig.base.json',
    'tsconfig.json',
    'vite.config.ts',
    'renovate.json',
  ]) {
    await cp(resolve(path), join(destination, path), {
      recursive: true,
      filter: (source) =>
        !source
          .split('/')
          .some(
            (part) =>
              part.startsWith('.env') ||
              [
                'node_modules',
                'dist',
                '.cache',
                '.vite',
                'state',
                'artifacts',
                '.env',
                '.DS_Store',
              ].includes(part),
          ),
    });
  }
  for (const file of await sourceFiles(destination))
    if (!(await lstat(file)).isFile()) throw new Error('Copy contains non-file');
}
