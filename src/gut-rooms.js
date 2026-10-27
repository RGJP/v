'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-4 GUT FEELING: what each room of the turtle does to you, top to bottom
// ═══════════════════════════════════════════════════════════════════════════
// Every room is painted (a Gullet painter over its columns, in that part's own tissue); these draw themselves to match.
//
// THE STOMACH: a lake of acid with swallowed junk floating on it (Flotsam, gut.js), geysers that blast the junk
// away, and a drain at the bottom plugged by a swallowed flip-flop.
//   ['acid', x0, x1, row, kind = 'acid']  a pool over columns x0-x1, its surface at row's top, down to the bottom of the
//                                         screen: falling in is the end of him. kind 'sludge' is the colon's brown muck
//   ['geyser', x, row, offset = 0]        an acid spout at column x (fractional is fine) in a pool whose surface is `row`:
//                                         bubbles, then erupts (it hurts, and blasts any junk floating over it away)
//   ['flipflop', x, row]                  a rubber flip-flop jammed in the drain (its left edge at column x, floating on
//                                         row's surface). It's springy: each landing bounces Chickaroo off it and jams it
//                                         deeper; the third pops it out, the acid swirls down the drain, and that's the
//                                         way on (the pool lets him through where the drain is open)
// THE PYLORIC MILL: the stomach's muscular exit, grinding everything that comes through.
//   ['pylorus', x0, x1, [[row, offset, valve], ...], period]  a shaft over columns x0-x1 crossed by rings of muscle: each
//                                         one squeezes shut from both sides (solid while shut: stand on it), holds, and
//                                         opens again, on a cycle of `period` frames starting at its offset. Squeezed one
//                                         after another, top to bottom, they pass whatever's on them down the shaft. Caught
//                                         in one as it closes and he's squashed out on top (a hit). `valve` draws one as the
//                                         pyloric valve itself, puckered lips
//   ['hopper', col, row, dir, every = 150] a pocket in the wall at (col, row) that lets out a gastrolith (a jagged swallowed
//                                         stone) every so often, rolling `dir`. Stones hurt, can't be stomped (you bounce
//                                         off), smash against walls, and get ground to gravel in the mill
// THE SMALL INTESTINE: slimy chutes.
//   ['slide', x0, y0, x1, y1]             a chute of slime from (x0, y0) to (x1, y1) (tile units, fractional fine): its
//                                         surface is frictionless, so standing on it he slides away downhill, faster and
//                                         faster (he can still jump off it). Painted as a slab of tissue
//   ['enzyme', col, row, vx, vy]          an enzyme bubble: a purple globule bouncing about. Touch it and it bursts all
//                                         over him: sticky for a few seconds (slower, lower jumps, slow on the chutes)
//   ['inkdrip', col, row]                 an ink drip: a purple bead on the roof (row = the first free row under it) that falls when he
//                                         passes under (or now and then), splatting over him like an enzyme bubble: sticky, never hurt
// THE FERMENTATION CHAMBER: the hindgut, where plants are brewed down into gas.
//   ['vent', x, row, top, on = 110, off = 90, offset = 0]  a methane vent at column x on row's surface: every so often
//                                         a jet of gas roars up it to `top` (a row), lifting anyone in it
//   ['stink', x0, y0, x1, y1]             a pocket of stale gas (tile units): linger in it and it gets to him (a hit)

