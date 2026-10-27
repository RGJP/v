'use strict';
// 4-1 THE GUMBO FEVER DREAM: what the gumbo does to Chickaroo, and the dream around the stage.
//  - slimed (okra): his feet slide like on ice, but he's quicker (SLIME_T frames)
//  - teary (onion gas): left is right and right is left (TEARS_T frames)
//  - the roux is hot: wading in it too long scalds him (a hit) and he yelps up out of it
// The stage is a dream: it opens in his bed (3-4's bedroom, gut-dream.js), mumbling about gumbo in his sleep, the camera
// sinking into his head; it ends when he rings the alarm clock on the ladle (gumbo.js) and wakes up -- to a sunny
// morning, the cats already up.
// Part of class Game (see game.js): GameGumbo
const ROUX_SCALD = 75;                          // frames wading in roux before it scalds him (it cools off again out of it)
const SLIME_T = 300, SLIME_RUN = 1.45;          // okra slime: how long it lasts, how much faster he runs
const TEARS_T = 180;                            // onion gas: frames of crossed-up arrows
const FEVER_ZOOM = [235, 335], FEVER_WHITE = 295, FEVER_IN = 375;   // the opening: zoom into his head (from, to), fade to white, end
const FEVER_OUT_WHITE = 70, FEVER_WAKE = 150;  // the ending: frames of the dream fading to white before the bedroom; when he wakes (the clock rings till then)
const FEVER_LINES = [
  'Sheesh what a night! Digested by an ancient reptile. Surviving Gumbo Town. No more midnight bowls.',
  'But for breakfast......why not!',   // (its own box, after a beat: the punchline)
];

class GameGumbo {
  initGumbo() {
    const def = this.level.def;
    if (def.theme !== 'gumbo') { this.gumbo = null; return; }
    this.gumbo = { intro: null, outro: null, whiteIn: 0, landLine: false, landWait: 0 };
    if (!this.respawns) { this.trinitySaid = false; this.onionTold = false; }   // (the Holy Trinity introduce themselves, and the onion tip shows, once a visit)
    if (def.fever && !this.checkpointReached && !this.respawns && !this.devWarped) {
      this.gumbo.intro = { t: 0 };
      this.player.hidden = true;
    }
  }

