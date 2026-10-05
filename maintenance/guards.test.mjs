import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyGate,
  verifyUpdater,
  repairPath,
  updaterChange,
  reserveAttempt,
  settleAttempt,
} from './guards.mjs';
import { dependencyVersion, configObject } from '../scripts/verify-policy.mjs';

const expected = {
  repository: 'owner/repo',
  head: 'head',
  base: 'base',
  policy: 'policy',
  runId: '42',
  workflow: 'ci.yml',
};
const good = {
  ...expected,
  producer: 'trusted-controller',
  jobs: { 'linux-x64': 'success', 'macos-arm64': 'success' },
};
const jobs = ['linux-x64', 'macos-arm64'];
void describe('trusted merge boundary', () => {
  void it('accepts only the full bound result', () =>
    assert.equal(verifyGate(expected, good, jobs), true));
  for (const state of ['skipped', 'neutral', 'cancelled', 'failure', undefined])
    void it(`rejects a matrix result of ${state}`, () =>
      assert.throws(() =>
        verifyGate(expected, { ...good, jobs: { ...good.jobs, 'macos-arm64': state } }, jobs),
      ));
  for (const field of ['head', 'base', 'policy', 'runId', 'workflow'])
    void it(`rejects stale ${field}`, () =>
      assert.throws(() => verifyGate(expected, { ...good, [field]: 'old' }, jobs)));
  void it('rejects forged result producers', () =>
    assert.throws(() => verifyGate(expected, { ...good, producer: 'candidate' }, jobs)));
  void it('does not trust a matching label or branch alone', () =>
    assert.throws(() =>
      verifyUpdater(
        { enabled: true, repository: 'owner/repo', updaterAppId: 1 },
        {
          repository: 'owner/repo',
          headRepository: 'owner/repo',
          baseRepository: 'owner/repo',
          appId: 2,
          authorType: 'Bot',
          head: 'h',
          base: 'b',
          runId: '1',
        },
      ),
    ));
});
void describe('policy and patch boundary', () => {
  void it('rejects floating registry and alias versions', () => {
    for (const value of [
      'latest',
      '^1.0.0',
      '~1.0.0',
      'npm:pkg@latest',
      'https://example.com/pkg.tgz',
    ])
      assert.equal(dependencyVersion(value), false);
    assert.equal(dependencyVersion('workspace:*'), true);
  });
  void it('reads disabled typeCheck as disabled without executing config', () =>
    assert.equal(
      configObject('export default defineConfig({lint:{options:{typeCheck:false}}});').lint.options
        .typeCheck,
      false,
    ));
  void it('rejects protected tests, snapshots and traversal', () => {
    for (const path of [
      'packages/core/src/index.test.ts',
      '.github/workflows/ci.yml',
      'maintenance/policy.json',
      '../core/src/index.ts',
      'packages/core/src/__snapshots__/x.ts',
    ])
      assert.equal(repairPath(path, {}), false);
    assert.equal(repairPath('packages/core/src/index.ts', {}), true);
  });
  void it('allows a version update but rejects a script bypass', () => {
    const before = JSON.stringify({
      private: true,
      scripts: { test: 'vp test run' },
      devDependencies: { 'vite-plus': '1.0.0' },
    });
    const after = JSON.stringify({
      private: true,
      scripts: { test: 'vp test run' },
      devDependencies: { 'vite-plus': '2.0.0' },
    });
    assert.equal(updaterChange('package.json', before, after), true);
    assert.throws(() =>
      updaterChange('package.json', before, after.replace('vp test run', 'true')),
    );
  });
  void it('rejects weakening install policy', () =>
    assert.throws(() =>
      updaterChange(
        'pnpm-workspace.yaml',
        'strictDepBuilds: true\nallowBuilds: {}',
        'strictDepBuilds: false\nallowBuilds: {}',
      ),
    ));
  void it('rejects a workflow permission change alongside an Action update', () =>
    assert.throws(() =>
      updaterChange(
        '.github/workflows/ci.yml',
        'permissions: read-all\nuses: actions/checkout@' + 'a'.repeat(40),
        'permissions: write-all\nuses: actions/checkout@' + 'b'.repeat(40),
      ),
    ));
});
void describe('cumulative repair limits', () => {
  void it('cannot reset attempts by changing HEAD', () => {
    const ledger = {};
    const limits = { maxAttempts: 2, maxMilliseconds: 1200000 };
    reserveAttempt(ledger, 'pr-1', limits, 0);
    settleAttempt(ledger, 'pr-1', 1000);
    reserveAttempt(ledger, 'pr-1', limits, 2000);
    settleAttempt(ledger, 'pr-1', 1000);
    assert.throws(() => reserveAttempt(ledger, 'pr-1', limits, 4000));
  });
  void it('fails closed after a crashed attempt consumes its reservation', () => {
    const ledger = {};
    const limits = { maxAttempts: 2, maxMilliseconds: 1200000 };
    reserveAttempt(ledger, 'pr-1', limits, 0);
    assert.throws(() => reserveAttempt(ledger, 'pr-1', limits, 1200001));
  });
});
