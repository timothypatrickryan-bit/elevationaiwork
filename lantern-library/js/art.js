// All drawings in the game, as inline SVG strings. Colors come from CSS custom
// properties (see css/app.css) so the art follows the palette.

let uid = 0;
const nextId = (prefix) => prefix + ++uid;

// ---------------------------------------------------------------- icons ----

const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  speaker: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor" stroke-linejoin="round"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor"/>',
  book: '<path d="M3 6.5c3-1.6 6-1.6 9 0v12.5c-3-1.6-6-1.6-9 0V6.5zM12 6.5c3-1.6 6-1.6 9 0v12.5c-3-1.6-6-1.6-9 0"/>',
  jar: '<path d="M8.5 3h7v3h-7zM7.5 6h9c1.3 1 2.2 2.3 2.2 4.2v7.6A3.2 3.2 0 0 1 15.5 21h-7a3.2 3.2 0 0 1-3.2-3.200v-7.600C5.300 8.300 6.200 7 7.500 6z"/><circle cx="10" cy="14" r="1" fill="currentColor"/><circle cx="14.200" cy="11.500" r="1" fill="currentColor"/><circle cx="13.500" cy="16.800" r="1" fill="currentColor"/>',
  badge: '<circle cx="12" cy="9.500" r="5.500"/><path d="M8.700 14.200L7 21l5-2.600L17 21l-1.700-6.800"/>',
  again: '<path d="M4.500 12a7.500 7.500 0 1 0 2.300-5.400M4.500 4.500v4.800h4.800"/>',
  chat: '<path d="M4 6.500A2.500 2.500 0 0 1 6.500 4h11A2.500 2.500 0 0 1 20 6.500v7a2.500 2.500 0 0 1-2.500 2.500H11l-4.500 4v-4A2.500 2.500 0 0 1 4 13.500v-7z"/>',
  clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
  play: '<path d="M8 5.500v13l10.500-6.500L8 5.500z" fill="currentColor" stroke-linejoin="round"/>',
  home: '<path d="M4 11l8-7 8 7v8.500a1 1 0 0 1-1 1h-4.500V14h-5v6.500H5a1 1 0 0 1-1-1V11z"/>',
  wand: '<path d="M5 19L16 8M14 6l1-2.500L16 6l2.500 1L16 8l-1 2.500L14 8l-2.500-1L14 6zM18.500 13.500l.600-1.500.600 1.500 1.500.600-1.500.600-.600 1.500-.600-1.500-1.500-.600 1.500-.600z"/>',
  text: '<path d="M3.500 18L8 6l4.500 12M5.200 14h5.600M14.500 18l3-8 3 8M15.600 15.500h3.800"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M6 12h12M12 6v12"/>',
  people: '<circle cx="9" cy="8.500" r="3.200"/><path d="M3 19.500c0-3.300 2.700-5.500 6-5.500s6 2.200 6 5.500M16 5.700a3 3 0 0 1 0 5.600M17.500 14.300c2.100.700 3.500 2.500 3.500 5.200"/>',
  bulb: '<path d="M9 17.500h6M10 20.500h4M8.500 14.500A6 6 0 1 1 15.500 14.500c-.600.600-.900 1.300-.900 2v1H9.400v-1c0-.700-.300-1.400-.900-2z"/>',
};

const SOLID = {
  star: '<path d="M12 2.600l2.900 6 6.600.900-4.800 4.600 1.200 6.600L12 17.500l-5.900 3.200 1.200-6.600L2.500 9.500l6.600-.900L12 2.600z"/>',
  spark: '<path d="M12 2c.700 5.300 2.700 7.300 8 8-5.300.700-7.300 2.700-8 8-.700-5.300-2.700-7.300-8-8 5.300-.700 7.300-2.700 8-8z"/><path d="M19 15.500c.300 2 1 2.700 3 3-2 .300-2.700 1-3 3-.300-2-1-2.700-3-3 2-.300 2.700-1 3-3z"/>',
  flame: '<path d="M12.300 2.500c.600 3.200 5.200 5.400 5.200 10.700a5.500 5.500 0 0 1-11 0c0-2.200 1-3.600 2.100-4.700.300 1.900 1.200 2.700 2 2.900-.800-3.100-.300-6.300 1.700-8.900z"/>',
};

