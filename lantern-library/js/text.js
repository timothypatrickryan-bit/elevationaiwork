// Text helpers shared by the game and by tools/validate-content.mjs.
// Nothing in this file touches the DOM, so Node can import it too.
//
// A passage is a list of blocks. A block is either a plain string (a normal
// paragraph) or an object { as, text, sub }:
//   as: 'p'        normal paragraph (same as a plain string)
//   as: 'note'     a letter, diary or logbook entry shown as a text-within-the-text
//   as: 'verse'    lines of a poem or riddle, separated by \n
//   as: 'heading'  a subheading (sub = optional smaller line under it)
// Inside any block, *asterisks* mark italics.
//
// Each block is cut into "units": sentences for prose, lines for verse. Units
// are what the reader taps in "find the evidence" questions, what lights up
// when an answer is explained, and what the read-aloud voice speaks one at a
// time.

const SPEECH_VERBS =
  'said|asked|whispered|shouted|called|cried|replied|answered|muttered|yelled|gasped|laughed|added|' +
  'began|continued|exclaimed|groaned|sighed|snapped|demanded|wondered|breathed|murmured|warned|' +
  'announced|agreed|admitted|insisted|repeated|hissed|squeaked|teased|joked|pleaded|begged|grumbled|' +
  'declared|shrieked|sang|roared|growled|chuckled|giggled|stammered|suggested|promised|protested|' +
  'explained|guessed|read|wailed|croaked|boomed|squealed|corrected|reminded|offered|urged';

// “Stop!” Nadia cried.  ->  the words after the closing quote are a dialogue
// tag, not a new sentence.
const TAG_AFTER_QUOTE = new RegExp("^[A-Z][A-Za-z’']*(?:\\s[A-Z][A-Za-z’']*)?\\s(?:" + SPEECH_VERBS + ')\\b');

// A full stop after one of these is not the end of a sentence.
const ABBREVIATION = /(?:\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Mt|vs|etc)|\b[A-Z])\.$/;

const SENTENCE_BREAK = /([.!?…]+)(["”’)\]*]*)\s+(?=["“‘(\[*]*[A-Z0-9])/g;

export function blockOf(block) {
  if (typeof block === 'string') return { as: block.includes('\n') ? 'verse' : 'p', text: block };
  return { as: block.as || (block.text.includes('\n') ? 'verse' : 'p'), text: block.text, sub: block.sub || '' };
}

export function splitSentences(text) {
  const out = [];
  let start = 0;
  let m;
  SENTENCE_BREAK.lastIndex = 0;
  while ((m = SENTENCE_BREAK.exec(text))) {
    const end = m.index + m[0].length;
    const upToStop = text.slice(start, m.index + m[1].length);
    if (m[1] === '.' && ABBREVIATION.test(upToStop)) continue;
    const closesQuote = /["”]/.test(m[2]);
    if (closesQuote && m[1] !== '.' && TAG_AFTER_QUOTE.test(text.slice(end))) continue;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

// Units of one block: [] for headings, lines for verse, sentences otherwise.
export function unitsOf(block) {
  const b = blockOf(block);
  if (b.as === 'heading') return [];
  if (b.as === 'verse') return b.text.split('\n').map((s) => s.trim()).filter(Boolean);
  return splitSentences(b.text);
}

// Every unit in a passage, in reading order, with a stable id "block.unit".
export function passageUnits(blocks) {
  const all = [];
  blocks.forEach((block, bi) => {
    unitsOf(block).forEach((text, ui) => all.push({ id: bi + '.' + ui, block: bi, index: ui, text }));
  });
  return all;
}

export function plain(text) {
  return String(text).replace(/\*/g, '');
}

// Loose matching form: no italics markers, straight quotes, single spaces.
export function normalize(text) {
  return plain(text)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Ids of the units that contain the snippet (a snippet is a short exact quote
// copied from the passage).
export function unitsMatching(units, snippet) {
  const needle = normalize(snippet);
  return units.filter((u) => normalize(u.text).includes(needle)).map((u) => u.id);
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escapes, then turns *italics* into <em>.
export function inlineHtml(text) {
  return escapeHtml(text).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function wordCount(blocks) {
  return blocks
    .map((b) => plain(blockOf(b).text))
    .join(' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}
