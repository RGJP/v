'use strict';
// 2-3 MIDNIGHT CLOCKWORKS, painted fine (hires.js: ART_R x, no dithering): a starry night over a skyline of clock
// towers with warm windows, slate rooftops and chimneys in front (the grandfather clock and gears are drawn live:
// drawClockSky, backgrounds.js).

function clockFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R, rng = mulberry32(hashStr('clock-fine'));
  const stars = finePix(W, H);
  for (let i = 0; i < 70; i++) { const x = rng() * W, y = rng() * 140 * R, c = rng() < 0.25 ? '#ffffff' : rng() < 0.5 ? '#ffe08a' : '#8f86d0', big = rng() < 0.15; stars.ell(x, y, big ? 1.6 : 1, big ? 1.6 : 1, c); if (big) stars.glow(x, y, 7, c, 0.25); }
  // the skyline: towers with pointed roofs and a lit rim, clock faces glowing on a few, windows warm
  const towers = finePix(W, H), T0 = '#231f4e', T1 = '#2e2a62';
  for (let i = 0; i < 8; i++) {
    const x = (i * BG_W / 8 + rng() * 24) * R, w = (18 + rng() * 16) * R, h = (70 + rng() * 70) * R, roof = (10 + rng() * 14) * R, face = rng() < 0.5;
    const wins = Array.from({ length: 40 }, () => rng() < 0.35);
    for (const o of [-W, 0, W]) {
      const X = x + o;
      towers.rect(X, H - h, w, h, T0); towers.rect(X, H - h, 2 * R, h, T1);
      towers.poly([[X - R, H - h + 1], [X + w / 2, H - h - roof], [X + w + R, H - h + 1]], T0); towers.poly([[X - R, H - h + 1], [X + w / 2, H - h - roof], [X + w * 0.35, H - h + 1]], T1);
      if (face) { const fy = H - h + 12 * R; towers.glow(X + w / 2, fy, w * 0.7, '#ffcf6a', 0.25); towers.ell(X + w / 2, fy, w * 0.3, w * 0.3, '#3a3070'); towers.ell(X + w / 2, fy, w * 0.26, w * 0.26, '#e8d8a8'); towers.line(X + w / 2, fy, X + w / 2, fy - w * 0.18, '#3a2a50'); towers.line(X + w / 2, fy, X + w / 2 + w * 0.12, fy, '#3a2a50'); }
      let k = 0;
      for (let wy = H - h + 26 * R; wy < H - 20 * R; wy += 14 * R) for (let wx = X + 4 * R; wx < X + w - 4 * R; wx += 7 * R) if (wins[k++ % 40]) { towers.glow(wx + R, wy + 2 * R, 7 * R, '#ffcf6a', 0.2); towers.rect(wx, wy, 2 * R, 4 * R, '#ffcf6a'); towers.rect(wx, wy, R, 4 * R, '#ffe8a8'); }
    }
  }
  // rooftops: a ridge of slate with tile rows, chimneys, the odd lit attic window
  const terms = [[6, 4, 0], [4, 9, 1.3], [2, 23, 0.5], [0.6, 47, 2]], roofs = finePix(W, H);
  const tops = Array.from({ length: W }, (_, x) => fineRidge(196, terms, x));
  roofs.fill(0, 0, W, H, (x, y) => { const d = y - tops[x]; if (d < 0) return null; if (d < 2) return '#3a3478'; return (Math.floor(d / (4 * R)) % 2 === 0 && (x + Math.floor(d / (4 * R)) * 7) % (8 * R) < 2) || d % (4 * R) < 1 ? '#1d1945' : '#15123a'; });
  for (let x = 0; x < W; x += 61 * R) { const t = tops[x]; roofs.rect(x, t - 12 * R, 6 * R, 12 * R + 4, '#15123a'); roofs.rect(x - R, t - 13 * R, 8 * R, 2 * R, '#2e2a62'); roofs.rect(x, t - 12 * R, R, 12 * R, '#24205a'); }
  for (let x = 13 * R; x < W; x += 43 * R) { const t = tops[x]; roofs.glow(x + R, t + 10 * R, 6 * R, '#ffcf6a', 0.3); roofs.rect(x, t + 8 * R, 2 * R, 3 * R, '#ffcf6a'); }
  const sky = finePix(VIEW_W * R, H); sky.vgrad(0, 0, VIEW_W * R, H, ['#0a0820', '#110e30', '#18143f', '#211a4e', '#2c205c', '#3a2868', '#4a3272']);
  return { sky: sky.hi(), layers: [{ c: stars.hi(), f: 0.02 }, { c: towers.hi(), f: 0.14 }, { c: roofs.hi(), f: 0.38 }], live: drawClockSky };
}
