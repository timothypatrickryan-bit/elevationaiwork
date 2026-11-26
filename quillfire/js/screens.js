// Every screen except the battle itself: title, first-day setup, Blip's story
// moments, the galaxy map, mission briefings, results, the hangar and the
// grown-ups page. Each one is a function that fills the app and returns an
// object with an optional leave() to tidy up.

import { el, esc, ICON, blip, ask, toast } from './ui.js';
import { SKILLS, SECTORS, MISSIONS, STORY, RANKS, missionById } from './content/index.js';
import { SHIP_LIST, UPGRADES, PAINT_LIST, BADGES } from './content/hangar.js';
import { LINES } from './content/voice-lines.js';
import { buildMission, buildPatrol, buildTraining } from './encounters.js';
import { createBattle } from './battle.js';
import { makeCanvas, shipSprite, bossSprite, planet, rng, SHIPS, PAINTS } from './gfx.js';
import { sfx, speak, stopSpeaking, setMusic, refreshMusic, onSpeaking, prepareVoice } from './audio.js';
import {
  S, save, resetAll, rankOf, medalOf, missionOpen, sectorOpen, nextMission, loadout, recordAnswer, finishMission, finishPatrol, patrolOpen, patrolFlownToday,
  upgradeCost, buyUpgrade, buyPaint, choose, skillReport, dayNumber, dayOf, addTime, exportCode, importCode, helpShields, MEDAL_AT,
} from './store.js';

const MEDAL_NAME = ['', 'Bronze', 'Silver', 'Gold'];
const many = (n, thing) => `${n} ${thing}${n === 1 ? '' : 's'}`;
const medalHtml = (n, cls = '') => `<span class="medal medal-${n} ${cls}">${n ? ICON.star : ''}</span>`;

function screen(app, cls, html) {
  app.innerHTML = '';
  const node = el(`<div class="screen ${cls}">${html}</div>`);
  app.appendChild(node);
  return node;
}

function shipPicture(host, design, paint, size = 300) {
  const c = makeCanvas(size, size);
  const s = shipSprite(design, paint);
  const k = (size * 0.86) / 120;
  c.ctx.drawImage(s.canvas, size / 2 - 50 * k, size / 2 - 60 * k, 100 * k, 120 * k);
  host.innerHTML = '';
  host.appendChild(c.canvas);
}
function planetPicture(host, hue, seed, ring) {
  const c = makeCanvas(116, 116);
  planet(c.ctx, 58, 58, ring ? 34 : 46, hue, { ring, seed, craters: true });
  host.appendChild(c.canvas);
}

// Blip talks: his mouth moves while a recording plays.
function talking(node) {
  const face = node.querySelector('.talk-face, .blip-face');
  return onSpeaking((on) => face && face.classList.toggle('is-talking', on));
}

// ------------------------------------------------------------------ title --

export function title(app, params, go) {
  const st = S();
  const node = screen(app, 'title', `
    <div class="tagline">Starship word battles</div>
    <h1 class="logo">Quillfire</h1>
    <div class="title-ship"></div>
    <button class="btn btn-main btn-big" data-act="play">${ICON.play} ${st.pilot.trained ? 'Fly' : 'Start'}</button>
    <div class="title-foot"><button class="link hold" data-act="grown">For grown-ups (press and hold)<i></i></button></div>`);
  shipPicture(node.querySelector('.title-ship'), st.ship, st.paint, 300);
  setMusic('map');
  holdButton(node.querySelector('[data-act="grown"]'), () => go('grown', { from: 'title' }));
  node.querySelector('[data-act="play"]').addEventListener('click', () => {
    sfx('tap');
    if (!st.pilot.name) go('setup');
    else if (!st.pilot.trained) go('battle', { training: true });
    else go('map');
  });
  return {};
}

