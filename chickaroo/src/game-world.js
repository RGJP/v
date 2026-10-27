'use strict';
const LETTERS = ['C', 'K', 'R'];
const CRUMBLE_REFORM = 170, CRUMBLE_BACK = 240;   // frames after breaking: frost starts re-forming / solid again   // the three letter coins hidden in every stage
// Part of class Game (see game.js): GameWorld
class GameWorld {
  checkPlayerTiles() {
    const p = this.player, lv = this.level;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    // hanging off a vine tip, his feet dangle: pollen right under the swing is reachable
    const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h + (p.vine ? 8 : 0) - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = lv.get(c, r);
      if (t === T.COIN) {
        lv.set(c, r, T.EMPTY);
        this.addCoin(); this.addScore(200);
        this.pollenFly(c * TILE + 8, r * TILE + 8, 0, -1.5, 0);
      } else if (t === T.LAVA && p.y + p.h > r * TILE + 6) {
        this.killPlayer('lava');
        return;
      }
    }
    if (p.sand >= p.h - SAND_LOST) { this.killPlayer('sand'); return; }
    if (this.rivers.length) {
      const wy = this.waterAt(p.x + p.w / 2);
      // wading is fine: only water closing over his head drowns him
      if (wy != null && p.y > wy + 1) { this.killPlayer('river'); return; }
    }
    if (this.gut && p.y + p.h >= VIEW_H && this.gutDrop(p)) return;   // 3-4: down through the floor to the room below
    if (p.y > VIEW_H + 4) this.killPlayer('pit');
  }
  // Is column x (px) underwater? A water level can have dry stretches up above the waves
  // (def.water.dry: [[x0, x1], ...]); each one is its own room, reached through warp pipes.
  wet(x) {
    const w = this.level && this.level.water;
    if (!w) return false;
    const c = Math.floor(x / TILE);
    return !(w.dry || []).some(d => c >= d[0] && c <= d[1]);
  }
  // The room (px span) holding x: dry stretches split a water level into rooms the camera
  // and Chickaroo stay inside.
  roomAt(x) {
    const w = this.level.water, c = Math.floor(x / TILE);
    let lo = 0, hi = this.level.w;
    for (const [x0, x1] of (w && w.dry) || []) {
      if (c >= x0 && c <= x1) return [x0 * TILE, (x1 + 1) * TILE];
      if (x1 < c) lo = Math.max(lo, x1 + 1);
      else hi = Math.min(hi, x0);
    }
    return [lo * TILE, hi * TILE];
  }
  // A continuous clockwise current around the treasure column, with gentle radial guidance.
  // The player remains free to swim out; no ride state or control lock is involved.
  whirlpoolFlow(p,ctl) {
    const w=this.level.def.whirlpool;if(!w)return false;
    const rx=w.rx*TILE,ry=w.ry*TILE,dx=(p.x+p.w/2-w.x*TILE)/rx,dy=(p.y+p.h/2-w.y*TILE)/ry;
    const r=Math.hypot(dx,dy);if(r<.62||r>1.4)return false;
    const steering=ctl.dir||ctl.jumpHeld||Input.down('down');
    const a=Math.atan2(dy,dx),speed=w.speed||1.8,pull=clamp((1-r)*.08*(steering?.2:1),-.025,.025);
    p.vx=-Math.sin(a)*speed+Math.cos(a)*pull*rx+ctl.dir*(ctl.run?1.65:.85);
    p.vy=Math.cos(a)*speed*ry/rx+Math.sin(a)*pull*ry+(ctl.jumpHeld?-1.25:0)+(Input.down('down')?1.25:0);
    p.onGround=false;p.platform=null;return true;
  }
  // Warp pipes (def.warps: [[fromX, toX], ...], both pipes built with the 'pipe' map command):
  // stand on the pipe, hold down, and Chickaroo sinks into it and rises out of the other one.
  tryWarp(p) {
    const warps = this.level.def.warps;
    if (!warps || !p.onGround || !Input.down('down') || this.held) return false;
    const cx = p.x + p.w / 2, below = this.level.get(Math.floor(cx / TILE), Math.floor((p.y + p.h + 1) / TILE));
    if (below !== T.PIPE_TL && below !== T.PIPE_TR) return false;
    const w = warps.find(([fx]) => Math.abs(cx - (fx + 1) * TILE) < 8);
    if (!w) return false;
    if (p.crouch) { p.y -= (p.power ? BIG_H : SMALL_H) - p.h; p.h = p.power ? BIG_H : SMALL_H; p.crouch = false; }
    p.state = 'warp'; p.roll = 0; p.vx = p.vy = 0;
    this.warp = { to: w[1], t: 0, phase: 'down', clipY: p.y + p.h, col: w[0] };
    p.x = (w[0] + 1) * TILE - p.w / 2;
    Sound.play('shrink');
    return true;
  }
  updateWarp(p) {
    const w = this.warp;
    w.t++;
    if (w.phase === 'down') {
      p.y += 0.75;
      if (p.y > w.clipY + 6) {
        // out the other end: snap the camera into the new room and rise up out of the pipe
        const lv = this.level, top = lv.surfaceRow(w.to);
        p.x = (w.to + 1) * TILE - p.w / 2; p.y = top * TILE + 2;
        w.phase = 'up'; w.clipY = top * TILE; w.col = w.to; w.t = 0;
        this.camPx = null; this.updateCamera(true);
        Sound.play('shrink');
        this.signCheck();
      }
    } else if (w.t > 20) {
      p.y -= 0.75;
      if (p.y + p.h <= w.clipY) { p.y = w.clipY - p.h; p.state = 'play'; p.onGround = true; this.warp = null; }
    }
  }
  // Signs (def.signs: [[x, title, line], ...]): a banner the first time Chickaroo reaches column x (once per visit to the level, see startLevel).
  signCheck() {
    const signs = this.level.def.signs;
    if (!signs) return;
    const p = this.player, c = (p.x + p.w / 2) / TILE, hold = !!this.level.def.signsHold;
    // a lesson (signsHold) that pauses play waits for a calm moment -- standing on firm ground, not mid-jump -- and only
    // shows near its spot (14 columns on, it's too late to be any help). (His landing squash plays out under it: holdDialog)
    if (hold && (!p.onGround || p.platform || p.sand > 0 || (this.dialog && this.dialog.hold))) return;
    for (const s of signs) if (c >= s[0] && c < s[0] + (hold ? 14 : 30) && !this.signsSeen.has(s)) {
      this.signsSeen.add(s); this.tipLine(s[1], s[2], s[3] || '#ffd166', null, hold);
      if (s[4] && s[4].grow && p.power === 0) this.collectItem({ kind: 'berry' });   // (a lesson that needs him big makes him big)
      if (hold) return;
    }
  }
  // Secret hollows (level def.secrets, see Level): while Chickaroo is inside one, its fake rock thins
  // to a see-through veil over a dim little cavity; it closes back up once he's out.
  updateSecrets() {
    const p = this.player, box = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 };
    for (const s of this.level.secrets) {
      const inside = p.state === 'play' && overlap(box, { x: s.c0 * TILE, y: s.r0 * TILE, w: (s.c1 - s.c0 + 1) * TILE, h: (s.r1 - s.r0 + 1) * TILE });
      if (inside && !s.found) { s.found = true; Sound.play('blip'); }
      s.rev = clamp(s.rev + (inside ? 0.12 : -0.06), 0, 1);
    }
  }
  // one fake-rock cell, opened up by k (0..1): a shadowy pocket behind, the rock thinned to a ghost
  // over it, and a ragged lip of real rock left standing where it meets the solid stone around it
  drawHollowCell(ctx, img, c, r, k) {
    const x = c * TILE, y = r * TILE, art = this.hollowArt(img, c, r);
    ctx.globalAlpha = k; ctx.drawImage(art.dark, x, y);
    ctx.globalAlpha = 1 - 0.78 * k; ctx.drawImage(img, x, y);
    ctx.globalAlpha = 1; ctx.drawImage(art.rim, x, y);   // the lip is real rock: never see-through
  }
  // The pocket's look for one cell, worked out per pixel from the tile's own art (so it follows the
  // terrain's chewed edges exactly): `dark`, the hollow (deeper in shadow just inside the lip), and
  // `rim`, the tile's pixels along a seeded, ragged lip on every side that touches real rock (rounded
  // where two such sides meet). Cached per cell.
  hollowArt(img, c, r) {
    const lv = this.level, cache = lv.hollowArt || (lv.hollowArt = new Map()), key = r * lv.w + c;
    let art = cache.get(key);
    if (art) return art;
    const rock = [lv.solid(c - 1, r), lv.solid(c + 1, r), lv.solid(c, r - 1), lv.solid(c, r + 1)];   // left, right, top, bottom
    const rng = mulberry32(key * 7 + 11), edge = () => { const a = []; let d = 2; for (let i = 0; i < TILE; i++) { d = clamp(d + (rng() < 0.35 ? -1 : rng() < 0.55 ? 1 : 0), 1, 4); a.push(d); } return a; };
    const [L, R, U, D] = rock.map(on => on ? edge() : null);
    const lip = (px, py) => (L && px < L[py]) || (R && px >= TILE - R[py]) || (U && py < U[px]) || (D && py >= TILE - D[px]) ||
      (L && U && px + py < 6) || (R && U && TILE - 1 - px + py < 6) || (L && D && px + TILE - 1 - py < 6) || (R && D && 2 * TILE - 2 - px - py < 6);
    const AR = ART_R, S = TILE * AR, src = makeCanvas(S, S).getContext('2d');   // (worked out at the fine screen's scale: hires.js)
    src.imageSmoothingEnabled = false; src.setTransform(AR, 0, 0, AR, 0, 0); src.drawImage(img, 0, 0, TILE, TILE);
    const sp = src.getImageData(0, 0, S, S).data;
    const dark = makeCanvas(S, S), rim = makeCanvas(S, S), dg = dark.getContext('2d'), rg = rim.getContext('2d');
    const dd = dg.createImageData(S, S), rd = rg.createImageData(S, S);
    const [br, bg, bb] = hexRgb(lv.theme.ground[1]), q = v => Math.floor(v / AR);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const i = (py * S + px) * 4;
      if (!sp[i + 3]) continue;                     // chewed away: open water stays open
      if (lip(q(px), q(py))) { for (let j = 0; j < 4; j++) rd.data[i + j] = sp[i + j]; continue; }
      const deep = [[-AR, 0], [AR, 0], [0, -AR], [0, AR]].some(([dx, dy]) => { const qx = q(px + dx), qy = q(py + dy); return px + dx >= 0 && qx < TILE && py + dy >= 0 && qy < TILE && lip(qx, qy); });
      const m = deep ? 0.36 : 0.56;                 // the shadow just under the lip is deepest
      dd.data[i] = br * m; dd.data[i + 1] = bg * m; dd.data[i + 2] = bb * m; dd.data[i + 3] = 255;
    }
    dg.putImageData(dd, 0, 0); rg.putImageData(rd, 0, 0);
    cache.set(key, art = { dark: hiRes(dark), rim: hiRes(rim) });
    return art;
  }
  // The only clue a hollow is there: every couple of seconds a little sparkle twinkles (twice) on the
  // rock face it opens onto, until it's been found -- small and brief, but white enough to read on sand.
  // Drawn over everything (the dark too), right on the open face, never round the back of the rock.
  drawSecretGlints(ctx) {
    for (const s of this.level.secrets) {
      if (s.found || !s.faces.length) continue;
      const ph = this.t + s.c0 * 37 + s.r0 * 11, f = ph % SECRET_GLINT;
      if (f >= SECRET_FLASH) continue;
      const n = Math.floor(ph / SECRET_GLINT), fc = s.faces[(n * 7) % s.faces.length];
      const along = 4 + ((n * 5 + fc.c) % 8);   // somewhere along that face, a few px in from its edge
      const x = fc.c * TILE + (fc.dc ? (fc.dc > 0 ? TILE - 4 : 3) : along), y = fc.r * TILE + (fc.dr ? (fc.dr > 0 ? TILE - 4 : 3) : along);
      const half = SECRET_FLASH / 2, k = Math.sin(Math.PI * (f % half) / half) * (f < half ? 1 : 0.75), arm = Math.round(5 * k);
      ctx.globalAlpha = 0.3 * k; blob(ctx, x, y, 9, '#fff3c0');                   // a soft warm halo
      ctx.globalAlpha = 0.85 * k;   // a four-point twinkle, a smaller one turned across it (fine: hires.js)
      if (k > 0.1) fSparkle(ctx, x + 0.5, y + 0.5, 5.5 * k + 0.5);
      if (k > 0.7) { ctx.globalAlpha = 0.5 * k; ctx.save(); ctx.translate(x + 0.5, y + 0.5); ctx.rotate(Math.PI / 4); fSparkle(ctx, 0, 0, 3.4 * k); ctx.restore(); }
      ctx.globalAlpha = k; fBlob(ctx, x + 0.5, y + 0.5, 1.2, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }
  // C K R letter coins (def.letters): touch one to collect it; the third sets off the big bonus.
  updateLetters() {
    const p = this.player;
    if (p.state !== 'play') return;
    this.level.def.letters.forEach(([c, r], i) => {
      if (this.lettersGot.has(i)) return;
      const x = c * TILE + 8, y = r * TILE + 8;
      if (Math.abs(p.x + p.w / 2 - x) > 13 || Math.abs(p.y + p.h / 2 - y) > 8 + p.h / 2) return;
      this.collectLetter(i);
    });
  }
  // crack egg i open (touched, or knocked up off a block underneath: see bumpAbove)
  collectLetter(i) {
    const [c, r] = this.level.def.letters[i], x = c * TILE + 8, y = r * TILE + 8;
    this.lettersGot.add(i);
    this.addScore(1000);
    // the egg cracks open: shell pieces fly, and a tiny yellow chick pops out with a PEEP!
    for (let k = 0; k < 10; k++) this.particles.push({ kind: 'px', x: x + rand(-6, 6), y: y + rand(-8, 8), vx: rand(-1.8, 1.8), vy: rand(-3.5, -1), g: 0.2, life: 45, t: 0, color: k % 3 ? '#fff4dc' : '#b88a5a', size: 2 + (k % 2) });
    for (let k = 0; k < 6; k++) this.particles.push({ kind: 'px', x: x + rand(-2, 2), y: y + rand(-3, 3), vx: rand(-0.6, 0.6), vy: rand(-1.6, -0.8), drag: 0.95, life: 36, t: 0, color: '#ffd23f', size: 3 });
    this.popup(x, y - 24, 'PEEP!', '#ffd23f');
    this.burst(x, y, ['#ffd166', '#fff3b0', '#ffffff'], 10);
    Sound.play('letter');
    this.hudPulse = 30;
    if (this.lettersGot.size === 3) {
      this.addScore(10000);
      this.fireworksT = 180;
    }
  }
  // Three seconds of fireworks across the sky: rockets streak up and burst into rings of sparks.
  updateFireworks() {
    const k = this.fireworksT--;
    if (k % 14 === 0) {
      const x = this.camX + rand(40, VIEW_W - 40), y = rand(24, 90);
      const cols = [['#ff5d73', '#ffd1dc'], ['#ffd166', '#fff3b0'], ['#7af0ff', '#e6fbff'], ['#9ae8a8', '#efffef'], ['#c9a8ff', '#f2eaff']][Math.floor(rand(0, 5))];
      // the rocket's trail
      for (let i = 0; i < 8; i++) this.particles.push({ kind: 'px', x: x + rand(-1, 1), y: y + 30 + i * 5, vx: 0, vy: -1.2, life: 10 + i, t: 0, color: '#fff3b0', size: 1 });
      // the burst: an even ring, plus a few slower inner sparks, drooping as they fade
      const n = 22;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, sp = 1.9;
        this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.03, drag: 0.96, life: 44 + rand(0, 12), t: 0, color: cols[i % 2] });
      }
      for (let i = 0; i < 8; i++) { const a = rand(0, Math.PI * 2), sp = rand(0.4, 1); this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.02, drag: 0.95, life: 36, t: 0, color: '#ffffff' }); }
      Sound.play('firework');
    }
  }
  // The deep: dark stretches of a level (def.dark: [[x0, x1], ...]) fade in around Chickaroo.
  updateDeep() {
    const c = (this.player.x + this.player.w / 2) / TILE;
    const want = this.level.def.dark.some(([a, b]) => c >= a && c <= b + 1) ? (this.level.def.darkOpacity ?? DEEP_DARK) : 0;
    this.deep = (this.deep || 0) + (want - (this.deep || 0)) * 0.05;
  }
  // How far (px) the point (x, y) is below the quicksand surface in its column; 0 if not in quicksand.
  sandDepth(x, y) {
    const lv = this.level, c = Math.floor(x / TILE);
    let r = Math.floor(y / TILE);
    if (lv.get(c, r) !== T.QSAND) return 0;
    while (r > 0 && lv.get(c, r - 1) === T.QSAND) r--;
    return Math.max(0.01, y - r * TILE);
  }
  sandPuff(x, y, n, vy = -1) {
    const [a, b] = (this.level && this.level.theme.puff) || ['#e8b878', '#fff0c4'];   // (4-1's roux splashes brown)
    for (let i = 0; i < n; i++) this.particles.push({ kind: 'px', x: x + rand(-3, 3), y: y - 1, vx: rand(-0.9, 0.9), vy: vy * rand(0.5, 1.2), g: 0.12, life: 24 + rand(0, 10), t: 0, color: i % 3 ? a : b, size: 2 });
  }

  checkGoal() {
    const p = this.player, lv = this.level, g = lv.def.goal;
    if (p.state !== 'play') return;
    if (g.finale) return;
    if (g.type === 'exit') {
      if (!lv.exitOpen) return;
      if (p.x < lv.goalLine || p.y >= VIEW_H) return;
      // He has walked completely out of view. Keep the normal score, completion and
      // unlock bookkeeping, then go straight to STAGE CLEAR without a held-item pose.
      this.dropHeld();
      p.state = 'done'; p.hidden = true; p.celebT = 0; p.vx = 0; p.charge = 0;
      this.addScore(5000, p.x, p.y);
      this.startTally(); this.tally = false;
      this.finishLevel();
      return;
    }
  }
  // Clear nearby foes into fireworks as the treasure is raised, leaving the discovery pose clear.
  celebrateEnemies() {
    const p = this.player, colors = ['#ff5d73', '#ffd166', '#7af0ff', '#9ae8a8', '#c9a8ff', '#ffffff'];
    let count = 0;
    for (const e of this.entities) {
      if (e.remove || e.friendly || e.passive) continue;
      const x = e.x + e.w / 2, y = e.y + e.h / 2;
      if (Math.abs(x - (p.x + p.w / 2)) > VIEW_W || Math.abs(y - (p.y + p.h / 2)) > VIEW_H) continue;
      // Remove directly: enemy death routines can spawn hazards or leave bodies moving around.
      e.dead = e.remove = true;
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * Math.PI * 2, speed = i % 2 ? 2.2 : 1.3;
        this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, g: 0.03, drag: 0.96, life: 44 + rand(0, 12), t: 0, color: colors[i % colors.length] });
      }
      count++;
    }
    this.entities = this.entities.filter(e => !e.remove);
    if (count) Sound.play('firework');
  }
  // A short lift above his head, then a quiet hover. Uses the visible sprite height,
  // including hats, and the game clock so the lift also plays during the first discovery dialogue.
  heldGoalPos() {
    const p=this.player,set=p.power===0?SPR.small:p.power===1?SPR.big:SPR.suit[p.suit||'fire'];
    const age=Math.max(0,this.t-(p.sigilFoundAt??(this.t-(p.celebT||0)))),u=clamp(age/32,0,1),rise=u*u*(3-2*u);
    const top=p.y+p.h-set.relic.height;
    return [p.x+p.w/2,Math.max(40-(this.lift||0),top-20-rise*8+Math.sin(age*.04)*.6*rise)];
  }
  // Visible flow for water currents: streaks for sideways flow, bubbles for vents and whirlpools.
  currentFx() {
    const lv = this.level;
    const w=lv.def.whirlpool;
    if(w&&w.x*TILE>this.camX-140&&w.x*TILE<this.camX+VIEW_W+140){
      const cx=w.x*TILE,cy=w.y*TILE,rx=w.rx*TILE,ry=w.ry*TILE,spd=w.speed||1.8;
      // Controlled bubble spawn (every 5 frames, capped) to ensure silky 60 FPS
      if(this.t % 5 === 0){
        const a=this.t*.045+rand(0,Math.PI*2),r=rand(.75,1.25);
        const bx=cx+Math.cos(a)*rx*r,by=cy+Math.sin(a)*ry*r;
        const vx=-Math.sin(a)*spd*1.15,vy=Math.cos(a)*spd*1.15*ry/rx;
        this.particles.push({kind:'bubble',x:bx,y:by,vx,vy,g:0,life:30,t:0,r:rand(1.2,2.2),color:'#bff4ff'});
      }
      if(this.t % 10 === 0){
        const a=this.t*.06+rand(0,Math.PI*2),r=rand(.7,1.3);
        this.particles.push({kind:'px',x:cx+Math.cos(a)*rx*r,y:cy+Math.sin(a)*ry*r,
          vx:-Math.sin(a)*spd*1.3,vy:Math.cos(a)*spd*1.3*ry/rx,g:0,life:20,t:0,color:'#d8fbff',size:1.2,streak:4});
      }
    }
    for (const [x0, x1, fx, fy, y0 = 0, y1 = ROWS - 1] of lv.def.currents || []) {
      const a = x0 * TILE, b = (x1 + 1) * TILE, top = Math.max(lv.water.top, y0) * TILE, bot = Math.min(VIEW_H - 20, (y1 + 1) * TILE);
      if (b < this.camX || a > this.camX + VIEW_W) continue;
      if (y0 > 0 || y1 < ROWS - 1) {
        // a current in a band of rows (a whirlpool's side): streaks running its way
        if (this.t % 2 === 0) this.particles.push({ kind: 'px', x: rand(a, b), y: rand(top, bot), vx: fx * 5, vy: fy * 12, life: 24, t: 0, color: '#e6fbff', size: 1, streak: fx ? 6 : 0 });
        continue;
      }
      if (fx) this.particles.push({ kind: 'px', x: rand(a, b), y: rand(top + 4, VIEW_H - 20), vx: fx * 5, vy: 0, life: 26, t: 0, color: '#e6fbff', size: 1, streak: 6 });
      if (fy < 0) this.particles.push({ kind: 'px', x: rand(a, b - 2), y: VIEW_H - rand(0, 40), vx: rand(-0.3, 0.3), vy: fy * rand(9, 14), life: 80, t: 0, color: '#e6fbff', size: this.t % 3 ? 1 : 2 });
      if (fy > 0 && this.t % 4 === 0) this.particles.push({ kind: 'px', x: rand(a, b), y: rand(top, top + 60), vx: 0, vy: fy * 18, life: 50, t: 0, color: '#8fd8ff', size: 1 });
    }
  }
  // Scuba breathing: every couple of seconds Chickaroo breathes out a little string of bubbles from
  // his beak, which wobble up toward the surface.
  breathFx() {
    const p = this.player, k = this.t % 130;
    if (p.state !== 'play' || k > 16 || k % 6) return;
    const x = p.x + p.w / 2 + p.facing * (p.power ? 7 : 6), y = p.y + p.h * (p.power ? 0.5 : 0.55);
    const top = this.level.water.top * TILE + 2, life = Math.max(10, Math.min(90, (y - top) / 0.7));
    this.particles.push({ kind: 'px', x: x + rand(-1, 1), y, vx: p.facing * 0.25 + rand(-0.15, 0.15), vy: -0.7 - k * 0.01, life, t: 0, color: k === 6 ? '#ffffff' : '#d8fbff', size: k === 6 ? 2 : 1 + (k === 0) });
  }
  // Crumbling clouds: standing on one starts a shake, then it drops away and reforms later.
  // A beanstalk climbs a row every few frames, unfurling a leaf (a semi-solid ledge) on
  // alternating sides every other row, and a leaf both ways at the top.
  updateStalks() {
    const lv = this.level;
    for (const s of lv.stalks) {
      if (s.h <= s.top) { if (s.bloom < 24) s.bloom++; continue; }
      if (++s.t % 6) continue;
      s.h--;
      const leaf = (dir, row) => {                       // one tile beside the stalk (stored as ±1)
        for (const k of [1]) {
          const c = s.c + dir * k;
          if (lv.get(c, row) !== T.EMPTY && lv.get(c, row) !== T.COIN) return;
          lv.set(c, row, T.SEMI); lv.leaves.set(row * lv.w + c, dir * k);
          this.burst(c * TILE + 8, row * TILE + 3, ['#7be08a', '#b6f59a', '#2f9a49'], 3);
        }
      };
      if (s.h === s.top) {
        leaf(1, s.h); leaf(-1, s.h); Sound.play('sprout');
        s.bloom = 0;                                       // the flower opens at the top
        this.burst(s.c * TILE + 8, s.h * TILE - 6, ['#ff7aa8', '#fff1a8', '#ffffff'], 10);
      }
      else if ((s.r - s.h) % 2 === 0) { leaf(s.side, s.h); s.side = -s.side; Sound.play('leaf'); }
    }
  }
  // the beanstalks (painted fine: sky-fine.js): the leaves, the stem over them as far up as it's grown, and at the top
  // a curled bud while it grows, then a flower that pops open and sways
  drawStalks(ctx) {
    const lv = this.level;
    for (const s of lv.stalks) {
      const y0 = s.r * TILE, yTop = s.top * TILE + 4, y1 = s.h * TILE + 4 - (s.h > s.top ? (s.t % 6) * 2.6 : 0);
      for (let row = s.h; row < s.r; row++) for (const dir of [1, -1]) {
        if (lv.leaves.get(row * lv.w + s.c + dir) !== dir) continue;
        const sx = stalkStemX(row * TILE + 3, s.c), w = Math.sin(this.t * 0.05 + sx * 0.3);
        ctx.save(); ctx.translate(sx, row * TILE); if (dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(stalkLeafArt(Math.round((w + 1) / 2 * (LEAF_SWAYS - 1)) / (LEAF_SWAYS - 1) * 2 - 1), -1, -6);
        ctx.restore();
      }
      const stem = stalkStemArt(s.c, y0, yTop), oy = yTop - 1, h = y0 - y1 + 1;
      if (h > 0) ctx.drawImage(stem, 0, y1 - oy, STALK_W, h, s.c * TILE + 8 - STALK_W / 2, y1, STALK_W, h);
      const tx = stalkStemX(y1, s.c), ty = Math.round(y1);
      if (s.bloom == null) { ctx.drawImage(stalkBudArt(), tx - 5, ty - 8); continue; }
      const k = Math.min(1, s.bloom / 24), pop = k < 1 ? k * (1.25 - 0.25 * k) : 1;
      ctx.drawImage(stalkFlowerStemArt(), tx - 6, ty - 18 + 2);
      const fx = tx + Math.sin(this.t * 0.04 + s.c) * 1.5, fy = ty - 16, hd = stalkFlowerHeadArt(), sz = 28 * pop;
      if (sz > 1) ctx.drawImage(hd, fx - sz / 2, fy - sz / 2, sz, sz);
    }
  }
  // Crumbling blocks, broken: the falling chunks, then the frosty block growing back (from the
  // bottom up, with a glittering frost line on its growing edge) before it turns solid again.
  drawCrumbles(ctx) {
    const lv = this.level, img = getTileset(lv.themeName).crumble;
    for (const cr of lv.crumbles.values()) {
      if (!cr.gone) continue;
      for (const pc of cr.pieces || []) if (pc.y < VIEW_H + 8) ctx.drawImage(img, pc.sx, pc.sy, 4, 4, Math.round(pc.x), Math.round(pc.y), 4, 4);
      if (cr.t < CRUMBLE_REFORM) continue;
      const k = Math.min(1, (cr.t - CRUMBLE_REFORM) / (CRUMBLE_BACK - CRUMBLE_REFORM)), h = Math.max(1, Math.round(k * TILE));
      const x = cr.c * TILE, y = cr.r * TILE + TILE - h;
      ctx.globalAlpha = 0.45 + k * 0.4;
      ctx.drawImage(img, 0, TILE - h, TILE, h, x, y, TILE, h);
      ctx.globalAlpha = 1;
      const edge = lv.theme.crumbleStyle === 'cracker' ? '#fff0c8' : '#e6f4ff';   // (a saltine bakes back golden, not frosty)
      if (k < 1) for (let i = 0; i < TILE; i += 0.5) fEll(ctx, x + i + 0.25, y + Math.sin(i * 1.7 + this.t * 0.3) * 0.4, 0.4, 0.4, Math.floor(i * 2 + (this.t >> 1)) % 3 ? edge : '#ffffff');   // (a glittering edge: fine)
    }
  }
  updateCrumbles() {
    const p = this.player, lv = this.level;
    if (p.state === 'play' && p.onGround && !p.platform) {
      const r = Math.floor((p.y + p.h + 1) / TILE);
      for (let c = Math.floor(p.x / TILE); c <= Math.floor((p.x + p.w - 0.01) / TILE); c++) {
        const k = r * lv.w + c;
        if (lv.get(c, r) === T.CRUMBLE && !lv.crumbles.has(k)) lv.crumbles.set(k, { c, r, t: 0, gone: false });
      }
    }
    for (const [k, cr] of lv.crumbles) {
      cr.t++;
      if (!cr.gone && cr.t >= 30) {
        // it breaks up into 16 chunks of itself that tumble away (drawn by drawCrumbles)
        lv.set(cr.c, cr.r, T.EMPTY); cr.gone = true; cr.t = 0;
        cr.pieces = [];
        for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
          cr.pieces.push({ sx: px * 4, sy: py * 4, x: cr.c * TILE + px * 4, y: cr.r * TILE + py * 4, vx: (px - 1.5) * 0.35 + rand(-0.3, 0.3), vy: rand(-1.4, 0.2) - (3 - py) * 0.15 });
        }
        const crumb = lv.theme.crumbleStyle === 'cracker' ? ['#f0d49a', '#ffffff'] : ['#e6ecfb', '#ffffff', '#cfe0ff'];   // (4-1's saltines crumble to cracker crumbs)
        for (let i = 0; i < 6; i++) this.particles.push({ kind: 'px', x: cr.c * TILE + rand(1, 13), y: cr.r * TILE + rand(4, 14), vx: rand(-0.4, 0.4), vy: rand(-0.6, 0), drag: 0.94, life: 30, t: 0, color: crumb[0], size: 2 });
        if (cr.c * TILE > this.camX - 16 && cr.c * TILE < this.camX + VIEW_W) Sound.play('crumble');
      } else if (cr.gone) {
        for (const pc of cr.pieces || []) { pc.vy = Math.min(pc.vy + 0.22, 5); pc.x += pc.vx; pc.y += pc.vy; }
        // reforming: like frost, motes drift in and the block crystallizes back from the bottom up
        if (cr.t >= CRUMBLE_REFORM && cr.t < CRUMBLE_BACK && this.t % 2 === 0) {
          const a = rand(0, Math.PI * 2), d = rand(14, 26), tx = cr.c * TILE + rand(2, 14), ty = cr.r * TILE + rand(2, 14);
          const crumb = lv.theme.crumbleStyle === 'cracker' ? ['#f0d49a', '#ffffff'] : ['#ffffff', '#cfe0ff'];
          this.particles.push({ kind: 'px', x: tx + Math.cos(a) * d, y: ty + Math.sin(a) * d, vx: -Math.cos(a) * d / 18, vy: -Math.sin(a) * d / 18, life: 18, t: 0, color: crumb[Math.random() < 0.5 ? 0 : 1], size: 1 });
        }
        if (cr.t >= CRUMBLE_BACK && !overlap(p, { x: cr.c * TILE, y: cr.r * TILE, w: TILE, h: TILE })) {
          lv.set(cr.c, cr.r, T.CRUMBLE); lv.crumbles.delete(k);
          const cracker = lv.theme.crumbleStyle === 'cracker';
          this.burst(cr.c * TILE + 8, cr.r * TILE + 8, cracker ? ['#f0d49a', '#fff0c8'] : ['#ffffff', '#cfe0ff'], 6);
          Sound.play(cracker ? 'crumble' : 'freeze');
        }
      }
    }
  }
  // ---------- 2-4: moonglass ----------------------------------------------------
  // Every moonglass cell is solid while a lit moonlamp shines on it (Moonlamp.lights) and fades
  // back to a ghostly outline when the last such lamp goes out. It never forms around anyone
  // standing inside it; for its lamp's last GLASS_WARN frames it flickers.
  updateGlass() {
    const lv = this.level, p = this.player, lamps = this.entities.filter(e => e instanceof Moonlamp && e.lit > 0);
    const warn = lv.glassWarn || (lv.glassWarn = new Set());
    warn.clear();
    let on = 0, off = 0;
    for (const i of lv.glass) {
      const c = i % lv.w, r = Math.floor(i / lv.w);
      let best = 0;
      for (const l of lamps) if (l.lit > best && l.lights(c, r)) best = l.lit;
      const solid = lv.tiles[i] === T.GLASS;
      if (best > 0) {
        if (best < GLASS_WARN) warn.add(i);
        if (solid) continue;
        const cell = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
        if (p.state === 'play' && overlap(p, cell)) continue;
        lv.tiles[i] = T.GLASS; on++;
        lv.glassT.set(i, this.t);
        if (on < 6) this.sparkle(c * TILE + 8, r * TILE + 4);
      } else if (solid) {
        lv.tiles[i] = T.GLASS_OFF; off++;
        lv.glassT.set(i, this.t);
        for (let k = 0; k < 3; k++) this.particles.push({ kind: 'px', x: c * TILE + rand(2, 14), y: r * TILE + rand(2, 10), vx: rand(-0.4, 0.4), vy: rand(0.2, 1), g: 0.05, life: 30, t: 0, color: k ? '#b9a8ff' : '#ffffff', size: 1 });
      }
    }
    if (on) Sound.play('glassOn');
    if (off) Sound.play('glassOff');
  }
  // lit glass: a pale, glowing pane of moonlight (drawn with the tiles, under the dark)
  drawGlassTile(ctx, i, c, r) {   // (painted fine: moonglassArt, eclipse-fine.js)
    const lv = this.level, x = c * TILE, y = r * TILE, t = this.t, born = t - (lv.glassT.get(i) ?? -99);
    const a = lv.glassWarn && lv.glassWarn.has(i) && (t >> 2) % 2 ? 0.45 : 1;
    const n = (lv.get(c - 1, r) === T.GLASS ? 1 : 0) | (lv.get(c + 1, r) === T.GLASS ? 2 : 0) | (lv.get(c, r - 1) === T.GLASS ? 4 : 0);
    ctx.globalAlpha = a * (0.72 + 0.2 * Math.min(1, born / 10));
    ctx.drawImage(moonglassArt(n), x, y);
    ctx.globalAlpha = a * 0.7;
    for (let j = 0; j < 2; j++) {   // sheen: two slanted streaks drifting across
      const sx = ((t >> 1) + c * 23 + j * 9) % 40 - 12;
      for (let q = 0; q < 6; q += 1 / 3) if (sx + q >= 1 && sx + q < TILE - 1) fRect(ctx, x + sx + q, y + 2 + q, 1 / 3, 1 / 3, '#e8e0ff');
    }
    if (born < 10) { ctx.globalAlpha = 1 - born / 10; fRect(ctx, x, y, TILE, TILE, '#ffffff'); }
    ctx.globalAlpha = 1;
  }
  // over the dark: unlit glass shows as a faint dotted outline (so you can see where a bridge will
  // form), and lit glass keeps a bright rim
  drawGlassOver(ctx, cam) {
    const lv = this.level, c0 = Math.floor(cam / TILE) - 1, c1 = c0 + Math.ceil(VIEW_W / TILE) + 2;
    for (const i of lv.glass) {
      const c = i % lv.w, r = Math.floor(i / lv.w);
      if (c < c0 || c > c1) continue;
      const x = c * TILE, y = r * TILE;
      if (lv.tiles[i] === T.GLASS) {
        if (lv.glassWarn && lv.glassWarn.has(i) && (this.t >> 2) % 2) continue;
        ctx.globalAlpha = 0.5; if (lv.get(c, r - 1) !== T.GLASS) fRect(ctx, x, y, TILE, 2 / 3, '#ffffff');
        ctx.globalAlpha = 0.25; fRect(ctx, x, y + 2 / 3, TILE, 5 / 3, '#c9b8ff');
      } else {
        const tw = 0.22 + Math.sin(this.t * 0.05 + c * 0.8 + r) * 0.08;
        ctx.globalAlpha = tw;   // a fine dashed outline where the glass will form (in fine pixels: hires.js)
        for (let q = 0.5; q < TILE; q += 4) {
          if (lv.get(c, r - 1) !== T.GLASS_OFF) fRect(ctx, x + q, y + 1 / 3, 2.6, 2 / 3, '#b9a8ff');
          if (lv.get(c, r + 1) !== T.GLASS_OFF) fRect(ctx, x + q, y + TILE - 1, 2.6, 2 / 3, '#b9a8ff');
          if (lv.get(c - 1, r) !== T.GLASS_OFF) fRect(ctx, x + 1 / 3, y + q, 2 / 3, 2.6, '#b9a8ff');
          if (lv.get(c + 1, r) !== T.GLASS_OFF) fRect(ctx, x + TILE - 1, y + q, 2 / 3, 2.6, '#b9a8ff');
        }
        if ((this.t + c * 37 + r * 11) % 160 < 6) { ctx.globalAlpha = 0.8; fBlob(ctx, x + ((c * 5) % 12) + 2.5, y + 3.5, 0.6, '#ffffff'); }
      }
    }
    ctx.globalAlpha = 1;
  }
  // ---------- 2-4: the shadow's trail, banners, darkness ------------------------
  recordTrail() {
    const tr = this.trail;
    tr.push(trailSnap(this.player, this.t));
    if (tr.length > 1800) { tr.splice(0, 600); this.trailBase += 600; }
  }
  trailFrame() { return this.trailBase + this.trail.length - 1; }   // newest recorded frame
  trailAt(f) { const tr = this.trail; return tr[clamp(Math.round(f) - this.trailBase, 0, tr.length - 1)]; }
  // A game tip: shown in the dialogue box under a lightbulb (see speak / drawDialog), after anyone who's talking
  say(a, b, col, life) { return this.tipLine(a, b, col, typeof life === 'number' ? life : null); }   // life: frames on screen (default: long enough to read)
  // Eclipse darkness: a dim veil with light punched out around Chickaroo, moonlamps (and their cones), fireballs and
  // the crystal: on a fine veil (hires.js), each pool of light fading smoothly to its rim
  drawDarkness(ctx, ox, oy) {
    const cv = this.darkCv || (this.darkCv = makeHiCanvas(VIEW_W, VIEW_H)), d = cv.getContext('2d');
    d.setTransform(ART_R, 0, 0, ART_R, 0, 0);
    d.globalCompositeOperation = 'source-over'; d.globalAlpha = 1;
    d.clearRect(0, 0, VIEW_W, VIEW_H);
    d.globalAlpha = this.darkness(); d.fillStyle = '#05030f'; d.fillRect(0, 0, VIEW_W, VIEW_H);
    d.globalCompositeOperation = 'destination-out';
    if (!this.holeCanvases) this.holeCanvases = new Map();
    const getHoleImg = r => {
      const key = Math.round(r);
      let img = this.holeCanvases.get(key);
      if (!img) {
        const sz = key * 2;
        const c = makeCanvas(sz, sz), cg = c.getContext('2d');
        const gr = cg.createRadialGradient(key, key, key * 0.3, key, key, key);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.9)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        cg.fillStyle = gr; cg.beginPath(); cg.arc(key, key, key, 0, Math.PI * 2); cg.fill();
        img = c;
        this.holeCanvases.set(key, img);
      }
      return img;
    };
    // stepped rings fading in to a fully clear core: a flashlight-like pool of light with a soft rim
    const hole = (x, y, r, a = 1) => {
      const cx = x - ox, cy = y + oy;
      const img = getHoleImg(r);
      d.globalAlpha = a;
      d.drawImage(img, cx - r, cy - r);
    };
    const row = (x, y, hw, a) => { d.globalAlpha = a; d.fillStyle = '#000'; d.fillRect(x - hw - ox, y + oy, hw * 2, 1); };
    // a beam: a smooth trapezoid of light from `top` (half-width hw) widening by `slope` per px down to `bot`
    const cone = (x, top, bot, hw, slope, a) => {
      const w1 = hw + (bot - top) * slope, X = x - ox;
      d.globalAlpha = a; d.fillStyle = '#000'; d.beginPath();
      d.moveTo(X - hw, top + oy); d.lineTo(X + hw, top + oy); d.lineTo(X + w1, bot + oy); d.lineTo(X - w1, bot + oy); d.fill();
    };
    const p = this.player;
    // in the deep, Chickaroo's own light is the only light there is (nothing else glows down there)
    const lv0 = this.level;
    if (p && !p.hidden) hole(p.x + p.w / 2, p.y + p.h / 2, 62);
    if (this.deep <= 0.01) for (const e of this.entities) if (e.glow) e.glow(hole, row, cone);
    for (const f of this.fireballs) if (f.w) hole(f.x + f.w / 2, f.y + f.h / 2, 22);
    const lv = this.level;
    if (lv.crystalOn) hole(lv.crystalX, lv.goalY + lv.goalLift, 56);
    for (const i of lv.glass) if (lv.tiles[i] === T.GLASS) { const c = i % lv.w; if (c * TILE > ox - 32 && c * TILE < ox + VIEW_W + 16) hole(c * TILE + 8, Math.floor(i / lv.w) * TILE + 8, 15, 0.45); }
    d.globalCompositeOperation = 'source-over'; d.globalAlpha = 1;
    ctx.drawImage(cv, 0, 0);
  }
  darkness() { return this.level && this.level.themeName === 'eclipse' ? 0.88 * (1 - this.eclipse) : (this.deep || 0); }
  clearBossHazards() {
    for (const e of this.entities) if (e.bossHazard) { this.burst(e.cx, e.y + e.h / 2, ['#ff6a1f', '#ffd166'], 5); e.remove = true; }
  }
  // `later`: MAGMAW's ember has to own up and leave before the exit opens.
  bossDefeated(b, later) {
    this.addScore(10000, b.cx, b.y - 10);
    if(b.defeatBurst!==false){
      this.shake = 8;
      this.burst(b.cx, b.y + b.h / 2, ['#ff6a1f', '#ffd166', '#ffffff', '#e8401a', '#ff7ad9'], 60);
    }
    if (!later) this.openBossExit();
  }
  openBossExit() {
    const lv = this.level, b = lv.def.boss;
    if (lv.exitOpen || lv.def.goal.type !== 'exit' || !b) return;
    lv.exitOpen = true;
    for (let row = 0; row <= 11; row++) lv.set(b.right, row, T.EMPTY);
    lv.skyGates.delete(b.right);
    this.arenaCam = this.arenaMax = null;
    this.camGlide = false; this.camV = 0;
    Sound.play('gate');
  }
  // % complete for the stage: 70% for collecting all its pollen, 30% for the three letters. Rounded
  // down, so 100% means truly everything. The best one per stage is remembered.
  completion() {
    const lv = this.level, pol = lv.pollenTotal ? Math.min(1, this.levelPollen / lv.pollenTotal) : 1;
    const let3 = (lv.def.letters && lv.def.letters.length) ? this.lettersGot.size / lv.def.letters.length : 1;
    return Math.floor(100 * (pol * 0.7 + let3 * 0.3) + 1e-9);
  }
  saveBest(id, pct) {
    try {
      const best = JSON.parse(localStorage.getItem('chickaroo-best') || '{}');
      this.prevBest = best[id] || 0;
      if (pct > this.prevBest) { best[id] = pct; localStorage.setItem('chickaroo-best', JSON.stringify(best)); }
      const cleared = this.clearedLevels();   // reaching the end unlocks the next stage in LEVEL SELECT
      if (!cleared.has(id)) { cleared.add(id); localStorage.setItem('chickaroo-cleared', JSON.stringify([...cleared])); }
    } catch (e) { this.prevBest = 0; }
  }
  startTally() {
    this.clearPct = this.completion(); this.clearLetters = new Set(this.lettersGot); this.clearPollen = this.levelPollen;
    this.saveBest(LEVELS[this.levelIndex].id, this.clearPct);
    this.lettersLevel = null; this.tally = true; this.tallyT = 0;
  }

}
mixin(Game, GameWorld);
