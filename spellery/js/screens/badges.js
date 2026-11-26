// Badges earned so far, and how to earn the rest.

import { S, BADGES } from '../store.js';
import { badgeArt } from '../art.js';
import { mount, esc, topbar, tabs, tabHandlers, grownupsGate, shortDate } from '../ui.js';
import { rankHtml } from './home.js';

export function open(app) {
  const earned = S().badges;
  const count = BADGES.filter((b) => earned[b.id]).length;
  const list = BADGES.slice()
    .sort((a, b) => (earned[b.id] ? 1 : 0) - (earned[a.id] ? 1 : 0))
    .map((b) => {
      const when = earned[b.id];
      return `<div class="badge${when ? ' is-earned' : ''}">
        <span class="medal">${badgeArt(b.art)}</span>
        <b class="badge-name">${esc(b.name)}</b>
        <span class="badge-how">${esc(b.how)}</span>
        ${when ? `<span class="badge-when">Earned ${esc(shortDate(when))}</span>` : ''}
      </div>`;
    })
    .join('');

  const screen = mount(
    app,
    'badges',
    `${topbar('')}
    <main class="main">
      <div class="page-head">
        <h1 class="display">Badges</h1>
        <p>${count} of ${BADGES.length} earned.</p>
      </div>
      <section class="rank-card">${rankHtml()}</section>
      <div class="badge-grid">${list}</div>
    </main>
    ${tabs('badges')}`,
    { ...tabHandlers }
  );
  grownupsGate(screen);
}
