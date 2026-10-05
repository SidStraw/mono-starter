import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    tasks: {
      dev: { command: 'vp dev', cache: false },
      build: { command: 'vp build', dependsOn: [{ task: 'build', from: 'dependencies' }] },
    },
  },
});