const POOL = {
  acid: { body: '#4aa824', deep: '#1e5a10', top: '#c8ff6a', foam: '#f0ffc0', bub: '#e8ff9a' },
  bile: { body: '#9a8a1c', deep: '#4a4208', top: '#f0e060', foam: '#fff8b0', bub: '#f4e888' },
  sludge: { body: '#5e4e20', deep: '#2e2410', top: '#a8983e', foam: '#d0c068', bub: '#b8c86a' },
};
class AcidLake extends Enemy {
  constructor(x0, x1, row, kind = 'acid') {
    super(x0 * TILE, row * TILE, (x1 - x0 + 1) * TILE, VIEW_H - row * TILE);
    this.surf = row * TILE; this.kind = kind; this.drains = [];
    this.passive = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  inDrain(x) { return this.drains.some(d => x > d.a && x < d.b); }
  update(g) {
    this.t++;
    for (const d of this.drains) d.t++;
    const p = g.player, cx = p.x + p.w / 2;
    if (p.state === 'play' && cx > this.x && cx < this.x + this.w && p.y + p.h > this.surf + 5 && !this.inDrain(cx)) g.killPlayer('acid');
  }
  draw(ctx, g) {   // clip to the same fine contour that paints the flesh banks
    const C = POOL[this.kind], x0 = this.x, w = this.w, t = this.t, top = this.surf;
    const surf = x => {
      const edge=clamp(Math.min(x-x0,x0+w-x)/12,0,1),ease=edge*edge*(3-2*edge);
      return top+(Math.sin(x*.12+t*.06)*1.2+Math.sin(x*.05-t*.03))*ease;
    };
    ctx.save();
    const room=g&&g.level.rooms.find(r=>x0>=(r.a*TILE)&&x0<(r.b+1)*TILE);
    const art=room&&GULLET_ART.get(g.level.def.id+':'+room.a);
    if(art){
      const scale=art.liquidScale||1,world=room.a*TILE;
      ctx.beginPath();
      for(let y=Math.max(0,Math.floor((top-4)*scale));y<art.liquidRows.length;y++)for(const [x,width] of art.liquidRows[y]){
        const pad=y/scale>top+1?6:0,left=Math.max(x0-pad,world+x),right=Math.min(x0+w+pad,world+x+width);
        if(right>left)ctx.rect(left,y/scale,right-left,1/scale);
      }
      ctx.clip();
    }else{ctx.beginPath();ctx.rect(x0,top-4,w,VIEW_H-top+4);ctx.clip();}

    // the body: murky and glowing, darker down deep, under a slow swell of a surface
    const gr = ctx.createLinearGradient(0, top, 0, VIEW_H);
    gr.addColorStop(0, C.body); gr.addColorStop(0.18, C.body); gr.addColorStop(0.5, C.deep); gr.addColorStop(1, C.deep);
    ctx.save(); ctx.globalAlpha = 0.86; ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0 - 6, VIEW_H);
    for (let x = x0 - 6; x <= x0 + w + 6; x += 1 / ART_R) ctx.lineTo(x, surf(x)); ctx.lineTo(x0 + w + 6, VIEW_H); ctx.fill(); ctx.restore();
    ctx.globalAlpha = 0.3;   // light rippling through it
    for (let i = 0; i < w / 6; i++) { const lx = x0 + ((i * 37 + Math.sin(t * 0.02 + i) * 6) % w + w) % w, ly = top + 5 + (i * 11) % (VIEW_H - top - 6); fRoundRect(ctx, lx, ly, 4 + (i % 3) * 2, 2 / 3, 0.3, C.top); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.top; ctx.lineWidth = 1.2; ctx.beginPath();   // the surface catching the light
    let pen = false;
    for (let x = x0; x <= x0 + w; x += 1 / ART_R) { if (this.inDrain(x)) { pen = false; continue; } if (pen) ctx.lineTo(x, surf(x) + 0.6); else { ctx.moveTo(x, surf(x) + 0.6); pen = true; } }
    ctx.stroke();
    for (let x = Math.ceil(x0); x < x0 + w; x++) if ((x + (t >> 2)) % 23 === 0 && !this.inDrain(x)) fRoundRect(ctx, x, surf(x), 2.4, 2 / 3, 0.3, C.foam);
    // bubbles rising and popping
    for (let i = 0; i < Math.ceil(w / 40); i++) {
      const life = 70 + (i * 13) % 50, u = ((t + i * 37) % life) / life, bx = x0 + (i * 53 + 11) % w;
      if (this.inDrain(bx)) continue;
      const by = top + 18 - u * 18;
      if (u < 0.9) { fBlob(ctx, bx, by, 0.5 + u * 0.7, C.bub); fBlob(ctx, bx - 0.3, by - 0.3, 0.2 + u * 0.2, '#ffffff'); }
      else { fBlob(ctx, bx - 1, top - 1, 0.45, C.foam); fBlob(ctx, bx + 2, top - 2, 0.45, C.foam); }
    }
    // an open drain: the acid spiralling down it into the dark
    for (const d of this.drains) {
      const cx = (d.a + d.b) / 2, r = (d.b - d.a) / 2, open = Math.min(1, d.t / 40);
      fRect(ctx, d.a + r * (1 - open), top, r * 2 * open, VIEW_H - top, '#0a1404');
      for (let k = 0; k < 14; k++) {   // swirling streaks, tighter and lower toward the middle
        const a = t * 0.18 + k * 0.9, rr = r * (1 - (k / 14) * 0.85) * (0.6 + 0.4 * open) + 3;
        const sx = cx + Math.cos(a) * rr, sy = top + 1 + (k / 14) * 10 * open + Math.sin(a) * 2;
        fRoundRect(ctx, sx, sy, 2.2, 2 / 3, 0.3, k % 3 ? C.top : C.foam);
      }
      fRoundRect(ctx, d.a - 4, top, 4, 1.4, 0.6, C.top); fRoundRect(ctx, d.b, top, 4, 1.4, 0.6, C.top);   // the lip pouring in
      fRect(ctx, d.a, top + 2, 2 / 3, VIEW_H - top, C.top); fRect(ctx, d.b - 2 / 3, top + 2, 2 / 3, VIEW_H - top, C.top);
    }
    ctx.restore();
  }
}

// ── geysers ─────────────────────────────────────────────────────────────────
const GEY_CALM = 170, GEY_WARN = 60, GEY_UP = 46, GEY_H = 84;
class Geyser extends Enemy {
  constructor(col, row, offset = 0) {
    super(col * TILE + 2, row * TILE - GEY_H, 12, GEY_H);
    this.surf = row * TILE; this.f = offset; this.h0 = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  phase() { const f = this.f % (GEY_CALM + GEY_WARN + GEY_UP); return f < GEY_CALM ? ['calm', f] : f < GEY_CALM + GEY_WARN ? ['warn', f - GEY_CALM] : ['up', f - GEY_CALM - GEY_WARN]; }
  hitbox() { return this.h0 > 4 ? { x: this.x, y: this.surf - this.h0, w: this.w, h: this.h0 } : null; }
  update(g) {
    this.t++; this.f++;
    const [ph, k] = this.phase();
    this.h0 = ph !== 'up' ? 0 : k < 8 ? GEY_H * k / 8 : k > GEY_UP - 10 ? GEY_H * (GEY_UP - k) / 10 : GEY_H - (k & 1) * 3;
    // Keep the stomach room's geysers visual: their repeated cues compete with the level music.
    if (this.h0 > 10) for (const pl of g.platforms) if (pl instanceof Flotsam && pl.x < this.x + this.w + 4 && pl.x + pl.w > this.x - 4) pl.blast(g);
  }
  onTouch(g) { g.hurtPlayer(); }
  draw(ctx) {
    const [ph, k] = this.phase(), cx = Math.round(this.x + this.w / 2), top = this.surf, t = this.t;
    if (ph === 'warn') {   // subsurface glow, expanding ripples, and a boiling blister dome
      const wk = k / GEY_WARN, b = Math.round(wk * wk * 6), shk = wk > 0.7 ? ((t >> 1) & 1 ? 1 : -1) : 0;
      ctx.globalAlpha = 0.25 + wk * 0.45;
      gutEllipse(ctx, cx + shk, top + 2, Math.round(8 + wk * 6), 2 + Math.round(wk * 2), '#9ae04a');
      for (let i = 0; i < 2; i++) {
        const r = Math.round(4 + ((t * 0.5 + i * 7) % 12));
        fRoundRect(ctx, cx - r, top, 3, 0.8, 0.4, '#e8ff9a'); fRoundRect(ctx, cx + r - 3, top, 3, 0.8, 0.4, '#e8ff9a');
      }
      ctx.globalAlpha = 1;
      gutEllipse(ctx, cx + shk, top + 1, 7 + Math.round(wk * 3), b + 2, '#1e5a10');
      gutEllipse(ctx, cx + shk, top + 1, 6 + Math.round(wk * 3), b + 1, '#58b828');
      gutEllipse(ctx, cx + shk, top, 4 + Math.round(wk * 2), Math.max(1, b), '#d4ff78');
      for (let i = 0; i < 3 + (k >> 3); i++) {
        const bx = cx - 6 + ((i * 5 + k) % 13), by = top - b - ((k * 2 + i * 7) % 9);
        gutEllipse(ctx, bx, by, 1 + (i & 1), 1 + (i & 1), '#c8ff6a');
        fBlob(ctx, bx - 0.2, by - 0.6, 0.45, '#ffffff');
      }
      return;
    }
    if (this.h0 <= 0) return;
    const h = this.h0, y0 = Math.round(top - h);
    // the spout: a churning, pressurized column of glowing stomach acid with upward boluses, side spray, and a boiling crown
    const S = 1 / ART_R, L = { '#184a0c': [], '#46a020': [], '#368418': [], '#82d438': [], '#c8ff6a': [], '#f4ffd0': [], '#e8ff9a': [] };   // (in fine slices: hires.js)
    for (let y = y0; y < top; y += S) {
      const u = (top - y) / Math.max(1, h);
      const s1 = Math.sin(y * 0.2 + t * 0.65), s2 = Math.sin(y * 0.37 + t * 0.95);
      const flare = u < 0.16 ? (1 - u / 0.16) * 3 : u > 0.82 ? ((u - 0.82) / 0.18) * 2.5 : -0.8 * Math.sin(u * Math.PI);
      const hw = Math.max(3, 5.5 + flare + s1 * 1.1 + s2 * 0.6), rx = cx + 0.5 + Math.sin(y * 0.11 + t * 0.4) * (1 + u);
      L['#184a0c'].push([rx - hw - 0.8, y, hw * 2 + 1.6, S]);
      L[s1 > 0 ? '#46a020' : '#368418'].push([rx - hw, y, hw * 2, S]);
      const mw = Math.max(2, hw - 2); L['#82d438'].push([rx - mw, y, mw * 2, S]);
      const cw = Math.max(0.7, hw * 0.5 + s2 * 0.6); L['#c8ff6a'].push([rx - cw, y, cw * 2, S]);
      const fx = rx + Math.sin(y * 0.25 + t * 0.85) * (cw * 0.5);
      L[(Math.floor(y) + Math.floor(t * 4)) % 5 < 3 ? '#f4ffd0' : '#e8ff9a'].push([fx - 0.7, y, 1.4, S]);
    }
    for (const c in L) fRects(ctx, c, L[c]);
    // Base collar at the acid surface
    gutEllipse(ctx, cx, top + 1, 10, 3, '#184a0c');
    gutEllipse(ctx, cx, top, 8, 2, '#9ae04a');
    gutEllipse(ctx, cx, top, 5, 1, '#f0ffc0');
    // Boiling multi-lobed crown
    for (const [ox, oy, rx, ry, ph] of [[-4, 2, 5, 3, 0], [4, 2, 5, 3, 2], [0, 0, 6, 4, 1]]) {
      const lx = Math.round(cx + ox + Math.sin(t * 0.3 + ph)), ly = Math.round(y0 + oy + Math.cos(t * 0.35 + ph));
      gutEllipse(ctx, lx, ly, rx + 1, ry + 1, '#184a0c');
      gutEllipse(ctx, lx, ly, rx, ry, '#82d438');
      gutEllipse(ctx, lx, ly - 1, Math.max(2, rx - 2), Math.max(1, ry - 2), '#e8ff9a');
    }
    // Parabolic acid droplets arcing out and splashing down
    for (let i = 0; i < 8; i++) {
      const u = ((t + i * 9) % 20) / 20, sd = i & 1 ? 1 : -1;
      const dx = cx + 0.5 + sd * (3 + (i % 4) * 2.5) * u;
      const dy = y0 - 9 * u + 22 * u * u;
      if (dy < top) { fBlob(ctx, dx, dy + 0.5, 1.4, '#184a0c'); fBlob(ctx, dx, dy + 0.5, 0.8, u < 0.5 ? '#f0ffc0' : '#9ae04a'); }
    }
  }
}

// ── the flip-flop in the drain ──────────────────────────────────────────────
const FLIP_BOUNCE = 5.4, FLIP_HITS = 3;
class FlipFlop {
  constructor(col, row = 12) {
    this.w = 30; this.h = 6; this.x = col * TILE; this.rest = row * TILE - 3; this.y = this.prevY = this.rest;
    this.dx = 0; this.dy = 0; this.t = 0; this.hits = 0; this.squash = 0; this.fly = null; this.ghost = false; this.was = false;
  }
  update(g) {
    this.t++;
    const p = g.player, on = p.platform === this && p.onGround, oy = this.y;
    if (this.fly) {
      const F = this.fly; F.vy += 0.18; this.x += F.vx; this.y += F.vy; F.a += 0.3;
      if (this.y > VIEW_H + 40) this.remove = true;
    } else {
      if (on && !this.was) {   // boing: off he goes, and it's jammed in a little deeper
        this.hits++; this.squash = 10;
        p.vy = -FLIP_BOUNCE; p.onGround = false; p.platform = null; p.jumping = true; p.holdGrace = 10; p.sx = 0.8; p.sy = 1.25;
        Sound.play('sproing');
        if (this.hits >= FLIP_HITS) this.pop(g);
      }
      if (this.squash > 0) this.squash--;
      this.y = this.rest + this.hits * 1.5 + Math.sin(this.t * 0.07) * 0.6 + (this.squash > 0 ? Math.sin(this.squash * 0.9) * 2 : 0);
    }
    this.was = on;
    this.prevY = oy; this.dy = this.fly ? 0 : this.y - oy; this.dx = 0;
  }
  // out it pops, spinning away: the drain under it opens and the acid starts to swirl down
  pop(g) {
    this.fly = { vx: rand(-1.5, 1.5) || 1, vy: -8, a: 0 }; this.ghost = true;
    const lake = g.entities.find(e => e instanceof AcidLake && this.x >= e.x && this.x < e.x + e.w);
    if (lake) lake.drains.push({ a: this.x, b: this.x + this.w, t: 0 });
    Sound.play('pop'); Sound.play('swallow');
    g.burst(this.x + this.w / 2, this.rest, ['#e8ff9a', '#9ae04a', '#ffffff'], 14);
  }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), w = this.w;
    if (this.fly) { ctx.save(); ctx.translate(x + w / 2, y + 3); ctx.rotate(this.fly.a); ctx.translate(-x - w / 2, -y - 3); }
    drawGutRemains(ctx, x, y, w, 'stone', this.t);
    if (this.fly) ctx.restore();
  }
}