  // ── what the gumbo does to him ────────────────────────────────────────────
  slimeFeet(p) {
    if (!(p.slimy > 0) && !this.level.slimeTold) { this.level.slimeTold = true; }
    p.slimy = SLIME_T;
  }
  tearUp(p) {
    if (!(p.teary > 30)) { Sound.play('sour'); }
    p.teary = TEARS_T;
  }
  // hot broth: a hit (unless he's flashing from the last one), and a yelp straight up out of it
  scald(p, v) {
    if (p.state !== 'play') return;
    p.rouxT = 0;
    if (!(p.invuln > 0)) {
      this.hurtPlayer();
      if (p.state !== 'play') return;   // (that was his last hit)
      
      Sound.play('ow');
    }
    if (p.vy > -v + 1) { this.sandPuff(p.x + p.w / 2, p.y + p.h, 6, -1.8); Sound.play('sizzle'); }
    p.vy = Math.min(p.vy, -v); p.sand = 0; p.onGround = false; p.platform = null; p.jumping = false; p.holdGrace = 0; p.coyote = 0;
    this.hotFootReaction(p);
  }
  // every frame of play, straight after the player moves (updatePlay)
  updateGumbo() {
    const p = this.player, G = this.gumbo, lv = this.level;
    if (G.whiteIn > 0) G.whiteIn--;
    if (p.state !== 'play') return;
    if (G.landLine && p.onGround) {
      if (++G.landWait >= 12) {
        G.landLine = false;
        this.speak(CHICK_SHOCK, "First, inside a turtle, now in Gumbo Town. Phew, at least it's an upgrade...Onwards!", '#ffd166', true);
        if (this.dialog) this.dialog.background = 'rgba(11,9,24,1)';   // (solid: the fiery kitchen behind is too busy to read through)
      }
    } else if (G.landLine) G.landWait = 0;
    const cx = p.x + p.w / 2, feet = p.y + p.h;
    const leaf = p.floatT > 0 && p.chute === 'leaf';
    if (G.leafWas && !leaf && !p.onGround) {   // the bay leaf dried out (or he let go): it crumbles away above him
      for (let i = 0; i < 10; i++) this.particles.push({ kind: 'px', x: cx + rand(-9, 9), y: p.y - 12 + rand(-3, 3), vx: rand(-0.6, 0.6), vy: rand(-0.8, 0.4), g: 0.06, drag: 0.96, life: 34, t: 0, color: i % 2 ? '#a8b858' : '#d8d890', size: 2 });
      Sound.play('rustle');
    }
    G.leafWas = leaf;
    if (p.slimy > 0) {
      p.slimy--;
      if (p.onGround && Math.abs(p.vx) > 0.8 && this.t % 3 === 0) this.particles.push({ kind: 'px', x: cx - p.facing * 4, y: feet - 1, vx: 0, vy: 0, life: 30, t: 0, color: '#b8e890', size: 2 });
      if (this.t % 20 === 0) this.particles.push({ kind: 'px', x: cx + rand(-4, 4), y: feet - 2, vx: 0, vy: 0.3, g: 0.12, life: 18, t: 0, color: '#7ac850', size: 1 });
    }
    if (p.teary > 0) {
      p.teary--;
      // bawling: two fountains of tears spraying out either side of his face
      if (this.t % 2 === 0) for (const s of [-1, 1]) this.particles.push({ kind: 'px', x: cx + s * 3 + p.facing, y: p.y + (p.power ? 8 : 6), vx: s * rand(0.7, 1.7), vy: rand(-1.6, -0.6), g: 0.16, life: 26, t: 0, color: this.t % 6 ? '#9ad8ff' : '#e0f4ff', size: this.t % 4 ? 2 : 1 });
    }
    // the roux is hot: linger in it and it scalds (hopping out lets it cool off)
    const inRoux = p.sand > 0 && lv.theme.roux;
    if (inRoux && !G.inRoux) this.hotFootReaction(p);
    G.inRoux = inRoux;
    const sc = lv.def.scalding, col = Math.floor(cx / TILE);
    if (p.sand > 0 && lv.theme.roux && sc && col >= sc[0] && col <= sc[1]) this.scald(p, 6.2);   // (boiling broth: no grace)
    else if (p.sand > 0 && lv.theme.roux) {
      p.rouxT = (p.rouxT || 0) + 1;
      if (p.rouxT % 16 === 0) this.particles.push({ kind: 'px', x: cx + rand(-5, 5), y: feet - p.sand, vx: 0, vy: -0.5, g: -0.01, life: 30, t: 0, color: '#fff0e0', size: 2 });
      
      if (p.rouxT >= ROUX_SCALD) this.scald(p, 6.2);
    } else if (p.rouxT > 0) p.rouxT--;
  }

