'use strict';
// Hollow Caverns set pieces (1-2): the snoring giant and his floating Z's, the singing crystals
// that sing a bridge into being, and the colony of sleeping bats you have to tiptoe past.

// A snored "Z": a big chunky letter that drifts up out of the giant's mouth. Lives in
// `game.platforms`, so Chickaroo can stand on its top bar and ride it up; it pops after a while.
const SNORE_PERIOD = 140, SNORE_LIFE = 420, SNORE_RISE = -0.42, SNORE_TOP = 26;   // a Z pops once it nears the cave roof
class SnoreZ {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 16; this.h = 8; this.t = 0;
    this.dx = 0; this.dy = 0; this.prevY = y; this.gone = false;
  }
  update(g) {
    const ox = this.x, oy = this.y;
    this.t++;
    this.y += SNORE_RISE;
    if (this.y < SNORE_TOP && this.t < SNORE_LIFE - 50) this.t = SNORE_LIFE - 50;   // reached the top: blink and pop
    this.x += 0.1 + Math.sin(this.t * 0.045) * 0.22;
    this.prevY = oy; this.dx = this.x - ox; this.dy = this.y - oy;
    if (this.t >= SNORE_LIFE && !this.gone) {
      this.gone = true;
      if (g) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.particles.push({ kind: 'px', x: this.x + this.w / 2 + Math.cos(a) * 8, y: this.y + 9 + Math.sin(a) * 6, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, drag: 0.92, life: 22, t: 0, color: '#e4dcff', size: 2 }); }
      if (g && g.player.platform === this) g.player.platform = null;
      this.x = -1e5;
    }
  }
  draw(ctx) {
    if (this.gone) return;
    const left = SNORE_LIFE - this.t;
    if (left < 70 && (left >> 3) % 2) return;   // blinks just before it pops
    const grow = Math.min(1, this.t / 14);      // puffs up out of the mouth
    if (grow < 1) { fBlob(ctx, this.x + this.w / 2, this.y + 9, 8 * grow + 0.5, '#e4dcff'); return; }
    ctx.drawImage(snoreZArt(), this.x - 1, this.y - 1);   // (painted fine: cave-fine.js)
  }
}

// The snoring giant: a huge furry cave-dweller in a nightcap, fast asleep on his back (seen from the side; how he
// looks: snorer-art.js). Every snore blows a Z out of his mouth (ride them up!). Bounce on his belly and he mumbles
// in his sleep (it's a bouncy bed, but it doesn't make him snore any more Z's).
const SNORER_MUMBLES = ['MMF... 5 MORE MINUTES', 'NOT NOW MOM...', 'MY... HONEY POT...', 'ZZ... WHO TOUCHED...', 'HNNK... PANCAKES'];
class Snorer extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - SNORER_H, SNORER_W, SNORER_H);
    this.friendly = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.zs = []; this.squash = 0; this.mumble = 0;
  }
  // his open mouth, in world space (the art is drawn from his heel, on the floor at his left end)
  get mouthX() { return this.x + SNORER_MOUTH[0]; }
  get mouthY() { return this.y + this.h + SNORER_MOUTH[1]; }
  update(g) {
    this.t++;
    if (this.squash > 0) this.squash--;
    const k = this.t % SNORE_PERIOD;
    if (k === SNORE_PERIOD - 30) {
      const z = new SnoreZ(this.mouthX - 8, this.mouthY - 22);
      this.zs.push(z); g.platforms.push(z);
      if (this.x > g.camX - 64 && this.x < g.camX + VIEW_W + 16) Sound.play('snore');
    }
    for (const z of this.zs) if (z.gone) { const i = g.platforms.indexOf(z); if (i >= 0) g.platforms.splice(i, 1); }
    this.zs = this.zs.filter(z => !z.gone);
  }
  onTouch(g, p) {
    if (p.vy > 0 && p.prevY + p.h <= this.y + 24) {
      p.y = this.y - p.h; p.vy = -7.6; p.jumping = false; p.onGround = false; p.springAir = true;
      this.squash = 14;
      if (this.mumble <= this.t) { this.mumble = this.t + 90; g.speak(this, SNORER_MUMBLES[(this.t >> 3) % SNORER_MUMBLES.length], '#cbbcff'); }
      Sound.play('honk'); Sound.play('spring');
    }
  }
  draw(ctx) {
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y + this.h));
    drawSnorer(ctx, this);
    ctx.restore();
  }
}

