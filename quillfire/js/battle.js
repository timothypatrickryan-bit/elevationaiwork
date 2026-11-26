// The battle: one mission played on a canvas.
//
// A mission is a list of steps (see encounters.js). Each step is a wave:
//   pick / bins  several ships, one carries the right answer
//   tap          the words of a sentence fly in formation; tap the ones that fit
//   order        ships to zap in sequence, chained together by lightning
//   sort         a convoy crosses the sky; zap only the ships that fit the rule
// A boss mission adds a boss whose shield falls with every right answer.
//
// The rule that holds everywhere: a mistake never ends the wave. The Garblers
// shoot back (and the shots can be dodged), Blip explains, the right answer
// glows, and the player zaps it to move on.

import { el, esc, rich, curl, ICON, blip } from './ui.js';
import { sfx, speak, stopSpeaking, setMusic, voiceOn } from './audio.js';
import { background, shipSprite, foeSprite, bossSprite, gemSprite, GLOW, SHIPS, PAINTS, FOE_KINDS, roundRect, rng, DPR } from './gfx.js';
import { LINES } from './content/voice-lines.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const TEXT = '"Atkinson Hyperlegible Next", system-ui, -apple-system, sans-serif';
const NOISE = '#%&@$?*+=';

export function createBattle(host, cfg) {
  // cfg: { title, hue, steps, boss, load (see store.loadout), training, seed, speed, onAnswer, onDone }
  const load = cfg.load;
  const rnd = rng(cfg.seed || Date.now() % 1e9);
  const pickOne = (list) => list[Math.floor(rnd() * list.length)];

  const root = el(`<div class="battle">
    <canvas class="battle-canvas"></canvas>
    <div class="hud-top">
      <button class="hud-btn" data-act="pause" aria-label="Pause">${ICON.pause}</button>
      <div class="hud-title">${esc(cfg.title)}</div>
      <div class="hud-pips" aria-hidden="true"></div>
      <div class="hud-streak" hidden></div>
      <div class="hud-gems">${ICON.gem}<b>0</b></div>
    </div>
    <div class="boss-bar" hidden><span class="boss-name"></span><div class="boss-hp"><i></i></div></div>
    <div class="prompt" hidden>
      <div class="prompt-main">
        <div class="prompt-ask"></div>
        <div class="prompt-big"></div>
        <div class="prompt-text"></div>
      </div>
      <button class="hud-btn prompt-listen" data-act="listen" aria-label="Listen" hidden>${ICON.sound}</button>
      <div class="prompt-timer"><i></i></div>
    </div>
    <div class="passage" hidden>
      <h3></h3><p></p>
      <button class="btn btn-main" data-act="read">I read it!</button>
    </div>
    <div class="blip-say" hidden><div class="blip-face">${blip('happy')}</div><div class="blip-text"></div></div>
    <div class="hud-bottom">
      <div class="hud-shield" aria-label="Shields"></div>
      <div class="hud-tools">
        <button class="tool-btn tool-scan" data-act="scan">${ICON.scan}<span>SCAN</span><b></b></button>
        <button class="tool-btn tool-nova" data-act="nova" disabled><i class="nova-fill"></i>${ICON.nova}<span>NOVA</span></button>
      </div>
    </div>
    <div class="banner" hidden></div>
    <div class="pause-menu" hidden><div class="modal-card">
      <h2>Paused</h2>
      <div class="modal-col">
        <button class="btn btn-main" data-act="resume">${ICON.play} Keep flying</button>
        <button class="btn btn-ghost" data-act="restart">${ICON.redo} Start over</button>
        <button class="btn btn-ghost" data-act="quit">${ICON.home} Back to the map</button>
      </div>
    </div></div>
  </div>`);
  host.appendChild(root);
  const $ = (sel) => root.querySelector(sel);
  const canvas = $('.battle-canvas');
  const ctx = canvas.getContext('2d');
  const dom = {
    pips: $('.hud-pips'), streak: $('.hud-streak'), gems: $('.hud-gems b'), prompt: $('.prompt'), ask: $('.prompt-ask'), big: $('.prompt-big'), text: $('.prompt-text'),
    listen: $('.prompt-listen'), timer: $('.prompt-timer'), timerFill: $('.prompt-timer i'), passage: $('.passage'), say: $('.blip-say'), sayText: $('.blip-text'), sayFace: $('.blip-face'),
    shield: $('.hud-shield'), scan: $('.tool-scan'), scanCount: $('.tool-scan b'), nova: $('.tool-nova'), novaFill: $('.nova-fill'), banner: $('.banner'), pause: $('.pause-menu'),
    bossBar: $('.boss-bar'), bossName: $('.boss-name'), bossHp: $('.boss-hp i'),
  };

  // ---- the world
  let W = 0, H = 0, u = 1, dpr = 1;
  let sky = null;
  let time = 0;
  let last = 0;
  let raf = 0;
  let paused = false;
  let over = false;
  let speed = cfg.speed || 1;
  let hitStop = 0;
  let slow = 1;
  let shake = 0;
  let flash = 0;
  let top = 120;
  let region = { x: 0, y: 120, w: 100, h: 100 };
  const stars = [];
  const foes = [];
  const bolts = [];
  const plasma = [];
  const warns = [];
  const gems = [];
  const parts = [];
  const rings = [];
  const floats = [];
  const links = [];
  const timers = [];
  const ship = { x: 0, y: 0, tx: 0, tilt: 0, hp: load.shield, max: load.shield, safe: 0, flashT: 0, out: 0, boost: 0 };
  const design = SHIPS[load.ship] || SHIPS.quill;
  const paint = PAINTS[load.paint] || PAINTS.teal;
  const stats = { decisions: 0, firstTry: 0, corrected: 0, streak: 0, bestStreak: 0, crystals: 0, damage: 0, misses: [], skills: new Set(), started: Date.now(), scans: 0, novas: 0 };
  let gemCarry = 0;
  let scans = load.scans;
  let nova = 0;
  let steps = cfg.steps.slice();
  let stepAt = -1;
  let enc = null;
  const retries = [];
  const retried = new Set();
  let boss = null;
  let bossTurn = 0;
  let sayTimer = 0;
  let nextId = 1;
  let pointerDrag = null;

  const after = (secs, fn) => timers.push({ at: time + secs, fn });

  // ---- size and layout

  function resize() {
    const r = root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width;
    H = r.height;
    dpr = DPR();
    if (W * H * dpr * dpr > 3.6e6) dpr = Math.sqrt(3.6e6 / (W * H));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    u = clamp(Math.min(W, H * 1.2) / 900, 0.62, 1.15);
    root.style.setProperty('--u', u.toFixed(3));
    sky = background(W, H, cfg.hue, (cfg.seed || 1) % 97);
    ship.y = H - Math.max(96, 118 * u);
    if (!ship.x) ship.x = ship.tx = W / 2;
    ship.tx = clamp(ship.tx, 40 * u, W - 40 * u);
    if (!stars.length) {
      for (let i = 0; i < 70; i++) stars.push({ x: rnd() * 2000, y: rnd() * 2000, z: 0.3 + rnd() * 0.9 });
    }
    measureRegion();
    if (enc && foes.length) arrange(true);
  }

  function measureRegion() {
    const rootBox = root.getBoundingClientRect();
    // On an upright screen the passage runs across the top, and the question
    // sits right under it. (On a wide screen they are side by side.)
    dom.prompt.style.top = '';
    if (!dom.passage.hidden && !dom.prompt.hidden && W <= H * 1.05) {
      dom.prompt.style.top = `${dom.passage.getBoundingClientRect().bottom - rootBox.top + 8 * u}px`;
    }
    const p = dom.prompt.hidden ? $('.hud-top').getBoundingClientRect() : dom.prompt.getBoundingClientRect();
    top = p.bottom - rootBox.top + 10 * u;
    if (boss) placeBoss();
    let x = 0;
    let y = top;
    let w = W;
    if (!dom.passage.hidden) {
      const pb = dom.passage.getBoundingClientRect();
      if (W > H * 1.05) {
        x = pb.right - rootBox.left + 8 * u;
        w = W - x;
      } else y = Math.max(y, pb.bottom - rootBox.top + 10 * u);
    }
    if (boss) y = Math.max(y, top + boss.h * 0.92);
    region = { x, y, w, h: Math.max(120 * u, ship.y - 96 * u - y) };
  }

  // ---- labels

  const font = (px, weight = 700) => `${weight} ${px}px ${TEXT}`;
  function widthOf(text, px) {
    ctx.font = font(px);
    return ctx.measureText(text).width;
  }
  // Fits a label on a plate no wider than maxW: one line if it can, else two.
  function plate(label, px, maxW) {
    const padX = px * 0.62;
    const minPx = Math.max(13, Math.round(px * 0.8));
    for (let size = px; size >= minPx; size--) {
      const w = widthOf(label, size);
      if (w + padX * 2 <= maxW) return { lines: [label], w: Math.max(w + padX * 2, size * 2.6), h: size * 1.72, px: size };
    }
    const words = label.split(' ');
    if (words.length > 1) {
      for (let size = px; size >= 12; size--) {
        let best = null;
        for (let cut = 1; cut < words.length; cut++) {
          const a = words.slice(0, cut).join(' ');
          const b = words.slice(cut).join(' ');
          const w = Math.max(widthOf(a, size), widthOf(b, size));
          if (!best || w < best.w) best = { w, lines: [a, b] };
        }
        if (best.w + padX * 2 <= maxW) return { lines: best.lines, w: best.w + padX * 2, h: size * 2.86, px: size };
      }
    }
    let size = minPx;
    while (size > 10 && widthOf(label, size) + padX * 2 > maxW) size--;
    return { lines: [label], w: Math.min(maxW, widthOf(label, size) + padX * 2), h: size * 1.72, px: size, tight: widthOf(label, size) + padX * 2 > maxW };
  }
  // Tells the tests about a label that could not be made to fit.
  const fitCheck = (list) => list.forEach((f) => f.plate && f.plate.tight && cfg.onLayout && cfg.onLayout(`label does not fit: ${f.label}`));

  // ---- making a wave

  function makeFoe(label, ok, style, extra = {}) {
    const kind = style === 'stack' ? 'hauler' : style === 'bin' ? 'disc' : extra.kind || pickOne(FOE_KINDS);
    const sprite = style === 'pod' ? null : foeSprite(kind, cfg.hue);
    const f = { id: nextId++, label: curl(label), ok, style, sprite, scale: (style === 'bin' ? 1.15 : style === 'stack' ? 0.74 : 0.92) * u, x: 0, y: 0, hx: 0, hy: 0, sx: 0, sy: 0, born: time, phase: rnd() * TAU, state: 'in', mark: '', locked: false, dead: false, alpha: 1, shakeT: 0, charge: 0, ...extra };
    foes.push(f);
    return f;
  }

  const fontBase = () => Math.round(clamp(25 * u, 15, 28));

  // Places the ships of the current wave. `keep` re-places them after the
  // screen changes size without replaying their entrance.
  function arrange(keep = false) {
    const step = enc.step;
    const live = foes.filter((f) => !f.dead && !f.stream);
    if (!live.length) return;
    const pad = 14 * u;
    const px = fontBase();
    const maxRow = region.w - pad * 2;
    const style = live[0].style;
    const place = (f, x, y) => {
      f.hx = x;
      f.hy = y;
      if (keep) {
        f.x = x;
        f.y = y;
      }
    };

    if (style === 'pod') {
      for (const f of live) f.plate = plate(f.label, px, maxRow);
      const gap = 9 * u;
      const lineH = live[0].plate.h + 30 * u;
      const lines = [[]];
      let run = 0;
      for (const f of live) {
        if (run + f.plate.w > maxRow && lines[lines.length - 1].length) {
          lines.push([]);
          run = 0;
        }
        lines[lines.length - 1].push(f);
        run += f.plate.w + gap;
      }
      const y0 = region.y + Math.min(region.h * 0.28, Math.max(lineH * 0.7, (region.h - lines.length * lineH) / 2 + lineH * 0.3));
      lines.forEach((line, li) => {
        const total = line.reduce((n, f) => n + f.plate.w, 0) + gap * (line.length - 1);
        let x = region.x + (region.w - total) / 2;
        for (const f of line) {
          place(f, x + f.plate.w / 2, y0 + li * lineH);
          x += f.plate.w + gap;
        }
      });
      fitCheck(live);
      return;
    }

    const big = style === 'bin' && live.every((f) => f.label.length <= 2);
    const size = big ? Math.round(px * 1.5) : px;
    const slotW = (f) => Math.max(f.plate.w, f.sprite.w * f.scale);
    const tryRows = (rows) => {
      const per = Math.ceil(live.length / rows);
      const cap = (maxRow - (per - 1) * 22 * u) / per;
      for (const f of live) f.plate = plate(f.label, size, Math.max(60, cap));
      const groups = [];
      for (let i = 0; i < live.length; i += per) groups.push(live.slice(i, i + per));
      const fits = groups.every((g) => g.reduce((n, f) => n + slotW(f), 0) + (g.length - 1) * 22 * u <= maxRow) && live.every((f) => f.plate.lines.length === 1 && !f.plate.tight);
      return fits ? groups : null;
    };
    let groups = style === 'stack' ? null : tryRows(1) || (live.length > 3 ? tryRows(2) : null);
    if (groups) {
      const rowH = live[0].sprite.h * live[0].scale + live[0].plate.h + 34 * u;
      const y0 = region.y + clamp((region.h - groups.length * rowH) * 0.42, 6 * u, region.h * 0.3) + live[0].sprite.h * live[0].scale * 0.5;
      groups.forEach((g, gi) => {
        const total = g.reduce((n, f) => n + slotW(f), 0);
        const gap = Math.min(70 * u, (maxRow - total) / Math.max(1, g.length - 1 || 1));
        const span = total + gap * (g.length - 1);
        let x = region.x + (region.w - span) / 2;
        g.forEach((f, i) => {
          const zig = step.type === 'order' ? (i % 2 ? 16 : -10) * u : Math.pow(i - (g.length - 1) / 2, 2) * 5 * u;
          place(f, x + slotW(f) / 2, y0 + gi * rowH + zig);
          x += slotW(f) + gap;
        });
      });
      for (const f of live) f.layout = 'row';
      return;
    }
    // long answers: a column of cruisers, each with its plate beside it
    const shipW = 124 * 0.74 * u;
    const maxPlate = maxRow - shipW - 10 * u;
    let stackPx = Math.round(px * 0.92);
    let rowH = 0;
    for (;;) {
      for (const f of live) {
        f.style = 'stack';
        f.sprite = foeSprite('hauler', cfg.hue);
        f.scale = 0.74 * u;
        f.plate = plate(f.label, stackPx, maxPlate);
      }
      rowH = Math.max(...live.map((f) => f.plate.h)) + 16 * u;
      if (rowH * live.length <= region.h || stackPx <= 13) break;
      stackPx--;
    }
    const widest = Math.max(...live.map((f) => f.plate.w));
    const x0 = region.x + Math.max(pad, (region.w - (shipW + 10 * u + widest)) / 2);
    const y0 = region.y + clamp((region.h - rowH * live.length) * 0.35, 0, region.h * 0.25) + rowH / 2;
    live.forEach((f, i) => {
      f.layout = 'stack';
      f.plateW = widest;
      place(f, x0 + shipW / 2, y0 + i * rowH);
    });
    fitCheck(live);
  }

  function spawnWave() {
    const step = enc.step;
    foes.length = 0;
    links.length = 0;
    if (step.type === 'sort') {
      enc.queue = step.words.map((w) => ({ ...w }));
      enc.next = 0.4;
      enc.sent = 0;
      enc.state = 'live';
      return;
    }
    if (step.type === 'tap') step.tokens.forEach((t, i) => makeFoe(t.label, t.ok, 'pod', { fix: t.fix, at: i }));
    else if (step.type === 'order') step.shown.forEach((at) => makeFoe(step.seq[at], false, 'ship', { seq: at }));
    else step.options.forEach((o) => makeFoe(o.label, o.ok, step.type === 'bins' ? 'bin' : 'ship', { why: o.why }));
    measureRegion();
    arrange();
    foes.forEach((f, i) => {
      f.sx = f.hx + (rnd() - 0.5) * 120 * u;
      f.sy = -90 * u - i * 26 * u;
      f.x = f.sx;
      f.y = f.sy;
      f.born = time + i * 0.07;
    });
    sfx('warp');
    enc.state = 'in';
    after(0.85 + foes.length * 0.05, () => {
      if (enc && enc.step === step && enc.state === 'in') goLive();
    });
  }

  function goLive() {
    enc.state = 'live';
    if (enc.step.drill === 'dodge' && !enc.drilled) {
      enc.drilled = true;
      enc.state = 'drill';
      const shooter = foes.find((f) => !f.ok) || foes[0];
      fireAtShip(shooter, 2, 0.5, true);
      after(3.2, () => {
        if (enc && enc.state === 'drill') enc.state = 'live';
      });
    }
    if (enc.step.drill === 'scan') dom.scan.classList.add('is-nudge');
  }

  // ---- prompt and Blip

  function setPrompt(step) {
    const p = step.prompt;
    dom.prompt.hidden = false;
    dom.ask.textContent = p.ask || '';
    dom.big.textContent = p.big || '';
    dom.big.hidden = !p.big;
    dom.text.innerHTML = p.text ? rich(p.text) : p.sub ? esc(p.sub) : '';
    dom.text.hidden = !p.text && !p.sub;
    dom.text.classList.toggle('is-sub', !p.text && !!p.sub);
    dom.prompt.classList.toggle('is-long', !!p.text && p.text.length > 44);
    root.classList.toggle('has-passage', !!p.passage);
    dom.prompt.classList.toggle('is-solo', !p.big && !p.text && !p.sub && !p.passage);
    dom.listen.hidden = !(step.say && voiceOn());
    dom.timer.hidden = !(enc.max > 0);
    dom.timerFill.style.transform = 'scaleX(1)';
    dom.timer.classList.remove('is-low');
    if (p.passage) {
      dom.passage.hidden = false;
      dom.passage.querySelector('h3').textContent = p.passage.title;
      dom.passage.querySelector('p').textContent = curl(p.passage.text);
      dom.passage.querySelector('button').hidden = false;
      dom.passage.classList.add('is-reading');
      dom.prompt.hidden = true;
    } else dom.passage.hidden = true;
  }

  function say(text, { mood = 'happy', hold = false, small = '' } = {}) {
    window.clearTimeout(sayTimer);
    dom.say.hidden = false;
    dom.sayFace.innerHTML = blip(mood);
    dom.sayText.innerHTML = esc(text) + (small ? `<small>${esc(small)}</small>` : '');
    dom.say.classList.remove('is-in');
    void dom.say.offsetWidth;
    dom.say.classList.add('is-in');
    if (!hold) sayTimer = window.setTimeout(() => (dom.say.hidden = true), 2600 + text.length * 45);
  }
  const hush = () => {
    window.clearTimeout(sayTimer);
    dom.say.hidden = true;
  };

  function bannerText(text, ms = 1500) {
    dom.banner.textContent = curl(text);
    dom.banner.hidden = false;
    dom.banner.classList.remove('is-in');
    void dom.banner.offsetWidth;
    dom.banner.classList.add('is-in');
    window.setTimeout(() => (dom.banner.hidden = true), ms);
  }

  // ---- HUD

  function drawPips() {
    const n = boss ? 0 : cfg.steps.length;
    dom.pips.hidden = !n || n > 16;
    dom.pips.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < stepAt ? 'is-done' : i === stepAt ? 'is-now' : ''}"></i>`).join('');
  }
  function drawShield() {
    dom.shield.innerHTML = Array.from({ length: ship.max }, (_, i) => `<span class="${i < ship.hp ? 'is-on' : ''}">${ICON.shield}</span>`).join('');
  }
  function drawTools() {
    dom.scanCount.textContent = scans;
    dom.scan.disabled = scans <= 0;
    dom.nova.disabled = nova < 1;
    dom.nova.classList.toggle('is-ready', nova >= 1);
    dom.novaFill.style.transform = `scaleY(${clamp(nova, 0, 1)})`;
  }
  function drawStreak() {
    const mult = stats.streak >= 6 ? 3 : stats.streak >= 3 ? 2 : 1;
    dom.streak.hidden = mult === 1;
    dom.streak.textContent = `x${mult}`;
    dom.streak.classList.toggle('is-hot', mult === 3);
  }
  function drawBoss() {
    dom.bossBar.hidden = !boss;
    root.classList.toggle('has-boss', !!boss);
    if (!boss) return;
    dom.bossName.textContent = cfg.boss.name;
    dom.bossHp.style.transform = `scaleX(${clamp(boss.hp / boss.max, 0, 1)})`;
  }

  // ---- effects

  function burst(x, y, power = 1, hue = cfg.hue) {
    const n = Math.round((load.calm ? 10 : 22) * power);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU;
      const v = (80 + rnd() * 420) * u * Math.sqrt(power);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.35 + rnd() * 0.5, size: (2 + rnd() * 4) * u, color: rnd() < 0.5 ? '#fff6c2' : `hsl(${hue + (rnd() - 0.5) * 50}, 95%, 65%)`, glow: true, drag: 2.6 });
    }
    for (let i = 0; i < Math.round(7 * power); i++) {
      const a = rnd() * TAU;
      const v = (60 + rnd() * 240) * u;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40 * u, life: 0, max: 0.6 + rnd() * 0.6, size: (4 + rnd() * 7) * u, color: `hsl(${hue + 50}, 35%, ${18 + rnd() * 16}%)`, rot: rnd() * TAU, vr: (rnd() - 0.5) * 12, drag: 1.2, grav: 260 * u });
    }
    rings.push({ x, y, r: 10 * u, to: (90 + 60 * power) * u, life: 0, max: 0.42, color: 'rgba(255,240,200,' });
    rings.push({ x, y, r: 4 * u, to: 60 * power * u, life: 0, max: 0.3, glow: 'fire' });
    if (!load.calm) {
      shake = Math.min(18 * u, shake + 7 * power * u);
      hitStop = Math.max(hitStop, 0.035 * power);
    }
  }
  function spark(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU;
      const v = (60 + rnd() * 240) * u;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.25 + rnd() * 0.3, size: (2 + rnd() * 3) * u, color, glow: true, drag: 3 });
    }
  }
  function floatText(x, y, text, color = '#fff', size = 22) {
    floats.push({ x, y, text, color, size: size * u, life: 0, max: 1.1 });
  }
  function dropGems(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU;
      const v = (120 + rnd() * 260) * u;
      gems.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80 * u, life: 0, spin: rnd() * TAU });
    }
  }

  // ---- shooting

  function fireBolt(f, onHit) {
    const gun = { x: ship.x, y: ship.y - 46 * u };
    const target = f.boss ? { x: boss.x, y: boss.y + boss.h * 0.2 } : hitPoint(f);
    const d = Math.hypot(target.x - gun.x, target.y - gun.y);
    bolts.push({ x0: gun.x, y0: gun.y, x1: target.x, y1: target.y, t: 0, dur: 0.09 + d / (5200 * u), onHit });
    ship.tilt = clamp((target.x - ship.x) / (W * 0.5), -1, 1) * 0.35;
    ship.flashT = 0.12;
    sfx('laser');
  }
  const hitPoint = (f) => (f.style === 'pod' ? { x: f.x, y: f.y } : f.layout === 'stack' ? { x: f.x + f.sprite.w * f.scale * 0.3, y: f.y } : { x: f.x, y: f.y });

  // A Garbler takes aim: a red line shows where the shot will go, then it fires.
  function fireAtShip(f, shots = 1, delay = 0.55, harmless = false) {
    for (let i = 0; i < shots; i++) {
      after(i * 0.75, () => {
        if (over || !f || f.dead) return;
        const tx = ship.x;
        warns.push({ f, tx, t: 0, dur: delay + (load.relaxed ? 0.35 : 0) });
        f.charge = delay;
        sfx('warn');
        after(delay + (load.relaxed ? 0.35 : 0), () => {
          if (over) return;
          const from = f.dead ? { x: tx, y: top } : { x: f.x, y: f.y + 20 * u };
          shoot(from.x, from.y, tx, ship.y, harmless);
        });
      });
    }
  }
  function shoot(x, y, tx, ty, harmless = false) {
    const d = Math.hypot(tx - x, ty - y) || 1;
    const v = H * (load.relaxed ? 0.5 : 0.72);
    plasma.push({ x, y, vx: ((tx - x) / d) * v, vy: ((ty - y) / d) * v, r: 13 * u, life: 0, harmless });
    sfx('plasma');
  }

  function hurt() {
    if (ship.safe > 0 || over) return;
    if (cfg.training) {
      say('Ouch! In a real fight that would cost a shield. Slide away from the red line.', { mood: 'oops' });
      ship.safe = 1.5;
      sfx('hurt');
      return;
    }
    ship.hp--;
    stats.damage++;
    ship.safe = 1.6;
    flash = 0.5;
    if (!load.calm) shake = 16 * u;
    sfx('hurt');
    spark(ship.x, ship.y, '#ff6b7d', 16);
    drawShield();
    if (ship.hp <= 0) down();
  }

  // ---- answers

  function note(skill, key, ok, detail) {
    if (enc.step.retry || cfg.training) return;
    stats.decisions++;
    if (ok) stats.firstTry++;
    stats.skills.add(skill);
    if (!ok && detail) stats.misses.push(detail);
    cfg.onAnswer && cfg.onAnswer(skill, key, ok, detail);
  }
  function praise() {
    stats.streak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    drawStreak();
    if (nova < 1) {
      nova = nova + 1 / load.novaNeed;
      if (nova > 0.999) nova = 1; // six sixths do not quite add up to one
      if (nova >= 1) {
        sfx('streak');
        floatText(ship.x, ship.y - 70 * u, 'NOVA READY!', '#ffd34d', 24);
      }
      drawTools();
    }
    if (stats.streak === 3 || stats.streak === 6 || stats.streak === 10 || (stats.streak > 10 && stats.streak % 5 === 0)) {
      const line = pickOne(LINES.praise);
      say(line, { mood: 'wow' });
      speak(line);
      sfx('streak');
    }
  }
  function pay(x, y, base) {
    const mult = stats.streak >= 6 ? 3 : stats.streak >= 3 ? 2 : 1;
    dropGems(x, y, base * mult);
    if (mult > 1) floatText(x, y - 30 * u, `x${mult}`, '#ffd34d', 26);
  }
  function oops() {
    stats.streak = 0;
    drawStreak();
  }
  function queueRetry() {
    const step = enc.step;
    if (boss || step.retry || cfg.training || retried.has(step.key) || retries.length >= 3 || step.type === 'sort') return;
    retried.add(step.key);
    const again = JSON.parse(JSON.stringify(step));
    again.retry = true;
    retries.push(again);
  }
  function explain(mood = 'oops') {
    const step = enc.step;
    say(step.why || step.tip || 'Look for the glowing ship.', { mood, hold: true, small: step.why && step.tip && step.tip !== step.why ? step.tip : '' });
    if (step.tip) speak(step.tipSay || step.tip);
  }

  function kill(f, power = 1, quiet = false) {
    if (f.dead) return;
    f.dead = true;
    const p = hitPoint(f);
    burst(p.x, p.y, power);
    if (!quiet) sfx('boom');
  }
  function flee(f) {
    if (f.dead || f.state === 'flee') return;
    f.state = 'flee';
    f.fleeT = 0;
    f.locked = true;
  }
  function deflect(f) {
    f.shakeT = 0.4;
    const p = hitPoint(f);
    rings.push({ x: p.x, y: p.y, r: 20 * u, to: 70 * u, life: 0, max: 0.3, color: 'rgba(255,90,110,' });
    spark(p.x, p.y, '#ff6b7d', 10);
    sfx('clang');
  }

  function endWave(delay = 0.9) {
    enc.state = 'out';
    dom.scan.classList.remove('is-nudge');
    after(delay, nextStep);
  }

  // The right answer was hit.
  function won(f) {
    const step = enc.step;
    const clean = !enc.missed;
    if (clean) {
      note(step.skill, step.key, true);
      praise();
      sfx('right');
      pay(f.x, f.y, step.retry ? 2 : 4);
    } else dropGems(f.x, f.y, 1);
    if (step.retry && clean) stats.corrected++; // missed earlier, right this time
    kill(f, 1.25);
    hush();
    let i = 0;
    for (const other of foes) {
      if (other === f || other.dead) continue;
      i++;
      if (clean) after(0.1 + i * 0.09, () => kill(other, 0.7, true));
      else flee(other);
    }
    if (boss) after(0.25, () => bossHurt(clean ? 1 : 0, f));
    endWave(boss ? 1.5 : 0.95);
  }

  // A wrong answer was hit, or time ran out (f is then null).
  function missed(f) {
    const step = enc.step;
    const first = !enc.missed;
    enc.missed = true;
    if (first) {
      const right = step.options ? step.options.find((o) => o.ok) : null;
      note(step.skill, step.key, false, { skill: step.skill, q: [step.prompt.ask, step.prompt.big, step.prompt.text].filter(Boolean).join(' ').replace(/\n/g, ' '), a: right ? right.label : step.seq ? step.seq.join(' ') : '', picked: f ? f.label : '(time ran out)' });
      oops();
      queueRetry();
    }
    enc.state = 'hold';
    if (f) {
      deflect(f);
      f.mark = 'x';
      f.locked = true;
      fireAtShip(f, 1);
    } else {
      foes.filter((x) => !x.dead && !x.ok).slice(0, 2).forEach((x, i) => after(i * 0.35, () => fireAtShip(x, 1)));
    }
    after(1.0, () => {
      if (!enc || enc.step !== step) return;
      reveal();
    });
  }

  function reveal() {
    enc.state = 'reveal';
    dom.timer.hidden = true;
    for (const f of foes) {
      if (f.dead) continue;
      if (enc.step.type === 'order') f.mark = f.seq === enc.k ? 'hint' : f.mark === 'x' ? '' : f.mark;
      else if (f.ok && !f.locked) f.mark = 'hint';
      else if (!f.ok && enc.step.type !== 'tap') {
        f.mark = 'x';
        f.locked = true;
      }
    }
    explain();
  }

  // ---- what a tap on a ship does, for each kind of wave

  function struck(f) {
    if (!enc || f.dead || over) return;
    const step = enc.step;
    const state = enc.state;
    if (f.stream) return struckStream(f);
    if (state !== 'live' && state !== 'reveal') return;
    if (f.locked) return;

    if (step.type === 'pick' || step.type === 'bins') {
      if (f.ok) won(f);
      else if (state === 'live') {
        if (f.why) step.why = f.why;
        missed(f);
      } else deflect(f);
      return;
    }

    if (step.type === 'tap') {
      if (f.ok) {
        f.locked = true;
        f.mark = 'ok';
        if (f.fix) {
          f.label = curl(f.fix);
          f.plate = plate(f.label, f.plate.px, f.plate.w + 30);
        }
        sfx('right');
        spark(f.x, f.y, '#7dffb0', 12);
        const hinted = state === 'reveal' || enc.missed;
        if (!hinted) {
          note(step.skill, step.key + '#' + f.at, true);
          praise();
          pay(f.x, f.y, 2);
        } else {
          dropGems(f.x, f.y, 1);
        }
        if (foes.every((x) => !x.ok || x.locked)) {
          if (step.retry && !enc.missed) stats.corrected++;
          hush();
          foes.forEach((x, i) => after(0.25 + i * 0.04, () => (x.ok ? kill(x, 0.6, true) : flee(x))));
          sfx('streak');
          if (boss) after(0.3, () => bossHurt(enc.missed ? 0 : 1, f));
          endWave(boss ? 1.6 : 1.1);
        }
      } else {
        deflect(f);
        f.mark = 'x';
        f.locked = true;
        enc.wrongs++;
        const firstMiss = !enc.missed;
        enc.missed = true;
        note(step.skill, step.key + '!' + f.at, false, { skill: step.skill, q: `${step.prompt.ask}: ${step.tokens.map((t) => t.label).join(' ')}`, a: step.tokens.filter((t) => t.ok).map((t) => t.label).join(', '), picked: f.label });
        oops();
        if (firstMiss) queueRetry();
        fireAtShip(f, 1);
        if (enc.wrongs >= 2 && state === 'live') after(0.6, () => enc && enc.step === step && reveal());
        else {
          say(step.tip || 'Not that one.', { mood: 'oops' });
          if (step.tip) speak(step.tipSay || step.tip);
        }
      }
      return;
    }

    if (step.type === 'order') {
      if (f.seq === enc.k) {
        f.locked = true;
        f.mark = 'n' + (enc.k + 1);
        if (enc.prev) links.push({ a: enc.prev, b: f, born: time });
        enc.prev = f;
        sfx('link', enc.k);
        spark(f.x, f.y, '#8ff', 10);
        enc.k++;
        if (state === 'reveal') {
          const nxt = foes.find((x) => x.seq === enc.k);
          if (nxt) nxt.mark = 'hint';
        }
        if (enc.k >= step.seq.length) {
          const clean = !enc.missed;
          if (clean) {
            note(step.skill, step.key, true);
            praise();
          }
          if (step.retry && clean) stats.corrected++;
          hush();
          const ordered = foes.slice().sort((a, b) => a.seq - b.seq);
          ordered.forEach((x, i) =>
            after(0.3 + i * 0.13, () => {
              kill(x, 0.8, i > 0);
              if (clean) pay(x.x, x.y, 1);
            })
          );
          if (boss) after(0.5, () => bossHurt(clean ? 1 : 0, f));
          endWave((boss ? 1.6 : 1.0) + ordered.length * 0.13);
        }
      } else {
        deflect(f);
        enc.wrongs++;
        if (!enc.missed) {
          enc.missed = true;
          note(step.skill, step.key, false, { skill: step.skill, q: step.prompt.ask, a: step.seq.join(' '), picked: f.label + ' (out of order)' });
          oops();
          queueRetry();
        }
        fireAtShip(f, 1);
        if (enc.wrongs >= 2 && state === 'live') after(0.6, () => enc && enc.step === step && reveal());
        else {
          say(step.tip || 'Not yet. Find the one that comes next.', { mood: 'oops' });
          if (step.tip) speak(step.tipSay || step.tip);
        }
      }
    }
  }

  function struckStream(f) {
    if (f.locked) return;
    const step = enc.step;
    f.locked = true;
    if (f.ok) {
      note(step.skill, f.key, true);
      praise();
      sfx('right');
      pay(f.x, f.y, 2);
      kill(f, 1);
    } else {
      note(step.skill, f.key, false, { skill: step.skill, q: `${step.prompt.ask} ${step.prompt.big}`, a: `leave “${f.label}” alone`, picked: '' });
      oops();
      deflect(f);
      f.mark = 'x';
      say(f.why || step.tip, { mood: 'oops', small: f.why ? step.tip : '' });
      if (step.tip) speak(step.tipSay || step.tip);
      // its deflector bounces the shot straight back
      shoot(f.x, f.y, ship.x, ship.y);
    }
  }

  // ---- the two tools

  function useScan() {
    if (!enc || scans <= 0 || over || paused) return;
    const step = enc.step;
    const live = enc.state === 'live';
    let used = false;
    if (step.type === 'sort') {
      foes.filter((f) => f.stream && f.ok && !f.locked && !f.dead).forEach((f) => (f.mark = 'hint'));
      enc.scanUntil = time + 6;
      used = true;
    } else if (!live) return;
    else if (step.type === 'pick' || step.type === 'bins') {
      const wrong = foes.filter((f) => !f.ok && !f.dead && !f.locked);
      if (wrong.length < 2) {
        sfx('no');
        say('The scanner needs at least three ships to work on.', { mood: 'oops' });
        return;
      }
      shuffleInPlace(wrong).slice(0, Math.floor(wrong.length / 2) || 1).forEach((f) => {
        f.mark = 'x';
        flee(f);
      });
      used = true;
    } else if (step.type === 'tap') {
      const f = foes.find((x) => x.ok && !x.locked);
      if (f) f.mark = 'hint';
      used = true;
    } else if (step.type === 'order') {
      const f = foes.find((x) => x.seq === enc.k);
      if (f) f.mark = 'hint';
      used = true;
    }
    if (!used) return;
    scans--;
    stats.scans++;
    sfx('scan');
    rings.push({ x: ship.x, y: ship.y, r: 20 * u, to: Math.max(W, H), life: 0, max: 0.7, color: 'rgba(120,255,240,' });
    dom.scan.classList.remove('is-nudge');
    drawTools();
  }
  function shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function useNova() {
    if (nova < 1 || over || paused || !enc) return;
    nova = 0;
    stats.novas++;
    drawTools();
    sfx('nova');
    rings.push({ x: ship.x, y: ship.y, r: 20 * u, to: Math.max(W, H) * 1.2, life: 0, max: 0.9, color: 'rgba(255,220,120,' });
    rings.push({ x: ship.x, y: ship.y, r: 10 * u, to: Math.max(W, H), life: 0, max: 0.6, glow: 'gold' });
    flash = 0.6;
    for (const p of plasma) spark(p.x, p.y, '#ffd34d', 6);
    plasma.length = 0;
    warns.length = 0;
    ship.safe = 3.5;
    if (enc.max > 0) enc.left = Math.min(enc.max, enc.left + 8);
    if (enc.step.type === 'sort') enc.slowUntil = time + 6;
    bannerText('NOVA BLAST!', 1100);
    if (boss && boss.hp > 1) after(0.4, () => bossHurt(1, null, true));
  }

  // ---- the boss

  function placeBoss() {
    // the boss hangs just under the question, with room for its escorts below
    boss.scale = Math.min((W * 0.5) / 440, ((ship.y - top) * 0.36) / 250, 1.15);
    boss.w = 440 * boss.scale;
    boss.h = 250 * boss.scale;
    boss.x = W / 2;
    boss.y = top + boss.h * 0.5;
  }
  function bossHurt(points, f, byNova = false) {
    if (!boss || boss.hp <= 0) return;
    if (points <= 0) {
      // a miss: the boss gloats and fires
      boss.gloat = 0.8;
      sfx('roar');
      for (let i = 0; i < 2; i++) after(0.3 + i * 0.5, () => bossShot());
      return;
    }
    boss.hp -= points;
    boss.hitT = 0.5;
    sfx('bossHit');
    burst(boss.x + (rnd() - 0.5) * boss.w * 0.5, boss.y + (rnd() - 0.5) * boss.h * 0.4, 1.6);
    floatText(boss.x, boss.y - boss.h * 0.5, byNova ? 'NOVA HIT!' : 'DIRECT HIT!', '#ffd34d', 26);
    drawBoss();
    if (boss.hp <= 0) return bossDown();
    bossTurn++;
    if (bossTurn % 3 === 0 && !byNova) after(0.5, bossBarrage);
  }
  function bossShot() {
    if (!boss || over) return;
    const tx = ship.x;
    warns.push({ f: boss, tx, t: 0, dur: 0.6 });
    sfx('warn');
    after(0.6, () => !over && boss && shoot(boss.x, boss.y + boss.h * 0.3, tx, ship.y));
  }
  // A curtain of shots with one gap to slide into.
  function bossBarrage() {
    if (!boss || over || boss.hp <= 0) return;
    bannerText('DODGE!', 900);
    sfx('roar');
    const lanes = Math.max(4, Math.min(7, Math.round(W / (150 * u))));
    const gap = Math.floor(rnd() * lanes);
    for (let i = 0; i < lanes; i++) {
      if (i === gap) continue;
      const tx = ((i + 0.5) / lanes) * W;
      warns.push({ f: boss, tx, t: 0, dur: 1.1, column: true });
      after(1.1 + i * 0.03, () => !over && boss && shoot(tx, top, tx, ship.y));
    }
  }
  function bossDown() {
    over = true;
    boss.dying = 0;
    slow = 0.45;
    setMusic('off');
    hush();
    for (const f of foes) flee(f);
    for (let i = 0; i < 9; i++) {
      after(0.2 + i * 0.22, () => {
        burst(boss.x + (rnd() - 0.5) * boss.w * 0.8, boss.y + (rnd() - 0.5) * boss.h * 0.7, 1.4);
        sfx(i % 2 ? 'boom' : 'bossHit');
      });
    }
    after(2.3, () => {
      flash = 1;
      sfx('bigboom');
      burst(boss.x, boss.y, 3);
      dropGems(boss.x, boss.y, 30);
      boss.gone = true;
      slow = 1;
      bannerText(`${cfg.boss.name} is beaten!`, 2400);
    });
    after(4.6, () => finish(true));
  }

  // ---- moving through the mission

  function nextStep() {
    if (over) return;
    hush();
    stopSpeaking();
    foes.length = 0;
    links.length = 0;
    stepAt++;
    if (boss) {
      if (stepAt >= steps.length) {
        steps = steps.concat(cfg.steps.map((s) => JSON.parse(JSON.stringify(s))));
      }
    } else if (stepAt >= steps.length) {
      if (retries.length) {
        const again = retries.shift();
        steps.push(again);
        if (!nextStep.told) {
          nextStep.told = true;
          bannerText('One more try!', 1200);
        }
      } else return victory();
    }
    const step = steps[stepAt];
    const first = cfg.firstTime ? 1.25 : 1;
    const max = load.relaxed || cfg.training ? 0 : step.time * load.think * first;
    enc = { step, state: 'in', k: 0, wrongs: 0, missed: false, left: max, max, prev: null };
    setPrompt(step);
    drawPips();
    if (step.coach) {
      say(step.coach, { hold: true });
      speak(step.coach);
    } else if (stepAt === 0 || step.type === 'sort') {
      const rule = cfg.rule && !boss ? cfg.rule : '';
      if (rule) speak(rule);
    }
    if (step.prompt.passage) {
      enc.state = 'reading';
      measureRegion();
      if (voiceOn()) speak([step.prompt.passage.title, step.prompt.passage.text]);
    } else spawnWave();
  }

  function victory() {
    over = true;
    enc = null;
    dom.prompt.hidden = true;
    dom.passage.hidden = true;
    hush();
    bannerText('MISSION COMPLETE!', 1900);
    sfx('medal');
    ship.boost = 0.001;
    after(1.9, () => finish(true));
  }
  function down() {
    over = true;
    hush();
    stopSpeaking();
    sfx('down');
    burst(ship.x, ship.y, 1.4, 20);
    ship.out = 0.001;
    bannerText('EMERGENCY WARP!', 1900);
    after(2.1, () => finish(false));
  }
  function finish(completed) {
    cancelAnimationFrame(raf);
    raf = 0;
    const result = {
      completed,
      decisions: stats.decisions,
      firstTry: stats.firstTry,
      corrected: stats.corrected,
      bestStreak: stats.bestStreak,
      crystals: stats.crystals,
      damage: stats.damage,
      misses: stats.misses,
      skills: [...stats.skills],
      secs: Math.round((Date.now() - stats.started) / 1000),
    };
    cfg.onDone && cfg.onDone(result);
  }

  // ---- one frame of the world

  function update(dt) {
    time += dt;
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= time) {
        const fn = timers[i].fn;
        timers.splice(i, 1);
        fn();
      }
    }
    // the ship
    const reach = 13 * load.slide;
    const before = ship.x;
    ship.x += (ship.tx - ship.x) * Math.min(1, dt * reach);
    const lean = clamp((ship.x - before) / Math.max(dt, 0.001) / (900 * u), -1, 1) * 0.5;
    ship.tilt += (lean - ship.tilt) * Math.min(1, dt * 8);
    ship.safe = Math.max(0, ship.safe - dt);
    ship.flashT = Math.max(0, ship.flashT - dt);
    if (ship.boost) ship.boost += dt;
    if (ship.out) ship.out += dt;

    // the wave's clock
    if (enc && enc.state === 'live' && enc.max > 0) {
      enc.left -= dt;
      const share = clamp(enc.left / enc.max, 0, 1);
      dom.timerFill.style.transform = `scaleX(${share})`;
      const low = share < 0.3;
      if (low !== enc.low) {
        enc.low = low;
        dom.timer.classList.toggle('is-low', low);
      }
      if (low && Math.floor(enc.left * 2) !== enc.tick) {
        enc.tick = Math.floor(enc.left * 2);
        sfx('tick');
      }
      if (enc.left <= 0) {
        if (enc.step.type === 'tap' || enc.step.type === 'order') {
          if (!enc.missed) {
            enc.missed = true;
            note(enc.step.skill, enc.step.key, false, { skill: enc.step.skill, q: enc.step.prompt.ask, a: enc.step.seq ? enc.step.seq.join(' ') : enc.step.tokens.filter((t) => t.ok).map((t) => t.label).join(', '), picked: '(time ran out)' });
            oops();
            queueRetry();
          }
          foes.filter((x) => !x.dead).slice(0, 2).forEach((x, i) => after(i * 0.35, () => fireAtShip(x, 1)));
          reveal();
        } else missed(null);
      }
    }

    // the convoy of a sorting wave
    if (enc && enc.step.type === 'sort' && enc.state === 'live') {
      const crawl = enc.slowUntil && time < enc.slowUntil ? 0.4 : 1;
      enc.next -= dt * crawl;
      if (enc.next <= 0 && enc.queue.length) {
        const w = enc.queue.shift();
        const lane = enc.sent % 3;
        const fromLeft = enc.sent % 2 === 0;
        // a first flight is slower, and so is a ship with a Chrono Coil
        const pace = (cfg.firstTime || cfg.training ? 1.25 : 1) * (load.think || 1);
        const cross = Math.max(load.relaxed ? 10 : 0, 7.6 * pace) * (W < 600 ? 0.85 : 1);
        const f = makeFoe(w.label, w.ok, 'ship', { stream: true, key: w.key, why: w.why });
        f.plate = plate(f.label, fontBase(), 260 * u);
        f.vx = ((W + 200 * u) / cross) * (fromLeft ? 1 : -1);
        f.x = fromLeft ? -90 * u : W + 90 * u;
        f.laneY = region.y + (0.12 + lane * 0.27) * region.h + f.sprite.h * f.scale * 0.5;
        f.y = f.laneY;
        f.state = 'idle';
        if (enc.scanUntil && time < enc.scanUntil && f.ok) f.mark = 'hint';
        enc.sent++;
        enc.next = Math.max(load.relaxed ? 2.5 : 0, 1.9 * pace);
      }
      if (enc.scanUntil && time >= enc.scanUntil) {
        enc.scanUntil = 0;
        foes.forEach((f) => f.mark === 'hint' && (f.mark = ''));
      }
      for (const f of foes) {
        if (f.dead || !f.stream) continue;
        f.x += f.vx * dt * crawl;
        f.y = f.laneY + Math.sin(time * 2 + f.phase) * 6 * u;
        if ((f.vx > 0 && f.x > W + 100 * u) || (f.vx < 0 && f.x < -100 * u)) {
          f.dead = true;
          if (f.ok && !f.locked) {
            note(enc.step.skill, f.key, false, { skill: enc.step.skill, q: `${enc.step.prompt.ask} ${enc.step.prompt.big}`, a: f.label, picked: '(it got away)' });
            oops();
            say(`One got away! ${f.why || ''}`, { mood: 'oops' });
            shoot(clamp(f.x, 20, W - 20), f.y, ship.x, ship.y);
          }
        }
      }
      if (!enc.queue.length && foes.every((f) => f.dead)) endWave(0.5);
    }

    // ships in formation
    for (let i = foes.length - 1; i >= 0; i--) {
      const f = foes[i];
      if (f.dead) {
        foes.splice(i, 1);
        continue;
      }
      f.shakeT = Math.max(0, f.shakeT - dt);
      f.charge = Math.max(0, f.charge - dt);
      if (f.stream) continue;
      if (f.state === 'in') {
        const t = clamp((time - f.born) / 0.6, 0, 1);
        const e = easeBack(t);
        f.x = lerp(f.sx, f.hx, e);
        f.y = lerp(f.sy, f.hy, e);
        if (t >= 1) f.state = 'idle';
      } else if (f.state === 'idle') {
        f.x = f.hx + Math.sin(time * 0.9 + f.phase) * 3 * u;
        f.y = f.hy + Math.sin(time * 1.6 + f.phase) * 4 * u;
      } else if (f.state === 'flee') {
        f.fleeT += dt;
        f.y -= (200 + 900 * f.fleeT) * u * dt;
        f.x += Math.sin(f.phase) * 160 * u * dt;
        f.alpha = clamp(1 - f.fleeT / 0.5, 0, 1);
        if (f.fleeT > 0.55) f.dead = true;
      }
    }

    // shots
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.t += dt;
      if (b.t >= b.dur) {
        bolts.splice(i, 1);
        b.onHit();
      }
    }
    for (let i = warns.length - 1; i >= 0; i--) {
      warns[i].t += dt;
      if (warns[i].t >= warns[i].dur) warns.splice(i, 1);
    }
    for (let i = plasma.length - 1; i >= 0; i--) {
      const p = plasma[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (rnd() < 0.5) parts.push({ x: p.x, y: p.y, vx: (rnd() - 0.5) * 30, vy: (rnd() - 0.5) * 30, life: 0, max: 0.25, size: 4 * u, color: 'rgba(255,90,120,0.8)', glow: true, drag: 1 });
      if (!ship.out && !ship.boost && Math.hypot(p.x - ship.x, p.y - ship.y) < p.r + 26 * u) {
        plasma.splice(i, 1);
        if (p.harmless || ship.safe > 0) spark(p.x, p.y, '#9ff', 8);
        else hurt();
        continue;
      }
      if (p.y > H + 40 || p.y < -60 || p.x < -60 || p.x > W + 60) plasma.splice(i, 1);
    }

    // crystals fly out, then home in on the ship
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      g.life += dt;
      g.spin += dt * 6;
      if (g.life < 0.32) {
        g.vx *= 1 - dt * 3;
        g.vy *= 1 - dt * 3;
      } else {
        const dx = ship.x - g.x;
        const dy = ship.y - g.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = (900 + g.life * 2600) * u;
        g.vx += (dx / d) * pull * dt;
        g.vy += (dy / d) * pull * dt;
        g.vx *= 1 - dt * 2.2;
        g.vy *= 1 - dt * 2.2;
        if (d < 34 * u || g.life > 2.5) {
          gems.splice(i, 1);
          gemCarry += 1 + load.gems;
          const whole = Math.floor(gemCarry);
          gemCarry -= whole;
          stats.crystals += whole;
          dom.gems.textContent = stats.crystals;
          sfx('gem', stats.crystals % 13);
          continue;
        }
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) {
        parts.splice(i, 1);
        continue;
      }
      const drag = 1 - Math.min(1, dt * (p.drag || 0));
      p.vx *= drag;
      p.vy = p.vy * drag + (p.grav || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    if (parts.length > 500) parts.splice(0, parts.length - 500);
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].life += dt;
      if (rings[i].life >= rings[i].max) rings.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      floats[i].life += dt;
      floats[i].y -= 46 * u * dt;
      if (floats[i].life >= floats[i].max) floats.splice(i, 1);
    }
    shake = Math.max(0, shake - dt * 60 * u);
    flash = Math.max(0, flash - dt * 1.8);
    if (boss) {
      boss.hitT = Math.max(0, (boss.hitT || 0) - dt);
      boss.gloat = Math.max(0, (boss.gloat || 0) - dt);
      if (boss.dying !== undefined) boss.dying += dt;
      boss.enter = Math.min(1, (boss.enter || 0) + dt * 0.9);
    }
    for (let i = links.length - 1; i >= 0; i--) if (links[i].a.dead || links[i].b.dead) links.splice(i, 1);
  }

  // ---- drawing

  function drawLabel(f) {
    const pl = f.plate;
    if (!pl) return;
    let x = f.x;
    let y = f.y;
    let w = pl.w;
    if (f.style !== 'pod') {
      if (f.layout === 'stack') {
        w = f.plateW || pl.w;
        x = f.x + (f.sprite.w * f.scale) / 2 + 10 * u + w / 2;
      } else y = f.y + (f.sprite.h * f.scale) / 2 + pl.h / 2 + 5 * u;
    }
    if (f.shakeT > 0) x += Math.sin(time * 70) * 5 * u * (f.shakeT / 0.4);
    f.box = { x0: x - w / 2, y0: y - pl.h / 2, x1: x + w / 2, y1: y + pl.h / 2 };
    const hint = f.mark === 'hint';
    const bad = f.mark === 'x';
    const good = f.mark === 'ok' || (f.mark && f.mark[0] === 'n');
    if (hint) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 7);
      ctx.save();
      ctx.globalAlpha = f.alpha * (0.35 + 0.4 * pulse);
      roundRect(ctx, f.box.x0 - 6 * u, f.box.y0 - 6 * u, w + 12 * u, pl.h + 12 * u, pl.h / 2);
      ctx.fillStyle = '#ffd34d';
      ctx.fill();
      ctx.restore();
    }
    roundRect(ctx, f.box.x0, f.box.y0, w, pl.h, f.style === 'pod' ? pl.h / 2 : 10 * u);
    ctx.fillStyle = good ? 'rgba(10,60,40,0.92)' : bad ? 'rgba(40,10,20,0.8)' : 'rgba(7,11,34,0.9)';
    ctx.fill();
    ctx.lineWidth = (hint ? 3.5 : 2.2) * u;
    ctx.strokeStyle = good ? '#5dffa3' : bad ? '#ff5d79' : hint ? '#ffd34d' : `hsl(${cfg.hue}, 95%, 66%)`;
    ctx.stroke();
    if (f.style === 'pod') {
      // little thrusters under each word pod
      ctx.fillStyle = good ? '#5dffa3' : bad ? '#ff5d79' : `hsla(${cfg.hue}, 95%, 66%, 0.9)`;
      const flick = 4 * u + Math.sin(time * 18 + f.phase) * 2 * u;
      for (const dx of [-pl.w * 0.24, pl.w * 0.24]) {
        ctx.beginPath();
        ctx.moveTo(x + dx - 5 * u, y + pl.h / 2);
        ctx.lineTo(x + dx + 5 * u, y + pl.h / 2);
        ctx.lineTo(x + dx, y + pl.h / 2 + flick + 5 * u);
        ctx.fill();
      }
    }
    // the label unscrambles as the ship arrives
    const shown = clamp((time - f.born - 0.3) / 0.35, 0, 1);
    ctx.font = font(pl.px);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = bad ? 'rgba(255,255,255,0.45)' : good ? '#d9ffe9' : '#ffffff';
    const lineH = pl.px * 1.14;
    pl.lines.forEach((line, i) => {
      let text = line;
      if (shown < 1) {
        const keep = Math.floor(line.length * shown);
        text = line.slice(0, keep) + line.slice(keep).replace(/\S/g, () => NOISE[Math.floor(Math.random() * NOISE.length)]);
      }
      ctx.fillText(text, x, y + (i - (pl.lines.length - 1) / 2) * lineH + pl.px * 0.06);
    });
    if (bad || good) {
      ctx.font = font(pl.px * 0.8, 800);
      ctx.fillStyle = bad ? '#ff5d79' : '#5dffa3';
      const tag = bad ? '✗' : f.mark[0] === 'n' ? f.mark.slice(1) : '✓';
      ctx.fillText(tag, f.box.x1 - 2 * u, f.box.y0 - 2 * u);
    }
  }

  function drawFoe(f) {
    ctx.save();
    ctx.globalAlpha = f.alpha;
    if (f.sprite) {
      const w = f.sprite.w * f.scale;
      const h = f.sprite.h * f.scale;
      let x = f.x;
      if (f.shakeT > 0) x += Math.sin(time * 70) * 5 * u * (f.shakeT / 0.4);
      if (f.charge > 0 || f.mark === 'hint') {
        const g = (f.mark === 'hint' ? GLOW.gold() : GLOW.red()).canvas;
        const s = h * (1.7 + 0.2 * Math.sin(time * 9));
        ctx.globalAlpha = f.alpha * 0.7;
        ctx.drawImage(g, x - s / 2, f.y - s / 2, s, s);
        ctx.globalAlpha = f.alpha;
      }
      ctx.drawImage(f.sprite.canvas, x - w / 2, f.y - h / 2, w, h);
      f.body = { x0: x - w / 2, y0: f.y - h / 2, x1: x + w / 2, y1: f.y + h / 2 };
    }
    drawLabel(f);
    ctx.restore();
  }

  function drawShip() {
    if (ship.out > 1.6) return;
    const s = shipSprite(load.ship, load.paint);
    const k = 0.92 * u;
    let x = ship.x;
    let y = ship.y;
    if (ship.boost) y -= Math.pow(ship.boost, 2.2) * H * 0.9;
    if (ship.out) {
      y -= Math.pow(ship.out, 2) * H * 0.5;
      x += Math.sin(ship.out * 30) * 6 * u;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ship.tilt * 0.5);
    ctx.scale(1 - Math.abs(ship.tilt) * 0.25, 1);
    // exhaust
    const flick = 0.75 + Math.random() * 0.5 + (ship.boost ? 2.5 : 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const [fx, fy] of design.flames) {
      const px = (fx - 50) * k;
      const py = (fy - 60) * k;
      const len = 26 * u * flick;
      const g = ctx.createLinearGradient(0, py, 0, py + len);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.35, paint.light);
      g.addColorStop(1, 'rgba(60,160,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(px - 5 * u, py);
      ctx.quadraticCurveTo(px, py + len * 1.5, px + 5 * u, py);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (ship.safe > 0 && Math.floor(time * 14) % 2 === 0 && !ship.boost) ctx.globalAlpha = 0.45;
    ctx.drawImage(s.canvas, -50 * k, -60 * k, 100 * k, 120 * k);
    ctx.globalAlpha = 1;
    if (ship.flashT > 0) {
      const g = GLOW.cyan().canvas;
      const size = 70 * u;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(g, -size / 2, -60 * k - size / 2, size, size);
    }
    if (ship.safe > 1.7) {
      // the Nova's shield bubble
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,220,120,${0.4 + 0.3 * Math.sin(time * 10)})`;
      ctx.lineWidth = 4 * u;
      ctx.beginPath();
      ctx.arc(0, 0, 66 * u, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (sky) ctx.drawImage(sky.canvas, 0, 0, W, H);
    else ctx.clearRect(0, 0, W, H);
    // drifting stars
    const warp = ship.boost ? 14 : 1;
    ctx.fillStyle = '#fff';
    for (const s of stars) {
      const y = (s.y + time * 46 * s.z * warp) % (H + 20);
      ctx.globalAlpha = 0.25 + s.z * 0.5;
      ctx.fillRect(s.x % W, y, 1.5 * s.z, (1.5 + (warp > 1 ? 16 : 0)) * s.z);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // the boss
    if (boss && !boss.gone) {
      const s = bossSprite(cfg.boss.id, cfg.hue);
      const e = easeOut(boss.enter || 0);
      let bx = boss.x + Math.sin(time * 0.7) * 14 * u;
      let by = lerp(-boss.h, boss.y, e) + Math.sin(time * 1.3) * 6 * u;
      if (boss.hitT > 0) bx += Math.sin(time * 80) * 10 * u * (boss.hitT / 0.5);
      if (boss.dying !== undefined) {
        bx += (Math.random() - 0.5) * 16 * u;
        by += boss.dying * 14 * u;
      }
      boss.dx = bx;
      boss.dy = by;
      ctx.drawImage(s.canvas, bx - boss.w / 2, by - boss.h / 2, boss.w, boss.h);
      if (boss.hitT > 0.3) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (boss.hitT - 0.3) * 4;
        ctx.drawImage(s.canvas, bx - boss.w / 2, by - boss.h / 2, boss.w, boss.h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // lightning between ships zapped in order
    for (const l of links) {
      ctx.strokeStyle = 'rgba(140,255,255,0.9)';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(l.a.x, l.a.y);
      const steps2 = 6;
      for (let i = 1; i < steps2; i++) {
        const t = i / steps2;
        ctx.lineTo(lerp(l.a.x, l.b.x, t) + (Math.random() - 0.5) * 14 * u, lerp(l.a.y, l.b.y, t) + (Math.random() - 0.5) * 14 * u);
      }
      ctx.lineTo(l.b.x, l.b.y);
      ctx.stroke();
    }

    for (const f of foes) if (!f.dead) drawFoe(f);

    // warnings: where a shot is about to go
    for (const w of warns) {
      const from = w.f && !w.f.dead && !w.column ? { x: w.f.dx || w.f.x, y: (w.f.dy || w.f.y) + (w.f.h ? w.f.h * 0.3 : 0) } : { x: w.tx, y: top };
      const a = 0.35 + 0.5 * Math.abs(Math.sin(w.t * 16));
      ctx.strokeStyle = `rgba(255,70,100,${a})`;
      ctx.lineWidth = 3 * u;
      ctx.setLineDash([10 * u, 8 * u]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(w.tx, ship.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(w.tx, ship.y, (30 - 10 * (w.t / w.dur)) * u, 0, TAU);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const b of bolts) {
      const t = b.t / b.dur;
      const hx = lerp(b.x0, b.x1, t);
      const hy = lerp(b.y0, b.y1, t);
      const tx = lerp(b.x0, b.x1, Math.max(0, t - 0.45));
      const ty = lerp(b.y0, b.y1, Math.max(0, t - 0.45));
      ctx.strokeStyle = paint.light;
      ctx.lineWidth = 7 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * u;
      ctx.stroke();
      const g = GLOW.cyan().canvas;
      ctx.drawImage(g, hx - 24 * u, hy - 24 * u, 48 * u, 48 * u);
    }
    for (const p of plasma) {
      const g = GLOW.red().canvas;
      const size = p.r * (4 + Math.sin(p.life * 30) * 0.5);
      ctx.drawImage(g, p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalCompositeOperation = 'source-over';

    drawShip();

    for (const p of parts) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
      ctx.fillStyle = p.color;
      if (p.rot !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      } else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    for (const r of rings) {
      const t = r.life / r.max;
      const rad = lerp(r.r, r.to, easeOut(t));
      if (r.glow) {
        const g = GLOW[r.glow]().canvas;
        ctx.globalAlpha = 1 - t;
        ctx.drawImage(g, r.x - rad, r.y - rad, rad * 2, rad * 2);
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = r.color + (1 - t).toFixed(3) + ')';
        ctx.lineWidth = (1 - t) * 9 * u + 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rad, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    const gem = gemSprite();
    for (const g of gems) {
      const s = (0.8 + 0.2 * Math.sin(g.spin)) * u;
      ctx.drawImage(gem.canvas, g.x - 10 * s, g.y - 13 * s, 20 * s, 26 * s);
    }
    for (const f of floats) {
      const t = f.life / f.max;
      ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - Math.pow(t, 3);
      ctx.font = `400 ${f.size}px "Russo One", ${TEXT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5 * u;
      ctx.strokeStyle = 'rgba(5,8,26,0.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (flash > 0 && !load.calm) {
      ctx.fillStyle = ship.hp < ship.max && flash <= 0.5 ? `rgba(255,60,90,${flash * 0.5})` : `rgba(255,255,255,${Math.min(0.85, flash)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (paused) return;
    for (let i = 0; i < speed; i++) {
      if (hitStop > 0 && speed === 1) hitStop -= real;
      else update(real * slow);
      if (!raf) return;
    }
    draw();
  }

  // ---- fingers

  function pointAt(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function foeAt(x, y) {
    const grow = 12 * u;
    let best = null;
    let bestD = Infinity;
    for (const f of foes) {
      if (f.dead || f.state === 'flee') continue;
      const inside = (b) => b && x >= b.x0 - grow && x <= b.x1 + grow && y >= b.y0 - grow && y <= b.y1 + grow;
      if (inside(f.box) || inside(f.body)) {
        const d = Math.hypot(x - f.x, y - f.y);
        if (d < bestD) {
          best = f;
          bestD = d;
        }
      }
    }
    return best;
  }
  function onDown(e) {
    if (paused || over) return;
    const p = pointAt(e);
    const f = foeAt(p.x, p.y);
    if (f && enc && (f.stream || enc.state === 'live' || enc.state === 'reveal')) {
      if (!f.locked && !f.aimed) {
        f.aimed = true;
        fireBolt(f, () => {
          f.aimed = false;
          struck(f);
        });
      }
      e.preventDefault();
      return;
    }
    pointerDrag = e.pointerId;
    ship.tx = clamp(p.x, 40 * u, W - 40 * u);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      /* fine without it */
    }
  }
  function onMove(e) {
    if (pointerDrag !== e.pointerId || paused || over) return;
    ship.tx = clamp(pointAt(e).x, 40 * u, W - 40 * u);
  }
  function onUp(e) {
    if (pointerDrag === e.pointerId) pointerDrag = null;
  }
  function onKey(e) {
    if (paused || over || !enc) return;
    if (e.key === 'ArrowLeft') ship.tx = clamp(ship.tx - 90 * u, 40 * u, W - 40 * u);
    else if (e.key === 'ArrowRight') ship.tx = clamp(ship.tx + 90 * u, 40 * u, W - 40 * u);
    else if (/^[1-9]$/.test(e.key)) {
      const f = foes.filter((x) => !x.dead)[Number(e.key) - 1];
      if (f && !f.locked) fireBolt(f, () => struck(f));
    }
  }

  function setPaused(on) {
    if (over && on) return;
    paused = on;
    dom.pause.hidden = !on;
    if (on) stopSpeaking();
    last = performance.now();
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'pause') {
      sfx('tap');
      setPaused(true);
    } else if (act === 'resume') setPaused(false);
    else if (act === 'restart' || act === 'quit') {
      over = true;
      cancelAnimationFrame(raf);
      raf = 0;
      cfg.onLeave && cfg.onLeave(act);
    } else if (act === 'scan') useScan();
    else if (act === 'nova') useNova();
    else if (act === 'listen') {
      if (enc && enc.step.say) speak(enc.step.say);
    } else if (act === 'read') {
      if (!enc || enc.state !== 'reading') return;
      sfx('tap');
      stopSpeaking();
      b.hidden = true;
      dom.passage.classList.remove('is-reading');
      dom.prompt.hidden = false;
      measureRegion();
      spawnWave();
      if (enc.step.say) speak(enc.step.say);
    }
  });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey);
  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  const onHide = () => {
    if (document.hidden && !over) setPaused(true);
  };
  document.addEventListener('visibilitychange', onHide);

  // ---- go

  resize();
  drawShield();
  drawTools();
  if (cfg.boss) {
    boss = { hp: cfg.boss.hp, max: cfg.boss.hp, enter: 0 };
    placeBoss();
    drawBoss();
    sfx('roar');
  }
  setMusic(cfg.boss ? 'boss' : 'battle');
  bannerText(cfg.boss ? cfg.boss.name.toUpperCase() : cfg.title.toUpperCase(), 1300);
  last = performance.now();
  raf = requestAnimationFrame(frame);
  after(cfg.boss ? 1.6 : 0.9, nextStep);

  return {
    destroy() {
      over = true;
      cancelAnimationFrame(raf);
      raf = 0;
      stopSpeaking();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onHide);
      root.remove();
    },
    pause: () => setPaused(true),
    // For the automated play-throughs: what is on screen, and a faster clock.
    debug: {
      setSpeed: (n) => (speed = n),
      look: () => ({
        over,
        paused,
        step: stepAt,
        steps: steps.length,
        type: enc ? enc.step.type : '',
        state: enc ? enc.state : '',
        key: enc ? enc.step.key : '',
        k: enc ? enc.k : 0,
        retry: !!(enc && enc.step.retry),
        foes: foes.filter((f) => !f.dead && f.state !== 'flee').map((f) => ({ id: f.id, label: f.label, ok: f.ok, seq: f.seq, locked: f.locked, mark: f.mark, stream: !!f.stream, x: f.box ? (f.box.x0 + f.box.x1) / 2 : f.x, y: f.box ? (f.box.y0 + f.box.y1) / 2 : f.y, box: f.box, body: f.body, state: f.state })),
        ship: { x: ship.x, y: ship.y, hp: ship.hp },
        plasma: plasma.map((p) => ({ x: p.x, y: p.y })),
        warns: warns.map((w) => w.tx),
        boss: boss ? { hp: boss.hp } : null,
        scans,
        nova,
        stats: { decisions: stats.decisions, firstTry: stats.firstTry, corrected: stats.corrected, crystals: stats.crystals, streak: stats.streak },
        size: { W, H, top, region },
      }),
    },
  };
}
