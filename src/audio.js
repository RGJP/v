'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 4. SOUND — synthesized SFX and a lookahead music sequencer
// ═══════════════════════════════════════════════════════════════════════════
function loadVol(k) {
  const v = parseFloat(safeStorage.get(k));
  return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
}

const Sound = {
  ctx: null, master: null, sfx: null, music: null, noiseBuf: null,
  // player volume sliders, 0..1 (50% each by default); scaled so 50/50 is an even mix
  musicVol: loadVol('boyo-vol-music'), sfxVol: loadVol('boyo-vol-sfx'),
  musicGain() { return this.musicVol * 0.6; },
  sfxGain() { return this.sfxVol * 2.2; },
  setVol(kind, v) {
    v = Math.max(0, Math.min(1, Math.round(v * 20) / 20));
    if (kind === 'music') this.musicVol = v; else this.sfxVol = v;
    safeStorage.set('boyo-vol-' + kind, String(v));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'music') this.music.gain.setTargetAtTime(this.musicGain(), t, 0.02);
    else this.sfx.gain.setTargetAtTime(this.sfxGain(), t, 0.02);
  },
  muted: false,                      // no mute toggle any more: the pause-menu volume sliders do that job
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = this.sfxGain(); this.sfx.connect(this.master);
      this.music = ctx.createGain(); this.music.gain.value = this.musicGain(); this.music.connect(this.master);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  unlock() {
    this.init();
    if (!this.paused && this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  setMuted(m) {
    this.muted = m;
    safeStorage.set('boyo-muted', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.02);
  },
  tone(f, t0, dur, o = {}) {
    const ctx = this.ctx;
    if (!ctx || !f) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.attack || 0.004));
    if (o.sustain) g.gain.setValueAtTime(v * 0.8, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.bus || this.sfx);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },
  noise(t0, dur, o = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.value = o.freq || 2000;
    const g = ctx.createGain();
    const v = o.vol == null ? 0.2 : o.vol;
    if (o.attack) { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + o.attack); } else g.gain.setValueAtTime(v, t0);   // (a slow attack: no click at the start)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfx);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  },
  // a single bell-like note (the singing crystals of 1-2)
  note(f) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.005;
    this.tone(f, t, 0.9, { type: 'sine', vol: 0.2 }); this.tone(f * 2, t, 0.5, { type: 'triangle', vol: 0.05 }); this.tone(f * 3.01, t, 0.25, { type: 'sine', vol: 0.03 });
  },
  seq(notes, step, o = {}) {
    const t = this.ctx.currentTime + 0.005;
    notes.forEach((n, i) => { if (n) this.tone(n, t + i * step, o.dur || step * 1.15, o); });
  },
  // Off-screen silence: while an enemy, a moving platform or a fireball updates, the game points `src`
  // at it (and `view` at the visible stretch of the level, a little margin either side); anything it
  // plays is dropped unless it's on screen. Something that has to be heard coming sets `heardOffscreen`.
  src: null, view: null,
  paused: false,
  pauseAll() {
    if (this.paused) return;
    this.paused = true; this.samplesPaused = new Set();
    for (const el of this.samplesOn || []) if (!el.paused && !el.ended) {
      this.samplesPaused.add(el); el.pause();
    }
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  },
  resumeAll() {
    if (!this.paused) return;
    this.paused = false;
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    for (const el of this.samplesPaused || []) {
      if (this.samplesOn && this.samplesOn.has(el) && !el.ended) el.play().catch(() => {});
    }
    this.samplesPaused = null;
  },
  stopSamples() {
    if (this.samplesOn) for (const el of this.samplesOn) el.pause();
    this.samplesOn = null; this.samplesPaused = null;
  },
  // A recorded sound effect: one of `files` at random (never the same twice running), at the sfx volume
  sample(files, gain = 1) {
    if (this.paused) return;
    try {
      this.sampleLast = this.sampleLast || {};
      const key = files[0], pool = this.samplePool = this.samplePool || {};
      let pick; do pick = Math.floor(Math.random() * files.length); while (files.length > 1 && pick === this.sampleLast[key]);
      this.sampleLast[key] = pick;
      const el = new Audio(files[pick]);
      (this.samplesOn = this.samplesOn || new Set()).add(el); el.addEventListener('ended', () => { if (this.samplesOn) this.samplesOn.delete(el); if (this.samplesPaused) this.samplesPaused.delete(el); });
      el.volume = Math.min(1, this.sfxVol * gain * 1.2);
      el.play().catch(() => { if (pool[files[pick]] === 'missing') return; pool[files[pick]] = 'missing'; });
      return el;
    } catch (e) { /* no audio: no sound */ }
  },
  audible() {
    const s = this.src, v = this.view;
    if (!s || !v || s.heardOffscreen || s.w == null) return true;
    return s.x + s.w > v[0] && s.x < v[1] && !(s.y > VIEW_H + 16);
  },
  play(name) {
    if (this.paused || !this.audible()) return;
    Pad.rumble(name);
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'jump': this.tone(260, t, 0.16, { type: 'triangle', slide: 640, vol: 0.22 }); this.tone(520, t, 0.05, { vol: 0.04 }); break;
      case 'jumpBig': this.tone(190, t, 0.18, { type: 'triangle', slide: 480, vol: 0.24 }); this.tone(380, t, 0.05, { vol: 0.04 }); break;
      case 'coin': this.tone(1175, t, 0.16, { type: 'sine', slide: 1760, vol: 0.18 }); this.tone(2349, t + 0.06, 0.22, { type: 'sine', vol: 0.06 }); this.noise(t, 0.08, { filter: 'highpass', freq: 5000, vol: 0.04 }); break;
      case 'stomp': this.tone(520, t, 0.12, { slide: 110, vol: 0.2 }); this.noise(t, 0.07, { freq: 1500, vol: 0.15 }); break;
      case 'kick': this.tone(880, t, 0.05, { vol: 0.14 }); this.tone(440, t + 0.04, 0.08, { vol: 0.14 }); break;
      case 'bump': this.tone(140, t, 0.1, { type: 'triangle', slide: 70, vol: 0.4 }); break;
      case 'break': this.noise(t, 0.28, { freq: 1100, vol: 0.4 }); this.tone(180, t, 0.15, { slide: 50, vol: 0.2, type: 'triangle' }); break;
      case 'appear': this.tone(180, t, 0.25, { type: 'sine', slide: 520, vol: 0.3 }); this.noise(t + 0.18, 0.05, { freq: 3000, vol: 0.06 }); break;
      // Superwing
      case 'swGrab': this.tone(330, t, 0.2, { type: 'sine', slide: 880, vol: 0.18 }); this.tone(660, t + 0.05, 0.16, { type: 'triangle', slide: 1320, vol: 0.06 }); break;
      case 'swDrop': this.tone(760, t, 0.16, { type: 'sine', slide: 280, vol: 0.14 }); break;
      case 'swFuse': this.noise(t, 0.12, { freq: 700, vol: 0.18 }); this.tone(220, t, 0.1, { type: 'square', slide: 440, vol: 0.06 }); this.tone(880, t + 0.08, 0.22, { type: 'sine', slide: 1320, vol: 0.12 }); break;
      case 'swSplit': this.tone(560, t, 0.09, { type: 'square', slide: 200, vol: 0.07 }); this.noise(t, 0.1, { freq: 2200, vol: 0.12 }); break;
      case 'swTurn': this.tone(440, t, 0.07, { type: 'triangle', slide: 620, vol: 0.12 }); break;
      case 'swDeny': this.tone(160, t, 0.09, { type: 'square', vol: 0.06 }); this.tone(120, t + 0.1, 0.1, { type: 'square', vol: 0.06 }); break;
      case 'swThud': this.tone(120, t, 0.1, { type: 'triangle', slide: 60, vol: 0.3 }); this.noise(t, 0.05, { freq: 500, vol: 0.1 }); break;
      case 'power': this.tone(330, t, 0.45, { type: 'triangle', slide: 1320, vol: 0.22 }); this.seq([0, 0, 0, 1760, 0, 2093, 0, 2637], 0.05, { type: 'sine', vol: 0.07 }); break;
      case 'oneup': this.seq([880, 1109, 1319, 1760, 1319, 1760], 0.07, { type: 'triangle', vol: 0.2, dur: 0.1 }); break;
      case 'shrink': this.tone(700, t, 0.4, { type: 'triangle', slide: 160, vol: 0.25 }); this.tone(705, t, 0.4, { slide: 170, vol: 0.03 }); break;
      case 'fire': this.tone(900, t, 0.1, { type: 'triangle', slide: 300, vol: 0.2 }); this.noise(t, 0.08, { filter: 'highpass', freq: 2000, vol: 0.06 }); break;
      case 'chargeUp': this.tone(220, t, 0.5, { type: 'sawtooth', slide: 660, vol: 0.05 }); this.tone(440, t, 0.5, { type: 'triangle', slide: 1320, vol: 0.1 }); break;
      case 'charged': this.seq([1319, 1760, 2637], 0.05, { type: 'triangle', vol: 0.16, dur: 0.12 }); break;
      case 'chargeHum': this.tone(1760, t, 0.06, { type: 'sine', vol: 0.05 }); break;
      case 'shot': this.tone(700, t, 0.22, { type: 'sawtooth', slide: 140, vol: 0.12 }); this.noise(t, 0.2, { freq: 1800, vol: 0.18 }); break;
      case 'blast': this.tone(160, t, 0.7, { type: 'sawtooth', slide: 40, vol: 0.25 }); this.noise(t, 0.6, { freq: 900, vol: 0.4 }); this.tone(1200, t, 0.35, { type: 'square', slide: 200, vol: 0.06 }); break;
      case 'die':
        // A rich, whimsical and tragic retro platformer death jingle:
        // 1. Shock hit & stumble: quick chirp pop followed by a startled run
        this.noise(t, 0.05, { vol: 0.15 });
        this.tone(880, t, 0.06, { type: 'square', slide: 440, vol: 0.12 });
        this.tone(392, t + 0.08, 0.08, { type: 'triangle', vol: 0.20 });
        this.tone(415, t + 0.17, 0.08, { type: 'triangle', vol: 0.20 });
        this.tone(440, t + 0.26, 0.09, { type: 'triangle', vol: 0.22 });
        // 2. Upward hop: rising arpeggio + bass swoop as Chickaroo springs into the air
        this.tone(523, t + 0.38, 0.08, { type: 'triangle', vol: 0.22 });
        this.tone(659, t + 0.46, 0.08, { type: 'triangle', vol: 0.22 });
        this.tone(784, t + 0.54, 0.08, { type: 'triangle', vol: 0.22 });
        this.tone(1047, t + 0.62, 0.16, { type: 'triangle', vol: 0.25 });
        this.tone(131, t + 0.38, 0.32, { type: 'sine', slide: 262, vol: 0.22 });
        // 3. Peak & comedic tumble: descending melodic line with counterpoint bass
        [
          [988, 0.80, 0.12], [880, 0.94, 0.12], [831, 1.08, 0.12],
          [784, 1.22, 0.12], [698, 1.36, 0.11], [659, 1.48, 0.11], [587, 1.60, 0.14],
        ].forEach(([f, dt, d]) => {
          this.tone(f, t + dt, d, { type: 'triangle', vol: 0.22 });
          this.tone(f * 0.5, t + dt, d, { type: 'square', vol: 0.05 });
        });
        this.tone(247, t + 0.80, 0.22, { type: 'triangle', vol: 0.16 });
        this.tone(220, t + 1.08, 0.22, { type: 'triangle', vol: 0.16 });
        this.tone(196, t + 1.36, 0.22, { type: 'triangle', vol: 0.16 });
        this.tone(147, t + 1.60, 0.18, { type: 'triangle', vol: 0.16 });
        // 4. Cadence resolution: playful slide and bittersweet resolving triad
        this.tone(554, t + 1.80, 0.16, { type: 'triangle', slide: 523, vol: 0.20 });
        this.tone(116, t + 1.80, 0.16, { type: 'sine', slide: 110, vol: 0.18 });
        this.tone(294, t + 2.02, 0.12, { type: 'triangle', vol: 0.20 });
        this.tone(311, t + 2.15, 0.12, { type: 'triangle', vol: 0.20 });
        this.tone(262, t + 2.28, 0.35, { type: 'triangle', vol: 0.24, sustain: true });
        this.tone(330, t + 2.28, 0.35, { type: 'sine', vol: 0.14 });
        this.tone(392, t + 2.28, 0.35, { type: 'sine', vol: 0.10 });
        this.tone(131, t + 2.28, 0.35, { type: 'sine', slide: 65, vol: 0.18 });
        break;
      case 'tick': this.tone(1568, t, 0.03, { vol: 0.05 }); break;
      case 'bark': this.tone(620, t, 0.07, { type: 'square', slide: 380, vol: 0.09 }); this.tone(560, t + 0.11, 0.08, { type: 'square', slide: 330, vol: 0.08 }); this.noise(t, 0.06, { freq: 900, vol: 0.05 }); break;   // (4-3's pup: a yap from a couple of its heads)
      case 'pause': this.seq([784, 1175], 0.09, { type: 'triangle', vol: 0.2, dur: 0.16 }); break;
      case 'select': this.tone(880, t, 0.05, { vol: 0.09 }); break;
      case 'confirm': this.seq([660, 990, 1320], 0.055, { vol: 0.1 }); break;
      case 'checkpoint': this.seq([784, 988, 1175, 1568], 0.075, { type: 'triangle', vol: 0.25 }); break;
      case 'hurry': this.seq([1568, 1175, 1568, 1175, 1568, 1175], 0.08, { type: 'triangle', vol: 0.2 }); break;
      case 'sizzle': this.noise(t, 0.18, { filter: 'highpass', freq: 3000, vol: 0.06 }); break;
      case 'firework': this.noise(t, 0.5, { freq: 600, vol: 0.28 }); this.tone(90, t, 0.3, { type: 'sine', slide: 40, vol: 0.3 }); break;
      case 'swing': this.noise(t, 0.12, { filter: 'bandpass', freq: 900, vol: 0.18 }); this.tone(300, t, 0.1, { type: 'triangle', slide: 160, vol: 0.08 }); break;
      case 'hammerHit':
        this.tone(155, t, 0.14, { type: 'sine', slide: 45, vol: 0.58 });
        this.noise(t, 0.065, { filter: 'bandpass', freq: 1500, vol: 0.32 });
        this.tone(760, t, 0.055, { type: 'triangle', slide: 280, vol: 0.16 });
        break;
      case 'snore': this.tone(70, t, 0.55, { type: 'sawtooth', slide: 95, vol: 0.16 }); this.noise(t, 0.5, { freq: 380, vol: 0.18 }); this.tone(140, t + 0.5, 0.25, { type: 'triangle', slide: 420, vol: 0.06 }); break;
      case 'fart': this.tone(95, t, 0.5, { type: 'sawtooth', slide: 58, vol: 0.2 }); this.tone(101, t + 0.05, 0.42, { type: 'square', slide: 66, vol: 0.08 }); this.noise(t, 0.45, { filter: 'lowpass', freq: 380, vol: 0.28 }); break;
      case 'honk': this.tone(220, t, 0.18, { type: 'square', slide: 160, vol: 0.12 }); this.tone(223, t, 0.18, { type: 'sawtooth', slide: 150, vol: 0.08 }); break;
      case 'shriek': this.tone(2400, t, 0.18, { type: 'square', slide: 3600, vol: 0.05 }); this.tone(3000, t + 0.1, 0.2, { type: 'square', slide: 1800, vol: 0.05 }); break;
      case 'chimeComplete':   // C#5 held for 0.2s, then a quick G#5–F#5–G#5 answer
        this.tone(554.365262, t, 0.2, { type: 'triangle', vol: 0.2, sustain: true });
        this.tone(830.609396, t + 0.2, 0.08, { type: 'triangle', vol: 0.2, sustain: true });
        this.tone(739.988846, t + 0.3, 0.08, { type: 'triangle', vol: 0.2, sustain: true });
        this.tone(830.609396, t + 0.4, 0.15, { type: 'triangle', vol: 0.2, sustain: true });
        break;
      case 'sour': this.tone(233, t, 0.35, { type: 'sawtooth', slide: 180, vol: 0.12 }); this.tone(247, t, 0.35, { type: 'sawtooth', slide: 190, vol: 0.12 }); break;
      case 'tada': this.seq([523, 659, 784, 0, 1047], 0.09, { type: 'triangle', vol: 0.2, dur: 0.3 }); break;
      case 'baa':this.tone(330, t, 0.12, { type: 'sawtooth', slide: 300, vol: 0.12 }); this.tone(300, t + 0.1, 0.32, { type: 'sawtooth', slide: 260, vol: 0.13 }); this.tone(306, t + 0.1, 0.32, { type: 'square', slide: 250, vol: 0.05 }); break;
      case 'letter': this.seq([988, 1319, 1661, 1976], 0.055, { type: 'square', vol: 0.15, dur: 0.18 }); break;
      case 'crystal': this.seq([523, 659, 784, 1047, 1319, 1568, 2093], 0.08, { type: 'triangle', vol: 0.22, dur: 0.7 }); break;
      case 'spin': this.tone(500, t, 0.22, { type: 'triangle', slide: 1300, vol: 0.18 }); this.noise(t, 0.18, { filter: 'bandpass', freq: 2600, vol: 0.12 }); break;
      case 'gustWarn': this.tone(380, t, 0.9, { type: 'sine', slide: 950, vol: 0.08 }); break;
      case 'gust': this.noise(t, 1.4, { freq: 650, vol: 0.22 }); this.noise(t, 1.0, { filter: 'highpass', freq: 3000, vol: 0.05 }); break;
      case 'slide': this.noise(t, 0.25, { filter: 'highpass', freq: 2500, vol: 0.1 }); this.tone(500, t, 0.15, { type: 'triangle', slide: 300, vol: 0.12 }); break;
      case 'crack': this.tone(2200, t, 0.05, { vol: 0.08 }); this.noise(t, 0.08, { filter: 'highpass', freq: 4000, vol: 0.1 }); break;
      case 'spike': this.tone(700, t, 0.12, { type: 'triangle', slide: 1500, vol: 0.12 }); this.noise(t, 0.06, { filter: 'highpass', freq: 5000, vol: 0.08 }); break;
      case 'iceshot': this.tone(1568, t, 0.12, { type: 'sine', slide: 2600, vol: 0.14 }); this.tone(2093, t + 0.05, 0.12, { type: 'sine', vol: 0.07 }); this.noise(t, 0.06, { filter: 'highpass', freq: 7000, vol: 0.06 }); break;
      case 'freeze': this.noise(t, 0.22, { filter: 'highpass', freq: 6000, vol: 0.2 }); this.seq([2637, 2093, 1568, 2093, 3136], 0.045, { type: 'sine', vol: 0.1 }); this.tone(300, t, 0.12, { type: 'triangle', slide: 120, vol: 0.12 }); break;
      case 'whoosh': this.noise(t, 0.34, { filter: 'bandpass', freq: 1300, vol: 0.2 }); this.tone(280, t, 0.28, { type: 'sine', slide: 760, vol: 0.08 }); break;
      case 'flap': this.noise(t, 0.12, { filter: 'bandpass', freq: 2200, vol: 0.14 }); this.tone(520, t, 0.1, { type: 'triangle', slide: 840, vol: 0.1 }); break;
      case 'volt': this.noise(t, 0.14, { filter: 'bandpass', freq: 3200, vol: 0.28 }); this.tone(1100, t, 0.14, { type: 'sawtooth', slide: 180, vol: 0.1 }); this.tone(2200, t, 0.05, { type: 'square', vol: 0.05 }); break;
      case 'thunder': this.noise(t, 0.8, { filter: 'lowpass', freq: 520, vol: 0.5 }); this.tone(70, t, 0.6, { type: 'sawtooth', slide: 32, vol: 0.28 }); this.noise(t, 0.2, { filter: 'bandpass', freq: 3000, vol: 0.3 }); this.tone(1400, t, 0.2, { type: 'sawtooth', slide: 150, vol: 0.1 }); break;
      case 'pound': this.tone(130, t, 0.3, { type: 'sine', slide: 38, vol: 0.55 }); this.noise(t, 0.35, { filter: 'lowpass', freq: 600, vol: 0.5 }); this.noise(t, 0.12, { freq: 2500, vol: 0.2 }); break;
      case 'shatter': this.noise(t, 0.3, { filter: 'highpass', freq: 2500, vol: 0.25 }); this.tone(1800, t, 0.12, { type: 'triangle', slide: 900, vol: 0.1 }); break;
      case 'roll': this.noise(t, 0.2, { filter: 'bandpass', freq: 900, vol: 0.22 }); this.tone(200, t, 0.16, { type: 'triangle', slide: 110, vol: 0.2 }); break;
      case 'swim': this.tone(420, t, 0.12, { type: 'triangle', slide: 760, vol: 0.14 }); this.noise(t, 0.06, { freq: 2500, vol: 0.04 }); break;
      case 'spring': this.tone(220, t, 0.28, { type: 'triangle', slide: 980, vol: 0.3 }); this.tone(440, t, 0.12, { slide: 1400, vol: 0.06 }); break;
      case 'boneCreak': return this.sample(['music/crack1.mp3', 'music/crack2.mp3', 'music/crack3.mp3', 'music/crack4.mp3'], 0.28); break;   // recorded cracking, one at random
      case 'crumble': this.noise(t, 0.22, { freq: 900, vol: 0.22 }); break;
      case 'umbraUnravel':
        this.tone(90,t,1.5,{type:'sine',slide:42,vol:.4,attack:.04});
        this.tone(220,t,.85,{type:'triangle',slide:880,vol:.14,attack:.08});
        this.noise(t,1.1,{filter:'bandpass',freq:950,vol:.3,attack:.12});break;
      case 'umbraFracture':
        this.noise(t,.16,{filter:'highpass',freq:2100,vol:.17});
        this.tone(740,t,.32,{type:'triangle',slide:370,vol:.12});
        this.tone(1480,t+.025,.4,{type:'sine',vol:.07});break;
      case 'umbraShatter':
        this.tone(115,t,1.2,{type:'sine',slide:28,vol:.62});
        this.noise(t,.9,{filter:'lowpass',freq:750,vol:.46});
        this.noise(t+.03,1.2,{filter:'highpass',freq:2800,vol:.28,attack:.025});
        [523,784,1047,1319,1568].forEach((f,i)=>this.tone(f,t+i*.07,1.25,{type:'sine',vol:.11-i*.012,attack:.02}));break;
      case 'umbraDust':
        [784,1047,1568,2093].forEach((f,i)=>this.tone(f,t+i*.09,.85,{type:'sine',vol:.085-i*.014,attack:.035}));break;
      case 'roar': this.tone(150, t, 0.8, { type: 'sawtooth', slide: 50, vol: 0.2 }); this.noise(t, 0.7, { freq: 500, vol: 0.3 }); break;
      case 'burn': this.noise(t, 0.4, { filter: 'highpass', freq: 1200, vol: 0.2 }); break;
      case 'lampOn': this.tone(660, t, 0.5, { type: 'sine', slide: 1320, vol: 0.12 }); this.tone(1976, t + 0.06, 0.6, { type: 'sine', vol: 0.06 }); this.noise(t, 0.2, { filter: 'highpass', freq: 4000, vol: 0.05 }); break;
      case 'shadeHiss': this.noise(t, 0.6, { filter: 'bandpass', freq: 700, vol: 0.2 }); this.tone(220, t, 0.6, { type: 'sawtooth', slide: 110, vol: 0.06 }); break;
      case 'shadeBurn': this.tone(1400, t, 0.5, { type: 'sawtooth', slide: 200, vol: 0.12 }); this.tone(1480, t, 0.45, { type: 'square', slide: 260, vol: 0.05 }); this.noise(t, 0.5, { filter: 'highpass', freq: 2500, vol: 0.2 }); break;
      case 'blink': this.noise(t, 0.15, { filter: 'bandpass', freq: 1600, vol: 0.14 }); this.tone(900, t, 0.12, { type: 'triangle', slide: 300, vol: 0.08 }); break;
      case 'buzz': for (let i = 0; i < 5; i++) this.tone(170 + i * 12, t + i * 0.09, 0.09, { type: 'sawtooth', slide: 230 + i * 12, vol: 0.07 }); break;
      case 'hop': this.tone(300, t, 0.14, { type: 'square', slide: 820, vol: 0.09 }); this.noise(t, 0.04, { filter: 'highpass', freq: 3000, vol: 0.05 }); break;
      case 'dig': this.noise(t, 0.16, { filter: 'lowpass', freq: 500, vol: 0.3 }); this.tone(90, t, 0.12, { type: 'triangle', slide: 55, vol: 0.18 }); break;
      case 'sprout': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.06, 0.16, { type: 'triangle', vol: 0.13 })); break;
      case 'leaf': this.tone(880, t, 0.06, { type: 'triangle', slide: 1320, vol: 0.07 }); this.noise(t, 0.04, { filter: 'highpass', freq: 5000, vol: 0.04 }); break;
      case 'freed': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, t + i * 0.07, 0.22, { type: 'triangle', vol: 0.16 })); this.tone(2093, t + 0.45, 0.5, { type: 'sine', vol: 0.1 }); break;
      case 'clockWarn': this.tone(2637, t, 0.035, { type: 'square', vol: 0.05 }); this.noise(t, 0.03, { filter: 'highpass', freq: 6000, vol: 0.07 }); break;
      case 'clockSwap': this.tone(1319, t, 0.25, { type: 'triangle', vol: 0.16 }); this.tone(1976, t + 0.04, 0.3, { type: 'sine', vol: 0.08 }); this.noise(t, 0.05, { filter: 'bandpass', freq: 3500, vol: 0.1 }); break;
      case 'sandsink': this.noise(t, 0.32, { filter: 'lowpass', freq: 420, vol: 0.3 }); this.tone(170, t, 0.28, { type: 'triangle', slide: 70, vol: 0.16 }); break;
      case 'spout': this.noise(t, 1.1, { filter: 'bandpass', freq: 800, vol: 0.32 }); this.noise(t, 0.6, { filter: 'lowpass', freq: 300, vol: 0.3 }); this.tone(90, t, 0.6, { type: 'sine', slide: 240, vol: 0.2 }); break;
      case 'rumble': this.noise(t, 0.22, { filter: 'lowpass', freq: 260, vol: 0.22 }); this.tone(60, t, 0.2, { type: 'triangle', slide: 48, vol: 0.12 }); break;
      case 'dart': this.tone(1250, t, 0.12, { type: 'triangle', slide: 380, vol: 0.12 }); this.noise(t, 0.06, { filter: 'highpass', freq: 4200, vol: 0.1 }); break;
      case 'squawk': this.tone(760, t, 0.16, { type: 'sawtooth', slide: 420, vol: 0.09 }); this.tone(820, t + 0.15, 0.22, { type: 'sawtooth', slide: 360, vol: 0.08 }); this.noise(t, 0.3, { filter: 'bandpass', freq: 1800, vol: 0.06 }); break;
      case 'tuck': this.tone(420, t, 0.09, { type: 'triangle', slide: 980, vol: 0.14 }); this.noise(t, 0.1, { filter: 'highpass', freq: 3000, vol: 0.06 }); break;   // the ground pound: curling up in the air
      case 'stompland': this.tone(170, t, 0.24, { type: 'sine', slide: 44, vol: 0.62 }); this.noise(t, 0.2, { filter: 'lowpass', freq: 750, vol: 0.5 }); this.noise(t + 0.01, 0.06, { freq: 2200, vol: 0.18 }); break;   // ...and landing: a thump and a crunch of earth
      case 'thud': this.tone(115, t, 0.26, { type: 'sine', slide: 42, vol: 0.42 }); this.noise(t, 0.2, { filter: 'lowpass', freq: 520, vol: 0.32 }); break;
      case 'snip': this.tone(1700, t, 0.04, { type: 'square', vol: 0.06 }); this.tone(1300, t + 0.05, 0.04, { type: 'square', vol: 0.05 }); this.noise(t, 0.05, { filter: 'highpass', freq: 6000, vol: 0.08 }); break;
      case 'leap': this.noise(t, 0.34, { filter: 'bandpass', freq: 1100, vol: 0.26 }); this.tone(260, t, 0.24, { type: 'triangle', slide: 820, vol: 0.12 }); break;
      case 'rustle': this.noise(t, 0.12, { filter: 'bandpass', freq: 2600, vol: 0.07 }); break;
      case 'splash': this.noise(t, 0.35, { filter: 'bandpass', freq: 1300, vol: 0.3 }); this.noise(t, 0.12, { filter: 'highpass', freq: 4000, vol: 0.1 }); this.tone(520, t, 0.16, { type: 'sine', slide: 180, vol: 0.12 }); break;
      // a third of a second of rain: a soft hiss under a patter of tiny droplet plinks (played back to back)
      case 'rain':
        this.noise(t, 0.38, { filter: 'highpass', freq: 6000, vol: 0.035 });
        this.noise(t, 0.38, { filter: 'bandpass', freq: 2400, vol: 0.03 });
        for (let i = 0; i < 6; i++) { const f = 1800 + Math.random() * 2600; this.tone(f, t + Math.random() * 0.33, 0.035, { type: 'sine', slide: f * 0.55, vol: 0.025 + Math.random() * 0.03 }); }
        break;
      case 'blip': this.tone(880, t, 0.03, { type: 'square', vol: 0.025 }); break;   // dialogue typing
      // Eclipse Spire
      case 'glassOn': [1568, 2093, 2637].forEach((f, i) => this.tone(f, t + i * 0.04, 0.3, { type: 'sine', vol: 0.06 })); this.noise(t, 0.1, { filter: 'highpass', freq: 6000, vol: 0.04 }); break;
      case 'glassOff': this.tone(2093, t, 0.25, { type: 'sine', slide: 1046, vol: 0.06 }); this.noise(t, 0.2, { filter: 'highpass', freq: 5000, vol: 0.06 }); break;
      case 'rec': this.tone(1760, t, 0.05, { type: 'square', vol: 0.04 }); break;
      case 'grind': this.noise(t, 0.34, { filter: 'lowpass', freq: 420, vol: 0.26 }); this.tone(85, t, 0.3, { type: 'triangle', slide: 62, vol: 0.18 }); this.tone(1400, t + 0.3, 0.04, { type: 'square', vol: 0.05 }); break;
      case 'unseal': this.seq([392, 494, 587, 784, 988, 1175], 0.09, { type: 'triangle', vol: 0.18, dur: 0.6 }); this.tone(98, t, 1.2, { type: 'sine', vol: 0.2 }); break;
      case 'swallow': this.tone(220, t, 0.45, { type: 'sine', slide: 50, vol: 0.45 }); this.noise(t + 0.08, 0.45, { filter: 'lowpass', freq: 380, vol: 0.4 }); this.tone(90, t + 0.3, 0.4, { type: 'triangle', slide: 40, vol: 0.25 }); break;
      case 'gate': this.noise(t, 0.4, { filter: 'lowpass', freq: 600, vol: 0.2 }); for (let i = 0; i < 5; i++) this.tone(300 - i * 20, t + i * 0.07, 0.04, { type: 'square', vol: 0.04 }); break;
      case 'laugh': for (let i = 0; i < 5; i++) { this.tone(420 - i * 15, t + i * 0.11, 0.07, { type: 'sawtooth', vol: 0.05 }); this.tone(300 - i * 10, t + i * 0.13, 0.07, { type: 'triangle', vol: 0.06 }); } break;
      // Ember Citadel
      case 'ow': this.tone(1300, t, 0.09, { type: 'square', slide: 1900, vol: 0.05 }); this.noise(t, 0.12, { filter: 'highpass', freq: 3500, vol: 0.07 }); break;
      case 'creak': this.tone(110, t, 0.5, { type: 'sawtooth', slide: 150, vol: 0.09 }); this.tone(165, t + 0.25, 0.4, { type: 'sawtooth', slide: 120, vol: 0.07 }); this.noise(t, 0.4, { filter: 'bandpass', freq: 400, vol: 0.1 }); break;
      case 'burp':   // an absurdly long, wobbling belch with a little squeak at the end
        this.tone(92, t, 0.92, { type: 'triangle', slide: 42, vol: 0.3, sustain: true });
        for (let i = 0; i < 6; i++) this.tone(145 - i * 14 + (i % 2 ? 13 : 0), t + i * 0.12, 0.2, { type: 'square', slide: 68 - i * 5, vol: 0.12 });
        this.noise(t, 0.85, { filter: 'lowpass', freq: 380, vol: 0.22 });
        this.tone(210, t + 0.82, 0.16, { type: 'triangle', slide: 72, vol: 0.12 });
        break;
      case 'nom': this.tone(300, t, 0.07, { type: 'square', slide: 200, vol: 0.1 }); this.tone(280, t + 0.12, 0.07, { type: 'square', slide: 180, vol: 0.1 }); this.noise(t, 0.05, { freq: 800, vol: 0.12 }); this.noise(t + 0.12, 0.05, { freq: 800, vol: 0.12 }); break;
      case 'plop': this.tone(180, t, 0.12, { type: 'sine', slide: 520, vol: 0.25 }); this.noise(t, 0.08, { freq: 900, vol: 0.08 }); break;
      case 'flip': this.tone(520, t, 0.14, { type: 'triangle', slide: 1040, vol: 0.12 }); this.noise(t, 0.1, { filter: 'bandpass', freq: 1800, vol: 0.1 }); break;
      case 'toast': this.seq([784, 988, 1319], 0.06, { type: 'triangle', vol: 0.14, dur: 0.12 }); break;
      case 'spit': this.tone(140, t, 0.3, { type: 'sawtooth', slide: 600, vol: 0.14 }); this.noise(t, 0.3, { filter: 'bandpass', freq: 1200, vol: 0.3 }); break;
      case 'gulp': this.tone(320, t, 0.16, { type: 'triangle', slide: 110, vol: 0.26 }); this.tone(170, t + 0.08, 0.18, { type: 'sine', slide: 80, vol: 0.22 }); break;
      case 'podfire': this.noise(t, 0.3, { filter: 'lowpass', freq: 900, vol: 0.4 }); this.tone(110, t, 0.22, { type: 'triangle', slide: 460, vol: 0.26 }); this.tone(900, t, 0.1, { type: 'square', slide: 300, vol: 0.05 }); break;
      case 'drum': this.tone(96, t, 0.34, { type: 'sine', slide: 52, vol: 0.5 }); this.noise(t, 0.12, { filter: 'lowpass', freq: 700, vol: 0.3 }); this.tone(190, t, 0.08, { type: 'triangle', slide: 120, vol: 0.12 }); break;
      case 'vine': this.noise(t, 0.06, { filter: 'highpass', freq: 3000, vol: 0.07 }); this.tone(480, t, 0.08, { type: 'triangle', slide: 720, vol: 0.12 }); break;
      case 'chatter': [988, 1175, 1047, 1319, 1175].forEach((f, i) => this.tone(f, t + i * 0.055, 0.05, { type: 'square', slide: f * 0.8, vol: 0.05 })); break;
      case 'tongue': this.tone(260, t, 0.12, { type: 'sawtooth', slide: 1300, vol: 0.07 }); this.noise(t, 0.1, { filter: 'bandpass', freq: 2600, vol: 0.1 }); break;
      case 'chomp': this.noise(t, 0.1, { filter: 'lowpass', freq: 900, vol: 0.32 }); this.tone(240, t, 0.08, { type: 'square', slide: 90, vol: 0.09 }); break;
      case 'vegcrunch':   // crisp celery fibres snapping, followed by a short, coarse crush
        this.noise(t, 0.035, { filter: 'highpass', freq: 2600 + Math.random() * 900, vol: 0.22 });
        this.noise(t + 0.018, 0.075, { filter: 'bandpass', freq: 1500 + Math.random() * 700, vol: 0.25 });
        this.noise(t + 0.055, 0.045, { filter: 'highpass', freq: 3400, vol: 0.12 });
        this.noise(t + 0.025, 0.1, { filter: 'lowpass', freq: 650, vol: 0.14 });
        break;
      case 'bell': this.tone(880, t, 1.1, { type: 'sine', vol: 0.18 }); this.tone(1320, t, 0.8, { type: 'sine', vol: 0.08 }); this.tone(2217, t, 0.4, { type: 'triangle', vol: 0.04 }); break;
      // Midnight Clockworks
      case 'cuckoo':   // two hollow wooden-whistle notes, high then low: coo-koo
        this.tone(740, t, 0.2, { type: 'sine', vol: 0.2, attack: 0.02 }); this.tone(1480, t, 0.12, { type: 'triangle', vol: 0.03 });
        this.tone(587, t + 0.24, 0.32, { type: 'sine', vol: 0.2, attack: 0.02 }); this.tone(1174, t + 0.24, 0.16, { type: 'triangle', vol: 0.03 });
        this.noise(t, 0.05, { filter: 'bandpass', freq: 1800, vol: 0.05 }); this.noise(t + 0.24, 0.05, { filter: 'bandpass', freq: 1500, vol: 0.05 });
        break;
      case 'ring': for (let i = 0; i < 12; i++) { this.tone(i % 2 ? 2489 : 2217, t + i * 0.028, 0.03, { type: 'square', vol: 0.045 }); } this.noise(t, 0.34, { filter: 'bandpass', freq: 4200, vol: 0.06 }); break;
      case 'snooze': this.tone(520, t, 0.12, { type: 'square', vol: 0.06 }); this.tone(330, t + 0.1, 0.5, { type: 'triangle', slide: 160, vol: 0.14 }); this.noise(t + 0.15, 0.4, { filter: 'lowpass', freq: 500, vol: 0.08 }); break;
      case 'windup': for (let i = 0; i < 5; i++) { this.noise(t + i * 0.045, 0.02, { filter: 'highpass', freq: 5000, vol: 0.12 }); this.tone(1900 + i * 60, t + i * 0.045, 0.015, { type: 'square', vol: 0.04 }); } break;
      case 'zip': this.tone(400, t, 0.28, { type: 'sawtooth', slide: 1500, vol: 0.05 }); this.noise(t, 0.2, { filter: 'bandpass', freq: 3000, vol: 0.05 }); break;
      case 'toot': for (const d of [0, 0.32]) { this.tone(587, t + d, 0.26, { type: 'square', vol: 0.05, sustain: true }); this.tone(740, t + d, 0.26, { type: 'square', vol: 0.04, sustain: true }); this.tone(880, t + d, 0.26, { type: 'triangle', vol: 0.06, sustain: true }); this.noise(t + d, 0.26, { filter: 'bandpass', freq: 2400, vol: 0.05 }); } break;
      case 'chuff': this.noise(t, 0.14, { filter: 'bandpass', freq: 700, vol: 0.13 }); break;
      case 'pop': this.tone(220, t, 0.14, { type: 'triangle', slide: 1300, vol: 0.28 }); this.noise(t, 0.07, { freq: 2600, vol: 0.18 }); this.tone(1175, t + 0.1, 0.2, { type: 'sine', vol: 0.1 }); break;
      case 'tock': this.tone(1050, t, 0.03, { type: 'square', vol: 0.05 }); this.noise(t, 0.025, { filter: 'highpass', freq: 5000, vol: 0.06 }); break;
      case 'timeStop':   // everything winds down to a halt
        this.tone(1400, t, 0.9, { type: 'sawtooth', slide: 70, vol: 0.08 }); this.tone(700, t, 0.9, { type: 'triangle', slide: 40, vol: 0.14 });
        this.noise(t, 0.8, { filter: 'bandpass', freq: 500, vol: 0.18 }); this.tone(55, t + 0.5, 0.9, { type: 'sine', vol: 0.3 });
        break;
      case 'timeGo': this.tone(70, t, 0.5, { type: 'sawtooth', slide: 1400, vol: 0.07 }); this.tone(140, t, 0.5, { type: 'triangle', slide: 1800, vol: 0.12 }); this.noise(t + 0.3, 0.3, { filter: 'highpass', freq: 3000, vol: 0.08 }); break;
      // Bayou Boogie
      case 'snore': this.noise(t, 0.5, { filter: 'lowpass', freq: 380, vol: 0.12 }); this.tone(70, t, 0.5, { type: 'sawtooth', slide: 90, vol: 0.05, attack: 0.25 }); this.noise(t + 0.55, 0.35, { filter: 'bandpass', freq: 1800, vol: 0.03 }); break;
      case 'tss': this.noise(t + 0.06, 0.5, { filter: 'highpass', freq: 5600, vol: 0.09 }); this.noise(t + 0.06, 0.08, { filter: 'bandpass', freq: 3200, vol: 0.06 }); break;
      case 'tom': this.tone(170, t, 0.16, { type: 'sine', slide: 110, vol: 0.26 }); this.noise(t, 0.04, { filter: 'lowpass', freq: 900, vol: 0.1 }); break;
      case 'whine': this.tone(1700, t, 0.35, { type: 'sawtooth', slide: 2300, vol: 0.022 }); this.tone(1740, t, 0.35, { type: 'square', slide: 2240, vol: 0.012 }); break;
      case 'shutter': this.noise(t, 0.03, { filter: 'bandpass', freq: 900, vol: 0.12 }); this.tone(140, t, 0.03, { type: 'square', vol: 0.03 }); break;
      case 'shutterOpen': this.tone(220, t, 0.18, { type: 'sawtooth', slide: 330, vol: 0.06 }); this.noise(t + 0.12, 0.08, { filter: 'bandpass', freq: 700, vol: 0.3 }); this.tone(90, t + 0.12, 0.12, { type: 'sine', vol: 0.3 }); break;
      case 'shutterSlam': this.noise(t, 0.12, { filter: 'lowpass', freq: 800, vol: 0.45 }); this.tone(80, t, 0.14, { type: 'sine', slide: 50, vol: 0.4 }); this.noise(t + 0.05, 0.04, { filter: 'bandpass', freq: 2500, vol: 0.1 }); break;
      // the band flubs a note when Chickaroo gets hurt: a sour, squawking cluster
      case 'flub': for (const [f, d] of [[233, 0], [247, 0.01], [311, 0.02]]) this.tone(f, t + d, 0.28, { type: 'sawtooth', slide: f * 0.9, vol: 0.05 }); this.noise(t, 0.1, { filter: 'bandpass', freq: 600, vol: 0.12 }); break;
      // ...and plays him out with the saddest trombone in the bayou: wah, wah, wah, wahhhh
      case 'sadTrombone':
        [[233, 0], [220, 0.42], [208, 0.84]].forEach(([f, d]) => { this.tone(f, t + d, 0.38, { type: 'sawtooth', slide: f * 0.97, vol: 0.06, attack: 0.04 }); this.tone(f, t + d, 0.38, { type: 'triangle', vol: 0.16, attack: 0.04 }); });
        for (let k = 0; k < 8; k++) { const f = 196 * (k % 2 ? 0.985 : 1.015); this.tone(f, t + 1.26 + k * 0.13, 0.15, { type: 'sawtooth', slide: f * (k % 2 ? 1.03 : 0.97), vol: 0.06 * (1 - k / 10), attack: 0.02 }); this.tone(f, t + 1.26 + k * 0.13, 0.15, { type: 'triangle', vol: 0.15 * (1 - k / 10), attack: 0.02 }); }
        break;
      case 'sproing': this.tone(160, t, 0.12, { type: 'triangle', slide: 700, vol: 0.2 }); this.tone(700, t + 0.12, 0.12, { type: 'triangle', slide: 300, vol: 0.14 }); this.tone(300, t + 0.24, 0.16, { type: 'triangle', slide: 520, vol: 0.08 }); break;
    }
  },
};

