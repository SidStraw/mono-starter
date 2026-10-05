import { readFile, lstat } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parse, parseAllDocuments } from 'yaml';

const version = /^\d+\.\d+\.\d+$/;
export function verifyGate(expected, result, requiredJobs) {
  for (const key of ['repository', 'head', 'base', 'policy', 'runId', 'workflow'])
    if (!expected[key] || result[key] !== expected[key])
      throw new Error(`Stale/untrusted gate: ${key}`);
  if (result.producer !== 'trusted-controller') throw new Error('Untrusted result producer');
  if (Object.keys(result.jobs ?? {}).length !== requiredJobs.length)
    throw new Error('Unexpected or missing job');
  for (const job of requiredJobs)
    if (result.jobs[job] !== 'success') throw new Error(`Required job did not succeed: ${job}`);
  return true;
}
export function verifyUpdater(policy, pr) {
  if (!policy.enabled || !policy.repository || !policy.updaterAppId)
    throw new Error('Maintenance is disabled/unconfigured');
  if (
    pr.repository !== policy.repository ||
    pr.headRepository !== policy.repository ||
    pr.baseRepository !== policy.repository ||
    pr.appId !== policy.updaterAppId ||
    pr.authorType !== 'Bot' ||
    !pr.head ||
    !pr.base ||
    !pr.runId
  )
    throw new Error('Untrusted updater identity');
  return true;
}
export function safePath(path) {
  return (
    path &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !path.includes('\0') &&
    posix.normalize(path) === path &&
    !path.split('/').some((part) => part === '..' || part === '.git')
  );
}
export function repairPath(path, policy) {
  return (
    safePath(path) &&
    /^(apps\/web|packages\/core)\/src\/.+\.(ts|css)$/.test(path) &&
    !/(^|\/).*\.(test|spec)\.|__snapshots__|__tests__/.test(path) &&
    !(policy.protectedPaths ?? []).includes(path)
  );
}
function normalizeManifest(data) {
  const copy = structuredClone(data);
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [key, value] of Object.entries(copy[section] ?? {})) {
      if (value.startsWith('workspace:') || value.startsWith('catalog:')) continue;
      if (!version.test(value) && !/^npm:(?:@[^/]+\/)?[^@]+@\d+\.\d+\.\d+$/.test(value))
        throw new Error('Floating manifest version');
      copy[section][key] = '<version>';
    }
  }
  if (copy.packageManager) {
    if (!/^pnpm@\d+\.\d+\.\d+$/.test(copy.packageManager)) throw new Error('Floating pnpm');
    copy.packageManager = 'pnpm@<version>';
  }
  if (copy.devEngines?.runtime) {
    const runtime = copy.devEngines.runtime;
    if (runtime.name !== 'node' || !version.test(runtime.version) || runtime.onFail !== 'download')
      throw new Error('Invalid pinned runtime');
    runtime.version = '<version>';
  }
  return copy;
}
export function updaterChange(path, before, after) {
  if (!safePath(path) || before == null || after == null)
    throw new Error('Updater cannot add/delete/rename files');
  if (path === 'pnpm-lock.yaml') {
    const documents = parseAllDocuments(after);
    if (documents.some((doc) => doc.errors.length) || !documents.length)
      throw new Error('Invalid lockfile');
    for (const doc of documents) {
      const data = doc.toJSON();
      if (!data.importers || !data.packages || !data.snapshots) throw new Error('Invalid lockfile');
    }
    return true;
  }
  if (path === 'maintenance/images.json') {
    const left = JSON.parse(before);
    const right = JSON.parse(after);
    const images = {
      renovate: /^ghcr\.io\/renovatebot\/renovate:\d+\.\d+\.\d+@sha256:[a-f0-9]{64}$/,
      node: /^node:\d+\.\d+\.\d+-bookworm-slim@sha256:[a-f0-9]{64}$/,
    };
    for (const [name, format] of Object.entries(images)) {
      if (!format.test(left[name]) || !format.test(right[name])) throw new Error('Unpinned image');
      left[name] = right[name] = '<image>';
    }
    if (!isDeepStrictEqual(left, right)) throw new Error('Image configuration changed');
    return true;
  }
  if (['package.json', 'apps/web/package.json', 'packages/core/package.json'].includes(path)) {
    if (
      !isDeepStrictEqual(
        normalizeManifest(JSON.parse(before)),
        normalizeManifest(JSON.parse(after)),
      )
    )
      throw new Error('Updater changed manifest structure/scripts/exports');
    return true;
  }
  if (path === 'pnpm-workspace.yaml') {
    const normalize = (text) => {
      const obj = parse(text);
      for (const [key, value] of Object.entries(obj.catalog ?? {})) {
        if (!version.test(value)) throw new Error('Floating catalog version');
        obj.catalog[key] = '<version>';
      }
      for (const key of ['vite@*', 'vitest@*'])
        if (obj.overrides?.[key]) obj.overrides[key] = '<version>';
      if (obj.peerDependencyRules?.allowedVersions) {
        const entries = Object.entries(obj.peerDependencyRules.allowedVersions);
        if (
          entries.length !== 1 ||
          !/^vitest@\d+\.\d+\.\d+>vite$/.test(entries[0][0]) ||
          !version.test(entries[0][1])
        )
          throw new Error('Unbounded peer exception');
        obj.peerDependencyRules.allowedVersions = '<bundled-vitest-vite>';
      }
      return obj;
    };
    if (!isDeepStrictEqual(normalize(before), normalize(after)))
      throw new Error('Updater weakened workspace policy');
    return true;
  }
  if (path.startsWith('.github/workflows/') || path === 'maintenance/renovate-config.cjs') {
    const normalize = (text) =>
      text
        .replace(
          /(uses:\s*actions\/checkout@)[a-f0-9]{40}(\s*#\s*)v\d+\.\d+\.\d+/g,
          '$1<sha>$2<version>',
        )
        .replace(/(?<=uses:\s*actions\/checkout@)[a-f0-9]{40}/g, '<sha>')
        .replace(
          /ghcr\.io\/renovatebot\/renovate:\d+\.\d+\.\d+@sha256:[a-f0-9]{64}/g,
          '<renovate-image>',
        );
    if (normalize(before) !== normalize(after))
      throw new Error('Updater changed protected controller/workflow');
    return true;
  }
  throw new Error(`Updater path rejected: ${path}`);
}
export async function verifyFiles(base, candidate, paths, mode, policy) {
  if (!paths.length) throw new Error('Empty patch');
  for (const path of paths) {
    if (!safePath(path)) throw new Error('Unsafe patch path');
    for (const directory of [base, candidate]) {
      let current = directory;
      for (const component of path.split('/')) {
        current = join(current, component);
        if ((await lstat(current)).isSymbolicLink())
          throw new Error('Patch ancestor symlink rejected');
      }
    }
    const stat = await lstat(join(candidate, path));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Patch file type rejected');
    const before = await readFile(join(base, path), 'utf8');
    const after = await readFile(join(candidate, path), 'utf8');
    if (mode === 'repair') {
      if (!repairPath(path, policy)) throw new Error(`Repair path rejected: ${path}`);
    } else updaterChange(path, before, after);
  }
  return true;
}
export function reserveAttempt(ledger, pr, limits, now = Date.now()) {
  const state = ledger[pr] ?? { attempts: 0, milliseconds: 0 };
  if (
    state.attempts >= limits.maxAttempts ||
    state.milliseconds >= limits.maxMilliseconds ||
    state.activeUntil > now
  )
    throw new Error('Repair retry/time limit or active lease');
  const remaining = limits.maxMilliseconds - state.milliseconds;
  ledger[pr] = {
    ...state,
    attempts: state.attempts + 1,
    activeUntil: now + remaining,
    startedAt: now,
    milliseconds: limits.maxMilliseconds,
  };
  // Charge the full remaining time up front; a crash never grants more time on rerun.
  return remaining;
}
export function settleAttempt(ledger, pr, elapsed) {
  const state = ledger[pr];
  if (!state) throw new Error('Missing attempt');
  const reserved = state.activeUntil - state.startedAt;
  state.milliseconds -= Math.max(0, reserved - elapsed);
  state.activeUntil = 0;
}
