// The rule game played before any spelling: one card at a time, she decides
// which spelling the rule calls for. A card can be a word with its tricky part
// blanked (bla__), a base and an ending (hop + ing), or a sentence with a gap
// for choosing between sound-alikes.

import { WORDS, wordsOf } from '../content/index.js';
import { fullSentence, pretty } from '../words.js';
import { sfx, speechOn, sayWord, saySentence, stopSpeaking } from '../audio.js';
import { esc, rich, shuffle, pick, burstFrom } from '../ui.js';
import { frame, studyTiles, clozeHtml, toolButton, blanked } from './parts.js';

const MAX_CARDS = 8;

// Every card: { face, after, say, sentence, hint, hintAfter, options, answer, tip }
//   face / after   what the card shows before and after she answers
//   say            what the voice reads out (a word, or a whole sentence)
//   hint           the word's sentence with a gap, so that look-alikes such as
//                  piece and peace can be told apart
function buildDeck(unit) {
  const sort = unit.sort;
  if (sort.sets) {
    return sort.cards.map(([show, answer]) => {
      const options = sort.sets.find((set) => set.includes(answer));
      const word = WORDS.get(answer);
      return { face: clozeHtml(show), after: clozeHtml(show, answer), say: fullSentence(show, answer), sentence: true, options, answer: options.indexOf(answer), tip: word ? word.tip : '' };
    });
  }
  if (sort.cards) {
    return sort.cards.map(([show, bin, word]) => {
      if (show.includes('*')) return { face: clozeHtml(show), after: clozeHtml(show, sort.bins[bin]), say: fullSentence(show, sort.bins[bin]), sentence: true, options: sort.bins, answer: bin, tip: '' };
      const known = WORDS.get(word);
      // When the answer is the missing letters themselves, show them dropped in.
      const fits = show.replace(/_/g, sort.bins[bin]) === word;
      return {
        face: esc(show).replace(/_/g, '<span class="card-blank"></span>'),
        after: `<span class="card-word">${fits ? esc(show).replace(/_/g, `<b class="hl">${esc(sort.bins[bin])}</b>`) : esc(pretty(word))}</span>`,
        say: word,
        hint: known ? clozeHtml(known.sentence) : '',
        hintAfter: known ? clozeHtml(known.sentence, known.key) : '',
        options: sort.bins,
        answer: bin,
        tip: '',
      };
    });
  }
  const joining = unit.build === 'join';
  return wordsOf(unit)
    .filter((w) => Number.isInteger(w.bin))
    .map((w) => ({
      face: joining ? esc(pretty(w.from)).replace(' + ', ' <i>+</i> ') : blanked(w),
      after: (joining ? `<span class="card-from">${esc(pretty(w.from)).replace(' + ', ' <i>+</i> ')} <i>=</i></span>` : '') + studyTiles(w, 'is-small'),
      say: w.key,
      hint: joining ? '' : clozeHtml(w.sentence),
      hintAfter: joining ? '' : clozeHtml(w.sentence, w.key),
      options: sort.bins,
      answer: w.bin,
      tip: w.tip,
    }));
}

export const cardCount = (unit) => (unit.sort ? Math.min(MAX_CARDS, buildDeck(unit).length) : 0);

export function cards(host, { unit, onDone, onStep }) {
  const deck = shuffle(buildDeck(unit)).slice(0, MAX_CARDS);
  const voice = speechOn();
  const f = frame(host, 'act-cards');
  let at = 0;
  let right = 0;
  let answered = false;
  let gone = false;

  const hear = () => {
    const card = deck[at];
    if (!voice || !card.say) return;
    if (card.sentence) saySentence(card.say);
    else sayWord(card.say);
  };

  function show() {
    const card = deck[at];
    answered = false;
    if (onStep) onStep(at, deck.length);
    f.setPet('smile');
    f.setLine(unit.sort.ask);
    f.tools.innerHTML = voice ? toolButton('hear', 'speaker', card.sentence ? 'Hear the sentence' : 'Hear the word') : '';
    f.cloze.innerHTML = card.hint || '';
    f.stage.innerHTML = `<div class="card-face${card.sentence ? ' is-sentence' : ''}">${card.face}</div>`;
    f.setNote('');
    f.setGo('');
    f.kb.innerHTML = `<div class="options" style="--n:${card.options.length}">${card.options
      .map((label, i) => `<button class="option" data-option="${i}">${esc(pretty(label))}</button>`)
      .join('')}</div>`;
    hear();
  }

  function choose(i) {
    if (answered) return;
    answered = true;
    const card = deck[at];
    const good = i === card.answer;
    if (good) right++;
    f.kb.querySelectorAll('.option').forEach((b) => {
      const n = Number(b.dataset.option);
      b.disabled = true;
      if (n === card.answer) b.classList.add('is-right');
      else if (n === i) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });
    f.stage.innerHTML = `<div class="card-face is-done${card.sentence ? ' is-sentence' : ''}">${card.after}</div>`;
    f.cloze.innerHTML = card.hintAfter || '';
    f.setPet(good ? 'cheer' : 'think');
    const answer = `“${esc(pretty(card.options[card.answer]))}”`;
    const tip = card.tip ? ` <span class="tip">${rich(card.tip)}</span>` : '';
    const chant = !card.tip && unit.chant ? ` <span class="tip">${esc(unit.chant)}</span>` : '';
    f.setNote(good ? `<b>${pick(['Yes!', 'Right!', 'That’s the one.', 'Exactly.'])}</b>${tip}` : `It is ${answer}.${tip}${chant}`, good ? 'right' : 'fizzle');
    f.setGo(at + 1 < deck.length ? 'Next card' : 'Done');
    sfx(good ? 'right' : 'fizzle');
    if (good) burstFrom(f.stage.querySelector('.card-face'), 8);
  }

  function onClick(event) {
    if (event.target.closest('[data-tool]')) return hear();
    const option = event.target.closest('[data-option]');
    if (option) return choose(Number(option.dataset.option));
    if (event.target.closest('[data-go]')) next();
  }
  function next() {
    if (gone || !answered || !f.goReady()) return;
    sfx('tap');
    at++;
    if (at < deck.length) return show();
    destroy();
    onDone({ right, total: deck.length });
  }
  const onKey = (event) => {
    if (event.key !== 'Enter' || document.querySelector('.backdrop')) return;
    event.preventDefault();
    next();
  };
  host.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);

  function destroy() {
    if (gone) return;
    gone = true;
    host.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    stopSpeaking();
  }

  show();
  return { destroy };
}