const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midiOf = n => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12; };
const freqOf = midi => 440 * Math.pow(2, (midi - 69) / 12);

/* Songs: `mel` is "NOTE:eighths" tokens ('R' = rest, '|' = bar line for readability).
   `bass` is one root note per 8-eighth bar, expanded with `bassPat` (semitone offsets).
   `drums` is an 8-step pattern per bar: k = kick, s = snare, h = hat. */
const SONGS = {
  meadow: {
    bpm: 150, lead: 'sq', drums: 'k.h.s.hh', bassPat: [0, 7, 12, 7],
    mel: 'C5 E5 G5 E5 A5:2 G5:2 | F5 E5 D5 E5 C5:4 | D5 F5 A5 F5 B5:2 A5:2 | G5 F5 E5 D5 G4:4 |' +
         'C5 E5 G5 C6 B5:2 A5:2 | G5 A5 F5 D5 E5:4 | F5:2 A5:2 G5 F5 E5 D5 | C5:2 G4 C5 R:4 |' +
         'E5:2 E5 F5 G5:2 E5:2 | F5:2 F5 G5 A5:4 | G5:2 G5 A5 B5:2 G5:2 | C6:6 R:2 |' +
         'A5 G5 F5 E5 F5:2 D5:2 | G5 F5 E5 D5 E5:2 C5:2 | D5 E5 F5 D5 G5:2 B4:2 | C5:6 R:2',
    bass: ['C3', 'C3', 'D3', 'G2', 'C3', 'A2', 'F2', 'C3', 'C3', 'F2', 'G2', 'C3', 'F2', 'C3', 'G2', 'C3'],
  },
  cave: {
    bpm: 112, lead: 'pl', drums: 'k...s..h', bassPat: [0, 12, 7, 12],
    mel: 'A4:2 C5 E5 A5:2 G5:2 | E5:2 D5 C5 D5:4 | F4:2 A4 C5 F5:2 E5:2 | D5:2 C5 B4 E5:4 |' +
         'A4 B4 C5 D5 E5:2 A5:2 | G5 F5 E5 D5 C5:4 | D5:2 F5:2 E5:2 C5:2 | B4:2 G#4:2 A4:4',
    bass: ['A2', 'A2', 'F2', 'E2', 'A2', 'C3', 'D3', 'E2'],
  },
  citadel: {
    bpm: 168, lead: 'sq', drums: 'khskkhsh', bassPat: [0, 12, 0, 12, 0, 12, 0, 12],
    mel: 'D5 R D5 F5 A5:2 F5:2 | G5 F5 E5 F5 D5:4 | A#4 R A#4 D5 F5:2 D5:2 | E5 D5 C#5 D5 A4:4 |' +
         'D5 F5 A5 D6 C6:2 A5:2 | A#5 A5 G5 F5 E5:4 | F5 G5 A5 A#5 A5:2 G5:2 | F5 E5 C#5 E5 D5:4',
    bass: ['D2', 'D2', 'A#1', 'A1', 'D2', 'G2', 'F2', 'A1'],
  },
  // Cloudtop: a breezy, open tune in F major on the plucked lead.
  sky: {
    bpm: 136, lead: 'pl', drums: 'k..hk.s.', bassPat: [0, 7, 12, 7],
    mel: 'F5:2 A5 C6 A5:2 G5 F5 | E5:2 G5 C6 G5:4 | D5:2 F5 A5 D6:2 C6 A5 | A#5:2 A5 G5 C5:4 |' +
         'F5 G5 A5 C6 D6:2 C6:2 | A#5 A5 G5 A5 F5:4 | G5 A5 A#5 D6 C6:2 A5:2 | G5:2 E5:2 F5:4',
    bass: ['F2', 'C3', 'D3', 'A#2', 'F2', 'A#2', 'G2', 'C3'],
  },
  // Frostwind Peaks: a crisp, chiming tune in E minor.
  snow: {
    bpm: 118, lead: 'pl', drums: 'k..h..h.', bassPat: [0, 7, 12, 7],
    mel: 'E5:2 G5 B5 E6:2 D6 B5 | C6:2 B5 A5 G5:4 | A5:2 C6 E6 D6:2 B5 G5 | F#5:2 A5 B5 B4:4 |' +
         'E5 F#5 G5 A5 B5:2 E6:2 | D6 C6 B5 A5 G5:4 | A5 B5 C6 A5 B5:2 F#5:2 | E5:6 R:2',
    bass: ['E2', 'C3', 'A2', 'B2', 'E2', 'G2', 'A2', 'E2'],
  },
  // Coral Deep: a slow, flowing tune in G major on the echoing pluck.
  ocean: {
    bpm: 104, lead: 'pl', drums: 'k...h..h', bassPat: [0, 7, 12, 7],
    mel: 'B4 D5 G5:2 F#5 E5 D5:2 | E5 G5 C6:2 B5 A5 G5:2 | A5:2 F#5 D5 E5:2 F#5 G5 | A5:6 R:2 |' +
         'B4 D5 G5:2 A5 B5 C6:2 | B5 A5 G5:2 E5 F#5 G5:2 | A5 B5 A5 G5 F#5:2 D5:2 | G5:6 R:2',
    bass: ['G2', 'C3', 'D3', 'D3', 'G2', 'E2', 'D2', 'G2'],
  },
  // Midnight Clockworks: a music-box waltz-ish tune in D minor over a tick-tock beat.
  clock: {
    bpm: 120, lead: 'pl', drums: 'k..hs..h', bassPat: [0, 7, 12, 7],
    mel: 'D5 F5 A5 D6 C6 A5 F5 A5 | A#5:2 A5 G5 A5:4 | G5 A#5 D6 A#5 A5 F5 D5 F5 | E5:2 C#5 E5 A5:4 |' +
         'D6 C6 A#5 A5 G5:2 A#5:2 | A5 G5 F5 E5 F5:4 | G5 F5 E5 D5 C#5:2 E5:2 | D5:6 R:2',
    bass: ['D3', 'A#2', 'G2', 'A2', 'A#2', 'F2', 'A2', 'D3'],
  },
  // Eclipse Spire: a hushed, uneasy pluck in B minor that leans on its leading tone.
  eclipse: {
    bpm: 100, lead: 'pl', drums: 'k...h.s.', bassPat: [0, 7, 12, 7],
    mel: 'B4:2 D5 F#5 B5:2 A5 F#5 | G5:2 F#5 E5 F#5:4 | E5:2 G5 B5 E6:2 D6 B5 | C#6:2 B5 A#5 B5:4 |' +
         'D6 C#6 B5 A5 G5:2 B5:2 | F#5 E5 D5 C#5 D5:4 | E5 F#5 G5 E5 A#5:2 C#6:2 | B5:6 R:2',
    bass: ['B2', 'G2', 'E2', 'F#2', 'G2', 'D3', 'F#2', 'B2'],
  },
  // UMBRAROO: a driving C minor chase with a sharpened fourth that never quite settles.
  umbra: {
    bpm: 160, lead: 'sq', drums: 'k.hsk.hs', bassPat: [0, 12, 0, 12, 0, 12, 0, 12],
    mel: 'C5 R C5 D#5 G5:2 F#5:2 | G5 D#5 D5 C5 B4:4 | G#4 R G#4 C5 D#5:2 D5:2 | C5 B4 G4 B4 D5:4 |' +
         'C6 B5 G5 F#5 G5:2 D#5:2 | F5 D#5 D5 C5 D5:4 | D#5 F5 G5 G#5 B5:2 D6:2 | C6:2 G5 D#5 C5:4',
    bass: ['C2', 'C2', 'G#1', 'G1', 'C2', 'F2', 'G1', 'C2'],
  },
  // Sunscorch Dunes: a sly, swaying tune in E Phrygian dominant (that bright G# over a flat second) on a
  // plucked 'oud', over a doum-tek hand-drum pattern (k = doum, t = tek).
  desert: {
    bpm: 140, lead: 'ou', drums: 'kt.tk.t.', bassPat: [0, 12, 7, 12],
    mel: 'E5 F5 G#5 A5 B5:2 A5 G#5 | A5 G#5 F5 E5 F5:2 E5:2 | E5 F5 G#5 B5 C6:2 B5 A5 | G#5:2 F5 G#5 E5:4 |' +
         'A5 B5 C6 D6 E6:2 D6 C6 | B5 C6 B5 A5 G#5:4 | A5 G#5 F5 G#5 A5:2 B5 G#5 | F5:2 G#5 F5 E5:4 |' +
         'E4 R E4 F4 G#4 A4 B4 C5 | B4:2 A4 G#4 A4:4 | A4 R A4 B4 C5 D5 E5 F5 | E5:2 D5 C5 B4:4 |' +
         'C5 D5 E5 F5 G#5:2 F5 E5 | F5 E5 D5 C5 B4:2 G#4:2 | A4 B4 C5 B4 A4:2 G#4 F4 | E4:6 R:2',
    bass: ['E2', 'F2', 'E2', 'E2', 'A2', 'E2', 'D2', 'E2', 'E2', 'A2', 'A2', 'C3', 'F2', 'D2', 'A2', 'E2'],
  },
  // Monsoon Jungle: a bouncy marimba tune in D Dorian over conga and shaker, with a call-and-response
  // middle section down low.
  jungle: {
    bpm: 132, lead: 'mb', drums: 'k.c.kct.', bassPat: [0, 7, 12, 7],
    mel: 'D5 F5 G5 A5 C6:2 A5 G5 | A5 G5 F5 D5 F5:2 D5:2 | C5 D5 F5 G5 A5:2 G5 F5 | G5:2 F5 D5 C5:4 |' +
         'D5 F5 G5 A5 C6:2 D6 C6 | A5 C6 A5 G5 A5:2 F5:2 | G5 A5 G5 F5 D5:2 C5 D5 | D5:6 R:2 |' +
         'A4 R A4 C5 D5 R C5 A4 | G4:2 A4 C5 D5:4 | F5 R F5 G5 A5 R G5 F5 | D5:2 C5 A4 G4:4 |' +
         'A4 C5 D5 F5 G5:2 A5:2 | C6 A5 G5 F5 G5:4 | A5 G5 F5 D5 C5:2 A4 C5 | D5:6 R:2',
    bass: ['D3', 'D3', 'C3', 'C3', 'D3', 'F2', 'C3', 'D3', 'A2', 'G2', 'F2', 'G2', 'A2', 'C3', 'C3', 'D3'],
  },
  // The Gumbo Fever Dream: a Cajun two-step in D on the accordion over a rubboard (r), a jaunty A part, then a
  // feverish B part that slips into B minor before finding its way home
  gumbo: {
    bpm: 152, lead: 'ac', drums: 'k.rsk.rs', bassPat: [0, 7, 12, 7],
    mel: 'D5 E5 F#5 A5 B5:2 A5:2 | F#5 E5 D5 E5 F#5:4 | G5 F#5 E5 D5 E5:2 B4:2 | C#5 D5 E5 F#5 E5:4 |' +
         'D5 E5 F#5 A5 D6:2 B5:2 | A5 F#5 A5 B5 A5:2 F#5:2 | G5 F#5 E5 C#5 E5:2 A4:2 | D5:6 R:2 |' +
         'B4 D5 F#5 B5 A5:2 F#5:2 | G5:2 F#5 E5 F#5:4 | E5 G5 B5 E6 D6:2 B5:2 | C#6 B5 A5 G5 A5:4 |' +
         'D6 C#6 B5 A5 G5:2 F#5:2 | E5 F#5 G5 E5 F#5:2 D5:2 | E5 F#5 G5 A5 B5:2 C#6:2 | D6:6 R:2',
    bass: ['D3', 'D3', 'G2', 'A2', 'D3', 'D3', 'A2', 'D3', 'B2', 'G2', 'E2', 'A2', 'B2', 'E2', 'A2', 'D3'],
  },
  title: null, // filled below (meadow at a gentler tempo)
  // Level clear: a bright rising fanfare in D major, resolving onto a long D.
  clear: {
    bpm: 150, lead: 'sq', loop: false, bassPat: [0, 7, 12, 7],
    mel: 'D5 F#5 A5 D6:2 A5 F#5 A5 | G5 B5 D6 G6:2 F#6 E6 D6 | E6:2 D6 C#6 D6:2 B5:2 | A5 B5 C#6 A5 D6:4',
    bass: ['D3', 'G3', 'A2', 'D3'],
  },
  // Game over: "Taps" on a lone, solemn bugle -- way too dramatic, which is the joke.
  gameover: {
    bpm: 66, lead: 'sq', loop: true,
    mel: 'G4:1.5 G4:0.5 C5:6 | G4:1.5 C5:0.5 E5:6 | G4:1 C5:1 E5:3 G4:1 C5:1 E5:3 G4:1 C5:1 E5:6 | C5:1.5 E5:0.5 G5:5 E5:1.5 C5:1.5 G4:4 | G4:1.5 G4:0.5 C5:10',
  },
};
SONGS.title = Object.assign({}, SONGS.meadow, { bpm: 128, drums: 'k...s...' });
// A long Taps cycle, with breathing room after each complete performance. The last note decays
// fully into each rest, including across the loop boundary, so there is no abrupt restart.
const taps = SONGS.gameover.mel;
SONGS.gameover.mel = [
  taps + ' R:6',
  taps.replace('C5:10', 'C5:12') + ' R:8',
  taps.replace('C5:10', 'C5:14') + ' R:5',
  taps.replace('C5:10', 'C5:12') + ' R:7',
].join(' | ');

