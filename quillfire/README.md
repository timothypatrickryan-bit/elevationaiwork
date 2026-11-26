# Quillfire

A starship battle game that teaches English language arts to an eight-year-old
(US grades 2 and 3), made to run full screen on an iPad from the Home Screen.
There is no App Store step, no account, no ads and no tracking. Progress is
saved on the iPad itself and nothing is sent anywhere.

This folder is separate from the Elevation AI site in `site/` and from the two
other games, `lantern-library/` and `spellery/`. Nothing here is published by
the repo's `render.yaml`.

## How the game works

The Garble fleet is scrambling every word in the galaxy. The player is a new
pilot in a ship called the Quillfire, with a robot co-pilot named Blip. Every
enemy ship carries a word or an answer on its hull, and the way to win a fight
is to know which one is right.

A mission is one skill. It goes like this:

1. **Briefing.** Blip teaches the idea in three short sentences with
   examples, out loud and on screen.
2. **Battle.** Six to twelve waves of enemy ships, each wave one question. Tap
   the ship with the right answer to fire at it.
3. **Results.** A bronze, silver or gold medal for the share of answers that
   were right on the first try (50%, 75%, 90%), crystals to spend, and whatever
   the mission opened.

The waves come in five shapes, so the same skill is practiced in different
ways:

| Wave | What the player does | Example |
|---|---|---|
| Pick | Several ships, one carries the right answer | Which word means the same as *huge*? |
| Bins | Two or three big cargo ships, each a category | *Rocket*: person, place or thing? |
| Tap | The words of a sentence fly in formation; tap the ones that fit | Tap every word that needs a capital |
| Order | Ships chained by lightning, to zap in sequence | Put the words in ABC order; build the sentence |
| Sort | A convoy crosses the sky; zap only the ships that fit | Zap every verb, let the rest fly by |

**A miss never ends a wave.** The Garblers shoot back (the shot can be dodged
by sliding the ship), the right answer lights up, Blip says why it is right,
and the player zaps it to go on. The same question returns at the end of the
mission, and again in later daily patrols. So every question ends with the
right answer, and nothing that was missed is dropped.

**It is a real game.** Shields, a scanner that clears away wrong answers, a
Nova blast that charges with right answers, streak multipliers, six bosses
whose shields fall with each right answer, six ships to win, upgrades and
paint to buy with crystals, eight pilot ranks and eighteen badges. All of it is
earned by answering, and none of it can be bought with money. If the shields
run out the ship makes an emergency warp back to base: the crystals collected
are kept, and the mission can be flown again at once with an extra shield (up
to three extra, until it is finished).

**The level fits the pilot.** Each skill has three levels of question. A skill
starts at level 1, moves up when the last answers were mostly right, and moves
back down when they were not.

**The daily patrol** opens after the second mission: ten questions from
everything flown so far, with the questions missed before first in line. Each
time a missed question is answered right it waits longer before it returns
(one day, then three, then seven), and after that it counts as learned. A miss
sends it back to the start.

**Reading help.** Every word the player has to read is in a typeface designed
to be easy to tell apart. A speaker button reads the question's sentence or
passage aloud. Relaxed timing (on the Grown-ups page) removes the countdown on
the waves and slows the enemy shots.

### What it teaches

Thirty-five skills in six sectors, 1,400 questions in all. Each sector ends in
a boss fight that mixes its skills.

| Sector | Skills |
|---|---|
| 1. Noun Nebula: kinds of words | nouns · verbs · adjectives · finding all three in a sentence · pronouns |
| 2. Echo Belt: sounds and spelling | rhymes · syllables · short and long vowels · spelling tricky words · sound-alike words · ABC order |
| 3. Synonym Stars: what words mean | synonyms · antonyms · context clues · shades of meaning · words with two meanings |
| 4. Word Forge: how words are built | compound words · prefixes · suffixes · plurals · past tense · contractions |
| 5. Sentence Station: sentences and marks | complete sentences · end marks · capital letters · subject and verb agreement · commas, apostrophes and quotation marks · joining words · word order |
| 6. Story Galaxy: reading for meaning | main idea and details · order of events · cause and effect · inferences · fact and opinion · sayings and similes |

A sector opens when the boss of the one before is beaten, and a mission opens
when the one before it has a medal. Finishing a mission always earns at least
bronze.

**The first day** starts with a short flight school that teaches the controls
with easy words: tap a ship to fire, slide the ship to dodge.

**The voice** is Blip's: a set of recordings that ship with the game. They play
the way a video does, so they are heard even when the iPad is on silent, and
they work offline. The recordings are computer-made speech (see Credits). The
words are always on screen as well, so the game can be played with the voice
off.

**For grown-ups:** press and hold the Grown-ups button on the title screen (or
the gear on the map). That page shows minutes played per day, the three skills
going least well with their rules, every skill's share right on the first try
and its current level, the latest misses with what was picked, settings (sound
effects, music, voice, relaxed timing, calm screen, open every mission), a
progress code for backup, and a reset.

