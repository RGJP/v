'use strict';
// ── Sunscorch Dunes (3-1) set pieces ────────────────────────────────────────
// DJINNY the genie and his not-quite-right wishes (Lamp: a fridge that freezes the quicksand, a
// flying carpet), HUMPHREY the camel (a ride across the marsh: duck the low arches, he spits at
// critters), GRUBBLE the sandworm (a chase that ends at a very big cactus), GRAMPS in the teapot,
// and signposts with something to say.

// ── Signpost: a weathered board on a post; '|' starts a new line; `lift` px more post raises the board
// (clear of whatever stands in front of it) ───────────
class Signpost extends Enemy {
  constructor(col, text, row = 11, lift = 0, post = true) {
    super(col * TILE, (row + 1) * TILE - 30, 16, 30);
    this.lift = lift; this.post = post;   // (no post: just the board, sitting on whatever's under it -- a roof, say)
    this.lines = String(text).toUpperCase().split('|');
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  draw(ctx) {
    const cx = Math.round(this.x + 8), bot = Math.round(this.y + this.h);
    const w = Math.max(...this.lines.map(l => textWidth(l, 'small'))) + 6, h = this.lines.length * 7 + 4, top = bot - 14 - this.lift - h;
    if (this.post) inked(ctx, [[cx - 1, top + h - 2, 3, bot - top - h + 2, '#8a5a32']]);   // the post
    inked(ctx, [[cx - w / 2, top, w, h, '#d9a866']]);                                   // the board
    inkBox(ctx, cx - w / 2, top, w, 1, '#f0c890'); inkBox(ctx, cx - w / 2, top + h - 1, w, 1, '#a8743c');
    inkBox(ctx, cx - w / 2 + 1, top + 2, 1, 1, '#6a4422'); inkBox(ctx, cx + w / 2 - 2, top + 2, 1, 1, '#6a4422');   // nails
    this.lines.forEach((l, i) => drawText(ctx, l, cx, top + 3 + i * 7, '#5a3418', { small: true, align: 'center' }));
  }
}

// ── Lamp: rub it (touch it) and out comes DJINNY, who grants a wish -- not quite the one you wanted ──
// ['lamp', x, row, 'fridge', fridgeCol, lakeX0, lakeX1]   a fridge falls by the lake and freezes it
// ['lamp', x, row, 'carpet', carpetCol, carpetRow, endCol, landRow]   a magic carpet to fly away on
// ['lamp', x, row, 'teapot']   not a lamp at all: GRAMPS lives in there, and he'd like some sleep
// A wish already granted this visit isn't granted twice: back after a death, it's simply waiting.
const LAMP_LINES = {
  fridge: [
    ['say', "I'M DJINNY, THE GENIE, NOT A MEANIE, JUST A GENIE. ONE WISH! ANY WISH!"],
    ['say', 'I CAN READ YOUR FUTURE MIND... A BRIDGE? SAY NO MORE!', 'do'],
    ['say', '...WAIT. DID YOU SAY BRIDGE?'],
    ['say', 'IT IS A FRIDGE. CLOSE ENOUGH!'],
    ['bye'],
  ],
  carpet: [
    ['say', 'YOU AGAIN?! OK, OK. ONE MORE WISH.'],
    ['say', 'YOU WANT TO FLY? AT LAST, AN EASY ONE!', 'do'],
    ['say', 'ONE MAGIC CARPET. IT IS A RENTAL - NO SCRATCHES!'],
    ['bye'],
  ],
  farewell: [
    ['say', "Now for the third wish...I'm tired...so it's my turn to wish...you...goodbye and good luck."],
    ['do'],
    ['wait', 30],
    ['sleep'],
  ],
  teapot: [   // (both lines wait for a press; only then the 1-UP, and he sinks back into his pot to sleep)
    ['say', "AH! I WAS TRYING TO SLEEP! I'M NOT A GENIE, LEAVE ME ALONE!", 'hold'],
    ['say', 'TAKE THIS AND SCRAM.', 'hold'],
    ['do'],
    ['wait', 30],
    ['sleep'],
  ],
};
const LAMP_AGAIN = { fridge: 'BACK SO SOON? THE FRIDGE IS RIGHT THERE.', carpet: 'THE CARPET IS STILL WAITING. GO ON!', farewell: 'FAREWELL, SEE YA!', teapot: 'SHOO!' };
class Lamp extends Enemy {
  constructor(d) {
    const [, col, row = 11, wish] = d;
    super(col * TILE, (row + 1) * TILE - 10, 16, 10);
    this.d = d; this.wish = wish; this.col = col; this.row = row;
    this.passive = this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.state = 'idle'; this.step = 0; this.wait = 0; this.waitSay = 0; this.rise = 0;
    this.speakerName = wish === 'teapot' ? 'GRAMPS' : 'DJINNY';
  }
  get key() { return this.wish + this.col; }
  // where the 'who's talking' marker goes: over whoever came out of the lamp, not on the lamp
  get talkY() { return this.wish === 'teapot' ? this.y - 18 - Math.round(10 * this.rise) : this.y - 25 - Math.round(42 * this.rise); }
  hitbox() { return null; }
  // Start the encounter farther left so Chickaroo leaves room to see DJINNY or GRAMPS.
  touches(p) { return this.state === 'idle' && overlap({ x: this.x - 26, y: this.y - 6, w: this.w + 28, h: this.h + 6 }, p); }
  onTouch(g) {
    if (g.wishLevel !== g.level.def.id) { g.wishes = new Set(); g.wishLevel = g.level.def.id; }
    Sound.play('whoosh');
    g.burst(this.x + 8, this.y, ['#ffffff', '#c9b8ff', '#8fd8ff'], 14);
    if (g.wishes.has(this.key)) { this.grant(g, true); this.state = 'gone'; g.speak(this, LAMP_AGAIN[this.wish], this.color(), true); return; }
    // Let DJINNY rise fully before opening dialogue; the short reveal is held in place by the game.
    this.state = 'show'; this.step = 0; this.wait = 25; this.t = 0; this.rise = 0;
    g.lampReveal = this;
    if (this.wish === 'teapot') { this.step = 1; this.wait = 10; g.speak(this, LAMP_LINES[this.wish][0][1], this.color(), true); }
  }
  color() { return this.wish === 'teapot' ? '#ffd0a0' : '#b8a8ff'; }
  update(g) {
    this.t++;
    if (this.state === 'show' || this.state === 'bye') this.rise = Math.min(1, this.rise + 0.04);
    if (this.state === 'bye') { if ((this.byeT = (this.byeT || 0) + 1) > 20) this.state = 'gone'; return; }
    if (this.state === 'back') {
      this.rise = Math.max(0, this.rise - 0.03);
      if (!this.rise) { this.state = 'asleep'; this.sleepT = 0; }
      return;
    }
    if (this.state === 'asleep') { this.sleepT++; return; }
    if (this.state !== 'show') return;
    if (this.t % 4 === 0) g.particles.push({ kind: 'px', x: this.spoutX() + rand(-2, 2), y: this.y - 2, vx: rand(-0.3, 0.3), vy: rand(-1, -0.4), drag: 0.96, life: 30, t: 0, color: this.wish === 'teapot' ? '#f4f4f4' : '#c9b8ff', size: 2 });
    if (this.wait > 0) { this.wait--; return; }
    if (g.saying(this) && this.waitSay++ < 500) return;   // let each line finish
    const s = LAMP_LINES[this.wish][this.step++];
    this.waitSay = 0;
    if (!s) { this.state = 'gone'; return; }
    if (s[0] === 'say') { g.speak(this, s[1], this.color(), true); this.wait = 10; if (s[2] === 'do') this.doWish(g); }
    else if (s[0] === 'wait') this.wait = s[1];
    else if (s[0] === 'do') { this.doWish(g); this.wait = 20; }
    else if (s[0] === 'sleep') { this.state = 'back'; Sound.play('snooze'); }   // settle back into the lamp or teapot
    else if (s[0] === 'bye') {
      this.state = 'bye'; this.byeT = 0; Sound.play('pop');
      g.burst(this.x + 8, this.y - 26, ['#ffffff', '#c9b8ff', '#8fd8ff'], 16);
    }
  }
  doWish(g) { (g.wishes || (g.wishes = new Set())).add(this.key); this.grant(g, false); }
  spoutX() { return this.x + (this.wish === 'teapot' ? 13 : 15); }
  grant(g, again) {
    const d = this.d;
    if (this.wish === 'fridge') g.entities.push(new Fridge(d[4], d[5], d[6], again));
    else if (this.wish === 'carpet') {
      if (!g.platforms.some(pl => pl instanceof Carpet)) g.platforms.push(new Carpet(d[4], d[5], d[6], d[7], again));
    } else if (this.wish === 'teapot' && !again) {
      g.items.push(new Item('oneup', this.col, this.row - 1, false));
      Sound.play('appear');
    }
  }
  draw(ctx, g) {
    const x = Math.round(this.x), y = Math.round(this.y), sh = this.state === 'idle' ? Math.round(Math.sin(this.t * 0.4) * (this.t % 120 < 12 ? 1 : 0)) : 0;
    if (this.wish === 'teapot') this.drawTeapot(ctx, x + sh, y); else this.drawLamp(ctx, x + sh, y);
    // the idle lamp glints now and then, inviting a rub
    if(this.state==='idle'&&this.t%90<8)umbraSpark(ctx,x+5,y+2,1.6,'#fff6dd');
    if (this.state === 'asleep' && this.sleepT >= 18) {   // fully inside, then 0.3 seconds of quiet before the Z's
      for (let i = 0; i < 3; i++) {
        const k = ((this.t + i * 40) % 120) / 120, zx = this.spoutX() + 2 + Math.round(k * 8 + Math.sin(k * 6) * 2), zy = this.y - 4 - Math.round(k * 20);
        ctx.globalAlpha = Math.min(1, (1 - k) * 2); drawZ(ctx, zx, zy, '#e8e0ff', 5); ctx.globalAlpha = 1;
      }
    }
    if ((this.state === 'show' || this.state === 'bye' || this.state === 'back') && this.rise > 0) {
      ctx.globalAlpha = this.state === 'bye' ? Math.max(0, 1 - this.byeT / 20) : 1;
      if (this.wish === 'teapot') this.drawGramps(ctx, x, y);
      else {
        this.drawGenie(ctx, x, y, this.rise, g.player);
      }
      ctx.globalAlpha = 1;
    }
  }
  drawLamp(ctx, x, y) {
    ctx.drawImage(duneLampArt(false),x-4,y-4);
  }
  drawTeapot(ctx, x, y) {
    ctx.drawImage(duneLampArt(true),x-4,y-4);
  }
  // DJINNY: a wisp of smoke out of the spout curling up into a big blue genie: round head under a
  // red turban with a gold jewel, curly moustache and a grin, broad shoulders, arms folded, bobbing on the air
  drawGenie(ctx, x, y, k = this.rise, target = null) {
    const sx=this.spoutX(),cx=x+6,top=y-12-42*k,phase=this.state==='show'&&k>=1?25:this.t;
    ctx.save();ctx.lineCap='round';
    const path=()=>{ctx.beginPath();ctx.moveTo(sx,y-1);ctx.bezierCurveTo(sx+Math.sin(phase*0.1)*5,y-12,cx-7,top+29,cx,top+22);};
    for(const [width,col,a] of [[7,'#4c6197',0.75],[4.6,'#819ed2',0.8],[1.6,'#d0e1ec',0.7]]){ctx.save();ctx.globalAlpha*=a;path();ctx.strokeStyle=col;ctx.lineWidth=width;ctx.stroke();ctx.restore();}
    if(k<1){for(let i=0;i<7;i++){const u=i/6;fGlow(ctx,sx+Math.sin(phase*0.15+i)*u*9,y-u*(22+25*k),5+u*6,'#b6ace0',Math.sin(k*Math.PI)*0.3);}}
    if(k>0.25){const reveal=clamp((k-0.25)/0.75,0,1);ctx.globalAlpha*=reveal;ctx.translate(cx,top+22);ctx.scale(0.4+reveal*0.6,0.3+reveal*0.7);ctx.drawImage(duneGenieArt(target&&target.x+target.w/2<cx?-1:1),-18,-35);}
    ctx.restore();
  }
  // GRAMPS: a tiny old scorpion in a striped nightcap, peering out from under the lid
  drawGramps(ctx, x, y) {
    const k = this.rise, top = y - 2 - Math.round(10 * k), cx = x + 8;
    inked(ctx, [[cx - 5, top + 2, 10, 6, '#c86a3a']]);
    inked(ctx, [[cx - 4, top - 3, 8, 4, '#ffffff'], [cx + 3, top - 5, 3, 3, '#e8463a']]);
    inkBox(ctx, cx - 4, top - 2, 8, 1, '#e8463a');
    inkBox(ctx, cx - 3, top + 4, 2, 1, INK); inkBox(ctx, cx + 1, top + 4, 2, 1, INK);   // squinting, sleepy eyes
    inkBox(ctx, cx - 1, top + 6, 2, 1, '#6a2a10');
    inked(ctx, [[cx + 6, top + 2, 2, 2, '#c86a3a'], [cx - 8, top + 2, 2, 2, '#c86a3a']]);   // little pincers on the rim
  }
}

// ── Fridge: DJINNY's idea of a bridge. It drops out of the sky next to the lake, the door swings
// open and its cold breath rolls out over the quicksand: each column frosts over bit by bit (the
// sand stiffens, a sheet of frost creeps across it, and it's solid once it's half frozen). A while
// later the ice cracks, then thaws from the surface downward, slowly turning back to slush and sand.
// Step up to it again and it opens again. You walk past in front of it; its roof is a ledge.
const FRIDGE_HOLD = 210, FRIDGE_WARN = 50, FRIDGE_THAW = 7, FROST_IN = 0.035;
class Fridge extends Enemy {
  constructor(col, x0, x1, landed) {
    super(col * TILE, landed ? 9 * TILE : -70, 2 * TILE, 3 * TILE);
    this.col = col; this.x0 = x0; this.x1 = x1;
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.state = landed ? 'land' : 'fall'; this.door = 0; this.wave = x0; this.timer = 0;
    this.frost = new Array(x1 - x0 + 1).fill(0);   // how frozen each column of the lake is, 0..1
    this.cells = null;                              // the lake's quicksand cells
    this.roof = { x: this.x + 1, y: 9 * TILE + 2, w: 30, h: 4, dx: 0, dy: 0, prevY: 9 * TILE + 2, update() {}, draw() {} };
  }
  hitbox() { return null; }
  touches(p) { return this.state === 'idle' && overlap(this, p); }
  onTouch() { this.openUp(); }
  update(g) {
    this.t++;
    const lv = g.level, p = g.player;
    if (!this.cells) { this.cells = []; for (let c = this.x0; c <= this.x1; c++) for (let r = 0; r < ROWS; r++) if (lv.get(c, r) === T.QSAND) this.cells.push([c, r]); }
    if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 0.5, 9); this.y += this.vy;
      if (this.y >= 9 * TILE) { this.y = 9 * TILE; this.state = 'land'; }
      return;
    }
    if (this.state === 'land') {
      if (!g.platforms.includes(this.roof)) g.platforms.push(this.roof);
      g.shake = Math.max(g.shake, 6); Sound.play('thud');
      g.dust(this.x + 16, 12 * TILE, 12);
      this.state = 'idle'; this.timer = 0;
      return;
    }
    const open = this.state === 'open' || this.state === 'frozen' || this.state === 'warn';
    this.door = clamp(this.door + (open ? 0.08 : -0.05), 0, 1);
    if (open && this.t % 2 === 0) g.particles.push({ kind: 'px', x: this.x + 34, y: this.y + rand(8, 44), vx: rand(1.2, 2.6), vy: rand(-0.3, 0.3), drag: 0.97, life: 50, t: 0, color: this.t % 4 ? '#dff6ff' : '#9fe3ff', size: 2 });
    if (this.state === 'open') {
      // the cold rolls out over the lake; behind its front every column keeps frosting over
      if (this.t % 2 === 0 && this.wave <= this.x1) this.wave++;
      let all = true;
      for (let c = this.x0; c < this.wave; c++) {
        const i = c - this.x0, k0 = this.frost[i], k = this.frost[i] = Math.min(1, k0 + FROST_IN);
        if (k0 < 0.5 && k >= 0.5) this.setCol(lv, c, T.QSAND, T.ICE);   // solid now
        if (k0 < 1 && k >= 1 && c % 3 === 0) g.burst(c * TILE + 8, 12 * TILE, ['#ffffff', '#bff0ff', '#7fd4ff'], 2);
        if (k < 1) all = false;
      }
      if (this.t % 6 === 0 && this.wave <= this.x1) g.particles.push({ kind: 'px', x: this.wave * TILE + rand(0, 16), y: 12 * TILE - 1, vx: rand(-0.3, 0.3), vy: rand(-0.8, -0.2), drag: 0.95, life: 30, t: 0, color: '#ffffff', size: 1 });
      if (all && this.wave > this.x1) { this.state = 'frozen'; this.timer = FRIDGE_HOLD; }
      return;
    }
    if (this.state === 'frozen') { if (--this.timer <= 0) { this.state = 'warn'; this.timer = FRIDGE_WARN; } return; }
    if (this.state === 'warn') {
      if (this.timer % 20 === 0) Sound.play('crack');
      if (--this.timer <= 0) { this.state = 'thaw'; this.wave = this.x0; this.timer = 0; }
      return;
    }
    if (this.state === 'thaw') {
      // The whole surface thaws together, with the melt line descending through each layer.
      const top = Math.min(...this.cells.map(([, r]) => r)) * TILE;
      const bottom = (Math.max(...this.cells.map(([, r]) => r)) + 1) * TILE;
      const depth = ++this.timer / FRIDGE_THAW, meltY = top + depth;
      this.frost.fill(Math.max(0, 1 - depth / (bottom - top)));
      let softened = false;
      for (const [c, r] of this.cells) {
        if (meltY >= r * TILE + TILE / 2 && lv.get(c, r) === T.ICE) {
          lv.set(c, r, T.QSAND); softened = true;
          if (c % 4 === 0) g.sandPuff(c * TILE + 8, r * TILE, 2);
        }
      }
      if (softened) Sound.play('sandsink');
      if (meltY >= bottom) { this.state = 'idle'; this.timer = 0; }
      return;
    }
    // It stays shut until Chickaroo actually touches the door.
  }
  openUp() { this.state = 'open'; this.wave = this.x0; Sound.play('freeze'); }
  setCol(lv, c, from, to) { for (const [cc, r] of this.cells) if (cc === c && lv.get(cc, r) === from) lv.set(cc, r, to); }
  // the frozen lake, drawn over the quicksand: the sand stiffens (stops churning), frost creeps over it
  // (a pale sheet, spreading crystals, a bright rim along the top), cracks before it goes, and fades as it thaws
  drawOverSand(ctx, g) {
    if (!this.cells) return;
    const lv = g.level;
    const crack = this.state === 'warn' ? 1 - this.timer / FRIDGE_WARN : this.state === 'thaw' ? 1 : 0;
    const meltY = this.state === 'thaw' ? Math.min(...this.cells.map(([, r]) => r)) * TILE + this.timer / FRIDGE_THAW : -Infinity;
    for (const [c, r] of this.cells) {
      const k = this.frost[c - this.x0];
      if (!(k > 0)) continue;
      const x = c * TILE, y = r * TILE, top = r === 0 || !this.cells.some(([cc, rr]) => cc === c && rr === r - 1);
      // The thawed part uses the same fine sand as the lake; only the frozen part stays still.
      ctx.drawImage(fineQuicksandArt(c, r, this.state === 'thaw' ? g.t : 0, !top), x, y);
      ctx.save(); ctx.beginPath(); ctx.rect(x, Math.max(y, meltY), TILE, Math.max(0, y + TILE - Math.max(y, meltY))); ctx.clip();
      ctx.globalAlpha = this.state === 'thaw' ? 0.82 : Math.min(1, k * 1.15) * 0.82; ctx.fillStyle = top ? '#dff4ff' : '#bfe4f4'; ctx.fillRect(x, y, TILE, TILE);
      ctx.globalAlpha = 1;
      const h = (c * 37 + r * 11) & 0xff, n = Math.round(k * 9);
      ctx.fillStyle = '#ffffff';
      for(let i=0;i<n;i++){const xx=x+((h+i*7)%15),yy=y+((h*3+i*5)%15);fLine(ctx,xx-0.7,yy,xx+0.7,yy,'#ffffff',1);fLine(ctx,xx,yy-0.7,xx,yy+0.7,'#ffffff',1);}   // ice crystals
      if (top) { ctx.globalAlpha = k; fRect(ctx, x, y, TILE, 0.67, '#ffffff'); fRect(ctx, x, y + 0.67, TILE, 0.67, '#9fd8f0'); ctx.globalAlpha = 1; }   // (fine)
      if (crack && top && k > 0.3) {   // cracks spreading across the ice as it's about to go
        const m = Math.round(crack * 6);
        ctx.fillStyle = '#5a8aa8';
        for(let i=0;i<m;i++){const xx=x+2+((h+i*3)%12),yy=y+2+((i*5+h)%7);fLine(ctx,xx,yy,xx+1.5,yy+1,'#638da1',1);fLine(ctx,xx+1.5,yy+1,xx+2.2,yy+0.2,'#638da1',1);}
      }
      ctx.restore();
    }
  }
  draw(ctx) {
    const door=Math.round(this.door*8);
    ctx.drawImage(duneFridgeArt(door),this.x-1,this.y-1);
    if(door){fGlow(ctx,this.x+30,this.y+30,22,'#c7eef1',this.door*0.2);for(let i=0;i<3;i++){const u=((this.t+i*17)%70)/70;ctx.save();ctx.globalAlpha=this.door*(1-u)*0.13;fEll(ctx,this.x+30+u*26,this.y+31+i*4-u*3,6+u*10,2+u*2,'#d9f2ef');ctx.restore();}}
  }
}