export function icon(name, cls = '') {
  if (SOLID[name]) {
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${SOLID[name]}</svg>`;
  }
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

export function stars(count, total = 3) {
  let out = `<span class="stars" role="img" aria-label="${count} of ${total} stars">`;
  for (let i = 0; i < total; i++) out += `<span class="star${i < count ? ' is-on' : ''}">${icon('star')}</span>`;
  return out + '</span>';
}

// -------------------------------------------------------------- lantern ----

// lit: 0 (dark) to 3 (brightest). Color comes from --h on the element or a parent.
export function lantern(lit = 0, cls = '') {
  let flame = '';
  if (lit > 0) {
    // A teardrop that always sits on the lantern floor and grows with `lit`.
    const r = 3 + lit;
    const cy = 47 - r;
    const tip = cy - 2.1 * r;
    const n = (v) => +v.toFixed(1);
    flame = `<path class="lantern-flame" d="M24 ${n(tip)}C${n(24 + 0.7 * r)} ${n(tip + 0.9 * r)} ${24 + r} ${n(cy - 0.6 * r)} ${24 + r} ${cy}A${r} ${r} 0 0 1 ${24 - r} ${cy}C${24 - r} ${n(cy - 0.6 * r)} ${n(24 - 0.7 * r)} ${n(tip + 0.9 * r)} 24 ${n(tip)}z"/>`;
  }
  const g = nextId('lantern');
  return `<svg class="lantern ${cls}" data-lit="${lit}" viewBox="0 0 48 64" aria-hidden="true">
    <defs><radialGradient id="${g}">
      <stop offset="0" style="stop-color:var(--h);stop-opacity:.6"/>
      <stop offset=".5" style="stop-color:var(--h);stop-opacity:.2"/>
      <stop offset="1" style="stop-color:var(--h);stop-opacity:0"/>
    </radialGradient></defs>
    <circle class="lantern-halo" cx="24" cy="34" r="34" fill="url(#${g})"/>
    <path class="lantern-metal" d="M24 2.500a4.500 4.500 0 1 1 0 9 4.500 4.500 0 0 1 0-9zm0 2.500a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
    <path class="lantern-metal" d="M15.500 11h17l3.500 6.500H12L15.500 11z"/>
    <rect class="lantern-glass" x="12.500" y="17.500" width="23" height="33" rx="5"/>
    ${flame}
    <path class="lantern-bars" d="M20 17.500v33M28 17.500v33" />
    <rect class="lantern-metal" x="10" y="50.500" width="28" height="7" rx="2.500"/>
    <rect class="lantern-metal" x="15" y="57.500" width="18" height="3.500" rx="1.500"/>
  </svg>`;
}

// ------------------------------------------------------------------ Glim ----

export const GLOWS = ['gold', 'ember', 'mint', 'sky', 'violet', 'rose'];

const MOUTHS = {
  smile: '<path d="M52.500 87q7.500 6.500 15 0" fill="none" stroke="#2a1840" stroke-width="2.600" stroke-linecap="round"/>',
  cheer: '<path d="M51 85.500q9 12 18 0z" fill="#2a1840"/><path d="M55.500 90.500q4.500 3 9 0-4.500 4.500-9 0z" fill="#ff8fa3"/>',
  think: '<path d="M54 89.500q6-2.500 12 0" fill="none" stroke="#2a1840" stroke-width="2.600" stroke-linecap="round"/>',
  wow: '<ellipse cx="60" cy="89.500" rx="4" ry="5" fill="#2a1840"/>',
};

const WEAR = {
  // head
  wizard:
    '<path d="M60 0l21 44H39L60 0z" fill="#6d4fd6"/><ellipse cx="60" cy="44" rx="30" ry="7" fill="#5038b0"/><path d="M57 20l1.800 3.600 4 .600-2.900 2.800.700 4-3.600-1.900-3.600 1.900.700-4-2.900-2.800 4-.600z" fill="#ffc94a"/><circle cx="67" cy="34" r="1.800" fill="#ffc94a"/>',
  crown:
    '<path d="M40 44V24l10 9 10-15 10 15 10-9v20z" fill="#f3a712" stroke="#c97a00" stroke-width="1.500" stroke-linejoin="round"/><circle cx="60" cy="36" r="3" fill="#ff5d7a"/><circle cx="48" cy="38" r="2" fill="#6fc3ff"/><circle cx="72" cy="38" r="2" fill="#6fc3ff"/>',
  explorer:
    '<ellipse cx="60" cy="44" rx="36" ry="8" fill="#b98a4a"/><path d="M40 44c0-16 8-24 20-24s20 8 20 24z" fill="#d2a565"/><path d="M40.500 40h39v4.500h-39z" fill="#7a4f25"/>',
  bow: '<path d="M80 44l-15-9v18z" fill="#ff5d7a"/><path d="M80 44l15-9v18z" fill="#ff5d7a"/><circle cx="80" cy="44" r="4.500" fill="#e03a5c"/>',
  flower:
    '<g transform="translate(83 46)"><circle cx="0" cy="-7" r="5" fill="#ff9ebd"/><circle cx="6.700" cy="-2.200" r="5" fill="#ff9ebd"/><circle cx="4.100" cy="5.700" r="5" fill="#ff9ebd"/><circle cx="-4.100" cy="5.700" r="5" fill="#ff9ebd"/><circle cx="-6.700" cy="-2.200" r="5" fill="#ff9ebd"/><circle r="4" fill="#ffe27a"/></g>',
  headphones:
    '<path d="M27 74V66a33 33 0 0 1 66 0v8" fill="none" stroke="#2a1840" stroke-width="5" stroke-linecap="round"/><rect x="18" y="64" width="13" height="22" rx="6" fill="#6fc3ff" stroke="#2a1840" stroke-width="2"/><rect x="89" y="64" width="13" height="22" rx="6" fill="#6fc3ff" stroke="#2a1840" stroke-width="2"/>',
  // face
  glasses:
    '<g fill="rgba(255,255,255,.28)" stroke="#2a1840" stroke-width="2.600"><circle cx="47" cy="73" r="10"/><circle cx="73" cy="73" r="10"/></g><path d="M57 72q3-2.500 6 0" fill="none" stroke="#2a1840" stroke-width="2.600" stroke-linecap="round"/>',
  // body
  scarf:
    '<path d="M29 94q31 15 62 0l1.500 8q-32.500 15-65 0z" fill="#3fd6c6"/><path d="M76 104l9 16-10 1-5-15z" fill="#2fb3a5"/><path d="M36 99.500l2 6M46 102.500l1.500 6.500M58 104v7M70 103l-1 7" stroke="#eafffb" stroke-width="2" stroke-linecap="round"/>',
  book: '<path d="M60 97c-7-3.500-14-3.500-21-1v15c7-2.500 14-2.500 21 1z" fill="#fff7e0" stroke="#2a1840" stroke-width="2" stroke-linejoin="round"/><path d="M60 97c7-3.500 14-3.500 21-1v15c-7-2.500-14-2.500-21 1z" fill="#fff7e0" stroke="#2a1840" stroke-width="2" stroke-linejoin="round"/><path d="M44 101.500q5-1 11 .500M44 105.500q5-1 11 .500M65 102q6-1.500 11-.500M65 106q6-1.500 11-.500" stroke="#b9a98a" stroke-width="1.400" fill="none"/>',
};

export const WEAR_SLOTS = {
  wizard: 'head',
  crown: 'head',
  explorer: 'head',
  bow: 'head',
  flower: 'head',
  headphones: 'head',
  glasses: 'face',
  scarf: 'body',
  book: 'body',
};

// Glim, the little lantern spark. wear = list of item ids; mood picks the mouth.
export function glim({ glow = 'gold', wear = [], mood = 'smile', cls = '' } = {}) {
  const g = nextId('glim');
  const layers = wear.filter((w) => WEAR[w]);
  const under = layers.filter((w) => w === 'headphones').map((w) => WEAR[w]).join('');
  const over = layers.filter((w) => w !== 'headphones').map((w) => WEAR[w]).join('');
  return `<svg class="glim ${cls}" data-glow="${glow}" data-mood="${mood}" viewBox="-10 -8 140 140" role="img" aria-label="Glim">
    <defs>
      <radialGradient id="${g}h" cx="50%" cy="50%" r="50%">
        <stop offset="0" style="stop-color:var(--g2);stop-opacity:.55"/>
        <stop offset=".6" style="stop-color:var(--g2);stop-opacity:.16"/>
        <stop offset="1" style="stop-color:var(--g2);stop-opacity:0"/>
      </radialGradient>
      <radialGradient id="${g}b" cx="50%" cy="72%" r="62%">
        <stop offset="0" style="stop-color:var(--g1)"/>
        <stop offset=".55" style="stop-color:var(--g2)"/>
        <stop offset="1" style="stop-color:var(--g3)"/>
      </radialGradient>
    </defs>
    <circle class="glim-halo" cx="60" cy="68" r="66" fill="url(#${g}h)"/>
    <g class="glim-body">
      <path d="M60 14c13 17 37 32 37 58a37 37 0 0 1-74 0c0-26 24-41 37-58z" fill="url(#${g}b)"/>
      <ellipse cx="60" cy="88" rx="24" ry="17" fill="#fff" opacity=".22"/>
      ${under}
      <g class="glim-eyes" fill="#2a1840">
        <ellipse cx="47" cy="73" rx="5.200" ry="6.800"/><ellipse cx="73" cy="73" rx="5.200" ry="6.800"/>
      </g>
      <circle cx="49" cy="70.500" r="1.900" fill="#fff"/><circle cx="75" cy="70.500" r="1.900" fill="#fff"/>
      <ellipse cx="38.500" cy="85" rx="5.500" ry="3.400" fill="#ff7a8a" opacity=".45"/>
      <ellipse cx="81.500" cy="85" rx="5.500" ry="3.400" fill="#ff7a8a" opacity=".45"/>
      ${MOUTHS[mood] || MOUTHS.smile}
      ${over}
    </g>
  </svg>`;
}

// One wardrobe item drawn alone, for the shop tiles.
export function wearPreview(item) {
  return glim({ glow: 'gold', wear: [item], mood: 'smile', cls: 'glim-still' });
}

// ---------------------------------------------------------------- covers ----
// 120 x 160 book covers: the book's hue as the ground, night-ink silhouettes,
// lamp-white highlights.

const COVERS = {
  lighthouse: `
    <path class="c-light" opacity=".30" d="M60 46L-6 20v40z"/><path class="c-light" opacity=".30" d="M60 46l66-26v40z"/>
    <path class="c-ink" d="M0 132q15-9 30 0t30 0 30 0 30 0v28H0z"/>
    <path class="c-ink" d="M32 136l8-14h40l8 14z"/>
    <path class="c-light" d="M48 124l5-66h14l5 66z"/>
    <path class="c-hue-deep" d="M51.500 84h17l1 13h-19zM50 110h20l.800 12H49.200z"/>
    <rect class="c-ink" x="47" y="40" width="26" height="18" rx="2"/>
    <circle class="c-glow" cx="60" cy="48.500" r="6"/>
    <path class="c-ink" d="M44 40l16-12 16 12z"/>
    <path class="c-ink" opacity=".5" d="M0 146q15-8 30 0t30 0 30 0 30 0v14H0z"/>`,
  butterfly: `
    <path class="c-ink" d="M58 76C40 40 12 44 14 66c1 14 20 20 44 14z"/><path class="c-ink" d="M62 76c18-36 46-32 44-10-1 14-20 20-44 14z"/>
    <path class="c-ink" d="M58 84c-22 0-34 12-30 26 4 12 22 8 30-20z"/><path class="c-ink" d="M62 84c22 0 34 12 30 26-4 12-22 8-30-20z"/>
    <path class="c-glow" d="M52 72C42 54 26 54 24 66c0 8 14 10 28 8z"/><path class="c-glow" d="M68 72c10-18 26-18 28-6 0 8-14 10-28 8z"/>
    <path class="c-glow" d="M54 90c-12 2-20 9-17 17 4 5 13-2 17-17z"/><path class="c-glow" d="M66 90c12 2 20 9 17 17-4 5-13-2-17-17z"/>
    <g class="c-light"><circle cx="22" cy="60" r="2.200"/><circle cx="98" cy="60" r="2.200"/><circle cx="34" cy="104" r="2"/><circle cx="86" cy="104" r="2"/></g>
    <rect class="c-ink" x="57" y="64" width="6" height="42" rx="3"/>
    <path d="M59 66Q52 50 44 48M61 66q7-16 15-18" fill="none" stroke-width="2.200" stroke-linecap="round" class="c-ink-stroke"/>
    <path class="c-ink" opacity=".45" d="M0 150q20-18 44-10 10-22 34-14 22-14 42 4v30H0z"/>`,
  compass: `
    <path d="M10 136q18-22 34-10t26-20 28-8 16-22" fill="none" stroke-width="2.600" stroke-dasharray="1 7" stroke-linecap="round" class="c-light-stroke" opacity=".8"/>
    <circle class="c-ink" cx="60" cy="72" r="42"/>
    <circle cx="60" cy="72" r="35" fill="none" stroke-width="2" class="c-light-stroke" opacity=".55"/>
    <path class="c-light" d="M60 34l9 38H51z"/><path class="c-glow" d="M60 110l-9-38h18z"/>
    <path class="c-light" opacity=".55" d="M22 72l38-8v16z"/><path class="c-light" opacity=".55" d="M98 72l-38 8V64z"/>
    <circle class="c-ink" cx="60" cy="72" r="5"/><circle class="c-glow" cx="60" cy="72" r="2.200"/>
    <path class="c-ink" opacity=".5" d="M0 160l26-34 16 18 22-30 22 26 14-14 20 34z"/>`,
  bulb: `
    <g class="c-light-stroke" stroke-width="3.200" stroke-linecap="round" opacity=".85"><path d="M60 14v12M22 30l9 9M98 30l-9 9M8 66h12M112 66h-12"/></g>
    <path class="c-light" d="M60 32a32 32 0 0 0-19 57.800c4 3.200 6 7 6 11.200v3h26v-3c0-4.200 2-8 6-11.200A32 32 0 0 0 60 32z"/>
    <path class="c-glow" d="M60 44a20 20 0 0 0-12 36c3 2.400 5 5.400 5.600 9h12.800c.600-3.600 2.600-6.600 5.600-9a20 20 0 0 0-12-36z"/>
    <path d="M52 88l-4-20 6 5 6-7 6 7 6-5-4 20" fill="none" stroke-width="2.600" stroke-linejoin="round" stroke-linecap="round" class="c-ink-stroke"/>
    <rect class="c-ink" x="46" y="104" width="28" height="7" rx="2.500"/><rect class="c-ink" x="48" y="113" width="24" height="6" rx="2.500"/><path class="c-ink" d="M53 121h14l-3 7h-8z"/>
    <path class="c-ink" opacity=".45" d="M0 160v-14q30-12 60-4t60-6v24z"/>`,
  moon: `
    <path d="M86 0v40" stroke-width="2" class="c-ink-stroke"/>
    <path class="c-ink" d="M77 40h18l3 6H74zM76 46h20v26H76zM74 72h24v5H74z"/><rect class="c-glow" x="80" y="50" width="12" height="18" rx="3"/>
    <path class="c-light" d="M58 46a36 36 0 1 0 26 60A30 30 0 0 1 58 46z"/>
    <g class="c-light"><path d="M24 30l1.800 4.200 4.200 1.800-4.200 1.800L24 42l-1.800-4.200-4.200-1.800 4.200-1.800z"/><circle cx="40" cy="16" r="1.800"/><circle cx="104" cy="96" r="1.800"/><circle cx="14" cy="64" r="1.600"/><path d="M100 118l1.300 3 3 1.300-3 1.300-1.300 3-1.300-3-3-1.300 3-1.300z"/></g>
    <path class="c-ink" opacity=".5" d="M0 160v-20q22-14 44-6t38-4 38 2v28z"/>`,
  planet: `
    <g class="c-light"><circle cx="18" cy="24" r="1.800"/><circle cx="96" cy="16" r="2.200"/><circle cx="106" cy="52" r="1.500"/><circle cx="12" cy="92" r="1.600"/><path d="M34 44l1.500 3.500 3.500 1.500-3.500 1.500L34 54l-1.500-3.500L29 49l3.500-1.500z"/></g>
    <circle class="c-light" cx="62" cy="68" r="28"/>
    <path class="c-glow" opacity=".75" d="M36 58q26 10 52 0a28 28 0 0 1 1.800 7q-28 11-55.600 0A28 28 0 0 1 36 58zM35.500 77q26.500 9 53 0a28 28 0 0 1-3.500 7.500q-23 6-46 0A28 28 0 0 1 35.500 77z"/>
    <path d="M22 84q-14-8 6-20M102 52q16 8-6 22-30 17-62 12" fill="none" stroke-width="4.500" stroke-linecap="round" class="c-ink-stroke"/>
    <path class="c-ink" d="M0 160l24-40 12 14 20-28 8 10 10-8 20 26 12-10 14 20v16z"/>
    <path class="c-glow" d="M56 106l8 10-5-2-3 4-3-5z" opacity=".9"/>`,
};

export function cover(id, cls = '') {
  return `<svg class="cover-art ${cls}" viewBox="0 0 120 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect class="c-hue" width="120" height="160"/>
    ${COVERS[id] || COVERS.lighthouse}
  </svg>`;
}

// ------------------------------------------------------------- firefly jar ----

function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// levels: one entry per collected word, 0 (dim) to 2 (golden).
export function jar(levels) {
  const rnd = seeded(7 + levels.length * 13);
  const flies = levels
    .slice(0, 48)
    .map((lv, i) => {
      const x = 58 + rnd() * 84;
      const y = 78 + rnd() * 108;
      const r = 2.600 + lv * 1.100;
      return `<g class="fly fly-${lv}" style="animation-delay:-${(rnd() * 6).toFixed(2)}s;animation-duration:${(5 + rnd() * 5).toFixed(2)}s"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.600).toFixed(1)}" class="fly-halo"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" class="fly-dot"/></g>`;
    })
    .join('');
  return `<svg class="jar" viewBox="0 0 200 220" role="img" aria-label="A jar holding ${levels.length} fireflies">
    <rect class="jar-lid" x="62" y="14" width="76" height="20" rx="6"/>
    <path class="jar-glass" d="M66 34h68v10c18 8 28 22 28 44v84a26 26 0 0 1-26 26H64a26 26 0 0 1-26-26V88c0-22 10-36 28-44V34z"/>
    <path class="jar-shine" d="M54 92c0-14 6-24 16-30" />
    ${flies}
  </svg>`;
}

// ---------------------------------------------------------------- badges ----

const BADGE_ART = {
  flame: SOLID.flame,
  star: SOLID.star,
  spark: SOLID.spark,
  book: '<path d="M3.500 6.500c3-1.400 5.500-1.400 8.500 0v12c-3-1.400-5.500-1.400-8.500 0zM12 6.500c3-1.400 5.500-1.400 8.500 0v12c-3-1.400-5.500-1.400-8.500 0z"/>',
  eye: '<path d="M2 12c2.500-4.500 6-6.800 10-6.800S19.500 7.500 22 12c-2.500 4.500-6 6.800-10 6.800S4.500 16.500 2 12zm10-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
  jar: '<path d="M8.500 3h7v3h-7zM7.500 6.800h9c1.300 1 2.200 2.300 2.200 4.200v6.800A3.200 3.200 0 0 1 15.500 21h-7a3.200 3.200 0 0 1-3.200-3.200V11c0-1.900.900-3.200 2.200-4.200z"/>',
  crown: '<path d="M3.500 18.500V7.500l5 4.500 3.500-7 3.500 7 5-4.500v11z"/>',
  heart: '<path d="M12 20.500S3.500 15.300 3.500 9.300A4.600 4.600 0 0 1 12 6.800a4.600 4.600 0 0 1 8.500 2.500c0 6-8.500 11.200-8.500 11.200z"/>',
  moon: '<path d="M15 3a9.500 9.500 0 1 0 6 16.500A8 8 0 0 1 15 3z"/>',
  compass: '<path d="M12 2.500a9.500 9.500 0 1 0 0 19 9.500 9.500 0 0 0 0-19zm4 5.500l-2.500 5.500L8 16l2.500-5.500z"/>',
  bolt: '<path d="M13.500 2.500L5 13.500h5.500l-1 8L18 10.500h-5.500z"/>',
  key: '<path d="M8 9a5 5 0 1 1 4.700 6.700L11 17.500H9v2H7v2H3.500v-3.300l6-6A5 5 0 0 1 8 9zm7-2a1.800 1.800 0 1 0 0 3.600A1.800 1.800 0 0 0 15 7z"/>',
};

export function badgeArt(name) {
  return `<svg class="badge-art" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${BADGE_ART[name] || BADGE_ART.star}</svg>`;
}