// Singing crystals: land on one, hammer it or hit it with a thrown object to sing its note. Ring every
// crystal of a set from the lowest to the highest and the cave sings a crystal bridge across the
// chasm; a wrong note goes CLUNK and the set goes dark again. Sets are keyed in the level's
// `chimes: { key: [bridgeX0, bridgeX1, bridgeRow] }`.
// Counting crystals (a colour name and a count instead of a note): in the slate's order, each must
// be rung exactly that many times -- it stays lit and sparkling once it's right, one ring too many goes CLUNK and it starts
// over. When every one is right the wall crumbles and the bridge sings into place:
// `chimes: { key: { wall: [col, rowTop, rowBottom], bridge: [x0, x1, row] } }`.
const CHIME_NOTES = [262, 330, 392, 523, 659], CHIME_COLORS = ['#ff7ab0', '#ffb347', '#fff36b', '#7cf0a0', '#7ad8ff'];
const CHIME_NAMED = { red: [0, '#ff3434'], orange: [1, '#ff9420'], yellow: [2, '#ffe83a'], green: [3, '#3ee86a'], blue: [4, '#3aa8ff'] };
class Chime extends Enemy {
  constructor(col, row, key, note, times) {
    const named = CHIME_NAMED[note], h = named ? 28 : 34 - note * 5;
    super(col * TILE + 2, (row + 1) * TILE - h, 12, h);
    if (named) { this.times = times; this.rung = 0; this.col = named[1]; note = named[0]; }
    this.key = key; this.note = note; this.glow = 0; this.cool = 0;
    this.noFreeze = true;
    this.friendly = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  set(g) {
    const all = g.level.chimes || (g.level.chimes = {});
    if (!all[this.key]) {
      const count = g.level.def.entities.filter(e => e[0] === 'chime' && e[3] === this.key).length;
      all[this.key] = { next: 0, lit: new Set(), count, done: false, build: -1, at: -1 };
    }
    return all[this.key];
  }
  update(g) {
    this.t++;
    if (this.glow > 0) this.glow--;
    if (this.cool > 0) this.cool--;
    const s = this.set(g);
    this.dormant = this.asleep(g);
    this.lit = s.done || (this.times ? this.rung === this.times : s.lit.has(this.note));
    this.active = !!this.times && !this.dormant && !s.done && !this.locked && this.isNext(g);   // its turn to be rung
    if (this.times && this.lit && this.t % 7 === 0) g.particles.push({ kind: 'spark', x: this.x + rand(-2, this.w + 2), y: this.y + rand(0, this.h), vx: rand(-0.3, 0.3), vy: rand(-0.9, -0.3), g: 0, drag: 0.96, life: 30, t: 0, color: Math.random() < 0.5 ? '#fff3b0' : '#ffd166' });
    if (s.filming && s.filmEnd && g.t >= s.filmEnd) { s.filming = false; g.arenaCam = null; g.cinema = 0; }   // (the show's over: back to him)
    const panning = s.filming && !s.filmEnd && g.arenaCam != null && Math.abs(g.camX - g.arenaCam) > 2;   // (the show waits for the camera to get there)
    if (s.build >= 0 && s.at !== g.t && !panning) {   // (always heard: whichever crystal runs it may be off screen, the gate and bridge aren't)
      s.at = g.t; const src = Sound.src; Sound.src = null;
      this.buildStep(g, s);
      Sound.src = src;
    }
  }
  buildStep(g, s) {
    const cfg = g.level.def.chimes[this.key], [x0, x1, row] = Array.isArray(cfg) ? cfg : cfg.bridge;
    if (cfg.wall && !s.wallDown) {   // first the wall crumbles, top to bottom
      const [wc, r0, r1] = cfg.wall, r = r0 + Math.floor(s.build++ / 4);
      if (s.build % 4) return;
      if (r > r1) { s.wallDown = true; s.build = 0; return; }
      if (g.level.get(wc, r) !== T.EMPTY) { g.level.set(wc, r, T.EMPTY); this.breakGate(g, wc, r); }
      return;
    }
    if (++s.build % 5) return;
    const c = x0 + s.build / 5 - 1;
    if (c > x1) {
      s.build = -1; if (s.filming) s.filmEnd = g.t + 50;   // (a moment to admire it)
      Sound.play('tada');
      g.addScore(1000, ((x0 + x1) / 2) * TILE, row * TILE - 24);
      return;
    }
    g.level.set(c, row, T.SOLID);
    Sound.note(CHIME_NOTES[(c - x0) % 5] * ((c - x0) >= 5 ? 2 : 1));
    for (let i = 0; i < 6; i++) g.particles.push({ kind: 'spark', x: c * TILE + 8 + rand(-6, 6), y: row * TILE + rand(0, 14), vx: rand(-0.8, 0.8), vy: rand(-1.4, -0.2), g: 0.03, drag: 0.95, life: 30, t: 0, color: CHIME_COLORS[(c - x0) % 5] });
  }
  get locked() { return !!this.times && this.rung === this.times; }
  // solved: the camera pans over to watch the gate crumble and the bridge sing into place (he waits), then comes back
  film(g, s) {
    const cfg = g.level.def.chimes[this.key], [x0] = Array.isArray(cfg) ? cfg : cfg.bridge, from = cfg.wall ? cfg.wall[0] : x0;
    g.arenaCam = clamp((from - 2) * TILE, 0, g.level.w * TILE - VIEW_W); g.arenaMax = null;
    g.cinema = 999; s.filming = true; s.filmEnd = 0; g.camGlide = true; g.camV = 0;   // (a slow, smooth pan there and back)
  }
  // one block of the rune gate breaking up: chunks of its carved stone, a shard of its (golden) rune, sparks
  breakGate(g, c, r) {
    const x = c * TILE, y = r * TILE, cols = g.level.def.entities.filter(e => e[0] === 'chime' && e[3] === this.key).sort((a, b) => a[1] - b[1]).map(e => (CHIME_NAMED[e[4]] || [0, '#7ad8ff'])[1]);
    [[-1.4, -5.5, 0, 0], [1.4, -5.5, 8, 0], [-1.2, -3.5, 0, 8], [1.2, -3.5, 8, 8]].forEach(([vx, vy, ox, oy]) => {
      g.particles.push({ kind: 'frag', x: x + ox, y: y + oy, vx: vx + rand(-0.3, 0.3), vy, g: 0.3, life: 70, t: 0, cols: ['#3b394d', '#262434', '#5c5a74'] });
    });
    g.particles.push({ kind: 'frag', x: x + 5, y: y + 5, vx: rand(-0.8, 0.8), vy: -4.5, g: 0.3, life: 70, t: 0, size: 5, cols: ['#fff3b0', '#c8962e', '#ffffff'] });
    for (let i = 0; i < 8; i++) g.particles.push({ kind: 'spark', x: x + 8 + rand(-5, 5), y: y + 8 + rand(-5, 5), vx: rand(-1.4, 1.4), vy: rand(-2, 0.2), g: 0.05, drag: 0.95, life: 28, t: 0, color: i % 2 ? '#fff3b0' : cols[(r + i) % cols.length] });
    g.addScore(50); g.shake = Math.max(g.shake, 2);
    Sound.play('break');
  }
  // a counting crystal's turn: every one before it in the set's order (the slate's; else left to right) is done
  isNext(g) {
    const order = g.level.chimePuzzles.get(this.key)?.order, set = g.entities.filter(e => e instanceof Chime && e.key === this.key);
    const before = order ? order.slice(0, order.indexOf((this.x - 2) / TILE)).map(c => set.find(e => e.x === c * TILE + 2)) : set.filter(e => e.x < this.x);
    return before.every(e => !e || e.locked);
  }
  // a set with a slate stays asleep until Chickaroo has read the slate
  asleep(g) { return !(g.level.slatesRead && g.level.slatesRead.has(this.key)) && g.level.def.entities.some(e => e[0] === 'slate' && e[4] === this.key); }
  onTouch(g, p) {
    // A roll strikes the crystal from the side; ordinary side contact stays silent.
    if (p.roll > 0) { this.ring(g); return; }
    // Otherwise only a descending landing rings.
    if (p.vy <= 0 || p.prevY + p.h > this.y || p.y + p.h < this.y) return;
    this.ring(g);
  }
  ring(g) {
    if (this.cool > 0 || this.locked || this.asleep(g)) return;
    // Rung in the slate's order: left to right.
    if (this.times && !this.isNext(g)) { this.cool = 24; Sound.play('bump'); return; }   // not its turn: it just dozes on (a dull bonk)
    this.cool = 36; this.glow = 40;
    Sound.note(CHIME_NOTES[this.note]);
    const s = this.set(g), col = this.col || CHIME_COLORS[this.note];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.particles.push({ kind: 'spark', x: this.cx + Math.cos(a) * 6, y: this.y + 6 + Math.sin(a) * 6, vx: Math.cos(a), vy: Math.sin(a), g: 0, drag: 0.93, life: 26, t: 0, color: col }); }
    if (s.done) return;
    if (this.times) {
      if (++this.rung > this.times) { this.rung = 0; Sound.play('sour'); return; }
      if (this.rung === this.times) { Sound.play('chimeComplete'); g.burst(this.cx, this.y + this.h / 2, ['#ffd166', '#fff3b0', '#ffffff'], 14); }
      const set = g.entities.filter(e => e instanceof Chime && e.key === this.key);
      if (set.length === s.count && set.every(e => e.rung === e.times)) { s.done = true; s.build = 0; this.film(g, s); }
      return;
    }
    if (!g.level.chimeTold) { g.level.chimeTold = true; g.say('SINGING CRYSTALS!', 'RING THEM FROM BIG TO SMALL', '#7ad8ff'); }
    if (s.lit.has(this.note)) return;
    if (this.note === s.next) {
      s.lit.add(this.note); s.next++;
      if (s.next === s.count) { s.done = true; s.build = 0; this.film(g, s); }
    } else {
      s.lit.clear(); s.next = 0;
      Sound.play('sour');
    }
  }
  draw(ctx, g) {
    const lit = this.lit, gold = this.locked, x = Math.round(this.x), y = Math.round(this.y), w = this.w, h = this.h, col = this.col || CHIME_COLORS[this.note];
    const by = y + h, shake = this.glow > 30 ? (this.t % 2 ? 1 : -1) : 0;
    // a little of its light on the floor, and the rock it grows from (all in fine pixels: cave-fine.js, hires.js)
    const pool = 0.1;   // (the same for every crystal: only its face tells whose turn it is)
    ctx.globalAlpha = pool; fEll(ctx, x + w / 2, by, 16.5, 3.5, col); fEll(ctx, x + w / 2, by, 9.5, 2.5, '#ffffff'); ctx.globalAlpha = 1;
    fEll(ctx, x + w / 2, by, 10.5, 3.5, INK); fEll(ctx, x + w / 2, by, 9.5, 2.6, '#3b394d'); fEll(ctx, x + w / 2 - 3, by - 1.4, 3.4, 0.8, '#605d76');
    const dim = (!lit && this.glow <= 0 && !this.active) || this.dormant, mid = x + shake + w / 2, A = chimeArt(col, w, h, gold);
    const ax = mid - A.W / 2, ay = by - A.H + 1;
    ctx.drawImage(A.lit, ax, ay);
    if (dim) { ctx.globalAlpha = (this.times ? 0.3 : 0.5) - 0.1 * Math.sin(this.t * 0.05 + this.note); ctx.drawImage(A.dark, ax, ay); ctx.globalAlpha = 1; }   // unlit: dimmed, a slow shimmer
    if (gold) {   // a glint sweeping up the crystal every second or so
      const k = (this.t + mid * 3) % 70;
      if (k < 14) { const band = A.H - 2 - k * (A.H - 2) / 14; ctx.globalAlpha = 0.8; ctx.drawImage(A.white, 0, band, A.W, 2, ax, ay + band, A.W, 2); ctx.globalAlpha = 1; }
    }
    // a little face: eyes, and an "O" mouth while it sings; happy closed eyes and a smile once solved
    const fy = y + h * 0.55 + 0.5, fx = mid;
    if (gold) { for (const ex of [-2.5, 2.5]) fArc(ctx, fx + ex, fy + 1.4, 0.7, 1.4, Math.PI * 1.1, Math.PI * 1.9, INK); fArc(ctx, fx, fy + 3.2, 1, 1.8, Math.PI * 0.15, Math.PI * 0.85, INK); }
    else if (this.times && !this.active && this.glow <= 0) {   // not its turn: dozing (closed eyes)
      for (const ex of [-2.8, 2.8]) fRect(ctx, fx + ex - 1, fy + 1, 2, 2 / 3, INK);
      fRect(ctx, fx - 0.8, fy + 4, 1.6, 2 / 3, INK);
    } else {
      for (const ex of [-2.5, 2.5]) { fEll(ctx, fx + ex, fy + 1, 0.75, 1.1, INK); fRect(ctx, fx + ex - 0.3, fy + 0.3, 1 / 3, 1 / 3, '#ffffff'); }
      if (this.active) for (const ex of [-2.8, 2.8]) fRect(ctx, fx + ex - 1, fy - 1, 2, 2 / 3, INK);   // eyes wide (brows up): pick me!
      if (this.glow > 0) fEll(ctx, fx, fy + 4.4, 1.1, 1.6, INK);
      else fArc(ctx, fx, fy + 3, 1, 1.7, Math.PI * 0.2, Math.PI * 0.8, INK);
    }
    if (this.times && this.rung > 0 && !gold) {   // a mote for every ring so far, circling it slowly
      for (let i = 0; i < this.rung; i++) {
        const a = this.t * 0.04 + i / this.rung * Math.PI * 2, mx = mid + Math.cos(a) * 11, my = y + h * 0.45 + Math.sin(a) * 4;
        fBlob(ctx, mx, my, 1.5, INK); fBlob(ctx, mx, my, 0.95, col); fRect(ctx, mx - 0.4, my - 0.4, 1 / 3, 1 / 3, '#ffffff');
      }
    }
    if (gold && this.t % 50 < 10) {   // a twinkle star off the tip
      const sx = mid + 3, sy = y - 2, r = this.t % 50 < 5 ? 2.4 : 1.4;
      fRect(ctx, sx - r, sy, r * 2, 1 / 3, '#ffffff'); fRect(ctx, sx, sy - r, 1 / 3, r * 2, '#ffffff'); fRect(ctx, sx - 1 / 3, sy - 1 / 3, 1, 1, '#ffffff');
    }
  }
}

