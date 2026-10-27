'use strict';
// Part of class Game (see game.js): GameBayou -- 3-3's live band (bayou-music.js, enemies-bayou.js)
// this.band = { f, joined: Map(part -> frame it comes in), members, hushes: [[from, to], ...], claps, dance }
// A musician comes in on the next bar after he's found; MAMA HUSH's silences are booked a bar ahead
// (so the audio, scheduled a few frames early, always agrees with what the platforms do).
// Found, a musician hops up onto the band's shelf -- a thin plank pinned to the top right of the screen --
// and plays from there, in the order they joined, out of everyone's way. At the dance floor ('dance')
// they jump back down and dance with the crowd through the finale.
const SHELF_Y = 41, SHELF_R = VIEW_W - 6;   // feet line; the plank's outer edge sits one pixel inside the screen
// Visible extents from each musician's feet, facing left, including instruments and moving poses.
const SHELF_BOUNDS = { drums: { left: 16, right: 19 }, tuba: { left: 22, right: 17 }, trumpet: { left: 32, right: 12 } };
const SHELF_GAP = 3;
const SHELF_HOP = 44, BAND_DROP = 54;   // frames: hopping up onto the shelf, jumping down to the dance floor
// loop frame -> the events that sound on it
const BAND_AT = (() => {
  const m = new Map();
  for (const e of BAND_SONG) { const f = bandStepFrame(e.s); if (!m.has(f)) m.set(f, []); m.get(f).push(e); }
  return m;
})();
class BandMember {
  constructor(kind, x, y) {
    this.kind = kind; this.x = x; this.y = y; this.face = 1; this.walk = 0; this.hit = 0; this.squash = 0;
    this.speakerName = BAND_KINDS[kind];
  }
  get cx() { return this.x; }
  get talkY() { return this.y - (this.kind === 'trumpet' ? 34 : this.kind === 'tuba' ? 36 : 30); }
}
class GameBayou {
  initBand() {
    const def = this.level.def;
    if (!def.band) { this.band = null; return; }
    const p = this.player, col = Math.floor(p.x / TILE);
    this.band = { f: 0, joined: new Map(), members: [], hushes: [], claps: null, dance: null, now: null, nowF: -1 };
    // the musicians found before the spot he starts from are already in the band, up on the shelf
    for (const e of def.entities) if (e[0] === 'bandmate' && e[1] < col) this.joinBand(e[3], p.x - 10, p.y + p.h, null, true);
    this.spawnQueue = this.spawnQueue.filter(s => !(s.def[0] === 'bandmate' && s.def[1] < col));
    this.placeShelf();   // (in their places straight away: a respawn starts paused, before the band's first update)
  }
  joinBand(kind, x, y, from, quiet = false) {
    const b = this.band;
    if (!b || b.joined.has(kind)) return;
    const next = (Math.floor(b.f / BAND_BAR) + 1) * BAND_BAR;
    b.joined.set(kind, quiet ? 0 : next - b.f < BAND_BEAT * 2 ? next + BAND_BAR : next);   // (a count-in of at least two beats)
    const m = new BandMember(kind, x, y);
    b.members.push(m);
    // up he hops onto the shelf (from where he was found, in screen terms: the shelf rides with the view)
    m.state = quiet ? 'shelf' : 'hop'; m.st = 0; m.sx0 = x - this.camX; m.sy0 = y + (this.lift || 0);
    if (quiet) return;
    Sound.play('power');
    this.speak(m, BAND_HELLO[kind], BAND_COLOR[kind]);
  }
  // ---- the beat, for everything that keeps time ----
  bandHushedAt(fr) { return this.band.hushes.some(h => fr >= h[0] && fr < h[1]); }
  bandHushed() { return !!this.band && this.bandHushedAt(this.band.f); }
  hushEnding() { const f = this.band.f; return this.band.hushes.some(h => f >= h[0] && f < h[1] && h[1] - f <= BAND_BEAT); }
  bandOn(part, fr) {
    const b = this.band;
    if (!b) return false;
    if (part === 'claps') return b.claps != null && fr >= b.claps;
    if (this.bandHushedAt(fr)) return false;
    if (part === 'crickets') return true;
    const j = b.joined.get(part);
    return j != null && fr >= j;
  }
  // the band's events sounding on this very frame
  bandNow() {
    const b = this.band;
    if (!b) return [];
    if (!b.fresh) return [];   // (the clock held this frame: nothing new sounds)
    if (b.nowF !== b.f) {
      b.nowF = b.f;
      const lf = b.f % (BAND_LOOP * BAND_SPF);
      b.now = (BAND_AT.get(lf) || []).filter(e => this.bandOn(e.part, b.f));
    }
    return b.now;
  }
  bandFired(i) { return this.bandNow().some(e => e.i === i); }
  bandBeat() { return !!this.band && this.band.fresh && this.band.f % BAND_BEAT === 0 && !this.bandHushed(); }
  bandBar() { return !!this.band && this.band.fresh && this.band.f % BAND_BAR === 0 && !this.bandHushed(); }
  // a ring of sound puffing up off a drum skin
  ring(x, y, color) { this.particles.push({ kind: 'ring', x, y, vx: 0, vy: -0.4, life: 22, t: 0, color }); }

