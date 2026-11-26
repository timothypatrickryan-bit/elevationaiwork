// The grown-ups' page: how spelling is going, which words need work, settings,
// backup and reset. Everything shown is worked out from the save on this device.

import { SHELVES, UNITS, WORDS, TOTAL_UNITS, TOTAL_WORDS, findUnit, wordsOf } from '../content/index.js';
import { S, change, canSave, dayKey, streakNow, jarsFilled, masteredCount, metCount, starsOf, shelfProgress, troubleWords, glowOf, MASTERED_BOX, exportCode, importCode, resetAll } from '../store.js';
import { icon, stars } from '../art.js';
import { sfx, speak, speechSupported } from '../audio.js';
import { mount, esc, rich, topbar, toast, ask, shortDate, plural } from '../ui.js';
import { pretty } from '../words.js';
import { go } from '../nav.js';

const DAY = 24 * 60 * 60 * 1000;
const minutes = (secs) => Math.round(secs / 60);
const GLOW_NAMES = ['Not asked yet', 'Learning', 'Getting stronger', 'Mastered'];

function niceMax(value) {
  const steps = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];
  return steps.find((s) => s >= value) || Math.ceil(value / 60) * 60;
}

// The word with its tricky letters marked, as text rather than tiles.
function marked(word) {
  let out = '';
  let at = 0;
  for (const g of word.groups) {
    out += esc(pretty(word.key.slice(at, g.from))) + `<b class="hl">${esc(pretty(word.key.slice(g.from, g.to)))}</b>`;
    at = g.to;
  }
  return out + esc(pretty(word.key.slice(at)));
}

function totals(st) {
  let seen = 0;
  let first = 0;
  for (const key of Object.keys(st.words)) {
    if (!WORDS.has(key)) continue;
    seen += st.words[key].seen;
    first += st.words[key].first;
  }
  return { seen, first };
}

function tilesHtml(st) {
  const jars = jarsFilled();
  const starCount = UNITS.reduce((n, u) => n + starsOf(u.unit.id), 0);
  const { seen, first } = totals(st);
  let week = 0;
  for (let d = 0; d < 7; d++) week += (st.days[dayKey(Date.now() - d * DAY)] || {}).secs || 0;
  const all = Object.keys(st.days).reduce((n, k) => n + st.days[k].secs, 0);
  const streak = streakNow();
  const tile = (label, value, note) => `<div class="stile"><div class="stile-label">${label}</div><div class="stile-value">${value}</div><div class="stile-note">${note}</div></div>`;
  return (
    tile('Jars filled', `${jars} of ${TOTAL_UNITS}`, `${starCount} of ${TOTAL_UNITS * 3} stars`) +
    tile('Words mastered', `${masteredCount()} of ${TOTAL_WORDS}`, `${plural(metCount(), 'word')} met so far`) +
    tile('Right on the first try', seen ? Math.round((first / seen) * 100) + '%' : 'Not yet', seen ? `${first} of ${plural(seen, 'spelling')}` : 'Nothing spelled yet') +
    tile('Minutes this week', String(minutes(week)), `${minutes(all)} in all · ${streak ? plural(streak, 'day') + ' in a row' : 'no streak right now'}`)
  );
}

// One row per shelf: name, a bar, and the figure. Every bar is out of the
// shelf's own word count, on one shared 0–100% scale.
function shelvesHtml(st) {
  return SHELVES.map((shelf, i) => {
    const keys = [];
    shelf.units.forEach((unit) => wordsOf(unit).forEach((w) => keys.push(w.key)));
    const mastered = keys.filter((k) => st.words[k] && st.words[k].box >= MASTERED_BOX).length;
    const p = shelfProgress(i);
    const pct = Math.round((mastered / keys.length) * 100);
    const label = `${shelf.name}: ${mastered} of ${keys.length} words mastered, ${p.done} of ${p.total} jars filled`;
    return `<div class="meterrow" title="${esc(label)}">
      <div class="meterrow-name">${esc(shelf.name)}<small>${p.done} of ${p.total} jars${st.start === i ? ' · starting shelf' : ''}</small></div>
      <div class="track" role="img" aria-label="${esc(label)}"><i style="width:${pct}%"></i></div>
      <div class="meterrow-value">${mastered}<small>of ${keys.length}</small></div>
    </div>`;
  }).join('');
}

