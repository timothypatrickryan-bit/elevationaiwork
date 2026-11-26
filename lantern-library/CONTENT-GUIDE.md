# Writing stories for Lantern Library

Every book is one file in `js/content/` that exports a book object. Copy
`js/content/book-keeper.js` as a starting point, add the new file to
`js/content/index.js`, and run the checker:

```bash
node tools/validate-content.mjs js/content/book-yours.js --units
```

`--units` prints how each passage is cut into sentences. Read that list: those
sentences are what the reader taps in "find the evidence" questions.

## The reader

A fifth grader, 10 or 11 years old. Write up to her, not down: vivid, exact,
never babyish. Keep suspense mild. No gore, romance, or cruelty.

| Book level | Words per chapter | Feel |
|---|---|---|
| 1 | 250–380 | Short sentences mixed with a few longer ones. Mostly familiar words. |
| 2 | 300–440 | Longer sentences, more description, some harder ideas. |
| 3 | 360–500 | Denser information, more academic words, ideas that must be connected. |

Paragraphs stay short (2–5 sentences) because they are read on a screen.

Nonfiction must be true. Use only well-established facts, never invent quotes,
and say "about" or "scientists think" where things are uncertain.

## Book

```js
export default {
  id: 'keeper',            // short, lowercase, never changes (saved progress uses it)
  title: 'The Keeper’s Riddle',
  genre: 'Mystery',        // one or two words shown on the cover
  kind: 'fiction',         // fiction | nonfiction | traditional
  level: 1,                // 1, 2 or 3 (see table)
  hue: 'gold',             // lantern color: gold | teal | violet | coral | mint | sky
  cover: 'lighthouse',     // cover drawing: lighthouse | butterfly | compass | bulb | moon | planet
  blurb: 'One or two sentences that sell the book on the shelf.',
  chapters: [ /* four chapters */ ],
};
```

## Chapter

```js
{
  id: 'keeper-1',          // book id + number, never changes
  title: 'The Brass Key',
  teaser: 'One line shown before reading. A hook, not a summary.',
  format: 'poem',          // only for poems; leave out otherwise
  credit: 'Christina Rossetti, 1872',   // only for texts you did not write (public domain only)
  text: [ /* blocks, see below */ ],
  words: [ /* 3–5 power words */ ],
  questions: [ /* 6 questions */ ],
  talk: 'An open question to talk about afterwards. No right answer.',
  next: 'Serial stories only: one line that makes her want the next chapter.',
}
```

### Text blocks

`text` is a list. A plain string is a paragraph. For anything else use an object:

```js
'A normal paragraph. *Asterisks* make italics.',
{ as: 'heading', text: 'A Body Built for Escape' },            // subheading (nonfiction)
{ as: 'heading', text: 'The Wind', sub: 'Robert Louis Stevenson, 1885' },
{ as: 'note', text: 'A letter, diary or logbook entry inside the story.' },
{ as: 'verse', text: 'Lines of a poem or riddle\nseparated by \\n' },
```

Typing rules that matter:

- Use curly quotes and apostrophes: `“ ” ‘ ’`. Use `—` with no spaces around it.
- Italics must open and close inside one sentence.
- After a quotation that ends in `?` or `!`, a dialogue tag starting with a
  capital can be mistaken for a new sentence. `“Stop!” Nadia cried.` is handled
  for common speech verbs; check the `--units` output anyway.
- Avoid abbreviations with full stops in the middle of a sentence.

### Power words

Three to five words per chapter that are worth owning: useful in many subjects,
probably new to a fifth grader, and actually used in the passage.

```js
{
  word: 'reluctant',            // dictionary form, shown on the word card
  in: 'Reluctantly',            // exact form in the passage, if different
  pos: 'adjective',             // noun | verb | adjective | adverb (of `word`)
  def: 'not wanting to do something, and slow to do it',     // kid language, 16 words or fewer
  ex: 'Sam was *reluctant* to jump into the freezing lake.', // new sentence, base word marked once
}
```

The example sentence must use the dictionary form exactly, in a situation
unlike the story, with enough context that the meaning could be guessed.

## Questions

Six per chapter. At least two are not multiple choice, and at least four
different skills appear. Start with one that builds confidence. End with one
that takes thought. Across a whole book, use every question type at least once
and cover a wide range of skills.

Every question has:

- `type` — see below
- `skill` — one of `details`, `evidence`, `main`, `inference`, `vocab`,
  `figurative`, `sequence`, `cause`, `structure`, `character`, `theme`,
  `purpose` (described in `js/content/skills.js`)
- `q` — the question, in plain words
- `why` — one to three friendly sentences shown after she answers. Explain the
  thinking using the text. Where a wrong answer is tempting, say why it fails.
  Do not start with "Correct" (the game adds its own reaction).
- `evidence` — short exact quotes from the passage that support the answer.
  The game lights up those sentences when it explains. Each quote must sit
  inside one sentence and match only that sentence. Leave it out only when the
  whole passage is the evidence (main idea, theme, order of events).

### `mc` — multiple choice

```js
{ type: 'mc', skill: 'inference', q: '…', choices: ['…', '…', '…', '…'], answer: 2, why: '…', evidence: ['…'] }
```

Exactly four choices. `answer` counts from 0. The game shuffles them. Every
wrong choice should be something a reader who skimmed might pick. Keep choices
about the same length and shape so the right one does not stand out. No "all of
the above", no "none of these", no trick negatives.

### `multi` — choose two

```js
{ type: 'multi', skill: 'details', q: 'Choose TWO details that show …', choices: [5 strings], answers: [0, 3], why: '…', evidence: ['…', '…'] }
```

Say the number in capitals in the question.

### `evidence` — tap the sentence

```js
{ type: 'evidence', skill: 'evidence', q: 'Tap the sentence that shows …', answer: ['exact quote', 'another acceptable quote'], why: '…' }
```

The reader taps a sentence in the passage (a line, in a poem). List every
sentence a thoughtful reader could fairly choose, up to three. If more than
three would be fair, the question is too loose.

### `order` — put in order

```js
{ type: 'order', skill: 'sequence', q: 'Put these events in the order they happen.', items: ['first', 'second', 'third', 'fourth'], why: '…' }
```

Write four or five items in the correct order. The game shuffles them.

### `sort` — sort into groups

```js
{ type: 'sort', skill: 'purpose', q: 'Fact or opinion?', bins: ['Fact', 'Opinion'],
  items: [{ t: 'Pluto was discovered in 1930.', bin: 0 }, { t: 'Pluto is the best planet.', bin: 1 }], why: '…' }
```

Two or three groups, four to six items. Good for fact/opinion, cause/effect,
comparing two characters or two texts.

### `cloze` — finish the summary

```js
{ type: 'cloze', skill: 'main', q: 'Finish this summary of the chapter.',
  text: 'Nadia finds a brass [1] in the attic. Its riddle points to the old [2].',
  blanks: ['key', 'lighthouse'], extra: ['map', 'harbor'], why: '…' }
```

Two to four blanks, numbered in order, plus two or three wrong words that fit
the grammar.

## Before a chapter is done

- The checker reports 0 errors, and you have read its warnings.
- Every answer can be proven from the passage alone.
- No question can be answered without reading.
- A second adult would pick the same right answer.
