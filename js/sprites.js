// Procedural cartoon art for every pinnable object. Each sprite is drawn once
// into an offscreen canvas at the current screen resolution and reused.
import { TAU } from './config.js';

const OL = '#2a1a12'; // outline colour
const LW = 3;

function path(ctx, fill, stroke = OL, lw = LW) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}
function circ(ctx, x, y, r, fill, stroke = OL, lw = LW) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  path(ctx, fill, stroke, lw);
}
function ell(ctx, x, y, rx, ry, rot, fill, stroke = OL, lw = LW) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  path(ctx, fill, stroke, lw);
}
function rrect(ctx, x, y, w, h, r, fill, stroke = OL, lw = LW) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  path(ctx, fill, stroke, lw);
}
function shine(ctx, x, y, rx, ry, a = 0.55, rot = -0.6) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fill();
}
function poly(ctx, pts, fill, stroke = OL, lw = LW) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  path(ctx, fill, stroke, lw);
}
function star(ctx, x, y, n, r1, r2, rot, fill, stroke = OL, lw = LW) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i * Math.PI) / n - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  path(ctx, fill, stroke, lw);
}
function line(ctx, x1, y1, x2, y2, color = OL, lw = LW) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export const SPRITES = {};
// r: hit radius, pts: base points, beh: default movement behaviour, label: objective text
function def(name, r, pts, beh, label, draw, colors) {
  SPRITES[name] = { name, r, pts, beh, label, draw, colors: colors || ['#fff', '#ffd54a'] };
}

/* ---------------- Candy ---------------- */
def('lollipop', 34, 20, 'fall', 'lollipops', (c) => {
  rrect(c, -3, 2, 6, 36, 3, '#f5f0e6');
  circ(c, 0, -10, 24, '#ff5fa2');
  c.save();
  c.beginPath();
  c.arc(0, -10, 22, 0, TAU);
  c.clip();
  c.strokeStyle = '#fff';
  c.lineWidth = 5;
  c.beginPath();
  for (let a = 0; a < 18; a += 0.2) c.lineTo(Math.cos(a) * a * 1.25, -10 + Math.sin(a) * a * 1.25);
  c.stroke();
  c.restore();
  circ(c, 0, -10, 24, null);
  shine(c, -9, -20, 7, 4);
}, ['#ff5fa2', '#fff']);
def('wrapped', 32, 15, 'fall', 'wrapped candies', (c) => {
  poly(c, [-18, 0, -36, -14, -32, 0, -36, 14], '#46c6ff');
  poly(c, [18, 0, 36, -14, 32, 0, 36, 14], '#46c6ff');
  ell(c, 0, 0, 22, 16, 0, '#2b9be6');
  line(c, -8, -12, -8, 12, 'rgba(255,255,255,0.7)', 4);
  line(c, 6, -13, 6, 13, 'rgba(255,255,255,0.7)', 4);
  shine(c, -6, -7, 8, 3);
}, ['#46c6ff', '#fff']);
def('cane', 34, 20, 'fall', 'candy canes', (c) => {
  c.beginPath();
  c.moveTo(6, 34);
  c.lineTo(6, -12);
  c.arc(-6, -12, 12, 0, Math.PI, true);
  c.lineTo(-18, -2);
  c.lineCap = 'round';
  c.strokeStyle = OL;
  c.lineWidth = 15;
  c.stroke();
  c.strokeStyle = '#fff';
  c.lineWidth = 9;
  c.stroke();
  c.setLineDash([6, 7]);
  c.strokeStyle = '#e8303a';
  c.stroke();
  c.setLineDash([]);
}, ['#e8303a', '#fff']);
def('gumdrop', 26, 25, 'fall', 'gumdrops', (c) => {
  c.beginPath();
  c.moveTo(-24, 18);
  c.quadraticCurveTo(-26, -24, 0, -24);
  c.quadraticCurveTo(26, -24, 24, 18);
  c.closePath();
  path(c, '#7ee04a');
  for (let i = 0; i < 9; i++) circ(c, -15 + ((i * 7) % 30), -12 + ((i * 11) % 26), 1.6, '#e8ffd8', null);
  shine(c, -9, -12, 6, 4);
}, ['#7ee04a', '#e8ffd8']);
def('donut', 32, 15, 'fall', 'donuts', (c) => {
  circ(c, 0, 0, 30, '#d99a50');
  c.beginPath();
  for (let a = 0; a <= TAU + 0.01; a += TAU / 14) {
    const r = 24 + Math.sin(a * 5) * 3;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  path(c, '#ff86c2');
  const sc = ['#fff', '#ffe14a', '#4ad8ff', '#7cff6a'];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 15 + (i % 3) * 3;
    line(c, Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * r + 3, Math.sin(a) * r + 2, sc[i % 4], 3);
  }
  circ(c, 0, 0, 9, '#4a2c1a');
  shine(c, -12, -14, 7, 3, 0.4);
}, ['#ff86c2', '#ffe14a']);
def('cupcake', 34, 20, 'fall', 'cupcakes', (c) => {
  poly(c, [-22, 4, 22, 4, 16, 32, -16, 32], '#5bc0eb');
  for (let x = -14; x <= 14; x += 7) line(c, x, 6, x * 0.8, 30, 'rgba(0,0,0,0.25)', 2);
  c.beginPath();
  c.arc(-12, 0, 13, Math.PI * 0.5, Math.PI * 1.6);
  c.arc(0, -10, 15, Math.PI, 0);
  c.arc(12, 0, 13, Math.PI * 1.4, Math.PI * 0.5);
  c.closePath();
  path(c, '#fff0f6');
  circ(c, 0, -26, 6, '#e8303a');
  shine(c, -2, -28, 2, 1.5, 0.8);
}, ['#fff0f6', '#e8303a']);

