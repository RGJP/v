'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-3 BAYOU BOOGIE: the band, the bayou that plays along, and its critters
// ═══════════════════════════════════════════════════════════════════════════
// Everything here keeps time with the band (bayou-music.js, game-bayou.js): g.bandFired(instrument)
// is true on the frame a hit sounds, g.bandBeat() on every beat the crickets keep, g.bandHushed()
// while MAMA HUSH has the whole bayou holding its breath.
//   ['bandmate', x, row, 'drums'|'tuba'|'trumpet']  a musician waiting to be woken (RASCAL asleep on his drum,
//                        BIG LOU stuck in his tuba, DIZZY moping on the dock): touch him and he joins the parade
//   ['drum', x, row, 'bass'|'snare', boost = 1]   a drum standing in the swamp, its skin (top at `row`) a trampoline: land on it
//                        and it bounces you straight back up (a bass drum higher than a snare; `boost` scales it), any time
//   ['valve', x, delay]  a giant tuba valve (2 wide) sticking out of the swamp: its pearl button rides the tuba's bass
//                        line `delay` beats late (low note low, high note high); sunk out of reach till the tuba plays,
//                        at rest while hushed. Jump as it pumps up for extra height
//   ['rest', x, row]     a musical rest (2 wide): only solid while the music is hushed
//   ['staff', x0, cols, ring = 12, row = 11]  a glowing music staff over a gap: once the trumpet plays, every note
//                        of its tune lights up on the staff as it sounds (C5 tops at `row`, a half tile per step of the
//                        scale) and stays solid `ring` eighths after it ends. A firefly bounces along the tune
//   ['hush', x, x0, x1]  MAMA HUSH's shack on stilts (from column x; her window 3.5 columns in): with Chickaroo between x0 and x1 she
//                        throws the shutters open when he arrives, then alternates one bar of silence with one bar of music
//   ['bopper', x, row]   toad hopping one step on every beat (frozen in a hush); stompable
//   ['skeeter', x, row]  mosquito hovering about its spot (keep it high); periodically warns (red, "!", a dotted
//                        line), dives along that line, then rests a few seconds; one dives at a time; stompable
//   ['gator', x, x1]     SNAPJAW floating in the swamp over columns x..x1 (6 wide: the head is the 2 columns at the x1
//                        end): his back and head are a raft, but his jaws gape on beat 3 and SNAP shut on 4
//   ['dance', x, x0, x1] the band's big finish: past column x they jump down off their shelf and dance over columns x0..x1
//   ['bandstand', x]     the bandshell on the levee (from column x, centred 4 columns in: put the goal there)
//   ['crowd', x0, x1, mama]  fans cheering at the foot of the levee, bobbing on the beat (MAMA HUSH among them at column mama)
const BASS_LAUNCH = 9.4, SNARE_LAUNCH = 7.6;       // drum launch speeds (fixed arcs, no hold-to-float)
const VALVE_PX = 4;                               // px of valve height per semitone above the tuba's lowest note
const STAFF_PX = 14;                              // px of staff per eighth note
const HUSH_TICKS = BAND_BAR + BAND_TPS, HUSH_GAP = BAND_BAR;   // one bar + one extra second quiet, then one bar of music
const BAND_KINDS = { drums: 'RASCAL', tuba: 'BIG LOU', trumpet: 'DIZZY' };
const BAND_COLOR = { drums: '#ff9a7a', tuba: '#9ae86a', trumpet: '#ffd166' };

// draw in a little local frame: origin at the feet (bottom centre), x pointing the way it faces
function facing(ctx, x, y, face, fn) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (face < 0) ctx.scale(-1, 1); fn(); ctx.restore();
}
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// ── the musicians (painted fine: bayou-fine.js) ─────────────────────────────
// o: { step (walk frame 0/1), hit (a note this moment), shh (frozen in a hush), sleep, sad, bob }
function drawRascal(ctx, x, y, face, o = {}) { drawBandArt(ctx, x, y + (o.bob || 0), face, rascalArt(o.step ? 1 : 0, !!o.hit, !!o.shh, !!(o.sleep || o.sad))); }
// RASCAL on his back in side profile, feet relaxed upward and mallet across his belly
function drawRascalAsleep(ctx, x, y, t) { drawBandArt(ctx, x, y, 1, rascalSleepArt(Math.round(Math.sin(t * 0.05)))); }
function drawLou(ctx, x, y, face, o = {}) { drawBandArt(ctx, x, y + (o.bob || 0), face, louArt(o.step ? 1 : 0, !!o.hit, !!o.shh, !!o.sad)); }
// Lou wedged in his tuba: the tuba lies on its side, two green legs kicking out of the bell
function drawLouStuck(ctx, x, y, t) { drawBandArt(ctx, x, y, 1, louStuckArt(Math.round(Math.sin(t * 0.4) * 3))); }
function drawDizzy(ctx, x, y, face, o = {}) { drawBandArt(ctx, x, y + (o.bob || 0), face, dizzyArt(o.step ? 1 : 0, !!o.hit, !!o.shh, !!o.sad, !!o.sit)); }
const BAND_DRAW = { drums: drawRascal, tuba: drawLou, trumpet: drawDizzy };

