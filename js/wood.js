// Procedural wood backgrounds: picket fences, barn boards, painted shiplap,
// log cabins, ornate mahogany panelling, herringbone butcher block and more.
// Rendered once per level into an offscreen canvas.
import { W, H, TAU, rng } from './config.js';

const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

// One plank of wood with grain, optional knots and bevelled edges.
// Drawn in local space: length along x when !vertical, along y when vertical.
export function plank(ctx, R, x, y, w, h, o) {
  const { hue = 28, sat = 45, lit = 42, vertical = false, knots = 0.5, grain = 1, bevel = 1, paint = null } = o;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const l = lit + (R() - 0.5) * 8;
  const s = sat + (R() - 0.5) * 8;
  const hh = hue + (R() - 0.5) * 6;
  const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, hsl(hh, s, l - 5));
  g.addColorStop(0.5, hsl(hh, s, l + 3));
  g.addColorStop(1, hsl(hh, s, l - 6));
  ctx.fillStyle = paint || g;
  ctx.fillRect(x, y, w, h);

  // Grain lines run along the plank's length with gentle waves.
  const across = vertical ? w : h;
  const along = vertical ? h : w;
  const n = Math.max(4, Math.floor(across / 2.6 * grain));
  const freq = 0.004 + R() * 0.006;
  const phase = R() * 100;
  for (let i = 0; i < n; i++) {
    const off = (i + R() * 0.8) * (across / n);
    const amp = 2 + R() * 5;
    const a = paint ? 0.04 + R() * 0.06 : 0.06 + R() * 0.22;
    ctx.strokeStyle = paint ? `rgba(0,0,0,${a})` : hsl(hh, s + 5, l - 18 - R() * 10, a);
    ctx.lineWidth = 0.6 + R() * 1.6;
    ctx.beginPath();
    for (let t = -10; t <= along + 10; t += 14) {
      const wob = Math.sin(t * freq + phase + i * 0.35) * amp + Math.sin(t * freq * 3.1 + i) * amp * 0.3;
      const px = vertical ? x + off + wob : x + t;
      const py = vertical ? y + t : y + off + wob;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Cathedral flame figure in the middle of some planks.
  if (!paint && R() < 0.6) {
    const cx = vertical ? x + w / 2 : x + R() * w;
    const cy = vertical ? y + R() * h : y + h / 2;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      const sz = 20 + k * 12;
      if (vertical) ctx.ellipse(cx, cy, across * 0.12 + k * 3, sz, 0, 0, TAU);
      else ctx.ellipse(cx, cy, sz, across * 0.12 + k * 3, 0, 0, TAU);
      ctx.strokeStyle = hsl(hh, s, l - 20, 0.12);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  // Knots
  if (R() < knots) {
    const kx = x + w * (0.2 + R() * 0.6);
    const ky = y + h * (0.2 + R() * 0.6);
    const kr = Math.min(across * 0.22, 4 + R() * 9);
    const rg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr * 1.4);
    rg.addColorStop(0, paint ? 'rgba(0,0,0,0.25)' : hsl(hh, s + 10, l - 28));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    if (vertical) ctx.ellipse(kx, ky, kr, kr * 1.6, 0, 0, TAU);
    else ctx.ellipse(kx, ky, kr * 1.6, kr, 0, 0, TAU);
    ctx.fill();
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      if (vertical) ctx.ellipse(kx, ky, kr + k * 3, (kr + k * 3) * 1.8, 0, 0, TAU);
      else ctx.ellipse(kx, ky, (kr + k * 3) * 1.8, kr + k * 3, 0, 0, TAU);
      ctx.strokeStyle = paint ? 'rgba(0,0,0,0.06)' : hsl(hh, s, l - 20, 0.25);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
  if (bevel) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    if (vertical) ctx.fillRect(x, y, 2, h);
    else ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    if (vertical) ctx.fillRect(x + w - 2, y, 2, h);
    else ctx.fillRect(x, y + h - 2, w, 2);
  }
}

function nail(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 3.2, 0, TAU);
  ctx.fillStyle = '#3a3a3a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 1, y - 1, 1.2, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
}

