import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { readFile, mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { syncToolchain } from './sync-toolchain.mjs';
import { verifyFiles } from './guards.mjs';
const [candidateArg, head] = process.argv.slice(2);
const candidate = resolve(candidateArg);
const controller = process.cwd();
const policy = JSON.parse(await readFile('maintenance/policy.json', 'utf8'));
if (!/^[a-f0-9]{40}$/.test(head ?? '')) throw new Error('Bound HEAD required');
const temp = await mkdtemp(join(tmpdir(), 'dependency-artifacts-'));
try {
  await cp(candidate, temp, {
    recursive: true,
    filter: (path) =>
      !path
        .split('/')
        .some((part) =>
          [
            '.git',
            'node_modules',
            '.toolchain',
            'dist',
            '.cache',
            '.vite',
            'artifacts',
            'state',
          ].includes(part),
        ),
  });
  const files = execFileSync(
    'git',
    ['diff', '--no-ext-diff', '--no-textconv', '--name-only', '-z', `${head}^`, head],
    { cwd: candidate, encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  for (const path of files) {
    try {
      await verifyFiles(controller, candidate, [path], 'update', policy);
    } catch {
      await verifyFiles(controller, candidate, [path], 'repair', policy);
    }
  }
  await syncToolchain(temp);
  const image = JSON.parse(await readFile('maintenance/images.json', 'utf8')).renovate;
  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--pids-limit=256',
      '--memory=4g',
      '--cpus=2',
      '--mount',
      `type=bind,src=${temp},dst=/candidate`,
      '--mount',
      `type=bind,src=${controller}/scripts,dst=/controller/scripts,readonly`,
      '--workdir',
      '/candidate',
      '--user',
      '0:0',
      '--entrypoint',
      'bash',
      image,
      '-lc',
      'node /controller/scripts/bootstrap.mjs && export PATH=/candidate/.toolchain/bin:$PATH && pnpm install --lockfile-only && pnpm install --frozen-lockfile && pnpm exec vp fmt --write',
    ],
    { stdio: 'inherit', env: { PATH: process.env.PATH, HOME: process.env.HOME }, timeout: 1200000 },
  );
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: candidate, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const changed = [];
  for (const path of tracked)
    if (!(await readFile(join(candidate, path))).equals(await readFile(join(temp, path))))
      changed.push(path);
  if (changed.length) {
    await verifyFiles(candidate, temp, changed, 'update', policy);
    for (const path of changed) await cp(join(temp, path), join(candidate, path));
  }
  console.log(`PASS credential-free artifact worker; ${changed.length} bounded file changes`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