// A button that only works when held down, to keep small fingers out.
function holdButton(button, action) {
  let timer = 0;
  const start = (e) => {
    e.preventDefault();
    button.classList.add('is-held');
    timer = window.setTimeout(() => {
      button.classList.remove('is-held');
      action();
    }, 1500);
  };
  const stop = () => {
    button.classList.remove('is-held');
    window.clearTimeout(timer);
  };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ------------------------------------------------------------------ setup --

const CALL_SIGNS = ['Ace', 'Comet', 'Rocket', 'Blaze', 'Nova', 'Bolt', 'Star', 'Jet'];

export function setup(app, params, go) {
  const st = S();
  let paint = st.paint;
  const node = screen(app, 'setup', `
    <div class="setup-card panel">
      <h1>Welcome, Cadet!</h1>
      <p>What should we call you? Type a name or pick a call sign.</p>
      <input class="field" id="who" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Your name" value="${esc(st.pilot.name)}">
      <div class="picks">${CALL_SIGNS.map((n) => `<button class="pick" data-name="${n}">${n}</button>`).join('')}</div>
      <p>Pick a color for your ship.</p>
      <div class="picks">${['teal', 'red', 'blue', 'green', 'purple', 'pink'].map((id) => `<button class="swatch" data-paint="${id}" aria-label="${PAINTS[id].name}" style="background:${PAINTS[id].main}"></button>`).join('')}</div>
      <div><button class="btn btn-main btn-big" data-act="go">Next ${ICON.next}</button></div>
    </div>`);
  const field = node.querySelector('#who');
  const draw = () => node.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('is-on', b.dataset.paint === paint));
  draw();
  node.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.name) {
      field.value = b.dataset.name;
      sfx('tap');
    } else if (b.dataset.paint) {
      paint = b.dataset.paint;
      sfx('tap');
      draw();
    } else if (b.dataset.act === 'go') {
      st.pilot.name = field.value.trim().slice(0, 14) || 'Cadet';
      // the first color is a free choice
      if (!st.owned.paints.includes(paint)) st.owned.paints = [paint];
      st.paint = paint;
      save();
      sfx('buy');
      go('story', { lines: STORY.intro, key: 'intro', next: ['battle', { training: true }], button: 'To flight school!' });
    }
  });
  return {};
}

// ------------------------------------------------------------------ story --

// Blip says a few lines, one at a time. params: { lines, next: [screen, params], button, key }
export function story(app, params, go) {
  const lines = params.lines;
  let at = 0;
  const node = screen(app, 'brief', `
    <div class="brief-body"><div class="brief-card panel">
      <div class="talk"><div class="talk-face">${blip('happy')}</div><div class="talk-bubble" aria-live="polite"></div></div>
    </div></div>
    <div class="brief-foot"><button class="btn btn-main btn-big" data-act="next"></button></div>`);
  const bubble = node.querySelector('.talk-bubble');
  const button = node.querySelector('[data-act="next"]');
  const stopTalk = talking(node);
  prepareVoice(lines);
  const show = () => {
    bubble.textContent = lines[at];
    button.innerHTML = at === lines.length - 1 ? esc(params.button || 'Go!') : `Next ${ICON.next}`;
    speak(lines[at]);
  };
  show();
  button.addEventListener('click', () => {
    sfx('tap');
    if (at < lines.length - 1) {
      at++;
      show();
      return;
    }
    if (params.key) {
      S().told[params.key] = true;
      save();
    }
    go(...params.next);
  });
  return { leave: () => { stopTalk(); stopSpeaking(); } };
}

// -------------------------------------------------------------------- map --

