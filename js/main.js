// Bootstrap: canvas scaling, the main loop, input routing and all menu screens.
import { W, H, TAU, FONT, clamp, rand, pick } from './config.js';
import { Game, drawDart, textOutlined, easeOutBack } from './game.js';
import { LEVELS } from './levels.js';
import { SPRITES, drawSprite, setSpriteScale, drawHelpers as D } from './sprites.js';
import { renderBackdrop } from './wood.js';
import { unlockAudio, sfx, isMuted, setMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

/* ---------------- Save data ---------------- */
const SAVE_KEY = 'thunk-save-v1';
let save = { unlocked: 1, stars: [], best: [], muted: false };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (s && typeof s === 'object') save = { ...save, ...s };
} catch (e) { /* storage unavailable */ }
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
}
setMuted(!!save.muted);

/* ---------------- Scaling ---------------- */
let scale = 1, pixelScale = 1, offX = 0, offY = 0;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  scale = Math.min(vw / W, vh / H);
  const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  pixelScale = Math.min(scale * dpr, 2560 / W);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(W * pixelScale);
  canvas.height = Math.round(H * pixelScale);
  offX = (vw - cssW) / 2;
  offY = (vh - cssH) / 2;
  canvas.style.left = offX + 'px';
  canvas.style.top = offY + 'px';
  setSpriteScale(pixelScale);
  scheduleBackdrops();
}
let bdTimer = 0;
function scheduleBackdrops() {
  clearTimeout(bdTimer);
  bdTimer = setTimeout(() => {
    menuBg = null;
    if (game) game.setPixelScale(pixelScale);
  }, 150);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

/* ---------------- State ---------------- */
let state = 'title';
let game = null;
let result = null;
let stateT = 0;
let buttons = [];
let hover = null;
let menuBg = null;
const menuItems = [];

function setState(s) {
  state = s;
  stateT = 0;
}

function startLevel(i) {
  game = new Game(i, pixelScale, { onEnd: onLevelEnd });
  result = null;
  setState('intro');
}

function onLevelEnd(r) {
  result = r;
  const i = game.index;
  if (r.win) {
    save.stars[i] = Math.max(save.stars[i] || 0, r.stars);
    r.newBest = r.total > (save.best[i] || 0);
    save.best[i] = Math.max(save.best[i] || 0, r.total);
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, i + 2));
    persist();
    setState('complete');
  } else setState('fail');
}

/* ---------------- Input ---------------- */
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}
function hitButton(p) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
  }
  return null;
}
let activePointer = null;
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlockAudio();
  const p = toLogical(e);
  if (activePointer !== null && activePointer !== e.pointerId) return;
  const b = hitButton(p);
  if (b) {
    sfx.click();
    b.action();
    return;
  }
  if (state === 'play') {
    if (Math.hypot(p.x - 34, p.y - 29) < 30) { pause(); return; }
    activePointer = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    game.pointer('down', p.x, p.y, e.pointerType);
  } else if (state === 'intro' && stateT > 0.3) {
    begin();
  }
});
canvas.addEventListener('pointermove', (e) => {
  const p = toLogical(e);
  hover = hitButton(p);
  canvas.style.cursor = hover ? 'pointer' : state === 'play' ? 'none' : 'default';
  if (state === 'play' && (activePointer === e.pointerId || (activePointer === null && e.pointerType === 'mouse'))) {
    game.pointer('move', p.x, p.y, e.pointerType);
  }
});
function endPointer(e, kind) {
  if (activePointer !== e.pointerId) return;
  activePointer = null;
  if (state === 'play') {
    const p = toLogical(e);
    game.pointer(kind, p.x, p.y, e.pointerType);
  }
}
canvas.addEventListener('pointerup', (e) => endPointer(e, 'up'));
canvas.addEventListener('pointercancel', (e) => endPointer(e, 'cancel'));
canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && game && activePointer === null) game.aim.visible = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (state === 'play') pause();
    else if (state === 'pause') resume();
  }
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if ((e.key === 'Enter' || e.key === ' ') && state === 'intro') begin();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'play') pause();
});

