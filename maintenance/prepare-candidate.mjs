import { execFileSync } from 'node:child_process';
import { cp, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { verifyFiles } from './guards.mjs';

const [candidateArg, head, base] = process.argv.slice(2);
const candidate = resolve(candidateArg);
const controller = process.cwd();
const policy = JSON.parse(await readFile('maintenance/policy.json', 'utf8'));
const git = (args) =>
  execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
    cwd: candidate,
    encoding: 'utf8',
  });

if (process.env.UPDATER_PR === 'true') {
  const changed = git(['diff', '--no-ext-diff', '--no-textconv', '--name-only', '-z', base, head])
    .split('\0')
    .filter(Boolean);
  for (const path of changed) {
    try {
      await verifyFiles(controller, candidate, [path], 'update', policy);
    } catch {
      await verifyFiles(controller, candidate, [path], 'repair', policy);
    }
  }
}
if (base !== head)
  git([
    '-c',
    'user.name=Starter CI',
    '-c',
    'user.email=ci@example.invalid',
    'merge',
    '--no-edit',
    base,
  ]);

// Automatic maintenance uses the default branch's tests and configuration.
if (process.env.UPDATER_PR === 'true')
  for (const path of [
    'maintenance',
    'tests',
    'vite.config.ts',
    'playwright.config.ts',
    'tsconfig.base.json',
    'packages/core/src/index.test.ts',
  ])
    await cp(join(controller, path), join(candidate, path), {
      recursive: true,
      force: true,
      filter: (source) =>
        !source.split('/').some((part) => ['state', 'artifacts', 'images.json'].includes(part)),
    });
console.log('PASS candidate changes bounded and latest base integrated');
