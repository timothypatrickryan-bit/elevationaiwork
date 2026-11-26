// Hear a word, spell it. The heart of the game.
//
// A miss is never the end of a word. The steps after a wrong try follow what
// works for children who find spelling hard:
//   1. first try, from sound and meaning alone
//   2. a second try, with the letters she already had right kept as a hint
//   3. the word is shown with its tricky part colored, then hidden, and she
//      writes it from memory (look, cover, write, check)
//   4. if that still goes wrong she copies it with the word in view
// Whatever happens, she finishes every word by producing it correctly.

import { compare, describeMiss, fullSentence } from '../words.js';
import { sfx, speechOn, sayWord, saySentence, sayWordInSentence, stopSpeaking } from '../audio.js';
import { recordSpelling, change } from '../store.js';
import { createKeyboard } from '../keyboard.js';
import { pick, rich, burstFrom, ask } from '../ui.js';
import { frame, tiles, typedTiles, studyTiles, clozeHtml, toolButton, fizzle, petName } from './parts.js';

const PRAISE_FIRST = ['Perfect cast!', 'Spot on!', 'That spell worked!', 'Exactly right!', 'Clean as a whistle!'];
const PRAISE_FIXED = ['Fizzle fixed!', 'Fixed it. Nice repair!', 'The second look did it!'];

// If the voice fails twice in a row, stop trying until the game is reloaded.
let voiceFailures = 0;

