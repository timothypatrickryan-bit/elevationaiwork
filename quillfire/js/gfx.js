// Everything the game draws is made here, in code: ships, Garblers, bosses,
// crystals, planets and the starry backgrounds. Nothing is loaded from image
// files, so the game stays small and sharp on any screen.
//
// Each picture is drawn once onto its own small canvas (a "sprite") and then
// stamped onto the screen every frame, which is far cheaper than drawing the
// shapes again each time.

const TAU = Math.PI * 2;
const cache = new Map();

export const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

export function makeCanvas(w, h, scale = DPR()) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w * scale));
  canvas.height = Math.max(1, Math.ceil(h * scale));
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  return { canvas, ctx, w, h };
}

function sprite(key, w, h, draw) {
  let s = cache.get(key);
  if (!s) {
    s = makeCanvas(w, h);
    draw(s.ctx, w, h);
    cache.set(key, s);
  }
  return s;
}

// A tiny random-number maker that gives the same numbers for the same seed,
// so a sector's sky looks the same every visit.
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

function path(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p.length === 2) ctx.lineTo(p[0], p[1]);
    else if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    else ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
  }
  if (close) ctx.closePath();
}
const mirror = (pts, cx) => pts.map((p) => p.map((v, i) => (i % 2 === 0 ? 2 * cx - v : v)));

function fillStroke(ctx, fill, stroke, width = 2) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}
function rad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}

// ------------------------------------------------------------ player ships --

export const PAINTS = {
  teal: { name: 'Comet Teal', main: '#24d3c8', dark: '#0e8f99', light: '#9ff5ee' },
  red: { name: 'Mars Red', main: '#ff5a4d', dark: '#b3261f', light: '#ffb3a8' },
  gold: { name: 'Sun Gold', main: '#ffc531', dark: '#c98300', light: '#ffe9a3' },
  green: { name: 'Alien Green', main: '#5fe04a', dark: '#22941f', light: '#c2f7b6' },
  purple: { name: 'Nebula Purple', main: '#b06bff', dark: '#6a2fc4', light: '#dcc0ff' },
  blue: { name: 'Deep Blue', main: '#3f8cff', dark: '#1c4fc0', light: '#b2d2ff' },
  pink: { name: 'Plasma Pink', main: '#ff62c0', dark: '#bf2586', light: '#ffc0e6' },
  white: { name: 'Moon White', main: '#e8eefc', dark: '#8f9bc0', light: '#ffffff' },
};

const HULL = ['#fbfdff', '#c9d3ea', '#7f8bb0'];
const hullGrad = (ctx, x0, x1) => lin(ctx, x0, 0, x1, 0, [[0, HULL[2]], [0.35, HULL[0]], [0.65, HULL[1]], [1, HULL[2]]]);
const OUT = '#141a33';

function cockpit(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  fillStroke(ctx, lin(ctx, x - rx, y - ry, x + rx, y + ry, [[0, '#d8fbff'], [0.45, '#4fd6ff'], [1, '#1668c7']]), OUT, 1.6);
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.28, ry * 0.3, -0.4, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}
function nozzle(ctx, x, y, w) {
  ctx.fillStyle = '#39415f';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(x - w / 2, y - 5, w, 8);
  ctx.fill();
  ctx.stroke();
}

