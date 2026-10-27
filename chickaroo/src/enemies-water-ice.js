'use strict';
// ── Ocean world ─────────────────────────────────────────────────────────────
// Fish: swims left at a steady pace; red ones weave up and down. Warm colours and a
// thick outline so they read clearly against the blue water.
class Finlet extends Enemy {
  constructor(col, row, kind) {
    super(col * TILE, row * TILE + 1, 20, 14);
    this.red = kind === 'red'; this.vx = this.red ? -0.85 : -0.6; this.baseY = this.y;
    this.stompable = this.shellKill = this.bumpKill = false; this.stoneKill = true;
  }
  update(g) {
    this.t++;
    this.x += this.vx;
    this.y = this.baseY + (this.red ? Math.sin(this.t * 0.045) * 16 : Math.sin(this.t * 0.08) * 2);
    if (this.x + this.w < g.camX - 64) this.remove = true;
  }
  hitbox() { return { x: this.x + 2, y: this.y + 2, w: this.w - 5, h: this.h - 4 }; }
  // A piranha: a deep, flat-sided body (silver-grey with glinting scales, a fiery belly), a blunt head with a jutting
  // underbite, and jaws that gnaw open and shut in bursts as it swims. Red ones are the black piranha: dark scales,
  // blood-red belly and eye. (Painted fine: finletArt, ocean-fine.js)
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), t = this.t;
    const open = t % 70 < 36 && (t >> 2) % 2 === 0, tail = Math.round(Math.sin(t * 0.3)), sc = (t >> 3) % 2;   // gnawing in bursts, then a rest
    if (this.flipped) { ctx.save(); ctx.translate(0, y * 2 + this.h); ctx.scale(1, -1); }
    ctx.drawImage(finletArt(this.red, open, tail, sc), x - 6, y - 5);
    if (this.flipped) ctx.restore();
  }
}

// Octopus: sinks slowly, arms splayed, then jets up and sideways toward the player in pulses.
class Jellop extends Enemy {
  constructor(col, row) {
    super(col * TILE - 1, row * TILE, 18, 18);
    this.state = 'sink'; this.timer = 50;
    this.stompable = this.shellKill = this.bumpKill = false; this.stoneKill = true;
  }
  hitbox() { return { x: this.x + 2, y: this.y + 1, w: this.w - 4, h: this.h - 5 }; }
  glow(hole) { hole(this.cx, this.y + 8, 30 + Math.sin(this.t * 0.1) * 3, 0.85); }   // a living lantern in the deep
  update(g) {
    this.t++;
    const p = g.player, lv = g.level, pcx = p.x + p.w / 2, top = lv.water ? lv.water.top * TILE : 0;
    if (this.state === 'sink') {
      this.vy = Math.min(this.vy + 0.03, 0.4); this.vx *= 0.9;
      if (--this.timer <= 0) {
        if (Math.abs(pcx - this.cx) < 150) {
          this.state = 'pulse'; this.timer = 36;
          this.vy = p.y + p.h / 2 < this.y + 20 ? -1.9 : -0.9;
          this.vx = Math.sign(pcx - this.cx) * 1.1;
        } else this.timer = 20;
      }
    } else {
      this.vy = Math.min(this.vy + 0.05, 0.4); this.vx *= 0.97;
      if (--this.timer <= 0) { this.state = 'sink'; this.timer = 45; }
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < top) { this.y = top; this.vy = 0; }
    if (lv.solid(Math.floor(this.cx / TILE), Math.floor((this.y + this.h) / TILE))) { this.y = Math.floor((this.y + this.h) / TILE) * TILE - this.h; this.vy = 0; }
    if (this.x + this.w < g.camX - 64) this.remove = true;
  }
  // A realistic little octopus (painted fine: jellopArt, ocean-fine.js): a soft mottled mantle, raised eyes with
  // goat-like slit pupils, and eight tapering arms with pale suckers on their undersides. Drifting, the arms splay
  // like a skirt and curl at the tips; when it jets, the mantle stretches and the arms sweep together into a trail.
  draw(ctx) {
    const t = this.t, cx = Math.round(this.cx), y = Math.round(this.y);
    const jet = this.state === 'pulse' ? Math.min(1, this.timer / 24) : 0;   // 1 right after a pulse starts, easing back to 0 (splayed)
    const ph = Math.floor(((t * 0.12) / (Math.PI * 2) % 1) * 8), blink = ((t % 200 < 6) ? 1 : 0) | (((t + 7) % 200 < 6) ? 2 : 0);
    ctx.globalAlpha = 0.12 + Math.sin(t * 0.1) * 0.05; fBlob(ctx, cx, y + 9, 15, '#ff8a5a'); ctx.globalAlpha = 1;   // a faint glow (it lights up the deep)
    ctx.drawImage(jellopArt(Math.round(jet * 3) / 3, ph, blink), cx - 17, y - 8);
  }
}