// ── a musician waiting to be found ──────────────────────────────────────────
const BAND_HELLO = {
  drums: ["Yahoo let's get the band together and get the party going!"],
  tuba: ['THANK YA, KID! I WENT IN AFTER A FLY.'],
  trumpet: ['A WHOLE BAND?! OH YEAH! STAND BACK, I GO HIGH!'],
};
class Bandmate extends Enemy {
  constructor(col, row, kind) {
    super(col * TILE, (row + 1) * TILE - 28, kind === 'tuba' ? 46 : 24, 28);
    if (kind === 'tuba') { this.x = col * TILE - 6; this.y = (row + 1) * TILE - 22; this.h = 22; }
    this.kind = kind; this.col = col;
    this.passive = this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.speakerName = BAND_KINDS[kind];
  }
  hitbox() { return this.kind === 'tuba' ? { x: this.x, y: this.y + this.h - 30, w: 58, h: 31 } : this; }
  // Lou's pickup follows the visible tuba, hat and kicking feet, with no invisible step above him.
  touches(p) { return overlap(this.kind === 'tuba' ? this.hitbox() : { x: this.x - 2, y: this.y - 56, w: this.w + 4, h: this.h + 58 }, p); }
  onTouch(g, p) {
    if (this.remove) return;
    this.remove = true;
    const fx = this.x + this.w / 2, fy = this.y + this.h;
    if (this.kind === 'tuba') {   // FWOOMP: out he pops
      Sound.play('pop'); g.burst(this.x + this.w, this.y + 10, ['#f0b030', '#ffe8a0', '#8ccf5a'], 14);
      g.popup(this.x + this.w, this.y - 8, 'FWOOMP!', '#ffe8a0');
      if (p.vy > 0 && p.y + p.h < this.y + 10) g.bounce(p);
    } else if (this.kind === 'drums') { Sound.play('drum'); g.popup(fx, this.y - 6, 'BOOM!', '#ff9a7a'); if (p.vy > 0) g.bounce(p); }
    g.joinBand(this.kind, this.kind === 'tuba' ? this.x + this.w + 6 : fx, fy, this);
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.kind === 'tuba' && this.t % 150 === 40 && Math.abs(p.x - this.x) < 9 * TILE) g.popup(this.x + this.w - 4, this.y - 6, oneOf(['MMF!', 'MMFF! MMF!', 'HELP!']), '#9ae86a');
    if (this.kind === 'drums' && g.band.fresh && g.band.f % BAND_BAR === 0 && Math.abs(this.x - g.camX - VIEW_W / 2) < VIEW_W * 0.6) Sound.play('snore');
    if (this.kind === 'drums' && this.t % 60 === 0) g.particles.push({ kind: 'text', x: this.x + this.w / 2 + 8, y: this.y + this.h - 14, vx: 0.3, vy: -0.4, life: 50, t: 0, text: 'Z', color: '#c8c4d2' });
    if (this.kind === 'trumpet' && this.t % 200 === 60 && Math.abs(p.x - this.x) < 9 * TILE) g.popup(this.x + 12, this.y - 8, oneOf(['*SIGH*', 'NO BAND...', '*SNIFF*']), '#ffd166');
  }
  draw(ctx, g) {
    const fx = this.x + this.w / 2, fy = this.y + this.h;
    if (this.kind === 'drums') drawRascalAsleep(ctx, fx, fy, this.t);   // flat on his back on his drum, snoring
    else if (this.kind === 'tuba') drawLouStuck(ctx, this.x + 22, fy, this.t);
    else drawDizzy(ctx, fx, fy, -1, { sit: true });
  }
}

// ── a drum standing in the swamp ────────────────────────────────────────────
class Drumhead {
  constructor(col, row, kind = 'bass', boost = 1) {
    this.kind = kind; this.boost = boost;   // (a launch-speed multiplier: a bouncier skin)
    this.w = kind === 'bass' ? 40 : 28; this.h = 8;
    this.x = col * TILE + (kind === 'bass' ? -4 : 2); this.y = row * TILE; this.prevY = this.y; this.dx = 0; this.dy = 0;
    this.thump = 0; this.rode = false; this.t = 0;
  }
  update(g) {
    this.t++; this.prevY = this.y;
    if (this.thump > 0) this.thump--;
    const p = g.player, riding = p.platform === this && p.state === 'play', landed = riding && !this.rode;
    this.rode = riding;
    if (!landed) return;
    // BOOM: land on the skin and it bounces him straight back up (no waiting for the beat) -- holding jump
    // (or pressing it just before / after landing) bounces him higher like other trampolines & stomps
    this.thump = 10; this.rode = false;
    Sound.play(this.kind === 'bass' ? 'drum' : 'tom');
    g.ring(this.x + this.w / 2, this.y, this.kind === 'bass' ? '#ffb0a0' : '#a8d0ff');
    const held = Input.down('jump') || Input.down('up') || g.t - p.pressT <= STOMP_EARLY;
    p.vy = -(this.kind === 'bass' ? BASS_LAUNCH : SNARE_LAUNCH) * this.boost * (held ? 0.88 : 1);
    p.stompT = g.t; p.stompSmall = !held; p.stompY = this.y - p.h;
    p.onGround = false; p.platform = null; p.coyote = 0; p.jumpBuf = 0;
    p.jumping = held; p.holdGrace = held ? 34 : 0; p.springAir = true; p.airMax = Math.max(RUN_MAX, Math.abs(p.vx)); p.flaps = 0;
    p.sx = 0.75; p.sy = 1.3;
    g.dust(p.x + p.w / 2, this.y, 4);
  }
  draw(ctx, th, g) {   // (painted fine: drumArt, bayou-fine.js)
    const x = Math.round(this.x), w = this.w, bass = this.kind === 'bass', dip = this.thump > 6 ? 2 : this.thump > 0 ? 1 : 0;
    const top = Math.round(this.y) + dip, shellH = bass ? 18 : 12;
    // the stand: a stout post down into the swamp (or onto the ground it stands on)
    if (this.foot == null && g) { const c = Math.floor((x + w / 2) / TILE); this.foot = VIEW_H; for (let r = Math.floor(this.y / TILE) + 1; r < ROWS; r++) if (g.level.solid(c, r)) { this.foot = r * TILE; break; } }
    const bot = top + 3 + shellH + 2, foot = this.foot == null ? VIEW_H : this.foot;
    if (foot > bot) {
      fRect(ctx, x + w / 2 - 3, bot, 6, foot - bot, INK);
      const gr = ctx.createLinearGradient(x + w / 2 - 2.3, 0, x + w / 2 + 2.3, 0); gr.addColorStop(0, '#a8844a'); gr.addColorStop(0.4, '#7a5a32'); gr.addColorStop(1, '#4a3018');
      ctx.fillStyle = gr; ctx.fillRect(x + w / 2 - 2.33, bot, 4.67, foot - bot);
    }
    ctx.drawImage(drumArt(bass, w, dip), x - 1, Math.round(this.y) - 1);
  }
}

