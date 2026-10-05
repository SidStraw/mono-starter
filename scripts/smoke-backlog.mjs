import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { run } from './lib.mjs';
const temp = await mkdtemp(join(tmpdir(), 'starter-backlog-'));
try {
  const binary = resolve('node_modules/.bin/backlog');
  run(
    binary,
    [
      'init',
      'smoke-backlog',
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
    { cwd: temp, stdio: 'pipe' },
  );
  const config = parse(await readFile(join(temp, 'backlog/config.yml'), 'utf8'));
  if (
    config.project_name !== 'smoke-backlog' ||
    config.remote_operations ||
    config.auto_commit ||
    !config.filesystem_only
  )
    throw new Error('Backlog settings or project identity wrong');
  run(binary, ['instructions', 'overview'], { cwd: temp, stdio: 'pipe' });
  run(binary, ['task', 'list', '--json'], { cwd: temp, stdio: 'pipe' });
  console.log('PASS Backlog initialization/read: fresh project, CLI instructions, local only');
} finally {
  await rm(temp, { recursive: true, force: true });
}