// Sea urchin: a spiky hazard that crawls slowly along the sea floor (turning at walls and ledges)
// and now and then bristles, then fires a spine at Chickaroo. Fireballs fizzle on it.
// Sea urchins: they creep slowly along the floor and never attack -- but their spines hurt to touch,
// and they can't be stomped. Several kinds, for a varied reef floor (variant picked from the
// column unless given): 'purple' (the classic), 'red' (short, dense), 'black' (very long, thin
// spines: give it room) and 'green' (a small round pincushion).
const URCHIN_KINDS = {
  purple: { n: 30, len: 13, r: 7, spine: ['#2a1640', '#5a3488', '#b58ae0'], back: ['#1c0f2a', '#3e2560'], test: ['#5a3488', '#3e2560', '#24123a'], dots: '#8a64b8' },
  red:    { n: 40, len: 9, r: 7, spine: ['#5a1020', '#c8302a', '#ffb08a'], back: ['#3a0a14', '#8a1e22'], test: ['#c8402a', '#8a2020', '#5a1018'], dots: '#ff9a7a' },
  black:  { n: 22, len: 20, r: 6, spine: ['#120a1a', '#2a2238', '#8a86a8'], back: ['#0a0610', '#1e1828'], test: ['#3a3248', '#262036', '#141020'], dots: '#6a6488' },
  green:  { n: 34, len: 7, r: 6, spine: ['#1e4a2a', '#4aa05a', '#ff9ad0'], back: ['#123020', '#2e7040'], test: ['#5ab06a', '#3a8048', '#205030'], dots: '#c8f0b0' },
};
class Urchin extends Enemy {
  constructor(col, row, kind) {
    super(col * TILE, (row + 1) * TILE - 16, 16, 16);
    this.kind = URCHIN_KINDS[kind] ? kind : ['purple', 'red', 'black', 'green'][(col * 7 + row) % 4];
    // invincible: nothing at all hurts an urchin (or a crab) -- they're only ever dodged
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = this.beamKill = this.stoneKill = false;
    this.noFreeze = true;
    this.walker = true; this.dir = (col % 2) ? -1 : 1;
  }
  update(g) {
    this.t++;
    this.vx = this.dir * (this.kind === 'black' ? 0.14 : 0.22); this.walk(g, true);
    if (this.vx) this.dir = Math.sign(this.vx);
  }
  hitbox() {
    const k = URCHIN_KINDS[this.kind], reach = Math.max(0, Math.round((k.len - 13) * 0.6));   // long spines reach farther
    return { x: this.x + 2 - reach, y: this.y + 2 - reach, w: this.w - 4 + reach * 2, h: this.h - 2 + reach };
  }
  // A realistic sea urchin (painted fine: urchinArt, ocean-fine.js): a low test bristling with spines of uneven length
  // (dark at the root, fading to pale tips) that sway gently in the swell.
  draw(ctx) {
    const sw = Math.floor(((this.t * 0.04) / (Math.PI * 2) % 1) * URCHIN_SWAY);
    ctx.drawImage(urchinArt(this.kind, sw), Math.round(this.cx) - 28, Math.round(this.y + 10) - 26);
  }
}

