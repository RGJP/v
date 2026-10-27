'use strict';
// ── Orange cat companion ────────────────────────────────────────────────────
// Murray, the orange cat. Once per stage (never in water levels or Superwing ones) a ginger kitten sits about 60% of the way
// to the goal. Touch it and it tags along: it trots behind Chickaroo and jumps when he jumps; where
// there's no room behind him (a narrow ledge, a moving platform, a wall) it perches on his head.
// When a critter comes within medium range it lunges with big claws --
// and after 4 hits (a stage's `catHits` can make it stay longer) it says goodbye like a cat would: a butt wiggle, the zoomies, then it bolts off screen.
const CAT_RANGE_X = 100, CAT_RANGE_Y = 64;     // medium range (px, from the cat)
const CAT_HITS = 4, CAT_COOL = 46;            // hits before it leaves; frames between lunges
const CAT_GRAV = 0.4, CAT_FALL = 5.5, CAT_RUN = 3.2, CAT_JUMP = 6.4;
const CAT_AIM_LEN = 18, CAT_AIM_MAX = 22, CAT_APPREHENSION = 9;   // Beebeez: her post in front of him; aimed arm; most frames she'll wait
const CAT_REACH = 18, CAT_DASH = 9;          // Beebeez: how far from the target she stops; dash speed
const CAT_WINDUP = 5, CAT_BAT_OUT = 11, CAT_BAT_REACH = 36;       // paw club: frames raised overhead, frame it lands (a 3-frame swat: cat-quick)
const CAT_ARM_UP = -Math.PI / 4, CAT_ARM_HIT = Math.PI / 4;   // arm angle (0 = straight ahead): raised 45 degrees up in front, then slammed 45 degrees down
// Beebeez vs. flyers (critters above her head): paw cocked straight up and a bit back, then swatted up-and-over onto it
const CAT_AIR_DY = 14, CAT_AIR_UP = -Math.PI / 2 - 0.6, CAT_AIR_LEN = 34, CAT_AIR_REACH = 6;   // how far above counts as air; wind-up angle; arm cap; stand-off
const CAT_RISE = 18, CAT_DIVE = 6;           // attack: frames to arc up over his head; dive speed
const CAT_BEHIND = 20;
const CAT_WIGGLE = 70, CAT_ZOOM = 96;        // the exit: butt-wiggle frames, then zoomies frames

// Side view facing right: tabby back with darker stripes, white blaze / muzzle / chest and front paws,
// pink ears and nose, gray-green eyes, and the ringed tail curling up behind.
const CAT_BODY = [
  '............K....K..',
  '...........KPK..KPK.',
  '...........KPOKKOPK.',
  '..KK.......KOoOoOoOK',
  '.KoOK.....KOOOOOOOOK',
  '.KOK......KOENOWENOK',
  'KoK.......KOOWWPWWOK',
  'KOK..KKKKKKOWWWWWWK.',
  'KoKKKOoOoOOOKWWWWK..',
  '.KOOOoOoOoOOOWWWK...',
  '..KOOoOoOOOOWWWWK...',
  '...KOOOOOOOOWWWK....',
];
const CAT_PAL = { K: INK, O: '#e5a967', o: '#b9763e', W: '#faf8ef', P: '#e4a0a0', E: '#9caa84', N: '#2a1a10' };
// Beebeez, the tortoiseshell: charcoal and mottled ginger, a mostly black face with a
// narrow ginger blaze, white chin, bib and toes, and golden eyes. Same frame as Murray.
const BEEBEEZ_BODY = [
  '............K....K..',
  '...........KPK..KPK.',
  '...........KPBKKOPK.',
  '..KK.......KBBBOBOOK',
  '.KBOK.....KBBBBOBOOK',
  '.KBK......KBENBOENOK',
  'KOK.......KBBBWPWOOK',
  'KBK..KKKKKKBBWWWWOK.',
  'KBKKKBBOOBBBKWWWWK..',
  '.KBOOBBBBOOBBWWWK...',
  '..KBBOOBWWBBBOWWK...',
  '...KOBBBWWBOOBWK....',
];
const BEEBEEZ_PAL = { K: INK, B: '#2b2d27', O: '#ce995f', o: '#a87245', W: '#faf8ef', P: '#383332', E: '#c5ad51', N: '#1a1014' };
// per cat: name, sprite, name-tab colour, what they say when picked up
const CATS = {
  murray: { name: 'MURRAY', body: CAT_BODY, pal: CAT_PAL, color: '#f39a3e', hello: 'MEOW! I PROTEC I ATTAC' },
  beebeez: { name: 'BEEBEEZ', body: BEEBEEZ_BODY, pal: BEEBEEZ_PAL, color: '#ffc46b', hello: 'MYAAAAAN!' },
};
const CAT_SPR = {};
function catSprites(kind = 'murray') {
  const { body, pal } = CATS[kind];
  if (!CAT_SPR[kind]) CAT_SPR[kind] = fineCatSprites(kind);   // (painted fine: sprites-fine.js)
  return CAT_SPR[kind];
}

