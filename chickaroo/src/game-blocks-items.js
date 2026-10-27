'use strict';
// Part of class Game (see game.js): GameBlocksItems
class GameBlocksItems {
  // ---------- blocks ---------------------------------------------------------
  hitBlock(c, r) {
    const lv = this.level, p = this.player, t = lv.get(c, r);
    const bump = () => { lv.bumps.push({ c, r, t: 0 }); this.bumpAbove(c, r); };
    switch (t) {
      case T.BRICK:
        // a few random crates hold a 1-hit shield (picked anew each time the level starts)
        if (this.shieldCrates && this.shieldCrates.has(lv.idx(c, r))) {
          lv.set(c, r, T.EMPTY); this.breakBrick(c, r); this.bumpAbove(c, r); this.gainShield(c, r);   // smash it open, at any size
          break;
        }
        if (p.power > 0) { lv.set(c, r, T.EMPTY); this.breakBrick(c, r); this.bumpAbove(c, r); }
        else { bump(); Sound.play('bump'); }
        break;
      case T.QCOIN: lv.set(c, r, T.USED); bump(); this.coinPop(c, r); break;
      case T.QPOW:
        lv.set(c, r, T.USED); bump();
        let kind = lv.powerKinds.get(lv.idx(c, r));
        if (kind === 'rand') kind = SUIT_KINDS[Math.floor(Math.random() * SUIT_KINDS.length)];
        this.items.push(new Item(kind || 'berry', c, r, lv.solid(c, r - 1)));
        Sound.play('appear');
        break;
      case T.SEED:
        lv.set(c, r, T.USED); bump();
        lv.stalks.push({ c, r, top: lv.seedTops.get(lv.idx(c, r)), h: r, t: 0, side: p.x + p.w / 2 < c * TILE + 8 ? 1 : -1 });
        Sound.play('sprout');
        break;
      case T.Q1UP: case T.HIDDEN:
        lv.set(c, r, T.USED); bump();
        this.items.push(new Item('oneup', c, r, lv.solid(c, r - 1)));
        Sound.play('appear');
        break;
      case T.MULTI: {
        const k = lv.idx(c, r);
        const n = (lv.multi.has(k) ? lv.multi.get(k) : 8) - 1;
        lv.multi.set(k, n);
        if (n <= 0) lv.set(c, r, T.USED);
        bump(); this.coinPop(c, r);
        break;
      }
      default: Sound.play('bump');
    }
  }
  bumpAbove(c, r) {
    const top = r * TILE, x0 = c * TILE, x1 = x0 + TILE;
    for (const e of this.entities) {
      if (e.dead || !e.bumpKill) continue;
      if (e.x < x1 && e.x + e.w > x0 && Math.abs(e.y + e.h - top) < 5) {
        e.flipKill(this, e.cx < x0 + 8 ? -1 : 1);
        this.addScore(100, e.cx, e.y);
        Sound.play('kick');
      }
    }
    for (const it of this.items) {
      if (it.emerging || SUIT_OF[it.kind]) continue;
      if (it.x < x1 && it.x + it.w > x0 && Math.abs(it.y + it.h - top) < 5) {
        it.vy = -4;
        it.vx = (it.x + 7 < x0 + 8 ? -1 : 1) * (Math.abs(it.vx) || 1.1);
      }
    }
    if (this.level.get(c, r - 1) === T.COIN) { this.level.set(c, r - 1, T.EMPTY); this.coinPop(c, r - 1); }
    // a C K R egg sitting on the block is knocked up into his wings, like a coin
    (this.level.def.letters || []).forEach(([lc, lr], i) => { if (lr === r - 1 && lc === c && !this.lettersGot.has(i)) this.collectLetter(i); });
  }
  // A kicked shell or a roll smashing into a crate: wooden crates burst, and a multi-pollen
  // crate bursts too, spilling all the pollen it had left. Returns true if something broke.
  smashCrate(c, r) {
    const lv = this.level, t = lv.get(c, r);
    if (t !== T.BRICK && t !== T.MULTI) return false;
    if (t === T.MULTI) {
      const k = lv.idx(c, r), n = lv.multi.has(k) ? lv.multi.get(k) : 8;
      for (let i = 1; i < n; i++) { this.addCoin(); this.addScore(200); }   // coinPop pays the last one
      this.coinPop(c, r); lv.multi.delete(k);
    }
    lv.set(c, r, T.EMPTY); this.breakBrick(c, r); this.bumpAbove(c, r);
    return true;
  }
  breakBrick(c, r, stone) {
    const x = c * TILE, y = r * TILE;
    [[-1.4, -5.5, 0, 0], [1.4, -5.5, 8, 0], [-1.2, -3.5, 0, 8], [1.2, -3.5, 8, 8]].forEach(([vx, vy, ox, oy]) => {
      this.particles.push({ kind: 'frag', x: x + ox, y: y + oy, vx, vy, g: 0.3, life: 70, t: 0, stone });
    });
    this.addScore(50);
    this.shake = Math.max(this.shake, 2);
    Sound.play('break');
  }
  coinPop(c, r) {
    this.addCoin(); this.addScore(200);
    this.pollenFly(c * TILE + 8, r * TILE - 4, 0, -4.5, 14);   // puffs up out of the block first
  }
  // A collected pollen puff: drifts free for `delay` frames, then homes in on the HUD counter,
  // leaving a soft fading trail behind it.
  pollenFly(x, y, vx, vy, delay, col = POLLEN_COL[this.level ? this.level.themeName : 'meadow'] || POLLEN_COL.meadow) {
    this.particles.push({ kind: 'pollen', x, y, vx, vy, t: 0, life: 150, delay, color: col });
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      this.particles.push({ kind: 'px', x, y, vx: Math.cos(a) * 1.1, vy: Math.sin(a) * 1.1, drag: 0.9, life: 22, t: 0, color: i % 2 ? '#ffffff' : col, size: 2 });
    }
  }

  // ---------- scoring & items --------------------------------------------------
  addScore(n) {
    this.score += n;
  }
  addCoin() {
    this.coins++; this.levelPollen++;
    Sound.play('coin');
    if (this.coins >= 100) { this.coins -= 100; this.oneUp(); }
  }
  oneUp(x, y) {
    this.lives = Math.min(99, this.lives + 1);
    Sound.play('oneup');
    const p = this.player;
    this.popup(x !== undefined ? x : p.x + p.w / 2, y !== undefined ? y : p.y - 4, '1UP', '#7be08a');
  }
  collectItem(it) {
    const p = this.player;
    if (it.kind === 'oneup') { this.oneUp(it.x + 7, it.y); return; }
    if (it.kind === 'coin') {   // the camel's fare (3-1): carried until HUMPHREY takes it
      this.camelCoin = true; Sound.play('coin');
      return;
    }
    this.addScore(1000, p.x + p.w / 2, p.y - 4);
    Sound.play('power');
    const suit = SUIT_OF[it.kind];
    if (suit && p.power === 2) {
      this.reservePower = it.kind;
      this.voltReserveHits = suit === 'volt' ? VOLT_HITS : null;   // a stored volt keeps the charge it was picked up with
      this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffd166', '#ffffff'], 8);
      return;
    }
    const target = suit ? 2 : Math.max(1, p.power);
    if (suit) {
      p.suit = suit; p.charge = 0; p.pounding = false;
      if (suit === 'volt') p.voltHits = VOLT_HITS;   // a fresh hat comes with a full fifteen zaps
    }
    if (target !== p.power) {
      this.freezeFrom = p.power;
      p.power = target;
      const h = p.crouch ? CROUCH_BIG_H : BIG_H;
      p.y += p.h - h; p.h = h;
      this.freezeT = 40;
    }
    this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffd166', '#ffffff', '#2ec4b6'], 14);
  }
  swapReserve() {
    const p = this.player;
    if (!p || p.state !== 'play' || p.inPod || p.finaleLocked || this.cinema > 0 || this.camGlide) return;
    if (!Object.hasOwn(SUIT_OF, this.reservePower)) this.reservePower = null;
    const incoming = this.reservePower;
    if (!incoming && p.power !== 2) return;
    const suit = incoming && SUIT_OF[incoming], power = suit ? 2 : 0;
    const h = p.crouch ? (power ? CROUCH_BIG_H : CROUCH_SMALL_H) : (power ? BIG_H : SMALL_H);
    // Keep his feet planted; if growing would enter a low ceiling, equip in the crouched pose.
    let height = h;
    if (h > p.h && this.overlapsSolid({ ...p, y: p.y + p.h - h, h })) {
      height = power ? CROUCH_BIG_H : CROUCH_SMALL_H;
      if (this.overlapsSolid({ ...p, y: p.y + p.h - height, h: height })) return;
      p.crouch = true;
    }
    this.reservePower = p.power === 2 ? (p.suit === 'fire' || !p.suit ? 'pepper' : p.suit) : null;
    const leaving = p.power === 2 ? p.suit : null, carrying = p.voltHits;
    if (leaving === 'volt') this.voltReserveHits = carrying;   // the charge travels with the hat into or out of storage
    p.y += p.h - height; p.h = height; p.power = power; p.suit = suit || null;
    p.charge = p.cool = p.wand = p.hammerT = 0; p.gliding = false;
    p.voltHits = suit === 'volt' ? (leaving === 'volt' ? carrying : (this.voltReserveHits ?? VOLT_HITS)) : 0;
    if (suit === 'volt' && leaving !== 'volt') this.voltReserveHits = null;
    p.voltWindup = 0;
    this.power = p.power; this.suit = p.suit;
    Sound.play('select');
    this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffffff', '#ffd166'], 6);
  }
  stompScore(e) {
    const p = this.player;
    if (p.combo >= STOMP_SCORES.length) this.oneUp(e.cx, e.y);
    else this.addScore(STOMP_SCORES[p.combo], e.cx, e.y);
    p.combo++;
    if (this.band && this.band.joined.has('drums') && !this.bandHushed()) Sound.play('tss');   // (RASCAL hits the cymbal for him)
  }
  isStomp(p, e) {
    const m = e.stompMargin || (p.pounding ? 12 : 8);
    return !this.wet(p.x + p.w / 2) && (p.vy > 0 || p.pounding) && p.prevY + p.h <= e.y + m;
  }
  // Stomp bounce. Pressing (or holding) jump in sync with the stomp turns it into a full-height
  // jump; a jump pressed up to a few frames early counts too (it's still in the jump buffer).
  bounce(p, fullJump = false) {
    const held = Input.down('jump') || Input.down('up'), jump = fullJump || held || this.t - p.pressT <= STOMP_EARLY;
    p.vy = jump ? -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS) : -STOMP_BOUNCE;
    p.stompT = this.t; p.stompSmall = !jump;
    p.holdGrace = jump ? 34 : 0;            // a well-timed tap still gets the whole rise (full-jump height)
    p.stompY = p.y;
    p.jumping = true; p.onGround = false; p.platform = null; p.jumpBuf = 0; p.blast = 0; p.flaps = 0;   // a stomp gives the flap back
    if (p.vine) this.letGoVine(p, 14);   // stomped something from the vine: hop off it
    p.sx = 0.85; p.sy = 1.2;
    this.rainbowBounce(p);
  }
  gainShield(c, r) {
    const p = this.player;
    this.shield = true;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#7ad7ff', '#bff4ff', '#ffffff'], 12);
    this.popup(c * TILE + 8, r * TILE - 18, 'SHIELD');
    Sound.play('appear');
  }
  hurtPlayer() {
    const p = this.player;
    if (p.invuln > 0 || p.state !== 'play' || p.inPod) return;
    if (this.shield) {   // the shield takes the hit and shatters
      this.shield = false; p.invuln = 90;
      this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#7ad7ff', '#bff4ff', '#ffffff'], 18);
      this.shake = Math.max(this.shake, 2); Sound.play('shatter');
      return;
    }
    this.dropHeld(); this.endRoll(p);
    if (p.vine) this.letGoVine(p, 40);   // knocked off the vine
    p.ladder = null;                     // ...or the ladder
    // one step down per hit: chili -> big -> small -> out
    if (p.power > 0) {
      if (p.power >= 2) this.popHat(p.suit || 'fire');
      this.freezeFrom = p.power; p.power--; this.freezeT = 40; p.charge = 0; p.pounding = false;
      if (p.power < 2) p.suit = null;
      if (p.power === 0) {
        const h = p.crouch ? CROUCH_SMALL_H : SMALL_H;
        p.y += p.h - h; p.h = h;
      }
      p.invuln = 130;
      Sound.play('shrink');
      if (this.band && this.band.members.length) Sound.play('flub');
      this.shake = 2.5;
    } else this.killPlayer('hit');
  }
  // the hat blows off like a champagne cork: straight up with a POP, spinning, a fizz of bubbles in its wake
  popHat(hat) {
    const p = this.player, x = p.x + p.w / 2, y = p.y + 1;
    this.particles.push({ kind: 'hat', hat, x, y, vx: -p.facing * 0.5 + rand(-0.3, 0.3), vy: -7.5, g: 0.28, life: 90, t: 0, rot: 0, vr: (p.facing || 1) * 0.35, live: true });
    for (let i = 0; i < 12; i++) this.particles.push({ kind: 'px', x: x + rand(-4, 4), y, vx: rand(-1.6, 1.6), vy: rand(-3.5, -0.5), g: 0.05, life: 30, t: 0, color: i % 2 ? '#ffffff' : '#fff0a8', size: 2 });
    Sound.play('pop');
  }
  killPlayer(kind) {
    const p = this.player;
    if (p.state === 'dead') return;
    if (this.devGod > 0 && kind !== 'pit') return;   // (dev warp invincibility: spikes, acid, lava... can't kill him; only falling out of the world)
    this.shield = false;
    this.dropHeld();
    p.crouch = false; p.charge = 0; p.roll = 0; p.rollSpeed = 0; p.pounding = false; p.suit = null;
    p.vine = null; p.inPod = null; p.blast = 0; p.ladder = null;
    this.dropCat();   // the cat companion vanishes on the spot (no lingering through the death)
    p.state = 'dead'; p.deathKind = kind; p.deadT = 0; p.vx = 0; p.vy = 0;
    p.y = Math.min(p.y + p.h - SMALL_H, VIEW_H + 40); p.h = SMALL_H; p.power = 0;
    Music.remember(this.level.def.id);
    Music.stop();
    Sound.play(kind === 'lava' ? 'burn' : this.band && this.band.members.length ? 'sadTrombone' : 'die');   // (the band plays him out)
    if (kind === 'acid') { Sound.play('sizzle'); this.burst(p.x + p.w / 2, p.y + p.h, ['#c8ff6a', '#46a020', '#f0ffc0'], 16); }
    if (kind === 'lava') { Sound.play('die'); this.burst(p.x + p.w / 2, 13 * TILE, ['#ff6a1f', '#ffd166', '#e8401a'], 16); }
    this.shake = kind === 'pit' || kind === 'sand' || kind === 'river' ? 0 : 3;
    if (kind === 'sand') { Sound.play('sandsink'); this.sandPuff(p.x + p.w / 2, p.y + 2, 10, -2); }
    if (kind === 'river') { Sound.play('splash'); this.splash(p.x + p.w / 2, this.waterAt(p.x + p.w / 2) || p.y, 12); }
  }
  updateDeath() {
    const p = this.player;
    p.deadT++;
    if (p.deathKind === 'river') {
      // swept under: he sinks to the riverbed and lies there, a few last bubbles rising
      const lv = this.level, c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
      let bed = VIEW_H + 40;
      for (let c = c0; c <= c1; c++) for (let r = Math.max(0, Math.floor((p.y + p.h) / TILE)); r < ROWS; r++) if (lv.solid(c, r)) { bed = Math.min(bed, r * TILE); break; }
      p.y = Math.min(p.y + 0.35, Math.max(p.y, bed - p.h));
      if (p.deadT % 12 === 0 && p.deadT < 80) this.bubble(p.x + p.w / 2 + rand(-3, 3), (this.waterAt(p.x + p.w / 2) || p.y) - 1);
    } else if (p.deathKind === 'sand') {
      // swallowed: a last few bubbles of sand where he went under
      p.y += 0.3;
      if (p.deadT % 10 === 0 && p.deadT < 90) this.sandPuff(p.x + p.w / 2, p.y - 2, 2, -1.2);
    } else if (p.deathKind !== 'pit') {
      if (p.deadT === 24) p.vy = -6.2;
      if (p.deadT > 24) { p.vy = Math.min(p.vy + 0.28, 6); p.y += p.vy; }
    }
    if (p.deadT === 170) this.transition(() => this.afterDeath());
  }
  pickUp(sh) {
    this.held = sh;
    sh.state = 'held'; sh.walker = false; sh.vx = 0; sh.vy = 0;
    sh.holdPos(this.player);
    Sound.play('select');
  }
  // Put the shell somewhere it isn't stuck in a wall (fall back to the player's centre).
  placeHeld(sh) {
    const p = this.player, lv = this.level;
    const c0 = Math.floor(sh.x / TILE), c1 = Math.floor((sh.x + sh.w - 0.01) / TILE);
    const r0 = Math.floor(sh.y / TILE), r1 = Math.floor((sh.y + sh.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (lv.solid(c, r)) { sh.x = p.x + p.w / 2 - sh.w / 2; return; }
  }
  throwHeld() {
    const sh = this.held, p = this.player;
    if (!sh) return;
    this.held = null;
    this.placeHeld(sh);
    sh.shellT = Math.min(sh.shellT, 400);
    if (Input.down('up')) {
      sh.state = 'toss'; sh.walker = false; sh.vy = -7; sh.vx = p.vx * 0.5; sh.grace = 20;
      Sound.play('kick');
    } else if (Input.down('down')) {
      // set it down just in front, with a moment's grace so we don't kick it immediately
      sh.state = 'shell'; sh.walker = true; sh.vx = 0; sh.vy = 0; sh.grace = 20;
      sh.x = p.facing > 0 ? p.x + p.w : p.x - sh.w; sh.y = p.y + p.h - sh.h;
      this.placeHeld(sh);
      Sound.play('select');
    } else {
      sh.state = 'slide'; sh.walker = false; sh.grace = 14; sh.combo = 0;
      sh.vx = SHELL_SPEED * p.facing; sh.vy = 0;
      Sound.play('kick');
      this.addScore(400, sh.cx, sh.y);
    }
  }
  dropHeld() {
    const sh = this.held;
    if (!sh) return;
    this.held = null;
    this.placeHeld(sh);
    sh.state = 'shell'; sh.walker = true; sh.vx = 0; sh.vy = 0;
  }
  // Chili power (fire form): tap run to spit a pepper; keep holding to charge, release to fire a
  // hot pepper (half charge) or a chili blast (full charge). Carrying a shell blocks it.
  updateChili(p) {
    if (p.power !== 2 || this.held || p.state !== 'play') { p.charge = 0; return; }
    if (Input.hit('run')) this.throwFire();
    if (Input.down('run')) {
      p.charge++;
      if (p.charge === CHARGE_MID) Sound.play('chargeUp');
      if (p.charge === CHARGE_FULL) { Sound.play('charged'); this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffffff', '#ffd166'], 10); }
      if (p.charge > CHARGE_FULL && p.charge % 24 === 0) Sound.play('chargeHum');
      if (p.charge > 12) {
        // sparks drawn in toward Chickaroo
        const full = p.charge >= CHARGE_FULL, n = full ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), r = rand(16, 26), sx = p.x + p.w / 2 + Math.cos(a) * r, sy = p.y + p.h / 2 + Math.sin(a) * r;
          this.particles.push({ kind: 'px', x: sx, y: sy, vx: -Math.cos(a) * r / 14, vy: -Math.sin(a) * r / 14, life: 14, t: 0, color: full ? (i ? '#ffffff' : '#ffd166') : '#ff8a2a', size: 1 });
        }
      }
    } else {
      if (p.charge >= CHARGE_MID) this.fireCharged(p, p.charge >= CHARGE_FULL ? 2 : 1);
      p.charge = 0;
    }
  }
  fireCharged(p, level) {
    const mouth=this.spitOrigin(p),x=mouth.x,y=mouth.y;p.wand=8;
    this.fireballs.push(new ChiliShot(x, y, p.facing, level));
    if (level === 2) {
      Sound.play('blast');
      this.shake = Math.max(this.shake, 5);
      this.burst(x, y, ['#ff3b2f', '#ff8a2a', '#ffd166', '#ffffff'], 18);
    } else {
      Sound.play('shot');
      this.burst(x, y, ['#ff8a2a', '#ffd166'], 8);
    }
  }
  throwFire() {
    if (this.held) return;
    if (this.fireballs.filter(f => !f.level).length >= 2) return;
    const p = this.player;
    const mouth=this.spitOrigin(p);p.wand=8;
    this.fireballs.push(new Fireball(mouth.x-(p.facing<0?8:0),mouth.y-4,p.facing));
    Sound.play('fire');
  }

}
mixin(Game, GameBlocksItems);
