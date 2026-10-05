import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

void it(
  'pnpm fails closed for young/missing releases, frozen poisoned locks and unknown scripts',
  { timeout: 120000 },
  async () => {
    const temp = await mkdtemp(join(tmpdir(), 'starter-supply-'));
    let mode = 'old';
    await mkdir(join(temp, 'package'));
    await writeFile(
      join(temp, 'package/package.json'),
      JSON.stringify({
        name: 'supply-fixture',
        version: '1.0.0',
        scripts: { postinstall: "node -e \"require('fs').writeFileSync('SCRIPT_RAN','yes')\"" },
      }),
    );
    execFileSync('tar', ['-czf', join(temp, 'fixture.tgz'), '-C', temp, 'package']);
    const bytes = await readFile(join(temp, 'fixture.tgz'));
    const integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
    const server = createServer((request, response) => {
      if (request.url.includes('.tgz')) {
        response.end(bytes);
        return;
      }
      const published = mode === 'young' ? new Date().toISOString() : '2020-01-01T00:00:00.000Z';
      const metadata = {
        name: 'supply-fixture',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'supply-fixture',
            version: '1.0.0',
            scripts: { postinstall: 'node noop.js' },
            dist: { integrity, tarball: `http://127.0.0.1:${server.address().port}/fixture.tgz` },
          },
        },
      };
      if (mode !== 'missing')
        metadata.time = { created: published, modified: published, '1.0.0': published };
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(metadata));
    });
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    const registry = `http://127.0.0.1:${server.address().port}`;
    async function install(name, modeValue, allowed, frozenLock) {
      mode = modeValue;
      const directory = join(temp, name);
      await mkdir(directory);
      await writeFile(
        join(directory, 'package.json'),
        '{"name":"fixture-consumer","private":true,"dependencies":{"supply-fixture":"1.0.0"}}',
      );
      await writeFile(
        join(directory, 'pnpm-workspace.yaml'),
        `minimumReleaseAge: 4320\nminimumReleaseAgeStrict: true\nminimumReleaseAgeIgnoreMissingTime: false\ntrustLockfile: false\nstrictDepBuilds: true\nallowBuilds: ${allowed ? '{supply-fixture: false}' : '{}'}\n`,
      );
      if (frozenLock) await writeFile(join(directory, 'pnpm-lock.yaml'), frozenLock);
      return await new Promise((done, reject) => {
        const child = spawn(
          resolve('.toolchain/bin/pnpm'),
          [
            'install',
            ...(frozenLock ? ['--frozen-lockfile'] : []),
            '--registry',
            registry,
            '--store-dir',
            join(directory, '.store'),
          ],
          {
            cwd: directory,
            env: { PATH: process.env.PATH, HOME: join(directory, '.home'), CI: 'true' },
          },
        );
        let output = '';
        child.stdout.on('data', (chunk) => {
          output += chunk;
        });
        child.stderr.on('data', (chunk) => {
          output += chunk;
        });
        child.on('error', reject);
        child.on('exit', (status) => done({ status, output, directory }));
      });
    }
    try {
      const valid = await install('valid', 'old', true);
      assert.equal(valid.status, 0, valid.output);
      const lock = await readFile(join(valid.directory, 'pnpm-lock.yaml'), 'utf8');
      for (const [name, value, frozen] of [
        ['young', 'young', null],
        ['missing', 'missing', null],
        ['poisoned', 'young', lock],
      ]) {
        const result = await install(name, value, true, frozen);
        assert.notEqual(result.status, 0, result.output);
        assert.match(result.output, /release|publish|time|age|young|cool|recent/i);
      }
      const unknown = await install('unknown', 'old', false);
      assert.notEqual(unknown.status, 0, unknown.output);
      assert.match(unknown.output, /build|script/i);
    } finally {
      await new Promise((done) => server.close(done));
      await rm(temp, { recursive: true, force: true });
    }
  },
);
