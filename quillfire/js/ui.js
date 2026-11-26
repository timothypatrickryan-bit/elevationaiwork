// Small helpers shared by every screen: making elements, the icons, and Blip.

// Text is made safe for HTML, and plain apostrophes become curled ones, so the
// content files can be typed on any keyboard and still look right on screen.
export const curl = (s) => String(s).replace(/'/g, '’');
export const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '’' })[ch]);

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Turns the little marks used in the content into glowing words:
// [these words] and *this* word glow, ___ becomes a gap, ▢ an empty box.
export function rich(text) {
  return esc(text)
    .replace(/\[(.+?)\]/g, '<mark>$1</mark>')
    .replace(/\*(.+?)\*/g, '<mark>$1</mark>')
    .replace(/___/g, '<span class="gap"></span>')
    .replace(/▢/g, '<span class="box"></span>')
    .replace(/\n/g, '<br>');
}

const svg = (body, box = '0 0 24 24') => `<svg class="ico" viewBox="${box}" aria-hidden="true">${body}</svg>`;
export const ICON = {
  pause: svg('<rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/>'),
  play: svg('<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>'),
  back: svg('<path d="M14.5 4 6.5 12l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  sound: svg('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  gem: svg('<path d="M12 2 21 10 12 22 3 10z" fill="#58f0ff" stroke="#0b2a5c" stroke-width="1.4"/><path d="M12 2 15 10 12 22 9 10z" fill="rgba(255,255,255,.55)"/>'),
  shield: svg('<path d="M12 2 20 5v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z"/>'),
  scan: svg('<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="m16 16 5 5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
  nova: svg('<path d="M12 1.5 14.4 8.6 22 9.2 16.2 14l1.9 7.4L12 17.3 5.9 21.4 7.8 14 2 9.2l7.6-.6z"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10.5" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/>'),
  star: svg('<path d="M12 2.2 14.9 8.6l6.9.7-5.2 4.7 1.5 6.8L12 17.3 5.9 20.8l1.5-6.8L2.2 9.3l6.9-.7z"/>'),
  check: svg('<path d="m4.5 12.5 5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  x: svg('<path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>'),
  gear: svg('<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zm9 3.8-2.1-.7a7 7 0 0 0-.6-1.5l1-2-1.9-1.9-2 1a7 7 0 0 0-1.5-.6L13.2 3h-2.4l-.7 2.1a7 7 0 0 0-1.5.6l-2-1-1.9 1.9 1 2a7 7 0 0 0-.6 1.5L3 10.800v2.4l2.1.7c.1.5.4 1 .6 1.5l-1 2 1.9 1.900 2-1c.5.2 1 .5 1.5.6l.7 2.1h2.4l.7-2.1c.5-.1 1-.4 1.5-.6l2 1 1.900-1.900-1-2c.2-.5.5-1 .6-1.5l2.1-.7z" fill-rule="evenodd"/>'),
  hangar: svg('<path d="M12 2c2.200 3 3.300 6.200 3.300 9.600L20 16v3l-4.700-1.500V20l1.700 1.300V22h-10v-.7L8.700 20v-2.500L4 19v-3l4.700-4.400C8.700 8.200 9.800 5 12 2z"/>'),
  medal: svg('<circle cx="12" cy="14.500" r="6.500"/><path d="M8 2h3l1 5-3 1.500zM16 2h-3l-1 5 3 1.500z"/>'),
  home: svg('<path d="M3 11.500 12 3l9 8.500V21h-6v-6H9v6H3z"/>'),
  redo: svg('<path d="M5 12a7 7 0 1 1 2.200 5.100" fill="none" stroke="currentColor" stroke-width="2.800" stroke-linecap="round"/><path d="M3 10.500 5.200 15l4-2.600" fill="none" stroke="currentColor" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/>'),
  next: svg('<path d="m9.500 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
};

// Blip, the robot co-pilot. `mood` changes the eyes: happy, oops, wow.
export function blip(mood = 'happy', cls = '') {
  const eyes = {
    happy: '<path d="M25 37q6-8 12 0M51 37q6-8 12 0" fill="none" stroke="#062a3a" stroke-width="4.500" stroke-linecap="round"/>',
    oops: '<circle cx="31" cy="36" r="5.500" fill="#062a3a"/><circle cx="57" cy="36" r="5.500" fill="#062a3a"/><path d="M24 26l12 4M64 26l-12 4" stroke="#062a3a" stroke-width="3" stroke-linecap="round"/>',
    wow: '<circle cx="31" cy="36" r="7" fill="#062a3a"/><circle cx="57" cy="36" r="7" fill="#062a3a"/><circle cx="33" cy="34" r="2.200" fill="#fff"/><circle cx="59" cy="34" r="2.200" fill="#fff"/>',
  }[mood] || '';
  return `<svg class="blip ${cls}" viewBox="0 0 88 88" aria-hidden="true">
    <line x1="44" y1="14" x2="44" y2="4" stroke="#9fb4d8" stroke-width="3.500" stroke-linecap="round"/>
    <circle class="blip-bulb" cx="44" cy="4.500" r="4.500" fill="#ffd34d"/>
    <rect x="3" y="30" width="9" height="20" rx="4" fill="#6f84ad"/><rect x="76" y="30" width="9" height="20" rx="4" fill="#6f84ad"/>
    <rect x="10" y="13" width="68" height="60" rx="20" fill="#dfe8f8" stroke="#141a33" stroke-width="3.500"/>
    <rect x="17" y="22" width="54" height="30" rx="13" fill="#5ff2ff" stroke="#141a33" stroke-width="3"/>
    ${eyes}
    <g class="blip-mouth" fill="#141a33"><rect x="30" y="58" width="5" height="8" rx="2"/><rect x="38" y="58" width="5" height="8" rx="2"/><rect x="46" y="58" width="5" height="8" rx="2"/><rect x="54" y="58" width="5" height="8" rx="2"/></g>
    <rect x="30" y="74" width="28" height="9" rx="4" fill="#6f84ad" stroke="#141a33" stroke-width="3"/>
  </svg>`;
}

// A dialog that covers the screen and resolves with the button that was tapped.
export function ask(host, { title, body = '', yes = 'OK', no = '' }) {
  return new Promise((resolve) => {
    const box = el(`<div class="modal" role="dialog" aria-modal="true"><div class="modal-card">
      <h2>${esc(title)}</h2>${body ? `<p>${esc(body)}</p>` : ''}
      <div class="modal-row">${no ? `<button class="btn btn-ghost" data-act="no">${esc(no)}</button>` : ''}<button class="btn btn-main" data-act="yes">${esc(yes)}</button></div>
    </div></div>`);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      box.remove();
      resolve(b.dataset.act === 'yes');
    });
    host.appendChild(box);
  });
}

export function toast(host, text, ms = 2600) {
  const t = el(`<div class="toast">${esc(text)}</div>`);
  host.appendChild(t);
  window.setTimeout(() => t.remove(), ms);
}
