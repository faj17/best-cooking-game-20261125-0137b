// The screenshot scenes behind ?shot=cover|chop|grill|serve. Each one plays the real
// rules forward from a fresh world for a fixed script, steered by a small autopilot
// (walk to a station's approach point, press E, wait for the grill or the chopping
// to finish), so the frame is what a short game really looks like and the same seed
// always gives the same frame. The pilot reads the live order board and builds the
// plate for the oldest open order, so the finished plate always matches a ticket.

import { STEP, STATIONS, stationApproach } from './config.js';
import { CHOPS_TO_FINISH, GRILL } from './config.js';
import { RECIPES } from './config.js';
import { SCREEN_PLAY } from './render.js';

const SAMPLE = STEP;

/** Find a station by id across crates and the named stations. */
function findStation(id) {
  if (id.startsWith('crate-')) return STATIONS.crates.find((c) => c.id === id);
  return STATIONS[id];
}

/** A tiny task interpreter: each task runs until it reports done, then the next starts. */
function createPilot(world) {
  const queue = [];
  let current = null;
  let elapsed = 0;

  function add(task) {
    queue.push(task);
  }

  /** Move toward (x, y) along precomputed waypoints: down/up to the open travel
   *  lane at y=560, across it, then to the approach point. Waypoints are fixed
   *  when the task starts, so the chef never oscillates between legs. */
  function moveToward(state, task) {
    if (!task.wps) {
      const wps = [];
      if (Math.abs(state.chef.y - 560) > 8) wps.push({ x: state.chef.x, y: 560 });
      if (Math.abs(state.chef.x - task.x) > 8) wps.push({ x: task.x, y: 560 });
      wps.push({ x: task.x, y: task.y });
      task.wps = wps;
    }
    const chef = state.chef;
    while (task.wps.length > 0) {
      const wp = task.wps[0];
      const dx = wp.x - chef.x;
      const dy = wp.y - chef.y;
      if (Math.hypot(dx, dy) < 10) {
        task.wps.shift();
        continue;
      }
      const len = Math.hypot(dx, dy);
      return { mx: dx / len, my: dy / len, pressed: false, held: false };
    }
    return null;
  }

  function stepInput(state) {
    if (!current) {
      current = queue.shift() ?? null;
      elapsed = 0;
      if (!current) return null;
      if (current.type === 'do') {
        current.fn(world);
        current = null;
        return stepInput(state);
      }
    }
    elapsed += SAMPLE;
    if (globalThis.__PILOT_DEBUG && Math.round(elapsed / SAMPLE) % 60 === 0) {
      console.log(`  pilot task=${current.type} elapsed=${elapsed.toFixed(1)} chef=(${state.chef.x | 0},${state.chef.y | 0}) queue=${queue.length}`);
    }
    const task = current;
    if (task.type === 'goto') {
      const input = moveToward(state, task);
      if (input === null) {
        current = null;
        return { mx: 0, my: 0, pressed: false, held: false };
      }
      if (elapsed > 20) current = null; // never stall the scene on a bad route
      return input;
    }
    if (task.type === 'press') {
      current = null;
      return { mx: 0, my: 0, pressed: true, held: true };
    }
    if (task.type === 'hold') {
      if (elapsed >= task.seconds) {
        current = null;
        return { mx: 0, my: 0, pressed: false, held: false };
      }
      return { mx: 0, my: 0, pressed: elapsed <= SAMPLE, held: true };
    }
    if (task.type === 'wait') {
      if (elapsed >= task.seconds) current = null;
      return { mx: 0, my: 0, pressed: false, held: false };
    }
    if (task.type === 'waitUntil') {
      if (task.fn(state) || elapsed >= task.timeout) current = null;
      return { mx: 0, my: 0, pressed: false, held: false };
    }
    if (task.type === 'holdUntil') {
      // Hold E while the condition is false (chopping); release the moment it holds.
      if (task.fn(state) || elapsed >= task.timeout) {
        current = null;
        return { mx: 0, my: 0, pressed: false, held: false };
      }
      return { mx: 0, my: 0, pressed: elapsed <= SAMPLE, held: true };
    }
    current = null;
    return { mx: 0, my: 0, pressed: false, held: false };
  }

  function done() {
    return current === null && queue.length === 0;
  }

  /** Put tasks at the front of the queue: a `do` task's expansion runs next. */
  function prepend(tasks) {
    queue.unshift(...tasks);
  }

  return { add, prepend, stepInput, done };
}

function gotoTask(list, stationId) {
  const station = findStation(stationId);
  const point = stationApproach(station);
  list.push({ type: 'goto', x: point.x, y: point.y });
}

function pressTask(list) {
  list.push({ type: 'press' });
}