function begin() {
  game.begin();
  setState('play');
}
function pause() {
  activePointer = null;
  if (game) game.pointer('cancel', 0, 0, 'mouse');
  setState('pause');
}
function resume() {
  setState('play');
}
function toggleMute() {
  setMuted(!isMuted());
  save.muted = isMuted();
  persist();
}
function toggleFullscreen() {
  const d = document;
  try {
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const el = d.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        const pr = req.call(el);
        if (pr && pr.then) pr.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } }).catch(() => {});
      }
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    }
  } catch (e) { /* not supported */ }
}

/* ---------------- Drawing helpers ---------------- */
function button(x, y, w, h, label, action, opts = {}) {
  const b = { x, y, w, h, label, action, ...opts };
  buttons.push(b);
  const hov = hover && hover.label === label && hover.x === x && hover.y === y;
  const press = hov ? -3 : 0;
  ctx.save();
  ctx.translate(0, press);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.roundRect(x + 4, y + 7 - press, w, h, 16); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const base = opts.color || '#c8813a';
  g.addColorStop(0, opts.light || '#e8a85a');
  g.addColorStop(1, base);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 4; ctx.stroke();
  // wood grain on the button
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(80,40,10,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    for (let gx = x; gx <= x + w; gx += 10) ctx.lineTo(gx, y + 8 + i * (h / 6) + Math.sin(gx * 0.05 + i) * 3);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h * 0.35);
  ctx.restore();
  if (opts.icon) opts.icon(x + w / 2, y + h / 2);
  else textOutlined(ctx, label, x + w / 2, y + h / 2 + 2, opts.size || 30, '#fff8e8');
  ctx.restore();
  return b;
}

function iconButton(x, y, r, draw, action, key) {
  const b = { x: x - r, y: y - r, w: r * 2, h: r * 2, label: key, action };
  buttons.push(b);
  D.circ(ctx, x, y, r, 'rgba(30,15,5,0.6)', 'rgba(255,240,220,0.8)', 3);
  draw(x, y);
}

function speakerIcon(x, y) {
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(x - 12, y - 5); ctx.lineTo(x - 6, y - 5); ctx.lineTo(x + 2, y - 12); ctx.lineTo(x + 2, y + 12); ctx.lineTo(x - 6, y + 5); ctx.lineTo(x - 12, y + 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  if (isMuted()) { D.line(ctx, x + 6, y - 6, x + 14, y + 6, '#ff6b6b', 3); D.line(ctx, x + 14, y - 6, x + 6, y + 6, '#ff6b6b', 3); }
  else { ctx.beginPath(); ctx.arc(x + 4, y, 7, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 4, y, 12, -0.9, 0.9); ctx.stroke(); }
}
function fullscreenIcon(x, y) {
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * 11, y + sy * 4); ctx.lineTo(x + sx * 11, y + sy * 11); ctx.lineTo(x + sx * 4, y + sy * 11);
    ctx.stroke();
  }
}

function starShape(x, y, r, filled, scaleK = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleK, scaleK);
  D.star(ctx, 0, 0, 5, r, r * 0.48, 0, filled ? '#ffd23f' : 'rgba(0,0,0,0.35)', '#2a1a12', Math.max(2, r * 0.12));
  if (filled) D.shine(ctx, -r * 0.2, -r * 0.25, r * 0.25, r * 0.12, 0.6, -0.5);
  ctx.restore();
}

function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.roundRect(x + 8, y + 12, w, h, 24); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#6b3f22');
  g.addColorStop(1, '#4a2814');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 24); ctx.fill();
  ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 6; ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,200,150,0.07)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    for (let gx = x; gx <= x + w; gx += 16) ctx.lineTo(gx, y + i * (h / 26) + Math.sin(gx * 0.02 + i * 1.3) * 6);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#d4a73a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x + 12, y + 12, w - 24, h - 24, 16); ctx.stroke();
  // corner nails
  for (const [nx, ny] of [[x + 26, y + 26], [x + w - 26, y + 26], [x + 26, y + h - 26], [x + w - 26, y + h - 26]]) {
    D.circ(ctx, nx, ny, 5, '#c9c2b0', '#2a1a12', 2);
  }
}

function dim(a = 0.55) {
  ctx.fillStyle = `rgba(10,5,2,${a})`;
  ctx.fillRect(0, 0, W, H);
}