export function map(app, params = {}, go) {
  const st = S();
  const upNext = nextMission();
  let sector = params.sector !== undefined ? params.sector : upNext ? upNext.sector : SECTORS.length - 1;
  const rank = rankOf();
  const span = rank.next ? (st.xp - rank.from) / (rank.next - rank.from) : 1;
  const node = screen(app, 'map', `
    <div class="bar">
      <div class="bar-rank"><b>${esc(st.pilot.name)} · ${esc(rank.name)}</b><div class="xp"><i style="width:${Math.round(span * 100)}%"></i></div></div>
      <div class="bar-space"></div>
      <span class="gems">${ICON.gem}<span data-gems>${st.crystals}</span></span>
      ${patrolOpen() ? `<button class="btn btn-ghost btn-small patrol-btn ${patrolFlownToday() ? '' : 'is-fresh'}" data-act="patrol">${ICON.star}<span>Daily patrol</span></button>` : ''}
      <button class="btn btn-ghost btn-small" data-act="hangar">${ICON.hangar}<span>Hangar</span></button>
      <button class="round hold" data-act="grown" aria-label="For grown-ups: press and hold">${ICON.gear}<i></i></button>
    </div>
    <div class="map-body">
      <div class="sectors scroll"></div>
      <div class="missions panel"><div class="missions-head"></div><div class="mission-list scroll"></div><div class="sector-boss"></div></div>
    </div>`);
  const sectorsEl = node.querySelector('.sectors');
  const head = node.querySelector('.missions-head');
  const listEl = node.querySelector('.mission-list');

  SECTORS.forEach((sec, i) => {
    const open = sectorOpen(i);
    const ids = [...sec.skills, 'boss-' + sec.boss.id];
    const won = ids.filter((id) => medalOf(id) > 0).length;
    const b = el(`<button class="sector ${open ? '' : 'is-locked'}" data-sector="${i}">
      <span class="planet"></span>
      <span><span class="sector-name">${esc(sec.name)}</span><br><span class="sector-about">${esc(sec.about)}</span></span>
      <span class="sector-medals">${open ? `${won}/${ids.length}` : ICON.lock}</span></button>`);
    planetPicture(b.querySelector('.planet'), sec.hue, i + 2, i % 2 === 1);
    sectorsEl.appendChild(b);
  });

  function drawSector() {
    const sec = SECTORS[sector];
    sectorsEl.querySelectorAll('.sector').forEach((b, i) => b.classList.toggle('is-on', i === sector));
    head.innerHTML = `<h2>${esc(sec.name)}</h2><span class="eyebrow">${esc(sec.about)}</span>`;
    listEl.innerHTML = MISSIONS.filter((m) => m.sector === sector)
      .map((m) => {
        const open = missionOpen(m.id);
        const medal = medalOf(m.id);
        const next = upNext && upNext.id === m.id;
        return `<button class="mission ${open ? '' : 'is-locked'} ${next ? 'is-next' : ''} ${m.boss ? 'is-boss' : ''}" data-mission="${m.id}" ${open ? '' : 'disabled'}>
          <span class="mission-n">${m.boss ? ICON.nova : m.slot + 1}</span>
          <span><span class="mission-title">${esc(m.title)}</span><br><span class="mission-skill">${m.boss ? 'Boss battle' : esc(SKILLS[m.skill].name)}</span></span>
          ${open ? medalHtml(medal) : `<span class="medal">${ICON.lock}</span>`}</button>`;
      })
      .join('');
  }
  function drawBossCard() {
    const sec = SECTORS[sector];
    const card = node.querySelector('.sector-boss');
    const beaten = medalOf('boss-' + sec.boss.id) > 0;
    const ready = missionOpen('boss-' + sec.boss.id);
    card.className = 'sector-boss' + (beaten || ready ? '' : ' is-far');
    card.innerHTML = `<div class="boss-pic"></div><div><b>${esc(sec.boss.name)}</b><span>${beaten ? 'Beaten! This sector is safe.' : ready ? 'The boss is waiting. Are you ready?' : `Finish all ${sec.skills.length} missions to face the boss of this sector.`}</span></div>`;
    const c = makeCanvas(220, 125);
    c.ctx.drawImage(bossSprite(sec.boss.id, sec.hue).canvas, 0, 0, 220, 125);
    card.querySelector('.boss-pic').appendChild(c.canvas);
  }
  drawSector();
  drawBossCard();
  const active = sectorsEl.querySelector('.is-on');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  setMusic('map');

  holdButton(node.querySelector('[data-act="grown"]'), () => go('grown', { from: 'map' }));
  node.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.sector !== undefined) {
      const i = Number(b.dataset.sector);
      if (!sectorOpen(i)) {
        sfx('no');
        toast(app, `Beat ${SECTORS[i - 1].boss.name} to open ${SECTORS[i].name}.`);
        return;
      }
      sfx('tap');
      sector = i;
      drawSector();
      drawBossCard();
      greet();
    } else if (b.dataset.mission) {
      sfx('tap');
      go('brief', { id: b.dataset.mission });
    } else if (b.dataset.act === 'hangar') {
      sfx('tap');
      go('hangar');
    } else if (b.dataset.act === 'patrol') {
      sfx('tap');
      go('brief', { patrol: true });
    }
  });
  // the first visit to a sector starts with a word from Blip
  function greet() {
    const sec = SECTORS[sector];
    const tellKey = 'sector-' + sec.id;
    if (st.told[tellKey] || !sectorOpen(sector)) return;
    st.told[tellKey] = true;
    save();
    window.setTimeout(() => {
      if (!node.isConnected || node.querySelector('.modal')) return;
      const lines = sec.intro;
      const say = el(`<div class="modal"><div class="modal-card"><div class="talk"><div class="talk-face">${blip('wow')}</div><div class="talk-bubble">${esc(lines.join(' '))}</div></div><div class="modal-col"><button class="btn btn-main" data-act="ok">Let’s go!</button></div></div></div>`);
      const stopTalk = talking(say);
      say.querySelector('[data-act="ok"]').addEventListener('click', () => {
        stopTalk();
        stopSpeaking();
        say.remove();
      });
      node.appendChild(say);
      speak(lines);
    }, 350);
  }
  if (!params.quiet) greet();
  return { leave: () => stopSpeaking() };
}

// --------------------------------------------------------------- briefing --

