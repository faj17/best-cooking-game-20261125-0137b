// Keyboard and mouse: WASD/arrows to walk, E or Space to use the station in front of
// you (hold E to keep chopping), P to pause, M to mute, R to restart after a shift.
// Clicking the floor sets a walk target; clicking a station in reach uses it at once.
// The input object is a plain data bag the world reads each fixed step, which is what
// lets the screenshot pilot drive the same game with scripted inputs.

export const ACTION_INTERACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

export function createInput(canvas) {
  const keys = new Set();
  /** Click target in logical 1280x720 coordinates, or null. */
  let clickTarget = null;
  let clickStation = null;
  let actions = 0;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (key === 'e' || key === ' ') actions |= ACTION_INTERACT;
    else if (key === 'p' || key === 'Escape') actions |= ACTION_PAUSE;
    else if (key === 'm') actions |= ACTION_MUTE;
    else if (key === 'r') actions |= ACTION_RESTART;
    keys.add(key);
  });
  window.addEventListener('keyup', (event) => keys.delete(keyName(event)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 720;
    clickTarget = { x, y };
    clickStation = { x, y };
  });

  /** Movement direction from keys, or from a click target the caller resolves. */
  function keyDirection() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  return {
    /** True while E or Space is held down (chopping holds the key). */
    interactHeld() {
      return keys.has('e') || keys.has(' ');
    },
    keyDirection,
    takeClickTarget() {
      const target = clickTarget;
      clickTarget = null;
      return target;
    },
    takeClickStation() {
      const target = clickStation;
      clickStation = null;
      return target;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