// ── a giant tuba valve ──────────────────────────────────────────────────────
class Valve {
  constructor(col, delay = 0) {
    this.x = col * TILE; this.w = 32; this.h = 8; this.delay = delay;
    this.rest = 12 * TILE; this.sunk = 14 * TILE + 4;
    this.y = this.sunk; this.prevY = this.y; this.dx = 0; this.dy = 0;
    this.lift = 1.1;   // jumping off it as it pumps up adds its speed to the jump
  }
  update(g) {
    this.prevY = this.y;
    const b = g.band, f = b.f - this.delay * BAND_BEAT;
    let want;
    if (!g.bandOn('tuba', b.f)) want = g.bandHushed() && b.joined.has('tuba') ? this.rest : this.sunk;
    else {
      const s = Math.floor((((f % (BAND_LOOP * BAND_SPF)) + BAND_LOOP * BAND_SPF) % (BAND_LOOP * BAND_SPF)) / BAND_SPF);
      want = this.rest - (bandTubaAt(s) - BAND_LOW) * VALVE_PX;
    }
    const d = want - this.y;
    this.y += clamp(d * 0.3, -5, 5);
    if (Math.abs(want - this.y) < 0.3) this.y = want;
    this.dy = this.y - this.prevY;
  }
  draw(ctx) {   // (in fine pixels: hires.js)
    const x = Math.round(this.x), y = this.y, w = this.w;
    if (y > VIEW_H) return;
    // the brass stem down into the swamp, collar rings, and the pearl finger button on top
    const brass = (x0, ww) => { const gr = ctx.createLinearGradient(x0, 0, x0 + ww, 0); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(0.3, '#e8a82a'); gr.addColorStop(0.8, '#b07818'); gr.addColorStop(1, '#7a4e10'); return gr; };
    fRect(ctx, x + 10.33, y + 6, 11.33, VIEW_H - y, INK); ctx.fillStyle = brass(x + 11, 10); ctx.fillRect(x + 11, y + 6, 10, VIEW_H - y);
    for (let yy = y + 14; yy < VIEW_H; yy += 22) { fRoundRect(ctx, x + 7, yy, 18, 4, 1.4, INK); ctx.fillStyle = brass(x + 7.67, 16.67); fRoundRect(ctx, x + 7.67, yy + 2 / 3, 16.67, 2.67, 1, ctx.fillStyle); fRect(ctx, x + 8.4, yy + 1, 15, 1 / 3, '#fff0b0'); }
    fRoundRect(ctx, x + 5, y + 4.67, 22, 3.33, 1.2, INK); fRoundRect(ctx, x + 5.67, y + 5, 20.67, 2.33, 1, '#9a6414');
    fRoundRect(ctx, x - 1, y - 1, w + 2, 8, 3, INK);
    const pg = ctx.createLinearGradient(0, y, 0, y + 6); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.3, '#f2ead8'); pg.addColorStop(1, '#c8b898');
    fRoundRect(ctx, x - 1 / 3, y - 1 / 3, w + 2 / 3, 6.67, 2.6, pg);   // the pearl button
    fEll(ctx, x + 8, y + 1.6, 4, 0.6, '#ffffff'); fEll(ctx, x + 25, y + 3.6, 3, 0.45, '#e8dcc0');
  }
}

// ── a rest: solid silence ───────────────────────────────────────────────────
class RestBlock {
  constructor(col, row) {
    this.x = col * TILE; this.y = row * TILE; this.w = 32; this.h = 8; this.prevY = this.y; this.dx = 0; this.dy = 0;
    this.ghost = true; this.on = 0;
  }
  update(g) {
    this.ghost = !g.bandHushed();
    this.on = this.ghost ? Math.max(0, this.on - 0.15) : Math.min(1, this.on + 0.2);
    this.warn = !this.ghost && g.hushEnding();
  }
  draw(ctx, th, g) {   // (in fine pixels: hires.js)
    const x = this.x, y = this.y, t = (g && g.t) || 0;
    // the staff line it sits on, and the rest itself: a solid black half-rest bar
    if (this.on < 0.05) {
      ctx.globalAlpha = 0.45;
      for (let i = 0.5; i < this.w; i += 3) { fRoundRect(ctx, x + i, y + 1 / 3, 1.6, 2 / 3, 0.3, '#b8a8e8'); fRoundRect(ctx, x + i, y + 6, 1.6, 2 / 3, 0.3, '#b8a8e8'); }
      fRect(ctx, x + 1 / 3, y, 2 / 3, 7, '#b8a8e8'); fRect(ctx, x + this.w - 1, y, 2 / 3, 7, '#b8a8e8');
      ctx.globalAlpha = 1; return;
    }
    ctx.globalAlpha = this.warn && (t >> 2) % 2 ? 0.5 : this.on;
    fRect(ctx, x - 3, y + 7, this.w + 6, 2 / 3, '#d8c8ff');
    fRoundRect(ctx, x - 1, y - 1, this.w + 2, 9, 1.6, '#d8c8ff'); fRoundRect(ctx, x - 1 / 3, y - 1 / 3, this.w + 2 / 3, 7.67, 1.2, INK);
    fRect(ctx, x + 1, y + 2 / 3, this.w - 2, 2 / 3, '#4a3a6a');
    ctx.globalAlpha = 1;
  }
}