function vignette(ctx, strength = 0.45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function lightPool(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* --------------------------- Styles --------------------------- */

// Picket fence in front of a sky. Gaps between pickets are open air: darts sail through.
function picket(ctx, R, o, mask) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, o.sky[0]);
  sky.addColorStop(1, o.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // sun
  lightPool(ctx, o.sunX || 1040, 120, 220, o.sun || 'rgba(255,250,210,0.9)');
  // clouds
  for (let i = 0; i < 6; i++) {
    const cx = R() * W, cy = 60 + R() * 160;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.ellipse(cx + k * 28 - 56, cy + Math.sin(k) * 8, 40, 22, 0, 0, TAU);
      ctx.fill();
    }
  }
  // distant trees
  for (let i = 0; i < 26; i++) {
    const tx = i * 52 + R() * 30, ty = 420 + R() * 40, tr = 50 + R() * 50;
    ctx.fillStyle = o.trees[i % o.trees.length];
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = o.grass;
  ctx.fillRect(0, 500, W, H - 500);

  const wood = o.wood;
  // rails behind pickets
  for (const ry of [300, 610]) {
    plank(ctx, R, 0, ry, W, 46, { ...wood, vertical: false });
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, ry + 46, W, 8);
    mask.fillRect(0, ry, W, 46);
  }
  const pw = 92, gap = 24;
  for (let x = -10; x < W; x += pw + gap) {
    const top = 110 + R() * 14;
    const bot = 790;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top + 40);
    ctx.lineTo(x + pw / 2, top);
    ctx.lineTo(x + pw, top + 40);
    ctx.lineTo(x + pw, bot);
    ctx.lineTo(x, bot);
    ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowOffsetX = 6;
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.clip();
    plank(ctx, R, x, top, pw, bot - top, { ...wood, vertical: true, bevel: 0 });
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top + 40); ctx.lineTo(x + pw / 2, top); ctx.lineTo(x + pw, top + 40); ctx.lineTo(x + pw, bot); ctx.lineTo(x, bot); ctx.closePath();
    ctx.stroke();
    nail(ctx, x + 22, 323); nail(ctx, x + pw - 22, 323);
    nail(ctx, x + 22, 633); nail(ctx, x + pw - 22, 633);
    mask.beginPath();
    mask.moveTo(x, top + 40); mask.lineTo(x + pw / 2, top); mask.lineTo(x + pw, top + 40); mask.lineTo(x + pw, bot); mask.lineTo(x, bot);
    mask.fill();
  }
  // grass tufts in front
  for (let i = 0; i < 240; i++) {
    const gx = R() * W, gh = 10 + R() * 26;
    ctx.strokeStyle = o.tuft[i % o.tuft.length];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx, H);
    ctx.quadraticCurveTo(gx + (R() - 0.5) * 10, H - gh * 0.6, gx + (R() - 0.5) * 16, H - gh);
    ctx.stroke();
  }
  if (o.leaves) {
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = o.leaves[i % o.leaves.length];
      ctx.beginPath();
      ctx.ellipse(R() * W, H - 6 - R() * 18, 7, 4, R() * 3, 0, TAU);
      ctx.fill();
    }
  }
  vignette(ctx, 0.3);
}

// Weathered barn boards, vertical, with battens and nails.
function barn(ctx, R, o) {
  let x = 0;
  while (x < W) {
    const w = 80 + R() * 60;
    plank(ctx, R, x, 0, w, H, { ...o.wood, vertical: true, knots: 0.8 });
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + w - 3, 0, 3, H);
    x += w;
  }
  if (o.paint) {
    ctx.fillStyle = o.paint;
    ctx.fillRect(0, 0, W, H);
  }
  // horizontal battens
  for (const by of [150, 640]) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, by + 52, W, 8);
    plank(ctx, R, 0, by, W, 52, { ...o.wood, lit: o.wood.lit - 4 });
    for (let nx = 30; nx < W; nx += 110) { nail(ctx, nx, by + 14); nail(ctx, nx, by + 38); }
  }
  if (o.trim) {
    // white X brace like a barn door
    ctx.save();
    ctx.strokeStyle = o.trim;
    ctx.lineWidth = 34;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(140, 230); ctx.lineTo(1140, 610);
    ctx.moveTo(140, 610); ctx.lineTo(1140, 230);
    ctx.stroke();
    ctx.restore();
  }
  // weathering stains
  for (let i = 0; i < 18; i++) {
    const g = ctx.createRadialGradient(R() * W, R() * H, 0, R() * W, R() * H, 160);
    g.addColorStop(0, 'rgba(30,20,10,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (o.night) {
    ctx.fillStyle = 'rgba(10,15,45,0.55)';
    ctx.fillRect(0, 0, W, H);
    lightPool(ctx, 1000, 140, 420, 'rgba(180,200,255,0.25)');
    lightPool(ctx, 220, 640, 300, 'rgba(255,170,60,0.28)');
    vignette(ctx, 0.75);
  } else vignette(ctx, 0.45);
}

