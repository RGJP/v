'use strict';
// 2-2 FROSTWIND PEAKS, painted fine (hires.js: ART_R x, no dithering): a starry night with a rippling aurora, snowy
// peaks lit from the left, a hazy forest of firs in the valley mist.

function snowFineBackground() {
  const R = ART_R, W = BG_W * R, H = VIEW_H * R, rng = mulberry32(hashStr('snow-fine'));
  const aurora = finePix(W, H);
  for (let i = 0; i < 90; i++) { const x = rng() * W, y = rng() * 110 * R, big = rng() < 0.2; aurora.ell(x, y, big ? 1.6 : 1, big ? 1.6 : 1, rng() < 0.3 ? '#ffffff' : '#9fb8e8'); if (big) aurora.glow(x, y, 6, '#cfe0ff', 0.3); }
  for (const [y0, amp, col, a] of [[38, 12, '#5ef2a0', 0.3], [58, 9, '#c77dff', 0.22]]) {
    const ys = Array.from({ length: W }, (_, x) => (y0 + periodic(x / R, [[amp, 2, 0.3], [amp * 0.4, 5, 1.7], [amp * 0.15, 13, 0.9]])) * R);
    aurora.wash(0, 0, W, H, (x, y) => { const d = (y - ys[x]) / (24 * R); return d < 0 || d > 1 ? 0 : a * (1 - d) * (0.75 + 0.25 * Math.sin(x * 0.02 + y0)) * Math.min(1, d * 8); }, col);
  }
  // the peaks: faces lit from the left, snow on their upper slopes, a fringe where snow meets rock
  const terms = [[26, 2, 0.8], [14, 5, 2.1], [6, 11, 0.4], [1.2, 29, 1.6]], peaks = finePix(W, H);
  const tops = Array.from({ length: W }, (_, x) => fineRidge(150, terms, x));
  peaks.fill(0, 0, W, H, (x, y) => {
    const t = tops[x]; if (y < t) return null;
    const d = y - t, s = (tops[(x + 4) % W] - tops[(x - 4 + W) % W]) / 8, snow = ((150 * R - t) * 0.35 + 3 * R) + Math.sin(x * 0.11) * 4;
    if (d < snow) return s < -0.1 ? '#f4f8ff' : s < 0.3 ? '#dce8fa' : '#b8c8e8';
    return s < -0.2 ? '#4a5f8f' : s < 0.25 ? '#3e5180' : '#34466f';
  });
  // the valley forest: tall hazy firs, tier on tier of drooping boughs, sunk in mist
  const pines = finePix(W, H), FIR = '#2b3d68';
  pines.rect(0, 205 * R, W, H - 205 * R, FIR);
  for (let i = 0; i < 15; i++) {
    const x = (i * BG_W / 15 + rng() * 20) * R, h = (46 + rng() * 40) * R, base = 208 * R;
    for (const o of [-W, 0, W]) for (let k = 0; k < 6; k++) {
      const ty = base - h + k * h / 6, w = (2 + (k + 1) * 1.8) * R;
      pines.poly([[x + o, ty - h / 7], [x + o + w, ty + h / 6], [x + o - w, ty + h / 6]], FIR);
      pines.poly([[x + o, ty - h / 7], [x + o - w * 0.3, ty + h / 6], [x + o - w, ty + h / 6]], '#34497a', { only: [pines.col(FIR)] });
    }
  }
  pines.wash(0, 180 * R, W, 210 * R, (x, y) => 0.35 * (1 - (210 * R - y) / (30 * R)), '#7f9bd0');   // ground mist
  const sky = finePix(VIEW_W * R, H); sky.vgrad(0, 0, VIEW_W * R, H, ['#0b1030', '#101a45', '#16285a', '#1d3a6e', '#244d80', '#2c6190', '#3a76a0']);
  return { sky: sky.hi(), layers: [{ c: aurora.hi(), f: 0.03, drift: 0.04 }, { c: peaks.hi(), f: 0.12 }, { c: pines.hi(), f: 0.35 }] };
}