export function dictation(host, { word, quick = false, onDone }) {
  const target = word.key;
  const spoken = fullSentence(word.sentence, target);
  const f = frame(host, 'act-dictation');
  const attempts = [];
  let typed = '';
  // try1 | fizzled | try2 | study | copy | trace | done
  let stage = 'try1';
  let credit = '';
  let marks = null; // the last wrong try, lined up with the right spelling
  let kept = null; // which letters of the word she already had
  let flashing = false;
  let fx = '';
  let timer = 0;
  let gone = false;
  let voice = speechOn() && voiceFailures < 2;

  const kb = createKeyboard({
    onKey(k) {
      if (flashing || stage === 'done' || stage === 'study') return;
      if (stage === 'fizzled') nextStep();
      if (typed.length >= target.length + 4) return;
      typed += k;
      marks = null;
      sfx('key');
      paint();
    },
    onBack() {
      if (flashing || stage === 'done' || stage === 'study' || stage === 'fizzled') return;
      typed = typed.slice(0, -1);
      marks = null;
      sfx('back');
      paint();
    },
    onEnter: () => nextStep(),
  });
  f.kb.appendChild(kb.el);

  function markedRow(m) {
    const items = [];
    m.marks.forEach((mark, i) => {
      if (m.gaps[i]) items.push({ ch: '', cls: 'is-missing' });
      items.push({ ch: mark.ch, cls: mark.ok ? 'is-ok' : 'is-bad' });
    });
    if (m.gaps[m.marks.length]) items.push({ ch: '', cls: 'is-missing' });
    return tiles(items, 'tiles-marked');
  }

  function paint() {
    let html = '';
    if (flashing || stage === 'study') html = studyTiles(word, 'is-big');
    else if (stage === 'done') {
      if (credit === 'missed' && quick && marks) html += markedRow(marks) + '<p class="stage-label">It goes like this:</p>';
      html += studyTiles(word, 'is-right');
    } else if (stage === 'fizzled') html = markedRow(marks);
    else {
      if (stage === 'trace') html += `<p class="stage-label">Copy it carefully:</p>${studyTiles(word, 'is-model')}`;
      if (stage === 'try2' && kept) {
        html += `<p class="stage-label">The letters you had right:</p>${tiles(
          Array.from(target).map((ch, i) => (kept[i] ? { ch, cls: 'is-ghost' } : { ch: '', cls: 'is-ghost is-unknown' })),
          'tiles-hint'
        )}`;
      }
      html += marks ? markedRow(marks) : typedTiles(typed);
    }
    f.stage.innerHTML = html;
    f.cloze.innerHTML = clozeHtml(word.sentence, stage === 'done' ? target : '');
    const typing = stage === 'try1' || stage === 'try2' || stage === 'copy' || stage === 'trace';
    if (typing) f.enableGo(typed.length > 0 && !flashing);
    kb.setEnabled(typing && !flashing);
  }

  function tools() {
    f.tools.innerHTML = voice
      ? toolButton('word', 'speaker', 'Word') + toolButton('sentence', 'chat', 'Sentence') + toolButton('slow', 'slow', 'Slowly') + '<button class="tool tool-quiet" data-tool="nohear">Can’t hear?</button>'
      : toolButton('peek', 'eye', 'Show me again');
  }

  // No voice: show the word for a moment, then hide it (look, cover, write).
  function flash() {
    window.clearTimeout(timer);
    flashing = true;
    typed = '';
    marks = null;
    f.setLine('Look closely…');
    paint();
    timer = window.setTimeout(() => {
      flashing = false;
      f.setLine('Now spell it.');
      paint();
    }, 2300);
  }

  function hear(what) {
    const job = what === 'sentence' ? saySentence(spoken) : what === 'slow' ? sayWord(target, true) : what === 'all' ? sayWordInSentence(target, spoken) : sayWord(target);
    job.then((result) => {
      if (gone) return;
      if (result === 'spoken') voiceFailures = 0;
      if (result !== 'silent') return;
      // The device stayed silent. Carry on by showing the word instead.
      voiceFailures++;
      voice = false;
      tools();
      if (stage === 'try1' && !typed) {
        f.setNote('I can’t say the word right now, so I’ll show it to you instead.');
        flash();
      }
    });
  }

  // A way out when the voice is on but she cannot hear it (volume down, or a
  // device that claims to speak and does not).
  function cantHear() {
    stopSpeaking();
    ask({
      title: 'Can’t hear the word?',
      body: 'Check that the volume is turned up. If there is still no voice, I can show you each word for a moment instead.',
      yes: 'Show me the words',
      no: 'Try the voice again',
    }).then((showInstead) => {
      if (gone) return;
      if (!showInstead) return hear(stage === 'done' ? 'word' : 'all');
      change((st) => {
        st.settings.speak = false;
      });
      voice = false;
      tools();
      if (stage === 'try1' || stage === 'try2') flash();
    });
  }

  function succeed() {
    const hadFizzle = !!fx;
    fx = '';
    stage = 'done';
    marks = null;
    f.setPet('cheer');
    f.setLine(credit === 'first' ? 'You heard it, you spelled it.' : 'That is the right spelling.');
    if (credit === 'first') f.setNote(`<b>${pick(PRAISE_FIRST)}</b>`, 'right');
    else if (credit === 'second') f.setNote(`<b>${pick(PRAISE_FIXED)}</b>${hadFizzle ? ` ${petName()} is back to normal.` : ''}`, 'right');
    else f.setNote(`<b>That’s the one.</b> It will come back soon so it sticks.${word.tip ? ` <span class="tip">${rich(word.tip)}</span>` : ''}`, 'right');
    f.setGo('Next');
    sfx(credit === 'first' ? 'right' : 'fixed');
    paint();
    burstFrom(f.stage.querySelector('.tiles'), credit === 'first' ? 16 : 10);
  }

  function check() {
    const attempt = typed;
    attempts.push(attempt);
    if (attempt === target) {
      if (stage === 'try1') credit = 'first';
      else if (stage === 'try2') credit = 'second';
      if (stage === 'try1' || stage === 'try2') recordSpelling(target, credit, attempts);
      return succeed();
    }
    const result = compare(target, attempt);
    marks = result;
    sfx('fizzle');

    if (stage === 'try1' && quick) {
      // The quick check gives one try, shows the answer and moves on.
      credit = 'missed';
      recordSpelling(target, credit, attempts);
      stage = 'done';
      f.setPet('think');
      f.setLine('Not this time.');
      f.setNote('This one goes in the jar to learn.', 'miss');
      f.setGo('Next');
      return paint();
    }
    if (stage === 'try1') {
      const z = fizzle();
      fx = z.fx;
      kept = result.kept;
      stage = 'fizzled';
      f.setPet('oops', fx);
      f.setLine('Not quite yet.');
      f.setNote(`<b>Fizzle!</b> ${z.line} ${describeMiss(target, attempt) || 'The green letters are right.'}`, 'fizzle');
      f.setGo('Try again');
      burstFrom(f.pet, 10, 'is-smoke');
      return paint();
    }
    if (stage === 'try2') {
      credit = 'missed';
      recordSpelling(target, credit, attempts);
      stage = 'study';
      marks = null;
      f.setPet('think', fx);
      f.setLine('Here is how it goes. Look hard at the colored part.');
      f.setNote(word.tip ? `<span class="tip">${rich(word.tip)}</span>` : 'Say it slowly, one beat at a time.', 'study');
      f.setGo('Hide it. I’m ready.');
      if (voice) hear('word');
      return paint();
    }
    if (stage === 'copy') {
      stage = 'trace';
      typed = '';
      marks = null;
      f.setLine('No problem. Copy it this time.');
      f.setNote('Match it letter by letter.', 'study');
      f.setGo('Cast');
      return paint();
    }
    // trace: keep what she typed so she can fix it
    f.setNote('Not matching yet. Check each letter against the word above.', 'study');
    paint();
  }

  // The big button, and the Enter key.
  function nextStep() {
    if (gone || flashing || !f.goReady()) return;
    if (stage === 'done') {
      destroy();
      return onDone({ credit, attempts });
    }
    if (stage === 'fizzled') {
      stage = 'try2';
      typed = '';
      marks = null;
      f.setLine('Try once more.');
      f.setNote('');
      f.setGo('Cast', false);
      return paint();
    }
    if (stage === 'study') {
      stage = 'copy';
      typed = '';
      f.setLine('Now write it from memory.');
      f.setNote('');
      f.setGo('Cast', false);
      return paint();
    }
    if (typed) check();
  }

  function onClick(event) {
    const tool = event.target.closest('[data-tool]');
    if (tool) {
      sfx('tap');
      if (tool.dataset.tool === 'peek') {
        if (stage === 'try1' || stage === 'try2') flash();
      } else if (tool.dataset.tool === 'nohear') cantHear();
      else hear(tool.dataset.tool);
      return;
    }
    if (event.target.closest('[data-go]')) nextStep();
  }
  host.addEventListener('click', onClick);

  function destroy() {
    if (gone) return;
    gone = true;
    window.clearTimeout(timer);
    host.removeEventListener('click', onClick);
    kb.destroy();
    stopSpeaking();
  }

  // ---- start
  tools();
  f.setLine(voice ? 'Listen, then spell the word.' : 'Look, remember, then spell it.');
  f.setGo('Cast', false);
  paint();
  if (voice) hear('all');
  else flash();

  return { destroy };
}
