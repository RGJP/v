'use strict';
// 3-4 room 6, THE SMALL INTESTINE (85 columns wide). Three acts, each its own trick:
//   ACT 1 THE VILLI    ['villus', col, row]   a soft finger standing up out of the bile: springy, like a springboard.
//                      Land on one for a small bounce; hold jump as it squashes for a big launch (to the high shelf).
//   ACT 2 THE TAPEWORM ['tapeworm', col, row, n = 8]   a sleeping tapeworm stretched across the bile: its body is a still
//                      bridge of segments (platforms), ending in its snoring head.
//   ACT 3 THE VALVES   ['sphincter', col, w, top, bottom, period, open, offset, 'h'?]   a muscular gate across the whole
//                      passage, opening and clenching shut on a rhythm (it twitches red before it shuts, and never
//                      shuts on him: it waits until he's through). With 'h' it's a ring across a shaft instead, the lips
//                      closing in from the left and right walls (the mill's three, over the valve shaft).
// Part of the gut's rooms (see gut.js for the level format).

// ── villi: springy fingers ──────────────────────────────────────────────────
const VILLUS_W = 26;   // the cap's width (a plain spring is 14)
const VILLUS_BIG = -10, VILLUS_SMALL = -8, VILLUS_PUSH = 1.6;   // launch speeds: up, and forward off the finger   // gentler than a springboard: the ceiling is low in here
class Villus extends Spring {
  constructor(col, row) {
    super(col, row);
    this.x -= (VILLUS_W - this.w) / 2; this.w = VILLUS_W;   // a broad cap, easy to land on and to step off
    this.swayPh = col * 7;
  }
  update(g) {
    const p = this.rider, had = !!p;
    super.update(g);
    if (had && !this.rider && p.vy < -5) {   // the launch frame: set the height, and send him off forward (the way he's holding)
      p.vy = this.big ? VILLUS_BIG : VILLUS_SMALL;
      const dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
      p.vx = dir * VILLUS_PUSH;   // (no direction held: straight up, so it's always exactly what he asked for)
      if (dir) p.facing = dir;
      p.springAir = true; p.airMax = WALK_MAX;   // crisp steering in the air (quick to turn, settles the instant he lets go) and a capped speed, so hop distances are exact
    }
  }
  draw(ctx) {
    const top=this.rest+this.comp-(this.stretch>4?3:this.stretch>0?1:0);
    const height=VIEW_H-this.rest, art=villusArt(height,Math.abs(this.swayPh)%3);
    const sw=Math.sin(this.t*.035+this.swayPh)*1.1, H=VIEW_H-top;
    // Bend the stalk gently, with the crown held over its actual landing surface.
    for(let y=0;y<art.height;y+=1){
      const v=y/art.height,off=sw*Math.sin(v*Math.PI);
      ctx.drawImage(art,0,y,art.width,1,fSnap(this.cx-art.width/2+off),top+y/art.height*H,art.width,H/art.height+.15);
    }
  }
}

