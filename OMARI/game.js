'use strict';
/*
 * OMIRA — a Super Mario Bros.-inspired platformer.
 * Pure HTML5 Canvas + Web Audio. Every sprite, tile and sound is generated in code.
 *
 * File layout
 *   1. LEVEL REGISTRY   ← add new levels here (pure data, no engine code)
 *   2. Engine constants & tuning
 *   3. Utilities, pixel font
 *   4. Sound (SFX + music sequencer)
 *   5. Input
 *   6. Art: sprites, tiles, backgrounds
 *   7. Level compiler
 *   8. Entities
 *   9. Game (state machine, physics, rendering)
 *  10. Boot / fixed-timestep loop
 */
(function () {

// ═══════════════════════════════════════════════════════════════════════════
// 1. LEVEL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
/*
  A level is plain data. The screen is 14 tiles tall (rows 0-13); the normal
  ground surface is row 12 (rows 12-13 are filled). Columns run left → right.

  Fields
    id, name, theme ('meadow' | 'cave' | 'citadel'), music (song name), time,
    width (columns), start (column), checkpoint (column, optional), hint (text)
    goal: { type: 'pole', x } (flag pole + castle, needs ~10 columns after x)
          { type: 'crystal', x } (final-goal crystal on a 3-wide pedestal)

  map commands (applied in order, later ones overwrite earlier ones)
    ['ground', x0, x1, topRow = 12]   solid ground from topRow down to the bottom
    ['row', x, y, 'chars']            place tiles by character, '.' = leave as is
    ['rect', x0, y0, x1, y1, 'char']  fill a rectangle with one tile character
    ['pipe', x, height]               2-wide pipe standing on row 12
    ['stairs', x, n, dir]             staircase n wide on row 12; dir 1 = up, -1 = down
    ['coins', x, y, n]                horizontal row of coins
    ['lava', x0, x1]                  lava surface in row 13 (use inside a pit)

  tile characters
    X ground   B brick   ? coin block   M power-up block   U 1-UP block
    N multi-coin brick   S solid block  - semi-solid ledge (jump through from below)
    h hidden 1-UP block  o coin

  entities (x = column, row = the row the enemy stands in, default 11)
    ['grumblet', x, row]      walks, falls off ledges, stompable
    ['shellback', x, row]     walks, turns at ledges; stomp → kickable shell
    ['spikelet', x, row]      spiky — cannot be stomped (use fire or a shell)
    ['flutter', x, row, hang] bat that swoops toward the player
    ['snapvine', pipeX]       biting plant living in the pipe at column pipeX
    ['firebar', x, y, length, speed]  rotating chain of fire around block (x, y)
    ['ember', x]              lava bubble leaping out of a lava pit
    ['platform', x, y, widthTiles, 'h'|'v', rangeTiles, periodFrames, phase0to1]
*/
const LEVELS = [
  {
    id: '1-1', name: 'SUNLIT MEADOW', theme: 'meadow', music: 'meadow', time: 400,
    width: 212, start: 3, checkpoint: 97,
    hint: 'HOLD RUN TO SPRINT AND JUMP FARTHER',
    map: [
      ['ground', 0, 68], ['ground', 71, 86], ['ground', 90, 152], ['ground', 155, 211],
      ['row', 14, 8, '?'],
      ['row', 18, 8, 'B?BMB'], ['row', 20, 4, '?'],
      ['pipe', 28, 2], ['pipe', 38, 3], ['pipe', 46, 3], ['pipe', 57, 3],
      ['row', 64, 7, 'h'],
      ['coins', 68, 9, 4],
      ['row', 77, 8, 'B?B'], ['row', 80, 4, 'BBBBBBBB'],
      ['row', 91, 4, 'BBB?'], ['row', 94, 8, 'B'], ['coins', 91, 3, 3],
      ['row', 100, 8, 'BN'],
      ['row', 106, 8, '?'], ['row', 109, 8, '?'], ['row', 109, 4, 'M'], ['row', 112, 8, '?'],
      ['row', 118, 8, 'B'], ['row', 121, 4, 'BBB'], ['coins', 121, 3, 3],
      ['row', 128, 4, 'B??B'], ['row', 129, 8, 'BB'],
      ['stairs', 134, 4, 1], ['stairs', 140, 4, -1],
      ['stairs', 148, 4, 1], ['rect', 152, 8, 152, 11, 'S'], ['stairs', 155, 4, -1],
      ['coins', 153, 6, 2],
      ['pipe', 163, 2], ['row', 168, 8, 'BB?B'], ['pipe', 179, 2],
      ['stairs', 181, 8, 1], ['rect', 189, 4, 189, 11, 'S'],
    ],
    entities: [
      ['grumblet', 22], ['grumblet', 42], ['grumblet', 51], ['grumblet', 53],
      ['grumblet', 82, 3], ['grumblet', 84, 3],
      ['shellback', 107], ['grumblet', 114], ['grumblet', 116],
      ['grumblet', 124], ['grumblet', 126], ['grumblet', 131],
      ['grumblet', 168], ['grumblet', 170], ['shellback', 174],
    ],
    goal: { type: 'pole', x: 198 },
  },
  {
    id: '1-2', name: 'HOLLOW CAVERNS', theme: 'cave', music: 'cave', time: 300,
    width: 200, start: 3, checkpoint: 88,
    hint: 'SPIKELETS CANNOT BE STOMPED - JUMP OVER',
    map: [
      ['rect', 0, 0, 175, 1, 'X'],
      ['ground', 0, 40], ['ground', 44, 80], ['ground', 87, 130], ['ground', 134, 161], ['ground', 170, 199],
      ['row', 10, 8, '?M?'],
      ['rect', 22, 10, 23, 11, 'S'], ['coins', 22, 8, 2],
      ['row', 28, 8, 'BBNBB'],
      ['coins', 41, 8, 3],
      ['row', 48, 8, 'BBBB'],
      ['row', 58, 8, '------'], ['coins', 59, 6, 4],
      ['pipe', 66, 3], ['pipe', 72, 2],
      ['row', 76, 8, '?'],
      ['row', 95, 9, '----'], ['row', 100, 6, '----'], ['coins', 100, 5, 2], ['row', 102, 3, 'U'],
      ['row', 110, 8, 'B?BMB'],
      ['pipe', 138, 2], ['pipe', 145, 3],
      ['coins', 163, 7, 5],
      ['stairs', 176, 4, 1], ['rect', 180, 8, 180, 11, 'S'],
    ],
    entities: [
      ['grumblet', 17], ['grumblet', 19],
      ['flutter', 31, 2, true],
      ['spikelet', 52], ['spikelet', 56],
      ['shellback', 60, 7],
      ['snapvine', 66], ['snapvine', 72],
      ['platform', 82, 7, 3, 'v', 4, 200, 0],
      ['flutter', 93, 2, true], ['flutter', 99, 2, true],
      ['spikelet', 108], ['spikelet', 113],
      ['grumblet', 117], ['grumblet', 119],
      ['snapvine', 138], ['snapvine', 145],
      ['shellback', 150], ['spikelet', 156],
      ['platform', 162, 10, 3, 'h', 5, 240, 0],
    ],
    goal: { type: 'pole', x: 188 },
  },
  {
    id: '1-3', name: 'EMBER CITADEL', theme: 'citadel', music: 'citadel', time: 300,
    width: 190, start: 2, checkpoint: 120,
    hint: 'WATCH THE FIRE AND TIME YOUR JUMPS',
    map: [
      ['ground', 0, 14], ['lava', 15, 17], ['ground', 18, 34], ['lava', 35, 60],
      ['rect', 38, 10, 40, 13, 'X'], ['rect', 43, 8, 45, 13, 'X'], ['rect', 48, 10, 50, 13, 'X'],
      ['ground', 61, 90], ['lava', 91, 118], ['rect', 107, 9, 110, 13, 'X'],
      ['ground', 119, 145], ['lava', 146, 152], ['rect', 148, 8, 150, 13, 'X'], ['rect', 153, 8, 156, 13, 'X'],
      ['ground', 157, 189],
      ['row', 5, 8, '?M?'],
      ['row', 24, 8, 'S'],
      ['coins', 35, 8, 3], ['coins', 41, 6, 2], ['coins', 46, 5, 2],
      ['row', 68, 8, 'S'],
      ['row', 76, 8, 'B?B'],
      ['row', 82, 8, '?M?'],
      ['coins', 95, 4, 3], ['coins', 104, 5, 3],
      ['row', 124, 8, 'BBNBB'],
      ['row', 138, 8, 'S'],
      ['stairs', 141, 4, 1], ['rect', 145, 8, 145, 11, 'S'],
      ['coins', 146, 6, 2], ['coins', 151, 6, 2],
      ['stairs', 157, 4, -1],
      ['row', 176, 8, 'S'],
    ],
    entities: [
      ['ember', 16],
      ['firebar', 24, 8, 6, 0.04],
      ['spikelet', 31],
      ['ember', 41], ['ember', 47],
      ['platform', 51, 10, 3, 'h', 7, 280, 0],
      ['firebar', 68, 8, 5, -0.05],
      ['shellback', 73], ['grumblet', 80], ['grumblet', 86],
      ['flutter', 88, 6, false],
      ['platform', 93, 6, 2, 'v', 5, 220, 0],
      ['platform', 98, 6, 2, 'v', 5, 220, 0.5],
      ['platform', 102, 6, 2, 'v', 5, 220, 0.15],
      ['ember', 96], ['ember', 105],
      ['platform', 111, 9, 3, 'h', 5, 260, 0],
      ['spikelet', 129], ['spikelet', 133], ['shellback', 136],
      ['firebar', 138, 8, 6, 0.05],
      ['ember', 146], ['ember', 151],
      ['grumblet', 165], ['grumblet', 167], ['grumblet', 169], ['spikelet', 172],
      ['firebar', 176, 8, 5, -0.045],
    ],
    goal: { type: 'crystal', x: 184 },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2. ENGINE CONSTANTS & TUNING  (units: pixels and frames at a fixed 60 Hz)
// ═══════════════════════════════════════════════════════════════════════════
const TILE = 16, ROWS = 14, VIEW_W = 400, VIEW_H = 224;
const STEP_MS = 1000 / 60;

const WALK_MAX = 1.6, RUN_MAX = 2.75;
const ACCEL = 0.075, RUN_ACCEL = 0.045, FRICTION = 0.07, SKID = 0.2;
const AIR_ACCEL = 0.07, AIR_TURN = 0.11;
const JUMP_BASE = 4.9, JUMP_BONUS = 0.22;        // jump speed grows with run speed
const GRAV_HOLD = 0.17, GRAV_APEX = 0.25, GRAV = 0.5, MAX_FALL = 5.5;
const COYOTE = 6, JUMP_BUFFER = 7, STOMP_BOUNCE = 4.4;
const SMALL_H = 16, BIG_H = 26, PLAYER_W = 12;

const T = {
  EMPTY: 0, GROUND: 1, BRICK: 2, QCOIN: 3, QPOW: 4, Q1UP: 5, USED: 6, SOLID: 7,
  PIPE_TL: 8, PIPE_TR: 9, PIPE_L: 10, PIPE_R: 11, SEMI: 12, LAVA: 13, MULTI: 14, HIDDEN: 15, COIN: 16,
};
const TILE_CHARS = { X: 1, B: 2, '?': 3, M: 4, U: 5, S: 7, '-': 12, L: 13, N: 14, h: 15, o: 16 };
const SOLID = new Uint8Array(32);
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14].forEach(t => { SOLID[t] = 1; });

const STOMP_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];

// ═══════════════════════════════════════════════════════════════════════════
// 3. UTILITIES & PIXEL FONT
// ═══════════════════════════════════════════════════════════════════════════
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, '0');

function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
// Crisp filled circle built from horizontal spans (no anti-aliasing).
function blob(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}
const safeStorage = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
};

