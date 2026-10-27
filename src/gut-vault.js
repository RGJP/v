'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-4's finale: CLOACOLITH's vault, the turtle's last chamber before the way out.
//   Cloacolith is a golem of swallowed junk with a battery wedged in his rear end. He rolls into a wall and
//   sticks there; ground-pound or roll into the battery. Three phases, two hits each, each adding an attack:
//     1 THE STOPPER    anchor into the roof (flesh rains down), then a roll into the wall
//     2 SHORT CIRCUIT  + belly-flop leaps that send sludge ripples along the floor
//     3 MELTDOWN       + three leaps, and a roll that ping-pongs off the walls, sparking along the floor
//   Every stomp on the battery sends its current crawling over the whole vault wall, leaving the colon irritated,
//   and the turtle's gut starts to grumble. When the battery blows, the turtle has... a moment:
//   the earthquake builds (startGutFlush), everything swallowed higher up comes through as one brown wave,
//   and he's blasted out of the turtle's behind into the open sea, where he floats up into the light (the
//   exit scene) and wakes up in bed (gut-dream.js).
// The pressure finale adds an escalating camera shake; the fight uses sound, grit and heaving walls.
// ═══════════════════════════════════════════════════════════════════════════

const CLOACOLITH_HP = 7;   // (seven battery hits: two, two, then three in the last phase)
const CLOACOLITH_GALLOP = true;   // his charge across the vault: galloping on his feet (true) or the old roll (false); same path, speed and bile
const DEFEAT_TALK = 120, BATTERY_INFLATE = 60;   // two-second protest, then one second of inflation
const BATTERY_BURST = DEFEAT_TALK + BATTERY_INFLATE;
const VAULT_FLOOR = 13;                     // the arena floor's top row
const FLUSH_QUIET = 70, FLUSH_FILL = 210, FLUSH_RIVER_END = 330, FLUSH_FULL = 610, FLUSH_HUSH = 760, FLUSH_WAVE = 800;   // quiet, filling, full pressure, then release
const VAULT_WELT = 220;                     // frames the colon wall stays red and irritated after a stomp's current crawls over it
const SEA_JET_LEN = 480;                    // eight seconds of the turtle's spectacular relief
const SEA_RISE_LEN = 660;                   // eleven quiet seconds to float completely offscreen
const EXIT_LEN = SEA_JET_LEN + SEA_RISE_LEN + 90;        // fade only after he has cleared the top

// the vault's quake level (0..1): rumbles set it, it settles by itself. Drawing reads it for trembling.
function vaultQuake(g) { return (g.gut && g.gut.quake) || 0; }

// ── corrosive bile globs shed by Cloacolith as he rolls ─────────────────────
class BileGlob extends Enemy {
  constructor(x, y, vx, vy) {
    super(x - 5, y - 5, 10, 10);
    this.vx = vx; this.vy = vy; this.landed = false; this.life = 95;
    this.bossHazard = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.landed ? { x: this.x, y: this.y + 4, w: 10, h: 6 } : { x: this.x + 1, y: this.y + 1, w: 8, h: 8 }; }
  onTouch(g) { g.hurtPlayer(); }
  update(g) {
    this.t++;
    const floorY = VAULT_FLOOR * TILE - this.h;
    if (!this.landed) {
      this.vy = Math.min(4.5, this.vy + 0.22);
      this.x += this.vx; this.y += this.vy;
      if (this.y >= floorY) {
        this.y = floorY; this.vx = 0; this.vy = 0; this.landed = true;
        Sound.play('sizzle');
        for (let i = 0; i < 4; i++) g.spark(this.cx, this.y + 8, i & 1 ? '#c8ff6a' : '#88b828', 10, rand(-1, 1), rand(-1.2, -0.2));
      }
    } else if (--this.life <= 0) this.remove = true;
  }
  draw(ctx) {
    const cx = Math.round(this.cx), cy = Math.round(this.y + this.h / 2), t = this.t;
    if (!this.landed) {
      gutEllipse(ctx, cx, cy, 5, 5, '#1e3808');
      gutEllipse(ctx, cx, cy, 4, 4, '#6ab828');
      gutEllipse(ctx, cx - 1, cy - 1, 2, 2, '#d8ff78');
      fBlob(ctx, cx - 1.6, cy - 1.4, 0.6, '#ffffff');
      return;
    }
    ctx.globalAlpha = Math.min(1, this.life / 20);
    const rx = 6 + Math.round(Math.sin(t * 0.2) * 0.6);
    gutEllipse(ctx, cx, cy + 3, rx + 1, 3, '#1e3808');
    gutEllipse(ctx, cx, cy + 3, rx, 2, '#78c82e');
    gutEllipse(ctx, cx - 1, cy + 2, Math.max(2, rx - 2), 1, '#daf878');
    fBlob(ctx, cx + ((t >> 2) % 5) - 1.5, cy + 1.5 - ((t >> 1) % 3), 0.6, '#f4ffd0');   // a sizzling bubble
    ctx.globalAlpha = 1;
  }
}

// a chunk of the cloaca wall, 14 x 12 (its middle at 7, 6): rusty mucosa, tan inner layers and olive veins (painted fine: mArt)
const FLESH_CHUNKS = [];
function fleshChunkArt(k) {
  if (FLESH_CHUNKS[k]) return FLESH_CHUNKS[k];
  const A = mArt(14, 12), MUC = ['#4e1a18', '#6e2824', '#8e3830', '#aa4e42', '#cc9280'];
  A.soft(7, 6, 6, k === 1 ? 3.4 : 5, MUC);
  A.soft(10, k === 2 ? 4.2 : 7.6, 3, 2.2, ['#6e2824', '#8e3830', '#aa4e42', '#c8786a', '#e0a898']);
  A.fill(1, 1, 13, 11, (x, y) => Math.abs(Math.sin(x * 1.3 + y * 0.4) * 1.4 - (y - 6)) < 0.35 ? '#6e2224' : null, true);   // muscle fibres
  A.line(5, 4, 6.6, 6.4, '#627842', true, 0.4); A.line(6, 5.4, 8, 5, '#627842', true, 0.34);              // a vein
  A.outline('#2a0c0c', 1);
  A.ell(4.6, 3.4, 1.8, 0.7, '#e8b8a8');
  return (FLESH_CHUNKS[k] = A.canvas());
}
// ── pieces of gut lining shaken from the roof by the anchor (a `harmless` one is just grit in the quake) ──
class FallingFleshDebris extends Enemy {
  constructor(x, kind = 0, harmless = false) {
    super(x - 11, TILE, 22, 22);
    this.kind = kind; this.harmless = harmless; this.sc = harmless ? 1 : 2;   // Larger pieces are dangerous.
    this.warn = harmless ? 0 : 60; this.vy = harmless ? rand(0, 1) : 0; this.rot = rand(0, 6);
    this.bossHazard = !harmless; this.passive = harmless; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.warn > 0 || this.harmless ? null : { x: this.x + 2, y: this.y + 2, w: 18, h: 18 }; }
  touches(p) { return !this.harmless && super.touches(p); }
  onTouch(g) { g.hurtPlayer(); }
  update(g) {
    this.t++;
    if (this.warn > 0) {
      this.warn--;
      if (this.warn % 5 === 0) g.particles.push({ kind: 'px', x: this.cx + rand(-4, 4), y: this.y + 2, vx: rand(-0.3, 0.3), vy: rand(0.5, 1.4), life: 16, t: 0, color: '#b87c6a', size: 1 });
      return;
    }
    this.vy = Math.min(5.2, this.vy + 0.22);
    this.y += this.vy;
    this.rot += 0.22;
    if (this.y + this.h >= VAULT_FLOOR * TILE) {
      if (!this.harmless || (this.kind % 2 && !(g.gut && g.gut.flush))) Sound.play('crumble');
      for (let i = 0; i < 6; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-4, 4), y: VAULT_FLOOR * TILE - 2, vx: rand(-1.5, 1.5), vy: rand(-2.4, -0.5), g: 0.14, life: 22, t: 0, color: i & 1 ? '#cc9280' : '#6e2824', size: 2 });
      this.remove = true;
    }
  }
  draw(ctx) {
    const cx = Math.round(this.cx), cy = Math.round(this.y + this.h / 2);
    if (!this.harmless) {
      // A quiet, steady guide marks the fixed drop lane before release and during the fall.
      const floor = VAULT_FLOOR * TILE;
      ctx.save();
      ctx.fillStyle = '#e8b498';
      ctx.globalAlpha = this.warn > 0 ? 0.12 : 0.08;
      fRect(ctx, cx + 0.33, TILE + 10, 1 / 3, floor - TILE - 11, '#e8b498');
      ctx.globalAlpha = this.warn > 0 ? 0.32 : 0.22;
      fRoundRect(ctx, cx - 11, floor - 1, 22, 0.8, 0.4, '#e8b498');
      ctx.restore();
    }
    if (this.warn > 0) {   // a flap of gut lining pulling away from the ceiling
      const shk = (this.t >> 1) & 1 ? 1 : -1;
      gutEllipse(ctx, cx + shk, TILE + 3, 9, 5, '#4e1a18');
      gutEllipse(ctx, cx + shk, TILE + 3, 8, 4, '#8e3830');
      fEll(ctx, cx + shk - 1.5, TILE + 1.6, 3.6, 0.6, '#e8b498');
      fRoundRect(ctx, cx + shk - 2, TILE + 5, 3, 4, 1.4, '#b87c6a'); fBlob(ctx, cx + shk - 0.5, TILE + 9 + (this.t % 12) / 4, 0.8, '#b87c6a');   // a drip stretching off it
      return;
    }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.rot); ctx.scale(this.sc, this.sc);
    ctx.drawImage(fleshChunkArt(this.kind % 3), -7, -6);   // (painted fine once per kind: below)
    ctx.restore();
  }
}

// ── his rusty anchor, hurled into the roof ─────────────────────────────────
class AnchorProjectile extends Enemy {
  constructor(x, y, boss) {
    super(x - 10, y, 20, 22);
    this.boss = boss; this.phase = 'up'; this.vy = -7.8; this.hold = 38;
    this.bossHazard = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return { x: this.x + 3, y: this.y + 2, w: 14, h: 18 }; }
  onTouch(g) { g.hurtPlayer(); }
  update(g) {
    this.t++;
    const b = g.level.def.boss;
    if (this.phase === 'up') {
      this.y += this.vy;
      if (this.y <= TILE) {
        this.y = TILE; this.phase = 'ceil';
        Sound.play('break'); Sound.play('thud');
        g.gutRumble(0.35);
        g.burst(this.cx, this.y + 4, ['#f2e8d2', '#c89060', '#a8b4c0'], 14);
        // the roof sheds flesh across the vault: one right over Chickaroo, the rest spread out
        const lo = (b.wall + 2) * TILE + 8, hi = (b.right - 1) * TILE - 8, n = 3 + this.boss.phase;
        const p = g.player;
        g.entities.push(new FallingFleshDebris(clamp(p.x + p.w / 2, lo, hi), 0));
        for (let i = 1; i < n; i++) { const x = clamp(lo + ((i - 0.5) / (n - 1)) * (hi - lo) + rand(-12, 12), lo, hi); if (Math.abs(x - clamp(p.x + p.w / 2, lo, hi)) > 56) g.entities.push(new FallingFleshDebris(x, i)); }   // (never crowding the one over him)
        // ...and a long shower of little scraps of lining, harmless, raining down all over for a second or so
        for (let i = 0; i < 22; i++) { const bit = new FallingFleshDebris(rand(lo, hi), i, true); bit.y = TILE - rand(0, 90); bit.vy = rand(0.2, 1.4); g.entities.push(bit); }
      }
    } else if (this.phase === 'ceil') {
      if (--this.hold <= 0) { this.phase = 'down'; this.vy = 1.5; }
    } else {
      this.vy = Math.min(6.5, this.vy + 0.32);
      this.y += this.vy;
      if (this.y + this.h >= VAULT_FLOOR * TILE) {
        Sound.play('thud');
        g.dust(this.cx, VAULT_FLOOR * TILE, 6);
        if (this.boss) this.boss.hasAnchor = true;
        this.remove = true;
      }
    }
  }
  draw(ctx) {
    const cx = Math.round(this.cx), y = Math.round(this.y);
    for (let k = 0; k < 4; k++) { const lx = cx + 0.5, ly = y + 21.5 + k * 4; if (k & 1) fRoundRect(ctx, lx - 0.5, ly - 2, 1, 4, 0.5, '#3a424e'); else { fEll(ctx, lx, ly, 1.4, 2.2, '#3a424e'); fEll(ctx, lx, ly, 0.6, 1.3, '#141820'); } }   // a length of chain (fine)
    drawIronAnchor(ctx, cx, y + 11, 0);
  }
}

function drawIronAnchor(ctx, cx, cy, rot = 0) {   // (painted once in cloacolith-art.js)
  ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); if (rot) ctx.rotate(rot);
  ctx.drawImage(cloArt('anchor', cloBakeAnchor), -15, -15);
  ctx.restore();
}