// ── eye candy: what the turtle has eaten, lying about on the floor (no collision; ['debris', col, row, kind]) ──
// row is the tile it sits on top of (or, with a 5th value, hangs from); kinds: jelly, grass, urchin, crab, sponge, conch, clam, net, bag, stones
const DEBRIS_ART = {
  jelly: [['....KKKKKKKK....', '..KKcccwcccKK...', '.KcccCCwCCCccK..', 'KcCCCCCCCCCCCcK.', '.KKKKKKKKKKKKK..', '..gK.gK..gK.gK..', '.g.K..K.g..K.g..', '..g..g....g..g..'],
    { K: '#1a3a5a', c: '#5ad8e8', C: '#2a9ab8', w: '#d8fbff', g: '#7affc8' }],
  grass: [['....KK..KKK.......', '..KKggKKggKK..KK..', '.KGgGGgGGgGGKKggK.', 'KGGdGgGGdGGgGGGGGK', 'KdGGGGdGGGGdGGgdK.', '.KKdGGGGGdGGGGKK..', '...KKKKKKKKKKK....'],
    { K: '#12341a', G: '#3f9a46', g: '#6ed06a', d: '#246a30' }],
  urchin: [['.K..K..K..K...', '..K.K..K.K....', '..KKKKKKKK....', '.KppwppppPK...', 'KpPPPPPpPPK...', 'KPPK.KPPPPK...', '.KKK..KKKK....'],
    { K: '#2a1038', P: '#7a3a9a', p: '#b070d0', w: '#e8d0f0' }],
  crab: [['.K..........K...', 'KBK.KKKKKK.KBK..', '.KBKBbbbbBKBK...', '..KBbBBbBBBbK...', '..KBBBRBBRBBK...', '.KKKKKKKKKKKK...', '.K.K.K..K.K.K...'],
    { K: '#1a2848', B: '#3a78b8', b: '#7ab0e0', R: '#e0743a' }],
  sponge: [['..KKKKKKKK....', '.KhhyhhYhhK...', 'KhyYYyYYyhYK..', 'KYyKKyYKKyYK..', 'KYYyYYyYYyYK..', 'KyYYyYYYyYYK..', '.KKKKKKKKKK...'],
    { K: '#5a3c10', Y: '#d8b050', y: '#a88030', h: '#f0d890' }],
  conch: [['....KKKK......', '..KKwSSsKK....', '.KwSSsSSsSK...', 'KwSsKKKsSSsK..', 'KSSsKwSKsSSK..', '.KSsSSSSsSK...', '..KKSSssKK....', '....KKKK......'],
    { K: '#6a3a28', S: '#f0c8b0', s: '#d89078', w: '#fff0e8' }],
  clam: [['..KKKK...KKKK...', '.KnNNnK.KWWwWK..', 'KnNNNNnKKWwWWwK.', 'KNNnNNNKKwWWWwK.', '.KKKKKKK.KKKKK..'],
    { K: '#1c2440', N: '#3a4a78', n: '#5a6aa0', W: '#e8e4d8', w: '#c0b8a8' }],
  net: [['.n..n..n..n..n...R', 'n.nn.nn.nn.nn.n..R', '.nn.nn.nn.nn.nn..K', 'n..nn..nn..nn..n..', '.n..n..n..n..n....'],
    { n: '#b8c4d0', R: '#e05040', K: '#7a2a20' }],
  bag: [['..wwWWww...', '.wWWbWWWww..', 'wWbWWWbWWWw.', '.wwWWwwWWw..'],
    { w: '#a8acb6', W: '#e8ebf0', b: '#8c909c' }],
  stones: [['..KKKK......', '.KgggdK.KK..', 'KgGGGGdKgdK.', 'KGGGGGGKGGdK', '.KKKKKKKKKK.'],
    { K: '#2a3038', G: '#7a8a96', g: '#a8b4be', d: '#566470' }],
};
class GutDebris extends Enemy {
  constructor(col, row, kind = 'stones', hang = false) {
    super(col * TILE, row * TILE, TILE, 1);
    this.col = col; this.row = row;
    this.kind = DEBRIS_ART[kind] ? kind : 'stones'; this.hang = !!hang;   // hang: caught on the ceiling above (row = the tile it hangs below), upside down
    this.passive = true; this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    if (this.falling) {
      this.vy += 0.22;
      this.x += this.vx;
      this.y += this.vy;
      this.rot += this.vr;
      if (this.y > VIEW_H + 60) this.remove = true;
      return;
    }
    if (this.hang || !g || !g.level) return;
    const lv = g.level;
    if (!lv.gutBoneCells || !lv.gutBones) return;
    const c = Math.floor(this.col), r = Math.floor(this.row);
    const boneKey = lv.gutBoneCells.get(r * lv.w + c);
    if (boneKey == null) return;
    const bone = lv.gutBones.get(boneKey);
    if (!bone) return;
    if (bone.gone) {
      if (bone.fall > 30 || (g.brokenBones && g.brokenBones.has(boneKey) && bone.fall < 0)) {
        this.remove = true;
        return;
      }
      this.falling = true;
      const rng = mulberry32(c * 37 + r * 13 + 5);
      this.vx = (rng() - 0.5) * 1.4;
      this.vy = -rng() * 2.0 - 0.6;
      this.rot = 0;
      this.vr = (rng() - 0.5) * 0.18;
      return;
    }
    const k = bone.t >= 0 ? bone.t / GUT_BONE_BREAK : -1;
    this.shake = k > 0.7 && bone.load ? ((bone.t >> 1) % 2 ? 1 : -1) : 0;
    this.sag = k > 0.85 && bone.load ? 1 : 0;
  }
  draw(ctx) {
    const img = debrisArt(this.kind);
    const bob = 0;
    if (this.falling || this.rot) {
      const cx = Math.round(this.x + (TILE - img.width) / 2 + img.width / 2);
      const cy = Math.round(this.y - img.height / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.rot);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    } else if (this.hang) {
      ctx.save(); ctx.translate(Math.round(this.x + (TILE - img.width) / 2), Math.round(this.y - 1)); ctx.scale(1, -1); ctx.drawImage(img, 0, -img.height); ctx.restore();
    } else {
      const shake = this.shake || 0, sag = this.sag || 0;
      ctx.drawImage(img, Math.round(this.x + (TILE - img.width) / 2 + shake), Math.round(this.y - img.height + 1 + bob + sag));
    }
    if (this.kind === 'jelly') {   // the faint glow of a dying jellyfish
      this.t = (this.t || 0) + 1;
      fGlow(ctx, this.x + TILE / 2, this.y - 3, 12, '#7affc8', 0.3 + 0.12 * Math.sin(this.t * 0.06));
    }
  }
}

