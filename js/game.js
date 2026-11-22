// Core gameplay: spawning, physics, dart flight, hit resolution, scoring, HUD.
import { W, H, TAU, FONT, THROWER, clamp, lerp, rand, pick, dist, weightedPick } from './config.js';
import { SPRITES, drawSprite, FUSE_TIP, drawHelpers as D } from './sprites.js';
import { ANIMALS, drawAnimal } from './creatures.js';
import { renderBackdrop } from './wood.js';
import { LEVELS } from './levels.js';
import { sfx } from './audio.js';

const FLIGHT_COLORS = ['#ff4b5c', '#3fa7ff', '#ffd23f', '#2ee59d', '#9b5de5'];
const MULT_COLORS = { 2: '#2ecc71', 3: '#ffa31a', 5: '#b05cff' };
const OUCH = ['Ouch!', 'Hey!', 'Yowch!', 'Not me!', 'Rude!'];
const PRAISE = ['Nice!', 'Great!', 'Sweet!', 'Awesome!', 'Superb!', 'Unreal!', 'Legendary!'];

export function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/* ---------------- Dart drawing ---------------- */
// Tip at (x,y); `ang` points from tip toward the tail; `len` foreshortens; `s` scales.
export function drawDart(ctx, x, y, ang, len, s, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  const L = len;
  // needle
  ctx.strokeStyle = '#d9dde2';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12 * L, 0); ctx.stroke();
  // barrel
  const bg = ctx.createLinearGradient(0, -4, 0, 4);
  bg.addColorStop(0, '#9aa3ad'); bg.addColorStop(0.5, '#4a525c'); bg.addColorStop(1, '#22282e');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(11 * L, -3.6, 20 * L, 7.2, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 4; i++) { const gx = (14 + i * 4) * L; ctx.beginPath(); ctx.moveTo(gx, -3); ctx.lineTo(gx, 3); ctx.stroke(); }
  // shaft
  ctx.fillStyle = '#222';
  ctx.fillRect(31 * L, -1.8, 16 * L, 3.6);
  // flights (perspective: grow a little toward the viewer)
  const fx = 40 * L, fl = 22 * L, fw = 11 + (1 - L) * 4;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.2;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(fx, sgn * 1.5);
    ctx.lineTo(fx + fl * 0.5, sgn * fw);
    ctx.lineTo(fx + fl, sgn * fw);
    ctx.lineTo(fx + fl, sgn * 1.5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(fx + fl * 0.5, -fw + 2, fl * 0.4, 2);
  // third flight edge-on
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx + fl, 0); ctx.stroke();
  ctx.restore();
}

function stuckAngle(x, y) {
  return Math.atan2(THROWER.y - y, THROWER.x - x);
}

/* ---------------- Game ---------------- */
export class Game {
  constructor(index, pixelScale, callbacks) {
    this.index = index;
    this.L = LEVELS[index];
    this.cb = callbacks;
    this.items = [];
    this.darts = [];
    this.animals = [];
    this.particles = [];
    this.popups = [];
    this.holes = [];
    this.targets = (this.L.targets || []).map((t) => ({ ...t, r: 48, flash: 0, pulse: Math.random() * TAU }));
    this.rails = (this.L.gallery || []).map((g) => {
      const span = W + 240;
      const tg = [];
      for (let i = 0; i < g.count; i++) tg.push({ x: (i / g.count) * span - 120, kind: g.items[i % g.items.length], up: 1, down: false, timer: 0 });
      return { ...g, span, targets: tg };
    });
    this.score = 0;
    this.timeLeft = this.L.time;
    this.dartsLeft = this.L.darts;
    this.streak = 0;
    this.bestStreak = 0;
    this.galleryHits = 0;
    this.animalsHit = 0;
    this.spawnTimer = 0.6;
    this.animalTimer = this.L.animals ? rand(...this.L.animals.every) * 0.6 : Infinity;
    this.shake = 0;
    this.cooldown = 0;
    this.ended = null; // null | 'win' | 'fail'
    this.endTimer = 0;
    this.endReason = '';
    this.started = false; // world animates behind intro card; spawns start on begin()
    this.aim = { x: W / 2, y: H / 2, active: false, visible: false };
    this.t = 0;
    this.dartColor = FLIGHT_COLORS[index % FLIGHT_COLORS.length];
    this.levelMult = 1 + index * 0.08;
    this.setPixelScale(pixelScale);
  }

  setPixelScale(s) {
    this.pixelScale = s;
    const bd = renderBackdrop(this.L.backdrop, this.L.seed, s);
    this.bg = bd.canvas;
    this.solid = bd.solid;
    this.bgCtx = this.bg.getContext('2d');
    this.bgCtx.setTransform(s, 0, 0, s, 0, 0);
    for (const h of this.holes) this.paintHole(h.x, h.y);
  }

  begin() {
    this.started = true;
  }

