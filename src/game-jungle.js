'use strict';
// Part of class Game (see game.js): GameJungle
class GameJungle {
  // ---------- Monsoon Jungle: vines, gulp pods, the monsoon and its rivers ----------
  grabVine(p, v, r) {
    this.endRoll(p); this.standUp(p);
    p.spin = false; p.blast = 0; p.pounding = false; p.gliding = false; p.springAir = false; p.charge = 0;
    p.flaps = 0; p.flapT = 0;   // catching a vine restores the mid-air jump for the next leap
    p.vine = v; p.vineR = r;p.vineSlide=r<v.len-.1;p.vineSlideV=0;
    // carry the jump's momentum into the swing (only the part along the swing's path counts)
    const tangent = p.vx * Math.cos(v.a) - p.vy * Math.sin(v.a);
    const limit = Math.min(0.055, VINE_SPEED / v.len);
    v.w = clamp(Math.abs(tangent) > 0.2 ? tangent / r : v.w, -limit, limit);
    p.vx = 0; p.vy = 0; p.jumping = false; p.combo = 0; p.platform = null; p.onGround = false;
    p.sx = 0.85; p.sy = 1.15;
    Sound.play('vine');
    this.placeOnVine(p);
  }
  placeOnVine(p) {
    const [bx, by] = p.vine.at(p.vineR);
    p.x = bx - p.w / 2; p.y = by - 3;
  }
  // `cool`: frames before this vine can be grabbed again; `other`: before any vine can
  letGoVine(p, cool, other = cool) {
    if (p.vine) p.vine.cool = cool;
    p.vine = null; p.vineCool = other;
  }
  // Hanging on: gravity swings the rope; pushing the way it's already swinging pumps it higher.
  swingVine(p) {
    const v = p.vine, dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    const climb = (Input.down('down') ? 1 : 0) - (Input.down('up') ? 1 : 0);
    const oa = v.a, or = p.vineR;
    // A caught rider slides to the hanging tip, easing into a bounded downward speed.
    if(p.vineSlide){
      p.vineSlideV=Math.min(2.6,(p.vineSlideV||0)+.24);
      p.vineR=Math.min(v.len,or+p.vineSlideV);
      v.w*=or/p.vineR;
      if(p.vineR>=v.len){p.vineSlide=false;p.vineSlideV=0;}
    }else if(climb){
      const speed=(climb>0?1.6:1.1)*(Input.down('run')?2:1);
      p.vineR=clamp(or+climb*speed,VINE_MIN_R,v.len);
      v.w*=Math.sqrt(or/p.vineR);
    }
    const r = p.vineR;
    const inertia=Math.max(r,v.len*.85);
    v.w += -(VINE_G / inertia) * Math.sin(v.a);
    if (dir) v.w += dir * (v.w * dir >= 0 ? VINE_PUMP : VINE_BRAKE) / inertia * Math.max(0.35, Math.cos(v.a));
    const limit = Math.min(0.055, VINE_SPEED / v.len);
    v.w = clamp(v.w * 0.998, -limit, limit);
    v.a += v.w;
    if (Math.abs(v.a) > VINE_MAX) { v.a = Math.sign(v.a) * VINE_MAX; v.w = -Math.sign(v.a) * Math.abs(v.w) * 0.2; }
    this.placeOnVine(p);
    if (this.overlapsSolid(p)) {                                        // swung into a wall: bounce back off it
      v.a=oa;p.vineR=or;v.w=0;p.vineSlide=false;p.vineSlideV=0;
      this.placeOnVine(p);
    }
    p.vx = v.w * r * Math.cos(v.a); p.vy = -v.w * r * Math.sin(v.a);
    if (dir) p.facing = dir; else if (Math.abs(p.vx) > 0.4) p.facing = Math.sign(p.vx);
    p.anim += 0.1;
    if (Input.hit('jump') || Input.hit('spin')) {
      this.letGoVine(p, 18, 0);   // another vine is grabbable immediately on contact; this vine cools briefly so the jump leaves cleanly
      p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
      if (Input.down('down')) { p.vy = Math.max(p.vy, 0.5); return; }       // down + jump: just drop off
      // Donkey Kong Country style: a full, dependable jump the way you're holding, boosted by the
      // swing when it's going that way (a swing the other way never yanks you backwards)
      const sx = p.vx, sy = p.vy;
      if (dir) p.vx = dir * clamp(Math.max(VINE_LEAP, dir * sx + 0.8), VINE_LEAP, VINE_RELEASE);
      else p.vx = clamp(sx, -VINE_RELEASE, VINE_RELEASE);
      p.vy = clamp(-(JUMP_BASE + 0.4) + Math.min(0, sy) * 0.6, -7.2, -JUMP_BASE);
      if (dir) p.facing = dir;
      p.jumping = true; p.holdGrace = 6;
      p.airMax = Math.max(WALK_MAX, Math.abs(p.vx));
      p.spin = Input.hit('spin');
      p.sx = 0.78; p.sy = 1.24;
      Sound.play(p.spin ? 'spin' : p.power ? 'jumpBig' : 'jump');
    }
  }
  enterPod(p, pod) {
    this.endRoll(p); this.dropHeld();
    if (p.crouch) { const full = p.power ? BIG_H : SMALL_H; p.y += p.h - full; p.h = full; p.crouch = false; }
    if (p.vine) this.letGoVine(p, 20);
    p.inPod = pod; p.blast = 0; p.spin = false; p.pounding = false; p.gliding = false; p.charge = 0;
    p.vx = 0; p.vy = 0; p.platform = null; p.onGround = false; p.combo = 0;
    Sound.play('gulp');
    this.burst(pod.px, pod.py, ['#6fcf5a', '#ff7ab0', '#ffffff'], 6);
  }
  firePod(p, pod) {
    const c = Math.cos(pod.a), s = Math.sin(pod.a);
    p.inPod = null; pod.cool = 26; pod.puff = 14;
    p.x = pod.px + c * 14 - p.w / 2; p.y = pod.py + s * 14 - p.h / 2;
    p.vx = c * POD_SPEED; p.vy = s * POD_SPEED; p.blast = POD_BLAST;
    p.airMax = Math.max(WALK_MAX, Math.abs(p.vx)); p.jumping = false; p.springAir = false;
    p.onGround = false; p.platform = null; p.coyote = 0; p.jumpBuf = 0; p.rollSpin = 0; p.podFlight = true;
    Sound.play('podfire');
    this.shake = Math.max(this.shake, 1.5);
    for (let i = 0; i < 8; i++) this.particles.push({ kind: 'px', x: pod.px + c * 14, y: pod.py + s * 14, vx: c * rand(1, 3) + rand(-1, 1), vy: s * rand(1, 3) + rand(-1, 1), drag: 0.9, life: 22, t: 0, color: i % 2 ? '#6fcf5a' : '#ffffff', size: 2 });
  }
  // The river under world x (its current surface y), or null where there's no river.
  waterAt(x) {
    for (const rv of this.rivers) if (x >= rv.a && x < rv.b) return rv.y;
    return null;
  }
  splash(x, y, n) {
    for (let i = 0; i < n; i++) this.particles.push({ kind: 'px', x: x + rand(-5, 5), y: y - 1, vx: rand(-1.4, 1.4), vy: rand(-3.2, -1), g: 0.2, life: 26 + rand(0, 10), t: 0, color: i % 3 ? '#bff4ff' : '#ffffff', size: i % 2 ? 2 : 1 });
  }
  bubble(x, y) {
    this.particles.push({ kind: 'px', x, y, vx: rand(-0.15, 0.15), vy: -0.5, life: 16, t: 0, color: '#d8fbff', size: 2 });
  }
  // Monsoon cycle: dry spell, storm clouds gathering, the downpour (rivers rise), the flood, and the
  // water draining away again. Each river has its own dry and flood levels (def.rivers).
  updateMonsoon() {
    const m = this.monsoon, d = this.level.def.monsoon;
    const cyc = d.dry + d.warn + d.rise + d.flood + d.fall;
    if (!m.started) {
      // the skies hold until Chickaroo reaches the rain country; the first storm follows `delay` frames later
      if (d.start != null && this.player.x < d.start * TILE) return;
      m.started = true;
      if (d.start != null) m.t = d.dry - (d.delay || 0);
    }
    m.t++;
    const k = m.t < 0 ? 0 : m.t % cyc, ease = u => u * u * (3 - 2 * u);
    let flood = 0, cloud = 0, rain = 0, phase = 'dry';
    if (k < d.dry) { const u = k / d.dry; cloud = m.t < 0 ? 0 : Math.max(0, 0.35 - u * 1.4); }
    else if (k < d.dry + d.warn) { const u = (k - d.dry) / d.warn; phase = 'warn'; cloud = ease(u); rain = u > 0.7 ? (u - 0.7) * 1.2 : 0; }
    else if (k < d.dry + d.warn + d.rise) { const u = (k - d.dry - d.warn) / d.rise; phase = 'rise'; flood = ease(u); cloud = 1; rain = 1; }
    else if (k < d.dry + d.warn + d.rise + d.flood) { const u = (k - d.dry - d.warn - d.rise) / d.flood; phase = 'flood'; flood = 1; cloud = 1 - Math.max(0, u - 0.5) * 0.9; rain = u < 0.55 ? 1 : Math.max(0.15, 1 - (u - 0.55) * 2); }
    else { const u = (k - d.dry - d.warn - d.rise - d.flood) / d.fall; phase = 'fall'; flood = 1 - ease(u); cloud = 0.55 * (1 - u) + 0.35 * u; rain = 0.15 * (1 - u); }
    if (phase !== m.phase) {
      if (phase === 'warn') {
        Sound.play('rumble');
        if (!m.told) { m.told = true; this.say('A STORM IS COMING!', 'THE RIVERS ARE ABOUT TO RISE', '#9fe3ff'); }
      }
      if (phase === 'rise') { Sound.play('thunder'); m.bolt = 14; m.boltX = rand(60, VIEW_W - 60); }
    }
    if ((phase === 'rise' || phase === 'flood') && m.bolt <= 0 && Math.random() < 0.003) { Sound.play('thunder'); m.bolt = 12; m.boltX = rand(40, VIEW_W - 40); }
    if (m.bolt > 0) m.bolt--;
    m.phase = phase; m.flood = flood; m.cloud = cloud; m.rain = rain;
    for (const rv of this.rivers) rv.y = rv.lo + (rv.hi - rv.lo) * flood;
    // the hiss of the rain
    if (rain > 0.05 && this.t % 5 === 0 && Sound.ctx) Sound.noise(Sound.ctx.currentTime + 0.005, 0.16, { filter: 'bandpass', freq: 5200, vol: 0.035 * rain });
    if (rain > 0.3 && this.t % 3 === 0) {   // raindrops dimpling the rivers
      for (const rv of this.rivers) {
        if (rv.b < this.camX || rv.a > this.camX + VIEW_W) continue;
        const x = rand(Math.max(rv.a, this.camX), Math.min(rv.b, this.camX + VIEW_W));
        if (this.waterOpen(x, rv.y)) this.particles.push({ kind: 'px', x, y: rv.y - 1, vx: 0, vy: -0.4, g: 0.08, life: 10, t: 0, color: '#e6fbff', size: 1 });
      }
    }
  }
  // Is the river surface at (x, y) open water (not inside the ground)?
  waterOpen(x, y) { return !this.level.solid(Math.floor(x / TILE), Math.floor((y + 1) / TILE)); }
  // Anything that falls in (or is caught by the rising water) is swept away.
  drownCheck() {
    for (const e of this.entities) {
      if (e.dead || e.passive || e.swims || e === this.held) continue;
      const wy = this.waterAt(e.cx);
      if (wy == null || e.y + e.h <= wy + 6) continue;
      e.dead = true; e.remove = true;
      this.splash(e.cx, wy, 8);
      if (e.x > this.camX - 16 && e.x < this.camX + VIEW_W) Sound.play('splash');
    }
    for (const it of this.items) {
      if (it.emerging) continue;
      const wy = this.waterAt(it.x + it.w / 2);
      if (wy != null && it.y + it.h > wy + 6) { it.remove = true; this.splash(it.x + it.w / 2, wy, 5); }
    }
  }
  // Rivers: translucent water filling each column from the surface down to the riverbed, drawn
  // over everything in it so whatever's below the surface looks submerged. Every open span below the
  // surface fills, so a flood creeps into tunnels under overhangs as well.
  // Under the tiles: the same water, a few px wider, so it fills the bites in the ragged terrain edges
  // beside a river (the tiles drawn over it hide the rest).
  drawRiversBehind(ctx, cam) {
    const lv = this.level;
    for (const rv of this.rivers) {
      const a = Math.max(rv.a, cam - 16), b = Math.min(rv.b, cam + VIEW_W + 16);
      if (a >= b) continue;
      const [wc, wd] = this.waterCols(rv), y0 = Math.round(rv.y) + 1;
      for (let c = Math.floor(a / TILE); c * TILE < b; c++) {
        let grL = null, grR = null;
        for (let r = Math.max(0, Math.floor(y0 / TILE)); r < ROWS; r++) {
          if (lv.solid(c, r)) continue;
          const top = Math.max(y0, r * TILE), bot = (r + 1) * TILE, deep = Math.max(top, y0 + 9);
          for (const sd of [-1, 1]) {
            if (!lv.solid(c + sd, r)) continue;
            const x = sd < 0 ? c * TILE - 5 : (c + 1) * TILE;
            let gr = sd < 0 ? grL : grR;
            if (!gr) {
              gr = ctx.createLinearGradient(sd < 0 ? x : x + 5, 0, sd < 0 ? x + 5 : x, 0);   // (a soft edge where the water laps the bank)
              gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, wc);
              if (sd < 0) grL = gr; else grR = gr;
            }
            ctx.globalAlpha = 0.5; ctx.fillStyle = gr; ctx.fillRect(x, top, 5, bot - top);
            ctx.globalAlpha = 0.35; ctx.fillStyle = wd; if (bot > deep) ctx.fillRect(x, deep, 5, bot - deep);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  // river water: jungle teal, or murky swamp green in the bayou (body, depths, surface, glints)
  waterCols(rv) {
    if (rv && rv.sea) return ['#1f78c0', '#124e8a', '#ffffff', '#e8f8ff'];
    return this.level.themeName === 'bayou' ? ['#2e5a4a', '#16302a', '#9ac8a0', '#ffd0a0'] : ['#2a8a8f', '#1a5a6a', '#bff4ff', '#ffffff'];
  }
  drawRivers(ctx, cam) {
    const lv = this.level, t = this.t, swamp = lv.themeName === 'bayou';
    for (const rv of this.rivers) {
      const a = Math.max(rv.a, cam - 16), b = Math.min(rv.b, cam + VIEW_W + 16);
      if (a >= b) continue;
      const [wc, wd, ws, wg] = this.waterCols(rv);
      const y0 = Math.round(rv.y);
      if (!rv._gr || rv._grY0 !== y0 || rv._grWc !== wc) {
        rv._gr = ctx.createLinearGradient(0, y0, 0, y0 + 40);
        rv._gr.addColorStop(0, wc); rv._gr.addColorStop(0.25, wc); rv._gr.addColorStop(1, wd);
        rv._grY0 = y0; rv._grWc = wc;
      }
      const gr = rv._gr;
      for (let c = Math.floor(a / TILE); c * TILE < b; c++) {
        const x = c * TILE;
        for (let r = Math.max(0, Math.floor(y0 / TILE)); r < ROWS;) {
          if (lv.solid(c, r)) { r++; continue; }
          let r2 = r;
          while (r2 < ROWS && !lv.solid(c, r2)) r2++;
          const top = Math.max(y0, r * TILE), bot = r2 < ROWS ? r2 * TILE : VIEW_H + 8;
          r = r2;
          if (bot <= top) continue;
          const thick = swamp;   // (you can't see far into swamp water) -- (in fine pixels: hires.js)
          ctx.globalAlpha = thick ? 0.82 : 0.6; ctx.fillStyle = gr; ctx.fillRect(x, top, TILE, bot - top);
          if (top === y0) {   // the surface: a smooth swell catching the light, glints riding along it
            const wave = wx => y0 + Math.sin((wx + t * 0.6) / 9) * 1.1 + Math.sin((wx - t * 0.4) / 5) * 0.5;
            ctx.globalAlpha = 0.85; ctx.strokeStyle = ws; ctx.lineWidth = 0.8; ctx.beginPath();
            for (let wx = x; wx <= x + TILE; wx += 1 / ART_R) ctx.lineTo(wx, wave(wx) + 0.4);
            ctx.stroke();
            for (let i = 0; i < TILE; i++) {
              const wx = x + i;
              if ((wx + (t >> 3)) % 13 < 3) fRoundRect(ctx, wx, wave(wx), 1.2, 2 / 3, 0.3, wg);
              if ((wx * 7 + (t >> 2)) % 23 === 0) { ctx.globalAlpha = 0.5; fRoundRect(ctx, wx, wave(wx) + 3, 3, 2 / 3, 0.3, swamp ? '#7aa890' : '#8fe0e8'); ctx.globalAlpha = 0.85; }
            }
          }
          ctx.globalAlpha = 1;
        }
      }
    }
  }
  // Waterfalls (def.falls: [col, row, side]): a spring welling out of a crack in the cliff face one tile
  // below the lip of tile (col, row), on its `side` (-1 left, 1 right); it arcs out, then pours down to
  // the river or ground below. The monsoon swells them.
  drawFalls(ctx, cam) {
    const lv = this.level, t = this.t, swell = this.monsoon ? Math.round(this.monsoon.rain * 2 + this.monsoon.flood * 2) : 0;
    for (const [col, row, side = 1] of lv.def.falls) {
      const lip = side > 0 ? (col + 1) * TILE : col * TILE, oy = (row + 1) * TILE + 3;
      if (lip < cam - 40 || lip > cam + VIEW_W + 40) continue;
      const w = 9 + swell, x0 = side > 0 ? lip : lip - w;
      // where it lands: the river surface, or the first ground below the outlet
      const mc = Math.floor((x0 + w / 2) / TILE);
      let yb = VIEW_H;
      for (let r = row + 1; r < ROWS; r++) if (lv.solid(mc, r)) { yb = r * TILE; break; }
      const wy = this.waterAt(x0 + w / 2);
      if (wy != null && wy < yb) yb = wy;
      if (yb <= oy) continue;
      const sd=side>0?-1:1,X=d=>lip+sd*d;
      ctx.save();ctx.translate(lip,oy);ctx.scale(-side,1);ctx.drawImage(jungleSpringCrackArt(),-10,-20);ctx.restore();
      fPoly(ctx,[[X(4),oy-3],[X(1),oy-4],[lip+side*2,oy-2],[lip+side*2,oy+1],[X(3),oy+1]],'#94dce1');
      // the stream: leaves the wall level, curves over into the fall; streaks of light racing down it
      const S = 1 / ART_R, body = [], light = [], white = [], edges = [];
      for (let i = 0; i < w; i += S) {
        const d = side > 0 ? i : w - S - i, ys = oy + d * d * 0.07 - (d < 4 ? 3 * (1 - Math.max(0, d - 3)) : 0), edge = i < 0.7 || i > w - 1.1;
        if (edge) { edges.push([x0 + i, ys, S, yb - ys]); continue; }
        body.push([x0 + i, ys, S, yb - ys]);
        const col = Math.floor(i * 1.6), off = (t * 2.2 - col * 5 - (col * col) % 7) % 11;
        for (let y = ys - 11 + ((off % 11) + 11) % 11; y < yb; y += 11) {
          const y0 = Math.max(ys, y), y1 = Math.min(yb, y + 5);
          if (y1 > y0) light.push([x0 + i, y0, S, y1 - y0]);
          const w1 = Math.min(yb, y + 2);
          if (w1 > y0) white.push([x0 + i, y0, S, w1 - y0]);
        }
      }
      ctx.globalAlpha = 0.7; fRects(ctx, '#2f8f98', edges);
      ctx.globalAlpha = 0.82; fRects(ctx, '#7fd8e0', body); fRects(ctx, '#bff4ff', light); fRects(ctx, '#ffffff', white);
      // a bright wellspring at the crack, foam where it lands
      ctx.globalAlpha = 0.9;
      for (let k = 0; k < 4; k++) fEll(ctx, X(1 + k) + sd * -0.5, oy - 1 + Math.sin(t * 0.25 + k) * 1, 0.7, 1.2, '#e6fbff');
      for (let i = -3; i < w + 3; i += 1.5) {
        const fh = 2 + Math.abs(Math.sin((i + t * 0.3) * 0.9)) * 2;
        fEll(ctx, x0 + i + 0.5, yb - fh / 2 + 0.6, 1.3, fh / 2 + 0.4, Math.floor(i + (t >> 2)) % 3 ? '#ffffff' : '#d8f6ff');
      }
      ctx.globalAlpha = 1;
      if (t % 14 === 0) this.particles.push({ kind: 'px', x: x0 + rand(0, w), y: yb - 2, vx: rand(-0.5, 0.5), vy: rand(-1.4, -0.6), g: 0.06, life: 26, t: 0, color: '#e6fbff', size: 1 });
    }
  }
  // Storm overlay (screen space): a soft darkening under the clouds, and slanting rain.
  drawStorm(ctx) {
    const m = this.monsoon;
    if (m.cloud > 0.01) { ctx.globalAlpha = 0.16 * m.cloud; ctx.fillStyle = '#0d2236'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1; }
    const n = Math.round(46 * m.rain);
    if (!n) return;
    const t = this.t, cam = this.camX;
    ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';   // (fine streaks: hires.js)
    for (let i = 0; i < n; i++) {
      const sp = 5 + (i % 3), y = ((i * 53 + t * sp) % (VIEW_H + 20)) - 10;
      const x = ((((i * 131 + (i * i) % 97) - t * 1.2 - cam * 0.6 - y * 0.2) % (VIEW_W + 20)) + VIEW_W + 20) % (VIEW_W + 20) - 10;
      ctx.globalAlpha = (0.18 + (i % 4) * 0.06) * Math.min(1, m.rain * 1.5);
      ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x - 0.9, y + 6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // Leafy canopy along the top of the screen that the vines hang from.
  // the jungle roof: layered tropical foliage, hanging palm/fern fronds, and exotic blossoms along the top (fine: hires.js)
  drawCanopy(ctx, cam) {
    const S = 1 / ART_R, x0 = Math.floor(cam) - 2, x1 = cam + VIEW_W + 2;
    ctx.fillStyle = '#0e2c1c'; ctx.beginPath();
    for (let x = x0; x < x1; x += S) {
      const h = 12 + Math.sin(x * 0.045) * 3.5 + Math.sin(x * 0.12 + 1) * 2.2 + Math.sin(x * 0.8) * 0.45;
      ctx.rect(x, -LIFT_MAX, S, h + LIFT_MAX);
    }
    ctx.fill();
    ctx.fillStyle = '#1d522e'; ctx.beginPath();
    for (let x = x0; x < x1; x += S) {
      const h = 12 + Math.sin(x * 0.045) * 3.5 + Math.sin(x * 0.12 + 1) * 2.2 + Math.sin(x * 0.8) * 0.45;
      ctx.rect(x, h - 2.6, S, 2.6);
    }
    ctx.fill();
    ctx.fillStyle = '#2e7c3e'; ctx.beginPath();
    for (let x = x0; x < x1; x += S) {
      const h = 12 + Math.sin(x * 0.045) * 3.5 + Math.sin(x * 0.12 + 1) * 2.2 + Math.sin(x * 0.8) * 0.45;
      const k = ((x % 17) + 17) % 17;
      if (k < 6.5) {
        const d = Math.sin(k / 6.5 * Math.PI) * 5.8;
        ctx.rect(x, h - 0.8, S, d);
      }
    }
    ctx.fill();
    ctx.fillStyle = '#52b454'; ctx.beginPath();
    for (let x = x0; x < x1; x += S) {
      const h = 12 + Math.sin(x * 0.045) * 3.5 + Math.sin(x * 0.12 + 1) * 2.2 + Math.sin(x * 0.8) * 0.45;
      const k = (((x + 8) % 23) + 23) % 23;
      if (k < 5) {
        const d = Math.sin(k / 5 * Math.PI) * 3.8;
        ctx.rect(x, h - 1.2, S, d);
      }
    }
    ctx.fill();
    // Occasional tropical canopy flowers & hanging vine tendrils along the ceiling
    const firstCluster = Math.floor(x0 / 44) * 44;
    for (let cx = firstCluster; cx < x1 + 44; cx += 44) {
      const h = 12 + Math.sin(cx * 0.045) * 3.5 + Math.sin(cx * 0.12 + 1) * 2.2;
      const col = (Math.abs(cx / 44 | 0) % 2) ? '#ff5d8f' : '#ffb84d';
      fEll(ctx, cx - 1.2, h + 1.2, 1.5, 1.1, col);
      fEll(ctx, cx + 1.2, h + 1.2, 1.5, 1.1, col);
      fEll(ctx, cx, h + 2.4, 1.3, 1.2, col);
      fBlob(ctx, cx, h + 1.4, 0.8, '#ffe878');
    }
  }


}
mixin(Game, GameJungle);