/* ---------------- Garbage ---------------- */
def('can', 30, 15, 'fall', 'soda cans', (c) => {
  poly(c, [-14, -26, 14, -26, 16, -6, 12, 0, 16, 8, 14, 26, -14, 26, -16, 6, -12, 0, -16, -8], '#d63a3a');
  rrect(c, -14, -8, 28, 10, 2, '#f2f2f2', null);
  ell(c, 0, -26, 14, 4, 0, '#c8c8c8');
  line(c, -10, 14, 8, 20, 'rgba(255,255,255,0.5)', 3);
}, ['#d63a3a', '#ccc']);
def('peel', 32, 20, 'fall', 'banana peels', (c) => {
  c.fillStyle = '#ffe14a';
  const lobes = [[-0.6, 1], [0.1, 1.1], [0.8, 0.9]];
  for (const [a, s] of lobes) {
    c.save();
    c.rotate(a);
    c.beginPath();
    c.moveTo(-6, -4);
    c.quadraticCurveTo(-16, 18 * s, -4, 30 * s);
    c.quadraticCurveTo(6, 18 * s, 6, -4);
    path(c, '#ffd93a');
    c.restore();
  }
  ell(c, 0, -10, 9, 14, 0, '#f6e7a6');
  rrect(c, -3, -30, 6, 10, 2, '#6b4a1e');
}, ['#ffd93a', '#6b4a1e']);
def('paper', 26, 10, 'fall', 'paper balls', (c) => {
  poly(c, [-22, -6, -14, -20, 2, -24, 18, -16, 24, 0, 18, 18, 0, 24, -18, 16], '#f0efe8');
  line(c, -12, -10, 6, 4, '#b9b6a8', 2);
  line(c, 6, 4, 2, 18, '#b9b6a8', 2);
  line(c, 6, 4, 18, -6, '#b9b6a8', 2);
  line(c, -16, 6, -4, 10, '#b9b6a8', 2);
}, ['#f0efe8', '#b9b6a8']);
def('fishbone', 34, 25, 'fall', 'fish bones', (c) => {
  line(c, -24, 0, 22, 0, OL, 7);
  line(c, -24, 0, 22, 0, '#f2f2ea', 3);
  for (let x = -14; x <= 12; x += 7) {
    line(c, x, 0, x - 5, -12, OL, 5); line(c, x, 0, x - 5, -12, '#f2f2ea', 2);
    line(c, x, 0, x - 5, 12, OL, 5); line(c, x, 0, x - 5, 12, '#f2f2ea', 2);
  }
  poly(c, [20, 0, 34, -12, 34, 12], '#f2f2ea');
  poly(c, [-22, 0, -34, -10, -34, 10], '#f2f2ea');
  circ(c, 28, -2, 2, OL, null);
}, ['#f2f2ea', '#999']);
def('core', 30, 15, 'fall', 'apple cores', (c) => {
  c.beginPath();
  c.moveTo(-16, -20); c.quadraticCurveTo(-4, -8, -6, 0); c.quadraticCurveTo(-4, 8, -16, 20);
  c.lineTo(16, 20); c.quadraticCurveTo(4, 8, 6, 0); c.quadraticCurveTo(4, -8, 16, -20); c.closePath();
  path(c, '#fff4d6');
  ell(c, 0, -22, 17, 7, 0, '#d63a3a');
  ell(c, 0, 22, 17, 7, 0, '#d63a3a');
  ell(c, -2, -2, 2, 4, 0.3, '#3a2010', null);
  ell(c, 3, 4, 2, 4, -0.3, '#3a2010', null);
  line(c, 0, -28, 3, -36, '#6b4a1e', 4);
}, ['#fff4d6', '#d63a3a']);
def('boot', 34, 30, 'fall', 'old boots', (c) => {
  c.beginPath();
  c.moveTo(-14, -28); c.lineTo(8, -28); c.lineTo(8, 4); c.quadraticCurveTo(30, 4, 30, 18);
  c.lineTo(30, 24); c.lineTo(-16, 24); c.closePath();
  path(c, '#7a5230');
  rrect(c, -18, 20, 50, 8, 3, '#3a2a1a');
  for (let y = -20; y < 4; y += 7) line(c, -6, y, 6, y + 3, '#e8d9b0', 2);
  line(c, -14, -28, 8, -28, '#4a3018', 5);
}, ['#7a5230', '#3a2a1a']);

