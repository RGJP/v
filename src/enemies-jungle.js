'use strict';
// ── Monsoon Jungle (3-2) ─────────────────────────────────────────────────────────
// Swinging vine: hangs from the canopy at tile (col, row) and is `len` tiles long. Jump into its
// lower part to grab it (Chickaroo bites on with his beak). While hanging, left/right pumps the
// swing, up/down climbs (hold Run to climb faster), jump lets go with the swing's speed plus a
// hop, and down + jump just drops off. Game.swingVine drives a vine while it's being ridden.
const VINE_LEAP = 2.6;   // the least sideways speed of a jump off a vine with a direction held
const VINE_G = 0.36, VINE_PUMP = 0.15, VINE_BRAKE = 0.22, VINE_MAX = 1.12, VINE_MIN_R = 22, VINE_WMAX = 0.12;
const VINE_SPEED = 6.5, VINE_RELEASE = 4.8;   // linear speed caps keep short and long ropes controllable
class Vine extends Enemy {
  constructor(col, len, row) {
    super(col * TILE + 4, (row || 0) * TILE, 8, 8);
    this.ax = col * TILE + 8; this.ay = (row || 0) * TILE + 12; this.len = (len || 6) * TILE;
    this.a = 0; this.w = 0; this.cool = 0; this.ph = col * 0.7;
    this.passive = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  // world position of the point `r` px down the vine
  at(r) { return [this.ax + Math.sin(this.a) * r, this.ay + Math.cos(this.a) * r]; }
  update(g) {
    this.t++;
    if (this.cool > 0) this.cool--;
    const p = g.player;
    if (p.vine === this) return;
    // unridden: keep swinging, settling into a lazy sway in the breeze
    const oa = this.a;
    this.w += -(VINE_G / (this.len * 0.7)) * Math.sin(this.a) + Math.sin(this.t * 0.013 + this.ph) * 0.00012;
    this.w *= 0.985; this.a += this.w;
    if (p.state !== 'play' || p.onGround || p.vine || p.inPod || g.held || this.cool > 0 || p.vineCool > 0) return;
    // Sweep Chickaroo's full body box and the rope through this frame so any contact with the vine grabs it reliably.
    const px = p.prevX == null ? p.x : p.prevX, py = p.prevY == null ? p.y : p.prevY;
    const steps = Math.max(1, Math.ceil((Math.hypot(p.x - px, p.y - py) + Math.abs(this.a - oa) * this.len) / 3));
    const padX = 8, padY = 8;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, a = oa + (this.a - oa) * k, ux = Math.sin(a), uy = Math.cos(a);
      const bx0 = px + (p.x - px) * k - padX, bx1 = bx0 + p.w + padX * 2;
      const by0 = py + (p.y - py) * k - padY, by1 = by0 + p.h + padY * 2;
      const cx = (bx0 + bx1) * 0.5, cy = by0 + padY + 3;
      // Check closest point along the grabbable vine segment [VINE_MIN_R, this.len + 6] to Chickaroo's swept box
      const sCenter = clamp((cx - this.ax) * ux + (cy - this.ay) * uy, VINE_MIN_R, this.len);
      for (const s of [sCenter, VINE_MIN_R, this.len * 0.5, this.len * 0.75, this.len]) {
        const vx = this.ax + ux * s, vy = this.ay + uy * s;
        if (vx >= bx0 && vx <= bx1 && vy >= by0 && vy <= by1) {
          g.grabVine(p, this, clamp(sCenter, VINE_MIN_R, this.len));
          return;
        }
      }
      // Also check perpendicular distance from his body vertical span to the vine ray
      for (const sampleY of [by0 + padY + 3, (by0 + by1) * 0.5, by1 - padY - 2]) {
        const s = (cx - this.ax) * ux + (sampleY - this.ay) * uy;
        if (s >= 10 && s <= this.len + 10 && Math.abs((cx - this.ax) * uy - (sampleY - this.ay) * ux) <= p.w * 0.5 + padX) {
          g.grabVine(p, this, clamp(s, VINE_MIN_R, this.len));
          return;
        }
      }
    }
  }
  draw(ctx, g) {   // (in fine pixels: hires.js)
    const n = Math.ceil(this.len / 3), bend = clamp(-this.w * 26, -5, 5);
    const ux = Math.sin(this.a), uy = Math.cos(this.a);
    // the rope trails a little behind the swing (a gentle bow), with leaves every so often
    const pt = k => { const r = k * this.len, b = Math.sin(k * Math.PI) * bend; return [this.ax + ux * r + uy * b + 0.5, this.ay + uy * r - ux * b]; };
    const rope = (wd, c) => { ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = pt(i / n); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); };
    ctx.lineCap = ctx.lineJoin = 'round';
    rope(2.6, '#16361f'); rope(1.3, '#3f8a34');
    ctx.setLineDash([1.4, 2.6]); rope(0.6, '#6fb84a'); ctx.setLineDash([]);   // the twist of the liana
    for (let i = 4; i < n; i += 4) {
      const [x, y] = pt(i / n), sd = (i / 4 | 0) % 2 ? 1 : -1, ang = sd > 0 ? 0.35 : Math.PI - 0.35;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.sin(this.a * 3 + i) * 0.15);
      fEll(ctx, 3, 0, 3.6, 1.7, '#16361f'); fEll(ctx, 3, 0, 2.9, 1.05, '#4f9a3c'); fEll(ctx, 3.4, -0.4, 1.8, 0.45, '#8ad860');
      ctx.restore();
    }
    const [tx, ty] = pt(1);   // a little flower bud at the tip
    fBlob(ctx, tx, ty + 2, 2.2, '#16361f'); fBlob(ctx, tx, ty + 2, 1.4, '#ff7ab0'); fBlob(ctx, tx - 0.4, ty + 1.5, 0.5, '#ffd0e4');
  }
}