/** The tasks that fetch one ingredient and add it to the plate on the counter. */
function fetchAndPlate(kind) {
  const list = [];
  const chopped = kind.endsWith('_chopped');
  const base = chopped ? kind.slice(0, -8) : kind;
  if (kind === 'patty') {
    gotoTask(list, 'crate-patty');
    pressTask(list);
    gotoTask(list, 'grill');
    pressTask(list);
    list.push({
      type: 'waitUntil',
      fn: (s) => s.grill.some((slot) => slot.item && slot.item.cook >= GRILL.cookSeconds),
      timeout: 12,
    });
    pressTask(list);
    gotoTask(list, 'counter');
    pressTask(list);
    return list;
  }
  gotoTask(list, `crate-${base}`);
  pressTask(list);
  if (chopped) {
    gotoTask(list, 'board');
    pressTask(list);
    list.push({
      type: 'holdUntil',
      fn: (s) => s.board.some((slot) => slot.item && slot.item.chops >= CHOPS_TO_FINISH),
      timeout: 8,
    });
    pressTask(list);
  }
  gotoTask(list, 'counter');
  pressTask(list);
  return list;
}

/** Build the plate for the open order with the most patience left (the freshest
 *  ticket), so the finished plate still matches its ticket when the scene ends. */
function buildPlate(pilot, world) {
  pilot.add({ type: 'waitUntil', fn: (s) => s.orders.length >= 2, timeout: 40 });
  pilot.add({
    type: 'do',
    fn: () => {
      const order = world.state.orders.reduce((best, o) => (o.patience > best.patience ? o : best));
      const recipe = RECIPES[order.recipeIndex];
      const tasks = [];
      for (const kind of recipe.items) tasks.push(...fetchAndPlate(kind));
      pilot.prepend(tasks);
    },
  });
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Any other name stages the cover.
 */
export function stageShot(name, world) {
  world.reset();
  const pilot = createPilot(world);
  const scene = name === 'chop' || name === 'grill' || name === 'serve' ? name : 'cover';

  if (scene === 'chop') {
    pilot.add({ type: 'waitUntil', fn: (s) => s.orders.length >= 1, timeout: 30 });
    pilot.add({ type: 'goto', ...stationApproach(findStation('crate-tomato')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'goto', ...stationApproach(findStation('board')) });
    pilot.add({ type: 'press' });
    pilot.add({
      type: 'holdUntil',
      fn: (s) => s.board.some((slot) => slot.item && slot.item.chops >= 2),
      timeout: 8,
    });
  } else if (scene === 'grill') {
    pilot.add({ type: 'waitUntil', fn: (s) => s.orders.length >= 1, timeout: 30 });
    // Two patties on the grill at once: the first finishes while the second is
    // still sizzling, and the scene ends before the first can burn.
    pilot.add({ type: 'goto', ...stationApproach(findStation('crate-patty')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'goto', ...stationApproach(findStation('grill')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'goto', ...stationApproach(findStation('crate-patty')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'goto', ...stationApproach(findStation('grill')) });
    pilot.add({ type: 'press' });
    pilot.add({
      type: 'waitUntil',
      fn: (s) => s.grill.some((slot) => slot.item && slot.item.cook >= GRILL.cookSeconds),
      timeout: 12,
    });
    pilot.add({ type: 'wait', seconds: 3 });
  } else if (scene === 'serve') {
    buildPlate(pilot, world);
    // Pick the finished plate up, carry it to the window and serve it; stop on
    // the frame the coins pop so the float is in the shot.
    pilot.add({ type: 'goto', ...stationApproach(findStation('counter')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'goto', ...stationApproach(findStation('window')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'wait', seconds: 0.25 });
  } else {
    buildPlate(pilot, world);
    // Busy kitchen around the finished plate: a tomato mid-chop on the board and
    // a patty mid-grill, then back to the counter while the plate still matches
    // its ticket. The whole scene stays inside the first order's patience.
    pilot.add({ type: 'goto', ...stationApproach(findStation('crate-tomato')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'goto', ...stationApproach(findStation('board')) });
    pilot.add({ type: 'press' });
    pilot.add({
      type: 'holdUntil',
      fn: (s) => s.board.some((slot) => slot.item && slot.item.chops >= 2),
      timeout: 8,
    });
    pilot.add({ type: 'goto', ...stationApproach(findStation('crate-patty')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'goto', ...stationApproach(findStation('grill')) });
    pilot.add({ type: 'press' });
    pilot.add({ type: 'wait', seconds: 2 });
  }

  // Play the script forward at 60 steps a second; the world is small, so a whole
  // minute of play is a few thousand steps.
  let guard = 0;
  while (!pilot.done() && guard < 60 * 120) {
    const input = pilot.stepInput(world.state) ?? { mx: 0, my: 0, pressed: false, held: false };
    world.step(STEP, input);
    guard += 1;
  }
  return { screen: SCREEN_PLAY, best: 0 };
}