  /* ---------- objectives ---------- */
  pinned() {
    return this.items.filter((i) => i.state === 'pinned' && !i.hazard);
  }
  objectiveStatus() {
    const pins = this.pinned();
    return this.L.objectives.map((o) => {
      let cur = 0, max = 1, text = '', short = '';
      switch (o.type) {
        case 'pin': {
          max = o.count;
          if (o.kind) {
            cur = pins.filter((i) => i.kind === o.kind || SPRITES[i.kind].label === o.kind).length;
            const lbl = SPRITES[o.kind] ? SPRITES[o.kind].label : o.kind;
            text = `Pin ${o.count} ${lbl}`;
            short = lbl[0].toUpperCase() + lbl.slice(1);
          } else {
            cur = pins.length;
            text = `Pin ${o.count} objects to the wall`;
            short = 'Pinned';
          }
          break;
        }
        case 'score': max = o.value; cur = this.score; text = `Score ${fmt(o.value)} points`; short = 'Score'; break;
        case 'multi': max = o.count; cur = pins.filter((i) => i.multi).length; text = `Pin ${o.count} objects over multiplier targets`; short = 'Multiplier pins'; break;
        case 'gallery': max = o.count; cur = this.galleryHits; text = `Knock down ${o.count} shooting-gallery targets`; short = 'Gallery'; break;
        case 'streak': max = o.count; cur = this.bestStreak; text = `Pin ${o.count} in a row without missing`; short = 'Best streak'; break;
        case 'noAnimal': max = 1; cur = this.animalsHit === 0 ? 1 : 0; text = 'Don\'t hit a single animal'; short = 'No animals hit'; break;
      }
      return { text, short: short || text, cur: Math.min(cur, max), max, done: cur >= max, type: o.type };
    });
  }

  /* ---------- input ---------- */
  pointer(kind, x, y, type) {
    if (kind === 'down') {
      this.aim.active = true;
      this.aim.touch = type === 'touch';
      this.aim.downT = this.t;
      this.aim.dx = x; this.aim.dy = y;
      this.aim.dragged = false;
    }
    if (this.aim.active && Math.hypot(x - this.aim.dx, y - this.aim.dy) > 14) this.aim.dragged = true;
    // On touch screens, while dragging, the reticle floats above the finger so it isn't hidden.
    // A quick tap throws exactly where you tapped.
    const quickTap = kind === 'up' && !this.aim.dragged && this.t - this.aim.downT < 0.25;
    const oy = this.aim.touch && !quickTap && (this.aim.dragged || this.t - this.aim.downT > 0.15) ? -70 : 0;
    this.aim.x = clamp(x, 0, W);
    this.aim.y = clamp(y + oy, 60, H);
    this.aim.visible = true;
    if (kind === 'up' && this.aim.active) {
      this.aim.active = false;
      if (this.aim.touch) this.aim.visible = false;
      this.throwAt(this.aim.x, this.aim.y);
    }
    if (kind === 'cancel') {
      this.aim.active = false;
      this.aim.visible = false;
    }
  }

  throwAt(tx, ty) {
    if (!this.started || this.ended || this.cooldown > 0) return;
    if (this.dartsLeft !== null) {
      if (this.dartsLeft <= 0) return;
      this.dartsLeft--;
    }
    const sx = W / 2 + (tx - W / 2) * 0.15, sy = H + 30;
    const d = dist(sx, sy, tx, ty);
    const dur = 0.24 + d / 2600;
    this.darts.push({ state: 'fly', sx, sy, tx, ty, t: 0, dur, arc: 50 + d * 0.1 });
    this.cooldown = 0.22;
    sfx.whoosh(dur);
  }

  /* ---------- spawning ---------- */
  spawnItem() {
    const L = this.L;
    let kind = weightedPick(L.items);
    if (L.hazards && Math.random() < L.hazards.chance) kind = 'firecracker';
    const sp = SPRITES[kind];
    const s = L.speed;
    let beh = sp.beh;
    if ((beh === 'fall' || beh === 'fast') && Math.random() < (L.toss || 0)) beh = 'toss';
    const it = {
      kind, r: sp.r, x: rand(90, W - 90), y: -70, vx: rand(-25, 25), vy: rand(30, 70) * s,
      rot: rand(-0.6, 0.6), vr: rand(-1.6, 1.6), beh, t: 0, state: 'free', phase: rand(0, TAU),
      hazard: kind === 'firecracker', pts: sp.pts, scale: 1, pop: 0, g: 150 * s, vmax: 240 * s,
    };
    switch (beh) {
      case 'float':
        it.y = H + 70; it.vy = -rand(80, 120) * s; it.vx = rand(-15, 15); it.vr = rand(-0.3, 0.3); it.rot = rand(-0.2, 0.2);
        break;
      case 'toss': {
        const k = Math.sqrt(s);
        it.y = H + 60; it.x = rand(160, W - 160);
        it.vy = -rand(780, 960) * k; it.g = 780 * k * k; it.vmax = 2000;
        it.vx = (W / 2 - it.x) * rand(0.15, 0.45) * k; it.vr = rand(-4, 4);
        break;
      }
      case 'flutter':
        it.vy = rand(55, 85) * s; it.amp = rand(50, 90); it.freq = rand(1.2, 2.0); it.baseX = it.x; it.g = 0;
        break;
      case 'fast':
        it.vy = rand(140, 190) * s; it.g = 260 * s; it.vmax = 340 * s;
        break;
    }
    this.items.push(it);
  }

  spawnAnimal() {
    const kind = pick(this.L.animals.kinds);
    const def = ANIMALS[kind];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = {
      kind, dir, x: dir > 0 ? -80 : W + 80, y: rand(def.y[0], def.y[1]), baseY: 0, t: rand(0, 5),
      speed: def.speed * rand(0.85, 1.2) * (0.9 + this.L.speed * 0.15), state: 'move', hurt: 0, vy: 0,
      pauseAt: def.mode === 'walk' && Math.random() < 0.6 ? rand(250, W - 250) : null, pauseT: 0,
    };
    a.baseY = a.y;
    this.animals.push(a);
  }

