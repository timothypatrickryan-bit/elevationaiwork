// All drawings in the game, as inline SVG strings. Colors come from CSS
// custom properties (css/app.css) wherever they belong to the palette.

let uid = 0;
const nextId = (prefix) => prefix + ++uid;

// ---------------------------------------------------------------- icons ----

const LINE = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.500 4.500L19 7.500"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  speaker: '<path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500H4z" fill="currentColor" stroke-linejoin="round"/><path d="M15.500 9a4.200 4.200 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11"/>',
  chat: '<path d="M4 6.500A2.500 2.500 0 0 1 6.500 4h11A2.500 2.500 0 0 1 20 6.500v7a2.500 2.500 0 0 1-2.500 2.500H11l-4.500 4v-4A2.500 2.500 0 0 1 4 13.500v-7z"/>',
  slow: '<path d="M4 15.500c0-4.500 3-7.500 7-7.500s7 3 7 7.500z"/><path d="M18 13.500c1.800-.300 3 .600 3 2M6.500 15.500V18M15.500 15.500V18M8.500 11.500l1.500 2M12.500 9.500v3"/>',
  eye: '<path d="M2.500 12c2.400-4.300 5.700-6.500 9.500-6.500s7.100 2.200 9.500 6.500c-2.400 4.300-5.700 6.500-9.500 6.500S4.900 16.300 2.500 12z"/><circle cx="12" cy="12" r="3"/>',
  hide: '<path d="M4 4l16 16M9.900 5.800A9.500 9.500 0 0 1 12 5.500c3.800 0 7.100 2.200 9.500 6.500a15 15 0 0 1-3.200 4M6.300 7.700A14.500 14.500 0 0 0 2.500 12c2.400 4.300 5.700 6.500 9.500 6.500 1.300 0 2.500-.250 3.700-.750"/>',
  backspace: '<path d="M9 5.500h10.500a1.500 1.500 0 0 1 1.500 1.500v10a1.500 1.500 0 0 1-1.500 1.500H9L3 12z"/><path d="M12 9.500l5 5M17 9.500l-5 5"/>',
  book: '<path d="M3 6.500c3-1.600 6-1.600 9 0v12.500c-3-1.600-6-1.600-9 0V6.500zM12 6.500c3-1.600 6-1.600 9 0v12.500c-3-1.600-6-1.600-9 0"/>',
  jar: '<path d="M9.500 3h5v5.200c3.300 1.300 5.500 4 5.500 7.300 0 3-3.600 5.500-8 5.500s-8-2.500-8-5.500c0-3.300 2.200-6 5.500-7.300V3z"/><path d="M5.500 14.500c2 1.200 4.300 1.200 6.500 0s4.500-1.200 6.500 0"/>',
  badge: '<circle cx="12" cy="9.500" r="5.500"/><path d="M8.700 14.200L7 21l5-2.600L17 21l-1.700-6.800"/>',
  again: '<path d="M4.500 12a7.500 7.500 0 1 0 2.300-5.400M4.500 4.500v4.800h4.800"/>',
  people: '<circle cx="9" cy="8.500" r="3.200"/><path d="M3 19.500c0-3.300 2.700-5.500 6-5.500s6 2.200 6 5.500M16 5.700a3 3 0 0 1 0 5.600M17.500 14.300c2.100.700 3.500 2.500 3.500 5.200"/>',
  bulb: '<path d="M9 17.500h6M10 20.500h4M8.500 14.500A6 6 0 1 1 15.500 14.500c-.600.600-.900 1.300-.900 2v1H9.400v-1c0-.700-.300-1.400-.900-2z"/>',
  paw: '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6.500" r="2"/><circle cx="17" cy="9" r="2"/><path d="M7.500 16.500c0-2.500 2-4.500 4.500-4.500s4.500 2 4.500 4.500c0 1.500-1.200 2.500-2.500 2.500-.800 0-1.300-.500-2-.500s-1.200.500-2 .500c-1.300 0-2.500-1-2.500-2.500z"/>',
  clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M6 12h12M12 6v12"/>',
};