// ── Carpet: DJINNY's flying carpet (a rental). It hovers where it is until you fly it: on board, the
// arrows steer it every way (left, right, up, down; let go and it glides to a stop and hovers). Rock
// stops it (it won't fly out from under you), and past the far end it lands on the shore, waits for
// you to step off, then rolls itself up and goes home.
const CARPET_SPEED = 2.0, CARPET_CLIMB = 1.5;
class Carpet {
  constructor(col, row, endCol, landRow, here) {
    this.x = col * TILE; this.y = row * TILE; this.w = 44; this.h = 6; this.prevY = this.y;
    this.endX = endCol * TILE; this.landY = landRow * TILE - this.h;
    this.dx = 0; this.dy = 0; this.vx = 0; this.vy = 0; this.t = 0;
    this.state = 'wait'; this.unroll = here ? 1 : 0; this.offT = 0; this.rider = false;
  }
  blocked(g, box) {
    const lv = g.level, c0 = Math.floor(box.x / TILE), c1 = Math.floor((box.x + box.w - 0.01) / TILE), r0 = Math.floor(box.y / TILE), r1 = Math.floor((box.y + box.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (lv.solid(c, r)) return true;
    return false;
  }
  update(g) {
    const p = g.player, ox = this.x, oy = this.y;
    this.t++;
    this.unroll = Math.min(1, this.unroll + 0.05);
    const on = p.platform === this && p.state === 'play';
    if (on) this.rider = true; else if (p.onGround || p.state !== 'play') this.rider = false;
    if (this.state === 'wait') {
      this.y = oy + Math.sin(this.t * 0.08) * 0.3;
      if (on) { this.state = 'fly'; g.say('MAGIC CARPET', 'THE ARROWS FLY IT', '#ffd166'); Sound.play('whoosh'); }
    } else if (this.state === 'fly') {
      const want = on && Input.down('up') ? -CARPET_CLIMB : on && Input.down('down') ? CARPET_CLIMB : 0;
      const side = on ? (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0) : 0;
      if (side) p.facing = side;
      this.vy += (want - this.vy) * 0.18;
      this.vx += (side * CARPET_SPEED - this.vx) * (side ? 0.08 : 0.06);   // speeds up, and glides to a stop
      if (Math.abs(this.vx) < 0.02) this.vx = 0;
      // what has to fit through: the carpet, plus whoever is riding it
      const box = (dx, dy) => {
        const b = { x: this.x + dx, y: this.y + dy, w: this.w, h: this.h };
        if (on) { const top = Math.min(b.y, p.y + dy); b.h = b.y + b.h - top; b.y = top; b.x = Math.min(b.x, p.x + dx); b.w = Math.max(this.x + dx + this.w, p.x + p.w + dx) - b.x; }
        return b;
      };
      if (this.vx && !this.blocked(g, box(this.vx, 0))) this.x += this.vx; else this.vx = 0;
      const ny = clamp(this.y + this.vy, on ? p.h : 2 * TILE, 11 * TILE);   // (up until his head meets the top of the screen)
      if (!this.blocked(g, box(0, ny - this.y))) this.y = ny; else this.vy = 0;
      if (this.x >= this.endX) this.state = 'land';
      if (this.t % 3 === 0) g.particles.push({ kind: 'px', x: this.x + rand(0, 4), y: this.y + 6, vx: -1, vy: rand(-0.2, 0.4), drag: 0.95, life: 24, t: 0, color: this.t % 6 ? '#ffd166' : '#ffffff', size: 1 });
    } else if (this.state === 'land') {
      this.x = Math.min(this.x + 1, this.endX + 2 * TILE);
      this.y = Math.min(this.landY, this.y + 1.2);
      if (this.y >= this.landY && !on) { if (++this.offT > 40) { this.state = 'roll'; this.offT = 0; Sound.play('pop'); } }
    } else if (this.state === 'roll') {
      this.unroll -= 0.06;
      if (this.unroll <= 0) { this.remove = true; g.burst(this.x + 4, this.y, ['#ffd166', '#e8463a', '#ffffff'], 10); }
    }
    this.dx = this.x - ox; this.dy = this.y - oy; this.prevY = oy;
    // a rider keeps up with it through the air (hop off and you land back on it)
    if (this.rider && !p.platform && this.dx && p.state === 'play') sweepX(g.level, p, this.dx);
  }
  draw(ctx, theme, g) {
    const w=this.w*this.unroll;if(w<2)return;
    const c=Math.floor((this.x+this.w/2)/TILE);let r=Math.floor((this.y+this.h)/TILE)+1;while(r<ROWS&&!g.level.get(c,r))r++;
    if(r<ROWS&&g.level.get(c,r)!==T.LAVA){ctx.save();ctx.globalAlpha=0.14;fEll(ctx,this.x+w/2,r*TILE-0.5,Math.max(1,w/2-3),1.5,'#644735');ctx.restore();}
    ctx.save();ctx.beginPath();ctx.rect(this.x-4,this.y-5,w+8,18);ctx.clip();ctx.drawImage(duneCarpetArt(Math.floor(this.t/3)%12),this.x-3,this.y-3);ctx.restore();
  }
}

// ── Camel: HUMPHREY. Kneeling until you climb into the saddle, then he heaves himself up and plods
// right across anything (quicksand included) to `until`, where he kneels again. He only walks
// with a rider aboard. Low rock arches: duck (down), or they scrape you off. He ducks his own head.
// He spits at critters ahead of him, and they don't come back.
const CAMEL_TOP = 159, CAMEL_KNEEL = 174, CAMEL_SPEED = 1.0;
class Camel {
  constructor(col, until) {
    this.bx = col * TILE;              // the left end of his body
    this.w = 56; this.h = 6; this.x = this.bx; this.y = CAMEL_KNEEL; this.prevY = this.y;   // (his whole back is standable, humps and all)
    this.until = until * TILE; this.dx = 0; this.dy = 0; this.t = 0; this.v = 0; this.step = 0;
    this.state = 'kneel'; this.rider = false; this.spitT = 60; this.fartT = 75; this.duck = 0; this.mouth = 0; this.fartFace = 0;
    this.speakerName = 'HUMPHREY'; this.paid = false; this.nagT = 0;
  }
  get cx() { return this.headX() + 2; }   // (the talking marker sits over his head)
  get talkY() { return this.y - 26 + Math.round(this.duck * 14); }
  headX() { return this.bx + 62; }
  mouthPos() { return [this.bx+74,this.y-14+Math.round(this.duck*7)/7*14]; }
  update(g) {
    const p = g.player, oy = this.y, ox = this.bx;
    this.t++;
    const on = p.platform === this && p.state === 'play';
    if (on) this.rider = true; else if (p.onGround || p.state !== 'play') this.rider = false;
    if (this.state === 'kneel' && on && !this.paid) {
      // camel rides: 1C. bring the coin and he takes it (and the toll gate opens); no coin, no ride
      if (g.camelCoin) {
        g.camelCoin = false; this.paid = true; Sound.play('coin');
        const gate = g.entities.find(e => e instanceof CamelGate); if (gate) gate.open(g);
      } else if (!(this.nagT > 0)) { this.nagT = 240; g.speak(this, ['CAMEL RIDES: 1C. NO COIN, NO RIDE.', 'NO COIN? NO HUMP. HMPH.'], '#e8c890'); }
    }
    if (this.nagT > 0) this.nagT--;
    if (this.state === 'kneel' && on && this.paid) { this.state = 'rise'; Sound.play('creak'); }
    if (this.state === 'rise') { this.y = Math.max(CAMEL_TOP, this.y - 0.6); if (this.y <= CAMEL_TOP) this.state = 'walk'; }
    if (this.state === 'walk') {
      const target = this.rider ? CAMEL_SPEED : 0;
      this.v += (target - this.v) * 0.05;
      this.bx = Math.min(this.until, this.bx + this.v);
      this.step += this.v;
      if (this.bx >= this.until) { this.state = 'sit'; this.v = 0; Sound.play('creak'); }
    }
    if (this.state === 'sit') this.y = Math.min(CAMEL_KNEEL, this.y + 0.5);
    // tuck his head down under rock just ahead
    const lv = g.level, hx = this.headX() + 8, hr = Math.floor((this.y - 20) / TILE);
    const rock = lv.solid(Math.floor(hx / TILE), hr) || lv.solid(Math.floor((hx + 20) / TILE), hr);
    this.duck = clamp(this.duck + (rock ? 0.15 : -0.08), 0, 1);
    // spit at the first critter in front of him, down at ground level
    if (this.spitT > 0) this.spitT--;
    if (this.mouth > 0) this.mouth--;
    if (this.fartFace > 0) this.fartFace--;
    // and anything sneaking up behind him gets a big green cloud of camel trouble
    if (this.fartT > 0) this.fartT--;
    if (this.state === 'walk' && this.fartT <= 0 && g.entities.some(e => !e.dead && !e.passive && !e.friendly && spitKills(e) && e.cx < this.bx + 6 && e.cx > this.bx - 110 && e.y > this.y - 70)) {
      // Start at the visible tip of his tail so the first puff visibly comes from his behind.
      g.fireballs.push(new FartCloud(this.bx - 3, this.y + 8));
      Sound.play('fart'); this.fartT = 110;
      this.fartFace = 40;
    }
    if (this.state === 'walk' && this.spitT <= 0) {
      const tgt = g.entities.find(e => !e.dead && !e.passive && !e.friendly && spitKills(e) && e.cx > this.headX() && e.cx < this.headX() + 150 && e.y > 7 * TILE);
      if (tgt) {
        g.fireballs.push(new CamelSpit(...this.mouthPos(), tgt.cx, tgt.y + tgt.h / 2));
        Sound.play('spit'); this.spitT = 80; this.mouth = 14;
      }
    }
    this.x = this.bx;
    this.dx = this.bx - ox; this.dy = this.y - oy; this.prevY = oy;
    if (this.rider && !p.platform && this.dx && p.state === 'play') sweepX(lv, p, this.dx);
  }
  // legs: knobbly knees, long and swaying while he walks; folded under him when he kneels. Drawn behind
  // the terrain, so sand islands (and the quicksand he wades through) cover them
  drawBehind(ctx) {
    const height=Math.round((12*TILE-this.y)*ART_R)/ART_R;
    ctx.drawImage(duneCamelLegArt(height,Math.floor(this.step)%24,this.state==='walk'&&this.v>0.05),this.bx-6,this.y);
  }
  draw(ctx) {
    ctx.drawImage(duneCamelArt(Math.round(this.duck*7)/7,this.fartFace?2:this.mouth?1:0,Math.floor(this.t/6)%4),this.bx-6,this.y-28);
  }
}
// HUMPHREY's other weapon: a swelling green cloud that drifts back the way he came, knocking out
// anything it rolls over (whatever a spit would), then thins away
class FartCloud {
  constructor(x, y) { this.x = x - 10; this.y = y - 10; this.w = 20; this.h = 20; this.t = 0; this.remove = false; this.cx = x; this.cy = y; }
  update(g) {
    this.t++;
    const r = Math.min(24, 6 + this.t * 0.6);
    this.cx -= 0.7; this.cy -= 0.08;
    this.x = this.cx - r; this.y = this.cy - r; this.w = this.h = r * 2;
    if (this.t < 100) for (const e of g.entities) {
      if (e.dead || e.remove || e.passive || e.friendly || e.bossHazard || !spitKills(e)) continue;
      const b = e.hitbox();
      if (!b || !overlap(this, b)) continue;
      e.flipKill(g, -1); g.addScore(200, e.cx, e.y);
    }
    if (this.t > 130) this.remove = true;
  }
  draw(ctx) {
    const a = this.t < 100 ? 1 : 1 - (this.t - 100) / 30, r = this.w / 2;
    ctx.globalAlpha = 0.75 * a;
    for (let i = 0; i < 6; i++) {
      const ang = i * 1.05 + this.t * 0.03, d = r * 0.45, x = this.cx + Math.cos(ang) * d, y = this.cy + Math.sin(ang) * d * 0.7, rr = Math.max(3, r * 0.55);
      blob(ctx, x, y, rr, i % 2 ? '#8ad84a' : '#a8e86a');
    }
    ctx.globalAlpha = 0.6 * a; ctx.strokeStyle = '#5a8a2a'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';   // wavy stink lines rising off it (fine)
    for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let k = 0; k <= 12; k += 0.5) ctx.lineTo(this.cx - 7.5 + i * 8 + Math.sin(this.t * 0.2 + k + i) * 1.5, this.cy - r - 1 - k); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}

// a camel gob knocks out anything a fireball, a stomp or a roll would (scorpions included)
const spitKills = e => !!(e.fireKill || e.stompable || e.rollKill);
// ── CamelGate: a plain sandstone slab across the way. Pay HUMPHREY and it sinks into the sand.
class CamelGate extends Enemy {
  constructor(col, top = 0, bot = 11) {
    super(col * TILE, top * TILE, TILE, (bot - top + 1) * TILE);
    this.col = col; this.top = top; this.bot = bot; this.k = 0; this.opening = false; this.shut = false;
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  open(g) { if (!this.opening) { this.opening = true; Sound.play('rumble'); g.shake = Math.max(g.shake, 3); } }
  update(g) {
    this.t++;
    if (this.t === 1) { for (let r = this.top; r <= this.bot; r++) g.level.set(this.col, r, T.BODY); this.shut = true; }
    if (!this.opening || this.k >= 1) return;
    this.k = Math.min(1, this.k + 1 / 50);
    if (this.t % 3 === 0) g.sandPuff(this.x + 8 + rand(-8, 8), 12 * TILE, 2, -1.6);
    if (this.t % 12 === 0) Sound.play('rumble');
    if (this.k > 0.5 && this.shut) { for (let r = this.top; r <= this.bot; r++) g.level.set(this.col, r, T.EMPTY); this.shut = false; }
  }
  draw(ctx) {
    if (this.k >= 1) return;
    const x = Math.round(this.x), y0 = this.top * TILE, h = this.h, y = Math.round(y0 + this.k * h), ground = 12 * TILE;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y0 - 4, 24, ground - y0 + 4); ctx.clip();
    inked(ctx, [[x, y, 16, h, '#d8a866']]);
    for (let yy = y + 14; yy < y + h; yy += 16) inkBox(ctx, x, yy, 16, 1, '#a8743c');               // block seams
    for (let yy = y; yy < y + h; yy += 32) inkBox(ctx, x + 7, yy + 2, 1, 12, '#a8743c');
    inkBox(ctx, x + 1, y, 1, h, '#f0c890'); inkBox(ctx, x + 14, y, 1, h, '#a8743c');
    ctx.restore();
  }
}

class CamelSpit {
  // a gob lobbed to land on (tx, ty): flat and fast, so it fits under the arches
  constructor(x, y, tx, ty) {
    this.x = x - 3; this.y = y - 3; this.w = 6; this.h = 6; this.t = 0; this.remove = false;
    this.vx = 3; const n = Math.max(8, (tx - x) / this.vx);
    this.vy = (ty - y - 0.06 * n * n) / n;
  }
  update(g) {
    this.t++;
    this.vy += 0.12; this.x += this.vx; this.y += this.vy;
    const lv = g.level;
    if (lv.solid(Math.floor((this.x + 3) / TILE), Math.floor((this.y + 3) / TILE)) || this.y > VIEW_H) { this.splat(g); return; }
    for (const e of g.entities) {
      if (e.dead || e.remove || e.passive || e.friendly || e.bossHazard) continue;
      const b = e.hitbox();
      if (!b || !overlap(this, b)) continue;
      if (e.fireHit) e.fireHit(g, 1);
      else if (spitKills(e)) { e.flipKill(g, 1); g.addScore(200, e.cx, e.y); }
      else continue;
      this.splat(g); return;
    }
  }
  splat(g) {
    this.remove = true; Sound.play('plop');
    for (let i = 0; i < 6; i++) g.particles.push({ kind: 'px', x: this.x + 3, y: this.y + 3, vx: rand(-1.2, 1.2), vy: rand(-1.6, 0), g: 0.15, life: 22, t: 0, color: i % 2 ? '#e8f0d0' : '#c8d8a0', size: 2 });
  }
  draw(ctx) { const x=this.x+3,y=this.y+3;fEll(ctx,x,y,3.4,2.7,INK);fEll(ctx,x,y,2.8,2.1,'#d2dfb8');fEll(ctx,x-0.5,y-0.5,1.8,1.1,'#eef3d8');fEll(ctx,x-1,y-0.9,0.6,0.35,'#fffbea'); }
}

// ── GRUBBLE the sandworm. Passing column x, he bursts out of the dunes behind Chickaroo and chases
// him, arcing in and out of the sand (he eats anything he catches up with, Chickaroo included).
// At untilX he bonks his nose on the big cactus (bigcactus) and slinks off, sniffling.
const WORM_R = 20;
class Sandworm extends Enemy {
  constructor(col, until, speed) {
    super(col * TILE, 0, 1, VIEW_H);
    this.trig = col * TILE; this.until = until * TILE; this.speed = speed || 2.15;
    this.state = 'wait'; this.front = 0; this.v = 0; this.hy = 12 * TILE; this.hist = [];
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false; this.noFreeze = true; this.passive = true;
    this.behindTiles = this.frontOfScenery = true; this.speakerName = 'GRUBBLE';
    this.heardOffscreen = true;   // (you should hear him coming)
  }
  get cx() { return this.front; }
  get talkY() { return this.hy - WORM_R - 14; }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'wait') {
      if (p.x < this.trig) return;
      this.state = 'run'; this.front = Math.min(g.camX, p.x - 180) - 10; this.t = 0;
      g.say('GRUBBLE', 'URRGGHAWEHUGHE!!!', '#ffb3c7', 150);
      Sound.play('roar'); g.shake = 6;
      return;
    }
    if (this.state === 'run') {
      this.v = Math.min(this.speed, this.v + 0.04);
      this.front = Math.max(this.front + this.v, p.x - 140);
      // up out of the sand and back down again, in big lazy arcs
      const arc = Math.abs(Math.sin(this.t * 0.055));
      this.hy = 12 * TILE + 8 - arc * 58;
      if (this.t % 22 === 0) Sound.play('rumble');
      g.shake = Math.max(g.shake, 1);
      if (this.hy > 12 * TILE - 6 && this.t % 2 === 0) g.sandPuff(this.front + rand(-8, 8), 12 * TILE, 2, -2.5);
      for (const e of g.entities) if (e !== this && !e.dead && !e.passive && !e.friendly && !e.noFreeze && e.cx < this.front + 6) e.flipKill(g, 1);
      const pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
      if (p.state === 'play' && (p.x + 4 < this.front - 6 || Math.hypot(pc.x - this.front, pc.y - this.hy) < WORM_R + 4)) g.killPlayer('worm');
      const cac = g.entities.find(e => e instanceof BigCactus);
      const contact = cac ? cac.x - WORM_R + 2 : this.until;
      if (this.front >= contact) {
        this.state = 'bonk'; this.t = 0; this.front = contact; this.hy = 12 * TILE - 42;
        g.shake = 14; Sound.play('thud'); Sound.play('rumble');
        if (cac) cac.wobble = 50;
        g.burst(this.front+WORM_R,this.hy,['#ffe4a0','#dba09c'],18);
        g.wormImpact = { worm: this, cactus: cac, from: g.camX, focus: this.front, t: 0 };
      }
    } else if(this.state==='bonk'){
      if(this.t>=8){
        this.state='splatter';this.t=0;g.shake=18;Sound.play('blast');Sound.play('pop');
        const points=[[this.front,this.hy],...this.hist.filter((q,i)=>i%10===0).map((q,i)=>[q[0]-i*7,q[1]+i*2])];
        for(const [x,y]of points)for(let i=0;i<9;i++){
          const goo=i%3!==0;
          g.particles.push({kind:goo?'wormGoo':'wormGib',x:x+rand(-14,14),y:y+rand(-15,10),vx:rand(-4.5,4.5),vy:rand(-6.8,-1),g:.16,drag:.99,t:0,life:105+rand(0,35),size:goo?rand(1.5,4):rand(5,10),variant:i%4,spin:rand(-.16,.16)});
        }
      }
    } else if(this.state==='splatter'&&this.t>105)this.remove=true;
    this.hist.push([this.front, this.hy]);
    if (this.hist.length > 90) this.hist.shift();
  }
  draw(ctx,g){
    if(this.state==='wait')return;
    if(this.state!=='splatter'){
      const ground=12*TILE+2;ctx.save();ctx.beginPath();ctx.rect(g.camX-80,-30,VIEW_W+160,ground+30);ctx.clip();
      for(let k=9;k>=1;k--){const q=this.hist[Math.max(0,this.hist.length-1-k*7)];if(!q)continue;const r=WORM_R-2-k;ctx.drawImage(duneWormSegmentArt(r,k%3),q[0]-k*6-r-2,q[1]+k*2-r-2);}
      ctx.save();ctx.translate(this.front,this.hy);if(this.state==='bonk')ctx.scale(1+this.t*.035,1-this.t*.025);
      ctx.drawImage(duneWormHeadArt(Math.floor(Math.abs(Math.sin(this.t*.2))*4)),-28,-34);ctx.restore();ctx.restore();
    }
    if(this.state==='bonk'||this.state==='splatter')drawWormBang(ctx,this.front+WORM_R,this.hy-4,this.t+(this.state==='splatter'?8:0));
  }
}
// The big cactus at the end of the worm chase (scenery, behind everything; it wobbles when bonked)
class BigCactus extends Enemy {
  constructor(col) {
    super(col * TILE, 12 * TILE - 80, 16, 80);
    this.passive = this.friendly = this.noFreeze = true; this.behindTiles = true; this.wobble = 0;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; if (this.wobble > 0) this.wobble--; }
  draw(ctx) {
    const sway=this.wobble?Math.sin(this.wobble*0.6)*(this.wobble/10):0,img=duneCactusArt(80,true,true);
    ctx.save();ctx.translate(this.x+8,this.y+this.h);ctx.rotate(sway*0.008);ctx.drawImage(img,-img.width/2,-img.height);ctx.restore();
  }
}

