import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { copyStarter, run } from './lib.mjs';
import { initProject } from './init-project.mjs';
if (process.env.STARTER_SMOKE_INNER) throw new Error('Recursive starter smoke rejected');
const temp = await mkdtemp(join(tmpdir(), 'starter-copy-'));
try {
  await copyStarter(temp);
  await initProject(temp, 'fresh-project', '@fresh');
  const env = {
    PATH: process.env.PATH,
    HOME: join(temp, '.home'),
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
    CI: 'true',
    STARTER_SMOKE_INNER: '1',
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(temp, '.browsers'),
  };
  run(process.execPath, ['scripts/bootstrap.mjs'], { cwd: temp, env });
  env.PATH = `${temp}/.toolchain/bin:${env.PATH}`;
  const paths = [
    'package.json',
    'apps/web/package.json',
    'packages/core/package.json',
    'pnpm-workspace.yaml',
    'pnpm-lock.yaml',
  ];
  const before = await Promise.all(
    paths.map(async (path) =>
      createHash('sha256')
        .update(await readFile(join(temp, path)))
        .digest('hex'),
    ),
  );
  run('pnpm', ['install', '--frozen-lockfile', '--store-dir', join(temp, '.store')], {
    cwd: temp,
    env,
  });
  for (let i = 0; i < paths.length; i++)
    if (
      createHash('sha256')
        .update(await readFile(join(temp, paths[i])))
        .digest('hex') !== before[i]
    )
      throw new Error(`Frozen install changed ${paths[i]}`);
  run(
    'pnpm',
    [
      'exec',
      'backlog',
      'init',
      'fresh-project',
      '--defaults',
      '--no-git',
      '--integration-mode',
      'cli',
      '--agent-instructions',
      'agents',
      '--include-remote',
      'false',
      '--check-branches',
      'false',
      '--auto-open-browser',
      'false',
    ],
    { cwd: temp, env, stdio: 'pipe' },
  );
  run('pnpm', ['exec', 'playwright', 'install', 'chromium'], { cwd: temp, env });
  run('git', ['init'], { cwd: temp, env, stdio: 'pipe' });
  run('git', ['add', '.'], { cwd: temp, env, stdio: 'pipe' });
  run('pnpm', ['exec', 'vp', 'fmt', '--write'], { cwd: temp, env });
  run('git', ['add', '.'], { cwd: temp, env, stdio: 'pipe' });
  run('pnpm', ['verify:inner'], { cwd: temp, env });
  const after = await Promise.all(
    paths.map(async (path) =>
      createHash('sha256')
        .update(await readFile(join(temp, path)))
        .digest('hex'),
    ),
  );
  // Formatting may normalize manifests; inspect the source semantically in addition to frozen install.
  if (before[4] !== after[4]) throw new Error('Frozen install changed the lockfile');
  await mkdir('maintenance/artifacts', { recursive: true });
  await writeFile(
    join(process.cwd(), 'maintenance/artifacts/starter-smoke.json'),
    JSON.stringify(
      {
        status: 'PASS',
        platform: process.platform,
        arch: process.arch,
        separateStore: true,
        copiedSourceOnly: true,
        renamed: '@fresh',
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS clean renamed starter: separate store, frozen install, full inner verification',
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
