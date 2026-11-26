// First launch: meet the familiar, choose names, check the voice can be heard,
// then a short spelling check to find the right shelf to start on.

import { SHELVES, WORDS, PLACEMENT } from '../content/index.js';
import { S, change, placeFrom } from '../store.js';
import { pet, jar, icon } from '../art.js';
import { sfx, speak, speechSupported, speechOn, stopSpeaking } from '../audio.js';
import { mount, esc } from '../ui.js';
import { createSession } from '../session.js';
import { dictation } from '../activities/dictation.js';
import { petHtml } from '../activities/parts.js';
import { go } from '../nav.js';

export function open(app) {
  let step = 0;
  let sound = 'idle'; // idle | talking | ask | silent | none
  let session = null;
  let left = false;
  let finished = false;

  const petName = () => S().profile.pet || 'Fizz';

  function body() {
    if (step === 0) {
      return `
        <div class="welcome-pet">${pet({ mood: 'cheer', cls: 'is-bob' })}</div>
        <h1 class="display welcome-title">The Spellery</h1>
        <p class="welcome-text">Welcome to the workshop where spells are made of letters. Spell a word right and the spell works. Get it wrong and, well, something odd happens to your familiar. Nothing that can’t be fixed.</p>
        <button class="btn btn-main btn-big" data-act="next">Come in</button>`;
    }
    if (step === 1) {
      return `
        <div class="welcome-pet is-small">${pet({ mood: 'smile', cls: 'is-bob' })}</div>
        <h1 class="display">Who’s who?</h1>
        <label class="field"><span>Your first name</span>
          <input id="who" type="text" maxlength="16" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" value="${esc(S().profile.name)}" placeholder="Type your name"></label>
        <label class="field"><span>This axolotl is your familiar, your spell-testing helper. What will you call it?</span>
          <input id="pet" type="text" maxlength="12" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" value="${esc(petName())}"></label>
        <button class="btn btn-main btn-big" data-act="names">Next</button>`;
    }
    // step 2: the sound check
    const head = `
      <div class="welcome-pet is-small">${pet({ mood: sound === 'talking' ? 'cheer' : 'smile', cls: 'is-bob' })}</div>
      <h1 class="display">Sound check</h1>`;
    if (sound === 'idle' || sound === 'talking') {
      return `${head}
        <p class="welcome-text">In this game ${esc(petName())} says a word out loud and you spell it. Turn the volume up, then tap the button to make sure you can hear.</p>
        <button class="btn btn-main btn-big" data-act="test"${sound === 'talking' ? ' disabled' : ''}>${icon('speaker')} ${sound === 'talking' ? 'Listen…' : `Say hello, ${esc(petName())}`}</button>`;
    }
    if (sound === 'ask') {
      return `${head}
        <p class="welcome-text">Did you hear ${esc(petName())} say hello?</p>
        <div class="welcome-choice">
          <button class="btn btn-main btn-big" data-act="heard">Yes, I heard it</button>
          <button class="btn btn-ghost" data-act="test">${icon('again')} Play it again</button>
          <button class="btn btn-ghost" data-act="unheard">No, nothing</button>
        </div>`;
    }
    return `${head}
      <p class="welcome-text">${sound === 'none' ? 'This device has no voice the game can use.' : 'No sound came out. Check that the volume is up, then try once more.'} If it stays quiet you can still play: ${esc(petName())} will show you each word for a moment instead of saying it.</p>
      <div class="welcome-choice">
        ${sound === 'none' ? '' : `<button class="btn btn-main btn-big" data-act="test">${icon('again')} Try again</button>`}
        <button class="btn ${sound === 'none' ? 'btn-main btn-big' : 'btn-ghost'}" data-act="novoice">Play without the voice</button>
      </div>`;
  }

  const screen = mount(app, 'welcome', '<div class="welcome-inner"></div>', {
    next() {
      sfx('tap');
      step = 1;
      paint();
    },
    names() {
      sfx('tap');
      const who = screen.querySelector('#who').value.trim().slice(0, 16);
      const name = screen.querySelector('#pet').value.trim().slice(0, 12);
      change((st) => {
        st.profile.name = who;
        st.profile.pet = name || 'Fizz';
      });
      step = 2;
      sound = speechSupported() ? 'idle' : 'none';
      paint();
    },
    // Has to speak inside the tap itself, or an iPad stays silent.
    test() {
      sound = 'talking';
      paint();
      const who = S().profile.name;
      speak([{ text: `Hello${who ? ', ' + who : ''}! I am ${petName()}. Can you hear me?`, rate: 0.95 }]).then((result) => {
        if (left || step !== 2) return;
        sound = result === 'spoken' ? 'ask' : 'silent';
        paint();
      });
    },
    heard() {
      sfx('right');
      change((st) => {
        st.settings.speak = true;
      });
      placement();
    },
    unheard() {
      sfx('tap');
      stopSpeaking();
      sound = 'silent';
      paint();
    },
    novoice() {
      sfx('tap');
      stopSpeaking();
      change((st) => {
        st.settings.speak = false;
      });
      finish(0, false);
    },
  });

  function paint() {
    screen.querySelector('.welcome-inner').innerHTML = body();
  }

  // ---- the placement check: two words per shelf, stopping at the first miss
  async function placement() {
    if (!speechOn()) return finish(0, false);
    screen.remove();
    session = createSession(app, {
      title: 'Finding your shelf',
      sub: 'The Spellery',
      hue: 'violet',
      onExit: () => (finished ? enter() : finish(placeFrom([]), false)),
      leave: { title: 'Skip the rest?', body: 'You will start at the first shelf. A grown-up can change that later.', yes: 'Skip', no: 'Keep going' },
    });
    session.progress('Before we start', 0, 0);
    const choice = await session.panel(`
      <div class="talk talk-big"><div class="talk-pet">${petHtml('smile')}</div>
        <p class="bubble">Let me find the right shelf for you. I will say a word and you spell it, one try each. The words get harder as we go, and missing one is fine. It just tells me where to begin.</p></div>
      <button class="btn btn-main btn-big" data-go="go">Start</button>
      <button class="btn btn-ghost" data-go="skip">Skip this and start at the beginning</button>`);
    if (choice === 'skip') return finish(placeFrom([]), false);
    session.guard(true);
    const results = [];
    let asked = 0;
    for (let i = 0; i < PLACEMENT.length; i++) {
      let right = 0;
      for (const key of PLACEMENT[i]) {
        session.progress(`Word ${++asked}`, 0, 0);
        const out = await session.run(dictation, { word: WORDS.get(key), quick: true });
        if (out.credit === 'first') right++;
      }
      results.push(right);
      if (right < PLACEMENT[i].length) break;
    }
    finish(placeFrom(results), true);
  }

  async function finish(start, placed) {
    if (left) return;
    finished = true;
    if (!session) {
      screen.remove();
      session = createSession(app, { title: 'All set', sub: 'The Spellery', hue: 'violet', onExit: () => enter() });
    }
    const shelf = SHELVES[start];
    session.guard(false);
    session.el.dataset.hue = shelf.hue;
    session.progress('All set', 0, 0);
    let say;
    if (!placed) say = `We will begin with the first shelf, ${shelf.name}, and build up from there. Every jar you fill makes the next one easier.`;
    else if (start === 0) say = `We will begin at the first shelf, ${shelf.name}. Each jar holds one spelling secret, and every jar you fill makes the next one easier.`;
    else say = `Nice spelling! You can start on shelf ${start + 1}, ${shelf.name}. The shelves before it are open too, whenever you want them.`;
    await session.panel(`
      <div class="panel-jar">${jar(start, 0)}</div>
      <p class="eyebrow">Your starting shelf</p>
      <h1 class="display">${esc(shelf.name)}</h1>
      <p class="panel-lead">${esc(shelf.about)}</p>
      <div class="talk"><div class="talk-pet">${petHtml('cheer')}</div><p class="bubble">${esc(say)}</p></div>
      <button class="btn btn-main btn-big" data-go>Open the workshop</button>`);
    enter();
  }

  function enter() {
    change((st) => {
      st.profile.welcomed = true;
    });
    go('home');
  }

  paint();
  return {
    leave() {
      left = true;
      stopSpeaking();
      if (session) session.destroy();
    },
  };
}