export function brief(app, params, go) {
  const mission = params.patrol ? null : missionById(params.id);
  const skill = mission && mission.skill ? SKILLS[mission.skill] : null;
  const boss = mission && mission.boss;
  let body;
  let lines;
  if (params.patrol) {
    lines = LINES.patrol;
    body = `<div class="talk"><div class="talk-face">${blip('happy')}</div><div class="talk-bubble">${esc(lines[0])}</div></div>
      <p style="text-align:center;color:var(--dim)">Ten mixed waves from the missions you have flown. ${patrolFlownToday() ? 'You have already earned today’s bonus.' : 'The first patrol each day earns 60 bonus crystals.'}</p>`;
  } else if (boss) {
    lines = LINES.boss;
    body = `<div class="boss-pic" style="justify-self:center"></div>
      <div class="boss-says">“${esc(boss.says)}”</div>
      <div class="talk"><div class="talk-face">${blip('oops')}</div><div class="talk-bubble">${esc(lines[0])}</div></div>`;
  } else {
    lines = skill.teach;
    body = `<div class="talk"><div class="talk-face">${blip('happy')}</div><div class="talk-bubble">${skill.teach.map(esc).join(' ')}</div></div>
      <div class="shows">${skill.show.map(([w, what]) => `<div class="show"><b>${esc(w)}</b><span>${esc(what)}</span></div>`).join('')}</div>`;
  }
  const medal = mission ? medalOf(mission.id) : 0;
  const node = screen(app, 'brief', `
    <div class="brief-top"><button class="round" data-act="back" aria-label="Back">${ICON.back}</button>
      <div><div class="eyebrow">${params.patrol ? 'Mixed practice' : boss ? 'Boss battle' : esc(SECTORS[mission.sector].name)}</div><h1>${esc(params.patrol ? 'Daily Patrol' : mission.title)}</h1></div>
      <div class="bar-space"></div>${medal ? medalHtml(medal) : ''}</div>
    <div class="brief-body scroll"><div class="brief-card panel">${body}</div></div>
    <div class="brief-foot"><button class="btn btn-gold btn-big" data-act="launch">${ICON.play} Launch!</button></div>`);
  if (boss) {
    const c = makeCanvas(440, 250);
    c.ctx.drawImage(bossSprite(boss.id, SECTORS[mission.sector].hue).canvas, 0, 0, 440, 250);
    node.querySelector('.boss-pic').appendChild(c.canvas);
    sfx('roar');
  }
  const stopTalk = talking(node);
  speak(lines);
  if (skill) prepareVoice([skill.rule, skill.tip]);
  node.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    sfx('tap');
    if (b.dataset.act === 'back') go('map', mission ? { sector: mission.sector, quiet: true } : { quiet: true });
    else go('battle', params);
  });
  return { leave: () => { stopTalk(); stopSpeaking(); } };
}

// ----------------------------------------------------------------- battle --

export function battle(app, params, go) {
  const mission = params.patrol || params.training ? null : missionById(params.id);
  const seed = params.seed || (Date.now() % 1000000007);
  const rnd = rng(seed);
  const steps = params.training ? buildTraining(rnd) : params.patrol ? buildPatrol(rnd) : buildMission(mission, rnd);
  const sector = mission ? SECTORS[mission.sector] : SECTORS[Math.floor(rnd() * 3)];
  const skill = mission && mission.skill ? SKILLS[mission.skill] : null;
  app.innerHTML = '';
  prepareVoice([...(skill ? [skill.rule, skill.tip] : []), ...LINES.praise, ...steps.map((s) => s.say).filter(Boolean)]);
  const load = loadout();
  if (mission) load.shield += helpShields(mission.id);
  const fight = createBattle(app, {
    title: params.training ? 'Flight School' : params.patrol ? 'Daily Patrol' : mission.title,
    hue: sector.hue,
    steps,
    boss: mission && mission.boss,
    load,
    training: !!params.training,
    seed,
    speed: window.__qf && window.__qf.fast ? window.__qf.fast : 1,
    rule: skill ? skill.rule : '',
    firstTime: !!mission && !S().missions[mission.id],
    onAnswer: recordAnswer,
    onLayout: (what) => window.__qf && window.__qf.layout.push(what),
    onLeave: (act) => {
      save();
      if (act === 'restart') go('battle', { ...params, seed: undefined });
      else if (params.training) go('title');
      else go('map', mission ? { sector: mission.sector, quiet: true } : { quiet: true });
    },
    onDone: (result) => {
      addTime(result.secs);
      if (params.training) {
        S().pilot.trained = true;
        save();
        go('story', { lines: LINES.trained, next: ['map', {}], button: 'To the galaxy map!' });
        return;
      }
      const summary = params.patrol ? finishPatrol(result) : finishMission(mission.id, result);
      go('results', { params, result, summary });
    },
  });
  if (window.__qf) window.__qf.battle = fight;
  return {
    leave: () => {
      fight.destroy();
      if (window.__qf) window.__qf.battle = null;
    },
  };
}