// ── a heap of the turtle's leftovers ('heap', col0, col1, floorRow, topRow), piled up against a wall. Scenery:
// it stands behind everything and nothing collides with it. Tallest at col0 (topRow), a lumpy top, then it slumps
// down to the floor by col1. Packed with the same junk as the loose debris, at its original brightness.
const HEAP_JUNK = ['bag', 'net', 'grass', 'conch', 'crab', 'clam', 'stones', 'urchin', 'sponge', 'jelly', 'boot', 'duck', 'flipflop', 'fishbone'];
class DebrisHeap extends Enemy {
  constructor(c0, c1, floorRow, topRow) {
    super(c0 * TILE - 6, topRow * TILE - 8, (c1 - c0 + 1) * TILE + 6, (floorRow - topRow) * TILE + 8);
    this.c0 = c0; this.c1 = c1; this.floorY = floorRow * TILE; this.topY = topRow * TILE;
    this.passive = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  // the heap's surface over x (px from its left edge)
  top(x) {
    const W = this.w, H = this.floorY - this.topY, u = x / W;
    const k = u < 0.38 ? 1 - u * 0.15 : Math.max(0, 0.943 * (1 - Math.pow((u - 0.38) / 0.62, 1.25)));
    return this.floorY - H * k + Math.sin(x * 0.21) * 3 + Math.sin(x * 0.53 + 1) * 2;
  }
  bake() {
    const W = this.w, H = this.h, Y0 = this.y, cv = makeHiCanvas(W, H), c = cv.getContext('2d'), rng = mulberry32(this.c0 * 97 + 13);   // (fine: hires.js)
    const surf = x => this.top(x) - Y0;
    const item = (kind, x, y, rot, flip) => {
      c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(rot); if (flip) c.scale(-1, 1);
      if (DEBRIS_ART[kind]) {
        const img = debrisArt(kind);
        c.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
      } else Game.prototype.drawFlushItem(c, kind, Math.floor(rng() * 9));
      c.restore();
    };
    const pick = () => HEAP_JUNK[Math.floor(rng() * HEAP_JUNK.length)];
    // packed muck underneath it all, outlined
    const outline = grow => { c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 1 / ART_R) c.lineTo(x, surf(x) - grow); c.lineTo(W, H); c.fill(); };
    c.fillStyle = INK; outline(2 / 3);
    const mg = c.createLinearGradient(0, 0, 0, H); mg.addColorStop(0, '#4a1a26'); mg.addColorStop(0.25, '#3c1620'); mg.addColorStop(1, '#2a0c16');
    c.fillStyle = mg; outline(0);
    // The deep layers keep their original colours, just like the loose debris nearby.
    for (let i = 0; i < 120; i++) {
      const x = rng() * W, t = surf(x);
      if (t >= H - 4) continue;
      item(pick(), x, t + 8 + rng() * (H - t), Math.floor(rng() * 4) * Math.PI / 2 + (rng() - 0.5) * 0.4, rng() < 0.5);
    }
    // the surface: whole things lying on top, sticking up out of the outline
    for (let i = 0; i < 46; i++) {
      const x = 4 + rng() * (W - 8), t = surf(x);
      if (t >= H - 2) continue;
      item(pick(), x, t + 1 + rng() * 5, (rng() - 0.5) * 0.9, rng() < 0.5);
    }
    return cv;
  }
  draw(ctx) {
    const cv = this.pic || (this.pic = this.bake());
    ctx.drawImage(cv, Math.round(this.x), Math.round(this.y));
  }
}