// Reef crab: scuttles sideways along the sea floor with both claws held high and snapping -- the
// raised pincers say it plainly: no stomping this one. It never attacks; it just hurts to touch.
const CRAB_COLS = {
  red:    { dark: '#681414', base: '#b82820', mid: '#e04832', lite: '#ff8260', belly: '#f0b898', tip: '#2a0808', tooth: '#fff0d8' },
  orange: { dark: '#6a2e0e', base: '#b85218', mid: '#e87a24', lite: '#ffb454', belly: '#f4cc98', tip: '#2e1206', tooth: '#fff4dc' },
  blue:   { dark: '#142e58', base: '#245898', mid: '#3a84cc', lite: '#7cc2ff', belly: '#bcdcf4', tip: '#0c1830', tooth: '#eef8ff' },
};
const CRAB_RANGE = 2.5 * TILE;
class Crab extends Enemy {
  constructor(col, row, color) {
    super(col * TILE + 1, (row + 1) * TILE - 12, 16, 12);
    this.col = CRAB_COLS[color] ? color : ['red', 'orange', 'blue'][col % 3];
    // those claws make it no good to stomp (it hurts; a spin just bounces off it), but anything else
    // bowls it over: a roll, fire, a kicked shell or stone, a bump from below, a hammer, a beam
    this.stompable = false;
    this.rollKill = this.fireKill = this.shellKill = this.bumpKill = this.beamKill = this.stoneKill = true;
    this.noFreeze = true;
    this.walker = true; this.dir = (col % 2) ? 1 : -1; this.pause = 0; this.home = this.x;
  }
  update(g) {
    this.t++;
    if (this.pause > 0) { this.pause--; this.vx = 0; this.walk(g, true); return; }
    if (Math.abs(this.x - this.home) > CRAB_RANGE) this.dir = this.x > this.home ? -1 : 1;   // keeps to its own patch of floor
    this.vx = this.dir * 0.45; this.walk(g, true);
    if (this.vx) this.dir = Math.sign(this.vx);
    if (this.t % 150 === 0) { this.pause = 40; if (Math.random() < 0.5) this.dir = -this.dir; }   // stop for a snap, maybe turn
  }
  // the raised claws count too: touching them from above hurts like the rest of it
  hitbox() { return { x: this.x - 3, y: this.y - 8, w: this.w + 6, h: this.h + 8 }; }
  // A realistic reef crab (painted fine: crabArt, ocean-fine.js): a wide, fan-shaped carapace with a serrated rim and
  // grooves, four pairs of jointed walking legs scuttling in a wave, stalked eyes, and two heavy claws held high in a
  // threat display, snapping.
  draw(ctx) {
    const t = this.t, cx = Math.round(this.cx), by = Math.round(this.y + this.h), walking = this.pause === 0;
    const snap = this.pause > 0 ? (t >> 2) % 2 : (t >> 4) % 2, look = this.pause > 0 ? 0 : this.dir;
    if (this.flipped) { ctx.save(); ctx.translate(0, by * 2 - this.h); ctx.scale(1, -1); }
    ctx.drawImage(crabArt(this.col, walking ? (t >> 2) % 4 : -1, snap, look), cx - 20, by - 24);
    if (this.flipped) ctx.restore();
  }
}

