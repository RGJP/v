'use strict';
// 3-4 room 7, THE COLON (three screens wide, colon tissue). The large intestine: bacteria, gas, and the last long push.
//   ACT 1 THE FLORA       ['bacillus', col, row]   a rod of gut bacteria: it hunts him slowly and DIVIDES every five seconds
//                         through three binary generations (eight descendants per original rod) until stomped.
//   ACT 2 THE UPDRAFT     ['bubbles', col, bottomRow, topRow, w = 2]  a plume of green gas rising out of the sludge that floats him gently
//                         upward (never hurts, never a sound): ride the plumes up to shelves and drift off sideways onto them.
//   ACT 3 THE TIDE        ['tide', col0, col1, row, w = 6]   a raft of muscle on a big lake of sludge that he steers with his own weight:
//                         stand on its left and it drifts left, on its right and it drifts right, in the middle it brakes to a stop.
//                         ['spout', col, w, topRow, period, on, offset]  the lake erupts on a rhythm (rings on the surface first).
// Part of the gut's rooms (see gut.js for the level format).

// ── gut bacteria that multiply ──────────────────────────────────────────────
const BAC_SPLIT = 300, BAC_GENERATIONS = 3, BAC_PINCH = 40, BAC_LEASH = 160, BAC_SPACE = 8;   // Three fission generations per lineage; daughters are smaller and separate before the next split.
class Bacillus extends Enemy {
  constructor(col, row, dir = 1) {
    super(col * TILE + 1, (row + 1) * TILE - 9, 16, 9);
    this.dir = dir < 0 ? -1 : 1; this.walker = true; this.vx = this.dir * 0.45;
    this.age=0;this.generation=0;this.birthGrace=0;this.home=col*TILE;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = true;
  }
  update(g) {
    this.t++;this.age++;if(this.birthGrace>0)this.birthGrace--;
    const p = g.player;
    // it noses toward him when he's close (slowly, wobbling), otherwise potters about and turns at edges
    if (p.state === 'play' && Math.abs(p.x - this.x) < 130 && Math.abs(p.y - this.y) < 60) this.dir = p.x + p.w / 2 < this.cx ? -1 : 1;
    if (Math.abs(this.cx - this.home) > BAC_LEASH) this.dir = this.home < this.cx ? -1 : 1;   // (back to its own patch)
    this.vx = this.dir * (0.42 + Math.sin(this.t * 0.2) * 0.12);
    // Keep a full chick-width of air between bodies, including while hunting.
    // Limit the actual step: a soft repulsion alone still lets converging rods overlap.
    const mates = g.entities.filter(e => e instanceof Bacillus && e !== this && !e.dead && !e.remove);
    let bodyLo=-.8,bodyHi=.8,pushLo=-Infinity,pushHi=Infinity;
    for(const o of mates){
      if(this.y+this.h<=o.y||o.y+o.h<=this.y)continue;
      const left=this.cx<o.cx||(this.cx===o.cx&&g.entities.indexOf(this)<g.entities.indexOf(o));
      const gap=this.birthGrace>0||o.birthGrace>0?0:BAC_SPACE;
      if(left){const limit=o.x-this.w-this.x;bodyHi=Math.min(bodyHi,limit);pushHi=Math.min(pushHi,limit-gap);}
      else {const limit=o.x+o.w-this.x;bodyLo=Math.max(bodyLo,limit);pushLo=Math.max(pushLo,limit+gap);}
    }
    // Balance the actual crowd pressure before capping the step. Capping each side
    // first made unequal gaps cancel out and could leave a growing family jammed.
    const desired=pushLo<=pushHi?clamp(this.vx,pushLo,pushHi):(pushLo+pushHi)/2;
    this.vx=bodyLo<=bodyHi?clamp(desired,bodyLo,bodyHi):0;
    this.walk(g, true);
    this.dir = Math.sign(this.vx) || this.dir;
    if(this.generation<BAC_GENERATIONS&&this.age>=BAC_SPLIT)this.divide(g);
  }
  divide(g){
    if(this.generation>=BAC_GENERATIONS)return;
    const next=this.generation+1,scale=Math.pow(2,-next/3),w=Math.round(16*scale),h=Math.round(9*scale),cx=this.cx,feet=this.y+this.h;
    const kid=new Bacillus(0,0,-this.dir);kid.home=this.home;kid.generation=next;kid.w=w;kid.h=h;kid.y=feet-h;
    const mates=g.entities.filter(e=>e instanceof Bacillus&&e!==this&&!e.dead&&!e.remove);
    let chosen=null;
    for(const shift of [0,(w+4)/2,-(w+4)/2]){
      const mid=cx+shift,a={x:mid-(w+4)/2-w/2,y:feet-h,w,h},b={x:mid+(w+4)/2-w/2,y:feet-h,w,h};
      const fits=box=>{
        const foot=Math.floor((box.y+box.h+1)/TILE);
        return !overlapsSolidAt(g,box)&&[box.x+1,box.x+box.w-2].some(x=>g.level.solid(Math.floor(x/TILE),foot)||g.level.get(Math.floor(x/TILE),foot)===T.SEMI)
          &&mates.every(o=>!overlap(box,o));
      };
      if(fits(a)&&fits(b)){chosen=[a,b];break;}
    }
    if(!chosen){this.age=BAC_SPLIT;return;}
    Object.assign(this,chosen[0]);Object.assign(kid,chosen[1]);this.generation=next;this.age=0;this.birthGrace=kid.birthGrace=45;this.dir=-1;kid.dir=1;
    g.entities.push(kid);if(this.x>g.camX-16&&this.x<g.camX+VIEW_W+16)Sound.play('pop');
    for(let i=0;i<5;i++)g.spark(cx,feet-4,i%2?'#e0f8a0':'#9ad25a',14,rand(-1,1),rand(-1,.2));
  }
  onTouch(g, p) {
    // Another rod reached in the same landing is part of the stomp, even after the bounce
    // has changed vy. Side contact still hurts normally.
    if (p.stompT === g.t && p.prevY + p.h <= this.y + 8) this.stomp(g, p);
    else super.onTouch(g, p);
  }
  draw(ctx) {   // (in fine pixels: hires.js)
    const cx = this.cx, y = this.y, t = this.t, d = this.dir;
    ctx.save();ctx.translate(cx,y+this.h);ctx.scale(this.w/16,this.h/9);ctx.translate(-cx,-y-9);
    const pinch=this.generation<BAC_GENERATIONS?clamp((this.age-BAC_SPLIT+BAC_PINCH)/BAC_PINCH,0,1):0;   // pinching in the middle before it divides
    const wob = Math.sin(t * 0.25) * 0.2, sep = pinch * 3;
    ctx.strokeStyle = '#5a8a30'; ctx.lineWidth = 0.6; ctx.beginPath();   // the flagellum: a thin tail whipping behind it
    for (let i = 0; i <= 9; i += 0.5) ctx.lineTo(cx - d * (8 + i), y + 4.5 + Math.sin(t * 0.35 - i * 0.7) * (1 + i * 0.25));
    ctx.stroke();
    // the rod: a plump capsule (two lobes when it's about to split), a dark nucleoid squiggle, a sheen
    for (const ox of [-3 - sep, 3 + sep]) fEll(ctx, cx + ox, y + 4.5 + wob, 6.6, 4.6, '#26401a');
    if (pinch < 0.6) fRect(ctx, cx - 4, y + 0.6, 8, 7.8, '#26401a');
    for (const ox of [-3 - sep, 3 + sep]) fEll(ctx, cx + ox, y + 4.5 + wob, 5.6, 3.6, '#9ad25a');
    if (pinch < 0.6) fRect(ctx, cx - 4, y + 1.6, 8, 5.8, '#9ad25a');
    for (const ox of [-3 - sep, 3 + sep]) { fEll(ctx, cx + ox, y + 6.2 + wob, 4.4, 1.2, '#6a9a3a'); fEll(ctx, cx + ox - 1.2, y + 2.8 + wob, 3, 0.9, '#e0f8a0'); }
    if (pinch > 0.2) fRect(ctx, cx - 0.67, y + 1, 1.33, 7 - (1 - pinch) * 3, '#26401a');   // the waist closing
    ctx.strokeStyle = '#3a6a20'; ctx.lineWidth = 0.5; ctx.beginPath();   // the squiggle of DNA
    for (let i = 0; i <= 10; i += 0.5) ctx.lineTo(cx - 5 + i, y + 4.6 + Math.sin(i * 1.6) * 0.8);
    ctx.stroke();
    for (const k of [-6, -2, 2, 6]) fLine(ctx, cx + k, y + 8.4, cx + k - d * 0.4, y + 9.6 + ((t >> 3) & 1) * 0.5, '#c8e890', 1);   // fine cilia along the belly
    fBlob(ctx, cx + d * 4.2, y + 3.4, 0.8, '#1e3010'); fBlob(ctx, cx + d * 4, y + 3.1, 0.3, '#ffffff');   // an eye-spot, because why not
    ctx.restore();
  }
}
// Ceiling colonies over the tide crossing. Each lets go on its own irregular timer,
// with a visible loosening phase; nearby colonies take turns so the raft has room to dodge.
class CeilingBacillus extends Bacillus {
  constructor(col,row=2){
    super(col,row);this.roof=row*TILE;this.y=this.roof+2;this.homeY=this.y;
    this.walker=false;this.vx=0;this.generation=BAC_GENERATIONS;
    this.dropState='cling';this.wait=Math.round(rand(150,390));this.tell=0;
  }
  hitbox(){return this.dropState==='regrow'?null:super.hitbox();}
  update(g){
    this.t++;
    if(this.dropState==='regrow'){
      if(--this.wait<=0){this.y=this.homeY;this.vy=0;this.dropState='cling';this.wait=Math.round(rand(210,480));}
      return;
    }
    if(this.dropState==='cling'){
      const p=g.player,near=p.state==='play'&&Math.abs(p.x+p.w/2-this.cx)<180;
      if(!near)return;
      if(this.wait>0)this.wait--;
      this.tell=clamp((45-this.wait)/45,0,1);
      if(this.wait<=0&&!g.entities.some(e=>e!==this&&e instanceof CeilingBacillus&&e.dropState==='fall'&&Math.abs(e.x-this.x)<180)){
        this.dropState='fall';this.vy=.35;this.tell=0;
      }
      return;
    }
    this.vy=Math.min(2.7,this.vy+.12);this.y+=this.vy;
    if(this.y+this.h>=12*TILE){
      g.burst(this.cx,12*TILE-2,['#9ad25a','#6a9a3a','#c8e890'],5);
      this.y=this.homeY;this.dropState='regrow';this.wait=Math.round(rand(150,280));
    }
  }
  draw(ctx){
    if(this.dropState==='regrow')return;
    if(this.dropState==='cling'){
      const wob=this.tell*Math.sin(this.t*.55)*.65;
      for(const dx of [-5,5])fLine(ctx,this.cx+dx,this.roof,this.cx+dx+wob,this.y+1,'#91b65e',.4);
      ctx.save();ctx.translate(this.cx+wob,this.y+this.h/2);ctx.scale(1,-1);ctx.translate(-this.cx,-this.y-this.h/2);super.draw(ctx);ctx.restore();
    }else super.draw(ctx);
  }
}