// ── a ripple of sludge running along the floor from a belly flop: jump it ────
class SludgeRipple extends Enemy {
  constructor(x, dir, speed) {
    super(x - 6, VAULT_FLOOR * TILE - 12, 12, 12);
    this.dir = dir; this.speed = speed;
    this.bossHazard = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  get size() { return Math.min(1, this.t / 8); }
  hitbox() { const h = Math.round(10 * this.size); return h < 4 ? null : { x: this.x + 2, y: this.y + 12 - h, w: 8, h }; }
  onTouch(g) { g.hurtPlayer(); }
  update(g) {
    this.t++;
    this.x += this.dir * this.speed;
    const b = g.level.def.boss;
    if (this.x < (b.wall + 1) * TILE - 4 || this.x + this.w > b.right * TILE + 4) {
      this.remove = true;
      for (let i = 0; i < 5; i++) g.particles.push({ kind: 'px', x: this.cx, y: this.y + 4, vx: -this.dir * rand(0.2, 1.4), vy: rand(-2.2, -0.6), g: 0.14, life: 20, t: 0, color: i & 1 ? '#8e5a26' : '#c89a4a', size: 2 });
    }
    if (this.t % 4 === 0) g.particles.push({ kind: 'px', x: this.cx - this.dir * 5, y: this.y + 6, vx: -this.dir * rand(0.1, 0.6), vy: rand(-1.4, -0.4), g: 0.12, life: 14, t: 0, color: '#8e5a26', size: 1 });
  }
  draw(ctx) {
    const s = this.size, x = Math.round(this.cx), by = VAULT_FLOOR * TILE, h = Math.round(11 * s), d = this.dir, t = this.t;
    if (h < 2) return;
    const crest = i => { const u = 1 - Math.abs(i + d * 2) / 9; return h * Math.max(0, u) * (0.8 + 0.2 * Math.cos(i * 0.6 + t * 0.3)); }, pts = [];   // a curling crest leaning the way it runs (fine)
    for (let i = -8; i <= 8; i += 0.5) pts.push([x + 0.5 + i, by - crest(i)]);
    const body = ctx.createLinearGradient(0, by - h, 0, by); body.addColorStop(0, '#a87a3a'); body.addColorStop(0.35, '#8c5a2b'); body.addColorStop(1, '#5a3418');
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
    fPoly(ctx, [...pts, [x + 8.5, by], [x - 7.5, by]], body);
    ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 0.6; ctx.beginPath(); pts.slice(4, -4).forEach(([px, py], k) => k ? ctx.lineTo(px, py + 0.6) : ctx.moveTo(px, py + 0.6)); ctx.stroke();
    fEll(ctx, x + d * 3 + 0.5, by - h * 0.95, 2, 1.2, '#efdcae'); fBlob(ctx, x + d * 4.6, by - h * 0.8, 0.7, '#efdcae');   // foam on the lip
    fEll(ctx, x - d * 3 + 0.5, by - h / 2, 1.2, 0.5, '#9ab838');
  }
}

// ── an arc of electricity crawling along the floor from a phase-3 wall slam ──
class FloorSpark extends Enemy {
  constructor(x, dir) {
    super(x - 6, VAULT_FLOOR * TILE - 10, 12, 10);
    this.dir = dir;
    this.bossHazard = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return { x: this.x + 2, y: this.y + 2, w: 8, h: 8 }; }
  onTouch(g) { g.hurtPlayer(); }
  update(g) {
    this.t++;
    this.x += this.dir * 2.3;
    const b = g.level.def.boss;
    if (this.x < (b.wall + 1) * TILE || this.x + this.w > b.right * TILE) { this.remove = true; g.burst(this.cx, this.y + 6, ['#7afff0', '#ffffff'], 6); }
    if (this.t % 3 === 0) g.spark(this.cx + rand(-4, 4), this.y + rand(2, 9), this.t % 2 ? '#7afff0' : '#ffffff', 12, rand(-0.6, 0.6), rand(-1.2, -0.2));
  }
  draw(ctx) {
    const x = Math.round(this.cx), by = VAULT_FLOOR * TILE, t = this.t;
    ctx.globalAlpha = 0.3; gutEllipse(ctx, x, by - 4, 9, 6, '#7afff0'); ctx.globalAlpha = 1;
    for (let k = 0; k < 2; k++) {   // two jagged bolts, redrawn every few frames
      const rng = mulberry32((t >> 3) * 7 + k * 31);
      let px = x - 6, py = by - 1 - Math.floor(rng() * 3);
      ctx.strokeStyle = k ? '#b8fff4' : '#7afff0'; ctx.lineWidth = k ? 0.5 : 0.9; ctx.lineJoin = 'miter'; ctx.beginPath(); ctx.moveTo(px, py + 0.5);   // (fine strokes)
      for (let i = 0; i < 6; i++) { const nx = px + 2, ny = clamp(by - 1 - Math.floor(rng() * 10), by - 11, by - 1); ctx.lineTo(nx, ny + 0.5); px = nx; py = ny; }
      ctx.stroke();
    }
  }
}

// Harmless mucus splashed across the arena by the final burst.
class VaultMucusSplat extends Enemy {
  // (fx, fy): where the blast was, so the spatter flies away from it
  constructor(x, y, size, floor, fx = x, fy = y + 40) {
    super(x - size, y - size, size * 2, size * 2);
    this.size = size; this.floor = floor;
    this.seed = Math.floor(rand(0, 1e6));
    this.ang = Math.atan2(y - fy, x - fx);
    this.passive = this.noFreeze = this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    // slime runs down from a wall splat in a few drips, slowing as they go; each one thickens to a bead at its tip
    this.drips = floor ? [] : Array.from({ length: 1 + Math.floor(size / 5) }, (_, i) => ({ dx: Math.round(rand(-size * 0.5, size * 0.5)), max: i ? rand(2, 6) : rand(5, 6 + size), sp: rand(0.04, 0.12), w: i ? 1 : 2 }));
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  draw(ctx) {
    const x = Math.round(this.cx), y = Math.round(this.y + this.size), r = this.size, t = this.t;
    const pic = this.pic || (this.pic = cloBakeSplat(r, this.floor, this.ang, this.seed));
    for (const D of this.drips) {   // behind the blob: the runs of slime
      const len = Math.round(D.max * (1 - Math.exp(-t * D.sp * 0.1))), dx = x + D.dx, top = y + Math.round(r * 0.4);
      fRoundRect(ctx, dx, top, D.w, len + 0.5, D.w / 2, '#4a6a18'); fRect(ctx, dx + 0.2, top, 0.4, Math.max(0, len - 1), '#8ab434');   // (fine)
      fEll(ctx, dx + D.w / 2, top + len + 0.8, D.w / 2 + 0.6, 1.1, '#5a7e1c'); fBlob(ctx, dx + D.w / 2 - 0.3, top + len + 0.4, 0.4, '#d4f080');   // the bead
    }
    ctx.drawImage(pic, x - (pic.width >> 1), y - (pic.height >> 1));
    if (this.floor && t % 70 < 12) {   // a puddle still fizzes now and then: a bubble rises and pops
      const bx = x + Math.round(Math.sin(this.seed + Math.floor(t / 70)) * r * 0.6), k = t % 70;
      if (k < 9) { fBlob(ctx, bx + 0.5, y - 0.6, 0.5 + k * 0.08, '#c8ec70'); fBlob(ctx, bx + 0.3, y - 0.9, 0.2 + k * 0.03, '#eaffb0'); }
      else for (const sx of [-1.4, 1.6]) fBlob(ctx, bx + sx, y - 1 - (k - 9) * 0.3, 0.4, '#eaffb0');
    }
  }
}

// ── the cloaca: the big puckered sphincter that is the vault's right wall (it opens in the flush) ──
class CloacaVent extends Enemy {
  constructor(col) {
    super(col * TILE - 16, 0, 32, VIEW_H);
    this.col = col;
    this.behindTiles = this.frontOfScenery = true; // tissue is scenery; the boss and player stay in front
    this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  draw(ctx, g) {   // (painted fine: cloacaArt, below)
    const wx = this.col * TILE, t = this.t, F = g && g.gut && g.gut.flush;
    const open = F ? F.open || 0 : 0, knock = F && F.knock > 0 ? F.knock : 0, q = g ? vaultQuake(g) : 0;
    const step = Math.round(clamp(open, 0, 1) * 12), img = cloacaArt(step);
    // it breathes, clenches when he knocks on it, and trembles in the quake
    const breathe = Math.sin(t * 0.04) * 0.012, clench = knock > 0 ? 0.05 + Math.sin(t * 0.8) * 0.02 : 0;
    const sx = 1 + breathe + clench, jx = q > 0.2 ? Math.sin(t * 0.9) * q * 1.4 : 0;
    ctx.save(); ctx.translate(wx + 4 + jx, 0); ctx.scale(sx, 1); ctx.drawImage(img, -CLOACA_OX, CLOACA_TOP); ctx.restore();
    if (step === 0) {   // shut: a string of mucus sags from the slit, stretching and drawing back
      const cx = wx - 3 + jx, sag = 6 + (0.5 + 0.5 * Math.sin(t * 0.03)) * 10;
      ctx.globalAlpha = 0.7; ctx.strokeStyle = '#e8b0b8'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(cx - 1, 8 * TILE + 6); ctx.quadraticCurveTo(cx - 3, 8 * TILE + 6 + sag, cx - 1.6, 8 * TILE + 8 + sag * 1.3); ctx.stroke();
      ctx.globalAlpha = 1; fBlob(ctx, cx - 1.6, 8 * TILE + 8.6 + sag * 1.3, 1, '#f4c8d0'); fBlob(ctx, cx - 2, 8 * TILE + 8.2 + sag * 1.3, 0.35, '#ffffff');
    }
  }
}
// the cloaca: a great fleshy sphincter swelling out of the vault's right wall, its folds converging on the orifice;
// `step` 0 (shut, a puckered slit) to 12 (wide open, a dark throat). 56 x 210, the wall's face at x CLOACA_OX, the top at
// y CLOACA_TOP. Painted fine (mArt), lit from the upper left, wet: the folds catch glints, veins run through the outer flesh
const CLOACA_OX = 40, CLOACA_TOP = TILE - 6, CLOACA_ART = [];
function cloacaArt(step) {
  if (CLOACA_ART[step]) return CLOACA_ART[step];
  const W = 56, H = 210, A = mArt(W, H), cx = CLOACA_OX - 7, cy = 8 * TILE - CLOACA_TOP, k = step / 12;
  const RXL = 30, RXR = 18, RY = 98, hx = 2.2 + k * 15, hy = 5 + k * 46;
  const INNER = ['#2a0810', '#5a1424', '#8e2a3a', '#c4545e', '#f2a0a4'], OUTER = ['#4e1a18', '#6e2824', '#8e3830', '#aa4e42', '#cc9280'];
  const hash = (a2, b2) => { const h = Math.sin(a2 * 127.1 + b2 * 311.7) * 43758.5453; return h - Math.floor(h); };
  A.fill(0, 0, W, H, (x, y) => {
    const dx = x - cx, dy = y - cy, lump = 1 + 0.1 * Math.sin(dy * 0.13 + 1) + 0.06 * Math.sin(dy * 0.31 + 2);   // a lumpy, uneven edge
    const RX = (dx < 0 ? RXL : RXR) * lump;
    const taper = Math.min(1, Math.min(y, H - y) / 26), m = (dx / (RX * (0.4 + 0.6 * taper))) ** 2 + (dy / RY) ** 2;
    if (m > 1 && !(x >= CLOACA_OX - 2)) return null;   // (to the right it runs on into the wall itself)
    const e = (dx / hx) ** 2 + (dy / hy) ** 2;
    if (e < 1) {   // the orifice: a dark throat, lit just inside its lip
      const deep = Math.sqrt(e);
      return deep > 0.8 ? lerpColor('#4a0e1c', '#9a2c3c', (deep - 0.8) / 0.2) : lerpColor('#080103', '#2a0810', deep / 0.8);
    }
    const rr = Math.min(1, Math.sqrt(m)), ang = Math.atan2(dy / RY, dx / RX), se = Math.sqrt(e);
    const near = clamp(1 - (se - 1) / 4, 0, 1);                                                  // 1 at the lip, fading outward
    // the pucker: deep radial folds converging on the hole (crevices sharp and dark, crests rounded)
    const wob = Math.sin(se * 1.3 + ang * 3) * 0.6, f = Math.sin(ang * 13 + wob);
    const fold = (f > 0 ? Math.pow(f, 0.6) : -Math.pow(-f, 2.2)) * (0.3 + 0.7 * near);
    // bulging bands of muscle round it, further out
    const band = Math.sin(se * 2.2 - ang * 0.6) * (1 - near) * 0.55 * (rr < 0.92 ? 1 : 0.3);
    const nx = dx / RX, ny = dy / RY;
    let l = 0.15 - nx * 0.6 - ny * 0.5 + (1 - Math.min(1, m)) * 0.6 + fold * 0.85 + band * 0.6 - (se < 1.5 ? 0.45 : 0);
    if (x >= CLOACA_OX - 2 && m > 1) l -= 0.6 + (x - CLOACA_OX) * 0.04;                      // (where it disappears into the wall)
    const kIn = clamp((rr - 0.32) / 0.36, 0, 1), col = lerpColor(softTone(INNER, l), softTone(OUTER, l), kIn);
    if (fold < -0.55 * (0.3 + 0.7 * near)) return lerpColor(col, '#1a0408', 0.55);              // down in a crevice
    if ((fold > 0.8 || band > 0.5) && l > 0.7 && hash(Math.floor(x * 0.8), Math.floor(y * 0.35)) > 0.7) return '#ffe0e4';   // wet glints along the crests
    if (rr > 0.6 && rr < 0.97) {   // a few branching veins in the outer flesh
      const vv = Math.abs(dy - 30 * Math.sin(dx * 0.09 + 1) - 70 * Math.round(dy / 70)) < 0.35 || Math.abs(dx + 18 - 4 * Math.sin(dy * 0.08)) < 0.3;
      if (vv) return lerpColor(col, '#627842', 0.4);
    }
    return col;
  });
  // the closed pucker's slit, and a glint of slime along its lip
  if (step === 0) { A.line(cx - 0.4, cy - 6, cx + 0.2, cy + 6, '#1a0408', null, 0.67); A.ell(cx - 1.6, cy - 2, 0.6, 2.2, '#ffd0d8'); }
  else A.ell(cx - hx * 0.7, cy - hy * 0.55, 0.8, hy * 0.18, '#f0a8b0');
  // Feather the upper and lower muscle attachments into the room's own flesh instead
  // of laying a rectangular sprite edge across its ceiling and floor. The opening stays opaque.
  const art=A.canvas(),ctx=art.getContext('2d');
  ctx.save();ctx.setTransform(ART_R,0,0,ART_R,0,0);
  const attachment=ctx.createLinearGradient(0,0,0,H);
  attachment.addColorStop(0,'rgba(255,255,255,0)');
  attachment.addColorStop(.05,'rgba(255,255,255,.16)');
  attachment.addColorStop(.17,'rgba(255,255,255,1)');
  attachment.addColorStop(.83,'rgba(255,255,255,1)');
  attachment.addColorStop(.95,'rgba(255,255,255,.16)');
  attachment.addColorStop(1,'rgba(255,255,255,0)');
  ctx.globalCompositeOperation='destination-in';ctx.fillStyle=attachment;ctx.fillRect(0,0,W,H);ctx.restore();
  return (CLOACA_ART[step] = art);
}

// ── the vault itself: the current from his battery crawling over the walls, the gate
// that seals behind you, and the walls heaving in the quake. Drawn over the painted room, behind everything.
class VaultDecor extends Enemy {
  constructor(x0, x1) {
    super(x0 * TILE, 0, (x1 - x0 + 1) * TILE, VIEW_H);
    this.x0 = x0; this.x1 = x1;
    this.passive = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.zaps = [];
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; this.zaps = this.zaps.filter(z => this.t - z.born < VAULT_WELT); }
  // A stomp on the battery: arcs of current crawl out across the colon wall from where it was hit, branching as
  // they go, then fade and leave the flesh red and irritated for a few seconds. (Thin, soft lines: no flash.)
  zap(x, y, phase, n = 4 + phase) {
    const rng = mulberry32(this.t * 977 + 13 + Math.round(x));
    const L = this.x + 2 * TILE, R = this.x + this.w - TILE, top = TILE + 4, bot = VAULT_FLOOR * TILE - 4;
    const grow = (x, y, ang, len, delay, depth) => {
      const pts = [[x, y]];
      for (let i = 0; i < len; i++) {
        ang += (rng() - 0.5) * 0.5;
        x += Math.cos(ang) * 8; y += Math.sin(ang) * 8;
        if (y < top || y > bot) { ang = -ang; y = clamp(y, top, bot); }                 // (it runs along the roof and floor)
        if (x < L || x > R) { ang = Math.PI - ang; x = clamp(x, L, R); }               // (and turns back off the end walls)
        pts.push([x, y]);
        if (depth < 1 && i > 4 && rng() < 0.09) grow(x, y, ang + (rng() < 0.5 ? -0.9 : 0.9), Math.floor((len - i) * 0.6), delay + i + 1, depth + 1);
      }
      this.zaps.push({ pts, born: this.t, delay, phase, seed: Math.floor(rng() * 1000) });
    };
    // fanned out all round from the battery, long enough to cross the whole vault
    for (let i = 0; i < n; i++) grow(x, y, Math.PI * 2 * (i + rng() * 0.7) / n, 40 + Math.floor(rng() * 30), i, 0);
  }
  drawZaps(ctx) {
    const t = this.t, col = [0, ['#7afff0', '#e0fffb'], ['#b8ff4a', '#f4ffb0'], ['#ff9a5a', '#ffe0a0']];
    for (const z of this.zaps) {   // first the welts the current leaves behind: soft red, fading slowly
      const age = t - z.born - z.delay; if (age < 0) continue;
      const shown = Math.min(z.pts.length, 1 + age);
      ctx.globalAlpha = 0.11 * (1 - age / VAULT_WELT); ctx.fillStyle = '#ff4a5a';
      for (let i = 1; i < shown; i++) this.zapSeg(ctx, z.pts[i - 1], z.pts[i], 3);
    }
    for (const z of this.zaps) {   // then the arcs: racing out, holding a moment, fading (never brighter than this)
      const age = t - z.born - z.delay; if (age < 0) continue;
      const shown = Math.min(z.pts.length, 1 + Math.floor(age / 2)), fade = clamp(1 - (age - z.pts.length) / 30, 0, 1);
      if (fade <= 0) continue;
      const [c0, c1] = col[z.phase], wig = (i) => (cloHash(i, (t >> 3) + z.seed, 517) - 0.5) * 2;   // a slow 1px crawl
      const pts = z.pts.slice(0, shown).map(([x, y], i) => [x + wig(i), y + wig(i + 99)]);
      ctx.globalAlpha = 0.18 * fade; ctx.fillStyle = c0;
      for (let i = 1; i < pts.length; i++) this.zapSeg(ctx, pts[i - 1], pts[i], 3);
      ctx.globalAlpha = 0.6 * fade; ctx.fillStyle = c1;
      for (let i = 1; i < pts.length; i++) this.zapSeg(ctx, pts[i - 1], pts[i], 1);
    }
    ctx.globalAlpha = 1;
  }
  zapSeg(ctx, [x0, y0], [x1, y1], w) {   // a segment w px thick (a fine stroke: hires.js)
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = w * 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  draw(ctx, g) {
    const b = g.level.def.boss, F = g.gut && g.gut.flush, q = vaultQuake(g), t = this.t;
    const L = (b.wall + 1) * TILE, R = b.right * TILE, floor = VAULT_FLOOR * TILE;
    // 1. the walls heave: dark rings of peristalsis rolling toward the cloaca, faster and deeper as the quake builds
    const heave = F ? Math.min(1, F.t / FLUSH_HUSH) : q * 0.5;
    if (heave > 0.02) {
      const sp = 1.2 + heave * 4, gapW = 150 - heave * 70;
      for (let k = 0; k < 4; k++) {
        const cx = L + ((t * sp + k * gapW) % (R - L + 60)) - 30;
        const gr = ctx.createLinearGradient(cx - 26, 0, cx + 26, 0);   // a soft dark band (fine: hires.js)
        gr.addColorStop(0, 'rgba(26,4,6,0)'); gr.addColorStop(0.5, `rgba(26,4,6,${0.22 * heave})`); gr.addColorStop(1, 'rgba(26,4,6,0)');
        ctx.fillStyle = gr; ctx.fillRect(cx - 26, TILE, 52, floor - TILE);
      }
      ctx.globalAlpha = 1;
    }
    // 2. the current from the last stomps, and the welts it leaves
    this.drawZaps(ctx);
    // 3. calcified drips hanging off the roof, swinging in the quake
    for (let i = 0; i < 13; i++) {
      const x = L + 18 + i * 41 + (i * 13) % 11, len = 6 + (i * 7) % 9, sw = Math.round(Math.sin(t * 0.3 + i) * q * 3);
      const pt = (k, grow) => [x + sw * k + (k < 1 ? 0 : 0), TILE + len * k + (k >= 1 ? grow : 0)];   // a tapering stalactite (fine: hires.js)
      fPoly(ctx, [[x - 3.7, TILE - 1], [x + 3.7, TILE - 1], [x + 0.9 + sw, TILE + len + 0.8], [x - 0.9 + sw, TILE + len + 0.8]], INK);
      fPoly(ctx, [[x - 3, TILE - 1], [x + 3, TILE - 1], [x + 0.4 + sw, TILE + len], [x - 0.4 + sw, TILE + len]], '#94805c');
      fPoly(ctx, [[x - 3, TILE - 1], [x - 1, TILE - 1], [x - 0.2 + sw, TILE + len], [x - 0.4 + sw, TILE + len]], '#c0aa80');
      void pt;
    }
    // 4. the gate: a column of muscle that clenches shut behind him when Cloacolith wakes (bursts in the flush)
    this.drawGate(ctx, g, b);
  }
  drawGate(ctx, g, b) {
    const lv = g.level, x = b.wall * TILE, t = this.t;
    const retract = g.gutGateRetraction();
    if (retract >= 1) return;
    ctx.save();
    // The muscle shortens upward and bunches wider against its ceiling attachment.
    ctx.translate(x + 8, TILE);
    ctx.scale(1 + retract * 0.35, 1 - retract);
    ctx.translate(-x - 8, -TILE);
    for (let r = 1; r < VAULT_FLOOR; r++) {
      if (lv.get(b.wall, r) !== T.BODY) continue;
      const B = fineBatch(), q = 1 / ART_R;   // (in fine rows: hires.js)
      for (let y = r * TILE; y < (r + 1) * TILE; y += q) {
        const k = Math.sin(y * 0.4 + t * 0.05), w = 18 + k * 2, x0 = x + 8 - w / 2, band = Math.sin(y * 1.05);
        B(x0 - 2 / 3, y, w + 4 / 3, q, INK); B(x0, y, w, q, band < -0.5 ? '#5e1a1e' : band < 0 ? '#722126' : '#86282c');
        B(x0 + 2, y, 3, q, '#b44a48'); B(x0 + 3, y, 1, q, '#e0827a');
      }
      B.flush(ctx);
    }
    if (retract > 0) {
      gutEllipse(ctx, x + 8, VAULT_FLOOR * TILE - 3, 10, 4, '#86282c');
      gutEllipse(ctx, x + 7, VAULT_FLOOR * TILE - 3, 7, 2, '#b44a48');
    }
    ctx.restore();
  }

}

// ── BOSS: CLOACOLITH ────────────────────────────────────────────────────────
const CLOACOLITH_WAKE = [
  'I am the great blockage! The final stopper! Stop staring at my behind! A battery got wedged in there a long time ago, and... it\'s... load-bearing! NOW PERISH, YOU VILE PIP !',
  'Tremble before the Great Impactor! Keeper of the Gate! ...And stop eye-balling my rear! Yes, it\'s a battery. No, it doesn\'t come out. It\'s load-bearing! NOW DIE, YOU MALIGNANT PULLUS!',
];
const CLOACOLITH_DIE = 'NOOOO! THIS IS UNDIGNIFIED!';


class Cloacolith extends Enemy {
  constructor(col, row = 12) {
    super(col * TILE, (row + 1) * TILE - 42, 44, 42);
    this.floorRow = row + 1;
    this.introActive = true;
    this.noFreeze = true;   // Boss encounters cannot be replaced by a carried ice block.
    this.speakerName = 'CLOACOLITH';
    this.hideHealthBar = true;
    this.title = 'CLOACOLITH'; this.titleCol = '#b8f050';
    this.barBg = '#263414'; this.barCol = '#84d834'; this.barHit = '#e8ff9a';
    this.maxHp = this.hp = CLOACOLITH_HP;
    this.shown = 0; this.cycle = 0; this.leaps = 0; this.squash = 0;
    this.state = 'sleep'; this.timer = 0; this.face = -1; this.flash = 0;
    this.rollAng = 0; this.hasAnchor = true; this.passesLeft = 1;
    this.gallop = CLOACOLITH_GALLOP;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  get phase() { return this.hp > 5 ? 1 : this.hp > 3 ? 2 : 3; }
  setState(s, n = 0) { this.state = s; this.timer = n; }
  // the battery sticking out of his rear while he's wedged in the wall
  coreBox() {
    if (this.state !== 'stuck') return null;
    return { x: this.face < 0 ? this.x + this.w - 4 : this.x - 18, y: this.y + 10, w: 22, h: 22 };
  }
  hitbox() {
    if (this.state === 'sleep' || this.state === 'die') return null;
    return { x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 3 };
  }
  touches(p) {
    const s = this.state;
    if (s === 'sleep' || s === 'roar' || s === 'die' || s === 'recover' || s === 'reel' || this.harmless) return false;
    const cb = this.coreBox();
    if (cb && overlap(cb, p)) return true;
    const hb = this.hitbox();
    return !!hb && overlap(hb, p);
  }
  onTouch(g, p) {
    const cb = this.coreBox();
    if (cb) {
      if (p.roll > 0 && overlap(cb, p)) {
        const incoming = Math.sign(p.vx) || p.rollDir || this.face;
        g.endRoll(p); g.standUp(p);
        p.crouch = false; p.spin = false; p.platform = null; p.jumpBuf = 0;
        this.hitBattery(g, p);
        p.vx = -incoming * 3.8; p.vy = -6.8;
        p.onGround = false; p.jumping = true; p.sx = .76; p.sy = 1.25;
        // The final roll gets its recoil too, then Chickaroo lands to watch the protest.
        if (this.state === 'die') p.finaleBounce = 42;
        g.shake = Math.max(g.shake, 2.5);
        return;
      }
      // a generous zone over the battery: coming down onto it never hurts
      const safe = { x: cb.x - 6, y: cb.y - 14, w: cb.w + 12, h: cb.h + 16 };
      if (overlap(safe, p) && (p.pounding || p.vy > 0 || p.y + p.h <= cb.y + 12)) {
        if (p.pounding || p.poundT > 0) this.hitBattery(g, p);
        else {   // just landed on it: it bounces him off (it wants a ground pound)
          p.vy = -7.2; p.vx = 0; p.onGround = false; p.jumping = true; p.sx = 0.85; p.sy = 1.2;
          Sound.play('bump');
          g.popup(cb.x + cb.w / 2, cb.y - 10, '↓', '#7afff0');
        }
        return;
      }
    }
    g.hurtPlayer();
  }
  hitBattery(g, p) {
    if (this.state !== 'stuck') return;
    const cb = this.coreBox() || this, cx = cb.x + cb.w / 2, cy = cb.y + cb.h / 2, was = this.phase;
    p.pounding = false; p.poundT = 0;
    p.vy = -6.8; p.vx = -this.face * 2.3; p.onGround = false; p.jumping = true; p.sx = 0.8; p.sy = 1.25;
    p.invuln = Math.max(p.invuln, 35);
    this.hp = Math.max(0, this.hp - 1);
    this.flash = 28; this.hasAnchor = true;
    Sound.play('stomp'); Sound.play('volt');
    g.addScore(2000, cx, cy - 10);
    g.burst(cx, cy, ['#7afff0', '#b8ff4a'], 10);
    const decor = g.entities.find(e => e instanceof VaultDecor);
    if (decor) decor.zap(cx, cy, this.phase);   // (the phase the hit happened in: before it falls)
    g.clearBossHazards();
    if (this.hp <= 0) { this.die(g); return; }
    if (this.phase !== was) {   // a phase falls: he reels out of the wall, and the turtle's gut answers
      if (this.phase === 3 && !this.finalFeather) {
        this.finalFeather = true;
        // Replace any uncollected first feather with one fresh pickup at the same perch.
        for (const item of g.items) if (item.kind === 'gale' && Math.abs(item.x - (491 * TILE + 1)) < 1) item.remove = true;
        g.makeEntity(['pickup', 491, 6, 'gale']);
        g.burst(491 * TILE + 8, 6 * TILE - 8, ['#d8ffe4', '#9ae8a8'], 10);
      }
      this.setState('reel', 130);
    } else {
      this.setState('recover', 42);
    }
  }
  wake(g) {
    const b = g.level.def.boss;
    g.boss = this;
    this.setState('roar', 0);
    g.arenaCam = b.wall * TILE;
    g.arenaMax = Math.max(g.arenaCam, (b.right + 1) * TILE - VIEW_W);
    g.startBossMusic();
    Sound.play('roar');
  }
  die(g) {
    this.setState('die', 0);
    this.vx = 0; this.flash = 0;
    g.clearBossHazards();
    const p = g.player;
    g.endRoll(p); g.standUp(p); g.dropHeld();
    p.vx = 0; p.vy = 0; p.charge = 0; p.pounding = false; p.spin = false;
    p.crouch = false; p.jumping = false; p.onGround = true; p.platform = null;
    p.y = (this.floorRow || VAULT_FLOOR) * TILE - p.h; p.prevY = p.y;
    p.facing = p.x + p.w / 2 < this.cx ? 1 : -1;
    p.finaleLocked = true; p.invuln = 9999;
    Sound.play('roar');
    g.speak(this, CLOACOLITH_DIE, '#7afff0');
    const line = [g.dialog, ...(g.dialogQ || [])].find(d => d && d.speaker === this);
    if (line) { line.hold = false; line.life = DEFEAT_TALK; line.top = true; line.background = 'rgba(11,9,24,1)'; }

  }
  // Optional patrols lengthen the gaps without delaying a player's exposed-core opening.
  nextCycle() {
    this.vx = 0;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    if (Math.random() < 0.45) this.setState('patrol', 90 + Math.floor(Math.random() * 121));
    else this.setState('stalk', 24 + Math.floor(Math.random() * 31));
  }
  // Choose the opening attack independently; each still leads to a roll and an exposed core.
  plan() {
    // now and then, instead of an attack, a fake-out: he lunges at Chickaroo and pulls up short (feint, below)
    if (this.lastPlan !== 'feint' && Math.random() < 0.25) { this.lastPlan = 'feint'; this.harmless = true; this.setState('feintWind', 14); Sound.play('swing'); return; }
    this.lastPlan = 'attack';
    this.cycle++;
    if (this.phase >= 2 && Math.random() < 0.5) { this.leaps = this.phase === 2 ? 2 : 3; this.setState('leapWind', 24); }
    else this.setState('anchorWind', this.phase === 3 ? 26 : 34);
  }
  update(g) {
    const p = g.player, b = g.level.def.boss;
    if (!b) return;
    this.updateSparks();
    // Committed attacks finish beyond the camera, including their follow-through.
    // Idle states and the exposed core wait for Chickaroo to see him again (more than a quarter of him on screen will do).
    const committed = ['anchorWind', 'anchorWait', 'leapWind', 'leap', 'pause', 'rollWind', 'roll', 'recover', 'reel', 'die', 'feintWind', 'feint', 'feintSkid', 'feintBack'].includes(this.state);
    const shown = Math.min(this.x + this.w, g.camX + VIEW_W) - Math.max(this.x, g.camX);
    if (!committed && shown <= this.w / 4) return;
    const floorY = (this.floorRow || VAULT_FLOOR) * TILE - this.h, pcx = p.x + p.w / 2;
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.squash > 0) this.squash--;
    if (this.state === 'sleep') {
      if (this.t % 70 === 0 && this.x < g.camX + VIEW_W) g.popup(this.cx + 10, this.y - 4, 'Z', '#b8f050');
      if (p.state === 'play' && p.x > b.trigger * TILE && this.x + this.w <= g.camX + VIEW_W - 12) this.wake(g);
      return;
    }
    // after a feint he stays harmless until Chickaroo is clear of him (a second at most, if he hangs about inside him)
    if (this.harmless && !this.state.startsWith('feint')) { const hb = this.hitbox(); if (!hb || !overlap(hb, p) || --this.harmlessT <= 0) this.harmless = false; }
    if (!(g.gut && g.gut.flush)) g.boss = this;   // (his bar goes once the turtle takes over)
    this.shown += (Math.min(this.hp / this.maxHp, this.state === 'roar' ? this.timer / 70 : 1) - this.shown) * 0.12;
    let landed = false;
    if (this.y < floorY || this.vy < 0) {
      this.vy += 0.38; this.y += this.vy;
      if (this.y >= floorY) { this.y = floorY; landed = this.vy > 2; this.vy = 0; }
    }
    const leftWall = (b.wall + 1) * TILE, rightWall = (b.right - 1) * TILE - this.w;
    // phase 3: the battery's leaking into the turtle; its gut grumbles now and then (harmless, but ominous)
    if (this.phase === 3 && this.state !== 'die' && this.t % 260 === 0) g.gutRumble(0.45);

    switch (this.state) {
      case 'roar': {
        this.timer++;
        if (this.timer === 18) {
          const sentences = oneOf(CLOACOLITH_WAKE).match(/[^.!?]+[.!?]+/g).map(s => s.trim()).filter(s => /[a-z0-9]/i.test(s));
          g.speak(this, sentences[0], '#b8f050', true);
          const line = [g.dialog, ...(g.dialogQ || [])].find(d => d && d.speaker === this);
          if (line) {
            line.top = true;
            line.cloacolithIntro = true;
            line.background = 'rgba(11,9,24,1)';
            const rest = sentences.slice(1).map(text => ({ ...line, text: text.toUpperCase(), t: 0 }));
            const index = g.dialogQ.indexOf(line);
            g.dialogQ.splice(index + 1, 0, ...rest);
          }
        }
        const row = this.timer;   // Seal in 12 frames, before the opening dialogue pauses play at frame 18.
        if (row >= 1 && row < VAULT_FLOOR) {
          g.level.set(b.wall, row, T.BODY);
          if (row % 3 === 0) Sound.play('plop');
        }
        if (this.timer >= 70) { this.introActive = false; this.face = pcx < this.cx ? -1 : 1; this.setState('patrol', 360); this.hops = 0; }
        break;
      }
      case 'patrol': {   // the opening: he just wanders and stomps about (no harm), wondering what's coming
        this.face = pcx < this.cx ? -1 : 1;
        if (this.timer % 120 === 100) this.dir = (this.dir || 1) * -1;
        this.x = clamp(this.x + (this.dir || -1) * 0.8, leftWall, rightWall);
        if (this.x <= leftWall || this.x >= rightWall) this.dir = -(this.dir || 1);
        if (this.y >= floorY && this.vy === 0 && this.timer % 70 === 30) { this.vy = -3.2; this.squash = 0; }
        if (landed) { this.squash = 6; Sound.play('thud'); g.dust(this.cx, this.y + this.h, 5); g.gutRumble(0.15); }
        if (--this.timer <= 0) this.setState('stalk', 30);
        break;
      }
      case 'stalk': {
        this.face = pcx < this.cx ? -1 : 1;
        this.x = clamp(this.x + this.face * (0.65 + (this.phase - 1) * 0.2), leftWall, rightWall);
        if (--this.timer <= 0) this.plan();
        break;
      }
      case 'anchorWind': {
        this.face = pcx < this.cx ? -1 : 1;
        if (this.timer === 26) Sound.play('swing');
        if (--this.timer <= 0) {
          this.hasAnchor = false;
          Sound.play('whoosh');
          g.entities.push(new AnchorProjectile(this.cx + this.face * 8, this.y - 4, this));
          this.setState('anchorWait', 95);
        }
        break;
      }
      case 'anchorWait': {
        if (--this.timer <= 0 || this.hasAnchor) { this.hasAnchor = true; this.toRoll(pcx, leftWall, rightWall); }
        break;
      }
      case 'leapWind': {   // crouching to spring, eyes on him
        this.face = pcx < this.cx ? -1 : 1;
        this.squash = 2;
        if (this.timer % 6 === 0) g.dust(this.cx, this.y + this.h, 2);
        if (--this.timer <= 0) {
          const tx = clamp(pcx, leftWall + this.w / 2, rightWall + this.w / 2);
          this.vy = this.phase === 3 ? -8 : -7.4;
          this.vx = clamp((tx - this.cx) / 40, -3.4, 3.4);
          Sound.play('leap');
          this.setState('leap', 0);
        }
        break;
      }
      case 'leap': {
        this.timer++;
        this.x = clamp(this.x + this.vx, leftWall, rightWall);
        if (landed || (this.timer > 6 && this.y >= floorY && this.vy === 0)) {
          // the belly flop: a ripple of sludge each way along the floor
          this.squash = 10; this.vx = 0;
          Sound.play('pound'); Sound.play('splash');
          g.gutRumble(0.2);
          g.dust(this.cx, this.y + this.h, 10);
          const sp = this.phase === 3 ? 2.6 : 2.1;
          g.entities.push(new SludgeRipple(this.x + 2, -1, sp), new SludgeRipple(this.x + this.w - 2, 1, sp));
          if (--this.leaps > 0) this.setState('leapWind', this.phase === 3 ? 16 : 22);
          else this.setState('pause', 26);
        }
        break;
      }
      // ── the feint: pure menace. A snarl and a crouch, a lunge straight at him, a skid to a stop just short, and a
      // hop back. He's harmless from the crouch until he's clear of Chickaroo again, whatever Chickaroo does.
      case 'feintWind': {
        this.face = pcx < this.cx ? -1 : 1;
        this.squash = 2;
        if (this.timer % 5 === 0) g.dust(this.cx - this.face * 14, this.y + this.h, 2);
        if (--this.timer <= 0) { this.vx = 0; this.feintFrom = this.x; Sound.play('whoosh'); this.setState('feint', 0); }
        break;
      }
      case 'feint': {
        this.timer++;
        this.vx = Math.min(6.2, this.vx + 0.9);   // (quick, but you see him cover the ground)
        const gap = (pcx - this.cx) * this.face - (this.w + p.w) / 2;   // how far short of him he is (negative: past him)
        const step = Math.min(this.vx, Math.max(0, gap - 6));
        this.x = clamp(this.x + this.face * step, leftWall, rightWall);
        if (this.timer % 3 === 0) g.dust(this.cx - this.face * 12, this.y + this.h, 1);
        if (step < this.vx || Math.abs(this.x - this.feintFrom) > 170 || this.timer > 40 || this.x <= leftWall || this.x >= rightWall) {
          Sound.play('thud'); g.dust(this.cx + this.face * 14, this.y + this.h, 6);
          this.vx = Math.min(this.vx, 2.5);
          this.setState('feintSkid', 18);
        }
        break;
      }
      case 'feintSkid': {   // skidding the last bit, snarling right in his face
        const gap = (pcx - this.cx) * this.face - (this.w + p.w) / 2;
        this.vx *= 0.7; if (gap < 5) this.vx = 0;
        this.x = clamp(this.x + this.face * this.vx, leftWall, rightWall);
        if (--this.timer <= 0) { this.vy = -3.4; this.vx = -this.face * 2.6; Sound.play('hop'); this.setState('feintBack', 0); }
        break;
      }
      case 'feintBack': {   // bouncing back to where he can come at him for real
        this.timer++;
        this.x = clamp(this.x + this.vx, leftWall, rightWall);
        if (landed || (this.timer > 8 && this.y >= floorY && this.vy === 0)) {
          this.squash = 5; g.dust(this.cx, this.y + this.h, 4);
          this.vx = 0; this.harmlessT = 60; this.nextCycle();
        }
        break;
      }
      case 'pause': {
        if (--this.timer <= 0) this.toRoll(pcx, leftWall, rightWall);
        break;
      }
      case 'rollWind': {
        this.rollAng -= this.face * 0.25;
        if (this.timer % 8 === 0) g.dust(this.cx - this.face * 12, this.y + this.h, 3);
        if (--this.timer <= 0) { Sound.play('roll'); this.setState('roll', 0); }
        break;
      }
      case 'roll': {
        this.timer++;
        const sp = 3.2 + (CLOACOLITH_HP - this.hp) * 0.22;
        this.x += this.face * sp;
        const stride = Math.floor(Math.abs(this.rollAng) / Math.PI);
        this.rollAng += this.face * 0.32;
        if (this.gallop && Math.floor(Math.abs(this.rollAng) / Math.PI) !== stride) g.dust(this.cx - this.face * 10, this.y + this.h, 3);   // a hoofbeat
        if (this.timer % Math.max(12, 18 - (CLOACOLITH_HP - this.hp)) === 6) {   // flinging bile behind him
          g.entities.push(new BileGlob(this.cx - this.face * 10, this.y + 18, -this.face * rand(0.7, 1.7), rand(-3.5, -1.8)));
          Sound.play('plop');
        }
        if ((this.face < 0 && this.x <= leftWall) || (this.face > 0 && this.x >= rightWall)) {
          this.x = clamp(this.x, leftWall, rightWall);
          Sound.play('break'); Sound.play('thud');
          g.dust(this.face < 0 ? this.x : this.x + this.w, this.y + 20, 8);
          if (--this.passesLeft > 0) {   // (phase 3) off the wall and back the other way, sparking along the floor
            g.entities.push(new FloorSpark(this.face < 0 ? this.x + 6 : this.x + this.w - 6, -this.face));
            g.gutRumble(0.3);
            this.face = -this.face; this.vy = -3.2;
          } else {   // wedged in the wall, the battery sticking out of his rear
            this.setState('stuck', [0, 240, 210, 180][this.phase]);
            const cb = this.coreBox();
            if (cb) g.burst(cb.x + cb.w / 2, cb.y + cb.h / 2, ['#7afff0', '#b8ff4a', '#ffffff'], 10);
          }
        }
        break;
      }
      case 'stuck': {
        const cb = this.coreBox();
        if (cb && p.state === 'play' && overlap({ x: cb.x - 4, y: cb.y - 6, w: cb.w + 8, h: cb.h + 8 }, p) && (p.pounding || p.poundT > 0)) { this.hitBattery(g, p); break; }
        if (this.phase >= 2 && this.t % 9 === 0 && cb) g.spark(cb.x + rand(0, cb.w), cb.y + rand(0, cb.h), this.phase === 3 ? '#ffd166' : '#b8ff4a', 14, rand(-1, 1), rand(-1.4, -0.2));
        if (--this.timer <= 0) { Sound.play('plop'); this.setState('recover', 30); }
        break;
      }
      case 'recover': {   // pulls himself out of the wall and hops back a step
        if (this.timer === 28) { this.x = clamp(this.x - this.face * 14, leftWall, rightWall); this.vy = -3.4; Sound.play('hop'); }
        if (--this.timer <= 0) this.nextCycle();
        break;
      }
      case 'reel': {   // knocked out of the wall, seeing stars, while the whole turtle grumbles
        if (this.timer === 128) { this.x = clamp(this.x - this.face * 20, leftWall, rightWall); this.vy = -4.4; Sound.play('hop'); }
        if (this.timer === 80) g.gutRumble(0.8);
        if (--this.timer <= 0) this.nextCycle();
        break;
      }
      case 'die': {
        this.timer++;
        const bx = (this.face < 0 ? this.x + this.w - 4 : this.x - 18) + 11, by = this.y + 21;
        if (this.timer <= DEFEAT_TALK) {
          // Let the protest land before the visual punchline starts; play keeps running.
          if (this.timer === DEFEAT_TALK) Sound.play('chargeUp');
        } else if (this.timer < BATTERY_BURST) {
          if (this.timer % 6 === 0) g.spark(bx + rand(-10, 10), by + rand(-8, 8), '#69bbff', 12, rand(-1.5, 1.5), rand(-1.5, 0.5));
        } else if (this.timer === BATTERY_BURST) {   // KABOOM, after the full inflation gag
          Sound.play('thunder'); Sound.play('firework'); Sound.play('splash'); Sound.play('sizzle');
          g.addScore(10000, this.cx, this.y - 10);
          g.burst(this.cx, this.y + 20, ['#7afff0', '#b8ff4a', '#ff9a3a', '#7a4a22', '#588a24'], 120);
          for (let i = 0; i < 56; i++) g.particles.push({ kind: 'px', x: this.cx, y: this.y + 20, vx: rand(-9, 9), vy: rand(-10, -2), g: 0.2, life: 90, t: 0, color: ['#8a623c', '#efe4cc', '#9aa8b8', '#588a24'][i % 4], size: 3 });
          for (let i = 0; i < 80; i++) g.particles.push({ kind: 'px', x: this.cx, y: this.y + 20, vx: rand(-12, 12), vy: rand(-11, 3), g: 0.16, life: 110, t: 0, color: ['#657e2b', '#93ad43', '#c0cc6a'][i % 3], size: rand(2, 5) });
          for (let i = 0; i < 28; i++) {
            const floor = i % 3 === 0;
            g.entities.push(new VaultMucusSplat(rand(leftWall + 8, rightWall + this.w - 8), floor ? VAULT_FLOOR * TILE - 2 : rand(2 * TILE, 11 * TILE), 5 + i % 8, floor, this.cx, this.y + 20));
          }
          p.gutDirty = true;
        } else if (this.timer === BATTERY_BURST + 35) g.startGutFlush();
        break;
      }
    }
  }
  // Where the battery's end is in the world (it turns with him, and rolls with him).
  batteryTip() {
    const cx = this.cx, cy = this.y + this.h - 21, r = 36 * this.batteryExtension();
    if ((this.state === 'roll' || this.state === 'rollWind') && !this.gallop) return [cx - Math.cos(this.rollAng) * r, cy - Math.sin(this.rollAng) * r];
    if (this.state === 'roll') return [cx - (this.face < 0 ? -1 : 1) * r, cy - Math.round(Math.abs(Math.sin(this.rollAng)) * 7)];   // (bobbing with the gallop)
    return [cx - (this.face < 0 ? -1 : 1) * r, cy];
  }
  // Every hit leaves the battery sparking for good: a few sparks after the first, a steady spray and showers by
  // the last (the fight has no health bar, so this is how he shows he's hurting).
  updateSparks() {
    const S = this.sparks || (this.sparks = []), damage = clamp(this.maxHp - this.hp, 0, this.maxHp);
    if (damage > 0 && this.state !== 'die' && this.state !== 'sleep') {
      const [tx, ty] = this.batteryTip(), dx = Math.sign(tx - this.cx) || 1;
      let n = Math.random() < damage * damage * 0.016 + damage * 0.05 ? 1 : 0;
      if (Math.random() < damage * 0.006) n += 3 + Math.floor(Math.random() * damage * 1.5);   // now and then, a shower
      this.sparked = (this.sparked || 0) + n;
      for (let i = 0; i < n; i++) {
        const life = 22 + Math.floor(Math.random() * 18);
        S.push({ x: tx, y: ty + rand(-3, 3), vx: dx * rand(0.6, 2.6) + rand(-0.6, 0.6), vy: rand(-3.4, -0.6), life, max: life, bounced: false });
      }
    }
    const floor = (this.floorRow || VAULT_FLOOR) * TILE - 1;
    for (const k of S) {
      k.x += k.vx; k.y += k.vy; k.vy += 0.15; k.life--;
      if (k.y > floor) { if (k.bounced) k.life = 0; else { k.bounced = true; k.y = floor; k.vy *= -0.35; k.vx *= 0.6; } }
    }
    this.sparks = S.filter(k => k.life > 0);
  }
  drawSparks(ctx) {
    for (const k of this.sparks || []) {
      const f = k.life / k.max, x = Math.round(k.x), y = Math.round(k.y);
      const a = Math.min(1, f * 1.6);
      if (f > 0.5) { ctx.globalAlpha = a * 0.35; fBlob(ctx, k.x + 0.5, k.y + 0.5, 1.6, '#69bbff'); }   // fresh: a soft glow round it (fine)
      ctx.globalAlpha = a * 0.7; ctx.strokeStyle = f > 0.35 ? '#69bbff' : '#3a6ad8'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';   // a streak behind it
      ctx.beginPath(); ctx.moveTo(k.x + 0.5 - k.vx * 1.8, k.y + 0.5 - k.vy * 1.8); ctx.lineTo(k.x + 0.5, k.y + 0.5); ctx.stroke();
      ctx.globalAlpha = a; fBlob(ctx, k.x + 0.5, k.y + 0.5, 0.6, f > 0.65 ? '#ffffff' : f > 0.35 ? '#fff2a0' : '#ffd166');
    }
    ctx.globalAlpha = 1;
  }
  toRoll(pcx, leftWall, rightWall) {
    this.face = (this.cx - leftWall > rightWall - this.cx) ? -1 : 1;   // toward the far wall, so he crosses the vault
    if (Math.abs(pcx - this.cx) > 48) this.face = pcx < this.cx ? -1 : 1;
    this.passesLeft = this.phase === 3 ? 3 : 1;
    this.setState('rollWind', [0, 36, 30, 24][this.phase]);
  }