// A loose stone on the sea floor: carried and thrown exactly like a curled-up pill bug (hold run to
// pick it up, let go to throw, up to toss it, down to set it down) -- but it never wakes up, never
// hurts Chickaroo, and underwater a throw flies almost straight, slowing in the water, until it hits
// something or sinks back to the floor to be picked up again. It knocks out sea critters (stoneKill).
const STONE_DRAG = 0.988, STONE_SINK = 0.012, STONE_STOP = 0.8;
class Stone extends Shellback {
  constructor(col, row) {
    super(col, row);
    this.state = 'shell'; this.vx = 0; this.stone = true;
    this.stompable = false; this.fireKill = this.bumpKill = this.shellKill = false;
  }
  update(g) {
    this.t++;
    this.shellT = 0;   // a stone never wakes up
    if (this.grace > 0) this.grace--;
    const p = g.player;
    // the tip shows once per visit to the stage (not again after a death)
    if (!g.stoneTold && this.state === 'shell' && p.state === 'play' && Math.abs(p.x - this.x) < 90) {
      g.stoneTold = true; g.say('STONE', 'HOLD RUN TO GRAB IT - LET GO TO THROW', '#cdefff');
    }
    if (this.state === 'held') { this.updateHeld(g); return; }
    if (this.state === 'slide' && g.wet(this.cx)) {   // underwater: a straight, slowing flight
      const lv = g.level;
      this.vx *= STONE_DRAG; this.vy = Math.min(this.vy + STONE_SINK, 1);
      if (this.t % 4 === 0) g.spark(this.cx - Math.sign(this.vx) * 6, this.y + 7, '#cdefff', 14, 0, -0.3);
      if (sweepX(lv, this, this.vx)) {
        const c = Math.floor((this.vx > 0 ? this.x + this.w + 1 : this.x - 1) / TILE);
        for (let r = Math.floor(this.y / TILE); r <= Math.floor((this.y + this.h - 1) / TILE); r++) {
          if (!g.smashCrate(c, r) && (lv.get(c, r) === T.QCOIN || lv.get(c, r) === T.QPOW)) g.hitBlock(c, r);
        }
        this.settle(g);
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('bump');
      } else if (sweepY(lv, this, this.vy)) this.vy = 0;
      if (Math.abs(this.vx) < STONE_STOP) this.settle(g);
      return;
    }
    super.update(g);
    if (g.wet(this.cx) && this.vy > 1.4) this.vy = 1.4;   // sinks gently in the water
  }
  settle(g) {   // the throw's spent: it sinks back down to rest
    this.state = 'shell'; this.walker = true; this.vx = 0; this.vy = 0;
    g.burst(this.cx, this.y + 7, ['#cdefff', '#ffffff'], 4);
  }
  shatter(g) {   // breaks apart after knocking out a sea critter
    this.dead = this.remove = true;
    if (g.held === this) g.held = null;
    const x = this.x, y = this.y;
    [[-1.4, -3.5, 0, 0], [1.4, -3.5, 8, 0], [-1.1, -2.0, 0, 6], [1.1, -2.0, 8, 6]].forEach(([vx, vy, ox, oy]) => {
      g.particles.push({ kind: 'frag', x: x + ox, y: y + oy, vx, vy, g: 0.22, life: 55, t: 0, stone: true });
    });
    g.burst(this.cx, this.y + 6, ['#8a92a8', '#b8c0d4', '#cdefff'], 6);
    Sound.play('break');
  }
  touches(p) { return this.state === 'shell' && overlap(this, p); }
  onTouch(g, p) {
    if (this.grace > 0) return;
    if (Input.down('run') && !g.held) g.pickUp(this);
    else if (!g.wet(this.cx)) this.kick(g, p);
  }
  draw(ctx) { ctx.drawImage(stoneArt(), Math.round(this.x) - 1, Math.round(this.y + this.h) - 13); }   // a smooth sea pebble (painted fine: ocean-fine.js)
}

// Pufferfish: hovers as a small round fish; when Chickaroo approaches (or on its cycle), it gives
// a frantic shivering tell with a gulp, inflates into a giant spiky super-sphere, and after a short
// critical pulse blows up in a murky brown damage cloud while firing 8 spikes in a circle (Donkey Kong style).
const PUFF_TELL = 42, PUFF_INFLATE = 28, PUFF_HOLD = 45, PUFF_CLOUD = 140, PUFF_COOL = 90, PUFF_REFORM_OVERLAP = 45;
class PufferSpike extends Enemy {
  constructor(x, y, ang) {
    super(x - 3, y - 3, 6, 6);
    this.ang = ang;
    this.vx = Math.cos(ang) * 2.1;
    this.vy = Math.sin(ang) * 2.1;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.noFreeze = true;
  }
  hitbox() { return { x: this.x + 1, y: this.y + 1, w: 4, h: 4 }; }
  update(g) {
    this.t++;
    this.x += this.vx;
    this.y += this.vy;
    if (this.t % 4 === 0) g.spark(this.cx, this.y + 3, '#cdefff', 10, 0, 0);
    const lv = g.level, c = Math.floor(this.cx / TILE), r = Math.floor((this.y + 3) / TILE);
    if (lv.solid(c, r) || this.t > 95 || this.x < g.camX - 48 || this.x > g.camX + VIEW_W + 48 || this.y < -16 || this.y > VIEW_H + 16) {
      if (lv.solid(c, r)) g.burst(this.cx, this.y + 3, ['#8a5a28', '#fff8e0'], 3);
      this.remove = true;
    }
  }
  draw(ctx) { ctx.drawImage(pufferSpikeArt(this.ang), Math.round(this.cx) - 7, Math.round(this.y + 3) - 7); }   // (painted fine: ocean-fine.js)
}

