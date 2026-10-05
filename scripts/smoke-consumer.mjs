import { mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { packages, run } from './lib.mjs';
const temp = await mkdtemp(join(tmpdir(), 'starter-consumer-'));
try {
  const core = (await packages()).find((pkg) => pkg.relative === 'packages/core');
  const target = join(temp, 'node_modules', core.manifest.name);
  await mkdir(target, { recursive: true });
  await cp(join(core.directory, 'dist'), join(target, 'dist'), { recursive: true });
  await writeFile(join(target, 'package.json'), JSON.stringify(core.manifest));
  await writeFile(join(temp, 'package.json'), '{"type":"module"}');
  await writeFile(
    join(temp, 'index.mjs'),
    `import { summarizeNumbers } from ${JSON.stringify(core.manifest.name)};\nimport assert from 'node:assert/strict';\nassert.deepEqual(summarizeNumbers([2,4,6]), {count:3,total:12,average:4});\n`,
  );
  await writeFile(
    join(temp, 'index.ts'),
    `import { summarizeNumbers, type NumberSummary } from ${JSON.stringify(core.manifest.name)};\nconst result: NumberSummary = summarizeNumbers([2,4,6]);\n// @ts-expect-error strings cannot be supplied to the public API\nsummarizeNumbers(['2']);\nvoid result;\n`,
  );
  await writeFile(
    join(temp, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        types: [],
        lib: ['ES2022'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
      },
      include: ['index.ts'],
    }),
  );
  run(process.execPath, [join(temp, 'index.mjs')], { cwd: temp });
  run(resolve('node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], { cwd: temp });
  console.log('PASS consumer: isolated dist, JavaScript result and public declaration');
} finally {
  await rm(temp, { recursive: true, force: true });
}
