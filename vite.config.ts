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
    ignorePatterns: ['backlog/**'],
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'tests/**/*.test.ts'],
    passWithNoTests: false,
  },
  run: {
    tasks: {
      develop: {
        command: "vp run --filter './apps/*' --filter './packages/*' --parallel dev",
        dependsOn: ['@starter/core#build'],
        cache: false,
      },
      'check-all': { command: 'vp check', dependsOn: ['@starter/core#build'] },
      'test-all': {
        command: ['vp test run', 'playwright test'],
        dependsOn: ['@starter/web#build'],
        cache: false,
      },
      'verify-all': {
        command: 'pnpm audit --prod --audit-level high',
        dependsOn: ['check-all', 'test-all'],
        cache: false,
      },
    },
  },
});
