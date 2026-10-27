'use strict';
// Ember Citadel set pieces (1-4). MAGMAW's castle, and MAGMAW is very proud of it:
//   Portrait   a gilt-framed portrait of the boss whose eyes follow you; says its piece as you pass
//   Mallow     a giant marshmallow bobbing in the lava moat. Ride it and your weight roasts it:
//              raw -> GOLDEN (it puffs up, taller) -> brown -> charred -> it bursts into flame and sinks
//   Kiln       a stone pillar in the lava that heats up red-hot now and then (don't stand on it then)
//   Statue     MAGMAW THE MAGNIFICENT, nine tiles of vanity in stone. Push it and
//              it topples into a bridge; set in a row they go down like dominoes (the camera follows)
//   Chef       the castle cook, flipping pancakes clear across a lava pit to...
//   Pancake    ...a rideable pancake in flight
//   Gobbler    ...the boss's food taster, who eats every pancake -- and anyone riding one. Chickaroo
//              does not agree with him: BLEH! he spits him up onto the cliff behind him

const LAVA_LINE = 13 * TILE + 5;   // where the lava surface sits in a pit (see paintLava)

// ---------- Portrait --------------------------------------------------------------------------
class Portrait extends Enemy {
  constructor(col, row, text) {
    super(col * TILE + 8 - 14, row * TILE, 28, 34);
    this.text = text; this.said = false; this.talk = 0; this.lookX = 0; this.lookY = 0;   // text: a line, or a list to pick one from
    this.friendly = this.passive = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.talk > 0) this.talk--;
    const p = g.player, dx = p.x + p.w / 2 - this.cx;
    this.lookX = clamp(dx / 40, -1, 1); this.lookY = clamp((p.y + p.h / 2 - this.y - 14) / 50, -1, 1);
    if (!this.said && p.state === 'play' && Math.abs(dx) < 72) {
      const text = oneOf(this.text);
      this.said = true; this.talk = 70 + text.length * 2;
      g.speak(this, text, '#ffb347');
      Sound.play('honk');
    }
  }
  draw(ctx) {
    ctx.drawImage(magmawPortraitArt(this.lookX, this.lookY, this.talk > 0 && (this.t >> 3) % 2 === 1), Math.round(this.x) - 2, Math.round(this.y) - 9);
  }
}