  // drawn over Chickaroo: slime on his feet, the onion's tears streaming down his face
  drawGumboPlayer(ctx) {
    const p = this.player;
    if (!p || p.hidden || p.state !== 'play' || (p.invuln > 0 && (p.invuln >> 2) % 2 === 0)) return;
    const cx = p.x + p.w / 2, feet = p.y + p.h, t = this.t;   // (in fine pixels: hires.js)
    if (p.slimy > 0) {   // a gloop of okra slime round his feet, dripping
      fRoundRect(ctx, cx - 5.5, feet - 2.4, 11, 2.8, 1.3, '#4a9a3a');
      fEll(ctx, cx - 2.6, feet - 1.8, 1.8, 0.5, '#b8e890'); fEll(ctx, cx + 3, feet - 1.8, 1, 0.4, '#b8e890');
      for (const [dx, ph] of [[-3, 0], [3, 1.7], [0.4, 3.1]]) { const len = 1 + (Math.sin(t * 0.09 + ph) * 0.5 + 0.5) * 2.2; fRoundRect(ctx, cx + dx - 0.5, feet - 0.4, 1, len, 0.5, '#7ac850'); fBlob(ctx, cx + dx, feet + len - 0.4, 0.7, '#7ac850'); }
    }
    if (p.teary > 0) {
      const ey = p.y + (p.power ? 8 : 6);
      for (const s of [-1, 1]) {   // streams down his cheeks, pulsing
        const x = cx + s * 3 + p.facing + 0.5, len = 4 + Math.sin(t * 0.2 + (s > 0 ? 2 : 0)) * 1.5;
        fRoundRect(ctx, x - 0.8, ey, 1.6, len, 0.8, '#9ad8ff'); fBlob(ctx, x, ey + len, 1.1, '#9ad8ff'); fEll(ctx, x - 0.3, ey + 0.6, 0.4, 0.6, '#e0f4ff');
      }
    }
  }
  // hanging from a bay leaf by its stem (drawn instead of the dandelion seed while p.chute is 'leaf')
  drawLeafChute(ctx) {
    const p = this.player, f = p.facing, sway = Math.sin(this.t * 0.07) * 0.12;
    const bx = Math.round(p.x + p.w / 2 + f * 4), beakY = p.power ? p.y + p.h * 0.62 : p.y + 6, ly = Math.round(p.y) - 12;
    ctx.strokeStyle = '#5a4a24'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + 0.5, ly + 2); ctx.quadraticCurveTo(bx + 0.5 + sway * 6, (ly + beakY) / 2, bx + 0.5, beakY); ctx.stroke();   // the stem in his beak (fine)
    const warning = p.floatT <= LEAF_WARN;
    ctx.save();
    if (warning && (p.floatT >> 2) % 2) ctx.globalAlpha *= 0.35;
    drawBayLeaf(ctx, bx + (warning ? Math.round(Math.sin(this.t * 0.9) * 2) : 0), ly, sway + f * 0.15, 13, 5);
    ctx.restore();
  }

  // ── the dream around the stage ────────────────────────────────────────────
  updateFever() {
    const G = this.gumbo;
    if (G.intro) { this.updateFeverIntro(G.intro); return true; }
    if (G.outro) { this.updateFeverOutro(G.outro); return true; }
    return false;
  }
  updateFeverIntro(I) {
    const p = this.player;
    if (I.t === 0) Music.stop();
    I.t++;
    p.hidden = true; p.vx = 0; p.vy = 0;
    if (I.t === FEVER_ZOOM[0] + 60) Sound.play('whoosh');
    if (I.t >= FEVER_IN) {   // out of the white he drops into the gumbo
      this.gumbo.intro = null; this.gumbo.whiteIn = 45; this.gumbo.landLine = true;
      p.hidden = false; p.y = -p.h - 8; p.prevY = p.y; p.vy = 1.5;
      Music.shuffle(this.levelMusic); Music.play(this.levelMusic);
    }
  }
  // the ladle's alarm clock rang (gumbo.js): the dream's over
  startFeverOutro(ladle) {
    const G = this.gumbo, p = this.player;
    if (!G || G.outro) return;
    G.outro = { t: 0, ladle, awake: 'sleep', line: 0, wait: 0, spoke: false, sleepT: 0 };
    this.endRoll(p); this.dropHeld(); p.floatT = 0; p.chute = null; p.finaleLocked = true; p.invuln = 9999;
    this.dialog = null; this.dialogQ = [];
    Music.stop(); Sound.play('ring');
  }
  updateFeverOutro(O) {
    const p = this.player;
    O.t++;
    if (O.t < FEVER_OUT_WHITE) { O.ladle.update(this); this.updateParticles(); if (O.t === 36) Sound.play('ring'); return; }
    p.hidden = true;
    const bt = O.t - FEVER_OUT_WHITE;
    if (bt < FEVER_WAKE && bt % 40 === 0) Sound.play('ring');   // the real one, on the bedside table
    if (bt === FEVER_WAKE) O.awake = 'awake';   // he just wakes up: eyes open, sits up a little (no jolt, no sweat)
    if (bt === FEVER_WAKE + 65) O.spoke = true;
    if (O.spoke && !O.sleepT) {
      // held lines, the game's usual way: jump finishes the typing, then dismisses the line
      if (!this.dialog && O.line < FEVER_LINES.length) {
        if (O.wait++ >= (O.line ? 24 : 0)) {
          this.speak(CHICK_VOICE, FEVER_LINES[O.line++], '#ffd166', true);
          if (this.dialog) this.dialog.background = 'rgba(11,9,24,1)';
          O.wait = 0;
        }
      } else if (!this.dialog) { O.sleepT = 1; Sound.play('hop'); }   // (and the morning fades out: he's off to find that gumbo)
    }
    if (O.sleepT > 0 && ++O.sleepT >= 170 && this.mode === 'play') {
      this.addScore(5000);
      this.startTally(); this.tally = false;
      this.finishLevel();
    }
  }

  // drawn over everything (drawWorld)
  drawFever(ctx) {
    const G = this.gumbo;
    if (!G) return;
    if (G.intro) { this.drawFeverIntro(ctx, G.intro); return; }
    if (G.whiteIn > 0) { const k = G.whiteIn / 45; ctx.globalAlpha = k * k; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1; }
    if (G.outro) this.drawFeverOutro(ctx, G.outro);
  }
  // the bedroom (gut-dream.js's), with the camera `u` of the way into his forehead, rippling like a dream
  drawFeverRoom(ctx, t, mode, sweat, u, extra, day = false) {
    const W = VIEW_W, H = VIEW_H;
    this.dreamHiRes(ctx);
    const room = this.dreamRoomCv || (this.dreamRoomCv = makeCanvas(W * DREAM_R, H * DREAM_R)), rc = room.getContext('2d');
    rc.imageSmoothingEnabled = false; rc.setTransform(1, 0, 0, 1, 0, 0);
    this.drawDreamRoom(rc, t, mode, sweat, day);
    if (extra) extra(rc);
    const [fx, fy] = this.dreamForehead;
    const e = u * u * (3 - 2 * u), zk = u * u * u, s = 1 + 11 * zk, amp = e * 5;
    const ax = fx + (W / 2 - fx) * e, ay = fy + (H / 2 - fy) * e, dx = ax - fx * s, dy = ay - fy * s;
    ctx.fillStyle = '#05061a'; ctx.fillRect(0, 0, W, H);
    if (u <= 0) { ctx.drawImage(room, 0, 0, W, H); return; }
    const step = Math.max(1, Math.round(2 / s * 2) / 2);
    for (let y = 0; y < H; y += step) {
      const top = dy + y * s, h = step * s;
      if (top + h < 0 || top > H) continue;
      ctx.drawImage(room, 0, y * DREAM_R, W * DREAM_R, step * DREAM_R, Math.round(dx + Math.sin(y * 0.07 + t * 0.25) * amp), Math.floor(top), Math.round(W * s), Math.ceil(h) + 1);
    }
  }
  drawFeverIntro(ctx, I) {
    const t = I.t, W = VIEW_W, H = VIEW_H;
    const u = clamp((t - FEVER_ZOOM[0]) / (FEVER_ZOOM[1] - FEVER_ZOOM[0]), 0, 1);
    const sweat = t >= 130 && t < 220 ? (t - 130) / 90 : 0;
    this.drawFeverRoom(ctx, t + 200, 'sleep', sweat, u);
    const [fx, fy] = this.dreamForehead;
    if (t > 110 && t < 225 && u === 0) {   // talking in his sleep
      const n = Math.min(17, Math.floor((t - 110) / 3)), line = 'mmmmm....gumbo...'.slice(0, n);
      drawText(ctx, line, fx - 88, fy - 20, '#c8d0ff', { small: true, shadow: INK });   // (right beside his face, on the pillow)
    }
    if (t < 40) { ctx.globalAlpha = 1 - t / 40; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (t > FEVER_WHITE) { const w = Math.min(1, (t - FEVER_WHITE) / (FEVER_IN - FEVER_WHITE - 8)); ctx.globalAlpha = w * w; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  drawFeverOutro(ctx, O) {
    const W = VIEW_W, H = VIEW_H;
    if (O.t < FEVER_OUT_WHITE) {   // the dream goes white
      const k = O.t / FEVER_OUT_WHITE;
      ctx.globalAlpha = k * k; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      return;
    }
    const bt = O.t - FEVER_OUT_WHITE, ringing = bt < FEVER_WAKE;
    // the camera pulls back out of his head; the alarm clock on the bedside table is ringing its head off
    this.drawFeverRoom(ctx, bt + 120, O.awake, 0, clamp(1 - bt / 70, 0, 1), rc => {
      if (!ringing) return;
      const sh = Math.round(Math.sin(bt * 1.3) * 3), x = 1056 + sh, y = 389;
      blob(rc, x, y, 14, '#1a1018'); blob(rc, x, y, 12, '#e04050'); blob(rc, x, y, 8, '#fff6e0');
      rc.fillStyle = '#2a1a10'; rc.fillRect(x, y - 6, 1, 6); rc.fillRect(x, y, 4, 1);
      for (const s of [-1, 1]) { blob(rc, x + s * 8, 376 - Math.abs(sh), 5, '#1a1018'); blob(rc, x + s * 8, 376 - Math.abs(sh), 3, '#ffd166'); }
      rc.fillStyle = '#ffffff';
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) rc.fillRect(x + s * (24 + i * 7) - 3, y - 18 + i * 9, 6, 2);
    }, true);
    if (bt < 35) { const k = 1 - bt / 35; ctx.globalAlpha = k * k; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    // the cats, up long before him, have something to say about all the noise
    if (bt >= FEVER_WAKE + 8 && bt < FEVER_WAKE + 70) {
      const a = Math.min(1, (FEVER_WAKE + 70 - bt) / 12);
      ctx.globalAlpha = a;
      drawText(ctx, 'MRRP?', 176, 150 - Math.min(4, (bt - FEVER_WAKE - 8) >> 1), CATS.murray.color, { align: 'center', small: true, shadow: INK });
      if (bt >= FEVER_WAKE + 22) drawText(ctx, 'MEW!', 300, 150 - Math.min(4, (bt - FEVER_WAKE - 22) >> 1), CATS.beebeez.color, { align: 'center', small: true, shadow: INK });
      ctx.globalAlpha = 1;
    }
    if (this.dialog && this.mode === 'play') this.drawDialog(ctx);
    if (O.sleepT > 30) {   // the morning fades out
      const k = clamp((O.sleepT - 30) / 120, 0, 1);
      ctx.globalAlpha = k * k * (3 - 2 * k); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
  }
  // 4-1's roux tiles, as one liquid (paintRouxColumn in gumbo.js): every column of roux in view, from its surface (the
  // top roux tile in that column, rippling) to the bottom of the run; and its bubbles and droplets
  drawRoux(ctx, cam) {
    const lv = this.level, t = this.t, x0 = Math.max(0, Math.floor(cam) - 4), x1 = Math.min(lv.w * TILE, Math.floor(cam) + VIEW_W + 4);
    const tops = new Map();   // tile column -> [[surface row, bottom px], ...]
    const runs = c => {
      if (tops.has(c)) return tops.get(c);
      const out = [];
      for (let r = 1; r < ROWS; r++) if (lv.get(c, r) === T.QSAND && lv.get(c, r - 1) !== T.QSAND) {
        let rb = r; while (rb + 1 < ROWS && lv.get(c, rb + 1) === T.QSAND) rb++;
        out.push([r, rb + 1 === ROWS ? VIEW_H + 16 : (rb + 1) * TILE]);
      }
      tops.set(c, out); return out;
    };
    // where the master pot's broth surges, the surge is the liquid (one surface, never two); the stage's `scalding` columns
    // are boiling broth, drawn red (it scalds on contact)
    const surges = this.entities.filter(e => e instanceof Surge), surged = x => surges.some(e => x >= e.x && x < e.x + e.w);
    const sc = lv.def.scalding, hot = x => !!sc && x >= sc[0] * TILE && x < (sc[1] + 1) * TILE;
    for (let c = Math.floor(x0 / TILE); c * TILE < x1; c++) {   // a smooth stretch per column of tiles (in fine pixels: paintRouxSpan)
      let a = Math.max(x0, c * TILE), b = Math.min(x1, (c + 1) * TILE);
      while (a < b && surged(a)) a++;
      while (b > a && surged(b - 1)) b--;
      for (const [r, bot] of runs(c)) paintRouxSpan(ctx, a, b, x => r * TILE + 4 + rouxWaveF(x, t), bot, t, hot(a));
    }
    // bubbles and droplets, run by run along each surface row
    const rows = new Set();
    for (let c = Math.floor(x0 / TILE); c <= Math.floor((x1 - 1) / TILE); c++) for (const [r] of runs(c)) rows.add(r);
    for (const r of rows) for (const h of [false, true]) paintRouxLife(ctx, x0, x1, r * TILE + 4, t, x => !surged(x) && hot(x) === h && runs(Math.floor(x / TILE)).some(([rr]) => rr === r), h);
  }
  // under the terrain: roux filling the ragged nicks in the banks either side of it (as the tiles do for quicksand)
  drawRouxNicks(ctx, cam) {
    const lv = this.level, t = this.t, c0 = Math.max(0, Math.floor(cam / TILE) - 1), c1 = Math.min(lv.w - 1, c0 + Math.ceil(VIEW_W / TILE) + 2);
    for (let r = 1; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
      if (lv.get(c, r) !== T.QSAND) continue;
      const surf = lv.get(c, r - 1) === T.QSAND ? null : r * TILE + 4, bot = (r + 1) * TILE;
      const sc = lv.def.scalding, hot = !!sc && c >= sc[0] && c <= sc[1];
      for (const [side, from] of [[-1, c * TILE - 4], [1, (c + 1) * TILE]]) {
        if (lv.get(c + side, r) !== T.GROUND) continue;
        paintRouxSpan(ctx, from, from + 4, x => surf == null ? r * TILE : surf + rouxWaveF(x, t), bot, t, hot);
      }
    }
  }
  // 4-1's cornbread, studded with vegetables (vegChunk in gumbo.js): only in cells with cornbread to either side and below
  // (and, in a top row, set down under the baked crust), so a chunk never touches the crust, a ragged edge or open air --
  // it's texture in the bread, never in his way
  drawGumboTerrainVeg(ctx, cam) {
    const lv = this.level;
    if (!lv.vegBits) {
      const hollow = (c, r) => (lv.def.secrets || []).some(([a, b, x2, y2]) => c >= a - 1 && c <= x2 + 1 && r >= b - 1 && r <= y2 + 1);   // (never over a secret hollow)
      const bread = (c, r) => r >= ROWS || (lv.get(c, r) === T.GROUND && !hollow(c, r));
      const inner = (c, r) => r > 0 && bread(c, r) && bread(c - 1, r) && bread(c + 1, r) && bread(c, r + 1) && bread(c - 1, r + 1) && bread(c + 1, r + 1);
      const used = new Set(), bits = [], wide = ['okra', 'celery', 'corn'], small = ['pepper', 'redpep', 'onion', 'slice', 'sausage'];
      for (let c = 1; c < lv.w - 2; c++) for (let r = 1; r < ROWS; r++) {
        const h = ((c * 73856093) ^ (r * 19349663)) >>> 0;
        if (h % 5 || used.has(c + ',' + r) || !inner(c, r)) continue;
        const dy = bread(c, r - 1) ? 2 : 8;   // (a top row: under the crust)
        if (h % 3 === 0 && inner(c + 1, r) && !used.has((c + 1) + ',' + r) && bread(c + 1, r - 1) === bread(c, r - 1)) { bits.push([c, r, wide[(h >>> 4) % 3], 2, dy]); used.add(c + ',' + r); used.add((c + 1) + ',' + r); }
        else { bits.push([c, r, small[(h >>> 4) % small.length], 1, dy]); used.add(c + ',' + r); }
      }
      lv.vegBits = bits;
    }
    for (const [c, r, kind, w, dy] of lv.vegBits) {
      const x = c * TILE;
      if (x > cam + VIEW_W + 16 || x + w * TILE < cam - 16) continue;
      const img = vegChunk(kind), h = ((c * 31) ^ (r * 17)) & 3;
      ctx.drawImage(img, x + Math.round((w * TILE - img.width) / 2) + (h - 1), r * TILE + dy + (h & 1));
    }
  }
}
mixin(Game, GameGumbo);