## Putting it on the iPad

The game is a plain folder of files, so it needs to be served from a web
address once. After that it lives on the Home Screen and works offline.

1. **Host this folder as a static site.** Any static host works. On Render,
   which this repo already uses: New → Static Site → this repository, build
   command empty, publish directory `quillfire`.
2. **On the iPad, open the address in Safari.** Tap the Share button, then
   **Add to Home Screen**.
3. **Open it from the new icon.** It runs full screen, and after the first
   launch it no longer needs a connection.

This copy is deployed that way already, as the Render static site named
`quillfire`. It redeploys by itself whenever the branch it was created from is
pushed. If that branch is merged and deleted, point the service at `main` under
Settings → Branch in the Render dashboard.

Things worth knowing:

- Progress is stored by the Home Screen app. Deleting the icon deletes the
  progress, so copy the progress code from the Grown-ups page now and then.
- The page asks search engines not to list it, but anyone who has the address
  can open it. It contains nothing personal: the pilot's call sign and progress
  never leave the iPad.
- When the files change on the host, the iPad picks up the new version the next
  time the game is opened with a connection.
- The game works turned either way, and on a phone, but it is laid out for an
  iPad held sideways.
- If Blip is not heard, turn the volume up. Silent mode does not matter: the
  voice plays like a video.

## Trying it on a computer

```bash
python3 -m http.server 8090 --directory quillfire
```

Then open http://localhost:8090. It must be served this way (not opened as a
file) because the code is split into modules. Click a ship to fire, and click
or drag along the bottom to move; the arrow keys and the number keys work too.

## What is in the folder

```
index.html              the page
manifest.json           name, colors and icons for the Home Screen
sw.js                   offline support
css/                    styles and the font declarations
fonts/                  three open-licensed typefaces (see fonts/README.md)
icons/                  app icons
js/main.js              starts the game and switches screens
js/screens.js           every screen except the battle: title, map, briefing, results, hangar, grown-ups
js/battle.js            the battle itself, drawn on a canvas
js/encounters.js        turns a mission into its list of waves, at the pilot's level
js/store.js             saved progress and all the rules: medals, unlocking, levels, reviews, crystals, badges
js/gfx.js               every drawing: ships, enemies, bosses, planets, starfields
js/audio.js             sound effects, music and Blip's voice
js/ui.js                small helpers, icons and Blip's face
js/content/             everything the game teaches, one file per sector
audio/                  the recorded voice: one file per sector, plus index.json
tools/                  checkers (need Node 18 or later) and the voice-recording scripts (Python)
CONTENT-GUIDE.md        how to change or add questions
```

There is no build step and no dependency to install. The pictures, sound
effects and music are all made by the code; the only recorded sound is the
voice.

## Changing or adding questions

Everything the game asks is in plain lists in `js/content/`.
[CONTENT-GUIDE.md](CONTENT-GUIDE.md) explains the format and what makes a fair
question. After any change:

```bash
node tools/validate-content.mjs          # checks every question for mistakes
node tools/update-offline-list.mjs       # refreshes the offline file list in sw.js
```

`validate-content.mjs --dict words.txt` also spell-checks against a word list
(one word per line), and `--list` prints every question with its answer for
proofreading.

Progress is stored under each mission's and skill's id, so those ids must never
change. Changing a question's wording only means that question loses its place
in the review queue.

### The recorded voice

A new or changed line has no recording until the voice is made again. Until
then that line is simply not spoken (the words are still on screen), so it is
worth redoing:

```bash
node tools/voice-list.mjs > /tmp/voice-list.json     # everything Blip has to say
python tools/make-voice.py /tmp/voice-list.json      # makes audio/ (about an hour on a laptop)
python tools/check-voice.py voice-work               # listens to every clip and reports doubtful ones
node tools/update-offline-list.mjs
```

`make-voice.py` needs Python 3.12, `pip install kokoro==0.9.4 soundfile`,
`python -m spacy download en_core_web_sm` and ffmpeg. (The version is pinned
because the script sets the length of single sounds, which newer versions of
that package may do differently.) `check-voice.py` also needs `pip install
faster-whisper`. Finished clips are kept in `voice-work/` between runs, so only
what changed is made again. How a name is pronounced can be corrected in the
`SAY_ALWAYS` table at the top of `make-voice.py`.

Each clip is spoken in the middle of a longer line and then cut out of it,
because the speech model adds a small noise before the first sound and after
the last sound of whatever it says. `make-voice.py` ends by saying how many
clips it could cut cleanly; any that it "cut by the clock" should be listened
to.

## Credits

The game, its questions, passages, drawings, sound effects, music and code were
written for this project. The typefaces (Russo One, Oxanium and Atkinson
Hyperlegible Next) are used under the SIL Open Font License.

The voice is synthetic speech made with the open
[Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) text-to-speech model
(Apache 2.0 licence), voice `af_bella`. No person was recorded.