// ── gastroliths ─────────────────────────────────────────────────────────────
class Hopper extends Enemy {
  constructor(col, row, dir = -1, every = 150) {
    super(col * TILE, row * TILE, TILE, TILE);
    this.dir = dir; this.every = every; this.cool = 30;   // every = 0: a drain only (stones roll into it, none come out)
    this.passive = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  get holeX() { return this.dir < 0 ? this.x : this.x + TILE; }   // the wall face the hole is in
  update(g) {
    this.t++;
    if (!this.every || --this.cool > 0) return;
    this.cool = this.every + Math.round(rand(-30, 30));
    const st = new Gastrolith(this.dir < 0 ? this.x - 18 : this.x + TILE, this.y - 2, this.dir);
    st.emerge = GASTRO_PASS; st.clipX = this.holeX; st.clipSide = this.dir;   // it rolls out of the hole
    g.entities.push(st);
  }
  draw(ctx) {   // the pocket it comes out of: a dark puckered hole in the wall
    const cx = Math.round(this.dir < 0 ? this.x : this.x + TILE), cy = Math.round(this.y + 8);
    gutEllipse(ctx, cx, cy, 5.4, 9.2, '#4a1222'); gutEllipse(ctx, cx, cy, 4.2, 8, '#8a2a44'); gutEllipse(ctx, cx, cy, 3, 7, '#0e0308');   // (fine)
    fEll(ctx, cx, cy - 8.6, 4, 0.7, '#e8708a'); fEll(ctx, cx, cy + 9.4, 4, 0.7, '#d8607a');   // the puckered lips
  }
}
const GASTRO_PASS = 12;   // frames a stone takes to roll out of / into a hole in the wall
class Gastrolith extends Enemy {
  constructor(x, y, dir) {
    super(x, y, 18, 18);
    this.vx = dir * 1.5; this.dir = dir; this.spin = 0; this.kind = Math.floor(rand(0, 3)); this.shade = ['#7a8a96', '#8a8070', '#6a7a6a'][this.kind];
    this.stompable = false; this.fireKill = false; this.shellKill = false; this.bumpKill = false;
  }
  hitbox() { return this.emerge > 0 || this.sink ? null : this; }   // (half in the wall: it can't touch him)
  // a hole facing it, straight ahead along the floor, that it's about to reach: it rolls in (and is gone) instead of smashing on the wall
  holeAhead(g) {
    const edge = this.dir > 0 ? this.x + this.w + this.vx : this.x + this.vx;
    for (const h of g.entities) {
      if (!(h instanceof Hopper) || h.dir !== -this.dir || Math.abs(this.cy - (h.y + 8)) > 14) continue;
      if (this.dir > 0 ? edge >= h.holeX - 0.5 && edge <= h.holeX + 6 : edge <= h.holeX + 0.5 && edge >= h.holeX - 6) return h;
    }
    return null;
  }
  update(g) {
    this.t++;
    if (this.emerge > 0) this.emerge--;
    if (this.sink) {   // rolling on into the hole, until it's all the way in
      this.x += this.vx; this.spin += this.vx * 0.14;
      if (++this.sink > GASTRO_PASS + 1) { this.dead = this.remove = true; g.dust(this.sinkX, this.y + this.h * 0.6, 2); }
      return;
    }
    const hole = this.holeAhead(g);
    if (hole) { this.sink = 1; this.sinkX = hole.holeX; this.clipX = hole.holeX; this.clipSide = -this.dir; return; }
    const was = this.vx;
    this.walk(g, false);
    this.spin += this.vx * 0.14;
    if (Math.sign(this.vx) !== Math.sign(was)) { this.vx = was; this.crush(g); }   // smashed against a wall
    if (this.onGround && this.t % 8 === 0) g.dust(this.cx, this.y + this.h, 1);
  }
  crush(g) {
    if (this.dead) return;
    this.dead = this.remove = true;
    for (let i = 0; i < 12; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-5, 5), y: this.y + rand(2, 12), vx: rand(-1.6, 1.6), vy: rand(-2.8, -0.6), g: 0.2, life: 40, t: 0, color: [this.shade, '#c8c0b0', '#4a4a50'][i % 3], size: 2 + (i % 2) });
    if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W + 16) Sound.play('break');
  }
  catHit(g) { this.crush(g); g.addScore(200, this.cx, this.y); }   // Murray's claws shatter it (nothing else can)
  onTouch(g, p) {
    if (g.isStomp(p, this)) { g.bounce(p); Sound.play('bump'); return; }   // solid stone: you just bounce off the top
    g.hurtPlayer();
  }

  draw(ctx) {   // jagged mineral teeth and red fractures distinguish this hazard from a carryable shell
    const k = ((Math.round(this.spin / (Math.PI / 8)) % 16) + 16) % 16;
    const part = this.emerge > 0 || this.sink;   // coming out of / going into a hole: only the part on the open side of the wall shows
    if (!part) { gsDraw(ctx, gsGastrolith(k, this.kind), this.cx, this.y + this.h, 10, 20, false); return; }
    const off = this.emerge > 0 ? -this.dir * this.w * this.emerge / GASTRO_PASS : 0;
    ctx.save(); ctx.beginPath();
    if (this.clipSide < 0) ctx.rect(this.clipX - 80, this.y - 40, 80, 100); else ctx.rect(this.clipX, this.y - 40, 80, 100);
    ctx.clip();
    gsDraw(ctx, gsGastrolith(k, this.kind), this.cx + off, this.y + this.h, 10, 20, false);
    ctx.restore();
  }
}