// Painted horizontal shiplap with baseboard and crown moulding.
function shiplap(ctx, R, o) {
  const ph = 62;
  for (let y = 40; y < H - 60; y += ph) {
    plank(ctx, R, 0, y, W, ph, { hue: o.hue, sat: o.sat, lit: o.lit, paint: o.paint, knots: 0.35, grain: 0.6 });
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, y + ph - 4, W, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, y, W, 2);
  }
  // crown + baseboard in natural wood
  plank(ctx, R, 0, 0, W, 40, { ...o.trim });
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 40, W, 6);
  plank(ctx, R, 0, H - 64, W, 64, { ...o.trim });
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(0, H - 64, W, 3);
  if (o.decor) o.decor(ctx, R);
  lightPool(ctx, W * 0.3, 0, 700, 'rgba(255,240,210,0.18)');
  vignette(ctx, 0.35);
}

// Log cabin: stacked round logs with chinking and log ends.
function logcabin(ctx, R, o) {
  ctx.fillStyle = '#d8ccb4';
  ctx.fillRect(0, 0, W, H);
  const lh = 86;
  for (let y = -20; y < H; y += lh) {
    plank(ctx, R, 0, y + 6, W, lh - 12, { ...o.wood, knots: 0.9, bevel: 0 });
    // round shading
    const g = ctx.createLinearGradient(0, y + 6, 0, y + lh - 6);
    g.addColorStop(0, 'rgba(0,0,0,0.5)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.08)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y + 6, W, lh - 12);
    // chinking texture
    ctx.fillStyle = 'rgba(120,100,80,0.25)';
    for (let i = 0; i < 60; i++) ctx.fillRect(R() * W, y + lh - 7 + R() * 6, 3, 2);
  }
  // log ends at the corners
  for (let y = -20; y < H; y += lh) {
    for (const ex of [-10, W + 10]) {
      const r = (lh - 12) / 2 + 4;
      const cy = y + lh / 2;
      ctx.beginPath(); ctx.arc(ex, cy, r, 0, TAU);
      ctx.fillStyle = hsl(o.wood.hue + 4, o.wood.sat - 5, o.wood.lit + 14); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.stroke();
      for (let k = 6; k < r; k += 6) {
        ctx.beginPath(); ctx.arc(ex + (R() - 0.5) * 2, cy, k, 0, TAU);
        ctx.strokeStyle = 'rgba(90,50,20,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      }
      // crack
      ctx.beginPath(); ctx.moveTo(ex, cy); ctx.lineTo(ex + (ex < 0 ? 1 : -1) * r * 0.9, cy + (R() - 0.5) * 20);
      ctx.strokeStyle = 'rgba(40,20,10,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  lightPool(ctx, 640, 200, 800, 'rgba(255,200,120,0.15)');
  vignette(ctx, 0.5);
}

function moulding(ctx, x, y, w, h, wood, R, gold) {
  // A raised frame with light on the top-left and shadow on the bottom-right.
  plank(ctx, R, x, y, w, h, { ...wood, lit: wood.lit + 4, bevel: 0 });
  const b = 10;
  ctx.fillStyle = 'rgba(255,220,180,0.18)';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - b, y + b); ctx.lineTo(x + b, y + b); ctx.lineTo(x + b, y + h - b); ctx.lineTo(x, y + h); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x + b, y + h - b); ctx.lineTo(x + w - b, y + h - b); ctx.lineTo(x + w - b, y + b); ctx.fill();
  // inner raised field
  const ix = x + b + 10, iy = y + b + 10, iw = w - 2 * (b + 10), ih = h - 2 * (b + 10);
  plank(ctx, R, ix, iy, iw, ih, { ...wood, vertical: true, bevel: 0 });
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  ctx.strokeStyle = 'rgba(255,220,180,0.15)'; ctx.lineWidth = 2; ctx.strokeRect(ix + 4, iy + 4, iw - 8, ih - 8);
  if (gold) { ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.strokeRect(ix - 5, iy - 5, iw + 10, ih + 10); }
}

function rosette(ctx, x, y, r, wood, gold) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(TAU / 8);
    const g = ctx.createLinearGradient(0, 0, 0, -r);
    g.addColorStop(0, hsl(wood.hue, wood.sat, wood.lit + 10));
    g.addColorStop(1, hsl(wood.hue, wood.sat, wood.lit - 8));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.22, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fillStyle = gold || hsl(wood.hue, wood.sat, wood.lit + 15); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
  ctx.restore();
}

// Elaborate mahogany woodwork: crown moulding, pilasters, raised panels, chair rail.
function mahogany(ctx, R, o) {
  const wood = o.wood;
  ctx.fillStyle = hsl(wood.hue, wood.sat, wood.lit - 12);
  ctx.fillRect(0, 0, W, H);
  // crown
  plank(ctx, R, 0, 0, W, 54, { ...wood, lit: wood.lit + 3 });
  for (let x = 8; x < W; x += 26) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, 54, 16, 16);
    ctx.fillStyle = hsl(wood.hue, wood.sat, wood.lit + 6); ctx.fillRect(x, 54, 14, 14);
  }
  if (o.gold) { ctx.fillStyle = o.gold; ctx.fillRect(0, 50, W, 4); ctx.fillRect(0, 72, W, 3); }
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 75, W, 5);
  // pilasters & upper panels
  const cols = 4, pil = 56, top = 90, upperH = 420;
  const panelW = (W - (cols + 1) * pil) / cols;
  for (let i = 0; i <= cols; i++) {
    const px = i * (panelW + pil);
    plank(ctx, R, px, top, pil, H - top, { ...wood, vertical: true, lit: wood.lit + 2 });
    for (let f = 0; f < 3; f++) {
      const fx = px + 12 + f * 12;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(fx, top + 30, 6, upperH - 40);
      ctx.fillStyle = 'rgba(255,220,180,0.12)'; ctx.fillRect(fx + 5, top + 30, 2, upperH - 40);
    }
    rosette(ctx, px + pil / 2, top + 16, 15, wood, o.gold);
  }
  for (let i = 0; i < cols; i++) {
    const px = pil + i * (panelW + pil);
    moulding(ctx, px, top, panelW, upperH, wood, R, o.gold);
    rosette(ctx, px + panelW / 2, top + upperH / 2, 30, wood, o.gold);
  }
  // chair rail
  const ry = top + upperH + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, ry + 34, W, 8);
  plank(ctx, R, 0, ry, W, 34, { ...wood, lit: wood.lit + 6 });
  ctx.fillStyle = 'rgba(255,220,180,0.25)'; ctx.fillRect(0, ry + 4, W, 3);
  if (o.gold) { ctx.fillStyle = o.gold; ctx.fillRect(0, ry + 14, W, 3); }
  // lower wainscot
  for (let i = 0; i < cols * 2; i++) {
    const pw2 = (W - (cols * 2 + 1) * 20) / (cols * 2);
    moulding(ctx, 20 + i * (pw2 + 20), ry + 54, pw2, H - ry - 110, wood, R, o.gold);
  }
  plank(ctx, R, 0, H - 44, W, 44, { ...wood, lit: wood.lit - 4 });
  // varnish highlight + warm lamp light
  lightPool(ctx, 300, 100, 600, 'rgba(255,190,120,0.14)');
  lightPool(ctx, 1000, 120, 500, 'rgba(255,190,120,0.1)');
  if (o.chandelier) lightPool(ctx, W / 2, 0, 700, 'rgba(255,230,160,0.22)');
  vignette(ctx, 0.55);
}

