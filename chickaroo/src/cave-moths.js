'use strict';
// Lantern-moth grotto: living ferries that wake under a passenger's weight.
// Their backs are ordinary one-way platforms: jumping, rolling and powers remain available.
const LANTERN_MOTH_ART = new Map();

class LanternMoth {
  constructor(col, row, toCol, toRow, arch = 2, speed = 1.9) {
    this.from = [col * TILE, row * TILE]; this.to = [toCol * TILE, toRow * TILE];
    this.arch = arch * TILE; this.speed = speed; this.w = 56; this.h = 8;
    this.length = Math.hypot(this.to[0] - this.from[0], this.to[1] - this.from[1]) + Math.abs(this.arch) * 0.8;
    this.u = 0; this.target = 1; this.mode = 'rest'; this.wake = 0; this.empty = 0; this.v = 0; this.t = 0;
    this.facing = 1; this.place(); this.prevY = this.y; this.dx = this.dy = 0;
  }
  point(u) {
    return [
      this.from[0] + (this.to[0] - this.from[0]) * u,
      this.from[1] + (this.to[1] - this.from[1]) * u - Math.sin(Math.PI * u) * this.arch
    ];
  }
  place() { const [x, y] = this.point(this.u); this.x = x - this.w / 2; this.y = y; }
  update(g) {
    const p = g.player, rider = p?.platform === this && p.state === 'play';
    const ox = this.x, oy = this.y;
    this.t++; this.empty = rider ? 0 : this.empty + 1;
    if (rider && this.mode === 'rest') {
      this.mode = 'wake'; this.wake = 16; this.target = this.u < 0.5 ? 1 : 0;
      if (this.x + this.w > g.camX && this.x < g.camX + VIEW_W) Sound.play('honk');
    }
    if (this.mode === 'wake' && --this.wake <= 0) this.mode = 'fly';
    if (rider && this.mode === 'return') this.mode = 'fly';
    if (!rider && this.empty > 90) {
      // An abandoned ferry comes to the nearest bank; a missed jump cannot strand it.
      const px = p ? p.x + p.w / 2 : this.from[0];
      const dock = Math.abs(px - this.from[0]) < Math.abs(px - this.to[0]) ? 0 : 1;
      if (Math.abs(this.u - dock) > 0.001) { this.target = dock; this.mode = 'return'; }
    }
    if (this.mode === 'fly' || this.mode === 'return') {
      const distance = Math.abs(this.target - this.u) * this.length;
      const cruise = this.speed * (this.mode === 'return' ? 1.2 : 1);
      this.v += (Math.min(cruise, 0.35 + distance * 0.045) - this.v) * 0.07;
      const direction = Math.sign(this.target - this.u);
      this.facing = direction || this.facing;
      this.u += direction * Math.min(Math.abs(this.target - this.u), this.v / this.length);
      if (Math.abs(this.u - this.target) < 0.0001) {
        this.u = this.target; this.mode = 'dock'; this.v = 0;
      }
    }
    // Stay at the bank until he steps off; the next boarding can take him back.
    if (this.mode === 'dock' && !rider) this.mode = 'rest';
    this.place(); this.prevY = oy; this.dx = this.x - ox; this.dy = this.y - oy;
    // Bioluminescent stardust shedding from trailing wingtips in flight
    if ((this.mode === 'fly' || this.mode === 'return') && this.t % 8 === 0 &&
        this.x > g.camX - 64 && this.x < g.camX + VIEW_W + 64) {
      g.particles.push({
        kind: 'spark',
        x: this.x + this.w / 2 - this.facing * 24 + rand(-3, 3),
        y: this.y + 14 + rand(-2, 4),
        vx: -this.facing * rand(0.2, 0.6),
        vy: rand(0.1, 0.4),
        g: 0.02,
        drag: 0.96,
        life: 36,
        t: 0,
        color: this.t % 2 ? '#caffde' : '#fff5b0'
      });
    }
  }
  draw(ctx, theme, g) {
    if (this.x + 64 < g.camX || this.x - 12 > g.camX + VIEW_W) return;
    const flying = this.mode === 'fly' || this.mode === 'return';
    const frame = flying ? Math.floor(this.t / 3) % 12 : (this.mode === 'wake' ? 13 : 12);
    const cx = this.x + this.w / 2;
    // Ambient bioluminescent lantern glow under the abdomen
    const lanternPulse = 0.2 + Math.sin(this.t * 0.06) * 0.05;
    fGlow(ctx, cx - this.facing * 10, this.y + 13, 44, '#76ffc8', lanternPulse);
    fGlow(ctx, cx, this.y + 8, 28, '#b8ffe8', 0.15);

    ctx.save();
    ctx.translate(fSnap(cx), fSnap(this.y));
    ctx.scale(this.facing, 1);
    ctx.drawImage(lanternMothArt(frame, this.mode === 'rest'), -56, -34);
    ctx.restore();

    if (this.mode === 'rest' && this.t % 150 < 90) {
      const u = (this.t % 150) / 90;
      ctx.save(); ctx.globalAlpha = (1 - u) * 0.65;
      drawZ(ctx, cx + 18 + u * 8, this.y - 10 - u * 10, '#d8efd7', 4);
      ctx.restore();
    }
  }
}

