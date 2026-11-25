// The kitchen itself: one chef, six crates, a chopping board, a grill, a plating
// counter and a serving window. Orders arrive on the board with a patience timer;
// the chef fetches, chops, grills, plates and serves. Everything here is pure
// simulation on a fixed step, so the screenshot pilot can drive the same rules.

import {
  CHEF, CHOPS_TO_FINISH, FIELD, FLOOR, GRILL, INGREDIENTS, INTERACT_RANGE,
  ORDERS, RECIPES, SHIFT_SECONDS, STATIONS, stationApproach,
} from './config.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_OVER = 4;
export const EVENT_PICKUP = 8;
export const EVENT_PLACE = 16;
export const EVENT_CHOP = 32;
export const EVENT_ERROR = 64;
export const EVENT_GRILL_DONE = 128;
export const EVENT_TRASH = 256;

/** All solid rects the chef walks around. */
const SOLIDS = [
  ...STATIONS.crates,
  STATIONS.board,
  STATIONS.grill,
  STATIONS.counter,
  STATIONS.window,
  STATIONS.trash,
];

function rectDistance(px, py, rect) {
  const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

/** The nearest station to the chef, with its distance, or null when out of reach. */
export function nearestStation(state) {
  let best = null;
  let bestDistance = Infinity;
  for (const rect of SOLIDS) {
    const distance = rectDistance(state.chef.x, state.chef.y, rect);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = rect;
    }
  }
  return bestDistance <= INTERACT_RANGE ? { station: best, distance: bestDistance } : null;
}

/** True when the given items are exactly one open order's recipe (any order). */
export function matchingOrder(state, items) {
  for (const order of state.orders) {
    const recipe = RECIPES[order.recipeIndex].items;
    if (recipe.length === items.length && multisetEquals(recipe, items)) return order;
  }
  return null;
}

function multisetEquals(a, b) {
  const counts = new Map();
  for (const item of a) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of b) {
    const left = (counts.get(item) ?? 0) - 1;
    if (left < 0) return false;
    counts.set(item, left);
  }
  return [...counts.values()].every((count) => count === 0);
}

function choppedForm(kind) {
  return `${kind}_chopped`;
}

