import { readFile } from 'node:fs/promises';
import { api, installationToken } from './github.mjs';
import { verifyGate } from './guards.mjs';
const policy = JSON.parse(await readFile('maintenance/policy.json', 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
const run = await api(`/repos/${repository}/actions/runs/${runId}`, process.env.GH_READ_TOKEN);
const jobs = await api(
  `/repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
  process.env.GH_READ_TOKEN,
);
const expected = {
  repository,
  head: process.env.CANDIDATE_HEAD,
  base: process.env.CANDIDATE_BASE,
  policy: process.env.CANDIDATE_BASE,
  runId,
  workflow: 'ci.yml',
};
const result = {
  ...expected,
  producer: 'trusted-controller',
  jobs: Object.fromEntries(
    jobs.jobs
      .filter((job) => policy.requiredJobs.some((name) => job.name === `starter/${name}`))
      .map((job) => [job.name.slice('starter/'.length), job.conclusion]),
  ),
};
let conclusion = 'success';
try {
  if (
    process.env.REQUIRED_MATRIX_RESULT !== 'success' ||
    run.path.split('@')[0] !== '.github/workflows/ci.yml' ||
    run.head_sha !== expected.policy
  )
    throw new Error('Untrusted/skipped workflow');
  if (process.env.PR_NUMBER) {
    const pr = await api(
      `/repos/${repository}/pulls/${process.env.PR_NUMBER}`,
      process.env.GH_READ_TOKEN,
    );
    if (pr.head.sha !== expected.head || pr.base.sha !== expected.base)
      throw new Error('HEAD/base changed');
  }
  verifyGate(expected, result, policy.requiredJobs);
} catch {
  conclusion = 'failure';
}
if (policy.enabled && policy.repository === repository && process.env.PR_NUMBER) {
  const token = await installationToken({ checks: 'write', contents: 'read' });
  await api(`/repos/${repository}/check-runs`, token, 'POST', {
    name: policy.requiredCheck,
    head_sha: expected.head,
    status: 'completed',
    conclusion,
    output: { title: `Starter ${conclusion}`, summary: JSON.stringify(result) },
  });
}
if (conclusion !== 'success')
  throw new Error('Required verification jobs did not all succeed for current HEAD/base/policy');
console.log(
  'PASS all actual required platform jobs; protected App check published only when configured',
);