function overlapsSolidAt(g, e) { for (const [cx, cy] of [[e.x, e.y], [e.x + e.w - 1, e.y], [e.x, e.y + e.h - 1], [e.x + e.w - 1, e.y + e.h - 1]]) if (g.level.solid(Math.floor(cx / TILE), Math.floor(cy / TILE))) return true; return false; }

// ── the tide: a raft of muscle he steers with his own weight ────────────────
// Stand on its left and it drifts left; on its right, right; stand in the middle and it brakes to a stop.
const TIDE_ACC = 0.05, TIDE_MAX = 1.7, TIDE_BRAKE = 0.88, TIDE_DEAD = 0.3;
class Tide {
  constructor(col0, col1, row, w = 6) {
    this.xa = col0 * TILE; this.xb = col1 * TILE; this.w = w * TILE; this.h = 8; this.base = row * TILE;
    this.x = this.xa; this.y = this.prevY = this.base; this.dx = 0; this.dy = 0; this.t = 0; this.v = 0; this.zone = 0; this.onboard = false;
  }
  update(g) {
    this.t++;
    const ox = this.x, p = g.player, on = p.platform === this && p.onGround && p.state === 'play';
    this.onboard = on;
    if (on) {
      const off = (p.x + p.w / 2 - (this.x + this.w / 2)) / (this.w / 2);   // -1 (far left edge) .. +1 (far right edge)
      this.zone = Math.abs(off) < TIDE_DEAD ? 0 : Math.sign(off);
      if (this.zone) this.v = clamp(this.v + this.zone * TIDE_ACC, -TIDE_MAX, TIDE_MAX);
      else { this.v *= TIDE_BRAKE; if (Math.abs(this.v) < 0.04) this.v = 0; }   // the middle: it brakes to a stop
    } else { this.zone = 0; this.v *= 0.9; if (Math.abs(this.v) < 0.04) this.v = 0; }
    this.x = clamp(this.x + this.v, this.xa, this.xb);
    if (this.x <= this.xa && this.v < 0 || this.x >= this.xb && this.v > 0) this.v = 0;
    this.dx = this.x - ox; this.dy = 0; this.prevY = this.y;
  }
  // A thick, mucus-drenched cushion of visceral muscle floating in the sludge, divided by two shallow creases into
  // three fleshy lobes. Stepping on a lobe depresses the flesh and sends a warm peristaltic flush
  // pulsing through its folds: the movement and lighting are the steering cues.
  draw(ctx){
    const x=fSnap(this.x),y=fSnap(this.y),active=this.onboard?this.zone:2;
    ctx.drawImage(gutMuscleRaftArt(this.w,active),x-2,y-1);
    for(let i=0;i<4;i++){
      const xx=x+10+i*(this.w-20)/3,len=3+(1+Math.sin(this.t*.035+i*1.7))*2;
      ctx.save();ctx.globalAlpha=.38;fLine(ctx,xx,y+17,xx-Math.sign(this.v)*.7,y+17+len,'#dedec9',.55);fEll(ctx,xx-Math.sign(this.v)*.7,y+17+len,.6,.9,'#eee8d2');ctx.restore();
    }
  }
}