// 5x7 bitmap font. Each glyph is 7 rows of 5-bit masks (bit 4 = leftmost pixel).
const FONT = {
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [28, 18, 17, 17, 17, 18, 28], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  ' ': [0, 0, 0, 0, 0, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '>': [8, 4, 2, 1, 2, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2], '+': [0, 4, 4, 31, 4, 4, 0], '=': [0, 0, 31, 0, 31, 0, 0],
  '*': [0, 17, 10, 4, 10, 17, 0], '&': [12, 18, 20, 8, 21, 18, 13],
  '←': [0, 4, 8, 31, 8, 4, 0], '→': [0, 4, 2, 31, 2, 4, 0], '↑': [4, 14, 21, 4, 4, 4, 0],
  '↓': [0, 4, 4, 4, 21, 14, 4],
};
const glyphCache = new Map();
function glyph(ch, color) {
  const key = ch + color;
  let c = glyphCache.get(key);
  if (c) return c;
  c = makeCanvas(5, 7);
  const g = c.getContext('2d');
  g.fillStyle = color;
  const rows = FONT[ch] || FONT['?'];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if ((rows[y] >> (4 - x)) & 1) g.fillRect(x, y, 1, 1);
  glyphCache.set(key, c);
  return c;
}
const textWidth = (s, scale = 1) => (s.length * 6 - 1) * scale;
function drawText(ctx, str, x, y, color = '#ffffff', o = {}) {
  const s = o.scale || 1;
  str = String(str).toUpperCase();
  if (o.align === 'center') x -= textWidth(str, s) / 2;
  else if (o.align === 'right') x -= textWidth(str, s);
  x = Math.round(x); y = Math.round(y);
  for (const ch of str) {
    if (ch !== ' ') {
      if (o.shadow) ctx.drawImage(glyph(ch, o.shadow), x + s, y + s, 5 * s, 7 * s);
      ctx.drawImage(glyph(ch, color), x, y, 5 * s, 7 * s);
    }
    x += 6 * s;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SOUND — synthesized SFX and a lookahead music sequencer
// ═══════════════════════════════════════════════════════════════════════════
const Sound = {
  ctx: null, master: null, sfx: null, music: null, noiseBuf: null,
  muted: safeStorage.get('omira-muted') === '1',
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(this.master);
      this.music = ctx.createGain(); this.music.gain.value = 0.42; this.music.connect(this.master);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  setMuted(m) {
    this.muted = m;
    safeStorage.set('omira-muted', m ? '1' : '0');
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
    g.gain.setValueAtTime(o.vol == null ? 0.2 : o.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfx);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  },
  seq(notes, step, o = {}) {
    const t = this.ctx.currentTime + 0.005;
    notes.forEach((n, i) => { if (n) this.tone(n, t + i * step, o.dur || step * 1.15, o); });
  },
  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'jump': this.tone(300, t, 0.18, { slide: 760, vol: 0.12 }); break;
      case 'jumpBig': this.tone(200, t, 0.2, { slide: 560, vol: 0.12 }); break;
      case 'coin': this.tone(988, t, 0.08, { vol: 0.11 }); this.tone(1319, t + 0.075, 0.32, { vol: 0.11 }); break;
      case 'stomp': this.tone(520, t, 0.12, { slide: 110, vol: 0.2 }); this.noise(t, 0.07, { freq: 1500, vol: 0.15 }); break;
      case 'kick': this.tone(880, t, 0.05, { vol: 0.14 }); this.tone(440, t + 0.04, 0.08, { vol: 0.14 }); break;
      case 'bump': this.tone(140, t, 0.1, { type: 'triangle', slide: 70, vol: 0.4 }); break;
      case 'break': this.noise(t, 0.28, { freq: 1100, vol: 0.4 }); this.tone(180, t, 0.15, { slide: 50, vol: 0.2, type: 'triangle' }); break;
      case 'appear': this.seq([392, 494, 587, 784, 988, 1175], 0.045, { type: 'triangle', vol: 0.22 }); break;
      case 'power': this.seq([523, 659, 784, 1047, 659, 784, 1047, 1319, 784, 1047, 1319, 1568], 0.04, { vol: 0.09 }); break;
      case 'oneup': this.seq([659, 784, 1319, 1047, 1175, 1568], 0.09, { vol: 0.11 }); break;
      case 'shrink': this.seq([1047, 880, 698, 587, 440, 349], 0.06, { vol: 0.11 }); break;
      case 'fire': this.tone(1200, t, 0.08, { slide: 300, vol: 0.09 }); break;
      case 'die': this.seq([988, 932, 880, 831, 0, 659, 587, 523, 0, 392, 330, 262], 0.1, { vol: 0.11 }); break;
      case 'flag': this.tone(1500, t, 0.9, { slide: 200, vol: 0.08 }); this.tone(750, t, 0.9, { slide: 100, vol: 0.05, type: 'triangle' }); break;
      case 'tick': this.tone(1568, t, 0.03, { vol: 0.05 }); break;
      case 'pause': this.seq([988, 784, 988, 784], 0.065, { vol: 0.09 }); break;
      case 'select': this.tone(880, t, 0.05, { vol: 0.09 }); break;
      case 'confirm': this.seq([660, 990, 1320], 0.055, { vol: 0.1 }); break;
      case 'checkpoint': this.seq([784, 988, 1175, 1568], 0.075, { type: 'triangle', vol: 0.25 }); break;
      case 'hurry': this.seq([1047, 1109, 1175, 0, 1047, 1109, 1175], 0.07, { vol: 0.09 }); break;
      case 'sizzle': this.noise(t, 0.18, { filter: 'highpass', freq: 3000, vol: 0.06 }); break;
      case 'firework': this.noise(t, 0.5, { freq: 600, vol: 0.28 }); this.tone(90, t, 0.3, { type: 'sine', slide: 40, vol: 0.3 }); break;
      case 'crystal': this.seq([523, 659, 784, 1047, 1319, 1568, 2093], 0.08, { type: 'triangle', vol: 0.22, dur: 0.7 }); break;
      case 'burn': this.noise(t, 0.4, { filter: 'highpass', freq: 1200, vol: 0.2 }); break;
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
  title: null, // filled below (meadow at a gentler tempo)
  ending: null,
  clear: { bpm: 200, lead: 'sq', loop: false, mel: 'G4 C5 E5 G5 C6 E6 G6:3 E6:3 | G#4 C5 D#5 G#5 C6 D#6 G#6:3 D#6:3 | A#4 D5 F5 A#5 D6 F6 A#6:3 A#6 A#6 A#6 C7:6' },
  gameover: { bpm: 130, lead: 'sq', loop: false, mel: 'C5:3 G4:3 E4:2 | A4:2 B4:2 A4:2 | G#4:2 A#4:2 G#4:2 | G4 F4 G4:6' },
};
SONGS.title = Object.assign({}, SONGS.meadow, { bpm: 128, drums: 'k...s...' });
SONGS.ending = Object.assign({}, SONGS.meadow, { bpm: 118, drums: 'k.h.s.h.' });

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

const Music = {
  want: null, song: null, gain: null, start: 0, idx: 0, loop: 0, rate: 1,
  play(name, rate = 1) {
    this.stop();
    this.want = { name, rate };
  },
  stop() {
    if (this.gain && Sound.ctx) {
      const g = this.gain;
      g.gain.setTargetAtTime(0, Sound.ctx.currentTime, 0.03);
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* already gone */ } }, 500);
    }
    this.gain = null; this.song = null; this.want = null;
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
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. INPUT
// ═══════════════════════════════════════════════════════════════════════════
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
  ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyJ: 'run',
  KeyP: 'pause', Escape: 'pause', Enter: 'start', NumpadEnter: 'start', KeyM: 'mute', KeyF: 'fullscreen',
  // virtual codes pressed by the on-screen touch controls
  TouchLeft: 'left', TouchRight: 'right', TouchJump: 'jump', TouchRun: 'run',
};
const Input = {
  held: Object.create(null), hits: new Set(), codes: new Set(),
  down(a) { return (this.held[a] | 0) > 0; },
  hit(a) { return this.hits.has(a); },
  endStep() { this.hits.clear(); },
  reset() { this.held = Object.create(null); this.codes.clear(); },
  press(code) {
    const a = KEYMAP[code];
    if (!a || this.codes.has(code)) return a;
    this.codes.add(code);
    this.held[a] = (this.held[a] | 0) + 1;
    this.hits.add(a);
    return a;
  },
  release(code) {
    const a = KEYMAP[code];
    if (!a || !this.codes.has(code)) return;
    this.codes.delete(code);
    this.held[a] = Math.max(0, (this.held[a] | 0) - 1);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. ART — sprites (pixel arrays), tiles and backgrounds, all generated in code
// ═══════════════════════════════════════════════════════════════════════════
const INK = '#1b1530';
const withRows = (base, from, rows) => base.slice(0, from).concat(rows, base.slice(from + rows.length));

// Omira: hooded explorer with a leaf sprout and a trailing scarf. 20px wide, facing right,
// lit from the top-left. Three-tone ramps: L/H/h hood, R/C/c tunic, Y/y scarf, B/b boots.
const PAL_OMIRA = {
  K: INK, G: '#8ff09a', g: '#3f9a55', L: '#a6f8ec', H: '#2ec4b6', h: '#168479',
  S: '#ffd7ae', s: '#e9a978', W: '#ffffff', P: '#ff9aa2',
  R: '#ffa0ad', C: '#ff5d73', c: '#b8304f', Y: '#ffd166', y: '#d9952e', B: '#7a4a32', b: '#4a2c1e',
};
const PAL_FIRE = Object.assign({}, PAL_OMIRA, {
  L: '#ffd08a', H: '#ff7a3c', h: '#b8401a', R: '#ffffff', C: '#fff1dc', c: '#d9b48c',
  Y: '#ff4f5e', y: '#b8263a', G: '#ffe066', g: '#d98a1a',
});

const HEAD = [
  '..........gG........',
  '.........gGGg.......',
  '......KKKKgKKK......',
  '....KKHHLLHHHHKK....',
  '...KHHHLLHHHHHHHK...',
  '...KHHLHHHHHHHHHK...',
  '..KHHHHHHhhhhhhHHK..',
  '..KHHHHHhSSSSSShHK..',
  '..KHHHHhSSSSKWSShK..',
  '..KhHHHhSSSSKKSSPK..',
  '...KhhhhsSSSSSSSK...',
  '....KKKKKsssssKK....',
];
const HEAD_BLINK = withRows(HEAD, 8, ['..KHHHHhSSSSSSSShK..', '..KhHHHhSSSSKKSSPK..']);
const HEAD_SHOCK = withRows(HEAD, 8, ['..KHHHHhSSSKWKSShK..', '..KhHHHhSSSKKKSSPK..', '...KhhhhsSSSSSKSK...']);

// small body: 3 torso rows (scarf + tunic) and 3 leg rows
const S_TORSO = {
  idle: ['.....KYYYYYYK.......', '...KYyKCRCCCKK......', '..KyK.KCRCCCSK......'],
  runA: ['..KYYKYYYYYYK.......', '.KyKKKKCRCCCKK......', '......KCRCCCSK......'],
  runB: ['.KYyKKYYYYYYK.......', '..KK.KKCRCCCKK......', '......KCRCCCSK......'],
  jump: ['.....KYYYYYYK.KSK...', '..KYYyKCRCCCKKSK....', '.KYyKK.KCRCCK.......'],
  fall: ['..KyYYKYYYYYYK......', '...KK.KCRCCCKSK.....', '......KCRCCCK.......'],
  skid: ['.....KYYYYYYK.......', '...KYyKCRCCCKSK.....', '....KK.KCRCCK.......'],
};
const S_LEGS = {
  idle: ['......KcCCCcK.......', '......KBK.KBK.......', '.....KBbK.KBbK......'],
  run0: ['.....KcCCCCcK.......', '....KBK....KBK......', '...KBbK.....KBbK....'],
  run1: ['......KcCCCcK.......', '......KBKKBK........', '.......KBbK.........'],
  run2: ['.....KcCCCCcK.......', '.....KBK..KBK.......', '....KBbK...KBbK.....'],
  run3: ['......KcCCCcK.......', '.......KBKBK........', '......KBbK..........'],
  jump: ['......KcCCCcK.......', '......KBBK.KBK......', '.......KbK..KBK.....'],
  fall: ['......KcCCCcK.......', '.....KBK..KBK.......', '.....KbK..KbK.......'],
  skid: ['.....KcCCCcK........', '....KBK.KBK.........', '...KBbK.KBbK........'],
};
const S_DIE_BODY = [
  '...KSK.KYYYYK.KSK...', '....KSKKCRCCKKSK....', '......KCRCCK........',
  '......KcCCcK........', '......KBKKBK........', '.....KBbKKBbK.......',
];

// big body: 10 torso rows and 5 leg rows
const B_TORSO = [
  '.....KYYYYYYYK......', '...KYYYYYYYYYYK.....', '..KYyKKCRRCCCCKK....', '..Ky.KCRCCCCCCSK....',
  '...K.KCRCCCCCKSK....', '.....KCRCCCCCKK.....', '.....KcCCCCCcK......', '.....KyyyyyyyK......',
  '.....KcCCCCCcK......', '.....KccCCCccK......',
];
const B_TORSO_JUMP = withRows(B_TORSO, 0, [
  '.....KYYYYYYYK.KSK..', '...KYYYYYYYYYYKSK...', '..KYyKKCRRCCCCKK....', '..Ky.KCRCCCCCCK.....', '...K.KCRCCCCCK......',
]);
const B_TORSO_RUN = withRows(B_TORSO, 1, ['.KYYKYYYYYYYYYK.....', 'KyyKKKKCRRCCCCKK....', '.KK..KCRCCCCCCSK....', '.....KCRCCCCCKSK....']);
const B_LEGS = {
  idle: ['.....KBBK.KBBK......', '.....KBBK.KBBK......', '.....KBBK.KBBK......', '....KBBbK.KBBbK.....', '....KKKKK.KKKKK.....'],
  run0: ['....KBBK...KBBK.....', '...KBBK.....KBBK....', '...KBBK.....KBBK....', '..KBBbK......KBBbK..', '..KKKKK......KKKKK..'],
  run1: ['.....KBBKBBK........', '......KBBBK.........', '......KBBK..........', '......KBBbK.........', '......KKKKK.........'],
  run2: ['.....KBBK.KBBK......', '....KBBK...KBBK.....', '....KBBK...KBBK.....', '...KBBbK....KBBbK...', '...KKKKK....KKKKK...'],
  run3: ['......KBBKBBK.......', '.......KBBBK........', '........KBBK........', '........KBBbK.......', '........KKKKK.......'],
  jump: ['.....KBBK..KBBK.....', '....KBBK....KBK.....', '....KBBK....KBK.....', '...KBBbK.....KK.....', '...KKKKK............'],
  skid: ['.....KBBKBBK........', '....KBBKBBK.........', '....KBBKBBK.........', '...KBBbKBBbK........', '...KKKKKKKKK........'],
};

const GRUMBLET = [
  '................',
  '......KKKK......',
  '....KKAAAAKK....',
  '...KAAAAAAAAK...',
  '..KAAKAAAAKAAK..',
  '..KAAAKAAKAAAK..',
  '.KAAAWKAAKWAAAK.',
  '.KAAAWKAAKWAAAK.',
  '.KaAAAAAAAAAAaK.',
  '.KaaAKKKKKKAaaK.',
  '..KaaaaaaaaaaK..',
  '...KKFFFFFFKK...',
  '....KFFFFFFK....',
  '..KKFFKKKFFK....',
  '.KDDDDK.KDDDK...',
  '.KKKKKK.KKKKK...',
];
const SHELLBACK = [
  '................',
  '.....KKKKK......',
  '...KKGGGGGKK....',
  '..KGGgGGGgGGK...',
  '.KGGgGGGGGgGGK..',
  '.KGgGGGgGGGgGKK.',
  'KGGgGGGgGGGgGKSK',
  'KGGgGGGgGGGgKSWK',
  'KGGgGGGgGGGgKSKK',
  'KRRRRRRRRRRRKSSK',
  '.KRRRRRRRRRRKSSK',
  '..KKKKKKKKKKSSK.',
  '...KSSK..KSSKK..',
  '...KSSK..KSSK...',
  '..KKKKK.KKKKK...',
  '................',
];
const SHELLBACK_LEGS_B = ['..KSSK....KSSK..', '..KSSK....KSSK..', '.KKKKK...KKKKK..'];
const SHELL = [
  '.....KKKKKK.....',
  '...KKGGGGGGKK...',
  '..KGGgGGGGgGGK..',
  '.KGgGGGgGGGGgGK.',
  '.KGgGGGgGGGGgGK.',
  'KGGgGGGgGGGGgGGK',
  'KGGgGGGgGGGGgGGK',
  'KRRRRRRRRRRRRRRK',
  '.KRRRRRRRRRRRRK.',
  '..KKKKKKKKKKKK..',
];
const SPIKELET = [
  '................',
  '...T....T....T..',
  '...TK..KTK..KT..',
  '..KTTKKTTTKKTTK.',
  '.KPPTPPPTPPPTPK.',
  'TTPPPPPPPPPPPPTT',
  '.KPPPPPPPPPPWWK.',
  '.KPPPPPPPPPPWKK.',
  'TTPPPPPPPPPPPPTT',
  '.KpPPPPPPPPPPpK.',
  '.KppPPPPPPPPppK.',
  '..KppppppppppK..',
  '...KKKKKKKKKK...',
  '...KDDK..KDDK...',
  '...KKK...KKK....',
  '................',
];
const SPIKELET_LEGS_B = ['....KDDK.KDDK...', '....KKK..KKK....'];
const FLUTTER_UP = [
  '.K............K.',
  'KVK..........KVK',
  'KVVK..K..K..KVVK',
  'KVVVKKVKKVKKVVVK',
  'KVVVVVVVVVVVVVVK',
  '.KVVVVWRVWRVVVK.',
  '..KVVVVVVVVVVK..',
  '...KvVVKKVVvK...',
  '....KvVVVVvK....',
  '.....KKVVKK.....',
  '.......KK.......',
  '................',
];
const FLUTTER_DOWN = [
  '................',
  '......K..K......',
  '.....KVKKVK.....',
  '....KVVVVVVK....',
  '...KVVWRWRVVK...',
  '..KVVVVVVVVVVK..',
  '.KVVVKVVVVKVVVK.',
  'KVVVK.KVVK.KVVVK',
  'KVVK...KK...KVVK',
  'KVK..........KVK',
  'KK............KK',
  '................',
];
const VINE_OPEN = [
  '....KK....KK....',
  '...KFFK..KFFK...',
  '..KFFFFKKFFFFK..',
  '..KFfFFFFFFfFK..',
  '.KFFfWMMMMWfFFK.',
  '.KFfWMMMMMMWfFK.',
  '.KFfMMMMMMMMfFK.',
  '.KFfWMMMMMMWfFK.',
  '.KFFfWMMMMWfFFK.',
  '..KFfFFFFFFfFK..',
  '...KFFFKKFFFK...',
  '....KKK..KKK....',
];
const VINE_SHUT = [
  '................',
  '.....KKKKKK.....',
  '...KKFFFFFFKK...',
  '..KFFfFFFFfFFK..',
  '.KFFfFFFFFFfFFK.',
  '.KFfFFFFFFFFfFK.',
  '.KFfWWWWWWWWfFK.',
  '.KFfFFFFFFFFfFK.',
  '.KFFfFFFFFFfFFK.',
  '..KFFfFFFFfFFK..',
  '...KKFFFFFFKK...',
  '.....KKKKKK.....',
];
const VINE_STEM = [
  '.......KK.......',
  '.......KLK......',
  '..KK...KLK..KK..',
  '.KLLK..KLK.KLLK.',
  '.KLLLK.KLKKLLLK.',
  '..KLLLKKLKLLLK..',
  '...KKLLKLLLKK...',
  '.....KKLLKK.....',
  '.......KLK......',
  '.......KLK......',
  '.......KLK......',
  '.......KLK......',
];
const SHROOM = [
  '................',
  '.....KKKKKK.....',
  '...KKRRWWRRKK...',
  '..KRRRWWWWRRRK..',
  '.KRRRRRWWRRRRRK.',
  '.KWWRRRRRRRRWWK.',
  'KWWWWRRRRRRWWWWK',
  'KWWWRRRRRRRRWWWK',
  'KrRRRRRRRRRRRRrK',
  '.KKKKKKKKKKKKKK.',
  '...KSSSSSSSSK...',
  '..KSSKSSSSKSSK..',
  '..KSSKSSSSKSSK..',
  '..KSSSSSSSSSSK..',
  '...KSSSSSSSSK...',
  '....KKKKKKKK....',
];
const BLOOM = [
  '................',
  '.....KKKKKK.....',
  '...KKOOOOOOKK...',
  '..KOOYYYYYYOOK..',
  '.KOOYWWWWWWYOOK.',
  '.KOYWKWWWWKWYOK.',
  '.KOOYWWWWWWYOOK.',
  '..KOOYYYYYYOOK..',
  '...KKOOOOOOKK...',
  '.....KKLLKK.....',
  '..KK...KLK..KK..',
  '.KLLK..KLK.KLLK.',
  '.KLLLKKKLKKLLLK.',
  '..KLLLLKLKLLLK..',
  '...KKKKLLLKKK...',
  '......KKKK......',
];

function sprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const col = pal[rows[y][x]];
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return c;
}

const SPR = {};
const ENEMY_TINT = {
  meadow: { A: '#b5603a', a: '#7d3a1f' },
  cave: { A: '#4f66c9', a: '#2c3a85' },
  citadel: { A: '#8a5a6a', a: '#4e2c3a' },
};
function buildSprites() {
  const smallSet = {}, bigSet = {}, fireSet = {};
  const smallTorso = { run0: 'runA', run1: 'runB', run2: 'runA', run3: 'runB' };
  for (const k of ['idle', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'skid']) {
    smallSet[k] = sprite(HEAD.concat(S_TORSO[smallTorso[k] || k], S_LEGS[k]), PAL_OMIRA);
    const torso = k === 'jump' ? B_TORSO_JUMP : k.startsWith('run') ? B_TORSO_RUN : B_TORSO;
    const legs = B_LEGS[k === 'fall' ? 'idle' : k];
    bigSet[k] = sprite(HEAD.concat(torso, legs), PAL_OMIRA);
    fireSet[k] = sprite(HEAD.concat(torso, legs), PAL_FIRE);
  }
  smallSet.blink = sprite(HEAD_BLINK.concat(S_TORSO.idle, S_LEGS.idle), PAL_OMIRA);
  bigSet.blink = sprite(HEAD_BLINK.concat(B_TORSO, B_LEGS.idle), PAL_OMIRA);
  fireSet.blink = sprite(HEAD_BLINK.concat(B_TORSO, B_LEGS.idle), PAL_FIRE);
  SPR.small = smallSet; SPR.big = bigSet; SPR.fire = fireSet;
  SPR.die = sprite(HEAD_SHOCK.concat(S_DIE_BODY), PAL_OMIRA);
  SPR.lifeIcon = sprite(HEAD, PAL_OMIRA);

  SPR.grumblet = {}; SPR.grumbletFlat = {};
  for (const th of Object.keys(ENEMY_TINT)) {
    const pal = Object.assign({ K: INK, W: '#fff6e0', F: '#f3d9a4', D: '#3b2416' }, ENEMY_TINT[th]);
    SPR.grumblet[th] = sprite(GRUMBLET, pal);
    SPR.grumbletFlat[th] = sprite(GRUMBLET.filter((_, i) => i % 2 === 1), pal);
  }
  const shellPal = { K: INK, G: '#43c46e', g: '#24814a', R: '#f2e8cf', S: '#ffcf5a', W: '#ffffff' };
  SPR.shellbackA = sprite(SHELLBACK, shellPal);
  SPR.shellbackB = sprite(withRows(SHELLBACK, 12, SHELLBACK_LEGS_B), shellPal);
  SPR.shell = sprite(SHELL, shellPal);
  const spikePal = { K: INK, P: '#ff4d6d', p: '#b3203f', T: '#fff1d6', W: '#ffffff', D: '#5a1a2a' };
  SPR.spikeletA = sprite(SPIKELET, spikePal);
  SPR.spikeletB = sprite(withRows(SPIKELET, 13, SPIKELET_LEGS_B), spikePal);
  const batPal = { K: INK, V: '#8a6bff', v: '#5233c4', W: '#ffffff', R: '#ff4d6d' };
  SPR.flutterUp = sprite(FLUTTER_UP, batPal);
  SPR.flutterDown = sprite(FLUTTER_DOWN, batPal);
  const vinePal = { K: INK, F: '#e84393', f: '#a3195b', W: '#ffffff', M: '#2a0d1f', L: '#4cd17a' };
  SPR.vineOpen = sprite(VINE_OPEN.concat(VINE_STEM), vinePal);
  SPR.vineShut = sprite(VINE_SHUT.concat(VINE_STEM), vinePal);
  SPR.shroom = sprite(SHROOM, { K: INK, R: '#ff5d73', r: '#c2365a', W: '#fff4e0', S: '#ffe0b3' });
  SPR.oneup = sprite(SHROOM, { K: INK, R: '#4cd17a', r: '#2a8a4f', W: '#fff4e0', S: '#ffe0b3' });
  SPR.bloomA = sprite(BLOOM, { K: INK, O: '#ff8a2a', Y: '#ffd166', W: '#fff4e0', L: '#4cd17a' });
  SPR.bloomB = sprite(BLOOM, { K: INK, O: '#ff4f4f', Y: '#ffb347', W: '#ffffff', L: '#4cd17a' });
}

// Draw a sprite anchored at its bottom-centre, with optional flip / squash.
function drawSprite(ctx, img, cx, bottom, flip, sx = 1, sy = 1, vflip = false) {
  if (!flip && !vflip && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) {
    ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(bottom - img.height));
    return;
  }
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottom));
  ctx.scale(flip ? -sx : sx, vflip ? -sy : sy);
  ctx.drawImage(img, -img.width / 2, vflip ? 0 : -img.height);
  ctx.restore();
}