// Baked tissue, with a cellular brush border, branching vessels and longitudinal folds.
const VILLUS_ART=new Map();
function villusArt(height,variant=0){
  const key=height+':'+variant;if(VILLUS_ART.has(key))return VILLUS_ART.get(key);
  const A=mArt(36,height+2),cx=18,C=['#702a46','#a34865','#cc7890','#e9a8b6','#f8d4d6'];
  const crown=(x,y)=>((x-cx)/13)**2+((y-6)/5.6)**2<=1;
  A.fill(2,0,34,A.h,(x,y)=>{
    const v=clamp(y/height,0,1),half=7.5+v*3.3+Math.sin(v*7+variant)*.45,u=(x-cx)/half;
    if(!crown(x,y)&&(y<6||Math.abs(u)>1))return null;
    const fold=Math.sin((x-cx)*1.3+Math.sin(y*.13+variant)*.7);
    const edge=Math.abs(u),light=.9-u*.65-v*.5+fold*.1-edge*edge*.4;
    return softTone(C,light);
  });
  // A central pale lacteal, flanked by two looping red capillaries.
  A.line(cx+.5,12,cx+1,height,'#d3ad9c',true,1.6);
  for(const side of [-1,1]){
    let px=cx+side*3,py=height;
    for(let y=height-2;y>8;y-=2){const x=cx+side*(3+Math.sin(y*.15+variant)*.9);A.line(px,py,x,y,'#a14a65',true,.6);px=x;py=y;
      if(y%10<2)A.line(x,y,x+side*3.2,y-3,'#bb617a',true,.34);
    }
    A.line(cx+side*3,9,cx,5.5,'#a14a65',true,.5);
  }
  for(let y=14;y<height;y+=4.5)for(const side of [-1,1]){
    const x=cx+side*(6.4+y/height*3);
    A.soft(x,y,1.1,2.1,['#a55a72','#c58197','#dfa4b5','#edbec8','#f8d8db'],true,side*.13);
    A.line(x-side*.9,y-1.3,x-side*.65,y+1,'#f2becb',true,.3);
  }
  A.soft(cx-3,4.8,8,2.4,['#b56a85','#d794a8','#ebb6c5','#f8d8df','#ffeced'],true);
  A.outline('#592338',2);
  // Separate epithelial cells and the fine microvilli fringe around the usable crown.
  for(let i=-6;i<=6;i++){
    const x=cx+i*1.8,y=6-5.4*Math.sqrt(Math.max(0,1-(i*1.8/13)**2));
    A.soft(x,y+1.1,.8,1.2,['#bb7c91','#d69dad','#edbfcb','#fadce3','#fff0f1']);
    A.line(x,y-.3,x+(i%2)*.15,y-1,'#f7d8df',null,.3);
  }
  for(let y=17;y<height-4;y+=13)A.soft(cx-4,y,1.3,2.7,['#c887a0','#dea7ba','#efc4d0','#f9dfe5','#ffecee'],true,-.12);
  const art=A.canvas();VILLUS_ART.set(key,art);return art;
}

