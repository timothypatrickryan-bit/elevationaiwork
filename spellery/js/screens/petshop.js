// The familiar's corner: spend sparks on colors and things to wear.

import { S, save, SHOP, owns, buy, setColor, toggleWear, checkBadges } from '../store.js';
import { pet, icon } from '../art.js';
import { sfx } from '../audio.js';
import { mount, esc, topbar, tabs, tabHandlers, grownupsGate, ask, toast, burstFrom } from '../ui.js';
import { petHtml, petName } from '../activities/parts.js';

export function open(app) {
  const screen = mount(app, 'petshop', '', {
    ...tabHandlers,
    color(target) {
      const item = SHOP.colors.find((c) => c.id === target.dataset.id);
      if (!item) return;
      if (owns(item.id)) {
        sfx('pick');
        setColor(item.id);
        save();
        return paint();
      }
      purchase(item, `Turn ${petName()} ${item.name.toLowerCase()}?`, () => setColor(item.id));
    },
    wear(target) {
      const item = SHOP.wear.find((w) => w.id === target.dataset.id);
      if (!item) return;
      if (owns(item.id)) {
        sfx('pick');
        toggleWear(item);
        afterChange();
        return paint();
      }
      purchase(item, `Get the ${item.name.toLowerCase()} for ${petName()}?`, () => toggleWear(item));
    },
  });

  function afterChange() {
    const earned = checkBadges();
    save();
    if (earned.length) toast(`New badge: ${earned[0].name}`, 'badge');
  }

  function purchase(item, question, then) {
    const st = S();
    if (st.sparks < item.cost) {
      sfx('back');
      return toast(`You need ${item.cost - st.sparks} more sparks for that.`, 'spark');
    }
    sfx('tap');
    ask({ title: question, body: `It costs ${item.cost} sparks. You have ${st.sparks}.`, yes: `Yes, spend ${item.cost}`, no: 'Not now' }).then((yes) => {
      if (!yes || !buy(item)) return;
      then();
      afterChange();
      sfx('buy');
      paint();
      burstFrom(screen.querySelector('.shop-pet'), 18);
    });
  }

  function paint() {
    const st = S();
    const old = screen.querySelector('.main');
    const scrolled = old ? old.scrollTop : 0;
    const colors = SHOP.colors
      .map((c) => {
        const on = st.look.color === c.id;
        const mine = owns(c.id);
        return `<button class="swatch${on ? ' is-on' : ''}${mine ? ' is-owned' : ''}" data-act="color" data-id="${c.id}" aria-pressed="${on}">
          <span class="swatch-dot" data-color="${c.id}"></span>
          <span class="swatch-name">${esc(c.name)}</span>
          <span class="price${mine ? ' is-owned' : ''}">${on ? 'Wearing' : mine ? 'Yours' : icon('spark') + c.cost}</span>
        </button>`;
      })
      .join('');
    const wears = SHOP.wear
      .map((w) => {
        const on = st.look.wear.includes(w.id);
        const mine = owns(w.id);
        return `<button class="wear${on ? ' is-on' : ''}${mine ? ' is-owned' : ''}" data-act="wear" data-id="${w.id}" aria-pressed="${on}">
          <span class="wear-art">${pet({ color: st.look.color, wear: [w.id], cls: 'pet-still' })}</span>
          <span class="wear-name">${esc(w.name)}</span>
          <span class="price${mine ? ' is-owned' : ''}">${on ? 'Wearing' : mine ? 'Yours' : icon('spark') + w.cost}</span>
        </button>`;
      })
      .join('');
    screen.innerHTML = `${topbar('')}
      <main class="main">
        <section class="shop-top">
          <div class="shop-pet">${petHtml('cheer', '', 'is-bob')}</div>
          <div class="shop-info">
            <h1 class="display">${esc(petName())}</h1>
            <p>Sparks from jars and reviews buy new colors and things to wear. Tap something you own to put it on or take it off.</p>
            <p class="purse">${icon('spark')}<b>${st.sparks}</b> sparks to spend</p>
          </div>
        </section>
        <h2 class="section-title">Colors</h2>
        <div class="swatches">${colors}</div>
        <h2 class="section-title">Things to wear</h2>
        <div class="wears">${wears}</div>
      </main>
      ${tabs('petshop')}`;
    screen.querySelector('.main').scrollTop = scrolled;
    grownupsGate(screen);
  }

  paint();
}
