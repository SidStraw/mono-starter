import { readFile, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseAllDocuments, stringify } from 'yaml';
import { json, packages, sourceFiles } from './lib.mjs';

export async function initProject(target, name, scope) {
  if (!/^[a-z][a-z0-9-]*$/.test(name) || !/^@[a-z][a-z0-9-]*$/.test(scope))
    throw new Error('Use a lowercase project name and @scope');
  try {
    await access(join(target, 'backlog/tasks'));
    throw new Error('Use a fresh starter copy without historical Backlog tasks');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const list = await packages(target);
  const oldScope = list.find((pkg) => pkg.relative === 'packages/core').manifest.name.split('/')[0];
  const replace = (value) => {
    if (typeof value === 'string') return value.replaceAll(`${oldScope}/`, `${scope}/`);
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [replace(key), replace(child)]),
      );
    return value;
  };
  const root = replace(await json(join(target, 'package.json')));
  root.name = name;
  await writeFile(join(target, 'package.json'), JSON.stringify(root, null, 2) + '\n');
  for (const pkg of list) {
    await writeFile(
      join(pkg.directory, 'package.json'),
      JSON.stringify(replace(pkg.manifest), null, 2) + '\n',
    );
    for (const file of await sourceFiles(pkg.directory))
      if (/\.ts$/.test(file)) await writeFile(file, replace(await readFile(file, 'utf8')));
  }
  await writeFile(
    join(target, 'vite.config.ts'),
    replace(await readFile(join(target, 'vite.config.ts'), 'utf8')),
  );
  const documents = parseAllDocuments(await readFile(join(target, 'pnpm-lock.yaml'), 'utf8'));
  if (documents.some((doc) => doc.errors.length)) throw new Error('Invalid lockfile documents');
  const locks = documents.map((doc) => doc.toJSON());
  const snapshots = JSON.stringify(locks.map((lock) => lock.snapshots));
  const updated = locks.map(replace);
  if (JSON.stringify(updated.map((lock) => lock.snapshots)) !== snapshots)
    throw new Error('Rename must not change registry snapshots');
  await writeFile(
    join(target, 'pnpm-lock.yaml'),
    updated.map((lock) => '---\n' + stringify(lock)).join('\n'),
  );
  const policy = await json(join(target, 'maintenance/policy.json'));
  policy.enabled = false;
  policy.repository = null;
  policy.updaterAppId = null;
  policy.updaterBotUserId = null;
  policy.repair.provider = null;
  policy.repair.model = null;
  policy.repair.endpoint = null;
  policy.repair.pricing = null;
  policy.repair.migrationGuides = [];
  await writeFile(join(target, 'maintenance/policy.json'), JSON.stringify(policy, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [target, name, scope] = process.argv.slice(2);
  if (!target || !name || !scope)
    throw new Error('Usage: pnpm init:project /absolute/fresh/copy project-name @scope');
  await initProject(resolve(target), name, scope);
  console.log(
    `PASS renamed fresh project ${name} (${scope}); initialize Backlog after frozen install`,
  );
}
