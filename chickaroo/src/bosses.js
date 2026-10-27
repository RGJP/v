'use strict';
// ── Boss: MAGMAW, guardian of the Ember Citadel exit ───────────────────────
// Only five head stomps beat him (regular or ground pound, 4 damage each out of 20 HP). Every stomp stuns him,
// and he gets nastier as he goes: fire spit and leaps with ground flames; then STOKING the floor (little
// flames spring up out of it -- each one glows as a coal first, never right under Chickaroo, and burns out);
// and finally falling embers, three-shot spit, and leaps that leave flames where he lands.
class BossShot extends Enemy {
  constructor(x, y, vx, vy) {
    super(x - 5, y - 5, 10, 10);
    this.vx = vx; this.vy = vy; this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    this.x += this.vx; this.y += this.vy;
    if (this.t % 2 === 0) g.spark(this.cx, this.y + 5, '#ff8a2a', 14);
    if (g.level.solid(Math.floor(this.cx / TILE), Math.floor((this.y + 5) / TILE)) || this.y > VIEW_H || this.y < -24 || this.x < g.camX - 24 || this.x > g.camX + VIEW_W + 24) {
      g.burst(this.cx, this.y + 5, ['#ff6a1f', '#ffd166'], 5);
      this.remove = true;
    }
  }
  draw(ctx) {
    const cx = this.cx, cy = this.y + 5;
    blob(ctx, cx, cy, 5, '#e8401a');
    blob(ctx, cx, cy, 4, '#ff8a2a');
    blob(ctx, cx, cy, 2, '#ffe08a');
  }
}

class FlameWave extends Enemy {
  constructor(x, dir, speed) {
    super(x, 12 * TILE - 12, 14, 12);
    this.vx = dir * speed; this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    if (sweepX(g.level, this, this.vx)) { g.burst(this.cx, this.y + 6, ['#ff6a1f', '#ffd166'], 6); this.remove = true; return; }
    if (this.t % 3 === 0) g.spark(this.x + rand(2, 12), this.y + 10, '#ffd166', 12, rand(-0.3, 0.3), rand(-1.2, -0.4));
  }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    fRoundRect(ctx, x, y + 8, 14, 4, 1.5, '#e8401a');   // (in fine pixels: hires.js)
    for (let i = 0; i < 3; i++) {
      const h = 6 + Math.sin((this.t * 0.25) + i * 2.1) * 2 + 1;
      fPoly(ctx, [[x + i * 5 - 0.6, y + 12], [x + i * 5 + 2, y + 12 - h - 1], [x + i * 5 + 4.6, y + 12]], '#ff6a1f');
      fPoly(ctx, [[x + i * 5 + 0.8, y + 12], [x + i * 5 + 2, y + 12 - h + 3], [x + i * 5 + 3.2, y + 12]], '#ffd166');
    }
  }
}

