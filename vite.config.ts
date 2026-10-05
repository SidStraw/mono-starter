import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    plugins: ['typescript', 'vitest'],
    options: { typeAware: true, typeCheck: true },
    rules: { 'vitest/no-disabled-tests': 'error', 'vitest/no-focused-tests': 'error' },
  },
  fmt: {
    singleQuote: true,
    semi: true,
    ignorePatterns: [
      'backlog/**',
      'docs/2026-10-05-vite-plus-starter-agent-spec.md',
      'docs/2026-10-05-vite-plus-starter-implementation-plan.md',
    ],
  },
  run: {
    tasks: {
      develop: { command: 'vp -C apps/web dev', dependsOn: ['@starter/core#build'], cache: false },
      'build-all': {
        command: 'node scripts/report-build.mjs',
        dependsOn: ['@starter/core#build', '@starter/web#build'],
      },
      'check-all': { command: 'vp check', dependsOn: ['@starter/core#build'] },
      'test-all': {
        command:
          'vp run --filter @starter/core --fail-if-no-match test && node --test maintenance/*.test.mjs',
        cache: false,
      },
      policy: { command: 'node scripts/verify-policy.mjs', cache: false },
      audit: { command: 'node scripts/audit.mjs', cache: false },
      consumer: {
        command: 'node scripts/smoke-consumer.mjs',
        dependsOn: ['@starter/core#build'],
        cache: false,
      },
      browser: {
        command: 'node scripts/smoke-browser.mjs',
        dependsOn: ['@starter/web#build'],
        cache: false,
      },
      backlog: { command: 'node scripts/smoke-backlog.mjs', cache: false },
      starter: { command: 'node scripts/smoke-starter.mjs', cache: false },
      'verify-inner': {
        command: 'node scripts/verify-clean.mjs',
        dependsOn: [
          'policy',
          'audit',
          'check-all',
          'test-all',
          'build-all',
          'consumer',
          'browser',
          'backlog',
        ],
        cache: false,
      },
      'verify-all': {
        command: 'node scripts/report.mjs',
        dependsOn: ['verify-inner', 'starter'],
        cache: false,
      },
    },
  },
});