// ── the tapeworm: a sleeping bridge ─────────────────────────────────────────
const WORM_SEG_W = 40, WORM_HEAD_W = 104, WORM_BODY_H = 18;   // (asleep: it lies perfectly still, a solid bridge with no gaps)
// The head is a big round dome (bulb centre WORM_DOME_CX from the head's left edge, half-width/height RX/RY above the body's top):
// he has to climb over it. Its collision is a row of thin stepping slabs (WormDome) following the curve, with the flat head
// under them as the floor; Tapeworm.update pushes him out of the dome's side if he jumps into it.
const WORM_DOME_CX = 60.5, WORM_DOME_RX = 43, WORM_DOME_RY = 22, WORM_DOME_STEP = 3;
const WORM_SHIVER_R = 40, WORM_SHIVER_AMP = 2;   // the shiver under his feet: how far along the body it spreads (px), and how hard (px)
class WormDome {   // one thin slab of the head's curve
  constructor(worm, x, y) { this.worm = worm; this.dome = worm; this.x = x; this.w = WORM_DOME_STEP; this.y = this.prevY = y; this.h = 8; this.dx = this.dy = 0; this.stepUp = true; }
  update() {}
  draw() {}
}
class TapewormSeg {
  constructor(worm, i, x, w, y) {
    this.worm = worm; this.i = i; this.x = x; this.w = w; this.h = 8;
    this.base = y; this.y = this.prevY = y; this.dx = 0; this.dy = 0; this.t = 0; this.next = null;
  }
  isHead() { return this.i === this.worm.n - 1; }
  update(g) {
    this.t++;
    this.prevY = this.y; this.dy = 0; this.dx = 0;
    const p = g.player;
    if (this.isHead() && !g.tapeSaid && p.platform && (p.platform === this || p.platform.dome === this.worm) && p.onGround && p.state === 'play') { g.tapeSaid = 1; g.speak(CHICK_VOICE, 'PHEW, IT\'S ASLEEP. NOBODY WAKE THAT THING...', '#ffd166');
      const line=[g.dialog,...(g.dialogQ||[])].find(l=>l&&l.text.startsWith("PHEW, IT'S ASLEEP"));
      if(line){line.uninterruptible=true;g.dialog=line;g.dialogQ=(g.dialogQ||[]).filter(l=>l!==line&&l.hold);} }
  }
  // A sleeping tapeworm, drawn as a real one: a ribbon of flat ivory proglottids (each pinched at the joints, with its
  // own branching uterus, a genital pore on alternate sides and flecks of lime), all of it wet with mucus -- a moving
  // gloss along its back, a film over the belly, strings and beads of slime hanging down into the bile.
  // (painted fine: proglottidArt and wormHeadArt, below; the shiver moves each proglottid as one)
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), w = this.w, hd = this.isHead(), t = this.worm.t, x0 = this.worm.x, W = this.worm;
    const from = hd ? w : 0;   // (the head's whole stretch, neck and bulb, is drawn by drawHead: no body peeking out past the bulb)
    ctx.save(); ctx.beginPath(); ctx.rect(x + from, y - 4, w - from, 30); ctx.clip();
    for (let k = Math.floor((x + from - x0) / 20); x0 + k * 20 < x + w; k++) {
      const px = x0 + k * 20, sh = this.i < W.n - 3 ? W.shAmp * Math.max(0, 1 - Math.abs(px + 10 - W.shX) / WORM_SHIVER_R) : 0;   // the shiver: strongest right under his feet
      const yo = sh > 0.02 ? sh * WORM_SHIVER_AMP * Math.sin(t * 0.8 + (px + 10) * 0.55) : 0;
      ctx.drawImage(proglottidArt(k % 2), px - 1, y + fSnap(yo) - 2);
      const gl = ((px + 10) * 0.7 - t * 0.5) % 36;   // the gloss of mucus sliding slowly along its back
      if (gl > -6 && gl < 10) { ctx.globalAlpha = 0.6 * Math.max(0, 1 - Math.abs(gl - 2) / 8); fRoundRect(ctx, px + 4 + gl * 0.4, y + yo + 1 / 3, 6, 1, 0.5, '#ffffff'); ctx.globalAlpha = 1; }
    }
    ctx.restore();
    // mucus hanging off the belly into the bile: strings that stretch and sag, a bead at each tip
    for (let j = 0; j < Math.floor(w / 20); j++) {
      const sx = x + 8 + j * 20 + ((this.i * 7 + j * 5) % 5), ph = this.i * 1.7 + j * 2.3, len = 5 + (0.5 + 0.5 * Math.sin(t * 0.025 + ph)) * 9;
      if (hd && sx < x + 20) continue;
      ctx.globalAlpha = 0.75; fRect(ctx, sx, y + 17, 2 / 3, len, '#d6f4ee'); ctx.globalAlpha = 1;
      fBlob(ctx, sx + 1 / 3, y + 17.6 + len, 0.9, '#f4fffc');
    }
    if (hd) this.drawHead(ctx, x, y);
  }
  drawHead(ctx, x, y) {   // the scolex: a thin ribbed neck swelling into a big round pale bulb, three sucker cups, a few Zs
    const t = this.worm.t, cx = x + WORM_DOME_CX;
    ctx.drawImage(wormHeadArt(), x - 2, y - WORM_DOME_RY - 4);
    for (let i = 0; i < 2; i++) {
      const zk = ((t + i * 70) % 140) / 140; ctx.globalAlpha = zk < 0.2 ? zk / 0.2 : 1 - (zk - 0.2) / 0.8;
      drawZ(ctx, Math.round(cx - 6 + zk * 12), Math.round(y - WORM_DOME_RY - 10 - zk * 18), '#cfd8ff');
    }
    ctx.globalAlpha = 1;
  }
}
// one proglottid of the tapeworm (22 x 24; its 20 px span from x 1, the body's top at y 2): a flat ivory segment
// pinched at the joints, lit along its back, its branching uterus showing through, a genital pore (on alternate sides)
const IVORY = ['#8a7448', '#b8a46e', '#d8c898', '#ece0bc', '#f8f0d8', '#fffaf0'];
const WORM_ART = {};
function proglottidArt(side) {
  return WORM_ART['p' + side] || (WORM_ART['p' + side] = (() => {
    const A = mArt(22, 24), y0 = 2;
    A.fill(0, 0, 22, 24, (x, y) => {
      const u = x - 1; if (u < 0 || u > 20) return null;
      const pinch = Math.min(u, 20 - u), top = y0 + (pinch < 1.4 ? 0.8 : 0), bot = y0 + 15 + Math.sin(u / 20 * Math.PI) * 3 - (pinch < 3.5 ? (3.5 - pinch) * 0.4 : 0);
      if (y < top || y > bot) return null;
      const v = (y - top) / (bot - top);
      return softTone(IVORY, 1.3 - v * 2.2 - (pinch < 1.6 ? 0.7 : 0));
    });
    for (let k = 0; k < 4; k++) { const bx = 5 + k * 3.2, my = y0 + 8.2; A.line(bx, my, bx + 1.4, my - 3, IVORY[1], null, 0.4); A.line(bx, my, bx + 1.4, my + 3.4, IVORY[1], null, 0.4); }   // the uterus' branches
    A.line(4, y0 + 8.2, 17, y0 + 8.2, IVORY[1], null, 0.5);
    A.outline();
    if (side) { A.ell(11, y0 - 0.2, 1.4, 0.6, IVORY[2]); A.ell(11, y0 - 0.2, 0.5, 0.35, '#7a6030'); }
    else { A.ell(11, y0 + 17.6, 1.4, 0.6, IVORY[1]); A.ell(11, y0 + 17.6, 0.5, 0.35, '#5a4420'); }
    return A.canvas();
  })());
}
// the tapeworm's head (112 x 50; the segment's left edge at x 2, its top at y WORM_DOME_RY + 4): the neck and the bulb
function wormHeadArt() {
  return WORM_ART.head || (WORM_ART.head = (() => {
    const A = mArt(112, 50), X = 2, Y = WORM_DOME_RY + 4, cx = X + WORM_DOME_CX;
    // the neck: it leaves the last segment at the body's full depth (from x 0, so its outline falls off the canvas and the
    // joint is seamless), narrows to a slim wrinkled stalk, then swells smoothly into the underside of the bulb
    const sm = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
    A.fill(0, Y - 12, X + 30, Y + 20, (x, y) => {
      const i = x - X, mid = Y + 7.2 - 2.6 * sm(8, 26, i), half = 3.9 + 2.5 * (1 - sm(3, 12, i)) + 5.2 * sm(13, 27, i);
      const v = (y - mid) / half;
      if (Math.abs(v) > 1) return null;
      const wrinkle = i > 4 && i < 22 && Math.abs(((i + 30) % 2.6) - 1.3) < 0.22 ? 0.45 : 0;
      return softTone(IVORY, 0.85 - v * 1.15 - wrinkle);
    });
    A.fill(cx - WORM_DOME_RX - 1, Y - WORM_DOME_RY - 1, cx + WORM_DOME_RX + 1, Y + WORM_DOME_RY + 1, (x, y) => {   // the bulb
      const u = (x - cx) / WORM_DOME_RX, v = (y - Y) / WORM_DOME_RY, d = u * u + v * v;
      return d <= 1 ? softTone(IVORY, -0.4 * u - 0.9 * v + (1 - d) * 0.6 + 0.3 - (Math.abs(((x * 0.25 + 30) % 1) - 0.5) < 0.06 && v < -0.5 ? 0.4 : 0)) : null;
    });
    for (const [sx, sy, r] of [[cx - 24, Y + 4, 6], [cx - 5, Y + 3, 8], [cx + 16, Y + 5, 7]]) {   // three sucker cups: rimmed, deep
      A.soft(sx, sy, r, r - 1, ['#8a6a38', '#b08a50', '#c9a868', '#e0c890', '#fff0c0']);
      A.soft(sx + 0.4, sy + 0.6, r - 2.2, r - 3.2, ['#1e0e04', '#2a1408', '#3a2210', '#5a3a1c', '#7a5a34']);
    }
    A.outline();
    A.ell(cx - 14, Y - 15, 12, 2.4, '#ffffff', null, -0.08);
    for (const [sx, sy, r] of [[cx - 24, Y + 4, 6], [cx - 5, Y + 3, 8], [cx + 16, Y + 5, 7]]) A.ell(sx - r * 0.55, sy - r * 0.55, 1, 0.5, '#fff0c0');
    return A.canvas();
  })());
}
class Tapeworm extends TapewormSeg {
  constructor(col, row, n = 8) {
    super(null, 0, col * TILE, WORM_SEG_W, row * TILE);
    this.worm = this; this.n = n; this.t = 0;
    this.shAmp = 0; this.shX = this.x; this.seen = false;   // the shiver under his feet, and whether the head has come into view yet
    this.extra = [];
    let x = this.x + WORM_SEG_W, prev = this;
    for (let i = 1; i < n; i++) {
      const w = i === n - 1 ? WORM_HEAD_W : WORM_SEG_W, s = new TapewormSeg(this, i, x, w, row * TILE);
      prev.next = s; prev = s; this.extra.push(s); x += w;
    }
    this.head = prev;
    for (let dx = WORM_DOME_CX - WORM_DOME_RX + WORM_DOME_STEP / 2; dx < WORM_DOME_CX + WORM_DOME_RX; dx += WORM_DOME_STEP) {
      const top = this.domeTop(this.head.x + dx);
      if (top < this.y - 1) this.extra.push(new WormDome(this, this.head.x + dx - WORM_DOME_STEP / 2, Math.round(top)));
    }
  }
  // the surface of the head's dome at x (Infinity off to the sides)
  domeTop(x) {
    const u = (x - (this.head.x + WORM_DOME_CX)) / WORM_DOME_RX;
    return Math.abs(u) >= 1 ? Infinity : this.y - WORM_DOME_RY * Math.sqrt(1 - u * u);
  }
  update(g) {
    this.worm.t++; super.update(g);
    const p = g.player, hx = this.head.x;
    // it shivers around his footsteps (harder when he's moving), and settles again when he leaves it
    const on = p.state === 'play' && p.onGround && p.platform && p.platform.worm === this;
    if (on && p.platform.i < this.n - 3) { this.shAmp = Math.min(Math.abs(p.vx) > 0.2 ? 1 : 0.55, this.shAmp + 0.12); this.shX = p.x + p.w / 2; }
    else this.shAmp = Math.max(0, this.shAmp - 0.04);
    // the head comes into view: he stares at it, wide-eyed, for two seconds
    if (!this.seen && hx + WORM_HEAD_W > g.camX && hx < g.camX + VIEW_W) this.seen = true;
    // from the moment it comes into view until he's past the head (and its Zs): wide-eyed, staring ahead
    p.gaze = p.state === 'play' && this.seen && p.x + p.w / 2 < hx + WORM_HEAD_W ? 2 : 0;
    // never inside the dome: jump into its side and he's pushed back out (walking up it is the slabs' step-up)
    if (p.state === 'play') {
      const inside = () => {
        const feet = p.y + p.h, top = Math.min(this.domeTop(p.x + 1), this.domeTop(p.x + p.w / 2), this.domeTop(p.x + p.w - 1));
        return top < Infinity && feet > top + 3 && feet <= this.y + 1;
      };
      if (inside()) {
        const dir = p.x + p.w / 2 >= hx + WORM_DOME_CX ? 1 : -1;
        for (let i = 0; i < 90 && inside(); i++) p.x += dir;
        p.vx = 0;
      }
    }
  }
}

