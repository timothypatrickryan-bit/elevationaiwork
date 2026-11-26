#!/usr/bin/env node
// Rewrites the file lists and versions in sw.js so the game can run offline.
// Blip's recorded voice in audio/ gets a list and a version of its own, so that a
// change to the code does not make every device fetch the recordings again.
// Run it after adding, removing or changing any file the game loads:
//
//   node tools/update-offline-list.mjs
//
// With --check it changes nothing and exits 1 if sw.js is out of date.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INCLUDE = ['index.html', 'manifest.json', 'css', 'fonts', 'icons', 'js'];
const SKIP = /(^|\/)(README\.md|\.DS_Store)$/;

function walk(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path)
    .sort()
    .flatMap((name) => walk(join(path, name)));
}

const listed = (entries) =>
  entries
    .flatMap((entry) => walk(join(root, entry)))
    .map((f) => relative(root, f).split('\\').join('/'))
    .filter((f) => !SKIP.test(f));
const stamp = (prefix, names) => {
  const hash = createHash('sha256');
  for (const f of names) hash.update(f).update(readFileSync(join(root, f)));
  return prefix + hash.digest('hex').slice(0, 10);
};

const files = listed(INCLUDE);
const voice = listed(['audio']);
const version = stamp('quillfire-', files);
const voiceVersion = stamp('quillfire-voice-', voice);

const lines = (names) => names.map((f) => `  '${f}',`).join('\n');
const swPath = join(root, 'sw.js');
const before = readFileSync(swPath, 'utf8');
const after = before
  .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
  .replace(/const VOICE = '[^']*';/, `const VOICE = '${voiceVersion}';`)
  .replace(/\/\* ASSETS:START \*\/[\s\S]*?\/\* ASSETS:END \*\//, `/* ASSETS:START */\n${lines(['./', ...files])}\n  /* ASSETS:END */`)
  .replace(/\/\* VOICE:START \*\/[\s\S]*?\/\* VOICE:END \*\//, `/* VOICE:START */\n${lines(voice)}\n  /* VOICE:END */`);

if (process.argv.includes('--check')) {
  if (before !== after) {
    console.log('sw.js is out of date. Run: node tools/update-offline-list.mjs');
    process.exit(1);
  }
  console.log(`sw.js is up to date (${files.length} files, ${version}; ${voice.length} recordings files, ${voiceVersion}).`);
} else {
  writeFileSync(swPath, after);
  console.log(`sw.js lists ${files.length} files, version ${version}, and ${voice.length} voice files, version ${voiceVersion}.`);
}
