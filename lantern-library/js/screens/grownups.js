// The grown-ups' page: how reading is going, what to practice, settings,
// backup and reset. Everything shown here is computed from the save on this
// device.

import { CHAPTERS, TOTAL_LANTERNS, WORDS, findChapter } from '../content/index.js';
import { SKILLS } from '../content/skills.js';
import { S, change, canSave, lanternsLit, totalStars, streakNow, jarWords, dayKey, exportCode, importCode, resetAll } from '../store.js';
import { icon, stars } from '../art.js';
import { sfx } from '../audio.js';
import { mount, esc, rich, topbar, toast, ask, shortDate, plural, partLabel } from '../ui.js';
import { go } from '../nav.js';

const DAY = 24 * 60 * 60 * 1000;
const minutes = (secs) => Math.round(secs / 60);

function niceMax(value) {
  const steps = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];
  return steps.find((s) => s >= value) || Math.ceil(value / 60) * 60;
}

function tilesHtml(st) {
  const lit = lanternsLit();
  const seen = SKILLS.reduce((n, s) => n + ((st.skills[s.id] || {}).n || 0), 0);
  const first = SKILLS.reduce((n, s) => n + ((st.skills[s.id] || {}).first || 0), 0);
  let week = 0;
  for (let d = 0; d < 7; d++) week += (st.days[dayKey(Date.now() - d * DAY)] || {}).secs || 0;
  const all = Object.keys(st.days).reduce((n, k) => n + st.days[k].secs, 0);
  const jar = jarWords();
  const streak = streakNow();
  const tile = (label, value, note) => `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${value}</div><div class="tile-note">${note}</div></div>`;
  return (
    tile('Lanterns lit', `${lit} of ${TOTAL_LANTERNS}`, `${totalStars()} of ${TOTAL_LANTERNS * 3} stars`) +
    tile('Right on the first try', seen ? Math.round((first / seen) * 100) + '%' : 'Not yet', seen ? `${first} of ${plural(seen, 'question')}` : 'No chapters finished') +
    tile('Minutes this week', String(minutes(week)), `${minutes(all)} in all · ${streak ? plural(streak, 'day') + ' in a row' : 'no streak right now'}`) +
    tile('Words caught', `${jar.length} of ${WORDS.size}`, `${jar.filter((w) => w.glow === 2).length} known well`)
  );
}

// One row per skill: name, a bar, and the figure. Bars share one scale (0-100%).
function skillsHtml(st) {
  const rows = SKILLS.map((s) => {
    const k = st.skills[s.id] || { n: 0, first: 0, second: 0 };
    return { s, n: k.n, first: k.first, share: k.n ? k.first / k.n : null };
  });
  const weak = rows
    .filter((r) => r.n >= 3 && r.share < 0.75)
    .sort((a, b) => a.share - b.share)
    .slice(0, 2)
    .map((r) => r.s.id);
  const html = rows
    .map((r) => {
      const pct = r.share === null ? 0 : Math.round(r.share * 100);
      const flag = weak.includes(r.s.id);
      const label = r.n ? `${r.s.name}: ${pct}% right on the first try, ${r.first} of ${r.n}` : `${r.s.name}: no questions yet`;
      return `<div class="skillrow${r.n ? '' : ' is-empty'}" title="${esc(label)}">
        <div class="skillrow-name">${esc(r.s.name)}${flag ? `<span class="flag">${icon('bulb')} Practice next</span>` : ''}</div>
        <div class="track" role="img" aria-label="${esc(label)}"><i style="width:${pct}%"></i></div>
        <div class="skillrow-value">${r.n ? pct + '%' : '–'}<small>${r.n ? `${r.first} of ${r.n}` : 'not yet'}</small></div>
      </div>`;
    })
    .join('');
  return { html, weak };
}

function tipsHtml(st, weak) {
  const items = [];
  for (const id of weak) {
    const s = SKILLS.find((x) => x.id === id);
    items.push(`<li><b>${esc(s.name)}</b>${esc(s.about)} ${esc(s.tip)}</li>`);
  }
  if (!items.length) {
    items.push(
      st.log.length
        ? `<li><b>No weak spots stand out yet</b>Keep going. Once a skill has a few questions behind it, the two that need the most practice are flagged here with ideas for working on them together.</li>`
        : `<li><b>Nothing to report yet</b>After the first chapter you will see which skills come easily and which need practice, with ideas for working on them together.</li>`
    );
  }
  const seenChapters = [];
  for (const entry of st.log) {
    if (seenChapters.length >= 2) break;
    const found = findChapter(entry.id);
    if (found && !seenChapters.includes(found)) seenChapters.push(found);
  }
  for (const found of seenChapters) {
    items.push(`<li><b>Ask about “${esc(found.chapter.title)}”</b>${rich(found.chapter.talk)}</li>`);
  }
  return items.join('');
}

