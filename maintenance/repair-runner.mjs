import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm, cp, readdir, lstat, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { loadPolicy, trustedPr, installationToken, api } from './github.mjs';
import { safePath, repairPath, verifyFiles, reserveAttempt, settleAttempt } from './guards.mjs';
import { createBroker } from './model-broker.mjs';

// This trusted controller owns the ledger and provider credential. Neither container receives them.
const [candidateArg, head] = process.argv.slice(2);
const candidate = resolve(candidateArg);
const policy = await loadPolicy();
const config = policy.repair;
if (!config.provider || !config.model || !config.endpoint || !process.env.MODEL_API_KEY)
  throw new Error('BLOCKED: explicitly configured Pi provider/model/endpoint/key required');
const identity = await trustedPr(
  policy.repository,
  process.env.PR_NUMBER,
  process.env.GH_READ_TOKEN,
  policy,
  process.env.GITHUB_RUN_ID,
);
if (identity.head !== head) throw new Error('Repair HEAD changed');
const token = await installationToken({ issues: 'write', contents: 'read', pull_requests: 'read' });
const issuePath = `/repos/${policy.repository}/issues/${process.env.PR_NUMBER}/comments`;
const marker = '<!-- starter-repair-ledger-v1 -->';
const comments = [];
for (let page = 1; page <= 50; page++) {
  const batch = await api(`${issuePath}?per_page=100&page=${page}`, token);
  comments.push(...batch);
  if (batch.length < 100) break;
  if (page === 50) throw new Error('Cannot safely locate repair ledger');
}
const records = comments.filter(
  (comment) => comment.user.id === policy.updaterBotUserId && comment.body.startsWith(marker),
);
if (records.length > 1) throw new Error('Ambiguous repair ledger');
let commentId = records[0]?.id;
const ledger = records[0] ? JSON.parse(records[0].body.slice(marker.length).trim()) : {};
const prKey = String(process.env.PR_NUMBER);
const started = Date.now();
const remaining = reserveAttempt(ledger, prKey, config, started);
let queue = Promise.resolve();
const save = () => {
  const body = marker + '\n' + JSON.stringify(ledger);
  queue = queue.then(async () => {
    const record = commentId
      ? await api(`/repos/${policy.repository}/issues/comments/${commentId}`, token, 'PATCH', {
          body,
        })
      : await api(issuePath, token, 'POST', { body });
    commentId = record.id;
  });
  return queue;
};
await save(); // Durable reservation precedes every model/tool dispatch. A crash consumes the lease.
const deadline = started + remaining;
const temp = await mkdtemp(join(tmpdir(), 'isolated-repair-'));
const runtime = join(temp, 'runtime');
const workspace = join(temp, 'workspace');
const resources = join(temp, 'agent');
const container = `starter-candidate-${randomUUID()}`;
const agentContainer = `starter-pi-${randomUUID()}`;
let broker;
const image = JSON.parse(await readFile('maintenance/images.json', 'utf8')).node;
const dockerEnv = { PATH: process.env.PATH, HOME: process.env.HOME };
function docker(args, timeout = Math.max(1, deadline - Date.now())) {
  return execFileSync('docker', args, {
    env: dockerEnv,
    timeout,
    maxBuffer: 1024 * 1024,
    encoding: 'utf8',
  });
}
async function boundedPath(path) {
  if (!safePath(path)) throw new Error('Unsafe tool path');
  let current = workspace;
  for (const part of path.split('/')) {
    current = join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error('Tool symlink rejected');
  }
  return current;
}
const copy = async (source, target) =>
  cp(source, target, {
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
            'state',
            'artifacts',
            'backlog',
          ].includes(part),
        ),
  });
