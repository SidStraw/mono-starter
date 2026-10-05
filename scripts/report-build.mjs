import { access } from 'node:fs/promises';
await Promise.all(
  [
    'packages/core/dist/index.mjs',
    'packages/core/dist/index.d.mts',
    'apps/web/dist/index.html',
  ].map((path) => access(path)),
);
console.log('PASS core and web build outputs exist after the dependency graph completed');