// Each design is drawn nose up inside a 100 x 120 box. `flames` lists where
// its engines are, so the battle can draw the flickering exhaust.
export const SHIPS = {
  quill: {
    name: 'Quillfire',
    flames: [[41, 104], [59, 104]],
    draw(ctx, p) {
      // wings shaped like the vanes of a feather
      const wing = [[36, 50], [6, 78, 4, 92], [14, 98], [24, 88, 38, 86]];
      for (const pts of [wing, mirror(wing, 50)]) {
        path(ctx, pts);
        fillStroke(ctx, lin(ctx, 0, 50, 0, 100, [[0, p.light], [0.5, p.main], [1, p.dark]]), OUT, 2);
      }
      ctx.strokeStyle = 'rgba(10,20,50,0.35)';
      ctx.lineWidth = 1.4;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(50 + side * (16 + i * 7), 62 + i * 7);
          ctx.lineTo(50 + side * (30 + i * 6), 84 + i * 3);
          ctx.stroke();
        }
      }
      // a hull shaped like the nib of a pen
      path(ctx, [[50, 4], [62, 28, 66, 56], [62, 92], [50, 102], [38, 92], [34, 56, 38, 28, 50, 4]]);
      fillStroke(ctx, hullGrad(ctx, 34, 66), OUT, 2);
      path(ctx, [[50, 60], [58, 70], [56, 94], [50, 100], [44, 94], [42, 70]]);
      fillStroke(ctx, lin(ctx, 0, 60, 0, 100, [[0, p.main], [1, p.dark]]), OUT, 1.5);
      ctx.strokeStyle = 'rgba(20,26,51,0.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(50, 8);
      ctx.lineTo(50, 24);
      ctx.stroke();
      cockpit(ctx, 50, 40, 7, 13);
      nozzle(ctx, 41, 100, 9);
      nozzle(ctx, 59, 100, 9);
    },
  },
  comet: {
    name: 'Comet',
    flames: [[34, 104], [50, 106], [66, 104]],
    draw(ctx, p) {
      const wing = [[44, 34], [4, 86], [10, 100], [30, 96], [42, 84]];
      for (const pts of [wing, mirror(wing, 50)]) {
        path(ctx, pts);
        fillStroke(ctx, lin(ctx, 0, 34, 0, 100, [[0, HULL[0]], [1, HULL[2]]]), OUT, 2);
      }
      const stripe = [[30, 60], [10, 88], [18, 90], [36, 66]];
      for (const pts of [stripe, mirror(stripe, 50)]) {
        path(ctx, pts);
        fillStroke(ctx, p.main, null);
      }
      path(ctx, [[50, 6], [60, 30, 62, 60], [60, 96], [50, 104], [40, 96], [38, 60, 40, 30, 50, 6]]);
      fillStroke(ctx, hullGrad(ctx, 38, 62), OUT, 2);
      path(ctx, [[50, 6], [56, 20], [50, 26], [44, 20]]);
      fillStroke(ctx, p.main, OUT, 1.4);
      cockpit(ctx, 50, 44, 6.5, 12);
      nozzle(ctx, 34, 100, 9);
      nozzle(ctx, 50, 102, 10);
      nozzle(ctx, 66, 100, 9);
    },
  },
  javelin: {
    name: 'Javelin',
    flames: [[50, 110]],
    draw(ctx, p) {
      const fin = [[44, 70], [20, 60], [14, 66], [30, 92], [44, 96]];
      for (const pts of [fin, mirror(fin, 50)]) {
        path(ctx, pts);
        fillStroke(ctx, lin(ctx, 0, 60, 0, 96, [[0, p.light], [1, p.dark]]), OUT, 2);
      }
      const canard = [[45, 30], [30, 38], [30, 44], [45, 42]];
      for (const pts of [canard, mirror(canard, 50)]) {
        path(ctx, pts);
        fillStroke(ctx, p.main, OUT, 1.5);
      }
      path(ctx, [[50, 2], [57, 26, 58, 70], [56, 102], [50, 108], [44, 102], [42, 70, 43, 26, 50, 2]]);
      fillStroke(ctx, hullGrad(ctx, 42, 58), OUT, 2);
      ctx.fillStyle = p.main;
      ctx.fillRect(43.5, 78, 13, 5);
      ctx.fillRect(43.5, 88, 13, 3);
      cockpit(ctx, 50, 46, 5, 13);
      nozzle(ctx, 50, 106, 11);
    },
  },
  manta: {
    name: 'Manta',
    flames: [[36, 100], [64, 100]],
    draw(ctx, p) {
      path(ctx, [[50, 14], [70, 30, 96, 62], [98, 80], [80, 90, 66, 92], [50, 100], [34, 92, 20, 90, 2, 80], [4, 62, 30, 30, 50, 14]]);
      fillStroke(ctx, lin(ctx, 0, 14, 0, 100, [[0, HULL[0]], [0.6, HULL[1]], [1, HULL[2]]]), OUT, 2);
      const mark = [[50, 30], [84, 72], [70, 80], [50, 62]];
      for (const pts of [mark, mirror(mark, 50)]) {
        path(ctx, pts);
        fillStroke(ctx, lin(ctx, 0, 30, 0, 80, [[0, p.light], [1, p.main]]), null);
      }
      path(ctx, [[50, 20], [58, 44], [56, 84], [50, 92], [44, 84], [42, 44]]);
      fillStroke(ctx, hullGrad(ctx, 42, 58), OUT, 1.6);
      cockpit(ctx, 50, 46, 6, 11);
      nozzle(ctx, 36, 96, 10);
      nozzle(ctx, 64, 96, 10);
    },
  },
  aurora: {
    name: 'Aurora',
    flames: [[28, 106], [72, 106]],
    draw(ctx, p) {
      path(ctx, [[30, 52], [70, 52], [74, 72], [26, 72]]);
      fillStroke(ctx, lin(ctx, 0, 52, 0, 72, [[0, p.light], [1, p.dark]]), OUT, 2);
      for (const cx of [28, 72]) {
        path(ctx, [[cx, 10], [cx + 9, 32, cx + 10, 70], [cx + 8, 100], [cx, 106], [cx - 8, 100], [cx - 10, 70, cx - 9, 32, cx, 10]]);
        fillStroke(ctx, hullGrad(ctx, cx - 10, cx + 10), OUT, 2);
        ctx.fillStyle = p.main;
        ctx.fillRect(cx - 8, 82, 16, 5);
        nozzle(ctx, cx, 104, 11);
      }
      path(ctx, [[50, 30], [58, 46], [56, 74], [50, 80], [44, 74], [42, 46]]);
      fillStroke(ctx, hullGrad(ctx, 42, 58), OUT, 2);
      cockpit(ctx, 50, 52, 5.5, 10);
    },
  },
  phoenix: {
    name: 'Golden Quill',
    flames: [[40, 104], [50, 106], [60, 104]],
    draw(ctx, p) {
      const gold = ['#fff6c9', '#ffd042', '#c98300'];
      const wing = [[36, 46], [0, 66, 2, 88], [12, 96], [20, 82, 30, 84], [22, 100], [38, 90]];
      for (const pts of [wing, mirror(wing, 50)]) {
        path(ctx, pts);
        fillStroke(ctx, lin(ctx, 0, 46, 0, 100, [[0, gold[0]], [0.5, gold[1]], [1, gold[2]]]), OUT, 2);
      }
      ctx.strokeStyle = 'rgba(120,70,0,0.5)';
      ctx.lineWidth = 1.3;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(50 + side * (14 + i * 6), 58 + i * 6);
          ctx.lineTo(50 + side * (32 + i * 4), 80 + i * 4);
          ctx.stroke();
        }
      }
      path(ctx, [[50, 2], [63, 28, 67, 56], [63, 92], [50, 104], [37, 92], [33, 56, 37, 28, 50, 2]]);
      fillStroke(ctx, lin(ctx, 33, 0, 67, 0, [[0, gold[2]], [0.35, gold[0]], [0.7, gold[1]], [1, gold[2]]]), OUT, 2);
      path(ctx, [[50, 58], [58, 70], [56, 94], [50, 100], [44, 94], [42, 70]]);
      fillStroke(ctx, lin(ctx, 0, 58, 0, 100, [[0, p.main], [1, p.dark]]), OUT, 1.5);
      cockpit(ctx, 50, 40, 7, 13);
      nozzle(ctx, 40, 100, 8);
      nozzle(ctx, 50, 102, 8);
      nozzle(ctx, 60, 100, 8);
    },
  },
};

