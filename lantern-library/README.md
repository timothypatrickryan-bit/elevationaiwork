# Lantern Library

A reading-comprehension game for a fifth grader, made to run full screen on an
iPad from the Home Screen. There is no App Store step, no account and no
tracking. Progress is saved on the iPad itself and nothing is sent anywhere.

This folder is separate from the Elevation AI site in `site/`. Nothing here is
published by the repo's `render.yaml`.

## How the game works

The lanterns of the Lantern Library have gone out, and a story only glows when
someone truly understands it. Each chapter goes like this:

1. **Meet the words.** Four useful words are previewed before reading.
2. **Read.** The passage is set in a book typeface on a paper-colored page.
   Underlined words can be tapped for a definition, and a Listen button reads
   the passage aloud while highlighting each sentence.
3. **Show you understood.** Six questions, with the passage still open beside
   them. After a wrong first answer the game marks the paragraph to reread and
   gives one more try. Every answer ends with an explanation and the supporting
   sentence lit up in the text.
4. **Light the lantern.** One to three stars, sparks to spend on outfits for
   Glim (the little lantern spirit), new words for the Firefly Jar, and a
   question to talk about with a grown-up.

There are six kinds of question: multiple choice, choose two, tap the sentence
that proves it, put events in order, sort into groups, and finish the summary.
Each is tagged with one of twelve reading skills (inference, text evidence,
main idea, words in context, figurative language, theme and so on).

| Book | Kind | Level |
|---|---|---|
| The Keeper’s Riddle | Mystery in four chapters | 1 |
| Wild Wonders | Animal science articles | 1 |
| The Mapmaker’s Apprentice | Fantasy in four chapters | 2 |
| Bright Sparks | True stories of young inventors and scientists | 2 |
| Tales by Lantern Light | A folktale, a myth and classic poems | 2 |
| Sky and Stone | Earth and space science | 3 |

That is 24 passages, 144 questions and 95 vocabulary words. Two books are open
at the start; the rest open as lanterns are lit.

Words collected while reading come back in short practice rounds at growing
intervals (one day, two, four, eight, sixteen), which is how vocabulary sticks.

**For grown-ups:** press and hold the Grown-ups button on the home screen. That
page shows accuracy for each reading skill, the two skills to practice next
with ideas for working on them, minutes read per day, recent chapters, a
progress code for backup, and settings.

## Putting it on the iPad

The game is a plain folder of files, so it needs to be served from a web
address once. After that it lives on the Home Screen and works offline.

1. **Host this folder as a static site.** Any static host works. On Render,
   which this repo already uses: New → Static Site → this repository, build
   command empty, publish directory `lantern-library`. GitHub Pages, Netlify
   and Cloudflare Pages work the same way.
2. **On the iPad, open the address in Safari.** Tap the Share button, then
   **Add to Home Screen**.
3. **Open it from the new icon.** It runs full screen, and after the first
   launch it no longer needs a connection.

This copy is deployed that way already, as the Render static site named
`lantern-library`. It redeploys by itself whenever the branch it was created
from is pushed. If that branch is merged and deleted, point the service at
`main` under Settings → Branch in the Render dashboard.

Things worth knowing:

- Progress is stored by the Home Screen app. Deleting the icon deletes the
  progress, so copy the progress code from the Grown-ups page now and then.
- The page asks search engines not to list it, but anyone who has the address
  can open it. It contains nothing personal: her name and progress never leave
  the iPad.
- When the files change on the host, the iPad picks up the new version the next
  time the game is opened with a connection.

## Trying it on a computer

```bash
python3 -m http.server 8090 --directory lantern-library
```

Then open http://localhost:8090. It must be served this way (not opened as a
file) because the code is split into modules.

## What is in the folder

```
index.html              the page
manifest.json           name, colors and icons for the Home Screen
sw.js                   offline support
css/                    styles and the font declarations
fonts/                  three open-licensed typefaces (see fonts/README.md)
icons/                  app icons
js/main.js              starts the game and switches screens
js/store.js             saved progress and all the rules: stars, sparks, unlocking, badges
js/text.js              cuts passages into sentences
js/questions.js         the six question types
js/art.js               every drawing: Glim, lanterns, book covers, icons
js/audio.js             sound effects and read-aloud
js/screens/             one file per screen
js/content/             the books, one file each, plus the list of skills
tools/                  checkers and builders (need Node 18 or later)
CONTENT-GUIDE.md        how to write a new book
```

There is no build step and no dependency to install.

## Changing or adding stories

Each book is one file in `js/content/`. [CONTENT-GUIDE.md](CONTENT-GUIDE.md)
explains the format and what makes a good question. After any change:

```bash
node tools/validate-content.mjs          # checks every book for mistakes
node tools/update-offline-list.mjs       # refreshes the offline file list in sw.js
```

A new book also needs a line in `js/content/index.js`.

`node tools/build-single-file.mjs` packs the whole game into one HTML file
(`dist/lantern-library.html`) for sharing or previewing. The single file has no
offline cache or Home Screen icon, so use the folder for the iPad.

## Credits

All stories, articles, questions, drawings and code were written for this
project. The poems by Robert Louis Stevenson, Christina Rossetti and Emily
Dickinson are in the public domain. The typefaces (Fraunces, Literata and
Nunito) are used under the SIL Open Font License.
