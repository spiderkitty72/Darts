// Fixed logical resolution. Everything in the game is laid out in these units
// and the canvas is scaled (letterboxed) to fit any screen, so phones, tablets
// and desktops all see exactly the same playfield.
export const W = 1280;
export const H = 800;
export const TAU = Math.PI * 2;
export const FONT = '"Trebuchet MS", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

// Where the player "stands": darts are thrown from here, just below the screen.
export const THROWER = { x: W / 2, y: H + 150 };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function weightedPick(list) {
  // list: [[value, weight], ...]
  let total = 0;
  for (const [, w] of list) total += w;
  let r = Math.random() * total;
  for (const [v, w] of list) {
    r -= w;
    if (r <= 0) return v;
  }
  return list[list.length - 1][0];
}

// Deterministic PRNG (mulberry32) so procedural backgrounds look the same every time.
export function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
