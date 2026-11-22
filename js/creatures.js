// Animated animals you should NOT hit. Drawn live every frame (walk cycles).
import { TAU } from './config.js';
import { drawHelpers as D } from './sprites.js';

const { circ, ell, rrect, poly, line, OL } = D;

// Each animal is drawn facing right; caller mirrors for leftward motion.
export const ANIMALS = {
  raccoon: { r: 40, mode: 'walk', speed: 120, y: [655, 700], name: 'raccoon', draw: raccoon },
  squirrel: { r: 30, mode: 'climb', speed: 210, y: [180, 620], name: 'squirrel', draw: squirrel },
  cat: { r: 38, mode: 'walk', speed: 100, y: [660, 700], name: 'cat', draw: cat },
  gull: { r: 36, mode: 'fly', speed: 190, y: [150, 480], name: 'seagull', draw: gull },
  bat: { r: 30, mode: 'fly', speed: 220, y: [140, 520], name: 'bat', draw: bat },
  penguin: { r: 36, mode: 'walk', speed: 80, y: [660, 700], name: 'penguin', draw: penguin },
  owl: { r: 34, mode: 'fly', speed: 150, y: [160, 420], name: 'owl', draw: owl },
};

function legs(c, xs, y, len, t, color) {
  xs.forEach((x, i) => {
    const sw = Math.sin(t * 14 + i * Math.PI) * 6;
    line(c, x, y, x + sw, y + len, OL, 7);
    line(c, x, y, x + sw, y + len, color, 4);
  });
}

function raccoon(c, t, st) {
  const bob = Math.abs(Math.sin(t * 7)) * 2;
  c.translate(0, -bob);
  // tail
  c.save(); c.translate(-30, -6); c.rotate(-0.5 + Math.sin(t * 5) * 0.15);
  ell(c, -14, 0, 20, 9, 0, '#8d8d8d');
  for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(-24 + i * 10, 0, 3, 8.5, 0, 0, TAU); c.fillStyle = '#333'; c.fill(); }
  c.restore();
  legs(c, [-18, -6, 10, 22], 8, 16, t * (st === 'idle' ? 0 : 1), '#555');
  ell(c, 0, 0, 32, 18, 0, '#9a9a9a');
  // head
  circ(c, 30, -12, 15, '#a8a8a8');
  poly(c, [20, -22, 22, -34, 30, -26], '#8d8d8d', OL, 2);
  poly(c, [34, -26, 40, -34, 42, -22], '#8d8d8d', OL, 2);
  ell(c, 32, -14, 13, 6, 0, '#2b2b2b', null);
  circ(c, 28, -14, 3, '#fff', null); circ(c, 37, -14, 3, '#fff', null);
  circ(c, 28.5, -14, 1.6, '#000', null); circ(c, 37.5, -14, 1.6, '#000', null);
  ell(c, 42, -8, 5, 4, 0, '#e8e8e8', null);
  circ(c, 46, -9, 2.5, '#222', null);
}

function squirrel(c, t) {
  const hop = Math.abs(Math.sin(t * 10)) * 6;
  c.translate(0, -hop);
  c.save(); c.translate(-14, -6); c.rotate(-0.9 + Math.sin(t * 10) * 0.2);
  ell(c, -4, -14, 13, 24, 0.3, '#c46a2a');
  ell(c, -4, -14, 7, 16, 0.3, '#d98a4a', null);
  c.restore();
  ell(c, 2, 2, 18, 12, -0.2, '#b85e22');
  ell(c, 4, 6, 8, 6, 0, '#f2d3a8', null);
  circ(c, 18, -8, 10, '#b85e22');
  poly(c, [12, -16, 14, -26, 20, -18], '#b85e22', OL, 2);
  circ(c, 21, -10, 2.2, '#000', null);
  circ(c, 27, -6, 2, '#3a2010', null);
  legs(c, [-6, 10], 10, 8, t, '#8a4a18');
}

function cat(c, t, st) {
  const walk = st === 'idle' ? 0 : t;
  c.beginPath(); c.moveTo(-28, -4);
  c.bezierCurveTo(-46, -10, -44, -40, -36 + Math.sin(t * 3) * 6, -46);
  c.strokeStyle = OL; c.lineWidth = 9; c.lineCap = 'round'; c.stroke();
  c.strokeStyle = '#f09a3e'; c.lineWidth = 5; c.stroke();
  legs(c, [-18, -8, 12, 22], 6, 18, walk, '#f09a3e');
  ell(c, 0, -2, 30, 15, 0, '#f09a3e');
  for (let x = -14; x <= 10; x += 8) line(c, x, -15, x - 2, -4, '#c86a1a', 3);
  circ(c, 28, -16, 15, '#f09a3e');
  poly(c, [18, -26, 18, -40, 28, -30], '#f09a3e', OL, 2);
  poly(c, [32, -30, 40, -40, 40, -24], '#f09a3e', OL, 2);
  ell(c, 24, -18, 2.5, 4, 0, '#1a1a1a', null); ell(c, 34, -18, 2.5, 4, 0, '#1a1a1a', null);
  poly(c, [29, -11, 27, -13, 31, -13], '#ff7fa0', null);
  line(c, 34, -10, 46, -12, '#333', 1); line(c, 34, -9, 46, -6, '#333', 1);
}

