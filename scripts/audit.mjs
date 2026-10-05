import { spawnSync } from 'node:child_process';
const result = spawnSync('pnpm', ['audit', '--prod', '--json'], {
  stdio: 'pipe',
  encoding: 'utf8',
  timeout: 120000,
});
if (result.error || !result.stdout) throw new Error('Advisory service unavailable');
const audit = JSON.parse(result.stdout);
if (!audit.metadata?.vulnerabilities || audit.error) throw new Error('Audit result unavailable');
const counts = audit.metadata.vulnerabilities;
if ((counts.high ?? 0) + (counts.critical ?? 0) > 0)
  throw new Error('Production high/critical advisory found');
console.log('PASS production audit (npm advisory database)', counts);