  draw(ctx) {
    const s = this.state, t = this.t, f = this.face;
    const cx = Math.round(this.cx), bot = Math.round(this.y + this.h);
    if (s === 'die' && this.timer >= BATTERY_BURST) { this.drawPuddle(ctx, cx, bot, t); this.drawSparks(ctx); return; }
    const jx = (this.flash > 0 || s === 'stuck' || s === 'die') ? ((t >> 2) & 1 ? 1 : -1) : 0;   // (a slow wobble, not a buzz)
    ctx.save();
    ctx.translate(cx + jx, bot - 21);
    if ((s === 'roll' || s === 'rollWind') && !this.gallop) ctx.rotate(this.rollAng);
    else if (s === 'roll' || s === 'rollWind') {
      // the gallop: bounding along in hops, leaning into it, squashed on each landing and stretched in the air;
      // winding up, he crouches back and paws the ground
      const k = Math.abs(Math.sin(this.rollAng)), wind = s === 'rollWind';
      const lift = wind ? 0 : Math.round(k * 7), lean = wind ? -0.12 + Math.sin(t * 0.6) * 0.05 : 0.14 + (k - 0.5) * 0.1;
      const sq = wind ? 0.08 : k < 0.3 ? (0.3 - k) * 0.4 : 0, st = wind ? 0 : Math.max(0, k - 0.6) * 0.15;
      ctx.translate(0, 21 - lift); ctx.scale(f < 0 ? -1 : 1, 1); ctx.rotate(lean); ctx.scale(1 + sq - st * 0.5, 1 - sq + st); ctx.translate(0, -21);
    } else {
      // squashed crouching for a leap or flattened by a landing; stretched tall in the air
      const sq = s === 'leapWind' || s === 'feintWind' ? 0.12 : this.squash > 0 ? this.squash * 0.025 : 0, st = s === 'leap' ? Math.min(0.12, Math.abs(this.vy) * 0.02) : 0;
      const lunge = s === 'feint' ? this.vx * 0.018 : 0, lean = s === 'feint' ? 0.16 : s === 'feintSkid' ? -0.1 : 0;   // stretched out in the lunge, rocked back in the skid
      ctx.translate(0, 21); ctx.scale((f < 0 ? -1 : 1) * (1 + sq - st * 0.6 + lunge), 1 - sq + st - lunge * 0.6); if (lean) ctx.rotate(lean); ctx.translate(0, -21);
    }
    this.drawBody(ctx, s, t);
    ctx.restore();
    this.drawSparks(ctx);
    if (s === 'reel') {   // stars
      for (let i = 0; i < 3; i++) {
        const a = t * 0.15 + i * 2.1, sx = Math.round(cx + Math.cos(a) * 14), sy = Math.round(this.y - 6 + Math.sin(a) * 4);
        const star = (r, c) => fPoly(ctx, Array.from({ length: 10 }, (_, k) => { const a2 = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; return [sx + 0.5 + Math.cos(a2) * rr, sy + 0.5 + Math.sin(a2) * rr]; }), c);
        star(3.2, INK); star(2.2, '#ffd166');   // (fine: hires.js)
      }
    }
    if (this.phase === 3 && s !== 'die' && s !== 'sleep' && t % 40 < 6) {   // phase 3: overcharged, a little crackle now and then
      const rng = mulberry32(t >> 3);
      let x = cx + (rng() - 0.5) * 36, y = this.y + rng() * 20;   // (a fine zig-zag: hires.js)
      for (let i = 0; i < 5; i++) { const nx = x + (rng() - 0.5) * 8, ny = y + 2 + rng() * 3; fLine(ctx, x, y, nx, ny, '#ffc070', 2); x = nx; y = ny; }
    }
  }
  drawPuddle(ctx, cx, bot, t) {   // what's left of him after the battery goes: the mass slumps into a sizzling pool of slime and junk
    const melt = clamp((this.timer - BATTERY_BURST) / 45, 0, 1);
    const pw = Math.round(24 + melt * 34);
    gutEllipse(ctx, cx, bot - 2, pw + 2, 5, '#140a06');
    gutEllipse(ctx, cx, bot - 2, pw, 4, '#3e3412');
    gutEllipse(ctx, cx, bot - 3, Math.round(pw * 0.8), 3, '#5e7018');
    gutEllipse(ctx, cx - 4, bot - 3, Math.round(pw * 0.45), 1, '#9cc030');
    fEll(ctx, cx - pw * 0.4 + 1.5, bot - 3.6, 1.6, 0.4, '#e4ffa0'); fEll(ctx, cx + pw * 0.2 + 1, bot - 3.6, 1, 0.35, '#e4ffa0');   // the shine on it
    if (melt < 1) {   // the body itself, sagging and spreading as it goes
      const flip = this.face > 0 ? 1 : -1, body = cloArt('body' + flip, () => cloBakeBody(flip));
      const sy = 1 - melt * 0.92, sx = 1 + melt * 0.5;
      ctx.save(); ctx.translate(cx, bot); ctx.scale(sx * flip, sy);
      ctx.globalAlpha = 1 - melt * 0.5; ctx.drawImage(body, -CLO_OX, -CLO_OY - 21); ctx.restore();
    }
    ctx.drawImage(cloArt('wreck', cloBakeWreck), cx - 32, bot - 14);   // what didn't melt: his junk, strewn in it
    drawIronAnchor(ctx, cx + 14, bot - 5, 1.9);   // his anchor, toppled in it
    for (let i = 0; i < 6; i++) {   // and it fizzes
      const dx = cx + Math.round(Math.sin(t * 0.3 + i * 1.4) * pw * 0.7), dy = bot - 4 - ((t + i * 5) % 8);
      fBlob(ctx, dx + 0.5, dy + 0.5, 0.5, i & 1 ? '#b8ff4a' : '#7a4820');
    }
  }
  // the junk golem itself, in his own frame (facing +x): the baked mass, then everything that moves (cloacolith-art.js)
  drawBody(ctx, s, t) {
    const rolling = (s === 'roll' || s === 'rollWind') && !this.gallop, flip = rolling || this.face > 0 ? 1 : -1;
    ctx.drawImage(cloArt('body' + flip, () => cloBakeBody(flip)), -CLO_OX, -CLO_OY);
    cloDrawOoze(ctx, t);
    if (this.hasAnchor && (s !== 'roll' || this.gallop)) drawIronAnchor(ctx, -10, s === 'anchorWind' ? -6 : 2, s === 'anchorWind' ? -0.45 : 0.25);
    this.drawBattery(ctx, s, t);
    // the face: always furious, except when his rear's on show (then he panics) or he's seeing stars
    const panic = s === 'stuck' || s === 'die', breath = Math.sin(t * 0.05);
    const look = s === 'sleep' ? 'shut' : s === 'reel' ? 'dizzy' : panic ? 'panic' : s === 'leapWind' || rolling ? 'squint' : 'angry';
    const open = s === 'sleep' ? 1 : s === 'roar' ? 7 + Math.sin(t * 0.5) : s === 'anchorWind' ? 6 : s === 'feint' || s === 'feintSkid' ? 7 + Math.sin(t * 0.7) : s === 'leap' || (s === 'roll' && this.gallop) ? 5
      : panic ? 4 + Math.sin(t * 0.3) : s === 'reel' ? 3 : s === 'leapWind' || rolling ? 2.5 : 4.5 + breath;
    cloDrawEyes(ctx, look, this.phase, t);
    ctx.drawImage(cloArt('brow' + flip + panic, () => cloBakeBrows(flip, panic)), -8, -16);
    cloDrawMouth(ctx, open, panic || s === 'reel' ? -0.6 : 1, t);
  }
  batteryExtension() {
    if ((this.state !== 'roll' && this.state !== 'rollWind') || this.gallop) return 1;
    // The rear points down when -sin(angle) is positive. Tuck before it reaches the floor,
    // then slide back out on the upward half of each turn.
    const u = clamp((-Math.sin(this.rollAng) + 0.15) / 0.85, 0, 1);
    return 1 - 0.8 * u * u * (3 - 2 * u);
  }
  drawBatterySparks(ctx, t) {
    const damage = clamp(this.maxHp - this.hp, 0, this.maxHp);
    if (!damage || this.state === 'sleep') return;
    const period = 54 - damage * 6, life = 9;
    const extension = this.batteryExtension();
    for (let i = 0; i < damage; i++) {
      const age = (t + i * 17) % period;
      if (age >= life) continue;
      const angle = 2.1 + i * 2.4, travel = age * 0.85;
      const x = -14 - 19 * extension + Math.cos(angle) * travel;
      const y = (i % 3 - 1) * 3 + Math.sin(angle) * travel;
      ctx.globalAlpha = 1 - age / life;   // (fine sparks: hires.js)
      fBlob(ctx, x + 0.5, y + 0.5, 0.55, i % 2 ? '#69bbff' : '#a4e4ff');
      if (age < 4) fLine(ctx, x + 0.5, y + 0.5, x + 0.5 + (i % 2 ? 1.4 : -1.4), y - 1, '#4d94f0', 1);
    }
    ctx.globalAlpha = 1;
  }
  batteryPalette() {
    const damage = clamp((this.maxHp - this.hp) / this.maxHp, 0, 1);
    const tint = (from, to) => {
      const a = hexRgb(from), b = hexRgb(to);
      return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * damage).toString(16).padStart(2, '0')).join('');
    };
    return {
      charge: tint('#9ac8ad', '#ff2920'),
      casing: tint('#667367', '#bc3028'),
      highlight: tint('#9aa58a', '#f97560'),
      shadow: tint('#404d43', '#75201c'),
      shine: tint('#c5cbb0', '#ffad88'),
    };
  }
  batteryBulge(){
    const u=this.state==='die'?clamp((this.timer-DEFEAT_TALK)/BATTERY_INFLATE,0,1):0;
    const growth=u*u*(3-2*u),left=-34-growth*10;
    return {growth,left,mid:(left-16)/2,radius:6+growth*17};
  }
  // Rebuild the pressurised metal casing at its actual size. No bitmap or art pixels
  // are enlarged: the socket and terminals stay rigid while the cylinder bows outward.
  drawBulgingBattery(ctx,t,palette){
    const B=this.batteryBulge(),g=B.growth,L=B.left,R=-16,M=B.mid;
    const radius=B.radius*(1+Math.sin(t*.31)*g*.018);
    const shell=()=>{
      ctx.beginPath();ctx.moveTo(R,-5.8);
      ctx.bezierCurveTo(R-5,-6,M+8,-radius,M,-radius);
      ctx.bezierCurveTo(M-7,-radius,L,-radius*.64,L,-5.8);
      ctx.lineTo(L,5.8);ctx.bezierCurveTo(L,radius*.65,M-7,radius,M,radius);
      ctx.bezierCurveTo(M+8,radius,R-5,6,R,5.8);ctx.closePath();
    };
    const metal=ctx.createLinearGradient(0,-radius,0,radius);
    for(const [v,c] of [[0,palette.shadow],[.18,palette.highlight],[.25,'#ffe1c4'],[.32,palette.casing],[.55,palette.charge],[1,palette.shadow]])metal.addColorStop(v,c);
    ctx.save();shell();ctx.fillStyle=metal;ctx.fill();ctx.strokeStyle='#5b2928';ctx.lineWidth=.45;ctx.stroke();
    shell();ctx.clip();
    // The printed sleeve stretches over the bulge; its plus sign remains crisp.
    ctx.beginPath();ctx.moveTo(M-4-g*2,-radius);
    ctx.bezierCurveTo(M-7-g*2,-radius*.4,M-7-g*2,radius*.4,M-4-g*2,radius);
    ctx.lineTo(M+4+g*2,radius);ctx.bezierCurveTo(M+7+g*2,radius*.4,M+7+g*2,-radius*.4,M+4+g*2,-radius);ctx.closePath();
    const label=ctx.createLinearGradient(0,-radius,0,radius);label.addColorStop(0,palette.highlight);label.addColorStop(.3,palette.charge);label.addColorStop(1,palette.shadow);ctx.fillStyle=label;ctx.fill();
    const mark=2+g;ctx.fillStyle='#fff4df';ctx.fillRect(M-mark,-.65,mark*2,1.3);ctx.fillRect(M-.65,-mark,1.3,mark*2);
    // Narrow metallic highlights bend with the casing's strained seams.
    ctx.beginPath();ctx.moveTo(L+3,-4);ctx.bezierCurveTo(M-8,-radius*.82,M-3,-radius*.87,M+1,-radius*.85);ctx.strokeStyle='rgba(255,239,206,.7)';ctx.lineWidth=.5;ctx.stroke();
    if(g>.25){
      for(let i=0;i<3;i++){
        const x=M+5+i*2.3,y=-radius*.65+i*radius*.42;
        ctx.beginPath();ctx.moveTo(x+2,y-2);ctx.lineTo(x,y);ctx.lineTo(x+1.6,y+1.4);ctx.lineTo(x-1,y+3+g*2);
        ctx.strokeStyle='#472424';ctx.lineWidth=.7;ctx.stroke();
        if(g>.65){ctx.strokeStyle='#ffc86d';ctx.lineWidth=.25;ctx.stroke();}
      }
    }
    ctx.restore();
    // Rigid end cap, strained gasket and terminal, all drawn at screen resolution.
    ctx.beginPath();ctx.ellipse(L,0,1.5,6.2,0,0,Math.PI*2);ctx.fillStyle='#bd965b';ctx.fill();ctx.strokeStyle='#684d32';ctx.lineWidth=.5;ctx.stroke();
    ctx.beginPath();ctx.roundRect(L-3.6,-1.7,3.8,3.4,.6);ctx.fillStyle='#ebe2c6';ctx.fill();ctx.strokeStyle='#8d8169';ctx.lineWidth=.4;ctx.stroke();
  }
  // The same embedded battery in every pose, sharing the body's turn, squash and roll.
  drawBattery(ctx, s, t) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const palette = this.batteryPalette(), charge = hexRgb(palette.charge), casing = hexRgb(palette.casing);
    const damage = clamp((this.maxHp - this.hp) / this.maxHp, 0, 1);
    ctx.save();
    ctx.save();
    const extension = this.batteryExtension();
    ctx.translate(-14, 0); ctx.scale(extension, 1); ctx.translate(14, 0);
    if(this.batteryBulge().growth>0)this.drawBulgingBattery(ctx,t,palette);
    else {
    if (damage > 0) {   // the leaking charge glows on the slime around it (a steady glow that slowly breathes)
      ctx.globalAlpha = (0.12 + damage * 0.2) * (0.85 + 0.15 * Math.sin(t * 0.05));
      gutEllipse(ctx, -24, 0, 15, 11, palette.charge);
      ctx.globalAlpha = 1;
    }
    // a metal cylinder lit by how each part of it faces the light above, a sharp specular line near the top (in fine
    // pixels: hires.js)
    const PROF = [[0, 0.42], [0.12, 0.78], [0.21, 1.18], [0.3, 1.0], [0.5, 0.84], [1, 0.26]];
    const cyl = (x, w, rgb, hot) => {
      const g = ctx.createLinearGradient(0, -6, 0, 6);
      for (const [u, k] of PROF) g.addColorStop(u, cloRgb(rgb.map(c => c * k + (k > 1.1 ? hot : 0))));
      ctx.fillStyle = g; ctx.fillRect(x, -6, w, 12);
    };
    cyl(-31, 15, casing, 70); cyl(-28, 9, charge, 60);                        // the casing, and its printed label band
    fRect(ctx, -28, -6, 1 / 3, 12, 'rgba(0,0,0,0.35)'); fRect(ctx, -19.33, -6, 1 / 3, 12, 'rgba(0,0,0,0.35)');
    fRect(ctx, -25, -0.67, 4, 4 / 3, '#f4fff8'); fRect(ctx, -23.67, -2, 4 / 3, 4, '#f4fff8');   // the +
    cyl(-34, 3, [196, 146, 80], 40); fRect(ctx, -34, -6, 1 / 3, 12, 'rgba(0,0,0,0.3)');      // the brass cap...
    const tg = ctx.createLinearGradient(0, -2, 0, 2); tg.addColorStop(0, '#e8e2cc'); tg.addColorStop(0.4, '#fffaf0'); tg.addColorStop(1, '#8a8470');
    fRoundRect(ctx, -37, -2, 3.4, 4, 0.8, '#4a4436'); ctx.fillStyle = tg; ctx.fillRect(-36.67, -1.67, 2.67, 3.33);   // ...and its little terminal
    // cracks in the casing once it's taking a beating, and white-green corrosion crusting the buried end
    if (this.phase >= 2) { fLine(ctx, -21.5, -5, -22, -2, '#2a1a14', 2); fLine(ctx, -22, -2, -22.6, 1, '#2a1a14', 2); fRect(ctx, -23, 1, 2, 2 / 3, palette.charge); }
    const crust = 6 + Math.round(damage * 14);
    for (let i = 0; i < crust; i++) {
      const cx = -19 + cloHash(i, 3, 101) * 4 - cloHash(i, 4, 103) * damage * 6, cy = -6 + cloHash(i, 5, 107) * 12;
      fBlob(ctx, cx + 0.5, cy + 0.5, 0.55 + cloHash(i, 6, 109) * 0.3, i % 3 ? '#d8f0e4' : '#7ac8b0');
    }
    if (damage > 0.3) {   // and it weeps: a bead of electrolyte runs down and drips off
      const ph = (t % 90) / 90, dy = ph * ph * 9;
      fRoundRect(ctx, -21, 5, 0.8, Math.min(dy, 3) + 1, 0.4, '#7ac8b0'); if (dy > 3) fEll(ctx, -20.6, 6.4 + dy, 0.5, 0.7, '#c0fff0');
    }
    }
    ctx.restore();
    // The socket stays attached while the casing slides into it: a puckered ring of raw tissue, folds pulled
    // toward the battery, slime collected in them.
    gutEllipse(ctx, -16, 0, 3, 8, '#3a1220');
    gutEllipse(ctx, -15, 0, 3, 7, '#7a3244');
    for (let y = -6; y <= 6; y += 2) {   // the folds, each one lit along its top edge (fine)
      const w = 3 * Math.sqrt(1 - (y / 7.5) ** 2);
      fEll(ctx, -16.5 + w / 2, y + 1, w / 2 + 0.6, 0.75, '#a24a5a'); fEll(ctx, -16.6 + w, y + 0.6, 0.5, 0.3, '#e89aa0');
    }
    fEll(ctx, -14, -6.5, 1, 0.45, '#c86a78'); fEll(ctx, -14.5, 7.5, 1.5, 0.5, '#9ad030'); fEll(ctx, -13.5, 4, 0.45, 1, '#c8f060');
    this.drawBatterySparks(ctx, t);
    ctx.restore();
  }

}

// ═══════════════════════════════════════════════════════════════════════════
// Part of class Game: the turtle's rumbles, the flush, and the scene out in the sea
// ═══════════════════════════════════════════════════════════════════════════
class GameGutVault {
  // Build the pool from 3-4 itself: every enemy and loose decoration variant used in the level.
  flushLoad() {
    if (this.gut.flushLoad) return this.gut.flushLoad;
    const types = new Set(['bag', 'parasite', 'blob', 'squatter', 'fluke', 'hopper', 'villus', 'tapeworm', 'enzyme', 'inkdrip', 'bacillus', 'debris', 'feces', 'flotsam', 'flipflop', 'cloacolith']);
    const seen = new Set(), pool = [];
    for (const def of this.level.def.entities) {
      if (!types.has(def[0])) continue;
      const variant = def[0] === 'flotsam' ? def[2] : ['debris', 'feces'].includes(def[0]) ? def[3] : '';
      const key = def[0] + ':' + (variant || '');
      if (seen.has(key)) continue;
      seen.add(key); pool.push({ def, key, image: null });
    }
    // The swallowed-junk heap is also 3-4 scenery; reuse its loose contents as well.
    if (this.level.def.entities.some(e => e[0] === 'heap')) for (const kind of HEAP_JUNK) {
      if (!pool.some(e => e.def && e.def[0] === 'debris' && e.def[3] === kind)) pool.push({ kind, key: 'heap:' + kind });
    }
    this.gut.flushLoad = pool;
    return pool;
  }
  gutGateRetraction() {
    const F = this.gut && this.gut.flush;
    if (!F || F.beat > 0) return 0;
    const u = clamp((F.t - (FLUSH_FILL - 75)) / 75, 0, 1);
    return u * u * (3 - 2 * u);
  }

