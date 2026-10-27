'use strict';
class Platform {
  constructor(col, row, wt, axis, range, period, phase = 0) {
    this.x0 = col * TILE; this.y0 = row * TILE; this.w = wt * TILE; this.h = 8;
    this.axis = axis; this.range = range * TILE; this.period = period; this.phase = phase; this.t = 0;
    this.dx = 0; this.dy = 0;
    // ragged ends: per-row insets (0-2px) from a seeded random walk
    const rng = mulberry32(hashStr(col + ',' + row + ',' + axis)), walk = () => { const a = []; let d = 1; for (let i = 0; i < 8; i++) { const r = rng(); d += r < 0.35 ? -1 : r < 0.7 ? 1 : 0; d = Math.max(0, Math.min(2, d)); a.push(d); } return a; };
    this.jagL = walk(); this.jagR = walk();
    this.place();
    this.prevY = this.y;
  }
  place() {
    const u = (this.t / this.period + this.phase) * Math.PI * 2;
    // pendulum ('p') and gear wheel ('c') hang off a pivot at the centre of tile (col, row)
    if (this.axis === 'p' || this.axis === 'c') {
      const a = this.axis === 'p' ? Math.sin(u) * PENDULUM_SWING : u;
      this.pivX = this.x0 + 8; this.pivY = this.y0 + 8;
      this.x = this.pivX + Math.sin(a) * this.range - this.w / 2;
      this.y = this.pivY + Math.cos(a) * this.range;
      return;
    }
    const k = 0.5 - 0.5 * Math.cos(u);
    this.x = this.axis === 'h' ? this.x0 + this.range * k : this.x0;
    this.y = this.axis === 'v' ? this.y0 + this.range * k : this.y0;
  }
  update() {
    const ox = this.x, oy = this.y;
    this.t++;
    this.place();
    this.dx = this.x - ox; this.dy = this.y - oy; this.prevY = oy;
  }
  draw(ctx, th) {   // (in fine pixels: hires.js)
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.pivX !== undefined) {
      // brass rod (pendulum) or spoke (wheel) from the pivot down to the platform's middle
      const ex = x + this.w / 2;
      fLine(ctx, this.pivX, this.pivY, ex, y, INK, 5); fLine(ctx, this.pivX, this.pivY, ex, y, '#c8891e', 3); fLine(ctx, this.pivX - 0.3, this.pivY, ex - 0.3, y, '#ffd166', 1);
      fBlob(ctx, this.pivX, this.pivY, 4.3, INK); fBlob(ctx, this.pivX, this.pivY, 3.4, '#c8891e'); fBlob(ctx, this.pivX - 0.8, this.pivY - 0.8, 1.4, '#fff3b0');
      fRoundRect(ctx, ex - 3.3, y - 3.3, 6.6, 3.6, 1, INK); fRect(ctx, ex - 2.3, y - 2.3, 4.6, 1, '#ffd166');   // a little hanger bracket on the platform
    }
    ctx.drawImage(platformBoardArt(this.w, this.h, th.plat), x - 1, y - 1);
  }
}
// a thick wooden board w x h: an ink line round it, its sunlit top, grain, rings on its cut ends, rope bindings (fine)
const PLATFORM_ART = new Map();
function platformBoardArt(w, h, pal) {
  const key = w + 'x' + h + pal.join();
  let img = PLATFORM_ART.get(key);
  if (img) return img;
  const R = ART_R, [b, d, l] = pal, P = finePix((w + 2) * R, (h + 2) * R), X = v => (v + 1) * R, rng = mulberry32(hashStr(key));
  P.fill(X(0), X(0), X(w), X(h), (px, py) => py < X(0) + 2 ? l : py >= X(h) - R ? d : b);
  for (let k = 0; k < w / 3; k++) { const gx = X(3 + rng() * (w - 8)), gy = X(1.6 + rng() * (h - 3)); P.line(gx, gy, gx + (3 + rng() * 6) * R, gy + (rng() - 0.5) * 2, lerpColor(b, d, 0.55), { only: [P.col(b)] }); }   // grain
  for (const ex of [X(0), X(w - 3)]) { P.rect(ex, X(1), 3 * R, (h - 2) * R, l); P.ell(ex + 1.5 * R, X(h / 2), 1 * R, (h / 2 - 1.4) * R, d); P.ell(ex + 1.5 * R, X(h / 2), 0.4 * R, (h / 2 - 2.4) * R, l); }   // the cut ends' rings
  for (let i = 10; i < w - 8; i += 16) { P.rect(X(i - 0.6), X(-0.4), 3.2 * R, (h + 0.8) * R, '#5a3a1a'); P.rect(X(i), X(-0.4), 2 * R, (h + 0.8) * R, '#e8d090'); for (let j = 1; j < h; j += 2) P.rect(X(i), X(j), 2 * R, 2, '#b89850'); }   // rope bindings
  P.outline(INK); P.outline(INK);
  img = P.hi(); PLATFORM_ART.set(key, img);
  return img;
}