// ── Realistic, elegant Luna / Giant Silk Moth artwork ────────────────────────
function lanternMothArt(frame, asleep) {
  const key = frame + ':' + asleep;
  if (LANTERN_MOTH_ART.has(key)) return LANTERN_MOTH_ART.get(key);
  const W = 112, H = 76;
  const img = makeHiCanvas(W, H), c = img.getContext('2d');
  c.translate(56, 34); // (0, 0) is the top center of the furry saddle!

  const isFlying = frame < 12;
  const isWake = frame === 13;
  const phi = isFlying ? (frame / 12) * Math.PI * 2 : 0;
  // Wing beat cycle: downstroke sweeps broad and deep, upstroke feathers back smoothly
  const wingBeat = isFlying ? Math.sin(phi) : (isWake ? -0.15 : 0.22);
  const camber = isFlying ? Math.cos(phi) * 0.12 : 0;

  // 1. FAR WINGS (drawn behind the body with soft ambient shadow)
  drawLunaWings(c, wingBeat * 0.88, camber, true, asleep);

  // 2. ABDOMEN & BIOLUMINESCENT LANTERN
  c.save();
  const abGrad = c.createLinearGradient(-26, 4, -4, 18);
  abGrad.addColorStop(0, '#fbf8df');
  abGrad.addColorStop(0.35, '#d0dec2');
  abGrad.addColorStop(0.7, '#6a9c8a');
  abGrad.addColorStop(1, '#2c584a');
  c.fillStyle = abGrad;
  c.beginPath();
  c.ellipse(-14, 11, 16, 6.8, 0.1, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#1d3e34'; c.lineWidth = 0.8;
  c.stroke();

  // Segmented abdominal rings (delicate curved chitin plates)
  for (let i = 0; i < 4; i++) {
    const sx = -22 + i * 5.2;
    fArc(c, sx, 11, 2.2, 5.6, -1.2, 1.2, '#8cb8a4', 0.9);
    fArc(c, sx + 0.6, 11.2, 2.0, 5.2, -1.1, 1.1, '#fbf7dc', 0.6);
  }

  // The Bioluminescent Caudal Lantern (glowing jewel organ at the tail)
  const lx = -28, ly = 9.5;
  const lg = c.createRadialGradient(lx, ly, 0.5, lx, ly, 4.2);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(0.3, '#d4ffea');
  lg.addColorStop(0.7, '#5ef2b4');
  lg.addColorStop(1, '#1b8a5e');
  c.fillStyle = lg;
  c.beginPath();
  c.arc(lx, ly, 3.8, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#136040'; c.lineWidth = 0.7; c.stroke();
  fBlob(c, lx + 0.8, ly - 0.8, 1.2, '#ffffff');
  c.restore();

  // 3. THORAX & VELVETY SADDLE
  c.save();
  const thGrad = c.createRadialGradient(2, 6, 2, 2, 6, 16);
  thGrad.addColorStop(0, '#fffef2');
  thGrad.addColorStop(0.5, '#f4ecc4');
  thGrad.addColorStop(0.85, '#d6cca0');
  thGrad.addColorStop(1, '#728470');
  c.fillStyle = thGrad;
  c.beginPath();
  c.ellipse(3, 7, 16, 8.5, -0.05, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#283c34'; c.lineWidth = 0.85; c.stroke();

  // The Furry Saddle: level, plush crest across the top [-23, 18] at y = 0
  c.strokeStyle = '#fffdf0'; c.lineWidth = 2.8; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-23, 1.2);
  c.quadraticCurveTo(-2, -0.4, 18, 1.2);
  c.stroke();
  // Delicate downy hair tufts along the crest
  for (let i = 0; i < 13; i++) {
    const hx = -22 + i * 3.2;
    const hy = 1.2 + ((i % 3) - 1) * 0.4;
    fLine(c, hx, hy, hx - 0.6, hy - 2.2 - (i % 2) * 0.8, i % 2 ? '#fffef2' : '#ede2b2', 0.75);
  }
  c.restore();

  // 4. NEATLY TUCKED VELVET LEGS UNDER THORAX
  c.save();
  c.strokeStyle = '#223c34'; c.lineWidth = 1.0; c.lineCap = 'round';
  for (const [lx0, ly0, kx, ky] of [[-3, 13, 0, 16], [5, 13, 9, 16], [12, 12, 17, 15]]) {
    c.beginPath(); c.moveTo(lx0, ly0); c.lineTo(kx, ky); c.lineTo(kx - 1.5, ky + 2); c.stroke();
    fBlob(c, kx, ky, 0.9, '#e4dcaf');
  }
  c.restore();

  // 5. HEAD, COMPOUND EYE & PLUMOSE FEATHERY ANTENNAE
  c.save();
  // Fluffy head
  const hg = c.createRadialGradient(21, 6, 1, 21, 6, 8);
  hg.addColorStop(0, '#fffef4');
  hg.addColorStop(0.6, '#f3ecc6');
  hg.addColorStop(1, '#869882');
  c.fillStyle = hg;
  c.beginPath();
  c.arc(21, 6, 6.8, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#243b32'; c.lineWidth = 0.8; c.stroke();
  // Cheek down tufts
  fLine(c, 24, 9, 27, 11, '#e8e0b6', 0.8);
  fLine(c, 22, 10, 24, 13, '#e8e0b6', 0.8);

  // Large glossy compound eye
  const ex = 23.5, ey = 5.2;
  if (asleep) {
    // Peaceful sleeping eye: soft curved lid with velvety lashes
    fArc(c, ex, ey + 0.5, 2.6, 1.8, 0.1, Math.PI - 0.1, '#1e3430', 1.4);
    fArc(c, ex, ey - 0.2, 3.2, 1.2, 0.2, Math.PI - 0.2, '#869c84', 0.6);
  } else {
    // Alert, luminous compound eye
    fEll(c, ex, ey, 2.4, 3.2, '#14222a');
    fEll(c, ex, ey, 2.0, 2.8, '#1e3846');
    fBlob(c, ex + 0.8, ey - 1.0, 0.9, '#ffffff');
    fBlob(c, ex - 0.6, ey + 1.0, 0.5, '#c2f4ff');
  }

  // Magnificently detailed feathery plumose antennae
  drawPlumoseAntenna(c, 19, 1, 28, -13 + (asleep ? 3 : 0), -1, true);
  drawPlumoseAntenna(c, 21, 1.5, 33, -11 + (asleep ? 3 : 0), 1, false);
  c.restore();

  // 6. NEAR WINGS (in front of the body)
  drawLunaWings(c, wingBeat, camber, false, asleep);

  LANTERN_MOTH_ART.set(key, img);
  return img;
}

// Feathery fern-like plumose antenna
function drawPlumoseAntenna(c, x0, y0, x1, y1, side, isBack) {
  c.save();
  const stemCol = isBack ? '#92ac80' : '#eaf8cc';
  const combCol = isBack ? '#789468' : '#fcf5ce';
  const tipCol = isBack ? '#68885c' : '#c8ebb0';

  c.strokeStyle = stemCol; c.lineWidth = 0.85; c.lineCap = 'round';
  const cx = (x0 + x1) / 2 + 3 * side, cy = (y0 + y1) / 2 - 4;
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();

  // Lateral feathery cilia along the stem (9 pairs)
  c.strokeStyle = combCol; c.lineWidth = 0.5;
  for (let i = 1; i <= 9; i++) {
    const t = i / 10;
    const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    const ang = Math.atan2(ty, tx) + Math.PI / 2;
    const len = Math.sin(t * Math.PI) * 4.4;
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len); c.stroke();
    c.beginPath(); c.moveTo(px, py); c.lineTo(px - Math.cos(ang) * (len * 0.7), py - Math.sin(ang) * (len * 0.7)); c.stroke();
  }
  fBlob(c, x1, y1, 1.0, tipCol);
  c.restore();
}

// Royal Luna wings: falcate forewing with plum leading edge, trailing scalloped hindwing
function drawLunaWings(c, stroke, camber, isBack) {
  c.save();
  c.translate(-6, 5);
  if (isBack) {
    c.scale(0.92, 0.75);
    c.rotate(-0.1 - stroke * 0.28 + camber * 0.6);
  } else {
    c.rotate(0.05 + stroke * 0.35 + camber);
  }

  // A. HINDWING (trailing wing, drawn beneath forewing)
  c.save();
  c.translate(-2, 4);
  c.rotate(0.12 - stroke * 0.15);
  c.beginPath();
  c.moveTo(6, 0);
  c.bezierCurveTo(-4, 6, -16, 12, -22, 22);
  c.bezierCurveTo(-24, 30, -18, 36, -12, 34); // Scalloped tail curve
  c.bezierCurveTo(-4, 30, 2, 18, 8, 4);
  c.closePath();

  const hwGrad = c.createLinearGradient(-16, 6, 4, 32);
  hwGrad.addColorStop(0, isBack ? '#4a7d6e' : '#88e0c4');
  hwGrad.addColorStop(0.5, isBack ? '#326052' : '#52b89c');
  hwGrad.addColorStop(1, isBack ? '#1c4236' : '#2a7460');
  c.fillStyle = hwGrad;
  c.fill();
  c.strokeStyle = isBack ? '#143428' : '#1e4e40';
  c.lineWidth = 0.75;
  c.stroke();

  // Hindwing veins
  c.strokeStyle = isBack ? 'rgba(120, 190, 160, 0.3)' : 'rgba(210, 255, 235, 0.55)';
  c.lineWidth = 0.45;
  for (const [vx, vy] of [[-20, 24], [-14, 32], [-7, 30]]) {
    c.beginPath(); c.moveTo(4, 2); c.quadraticCurveTo(-6, 14, vx, vy); c.stroke();
  }

  // Hindwing secondary eyespot
  const hx = -13, hy = 18;
  fEll(c, hx, hy, 2.6, 2.0, isBack ? '#241420' : '#42162c');
  fEll(c, hx, hy, 1.8, 1.3, isBack ? '#1e483e' : '#2ad4b8');
  fBlob(c, hx - 0.3, hy - 0.3, 0.8, isBack ? '#928448' : '#ffd560');
  fBlob(c, hx - 0.5, hy - 0.5, 0.4, '#ffffff');

  // Trailing fringe scales
  c.strokeStyle = isBack ? '#84a896' : '#ddfbe8'; c.lineWidth = 0.5;
  for (let i = 0; i < 5; i++) {
    const fx = -19 + i * 2.8, fy = 25 + (i % 2) * 1.5;
    fLine(c, fx, fy, fx - 1, fy + 1.6, isBack ? '#709480' : '#c8f2d6', 0.45);
  }
  c.restore();

  // B. FOREWING (broad falcate leading wing)
  c.save();
  const tipX = -38 - stroke * 4, tipY = -27 - stroke * 7;
  c.beginPath();
  c.moveTo(11, -1);
  c.bezierCurveTo(2, -10, -18, -26, tipX, tipY); // leading edge costa
  c.bezierCurveTo(tipX - 6, tipY + 12, -34, 1, -22, 7); // outer scalloped margin
  c.bezierCurveTo(-14, 12, 0, 7, 10, 0); // inner margin back to root
  c.closePath();

  const fwGrad = c.createLinearGradient(-30, -24, 6, 8);
  fwGrad.addColorStop(0, isBack ? '#528678' : '#bdf6e4');
  fwGrad.addColorStop(0.3, isBack ? '#3e6f62' : '#88e4c8');
  fwGrad.addColorStop(0.7, isBack ? '#2c564a' : '#52bca0');
  fwGrad.addColorStop(1, isBack ? '#1c3e34' : '#2e7c66');
  c.fillStyle = fwGrad;
  c.fill();
  c.strokeStyle = isBack ? '#16382c' : '#1a4c3c';
  c.lineWidth = 0.8;
  c.stroke();

  // Costal Margin: The iconic dark plum-wine leading edge band
  c.save();
  c.beginPath();
  c.moveTo(11, -1);
  c.bezierCurveTo(2, -10, -18, -26, tipX, tipY);
  c.lineTo(tipX + 1.5, tipY + 3.2);
  c.bezierCurveTo(-17, -23, 3, -7.5, 10.5, 1.2);
  c.closePath();
  const costaGrad = c.createLinearGradient(11, -1, tipX, tipY);
  costaGrad.addColorStop(0, isBack ? '#341424' : '#4e1a34');
  costaGrad.addColorStop(0.5, isBack ? '#4c1e34' : '#7a284e');
  costaGrad.addColorStop(1, isBack ? '#280e1c' : '#3c1428');
  c.fillStyle = costaGrad;
  c.fill();
  c.restore();

  // Wing Venation
  c.strokeStyle = isBack ? 'rgba(130, 200, 170, 0.35)' : 'rgba(232, 255, 246, 0.65)';
  c.lineWidth = 0.55;
  for (const [vx, vy, cx0, cy0] of [
    [-34, -18, -16, -18],
    [-32, -8, -14, -10],
    [-28, 0, -10, -2],
    [-23, 6, -6, 4]
  ]) {
    c.beginPath(); c.moveTo(8, -1); c.quadraticCurveTo(cx0, cy0, vx, vy); c.stroke();
  }

  // The Signature Lunar Eyespot (Discal Ocellus)
  const ex = -21, ey = -12;
  fEll(c, ex, ey, 3.8, 2.8, isBack ? '#2a1020' : '#4c1832');
  fEll(c, ex, ey, 2.8, 2.0, isBack ? '#22564c' : '#22d8b8');
  fEll(c, ex + 0.3, ey, 1.8, 1.3, isBack ? '#9e843c' : '#fec840');
  fEll(c, ex + 0.4, ey, 1.0, 0.8, isBack ? '#48685c' : '#72e8cc');
  fBlob(c, ex - 0.4, ey - 0.5, 0.6, '#ffffff');

  // Outer margin silken fringe scales
  c.strokeStyle = isBack ? '#84a896' : '#e6fdee'; c.lineWidth = 0.5;
  for (let i = 0; i < 7; i++) {
    const fx = -35 + i * 2.2, fy = -10 + i * 2.6;
    fLine(c, fx, fy, fx - 1.2, fy + 0.8, isBack ? '#6c907e' : '#c2eed4', 0.45);
  }
  c.restore();

  c.restore();
}

// ── Lantern Grotto Background & Seamless Atmospheric Transition ─────────────
const LANTERN_GROTTO_W = 768;
function lanternGrottoArt() {
  return caveDecorArt('lantern-grotto-fine', () => {
    const W = LANTERN_GROTTO_W;
    const img = makeHiCanvas(W, VIEW_H), c = img.getContext('2d'), rng = mulberry32(7913);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // One continuous chamber. Every shape crossing an edge is also painted at
    // the opposite edge, including its light, so caps and roots never get cut off.
    const wrap = (x, paint) => { for (const off of [-W, 0, W]) paint(x + off); };
    const ellipse = (x, y, rx, ry, color) => {
      c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
    };
    const wash = c.createLinearGradient(0, 0, 0, 224);
    wash.addColorStop(0, 'rgba(4,28,34,.64)');
    wash.addColorStop(0.55, 'rgba(5,31,36,.35)');
    wash.addColorStop(1, 'rgba(5,40,38,.45)');
    c.fillStyle = wash;
    c.fillRect(0, 0, W, VIEW_H);

    // Receding limestone folds, cool reflected light and distant fungal colonies.
    for (let i = 0; i < 9; i++) {
      const x = i * W / 9 + rng() * 36, width = 16 + rng() * 24, base = 166 + rng() * 30;
      wrap(x, X => {
        fGlow(c, X + width, base - 36, 65, '#318b81', 0.07);
        const rock = c.createLinearGradient(X - width, 0, X + width, 0);
        rock.addColorStop(0, 'rgba(15,37,43,0)'); rock.addColorStop(0.5, '#183039'); rock.addColorStop(1, 'rgba(12,28,36,0)');
        c.fillStyle = rock; c.beginPath(); c.moveTo(X - width, 224);
        c.bezierCurveTo(X - width * 0.5, base, X - width * 0.7, 54, X, 26 + (i % 3) * 16);
        c.bezierCurveTo(X + width * 0.6, 74, X + width * 0.2, base, X + width, 224); c.fill();
        c.strokeStyle = 'rgba(98,151,143,.12)'; c.lineWidth = 0.45;
        c.beginPath(); c.moveTo(X - 1, 60); c.bezierCurveTo(X - 8, 100, X + 5, 150, X - 8, 203); c.stroke();
        for (let j = 0; j < 4; j++) {
          const sx = X - 14 + j * 9, sy = base + (j % 2) * 7, h = 12 + (j % 3) * 5;
          c.strokeStyle = '#2c5558'; c.lineWidth = 0.8;
          c.beginPath(); c.moveTo(sx, sy + h); c.quadraticCurveTo(sx + 2, sy + 4, sx, sy); c.stroke();
          ellipse(sx, sy, 4 + j % 2, 1.7, '#376b69');
          ellipse(sx, sy + 0.7, 3.4, 0.45, '#60958a');
        }
      });
    }

    // Fine silk threads with small pearled lights, unevenly spaced and sized.
    for (let i = 0; i < 29; i++) {
      const x = i * W / 29 + rng() * 17, y = 24 + rng() * 73, bend = (rng() - 0.5) * 9;
      wrap(x, X => {
        const silk = c.createLinearGradient(0, 8, 0, y);
        silk.addColorStop(0, 'rgba(72,112,108,.12)'); silk.addColorStop(1, 'rgba(133,198,173,.5)');
        c.strokeStyle = silk; c.lineWidth = 0.35;
        c.beginPath(); c.moveTo(X, 8); c.quadraticCurveTo(X + bend, y * 0.6, X, y); c.stroke();
        fGlow(c, X, y, 6, '#9ceccd', 0.16);
        ellipse(X, y, 0.65, 1.3, '#b8efd0');
        ellipse(X - 0.15, y - 0.5, 0.25, 0.5, '#edfff1');
      });
    }

    // Sculpted bell caps: shaded domes, luminous rolled rims, radial gills and
    // tapered stems. Keep their light below the moths' flight paths.
    for (let i = 0; i < 17; i++) {
      const x = i * W / 17 + rng() * 24, y = 211 + rng() * 12;
      const h = 23 + rng() * 45, r = 8 + rng() * 13, lean = (rng() - 0.5) * 9;
      const spots = Array.from({length: 9}, () => [(rng() - 0.5) * 1.5, rng(), 0.3 + rng() * 0.5]);
      wrap(x, X => {
        const top = y - h, capX = X + lean;
        fGlow(c, capX, top + 3, r * 2, '#67cdb7', 0.12);
        const stem = c.createLinearGradient(X - 4, 0, X + 4, 0);
        stem.addColorStop(0, '#102f35'); stem.addColorStop(0.45, '#518079'); stem.addColorStop(0.7, '#2c5856'); stem.addColorStop(1, '#122f34');
        c.fillStyle = stem; c.beginPath(); c.moveTo(X - 4, y);
        c.bezierCurveTo(X + 1, y - h * 0.28, capX - 2.8, top + 13, capX - 2, top + 1);
        c.lineTo(capX + 2, top + 1);
        c.bezierCurveTo(capX + 1, top + 17, X + 4, y - h * 0.25, X + 4, y); c.fill();
        c.strokeStyle = 'rgba(160,213,185,.28)'; c.lineWidth = 0.45;
        c.beginPath(); c.moveTo(X, y - 2); c.quadraticCurveTo(X + 1, y - h * 0.4, capX, top + 5); c.stroke();
        for (const side of [-1, 1]) {
          c.strokeStyle = '#30524f'; c.lineWidth = 0.7;
          c.beginPath(); c.moveTo(X, y - 3); c.quadraticCurveTo(X + side * 5, y - 1, X + side * 10, y); c.stroke();
        }
        ellipse(capX, top + 1.2, r, r * 0.19, '#3b7269');
        for (let j = -8; j <= 8; j++) {
          const u = j / 9;
          c.strokeStyle = 'rgba(180,225,188,.45)'; c.lineWidth = 0.35;
          c.beginPath(); c.moveTo(capX, top + 1.2);
          c.quadraticCurveTo(capX + u * r * 0.5, top + r * 0.22, capX + u * r, top + 1 + Math.sqrt(1 - u * u) * r * 0.15); c.stroke();
        }
        const cap = c.createLinearGradient(0, top - r * 0.53, 0, top + 1);
        cap.addColorStop(0, '#659c88'); cap.addColorStop(0.35, '#447f74'); cap.addColorStop(0.85, '#285451'); cap.addColorStop(1, '#96caae');
        c.fillStyle = cap; c.beginPath(); c.moveTo(capX - r, top);
        c.bezierCurveTo(capX - r * 0.72, top - r * 0.22, capX - r * 0.48, top - r * 0.66, capX, top - r * 0.55);
        c.bezierCurveTo(capX + r * 0.5, top - r * 0.58, capX + r * 0.77, top - r * 0.18, capX + r, top);
        c.quadraticCurveTo(capX, top + r * 0.13, capX - r, top); c.fill();
        c.strokeStyle = '#9fc9aa'; c.lineWidth = 0.55;
        c.beginPath(); c.moveTo(capX - r, top); c.quadraticCurveTo(capX, top + r * 0.13, capX + r, top); c.stroke();
        for (const [dx, dy, size] of spots) {
          const sy = top - r * 0.48 * Math.sqrt(1 - dx * dx) * dy;
          ellipse(capX + dx * r, sy, size, size * 0.5, 'rgba(193,224,184,.55)');
        }
      });
    }
    return img;
  });
}

// Reusable screen-sized buffer for soft feathered grotto rendering
let grottoBuffer = null, grottoBufCtx = null;
function getGrottoBuffer() {
  const scale = ART_R * SCREEN_K;
  if (!grottoBuffer || grottoBuffer.r !== scale) {
    grottoBuffer = makeHiCanvas(VIEW_W, VIEW_H, scale);
    grottoBufCtx = grottoBuffer.getContext('2d');
  }
  return [grottoBuffer, grottoBufCtx];
}

// Organic cavern portal stalactite curtain at the transition threshold
function drawGrottoCavernArch(ctx, archX, cam, t, isExit) {
  const dir = isExit ? -1 : 1;
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const x = archX + (i - 3.5) * 12 + dir * (i * 3.5);
    const len = 18 + Math.sin(i * 1.7 + (isExit ? 3 : 1)) * 12 + (3.5 - Math.abs(i - 3.5)) * 5;
    fPoly(ctx, [[x - 5, 0], [x + 5, 0], [x + 0.5, len], [x - 0.5, len]], '#12101e');
    fPoly(ctx, [[x - 5, 0], [x - 1, 0], [x - 0.5, len * 0.9]], '#221e36');
    // Bioluminescent moss highlight on the grotto-facing side of the stalactite
    if ((!isExit && i >= 2) || (isExit && i <= 5)) {
      fLine(ctx, x + dir * 1.2, len * 0.35, x + dir * 0.4, len * 0.92, '#529678', 1.0);
      fBlob(ctx, x + dir * 0.4, len + 1, 1.0, '#b8f8dc');
      if ((t + i * 17) % 90 < 8) {
        fGlow(ctx, x + dir * 0.4, len + 1, 4, '#a2f4cc', 0.4);
      }
    }
  }
  ctx.restore();
}

// Draw the Lantern Grotto with seamless, soft feathered blending into the cave
function drawLanternGrotto(ctx, start, end, cam, t) {
  const x0 = start * TILE;       // column 215 = 3440px
  const x1 = (end + 1) * TILE;   // column 375 = 6000px
  if (cam + VIEW_W < x0 - 96 || cam > x1 + 96) return;

  const width = LANTERN_GROTTO_W;
  const left = Math.max(x0 - 96, cam);
  const right = Math.min(x1 + 96, cam + VIEW_W);
  const s0 = x0 - cam, s1 = x1 - cam;
  const fullyInside = (cam >= x0 + 64 && cam + VIEW_W <= x1 - 64);

  if (fullyInside) {
    // Fast path: fully inside the grotto, alpha is 1 everywhere, draw directly to ctx!
    for (let x = Math.floor(left / width) * width; x < right; x += width) {
      ctx.drawImage(lanternGrottoArt(), x, 0);
    }
  } else {
    const [buf, bc] = getGrottoBuffer();
    bc.clearRect(0, 0, VIEW_W, VIEW_H);

    // 1. Draw the grotto background tiles onto buffer translated by -cam
    bc.save();
    bc.translate(-cam, 0);
    for (let x = Math.floor(left / width) * width; x < right; x += width) {
      bc.drawImage(lanternGrottoArt(), x, 0);
    }
    bc.restore();

    // 2. Feather the edges smoothly so there is NO straight line!
    bc.globalCompositeOperation = 'destination-in';
    const gr = bc.createLinearGradient(0, 0, VIEW_W, 0);

    const alphaAt = wx => {
      const aIn = clamp((wx - (x0 - 48)) / 112, 0, 1);
      const aOut = clamp(((x1 + 48) - wx) / 112, 0, 1);
      const sIn = aIn * aIn * (3 - 2 * aIn);
      const sOut = aOut * aOut * (3 - 2 * aOut);
      return sIn * sOut;
    };

    for (let sx = 0; sx <= VIEW_W; sx += 8) {
      const a = alphaAt(cam + sx);
      gr.addColorStop(sx / VIEW_W, 'rgba(0,0,0,' + a.toFixed(3) + ')');
    }
    bc.fillStyle = gr;
    bc.fillRect(0, 0, VIEW_W, VIEW_H);
    bc.globalCompositeOperation = 'source-over';

    // 3. Draw the smoothly feathered grotto layer onto the game screen
    ctx.drawImage(buf, cam, 0);
  }

  // 4. Natural cavern gateway stalactite arches framing the entrance and exit
  if (s0 > -80 && s0 < VIEW_W + 80) drawGrottoCavernArch(ctx, x0, cam, t, false);
  if (s1 > -80 && s1 < VIEW_W + 80) drawGrottoCavernArch(ctx, x1, cam, t, true);

  // 5. Floating bioluminescent spores drifting through the chamber
  const alphaAt = wx => {
    const aIn = clamp((wx - (x0 - 48)) / 112, 0, 1);
    const aOut = clamp(((x1 + 48) - wx) / 112, 0, 1);
    return aIn * aIn * (3 - 2 * aIn) * aOut * aOut * (3 - 2 * aOut);
  };
  for (let i = 0; i < 14; i++) {
    const wx = x0 - 32 + ((i * 73 + t * 0.16) % (x1 - x0 + 64));
    const sx = wx - cam;
    if (sx < -20 || sx > VIEW_W + 20) continue;
    const y = 50 + (i * 31) % 130 + Math.sin(t * 0.03 + i) * 10;
    const a = (0.28 + 0.22 * Math.sin(t * 0.04 + i)) * alphaAt(wx);
    if (a > 0.02) {
      ctx.save(); ctx.globalAlpha = a;
      fGlow(ctx, wx, y, 6, '#9ceccd', 0.28);
      fBlob(ctx, wx, y, 0.85, '#ffffff');
      fBlob(ctx, wx, y, 1.4, '#b8efd0');
      ctx.restore();
    }
  }
}