try {
  await copy(candidate, workspace);
  await copy(process.cwd(), runtime);
  await mkdir(resources);
  await cp('maintenance/pi-agent.mjs', join(runtime, 'pi-agent.mjs'));
  await cp('maintenance/repair-prompt.md', join(resources, 'repair-prompt.md'));
  const guides = [];
  for (const url of config.migrationGuides ?? []) {
    const link = new URL(url);
    if (link.protocol !== 'https:' || link.username || link.password)
      throw new Error('Invalid trusted migration guide');
    const response = await fetch(link, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Migration guide unavailable');
    const text = await response.text();
    if (text.length > 64000) throw new Error('Migration guide too large');
    guides.push({ url, text });
  }
  await writeFile(
    join(resources, 'repair-input.txt'),
    JSON.stringify({
      repository: policy.repository,
      pr: prKey,
      head,
      base: identity.base,
      failedRun: process.env.FAILED_RUN,
      failure:
        'A trusted compatibility step failed after supply-chain gates succeeded. Inspect source and reproduce in the isolated container.',
      guides,
    }),
  );
  // Both dependency installs execute with an explicit environment containing no App/model credentials.
  for (const directory of [runtime, workspace])
    docker([
      'run',
      '--rm',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--pids-limit=256',
      '--memory=4g',
      '--cpus=2',
      '--mount',
      `type=bind,src=${directory},dst=/work`,
      '--workdir',
      '/work',
      '--user',
      '0:0',
      '--entrypoint',
      'bash',
      image,
      '-lc',
      'mkdir -p .toolchain/bin && npm install --prefix .toolchain --no-save --package-lock=false --ignore-scripts --no-audit --no-fund "pnpm@$(node -p \'require("./package.json").packageManager.split("@")[1]\')" && ln -sf "../node_modules/@pnpm/exe.$(node -p \'process.platform + "-" + process.arch\')/pnpm" .toolchain/bin/pnpm && ln -sf ../../node_modules/.bin/node .toolchain/bin/node && export PATH="$PWD/.toolchain/bin:$PATH" && pnpm install --frozen-lockfile',
    ]);
  docker([
    'run',
    '-d',
    '--name',
    container,
    '--network=none',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--pids-limit=256',
    '--memory=4g',
    '--cpus=2',
    '--mount',
    `type=bind,src=${workspace},dst=/work`,
    '--workdir',
    '/work',
    '--user',
    '0:0',
    '--entrypoint',
    'sleep',
    image,
    'infinity',
  ]);
  broker = await createBroker({
    config,
    apiKey: process.env.MODEL_API_KEY,
    deadline,
    host: '0.0.0.0',
    spent: ledger[prKey].usage ?? { tokens: 0, cost: 0 },
    persist: async (spent) => {
      ledger[prKey].usage = { ...spent };
      await save();
    },
    tool: async (params) => {
      if (Date.now() >= deadline) throw new Error('Repair deadline exceeded');
      if (params.operation === 'run') {
        if (typeof params.command !== 'string' || params.command.length > 4000)
          throw new Error('Invalid command');
        try {
          return {
            output: docker(
              [
                'exec',
                '-e',
                'PATH=/work/.toolchain/bin:/usr/local/bin:/usr/bin:/bin',
                container,
                'bash',
                '-lc',
                params.command,
              ],
              Math.min(60000, deadline - Date.now()),
            ).slice(-16000),
          };
        } catch (error) {
          return { exit: error.status ?? 1, output: String(error.stdout ?? '').slice(-16000) };
        }
      }
      const path = await boundedPath(params.path);
      if (params.operation === 'read') {
        if (!(await lstat(path)).isFile()) throw new Error('Read requires file');
        const text = await readFile(path, 'utf8');
        if (text.length > 64000) throw new Error('Read too large');
        return { text };
      }
      if (params.operation === 'list') return { entries: (await readdir(path)).slice(0, 100) };
      if (params.operation === 'write') {
        if (
          !repairPath(params.path, policy) ||
          !(await lstat(path)).isFile() ||
          typeof params.content !== 'string' ||
          params.content.length > 64000
        )
          throw new Error('Write scope rejected');
        await writeFile(path, params.content);
        return { written: params.path };
      }
      throw new Error('Unsupported isolated tool');
    },
  });
  const agentConfig = {
    broker: `http://host.docker.internal:${broker.port}`,
    capability: broker.capability,
    model: config.model,
  };
  await new Promise((done, reject) => {
    const child = spawn(
      'docker',
      [
        'run',
        '--name',
        agentContainer,
        '--rm',
        '--read-only',
        '--cap-drop=ALL',
        '--security-opt=no-new-privileges',
        '--pids-limit=256',
        '--memory=2g',
        '--cpus=2',
        '--add-host=host.docker.internal:host-gateway',
        '--tmpfs',
        '/tmp:rw,exec',
        '--mount',
        `type=bind,src=${runtime},dst=/runtime,readonly`,
        '--mount',
        `type=bind,src=${resources},dst=/agent,readonly`,
        '--workdir',
        '/runtime',
        '-e',
        'REPAIR_AGENT_CONFIG',
        '--entrypoint',
        '/runtime/.toolchain/bin/node',
        image,
        '/runtime/pi-agent.mjs',
      ],
      { env: { ...dockerEnv, REPAIR_AGENT_CONFIG: JSON.stringify(agentConfig) }, stdio: 'ignore' },
    );
    const timer = setTimeout(
      () => {
        child.kill('SIGKILL');
        reject(new Error('Pi deadline exceeded'));
      },
      Math.max(1, deadline - Date.now()),
    );
    child.on('error', reject);
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) done();
      else reject(new Error('Pi isolated process failed'));
    });
  });
  // Only existing allowlisted source files are exported; all other candidate mutations are discarded.
  const paths = execFileSync('git', ['ls-files', 'apps/web/src', 'packages/core/src'], {
    cwd: candidate,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter((path) => repairPath(path, policy));
  const changed = [];
  for (const path of paths) {
    await boundedPath(path);
    if (
      !Buffer.from(await readFile(join(workspace, path))).equals(
        await readFile(join(candidate, path)),
      )
    )
      changed.push(path);
  }
  await verifyFiles(candidate, workspace, changed, 'repair', policy);
  for (const path of changed) await cp(join(workspace, path), join(candidate, path));
  ledger[prKey].result = {
    status: 'PATCH_READY',
    head,
    base: identity.base,
    run: process.env.FAILED_RUN,
    provider: config.provider,
    model: config.model,
    pi: JSON.parse(await readFile('package.json', 'utf8')).devDependencies[
      '@earendil-works/pi-coding-agent'
    ],
    files: changed,
    costEnforced: Boolean(config.pricing),
  };
  console.log('PASS bounded Pi patch exported; fresh CI remains mandatory');
} catch (error) {
  ledger[prKey].result = {
    status: 'FAILED',
    head,
    reason: error.message.replaceAll(process.env.MODEL_API_KEY, '[redacted]'),
  };
  throw error;
} finally {
  await broker?.close();
  try {
    docker(['rm', '-f', container, agentContainer], 15000);
  } catch {
    /* Already removed or never created. */
  }
  await rm(temp, { recursive: true, force: true });
  settleAttempt(ledger, prKey, Math.min(Date.now() - started, remaining));
  await save();
}