function troubleHtml() {
  const list = troubleWords();
  if (!list.length) return `<p class="empty">Words that get missed are listed here, with exactly what was typed, so you can see the kind of mistake being made.</p>`;
  const rows = list
    .slice(0, 12)
    .map((t) => {
      const glow = glowOf(t.word.key);
      const typed = t.bad
        .slice(0, 3)
        .map((b) => `<i>${esc(pretty(b))}</i>`)
        .join(', ');
      return `<li class="trouble-row">
        <div class="trouble-word">${marked(t.word)}<small>${esc(t.word.unit.name)}</small></div>
        <div class="trouble-info"><span>Missed ${t.miss} of ${plural(t.seen, 'try', 'tries')}</span>${typed ? `<span class="typed">Typed: ${typed}</span>` : ''}</div>
        <span class="chip glow-${glow}">${GLOW_NAMES[glow]}</span>
      </li>`;
    })
    .join('');
  return `<ul class="trouble">${rows}</ul>${list.length > 12 ? `<p class="box-note">And ${plural(list.length - 12, 'more word')} with at least one miss.</p>` : ''}`;
}

// The two patterns with the lowest share of first-try spellings, with their rule.
function practiceHtml(st) {
  const rows = UNITS.map((u) => {
    let seen = 0;
    let first = 0;
    for (const w of wordsOf(u.unit)) {
      const rec = st.words[w.key];
      if (rec) {
        seen += rec.seen;
        first += rec.first;
      }
    }
    return { u, seen, share: seen ? first / seen : 1 };
  })
    .filter((r) => r.seen >= 4 && r.share < 0.7)
    .sort((a, b) => a.share - b.share)
    .slice(0, 2);
  const items = rows.map(
    (r) => `<li><b>${esc(r.u.unit.name)} <span class="flag">${Math.round(r.share * 100)}% right first time</span></b>
      ${rich(r.u.unit.rule[0])}${r.u.unit.chant ? ` The line to remember: “${esc(r.u.unit.chant)}”` : ''} Ask for the rule in their own words, then for three of the words written on paper.</li>`
  );
  if (!items.length) {
    items.push(
      st.log.length
        ? `<li><b>No pattern stands out yet</b>Once a few jars have been worked through, the two patterns that are going least well are named here with their rules.</li>`
        : `<li><b>Nothing to report yet</b>After the first jar you will see which patterns come easily and which need more practice.</li>`
    );
  }
  items.push(`<li><b>Little and often</b>One jar or one review a day does more than a long session once a week. A jar takes about ten minutes.</li>`);
  items.push(`<li><b>Write the missed words by hand</b>Pick two from the list of missed words, look at the tricky part together, cover the word, and have it written from memory.</li>`);
  return items.join('');
}

