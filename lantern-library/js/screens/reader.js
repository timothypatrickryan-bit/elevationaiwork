// Reading a chapter: a short introduction, the story itself, six questions
// with feedback that points back into the text, then the lantern lights.

import { BOOKS, WORDS, findChapter } from '../content/index.js';
import { skillById } from '../content/skills.js';
import { blockOf, unitsOf, passageUnits, unitsMatching, wordCount } from '../text.js';
import { S, change, isDone, starsOf, finishChapter, collectWord, bookUnlocked, chapterUnlocked } from '../store.js';
import { icon, lantern, glim, stars, badgeArt } from '../art.js';
import { sfx, canSpeak, speakUnits, stopSpeaking, sayWord } from '../audio.js';
import { mount, esc, rich, pick, toast, openPopover, closePopover, burstFrom, wordCardHtml, partLabel } from '../ui.js';
import { makeWidget, howTo } from '../questions.js';
import { go } from '../nav.js';

const SIZES = [18, 21, 24, 27];
const TINTS = ['paper', 'sand', 'night'];

const HEADS = {
  first: ['Yes. You proved it.', 'Spot on.', 'Exactly right.', 'You read that closely.', 'That’s the spark!'],
  second: ['Got it on the second look.', 'There it is. Good rethinking.', 'Going back to the story worked.'],
  missed: ['Here’s how it works.', 'Let’s look at this one together.'],
  retry: ['Not yet.', 'Almost. Look again.', 'Not quite. One more try.'],
};

