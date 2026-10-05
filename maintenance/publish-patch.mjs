import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { verifyFiles } from './guards.mjs';
import { loadPolicy, trustedPr, api, installationToken } from './github.mjs';

const [candidatePath, expectedHead, number, mode = 'update'] = process.argv.slice(2);
if (!candidatePath || !/^[a-f0-9]{40}$/.test(expectedHead ?? ''))
  throw new Error('Bound patch arguments required');
const policy = await loadPolicy();
const repository = policy.repository;
const identity = await trustedPr(
  repository,
  number,
  process.env.GH_READ_TOKEN,
  policy,
  process.env.GITHUB_RUN_ID,
);
if (identity.head !== expectedHead) throw new Error('HEAD changed before patch publication');
const candidate = resolve(candidatePath);
const git = (args, cwd = candidate) =>
  execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'diff.external=', ...args], {
    cwd,
    encoding: 'utf8',
  });
const temp = await mkdtemp(join(tmpdir(), 'trusted-patch-'));
try {
  git(['worktree', 'add', '--detach', temp, expectedHead]);
  const files = git(['diff', '--no-ext-diff', '--no-textconv', '--name-only', '-z', expectedHead])
    .split('\0')
    .filter(Boolean);
  if (git(['ls-files', '--others', '--exclude-standard']).trim())
    throw new Error('Untracked patch files rejected');
  if (!files.length) {
    console.log('PASS no patch needed');
    process.exitCode = 0;
  } else {
    await verifyFiles(temp, candidate, files, mode, policy);
    const additions = [];
    for (const path of files) {
      const content = await readFile(join(candidate, path));
      if (content.length > 2 * 1024 * 1024) throw new Error('Patch file exceeds limit');
      additions.push({ path, contents: content.toString('base64') });
    }
    const token = await installationToken({ contents: 'write' });
    const commit = await api('/graphql', token, 'POST', {
      query:
        'mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input:$input) { commit { oid } } }',
      variables: {
        input: {
          branch: { repositoryNameWithOwner: repository, branchName: identity.pr.head.ref },
          expectedHeadOid: expectedHead,
          message: {
            headline:
              mode === 'repair'
                ? 'fix: restore dependency compatibility'
                : 'chore: synchronize toolchain and lockfile',
          },
          fileChanges: { additions },
        },
      },
    });
    console.log(
      `PASS published bounded ${mode} patch: ${commit.data.createCommitOnBranch.commit.oid}; fresh CI required`,
    );
  }
} finally {
  git(['worktree', 'remove', '--force', temp]);
  await rm(temp, { recursive: true, force: true });
}