// ── slime slides ────────────────────────────────────────────────────────────
const SLIDE_THICK = 10, SLIDE_ACC = 0.16, SLIDE_MAX = 4.4, SLIDE_SLOW = 1.4;
class Slide {
  constructor(x0, y0, x1, y1) {
    this.ax = x0 * TILE; this.ay = y0 * TILE; this.bx = x1 * TILE; this.by = y1 * TILE;
    this.x = Math.min(this.ax, this.bx); this.w = Math.abs(this.bx - this.ax); this.h = SLIDE_THICK;
    this.down = Math.sign((this.by - this.ay) * (this.bx - this.ax)) || 1;   // which way is downhill
    this.y = this.prevY = Math.min(this.ay, this.by); this.dx = 0; this.dy = 0; this.t = 0; this.slick = true;
  }
  lineY(x) { const u = clamp((x - this.ax) / (this.bx - this.ax), 0, 1); return this.ay + (this.by - this.ay) * u; }
  update(g) {
    this.t++;
    const p = g.player, cx = p.x + p.w / 2;
    if (p.platform === this && p.state === 'play') {
      // on the slime there's no stopping: he's carried away downhill, faster and faster (slowly, when he's stuck up)
      const slow = p.fluke || p.sticky > 0, max = slow ? SLIDE_SLOW : SLIDE_MAX;
      p.vx = clamp(p.vx + this.down * SLIDE_ACC * (slow ? 0.4 : 1), -max, max);
      if (Math.abs(p.vx) > max - 0.05 && slow) p.vx = this.down * max;
      p.airMax = Math.max(p.airMax || 0, Math.abs(p.vx));
      if (this.t % 4 === 0) g.particles.push({ kind: 'px', x: cx - p.vx * 2, y: p.y + p.h - 1, vx: -p.vx * 0.2, vy: -0.4, g: 0.05, life: 16, t: 0, color: '#ffd0dc', size: 1 });
      this.prevY = this.y; this.y = this.lineY(cx + p.vx); this.dy = this.y - this.lineY(cx);
    } else { this.y = this.prevY = this.lineY(cx); this.dy = 0; }
    this.dx = 0;
  }
  draw(ctx) {   // (the slab is painted with the room; just glints of slime sliding down its surface)
    const t = this.t;
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.006 + i / 4) % 1), x = this.ax + (this.bx - this.ax) * u, y = this.ay + (this.by - this.ay) * u;
      fRoundRect(ctx, x - this.down * 3, y, 3.4, 0.7, 0.35, '#ffd0dc'); fRoundRect(ctx, x, y - 0.1, 2.6, 0.7, 0.35, '#ffffff');   // (fine)
    }
  }
}

// ── enzyme bubbles ──────────────────────────────────────────────────────────
const STICKY_T = 150, STICKY_RUN = 0.55, STICKY_JUMP = 0.75, ENZ_REFORM = 320;
class EnzymeBubble extends Enemy {
  constructor(col, row, vx = 1, vy = 0) {
    super(col * TILE + 1, row * TILE + 1, 14, 14);
    this.hx = this.x; this.hy = this.y; this.v0 = [vx, vy]; this.vx = vx; this.vy = vy; this.gone = 0; this.goo = false;
    this.stompable = false; this.fireKill = false; this.shellKill = false; this.bumpKill = false;
  }
  hitbox() { return this.gone ? null : { x: this.x + 2, y: this.y + 2, w: 10, h: 10 }; }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.goo && !(p.sticky > 0)) { this.goo = false; this.drawOver = false; }
    if (this.gone) { if (--this.gone === 0) { this.x = this.hx; this.y = this.hy; [this.vx, this.vy] = this.v0; } return; }
    // bounce about: off the walls, the floors, and the slides' slime
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.1, 3.4);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx;
    const r = sweepY(lv, this, this.vy);
    if (r === 1) this.vy = -3.4; else if (r === -1) this.vy = Math.abs(this.vy);
    for (const sl of g.platforms) if (sl instanceof Slide && this.cx > sl.x && this.cx < sl.x + sl.w) {
      const ly = sl.lineY(this.cx);
      if (this.vy > 0 && this.y + this.h > ly && this.y + this.h - this.vy <= ly + 2) { this.y = ly - this.h; this.vy = -3.4; }
    }
  }
  onTouch(g, p) {   // it bursts all over him
    this.gone = ENZ_REFORM; this.goo = true; this.drawOver = true;
    p.sticky = STICKY_T;
    Sound.play('plop'); Sound.play('sizzle');
    for (let i = 0; i < 12; i++) g.particles.push({ kind: 'px', x: this.cx, y: this.y + 7, vx: rand(-2, 2), vy: rand(-2.5, 0.5), g: 0.15, life: 30, t: 0, color: i % 2 ? '#c87aff' : '#e8c0ff', size: 2 });
  }
  draw(ctx, g) {
    if (this.goo && g) {   // the goo all over Chickaroo, dripping off him
      const p = g.player, x = Math.round(p.x), y = Math.round(p.y);
      ctx.globalAlpha = 0.85;   // (in fine pixels: hires.js)
      fRoundRect(ctx, x + 1, y + 1, p.w - 2, 3, 1.4, '#a858e0'); fRoundRect(ctx, x, y + 3, 2, 5, 1, '#a858e0'); fRoundRect(ctx, x + p.w - 3, y + 2, 3, 6, 1.4, '#a858e0');
      for (let k = 0; k < 3; k++) { const dl = ((this.t >> 2) + k * 3) % 6; fRoundRect(ctx, x + 3 + k * 4, y + 4, 1, 1 + dl, 0.5, '#a858e0'); fBlob(ctx, x + 3.5 + k * 4, y + 5 + dl, 0.6, '#a858e0'); }
      fEll(ctx, x + 3.5, y + 1.6, 1.6, 0.5, '#e8c0ff');
      ctx.globalAlpha = 1;
    }
    if (this.gone) {   // re-forming: a little purple drop swelling back up where it began
      if (this.gone < 60) gutEllipse(ctx, this.hx + 7, this.hy + 7, Math.round((60 - this.gone) / 10), Math.round((60 - this.gone) / 10), '#a858e0');
      return;
    }
    const spr = gsGlobule(Math.floor(this.t / 6) & 7);
    gsDraw(ctx, spr, this.cx, this.y + 7, 8, 8, false);
  }
}

