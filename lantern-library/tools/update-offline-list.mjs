#!/usr/bin/env node
// Rewrites the file list and version in sw.js so the game can run offline.
// Run it after adding, removing or changing any file the game loads:
//
//   node tools/update-offline-list.mjs
//
// With --check it changes nothing and exits 1 if sw.js is out of date.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INCLUDE = ['index.html', 'manifest.json', 'css', 'fonts', 'icons', 'js'];
const SKIP = /(^|\/)(README\.md|\.DS_Store)$/;

function walk(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path)
    .sort()
    .flatMap((name) => walk(join(path, name)));
}

const files = INCLUDE.flatMap((entry) => walk(join(root, entry)))
  .map((f) => relative(root, f).split('\\').join('/'))
  .filter((f) => !SKIP.test(f));

const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(join(root, f)));
const version = 'lantern-library-' + hash.digest('hex').slice(0, 10);

const list = ['./', ...files].map((f) => `  '${f}',`).join('\n');
const swPath = join(root, 'sw.js');
const before = readFileSync(swPath, 'utf8');
const after = before
  .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
  .replace(/\/\* ASSETS:START \*\/[\s\S]*?\/\* ASSETS:END \*\//, `/* ASSETS:START */\n${list}\n  /* ASSETS:END */`);

if (process.argv.includes('--check')) {
  if (before !== after) {
    console.log('sw.js is out of date. Run: node tools/update-offline-list.mjs');
    process.exit(1);
  }
  console.log(`sw.js is up to date (${files.length} files, ${version}).`);
} else {
  writeFileSync(swPath, after);
  console.log(`sw.js lists ${files.length} files, version ${version}.`);
}