const THEMES = {
  meadow: {
    style: 'dirt', accent: '#7be08a',
    ground: ['#c47a48', '#8a4c2a', '#e6a771'], top: ['#5fd068', '#2f9a49', '#b6f59a'],
    brick: ['#d8653d', '#76291a', '#f59f6e'], block: ['#d39a62', '#8a5530', '#f6cb98'],
    semi: ['#c08850', '#6b4224', '#e8b47c'], plat: ['#d39a62', '#6b4224', '#f6cb98'],
    castle: ['#d8a27a', '#7a4630', '#f3cba6'],
  },
  cave: {
    style: 'stone', accent: '#59e6d8',
    ground: ['#3d4aa3', '#20255f', '#6676dc'], top: ['#59e6d8', '#2a9c9a', '#c2fff7'],
    brick: ['#4a66d6', '#1a2160', '#8ba3ff'], block: ['#5a5ea8', '#2a2d62', '#9499e0'],
    semi: ['#a8744a', '#563820', '#d8a476'], plat: ['#7a5ad8', '#3a2580', '#b8a2ff'],
    castle: ['#6a78c8', '#2a3070', '#a6b2f0'],
  },
  citadel: {
    style: 'stone', accent: '#ff8a3c',
    ground: ['#5a4663', '#2a1d33', '#8b7193'], top: ['#ff7a3c', '#a3361a', '#ffd08a'],
    brick: ['#984a5a', '#3a1622', '#c97a8b'], block: ['#776a82', '#352b40', '#ab9db6'],
    semi: ['#80809a', '#3a3a52', '#b8b8d0'], plat: ['#8a8aa6', '#383850', '#c4c4dc'],
    castle: ['#6e5a76', '#2a1d33', '#a28aa8'],
  },
};

// ---- tiles ----------------------------------------------------------------
function rects(c, color, list) { c.fillStyle = color; for (const r of list) c.fillRect(r[0], r[1], r[2] || 1, r[3] || 1); }

function paintGround(c, th, top) {
  const [b, d, l] = th.ground;
  c.fillStyle = b; c.fillRect(0, 0, 16, 16);
  if (th.style === 'dirt') {
    rects(c, d, [[1, 6, 3, 2], [9, 2, 2, 2], [12, 9, 3, 2], [4, 12, 2, 2], [7, 8, 2, 1], [14, 14, 2, 1], [0, 1, 1, 2]]);
    rects(c, l, [[2, 5, 2], [9, 1, 2], [12, 8, 2], [4, 11], [11, 13], [6, 3]]);
  } else {
    rects(c, d, [[0, 7, 16], [0, 15, 16], [15, 0, 1, 7], [7, 8, 1, 7], [4, 3], [11, 11], [12, 4]]);
    rects(c, l, [[0, 0, 15], [0, 0, 1, 7], [0, 8, 7], [8, 8, 7], [8, 8, 1, 7]]);
  }
  if (!top) return;
  const [g, gd, gl] = th.top;
  if (th.style === 'dirt') {
    c.fillStyle = g; c.fillRect(0, 0, 16, 5);
    rects(c, gd, [[0, 5, 16], [1, 6], [4, 6, 1, 2], [6, 6], [10, 6, 2, 1], [13, 6, 1, 2], [3, 3], [9, 2], [14, 3]]);
    rects(c, gl, [[0, 0, 16], [3, 1, 2], [8, 1, 2], [12, 1, 2]]);
  } else {
    c.fillStyle = gd; c.fillRect(0, 0, 16, 3);
    c.fillStyle = g; c.fillRect(0, 0, 16, 2);
    rects(c, gd, [[2, 3, 1, 2], [6, 3], [9, 3, 1, 3], [13, 3, 1, 2]]);
    rects(c, gl, [[1, 0], [5, 0, 2], [11, 0], [14, 0]]);
  }
}
function paintBrick(c, th) {
  const [b, d, l] = th.brick;
  c.fillStyle = b; c.fillRect(0, 0, 16, 16);
  rects(c, d, [[0, 7, 16], [0, 15, 16], [7, 0, 1, 7], [15, 0, 1, 7], [3, 8, 1, 7], [11, 8, 1, 7]]);
  rects(c, l, [[0, 0, 7], [8, 0, 7], [0, 8, 3], [4, 8, 7], [12, 8, 4]]);
}
const QMARK = ['.####.', '##..##', '....##', '...##.', '..##..', '..##..', '......', '..##..'];
function paintQuestion(c, f) {
  const out = '#6b3a0e';
  c.fillStyle = out; c.fillRect(0, 0, 16, 16);
  c.fillStyle = ['#ffc23d', '#ffd56a', '#ffe7a6'][f]; c.fillRect(1, 1, 14, 14);
  rects(c, '#d9861c', [[1, 14, 14], [14, 1, 1, 14]]);
  rects(c, '#fff3c4', [[1, 1, 13], [1, 1, 1, 13]]);
  rects(c, out, [[3, 3], [12, 3], [3, 12], [12, 12]]);
  for (let y = 0; y < QMARK.length; y++) for (let x = 0; x < 6; x++) if (QMARK[y][x] === '#') {
    rects(c, '#d9861c', [[5 + x + 1, 4 + y + 1]]);
  }
  for (let y = 0; y < QMARK.length; y++) for (let x = 0; x < 6; x++) if (QMARK[y][x] === '#') {
    rects(c, '#7a3d0c', [[5 + x, 4 + y]]);
  }
}
function paintUsed(c) {
  c.fillStyle = '#4a2e1c'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#a67c52'; c.fillRect(1, 1, 14, 14);
  rects(c, '#7a5535', [[1, 14, 14], [14, 1, 1, 14]]);
  rects(c, '#c9a073', [[1, 1, 13], [1, 1, 1, 13]]);
  rects(c, '#4a2e1c', [[3, 3], [12, 3], [3, 12], [12, 12]]);
}
function paintSolid(c, th) {
  const [b, d, l] = th.block;
  c.fillStyle = d; c.fillRect(0, 0, 16, 16);
  c.fillStyle = b; c.fillRect(1, 1, 14, 14);
  rects(c, l, [[1, 1, 14, 2], [1, 1, 2, 14]]);
  rects(c, d, [[3, 13, 12, 2], [13, 3, 2, 12]]);
  rects(c, l, [[5, 5, 2], [5, 5, 1, 2]]);
}
const PIPE = { o: '#0f3d2a', d: '#1d7a4c', b: '#38c27a', m: '#6fdc9f', l: '#b6f5d2' };
function paintPipe(c, part) {
  const P = PIPE;
  if (part === 'TL') {
    c.fillStyle = P.o; c.fillRect(0, 0, 16, 16);
    c.fillStyle = P.b; c.fillRect(1, 1, 15, 14);
    rects(c, P.l, [[3, 1, 2, 14]]); rects(c, P.m, [[6, 1, 1, 14], [1, 1, 15, 1]]);
  } else if (part === 'TR') {
    c.fillStyle = P.o; c.fillRect(0, 0, 16, 16);
    c.fillStyle = P.b; c.fillRect(0, 1, 15, 14);
    rects(c, P.m, [[0, 1, 8, 1]]);
    rects(c, P.d, [[7, 1, 2, 14], [10, 1, 4, 14]]);
  } else if (part === 'L') {
    rects(c, P.o, [[2, 0, 1, 16]]); rects(c, P.b, [[3, 0, 13, 16]]);
    rects(c, P.l, [[5, 0, 2, 16]]); rects(c, P.m, [[8, 0, 1, 16]]);
  } else {
    rects(c, P.b, [[0, 0, 13, 16]]); rects(c, P.d, [[5, 0, 2, 16], [8, 0, 4, 16]]);
    rects(c, P.o, [[13, 0, 1, 16]]);
  }
}
function paintSemi(c, th) {
  const [b, d, l] = th.semi;
  c.fillStyle = d; c.fillRect(0, 0, 16, 6);
  c.fillStyle = b; c.fillRect(0, 1, 16, 4);
  rects(c, l, [[0, 1, 16]]);
  rects(c, d, [[7, 1, 1, 4], [15, 1, 1, 4], [2, 6, 3, 1], [3, 7, 2, 1], [4, 8, 1, 2], [11, 6, 3, 1], [11, 7, 2, 1], [11, 8, 1, 2]]);
}
function paintLava(c, f) {
  for (let x = 0; x < 16; x++) {
    const s = 4 + Math.round(Math.sin((x + f * 4) / 16 * Math.PI * 2) * 1.5);
    rects(c, '#ff6a1f', [[x, s, 1, 16 - s]]);
    rects(c, '#ffd27a', [[x, s]]);
    rects(c, '#d8361a', [[x, 11, 1, 5]]);
  }
  rects(c, '#ffe9a0', [[(f * 5) % 14 + 1, 8], [(f * 9 + 6) % 14 + 1, 12]]);
}
function paintLavaDeep(c) {
  c.fillStyle = '#d8361a'; c.fillRect(0, 0, 16, 16);
  rects(c, '#ff6a1f', [[2, 3, 3, 1], [10, 9, 3, 1]]);
}
function paintCoin(c, f) {
  const w = [10, 6, 2, 6][f], x0 = 8 - w / 2;
  if (w === 2) { rects(c, '#9a5a00', [[7, 1, 2, 14]]); rects(c, '#ffd23f', [[7, 2, 1, 12]]); return; }
  rects(c, '#9a5a00', [[x0, 2, w, 12], [x0 + 1, 1, w - 2, 14]]);
  rects(c, '#ffd23f', [[x0 + 1, 2, w - 2, 12]]);
  rects(c, '#fff3b0', [[x0 + 1, 3, 1, 9]]);
  if (w >= 10) rects(c, '#e8a317', [[7, 4, 2, 8]]);
}

const tilesetCache = new Map();
function getTileset(name) {
  if (tilesetCache.has(name)) return tilesetCache.get(name);
  const th = THEMES[name], set = {};
  const mk = (key, fn) => { const cv = makeCanvas(16, 16); fn(cv.getContext('2d')); set[key] = cv; };
  mk('ground', c => paintGround(c, th, false));
  mk('groundTop', c => paintGround(c, th, true));
  mk('brick', c => paintBrick(c, th));
  for (let f = 0; f < 3; f++) mk('q' + f, c => paintQuestion(c, f));
  mk('used', paintUsed);
  mk('solid', c => paintSolid(c, th));
  for (const p of ['TL', 'TR', 'L', 'R']) mk('pipe' + p, c => paintPipe(c, p));
  mk('semi', c => paintSemi(c, th));
  for (let f = 0; f < 4; f++) { mk('lava' + f, c => paintLava(c, f)); mk('coin' + f, c => paintCoin(c, f)); }
  mk('lavaDeep', paintLavaDeep);
  tilesetCache.set(name, set);
  return set;
}

// ---- backgrounds (pre-rendered tileable parallax layers) -------------------
const BG_W = 512;
function bandSky(colors) {
  const c = makeCanvas(VIEW_W, VIEW_H), g = c.getContext('2d');
  const band = Math.ceil(VIEW_H / colors.length);
  colors.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * band, VIEW_W, band); });
  // 2-row dither between bands for a soft-but-pixel transition
  for (let i = 1; i < colors.length; i++) {
    g.fillStyle = colors[i];
    for (let x = 0; x < VIEW_W; x += 2) g.fillRect(x + (i % 2), i * band - 1, 1, 1);
    g.fillStyle = colors[i - 1];
    for (let x = 0; x < VIEW_W; x += 2) g.fillRect(x + ((i + 1) % 2), i * band, 1, 1);
  }
  return c;
}
function periodic(x, terms) {
  let v = 0;
  for (const [a, k, p] of terms) v += a * Math.sin((x / BG_W) * Math.PI * 2 * k + p);
  return v;
}
function ridgeLayer(baseY, terms, fill, edge, extra) {
  const c = makeCanvas(BG_W, VIEW_H), g = c.getContext('2d');
  for (let x = 0; x < BG_W; x++) {
    const top = Math.round(baseY - periodic(x, terms));
    g.fillStyle = fill; g.fillRect(x, top, 1, VIEW_H - top);
    if (edge) { g.fillStyle = edge; g.fillRect(x, top, 1, 2); }
    if (extra) extra(g, x, top);
  }
  return c;
}
function wrapDraw(g, w, fn) { fn(0); fn(-w); fn(w); }

