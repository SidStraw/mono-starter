// Executes inside the pinned Renovate image, using its actual manager implementations.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const load = (name) => import(`/usr/local/renovate/dist/${name}.js`);
const { GlobalConfig } = await load('config/global');
GlobalConfig.set({ localDir: '/workspace', platform: 'github' });
const { extractAllPackageFiles } = await load('modules/manager/npm/extract/index');
const files = await extractAllPackageFiles({}, [
  'package.json',
  'apps/web/package.json',
  'packages/core/package.json',
  'pnpm-workspace.yaml',
]);
const deps = files.flatMap((file) => file.deps.map((dep) => ({ file: file.packageFile, ...dep })));
for (const name of [
  'vite-plus',
  'vitest',
  'typescript',
  'backlog.md',
  'pnpm',
  '@voidzero-dev/vite-plus-core',
  '@earendil-works/pi-coding-agent',
  '@earendil-works/pi-ai',
])
  assert.ok(
    deps.some((dep) => dep.depName === name || dep.packageName === name),
    `Missing extraction: ${name}`,
  );
const node = await load('modules/manager/nvm/extract');
assert.equal(
  node.extractPackageFile(await readFile('/workspace/.node-version', 'utf8')).deps[0].depName,
  'node',
);
const actions = await load('modules/manager/github-actions/extract');
for (const name of ['ci', 'dependency-maintenance', 'dependency-artifacts', 'dependency-repair']) {
  const result = await actions.extractPackageFile(
    await readFile(`/workspace/.github/workflows/${name}.yml`, 'utf8'),
    `.github/workflows/${name}.yml`,
    {},
  );
  assert.ok(
    result.deps.some(
      (dep) => dep.depName === 'actions/checkout' && /^[a-f0-9]{40}$/.test(dep.currentDigest),
    ),
    `Missing pinned Actions extraction: ${name}`,
  );
}
const regex = await load('modules/manager/custom/regex/index');
const config = JSON.parse(await readFile('/workspace/renovate.json', 'utf8')).customManagers[0];
const result = regex.extractPackageFile(
  await readFile('/workspace/maintenance/images.json', 'utf8'),
  'maintenance/images.json',
  config,
);
assert.equal(result.deps[0].depName, 'ghcr.io/renovatebot/renovate');
assert.match(result.deps[0].currentDigest, /^sha256:[a-f0-9]{64}$/);
console.log(
  JSON.stringify(
    {
      status: 'PASS',
      managers: ['npm', 'nvm', 'github-actions', 'custom.regex'],
      dependencies: deps.map(({ file, depName, currentValue }) => ({
        file,
        depName,
        currentValue,
      })),
    },
    null,
    2,
  ),
);
