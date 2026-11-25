// Every pixel of the kitchen: floor, stations, order tickets, HUD, the chef and the
// food, all drawn as vector shapes on one canvas. No images, no fonts, no network:
// the whole look is code, so the screenshots are renders of this file alone.

import {
  CHEF, CHOPS_TO_FINISH, FIELD, FORMS, GRILL, INGREDIENTS, PALETTE, RECIPES,
  SHIFT_SECONDS, STATIONS,
} from './config.js';
import { matchingOrder } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function labelFor(kind) {
  if (INGREDIENTS[kind]) return INGREDIENTS[kind].label;
  if (FORMS[kind]) return FORMS[kind].label;
  return kind;
}

function colorFor(kind) {
  if (INGREDIENTS[kind]) return INGREDIENTS[kind];
  if (FORMS[kind]) return FORMS[kind];
  return { color: '#cccccc', dark: '#888888' };
}

/** One ingredient, drawn as a small vector icon centred on (cx, cy). */
export function drawIngredient(ctx, kind, cx, cy, r) {
  const c = colorFor(kind);
  ctx.save();
  ctx.translate(cx, cy);
  if (kind === 'bun') {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(0, 2, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.dark;
    ctx.fillRect(-r, 0, r * 2, r * 0.35);
    ctx.fillStyle = '#fdf6e3';
    for (const [sx, sy] of [[-0.4, -0.45], [0, -0.6], [0.4, -0.45], [-0.2, -0.2], [0.25, -0.2]]) {
      ctx.beginPath();
      ctx.arc(sx * r, sy * r, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'patty_raw' || kind === 'patty') {
    ctx.fillStyle = c.color;
    rr(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.5);
    ctx.fill();
    if (kind === 'patty') {
      ctx.strokeStyle = c.dark;
      ctx.lineWidth = r * 0.14;
      for (const ox of [-0.45, 0, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(ox * r, -r * 0.45);
        ctx.lineTo(ox * r, r * 0.45);
        ctx.stroke();
      }
    }
  } else if (kind === 'tomato') {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#58b368';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(-r * 0.35, -r * 0.45);
    ctx.lineTo(0, -r * 0.6);
    ctx.lineTo(r * 0.35, -r * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'tomato_chopped') {
    ctx.fillStyle = c.color;
    for (const ox of [-0.45, 0.45]) {
      ctx.beginPath();
      ctx.arc(ox * r, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f8a9a3';
    ctx.beginPath();
    ctx.arc(-0.45 * r, 0, r * 0.3, 0, Math.PI * 2);
    ctx.arc(0.45 * r, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'lettuce') {
    ctx.fillStyle = c.color;
    for (const [ox, oy, s] of [[-0.4, 0.1, 0.6], [0.4, 0.1, 0.6], [0, -0.35, 0.65]]) {
      ctx.beginPath();
      ctx.arc(ox * r, oy * r, s * r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'lettuce_chopped') {
    ctx.strokeStyle = c.color;
    ctx.lineWidth = r * 0.28;
    ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2] of [[-0.6, -0.3, 0.6, -0.5], [-0.6, 0.1, 0.5, 0.3], [-0.4, 0.5, 0.6, 0.4]]) {
      ctx.beginPath();
      ctx.moveTo(x1 * r, y1 * r);
      ctx.lineTo(x2 * r, y2 * r);
      ctx.stroke();
    }
  } else if (kind === 'cheese') {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.lineTo(r, r * 0.6);
    ctx.lineTo(0, -r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.dark;
    for (const [hx, hy] of [[-0.25, 0.25], [0.25, 0.3], [0, -0.1]]) {
      ctx.beginPath();
      ctx.arc(hx * r, hy * r, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'onion') {
    ctx.fillStyle = '#f3e9f7';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.color;
    ctx.lineWidth = r * 0.16;
    for (const s of [0.65, 0.4, 0.18]) {
      ctx.beginPath();
      ctx.arc(0, 0, s * r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === 'onion_chopped') {
    ctx.fillStyle = '#f3e9f7';
    for (const [ox, oy] of [[-0.4, -0.2], [0.35, -0.3], [0, 0.35], [-0.1, -0.05]]) {
      ctx.beginPath();
      ctx.arc(ox * r, oy * r, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = c.color;
    ctx.lineWidth = r * 0.1;
    for (const [ox, oy] of [[-0.4, -0.2], [0.35, -0.3], [0, 0.35]]) {
      ctx.beginPath();
      ctx.arc(ox * r, oy * r, r * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, r, items) {
  ctx.fillStyle = '#f5f2ea';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8c2b2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  const n = items.length;
  items.forEach((kind, i) => {
    const angle = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55;
    drawIngredient(ctx, kind, x + Math.cos(angle) * r * 0.34, y + Math.sin(angle) * r * 0.34, r * 0.34);
  });
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  function drawFloor() {
    // Back wall band.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 180, FIELD.width, 24);
    ctx.fillStyle = PALETTE.wallTile;
    for (let x = 0; x < FIELD.width; x += 64) ctx.fillRect(x, 180, 60, 24);
    // Checker floor.
    const tile = 64;
    for (let y = 204; y < FIELD.height; y += tile) {
      for (let x = 0; x < FIELD.width; x += tile) {
        ctx.fillStyle = ((x / tile + y / tile) % 2 === 0) ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, tile, tile);
      }
    }
    // Runner rug in front of the serving window.
    ctx.fillStyle = PALETTE.rug;
    rr(ctx, 1060, 420, 196, 240, 10);
    ctx.fill();
    ctx.strokeStyle = '#d9a05b';
    ctx.lineWidth = 3;
    rr(ctx, 1072, 432, 172, 216, 8);
    ctx.stroke();
  }

  function drawCrate(crate) {
    const near = this?.near === crate.id;
    ctx.fillStyle = near ? '#a9743f' : PALETTE.counterWood;
    rr(ctx, crate.x, crate.y, crate.w, crate.h, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    rr(ctx, crate.x + 4, crate.y + 4, crate.w - 8, crate.h - 8, 6);
    ctx.fill();
    drawIngredient(ctx, crate.kind, crate.x + 30, crate.y + crate.h / 2, 20);
    text(ctx, crate.label, crate.x + 56, crate.y + 22, 17, '#2b1d12');
    text(ctx, 'ENDLESS', crate.x + 56, crate.y + 44, 11, '#6b4a2f', 'left', '600');
  }

  function drawBoard(state, near) {
    const b = STATIONS.board;
    ctx.fillStyle = near ? '#e8c491' : PALETTE.boardWood;
    rr(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#b98a5c';
    ctx.lineWidth = 2;
    rr(ctx, b.x + 6, b.y + 6, b.w - 12, b.h - 12, 8);
    ctx.stroke();
    text(ctx, 'CHOP', b.x + b.w / 2, b.y + 18, 13, '#6b4a2f', 'center');
    state.board.forEach((slot, i) => {
      const cx = b.x + 60 + i * 100;
      const cy = b.y + 62;
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      if (slot.item) {
        drawIngredient(ctx, slot.item.kind, cx, cy, 26);
        // Chop ticks: three marks fill as the item is chopped.
        for (let t = 0; t < CHOPS_TO_FINISH; t += 1) {
          ctx.fillStyle = t < slot.item.chops ? '#2f7a3e' : 'rgba(0,0,0,0.25)';
          ctx.fillRect(cx - 24 + t * 18, cy + 36, 12, 5);
        }
        if (slot.item.chops >= CHOPS_TO_FINISH) text(ctx, 'READY', cx, cy - 44, 11, '#2f7a3e', 'center');
      }
    });
  }

  function drawGrill(state, near) {
    const g = STATIONS.grill;
    ctx.fillStyle = near ? '#4a505c' : PALETTE.grillBody;
    rr(ctx, g.x, g.y, g.w, g.h, 10);
    ctx.fill();
    text(ctx, 'GRILL', g.x + g.w / 2, g.y + 18, 13, '#c8ccd4', 'center');
    state.grill.forEach((slot, i) => {
      const cx = g.x + 62 + i * 116;
      const cy = g.y + 62;
      // Grate.
      ctx.fillStyle = '#23272e';
      rr(ctx, cx - 46, cy - 34, 92, 68, 10);
      ctx.fill();
      ctx.strokeStyle = '#565d68';
      ctx.lineWidth = 2;
      for (let gx = -30; gx <= 30; gx += 15) {
        ctx.beginPath();
        ctx.moveTo(cx + gx, cy - 30);
        ctx.lineTo(cx + gx, cy + 30);
        ctx.stroke();
      }
      if (slot.item) {
        const progress = Math.min(1, slot.item.cook / GRILL.cookSeconds);
        const burnt = slot.item.cook >= GRILL.burnSeconds;
        drawIngredient(ctx, burnt ? 'patty' : 'patty_raw', cx, cy, 26);
        if (burnt) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.beginPath();
          ctx.arc(cx, cy, 26, 0, Math.PI * 2);
          ctx.fill();
          text(ctx, 'BURNT', cx, cy - 44, 11, '#e5534b', 'center');
        } else if (progress >= 1) {
          const pulse = 0.6 + 0.4 * Math.sin(state.time * 6);
          ctx.fillStyle = `rgba(242,201,76,${pulse})`;
          ctx.beginPath();
          ctx.arc(cx, cy, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 3;
          ctx.stroke();
          text(ctx, 'DONE', cx, cy - 44, 11, '#f2c94c', 'center');
        } else {
          // Cook progress bar.
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(cx - 26, cy + 36, 52, 6);
          ctx.fillStyle = '#e5534b';
          ctx.fillRect(cx - 26, cy + 36, 52 * progress, 6);
        }
      }
    });
  }

  function drawCounter(state, near) {
    const c = STATIONS.counter;
    const ready = state.plate.items.length > 0 && matchingOrder(state, state.plate.items);
    ctx.fillStyle = near ? '#a9743f' : PALETTE.counterWood;
    rr(ctx, c.x, c.y, c.w, c.h, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    rr(ctx, c.x + 4, c.y + 4, c.w - 8, 26, 6);
    ctx.fill();
    text(ctx, 'PLATING', c.x + c.w / 2, c.y + 17, 13, '#2b1d12', 'center');
    if (state.plate.items.length > 0) {
      if (ready) {
        const pulse = 0.5 + 0.3 * Math.sin(state.time * 5);
        ctx.strokeStyle = `rgba(88,179,104,${pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(c.x + c.w / 2, c.y + 72, 46, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawPlate(ctx, c.x + c.w / 2, c.y + 72, 40, state.plate.items);
      if (ready) text(ctx, 'READY TO SERVE', c.x + c.w / 2, c.y + 108, 12, '#58b368', 'center');
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + 72, 40, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'EMPTY PLATE', c.x + c.w / 2, c.y + 72, 11, 'rgba(0,0,0,0.4)', 'center');
    }
  }

  function drawWindow(state, near) {
    const w = STATIONS.window;
    ctx.fillStyle = near ? '#a34d3f' : '#8a3d33';
    rr(ctx, w.x - 6, w.y - 26, w.w + 12, 34, 8);
    ctx.fill();
    text(ctx, 'SERVE', w.x + w.w / 2, w.y - 9, 15, '#fdf6e3', 'center');
    ctx.fillStyle = '#2b1d12';
    rr(ctx, w.x, w.y, w.w, w.h, 8);
    ctx.fill();
    // A hungry customer waits behind the glass.
    ctx.fillStyle = '#f5d9a8';
    ctx.beginPath();
    ctx.arc(w.x + w.w / 2, w.y + 52, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.arc(w.x + w.w / 2 - 10, w.y + 48, 3, 0, Math.PI * 2);
    ctx.arc(w.x + w.w / 2 + 10, w.y + 48, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x + w.w / 2, w.y + 56, 10, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#58b368';
    rr(ctx, w.x + 8, w.y + 88, w.w - 16, 24, 6);
    ctx.fill();
    text(ctx, state.orders.length > 0 ? `${state.orders.length} WAITING` : 'NO ORDERS', w.x + w.w / 2, w.y + 100, 12, '#fdf6e3', 'center');
  }

  function drawTrash(near) {
    const t = STATIONS.trash;
    ctx.fillStyle = near ? '#6a707c' : '#4a505c';
    rr(ctx, t.x, t.y, t.w, t.h, 8);
    ctx.fill();
    ctx.fillStyle = '#2b2f36';
    rr(ctx, t.x + 10, t.y + 10, t.w - 20, 14, 4);
    ctx.fill();
    text(ctx, 'TRASH', t.x + t.w / 2, t.y + 48, 14, '#c8ccd4', 'center');
    text(ctx, 'drop mistakes here', t.x + t.w / 2, t.y + 66, 11, '#9aa0ab', 'center');
  }

  function drawOrders(state) {
    const y = 84;
    const w = 296;
    const h = 88;
    if (state.orders.length === 0) {
      ctx.fillStyle = 'rgba(253,246,227,0.85)';
      rr(ctx, 24, y, 360, h, 10);
      ctx.fill();
      text(ctx, 'No orders yet — the lunch rush is coming.', 44, y + h / 2, 16, '#6b4a2f');
      return;
    }
    state.orders.forEach((order, i) => {
      const x = 24 + i * (w + 12);
      const recipe = RECIPES[order.recipeIndex];
      const fraction = Math.max(0, order.patience / order.maxPatience);
      const urgent = order.patience < 12;
      const pulse = urgent ? 0.75 + 0.25 * Math.sin(state.time * 8) : 1;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = PALETTE.ticket;
      rr(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = urgent ? '#e5534b' : PALETTE.ticketEdge;
      ctx.lineWidth = urgent ? 3 : 2;
      rr(ctx, x, y, w, h, 10);
      ctx.stroke();
      ctx.globalAlpha = 1;
      text(ctx, `#${order.id}  ${recipe.name}`, x + 12, y + 20, 16, '#2b1d12');
      text(ctx, `$${recipe.price}`, x + w - 12, y + 20, 16, '#2f7a3e', 'right');
      recipe.items.forEach((kind, j) => {
        drawIngredient(ctx, kind, x + 28 + j * 40, y + 52, 15);
      });
      // Patience bar.
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      rr(ctx, x + 12, y + 72, w - 24, 8, 4);
      ctx.fill();
      ctx.fillStyle = fraction > 0.5 ? '#58b368' : fraction > 0.25 ? '#f2a93b' : '#e5534b';
      if (fraction > 0) {
        rr(ctx, x + 12, y + 72, (w - 24) * fraction, 8, 4);
        ctx.fill();
      }
      text(ctx, `${Math.ceil(order.patience)}s`, x + w - 12, y + 52, 13, '#6b4a2f', 'right');
    });
  }

  function drawChef(state) {
    const chef = state.chef;
    const bob = chef.moving ? Math.sin(state.time * 14) * 2 : 0;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(chef.x, chef.y + 18, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: white coat.
    ctx.fillStyle = PALETTE.chefCoat;
    rr(ctx, chef.x - 18, chef.y - 8 + bob, 36, 30, 10);
    ctx.fill();
    ctx.strokeStyle = '#c8c2b2';
    ctx.lineWidth = 2;
    rr(ctx, chef.x - 18, chef.y - 8 + bob, 36, 30, 10);
    ctx.stroke();
    // Head.
    ctx.fillStyle = PALETTE.chefSkin;
    ctx.beginPath();
    ctx.arc(chef.x, chef.y - 18 + bob, 14, 0, Math.PI * 2);
    ctx.fill();
    // Chef hat.
    ctx.fillStyle = PALETTE.chefHat;
    rr(ctx, chef.x - 15, chef.y - 36 + bob, 30, 12, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(chef.x - 8, chef.y - 36 + bob, 9, 0, Math.PI * 2);
    ctx.arc(chef.x + 8, chef.y - 36 + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    // Eyes look where the chef walks.
    const ex = chef.dirX * 3;
    const ey = chef.dirY * 2;
    ctx.fillStyle = '#2b1d12';
    ctx.beginPath();
    ctx.arc(chef.x - 5 + ex, chef.y - 19 + bob + ey, 2, 0, Math.PI * 2);
    ctx.arc(chef.x + 5 + ex, chef.y - 19 + bob + ey, 2, 0, Math.PI * 2);
    ctx.fill();
    // Carried item floats above the hat.
    if (chef.carry) {
      if (chef.carry.kind === 'plate') {
        drawPlate(ctx, chef.x, chef.y - 52 + bob, 24, chef.carry.items);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(chef.x, chef.y - 52 + bob, 20, 0, Math.PI * 2);
        ctx.fill();
        drawIngredient(ctx, chef.carry.kind, chef.x, chef.y - 52 + bob, 14);
      }
    }
  }

  function drawHud(state, best) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, 72);
    ctx.fillStyle = PALETTE.hudEdge;
    ctx.fillRect(0, 70, FIELD.width, 2);
    text(ctx, 'EMBER & THYME', 24, 26, 22, '#f2c94c');
    text(ctx, 'a tiny busy kitchen', 24, 52, 12, PALETTE.muted, 'left', '400');
    // Shift timer.
    const left = Math.max(0, SHIFT_SECONDS - state.time);
    const minutes = Math.floor(left / 60);
    const seconds = Math.floor(left % 60);
    const timerColor = left < 30 ? '#e5534b' : '#f5efe4';
    text(ctx, `${minutes}:${String(seconds).padStart(2, '0')}`, 640, 26, 26, timerColor, 'center');
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    rr(ctx, 500, 46, 280, 10, 5);
    ctx.fill();
    ctx.fillStyle = left < 30 ? '#e5534b' : '#58b368';
    rr(ctx, 500, 46, 280 * (left / SHIFT_SECONDS), 10, 5);
    ctx.fill();
    text(ctx, 'SHIFT', 640, 66, 10, PALETTE.muted, 'center', '600');
    // Coins, combo, served, rush.
    text(ctx, `$${state.coins}`, 1000, 26, 24, '#f2c94c', 'right');
    text(ctx, 'EARNED', 1000, 52, 10, PALETTE.muted, 'right', '600');
    const comboText = state.combo > 1 ? `COMBO x${state.combo}` : 'COMBO —';
    text(ctx, comboText, 1120, 26, 18, state.combo > 1 ? '#58b368' : PALETTE.muted, 'right');
    text(ctx, `SERVED ${state.served}  •  RUSH ${state.rush}  •  BEST $${best}`, 1120, 52, 11, PALETTE.muted, 'right', '600');
    if (state.rush >= 3 && !state.over) {
      const pulse = 0.7 + 0.3 * Math.sin(state.time * 6);
      ctx.globalAlpha = pulse;
      text(ctx, 'RUSH HOUR', 800, 26, 14, '#e5534b', 'left');
      ctx.globalAlpha = 1;
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of state.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      text(ctx, f.text, f.x, f.y, 20, f.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  function drawPrompt(state, nearId) {
    if (!nearId) return;
    const station = [...STATIONS.crates, STATIONS.board, STATIONS.grill, STATIONS.counter, STATIONS.window, STATIONS.trash]
      .find((s) => s.id === nearId);
    if (!station) return;
    const hints = {
      board: 'E: chop / pick up',
      grill: 'E: grill / pick up',
      counter: 'E: add / pick up plate',
      window: 'E: serve the plate',
      trash: 'E: throw away',
    };
    const hint = station.id.startsWith('crate-') ? 'E: take one' : hints[station.id] ?? 'E: use';
    const x = station.x + station.w / 2;
    const y = station.y + station.h + 14;
    ctx.fillStyle = 'rgba(43,29,18,0.9)';
    ctx.font = '600 13px system-ui, sans-serif';
    const width = ctx.measureText(hint).width + 24;
    rr(ctx, x - width / 2, y, width, 24, 12);
    ctx.fill();
    text(ctx, hint, x, y + 13, 13, '#f5efe4', 'center', '600');
  }

  function drawOverlay(state, screen, best) {
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(20,12,6,0.72)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text(ctx, 'EMBER & THYME', 640, 250, 56, '#f2c94c', 'center');
      text(ctx, 'A tiny busy kitchen. Cook fast, serve faster.', 640, 300, 20, '#f5efe4', 'center', '400');
      text(ctx, 'WASD / arrows to walk  •  E to grab, chop, grill, plate and serve', 640, 350, 17, '#cbb79d', 'center', '400');
      text(ctx, 'Click the floor to walk there, too. Match the order board, mind the grill —', 640, 378, 17, '#cbb79d', 'center', '400');
      text(ctx, 'patties burn. A full 3-minute shift, tips for fast serves.', 640, 406, 17, '#cbb79d', 'center', '400');
      const pulse = 0.7 + 0.3 * Math.sin(state.time * 4);
      ctx.globalAlpha = pulse;
      text(ctx, 'PRESS SPACE TO START THE SHIFT', 640, 470, 22, '#58b368', 'center');
      ctx.globalAlpha = 1;
      if (best > 0) text(ctx, `Best shift so far: $${best}`, 640, 510, 16, '#f2c94c', 'center', '400');
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(20,12,6,0.65)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text(ctx, 'PAUSED', 640, 330, 48, '#f5efe4', 'center');
      text(ctx, 'Press P or Space to keep cooking', 640, 380, 18, '#cbb79d', 'center', '400');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(20,12,6,0.78)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text(ctx, 'SHIFT OVER', 640, 250, 52, '#f2c94c', 'center');
      text(ctx, `You earned $${state.coins}  •  ${state.served} dishes served  •  ${state.expired} orders walked out`, 640, 310, 20, '#f5efe4', 'center', '400');
      text(ctx, `Best combo x${state.bestCombo}  •  Best shift $${Math.max(best, state.coins)}`, 640, 345, 18, '#cbb79d', 'center', '400');
      const verdict = state.coins >= 120 ? 'The lunch crowd will be back tomorrow.' : state.coins >= 60 ? 'A solid shift — the grill stayed under control.' : 'Rough shift. The tickets kept coming.';
      text(ctx, verdict, 640, 390, 18, '#58b368', 'center', '400');
      text(ctx, 'PRESS R TO COOK AGAIN', 640, 460, 22, '#58b368', 'center');
    }
  }

  function draw(state, screen, best, nearId) {
    drawFloor();
    const near = nearId ?? null;
    for (const crate of STATIONS.crates) drawCrate.call({ near }, crate);
    drawBoard(state, near === 'board');
    drawGrill(state, near === 'grill');
    drawCounter(state, near === 'counter');
    drawWindow(state, near === 'window');
    drawTrash(near === 'trash');
    drawOrders(state);
    drawChef(state);
    drawParticles(state);
    if (screen === SCREEN_PLAY) drawPrompt(state, near);
    drawHud(state, best);
    // Red flash when an order walks out.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(229,83,75,${state.flash * 0.18})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    drawOverlay(state, screen, best);
  }

  return { draw, drawIngredient };
}