const bgCache = new Map();
function getBackground(name) {
  if (bgCache.has(name)) return bgCache.get(name);
  let bg;
  const rng = mulberry32(hashStr(name));
  if (name === 'meadow') {
    const mountains = ridgeLayer(150, [[22, 2, 0.5], [12, 5, 1.7], [5, 11, 0.2]], '#a2b9e8', '#c9d8f6', (g, x, top) => {
      if (top < 112) { g.fillStyle = '#f2f6ff'; g.fillRect(x, top, 1, 4 + (x % 3)); }
    });
    const clouds = makeCanvas(BG_W, VIEW_H);
    {
      const g = clouds.getContext('2d');
      const list = [[40, 34, 1], [170, 60, 0.75], [300, 26, 1.15], [430, 52, 0.85]];
      for (const [cx, cy, s] of list) wrapDraw(g, BG_W, off => {
        const parts = [[0, 0, 12], [14, -5, 14], [30, 0, 11], [-12, 3, 8], [42, 4, 8]];
        for (const [dx, dy, r] of parts) blob(g, cx + off + dx * s, cy + dy * s + 2, Math.round(r * s), '#d6e9fb');
        for (const [dx, dy, r] of parts) blob(g, cx + off + dx * s, cy + dy * s, Math.round(r * s), '#ffffff');
      });
    }
    const hills = ridgeLayer(176, [[16, 3, 0], [9, 7, 2], [4, 13, 1]], '#58b96b', '#86dc8f', (g, x, top) => {
      if ((x * 7 + top) % 23 === 0) { g.fillStyle = '#3f9a55'; g.fillRect(x, top + 8 + (x % 11), 2, 2); }
    });
    bg = {
      sky: bandSky(['#4a9cf0', '#5aa9f2', '#6db6f4', '#82c3f6', '#99d0f8', '#b3ddfa', '#cde9fb']),
      layers: [{ c: mountains, f: 0.12 }, { c: clouds, f: 0.2, drift: 0.08 }, { c: hills, f: 0.4 }],
    };
  } else if (name === 'cave') {
    const far = makeCanvas(BG_W, VIEW_H);
    {
      const g = far.getContext('2d');
      g.fillStyle = '#1b1745';
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(rng() * BG_W), len = 20 + Math.floor(rng() * 50), w = 6 + Math.floor(rng() * 10);
        wrapDraw(g, BG_W, off => {
          for (let y = 0; y < len; y++) { const ww = Math.max(1, Math.round(w * (1 - y / len))); g.fillRect(x + off - (ww >> 1), y + 24, ww, 1); }
          for (let y = 0; y < len * 0.8; y++) { const ww = Math.max(1, Math.round(w * (y / (len * 0.8)))); g.fillRect(x + 20 + off - (ww >> 1), VIEW_H - len * 0.8 + y, ww, 1); }
        });
      }
    }
    const mid = makeCanvas(BG_W, VIEW_H);
    {
      const g = mid.getContext('2d');
      for (let i = 0; i < 9; i++) {
        const x = Math.floor(rng() * BG_W), y = 60 + Math.floor(rng() * 110), col = rng() < 0.5 ? '#5ef2ff' : '#ff7ad9';
        wrapDraw(g, BG_W, off => {
          g.globalAlpha = 0.06; blob(g, x + off, y, 12, col); g.globalAlpha = 0.1; blob(g, x + off, y, 7, col); g.globalAlpha = 1;
          for (let k = 0; k < 3; k++) {
            const h = 6 + k * 3, sx = x + off - 5 + k * 4;
            for (let j = 0; j < h; j++) { const ww = j < 2 ? 1 : 3; g.fillStyle = j < 2 ? '#ffffff' : col; g.fillRect(sx - (ww >> 1), y - h + j + 4, ww, 1); }
          }
        });
      }
      g.fillStyle = '#231d55';
      for (let x = 0; x < BG_W; x++) { const h = Math.round(18 + periodic(x, [[8, 3, 0], [5, 8, 1]])); g.fillRect(x, VIEW_H - h, 1, h); }
    }
    bg = { sky: bandSky(['#07061a', '#0b0a24', '#100e2f', '#16123a', '#1c1645', '#221a50', '#281d58']), layers: [{ c: far, f: 0.15 }, { c: mid, f: 0.35 }] };
  } else {
    const moon = makeCanvas(BG_W, VIEW_H);
    {
      const g = moon.getContext('2d');
      g.globalAlpha = 0.15; blob(g, 330, 62, 40, '#ff8a5a'); g.globalAlpha = 1;
      blob(g, 330, 62, 26, '#ffb38a'); blob(g, 322, 55, 5, '#e8906a'); blob(g, 340, 70, 7, '#e8906a'); blob(g, 336, 48, 3, '#e8906a');
    }
    const spires = makeCanvas(BG_W, VIEW_H);
    {
      const g = spires.getContext('2d');
      for (let i = 0; i < 9; i++) {
        const x = Math.floor(i * BG_W / 9 + rng() * 20), w = 14 + Math.floor(rng() * 14), h = 60 + Math.floor(rng() * 70);
        wrapDraw(g, BG_W, off => {
          g.fillStyle = '#2b0d1f'; g.fillRect(x + off, VIEW_H - h, w, h);
          for (let j = 0; j < w / 2 + 2; j++) g.fillRect(x + off + j, VIEW_H - h - (w / 2 + 2) + j, w - j * 2, 1);
          g.fillStyle = '#ff9a3c';
          for (let wy = VIEW_H - h + 14; wy < VIEW_H - 30; wy += 18) if (rng() < 0.7) g.fillRect(x + off + (w >> 1) - 1, wy, 2, 4);
        });
      }
    }
    const walls = makeCanvas(BG_W, VIEW_H);
    {
      const g = walls.getContext('2d');
      const top = 138;
      g.fillStyle = '#3d1426'; g.fillRect(0, top, BG_W, VIEW_H - top);
      for (let x = 0; x < BG_W; x += 16) g.fillRect(x, top - 8, 8, 8);
      g.fillStyle = '#2a0c1a';
      for (let x = 24; x < BG_W; x += 64) { g.fillRect(x, top + 22, 16, 30); for (let j = 0; j < 8; j++) g.fillRect(x + j / 2 + 0.5 | 0, top + 14 + j, 16 - (j | 0), 1); }
      g.fillStyle = '#4e1a30';
      for (let y = top + 6; y < VIEW_H; y += 10) for (let x = (y / 10 % 2) * 12; x < BG_W; x += 24) g.fillRect(x, y, 10, 1);
    }
    bg = { sky: bandSky(['#12050c', '#1c0812', '#2a0c18', '#3d1020', '#57161f', '#7a2318', '#a1361a']), layers: [{ c: moon, f: 0.03 }, { c: spires, f: 0.18 }, { c: walls, f: 0.42 }] };
  }
  bgCache.set(name, bg);
  return bg;
}
function drawBackground(ctx, name, cam, t) {
  const bg = getBackground(name);
  ctx.drawImage(bg.sky, 0, 0);
  for (const L of bg.layers) {
    const raw = -Math.round(cam * L.f + t * (L.drift || 0));
    const off = ((raw % BG_W) + BG_W) % BG_W;
    ctx.drawImage(L.c, off - BG_W, 0);
    ctx.drawImage(L.c, off, 0);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LEVEL COMPILER — turns registry data into a tile grid
// ═══════════════════════════════════════════════════════════════════════════
class Level {
  constructor(def) {
    this.def = def;
    this.w = def.width;
    this.themeName = def.theme;
    this.theme = THEMES[def.theme];
    this.tiles = new Uint8Array(this.w * ROWS);
    this.multi = new Map();
    this.bumps = [];
    for (const cmd of def.map) this.apply(cmd);
    const g = def.goal;
    if (g.type === 'pole') {
      this.set(g.x, 11, T.SOLID);
      this.poleX = g.x * TILE + 8;
      this.goalLine = g.x * TILE;
      this.castleX = (g.x + 4) * TILE;
      this.doorX = (g.x + 6) * TILE + 8;
    } else {
      for (let i = -1; i <= 1; i++) this.set(g.x + i, 11, T.SOLID);
      this.crystalX = g.x * TILE + 8;
      this.goalLine = (g.x - 1) * TILE;
    }
    this.genDecor();
  }
  apply(cmd) {
    const [op, ...a] = cmd;
    switch (op) {
      case 'ground': { const [x0, x1, top = 12] = a; for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) this.set(x, y, T.GROUND); break; }
      case 'row': { const [x, y, s] = a; for (let i = 0; i < s.length; i++) { const t = TILE_CHARS[s[i]]; if (t !== undefined) this.set(x + i, y, t); } break; }
      case 'rect': { const [x0, y0, x1, y1, ch] = a; const t = TILE_CHARS[ch] || 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t); break; }
      case 'pipe': {
        const [x, h] = a, top = 12 - h;
        this.set(x, top, T.PIPE_TL); this.set(x + 1, top, T.PIPE_TR);
        for (let y = top + 1; y < 12; y++) { this.set(x, y, T.PIPE_L); this.set(x + 1, y, T.PIPE_R); }
        break;
      }
      case 'stairs': { const [x, n, dir] = a; for (let i = 0; i < n; i++) { const hgt = dir > 0 ? i + 1 : n - i; for (let y = 12 - hgt; y < 12; y++) this.set(x + i, y, T.SOLID); } break; }
      case 'coins': { const [x, y, n] = a; for (let i = 0; i < n; i++) this.set(x + i, y, T.COIN); break; }
      case 'lava': { const [x0, x1] = a; for (let x = x0; x <= x1; x++) this.set(x, 13, T.LAVA); break; }
      default: console.warn('OMIRA: unknown map command', op);
    }
  }
  set(x, y, t) { if (x >= 0 && x < this.w && y >= 0 && y < ROWS) this.tiles[y * this.w + x] = t; }
  get(x, y) { return x < 0 || x >= this.w || y < 0 || y >= ROWS ? 0 : this.tiles[y * this.w + x]; }
  solid(x, y) {
    if (x < 0 || x >= this.w) return true;      // level edges are walls
    if (y < 0 || y >= ROWS) return false;
    return SOLID[this.tiles[y * this.w + x]] === 1;
  }
  surfaceRow(x) { for (let y = 1; y < ROWS; y++) if (this.solid(x, y) && !this.solid(x, y - 1)) return y; return ROWS; }
  genDecor() {
    const rng = mulberry32(hashStr(this.def.id));
    const d = this.decor = [];
    const theme = this.themeName;
    for (let x = 1; x < this.w - 1; x++) {
      if (this.def.goal && Math.abs(x - this.def.goal.x) < 11 && x > this.def.goal.x - 2) continue;
      for (let y = 2; y < ROWS; y++) {
        if (this.get(x, y) !== T.GROUND || this.get(x, y - 1) !== T.EMPTY) continue;
        const r = rng();
        if (theme === 'meadow') {
          if (r < 0.07 && this.get(x + 1, y) === T.GROUND && this.get(x + 2, y) === T.GROUND && !this.get(x + 1, y - 1) && !this.get(x + 2, y - 1)) { d.push({ k: 'bush', x: x * TILE, y: y * TILE, s: rng() }); x += 3; }
          else if (r < 0.2) d.push({ k: 'flower', x: x * TILE + Math.floor(rng() * 10), y: y * TILE, c: ['#ff7aa8', '#fff1a8', '#ffffff', '#b4a2ff'][Math.floor(rng() * 4)] });
          else if (r < 0.32) d.push({ k: 'tuft', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        } else if (theme === 'cave') {
          if (r < 0.13) d.push({ k: 'crystal', x: x * TILE + Math.floor(rng() * 8) + 2, y: y * TILE, c: rng() < 0.6 ? '#5ef2ff' : '#ff7ad9', p: rng() * 6 });
          else if (r < 0.2) d.push({ k: 'shroomlet', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        } else {
          if (r < 0.06) d.push({ k: 'torch', x: x * TILE + 6, y: y * TILE, p: rng() * 6 });
          else if (r < 0.14) d.push({ k: 'rubble', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        }
        break;
      }
      if (theme === 'cave' && this.solid(x, 1) && !this.solid(x, 2) && rng() < 0.3) {
        d.push({ k: 'stalactite', x: x * TILE + Math.floor(rng() * 10) + 2, y: 2 * TILE, len: 4 + Math.floor(rng() * 9) });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. ENTITIES
// ═══════════════════════════════════════════════════════════════════════════
// Axis-separated tile collision. Moves are always < 1 tile per frame, so only the
// leading edge needs checking — no tunnelling is possible.
function sweepX(lv, e, dx) {
  if (!dx) return 0;
  e.x += dx;
  const top = Math.floor(e.y / TILE), bot = Math.floor((e.y + e.h - 0.01) / TILE);
  if (dx > 0) {
    const c = Math.floor((e.x + e.w - 0.01) / TILE);
    for (let r = top; r <= bot; r++) if (lv.solid(c, r)) { e.x = c * TILE - e.w; return 1; }
  } else {
    const c = Math.floor(e.x / TILE);
    for (let r = top; r <= bot; r++) if (lv.solid(c, r)) { e.x = (c + 1) * TILE; return -1; }
  }
  return 0;
}
function sweepY(lv, e, dy) {
  const prevBottom = e.y + e.h;
  e.y += dy;
  const c0 = Math.floor(e.x / TILE), c1 = Math.floor((e.x + e.w - 0.01) / TILE);
  if (dy > 0) {
    const r = Math.floor((e.y + e.h) / TILE);
    for (let c = c0; c <= c1; c++) {
      if (lv.solid(c, r) || (lv.get(c, r) === T.SEMI && prevBottom <= r * TILE + 0.5)) { e.y = r * TILE - e.h; return 1; }
    }
  } else if (dy < 0) {
    const r = Math.floor(e.y / TILE);
    for (let c = c0; c <= c1; c++) if (lv.solid(c, r)) { e.y = (r + 1) * TILE; return -1; }
  }
  return 0;
}

class Enemy {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.t = 0;
    this.dead = false; this.remove = false; this.flipped = false; this.deadT = 0;
    this.stompable = true; this.fireKill = true; this.shellKill = true; this.bumpKill = true;
    this.walker = false; this.onGround = false;
  }
  get cx() { return this.x + this.w / 2; }
  hitbox() { return this; }
  touches(p) { const b = this.hitbox(); return !!b && overlap(b, p); }
  onTouch(g, p) {
    if (this.stompable && g.isStomp(p, this)) this.stomp(g, p);
    else g.hurtPlayer();
  }
  stomp(g, p) { this.flipKill(g, 0); g.bounce(p); g.stompScore(this); Sound.play('stomp'); }
  flipKill(g, dir) {
    this.dead = true; this.flipped = true; this.deadT = 0;
    this.vy = -4.5; this.vx = dir * 1.2;
  }
  updateDead() {
    this.deadT++;
    if (this.flipped) {
      this.vy = Math.min(this.vy + 0.3, 6);
      this.x += this.vx; this.y += this.vy;
      if (this.y > VIEW_H + 32) this.remove = true;
    } else if (this.deadT > 30) this.remove = true;
  }
  walk(g, smart) {
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx;
    const r = sweepY(lv, this, this.vy);
    if (r === 1) {
      this.vy = 0; this.onGround = true;
      if (smart && this.vx) {
        const ac = this.vx > 0 ? Math.floor((this.x + this.w + 1) / TILE) : Math.floor((this.x - 1) / TILE);
        const br = Math.floor((this.y + this.h + 1) / TILE);
        if (!lv.solid(ac, br) && lv.get(ac, br) !== T.SEMI) this.vx = -this.vx;
      }
    } else {
      this.onGround = false;
      if (r === -1) this.vy = 0;
    }
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 160) this.remove = true;
  }
}

class Grumblet extends Enemy {
  constructor(col, row, theme) {
    super(col * TILE + 1, (row + 1) * TILE - 15, 14, 15);
    this.vx = -0.5; this.walker = true; this.theme = theme;
  }
  update(g) { this.t++; this.walk(g, false); }
  stomp(g, p) {
    this.dead = true; this.squashed = true; this.deadT = 0; this.vx = 0;
    g.bounce(p); g.stompScore(this); Sound.play('stomp');
    g.dust(this.cx, this.y + this.h, 6); g.shake = Math.max(g.shake, 1.5);
  }
  draw(ctx) {
    if (this.squashed) { drawSprite(ctx, SPR.grumbletFlat[this.theme], this.cx, this.y + this.h, false); return; }
    drawSprite(ctx, SPR.grumblet[this.theme], this.cx, this.y + this.h, Math.floor(this.t / 10) % 2 === 0, 1, 1, this.flipped);
  }
}

class Shellback extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 15, 14, 15);
    this.vx = -0.55; this.walker = true; this.state = 'walk'; this.shellT = 0; this.grace = 0; this.combo = 0;
  }
  update(g) {
    this.t++;
    if (this.grace > 0) this.grace--;
    if (this.state === 'walk') this.walk(g, true);
    else if (this.state === 'shell') {
      this.vx = 0;
      this.walk(g, false);
      if (++this.shellT > 480) {
        this.state = 'walk';
        this.vx = g.player.x + g.player.w / 2 < this.cx ? -0.55 : 0.55;
      }
    } else {
      const lv = g.level;
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) {
        this.vx = -this.vx;
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('bump');
      }
      if (sweepY(lv, this, this.vy)) this.vy = 0;
      if (this.y > VIEW_H + 32 || this.x > g.camX + VIEW_W + 64 || this.x + this.w < g.camX - 64) this.remove = true;
    }
  }
  kick(g, p) {
    const dir = p.x + p.w / 2 < this.cx ? 1 : -1;
    this.state = 'slide'; this.walker = false; this.grace = 12; this.combo = 0;
    this.vx = 3.8 * dir;
    sweepX(g.level, this, dir > 0 ? (p.x + p.w) - this.x + 1 : (p.x - this.w) - this.x - 1);
    Sound.play('kick');
    g.addScore(400, this.cx, this.y);
  }
  onTouch(g, p) {
    const stomp = g.isStomp(p, this);
    if (this.state === 'walk') {
      if (stomp) {
        this.state = 'shell'; this.vx = 0; this.shellT = 0;
        g.bounce(p); g.stompScore(this); Sound.play('stomp'); g.dust(this.cx, this.y + this.h, 5);
      } else g.hurtPlayer();
    } else if (this.state === 'shell') {
      this.kick(g, p);
      if (stomp) g.bounce(p);
    } else if (this.grace <= 0) {
      if (stomp) {
        this.state = 'shell'; this.walker = true; this.vx = 0; this.shellT = 0;
        g.bounce(p); g.addScore(100, this.cx, this.y); Sound.play('stomp');
      } else g.hurtPlayer();
    }
  }
  draw(ctx) {
    if (this.state === 'walk' && !this.dead) {
      const img = Math.floor(this.t / 9) % 2 ? SPR.shellbackB : SPR.shellbackA;
      drawSprite(ctx, img, this.cx, this.y + this.h, this.vx < 0);
    } else {
      const shake = this.state === 'shell' && this.shellT > 400 ? (Math.floor(this.t / 2) % 2 ? 1 : -1) : 0;
      drawSprite(ctx, SPR.shell, this.cx + shake, this.y + this.h, false, 1, 1, this.flipped);
    }
  }
}

class Spikelet extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 14, 14, 14);
    this.vx = -0.6; this.walker = true; this.stompable = false;
  }
  update(g) { this.t++; this.walk(g, false); }
  draw(ctx) {
    const img = Math.floor(this.t / 8) % 2 ? SPR.spikeletB : SPR.spikeletA;
    drawSprite(ctx, img, this.cx, this.y + this.h + 1, this.vx < 0, 1, 1, this.flipped);
  }
}

class Flutter extends Enemy {
  constructor(col, row, hang) {
    super(col * TILE + 1, row * TILE + 2, 14, 11);
    this.hang = hang; this.state = 'idle'; this.baseY = this.y; this.dir = -1;
  }
  update(g) {
    this.t++;
    const p = g.player, pcx = p.x + p.w / 2;
    if (this.state === 'idle') {
      if (!this.hang) this.y = this.baseY + Math.sin(this.t * 0.05) * 3;
      if (Math.abs(pcx - this.cx) < 120) { this.state = 'fly'; this.dir = pcx < this.cx ? -1 : 1; this.t = 0; }
      return;
    }
    this.vx = this.dir * 1.0;
    this.x += this.vx;
    const ty = clamp(p.y + p.h / 2 - 8, 40, 176);
    this.baseY += clamp(ty - this.baseY, -0.7, 0.7);
    this.y = this.baseY + Math.sin(this.t * 0.09) * 12;
    if ((this.dir > 0 && this.cx - pcx > 90) || (this.dir < 0 && pcx - this.cx > 90)) this.dir = -this.dir;
    if (this.x + this.w < g.camX - 160) this.remove = true;
  }
  draw(ctx) {
    if (this.state === 'idle' && this.hang) { drawSprite(ctx, SPR.flutterDown, this.cx, this.y + this.h, false, 1, 1, true); return; }
    const img = Math.floor(this.t / 6) % 2 ? SPR.flutterDown : SPR.flutterUp;
    drawSprite(ctx, img, this.cx, this.y + this.h, this.dir > 0, 1, 1, this.flipped);
  }
}

class Snapvine extends Enemy {
  constructor(pipeCol, topRow) {
    super(pipeCol * TILE + 8, topRow * TILE, 16, 24);
    this.baseY = topRow * TILE; this.off = 24; this.state = 'wait'; this.timer = 60;
    this.stompable = false; this.bumpKill = false; this.behindTiles = true;
  }
  update(g) {
    this.t++;
    const p = g.player;
    switch (this.state) {
      case 'wait':
        if (--this.timer <= 0) {
          if (Math.abs(p.x + p.w / 2 - (this.x + 8)) < 30) this.timer = 30;
          else this.state = 'up';
        }
        break;
      case 'up': this.off -= 0.75; if (this.off <= 0) { this.off = 0; this.state = 'out'; this.timer = 80; } break;
      case 'out': if (--this.timer <= 0) this.state = 'down'; break;
      case 'down': this.off += 0.75; if (this.off >= 24) { this.off = 24; this.state = 'wait'; this.timer = 80; } break;
    }
    this.y = this.baseY - 24 + this.off;
  }
  hitbox() {
    if (this.off >= 21) return null;
    const top = this.y + 2;
    return { x: this.x + 3, y: top, w: 10, h: this.baseY - top };
  }
  draw(ctx) { drawSprite(ctx, Math.floor(this.t / 10) % 2 ? SPR.vineOpen : SPR.vineShut, this.x + 8, this.y + 24, false, 1, 1, this.flipped); }
}

class Firebar extends Enemy {
  constructor(col, row, len, speed) {
    super(col * TILE, row * TILE, 16, 16);
    this.px = col * TILE + 8; this.py = row * TILE + 8; this.len = len; this.speed = speed;
    this.a = -Math.PI / 2;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update() { this.t++; this.a += this.speed; }
  hitbox() { return null; }
  touches(p) {
    const bx0 = p.x + 2, by0 = p.y + 2, bx1 = p.x + p.w - 2, by1 = p.y + p.h - 2;
    for (let i = 1; i < this.len; i++) {
      const x = this.px + Math.cos(this.a) * i * 8, y = this.py + Math.sin(this.a) * i * 8;
      const nx = clamp(x, bx0, bx1), ny = clamp(y, by0, by1);
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < 12) return true;
    }
    return false;
  }
  onTouch(g) { g.hurtPlayer(); }
  draw(ctx) {
    for (let i = 0; i < this.len; i++) {
      const x = this.px + Math.cos(this.a) * i * 8, y = this.py + Math.sin(this.a) * i * 8;
      blob(ctx, x, y, 4, (this.t + i) % 6 < 3 ? '#ff6a1f' : '#ff8a2a');
      blob(ctx, x, y, 2, '#ffe08a');
    }
  }
}

class Ember extends Enemy {
  constructor(col) {
    super(col * TILE + 2, VIEW_H + 8, 12, 14);
    this.baseY = VIEW_H + 8; this.wait = 20 + (col * 37) % 70;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    if (this.wait > 0) {
      if (--this.wait === 0) {
        this.vy = -7.2;
        if (this.x > g.camX && this.x < g.camX + VIEW_W) Sound.play('sizzle');
      }
      return;
    }
    this.vy += 0.25;
    this.y += this.vy;
    if (this.vy < 0 && this.t % 3 === 0) g.spark(this.x + 6 + rand(-3, 3), this.y + 14, '#ff8a2a', 18);
    if (this.y >= this.baseY && this.vy > 0) { this.y = this.baseY; this.vy = 0; this.wait = 110; }
  }
  hitbox() { return this.y < VIEW_H ? { x: this.x + 1, y: this.y + 1, w: 10, h: 12 } : null; }
  draw(ctx) {
    if (this.y >= VIEW_H) return;
    const cx = this.x + 6, cy = this.y + 7, down = this.vy > 0;
    blob(ctx, cx, cy + (down ? -6 : 6), 3, '#ff6a1f');
    blob(ctx, cx, cy, 6, '#e8401a');
    blob(ctx, cx, cy, 5, '#ff8a2a');
    blob(ctx, cx, cy - (down ? -1 : 1), 3, '#ffe08a');
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(cx - 3), Math.round(cy - 1), 2, 2);
    ctx.fillRect(Math.round(cx + 1), Math.round(cy - 1), 2, 2);
  }
}

