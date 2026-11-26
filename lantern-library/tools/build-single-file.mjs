#!/usr/bin/env node
// Packs the whole game (code, stories, styles, fonts) into one HTML file that
// needs nothing else beside it. Handy for sharing the game as a single file or
// pasting it into a host that takes one page.
//
//   node tools/build-single-file.mjs                  writes dist/lantern-library.html
//   node tools/build-single-file.mjs out.html
//   node tools/build-single-file.mjs out.html --fragment
//
// --fragment leaves out <html>, <head> and <body>, for hosts that wrap the
// page in their own. The single file has no offline cache and no Home Screen
// icon; for the iPad, serve the folder itself (see README.md).
//
// The JavaScript is bundled with esbuild, fetched on first use with npx. Set
// ESBUILD=/path/to/esbuild to use a copy you already have.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fragment = args.includes('--fragment');
const outPath = resolve(process.cwd(), args.find((a) => !a.startsWith('--')) || join(root, 'dist/lantern-library.html'));

const esbuildArgs = [join(root, 'js/main.js'), '--bundle', '--format=iife', '--target=safari15', '--log-level=warning'];
const script = process.env.ESBUILD
  ? execFileSync(process.env.ESBUILD, esbuildArgs, { maxBuffer: 64 * 1024 * 1024 }).toString()
  : execFileSync('npx', ['--yes', 'esbuild@0.25.12', ...esbuildArgs], { maxBuffer: 64 * 1024 * 1024 }).toString();

const fonts = readFileSync(join(root, 'css/fonts.css'), 'utf8').replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (_, file) => {
  const data = readFileSync(join(root, 'fonts', file)).toString('base64');
  return `url("data:font/woff2;base64,${data}")`;
});
const styles = readFileSync(join(root, 'css/app.css'), 'utf8');

const index = readFileSync(join(root, 'index.html'), 'utf8');
const title = /<title>([^<]*)<\/title>/.exec(index)[1];
const app = /<div id="app"[\s\S]*?\n<\/div>/.exec(index)[0];

const body = `${app}
<script>
${script.replace(/<\/script/gi, '<\\/script')}
</script>`;
const style = `<style>
${fonts}
${styles}
</style>`;

const page = fragment
  ? `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${style}
${body}
`
  : `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${title}">
<meta name="theme-color" content="#090b22">
<style>
  :root { padding: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px); }
  body { margin: 0; }
  img { max-width: 100%; }
  [hidden] { display: none !important; }
</style>
${style}
</head>
<body>
${body}
</body>
</html>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, page);
console.log(`${outPath}  ${(page.length / 1024).toFixed(0)} KB${fragment ? ' (fragment)' : ''}`);