  gutPressureShake() {
    const F = this.gut && this.gut.flush;
    if (!F || F.beat > 0 || F.t < 30) return null;
    const build = clamp((F.t - 30) / (FLUSH_WAVE - 30), 0, 1);
    const release = F.t > FLUSH_WAVE ? 1 - clamp((F.t - FLUSH_WAVE) / 45, 0, 1) : 1;
    const amplitude = (0.15 + 1.85 * build ** 1.4) * release;
    const tick = Math.floor(F.t / 2);
    return { x: Math.round(Math.sin(tick * 2.1) * amplitude),
      y: Math.round(Math.sin(tick * 1.7 + 0.8) * amplitude * 0.75),
      zoom: 1 + amplitude * 2 / VIEW_H, amplitude };
  }

  // the turtle's gut grumbles: a low rumble, grit sifting off the roof, a gurgle of gas up through the floor
  gutRumble(k, silent = false) {
    const G = this.gut, b = this.level.def.boss;
    if (!G || !b) return;
    G.quake = Math.max(G.quake || 0, k);
    if (!silent) {
      Sound.play('rumble');
      if (k > 0.4) Sound.play('flub');
    }
    const L = (b.wall + 1) * TILE, R = b.right * TILE;
    for (let i = 0; i < 2 + Math.round(k * 8); i++) this.particles.push({ kind: 'px', x: rand(L + 8, R - 8), y: TILE + rand(0, 4), vx: rand(-0.2, 0.2), vy: rand(0.6, 1.6), g: 0.1, life: 60, t: 0, color: i & 1 ? '#9c8668' : '#6e441e', size: i % 3 ? 1 : 2 });
    for (let i = 0; i < Math.round(k * 6); i++) this.particles.push({ kind: 'px', x: rand(L + 8, R - 8), y: VAULT_FLOOR * TILE - 1, vx: rand(-0.15, 0.15), vy: rand(-1.2, -0.5), g: -0.01, life: 40, t: 0, color: '#9ab838', size: 2 });
  }
  // (each frame of play in 3-4) the quake settles by itself
  settleQuake() { if (this.gut && this.gut.quake > 0) this.gut.quake = Math.max(0, this.gut.quake - 0.012); }

