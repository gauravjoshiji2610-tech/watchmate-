#!/usr/bin/env node
// scripts/clean.mjs
// Monorepo-level clean script. Removes all build artifacts and caches.
// Usage: node scripts/clean.mjs

import { rmSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

const targets = [
  'node_modules/.cache',
  'apps/client/dist',
  'apps/client/node_modules/.cache',
  'apps/server/dist',
  'apps/server/node_modules/.cache',
  'packages/shared-types/dist',
  'packages/shared-schemas/dist',
  'packages/shared-utils/dist',
];

for (const target of targets) {
  const fullPath = join(ROOT, target);
  if (existsSync(fullPath)) {
    rmSync(fullPath, { recursive: true, force: true });
    console.log(`Cleaned: ${target}`);
  }
}

console.log('Clean complete.');
