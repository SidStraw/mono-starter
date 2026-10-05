import { run } from './lib.mjs';
const untracked = run(
  'git',
  [
    'ls-files',
    '--others',
    '--exclude-standard',
    '--',
    'package.json',
    'apps/*/package.json',
    'packages/*/package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
  ],
  { stdio: 'pipe' },
);
if (untracked.stdout.toString().trim())
  throw new Error('Acceptance manifests must have a tracked baseline');
run(
  'git',
  [
    'diff',
    '--exit-code',
    '--',
    '**/package.json',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
  ],
  { stdio: 'inherit' },
);
console.log('PASS tracked manifests and lockfile unchanged');