// Butcher block herringbone.
function herringbone(ctx, R, o) {
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(0, 0, W, H);
  const cw = 80, th = 34, sk = 0.55;
  for (let c = -1; c * cw < W + cw; c++) {
    const dir = c % 2 ? 1 : -1;
    for (let y = -120; y < H + 120; y += th) {
      ctx.save();
      ctx.transform(1, dir * sk, 0, 1, c * cw, y - (dir > 0 ? 0 : cw * sk));
      const tone = o.tones[Math.floor(R() * o.tones.length)];
      plank(ctx, R, 0, 0, cw, th, { ...tone, knots: 0.15, grain: 0.8 });
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, cw, th);
      ctx.restore();
    }
  }
  ctx.fillStyle = 'rgba(255,230,200,0.06)';
  ctx.fillRect(0, 0, W, H);
  lightPool(ctx, 640, 120, 700, 'rgba(255,240,200,0.18)');
  vignette(ctx, 0.5);
}

// Bleached driftwood planks under bright sun.
function driftwood(ctx, R, o) {
  let y = 0;
  while (y < H) {
    const h = 60 + R() * 40;
    plank(ctx, R, 0, y, W, h, { hue: 35, sat: 12 + R() * 8, lit: 70 + R() * 8, knots: 0.7 });
    // cracks
    for (let i = 0; i < 3; i++) {
      const cx = R() * W;
      ctx.beginPath(); ctx.moveTo(cx, y + h * (0.3 + R() * 0.4));
      for (let k = 0; k < 6; k++) ctx.lineTo(cx + k * 18, y + h * 0.5 + (R() - 0.5) * 10);
      ctx.strokeStyle = 'rgba(60,40,20,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,30,20,0.45)'; ctx.fillRect(0, y + h - 4, W, 4);
    y += h;
  }
  // rope wrapped posts
  for (const px of [36, W - 76]) {
    plank(ctx, R, px, 0, 40, H, { hue: 30, sat: 18, lit: 55, vertical: true });
    for (let ry = 200; ry < 280; ry += 8) {
      ctx.strokeStyle = '#c9a66b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px - 2, ry); ctx.lineTo(px + 42, ry + 5); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  lightPool(ctx, 1100, 0, 800, 'rgba(255,240,200,0.35)');
  ctx.fillStyle = 'rgba(0,160,200,0.05)';
  ctx.fillRect(0, 0, W, H);
  vignette(ctx, 0.3);
}

// Knotty pine tongue-and-groove with a festive garland.
function pine(ctx, R, o) {
  let x = 0;
  while (x < W) {
    const w = 100 + R() * 20;
    plank(ctx, R, x, 0, w, H, { hue: 36, sat: 60, lit: 58, vertical: true, knots: 1.0 });
    // extra knots for knotty pine
    for (let k = 0; k < 2; k++) {
      const kx = x + 20 + R() * (w - 40), ky = R() * H, kr = 5 + R() * 6;
      ctx.beginPath(); ctx.ellipse(kx, ky, kr, kr * 1.4, 0, 0, TAU);
      ctx.fillStyle = 'rgba(110,55,15,0.75)'; ctx.fill();
      ctx.strokeStyle = 'rgba(90,40,10,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(kx, ky, kr + 5, kr * 1.4 + 10, 0, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80,40,10,0.55)'; ctx.fillRect(x + w - 4, 0, 4, H);
    x += w;
  }
  // garland
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    ctx.strokeStyle = ['#1e5a2a', '#2a7a38', '#3a9a48'][pass];
    ctx.lineWidth = 26 - pass * 7;
    ctx.beginPath();
    for (let gx = -20; gx <= W + 20; gx += 10) ctx.lineTo(gx, 70 + Math.abs(Math.sin(gx / 160 * Math.PI)) * 50);
    ctx.stroke();
  }
  const bulbs = ['#ff4b5c', '#ffd23f', '#3fa7ff', '#2ee59d', '#ff8c1a'];
  for (let gx = 40, i = 0; gx < W; gx += 64, i++) {
    const gy = 76 + Math.abs(Math.sin(gx / 160 * Math.PI)) * 50;
    lightPool(ctx, gx, gy + 14, 40, bulbs[i % 5] + '55');
    ctx.beginPath(); ctx.ellipse(gx, gy + 14, 6, 9, 0, 0, TAU); ctx.fillStyle = bulbs[i % 5]; ctx.fill();
  }
  // snowy windowsill glow from below
  lightPool(ctx, 640, 800, 600, 'rgba(200,230,255,0.2)');
  vignette(ctx, 0.45);
}

/* -------------------------------------------------------------- */

export const BACKDROPS = {
  fence: (c, R, m) => picket(c, R, {
    sky: ['#7cc7ff', '#e6f6ff'], trees: ['#5aa04a', '#4a8f3c', '#6bb355'], grass: '#5fae3e', tuft: ['#4f9a32', '#6cc04a'],
    wood: { hue: 40, sat: 12, lit: 88 },
  }, m),
  autumnFence: (c, R, m) => picket(c, R, {
    sky: ['#ffb36b', '#ffe7c2'], sun: 'rgba(255,220,150,0.9)', sunX: 220, trees: ['#d9541e', '#e8902a', '#b8401a', '#f2b632'], grass: '#8a8a3a', tuft: ['#7a6a2a', '#9a8a3a'],
    wood: { hue: 28, sat: 40, lit: 46 }, leaves: ['#e2411f', '#ff8c1a', '#f6c026'],
  }, m),
  barn: (c, R) => barn(c, R, { wood: { hue: 32, sat: 14, lit: 44 } }),
  nightBarn: (c, R) => barn(c, R, { wood: { hue: 4, sat: 55, lit: 34 }, trim: '#e8e0d0', night: true }),
  partyWall: (c, R) => shiplap(c, R, {
    hue: 190, sat: 40, lit: 62, paint: null, trim: { hue: 30, sat: 40, lit: 45 },
    decor: (ctx, R2) => {
      // bunting
      const cols = ['#ff4b5c', '#ffd23f', '#3fa7ff', '#2ee59d', '#9b5de5'];
      for (let row = 0; row < 2; row++) {
        const y0 = 60 + row * 30;
        ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y0 + Math.sin((x / W) * Math.PI * (row + 2)) * 20);
        ctx.stroke();
        for (let x = 20, i = 0; x < W; x += 56, i++) {
          const y = y0 + Math.sin((x / W) * Math.PI * (row + 2)) * 20;
          ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y); ctx.lineTo(x, y + 30); ctx.closePath();
          ctx.fillStyle = cols[(i + row) % 5]; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
        }
      }
    },
  }),
  nursery: (c, R) => shiplap(c, R, {
    hue: 330, sat: 45, lit: 85, trim: { hue: 40, sat: 30, lit: 75 },
    decor: (ctx, R2) => {
      for (let i = 0; i < 18; i++) {
        const x = R2() * W, y = 80 + R2() * 600;
        ctx.fillStyle = ['rgba(255,255,255,0.5)', 'rgba(255,220,120,0.5)', 'rgba(150,210,255,0.5)'][i % 3];
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, r = k % 2 ? 6 : 14; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        ctx.fill();
      }
    },
  }),
  logCabin: (c, R) => logcabin(c, R, { wood: { hue: 26, sat: 50, lit: 40 } }),
  mahogany: (c, R) => mahogany(c, R, { wood: { hue: 8, sat: 58, lit: 26 }, gold: null }),
  ballroom: (c, R) => mahogany(c, R, { wood: { hue: 5, sat: 62, lit: 22 }, gold: '#d4a73a', chandelier: true }),
  butcherBlock: (c, R) => herringbone(c, R, {
    tones: [{ hue: 34, sat: 50, lit: 62 }, { hue: 30, sat: 45, lit: 52 }, { hue: 26, sat: 50, lit: 44 }, { hue: 38, sat: 40, lit: 68 }],
  }),
  driftwood: (c, R) => driftwood(c, R, {}),
  pineLodge: (c, R) => pine(c, R, {}),
};

// Render a backdrop into a canvas at the given pixel scale.
// Also produces an alpha mask (low-res) of solid wood so darts can fly through gaps.
export function renderBackdrop(name, seed, scale) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W * scale);
  cv.height = Math.ceil(H * scale);
  const ctx = cv.getContext('2d');
  ctx.scale(scale, scale);
  const R = rng(seed);
  const MS = 0.25; // mask resolution
  const mc = document.createElement('canvas');
  mc.width = W * MS;
  mc.height = H * MS;
  const mctx = mc.getContext('2d');
  mctx.scale(MS, MS);
  mctx.fillStyle = '#fff';
  const fn = BACKDROPS[name];
  const usesMask = fn.length >= 3;
  if (!usesMask) mctx.fillRect(0, 0, W, H);
  fn(ctx, R, mctx);
  const data = mctx.getImageData(0, 0, mc.width, mc.height).data;
  const mw = mc.width, mh = mc.height;
  const solid = (x, y) => {
    const mx = Math.floor(x * MS), my = Math.floor(y * MS);
    if (mx < 0 || my < 0 || mx >= mw || my >= mh) return false;
    return data[(my * mw + mx) * 4 + 3] > 128;
  };
  return { canvas: cv, solid };
}
