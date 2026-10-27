'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 2-4: THE SEALED SIGIL
// ═══════════════════════════════════════════════════════════════════════════
// A great carved sigil hangs over the last door of the spire, broken into four square stones, each
// turned the wrong way. Each of the four buttons turns one stone a quarter turn (clockwise) -- though which
// stone isn't the one it's nearest. Set all four right and the door grinds open. The answer is carved on a
// weathered slab further back down the path (the right half has broken off: the two missing carvings must be worked out
// at the door).
//   ['slab', x, row]                     the stone slab with the whole sigil carved on it
//   ['sigil', x, row, doorX, start, links]  the sigil, centred on the left edge of column x, a little below
//                                        row's top; the door fills columns doorX and doorX+1 over rows 0-11.
//                                        start: each stone's turn (quarter turns clockwise from right,
//                                        [TL, TR, BR, BL]); links: which stones each button turns
//   ['sigbtn', x, row, n]                floor button n (standing in `row`): turns links[n]
// The stones' turns are kept through deaths and respawns in the stage (g.sigils).
const SIG_HALF = 37;                       // the sigil's frame: 74px square
const SIG_LINKS = [[0], [1], [2], [3]];
const SIG_CELL = [[-33, -33], [1, -33], [1, 1], [-33, 1]];   // each stone's top-left, from the centre (TL, TR, BR, BL)

// The sigil itself, in white on a transparent S x S canvas (drawn on a 64-unit grid): a crescent moon,
// the sun throwing its rays one way, a horizon, waves on the water, and the spire upside down in it.
const sigilArt = new Map();
function paintSigil(S) {
  let c = sigilArt.get(S);
  if (c) return c;
  c = makeCanvas(S, S);
  const g = c.getContext('2d'), k = S / 64, t = Math.max(1, Math.round(2 * k));
  g.fillStyle = '#ffffff';
  const line = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * k * 2));
    for (let i = 0; i <= n; i++) { const u = i / n; g.fillRect(Math.round((x0 + (x1 - x0) * u) * k - t / 2), Math.round((y0 + (y1 - y0) * u) * k - t / 2), t, t); }
  };
  const disc = (x, y, r) => blob(g, x * k, y * k, Math.max(1, Math.round(r * k)), '#ffffff');
  const cut = (x, y, r) => { g.globalCompositeOperation = 'destination-out'; disc(x, y, r); g.globalCompositeOperation = 'source-over'; };
  // top left: the crescent moon, opening up and to the right
  disc(17, 18, 12); cut(23, 13, 10);
  // top right: the sun, its rays thrown down and to the left -- and one long ray up to the corner
  disc(46, 17, 5);
  line(46, 25, 46, 29); line(38, 17, 34, 17); line(40, 23, 37, 26); line(51, 12, 58, 5);
  // the horizon, all the way across the bottom pair
  line(3, 40, 61, 40);
  // bottom left: waves
  for (let x = 6; x <= 26; x += 0.5) g.fillRect(Math.round(x * k - t / 2), Math.round((49 + Math.sin(x * 0.6) * 2) * k - t / 2), t, t);
  for (let x = 11; x <= 21; x += 0.5) g.fillRect(Math.round(x * k - t / 2), Math.round((56 + Math.sin(x * 0.6 + 1) * 2) * k - t / 2), t, t);
  // bottom right: the spire's reflection hanging point down from the horizon, and a star in the water
  line(39, 41, 47, 58); line(55, 41, 47, 58); line(47, 44, 47, 51);
  disc(58, 54, 1.5);
  sigilArt.set(S, c);
  return c;
}
// one stone's share of the carving, tinted (cached)
const sigilTint = new Map();
function sigilPiece(S, i, col) {
  const key = S + ':' + i + ':' + col;
  let c = sigilTint.get(key);
  if (c) return c;
  const h = S / 2, art = paintSigil(S), [ox, oy] = [[0, 0], [h, 0], [h, h], [0, h]][i];
  c = makeCanvas(h, h);
  const g = c.getContext('2d');
  g.drawImage(art, ox, oy, h, h, 0, 0, h, h);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, h, h);
  sigilTint.set(key, c);
  return c;
}

