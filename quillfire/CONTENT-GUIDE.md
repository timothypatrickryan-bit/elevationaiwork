# Changing what Quillfire teaches

Everything the game asks lives in `js/content/`, in plain lists. The game code
never needs to change to add, fix or remove an item.

| File | Sector | What is in it |
|---|---|---|
| `words.js` | Noun Nebula | noun, verb and adjective lists; tagged sentences; pronouns |
| `sounds.js` | Echo Belt | rhymes, beats, short and long vowels, spelling, sound-alikes, ABC order |
| `meanings.js` | Synonym Stars | synonyms, opposites, context clues, power words, words with two meanings |
| `parts.js` | Word Forge | compound words, prefixes, suffixes, plurals, past tense, contractions |
| `sentences.js` | Sentence Station | complete sentences, end marks, capitals, agreement, punctuation, joining words, word order |
| `reading.js` | Story Galaxy | passages with questions, fact or opinion, sayings |
| `index.js` | all | each skill's name, Blip's lesson, the note shown after a miss; sectors, bosses, story |
| `hangar.js` | | ships, upgrades, paint, badges |
| `voice-lines.js` | | Blip's cheers and coaching |

Each file starts with a comment that explains its rows. Most rows read the same
way: **the question, the right answer, then the wrong answers.**

```js
['huge', 'giant', 'tiny', 'quiet'],     // Means the same as HUGE: giant. Not tiny, not quiet.
```

Where a list is split into `1:`, `2:` and `3:`, those are levels, easiest first.
A skill starts at level 1 and moves up when the last answers were mostly right.

After any change:

```bash
node tools/validate-content.mjs --dict words.txt   # see below
node tools/update-offline-list.mjs                 # refreshes the offline file list in sw.js
```

## What makes a fair item

The child sees one question and several enemy ships, each carrying one answer.
One answer must be right, and every other answer must be plainly wrong to a
careful adult. That is harder than it sounds. The traps we fell into, and the
checker and an independent proofread caught:

- **Words that are two kinds at once.** The sorting waves ("Zap every NOUN")
  show single words with no sentence around them, so every word in the noun,
  verb and adjective lists must be clearly one kind. "Play", "paint", "fish",
  "throw" and "hurry" are all out. So are colors.
- **A wrong answer the dictionary accepts.** "Leafs" and "deers" are listed
  variants; "sung" is an accepted past tense. Use wrong forms no dictionary
  defends ("loafs", "runned"), or classic confusions that are wrong in that
  spot ("hoped" for hop).
- **A wrong half that makes a real compound.** "Sun" joins with flower, but also
  with shine, light, burn and rise. The checker tests every wrong half against
  the dictionary.
- **A piece of a sentence that is really a command.** "Fly south." is a complete
  sentence. Pieces that start with a verb use a form that cannot be an order:
  "Flew south.", "Likes pizza."
- **Two words that fit a gap.** "The alarm rang, ___ nobody woke up" takes only
  "but". "Blip beeped ___ danced" would take "and" or "or".
- **A sentence to build that can be built two ways.** The capital letter fixes
  the first word and the end mark fixes the last. Check that the middle has only
  one order too.
- **Sounds.** Rhymes, beats and vowel sounds follow General American speech.
  A rhyme has to match from the last stressed vowel to the end.
- **Facts.** Fact-or-opinion items and the true-to-life passages have to be
  right, and a "fact" must be something a child could check.

## The notes after a miss

When an answer is missed, the right one lights up and Blip says why. Most notes
are made from the row itself by a template in `index.js` ("“Huge” and “giant”
mean almost the same thing."). After changing a template, read a few filled-in
notes with `node tools/validate-content.mjs --list`. Reading questions carry
their own note as the last thing in the row.

Each skill also has:

- `rule`: the short call at the start of a wave ("Zap the nouns!")
- `tip`: one sentence that sums the skill up, shown and spoken after a miss
- `tipSay`: the tip as spoken, only where the written tip names letters ("-ed")
- `teach`: Blip's lesson in the briefing, one short sentence per line
- `show`: the examples shown under the lesson

## The checker

`tools/validate-content.mjs` catches structural slips: no right answer, the same
answer offered twice, answers too long for a ship, a word in two word-kind
lists, a wrong compound half that makes a word, ABC rows out of order, a mission
with too few items. With `--dict words.txt` (any English word list, one word per
line) it also spell-checks answers and questions. `--list` prints every item
with its right answer in brackets, which is the quickest way to proofread.

It cannot tell whether an answer is true. A person has to read for that.

## Blip's voice

Blip's lessons, calls and tips are recordings in `audio/`, and so are the
sentences and passages behind the "listen" button. After changing any of them,
make the recordings again (the README says how). A line with no recording is
simply not spoken; the words are always on screen.

Write lines the way they should be said. Spell out numbers, and write letter
names as capitals with spaces ("add E D"), not as "-ed".

## Passages

A passage is at most 60 words, so that it fits beside the battle on an iPad
without scrolling. It needs at least three questions. Each question has a kind
(`main`, `detail`, `order`, `cause`, `infer`), and the four reading missions each
draw on their own kinds, so a passage with one question of every kind serves
all four.