  /* ---------- hit resolution ---------- */
  land(d) {
    const x = d.tx, y = d.ty;
    // 1. animals (front-most)
    for (const a of this.animals) {
      if (a.state === 'flee') continue;
      const def = ANIMALS[a.kind];
      if (dist(a.x, a.y - def.r * 0.3, x, y) < def.r) return this.hitAnimal(a, d);
    }
    // 2. free-flying objects (top-most first)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.state !== 'free') continue;
      const dd = dist(it.x, it.y, x, y);
      if (dd < it.r * 1.12) {
        if (it.hazard) return this.explode(it, d);
        return this.pinItem(it, d, dd);
      }
    }
    // 3. shooting gallery
    for (const rail of this.rails) {
      for (const g of rail.targets) {
        if (g.down || g.up < 0.8) continue;
        if (dist(g.x, rail.y, x, y) < 34) return this.hitGallery(rail, g, d);
      }
    }
    // 4. stationary multiplier targets
    for (const t of this.targets) {
      if (dist(t.x, t.y, x, y) < t.r) {
        t.flash = 1;
        const pts = Math.round((10 * t.mult * this.levelMult) / 5) * 5;
        this.score += pts;
        this.popup(`+${pts}`, x, y - 30, MULT_COLORS[t.mult] || '#fff', 30);
        sfx.target();
        sfx.thunk(0.8);
        this.stick(d, x, y);
        return;
      }
    }
    // 5. pinned items or bare wood (or a gap in the fence!)
    const onPinned = this.items.find((it) => it.state === 'pinned' && dist(it.x, it.y, x, y) < it.r * 0.8);
    if (onPinned || this.solid(x, y)) {
      this.stick(d, x, y, onPinned);
      sfx.thunk(1);
      this.splinters(x, y, 8);
      this.breakStreak();
    } else {
      d.state = 'gone';
      d.t = 0;
      sfx.miss();
      this.popup('Miss', x, y - 20, '#ddd', 24);
      this.breakStreak();
    }
  }

  stick(d, x, y, item = null) {
    d.state = 'stuck';
    d.x = x; d.y = y;
    d.wob = 1;
    d.item = item;
    d.ang = stuckAngle(x, y);
    const stuck = this.darts.filter((q) => q.state === 'stuck' && !q.item);
    if (stuck.length > 40) this.dropDart(stuck[0]);
  }

  dropDart(d, burst = false) {
    if (d.state === 'stuck') {
      this.holes.push({ x: d.x, y: d.y });
      this.paintHole(d.x, d.y);
    }
    d.state = 'drop';
    d.vx = burst ? rand(-500, 500) : rand(-80, 80);
    d.vy = burst ? rand(-700, -200) : rand(-250, -100);
    d.rot = d.ang ?? -Math.PI / 2;
    d.vr = rand(-12, 12);
    d.item = null;
  }

  paintHole(x, y) {
    const c = this.bgCtx;
    c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fillStyle = 'rgba(20,10,5,0.85)'; c.fill();
    c.beginPath(); c.arc(x + 0.8, y + 0.8, 3.6, 0, TAU); c.strokeStyle = 'rgba(255,230,200,0.18)'; c.lineWidth = 1; c.stroke();
  }

  breakStreak() {
    if (this.streak >= 3) this.popup('Streak lost', W / 2, 130, '#ffb3b3', 22);
    this.streak = 0;
  }

  pinItem(it, d, dd) {
    it.state = 'pinned';
    it.pop = 1;
    const ang0 = Math.atan2(it.x - d.tx, it.y - d.ty);
    const L = Math.max(0, dd);
    const vt = it.vx * Math.cos(ang0) - it.vy * Math.sin(ang0);
    it.pin = { x: d.tx, y: d.ty, L, a: ang0, a0: ang0, av: L > 6 ? clamp(vt / L, -8, 8) : 0, rot0: it.rot, wob: 1 };
    this.stick(d, d.tx, d.ty, it);

    let mult = 1;
    const tgt = this.targets.find((t) => dist(t.x, t.y, d.tx, d.ty) < t.r + it.r * 0.3);
    if (tgt) { mult = tgt.mult; tgt.flash = 1; it.multi = true; }
    const bull = dd < it.r * 0.35;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const streakMult = 1 + Math.min(this.streak - 1, 10) * 0.1;
    const base = (it.pts + 10) * this.levelMult;
    const pts = Math.max(5, Math.round((base * mult * (bull ? 1.5 : 1) * streakMult) / 5) * 5);
    it.awarded = pts;
    this.score += pts;

    sfx.pin();
    sfx.chime(Math.min(this.streak, 12));
    this.confetti(d.tx, d.ty, SPRITES[it.kind].colors, 14);
    this.splinters(d.tx, d.ty, 4);
    const big = mult > 1 || bull;
    this.popup(`+${pts}`, d.tx, d.ty - 34, big ? '#ffe14a' : '#fff', big ? 42 : 34);
    if (mult > 1) {
      this.popup(`x${mult} MULTIPLIER!`, d.tx, d.ty - 78, MULT_COLORS[mult], 30, 0.15);
      this.starBurst(tgt.x, tgt.y, MULT_COLORS[mult]);
      sfx.target();
    }
    if (bull) this.popup('BULLSEYE!', d.tx, d.ty + 30, '#7fe3ff', 26, 0.1);
    if (this.streak >= 3 && (this.streak % 3 === 0 || this.streak === 5)) {
      const word = PRAISE[Math.min(Math.floor(this.streak / 3) - 1, PRAISE.length - 1)];
      this.popup(`${word}  Streak x${this.streak}`, W / 2, 150, '#ffd23f', 40, 0.05);
    }
  }

  explode(it, d) {
    const x = it.x, y = it.y;
    this.items.splice(this.items.indexOf(it), 1);
    d.state = 'drop'; d.x = x; d.y = y; d.vx = rand(-300, 300); d.vy = -500; d.rot = 0; d.vr = 20;
    this.shake = 22;
    sfx.explode();
    // fireball + smoke + sparks
    for (let i = 0; i < 50; i++) {
      const a = rand(0, TAU), sp = rand(100, 700);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 300, life: rand(0.3, 0.8), max: 0.8, size: rand(4, 10), color: pick(['#ffd23f', '#ff8c1a', '#ff4b2b', '#fff3b0']), type: 'spark', drag: 2 });
    }
    for (let i = 0; i < 18; i++) {
      this.particles.push({ x: x + rand(-20, 20), y: y + rand(-20, 20), vx: rand(-80, 80), vy: rand(-120, -20), g: -40, life: rand(0.8, 1.6), max: 1.6, size: rand(18, 40), color: 'rgba(80,70,60,', type: 'smoke', drag: 1 });
    }
    this.particles.push({ x, y, life: 0.35, max: 0.35, size: 160, type: 'flash', vx: 0, vy: 0, g: 0 });
    // Everything you pinned gets blown off the wall.
    let lost = 0, n = 0;
    for (const p of this.items) {
      if (p.state !== 'pinned') continue;
      const ang = Math.atan2(p.y - y, p.x - x);
      const f = clamp(900 - dist(p.x, p.y, x, y) * 0.6, 350, 900);
      p.state = 'debris';
      p.vx = Math.cos(ang) * f * 0.6 + rand(-80, 80);
      p.vy = -rand(350, 700);
      p.vr = rand(-10, 10);
      lost += p.awarded || 0;
      n++;
    }
    for (const q of this.darts) if (q.state === 'stuck' && q.item) this.dropDart(q, true);
    this.score = Math.max(0, this.score - lost);
    this.streak = 0;
    this.popup('KABOOM!', x, y - 20, '#ff5a3c', 64, 0);
    if (n > 0) this.popup(`Lost ${n} item${n > 1 ? 's' : ''}  -${lost}`, W / 2, 200, '#ff9a8a', 34, 0.25);
  }

  hitAnimal(a, d) {
    const def = ANIMALS[a.kind];
    a.state = 'flee';
    a.hurt = 0.8;
    a.speed *= 2.6;
    a.vy = def.mode === 'walk' ? -380 : -150;
    d.state = 'drop'; d.x = d.tx; d.y = d.ty; d.vx = rand(-200, 200); d.vy = -300; d.rot = -Math.PI / 2; d.vr = rand(-14, 14);
    const pen = Math.round((50 + this.index * 10) / 5) * 5;
    this.score = Math.max(0, this.score - pen);
    this.animalsHit++;
    this.streak = 0;
    this.shake = 6;
    sfx.yelp();
    sfx.bounce();
    this.popup(pick(OUCH), a.x, a.y - def.r - 30, '#ffffff', 34, 0);
    this.popup(`-${pen}`, a.x, a.y - def.r - 70, '#ff5a5a', 38, 0.1);
    for (let i = 0; i < 10; i++) this.particles.push({ x: a.x, y: a.y - 10, vx: rand(-200, 200), vy: rand(-300, -50), g: 600, life: rand(0.4, 0.8), max: 0.8, size: rand(3, 6), color: '#fff', type: 'circle', drag: 1 });
    if (this.L.objectives.some((o) => o.type === 'noAnimal')) this.fail(`You hit a ${def.name}!`, 0.9);
  }

  hitGallery(rail, g, d) {
    g.down = true;
    g.timer = 2.5;
    this.galleryHits++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const pts = Math.round((40 * this.levelMult) / 5) * 5;
    this.score += pts;
    sfx.ting();
    this.popup(`+${pts}`, g.x, rail.y - 50, '#7fe3ff', 34);
    this.starBurst(g.x, rail.y, '#ffffff');
    d.state = 'drop'; d.x = d.tx; d.y = d.ty; d.vx = rail.dir * rail.speed; d.vy = -150; d.rot = stuckAngle(d.tx, d.ty); d.vr = rand(-6, 6);
  }

  /* ---------- effects ---------- */
  popup(text, x, y, color = '#fff', size = 32, delay = 0) {
    this.popups.push({ text, x: clamp(x, 120, W - 120), y: clamp(y, 90, H - 40), color, size, t: -delay, life: 1.3 });
  }
  splinters(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y, vx: rand(-220, 220), vy: rand(-260, 40), g: 900, life: rand(0.3, 0.6), max: 0.6, size: rand(2, 5), color: pick(['#c8955a', '#8a5a2b', '#e8c08a']), type: 'rect', rot: rand(0, TAU), vr: rand(-15, 15), drag: 1 });
    }
  }
  confetti(x, y, colors, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(120, 380);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 700, life: rand(0.5, 1.0), max: 1, size: rand(3, 7), color: pick(colors), type: 'rect', rot: rand(0, TAU), vr: rand(-12, 12), drag: 1.5 });
    }
  }
  starBurst(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      this.particles.push({ x, y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, g: 0, life: 0.5, max: 0.5, size: 9, color, type: 'star', rot: 0, vr: 6, drag: 3 });
    }
  }

  fail(reason, delay = 0.3) {
    if (this.ended) return;
    this.ended = 'fail';
    this.endReason = reason;
    this.endTimer = delay;
  }

  /* ---------- update ---------- */
  update(dt) {
    this.t += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.shake = Math.max(0, this.shake - dt * 60);

    if (this.started && !this.ended) {
      this.timeLeft -= dt;
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnItem();
        this.spawnTimer = rand(...this.L.spawn);
      }
      if (this.L.animals) {
        this.animalTimer -= dt;
        if (this.animalTimer <= 0) {
          this.spawnAnimal();
          this.animalTimer = rand(...this.L.animals.every);
        }
      }
    }

    // darts
    for (const d of this.darts) {
      d.t += dt;
      if (d.state === 'fly') {
        if (d.t >= d.dur) this.land(d);
      } else if (d.state === 'stuck') {
        d.wob = Math.max(0, d.wob - dt * 2.2);
      } else if (d.state === 'drop') {
        d.vy += 1600 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rot += d.vr * dt;
        if (d.y > H + 100) d.dead = true;
      } else if (d.state === 'gone') {
        if (d.t > 0.35) d.dead = true;
      }
    }
    this.darts = this.darts.filter((d) => !d.dead);

    // items
    for (const it of this.items) {
      it.t += dt;
      if (it.state === 'free') {
        if (it.beh === 'flutter') {
          it.y += it.vy * dt;
          const px = it.x;
          it.x = it.baseX + Math.sin(it.t * it.freq + it.phase) * it.amp;
          it.vx = (it.x - px) / Math.max(dt, 1e-4);
          it.rot = Math.cos(it.t * it.freq + it.phase) * 0.7;
        } else if (it.beh === 'float') {
          it.y += it.vy * dt;
          it.x += (it.vx + Math.sin(it.t * 1.5 + it.phase) * 25) * dt;
          it.rot = Math.sin(it.t * 1.3 + it.phase) * 0.18;
        } else {
          it.vy = Math.min(it.vy + it.g * dt, it.vmax);
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          it.rot += it.vr * dt;
          if (it.x < 40 || it.x > W - 40) it.vx *= -0.8;
        }
        if (it.hazard && Math.random() < dt * 30) {
          const c = Math.cos(it.rot), s = Math.sin(it.rot);
          const fx = it.x + FUSE_TIP.x * c - FUSE_TIP.y * s, fy = it.y + FUSE_TIP.x * s + FUSE_TIP.y * c;
          this.particles.push({ x: fx, y: fy, vx: rand(-90, 90), vy: rand(-120, 30), g: 300, life: rand(0.15, 0.35), max: 0.35, size: rand(2, 4), color: pick(['#fff3b0', '#ffd23f', '#ff8c1a']), type: 'spark', drag: 1 });
        }
        const out = it.beh === 'float' ? it.y < -90 : it.vy > 0 && it.y > H + 90;
        if (out) it.dead = true;
      } else if (it.state === 'pinned') {
        const p = it.pin;
        it.pop = Math.max(0, it.pop - dt * 4);
        if (p.L > 6) {
          const acc = -(1500 / p.L) * Math.sin(p.a) - p.av * 1.6;
          p.av += acc * dt;
          p.a += p.av * dt;
          it.x = p.x + Math.sin(p.a) * p.L;
          it.y = p.y + Math.cos(p.a) * p.L;
          it.rot = p.rot0 - (p.a - p.a0);
        } else {
          p.wob = Math.max(0, p.wob - dt * 2);
          it.rot = p.rot0 + Math.sin(it.t * 30) * 0.12 * p.wob;
        }
      } else if (it.state === 'debris') {
        it.vy += 1500 * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
        if (it.y > H + 120) it.dead = true;
      }
    }
    this.items = this.items.filter((i) => !i.dead);

    // animals
    for (const a of this.animals) {
      a.t += dt;
      a.hurt = Math.max(0, a.hurt - dt);
      const def = ANIMALS[a.kind];
      if (a.state === 'idle') {
        a.pauseT -= dt;
        if (a.pauseT <= 0) a.state = 'move';
      } else {
        a.x += a.dir * a.speed * dt;
        if (a.pauseAt !== null && Math.abs(a.x - a.pauseAt) < 6 && a.state === 'move') {
          a.state = 'idle'; a.pauseT = rand(0.8, 1.6); a.pauseAt = null;
        }
      }
      if (def.mode === 'fly') a.y = a.baseY + Math.sin(a.t * 2.2) * 40;
      if (def.mode === 'climb') a.y = a.baseY + Math.sin(a.t * 1.3) * 60;
      if (a.state === 'flee' && def.mode === 'walk') {
        a.vy += 1400 * dt;
        a.baseY = Math.min(a.baseY + a.vy * dt, def.y[1]);
        a.y = a.baseY;
      } else if (a.state === 'flee') {
        a.baseY += a.vy * dt;
      }
      if (a.x < -140 || a.x > W + 140) a.dead = true;
    }
    this.animals = this.animals.filter((a) => !a.dead);

    // gallery
    for (const rail of this.rails) {
      for (const g of rail.targets) {
        g.x += rail.dir * rail.speed * dt;
        if (rail.dir > 0 && g.x > W + 120) g.x -= rail.span;
        if (rail.dir < 0 && g.x < -120) g.x += rail.span;
        if (g.down) {
          g.up = Math.max(0, g.up - dt * 7);
          g.timer -= dt;
          if (g.timer <= 0) g.down = false;
        } else g.up = Math.min(1, g.up + dt * 4);
      }
    }
    for (const t of this.targets) { t.flash = Math.max(0, t.flash - dt * 1.5); t.pulse += dt * 2; }

    // particles & popups
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.g * dt;
      const dr = Math.max(0, 1 - (p.drag || 0) * dt);
      p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < p.life);

    // win / lose
    if (this.started && !this.ended) {
      const st = this.objectiveStatus();
      if (st.every((o) => o.done)) {
        this.ended = 'win';
        this.endTimer = 1.1;
        sfx.win();
        this.popup('LEVEL CLEAR!', W / 2, H / 2 - 40, '#ffe14a', 72, 0);
      } else if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.fail('Out of time!');
      } else if (this.dartsLeft !== null && this.dartsLeft <= 0 && !this.darts.some((d) => d.state === 'fly')) {
        this.fail('Out of darts!', 0.8);
      }
    }
    if (this.ended && this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.finish();
    }
  }

  finish() {
    if (this.ended === 'win') {
      const timeBonus = Math.ceil(this.timeLeft) * 10;
      const dartBonus = this.dartsLeft === null ? 0 : this.dartsLeft * 20;
      const total = this.score + timeBonus + dartBonus;
      const stars = 1 + (total >= this.L.stars[0] ? 1 : 0) + (total >= this.L.stars[1] ? 1 : 0);
      this.cb.onEnd({ win: true, score: this.score, timeBonus, dartBonus, total, stars });
    } else {
      sfx.lose();
      this.cb.onEnd({ win: false, reason: this.endReason, score: this.score });
    }
  }

  /* ---------- drawing ---------- */
  draw(ctx) {
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
    ctx.drawImage(this.bg, 0, 0, W, H);

    // stationary targets (mounted on the wall)
    for (const t of this.targets) this.drawTarget(ctx, t);

    // darts stuck in bare wood (behind pinned items)
    for (const d of this.darts) if (d.state === 'stuck' && !d.item) this.drawStuck(ctx, d);

    // pinned items with their darts on top
    for (const it of this.items) {
      if (it.state !== 'pinned') continue;
      // soft contact shadow on the wall
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(it.x + 6, it.y + 8, it.r * 0.9, it.r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.restore();
      const sc = 1 + Math.sin(it.pop * Math.PI) * 0.25;
      drawSprite(ctx, it.kind, it.x, it.y, it.rot, sc);
    }
    for (const d of this.darts) if (d.state === 'stuck' && d.item) this.drawStuck(ctx, d);

    // gallery rails
    for (const rail of this.rails) this.drawRail(ctx, rail);

    // free & debris items
    for (const it of this.items) {
      if (it.state === 'pinned') continue;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(it.x + 14, it.y + 20, it.r * 0.85, it.r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.restore();
      drawSprite(ctx, it.kind, it.x, it.y, it.rot, 1);
      if (it.hazard) {
        const c = Math.cos(it.rot), s = Math.sin(it.rot);
        const fx = it.x + FUSE_TIP.x * c - FUSE_TIP.y * s, fy = it.y + FUSE_TIP.x * s + FUSE_TIP.y * c;
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 16);
        g.addColorStop(0, 'rgba(255,240,150,1)');
        g.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(fx, fy, 16 + Math.sin(this.t * 40) * 3, 0, TAU); ctx.fill();
      }
    }

    // animals
    for (const a of this.animals) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(a.x + 10, a.y + 30, 34, 8, 0, 0, TAU); ctx.fill();
      ctx.restore();
      drawAnimal(ctx, a);
    }

    // dropping darts
    for (const d of this.darts) if (d.state === 'drop') drawDart(ctx, d.x, d.y, d.rot, 0.9, 1, this.dartColor);

    // flying darts
    for (const d of this.darts) {
      if (d.state === 'fly') this.drawFlying(ctx, d);
      if (d.state === 'gone') {
        const k = d.t / 0.35;
        drawDart(ctx, d.tx, d.ty - k * 20, stuckAngle(d.tx, d.ty), 0.6, 1 - k * 0.8, this.dartColor, 1 - k);
      }
    }

    // particles
    for (const p of this.particles) this.drawParticle(ctx, p);
    ctx.restore();

    // aim reticle + ready dart
    if (this.started && !this.ended) {
      this.drawReadyDart(ctx);
      if (this.aim.visible) this.drawReticle(ctx);
    }

    // popups
    for (const p of this.popups) this.drawPopup(ctx, p);

    this.drawHUD(ctx);
  }

  drawStuck(ctx, d) {
    const w = Math.sin(d.t * 45) * d.wob * 0.12;
    drawDart(ctx, d.x, d.y, d.ang + w, 0.62, 1, this.dartColor);
  }

  drawFlying(ctx, d) {
    const p = clamp(d.t / d.dur, 0, 1);
    const q = 1 - Math.pow(1 - p, 1.7); // perspective: covers most screen distance early
    const x = lerp(d.sx, d.tx, q);
    const y = lerp(d.sy, d.ty, q) - Math.sin(Math.PI * p) * d.arc;
    const s = lerp(2.6, 1, p);
    const len = lerp(1.2, 0.62, p);
    // landing marker
    ctx.save();
    ctx.globalAlpha = 0.5 * p;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(d.tx, d.ty, 6 + (1 - p) * 18, 0, TAU); ctx.stroke();
    ctx.restore();
    // shadow converging on the wall
    ctx.save();
    ctx.globalAlpha = 0.25 * p;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(lerp(d.tx + 60, d.tx + 4, p), lerp(d.ty + 140, d.ty + 4, p), 14 * s * 0.5, 4 * s * 0.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
    const ang = Math.atan2(d.sy - d.ty, d.sx - d.tx) + (0.5 - p) * 0.5 * Math.sign(d.tx - d.sx || 1) * -0.4;
    drawDart(ctx, x, y, ang, len, s, this.dartColor);
  }

  drawReadyDart(ctx) {
    const ready = this.cooldown <= 0 && (this.dartsLeft === null || this.dartsLeft > 0);
    const slide = ready ? 0 : (this.cooldown / 0.22) * 60;
    const bx = W / 2 + (this.aim.x - W / 2) * 0.08, by = H - 118 + slide;
    const ang = Math.atan2(by - this.aim.y, bx - this.aim.x);
    if (this.dartsLeft === null || this.dartsLeft > 0) drawDart(ctx, bx, by, ang, 1.05, 1.7, this.dartColor, 0.95);
  }

  drawReticle(ctx) {
    const { x, y } = this.aim;
    const pulse = 1 + Math.sin(this.t * 8) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    for (const [col, lw] of [['rgba(0,0,0,0.55)', 6], ['#fff', 2.5]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-28, 0); ctx.lineTo(-10, 0); ctx.moveTo(10, 0); ctx.lineTo(28, 0);
      ctx.moveTo(0, -28); ctx.lineTo(0, -10); ctx.moveTo(0, 10); ctx.lineTo(0, 28);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff4b5c';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    ctx.restore();
    if (this.aim.active && this.aim.touch) {
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x, y + 62); ctx.stroke();
      ctx.restore();
    }
  }

  drawTarget(ctx, t) {
    const col = MULT_COLORS[t.mult] || '#fff';
    ctx.save();
    ctx.translate(t.x, t.y);
    // glow
    const glow = 0.25 + Math.sin(t.pulse) * 0.1 + t.flash * 0.6;
    const g = ctx.createRadialGradient(0, 0, t.r * 0.6, 0, 0, t.r * 1.8);
    g.addColorStop(0, col + Math.round(glow * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, t.r * 1.8, 0, TAU); ctx.fill();
    // board
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(5, 7, t.r + 4, 0, TAU); ctx.fill();
    const rings = [[t.r + 4, '#2a1a12'], [t.r, col], [t.r * 0.8, '#f4ecd8'], [t.r * 0.62, '#1d1d1d'], [t.r * 0.44, '#f4ecd8'], [t.r * 0.26, col], [t.r * 0.12, '#e8303a']];
    for (const [r, c] of rings) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
    if (t.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${t.flash * 0.6})`; ctx.beginPath(); ctx.arc(0, 0, t.r, 0, TAU); ctx.fill(); }
    // label badge
    const sc = 1 + t.flash * 0.4;
    ctx.translate(0, -t.r - 8);
    ctx.scale(sc, sc);
    D.rrect(ctx, -26, -16, 52, 30, 10, col, '#2a1a12', 3);
    ctx.font = `900 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(`x${t.mult}`, 0, 0);
    ctx.fillText(`x${t.mult}`, 0, 0);
    ctx.restore();
  }

  drawRail(ctx, rail) {
    const ry = rail.y + 46;
    // brass rail
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, ry + 6, W, 14);
    const g = ctx.createLinearGradient(0, ry - 7, 0, ry + 9);
    g.addColorStop(0, '#fff1b8'); g.addColorStop(0.4, '#d4a73a'); g.addColorStop(1, '#7a5a10');
    ctx.fillStyle = g;
    ctx.fillRect(0, ry - 7, W, 16);
    for (let x = 60; x < W; x += 200) { ctx.fillStyle = '#5a3a10'; ctx.fillRect(x - 4, ry + 9, 8, 22); }
    for (const t of rail.targets) {
      if (t.x < -80 || t.x > W + 80) continue;
      ctx.save();
      ctx.translate(t.x, ry);
      ctx.scale(1, Math.max(0.05, t.up));
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(-3, -46, 6, 46);
      ctx.translate(0, -46);
      const rings = [[33, '#2a1a12'], [30, '#fff'], [24, '#e8303a'], [17, '#fff'], [10, '#e8303a']];
      for (const [r, c] of rings) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
      ctx.restore();
      if (t.up > 0.3) drawSprite(ctx, t.kind, t.x, ry - 46 * t.up, 0, 0.62 * t.up);
    }
  }

  drawParticle(ctx, p) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    switch (p.type) {
      case 'rect':
        ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        break;
      case 'circle':
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        break;
      case 'spark':
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, TAU); ctx.fill();
        break;
      case 'smoke':
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = p.color + '1)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - a), 0, TAU); ctx.fill();
        break;
      case 'flash': {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1.5 - a * 0.5));
        g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.4, 'rgba(255,170,40,0.8)'); g.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.5, 0, TAU); ctx.fill();
        break;
      }
      case 'star':
        D.star(ctx, p.x, p.y, 5, p.size, p.size * 0.45, p.rot, p.color, null);
        break;
    }
    ctx.restore();
  }

  drawPopup(ctx, p) {
    if (p.t < 0) return;
    const k = p.t / p.life;
    const s = p.t < 0.2 ? easeOutBack(p.t / 0.2) : 1;
    const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(p.x, p.y - k * 50);
    ctx.scale(s, s);
    ctx.rotate(Math.sin(p.t * 10) * 0.03);
    textOutlined(ctx, p.text, 0, 0, p.size, p.color);
    ctx.restore();
  }

  drawHUD(ctx) {
    // top bar
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(20,10,5,0.75)');
    g.addColorStop(1, 'rgba(20,10,5,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 58);
    // pause button
    D.circ(ctx, 34, 29, 21, 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.6)', 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(26, 19, 6, 20); ctx.fillRect(37, 19, 6, 20);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `800 15px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`LEVEL ${this.index + 1}`, 66, 19);
    ctx.font = `900 20px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(this.L.name, 66, 40);

    // objectives chips (auto-shrink to fit between the title and the stats)
    const st = this.objectiveStatus();
    const label = (o) => (o.type === 'noAnimal' ? o.short : `${o.short} ${fmt(o.cur)}/${fmt(o.max)}`);
    const left = 240, right = this.dartsLeft !== null ? W - 380 : W - 290;
    let fs = 17, widths, total;
    for (; fs >= 12; fs--) {
      ctx.font = `800 ${fs}px ${FONT}`;
      widths = st.map((o) => ctx.measureText(label(o)).width + 40);
      total = widths.reduce((a, b) => a + b, 0) + (st.length - 1) * 8;
      if (total <= right - left) break;
    }
    let x = Math.max(left, (left + right) / 2 - total / 2);
    st.forEach((o, i) => {
      const w = widths[i];
      D.rrect(ctx, x, 12, w, 34, 17, o.done ? 'rgba(46,204,113,0.9)' : 'rgba(255,255,255,0.14)', o.done ? '#bff5d4' : 'rgba(255,255,255,0.35)', 2);
      const cx = x + 18, cy = 29;
      if (o.done) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 1, cy + 5); ctx.lineTo(cx + 7, cy - 5); ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(cx, cy, 8, -Math.PI / 2, -Math.PI / 2 + TAU * (o.cur / o.max)); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(label(o), x + 32, 30);
      x += w + 8;
    });

    // right side: timer, darts, score
    ctx.textAlign = 'right';
    const tl = Math.ceil(this.timeLeft);
    const urgent = tl <= 10 && this.started && !this.ended;
    ctx.font = `900 30px ${FONT}`;
    const sx = W - 18;
    ctx.fillStyle = '#ffe14a';
    ctx.fillText(fmt(this.score), sx, 30);
    // timer
    const tx = W - 170;
    ctx.save();
    if (urgent) { const s = 1 + Math.max(0, Math.sin(this.t * 10)) * 0.15; ctx.translate(tx, 29); ctx.scale(s, s); ctx.translate(-tx, -29); }
    ctx.fillStyle = urgent ? '#ff6b6b' : '#fff';
    ctx.font = `900 24px ${FONT}`;
    ctx.fillText(`${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`, tx, 30);
    ctx.restore();
    // stopwatch icon
    D.circ(ctx, tx - 76, 31, 10, null, '#fff', 2.5);
    ctx.fillStyle = '#fff'; ctx.fillRect(tx - 79, 16, 6, 4);
    D.line(ctx, tx - 76, 31, tx - 76, 25, '#fff', 2);
    // darts left
    if (this.dartsLeft !== null) {
      const dx = W - 280;
      ctx.font = `900 24px ${FONT}`;
      ctx.fillStyle = this.dartsLeft <= 5 ? '#ff6b6b' : '#fff';
      ctx.fillText(`${this.dartsLeft}`, dx, 30);
      drawDart(ctx, dx - 60, 22, 0.35, 0.8, 0.75, this.dartColor);
    }
    // streak badge
    if (this.streak >= 2 && !this.ended) {
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(W - 70, 84);
      const s = 1 + Math.sin(this.t * 6) * 0.05;
      ctx.scale(s, s);
      D.rrect(ctx, -56, -16, 112, 32, 16, 'rgba(255,140,26,0.9)', '#fff3c4', 2);
      ctx.font = `900 18px ${FONT}`;
      ctx.fillStyle = '#fff';
      ctx.fillText(`STREAK x${this.streak}`, 0, 1);
      ctx.restore();
    }
  }
}

function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function textOutlined(ctx, text, x, y, size, color, align = 'center', outline = '#2a1a12') {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(4, size * 0.18);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
