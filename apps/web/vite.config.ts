import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    tasks: {
      build: { command: 'vp build', dependsOn: [{ task: 'build', from: 'dependencies' }] },
    },
  },
});