class Cat {
  constructor(x, y, kind = 'murray') {
    this.kind = kind;
    this.x = x; this.y = y; this.w = 12; this.h = 12; this.vx = 0; this.vy = 0;
    this.facing = 1; this.onGround = false; this.t = 0;
    this.mode = 'ground';          // 'ground' | 'perch' | 'lunge' | 'bye'
    this.perchK = 1; this.px = 0; this.py = 0;   // hop-on-head animation (from px,py)
    this.jumpQ = -1; this.roomT = 0; this.cool = 30; this.hits = 0; this.byeT = 0;
    this.target = null; this.remove = false; this.speakerName = CATS[kind].name;
  }
  get cx() { return this.x + this.w / 2; }
  // the spot on Chickaroo's head
  headPos(p) { return { x: p.x + p.w / 2 - this.w / 2, y: p.y - this.h + 1 }; }
  floorAt(lv, col, row) { return lv.solid(col, row) || lv.get(col, row) === T.SEMI; }
  // is there open ground behind Chickaroo for the cat to stand on?
  roomBehind(g, p) {
    const lv = g.level;
    if (!p.onGround || p.platform || p.vine || p.inPod || g.wet(p.x + p.w / 2)) return false;
    const fx = p.x + p.w / 2 - p.facing * CAT_BEHIND, feet = Math.floor((p.y + p.h + 1) / TILE);
    for (const dx of [-6, 0, 6]) {
      const c = Math.floor((fx + dx) / TILE);
      if (!this.floorAt(lv, c, feet)) return false;
      for (let r = Math.floor(p.y / TILE); r < feet; r++) if (lv.solid(c, r)) return false;
    }
    return true;
  }
  perch(g) {
    const pl = g.player.platform;
    // Hop onto the rider from above the deck, even when a moving platform has
    // overtaken the cat at the shore. Starting below it puts the hop through its body.
    if (pl && this.x + this.w > pl.x && this.x < pl.x + pl.w) this.y = Math.min(this.y, pl.y - this.h);
    this.ride = null; this.onGround = false; this.target = null; this.reach = 0;
    this.mode = 'perch'; this.perchK = 0; this.px = this.x; this.py = this.y; this.vx = this.vy = 0;
  }
  update(g) {
    this.t++;
    if (this.retry > 0) this.retry--;
    if (this.cool > 0) this.cool--;
    const p = g.player, lv = g.level;
    if (this.kind === 'beebeez' && (this.mode === 'lunge' || this.mode === 'bat')) {
      this.attackT = (this.attackT || 0) + 1;
      if (this.attackT > 65 || !this.canSwat(g, this.target)) this.abandonSwat();
    } else this.attackT = 0;
    if (this.mode === 'bye') { this.leave(g); return; }
    if (p.state !== 'play') return;
    const deck = p.onGround && p.platform;
    if (this.mode !== 'perch' && deck && this.x + this.w > deck.x && this.x < deck.x + deck.w && this.y + this.h > deck.y + 1) this.perch(g);
    // a jump of Chickaroo's (leaving the ground going up) is copied a few frames later
    if (p.vy < -1 && p.wasGround && !p.onGround && this.mode === 'ground') this.jumpQ = 4;
    p.wasGround = p.onGround;

    if (this.mode !== 'lunge' && this.mode !== 'bat' && this.cool <= 0) this.seek(g);

    if (this.mode === 'perch') {
      this.perchK = Math.min(1, this.perchK + 0.12);
      const h = this.headPos(p), k = this.perchK;
      this.x = this.px + (h.x - this.px) * k;
      this.y = this.py + (h.y - this.py) * k - Math.sin(k * Math.PI) * 14;
      this.facing = p.facing;
      // hop back down once there's been room behind him for a little while
      this.roomT = this.roomBehind(g, p) ? this.roomT + 1 : 0;
      if (this.roomT > 30 && this.perchK >= 1) { this.mode = 'ground'; this.vy = -2.5; this.vx = -p.facing * 1.2; this.roomT = 0; }
      return;
    }

    if(this.mode==='lunge'&&this.kind==='murray'){this.pounce(g);return;}

    if (this.mode === 'lunge') {
      // the attack: an arc up over Chickaroo's head, then a straight diagonal dive, claws first
      const e = this.target, b = e && !e.dead && !e.remove && e.hitbox();
      this.lungeT++;
      if (this.rise) {
        const u = this.lungeT / CAT_RISE, ax = p.x + p.w / 2 - this.w / 2, ay = p.y - 44;
        this.x = this.sx0 + (ax - this.sx0) * u;
        this.y = this.sy0 + (ay - this.sy0) * (1 - (1 - u) * (1 - u));
        if (b) this.facing = Math.sign(b.x + b.w / 2 - this.cx) || this.facing;
        if (this.lungeT >= CAT_RISE) {
          this.rise = false; this.lungeT = 0;
          if (!b) { this.mode = 'ground'; this.vx = this.vy = 0; return; }
          if (this.kind === 'beebeez') { this.drop = true; this.vy = -1; }
        }
        return;
      }
      if (this.drop) {
        // Beebeez: zips out just in front of Chickaroo (or a paw's length short of the critter, if it's
        // nearer than that, or if she's given up waiting for it to come to her), then raises her paw and waits
        if (b) this.facing = Math.sign(b.x + b.w / 2 - this.cx) || this.facing;
        const near = b ? b.x + b.w / 2 + (e.vx || 0) * 3 - this.facing * (this.airborne(b) ? CAT_AIR_REACH : CAT_REACH) - this.w / 2 : this.x;
        const goal = near; // go straight to swatting distance instead of waiting at an empty post
        let step = Math.max(-CAT_DASH, Math.min(CAT_DASH, (goal - this.x) * 0.6));
        // never out over a gap: she pulls up at the brink and swipes from there (or not at all)
        let brink = false;
        while (Math.abs(step) >= 0.5 && !this.footing(g, this.cx + step)) { step *= 0.5; brink = true; }
        if (brink && Math.abs(step) < 0.5) step = 0;
        this.x += step;
        this.vy = Math.min(this.vy + CAT_GRAV, CAT_FALL);
        this.onGround = this.fall(g) === 1;
        if (this.onGround && this.t % 2 === 0 && Math.abs(step) > 1) g.spark(this.cx - this.facing * 6, this.y + this.h, '#e8d8b8', 10, -this.facing * 0.6, -0.3);
        if ((this.onGround && (Math.abs(goal - this.x) < 3 || (brink && !step))) || this.lungeT > 40) {
          this.drop = false; this.mode = b ? 'bat' : 'ground'; this.batT = 0; this.aimT = 0; this.armL = CAT_AIM_LEN;
          this.brink = brink;
        }
        if (this.y > VIEW_H + 16) { this.drop = false; this.perch(g); }
        return;
      }
      if (b) {   // home in on it a little as it moves
        const dx = b.x + b.w / 2 - this.cx, dy = b.y + b.h / 2 - (this.y + this.h / 2), n = Math.hypot(dx, dy) || 1;
        this.vx += (dx / n * CAT_DIVE - this.vx) * 0.3; this.vy += (dy / n * CAT_DIVE - this.vy) * 0.3;
        if (Math.abs(dx) > 2) this.facing = Math.sign(dx);
      } else this.vy = Math.min(this.vy + CAT_GRAV, CAT_FALL);
      this.x += this.vx;
      const landed = this.vy > 0 && this.fall(g) === 1;
      if (b && overlap(this, b)) this.strike(g, e);
      else if (landed || this.lungeT > 40 || !b) { this.mode = 'ground'; this.target = null; this.vx *= 0.4; if (landed) this.vy = 0; }
      // missed, and diving on down into a gap: bound straight back up onto his head instead
      else if (this.vy > 0 && this.y > b.y + b.h && !this.footing(g, this.cx)) { this.target = null; this.perch(g); return; }
      if (this.y > VIEW_H + 16) this.perch(g);
      return;
    }

    if (this.mode === 'bat') {
      const e=this.target,b=e&&!e.dead&&!e.remove&&e.hitbox();
      if(!b&&this.batT<=CAT_BAT_OUT){this.mode='ground';this.target=null;this.reach=0;this.cool=Math.max(this.cool,4);return;}
      const oldSh=this.shoulder(),oldA=this.armA||CAT_ARM_UP,oldL=this.reach||0;
      const previous=[oldSh.x+0.5+this.facing*Math.cos(oldA)*(oldL+3),oldSh.y+0.5+Math.sin(oldA)*(oldL+3)];
      if(b){
        this.facing=Math.sign(b.x+b.w/2-this.cx)||this.facing;
        const sh=this.shoulder(),tx=b.x+b.w/2+(e.vx||0),ty=b.y+b.h/2+(e.vy||0);
        const dx=(tx-sh.x)*this.facing,dy=ty-sh.y,d=Math.hypot(dx,dy);
        this.air=this.airborne(b);
        this.armHit=clamp(Math.atan2(dy,Math.max(0.1,dx)),-Math.PI/2,Math.PI/2);
        this.armL=clamp(d-3,5,CAT_BAT_REACH);
        if(this.batT===0){
          this.aimT++;
          // Comedic trembling paw raised in anticipation
          const shake = Math.sin(this.aimT * 2.4) * (0.06 + Math.min(0.08, this.aimT * 0.01));
          this.armA = (this.air ? CAT_AIR_UP : CAT_ARM_UP) + shake;
          this.reach = Math.min(CAT_AIM_LEN, this.aimT * 3.5);
          if(this.aimT>=CAT_APPREHENSION&&d<=CAT_BAT_REACH+6){this.batT=CAT_WINDUP;Sound.play('whoosh');}
          else if(this.aimT>=CAT_APPREHENSION&&this.air&&d<=CAT_BAT_REACH+20&&this.onGround){this.jump(Math.min(CAT_JUMP,Math.max(3,(d-CAT_BAT_REACH)/3)));this.batT=CAT_WINDUP;Sound.play('whoosh');}
          else if(this.aimT>=CAT_AIM_MAX){
            if(this.brink){this.mode='ground';this.target=null;this.reach=0;this.cool=10;}
            else{this.mode='lunge';this.drop=true;this.close=true;this.lungeT=0;this.reach=0;}
            return;
          }else{this.vy=Math.min(this.vy+CAT_GRAV,CAT_FALL);this.onGround=this.fall(g)===1;return;}
        }
      }
      const t=++this.batT,u=clamp((t-CAT_WINDUP)/(CAT_BAT_OUT-CAT_WINDUP),0,1);
      const a0=this.air?CAT_AIR_UP:CAT_ARM_UP;
      this.armA=t<=CAT_BAT_OUT?a0+(this.armHit-a0)*u*u:this.armHit;
      this.reach=t<=CAT_BAT_OUT+3?this.armL:Math.max(0,this.reach-this.armL/4);
      const sh=this.shoulder();
      // Keep the displayed paw above the floor. Contact tests use this same visible position.
      const blocked=()=>{const d=this.reach+3,x=sh.x+this.facing*Math.cos(this.armA)*d,y=sh.y+Math.sin(this.armA)*d+4;return [-3,0,3].some(dx=>this.floorAt(g.level,Math.floor((x+dx)/TILE),Math.floor(y/TILE)));};
      while(this.armA>a0&&blocked())this.armA-=0.05;
      const current=[sh.x+0.5+this.facing*Math.cos(this.armA)*(this.reach+3),sh.y+0.5+Math.sin(this.armA)*(this.reach+3)];
      // Sweep the whole visible paw between frames, with a brief follow-through window for moving foes.
      if(b&&t>=CAT_WINDUP+1&&t<=CAT_BAT_OUT+3&&this.pawTouches(b,previous,current))this.strike(g,e);
      if(this.mode==='bat'&&t>CAT_BAT_OUT+7){this.mode='ground';this.target=null;this.reach=0;this.close=this.brink=false;this.cool=Math.max(this.cool,6);}
      this.vy=Math.min(this.vy+CAT_GRAV,CAT_FALL);this.onGround=this.fall(g)===1;return;
    }

    // trotting behind him
    const tx = p.x + p.w / 2 - p.facing * CAT_BEHIND, d = tx - this.cx, far = Math.abs(this.cx - (p.x + p.w / 2));
    if (!this.roomBehind(g, p) && p.onGround) this.roomT++; else this.roomT = 0;
    if (this.roomT > 8 || far > 150 || this.y > VIEW_H + 16 || (p.onGround && this.y - p.y > 72 && this.onGround) || g.wet(this.cx)) { this.roomT = 0; this.perch(g); return; }
    const want = Math.abs(d) < 3 ? 0 : Math.sign(d) * Math.min(CAT_RUN, Math.abs(d) * 0.18 + 0.4);
    this.vx += (want - this.vx) * (this.onGround ? 0.25 : 0.12);
    if (Math.abs(this.vx) > 0.2) this.facing = Math.sign(this.vx);
    else this.facing = p.facing;
    if (this.jumpQ > 0 && --this.jumpQ === 0 && this.onGround) this.jump(Math.max(CAT_JUMP, Math.min(-p.vy * 1.25, CAT_JUMP + 1.4)));
    // never trot off a ledge into a gap, and never drop into one (after a jump, or knocked back off a
    // critter over it): hop up onto his head instead, the same smooth hop as always
    if (this.onGround && Math.abs(this.vx) > 0.2 && !this.footing(g, this.cx + this.vx + Math.sign(this.vx) * 3)) { this.perch(g); return; }
    if (!this.onGround && this.vy > 0 && !this.footing(g, this.cx)) { this.perch(g); return; }
    this.vy = Math.min(this.vy + CAT_GRAV, CAT_FALL);
    this.x += this.vx;
    this.onGround = this.fall(g) === 1;
    // he's standing well above it: hop up
    if (this.onGround && p.onGround && this.y - p.y > 20 && Math.abs(d) < 40) this.jump(CAT_JUMP);
  }
  // The exit: crouched butt wiggle (CAT_WIGGLE frames), the zoomies (dashing back and forth, the odd hop), then a
  // sprint away from Chickaroo till it's off screen. Zoomies turn at walls and ledges; the final sprint
  // bounds over obstacles and gaps, and only ends once the whole cat has left the side of the screen.
  leave(g) {
    const t = ++this.byeT, lv = g.level, p = g.player;
    if (t < CAT_WIGGLE) { this.vx = 0; this.facing = Math.sign(p.x - this.x) || 1; }
    else if (t < CAT_WIGGLE + CAT_ZOOM) {
      const z = t - CAT_WIGGLE;
      if (z === 0 || (z % 16 === 0)) { this.facing = -this.facing; Sound.play('jump'); }
      if (this.blocked(g, this.facing, 4.2)) this.facing = -this.facing;   // (a wall or a ledge: back the other way)
      this.vx = this.blocked(g, this.facing, 4.2) ? 0 : this.facing * 4.2;
      if (z % 16 === 8 && this.onGround && Math.random() < 0.5 && this.headroom(lv)) this.vy = -4;
      if (this.t % 3 === 0 && this.onGround) g.spark(this.cx - this.facing * 6, this.y + this.h, '#e8d8b8', 12, -this.facing * 0.6, -0.4);
      this.x += this.vx;
    } else {
      if (t === CAT_WIGGLE + CAT_ZOOM) {
        this.facing = this.cx < p.x + p.w / 2 ? -1 : 1;
        if (this.blocked(g, this.facing, 5.5) && !this.blocked(g, -this.facing, 5.5)) this.facing = -this.facing;
        this.exitCamX = g.camX; Sound.play('jump');
      }
      // Keep pulling ahead even if Chickaroo runs the camera along with the cat.
      const speed = 5.5 + Math.max(0, (g.camX - this.exitCamX) * this.facing);
      this.exitCamX = g.camX;
      const wall = this.blocked(g, this.facing, speed, false);
      if (wall || (this.onGround && this.blocked(g, this.facing, speed))) this.jump(CAT_JUMP);
      this.vx = wall ? 0 : this.facing * speed;
      this.x += this.vx;
      if (this.t % 3 === 0 && this.onGround) g.spark(this.cx - this.facing * 6, this.y + this.h, '#e8d8b8', 12, -this.facing * 0.6, -0.4);
      if (this.x + this.w < g.camX - 24 || this.x > g.camX + VIEW_W + 24) this.remove = true;
    }
    // A gap or a disappearing platform must never remove a cat in the middle of its exit.
    if (this.y + this.h > VIEW_H - (g.lift || 0) - 8 && this.vy >= 0) this.jump(CAT_JUMP);
    this.vy = Math.min(this.vy + CAT_GRAV, CAT_FALL);
    this.onGround = this.fall(g) === 1;
  }
  // would a step of `sp` px toward `dir` take it into a wall, or off the edge of what it's standing on?
  blocked(g, dir, sp, ledges = true) {
    const lv = g.level, lead = dir > 0 ? this.x + this.w + sp : this.x - sp, c = Math.floor(lead / TILE);
    if (!ledges && (c < 0 || c >= lv.w)) return false;   // the final sprint can leave the level's outer wall
    for (let r = Math.floor((this.y + 1) / TILE); r <= Math.floor((this.y + this.h - 1) / TILE); r++) if (lv.solid(c, r)) return true;
    if (!ledges || !this.onGround) return false;   // (mid-hop: it lands where it lands)
    if (this.ride) return lead < this.ride.x || lead > this.ride.x + this.ride.w;
    const r = Math.floor((this.y + this.h + 1) / TILE);
    return ![0, 1, 2].some(k => this.floorAt(lv, c, r + k));   // (a step or two down is fine: a real drop isn't)
  }
  headroom(lv) {
    const r = Math.floor((this.y - 22) / TILE);
    for (let c = Math.floor(this.x / TILE); c <= Math.floor((this.x + this.w - 1) / TILE); c++) if (lv.solid(c, r) || lv.solid(c, r + 1)) return false;
    return true;
  }
  // Murray clips through everything: no walls or ceilings, he only lands on things from above
  // (tile tops, semisolids, moving platforms, which then carry him). Returns 1 when standing.
  fall(g) {
    const lv = g.level, prev = this.y + this.h;
    if (this.ride && !this.ride.ghost && this.onGround && this.vy >= 0 && Math.abs(prev - this.ride.prevY) <= 1 && g.platforms.includes(this.ride) && this.cx > this.ride.x && this.cx < this.ride.x + this.ride.w) {
      this.x += this.ride.dx || 0; this.y = this.ride.y - this.h; this.vy = 0; return 1;
    }
    this.ride = null;
    this.y += this.vy;
    if (this.vy < 0) return 0;
    const bot = this.y + this.h;
    for (const pl of g.platforms) {
      if (!pl.ghost && pl.w && this.cx > pl.x && this.cx < pl.x + pl.w && prev <= Math.max(pl.y, pl.prevY) + 1 && bot >= pl.y) { this.y = pl.y - this.h; this.vy = 0; this.ride = pl; return 1; }
    }
    const r = Math.floor(bot / TILE), c0 = Math.floor((this.x + 2) / TILE), c1 = Math.floor((this.x + this.w - 2) / TILE);
    if (prev <= r * TILE + 0.5) for (let c = c0; c <= c1; c++) {
      if (this.floorAt(lv, c, r) && (this.onGround || !lv.solid(c, r - 1))) {   // walking through a wall keeps him on the floor; falling, he skips tops buried in rock
        this.y = r * TILE - this.h; this.vy = 0; return 1; }
    }
    return 0;
  }
  jump(v) { this.vy = -v; this.onGround = false; this.ride = null; this.jumpQ = -1; }
  // is there something to land on below x (a floor tile anywhere under her feet, or a moving platform)?
  footing(g, x) {
    const lv = g.level, c = Math.floor(x / TILE);
    for (let r = Math.max(0, Math.floor((this.y + this.h - 1) / TILE)); r < ROWS; r++) if (this.floorAt(lv, c, r)) return true;
    return g.platforms.some(pl => pl.w && x > pl.x && x < pl.x + pl.w && pl.y >= this.y + this.h - 2);
  }
  // look for a critter in medium range and lunge at it
  canSwat(g, e) {
    const b = e && !e.dead && !e.remove && !e.friendly && e.hitbox();
    if (!b || this.missed === e && this.retry > 0) return false;
    const sh = this.shoulder(), baseY = this.onGround ? sh.y : (this.swatBaseY ?? sh.y);
    const dx = Math.max(0, Math.abs(b.x + b.w / 2 - sh.x) - b.w / 2);
    // The swat can initiate its hop only within twenty pixels of arm's reach. Use that
    // actual attack envelope, rather than assuming she will make her full ordinary jump.
    const dy = Math.max(0, baseY - (b.y + b.h / 2) - 20);
    if (Math.hypot(Math.min(dx, CAT_AIR_REACH), dy) > CAT_BAT_REACH) return false;
    // A ceiling between her and the flyer prevents the jump even if raw reach would be enough.
    if (b.y + b.h < sh.y - CAT_BAT_REACH) {
      for (let y = this.y - 2; y > b.y + b.h + CAT_BAT_REACH - 5; y -= 4)
        if (g.level.solid(Math.floor(this.cx / TILE), Math.floor(y / TILE))) return false;
    }
    return true;
  }
  abandonSwat() {
    this.missed = this.target; this.retry = 120;
    this.mode = 'ground'; this.target = null; this.reach = 0; this.drop = this.close = false; this.cool = 30;
  }
  seek(g) {
    if(this.kind==='murray'){this.seekPounce(g);return;}
    let best = null, bd = 1e9;
    for (const e of g.entities) {
      if (e.dead || e.remove || e.passive || e.friendly || e instanceof Dart || !(e.fireKill || e.fireHit || e.catHit)) continue;   // arrows are hazards to dodge, not prey (catHit: prey only a cat can take on)
      if (!this.canSwat(g, e)) continue;
      const b = e.hitbox();
      if (!b || b.x + b.w < g.camX || b.x > g.camX + VIEW_W) continue;
      const dx = b.x + b.w / 2 - this.cx, dy = b.y + b.h / 2 - (this.y + this.h / 2);
      if (Math.abs(dx) > CAT_RANGE_X || Math.abs(dy) > CAT_RANGE_Y) continue;
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = e; }
    }
    if (!best) return;
    this.swatBaseY = this.shoulder().y;
    const b = best.hitbox(), dx = b.x + b.w / 2 - this.cx, dy = b.y + b.h / 2 - (this.y + this.h / 2);
    if (this.mode === 'perch') { this.x = this.headPos(g.player).x; this.y = this.headPos(g.player).y; }
    this.mode = 'lunge'; this.lungeT = 0; this.target = best; this.facing = Math.sign(dx) || 1;
    this.rise = this.kind !== 'beebeez'; this.sx0 = this.x; this.sy0 = this.y; this.vx = this.vy = 0;
    if (!this.rise) { this.drop = true; this.close = false; this.vy = this.onGround ? 0 : -2; }   // Beebeez skips the big arc
    Sound.play('jump');
  }
  // Murray only launches from stable footing, toward a point his ordinary jump can actually reach.
  seekPounce(g) {
    const perched=this.mode==='perch'&&this.perchK>=1&&(g.player.onGround||g.player.platform);
    if(this.mode==='perch'?!perched:!this.onGround)return;
    let best=null,plan=null,score=Infinity;
    for(const e of g.entities){
      if(e.dead||e.remove||e.passive||e.friendly||e.bossHazard||e instanceof Dart||!(e.fireKill||e.fireHit||e.catHit))continue;
      const b=e.hitbox();if(!b||b.x+b.w<g.camX||b.x>g.camX+VIEW_W)continue;
      const dx=b.x+b.w/2-this.cx,dy=b.y+b.h/2-(this.y+this.h/2);
      if(Math.abs(dx)>88||dy<-43||dy>38)continue;
      const vy=dy<-12?-CAT_JUMP:-3.8,disc=vy*vy+2*CAT_GRAV*dy;
      if(disc<0)continue;
      const time=(-vy+Math.sqrt(disc))/CAT_GRAV;if(time<5||time>33)continue;
      const vx=(dx+(e.vx||0)*time)/time;if(Math.abs(vx)>4.6)continue;
      if(!this.footing(g,this.cx+vx*(time+4)))continue;
      let clear=true;
      for(let t=2;t<time;t+=2){
        const x=this.x+vx*t,y=this.y+vy*t+CAT_GRAV*t*(t+1)/2;
        for(const xx of [x+2,x+this.w-2])for(const yy of [y+2,y+this.h-2])if(g.level.solid(Math.floor(xx/TILE),Math.floor(yy/TILE)))clear=false;
        if(!clear)break;
      }
      const dd=dx*dx+dy*dy;if(clear&&dd<score){best=e;plan={vx,vy,time};score=dd;}
    }
    if(!best)return;
    this.mode='lunge';this.target=best;this.lungeT=0;this.rise=this.drop=false;this.onGround=false;this.ride=null;this.jumpQ=-1;
    this.vx=plan.vx;this.vy=plan.vy;this.pounceFor=Math.ceil(plan.time)+8;this.facing=Math.sign(plan.vx)||this.facing;
    Sound.play('jump');
  }
  pounce(g) {
    const e=this.target,b=e&&!e.dead&&!e.remove&&e.hitbox();this.lungeT++;
    // A committed ballistic leap: no vertical homing, hovering or teleporting after a moving bird.
    this.vy=Math.min(this.vy+CAT_GRAV,CAT_FALL);this.x+=this.vx;
    const landed=this.fall(g)===1;this.onGround=landed;
    if(b&&overlap(this,b)){if(this.strike(g,e))return;}
    if(landed||this.lungeT>this.pounceFor){this.mode='ground';this.target=null;this.cool=Math.max(this.cool,18);if(landed)this.vx*=0.35;}
    if(this.y>VIEW_H+16)this.perch(g);
  }
  // Segment versus the target's live hitbox expanded by the visible paw radius.
  pawTouches(b,from,to) {
    let lo=0,hi=1;
    for(const [axis,start,end] of [[0,b.x-4.2,b.x+b.w+4.2],[1,b.y-4.2,b.y+b.h+4.2]]){
      const delta=to[axis]-from[axis];
      if(Math.abs(delta)<1e-6){if(from[axis]<start||from[axis]>end)return false;continue;}
      let a=(start-from[axis])/delta,z=(end-from[axis])/delta;if(a>z)[a,z]=[z,a];
      lo=Math.max(lo,a);hi=Math.min(hi,z);if(lo>hi)return false;
    }
    return true;
  }
  strike(g,e) {
    if (e && e.friendly) return false;
    const b=e&&!e.dead&&!e.remove&&e.hitbox();if(!b)return false;
    const dir=this.facing,bat=this.kind==='beebeez',hp=typeof e.hp==='number'?e.hp:null;
    let accepted;
    if(e.catHit)accepted=e.catHit(g);
    else if(e.fireHit)accepted=e.fireHit(g,CHILI_DMG[0]);
    else{e.flipKill(g,dir);g.addScore(200,e.cx,e.y);}
    // An invulnerable target did not take the hit: no fake impact or wasted companion charge.
    if(accepted===false||(hp!=null&&e.hp===hp&&!e.dead&&!e.remove))return false;
    if(bat)g.fireballs.push(new CatBop(b.x+b.w/2,b.y+b.h/2));
    else g.fireballs.push(new CatClaw(b.x+b.w/2,b.y+b.h/2,dir));
    Sound.play('kick');this.hits++;this.cool=bat?28:CAT_COOL;this.target=null;
    if(!bat){this.mode='ground';this.vx*=0.5;this.vy=Math.max(this.vy,-1.5);}
    if(this.hits>=(g.level.def.catHits||CAT_HITS)){this.mode='bye';this.reach=0;this.vx=this.vy=0;}
    return true;
  }
  draw(ctx, g) {
    const S = catSprites(this.kind);
    if (this.mode === 'lunge' && !this.drop) {   // stretched out, tilted along the dive
      const a = this.rise ? -0.35 + this.lungeT / CAT_RISE * 0.35 : Math.atan2(this.vy, Math.abs(this.vx) + 0.01);
      ctx.save(); ctx.translate(Math.round(this.cx), Math.round(this.y + this.h / 2));
      ctx.scale(this.facing, 1); ctx.rotate(a);
      ctx.drawImage(S.leap, -S.leap.width / 2, -S.leap.height / 2); ctx.restore();
      return;
    }
    let img = S.sit;
    if (this.mode === 'bye' && this.byeT < CAT_WIGGLE) {
      // crouched to pounce, rear end up and wiggling: drawn a 1px column at a time, each column lifted
      // a little more towards the tail, so the body bends in one piece (neighbours differ by at most 1px)
      const W = img.width, H = img.height, f = this.facing, bx = Math.round(this.cx), by = Math.round(this.y + this.h);
      const lift = this.byeT > 12 ? 2 + Math.sin(this.byeT * 0.9) * 1.5 : 2, bend = 11;
      ctx.save(); ctx.translate(bx, by); ctx.scale(f, 1);
      for (let c = 0; c < W; c++) ctx.drawImage(img, c, 0, 1, H, c - W / 2, -H - Math.round(lift * Math.max(0, bend - c) / bend), 1, H);
      ctx.restore();
      return;
    }
    if (this.mode === 'lunge') img = S.leap;
    else if (this.mode === 'bye') img = !this.onGround ? S.leap : S.walk[(this.t >> 1) % 4];
    else if (this.mode === 'ground' && !this.onGround) img = S.leap;
    else if (this.mode === 'ground' && Math.abs(this.vx) > 0.3) img = S.walk[(this.t / Math.max(3, 9 - Math.abs(this.vx) * 2) | 0) % 4];
    const paw = this.mode === 'bat' && this.reach > 1;
    drawSprite(ctx, img, this.cx, this.y + this.h, this.facing < 0);
    if (paw) this.drawPaw(ctx);
  }
  // a critter well above her head (a flyer, or one up on a ledge) gets the overhead swat instead of the slam
  airborne(b) { return b.y + b.h / 2 < this.shoulder().y - CAT_AIR_DY; }
  // Beebeez's stretchy arm: black with a ginger stripe, from her chest out to a big white paw
  shoulder() { return { x: this.cx + this.facing * 5, y: this.y + 4 }; }
  // stroked along the arm's angle in fine pixels (outline, then fur, then the ginger stripe: hires.js)
  drawPaw(ctx) {
    const f = this.facing, sh = this.shoulder(), L = this.reach, a = this.armA, cx = Math.cos(a) * f, sy = Math.sin(a);
    const pt = s => [sh.x + 0.5 + cx * s, sh.y + 0.5 + sy * s], seg = (s0, s1, wd, col) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(...pt(s0)); ctx.lineTo(...pt(s1)); ctx.stroke(); };
    ctx.save();ctx.lineCap = 'round';
    seg(0, L, 3, INK); seg(0, L, 1.6, BEEBEEZ_PAL.B); seg(L * 0.35, L * 0.7, 1.6, BEEBEEZ_PAL.O);
    const [px, py] = pt(L + 3);
    // Trembling comedic paw during apprehension
    const quiver = (this.mode === 'bat' && this.batT === 0 && this.aimT > 2) ? Math.sin(this.aimT * 3.2) * 1.3 : 0;
    // Only rotate within the screen plane: the pads keep facing the viewer on either side.
    // The sprite's upward-pointing toes align with the arm's outward direction, never its wrist.
    ctx.translate(px + quiver, py - Math.abs(quiver) * 0.4);
    ctx.rotate(Math.atan2(sy, cx) + Math.PI / 2 + quiver * 0.08);
    ctx.drawImage(beebeezPawArt(), -5, -5);
    ctx.restore();
  }
}

