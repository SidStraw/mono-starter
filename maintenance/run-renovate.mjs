import { checkProtection } from './check-protection.mjs';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { loadPolicy, installationToken } from './github.mjs';
const policy = await loadPolicy();
await checkProtection(policy);
const token = await installationToken({
  contents: 'write',
  pull_requests: 'write',
  checks: 'write',
  statuses: 'write',
});
const image = JSON.parse(await readFile('maintenance/images.json', 'utf8')).renovate;
const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--mount',
    `type=bind,src=${process.cwd()}/maintenance/renovate-config.cjs,dst=/config.cjs,readonly`,
    '-e',
    'RENOVATE_TOKEN',
    '-e',
    'MAINTENANCE_REPOSITORY',
    '-e',
    'RENOVATE_GIT_AUTHOR',
    '-e',
    'RENOVATE_CONFIG_FILE=/config.cjs',
    image,
  ],
  {
    stdio: 'inherit',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      RENOVATE_TOKEN: token,
      MAINTENANCE_REPOSITORY: policy.repository,
      RENOVATE_GIT_AUTHOR: process.env.RENOVATE_GIT_AUTHOR,
    },
  },
);
if (result.status !== 0) throw new Error('Renovate controller failed');
