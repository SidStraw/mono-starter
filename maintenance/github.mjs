import { createPrivateKey, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { verifyUpdater } from './guards.mjs';

export async function api(path, token, method = 'GET', body) {
  if (!path.startsWith('/') || path.includes('..')) throw new Error('Invalid GitHub API path');
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`GitHub API ${method} failed: HTTP ${response.status}`);
  if (response.status === 204) return null;
  const result = await response.json();
  if (result.errors?.length) throw new Error('GitHub GraphQL operation failed');
  return result;
}
export async function installationToken(permissions) {
  const appId = process.env.MAINTENANCE_APP_ID;
  const installation = process.env.MAINTENANCE_INSTALLATION_ID;
  const repository = process.env.GITHUB_REPOSITORY;
  if (
    !/^\d+$/.test(appId ?? '') ||
    !/^\d+$/.test(installation ?? '') ||
    !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')
  )
    throw new Error('App installation configuration missing');
  const policy = JSON.parse(await readFile('maintenance/policy.json', 'utf8'));
  if (Number(appId) !== Number(policy.updaterAppId) || repository !== policy.repository)
    throw new Error('Configured App/repository does not match trusted policy');
  const timestamp = Math.floor(Date.now() / 1000);
  const encode = (object) => Buffer.from(JSON.stringify(object)).toString('base64url');
  const message = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: timestamp - 60, exp: timestamp + 540, iss: appId })}`;
  const jwt = `${message}.${sign('RSA-SHA256', Buffer.from(message), createPrivateKey(process.env.MAINTENANCE_APP_PRIVATE_KEY)).toString('base64url')}`;
  const result = await api(`/app/installations/${installation}/access_tokens`, jwt, 'POST', {
    repositories: [repository.split('/')[1]],
    permissions,
  });
  return result.token;
}
export async function trustedPr(repository, number, token, policy, runId) {
  if (!Number.isSafeInteger(Number(number)) || Number(number) < 1)
    throw new Error('Invalid PR number');
  const pr = await api(`/repos/${repository}/pulls/${number}`, token);
  const commit = await api(`/repos/${repository}/commits/${pr.head.sha}`, token);
  if (
    !policy.updaterBotUserId ||
    pr.user.id !== policy.updaterBotUserId ||
    commit.committer?.id !== policy.updaterBotUserId ||
    !commit.commit.verification?.verified
  )
    throw new Error('PR/HEAD must be signed by configured updater App bot');
  const identity = {
    repository,
    headRepository: pr.head.repo.full_name,
    baseRepository: pr.base.repo.full_name,
    appId: policy.updaterAppId,
    authorType: pr.user.type,
    head: pr.head.sha,
    base: pr.base.sha,
    runId: String(runId),
  };
  verifyUpdater(policy, identity);
  return { pr, ...identity };
}
export async function loadPolicy(path = 'maintenance/policy.json') {
  const policy = JSON.parse(await readFile(path, 'utf8'));
  if (!policy.enabled || policy.repository !== process.env.GITHUB_REPOSITORY)
    throw new Error('Target maintenance is disabled/unconfigured');
  return policy;
}
