'use strict';
// ── Prisoner: a poor little penguin locked in a cage somewhere hard to reach ─────
// Every so often it calls out "HELP ME!" for 1.5 s. Touch the cage (any way you like) to break
// the lock: the bars burst, the penguin hops for joy, waves, and vanishes in a puff of hearts,
// leaving a big bonus. A freed prisoner stays freed for the rest of the level (see Game.freed).
const PRISONER_BONUS = 10000, HELP_SHOW = 90, HELP_CYCLE = 260;
const PINGROO_THANKS = [   // what Pingroo says when you break him out (one at random)
  'THANKS MY BOYO!',
  'THANK YOU, CHICKAROO!',
  'FREE AT LAST! YOU\'RE THE BEST!',
  'MY HERO! A FLUFFY LITTLE HERO!',
  'I OWE YOU ONE, PAL!',
  'WOOHOO! FRESH AIR! THANKS, CHICK!',
  'YOU CAME FOR ME! I KNEW YOU WOULD!',
  'CHEERS, CHICKAROO! DRINKS ON ME!',
  'PEEP PEEP HOORAY! THANK YOU!',
  'BLESS YOUR FEATHERS, FRIEND!',
  'OUT OF THAT CAGE AT LAST! THANKS!',
  'YOU\'RE A STAR, CHICKAROO!',
];
class Prisoner extends Enemy {
  constructor(col, row) {
    super(col * TILE - 6, (row + 1) * TILE - 30, 28, 30);
    this.key = col + ',' + row; this.state = 'caged'; this.timer = 0;
    this.passive = true;   // (in a dark stage it sits in the dark like everything else: finding it is half the fun)
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.hops = 0; this.py = 0; this.pvy = 0; this.help = (col * 53) % HELP_CYCLE;
  }
  hitbox() { return null; }                       // fire, frost and volt don't touch it
  touches(p) { return this.state === 'caged' && overlap(this, p); }
  onTouch(g) { this.free(g); }
  free(g) {
    this.state = 'free'; this.timer = 0; this.pvy = -3;
    g.freed.add(this.key);
    // the bars burst outward
    for (let i = 0; i < 16; i++) g.particles.push({ kind: 'px', x: this.x + 2 + (i % 8) * 3.4, y: this.y + 4 + rand(0, 22), vx: rand(-2.4, 2.4), vy: rand(-3.5, -1), g: 0.25, life: 40, t: 0, color: i % 2 ? '#8f8aa8' : '#d8d4ec', size: 2 });
    g.burst(this.cx, this.y + 10, ['#ffd166', '#ffffff', '#ff9dc0'], 14);
    g.addScore(PRISONER_BONUS, this.cx, this.y - 8);
    g.speak(this, PINGROO_THANKS, '#bff0ff');
    g.shake = Math.max(g.shake, 2);
    Sound.play('freed');
  }
  update(g) {
    this.t++; this.timer++;
    if (this.state === 'caged') { this.help = (this.help + 1) % HELP_CYCLE; return; }
    // free: three happy hops, a wave, then off it goes in a puff of hearts
    if (this.hops < 3) {
      this.pvy += 0.3; this.py += this.pvy;
      if (this.py >= 0) { this.py = 0; this.hops++; this.pvy = this.hops < 3 ? -3 : 0; if (this.hops < 3) Sound.play('hop'); }
    } else if (this.timer > 150) {
      for (let i = 0; i < 8; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-6, 6), y: this.y + 12 + rand(-6, 6), vx: rand(-0.6, 0.6), vy: rand(-1.4, -0.4), g: -0.01, life: 40, t: 0, color: i % 2 ? '#ff7aa8' : '#ffffff', size: 2 });
      Sound.play('blink');
      this.remove = true;
    }
  }
  // a chubby little penguin, about 18px tall: navy back, white face and belly, orange beak and feet
  drawPenguin(ctx, cx, bottom, happy, wave) {
    drawSprite(ctx, penguinArt('rescue', happy ? (wave ? 'wave' : 'happy') : 'sad'), cx, bottom, false, 0.85, 0.85);
    if (!happy && this.t % 120 > 70) {
      const y = bottom - 11 + Math.min(4, (this.t % 120 - 70) / 12);
      fEll(ctx, cx - 2.2, y, 0.35, 0.65, '#a7deef');
    }
  }
  draw(ctx, g) {
    const x = Math.round(this.x), y = Math.round(this.y), w = this.w, bottom = y + this.h;
    const R = (px, py, pw, ph, c) => { ctx.fillStyle = c; ctx.fillRect(px, py, pw, ph); };
    if (this.state === 'caged') {
      // the penguin, shuffling sadly, behind thin bars
      // Nestle between the bars so both of his eyes remain visible.
      this.drawPenguin(ctx, this.cx + 1.4 + Math.sin(this.t * 0.045) * 0.25, bottom - 4, false, false);
      // base and domed roof (outlined), a hanging ring on top (in fine pixels: hires.js)
      const steel = (y0, h0) => { const g2 = ctx.createLinearGradient(0, y0, 0, y0 + h0); g2.addColorStop(0, '#e8e4f8'); g2.addColorStop(0.5, '#a8a2c4'); g2.addColorStop(1, '#6a6488'); return g2; };
      fRoundRect(ctx, x - 0.4, bottom - 4.4, w + 0.8, 4.4, 1.2, INK); fRoundRect(ctx, x + 0.6, bottom - 3.6, w - 1.2, 2.6, 0.8, steel(bottom - 3.6, 2.6));
      // bars: thin, lit down one side, wide gaps so the penguin shows through
      for (let i = 0; i < 6; i++) {
        const bx = x + 1.2 + i * (w - 3.4) / 5;
        fRect(ctx, bx - 0.4, y + 5, 1.4, this.h - 9, INK); fRect(ctx, bx, y + 5, 0.6, this.h - 9, '#d8d4ec');
      }
      fPoly(ctx, [[x - 0.2, y + 6.4], [x + 2, y + 2.4], [x + w / 2, y + 0.6], [x + w - 2, y + 2.4], [x + w + 0.2, y + 6.4]], INK);
      fPoly(ctx, [[x + 1, y + 5.6], [x + 2.6, y + 3], [x + w / 2, y + 1.6], [x + w - 2.6, y + 3], [x + w - 1, y + 5.6]], steel(y + 1.6, 4));
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + w / 2, y - 0.6, 1.6, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#d8d4ec'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(x + w / 2, y - 0.6, 1.6, Math.PI, Math.PI * 1.8); ctx.stroke();
      // little padlock hanging on the right-hand side bar, clear of the penguin
      const lx = x + w, ly = bottom - 13;
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx, ly - 1, 1.5, Math.PI, 0); ctx.stroke();
      fRoundRect(ctx, lx - 3, ly - 1.2, 6, 5.6, 1.2, INK); fRoundRect(ctx, lx - 2.2, ly - 0.4, 4.4, 4, 0.8, '#c8891e'); fRect(ctx, lx - 2.2, ly - 0.4, 4.4, 0.8, '#ffd166'); fBlob(ctx, lx, ly + 1.6, 0.6, INK);
      // "HELP ME!" bubble, 1.5 s at a time (not in a stage told without words)
      if (this.help < HELP_SHOW && !(g && g.level.def.quiet)) {
        const k = Math.min(1, this.help / 6), txt = 'HELP ME!', tw = textWidth(txt, 1), bw = tw + 6, bh = 11;
        const bxl = Math.round(this.cx - bw / 2), byt = y - 18 - Math.round((1 - k) * 4) + ((this.help >> 4) % 2);
        ctx.globalAlpha = k;
        const tx = Math.round(this.cx) + 0.5;   // a round bubble with a little tail pointing down at the cage (fine)
        fRoundRect(ctx, bxl - 1, byt, bw + 2, bh, 3, INK); fPoly(ctx, [[tx - 3, byt + bh - 1], [tx + 3, byt + bh - 1], [tx, byt + bh + 3.4]], INK);
        fRoundRect(ctx, bxl, byt + 1, bw, bh - 2, 2.4, '#ffffff'); fPoly(ctx, [[tx - 1.8, byt + bh - 1.4], [tx + 1.8, byt + bh - 1.4], [tx, byt + bh + 1.6]], '#ffffff');
        drawText(ctx, txt, bxl + 3, byt + 2, '#e8401a');
        ctx.globalAlpha = 1;
      }
      return;
    }
    // free: hopping for joy, then waving goodbye
    this.drawPenguin(ctx, this.cx, bottom + this.py, true, this.hops >= 3 && (this.t >> 3) % 2);
    if (this.timer % 20 < 10 && this.hops < 3) { const hx = this.cx + 9, hy = bottom - 23.5 + this.py; fBlob(ctx, hx - 0.8, hy - 0.4, 1, '#ff7aa8'); fBlob(ctx, hx + 0.8, hy - 0.4, 1, '#ff7aa8'); fPoly(ctx, [[hx - 1.8, hy], [hx + 1.8, hy], [hx, hy + 2]], '#ff7aa8'); }   // a little heart
  }
}