/* ---------------- Party ---------------- */
function balloon(color) {
  return (c) => {
    c.beginPath();
    c.moveTo(0, 26);
    c.bezierCurveTo(-8, 34, 8, 40, 0, 50);
    c.strokeStyle = '#555'; c.lineWidth = 2; c.stroke();
    ell(c, 0, -6, 24, 30, 0, color);
    poly(c, [-5, 26, 5, 26, 0, 20], color, OL, 2);
    shine(c, -9, -18, 6, 10, 0.5, 0.3);
  };
}
def('balloon_r', 30, 20, 'float', 'balloons', balloon('#ff4b5c'), ['#ff4b5c', '#fff']);
def('balloon_b', 30, 20, 'float', 'balloons', balloon('#3fa7ff'), ['#3fa7ff', '#fff']);
def('balloon_y', 30, 20, 'float', 'balloons', balloon('#ffd23f'), ['#ffd23f', '#fff']);
def('hat', 32, 20, 'fall', 'party hats', (c) => {
  poly(c, [0, -34, 24, 26, -24, 26], '#9b5de5');
  c.save();
  c.beginPath(); c.moveTo(0, -34); c.lineTo(24, 26); c.lineTo(-24, 26); c.closePath(); c.clip();
  for (let i = -3; i < 4; i++) line(c, -30, i * 14, 30, i * 14 - 24, '#ffd23f', 5);
  c.restore();
  poly(c, [0, -34, 24, 26, -24, 26], null);
  circ(c, 0, -36, 7, '#ff4b5c');
}, ['#9b5de5', '#ffd23f']);
function streamer(color) {
  return (c) => {
    c.beginPath();
    for (let y = -34; y <= 34; y += 2) c.lineTo(Math.sin(y * 0.18) * 14, y);
    c.lineCap = 'round';
    c.strokeStyle = OL; c.lineWidth = 11; c.stroke();
    c.strokeStyle = color; c.lineWidth = 6; c.stroke();
  };
}
def('streamer_p', 30, 25, 'flutter', 'streamers', streamer('#ff5fa2'), ['#ff5fa2', '#ffd23f']);
def('streamer_g', 30, 25, 'flutter', 'streamers', streamer('#2ee59d'), ['#2ee59d', '#3fa7ff']);
def('gift', 30, 20, 'fall', 'gifts', (c) => {
  rrect(c, -24, -16, 48, 40, 4, '#ff4b5c');
  rrect(c, -27, -24, 54, 12, 3, '#ff6b7a');
  rrect(c, -5, -24, 10, 48, 1, '#ffd23f');
  ell(c, -9, -30, 9, 6, 0.4, '#ffd23f');
  ell(c, 9, -30, 9, 6, -0.4, '#ffd23f');
}, ['#ff4b5c', '#ffd23f']);
def('cake', 30, 20, 'fall', 'cake slices', (c) => {
  poly(c, [-26, 22, 26, 22, 26, -6, -26, -6], '#f6d6a8');
  rrect(c, -26, 4, 52, 6, 0, '#ff86c2', null);
  poly(c, [-26, -6, 26, -6, 26, -16, -26, -16], '#fff');
  circ(c, 0, -22, 6, '#e8303a');
  poly(c, [-26, 22, 26, 22, 26, -16, -26, -16], null);
}, ['#f6d6a8', '#ff86c2']);

/* ---------------- Fruit ---------------- */
def('apple', 30, 15, 'fall', 'apples', (c) => {
  c.beginPath();
  c.moveTo(0, -16);
  c.bezierCurveTo(16, -30, 34, -10, 24, 12);
  c.bezierCurveTo(16, 30, 4, 28, 0, 24);
  c.bezierCurveTo(-4, 28, -16, 30, -24, 12);
  c.bezierCurveTo(-34, -10, -16, -30, 0, -16);
  path(c, '#e53935');
  line(c, 0, -16, 3, -30, '#6b4a1e', 4);
  ell(c, 10, -26, 9, 4, -0.5, '#66bb34', OL, 2);
  shine(c, -12, -6, 5, 8, 0.45, 0.2);
}, ['#e53935', '#66bb34']);
def('orange', 28, 15, 'fall', 'oranges', (c) => {
  circ(c, 0, 0, 26, '#ff9f1c');
  for (let i = 0; i < 10; i++) circ(c, Math.cos(i * 2.1) * 14, Math.sin(i * 2.1) * 14, 1.3, '#e07b00', null);
  ell(c, 6, -26, 8, 4, -0.3, '#66bb34', OL, 2);
  shine(c, -10, -10, 7, 5);
}, ['#ff9f1c', '#66bb34']);
def('melon', 36, 25, 'fall', 'watermelon slices', (c) => {
  c.beginPath(); c.arc(0, -10, 34, 0, Math.PI); c.closePath(); path(c, '#3c9a3c');
  c.beginPath(); c.arc(0, -10, 27, 0, Math.PI); c.closePath(); path(c, '#d6f5c0', null);
  c.beginPath(); c.arc(0, -10, 24, 0, Math.PI); c.closePath(); path(c, '#ff4d6d', null);
  for (let i = 0; i < 6; i++) ell(c, -15 + i * 6, -2 + (i % 2) * 7, 1.5, 3, 0, '#2a1a12', null);
  c.beginPath(); c.arc(0, -10, 34, 0, Math.PI); c.closePath(); path(c, null);
}, ['#ff4d6d', '#3c9a3c']);
def('banana', 32, 20, 'fall', 'bananas', (c) => {
  c.beginPath();
  c.arc(0, -22, 40, Math.PI * 0.25, Math.PI * 0.75);
  c.arc(0, -40, 50, Math.PI * 0.68, Math.PI * 0.32, true);
  c.closePath();
  path(c, '#ffe14a');
  circ(c, 28, 7, 3, '#5a3a14', null);
  circ(c, -28, 7, 3, '#5a3a14', null);
}, ['#ffe14a', '#5a3a14']);
def('pear', 32, 15, 'fall', 'pears', (c) => {
  c.beginPath();
  c.moveTo(0, -24);
  c.bezierCurveTo(12, -24, 10, -6, 20, 6);
  c.bezierCurveTo(30, 22, 16, 32, 0, 32);
  c.bezierCurveTo(-16, 32, -30, 22, -20, 6);
  c.bezierCurveTo(-10, -6, -12, -24, 0, -24);
  path(c, '#b5d64a');
  line(c, 0, -24, -2, -34, '#6b4a1e', 4);
  shine(c, -8, 10, 5, 8, 0.4, 0.2);
}, ['#b5d64a', '#6b4a1e']);
def('cherries', 30, 30, 'fall', 'cherries', (c) => {
  c.beginPath(); c.moveTo(-12, 10); c.quadraticCurveTo(-6, -16, 4, -28);
  c.moveTo(12, 14); c.quadraticCurveTo(10, -10, 4, -28);
  c.strokeStyle = '#4a7a2a'; c.lineWidth = 3; c.stroke();
  circ(c, -12, 14, 12, '#c2132e'); circ(c, 12, 18, 12, '#c2132e');
  shine(c, -16, 10, 3, 2); shine(c, 8, 14, 3, 2);
  ell(c, 12, -26, 9, 4, -0.4, '#66bb34', OL, 2);
}, ['#c2132e', '#66bb34']);
def('grapes', 32, 20, 'fall', 'grapes', (c) => {
  const pts = [[-12, -12], [0, -14], [12, -12], [-6, 0], [6, 0], [-12, 2], [12, 2], [0, 12], [-6, 22], [6, 22], [0, 30]];
  for (const [x, y] of pts) { circ(c, x, y - 2, 9, '#7b3fa0'); shine(c, x - 3, y - 5, 2.5, 1.5, 0.5); }
  ell(c, 8, -26, 10, 5, -0.4, '#66bb34', OL, 2);
}, ['#7b3fa0', '#66bb34']);
def('berry', 28, 25, 'fall', 'strawberries', (c) => {
  c.beginPath();
  c.moveTo(0, 28); c.bezierCurveTo(-30, 6, -24, -20, 0, -16); c.bezierCurveTo(24, -20, 30, 6, 0, 28);
  path(c, '#ff3b4f');
  for (let i = 0; i < 9; i++) ell(c, -10 + (i % 3) * 10, -6 + Math.floor(i / 3) * 10, 1.4, 2.2, 0, '#ffe680', null);
  star(c, 0, -18, 5, 14, 5, 0, '#4caf50', OL, 2);
}, ['#ff3b4f', '#4caf50']);

