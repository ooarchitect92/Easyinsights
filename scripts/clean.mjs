import { rm } from 'node:fs/promises';
const paths = [
  'apps/web/.next',
  'apps/worker/dist',
  'packages/contracts/dist',
  'packages/core/dist',
  'coverage',
  'artifacts/quality',
];
await Promise.all(paths.map((path) => rm(path, { recursive: true, force: true })));
