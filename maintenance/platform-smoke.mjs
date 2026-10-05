import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { copyStarter } from '../scripts/lib.mjs';
const temp = await mkdtemp(join(tmpdir(), 'starter-linux-'));
try {
  await copyStarter(temp);
  const image = JSON.parse(await readFile('maintenance/images.json', 'utf8')).renovate;
  execFileSync(
    'docker',
    [
      'run',
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
      image,
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
    { stdio: 'inherit', env: { PATH: process.env.PATH, HOME: process.env.HOME }, timeout: 1200000 },
  );
  console.log('PASS local Linux x64 full verification; GitHub-hosted runners remain NOT RUN');
} finally {
  await rm(temp, { recursive: true, force: true });
}
