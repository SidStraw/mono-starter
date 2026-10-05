import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { copyStarter } from '../scripts/lib.mjs';
import { randomUUID, createHash } from 'node:crypto';
const temp = await mkdtemp(join(tmpdir(), 'starter-linux-'));
const container = `starter-linux-${randomUUID()}`;
const env = { PATH: process.env.PATH, HOME: process.env.HOME };
try {
  await copyStarter(temp);
  const image = JSON.parse(await readFile('maintenance/images.json', 'utf8')).renovate;
  // Classic Docker stores cannot associate one index digest with two local architectures.
  // Resolve the x64 child from the immutable index without removing the existing arm64 image.
  const indexDigest = image.split('@')[1];
  const auth = await fetch(
    'https://ghcr.io/token?service=ghcr.io&scope=repository:renovatebot/renovate:pull',
  );
  if (!auth.ok) throw new Error('Public image authorization unavailable');
  const token = (await auth.json()).token;
  const response = await fetch(`https://ghcr.io/v2/renovatebot/renovate/manifests/${indexDigest}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept:
        'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json',
    },
  });
  if (!response.ok) throw new Error('Pinned image index unavailable');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (`sha256:${createHash('sha256').update(bytes).digest('hex')}` !== indexDigest)
    throw new Error('Image index integrity mismatch');
  const child = JSON.parse(bytes).manifests.find(
    (entry) => entry.platform?.os === 'linux' && entry.platform?.architecture === 'amd64',
  );
  if (!/^sha256:[a-f0-9]{64}$/.test(child?.digest ?? ''))
    throw new Error('Pinned Linux x64 image missing');
  const platformImage = image.split('@')[0] + '@' + child.digest;
  execFileSync(
    'docker',
    [
      'run',
      '--name',
      container,
      '--rm',
      '--platform=linux/amd64',
      '--mount',
      `type=bind,src=${temp},dst=/work`,
      '--workdir',
      '/work',
      '--user',
      '0:0',
      '--entrypoint',
      'bash',
      platformImage,
      '-lc',
      `set -e
node -e 'if(process.platform!=="linux"||process.arch!=="x64")process.exit(1)'
node scripts/bootstrap.mjs
export PATH=/work/.toolchain/bin:$PATH
pnpm install --frozen-lockfile
pnpm exec backlog init linux-starter --defaults --no-git --integration-mode cli --agent-instructions agents --include-remote false --check-branches false --auto-open-browser false
pnpm exec backlog config set filesystemOnly true
pnpm exec playwright install --with-deps chromium
git init -b main
pnpm exec vp fmt --write
git add .
pnpm verify
`,
    ],
    { stdio: 'inherit', env, timeout: 1200000 },
  );
  console.log('PASS local Linux x64 full verification; GitHub-hosted runners remain NOT RUN');
} finally {
  try {
    execFileSync('docker', ['rm', '-f', container], { env, stdio: 'ignore', timeout: 15000 });
  } catch {
    /* The --rm container may already be gone. */
  }
  await rm(temp, { recursive: true, force: true });
}