class Pufferfish extends Enemy {
  constructor(col, row) {
    super(col * TILE, row * TILE, 16, 16);
    this.x0 = this.x; this.y0 = this.y;
    this.state = 'small'; this.timer = 0; this.rad = 6;
    this.stompable = this.shellKill = this.bumpKill = false;
    this.stoneKill = this.beamKill = true;
  }
  hitbox() {
    if (this.state === 'cloud' || this.state === 'wait') return null;
    const r = Math.round(this.rad);
    return { x: this.cx - r, y: this.cy - r, w: r * 2, h: r * 2 };
  }
  get cy() { return this.y + this.h / 2; }
  touches(p) {
    // The brown burst smoke is visual only (harmless); damage threat comes strictly from spikes and body contact
    if (this.state === 'wait' || this.state === 'cloud') return false;
    const hb = this.hitbox();
    return hb ? overlap(hb, p) : false;
  }
  cloudR() { return Math.min(34, 14 + this.timer * 0.9); }
  reformProgress() {
    const frames=this.state==='cloud'?this.timer-(PUFF_CLOUD-PUFF_REFORM_OVERLAP):PUFF_REFORM_OVERLAP+PUFF_COOL-this.timer;
    return clamp(frames/(PUFF_REFORM_OVERLAP+PUFF_COOL),0,1);
  }
  update(g) {
    this.t++;
    const p = g.player, onScreen = this.x + 40 > g.camX && this.x - 40 < g.camX + VIEW_W;
    if (this.state === 'small') {
      this.rad = 6;
      this.x = this.x0 + Math.sin(this.t * 0.04) * 6;
      this.y = this.y0 + Math.sin(this.t * 0.07) * 3;
      const dist = Math.hypot((p.x + p.w / 2) - this.cx, (p.y + p.h / 2) - this.cy);
      if (this.timer > 0) this.timer--;
      else if (p.state === 'play' && dist < 88) {
        this.state = 'tell'; this.timer = 0;
        if (onScreen) { Sound.play('spike'); g.popup(this.cx, this.y - 6, '!', '#ffd166'); }
      }
    } else if (this.state === 'tell') {
      this.timer++;
      this.rad = 6 + (this.timer % 4 < 2 ? 1.5 : 0);
      if (this.timer % 6 === 0 && onScreen) g.spark(this.cx + rand(-6, 6), this.cy + rand(-4, 4), '#cdefff', 12, 0, -0.4);
      if (this.timer >= PUFF_TELL) {
        this.state = 'inflate'; this.timer = 0;
        if (onScreen) Sound.play('pop');
      }
    } else if (this.state === 'inflate') {
      this.timer++;
      const u = this.timer / PUFF_INFLATE;
      this.rad = 7 + (19 - 7) * (1 - Math.pow(1 - u, 3));   // swells rapidly to super-sphere (r = 19)
      if (this.timer >= PUFF_INFLATE) { this.state = 'sphere'; this.timer = 0; }
    } else if (this.state === 'sphere') {
      this.timer++;
      this.rad = 19 + Math.sin(this.timer * 0.6) * 1.5;
      if (this.timer > PUFF_HOLD - 20 && this.timer % 5 === 0 && onScreen) Sound.play('tick');
      if (this.timer >= PUFF_HOLD) {
        this.state = 'cloud'; this.timer = 0;
        this.stoneKill = this.beamKill = false;
        // Shoot 8 spikes outward in a circle (45° apart)
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          g.entities.push(new PufferSpike(this.cx + Math.cos(ang) * 14, this.cy + Math.sin(ang) * 14, ang));
        }
        if (onScreen) {
          g.burst(this.cx, this.cy, ['#8a5428', '#5c3414', '#b87c44', '#d8a868'], 22);
          g.shake = Math.max(g.shake, 4);
          Sound.play('blast'); Sound.play('spike');
        }
      }
    } else if (this.state === 'cloud') {
      this.timer++;
      if (this.timer % 5 === 0 && this.timer < PUFF_CLOUD - 30 && onScreen) {
        g.spark(this.cx + rand(-24, 24), this.cy + rand(-20, 20), '#8a5428', 26, rand(-0.25, 0.25), rand(-0.4, 0.1));
      }
      if (this.timer >= PUFF_CLOUD) {
        this.state = 'wait'; this.timer = PUFF_COOL;
      }
    } else if (this.state === 'wait') {
      const gather=1-this.timer/PUFF_COOL,k=0.08+0.92*gather*gather;
      this.x+=(this.x0+Math.sin(this.t*0.04)*6-this.x)*k;
      this.y+=(this.y0+Math.sin(this.t*0.07)*3-this.y)*k;
      if (--this.timer <= 0) {
        this.state = 'small'; this.timer = 30; this.rad = 6;
        this.stoneKill = this.beamKill = true;
        if (onScreen) g.burst(this.cx, this.cy, ['#cdefff', '#ffffff'], 5);
      }
    }
  }
  draw(ctx) {
    if(this.state==='wait'){drawPufferReform(ctx,this.cx,this.cy,this.reformProgress(),this.t);return;}
    const cx = Math.round(this.cx), cy = Math.round(this.cy), t = this.t;
    if (this.state === 'cloud') {
      const c = this.timer, r = this.cloudR(), fade = Math.max(0.12, 1 - c / PUFF_CLOUD);
      for (let i = 0; i < 9; i++) {
        const a = i * 0.72 + c * 0.018 * (i % 2 ? 1 : -1), d = r * (i === 0 ? 0 : (i % 2 ? 0.58 : 0.38));
        const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.85 - c * 0.02;
        const pr = r * (i === 0 ? 0.72 : 0.48) + Math.sin(c * 0.12 + i) * 1.5;
        ctx.globalAlpha = 0.42 * fade; blob(ctx, px, py, pr, '#4a2810');
        ctx.globalAlpha = 0.36 * fade; blob(ctx, px - 1, py - 1, pr * 0.75, '#7a461e');
        ctx.globalAlpha = 0.28 * fade; blob(ctx, px - 2, py - 2, pr * 0.45, '#b87a3d');
      }
      ctx.globalAlpha = 1;
      if(c>=PUFF_CLOUD-PUFF_REFORM_OVERLAP)drawPufferReform(ctx,this.cx,this.cy,this.reformProgress(),t);
      return;
    }
    const shakeX = this.state === 'tell' ? ((this.timer >> 1) % 2 ? 1 : -1) : (this.state === 'sphere' && this.timer > PUFF_HOLD - 18 ? (this.timer % 2 ? 1 : -1) : 0);
    const r = Math.round(this.rad), flash = (this.state === 'tell' && (this.timer >> 2) % 2) || (this.state === 'sphere' && this.timer > PUFF_HOLD - 20 && (this.timer >> 1) % 2);
    const img = pufferArt(r, flash ? 1 : 0, (t >> 3) % 4, this.state === 'tell'), half = r + 7;   // (painted fine: ocean-fine.js)
    if (this.flipped) { ctx.save(); ctx.translate(0, cy * 2); ctx.scale(1, -1); }
    ctx.drawImage(img, cx + shakeX - half, cy - half);
    if (this.flipped) ctx.restore();
  }
}

