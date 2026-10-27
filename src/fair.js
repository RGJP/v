'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 1-3 CLOUDTOP HEIGHTS, acts 6 and 7: the CLOUD FAIR and the balloon crossing. Up here everything is a ride:
//   FerrisWheel   a giant cloud Ferris wheel; its cars are platforms (`extra`): ride one up and over the wall
//   HighStriker   TRY YOUR STRENGTH! Ground-pound the pad and the puck flies up the tower -- as high as the pound
//                 was hard, and a pound is as hard as the drop it started from. Ring the bell (BARNABY the walrus
//                 barker heckles every miss) and the gate to the balloon dock swings open (`level.bellRung`)
//   FairGate      the striped gate in front of the dock: solid (`T.BODY`) until the bell rings
//   FairArch      scenery: the fair's entrance arch, bunting and all
//   Balloon       a hot-air balloon you fly yourself (`g.ride`, see game-update.js): hold jump to fire the burner,
//                 let go to sink; left holds it back (it all but hovers), right hurries it on (the wind only blows one way). It lands itself at
//                 the far dock and floats off home. Too low and it sinks into the clouds, and so does he
//   StormCloud    STORMY, Sulky's big brother: a black cloud that charges up (eyes alight, a grumble) and drops a
//                 lightning bolt straight down. Steady and telegraphed: no flashes
// All painted fine: mArt bakes (meadow-art.js) and the f* helpers (hires.js).
// ═══════════════════════════════════════════════════════════════════════════
const FAIR_ART = new Map();
const fairArt = (key, paint) => FAIR_ART.get(key) || (FAIR_ART.set(key, paint()), FAIR_ART.get(key));

// ---------- the Ferris wheel -------------------------------------------------------------------------
// ['ferris', col, row, radiusTiles = 4, period = 720]: hub over tile (col, row); turns clockwise; its legs stand on
// the ground below. A platform-like thing (game.js): it has no top of its own, only its cars (`extra`)
const WHEEL_CARS = 8, WHEEL_HANG = 24, CAR_W = 24;
class FerrisWheel {
  constructor(col, row, radius = 4, period = 720, suspended = false) {
    this.px = col * TILE + 8; this.py = row * TILE + 8; this.r = radius * TILE - 2; this.period = period;
    this.x = -1e5; this.y = -1e5; this.w = 0; this.h = 0; this.dx = 0; this.dy = 0; this.prevY = this.y;   // (nothing to stand on itself)
    this.t = 0; this.foot = null; this.suspended = suspended;
    const wheel = this;
    this.cars = Array.from({ length: WHEEL_CARS }, (_, i) => ({ i, x: 0, y: 0, w: CAR_W, h: 6, dx: 0, dy: 0, prevY: 0, update() {}, draw(ctx) { wheel.drawCar(ctx, this); } }));
    this.extra = this.cars;
    this.place(); for (const c of this.cars) { c.dx = c.dy = 0; c.prevY = c.y; }
  }
  angle(i) { return this.t / this.period * Math.PI * 2 + i * Math.PI * 2 / WHEEL_CARS; }   // 0 = straight up, clockwise
  hang(i) { const a = this.angle(i); return [this.px + Math.sin(a) * this.r, this.py - Math.cos(a) * this.r]; }
  place() {
    for (const c of this.cars) {
      const [hx, hy] = this.hang(c.i), ox = c.x, oy = c.y;
      c.x = hx - c.w / 2; c.y = hy + WHEEL_HANG; c.dx = c.x - ox; c.dy = c.y - oy; c.prevY = oy;
    }
  }
  update(g) {
    this.t++; this.place();
    if (this.foot == null) this.foot = g.level.surfaceRow(Math.floor(this.px / TILE)) * TILE;
  }
  draw() {}
  // the frame, behind the terrain: two splayed legs down to the ground, the turning rim, spokes and a ring of bulbs
  drawBehind(ctx) {
    const { px, py, r } = this, foot = this.foot || py + 100, a0 = this.angle(0), t = this.t;
    for (const s of [-1, 1]) {   // legs on land; sky wheels hang from cables with no ground underneath
      if (this.suspended) {
        fLine(ctx,px+s*r*.5,-LIFT_MAX,px+s*r*.5,py-r*.86,'#545c79',1.2);
        fLine(ctx,px+s*r*.5-.3,-LIFT_MAX,px+s*r*.5-.3,py-r*.86,'#b2bfd1',.4);
        continue;
      }
      const leg = [[px - 2, py], [px + 2, py], [px + s * r * 0.62 + 3, foot], [px + s * r * 0.62 - 3, foot]];
      fPoly(ctx, leg.map(([x, y]) => [x + (x > px ? 1 : -1) * 0.8, y]), INK);
      fPoly(ctx, leg, s < 0 ? '#e8ecf8' : '#c4cce4');
      fRoundRect(ctx, px + s * r * 0.62 - 6, foot - 3, 12, 3, 1, INK); fRoundRect(ctx, px + s * r * 0.62 - 5.3, foot - 2.4, 10.6, 1.8, 0.8, '#9aa6c8');
    }
    if (!this.suspended) fRoundRect(ctx, px - r * 0.62, py + r * 0.55, r * 1.24, 2.2, 1, '#c4cce4');   // a cross brace
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {   // spokes
      const a = a0 + i * Math.PI / 8, x1 = px + Math.sin(a) * r, y1 = py - Math.cos(a) * r;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#f4f6ff' : '#ffc8de'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x1, y1); ctx.stroke();
    }
    for (const [rr, wd, col] of [[r, 3.6, INK], [r, 2.2, '#ffffff'], [r * 0.62, 2.6, INK], [r * 0.62, 1.4, '#ffe0ec']]) { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.stroke(); }
    const BULBS = ['#ffd166', '#ff8fb8', '#8fe0ff', '#b8f08a'];
    for (let i = 0; i < 32; i++) {   // bulbs round the rim, each glowing up and down in its own slow time (never a blink)
      const a = a0 + i * Math.PI / 16, x = px + Math.sin(a) * r, y = py - Math.cos(a) * r, k = 0.55 + 0.45 * Math.sin(t * 0.05 + i * 0.8);
      ctx.globalAlpha = 0.25 * k; fBlob(ctx, x, y, 2.4, BULBS[i % 4]); ctx.globalAlpha = 1;
      fBlob(ctx, x, y, 1.1, BULBS[i % 4]); fBlob(ctx, x - 0.3, y - 0.3, 0.45, '#ffffff');
    }
    fBlob(ctx, px, py, 6.4, INK); fBlob(ctx, px, py, 5.4, '#ff8fb8'); fBlob(ctx, px, py, 3, '#ffe0ec'); fBlob(ctx, px - 1.2, py - 1.4, 1.2, '#ffffff');   // the hub
  }
  drawCar(ctx, c) {
    const [hx, hy] = this.hang(c.i), sway = Math.sin(this.t * 0.04 + c.i) * 0.06;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(sway);
    ctx.drawImage(fairCarArt(c.i % 4), -14, -2);
    ctx.restore();
  }
}
// a car: a candy-striped canopy on a hanger, two posts and a little floor (24 wide, its top WHEEL_HANG under the hanger),
// 28 x 32, the hanger's pin at (14, 2)
const CAR_COLS = [['#a8285a', '#d84a7c', '#ff8fb8', '#ffc0d8', '#fff0f6'], ['#2a7a6a', '#3aa88a', '#7adcb8', '#b8f4dc', '#effff8'], ['#2a5aa8', '#3a7ad8', '#7ab8ff', '#b8dcff', '#f0f8ff'], ['#a8781a', '#d8a82a', '#ffd166', '#ffe8a0', '#fffaf0']];
function fairCarArt(k) {
  return fairArt('car' + k, () => {
    const A = mArt(28, 32), C = CAR_COLS[k];
    A.line(13.5, 2, 13.5, 5, '#8a8ca8', null, 0.8);                                                   // the hanger rod
    A.fill(1, 4, 27, 10, (x, y) => { const u = (x - 14) / 13, top = 9.4 - 4.8 * Math.sqrt(Math.max(0, 1 - u * u)); return y >= top && y <= 9.4 + Math.sin(x * 1.25) * 0.8 && Math.abs(u) <= 1 ? (Math.floor((x - 1) / 3.25) % 2 ? '#fffaf4' : C[2]) : null; });   // a scalloped striped canopy
    A.fill(1, 4, 27, 11, (x, y) => y > 8.6 ? C[1] : null, true);
    for (const px of [3, 24]) A.line(px, 10, px, 26, '#c4cce4', null, 0.8);                            // posts
    A.fill(1, 26, 27, 32, (x, y) => { const u = (x - 14) / 13; return Math.abs(u) <= 1 && y <= 30.4 - Math.max(0, Math.abs(u) - 0.7) * 6 ? softTone(C, 0.8 - (y - 26) / 3.4) : null; });   // the tub
    A.outline();
    A.line(3, 26.6, 25, 26.6, C[4], null, 0.4);
    A.ell(9, 6.6, 2.4, 0.7, '#ffffff');
    return A.canvas();
  });
}

