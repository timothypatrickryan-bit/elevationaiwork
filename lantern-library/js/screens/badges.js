// Badges: what she has earned and what there is still to earn.

import { S, BADGES } from '../store.js';
import { badgeArt } from '../art.js';
import { mount, esc, topbar, tabs, tabHandlers, shortDate, grownupsGate } from '../ui.js';

export function open(app) {
  const earned = S().badges;
  const count = BADGES.filter((b) => earned[b.id]).length;
  const el = mount(
    app,
    'badgepage',
    `${topbar()}
    <main class="scroll">
      <h1 class="display" style="font-size:var(--t-3xl);margin-top:6px">Badges</h1>
      <p class="muted" style="margin:8px 0 20px;font-weight:600">${count} of ${BADGES.length} earned. Each one marks something a strong reader does.</p>
      <div class="badges">${BADGES.map(
        (b) => `<div class="badge${earned[b.id] ? ' is-earned' : ''}">
          <span class="medal">${badgeArt(b.art)}</span>
          <b>${esc(b.name)}</b>
          <span class="badge-how">${esc(b.how)}</span>
          ${earned[b.id] ? `<span class="badge-date">Earned ${esc(shortDate(earned[b.id]))}</span>` : ''}
        </div>`
      ).join('')}</div>
    </main>
    ${tabs('badges')}`,
    { ...tabHandlers }
  );
  grownupsGate(el);
}