// ── Snow world ────────────────────────────────────────────────────────────────
// Penguin: waddles about; when you're level with it and in front, it flops onto its belly and
// slides at you (much farther on ice). Stompable either way.
const SLIDEGUIN_TELL = 30;   // frames of wind-up before a belly slide
class Slideguin extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 16, 14, 16);
    this.vx = -0.4; this.walker = true; this.state = 'walk'; this.cool = 60;
  }
  update(g) {
    this.t++;
    const p = g.player, lv = g.level;
    if (this.state === 'walk') {
      this.walk(g, true);
      if (this.cool > 0) this.cool--;
      const dx = p.x + p.w / 2 - this.cx, dy = Math.abs(p.y + p.h - (this.y + this.h));
      if (!this.cool && this.onGround && dy < 20 && Math.abs(dx) < 130 && Math.sign(dx) === Math.sign(this.vx || -1)) {
        // the tell: it stops, crouches and flaps for half a second before it launches
        this.state = 'windup'; this.timer = SLIDEGUIN_TELL; this.vx = Math.sign(dx) * 0.001;
        if (this.x > g.camX && this.x < g.camX + VIEW_W) Sound.play('blink');
      }
      return;
    }
    if (this.state === 'windup') {
      this.walk(g, false);
      if (--this.timer > 0) return;
      this.state = 'slide'; this.vx = Math.sign(this.vx) * 2.6;
      this.y += 6; this.h = 10;                                  // belly down
      if (this.x > g.camX && this.x < g.camX + VIEW_W) Sound.play('slide');
      return;
    }
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx * 0.8;
    const r = sweepY(lv, this, this.vy);
    if (r === 1) { this.vy = 0; this.onGround = true; } else { this.onGround = false; if (r === -1) this.vy = 0; }
    const ice = lv.get(Math.floor(this.cx / TILE), Math.floor((this.y + this.h + 1) / TILE)) === T.ICE;
    if (this.onGround) this.vx *= ice ? 0.998 : 0.982;
    if (this.onGround && this.t % 3 === 0) g.spark(this.cx - Math.sign(this.vx) * 6, this.y + this.h, '#e6f6ff', 12, -this.vx * 0.2, -0.4);
    if (Math.abs(this.vx) < 0.5 && this.onGround) {
      this.state = 'walk'; this.y -= 6; this.h = 16; this.vx = Math.sign(this.vx || -1) * 0.4; this.cool = 90;
    }
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 160) this.remove = true;
  }
  draw(ctx) {
    const f = this.vx < 0 ? -1 : 1, by = Math.round(this.y + this.h), wind = this.state === 'windup';
    const step = wind ? (this.t >> 1) % 2 : (this.t >> 3) % 2;
    const x = Math.round(this.cx) - (wind ? f * (1 + step) : 0);
    drawSprite(ctx, penguinArt('enemy', this.state === 'slide' ? 'slide' : 'walk', step), x, by, f < 0, 0.85, 0.85, this.flipped);
    if (wind) { fRoundRect(ctx, x - 0.7, by - 24, 1.4, 4.7, 0.4, '#ffe299'); fBlob(ctx, x, by - 17.7, 0.7, '#ffe299'); }
  }
}