export function shipSprite(design, paint) {
  const d = SHIPS[design] || SHIPS.quill;
  const p = PAINTS[paint] || PAINTS.teal;
  return sprite(`ship:${design}:${paint}`, 100, 120, (ctx) => d.draw(ctx, p));
}

// --------------------------------------------------------------- Garblers --

const FOES = {
  // name: [width, height, draw]
  gnat: [70, 64, (ctx, c) => {
    for (const a of [-0.9, 0, 0.9]) {
      ctx.save();
      ctx.translate(35, 30);
      ctx.rotate(a);
      path(ctx, [[-7, -14], [0, -30], [7, -14]]);
      fillStroke(ctx, c.hull, c.rim, 2);
      ctx.restore();
    }
    path(ctx, [[35, 60], [12, 46, 8, 22], [20, 10, 50, 10], [62, 22, 58, 46, 35, 60]]);
    fillStroke(ctx, c.hull, c.rim, 2.5);
    eye(ctx, 35, 30, 11, c);
  }],
  claw: [96, 70, (ctx, c) => {
    const arm = [[30, 22], [6, 18, 4, 44], [14, 66], [22, 50, 20, 40], [34, 44]];
    for (const pts of [arm, mirror(arm, 48)]) {
      path(ctx, pts);
      fillStroke(ctx, c.hull, c.rim, 2.5);
    }
    path(ctx, [[48, 6], [72, 10, 76, 34], [66, 52, 48, 58], [30, 52, 20, 34], [24, 10, 48, 6]]);
    fillStroke(ctx, c.hull, c.rim, 2.5);
    eye(ctx, 48, 30, 12, c);
  }],
  shard: [70, 92, (ctx, c) => {
    const fin = [[24, 20], [4, 8], [8, 40], [22, 52]];
    for (const pts of [fin, mirror(fin, 35)]) {
      path(ctx, pts);
      fillStroke(ctx, c.hull, c.rim, 2.5);
    }
    path(ctx, [[35, 4], [54, 20], [50, 60], [35, 88], [20, 60], [16, 20]]);
    fillStroke(ctx, c.hull, c.rim, 2.5);
    eye(ctx, 35, 34, 11, c);
    ctx.strokeStyle = c.rimSoft;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(35, 52);
    ctx.lineTo(35, 80);
    ctx.stroke();
  }],
  disc: [100, 62, (ctx, c) => {
    const n = 11;
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * TAU;
      const r = i % 2 ? 1 : 0.86;
      const x = 50 + Math.cos(a) * 46 * r;
      const y = 36 + Math.sin(a) * 20 * r;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    fillStroke(ctx, c.hull, c.rim, 2.5);
    path(ctx, [[28, 30], [30, 6, 70, 6, 72, 30], [60, 38, 40, 38, 28, 30]]);
    fillStroke(ctx, c.dome, c.rim, 2);
    eye(ctx, 50, 22, 10, c);
  }],
  hauler: [124, 60, (ctx, c) => {
    path(ctx, [[10, 14], [100, 8], [118, 30], [100, 52], [10, 46], [2, 30]]);
    fillStroke(ctx, c.hull, c.rim, 2.5);
    ctx.fillStyle = c.rimSoft;
    for (let i = 0; i < 4; i++) ctx.fillRect(16 + i * 14, 24, 8, 12);
    eye(ctx, 94, 30, 11, c);
  }],
};