// Gulp pod: a giant flytrap on a long stalk (two toothy leaf lobes that gape, snap shut and chew).
// Touch it and it swallows Chickaroo whole; it spits him out like a cannonball the way its jaws
// point (a straight flight for a moment, then a normal arc). 'aim' pods hold one direction and fire when you press jump, 'sweep' pods swing their aim to
// and fro (time the shot), 'auto' pods fire on their own after a gulp. Angles in degrees, 0 = right,
// -90 = straight up.
const POD_SPEED = 6, POD_BLAST = 20, POD_AUTO = 34;
const POD_LOBE = 20, POD_HINGE = 10;   // the trap's art: lobe length, and how far behind its middle the hinge sits
class Gulpod extends Enemy {
  constructor(col, row, deg, mode, sweep, period) {
    super(col * TILE, row * TILE, 16, 16);
    this.col = col; this.px = col * TILE + 8; this.py = row * TILE + 8;
    this.base = (deg || 0) * Math.PI / 180; this.a = this.base; this.mode = mode || 'aim';
    this.sweep = (sweep || 0) * Math.PI / 180; this.period = period || 120;
    this.full = 0; this.cool = 0; this.puff = 0; this.stalkTo = null;
    this.invite = col === 328;   // the first gulpod at the foot of the mesa: hearts and a bobbing arrow show it's friendly
    this.passive = true; this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (this.cool > 0) this.cool--;
    if (this.puff > 0) this.puff--;
    if (this.stalkTo == null) {   // the stalk grows up from the first solid ground below (or the river)
      const c = Math.floor(this.px / TILE);
      let r = Math.floor(this.py / TILE) + 1;
      while (r < ROWS && !g.level.solid(c, r)) r++;
      this.stalkTo = r < ROWS ? r * TILE : VIEW_H + 8;
    }
    if (this.mode === 'sweep') this.a = this.base + Math.sin(this.t * Math.PI * 2 / this.period) * this.sweep;
    const p = g.player;
    if (p.inPod === this) {
      this.full++;
      p.x = this.px - p.w / 2; p.y = this.py - p.h / 2; p.vx = 0; p.vy = 0;
      const fire = this.mode === 'auto' ? this.full >= POD_AUTO : this.full > 6 && (Input.hit('jump') || Input.hit('spin'));
      if (fire) g.firePod(p, this);
      return;
    }
    this.full = 0;
    if (p.state !== 'play' || p.inPod || this.cool > 0) return;
    // touching the bulb: the nearest point of Chickaroo's box within reach of its middle
    const dx = clamp(this.px, p.x, p.x + p.w) - this.px, dy = clamp(this.py, p.y, p.y + p.h) - this.py;
    if (dx * dx + dy * dy < 10 * 10) g.enterPod(p, this);
  }
  draw(ctx, g) {
    if (g && !this.full && (this.px < g.camX - 140 || this.px > g.camX + VIEW_W + 140)) return;   // (well off screen: its aim line can reach 120px, so a full one always draws)
    const x = this.px, y = this.py, t = this.t, c = Math.cos(this.a), s = Math.sin(this.a), full = this.full > 0;
    // where the trap hinges (the back of its jaws), in the world: the stem grows up to it
    const hx = x - c * POD_HINGE, hy = y - s * POD_HINGE;
    this.drawStem(ctx, hx, hy);
    // the trap: two leaf lobes hinged at the back, like a Venus flytrap (painted fine in its own frame: jungle-fine.js)
    const chew = full ? Math.round(Math.abs(Math.sin(this.full * 0.4)) * 4) * 0.4 : 0;
    const open = full ? 0 : Math.round((this.puff > 0 ? 0.55 + this.puff * 0.03 : 0.42 + Math.sin(t * 0.06) * 0.06) * 25) / 25;
    ctx.save(); ctx.translate(x, y); ctx.rotate(this.a); ctx.drawImage(podArt(open, chew), -14, -23); ctx.restore();
    // sticky dew on the inner face catches the light now and then
    if (!full) for (let k = 0; k < 4; k++) {
      if ((t + k * 23) % 80 > 5) continue;
      const sg = k % 2 ? 1 : -1, lu = 5 + k * 3.5, lv = sg * 1.2, oc = Math.cos(open), os = Math.sin(open);
      const pu = lu * oc - lv * os * sg, pv = lu * os * sg + lv * oc, u = pu - POD_HINGE;
      fBlob(ctx, x + u * c - pv * s, y + u * s + pv * c, 0.55, '#ffffff');
    }
    if (this.invite && !full) {
      // Little pink hearts floating up above the plant and fading away, plus a bobbing arrow marker inviting Chickaroo to jump in.
      const period = 72;
      for (let slot = 0; slot < 3; slot++) {
        const local = t + slot * 24, age = local % period, cycle = Math.floor(local / period), u = age / period;
        const alpha = Math.min(1, age / 10, (period - age) / 18) * 0.92;
        if (alpha <= 0.02) continue;
        const side = ((slot + cycle) % 3 - 1) * 4.2;
        const hx = x + side + Math.sin(u * 5.2 + slot * 2.1 + cycle) * 2.4;
        const hy = y - 16 - u * 18;
        ctx.globalAlpha = alpha;
        fineHeart(ctx, hx, hy, 4.2, slot % 2 ? '#ff7aa8' : '#ff5d8f');
      }
      const ax = Math.round(x), ay = Math.round(y - 22 + Math.sin(t * 0.12) * 2.2);
      ctx.globalAlpha = 0.85 + Math.sin(t * 0.12) * 0.15;
      fPoly(ctx, [[ax - 1.8, ay - 6.6], [ax + 1.8, ay - 6.6], [ax + 1.8, ay - 2.6], [ax + 4.4, ay - 2.6], [ax, ay + 2.2], [ax - 4.4, ay - 2.6], [ax - 1.8, ay - 2.6]], INK);
      fPoly(ctx, [[ax - 0.9, ay - 5.7], [ax + 0.9, ay - 5.7], [ax + 0.9, ay - 1.8], [ax + 2.9, ay - 1.8], [ax, ay + 1], [ax - 2.9, ay - 1.8], [ax - 0.9, ay - 1.8]], '#ffd166');
      fRect(ctx, ax - 0.5, ay - 5.3, 0.7, 3.2, '#fff6dc');
      ctx.globalAlpha = 1;
    }
    // a swallowed Chickaroo makes the aim visible: a bold line of outlined dots marching out along
    // the shot, ending in an arrowhead. An 'auto' pod fills its line in as it counts down to the shot.
    if (full) {
      const auto = this.mode === 'auto', fill = auto ? Math.min(1, this.full / POD_AUTO) : 1;
      const n = 8, march = (t * 0.6) % 12, last = 18 + (n - 1) * 12;
      const pulse = auto && fill > 0.7 ? (t >> 2) % 2 : 0, col = pulse ? '#ff5d8f' : '#ffd166';
      for (let k = n - 1; k >= 0; k--) {
        const d = 18 + k * 12 + (auto ? 0 : march);
        if (d > last || (auto && k / n >= fill)) continue;
        const dx = x + c * d, dy = y + s * d;
        ctx.globalAlpha = 1 - (d - 18) / (last - 18) * 0.3;
        fBlob(ctx, dx, dy, 3.2, INK); fBlob(ctx, dx, dy, 2.2, col); fBlob(ctx, dx - 0.7, dy - 0.7, 0.9, '#ffffff');
      }
      if (fill >= 1 || !auto) {   // the arrowhead
        const ax = x + c * (last + 12), ay = y + s * (last + 12), at = (i, sd) => [ax - c * i - s * sd * i, ay - s * i + c * sd * i];
        ctx.globalAlpha = (t >> 3) % 2 ? 1 : 0.8;
        ctx.lineCap = ctx.lineJoin = 'round';
        for (const [wd, cc] of [[4.2, INK], [2.2, col]]) { ctx.strokeStyle = cc; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(...at(6.5, -1)); ctx.lineTo(ax, ay); ctx.lineTo(...at(6.5, 1)); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    }
  }
  // The stem: a fleshy, tapering stalk curving up from the ground to the trap's hinge, swaying a
  // little, with broad veined leaves along it and a rosette where it comes out of the ground.
  drawStem(ctx, hx, hy) {   // (in fine pixels: hires.js)
    const bx = this.px, by = this.stalkTo == null ? this.py + 40 : this.stalkTo, sway = Math.sin(this.t * 0.03 + this.px) * 3;
    const cx = bx + sway, cy = (by + hy) / 2 + 6;
    const at = k => { const m = 1 - k; return [m * m * bx + 2 * m * k * cx + k * k * hx, m * m * by + 2 * m * k * cy + k * k * hy]; };
    const steps = Math.max(8, Math.ceil(Math.hypot(hx - bx, hy - by) / 3)), wAt = k => 3.4 - k * 1.9;   // thick at the foot, slim at the top
    ctx.lineCap = 'round';
    for (const [grow, col, dx] of [[1.3, INK, 0], [0, '#2f6a2a', 0], [-1.4, '#4f9a3c', -0.5], [-2.6, '#7fc458', -0.9]]) {
      ctx.strokeStyle = col;
      for (let i = 0; i < steps; i++) {
        const [x0, y0] = at(i / steps), [x1, y1] = at((i + 1) / steps), wd = wAt(i / steps) * 2 + grow;
        if (wd <= 0.3) continue;
        ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x0 + dx * wAt(i / steps) / 3.4, y0); ctx.lineTo(x1 + dx * wAt(i / steps) / 3.4, y1); ctx.stroke();
      }
    }
    for (let k = 0.2; k < 0.9; k += 0.22) { const [nx, ny] = at(k); fEll(ctx, nx, ny, wAt(k) + 0.2, 0.5, '#2a5e26'); }   // nodes
    // leaves: long, pointed, veined blades (the tip droops), from (sx, sy) at angle `ang`; never below `floor`
    const blade = (sx, sy, ang, len, sd, floor = Infinity) => {
      const dx = Math.cos(ang), dy = Math.sin(ang), side = o => { const pts = []; for (let i = 0; i <= 12; i++) { const f = i / 12, w = Math.sin(Math.pow(f, 0.7) * Math.PI) * 3.8 * o, d = f * len, droop = f * f * 5; pts.push([sx + dx * d - dy * w, sy + dy * d + droop + dx * w]); } return pts; };
      const up = side(-sd), dn = side(sd), mid = side(0);
      ctx.save(); if (floor < Infinity) { ctx.beginPath(); ctx.rect(sx - 40, floor - 80, 80, 80); ctx.clip(); }
      const shape = (a, b, col) => { ctx.fillStyle = col; ctx.beginPath(); a.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); for (let i = b.length - 1; i >= 0; i--) ctx.lineTo(...b[i]); ctx.fill(); };
      ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.beginPath(); up.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); for (let i = dn.length - 1; i >= 0; i--) ctx.lineTo(...dn[i]); ctx.closePath(); ctx.stroke();
      shape(up, mid, '#6fc24e'); shape(mid, dn, '#459034');   // the upper half catches the light
      ctx.strokeStyle = '#2f6a2a'; ctx.lineWidth = 0.5; ctx.beginPath(); mid.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.lineWidth = 0.34; for (let i = 3; i < 11; i += 2) { const [mx, my] = mid[i], [ux, uy] = up[i + 1], [qx, qy] = dn[i + 1]; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo((mx + ux * 2) / 3, (my + uy * 2) / 3); ctx.moveTo(mx, my); ctx.lineTo((mx + qx * 2) / 3, (my + qy * 2) / 3); ctx.stroke(); }
      ctx.restore();
    };
    // ...angling up off the stem, alternating sides, swaying a little
    const leaf = (k, sd, len) => { const [sx, sy] = at(k); blade(sx, sy, -Math.PI / 2 + sd * 1.05 + Math.sin(this.t * 0.04 + k * 9) * 0.06, len, sd); };
    const tall = by - hy;
    if (tall > 40) leaf(0.42, -1, 15);
    if (tall > 70) leaf(0.64, 1, 13);
    if (tall > 100) leaf(0.24, 1, 16);
    // the rosette at its foot (only where it grows from the ground, not out of the river below the screen)
    if (by < VIEW_H) for (const [ang, len, sd] of [[Math.PI + 0.25, 12, 1], [Math.PI + 0.8, 8, 1], [-0.25, 12, -1], [-0.8, 8, -1]]) blade(bx, by - 1, ang, len, sd, by);
  }
}