/* ---------------- Autumn ---------------- */
function maple(color) {
  return (c) => {
    c.beginPath();
    const p = [0, -34, 7, -18, 20, -24, 16, -8, 32, -6, 24, 4, 28, 14, 10, 10, 6, 22, 0, 18, -6, 22, -10, 10, -28, 14, -24, 4, -32, -6, -16, -8, -20, -24, -7, -18];
    poly(c, p, color);
    line(c, 0, 18, 0, 34, '#6b4a1e', 3);
    line(c, 0, 16, 0, -26, 'rgba(0,0,0,0.25)', 2);
    line(c, 0, 4, 22, -4, 'rgba(0,0,0,0.25)', 2);
    line(c, 0, 4, -22, -4, 'rgba(0,0,0,0.25)', 2);
  };
}
def('maple_r', 32, 20, 'flutter', 'maple leaves', maple('#e2411f'), ['#e2411f', '#ffb020']);
def('maple_o', 32, 20, 'flutter', 'maple leaves', maple('#ff8c1a'), ['#ff8c1a', '#ffd23f']);
def('maple_y', 32, 20, 'flutter', 'maple leaves', maple('#f6c026'), ['#f6c026', '#ff8c1a']);
def('oak', 30, 20, 'flutter', 'oak leaves', (c) => {
  c.beginPath();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, y = -30 + t * 56;
    const w = Math.sin(t * Math.PI) * 18 + Math.sin(t * Math.PI * 5) * 5;
    c.lineTo(w, y);
  }
  for (let i = 20; i >= 0; i--) {
    const t = i / 20, y = -30 + t * 56;
    const w = Math.sin(t * Math.PI) * 18 + Math.sin(t * Math.PI * 5) * 5;
    c.lineTo(-w, y);
  }
  path(c, '#a8642a');
  line(c, 0, -26, 0, 34, '#5a3414', 3);
}, ['#a8642a', '#5a3414']);
def('acorn', 24, 30, 'fast', 'acorns', (c) => {
  ell(c, 0, 6, 15, 18, 0, '#c98a3c');
  c.beginPath(); c.arc(0, -4, 19, Math.PI, 0); c.closePath(); path(c, '#7a5230');
  for (let x = -12; x <= 12; x += 6) line(c, x, -16, x + 3, -6, 'rgba(0,0,0,0.3)', 2);
  line(c, 0, -22, 4, -28, '#5a3414', 4);
  shine(c, -6, 8, 3, 6, 0.35, 0.2);
}, ['#c98a3c', '#7a5230']);
def('pinecone', 30, 20, 'fall', 'pinecones', (c) => {
  ell(c, 0, 0, 18, 28, 0, '#8a5a2b');
  for (let r = -20; r <= 20; r += 8) for (let x = -12; x <= 12; x += 8) {
    c.beginPath(); c.arc(x + ((r / 8) % 2) * 4, r, 5, 0, Math.PI); path(c, '#a86f36', OL, 1.5);
  }
}, ['#8a5a2b', '#a86f36']);
def('mushroom', 30, 25, 'fall', 'mushrooms', (c) => {
  rrect(c, -9, -2, 18, 26, 6, '#f3e6c8');
  c.beginPath(); c.arc(0, 0, 28, Math.PI, 0); c.closePath(); path(c, '#e53935');
  circ(c, -14, -10, 4, '#fff', null); circ(c, 4, -18, 5, '#fff', null); circ(c, 16, -6, 3.5, '#fff', null);
}, ['#e53935', '#fff']);

