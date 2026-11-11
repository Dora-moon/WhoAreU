/**
 * @file AudioView.js
 * @description Web Audio API Synthesizer (Mechanical Ticking, Ding,
 * Tier-specific Victory Fanfare, and Volume/Mute control).
 */

export class AudioView {
  constructor() {
    this.storageSoundKey = 'wg_sound';
    this.storageVolKey = 'wg_vol';

    this.ctx = null;
    this.master = null;

    this.on = this._load(this.storageSoundKey, true);
    this.vol = this._load(this.storageVolKey, 0.6);
  }

  _load(key, def) {
    try {
      if (typeof localStorage === 'undefined') return def;
      const v = localStorage.getItem(key);
      return v == null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  }

  _save(key, val) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVol(v) {
    this.vol = Math.max(0, Math.min(1, v));
    if (this.master) {
      this.master.gain.value = this.vol;
    }
    this._save(this.storageVolKey, this.vol);
  }

  toggleSound() {
    this.on = !this.on;
    this._save(this.storageSoundKey, this.on);
    if (this.on) {
      this.init();
      this.chime();
    }
    return this.on;
  }

  tone(f, d, type = 'sine', g = 0.2, at = 0, f2 = null) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx;
    const s = c.currentTime + at;
    const o = c.createOscillator();
    const G = c.createGain();

    o.type = type;
    o.frequency.setValueAtTime(f, s);
    if (f2) {
      o.frequency.exponentialRampToValueAtTime(f2, s + d);
    }

    G.gain.setValueAtTime(0.0001, s);
    G.gain.exponentialRampToValueAtTime(g, s + 0.012);
    G.gain.exponentialRampToValueAtTime(0.0001, s + d);

    o.connect(G);
    G.connect(this.master);

    o.start(s);
    o.stop(s + d + 0.03);
  }

  noise(d, g = 0.2) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx;
    const n = Math.floor(c.sampleRate * d);
    const b = c.createBuffer(1, n, c.sampleRate);
    const x = b.getChannelData(0);

    for (let i = 0; i < n; i++) {
      x[i] = (Math.random() * 2 - 1) * (1 - i / n);
    }

    const s = c.createBufferSource();
    s.buffer = b;

    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2500;

    const G = c.createGain();
    G.gain.value = g;

    s.connect(f);
    f.connect(G);
    G.connect(this.master);

    s.start();
  }

  tick(p) {
    this.init();
    const f = 700 + (1 - p) * 600;
    this.noise(0.02, 0.35);
    this.tone(f, 0.05, 'square', 0.06);
    this.tone(f / 2, 0.06, 'triangle', 0.07);
  }

  chime() {
    this.init();
    this.tone(880, 0.15, 'sine', 0.15);
    this.tone(1320, 0.25, 'sine', 0.12, 0.1);
  }

  win(tier) {
    this.init();
    if (tier === 'common') {
      this.tone(523, 0.2, 'triangle', 0.25);
      this.tone(659, 0.3, 'triangle', 0.25, 0.12);
    } else if (tier === 'mid') {
      [523, 659, 784, 1047].forEach((f, i) => {
        this.tone(f, 0.28, 'triangle', 0.22, i * 0.09);
        this.tone(f * 2, 0.2, 'sine', 0.08, i * 0.09);
      });
    } else {
      // Rare tier: Sub-bass boom, triumphant chords, and starlight cascades
      this.tone(55, 1, 'sine', 0.5, 0, 28);
      const chords = [
        [261, 329, 392],
        [261, 329, 392],
        [349, 440, 523],
        [392, 494, 587, 784]
      ];
      chords.forEach((ch, i) => {
        ch.forEach(f => {
          this.tone(f, i === 3 ? 1.3 : 0.28, 'sawtooth', 0.07, i * 0.26);
        });
      });
      for (let i = 0; i < 10; i++) {
        this.tone(1400 + Math.random() * 2200, 0.25, 'sine', 0.06, 1 + i * 0.07);
      }
    }
  }
}

export default AudioView;
