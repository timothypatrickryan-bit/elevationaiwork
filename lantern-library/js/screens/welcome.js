// The first-launch story: why the lanterns are dark and how to light them.

import { glim } from '../art.js';
import { change } from '../store.js';
import { mount } from '../ui.js';
import { sfx } from '../audio.js';
import { go } from '../nav.js';
import { TOTAL_LANTERNS } from '../content/index.js';

export function open(app) {
  let step = 0;
  const el = mount(app, 'welcome', '<div class="welcome-inner"></div>', {
    next() {
      sfx('tap');
      step++;
      paint();
    },
    done() {
      const name = el.querySelector('#reader-name').value.trim().slice(0, 20);
      change((s) => {
        s.profile.name = name;
        s.profile.welcomed = true;
      });
      sfx('lantern');
      go('home');
    },
  });
  const inner = el.querySelector('.welcome-inner');
  const pager = () => `<div class="pager" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i === step ? 'is-on' : ''}"></i>`).join('')}</div>`;

  function paint() {
    if (step === 0) {
      inner.innerHTML = `<div class="welcome-glim">${glim({ mood: 'smile' })}</div>
        <h1 class="display">Lantern Library</h1>
        <p class="welcome-text">High on a hill stands a library where every story once glowed with its own light. Then, one night, <b>the lanterns went out.</b></p>
        <button class="btn btn-gold btn-big" data-act="next">What happened?</button>${pager()}`;
    } else if (step === 1) {
      inner.innerHTML = `<div class="welcome-glim">${glim({ mood: 'wow' })}</div>
        <h1 class="display">I’m Glim, the last little light.</h1>
        <p class="welcome-text">A story only glows when someone truly <b>understands</b> it. Read with me, show what you understood, and together we’ll light all ${TOTAL_LANTERNS} lanterns again.</p>
        <div class="steps">
          <div class="step"><span class="step-n">1</span><b>Read a story</b><span>Take your time. Tap an underlined word to learn it.</span></div>
          <div class="step"><span class="step-n">2</span><b>Show you understood</b><span>Answer questions and find the proof in the text.</span></div>
          <div class="step"><span class="step-n">3</span><b>Light its lantern</b><span>Earn stars and sparks, and open new books.</span></div>
        </div>
        <button class="btn btn-gold btn-big" data-act="next">I’m in</button>${pager()}`;
    } else {
      inner.innerHTML = `<div class="welcome-glim">${glim({ mood: 'cheer' })}</div>
        <h1 class="display">What should I call you?</h1>
        <p class="welcome-text">Your name stays on this device. You can leave it blank.</p>
        <input class="field" id="reader-name" type="text" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Your first name" aria-label="Your first name">
        <button class="btn btn-gold btn-big" data-act="done">Open the library</button>${pager()}`;
    }
    inner.scrollTop = 0;
  }

  paint();
}