const songCache = new Map();
function compileSong(name) {
  if (songCache.has(name)) return songCache.get(name);
  const def = SONGS[name];
  const ev = [];
  let len = 0;
  if (def.mel) {
    let t = 0;
    for (const tok of def.mel.split(/[\s|]+/)) {
      if (!tok) continue;
      const [n, d] = tok.split(':');
      const dur = d ? parseFloat(d) : 1;
      if (n !== 'R') ev.push({ t, f: freqOf(midiOf(n)), d: dur, i: def.lead || 'sq' });
      t += dur;
    }
    len = Math.max(len, t);
  }
  if (def.bass) {
    const step = 8 / def.bassPat.length;
    let t = 0;
    for (const root of def.bass) {
      const m = midiOf(root);
      for (const iv of def.bassPat) { ev.push({ t, f: freqOf(m + iv), d: step * 0.9, i: 'tri' }); t += step; }
    }
    len = Math.max(len, t);
  }
  if (def.drums) {
    const bars = Math.round(len / 8);
    for (let b = 0; b < bars; b++) for (let k = 0; k < 8; k++) {
      const ch = def.drums[k];
      if (ch !== '.') ev.push({ t: b * 8 + k, d: 1, i: ch });
    }
  }
  ev.sort((a, b) => a.t - b.t);
  const song = { ev, len, spe: 60 / def.bpm / 2, loop: def.loop !== false };
  songCache.set(name, song);
  return song;
}