// ---------- the High Striker ------------------------------------------------------------------------
// ['striker', col, row]: the pad over columns col, col + 1, on the ground under `row`; the tower stands just right of it
// and BARNABY just right of that
const STRIKE_TALL = 128, STRIKE_RING = 160, STRIKE_WEAK = 100;   // tower height; the drop (px) that rings it; below this a pound is feeble
const BARKER_HELLO = 'STEP RIGHT UP! RING THE BELL, WIN A BALLOON RIDE!';
const BARKER_WEAK = ['HAH! MY GRAN HITS HARDER THAN THAT!', 'WAS THAT A SNEEZE?', 'PUNY! NEXT!', 'TICKLES!'];
const BARKER_CLOSE = ['OOH, SO CLOSE! PUT SOME ALTITUDE INTO IT!', 'ALMOST! FROM HIGHER UP, SPORT!', 'NEARLY! A BIGGER DROP, A BIGGER BONK!'];
const BARKER_WIN = 'DING DING DING! WE HAVE A WINNER! ONE BALLOON RIDE!';
const BARKER_AGAIN = ['IT ONLY RINGS ONCE, CHAMP. GO ON, THE BALLOON\'S WAITING!', 'YOU ALREADY WON! SHOO!'];
class HighStriker extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 3, 32, 3);
    this.ground = (row + 1) * TILE; this.towerX = col * TILE + 40; this.barkX = col * TILE + 64;
    this.passive = this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.from = null; this.puck = 0; this.puckV = 0; this.peak = 0; this.ringT = -1; this.squash = 0; this.won = false;
  }
  get cx() { return this.barkX; }   // (who's talking: BARNABY)
  get talkY() { return this.ground - 52; }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player;
    if (!this.hello && p.state === 'play' && Math.abs(p.x - this.x) < 9 * TILE) { this.hello = true; g.speak(this, BARKER_HELLO, '#ffd166'); }
    // a pound: remember where it started, and if it ends on the pad, that drop is the strength of the blow
    if (p.pounding && p.state === 'play') { if (this.from == null) this.from = p.y; }
    else if (this.from != null) {
      if (p.onGround && p.x + p.w > this.x + 1 && p.x < this.x + this.w - 1 && Math.abs(p.y + p.h - this.ground) < 4) this.strike(g, p.y - this.from);
      this.from = null;
    }
    if (this.squash > 0) this.squash--;
    // the puck: shoots up the tower, rides up to its peak, slides back down
    if (this.puckV || this.puck > 0) {
      this.puck = Math.max(0, this.puck + this.puckV); this.puckV -= 0.11;
      if (this.puck >= this.peak && this.puckV > 0) {
        this.puck = this.peak; this.puckV = 0;
        if (this.peak >= STRIKE_TALL) this.ring(g);
      }
      if (this.puck <= 0 && this.puckV < 0) { this.puck = 0; this.puckV = 0; Sound.play('tick'); }
    }
    if (this.ringT >= 0) this.ringT++;
  }
  strike(g, drop) {
    this.squash = 10; Sound.play('pound');
    const k = clamp((drop - 30) / (STRIKE_RING - 30), 0.1, 1);
    this.peak = drop >= STRIKE_RING ? STRIKE_TALL : Math.min(STRIKE_TALL - 14, STRIKE_TALL * k);
    this.puckV = Math.sqrt(2 * 0.11 * this.peak) + 0.4;
    if (this.won) { g.speak(this, BARKER_AGAIN, '#ffd166'); return; }
    if (drop < STRIKE_RING) g.speak(this, drop < STRIKE_WEAK ? BARKER_WEAK : BARKER_CLOSE, '#ffd166');
  }
  ring(g) {
    if (this.won) return;
    this.won = true; this.ringT = 0; g.level.bellRung = true;
    Sound.play('bell'); Sound.play('tada');
    g.speak(this, BARKER_WIN, '#ffd166');
    g.addScore(1000, this.towerX, this.ground - STRIKE_TALL - 20);
    g.burst(this.towerX, this.ground - STRIKE_TALL - 12, ['#ffd166', '#ffffff', '#ff8fb8', '#8fe0ff'], 18);
  }
  draw(ctx, g) {
    const G = this.ground, tx = this.towerX, top = G - STRIKE_TALL - 8, t = this.t;
    // the tower: a tall post with a scale painted up it, cool to hot, and the bell on top
    fRoundRect(ctx, tx - 4.6, top + 4, 9.2, G - top - 4, 2, INK);
    const pole = ctx.createLinearGradient(tx - 4, 0, tx + 4, 0); pole.addColorStop(0, '#fffaf0'); pole.addColorStop(0.5, '#e8dcc8'); pole.addColorStop(1, '#b8a888');
    fRoundRect(ctx, tx - 3.8, top + 5, 7.6, G - top - 5, 1.6, pole);
    const BANDS = ['#5fd068', '#a8e050', '#ffe14d', '#ffb347', '#ff7a45', '#ff4d6d'];
    for (let i = 0; i < 6; i++) { const y = G - 6 - (i + 1) * (STRIKE_TALL - 6) / 6; fRect(ctx, tx - 3.8, y, 7.6, (STRIKE_TALL - 6) / 6 - 1.4, BANDS[i]); }
    fRect(ctx, tx - 0.4, top + 10, 0.8, G - top - 14, '#5a4a3a');   // the wire the puck rides
    // the bell, ringing: it shivers, and rings of sound spread off it
    const shake = this.ringT >= 0 && this.ringT < 60 ? Math.sin(this.ringT * 0.9) * (1 - this.ringT / 60) * 1.4 : 0;
    ctx.save(); ctx.translate(tx, top + 3); ctx.rotate(shake * 0.2);
    fPoly(ctx, [[-7.2, 6], [-5.4, -2], [-2.6, -5.6], [2.6, -5.6], [5.4, -2], [7.2, 6]], INK);
    const bell = ctx.createLinearGradient(-6, 0, 6, 0); bell.addColorStop(0, '#fff3b0'); bell.addColorStop(0.35, '#ffd166'); bell.addColorStop(1, '#b8781a');
    fPoly(ctx, [[-6.2, 5.2], [-4.6, -1.6], [-2.2, -4.7], [2.2, -4.7], [4.6, -1.6], [6.2, 5.2]], bell);
    fRoundRect(ctx, -7.6, 4.4, 15.2, 2.2, 1, INK); fBlob(ctx, 0, 7.2, 1.3, INK); fEll(ctx, -2.6, -1, 0.8, 2.4, '#fffaf0');
    ctx.restore();
    if (this.ringT >= 0 && this.ringT < 50) {
      ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 0.8;
      for (let k = 0; k < 2; k++) { const u = ((this.ringT + k * 25) % 50) / 50; ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(tx, top + 3, 8 + u * 16, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // the puck
    const py = G - 8 - this.puck;
    fRoundRect(ctx, tx - 5, py - 3, 10, 6, 2, INK); fRoundRect(ctx, tx - 4.2, py - 2.2, 8.4, 4.4, 1.6, '#e8463a'); fRect(ctx, tx - 3.4, py - 1.8, 6.8, 0.8, '#ff9a8a');
    // the pad: a red-and-white target on a little anvil, squashed by a good bonk
    const sq = this.squash > 0 ? this.squash / 10 : 0, cx = this.x + 16;
    fRoundRect(ctx, this.x + 3, G - 5 + sq * 1.4, 26, 5.4 - sq * 1.4, 1.6, INK);
    fRoundRect(ctx, this.x + 4, G - 4.2 + sq * 1.4, 24, 3.8 - sq * 1.4, 1.2, '#8a8ca8');
    fEll(ctx, cx, G - 5.2 + sq * 1.4, 10.4, 2.2, INK); fEll(ctx, cx, G - 5.4 + sq * 1.4, 9.4, 1.6, '#e8463a'); fEll(ctx, cx, G - 5.4 + sq * 1.4, 6, 1, '#ffffff'); fEll(ctx, cx, G - 5.4 + sq * 1.4, 2.8, 0.5, '#e8463a');
    fRoundRect(ctx, this.x + 28, G - 6, 5, 6, 1, INK); fRect(ctx, this.x + 28.7, G - 5.3, 3.6, 4.6, '#c4cce4');   // the lever's housing at the tower's foot
    // BARNABY
    const speaking=g&&g.dialog&&g.dialog.speaker===this;
    const talking = speaking || this.ringT >= 0 && this.ringT < 90 ? (t >> 3) % 2 : 0;
    ctx.drawImage(barkerArt(talking, this.won), this.barkX - 20, G - 54);
  }
}
// BARNABY: a broad, cheerful walrus in a striped fair uniform, red waistcoat and employee cap.
// 40 x 54, feet at y=54; his mouth and flippers animate while speaking or cheering.
function barkerArt(open, cheer) {
  return fairArt('barnabyWalrus'+open+cheer,()=>{
    const A=mArt(40,54),skin=['#543e37','#79594b','#a27c63','#bd9b7a','#dcc09a'];
    const red=['#6f2034','#a52d44','#d84755','#ef7680','#ffc0b8'];
    const blue=['#1d3b51','#2f5a72','#487e94','#80a6b1','#c8dcda'];
    const ivory=['#b3a586','#d3c5a3','#f0e4c4','#fff4d9','#fffbed'];
    // Low flipper feet and a rounded, well-fed body under the uniform.
    A.soft(12,50,8,3,skin,null,-.2);A.soft(28,50,8,3,skin,null,.2);
    A.soft(20,35,15,15,blue);
    A.fill(7,24,33,48,(x,y)=>{
      const u=(x-20)/13.5,v=(y-35)/13;if(u*u+v*v>1)return null;
      return ((x+1)%5<2)?'#ece8d2':'#4f8190';
    });
    A.poly([[8,25],[15,25],[19,32],[16,47],[6,45]],red[2]);
    A.poly([[25,25],[32,25],[34,45],[23,47],[21,32]],red[1]);
    A.line(9,27,8,43,red[3],null,.7);A.line(29,27,31,43,red[3],null,.6);
    A.poly([[16,28],[20,30],[24,28],[23,34],[20,32],[17,34]],'#ffce75');
    A.ell(20,31,1.1,1.2,red[1]);
    for(const y of [37,43])A.soft(20,y,1,1,ivory);
    // A little name badge and brass pin make him read as the fair employee.
    A.poly([[26,33],[31,33],[31,37],[26,37]],'#fff4d7');
    A.line(27,34.5,30,34.5,blue[0],null,.35);A.line(27,36,29,36,blue[1],null,.3);
    for(const side of [-1,1]){
      const x=20+side*13,y=cheer?27:33;
      A.soft(x,y,4,7,red,null,side*.3);
      A.soft(x+side*(cheer?2:1),y+(cheer?-8:8),3.5,6,skin,null,side*(cheer?.75:.15));
    }
    // Big whiskery muzzle, bright eyes and two unmistakable curved ivory tusks.
    A.soft(20,18.5,13.8,12.1,skin);
    for(const side of [-1,1]){
      const ex=20+side*6.1;
      A.soft(ex,16.8,3.5,4.1,ivory);
      if(cheer)A.line(ex-1.7,16.9,ex,15.8,'#382d2b',null,.9),A.line(ex,15.8,ex+1.7,16.9,'#382d2b',null,.9);
      else {A.ell(ex+side*.15,16.7,1.7,2.5,'#273535');A.ell(ex-.45,15.8,.55,.7,'#fffbe7');}
      A.line(ex-2.3,12.4,ex+1.5,12.1,skin[0],null,.75);
    }
    A.soft(15,24.5,6.4,4.8,ivory);A.soft(25,24.5,6.4,4.8,ivory);
    if(open)A.ell(20,29.3,3.1,2.3,'#5a3035');else A.line(17.7,29.6,22.3,29.6,skin[0],null,.55);
    A.soft(20,22.2,3.6,2.4,['#292e32','#41464a','#697171','#8b9690','#b6c1b2']);
    for(const side of [-1,1]){
      const x=20+side*6.5;
      A.poly([[x-1.5,27],[x+1.5,27],[x+side*1.3,34],[x-side*.7,39.5],[x-side*1.5,34]],ivory[2]);
      A.line(x-.5,28,x+side*.4,34,ivory[4],null,.7);
      for(const [dx,dy]of [[0,0],[1.5,1],[-1,1.5]])A.ell(20+side*(5+dx),24+dy,.35,.35,skin[1]);
    }
    // Fair cap: red crown, cream band and a navy visor.
    A.soft(20,7.3,11.2,5.5,red);A.poly([[10,7],[30,7],[29,11],[11,11]],ivory[2]);
    A.soft(21,11,11.5,2.6,blue);A.soft(20,6.5,2.2,2.2,ivory);
    A.ell(20,6.5,1,1,red[1]);
    A.outline('#362e30',2);
    for(const side of [-1,1])for(let i=0;i<3;i++)A.line(20+side*7,25+i,20+side*17,23+i*2,'#eee2bd',null,.4);
    return A.canvas();
  });
}

// ---------- the dock gate -------------------------------------------------------------------------
// ['fairgate', col, topRow, bottomRow]: a striped barrier arm across the way to the dock, solid until the bell rings
class FairGate extends Enemy {
  constructor(col, top, bot) {
    super(col * TILE, 0, TILE, (bot + 1) * TILE);
    this.col = col; this.top = 0; this.bot = bot; this.k = 0; this.shut = false;
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.t === 1 && !g.level.bellRung) { for (let r = 0; r <= this.bot; r++) g.level.set(this.col, r, T.BODY);g.level.skyGates.set(this.col,this.bot); this.shut = true; }
    if (g.level.bellRung && this.k < 1) {
      if (this.k === 0) Sound.play('gate');
      this.k = Math.min(1, this.k + 1 / 40);
      if (this.k > 0.4 && this.shut) { for (let r = this.top; r <= this.bot; r++) g.level.set(this.col, r, T.EMPTY);g.level.skyGates.delete(this.col); this.shut = false; }
    }
  }
  draw(ctx) {
    const x=this.x+8,y0=-LIFT_MAX-20,y1=this.y+this.h,e=this.k*this.k*(3-2*this.k);
    const bottom=y1-e*(y1-y0+20);
    if(bottom>y0){
      // One continuous striped barrier runs beyond the highest camera lift; it retracts when unlocked.
      ctx.save();ctx.beginPath();ctx.rect(this.x,y0,TILE,bottom-y0);ctx.clip();
      fRect(ctx,this.x,y0,TILE,bottom-y0,INK);fRect(ctx,this.x+1,y0,TILE-2,bottom-y0,'#cf354c');
      for(let y=y0-20;y<bottom+20;y+=18)fPoly(ctx,[[this.x+1,y],[this.x+15,y+8],[this.x+15,y+15],[this.x+1,y+7]],'#fff1de');
      fRect(ctx,this.x+1.3,y0,1,bottom-y0,'#ffaf9b');fRect(ctx,this.x+13.7,y0,1,bottom-y0,'#7b253d');
      ctx.restore();
    }
  }
}

// ---------- the entrance arch (scenery) ---------------------------------------------------------------
// ['fairarch', col, row]: two striped poles either side of column col standing in `row`, with swaying bunting
class FairArch extends Enemy {
  constructor(col, row) {
    super(col * TILE - 40, (row + 1) * TILE - 70, 96, 70);
    this.ground = (row + 1) * TILE; this.mid = col * TILE + 8;
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  draw(ctx) {
    const G = this.ground, m = this.mid, t = this.t, top = G - 64;
    for (const s of [-1, 1]) {   // candy-striped poles with a gold knob each
      const x = m + s * 42;
      fRoundRect(ctx, x - 3, top, 6, G - top, 1.6, INK);
      ctx.save(); ctx.beginPath(); ctx.rect(x - 2.2, top + 0.8, 4.4, G - top - 0.8); ctx.clip();
      fRect(ctx, x - 2.2, top, 4.4, G - top, '#ffffff');
      ctx.fillStyle = '#e8463a'; for (let y = top - 6; y < G; y += 7) { ctx.beginPath(); ctx.moveTo(x - 2.2, y); ctx.lineTo(x + 2.2, y - 3); ctx.lineTo(x + 2.2, y); ctx.lineTo(x - 2.2, y + 3); ctx.fill(); }
      ctx.restore();
      fBlob(ctx, x, top - 2, 3.6, INK); fBlob(ctx, x, top - 2, 2.8, '#ffd166'); fBlob(ctx, x - 0.9, top - 2.9, 1, '#fff3b0');
    }
    // bunting strung between the decorated posts, swaying
    const FL = ['#ff8fb8', '#ffd166', '#8fe0ff', '#b8f08a', '#c8a8ff'];
    ctx.strokeStyle = '#8a8ca8'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(m - 42, top + 20); ctx.quadraticCurveTo(m, top + 30, m + 42, top + 20); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const u = (i + 0.5) / 10, x = m - 42 + u * 84, y = top + 20 + Math.sin(u * Math.PI) * 5, sw = Math.sin(t * 0.05 + i) * 0.8;
      fPoly(ctx, [[x - 3, y], [x + 3, y], [x + sw, y + 6]], FL[i % 5]);
    }
  }
}

// ---------- the hot-air balloon -----------------------------------------------------------------------
// ['balloon', col, row, endCol]: waiting at the dock (its basket on the ground under `row`); step in and it's yours.
// It lands itself once its middle passes endCol (at the first ground under it) and floats away home.
const BALLOON_W = 24, BALLOON_H = 64, BALLOON_LIFT = 0.075, BALLOON_SINK = 0.038, BALLOON_DRIFT = 0.95;
class Balloon extends Enemy {
  constructor(col, row, end) {
    super(col * TILE + 8 - BALLOON_W / 2, (row + 1) * TILE - BALLOON_H, BALLOON_W, BALLOON_H);
    this.end = end * TILE + 8; this.state = 'dock'; this.burn = false; this.flame = 0;
    this.passive = this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player;
    this.flame += ((this.burn ? 1 : 0) - this.flame) * 0.3;
    if (this.state === 'dock') {
      // in he gets: standing in the basket
      if (p.state === 'play' && p.onGround && !p.vine && Math.abs(p.x + p.w / 2 - this.cx) < 6 && Math.abs(p.y + p.h - (this.y + this.h)) < 3) {
        if (p.roll > 0) g.endRoll(p);
        this.state = 'fly'; this.vx = 0; this.vy = -0.6; g.ride = this;
        const tip = g.say('HOT-AIR BALLOON!', 'HOLD {JUMP} TO FIRE THE BURNER\nBRAKE OR ACCELERATE WITH ARROWS, CAREFUL!', '#ffd166');
        if (tip) tip.replayAfterSpeech = false;
        Sound.play('whoosh');
      }
    } else if (this.state === 'landed') {
      this.burn = false;
      if (++this.timer > 50) { this.state = 'away'; Sound.play('whoosh'); }
    } else if (this.state === 'away') {
      this.burn = this.t % 40 < 24; this.y -= 0.9; this.x += 0.5;
      if (this.y < -120) this.remove = true;
    } else if (this.state === 'sunk') {
      this.y += 1.2; if (this.y > VIEW_H + 40) this.remove = true;
    }
  }
  // flying him (game-update.js calls this in place of his own controls while g.ride is this balloon)
  step(g, p) {
    const lv = g.level, landing = this.cx >= this.end;
    this.burn = !landing && (Input.down('jump') || Input.down('up') || Input.down('spin'));
    const dir = landing ? 0 : (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    this.vy = clamp(this.vy + (this.burn ? -BALLOON_LIFT : BALLOON_SINK), -1.25, landing ? 0.8 : 1.05);
    this.vx += ((landing ? 0 : dir < 0 ? 0.12 : dir > 0 ? 1.6 : BALLOON_DRIFT) - this.vx) * 0.06;   // (holding back, it all but hovers)
    if (this.burn && this.t % 14 === 0) Sound.play('gust');
    if (sweepX(lv, this, this.vx)) this.vx = 0;                       // up against a cloud: it just leans on it
    if (this.y < 2) { this.y = 2; this.vy = Math.max(0, this.vy); }   // (the top of the sky)
    const r = sweepY(lv, this, this.vy);
    if (r === -1) this.vy = 0.2;
    if (r === 1) {
      this.vy = 0;
      if (landing) {   // touchdown at the far dock: out he hops, and off it goes
        this.state = 'landed'; this.timer = 0; g.ride = null;
        p.x = this.cx - p.w / 2; p.y = this.y + this.h - p.h - 3; p.vx = 1.4; p.vy = -3.6; p.onGround = false; p.jumping = false; p.flaps = 0;
        Sound.play('hop'); g.dust(this.cx, this.y + this.h, 6); g.addScore(500, this.cx, this.y);
        return;
      }
    }
    // pinned in the basket, facing the way the wind blows
    p.x = this.cx - p.w / 2; p.y = this.y + this.h - 9 - p.h; p.vx = 0; p.vy = this.vy;   // (up on the burner's step: chest-high over the rim) p.onGround = true; p.platform = null; p.facing = 1;
    p.crouch = false; p.jumping = false; p.flaps = 0; p.spin = false; p.pounding = false; p.floatT = 0;
    if (this.y + this.h > VIEW_H + 6) {   // sank into the sea of clouds
      this.state = 'sunk'; g.ride = null; p.y = VIEW_H + 8; g.killPlayer('pit');
    }
  }
  draw(ctx) {
    const cx = this.cx, bot = this.y + this.h, t = this.t, sway = Math.sin(t * 0.04) * 0.6, top = this.y - 6;
    // ropes from the envelope's skirt down to the basket's rim
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 0.5; ctx.beginPath();
    for (const s of [-1, 1]) { ctx.moveTo(cx + s * 5.4 + sway, top + 46); ctx.lineTo(cx + s * 10.4, bot - 12); ctx.moveTo(cx + s * 2.4 + sway, top + 47); ctx.lineTo(cx + s * 5, bot - 12); }
    ctx.stroke();
    ctx.drawImage(balloonEnvelopeArt(), cx - 24 + sway, top);
    // the burner hung under the skirt, and its flame roaring up into the envelope while he fires it (a steady flame
    // that swells and settles: no flicker)
    const by = top + 49;
    fRoundRect(ctx, cx - 3.4 + sway, by - 1.6, 6.8, 3.6, 1.2, INK); fRoundRect(ctx, cx - 2.6 + sway, by - 0.8, 5.2, 2, 0.8, '#a8acc4');
    if (this.flame > 0.05) {
      const f = this.flame, h = 7 + f * 4 + Math.sin(t * 0.35) * 0.8, x = cx + sway;
      ctx.globalAlpha = 0.5 * f; fGlow(ctx, x, by - 6, 11, '#ffb347', 0.6); ctx.globalAlpha = Math.min(1, f * 1.4);
      fPoly(ctx, [[x - 2.6, by - 1.4], [x + 2.6, by - 1.4], [x + 1.5, by - 1.4 - h * 0.6], [x, by - 1.6 - h], [x - 1.5, by - 1.4 - h * 0.6]], '#ff7a2a');
      fPoly(ctx, [[x - 1.3, by - 1.4], [x + 1.3, by - 1.4], [x + 0.7, by - 1.4 - h * 0.45], [x, by - 1.6 - h * 0.7], [x - 0.7, by - 1.4 - h * 0.45]], '#ffe08a');
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(balloonBasketArt(false), cx - 12, bot - 13);   // the inside of the basket, behind him
  }
  drawFront(ctx) { ctx.drawImage(balloonBasketArt(true), this.cx - 12, this.y + this.h - 13); }   // its front, over his legs
}
// the envelope: 48 x 50, gores of red, cream and gold, lit from the upper left, narrowing to the skirt at the bottom
function balloonEnvelopeArt() {
  return fairArt('envelope', () => {
    const A = mArt(48, 50), GORE = [['#8a141c', '#c8283a', '#e8463a', '#ff7a6a', '#ffb0a0'], ['#a89068', '#d8c8a0', '#fff0d0', '#fffaf0', '#ffffff'], ['#a8781a', '#d8a82a', '#ffd166', '#ffe8a0', '#fffaf0']];
    A.fill(0, 0, 48, 50, (x, y) => {
      const cx = 24, u = (x - cx) / 22;
      let half;
      if (y < 22) half = 22 * Math.sqrt(Math.max(0, 1 - ((y - 22) / 21) ** 2));
      else half = 22 - (y - 22) * 0.62 - Math.max(0, y - 40) * 0.25;
      if (y > 49 || Math.abs(x - cx) > half || half < 3.4) return null;
      const s = clamp((x - cx) / Math.max(1, half), -1, 1), gore = Math.floor((Math.asin(s) / Math.PI + 0.5) * 7) % 3;
      const l = 0.55 - s * 0.55 - (y / 50) * 0.4 + (1 - Math.abs(s)) * 0.25;
      return softTone(GORE[gore], l);
    });
    A.fill(18, 43, 30, 50, (x, y) => y > 45 ? '#6a4a2a' : null, true);   // the skirt, scorched dark
    A.outline();
    A.ell(15, 12, 3.4, 5.4, '#ffffff', null, 0.5);
    return A.canvas();
  });
}
// the wicker basket: 24 x 13 (its rim at the top), front or the inside of the back
function balloonBasketArt(front) {
  return fairArt('basket' + front, () => {
    const A = mArt(24, 13), W = ['#4a2a12', '#6a4424', '#9a6a3a', '#c8945a', '#e8c088'];
    if (front) {
      A.fill(1, 3, 23, 13, (x, y) => { const weave = (Math.floor(x / 2) + Math.floor(y / 2)) % 2; return x > 1.6 + (y - 3) * 0.12 && x < 22.4 - (y - 3) * 0.12 ? softTone(W, (weave ? 0.6 : 0.35) - (y - 3) / 14) : null; });
      A.fill(0, 1.6, 24, 4, (x) => x > 0.6 && x < 23.4 ? softTone(W, 0.85) : null);   // the rim
      for (const sx of [5, 19]) A.soft(sx, 8.6, 1.8, 2.4, ['#5a4a2a', '#8a7a4a', '#b8a868', '#d8c890', '#f0e4b8']);   // sandbags
      A.outline();
    } else A.fill(2, 2, 22, 6, () => W[1]);
    return A.canvas();
  });
}

// ---------- STORMY ------------------------------------------------------------------------------------
// ['storm', col, row, phase0to1]: a thundercloud hanging in the sky. Every STORM_CYCLE frames it charges up for
// STORM_WARN (darkening, eyes alight, a grumble) and then drops a bolt straight down for STORM_BOLT
const STORM_CYCLE = 240, STORM_WARN = 70, STORM_BOLT = 105;
const STORMY_LINES = ['YOU\'RE THE ONE WHO MADE MY LITTLE BROTHER CRY!', 'SULKY TOLD ME ALL ABOUT YOU.', 'GET OFF MY SKY!'];
class StormCloud extends Enemy {
  constructor(col, row, phase = 0) {
    super(col * TILE - 12, row * TILE, 40, 20);
    this.y0 = this.y; this.ph = Math.floor(phase * STORM_CYCLE);
    this.passive = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  phase() {
    const k = (this.t + this.ph) % STORM_CYCLE;
    if (k >= STORM_CYCLE - STORM_BOLT) return ['bolt', (k - (STORM_CYCLE - STORM_BOLT)) / STORM_BOLT];
    if (k >= STORM_CYCLE - STORM_BOLT - STORM_WARN) return ['warn', (k - (STORM_CYCLE - STORM_BOLT - STORM_WARN)) / STORM_WARN];
    return ['calm', 0];
  }
  hitbox() { return this.state === 'bolt' && this.boltTo ? { x: this.cx - 7, y: this.y + this.h - 2, w: 14, h: this.boltTo - this.y - this.h + 2 } : null; }
  onTouch(g) { g.hurtPlayer(); }
  update(g) {
    this.t++;
    this.y = this.y0 + Math.sin(this.t * 0.03 + this.ph) * 2;
    const [st] = this.phase(), on = this.x > g.camX - 40 && this.x < g.camX + VIEW_W + 20;
    if (st === 'bolt' && this.state !== 'bolt') {
      // where the bolt ends: the first solid thing below, or the bottom of the sky
      const c = Math.floor(this.cx / TILE);
      let r = Math.floor((this.y + this.h) / TILE) + 1;
      while (r < ROWS && !g.level.solid(c, r)) r++;
      this.boltTo = Math.min(VIEW_H + 8, r * TILE); this.seed = (this.t * 7 + this.x) | 0;
      if (on) Sound.play('thunder');
    }
    if (st === 'warn' && this.state !== 'warn' && on) Sound.play('rumble');
    this.state = st;
    const visible=this.cx+22>g.camX&&this.cx-22<g.camX+VIEW_W;
    if (!g.level.stormyTold && visible && g.player.state === 'play') { g.level.stormyTold = true; g.speak(this, STORMY_LINES[0], '#c8b8ff'); }
  }
  draw(ctx, g) {
    const [st, k] = this.phase(), cx = this.cx, y = this.y, warn = st === 'warn' ? k : st === 'bolt' ? 1 : 0;
    if (st === 'warn') {
      const col=Math.floor(cx/TILE);let r=Math.floor((y+this.h)/TILE)+1;while(r<ROWS&&!g.level.solid(col,r))r++;
      const bot=Math.min(VIEW_H+8,r*TILE);ctx.globalAlpha=.12+k*.25;fRect(ctx,cx-7,y+this.h,14,bot-y-this.h,'#ac98e6');ctx.globalAlpha=1;
      for(let yy=y+this.h+8;yy<bot;yy+=18)umbraSpark(ctx,cx,yy,1+k,'#d1b8ff',.25+k*.4);
    }
    if (st === 'bolt' && this.boltTo) {   // one stable, narrow yellow strike with five fine forks
      const rng = mulberry32(this.seed), pts = [[cx, y + this.h - 3]];
      for (let yy = y + this.h + 8; yy < this.boltTo; yy += 9 + rng() * 6) pts.push([cx + (rng() - 0.5) * 7, yy]);
      pts.push([cx + (rng() - 0.5) * 3, this.boltTo]);
      const a = Math.min(1, k * 8) * (k > 0.8 ? (1 - k) / 0.2 : 1);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const [wd, col, al] of [[10, '#ffd334', .16], [5, '#ffd334', .5], [2.2, '#ffe761', .95], [.7, '#fffbe0', 1]]) {
        ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
      }
      for(let i=0;i<5;i++) {
        const root=pts[Math.min(pts.length-2,1+Math.floor((pts.length-3)*(i+1)/6))];
        const side=i%2?1:-1,reach=4.5+rng(),len=Math.min(18+rng()*14,this.boltTo-root[1]);
        const fork=[root,[cx+side*reach*.7,root[1]+len*.35],[cx+side*reach*.42,root[1]+len*.58],[cx+side*reach,root[1]+len]];
        for(const [width,color,alpha]of [[2,'#ffd334',.6],[.6,'#fff3a1',.95]]) {
          ctx.globalAlpha=a*alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
          fork.forEach(([px,py],j)=>j?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    if (warn > 0) { ctx.globalAlpha = warn * 0.5; fGlow(ctx, cx, y + 10, 22, '#ffe05a', 0.5); ctx.globalAlpha = 1; }
    ctx.drawImage(stormCloudArt(warn > 0.5 ? 1 : 0), cx - 22, y - 8);
    // the family face: Sulky's own sulk, a size up -- heavy lids, eyes sliding toward Chickaroo, a pout
    // (charging, the eyes under those lids light up)
    const fy = y + 9, p = g && g.player, look = p ? clamp((p.x + p.w / 2 - cx) / 60, -1, 1) : 0, lit = warn > 0.5;
    for (const ex of [-5.5, 6.5]) {
      fEll(ctx, cx + ex + look * 1.1, fy, 1.4, 1.5, lit ? '#ffd166' : INK);
      if (lit) fEll(ctx, cx + ex + look * 1.1, fy + 0.2, 0.6, 0.8, '#ff9a2a');
      fRect(ctx, cx + ex - 2.8, fy - 2.8, 5.6, 1.4, lit ? '#4a4280' : '#50567a'); fRect(ctx, cx + ex - 2.8, fy - 1.6, 5.6, 1 / 3, INK);
    }
    fArc(ctx, cx + 0.5, fy + 7.6, 2, 2.9, Math.PI * 1.15, Math.PI * 1.85, INK);
  }
}
// STORMY: 44 x 30, built just like his little brother Sulky (sky's sulking raincloud: the same five puffs, the same
// highlights) but a size bigger, in heavy slate (charged: violet). His face is drawn live, in StormCloud.draw
function stormCloudArt(charged) {
  return fairArt('storm' + charged, () => {
    const A = mArt(44, 30), C = charged ? ['#1e1838', '#2e2a58', '#4a4280', '#6a62a8', '#9a92d0'] : ['#24243a', '#363a58', '#50567a', '#7a80a2', '#a8aec8'];
    const puffs = [[-9, 8, 7], [0, 5, 9], [9, 8, 7], [-4, 10, 7], [5, 10, 7]].map(([dx, dy, r]) => [22 + dx * 1.4, 6 + dy * 1.4, r * 1.35]);
    A.fill(0, 0, 44, 30, (x, y) => {   // one merged cloud (like Sulky's), lit as a whole from the upper left
      if (!puffs.some(([px, py, r]) => (x - px) ** 2 + (y - py) ** 2 <= r * r)) return null;
      return softTone(C, 0.75 - (x - 22) / 26 * 0.5 - (y - 15) / 15 * 0.7);
    });
    A.outline();
    A.ell(22 - 3 * 1.4, 6 + 2 * 1.4, 4, 3, C[4]); A.ell(22 - 9 * 1.4, 6 + 6 * 1.4, 2.6, 2, C[4]);   // the highlights, where Sulky has his
    return A.canvas();
  });
}