// ---------- Mallow ----------------------------------------------------------------------------
// A platform (it lives in game.platforms from the start, like the moving boards). Your weight
// pushes it down into the lava and roasts it; it only roasts while someone is on it.
const MALLOW_W = 26, MALLOW_GOLD = 80, MALLOW_BROWN = 170, MALLOW_CHAR = 230, MALLOW_BURN = 270, MALLOW_BACK = 200;
const MALLOW_COLS = [[0, '#fffaf0', '#e8e0d8'], [MALLOW_GOLD, '#ffd27a', '#e0a040'], [MALLOW_BROWN, '#c87a3a', '#8a4a1a'], [MALLOW_CHAR, '#3a2a2e', '#1e1418']];
class Mallow {
  constructor(col, range = 0, period = 300) {
    this.x0 = col * TILE + 8; this.range = range * TILE; this.period = period;
    this.t = (col * 37) % 300; this.toast = 0; this.state = 'float'; this.sink = 0; this.puff = 0; this.back = 0;
    this.ridden = false; this.perfect = false; this.flames = 0;
    this.w = MALLOW_W; this.h = 8; this.dx = 0; this.dy = 0;
    this.place();
    this.prevY = this.y;
  }
  get cx() { return this.x + this.w / 2; }
  place() {
    const k = this.range ? 0.5 - 0.5 * Math.cos(this.t / this.period * Math.PI * 2) : 0;
    this.w = MALLOW_W + Math.round(this.puff * 0.6);
    this.x = this.x0 + this.range * k - this.w / 2;
    this.y = LAVA_LINE - 17 - Math.round(this.puff) + this.sink + Math.round(Math.sin(this.t * 0.06) * 1.2);
  }
  update(g) {
    const ox = this.x, oy = this.y, p = g.player;
    this.t++;
    const was = this.ridden;
    this.ridden = this.state === 'float' && p.state === 'play' && p.platform === this;
    if (this.state === 'float') {
      if (this.ridden) {
        const before = this.toast;
        this.toast++;
        const top = this.y - 6;
        if (before < MALLOW_GOLD && this.toast >= MALLOW_GOLD) { g.popup(this.cx, top, 'GOLDEN!', '#ffd166'); Sound.play('toast'); }
        if (before < MALLOW_CHAR && this.toast >= MALLOW_CHAR) { g.popup(this.cx, top, 'TOO HOT!', '#ff8a2a'); Sound.play('sizzle'); }
        if (this.toast >= MALLOW_BURN) { this.state = 'burn'; g.popup(this.cx, top, 'AAAH!', '#ff6a1f'); Sound.play('burn'); }
      } else if (was && this.toast >= MALLOW_GOLD && this.toast < MALLOW_BROWN && !this.perfect) {
        // hopped off while it was perfectly golden: a little reward for a chef's touch
        this.perfect = true; g.addScore(500, this.cx, this.y - 12); g.popup(this.cx, this.y - 22, 'PERFECT TOAST!', '#ffd166'); Sound.play('coin');
      }
      this.sink += ((this.ridden ? 3 : 0) - this.sink) * 0.15;
      const want = this.toast >= MALLOW_GOLD ? (this.toast >= MALLOW_CHAR ? 7 : 11) : this.toast / MALLOW_GOLD * 3;
      this.puff += (want - this.puff) * 0.08;
      if (this.toast >= MALLOW_CHAR && this.t % 6 === 0) g.particles.push({ kind: 'px', x: this.cx + rand(-8, 8), y: this.y - 2, vx: rand(-0.2, 0.2), vy: rand(-1, -0.4), g: -0.01, life: 40, t: 0, color: '#6a5a6a', size: 2 });
    } else if (this.state === 'burn') {
      this.flames++;
      this.sink += 0.32;
      if (this.t % 2 === 0) g.spark(this.cx + rand(-9, 9), this.y, '#ff8a2a', 20, rand(-0.3, 0.3), rand(-1.6, -0.6));
      if (this.sink > 28) {
        this.state = 'gone'; this.back = MALLOW_BACK;
        if (p.platform === this) p.platform = null;
        g.burst(this.cx, LAVA_LINE, ['#ff6a1f', '#ffd166'], 8);
      }
    } else if (this.state === 'gone') {
      if (--this.back <= 0) { this.state = 'rise'; this.toast = 0; this.puff = 0; this.flames = 0; this.perfect = false; }
    } else if (this.state === 'rise') {   // a fresh one bobs up out of the lava
      this.sink -= 0.6;
      if (this.sink <= 0) {
        this.sink = 0; this.state = 'float';
        if (this.x > g.camX - 20 && this.x < g.camX + VIEW_W) Sound.play('plop');
      }
    }
    this.place();
    if (this.state === 'gone') this.x = -1e5;
    this.dx = this.state === 'float' || this.state === 'burn' ? this.x - ox : 0;
    this.dy = this.y - oy; this.prevY = oy;
  }
  draw(ctx) {
    if (this.state === 'gone') return;
    const x = Math.round(this.x), w = this.w, top = Math.round(this.y), bot = LAVA_LINE + 1;
    if (bot - top < 2) return;
    // the colour roasts through the stages
    let i = 0; while (i + 1 < MALLOW_COLS.length && this.toast >= MALLOW_COLS[i + 1][0]) i++;
    const [, body, side] = MALLOW_COLS[i];
    // a squat cylinder: ink outline, body, shaded right side, a lit top rim (in fine pixels: hires.js)
    const S3 = 1 / 3;
    fRoundRect(ctx, x - 2 / 3, top - 2 / 3, w + 4 / 3, bot - top + 2 / 3, 2.4, INK);
    fRoundRect(ctx, x, top, w, bot - top, 1.8, body);
    fRect(ctx, x + w - 4, top + 2, 3.4, bot - top - 2, side); fEll(ctx, x + w / 2, top + 2.4, w / 2 - 0.4, 1.6, side);
    fEll(ctx, x + w / 2 - 0.6, top + 1.8, w / 2 - 1, 1.4, body);
    fRect(ctx, x + 2, top + S3, w - 7, 2 / 3, i ? '#fff3c4' : '#ffffff'); fEll(ctx, x + 2, top + 2, 1, 1.2, i ? '#fff3c4' : '#ffffff');
    if (i >= 1 && i < 3) { fEll(ctx, x + 4.5, top + 1.5, 1.6, 0.6, '#a05a20'); fEll(ctx, x + w - 7, top + 2.5, 2, 0.6, '#a05a20'); }   // toasty patches
    // a little face on the front
    const fx = x + w / 2 - 0.5, fy = top + 7;
    if (fy + 4 < bot) {
      const ink = i === 3 ? '#ff8a2a' : INK;
      if (this.state === 'burn') {                          // screaming
        for (const ex of [-3, 4]) fEll(ctx, fx + ex, fy + 1, 1, 1.1, ink); fEll(ctx, fx + 0.5, fy + 4.5, 1.6, 1.8, ink);
      } else if (i === 3) {                                 // charred: X_X
        for (const ex of [-3, 4]) { fLine(ctx, fx + ex - 1, fy, fx + ex + 1, fy + 2, ink, 2); fLine(ctx, fx + ex - 1, fy + 2, fx + ex + 1, fy, ink, 2); }
        fRect(ctx, fx - 1, fy + 4, 3, 2 / 3, ink);
      } else if (i === 1) {                                 // golden: blissful ^ ^ and a big grin
        for (const ex of [-3, 4]) fArc(ctx, fx + ex, fy + 1.6, 0.6, 1.3, Math.PI * 1.1, Math.PI * 1.9, ink);
        fArc(ctx, fx + 0.5, fy + 2.4, 1, 2.2, Math.PI * 0.15, Math.PI * 0.85, ink);
        fEll(ctx, fx - 6, fy + 2.5, 1, 0.5, '#ff9ab8'); fEll(ctx, fx + 7, fy + 2.5, 1, 0.5, '#ff9ab8');
      } else {                                              // raw (nervous once ridden), brown (worried)
        for (const ex of [-3, 4]) fEll(ctx, fx + ex, fy + 1, 0.9, 1.1, ink);
        if (this.ridden || i === 2) { fRect(ctx, fx - 1, fy + 3.4, 3, 2 / 3, ink); fEll(ctx, fx + 7.5, fy - 1 + ((this.t >> 3) % 3), 0.5, 0.9, '#9fe3ff'); }
        else fArc(ctx, fx + 0.5, fy + 2.4, 1, 1.7, Math.PI * 0.2, Math.PI * 0.8, ink);
      }
    }
    if (this.state === 'burn') {   // flames licking up over it
      for (let k = 0; k < w; k += 4) {
        const h = 4 + ((k * 7 + (this.t >> 1)) % 7) + Math.min(6, this.flames >> 3);
        fPoly(ctx, [[x + k - 0.4, top + 0.5], [x + k + 1.5, top - h], [x + k + 3.4, top + 0.5]], '#ff6a1f'); fPoly(ctx, [[x + k + 0.6, top + 0.5], [x + k + 1.5, top - h + 3], [x + k + 2.4, top + 0.5]], '#ffd166');
      }
    }
    // the lava laps at it
    fEll(ctx, x + w / 2, LAVA_LINE - 0.4, w / 2 + 2.4, 0.9, '#ffd27a'); fEll(ctx, x + w / 2, LAVA_LINE + 0.8, w / 2 + 1.4, 1, '#ff6a1f');
  }
}