class Item {
  constructor(kind, col, row) {
    this.kind = kind;
    this.x = col * TILE + 1; this.w = 14; this.h = 16;
    this.baseY = row * TILE; this.y = this.baseY;
    this.emerge = 0; this.vx = 0; this.vy = 0; this.t = 0; this.remove = false;
  }
  get emerging() { return this.emerge < 16; }
  update(g) {
    this.t++;
    if (this.emerging) {
      this.emerge += 0.5;
      this.y = this.baseY - this.emerge;
      if (!this.emerging && this.kind !== 'bloom') this.vx = 1.1;
      return;
    }
    if (this.kind === 'bloom') return;
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx;
    if (sweepY(lv, this, this.vy)) this.vy = 0;
    if (this.y > VIEW_H + 20 || this.x + this.w < g.camX - 64) this.remove = true;
  }
  draw(ctx) {
    const img = this.kind === 'shroom' ? SPR.shroom : this.kind === 'oneup' ? SPR.oneup : (Math.floor(this.t / 6) % 2 ? SPR.bloomB : SPR.bloomA);
    drawSprite(ctx, img, this.x + 7, this.y + 16, false);
  }
}

class Fireball {
  constructor(x, y, dir) { this.x = x; this.y = y; this.w = 8; this.h = 8; this.vx = dir * 4.2; this.vy = 1.5; this.t = 0; this.remove = false; }
  update(g) {
    this.t++;
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.4, 5);
    if (sweepX(lv, this, this.vx)) { this.pop(g); return; }
    const r = sweepY(lv, this, this.vy);
    if (r === 1) this.vy = -3.4; else if (r === -1) this.vy = 1;
    if (this.y > VIEW_H || this.x < g.camX - 16 || this.x > g.camX + VIEW_W + 16) { this.remove = true; return; }
    for (const e of g.entities) {
      if (e.dead || !e.fireKill) continue;
      const b = e.hitbox();
      if (b && overlap(this, b)) {
        e.flipKill(g, Math.sign(this.vx));
        g.addScore(200, e.cx, e.y);
        Sound.play('kick');
        this.pop(g);
        return;
      }
    }
  }
  pop(g) {
    this.remove = true;
    for (let i = 0; i < 6; i++) g.spark(this.x + 4, this.y + 4, i % 2 ? '#ffd166' : '#ff8a2a', 14, rand(-1.5, 1.5), rand(-1.5, 1.5));
  }
  draw(ctx) {
    const cx = this.x + 4, cy = this.y + 4;
    blob(ctx, cx, cy, 4, '#ff6a1f');
    blob(ctx, cx, cy, 2, '#ffe08a');
    const a = this.t * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(cx + Math.cos(a) * 3), Math.round(cy + Math.sin(a) * 3), 1, 1);
  }
}

class Platform {
  constructor(col, row, wt, axis, range, period, phase = 0) {
    this.x0 = col * TILE; this.y0 = row * TILE; this.w = wt * TILE; this.h = 8;
    this.axis = axis; this.range = range * TILE; this.period = period; this.phase = phase; this.t = 0;
    this.dx = 0; this.dy = 0;
    this.place();
    this.prevY = this.y;
  }
  place() {
    const k = 0.5 - 0.5 * Math.cos((this.t / this.period + this.phase) * Math.PI * 2);
    this.x = this.axis === 'h' ? this.x0 + this.range * k : this.x0;
    this.y = this.axis === 'v' ? this.y0 + this.range * k : this.y0;
  }
  update() {
    const ox = this.x, oy = this.y;
    this.t++;
    this.place();
    this.dx = this.x - ox; this.dy = this.y - oy; this.prevY = oy;
  }
  draw(ctx, th) {
    const [b, d, l] = th.plat;
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = d; ctx.fillRect(x, y, this.w, this.h);
    ctx.fillStyle = b; ctx.fillRect(x + 1, y + 1, this.w - 2, this.h - 3);
    ctx.fillStyle = l; ctx.fillRect(x + 1, y + 1, this.w - 2, 1);
    ctx.fillStyle = d;
    for (let i = 4; i < this.w - 2; i += 8) ctx.fillRect(x + i, y + 3, 2, 2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. GAME
// ═══════════════════════════════════════════════════════════════════════════
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.mode = 'title';
    this.t = 0; this.menu = 0;
    this.top = parseInt(safeStorage.get('omira-top') || '0', 10) || 0;
    this.lives = 3; this.score = 0; this.coins = 0; this.power = 0; this.levelIndex = 0;
    this.fade = 1; this.fadeTarget = 0; this.fadeCb = null;
    this.ambient = []; this.particles = [];
    this.titleCam = 0; this.flash = 0; this.shake = 0;
    this.player = null; this.level = null;
    this.menuHits = []; this.touch = false;
    Music.play('title');
  }

  // ---------- flow ----------------------------------------------------------
  transition(cb) {
    if (this.fadeCb) return;
    this.fadeTarget = 1; this.fadeCb = cb;
  }
  updateFade() {
    if (this.fadeTarget === 1) {
      this.fade = Math.min(1, this.fade + 0.07);
      if (this.fade >= 1) { const cb = this.fadeCb; this.fadeCb = null; this.fadeTarget = 0; if (cb) cb(); }
    } else this.fade = Math.max(0, this.fade - 0.07);
  }
  saveTop() {
    if (this.score > this.top) { this.top = this.score; safeStorage.set('omira-top', String(this.top)); }
  }
  newGame() {
    this.lives = 3; this.score = 0; this.coins = 0; this.power = 0; this.levelIndex = 0;
    this.enterLevel();
  }
  enterLevel() {
    this.snapshot = { score: this.score, coins: this.coins, power: this.power };
    this.useCheckpoint = false;
    this.toIntro();
  }
  toIntro() { this.mode = 'intro'; this.introT = 0; this.time = LEVELS[this.levelIndex].time; Music.stop(); }
  toTitle() { this.saveTop(); this.mode = 'title'; this.menu = 0; this.particles = []; Music.play('title'); }
  toGameOver() { this.saveTop(); this.mode = 'gameover'; this.menu = 0; Music.play('gameover'); }
  pause() { this.mode = 'pause'; this.menu = 0; Sound.play('pause'); Music.stop(); }
  resume() { this.mode = 'play'; Music.play(this.levelMusic, this.hurry ? 1.3 : 1); }

  startLevel() {
    const def = LEVELS[this.levelIndex];
    const lv = this.level = new Level(def);
    this.levelMusic = def.music;
    this.entities = []; this.items = []; this.fireballs = []; this.particles = [];
    this.platforms = def.entities.filter(e => e[0] === 'platform').map(e => new Platform(e[1], e[2], e[3], e[4], e[5], e[6], e[7]));
    this.spawnQueue = def.entities.filter(e => e[0] !== 'platform').map(e => ({ def: e, x: e[1] * TILE })).sort((a, b) => a.x - b.x);
    const col = this.useCheckpoint && def.checkpoint ? def.checkpoint : def.start;
    const p = this.player = {
      x: col * TILE + 2, y: 0, w: PLAYER_W, h: this.power ? BIG_H : SMALL_H, vx: 0, vy: 0,
      power: this.power, facing: 1, onGround: false, coyote: 0, jumpBuf: 0, jumping: false, airMax: WALK_MAX,
      invuln: 0, anim: 0, sx: 1, sy: 1, state: 'play', platform: null, skid: false, combo: 0,
      prevY: 0, fallV: 0, hidden: false, deadT: 0, celebT: 0,
    };
    p.y = lv.surfaceRow(col) * TILE - p.h;
    p.prevY = p.y;
    this.time = def.time; this.timeAcc = 0; this.hurry = false;
    this.checkpointReached = this.useCheckpoint && !!def.checkpoint;
    this.freezeT = 0; this.freezeFrom = 0; this.tally = false; this.tallyT = 0;
    this.flash = 0; this.shake = 0; this.look = 0;
    this.flagY = 2 * TILE + 10; this.flagPhase = 0; this.flagT = 0;
    this.updateCamera(true);
    this.spawnQueue = this.spawnQueue.filter(s => s.x >= this.camX - 32);
    this.mode = 'play';
    Music.play(def.music);
  }
  finishLevel() {
    this.power = this.player.power;
    this.saveTop();
    if (this.levelIndex + 1 < LEVELS.length) { this.mode = 'clear'; this.clearT = 0; }
    else { this.mode = 'ending'; this.endT = 0; this.particles = []; Music.play('ending'); }
  }
  afterDeath() {
    this.lives--;
    this.power = 0;
    if (this.lives <= 0) this.toGameOver();
    else { this.useCheckpoint = this.checkpointReached; this.toIntro(); }
  }

  // ---------- update ---------------------------------------------------------
  update() {
    this.t++;
    this.updateFade();
    const busy = !!this.fadeCb;
    const confirm = Input.hit('start') || Input.hit('jump');
    switch (this.mode) {
      case 'title': {
        this.titleCam += 0.6;
        if (busy) break;
        if (Input.hit('up') || Input.hit('down')) { this.menu = 1 - this.menu; Sound.play('select'); }
        if (confirm) {
          if (this.menu === 0) { Sound.play('confirm'); this.transition(() => this.newGame()); }
          else toggleMute();
        }
        break;
      }
      case 'intro':
        this.introT++;
        if (!busy && (this.introT > 150 || (this.introT > 30 && confirm))) this.transition(() => this.startLevel());
        break;
      case 'play': this.updatePlay(busy); break;
      case 'pause': {
        if (busy) break;
        if (Input.hit('pause')) { this.resume(); break; }
        if (Input.hit('up')) { this.menu = (this.menu + 3) % 4; Sound.play('select'); }
        if (Input.hit('down')) { this.menu = (this.menu + 1) % 4; Sound.play('select'); }
        if (confirm) {
          if (this.menu === 0) this.resume();
          else if (this.menu === 1) this.transition(() => {
            Object.assign(this, { score: this.snapshot.score, coins: this.snapshot.coins, power: this.snapshot.power });
            this.useCheckpoint = false; this.toIntro();
          });
          else if (this.menu === 2) toggleMute();
          else this.transition(() => this.toTitle());
        }
        break;
      }
      case 'clear':
        this.clearT++;
        this.updateParticles();
        if (!busy && this.clearT > 60 && (confirm || this.clearT > 420)) {
          this.transition(() => { this.levelIndex++; this.enterLevel(); });
        }
        break;
      case 'gameover':
        if (busy) break;
        if (Input.hit('up') || Input.hit('down')) { this.menu = 1 - this.menu; Sound.play('select'); }
        if (confirm) {
          Sound.play('confirm');
          if (this.menu === 0) this.transition(() => { this.lives = 3; this.score = 0; this.coins = 0; this.power = 0; this.enterLevel(); });
          else this.transition(() => this.toTitle());
        }
        break;
      case 'ending':
        this.endT++;
        if (this.endT % 45 === 0) this.firework();
        this.updateParticles();
        if (!busy && this.endT > 120 && confirm) this.transition(() => this.toTitle());
        break;
    }
    this.updateAmbient();
  }

  updatePlay(busy) {
    const p = this.player;
    if (!busy && Input.hit('pause') && p.state !== 'dead' && !this.tally) { this.pause(); return; }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - 0.04);
    this.shake *= 0.85;
    if (this.freezeT > 0) { this.freezeT--; this.updateParticles(); return; }
    if (p.state === 'dead') { this.updateDeath(); this.updateParticles(); return; }

    for (const pl of this.platforms) pl.update();
    this.spawnEntities();
    this.updatePlayer();
    for (const e of this.entities) { if (e.dead) e.updateDead(this); else e.update(this); }
    this.enemyInteractions();
    for (const it of this.items) {
      it.update(this);
      if (!it.emerging && p.state === 'play' && overlap(it, p)) { it.remove = true; this.collectItem(it); }
    }
    for (const f of this.fireballs) f.update(this);
    const lv = this.level;
    for (const b of lv.bumps) b.t++;
    lv.bumps = lv.bumps.filter(b => b.t < 10);
    this.updateParticles();

    if (p.state === 'play' && ++this.timeAcc >= 24) {
      this.timeAcc = 0;
      this.time--;
      if (this.time === 100 && !this.hurry) { this.hurry = true; Sound.play('hurry'); Music.play(this.levelMusic, 1.3); }
      if (this.time <= 0) { this.time = 0; this.killPlayer('time'); }
    }
    if (this.tally) {
      if (this.time > 0) {
        const d = Math.min(this.time, 2);
        this.time -= d; this.score += d * 50;
        if (this.t % 3 === 0) Sound.play('tick');
      } else if (++this.tallyT > 80) { this.tally = false; this.finishLevel(); }
    }
    this.updateCamera(false);
    this.entities = this.entities.filter(e => !e.remove);
    this.items = this.items.filter(i => !i.remove);
    this.fireballs = this.fireballs.filter(f => !f.remove);
  }

  updatePlayer() {
    const p = this.player, lv = this.level;
    p.prevY = p.y;
    if (p.invuln > 0) p.invuln--;
    p.sx += (1 - p.sx) * 0.2; p.sy += (1 - p.sy) * 0.2;
    switch (p.state) {
      case 'play': {
        const ctl = {
          dir: (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0),
          run: Input.down('run'),
          jumpHit: Input.hit('jump') || Input.hit('up'),
          jumpHeld: Input.down('jump') || Input.down('up'),
        };
        this.physics(p, ctl);
        if (Input.hit('run') && p.power === 2) this.throwFire();
        if (p.state === 'play') this.checkPlayerTiles();
        if (p.state === 'play') this.checkGoal();
        break;
      }
      case 'flag': this.updateFlag(); break;
      case 'walkout':
        this.physics(p, { dir: 1, run: false, jumpHit: false, jumpHeld: false });
        if (p.x + p.w / 2 >= lv.doorX) { p.hidden = true; p.state = 'done'; this.startTally(); }
        break;
      case 'celebrate':
        this.physics(p, { dir: 0, run: false, jumpHit: false, jumpHeld: false });
        if (++p.celebT % 40 === 0 && p.onGround) { p.vy = -3.5; p.onGround = false; }
        if (p.celebT % 12 === 0) this.burst(lv.crystalX + rand(-14, 14), 150 + rand(-14, 14), ['#bffff6', '#5ef2ff', '#ffffff', '#ff7ad9'], 6);
        if (p.celebT === 110) { p.state = 'done'; this.startTally(); }
        break;
      case 'done':
        if (!p.hidden) this.physics(p, { dir: 0, run: false, jumpHit: false, jumpHeld: false });
        break;
    }
    // Checkpoint
    const cp = lv.def.checkpoint;
    if (cp && !this.checkpointReached && p.state === 'play' && p.x > cp * TILE) {
      this.checkpointReached = true;
      Sound.play('checkpoint');
      this.popup(cp * TILE + 8, lv.surfaceRow(cp) * TILE - 40, 'CHECKPOINT');
      this.burst(cp * TILE + 8, lv.surfaceRow(cp) * TILE - 24, ['#2ec4b6', '#ffd166', '#ffffff'], 12);
    }
  }

