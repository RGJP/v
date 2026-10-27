'use strict';
// 1-4 EMBER CITADEL, painted fine (hires.js: ART_R x, no dithering): the night behind (a blood-orange moon, black
// towers with lit windows, the castle wall), and the citadel's characters (enemies-citadel.js, bosses.js draw them).

function citadelFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R, rng = mulberry32(hashStr('citadel-fine'));
  const wrap = (x, fn) => { for (const o of [-W, 0, W]) fn(x + o); };
  // the moon: a soft red haze, a peach disc lit from the upper left, shaded craters
  const moon = finePix(W, H), mx = 330 * R, my = 62 * R;
  moon.glow(mx, my, 70 * R, '#ff8a5a', 0.35);
  moon.ell(mx, my, 26.5 * R, 26.5 * R, '#e8906a'); moon.ell(mx - 2 * R, my - 2 * R, 24.5 * R, 24.5 * R, '#ffb38a', { only: [moon.col('#e8906a')] }); moon.ell(mx - 9 * R, my - 9 * R, 9 * R, 7 * R, '#ffc8a4', { only: [moon.col('#ffb38a')] });
  for (const [cx, cy, r] of [[-8, -7, 5], [10, 8, 7], [6, -14, 3], [-14, 10, 4], [16, -4, 2.5]]) { moon.ell(mx + cx * R, my + cy * R, r * R, r * R, '#e0805a', { only: ['#ffb38a', '#ffc8a4', '#e8906a'].map(moon.col) }); moon.ell(mx + cx * R + R, my + cy * R + R, (r - 1.2) * R, (r - 1.2) * R, '#ffb38a', { only: [moon.col('#e0805a')] }); }
  // towers: tall black spires with pointed roofs, a lava-lit edge down one side, lit windows
  const spires = finePix(W, H), TOWER = '#2b0d1f', EDGE = '#4a1426';
  for (let i = 0; i < 9; i++) {
    const x = (i * BG_W / 9 + rng() * 20) * R, w = (14 + rng() * 14) * R, h = (60 + rng() * 70) * R, wins = Array.from({ length: 6 }, () => rng() < 0.7);
    wrap(x, X => {
      spires.rect(X, H - h, w, h, TOWER);
      spires.poly([[X - 2 * R, H - h + 1], [X + w / 2, H - h - w * 0.6 - 2 * R], [X + w + 2 * R, H - h + 1]], TOWER);
      spires.rect(X + w - 2 * R, H - h, 2 * R, h, EDGE);   // lit by the lava, on the right
      let k = 0;
      for (let wy = H - h + 14 * R; wy < H - 30 * R; wy += 18 * R) if (wins[k++ % 6]) { spires.glow(X + w / 2, wy + 2 * R, 8 * R, '#ff9a3c', 0.35); spires.ell(X + w / 2, wy, R, 1.5 * R, '#ff9a3c'); spires.rect(X + w / 2 - R, wy, 2 * R, 4 * R, '#ff9a3c'); spires.rect(X + w / 2 - R, wy, R, 3 * R, '#ffd08a'); }
    });
  }
  // the castle wall: battlements, bricks, arched dark windows, warm light rising from below
  const walls = finePix(W, H), top = 138 * R;
  walls.fill(0, top, W, H, (x, y) => {
    const yy = y - top - 6 * R, row = Math.floor(yy / (10 * R)), bx = (x + (row % 2) * 12 * R) % (24 * R), by = ((yy % (10 * R)) + 10 * R) % (10 * R);
    const base = lerpColor('#3d1426', '#5a1c22', clamp((y - top) / (H - top), 0, 1) ** 2);
    return yy > 0 && (by < 2 || bx < 2) ? lerpColor(base, '#2a0c1a', 0.5) : yy > 0 && by < 4 ? lerpColor(base, '#4e1a30', 0.6) : base;
  });
  for (let x = 0; x < W; x += 16 * R) { walls.rect(x, top - 8 * R, 8 * R, 8 * R, '#3d1426'); walls.rect(x, top - 8 * R, 8 * R, 2, '#5a2036'); }
  for (let x = 24 * R; x < W; x += 64 * R) { walls.rect(x, top + 22 * R, 16 * R, 30 * R, '#1e0812'); walls.ell(x + 8 * R, top + 22 * R, 8 * R, 8 * R, '#1e0812'); }
  const sky = finePix(VIEW_W * R, H); sky.vgrad(0, 0, VIEW_W * R, H, ['#12050c', '#1c0812', '#2a0c18', '#3d1020', '#57161f', '#7a2318', '#a1361a']);
  return { sky: sky.hi(), layers: [{ c: moon.hi(), f: 0.03 }, { c: spires.hi(), f: 0.18 }, { c: walls.hi(), f: 0.42 }] };
}