// Chimpchuck: a cheeky monkey in a red baseball cap that sits on logs and stumps lobbing coconuts at Chickaroo. It raises
// a coconut over its head (chattering), throws it in a high arc to where he's heading, then
// cackles. Stompable; the coconuts crack open the moment they hit anything.
class Chimpchuck extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 18, 14, 18);
    this.state = 'sit'; this.timer = 70; this.face = -1;
  }
  onThaw() { this.state = 'sit'; this.timer = 60; }
  update(g) {
    this.t++;
    this.vx = 0; this.walk(g, false);
    const p = g.player, pcx = p.x + p.w / 2, dx = pcx - this.cx;
    if (Math.abs(dx) > 4) this.face = Math.sign(dx);
    const near = Math.abs(dx) < 230 && this.x > g.camX - 20 && this.x < g.camX + VIEW_W + 20 && p.state === 'play';
    if (this.state === 'sit') { if (near && --this.timer <= 0) { this.state = 'windup'; this.timer = 0; Sound.play('chatter'); } }
    else if (this.state === 'windup') {
      if (++this.timer >= 28) {
        // aim the lob where he's going to be, so it lands on him (or right in his way)
        const T = 46, tx = clamp(pcx + p.vx * 22, this.cx - 180, this.cx + 180), ty = p.y + p.h - 5, y0 = this.y - 6;
        const vx = (tx - this.cx) / T, vy = clamp((ty - y0 - 0.5 * COCO_G * T * T) / T, -6.5, -2);
        g.entities.push(new Coconut(this.cx + this.face * 4, y0, vx, vy));
        this.state = 'laugh'; this.timer = 0;
      }
    } else if (this.state === 'laugh' && ++this.timer >= 40) { this.state = 'sit'; this.timer = 100 + Math.floor(rand(0, 50)); }
  }
  draw(ctx) {   // (painted fine: chimpArt, jungle-fine.js)
    const f = this.face, x = Math.round(this.cx), by = Math.round(this.y + this.h), st = this.state;
    if (this.flipped) { ctx.save(); ctx.translate(0, by * 2 - this.h); ctx.scale(1, -1); }
    const hop = st === 'laugh' ? -Math.abs(Math.sin(this.timer * 0.4)) * 3 : 0, y = by + fSnap(hop), up = st === 'windup';
    ctx.save(); ctx.translate(x, y); if (f < 0) ctx.scale(-1, 1);
    ctx.drawImage(chimpArt(up, st === 'laugh'), -20, -34);
    ctx.restore();
    // Hold the coconut between the raised hands, above the cap crown.
    if (up) drawCoconut(ctx, x, y - 30 - Math.min(1, this.timer / 10) * 2, 0.6);
    if (this.flipped) ctx.restore();
  }
}
const COCO_G = 0.22;
class Coconut extends Enemy {
  constructor(cx, y, vx, vy) {
    super(cx - 5, y - 5, 10, 10);
    this.vx = vx; this.vy = vy; this.bounces = 0; this.ang = 0;
  }
  crack(g) {
    if (this.dead) return;
    this.dead = true; this.remove = true;
    for (let i = 0; i < 10; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-4, 4), y: this.y + 5 + rand(-4, 4), vx: rand(-1.8, 1.8), vy: rand(-2.6, -0.4), g: 0.2, life: 30, t: 0, color: i % 3 ? '#7a4a28' : '#fff6e0', size: 2 });
    if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('break');
  }
  flipKill(g) { this.crack(g); }
  stomp(g, p) { this.crack(g); g.bounce(p); g.stompScore(this); Sound.play('stomp'); }
  update(g) {
    this.t++;
    const lv = g.level;
    this.vy = Math.min(this.vy + COCO_G, 5.5);
    if (sweepX(lv, this, this.vx)) { this.crack(g); return; }   // smashes on a wall...
    const r = sweepY(lv, this, this.vy);
    if (r === 1) { this.crack(g); return; }                       // ...or on the ground
    if (r === -1) this.vy = 0;
    this.sandCheck(g);
    this.ang += this.vx * 0.25;
    if (this.t > 360) this.crack(g);
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 64 || this.x > g.camX + VIEW_W + 64) this.remove = true;
  }
  draw(ctx) { drawCoconut(ctx, this.cx, this.y + 5, this.ang); }   // (painted fine: jungle-fine.js)
}