// ── the staff: the trumpet's tune as a bridge ───────────────────────────────
const NOTE_POS = { 72: 0, 74: 1, 76: 2, 77: 3, 79: 4, 81: 5, 82: 6, 84: 7, 86: 8 };   // C5..D6 in F major: steps up the scale
class NotePlat {
  constructor(staff, e, born) {
    this.staff = staff; this.e = e; this.born = born;
    this.x = staff.sx(e.s % 32); this.w = e.d * STAFF_PX - 3; this.h = 6;
    this.y = staff.ny(e.m); this.prevY = this.y; this.dx = 0; this.dy = 0;
    this.end = born + (e.d + staff.ring) * BAND_SPF;
  }
  update(g) {
    this.prevY = this.y;
    const left = this.end - g.band.f;
    if (left <= 0) { this.remove = true; g.sparkle(this.x + 4, this.y + 2); }
    this.fading = left < 36;
  }
  draw(ctx, th, g) {
    const t = (g && g.t) || 0, age = g ? g.band.f - this.born : 99;
    if (this.fading && (t >> 2) % 2) ctx.globalAlpha = 0.45;
    drawNote(ctx, this.x, this.y, this.w, this.e.m, age < 6 ? 1 : 0);
    ctx.globalAlpha = 1;
  }
}
// a lit note: a golden note head with its stem, and a glowing ribbon for as long as it's held
function drawNote(ctx, x, y, w, m, flash) {   // (in fine pixels: hires.js)
  x = Math.round(x); y = Math.round(y);
  const hi = (NOTE_POS[m] || 0) >= 5;   // high notes hang their stems down
  ctx.save();ctx.globalAlpha*=.2;
  fRoundRect(ctx, x, y - 1, w, 7, 2.4, INK);
  const gr = ctx.createLinearGradient(0, y, 0, y + 5); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.4, flash ? '#ffffff' : '#ffb84a'); gr.addColorStop(1, flash ? '#fff0d0' : '#e08a2a');
  fRoundRect(ctx, x + 2 / 3, y + 1 / 3, w - 4 / 3, 4.33, 2, gr);
  ctx.restore();
  // Fill the head and stem as a single silhouette, then a single gold interior. Neither
  // outline can cut across the other, and fading notes have no doubled dark overlap.
  ctx.beginPath(); ctx.ellipse(x + 4, y + 3, 4.4, 3.4, -0.35, 0, Math.PI * 2);
  if (hi) ctx.rect(x - 0.4, y + 2, 1.8, 15);
  else ctx.rect(x + 6.4, y - 12, 1.8, 15.5);
  ctx.fillStyle = INK; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 4, y + 3, 3.4, 2.5, -0.35, 0, Math.PI * 2);
  if (hi) ctx.rect(x + 0.13, y + 2.5, 2 / 3, 13.7);
  else ctx.rect(x + 7, y - 11.4, 2 / 3, 14.4);
  ctx.fillStyle = flash ? '#ffffff' : '#ffd166'; ctx.fill();
  ctx.save(); ctx.translate(x + 4, y + 3); ctx.rotate(-0.35);
  fEll(ctx, -1.2, -1, 1.3, 0.6, '#ffffff'); ctx.restore();
}
class NoteStaff extends Enemy {
  constructor(col, cols, ring = 12, row = 11) {
    super(col * TILE, 0, cols * TILE, VIEW_H);
    this.x0 = col * TILE; this.cols = cols; this.ring = ring; this.base = row * TILE;
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  sx(s) { return this.x0 + 18 + s * STAFF_PX; }   // where eighth s of a phrase sits
  ny(m) { return this.base - (NOTE_POS[m] || 0) * 8; }
  update(g) {
    this.t++;
    const b = g.band;
    if (!b || !g.bandOn('trumpet', b.f)) return;
    if (this.x0 > g.camX + VIEW_W + 200 || this.x0 + this.w < g.camX - 200) return;
    for (const e of g.bandNow()) if (e.part === 'trumpet') g.platforms.push(new NotePlat(this, e, b.f));
  }
  draw(ctx, g) {
    const x0 = this.x0, x1 = this.x0 + this.w, live = g.band && g.bandOn('trumpet', g.band.f);
    // five glowing staff lines
    ctx.globalAlpha = live ? 0.55 : 0.25;
    for (let i = 0; i < 5; i++) fRect(ctx, x0, this.base + 3 - i * 16, this.w, 2 / 3, '#c8b8ff');   // (fine: hires.js)
    fRect(ctx, x0, this.base + 3 - 64, 2 / 3, 64.67, '#c8b8ff'); fRect(ctx, x1 - 2 / 3, this.base + 3 - 64, 2 / 3, 64.67, '#c8b8ff'); fRect(ctx, x1 - 4, this.base + 3 - 64, 5 / 3, 64.67, '#c8b8ff');
    ctx.globalAlpha = 1;
    if (!live) return;
    // the rest of this phrase, coming up: faint outlines
    const lf = ((g.band.f % (BAND_LOOP * BAND_SPF)) + BAND_LOOP * BAND_SPF) % (BAND_LOOP * BAND_SPF), cur = lf / BAND_SPF;
    const ph = Math.floor(cur / 32) * 32;
    ctx.globalAlpha = 0.35;
    for (const e of BAND_NOTES) {
      if (e.s < ph || e.s >= ph + 32 || bandStepFrame(e.s) <= lf) continue;
      const x = this.sx(e.s - ph), y = this.ny(e.m), w = e.d * STAFF_PX - 3;
      for (let i = 0; i < w; i += 2) { fRect(ctx, x + i, y + 1 / 3, 1, 1 / 3, '#fff3b0'); fRect(ctx, x + i, y + 5, 1, 1 / 3, '#fff3b0'); }
    }
    ctx.globalAlpha = 1;
    // the firefly hops from note to note with the tune
    const at = BAND_NOTES.filter(e => e.s >= ph && e.s < ph + 32 && e.s <= cur);
    const e = at[at.length - 1];
    if (!e) return;
    const k = clamp((cur - e.s) / Math.max(1, e.d), 0, 1), next = BAND_NOTES.find(n => n.s > e.s && n.s < ph + 32);
    const xa = this.sx(e.s - ph) + 4, ya = this.ny(e.m), xb = next ? this.sx(next.s - ph) + 4 : xa + e.d * STAFF_PX, yb = next ? this.ny(next.m) : ya;
    const fx = xa + (xb - xa) * k, fy = ya + (yb - ya) * k - Math.sin(k * Math.PI) * 12 - 5;
    ctx.globalAlpha = 0.35; blob(ctx, fx, fy, 5, '#e8ff7a'); ctx.globalAlpha = 1;
    fBlob(ctx, fx, fy, 2, '#f4ffc0'); fBlob(ctx, fx - 0.6, fy - 2.6, 0.5, '#ffffff');
  }
}
// ── MAMA HUSH ───────────────────────────────────────────────────────────────
const HUSH_LINES = ['HUSH!', 'IT IS A SCHOOL NIGHT!', 'I KNOW THAT TUBA, LOUIS!', 'IS THAT... A CHICKEN?!', 'SHHHHHH!', "DON'T MAKE ME COME DOWN THERE!", 'NOT ONE MORE TOOT!'];
// MAMA HUSH: an elderly mouse in her nightgown, cigarette drooping from her mouth
function drawMamaGesture(ctx,mx,my,t){ctx.drawImage(mamaWindowGestureArt(Math.round(Math.sin(t*.6)*2)),Math.round(mx)-20,Math.round(my)-30);}
function drawMamaHush(ctx,mx,my,t,foreground=true){ctx.drawImage(mamaWindowArt(Math.round(Math.sin(t*.6)*2)),Math.round(mx)-20,Math.round(my)-30);if(foreground){drawMamaGesture(ctx,mx,my,t);drawMamaSmoke(ctx,mx+MAMA_CIG_X,my+MAMA_CIG_Y,t);}}   // (painted fine: bayou-fine.js)
const HUSH_POP = { x: 8, y: 6, w: 30, h: 26 };   // her pop-in window, top left of the screen (screen px)
class MamaHush extends Enemy {
  constructor(col, x0, x1) {
    super(col * TILE, 0, 112, 10 * TILE);
    this.wx = col * TILE + 56; this.x0 = x0 * TILE; this.x1 = x1 * TILE;   // (the window is 3.5 columns in)
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.speakerName = 'MAMA HUSH';
    this.open = 0; this.said = 0; this.pop = 0; this.arrived = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const b = g.band, f = b.f;
    const p = g.player, near = p.x + p.w > this.x0 && p.x < this.x1;
    // Book the first interruption on a beat with enough lead for the audio scheduler.
    if (near && !this.arrived && b.fresh) {
      this.arrived = true;
      this.nextHush = (Math.floor((f + BAND_LOOK) / BAND_BEAT) + 1) * BAND_BEAT;
    }
    // After each hush, give the band one full bar before the next. Queue it a bar ahead.
    if (near && b.fresh && this.nextHush != null && this.nextHush - f <= BAND_BAR) {
      const from = this.nextHush > f + BAND_LOOK ? this.nextHush : (Math.floor((f + BAND_LOOK) / BAND_BEAT) + 1) * BAND_BEAT;
      b.hushes.push([from, from + HUSH_TICKS]);
      this.nextHush = from + HUSH_TICKS + HUSH_GAP;
      b.hushes = b.hushes.filter(h => h[1] > f - BAND_BAR * 8);
    }
    const hushed = g.bandHushed(), soon = b.hushes.some(h => h[0] > f && h[0] - f <= BAND_BEAT);
    this.rattle = soon && f % 8 < 4;
    if (this.rattle && b.fresh && f % 8 === 0) Sound.play('shutter');
    const want = hushed ? 1 : 0;
    if (want && !this.open) { Sound.play('shutterOpen'); this.yell(g); }
    if (!want && this.open >= 1 && this.wasOpen) { Sound.play('shutterSlam'); if (this.away(g)) g.popup(g.camX + HUSH_POP.x + HUSH_POP.w + 6 + 60, HUSH_POP.y + 18 - (g.lift || 0), '...AND STAY QUIET!', '#ffb0d8', 90); else g.popup(this.wx, 4 * TILE, '...AND STAY QUIET!', '#ffb0d8', 90); }
    this.wasOpen = want;
    this.open = want ? Math.min(1, this.open + 0.2) : Math.max(0, this.open - 0.25);
    // her shack's off screen (he's gone on ahead): she pops in at the top left of the view instead
    this.pop += ((hushed && this.away(g) ? 1 : 0) - this.pop) * 0.18;
    if (this.pop < 0.01) this.pop = 0;
  }
  away(g) { return this.wx < g.camX - 24 || this.wx > g.camX + VIEW_W + 24; }
  yell(g) {
    if (!this.said) g.speak(this, "HUSH! SOME OF US GOT WORK IN THE MORNIN'!", '#ffb0d8');
    else if (this.away(g)) g.popup(g.camX + HUSH_POP.x + HUSH_POP.w + 6 + 60, HUSH_POP.y + 18 - (g.lift || 0), HUSH_LINES[(this.said - 1) % HUSH_LINES.length], '#ffb0d8', 90);   // (beside her pop-in)
    else g.popup(this.wx, 3 * TILE + 4, HUSH_LINES[(this.said - 1) % HUSH_LINES.length], '#ffb0d8', 90);
    this.said++;
  }
  draw(ctx, g) {   // (the shack painted fine: shackArt, bayou-fine.js; the window, shutters and light live, fine)
    const cx = this.wx, t = this.t;
    const L = cx - 44, R = cx + 44, top = 3 * TILE - 4, floor = 7 * TILE;
    ctx.drawImage(shackArt(), cx - 64, top);
    if (floor + 40 < VIEW_H) for (const sx of [L + 6, L + 40, R - 10]) { fRect(ctx, sx - 2 / 3, top + 112, 5.33, VIEW_H - top - 112, INK); fRect(ctx, sx, top + 112, 4, VIEW_H - top - 112, '#5a4430'); }   // (stilts on down)
    // the porch light: a bare bulb with moths
    fGlow(ctx, R - 8, top + 15, 16, '#fff3b0', 0.3); fBlob(ctx, R - 8, top + 13, 3, '#fff3b0'); fBlob(ctx, R - 8.6, top + 12.4, 1.2, '#ffffff');
    for (let i = 0; i < 2; i++) fBlob(ctx, R - 8 + Math.sin(t * 0.13 + i * 3) * 6, top + 13 + Math.cos(t * 0.17 + i * 2) * 5, 0.6, '#ffffff');
    // the window: dark (and the shutters closed) until she throws them open
    const wx = cx - 13, wy = top + 26, ww = 26, wh = 22, lit = this.open > 0;
    fRoundRect(ctx, wx - 2, wy - 2, ww + 4, wh + 4, 1.2, INK);
    if (lit) { const gr = ctx.createRadialGradient(cx, wy + wh / 2, 2, cx, wy + wh / 2, 18); gr.addColorStop(0, '#fff4c0'); gr.addColorStop(1, '#f0c060'); ctx.fillStyle = gr; ctx.fillRect(wx, wy, ww, wh); }
    else fRect(ctx, wx, wy, ww, wh, '#2a2238');
    const mamaY = wy + wh + 2 - this.open * 6;
    if (lit) { drawMamaHush(ctx, cx, mamaY, t, false); if (this.open < .8) drawMamaGesture(ctx, cx, mamaY, t); }
    else fBlob(ctx, wx + 4, wy + 5, 1, '#4a3a5a');
    // shutters: closed in front of the window, or flung open to the sides (rattling just before)
    const rat = this.rattle ? ((t >> 1) % 2 ? 1 : -1) : 0, o = this.open;
    const shutter = (sx0, sw) => {
      fRect(ctx, sx0 - 2 / 3, wy - 2 / 3, sw + 4 / 3, wh + 4 / 3, INK);
      const gr = ctx.createLinearGradient(sx0, 0, sx0 + sw, 0); gr.addColorStop(0, '#5ab0a0'); gr.addColorStop(1, '#2a6a5a');
      ctx.fillStyle = gr; ctx.fillRect(sx0, wy, sw, wh);
      for (let y = wy + 3; y < wy + wh; y += 4) fRect(ctx, sx0, y, sw, 2 / 3, '#24584a');   // louvres
    };
    for (const sd of [-1, 1]) {
      const sw = Math.max(2, ww / 2 * (1 - o)), sx0 = sd < 0 ? wx + rat : wx + ww - sw - rat;
      shutter(sx0, sw);
      if (o > 0.5) shutter(sd < 0 ? wx - 12 : wx + ww + 2, 10);
    }
    // Once the shutters swing clear, her hand and rolling pin project in front of the frame.
    if (o >= .8) drawMamaGesture(ctx, cx, mamaY, t);
    if (lit) drawMamaSmoke(ctx, cx + MAMA_CIG_X, mamaY + MAMA_CIG_Y, t);
  }

