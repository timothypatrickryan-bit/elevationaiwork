// The workshop: the familiar, what to do next, and the shelves of jars.

import { SHELVES } from '../content/index.js';
import { S, change, starsOf, shelfOpen, shelfProgress, nextUnit, dueWords, rank, jarsFilled, JARS_TO_OPEN, playedToday, VOICE_CHECK } from '../store.js';
import { jar, stars, icon } from '../art.js';
import { sfx, speechSupported } from '../audio.js';
import { mount, esc, topbar, tabs, tabHandlers, grownupsGate, toast, plural, pick, ask } from '../ui.js';
import { petHtml } from '../activities/parts.js';
import { go } from '../nav.js';

// With this many words waiting, a review comes before a new jar.
const REVIEW_FIRST = 5;
export const REVIEW_SIZE = 8;

export function rankHtml() {
  const r = rank();
  const share = r.next ? (r.jars - r.at) / (r.next.at - r.at) : 1;
  const left = r.next ? r.next.at - r.jars : 0;
  return `<div class="rank">
    <div class="rank-row"><span class="rank-title">${icon('wand')} ${esc(r.title)}</span><span class="rank-next">${r.next ? `${plural(left, 'more jar')} to ${esc(r.next.title)}` : 'Every jar is filled'}</span></div>
    <div class="meter" role="img" aria-label="${Math.round(share * 100)} percent of the way to the next rank"><i style="transform:scaleX(${share.toFixed(3)})"></i></div>
  </div>`;
}

function lockNote(i) {
  const before = SHELVES[i - 1];
  if (!shelfOpen(i - 1)) return `Opens after “${before.name}”.`;
  const need = JARS_TO_OPEN - shelfProgress(i - 1).done;
  return `Fill ${plural(need, 'more jar')} on “${before.name}” to open this shelf.`;
}

export function open(app) {
  const st = S();
  const due = dueWords();
  const up = nextUnit();
  const jars = jarsFilled();
  const reviewFirst = due.length >= REVIEW_FIRST || (!up && due.length > 0);
  const reviewSize = Math.min(due.length, REVIEW_SIZE);
  const brandNew = !jars && !Object.keys(st.units).length;

  let say;
  if (brandNew) say = 'Your first jar is waiting. Fill it and it goes up on the shelf for good.';
  else if (reviewFirst && due.length > REVIEW_SIZE) say = `A batch of your words is ready for a review, ${REVIEW_SIZE} at a time. Coming back to words is what makes them stick.`;
  else if (reviewFirst) say = `${plural(due.length, 'word')} of yours ${due.length === 1 ? 'is' : 'are'} ready for a review. Coming back to words is what makes them stick.`;
  else if (!up) say = 'Every jar is filled. Reviews keep your words strong, and you can brew any jar again for more stars.';
  else if (!playedToday()) say = pick(['Good to see you! One jar today keeps the streak going.', 'Ready when you are. Shall we fill a jar?', 'The cauldron is warm. Pick up where you left off?']);
  else say = pick(['Nice work today. Room for one more jar?', 'You are on a roll. Another jar?', 'That was good spelling. Keep going, or come back tomorrow.']);

  const jarButton = up ? `<button class="btn ${reviewFirst ? 'btn-ghost' : 'btn-main btn-big'}" data-act="next">${icon('jar')} ${brandNew ? 'Start your first jar' : `Next jar: ${esc(up.unit.name)}`}</button>` : '';
  const reviewButton = due.length ? `<button class="btn ${reviewFirst ? 'btn-main btn-big' : 'btn-ghost'}" data-act="review">${icon('again')} Review ${plural(reviewSize, 'word')}</button>` : '';

  const shelves = SHELVES.map((shelf, i) => {
    const isOpen = shelfOpen(i);
    const p = shelfProgress(i);
    const note = isOpen ? shelf.about : lockNote(i);
    const cards = shelf.units
      .map((unit) => {
        const got = starsOf(unit.id);
        const isNext = !!up && up.unit.id === unit.id;
        let tag;
        if (!isOpen) tag = `<span class="jarcard-tag is-lock">${icon('lock')}<span class="sr">Locked</span></span>`;
        else if (got) tag = stars(got);
        else tag = `<span class="jarcard-tag${isNext ? ' is-next' : ''}">${isNext ? 'Next' : 'New'}</span>`;
        return `<button class="jarcard${isNext ? ' is-next' : ''}${got ? ' is-done' : ''}" data-act="jar" data-id="${unit.id}"${isOpen ? '' : ` data-locked="${i}" aria-disabled="true"`}>
          ${jar(i, got)}
          <span class="jarcard-name">${esc(unit.name)}</span>
          ${tag}
        </button>`;
      })
      .join('');
    return `<section class="shelf${isOpen ? '' : ' is-locked'}${p.complete ? ' is-complete' : ''}" data-hue="${shelf.hue}">
      <header class="shelf-head">
        <span class="shelf-num">${i + 1}</span>
        <div class="shelf-title"><h2>${esc(shelf.name)}</h2><p>${esc(note)}</p></div>
        <span class="shelf-count">${isOpen ? `${p.done} of ${p.total}` : icon('lock')}</span>
      </header>
      <div class="shelf-row">${cards}</div>
    </section>`;
  }).join('');

  const screen = mount(
    app,
    'home',
    `${topbar('')}
    <main class="main">
      <section class="hero">
        <div class="hero-pet">${petHtml('smile', '', 'is-bob')}</div>
        <div class="hero-body">
          <p class="hero-hello">${st.profile.name ? `Hi, ${esc(st.profile.name)}!` : 'Hello!'}</p>
          <p class="bubble">${esc(say)}</p>
          <div class="hero-actions">${reviewFirst ? reviewButton + jarButton : jarButton + reviewButton}</div>
        </div>
        ${rankHtml()}
      </section>
      ${shelves}
    </main>
    ${tabs('home')}`,
    {
      ...tabHandlers,
      next() {
        sfx('tap');
        if (up) go('unit', { id: up.unit.id });
      },
      review() {
        sfx('tap');
        go('review');
      },
      jar(target) {
        if (target.dataset.locked) {
          sfx('back');
          return toast(lockNote(Number(target.dataset.locked)), 'lock');
        }
        sfx('tap');
        go('unit', { id: target.dataset.id });
      },
    }
  );
  grownupsGate(screen);

  // The first version of the sound check used the iPad's own speech voice,
  // which stays silent on a muted iPad. Anyone who turned the voice off back
  // then is offered the new check once; after that it lives on the Grown-ups page.
  if (st.settings.speak !== true && st.settings.voiceCheck !== VOICE_CHECK && speechSupported()) {
    change((save) => {
      save.settings.voiceCheck = VOICE_CHECK;
    });
    ask({
      title: 'New: a voice for the words',
      body: 'The game can now say each word out loud, even when the iPad is on silent. Shall we check that you can hear it?',
      yes: 'Check the sound',
      no: 'Not now',
    }).then((yes) => {
      if (yes) go('welcome', { resume: 'sound' });
    });
  }
}