  // Core platforming physics. `ctl` is {dir, run, jumpHit, jumpHeld}.
  physics(p, ctl) {
    const lv = this.level;
    this.unstick(p);
    if (p.platform) { sweepX(lv, p, p.platform.dx); p.y += p.platform.dy; }

    // Horizontal: momentum with walk/run caps, skidding and friction
    const dir = ctl.dir;
    if (p.onGround) {
      const max = ctl.run ? RUN_MAX : WALK_MAX;
      p.skid = false;
      if (dir !== 0) {
        p.facing = dir;
        const sp = Math.abs(p.vx);
        if (p.vx * dir < 0) {
          p.vx += dir * SKID; p.skid = true;
          if (this.t % 5 === 0) this.dust(p.x + p.w / 2, p.y + p.h, 1);
        } else if (sp <= max) p.vx = dir * Math.min(max, sp + (sp < WALK_MAX ? ACCEL : RUN_ACCEL));
        else p.vx -= Math.sign(p.vx) * Math.min(FRICTION, sp - max);
      } else {
        const s = Math.abs(p.vx) - FRICTION;
        p.vx = s > 0 ? Math.sign(p.vx) * s : 0;
      }
      p.airMax = Math.max(WALK_MAX, Math.abs(p.vx));
      p.anim += Math.abs(p.vx) * 0.11;
    } else if (dir !== 0) {
      if (p.vx * dir < 0) p.vx += dir * AIR_TURN;
      else if (Math.abs(p.vx) < p.airMax) p.vx = dir * Math.min(p.airMax, Math.abs(p.vx) + AIR_ACCEL);
      p.facing = dir;
    }

    // Jump: buffer + coyote time; jump height scales with horizontal speed
    if (ctl.jumpHit) p.jumpBuf = JUMP_BUFFER; else if (p.jumpBuf > 0) p.jumpBuf--;
    if (p.onGround) p.coyote = COYOTE; else if (p.coyote > 0) p.coyote--;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS);
      p.jumping = true; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.platform = null;
      p.airMax = (ctl.run || Math.abs(p.vx) > WALK_MAX + 0.05) ? RUN_MAX : WALK_MAX;
      p.sx = 0.78; p.sy = 1.24;
      Sound.play(p.power ? 'jumpBig' : 'jump');
      this.dust(p.x + p.w / 2, p.y + p.h, 3);
    }

    // Gravity: light while rising with jump held, heavy otherwise (variable height)
    if (!ctl.jumpHeld) p.jumping = false;
    let g = p.vy < 0 && p.jumping ? GRAV_HOLD : GRAV;
    if (p.jumping && Math.abs(p.vy) < 1) g = Math.min(g, GRAV_APEX);
    p.vy = Math.min(p.vy + g, MAX_FALL);

    const ox = p.x;
    if (sweepX(lv, p, p.vx)) {
      // Ledge assist: if we clip a ledge corner by a few pixels while falling, pop up onto it.
      let assisted = false;
      if (!p.onGround && p.vy >= 0) {
        const bottom = p.y + p.h, top = Math.floor((bottom - 0.01) / TILE) * TILE;
        if (bottom - top <= 6) {
          const sx = p.x, sy = p.y;
          p.x = ox; p.y = top - p.h;
          if (!this.overlapsSolid(p) && !sweepX(lv, p, p.vx)) { assisted = true; p.vy = 0.01; }
          else { p.x = sx; p.y = sy; }
        }
      }
      if (!assisted) { p.vx = 0; p.skid = false; }
    }

    // Vertical, resolved by hand: semi-solids, moving platforms, hidden blocks,
    // head-bonks and corner correction.
    const prevTop = p.y, prevBottom = p.y + p.h;
    p.y += p.vy;
    let landed = false;
    p.platform = null;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    if (p.vy > 0) {
      let landY = Infinity, plat = null;
      const r = Math.floor((p.y + p.h) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (lv.solid(c, r) || (lv.get(c, r) === T.SEMI && prevBottom <= r * TILE + 0.5)) { landY = r * TILE; break; }
      }
      for (const pl of this.platforms) {
        if (p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1 && prevBottom <= Math.max(pl.y, pl.prevY) + 1 && p.y + p.h >= pl.y && pl.y < landY) {
          landY = pl.y; plat = pl;
        }
      }
      if (landY !== Infinity) { p.fallV = p.vy; p.y = landY - p.h; landed = true; p.platform = plat; }
    } else if (p.vy < 0) {
      const r = Math.floor(p.y / TILE);
      const blocking = [];
      for (let c = c0; c <= c1; c++) {
        if (lv.solid(c, r) || (lv.get(c, r) === T.HIDDEN && prevTop >= (r + 1) * TILE - 0.5)) blocking.push(c);
      }
      if (blocking.length) {
        let corrected = false;
        if (blocking.length === 1 && c0 !== c1 && lv.get(blocking[0], r) !== T.HIDDEN) {
          const c = blocking[0];
          if (c === c0) { const o = (c + 1) * TILE - p.x; if (o <= 5) { p.x += o; corrected = true; } }
          else { const o = p.x + p.w - c * TILE; if (o <= 5) { p.x -= o; corrected = true; } }
        }
        if (!corrected) {
          p.y = (r + 1) * TILE;
          p.vy = 0.8;
          p.jumping = false;
          const pc = Math.floor((p.x + p.w / 2) / TILE);
          this.hitBlock(blocking.includes(pc) ? pc : blocking[0], r);
        }
      }
    }
    const was = p.onGround;
    p.onGround = landed;
    if (landed) {
      if (!was) {
        const imp = p.fallV;
        p.sx = 1 + Math.min(0.3, imp * 0.06); p.sy = 1 - Math.min(0.25, imp * 0.05);
        if (imp > 3.5) this.dust(p.x + p.w / 2, p.y + p.h, 4);
      }
      p.vy = 0; p.jumping = false; p.combo = 0;
    }
  }

  overlapsSolid(p) {
    const lv = this.level;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (lv.solid(c, r)) return true;
    return false;
  }
  // If growing pushed the player into a ceiling, slide sideways to the nearest free spot.
  unstick(p) {
    if (!this.overlapsSolid(p)) return;
    const x = p.x;
    for (let d = 1; d <= 24; d++) {
      for (const s of [-1, 1]) {
        p.x = x + s * d;
        if (!this.overlapsSolid(p)) return;
      }
    }
    p.x = x;
  }

  checkPlayerTiles() {
    const p = this.player, lv = this.level;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = lv.get(c, r);
      if (t === T.COIN) {
        lv.set(c, r, T.EMPTY);
        this.addCoin(); this.addScore(200);
        this.sparkle(c * TILE + 8, r * TILE + 8);
      } else if (t === T.LAVA && p.y + p.h > r * TILE + 6) {
        this.killPlayer('lava');
        return;
      }
    }
    if (p.y > VIEW_H + 4) this.killPlayer('pit');
  }

  checkGoal() {
    const p = this.player, lv = this.level, g = lv.def.goal;
    if (p.x + p.w < lv.goalLine - 0.5) return;
    if (g.type === 'pole') this.startFlag();
    else {
      p.state = 'celebrate'; p.celebT = 0; p.vx = 0;
      Music.stop(); Sound.play('crystal');
      this.flash = 1; this.shake = 4;
      this.addScore(5000, lv.crystalX, 120);
      this.burst(lv.crystalX, 150, ['#bffff6', '#5ef2ff', '#ffffff', '#ff7ad9', '#ffd166'], 40);
    }
  }
  startFlag() {
    const p = this.player, lv = this.level, baseY = 11 * TILE;
    p.state = 'flag'; p.vx = 0; p.vy = 0; p.facing = 1;
    p.x = lv.poleX - p.w + 1;
    p.y = clamp(p.y, 2 * TILE, baseY - p.h);
    const pts = p.y < 3 * TILE ? 5000 : p.y < 5 * TILE ? 2000 : p.y < 7 * TILE ? 800 : p.y < 9 * TILE ? 400 : 100;
    this.addScore(pts, lv.poleX + 16, p.y);
    this.flagPhase = 0; this.flagT = 0;
    Music.stop(); Sound.play('flag');
  }
  updateFlag() {
    const p = this.player, lv = this.level, baseY = 11 * TILE;
    this.flagY = Math.min(this.flagY + 2.5, baseY - 14);
    if (this.flagPhase === 0) {
      p.y = Math.min(p.y + 2.5, baseY - p.h);
      if (p.y >= baseY - p.h && this.flagY >= baseY - 14) { this.flagPhase = 1; this.flagT = 0; }
    } else {
      this.flagT++;
      if (this.flagT === 18) { p.x = lv.poleX + 1; p.facing = -1; }
      if (this.flagT >= 36) { p.state = 'walkout'; p.facing = 1; Music.play('clear'); }
    }
  }
  startTally() { this.tally = true; this.tallyT = 0; this.bonus = this.time * 50; }

  // ---------- blocks ---------------------------------------------------------
  hitBlock(c, r) {
    const lv = this.level, p = this.player, t = lv.get(c, r);
    const bump = () => { lv.bumps.push({ c, r, t: 0 }); this.bumpAbove(c, r); };
    switch (t) {
      case T.BRICK:
        if (p.power > 0) { lv.set(c, r, T.EMPTY); this.breakBrick(c, r); this.bumpAbove(c, r); }
        else { bump(); Sound.play('bump'); }
        break;
      case T.QCOIN: lv.set(c, r, T.USED); bump(); this.coinPop(c, r); break;
      case T.QPOW:
        lv.set(c, r, T.USED); bump();
        this.items.push(new Item(p.power === 0 ? 'shroom' : 'bloom', c, r));
        Sound.play('appear');
        break;
      case T.Q1UP: case T.HIDDEN:
        lv.set(c, r, T.USED); bump();
        this.items.push(new Item('oneup', c, r));
        Sound.play('appear');
        break;
      case T.MULTI: {
        const k = r * lv.w + c;
        const n = (lv.multi.has(k) ? lv.multi.get(k) : 8) - 1;
        lv.multi.set(k, n);
        if (n <= 0) lv.set(c, r, T.USED);
        bump(); this.coinPop(c, r);
        break;
      }
      default: Sound.play('bump');
    }
  }
  bumpAbove(c, r) {
    const top = r * TILE, x0 = c * TILE, x1 = x0 + TILE;
    for (const e of this.entities) {
      if (e.dead || !e.bumpKill) continue;
      if (e.x < x1 && e.x + e.w > x0 && Math.abs(e.y + e.h - top) < 5) {
        e.flipKill(this, e.cx < x0 + 8 ? -1 : 1);
        this.addScore(100, e.cx, e.y);
        Sound.play('kick');
      }
    }
    for (const it of this.items) {
      if (it.emerging || it.kind === 'bloom') continue;
      if (it.x < x1 && it.x + it.w > x0 && Math.abs(it.y + it.h - top) < 5) {
        it.vy = -4;
        it.vx = (it.x + 7 < x0 + 8 ? -1 : 1) * (Math.abs(it.vx) || 1.1);
      }
    }
    if (this.level.get(c, r - 1) === T.COIN) { this.level.set(c, r - 1, T.EMPTY); this.coinPop(c, r - 1); }
  }
  breakBrick(c, r) {
    const x = c * TILE, y = r * TILE;
    [[-1.4, -5.5, 0, 0], [1.4, -5.5, 8, 0], [-1.2, -3.5, 0, 8], [1.2, -3.5, 8, 8]].forEach(([vx, vy, ox, oy]) => {
      this.particles.push({ kind: 'frag', x: x + ox, y: y + oy, vx, vy, g: 0.3, life: 70, t: 0 });
    });
    this.addScore(50);
    this.shake = Math.max(this.shake, 2);
    Sound.play('break');
  }
  coinPop(c, r) {
    this.addCoin(); this.addScore(200);
    this.particles.push({
      kind: 'coin', x: c * TILE, y: r * TILE - 16, vx: 0, vy: -5.5, g: 0.38, life: 26, t: 0,
      onEnd: q => { this.sparkle(q.x + 8, q.y + 8); this.popup(q.x + 8, q.y, '200'); },
    });
  }

  // ---------- scoring & items --------------------------------------------------
  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.popup(x, y, String(n));
  }
  addCoin() {
    this.coins++;
    Sound.play('coin');
    if (this.coins >= 100) { this.coins -= 100; this.oneUp(); }
  }
  oneUp(x, y) {
    this.lives = Math.min(99, this.lives + 1);
    Sound.play('oneup');
    const p = this.player;
    this.popup(x !== undefined ? x : p.x + p.w / 2, y !== undefined ? y : p.y - 4, '1UP', '#7be08a');
  }
  collectItem(it) {
    const p = this.player;
    if (it.kind === 'oneup') { this.oneUp(it.x + 7, it.y); return; }
    this.addScore(1000, p.x + p.w / 2, p.y - 4);
    Sound.play('power');
    const target = it.kind === 'shroom' ? Math.max(1, p.power) : 2;
    if (target !== p.power) {
      this.freezeFrom = p.power;
      p.power = target;
      const h = BIG_H;
      p.y += p.h - h; p.h = h;
      this.freezeT = 40;
    }
    this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffd166', '#ffffff', '#2ec4b6'], 14);
  }
  stompScore(e) {
    const p = this.player;
    if (p.combo >= STOMP_SCORES.length) this.oneUp(e.cx, e.y);
    else this.addScore(STOMP_SCORES[p.combo], e.cx, e.y);
    p.combo++;
  }
  isStomp(p, e) { return p.vy > 0 && p.prevY + p.h <= e.y + 8; }
  bounce(p) {
    p.vy = -STOMP_BOUNCE; p.jumping = true; p.onGround = false; p.platform = null;
    p.sx = 0.85; p.sy = 1.2;
  }
  hurtPlayer() {
    const p = this.player;
    if (p.invuln > 0 || p.state !== 'play') return;
    if (p.power > 0) {
      this.freezeFrom = p.power; p.power = 0; this.freezeT = 40;
      p.y += p.h - SMALL_H; p.h = SMALL_H;
      p.invuln = 130;
      Sound.play('shrink');
      this.shake = 2.5;
    } else this.killPlayer('hit');
  }
  killPlayer(kind) {
    const p = this.player;
    if (p.state === 'dead') return;
    p.state = 'dead'; p.deathKind = kind; p.deadT = 0; p.vx = 0; p.vy = 0;
    p.y = Math.min(p.y + p.h - SMALL_H, VIEW_H + 40); p.h = SMALL_H; p.power = 0;
    Music.stop();
    Sound.play(kind === 'lava' ? 'burn' : 'die');
    if (kind === 'lava') { Sound.play('die'); this.burst(p.x + p.w / 2, 13 * TILE, ['#ff6a1f', '#ffd166', '#e8401a'], 16); }
    this.shake = kind === 'pit' ? 0 : 3;
  }
  updateDeath() {
    const p = this.player;
    p.deadT++;
    if (p.deathKind !== 'pit') {
      if (p.deadT === 24) p.vy = -6.2;
      if (p.deadT > 24) { p.vy = Math.min(p.vy + 0.28, 6); p.y += p.vy; }
    }
    if (p.deadT === 170) this.transition(() => this.afterDeath());
  }
  throwFire() {
    if (this.fireballs.length >= 2) return;
    const p = this.player;
    this.fireballs.push(new Fireball(p.facing > 0 ? p.x + p.w : p.x - 8, p.y + 6, p.facing));
    Sound.play('fire');
  }

  // ---------- entities -------------------------------------------------------
  spawnEntities() {
    const right = this.camX + VIEW_W + 32;
    while (this.spawnQueue.length && this.spawnQueue[0].x <= right) {
      const s = this.spawnQueue.shift();
      if (s.x < this.camX - 64) continue;
      const e = this.makeEntity(s.def);
      if (e) this.entities.push(e);
    }
  }
  makeEntity(d) {
    const row = d[2] == null ? 11 : d[2];
    switch (d[0]) {
      case 'grumblet': return new Grumblet(d[1], row, this.level.themeName);
      case 'shellback': return new Shellback(d[1], row);
      case 'spikelet': return new Spikelet(d[1], row);
      case 'flutter': return new Flutter(d[1], d[2] == null ? 4 : d[2], !!d[3]);
      case 'snapvine':
        for (let r = 0; r < ROWS; r++) if (this.level.get(d[1], r) === T.PIPE_TL) return new Snapvine(d[1], r);
        return null;
      case 'firebar': return new Firebar(d[1], d[2], d[3] || 6, d[4] || 0.04);
      case 'ember': return new Ember(d[1]);
    }
    console.warn('OMIRA: unknown entity', d[0]);
    return null;
  }
  enemyInteractions() {
    const ents = this.entities, p = this.player;
    for (let i = 0; i < ents.length; i++) {
      const a = ents[i];
      if (a.dead) continue;
      for (let j = i + 1; j < ents.length; j++) {
        const b = ents[j];
        if (b.dead) continue;
        const aSlide = a instanceof Shellback && a.state === 'slide';
        const bSlide = b instanceof Shellback && b.state === 'slide';
        if (aSlide || bSlide) {
          const s = aSlide ? a : b, o = aSlide ? b : a;
          const ob = o.hitbox();
          if (!ob || !o.shellKill || !overlap(s, ob)) continue;
          if (aSlide && bSlide) { a.flipKill(this, -Math.sign(a.vx)); b.flipKill(this, -Math.sign(b.vx)); Sound.play('kick'); continue; }
          o.flipKill(this, Math.sign(s.vx));
          const v = STOMP_SCORES[Math.min(s.combo++, STOMP_SCORES.length - 1)];
          this.addScore(v, o.cx, o.y);
          Sound.play('kick');
        } else if (a.walker && b.walker && overlap(a, b)) {
          if (a.x < b.x) { if (a.vx > 0) a.vx = -a.vx; if (b.vx < 0) b.vx = -b.vx; }
          else { if (a.vx < 0) a.vx = -a.vx; if (b.vx > 0) b.vx = -b.vx; }
        }
      }
    }
    if (p.state !== 'play') return;
    for (const e of ents) {
      if (e.dead || !e.touches(p)) continue;
      e.onTouch(this, p);
      if (p.state !== 'play') break;
    }
  }
  updateCamera(snap) {
    const p = this.player, lv = this.level;
    const look = clamp(p.vx * 18 + p.facing * 12, -60, 60);
    this.look = snap ? look : this.look + (look - this.look) * 0.04;
    const target = p.x + p.w / 2 - VIEW_W * 0.42 + this.look;
    this.camX = snap ? target : this.camX + (target - this.camX) * 0.12;
    this.camX = clamp(this.camX, 0, lv.w * TILE - VIEW_W);
  }

  // ---------- particles ---------------------------------------------------------
  updateParticles() {
    for (const q of this.particles) {
      q.t++;
      q.x += q.vx; q.y += q.vy; q.vy += q.g || 0;
      if (q.drag) { q.vx *= q.drag; q.vy *= q.drag; }
      if (q.t >= q.life) { q.dead = true; if (q.onEnd) q.onEnd(q); }
    }
    this.particles = this.particles.filter(q => !q.dead);
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ kind: 'px', x: x + rand(-4, 4), y: y - 2, vx: rand(-0.8, 0.8), vy: rand(-0.9, -0.2), g: 0.02, drag: 0.92, life: 20 + rand(0, 10), t: 0, color: '#f4efe4', size: 2 });
    }
  }
  spark(x, y, color, life = 16, vx = rand(-0.5, 0.5), vy = rand(-1, 0)) {
    this.particles.push({ kind: 'px', x, y, vx, vy, g: 0.03, life, t: 0, color, size: 1 });
  }
  sparkle(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, drag: 0.9, life: 18, t: 0, color: i % 2 ? '#fff3b0' : '#ffd23f' });
    }
  }
  burst(x, y, colors, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(0.8, 2.6);
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.04, drag: 0.95, life: 30 + rand(0, 20), t: 0, color: colors[i % colors.length] });
    }
  }
  popup(x, y, text, color = '#ffffff') {
    this.particles.push({ kind: 'text', x, y, vx: 0, vy: -0.6, life: 45, t: 0, text, color });
  }
  firework() {
    const x = rand(60, VIEW_W - 60), y = rand(30, 100);
    const cols = [['#ff5d73', '#ffd166'], ['#2ec4b6', '#bffff6'], ['#8a6bff', '#ff7ad9'], ['#ffd166', '#ffffff']][Math.floor(rand(0, 4))];
    this.burst(x, y, cols, 36);
    Sound.play('firework');
  }
  updateAmbient() {
    const theme = this.mode === 'title' ? 'meadow' : this.level ? this.level.themeName : 'meadow';
    if (this.ambient.theme !== theme) { this.ambient = []; this.ambient.theme = theme; }
    const A = this.ambient;
    if (A.length < 22 && Math.random() < 0.12) {
      if (theme === 'meadow') A.push({ x: rand(0, VIEW_W + 60), y: -4, vx: rand(-0.6, -0.2), vy: rand(0.2, 0.45), t: 0, life: 600, c: Math.random() < 0.5 ? '#ffd1e3' : '#ffffff', ph: rand(0, 6) });
      else if (theme === 'cave') A.push({ x: rand(0, VIEW_W), y: rand(40, VIEW_H), vx: rand(-0.1, 0.1), vy: rand(-0.25, -0.05), t: 0, life: 400, c: Math.random() < 0.6 ? '#5ef2ff' : '#ff7ad9', ph: rand(0, 6) });
      else A.push({ x: rand(0, VIEW_W), y: VIEW_H + 2, vx: rand(-0.2, 0.2), vy: rand(-0.9, -0.4), t: 0, life: 360, c: Math.random() < 0.6 ? '#ff8a2a' : '#ffd166', ph: rand(0, 6) });
    }
    for (const a of A) { a.t++; a.x += a.vx + Math.sin(a.t * 0.04 + a.ph) * 0.25; a.y += a.vy; }
    for (let i = A.length - 1; i >= 0; i--) if (A[i].t > A[i].life || A[i].y < -10 || A[i].y > VIEW_H + 10) A.splice(i, 1);
  }

  // ═════════════════════════════ RENDERING ═══════════════════════════════════
  // A tap/click on the canvas, in game pixels. Menu items are directly tappable.
  tap(x, y) {
    Sound.unlock();
    if (this.fadeCb) return;
    const h = this.menuHits.find(m => x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h);
    if (h) { this.menu = h.i; Input.hits.add('start'); return; }
    if (this.mode === 'title') { this.menu = 0; Input.hits.add('start'); }
    else if (this.mode === 'intro' || this.mode === 'clear' || this.mode === 'ending') Input.hits.add('start');
  }

  render() {
    const ctx = this.ctx;
    this.menuHits = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    switch (this.mode) {
      case 'title': this.drawTitle(ctx); break;
      case 'intro': this.drawIntro(ctx); break;
      case 'play': this.drawWorld(ctx); break;
      case 'pause': this.drawWorld(ctx); this.drawPause(ctx); break;
      case 'clear': this.drawWorld(ctx); this.drawClear(ctx); break;
      case 'gameover': this.drawGameOver(ctx); break;
      case 'ending': this.drawEnding(ctx); break;
    }
    if (this.fade > 0) {
      ctx.globalAlpha = this.fade;
      ctx.fillStyle = '#0b0918';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }

  drawAmbient(ctx) {
    for (const a of this.ambient) {
      ctx.globalAlpha = Math.min(1, (a.life - a.t) / 60, a.t / 30) * (this.ambient.theme === 'cave' ? 0.7 : 0.9);
      ctx.fillStyle = a.c;
      ctx.fillRect(Math.round(a.x), Math.round(a.y), this.ambient.theme === 'meadow' ? 2 : 1, this.ambient.theme === 'meadow' ? 1 : 1);
    }
    ctx.globalAlpha = 1;
  }

  drawWorld(ctx) {
    const lv = this.level;
    let sx = 0, sy = 0;
    if (this.shake > 0.4) { sx = Math.round(rand(-1, 1) * this.shake); sy = Math.round(rand(-1, 1) * this.shake); }
    const cam = Math.round(this.camX);
    drawBackground(ctx, lv.themeName, cam, this.t);
    this.drawAmbient(ctx);
    ctx.save();
    ctx.translate(-cam + sx, sy);
    this.drawDecor(ctx, cam);
    for (const e of this.entities) if (e.behindTiles) e.draw(ctx, this);
    for (const it of this.items) if (it.emerging) it.draw(ctx);
    this.drawTiles(ctx, cam);
    for (const pl of this.platforms) pl.draw(ctx, lv.theme);
    for (const it of this.items) if (!it.emerging) it.draw(ctx);
    for (const e of this.entities) if (!e.behindTiles) e.draw(ctx, this);
    for (const f of this.fireballs) f.draw(ctx);
    this.drawPlayer(ctx);
    this.drawParticles(ctx);
    ctx.restore();
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    this.drawHUD(ctx);
  }

  drawTiles(ctx, cam) {
    const lv = this.level, ts = getTileset(lv.themeName);
    const c0 = Math.max(0, Math.floor(cam / TILE) - 1), c1 = Math.min(lv.w - 1, c0 + Math.ceil(VIEW_W / TILE) + 2);
    const qf = [0, 0, 0, 1, 2, 1][Math.floor(this.t / 8) % 6];
    const cf = Math.floor(this.t / 8) % 4, lf = Math.floor(this.t / 10) % 4;
    for (let r = 0; r < ROWS; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = lv.tiles[r * lv.w + c];
        if (!t || t === T.HIDDEN) continue;
        let img;
        switch (t) {
          case T.GROUND: img = r > 0 && !lv.solid(c, r - 1) ? ts.groundTop : ts.ground; break;
          case T.BRICK: case T.MULTI: img = ts.brick; break;
          case T.QCOIN: case T.QPOW: case T.Q1UP: img = ts['q' + qf]; break;
          case T.USED: img = ts.used; break;
          case T.SOLID: img = ts.solid; break;
          case T.PIPE_TL: img = ts.pipeTL; break;
          case T.PIPE_TR: img = ts.pipeTR; break;
          case T.PIPE_L: img = ts.pipeL; break;
          case T.PIPE_R: img = ts.pipeR; break;
          case T.SEMI: img = ts.semi; break;
          case T.LAVA: img = lv.get(c, r - 1) === T.LAVA ? ts.lavaDeep : ts['lava' + ((lf + c) % 4)]; break;
          case T.COIN: img = ts['coin' + cf]; break;
        }
        if (!img) continue;
        let y = r * TILE;
        for (const b of lv.bumps) if (b.c === c && b.r === r) y -= Math.round(Math.sin((b.t / 10) * Math.PI) * 5);
        ctx.drawImage(img, c * TILE, y);
      }
    }
    // Lava glow
    if (lv.themeName === 'citadel') {
      ctx.globalAlpha = 0.18 + Math.sin(this.t * 0.05) * 0.04;
      ctx.fillStyle = '#ff6a1f';
      for (let c = c0; c <= c1; c++) if (lv.get(c, 13) === T.LAVA) ctx.fillRect(c * TILE, 13 * TILE - 10, TILE, 10);
      ctx.globalAlpha = 1;
    }
  }

  drawDecor(ctx, cam) {
    const lv = this.level, th = lv.theme, t = this.t;
    for (const d of lv.decor) {
      if (d.x < cam - 48 || d.x > cam + VIEW_W + 16) continue;
      const x = d.x, y = d.y;
      switch (d.k) {
        case 'bush': {
          const s = 0.8 + d.s * 0.4;
          blob(ctx, x + 10, y - 2, Math.round(9 * s), '#2f8a46');
          blob(ctx, x + 22, y - 6, Math.round(11 * s), '#2f8a46');
          blob(ctx, x + 34, y - 2, Math.round(9 * s), '#2f8a46');
          blob(ctx, x + 10, y - 3, Math.round(8 * s), '#47b35c');
          blob(ctx, x + 22, y - 7, Math.round(10 * s), '#47b35c');
          blob(ctx, x + 34, y - 3, Math.round(8 * s), '#47b35c');
          ctx.fillStyle = '#7bd889';
          ctx.fillRect(x + 18, y - 14, 3, 2); ctx.fillRect(x + 8, y - 8, 2, 2); ctx.fillRect(x + 31, y - 8, 2, 1);
          ctx.fillStyle = th.top[0]; ctx.fillRect(x, y - 1, 46, 1);
          break;
        }
        case 'flower':
          ctx.fillStyle = '#2f9a49'; ctx.fillRect(x + 2, y - 5, 1, 5);
          ctx.fillStyle = d.c; ctx.fillRect(x + 1, y - 7, 3, 1); ctx.fillRect(x + 2, y - 8, 1, 3);
          ctx.fillStyle = '#ffd166'; ctx.fillRect(x + 2, y - 7, 1, 1);
          break;
        case 'tuft':
          ctx.fillStyle = '#2f9a49';
          ctx.fillRect(x, y - 2, 1, 2); ctx.fillRect(x + 2, y - 4, 1, 4); ctx.fillRect(x + 4, y - 3, 1, 3);
          break;
        case 'crystal': {
          const glow = 0.14 + Math.sin(t * 0.05 + d.p) * 0.08;
          ctx.globalAlpha = glow; blob(ctx, x + 2, y - 5, 7, d.c); ctx.globalAlpha = 1;
          ctx.fillStyle = d.c;
          ctx.fillRect(x, y - 8, 2, 8); ctx.fillRect(x + 3, y - 5, 2, 5); ctx.fillRect(x - 2, y - 4, 1, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y - 8, 1, 2);
          break;
        }
        case 'shroomlet':
          ctx.fillStyle = '#c2fff7'; ctx.fillRect(x + 1, y - 3, 1, 3);
          ctx.fillStyle = '#59e6d8'; ctx.fillRect(x, y - 5, 3, 2);
          break;
        case 'stalactite':
          ctx.fillStyle = th.ground[1];
          for (let i = 0; i < d.len; i++) { const w = Math.max(1, Math.round(5 * (1 - i / d.len))); ctx.fillRect(x - (w >> 1), y + i, w, 1); }
          break;
        case 'torch': {
          ctx.fillStyle = '#2a1d33'; ctx.fillRect(x, y - 14, 3, 14);
          ctx.fillStyle = '#8b7193'; ctx.fillRect(x - 2, y - 15, 7, 2);
          const f = Math.floor(t / 5 + d.p) % 3;
          ctx.globalAlpha = 0.08; blob(ctx, x + 1, y - 20, 10, '#ff8a2a'); ctx.globalAlpha = 0.12; blob(ctx, x + 1, y - 19, 5, '#ffb347'); ctx.globalAlpha = 1;
          ctx.fillStyle = '#ff6a1f'; ctx.fillRect(x - 1, y - 20 - f, 5, 5 + f);
          ctx.fillStyle = '#ffd166'; ctx.fillRect(x, y - 19, 3, 3);
          break;
        }
        case 'rubble':
          ctx.fillStyle = th.ground[1]; ctx.fillRect(x, y - 2, 3, 2); ctx.fillRect(x + 4, y - 1, 2, 1);
          ctx.fillStyle = th.ground[2]; ctx.fillRect(x, y - 2, 2, 1);
          break;
      }
    }
    // Checkpoint banner
    const cp = lv.def.checkpoint;
    if (cp) {
      const x = cp * TILE + 6, y = lv.surfaceRow(cp) * TILE;
      ctx.fillStyle = '#e8f0ff'; ctx.fillRect(x, y - 30, 2, 30);
      ctx.fillStyle = INK; ctx.fillRect(x + 2, y - 30, 1, 30);
      const lit = this.checkpointReached;
      const wave = lit ? Math.floor(t / 8) % 2 : 0;
      ctx.fillStyle = lit ? '#2ec4b6' : '#6e6a88';
      ctx.fillRect(x + 2, y - 29, 10, 7); ctx.fillRect(x + 12, y - 28 + wave, 2, 5);
      ctx.fillStyle = lit ? '#ffd166' : '#a4a0bc'; ctx.fillRect(x + 5, y - 27, 3, 3);
      blob(ctx, x + 1, y - 31, 2, lit ? '#ffd166' : '#a4a0bc');
    }
    // Goal
    const g = lv.def.goal;
    if (g.type === 'pole') this.drawGoalPole(ctx, lv);
    else this.drawCrystal(ctx, lv.crystalX, 150 + Math.sin(t * 0.05) * 3, this.player && this.player.state === 'done' ? 1.3 : 1);
  }
  drawGoalPole(ctx, lv) {
    const th = lv.theme, px = lv.poleX, topY = 2 * TILE + 8, baseY = 11 * TILE;
    // castle
    const cx = lv.castleX, gy = 12 * TILE, [cb, cd, cl] = th.castle;
    ctx.fillStyle = cd; ctx.fillRect(cx, gy - 48, 80, 48);
    ctx.fillStyle = cb; ctx.fillRect(cx + 1, gy - 47, 78, 47);
    for (let x = cx; x < cx + 80; x += 16) { ctx.fillStyle = cd; ctx.fillRect(x, gy - 56, 9, 8); ctx.fillStyle = cb; ctx.fillRect(x + 1, gy - 55, 7, 7); }
    ctx.fillStyle = cd; ctx.fillRect(cx + 16, gy - 84, 48, 36);
    ctx.fillStyle = cb; ctx.fillRect(cx + 17, gy - 83, 46, 35);
    for (let x = cx + 16; x < cx + 64; x += 12) { ctx.fillStyle = cd; ctx.fillRect(x, gy - 92, 7, 8); ctx.fillStyle = cb; ctx.fillRect(x + 1, gy - 91, 5, 7); }
    ctx.fillStyle = cd;
    for (let y = gy - 40; y < gy; y += 8) for (let x = cx + ((y / 8) % 2 ? 4 : 0); x < cx + 80; x += 12) ctx.fillRect(x, y, 8, 1);
    ctx.fillStyle = cl; ctx.fillRect(cx + 1, gy - 47, 78, 1); ctx.fillRect(cx + 17, gy - 83, 46, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(cx + 32, gy - 26, 16, 26); ctx.fillRect(cx + 34, gy - 29, 12, 3); ctx.fillRect(cx + 37, gy - 31, 6, 2);
    ctx.fillRect(cx + 26, gy - 74, 6, 10); ctx.fillRect(cx + 48, gy - 74, 6, 10);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(cx + 27, gy - 70, 4, 5); ctx.fillRect(cx + 49, gy - 70, 4, 5);
    // castle flag
    const raised = this.player && this.player.state === 'done';
    ctx.fillStyle = '#e8f0ff'; ctx.fillRect(cx + 39, gy - 110, 2, 18);
    ctx.fillStyle = raised ? '#2ec4b6' : '#4a4466';
    ctx.fillRect(cx + 41, gy - 109 + (raised ? 0 : 8), 10, 6);
    // pole
    ctx.fillStyle = '#e8f0ff'; ctx.fillRect(px - 1, topY, 2, baseY - topY);
    ctx.fillStyle = '#9aa6c8'; ctx.fillRect(px + 1, topY, 1, baseY - topY);
    blob(ctx, px, topY - 2, 3, '#ffd166');
    ctx.fillStyle = '#fff3c4'; ctx.fillRect(px - 1, topY - 4, 1, 1);
    // flag (slides down when grabbed)
    const fy = Math.round(this.flagY);
    ctx.fillStyle = '#2ec4b6';
    for (let i = 0; i < 12; i++) ctx.fillRect(px - 2 - i, fy + Math.floor(i / 2), 1, 12 - Math.floor(i / 2) * 2);
    ctx.fillStyle = '#7be08a'; ctx.fillRect(px - 7, fy + 4, 2, 3); ctx.fillRect(px - 6, fy + 3, 1, 1);
  }
  drawCrystal(ctx, x, y, s) {
    const t = this.t;
    ctx.globalAlpha = 0.12 + Math.sin(t * 0.06) * 0.05;
    blob(ctx, x, y, Math.round(30 * s), '#5ef2ff');
    ctx.globalAlpha = 0.18;
    blob(ctx, x, y, Math.round(18 * s), '#bffff6');
    ctx.globalAlpha = 1;
    const h = 14;
    for (let i = -h; i <= h; i++) {
      const w = Math.round((h - Math.abs(i)) * 0.6);
      ctx.fillStyle = i < -4 ? '#bffff6' : i < 4 ? '#5ef2ff' : '#2bb3c6';
      ctx.fillRect(Math.round(x - w), Math.round(y + i), w * 2 + 1, 1);
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - 2), Math.round(y - 8), 1, 6);
    if (t % 30 < 15) { ctx.fillRect(Math.round(x + 5), Math.round(y - 12), 1, 3); ctx.fillRect(Math.round(x + 4), Math.round(y - 11), 3, 1); }
    // pedestal trim
    ctx.fillStyle = '#ffd166';
    if (this.level && this.level.crystalX === x) ctx.fillRect(x - 24, 11 * TILE, 48, 2);
  }

  drawPlayer(ctx) {
    const p = this.player;
    if (!p || p.hidden) return;
    if (p.state === 'dead') { drawSprite(ctx, SPR.die, p.x + p.w / 2, p.y + p.h + 1, false); return; }
    if (p.invuln > 0 && this.freezeT === 0 && (p.invuln >> 2) % 2 === 0) return;
    let power = p.power;
    if (this.freezeT > 0) power = Math.floor(this.freezeT / 4) % 2 ? this.freezeFrom : p.power;
    const set = power === 0 ? SPR.small : power === 1 ? SPR.big : SPR.fire;
    let f = this.t % 200 < 7 ? 'blink' : 'idle', bob = 0;
    if (p.state === 'flag' || p.state === 'celebrate') f = 'jump';
    else if (!p.onGround) f = p.vy > 1 ? 'fall' : 'jump';
    else if (p.skid) f = 'skid';
    else if (Math.abs(p.vx) > 0.15) { const k = Math.floor(p.anim) % 4; f = 'run' + k; bob = k % 2; }
    drawSprite(ctx, set[f], p.x + p.w / 2, p.y + p.h - bob, p.facing < 0, p.sx, p.sy);
  }

  drawParticles(ctx) {
    const ts = this.level ? getTileset(this.level.themeName) : null;
    for (const q of this.particles) {
      const x = Math.round(q.x), y = Math.round(q.y);
      switch (q.kind) {
        case 'px':
          ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
          ctx.fillStyle = q.color; ctx.fillRect(x, y, q.size, q.size);
          break;
        case 'spark': {
          ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
          ctx.fillStyle = q.color;
          ctx.fillRect(x, y, 1, 1);
          if (q.t < q.life * 0.6) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
          break;
        }
        case 'frag': {
          const [b, d] = this.level.theme.brick;
          ctx.fillStyle = d; ctx.fillRect(x, y, 8, 8);
          ctx.fillStyle = b; ctx.fillRect(x + 1, y + 1, 6, 5);
          break;
        }
        case 'coin': if (ts) ctx.drawImage(ts['coin' + (Math.floor(q.t / 3) % 4)], x, y); break;
        case 'text':
          ctx.globalAlpha = q.t > q.life - 12 ? (q.life - q.t) / 12 : 1;
          drawText(ctx, q.text, x, y, q.color, { align: 'center', shadow: INK });
          break;
      }
      ctx.globalAlpha = 1;
    }
  }

  drawHUD(ctx) {
    const sh = INK, val = '#ffffff', lbl = '#9fd8f0', y = 2;
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, 11); ctx.globalAlpha = 1;
    drawText(ctx, pad(this.score, 6), 8, y, val, { shadow: sh });
    const cx = 92;
    ctx.fillStyle = '#9a5a00'; ctx.fillRect(cx, y, 5, 7);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(cx + 1, y + 1, 3, 5);
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(cx + 1, y + 1, 1, 3);
    drawText(ctx, '*' + pad(this.coins, 2), cx + 8, y, val, { shadow: sh });
    drawText(ctx, 'WORLD', 158, y, lbl, { shadow: sh });
    drawText(ctx, LEVELS[this.levelIndex].id, 194, y, val, { shadow: sh });
    const time = this.time || 0;
    const hurry = this.mode === 'play' && time <= 100 && Math.floor(this.t / 15) % 2 === 0;
    drawText(ctx, 'TIME', 254, y, lbl, { shadow: sh });
    drawText(ctx, pad(time, 3), 284, y, hurry ? '#ff5d73' : val, { shadow: sh });
    ctx.drawImage(SPR.lifeIcon, 3, 3, 15, 8, 337, 1, 15, 8);
    drawText(ctx, '*' + pad(this.lives, 2), 355, y, val, { shadow: sh });
  }

  drawPanel(ctx, x, y, w, h, border = '#2ec4b6') {
    ctx.fillStyle = 'rgba(11,9,24,0.88)';
    ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4); ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = border;
    ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
    ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  }
  drawMenu(ctx, items, sel, cx, y, gap = 12) {
    items.forEach((s, i) => {
      const on = i === sel;
      const tw = textWidth(s);
      this.menuHits.push({ x: cx - tw / 2 - 18, y: y + i * gap - 3, w: tw + 36, h: gap, i });
      drawText(ctx, s, cx, y + i * gap, on ? '#ffd166' : '#b8b2d8', { align: 'center', shadow: INK });
      if (on && Math.floor(this.t / 16) % 2 === 0) {
        const w = textWidth(s);
        drawText(ctx, '>', cx - w / 2 - 12, y + i * gap, '#ffd166');
        drawText(ctx, '<', cx + w / 2 + 6, y + i * gap, '#ffd166');
      }
    });
  }

  drawGroundStrip(ctx, theme, cam) {
    const ts = getTileset(theme);
    const off = -(Math.round(cam) % TILE);
    for (let x = off; x < VIEW_W; x += TILE) { ctx.drawImage(ts.groundTop, x, 12 * TILE); ctx.drawImage(ts.ground, x, 13 * TILE); }
  }

  drawTitle(ctx) {
    drawBackground(ctx, 'meadow', this.titleCam, this.t);
    this.drawAmbient(ctx);
    this.drawGroundStrip(ctx, 'meadow', this.titleCam);
    // little scene: Omira idling, a Grumblet pacing
    const bob = Math.floor(this.t / 30) % 2;
    drawSprite(ctx, bob ? SPR.small.idle : SPR.small.idle, 62, 12 * TILE, false);
    const gx = 330 + Math.sin(this.t * 0.01) * 26;
    drawSprite(ctx, SPR.grumblet.meadow, gx, 12 * TILE, Math.floor(this.t / 10) % 2 === 0);
    ctx.drawImage(getTileset('meadow')['q' + [0, 0, 0, 1, 2, 1][Math.floor(this.t / 8) % 6]], 54, 8 * TILE);
    // logo
    const logo = getLogo();
    ctx.drawImage(logo, Math.round(VIEW_W / 2 - logo.width / 2), 16 + Math.round(Math.sin(this.t * 0.04) * 2));
    drawText(ctx, 'A LUMEN ISLES ADVENTURE', VIEW_W / 2, 66, '#fff3c4', { align: 'center', shadow: INK });
    this.drawMenu(ctx, ['START GAME', 'SOUND: ' + (Sound.muted ? 'OFF' : 'ON')], this.menu, VIEW_W / 2, 82);
    // controls card
    this.drawPanel(ctx, 106, 108, 188, 70, '#3a3170');
    const rows = this.touch
      ? [['← → PAD', 'MOVE'], ['A BUTTON', 'JUMP'], ['B BUTTON', 'RUN / FIRE'], ['THUMB ON A+B', 'RUN + JUMP'], ['TAP MENUS', 'SELECT']]
      : [['← → / A D', 'MOVE'], ['SPACE / Z / ↑ / W', 'JUMP'], ['SHIFT / X', 'RUN / FIRE'], ['P / ESC', 'PAUSE'], ['M / F', 'SOUND / FULLSCRN']];
    rows.forEach(([k, a], i) => {
      drawText(ctx, k, 116, 115 + i * 12, '#ffffff');
      drawText(ctx, a, 284, 115 + i * 12, '#2ec4b6', { align: 'right' });
    });
    drawText(ctx, 'TOP ' + pad(this.top, 6), VIEW_W / 2, 208, '#ffffff', { align: 'center', shadow: INK });
  }

  drawIntro(ctx) {
    const def = LEVELS[this.levelIndex], th = THEMES[def.theme];
    ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + this.t * 0.2) % VIEW_W, y = (i * 53) % VIEW_H;
      ctx.fillStyle = i % 3 ? '#221c44' : '#3a3170'; ctx.fillRect(Math.round(x), y, 1, 1);
    }
    this.drawHUD(ctx);
    drawText(ctx, 'WORLD ' + def.id, VIEW_W / 2, 72, '#ffffff', { align: 'center', scale: 2, shadow: INK });
    drawText(ctx, def.name, VIEW_W / 2, 96, th.accent, { align: 'center', shadow: INK });
    drawSprite(ctx, SPR.small.idle, VIEW_W / 2 - 18, 134, false);
    drawText(ctx, '* ' + this.lives, VIEW_W / 2 - 4, 124, '#ffffff');
    if (this.useCheckpoint) drawText(ctx, 'RESUMING FROM CHECKPOINT', VIEW_W / 2, 150, '#8a83b0', { align: 'center' });
    if (def.hint) drawText(ctx, 'TIP: ' + def.hint, VIEW_W / 2, 190, '#ffd166', { align: 'center' });
  }

  drawPause(ctx) {
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 11, VIEW_W, VIEW_H - 11); ctx.globalAlpha = 1;
    this.drawPanel(ctx, 120, 56, 160, 112);
    drawText(ctx, 'PAUSED', VIEW_W / 2, 68, '#ffffff', { align: 'center', scale: 2, shadow: INK });
    this.drawMenu(ctx, ['RESUME', 'RESTART LEVEL', 'SOUND: ' + (Sound.muted ? 'OFF' : 'ON'), 'QUIT TO TITLE'], this.menu, VIEW_W / 2, 98, 14);
  }

  drawClear(ctx) {
    const def = LEVELS[this.levelIndex], next = LEVELS[this.levelIndex + 1];
    const a = Math.min(1, this.clearT / 20);
    ctx.globalAlpha = a;
    this.drawPanel(ctx, 100, 48, 200, 128, '#ffd166');
    drawText(ctx, 'COURSE CLEAR!', VIEW_W / 2, 60, '#ffd166', { align: 'center', scale: 2, shadow: INK });
    drawText(ctx, 'WORLD ' + def.id + '  ' + def.name, VIEW_W / 2, 84, '#bfe9ff', { align: 'center' });
    drawText(ctx, 'TIME BONUS', 116, 102, '#ffffff'); drawText(ctx, '+' + (this.bonus || 0), 284, 102, '#7be08a', { align: 'right' });
    drawText(ctx, 'COINS', 116, 114, '#ffffff'); drawText(ctx, '*' + pad(this.coins, 2), 284, 114, '#ffd23f', { align: 'right' });
    drawText(ctx, 'SCORE', 116, 126, '#ffffff'); drawText(ctx, pad(this.score, 6), 284, 126, '#ffffff', { align: 'right' });
    drawText(ctx, 'NEXT: ' + next.id + ' ' + next.name, VIEW_W / 2, 144, THEMES[next.theme].accent, { align: 'center' });
    if (this.clearT > 60 && Math.floor(this.t / 20) % 2 === 0) drawText(ctx, 'PRESS ENTER', VIEW_W / 2, 160, '#b8b2d8', { align: 'center' });
    ctx.globalAlpha = 1;
  }

  drawGameOver(ctx) {
    ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(ctx, 'GAME OVER', VIEW_W / 2, 60, '#ff5d73', { align: 'center', scale: 3, shadow: '#3a0d1d' });
    drawText(ctx, 'SCORE  ' + pad(this.score, 6), VIEW_W / 2, 104, '#ffffff', { align: 'center' });
    drawText(ctx, 'TOP    ' + pad(this.top, 6), VIEW_W / 2, 116, '#ffd166', { align: 'center' });
    this.drawMenu(ctx, ['CONTINUE FROM ' + LEVELS[this.levelIndex].id, 'QUIT TO TITLE'], this.menu, VIEW_W / 2, 146, 14);
    drawSprite(ctx, SPR.die, VIEW_W / 2, 196, false);
  }

  drawEnding(ctx) {
    drawBackground(ctx, 'meadow', this.endT * 0.4, this.t);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff9a6a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
    this.drawGroundStrip(ctx, 'meadow', this.endT * 0.4);
    this.drawCrystal(ctx, VIEW_W / 2, 128 + Math.sin(this.t * 0.05) * 3, 1.4);
    drawSprite(ctx, SPR.fire.jump, VIEW_W / 2 - 50, 12 * TILE - Math.abs(Math.sin(this.t * 0.08)) * 10, false);
    this.drawParticles(ctx);
    const show = n => this.endT > n;
    if (show(20)) drawText(ctx, 'THE LUMEN CRYSTAL SHINES AGAIN!', VIEW_W / 2, 22, '#ffffff', { align: 'center', shadow: INK });
    if (show(80)) drawText(ctx, 'THE ISLES ARE SAFE. THANK YOU, OMIRA!', VIEW_W / 2, 36, '#fff3c4', { align: 'center', shadow: INK });
    if (show(140)) {
      this.drawPanel(ctx, 130, 54, 140, 44, '#ffd166');
      drawText(ctx, 'FINAL SCORE', VIEW_W / 2, 61, '#ffd166', { align: 'center' });
      drawText(ctx, pad(this.score, 6), VIEW_W / 2, 72, '#ffffff', { align: 'center', scale: 2 });
      drawText(ctx, 'TOP ' + pad(this.top, 6), VIEW_W / 2, 88, '#bfe9ff', { align: 'center' });
    }
    if (show(160) && Math.floor(this.t / 20) % 2 === 0) drawText(ctx, 'PRESS ENTER', VIEW_W / 2, 206, '#ffffff', { align: 'center', shadow: INK });
  }
}