  // her pop-in: a little lit window with its shutters flung wide, sliding down from the top left
  // (drawn in the pass over the player, so nothing covers it)
  drawOverSand(ctx, g) {
    if (!this.pop) return;
    const e = this.pop * this.pop * (3 - 2 * this.pop), P = HUSH_POP, x = Math.round(g.camX + P.x), y = Math.round(P.y - (P.h + P.y + 4) * (1 - e) - (g.lift || 0));
    for (const sd of [-1, 1]) {   // the shutters
      const sx = sd < 0 ? x - 10 : x + P.w;
      px(ctx, sx - 1, y - 1, 12, P.h + 2, INK); px(ctx, sx, y, 10, P.h, '#3a8a7a');
      for (let yy = y + 3; yy < y + P.h; yy += 4) px(ctx, sx, yy, 10, 1, '#2a6a5a');
    }
    px(ctx, x - 2, y - 2, P.w + 4, P.h + 4, INK); px(ctx, x, y, P.w, P.h, '#ffe08a');
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, P.w, P.h); ctx.clip();
    const mx=x+P.w/2, my=y+P.h+2;
    drawMamaHush(ctx, mx, my, this.t, false);
    ctx.restore();
    // Only her body stays inside the window: the rolling pin and ridiculous smoke spill out.
    drawMamaGesture(ctx,mx,my,this.t);
    ctx.save();ctx.globalAlpha*=e;
    drawMamaSmoke(ctx,mx+MAMA_CIG_X,my+MAMA_CIG_Y,this.t,2-(g.lift||0));
    ctx.restore();
  }
}

