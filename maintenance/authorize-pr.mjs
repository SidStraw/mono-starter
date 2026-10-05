import { compatibilityFailure } from './classify-failure.mjs';
import { appendFile } from 'node:fs/promises';
import { loadPolicy, trustedPr, api } from './github.mjs';
const policy = await loadPolicy();
const identity = await trustedPr(
  policy.repository,
  process.env.PR_NUMBER,
  process.env.GH_READ_TOKEN,
  policy,
  process.env.GITHUB_RUN_ID,
);
if (process.argv[2] === 'repair') {
  const run = await api(
    `/repos/${policy.repository}/actions/runs/${process.env.FAILED_RUN}`,
    process.env.GH_READ_TOKEN,
  );
  if (
    run.conclusion !== 'failure' ||
    run.path.split('@')[0] !== '.github/workflows/ci.yml' ||
    run.head_sha !== identity.base ||
    run.repository.full_name !== policy.repository ||
    !run.pull_requests.some(
      (pr) => pr.number === Number(process.env.PR_NUMBER) && pr.head.sha === identity.head,
    )
  )
    throw new Error('Untrusted/stale failure run');
  const jobs = await api(
    `/repos/${policy.repository}/actions/runs/${process.env.FAILED_RUN}/jobs?per_page=100`,
    process.env.GH_READ_TOKEN,
  );
  compatibilityFailure(jobs.jobs, policy.requiredJobs);
}
await appendFile(process.env.GITHUB_OUTPUT, `head=${identity.head}\nbase=${identity.base}\n`);
console.log('PASS updater identity and current HEAD');
