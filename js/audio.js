// All sound is synthesized with the Web Audio API: no audio files to download,
// which keeps the PWA tiny and fully offline.

let ac = null;
let master = null;
let noiseBuf = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ac.currentTime, 0.02);
}

export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(comp);
      comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) {
    ac = null;
  }
}

function ready() {
  return ac && ac.state === 'running';
}

// Gain envelope: quick attack, exponential decay.
function env(t, peak, attack, decay, dest = master) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(dest);
  return g;
}

function osc(type, f0, f1, t, dur, peak, attack = 0.003, dest) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = env(t, peak, attack, dur, dest);
  o.connect(g);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
  return o;
}

function noise(t, dur, peak, filterType, freq, q = 1, attack = 0.002, freqEnd) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  f.Q.value = q;
  const g = env(t, peak, attack, dur);
  src.connect(f);
  f.connect(g);
  src.start(t, Math.random() * 1.5);
  src.stop(t + attack + dur + 0.05);
}

export const sfx = {
  // The star of the show: a deep, woody THUNK with a little dart quiver after.
  thunk(v = 1) {
    if (!ready()) return;
    const t = ac.currentTime;
    const p = 0.9 + Math.random() * 0.2;
    osc('sine', 190 * p, 46 * p, t, 0.22, 0.95 * v, 0.002);
    osc('triangle', 460 * p, 240 * p, t, 0.075, 0.38 * v);
    noise(t, 0.02, 0.55 * v, 'bandpass', 3200 * p, 0.9);
    noise(t, 0.1, 0.5 * v, 'lowpass', 900 * p, 0.7, 0.002, 200);
    // Dart shaft vibration: a low tone with fast tremolo.
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 118 * p;
    const trem = ac.createGain();
    trem.gain.value = 0;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 31;
    const lfoG = ac.createGain();
    lfoG.gain.value = 0.5;
    lfo.connect(lfoG);
    lfoG.connect(trem.gain);
    const g = env(t + 0.015, 0.16 * v, 0.004, 0.32);
    o.connect(trem);
    trem.connect(g);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.45);
    lfo.stop(t + 0.45);
  },
  // Pinning an object: thunk plus a soft "squish/crinkle".
  pin() {
    if (!ready()) return;
    this.thunk(0.95);
    const t = ac.currentTime;
    noise(t + 0.005, 0.06, 0.25, 'highpass', 2500, 0.8);
    osc('sine', 700, 1100, t + 0.02, 0.08, 0.12);
  },
  whoosh(dur = 0.4) {
    if (!ready()) return;
    const t = ac.currentTime;
    noise(t, dur, 0.22, 'bandpass', 500, 1.6, dur * 0.4, 2400);
  },
  miss() {
    if (!ready()) return;
    const t = ac.currentTime;
    noise(t, 0.25, 0.12, 'bandpass', 1800, 2, 0.01, 400);
  },
  bounce() {
    if (!ready()) return;
    const t = ac.currentTime;
    osc('square', 900, 300, t, 0.08, 0.08);
    noise(t, 0.03, 0.2, 'highpass', 4000);
  },
  explode() {
    if (!ready()) return;
    const t = ac.currentTime;
    noise(t, 0.05, 0.9, 'highpass', 1500);
    noise(t, 0.9, 1.0, 'lowpass', 3000, 0.5, 0.004, 80);
    osc('sine', 110, 28, t, 0.7, 1.0);
    for (let i = 0; i < 6; i++) {
      const tt = t + 0.12 + Math.random() * 0.5;
      noise(tt, 0.05, 0.3, 'bandpass', 2000 + Math.random() * 3000, 3);
    }
  },
  yelp() {
    if (!ready()) return;
    const t = ac.currentTime;
    osc('sawtooth', 600, 1400, t, 0.07, 0.14);
    osc('sawtooth', 1400, 500, t + 0.07, 0.16, 0.14);
    osc('sine', 800, 1700, t, 0.07, 0.2);
    osc('sine', 1700, 600, t + 0.07, 0.16, 0.2);
  },
  ting() {
    if (!ready()) return;
    const t = ac.currentTime;
    osc('sine', 1760, 1760, t, 0.5, 0.25);
    osc('sine', 2740, 2740, t, 0.3, 0.12);
    osc('sine', 4300, 4300, t, 0.15, 0.06);
    this.thunk(0.4);
  },
  target() {
    if (!ready()) return;
    const t = ac.currentTime;
    osc('triangle', 880, 880, t, 0.12, 0.2);
    osc('triangle', 1320, 1320, t + 0.06, 0.18, 0.2);
  },
  chime(step = 0) {
    if (!ready()) return;
    const t = ac.currentTime;
    const base = 523.25 * Math.pow(2, Math.min(step, 12) / 12);
    osc('sine', base, base, t, 0.25, 0.16);
    osc('sine', base * 1.5, base * 1.5, t + 0.05, 0.3, 0.1);
  },
  pop() {
    if (!ready()) return;
    const t = ac.currentTime;
    osc('sine', 300, 900, t, 0.06, 0.25);
    noise(t, 0.04, 0.25, 'bandpass', 1500, 1.5);
  },
  click() {
    if (!ready()) return;
    const t = ac.currentTime;
    osc('triangle', 1200, 700, t, 0.05, 0.18);
    noise(t, 0.015, 0.15, 'bandpass', 3000);
  },
  win() {
    if (!ready()) return;
    const t = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      osc('triangle', f, f, t + i * 0.1, 0.4, 0.2);
      osc('sine', f * 2, f * 2, t + i * 0.1, 0.2, 0.05);
    });
  },
  star(i) {
    if (!ready()) return;
    const t = ac.currentTime;
    const f = [784, 988, 1175][i] || 1175;
    osc('triangle', f, f, t, 0.35, 0.22);
    osc('sine', f * 2, f * 2, t, 0.25, 0.08);
    noise(t, 0.2, 0.06, 'highpass', 6000);
  },
  lose() {
    if (!ready()) return;
    const t = ac.currentTime;
    [392, 349.23, 311.13, 261.63].forEach((f, i) => osc('triangle', f, f * 0.98, t + i * 0.18, 0.35, 0.2));
  },
  fuse() {
    if (!ready()) return;
    const t = ac.currentTime;
    noise(t, 0.08, 0.05, 'highpass', 5000);
  },
};