// ---------------------------------------------------------------- results --

export function results(app, { params, result, summary }, go) {
  const mission = params.patrol ? null : missionById(params.id);
  const boss = mission && mission.boss;
  const pct = Math.round(summary.share * 100);
  const done = result.completed;
  const heading = !done ? 'Emergency warp!' : boss ? `${boss.name} is beaten!` : params.patrol ? 'Patrol complete!' : 'Mission complete!';
  const wins = [];
  if (summary.rankUp) wins.push(`${ICON.star}<span>New rank: <b>${esc(summary.rankUp)}</b></span>`);
  for (const p of summary.prizes) wins.push(`${ICON.hangar}<span>${p.kind === 'ship' ? `New ship in your hangar: <b>${esc(SHIPS[p.id].name)}</b>` : `New paint: <b>${esc(PAINTS[p.id].name)}</b>`}</span>`);
  for (const b of summary.badges) wins.push(`${ICON.medal}<span>Badge: <b>${esc(b.name)}</b></span>`);
  if (summary.bonus) wins.push(`${ICON.gem}<span>${summary.patrol ? 'Daily patrol bonus' : `${MEDAL_NAME[summary.medal]} medal bonus`}: <b>+${summary.bonus}</b> crystals</span>`);
  const opened = summary.opened.map((id) => missionById(id)).filter(Boolean);
  if (opened.length) wins.push(`${ICON.play}<span>Now open: <b>${esc(opened[0].title)}</b>${opened.length > 1 ? ` and ${opened.length - 1} more` : ''}</span>`);
  const misses = result.misses.slice(0, 8);
  const next = done && !params.patrol ? nextMission() : null;
  const rank = summary.rank;
  const span = rank.next ? (S().xp - rank.from) / (rank.next - rank.from) : 1;
  const tip = !done
    ? `The Garblers got through this time. Your crystals are safe${summary.help ? `, and Blip has fitted ${summary.help === 1 ? 'an extra shield' : `${summary.help} extra shields`} for your next try` : ''}. Use the scanner when you are stuck, and slide away from the red lines.`
    : summary.medal === 3
      ? ''
      : `Get ${Math.round(MEDAL_AT[summary.medal] * 100)}% right on the first try for a ${MEDAL_NAME[summary.medal + 1].toLowerCase()} medal.`;
  const node = screen(app, 'results', `
    <div class="results-body scroll">
      <div class="results-head">
        ${done ? `<div class="big-medal medal medal-${summary.medal}">${ICON.star}</div>` : `<div class="talk-face" style="width:110px">${blip('oops')}</div>`}
        <h1>${esc(heading)}</h1>
        ${done ? `<div class="eyebrow">${MEDAL_NAME[summary.medal]} medal · ${pct}% right first try</div>` : ''}
        ${tip ? `<p style="color:var(--dim);max-width:34em">${esc(tip)}</p>` : ''}
      </div>
      <div class="stat-row">
        <div class="stat"><b>${result.firstTry}/${result.decisions}</b><span>Right first try</span></div>
        <div class="stat"><b>${result.bestStreak}</b><span>Best streak</span></div>
        <div class="stat"><b>+${result.crystals + summary.bonus}</b><span>Crystals</span></div>
        <div class="stat"><b>+${summary.xp}</b><span>${esc(rank.name)}</span><div class="xp" style="width:100%;margin-top:6px"><i style="width:${Math.round(span * 100)}%"></i></div></div>
      </div>
      ${wins.length ? `<div class="wins">${wins.map((w) => `<div class="win">${w}</div>`).join('')}</div>` : ''}
      ${misses.length ? `<div class="practice panel"><h3>Worth another look</h3><ul>${misses.map((m) => `<li>${esc(m.q)} → <b>${esc(m.a)}</b>${m.picked && m.picked[0] !== '(' ? ` <s>${esc(m.picked)}</s>` : m.picked ? ` <span style="color:var(--dim)">${esc(m.picked)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
    </div>
    <div class="results-foot">
      <button class="btn btn-ghost" data-act="map">${ICON.home} Map</button>
      <button class="btn btn-ghost" data-act="again">${ICON.redo} Fly again</button>
      ${next && next.id !== (mission && mission.id) ? `<button class="btn btn-gold" data-act="next">Next mission ${ICON.next}</button>` : ''}
    </div>`);
  setMusic('map');
  if (done) {
    sfx(summary.rankUp ? 'rank' : 'medal');
    speak(summary.medal === 3 ? LINES.medal[1] : summary.medal === 2 ? LINES.medal[2] : LINES.medal[3]);
  } else speak(LINES.down[0]);
  const ending = done && mission && mission.id === 'boss-garble' && !S().told.ending;
  node.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    sfx('tap');
    const back = ['map', mission ? { sector: mission.sector, quiet: true } : { quiet: true }];
    if (b.dataset.act === 'again') go('battle', params);
    else if (ending) go('story', { lines: STORY.ending, key: 'ending', next: back, button: 'Hooray!' });
    // a new sector is entered through the map, where Blip says what it is about
    else if (b.dataset.act === 'next') go(...(mission && next.sector !== mission.sector ? ['map', { sector: next.sector }] : ['brief', { id: next.id }]));
    else go(...back);
  });
  return { leave: () => stopSpeaking() };
}

// ----------------------------------------------------------------- hangar --

export function hangar(app, params = {}, go) {
  let tab = params.tab || 'ships';
  const node = screen(app, 'hangar', `
    <div class="bar"><button class="round" data-act="back" aria-label="Back">${ICON.back}</button><h1 class="display" style="font-size:1.6rem">Hangar</h1><div class="bar-space"></div><span class="gems">${ICON.gem}<span data-gems></span></span></div>
    <div class="hangar-body">
      <div class="hangar-view panel"><div class="hangar-ship"></div><h2></h2><p></p></div>
      <div class="hangar-side panel">
        <div class="tabs">${[['ships', 'Ships'], ['upgrades', 'Upgrades'], ['paint', 'Paint'], ['badges', 'Badges']].map(([id, name]) => `<button class="tab" data-tab="${id}">${name}</button>`).join('')}</div>
        <div class="shop scroll"></div>
      </div>
    </div>`);
  const shop = node.querySelector('.shop');
  function draw() {
    const st = S();
    node.querySelector('[data-gems]').textContent = st.crystals;
    shipPicture(node.querySelector('.hangar-ship'), st.ship, st.paint, 300);
    const mine = SHIP_LIST.find((s) => s.id === st.ship);
    node.querySelector('.hangar-view h2').textContent = SHIPS[st.ship].name;
    node.querySelector('.hangar-view p').textContent = mine.perk || 'Your first ship. Quick and steady.';
    node.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-on', b.dataset.tab === tab));
    shop.classList.toggle('badges', tab === 'badges');
    if (tab === 'ships') {
      shop.innerHTML = SHIP_LIST.map((ship) => {
        const own = st.owned.ships.includes(ship.id);
        const how = ship.boss >= 0 ? `Beat ${SECTORS[ship.boss].boss.name} to win this ship.` : '';
        return `<button class="item ${st.ship === ship.id ? 'is-on' : ''} ${own ? '' : 'is-locked'}" data-ship="${ship.id}"><span class="item-pic" data-pic="${ship.id}"></span>
          <span><h3>${esc(SHIPS[ship.id].name)}</h3><p>${esc(own ? ship.perk || 'Your first ship. Quick and steady.' : how)}</p></span>
          <span>${own ? (st.ship === ship.id ? ICON.check : '') : ICON.lock}</span></button>`;
      }).join('');
      shop.querySelectorAll('[data-pic]').forEach((p) => shipPicture(p, p.dataset.pic, st.paint, 60));
    } else if (tab === 'upgrades') {
      shop.innerHTML = UPGRADES.map((up) => {
        const level = st.up[up.id];
        const cost = upgradeCost(up.id);
        return `<div class="item"><span class="item-pic">${{ shield: ICON.shield, scan: ICON.scan, chrono: ICON.pause, nova: ICON.nova }[up.id]}</span>
          <span><h3>${esc(up.name)}</h3><p>${esc(up.what)}</p><span class="pips">${up.costs.map((_, i) => `<i class="${i < level ? 'is-on' : ''}"></i>`).join('')}</span></span>
          ${cost === null ? `<span class="chip">Full</span>` : `<button class="btn btn-gold btn-small" data-up="${up.id}" ${st.crystals < cost ? 'disabled' : ''}>${ICON.gem} ${cost}</button>`}</div>`;
      }).join('');
    } else if (tab === 'paint') {
      shop.innerHTML = PAINT_LIST.map((paint) => {
        const own = st.owned.paints.includes(paint.id);
        const prize = paint.prize !== undefined;
        return `<div class="item ${st.paint === paint.id ? 'is-on' : ''}"><span class="item-pic"><span class="swatch" style="background:${PAINTS[paint.id].main};display:block"></span></span>
          <span><h3>${esc(PAINTS[paint.id].name)}</h3><p>${own ? '' : prize ? `Beat ${esc(SECTORS[paint.prize].boss.name)} to win this paint.` : ''}</p></span>
          ${own ? `<button class="btn btn-ghost btn-small" data-paint="${paint.id}">${st.paint === paint.id ? ICON.check : 'Use'}</button>` : prize ? ICON.lock : `<button class="btn btn-gold btn-small" data-buy="${paint.id}" ${st.crystals < paint.cost ? 'disabled' : ''}>${ICON.gem} ${paint.cost}</button>`}</div>`;
      }).join('');
    } else {
      shop.innerHTML = BADGES.map((b) => `<div class="badge ${st.badges[b.id] ? 'is-won' : ''}">${ICON.medal}<b>${esc(b.name)}</b><span>${esc(b.how)}</span></div>`).join('');
    }
  }
  draw();
  setMusic('map');
  if (!S().told.hangar) {
    S().told.hangar = true;
    save();
    speak(LINES.hangar[0]);
  }
  node.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'back') {
      sfx('tap');
      return go('map', { quiet: true });
    }
    if (b.dataset.tab) {
      tab = b.dataset.tab;
      sfx('tap');
    } else if (b.dataset.ship) {
      if (S().owned.ships.includes(b.dataset.ship)) {
        choose('ship', b.dataset.ship);
        sfx('buy');
      } else sfx('no');
    } else if (b.dataset.up) {
      if (buyUpgrade(b.dataset.up)) sfx('buy');
      else sfx('no');
    } else if (b.dataset.buy) {
      if (buyPaint(b.dataset.buy)) sfx('buy');
      else sfx('no');
    } else if (b.dataset.paint) {
      choose('paint', b.dataset.paint);
      sfx('tap');
    }
    draw();
  });
  return { leave: () => stopSpeaking() };
}

// -------------------------------------------------------------- grown-ups --

export function grown(app, params = {}, go) {
  const st = S();
  const report = skillReport();
  const today = dayNumber();
  const days = Array.from({ length: 14 }, (_, i) => today - 13 + i);
  const mins = days.map((d) => (st.days[d] ? Math.round(st.days[d].secs / 60) : 0));
  const top = Math.max(10, ...mins);
  const week = days.slice(7).reduce((n, d) => n + (st.days[d] ? st.days[d].secs : 0), 0);
  const medals = [1, 2, 3].map((n) => Object.values(st.missions).filter((m) => m.medal === n).length);
  const tried = report.filter((r) => r.seen >= 5);
  const weak = tried.slice().sort((a, b) => a.right / a.seen - b.right / b.seen).slice(0, 3).filter((r) => r.right / r.seen < 0.8);
  const toggles = [
    ['sfx', 'Sound effects', 'Lasers, explosions and chimes.'],
    ['music', 'Music', 'A quiet soundtrack.'],
    ['voice', 'Blip’s voice', 'Blip reads the briefings, the rule and, on request, the sentences. The words are always on screen too.'],
    ['relaxed', 'Relaxed timing', 'No countdown on the waves, and slower enemy shots. Good for careful readers.'],
    ['calm', 'Calm screen', 'No screen shake or flashes.'],
    ['unlockAll', 'Open every mission', 'For trying things out. Medals still have to be earned.'],
  ];
  const node = screen(app, 'grown', `
    <div class="bar"><button class="round" data-act="back" aria-label="Back">${ICON.back}</button><h1 class="display" style="font-size:1.5rem">For grown-ups</h1></div>
    <div class="grown-body scroll"><div class="grown-inner">
      <section class="panel"><h2>At a glance</h2>
        <p><b style="color:#fff">${esc(st.pilot.name || 'No pilot yet')}</b> · ${esc(rankOf().name)} · ${Object.values(st.missions).filter((m) => m.medal > 0).length} of ${MISSIONS.length} missions finished
        (${medals[2]} gold, ${medals[1]} silver, ${medals[0]} bronze) · ${many(st.counters.right, 'right answer')} · ${many(Math.round(week / 60), 'minute')} in the last 7 days · ${many(st.streak.count > 0 && st.streak.day >= today - 1 ? st.streak.count : 0, 'day')} in a row.</p>
        <div class="chart" aria-label="Minutes played on each of the last 14 days">${days.map((d, i) => `<div><span>${mins[i] || ''}</span><i style="height:${(mins[i] / top) * 78}%"></i><span>${dayOf(d).slice(8)}</span></div>`).join('')}</div>
      </section>
      <section class="panel"><h2>What to practice</h2>
        ${weak.length ? `<p>These are going least well right now. Replaying the mission, or a few daily patrols, will bring them back:</p><ul>${weak.map((r) => `<li><b>${esc(r.name)}</b>: ${Math.round((r.right / r.seen) * 100)}% right. <span style="color:var(--dim)">${esc(SKILLS[r.id].tip)}</span></li>`).join('')}</ul>` : `<p>${tried.length ? 'Nothing is going badly. Every skill tried so far is at 80% or better.' : 'Not enough flying yet to tell. Check back after a few missions.'}</p>`}
      </section>
      <section class="panel"><h2>Every skill</h2>
        <div class="table-wrap"><table><thead><tr><th>Skill</th><th>Right first try</th><th class="num">Tries</th><th class="num">Level</th><th class="num">To review</th></tr></thead><tbody>
        ${report.map((r) => {
          const share = r.seen ? r.right / r.seen : 0;
          return `<tr><td>${esc(r.name)}</td><td>${r.seen ? `<span class="meter ${share < 0.6 ? 'is-low' : share < 0.8 ? 'is-mid' : ''}"><i style="width:${Math.round(share * 100)}%"></i></span>${Math.round(share * 100)}%` : '<span style="color:var(--dim)">not yet</span>'}</td><td class="num">${r.seen}</td><td class="num">${r.seen ? r.tier : ''}</td><td class="num">${r.waiting || ''}</td></tr>`;
        }).join('')}
        </tbody></table></div>
        <p style="margin-top:8px">Level 1 to 3 is how hard the questions for that skill currently are. It rises when the last answers are mostly right and falls when they are not. “To review” counts missed items waiting to come back in a daily patrol.</p>
      </section>
      <section class="panel missed"><h2>Latest misses</h2>
        ${st.log.length ? `<ul>${st.log.slice(0, 20).map((m) => `<li>${esc(m.q)} → <b style="color:var(--green)">${esc(m.a)}</b> <span style="color:var(--dim)">${esc(m.picked)}</span></li>`).join('')}</ul>` : '<p>None yet.</p>'}
      </section>
      <section class="panel"><h2>Settings</h2>
        ${toggles.map(([id, name, what]) => `<button class="toggle" data-set="${id}" aria-pressed="${st.settings[id] ? 'true' : 'false'}"><span><b>${name}</b><span>${what}</span></span><i class="switch"></i></button>`).join('')}
      </section>
      <section class="panel"><h2>Backup</h2>
        <p>Progress is kept only on this device. This code holds all of it. Keep a copy somewhere safe, or paste a code here to bring progress back.</p>
        <textarea class="code" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
        <div class="row"><button class="btn btn-ghost btn-small" data-act="export">Show my code</button><button class="btn btn-ghost btn-small" data-act="import">Load this code</button><button class="btn btn-ghost btn-small" data-act="reset">Erase everything</button></div>
      </section>
      <section class="panel"><h2>How it works</h2>
        <p>Quillfire has ${Object.keys(SKILLS).length} language skills in six sectors: kinds of words, sounds and spelling, word meanings, word parts, sentences, and reading. Each mission starts with a short lesson from Blip, then the skill is practiced in battle. A miss never ends a wave: the right answer lights up, Blip explains why, and the same question comes back at the end of the mission and again in later daily patrols.</p>
        <p style="margin-top:8px">Medals are for answers that are right on the first try: 50% bronze, 75% silver, 90% gold. Nothing is sent anywhere, and there are no ads or purchases. Crystals are earned only by playing.</p>
      </section>
    </div></div>`);
  const code = node.querySelector('.code');
  node.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'back') return go(params.from === 'map' ? 'map' : 'title', { quiet: true });
    if (b.dataset.set) {
      const id = b.dataset.set;
      st.settings[id] = !st.settings[id];
      b.setAttribute('aria-pressed', st.settings[id] ? 'true' : 'false');
      save();
      refreshMusic();
      if (id === 'voice' && !st.settings.voice) stopSpeaking();
      sfx('tap');
    } else if (b.dataset.act === 'export') {
      code.value = exportCode();
      code.focus();
      code.select();
    } else if (b.dataset.act === 'import') {
      if (!code.value.trim()) return toast(app, 'Paste a code into the box first.');
      if (await ask(app, { title: 'Load this code?', body: 'It replaces the progress on this device.', yes: 'Load it', no: 'Cancel' })) {
        if (importCode(code.value)) {
          toast(app, 'Progress loaded.');
          go('grown', params);
        } else toast(app, 'That code could not be read.');
      }
    } else if (b.dataset.act === 'reset') {
      if (await ask(app, { title: 'Erase everything?', body: 'All medals, crystals and ships on this device will be gone for good.', yes: 'Erase', no: 'Keep it' })) {
        resetAll();
        go('title');
      }
    }
  });
  return {};
}

export { RANKS };