const SOLID = {
  star: '<path d="M12 2.600l2.900 6 6.600.900-4.800 4.600 1.200 6.600L12 17.500l-5.900 3.200 1.200-6.600L2.500 9.500l6.600-.900L12 2.600z"/>',
  spark: '<path d="M12 2c.700 5.300 2.700 7.300 8 8-5.300.700-7.300 2.700-8 8-.700-5.300-2.700-7.300-8-8 5.300-.700 7.300-2.700 8-8z"/><path d="M19 15.500c.300 2 1 2.700 3 3-2 .300-2.700 1-3 3-.300-2-1-2.700-3-3 2-.300 2.700-1 3-3z"/>',
  flame: '<path d="M12.300 2.500c.600 3.200 5.200 5.400 5.200 10.700a5.500 5.500 0 0 1-11 0c0-2.200 1-3.600 2.100-4.700.300 1.900 1.200 2.700 2 2.900-.800-3.100-.300-6.300 1.700-8.900z"/>',
  wand: '<path d="M3.500 20.500l10-10 1.500 1.500-10 10zM15.500 2.500l1.200 3 3 1.200-3 1.200-1.200 3-1.200-3-3-1.200 3-1.200zM20 12l.700 1.800 1.800.700-1.800.700L20 17l-.700-1.800-1.800-.700 1.800-.700z"/>',
  heart: '<path d="M12 20.500S3.500 15.300 3.500 9.300A4.600 4.600 0 0 1 12 6.800a4.600 4.600 0 0 1 8.500 2.500c0 6-8.500 11.200-8.500 11.200z"/>',
  bolt: '<path d="M13.500 2.500L5 13.500h5.500l-1 8L18 10.500h-5.500z"/>',
  moon: '<path d="M15 3a9.500 9.500 0 1 0 6 16.500A8 8 0 0 1 15 3z"/>',
  crown: '<path d="M3.500 18.500V7.500l5 4.500 3.500-7 3.500 7 5-4.500v11z"/>',
  jarfull: '<path d="M9 2.500h6v5.400c3.400 1.300 5.500 4.100 5.500 7.600 0 3.300-3.800 6-8.500 6s-8.500-2.700-8.500-6c0-3.500 2.100-6.300 5.500-7.600V2.500z"/>',
  bookfull: '<path d="M3.500 6.500c3-1.400 5.500-1.400 8.500 0v12c-3-1.400-5.500-1.400-8.500 0zM12 6.500c3-1.400 5.500-1.400 8.500 0v12c-3-1.400-5.500-1.400-8.500 0z"/>',
  eyefull: '<path d="M2 12c2.500-4.500 6-6.800 10-6.800S19.500 7.500 22 12c-2.500 4.500-6 6.800-10 6.800S4.500 16.500 2 12zm10-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
};

