// Turns the word lists in this folder into the skills, missions and bosses the
// game plays. Nothing here is specific to one screen: the battle engine, the
// map, the briefing and the grown-ups page all read from SKILLS and SECTORS.
//
// A skill's raw rows become "items". Every item has:
//   key     a name that never changes, so progress can be kept against it
//   lv      1 to 3, easiest first
//   kind    pick   one right answer among a few ships
//           bins   the same few ships every time (short / long, . ? !)
//           tap    the words of a sentence; tap the ones that fit
//           order  ships to zap in sequence
//   prompt  what the banner shows: ask (small), big (one large word) and
//           text (a sentence). In text, [words] and *word* glow, ___ is a gap.
//   why     what Blip says after a miss
//   say     the words to read aloud for the "listen" button, if any

import { NOUNS, VERBS, ADJECTIVES, SPOT, PRONOUNS } from './words.js';
import { RHYMES, SYLLABLES, VOWELS, SPELLING, HOMOPHONES, ABC, SOUND_ALIKE_MEANS } from './sounds.js';
import { SYNONYMS, ANTONYMS, CONTEXT, SHADES, MULTI } from './meanings.js';
import { COMPOUND, PREFIXES, SUFFIXES, PLURALS, PAST, CONTRACTIONS } from './parts.js';
import { COMPLETE, ENDMARKS, CAPITALS, AGREEMENT, PUNCTUATION, CONJUNCTIONS, ORDER } from './sentences.js';
import { PASSAGES, FACTS, OPINIONS, SAYINGS } from './reading.js';

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const bare = (w) => w.toLowerCase().replace(/[.,!?“”"]/g, '');
const an = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const list = (words) => (words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]);
const fill = (sentence, word) => sentence.replace('___', word);
const plain = (text) => text.replace(/[[\]*]/g, '');

const levels = (groups) => Object.keys(groups).flatMap((lv) => groups[lv].map((row) => [Number(lv), row]));
const spread = (rows) => rows.map((row, i) => [1 + Math.floor((i * 3) / rows.length), row]);

function pick(skill, lv, key, prompt, answer, wrong, why, say) {
  return { key: `${skill}:${key}`, skill, lv, kind: 'pick', prompt, why, say: say || null, options: [{ label: answer, ok: true }, ...wrong.map((label) => ({ label, ok: false }))] };
}
function bins(skill, lv, key, prompt, labels, right, why, say) {
  return { key: `${skill}:${key}`, skill, lv, kind: 'bins', prompt, why, say: say || null, options: labels.map((label, i) => ({ label, ok: i === right })) };
}
function tap(skill, lv, key, prompt, tokens, why, say) {
  return { key: `${skill}:${key}`, skill, lv, kind: 'tap', prompt, why, say: say || null, tokens };
}
function order(skill, lv, key, prompt, seq, why) {
  return { key: `${skill}:${key}`, skill, lv, kind: 'order', prompt, why, say: null, seq };
}

// ---------------------------------------------------------------- sector 1 --

const KIND = {
  noun: { one: 'NOUN', many: 'NOUNS', means: 'a naming word' },
  verb: { one: 'VERB', many: 'VERBS', means: 'an action word' },
  adjective: { one: 'ADJECTIVE', many: 'ADJECTIVES', means: 'a describing word' },
};
const WORDS = [];
for (const [sort, words] of Object.entries(NOUNS)) {
  for (const w of words) WORDS.push({ label: w, pos: 'noun', why: `${cap(an(w))} ${w} is ${sort === 'animal' ? 'an animal' : 'a ' + sort}. That makes it a noun.` });
}
for (const w of VERBS) WORDS.push({ label: w, pos: 'verb', why: `“${cap(w)}” is something you do. That makes it a verb.` });
for (const w of ADJECTIVES) WORDS.push({ label: w, pos: 'adjective', why: `“${cap(w)}” tells what something is like. That makes it an adjective.` });

const sortWords = (skill, pos) => WORDS.map((w) => ({ key: `${skill}:${w.label}`, label: w.label, ok: w.pos === pos, why: w.why }));

function spotItem(skill, row, pos) {
  const words = row.s.split(' ');
  const want = (pos === 'noun' ? row.n : pos === 'verb' ? row.v : row.a).split(' ');
  const tokens = words.map((label) => ({ label, ok: want.includes(bare(label)) }));
  let why;
  if (pos === 'noun') why = `The nouns are ${list(want)}. They name people, animals, places or things.`;
  else if (pos === 'verb') why = `“${cap(want[0])}” is the action. It is the verb.`;
  else why = `“${cap(want[0])}” describes the ${bare(words[words.findIndex((w) => bare(w) === want[0]) + 1])}. It is the adjective.`;
  const ask = pos === 'noun' ? 'Tap every NOUN' : `Tap the ${KIND[pos].one}`;
  return tap(skill, 1 + (row.s.length > 34 ? 1 : 0), `${pos}:${row.s}`, { ask }, tokens, why, row.s);
}

const pronounItems = levels(PRONOUNS).map(([lv, [s, a, ...wrong]]) => {
  const phrase = /\[(.+?)\]/.exec(s)[1];
  return pick('pronouns', lv, s, { ask: 'Which word can take the place of the glowing words?', text: s }, a, wrong, `“${cap(phrase)}” can be swapped for “${a}”.`, plain(s));
});

// ---------------------------------------------------------------- sector 2 --

const rhymeItems = levels(RHYMES).map(([lv, [q, a, ...wrong]]) => pick('rhymes', lv, q + '/' + a, { ask: 'Rhymes with', big: q }, a, wrong, `“${cap(q)}” and “${a}” sound the same from the vowel to the end.`));

const beatItems = Object.keys(SYLLABLES).flatMap((n) =>
  SYLLABLES[n].map((dotted) => {
    const word = dotted.replace(/·/g, '');
    const lv = n === '1' ? (word.length > 5 ? 2 : 1) : n === '2' ? 1 : word.length > 8 ? 3 : 2;
    return bins('syllables', lv, word, { ask: 'How many beats?', big: word }, ['1', '2', '3'], Number(n) - 1, `Clap it out: ${dotted.replace(/·/g, ' · ')}. That is ${n} ${n === '1' ? 'beat' : 'beats'}.`);
  })
);

const vowelItems = Object.keys(VOWELS).flatMap((lv) =>
  ['short', 'long'].flatMap((len, side) =>
    VOWELS[lv][len].map((word) =>
      bins('vowels', Number(lv), word, { ask: 'Short or long vowel sound?', big: word }, ['SHORT', 'LONG'], side, len === 'long' ? `The vowel in “${word}” is long. It says its own name.` : `The vowel in “${word}” is short. It does not say its name.`)
    )
  )
);

const spellItems = levels(SPELLING).map(([lv, [a, ...wrong]]) => pick('spelling', lv, a, { ask: 'Which one is spelled right?' }, a, wrong, `The right spelling is “${a}”.`));

const soundAlikeItems = levels(HOMOPHONES).map(([lv, [s, a, ...wrong]]) =>
  pick('homophones', lv, s, { ask: 'Which word fits?', text: s }, a, wrong, `“${a.toLowerCase()}” = ${SOUND_ALIKE_MEANS[a.toLowerCase()]}.`, fill(s, a))
);

const abcItems = levels(ABC).map(([lv, seq]) => order('abc', lv, seq.join('-'), { ask: 'Zap them in ABC order' }, seq, `In ABC order: ${seq.join(', ')}.`));

// ---------------------------------------------------------------- sector 3 --

const synonymItems = levels(SYNONYMS).map(([lv, [q, a, ...wrong]]) => pick('synonyms', lv, q, { ask: 'Means the same as', big: q }, a, wrong, `“${cap(q)}” and “${a}” mean almost the same thing.`));
const antonymItems = levels(ANTONYMS).map(([lv, [q, a, ...wrong]]) => pick('antonyms', lv, q, { ask: 'Opposite of', big: q }, a, wrong, `“${cap(a)}” is the opposite of “${q}”.`));
const contextItems = levels(CONTEXT).map(([lv, [s, a, ...wrong]]) => {
  const word = /\*(.+?)\*/.exec(s)[1];
  return pick('context', lv, word, { ask: 'What does the glowing word mean?', text: s }, a, wrong, `“${cap(word)}” means ${a}.`, plain(s));
});
const shadeItems = levels(SHADES).map(([lv, [q, a, ...wrong]]) => pick('shades', lv, q + '/' + a, { ask: 'Which word is the', big: q.toUpperCase() + '?' }, a, wrong, `“${cap(a)}” is the ${q}.`));
const multiItems = levels(MULTI).map(([lv, [one, two, a, ...wrong]]) =>
  pick('multi', lv, a, { ask: 'Which word can mean both?', text: `1. ${one}\n2. ${two}` }, a, wrong, `“${cap(a)}” can mean ${one}, or ${two}.`, `Which word can mean both: ${one}, and ${two}?`)
);

// ---------------------------------------------------------------- sector 4 --

const compoundItems = [
  ...COMPOUND.join.map(([first, a, ...wrong]) => pick('compound', 1, first + a, { ask: 'Finish the compound word', big: `${first} + ?` }, a, wrong, `${cap(first)} + ${a} makes “${first}${a}”.`)),
  ...COMPOUND.spot.map(([a, ...wrong]) => pick('compound', 2, 'spot:' + a, { ask: 'Which one is a compound word?' }, a, wrong, `“${cap(a)}” is two smaller words joined together.`)),
  ...COMPOUND.mean.map(([meaning, a, ...wrong]) => pick('compound', 3, 'mean:' + a, { ask: 'Which compound word means', text: meaning }, a, wrong, `“${cap(a)}” means ${meaning}.`)),
];

const PREFIX_MEANS = { un: 'not, or the opposite', re: 'again', pre: 'before', dis: 'not, or the opposite', mis: 'wrongly' };
const prefixOf = (word) => ['mis', 'dis', 'pre', 'un', 're'].find((p) => word.startsWith(p));
const prefixItems = [
  ...levels(PREFIXES.build).map(([lv, [meaning, a, ...wrong]]) => pick('prefixes', lv, a, { ask: 'Which word means', text: meaning }, a, wrong, `${cap(prefixOf(a))}- means ${PREFIX_MEANS[prefixOf(a)]}. So “${a}” means ${meaning}.`)),
  ...PREFIXES.part.map(([q, a, ...wrong]) => pick('prefixes', { 're-': 1, 'un-': 1, 'pre-': 2, 'dis-': 2, 'mis-': 3 }[q] || 2, 'part:' + q, { ask: 'This prefix means', big: q }, a, wrong, `The prefix ${q} means ${a}.`)),
  ...PREFIXES.read.map(([q, a, ...wrong]) => pick('prefixes', 3, 'read:' + q, { ask: 'What does this word mean?', big: q }, a, wrong, `${cap(prefixOf(q))}- means ${PREFIX_MEANS[prefixOf(q)]}. So “${q}” means ${a}.`)),
];

const suffixItems = [
  ...levels(SUFFIXES.build).map(([lv, [meaning, a, ...wrong]]) => pick('suffixes', lv, a, { ask: 'Which word means', text: meaning }, a, wrong, `“${cap(a)}” means ${meaning}.`)),
  ...SUFFIXES.compare.map(([s, a, ...wrong]) =>
    pick('suffixes', 2, s, { ask: 'Which word fits?', text: s }, a, wrong, a.endsWith('est') ? `-est is for the most of all: “${fill(s, a)}”` : `-er compares two things: “${fill(s, a)}”`, s.replace('___', 'blank'))
  ),
  ...SUFFIXES.part.map(([q, a, ...wrong]) => pick('suffixes', /^-(ful|less)/.test(q) ? 1 : /^-(er|ly)/.test(q) ? 2 : 3, 'part:' + q, { ask: 'This ending means', big: q }, a, wrong, `The ending ${q.split(' ')[0]} means ${a}.`)),
];

const pluralItems = levels(PLURALS).map(([lv, [q, a, ...wrong]]) => pick('plurals', lv, q, { ask: 'More than one', text: `One ${q}. Two ___.` }, a, wrong, `One ${q}, two ${a}.`));
const pastItems = levels(PAST).map(([lv, [q, a, ...wrong]]) => pick('past', lv, q, { ask: 'It already happened', text: `Today I ${q}. Yesterday I ___.` }, a, wrong, `Today I ${q}. Yesterday I ${a}.`));
const contractionItems = [
  ...levels(CONTRACTIONS.squeeze).map(([lv, [q, a, ...wrong]]) => pick('contractions', lv, q, { ask: 'Squeeze into one word', big: q }, a, wrong, `“${cap(q)}” squeezes into “${a}”. The apostrophe stands where letters were taken out.`)),
  ...CONTRACTIONS.stretch.map(([q, a, ...wrong]) => pick('contractions', 2, 'stretch:' + q, { ask: 'Stretch it back out', big: q }, a, wrong, `“${cap(q)}” is short for “${a}”.`)),
];

// ---------------------------------------------------------------- sector 5 --

const completeItems = spread(COMPLETE).map(([lv, [a, ...wrong]]) =>
  pick('complete', lv, a, { ask: 'Which one is a complete sentence?' }, a, wrong, `“${a}” tells who or what, and what they do or are. The others are only pieces.`)
);

const MARK = {
  '.': 'It tells something calmly, so it ends with a period.',
  '?': 'It asks something, so it ends with a question mark.',
  '!': 'It shows a strong feeling, so it ends with an exclamation point.',
};
const endmarkItems = ['.', '?', '!'].flatMap((mark, at) =>
  ENDMARKS[mark].map((s, i) => bins('endmarks', 1 + (i % 3), s, { ask: 'Which end mark fits?', text: s + ' ▢' }, ['.', '?', '!'], at, MARK[mark]))
);

const capitalItems = levels(CAPITALS).map(([lv, row]) => {
  const up = row.up.split(' ');
  const tokens = row.s.split(' ').map((label) => {
    const match = up.find((u) => bare(u) === bare(label));
    return match ? { label, ok: true, fix: cap(label) } : { label, ok: false };
  });
  return tap('capitals', lv, row.s, { ask: 'Tap every word that needs a capital letter' }, tokens, `Capitals go on ${list(up)}. The first word, names, days, months and the word “I” always get a capital.`);
});

const agreementItems = levels(AGREEMENT).map(([lv, [s, a, ...wrong]]) => pick('agreement', lv, s, { ask: 'Which word fits?', text: s }, a, wrong, `It sounds right this way: “${fill(s, a)}”`, s.replace('___', 'blank')));

const PUNCT_WHY = {
  1: 'Commas go between the things in a list. One also goes between a city and its state, and between a day and its year.',
  2: 'An apostrophe and an s show that something belongs to someone.',
  3: 'Quotation marks go around the exact words someone says.',
};
const punctuationItems = levels(PUNCTUATION).map(([lv, [a, ...wrong]]) =>
  pick('punctuation', lv, a, { ask: 'Which one is written correctly?' }, a, wrong, a.includes("pilots'") ? "When more than one pilot owns something, the apostrophe goes after the s: pilots'." : PUNCT_WHY[lv])
);

const JOIN_WHY = { and: 'adds one more thing', but: 'shows a change or a surprise', or: 'gives a choice or a warning', so: 'tells what happened because of it', because: 'tells the reason' };
const conjunctionItems = spread(CONJUNCTIONS).map(([lv, [s, a, ...wrong]]) =>
  pick('conjunctions', lv, s, { ask: 'Which joining word fits?', text: s }, a, wrong, `“${cap(a)}” ${JOIN_WHY[a]}: “${fill(s, a)}”`, s.replace('___', 'blank'))
);

const orderItems = levels(ORDER).map(([lv, seq]) => order('order', lv, seq.join(' '), { ask: 'Zap the words in order to build a sentence' }, seq, `The sentence is: “${seq.join(' ')}”`));

// ---------------------------------------------------------------- sector 6 --

const READ_LEVEL = { detail: 1, order: 1, main: 2, cause: 2, infer: 3 };
const readItems = (skill, kinds) =>
  PASSAGES.flatMap((p) =>
    p.qs
      .filter((q) => kinds.includes(q[0]))
      .map(([kind, question, a, w1, w2, why]) =>
        Object.assign(pick(skill, READ_LEVEL[kind], p.id + ':' + question, { ask: question, passage: { id: p.id, title: p.title, text: p.text } }, a, [w1, w2], why, question), { passage: p.id })
      )
  );

const factItems = [
  ...FACTS.map((s, i) => bins('facts', 1 + (i % 2), s, { ask: 'Fact or opinion?', text: s }, ['FACT', 'OPINION'], 0, 'That is a fact. You could check it and prove it is true.', s)),
  ...OPINIONS.map((s, i) => bins('facts', 1 + (i % 2), s, { ask: 'Fact or opinion?', text: s }, ['FACT', 'OPINION'], 1, 'That is an opinion. It tells what someone thinks or feels, and not everyone agrees.', s)),
];

const sayingItems = levels(SAYINGS).map(([lv, [s, a, ...wrong]]) => pick('sayings', lv, s, { ask: 'What does it really mean?', text: s }, a, wrong, `It really means: ${a}.`, s));

// ------------------------------------------------------------------ skills --
//
// tipSay  the tip as Blip says it, where the written tip names letters ("-ed")
// title   the mission's name on the map
// name    the plain name of the skill, for the grown-ups page
// rule    the short call Blip makes at the start of a wave
// tip     one sentence that sums the skill up; shown after a miss
// teach   what Blip says in the briefing, one short sentence per line
// show    examples for the briefing: [word or phrase, what it shows]
// plan    the waves of the mission: [kind of wave, how many]

const SORT_PLAN = [['sort', 8], ['pick', 3], ['tap', 2], ['sort', 10]];
const def = (id, sector, title, name, rule, tip, teach, show, items, plan, more = {}) => ({ id, sector, title, name, rule, tip, teach, show, items, plan, ...more });

export const SKILLS = {};
const add = (skill) => (SKILLS[skill.id] = skill);

add(def('nouns', 0, 'Noun Hunt', 'Nouns', 'Zap the nouns!', 'A noun names a person, an animal, a place or a thing.',
  ['A noun is a naming word.', 'It names a person, an animal, a place or a thing.', 'Pilot, tiger, zoo and rocket are all nouns.'],
  [['pilot', 'a person'], ['tiger', 'an animal'], ['zoo', 'a place'], ['rocket', 'a thing']],
  SPOT.map((row) => spotItem('nouns', row, 'noun')), SORT_PLAN, { pos: 'noun', words: sortWords('nouns', 'noun') }));

add(def('verbs', 0, 'Action Stations', 'Verbs', 'Zap the verbs!', 'A verb is an action word. It tells what someone does.',
  ['A verb is an action word.', 'It tells what someone or something does.', 'Eat, sing and build are all verbs.'],
  [['eat', 'something you do'], ['sing', 'something you do'], ['build', 'something you do']],
  SPOT.map((row) => spotItem('verbs', row, 'verb')), SORT_PLAN, { pos: 'verb', words: sortWords('verbs', 'verb') }));

add(def('adjectives', 0, 'Paint the Picture', 'Adjectives', 'Zap the adjectives!', 'An adjective is a describing word. It tells what something is like.',
  ['An adjective is a describing word.', 'It tells what something is like.', 'Tiny, shiny and brave are all adjectives.'],
  [['tiny', 'what size'], ['shiny', 'how it looks'], ['brave', 'what someone is like']],
  SPOT.map((row) => spotItem('adjectives', row, 'adjective')), SORT_PLAN, { pos: 'adjective', words: sortWords('adjectives', 'adjective') }));

add(def('spot', 0, 'Sentence Scan', 'Nouns, verbs and adjectives in a sentence', 'Scan the sentence!', 'Nouns name. Verbs do. Adjectives describe.',
  ['Now find the word kinds inside a sentence.', 'Nouns name. Verbs do. Adjectives describe.', 'Read the whole sentence first. Then tap.'],
  [['The brave pilot fixed the engine.', 'brave describes · pilot and engine name · fixed is the action']],
  SPOT.flatMap((row) => ['verb', 'adjective', 'noun'].map((pos) => spotItem('spot', row, pos))), [['tap', 9]]));

add(def('pronouns', 0, 'Stand-In Squad', 'Pronouns', 'Send in a stand-in!', 'A pronoun stands in for a noun: he, she, it, we, they. After the action, use him, her, it, us or them.',
  ['A pronoun is a short word that stands in for a noun.', 'He, she, it, we and they are pronouns.', 'Instead of the pilots, you can say they.'],
  [['the pilots → they', 'more than one'], ['Grandma → she', 'one woman'], ['the rocket → it', 'one thing']],
  pronounItems, [['pick', 10]]));

add(def('rhymes', 1, 'Rhyme Radar', 'Rhyming words', 'Find the rhyme!', 'Rhyming words sound the same from the vowel to the end, even when the spelling is different.',
  ['Rhyming words sound the same from the vowel to the end.', 'Cat rhymes with hat. They both end in at.', 'Careful! Blue rhymes with shoe, even though the letters are different.'],
  [['cat · hat', 'same sound, same letters'], ['blue · shoe', 'same sound, different letters']],
  rhymeItems, [['pick', 10]]));

add(def('syllables', 1, 'Beat Counter', 'Syllables', 'Count the beats!', 'Every beat in a word has one vowel sound. Clap the word to count.',
  ['Words have beats, called syllables.', 'Clap as you say the word. Rock, et. Two claps!', 'Zap the ship with the right number of beats.'],
  [['ship', '1 beat'], ['rock · et', '2 beats'], ['as · tro · naut', '3 beats']],
  beatItems, [['bins', 12]]));

add(def('vowels', 1, 'Vowel Patrol', 'Short and long vowels', 'Short or long?', 'A long vowel says its own name, like the A in cake. A short vowel does not, like the A in cat.',
  ['Vowels can be short or long.', 'A long vowel says its own name, like the A in cake.', 'A short vowel does not, like the A in cat.'],
  [['cat', 'short a'], ['cake', 'long a'], ['kit · kite', 'short i, long i']],
  vowelItems, [['bins', 12]]));

add(def('spelling', 1, 'Spell Shield', 'Spelling tricky words', 'Find the right spelling!', 'Some words are not spelled the way they sound. Picture the word.',
  ['The Garble copies words and spells them wrong.', 'Only one ship has the true spelling.', 'Picture the word in your mind. Then zap the real one.'],
  [['friend', 'not “frend”'], ['because', 'not “becuz”']],
  spellItems, [['pick', 10]]));

add(def('homophones', 1, 'Sound-Alike Ambush', 'Sound-alike words (homophones)', 'Which sound-alike?', 'Sound-alikes sound the same but have different spellings and meanings.',
  ['Some words sound the same but mean different things.', 'Two is a number. Too means also. To means toward.', 'Read the sentence, then pick the one that makes sense.'],
  [['two', 'the number 2'], ['too', 'also'], ['to', 'toward a place']],
  soundAlikeItems, [['pick', 10]]));

add(def('abc', 1, 'ABC Asteroids', 'ABC order', 'Zap in ABC order!', 'Look at the first letters. If they match, look at the next letters.',
  ['Put the words in ABC order.', 'Look at the first letter of each word.', 'If the first letters match, look at the second letters.'],
  [['ant · bee · cat', 'a, b, c'], ['bat · bird · bus', 'ba, bi, bu']],
  abcItems, [['order', 7]]));

add(def('synonyms', 2, 'Twin Stars', 'Synonyms', 'Find the twin!', 'Synonyms are words that mean the same, or almost the same.',
  ['Synonyms are words with the same meaning.', 'Big and large are synonyms.', 'Watch out. The Garble hides an opposite in every wave.'],
  [['big · large', 'same meaning'], ['happy · glad', 'same meaning']],
  synonymItems, [['pick', 10]]));

add(def('antonyms', 2, 'Opposite Orbit', 'Antonyms', 'Find the opposite!', 'Antonyms are opposites, like hot and cold.',
  ['Antonyms are opposites.', 'Hot and cold are antonyms. So are up and down.', 'This time, do not zap the twin. Zap the opposite!'],
  [['hot · cold', 'opposites'], ['empty · full', 'opposites']],
  antonymItems, [['pick', 10]]));

add(def('context', 2, 'Clue Catcher', 'Context clues', 'Catch the clue!', 'When you meet a new word, the words around it are clues to what it means.',
  ['Sometimes you meet a word you do not know.', 'Do not panic. The other words in the sentence are clues.', 'Read the whole sentence. Then choose what the glowing word means.'],
  [['I was so famished that I ate three sandwiches.', 'famished = very hungry']],
  contextItems, [['pick', 9]]));

add(def('shades', 2, 'Power Words', 'Shades of meaning', 'Rank the words!', 'Some words mean almost the same, but one is stronger: warm, hot, scorching.',
  ['Some words are stronger than others.', 'Warm is a little. Hot is more. Scorching is the most.', 'Check the banner. It tells you which end of the ladder to find.'],
  [['warm → hot → scorching', 'stronger and stronger'], ['sip → drink → gulp', 'bigger and bigger']],
  shadeItems, [['pick', 10]]));

add(def('multi', 2, 'Double Agents', 'Words with two meanings', 'Unmask the double agent!', 'One word can have two different meanings, like bat.',
  ['Some words are double agents. They have two meanings.', 'A bat is a flying animal. A bat is also a stick for hitting a ball.', 'Read both clues. One word fits them both.'],
  [['bat', 'an animal · a stick for baseball'], ['bark', 'a dog sound · tree skin']],
  multiItems, [['pick', 9]]));

add(def('compound', 3, 'Fusion Lab', 'Compound words', 'Fuse the words!', 'A compound word is two smaller words joined into one.',
  ['Two small words can join to make a new word.', 'Rain plus bow makes rainbow.', 'Find the piece that makes a real word.'],
  [['rain + bow', 'rainbow'], ['star + fish', 'starfish']],
  compoundItems, [['pick', 10]]));

add(def('prefixes', 3, 'Prefix Power', 'Prefixes', 'Power up with a prefix!', 'A prefix goes on the front of a word and changes its meaning: un- means not, re- means again.',
  ['A prefix is a word part that goes on the front.', 'Un means not. Unhappy means not happy.', 'Re means again. Replay means play again.'],
  [['un + happy', 'not happy'], ['re + play', 'play again'], ['pre + heat', 'heat before']],
  prefixItems, [['pick', 10]], { tipSay: 'A prefix goes on the front of a word and changes its meaning. Un means not. Re means again.' }));

add(def('suffixes', 3, 'Tail Thrusters', 'Suffixes', 'Check the ending!', 'A suffix goes on the end of a word: -ful means full of, -less means without.',
  ['A suffix is a word part that goes on the end.', 'Ful means full of. Hopeful means full of hope.', 'Less means without. Fearless means without fear.'],
  [['hope + ful', 'full of hope'], ['fear + less', 'without fear'], ['teach + er', 'a person who teaches']],
  suffixItems, [['pick', 10]], { tipSay: 'A suffix goes on the end of a word. Ful means full of. Less means without.' }));

add(def('plurals', 3, 'More Than One', 'Plural nouns', 'Make it more than one!', 'Most words add s. Words ending in s, x, ch or sh add es. A consonant and y changes to ies, and some f words change to ves. A few words change completely.',
  ['Plural means more than one.', 'Most words just add an S, like one star, two stars.', 'Some add E S, like one fox, two foxes. And some change completely, like one mouse, two mice.'],
  [['star → stars', 'add s'], ['fox → foxes', 'add es'], ['mouse → mice', 'a whole new word']],
  pluralItems, [['pick', 10]], { tipSay: 'Most words just add an S. Words that end in S, X, C H or S H add E S. A consonant and Y changes to I E S. Some F words change to V E S. A few words change completely.' }));

add(def('past', 3, 'Time Warp', 'Past tense verbs', 'Jump to yesterday!', 'Most verbs add -ed for the past. Some double a letter or change y to i first. Some change completely, like run and ran.',
  ['Verbs change when something already happened.', 'Most add E D, like jump and jumped.', 'Some are rebels. Today I run. Yesterday I ran.'],
  [['jump → jumped', 'add ed'], ['run → ran', 'a rebel verb']],
  pastItems, [['pick', 10]], { tipSay: 'Most verbs add E D for the past. Some double a letter or change Y to I first. Some change completely, like run and ran.' }));

add(def('contractions', 3, 'Squeeze Play', 'Contractions', 'Squeeze the words!', 'A contraction squeezes two words into one. An apostrophe takes the place of the missing letters.',
  ['A contraction squeezes two words into one.', 'Do not becomes don’t.', 'The apostrophe stands where letters were taken out.'],
  [['do not → don’t', 'the o is squeezed out'], ['I am → I’m', 'the a is squeezed out']],
  contractionItems, [['pick', 10]]));

add(def('complete', 4, 'Whole Thoughts', 'Complete sentences', 'Find the whole sentence!', 'A complete sentence tells who or what, and what they do or are.',
  ['A complete sentence is a whole thought.', 'It tells who or what. And it tells what they do.', 'The rocket landed. That is complete. The shiny rocket. That is only a piece.'],
  [['The rocket landed.', 'who + what it did'], ['The shiny rocket.', 'only a piece']],
  completeItems, [['pick', 8]]));

add(def('endmarks', 4, 'The Last Mark', 'End marks', 'Pick the end mark!', 'A telling sentence ends with a period, an asking sentence with a question mark, and a shout with an exclamation point.',
  ['Every sentence needs an end mark.', 'Telling sentences get a period. Asking sentences get a question mark.', 'Shouts and strong feelings get an exclamation point!'],
  [['The moon is bright.', 'telling'], ['Where is my helmet?', 'asking'], ['Watch out!', 'a shout']],
  endmarkItems, [['bins', 12]]));

add(def('capitals', 4, 'Capital Command', 'Capital letters', 'Give them capitals!', 'The first word, names of people and places, days, months and the word “I” all start with a capital.',
  ['Some words need a capital letter.', 'The first word of a sentence. Names of people and places. Days and months. And the word “I”.', 'Tap every word that needs one.'],
  [['We', 'the first word'], ['Mars', 'the name of a place'], ['Monday', 'a day'], ['I', 'always a capital']],
  capitalItems, [['tap', 7]]));

add(def('agreement', 4, 'Match Makers', 'Subject and verb agreement', 'Make them match!', 'The verb has to match who is doing it: one pilot is, two pilots are.',
  ['The verb has to match who is doing it.', 'One pilot is ready. Two pilots are ready.', 'Say the sentence in your head. Pick the one that sounds right.'],
  [['The pilot is ready.', 'one'], ['The pilots are ready.', 'more than one']],
  agreementItems, [['pick', 10]]));

add(def('punctuation', 4, 'Mark It Right', 'Commas, apostrophes and quotation marks', 'Find the one marked right!', 'Commas split up a list. An apostrophe shows who owns something. Quotation marks hold the words someone says.',
  ['Little marks do big jobs.', 'Commas split up a list. An apostrophe shows who owns something.', 'Quotation marks go around the words someone says.'],
  [['stars, moons, and comets', 'commas in a list'], ['the pilot’s helmet', 'it belongs to the pilot'], ['“Hold on!”', 'someone is talking']],
  punctuationItems, [['pick', 8]]));

add(def('conjunctions', 4, 'Link Up', 'Joining words (conjunctions)', 'Link the ideas!', 'And adds. But shows a change. Or gives a choice. So tells what happened next. Because tells why.',
  ['Joining words link two ideas.', 'And adds more. But shows a surprise. Or gives a choice.', 'So tells what happened next. Because tells why.'],
  [['I was tired, so I went to bed.', 'so = what happened next'], ['I stayed in because it rained.', 'because = why']],
  conjunctionItems, [['pick', 10]]));

add(def('order', 4, 'Line Up!', 'Word order in sentences', 'Build the sentence!', 'A sentence starts with a capital letter and stops at the end mark.',
  ['The Garble shuffled the words.', 'Zap them in order to build the sentence.', 'Clue: start with the capital letter. Finish with the end mark.'],
  [['The ship flew fast.', 'capital first, end mark last']],
  orderItems, [['order', 7]]));

add(def('log', 5, "Captain's Log", 'Main idea and details', 'Read the log!', 'The main idea is what the whole passage is mostly about. Details are the small facts inside it.',
  ['Time to read a message from the fleet.', 'Read it all the way through. No rush.', 'Then answer the question. You can look back any time.'],
  [['main idea', 'what it is mostly about'], ['detail', 'a small fact from the passage']],
  readItems('log', ['main', 'detail']), [['pick', 6]], { reading: true }));

add(def('sequence', 5, 'First, Next, Last', 'Order of events', 'Track the order!', 'Words like first, next, then and last tell you the order things happen.',
  ['Stories happen in order.', 'Look for clue words. First. Next. Then. Last.', 'Read carefully, then tell what happened when.'],
  [['first · next · then · last', 'order words']],
  readItems('sequence', ['order']), [['pick', 6]], { reading: true }));

add(def('cause', 5, 'Because!', 'Cause and effect', 'Find out why!', 'A cause is why something happens. An effect is what happens.',
  ['Things happen for a reason.', 'The reason is the cause. What happens is the effect.', 'Ask yourself: why did that happen?'],
  [['It rained, so we got wet.', 'cause: rain · effect: wet']],
  readItems('cause', ['cause']), [['pick', 6]], { reading: true }));

add(def('infer', 5, 'Between the Stars', 'Making inferences', 'Be a detective!', 'An inference is a smart guess. Use clues from the passage and what you already know.',
  ['Some answers are not written in the passage.', 'Be a detective. Put the clues together.', 'Clues plus what you already know make a smart guess.'],
  [['He smiled and spun in circles.', 'clue: he is happy']],
  readItems('infer', ['infer']), [['pick', 6]], { reading: true }));

add(def('facts', 5, 'Fact Check', 'Fact and opinion', 'Fact or opinion?', 'A fact can be proven true. An opinion is what someone thinks or feels.',
  ['A fact is something you can check and prove.', 'An opinion is what someone thinks or feels.', 'Words like best, worst, fun and boring are opinion clues.'],
  [['Mars is a planet.', 'fact'], ['Mars is the most exciting planet.', 'opinion']],
  factItems, [['bins', 12]]));

add(def('sayings', 5, 'Star Sayings', 'Sayings and similes', 'Crack the saying!', 'Some sayings do not mean exactly what the words say.',
  ['Some sayings do not mean what the words say.', 'Raining cats and dogs just means raining very hard.', 'Think about what the speaker really means.'],
  [['as quiet as a mouse', 'very quiet'], ['a piece of cake', 'very easy']],
  sayingItems, [['pick', 10]]));

// ----------------------------------------------------------------- sectors --

export const SECTORS = [
  { id: 'nebula', name: 'Noun Nebula', about: 'Kinds of words', hue: 192, skills: ['nouns', 'verbs', 'adjectives', 'spot', 'pronouns'],
    intro: ['The Garble mixed up the naming words, the action words and the describing words.', 'Let’s sort them out, Cadet!'],
    boss: { id: 'jumble', name: 'General Jumble', says: 'I mixed up every kind of word! You cannot sort them!', lost: 'My jumble… all neat and tidy… nooo!', hp: 7 } },
  { id: 'belt', name: 'Echo Belt', about: 'Sounds and spelling', hue: 38, skills: ['rhymes', 'syllables', 'vowels', 'spelling', 'homophones', 'abc'],
    intro: ['Listen. The Echo Belt is full of sounds, and the Garble is copying them all wrong.', 'Use your ears and your eyes.'],
    boss: { id: 'mumbler', name: 'The Mumbler', says: 'Mmf mmf mmf! Nobody understands a mumble!', lost: 'I can hear every word… so clear… it hurts!', hp: 7 } },
  { id: 'stars', name: 'Synonym Stars', about: 'What words mean', hue: 286, skills: ['synonyms', 'antonyms', 'context', 'shades', 'multi'],
    intro: ['These stars shine with meaning. The Garble wants to switch every word with its opposite.', 'Know what the words mean, and you win.'],
    boss: { id: 'confusion', name: 'Count Confusion', says: 'Up is down! Hot is cold! Are you confused yet?', lost: 'It all makes sense now. How dreadful!', hp: 8 } },
  { id: 'forge', name: 'Word Forge', about: 'How words are built', hue: 146, skills: ['compound', 'prefixes', 'suffixes', 'plurals', 'past', 'contractions'],
    intro: ['Words are built from parts here. The Garble has been snapping them to pieces.', 'Let’s put them back together.'],
    boss: { id: 'typo', name: 'Queen Typo', says: 'I love a good mistake. Foots! Runned! Dont!', lost: 'Not one mistake left? You are no fun at all.', hp: 8 } },
  { id: 'station', name: 'Sentence Station', about: 'Sentences and marks', hue: 16, skills: ['complete', 'endmarks', 'capitals', 'agreement', 'punctuation', 'conjunctions', 'order'],
    intro: ['Sentence Station sends every message in the galaxy. The Garble pulled out all the marks and capitals.', 'Time to fix the mail.'],
    boss: { id: 'runon', name: 'Baron Run-On', says: 'I never stop talking and I never use a period and you cannot make me and', lost: 'A period. You put a period on me. The end.', hp: 9 } },
  { id: 'galaxy', name: 'Story Galaxy', about: 'Reading for meaning', hue: 252, skills: ['log', 'sequence', 'cause', 'infer', 'facts', 'sayings'],
    intro: ['This is it. The heart of the Garble fleet hides in the Story Galaxy.', 'Read carefully. Every story holds the clues you need.'],
    boss: { id: 'garble', name: 'Lord Garble', says: 'I am Lord Garble! No one will ever read a single word again!', lost: 'Every word… clear as starlight. The Garble is finished!', hp: 10 } },
];

// Every mission on the map, in order: each skill, then the sector's boss.
export const MISSIONS = [];
SECTORS.forEach((sector, s) => {
  sector.skills.forEach((id, i) => MISSIONS.push({ id, sector: s, slot: i, skill: id, title: SKILLS[id].title }));
  MISSIONS.push({ id: 'boss-' + sector.boss.id, sector: s, slot: sector.skills.length, boss: sector.boss, title: sector.boss.name, skills: sector.skills });
});
export const missionById = (id) => MISSIONS.find((m) => m.id === id);

// ------------------------------------------------------------------- story --

export const STORY = {
  intro: [
    'Cadet! Thank the stars you are here.',
    'The Garble fleet is scrambling every word in the galaxy.',
    'Signs make no sense. Books are blank. Even my jokes are broken!',
    'Only a pilot who knows words can stop them. That is you.',
    'Climb into the Quillfire. I am Blip, and I will be your co-pilot.',
  ],
  ending: [
    'You did it! Lord Garble is gone, and every word is back where it belongs.',
    'Signs make sense. Books are full. And my jokes are funny again!',
    'Thank you, Commander. The galaxy can read because of you.',
  ],
};

export const RANKS = [
  [0, 'Cadet'],
  [150, 'Wing Scout'],
  [400, 'Pilot'],
  [900, 'Ace Pilot'],
  [1600, 'Captain'],
  [2600, 'Commander'],
  [4000, 'Star Admiral'],
  [6000, 'Galaxy Legend'],
];

// Flight school, the first-day training flight. It teaches the controls with
// words any beginner can read.
export const TRAINING = [
  pick('training', 1, 'rocket', { ask: 'Tap the ship that says', big: 'rocket' }, 'rocket', ['banana', 'sock'], 'Tap the ship with the word you need.'),
  pick('training', 1, 'star', { ask: 'Tap the ship that says', big: 'star' }, 'star', ['stop', 'spot', 'sat'], 'Read each word, then tap the one you need.'),
  pick('training', 1, 'moon', { ask: 'Tap the ship that says', big: 'moon' }, 'moon', ['noon', 'mop'], 'Look closely. Some words look alike.'),
];
export const TRAINING_ANIMALS = {
  yes: ['cat', 'dog', 'fish', 'frog', 'pig', 'hen'],
  no: ['sock', 'hat', 'cup', 'bed', 'map', 'jam'],
};