let logoCanvas = null;
function getLogo() {
  if (logoCanvas) return logoCanvas;
  const s = 5, text = 'OMIRA', w = textWidth(text, s), h = 7 * s;
  const fill = makeCanvas(w, h), f = fill.getContext('2d');
  drawText(f, text, 0, 0, '#ffffff', { scale: s });
  f.globalCompositeOperation = 'source-in';
  const bands = [['#d9fff8', 0.3], ['#5fe6d6', 0.62], ['#22a99c', 1]];
  let y0 = 0;
  for (const [col, end] of bands) { f.fillStyle = col; f.fillRect(0, Math.round(y0 * h), w, Math.ceil((end - y0) * h)); y0 = end; }
  const c = makeCanvas(w + 8, h + 10), g = c.getContext('2d');
  const o = makeCanvas(w, h), og = o.getContext('2d');
  drawText(og, text, 0, 0, INK, { scale: s });
  const sh = makeCanvas(w, h), sg = sh.getContext('2d');
  drawText(sg, text, 0, 0, '#ff5d73', { scale: s });
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) g.drawImage(o, 4 + dx, 4 + dy + 4);
  g.drawImage(sh, 4, 4 + 4);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3) g.drawImage(o, 4 + dx, 4 + dy);
  g.drawImage(fill, 4, 4);
  logoCanvas = c;
  return c;
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. BOOT & FIXED-TIMESTEP LOOP
// ═══════════════════════════════════════════════════════════════════════════
let game = null, muteBtn = null;
function toggleMute() {
  Sound.unlock();
  Sound.setMuted(!Sound.muted);
  if (muteBtn) muteBtn.classList.toggle('muted', Sound.muted);
  if (!Sound.muted) Sound.play('select');
}