/* ---------------- Toys ---------------- */
def('duck', 30, 20, 'fall', 'rubber ducks', (c) => {
  ell(c, 2, 10, 26, 16, 0, '#ffd23f');
  circ(c, -8, -12, 14, '#ffd23f');
  poly(c, [-20, -12, -34, -8, -20, -4], '#ff8c1a', OL, 2);
  circ(c, -10, -15, 2.5, OL, null);
  c.beginPath(); c.arc(8, 8, 10, 0.2, 2.4); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.stroke();
  shine(c, -4, -18, 4, 2.5);
}, ['#ffd23f', '#ff8c1a']);
def('car', 34, 20, 'fall', 'toy cars', (c) => {
  c.beginPath(); c.moveTo(-30, 8); c.lineTo(-28, -4); c.lineTo(-14, -6); c.lineTo(-6, -18); c.lineTo(14, -18);
  c.lineTo(22, -6); c.lineTo(30, -4); c.lineTo(32, 8); c.closePath(); path(c, '#3fa7ff');
  poly(c, [-4, -15, 4, -15, 4, -7, -10, -7], '#d8f2ff', OL, 2);
  poly(c, [8, -15, 13, -15, 18, -7, 8, -7], '#d8f2ff', OL, 2);
  circ(c, -16, 10, 7, '#333'); circ(c, 18, 10, 7, '#333');
  circ(c, -16, 10, 2.5, '#ccc', null); circ(c, 18, 10, 2.5, '#ccc', null);
}, ['#3fa7ff', '#ffd23f']);
def('block', 26, 15, 'fall', 'blocks', (c) => {
  rrect(c, -22, -22, 44, 44, 5, '#ff6b6b');
  rrect(c, -16, -16, 32, 32, 3, '#ffe0e0', null);
  c.fillStyle = '#c0392b'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('A', 0, 2);
}, ['#ff6b6b', '#ffe0e0']);
def('yoyo', 26, 25, 'fall', 'yo-yos', (c) => {
  line(c, 0, 0, 6, -34, '#ddd', 2);
  circ(c, 0, 0, 22, '#2ee59d');
  circ(c, 0, 0, 9, '#1b9e6a');
  shine(c, -8, -8, 6, 3);
}, ['#2ee59d', '#1b9e6a']);
def('ball', 28, 15, 'fall', 'balls', (c) => {
  circ(c, 0, 0, 26, '#fff');
  c.save(); c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.clip();
  c.fillStyle = '#ff4b5c'; c.fillRect(-30, -30, 60, 20);
  c.fillStyle = '#3fa7ff'; c.fillRect(-30, 10, 60, 20);
  c.restore();
  circ(c, 0, 0, 26, null);
  shine(c, -10, -10, 7, 4);
}, ['#ff4b5c', '#3fa7ff']);
def('robot', 32, 25, 'fall', 'robots', (c) => {
  line(c, 0, -24, 0, -32, OL, 3); circ(c, 0, -34, 4, '#ff4b5c');
  rrect(c, -20, -24, 40, 30, 6, '#b0bec5');
  circ(c, -8, -10, 5, '#ffe14a'); circ(c, 8, -10, 5, '#ffe14a');
  rrect(c, -16, 8, 32, 22, 4, '#90a4ae');
  rrect(c, -8, 14, 16, 6, 2, '#4ad8ff', null);
}, ['#b0bec5', '#ffe14a']);

/* ---------------- Treasures (mahogany manor) ---------------- */
def('ring', 24, 40, 'fall', 'rings', (c) => {
  c.beginPath(); c.arc(0, 6, 16, 0, TAU); c.strokeStyle = OL; c.lineWidth = 9; c.stroke();
  c.strokeStyle = '#ffcc33'; c.lineWidth = 5; c.stroke();
  poly(c, [0, -24, 10, -14, 0, -6, -10, -14], '#7fe3ff');
  shine(c, -3, -16, 3, 2, 0.8);
}, ['#ffcc33', '#7fe3ff']);
def('watch', 30, 35, 'fall', 'pocket watches', (c) => {
  circ(c, 0, -26, 5, null, '#ffcc33', 3);
  circ(c, 0, 4, 26, '#ffcc33');
  circ(c, 0, 4, 20, '#fffdf0');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; line(c, Math.cos(a) * 16, 4 + Math.sin(a) * 16, Math.cos(a) * 18, 4 + Math.sin(a) * 18, OL, 1.5); }
  line(c, 0, 4, 0, -10, OL, 2.5); line(c, 0, 4, 9, 8, OL, 2.5);
}, ['#ffcc33', '#fffdf0']);
function gem(color) {
  return (c) => {
    poly(c, [-24, -8, -12, -22, 12, -22, 24, -8, 0, 24], color);
    line(c, -24, -8, 24, -8, 'rgba(0,0,0,0.3)', 2);
    line(c, -12, -22, -6, -8, 'rgba(255,255,255,0.5)', 2);
    line(c, 12, -22, 6, -8, 'rgba(0,0,0,0.2)', 2);
    line(c, -6, -8, 0, 24, 'rgba(255,255,255,0.4)', 2);
    shine(c, -10, -14, 5, 2.5, 0.7, -0.2);
  };
}
def('gem_r', 26, 40, 'fall', 'gems', gem('#e0115f'), ['#e0115f', '#fff']);
def('gem_g', 26, 40, 'fall', 'gems', gem('#1db954'), ['#1db954', '#fff']);
def('gem_b', 26, 40, 'fall', 'gems', gem('#2a6fff'), ['#2a6fff', '#fff']);
def('crown', 32, 50, 'fall', 'crowns', (c) => {
  poly(c, [-28, 18, -30, -16, -14, 0, 0, -22, 14, 0, 30, -16, 28, 18], '#ffcc33');
  rrect(c, -28, 10, 56, 10, 2, '#e6a800');
  circ(c, 0, 14, 4, '#e0115f', null); circ(c, -16, 14, 3, '#2a6fff', null); circ(c, 16, 14, 3, '#1db954', null);
  circ(c, -30, -18, 4, '#fff'); circ(c, 0, -24, 4, '#fff'); circ(c, 30, -18, 4, '#fff');
}, ['#ffcc33', '#e0115f']);
def('coin', 24, 30, 'fast', 'gold coins', (c) => {
  circ(c, 0, 0, 22, '#ffcc33');
  circ(c, 0, 0, 16, null, '#c89400', 2);
  star(c, 0, 0, 5, 10, 4.5, 0, '#ffe680', '#c89400', 1.5);
  shine(c, -8, -10, 5, 2.5);
}, ['#ffcc33', '#fff']);
def('pearls', 32, 35, 'flutter', 'pearl necklaces', (c) => {
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * 0.05 + (i / 14) * Math.PI * 0.9;
    circ(c, Math.cos(a) * 26, -10 + Math.sin(a) * 30, 5, '#fbf7ee', OL, 1.5);
  }
  circ(c, 0, 24, 7, '#ffb6c1', OL, 2);
}, ['#fbf7ee', '#ffb6c1']);