  // The battery's blown: the turtle's bowel movement. See the timeline at the top of updateGutFlush.
  startGutFlush() {
    const b = this.level.def.boss, p = this.player;
    this.endRoll(p); this.standUp(p); this.dropHeld();
    p.vx = 0; p.vy = 0; p.invuln = 9999; p.pounding = false; p.hidden = true;
    this.dialog = null; this.dialogQ = [];
    this.boss = null;   // Keep the boss track through the entire pressure-and-exit sequence.
    // he's standing wherever he was when it blew (on the floor if he was up a ledge or in the air)
    const fy = VAULT_FLOOR * TILE - p.h;
    this.gut.flush = {
      t: 0, beat: 420, cargo: [], nextCargo: FLUSH_FILL + 8, px: clamp(p.x, (b.wall + 1) * TILE + 4, (b.right - 1) * TILE - p.w - 4), py: p.onGround ? p.y : fy, vy: 0, facing: p.facing,
      wallX: b.wall * TILE, ventX: b.right * TILE, fill: 0, act: 'stand', open: 0, rot: 0, next: FLUSH_QUIET,
    };
  }

  // While he stares and it all goes quiet (up to "WHAT'S THAT NOISE"), the battery's last charge keeps flaring up
  // across the whole colon, here and there, more and more often: the turtle's insides are not happy.
  irritateColon(F) {
    const decor = this.entities.find(e => e instanceof VaultDecor), b = this.level.def.boss;
    const k = F.beat > 0 ? F.beat : 0, every = k > 240 ? 100 : k > 90 ? 75 : 55;
    if (!decor || (k + F.t) % every !== 10) return;
    decor.zap(rand((b.wall + 3) * TILE, (b.right - 2) * TILE), rand(3 * TILE, 11 * TILE), 3, 3);
  }
  // Quiet reaction, a long mounting rumble, rising liquid, then a full-chamber pressure hold.
  // The outlet releases at frame 800 and sweeps Chickaroo out into the sea over 45 frames.
  updateGutFlush(F) {
    const p = this.player, b = this.level.def.boss, G = this.gut;
    this.updateParticles();
    for (const e of this.entities) if (e instanceof CloacaVent || e instanceof Cloacolith || e instanceof VaultDecor || e instanceof FallingFleshDebris || e instanceof VaultMucusSplat) e.update(this);
    this.entities = this.entities.filter(e => !e.remove);
    if (F.beat > 0 || F.t < 30) this.irritateColon(F);
    if (F.beat > 0) {
      F.beat--;
      p.x = F.px; p.y = F.py; p.prevY = p.y;
      return;   // Chickaroo holds his reaction; debris, drips and scene time keep moving.
    }
    F.t++;
    if (F.t === 30) {
      F.facing = -1;   // Watch upstream from the first moment of pressure shake.
      this.speak(CHICK_VOICE, "WHAT'S THAT NOISE....? OH BOY... HOLD YOUR BREATH!", '#ffd166');
      const line = [this.dialog, ...(this.dialogQ || [])].find(d => d && d.speaker === CHICK_VOICE);
      if (line) { line.top = true; line.background = 'rgba(11,9,24,1)'; }
    }
    if (F.t >= FLUSH_QUIET && F.t < FLUSH_WAVE) {
      const pressure = clamp((F.t - FLUSH_QUIET) / (FLUSH_WAVE - FLUSH_QUIET), 0, 1);
      G.quake = 0.3 + pressure * 0.7;
      if (F.t >= F.next) {
        this.gutRumble(0.3 + pressure * 0.7, true);
        F.next = F.t + Math.round(48 - pressure * 28);
        if (pressure > 0.25) this.entities.push(new FallingFleshDebris(rand((b.wall + 2) * TILE, (b.right - 1) * TILE), F.t % 3, true));
      }
      if (F.t === FLUSH_FILL) {
        // The muscle has fully retracted; release its collision before the river enters.
        for (let r = 1; r < VAULT_FLOOR; r++) this.level.set(b.wall, r, T.EMPTY);
      }
      const river = clamp((F.t - FLUSH_FILL) / (FLUSH_RIVER_END - FLUSH_FILL), 0, 1);
      F.fill = F.t < FLUSH_FILL ? 0 : F.t < FLUSH_RIVER_END ? river * 0.1
        : 0.1 + 0.9 * clamp((F.t - FLUSH_RIVER_END) / (FLUSH_FULL - FLUSH_RIVER_END), 0, 1);
      const floor = VAULT_FLOOR * TILE, surface = floor - F.fill * (floor - TILE - 3);
      if (F.act !== 'caught' && F.fill > 0.12 && surface < F.py + p.h - 3) {
        F.act = 'caught'; F.catchT = F.t; F.catchX = F.px; F.catchY = F.py;
        Sound.play('gulp');
      }
      if (F.act === 'caught') {
        const u = clamp((F.t - F.catchT) / 80, 0, 1), ease = u * u * (3 - 2 * u);
        const angle = (F.t - F.catchT) * (0.018 + pressure * 0.013);
        const midX = (F.wallX + F.ventX) / 2;
        const orbitX = midX + Math.cos(angle) * (F.ventX - F.wallX) * 0.32;
        const orbitY = surface + (floor - surface) * (0.5 + Math.sin(angle) * 0.31) - p.h / 2;
        F.px = F.catchX + (orbitX - F.catchX) * ease;
        F.py = F.catchY + (orbitY - F.catchY) * ease;
        F.rot += 0.035 + pressure * 0.06;
      } else F.act = pressure > 0.22 ? 'cower' : 'stand';
    }
    if (F.t >= FLUSH_WAVE) {
      G.quake = 1;
      if (!F.openT) {
        F.openT = F.t; F.releaseX = F.px; F.releaseY = F.py;
        Sound.play('roar'); Sound.play('fart'); Sound.play('splash');
      }
      const release = clamp((F.t - F.openT) / 45, 0, 1);
      F.open = Math.min(1, release * 3);
      F.fill = 1 - release * 0.7;
      F.act = 'caught';
      F.px = F.releaseX + (F.ventX + 8 - F.releaseX) * release * release;
      F.py = F.releaseY + (7.4 * TILE - F.releaseY) * release;
      F.rot += 0.22;
      if (F.t - F.openT >= 45) this.startGutExit();
    }
    const load = this.flushLoad(), limit = Math.ceil(load.length * 0.7);
    if (F.t >= F.nextCargo && F.t < FLUSH_WAVE && F.cargo.length < limit) {
      const i = F.cargo.length;
      let index = Math.floor(i * load.length / limit);
      const worm = load.findIndex(e => e.def && e.def[0] === 'tapeworm');
      if (i === limit - 1 && worm >= 0 && !F.cargo.some(c => c.index === worm)) index = worm;
      F.cargo.push({ born: F.t, entryX: Math.min(F.wallX - 24, this.camX - 96), index, lane: i });
      F.nextCargo = F.t + 12;
    }
    p.x = F.px; p.y = F.py; p.prevY = p.y;
    this.updateCamera(false);
  }

