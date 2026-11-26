// A practice sitting: the frame around a run of activities, with a title, a
// progress bar and a way out. Jars and reviews both use it.

import { icon } from './art.js';
import { sfx } from './audio.js';
import { mount, esc, ask } from './ui.js';

const PANEL_GUARD = 350; // milliseconds a new panel ignores presses, against double taps

// leave: { title, body, yes, no } is the question asked when she taps the back
// arrow while guard(true) is in force, so a stray tap cannot throw away a lesson.
export function createSession(app, { title, sub, hue, onExit, leave }) {
  let current = null;
  let guarded = false;
  let asking = false;
  const el = mount(
    app,
    'session',
    `<header class="topbar">
      <button class="icon-btn" data-act="back" aria-label="Leave">${icon('back')}</button>
      <div class="session-title"><span>${esc(sub)}</span><strong>${esc(title)}</strong></div>
      <div class="session-meter"><span class="session-step"></span><div class="pbar" aria-hidden="true"><i></i></div></div>
    </header>
    <main class="session-main"></main>`,
    {
      back() {
        sfx('tap');
        if (!guarded || !leave) return onExit();
        if (asking) return;
        asking = true;
        ask(leave).then((yes) => {
          asking = false;
          if (yes) onExit();
        });
      },
    }
  );
  if (hue) el.dataset.hue = hue;
  const main = el.querySelector('.session-main');
  const bar = el.querySelector('.pbar i');
  const step = el.querySelector('.session-step');

  const stop = () => {
    if (current && current.destroy) current.destroy();
    current = null;
  };

  return {
    el,
    main,
    // While true, leaving asks first.
    guard(value) {
      guarded = value;
    },
    // label = "Quick check", done/total fill the bar
    progress(label, done, total) {
      step.textContent = total ? `${label} · ${Math.min(done + 1, total)} of ${total}` : label;
      bar.style.transform = `scaleX(${total ? done / total : 0})`;
      el.querySelector('.pbar').hidden = !total;
    },
    // Runs one activity and resolves with its result.
    run(activity, opts) {
      stop();
      main.className = 'session-main is-activity';
      return new Promise((resolve) => {
        current = activity(main, {
          ...opts,
          onDone(result) {
            current = null;
            resolve(result);
          },
        });
      });
    },
    // Shows a plain panel (an introduction, a rule, results) and resolves with
    // the data-go value of whichever button is tapped.
    panel(html) {
      stop();
      main.className = 'session-main is-panel';
      main.innerHTML = `<div class="panel is-fresh">${html}</div>`;
      main.scrollTop = 0;
      const panel = main.querySelector('.panel');
      const timer = window.setTimeout(() => panel.classList.remove('is-fresh'), PANEL_GUARD);
      return new Promise((resolve) => {
        const onClick = (event) => {
          const b = event.target.closest('[data-go]');
          if (!b || b.disabled || panel.classList.contains('is-fresh')) return;
          main.removeEventListener('click', onClick);
          document.removeEventListener('keydown', onKey);
          sfx('tap');
          resolve(b.dataset.go || 'go');
        };
        const onKey = (event) => {
          if (event.key !== 'Enter' || document.querySelector('.backdrop')) return;
          const b = main.querySelector('[data-go]');
          if (!b) return;
          event.preventDefault();
          b.click();
        };
        main.addEventListener('click', onClick);
        document.addEventListener('keydown', onKey);
        current = {
          destroy() {
            window.clearTimeout(timer);
            main.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onKey);
          },
        };
      });
    },
    destroy: stop,
  };
}
