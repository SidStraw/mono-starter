import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, cp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { verifyFiles } from './guards.mjs';

const [candidateArg, head, base, policySha, stage = 'prepare'] = process.argv.slice(2);
const candidate = resolve(candidateArg);
const controller = process.cwd();
const policy = JSON.parse(await readFile('maintenance/policy.json', 'utf8'));
const changed = execFileSync(
  'git',
  [
    '-c',
    'core.hooksPath=/dev/null',
    'diff',
    '--no-ext-diff',
    '--no-textconv',
    '--name-only',
    '-z',
    base,
    head,
  ],
  { cwd: candidate, encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
if (stage === 'prepare') {
  // Human feature PRs still run full CI; automatic maintenance additionally requires a bounded diff.
  if (process.env.UPDATER_PR === 'true') {
    for (const path of changed) {
      try {
        await verifyFiles(controller, candidate, [path], 'update', policy);
      } catch {
        await verifyFiles(controller, candidate, [path], 'repair', policy);
      }
    }
  }
  // Candidate tests never replace the protected verifier/test suite used for maintenance acceptance.
  for (const path of [
    'scripts',
    'maintenance',
    'vite.config.ts',
    'tsconfig.base.json',
    'packages/core/src/index.test.ts',
  ])
    await cp(join(controller, path), join(candidate, path), {
      recursive: true,
      force: true,
      filter: (source) =>
        !source.split('/').some((part) => ['state', 'artifacts', 'images.json'].includes(part)),
    });
  if (base !== head)
    execFileSync(
      'git',
      [
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'user.name=Starter CI',
        '-c',
        'user.email=ci@example.invalid',
        'merge',
        '--no-edit',
        base,
      ],
      { cwd: candidate, stdio: 'inherit' },
    );
  console.log('PASS trusted verifier restored and latest base integrated');
}
const env = {
  PATH: `${candidate}/.toolchain/bin:${process.env.PATH}`,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR ?? '/tmp',
  CI: 'true',
  PLAYWRIGHT_BROWSERS_PATH:
    process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(candidate, '.cache/browsers'),
};
const commands = {
  prepare: [
    [process.execPath, ['scripts/bootstrap.mjs']],
    ['pnpm', ['install', '--frozen-lockfile']],
    ['pnpm', ['exec', 'playwright', 'install', '--with-deps', 'chromium']],
  ],
  supply: [
    ['pnpm', ['verify:policy']],
    [process.execPath, ['scripts/audit.mjs']],
  ],
  compatibility: [
    [
      'pnpm',
      [
        'exec',
        'vp',
        'run',
        '--no-cache',
        'check-all',
        'test-all',
        'build-all',
        'consumer',
        'browser',
        'backlog',
      ],
    ],
  ],
  starter: [
    ['pnpm', ['smoke:starter']],
    [process.execPath, ['scripts/verify-clean.mjs']],
  ],
};
if (!commands[stage]) throw new Error('Unknown trusted CI stage');
for (const [command, args] of commands[stage]) {
  const run = spawnSync(command, args, { cwd: candidate, env, stdio: 'inherit' });
  if (run.status !== 0) process.exit(1);
}
console.log(`PASS ${stage} for HEAD ${head}, base ${base}, policy ${policySha}`);
