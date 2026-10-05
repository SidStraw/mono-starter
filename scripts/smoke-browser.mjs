import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { createServer } from 'node:net';
const probe = createServer();
await new Promise((done) => probe.listen(0, '127.0.0.1', done));
const port = probe.address().port;
await new Promise((done) => probe.close(done));
const url = `http://127.0.0.1:${port}`;
const server = spawn(
  'pnpm',
  [
    'exec',
    'vp',
    '-C',
    'apps/web',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  { stdio: 'pipe', detached: process.platform !== 'win32' },
);
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('Preview exited early');
    try {
      ready = (await fetch(url)).ok;
    } catch {
      ready = false;
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Preview not ready');
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.locator('#summary[data-total="12"]').waitFor();
  if (
    (await page.locator('#summary').textContent()) !== '3 values · total 12 · average 4' ||
    errors.length
  )
    throw new Error(`Browser output failed: ${errors.join(', ')}`);
  console.log('PASS production browser: core result rendered, no page errors');
} finally {
  await browser?.close();
  if (server.exitCode === null && server.pid !== undefined) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill();
    }
  }
}
