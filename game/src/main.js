// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the order pattern. ?shot=cover|chop|grill|serve (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_CHOP, EVENT_ERROR, EVENT_EXPIRED, EVENT_GRILL_DONE,
  EVENT_OVER, EVENT_PICKUP, EVENT_PLACE, EVENT_SERVED, EVENT_TRASH, nearestStation,
} from './world.js';
import { ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, SCREEN_PLAY, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let moveTarget = null;
  let wasHeld = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    moveTarget = null;
    screen = SCREEN_PLAY;
    sound.unlock();
    announce('Playing. Serve the orders before their patience runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Shift over. Earned $${world.state.coins}. Best $${best}.`);
  }

  function playEvents(events) {
    if (events & EVENT_SERVED) sound.serve();
    else if (events & EVENT_EXPIRED) sound.expire();
    if (events & EVENT_PICKUP) sound.pickup();
    if (events & EVENT_PLACE) sound.place();
    if (events & EVENT_CHOP) sound.chop();
    if (events & EVENT_GRILL_DONE) sound.grillDone();
    if (events & EVENT_TRASH) sound.trash();
    if (events & EVENT_ERROR) sound.error();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen === SCREEN_OVER) startGame();
    else if (actions & ACTION_INTERACT && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      if (screen === SCREEN_TITLE) startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_INTERACT) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    const clickStation = input.takeClickStation();
    if (clickStation && screen === SCREEN_PLAY) {
      // A click on a station in reach uses it; anywhere else becomes a walk target.
      const found = nearestStation(world.state);
      moveTarget = clickStation;
      if (found) {
        const station = found.station;
        const inside = clickStation.x >= station.x - 20 && clickStation.x <= station.x + station.w + 20
          && clickStation.y >= station.y - 20 && clickStation.y <= station.y + station.h + 20;
        if (inside) {
          const events = world.step(0, { mx: 0, my: 0, pressed: true, held: true });
          playEvents(events);
        }
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { mx: 0, my: 0, pressed: false, held: false });
      return;
    }
    let mx = 0;
    let my = 0;
    const keys = input.keyDirection();
    if (keys.x !== 0 || keys.y !== 0) {
      mx = keys.x;
      my = keys.y;
      moveTarget = null;
    } else if (moveTarget) {
      const dx = moveTarget.x - world.state.chef.x;
      const dy = moveTarget.y - world.state.chef.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 10) {
        moveTarget = null;
      } else {
        mx = dx / distance;
        my = dy / distance;
      }
    }
    const held = input.interactHeld();
    const pressed = held && !wasHeld;
    wasHeld = held;
    const events = world.step(STEP, { mx, my, pressed, held });
    playEvents(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_EXPIRED) announce(`An order walked out. ${world.state.orders.length} waiting.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const found = screen === SCREEN_PLAY ? nearestStation(world.state) : null;
    renderer.draw(world.state, screen, best, found ? found.station.id : null);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember and Thyme. Press Space or click to start the shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
