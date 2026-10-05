import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
const temp = await mkdtemp(join(tmpdir(), 'isolation-canary-'));
const canary = 'fixture-controller-only-secret';
try {
  await writeFile(join(temp, 'controller-secret'), canary);
  const image = JSON.parse(await readFile('maintenance/images.json', 'utf8')).renovate;
  const output = execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '--network=none',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--entrypoint',
      '/usr/local/renovate/node',
      image,
      '-e',
      "const fs=require('fs'),os=require('os');if(process.env.MODEL_API_KEY||process.env.MAINTENANCE_APP_PRIVATE_KEY||process.env.GH_WRITE_TOKEN||fs.existsSync('/var/run/docker.sock')||fs.existsSync(process.argv[1]))process.exit(1);const interfaces=Object.values(os.networkInterfaces()).flat();if(interfaces.some(x=>!x.internal))process.exit(1);console.log('PASS container sees no controller credentials, host secret, socket or network')",
      join(temp, 'controller-secret'),
    ],
    { env: { PATH: process.env.PATH, HOME: process.env.HOME }, encoding: 'utf8' },
  );
  if (output.includes(canary)) throw new Error('Canary exposed');
  console.log(output.trim());
} finally {
  await rm(temp, { recursive: true, force: true });
}