// ── critters ────────────────────────────────────────────────────────────────
// Bopper: a toad that hops one step on every beat
class Bopper extends Enemy {
  constructor(col, row) {
    super(col * TILE + 2, (row + 1) * TILE - 11, 13, 11);
    this.dir = -1; this.walker = true; this.sac = 0; this.hops = 0;
  }
  update(g) {
    this.t++;
    if (this.sac > 0) this.sac--;
    if (g.bandBeat() && this.onGround) {
      // look before leaping: no hopping off a ledge or into a wall
      const lv = g.level, ahead = Math.floor((this.cx + this.dir * 14) / TILE), feet = Math.floor((this.y + this.h + 2) / TILE);
      if (lv.solid(ahead, Math.floor((this.y + 4) / TILE)) || (!lv.solid(ahead, feet) && lv.get(ahead, feet) !== T.SEMI)) this.dir = -this.dir;
      if (++this.hops % 4 === 0) { this.sac = 14; }   // a big croak every bar
      else { this.vy = -3.1; this.vx = this.dir * 0.92; this.onGround = false; }
    }
    if (this.onGround && this.vy === 0) this.vx = 0;
    this.walk(g, false);
  }
  draw(ctx) {   // (painted fine: bopperArt, bayou-fine.js)
    drawFlipped(ctx, this, () => drawCritArt(ctx, this.cx, this.y + this.h, this.dir, bopperArt(!this.onGround ? 1 : 0, this.sac > 0 ? (this.sac > 10 ? 1 : this.sac > 4 ? 2 : 1) : 0)));
  }

}
// Skeeter: a mosquito hovering high up, out of the way. Periodically, on a downbeat, it gives
// fair warning: it stops dead, flushes red, a "!" pops up and a dotted line
// shows where it's going -- then it dives along that line, hangs there a good second and a half (stomp it!), and flies home for a good rest before it'll
// try again. Only one mosquito dives at a time.
const SKEET_TELL = 42, SKEET_DIVE = 2.3, SKEET_DIVE_T = 34, SKEET_LINGER = 90, SKEET_REST = 200;
class Skeeter extends Enemy {
  constructor(col, row) {
    super(col * TILE + 2, row * TILE + 4, 12, 9);
    this.hx = this.x; this.hy = this.y; this.state = 'hover'; this.st = 0; this.face = -1; this.rest = 60;
  }
  update(g) {
    this.t++; this.st++;
    if (this.rest > 0) this.rest--;
    const p = g.player, dx = p.x + p.w / 2 - this.cx, dy = p.y + p.h / 2 - (this.y + 4);
    if (this.state === 'hover') {
      this.x += (this.hx + Math.sin(this.t * 0.05) * 8 - this.x) * 0.08;
      this.y += (this.hy + Math.sin(this.t * 0.11) * 4 - this.y) * 0.08;
      this.face = dx < 0 ? -1 : 1;
      const busy = g.entities.some(e => e instanceof Skeeter && e !== this && !e.dead && !e.remove && (e.state === 'aim' || e.state === 'dive'));
      if (!this.rest && !busy && g.bandBar() && p.state === 'play') {
        this.state = 'aim'; this.st = 0; Sound.play('whine');
      }
    } else if (this.state === 'aim') {
      // the tell: it locks on where he is now (the dive won't follow him), backs off a touch and shakes
      if (this.st === 1) { const d = Math.hypot(dx, dy) || 1; this.vx = dx / d * SKEET_DIVE; this.vy = dy / d * SKEET_DIVE; this.face = dx < 0 ? -1 : 1; }
      if (this.st < 14) { this.x -= this.vx * 0.12; this.y -= this.vy * 0.12; }
      if (this.st >= SKEET_TELL) { this.state = 'dive'; this.st = 0; Sound.play('zip'); }
    } else if (this.state === 'dive') {
      this.x += this.vx; this.y += this.vy;
      if (this.st >= SKEET_DIVE_T) { this.state = 'linger'; this.st = 0; }
    } else if (this.state === 'linger') {
      // it hangs about where the dive ended for a moment (a little buzzing bob), before heading home
      this.y += Math.sin(this.st * 0.4) * 0.3;
      if (this.st >= SKEET_LINGER) { this.state = 'home'; this.st = 0; }
    } else {
      const hx = this.hx - this.x, hy = this.hy - this.y, d = Math.hypot(hx, hy);
      if (d < 3) { this.state = 'hover'; this.rest = SKEET_REST; }
      else { this.x += hx / d * 1.2; this.y += hy / d * 1.2; this.face = hx < 0 ? -1 : 1; }
    }
    if (this.x + this.w < g.camX - 200) this.remove = true;
  }
  draw(ctx) {   // (painted fine: skeeterArt, bayou-fine.js)
    const aim = this.state === 'aim', k = aim ? this.st / SKEET_TELL : 0, shake = aim && this.st > 14 ? ((this.t >> 1) % 2 ? 1 : -1) : 0;
    // the line it's about to dive along: dots marching out, filling in as the moment comes
    if (aim && this.st > 4) {
      const n = 6, ox = this.cx, oy = this.y + 4;
      for (let i = 1; i <= n; i++) {
        if (i / n > k * 1.3) break;
        const d = i * SKEET_DIVE * SKEET_DIVE_T / n, x = ox + this.vx / SKEET_DIVE * d, y = oy + this.vy / SKEET_DIVE * d;
        fBlob(ctx, x + 0.5, y + 0.5, 1.5, INK); fBlob(ctx, x + 0.5, y + 0.5, 0.8, (this.t >> 2) % 2 ? '#ff5d73' : '#ffd0d6');
      }
    }
    if (aim) {   // "!": up the moment it locks on
      const bob = Math.min(4, this.st >> 1);
      drawText(ctx, '!', Math.round(this.cx) - 2, Math.round(this.y) - 14 - bob, '#ff5d73', { shadow: INK });
    }
    const hot = aim && (this.t >> 2) % 2 ? 1 : 0, wing = (this.t >> (aim ? 0 : 1)) % 2;   // wings buzz faster, body flushes red
    drawFlipped(ctx, this, () => drawCritArt(ctx, this.cx + shake, this.y + this.h, this.face, skeeterArt(wing, hot, this.state === 'dive' ? 1 : 0)));
  }

}
// SNAPJAW: a gator floating in the swamp -- his back's a raft; his jaws gape on 3 and snap on 4
class Snapjaw {
  constructor(col, col1) {
    this.dir = col1 >= col ? 1 : -1;
    const left = Math.min(col, col1);
    this.x0 = left * TILE; this.bodyW = 4 * TILE;
    this.x = this.dir > 0 ? this.x0 : this.x0 + 2 * TILE; this.w = this.bodyW;
    this.y = 12 * TILE + 2; this.h = 8; this.prevY = this.y; this.dx = 0; this.dy = 0;
    this.headX = this.dir > 0 ? this.x0 + this.bodyW : this.x0;
    this.jaw = 0; this.t = 0; this.snapT = 0;
    this.head = { x: this.headX, y: this.y + 1, w: 2 * TILE, h: 8, prevY: this.y + 1, dx: 0, dy: 0, gator: this, update() {}, draw() {} };
    this.extra = [this.head];
  }
  update(g) {
    this.t++; this.prevY = this.y;
    const b = g.band, beat = Math.floor((b.f % BAND_BAR) / BAND_BEAT), quiet = g.bandHushed();
    // beat 3: the jaws creak open; beat 4: SNAP
    const want = quiet ? 0 : beat === 2 ? 1 : 0;
    if (!quiet && b.fresh && b.f % BAND_BAR === 3 * BAND_BEAT && this.jaw > 0.5) this.snap(g);
    this.jaw += (want - this.jaw) * (want ? 0.12 : 0.6);
    const bob = Math.round(Math.sin(this.t * 0.06) * 1);
    this.y = 12 * TILE + 2 + bob; this.dy = this.y - this.prevY;
    // his head is always something to stand on -- with the jaws open that's his lower jaw, inside his mouth
    const hd = this.head; hd.prevY = hd.y; hd.y = this.y + 1 + Math.round(this.jaw * 5); hd.dy = hd.y - hd.prevY;
    if (this.snapT > 0) this.snapT--;
  }
  snap(g) {
    this.snapT = 10;
    const p = g.player, mouth = { x: this.headX + 2, y: this.y - 26, w: 2 * TILE - 4, h: 34 };
    if (this.headX > g.camX - 40 && this.headX < g.camX + VIEW_W + 40) Sound.play('chomp');
    if (p.state === 'play' && overlap(mouth, p)) g.hurtPlayer();
  }
  draw(ctx, th, g) {   // (in fine pixels, the jaws painted fine: gatorJawArt, bayou-fine.js)
    const d = this.dir, y = Math.round(this.y), x0 = this.x0, W = this.bodyW;
    const bx = d > 0 ? x0 : x0 + 2 * TILE;
    // the back: a knobbly ridge just above the water, the tail trailing off behind
    const tx = d > 0 ? bx - 14 : bx + W, tip = d > 0 ? tx : tx + 14;
    fPoly(ctx, [[d > 0 ? bx + 1 : bx + W - 1, y + 1.6], [tip, y + 5], [d > 0 ? bx + 1 : bx + W - 1, y + 7.4]], INK);
    fPoly(ctx, [[d > 0 ? bx + 1 : bx + W - 1, y + 2.4], [tip + d * 1.2, y + 5], [d > 0 ? bx + 1 : bx + W - 1, y + 6.6]], '#4a6a3a');
    fRoundRect(ctx, bx - 1, y - 1, W + 2, 10, 3, INK);
    const gr = ctx.createLinearGradient(0, y, 0, y + 8); gr.addColorStop(0, '#8aaa6a'); gr.addColorStop(0.3, '#4a6a3a'); gr.addColorStop(1, '#2a4224');
    fRoundRect(ctx, bx - 1 / 3, y - 1 / 3, W + 2 / 3, 8.67, 2.6, gr);
    for (let i = 3; i < W - 3; i += 6) { fEll(ctx, bx + i + 1, y - 0.6, 2.3, 1.8, INK); fEll(ctx, bx + i + 1, y - 0.4, 1.6, 1.2, '#2a4224'); fEll(ctx, bx + i + 0.6, y - 0.9, 0.6, 0.4, '#7a9a5a'); }
    // the head: eyes on top, a long snout; the upper jaw hinges up when it gapes
    const hx = this.headX, j = this.jaw, ang = j * 0.75, eyeX = d > 0 ? hx + 2 : hx + 2 * TILE - 8;
    ctx.save(); ctx.translate(d > 0 ? hx : hx + 2 * TILE, y + 6); ctx.scale(d, 1);
    ctx.drawImage(gatorJawArt(false, j > 0.05), -2, -8);
    ctx.rotate(-ang); ctx.drawImage(gatorJawArt(true, false), -2, -8);
    ctx.restore();
    const ey = y - 4 - j * 3;
    fEll(ctx, eyeX + 3, ey + 1.4, 4, 2.8, INK); fEll(ctx, eyeX + 3, ey + 1.6, 3.2, 2, '#4a6a3a');
    fEll(ctx, eyeX + (d > 0 ? 4 : 2), ey + 1.2, 1.3, 1.3, '#ffd166'); fEll(ctx, eyeX + (d > 0 ? 4.4 : 1.6), ey + 1.2, 0.4, 1.1, INK);
  }

}