function eye(ctx, x, y, r, c) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  fillStroke(ctx, rad(ctx, x - r * 0.3, y - r * 0.3, 1, r, [[0, '#ffffff'], [0.35, c.eye], [1, c.eyeDark]]), '#0a0718', 2);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.22, r * 0.62, 0, 0, TAU);
  ctx.fillStyle = '#12071e';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.18, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
}

function foeColors(ctx, hue, h) {
  return {
    hull: lin(ctx, 0, 0, 0, h, [[0, hsl(hue + 40, 30, 30)], [1, hsl(hue + 60, 40, 12)]]),
    dome: hsl(hue, 60, 34, 0.9),
    rim: hsl(hue, 95, 62),
    rimSoft: hsl(hue, 90, 60, 0.55),
    eye: '#ffe14d',
    eyeDark: '#ff8a1f',
  };
}

export const FOE_KINDS = ['gnat', 'claw', 'shard', 'disc'];
export function foeSprite(kind, hue) {
  const [w, h, draw] = FOES[kind] || FOES.gnat;
  return sprite(`foe:${kind}:${hue}`, w, h, (ctx) => draw(ctx, foeColors(ctx, hue, h)));
}

// ----------------------------------------------------------------- bosses --

// Bosses are 440 x 250. Each shares a broad hull and gets its own face.
const BOSS_FACE = {
  jumble(ctx, c) {
    // a general's helmet with a crest, and letters tumbling across the brow
    path(ctx, [[150, 96], [160, 30, 280, 30, 290, 96], [220, 110]]);
    fillStroke(ctx, c.plate, c.rim, 3);
    path(ctx, [[220, 52], [204, 22], [220, 8], [236, 22]]);
    fillStroke(ctx, c.rim, '#0a0718', 2);
    ctx.font = '900 22px "Russo One", sans-serif';
    ctx.fillStyle = c.rim;
    ctx.textAlign = 'center';
    'RJBMLEU'.split('').forEach((ch, i) => {
      ctx.save();
      ctx.translate(166 + i * 18, 78 + ((i * 7) % 11) - 5);
      ctx.rotate(((i * 37) % 9 - 4) * 0.12);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    eye(ctx, 186, 132, 22, c);
    eye(ctx, 254, 132, 22, c);
    mouth(ctx, c, 220, 186, 'teeth');
  },
  mumbler(ctx, c) {
    eye(ctx, 180, 110, 26, c);
    eye(ctx, 260, 110, 26, c);
    // a zipped mouth
    ctx.strokeStyle = c.rim;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(150, 172);
    ctx.quadraticCurveTo(220, 196, 290, 172);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 11; i++) {
      const x = 156 + i * 12.8;
      const y = 173 + Math.sin((i / 10) * Math.PI) * 11;
      ctx.beginPath();
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y + 9);
      ctx.stroke();
    }
  },
  confusion(ctx, c) {
    // spiral eyes and a tall collar
    path(ctx, [[130, 60], [150, 20], [176, 70]]);
    fillStroke(ctx, c.plate, c.rim, 3);
    path(ctx, [[310, 60], [290, 20], [264, 70]]);
    fillStroke(ctx, c.plate, c.rim, 3);
    for (const x of [182, 258]) {
      ctx.beginPath();
      ctx.arc(x, 118, 27, 0, TAU);
      fillStroke(ctx, '#fff7d6', '#0a0718', 3);
      ctx.strokeStyle = c.rimDeep;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let t = 0; t < 26; t++) {
        const a = t * 0.55;
        const r = t * 0.95;
        const px = x + Math.cos(a) * r;
        const py = 118 + Math.sin(a) * r;
        if (t) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    mouth(ctx, c, 220, 182, 'wavy');
  },
  typo(ctx, c) {
    // a crown
    path(ctx, [[160, 70], [150, 16], [182, 44], [200, 8], [220, 40], [240, 8], [258, 44], [290, 16], [280, 70]]);
    fillStroke(ctx, lin(ctx, 0, 8, 0, 70, [[0, '#fff3a8'], [1, '#f0a400']]), '#0a0718', 3);
    for (const [x, y] of [[182, 56], [220, 52], [258, 56]]) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, TAU);
      fillStroke(ctx, c.rim, '#0a0718', 2);
    }
    eye(ctx, 184, 124, 23, c);
    eye(ctx, 256, 124, 23, c);
    // long lashes
    ctx.strokeStyle = '#0a0718';
    ctx.lineWidth = 3;
    for (const x of [184, 256]) {
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + k * 12, 102);
        ctx.lineTo(x + k * 18, 90);
        ctx.stroke();
      }
    }
    mouth(ctx, c, 220, 184, 'smirk');
  },
  runon(ctx, c) {
    // a mouth that never closes, and a tongue that keeps going
    eye(ctx, 176, 104, 20, c);
    eye(ctx, 264, 104, 20, c);
    path(ctx, [[150, 150], [220, 136, 290, 150], [280, 204, 220, 214], [160, 204, 150, 150]]);
    fillStroke(ctx, '#1a0616', c.rim, 4);
    path(ctx, [[196, 190], [220, 176, 244, 190], [250, 236, 232, 246], [208, 246, 190, 236, 196, 190]]);
    fillStroke(ctx, '#ff6d8f', '#0a0718', 2.5);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) ctx.fillRect(164 + i * 20, 150, 12, 12);
  },
  garble(ctx, c) {
    // the king of static: horns, three eyes and a jagged grin
    const horn = [[150, 80], [108, 20, 96, 2], [128, 30, 180, 64]];
    for (const pts of [horn, mirror(horn, 220)]) {
      path(ctx, pts);
      fillStroke(ctx, c.plate, c.rim, 3);
    }
    eye(ctx, 174, 122, 22, c);
    eye(ctx, 266, 122, 22, c);
    eye(ctx, 220, 84, 17, c);
    mouth(ctx, c, 220, 186, 'jagged');
  },
};