// ── sludge spouts: the lake erupts, on a rhythm, after a warning ────────────
const SPOUT_TELL = 100;   // frames of build-up before it blows
class Spout extends Enemy {
  constructor(col, w = 2, top = 6, period = 280, on = 60, offset = 0) {
    super(col * TILE, top * TILE, w * TILE, 12 * TILE - top * TILE);
    this.surf = 12 * TILE; this.period = period; this.on = on; this.f = offset; this.k = 0; this.warn = 0;
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++; this.f++;
    const ph = this.f % this.period, live = ph < this.on, was = this.k;
    this.warn = !live && ph > this.period - SPOUT_TELL ? (ph - (this.period - SPOUT_TELL)) / SPOUT_TELL : 0;   // 0..1 across the whole tell
    this.k = live ? Math.min(1, this.k + 0.25) : Math.max(0, this.k - 0.1);
    if (live && was === 0 && this.x > g.camX - 16 && this.x < g.camX + VIEW_W) { Sound.play('splash'); g.shake = Math.max(g.shake, 2); }
    const p = g.player;
    if (this.k > 0.6 && p.state === 'play' && overlap({ x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 }, { x: this.x + 3, y: this.y + (1 - this.k) * this.h, w: this.w - 6, h: this.h })) g.hurtPlayer();
  }
  // Pressurised sludge fluid, drawn with continuous curves matching POOL.sludge: a rising
  // olive-brown blister, then a torn, murky sludge jet that looks indistinguishable from the lake rising up.
  draw(ctx, g) {
    if (g && (this.x + this.w < g.camX - 20 || this.x > g.camX + VIEW_W + 20)) return;
    const cx=this.x+this.w/2,w=this.w,t=this.t,surf=this.surf,warn=this.warn;
    const shape=(fill,path,stroke=null,width=.65)=>{
      ctx.beginPath();path();ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();}
    };
    const drop=(x,y,r,stretch=1)=>{
      fEll(ctx,x,y,r,r*stretch,'#2e2410');
      fEll(ctx,x-.15,y-.25,r*.72,r*stretch*.77,'#a8983e');
      fEll(ctx,x-r*.22,y-r*.35,r*.24,r*.3,'#d0c068');
    };
    ctx.save();
    if(warn>0){
      const heave=warn*warn*12;
      fGlow(ctx,cx,surf,24,'#a8983e',warn*.22);
      ctx.strokeStyle='#a8983e';ctx.lineWidth=.6;
      for(let i=0;i<2;i++){
        const u=(t*.019+i*.5)%1;ctx.globalAlpha=warn*(1-u)*.7;
        ctx.beginPath();ctx.ellipse(cx,surf+1,7+u*17,1.1+u*2,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.globalAlpha=1;
      const skin=ctx.createLinearGradient(cx, surf-heave, cx,surf+3);
      skin.addColorStop(0,'#a8983e');skin.addColorStop(.38,'#5e4e20');skin.addColorStop(1,'#2e2410');
      shape(skin,()=>{
        ctx.moveTo(cx-w*.44,surf+2);
        ctx.bezierCurveTo(cx-w*.42,surf-heave*.7,cx-w*.23,surf-heave,cx,surf-heave);
        ctx.bezierCurveTo(cx+w*.24,surf-heave,cx+w*.42,surf-heave*.7,cx+w*.44,surf+2);
      },'#241c0c');
      ctx.strokeStyle='#d0c068';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(cx-w*.27,surf-heave*.5);
      ctx.quadraticCurveTo(cx-w*.14,surf-heave*.85,cx-w*.02,surf-heave*.75);ctx.stroke();
      // A widening split and a few short spits make the final pressure unmistakable.
      if(warn>.55){
        ctx.strokeStyle='#d0c068';ctx.lineWidth=.7+warn*.65;
        ctx.beginPath();ctx.moveTo(cx-4,surf-heave*.4);ctx.lineTo(cx-1,surf-heave*.78);
        ctx.lineTo(cx+2,surf-heave*.42);ctx.lineTo(cx+4,surf-heave*.66);ctx.stroke();
      }
      for(let i=0;i<4;i++){
        const u=(t*.025+i*.25)%1,x=cx+(i-1.5)*w*.18;
        const y=surf-heave*.4-Math.sin(u*Math.PI)*(3+warn*8);
        ctx.globalAlpha=Math.sin(Math.PI*u)*warn;drop(x,y,.7+warn*.6,1.2);
      }
      ctx.globalAlpha=1;
    }
    if(this.k<=0){ctx.restore();return;}
    const h=this.h*this.k,top=surf-h,half=w*.35;
    // Broad fluid shading matching the sludge pool (#2e2410 deep, #5e4e20 body, #a8983e top) so the jet is the lake itself rising up.
    if(!this._jetGrad){
      const jet=ctx.createLinearGradient(cx-half,0,cx+half,0);
      jet.addColorStop(0,'#2e2410');jet.addColorStop(.22,'#5e4e20');
      jet.addColorStop(.52,'#a8983e');jet.addColorStop(.76,'#5e4e20');jet.addColorStop(1,'#2e2410');
      this._jetGrad=jet;
    }
    const edge=(side,u)=>cx+side*(half+Math.sin(u*11-t*.17)*1.9+Math.sin(u*21+t*.11)*.75+(1-u)*1.4);
    shape(this._jetGrad,()=>{
      ctx.moveTo(edge(-1,0),surf+1);
      for(let i=1;i<=12;i++){const u=i/12;ctx.lineTo(edge(-1,u),surf-h*u);}
      ctx.quadraticCurveTo(cx,top-3,edge(1,1),top);
      for(let i=11;i>=0;i--){const u=i/12;ctx.lineTo(edge(1,u),surf-h*u);}
    },'#221a0a',.8);
    // Two long ribbons and large surges climb the sludge liquid; no pixel stripes or flashing.
    ctx.save();ctx.beginPath();ctx.rect(cx-half+1,top,w*.66,h);ctx.clip();
    for(let i=0;i<2;i++){
      ctx.strokeStyle=i?'#d0c068':'#a8983e';ctx.lineWidth=i?.8:2;
      ctx.beginPath();
      for(let j=0;j<=16;j++){
        const u=j/16,x=cx+(i?2:-3)+Math.sin(u*9-t*.12+i)*1.5,y=surf-u*h;
        if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      }
      ctx.stroke();
    }
    for(let i=0;i<5;i++){
      const u=(t*.028+i*.2)%1,x=cx+Math.sin(i*2.4+u*4)*half*.42,y=surf-u*h;
      fEll(ctx,x,y,1.5,3,'#78662c');fEll(ctx,x-.3,y-.9,.65,1.4,'#d0c068');
    }
    ctx.restore();
    // The jet breaks into an uneven liquid crown and thin outward-curling streams.
    // Rounded crests and separated falling drops read as spraying sludge, not a solid pillar.
    const crown=()=>{
      ctx.moveTo(cx-half,top+10);
      ctx.bezierCurveTo(cx-half-3,top+2,cx-half-1,top-6,cx-half*.55,top-4);
      ctx.bezierCurveTo(cx-half*.35,top-2,cx-half*.5,top-11,cx-1,top-10);
      ctx.bezierCurveTo(cx+2,top-9,cx+1,top-3,cx+4,top-4);
      ctx.bezierCurveTo(cx+half*.7,top-9,cx+half+3,top-5,cx+half,top+3);
      ctx.quadraticCurveTo(cx+half-1,top+7,cx+half,top+11);
    };
    shape(jet,crown);
    // Outline only the exposed spray, leaving its join to the jet seamless.
    ctx.beginPath();crown();ctx.strokeStyle='#221a0a';ctx.lineWidth=.65;ctx.stroke();
    ctx.strokeStyle='#d0c068';ctx.lineWidth=1.15;
    ctx.beginPath();ctx.moveTo(cx-half*.6,top+1);
    ctx.quadraticCurveTo(cx-half*.55,top-3,cx-half*.4,top-2);
    ctx.moveTo(cx-1,top-8);ctx.quadraticCurveTo(cx+1,top-7,cx+.5,top-3);ctx.stroke();
    for(const side of [-1,1]){
      const tilt=Math.sin(t*.13+side)*1.4;
      ctx.strokeStyle='#a8983e';ctx.lineWidth=1.2;ctx.beginPath();
      ctx.moveTo(cx+side*half*.65,top+2);
      ctx.bezierCurveTo(cx+side*(half+1),top-9,cx+side*(half+6),top-5+tilt,cx+side*(half+5),top+3+tilt);ctx.stroke();
      drop(cx+side*(half+5),top+4+tilt,.8,1.4);
    }
    // Narrow ballistic droplets emphasise the spray's direction and weight.
    for(let i=0;i<7;i++){
      const u=(t*.029+i/7)%1,side=i%2?1:-1;
      const x=cx+side*(3+u*(half+2)),y=top-5-16*u+22*u*u;
      ctx.globalAlpha=Math.min(1,(1-u)*3)*this.k;drop(x,y,.65+(i%3)*.22,1.45);
    }
    ctx.globalAlpha=1;
    fEll(ctx,cx,surf+1,half+4,3,'#2e2410');
    fEll(ctx,cx,surf,half+2,2,'#5e4e20');
    fEll(ctx,cx-1,surf-.5,half*.65,.9,'#d0c068');
    for(const side of [-1,1]){
      const u=(t*.032+(side>0?.5:0))%1;
      drop(cx+side*(half+u*3),surf-4*Math.sin(Math.PI*u),.8,1.2);
    }
    ctx.restore();
  }
}

// ── a column of rising bubbles: green gas that floats him up slowly (never hurts, never makes a sound) ──
class BubbleColumn extends Enemy {
  constructor(col, bottom, top, w = 2) {
    super(col * TILE, top * TILE, w * TILE, (bottom - top) * TILE);
    this.surf = bottom * TILE;
    this.passive = this.noFreeze = true; this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    const p = g.player;
    if (p.state !== 'play' || p.vine || p.inPod) return;
    const pr = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 2 };
    if (!overlap(pr, this)) return;
    // buoyant: gravity is cancelled and he drifts upward, gently (jump still works, and he can steer out sideways)
    p.vy = Math.max(-1.15, p.vy - 0.72);
    p.onGround = false; p.platform = null; p.jumping = false; p.coyote = 0; p.airMax = Math.max(p.airMax || 0, 1.6);
  }
  draw(ctx) {
    // a diffuse, slow-rolling plume of green gas: soft overlapping puffs that drift up and billow sideways, thinning at the top
    const x0 = this.x, w = this.w, h = this.h, t = this.t, n = Math.round(w * h / 190);
    for (let i = 0; i < n; i++) {
      const sp = 0.0016 + (i % 5) * 0.0004, u = (t * sp + i / n) % 1, y = this.surf - u * h;
      const sway = Math.sin(t * 0.012 + i * 2.3) * (w * 0.22) + Math.sin(t * 0.007 + i) * 4, x = x0 + w / 2 + sway + ((i * 37) % 9 - 4);
      const r = 7 + (i % 4) * 3 + Math.round(u * 5), a = Math.min(1, u * 6) * (1 - u) * 0.5;
      ctx.globalAlpha = a * 0.16; gutEllipse(ctx, x, y, r + 3, Math.round((r + 3) * 0.8), '#8ab83a');
      ctx.globalAlpha = a * 0.24; gutEllipse(ctx, x, y, r, Math.round(r * 0.8), i % 2 ? '#a8d050' : '#b8d860');
    }
    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3-4 ROOM 8: THE CLOACA VAULT, its approach (2 screens of digested fecal matter; the vault itself is in gut-vault.js)
// ═══════════════════════════════════════════════════════════════════════════

// ── digested fecal matter ('feces'): realistic brown coils, mounds, and logs ──
class FecalMatter extends Enemy {
  constructor(col, row, kind = 'coil', scale = 1) {
    super(col * TILE, (row + 1) * TILE - 16, 24 * scale, 16);
    this.col = col; this.row = row; this.kind = kind; this.scale = scale;
    this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  draw(ctx) {
    const cx=this.x+8*this.scale,by=(this.row+1)*TILE,art=fecalMatterArt(this.kind,Math.abs(Math.round(this.col))%5);
    ctx.drawImage(art,cx-26*this.scale,by-30*this.scale,art.width*this.scale,art.height*this.scale);
    for(let i=0;i<2;i++){
      const u=(this.t*.007+i*.5+this.col*.13)%1;
      ctx.save();ctx.globalAlpha=(1-u)*.18;
      const x=cx+(i?4:-4)+Math.sin(u*6+this.t*.025+i)*2,y=by-14-u*18;
      fLine(ctx,x,y+3,x+.7,y,'#897648',.6);ctx.restore();
    }
  }
}



const FECAL_MATTER_ART=new Map();
function fecalMatterArt(kind,variant=0){
  const key=kind+':'+variant;if(FECAL_MATTER_ART.has(key))return FECAL_MATTER_ART.get(key);
  const A=mArt(52,34),cx=26,by=30;
  const lobes=kind==='log'?[[-12,-4,8,4.6],[-2,-5,10,5.4],[10,-4,8,4.8]]:
    kind==='wide'?[[-9,-4,12,5],[8,-4,13,5.5],[0,-9,13,5.5]]:
    kind==='tall'?[[0,-4,12,5.5],[-3,-11,10,6],[2,-18,7.5,5.8]]:
    [[-6,-4,12,5],[7,-5,11,5.5],[-4,-10,10,5.8],[3,-13,8,4.8]];
  A.fill(0,0,52,34,(x,y)=>{
    let best=-Infinity,U=0,V=0;
    for(const [ox,oy,rx,ry] of lobes){
      const u=(x-cx-ox)/rx,v=(y-by-oy)/ry,d=u*u+v*v;
      if(d<=1){const z=Math.sqrt(1-d)*ry;if(z>best){best=z;U=u;V=v;}}
    }
    if(best===-Infinity)return null;
    const tone=fecalSurface(x+variant*53,y+variant*19,U,V,Math.min(8,best));
    const t=tone*(FECAL_TONES.length-1),i=Math.min(FECAL_TONES.length-2,Math.floor(t));
    const a=FECAL_TONES[i],b=FECAL_TONES[i+1],f=t-i;
    return '#'+a.map((c,k)=>Math.round(c+(b[k]-c)*f).toString(16).padStart(2,'0')).join('');
  });
  A.outline('#2b190e',1);
  const art=A.canvas();FECAL_MATTER_ART.set(key,art);return art;
}

function gutMuscleRaftArt(w,active){
  const key='muscleRaftRedraw'+w+':'+active;if(GS_CACHE.has(key))return GS_CACHE.get(key);
  const A=mArt(w+4,25),third=w/3,C=['#6b3248','#a15b70','#c78c9a','#e0b7bd','#efd7d2'];
  A.fill(0,0,w+4,23,(x,y)=>{
    const xx=x-2,edge=Math.min(xx,w-xx);if(edge<0)return null;
    const end=edge<6?6-Math.sqrt(Math.max(0,36-(6-edge)**2)):0,lobe=xx<third?-1:xx<third*2?0:1;
    const cleft=Math.min(Math.abs(xx-third),Math.abs(xx-third*2)),top=1+end+(active===lobe?.8:0)+Math.max(0,1-cleft/3)*.8;
    const bottom=20-end+Math.sin(xx*.12)*.5-Math.max(0,1-cleft/3);
    if(y<top||y>bottom)return null;const v=(y-top)/(bottom-top);
    let tone=.7-v*1.2+Math.sin(xx*.09+v*1.5)*.1;
    const crease=Math.min(Math.abs(xx-third-Math.sin(y*.2)*1.2),Math.abs(xx-third*2-Math.sin(y*.2+.7)*1.2));
    if(crease<1.1)tone-=.24*(1-crease/1.1);if(y-top<.55)tone+=.3;
    if(active===lobe)tone+=.1;return softTone(C,tone);
  });
  for(let i=0;i<7;i++){
    const x=8+i*(w-16)/6,y=8+(i%3)*2;
    A.line(x,y,x+2,y+3,'#b4788e',true,.34);A.line(x+2,y+3,x+1.5,y+6,'#b4788e',true,.34);A.line(x+2,y+3,x+4,y+2,'#bc899a',true,.34);
    A.soft(x,4,2.6,.45,['#d0a8b3','#e0c1c6','#ece0d5','#f4eade','#fff6e9'],true,-.2);
  }
  const art=A.outline('#653646',1).canvas();GS_CACHE.set(key,art);return art;
}