// ── the slab ────────────────────────────────────────────────────────────────
class SigilSlab extends Enemy {
  constructor(col, row) {
    super(col * TILE + 8 - 32, (row + 1) * TILE - 74, 64, 74);
    this.friendly = true; this.behindTiles = true; this.passive = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  glow(hole) { hole(this.cx, this.y + 30, 40, 0.5); }
  draw(ctx) { ctx.drawImage(sigilSlabArt(), Math.round(this.x) - 1, Math.round(this.y) - 1); }   // (painted fine: eclipse-fine.js)
}

// ── the sigil and its door ──────────────────────────────────────────────────
class Sigil extends Enemy {
  constructor(col, row, door, start, links) {
    super(col * TILE - SIG_HALF, row * TILE + 4 - SIG_HALF, SIG_HALF * 2, SIG_HALF * 2);
    this.key = col; this.door = door; this.start = start || [1, 0, 3, 2]; this.links = links || SIG_LINKS;
    this.behindTiles = true; this.passive = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.ang = null; this.tgt = null;   // each stone's shown turn and where it's heading (in quarter turns)
    this.lift = 0; this.solveT = -1; this.shut = false; this.jolt = 0;
  }
  hitbox() { return null; }
  touches() { return false; }
  get mid() { return [this.x + SIG_HALF, this.y + SIG_HALF]; }
  state(g) {
    let s = g.sigils.get(this.key);
    if (!s) g.sigils.set(this.key, s = { rot: this.start.slice(), solved: false });
    return s;
  }
  setDoor(g, t) { for (let r = 0; r < 12; r++) { g.level.set(this.door, r, t); g.level.set(this.door + 1, r, t); } this.shut = t === T.BODY; }
  // button n pressed: its stones each turn a quarter turn clockwise
  turn(g, n) {
    const s = this.state(g);
    if (s.solved) return;
    const [cx, cy] = this.mid;
    for (const i of this.links[n]) {
      s.rot[i] = (s.rot[i] + 1) % 4; this.tgt[i]++;
      const [ox, oy] = SIG_CELL[i];
      for (let k = 0; k < 4; k++) g.particles.push({ kind: 'px', x: cx + ox + rand(0, 32), y: cy + oy + (k % 2 ? 0 : 32), vx: rand(-0.4, 0.4), vy: rand(0.2, 0.9), g: 0.04, drag: 0.97, life: 30, t: 0, color: k % 2 ? '#8a84ac' : '#5e587e', size: 1 });
    }
    Sound.play('grind');
    if (s.rot.every(r => r === 0)) { s.solved = true; this.solveT = 0; }
  }
  update(g) {
    this.t++;
    const s = this.state(g);
    if (!this.ang) {
      this.ang = s.rot.slice(); this.tgt = s.rot.slice();
      if (s.solved) { this.lift = 1; this.solveT = 999; this.setDoor(g, T.EMPTY); } else this.setDoor(g, T.BODY);
    }
    for (let i = 0; i < 4; i++) { const d = this.tgt[i] - this.ang[i]; this.ang[i] = Math.abs(d) < 0.02 ? this.tgt[i] : this.ang[i] + Math.sign(d) * Math.min(Math.abs(d), 0.02 + Math.abs(d) * 0.18); }
    if (this.jolt > 0) this.jolt--;
    if (this.solveT < 0 || this.solveT >= 999) return;
    // unsealed: the carving lights up, the door grinds up... sticks... and then gives all at once
    const T0 = ++this.solveT, [cx, cy] = this.mid, dx = this.door * TILE + TILE;
    if (T0 === 24) { Sound.play('unseal'); g.burst(cx, cy, ['#ffd166', '#ffffff', '#b48cff'], 28); }
    if (T0 >= 70 && T0 < 120) { this.lift = Math.min(0.32, this.lift + 0.0065); if (T0 % 14 === 0) Sound.play('rumble'); if (T0 % 4 === 0) g.dust(dx + rand(-14, 14), 12 * TILE, 1); }
    if (T0 === 128 || T0 === 150 || T0 === 166) { Sound.play('creak'); this.jolt = 8; this.lift -= 0.02; g.dust(dx + rand(-12, 12), 12 * TILE - this.lift * 192, 2); }
    if (T0 === 180) { Sound.play('pound'); g.shake = 7; this.jolt = 10; }
    if (T0 > 180) this.lift = Math.min(1, this.lift + 0.05);
    if (T0 === 200) this.solveT = 999;
    if (this.lift > 0.15 && this.shut) this.setDoor(g, T.EMPTY);
  }
  glow(hole) {
    const [cx, cy] = this.mid, lit = this.solveT >= 24;
    hole(cx, cy, lit ? 64 : 46, lit ? 0.8 : 0.55);
    if (this.lift < 1) hole(this.door * TILE + TILE, 6 * TILE - this.lift * 196, 18, 0.45);   // the seal on the door
    if (this.lift > 0) hole(this.door * TILE + TILE, 12 * TILE - this.lift * 120, 30, 0.5 * Math.min(1, this.lift * 4));
  }
  draw(ctx, g) {   // (painted fine: sigilFrameArt, sigilStoneArt, sigilDoorArt, eclipse-fine.js)
    if (!this.ang) return;
    const [cx, cy] = this.mid, lit = this.solveT >= 24, x = Math.round(this.x), y = Math.round(this.y), W = SIG_HALF * 2;
    for (const hx of [x + 11.5, x + W - 10.5]) drawSpireChain(ctx, hx, y - 40, y - 1);   // two chains up to the lintel
    ctx.drawImage(sigilFrameArt(), x - 2, y - 2);
    if (lit) fGlow(ctx, cx, cy, 46, '#ffd166', this.solveT < 999 ? 0.45 + 0.3 * Math.sin(this.t * 0.3) : 0.32 + 0.1 * Math.sin(this.t * 0.06));
    // the four stones, each carved part turned by its own amount (the stone itself is square, so it gives nothing away)
    for (let i = 0; i < 4; i++) {
      const [ox, oy] = SIG_CELL[i], px = Math.round(cx + ox), py = Math.round(cy + oy), spinning = this.ang[i] !== this.tgt[i];
      ctx.drawImage(sigilStoneArt(lit), px - 1, py - 1);
      const a = this.ang[i] * Math.PI / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, 32, 32); ctx.clip();
      ctx.translate(px + 16, py + 16 + (spinning ? 0 : 2 / 3)); ctx.rotate(a); ctx.drawImage(sigilPieceFine(64, i, lit ? '#fff3c4' : '#b0aacc'), -16, -16);   // the groove's lit lip
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, 32, 32); ctx.clip();
      ctx.translate(px + 16, py + 16); ctx.rotate(a); ctx.drawImage(sigilPieceFine(64, i, lit ? (this.t % 16 < 8 && this.solveT < 999 ? '#ffffff' : '#ffd166') : '#1a1430'), -16, -16);
      ctx.restore();
    }
    // the door: a slab of spire stone sliding up out of the way
    const dx = this.door * TILE + (this.jolt ? ((this.jolt % 2) * 2 - 1) : 0), top = -this.lift * 196, h = 12 * TILE;
    if (top + h <= 0) return;
    ctx.drawImage(sigilDoorArt(lit), dx - 1, fSnap(top));
  }
}