// ── Crumbling mesa: a sandstone pillar (columns x0-x1, from row `top` down) that gives way underfoot.
// The moment Chickaroo lands on it, cracks spread over its face, thicker and thicker; two seconds on
// it shakes, then crumbles away in a shower of rubble. A few seconds later it puts itself back together
// like time running backwards: the very same chunks fly back up out of the canyon into place.
const MESA_HOLD = 120, MESA_GONE = 240, MESA_RISE = 40, MESA_FALL = 80;
const MESA_CRACK_LIGHT = FinePix.rgba('#f1c78e'), MESA_CRACK_DARK = FinePix.rgba('#684936');
class CrumbleMesa extends Enemy {
  constructor(x0, x1, top) {
    super(x0 * TILE, top * TILE, (x1 - x0 + 1) * TILE, (ROWS - top) * TILE);
    this.x0 = x0; this.x1 = x1; this.top = top;
    this.passive = this.friendly = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.state = 'solid'; this.timer = 0; this.saved = null;
  }
  hitbox() { return null; }
  touches() { return false; }
  standing(p) { return p.state === 'play' && p.onGround && !p.platform && Math.abs(p.y + p.h - this.top * TILE) < 1 && p.x + p.w > this.x + 1 && p.x < this.x + this.w - 1; }
  update(g) {
    this.t++;
    const lv = g.level, p = g.player;
    if (!this.saved) {
      this.saved = []; for (let c = this.x0; c <= this.x1; c++) for (let r = this.top; r < ROWS; r++) this.saved.push([c, r, lv.get(c, r)]);
      // no scenery grows on a mesa that's going to fall away (a cactus left hanging in the air...)
      lv.decor = lv.decor.filter(d => !(d.x >= this.x - 4 && d.x < this.x + this.w + 4 && d.y <= this.top * TILE + 2));
    }
    if (this.state === 'solid') { if (this.standing(p)) { this.state = 'crack'; this.timer = 0; Sound.play('crack'); } return; }
    if (this.state === 'crack') {
      this.timer++;
      if (this.timer % 24 === 0) Sound.play('crack');
      if (this.timer > MESA_HOLD - 30 && this.t % 3 === 0) g.sandPuff(this.x + rand(0, this.w), this.top * TILE + rand(2, 20), 1, 0.5);   // grit trickling off it
      if (this.timer >= MESA_HOLD) {
        this.state = 'gone'; this.timer = 0;
        for (const [c, r] of this.saved) lv.set(c, r, T.EMPTY);
        g.shake = Math.max(g.shake, 5); Sound.play('crumble'); Sound.play('thud');
        this.chunks = this.shatter();
        for (let i = 0; i < 14; i++) g.sandPuff(this.x + rand(0, this.w), this.top * TILE + rand(0, 40), 1, rand(-2, 0.5));
      }
      return;
    }
    const clear = () => !(p.state === 'play' && overlap(p, { x: this.x, y: this.top * TILE - 2, w: this.w, h: this.h }));
    if (this.state === 'gone') {
      if (++this.timer >= MESA_GONE && clear()) { this.state = 'rise'; this.timer = 0; Sound.play('whoosh'); }
      return;
    }
    if (this.state === 'rise') {   // rewinding: the rubble flies back up into place; it's solid again once it's whole
      if (this.timer < MESA_RISE) this.timer++;
      if (this.timer >= MESA_RISE && clear()) {
        for (const [c, r, t] of this.saved) lv.set(c, r, t);
        this.state = 'solid'; this.timer = 0; this.chunks = null; Sound.play('thud'); g.shake = Math.max(g.shake, 2);
      }
    }
  }
  // break the mesa into chunks of rock and work out their whole fall up front (frame by frame), so the
  // same flight can be played forward as it collapses and backward as it rebuilds
  shatter() {
    const out = [], H = VIEW_H - this.top * TILE;
    for (let y = 0; y < H; y += 7) for (let x = 0; x < this.w; x += 8) {
      const s = 6 + Math.floor(rand(0, 3));
      let px = this.x + x + rand(-1, 1), py = this.top * TILE + y, vx = rand(-1.6, 1.6) + (x / this.w - 0.5) * 1.5, vy = rand(-3, -0.5) * (1 - y / H);
      const path = [];
      for (let f = 0; f <= MESA_FALL; f++) { path.push([px, py]); px += vx; py += vy; vy = Math.min(vy + 0.3, 7); vx *= 0.99; }
      out.push({ s, path, top: y === 0, shade: (x / 8 + y / 7) % 3 });
    }
    return out;
  }
  draw(ctx, g) {
    const x = Math.round(this.x), top = this.top * TILE;
    if (this.chunks && (this.state === 'gone' || this.state === 'rise')) {
      // falling (played forward), or flying back together (the same fall, rewound fast, easing into place)
      const u = this.state === 'rise' ? this.timer / MESA_RISE : 0;
      const f = this.state === 'gone' ? Math.min(MESA_FALL, this.timer) : Math.round(MESA_FALL * (1 - u) * (1 - u));
      if (this.state === 'gone' && this.timer > MESA_FALL) return;
      if (this.state === 'rise' && f > 2) {   // a little time-streak trailing back along each chunk's path (one pixel buffer: FinePix)
        const R = ART_R, streaks = [];
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const ch of this.chunks) {
          const [, cy] = ch.path[f], [tx, ty] = ch.path[Math.min(MESA_FALL, f + 6)], sx = tx + ch.s / 2, sy = Math.min(cy, ty), sh = Math.abs(ty - cy) + 1;
          if (cy > VIEW_H + 8) continue;
          streaks.push([sx, sy, sh]);
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx + 1); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy + sh + 1);
        }
        if (streaks.length) {
          const P = (this.pix = this.pix || new FinePix()).begin(x0 - 1, y0 - 1, x1 + 1, y1 + 1), col = P.soft('#fff3d8', 0.25);
          for (const [sx, sy, sh] of streaks) {   // (fRoundRect's rows: this thin, its corners don't round off)
            const X = Math.round(sx * R), Y = Math.round(sy * R), H = Math.round(sh * R);
            for (let j = 0; j < H; j++) P.span(Y + j, X, X + 2, col);
          }
          P.end(ctx);
        }
      }
      for (const ch of this.chunks) {
        const [cx, cy] = ch.path[f], s = ch.s;
        if (cy > VIEW_H + 8) continue;
        ctx.drawImage(duneRockChipArt(s,Math.round(ch.shade)),cx,cy);
      }
      return;
    }
    if (this.state !== 'crack') return;
    // the cracks: a branching fracture (see fractures) revealed from the top down as it gives way,
    // hairline thin, and kept to the pillar's own face
    const k = this.timer / MESA_HOLD, shake = k > 0.75 ? ((this.t >> 1) % 2 ? 1 : -1) : 0;
    if (!this.cracks) this.cracks = this.fractures();
    const reach = this.cracks.max * Math.min(1, k * 1.2 + 0.06);
    // (hundreds of hairline segments: set into a pixel buffer the size of the pillar's face -- which also keeps them on
    // it -- and put on screen in one go, rather than two canvas fills apiece every frame. FinePix: hires.js)
    const P = (this.pix = this.pix || new FinePix()).begin(x + 1, top, x + this.w - 1, VIEW_H);
    for (const q of this.cracks.lines) if (q[4] <= reach) { P.line(q[0] + shake + 0.34, q[1] + 0.34, q[2] + shake + 0.34, q[3] + 0.34, MESA_CRACK_LIGHT, 2); P.line(q[0] + shake, q[1], q[2] + shake, q[3], MESA_CRACK_DARK, 1); }
    P.end(ctx);
    if (k > 0.75) { ctx.globalAlpha = 0.25; fRect(ctx, x, top, this.w, 0.67, '#ffffff'); ctx.globalAlpha = 1; }
  }
  // A fracture pattern for this mesa (seeded, so it's always the same): a few cracks start along the top
  // edge and run down the rock, wandering, and keep splitting -- side branches fork off at an angle, and
  // those split again. Every pixel remembers how far along its crack it is, so the pattern can be revealed
  // as it spreads. Everything stays inside the pillar.
  fractures() {
    const rng = mulberry32(this.x0 * 7919 + this.top), px = [], lines = [], x0 = this.x + 2, x1 = this.x + this.w - 3, top = this.top * TILE, bot = VIEW_H;
    let max = 0;
    const grow = (x, y, dx, d, len, gen) => {
      for (let s = 0; s < len; s++) {
        const oldX=x,oldY=y; y += 1; x += dx; if (rng() < 0.35) x += rng() < 0.5 ? -0.5 : 0.5;   // down the rock, wandering
        if (x < x0 || x > x1 || y >= bot) return;
        px.push([x,y,d+s]);lines.push([oldX,oldY,x,y,d+s]); max = Math.max(max, d + s);
        // splitting off: a branch angling away to one side, shorter, which may split again
        if (gen < 3 && s > 5 && rng() < (gen === 0 ? 0.05 : 0.032)) {
          const side = rng() < 0.5 ? -1 : 1;
          grow(x, y, side * (0.5 + rng() * 0.6), d + s, Math.round(len * (0.35 + rng() * 0.3)), gen + 1);
        }
      }
    };
    const roots = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < roots; i++) {
      const sx = x0 + 3 + (x1 - x0 - 6) * (i + 0.3 + rng() * 0.4) / roots;
      grow(sx, top, (rng() - 0.5) * 0.3, Math.floor(rng() * 6), Math.round((bot - top) * (0.75 + rng() * 0.25)), 0);
    }
    return { px, lines, max };
  }
}

