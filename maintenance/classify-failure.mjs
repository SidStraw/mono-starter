export function compatibilityFailure(jobs, requiredJobs) {
  const platforms = jobs.filter((job) =>
    requiredJobs.some((name) => job.name === `starter/${name}`),
  );
  if (platforms.length !== requiredJobs.length) throw new Error('Incomplete platform results');
  let found = false;
  for (const job of platforms) {
    const steps = new Map(job.steps.map((step) => [step.name, step.conclusion]));
    if (job.conclusion === 'success') continue;
    if (
      job.conclusion !== 'failure' ||
      steps.get('Prepare candidate') !== 'success' ||
      steps.get('Supply-chain gates') !== 'success' ||
      steps.get('Compatibility checks') !== 'failure'
    )
      throw new Error('Failure is not eligible compatibility failure');
    found = true;
  }
  if (!found) throw new Error('No compatibility failure');
  return true;
}