// ── the valves: gates that clench ───────────────────────────────────────────
const SPHINCTER_ART = new Map();
class Sphincter extends Enemy {
  // horizontal: the gate is a one-tile-thick ring across a shaft, its lips closing in from the left and right walls
  constructor(col, w = 2, top = 2, bottom = 10, period = 300, open = 130, offset = 0, horizontal = false) {
    super(col * TILE, top * TILE, w * TILE, (bottom - top + 1) * TILE);
    this.col = col; this.cw = w; this.top = top; this.bottom = bottom; this.period = period; this.open = open; this.f = offset;
    this.horizontal = horizontal === 'h' || horizontal === true;
    this.closed = false; this.k = 0; this.warn = false;
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  setTiles(g, solid) {
    for (let c = this.col; c < this.col + this.cw; c++) for (let r = this.top; r <= this.bottom; r++) g.level.set(c, r, solid ? T.BODY : T.EMPTY);
    this.closed = solid;
  }
  update(g) {
    this.t++; this.f++;
    const ph = this.f % this.period, wantShut = ph >= this.open, p = g.player;
    // it shuts on the beat, but never on him (or anything else in the way): it waits until the gap is clear
    const blocked = (p.state === 'play' && overlap(this, p)) || g.entities.some(e => e !== this && !e.dead && !e.remove && !(e instanceof Gastrolith) && e.hitbox && e.hitbox() && overlap(this, e.hitbox()));
    // First-spawn and checkpoint frames must obey the same occupancy rule as a normal beat.
    if (!this.started) { this.started = true; this.setTiles(g, wantShut && !blocked); this.k = this.closed ? 1 : 0; }
    if (this.closed && blocked) this.setTiles(g, false);
    if (wantShut && !this.closed && !blocked) {
      this.setTiles(g, true); if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('plop');
      for (const e of g.entities) if (e instanceof Gastrolith && !e.dead && overlap(this, e)) e.crush(g);   // (a rolling stone caught in it is crushed)
    } else if (!wantShut && this.closed) this.setTiles(g, false);
    this.warn = !this.closed && ph > this.open - 45 && ph <= this.open + 1;
    this.k += ((this.closed ? 1 : 0) - this.k) * 0.28;
    if (!this.closed && p.state === 'play' && overlap(this, p)) {
      const start=this.horizontal?this.x:this.y, span=this.horizontal?this.w:this.h;
      const lo=this.horizontal?p.x:p.y, hi=lo+(this.horizontal?p.w:p.h);
      this.k=Math.min(this.k,Math.max(0,(Math.min(lo-start,start+span-hi)-2)/(span/2)));
    }
  }
  // The valve, drawn as the real thing: two thick lips of wet mucosa. Folds fan out from the seam, fine capillaries run
  // through the pink, the rim is glossy, strings of mucus stretch between the lips as they part and sag from them when
  // they're open. Before it clenches the whole thing flushes and the veins stand out. (Drawn along an axis `a`, the way the
  // lips close, and a cross axis `b`, so the same art serves a gate across a passage and a ring across a shaft.)
  draw(ctx){
    const horiz=this.horizontal,L=horiz?this.w:this.h,W=horiz?this.h:this.w,PAD=16;
    const k=Math.round(this.k*48)/48,flush=this.warn?Math.round((1+Math.sin(this.t*.12))*2):0;
    const key=(horiz?1:0)+':'+L+':'+W+':'+k+':'+flush,cache=SPHINCTER_ART;
    const wave=b=>Math.sin(b*.34+.6)*.75+Math.sin(b*.79)*.3;
    const thickness=b=>L/2*k+wave(b)*k;
    const point=(b,a)=>horiz?[this.x+a,this.y+b]:[this.x+b,this.y+a];
    let art=cache.get(key);
    if(!art){
      const A=mArt(this.w+PAD*2,this.h+PAD*2),C=['#522039','#87344f','#b85d77','#dc96a7','#f3c7cd'];
      const local=(b,a)=>horiz?[PAD+a,PAD+b]:[PAD+b,PAD+a];
      const backing=2+(TILE-2)*k,Tbase=L/2*k;
      const bx0=horiz?0:PAD-1,by0=horiz?PAD-1:0,bx1=horiz?A.w:PAD+W+1,by1=horiz?PAD+W+1:A.h;
      // mArt.fill uses absolute end coordinates, not rectangle dimensions.
      A.fill(bx0,by0,bx1,by1,(x,y)=>{
        const a=(horiz?x:y)-PAD,b=(horiz?y:x)-PAD;
        // Split at the curved meeting line so closed lips leave no transparent slit.
        const side=a<L/2+wave(b)*k?1:-1,depth=side>0?a:L-a,T=Tbase+side*wave(b)*k;
        const q=(depth+backing)/(T+backing),edge=T-depth;
        if(q<0||q>1)return null;
        const half=W/2*(.84+.16*Math.sin(q*Math.PI))+.3,u=(b-W/2)/half;
        if(Math.abs(u)>1)return null;
        const volume=Math.sqrt(Math.max(0,1-u*u))*Math.sin(q*Math.PI*.9);
        const phase=b*.55+Math.sin(depth*.09+side)*1.2+edge*u*.13;
        const fold=Math.sin(phase),crease=Math.max(0,-fold-.42);
        const muscle=Math.sin(depth*.34+b*.14)*.07;
        let light=-.65+volume*1.55-u*.2+fold*.22-crease*.65+muscle;
        light+=(gnoise(b*.7,depth*.5)-.5)*.08;
        if(edge<.45)light=.95;else if(edge<1.1)light+=.18;
        if(fold>.86&&q>.3&&Math.sin(depth*.73+b*.31)>.35)light+=.38;
        let c=softTone(C,light);
        if(flush)c=lerpColor(c,'#cc5267',.1+flush*.025);
        return c;
      });
      // A branching venous network follows each lip's long muscle fibres.
      for(const side of [1,-1])for(let branch=0;branch<5;branch++){
        const b0=2+(branch+.5)*(W-4)/5,T=L/2*k,back=2+(TILE-2)*k;
        let previous=null;
        for(let j=0;j<=8;j++){
          const a0=-back+1+(T+back-3)*j/8;
          const b=b0+Math.sin(j*.8+branch*1.7+side)*(.6+j*.08);
          const a=side>0?a0:L-a0,p=local(b,a);
          if(previous){
            A.line(...previous,...p,'#88485f',true,.8);
            A.line(...previous,...p,branch%2?'#75506b':'#98516c',true,.34);
            if(j===3||j===6){
              const fork=local(b+(branch%2?1:-1)*2.5,a+(side>0?-1:1)*3);
              A.line(...p,...fork,'#a2627d',true,.3);
              A.line(...fork,...local(b+(branch%2?1:-1)*3.2,a+(side>0?-1:1)*5),'#aa7087',true,.3);
            }
          }
          previous=p;
        }
      }
      // Narrow pools of mucus catch the light on the raised folds.
      for(const side of [1,-1])for(let i=0;i<4;i++){
        const b=3+(i+.4)*(W-6)/4,T=L/2*k,a0=T-(2+i%2*2),p=local(b,side>0?a0:L-a0);
        A.soft(...p,horiz?1.7:.45,horiz?.45:1.7,['#d098ac','#e4b7c4','#f5d9df','#fff1ed','#fff9ef'],true,side*.15);
      }
      A.outline('#6d2943',1);
      art=A.canvas();cache.set(key,art);
    }
    ctx.save();
    // Keep the lips seated inside the opening. Backing blends into the wall while open, then
    // recedes as they close instead of growing a full tile over the surrounding painted flesh.
    const backing = 2 * (1 - k);
    ctx.beginPath(); ctx.rect(this.x - (horiz ? backing : 0), this.y - (horiz ? 0 : backing), this.w + (horiz ? backing * 2 : 0), this.h + (horiz ? 0 : backing * 2)); ctx.clip();
    ctx.drawImage(art,this.x-PAD,this.y-PAD);
    if(k>.92){
      ctx.save();ctx.lineCap='round';ctx.strokeStyle='#571c36';ctx.lineWidth=.8;ctx.beginPath();
      for(let b=1;b<=W-1;b+=1/ART_R){const [x,y]=point(b,L/2+wave(b));if(b===1)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.restore();
    }else for(let i=0;i<4;i++){
      const b=(i+1)*W/5,edge=thickness(b),gap=L-edge*2;
      const len=k>.25?gap:4+(1+Math.sin(this.t*.035+i))*2;
      if(len<=0)continue;
      const [x,y]=point(b,edge-.3),[ex,ey]=point(b+Math.sin(this.t*.025+i)*1.3,edge+len);
      ctx.save();ctx.globalAlpha=.46;ctx.strokeStyle='#ebd6cc';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+ex)/2+1.4,(y+ey)/2+1.2,ex,ey);ctx.stroke();
      fEll(ctx,ex,ey,.65,.95,'#e9dbcc');fEll(ctx,ex-.15,ey-.3,.2,.3,'#fff6e6');ctx.restore();
    }
    ctx.restore();
  }}
