'use strict';
// THE LAST WINDING. A small clock tower you power with your own jumps: no timers, disappearing
// footholds or automatic ride. All six shoes on each wheel stay horizontal as the wheel ratchets.
const WIND_NOTCH = Math.PI / 3, WIND_FRAMES = 36;
class WindingWheel {
  constructor(col, y, dir, color) {
    this.cx = col * TILE + 8; this.cy = y; this.radius = 52; this.dir = dir; this.color = color;
    this.a = this.from = this.target = 0; this.turn = WIND_FRAMES; this.glow = 0;
    // A ghost controller runs before its shoes in the ordinary platform update, including time stop.
    this.x = this.cx; this.y = this.prevY = y; this.w = this.h = 0; this.dx = this.dy = 0; this.ghost = true;
    this.shoes = Array.from({ length: 6 }, (_, i) => new WindingShoe(this, i));
  }
  wind() {
    this.from = this.a; this.target += this.dir * WIND_NOTCH; this.turn = 0; this.glow = 36;
  }
  update() {
    if (this.turn < WIND_FRAMES) {
      const u = ++this.turn / WIND_FRAMES, ease = u * u * (3 - 2 * u);
      this.a = this.from + (this.target - this.from) * ease;
    }
    if (this.glow > 0) this.glow--;
  }
  draw() {}   // wheel and spokes belong behind the tiles; the shoes are drawn above them
  drawWheel(ctx) {
    const x = this.cx, y = this.cy, a = this.a, R = this.radius;
    fGlow(ctx, x, y, R + 9, this.color, 0.055 + this.glow * 0.002);
    drawCog(ctx, x, y, R + 5, 18, a, '#17152e', '#0c1021');
    drawCog(ctx, x, y, R + 2, 18, a, '#ac8046', '#584066');
    fBlob(ctx, x, y, R - 5, '#e7c385'); fBlob(ctx, x, y, R - 8, '#282640');
    fArc(ctx, x, y, R - 14, R - 13, 0, Math.PI * 2 - 0.001, '#8b6c57');
    for (let i = 0; i < 6; i++) {
      const t = a + i * WIND_NOTCH, sx = x + Math.cos(t) * R, sy = y + Math.sin(t) * R;
      fLine(ctx, x, y, sx, sy, '#0d1021', 9);
      fLine(ctx, x, y, sx, sy, '#95704e', 6);
      fLine(ctx, x - 0.5, y - 0.5, sx - 0.5, sy - 0.5, '#dfbd7c', 1.3);
      const rx = x + Math.cos(t + WIND_NOTCH / 2) * (R - 11), ry = y + Math.sin(t + WIND_NOTCH / 2) * (R - 11);
      fBlob(ctx, rx, ry, 1.5, this.color);
    }
    fBlob(ctx, x, y, 12, '#0d1021'); fBlob(ctx, x, y, 10, '#a77c47');
    fBlob(ctx, x - 0.6, y - 0.6, 7, '#eed29b'); fBlob(ctx, x, y, 4, '#2e2a49');
    fBlob(ctx, x, y, 2, this.color);
  }
}
class WindingShoe {
  constructor(wheel, i) {
    this.wheel = wheel; this.i = i; this.w = 34; this.h = 6; this.dx = this.dy = 0;
    this.place(); this.prevY = this.y;
  }
  place() {
    const w = this.wheel, a = w.a + this.i * WIND_NOTCH;
    this.x = w.cx + Math.cos(a) * w.radius - this.w / 2;
    this.y = w.cy + Math.sin(a) * w.radius;
  }
  update() {
    const x = this.x, y = this.y;
    this.place(); this.prevY = y; this.dx = this.x - x; this.dy = this.y - y;
  }
  draw(ctx) {
    const x = fSnap(this.x), y = fSnap(this.y), c = this.wheel.color;
    fRoundRect(ctx, x - 1, y - 1, this.w + 2, 8, 2, '#0c1021');
    fRoundRect(ctx, x, y, this.w, 6, 1.5, '#9b784c');
    fRect(ctx, x + 1, y, this.w - 2, 2, '#ffe2a0');
    fRect(ctx, x + 3, y + 3, this.w - 6, 1.3, c);
    for (const dx of [3, this.w - 4]) fBlob(ctx, x + dx, y + 4, 0.7, '#fff0c0');
  }
}
class ClockworkFinale extends Enemy {
  constructor(g, col, end) {
    super(col * TILE, 0, (end - col) * TILE, VIEW_H);
    this.end = end * TILE; this.exitX = (end - 2) * TILE; this.gateCol = end - 1;
    this.behindTiles = this.friendly = this.passive = this.noFreeze = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.rung = false; this.ringT = 0;
    this.wheels = [new WindingWheel(col + 5, 156, -1, '#9de6e4'), new WindingWheel(col + 18, 132, 1, '#f3c6a2'), new WindingWheel(col + 31, 148, -1, '#c4bbfa')];
    for (const w of this.wheels) g.platforms.push(w, ...w.shoes);
    // The portcullis closes above the visible grid, too (wing suits cannot fly around it).
    g.level.skyGates.set(this.gateCol, 0);
    // Dev warps onto the reward terrace should not leave a closed door behind the player.
    if (g.player && g.player.x >= this.end) this.open(g, true);
  }
  hitbox() { return null; }
  touches() { return false; }
  onClockJump(g) {
    const p = g.player;
    if (p.x + p.w < this.x || p.x >= this.exitX + TILE || this.rung) return;
    for (const w of this.wheels) w.wind();
  }
  open(g, instant = false) {
    if (this.rung) return;
    this.rung = true; this.ringT = instant ? 120 : 0;
    if (!instant) {
      Sound.play('chime');
      g.burst(this.exitX, 125, ['#ffe8ad', '#b7ece9', '#c6baff'], 20);
    }
    if (instant) this.finishBridge(g);
  }
  finishBridge(g) {
    for (let r = 0; r < ROWS; r++) if (g.level.get(this.gateCol, r) === T.BODY) g.level.set(this.gateCol, r, T.EMPTY);
    g.level.skyGates.delete(this.gateCol);
    for (let c = this.gateCol - 2; c <= this.gateCol; c++) g.level.set(c, 8, T.SEMI);
  }
  update(g) {
    this.t++;
    const p = g.player;
    // The broad landing pedal rings on an ordinary landing; no new button or compulsory pound.
    if (!this.rung && p.state === 'play' && p.onGround && p.x + p.w > this.exitX - TILE + 2 && p.x < this.exitX + TILE - 2 && Math.abs(p.y + p.h - 8 * TILE) < 2) this.open(g);
    if (!this.rung) return;
    this.ringT++;
    // Clear collision from the bottom up along with the rising ironwork.
    const gateBottom = VIEW_H - clamp(this.ringT / 48, 0, 1) * 280;
    for (let r = 0; r < ROWS; r++) if (r * TILE >= gateBottom && g.level.get(this.gateCol, r) === T.BODY) g.level.set(this.gateCol, r, T.EMPTY);
    // Each board becomes solid as it finishes unfolding, before the portcullis is released.
    for (let n = 0; n < 3; n++) if (this.ringT === 12 + n * 10) g.level.set(this.gateCol - 2 + n, 8, T.SEMI);
    if (this.ringT === 48) this.finishBridge(g);
    if (this.ringT === 24 || this.ringT === 48) Sound.play('chime');
    if (this.ringT < 96 && this.ringT % 8 === 0) g.spark(this.exitX + rand(-18, 18), 122, '#ffe8ad', 42, rand(-0.5, 0.5), -0.7);
  }
  draw(ctx, g) {
    if (this.end < g.camX - 40 || this.x > g.camX + VIEW_W + 40) return;
    ctx.drawImage(lastWindingArt(), this.x - 12, -28);
    // Thin chains connect the mechanisms; muted machinery stays behind the bright walking surfaces.
    for (let i = 0; i < 2; i++) {
      const a = this.wheels[i], b = this.wheels[i + 1];
      for (const dy of [-22, 22]) {
        fLine(ctx, a.cx, a.cy + dy, b.cx, b.cy + dy, '#17172f', 4);
        fLine(ctx, a.cx, a.cy + dy - 0.6, b.cx, b.cy + dy - 0.6, '#76624d', 1);
      }
    }
    for (const w of this.wheels) if (w.cx + 75 >= g.camX && w.cx - 75 <= g.camX + VIEW_W) w.drawWheel(ctx);
    const bx = this.exitX;
    fRoundRect(ctx, bx - 17, 125 + (this.rung ? 2 : 0), 34, 4, 1.3, '#241c35');
    fRect(ctx, bx - 15, 125 + (this.rung ? 2 : 0), 30, 1.5, this.rung ? '#b7ece9' : '#ffe2a0');
    if (!this.rung) fGlow(ctx, bx, 121, 17, '#ffe2a0', 0.1);
    // Folded brass bridge, followed by a physically rising gate. No camera lock or control freeze.
    for (let n = 0; n < 3; n++) {
      const u = this.rung ? clamp((this.ringT - 2 - n * 10) / 10, 0, 1) : 0;
      if (!u) continue;
      const x = (this.gateCol - 2 + n) * TILE;
      fRect(ctx, x, 128, TILE * u, 6, '#7b5e43');fRect(ctx, x, 128, TILE * u, 2, '#ffe2a0');
      fBlob(ctx, x + 3, 132, 0.8, '#b7ece9');
    }
    const lift = this.rung ? clamp(this.ringT / 48, 0, 1) * 280 : 0, gx = this.gateCol * TILE;
    ctx.save();ctx.beginPath();ctx.rect(gx - 4, -64, 24, 290);ctx.clip();
    for (let x = gx + 2; x < gx + TILE; x += 5) {fRect(ctx, x, -64 - lift, 2.5, 288, '#50435c');fRect(ctx, x, -64 - lift, 0.7, 288, '#ba9660');}
    for (let y = -40; y < 224; y += 28) fRect(ctx, gx, y - lift, TILE, 3, '#b8955b');
    ctx.restore();
  }
}