// ── ink drips: purple beads gathered on the ceiling, falling a few at a time ─────────────────────────
// Like a fluke they hang from the roof and drop when he passes underneath (and now and then on their own); one that
// lands on him splats over him exactly like an enzyme bubble (sticky and dirty, never hurt), one that misses
// splats on the floor. Either way a new bead slowly swells at the same spot on the ceiling.
const DRIP_QUIVER = 14, DRIP_GAP = 260;
class InkDrip extends EnzymeBubble {
  constructor(col, row) {
    super(col, row, 0, 0);
    this.state = 'hang'; this.timer = 0; this.next = 150 + (col * 53) % 220;
  }
  hitbox() { return this.gone || this.state !== 'fall' ? null : super.hitbox(); }   // (only a falling drop touches him)
  update(g) {
    this.t++;
    const p = g.player, lv = g.level;
    if (this.goo && !(p.sticky > 0)) { this.goo = false; this.drawOver = false; }
    if (this.gone) {
      if (--this.gone === 0) { this.x = this.hx; this.y = this.hy; this.vy = 0; this.state = 'hang'; this.timer = 0; this.next = 150 + Math.round(rand(0, 220)); }
      return;
    }
    if (this.state === 'hang') {
      this.timer++;
      let under = p.state === 'play' && Math.abs(p.x + p.w / 2 - this.cx) < 22 && p.y > this.y + 8;
      for (let r = Math.floor((this.y + this.h) / TILE); under && r < Math.floor(p.y / TILE); r++) if (lv.solid(Math.floor(this.cx / TILE), r)) under = false;
      const nearby = this.cx > g.camX - 8 && this.cx < g.camX + VIEW_W + 8;
      if (this.timer > 50 && (under || (nearby && this.timer > this.next))) { this.state = 'quiver'; this.timer = 0; Sound.play('blip'); }
    } else if (this.state === 'quiver') {
      if (++this.timer > DRIP_QUIVER) { this.state = 'fall'; this.vy = 0.5; }
    } else {
      this.vy = Math.min(this.vy + 0.28, 5);
      if (sweepY(lv, this, this.vy) === 1) this.splat(g);
      else if (this.y > VIEW_H + 16) this.gone = DRIP_GAP;
    }
  }
  splat(g) {   // it lands on the floor
    this.gone = DRIP_GAP;
    Sound.play('plop');
    for (let i = 0; i < 8; i++) g.particles.push({ kind: 'px', x: this.cx, y: this.y + this.h - 2, vx: rand(-1.6, 1.6), vy: rand(-2.2, -0.4), g: 0.15, life: 26, t: 0, color: i % 2 ? '#c87aff' : '#e8c0ff', size: 2 });
  }
  draw(ctx, g) {
    if (this.gone || this.goo || this.state === 'fall') return super.draw(ctx, g);
    // a bead swelling on the roof, quivering just before it lets go
    const k = this.state === 'quiver' ? 1 : Math.min(1, this.timer / 80), cx = this.hx + 7 + (this.state === 'quiver' ? (this.t & 1) * 2 - 1 : 0), top = this.hy - 1;
    const len = 2 + k * 5 + (this.state === 'quiver' ? 2 : 0), w = 2 + k * 3;   // (in fine pixels: hires.js)
    fPoly(ctx, [[cx - 1.4, top], [cx + 1.4, top], [cx + w * 0.7, top + 2 + len * 0.6], [cx - w * 0.7, top + 2 + len * 0.6]], '#4a1a78');
    fEll(ctx, cx, top + 2.5 + len, w + 0.8, len + 0.6, '#4a1a78'); fEll(ctx, cx, top + 2.5 + len, w, len - 0.2, '#a858e0');
    fEll(ctx, cx - w * 0.45, top + 1.6 + len, w * 0.25, len * 0.45, '#e8c0ff');
  }
}