// Chamelurk: a chameleon so well camouflaged that only its swivelling turret eyes give it away.
// When Chickaroo comes close in front of it, it flushes bright colours and lashes its long sticky
// tongue out at him. Stompable any time (spotting a hidden one is worth a bonus).
const TONGUE_LEN = 42, CHAM_REVEAL = 18, CHAM_FLUSH = 50;   // frames: fully shown, then the lash
class Chamelurk extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 11, 18, 11);
    this.state = 'hide'; this.timer = 0; this.cool = 50; this.face = -1; this.vis = 0; this.tongue = 0; this.turn = 0;
  }
  onThaw() { this.state = 'hide'; this.timer = 0; this.tongue = 0; }
  tongueBox() {
    if (this.tongue < 4) return null;
    const y = this.y + 3;
    return this.face > 0 ? { x: this.x + this.w, y, w: this.tongue, h: 4 } : { x: this.x - this.tongue, y, w: this.tongue, h: 4 };
  }
  touches(p) { const b = this.tongueBox(); return overlap(this, p) || (!!b && overlap(b, p)); }
  onTouch(g, p) {
    const b = this.tongueBox();
    if (b && overlap(b, p) && !overlap(this, p)) { g.hurtPlayer(); return; }
    super.onTouch(g, p);
  }
  stomp(g, p) {
    if (this.vis < 0.5) g.addScore(1000, this.cx, this.y - 10);
    super.stomp(g, p);
    p.vy *= 1.7;
  }
  update(g) {
    this.t++; this.timer++;
    this.vx = 0; this.walk(g, false);
    const p = g.player, dx = p.x + p.w / 2 - this.cx, dy = Math.abs(p.y + p.h - (this.y + this.h));
    if (this.cool > 0) this.cool--;
    if (this.state === 'hide') {
      this.vis = Math.max(0, this.vis - 0.03);
      // slowly turn to face him if he sneaks round behind
      if (dx * this.face < -8) { if (++this.turn > 50) { this.face = -this.face; this.turn = 0; } } else this.turn = 0;
      if (!this.cool && p.state === 'play' && dx * this.face > 0 && Math.abs(dx) < 80 && dy < 26) {
        this.state = 'flush'; this.timer = 0;
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('snip');
      }
    } else if (this.state === 'flush') {
      // a fair warning: it pops into full colour with a "!", then rears back and gapes for a
      // moment before the lash, so there's time to back off or jump over it
      this.vis = Math.min(1, this.vis + 0.08);
      if (this.timer === CHAM_REVEAL && this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('snip');
      if (this.timer >= CHAM_FLUSH) { this.state = 'lash'; this.timer = 0; if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('tongue'); }
    } else if (this.state === 'lash') {
      const k = this.timer;
      this.tongue = k <= 7 ? Math.round(TONGUE_LEN * k / 7) : k <= 15 ? TONGUE_LEN : Math.max(0, Math.round(TONGUE_LEN * (1 - (k - 15) / 10)));
      if (k >= 25) { this.tongue = 0; this.state = 'show'; this.timer = 0; }
    } else if (this.state === 'show' && this.timer >= 50) { this.state = 'hide'; this.timer = 0; this.cool = 70; }
  }
  draw(ctx, g) {   // (painted fine: chamArt, jungle-fine.js; in its own frame: x across from its back, facing +x)
    const f = this.face, x = Math.round(this.x), by = Math.round(this.y + this.h), t = this.t, v = this.vis;
    if (this.flipped) { ctx.save(); ctx.translate(0, by * 2 - this.h); ctx.scale(1, -1); }
    ctx.save(); ctx.translate(f > 0 ? x : x + this.w, by); if (f < 0) ctx.scale(-1, 1);
    // winding up: rocks back on its legs, then gapes with the tongue tip showing
    const wind = this.state === 'flush' ? Math.max(0, (this.timer - CHAM_REVEAL) / (CHAM_FLUSH - CHAM_REVEAL)) : 0;
    if (wind > 0) ctx.translate(-(wind < 0.7 ? wind / 0.7 * 2 : 2 - ((t >> 1) & 1)), 0);   // (a tense quiver just before it fires)
    // hidden it's the colour of the moss, and semi-transparent with a subtle shimmer; flushed it's hot orange and teal
    const cloakPulse = v < 0.5 ? Math.sin(t * 0.08 + this.x * 0.1) * 0.07 : 0;
    ctx.globalAlpha = clamp(0.54 + cloakPulse + v * 0.46, 0, 1); ctx.drawImage(chamArt(v > 0.5), -7, -16); ctx.globalAlpha = 1;
    if (v < 0.5) {
      // Shimmering lime-white contour glints travelling along its crest and casque so players can spot it when cloaked
      const gx = 4 + ((t * 0.35 + this.x) % 12);
      ctx.globalAlpha = 0.65 + Math.sin(t * 0.12) * 0.25;
      fBlob(ctx, gx, -9.8, 0.85, '#e8ffd8');
      fBlob(ctx, 14.6, -12.2, 0.7, '#d8ffc8');
      ctx.globalAlpha = 1;
    }
    // turret eye: always visible, larger and brighter with a golden-amber rim, pupil tracking Chickaroo
    let ex = 0, ey = 0;
    if (g && g.player) { const p = g.player, dx = p.x + p.w / 2 - this.cx, dy = p.y + p.h / 2 - (this.y + 4); ex = Math.abs(dx) > 6 ? (dx * f > 0 ? 0.9 : -0.6) : 0; ey = dy < -10 ? -0.6 : 0.4; }
    fBlob(ctx, 16.6, -9.6, 3.4, INK); fBlob(ctx, 16.6, -9.6, 2.55, '#ffe680'); fBlob(ctx, 16.6, -9.6, 1.95, '#fff9e6');
    fBlob(ctx, 16.6 + ex, -9.6 + ey, 1.15, INK); fBlob(ctx, 16.1 + ex, -10.1 + ey, 0.45, '#ffffff');
    if (wind > 0) {   // jaw open, the sticky tip peeking out, throat puffed
      fPoly(ctx, [[14.4, -5.6], [20.4, -6.6], [20, -2.6]], INK); fPoly(ctx, [[15.4, -5.2], [19.4, -5.8], [19.2, -3.6]], '#a02050');
      if (wind > 0.5) fBlob(ctx, 19.2, -4.6, 1.2, '#ff8ac0');
      fEll(ctx, 13.4, -2.6, 2.4, 1.6, INK); fEll(ctx, 13.4, -2.7, 1.6, 0.9, '#ffd166');
    }
    // the tongue: a pink ribbon with a sticky blob on the end
    if (this.tongue > 0) {
      const tl = this.tongue;
      fRoundRect(ctx, 18, -7.2, tl, 2.2, 1, '#c23a78'); fRoundRect(ctx, 18, -7.2, tl, 0.8, 0.4, '#ff8ac0');
      fBlob(ctx, 18 + tl + 0.5, -6, 3.2, INK); fBlob(ctx, 18 + tl + 0.5, -6, 2.3, '#ff5da8'); fBlob(ctx, 18 + tl - 0.3, -6.8, 0.8, '#ffc8e0');
    }
    ctx.restore();
    // the "!" while it's revealing itself and winding up
    if (this.state === 'flush' && !this.flipped) {
      const ix = (f > 0 ? x + 15 : x + this.w - 16) + 1, iy = by - 24 - (this.timer < 6 ? 6 - this.timer : 0);
      fRoundRect(ctx, ix - 2, iy - 1.4, 4, 6.4, 1.6, INK); fRoundRect(ctx, ix - 1, iy - 0.4, 2, 4.4, 1, '#ffd166');
      fBlob(ctx, ix, iy + 7.2, 1.9, INK); fBlob(ctx, ix, iy + 7.2, 1, '#ffd166');
    }
    if (this.flipped) ctx.restore();
  }
}

