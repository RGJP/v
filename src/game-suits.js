'use strict';
// Part of class Game (see game.js): GameSuits
class GameSuits {
  // ---------- suits ------------------------------------------------------------
  updatePowers(p) {
    if(p.power!==2||p.suit!=='volt'||p.state!=='play')p.voltWindup=0;
    if (p.cool > 0) p.cool--;
    if (p.wand > 0) p.wand--;
    if (p.hammerT > 0) p.hammerT--;
    if (p.state !== 'play') { p.charge = 0; p.pounding = false; return; }
    this.updatePound(p);
    if (p.power !== 2) { p.charge = 0; return; }
    switch (p.suit) {
      case 'ice': this.updateIce(p); break;
      case 'gale': this.updateGale(p); break;
      case 'volt': this.updateVolt(p); break;
      case 'quake': this.updateQuake(p); break;
      default: this.updateChili(p);
    }
  }
  // Every breath/shot starts at the visible beak, including crouching and left-facing poses.
  spitOrigin(p) {
    return {x:p.facing>0?p.x+p.w-1:p.x+1,y:p.y+p.h*(p.crouch?0.5:0.57)};
  }
  // Ice breath: tap run to spit a frost bolt; frozen foes become blocks (see IceBlock).
  updateIce(p) {
    p.charge = 0;
    if (this.held || !Input.hit('run')) return;
    if (this.fireballs.filter(f => f instanceof IceBolt).length >= 2) return;
    const mouth=this.spitOrigin(p),x=mouth.x-(p.facing<0?8:0),y=mouth.y-4;
    this.fireballs.push(new IceBolt(x, y, p.facing));
    p.wand = 8;
    Sound.play('iceshot');
    for (let i = 0; i < 5; i++) this.spark(x + 4, y + 4, i % 2 ? '#ffffff' : '#7fd4ff', 16, p.facing * rand(0.3, 1.5), rand(-0.8, 0.8));
  }
  freezeEnemy(e) {
    if (e === this.boss || !canFreeze(e)) return;
    const ib = new IceBlock(e);
    e.dead = true; e.remove = true;
    this.entities.push(ib);
    this.addScore(100, e.cx, e.y);
    this.burst(e.cx, e.y + e.h / 2, ['#ffffff', '#bff0ff', '#7fd4ff'], 12);
    Sound.play('freeze');
  }
  // Gale feather: tap run to loose a gust, hold jump to glide (its mid-air flap, a stronger one, is in physics()).
  updateGale(p) {
    p.charge = 0;
    const lv = this.level;
    if (p.gustCool > 0) p.gustCool--;
    if (p.gliding && this.t % 5 === 0) this.spark(p.x + p.w / 2 + rand(-9, 9), p.y + 8, '#d8ffe4', 16, -p.facing * 0.4, rand(-0.2, 0.3));
    if (!this.held && Input.hit('run') && p.gustCool === 0) {
      p.gustCool = 24; p.wand = 8;
      const mouth=this.spitOrigin(p);
      this.fireballs.push(new Gust(mouth.x,mouth.y,p.facing));
      Sound.play('whoosh');
    }
  }
  // One tap commits to a half-second wind-up, then one long-range strike.
  // Holding or releasing the button never stores charge or creates a storm.
  updateVolt(p) {
    p.charge=0;
    if(this.held){p.voltWindup=0;return;}
    if(p.voltWindup>0){
      p.voltWindup--;
      if(p.voltWindup===0){this.fireVolt(p);return;}
      // a huge gathering of energy: streaks of sparks pour in from all around and crackle over his body
      const cx=p.x+p.w/2,cy=p.y+p.h/2,u=1-p.voltWindup/VOLT_WINDUP;
      for(let k=0;k<3;k++){
        const a=rand(0,Math.PI*2),r=rand(34,58)*(1-u*.35);
        this.particles.push({kind:'spark',x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,vx:-Math.cos(a)*r/11,vy:-Math.sin(a)*r/11,
          g:0,life:11,t:0,color:k%2?'#ffe675':'#fff9cf'});
      }
      return;
    }
    if(Input.hit('run')&&p.cool===0){p.voltWindup=VOLT_WINDUP;Sound.play('chargeUp');}
  }
  voltTargets() {
    const out = [];
    for (const e of this.entities) {
      if (e.dead || e.remove || e.bossHazard || e === this.held || !(e.fireKill || e.fireHit)) continue;
      const b = e.hitbox();
      if (!b) continue;
      const x = b.x + b.w / 2, y = b.y + b.h / 2;
      out.push({ e, x, y });
    }
    return out;
  }
  voltHit(e, big) {
    if (e.fireHit) { if (e.fireHit(this, big ? 3 : 1) === false) return; }
    else e.flipKill(this, Math.sign(e.cx - this.player.x) || 1);
    this.addScore(big ? 300 : 200, e.cx, e.y);
    this.burst(e.cx, e.y + e.h / 2, ['#fff6a0', '#7ad7ff', '#ffffff'], 8);
    const p = this.player;
    if (!Number.isInteger(p.voltHits)) p.voltHits = VOLT_HITS;
    if (--p.voltHits <= 0) this.spendVolt(p);
  }
  // the fifteenth zap that connects spends the ElecChik hat: it pops off and leaves him plain big
  spendVolt(p) {
    p.voltHits = 0; p.voltWindup = 0; p.charge = 0; p.cool = 0;
    p.power = 1; p.suit = null;
    this.popHat('volt');
    this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffe675', '#fff9cf', '#7ad7ff'], 16);
    this.popup(p.x + p.w / 2, p.y - 12, 'CHARGE SPENT!', '#ffe14d');
    Sound.play('shrink');
  }
  fireVolt(p) {
    const dir=p.facing,mouth=this.spitOrigin(p),ox=mouth.x,oy=mouth.y;
    const all = this.voltTargets();
    const front=all.filter(c=>(c.x-ox)*dir>0&&Math.abs(c.x-ox)<=VOLT_RANGE&&Math.abs(c.y-oy)<55)
      .sort((a,b)=>Math.hypot(a.x-ox,a.y-oy)-Math.hypot(b.x-ox,b.y-oy));
    const pts=[[ox,oy]];
    if(front.length){const target=front[0];pts.push([target.x,target.y]);this.voltHit(target.e,false);}
    else pts.push([ox+dir*VOLT_RANGE,oy]);
    this.fireballs.push(new Zap(pts));
    p.cool = 12; p.wand = 8;
    this.burst(ox, oy, ['#fff6a0', '#7ad7ff'], 5);
    Sound.play('volt');
  }
  // Ground pound, for everyone: press down in mid-air to hang for a beat, then drop straight down.
  // Whatever it lands on reacts exactly as to an ordinary stomp (spiky foes still hurt).
  updatePound(p) {
    if (p.pounding) {
      if (p.poundT > POUND_HANG) {
        this.spark(p.x + p.w / 2 + rand(-4, 4), p.y + rand(0, p.h), this.t % 2 ? '#ffd166' : '#c9c4d8', 12, rand(-0.3, 0.3), -1.5);
      } else if (p.poundT === 1) Sound.play('flap');
      return;
    }
    if (!p.onGround && !(p.dropT > 0) && !p.vine && !p.inPod && !p.blast && !(p.floatT > 0) && !this.wet(p.x + p.w / 2) && !this.held && Input.hit('down')) {
      // Stop the jump's rise so physics won't mistake it for a bounce out of the pound.
      p.vy = 0;
      p.pounding = true; p.poundT = 0; p.spin = false; p.jumping = false; p.gliding = false; p.vx = 0; p.sx = 1.15; p.sy = 0.85; p.hammerT = 0;
      Sound.play('tuck');
    }
  }
  // Hammeroo: Chickaroo swings a big mallet with his front wing. Tap run to whack whatever's in
  // front of him: foes (even spiky ones) go flying, bricks shatter, blocks get bonked.
  updateQuake(p) {
    p.charge = 0;
    if (p.hammerT === HAMMER_SWING - HAMMER_HIT) this.hammerStrike(p);
    if (p.pounding || this.held || p.cool > 0 || !Input.hit('run')) return;
    p.hammerT = HAMMER_SWING; p.cool = HAMMER_COOLDOWN;
    Sound.play('swing');
  }
  // the business end of the swing lands a few frames in: hit everything in the arc
  hammerStrike(p) {
    const f = p.facing, box = { x: f > 0 ? p.x + p.w - 2 : p.x - 46, y: p.y - 14, w: 48, h: p.h + 16 };   // the long mallet reaches three tiles out
    let hit = false;
    for (const e of this.entities) {
      if (e.dead || e.remove) continue;
      const eb = e.hitbox();
      if (!eb || !overlap(box, eb)) continue;
      if (e instanceof Chime) { e.ring(this); hit = true; continue; }
      if (e.friendly) continue;
      if (e.fireHit) { e.fireHit(this, 2); hit = true; continue; }
      if (e.bossHazard || !(e.fireKill || e.stompable)) continue;
      e.flipKill(this, f); e.vx = f * 2.5;
      this.stompScore(e);
      this.burst(e.cx, e.y + e.h / 2, ['#ffd166', '#c9c4d8', '#ffffff'], 8);
      hit = true;
    }
    const lv = this.level, c = Math.floor((f > 0 ? box.x + box.w - 2 : box.x + 2) / TILE);
    for (let r = Math.floor(box.y / TILE); r <= Math.floor((box.y + box.h - 1) / TILE); r++) {
      const t = lv.get(c, r);
      if (t === T.BRICK) { lv.set(c, r, T.EMPTY); this.breakBrick(c, r); hit = true; }
      else if (t === T.QCOIN || t === T.QPOW || t === T.Q1UP || t === T.MULTI) { this.hitBlock(c, r); hit = true; }
      else if (lv.solid(c, r)) hit = true;
    }
    if (hit) { Sound.play('hammerHit'); this.burst(box.x + (f > 0 ? box.w : 0), p.y + p.h / 2, ['#ffffff', '#ffd166'], 5); }
  }
  // landing a pound is just a firm landing: a puff of dust, no shockwave
  // the ground pound lands: a little stomp. A squash, a thud (and a short rumble), the ground giving a small jolt, and
  // dust kicked out flat along the ground both ways
  poundLand(p) {
    p.pounding = false; p.poundT = 0;
    p.sx = 1.3; p.sy = 0.7;
    const x = p.x + p.w / 2, y = p.y + p.h;
    this.dust(x, y, 4);
    for (let i = 0; i < 10; i++) {
      const s = i % 2 ? 1 : -1, v = 0.8 + (i >> 1) * 0.35;
      this.particles.push({ kind: 'px', x: x + s * 3, y: y - 1 - (i % 3), vx: s * v, vy: -0.25 - (i % 3) * 0.15, g: 0.03, drag: 0.9, life: 18 + (i % 4) * 3, t: 0, color: i % 3 ? '#e8dcc0' : '#ffffff', size: i % 4 ? 1 : 2 });
    }
    this.shake = Math.max(this.shake, 2);
    Sound.play('stompland');
  }

}
mixin(Game, GameSuits);