// A sleeping bat: hangs from the cave roof, dreaming. Sprint or roll anywhere near and it
// wakes with a shriek -- and so do its neighbours -- and they all come swooping. Walk past softly.
class SleepBat extends Flutter {
  constructor(col, row) {
    super(col, row, true);
    this.state = 'sleep'; this.wake = 0;
  }
  update(g) {
    if (this.state === 'sleep' || this.state === 'wake') {
      this.t++;
      const p = g.player, dx = Math.abs(p.x + p.w / 2 - this.cx);
      // warn once, big and in the middle of the screen (not again at the next roost, nor after a death)
      if (dx < 230 && !g.batWarned) { g.batWarned = true; g.say('SHHH! BATS ASLEEP', 'WALK SLOWLY... OR PAY THE PRICE!', '#c8b8ff', true); Sound.play('pause'); }
      if (this.state === 'wake') { if (--this.wake <= 0) { this.state = 'fly'; this.t = 0; this.dir = p.x + p.w / 2 < this.cx ? -1 : 1; } return; }
      const noisy = (Input.down('run') && Math.abs(p.vx) > WALK_MAX + 0.3) || p.roll > 0;   // sprinting or a rattling roll; jumps and landings never do
      if (p.state === 'play' && dx < 76 && noisy) this.rouse(g, 0);
      return;
    }
    super.update(g);
  }
  rouse(g, delay) {
    if (this.state !== 'sleep') return;
    this.state = 'wake'; this.wake = 24 + delay;
    g.popup(this.cx, this.y + 16, '!', '#ff5050');
    if (!delay) Sound.play('shriek');
    for (const e of g.entities) if (e instanceof SleepBat && e !== this && Math.abs(e.cx - this.cx) < 90) e.rouse(g, delay + 10);
  }
  draw(ctx) {
    const st = this.state;
    if (st !== 'fly') this.state = 'idle';   // drawn hanging until it takes off
    this.asleep = st === 'sleep';
    super.draw(ctx);
    this.state = st;
    if (st !== 'sleep') return;
    // a little stream of z's drifting up off it
    const k = (this.t % 90) / 90;
    ctx.globalAlpha = 1 - k;
    drawZ(ctx, this.cx + 4 + k * 8, this.y + 10 - k * 16, '#c8b8ff', 6);
    ctx.globalAlpha = 1;
  }
}

