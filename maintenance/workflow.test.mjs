import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
void it('preserves trusted checkouts and explicit required platform jobs in the actual workflows', async () => {
  const ci = parse(await readFile('.github/workflows/ci.yml', 'utf8'));
  assert.deepEqual(
    ci.jobs.verify.strategy.matrix.include.map(({ id, platform, arch }) => [id, platform, arch]),
    [
      ['linux-x64', 'linux', 'x64'],
      ['macos-arm64', 'darwin', 'arm64'],
    ],
  );
  assert.ok(ci.jobs.verify.steps.some((step) => step.name === 'Confirm runner architecture'));
  for (const name of [
    'Prepare candidate',
    'Supply-chain gates',
    'Compatibility checks',
    'Fresh starter checks',
  ])
    assert.ok(ci.jobs.verify.steps.some((step) => step.name === name));
  assert.equal(ci.jobs.verification.if, 'always()');
  assert.deepEqual(ci.jobs.verification.needs, ['verify']);
  for (const workflow of [
    'ci',
    'dependency-maintenance',
    'dependency-artifacts',
    'dependency-repair',
  ]) {
    const data = parse(await readFile(`.github/workflows/${workflow}.yml`, 'utf8'));
    for (const job of Object.values(data.jobs))
      for (const step of job.steps)
        if (step.uses) {
          assert.match(step.uses, /^actions\/checkout@[a-f0-9]{40}$/);
          assert.equal(step.with['persist-credentials'], false);
        }
  }
  for (const step of ci.jobs.verify.steps) assert.ok(!JSON.stringify(step).includes('secrets.'));
  const artifact = parse(await readFile('.github/workflows/dependency-artifacts.yml', 'utf8'));
  const repair = parse(await readFile('.github/workflows/dependency-repair.yml', 'utf8'));
  assert.match(artifact.concurrency.group, /^dependency-patch-/);
  assert.match(repair.concurrency.group, /^dependency-patch-/);
});