// Songs composed outside the game: name → [mp3, alt mp3]. They fade in, fade out before the end, then loop.
// A level may list two tracks (main + alt); one is picked at random.
const MUSIC_FILES = {
  meadow: ['music/1-1.mp3'],
  title: ['music/titlescreenmusic.mp3'],   // the title screen's own theme
  cave: ['music/1-2.mp3', 'music/1-2alt.mp3'],
  sky: ['music/1-3.mp3'],
  citadel: ['music/1-4.mp3'],
  ocean: ['music/2-1.mp3'],
  snow: ['music/2-2.mp3'],
  clock: ['music/2-3.mp3'],
  eclipse: ['music/2-4.mp3'],
  desert: ['music/3-1.mp3'],
  jungle: ['music/3-2.mp3'],
  bayou: ['music/3-3.mp3'],   // 3-3: plays instead of the synthesised live band (whose clock still runs the stage)
  gut: ['music/3-4.mp3'],     // 3-4 GUT FEELING
  gumbo: ['music/4-1.mp3'],   // 4-1 GUMBO FEVER (it starts once he drops out of the bedroom into the dream)
  // the boss fights' own tracks: they take over when the fight starts (Game.startBossMusic; a stage's `bossMusic`)
  boss14: ['music/bossmusic1-4.mp3'],   // MAGMAW
  boss24: ['music/bossmusic2-4.mp3'],   // EVIL UMBRAROO
  boss34: ['music/bossmusic3-4.mp3'],   // CLOACOLITH
};
const MUSIC_FADE_IN = 2.0, MUSIC_FADE_OUT = 3.0;