// ── Sky world ────────────────────────────────────────────────────────────────
// Springboard, Mario-style: the player lands on it and rides the coil down, then
// gets launched. Jump pressed or held during the squash = big launch, otherwise a
// small hop. Launch heights are fixed (normal gravity, no hold-to-float), so the
// bounce is the same every time. The launch is always straight up (no carried momentum).
const SPRING_BIG = -12, SPRING_SMALL = -7, SPRING_DOWN = 8, SPRING_UP = 4;
// air control after a big spring launch: acceleration, turn-around, and drag with no input
const SPRING_AIR_ACCEL = 0.15, SPRING_AIR_TURN = 0.24, SPRING_AIR_DRAG = 0.94;
class Spring extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 12, 14, 12);
    this.rest = this.y; this.comp = 0; this.stretch = 0; this.rider = null;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  touches(p) {
    if (this.rider || !overlap(this, p)) return false;
    if (p.vy > 0 && p.prevY + p.h <= this.rest + 8) return true;            // landing on top
    const pc = p.x + p.w / 2;                                                 // or walking onto it
    return p.onGround && Math.abs(p.y + p.h - (this.rest + 12)) < 2 && pc > this.x + 2 && pc < this.x + this.w - 2;
  }
  onTouch(g, p) {
    // a jump pressed just before landing (still in the jump buffer) counts too
    g.endRoll(p);
    this.rider = p; this.ride = 0; this.big = Input.down('jump') || Input.down('spin') || p.jumpBuf > 0;
    p.spin = false;
    p.vx = 0; p.vy = 0; p.combo = 0; p.platform = null; p.jumpBuf = 0;
    p.x = clamp(p.x, this.x - p.w + 6, this.x + this.w - 6);
  }
  update(g) {
    this.t++;
    if (this.stretch > 0) this.stretch--;
    const p = this.rider;
    if (!p) { this.comp = 0; return; }
    if (p.state !== 'play') { this.rider = null; return; }
    this.ride++;
    if (Input.down('jump') || Input.hit('jump') || Input.hit('up')) this.big = true;
    this.comp = this.ride <= SPRING_DOWN ? Math.round(this.ride * 7 / SPRING_DOWN)
      : Math.round(7 * (1 - (this.ride - SPRING_DOWN) / SPRING_UP));
    p.vx = 0; p.vy = 0; p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
    p.y = this.rest + this.comp - p.h;
    p.sx = 1 + this.comp * 0.03; p.sy = 1 - this.comp * 0.03;
    if (this.ride >= SPRING_DOWN + SPRING_UP) {
      this.rider = null; this.comp = 0; this.stretch = 8;
      p.vy = this.big ? SPRING_BIG : SPRING_SMALL;
      p.vx = 0;                        // always launch straight up; the player steers from there
      p.jumping = false;               // fixed arc: no hold-to-float on top of the launch
      p.airMax = RUN_MAX;
      p.springAir = this.big;          // big launch: strong steering until we land (see physics)
      p.sx = 0.75; p.sy = 1.3;
      g.dust(this.cx, this.rest + 12, this.big ? 6 : 3);
      Sound.play(this.big ? 'spring' : 'jump');
    }
  }
  draw(ctx) {
    const x = Math.round(this.x), base = Math.round(this.rest + 12);
    const top = base - 12 + this.comp - (this.stretch > 4 ? 3 : this.stretch > 0 ? 1 : 0);
    // (in fine pixels: hires.js) a steel base plate, a coil of spring wire, the red rubber pad on top
    fRoundRect(ctx, x - 0.4, base - 3.4, 14.8, 3.4, 1.2, INK);
    const plate = ctx.createLinearGradient(0, base - 3, 0, base); plate.addColorStop(0, '#c8c8dc'); plate.addColorStop(1, '#6a6a86');
    fRoundRect(ctx, x + 0.4, base - 2.7, 13.2, 2, 0.8, plate); fBlob(ctx, x + 2.4, base - 1.7, 0.5, '#4a4a60'); fBlob(ctx, x + 11.6, base - 1.7, 0.5, '#4a4a60');
    const c0 = top + 3.6, c1 = base - 2.8, turns = 3.5, path = (front) => {
      ctx.beginPath();
      for (let k = 0; k <= 64; k++) {
        const u = k / 64, a = u * turns * Math.PI * 2, sx = x + 7 + Math.sin(a) * 4.4, sy = c0 + (c1 - c0) * u + Math.cos(a) * 0.9;
        if ((Math.cos(a) > 0) === front) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
      }
    };
    ctx.lineCap = 'round';
    for (const [front, wd, col] of [[false, 2, INK], [false, 0.9, '#8a8ca6'], [true, 2.2, INK], [true, 1.1, '#d9dceb']]) { ctx.strokeStyle = col; ctx.lineWidth = wd; path(front); ctx.stroke(); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.34; path(true); ctx.stroke();
    fRoundRect(ctx, x - 0.4, top - 0.4, 14.8, 4.8, 2, INK);
    const pad = ctx.createLinearGradient(0, top, 0, top + 4); pad.addColorStop(0, '#ffa0ad'); pad.addColorStop(0.4, '#ff5d73'); pad.addColorStop(1, '#c02a48');
    fRoundRect(ctx, x + 0.4, top + 0.4, 13.2, 3.2, 1.5, pad); fRoundRect(ctx, x + 2, top + 0.8, 6, 0.7, 0.35, '#ffd8de');
  }
}