function mouth(ctx, c, x, y, kind) {
  ctx.strokeStyle = c.rim;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'teeth') {
    path(ctx, [[x - 56, y - 12], [x + 56, y - 12], [x + 44, y + 18], [x - 44, y + 18]]);
    fillStroke(ctx, '#1a0616', c.rim, 4);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 48 + i * 17, y - 10);
      ctx.lineTo(x - 40 + i * 17, y + 6);
      ctx.lineTo(x - 32 + i * 17, y - 10);
      ctx.fill();
    }
    return;
  }
  if (kind === 'wavy') {
    ctx.moveTo(x - 54, y);
    for (let i = 0; i <= 8; i++) ctx.lineTo(x - 54 + i * 13.5, y + (i % 2 ? -10 : 10));
  } else if (kind === 'smirk') {
    ctx.moveTo(x - 46, y - 2);
    ctx.quadraticCurveTo(x + 6, y + 26, x + 52, y - 14);
  } else {
    ctx.moveTo(x - 62, y - 8);
    for (let i = 1; i <= 10; i++) ctx.lineTo(x - 62 + i * 12.4, y + (i % 2 ? 14 : -8));
  }
  ctx.stroke();
}

export function bossSprite(id, hue) {
  return sprite(`boss:${id}:${hue}`, 440, 250, (ctx) => {
    const c = {
      ...foeColors(ctx, hue, 250),
      plate: lin(ctx, 0, 0, 0, 250, [[0, hsl(hue + 30, 35, 36)], [1, hsl(hue + 50, 45, 14)]]),
      rimDeep: hsl(hue, 90, 40),
    };
    // wings
    const wing = [[150, 110], [60, 60, 14, 96], [2, 150], [40, 140, 70, 170], [60, 212], [150, 200]];
    for (const pts of [wing, mirror(wing, 220)]) {
      path(ctx, pts);
      fillStroke(ctx, c.plate, c.rim, 3.5);
    }
    ctx.fillStyle = c.rimSoft;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) ctx.fillRect(220 + side * (120 + i * 22) - 5, 138 + i * 4, 10, 26);
    }
    // body
    path(ctx, [[220, 40], [300, 44, 330, 110], [320, 190, 220, 236], [120, 190, 110, 110], [140, 44, 220, 40]]);
    fillStroke(ctx, c.hull, c.rim, 4);
    (BOSS_FACE[id] || BOSS_FACE.garble)(ctx, c);
  });
}

