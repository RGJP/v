'use strict';
const SELECT_COLS = 5, SELECT_ROWS = 4;
// Part of class Game (see game.js): GameHud
class GameHud {
  // One-hit protection: a little gold radiance and wandering glints, sized to the visible body.
  drawShield(ctx, p, img) {
    const iw = img ? img.width : 16, ih = img ? img.height : p.h;
    const cx = p.x + p.w / 2, cy = p.y + p.h - ih / 2, r = Math.max(iw, ih) / 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.055);
    ctx.save();
    fGlow(ctx, cx, cy, r + 6, '#ffd777', 0.1 + pulse * 0.035);
    fGlow(ctx, cx, cy + 2, r * 0.7, '#fff0b8', 0.035);
    for (let i = 0; i < 4; i++) {
      const u = (this.t * 0.008 + i * 0.25) % 1, shine = Math.sin(u * Math.PI);
      const side = i % 2 ? 1 : -1;
      const x = cx + side * (r * 0.7 + Math.sin(u * 5 + i) * 2), y = cy + ih * 0.45 - u * ih * 0.9;
      ctx.globalAlpha = shine * 0.8;
      fSparkle(ctx, x, y, 0.7 + shine * 1.1, i % 2 ? '#ffe298' : '#fff6d5');
    }
    ctx.restore();
  }
  drawPlayer(ctx) {
    const p = this.player;
    if (!p || p.hidden || p.inPod) return;
    if (p.state === 'dead') { drawSprite(ctx, SPR.die, p.x + p.w / 2, p.y + p.h + 1, false); return; }
    if (p.state==='play'&&!p.finaleLocked&&!this.band?.finale&&p.invuln > 0 && this.freezeT === 0 && (p.invuln >> 2) % 2 === 0) return;
    let power = p.power;
    if (this.freezeT > 0 && !(this.freezeFrom >= 2 && p.power < this.freezeFrom)) power = Math.floor(this.freezeT / 4) % 2 ? this.freezeFrom : p.power;   // (a popped hat doesn't flicker back onto his head)
    const full = p.charge >= CHARGE_FULL;
    if (p.charge >= CHARGE_MID && p.state === 'play') {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, pulse = Math.sin(this.t * (full ? 0.5 : 0.3));
      const volt = p.suit === 'volt';
      ctx.globalAlpha = full ? 0.35 + pulse * 0.12 : 0.22 + pulse * 0.08;
      fBlob(ctx, cx, cy, full ? 20 + pulse * 2 : 15, volt ? (full ? '#fff6a0' : '#7ad7ff') : full ? '#ffd166' : '#ff8a2a');
      ctx.globalAlpha = full ? 0.5 : 0.3; fBlob(ctx, cx, cy, full ? 12 : 9, volt ? '#ffffff' : full ? '#ffffff' : '#ffb347');
      ctx.globalAlpha = 1;
    }
    const suit = p.suit || 'fire';
    if(power===2&&suit==='volt'&&p.voltWindup>0&&p.state==='play'){
      // the wind-up: a big ball of energy swelling around his whole body, forked arcs crackling over it
      const cx=p.x+p.w/2,cy=p.y+p.h/2,u=1-p.voltWindup/VOLT_WINDUP,sd=Math.floor(this.t/3);
      fGlow(ctx,cx,cy,26+u*34,'#ffe675',.3+u*.4);
      fGlow(ctx,cx,cy,14+u*18,'#ffffff',.25+u*.45);
      const hash=n=>{const v=Math.sin(n*127.1+sd*311.7)*43758.5453;return v-Math.floor(v);};
      for(let k=0;k<3+Math.floor(u*4);k++){
        let a=hash(k+1)*Math.PI*2,x=cx,y=cy;const len=14+u*26;
        for(let s=1;s<=4;s++){
          a+=(hash(k*9+s)-.5)*1.4;const nx=cx+Math.cos(a)*len*s/4,ny=cy+Math.sin(a)*len*s/4+(hash(k*5+s+20)-.5)*4;
          fLine(ctx,x,y,nx,ny,'#ffe675',1.6);fLine(ctx,x,y,nx,ny,'#ffffff',.7);x=nx;y=ny;
        }
      }
      fSparkle(ctx,cx,cy,4+u*8,'#fff9cf');
    }
    let set = power === 0 ? SPR.small : power === 1 ? SPR.big : suit === 'fire' ? (full && (this.t >> 2) % 2 ? SPR.hot : SPR.fire) : SPR.suit[suit];
    const swimming = this.level && (this.wet(p.x + p.w / 2) || (this.level.roomTheme && this.level.roomTheme[clamp(Math.floor((p.x + p.w / 2) / TILE), 0, this.level.w - 1)] === 'ocean'));
    if (swimming && set.mask) set = set.mask;
    if (p.state === 'play' && ((this.dialog && this.dialog.cloacolithIntro) || p.finaleLocked)) {
      // Hold his wide-eyed, forward-looking reaction throughout every opening page.
      const img = (set.shockAhead && set.shockAhead.idle) || set.idle;
      drawSprite(ctx, img, p.x + p.w / 2, p.y + p.h, p.finaleLocked && p.facing < 0);
      this.drawChickMucus(ctx, p.x + p.w / 2, p.y + p.h, p);
      if (this.shield) this.drawShield(ctx, p, img);
      return;
    }
    if ((p.roll > 0 || p.blast > 0) && p.state === 'play') {
      // rolling, or curled up in a ball shooting out of a gulp pod: tucked into a ball that turns with how far it's
      // rolled (p.rollSpin), the light staying put. The first few frames of a roll he's still tucking in (crouched)
      if (p.roll > 0 && (p.rollAge || 0) < 3) { drawSprite(ctx, set.crouch, p.x + p.w / 2, p.y + p.h + 1, p.rollDir < 0); return; }
      const f = (p.blast > 0 ? p.vx : p.rollDir) < 0 ? 1 : 0, step = Math.PI * 2 / BALL_STEPS;
      const k = ((Math.round(p.rollSpin / step) % BALL_STEPS) + BALL_STEPS) % BALL_STEPS, img = set.ball[f][k];
      const squash = p.roll > 0 && p.rollAge < 6 ? 1 - (6 - p.rollAge) * 0.03 : 1;   // (a little squash as he tucks in)
      const bottom = p.blast > 0 ? p.y + p.h / 2 + img.height / 2 : p.y + p.h + img.height / 2 - set.ballR - 1;   // (the ball's outline on the ground; in flight, centred)
      drawSprite(ctx, img, p.x + p.w / 2, bottom, false, 2 - squash, squash);
      if (this.shield) this.drawShield(ctx, p, set.crouch);
      return;
    }
    if (p.ladder && p.state === 'play') {   // on a ladder: his back to us, swapping sides rung by rung
      const img = set.spinBack || set.jump;
      drawSprite(ctx, img, p.x + p.w / 2, p.y + p.h, ((p.climbA || 0) / 6 | 0) % 2 === 1);
      if (this.shield) this.drawShield(ctx, p, img);
      return;
    }
    if (this.band && this.band.finale && p.state === 'play') {
      const pose = this.bayouPlayerPose(), happySet = set.happy || set;
      drawSprite(ctx, happySet[pose.f] || set[pose.f] || set.blush || set.idle, p.x + p.w / 2 + pose.dx, p.y + p.h + pose.dy, pose.flip, pose.sx, pose.sy);
      return;
    }
    if (p.state === 'celebrate' || (p.state === 'done' && !p.hidden)) {
      drawSprite(ctx,set.relic,p.x+p.w/2,p.y+p.h,false);
      return;
    }
    let f = this.t % 200 < 7 ? 'blink' : 'idle', bob = 0;
    if (p.vine) f = Math.abs(p.vx) > 1.2 ? 'jump' : 'fall';   // hanging from the vine by his beak
    else if (p.crouch) f = 'crouch';
    else if (p.pounding) f = 'fall';
    else if (p.gliding && suit==='gale') f='glide';
    else if (!p.onGround && swimming) f = p.stroke > 6 ? 'swimA' : 'swimB';
    else if (!p.onGround && p.spin) f = 'jump';
    else if (!p.onGround && p.flapT > 0) f = (p.flapT >> 2) % 2 ? 'flap' : 'jump';   // the mid-air flap: two quick wingbeats
    else if (!p.onGround) f = p.vy > 1 ? 'fall' : 'jump';
    else if (p.skid) f = 'skid';
    else if (Math.abs(p.vx) > 0.15) { const k = Math.floor(p.anim) % 4; f = 'run' + k; bob = k % 2; }
    if (p.onGround && this.t - (p.strainT || -9) < 3) f = 'strain';   // shoving a statue: > <
    const asleep = (f === 'idle' || f === 'blink') && p.state === 'play' && p.idleT > SLEEP_AFTER;
    if (asleep) f = 'sleep';
    if (p.bowT > 0 && p.bowT <= p.blushAt && p.onGround && set.blush) f = 'blush';   // taking a bow: he blushes a second into the ovation
    const whirl = p.spin && !p.onGround && p.state === 'play';
    if (whirl) {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, a0 = this.t * 0.6;
      for (let i = 0; i < 10; i++) {
        const a = a0 + i * 0.35, r = p.power ? 15 : 12;
        ctx.globalAlpha = 0.15 + i * 0.07;
        fEll(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.45, 1.2, 0.5, '#ffffff');
      }
      ctx.globalAlpha = 1;
    }
    // teetering on top of a snowball: wide-eyed, windmilling his wings, swaying off the crown and
    // slipping a little way down its curve each time, scrambling his feet once it rolls; a bead of sweat
    const ball = p.state === 'play' && p.onGround && p.platform instanceof Snowball && p.platform.state !== 'gone' && !asleep;
    let sway = 0, flipBall = null, sink = 0;
    if (ball) {
      const sb = p.platform, rolling = sb.state === 'roll', k = Math.sin(this.t * (rolling ? 0.2 : 0.11));
      sway = Math.round(k * 3);
      sink = Math.round(sway * sway / (sb.r * 0.8));
      f = Math.floor(this.t / (rolling ? 4 : 7)) % 2 ? 'teeterA' : 'teeterB';   // the flailing quickens as it rolls
      if (rolling) bob = Math.floor(Math.abs(sb.spin) * sb.r / 5) % 2;          // little hops, as fast as the ball spins
      // rolling, he stares ahead at where it's taking him; with an avalanche on his tail he keeps
      // glancing back at it (on and off)
      if (rolling) {
        const back = p.facing > 0 && this.t % 110 < 40 && this.entities.some(e => e instanceof Avalanche && e.state === 'run');
        f = (back ? 'look' : 'ahead') + (f === 'teeterA' ? 'A' : 'B');
      }
      else if (Math.abs(k) > 0.8) flipBall = k > 0;                           // he leans back the way he's tipping
    }
    const ccx = p.x + p.w / 2 + sway, spinQ = Math.floor(this.t / 6) % 4, flip = whirl ? spinQ === 2 : flipBall != null ? flipBall : p.facing < 0;
    if (whirl) f = ['jump', 'spinFront', 'jump', 'spinBack'][spinQ];   // side, front, other side, back
    const gale = power === 2 && suit === 'gale' && !p.onGround && p.state === 'play';
    if (gale) this.drawWings(ctx, p, p.gliding ? 0 : Math.sin(this.t * 0.5) * 2);
    // GRUBBLE on his tail (3-1): running for his life like from the avalanche, eyes wide, glancing back over his shoulder
    const fleeing = p.state === 'play' && set.shockBack && this.entities.some(e => e instanceof Sandworm && e.state === 'run');
    const shockSet = this.dialog && this.dialog.speaker && p.state === 'play' && (
      this.dialog.speaker.shockUp ? (set.shockUp || set.shock) :
      this.dialog.speaker.shock === 'shockUp' ? (set.shockUp || set.shock) :
      this.dialog.speaker.shock ? (set[this.dialog.speaker.shock] || set.shock) : null
    );
    const burping = p.burpT > 0 && p.state === 'play';
    const chewing = p.chewT > 0 && p.state === 'play' && !burping;
    const chewSet = chewing ? set[(p.chewPhase >> 2) % 2 ? 'chewClosed' : 'chewOpen'] : null;
    const spitting=power===2&&suit!=='quake'&&p.wand>0&&p.state==='play';
    const frame = spitting ? (set.chewOpen[f] || set.chewOpen.idle)
      : burping ? (set.burp[f] || set.burp.idle)
      : chewSet ? (chewSet[f] || chewSet.idle)
      : shockSet ? (shockSet[f] || set[f])   // (wide-eyed while he's saying it)
      : p.hotFoot > 0 && p.state === 'play' ? (set.hotFoot[f] || set[f])
      : p.sand > 0 && p.state === 'play' && set.shockDown ? (set.shockDown[f] || set.shockDown.idle)
      : p.gaze > 0 && p.state === 'play' && set.shockAhead ? (set.shockAhead[f] || set[f])   // (staring at the tapeworm's head)
      : fleeing ? ((p.facing > 0 && this.t % 110 < 40 ? set.shockBack[f] : set.shockAhead[f]) || set[f])
      : set[f];
    if (f === 'swimA' || f === 'swimB') {
      // swim stance: the stroke frames carry the lean, bobbing gently
      // drawn upright (rotating 16px pixel art blurs or mangles it); the bob moves whole pixels
      drawSprite(ctx, frame, ccx, p.y + p.h + 2 + Math.round(Math.sin(this.t * 0.1)), flip);
    } else {
      const belch = burping ? Math.max(0, Math.sin((66 - p.burpT) * 0.6)) * Math.min(1, p.burpT / 12) : 0;
      drawSprite(ctx, frame, ccx, p.y + p.h - bob + sink, flip, (whirl ? 0.92 : p.sx) * (1 + belch * 0.16), p.sy * (1 - belch * 0.08));
    }
    this.drawChickMucus(ctx, ccx, p.y + p.h - bob + sink, p);
    if (p.hotFoot > 0 && p.state === 'play') {   // fresh off the coals: little flames licking at his feet, a bead of sweat
      const k = p.hotFoot / 24, fy = p.y + p.h + 1, fx = ccx;   // (little teardrop flames, in fine pixels)
      for (let i = -1; i <= 1; i++) {
        const h = (2 + Math.sin(this.t * 0.4 + i * 2) * 0.8 + 0.8) * k + 1.2, x0 = fx + i * 3;
        fPoly(ctx, [[x0 - 1.2, fy], [x0 + 1.2, fy], [x0 + 0.9, fy - h * 0.5], [x0, fy - h - 0.4], [x0 - 0.9, fy - h * 0.5]], '#ff6a1f');
        fPoly(ctx, [[x0 - 0.5, fy], [x0 + 0.5, fy], [x0 + 0.4, fy - h * 0.4], [x0, fy - h * 0.7], [x0 - 0.4, fy - h * 0.4]], '#ffe08a');
      }
      if (p.hotFoot > 12) fEll(ctx, fx - p.facing * 6 + 0.5, p.y + 3 + ((24 - p.hotFoot) >> 2), 0.6, 1, '#9fe3ff');
    }
    if (ball) this.drawSweat(ctx, ccx - (flip ? -1 : 1) * (power ? 8 : 7), p.y + sink - bob + (power ? 3 : 1));
    if (power === 2 && suit === 'quake' && p.state === 'play' && !swimming && !p.vine && f !== 'sleep') this.drawHammer(ctx, p);
    if (asleep) this.drawZzz(ctx, p);
    if (this.shield && p.state === 'play') this.drawShield(ctx, p, set[f] || set.idle);
    if (p.pounding && p.poundT > POUND_HANG) {
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) fRoundRect(ctx, ccx - 3.2 + i * 3, p.y - 8 - i * 3, 0.8, 7, 0.4, '#ffd166');
      ctx.globalAlpha = 1;
    }
  }
  // A kawaii bead of sweat by his head: it swells, slides down a few pixels, and a fresh one forms
  drawSweat(ctx, x, y) {
    const k = this.t % 36, dy = k < 12 ? 0 : Math.min(6, (k - 12) >> 2), a = k > 30 ? (36 - k) / 6 : 1;
    x = Math.round(x) + 0.5; y = Math.round(y) + dy;
    ctx.globalAlpha = a;
    // a teardrop: pointed top, round bottom, outlined, with a shine (fine: hires.js)
    fBlob(ctx, x, y + 1.6, 2.6, INK); fPoly(ctx, [[x, y - 2.6], [x + 2.2, y + 0.6], [x - 2.2, y + 0.6]], INK);
    fBlob(ctx, x, y + 1.6, 1.8, '#9fe3ff'); fPoly(ctx, [[x, y - 1.4], [x + 1.4, y + 0.8], [x - 1.4, y + 0.8]], '#9fe3ff');
    fEll(ctx, x - 0.7, y + 1.4, 0.45, 0.7, '#ffffff');
    ctx.globalAlpha = 1;
  }
  // Hammeroo's mallet, its long handle clamped in his beak: held up and forward at rest, then wound
  // back and brought crashing down in front of him on a swing. Drawn point by point (no blurry rotation).
  drawHammer(ctx, p) {
    const f = p.facing, hx = p.x + p.w / 2 + f * 5, hy = p.y + p.h * 0.62, L = 28;
    let a = 0.45 + Math.sin(this.t * 0.08) * 0.05;
    if (p.pounding) a = -0.2;
    else if (p.hammerT > 0) {
      const k = 1 - p.hammerT / HAMMER_SWING, w = HAMMER_HIT / HAMMER_SWING;
      a = k < w ? 0.45 - 1.9 * (k / w) : Math.min(2.2, -1.45 + 3.65 * ((k - w) / 0.15));
      if (k >= w && k < w + 0.3) {   // the whoosh arc
        ctx.globalAlpha = 0.45; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();   // (fine stroke)
        for (let b = -1.2; b < a; b += 0.06) ctx.lineTo(hx + f * Math.sin(b) * (L + 3), hy - Math.cos(b) * (L + 3));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    const ex = hx + f * Math.sin(a) * L, ey = hy - Math.cos(a) * L;
    fLine(ctx, hx - f * 3, hy, ex, ey, INK, 8);
    fLine(ctx, hx - f * 3, hy, ex, ey, '#855633', 4);
    fLine(ctx, hx - 0.3, hy - 0.3, ex - 0.3, ey - 0.3, '#dbb078', 1);
    // The same bevelled steel head as the pickup, turned with the swing.
    ctx.save(); ctx.translate(fSnap(ex), fSnap(ey)); ctx.rotate(a * f);
    ctx.drawImage(powerMalletHeadArt(), -8, -5.5); ctx.restore();
  }
  // Sleeping: Z's drift up and away from Chickaroo's head, swaying, growing and fading as they rise.
  drawZzz(ctx, p) {
    const T = p.idleT - SLEEP_AFTER, hx = p.x + p.w / 2 + p.facing * 3, hy = p.y - 2;
    for (let i = 0; i < 4; i++) {
      const age = T - i * 30;
      if (age < 0) continue;
      const k = (age % 120) / 120;                       // each Z lives 2 s, a new one every half second
      const x = Math.round(hx + p.facing * (2 + k * 14) + Math.sin(k * 7 + i) * 2), y = Math.round(hy - k * 26);
      ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      const stage = k < 0.33 ? 0 : k < 0.66 ? 1 : 2;
      drawZ(ctx, x - stage, y - stage * 2, '#edf3ff', [5, 7, 9][stage]);   // (painted fine: sprites-fine.js)
    }
    ctx.globalAlpha = 1;
  }
  // Small prop (wand, mallet, orb) held out in front of the chick's hand.
  drawHeldIcon(ctx, p, img, size, dx, rot, behind) {
    const hx = p.x + p.w / 2 + p.facing * (p.w / 2 + dx - (behind ? 8 : 0)), hy = p.y + (p.crouch ? 6 : 12) + (behind ? -4 : 0);
    ctx.save();
    ctx.translate(Math.round(hx), Math.round(hy));
    ctx.scale(p.facing, 1);
    ctx.rotate(rot);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  // Glideboi's fabric panels stretch from beneath the arms down to the hips, behind the body.
  drawWings(ctx,p,bob) {
    const cx=p.x+p.w/2,top=p.y+7,hip=p.y+p.h-4,spread=p.gliding?1:0.78+Math.sin(this.t*0.25)*0.07;
    for(const side of [-1,1]){
      const pt=(x,y)=>[cx+side*x*spread,y];
      const panel=[[5,top+1],[17,top],[15.5,top+7],[10.5,hip-1],[4,hip]].map(([x,y])=>pt(x,y));
      fPoly(ctx,panel,'#244f4a');
      fPoly(ctx,[[5.2,top+1.5],[16.1,top+0.8],[14.8,top+6.5],[10,hip-1.5],[4.8,hip-0.7]].map(([x,y])=>pt(x,y)),'#69a98b');
      fPoly(ctx,[[5.5,top+2],[15.9,top+1],[10.1,hip-2],[5,hip-1]].map(([x,y])=>pt(x,y)),'#a4d1ac');
      fLine(ctx,...pt(6,top+1.6),...pt(15.9,top+0.9),'#e3edc7',2);
      fLine(ctx,...pt(15.9,top+0.9),...pt(10.1,hip-1.5),'#4b8e77',1);
      fLine(ctx,...pt(6.8,top+2),...pt(8.5,hip-1),'#6ba98d',1);
      fLine(ctx,...pt(11.1,top+1.5),...pt(9.2,hip-1.5),'#d4e6bd',1);
    }
  }

  drawParticles(ctx) {
    const d = this.dialog;
    if (d && !d.tip && this.mode === 'play' && d.speaker && !d.speaker.remove) {   // a little bobbing marker over whoever's talking (a note from the author has nobody)
      const x = Math.round(d.speaker.cx), y = Math.round(d.speaker.talkY != null ? d.speaker.talkY : d.speaker.y) - 7 - ((this.t >> 3) % 2);   // (talkY: the top of its head, if that isn't its hitbox)
      ctx.fillStyle = INK; ctx.beginPath();
      for (let i = 0; i < 13; i++) ctx.rect(fSnap(x - 4.5 + i / 3), fSnap(y - 1.3 + i / 3), fSnap(9.6 - i * 2 / 3), 1 / 3);
      ctx.fill();
      ctx.fillStyle = d.color; ctx.beginPath();
      for (let i = 0; i < 10; i++) ctx.rect(fSnap(x - 3.4 + i / 3), fSnap(y - 0.7 + i / 3), fSnap(7.4 - i * 2 / 3), 1 / 3);
      ctx.fill();
    }
    for (const q of this.particles) {   // (all in fine pixels: hires.js)
      const x = fSnap(q.x), y = fSnap(q.y);
      switch (q.kind) {
        case 'heart': {
          ctx.globalAlpha = Math.min(1, q.t / 6, (q.life - q.t) / 25);
          const hx = x + Math.round(Math.sin(q.t * 0.07 + q.phase) * 3);
          fineHeart(ctx, hx + 0.5, y + 2.5, 3.6, q.color);   // two lobes, a tapered point, a small shine
          break;
        }
        case 'hat':
          ctx.globalAlpha = Math.min(1, (q.life - q.t) / 15);
          ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot); drawHatIcon(ctx, q.hat); ctx.restore();
          break;
        case 'char':
          ctx.globalAlpha = Math.min(1, Math.max(0, (q.life - q.t) / 18));
          ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot + q.t * 0.09);
          fPoly(ctx, [[-q.size, -q.size * 0.4], [q.size * 0.5, -q.size], [q.size, q.size * 0.2], [-q.size * 0.3, q.size * 0.7]], q.color);
          fLine(ctx, -q.size * 0.6, -q.size * 0.3, q.size * 0.4, -q.size * 0.6, '#514044', 0.3);
          ctx.restore();
          break;
        case 'px':
          ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
          if (q.streak) fRect(ctx, x, y, q.streak, Math.max(2 / 3, q.size * 0.8), q.color);
          else fBlob(ctx, x + q.size / 2, y + q.size / 2, Math.max(0.5, q.size * 0.62), q.color);
          break;
        case 'bubble': {
          const fade = Math.min(1, q.t / 4, (q.life - q.t) / 10);
          const r = q.r || 2, bx = x + Math.sin(q.t * 0.22 + q.r * 5) * 0.6, by = y + Math.cos(q.t * 0.22 + q.r * 3) * 0.6;
          ctx.globalAlpha = fade * 0.42; fBlob(ctx, bx, by, r, '#7ae8ff');
          ctx.globalAlpha = fade * 0.88; fArc(ctx, bx, by, Math.max(0.4, r - 0.55), r, 0, Math.PI * 2, q.color || '#dffaff');
          ctx.globalAlpha = fade * 0.95; fBlob(ctx, bx - r * 0.35, by - r * 0.35, Math.max(0.35, r * 0.28), '#ffffff');
          break;
        }
        case 'burp': {   // a cartoon cloud expanding away from his beak
          const r = Math.round(q.r + q.t * 0.13);
          ctx.globalAlpha = 0.38 * Math.min(1, q.t / 5) * Math.max(0, 1 - q.t / q.life);
          fBlob(ctx, x, y, r, '#aaca8a'); fBlob(ctx, x - 1, y - 1, Math.max(1, r - 2), '#e3f0bb');
          break;
        }
        case 'fart': {   // little green clouds billowing behind him, then drifting away
          const r = q.r + q.t * 0.11;
          ctx.globalAlpha = 0.48 * Math.min(1, q.t / 4) * Math.max(0, 1 - q.t / q.life);
          fBlob(ctx, x, y, r, '#8eaa50');
          fBlob(ctx, x - r * 0.5, y - r * 0.3, r * 0.7, '#8eaa50');
          fBlob(ctx, x + r * 0.3, y - r * 0.4, r * 0.65, '#bed578');
          break;
        }
        case 'steam':   // a soft puff that swells as it rises and thins away
          ctx.globalAlpha = 0.45 * Math.min(1, q.t / 5) * Math.max(0, 1 - q.t / q.life);
          fBlob(ctx, x, y, q.r + q.t * 0.12, '#f6ecec');
          break;
        case 'spark': {
          ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
          const k = q.t < q.life * 0.6 ? 1.8 : 0.9;   // a slim four-point twinkle
          fRect(ctx, x - k + 1 / 3, y + 1 / 3, k * 2, 1 / 3, q.color); fRect(ctx, x + 1 / 3, y - k + 1 / 3, 1 / 3, k * 2, q.color); fRect(ctx, x, y, 2 / 3, 2 / 3, q.color);
          break;
        }
        case 'frag': {
          const [b, d, l] = q.cols || (q.stone ? ['#9a97a4', '#4e4c5c'] : this.level.theme.brick);   // rubble from a rock wall, crate splinters, or its own colours (1-2's rune gates)
          const n = q.size || 8;   // a chip of whatever broke: an ink edge, its colour, lit along the top
          fRoundRect(ctx, x, y, n, n, 1.4, INK); fRoundRect(ctx, x + 2 / 3, y + 2 / 3, n - 4 / 3, n - 4 / 3, 1, d); fRoundRect(ctx, x + 2 / 3, y + 2 / 3, n - 2, n - 2, 1, b);
          fRect(ctx, x + 1, y + 2 / 3, n - 2.4, 2 / 3, l || b);
          break;
        }
        case 'pollen': drawPollen(ctx, q.x, q.y, this.t * 3, q.color, 0.8); break;
        case 'ring': {   // a ring of sound off a drum skin: a flattened arc widening as it rises
          const r = 6 + q.t * 1.2;
          ctx.globalAlpha = Math.max(0, 1 - q.t / q.life) * 0.8;
          fArc(ctx, x, y, r - 0.7, r, Math.PI, Math.PI * 2, q.color, 0.35);
          break;
        }
        case 'note': {   // a little eighth note floating up off a playing musician
          ctx.globalAlpha = Math.min(1, (q.life - q.t) / 12);
          const nx = x + Math.round(Math.sin(q.t * 0.15) * 2);
          fEll(ctx, nx + 0.8, y + 4.4, 2, 1.5, INK); fRect(ctx, nx + 1.7, y - 3, 1.4, 7.6, INK); fRect(ctx, nx + 2.4, y - 3, 1.8, 2.4, INK);
          fEll(ctx, nx + 0.8, y + 4.4, 1.3, 0.85, q.color); fRect(ctx, nx + 2.1, y - 2.4, 2 / 3, 6.4, q.color); fRect(ctx, nx + 2.6, y - 2.4, 1.2, 1.2, q.color); fRect(ctx, nx + 0.2, y + 3.9, 2 / 3, 1 / 3, '#ffffff');
          break;
        }
        case 'enemyChunk':
          ctx.save(); ctx.translate(x, y); ctx.rotate(q.t * q.spin); ctx.globalAlpha = Math.min(1, (q.life - q.t) / 12);
          fPoly(ctx, [[-q.size, -q.size * 0.5], [0, -q.size], [q.size, 0], [q.size * 0.3, q.size], [-q.size, q.size * 0.4]], q.color);
          fRect(ctx, -q.size * 0.5, -q.size * 0.5, q.size * 0.7, 0.4, '#ffffff'); ctx.restore(); break;
        case 'sausageMeat':
          ctx.globalAlpha=Math.min(1,(q.life-q.t)/14);drawSpun(ctx,sausageCrumbArt(q.variant),x,y,q.size,q.t*q.spin);break;
        case 'sausageWheel':
          ctx.globalAlpha=Math.min(1,(q.life-q.t)/12);fEll(ctx,x,y,q.size,q.size,'#413a37');fEll(ctx,x,y,q.size*.57,q.size*.57,'#aea08b');fEll(ctx,x,y,.6,.6,'#665849');break;
        case 'wormGib':
          ctx.globalAlpha=Math.min(1,(q.life-q.t)/20);drawSpun(ctx,duneWormGibArt(q.variant),x,y,q.size,q.t*q.spin);break;
        case 'wormGoo':
          ctx.globalAlpha=Math.min(1,(q.life-q.t)/25)*.85;
          fEll(ctx,x,y,q.size*(q.splat?1.8:.65),q.size*(q.splat?.28:1),'#94a76e');fEll(ctx,x-q.size*.2,y-q.size*.25,q.size*.25,q.size*.15,'#e7edc3');break;
        case 'pep': ctx.globalAlpha = Math.max(0, 1 - q.t / q.life); drawSpun(ctx, SPR.pepperA, x, y, 8, q.t * q.spin); break;
        case 'text':
          ctx.globalAlpha = q.t > q.life - 12 ? (q.life - q.t) / 12 : 1;
          if (q.text === 'Z') drawZ(ctx, x - 3, y, q.color);   // a sleeper's Z (painted fine: sprites-fine.js)
          else drawText(ctx, q.text, x, y, q.color, { align: 'center', shadow: INK });
          break;
      }
      ctx.globalAlpha = 1;
    }
  }

  // The C K R letters: big speckled eggs (Chickaroo is a chick, after all) that rock and wobble
  // as if about to hatch, with the letter painted boldly on the shell.
  drawLetters(ctx) {
    this.level.def.letters.forEach(([c, r], i) => {
      if (this.lettersGot.has(i)) return;
      const x = c * TILE + 8, y = Math.round(r * TILE + 7 + Math.sin(this.t * 0.07 + i) * 1.5);
      if (x < this.camX - 20 || x > this.camX + VIEW_W + 20) return;
      const hollow = this.level.secretAt(Math.floor(c), Math.floor(r)), a = hollow ? hollow.rev : 1;   // tucked in a secret hollow: hidden till it opens
      if (a <= 0.01) return;
      // a gentle rock, and every few seconds an excited little shake
      const k = (this.t + i * 50) % 180, rock = Math.sin(this.t * 0.08 + i) * 0.12 + (k < 20 ? Math.sin(k * 1.4) * 0.3 : 0);
      ctx.globalAlpha = (0.22 + Math.sin(this.t * 0.1 + i) * 0.08) * a; fBlob(ctx, x, y + 1, 15, '#fff3c0'); ctx.globalAlpha = a;
      const rq = Math.round(rock * 40) / 40, sn = Math.sin(rq);
      ctx.drawImage(letterEggArt(rq), x - 16, y - 14);   // (baked fine: below)
      const lx = x + Math.round(sn * 3);
      drawText(ctx, LETTERS[i], lx, y - 3, '#7a3a10', { align: 'center', scale: 4 / 3 });
      if ((this.t + i * 20) % 60 < 5) { fRect(ctx, x - 4 + 1 / 3, y - 8, 1 / 3, 4, '#ffffff'); fRect(ctx, x - 6 + 1 / 3, y - 6, 4, 1 / 3, '#ffffff'); }
      ctx.globalAlpha = 1;
    });
  }
  drawWorldOverlay(ctx) {
    const sh = INK, pl = this.player;
    if (this.mode === 'play' && this.monsoon && this.monsoon.phase === 'warn' && this.monsoon.told) {
      drawText(ctx, '- STORM COMING -', VIEW_W / 2, 36, '#9fe3ff', { align: 'center', shadow: sh });
    }
    if (this.mode === 'play' && this.level && this.level.def.wind && this.windPhase !== 'calm' && (this.windPhase === 'gust' || (this.t >> 3) % 2)) {
      const txt = this.windDir < 0 ? '<<< WIND' : 'WIND >>>';
      drawText(ctx, txt, VIEW_W / 2, 36, this.windPhase === 'gust' ? '#ffffff' : '#9fe3ff', { align: 'center', shadow: sh });
    }
    const bo = this.boss;
    if (bo && bo.state !== 'sleep' && !bo.introActive && !bo.hideHealthBar && !bo.remove) {
      // A compact black frame floats just below the top edge.
      const bw = 104, bx = Math.round((VIEW_W - bw) / 2), bt = 34, bh = 4;
      const fw = Math.round(bw * clamp(bo.shown, 0, 1));
      fRoundRect(ctx, bx - 2, bt - 2, bw + 4, bh + 4, 2.5, '#000000');   // (in fine pixels: hires.js)
      fRoundRect(ctx, bx, bt, bw, bh, 1.5, bo.barBg || '#4a1a2a');
      const col = bo.flash > 0 ? (bo.barHit || '#ffb59c') : (bo.barCol || '#ff5d73');
      if (fw > 0) { fRoundRect(ctx, bx, bt, fw, bh, 1.5, col); ctx.globalAlpha = 0.45; fRect(ctx, bx + 1, bt + 1 / 3, Math.max(0, fw - 2), 2 / 3, '#ffffff'); ctx.globalAlpha = 0.25; fRect(ctx, bx + 1, bt + bh - 1, Math.max(0, fw - 2), 2 / 3, '#000000'); ctx.globalAlpha = 1; }
      const ticks = bo.barTicks || 3;   // (THE REAPER's five phases: five sections)
      for (let k = 1; k < ticks; k++) fRect(ctx, bx + Math.round(bw * k / ticks) - 1 / 3, bt, 2 / 3, bh, INK);
    }
    if (this.dialog && (this.mode === 'play' || this.mode === 'clear')) this.drawDialog(ctx);
  }
  drawReserve(ctx) {
    const kind = this.reservePower;
    if (!Object.hasOwn(SUIT_OF, kind)) return;
    const x = 2, y = VIEW_H - 24, suit = SUIT_OF[kind];
    const color = SUIT_INFO[suit].color;
    // Filled, pixel-aligned edges make one crisp border without a second outer contour.
    fRect(ctx, x, y, 22, 22, color);
    fRect(ctx, x + 1, y + 1, 20, 20, '#100c22');
    const icon = SPR[SUIT_INFO[suit].icon];
    ctx.drawImage(icon, 0, 0, icon.width, icon.height, x + 3, y + 3, 16, 16);
  }
  // The dialogue box, classic style: a name tab in the speaker's colour over a dark panel, the line
  // typed out letter by letter. It sits at the top of the screen, out of Chickaroo's way (dialogY).
  // Back at a checkpoint (mode 'ready'): a tip box at the bottom waits for jump before play goes on
  drawReady(ctx) {
    this.drawDialog(ctx, { tip: true, hold: true, text: 'READY?', color: '#ffd166', t: this.readyT, life: Infinity });
  }
  drawDialog(ctx, d = this.dialog) {
    const W = 344, textInset = 8, maxCh = Math.floor((W - textInset - 8) / 5);
    const lines = d.tip && d.title ? [d.title] : [], first = lines.length;
    for (const para of d.text.split('\n')) {   // ('\n' breaks a line; a blank line is a gap)
      const start = lines.length;
      for (const word of para.split(/[ \t]+/).filter(Boolean)) {
        const last = lines.length - 1;
        if (last < start || lines[last].length + word.length + 1 > maxCh) lines.push(word); else lines[last] += ' ' + word;
      }
      if (lines.length === start) lines.push('');
    }
    const h = lines.length * 9 + 9, x = Math.round((VIEW_W - W) / 2);
    const y = this.dialogY(d, x, W, h);   // the top of the screen (its name tab just fitting above it), or the bottom when he's up there
    const a = Math.min(1, d.t / 6, (d.life - d.t) / 10) * (d.relocateAlpha ?? 1);
    ctx.globalAlpha = a;
    // name tab (a minimal lightbulb for a tip)
    if (!d.hideName) {
    const nw = d.tip ? 15 : textWidth(d.name) + 10, tx = x + 6, ty = y - 10;
    fRoundRect(ctx, tx, ty - 1, nw, 13, 2, INK); fRoundRect(ctx, tx + 2 / 3, ty - 1 / 3, nw - 4 / 3, 11.67, 1.6, d.color);   // (in fine pixels: hires.js)
    if (d.tip) ctx.drawImage(tipBulbArt(), tx + 4, ty + 1);
    else drawText(ctx, d.name, tx + 5, ty + 2, INK);
    }
    // panel
    this.drawPanel(ctx, x, y, W, h, d.color, d.background || (d.tip ? '#122868' : '#0b0918'), true);   // tips on dark blue, speech on black: solid, so they read easily
    let left = Math.floor(d.t * DIALOG_CPS);
    lines.forEach((line, i) => {
      if (left <= 0) return;
      drawText(ctx,line,x+textInset,y+6+i*9,d.tip&&i<first?d.color:'#fff9eb',{small:true,reveal:left});
      left -= line.length + 1;
    });
    if (d.hold && left > 0 && (this.t >> 4) % 2) fPoly(ctx, [[x + W - 9.5, y + h - 6.5], [x + W - 4.5, y + h - 6.5], [x + W - 7, y + h - 3]], d.color);   // done: a blinking arrow (jump to go on)
    ctx.globalAlpha = 1;
  }
  // Where a text box goes (dialogue, tips, READY?): the top of the screen, unless that would hide Chickaroo -- then the
  // bottom. Brief overlap hysteresis prevents rapid toggling; a four-frame fade switches between the two
  // fixed positions. The box never travels through the playing field, and typing continues uninterrupted.
  dialogY(d, x, w, h) {
    const top = d.hideName ? 3 : 13, bottom = VIEW_H - h - 4, p = this.player, tab = d.hideName ? 0 : 11;
    // When flying the hot-air balloon, force dialogue and tip boxes to the bottom so they never obscure stormy clouds above
    if (this.ride && (this.ride.constructor?.name === 'Balloon' || (typeof Balloon !== 'undefined' && this.ride instanceof Balloon))) {
      d.side = 1;
      d.relocate = null;
      d.under = null;
      return bottom;
    }
    const covers = y => {
      if (!p || p.hidden || p.state === 'dead') return false;
      const sx = p.x - Math.round(this.camX), sy = p.y + Math.round(this.lift || 0), m = 3;
      return sx + p.w + m > x && sx - m < x + w && sy + p.h + m > y - tab && sy - m < y + h;
    };
    const at = side => side ? bottom : top;
    if (d.side == null) { d.side = covers(top) && !covers(bottom) ? 1 : 0; d.relocate = null; d.under = null; }
    d.relocateAlpha=1;
    if(d.relocate){
      const age=this.t-d.relocate.t;
      if(age>=2)d.side=d.relocate.to;
      if(age>=4)d.relocate=null;
      else {d.relocateAlpha=age<2?1-age/2:(age-2)/2;return at(d.side);}
    }
    if (covers(at(d.side)) && !covers(at(1 - d.side))) {
      if (d.under == null) d.under = this.t;
      else if (this.t - d.under > 20) { d.relocate = { to: 1-d.side, t: this.t }; d.under = null; }
    } else d.under = null;
    return at(d.side);
  }

  // once: paint the body in a single pass, so a see-through `bg` really is that see-through (the three
  // overlapping rects otherwise stack up to nearly opaque in the middle)
  // a panel: rounded, a fine rim in its colour and a faint light line just inside it (in fine pixels: hires.js)
  drawPanel(ctx, x, y, w, h, border = '#2ec4b6', bg = 'rgba(11,9,24,0.88)', once = false) {
    fRoundRect(ctx, x + 1 / 3, y + 1 / 3, w - 2 / 3, h - 2 / 3, 2.4, bg);
    fRoundRect(ctx, x, y, w, h, 2.6, border, 2);
    ctx.globalAlpha *= 0.25; fRoundRect(ctx, x + 1, y + 1, w - 2, h - 2, 1.8, '#ffffff', 1); ctx.globalAlpha /= 0.25;
  }
  drawSelectionArrows(ctx, left, right, y, color) {
    if (Math.floor(this.t / 20) % 2 !== 0) return;
    for (let dx = 0; dx < 2; dx++) {
      drawText(ctx, '>', left + dx, y, color);
      drawText(ctx, '<', right + dx, y, color);
    }
  }
  drawMenu(ctx, items, sel, cx, y, gap = 12) {
    items.forEach((s, i) => {
      const on = i === sel;
      const tw = textWidth(s);
      this.menuHits.push({ x: cx - tw / 2 - 18, y: y + i * gap - 3, w: tw + 36, h: gap, i });
      if (on) {
        ctx.fillStyle = 'rgba(255,209,102,0.28)';
        ctx.fillRect(Math.round(cx - tw / 2 - 3), y + i * gap - 2, tw + 6, 11);
      }
      drawText(ctx, s, cx, y + i * gap, on ? '#ffffff' : '#b8b2d8', { align: 'center', shadow: INK });
      if (on) this.drawSelectionArrows(ctx, cx - tw / 2 - 12, cx + tw / 2 + 6, y + i * gap, '#ffd166');
    });
  }

  drawGroundStrip(ctx, theme, cam) {
    const ts = getTileset(theme);
    const off = -(Math.round(cam) % TILE);
    for (let x = off, i = 0; x < VIEW_W; x += TILE, i++) { const top = ts['groundTop' + (i * 5 & 7)] || ts.groundTop; ctx.drawImage(ts['ground' + (i * 3 & 7)] || ts.ground, x, 13 * TILE); ctx.drawImage(top, x, 12 * TILE - (top.oy || 0)); }
  }

  drawTitleScene(ctx) {
    meadowDay = meadowCloud = null;   // (an ordinary blue-sky day on the title screen)
    drawBackground(ctx, 'meadow', this.titleCam, this.t);
    this.drawAmbient(ctx);
    this.drawGroundStrip(ctx, 'meadow', this.titleCam);
    // little scene: Chickaroo dozing under a ? block, a Grumblet pacing on the right
    drawSprite(ctx, SPR.small.sleep, 30, 12 * TILE, false);
    this.drawZzz(ctx, { x: 24, w: PLAYER_W, y: 12 * TILE - SMALL_H, facing: 1, idleT: SLEEP_AFTER + this.t });
    const gx = 360 + Math.sin(this.t * 0.01) * 18;
    drawSprite(ctx, Math.floor(this.t / 10) % 2 ? meadowArt().acornB : meadowArt().acornA, gx, 12 * TILE, Math.cos(this.t * 0.01) < 0);
    ctx.drawImage(getTileset('meadow')['q' + [0, 0, 0, 1, 2, 1][Math.floor(this.t / 8) % 6]], 22, 8 * TILE);
  }

  drawTitle(ctx) {
    this.drawTitleScene(ctx);
    // Title logo
    drawLogo(ctx, VIEW_W / 2, 12, this.t);
    // menu on its own see-through plaque, the picked row lit by a soft bar
    const labels = this.titleItems().map(i => i.label), mg = 16;
    const mw = Math.max(154, Math.max(...labels.map(s => textWidth(s))) + 60), my = 62;
    this.drawPanel(ctx, Math.round(VIEW_W / 2 - mw / 2), my, mw, labels.length * mg + 10, '#3a3170', 'rgba(11,9,24,0.6)', true);
    ctx.fillStyle = 'rgba(255,209,102,0.16)';
    if (this.menu < labels.length) ctx.fillRect(Math.round(VIEW_W / 2 - mw / 2) + 3, my + 4 + this.menu * mg, mw - 6, mg - 2);
    this.drawMenu(ctx, labels, this.menu, VIEW_W / 2, my + 7, mg);
    // controls: a compact two-column card, see-through so the meadow stays in view
    const rows = Pad.used
      ? (Pad.isPS()
        ? [['D-PAD / STICK', 'MOVE'], ['CROSS', 'JUMP'], ['SQUARE / R1', 'RUN / FIRE'], ['CIRCLE', 'ROLL'], ['TRIANGLE', 'SPIN JUMP'], ['CROSS', 'CONFIRM'], ['OPTIONS', 'PAUSE'], ['CREATE', 'SWAP ITEM']]
        : [['D-PAD / STICK', 'MOVE'], ['A', 'JUMP'], ['X / RB', 'RUN / FIRE'], ['B', 'ROLL'], ['Y', 'SPIN JUMP'], ['A', 'CONFIRM'], ['MENU', 'PAUSE'], ['VIEW', 'SWAP ITEM']])
      : this.touch
      ? [['LEFT PAD', 'MOVE'], ['A BUTTON', 'JUMP'], ['B BUTTON', 'RUN / FIRE'], ['THUMB A+B', 'RUN + JUMP'], ['TAP MENUS', 'SELECT']]
      // (the small font has no arrows: words only. On a keyboard he runs on his own)
      : [['LEFT / RIGHT', 'MOVE'], ['UP', 'JUMP'], ['DOWN', 'CROUCH / STOMP'], ['D', 'GRAB / FIRE'], ['W', 'SPIN ATTACK'], ['C', 'ROLL'], ['B', 'SWAP ITEM'], ['ENTER / SPACE', 'CONFIRM'], ['P / ESC', 'PAUSE']];
    const half = Math.ceil(rows.length / 2), rg = 9, cw = 120, cx0 = VIEW_W / 2 - cw - 6;
    const panelGap = 9, controlsY = my + labels.length * mg + 10 + panelGap, cy0 = controlsY + 7;
    const controlsH = half * rg + 15;
    this.drawPanel(ctx, cx0 - 8, controlsY, cw * 2 + 28, controlsH, '#3a3170', 'rgba(11,9,24,0.6)', true);
    drawText(ctx, this.touch ? 'TOUCH CONTROLS' : Pad.used ? 'GAMEPAD CONTROLS' : 'KEYBOARD CONTROLS', VIEW_W / 2, cy0 - 3, '#b8b2d8', { align: 'center', small: true });
    rows.forEach(([k, a], i) => {
      const x = cx0 + (i >= half ? cw + 12 : 0), y = cy0 + 7 + (i % half) * rg;
      drawText(ctx, k, x, y, '#ffffff', { small: true });
      drawText(ctx, a, x + cw, y, '#2ec4b6', { align: 'right', small: true });
    });
    ctx.fillStyle = '#3a3170'; ctx.fillRect(VIEW_W / 2, cy0 + 6, 1, half * rg - 2);   // column divider
    if (!Pad.used && !this.touch) {   // a tip along the bottom (gone once a controller's being used): the game's made for one
      const tip = 'GAMEPAD HIGHLY RECOMMENDED - PRESS ANY BUTTON TO ACTIVATE GAMEPAD', tw = textWidth(tip, 'small') + 24, th = 14;
      const tx = Math.round((VIEW_W - tw) / 2), soilTop = 12 * TILE + 6;   // below the green grass cap
      const ty = soilTop + (VIEW_H - soilTop - th) / 2;
      this.drawPanel(ctx, tx, ty, tw, th, '#3a3170', 'rgba(11,9,24,0.6)', true);
      drawText(ctx, tip, VIEW_W / 2, ty + (th - 6) / 2, '#9fd8f0', { align: 'center', small: true });
    }

  }

  // stages reached the end of at least once (older saves only have best scores, which count too)
  clearedLevels() {
    let ids = [], best = {};
    try { ids = JSON.parse(safeStorage.get('chickaroo-cleared') || '[]') || []; } catch (e) { ids = []; }
    try { best = JSON.parse(safeStorage.get('chickaroo-best') || '{}') || {}; } catch (e) { best = {}; }
    return new Set(ids.concat(Object.keys(best)));
  }
  // Every campaign level is available from the start.
  selectLevels() {
    return LEVELS.map((def, index) => ({ def, index })).filter(e => !e.def.dev);
  }

  openSelect() {
    const list = this.selectLevels();
    const targetIdx = this.save ? this.save.level : this.levelIndex;
    let found = list.findIndex(e => e.index === targetIdx);
    if (found < 0) found = 0;
    this.menu = found;
    this.selectScroll = Math.max(0, Math.floor(found / SELECT_COLS) - (SELECT_ROWS - 1)) * 44;
    this.mode = 'select';
  }

  updateSelect() {
    const list = this.selectLevels(), n = list.length;
    if (!n) { this.mode = 'title'; return; }
    this.menu = clamp(this.menu, 0, n - 1);
    if (Input.hit('pause') || Input.hit('roll')) {
      this.mode = 'title'; this.menu = this.titleSelectIdx(); Sound.play('select');
      return;
    }
    const cols = SELECT_COLS, row = Math.floor(this.menu / cols);
    if (Input.hit('left') && this.menu % cols > 0) { this.menu--; Sound.play('select'); }
    else if (Input.hit('right') && this.menu % cols < cols - 1 && this.menu < n - 1) { this.menu++; Sound.play('select'); }
    else if ((Input.hit('up') || Input.hit('worldPrev')) && row > 0) { this.menu -= cols; Sound.play('select'); }
    else if ((Input.hit('down') || Input.hit('worldNext')) && (row + 1) * cols < n) { this.menu = Math.min(n - 1, this.menu + cols); Sound.play('select'); }
    else if (Input.hit('start') || Input.hit('jump') || Input.hit('ok')) {
      const chosen = list[this.menu];
      if (!chosen || this.fadeCb) return;
      Sound.play('confirm');
      this.transition(() => { this.newGame(true); this.levelIndex = chosen.index; this.enterLevel(); });
    }
  }

  tapSelect(h) {
    if (h.selectAction === 'back') {
      this.mode = 'title'; this.menu = this.titleSelectIdx(); Sound.play('select');
    } else if (h.selectAction === 'prev') {
      this.menu = Math.max(0, this.menu - SELECT_COLS); Sound.play('select');
    } else if (h.selectAction === 'next') {
      const list = this.selectLevels();
      this.menu = Math.min(list.length - 1, this.menu + SELECT_COLS); Sound.play('select');
    } else if (h.selectAction === 'play') {
      Input.hits.add('start');
    } else if (h.selectIdx != null) {
      if (this.menu === h.selectIdx) Input.hits.add('start');
      else { this.menu = h.selectIdx; Sound.play('select'); }
    }
  }

  drawSelect(ctx) {
    const list = this.selectLevels(), n = list.length;
    this.menu = clamp(this.menu, 0, Math.max(0, n - 1));
    let bestMap = {};
    try { bestMap = JSON.parse(safeStorage.get('chickaroo-best') || '{}') || {}; } catch (e) { bestMap = {}; }

    // Same peaceful meadow scene as the title screen
    this.drawTitleScene(ctx);

    // Header
    drawText(ctx, 'LEVEL SELECT', VIEW_W / 2, 5, '#ffd166', { align: 'center', scale: 2, shadow: INK });

    // Campaign levels fit in five columns and up to four visible rows.
    const cols = SELECT_COLS, rows = Math.ceil(n / cols);
    const cardW = 70, cardH = 45, gapX = 6, gapY = 10, stride = cardH + gapY;
    const gridX = Math.round((VIEW_W - (cols * cardW + (cols - 1) * gapX)) / 2), gridY = 23;
    const gridH = Math.min(rows, SELECT_ROWS) * stride - gapY, maxScroll = Math.max(0, rows - SELECT_ROWS) * stride;
    let scroll = clamp(this.selectScroll || 0, 0, maxScroll);
    const selectedTop = Math.floor(this.menu / cols) * stride;
    if (selectedTop < scroll) scroll = selectedTop;
    if (selectedTop + cardH > scroll + gridH) scroll = selectedTop + cardH - gridH;
    this.selectScroll = clamp(scroll, 0, maxScroll);
    ctx.save(); ctx.beginPath(); ctx.rect(0, gridY, VIEW_W, gridH); ctx.clip();
    list.forEach((entry, globalIdx) => {
      const col = globalIdx % cols, row = Math.floor(globalIdx / cols);
      const rowCount = Math.min(cols, n - row * cols);
      const rowX = gridX + Math.round((cols - rowCount) * (cardW + gapX) / 2);
      const x = rowX + col * (cardW + gapX), y = gridY + row * stride - this.selectScroll;
      if (y < gridY || y + cardH > gridY + gridH) return;
      const on = globalIdx === this.menu;
      const pct = bestMap[entry.def.id] || 0, cleared = entry.def.id in bestMap;
      const th = THEMES[entry.def.theme] || THEMES.meadow;

      // 100% opaque outer card plaque over the peaceful meadow scene
      const borderCol = on ? '#ffd166' : '#3a3170';
      this.drawPanel(ctx, x, y, cardW, cardH, borderCol, on ? '#282154' : '#15112c');

      // 100% opaque inner rectangle box for the level name
      const sx = x + 3, sy = y + 3, sw = 64, sh = 38;
      ctx.fillStyle = on ? '#1c163d' : '#0e0b20';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = on ? '#ffd166' : '#3a3170';
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);

      // One word per line so all cards have a uniform two-line layout
      const lines = entry.def.name.trim().split(/\s+/);
      const lineGap = 9, totalTextH = lines.length * 6 + (lines.length - 1) * (lineGap - 6);
      const startY = Math.round(sy + (sh - totalTextH) / 2);
      const nameCol = on ? '#ffffff' : (th.accent || '#d8d4f0');
      lines.forEach((line, li) => {
        drawText(ctx, line, sx + sw / 2, startY + li * lineGap, nameCol, { align: 'center', small: true, shadow: INK });
      });
      const labelY = y + 34;

      // Completion badge (gold star for 100%, green check for cleared)
      if (pct >= 100) {
        const bx = x + cardW - 13, by = labelY;
        const st = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 1.6 : 3.8; st.push([bx + 3.5 + Math.cos(a) * r, by + 3.8 + Math.sin(a) * r]); }   // a gold star (fine)
        fPoly(ctx, st, '#ffd166'); fEll(ctx, bx + 2.8, by + 3, 0.8, 0.6, '#ffffff');
      } else if (cleared) {
        const bx = x + cardW - 13, by = labelY + 1;
        ctx.strokeStyle = '#7be08a'; ctx.lineWidth = 1.7; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(bx + 0.8, by + 3.6); ctx.lineTo(bx + 2.8, by + 5.4); ctx.lineTo(bx + 6.2, by + 0.8); ctx.stroke();   // a green check (fine)
      }

      this.menuHits.push({ x, y, w: cardW, h: cardH, selectIdx: globalIdx });
    });

    ctx.restore();
    // The narrow vertical track makes the off-screen rows visible.
    if (maxScroll > 0) {
      ctx.fillStyle = '#3a3170'; ctx.fillRect(VIEW_W - 5, gridY, 2, gridH);
      const thumbH = gridH * SELECT_ROWS / rows;
      ctx.fillStyle = '#ffd166'; ctx.fillRect(VIEW_W - 5, gridY + (gridH - thumbH) * this.selectScroll / maxScroll, 2, thumbH);
    }

    // Bottom bar: see-through plaque with play prompt + BACK button
    const sel = list[this.menu];
    const footY = 204;
    if (rows > SELECT_ROWS) {
      this.drawPanel(ctx, 12, footY - 3, 34, 15, '#3a3170', 'rgba(11,9,24,0.6)', true);
      drawText(ctx, 'UP', 29, footY + 1, this.selectScroll > 0 ? '#ffffff' : '#8a83b0', { align: 'center', small: true, shadow: INK });
      if (this.selectScroll > 0) this.menuHits.push({ x: 12, y: footY - 3, w: 34, h: 15, selectAction: 'prev' });

      this.drawPanel(ctx, 50, footY - 3, 34, 15, '#3a3170', 'rgba(11,9,24,0.6)', true);
      drawText(ctx, 'DOWN', 67, footY + 1, this.selectScroll < maxScroll ? '#ffffff' : '#8a83b0', { align: 'center', small: true, shadow: INK });
      if (this.selectScroll < maxScroll) this.menuHits.push({ x: 50, y: footY - 3, w: 34, h: 15, selectAction: 'next' });
    } else if (sel && bestMap[sel.def.id] != null) {
      this.drawPanel(ctx, 12, footY - 3, 62, 15, '#3a3170', 'rgba(11,9,24,0.6)', true);
      drawText(ctx, 'BEST: ' + bestMap[sel.def.id] + '%', 43, footY + 1, '#7be08a', { align: 'center', small: true, shadow: INK });
    }

    const playPrompt = this.touch ? 'TAP CARD TO PLAY' : Pad.used ? (Pad.isPS() ? 'PRESS CROSS TO PLAY' : 'PRESS A TO PLAY') : 'PRESS ENTER TO PLAY';
    const pw = textWidth(playPrompt, 'small') + 16;
    this.drawPanel(ctx, Math.round(VIEW_W / 2 - pw / 2), footY - 3, pw, 15, '#3a3170', 'rgba(11,9,24,0.6)', true);
    drawText(ctx, playPrompt, VIEW_W / 2, footY + 1, '#ffd166', { align: 'center', small: true, shadow: INK });
    this.menuHits.push({ x: Math.round(VIEW_W / 2 - pw / 2), y: footY - 3, w: pw, h: 15, selectAction: 'play' });

    // BACK button on bottom right
    const bx = VIEW_W - 50, by = footY - 3, bw = 38, bh = 15;
    this.drawPanel(ctx, bx, by, bw, bh, '#3a3170', 'rgba(11,9,24,0.6)', true);
    drawText(ctx, 'BACK', bx + bw / 2, by + 4, '#ffffff', { align: 'center', small: true, shadow: INK });
    this.menuHits.push({ x: bx, y: by, w: bw, h: bh, selectAction: 'back' });
  }

  drawIntro(ctx) {
    const def = LEVELS[this.levelIndex], th = THEMES[def.theme];
    ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + this.t * 0.2) % VIEW_W, y = (i * 53) % VIEW_H;
      fBlob(ctx, x + 0.5, y + 0.5, i % 3 ? 0.4 : 0.6, i % 3 ? '#221c44' : '#3a3170');
    }
    drawText(ctx, def.name, VIEW_W / 2, 78, th.accent, { align: 'center', scale: 2, shadow: INK });
    drawSprite(ctx, SPR.small.idle, VIEW_W / 2 - 18, 134, false);
    drawText(ctx, 'X ' + this.lives, VIEW_W / 2 - 4, 124, '#ffffff');
    if (this.useCheckpoint) drawText(ctx, 'RESUMING FROM CHECKPOINT', VIEW_W / 2, 150, '#8a83b0', { align: 'center' });
  }

  drawPause(ctx) {
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
    if (this.pauseConfirm) {
      this.drawPanel(ctx, 88, 66, 224, 100);
      drawText(ctx, this.pauseConfirm === 'restart' ? 'RESTART LEVEL?' : 'QUIT TO TITLE?', VIEW_W / 2, 80, '#ffffff', { align: 'center', shadow: INK });
      if (this.pauseConfirm === 'restart') drawText(ctx, 'LEVEL PROGRESS WILL RESET', VIEW_W / 2, 95, '#9fd8f0', { align: 'center', small: true });
      this.drawMenu(ctx, ['YES', 'NO'], this.menu, VIEW_W / 2, 115, 19);
      return;
    }
    // the panel hugs its rows (9px of air above the title and below the last bar) and sits in the middle of the screen
    const oy = 26;
    ctx.save(); ctx.translate(0, oy);
    this.drawPanel(ctx, 56, 10, 288, 151);
    drawText(ctx, 'PAUSED', VIEW_W / 2, 19, '#ffffff', { align: 'center', scale: 2, shadow: INK });
    const def = this.level.def, pl = this.player;
    drawText(ctx, def.name, VIEW_W / 2, 38, '#9fd8f0', { align: 'center', small: true });
    drawText(ctx, 'SCORE  ' + pad(this.score, 6), 72, 51, '#ffffff');
    drawText(ctx, 'POLLEN  ' + this.coins, 72, 62, '#ffd166');
    ctx.drawImage(SPR.lifeIcon, 72, 72);
    drawText(ctx, 'LIVES ' + this.lives, 88, 73, '#ffffff');
    drawText(ctx, this.completion() + '% COMPLETE', 222, 51, '#9fd8f0');
    if (def.letters && def.letters.length) LETTERS.forEach((L, i) => drawText(ctx, L, 222 + i * 12, 62, this.lettersGot.has(i) ? '#ffd166' : '#4a5a78'));
    const secs = Math.floor((this.levelFrames || 0) / 60), hh = Math.floor(secs / 3600), mm = Math.floor(secs / 60) % 60, ss = secs % 60;
    drawText(ctx, 'TIME  ' + (hh ? hh + ':' + pad(mm, 2) : mm) + ':' + pad(ss, 2), 222, 73, '#ffffff');
    const suit = pl.power === 2 && SUIT_INFO[pl.suit];
    if (suit) {   // the suit you're wearing, beside the letters
      const icon = SPR[suit.icon]; ctx.drawImage(icon, 0, 0, icon.width, icon.height, 262, 60, 10, 10);
      drawText(ctx, suit.name, 275, 63, suit.color, { small: true });
    }
    ctx.fillStyle = '#3a3170'; ctx.fillRect(72, 87, 256, 1);
    // rows, one per line (menu index = row): resume, restart, quit, music vol, sfx vol
    const actions = { 0: 'RESUME', 1: 'RESTART LEVEL', 2: 'QUIT TO TITLE' }, ys = [94, 106, 118, 132, 144], gap = 12;
    ys.forEach((y, i) => {
      const on = i === this.menu;
      if (actions[i]) {
        const s = actions[i], tw = textWidth(s);
        this.menuHits.push({ x: VIEW_W / 2 - tw / 2 - 18, y: y - 4 + oy, w: tw + 36, h: gap, i });
        drawText(ctx, s, VIEW_W / 2, y, on ? '#ffd166' : '#b8b2d8', { align: 'center', shadow: INK });
        if (on && Math.floor(this.t / 16) % 2 === 0) {
          drawText(ctx, '>', VIEW_W / 2 - tw / 2 - 12, y, '#ffd166');
          drawText(ctx, '<', VIEW_W / 2 + tw / 2 + 6, y, '#ffd166');
        }
        return;
      }
      const kind = i === 3 ? 'music' : 'sfx', v = kind === 'music' ? Sound.musicVol : Sound.sfxVol;
      const bx = 206, bw = 88, col = on ? '#ffd166' : '#b8b2d8';
      drawText(ctx, kind === 'music' ? 'MUSIC VOL.' : 'SFX VOL.', 116, y, col, { shadow: INK });
      ctx.fillStyle = '#2a2450'; ctx.fillRect(bx, y + 1, bw, 5);
      ctx.fillStyle = on ? '#ffd166' : '#2ec4b6'; ctx.fillRect(bx, y + 1, Math.round(bw * v), 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + Math.round(bw * v) - 1, y - 1, 3, 9);
      this.menuHits.push({ x: 110, y: y - 4 + oy, w: 190, h: 12, i, bar: { x: bx, w: bw, kind } });
    });
    ctx.restore();
  }

  drawClear(ctx) {
    const def = LEVELS[this.levelIndex];
    const a = Math.min(1, this.clearT / 20);
    ctx.globalAlpha = a;
    this.drawPanel(ctx, 100, 40, 200, 152, '#ffd166');
    drawText(ctx, 'STAGE CLEAR!', VIEW_W / 2, 50, '#ffd166', { align: 'center', scale: 2, shadow: INK });
    drawText(ctx, def.name, VIEW_W / 2, 70, '#bfe9ff', { align: 'center' });
    // the big % complete: counts up as the window opens, gold at 100%
    const pct = this.clearPct || 0, shown = Math.min(pct, Math.floor(Math.max(0, this.clearT - 10) * 1.6));
    const full = shown === 100, col = full ? '#ffd166' : shown >= 70 ? '#7be08a' : '#ffffff';
    drawText(ctx, shown + '%', VIEW_W / 2, 84, col, { align: 'center', scale: 3, shadow: INK });
    if (pct === 100 && shown === 100) {   // a gold star either side of a perfect 100%
      for (const sx of [VIEW_W / 2 - 47, VIEW_W / 2 + 40]) {
        ctx.drawImage(clearStarArt(), sx - 2.5, 87.5);
      }
    }
    // what's left to find
    const total = this.level.pollenTotal;
    drawText(ctx, 'POLLEN', 116, 124, '#ffffff'); drawText(ctx, total > 0 ? Math.min(this.clearPollen || 0, total) + '/' + total : '-', 284, 124, '#ffd23f', { align: 'right' });
    drawText(ctx, 'LETTERS', 116, 135, '#ffffff');
    if (def.letters && def.letters.length) {
      LETTERS.forEach((L, i) => drawText(ctx, L, 263 + i * 8, 135, this.clearLetters && this.clearLetters.has(i) ? '#ffd166' : '#4a5a78'));
    } else {
      drawText(ctx, '-', 284, 135, '#ffd23f', { align: 'right' });
    }
    drawText(ctx, 'SCORE', 116, 148, '#ffffff'); drawText(ctx, pad(this.score, 6), 284, 148, '#ffffff', { align: 'right' });
    if (this.clearT > 60 && Math.floor(this.t / 20) % 2 === 0) drawText(ctx, Pad.used ? (Pad.isPS() ? 'PRESS CROSS' : 'PRESS A') : 'PRESS ENTER', VIEW_W / 2, 176, '#b8b2d8', { align: 'center' });
    ctx.globalAlpha = 1;
  }

  drawGameOver(ctx) {
    ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawSprite(ctx, SPR.die, VIEW_W / 2, 54, false);   // the stunned Chickaroo, just above the title
    drawText(ctx, 'GAME OVER', VIEW_W / 2, 60, '#ff5d73', { align: 'center', scale: 3, shadow: '#3a0d1d' });
    drawText(ctx, 'SCORE  ' + pad(this.score, 6), VIEW_W / 2, 104, '#ffffff', { align: 'center' });
    drawText(ctx, 'TOP    ' + pad(this.top, 6), VIEW_W / 2, 116, '#ffd166', { align: 'center' });
    this.drawMenu(ctx, ['CONTINUE FROM ' + LEVELS[this.levelIndex].name, 'QUIT TO TITLE'], this.menu, VIEW_W / 2, 146, 14);
  }

}
// The perfect-clear stars, painted in fine pixels: five sharp points, bevelled gold facets and a small glint.
let CLEAR_STAR_ART = null;
function clearStarArt() {
  if (CLEAR_STAR_ART) return CLEAR_STAR_ART;
  const A = mArt(12, 12), cx = 6, cy = 6, pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.1 : 4.7;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  A.poly(pts, '#ffd166');
  const gold = ['#fff2ad', '#f4b43f', '#ffe392', '#d99025', '#f2b13d', '#c67c1e', '#ffd166', '#eaa334', '#fff2ad', '#fff9d6'];
  for (let i = 0; i < 10; i++) A.poly([[cx, cy], pts[i], pts[(i + 1) % 10]], gold[i]);
  A.ell(cx - 0.55, cy - 0.8, 0.45, 0.6, '#fffdf0');
  CLEAR_STAR_ART = A.outline().canvas();
  return CLEAR_STAR_ART;
}

