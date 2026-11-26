# The Spellery

A spelling game for a fifth grader who finds spelling hard, made to run full
screen on an iPad from the Home Screen. There is no App Store step, no account
and no tracking. Progress is saved on the iPad itself and nothing is sent
anywhere.

This folder is separate from the Elevation AI site in `site/` and from the
reading game in `lantern-library/`. Nothing here is published by the repo's
`render.yaml`.

## How the game works

The Spellery is a workshop where spells are made of letters. Spell a word right
and the spell works. Get it wrong and something silly happens to your familiar
(an axolotl), which is fixed by spelling the word properly.

There are 350 words in 35 jars on 7 shelves. A jar is one spelling pattern with
ten words, and filling it goes like this:

1. **Quick check.** Five of the jar's words, one try each. Four or five right
   fills the jar on the spot, so no time goes on what she already knows.
2. **The rule.** One idea in plain words, with a line to remember it by.
3. **Rule cards.** A short card game that makes her use the rule before she
   has to spell anything: *bla__* ends in ck, k or ke?
4. **Build.** Six of the words with support: fill in the missing letters,
   unscramble, or join a base word and an ending.
5. **Cast.** The same six words from memory. The game says the word, then a
   sentence, then the word again.

A miss is never the end of a word. After a wrong try the letters she had right
are kept as a hint for a second try. After a second miss the word is shown with
its tricky part colored, then hidden, and she writes it from memory. If that
goes wrong too, she copies it. Every word ends with a correct spelling.

| Shelf | Jars |
|---|---|
| 1. Snap Spells | ck or k · tch or ch · dge or ge · ff, ll, ss · magic e |
| 2. Long Vowel Brews | long a · long e · long i · long o · long u and oo |
| 3. Bossy R & Slippery Vowels | er, ir, ur · ar, or, ore · oi, oy, ou, ow · aw, au, al · ough and augh |
| 4. Sneaky Letters | silent letters · soft c and g · ph and ch · twin letters · ie or ei |
| 5. Joining Charms | plurals · doubling · dropping e · y to i · the ed ending |
| 6. Word Parts | prefixes · suffixes · le, el, al · tion and sion · ture and sure |
| 7. Rule Breakers | common rule breakers · long words with squashed sounds · sound-alikes (two jars) · contractions |

**Where she starts.** On the first day the game asks up to twelve words, two
from each shelf with the easy shelves first, and stops at the first pair with a
miss. That sets her starting shelf. Shelves
before it stay open, and a later shelf opens when three jars on the one before
are filled.

**Reviews.** Every word comes back after one day, then three, seven, fourteen
and thirty. A miss sends it back to the start. A word counts as mastered once
she has spelled it right first time on reviews days apart. Mastered words also
turn up in a proofreading round, where one word in a sentence is wrong and she
has to find and fix it.

**The keyboard** is the game's own, so the iPad's autocorrect and word
suggestions cannot help.

**The voice** is the iPad's built-in one. The first screen includes a sound
check ("Did you hear me?"). If there is no voice, or she taps "Can't hear?",
the game shows each word for a moment instead of saying it and skips the quick
checks. That mode works, but spelling from a spoken word is the stronger
practice.

**Sparks and badges.** Words spelled right earn sparks, which buy colors and
things to wear for the familiar. There are fifteen badges.

**For grown-ups:** press and hold the Grown-ups button on the home screen. That
page lists the words she has missed with exactly what she typed, the two
patterns going least well with their rules, words mastered on each shelf,
minutes practiced per day, recent jars and reviews, settings (voice, sound
effects, starting shelf, open every shelf), a progress code for backup, and a
reset.

## Putting it on the iPad

The game is a plain folder of files, so it needs to be served from a web
address once. After that it lives on the Home Screen and works offline.

1. **Host this folder as a static site.** Any static host works. On Render,
   which this repo already uses: New → Static Site → this repository, build
   command empty, publish directory `spellery`.
2. **On the iPad, open the address in Safari.** Tap the Share button, then
   **Add to Home Screen**.
3. **Open it from the new icon.** It runs full screen, and after the first
   launch it no longer needs a connection.

This copy is deployed that way already, as the Render static site named
`spellery`. It redeploys by itself whenever the branch it was created from is
pushed. If that branch is merged and deleted, point the service at `main` under
Settings → Branch in the Render dashboard.

Things worth knowing:

- Progress is stored by the Home Screen app. Deleting the icon deletes the
  progress, so copy the progress code from the Grown-ups page now and then.
- The page asks search engines not to list it, but anyone who has the address
  can open it. It contains nothing personal: her name and progress never leave
  the iPad.
- When the files change on the host, the iPad picks up the new version the next
  time the game is opened with a connection.
- If the words are not spoken, check the volume and the mute setting first,
  then Grown-ups → Test the voice.

## Trying it on a computer

```bash
python3 -m http.server 8090 --directory spellery
```

Then open http://localhost:8090. It must be served this way (not opened as a
file) because the code is split into modules. A real keyboard works as well as
the on-screen one.

## What is in the folder

```
index.html              the page
manifest.json           name, colors and icons for the Home Screen
sw.js                   offline support
css/                    styles and the font declarations
fonts/                  two open-licensed typefaces (see fonts/README.md)
icons/                  app icons
js/main.js              starts the game and switches screens
js/store.js             saved progress and all the rules: review dates, stars, sparks, unlocking, badges
js/words.js             word markup, and lining up a wrong spelling with the right one
js/audio.js             sound effects and the voice
js/art.js               every drawing: the familiar, jars, icons
js/keyboard.js          the on-screen keyboard
js/session.js           the frame around a run of activities
js/activities/          hear-and-spell, fill in, unscramble, join, rule cards, proofreading
js/screens/             one file per screen
js/content/             the word lists, one file per shelf
tools/                  checkers (need Node 18 or later)
CONTENT-GUIDE.md        how to write or change a shelf of words
```

There is no build step and no dependency to install.

## Changing or adding words

Each shelf is one file in `js/content/`. [CONTENT-GUIDE.md](CONTENT-GUIDE.md)
explains the format. After any change:

```bash
node tools/validate-content.mjs          # checks every shelf for mistakes
node tools/update-offline-list.mjs       # refreshes the offline file list in sw.js
```

`validate-content.mjs --dict words.txt` also spell-checks every word, every
listed misspelling and every sentence against a word list (one word per line).

Changing a word's spelling in a shelf file starts that word's progress again,
because progress is stored under the word itself. Unit ids must never change.

## Credits

The word lists, rules, sentences, drawings and code were written for this
project. The typefaces (Caprasimo and Atkinson Hyperlegible Next) are used
under the SIL Open Font License.