// Lily pad: floats on its river, so it rises and falls with the monsoon flood. Where the river
// runs dry it settles on the mud, and the next flood lifts it (and anyone standing on it) back up.
class LilyPad {
  constructor(lv, col, wt) {
    this.col = col; this.x = col * TILE + 2; this.w = (wt || 2) * TILE - 4; this.h = 6;
    let rest = VIEW_H + 60;
    for (let c = col; c < col + (wt || 2); c++) for (let r = 0; r < ROWS; r++) if (lv.solid(c, r)) { rest = Math.min(rest, r * TILE); break; }
    this.rest = rest - this.h; this.t = col * 13;
    this.y = this.prevY = this.rest; this.dx = 0; this.dy = 0; this.placed = false;
    this.stepUp = true;   // resting on the mud it's barely higher than the ground: walking onto it steps up
  }
  update(g) {
    this.t++;
    const wy = g.waterAt(this.x + this.w / 2), oy = this.y;
    let y = wy == null ? this.rest : wy - 3 + Math.sin(this.t * 0.05) * 0.5;
    y = Math.min(y, this.rest);
    if (!this.placed) { this.placed = true; this.y = this.prevY = y; return; }
    this.y = y; this.prevY = oy; this.dy = y - oy; this.dx = 0;
  }
  draw(ctx) { ctx.drawImage(lilyArt(this.w), Math.round(this.x) - 2, fSnap(this.y) - 9); }   // (painted fine: jungle-fine.js)
}