// a little flame MAGMAW stokes up out of the floor: a glowing coal first (FLAMELET_WARN frames, harmless), then it
// burns for FLAMELET_BURN, then gutters out. Fair: they never spring up right under him, and never more than FLAMELET_MAX
const FLAMELET_WARN = 52, FLAMELET_BURN = 250, FLAMELET_MAX = 14;
class Flamelet extends Enemy {
  constructor(cx, floor, delay = 0) {
    super(cx - 5, floor - 13, 10, 13);
    this.floor = floor; this.t = -delay; this.bossHazard = true; this.noFreeze = true; this.ph = rand(0, 6);
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  burning() { return this.t >= FLAMELET_WARN && this.t < FLAMELET_WARN + FLAMELET_BURN; }
  hitbox() { return this.burning() ? { x: this.x + 1.5, y: this.y + 4, w: 7, h: 9 } : null; }
  update(g) {
    this.t++;
    const on = this.x > g.camX - 16 && this.x < g.camX + VIEW_W;
    if (this.t === FLAMELET_WARN && on) { Sound.play('fire'); g.burst(this.cx, this.floor - 2, ['#ff6a1f', '#ffd166'], 4); }
    if (this.burning() && this.t % 9 === 0) g.spark(this.cx + rand(-2, 2), this.y + 2, '#ffb347', 16, rand(-0.2, 0.2), rand(-0.9, -0.4));
    if (this.t > FLAMELET_WARN + FLAMELET_BURN + 24) this.remove = true;
  }
  draw(ctx) {   // (in fine pixels: hires.js)
    if (this.t < 0) return;
    const cx = this.cx, f = this.floor, t = this.t;
    if (t < FLAMELET_WARN) {   // the coal: a crack in the floor glowing brighter and brighter, a wisp of smoke over it
      const k = t / FLAMELET_WARN;
      fGlow(ctx, cx, f - 1, 7 + k * 5, '#ff6a1f', 0.25 + k * 0.4);
      fEll(ctx, cx, f - 0.6, 3.6 + k * 1.4, 1.1, '#5a1a0a'); fEll(ctx, cx, f - 0.8, 2.6 + k * 1.2, 0.7, k > 0.5 ? '#ffb347' : '#e8401a');
      ctx.globalAlpha = 0.35 * k; fBlob(ctx, cx + Math.sin(t * 0.1) * 1.5, f - 5 - k * 6, 1.4 + k, '#b8a8b0'); ctx.globalAlpha = 1;
      return;
    }
    const left = FLAMELET_WARN + FLAMELET_BURN - t, size = Math.min(1, (t - FLAMELET_WARN) / 8, Math.max(0, left + 24) / 30);
    if (size <= 0) return;
    fGlow(ctx, cx, f - 6, 12 * size, '#ff6a1f', 0.35);
    const flame = (w, h, col) => { const sw = Math.sin(t * 0.18 + this.ph) * 1.2 * size; fPoly(ctx, [[cx - w, f], [cx + w, f], [cx + w * 0.7, f - h * 0.45], [cx + sw, f - h], [cx - w * 0.7, f - h * 0.45]], col); };
    const h = (11 + Math.sin(t * 0.21 + this.ph) * 1.5) * size;
    flame(5 * size, h + 1, '#c0201a'); flame(4 * size, h, '#ff6a1f'); flame(2.4 * size, h * 0.62, '#ffd166'); flame(1.1 * size, h * 0.3, '#fff3c0');
  }
}

class EmberDrop extends Enemy {
  constructor(cx) {
    super(cx - 5, -16, 10, 12);
    this.warn = 34; this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.warn > 0 ? null : this; }
  update(g) {
    this.t++;
    if (this.warn > 0) { this.warn--; return; }
    this.vy = Math.min(this.vy + 0.18, 4.6);
    this.y += this.vy;
    const lv = g.level, c = Math.floor(this.cx / TILE), r = Math.floor((this.y + this.h) / TILE);
    if (lv.solid(c, r) || (lv.get(c, r) === T.SEMI && this.y + this.h - this.vy <= r * TILE + 0.5)) {
      g.burst(this.cx, r * TILE - 2, ['#ff6a1f', '#ffd166', '#e8401a'], 8);
      if (this.x > g.camX && this.x < g.camX + VIEW_W) Sound.play('sizzle');
      this.remove = true;
    } else if (this.t % 2 === 0) g.spark(this.cx + rand(-2, 2), this.y, '#ff8a2a', 14);
  }
  draw(ctx) {
    const cx = this.cx;
    if (this.warn > 0) {
      ctx.globalAlpha = this.warn % 8 < 4 ? 0.26 : 0.12;
      fRect(ctx, cx - 4, 34, 8, 12 * TILE - 34, '#ff6a1f');
      ctx.globalAlpha = 1;
      blob(ctx, cx, 38, 3, this.warn % 8 < 4 ? '#ffd166' : '#ff6a1f');
      return;
    }
    fPoly(ctx, [[cx - 2.4, this.y + 4], [cx, this.y - 9], [cx + 2.4, this.y + 4]], '#ff6a1f');   // (fine: hires.js)
    blob(ctx, cx, this.y + 6, 6, '#e8401a');
    blob(ctx, cx, this.y + 6, 5, '#ff8a2a');
    blob(ctx, cx, this.y + 6, 3, '#ffe08a');
  }
}

// what MAGMAW says (each a pool: one line picked at random, so replays don't repeat word for word)
const MAGMAW_OUCH = [
  'OW! MY EVERYTHING!',
  'NOT FAIR! I JUST WOKE UP!',
  'I WAS GOING EASY ON YOU!',
  'STOP BOUNCING ON MY HEAD!',
  'OUCH! THAT\'S MY GOOD SIDE!',
  'HEY! WATCH THE HORNS!',
  'OOF! RIGHT IN THE MAGNIFICENCE!',
  'I\'M TELLING MY MUM!',
  'YOU FIGHT DIRTY FOR A CHICK!',
  'THAT ONE TICKLED. ...NO IT DIDN\'T. OW.',
  'MY HEAD IS NOT A TRAMPOLINE!',
  'OW OW OW! TIME OUT!',
];
const MAGMAW_WAKE = [
  'WHO DARES WAKE THE MAGNIFICENT MAGMAW?!',
  'WHO\'S THERE?! I WAS HAVING A LOVELY DREAM ABOUT ME!',
  'FIVE MORE MINUTES... WAIT. AN INTRUDER?!',
  'YOU! IN MY BEDROOM! WITH YOUR FEATHERS!',
  'WHO RANG?! NOBODY RINGS! I HAVE NO BELL!',
  'WHAT?! WHO?! WHERE ARE MY SLIPPERS?!',
  'A CHICK?! IN MY CASTLE?! AT THIS HOUR?!',
  'WHO INTERRUPTS THE BEAUTY SLEEP OF MAGMAW?!',
  'I\'M AWAKE! I\'M AWAKE! ...WHO ARE YOU?!',
  'YOU WOKE ME UP. NOW I\'M HUNGRY. AND ANGRY. HANGRY.',
];
const MAGMAW_STATUES = [
  'YOU! YOU SMASHED MY STATUES!',
  'MY STATUES! ALL OF THEM! LIKE DOMINOES!',
  'I HEARD THE CRASH. THAT WAS MY GOLD ONE, WASN\'T IT?!',
  'DO YOU KNOW WHAT STATUES COST?!',
  'YOU KNOCKED ME OVER! FIVE TIMES!',
  'THOSE STATUES WERE ME! YOU HURT ME! EMOTIONALLY!',
  'SMASHING STATUES?! IN THIS ECONOMY?!',
  'I HAD THEM POLISHED THIS MORNING!',
  'YOU\'LL PAY FOR THOSE STATUES! IN PAIN!',
  'MY STATUES! MY BEAUTIFUL STONE SELVES!',
];
const MAGMAW_PANCAKES = [
  'AND WHERE ARE MY PANCAKES?!',
  'DID YOU BRING PANCAKES? NO? THEN BEGONE!',
  'YOU SMELL LIKE PANCAKES! WHERE ARE THEY?!',
  'HAVE YOU SEEN MY BREAKFAST? I\'M STARVING!',
  'NO PANCAKES?! UNACCEPTABLE!',
  'YOU CAME THROUGH THE KITCHEN... EMPTY-HANDED?!',
  'BRING ME PANCAKES OR FACE MY WRATH!',
  'I WAS PROMISED PANCAKES. INSTEAD I GET... YOU.',
  'WHERE\'S MY SHORT STACK?!',
  'FIRST NO PANCAKES. NOW THIS. WHAT A MORNING!',
];
const MAGMAW_STOKE = [
  'DID I MENTION THE FLOORS ARE HEATED?',
  'LET ME JUST TURN THE HEATING UP!',
  'UNDERFLOOR HEATING! NOW WITH EXTRA FLOOR!',
  'HOT FLOOR, COMING THROUGH!',
];
const MAGMAW_DIE = [
  'NO! NOT MY BEAUTIFUL BODY!',
  'I\'M MELTING! ...OKAY, MORE THAN USUAL!',
  'THIS CAN\'T BE! I\'M MAGNIFICENT!',
  'DEFEATED... BY A BALL OF FLUFF!',
  'MY CASTLE! MY STATUES! MY... ME!',
  'CURSE YOU, FLUFFY THING!',
  'NOOO! I HADN\'T EVEN HAD BREAKFAST!',
  'YOU WIN THIS TIME! ...AND PROBABLY NEXT TIME.',
  'I\'M... CRUMBLING! LIKE MY STATUES!',
  'THIS IS SO EMBARRASSING!',
];
const MAGMINI_COSTUME = [
  '...OKAY. THAT WAS A COSTUME.',
  'SO... I\'M A BIT SMALLER IN PERSON.',
  'DON\'T LOOK AT ME! THE BIG ONE WAS A SUIT!',
  'FINE. YES. I\'M TINY. HAPPY NOW?',
  'THE REAL MAGMAW! FUN SIZE!',
  'OKAY, OKAY. I WEAR PLATFORM SHOES. AND A WHOLE BODY.',
  'SURPRISE! ...PLEASE DON\'T LAUGH.',
  'THAT WAS MY BIG BROTHER COSTUME. THIS IS THE REAL ME.',
  'WELL. THIS IS AWKWARD.',
  'I\'M NOT SMALL! YOU\'RE JUST... VERY TALL.',
];
const MAGMINI_LAST = [
  'YOU HAVEN\'T SEEN THE LAST OF ME!',
  'I\'LL BE BACK! IN A BIGGER COSTUME!',
  'THIS ISN\'T OVER, CHICK!',
  'REMEMBER MY NAME! MAGMAW! WITH TWO M\'S! THREE!',
  'YOU\'LL REGRET THIS! PROBABLY! MAYBE!',
  'NEXT TIME I\'LL BRING A BIGGER SUIT!',
  'I\'M GOING HOME! AND I\'M TAKING MY LAVA!',
  'MARK MY WORDS! ...ON A STATUE. A NEW ONE.',
  'YOU WIN THE BATTLE! BUT I WIN... UH... LATER!',
  'THIS MEANS WAR! AFTER MY NAP!',
];
const MAGMINI_MUM = [
  'MUUUUUUM!!',
  'MOOOOOM! THE CHICK WAS MEAN TO ME!',
  'MUMMY!!',
  'MUUUM! COME GET ME!',
  'WAAAH! I WANT MY MUM!',
  'MAAAAAA!!',
  'MUM! MY HEAD HURTS!',
  'MUMMMMY! IT\'S NOT FAIR!',
  'MOTHER!! FETCH THE BIG COSTUME!',
  'I\'M CALLING MY MUM! MUUUUUM!',
];
class Boss extends Enemy {
  constructor(col) {
    super(col * TILE, 12 * TILE - 34, 36, 34);
    this.noFreeze = true;   // Boss encounters cannot be replaced by a carried ice block.
    this.maxHp = this.hp = 20; this.shown = 0;   // (five stomps)
    this.hideHealthBar = true;   // damage is shown by the battered costume itself
    this.state = 'sleep'; this.timer = 0; this.face = -1; this.flash = 0; this.last = '';
    this.lines = [];
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  get phase() { return this.hp > 16 ? 1 : this.hp > 8 ? 2 : 3; }   // (stomps: 0 / 1-2 / 3-4 taken)
  setState(s, n = 0) { this.state = s; this.timer = n; }
  // Keep facing while the player is over his centre; crossing a small margin turns him once.
  facePlayer(x) { if (Math.abs(x - this.cx) > 4) this.face = x < this.cx ? -1 : 1; }
  hitbox() {
    if (this.state === 'sleep' || this.state === 'die') return null;
    return { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 2 };
  }
  touches(p) {
    const s = this.state;
    if (s === 'sleep' || s === 'roar' || s === 'stun' || s === 'die') return false;
    return overlap(this.hitbox(), p);
  }
  onTouch(g, p) {
    if (!this.touches(p)) return;
    if (!this.stomp(g, p)) g.hurtPlayer();
  }
  stomp(g, p) {
    if (p !== g.player || p.state !== 'play' || !this.touches(p) || !g.isStomp(p, this)) return false;
    if (!p.pounding && (p.spin || p.roll > 0 || p.blast > 0)) return false;
    g.bounce(p);
    p.pounding = false; p.poundT = 0;
    p.vy = -6; p.vx = (p.x + p.w / 2 < this.cx ? -1 : 1) * 2;
    g.addScore(1000, this.cx, this.y - 6);
    g.dust(this.cx, this.y + this.h, 8);
    Sound.play('stomp');
    this.hp = Math.max(0, this.hp - 4);
    this.flash = 24; this.vx = 0; g.shake = Math.max(g.shake, 5);
    if (this.hp <= 0) this.die(g); else this.setState('stun', 80);
    if (this.hp > 0) g.speak(this, MAGMAW_OUCH, '#ff8a5a');
    return true;
  }
  // Keep these hooks so bolts stop against his armour, without hurting him.
  fireHit() { return false; }
  iceHit() { return false; }
  wake(g) {
    const b = g.level.def.boss;
    this.setState('roar');
    g.arenaCam = b.wall * TILE;
    g.level.set(b.wall, 0, T.SOLID);
    g.level.skyGates.set(b.wall, 11);
    if (b.right) g.level.skyGates.set(b.right, 11);
    g.startBossMusic();
    Sound.play('roar');
    g.speak(this, MAGMAW_WAKE, '#ff8a5a', true);
    // ...and he has heard about everything you did on the way in
    this.lines = [[this.t + 110, g.statuesDown ? MAGMAW_STATUES : MAGMAW_PANCAKES]];
  }
  die(g) {
    this.setState('die');
    this.vx = 0; this.flash = 0;
    g.clearBossHazards();   // the boss music just keeps going through the win
    Sound.play('roar');
    g.shake = 6;
    this.lines = [];
    g.speak(this, MAGMAW_DIE, '#ff8a5a');
  }
  pick() {
    const pool = [['leap', 'spit'], ['stoke', 'spit', 'leap', 'stoke', 'leap'], ['rain', 'stoke', 'leap', 'spit', 'leap', 'stoke']][this.phase - 1];
    let a;
    do a = pool[Math.floor(Math.random() * pool.length)]; while (a === this.last);
    this.last = a;
    if (a === 'leap') this.setState('crouch', 26);
    else if (a === 'spit') this.setState('spit', 56);
    else if (a === 'stoke') this.setState('stoke', 64);
    else this.setState('rain', 120);
  }
  shoot(g, p) {
    const mx = this.cx + this.face * 14, my = this.y + 18;
    const ang = Math.atan2(p.y + p.h / 2 - my, p.x + p.w / 2 - mx);
    const n = this.phase === 1 ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * 0.32;
      g.entities.push(new BossShot(mx, my, Math.cos(a) * 2.3, Math.sin(a) * 2.3));
    }
    Sound.play('fire');
  }
  // A bank of 5 stoked flames with comfortable walking gaps, never spawning right under Chickaroo.
  stokeFloor(g) {
    const b = g.level.def.boss, p = g.player, gap = 48, spacing = 10 + gap, pcx = p.x + p.w / 2;
    const lo = (b.wall + 1) * TILE + 28 + 5, hi = b.right * TILE - 28 - 5;
    // Replace the previous pattern instead of filling its safe gaps with a second offset grid.
    for (const e of g.entities) if (e instanceof Flamelet && !e.remove) e.remove = true;
    const anchor = pcx + spacing / 2;
    const pts = [];
    for (let k = Math.ceil((lo - anchor) / spacing); anchor + k * spacing <= hi; k++) {
      pts.push(anchor + k * spacing);
    }
    const arenaCenter = ((b.wall + 1) * TILE + b.right * TILE) / 2;
    while (pts.length > 5) {
      if (Math.abs(pts[0] - arenaCenter) > Math.abs(pts[pts.length - 1] - arenaCenter)) pts.shift();
      else pts.pop();
    }
    for (const x of pts) g.entities.push(new Flamelet(x, 12 * TILE));
  }
  // stoke the floor: little flames spring up across it (each a glowing coal first), spread out, none right under him
  flamelets(g, n, near = null) {
    const b = g.level.def.boss, p = g.player, pcx = p.x + p.w / 2, floor = 12 * TILE;
    const lo = (b.wall + 2) * TILE, hi = (b.right - 1) * TILE;
    const live = g.entities.filter(e => e instanceof Flamelet && !e.remove);
    const taken = live.map(e => e.cx);
    for (let k = 0; k < n && live.length + k < FLAMELET_MAX; k++) {
      let x = null;
      for (let tries = 0; tries < 30 && x == null; tries++) {
        const c = near != null ? near + (k % 2 ? 1 : -1) * (30 + tries * 2) : rand(lo, hi);
        if (c < lo || c > hi || Math.abs(c - pcx) < 26 || taken.some(o => Math.abs(o - c) < 44)) continue;
        x = c;
      }
      if (x == null) continue;
      taken.push(x);
      g.entities.push(new Flamelet(x, floor, k * 6));
    }
  }
  land(g) {
    const sp = 1.4 + this.phase * 0.3;
    if (this.phase === 3) this.flamelets(g, 2, this.cx);   // (at his worst, a leap leaves flames where he lands)
    g.entities.push(new FlameWave(this.x - 14, -1, sp), new FlameWave(this.x + this.w, 1, sp));
    g.shake = Math.max(g.shake, 6);
    g.dust(this.cx - 10, this.y + this.h, 6); g.dust(this.cx + 10, this.y + this.h, 6);
    Sound.play('break');
    this.vx = 0;
    this.setState('land', [70, 45, 25][this.phase - 1] / 2 + 14);
  }
  update(g) {
    const p = g.player, b = g.level.def.boss, ph = this.phase;
    const floorY = 12 * TILE - this.h, pcx = p.x + p.w / 2;
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.state === 'sleep') {
      const inView = this.cx - 24 >= g.camX + 20 && this.cx + 24 <= g.camX + VIEW_W - 20;
      if (p.state === 'play' && p.x > b.trigger * TILE && inView) this.wake(g);
      else if (this.t % 70 === 0 && this.x < g.camX + VIEW_W) g.popup(this.cx + 10, this.y - 4, 'Z', '#c8b8ff');   // snoring away
      return;
    }
    if (this.lines.length && this.t >= this.lines[0][0]) g.speak(this, this.lines.shift()[1], '#ff8a5a');
    if (ph === 3 && this.hp > 0 && this.t % 18 === 0) g.particles.push({ kind: 'px', x: this.cx + rand(-12, 12), y: this.y + 5,
      vx: rand(-0.25, 0.25), vy: -0.45, life: 32, t: 0, color: '#a99aaa', size: 2 });
    this.shown += (Math.min(this.hp / this.maxHp, this.state === 'roar' ? this.timer / 80 : 1) - this.shown) * 0.1;

