/* global console, process */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const required = [
  'package.json',
  '.env.example',
  'README.md',
  'SECURITY.md',
  'apps/web/package.json',
  'apps/web/src/app/page.tsx',
  'apps/web/src/app/api/v1/events/route.ts',
  'apps/worker/src/index.ts',
  'packages/contracts/src/index.ts',
  'packages/core/src/index.ts',
  'scripts/create-indexes.ts',
  'scripts/create-topics.ts',
  'scripts/seed.ts',
  'docker-compose.yml',
  'deploy/docker/Dockerfile',
  'deploy/kubernetes/base/kustomization.yaml',
  '.github/workflows/ci.yml',
  'docs/ARCHITECTURE.md',
  'docs/CACHING_AND_RETENTION.md',
  'docs/IMPLEMENTATION_STATUS.md',
];
const errors = [];
for (const file of required) {
  try {
    if (!(await stat(path.join(root, file))).isFile()) errors.push(`${file} is not a file`);
  } catch {
    errors.push(`${file} is missing`);
  }
}
for (const file of [
  'package.json',
  'apps/web/package.json',
  'apps/worker/package.json',
  'packages/contracts/package.json',
  'packages/core/package.json',
  '.prettierrc.json',
]) {
  try {
    JSON.parse(await readFile(path.join(root, file), 'utf8'));
  } catch (error) {
    errors.push(`${file} is invalid JSON: ${String(error)}`);
  }
}
const forbidden = [
  /nvapi-[A-Za-z0-9_-]{20,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /mongodb(?:\+srv)?:\/\/[^\s:@]+:[^\s@]+@/g,
];
const ignored = new Set(['node_modules', '.git', '.next', 'dist', 'coverage', 'artifacts']);
let files = 0;
async function walk(directory) {
  for (const name of await readdir(directory)) {
    if (ignored.has(name)) continue;
    const full = path.join(directory, name);
    const item = await stat(full);
    if (item.isDirectory()) {
      await walk(full);
      continue;
    }
    files++;
    if (item.size > 2_000_000) continue;
    const value = await readFile(full, 'utf8').catch(() => null);
    if (value === null) continue;
    for (const pattern of forbidden) {
      pattern.lastIndex = 0;
      if (pattern.test(value))
        errors.push(`Potential secret found in ${path.relative(root, full)} matching ${pattern}`);
    }
  }
}
await walk(root);
const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.yaml',
  '.yml',
  '.css',
]);
let emptySourceFiles = 0;
async function countEmpty(directory) {
  for (const name of await readdir(directory)) {
    if (ignored.has(name)) continue;
    const full = path.join(directory, name);
    const item = await stat(full);
    if (item.isDirectory()) await countEmpty(full);
    else if (sourceExtensions.has(path.extname(name)) && item.size === 0) {
      emptySourceFiles++;
      errors.push(`${path.relative(root, full)} is empty`);
    }
  }
}
await countEmpty(root);
const result = {
  status: errors.length ? 'failed' : 'ok',
  files,
  emptySourceFiles,
  requiredFiles: required.length,
  errors,
};
await import('node:fs/promises').then(({ mkdir, writeFile }) =>
  mkdir(path.join(root, 'artifacts'), { recursive: true }).then(() =>
    writeFile(
      path.join(root, 'artifacts', 'repository-validation.json'),
      JSON.stringify(result, null, 2) + '\n',
    ),
  ),
);
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