  // which of his sprite sets he's wearing (never the scuba mask: he was swallowed with nothing but his feathers)
  gutChickSet(p) { return p.power === 0 ? SPR.small : p.power === 1 ? SPR.big : (p.suit && p.suit !== 'fire' ? SPR.suit[p.suit] : SPR.fire) || SPR.big; }

  drawChickMucus(ctx, cx, foot, p, amount = 1) {
    if (!p.gutDirty || amount <= 0) return;
    const h = p.power ? 24 : 16;
    ctx.save(); ctx.globalAlpha = amount;
    const x = Math.round(cx), y = Math.round(foot);
    // Splashes on the crest, cheeks, wings and belly leave the wide eyes readable (soft blobs of slime: fine)
    for (const [dx, dy, w, ht, color] of [
      [-3, -h + 1, 5, 2, '#789435'], [-6, -h + 5, 2, 4, '#657e2b'],
      [4, -h + 7, 2, 3, '#93ad43'], [-4, -7, 6, 3, '#657e2b'],
      [-2, -5, 5, 2, '#93ad43'], [3, -8, 3, 3, '#789435'], [-5, -3, 2, 2, '#a8bb56'],
    ]) { fRoundRect(ctx, x + dx, y + dy, w, ht, Math.min(w, ht) / 2, color); fEll(ctx, x + dx + w * 0.35, y + dy + 0.5, w * 0.2, 0.3, '#d8ec90'); }
    ctx.restore();
  }