function boot() {
  const canvas = document.getElementById('game');
  muteBtn = document.getElementById('mute');
  buildSprites();
  game = new Game(canvas);

  const root = document.documentElement;
  let refit = null;
  const markTouch = () => {
    if (root.classList.contains('touch')) return;
    root.classList.add('touch'); game.touch = true;
    if (refit) refit();
  };
  if ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window) markTouch();

  // ---- responsive scaling: integer scale on desktop, fill the screen on touch devices
  const fit = () => {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    const touch = root.classList.contains('touch'), portrait = vh > vw;
    root.classList.toggle('portrait', touch && portrait);
    let aw = vw - 24, ah = vh - 24;
    if (touch && portrait) { aw = vw - 8; ah = Math.max(120, vh - 64 - 230); }
    else if (touch) { aw = vw; ah = vh; }
    const s = Math.floor(Math.min((aw * dpr) / VIEW_W, (ah * dpr) / VIEW_H));
    let w, h;
    if (s >= 1 && !touch) { w = (VIEW_W * s) / dpr; h = (VIEW_H * s) / dpr; }
    else { const f = Math.min(aw / VIEW_W, ah / VIEW_H); w = VIEW_W * f; h = VIEW_H * f; }
    canvas.style.width = Math.floor(w) + 'px';
    canvas.style.height = Math.floor(h) + 'px';
  };
  refit = fit;
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 150));

  // ---- fullscreen
  const fsBtn = document.getElementById('fs'), toast = document.getElementById('toast');
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFs = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  let toastT = 0;
  const showToast = msg => {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 3200);
  };
  const toggleFullscreen = () => {
    Sound.unlock();
    try {
      if (fsElement()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (!canFs) { showToast('Fullscreen: use Share → Add to Home Screen'); return; }
      const req = (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
      const lock = () => { if (root.classList.contains('touch') && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); };
      if (req && req.then) req.then(lock).catch(() => showToast('Fullscreen was blocked by the browser')); else lock();
    } catch (e) { showToast('Fullscreen is not available here'); }
  };
  const onFsChange = () => { if (fsBtn) fsBtn.classList.toggle('on', !!fsElement()); setTimeout(fit, 60); };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  if (fsBtn) fsBtn.addEventListener('click', () => { toggleFullscreen(); fsBtn.blur(); });

  // ---- keyboard
  window.addEventListener('keydown', e => {
    Sound.unlock();
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (Input.codes.has(e.code)) return;
    Input.press(e.code);
    if (a === 'mute') toggleMute();
    if (a === 'fullscreen') toggleFullscreen();
  });
  window.addEventListener('keyup', e => {
    if (KEYMAP[e.code]) e.preventDefault();
    Input.release(e.code);
  });
  const autoPause = () => {
    Input.reset();
    if (game.mode === 'play' && game.player && game.player.state === 'play') game.pause();
  };
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  window.addEventListener('pointerdown', () => Sound.unlock());
  window.addEventListener('touchend', () => Sound.unlock());
  if (muteBtn) {
    muteBtn.classList.toggle('muted', Sound.muted);
    muteBtn.addEventListener('click', () => { toggleMute(); muteBtn.blur(); });
  }
  const pauseBtn = document.getElementById('pause');
  if (pauseBtn) pauseBtn.addEventListener('click', () => { Sound.unlock(); Input.hits.add('pause'); pauseBtn.blur(); });

  // ---- tap / click the canvas to use menus
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') markTouch();
    const r = canvas.getBoundingClientRect();
    game.tap(((e.clientX - r.left) / r.width) * VIEW_W, ((e.clientY - r.top) / r.height) * VIEW_H);
  });

  // ---- multi-touch controls: a D-pad zone and an A/B zone (slide a thumb between A and B to press both)
  const setVirtual = (code, on) => {
    if (on && !Input.codes.has(code)) Input.press(code);
    else if (!on && Input.codes.has(code)) Input.release(code);
  };
  const zone = (el, classify, apply) => {
    if (!el) return;
    const ptrs = new Map();
    const update = () => apply([...ptrs.values()]);
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); markTouch(); Sound.unlock();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      ptrs.set(e.pointerId, classify(e)); update();
    });
    el.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) { ptrs.set(e.pointerId, classify(e)); update(); } });
    const end = e => { if (ptrs.delete(e.pointerId)) update(); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, end));
    el.addEventListener('contextmenu', e => e.preventDefault());
  };
  const dpad = document.getElementById('dpad');
  zone(dpad, e => {
    const r = dpad.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    return { l: dx < -0.12, r: dx > 0.12 };
  }, list => {
    const l = list.some(p => p.l), r = list.some(p => p.r);
    setVirtual('TouchLeft', l && !r); setVirtual('TouchRight', r && !l);
    dpad.classList.toggle('left', l && !r); dpad.classList.toggle('right', r && !l);
  });
  const btns = document.getElementById('btns'), bA = document.getElementById('bA'), bB = document.getElementById('bB');
  zone(btns, e => {
    const ra = bA.getBoundingClientRect(), rb = bB.getBoundingClientRect(), rad = ra.width / 2;
    const da = Math.hypot(e.clientX - (ra.left + rad), e.clientY - (ra.top + rad));
    const db = Math.hypot(e.clientX - (rb.left + rad), e.clientY - (rb.top + rad));
    let a = da < rad * 1.35, b = db < rad * 1.35;
    if (!a && !b) { if (da < db) a = true; else b = true; }
    return { a, b };
  }, list => {
    const a = list.some(p => p.a), b = list.some(p => p.b);
    setVirtual('TouchJump', a); setVirtual('TouchRun', b);
    bA.classList.toggle('on', a); bB.classList.toggle('on', b);
  });
  document.addEventListener('gesturestart', e => e.preventDefault());

  let acc = 0, last = performance.now();
  function frame(now) {
    acc += Math.min(250, now - last);
    last = now;
    let steps = 0;
    try {
      while (acc >= STEP_MS && steps < 5) {
        game.update();
        Input.endStep();
        acc -= STEP_MS;
        steps++;
      }
      if (steps === 5) acc = 0;
      game.render();
      Music.update();
    } catch (err) {
      acc = 0;
      console.error('OMIRA frame error:', err);   // keep the loop alive no matter what
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Debug / test hook (harmless in normal play)
window.OMIRA = { SPR, LEVELS, Input, Sound, Music, get game() { return game; }, boot, Level, T, TILE };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