// ── the buttons ─────────────────────────────────────────────────────────────
class SigilButton extends Enemy {
  constructor(col, row, n) {
    super(col * TILE, (row + 1) * TILE - 4, TILE, 4);
    this.n = n; this.passive = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.on = false; this.sink = 0;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player, zone = { x: this.x - 1, y: this.y - 2, w: this.w + 2, h: 8 };
    const on = p.state === 'play' && p.onGround && overlap({ x: p.x + 2, y: p.y + p.h - 3, w: p.w - 4, h: 5 }, zone);
    if (on && !this.on) {
      const s = g.entities.find(e => e instanceof Sigil);
      Sound.play('kick');
      if (s) s.turn(g, this.n);
    }
    this.on = on;
    this.sink += ((on ? PLATE_UP : 0) - this.sink) * (on ? 0.5 : 0.25);
  }
  glow(hole) { hole(this.x + 8, this.y + 1, this.on ? 20 : 14, 0.5); }
  draw(ctx) {   // (in fine pixels: drawFloorButton, eclipse-fine.js)
    const x = Math.round(this.x), floor = Math.round(this.y) + 4, top = floor - PLATE_H + this.sink;
    drawFloorButton(ctx, x, floor, top, this.on ? '#8a84ac' : '#6a6488', '#c4bee8', '#9a94c0', '#433d64', this.on ? '#ffd166' : '#2e2848');
  }
}