// Icicle: hangs under an overhang. When you pass underneath it shakes, then drops and shatters.
// Hurts on contact; a fireball melts it.
class Icicle extends Enemy {
  constructor(col, row) {
    super(col * TILE + 4, row * TILE, 8, 14);
    this.state = 'hang'; this.timer = 0;
    this.stompable = this.shellKill = this.bumpKill = false; this.walker = false;
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'hang') {
      if (p.state === 'play' && Math.abs(p.x + p.w / 2 - this.cx) < 30 && p.y > this.y) { this.state = 'shake'; this.timer = 28; Sound.play('crack'); }
      return;
    }
    if (this.state === 'shake') { if (--this.timer <= 0) this.state = 'fall'; return; }
    this.vy = Math.min(this.vy + 0.35, 6); this.y += this.vy;
    const lv = g.level, c = Math.floor(this.cx / TILE), r = Math.floor((this.y + this.h) / TILE);
    if (lv.solid(c, r) || lv.get(c, r) === T.SEMI) {
      for (let i = 0; i < 10; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-3, 3), y: r * TILE - 2, vx: rand(-1.6, 1.6), vy: rand(-2.4, -0.6), g: 0.2, life: 30, t: 0, color: i % 2 ? '#ffffff' : '#9fdcff', size: 2 });
      if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('shatter');
      this.remove = true;
    } else if (this.y > VIEW_H) this.remove = true;
  }
  draw(ctx) {
    const shake = this.state === 'shake' ? Math.sin(this.t * 1.4) * 0.65 : 0;
    const oy = (this.state === 'hang' || this.state === 'shake') ? -1 : 0;
    ctx.drawImage(icicleArt(this.h), fSnap(this.cx - 6 + shake), fSnap(this.y + oy));
    if (this.state === 'shake') { ctx.globalAlpha = 0.3; fLine(ctx, this.cx - 2, this.y + 3, this.cx - 0.7, this.y + 7, '#ffffff', 1); ctx.globalAlpha = 1; }
  }
}


// Winter creatures above are painted directly at the fine resolution.