/* ---------------- Kitchen ---------------- */
def('egg', 30, 20, 'fall', 'fried eggs', (c) => {
  c.beginPath();
  for (let a = 0; a <= TAU + 0.01; a += TAU / 10) { const r = 26 + Math.sin(a * 3) * 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.85); }
  c.closePath(); path(c, '#fffdf5');
  circ(c, 2, -2, 11, '#ffb300');
  shine(c, -2, -6, 4, 2.5, 0.7);
}, ['#ffb300', '#fff']);
def('cheese', 30, 20, 'fall', 'cheese', (c) => {
  poly(c, [-28, 18, 28, 18, 28, -4, -28, -20], '#ffd23f');
  circ(c, -10, 2, 5, '#e6b800', null); circ(c, 10, 8, 4, '#e6b800', null); circ(c, 16, -4, 3, '#e6b800', null);
}, ['#ffd23f', '#e6b800']);
def('pancakes', 32, 25, 'fall', 'pancakes', (c) => {
  for (let i = 0; i < 3; i++) ell(c, 0, 16 - i * 11, 28, 8, 0, '#e2a04a');
  c.beginPath(); c.ellipse(0, -6, 24, 6, 0, 0, TAU); c.fillStyle = '#8a3b0a'; c.fill();
  line(c, 18, -4, 22, 12, '#8a3b0a', 5);
  rrect(c, -7, -16, 14, 9, 2, '#fff3a6', OL, 2);
}, ['#e2a04a', '#8a3b0a']);
def('toast', 28, 15, 'fall', 'toast', (c) => {
  c.beginPath();
  c.moveTo(-22, 24); c.lineTo(-22, -8); c.arc(-10, -12, 14, Math.PI, Math.PI * 1.6); c.arc(10, -12, 14, Math.PI * 1.4, 0); c.lineTo(22, 24); c.closePath();
  path(c, '#c98a3c');
  rrect(c, -15, -10, 30, 28, 5, '#f6d6a8', null);
}, ['#c98a3c', '#f6d6a8']);
def('sausage', 30, 20, 'fall', 'sausages', (c) => {
  rrect(c, -30, -10, 60, 20, 10, '#b5532a');
  line(c, -18, -4, 18, -4, 'rgba(255,255,255,0.35)', 3);
}, ['#b5532a', '#e2a04a']);
def('cookie', 26, 15, 'fall', 'cookies', (c) => {
  circ(c, 0, 0, 24, '#d89a54');
  const p = [[-10, -8], [6, -12], [10, 4], [-4, 8], [-12, 10], [14, -2]];
  for (const [x, y] of p) ell(c, x, y, 3.5, 2.5, x, '#4a2c1a', null);
}, ['#d89a54', '#4a2c1a']);
def('mug', 30, 20, 'fall', 'mugs', (c) => {
  c.beginPath(); c.arc(20, 2, 10, -Math.PI / 2, Math.PI / 2); c.strokeStyle = OL; c.lineWidth = 8; c.stroke();
  c.strokeStyle = '#3fa7ff'; c.lineWidth = 4; c.stroke();
  rrect(c, -20, -16, 40, 36, 5, '#3fa7ff');
  ell(c, 0, -16, 20, 4, 0, '#6b3a1a', OL, 2);
  for (const x of [-6, 4]) { c.beginPath(); c.moveTo(x, -22); c.bezierCurveTo(x - 6, -28, x + 6, -32, x, -38); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2.5; c.stroke(); }
}, ['#3fa7ff', '#fff']);