export function icon(name, cls = '') {
  if (SOLID[name]) {
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${SOLID[name]}</svg>`;
  }
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LINE[name] || ''}</svg>`;
}

export function stars(count, total = 3) {
  let out = `<span class="stars" role="img" aria-label="${count} of ${total} stars">`;
  for (let i = 0; i < total; i++) out += `<span class="star${i < count ? ' is-on' : ''}">${icon('star')}</span>`;
  return out + '</span>';
}

// ------------------------------------------------------------------ jars ----
// One bottle shape per shelf. `level` 0–3 is how full it is (the stars earned).

const BOTTLES = [
  'M33 14V34C14 40 8 56 8 66C8 84 22 94 40 94C58 94 72 84 72 66C72 56 66 40 47 34V14Z',
  'M32 14V28C22 32 18 38 18 46V86Q18 94 26 94H54Q62 94 62 86V46C62 38 58 32 48 28V14Z',
  'M29 14V24C15 26 9 34 9 44V82Q9 94 21 94H59Q71 94 71 82V44C71 34 65 26 51 24V14Z',
  'M33 14V38L10 84Q6 94 16 94H64Q74 94 70 84L47 38V14Z',
  'M34 14V30C20 38 6 50 10 72C13 88 26 94 40 94C54 94 67 88 70 72C74 50 60 38 46 30V14Z',
  'M32 14V30L16 42V84L24 94H56L64 84V42L48 30V14Z',
  'M33 14V30C33 44 12 52 12 78Q12 94 28 94H52Q68 94 68 78C68 52 47 44 47 30V14Z',
];

const LIQUID_TOP = [94, 72, 54, 38];

export function jar(shape, level, cls = '') {
  const id = nextId('jar');
  const d = BOTTLES[shape % BOTTLES.length];
  const top = LIQUID_TOP[Math.max(0, Math.min(3, level))];
  const liquid =
    level > 0
      ? `<g clip-path="url(#${id})"><rect class="jar-liquid" x="0" y="${top}" width="80" height="${96 - top}"/><ellipse class="jar-surface" cx="40" cy="${top}" rx="36" ry="3.500"/>
          ${level === 3 ? '<circle class="jar-bubble" cx="28" cy="70" r="3"/><circle class="jar-bubble" cx="50" cy="60" r="2.200"/><circle class="jar-bubble" cx="42" cy="80" r="1.800"/>' : ''}</g>`
      : '';
  return `<svg class="jar ${cls}" data-level="${level}" viewBox="0 0 80 100" aria-hidden="true">
    <defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>
    <path class="jar-glass" d="${d}"/>
    ${liquid}
    <path class="jar-outline" d="${d}"/>
    <path class="jar-shine" d="M22 54c-2 6-2 14 0 22"/>
    <rect class="jar-cork" x="29" y="4" width="22" height="13" rx="3.500"/>
    ${level === 3 ? '<path class="jar-spark" d="M66 18c.500 3.800 1.900 5.200 5.700 5.700-3.800.500-5.200 1.900-5.700 5.700-.500-3.800-1.900-5.200-5.700-5.700 3.800-.500 5.200-1.900 5.700-5.700z"/>' : ''}
  </svg>`;
}

// ------------------------------------------------------------- the familiar ----
// An axolotl. `color` picks the palette, `wear` is a list of item ids, `mood`
// picks the face, and `fx` is a spell that went wrong (spots, stripes, ...).

export const PET_COLORS = ['pink', 'mint', 'lilac', 'gold', 'sky', 'peach'];
export const FIZZLES = ['spots', 'stripes', 'mustache', 'flower', 'green', 'tiny', 'bubbles', 'flip'];

export const FIZZLE_LINES = {
  spots: 'came out in spots',
  stripes: 'went stripy',
  mustache: 'grew a mustache',
  flower: 'sprouted a flower',
  green: 'turned bright green',
  tiny: 'shrank to half size',
  bubbles: 'is hiccuping bubbles',
  flip: 'is floating upside down',
};

const INK = '#2a1b45';

const MOUTHS = {
  smile: `<path d="M82 85q18 14 36 0" fill="none" stroke="${INK}" stroke-width="3.200" stroke-linecap="round"/>`,
  cheer: `<path d="M80 83q20 22 40 0z" fill="${INK}"/><path d="M90 92q10 6 20 0-10 8-20 0z" fill="#ff7fae"/>`,
  oops: `<ellipse cx="100" cy="90" rx="6.500" ry="7.500" fill="${INK}"/>`,
  think: `<path d="M86 89q14-5 28 0" fill="none" stroke="${INK}" stroke-width="3.200" stroke-linecap="round"/>`,
};

const WEAR = {
  wizard:
    '<path d="M100-8l30 50H70z" fill="#6d3fe8"/><ellipse cx="100" cy="42" rx="42" ry="9" fill="#5330bd"/><path d="M96 12l2 4.200 4.600.700-3.300 3.200.800 4.600-4.100-2.200-4.100 2.200.800-4.600-3.300-3.200 4.600-.700z" fill="#ffc940"/><circle cx="110" cy="30" r="2.200" fill="#ffc940"/>',
  crown:
    '<path d="M72 40V16l14 11 14-18 14 18 14-11v24z" fill="#ffc940" stroke="#c98a00" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="30" r="3.600" fill="#f25ca2"/><circle cx="84" cy="33" r="2.400" fill="#3fa9f5"/><circle cx="116" cy="33" r="2.400" fill="#3fa9f5"/>',
  bow: '<path d="M132 36l-20-11v22z" fill="#f25ca2"/><path d="M132 36l20-11v22z" fill="#f25ca2"/><circle cx="132" cy="36" r="5.500" fill="#d93a86"/>',
  flowers:
    '<g transform="translate(70 40)"><circle cy="-7" r="6" fill="#ffd166"/><circle cx="6.700" cy="-2.200" r="6" fill="#ffd166"/><circle cx="4.100" cy="5.700" r="6" fill="#ffd166"/><circle cx="-4.100" cy="5.700" r="6" fill="#ffd166"/><circle cx="-6.700" cy="-2.200" r="6" fill="#ffd166"/><circle r="4.500" fill="#f25ca2"/></g><g transform="translate(100 31)"><circle cy="-7" r="6" fill="#fff"/><circle cx="6.700" cy="-2.200" r="6" fill="#fff"/><circle cx="4.100" cy="5.700" r="6" fill="#fff"/><circle cx="-4.100" cy="5.700" r="6" fill="#fff"/><circle cx="-6.700" cy="-2.200" r="6" fill="#fff"/><circle r="4.500" fill="#ffc940"/></g><g transform="translate(130 40)"><circle cy="-7" r="6" fill="#b79cff"/><circle cx="6.700" cy="-2.200" r="6" fill="#b79cff"/><circle cx="4.100" cy="5.700" r="6" fill="#b79cff"/><circle cx="-4.100" cy="5.700" r="6" fill="#b79cff"/><circle cx="-6.700" cy="-2.200" r="6" fill="#b79cff"/><circle r="4.500" fill="#fff"/></g>',
  cap: '<path d="M64 46c0-22 16-34 36-34s36 12 36 34z" fill="#17b8a6"/><path d="M60 46h62c10 0 20 3 28 9-10 2-20 2-30 0H60z" fill="#0f8f81"/><circle cx="100" cy="13" r="4" fill="#0f8f81"/>',
  glasses: `<g fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="3"><circle cx="78" cy="72" r="12"/><circle cx="122" cy="72" r="12"/></g><path d="M90 71q10-4 20 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  star: '<path d="M134 48l3 6.300 6.900 1-5 4.800 1.200 6.900-6.100-3.300-6.100 3.300 1.200-6.900-5-4.800 6.900-1z" fill="#ffc940" stroke="#c98a00" stroke-width="1.500" stroke-linejoin="round"/>',
  scarf:
    '<path d="M62 104q38 16 76 0l2 11q-40 16-80 0z" fill="#6d3fe8"/><path d="M122 114l12 22-13 1-7-21z" fill="#5330bd"/><path d="M72 110l2 8M86 114l1.500 8M100 115v8M114 114l-1.500 8" stroke="#e7dcff" stroke-width="2.500" stroke-linecap="round"/>',
  bowtie: '<path d="M100 110l-18-9v18z" fill="#ff6b5e"/><path d="M100 110l18-9v18z" fill="#ff6b5e"/><circle cx="100" cy="110" r="4.500" fill="#d94a3e"/>',
};

export const WEAR_SLOTS = { wizard: 'head', crown: 'head', bow: 'head', flowers: 'head', cap: 'head', star: 'head', glasses: 'face', scarf: 'neck', bowtie: 'neck' };

function gill(angle) {
  return `<g transform="rotate(${angle})"><rect x="6" y="-7" width="40" height="14" rx="7" class="pet-gill"/><rect x="14" y="-2.500" width="26" height="5" rx="2.500" class="pet-gill-light"/></g>`;
}

export function pet({ color = 'pink', wear = [], mood = 'smile', fx = '', cls = '' } = {}) {
  const id = nextId('pet');
  const items = wear.filter((w) => WEAR[w]).map((w) => WEAR[w]).join('');
  return `<svg class="pet ${cls}" data-color="${color}" data-fx="${fx}" viewBox="0 -14 200 190" role="img" aria-label="Your familiar">
    <defs><clipPath id="${id}"><ellipse cx="100" cy="72" rx="52" ry="41"/></clipPath></defs>
    <g class="pet-all">
      <path class="pet-skin" d="M126 132c34 8 56-12 50-42-4 20-22 30-46 24z"/>
      <ellipse class="pet-skin" cx="100" cy="128" rx="39" ry="27"/>
      <ellipse class="pet-belly" cx="100" cy="135" rx="24" ry="16"/>
      <ellipse class="pet-skin" cx="72" cy="152" rx="11" ry="7"/><ellipse class="pet-skin" cx="128" cy="152" rx="11" ry="7"/>
      <ellipse class="pet-skin" cx="62" cy="124" rx="7.500" ry="11" transform="rotate(24 62 124)"/><ellipse class="pet-skin" cx="138" cy="124" rx="7.500" ry="11" transform="rotate(-24 138 124)"/>
      <g transform="translate(58 66)">${gill(-148)}${gill(180)}${gill(148)}</g>
      <g transform="translate(142 66)">${gill(-32)}${gill(0)}${gill(32)}</g>
      <ellipse class="pet-skin" cx="100" cy="72" rx="52" ry="41"/>
      <ellipse cx="82" cy="48" rx="17" ry="7" fill="#fff" opacity=".28"/>
      <g class="fx fx-spots" clip-path="url(#${id})"><circle cx="70" cy="50" r="7"/><circle cx="96" cy="42" r="5"/><circle cx="126" cy="52" r="8"/><circle cx="58" cy="78" r="5"/><circle cx="140" cy="82" r="6"/><circle cx="112" cy="100" r="5"/><circle cx="84" cy="104" r="4"/></g>
      <g class="fx fx-stripes" clip-path="url(#${id})"><path d="M40 44h120v9H40zM40 62h120v9H40zM40 98h120v9H40z"/></g>
      <g class="pet-eyes" fill="${INK}"><circle cx="78" cy="72" r="6"/><circle cx="122" cy="72" r="6"/></g>
      <circle cx="80.500" cy="69.500" r="2.100" fill="#fff"/><circle cx="124.500" cy="69.500" r="2.100" fill="#fff"/>
      <ellipse class="pet-cheek" cx="64" cy="87" rx="8" ry="5"/><ellipse class="pet-cheek" cx="136" cy="87" rx="8" ry="5"/>
      ${MOUTHS[mood] || MOUTHS.smile}
      <g class="fx fx-mustache"><path d="M100 82c-6 8-18 10-28 4 8 0 12-4 14-8 4 2 10 2 14 4zM100 82c6 8 18 10 28 4-8 0-12-4-14-8-4 2-10 2-14 4z" fill="${INK}"/></g>
      <g class="fx fx-flower"><path d="M100 34V14" stroke="#2f9e63" stroke-width="4" stroke-linecap="round"/><path d="M100 26c-8-2-12-8-12-12 6 0 12 4 12 12z" fill="#5bc46b"/><g transform="translate(100 8)"><circle cy="-8" r="6.500" fill="#ff6b5e"/><circle cx="7.600" cy="-2.500" r="6.500" fill="#ff6b5e"/><circle cx="4.700" cy="6.500" r="6.500" fill="#ff6b5e"/><circle cx="-4.700" cy="6.500" r="6.500" fill="#ff6b5e"/><circle cx="-7.600" cy="-2.500" r="6.500" fill="#ff6b5e"/><circle r="5" fill="#ffc940"/></g></g>
      <g class="fx fx-bubbles"><circle cx="150" cy="60" r="7"/><circle cx="164" cy="38" r="5"/><circle cx="156" cy="16" r="9"/><circle cx="174" cy="4" r="4"/></g>
      ${items}
    </g>
  </svg>`;
}

export const wearPreview = (item) => pet({ wear: [item], cls: 'pet-still' });

// --------------------------------------------------------------- badges ----

const BADGE_ART = {
  jar: SOLID.jarfull,
  star: SOLID.star,
  spark: SOLID.spark,
  wand: SOLID.wand,
  bolt: SOLID.bolt,
  book: SOLID.bookfull,
  eye: SOLID.eyefull,
  heart: SOLID.heart,
  moon: SOLID.moon,
  crown: SOLID.crown,
  flame: SOLID.flame,
};

export function badgeArt(name) {
  return `<svg class="badge-art" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${BADGE_ART[name] || BADGE_ART.star}</svg>`;
}