// a C K R egg, rocked by `rock` radians about its base: a speckled shell lit from the upper left, an ink line round it,
// baked in fine pixels (hires.js) once per rock angle (rounded to 1/40 of a radian)
const LETTER_EGGS = new Map();
function letterEggArt(rock) {
  let img = LETTER_EGGS.get(rock);
  if (img) return img;
  const R = ART_R, P = finePix(32 * R, 26 * R), cs = Math.cos(rock), sn = Math.sin(rock);
  const inEgg = (dx, dy, g) => {   // undo the rock, then test an egg shape: rounder at the bottom, narrower at the top
    const ux = (dx * cs + (dy - 10) * sn), uy = (-dx * sn + (dy - 10) * cs) + 10;
    const rx = 8.2 + uy * 0.08 + g, ry = (uy < 0 ? 11 : 9) + g;
    return (ux * ux) / (rx * rx) + (uy * uy) / (ry * ry) <= 1;
  };
  P.fill(0, 0, 32 * R, 26 * R, (ax, ay) => {
    const dx = (ax + 0.5) / R - 16.5, dy = (ay + 0.5) / R - 14.5;
    if (!inEgg(dx, dy, 0.7)) return null;
    if (!inEgg(dx, dy, 0)) return INK;
    const lit = -dx * 0.45 - dy * 0.5 + (0.5 - 0.5) * 1.6;
    const h = ((Math.floor(dx * 1.5) + 40) * 37 + (Math.floor(dy * 1.5) + 40) * 59) % 41;
    if ((h === 0 || h === 17) && Math.abs(dx) + Math.abs(dy) > 5) return '#b88a5a';   // brown speckles
    return lit > 4 ? '#ffffff' : lit > -2 ? '#fff4dc' : lit > -6 ? '#f0dcb4' : '#d8bc8c';
  });
  img = P.hi();
  if (LETTER_EGGS.size > 200) LETTER_EGGS.clear();
  LETTER_EGGS.set(rock, img);
  return img;
}