/* ---------------- Screens ---------------- */
function drawMenuBackground(dt) {
  if (!menuBg) menuBg = renderBackdrop('mahogany', 7, pixelScale).canvas;
  ctx.drawImage(menuBg, 0, 0, W, H);
  // drifting objects for some life
  if (menuItems.length < 14 && Math.random() < dt * 3) {
    const kinds = Object.keys(SPRITES).filter((k) => k !== 'firecracker');
    menuItems.push({ kind: pick(kinds), x: rand(40, W - 40), y: -60, vy: rand(60, 120), rot: rand(0, TAU), vr: rand(-1, 1) });
  }
  for (const m of menuItems) {
    m.y += m.vy * dt;
    m.rot += m.vr * dt;
    drawSprite(ctx, m.kind, m.x, m.y, m.rot, 1, 0.85);
  }
  for (let i = menuItems.length - 1; i >= 0; i--) if (menuItems[i].y > H + 80) menuItems.splice(i, 1);
  dim(0.25);
}

function drawTitle(dt) {
  drawMenuBackground(dt);
  const bob = Math.sin(stateT * 2) * 6;
  // logo
  ctx.save();
  ctx.translate(W / 2, 250 + bob);
  const s = stateT < 0.6 ? easeOutBack(stateT / 0.6) : 1;
  ctx.scale(s, s);
  ctx.rotate(-0.04);
  // plaque behind logo
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.roundRect(-330, -110, 680, 220, 30); ctx.fill();
  const g = ctx.createLinearGradient(0, -120, 0, 110);
  g.addColorStop(0, '#f2c98a'); g.addColorStop(1, '#c8813a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-340, -120, 680, 220, 30); ctx.fill();
  ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 8; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(120,60,20,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) { ctx.beginPath(); for (let x = -340; x <= 340; x += 12) ctx.lineTo(x, -120 + i * 15 + Math.sin(x * 0.02 + i) * 5); ctx.stroke(); }
  ctx.restore();
  textOutlined(ctx, 'THUNK!', 0, -22, 150, '#fff3d6', 'center', '#3a1a08');
  ctx.font = `900 30px ${FONT}`;
  textOutlined(ctx, 'PIN IT TO THE WALL', 0, 70, 30, '#ffd23f', 'center', '#3a1a08');
  // a dart stuck in the logo
  drawDart(ctx, 250, -60, 0.9, 0.9, 1.6, '#ff4b5c');
  drawSprite(ctx, 'lollipop', -270, -70, -0.4, 1.1);
  drawDart(ctx, -266, -78, 2.3, 0.62, 1.2, '#3fa7ff');
  ctx.restore();

  button(W / 2 - 150, 450, 300, 90, 'PLAY', () => setState('select'), { size: 44, color: '#3c9a3c', light: '#7ad46a' });
  ctx.font = `700 18px ${FONT}`;
  ctx.fillStyle = 'rgba(255,240,220,0.75)';
  ctx.textAlign = 'center';
  ctx.fillText('Throw darts, pin falling objects, avoid firecrackers and critters.', W / 2, 590);
  iconButton(W - 50, 50, 28, speakerIcon, toggleMute, 'mute');
  iconButton(W - 120, 50, 28, fullscreenIcon, toggleFullscreen, 'fs');
  const totalStars = save.stars.reduce((a, b) => a + (b || 0), 0);
  starShape(60, 52, 22, true);
  textOutlined(ctx, `${totalStars} / ${LEVELS.length * 3}`, 92, 54, 26, '#fff', 'left');
}

function drawSelect(dt) {
  drawMenuBackground(dt);
  textOutlined(ctx, 'CHOOSE A LEVEL', W / 2, 70, 52, '#fff3d6');
  const cols = 4, bw = 260, bh = 168, gx = 28, gy = 26;
  const x0 = (W - (cols * bw + (cols - 1) * gx)) / 2, y0 = 130;
  LEVELS.forEach((L, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = x0 + c * (bw + gx), y = y0 + r * (bh + gy);
    const locked = i >= save.unlocked;
    const appear = clamp((stateT - i * 0.03) / 0.25, 0, 1);
    if (appear <= 0) return;
    ctx.save();
    ctx.translate(x + bw / 2, y + bh / 2);
    const s = easeOutBack(appear);
    ctx.scale(s, s);
    ctx.translate(-(x + bw / 2), -(y + bh / 2));
    const b = button(x, y, bw, bh, `L${i}`, locked ? () => sfx.bounce() : () => startLevel(i), {
      color: locked ? '#5a4a3a' : '#a8642a', light: locked ? '#7a6a5a' : '#e0a060',
      icon: (cx, cy) => {
        if (locked) {
          D.rrect(ctx, cx - 22, cy - 6, 44, 34, 6, '#c9c2b0', '#2a1a12', 3);
          ctx.beginPath(); ctx.arc(cx, cy - 8, 14, Math.PI, 0); ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 6; ctx.stroke();
          textOutlined(ctx, `${i + 1}`, cx, cy - 52, 26, '#ccc');
          return;
        }
        textOutlined(ctx, `${i + 1}`, cx - bw / 2 + 34, cy - bh / 2 + 34, 34, '#fff3d6');
        drawSprite(ctx, LEVELS[i].items[0][0], cx + bw / 2 - 44, cy - bh / 2 + 44, -0.2, 0.9);
        textOutlined(ctx, L.name, cx, cy + 12, 26, '#fff');
        const st = save.stars[i] || 0;
        for (let k = 0; k < 3; k++) starShape(cx - 40 + k * 40, cy + 54, 16, k < st);
      },
    });
    ctx.restore();
  });
  button(30, H - 90, 170, 64, 'BACK', () => setState('title'), { size: 26 });
}

function objectiveLines(g) {
  return g.objectiveStatus().map((o) => o.text);
}

function drawIntro() {
  game.draw(ctx);
  dim(0.5);
  const s = stateT < 0.35 ? easeOutBack(stateT / 0.35) : 1;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -H / 2);
  const pw = 720, ph = 520, px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph);
  textOutlined(ctx, `LEVEL ${game.index + 1}`, W / 2, py + 62, 28, '#ffd23f');
  textOutlined(ctx, game.L.name, W / 2, py + 112, 56, '#fff3d6');
  ctx.font = `800 24px ${FONT}`;
  ctx.textAlign = 'left';
  const lines = objectiveLines(game);
  lines.forEach((l, i) => {
    const y = py + 180 + i * 42;
    starShape(px + 90, y, 13, true);
    ctx.fillStyle = '#fff';
    ctx.fillText(l, px + 116, y + 1);
  });
  const info = [`Time: ${game.L.time}s`, game.L.darts ? `Darts: ${game.L.darts}` : 'Darts: unlimited'];
  ctx.font = `700 20px ${FONT}`;
  ctx.fillStyle = 'rgba(255,240,220,0.8)';
  ctx.textAlign = 'center';
  ctx.fillText(info.join('    '), W / 2, py + 196 + lines.length * 42);
  // tip box
  const ty = py + ph - 180;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.roundRect(px + 40, ty, pw - 80, 70, 12); ctx.fill();
  ctx.fillStyle = '#ffe9b0';
  ctx.font = `700 19px ${FONT}`;
  wrapText(game.L.tip, W / 2, ty + 25, pw - 120, 24);
  ctx.restore();
  buttons = [];
  button(W / 2 - 250, py + ph - 92, 200, 66, 'LEVELS', () => { game = null; setState('select'); }, { size: 26 });
  button(W / 2 + 30, py + ph - 92, 220, 66, 'START', begin, { size: 32, color: '#3c9a3c', light: '#7ad46a' });
}