// ── methane vents ───────────────────────────────────────────────────────────
const VENT_LIFT = 0.85, VENT_MAX = 4.6, VENT_WARN = 36;
class MethaneVent extends Enemy {
  constructor(col, row, top, on = 110, off = 90, offset = 0) {
    super(col * TILE + 1, top * TILE, 14, (row - top) * TILE);
    this.surf = row * TILE; this.on = on; this.off = off; this.f = offset; this.k = 0;
    this.passive = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++; this.f++;
    const f = this.f % (this.on + this.off), live = f >= this.off, was = this.k;
    this.warn = !live && f > this.off - VENT_WARN;
    this.k = live ? Math.min(1, this.k + 0.1) : Math.max(0, this.k - 0.08);
    if (this.k > 0 && was === 0 && this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('gust');
    // in the jet: lifted up it, however he came in
    const p = g.player, cx = p.x + p.w / 2;
    if (this.k > 0.3 && p.state === 'play' && cx > this.x - 4 && cx < this.x + this.w + 4 && p.y + p.h > this.y && p.y < this.surf) {
      p.vy = Math.max(p.vy - VENT_LIFT * this.k, -VENT_MAX * this.k);
      if (p.y < this.y + 8 && p.vy < -1) p.vy *= 0.8;   // easing off at the top of the jet
      p.onGround = false; p.platform = null; p.jumping = false; p.coyote = 0;
      p.airMax = Math.max(p.airMax || 0, 1.6);
    }
  }
  draw(ctx) {
    const cx = Math.round(this.x + this.w / 2), top = this.surf, t = this.t;
    // the vent: a crusty crater ring poking out of the muck
    gutEllipse(ctx, cx, top, 10, 4, '#2e2418'); gutEllipse(ctx, cx, top - 1, 8, 3, '#94805c'); gutEllipse(ctx, cx, top, 5, 2, '#1a120a');
    if (this.warn) for (let i = 0; i < 3; i++) fBlob(ctx, cx - 2.5 + i * 3, top - 2.5 - ((t + i * 5) % 8), 0.5 + ((t + i * 5) % 8) * 0.06, '#b8e05a');
    if (this.k <= 0) return;
    // the jet: a column of green gas, swirling as it rushes up, thinning out at the top
    const h = this.surf - this.y;
    for (let i = 0; i < 26; i++) {
      const u = ((t * 0.035 + i / 26) % 1), y = top - u * h, sp = 3 + u * 6, x = cx + Math.sin(i * 2.1 + t * 0.15) * sp;
      ctx.globalAlpha = this.k * (1 - u) * 0.75; gutEllipse(ctx, x, y, 2 + Math.round(u * 3), 2 + Math.round(u * 2), i % 3 ? '#9ac84a' : '#d8f08a');
    }
    const col = ctx.createLinearGradient(cx - 5, 0, cx + 5, 0); col.addColorStop(0, 'rgba(184,224,90,0)'); col.addColorStop(0.5, '#b8e05a'); col.addColorStop(1, 'rgba(184,224,90,0)');
    ctx.globalAlpha = this.k * 0.3; ctx.fillStyle = col; ctx.fillRect(cx - 5, this.y, 10, h);   // (a soft column: fine)
    ctx.globalAlpha = 1;
  }
}

// ── stink pockets ───────────────────────────────────────────────────────────
const STINK_MAX = 80;
class StinkPocket extends Enemy {
  constructor(x0, y0, x1, y1) {
    super(x0 * TILE, y0 * TILE, (x1 - x0) * TILE, (y1 - y0) * TILE);
    this.passive = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player;
    if (p.state !== 'play') { p.stink = 0; return; }
    const pr = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    if (overlap(pr, this)) {
      p.stinkT = g.t; p.stink = (p.stink || 0) + 1;
      if (this.t % 20 === 0) Sound.play('sour');
      if (p.stink >= STINK_MAX) { p.stink = 0; g.hurtPlayer(); }
    } else if (!(p.stinkT >= g.t - 1) && p.stink > 0) p.stink = Math.max(0, p.stink - 1);   // (out of every pocket: it clears)
    this.near = p.stink > 0 && Math.abs(p.x + p.w / 2 - (this.x + this.w / 2)) < this.w / 2 + 24 && Math.abs(p.y + p.h / 2 - (this.y + this.h / 2)) < this.h / 2 + 24;
  }
  draw(ctx, g) {
    const t = this.t, x0 = this.x, y0 = this.y, w = this.w, h = this.h;
    // a hanging cloud of stale gas, its puffs slowly rolling over each other
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#9ac84a'; ctx.beginPath(); ctx.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();   // (a soft haze: fine)
    for (let i = 0; i < Math.round(w * h / 160); i++) {
      const px = x0 + ((i * 47 + Math.sin(t * 0.01 + i) * 12) % w + w) % w, py = y0 + ((i * 29 + Math.cos(t * 0.013 + i * 2) * 8) % h + h) % h, r = 5 + (i % 4) * 2;
      ctx.globalAlpha = 0.22; gutEllipse(ctx, px, py, r + 3, Math.round(r * 0.8), i % 2 ? '#8ab83a' : '#b8d860');
    }
    ctx.globalAlpha = 1;
    // it's getting to him: green puffs around his head, faster as it builds up
    const p = g && g.player;
    if (p && p.stink > 0 && this.near) {
      const k = p.stink / STINK_MAX;
      for (let i = 0; i < 3; i++) {
        const u = ((t * (0.03 + k * 0.05) + i / 3) % 1);
        ctx.globalAlpha = (1 - u) * (0.4 + k * 0.5); gutEllipse(ctx, p.x + p.w / 2 + Math.sin(i * 2 + t * 0.1) * 6, p.y - 2 - u * 10, 2 + Math.round(u * 2), 2, '#9ac84a');
      }
      ctx.globalAlpha = 1;
    }
  }
}

// its 1x drawing, lifted to the fine screen look by look (hires.js)

// the debris painted fine (same sizes as DEBRIS_ART, which still gives each its footprint): soft shading, one ink line
const DEBRIS_FINE = {};
function debrisArt(kind) {
  if (DEBRIS_FINE[kind]) return DEBRIS_FINE[kind];
  const [rows, pal] = DEBRIS_ART[kind], w = rows[0].length, h = rows.length, A = mArt(w, h);
  const P = cols => cols;   // (dark to light)
  if (kind === 'jelly') {   // a jellyfish washed in: a glassy bell, its frilled hem, trailing tentacles
    for (let i = 0; i < 4; i++) { let x = 2.5 + i * 3.2; for (let y = 4.6; y < 8; y += 0.5) { A.ell(x + Math.sin(y * 1.8 + i) * 0.5, y, 0.4, 0.4, '#7affc8'); } }
    A.soft(7, 3.6, 6.6, 3.2, P(['#1e6a8a', '#2a9ab8', '#5ad8e8', '#9aecf4', '#e8fdff']));
    A.fill(0, 3.5, 15, 5, (x, y) => y > 3.9 && Math.abs(x - 7) < 6.4 && (Math.sin(x * 2.4) > -0.2 || y < 4.3) ? '#2a9ab8' : null);
  } else if (kind === 'grass') {   // a torn tuft of seagrass
    for (const [x, h2, b] of [[3, 4.4, -0.6], [5.6, 6, -0.2], [8.6, 5.4, 0.2], [11.4, 6, 0.5], [14.4, 4.6, 0.8]]) {
      let px = x, py = 6.6;
      for (let k = 0; k < h2; k += 0.5) { const nx = x + b * k * k / h2, ny = 6.6 - k; A.line(px, py, nx, ny, k / h2 > 0.6 ? '#6ed06a' : '#3f9a46', null, 1.1 - k / h2 * 0.5); px = nx; py = ny; }
    }
    A.soft(9, 6.4, 7.6, 0.9, ['#123a1a', '#1e5a28', '#246a30', '#3f9a46', '#6ed06a']);
  } else if (kind === 'urchin') {   // a little purple urchin, spines and all
    for (let i = 0; i < 11; i++) { const a = Math.PI + i / 10 * Math.PI; A.line(6, 5, 6 + Math.cos(a) * 6, 5 + Math.sin(a) * 5, '#2a1038', null, 0.4); }
    A.soft(6, 5, 4.6, 2.6, ['#3a1450', '#5a2a7a', '#7a3a9a', '#b070d0', '#e8d0f0']);
  } else if (kind === 'crab') {   // a small blue crab, claws up
    for (const s of [-1, 1]) { for (let k = 0; k < 3; k++) A.line(8 + s * (2 + k), 4.6, 8 + s * (3.6 + k * 1.4), 6.8, '#1e4a7a', null, 0.5); A.soft(8 + s * 6.6, 1.6, 1.4, 1.2, ['#1e4a7a', '#2a5a98', '#3a78b8', '#7ab0e0', '#c8e4ff']); }
    A.soft(8, 3.6, 5, 2.2, ['#1e4a7a', '#2a5a98', '#3a78b8', '#7ab0e0', '#c8e4ff']);
  } else if (kind === 'sponge') {   // a chunk of yellow sea sponge, full of holes
    A.soft(6, 3.6, 6, 3, ['#7a5418', '#a88030', '#d8b050', '#f0d890', '#fff4cc']);
  } else if (kind === 'conch') {   // a pink conch, its spiral and lip
    A.fill(0, 0, 14, 8, (x, y) => { const u = (x - 6) / 6, v = (y - 4) / 3.6, d = u * u + v * v; if (d > 1) return null; const r = Math.hypot(x - 5, y - 3.6), a = Math.atan2(y - 3.6, x - 5); return Math.abs(((r - a * 0.5 + 20) % 1.6) - 0.8) < 0.14 ? '#b07058' : softTone(['#b07058', '#d89078', '#f0c8b0', '#ffe4d8', '#fff8f4'], -0.5 * u - 0.7 * v + (1 - d) * 0.5); });
  } else if (kind === 'clam') {   // a clam, gaping: navy shell and its pearly inside
    A.soft(3.8, 2.6, 3.2, 1.9, ['#1c2440', '#2a3660', '#3a4a78', '#5a6aa0', '#8a9ac8']);
    A.soft(11.4, 2.6, 3.4, 2, ['#a8a090', '#c0b8a8', '#e8e4d8', '#f6f4ee', '#ffffff']);
  } else if (kind === 'net') {   // a snarl of fishing net with a red float
    for (let i = 0; i < 5; i++) { A.line(i * 3.6, 0.4, i * 3.6 + 3.6, 4.6, '#b8c4d0', null, 0.34); A.line(i * 3.6 + 3.6, 0.4, i * 3.6, 4.6, '#b8c4d0', null, 0.34); }
    A.soft(16.6, 1.6, 1.2, 1.6, ['#7a2a20', '#a83428', '#e05040', '#ff8a70', '#ffd0c4']);
  } else if (kind === 'bag') {   // a crumpled plastic bag
    A.fill(0, 0, w, h, (x, y) => { const u = (x - w / 2) / (w / 2), v = (y - 2.2) / 1.9; return u * u + v * v <= 1 ? lerpColor('#8c909c', '#f0f2f6', clamp(0.6 - v * 0.4 + Math.sin(x * 2.2) * 0.25, 0, 1)) : null; });
  } else {   // a few smooth pebbles
    for (const [x, y, rx, ry] of [[3.6, 2.8, 3.2, 2], [9, 3, 2.6, 1.8], [6.6, 3.6, 1.8, 1.2]]) A.soft(x, y, rx, ry, ['#3a444e', '#566470', '#7a8a96', '#a8b4be', '#dce4ea']);
  }
  A.outline(pal.K || INK);
  if (kind === 'sponge') for (const [x, y] of [[3.4, 3], [6, 2.4], [8.6, 3.4], [4.8, 4.6], [7.4, 4.8]]) A.ell(x, y, 0.6, 0.5, '#7a5418');
  if (kind === 'jelly') A.ell(4.6, 2, 1.4, 0.5, '#ffffff');
  return (DEBRIS_FINE[kind] = A.canvas());
}