// --------------------------------------------------------- small pictures --

export function gemSprite() {
  return sprite('gem', 20, 26, (ctx) => {
    path(ctx, [[10, 1], [19, 10], [10, 25], [1, 10]]);
    fillStroke(ctx, lin(ctx, 0, 0, 20, 26, [[0, '#f4ffff'], [0.4, '#58f0ff'], [1, '#1b7fe0']]), '#0b2a5c', 1.5);
    path(ctx, [[10, 1], [13, 10], [10, 25], [7, 10]]);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
  });
}

export function glowSprite(name, colors) {
  return sprite('glow:' + name, 128, 128, (ctx) => {
    ctx.fillStyle = rad(ctx, 64, 64, 0, 64, colors.map((color, i) => [i / (colors.length - 1), color]));
    ctx.fillRect(0, 0, 128, 128);
  });
}
export const GLOW = {
  white: () => glowSprite('white', ['rgba(255,255,255,1)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']),
  fire: () => glowSprite('fire', ['rgba(255,255,240,1)', 'rgba(255,214,80,0.85)', 'rgba(255,110,40,0.4)', 'rgba(255,60,20,0)']),
  cyan: () => glowSprite('cyan', ['rgba(240,255,255,1)', 'rgba(90,235,255,0.7)', 'rgba(40,140,255,0)']),
  red: () => glowSprite('red', ['rgba(255,245,235,1)', 'rgba(255,90,110,0.8)', 'rgba(255,30,90,0)']),
  gold: () => glowSprite('gold', ['rgba(255,255,230,1)', 'rgba(255,205,70,0.75)', 'rgba(255,160,20,0)']),
};