function wrapText(text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  const lines = [];
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  lines.push(line);
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, x, yy + i * lh - ((lines.length - 1) * lh) / 2 + 10));
}

function drawPause() {
  game.draw(ctx);
  dim(0.6);
  const pw = 460, ph = 470, px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph);
  textOutlined(ctx, 'PAUSED', W / 2, py + 70, 54, '#fff3d6');
  buttons = [];
  button(px + 80, py + 125, pw - 160, 66, 'RESUME', resume, { color: '#3c9a3c', light: '#7ad46a' });
  button(px + 80, py + 205, pw - 160, 66, 'RESTART', () => startLevel(game.index));
  button(px + 80, py + 285, pw - 160, 66, 'LEVELS', () => { game = null; setState('select'); });
  button(px + 80, py + 365, pw - 160, 60, isMuted() ? 'SOUND: OFF' : 'SOUND: ON', toggleMute, { size: 24, color: '#5a6a7a', light: '#8a9aaa' });
}

let lastStarSound = -1;
function drawComplete() {
  game.draw(ctx);
  dim(0.55);
  const s = stateT < 0.4 ? easeOutBack(stateT / 0.4) : 1;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -H / 2);
  const pw = 640, ph = 560, px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph);
  textOutlined(ctx, 'LEVEL COMPLETE!', W / 2, py + 64, 50, '#ffe14a');
  for (let k = 0; k < 3; k++) {
    const at = 0.5 + k * 0.35;
    const t = clamp((stateT - at) / 0.3, 0, 1);
    const earned = k < result.stars;
    if (earned && t > 0 && lastStarSound < k) { lastStarSound = k; sfx.star(k); }
    const sk = earned ? (t > 0 ? easeOutBack(t) : 0.001) : 1;
    starShape(W / 2 - 110 + k * 110, py + 160 - (k === 1 ? 16 : 0), k === 1 ? 50 : 42, false);
    if (earned && t > 0) starShape(W / 2 - 110 + k * 110, py + 160 - (k === 1 ? 16 : 0), k === 1 ? 50 : 42, true, sk);
  }
  const rows = [['Score', result.score], ['Time bonus', result.timeBonus]];
  if (game.L.darts !== null) rows.push(['Dart bonus', result.dartBonus]);
  ctx.font = `800 26px ${FONT}`;
  rows.forEach(([k, v], i) => {
    const y = py + 250 + i * 40;
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,240,220,0.85)'; ctx.fillText(k, px + 120, y);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(`+${v.toLocaleString('en-US')}`, px + pw - 120, y);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(px + 110, py + 362, pw - 220, 3);
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffd23f'; ctx.font = `900 34px ${FONT}`;
  ctx.fillText('Total', px + 120, py + 396);
  ctx.textAlign = 'right';
  const shown = Math.round(result.total * clamp(stateT / 1.2, 0, 1));
  ctx.fillText(shown.toLocaleString('en-US'), px + pw - 120, py + 396);
  if (result.newBest && stateT > 1.3) textOutlined(ctx, 'NEW BEST!', W / 2, py + 440, 26, '#7fe3ff');
  ctx.restore();
  buttons = [];
  const by = py + ph - 92;
  button(px + 40, by, 170, 64, 'LEVELS', () => { game = null; setState('select'); }, { size: 24 });
  button(px + 230, by, 170, 64, 'RETRY', () => startLevel(game.index), { size: 24 });
  if (game.index < LEVELS.length - 1) button(px + 420, by, 180, 64, 'NEXT', () => startLevel(game.index + 1), { size: 30, color: '#3c9a3c', light: '#7ad46a' });
  else button(px + 420, by, 180, 64, 'FINISH', () => { game = null; setState('title'); }, { size: 26, color: '#3c9a3c', light: '#7ad46a' });
}

