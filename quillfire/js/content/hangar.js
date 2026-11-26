// The hangar: ships, upgrades, paint and badges.

// Ships are won, never bought. `boss` is the sector whose boss must be beaten
// (counting from 0); the first ship is there from the start.
export const SHIP_LIST = [
  { id: 'quill', boss: -1, perk: '' },
  { id: 'comet', boss: 0, perk: 'One extra crystal for every ten you earn.', gems: 0.1 },
  { id: 'javelin', boss: 1, perk: 'Slides out of danger faster.', slide: 1.4 },
  { id: 'manta', boss: 2, perk: 'One extra shield.', shield: 1 },
  { id: 'aurora', boss: 3, perk: 'The Nova blast charges faster.', nova: 1 },
  { id: 'phoenix', boss: 5, perk: 'Extra shield, extra crystals, faster Nova and a faster slide.', gems: 0.1, slide: 1.4, shield: 1, nova: 1 },
];

// Upgrades are bought with crystals, one level at a time.
export const UPGRADES = [
  { id: 'shield', name: 'Shield Cells', what: 'One more shield on every mission.', costs: [150, 350, 700] },
  { id: 'scan', name: 'Scanner', what: 'One more scan on every mission. A scan clears away wrong answers.', costs: [120, 280, 560] },
  { id: 'chrono', name: 'Chrono Coil', what: 'More time to think before the Garblers fire.', costs: [100, 240, 480] },
  { id: 'nova', name: 'Nova Core', what: 'The Nova blast charges with fewer right answers.', costs: [180, 400, 800] },
];

// Paint. The first is free; the rest cost crystals. "prize" paints are won.
export const PAINT_LIST = [
  { id: 'teal', cost: 0 },
  { id: 'red', cost: 80 },
  { id: 'blue', cost: 80 },
  { id: 'green', cost: 80 },
  { id: 'purple', cost: 120 },
  { id: 'pink', cost: 120 },
  { id: 'gold', cost: 200 },
  { id: 'white', cost: 0, prize: 4 }, // for beating the boss of sector 5
];

export const BASE = { shield: 4, scans: 1, novaNeed: 6 };

// Badges. `test` looks at the whole save after a mission.
export const BADGES = [
  { id: 'first', name: 'First Flight', how: 'Finish your first mission.', test: (st) => Object.keys(st.missions).some((id) => st.missions[id].medal > 0) },
  { id: 'gold1', name: 'Gold Wings', how: 'Earn a gold medal.', test: (st) => Object.values(st.missions).some((m) => m.medal >= 3) },
  { id: 'gold5', name: 'Gold Rush', how: 'Earn five gold medals.', test: (st) => Object.values(st.missions).filter((m) => m.medal >= 3).length >= 5 },
  { id: 'gold15', name: 'Solid Gold', how: 'Earn fifteen gold medals.', test: (st) => Object.values(st.missions).filter((m) => m.medal >= 3).length >= 15 },
  { id: 'streak10', name: 'Sharp Shooter', how: 'Get ten right in a row.', test: (st) => st.counters.bestStreak >= 10 },
  { id: 'streak20', name: 'Laser Focus', how: 'Get twenty right in a row.', test: (st) => st.counters.bestStreak >= 20 },
  { id: 'perfect', name: 'Perfect Run', how: 'Finish a mission without a single miss.', test: (st) => st.counters.perfect >= 1 },
  { id: 'untouched', name: 'Untouchable', how: 'Finish a mission without losing a shield.', test: (st) => st.counters.noHit >= 1 },
  { id: 'boss1', name: 'Boss Buster', how: 'Beat your first boss.', test: (st) => st.counters.bosses >= 1 },
  { id: 'boss6', name: 'Garble’s End', how: 'Beat Lord Garble.', test: (st) => !!(st.missions['boss-garble'] && st.missions['boss-garble'].medal > 0) },
  { id: 'right100', name: 'Word Rescuer', how: 'Get 100 right.', test: (st) => st.counters.right >= 100 },
  { id: 'right500', name: 'Word Hero', how: 'Get 500 right.', test: (st) => st.counters.right >= 500 },
  { id: 'right1500', name: 'Word Legend', how: 'Get 1,500 right.', test: (st) => st.counters.right >= 1500 },
  { id: 'days3', name: 'Daily Pilot', how: 'Play three days in a row.', test: (st) => st.streak.best >= 3 },
  { id: 'days7', name: 'Week Warrior', how: 'Play seven days in a row.', test: (st) => st.streak.best >= 7 },
  { id: 'patrol5', name: 'Patrol Leader', how: 'Fly five daily patrols.', test: (st) => st.counters.patrols >= 5 },
  { id: 'upgrade', name: 'Mechanic', how: 'Buy an upgrade.', test: (st) => Object.values(st.up).some((n) => n > 0) },
  { id: 'paint', name: 'Fresh Paint', how: 'Paint your ship a new color.', test: (st) => st.owned.paints.length >= 2 },
];
