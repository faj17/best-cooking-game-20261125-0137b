// Every tuning number, colour and layout rect in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size. "Ember & Thyme" is an original kitchen: one chef, six
// ingredient crates, a chopping board, a grill, a plating counter and a serving window.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** A full shift: when the timer hits zero the shift ends and the score stands. */
export const SHIFT_SECONDS = 180;

export const CHEF = { radius: 20, speed: 320 };

/** The chef's walkable floor: below the order board, inside the kitchen walls. */
export const FLOOR = { x: 8, y: 184, width: 1264, height: 528 };

/** Chopping takes this many presses of the interact key on a placed item. */
export const CHOPS_TO_FINISH = 3;

/** Seconds a raw patty needs on the grill to be cooked, and when it burns. */
export const GRILL = { cookSeconds: 6, burnSeconds: 10.5 };

/** Orders: spawn gap and patience shrink as the rush level grows. */
export const ORDERS = {
  maxOpen: 4,
  firstAtSeconds: 2,
  spawnGapBase: 18,
  spawnGapPerRush: 2,
  spawnGapMin: 9,
  patienceBase: 52,
  patiencePerRush: 3,
  patienceMin: 30,
  /** Rush level rises one step per this many seconds of the shift. */
  rushEverySeconds: 40,
};

/** Ingredient kinds. `chop` means it must be chopped before it can be plated. */
export const INGREDIENTS = {
  bun: { label: 'Bun', color: '#e8b96a', dark: '#b98a3e', chop: false, grill: false },
  patty_raw: { label: 'Raw Patty', color: '#c98a7a', dark: '#8f5a4e', chop: false, grill: true },
  tomato: { label: 'Tomato', color: '#e5534b', dark: '#a8322c', chop: true, grill: false },
  lettuce: { label: 'Lettuce', color: '#58b368', dark: '#2f7a3e', chop: true, grill: false },
  cheese: { label: 'Cheese', color: '#f2c94c', dark: '#c79a1d', chop: false, grill: false },
  onion: { label: 'Onion', color: '#b388d9', dark: '#7a4fa3', chop: true, grill: false },
};

/** Cooked and chopped forms keep the base kind's label with a suffix. */
export const FORMS = {
  patty: { label: 'Grilled Patty', color: '#8a5a34', dark: '#5d3a1e' },
  tomato_chopped: { label: 'Sliced Tomato', color: '#ef6a5e', dark: '#a8322c' },
  lettuce_chopped: { label: 'Shredded Lettuce', color: '#7ed491', dark: '#2f7a3e' },
  onion_chopped: { label: 'Diced Onion', color: '#cfa8ec', dark: '#7a4fa3' },
};

/** The menu: each recipe is a multiset of plated kinds, in any order. */
export const RECIPES = [
  { id: 'garden', name: 'Garden Burger', price: 14, items: ['bun', 'patty', 'tomato_chopped', 'lettuce_chopped'] },
  { id: 'melt', name: 'Cheese Melt', price: 15, items: ['bun', 'patty', 'cheese', 'onion_chopped'] },
  { id: 'green', name: 'Green Stack', price: 11, items: ['bun', 'lettuce_chopped', 'tomato_chopped', 'cheese'] },
  { id: 'double', name: 'Double Stack', price: 20, items: ['bun', 'patty', 'patty', 'cheese', 'lettuce_chopped'] },
  { id: 'sunrise', name: 'Sunrise Melt', price: 16, items: ['bun', 'patty', 'cheese', 'tomato_chopped'] },
];

/** Stations: rects the chef collides with and interacts with from below. */
export const STATIONS = {
  crates: [
    { id: 'crate-bun', kind: 'bun', label: 'Buns', x: 24, y: 216, w: 144, h: 62 },
    { id: 'crate-patty', kind: 'patty_raw', label: 'Patties', x: 24, y: 290, w: 144, h: 62 },
    { id: 'crate-tomato', kind: 'tomato', label: 'Tomatoes', x: 24, y: 364, w: 144, h: 62 },
    { id: 'crate-lettuce', kind: 'lettuce', label: 'Lettuce', x: 24, y: 438, w: 144, h: 62 },
    { id: 'crate-cheese', kind: 'cheese', label: 'Cheese', x: 24, y: 512, w: 144, h: 62 },
    { id: 'crate-onion', kind: 'onion', label: 'Onions', x: 24, y: 586, w: 144, h: 62 },
  ],
  board: { id: 'board', label: 'Chopping Board', x: 260, y: 240, w: 220, h: 120, slots: 2 },
  grill: { id: 'grill', label: 'Grill', x: 500, y: 240, w: 240, h: 120, slots: 2 },
  counter: { id: 'counter', label: 'Plating Counter', x: 800, y: 240, w: 240, h: 120 },
  window: { id: 'window', label: 'Serving Window', x: 1080, y: 240, w: 176, h: 120 },
  trash: { id: 'trash', label: 'Trash', x: 1120, y: 600, w: 136, h: 80 },
};

/** Where the chef stands to work a station: crates from the east, the rest from below, trash from above. */
export function stationApproach(station) {
  if (station.id.startsWith('crate-')) {
    return { x: station.x + station.w + CHEF.radius + 14, y: station.y + station.h / 2 };
  }
  if (station.id === 'trash') {
    return { x: station.x + station.w / 2, y: station.y - CHEF.radius - 14 };
  }
  return { x: station.x + station.w / 2, y: station.y + station.h + CHEF.radius + 14 };
}

/** Pixels from the chef's centre to a station rect that still counts as "at" it. */
export const INTERACT_RANGE = 96;

export const PALETTE = {
  wall: '#3d2b1f',
  wallTile: '#4a3628',
  floorA: '#c89b6a',
  floorB: '#b98a5c',
  rug: '#a34d3f',
  hud: '#2b1d12',
  hudEdge: '#6b4a2f',
  counterWood: '#8a5a34',
  counterTop: '#a9743f',
  steel: '#c8ccd4',
  steelDark: '#9aa0ab',
  boardWood: '#d9b380',
  grillBody: '#3a3f47',
  grillHot: '#e5534b',
  ticket: '#fdf6e3',
  ticketEdge: '#d9c48f',
  text: '#f5efe4',
  muted: '#cbb79d',
  green: '#58b368',
  amber: '#f2a93b',
  red: '#e5534b',
  gold: '#f2c94c',
  chefHat: '#f5f2ea',
  chefCoat: '#f5f2ea',
  chefSkin: '#e8b98a',
  chefPants: '#3a3f47',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'ember-and-thyme.best';