let LAST_WINDING_ART;
function lastWindingArt() {
  if (LAST_WINDING_ART) return LAST_WINDING_ART;
  const img = makeHiCanvas(636, 272), ctx = img.getContext('2d');
  // Indigo masonry frames the three gears; the exit has no decorative bell/clock turret.
  for (const [x, y, width, height] of [[37, 66, 126, 204], [245, 42, 126, 228], [453, 58, 126, 212]]) {
    fRoundRect(ctx, x - 3, y - 3, width + 6, height + 3, 5, '#101327');
    fRoundRect(ctx, x, y, width, height, 4, '#302a46');
    for (let row = y + 9; row < 270; row += 13) {
      fLine(ctx, x + 2, row, x + width - 2, row, '#221f37', 0.7);
      for (let col = x + ((Math.floor(row / 13) % 2) ? 9 : 23); col < x + width; col += 27) fLine(ctx, col, row - 12, col, row, '#221f37', 0.6);
    }
    fRoundRect(ctx, x + 9, y + 9, width - 18, height + 5, (width - 18) / 2, '#15172e');
    fLine(ctx, x + 2, y + 5, x + 2, 270, '#806347', 1.3);
    fLine(ctx, x + width - 2, y + 5, x + width - 2, 270, '#4c3e4f', 1.3);
    fRect(ctx, x - 5, y - 3, width + 10, 4, '#96734d');
    fRect(ctx, x - 4, y - 3, width + 8, 1, '#d2b17a');
    for (let wx = x + 14; wx < x + width - 8; wx += 24) {
      fRoundRect(ctx, wx, 248, 7, 16, 3.5, '#66505b');fRoundRect(ctx, wx + 1, 249, 5, 14, 2.5, '#d5a367');
      fLine(ctx, wx + 3.5, 249, wx + 3.5, 263, '#32253e', 1);
    }
  }
  LAST_WINDING_ART = img; return img;
}
