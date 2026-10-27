'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-3 BAYOU BOOGIE: the live band
// ═══════════════════════════════════════════════════════════════════════════
// The stage has no recorded soundtrack. At first there are only the crickets; every musician
// Chickaroo wakes up joins the parade behind him and adds his part (drums, tuba, trumpet), and the
// bayou itself plays along: drums launch on their hits, tuba valves pump to the bass line, the
// trumpet's notes become a bridge. So the music and the game share one clock, `band.f` (frames
// since the stage started), and everything here is in whole frames:
//   an eighth note is BAND_SPF ticks, a beat two eighths, a bar eight, the loop 8 bars. The clock ticks
//   BAND_TPS times a second -- a whole tick on most frames, now and then none -- which sets the tempo:
//   BAND_BPM (118, to match the stage's recorded track). At 60 ticks a second it would be 120.
const BAND_BPM = 118, BAND_SPF = 15, BAND_TPS = BAND_BPM / 120 * 60;   // (59 ticks a second)
const BAND_BEAT = 2 * BAND_SPF, BAND_BAR = 8 * BAND_SPF, BAND_LOOP_BARS = 8;
const BAND_LOOP = BAND_LOOP_BARS * 8;            // eighths in the loop
const BAND_SWING = 4;                            // ticks the off-beat eighths lag (a lazy swing)
const BAND_LOOK = 9;                             // ticks of audio scheduled ahead
// the trumpet tune: two 4-bar phrases over F | F | C7 | C7 || F | Bb | C7 | F ("NOTE:eighths")
const BAND_TUNE = [
  'C5:2 F5:2 A5:2 C6:2 | D6 C6 A5:2 F5:4 | E5:2 G5:2 Bb5:2 C6 Bb5 | A5 G5 E5:2 C5:4',
  'C5:2 F5:2 A5:2 C6:2 | D6:2 C6 Bb5 A5:2 F5:2 | G5:2 E5 G5 C6:2 E5:2 | F5:6 R:2',
];
// the tuba's oom-pah, one bar per string (quarter notes)
const BAND_TUBA = ['F2 C3 F2 C3', 'F2 C3 A2 E2', 'C2 G2 C2 G2', 'C2 G2 C3 E2', 'F2 C3 F2 C3', 'Bb1 F2 Bb1 F2', 'C2 G2 C2 E2', 'F2 C3 F2 C2'];
const BAND_LOW = midiOf('Bb1');                  // the tuba's lowest note (its valves' resting height)
SONGS.bayou = {};                                // (no backing track: Music stays silent and the band plays)

// The loop as a list of events { s: eighth in the loop, d: length in eighths, m: midi, i: instrument, part }
const BAND_SONG = (() => {
  const ev = [];
  const add = (part, i, s, d = 1, n = null) => ev.push({ part, i, s, d, m: n == null ? 0 : midiOf(n), f: n == null ? 0 : freqOf(midiOf(n)) });
  for (let bar = 0; bar < BAND_LOOP_BARS; bar++) {
    const b = bar * 8;
    // crickets: a little double chirp on 2 and 4
    add('crickets', 'cr', b + 2); add('crickets', 'cr', b + 6);
    // the parade drums: bass drum on 1 and 3, snare on 2 and 4, a swung hi-hat, a ghost note, a crash every 4 bars
    add('drums', 'bd', b); add('drums', 'bd', b + 4); add('drums', 'sn', b + 2); add('drums', 'sn', b + 6);
    for (const k of [1, 3, 5, 7]) add('drums', 'hh', b + k);
    if (bar % 2) add('drums', 'gh', b + 7);
    if (bar % 4 === 0) add('drums', 'cy', b);
    BAND_TUBA[bar].split(' ').forEach((n, k) => add('tuba', 'tb', b + k * 2, 2, n));
    // the crowd at the bandstand clap on 2 and 4
    add('claps', 'cl', b + 2); add('claps', 'cl', b + 6);
  }
  BAND_TUNE.forEach((phrase, k) => {
    let s = k * 32;
    for (const tok of phrase.split(/[\s|]+/)) {
      if (!tok) continue;
      const [n, d] = tok.split(':'), dur = d ? parseFloat(d) : 1;
      if (n !== 'R') add('trumpet', 'tp', s, dur, n);
      s += dur;
    }
  });
  return ev.sort((a, b) => a.s - b.s);
})();
const BAND_NOTES = BAND_SONG.filter(e => e.part === 'trumpet');
// frame (in the loop) an eighth falls on: the off-beats swing late
const bandStepFrame = s => s * BAND_SPF + (s % 2 ? BAND_SWING : 0);
// the tuba note sounding at loop eighth s (its midi)
const bandTubaAt = s => { const bar = Math.floor(s / 8) % BAND_LOOP_BARS; return midiOf(BAND_TUBA[bar].split(' ')[Math.floor((s % 8) / 2)]); };

