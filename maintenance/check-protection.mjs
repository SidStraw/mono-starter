import { api, installationToken } from './github.mjs';
export async function checkProtection(policy) {
  const token = await installationToken({ administration: 'read', contents: 'read' });
  const repo = await api(`/repos/${policy.repository}`, token);
  const protection = await api(
    `/repos/${policy.repository}/branches/${encodeURIComponent(repo.default_branch)}/protection`,
    token,
  );
  const checks = protection.required_status_checks;
  if (
    !repo.allow_auto_merge ||
    !checks?.strict ||
    !checks.checks.some(
      (check) =>
        check.context === policy.requiredCheck && check.app_id === Number(policy.updaterAppId),
    ) ||
    !protection.enforce_admins?.enabled ||
    protection.allow_force_pushes?.enabled ||
    protection.allow_deletions?.enabled
  )
    throw new Error(
      'BLOCKED: strict protected App check and auto-merge must be verified before maintenance',
    );
  return true;
}