/* ---------------- Spooky ---------------- */
def('pumpkin', 32, 25, 'fall', 'pumpkins', (c) => {
  for (const [x, rx] of [[-14, 14], [14, 14], [0, 16]]) ell(c, x, 4, rx, 24, 0, '#ff8c1a');
  rrect(c, -4, -28, 8, 10, 2, '#4a7a2a');
  poly(c, [-14, -4, -6, -4, -10, -12], '#ffe14a', OL, 1.5);
  poly(c, [14, -4, 6, -4, 10, -12], '#ffe14a', OL, 1.5);
  poly(c, [-14, 8, -8, 14, -2, 10, 4, 14, 10, 10, 15, 8, 8, 18, -8, 18], '#ffe14a', OL, 1.5);
}, ['#ff8c1a', '#ffe14a']);
def('candycorn', 26, 20, 'fall', 'candy corn', (c) => {
  c.save();
  c.beginPath(); c.moveTo(0, -28); c.quadraticCurveTo(24, 16, 18, 22); c.lineTo(-18, 22); c.quadraticCurveTo(-24, 16, 0, -28); c.closePath();
  c.clip();
  c.fillStyle = '#fff'; c.fillRect(-30, -30, 60, 22);
  c.fillStyle = '#ff9f1c'; c.fillRect(-30, -8, 60, 16);
  c.fillStyle = '#ffd23f'; c.fillRect(-30, 8, 60, 16);
  c.restore();
  c.beginPath(); c.moveTo(0, -28); c.quadraticCurveTo(24, 16, 18, 22); c.lineTo(-18, 22); c.quadraticCurveTo(-24, 16, 0, -28); c.closePath();
  path(c, null);
}, ['#ff9f1c', '#ffd23f']);
def('ghost', 32, 25, 'float', 'ghosts', (c) => {
  c.beginPath();
  c.moveTo(-24, 28); c.lineTo(-24, -8); c.arc(0, -8, 24, Math.PI, 0); c.lineTo(24, 28);
  for (let i = 0; i < 4; i++) c.quadraticCurveTo(18 - i * 12, 18, 12 - i * 12, 28);
  c.closePath();
  path(c, 'rgba(250,250,255,0.95)');
  ell(c, -8, -8, 4, 6, 0, OL, null); ell(c, 8, -8, 4, 6, 0, OL, null);
  ell(c, 0, 6, 5, 6, 0, OL, null);
}, ['#ffffff', '#c9d6ff']);
def('skull', 28, 20, 'fall', 'skulls', (c) => {
  c.beginPath(); c.arc(0, -4, 22, Math.PI * 0.8, Math.PI * 0.2); c.lineTo(12, 22); c.lineTo(-12, 22); c.closePath(); path(c, '#f4f1e4');
  ell(c, -9, -2, 6, 7, 0, OL, null); ell(c, 9, -2, 6, 7, 0, OL, null);
  poly(c, [0, 6, -3, 12, 3, 12], OL, null);
  for (let x = -8; x <= 8; x += 4) line(c, x, 15, x, 21, OL, 1.5);
}, ['#f4f1e4', '#999']);
def('witchhat', 32, 25, 'fall', 'witch hats', (c) => {
  ell(c, 0, 20, 32, 8, 0, '#3a2350');
  poly(c, [-16, 18, 16, 18, 6, -14, 18, -30, 0, -20, -4, -10], '#4a2c6a');
  rrect(c, -16, 10, 32, 8, 1, '#ff8c1a', OL, 2);
}, ['#4a2c6a', '#ff8c1a']);
def('eyeball', 24, 30, 'fast', 'eyeballs', (c) => {
  circ(c, 0, 0, 22, '#fffdf5');
  line(c, -18, 6, -8, 2, '#e53935', 1.5); line(c, 16, 10, 8, 4, '#e53935', 1.5);
  circ(c, 4, -2, 10, '#2ea84a');
  circ(c, 5, -2, 5, OL, null);
  shine(c, 1, -6, 2.5, 2, 0.9);
}, ['#fffdf5', '#e53935']);

/* ---------------- Beach ---------------- */
def('shell', 28, 20, 'fall', 'shells', (c) => {
  c.beginPath(); c.moveTo(0, 22);
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; c.lineTo(Math.cos(a) * 28, 6 + Math.sin(a) * 30); }
  c.closePath(); path(c, '#ffb38a');
  for (let i = 1; i < 8; i++) { const a = Math.PI + (i / 8) * Math.PI; line(c, 0, 20, Math.cos(a) * 24, 6 + Math.sin(a) * 26, 'rgba(160,70,30,0.5)', 2); }
  rrect(c, -8, 18, 16, 8, 3, '#ffb38a', OL, 2);
}, ['#ffb38a', '#fff']);
def('flipflop', 32, 15, 'fall', 'flip-flops', (c) => {
  ell(c, 0, 4, 16, 30, 0, '#2ec4b6');
  c.beginPath(); c.moveTo(-14, 6); c.quadraticCurveTo(0, -18, 0, -16); c.quadraticCurveTo(0, -18, 14, 6);
  c.strokeStyle = OL; c.lineWidth = 7; c.stroke(); c.strokeStyle = '#ff4b5c'; c.lineWidth = 4; c.stroke();
  circ(c, 0, -16, 3, '#ff4b5c', OL, 1.5);
}, ['#2ec4b6', '#ff4b5c']);
def('beachball', 30, 15, 'float', 'beach balls', (c) => {
  circ(c, 0, 0, 28, '#fff');
  const cols = ['#ff4b5c', '#ffd23f', '#3fa7ff'];
  for (let i = 0; i < 3; i++) {
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 28, (i * TAU) / 3, (i * TAU) / 3 + TAU / 6); c.closePath(); c.fillStyle = cols[i]; c.fill();
  }
  circ(c, 0, 0, 28, null);
  circ(c, 0, 0, 5, '#fff', OL, 2);
  shine(c, -10, -12, 7, 4);
}, ['#ff4b5c', '#3fa7ff']);
def('shades', 32, 20, 'fall', 'sunglasses', (c) => {
  line(c, -10, -4, 10, -4, OL, 4);
  rrect(c, -30, -10, 22, 18, 7, '#222');
  rrect(c, 8, -10, 22, 18, 7, '#222');
  shine(c, -22, -4, 4, 2, 0.5); shine(c, 16, -4, 4, 2, 0.5);
}, ['#222', '#ff4b5c']);
def('coconut', 28, 20, 'fall', 'coconuts', (c) => {
  circ(c, 0, 0, 26, '#7a5230');
  for (let i = 0; i < 12; i++) line(c, Math.cos(i) * 10, Math.sin(i * 1.7) * 14, Math.cos(i) * 18, Math.sin(i * 1.7) * 18, 'rgba(0,0,0,0.25)', 1.5);
  circ(c, -6, -8, 3, '#3a2010', null); circ(c, 6, -8, 3, '#3a2010', null); circ(c, 0, 2, 3, '#3a2010', null);
}, ['#7a5230', '#fff']);
def('pail', 30, 20, 'fall', 'pails', (c) => {
  c.beginPath(); c.arc(0, -10, 22, Math.PI, 0); c.strokeStyle = OL; c.lineWidth = 3; c.stroke();
  poly(c, [-22, -10, 22, -10, 16, 26, -16, 26], '#ffd23f');
  rrect(c, -23, -14, 46, 8, 3, '#ff9f1c', OL, 2);
}, ['#ffd23f', '#ff9f1c']);