export function open(app, params) {
  const found = findChapter(params.chapterId);
  if (!found) return go('home');
  const { chapter, book, bookIndex, index } = found;
  const isPoem = chapter.format === 'poem';
  const units = passageUnits(chapter.text);
  const total = chapter.questions.length;
  const replay = isDone(chapter.id);
  const label = partLabel(book, index);
  const minSecs = Math.max(8, Math.min(25, Math.round(wordCount(chapter.text) / 12)));

  const saved = S().session;
  const session =
    params.resume && saved && saved.chapterId === chapter.id
      ? { chapterId: chapter.id, phase: saved.phase, q: saved.q, results: saved.results.slice(), readSecs: saved.readSecs, totalSecs: saved.totalSecs }
      : { chapterId: chapter.id, phase: 'intro', q: 0, results: [], readSecs: 0, totalSecs: 0 };

  let phase = session.phase;
  let widget = null;
  let tries = 0;
  let endSeen = false;
  let speaking = false;
  let watcher = null;

  const glimHtml = (mood, cls = '') => glim({ glow: S().glim.glow, wear: S().glim.wear, mood, cls });

  // ------------------------------------------------------------ passage ----

  function markWords(text, pending) {
    let out = text;
    pending.forEach((w, key) => {
      const surface = (w.in || w.word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exact = new RegExp('(^|[^A-Za-z\u0001-\u0003])(' + surface + ')(?![A-Za-z])');
      const loose = new RegExp(exact.source, 'i');
      const m = exact.exec(out) || loose.exec(out);
      if (!m) return;
      const at = m.index + m[1].length;
      out = out.slice(0, at) + '\u0001' + key + '\u0002' + m[2] + '\u0003' + out.slice(at + m[2].length);
      pending.delete(key);
    });
    return rich(out).replace(/\u0001([^\u0002]+)\u0002([^\u0003]+)\u0003/g, (_, key, shown) => {
      const got = S().words[key] ? ' is-got' : '';
      return `<span class="pw${got}" role="button" tabindex="0" data-word="${esc(key)}">${shown}</span>`;
    });
  }

  function passageHtml() {
    const pending = new Map(chapter.words.map((w) => [w.word.toLowerCase(), w]));
    let dropCap = !isPoem;
    const body = chapter.text
      .map((block, bi) => {
        const b = blockOf(block);
        if (b.as === 'heading') {
          return `<h3 class="b b-heading" data-b="${bi}">${rich(b.text)}${b.sub ? `<small>${rich(b.sub)}</small>` : ''}</h3>`;
        }
        const spans = unitsOf(block).map((text, ui) => `<span class="u" data-u="${bi}.${ui}">${markWords(text, pending)}</span>`);
        const cls = ['b', 'b-' + b.as];
        if (b.as === 'p' && dropCap) {
          cls.push('b-first');
          dropCap = false;
        }
        return `<p class="${cls.join(' ')}" data-b="${bi}">${spans.join(b.as === 'verse' ? '' : ' ')}</p>`;
      })
      .join('');
    return `<article class="passage${isPoem ? ' poem' : ''}">
      <p class="passage-kicker">${esc(book.title)} · ${label}</p>
      <h2 class="passage-title">${esc(chapter.title)}</h2>
      ${chapter.credit ? `<p class="passage-credit">${esc(chapter.credit)}</p>` : ''}
      <div class="passage-rule"></div>
      ${body}
      <p class="passage-end">The end</p>
    </article>`;
  }

  // -------------------------------------------------------------- shell ----

  const handlers = {
    exit() {
      stopListening();
      if (phase === 'read' || phase === 'quiz') {
        saveSession();
        toast('Your place is saved.', 'book');
      }
      go('book', { id: book.id });
    },
    word(target) {
      showWord(target, target.dataset.word);
    },
    start() {
      sfx('tap');
      setPhase('read');
      saveSession();
    },
    ready() {
      sfx('tap');
      stopListening();
      session.q = 0;
      session.results = [];
      setPhase('quiz');
      saveSession();
    },
    check() {
      const verdict = widget.check();
      tries++;
      if (verdict.ok) return settle(tries === 1 ? 'first' : 'second');
      if (tries === 1) return tryAgain(verdict);
      settle('missed');
    },
    next() {
      sfx('tap');
      if (session.q + 1 < total) {
        session.q++;
        saveSession();
        askQuestion();
      } else finish();
    },
    listen(target) {
      if (speaking) return stopListening();
      startListening(target);
    },
    type(target) {
      const st = S().settings;
      openPopover(
        target,
        `<div class="typebox-row"><b>Text size</b><span class="stepper">
            <button class="icon-btn" data-act="smaller" aria-label="Smaller text">${icon('minus')}</button>
            <output>Aa</output>
            <button class="icon-btn" data-act="bigger" aria-label="Bigger text">${icon('plus')}</button></span></div>
         <div class="typebox-row"><b>Page color</b><span class="tints">${TINTS.map(
           (t) => `<button class="tint" data-act="tint" data-tint="${t}" aria-pressed="${t === st.tint}" aria-label="${t} page"></button>`
         ).join('')}</span></div>`,
        {
          smaller: () => resize(-1),
          bigger: () => resize(1),
          tint(b, _, pop) {
            change((s) => (s.settings.tint = b.dataset.tint));
            el.dataset.tint = b.dataset.tint;
            pop.querySelectorAll('.tint').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
          },
        },
        { cls: 'typebox' }
      );
    },
    again() {
      go('reader', { chapterId: chapter.id });
    },
    'next-chapter'() {
      go('reader', { chapterId: book.chapters[index + 1].id });
    },
    'to-book'() {
      go('book', { id: book.id });
    },
    'to-home'() {
      go('home');
    },
  };

  const showListen = canSpeak() && S().settings.voice;
  const el = mount(
    app,
    'reader',
    `<header class="reader-bar">
      <button class="icon-btn" data-act="exit" aria-label="Leave this chapter">${icon('back')}</button>
      <div class="reader-title"><span>${esc(book.title)} · ${label}</span><strong>${esc(chapter.title)}</strong></div>
      <div class="reader-tools">
        ${showListen ? `<button class="tool" data-act="listen" aria-pressed="false">${icon('speaker')}<span>Listen</span></button>` : ''}
        <button class="tool" data-act="type" aria-haspopup="dialog" aria-label="Text size and page color">${icon('text')}<span>Text</span></button>
      </div>
    </header>
    <div class="reader-body">
      <section class="page" aria-label="The story">${passageHtml()}</section>
      <aside class="panel"></aside>
    </div>`,
    handlers
  );
  el.dataset.hue = book.hue;
  el.dataset.tint = S().settings.tint;
  el.style.setProperty('--read-size', SIZES[S().settings.size] + 'px');

  const page = el.querySelector('.page');
  const panel = el.querySelector('.panel');

  page.addEventListener('click', (event) => {
    const pw = event.target.closest('.pw');
    if (pw && !page.classList.contains('picking')) showWord(pw, pw.dataset.word);
  });
  page.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('pw')) {
      event.preventDefault();
      showWord(event.target, event.target.dataset.word);
    }
  });
  page.addEventListener('scroll', closePopover, { passive: true });

  function resize(step) {
    const next = Math.max(0, Math.min(SIZES.length - 1, S().settings.size + step));
    change((s) => (s.settings.size = next));
    el.style.setProperty('--read-size', SIZES[next] + 'px');
  }

  function showWord(target, key) {
    const w = WORDS.get(String(key).toLowerCase());
    if (!w) return;
    const fresh = collectWord(w.word);
    if (fresh) sfx('catch');
    else sfx('tap');
    page.querySelectorAll(`.pw[data-word="${w.key}"]`).forEach((x) => x.classList.add('is-got'));
    const extra = fresh
      ? `<span class="wordsheet-got">${icon('spark')} Caught! It’s in your Firefly Jar.</span>`
      : `<span class="wordsheet-from">${icon('jar')} In your Firefly Jar</span>`;
    openPopover(target, wordCardHtml(w, extra, canSpeak()), { say: () => sayWord(w.word) });
  }

  function saveSession() {
    change((s) => {
      s.session = { chapterId: chapter.id, phase, q: session.q, results: session.results.slice(), readSecs: session.readSecs, totalSecs: session.totalSecs };
      s.lastBook = book.id;
    });
  }

  // An iPad dims after a couple of minutes without a touch, which is about how
  // long a page takes to read. Ask it to stay awake while a chapter is open.
  let wakeLock = null;
  const stayAwake = () => {
    try {
      if (!navigator.wakeLock || document.visibilityState !== 'visible') return;
      navigator.wakeLock.request('screen').then(
        (lock) => {
          wakeLock = lock;
        },
        () => {}
      );
    } catch (e) {
      /* not supported here; nothing to do */
    }
  };
  document.addEventListener('visibilitychange', stayAwake);
  stayAwake();

  // Counts seconds only while the game is actually on screen.
  const clock = window.setInterval(() => {
    if (document.visibilityState !== 'visible' || phase === 'done' || phase === 'intro') return;
    session.totalSecs++;
    if (phase === 'read') {
      session.readSecs = Math.min(session.readSecs + 1, 900);
      updateReady();
    }
  }, 1000);

  // ------------------------------------------------------------- phases ----

  function setPhase(next) {
    phase = next;
    el.dataset.phase = next;
    closePopover();
    if (next === 'intro') showIntro();
    if (next === 'read') showRead();
    if (next === 'quiz') askQuestion();
  }

  function showIntro() {
    panel.innerHTML = `<div class="intro">
      ${lantern(starsOf(chapter.id))}
      <p class="eyebrow">${esc(book.title)} · ${label}</p>
      <h1 class="display">${esc(chapter.title)}</h1>
      <p class="intro-teaser">${rich(chapter.teaser)}</p>
      <div class="intro-words"><h2>Words to watch for</h2>
        <div class="wordchips">${chapter.words.map((w) => `<button class="wordchip" data-act="word" data-word="${esc(w.word.toLowerCase())}">${esc(w.word)}</button>`).join('')}</div>
      </div>
      <button class="btn btn-gold btn-big" data-act="start">${replay ? 'Read it again' : 'Start reading'}</button>
      <p class="intro-tip">In the story, tap an underlined word to see what it means.</p>
    </div>`;
  }

  function showRead() {
    panel.innerHTML = `<div class="readside">
      <div class="readside-glim">${glimHtml('smile')}</div>
      <p class="bubble">${
        replay
          ? 'Good to see this one again. Read it through, then try for more stars.'
          : `Take your time. When you reach the end, I’ll have ${total} questions for you.`
      }</p>
      <button class="btn btn-gold btn-big" data-act="ready" disabled>I’m ready</button>
      <p class="readside-note"></p>
    </div>`;
    page.scrollTop = 0;
    const end = page.querySelector('.passage-end');
    if ('IntersectionObserver' in window) {
      if (watcher) watcher.disconnect();
      watcher = new window.IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            endSeen = true;
            updateReady();
          }
        },
        { root: page, threshold: 0.5 }
      );
      watcher.observe(end);
    } else endSeen = true;
    updateReady();
  }

  function updateReady() {
    const button = panel.querySelector('[data-act="ready"]');
    if (!button) return;
    const open = endSeen && (replay || session.readSecs >= minSecs);
    const waiting = endSeen && !open;
    button.disabled = !open;
    button.classList.toggle('ready-wait', waiting);
    button.style.setProperty('--wait', waiting ? Math.min(1, session.readSecs / minSecs).toFixed(2) : '0');
    panel.querySelector('.readside-note').textContent = open ? '' : waiting ? 'Glim is getting your questions ready…' : 'Read to the end of the story first.';
  }

  // ---------------------------------------------------------- questions ----

  const quotesOf = (q) => q.evidence || (q.type === 'evidence' ? q.answer : []);
  const proofIds = (q) => {
    const ids = [];
    for (const quote of quotesOf(q)) for (const id of unitsMatching(units, quote)) if (!ids.includes(id)) ids.push(id);
    return ids;
  };

  function clearMarks() {
    page.querySelectorAll('.is-evidence, .is-hint').forEach((x) => x.classList.remove('is-evidence', 'is-hint'));
  }

  function bringIntoView(node) {
    if (!node) return;
    const top = node.offsetTop;
    const bottom = top + node.offsetHeight;
    if (top < page.scrollTop + 24 || bottom > page.scrollTop + page.clientHeight - 48) {
      const to = Math.max(0, top - page.clientHeight * 0.3);
      if (page.scrollTo) page.scrollTo({ top: to, behavior: 'smooth' });
      else page.scrollTop = to;
    }
  }

  function dotsHtml(now) {
    let out = '';
    for (let i = 0; i < total; i++) {
      const r = session.results[i];
      out += `<i class="dot${r ? ' is-' + r : i === now ? ' is-now' : ''}"></i>`;
    }
    return out + `<span class="dots-count">${now + 1} of ${total}</span>`;
  }

  function askQuestion() {
    if (widget) widget.destroy();
    clearMarks();
    tries = 0;
    const q = chapter.questions[session.q];
    const skill = skillById(q.skill);
    const how = howTo(q, isPoem);
    widget = makeWidget(q, {
      page,
      units,
      poem: isPoem,
      changed: () => {
        const b = panel.querySelector('[data-act="check"]');
        if (b) b.disabled = !widget.ready();
      },
    });
    panel.innerHTML = `<div class="quiz">
      <div class="dots" role="img" aria-label="Question ${session.q + 1} of ${total}">${dotsHtml(session.q)}</div>
      <p class="skill"><b>${esc(skill.name)}</b> · ${esc(skill.kid)}</p>
      <h2 class="prompt">${rich(q.q)}</h2>
      <div class="feedback-slot" aria-live="polite"></div>
      ${how ? `<p class="widget-note">${how}</p>` : ''}
      <div class="widget">${widget.html}</div>
      <div class="quiz-actions"><button class="btn btn-gold btn-big" data-act="check" disabled>Check</button></div>
    </div>`;
    widget.mount(panel.querySelector('.widget'));
    panel.scrollTop = 0;
  }

  function feedbackHtml(kind, body) {
    const cls = kind === 'retry' ? 'is-retry' : kind === 'missed' ? 'is-missed' : 'is-right';
    const mood = kind === 'retry' ? 'think' : kind === 'missed' ? 'smile' : 'cheer';
    return `<div class="feedback ${cls}">
      <div class="feedback-head"><span class="feedback-face">${glimHtml(mood, kind === 'retry' || kind === 'missed' ? 'glim-still' : 'is-cheer')}</span><span>${esc(pick(HEADS[kind]))}</span></div>
      ${body}
    </div>`;
  }

  function panelToTop() {
    if (panel.scrollTo) panel.scrollTo({ top: 0, behavior: 'smooth' });
    else panel.scrollTop = 0;
  }

  function tryAgain(verdict) {
    const q = chapter.questions[session.q];
    sfx('almost');
    widget.afterMiss();
    panel.querySelector('[data-act="check"]').disabled = true;
    clearMarks();
    const blocks = [];
    for (const id of proofIds(q)) {
      const b = id.split('.')[0];
      if (!blocks.includes(b)) blocks.push(b);
    }
    let tip = 'Think about the whole story, then try once more.';
    if (blocks.length) {
      blocks.forEach((b) => page.querySelector(`.b[data-b="${b}"]`).classList.add('is-hint'));
      bringIntoView(page.querySelector(`.b[data-b="${blocks[0]}"]`));
      tip = q.type === 'evidence' ? 'It is somewhere in the part of the story I’ve marked.' : 'Reread the part of the story I’ve marked, then try once more.';
    }
    panel.querySelector('.feedback-slot').innerHTML = feedbackHtml('retry', `<p class="why">${esc([verdict.note, tip].filter(Boolean).join(' '))}</p>`);
    panelToTop();
  }

  function settle(result) {
    const q = chapter.questions[session.q];
    session.results[session.q] = result;
    saveSession();
    widget.reveal();
    clearMarks();
    const ids = proofIds(q);
    ids.forEach((id) => page.querySelector(`.u[data-u="${id}"]`).classList.add('is-evidence'));
    if (ids.length) bringIntoView(page.querySelector(`.u[data-u="${ids[0]}"]`));
    sfx(result === 'missed' ? 'almost' : 'right');
    const last = session.q + 1 >= total;
    const body = `<p class="why"><span class="why-label">${result === 'missed' ? 'The answer' : 'Why'}</span>${rich(q.why)}</p>
      ${ids.length ? `<p class="feedback-look">${icon('book')} The proof is glowing in the story.</p>` : ''}`;
    panel.querySelector('.feedback-slot').innerHTML = feedbackHtml(result, body);
    panel.querySelector('.quiz-actions').innerHTML = `<button class="btn btn-gold btn-big" data-act="next">${last ? 'Light the lantern' : 'Next question'}</button>`;
    panel.querySelector('.dots').innerHTML = dotsHtml(session.q);
    const how = panel.querySelector('.quiz > .widget-note');
    if (how) how.hidden = true;
    panelToTop();
    if (result !== 'missed') burstFrom(panel.querySelector('.feedback-face'), 8);
  }

  // ------------------------------------------------------------- finish ----

  function finish() {
    stopListening();
    if (widget) widget.destroy();
    widget = null;
    clearMarks();
    const wasOpen = BOOKS.map((_, bi) => bookUnlocked(bi));
    const result = finishChapter({ chapterId: chapter.id, results: session.results.slice(), readSecs: session.readSecs, totalSecs: session.totalSecs });
    const opened = BOOKS.filter((_, bi) => !wasOpen[bi] && bookUnlocked(bi));
    phase = 'done';
    el.dataset.phase = 'done';

    const nextChapter = book.chapters[index + 1];
    const canGoOn = nextChapter && chapterUnlocked(bookIndex, index + 1);
    const eyebrow = result.firstTime ? 'Lantern lit' : result.improved ? 'Brighter than before' : 'Read again';
    const line =
      result.firstTry === result.total
        ? `All ${result.total} right on the first try.`
        : `${result.firstTry} of ${result.total} right on the first try.`;

    const boxes = [];
    boxes.push(`<div class="box"><h2>${icon('spark')} Sparks</h2><ul class="tally">
      ${result.lines.map((l) => `<li><span>${esc(l.label)}</span><b>+${l.amount}</b></li>`).join('')}
      <li class="tally-total"><span>Earned</span><b>${icon('spark')} ${result.sparks}</b></li></ul></div>`);
    boxes.push(`<div class="box"><h2>${icon('jar')} ${result.newWords.length ? 'New in your Firefly Jar' : 'Words from this chapter'}</h2>
      <div class="wordchips">${chapter.words.map((w) => `<button class="wordchip" data-act="word" data-word="${esc(w.word.toLowerCase())}">${esc(w.word)}</button>`).join('')}</div></div>`);
    if (result.badges.length || opened.length) {
      boxes.push(`<div class="box box-wide"><h2>${icon('badge')} Just earned</h2>
        ${result.badges.map((b) => `<div class="earned"><span class="medal">${badgeArt(b.art)}</span><div><b>${esc(b.name)}</b><span>${esc(b.how)}</span></div></div>`).join('')}
        ${opened.map((b) => `<div class="earned"><span class="medal">${icon('book')}</span><div><b>New book: ${esc(b.title)}</b><span>It is waiting on the shelf.</span></div></div>`).join('')}
      </div>`);
    }
    boxes.push(`<div class="box box-wide talk"><h2>${icon('chat')} Talk about it</h2><p>${rich(chapter.talk)}</p></div>`);

    panel.innerHTML = `<div class="results">
      <div class="results-lantern">${lantern(result.stars)}</div>
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="display">${esc(chapter.title)}</h1>
      <div class="results-stars">${stars(result.stars)}</div>
      <p class="results-line">${line}${result.stars < 3 ? ' Reread it any time to make this lantern brighter.' : ''}</p>
      <div class="results-grid">${boxes.join('')}</div>
      ${chapter.next && canGoOn ? `<p class="results-next">${rich(chapter.next)}</p>` : ''}
      <div class="results-actions">
        ${canGoOn ? `<button class="btn btn-gold btn-big" data-act="next-chapter">Next ${book.kind === 'fiction' ? 'chapter' : 'part'}</button>` : `<button class="btn btn-gold btn-big" data-act="to-home">Back to the library</button>`}
        <button class="btn btn-ghost" data-act="to-book">${esc(book.title)}</button>
        ${result.bestStars < 3 ? `<button class="btn btn-ghost" data-act="again">${icon('again')} Read again</button>` : ''}
      </div>
    </div>`;
    panel.scrollTop = 0;
    sfx('lantern');
    window.setTimeout(() => burstFrom(panel.querySelector('.results-lantern'), 18), 250);
    for (let i = 0; i < result.stars; i++) window.setTimeout(() => phase === 'done' && sfx('star'), 900 + i * 300);
  }

  // -------------------------------------------------------------- voice ----

  function startListening(button) {
    const all = Array.from(page.querySelectorAll('.u'));
    let from = all.findIndex((u) => u.offsetTop + u.offsetHeight > page.scrollTop + 8);
    if (from < 0) from = 0;
    speaking = true;
    button.setAttribute('aria-pressed', 'true');
    button.innerHTML = icon('stop') + '<span>Stop</span>';
    speakUnits(
      units.slice(from),
      (id) => {
        page.querySelectorAll('.is-speaking').forEach((x) => x.classList.remove('is-speaking'));
        const node = page.querySelector(`.u[data-u="${id}"]`);
        if (node) {
          node.classList.add('is-speaking');
          bringIntoView(node);
        }
      },
      (finished) => {
        resetListen();
        if (!finished) toast('Read-aloud is not available right now.', 'speaker');
      }
    );
  }

  function resetListen() {
    speaking = false;
    page.querySelectorAll('.is-speaking').forEach((x) => x.classList.remove('is-speaking'));
    const button = el.querySelector('[data-act="listen"]');
    if (button) {
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = icon('speaker') + '<span>Listen</span>';
    }
  }

  function stopListening() {
    stopSpeaking();
    if (speaking) resetListen();
  }

  // --------------------------------------------------------------- go ----

  el.dataset.phase = phase;
  if (phase === 'quiz') {
    // Coming back to a half-finished chapter: skip ahead to the next unanswered question.
    session.q = Math.min(session.results.length, total - 1);
    if (session.results.length >= total) finish();
    else askQuestion();
  } else setPhase(phase);

  return {
    leave() {
      window.clearInterval(clock);
      document.removeEventListener('visibilitychange', stayAwake);
      if (wakeLock) wakeLock.release().catch(() => {});
      stopSpeaking();
      if (watcher) watcher.disconnect();
      if (widget) widget.destroy();
    },
  };
}