// Thumpdrum: a big hide drum with a mean face that slowly stomps around the jungle floor. Every
// three seconds it squats, then hops (a low little hop) and slams down: the thump sends a shockwave
// rolling out along the ground. Jump the wave (or stay out of range); stompable from above.
// Every stomp that bounces off its hide makes it angrier: it marches faster and thumps far more often,
// and on its last legs it comes straight for Chickaroo, fuming. (Per rage level: 0, 1, 2 stomps taken.)
const THUMP_EVERY = 180, THUMP_WARN = 26, THUMP_SPEED = 0.3, THUMP_HOP = 2.7, THUMP_WAVE = 18;
const THUMP_RAGE_EVERY = [180, 100, 52], THUMP_RAGE_SPEED = [0.3, 0.75, 1.3], THUMP_RAGE_WARN = [26, 20, 14];
class Thumpdrum extends Enemy {
  constructor(col, row) {
    super(col * TILE - 6, (row + 1) * TILE - 22, 28, 22);
    this.walker = true; this.dir = -1; this.vx = -THUMP_SPEED;
    this.cd = THUMP_EVERY - (col * 37) % 90;   // neighbours don't thump in unison
    this.air = false; this.wave = 0; this.waveHit = false; this.comp = 0; this.hp = 3; this.hurtT = 0;
    this.stompMargin = 14;   // tall body + ground pound speed (8.5 px/frame) + hop: generous stomp window
  }
  // tough hide: the first two stomps just bounce Chickaroo off (it flashes and booms), the third breaks it
  stomp(g, p) {
    if (--this.hp > 0) {
      g.bounce(p); this.comp = 8; this.hurtT = 20;
      g.shake = Math.max(g.shake, 1.5); Sound.play('drum');
      this.cd = Math.min(this.cd, this.every());                   // ...and it's furious: no waiting about now
      g.burst(this.cx, this.y + 2, ['#ffffff', '#e8e8e8', '#ff6a5a'], 8);
    } else {
      super.stomp(g, p);
    }
    // Lift Chickaroo clear above the drum's rim so he isn't left overlapping its hitbox on the next frame
    p.y = Math.min(p.y, this.y - p.h); p.prevY = p.y;
    // A fixed modest hop on every hit, including the finishing stomp.
    // No held-jump gravity or late stomp upgrade can turn it into a high jump.
    p.vy = -STOMP_BOUNCE; p.jumping = false; p.holdGrace = 0; p.pounding = false; p.poundT = 0;
    p.stompSmall = false; p.coyote = 0;
    // Bounce Chickaroo off to the left or right so the player cannot cheese by standing on top
    const dx = (p.x + p.w / 2) - this.cx;
    const side = Math.abs(dx) > 1 ? Math.sign(dx) : (Math.abs(p.vx) > 0.1 ? Math.sign(p.vx) : (p.facing < 0 ? -1 : 1));
    p.vx = side * 2.5; p.airMax = Math.max(p.airMax || 0, Math.abs(p.vx));
  }
  rage() { return clamp(3 - this.hp, 0, 2); }
  every() { return THUMP_RAGE_EVERY[this.rage()]; }
  warn() { return THUMP_RAGE_WARN[this.rage()]; }
  update(g) {
    this.t++;
    if (this.comp > 0) this.comp--;
    if (this.hurtT > 0) this.hurtT--;
    const rage = this.rage(), p = g.player;
    // fuming: steam puffs off the rim, faster the angrier it is
    if (rage && this.t % (rage > 1 ? 5 : 11) === 0) for (const sd of [-1, 1]) g.particles.push({ kind: 'px', x: this.cx + sd * rand(10, 14), y: this.y + 1, vx: sd * rand(0.2, 0.6), vy: rand(-1.2, -0.6), drag: 0.95, life: 22, t: 0, color: this.t % 3 ? '#f4f4f4' : '#ffb0a0', size: 2 });
    // on its last legs it turns to face him and charges
    if (rage > 1 && !this.air && p.state === 'play' && Math.abs(p.x + p.w / 2 - this.cx) > 10) this.dir = Math.sign(p.x + p.w / 2 - this.cx);
    if (this.air) {
      this.vx = 0;
      this.walk(g, false);
      if (this.onGround && this.vy === 0) this.land(g);
    } else {
      if (this.cd > 0) this.cd--;
      this.vx = this.cd > this.warn() ? this.dir * THUMP_RAGE_SPEED[rage] : 0;   // it plants its feet before the hop
      this.walk(g, true);
      if (this.vx) this.dir = Math.sign(this.vx);
      if (this.cd === 0 && this.onGround) { this.air = true; this.vy = -THUMP_HOP; this.onGround = false; }
    }
    if (this.wave > 0) this.updateWave(g);
  }
  land(g) {
    this.air = false; this.cd = this.every(); this.comp = 8;
    this.wave = 1; this.waveHit = false;
    g.shake = Math.max(g.shake, 1.5);
    g.dust(this.cx - 8, this.y + this.h, 4); g.dust(this.cx + 8, this.y + this.h, 4);
    if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('drum');
  }
  waveR() { return 12 + this.wave * 2.4; }
  // the shockwave: a ring racing out along the drum's own floor; it only catches feet at that height (not above it, not far below on other terrain)
  updateWave(g) {
    const p = g.player;
    const feet = p.y + p.h - (this.y + this.h);   // vs the drum's own floor: only feet on it (or just above) get hit
    if (!this.waveHit && p.state === 'play' && !p.inPod && feet > -10 && feet < 6) {
      const d = Math.abs(p.x + p.w / 2 - this.cx), r = this.waveR();
      if (d > r - 8 && d < r + 8) { this.waveHit = true; g.hurtPlayer(); }
    }
    if (++this.wave > THUMP_WAVE) this.wave = 0;
  }
  draw(ctx, g) {   // (painted fine: thumpArt, jungle-fine.js)
    const cx = Math.round(this.cx), top = Math.round(this.y), by = top + this.h;
    const rage = this.dead ? 0 : this.rage();
    const winding = !this.air && this.cd <= this.warn() && !this.dead;
    const dip = winding ? 1 + (this.cd % 4 < 2 ? 1 : 0) : this.comp > 4 ? 2 : this.comp > 0 ? 1 : 0;
    const wob = winding ? (this.cd % 2 ? 1 : -1) : rage > 1 ? ((this.t >> 1) % 2 ? 1 : -1) * ((this.t >> 3) % 2) : 0;   // (so angry it trembles)
    if (this.hurtT > 0 && (this.hurtT >> 1) % 2) ctx.globalAlpha = 0.45;   // flashes after a stomp without vanishing
    if (this.flipped) { ctx.save(); ctx.translate(0, top * 2 + this.h); ctx.scale(1, -1); }
    // the shockwave ring on the ground
    if (this.wave > 0) {
      const k = this.wave / THUMP_WAVE, r = this.waveR(), hh = 5 - k * 3;
      ctx.globalAlpha = (1 - k) * 0.85; ctx.strokeStyle = '#fff6dc'; ctx.lineCap = 'round';
      for (const sd of [-1, 1]) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(cx + sd * (r - 4), by, 4, hh, 0, Math.PI, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(cx + sd * (r - 4), by, 2, hh * 0.55, 0, Math.PI, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = this.hurtT > 0 && (this.hurtT >> 1) % 2 ? 0.45 : 1;
    }
    let px = 0;
    if (g && g.player) { const dx = g.player.x + g.player.w / 2 - this.cx; px = dx < -8 ? -1 : dx > 8 ? 1 : 0; }
    const x = cx + wob;
    ctx.drawImage(thumpArt(clamp(3 - this.hp, 0, 2), rage, px), x - 18, top - 2);
    // the hide skin stretched over the top, dipping as it squats and slams
    fRoundRect(ctx, x - 15.4, top + dip - 0.4, 30.8, 4.6, 1.6, INK);
    fEll(ctx, x, top + dip + 1.8, 14.2, 1.5, '#f2dcae'); fEll(ctx, x - 2, top + dip + 1.4, 9, 0.6, '#fff6dc');
    fRoundRect(ctx, x - 15, top + 3, 30, 1.4, 0.6, '#3a1a0a'); fRoundRect(ctx, x - 14, top + 3.2, 28, 0.6, 0.3, '#8a4a20');
    if (rage && (rage > 1 || (this.t >> 4) % 2)) {   // a throbbing anger mark (the cartoon vein), popping up over its rim
      const ax = x + 9.5, ay = top - 7.5, s = 1 + (rage > 1 && (this.t >> 2) % 2 ? 0.25 : 0);
      ctx.lineCap = 'round';
      for (const [wd, col] of [[2.4, INK], [1.1, '#ff2a2a']]) {
        ctx.strokeStyle = col; ctx.lineWidth = wd;
        for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(ax + qx * 3.6 * s, ay + qy * 3.6 * s, 2.4 * s, Math.atan2(-qy, -qx) - 0.95, Math.atan2(-qy, -qx) + 0.95); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
    if (this.flipped) ctx.restore();
  }
}

// Logator: a crocodile so still and knobbly it passes for a floating log. It drifts to and fro on
// its river (ride it across!), but now and then its eyes pop open, bubbles rise, and it dives for a
// while - taking any rider down into the water with it. Its snout snaps at anything right in front.
const CROC_CLACK = 28;   // frames per bite: gape (28-14), slam shut (14-10), hold shut
const CROC_W = 44, CROC_WARN = 60, CROC_SINK = 18, CROC_UNDER = 80, CROC_RISE = 18;
class Logator {
  constructor(c0, c1, period, phase) {
    this.lo = c0 * TILE; this.hi = (c1 + 1) * TILE - CROC_W;
    this.x = this.lo + (this.hi - this.lo) * 0.3; this.w = CROC_W; this.h = 8; this.dir = 1;
    this.period = Math.max(period || 300, CROC_WARN + CROC_SINK + CROC_UNDER + CROC_RISE + 60);
    this.t = Math.floor((phase || 0) * this.period); this.dip = 0; this.snap = 0;
    this.y = this.prevY = 1e5; this.dx = 0; this.dy = 0; this.placed = false;
  }
  phase() {
    const k = this.t % this.period, a = this.period - (CROC_WARN + CROC_SINK + CROC_UNDER + CROC_RISE);
    if (k < a) return ['float', 0];
    if (k < a + CROC_WARN) return ['warn', (k - a) / CROC_WARN];
    if (k < a + CROC_WARN + CROC_SINK) return ['sink', (k - a - CROC_WARN) / CROC_SINK];
    if (k < a + CROC_WARN + CROC_SINK + CROC_UNDER) return ['under', 1];
    return ['rise', 1 - (k - a - CROC_WARN - CROC_SINK - CROC_UNDER) / CROC_RISE];
  }
  update(g) {
    this.t++;
    const [ph, k] = this.phase(), ox = this.x, oy = this.y;
    this.ph = ph;
    // drift (it holds still while it's busy diving)
    if (ph === 'float') {
      this.x += this.dir * 0.4;
      if (this.x <= this.lo) { this.x = this.lo; this.dir = 1; }
      if (this.x >= this.hi) { this.x = this.hi; this.dir = -1; }
    }
    this.dip = ph === 'sink' ? k * 22 : ph === 'under' ? 22 : ph === 'rise' ? k * 22 : 0;
    const wy = g.waterAt(this.x + this.w / 2);
    this.y = (wy == null ? VIEW_H + 20 : wy - 4) + this.dip + (ph === 'float' ? Math.sin(this.t * 0.06) * 0.4 : 0);
    if (!this.placed) { this.placed = true; this.prevY = this.y; this.dx = 0; this.dy = 0; return; }
    this.prevY = oy; this.dx = this.x - ox; this.dy = this.y - oy;
    const on = this.x > g.camX - 60 && this.x < g.camX + VIEW_W + 20;
    if (ph === 'warn' && on && this.t % 9 === 0) g.bubble(this.x + 8 + rand(0, this.w - 16), this.y + 4);
    if (ph === 'sink' && k < 0.06 && on) { Sound.play('splash'); g.splash(this.x + this.w / 2, this.y + 4, 8); }
    if (ph === 'rise' && k > 0.94 && on) g.splash(this.x + this.w / 2, this.y + 4, 5);
    // the snout: with Chickaroo up ahead it clacks its jaws at him over and over - the head pitched
    // up toward him, the mouth gaping, then slamming shut. Only the slam hurts, and only right in front.
    const p = g.player, sx = this.dir > 0 ? this.x + this.w : this.x - 14;
    const near = ph === 'float' && p.state === 'play' && overlap({ x: this.dir > 0 ? sx - 4 : sx - 46, y: this.y - 40, w: 64, h: 50 }, p);
    // how far to pitch the head up: toward his feet, up to 4 px
    this.aim = near ? clamp(Math.round((this.y - (p.y + p.h)) / 6), 0, 4) : Math.max(0, (this.aim || 0) - 0.25);
    if (this.snap > 0) this.snap--;
    else if (near) this.snap = CROC_CLACK;
    if (this.snap === 10 && on) Sound.play('chomp');
    const box = { x: sx, y: this.y - 8 - this.aim * 3, w: 14, h: 12 + this.aim * 3 };
    if (this.snap >= 7 && this.snap <= 13 && p.state === 'play' && overlap(box, p)) g.hurtPlayer();
  }
  draw(ctx) {   // (painted fine: logatorArt, jungle-fine.js; the jaws live, in its own frame facing +x)
    if (this.y > VIEW_H + 10) return;
    const f = this.dir, w = this.w, t = this.t, y = fSnap(this.y);
    ctx.save(); ctx.translate(Math.round(this.x) + w / 2, y); ctx.scale(f, 1); ctx.translate(-w / 2, 0);
    ctx.drawImage(logatorArt(w), -14, -5);
    // jaws: gape wide (wider the higher he is), then slam shut; the whole head pitches up at him
    const sn = this.snap, aim = this.aim || 0, max = 10 + aim * 2;
    const open = sn > 14 ? max * Math.min(1, (CROC_CLACK - sn) / 8) : sn > 10 ? max * (sn - 10) / 4 : 0;
    const lift = aim * 0.75, drop = open / 3, top = i => -1 - lift - open * (i + 2) / 15;
    const BARK = '#6a7a3a', BARKD = '#3e4a22', BARKL = '#a8b85a';
    if (lift > 0.3) fRoundRect(ctx, w - 1, 6 - lift, 7, lift + 2, 1, INK);                       // neck under the raised head
    if (open > 0.5) fPoly(ctx, [[w, top(0) + 3], [w + 13, top(13) + 3.6], [w + 13, 3 - lift + drop], [w, 3 - lift]], '#7a1f2a');   // inside of the mouth
    fRoundRect(ctx, w - 0.6, 2.4 - lift + drop, 15, 5, 2, INK); fRoundRect(ctx, w, 3 - lift + drop, 13.4, 3.4, 1.6, BARKD); fRoundRect(ctx, w + 1, 5.4 - lift + drop, 11, 0.8, 0.4, '#c8c060');   // lower jaw
    if (open > 0.5) for (let i = 2; i < 12; i += 3) { fPoly(ctx, [[w + i, 2.9 - lift + drop], [w + i + 1.4, 2.9 - lift + drop], [w + i + 0.7, 1.2 - lift + drop]], '#ffffff'); fPoly(ctx, [[w + i, top(i) + 3.7], [w + i + 1.4, top(i + 1) + 3.7], [w + i + 0.7, top(i) + 5.4]], '#ffffff'); }   // teeth
    fPoly(ctx, [[w - 0.8, top(0) - 0.8], [w + 13.4, top(13) - 0.8], [w + 15, top(13) + 1.6], [w + 13.4, top(13) + 4.2], [w - 0.8, top(0) + 4.4]], INK);   // the upper jaw, hinged at the back of the head
    fPoly(ctx, [[w, top(0)], [w + 13, top(13)], [w + 13.8, top(13) + 1.6], [w + 13, top(13) + 3.4], [w, top(0) + 3.6]], BARK);
    fPoly(ctx, [[w, top(0)], [w + 13, top(13)], [w + 13, top(13) + 0.9], [w, top(0) + 0.9]], BARKL);
    for (let i = 3; i < 12; i += 3) fEll(ctx, w + i + 0.5, top(i) - 0.2, 0.8, 0.6, INK);           // knobbly ridges
    fEll(ctx, w + 11.5, top(12) - 0.6, 1.1, 0.7, INK);                                             // nostril bump on the snout tip
    if (sn >= 9 && sn <= 11) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath(); for (const [a, b, c2, d] of [[15, -1, 18, -2], [15, 2.4, 18, 3], [14.4, -3, 15.6, -5]]) { ctx.moveTo(w + a, b - lift); ctx.lineTo(w + c2, d - lift); } ctx.stroke(); }   // clack!
    // eyes: shut (it's just a log...) until it's about to dive or snap
    const awake = this.ph !== 'float' || this.snap > 0 || (this.aim || 0) > 0 || (t % 240) < 8;
    if (awake) { fEll(ctx, w - 1.6, -2.4, 1.9, 1.3, '#ffd166'); fEll(ctx, w - 1.2, -2.4, 0.5, 1.1, INK); }
    else fRoundRect(ctx, w - 3.4, -2.6, 3.6, 0.7, 0.35, INK);
    ctx.restore();
  }
}