function gull(c, t) {
  const f = Math.sin(t * 9);
  ell(c, 0, 0, 26, 12, 0, '#f6f6f6');
  circ(c, 22, -8, 10, '#f6f6f6');
  poly(c, [30, -8, 44, -5, 30, -3], '#ffb300', OL, 2);
  circ(c, 24, -10, 2, '#000', null);
  poly(c, [-24, -2, -38, -8, -36, 6], '#9e9e9e', OL, 2);
  c.save(); c.scale(1, f);
  poly(c, [-10, -2, 14, -2, 0, -38], '#b0b0b0', OL, 2);
  poly(c, [-2, -26, 4, -26, 0, -38], '#333', null);
  c.restore();
}

function bat(c, t) {
  const f = Math.sin(t * 16);
  c.save(); c.scale(1, 0.4 + Math.abs(f) * 0.8);
  poly(c, [0, 0, -36, -18, -30, -4, -22, 2, -14, -2, -6, 6], '#3b2a4a', OL, 2);
  poly(c, [0, 0, 36, -18, 30, -4, 22, 2, 14, -2, 6, 6], '#3b2a4a', OL, 2);
  c.restore();
  ell(c, 0, 2, 10, 13, 0, '#4a3560');
  poly(c, [-8, -8, -6, -18, -2, -9], '#4a3560', OL, 2);
  poly(c, [8, -8, 6, -18, 2, -9], '#4a3560', OL, 2);
  circ(c, -4, -2, 2, '#ffe14a', null); circ(c, 4, -2, 2, '#ffe14a', null);
}

function penguin(c, t, st) {
  const w = st === 'idle' ? 0 : Math.sin(t * 8) * 0.15;
  c.rotate(w);
  ell(c, 0, -14, 20, 30, 0, '#222b36');
  ell(c, 4, -10, 13, 23, 0, '#fff', null);
  circ(c, 6, -36, 3, '#fff', null); circ(c, 7, -36, 1.6, '#000', null);
  poly(c, [14, -32, 26, -28, 14, -26], '#ffb300', OL, 2);
  ell(c, -16, -12, 6, 16, 0.3, '#222b36');
  ell(c, -4, 16, 8, 4, 0, '#ffb300', OL, 2); ell(c, 10, 16, 8, 4, 0, '#ffb300', OL, 2);
}

function owl(c, t) {
  const f = Math.sin(t * 7);
  c.save(); c.scale(1, f);
  ell(c, -24, -4, 22, 10, -0.3, '#8a6a4a');
  ell(c, 24, -4, 22, 10, 0.3, '#8a6a4a');
  c.restore();
  ell(c, 0, 2, 20, 24, 0, '#a07a52');
  ell(c, 0, 8, 12, 14, 0, '#e8d5b0', null);
  poly(c, [-16, -16, -14, -28, -6, -18], '#a07a52', OL, 2);
  poly(c, [16, -16, 14, -28, 6, -18], '#a07a52', OL, 2);
  circ(c, -8, -8, 7, '#fff'); circ(c, 8, -8, 7, '#fff');
  circ(c, -7, -8, 3.5, '#000', null); circ(c, 9, -8, 3.5, '#000', null);
  poly(c, [-3, -2, 3, -2, 0, 4], '#ffb300', OL, 1.5);
}

export function drawAnimal(ctx, a) {
  const def = ANIMALS[a.kind];
  ctx.save();
  ctx.translate(a.x, a.y);
  if (a.hurt > 0) ctx.rotate(Math.sin(a.hurt * 40) * 0.2);
  if (a.dir < 0) ctx.scale(-1, 1);
  def.draw(ctx, a.t, a.state);
  ctx.restore();
  if (a.hurt > 0) {
    // little stars of dizziness
    for (let i = 0; i < 3; i++) {
      const ang = a.t * 6 + (i * TAU) / 3;
      D.star(ctx, a.x + Math.cos(ang) * 28, a.y - def.r - 10 + Math.sin(ang) * 6, 5, 7, 3, 0, '#ffe14a', OL, 1.5);
    }
  }
}