// little carved runes for the sealed wall (5x5, one row per number, bit 4 = leftmost)
const CAVE_RUNES = [[4, 14, 21, 4, 4], [17, 10, 4, 10, 17], [14, 17, 21, 17, 14], [4, 10, 31, 10, 4], [31, 1, 14, 16, 31], [21, 21, 14, 4, 4]];

// The shrine round a set of singing crystals, drawn over the tiles (the slate puts it up): a rock shelf for the slate
// to stand on (over the plank), the sealed wall veined with crystal and carved with runes (they blaze up once the set
// is solved, just before it crumbles), and the bridge, sung into place as blocks of crystal in the set's colours.
class ChimeSeal extends Enemy {
  constructor(slate) {
    super(slate.x, slate.y, slate.w, slate.h);
    this.slate = slate; this.key = slate.key;
    this.passive = this.friendly = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  // the slate's shelf, its sealed wall and its bridge, which run a long way past the slate: culled as one, or the
  // bridge loses its crystal (back to bare stone tiles) once the slate's off screen
  viewSpan() {
    let x0 = this.x - 24, x1 = this.x + this.w + 24;
    const cfg = this.chimeCfg;
    if (cfg) {
      const [b0, b1] = Array.isArray(cfg) ? cfg : cfg.bridge;
      x0 = Math.min(x0, b0 * TILE); x1 = Math.max(x1, (b1 + 1) * TILE);
      if (cfg.wall) { x0 = Math.min(x0, cfg.wall[0] * TILE); x1 = Math.max(x1, (cfg.wall[0] + 1) * TILE); }
    }
    return [x0, x1];
  }
  update(g) { this.t++; this.chimeCfg = g.level.def.chimes && g.level.def.chimes[this.key]; }
  draw(ctx, g) {
    const lv = g.level, cfg = lv.def.chimes && lv.def.chimes[this.key], s = lv.chimes && lv.chimes[this.key];
    const cols = lv.def.entities.filter(e => e[0] === 'chime' && e[3] === this.key).sort((a, b) => a[1] - b[1]).map(e => (CHIME_NAMED[e[4]] || [0, CHIME_COLORS[e[4]] || '#7ad8ff'])[1]);
    this.drawShelf(ctx, lv);
    if (!cfg) return;
    const read = lv.slatesRead && lv.slatesRead.has(this.key), solved = s && s.done;
    if (cfg.wall) {   // a gate of carved blocks, a rune glowing in each (gold once the set is solved)
      const [wc, r0, r1] = cfg.wall, x = wc * TILE, pulse = solved ? 1 : read ? 0.7 + 0.2 * Math.sin(this.t * 0.05) : 0.45;
      for (let r = r0; r <= r1; r++) {
        if (!lv.solid(wc, r)) continue;
        const y = r * TILE, c = solved ? '#fff3b0' : cols[r % cols.length], rune = CAVE_RUNES[(r + wc) % CAVE_RUNES.length];
        ctx.drawImage(runeBlockArt(wc + r), x, y);   // (painted fine: cave-fine.js)
        ctx.globalAlpha = 0.22 * pulse; fBlob(ctx, x + 8, y + 8, 6.5, c); ctx.globalAlpha = pulse;
        ctx.drawImage(runeArt(rune, c), x + 4, y + 4);
        ctx.globalAlpha = 1;
      }
    }
    // the sung bridge: a slab of crystal per note, with crystal points hanging under it
    const [x0, x1, row] = Array.isArray(cfg) ? cfg : cfg.bridge;
    if (!solved) return;
    for (let cc = x0; cc <= x1; cc++) {
      if (lv.get(cc, row) !== T.SOLID) continue;
      const x = cc * TILE, y = row * TILE, c = cols[(cc - x0) % cols.length], h1 = 4 + (cc * 5) % 5, h2 = 3 + (cc * 3) % 4;
      ctx.drawImage(bridgeSlabArt(c, h1, h2), x, y - 1);   // (painted fine: cave-fine.js)
      const k = (this.t + cc * 9) % 120;
      if (k < 3) { fRect(ctx, x + 3.6, y + 2.3, 3, 1 / 3, '#ffffff'); fRect(ctx, x + 5, y + 1, 1 / 3, 3, '#ffffff'); }   // now and then, a glint
    }
  }
  // the plank the slate stands on becomes a shelf of rock, with crystals sprouting at its ends
  drawShelf(ctx, lv) {
    const r = Math.round((this.slate.y + this.slate.h) / TILE), mid = Math.floor(this.slate.cx / TILE);
    if (lv.get(mid, r) !== T.SEMI) return;
    let a = mid, b = mid;
    while (lv.get(a - 1, r) === T.SEMI) a--;
    while (lv.get(b + 1, r) === T.SEMI) b++;
    const x0 = a * TILE - 2, x1 = (b + 1) * TILE + 2, y = r * TILE, img = rockShelfArt(x1 - x0);
    ctx.drawImage(img, x0 - 2, y - img.oy);   // (painted fine: cave-fine.js)
  }
}

// A carved stone slate standing on a ledge, its face cut into one cell per crystal: blank until touched, when each cell
// glows with a count of little pips (the clue) and it wakes the singing crystals of its set (`key`).
class Slate extends Enemy {
  constructor(col, row, text, key) {
    const counts = String(text).trim().split(/\s+/).map(Number);
    const w = Math.max(30, counts.length * (SLATE_CELL + 1) - 1 + 12);   // always wide enough for its cells (and its border)
    super(col * TILE + 8 - w / 2, (row + 1) * TILE - 22, w, 22);
    this.text = text; this.counts = counts; this.key = key; this.friendly = true; this.behindTiles = true; this.reveal = 0;
    this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  read(g) { return !!(g.level.slatesRead && g.level.slatesRead.has(this.key)); }
  hitbox() { return this.reveal ? null : this; }
  update(g) {
    this.t++;
    if (!this.seal) { this.seal = new ChimeSeal(this); g.entities.push(this.seal); }   // (its shrine: shelf, sealed wall, bridge)
    if (this.reveal > 0 && this.reveal < 40) this.reveal++;
    if (!this.reveal && this.read(g)) this.reveal = 40;   // read before (it respawned)
    if (!this.reveal && this.t % 9 === 0) g.particles.push({ kind: 'spark', x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), vx: 0, vy: rand(-0.6, -0.2), g: 0, drag: 0.97, life: 34, t: 0, color: Math.random() < 0.5 ? '#fff3b0' : '#bfe8ff' });
  }
  onTouch(g) {
    if (this.reveal) return;
    (g.level.slatesRead || (g.level.slatesRead = new Set())).add(this.key);
    this.reveal = 1;
    Sound.play('appear');
    g.burst(this.cx, this.y + this.h / 2, ['#fff3b0', '#bfe8ff', '#ffffff'], 16);
    // the crystals of the set wake with a little shimmer
    for (const e of g.entities) if (e instanceof Chime && e.key === this.key) g.burst(e.cx, e.y + e.h / 2, ['#ffffff', e.col || '#ffffff'], 8);
  }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), w = this.w, h = this.h, n = this.counts.length, read = this.reveal > 0;
    // a stele with a rounded top, carved border and cells, a gem in its crown, glowing lichen (painted fine: cave-fine.js)
    ctx.drawImage(slateArt(w, h, read, n, SLATE_CELL), x - 1, y - 1);
    if (read) { ctx.globalAlpha = 0.18 + 0.06 * Math.sin(this.t * 0.06); fBlob(ctx, x + w / 2, y + 3, 5.5, '#7ad8ff'); ctx.globalAlpha = 1; }
    const x0 = x + Math.round((w - (n * (SLATE_CELL + 1) - 1)) / 2), cy = y + 11;
    if (!this.reveal) return;
    // the clue: in each cell, that many little pips (no numbers), fading in as it's revealed
    const a = this.reveal / 40;
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * (SLATE_CELL + 1) + (SLATE_CELL >> 1);
      ctx.globalAlpha = a;
      for (const [px, py] of SLATE_PIPS[this.counts[i]] || []) { fBlob(ctx, cx + px + 0.8, cy + py + 0.8, 0.9, '#292732'); fBlob(ctx, cx + px + 0.5, cy + py + 0.5, 0.85, '#dff6ff'); }
    }
    ctx.globalAlpha = 1;
  }
}
// The slate's cells (px wide) and the pips carved in a cell for each count, around its centre: three in a triangle,
// four in a square, five like a little star (never digits: reading them is half the puzzle)
const SLATE_CELL = 9;
const SLATE_PIPS = {
  1: [[0, 0]],
  2: [[-2, -2], [2, 2]],
  3: [[0, -3], [-2, 2], [2, 2]],
  4: [[-2, -2], [2, -2], [-2, 2], [2, 2]],
  5: [[0, -3], [-3, -1], [3, -1], [-2, 3], [2, 3]],
};
