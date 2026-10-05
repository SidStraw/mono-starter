import { checkProtection } from './check-protection.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile, cp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { copyStarter } from '../scripts/lib.mjs';
import { verifyFiles } from './guards.mjs';
import { api, loadPolicy, installationToken } from './github.mjs';
const [mode, targetArg] = process.argv.slice(2);
const target = resolve(targetArg ?? '../weekly-candidate');
if (mode === 'prepare') {
  const temp = await mkdtemp(join(tmpdir(), 'weekly-lock-'));
  try {
    await copyStarter(temp);
    await rm(join(temp, 'pnpm-lock.yaml'));
    const image = JSON.parse(await readFile('maintenance/images.json', 'utf8')).renovate;
    execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '--cap-drop=ALL',
        '--security-opt=no-new-privileges',
        '--mount',
        `type=bind,src=${temp},dst=/work`,
        '--workdir',
        '/work',
        '--user',
        '0:0',
        '--entrypoint',
        'bash',
        image,
        '-lc',
        'node scripts/bootstrap.mjs && export PATH=/work/.toolchain/bin:$PATH && pnpm install --lockfile-only && pnpm install --frozen-lockfile',
      ],
      {
        env: { PATH: process.env.PATH, HOME: process.env.HOME },
        stdio: 'inherit',
        timeout: 1200000,
      },
    );
    await verifyFiles(process.cwd(), temp, ['pnpm-lock.yaml'], 'update', {});
    await copyStarter(target);
    await cp(join(temp, 'pnpm-lock.yaml'), join(target, 'pnpm-lock.yaml'));
    await writeFile(
      join(target, 'weekly-bound-head'),
      execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
} else if (mode === 'publish') {
  const policy = await loadPolicy();
  await checkProtection(policy);
  const head = (await readFile(join(target, 'weekly-bound-head'), 'utf8')).trim();
  const content = await readFile(join(target, 'pnpm-lock.yaml'));
  if (content.equals(await readFile('pnpm-lock.yaml'))) {
    console.log('PASS no weekly lockfile changes');
    process.exit(0);
  }
  await verifyFiles(process.cwd(), target, ['pnpm-lock.yaml'], 'update', policy);
  const token = await installationToken({ contents: 'write', pull_requests: 'write' });
  const repo = await api(`/repos/${policy.repository}`, token);
  const base = await api(
    `/repos/${policy.repository}/branches/${encodeURIComponent(repo.default_branch)}`,
    token,
  );
  if (base.commit.sha !== head) throw new Error('Weekly base changed; rerun required');
  const open = await api(`/repos/${policy.repository}/pulls?state=open&per_page=100`, token);
  if (open.some((pr) => pr.head.ref === 'renovate/weekly-lockfile')) {
    console.log('PASS existing weekly PR left for full CI');
    process.exit(0);
  }
  // A stale closed branch is deleted only when it belongs to this bot, never force-pushed.
  try {
    const ref = await api(
      `/repos/${policy.repository}/git/ref/heads/renovate/weekly-lockfile`,
      token,
    );
    const commit = await api(`/repos/${policy.repository}/commits/${ref.object.sha}`, token);
    if (commit.committer?.id !== policy.updaterBotUserId || !commit.commit.verification.verified)
      throw new Error('Existing weekly branch is untrusted');
    await api(
      `/repos/${policy.repository}/git/refs/heads/renovate/weekly-lockfile`,
      token,
      'DELETE',
    );
  } catch (error) {
    if (!error.message.includes('HTTP 404')) throw error;
  }
  await api(`/repos/${policy.repository}/git/refs`, token, 'POST', {
    ref: 'refs/heads/renovate/weekly-lockfile',
    sha: head,
  });
  await api('/graphql', token, 'POST', {
    query:
      'mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid}}}',
    variables: {
      input: {
        branch: {
          repositoryNameWithOwner: policy.repository,
          branchName: 'renovate/weekly-lockfile',
        },
        expectedHeadOid: head,
        message: { headline: 'chore: refresh cooled lockfile dependencies' },
        fileChanges: {
          additions: [{ path: 'pnpm-lock.yaml', contents: content.toString('base64') }],
        },
      },
    },
  });
  const pr = await api(`/repos/${policy.repository}/pulls`, token, 'POST', {
    head: 'renovate/weekly-lockfile',
    base: repo.default_branch,
    title: 'chore: weekly lockfile maintenance',
    body: 'Fresh dependency resolution ran without repository/model credentials. The full protected platform checks must pass before merge.',
  });
  await api('/graphql', token, 'POST', {
    query:
      'mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){pullRequest{number}}}',
    variables: { id: pr.node_id },
  });
  console.log(`PASS weekly PR #${pr.number} created; awaiting protected CI`);
} else throw new Error('Expected prepare or publish');