  // Drawn over the world (under the dialogue box): the gut's noises, Chickaroo, the wave
  drawGutFlush(ctx) {
    const F = this.gut.flush, p = this.player, t = F.t, q = vaultQuake(this);
    ctx.save();
    ctx.translate(-Math.round(this.camX), Math.round(this.lift || 0));
    if (F.fill > 0) this.drawFlushReservoir(ctx, F);
    // Chickaroo remains readable in front of the churning chamber.
    const set = this.gutChickSet(p), cxp = F.px + p.w / 2, foot = F.py + p.h;
    if (F.act === 'caught') {
      const img = set[(t >> 2) & 1 ? 'diveA' : 'diveB'];
      ctx.save(); ctx.translate(Math.round(cxp), Math.round(F.py + p.h / 2)); ctx.rotate(F.rot);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      this.drawChickMucus(ctx, 0, img.height / 2, p); ctx.restore();
    } else {
      const shiver = q > 0.25 && F.act !== 'lookBack' ? ((t >> 1) & 1 ? 1 : 0) * Math.round(q * 2) : 0;
      let img;
      if (F.act === 'run') img = set.shockBack['run' + ((t >> 2) & 3)];
      else if (F.act === 'bang') img = set.shockAhead[(t % 10) < 5 ? 'strain' : 'idle'];
      else if (F.act === 'lookBack') img = set.shock.idle;
      else if (F.act === 'cower') img = set.shockAhead[(t >> 3) & 1 ? 'teeterA' : 'teeterB'];
      else img = t >= 30 && F.beat <= 0 ? set.shockAhead.idle : F.beat > 0 ? set.shock.idle : set[t % 200 < 7 ? 'blink' : 'idle'];
      const sweating = F.act === 'cower' || F.act === 'bang';
      const facing = sweating ? -1 : F.facing;
      drawSprite(ctx, img, cxp + shiver, foot, facing < 0);
      this.drawChickMucus(ctx, cxp + shiver, foot, p);
      if (sweating) this.drawSweat(ctx, cxp - facing * (p.power ? 8 : 7), F.py + (p.power ? 3 : 1));
    }
    ctx.restore();
  }
  // A shallow river first sloshes in from upstream, with a rounded, foaming leading edge.
  drawFlushRiver(ctx, F) {
    const floor = VAULT_FLOOR * TILE, t = F.t;
    const left = Math.min(F.wallX, Math.floor(this.camX) - 24);
    const end = Math.max(F.ventX, Math.ceil(this.camX) + VIEW_W + 24);
    const progress = clamp((t - FLUSH_FILL) / (FLUSH_RIVER_END - FLUSH_FILL), 0, 1);
    const front = left + (end - left) * progress;
    if (front <= left) return;
    const depth = 5 + progress * 13;
    const surface = x => {
      const distance = front - x, tip = clamp(distance / 24, 0, 1);
      const rounded = Math.sqrt(tip * (2 - tip));
      return floor - (depth + Math.sin(x * 0.09 - t * 0.24) * 2 + Math.sin(x * 0.033 - t * 0.12) * 2) * rounded;
    };
    ctx.save();
    ctx.beginPath(); ctx.moveTo(left, floor);
    for (let x = left; x < front; x += 2) ctx.lineTo(x, surface(x));
    ctx.lineTo(front, floor); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = 0.92;   // (smooth, in fine pixels: hires.js)
    const body = ctx.createLinearGradient(0, floor - depth - 4, 0, floor); body.addColorStop(0, '#9a6a34'); body.addColorStop(0.4, '#7a4e22'); body.addColorStop(1, '#5a3814');
    ctx.fillStyle = body; ctx.fillRect(left, floor - depth - 6, front - left, depth + 6);
    ctx.strokeStyle = '#a87a3e'; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.5;   // a few currents swirling along in it
    for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let x = left; x < front; x += 2) { const y = floor - depth * (0.25 + k * 0.22) + Math.sin(x * 0.05 - t * 0.2 + k * 2) * 1.6; x === left ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.globalAlpha = 0.95; ctx.strokeStyle = '#d6b275'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = left; x < front; x += 1 / ART_R) ctx.lineTo(x, surface(x) + 0.5);
    ctx.stroke();
    this.drawFlushCargo(ctx, F);
    ctx.restore();
  }

  clipGutLiquid(ctx) {
    const b = this.level.def.boss;
    const d = this.level.def.entities.find(e => e[0] === 'gullet' && e[1] <= b.wall && e[2] >= b.right);
    if (!d) return;
    const key = this.level.def.id + ':' + d[1];
    let art = GULLET_ART.get(key);
    if (!art) {
      art = new Gullet(d[1], d[2], d[3]).bake(this.level);
      GULLET_ART.set(key, art);
    }
    ctx.beginPath();
    const x0 = d[1] * TILE;
    for (let y = 0; y < art.liquidRows.length; y++) {
      for (const [x, width] of art.liquidRows[y]) ctx.rect(x0 + x, y / (art.liquidScale || 1), width, 1 / (art.liquidScale || 1));
    }
    ctx.clip();
  }