// ── The sun temple's pots (a wink at a certain green-tunicked hero): white clay pots with a dark
// mouth and a fat rim. Stomp one, roll or spin into it, burn or hammer it and it shatters -- and out
// puffs a ball of green pollen (each pot counts toward the stage's pollen). Broken pots stay broken this visit.
class Pot extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, row * TILE - 13, 14, 13);
    this.key = 'pot' + col;
    this.noFreeze = true; this.shellKill = this.bumpKill = this.rollKill = true;
  }
  update(g) {
    this.t++;
    if (g.potsLevel !== g.level.def.id) { g.pots = new Set(); g.potsLevel = g.level.def.id; }
    if (g.pots.has(this.key)) this.remove = true;
  }
  touches(p) { return overlap(this, p); }
  onTouch(g, p) { if (g.isStomp(p, this)) { this.shatter(g); g.bounce(p); } }   // (bumping into one does nothing)
  fireHit(g) { this.shatter(g); }
  flipKill(g) { this.shatter(g); }
  shatter(g) {
    if (this.remove) return;
    this.remove = this.dead = true;
    g.pots.add(this.key);
    for (let i = 0; i < 14; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-6, 6), y: this.y + rand(2, 12), vx: rand(-1.8, 1.8), vy: rand(-3.2, -1), g: 0.25, drag: 0.98, life: 34, t: 0, color: ['#e8e4d8', '#b0aca4', '#6e6c78', '#202028'][i % 4], size: i % 3 ? 2 : 3 });
    Sound.play('break');
    g.addCoin(); g.addScore(200, this.cx, this.y - 10);
    g.pollenFly(this.cx, this.y + 4, 0, -4, 14, '#7af07a');
  }
  draw(ctx) {
    ctx.drawImage(duneUrnArt(true),this.cx-9,this.y+this.h-17);
  }
}

