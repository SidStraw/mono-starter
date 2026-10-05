import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyPolicy } from '../scripts/verify-policy.mjs';

async function fixture(mutate) {
  const temp = await mkdtemp(join(tmpdir(), 'starter-policy-'));
  try {
    for (const file of [
      'package.json',
      '.node-version',
      'pnpm-workspace.yaml',
      'tsconfig.base.json',
      'vite.config.ts',
      'apps',
      'packages',
      'maintenance/policy.json',
      'maintenance/images.json',
      'docs/toolchain-baseline.json',
      '.github/workflows',
    ]) {
      await mkdir(join(temp, file, '..'), { recursive: true });
      await cp(file, join(temp, file), {
        recursive: true,
        filter: (path) => !path.split('/').some((part) => ['node_modules', 'dist'].includes(part)),
      });
    }
    await mkdir(join(temp, 'node_modules/vite-plus'), { recursive: true });
    await cp(
      'node_modules/vite-plus/package.json',
      join(temp, 'node_modules/vite-plus/package.json'),
    );
    await verifyPolicy(temp);
    await mutate(temp);
    await assert.rejects(() => verifyPolicy(temp));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
void it('the real verifier rejects disabling typeCheck', () =>
  fixture(async (temp) => {
    const path = join(temp, 'vite.config.ts');
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replace('typeCheck: true', 'typeCheck: false'),
    );
  }));
void it('the real verifier rejects a floating registry dependency', () =>
  fixture(async (temp) => {
    const path = join(temp, 'package.json');
    const data = JSON.parse(await readFile(path, 'utf8'));
    data.devDependencies['vite-plus'] = '^1.0.0';
    await writeFile(path, JSON.stringify(data));
  }));
void it('the real verifier rejects widening install permissions', () =>
  fixture(async (temp) => {
    const path = join(temp, 'pnpm-workspace.yaml');
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replace('strictDepBuilds: true', 'strictDepBuilds: false'),
    );
  }));
void it('the real task runner fails when a required filter selects nothing', async () => {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(
    'pnpm',
    ['exec', 'vp', 'run', '--filter', '@missing/package', '--fail-if-no-match', 'build'],
    { encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /match|package/i);
});