  // The entire chamber fills upward, with circulating currents rather than an advancing wall.
  drawFlushReservoir(ctx, F) {
    ctx.save(); this.clipGutLiquid(ctx);
    if (F.t < FLUSH_RIVER_END) { this.drawFlushRiver(ctx, F); ctx.restore(); return; }
    const floor = VIEW_H, top = VAULT_FLOOR * TILE * (1 - F.fill);
    const left = Math.min(F.wallX + TILE, Math.floor(this.camX) - 8);
    const right = Math.max(F.ventX, Math.ceil(this.camX) + VIEW_W + 8), t = F.t;
    ctx.save();
    ctx.beginPath(); ctx.rect(left, Math.floor(top), right - left, floor - top); ctx.clip();
    ctx.globalAlpha = 0.9;   // (smooth, in fine pixels: hires.js)
    const body = ctx.createLinearGradient(0, top, 0, floor); body.addColorStop(0, '#9a6a34'); body.addColorStop(0.2, '#80522a'); body.addColorStop(0.55, '#6a421c'); body.addColorStop(1, '#45280c');
    ctx.fillStyle = body; ctx.fillRect(left, top, right - left, floor - top);
    ctx.globalAlpha = 0.35; ctx.strokeStyle = '#a87a3e'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';   // slow currents circling the chamber
    const midX = (F.wallX + TILE + F.ventX) / 2, midY = (top + VAULT_FLOOR * TILE) / 2, span = (F.ventX - F.wallX) / 2, hh = (VAULT_FLOOR * TILE - top) / 2;
    if (hh > 4) for (let k = 0; k < 4; k++) { const r = 0.3 + k * 0.17, a0 = -t * (0.012 + k * 0.003) + k * 1.7; ctx.beginPath(); ctx.ellipse(midX, midY, span * r, hh * r, 0, a0, a0 + 1.6); ctx.stroke(); }
    ctx.globalAlpha = 0.9;
    this.drawFlushCargo(ctx, F);
    ctx.restore();
    if (F.fill < 0.99) {
      ctx.globalAlpha = 0.95; ctx.strokeStyle = '#d6b275'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = left; x < right; x += 1 / ART_R) ctx.lineTo(x, top + Math.sin(x * 0.08 + t * 0.13) * 2 + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  flushCargoPose(F, item) {
    const age = Math.max(0, F.t - item.born), floor = VAULT_FLOOR * TILE;
    const depth = F.t < FLUSH_RIVER_END ? 5 + 13 * clamp((F.t - FLUSH_FILL) / (FLUSH_RIVER_END - FLUSH_FILL), 0, 1)
      : F.fill * (floor - TILE - 3);
    const u = clamp((age - 55) / 110, 0, 1), blend = u * u * (3 - 2 * u);
    const width = F.ventX - F.wallX - TILE, midX = (F.wallX + TILE + F.ventX) / 2;
    const angle = Math.PI + (age - 55) * (0.018 + item.lane % 3 * 0.003);
    const radius = 0.16 + item.lane % 5 * 0.065;
    const orbitX = midX + Math.cos(angle) * width * radius;
    const orbitY = floor - depth * 0.5 + Math.sin(angle) * depth * radius;
    const inletX = item.entryX + age * 3;
    return { x: inletX + (orbitX - inletX) * blend,
      y: floor - depth * 0.5 + (orbitY - (floor - depth * 0.5)) * blend,
      rotation: age * 0.07 + item.lane, scale: 0.7 + 0.3 * blend };
  }
  drawFlushCargo(ctx, F) {
    const load = this.flushLoad();
    for (const item of F.cargo || []) {
      const pose = this.flushCargoPose(F, item);
      ctx.save(); ctx.translate(Math.round(pose.x), Math.round(pose.y));
      ctx.rotate(pose.rotation); ctx.scale(pose.scale, pose.scale);
      this.drawFlushItem(ctx, load[item.index], item.lane); ctx.restore();
    }
  }

  drawFlushItem(ctx, entry, i) {
    // The existing junk-heap baker also calls this renderer with its original loose-piece names.
    if (typeof entry === 'string' || entry.kind) {
      const kind = typeof entry === 'string' ? entry : entry.kind;
      if (DEBRIS_ART[kind]) {
        const img = debrisArt(kind);
        ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
      } else if (kind === 'fishbone') {
        const img = fishBoneArt(16, 1);   // (painted fine: gut.js)
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      } else if (kind === 'duck') {
        fEll(ctx, 0, 1.5, 6.4, 4.4, INK); fEll(ctx, 3, -2.5, 3.6, 3.6, INK); fPoly(ctx, [[5, -3.6], [9, -2.6], [5, -0.6]], INK);   // a rubber duck (fine)
        fEll(ctx, 0, 1.5, 5.6, 3.6, '#ffd23a'); fEll(ctx, 3, -2.5, 2.8, 2.8, '#ffd23a'); fEll(ctx, -1.6, 0.4, 2.4, 1.2, '#ffe880');
        fPoly(ctx, [[5.2, -3], [8.2, -2.4], [5.2, -1.2]], '#ff8a2a'); fBlob(ctx, 3.4, -3.4, 0.7, INK);
      } else if (kind === 'boot') {
        fRoundRect(ctx, -5.4, -6.4, 7.8, 12.4, 1.4, INK); fRoundRect(ctx, -5.4, 0.6, 11.8, 5.4, 2.2, INK);   // an old boot (fine)
        fRoundRect(ctx, -4.6, -5.6, 6.2, 10.8, 1, '#5a3a22'); fRoundRect(ctx, -4.6, 1.4, 10.2, 3.8, 1.8, '#5a3a22');
        fRect(ctx, -4.2, -5.2, 1, 9, '#7a5638'); fRect(ctx, -4.6, 4.2, 10.2, 1, '#2a1a10');
      } else if (kind === 'flipflop') {
        fEll(ctx, 0, 0.5, 8.4, 3.4, INK); fEll(ctx, 0, 0.5, 7.4, 2.4, '#ff6888'); fEll(ctx, -1, 0, 5, 1.2, '#ff98b0');   // a flip-flop (fine)
        ctx.strokeStyle = '#fff0f5'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-3, 0.5); ctx.lineTo(0.5, -1.4); ctx.lineTo(3.6, 0.5); ctx.stroke();
      }
      return;
    }
    if (!entry.image) {
      const d = entry.def;
      if (d[0] === 'debris') {
        entry.image = debrisArt(d[3]);
      } else {
        // Render existing entity artwork once, without spawning or updating a live actor.
        const savedBoss = this.boss;
        const e = d[0] === 'tapeworm' ? new Tapeworm(d[1], d[2], d[3])
          : d[0] === 'flotsam' ? new Flotsam(d[1], d[2], d[3])
          : d[0] === 'flipflop' ? new FlipFlop(d[1], d[2]) : this.makeEntity(d);
        this.boss = savedBoss;
        const canvas = document.createElement('canvas');
        const worm = d[0] === 'tapeworm';
        canvas.width = worm ? 160 : 40; canvas.height = worm ? 48 : 40;
        const art = canvas.getContext('2d');
        e.t = 60;
        if (d[0] === 'cloacolith') { e.state = 'die'; e.timer = BATTERY_BURST + 20; }
        const parts = [e, ...(e.extra || [])];
        const w = Math.max(e.w, ...parts.map(p => p.x + p.w - e.x)), h = Math.max(16, e.h);
        art.translate(worm ? 80 : 20, worm ? 24 : 20);
        const scale = worm ? Math.min(1, 152 / w, 40 / h) : Math.min(1, 32 / Math.max(w, h)); art.scale(scale, scale);
        art.translate(-e.x - w / 2, -e.y - h / 2);
        for (const part of parts) part.draw(art, this);
        entry.image = canvas;
      }
    }
    if (entry.def && entry.def[0] === 'tapeworm') {
      const time = this.gut.flush ? this.gut.flush.t : this.gut.exit ? this.gut.exit.t : this.t;
      this.drawFlushTapeworm(ctx, entry.image, time);
    } else ctx.drawImage(entry.image, -Math.round(entry.image.width / 2), -Math.round(entry.image.height / 2));
  }
  drawFlushTapeworm(ctx, image, time) {
    // Traveling bends ripple down the sleeping worm, with a slower second wave and a soft squeeze.
    const width = image.width, height = image.height, squeeze = 0.94 + Math.sin(time * 0.045) * 0.06;
    for (let x = 0; x < width; x += 2) {
      const u = x / width, envelope = 0.6 + Math.sin(u * Math.PI) * 0.4;
      const bend = Math.sin(u * Math.PI * 3 - time * 0.12) * 11 * envelope
        + Math.sin(u * Math.PI * 5 + time * 0.065) * 3;
      const sourceWidth = Math.min(2, width - x);
      ctx.drawImage(image, x, 0, sourceWidth, height,
        Math.round((x - width / 2) * squeeze), Math.round(-height / 2 + bend),
        Math.ceil(sourceWidth * squeeze) + 1, height);
    }
  }

  // ── out into the sea ──────────────────────────────────────────────────────
  // The scene, drawn on its own like the freefall: the turtle's rear end on the left, the cloaca blowing him out
  // in a torrent of muck; the turtle paddles off. Still filthy, Chickaroo opens his eyes,
  // rises slowly from the same spot into the light; white; and he wakes up in bed (the outro in gut-dream.js).
  startGutExit() {
    const p = this.player;
    this.gut.flush = null; this.gut.quake = 0;
    this.arenaCam = null; this.arenaMax = null;
    this.dialog = null; this.dialogQ = [];
    p.hidden = true; p.vx = 0; p.vy = 0; p.gutDirty = true;
    this.bossMusic = false;
    Music.stop(); Sound.play('splash');
    if (!Sound.muted) Sound.sample(['music/3-4rel.mp3'], 0.85);
    this.particles = [];
    const puffs = [];
    for (let i = 0; i < 26; i++) puffs.push({ x: 126 + rand(-6, 6), y: 118 + rand(-6, 6), vx: rand(1.5, 5.5), vy: rand(-1.6, 1.4), r: rand(5, 12), a: rand(0.5, 0.85), c: i % 3 });
    this.gut.exit = { t: 0, x: 130, y: 118, vx: 7, vy: -0.6, rot: 0, turtle: 0, puffs, bubbles: [] };
  }

  updateGutExit(E) {
    E.t++;
    const t = E.t;
    const blastX = VIEW_W * 0.64, blastY = 110;
    if (t < SEA_JET_LEN) {
      const launch = clamp(t / 45, 0, 1), ease = 1 - (1 - launch) ** 3;
      E.x = 130 + (blastX - 130) * ease + Math.sin(t * 1.2) * 1.5 * launch;
      E.y = 118 + (blastY - 118) * ease + Math.sin(t * 0.7) * 1.5 * launch;
      E.rot = Math.sin(t * 0.8) * 0.1;
    } else {
      const rise = clamp((t - SEA_JET_LEN) / SEA_RISE_LEN, 0, 1);
      E.x = blastX;
      E.y = blastY - (blastY + 40) * rise * rise * (3 - 2 * rise);
      E.rot = 0;
      const img = E.fadeImg || SPR.big.shock[(t >> 4) & 1 ? 'fall' : 'jump'];
      const feet = Math.round(E.y) + Math.ceil(Math.min(img.height, 64) / 2);
      if (E.fadeT == null && feet <= 0) { E.fadeT = t; E.fadeImg = img; }

    }
    // the turtle shudders with relief, then paddles away
    if (t > SEA_JET_LEN + 45) E.turtle += Math.min(1.6, (t - SEA_JET_LEN - 45) * 0.02);
    if (t < SEA_JET_LEN && t % 2 === 0) {
      E.puffs.push({ x: 135 + rand(0, 18), y: 118 + rand(-12, 12), vx: rand(3, 6), vy: rand(-1.4, 1.4), r: rand(5, 11), a: 0.65, c: t % 3 });
    }
    // the muck spreads and thins away in the water
    for (const f of E.puffs) { f.x += f.vx; f.y += f.vy; f.vx *= 0.95; f.vy = f.vy * 0.95 - 0.01; f.r += 0.08; f.a -= 0.0035; }
    E.puffs = E.puffs.filter(f => f.a > 0);
    // breath bubbles out of his beak (no mask down here)
    if (t > 60 && (t % 40 === 0 || t % 40 === 6) && t < EXIT_LEN - 100) E.bubbles.push({ x: E.x - 4, y: E.y - 6, r: t % 40 ? 1 : 2, t: 0 });
    for (const b of E.bubbles) { b.t++; b.y -= 0.7; b.x += Math.sin(b.t * 0.2) * 0.3; }
    E.bubbles = E.bubbles.filter(b => b.y > -8);
    this.updateParticles();
    if (E.fadeT != null && t - E.fadeT >= 90) {   // white: on to the bedroom
      this.gut.exit = null;
      this.gut.outro = { t: 64, wakeT: 0, spoke: false, sleepT: 0 };
    }
  }
  drawGutExit(ctx) {
    const E = this.gut.exit, t = E.t, p = this.player, W = VIEW_W, H = VIEW_H;
    drawBackground(ctx, 'ocean', this.level.w * TILE + t * 0.15, this.t);
    // the light from the surface, growing as he rises
    const glow = clamp((t - SEA_JET_LEN) / 260, 0, 1);
    for (let i = 0; i < 6; i++) {
      const bx = 40 + i * 70 + Math.sin(t * 0.01 + i) * 10;
      const shaft = ctx.createLinearGradient(0, 0, 0, H); shaft.addColorStop(0, 'rgba(232,251,255,' + (0.05 + glow * 0.12) + ')'); shaft.addColorStop(1, 'rgba(232,251,255,' + (0.02 + glow * 0.05) + ')');
      ctx.fillStyle = shaft; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 14, 0); ctx.lineTo(bx + H * 0.35 + 14 - H / 40, H); ctx.lineTo(bx + H * 0.35, H); ctx.closePath(); ctx.fill();   // (a smooth shaft of light)
    }
    ctx.globalAlpha = 1;
    // the turtle (behind the muck), paddling off to the left
    const jet = t < SEA_JET_LEN;
    const mouth = this.drawTurtleRear(ctx, 120 - E.turtle * 1.6 + (jet ? Math.sin(t * 1.7) * 1.5 : 0), 112 - E.turtle * 0.25, t, jet ? 0.9 + Math.sin(t * 0.35) * 0.1 : Math.max(0, 1 - (t - SEA_JET_LEN) / 30));
    if (jet) this.drawSeaReliefJet(ctx, t, mouth.x, mouth.y);
    // the muck
    for (const f of E.puffs) {
      ctx.globalAlpha = clamp(f.a, 0, 1);
      gutEllipse(ctx, f.x, f.y, f.r + 2, f.r, ['#3e220c', '#683e1a', '#8a5828'][f.c]);
    }
    ctx.globalAlpha = 1;
    // Squeezed eyes in the blast; wide eyes for the entire rise from the same spot.
    const set = SPR.big, seaChick = { power: 1, gutDirty: true };
    const img = t < SEA_JET_LEN ? set.hotFoot.fall : E.fadeImg || set.shock[(t >> 4) & 1 ? 'fall' : 'jump'];
    ctx.save(); ctx.translate(Math.round(E.x), Math.round(E.y)); ctx.rotate(E.rot); ctx.scale(-1, 1);
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
    this.drawChickMucus(ctx, 0, img.height / 2, seaChick);
    this.drawSeaChickDirt(ctx, img.height / 2, t);
    ctx.restore();
    if (jet) this.drawSeaJetForeground(ctx, E, mouth);
    ctx.strokeStyle = '#d8fbff'; ctx.lineWidth = 0.5;   // (fine rings)
    for (const b of E.bubbles) {
      if (b.r > 1) { ctx.beginPath(); ctx.arc(b.x + 1, b.y + 1, b.r * 0.9 + 0.4, 0, Math.PI * 2); ctx.stroke(); fBlob(ctx, b.x + 0.5, b.y + 0.4, 0.4, '#ffffff'); }
      else fBlob(ctx, b.x + 0.5, b.y + 0.5, 0.6, '#d8fbff');
    }
    // particles (the turtle's sigh) in screen space
    for (const q of this.particles) if (q.kind === 'text') { ctx.globalAlpha = Math.min(1, (q.life - q.t) / 15); drawText(ctx, q.text, Math.round(q.x), Math.round(q.y), q.color, { align: 'center', shadow: '#0a3050' }); }
    ctx.globalAlpha = 1;
    // into the white
    if (E.fadeT != null) {
      const k = clamp((t - E.fadeT + 1) / 90, 0, 1);
      ctx.globalAlpha = k * k; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
  }
  drawSeaChickDirt(ctx, foot, t) {
    // One new brown pixel sticks each second throughout the spray and rise.
    const pixels = [
      [-3,-23], [4,-15], [-4,-6], [1,-3],
      [-2,-23], [4,-14], [-3,-6], [2,-3],
      [-4,-22], [-5,-15], [-2,-6], [3,-4],
      [-3,-22], [-5,-14], [-4,-5], [2,-4],
      [-2,-22], [5,-14], [-3,-5], [1,-4],
      [-1,-22], [5,-13], [-2,-5], [0,-4],
      [-5,-16], [4,-13], [-4,-4], [3,-5],
      [-5,-13], [4,-12], [-3,-4], [2,-5],
      [0,-22], [-5,-12], [-2,-4], [1,-5],
    ];
    const count = Math.min(pixels.length, Math.floor(t / 60));
    for (let i = 0; i < count; i++) {
      fEll(ctx, pixels[i][0] + 0.5, foot + pixels[i][1] + 0.5, 0.75, 0.6, ['#805021', '#583414', '#68401a', '#94642d'][i % 4]);   // (a fleck of muck: fine)
    }
  }

  // Foreground flow hides parts of his body so he sits inside the torrent, between its layers.
  drawSeaJetForeground(ctx, E, mouth) {
    const t = E.t, strength = Math.min(1, (t + 1) / 12, (SEA_JET_LEN - t) / 18);
    const reach = Math.min(VIEW_W - mouth.x + 3, 24 + t * 12);
    ctx.save(); ctx.translate(mouth.x, mouth.y);
    const top = [], bot = [], lip = [];   // (one smooth ribbon: fine)
    for (let d = 0; d <= reach; d += 1) {
      const center = Math.sin(d * 0.025 - t * 0.18) * d * 0.025;
      const pulse = Math.sin(d * 0.07 - t * 0.65) * 4 + Math.sin(d * 0.17 - t * 0.3) * 2;
      const radius = (7 + d * 0.13 + pulse * Math.min(1, d / 28)) * strength;
      const crest = center - radius * (0.22 + Math.sin(d * 0.055 - t * 0.28) * 0.15);
      top.push([d, crest]); bot.push([d, center + radius * 0.8]); lip.push([d, crest + 1]);
    }
    ctx.globalAlpha = 0.68 * strength; fPoly(ctx, [...top, ...bot.reverse()], '#845023');
    ctx.globalAlpha = 0.4 * strength; ctx.strokeStyle = '#b17c3e'; ctx.lineWidth = 2; ctx.beginPath(); lip.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    ctx.restore();
    // Wisps of murk pass over his silhouette without completely concealing his expression.
    ctx.save();
    for (let i = 0; i < E.puffs.length; i += 3) {
      const puff = E.puffs[i];
      if (Math.abs(puff.x - E.x) > 35) continue;
      ctx.globalAlpha = puff.a * 0.28 * strength;
      gutEllipse(ctx, puff.x, puff.y, puff.r, puff.r * 0.8, '#68401a');
    }
    ctx.restore();
  }

  // A sustained, absurdly oversized underwater jet: pulsing ribbons, froth and tumbling leftovers.
  drawSeaReliefJet(ctx, t, mouthX = 121, mouthY = 118) {
    const strength = Math.min(1, (t + 1) / 12, (SEA_JET_LEN - t) / 18);
    const reach = Math.min(VIEW_W - mouthX + 3, 24 + t * 12);
    ctx.save();
    ctx.translate(mouthX, mouthY);
    // A rounded plug overlaps the opening; downstream turbulence grows away from the socket.
    fEll(ctx, 0, 0, 7, Math.max(1, 7 * strength), '#48270e');   // (smooth ribbons: fine)
    fEll(ctx, 1, -1, 6, Math.max(1, 5 * strength), '#845023');
    const sample = [];
    for (let d = 0; d <= reach; d += 1) {
      const pulse = Math.sin(d * 0.07 - t * 0.65) * 4 + Math.sin(d * 0.17 - t * 0.3) * 2;
      const center = Math.sin(d * 0.025 - t * 0.18) * d * 0.025;
      sample.push([d, center, (7 + d * 0.13 + pulse * Math.min(1, d / 28)) * strength]);
    }
    const band = (k0, k1, col, wob) => fPoly(ctx, [...sample.map(([d, c, r]) => [d, c + r * k0 + (wob ? Math.sin(d * 0.2 - t) * 3 : 0)]), ...sample.slice().reverse().map(([d, c, r]) => [d, c + r * k1 + (wob ? Math.sin(d * 0.2 - t) * 3 : 0)])], col);
    ctx.globalAlpha = 0.95; band(-1, 1, '#48270e'); band(-0.72, 0.58, '#845023'); band(-0.6, -0.35, '#b17c3e', true);
    for (let d = 0; d < reach; d += 3) {
      if ((d + t * 9) % 27 >= 6) continue;
      const [, c, r] = sample[Math.min(sample.length - 1, d)];
      fEll(ctx, d + 1.5, c - r + 3, 1.8, 1, '#dfbd78'); fEll(ctx, d + 1.5, c + r * 0.35 + 1, 1.6, 0.9, '#7f9234');
    }
    ctx.globalAlpha = strength * 0.85;
    for (let i = 0; i < 28; i++) {
      const u = ((t * (5 + i % 4) + i * 19) % 290) / 290;
      const x = 12 + u * (VIEW_W - mouthX - 2), spread = 10 + u * 65;
      const y = Math.sin(i * 2.4) * spread + Math.sin(t * 0.3 + i) * 3;
      gutEllipse(ctx, x, y, 2 + i % 4, 1 + i % 3, i % 2 ? '#b17c3e' : '#68401a');
    }
    ctx.globalAlpha = strength;
    const load = this.flushLoad();
    for (let i = 0; i < 6; i++) {
      const u = ((t * 3 + i * 77) % 330) / 330;
      ctx.save(); ctx.translate(Math.round(22 + u * 280), Math.round(Math.sin(i * 2 + t * 0.06) * u * 24));
      ctx.rotate(t * 0.16 + i); ctx.scale(0.65, 0.65);
      this.drawFlushItem(ctx, load[(Math.floor((t * 3 + i * 77) / 330) * 6 + i) % load.length], i);
      ctx.restore();
    }
    ctx.restore();
  }
  // the giant turtle seen from behind and below, swimming left: the back of its shell, a hind flipper, the tail
  // and the cloaca (x, y: the cloaca; `gape` 0..1 still open from the blast)
  drawTurtleRear(ctx, x, y, t, gape) {
    if (x < -260) return;
    x = Math.round(x); y = Math.round(y + Math.sin(t * 0.05) * 2);
    // seen from straight underneath (turtle-art.js): the belly and tail, then the hind flippers paddling over them
    ctx.drawImage(cloArt('trtRear', trtBakeRear), x - TRT_BELLY.ox, y - TRT_BELLY.oy);
    const fl = cloArt('trtFlipper', trtBakeFlipper), sw = Math.sin(t * 0.09);
    TRT_FLIPPERS.forEach((F, i) => {
      ctx.save(); ctx.translate(x + F.x, y + F.y); ctx.rotate(F.ang + (i ? -sw : sw) * 0.22);
      ctx.scale(F.k, F.flip ? -F.k : F.k);
      ctx.drawImage(fl, -12, -34);
      ctx.restore();
    });
    drawTurtleCloaca(ctx, x, y, gape, t);
    return { x, y };
  }


}
mixin(Game, GameGutVault);
