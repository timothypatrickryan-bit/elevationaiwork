# Writing word shelves for the Spellery

The game has seven shelves. Each shelf is one file in `js/content/` that exports
five units, and each unit teaches one spelling pattern with exactly ten words.
`js/content/shelf-1.js` is the model to copy. Check your work with:

```bash
node tools/validate-content.mjs js/content/shelf-2.js --list
```

Add `--dict words.txt` (a text file with one correctly spelled word per line)
to spell-check every word, misspelling and sentence.

## The speller

A fifth grader who finds spelling hard. Every unit should leave her with one
idea she can use on words she has never seen: a pattern, a rule, or an honest
"this one just has to be learned". American spelling throughout.

Choose words she actually writes. A word belongs in a unit when the pattern is
the hard part of it. Words must be unique across the whole game.

## Shelf

```js
export default {
  id: 'snap',                       // short, lowercase, never changes
  name: 'Snap Spells',              // shown above the shelf
  about: 'Endings that follow a short vowel',
  hue: 'coral',                     // coral | amber | lime | teal | sky | violet | pink
  units: [ /* five units */ ],
};
```

## Unit

```js
{
  id: 'ck',                         // lowercase letters, digits, hyphens; unique in the game; never changes
  name: 'ck or k?',                 // 16 characters or fewer (it goes on a jar label)
  about: 'The k sound at the end of a word',
  rule: [                           // 1–3 short sentences in kid language; *asterisks* highlight letters
    'Right after a short vowel, the *k* sound at the end of a word is spelled *ck*: back, neck, sick.',
    'After a consonant or a vowel team it is just *k*: milk, week.',
  ],
  chant: 'Short vowel? Snap on ck.', // optional memory hook, 60 characters or fewer
  sort: { ask: 'How does the word end?', bins: ['ck', 'k', 'ke'] },   // optional, see below
  build: 'join',                    // optional: only for units about joining a base and an ending
  words: [ /* exactly ten */ ],
}
```

The rule must be true. If a pattern has no rule (ee or ea?), say so plainly and
give the best clue there is. Name the exceptions a child will meet.

## Word

```js
{ w: 'bla[ck]', s: 'A * cat slept on the warm step.', x: 'blak', bin: 0 }
```

- **`w`** is the word with markup. Square brackets mark the tricky part, which is
  usually the unit's pattern: `b[oa]t`, `br[a]v[e]`, `d[i]f-f[e]r-[e]nt`. Hyphens
  mark syllable breaks in words of two or more syllables: `kitch-en`,
  `sep-[a]-rate`. Use lowercase letters only, plus a straight apostrophe for
  contractions (`do[n't]`). No capitals, so no names, days or months.
- **`s`** is a sentence with `*` where the word goes. The game speaks it aloud
  and shows it with a blank. Rules: exactly one `*`, never as the first word;
  5–11 words; words she can read easily; the meaning must make clear which word
  it is (this matters most for sound-alikes); do not use the word a second time;
  curly apostrophes (`’`) in the sentence itself.
- **`x`** is the misspelling a struggling speller would most likely write. It is
  used for proofreading practice. It must not be a real word (so `hoping` cannot
  be the misspelling of `hopping`). Leave it out if no good one exists. Large
  word lists contain oddities such as `nife` and `skool`; when the checker
  objects to one of those, look it up, and if no child would know it add it to
  `OBSCURE` in `tools/validate-content.mjs`.
- **`bin`** says which sort answer is right for this word (counting from 0).
- **`tip`** is optional: one short line that helps with this particular word, such
  as a memory trick or "a rule breaker".
- **`from`** is for joining units: `from: 'hop + ing'`.

## The sort

Before she spells anything, she plays a quick card game that makes her apply
the rule. Each card shows a word with its tricky part blanked out (`bla__`),
the game says the word and shows its sentence, and she taps the right answer.
Up to eight cards are played, picked at random.

- With just `ask` and `bins`, the cards are made from the unit's words: the
  bracketed part is blanked and `bin` gives the answer. At least six words need
  a `bin`, and every bin should be used. Add `audio: true` when the answer can
  only be worked out by hearing the word (one consonant or two after a short
  vowel, for example); those cards are skipped when the voice is off.
- In a joining unit (`build: 'join'`) the card shows `from` instead
  (`hop + ing`), so the bins can be actions: `['double it', 'just add']`.
- For anything else, list the cards yourself. A card is `[shown, bin, word]`,
  and `word` does not have to be one of the unit's ten. Use this to add
  contrast words, so that every answer is right some of the time: the soft c
  unit mixes `_ity` (city, c) with `_even` (seven, s). Check that only one
  answer makes a real word for each card.

```js
sort: {
  ask: 'Listen. Does this word need a silent e?',
  bins: ['no e', 'silent e'],
  audio: true,                      // these cards make no sense without sound
  cards: [['hop_', 0, 'hop'], ['hop_', 1, 'hope']],
}
```

- For sound-alike words, give the sets and write sentence cards. Each card is
  `[sentence, the word that fits]`, and the game offers the other words from the
  same set as the wrong answers:

```js
sort: {
  ask: 'Which word fits?',
  sets: [['their', 'there', "they're"], ['to', 'too', 'two']],
  cards: [['The twins forgot * lunch boxes.', 'their'], ['I ate * much pie.', 'too']],
}
```

Leave `sort` out when there is no real decision to practice.

## Before a shelf is done

- The checker reports 0 errors, and you have read its warnings.
- Every target word is spelled correctly. Read the `--list` output one word at
  a time.
- Each rule is true for every word listed under it, or the word carries a tip
  saying it is an exception.
- Each sentence could only be finished with that word.