// Ladder: ['ladder', col, topRow, bottomRow] -- a wooden ladder up column `col`, rungs from the top of
// row topRow to the bottom of row bottomRow (put something to stand on at the top). In front of it, up
// grabs it (down too, standing at its top); up/down climb, left/right step off, jump lets go (Game.climbLadder).
const LADDER_SPEED = 1.3;
class Ladder extends Enemy {
  constructor(col, top, bottom) {
    super(col * TILE, top * TILE, TILE, (bottom - top + 1) * TILE);
    this.passive = this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), h = this.h;
    // two rails, a little worn, and rungs every 6 px with their ends pegged through
    for (let ry = y + 4; ry < y + h - 1; ry += 6) {   // (in fine pixels: hires.js)
      fRoundRect(ctx, x + 3, ry - 1, 10, 4, 1, INK); fRect(ctx, x + 3.7, ry - 0.3, 8.6, 2.6, '#b07a44'); fRect(ctx, x + 3.7, ry - 0.3, 8.6, 0.8, '#d8a468');
    }
    for (const rx of [x + 1, x + 12]) {
      fRoundRect(ctx, rx - 0.7, y - 2.7, 4.4, h + 2.7, 1.4, INK);
      const rail = ctx.createLinearGradient(rx, 0, rx + 3, 0); rail.addColorStop(0, '#d8a468'); rail.addColorStop(0.4, '#9a6a3a'); rail.addColorStop(1, '#5a3a1e');
      fRoundRect(ctx, rx, y - 2, 3, h + 1.4, 1, rail);
      for (let ry = y + 4; ry < y + h - 1; ry += 6) fBlob(ctx, rx + 1.5, ry + 1, 0.6, '#4a2e14');   // the pegs through it
    }
  }
}

// their 1x drawings, lifted to the fine screen look by look (hires.js)

