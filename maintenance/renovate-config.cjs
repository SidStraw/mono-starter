// Trusted default-branch controller; candidate code and install scripts never run here.
module.exports = {
  platform: 'github',
  autodiscover: false,
  repositories: process.env.MAINTENANCE_REPOSITORY ? [process.env.MAINTENANCE_REPOSITORY] : [],
  requireConfig: 'required',
  onboarding: false,
  ...(process.env.RENOVATE_GIT_AUTHOR ? { gitAuthor: process.env.RENOVATE_GIT_AUTHOR } : {}),
  platformCommit: 'enabled',
  allowScripts: false,
  allowPlugins: false,
  allowedCommands: [],
  allowShellExecutorForPostUpgradeCommands: false,
  skipArtifactsUpdate: true,
  exposeAllEnv: false,
};