function drawFail() {
  game.draw(ctx);
  dim(0.6);
  const pw = 600, ph = 400, px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph);
  textOutlined(ctx, result.reason, W / 2, py + 80, 50, '#ff8a7a');
  ctx.font = `800 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  const st = game.objectiveStatus();
  st.forEach((o, i) => {
    ctx.fillStyle = o.done ? '#9ff0b8' : '#ffd0c8';
    ctx.fillText(`${o.done ? '✓' : '✗'}  ${o.text}${o.type === 'noAnimal' ? '' : `  (${Math.round(o.cur)}/${o.max})`}`, W / 2, py + 150 + i * 36);
  });
  buttons = [];
  button(px + 70, py + ph - 100, 200, 66, 'LEVELS', () => { game = null; setState('select'); }, { size: 26 });
  button(px + pw - 270, py + ph - 100, 200, 66, 'RETRY', () => startLevel(game.index), { size: 30, color: '#3c9a3c', light: '#7ad46a' });
}

/* ---------------- Main loop ---------------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stateT += dt;
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  buttons = [];
  switch (state) {
    case 'title': lastStarSound = -1; drawTitle(dt); break;
    case 'select': drawSelect(dt); break;
    case 'intro': game.update(dt * 0); drawIntro(); break;
    case 'play': game.update(dt); game.draw(ctx); break;
    case 'pause': drawPause(); break;
    case 'complete': game.update(dt); drawComplete(); break;
    case 'fail': game.update(dt); drawFail(); break;
  }
  if (state !== 'complete') lastStarSound = -1;
  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);

// Debug/test hook (used by automated smoke tests; harmless in production).
window.__thunk = {
  get state() { return state; },
  get game() { return game; },
  startLevel, begin,
};

/* ---------------- PWA ---------------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