// ---------- Statue ----------------------------------------------------------------------------
// Stands on a 2-tile footprint (columns col, col+1) on the ground of `row`, pivoting on its bottom
// right corner: it always falls to the right, and lies STATUE_H px long once down. A statue whose
// head lands where another stands knocks that one over too.
const STATUE_H = 144, STATUE_W = 32, STATUE_PUSH = 50;
const statueArt = new Map();
function statueSprite(gold, damaged = false) {
  const key = `${gold}:${damaged}`;
  if (statueArt.has(key)) return statueArt.get(key);
  const img = fineMagmawStatue(gold, damaged);
  statueArt.set(key, img);
  return img;
}
const MAGMAW_VOICE = { speakerName: 'MAGMAW', remove: true };   // heard from off-screen (`remove`: no marker over anyone)
// the first one down, then once for the domino chain (each a pool: one picked at random)
const STATUE_LINES = [
  [
    'MY STATUE!!',
    'MY FACE! MY STONE FACE!',
    'HEY! THAT WAS ME!',
    'WHO PUSHED ME?! I MEAN... MY STATUE!',
    'NOT THE STATUE!',
    'I FELT THAT!',
    'MY BEAUTIFUL NOSE!',
    'THAT TOOK NINE YEARS TO CARVE!',
    'DOWN GOES MAGMAW! ...THE STATUE, I MEAN.',
    'AAAH! I\'M FALLING! OH WAIT. THAT\'S THE STATUE.',
  ],
  [
    'NOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO!',
    'NOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO!!!',
    'NO NO NO NO NO NO NO NO NO NO NO NO NO NO NO!',
    'NUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU!',
    'NONONONONONONONONONONONONONONONONONONONONO!',
    'NOOOOOOOOOOOOOOOOOOOOOOOOOO... (SOB) ...OOOOOOO!',
    'N-N-N-NOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO!',
    'NOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
    'NOOOOOO! NOOOOOOOO! NOOOOOOOOOOOOOOOOOO!',
    'NAAAAAAAAOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO!',
  ],
];
// ---------- Kiln ------------------------------------------------------------------------------
// A stone pillar standing in the lava that heats up on a cycle: cool (safe), a warning glow that
// pulses brighter, then red-hot for a moment -- standing on it then hurts and bounces you off -- and
// it cools back down. The whole cycle is short, so a marshmallow never roasts away while you wait.
// blend two '#rrggbb' colours (u = 0 -> a, 1 -> b)
const HEX2 = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
const HEX_INT_CACHE = Object.create(null);
function hexInt(c) {
  let v = HEX_INT_CACHE[c];
  if (v === undefined) v = HEX_INT_CACHE[c] = parseInt(c.slice(1), 16);
  return v;
}
function lerpColor(a, b, u) {
  if (u <= 0) return a;
  if (u >= 1) return b;
  const A = hexInt(a), B = hexInt(b);
  const ar = (A >> 16) & 255, ag = (A >> 8) & 255, ab = A & 255;
  const r = Math.round(ar + (((B >> 16) & 255) - ar) * u);
  const g = Math.round(ag + (((B >> 8) & 255) - ag) * u);
  const bl = Math.round(ab + ((B & 255) - ab) * u);
  return '#' + HEX2[r] + HEX2[g] + HEX2[bl];
}
const KILN_COOL = 160, KILN_WARN = 50, KILN_HOT = 80, KILN_CYCLE = KILN_COOL + KILN_WARN + KILN_HOT;
class Kiln extends Enemy {
  constructor(x0, row, x1, phase = 0) {
    super(x0 * TILE, row * TILE, (x1 - x0 + 1) * TILE, (ROWS - row) * TILE);   // all the way down, into the lava
    this.k = Math.round(phase * KILN_CYCLE);
    this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  get hot() { return this.k >= KILN_COOL + KILN_WARN; }
  // 0 = cold stone .. 1 = red-hot (rising through the warning, fading over the first part of the cool)
  get heat() {
    const k = this.k;
    if (k < 30) return Math.max(0, 1 - k / 30) * 0.9;
    if (k < KILN_COOL) return 0;
    if (k < KILN_COOL + KILN_WARN) return (k - KILN_COOL) / KILN_WARN * 0.6;
    return 1;
  }
  update(g) {
    this.t++;
    this.k = (this.k + 1) % KILN_CYCLE;
    const onScreen = this.x + this.w > g.camX && this.x < g.camX + VIEW_W;
    if (this.k === KILN_COOL + KILN_WARN && onScreen) Sound.play('sizzle');
    if (onScreen && this.heat > 0.3 && Math.random() < this.heat * 0.3)   // heat shimmer rising off the top
      g.particles.push({ kind: 'px', x: this.x + rand(2, this.w - 2), y: this.y - 1, vx: rand(-0.2, 0.2), vy: rand(-1, -0.4), g: 0, drag: 0.98, life: 22, t: 0, color: this.hot ? '#ffd166' : '#ff6a1f', size: 1 });
    if (onScreen && this.hot && Math.random() < 0.45)   // piping hot: steam billowing off the top and the sides
      g.particles.push({ kind: 'steam', x: this.x + rand(-2, this.w + 2), y: this.y + (Math.random() < 0.75 ? rand(-2, 2) : rand(6, 40)), vx: rand(-0.25, 0.25), vy: rand(-1.1, -0.5), g: 0, drag: 0.985, life: 40 + rand(0, 20), t: 0, r: rand(2, 3.5) });
    else if (onScreen && this.heat > 0.4 && Math.random() < 0.06)   // the odd wisp as it warms up
      g.particles.push({ kind: 'steam', x: this.x + rand(2, this.w - 2), y: this.y, vx: 0, vy: -0.6, g: 0, drag: 0.985, life: 30, t: 0, r: 1.5 });
    const p = g.player;
    if (this.hot && p.state === 'play' && p.onGround && !p.platform && Math.abs(p.y + p.h - this.y) < 2 && p.x + p.w > this.x + 1 && p.x < this.x + this.w - 1) {
      g.hurtPlayer();
      p.vy = -6; p.onGround = false; p.jumping = false;
      Sound.play('ow'); g.popup(p.x + p.w / 2, p.y - 6, 'HOT!', '#ff6a1f');
    }
  }
  // Incandescent stone, fine fissures and a wavering veil of heat above the walking surface.
  draw(ctx) {
    const heat = this.heat, x = fSnap(this.x), y = fSnap(this.y);
    if (heat > 0) {
      for (let dx = 6; dx < this.w; dx += 12) fGlow(ctx, x + dx, y + 6, 17, '#ff713e', heat * 0.17);
    }
    ctx.drawImage(kilnPillarArt(this.w, this.h, Math.round(heat * 16)), x, y);
    if (heat > 0.2) {
      ctx.globalAlpha = heat * 0.14;
      for (let i = 0; i < 3; i++) {
        let prev = null;
        for (let k = 0; k < 20; k++) {
          const yy = y - k * 0.6, xx = x + this.w * (i + 1) / 4 + Math.sin(this.t * 0.055 + i * 2 + k * 0.35) * 1.4;
          if (prev) fLine(ctx, ...prev, xx, yy, '#ffe9c4', 1);
          prev = [xx, yy];
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}

class Statue extends Enemy {
  constructor(col, row, kind, line) {
    super(col * TILE, (row + 1) * TILE - STATUE_H, STATUE_W, STATUE_H);
    this.pivot = (col + 2) * TILE; this.base = (row + 1) * TILE;
    this.gold = kind === 'gold'; this.line = line;
    this.state = 'stand'; this.a = 0; this.w0 = 0; this.push = 0; this.wob = 0; this.next = undefined; this.root = false; this.doneT = 0;
    this.noFreeze = this.friendly = this.passive = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }   // only player pushing (or a pushed statue's domino chain) can topple it
  touches() { return false; }
  // the statue whose base its head will land on (spawning it now if it hasn't scrolled into view yet)
  findNext(g) {
    const want = this.pivot + STATUE_H;
    let n = g.entities.find(e => e instanceof Statue && e !== this && Math.abs(e.pivot - want) < 24);
    if (!n) {
      const i = g.spawnQueue.findIndex(s => s.def[0] === 'statue' && Math.abs((s.def[1] + 2) * TILE - want) < 24);
      if (i >= 0) { n = g.makeEntity(g.spawnQueue.splice(i, 1)[0].def); g.entities.push(n); }
    }
    return n || null;
  }
  topple(g) {
    if (this.state !== 'stand') return;
    this.state = 'fall'; this.w0 = 0.006;
    this.next = this.findNext(g);
    Sound.play('creak');
    const seen = g.seenCine || (g.seenCine = new Set());
    if (this.root && this.next && !seen.has('dominoes')) { seen.add('dominoes'); g.cinema = 999; this.filming = true; }
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'stand') {
      if (this.wob > 0) this.wob--;
      // solid to Chickaroo: he can lean on it, and leaning on it long enough tips it over
      if (p.state === 'play' && overlap(this, p)) {
        if (p.x + p.w / 2 < this.cx) { p.x = this.x - p.w; if (p.vx > 0) p.vx = 0; }
        else { p.x = this.x + this.w; if (p.vx < 0) p.vx = 0; }
      }
      const leaning = p.state === 'play' && p.onGround && Input.down('right') && Math.abs(p.x + p.w - this.x) < 1.5 && p.y + p.h > this.base - 40;
      if (leaning) {
        this.push++; this.wob = 6; p.strainT = g.t;   // (drawPlayer: the effort face)
        if (this.push % 25 === 1) { Sound.play('rumble'); g.popup(p.x + p.w / 2, p.y - 6, this.push > 25 ? 'HNNNGH!' : 'HNNG!', '#ffffff'); }
        if (this.push >= STATUE_PUSH) { this.root = true; this.topple(g); }
      } else if (this.push > 0) this.push--;
      return;
    }
    if (this.state === 'fall') {
      // its base still stands at the pit's edge while it goes over: nobody walks off into the lava behind it
      if (p.state === 'play' && p.y + p.h > this.base - 40 && p.x + p.w > this.pivot - STATUE_W && p.x < this.pivot) { p.x = Math.min(p.x, this.pivot - p.w); if (p.vx > 0) p.vx = 0; }
      this.w0 += 0.0011 + 0.0042 * Math.sin(this.a);
      this.a += this.w0;
      if (this.next && this.next.state === 'stand' && this.pivot + STATUE_H * Math.sin(this.a) >= this.next.x - 6) this.next.topple(g);
      if (this.a >= Math.PI / 2) this.land(g);
    }
    if (this.filming) this.film(g);
  }
  land(g, restoring = false) {
    if (this.state === 'down') return;
    this.a = Math.PI / 2; this.state = 'down';
    g.fallenStatues.add(this.pivot);
    const top = this.base - 36, pl = { x: this.pivot, y: top, w: STATUE_H, h: 8, dx: 0, dy: 0, prevY: top, update() {}, draw() {} };
    g.platforms.push(pl);
    // ...and a solid body under that top: walk into it and you bump it (no strolling underneath into the lava)
    const lv = g.level, c0 = Math.floor(this.pivot / TILE), c1 = Math.floor((this.pivot + STATUE_H - 1) / TILE);
    for (let c = c0; c <= c1; c++) for (let r = Math.ceil(top / TILE); r * TILE < this.base; r++) if (!lv.solid(c, r)) lv.set(c, r, T.BODY);
    if (restoring) return;   // no repeated crown reward, dialogue, impact damage or camera sequence
    g.shake = Math.max(g.shake, 5);
    Sound.play('thud'); Sound.play('break');
    for (let i = 0; i < 14; i++) g.dust(this.pivot + rand(0, STATUE_H), this.base - 2, 1);
    for (let i = 0; i < 8; i++) g.particles.push({ kind: 'px', x: this.pivot + STATUE_H - rand(0, 20), y: this.base - rand(0, 30), vx: rand(-1, 2), vy: rand(-3, -1), g: 0.2, life: 40, t: 0, color: this.gold ? '#ffd166' : '#8a7f96', size: 2 });
    // anything caught under it is flattened
    const zone = { x: this.pivot, y: this.base - STATUE_W - 8, w: STATUE_H, h: STATUE_W + 8 };
    for (const e of g.entities) {
      if (e === this || e.dead || e.friendly || e.passive || e.bossHazard) continue;
      const b = e.hitbox(); if (!b || !overlap(zone, b)) continue;
      e.flipKill(g, 1); g.addScore(1000, e.cx, e.y); g.popup(e.cx, e.y - 12, 'CRUNCH!', '#ffd166');
    }
    const n = (g.statuesDown = (g.statuesDown || 0) + 1);
    if (this.line || n <= STATUE_LINES.length) g.speak(MAGMAW_VOICE, this.line || STATUE_LINES[n - 1], '#ff8a5a');
    if (this.gold) {   // the crown pops off and rolls away... it was worth a life
      g.oneUp(this.pivot + STATUE_H - 16, this.base - 50);
      g.burst(this.pivot + STATUE_H - 16, this.base - 30, ['#ffd166', '#fff0a0', '#ffffff'], 18);
    }
  }
  // the first statue of a chain drives the camera along the line of falling statues, then hands it back
  film(g) {
    let f = this;
    while (f.next && f.next.state !== 'stand') f = f.next;
    g.arenaCam = clamp(f.pivot + STATUE_H * Math.sin(f.a) * 0.5 - VIEW_W / 2 + 40, 0, g.level.w * TILE - VIEW_W);
    if (f.state === 'down' && ++this.doneT > 70) { this.filming = false; g.arenaCam = null; g.cinema = 0; }
  }
  draw(ctx) {
    const spr = statueSprite(this.gold, this.state === 'down'), wob = this.state === 'stand' && this.wob ? ((this.t >> 1) % 2 ? 0.012 : -0.008) * Math.min(1, this.push / 20) : 0;
    ctx.save();
    ctx.translate(this.pivot, this.base);
    ctx.rotate(this.a + wob);
    ctx.drawImage(spr, -36, -STATUE_H);
    ctx.restore();
  }
}

// ---------- the kitchen: Chef, Pancake, Gobbler -----------------------------------------------
const CHEF_LINES = [
  'ORDER UP!',
  'HOT CAKES! GET \'EM WHILE THEY FLY!',
  'ONE STACK, EXTRA AIR!',
  'PANCAKE COMING THROUGH!',
  'FLIP! ...AND AWAY!',
  'FRESH OFF THE PAN!',
  'HEADS UP! BREAKFAST!',
  'ANOTHER ONE FOR THE BOSS!',
  'SERVICE! AIRMAIL!',
  'WATCH THIS FLIP!',
];
const CHEF_PERIOD = 150, PANCAKE_T = 170, PANCAKE_ARC = 92, PANCAKE_W = 26;
class Pancake {
  constructor(x0, y0, x1, y1) {
    this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
    this.t = 0; this.state = 'fly'; this.vy = 0;
    this.w = PANCAKE_W; this.h = 6; this.dx = 0; this.dy = 0;
    this.place(); this.prevY = this.y;
  }
  place() {
    const u = Math.min(1, this.t / PANCAKE_T);
    this.x = this.x0 + (this.x1 - this.x0) * u - this.w / 2;
    this.y = this.y0 + (this.y1 - this.y0) * u - 4 * PANCAKE_ARC * u * (1 - u);
  }
  drop() {   // no longer something to stand on (a ghost platform): it just falls, into the lava mostly
    this.state = 'fall'; this.vy = -1.5; this.ghost = true;
  }
  update(g) {
    const ox = this.x, oy = this.y;
    this.t++;
    if (this.state === 'fly') {
      this.place();
      if (this.t >= PANCAKE_T) {
        const gob = g.entities.find(e => e instanceof Gobbler && Math.abs(e.mouthX - this.x1) < 24);
        if (gob) gob.catchCake(g, this); else this.drop();
      }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 0.3, 6); this.y += this.vy; this.x += 0.6;
      if (this.y > LAVA_LINE - 4) { this.remove = true; g.burst(this.x + this.w / 2, LAVA_LINE, ['#ff6a1f', '#ffd166'], 5); Sound.play('sizzle'); }
    }
    this.dx = this.x - ox; this.dy = this.y - oy; this.prevY = oy;
  }
  draw(ctx) {   // (painted fine: pancakeArt)
    if (this.remove) return;
    // flipping out of the pan: tumbling end over end for its first few frames
    const spin = this.t < 26 ? Math.abs(Math.cos(this.t * 0.36)) : 1, h = Math.max(2, Math.round(6 * spin));
    ctx.drawImage(pancakeArt(h, (this.t >> 4) % 2), Math.round(this.x) - 2, Math.round(this.y) - 6);
  }
}
// the kitchen's look, painted fine and baked once per pose (mArt: meadow-art.js)
const CIT_ART = new Map();
const citArt = (key, paint) => CIT_ART.get(key) || (CIT_ART.set(key, paint()), CIT_ART.get(key));
const BATTER = ['#8a4a18', '#b86a28', '#e09a48', '#f4c070', '#ffe2a8'];
// a fluffy golden pancake (30 x 13; the cake's top-left at (2, 12 - h)): browned round its rim, and when it's flat
// (h 6) a pat of butter melting on top and syrup running down its side (drip: 0 / 1, a little longer)
function pancakeArt(h, drip) {
  return citArt('cake' + h + (h >= 5 ? drip : ''), () => {
    const A = mArt(30, 13), top = 12 - h, cy = top + h / 2;
    A.fill(1, top - 1, 29, 13, (x, y) => {
      const u = (x - 15) / 13, v = (y - cy) / (h / 2);
      if (Math.abs(v) > 1 || Math.abs(u) > 1 || (Math.abs(u) > 0.9 && (Math.abs(u) - 0.9) / 0.1 > Math.sqrt(Math.max(0, 1 - v * v)))) return null;
      return softTone(BATTER, 0.9 - v * 1.1 - Math.abs(u) ** 4 * 0.9);
    });
    if (h >= 5) {
      A.fill(1, top, 29, top + 1, (x, y) => y < top + 0.7 && Math.abs(x - 15) < 11 ? BATTER[4] : null);   // its soft lit top
      A.poly([[7, top + 0.2], [17, top + 0.2], [16, top + 1.4], [10.4, top + 1.6], [9.4, top + 3 + drip * 1.6], [8.2, top + 3 + drip * 1.6], [7.6, top + 1.6]], '#a0521a');   // syrup running down its side
      A.soft(13, top - 1.3, 3.8, 1.8, ['#d8b040', '#f0d060', '#fff0a0', '#fff8d0', '#ffffff']);   // butter
    }
    A.outline();
    if (h >= 5) { A.ell(9.8, top + 0.5, 1.2, 0.3, '#e08a4a'); A.ell(11.8, top - 2, 0.9, 0.3, '#ffffff'); }   // the glint on the syrup, on the butter
    return A.canvas();
  });
}

class Chef extends Enemy {
  constructor(col, row, toCol, toRow) {
    super(col * TILE, (row + 1) * TILE - 38, 18, 38);   // tall, counting the toque (speech goes above it)
    this.to = [toCol * TILE + 8, toRow * TILE];
    this.n = 0; this.squash = 0; this.k = CHEF_PERIOD - 50; this.pan = null;
    this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  get panX() { return this.x + this.w + 12; }
  get panY() { return this.y + this.h - 14; }
  // the pan's top, dipping as he winds up and flicking up as he flips (it's a platform: stand on it
  // and the next pancake carries you off with it)
  get panTop() { return this.panY - 1 + (this.k > CHEF_PERIOD - 18 ? 3 : this.k < 10 ? -5 : 0); }
  update(g) {
    this.t++;
    if (!this.pan) {
      const pan = this.pan = { x: this.panX - 10, y: this.panTop, w: 20, h: 4, dx: 0, dy: 0, prevY: this.panTop, draw() {} };
      pan.update = () => { const y = this.panTop; pan.prevY = pan.y; pan.dy = y - pan.y; pan.y = y; };
      g.platforms.push(pan);
    }
    if (this.squash > 0) this.squash--;
    const near = this.x > g.camX - 120 && this.x < g.camX + VIEW_W + 40;
    if (!near) return;
    if (++this.k >= CHEF_PERIOD) {
      this.k = 0;
      const cake = new Pancake(this.panX, this.panY - 6, this.to[0], this.to[1]), p = g.player;
      g.platforms.push(cake);
      if (p.platform === this.pan && p.state === 'play') { p.y = cake.y - p.h; p.platform = cake; p.vy = 0; }   // flipped off along with it
      Sound.play('flip');
      // one line, with the first pancake he's seen sending out
      if (!g.level.chefTold && this.x > g.camX && this.x < g.camX + VIEW_W) { g.level.chefTold = true; g.speak(this, CHEF_LINES, '#ffffff'); }
      this.n++;
    }
  }
  hitbox() { return { x: this.x + 1, y: this.y + 14, w: this.w - 2, h: this.h - 14 }; }
  touches(p) { return overlap(this.hitbox(), p); }
  onTouch(g, p) {
    if (p.vy > 0 && p.prevY + p.h <= this.y + 22) {
      g.bounce(p); this.squash = 50; Sound.play('honk');
    }
  }
  draw(ctx) {   // (painted fine: chefArt)
    const wind = this.k > CHEF_PERIOD - 18, flip = this.k < 10, cake = this.k > 40 && !flip;
    const ox = Math.round(this.x) - 4, oy = Math.round(this.y) - 10;
    ctx.drawImage(chefArt(this.squash > 0, wind ? 3 : flip ? -5 : 0, cake, this.panX - Math.round(this.x), this.panY - Math.round(this.y)), ox, oy);
    if (cake && this.t % 12 < 6) {   // steam curling off the pancake in the pan
      const sx = this.panX - 2 + ((this.t >> 2) % 3), sy = this.panY + (wind ? 3 : 0) - 8;
      ctx.globalAlpha = 0.7; fBlob(ctx, sx, sy, 0.9, '#ece4e4'); fBlob(ctx, sx + 0.7, sy - 1.6, 0.7, '#ece4e4'); ctx.globalAlpha = 1;
    }
  }
}
// CHEF, a round little fire imp in a white apron and a towering toque, a curled moustache and rosy cheeks, his pan out
// to his right (dy: dipped as he winds up, flicked up as he flips; `cake`: one sizzling in it). 50 x 50, his box's
// top-left at (4, 10); px/py: where the pan sits relative to his box
const CHEF_SKIN = ['#7a1a10', '#b8341e', '#e8603a', '#ff8a5a', '#ffc09a'], LINEN = ['#a8a2c8', '#cdc8e4', '#ebe8f6', '#ffffff', '#ffffff'];
function chefArt(squashed, dy, cake, px, py) {
  return citArt('chef' + squashed + dy + cake + px + ',' + py, () => {
    const A = mArt(50, 50), X = 4 + 9, B = 10 + 38, P = [4 + px, 10 + py + dy];   // his middle, his feet, the pan
    for (const sd of [-1, 1]) { A.soft(X + sd * 3.4, B - 3, 1.6, 2.4, CHEF_SKIN); A.soft(X + sd * 3.8 + 0.6, B - 1.3, 2.8, 1.4, ['#14101c', '#241c30', '#3a3048', '#5a5070', '#8a80a0']); }   // stubby legs, polished shoes
    // the arm out to the pan, and the pan on its wooden handle
    A.line(X + 6, B - 14, P[0] - 11.5, P[1] + 0.5, CHEF_SKIN[2], null, 2.2);
    A.line(P[0] - 11, P[1] + 0.6, P[0] - 9, P[1] + 0.8, '#7a5030', null, 1.3);
    A.fill(P[0] - 11, P[1] - 2, P[0] + 11, P[1] + 5, (x, y) => {   // a black iron pan, side on: lit rim, round belly
      const u = (x - P[0]) / 10, v = (y - P[1] - 1) / 3;
      if (Math.abs(u) > 1 || v < -1 || v > 1 || (v > 0 && Math.abs(u) > Math.sqrt(1 - v * v * 0.6))) return null;
      return v < -0.55 ? '#a8a2bc' : softTone(['#14121c', '#24202e', '#3a3448', '#5a5270', '#8a84a0'], -0.8 * u - v * 0.9);
    });
    A.soft(P[0] - 11.6, P[1] + 0.6, 2.3, 2, CHEF_SKIN);                                         // his fist round the handle
    if (cake) A.fill(P[0] - 9, P[1] - 3.4, P[0] + 9, P[1], (x, y) => { const u = (x - P[0]) / 8, v = (y - P[1] + 1.8) / 1.5; return u * u + v * v <= 1 ? softTone(BATTER, 0.9 - v * 1.2) : null; });
    A.soft(X, B - 13, 9.4, 9.6, CHEF_SKIN);                                                     // the round fiery body
    A.fill(X - 7, B - 16, X + 7, B - 4, (x, y, ax, ay) => {   // his apron, on the body only
      const u = (x - X) / 5.6, v = (y - (B - 10)) / 6;
      return Math.abs(u) <= 1 && Math.abs(v) <= 1 && !(v > 0.6 && Math.abs(u) > Math.sqrt(1 - (v - 0.6) ** 2 / 0.16)) && A.buf[ay * 50 * A.R + ax] ? softTone(LINEN, 0.6 - u * 0.8 - v * 0.4) : null;
    });
    A.fill(X - 3, B - 10, X + 3, B - 7, (x, y) => Math.abs(x - X - 0.3) < 2.6 && y > B - 9.6 && y < B - 7.2 ? LINEN[1] : null);   // the pocket
    A.line(X - 5.4, B - 16, X - 7.4, B - 18.6, LINEN[2], null, 0.6); A.line(X + 5.4, B - 16, X + 7.4, B - 18.6, LINEN[1], null, 0.6);   // its strings
    for (const sd of [-1, 1]) A.ell(X + sd * 6.2, B - 18.6, 1.5, 0.8, '#ff8aa8');               // rosy cheeks
    // the toque: a starched band, and the puffs billowing up out of it (squashed flat for a while after a stomp)
    if (squashed) { A.soft(X, B - 27, 8.6, 2.2, LINEN); A.soft(X + 0.4, B - 24.2, 7, 1.6, LINEN); }
    else {
      for (const [dx, dyy, r] of [[-4.4, -33.2, 4.8], [4.4, -33.6, 4.8], [0, -35.8, 5.6], [0, -30.8, 5]]) A.soft(X + dx, B + dyy, r, r * 0.92, LINEN);
      A.fill(X - 7, B - 29, X + 7, B - 23.2, (x, y) => Math.abs(x - X) <= 6.2 && y > B - 28.6 ? softTone(LINEN, 0.4 - (x - X) / 6) : null);   // the band
      A.line(X - 5.6, B - 28.4, X + 5.6, B - 28.4, LINEN[0], null, 0.4);
    }
    A.outline();
    for (const sd of [-1, 1]) { A.ell(X + sd * 3.1 + 0.5, B - 20.4, 1.05, 1.4, INK); A.ell(X + sd * 3.1 + 0.2, B - 21, 0.35, 0.4, '#ffffff'); }   // beady eyes
    for (const sd of [-1, 1]) {   // a proud moustache, curled up at both ends
      A.soft(X + sd * 2.6 + 0.3, B - 16.8, 2.8, 1.1, ['#1a0e10', '#2e1a18', '#4a2c24', '#6a4434', '#8a5c44'], null, sd * 0.25);
      A.soft(X + sd * 5.2 + 0.3, B - 18, 0.9, 0.9, ['#1a0e10', '#2e1a18', '#4a2c24', '#6a4434', '#8a5c44']);
    }
    return A.canvas();
  });
}

// GOBBLER, facing left toward the pancakes: a big round lava imp lit from the top left, his mouth right on
// mouthX/mouthY, a bib tied under it, knife and fork up in his fists, curled horns and goggly eye domes on top.
// face: 'grin' (licking his lips), 'open' (one's coming: mouth wide, eyes like saucers), 'chew' (eyes shut, a cheek
// bulging), 'bleh' (crossed eyes, tongue out); b: his bob while he chews; puff: fuller with a mouthful; kick: a chick's
// feet kicking out of his mouth (0: none, 1 / 2); w: the tongue's waggle. 50 x 48, his box's top-left at (4, 4)
const GOB_SKIN = ['#5a1410', '#8a2016', '#bf3820', '#ea5d30', '#ff8c50', '#ffc48c'];
const GOB_DARK = ['#320b0a', '#501512', '#78221c', '#a43428', '#d04e38'];
const STEEL = ['#403c54', '#66617e', '#9590ae', '#c5c2d8', '#eceaff', '#ffffff'];
function gobblerArt(face, b, puff, kick, w) {
  return citArt('gob' + face + b + puff + kick + (face === 'bleh' ? w : ''), () => {
    const A = mArt(50, 48), o = (x, y) => [x + 4, y + 4 + b], O = (x, y) => [x + 4, y + 4];

    // Planted chubby feet
    for (const fx of [12, 29]) {
      A.soft(...O(fx, 38), 5.6, 2.8, GOB_DARK);
      for (let i = 0; i < 3; i++) A.ell(...O(fx - 2.2 + i * 2.2, 39.4), 0.75, 0.5, '#ffd89a'); // claw toes
    }

    // The fork in back fist: steel shaft, crossbar, and 3 distinct tines with specular shine
    A.line(...o(37.5, 7), ...o(37.5, 24), STEEL[2], null, 1.2);
    A.line(...o(37.5, 7), ...o(37.5, 24), STEEL[4], null, 0.4);
    A.fill(...o(34.2, 1.5), ...o(40.8, 8.5), (x, y) => {
      const [lx, ly] = [x - 4, y - 4 - b];
      if (ly > 5.4) return Math.abs(lx - 37.5) < 2.8 ? (ly < 6.4 ? STEEL[4] : STEEL[2]) : null;
      if ([35.2, 37.5, 39.8].some(t => Math.abs(lx - t) < 0.55) && ly > 1.8) return ly < 3.2 ? STEEL[5] : STEEL[3];
      return null;
    });
    A.soft(...o(37, 23), 3.2, 2.8, GOB_DARK); // back fist clutching fork

    // Curled ivory-gold horns rooted in the cranium with segmented ridges
    for (const [hx, hy, sd] of [[8, 10, -1], [31, 8, 1]]) {
      const [x, y] = o(hx, hy);
      A.poly([[x - 2.5, y + 4], [x - 1.8 + sd * 0.8, y - 1], [x + sd * 2, y - 5.2], [x + sd * 1.6, y - 1.2], [x + 2.5, y + 4]], '#e5b848');
      A.fill(x - 3.5, y - 5.5, x + 3.5, y + 4, (px, py) => py < y - 2 ? '#fff5ca' : py > y + 1.8 ? '#a87820' : null, ['#e5b848']);
      // horn ring ridges
      for (let r = 0; r < 3; r++) {
        const ry = y + 2.5 - r * 2.2;
        A.line(x - 2.2 + sd * 0.5 * r, ry, x + 2.2 + sd * 0.5 * r, ry + 0.6, '#7e5512', null, 0.45);
      }
    }

    // Big round lava body with volumetric lighting
    A.soft(...o(21, 24), 17.5 + puff, 14.5 + puff * 0.5, GOB_SKIN);
    A.ell(...o(17, 18), 7, 5, '#ff8c50'); // chest specular highlight
    A.ell(...o(15, 17), 4, 2.5, '#ffc48c');

    if (face === 'chew') {
      A.soft(...o(24, 20.5), 3.8 + puff, 3.4 + puff, GOB_SKIN); // bulging stuffed cheek
      A.ell(...o(25, 19.5), 2.2, 1.8, '#ff9a5a');
    }

    // The dining bib: pink scalloped hem, cloth shading, and sticky dribbled syrup
    A.fill(...o(9, 26), ...o(26, 38), (x, y, ax, ay) => {
      const [lx, ly] = [x - 4, y - 4 - b], u = (lx - 17.5) / 7.6, v = (ly - 31.8) / 5.4;
      if (ly > 26.4 && Math.abs(u) <= 1 - Math.max(0, v) * 0.12 && v <= 1 && !(v > 0.55 && Math.abs(u) > Math.sqrt(1 - (v - 0.55) ** 2 / 0.2)) && A.buf[ay * 50 * A.R + ax]) {
        if (ly < 27.6) return '#ff729e'; // pink hem
        return softTone(LINEN, 0.5 - u * 0.8 - v * 0.3);
      }
      return null;
    });
    // dripping syrup puddle on bib
    A.soft(...o(18.4, 32), 2, 1.4, ['#7a3808', '#a85012', '#d88636', '#f2b45a', '#ffe096']);
    A.ell(...o(18.6, 34), 0.6, 1.1, '#e08828');
    A.ell(...o(18.3, 33.6), 0.3, 0.3, '#fff4d0'); // syrup shine

    // Eye domes
    for (const [ex, ey] of [[13, 12], [24, 11]]) {
      A.soft(...o(ex, ey), 4.8, 4.8, GOB_SKIN);
      A.ell(...o(ex - 0.5, ey - 0.8), 2.8, 1.8, '#ff8c50');
    }

    // Knife in front fist
    A.poly([o(0.2, 3.0), o(2.8, 1.2), o(3.2, 12), o(0.4, 12)], STEEL[3]);
    A.fill(...o(0, 1), ...o(3.4, 12), (x, y) => (x - 4 < 1.2 ? STEEL[5] : STEEL[2]), [STEEL[3]]);
    A.line(...o(1.6, 12), ...o(1.6, 25), '#4a2a18', null, 1.4); // wooden handle
    A.ell(...o(1.6, 16), 0.3, 0.3, '#d4c090'); // handle brass rivet
    A.soft(...o(1.4, 25), 3.2, 2.8, GOB_SKIN); // front fist

    // Chickaroo feet kicking out of mouth during swallow
    if (kick) {
      for (const sd of [-1, 1]) {
        A.soft(...o(0.2, 21.6 + sd * (2.8 + (kick - 1))), 3.8, 1.4, ['#b04e12', '#d86e24', '#ff9c3e', '#ffc27e', '#fff2dc'], null, sd * 0.28);
      }
    }

    A.outline();

    // Expressive eyes
    for (const [ex, ey, i] of [[13, 12, 0], [24, 11, 1]]) {
      const [x, y] = o(ex, ey);
      if (face === 'chew') {
        // Savouring eyes squeezed shut in foodie bliss
        for (let k = -2.2; k <= 2.2; k += 0.25) A.ell(x + k, y + 0.6 - (1 - (k / 2.2) ** 2) * 1.3, 0.35, 0.35, INK);
        continue;
      }
      const r = face === 'open' ? 3.4 : 2.7;
      A.ell(x, y, r, r, '#ffffff');
      A.ell(x + r * 0.28, y + r * 0.32, r * 0.75, r * 0.45, '#d0cce4', ['#ffffff']);
      const pxo = face === 'bleh' ? (i ? -1.2 : 1.2) : -1.2, pr = face === 'open' ? 1.1 : 1.25;
      A.ell(x + pxo, y + 0.2, pr, pr * 1.15, INK);
      A.ell(x + pxo - 0.45, y - 0.45, 0.4, 0.4, '#ffffff');
      if (face === 'grin') {
        A.fill(x - 3.2, y - 3.2, x + 3.2, y, (px, py) => ((px - x) ** 2 + (py - y) ** 2 <= 2.9 * 2.9 && py < y - 0.8 ? GOB_SKIN[2] : null));
      }
    }

    // Mouth rendering
    const [mx, my] = o(12.5, 22);
    const curve = (x0, x1, y0, sag, col, t = 0.5) => {
      for (let x = x0; x <= x1; x += 0.2) {
        const u = (x - x0) / (x1 - x0) * 2 - 1;
        A.ell(x, y0 + (1 - u * u) * sag, t, t, col);
      }
    };

    if (face === 'open') {
      A.fill(mx - 9.5, my - 5.5, mx + 9.5, my + 7.5, (x, y) => {
        const u = (x - mx) / 8.5, v = (y - my - 1) / 5.5;
        return u * u + v * v <= 1 ? lerpColor('#4c1220', '#180410', (v + 1) / 2) : null;
      });
      A.soft(mx, my + 3.8, 5.4, 2.0, ['#8c1e38', '#bc3252', '#ff6a8e', '#ff9ab4', '#ffd0dc']); // gullet & tongue
      for (const tx of [-4.5, 4.5]) {
        A.poly([[mx + tx - 1.3, my - 3.8], [mx + tx + 1.3, my - 3.8], [mx + tx, my - 1.2]], '#ffffff'); // sharp top fangs
      }
    } else if (face === 'bleh') {
      curve(mx - 7.5, mx + 8.5, my, -0.9, INK);
      A.soft(mx - 3.6, my + 2.5 + w * 0.6, 2.6, 2.2 + w * 0.4, ['#8c1e38', '#bc3252', '#ff6a8e', '#ff9ab4', '#ffd0dc']); // lolling tongue
    } else if (face === 'chew') {
      curve(mx - 7, mx + 8, my, 1.4, INK);
    } else {
      curve(mx - 7.5, mx + 8.5, my - 0.6, 2.2, INK);
      A.soft(mx - 3.2, my + 1.8, 2.2, 1.2, ['#8c1e38', '#bc3252', '#ff6a8e', '#ff9ab4', '#ffd0dc']); // licking greedy lips
    }

    return A.canvas();
  });
}

const GOBBLER_SPICY = [
  'MMM! SPICY!',
  'OOH! HOT HOT!',
  'FLAMBE! MY FAVOURITE!',
  'MY TONGUE IS ON FIRE! MORE!',
  'TOASTY!',
  'OOF! ZESTY!',
  'EXTRA CRISPY, PLEASE!',
  'HOT! HOT! DELICIOUS!',
  'SPICY! I LIKE YOU!',
  'NEEDS MORE SYRUP. MUCH MORE.',
];
const GOBBLER_HANG = [
  'HANG ON...',
  'WAIT A MINUTE...',
  'THIS PANCAKE HAS... FEET?',
  'CHEWY. TOO CHEWY.',
  'HMM. FEATHERY.',
  'SOMETHING\'S... WIGGLING.',
  'DID THIS PANCAKE JUST PEEP?',
  'UH OH.',
  'THIS ISN\'T SYRUP...',
  'HOLD ON...',
];
const GOBBLER_SPIT = [
  'BLEH! TASTES LIKE CHICKEN!',
  'PTOOEY! CHICK!',
  'YUCK! FEATHERS!',
  'BLEGH! NOT A PANCAKE!',
  'PFAH! I ORDERED BREAKFAST!',
  'EW EW EW! IT PEEPED!',
  'BLEH! TOO FLUFFY!',
  'SPIT TAKE! SORRY!',
  'THAT\'S NOT ON THE MENU!',
  'YUCK! SEND IT BACK!',
];
class Gobbler extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 40, 40, 40);
    this.state = 'wait'; this.timer = 0; this.cool = 0; this.chew = 0; this.bleh = 0;
    this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  get mouthX() { return this.x + 12; }
  get mouthY() { return this.y + 22; }
  hitbox() { return { x: this.x + 4, y: this.y + 6, w: this.w - 8, h: this.h - 6 }; }
  touches(p) { return this.state !== 'full' && this.cool <= 0 && overlap(this.hitbox(), p); }
  onTouch(g, p) { this.swallow(g, p); }
  fireHit(g) { if (this.bleh <= 0) { this.bleh = 60; g.speak(this, GOBBLER_SPICY, '#ffd166'); Sound.play('nom'); } }
  catchCake(g, cake) {
    cake.remove = true; cake.ghost = true;
    if (g.player.platform === cake && g.player.state === 'play') { this.swallow(g, g.player); return; }
    this.chew = 40; Sound.play('nom');
    g.popup(this.mouthX, this.y - 4, 'NOM!', '#ffd88a');
  }
  swallow(g, p) {
    if (p.state !== 'play' || p.inPod) return;
    g.endRoll(p); g.dropHeld();
    if (p.crouch) { const full = p.power ? BIG_H : SMALL_H; p.y += p.h - full; p.h = full; p.crouch = false; }
    p.inPod = this; p.vx = 0; p.vy = 0; p.platform = null; p.onGround = false; p.combo = 0;
    p.spin = false; p.pounding = false; p.gliding = false; p.charge = 0; p.blast = 0;
    this.state = 'full'; this.timer = 0; this.chew = 0;
    Sound.play('gulp');
    g.burst(this.mouthX, this.mouthY, ['#ffd88a', '#ffffff', '#ff8a5a'], 8);
  }
  update(g) {
    this.t++;
    if (this.cool > 0) this.cool--;
    if (this.chew > 0) { this.chew--; if (this.chew === 20) Sound.play('nom'); }
    if (this.bleh > 0) this.bleh--;
    const p = g.player;
    if (this.state === 'full') {
      this.timer++;
      p.x = this.mouthX - p.w / 2; p.y = this.mouthY - p.h / 2; p.vx = 0; p.vy = 0;
      if (this.timer % 16 === 8 && this.timer < 60) Sound.play('nom');
      if (this.timer === 40) g.speak(this, GOBBLER_HANG, '#ffd166');
      if (this.timer >= 85) this.spit(g, p);
      return;
    }
    // a pancake on its way in: mouth wide open, eyes like saucers
    this.hungry = g.platforms.some(c => c instanceof Pancake && c.state === 'fly' && c.t > PANCAKE_T - 50 && Math.abs(c.x1 - this.mouthX) < 24);
  }
  spit(g, p) {
    p.inPod = null;
    p.x = this.mouthX - p.w / 2 + 6; p.y = this.y - p.h - 2;
    p.vx = 1.6; p.vy = -11.6; p.jumping = false; p.springAir = false; p.airMax = RUN_MAX;
    p.onGround = false; p.platform = null; p.coyote = 0; p.jumpBuf = 0; p.facing = 1;
    this.state = 'wait'; this.cool = 50; this.bleh = 70;
    g.speak(this, GOBBLER_SPIT, '#ffd166');
    Sound.play('spit');
    for (let i = 0; i < 12; i++) g.particles.push({ kind: 'px', x: this.mouthX, y: this.mouthY - 6, vx: rand(-1.5, 2), vy: rand(-4, -1), g: 0.2, life: 34, t: 0, color: i % 3 ? '#bff4ff' : '#ffffff', size: 2 });
    if (!g.level.gobbleTold) { g.level.gobbleTold = true; g.addScore(2000, this.cx, this.y - 20); }
  }
  // drawn facing left, toward the pancakes: a round lava imp lit from the top left, his mouth right on
  // mouthX/mouthY, a bib under it, knife and fork in his fists, horns and goggly eye domes on top
  draw(ctx) {   // (painted fine: gobblerArt)
    const full = this.state === 'full', open = this.hungry && !full, chewing = full || this.chew > 0;
    const face = full || this.chew > 0 ? 'chew' : open ? 'open' : this.bleh > 0 ? 'bleh' : 'grin';
    ctx.drawImage(gobblerArt(face, chewing ? -((this.t >> 3) % 2) : 0, full ? 2 : 0, full && this.timer < 80 ? 1 + (this.t >> 2) % 2 : 0, (this.t >> 3) % 2), Math.round(this.x) - 4, Math.round(this.y) - 4);
  }

}
