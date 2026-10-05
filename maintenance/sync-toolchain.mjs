import { controllerReleases } from './release-metadata.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse, stringify } from 'yaml';
import { createHash } from 'node:crypto';

async function metadata(name) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error(`Registry unavailable for ${name}`);
  return response.json();
}
export async function syncToolchain(target) {
  const paths = ['package.json', 'apps/web/package.json', 'packages/core/package.json'];
  const manifests = await Promise.all(
    paths.map(async (path) => JSON.parse(await readFile(join(target, path), 'utf8'))),
  );
  const viteVersion = manifests[0].devDependencies['vite-plus'];
  const viteData = await metadata('vite-plus');
  const bundle = viteData.versions[viteVersion]?.dependencies;
  if (
    !bundle ||
    !/^npm:@voidzero-dev\/vite-plus-core@\d+\.\d+\.\d+$/.test(bundle.vite) ||
    !/^\d+\.\d+\.\d+$/.test(bundle.vitest)
  )
    throw new Error('Unsupported Vite+ bundle metadata');
  for (let i = 0; i < manifests.length; i++) {
    manifests[i].devDependencies['vite-plus'] = viteVersion;
    if (manifests[i].devDependencies.vitest) manifests[i].devDependencies.vitest = bundle.vitest;
    await writeFile(join(target, paths[i]), JSON.stringify(manifests[i], null, 2) + '\n');
  }
  const config = parse(await readFile(join(target, 'pnpm-workspace.yaml'), 'utf8'));
  config.overrides.vite = bundle.vite;
  config.overrides.vitest = bundle.vitest;
  config.peerDependencyRules = {
    allowedVersions: { [`vitest@${bundle.vitest}>vite`]: bundle.vite.split('@').at(-1) },
  };
  await writeFile(join(target, 'pnpm-workspace.yaml'), stringify(config));
  const old = JSON.parse(await readFile(join(target, 'docs/toolchain-baseline.json'), 'utf8'));
  const names = new Map();
  for (const manifest of manifests)
    for (const [name, version] of Object.entries(manifest.devDependencies ?? {}))
      names.set(name, version);
  names.set('pnpm', manifests[0].packageManager.split('@')[1]);
  names.set('@voidzero-dev/vite-plus-core', bundle.vite.split('@').at(-1));
  names.set('vitest', bundle.vitest);
  const packages = {};
  for (const [name, version] of names) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Floating version: ${name}`);
    const data = name === 'vite-plus' ? viteData : await metadata(name);
    const publishedAt = data.time?.[version];
    if (!publishedAt || Date.now() - Date.parse(publishedAt) < 4320 * 60000)
      throw new Error(`Cooldown not met: ${name}@${version}`);
    const info = data.versions[version];
    packages[name] = {
      version,
      publishedAt,
      source: `https://registry.npmjs.org/${encodeURIComponent(name)}`,
      repository: info.repository,
      engines: info.engines ?? null,
      integrity: info.dist.integrity,
    };
  }
  const nodes = await (await fetch('https://nodejs.org/dist/index.json')).json();
  const version = (await readFile(join(target, '.node-version'), 'utf8')).trim();
  const node = nodes.find((release) => release.version === `v${version}`);
  if (!node?.lts || Date.now() - Date.parse(node.date) < 4320 * 60000)
    throw new Error('Node must be a cooled LTS release');
  const releases = await controllerReleases(target);
  const baseline = {
    ...old,
    ...releases,
    queriedAt: new Date().toISOString(),
    node: {
      version,
      lts: node.lts,
      publishedAt: node.date,
      source: 'https://nodejs.org/dist/index.json',
    },
    packages,
  };
  const images = JSON.parse(await readFile(join(target, 'maintenance/images.json'), 'utf8'));
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ manifests, version, bundle, images, actions: releases.actions }))
    .digest('hex');
  baseline.fingerprint = fingerprint;
  baseline.images = images;
  if (old.fingerprint === fingerprint) return old;
  await writeFile(
    join(target, 'docs/toolchain-baseline.json'),
    JSON.stringify(baseline, null, 2) + '\n',
  );
  await writeFile(
    join(target, 'docs/toolchain-baseline.md'),
    `# Toolchain baseline\n\nGenerated from fixed manifests and verified release metadata at ${baseline.queriedAt}.\n\nNode ${version} (${node.lts}), published ${node.date}.\n\n| Package | Exact version | Published (UTC) | Source |\n|---|---|---|---|\n${Object.entries(
      packages,
    )
      .map(
        ([name, info]) =>
          `| ${name} | ${info.version} | ${info.publishedAt} | [registry](${info.source}) |`,
      )
      .join(
        '\n',
      )}\n\nActions checkout ${releases.actions.checkout.version} (${releases.actions.checkout.sha}), published ${releases.actions.checkout.publishedAt}. Renovate image ${releases.imageRelease.version}, published ${releases.imageRelease.publishedAt}; its tag/digest was checked against GHCR.\n\nVite/core/Vitest are derived as one supported bundle. The TypeScript 7 API warning in tsdown is recorded; declaration generation and isolated consumer are required acceptance checks. Install builds: esbuild@0.28.2 allowed after review; @google/genai@2.21.0 and protobufjs@7.6.6 explicitly denied.\n`,
  );
  return baseline;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(
    'PASS synchronized exact toolchain',
    (await syncToolchain(resolve(process.argv[2] ?? '.'))).queriedAt,
  );