export function createWorld(random) {
  const state = freshState();
  let nextOrderId = 1;

  function freshState() {
    return {
      time: 0,
      over: false,
      coins: 0,
      combo: 0,
      bestCombo: 0,
      served: 0,
      expired: 0,
      rush: 1,
      spawnTimer: ORDERS.firstAtSeconds,
      chef: { x: 640, y: 560, dirX: 0, dirY: -1, moving: false, carry: null },
      board: [{ item: null }, { item: null }],
      grill: [{ item: null }, { item: null }],
      plate: { items: [] },
      orders: [],
      particles: [],
      floats: [],
      flash: 0,
      grillReadyPulse: 0,
      chopCooldown: 0,
    };
  }

  function reset() {
    const kept = freshState();
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, kept);
    nextOrderId = 1;
  }

  function eligibleRecipes() {
    // The heavier recipes only join the menu once the rush has picked up.
    return RECIPES.map((recipe, index) => ({ recipe, index })).filter(
      ({ recipe }) => state.rush >= 2 || (recipe.id !== 'double' && recipe.id !== 'sunrise'),
    );
  }

  function spawnOrder() {
    if (state.orders.length >= ORDERS.maxOpen) return;
    const pool = eligibleRecipes();
    const pick = pool[Math.floor(random() * pool.length)];
    const patience = Math.max(
      ORDERS.patienceMin,
      ORDERS.patienceBase - (state.rush - 1) * ORDERS.patiencePerRush,
    );
    state.orders.push({
      id: nextOrderId,
      recipeIndex: pick.index,
      patience,
      maxPatience: patience,
      bornAt: state.time,
    });
    nextOrderId += 1;
  }

  function addFloat(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 1.4, maxLife: 1.4 });
  }

  function addParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed * (0.4 + random() * 0.6),
        vy: Math.sin(angle) * speed * (0.4 + random() * 0.6) - speed * 0.4,
        life: 0.5 + random() * 0.4,
        maxLife: 0.9,
        color,
        size: 2 + random() * 3,
      });
    }
  }

  function moveChef(dt, mx, my) {
    const chef = state.chef;
    if (mx === 0 && my === 0) {
      chef.moving = false;
      return;
    }
    const len = Math.hypot(mx, my) || 1;
    chef.dirX = mx / len;
    chef.dirY = my / len;
    chef.moving = true;
    chef.x += (mx / len) * CHEF.speed * dt;
    chef.y += (my / len) * CHEF.speed * dt;
    // Stay on the floor.
    chef.x = Math.min(FLOOR.x + FLOOR.width - CHEF.radius, Math.max(FLOOR.x + CHEF.radius, chef.x));
    chef.y = Math.min(FLOOR.y + FLOOR.height - CHEF.radius, Math.max(FLOOR.y + CHEF.radius, chef.y));
    // Push out of every solid rect (circle vs AABB).
    for (const rect of SOLIDS) {
      const cx = Math.min(rect.x + rect.w, Math.max(rect.x, chef.x));
      const cy = Math.min(rect.y + rect.h, Math.max(rect.y, chef.y));
      const dx = chef.x - cx;
      const dy = chef.y - cy;
      const distance = Math.hypot(dx, dy);
      if (distance < CHEF.radius) {
        if (distance === 0) {
          chef.y = rect.y + rect.h + CHEF.radius;
        } else {
          chef.x = cx + (dx / distance) * CHEF.radius;
          chef.y = cy + (dy / distance) * CHEF.radius;
        }
      }
    }
  }

  /** Use the station in front of the chef. Returns an event bit. */
  function interact(pressed, held) {
    if (!pressed && !held) return 0;
    const found = nearestStation(state);
    if (!found) return 0;
    const { station } = found;
    const chef = state.chef;
    const carry = chef.carry;
    // Only the chopping board answers a held key without a fresh press; every
    // other station needs a press, so holding E never repeats a pickup or a serve.
    if (!pressed && station.id !== 'board') return 0;

    if (station.id.startsWith('crate-')) {
      if (carry) return EVENT_ERROR;
      chef.carry = { kind: station.kind };
      return EVENT_PICKUP;
    }

    if (station.id === 'board') {
      if (carry && carry.kind !== 'plate') {
        if (!pressed) return 0;
        const info = INGREDIENTS[carry.kind];
        if (!info || !info.chop) return EVENT_ERROR;
        const slot = state.board.find((s) => s.item === null);
        if (!slot) return EVENT_ERROR;
        slot.item = { kind: carry.kind, chops: 0 };
        chef.carry = null;
        return EVENT_PLACE;
      }
      if (!carry) {
        // A finished item is picked up first; otherwise keep chopping the first
        // unfinished one, so two items on the board never get mixed up.
        const done = state.board.find((s) => s.item !== null && s.item.chops >= CHOPS_TO_FINISH);
        if (done) {
          if (!pressed) return 0;
          chef.carry = { kind: choppedForm(done.item.kind) };
          done.item = null;
          return EVENT_PICKUP;
        }
        const slot = [...state.board].reverse().find((s) => s.item !== null && s.item.chops < CHOPS_TO_FINISH);
        if (!slot) return 0;
        if (slot.item.chops < CHOPS_TO_FINISH) {
          // One chop per press; holding the key chops again after a short beat.
          if (!pressed && state.chopCooldown > 0) return 0;
          slot.item.chops += 1;
          state.chopCooldown = 0.28;
          addParticles(station.x + station.w / 2, station.y + 40, INGREDIENTS[slot.item.kind].color, 4, 60);
          return EVENT_CHOP;
        }
      }
      return EVENT_ERROR;
    }

    if (station.id === 'grill') {
      if (carry && carry.kind === 'patty_raw') {
        const slot = state.grill.find((s) => s.item === null);
        if (!slot) return EVENT_ERROR;
        slot.item = { kind: 'patty_raw', cook: 0, announced: false };
        chef.carry = null;
        return EVENT_PLACE;
      }
      if (!carry) {
        const slot = state.grill.find((s) => s.item !== null);
        if (!slot) return 0;
        if (slot.item.cook >= GRILL.burnSeconds) {
          slot.item = null;
          return EVENT_TRASH;
        }
        if (slot.item.cook >= GRILL.cookSeconds) {
          chef.carry = { kind: 'patty' };
          slot.item = null;
          return EVENT_PICKUP;
        }
        return EVENT_ERROR;
      }
      return EVENT_ERROR;
    }

    if (station.id === 'counter') {
      if (carry && carry.kind === 'plate') {
        if (state.plate.items.length > 0) return EVENT_ERROR;
        state.plate.items = carry.items;
        chef.carry = null;
        return EVENT_PLACE;
      }
      if (carry) {
        if (state.plate.items.length >= 5) return EVENT_ERROR;
        state.plate.items.push(carry.kind);
        chef.carry = null;
        addParticles(station.x + station.w / 2, station.y + 50, '#f2c94c', 3, 40);
        return EVENT_PLACE;
      }
      if (state.plate.items.length > 0) {
        chef.carry = { kind: 'plate', items: state.plate.items };
        state.plate.items = [];
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (station.id === 'window') {
      if (!carry || carry.kind !== 'plate') return EVENT_ERROR;
      const order = matchingOrder(state, carry.items);
      if (!order) {
        addFloat(station.x + station.w / 2, station.y - 42, 'WRONG ORDER', '#e5534b');
        return EVENT_ERROR;
      }
      const recipe = RECIPES[order.recipeIndex];
      const tip = Math.round(recipe.price * 0.5 * (order.patience / order.maxPatience));
      const earned = recipe.price + tip;
      state.coins += earned;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.served += 1;
      state.orders = state.orders.filter((o) => o.id !== order.id);
      chef.carry = null;
      addFloat(station.x + station.w / 2, station.y - 42, `+$${earned}`, '#f2c94c');
      if (state.combo > 1) addFloat(station.x + station.w / 2, station.y - 68, `COMBO x${state.combo}`, '#58b368');
      addParticles(station.x + station.w / 2, station.y + 30, '#f2c94c', 14, 120);
      return EVENT_SERVED;
    }

    if (station.id === 'trash') {
      if (!carry) return 0;
      chef.carry = null;
      return EVENT_TRASH;
    }

    return 0;
  }

  function step(dt, input) {
    let events = 0;
    if (state.over) return events;
    state.time += dt;
    state.rush = 1 + Math.floor(state.time / ORDERS.rushEverySeconds);

    moveChef(dt, input.mx ?? 0, input.my ?? 0);
    events |= interact(input.pressed === true, input.held === true);
    if (state.chopCooldown > 0) state.chopCooldown = Math.max(0, state.chopCooldown - dt);

    // Grill: patties cook, then burn.
    for (const slot of state.grill) {
      if (!slot.item) continue;
      slot.item.cook += dt;
      if (!slot.item.announced && slot.item.cook >= GRILL.cookSeconds) {
        slot.item.announced = true;
        events |= EVENT_GRILL_DONE;
      }
      if (slot.item.cook < GRILL.burnSeconds && random() < dt * 6) {
        state.particles.push({
          x: STATIONS.grill.x + 40 + random() * 160, y: STATIONS.grill.y + 60 + random() * 20,
          vx: (random() - 0.5) * 10, vy: -30 - random() * 20,
          life: 0.8, maxLife: 0.8, color: '#e8e8e8', size: 3 + random() * 3,
        });
      }
    }

    // Orders: spawn on schedule, patience drains, expiry stings.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnOrder();
      const gap = Math.max(
        ORDERS.spawnGapMin,
        ORDERS.spawnGapBase - (state.rush - 1) * ORDERS.spawnGapPerRush,
      );
      state.spawnTimer = gap;
    }
    for (const order of [...state.orders]) {
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders = state.orders.filter((o) => o.id !== order.id);
        state.combo = 0;
        state.expired += 1;
        state.flash = 1;
        addFloat(640, 200, 'ORDER WALKED OUT', '#e5534b');
        events |= EVENT_EXPIRED;
      }
    }

    // Particles and floats age out.
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 12 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const f of state.floats) {
      f.life -= dt;
      f.y -= 28 * dt;
    }
    state.floats = state.floats.filter((f) => f.life > 0);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.5);
    if (state.grillReadyPulse > 0) state.grillReadyPulse = Math.max(0, state.grillReadyPulse - dt);
    if (events & EVENT_GRILL_DONE) state.grillReadyPulse = 1;

    if (state.time >= SHIFT_SECONDS) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  return { state, reset, step, spawnOrder, stationApproach };
}

export { FIELD };
