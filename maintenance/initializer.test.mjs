import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseAllDocuments } from 'yaml';
import { copyStarter } from '../scripts/lib.mjs';
import { initProject } from '../scripts/init-project.mjs';
void it('renames pnpm multi-document locks without changing snapshots or inheriting activation/evidence', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'starter-init-'));
  try {
    await copyStarter(temp);
    const old = parseAllDocuments(await readFile(join(temp, 'pnpm-lock.yaml'), 'utf8')).map((doc) =>
      doc.toJSON(),
    );
    await initProject(temp, 'fixture-project', '@fixture');
    const fresh = parseAllDocuments(await readFile(join(temp, 'pnpm-lock.yaml'), 'utf8')).map(
      (doc) => doc.toJSON(),
    );
    assert.equal(fresh.length, old.length);
    assert.deepEqual(
      fresh.map((lock) => lock.snapshots),
      old.map((lock) => lock.snapshots),
    );
    assert.equal(
      fresh.at(-1).importers['apps/web'].dependencies['@fixture/core'].specifier,
      'workspace:*',
    );
    const policy = JSON.parse(await readFile(join(temp, 'maintenance/policy.json'), 'utf8'));
    assert.equal(policy.enabled, false);
    assert.equal(policy.repository, null);
    assert.equal(policy.updaterBotUserId, null);
    assert.equal(policy.repair.endpoint, null);
    assert.match(
      await readFile(join(temp, 'docs/setup-evidence.md'), 'utf8'),
      /^> Source starter evidence only/,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