    if (this.y < floorY || this.vy < 0) {
      this.vy += 0.42; this.y += this.vy;
      if (this.y >= floorY) { this.y = floorY; this.vy = 0; if (this.state === 'air') this.land(g); }
    }
    switch (this.state) {
      case 'roar': {
        this.timer++;
        const row = (this.timer >> 1) - 1;
        if (!(this.timer & 1) && row >= 0 && row <= 11) {
          g.level.set(b.wall, row, T.SOLID);
          g.level.skyGates.set(b.wall, 11);
          if (row % 3 === 0) Sound.play('bump');
        }
        if (this.timer % 14 === 0) g.shake = Math.max(g.shake, 3);
        if (this.timer >= 80) {
          for (let r = 0; r <= 11; r++) g.level.set(b.wall, r, T.SOLID);
          this.setState('walk', 60);
        }
        break;
      }
      case 'walk':
        this.facePlayer(pcx);
        // Stop at the player instead of overshooting and reversing every single frame underneath him.
        this.x += Math.sign(pcx - this.cx) * Math.min(Math.max(0, Math.abs(pcx - this.cx) - 4), [0.55, 0.8, 1.05][ph - 1]);
        if (--this.timer <= 0) this.pick();
        break;
      case 'crouch':
        this.facePlayer(pcx);
        if (--this.timer <= 0) {
          this.vx = clamp((pcx - this.cx) / 42, -2.6, 2.6);
          this.vy = -8.8;
          this.setState('air');
        }
        break;
      case 'air': this.x += this.vx; break;
      case 'land': if (--this.timer <= 0) this.setState('walk', [70, 45, 25][ph - 1]); break;
      case 'spit':
        this.facePlayer(pcx);
        if (this.timer === 26 || (ph === 3 && this.timer === 10)) this.shoot(g, p);
        if (--this.timer <= 0) this.setState('walk', [100, 70, 45][ph - 1]);
        break;
      case 'stoke':   // rears up and pounds the floor twice: on the second, the flames spring up
        this.facePlayer(pcx);
        if (this.timer === 44 || this.timer === 24) { g.shake = Math.max(g.shake, 3); g.dust(this.cx - 12, this.y + this.h, 4); g.dust(this.cx + 12, this.y + this.h, 4); Sound.play('stompland'); }
        if (this.timer === 24) { this.stokeFloor(g); if (!this.toldStoke) { this.toldStoke = true; g.speak(this, MAGMAW_STOKE, '#ff8a5a'); } }
        if (--this.timer <= 0) this.setState('walk', [80, 60, 40][ph - 1]);
        break;
      case 'rain':
        if (this.timer > 24 && this.timer % 14 === 0) {
          const lo = (b.wall + 2) * TILE, hi = (b.right - 1) * TILE;
          const x = Math.random() < 0.5 ? pcx + rand(-30, 30) : rand(lo, hi);
          g.entities.push(new EmberDrop(clamp(x, lo, hi)));
        }
        if (this.timer % 20 === 0) g.shake = Math.max(g.shake, 1.5);
        if (--this.timer <= 0) this.setState('walk', 45);
        break;
      case 'stun':
        if (--this.timer <= 0) this.setState('walk', 50);
        break;
      case 'die':
        this.timer++;
        if (this.timer % 5 === 0) g.burst(this.x + rand(0, this.w), this.y + rand(0, this.h), ['#ff6a1f', '#ffd166', '#ffffff', '#e8401a'], 6);
        if (this.timer % 20 === 0) { Sound.play('firework'); g.shake = Math.max(g.shake, 4); }
        if (this.timer >= 110) {
          g.bossDefeated(this, true); this.remove = true;
          g.entities.push(new Magmini(this.cx, this.y + this.h));   // ...the armour was empty all along. Well, almost.
        }
        break;
    }
    this.x = clamp(this.x, (b.wall + 1) * TILE, b.right * TILE - this.w);
  }
  draw(ctx) {
    const s = this.state, c = s === 'crouch' ? 4 : s === 'land' ? 3 : 0;
    if (s !== 'sleep') fGlow(ctx, this.cx, this.y + this.h - 18, 28, '#ff6a1f', 0.12 + Math.sin(this.t * 0.08) * 0.025);
    this.drawLive(ctx);
    if (s === 'spit' && this.timer <= 44 && this.timer >= 6) {
      const k = this.timer > 26 ? (44 - this.timer) / 18 : this.phase === 3 && this.timer > 10 ? (26 - this.timer) / 16 : 0;
      if (k > 0) { const r = 1 + k * 3.5; fGlow(ctx, this.cx, this.y + this.h - 17 + c, r + 4, '#ff8b3c', 0.55); fBlob(ctx, this.cx, this.y + this.h - 17 + c, r, '#f89938'); fBlob(ctx, this.cx - 0.4, this.y + this.h - 17.5 + c, r * 0.55, '#ffecb1'); }
    }
    if (s === 'stun') for (let i = 0; i < 3; i++) {
      const a = this.t * 0.12 + i * 2.1, x = this.cx + Math.cos(a) * 14, y = this.y - 8 + Math.sin(a) * 4;
      fRect(ctx, x - 1.4, y, 3, 2 / 3, '#ffd166'); fRect(ctx, x - 0.2, y - 1.2, 2 / 3, 3, '#ffd166');
    }
  }
  drawLive(ctx) {
    const s = this.state, hit = this.flash > 0 || s === 'die' && (this.timer >> 4) % 2 === 0;
    const pose = ['roar','rain'].includes(s) || (s === 'stoke' && this.timer > 44) ? 'roar' : s === 'stoke' ? (this.timer % 20 < 8 ? 'land' : 'crouch') : ['sleep','crouch','land','die'].includes(s) ? s : s === 'spit' && this.timer <= 44 && this.timer >= 6 ? 'spit' : 'walk';
    const shake = s === 'stun' ? (this.t % 4 < 2 ? -1 : 1) : s === 'die' ? this.t % 3 - 1 : 0;
    ctx.save();ctx.translate(Math.round(this.cx) + shake, Math.round(this.y + this.h));ctx.scale(this.face < 0 ? -1 : 1, 1);
    ctx.drawImage(magmawBodyArt(pose, this.phase, hit, this.hp < this.maxHp), -32, -50);
    ctx.restore();
  }
}