function daysHtml(st) {
  const days = [];
  for (let d = 13; d >= 0; d--) {
    const time = Date.now() - d * DAY;
    const rec = st.days[dayKey(time)] || { secs: 0, chapters: 0, words: 0 };
    days.push({ time, mins: minutes(rec.secs), chapters: rec.chapters });
  }
  const top = niceMax(Math.max(5, ...days.map((d) => d.mins)));
  const peak = days.reduce((best, d) => (d.mins > best.mins ? d : best), days[0]);
  const bars = days
    .map((d) => {
      const date = new Date(d.time);
      const label = `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${plural(d.mins, 'minute')}, ${plural(d.chapters, 'chapter')}`;
      const h = d.mins ? Math.max(4, (d.mins / top) * 100) : 0;
      return `<div class="daycol${d.mins ? '' : ' is-zero'}" tabindex="0" data-tip="${esc(label)}" aria-label="${esc(label)}">
        <div class="daycol-plot">${d === peak && d.mins ? `<span class="daycol-value" style="bottom:${h}%">${d.mins}</span>` : ''}<i style="height:${h}%"></i></div>
        <span class="daycol-day">${date.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
      </div>`;
    })
    .join('');
  const table = days
    .slice()
    .reverse()
    .map((d) => `<tr><td>${esc(new Date(d.time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))}</td><td>${d.mins}</td><td>${d.chapters}</td></tr>`)
    .join('');
  return `<div class="daychart">
      <div class="daychart-grid" aria-hidden="true"><span>${top} min</span><span>${top / 2}</span><span class="is-base"></span></div>
      <div class="daychart-bars">${bars}</div>
    </div>
    <details class="tableview"><summary>Show as a table</summary>
      <div class="tablewrap"><table class="logtable"><thead><tr><th>Day</th><th>Minutes</th><th>Chapters</th></tr></thead><tbody>${table}</tbody></table></div>
    </details>`;
}