export function planet(ctx, x, y, r, hue, { ring = false, seed = 1, craters = false } = {}) {
  const rnd = rng(seed * 977 + hue);
  ctx.save();
  if (ring) {
    ctx.strokeStyle = hsl(hue + 30, 70, 78, 0.55);
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.7, r * 0.42, -0.35, Math.PI * 0.02, Math.PI * 0.98);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = rad(ctx, x - r * 0.4, y - r * 0.45, r * 0.1, r * 1.25, [[0, hsl(hue, 85, 78)], [0.55, hsl(hue, 75, 50)], [1, hsl(hue + 25, 80, 18)]]);
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? hsl(hue - 20, 80, 82) : hsl(hue + 30, 80, 26);
    const yy = y - r + rnd() * r * 2;
    ctx.beginPath();
    ctx.ellipse(x, yy, r * 1.3, r * (0.06 + rnd() * 0.1), -0.2, 0, TAU);
    ctx.fill();
  }
  if (craters) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = hsl(hue + 20, 60, 20);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(x - r + rnd() * r * 2, y - r + rnd() * r * 2, r * (0.06 + rnd() * 0.1), 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  if (ring) {
    ctx.save();
    ctx.strokeStyle = hsl(hue + 30, 70, 82, 0.8);
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.7, r * 0.42, -0.35, Math.PI * 1.02, Math.PI * 1.98);
    ctx.stroke();
    ctx.restore();
  }
}

// The sky of a sector: a deep gradient, a few soft clouds of gas, a scatter of
// fixed stars and one planet. Drawn once per battle at the size of the screen.
export function background(w, h, hue, seed = 7) {
  const s = makeCanvas(w, h, Math.min(DPR(), 1.5));
  const { ctx } = s;
  const rnd = rng(seed * 131 + hue);
  ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, hsl(hue + 30, 60, 7)], [0.55, hsl(hue + 10, 55, 10)], [1, hsl(hue - 20, 60, 5)]]);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (0.25 + rnd() * 0.35) * Math.max(w, h);
    const tint = hue + (rnd() - 0.5) * 80;
    ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, hsl(tint, 80, 45, 0.16)], [0.5, hsl(tint, 80, 35, 0.07)], [1, hsl(tint, 80, 30, 0)]]);
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
  const stars = Math.round((w * h) / 5200);
  for (let i = 0; i < stars; i++) {
    const size = rnd() < 0.9 ? 1 : 2;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`;
    ctx.fillRect(rnd() * w, rnd() * h, size, size);
  }
  const pr = Math.min(w, h) * (0.1 + rnd() * 0.06);
  planet(ctx, rnd() < 0.5 ? pr * 1.1 : w - pr * 1.1, h * (0.62 + rnd() * 0.2), pr, hue + 150 * (rnd() < 0.5 ? 1 : -1), { ring: rnd() < 0.5, seed, craters: true });
  // a darker floor so the ship and the buttons stand out
  ctx.fillStyle = lin(ctx, 0, h * 0.7, 0, h, [[0, 'rgba(2,4,14,0)'], [1, 'rgba(2,4,14,0.55)']]);
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
  return s;
}

// A rounded rectangle path (Safari 15 has no ctx.roundRect).
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function clearSprites() {
  cache.clear();
}
