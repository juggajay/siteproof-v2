#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', 'apps', 'web');
let nextBin;
try {
  nextBin = require.resolve('next/dist/bin/next', { paths: [projectRoot] });
} catch (error) {
  console.error('Unable to locate the Next.js CLI from the apps/web workspace.');
  console.error('Have you run `pnpm install`?');
  process.exitCode = 1;
  throw error;
}

const result = spawnSync(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
});

process.exitCode = result.status ?? 0;