// ── the big finish ──────────────────────────────────────────────────────────
// Past column x, the band runs ahead and stacks itself against the levee at wallX: three steps up
// The dance floor: past column `x` the band jumps down off its shelf and dances with the crowd (Game.bandDance)
class DanceFloor extends Enemy {
  constructor(col, x0, x1) {
    super(col * TILE, 0, 16, VIEW_H);
    this.trigger = col * TILE; this.x0 = x0; this.x1 = x1; this.done = false;
    this.passive = this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    if (this.done || !g.band) return;
    const p = g.player;
    if (p.state !== 'play') return;
    if (p.x > this.trigger) {
      this.done = true;
      g.bandDance(this.x0, this.x1);
    }
  }
  draw() {}
}

// The bandstand: an old bandshell on the levee -- a half-dome of painted arches ringed with bulbs
// that chase on the beat, framing the golden note on its stage
class Bandstand extends Enemy {
  constructor(col) {
    super(col * TILE, 0, 136, VIEW_H);
    this.mx = col * TILE + 72;   // (its centre: the goal sits 4 columns in)
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  draw(ctx, g) {
    const cx = this.mx, floor = g.level.surfaceRow(Math.floor(cx / TILE)) * TILE;
    const beat = g.band ? Math.floor(g.band.f / BAND_BEAT) : 0, party = g.player.state === 'celebrate' || g.player.state === 'done';
    // the shell: arches from big to small, cream and powder blue, the inside in shadow
    // the shell: arches from big to small, cream and powder blue, the inside in shadow (in fine pixels: hires.js)
    const arch = (r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx - r - 0.5, floor + 1); ctx.arc(cx + 0.5, floor + 1, r + 1, Math.PI, 0); ctx.closePath(); ctx.fill(); };
    arch(63.4, INK);
    [[62, '#f4efe4'], [56, '#9ac0d8'], [50, '#f4efe4'], [44, '#9ac0d8'], [38, '#f4efe4'], [32, '#7aa0b8'], [26, '#3a3456']].forEach(([r, c]) => arch(r, c));
    for (let i = 0; i <= 16; i++) {   // bulbs round the rim, chasing on the beat (all of them blazing once the note's won)
      const a = Math.PI - i / 16 * Math.PI, x = cx + 0.5 + Math.cos(a) * 59, y = floor - Math.sin(a) * 59;
      const on = party || (i + beat) % 3 === 0, c = ['#ff5d73', '#ffd166', '#7af0ff'][i % 3];
      if (on) fGlow(ctx, x, y, 6, c, 0.5);
      fBlob(ctx, x, y, 2.2, INK); fBlob(ctx, x, y, 1.4, on ? c : '#6a6480'); if (on) fBlob(ctx, x - 0.4, y - 0.4, 0.5, '#ffffff');
    }
    // the stage boards and a skirt of bunting
    fRoundRect(ctx, cx - 66, floor - 4, 133, 5, 1.2, INK);
    const bg = ctx.createLinearGradient(0, floor - 3, 0, floor); bg.addColorStop(0, '#e8c088'); bg.addColorStop(0.4, '#c89a64'); bg.addColorStop(1, '#9a7040');
    ctx.fillStyle = bg; ctx.fillRect(cx - 65.33, floor - 3.33, 131.67, 3.67);
    for (let i = 0; i < 11; i++) { const bx = cx - 62 + i * 12; fPoly(ctx, [[bx - 0.4, floor + 0.6], [bx + 10.4, floor + 0.6], [bx + 5, floor + 6.2]], INK); fPoly(ctx, [[bx + 0.4, floor + 1], [bx + 9.6, floor + 1], [bx + 5, floor + 5.2]], ['#ff5d73', '#f4efe4', '#5a8ad8'][i % 3]); }
    g.drawGoal(ctx, g.level);   // (the golden note again, in front of the shell)
  }
}
// Fans: friendly critters cheering at the levee foot, bobbing on the beat, firefly jars held high
// (at column `mama`, MAMA HUSH watches from a wooden shelf above the approach)
class Crowd extends Enemy {
  constructor(x0, x1, mama) {
    super(x0 * TILE, 10 * TILE, (x1 - x0) * TILE, 2 * TILE);
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.mama = mama == null ? null : mama * TILE + 8; this.speakerName = 'MAMA HUSH'; this.said = 0;
    const rng = mulberry32(x0 * 31 + x1);
    this.fans = [];
    for (let x = this.x + 6; x < this.x + this.w - 6; x += 13 + Math.floor(rng() * 8)) {
      if (this.mama != null && Math.abs(x - this.mama) < 12) continue;
      this.fans.push({ x, k: Math.floor(rng() * 3), ph: Math.floor(rng() * 2), c: ['#ff5d73', '#7af0ff', '#ffd166', '#c9a8ff'][Math.floor(rng() * 4)] });
    }
    const toads = this.fans.filter(f => f.k === 0);
    if (this.mama == null && toads.length > 2) toads[1].k = 2;   // (the finale crowd: its second toad from the left is a possum, for a nicer mix)
  }
  get cx() { return this.mama != null ? this.mama : this.x + this.w / 2; }
  get talkY() { return 5 * TILE - 27; }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.mama == null) return;
    const p = g.player;
    if (!this.said && Math.abs(p.x - this.mama) < 5 * TILE) { this.said = 1; g.speak(this, '...OH, FINE. ONE SONG.', '#ffb0d8'); }
    if (this.said === 1 && (p.state === 'celebrate' || p.state === 'done')) { this.said = 2; g.popup(this.mama, 5 * TILE - 32, 'ENCORE!', '#ffb0d8', 90); }
  }
  draw(ctx, g) {
    const b = g.band, by = 12 * TILE, beat = b ? Math.floor(b.f / BAND_BEAT) : 0, inBeat = b ? b.f % BAND_BEAT : 0;
    const party = g.player.state === 'celebrate' || g.player.state === 'done';
    for (const f of this.fans) {   // (painted fine: fanArt, bayou-fine.js)
      if (f.x < g.camX - 24 || f.x > g.camX + VIEW_W + 24) continue;
      const hop = (beat + f.ph) % 2 === 0 && inBeat < 10 ? -2 - (party ? 2 : 0) : 0, y = by + hop;
      const arms = (beat + f.ph) % 2 === 0 || party ? 1 : 0;   // arms up on the beat
      ctx.globalAlpha = 0.35; fEll(ctx, f.x, by, 7, 1.2, '#0a0618'); ctx.globalAlpha = 1;   // contact shadow
      ctx.drawImage(fanArt(f.k, arms, f.k === 0 && inBeat < 8 ? 1 : 0, f.c), f.x - FAN_OX, y - FAN_OY);
      if (f.k === 2) {   // the possum's firefly jar, held high, glowing
        const jx = f.x + FAN_JAR_X, jy = y + FAN_JAR_Y - (arms ? 2 : 0);
        fGlow(ctx, jx, jy + 2, 6, '#e8efaa', 0.22 + 0.06 * Math.sin(g.t * 0.025 + f.x)); fBlob(ctx, jx, jy + 2, 0.7, '#ede8ad');
      }
    }
    if (this.mama != null) {   // MAMA HUSH, silver bun, nightgown and cigarette, tambourine going
      const happy = b && b.members.some(m => m.state === 'dance');
      const sway = happy ? Math.round(Math.sin(b.f / BAND_BEAT * Math.PI) * 3) : 0;
      const x = this.mama + sway, up = (beat % 2 === 0 && inBeat < 12) ? -4 : 0;
      const y = 5 * TILE - (happy ? Math.round(Math.abs(Math.sin(b.f / BAND_BEAT * Math.PI)) * 4) : 0);
      g.drawWoodShelf(ctx, this.mama - 22, this.mama + 22, 5 * TILE);
      ctx.drawImage(mamaShelfArt(happy ? 1 : 0, sway), x - 20, y - 38);drawMamaSmoke(ctx,x+MAMA_CIG_X,y-14.5,g.t);
      const tx = x - 13, ty = y - (happy ? 31 : 18) + up;   // the tambourine, its jingles flashing round
      fEll(ctx, tx, ty, 5.4, 5.4, INK); fEll(ctx, tx, ty, 4.6, 4.6, '#e8c088'); fEll(ctx, tx, ty, 3.2, 3.2, '#f4efe4');
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + g.t * 0.1; fBlob(ctx, tx + Math.cos(a) * 4.2, ty + Math.sin(a) * 4.2, 0.8, '#ffd166'); }
    }
  }
}

