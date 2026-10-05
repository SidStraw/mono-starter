import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: { tasks: { dev: { command: 'vp pack --watch --no-clean', cache: false } } },
  pack: { entry: ['src/index.ts'], format: ['esm'], dts: true, clean: true },
  test: { include: ['src/**/*.test.ts'], passWithNoTests: false },
});
