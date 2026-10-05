import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rm, symlink, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const nodeVersion = (await readFile('.node-version', 'utf8')).trim();
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const pnpmVersion = manifest.packageManager.match(/^pnpm@(\d+\.\d+\.\d+)$/)?.[1];
if (!pnpmVersion || !/^\d+\.\d+\.\d+$/.test(nodeVersion))
  throw new Error('Exact Node/pnpm versions required');
if (!['darwin', 'linux'].includes(process.platform) || !['arm64', 'x64'].includes(process.arch))
  throw new Error('Unsupported platform');
const base = resolve('.toolchain');
async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}
await mkdir(base, { recursive: true });
const archiveName = `node-v${nodeVersion}-${process.platform === 'darwin' ? 'darwin' : 'linux'}-${process.arch}.tar.gz`;
const nodeBase = `https://nodejs.org/dist/v${nodeVersion}/`;
const checksums = await (await get(`${nodeBase}SHASUMS256.txt`)).text();
const expected = checksums
  .split('\n')
  .find((line) => line.endsWith(`  ${archiveName}`))
  ?.split(' ')[0];
if (!expected) throw new Error('Official Node checksum missing');
const nodeArchive = Buffer.from(await (await get(`${nodeBase}${archiveName}`)).arrayBuffer());
if (createHash('sha256').update(nodeArchive).digest('hex') !== expected)
  throw new Error('Node integrity mismatch');
await writeFile(`${base}/node.tar.gz`, nodeArchive);
await rm(`${base}/node`, { recursive: true, force: true });
await mkdir(`${base}/node`);
execFileSync('tar', ['-xzf', `${base}/node.tar.gz`, '--strip-components=1', '-C', `${base}/node`]);
const metadata = await (await get('https://registry.npmjs.org/pnpm')).json();
const published = metadata.time?.[pnpmVersion];
if (!published || Date.now() - Date.parse(published) < 4320 * 60000)
  throw new Error('pnpm cooling period not met');
const dist = metadata.versions[pnpmVersion]?.dist;
if (
  !dist?.integrity?.startsWith('sha512-') ||
  !dist.tarball.startsWith('https://registry.npmjs.org/')
)
  throw new Error('pnpm source/integrity missing');
const pnpmArchive = Buffer.from(await (await get(dist.tarball)).arrayBuffer());
if (`sha512-${createHash('sha512').update(pnpmArchive).digest('base64')}` !== dist.integrity)
  throw new Error('pnpm integrity mismatch');
await writeFile(`${base}/pnpm.tgz`, pnpmArchive);
await rm(`${base}/pnpm`, { recursive: true, force: true });
await mkdir(`${base}/pnpm`);
execFileSync('tar', ['-xzf', `${base}/pnpm.tgz`, '--strip-components=1', '-C', `${base}/pnpm`]);
const binaryPackage = `@pnpm/exe.${process.platform}-${process.arch}`;
if (metadata.versions[pnpmVersion].optionalDependencies?.[binaryPackage] !== pnpmVersion)
  throw new Error('pnpm native version mismatch');
const nativeMetadata = await (
  await get(`https://registry.npmjs.org/${encodeURIComponent(binaryPackage)}`)
).json();
if (
  !nativeMetadata.time?.[pnpmVersion] ||
  Date.now() - Date.parse(nativeMetadata.time[pnpmVersion]) < 4320 * 60000
)
  throw new Error('Native pnpm cooling period not met');
const nativeDist = nativeMetadata.versions[pnpmVersion].dist;
if (
  !nativeDist.integrity?.startsWith('sha512-') ||
  !nativeDist.tarball.startsWith('https://registry.npmjs.org/')
)
  throw new Error('Native pnpm source/integrity missing');
const nativeArchive = Buffer.from(await (await get(nativeDist.tarball)).arrayBuffer());
if (
  `sha512-${createHash('sha512').update(nativeArchive).digest('base64')}` !== nativeDist.integrity
)
  throw new Error('Native pnpm integrity mismatch');
await writeFile(`${base}/pnpm-native.tgz`, nativeArchive);
await rm(`${base}/pnpm-native`, { recursive: true, force: true });
await mkdir(`${base}/pnpm-native`);
execFileSync('tar', [
  '-xzf',
  `${base}/pnpm-native.tgz`,
  '--strip-components=1',
  '-C',
  `${base}/pnpm-native`,
]);
await mkdir(`${base}/bin`, { recursive: true });
await rm(`${base}/bin/node`, { force: true });
await symlink('../node/bin/node', `${base}/bin/node`);
await writeFile(
  `${base}/bin/pnpm`,
  '#!/bin/sh\nTASK_BIN=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nexport PATH="$TASK_BIN:$PATH"\nexec "$TASK_BIN/../pnpm-native/pnpm" "$@"\n',
);
await chmod(`${base}/bin/pnpm`, 0o755);
console.log(
  `PASS bootstrap: Node ${nodeVersion}, pnpm ${pnpmVersion}; prepend ${root}/.toolchain/bin to PATH`,
);