const Music = {
  want: null, song: null, gain: null, start: 0, idx: 0, loop: 0, rate: 1, el: null,
  duck: 0,   // 0..1: how far an mp3 is dipped (3-3's MAMA HUSH silences)
  play(name, rate = 1, at = 0) {
    if (this.el && this.fileName === name && !this.suspended) return;   // mp3 already playing: keep it going (no restart, no speed change)
    this.stop();
    this.want = { name, rate, at };
  },
  // Remember which mp3 track was playing and how far in, so the level's restart after a death can
  // carry on from the same spot (see Game.startLevel).
  remember(level) {
    this.memo = this.el && this.fileName ? { level, name: this.fileName, idx: this.picked[this.fileName], pos: this.el.currentTime } : null;
  },
  // Pause menu: an mp3 track keeps its place; generated music just stops.
  pause() {
    if (this.el) { this.el.pause(); this.suspended = true; } else this.stop();
  },
  resume(name, rate = 1) {
    if (this.el && this.suspended) {
      this.suspended = false; this.rampStart = performance.now();
      this.el.play().catch(() => {});
    } else this.play(name, rate);
  },
  stop() {
    if (typeof BandAudio !== 'undefined') BandAudio.stop();   // (3-3's live band stops with the music)
    this.suspended = false; this.rampStart = 0; this.duck = 0;
    if (this.el) {
      const el = this.el, v0 = el.volume;
      this.el = null;
      let n = 0;
      const iv = setInterval(() => {
        el.volume = Math.max(0, v0 * (1 - ++n / 10));
        if (n >= 10) { clearInterval(iv); el.pause(); el.removeAttribute('src'); el.load(); }
      }, 30);
    }
    if (this.gain && Sound.ctx) {
      const g = this.gain;
      g.gain.setTargetAtTime(0, Sound.ctx.currentTime, 0.03);
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* already gone */ } }, 500);
    }
    this.gain = null; this.song = null; this.want = null;
  },
  suspended: false, rampStart: 0,
  picked: Object.create(null),
  shuffle(name) { delete this.picked[name]; },        // next play() of this song re-rolls main/alt
  trackFor(name) {
    const list = MUSIC_FILES[name];
    return list[this.picked[name] ?? (this.picked[name] = Math.floor(Math.random() * list.length))];
  },
  beginFile(w) {
    this.fileName = w.name;
    const el = this.el = new Audio(this.trackFor(w.name));
    // mp3 tracks always play at normal speed (no hurry-up / boss speed-up)
    el.volume = 0;
    if (w.at > 0) {                                       // resume part-way through (after a death)
      el.addEventListener('loadedmetadata', () => { try { el.currentTime = Math.min(w.at, Math.max(0, el.duration - 4)); } catch (e) { /* not seekable */ } }, { once: true });
      this.rampStart = performance.now();
    }
    el.addEventListener('ended', () => {
      if (this.el !== el) return;
      this.shuffle(w.name);                             // new roll each loop: main or alt
      el.src = this.trackFor(w.name);
      el.play().catch(() => {});
    });
    el.play().catch(() => {});
  },
  updateFile() {
    const el = this.el;
    if (!el || el.paused || !isFinite(el.duration)) return;
    const t = el.currentTime, left = (el.duration - t) / el.playbackRate;
    let f = Math.min(1, t / MUSIC_FADE_IN, left / MUSIC_FADE_OUT);
    f = Math.max(0, f); f = f * f * (3 - 2 * f);              // smoothstep
    if (this.rampStart) f *= Math.min(1, (performance.now() - this.rampStart) / 500);   // ease back in after a pause
    el.volume = Sound.muted ? 0 : Math.min(1, f * Sound.musicGain() * (1 - this.duck));
  },
  begin() {
    const w = this.want;
    this.song = compileSong(w.name);
    this.rate = w.rate;
    this.gain = Sound.ctx.createGain();
    this.gain.connect(Sound.music);
    this.start = Sound.ctx.currentTime + 0.08;
    this.idx = 0; this.loop = 0;
  },
  update() {
    const ctx = Sound.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.el) { this.updateFile(); return; }
    if (this.want && MUSIC_FILES[this.want.name]) { this.beginFile(this.want); this.want = null; return; }
    if (this.want && !this.song) this.begin();
    const s = this.song;
    if (!s || !s.ev.length) return;
    const spe = s.spe / this.rate, now = ctx.currentTime, ahead = now + 0.2;
    for (let guard = 0; guard < 512; guard++) {
      const e = s.ev[this.idx];
      let time = this.start + (this.loop * s.len + e.t) * spe;
      if (time < now - 0.25) { this.start += now + 0.05 - time; time = now + 0.05; } // tab was hidden: resync
      if (time > ahead) break;
      this.note(e, time, spe);
      if (++this.idx >= s.ev.length) {
        this.idx = 0; this.loop++;
        if (!s.loop) { this.song = null; this.want = null; break; }
      }
    }
  },
  note(e, time, spe) {
    const dur = e.d * spe, bus = this.gain;
    switch (e.i) {
      case 'sq': Sound.tone(e.f, time, dur * 0.95, { type: 'square', vol: 0.05, sustain: true, bus }); break;
      case 'pl':
        Sound.tone(e.f, time, Math.max(0.25, dur), { type: 'triangle', vol: 0.2, bus });
        Sound.tone(e.f * 2, time, 0.12, { type: 'square', vol: 0.02, bus });
        Sound.tone(e.f, time + 0.27, Math.max(0.25, dur), { type: 'triangle', vol: 0.07, bus });
        break;
      case 'tri': Sound.tone(e.f, time, dur, { type: 'triangle', vol: 0.17, sustain: true, bus }); break;
      case 'k': Sound.tone(150, time, 0.12, { type: 'sine', slide: 45, vol: 0.32, bus }); break;
      case 's': Sound.noise(time, 0.09, { filter: 'bandpass', freq: 1800, vol: 0.13, bus }); break;
      case 'h': Sound.noise(time, 0.03, { filter: 'highpass', freq: 7000, vol: 0.06, bus }); break;
      case 't': Sound.noise(time, 0.05, { filter: 'bandpass', freq: 3400, vol: 0.11, bus }); Sound.tone(780, time, 0.03, { type: 'sine', vol: 0.04, bus }); break;
      case 'mb': {  // marimba: a woody sine strike with a bright overtone; long notes are rolled
        const n = Math.max(1, Math.min(6, Math.floor(dur / 0.13)));
        for (let k = 0; k < n; k++) {
          const tt = time + k * 0.13, v = k ? 0.08 : 0.17;
          Sound.tone(e.f, tt, 0.24, { type: 'sine', vol: v, bus });
          Sound.tone(e.f * 4, tt, 0.04, { type: 'sine', vol: v * 0.2, bus });
        }
        Sound.tone(e.f * 2, time, 0.09, { type: 'triangle', vol: 0.03, bus });
        break;
      }
      case 'c': Sound.tone(250, time, 0.12, { type: 'sine', slide: 185, vol: 0.2, bus }); Sound.noise(time, 0.03, { filter: 'bandpass', freq: 900, vol: 0.05, bus }); break;
      case 'fd': {   // a bowed fiddle: two saws a hair apart swelling in, over a round triangle body
        const sw = Math.min(0.1, dur * 0.4), len = Math.max(0.22, dur);
        Sound.tone(e.f, time, len, { type: 'sawtooth', vol: 0.03, attack: sw, sustain: true, bus });
        Sound.tone(e.f * 1.007, time, len, { type: 'sawtooth', vol: 0.022, attack: sw, sustain: true, bus });
        Sound.tone(e.f, time, len, { type: 'triangle', vol: 0.11, attack: sw, sustain: true, bus });
        break;
      }
      case 'sd':   // steel drum: a ringing sine with bright metallic partials that die away fast
        Sound.tone(e.f, time, Math.max(0.3, dur), { type: 'sine', vol: 0.15, bus });
        Sound.tone(e.f * 2, time, 0.16, { type: 'sine', vol: 0.06, bus });
        Sound.tone(e.f * 3.02, time, 0.07, { type: 'triangle', vol: 0.03, bus });
        break;
      case 'tb':   // a tuba-ish oompah: buzzy saw over a round body, swelling in
        Sound.tone(e.f, time, Math.max(0.2, dur * 0.9), { type: 'sawtooth', vol: 0.035, attack: 0.03, sustain: true, bus });
        Sound.tone(e.f, time, Math.max(0.2, dur * 0.9), { type: 'triangle', vol: 0.15, attack: 0.02, sustain: true, bus });
        break;
      case 'ac': {   // accordion: two reeds a hair apart (square + saw) breathing in together, a soft reed an octave down
        const len = Math.max(0.12, dur * 0.92);
        Sound.tone(e.f, time, len, { type: 'square', vol: 0.028, attack: 0.02, sustain: true, bus });
        Sound.tone(e.f * 1.006, time, len, { type: 'sawtooth', vol: 0.02, attack: 0.02, sustain: true, bus });
        Sound.tone(e.f * 0.5, time, len, { type: 'triangle', vol: 0.06, attack: 0.02, sustain: true, bus });
        break;
      }
      case 'r':   // rubboard: two quick scrapes down the washboard
        Sound.noise(time, 0.05, { filter: 'bandpass', freq: 4200, vol: 0.08, bus });
        Sound.noise(time + 0.04, 0.04, { filter: 'bandpass', freq: 5600, vol: 0.05, bus });
        break;
      case 'ou':   // oud-ish pluck: a bright saw attack over a round triangle body, with a soft octave echo
        Sound.tone(e.f, time, Math.max(0.16, dur * 0.8), { type: 'sawtooth', vol: 0.03, bus });
        Sound.tone(e.f, time, Math.max(0.22, dur), { type: 'triangle', vol: 0.16, bus });
        Sound.tone(e.f * 2, time + 0.2, 0.14, { type: 'triangle', vol: 0.035, bus });
        break;
    }
  },
};