/* ---------------- Winter ---------------- */
function ornament(color, stripe) {
  return (c) => {
    rrect(c, -6, -30, 12, 8, 2, '#c0c0c0', OL, 2);
    circ(c, 0, 0, 24, color);
    c.save(); c.beginPath(); c.arc(0, 0, 24, 0, TAU); c.clip();
    c.fillStyle = stripe; c.fillRect(-30, -4, 60, 8);
    c.restore();
    circ(c, 0, 0, 24, null);
    shine(c, -9, -9, 7, 4, 0.6);
  };
}
def('orn_r', 28, 20, 'fall', 'ornaments', ornament('#e8303a', '#ffd23f'), ['#e8303a', '#ffd23f']);
def('orn_g', 28, 20, 'fall', 'ornaments', ornament('#1db954', '#fff'), ['#1db954', '#fff']);
def('orn_b', 28, 20, 'fall', 'ornaments', ornament('#2a6fff', '#c9e3ff'), ['#2a6fff', '#c9e3ff']);
def('gingerbread', 32, 25, 'fall', 'gingerbread men', (c) => {
  c.beginPath();
  c.arc(0, -18, 11, 0, TAU);
  path(c, '#c47a3a');
  poly(c, [-10, -8, 10, -8, 26, -2, 24, 6, 12, 2, 16, 28, 6, 30, 0, 16, -6, 30, -16, 28, -12, 2, -24, 6, -26, -2], '#c47a3a');
  circ(c, -4, -20, 1.8, OL, null); circ(c, 4, -20, 1.8, OL, null);
  c.beginPath(); c.arc(0, -16, 5, 0.3, Math.PI - 0.3); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
  circ(c, 0, 0, 2.5, '#e8303a', null); circ(c, 0, 8, 2.5, '#1db954', null);
}, ['#c47a3a', '#fff']);
def('mitten', 30, 20, 'fall', 'mittens', (c) => {
  c.beginPath(); c.moveTo(-14, 20); c.lineTo(-16, -10); c.quadraticCurveTo(-14, -28, 2, -26); c.quadraticCurveTo(16, -24, 16, -6);
  c.lineTo(24, -12); c.quadraticCurveTo(30, -4, 18, 8); c.lineTo(16, 20); c.closePath();
  path(c, '#e8303a');
  rrect(c, -18, 16, 38, 12, 4, '#fff');
}, ['#e8303a', '#fff']);
def('snowflake', 30, 30, 'flutter', 'snowflakes', (c) => {
  for (let i = 0; i < 6; i++) {
    c.save(); c.rotate((i * TAU) / 6);
    line(c, 0, 0, 0, -28, '#4a90c2', 6); line(c, 0, 0, 0, -28, '#fff', 3);
    line(c, 0, -16, -8, -24, '#fff', 2.5); line(c, 0, -16, 8, -24, '#fff', 2.5);
    c.restore();
  }
  circ(c, 0, 0, 5, '#fff', '#4a90c2', 2);
}, ['#fff', '#9fd4ff']);
def('star', 30, 25, 'fall', 'stars', (c) => {
  star(c, 0, 2, 5, 30, 13, 0, '#ffd23f');
  shine(c, -6, -6, 5, 3, 0.6);
}, ['#ffd23f', '#fff']);
def('present', 30, 20, 'fall', 'presents', (c) => {
  rrect(c, -24, -16, 48, 40, 4, '#1db954');
  rrect(c, -27, -24, 54, 12, 3, '#2ed36a');
  rrect(c, -5, -24, 10, 48, 1, '#e8303a');
  ell(c, -9, -30, 9, 6, 0.4, '#e8303a');
  ell(c, 9, -30, 9, 6, -0.4, '#e8303a');
}, ['#1db954', '#e8303a']);

/* ---------------- Hazard ---------------- */
def('firecracker', 30, 0, 'fall', 'firecrackers', (c) => {
  // fuse
  c.beginPath(); c.moveTo(0, -24); c.bezierCurveTo(10, -30, -6, -36, 6, -42);
  c.strokeStyle = '#5a4a3a'; c.lineWidth = 3; c.stroke();
  rrect(c, -12, -26, 24, 52, 4, '#d62828');
  rrect(c, -12, -18, 24, 6, 0, '#ffd23f', null);
  rrect(c, -12, 12, 24, 6, 0, '#ffd23f', null);
  rrect(c, -12, -26, 24, 52, 4, null);
  c.fillStyle = '#ffd23f'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('!', 0, 0);
  ell(c, 0, -26, 12, 3, 0, '#a01818', OL, 2);
}, ['#ffd23f', '#ff6b00']);
// Local fuse-tip position (before rotation) used for live sparks.
export const FUSE_TIP = { x: 6, y: -42 };

/* ---------------- Sprite cache ---------------- */
const cache = new Map();
let cacheScale = 1;
export function setSpriteScale(s) {
  if (Math.abs(s - cacheScale) > 0.01) {
    cache.clear();
    cacheScale = s;
  }
}
export function getSprite(name) {
  let cv = cache.get(name);
  if (!cv) {
    const sp = SPRITES[name];
    const half = Math.ceil(sp.r * 1.75 + 8);
    cv = document.createElement('canvas');
    const px = Math.ceil(half * 2 * cacheScale);
    cv.width = cv.height = px;
    const c = cv.getContext('2d');
    c.scale(cacheScale, cacheScale);
    c.translate(half, half);
    sp.draw(c);
    cv.half = half;
    cache.set(name, cv);
  }
  return cv;
}
export function drawSprite(ctx, name, x, y, rot = 0, scale = 1, alpha = 1) {
  const cv = getSprite(name);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  const s = scale;
  ctx.drawImage(cv, -cv.half * s, -cv.half * s, cv.half * 2 * s, cv.half * 2 * s);
  ctx.restore();
}

export const drawHelpers = { circ, ell, rrect, poly, star, line, shine, path, OL, LW };