// What was really inside MAGMAW: a tiny, furious ember. Pops out of the burst armour, owns up
// ("THAT WAS A COSTUME"), storms off -- straight into the arena wall -- then shoots off home.
class Magmini extends Enemy {
  constructor(x, bottom) {
    super(x - 5, bottom - 22, 10, 10);
    this.state = 'pop'; this.timer = 0; this.vy = -5.5; this.vx = 0.5;
    this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++; this.timer++;
    const floor = 12 * TILE, st = this.state;
    if (st !== 'fly') {
      this.vy = Math.min(this.vy + 0.3, 5); this.y += this.vy;
      if (this.y + this.h >= floor) { this.y = floor - this.h; this.vy = 0; }
    }
    if (this.t % 4 === 0) g.spark(this.cx + rand(-2, 2), this.y, '#ff8a2a', 14);
    if (st === 'pop') {
      this.x += this.vx;
      if (this.vy === 0 && this.timer > 30) { this.state = 'talk'; this.timer = 0; g.speak(this, MAGMINI_COSTUME, '#ffd166'); }
    } else if (st === 'talk') {
      this.face = g.player.x < this.x ? -1 : 1;
      // the fight's over but nothing pauses: each line gets its time on screen before the next
      if (g.saying(this)) this.timer = 0;
      else if (this.timer === 20 && !this.saidLast) { this.saidLast = true; g.speak(this, MAGMINI_LAST, '#ffd166'); }
      else if (this.timer === 20) { this.state = 'run'; this.timer = 0; this.face = 1; }
    } else if (st === 'run') {
      this.x += 2.6;
      if (this.timer % 6 === 0) g.dust(this.cx, this.y + this.h, 1);
      if (g.level.solid(Math.floor((this.x + this.w + 1) / TILE), Math.floor((this.y + 5) / TILE))) {
        this.state = 'daze'; this.timer = 0; this.vx = -1.2; this.vy = -3;
        g.popup(this.cx, this.y - 6, 'BONK!', '#ffffff'); Sound.play('bump');
      }
    } else if (st === 'daze') {
      this.x += this.vx; this.vx *= 0.92;
      if (this.timer === 70) g.speak(this, MAGMINI_MUM, '#ffd166');
      if (this.timer === 110) { this.state = 'fly'; this.vy = 0; Sound.play('whoosh'); }
    } else {   // off home like a firework
      this.vy -= 0.22; this.y += this.vy; this.x += Math.sin(this.t * 0.4) * 1.2;
      g.spark(this.cx, this.y + this.h, '#ffd166', 20, rand(-0.4, 0.4), rand(0.5, 1.5));
      if (this.y < -40) { this.remove = true; g.openBossExit(); }   // gone: the right wall opens
    }
  }
  draw(ctx) {   // (in fine pixels: hires.js)
    const cx = Math.round(this.cx), cy = Math.round(this.y + 5), f = this.face || 1, fl = Math.sin(this.t * 0.5);
    fPoly(ctx, [[cx - 3, cy - 3], [cx - 1.4 + fl * 0.6, cy - 10], [cx + 0.2, cy - 4], [cx + 1.6 - fl * 0.6, cy - 9], [cx + 3, cy - 3]], '#ff6a1f');   // a flickering top
    fBlob(ctx, cx, cy, 6.3, INK); fBlob(ctx, cx, cy, 5.5, '#e8401a'); fBlob(ctx, cx - 1, cy - 1, 3.4, '#ffb347'); fBlob(ctx, cx - 1.8, cy - 2, 1.2, '#fff0c0');
    for (const s2 of [-1, 1]) fPoly(ctx, [[cx + s2 * 3, cy - 4.6], [cx + s2 * 5.4, cy - 8], [cx + s2 * 4.8, cy - 3.6]], INK);   // tiny horns
    if (this.state === 'daze') {
      for (const ex of [-2.5, 2.5]) { fLine(ctx, cx + ex - 0.8, cy - 2.4, cx + ex + 0.8, cy - 0.8, INK, 2); fLine(ctx, cx + ex - 0.8, cy - 0.8, cx + ex + 0.8, cy - 2.4, INK, 2); }
      for (let i = 0; i < 3; i++) { const a = this.t * 0.15 + i * 2.1; fBlob(ctx, cx + Math.cos(a) * 8, cy - 9 + Math.sin(a) * 2, 0.7, '#ffd166'); }
    } else {
      for (const ex of [-2, 2]) { fEll(ctx, cx + ex + f, cy - 0.6, 1.1, 1.5, '#ffffff'); fEll(ctx, cx + ex + f * 1.4, cy - 0.3, 0.55, 0.9, INK); fLine(ctx, cx + ex + f - 1.4, cy - 3.6 - ex * 0.2, cx + ex + f + 1.4, cy - 3.6 + ex * 0.2, INK, 2); }   // furious little brows
      fRect(ctx, cx - 1 + f, cy + 2.2, 3, 2 / 3, INK);
    }
    if (this.state === 'talk' && this.timer > 120 && this.timer % 40 < 20) fEll(ctx, cx - 3.5, cy + 2 + ((this.timer >> 2) % 3), 0.5, 1, '#9fe3ff');   // a tear, which he will deny
  }
}

// ── 2-4: moonlamps, echoes and UMBRAROO, the shadow that came loose ─────────
// Once an echo wakes, the game records Chickaroo's every frame (Game.recordTrail) and the echo
// replays that path `delay` frames behind: stand still and it walks right into you. Nothing
// Chickaroo throws can touch a shadow. The only thing that hurts one is the cone of light under
// a lit moonlamp, so the trick is to lead your own past self through the light.
// UMBRAROO's own shadows (UmbraShade) do the same on a short, fixed delay, and they hurt.
const LAMP_LIT = 150, LAMP_COOL = 120, LAMP_SPENT = 300;
const GLASS_WARN = 70;   // moonglass flickers for its lamp's last this-many frames
