import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from '@babel/parser';
import { json, yaml, packages, sourceFiles, run } from './lib.mjs';

export function literal(node) {
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node.type)) return node.value;
  if (node.type === 'ArrayExpression') return node.elements.map(literal);
  if (node.type === 'ObjectExpression')
    return Object.fromEntries(
      node.properties.map((property) => {
        if (property.type !== 'ObjectProperty' || property.computed)
          throw new Error('Dynamic config properties are not permitted');
        return [property.key.name ?? property.key.value, literal(property.value)];
      }),
    );
  throw new Error('Configuration must use auditable static literals');
}
export function configObject(text) {
  const source = parse(text, { sourceType: 'module', plugins: ['typescript'] });
  const assignment = source.program.body.find((node) => node.type === 'ExportDefaultDeclaration');
  if (
    !assignment ||
    assignment.declaration.type !== 'CallExpression' ||
    assignment.declaration.callee.name !== 'defineConfig'
  )
    throw new Error('Static defineConfig export required');
  return literal(assignment.declaration.arguments[0]);
}
const exact = /^\d+\.\d+\.\d+$/;
export function dependencyVersion(value) {
  if (exact.test(value) || /^workspace:(\*|\^|~)$/.test(value)) return true;
  return /^npm:(?:@[^/]+\/)?[^@]+@\d+\.\d+\.\d+$/.test(value);
}
export async function verifyPolicy(base = process.cwd(), runtime = false) {
  const errors = [];
  const require = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const main = await json(join(base, 'package.json'));
  const workspace = await yaml(join(base, 'pnpm-workspace.yaml'));
  const policy = await json(join(base, 'maintenance/policy.json'));
  const nodeVersion = (await readFile(join(base, '.node-version'), 'utf8')).trim();
  const baseline = await json(join(base, 'docs/toolchain-baseline.json'));
  require(baseline.node.version === nodeVersion, 'Node release record drift');
  for (const [name, version] of Object.entries(main.devDependencies))
    require(baseline.packages[name]?.version === version, `Release record drift: ${name}`);
  require(baseline.packages.pnpm.version ===
    main.packageManager.split('@')[1], 'pnpm release record drift');
  require((await json(join(base, 'maintenance/images.json'))).renovate ===
    baseline.images.renovate, 'Image release record drift');
  for (const file of await sourceFiles(join(base, '.github/workflows'))) {
    for (const match of (await readFile(file, 'utf8')).matchAll(
      /uses:\s*actions\/checkout@([a-f0-9]{40})/g,
    ))
      require(match[1] === baseline.actions.checkout.sha, 'Action release record drift');
  }
  require(exact.test(nodeVersion), 'Node must be exact');
  require(/^pnpm@\d+\.\d+\.\d+$/.test(main.packageManager), 'pnpm must be exact');
  require(JSON.stringify(workspace.packages) ===
    JSON.stringify(['apps/*', 'packages/*']), 'Workspace globs changed');
  for (const [key, value] of Object.entries(policy.pnpm))
    require(workspace[key] === value, `pnpm policy ${key} changed`);
  require(JSON.stringify(workspace.allowBuilds ?? {}) ===
    JSON.stringify(policy.approvedBuilds), 'Build allowlist changed');
  for (const key of [
    'dangerouslyAllowAllBuilds',
    'trustPolicyExclude',
    'trustPolicyIgnoreAfter',
    'minimumReleaseAgeExclude',
    'onlyBuiltDependencies',
    'ignoredBuiltDependencies',
  ])
    require(!workspace[key], `Forbidden pnpm exception: ${key}`);
  const rootConfig = configObject(await readFile(join(base, 'vite.config.ts'), 'utf8'));
  require(rootConfig.lint?.options?.typeAware === true &&
    rootConfig.lint?.options?.typeCheck === true, 'typeAware/typeCheck required');
  const compiler = await json(join(base, 'tsconfig.base.json'));
  require(compiler.compilerOptions.strict === true &&
    !compiler.compilerOptions.paths, 'strict required; paths forbidden');
  const list = await packages(base);
  const map = new Map(list.map((pkg) => [pkg.manifest.name, pkg]));
  const core = list.find((pkg) => pkg.relative === 'packages/core');
  const web = list.find((pkg) => pkg.relative === 'apps/web');
  require(core &&
    web &&
    map.size === list.length, 'Required core/web packages missing or duplicate names');
  require(web?.manifest.dependencies?.[core?.manifest.name] ===
    'workspace:*', 'Web must depend on core through workspace:*');
  require(core?.manifest.exports?.['.']?.types === './dist/index.d.mts' &&
    core?.manifest.exports?.['.']?.import === './dist/index.mjs', 'Core exports must use dist');
  const bundled = await json(join(base, 'node_modules/vite-plus/package.json'));
  require(workspace.overrides?.vite === bundled.dependencies.vite &&
    workspace.overrides?.vitest ===
      bundled.dependencies.vitest, 'Vite+ bundle/alias/Vitest mismatch');
  for (const pkg of [{ directory: base, relative: '.', manifest: main }, ...list]) {
    require(pkg.manifest.private === true, `${pkg.relative} must be private`);
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, version] of Object.entries(pkg.manifest[section] ?? {})) {
        require(dependencyVersion(version), `${pkg.relative}: floating/exotic ${name}@${version}`);
        if (map.has(name))
          require(version.startsWith('workspace:'), `${name} must use workspace protocol`);
        if (pkg.relative.startsWith('packages/') && map.get(name)?.relative.startsWith('apps/'))
          require(false, 'Package cannot depend on app');
      }
    }
    if (pkg.relative === '.') continue;
    const local = await json(join(pkg.directory, 'tsconfig.json'));
    require(local.extends === '../../tsconfig.base.json', 'Packages must extend strict base');
    require(local.compilerOptions?.strict !== false &&
      !local.compilerOptions?.paths, 'Package weakens TypeScript');
    for (const file of await sourceFiles(join(pkg.directory, 'src'))) {
      if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
      const source = parse(await readFile(file, 'utf8'), {
        sourceType: 'module',
        plugins: ['typescript'],
      });
      function visit(node) {
        if (
          ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(
            node.type,
          ) &&
          node.source
        ) {
          const specifier = node.source.value;
          if (specifier.startsWith('.'))
            require(!relative(pkg.directory, join(file, '..', specifier)).startsWith(
              '..',
            ), `Cross-package relative import: ${file}`);
          else {
            const name = specifier.startsWith('@')
              ? specifier.split('/').slice(0, 2).join('/')
              : specifier.split('/')[0];
            require(name.startsWith('node:') ||
              [pkg.manifest.dependencies, pkg.manifest.devDependencies].some(
                (deps) => deps?.[name],
              ), `Undeclared dependency ${name} in ${file}`);
          }
        }
        if (
          (node.type === 'ImportExpression' ||
            (node.type === 'CallExpression' && node.callee.name === 'require')) &&
          (node.source ?? node.arguments?.[0])?.type === 'StringLiteral'
        ) {
          const specifier = (node.source ?? node.arguments[0]).value;
          if (specifier.startsWith('.'))
            require(!relative(pkg.directory, join(file, '..', specifier)).startsWith(
              '..',
            ), `Cross-package dynamic import: ${file}`);
          else {
            const name = specifier.startsWith('@')
              ? specifier.split('/').slice(0, 2).join('/')
              : specifier.split('/')[0];
            require(name.startsWith('node:') ||
              [pkg.manifest.dependencies, pkg.manifest.devDependencies].some(
                (deps) => deps?.[name],
              ), `Undeclared dynamic dependency ${name}`);
          }
        }
        for (const child of Object.values(node)) {
          if (Array.isArray(child)) {
            for (const item of child) if (item?.type) visit(item);
          } else if (child?.type) visit(child);
        }
      }
      visit(source);
    }
  }
  const active = new Set();
  const done = new Set();
  function graph(name) {
    if (active.has(name)) throw new Error('Workspace dependency cycle');
    if (done.has(name)) return;
    active.add(name);
    for (const dep of new Set(
      ['dependencies', 'devDependencies', 'optionalDependencies'].flatMap((section) =>
        Object.keys(map.get(name)?.manifest[section] ?? {}),
      ),
    ))
      if (map.has(dep)) graph(dep);
    active.delete(name);
    done.add(name);
  }
  for (const name of map.keys()) graph(name);
  const commands = Object.values(rootConfig.run.tasks)
    .map((task) => task.command)
    .join('\n');
  require(!commands.includes('passWithNoTests'), 'No empty-test bypass');
  require(commands.includes('--fail-if-no-match'), 'Required package filters must fail when empty');
  for (const task of [
    'policy',
    'audit',
    'consumer',
    'browser',
    'backlog',
    'starter',
    'verify-inner',
    'verify-all',
  ])
    require(rootConfig.run.tasks[task]?.cache === false, `Uncacheable task ${task}`);
  if (runtime) {
    require(process.version === `v${nodeVersion}`, `Node mismatch: ${process.version}`);
    const actual = run('pnpm', ['--version'], { encoding: 'utf8', stdio: 'pipe' }).stdout.trim();
    require(main.packageManager === `pnpm@${actual}`, `pnpm mismatch: ${actual}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { packages: [...map.keys()], node: nodeVersion, pnpm: main.packageManager };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log('PASS policy', await verifyPolicy(process.cwd(), true));
