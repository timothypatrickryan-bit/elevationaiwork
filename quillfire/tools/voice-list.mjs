#!/usr/bin/env node
// Lists everything Blip says aloud, for tools/make-voice.py.
//
//   node tools/voice-list.mjs > /tmp/voice-list.json
//
// Each entry is { pack, kind, text }. A pack is one file of recordings: "ui"
// for the lines used everywhere, and one per sector. `kind` sets the pace:
// "line" for Blip's own lines, "read" for sentences and passages, which are
// read a little slower. With --count it only prints how many there are.

import { SKILLS, SECTORS, STORY } from '../js/content/index.js';
import { PASSAGES } from '../js/content/reading.js';
import { LINES } from '../js/content/voice-lines.js';

const out = [];
const seen = new Set();
const key = (text) => String(text).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
function add(pack, kind, text) {
  if (!text) return;
  const k = key(text);
  if (seen.has(k)) return;
  seen.add(k);
  out.push({ pack, kind, text: k });
}

for (const lines of Object.values(LINES)) lines.forEach((text) => add('ui', 'line', text));
[...STORY.intro, ...STORY.ending].forEach((text) => add('ui', 'line', text));

SECTORS.forEach((sector, s) => {
  const pack = 'sector-' + (s + 1);
  sector.intro.forEach((text) => add(pack, 'line', text));
  for (const id of sector.skills) {
    const skill = SKILLS[id];
    skill.teach.forEach((text) => add(pack, 'line', text));
    add(pack, 'line', skill.rule);
    add(pack, 'line', skill.tipSay || skill.tip);
    if (skill.reading) {
      for (const p of PASSAGES) {
        add(pack, 'line', p.title);
        add(pack, 'read', p.text);
      }
    }
    for (const item of skill.items) add(pack, 'read', item.say);
  }
});

if (process.argv.includes('--count')) {
  const by = {};
  for (const e of out) by[e.pack] = (by[e.pack] || 0) + 1;
  console.log(out.length, 'lines', JSON.stringify(by), '·', out.reduce((n, e) => n + e.text.split(' ').length, 0), 'words');
} else console.log(JSON.stringify(out, null, 1));