  // ---- every frame ----
  updateBand(clear = false) {
    const b = this.band, p = this.player;
    // the clock: BAND_TPS ticks a second, so most frames it moves on one tick and now and then it holds;
    // `fresh` says it moved this frame (everything that happens *on* a tick checks it, so nothing fires twice)
    b.acc = (b.acc || 0) + BAND_TPS / 60;
    const step = Math.floor(b.acc + 1e-9);
    b.acc -= step; b.f += step; b.fresh = step > 0;
    if (!clear && (p.state === 'celebrate' || p.state === 'done') && b.claps == null) b.claps = (Math.floor(b.f / BAND_BAR) + 1) * BAND_BAR;   // the crowd joins in
    const now = this.bandNow(), hushed = this.bandHushed();
    // with a recorded track for the stage, it plays instead of the live band (the band's clock still runs
    // every beat-keeping thing); MAMA HUSH's silences turn it right down (the track keeps going underneath)
    const fadeProgress = b.finale && b.finale.outro != null ? clamp((b.finale.outro - 240) / 138, 0, 1) : 0;
    const finaleFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
    if (MUSIC_FILES[this.levelMusic]) {
      Music.duck += ((hushed ? 1 : 0) - Music.duck) * (hushed ? 0.25 : 0.2);
      if (hushed && Music.duck > 0.98) Music.duck = 1;
      Music.duck = Math.max(Music.duck, finaleFade);
    } else {
      BandAudio.tick(b, (part, fr) => this.bandOn(part, fr));
      if (BandAudio.bus && Sound.ctx) BandAudio.bus.gain.setTargetAtTime(1 - finaleFade, Sound.ctx.currentTime, 0.02);
    }
    const slots = this.shelfSlots(), lift = this.lift || 0;
    b.members.forEach((m, i) => {
      m.st++;
      if (m.state === 'hop' || m.state === 'shelf') {
        const [sx, sy] = slots[i];
        if (m.state === 'hop') {   // an arc up to his place on the shelf
          const k = Math.min(1, m.st / SHELF_HOP), e = k * k * (3 - 2 * k);
          m.x = this.camX + m.sx0 + (sx - m.sx0) * e; m.y = m.sy0 + (sy - m.sy0) * e - Math.sin(k * Math.PI) * 34 - lift;
          m.face = Math.sign(sx - m.sx0) || 1;
          if (k >= 1) { m.state = 'shelf'; m.face = -1; m.squash = 6; Sound.play('hop'); }
        } else { m.x = this.camX + sx; m.y = sy - lift; m.face = -1; }   // facing back across the screen
      } else if (m.state === 'drop') {   // the leap down to the dance floor
        const k = Math.min(1, m.st / BAND_DROP), e = k * k * (3 - 2 * k);
        m.x = m.dx0 + (m.tx - m.dx0) * e; m.y = m.dy0 + (m.ty - m.dy0) * k * k - Math.sin(k * Math.PI) * 28;
        m.face = Math.sign(m.tx - m.dx0) || 1;
        if (k >= 1) { m.state = 'dance'; m.x = m.tx; m.y = m.ty; m.squash = 8; this.dust(m.x, m.y, 5); Sound.play('thud'); }
      } else if (m.state === 'dance') {   // dancing with the crowd: turning about on the beat
        if (b.f % BAND_BEAT === 0) m.face = (Math.floor(b.f / BAND_BEAT) + i) % 4 < 2 ? 1 : -1;
      }
      if (m.state === 'dance' && b.fresh && b.f % BAND_BEAT === 0 && Math.abs(m.x - this.camX - VIEW_W / 2) < VIEW_W) {
        this.particles.push({ kind: 'note', x: m.x + rand(-15, 15), y: m.y - rand(20, 40), vx: rand(-0.3, 0.3), vy: rand(-0.6, -0.35), life: 72, t: 0, color: BAND_COLOR[m.kind] });
      }
      if (m.hit > 0) m.hit--;
      if (m.squash > 0) m.squash--;
      const plays = now.some(e => e.part === m.kind && (m.kind !== 'drums' || e.i === 'bd' || e.i === 'sn'));
      if (plays) {
        m.hit = 7;
        if (m.state !== 'dance' && m.kind !== 'drums' && Math.random() < 0.45 && Math.abs(m.x - this.camX - VIEW_W / 2) < VIEW_W) this.particles.push({ kind: 'note', x: m.x + m.face * 10, y: m.y - 30, vx: m.face * 0.3, vy: -0.5, life: 40, t: 0, color: BAND_COLOR[m.kind] });
      }
    });
  }
  // put everyone who's on the shelf right in his place on it
  placeShelf() {
    const slots = this.shelfSlots(), lift = this.lift || 0;
    this.band.members.forEach((m, i) => { if (m.state === 'shelf') { m.x = this.camX + slots[i][0]; m.y = slots[i][1] - lift; m.face = -1; } });
  }
  // each musician's place on the shelf (screen px, feet), in the order they joined, packed to the right
  shelfSlots() {
    const ms = this.band.members, total = ms.reduce((a, m) => a + SHELF_BOUNDS[m.kind].left + SHELF_BOUNDS[m.kind].right, 0) + Math.max(0, ms.length - 1) * SHELF_GAP;
    let x = SHELF_R - total;
    return ms.map(m => { const bounds = SHELF_BOUNDS[m.kind], c = x + bounds.left; x += bounds.left + bounds.right + SHELF_GAP; return [c, SHELF_Y]; });
  }
  // The dance floor (['dance', x, x0, x1]): past column x the band jumps down off the shelf to spots
  // spread over columns x0..x1, and dances with the crowd from then on
  bandDance(x0, x1) {
    const b = this.band;
    if (!b || b.dance) return;
    b.dance = true;
    if (this.level.def.goal.finale) {
      b.finale = {
        t: 0,
        cameraX: (x0 + x1) / 2 * TILE + 8 - VIEW_W / 2,
        shelf: { x: (x0 + (x1 - x0) * 0.5) * TILE + 8, y: 9.5 * TILE, hop: null },   // his own wooden shelf, centred under the frog's (he hops up when the band has landed)
        cats: ['murray', 'beebeez'].map((kind, i) => {
          const cat = new Cat(this.camX + (i ? VIEW_W + 24 : -24), 12 * TILE - 12, kind);
          cat.partyX = ((x0 + x1) / 2 + (i ? 10.375 : -8.875)) * TILE - cat.w / 2;
          cat.facing = i ? -1 : 1; cat.onGround = true;
          return cat;
        }),
      };
      const p = this.player;
      this.endRoll(p); this.standUp(p); this.dropHeld();
      p.vx = 0; p.charge = 0; p.crouch = false; p.idleT = 0;
      this.dialog = null; this.dialogQ = [];
    }
    const n = b.members.length;
    b.members.forEach((m, i) => {
      const tx = (x0 + (x1 - x0) * (n > 1 ? i / (n - 1) : 0.5)) * TILE + 8;
      m.state = 'drop'; m.st = 0; m.dx0 = m.x; m.dy0 = m.y; m.tx = tx; m.ty = 7 * TILE;
    });
    b.platforms = b.members.map(m => ({ x: m.tx, y: m.ty }));
    if (n) { this.popup(b.members[0].x, b.members[0].y + 14, 'HERE WE COME!', '#ffffff'); Sound.play('sproing'); }
  }
  // Listen for at least ten seconds; a fresh jump press then starts the closing curtain.
  updateBayouFinale() {
    const b = this.band, scene = b.finale, p = this.player;
    scene.t++;
    if (scene.outro != null) scene.outro++;
    else {
      if (!Input.down('jump')) scene.jumpReady = true;
      if (scene.t >= 600 && scene.jumpReady && (Input.hit('jump') || Input.hit('ok'))) scene.outro = 0;
    }
    this.updateBand();
    this.physics(p, { dir: 0, run: false, jumpHit: false, jumpHeld: false });
    p.vx = 0; p.idleT = 0;
    const sh = scene.shelf;
    if (sh) {
      if (!sh.hop && scene.t > 70) { sh.hop = { t: 0, x0: p.x, y0: p.y }; Sound.play('jump'); }
      if (sh.hop) {   // a hop up onto the shelf, like the musicians' own
        const h = sh.hop, k = Math.min(1, ++h.t / 45), ease = k * k * (3 - 2 * k), ty = sh.y - p.h;
        p.x = h.x0 + (sh.x - p.w / 2 - h.x0) * ease; p.y = h.y0 + (ty - h.y0) * ease - Math.sin(Math.PI * k) * 46;
        p.vy = 0; p.prevY = p.y; p.onGround = k >= 1; p.platform = null;
        if (h.t === 45) { Sound.play('thud'); this.dust(p.x + p.w / 2, sh.y, 4); }
      }
    }
    this.camX += (scene.cameraX - this.camX) * 0.035;
    this.lift = (this.lift || 0) * 0.9;
    for (const e of this.entities) if (e instanceof Crowd) e.update(this);
    for (const cat of scene.cats) {
      cat.t++;
      const remaining = cat.partyX - cat.x;
      cat.vx = clamp(remaining, -1.4, 1.4);
      cat.x += cat.vx;
      const dancing = Math.abs(remaining) < 1.4;
      cat.y = 12 * TILE - cat.h - (dancing ? Math.round(Math.abs(Math.sin(b.f / BAND_BEAT * Math.PI)) * 2) : 0);
    }
    this.updateParticles();
    if (scene.outro === 378) {
      this.addScore(5000);
      this.startTally();
      this.tally = false;
      this.finishLevel();
    }
  }
  drawBayouPartyCats(ctx) {
    const scene = this.band.finale;
    for (let i = 0; i < scene.cats.length; i++) {
      const cat = scene.cats[i];
      cat.draw(ctx, this);
      if (Math.abs(cat.x - cat.partyX) < 1 && (scene.t + i * 120) % 300 < 100) {
        drawText(ctx, 'PURRRR', cat.cx, cat.y - 12, CATS[cat.kind].color, { align: 'center', small: true, shadow: INK });
      }
    }
  }
  // Sparse curling streamers, behind the performers, flowing all the way past the floor.
  drawBayouPartyDecor(ctx, cam) {
    const b = this.band, scene = b && b.finale;
    if (!scene || !b.members.some(m => m.state === 'dance')) return;
    const colors = ['#ff7a8a', '#ffd166', '#9ae86a', '#7ad7df', '#c9a8ff', '#ffad72'];
    const lift = Math.round(this.lift || 0);
    for (let i = 0; i < 8; i++) {
      const elapsed = scene.t - 45 * i;
      if (elapsed < 0) continue;
      const age = elapsed % 360, cycle = Math.floor(elapsed / 360);
      const y = Math.floor(-18 + age * 0.85) - lift;
      if (y > VIEW_H + 16) continue;
      const x = cam + 18 + ((i * 97 + cycle * 53) % (VIEW_W - 36));
      ctx.strokeStyle = colors[(i + cycle) % colors.length]; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();   // a curling streamer (fine)
      for (let j = 0; j <= 10; j += 0.5) ctx.lineTo(x + 1 + Math.sin(age * 0.045 + i + j * 0.75) * 3, y + 1 - j * 1.2);
      ctx.stroke();
    }
    const center = b.platforms.reduce((sum, shelf) => sum + shelf.x, 0) / b.platforms.length;
    drawText(ctx, 'ADVENTURE COMPLETE!', center, 21 - lift, '#ffd166', { align: 'center', scale: 2, shadow: INK });
    drawText(ctx, 'THANKS FOR PLAYING!', center, 40 - lift, '#fff3c1', { align: 'center', scale: 2, shadow: INK });
  }
  bayouPlayerPose() {
    const b = this.band, scene = b && b.finale, sh = scene && scene.shelf;
    if (sh && sh.hop && sh.hop.t < 45) return { f: 'jump', flip: false, dx: 0, dy: 0, sx: 1, sy: 1 };
    const beat = b ? Math.floor(b.f / BAND_BEAT) : 0, inBeat = b ? b.f % BAND_BEAT : 0;
    const bounce = b ? -Math.round(Math.abs(Math.sin(b.f / BAND_BEAT * Math.PI)) * 3) : 0;
    const f = sh && sh.hop ? (inBeat < 6 ? 'jump' : 'blush') : 'blush';
    const flip = sh && sh.hop ? (beat % 4 >= 2) : false;
    return { f, flip, dx: 0, dy: bounce, sx: 1, sy: 1 };
  }
  drawBayouFinale(ctx) {
    const scene = this.band && this.band.finale;
    if (!scene || scene.outro == null || scene.outro < 180) return;
    const p = this.player, pose = this.bayouPlayerPose();
    const baseSet = p.power === 0 ? SPR.small : p.power === 1 ? SPR.big : p.suit && p.suit !== 'fire' ? SPR.suit[p.suit] : SPR.fire;
    const set = baseSet.happy || baseSet;
    const img = set[pose.f] || baseSet[pose.f], height = img.height * pose.sy, width = img.width * pose.sx;
    // Follow the visible dancing sprite, including its sway and the world camera offset.
    const cx = p.x + p.w / 2 + pose.dx - Math.round(this.camX);
    const cy = p.y + p.h + pose.dy - height / 2 + Math.round(this.lift || 0);
    const closeup = Math.hypot(width / 2, height / 2) + 1;
    const full = Math.hypot(Math.max(cx, VIEW_W - cx), Math.max(cy, VIEW_H - cy));
    const k = clamp((scene.outro - 180) / 90, 0, 1);
    let radius = full + (closeup - full) * (k * k * (3 - 2 * k));
    // Hold the tight Chickaroo portrait for 60 frames, then close completely in 18.
    if (scene.outro >= 330) {
      const shut = clamp((scene.outro - 330) / 18, 0, 1);
      radius = closeup * (1 - shut * shut * (3 - 2 * shut));
    }
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H);
    if (radius > 0) { ctx.moveTo(cx + radius, cy); ctx.arc(cx, cy, radius, 0, Math.PI * 2, true); }
    ctx.fill('evenodd');
    ctx.restore();
  }
  drawBand(ctx) {
    const b = this.band, p = this.player, hushed = this.bandHushed();
    const sad = p.state === 'dead', party = p.state === 'celebrate' || p.state === 'done';
    if (b.members.some(m => m.state === 'hop' || m.state === 'shelf')) this.drawShelf(ctx);
    for (const shelf of b.platforms || []) this.drawWoodShelf(ctx, shelf.x - 24, shelf.x + 24, shelf.y);
    const mine = b.finale && b.finale.shelf;
    if (mine && mine.hop) this.drawWoodShelf(ctx, mine.x - 24, mine.x + 24, mine.y);
    for (let i = b.members.length - 1; i >= 0; i--) {
      const m = b.members[i], dancing = party || m.state === 'dance';
      const beat = b.f % BAND_BEAT, bob = hushed || sad ? 0 : dancing ? -Math.round(Math.abs(Math.sin(b.f / BAND_BEAT * Math.PI)) * 4) : beat < 6 ? 1 : 0;
      const o = { step: m.state === 'dance' ? (b.f / BAND_BEAT | 0) % 2 : 0, hit: m.hit > 0 && !hushed, shh: hushed, sad, bob: bob + (m.squash > 0 ? 1 : 0) };
      BAND_DRAW[m.kind](ctx, m.x, m.y, m.face, o);
    }
  }
  // the band's shelf: a thin plank of driftwood on two little brackets, pinned to the top right of the view
  drawShelf(ctx) {
    const ms = this.band.members, total = ms.reduce((a, m) => a + SHELF_BOUNDS[m.kind].left + SHELF_BOUNDS[m.kind].right, 0) + Math.max(0, ms.length - 1) * SHELF_GAP;
    const x0 = Math.round(this.camX + SHELF_R - total - 6), x1 = Math.round(this.camX + SHELF_R + 4), y = SHELF_Y - Math.round(this.lift || 0);
    this.drawWoodShelf(ctx, x0, x1, y);
  }
  drawWoodShelf(ctx, x0, x1, y) {   // a plank of driftwood, its grain, two brackets (in fine pixels: hires.js)
    fRoundRect(ctx, x0 - 1, y - 1, x1 - x0 + 2, 5, 1.4, INK);
    const gr = ctx.createLinearGradient(0, y, 0, y + 3); gr.addColorStop(0, '#d8a46a'); gr.addColorStop(0.35, '#a8743e'); gr.addColorStop(1, '#7a5228');
    fRoundRect(ctx, x0 - 1 / 3, y - 1 / 3, x1 - x0 + 2 / 3, 3.67, 1, gr);
    for (let x = x0 + 9; x < x1 - 3; x += 17) fEll(ctx, x + 1.5, y + 1.5, 2, 0.4, '#6a4424');   // the grain
    for (const bx of [x0 + 8, x1 - 12]) {   // brackets
      fPoly(ctx, [[bx - 0.6, y + 3.6], [bx + 6.6, y + 3.6], [bx + 6.6, y + 4.4], [bx + 0.6, y + 10.4], [bx - 0.6, y + 10.4]], INK);
      fPoly(ctx, [[bx + 0.6, y + 4.2], [bx + 5.4, y + 4.2], [bx + 0.8, y + 8.8]], '#7a5228');
    }
  }
}
mixin(Game, GameBayou);