// Beebeez's bop: a cartoon impact star (no lettering: the sound says it all).
class CatBop {
  constructor(x, y) { this.x = x; this.y = y; this.t = 0; this.remove = false; }
  update() { if (++this.t > 22) this.remove = true; }
  draw(ctx) {
    const x = this.x + 0.5, y = this.y + 0.5, k = Math.min(1, this.t / 3), n = 7 * k;   // (fine strokes: hires.js)
    ctx.globalAlpha = this.t < 14 ? 1 : 1 - (this.t - 14) / 9; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {   // star rays
      const a = i * Math.PI / 4, len = i % 2 ? n - 2 : n, c = Math.cos(a), sn = Math.sin(a);
      if (len <= 2.4) continue;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = i % 2 ? 0.8 : 1.1; ctx.beginPath(); ctx.moveTo(x + c * 2, y + sn * 2); ctx.lineTo(x + c * len, y + sn * len); ctx.stroke();
      fBlob(ctx, x + c * len, y + sn * len, 0.6, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }
}

// The scratch: three big claw slashes raking across the target, then fading.
class CatClaw {
  constructor(x, y, dir) { this.x = x; this.y = y; this.dir = dir; this.t = 0; this.remove = false; }
  update() { if (++this.t > 16) this.remove = true; }
  draw(ctx) {
    const grow = Math.min(1, this.t / 4), L = 14 * grow;   // about Murray's own height
    if (L < 1) return;
    ctx.globalAlpha = this.t < 10 ? 1 : 1 - (this.t - 10) / 7;
    for (let i = -1; i <= 1; i++) {   // each slash a tapered crescent, sharp at both ends (fine: hires.js)
      const x0 = this.x - this.dir * 4 + i * 4 + 0.5, y0 = this.y - 7, slash = (wd, col) => {
        const pts = [];
        for (let k = 0; k <= 12; k++) { const u = k / 12, bow = Math.sin(u * Math.PI) * 1.2, w = Math.sin(u * Math.PI) * wd; pts.push([x0 + this.dir * (u * L * 0.55 - bow) - w, y0 + u * L]); }
        for (let k = 12; k >= 0; k--) { const u = k / 12, bow = Math.sin(u * Math.PI) * 1.2, w = Math.sin(u * Math.PI) * wd; pts.push([x0 + this.dir * (u * L * 0.55 - bow) + w, y0 + u * L]); }
        ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.fill();
      };
      slash(2.2, '#c4621c'); slash(1.1, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }
}

// The kitten waiting along the way, with a small softly bobbing heart above it.
class CatPickup {
  constructor(x, y, kind) { this.x = x; this.y = y; this.w = 14; this.h = 14; this.t = 0; this.kind = kind; }
  draw(ctx) {
    this.t++;
    drawSprite(ctx, catSprites(this.kind).sit, this.x + 7, this.y + this.h, true);
    drawSprite(ctx, catHeartArt(), this.x + 7, this.y - 7 + fSnap(Math.sin(this.t * 0.06) * 0.7));
  }
}

class GameCat {
  // a level may list its own `cats: [col | [col, kind], ...]` (the power-up lab does, for testing), or name its cat
  // (`catKind`) and give Chickaroo a line on finding it (`catLine`);
  // otherwise one cat, Murray or Beebeez (picked when the stage is first entered), sits on the nearest
  // solid ground to the 60% mark (or to column `catAt`, if the level gives one) -- every stage, underwater ones too
  placeCat() {
    const lv = this.level, def = lv.def;
    this.cat = null; this.catPickups = []; this.catIntro = null;
    if (this.catLevel !== def.id) { this.catTaken = false; this.catLevel = def.id; this.catKind = def.catKind || oneOf(Object.keys(CATS)); }
    const spot = (c, kind = this.catKind) => {
      if (c < 1 || c >= lv.w - 1) return false;
      // the lowest floor with headroom (so a block hanging overhead doesn't count as the floor)
      let r = ROWS;
      for (let y = ROWS - 1; y >= 2; y--) if (lv.solid(c, y) && !lv.solid(c, y - 1) && !lv.solid(c, y - 2)) { r = y; break; }
      if (r >= ROWS || !lv.solid(c + 1, r)) return false;
      this.catPickups.push(new CatPickup(c * TILE + 1, r * TILE - 14, kind));
      return true;
    };
    if (def.cats) { def.cats.forEach(c => Array.isArray(c) ? spot(c[0], c[1]) : spot(c)); return; }
    if (this.catTaken) return;
    if (Array.isArray(def.catAt)) {   // an exact perch: sitting on top of the tile at [col, row] (a row of blocks, say)
      if (this.catTaken) return;
      const [c, r] = def.catAt;
      this.catPickups.push(new CatPickup(c * TILE + 1, r * TILE - 14, this.catKind));
      return;
    }
    const end = def.goal ? def.goal.x : lv.w - 4, c0 = def.catAt ?? Math.round(def.start + (end - def.start) * 0.6);
    for (let i = 0; i < 120; i++) if (spot(c0 + i) || spot(c0 - i)) return;   // nearest solid ground to the 60% mark
  }
  updateCat() {
    const p = this.player;
    for (const k of this.catPickups) if (p.state === 'play' && overlap(k, p)) {
      k.remove = true; this.catTaken = true;
      this.cat = new Cat(k.x, k.y + 2, k.kind);   // a fresh cat (in the lab, replacing the one along)
      // The reunion waits for a proper landing; the cat's greeting waits behind Chickaroo's line.
      if (this.level.def.catLine && !this.hushed()) this.catIntro = { cat: this.cat, text: this.level.def.catLine };
      else this.speak(this.cat, CATS[k.kind].hello, CATS[k.kind].color);
      Sound.play('power');
      this.burst(k.x + 7, k.y + 7, ['#f39a3e', '#ffffff', '#ff9aa8'], 12);
    }
    this.catPickups = this.catPickups.filter(k => !k.remove);
    if (this.catIntro && p.state === 'play' && p.onGround && p.vy === 0 && !p.vine && !p.inPod && !(this.dialog && this.dialog.hold)) {
      const { cat, text } = this.catIntro;
      this.catIntro = null;
      if (cat === this.cat) {
        const waiting = [this.dialog, ...(this.dialogQ || [])].filter(d => d && d.speaker !== cat && d.speaker !== CHICK_VOICE);
        this.dialog = null; this.dialogQ = [];
        this.speak(CHICK_VOICE, text, '#ffd166', true);
        this.dialog.background = 'rgba(11,9,24,1)'; this.dialog.catIntro = cat;
        this.speak(cat, CATS[cat.kind].hello, CATS[cat.kind].color);
        this.dialogQ.forEach(d => { d.catIntro = cat; });
        this.dialogQ.push(...waiting.slice(0, 5 - this.dialogQ.length));
      }
    }
    if (this.cat) { this.cat.update(this); if (this.cat.remove) this.cat = null; }
  }
  // Chickaroo died: the cat (and anything it was saying) is gone at once
  dropCat() {
    const c = this.cat;
    this.catIntro = null;
    if (!c) return;
    this.cat = null;
    if (this.dialog && (this.dialog.speaker === c || this.dialog.catIntro === c)) this.dialog = null;
    this.dialogQ = (this.dialogQ || []).filter(l => l.speaker !== c && l.catIntro !== c);
    if (!this.dialog && this.dialogQ.length) this.dialog = this.dialogQ.shift();
  }
  drawCat(ctx) {
    if (this.mode === 'clear' && this.level.def.goal.type === 'exit' && !this.level.def.goal.finale) return;
    if (this.band && this.band.finale) { this.drawBayouPartyCats(ctx); return; }
    const c = this.cat, p = this.player;
    if (p && p.state === 'dead') return;   // (nothing cat-shaped on screen while he's down, waiting kittens included)
    for (const k of this.catPickups) k.draw(ctx);
    if (c && !(c.mode === 'perch' && (p.hidden || p.inPod))) c.draw(ctx, this);
  }
}
mixin(Game, GameCat);