function daysHtml(st) {
  const days = [];
  for (let d = 13; d >= 0; d--) {
    const time = Date.now() - d * DAY;
    const rec = st.days[dayKey(time)] || { secs: 0, words: 0, right: 0 };
    days.push({ time, mins: minutes(rec.secs), words: rec.words, right: rec.right });
  }
  const top = niceMax(Math.max(5, ...days.map((d) => d.mins)));
  const peak = days.reduce((best, d) => (d.mins > best.mins ? d : best), days[0]);
  const dayName = (time) => new Date(time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const bars = days
    .map((d) => {
      const label = `${dayName(d.time)}: ${plural(d.mins, 'minute')}, ${plural(d.words, 'word')} spelled, ${d.right} right first time`;
      const h = d.mins ? Math.max(4, (d.mins / top) * 100) : 0;
      return `<div class="daycol${d.mins ? '' : ' is-zero'}" tabindex="0" data-tip="${esc(label)}" aria-label="${esc(label)}">
        <div class="daycol-plot">${d === peak && d.mins ? `<span class="daycol-value" style="bottom:${h}%">${d.mins}</span>` : ''}<i style="height:${h}%"></i></div>
        <span class="daycol-day">${new Date(d.time).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
      </div>`;
    })
    .join('');
  const table = days
    .slice()
    .reverse()
    .map((d) => `<tr><td>${esc(dayName(d.time))}</td><td>${d.mins}</td><td>${d.words}</td><td>${d.right}</td></tr>`)
    .join('');
  return `<div class="daychart">
      <div class="daychart-grid" aria-hidden="true"><span>${top} min</span><span>${top / 2}</span><span class="is-base"></span></div>
      <div class="daychart-bars">${bars}</div>
    </div>
    <details class="tableview"><summary>Show as a table</summary>
      <div class="tablewrap"><table class="logtable"><thead><tr><th>Day</th><th>Minutes</th><th>Words spelled</th><th>Right first time</th></tr></thead><tbody>${table}</tbody></table></div>
    </details>`;
}

function logHtml(st) {
  if (!st.log.length) return `<p class="empty">Finished jars and reviews will be listed here with stars, first-try spellings and time spent.</p>`;
  const rows = st.log
    .slice(0, 14)
    .map((e) => {
      const found = e.id ? findUnit(e.id) : null;
      if (e.kind !== 'review' && !found) return '';
      const what = e.kind === 'review' ? `Review<small>${plural(e.n, 'word')} from the spellbook</small>` : `${esc(found.unit.name)}<small>${esc(found.shelf.name)}${e.kind === 'check' ? ' · passed the quick check' : ''}</small>`;
      return `<tr>
        <td>${what}</td>
        <td>${esc(shortDate(e.t))}</td>
        <td>${e.kind === 'review' ? '–' : stars(e.stars)}</td>
        <td>${e.right} of ${e.n}</td>
        <td>${e.fixed}</td>
        <td>${e.secs ? `${Math.max(1, minutes(e.secs))} min` : '–'}</td>
      </tr>`;
    })
    .join('');
  return `<div class="tablewrap"><table class="logtable">
    <thead><tr><th>Jar or review</th><th>Date</th><th>Stars</th><th>Right first time</th><th>Fixed on 2nd try</th><th>Time</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

export function open(app) {
  const el = mount(app, 'grown', `${topbar('For grown-ups', { right: '' })}<main class="main"></main>`, {
    back() {
      sfx('tap');
      go('home');
    },
    toggle(target) {
      const key = target.dataset.key;
      change((s) => {
        s.settings[key] = key === 'speak' ? s.settings.speak !== true : !s.settings[key];
      });
      target.setAttribute('aria-checked', S().settings[key] === true ? 'true' : 'false');
      el.querySelector('#backup-code').value = exportCode();
      sfx('pick');
    },
    // Speaks inside the tap itself, which is what an iPad needs.
    'test-voice'() {
      speak([{ text: 'This is how the words will sound. For example: because.', rate: 0.9 }]).then((result) => {
        if (result === 'silent') toast('No sound came out. Check the volume, then try again.', 'cross');
      });
    },
    shelf(target) {
      const next = Math.max(0, Math.min(SHELVES.length - 1, S().start + Number(target.dataset.step)));
      if (next === S().start) return;
      change((s) => {
        s.start = next;
      });
      sfx('pick');
      paint();
    },
    'save-names'() {
      const name = el.querySelector('#grown-name').value.trim().slice(0, 16);
      const petName = el.querySelector('#grown-pet').value.trim().slice(0, 12) || 'Fizz';
      change((s) => {
        s.profile.name = name;
        s.profile.pet = petName;
      });
      el.querySelector('#backup-code').value = exportCode();
      toast('Names saved.', 'check');
    },
    copy() {
      const box = el.querySelector('#backup-code');
      box.value = exportCode();
      const done = () => toast('Copied. Paste it somewhere safe, like Notes.', 'check');
      const fallback = () => {
        box.focus();
        box.select();
        toast('Select all of the code and copy it.', 'book');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(box.value).then(done, fallback);
      else fallback();
    },
    restore() {
      const code = el.querySelector('#restore-code').value;
      if (!code.trim()) return toast('Paste a progress code first.', 'book');
      ask({ title: 'Replace the progress on this device?', body: 'Everything saved here now will be replaced by the progress in the code.', yes: 'Replace it', no: 'Cancel', danger: true }).then((yes) => {
        if (!yes) return;
        if (importCode(code)) {
          toast('Progress restored.', 'check');
          paint();
        } else toast('That code could not be read. Check that all of it was pasted.', 'cross');
      });
    },
    reset() {
      ask({ title: 'Erase all progress?', body: 'Jars, stars, sparks, words and badges on this device will be gone for good. Copy a progress code first if you might want them back.', yes: 'Erase everything', no: 'Keep it', danger: true }).then((yes) => {
        if (!yes) return;
        resetAll();
        go('welcome');
      });
    },
  });
  const main = el.querySelector('main');

  const switchRow = (key, title, note, usable = true) => `<div class="setting"><div class="setting-text"><b>${title}</b><span>${note}</span></div>
    <button class="switch" role="switch" aria-checked="${S().settings[key] === true ? 'true' : 'false'}" aria-label="${title}" data-act="toggle" data-key="${key}"${usable ? '' : ' disabled'}></button></div>`;

  function paint() {
    const st = S();
    const voice = speechSupported();
    const startShelf = SHELVES[st.start] || SHELVES[0];
    main.innerHTML = `
      <p class="lead">How spelling is going, taken from what has been played on this device. Nothing here is sent anywhere.</p>
      ${canSave() ? '' : `<p class="empty">This browser is not letting the game save, so progress will be lost when the page closes. Private browsing is the usual cause.</p>`}
      <div class="stat-tiles">${tilesHtml(st)}</div>

      <div class="cols">
        <div class="box">
          <h2>Words missed</h2>
          <p class="box-note">Most-missed first, with what was actually typed. The colored letters are the tricky part of each word.</p>
          ${troubleHtml()}
        </div>
        <div class="box">
          <h2>What to do together</h2>
          <ul class="tips">${practiceHtml(st)}</ul>
        </div>
      </div>

      <div class="cols">
        <div class="box">
          <h2>Words mastered on each shelf</h2>
          <p class="box-note">A word is mastered once it has been spelled right first time on reviews days apart.</p>
          ${shelvesHtml(st)}
        </div>
        <div class="box">
          <h2>Minutes of practice, last 14 days</h2>
          <p class="box-note">Tap a bar for that day’s numbers.</p>
          ${daysHtml(st)}
        </div>
      </div>

      <h2 class="section-title">Recent jars and reviews</h2>
      ${logHtml(st)}

      <h2 class="section-title">Settings</h2>
      <div class="box">
        ${switchRow('speak', 'Say the words out loud', voice ? 'The game says each word and it is spelled from sound. With this off, each word is shown for a moment instead, which is weaker practice.' : 'This device has no voice the game can use, so each word is shown for a moment instead.', voice)}
        ${voice ? `<div class="setting"><div class="setting-text"><b>Test the voice</b><span>If nothing is heard, check the volume and that the iPad is not muted.</span></div><button class="btn btn-soft" data-act="test-voice">${icon('speaker')} Play</button></div>` : ''}
        ${switchRow('sound', 'Sound effects', 'Chimes for right answers, a silly slide for a fizzle.')}
        <div class="setting"><div class="setting-text"><b>Starting shelf</b><span>Set by the first-day check. New jars are suggested from this shelf on, and every shelf before it is open.</span></div>
          <div class="stepper"><button class="icon-btn" data-act="shelf" data-step="-1" aria-label="Earlier shelf"${st.start <= 0 ? ' disabled' : ''}>${icon('minus')}</button>
            <span class="stepper-value">${st.start + 1}. ${esc(startShelf.name)}</span>
            <button class="icon-btn" data-act="shelf" data-step="1" aria-label="Later shelf"${st.start >= SHELVES.length - 1 ? ' disabled' : ''}>${icon('plus')}</button></div></div>
        ${switchRow('unlockAll', 'Open every shelf now', 'Skips the three-jar requirement, for when you want a particular pattern practiced.')}
        <div class="setting is-wrap"><div class="setting-text"><b>Names</b><span>The speller’s first name and the familiar’s name. Kept on this device only.</span></div>
          <div class="names"><input class="input" id="grown-name" type="text" maxlength="16" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Speller’s name" placeholder="Speller’s name" value="${esc(st.profile.name)}">
            <input class="input" id="grown-pet" type="text" maxlength="12" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Familiar’s name" placeholder="Familiar’s name" value="${esc(st.profile.pet)}">
            <button class="btn btn-soft" data-act="save-names">Save</button></div></div>
      </div>

      <h2 class="section-title">Back up or move progress</h2>
      <div class="cols">
        <div class="box"><h2>Progress code</h2>
          <p class="box-note">Progress lives only on this device. Copy this code to keep a backup or to carry progress to another device.</p>
          <textarea class="input" id="backup-code" readonly aria-label="Progress code">${esc(exportCode())}</textarea>
          <div class="row"><button class="btn btn-soft" data-act="copy">Copy the code</button></div></div>
        <div class="box"><h2>Restore from a code</h2>
          <p class="box-note">Paste a code copied from this page. It replaces what is saved here.</p>
          <textarea class="input" id="restore-code" aria-label="Paste a progress code" placeholder="SP1.…" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
          <div class="row"><button class="btn btn-soft" data-act="restore">Restore</button></div></div>
      </div>

      <h2 class="section-title">How it works</h2>
      <div class="prose">
        <p><b>A jar</b> is one spelling pattern with ten words. It opens with a five-word quick check. Four or five right fills the jar on the spot, so no time goes on what is already known. Otherwise the game teaches the rule, plays a short card game with it, builds six of the words with help, and then asks for those six from memory.</p>
        <p><b>A miss is never the end of a word.</b> After a wrong try, the letters that were right are kept as a hint for a second try. After a second miss the word is shown with its tricky part colored, then hidden, and written from memory. Every word ends with a correct spelling, and the familiar’s silly mishaps keep mistakes light.</p>
        <p><b>Reviews</b> bring words back after one day, then three, seven, fourteen and thirty. A miss sends a word back to the start. Spelling a word correctly after a gap is what moves it into long-term memory, so reviews matter as much as new jars. Mastered words also turn up in a short proofreading round, where one word in a sentence has to be found and fixed.</p>
        <p><b>The voice</b> is the iPad’s own. Spelling from a spoken word is the practice that carries over to writing, so keep it on if you can. With it off, the game shows each word briefly instead and skips the quick checks.</p>
        <p><b>The keyboard</b> is the game’s own, so autocorrect and word suggestions cannot help. There are ${TOTAL_WORDS} words in ${TOTAL_UNITS} jars on ${SHELVES.length} shelves, running from short-vowel endings to rule breakers and sound-alikes.</p>
      </div>

      <h2 class="section-title">Start over</h2>
      <div class="box"><div class="setting"><div class="setting-text"><b>Erase all progress</b><span>Removes jars, stars, sparks, words and badges from this device.</span></div>
        <button class="btn btn-danger" data-act="reset">Erase</button></div></div>`;
  }

  // Hover, focus or a tap on a day's bar shows its numbers.
  let tip = null;
  const hideTip = () => {
    if (tip) tip.remove();
    tip = null;
  };
  const showTip = (col) => {
    hideTip();
    tip = document.createElement('div');
    tip.className = 'charttip';
    tip.textContent = col.dataset.tip;
    document.body.appendChild(tip);
    const r = col.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = Math.max(8, r.top - tip.offsetHeight - 6) + 'px';
  };
  main.addEventListener('pointerover', (e) => {
    const col = e.target.closest('.daycol');
    if (col && e.pointerType === 'mouse') showTip(col);
  });
  main.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'mouse' && e.target.closest('.daycol')) hideTip();
  });
  main.addEventListener('click', (e) => {
    const col = e.target.closest('.daycol');
    if (col) showTip(col);
    else hideTip();
  });
  main.addEventListener('focusin', (e) => {
    const col = e.target.closest('.daycol');
    if (col) showTip(col);
  });
  main.addEventListener('focusout', hideTip);
  main.addEventListener('scroll', hideTip, { passive: true });

  paint();
  return { leave: hideTip };
}
