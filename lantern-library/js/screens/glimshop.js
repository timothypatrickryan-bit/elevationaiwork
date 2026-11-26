// Glim's corner: spend sparks on glow colors and things to wear.

import { S, change, rank, SHOP, owns, buy, setGlow, toggleWear, checkBadges } from '../store.js';
import { icon, glim, wearPreview } from '../art.js';
import { sfx } from '../audio.js';
import { mount, esc, topbar, tabs, tabHandlers, toast, ask, burstFrom, grownupsGate } from '../ui.js';

export function open(app) {
  let mood = 'smile';

  function body() {
    const st = S();
    const r = rank();
    const span = r.next ? r.next.at - r.at : 1;
    const share = r.next ? Math.max(0.04, (r.stars - r.at) / span) : 1;
    const priceTag = (item, on) =>
      owns(item.id)
        ? `<span class="price is-owned">${on ? 'On' : 'Yours'}</span>`
        : `<span class="price${st.sparks < item.cost ? ' is-short' : ''}">${icon('spark')} ${item.cost}</span>`;
    return `<section class="glimstage">
        <div class="glimstage-art">${glim({ glow: st.glim.glow, wear: st.glim.wear, mood, cls: mood === 'cheer' ? 'is-cheer' : '' })}</div>
        <div class="glimstage-info">
          <h1 class="display">Glim</h1>
          <p class="rankline">Your rank: <b>${esc(r.title)}</b> · ${r.stars} ${r.stars === 1 ? 'star' : 'stars'}</p>
          <div class="meter" role="img" aria-label="Progress to the next rank"><i style="transform:scaleX(${share.toFixed(3)})"></i></div>
          <p class="muted">${r.next ? `${r.next.at - r.stars} more ${r.next.at - r.stars === 1 ? 'star' : 'stars'} to become a ${esc(r.next.title)}.` : 'You have reached the highest rank.'}
            You have <b>${st.sparks}</b> sparks to spend.</p>
        </div>
      </section>
      <h2 class="section-title">Glow</h2>
      <div class="swatches">${SHOP.glows
        .map((g) => {
          const on = st.glim.glow === g.id;
          return `<button class="swatch${on ? ' is-on' : ''}" data-act="glow" data-id="${g.id}" data-glow="${g.id}" aria-pressed="${on}"><span class="swatch-dot"></span>${esc(g.name)}${priceTag(g, on)}</button>`;
        })
        .join('')}</div>
      <h2 class="section-title">Things to wear</h2>
      <div class="wears">${SHOP.wear
        .map((w) => {
          const on = st.glim.wear.includes(w.id);
          return `<button class="wearcard${on ? ' is-on' : ''}" data-act="wear" data-id="${w.id}" aria-pressed="${on}">${wearPreview(w.id)}${esc(w.name)}${priceTag(w, on)}</button>`;
        })
        .join('')}</div>`;
  }

  const el = mount(app, 'glimpage', `${topbar()}<main class="scroll"></main>${tabs('glimshop')}`, {
    ...tabHandlers,
    glow(target) {
      const item = SHOP.glows.find((g) => g.id === target.dataset.id);
      if (owns(item.id)) {
        sfx('pick');
        change(() => setGlow(item.id));
        return paint();
      }
      offer(item, () => setGlow(item.id));
    },
    wear(target) {
      const item = SHOP.wear.find((w) => w.id === target.dataset.id);
      if (owns(item.id)) {
        sfx('pick');
        change(() => toggleWear(item));
        return afterChange();
      }
      offer(item, () => toggleWear(item));
    },
  });
  const main = el.querySelector('main');

  function paint() {
    const y = main.scrollTop;
    main.innerHTML = body();
    main.scrollTop = y;
    const sparks = el.querySelector('[data-sparks]');
    if (sparks) sparks.textContent = S().sparks;
  }

  function afterChange() {
    let earned = [];
    change(() => {
      earned = checkBadges();
    });
    paint();
    if (earned.length) toast('New badge: ' + earned.map((b) => b.name).join(', '), 'badge');
  }

  function offer(item, use) {
    const have = S().sparks;
    if (have < item.cost) {
      sfx('almost');
      return toast(`You need ${item.cost - have} more sparks for the ${item.name}.`, 'spark');
    }
    ask({ title: `Get the ${item.name}?`, body: `It costs ${item.cost} sparks. You have ${have}.`, yes: 'Yes, get it' }).then((yes) => {
      if (!yes) return;
      change(() => {
        if (buy(item)) use();
      });
      sfx('buy');
      mood = 'cheer';
      afterChange();
      burstFrom(el.querySelector('.glimstage-art'), 16);
      mood = 'smile';
    });
  }

  paint();
  grownupsGate(el);
}