// Schedules the band's notes on the music bus, a few frames ahead of the game clock. The audio is
// anchored to the game's frame count (re-anchored only if they drift apart), so what you hear is
// exactly what the platforms are doing.
const BandAudio = {
  bus: null, anchor: null, done: -1,
  start(f) {
    this.stop();
    this.done = f;
    if (!Sound.ctx) return;
    this.bus = Sound.ctx.createGain(); this.bus.gain.value = 1; this.bus.connect(Sound.music);
    this.anchor = null;
  },
  stop() {
    if (this.bus && Sound.ctx) {
      const g = this.bus;
      g.gain.setTargetAtTime(0, Sound.ctx.currentTime, 0.04);
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* already gone */ } }, 400);
    }
    this.bus = null; this.anchor = null;
  },
  // `band` is the game's band state; `on(part, frame)` says whether a part plays at that frame
  tick(band, on) {
    const ctx = Sound.ctx;
    if (!this.bus && ctx && ctx.state === 'running') this.start(band.f);
    const until = band.f + BAND_LOOK;
    if (!this.bus || !ctx || ctx.state !== 'running') { this.done = until; return; }
    const ideal = ctx.currentTime + 0.03 - band.f / BAND_TPS;
    if (this.anchor == null || Math.abs(this.anchor - ideal) > 0.06) this.anchor = ideal;   // (a hidden tab, a slow frame)
    for (let loop = Math.floor((this.done + 1) / (BAND_LOOP * BAND_SPF)); loop * BAND_LOOP * BAND_SPF <= until; loop++) {
      const base = loop * BAND_LOOP * BAND_SPF;
      for (const e of BAND_SONG) {
        const fr = base + bandStepFrame(e.s);
        if (fr <= this.done || fr > until || !on(e.part, fr)) continue;
        const t = this.anchor + fr / BAND_TPS;
        if (t >= ctx.currentTime) this.note(e, t);
      }
    }
    this.done = until;
  },
  note(e, t) {
    const bus = this.bus, dur = e.d * BAND_SPF / BAND_TPS, S = Sound;
    switch (e.i) {
      case 'cr': for (let k = 0; k < 3; k++) S.tone(4300 + (k % 2) * 220, t + k * 0.034, 0.024, { type: 'sine', vol: 0.025, bus }); break;
      case 'bd': S.tone(110, t, 0.26, { type: 'sine', slide: 42, vol: 0.42, bus }); S.noise(t, 0.06, { filter: 'lowpass', freq: 600, vol: 0.16, bus }); break;
      case 'sn': S.noise(t, 0.12, { filter: 'bandpass', freq: 2200, vol: 0.16, bus }); S.tone(230, t, 0.06, { type: 'triangle', slide: 170, vol: 0.08, bus }); break;
      case 'gh': S.noise(t, 0.05, { filter: 'bandpass', freq: 2400, vol: 0.05, bus }); break;
      case 'hh': S.noise(t, 0.03, { filter: 'highpass', freq: 7500, vol: 0.05, bus }); break;
      case 'cy': S.noise(t, 0.9, { filter: 'highpass', freq: 5200, vol: 0.07, bus }); break;
      case 'cl': for (const d of [0, 0.012, 0.025]) S.noise(t + d, 0.04, { filter: 'bandpass', freq: 1400, vol: 0.09, bus }); break;
      case 'tb':   // tuba: a round low triangle with a brassy buzz on the front of the note
        S.tone(e.f, t, dur * 0.85, { type: 'triangle', vol: 0.24, sustain: true, attack: 0.02, bus });
        S.tone(e.f, t, 0.09, { type: 'square', vol: 0.035, bus });
        S.tone(e.f * 2, t, dur * 0.6, { type: 'triangle', vol: 0.04, bus });
        break;
      case 'tp':   // trumpet: a bright, slightly scooped buzz, with a chorused second voice on long notes
        S.tone(e.f * 0.97, t, 0.03, { type: 'square', slide: e.f, vol: 0.03, bus });
        S.tone(e.f, t + 0.02, dur * 0.92, { type: 'sawtooth', vol: 0.035, sustain: true, attack: 0.015, bus });
        S.tone(e.f, t + 0.02, dur * 0.92, { type: 'square', vol: 0.022, sustain: true, attack: 0.015, bus });
        if (e.d >= 2) S.tone(e.f * 1.005, t + 0.04, dur * 0.85, { type: 'triangle', vol: 0.05, sustain: true, attack: 0.05, bus });
        break;
    }
  },
};