function logHtml(st) {
  if (!st.log.length) return `<p class="empty">Finished chapters will be listed here with stars, first-try answers and reading time.</p>`;
  const rows = st.log
    .slice(0, 12)
    .map((e) => {
      const found = findChapter(e.id);
      if (!found) return '';
      const pace = !e.replay && e.wpm >= 60 && e.wpm <= 400 ? `${e.wpm} words a minute` : '';
      const missed = Array.from(new Set(e.misses || []))
        .map((id) => (SKILLS.find((s) => s.id === id) || {}).name)
        .filter(Boolean)
        .join(', ');
      return `<tr>
        <td>${esc(found.chapter.title)}<small>${esc(found.book.title)} · ${partLabel(found.book, found.index)}${e.replay ? ' · reread' : ''}</small></td>
        <td>${esc(shortDate(e.t))}</td>
        <td>${stars(e.stars)}</td>
        <td>${e.first} of ${e.n}</td>
        <td>${e.secs ? `${Math.max(1, minutes(e.secs))} min` : '–'}<small>${pace}</small></td>
        <td>${missed ? esc(missed) : 'None'}</td>
      </tr>`;
    })
    .join('');
  return `<div class="tablewrap"><table class="logtable">
    <thead><tr><th>Chapter</th><th>Date</th><th>Stars</th><th>First try</th><th>Reading time</th><th>Needed a second look</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

export function open(app) {
  const el = mount(app, 'grown', `${topbar('For grown-ups', { right: '' })}<main class="scroll"></main>`, {
    back() {
      sfx('tap');
      go('home');
    },
    toggle(target) {
      const key = target.dataset.key;
      change((s) => (s.settings[key] = !s.settings[key]));
      target.setAttribute('aria-checked', S().settings[key] ? 'true' : 'false');
      el.querySelector('#backup-code').value = exportCode();
      sfx('pick');
    },
    'save-name'() {
      const name = el.querySelector('#grown-name').value.trim().slice(0, 20);
      change((s) => (s.profile.name = name));
      el.querySelector('#backup-code').value = exportCode();
      toast(name ? `Saved. Glim will call her ${name}.` : 'Saved. No name will be shown.', 'check');
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
      ask({ title: 'Erase all progress?', body: 'Stars, sparks, words and badges on this device will be gone for good. Copy a progress code first if you might want them back.', yes: 'Erase everything', no: 'Keep it', danger: true }).then((yes) => {
        if (!yes) return;
        resetAll();
        go('welcome');
      });
    },
  });
  const main = el.querySelector('main');

  const switchRow = (key, title, note) => `<div class="setting"><div class="setting-text"><b>${title}</b><span>${note}</span></div>
    <button class="switch" role="switch" aria-checked="${S().settings[key] ? 'true' : 'false'}" aria-label="${title}" data-act="toggle" data-key="${key}"></button></div>`;

  function paint() {
    const st = S();
    const skills = skillsHtml(st);
    main.innerHTML = `
      <p class="lead">A summary of how reading is going, taken from what has been played on this device. Nothing here is sent anywhere.</p>
      ${canSave() ? '' : `<p class="empty" style="margin-top:14px">This browser is not letting the game save. Progress will be lost when the page closes. Private browsing is the usual cause.</p>`}
      <div class="tiles">${tilesHtml(st)}</div>

      <div class="cols" style="margin-top:14px">
        <div class="box">
          <h2>Reading skills</h2>
          <p class="box-note">Share of questions answered correctly on the first try. Only the first read of each chapter counts, so rereading cannot inflate it.</p>
          ${skills.html}
        </div>
        <div class="box">
          <h2>What to do together</h2>
          <ul class="tips">${tipsHtml(st, skills.weak)}</ul>
        </div>
      </div>

      <h2 class="section-title">Minutes of reading, last 14 days</h2>
      <div class="box">${daysHtml(st)}</div>

      <h2 class="section-title">Recent chapters</h2>
      ${logHtml(st)}

      <h2 class="section-title">Settings</h2>
      <div class="box">
        ${switchRow('sound', 'Sound effects', 'Chimes for answers, stars and lanterns.')}
        ${switchRow('voice', 'Listen button', 'Lets her hear a story read aloud while the sentence being read is highlighted.')}
        ${switchRow('unlockAll', 'Open every book now', 'Skips the lantern requirements, for when you want her to read a particular text.')}
        <div class="setting"><div class="setting-text"><b>Reader’s name</b><span>Used in Glim’s greetings. Kept on this device only.</span></div>
          <div class="row" style="flex:0 1 320px;justify-content:flex-end;flex-wrap:nowrap"><input class="field" id="grown-name" type="text" maxlength="20" autocomplete="off" aria-label="Reader’s name" value="${esc(st.profile.name)}"><button class="btn btn-soft" data-act="save-name">Save</button></div></div>
      </div>

      <h2 class="section-title">Back up or move progress</h2>
      <div class="cols">
        <div class="box"><h2>Progress code</h2>
          <p class="box-note">Progress lives only on this device. Copy this code to keep a backup or to carry progress to another device.</p>
          <textarea class="field" id="backup-code" readonly aria-label="Progress code">${esc(exportCode())}</textarea>
          <div class="row" style="margin-top:10px"><button class="btn btn-soft" data-act="copy">Copy the code</button></div></div>
        <div class="box"><h2>Restore from a code</h2>
          <p class="box-note">Paste a code copied from this page. It replaces what is saved here.</p>
          <textarea class="field" id="restore-code" aria-label="Paste a progress code" placeholder="LL1.…" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
          <div class="row" style="margin-top:10px"><button class="btn btn-soft" data-act="restore">Restore</button></div></div>
      </div>

      <h2 class="section-title">How it works</h2>
      <div class="prose">
        <p><b>The loop.</b> She reads a passage, then answers six questions about it. The passage stays open the whole time, because going back to the text is the habit that matters most. After a wrong first answer the game marks the paragraph to reread and gives one more try. Every answer ends with an explanation and the supporting sentence lit up in the passage.</p>
        <p><b>Stars.</b> Three stars means nearly everything was right on the first try, two means most of it, and one means the chapter was finished. A lantern can be made brighter by rereading. The questions unlock only after she has reached the end of the passage.</p>
        <p><b>Books.</b> There are ${CHAPTERS.length} passages in six books, moving from easier to harder: mystery, animal science, fantasy, biography, folktales and poems, and earth and space science. Two books are open at the start and the rest open as lanterns are lit.</p>
        <p><b>Words.</b> Each passage teaches four useful words. They land in the Firefly Jar and come back for short practice rounds at growing intervals, which is how vocabulary sticks.</p>
        <p><b>Reading pace</b> in the table is a rough figure from the time spent on the passage. Fifth graders usually read silently at about 150 to 200 words a minute. A much higher number usually means skimming.</p>
      </div>

      <h2 class="section-title">Start over</h2>
      <div class="box"><div class="setting"><div class="setting-text"><b>Erase all progress</b><span>Removes stars, sparks, words and badges from this device.</span></div>
        <button class="btn btn-danger" data-act="reset">Erase</button></div></div>`;
  }

  // Hover or focus on a day's bar shows its numbers.
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