mixin(Game, GameHud);
// Smooth, symmetric tip icon, baked finely enough to retain its curves when enlarged.
let TIP_BULB_ART = null;
function tipBulbArt() {
  if (TIP_BULB_ART) return TIP_BULB_ART;
  const art = makeHiCanvas(7, 10, ART_R * 3), g = art.getContext('2d');
  const ink = '#23334d';
  g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 0.55;
  // A single continuous glass contour, from the neck around the dome and back.
  g.beginPath(); g.moveTo(2.4, 6.6);
  g.bezierCurveTo(2.4, 5.2, 1.05, 4.95, 1.05, 3.05);
  g.bezierCurveTo(1.05, -0.15, 5.95, -0.15, 5.95, 3.05);
  g.bezierCurveTo(5.95, 4.95, 4.6, 5.2, 4.6, 6.6);
  g.closePath(); g.fillStyle = '#fff3c4'; g.fill();
  g.strokeStyle = ink; g.stroke();
  // Small glass reflection, kept away from the outline.
  g.beginPath(); g.moveTo(1.95, 3.0);
  g.quadraticCurveTo(1.95, 1.65, 3.1, 1.5);
  g.strokeStyle = '#ffffff'; g.lineWidth = 0.45; g.stroke();
  // Socket joins the glass cleanly; the rounded contact finishes the silhouette.
  g.beginPath(); g.moveTo(2.4, 6.7); g.lineTo(4.6, 6.7);
  g.lineTo(4.6, 7.85); g.quadraticCurveTo(3.5, 8.35, 2.4, 7.85);
  g.closePath(); g.fillStyle = '#d9e7ed'; g.fill();
  g.strokeStyle = ink; g.lineWidth = 0.5; g.stroke();
  g.beginPath(); g.moveTo(2.5, 7.35); g.lineTo(4.5, 7.35); g.stroke();
  g.beginPath(); g.moveTo(3.0, 8.65); g.lineTo(4.0, 8.65);
  g.lineWidth = 0.55; g.stroke();
  return TIP_BULB_ART = art;
}
