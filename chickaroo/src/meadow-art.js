'use strict';
// How 1-1's critters look (their behaviour: enemies-meadow.js / enemies-forest.js): the acorn (Grumblet: kept a crisp
// hand-placed pixel map, like the original, just lit a little), the crow
// (Flutter's crow skin), the bee (Buzzbee), the grasshopper (Hopsprig) and the mole (Molebert). Painted pixel by pixel to
// the 4-1 critters' standard: every part shaded by its own little light (up and to the left: a dark rim, a lit crown, a
// glint), then one ink outline round the whole silhouette. Baked once, the first time they're drawn (MEADOW_ART).

const MART_COL32 = Object.create(null);
function mArtCol32(c) {
  let v = MART_COL32[c];
  if (v !== undefined) return v;
  if (c.charCodeAt(0) === 35) {
    const n = hexInt(c);
    v = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
  } else {
    const m = c.match(/[\d.]+/g);
    v = m ? ((Math.round((m[3] !== undefined ? +m[3] : 1) * 255) << 24) | ((+m[2] & 255) << 16) | ((+m[1] & 255) << 8) | (+m[0] & 255)) >>> 0 : 0;
  }
  return (MART_COL32[c] = v);
}
// A pixel buffer to paint into: colours or null, then an ink outline, then a canvas
function mArt(w, h, R = ART_R) {
  // painted R times finer than the game (hires.js): every shape is placed in game pixels and filled in art pixels
  const W = Math.ceil(w * R), H = Math.ceil(h * R), buf = new Array(W * H).fill(null);
  const set = (ax, ay, c, only) => {
    if (ax < 0 || ay < 0 || ax >= W || ay >= H) return;
    const k = ay * W + ax;
    if (!only || (only === true ? buf[k] : only.includes(buf[k]))) buf[k] = c;   // (only: colours to paint over, or true: anything painted)
  };
  const A = {
    w, h, buf, R,
    // one game pixel's worth (an R x R block)
    px(x, y, c, only) {
      x = Math.floor(x); y = Math.floor(y);
      for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) set(x * R + i, y * R + j, c, only);
    },
    // fill every art pixel whose centre (in game units) passes the test
    fill(x0, y0, x1, y1, f, only) {
      const ay0 = Math.max(0, Math.floor(y0 * R)), ay1 = Math.min(H - 1, Math.ceil(y1 * R));
      const ax0 = Math.max(0, Math.floor(x0 * R)), ax1 = Math.min(W - 1, Math.ceil(x1 * R)), invR = 1 / R;
      if (!only) {
        for (let ay = ay0; ay <= ay1; ay++) {
          const y = (ay + 0.5) * invR, row = ay * W;
          for (let ax = ax0; ax <= ax1; ax++) { const c = f((ax + 0.5) * invR, y, ax, ay); if (c) buf[row + ax] = c; }
        }
      } else if (only === true) {
        for (let ay = ay0; ay <= ay1; ay++) {
          const y = (ay + 0.5) * invR, row = ay * W;
          for (let ax = ax0; ax <= ax1; ax++) { const k = row + ax; if (buf[k]) { const c = f((ax + 0.5) * invR, y, ax, ay); if (c) buf[k] = c; } }
        }
      } else {
        for (let ay = ay0; ay <= ay1; ay++) {
          const y = (ay + 0.5) * invR, row = ay * W;
          for (let ax = ax0; ax <= ax1; ax++) { const c = f((ax + 0.5) * invR, y, ax, ay); if (c) { const k = row + ax; if (only.includes(buf[k])) buf[k] = c; } }
        }
      }
      return A;
    },
    ell(cx, cy, rx, ry, c, only, rot = 0) {
      if (rot === 0) {
        const invRx = 1 / rx, invRy = 1 / ry;
        return A.fill(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => { const u = (x - cx) * invRx, v = (y - cy) * invRy; return u * u + v * v <= 1 ? c : null; }, only);
      }
      const cs = Math.cos(rot), sn = Math.sin(rot), Rr = Math.max(rx, ry) + 1, invRx = 1 / rx, invRy = 1 / ry;
      return A.fill(cx - Rr, cy - Rr, cx + Rr, cy + Rr, (x, y) => { const dx = x - cx, dy = y - cy, u = (dx * cs + dy * sn) * invRx, v = (dy * cs - dx * sn) * invRy; return u * u + v * v <= 1 ? c : null; }, only);
    },
    // a shaded round part: each pixel's tier (pal: 5 tones, dark to light) from a light up and to the left, the
    // tiers blended with ordered dithering where they meet
    shade(cx, cy, rx, ry, pal, only, rot = 0) {
      const cs = Math.cos(rot), sn = Math.sin(rot), Rr = Math.max(rx, ry) + 1, TH = [-0.5, -0.05, 0.45, 0.95], BAND = 0.11;
      return A.fill(cx - Rr, cy - Rr, cx + Rr, cy + Rr, (x, y, ax, ay) => {
        const dx = x - cx, dy = y - cy, u = (dx * cs + dy * sn) / rx, v = (dy * cs - dx * sn) / ry, d = u * u + v * v;
        if (d > 1) return null;
        const l = -0.55 * dx / rx - 0.75 * dy / ry + (1 - d) * 0.6, b = 0.5;
        let t = 0;
        for (const th of TH) if (l > th + (b - 0.5) * BAND * 2) t++;
        return pal[t];
      }, only);
    },
    // a softly shaded round part: the same light as shade(), blended smoothly through `stops` (dark to light), no bands
    soft(cx, cy, rx, ry, stops, only, rot = 0) {
      if (rot === 0) {
        const invRx = 1 / rx, invRy = 1 / ry;
        return A.fill(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => {
          const u = (x - cx) * invRx, v = (y - cy) * invRy, d = u * u + v * v;
          return d > 1 ? null : softTone(stops, -0.55 * u - 0.75 * v + (1 - d) * 0.6);
        }, only);
      }
      const cs = Math.cos(rot), sn = Math.sin(rot), Rr = Math.max(rx, ry) + 1, invRx = 1 / rx, invRy = 1 / ry;
      return A.fill(cx - Rr, cy - Rr, cx + Rr, cy + Rr, (x, y) => {
        const dx = x - cx, dy = y - cy, u = (dx * cs + dy * sn) * invRx, v = (dy * cs - dx * sn) * invRy, d = u * u + v * v;
        return d > 1 ? null : softTone(stops, -0.55 * u - 0.75 * v + (1 - d) * 0.6);
      }, only);
    },
    poly(pts, c, only) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const px = pts[i][0], py = pts[i][1];
        if (px < x0) x0 = px; if (px > x1) x1 = px;
        if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
      return A.fill(x0, y0, x1, y1, (px, py) => {
        let ins = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; }
        return ins ? c : null;
      }, only);
    },
    // a line `t` game pixels thick (fine: a little under one)
    line(x0, y0, x1, y1, c, only, t = (R - 1) / R) {
      const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * R)), k = Math.max(1, Math.round(t * R));
      for (let i = 0; i <= n; i++) {
        const ax = Math.round((x0 + 0.5 + (x1 - x0) * i / n) * R - k / 2), ay = Math.round((y0 + 0.5 + (y1 - y0) * i / n) * R - k / 2);
        for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) set(ax + q, ay + j, c, only);
      }
      return A;
    },
    // an ink line round everything painted so far (two art pixels)
    // an ink line round the shape, 2 art px thick at ART_R (scaled up with a finer R: grown in 4 then 8 directions so it stays round)
    outline(c = INK, n = 2 * R / ART_R) {
      for (let pass = 0; pass < n; pass++) {
        const src = buf.slice(), diag = R > ART_R && pass % 2 === 0;
        for (let y = 0; y < H; y++) {
          const row = y * W;
          for (let x = 0; x < W; x++) {
            const k = row + x;
            if (!src[k] && ((x > 0 && src[k - 1]) || (x < W - 1 && src[k + 1]) || (y > 0 && src[k - W]) || (y < H - 1 && src[k + W])
              || (diag && ((x > 0 && y > 0 && src[k - W - 1]) || (x < W - 1 && y > 0 && src[k - W + 1]) || (x > 0 && y < H - 1 && src[k + W - 1]) || (x < W - 1 && y < H - 1 && src[k + W + 1]))))) buf[k] = c;
          }
        }
      }
      A.inked = c;
      return A;
    },
    canvas() {
      const cv = makeCanvas(W, H), g = cv.getContext('2d'), img = g.createImageData(W, H), px = new Uint32Array(img.data.buffer);
      const len = W * H;
      for (let i = 0; i < len; i++) {
        const c = buf[i];
        if (c) px[i] = mArtCol32(c);
      }
      if (R > ART_R && A.inked) {   // finer art: a faded ring of ink past the outline, so the stair-steps blend away
        const has = (x, y) => x >= 0 && y >= 0 && x < W && y < H && buf[y * W + x], rgb = hexInt(A.inked);
        const bgr = ((rgb & 255) << 16) | (rgb & 0xff00) | ((rgb >> 16) & 255);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!buf[y * W + x]) {
          const n4 = !!has(x - 1, y) + !!has(x + 1, y) + !!has(x, y - 1) + !!has(x, y + 1), d = !!has(x - 1, y - 1) + !!has(x + 1, y - 1) + !!has(x - 1, y + 1) + !!has(x + 1, y + 1);
          if (n4 + d) {
            const a = Math.round(Math.min(1, n4 * 0.3 + d * 0.12 + 0.08) * 0.92 * 255);
            px[y * W + x] = ((a << 24) | bgr) >>> 0;
          }
        }
      }
      g.putImageData(img, 0, 0);
      return hiRes(cv, R);
    },
  };
  return A;
}

// a tone from `stops` (dark to light) for a light value l (about -1 dark rim .. 1.6 lit crown), smoothly blended
function softTone(stops, l) {
  const v = l === l ? (l < -1 ? 0 : l > 1.6 ? 1 : (l + 1) / 2.6) : 0.5;
  const t = v * (stops.length - 1), i = Math.min(stops.length - 2, t | 0);
  return lerpColor(stops[i], stops[i + 1], t - i);
}
// Shellback's woodlouse: fine shaded armour, seven stepping legs and jointed feelers.
// Curled poses rotate the plate pattern while the light stays at the upper left.
const PILL_BUG_ART = new Map();
function pillBugArt(walking, frame, facing) {
  frame = ((frame % (walking ? 8 : 24)) + (walking ? 8 : 24)) % (walking ? 8 : 24);
  const key = walking ? 'walk:' + frame + ':' + facing : 'ball:' + frame;
  let img = PILL_BUG_ART.get(key);
  if (img) return img;
  const A = mArt(30, 19), cx = 15, by = 18;
  const shell = ['#252d40', '#3b4960', '#64778f', '#9caec0', '#d0dbe2'];
  const legs = ['#393544', '#5c5260', '#8c7e83', '#b4a399', '#dac6ac'];
  if (walking) {
    const f = facing, phase = frame * Math.PI / 4;
    // Far legs sit in shadow; the near legs ripple along the belly.
    for (let i = 0; i < 7; i++) {
      const x = cx + f * (4.8 - i * 1.65), step = Math.sin(phase - i * 0.9);
      A.line(x - f * 0.4, by - 3, x - f * 1.1, by - 1.1, legs[0], null, 0.5);
      A.line(x, by - 3, x + f * (0.6 + step * 0.45), by - 1.6, legs[2], null, 0.6);
      A.line(x + f * (0.6 + step * 0.45), by - 1.6, x + f * (0.1 + step * 0.7), by - 0.65 - Math.max(0, step) * 0.7, legs[3], null, 0.45);
    }
    A.soft(cx - f * 7.2, by - 3.7, 1.4, 0.65, shell);   // tail plates
    A.soft(cx + f * 6.8, by - 4.8, 2.1, 2.1, shell);   // head tucked under the front armour
    const wig = Math.sin(phase) * 0.7;
    for (const [dy, bend, tip] of [[-5.5, -7.3, -7.6 + wig], [-4.8, -5.8, -5.2 - wig]]) {
      A.line(cx + f * 7.5, by + dy, cx + f * 9.8, by + bend, shell[2], null, 0.55);
      A.line(cx + f * 9.8, by + bend, cx + f * 11.7, by + tip, shell[3], null, 0.4);
    }
    // Bowed seams follow the dome; each plate has a recessed joint and a narrow pearl edge.
    A.fill(cx - 7.4, by - 14, cx + 7.4, by - 2.8, (x, y) => {
      const u = (x - cx) * f, top = -3.1 - 10.3 * Math.sqrt(Math.max(0, 1 - (u / 7.3) ** 2));
      const v = y - by, q = (v - top) / (-3.1 - top);
      if (Math.abs(u) >= 7.3 || q < 0 || q > 1) return null;
      const panel = (u + 7.3 + Math.sin(q * Math.PI) * 0.8) / 2.05, seam = panel - Math.floor(panel);
      const light = -(x - cx) * 0.055 - (v + 8) * 0.12 + Math.sin(q * Math.PI) * 0.35;
      if (q > 0.88) return softTone(shell, light - 0.55);
      if (seam < 0.12) return softTone(shell, light - 0.65);
      if (seam < 0.28) return softTone(shell, light + 0.6);
      if (Math.floor(panel) % 2 && q > 0.22 && q < 0.28 && seam > 0.43 && seam < 0.64) return '#cfbd89';
      return softTone(shell, light + Math.sin(seam * Math.PI) * 0.18);
    });
    A.outline();
    const ex = cx + f * 7.2;
    A.ell(ex, by - 5.3, 0.65, 0.8, '#141c2a');
    A.ell(ex - 0.15, by - 5.65, 0.23, 0.24, '#f1f5df');
  } else {
    const angle = frame * Math.PI * 2 / 24, ca = Math.cos(angle), sa = Math.sin(angle), cy = by - 7.5;
    A.fill(cx - 7, cy - 7, cx + 7, cy + 7, (x, y) => {
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 > 49) return null;
      const z = Math.sqrt(49 - d2), u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      const panel = (Math.atan2(v, u) + Math.PI + 0.22 * z / 7) * 7 / (Math.PI * 2), seam = panel - Math.floor(panel);
      const light = -dx * 0.075 - dy * 0.11 + z * 0.11;
      if (d2 < 3) return softTone(shell, light - 0.65);   // tucked-in centre
      if (seam < 0.11) return softTone(shell, light - 0.85);
      if (seam < 0.25) return softTone(shell, light + 0.5);
      return softTone(shell, light + Math.sin(seam * Math.PI) * 0.1);
    });
    A.ell(cx - 2.6, cy - 3.7, 1.15, 0.45, '#d7e4ed', null, -0.5);
    A.outline();
  }
  img = A.canvas(); PILL_BUG_ART.set(key, img);
  return img;
}

const BRISTLE_WORM_HEADS = new Map();
function bristleWormHeadArt(mouth, phase) {
  const wig = Math.floor(phase / 3), key = mouth + ':' + wig;
  let img = BRISTLE_WORM_HEADS.get(key);
  if (img) return img;
  const A = mArt(20, 20), C = ['#63303e', '#974957', '#c77279', '#eaa499', '#ffe0c2'];
  const J = ['#211d2c', '#3a2a38', '#614248', '#b27e5c', '#efc885'];
  const spread = mouth / 4;
  A.soft(10, 12.4, 5.2, 4, C);
  A.soft(10, 15.8, 3.7, 2.8, C);
  for (const side of [-1, 1]) {
    A.line(10 + side * 2.6, 11, 10 + side * 5, 8.6, C[1], null, 0.65);
    A.line(10 + side * 5, 8.6, 10 + side * (5.7 + Math.sin(wig * Math.PI / 2) * 0.4), 7.3, C[3], null, 0.4);
  }
  A.ell(10, 10.1, 2.1 + spread, 0.6 + spread * 1.6, '#351526');
  A.ell(10, 10.8, 1.5 + spread * 0.6, 0.35 + spread * 0.45, '#b13d58');
  for (const side of [-1, 1]) {
    const tip = 10 + side * (0.2 + spread * 3), elbow = 10 + side * (3 + spread * 2.2);
    const jaw = [[10 + side * 2.5, 11], [elbow + side * 0.9, 8], [elbow, 4.7], [tip, 5.2], [tip + side * 0.9, 6.2], [elbow - side * 0.5, 6.1], [elbow - side * 0.4, 8.2], [10 + side * 1.9, 10.2]];
    A.poly(jaw, J[0]);
    A.line(10 + side * 2.7, 9.6, elbow + side * 0.2, 7.3, J[2], null, 0.65);
    A.poly([[tip, 5.2], [tip + side * 1.6, 5], [tip + side * 0.9, 6.2]], J[4]);
    A.ell(10 + side * 3.4, 12, 0.65, 0.8, '#201a2a');
    A.ell(10 + side * 3.4 - 0.2, 11.7, 0.23, 0.25, '#f6dfb0');
  }
  A.ell(7.3, 13.7, 0.65, 1.1, '#f8c6ab', null, -0.3);
  img = A.outline().canvas(); BRISTLE_WORM_HEADS.set(key, img);
  return img;
}

const MA = {
  nut: ['#4e2a10', '#74431c', '#a0632a', '#c88a42', '#ecb873'],
  cap: ['#2e1a0c', '#4a2c14', '#6a4320', '#8e5e30', '#b07c46'],
  crow: ['#0b0b16', '#16162a', '#24243e', '#383860', '#5c5c92'],
  wing: ['#0d0d1c', '#1a1a32', '#2a2a4c', '#40406c', '#62629a'],
  amber: ['#8a5208', '#c4820e', '#eeae22', '#ffd04a', '#fff0a0'],
  band: ['#1c1008', '#2a1a0e', '#3a2614', '#4e3820', '#6a5030'],
  fuzz: ['#4a2a10', '#6a4018', '#8e5c2a', '#b47e3c', '#dcac64'],
  beeHead: ['#0e0a08', '#1a1410', '#2a2018', '#3e3224', '#5a4a36'],
  leaf: ['#1e6a2a', '#2e8a38', '#46b04c', '#72d86a', '#b0f29a'],
  leafD: ['#14502a', '#1e6a32', '#2e8a3e', '#46a84e', '#6cc868'],
  mole: ['#3a2820', '#58402e', '#7a5a44', '#9c7a60', '#c4a084'],
  pink: ['#b0506a', '#d06e88', '#ee90a8', '#ffb4c6', '#ffe0ea'],
};
let MEADOW_ART = null;
function meadowArt() {
  if (MEADOW_ART) return MEADOW_ART;
  const M = MEADOW_ART = {};

  // ── the acorn (GRUMBLET): a glossy tan nut under a scaly cap with a little stem, scowling: heavy brows, beady
  //    eyes, a frown, pink cheeks. Three poses: two steps of the walk, and squashed flat (stomped) ──
  const NUT = ['#7a4a24', '#9a6232', '#c08048', '#d8a060', '#f0c484'], CAP = ['#2e180a', '#4e2c16', '#6e4220', '#946030', '#b88048'];
  const acorn = step => {
    const A = mArt(18, 17);
    for (const [fx, lift] of step ? [[5.2, 0.6], [13.6, 0]] : [[5.6, 0], [13.2, 0.6]]) { A.ell(fx, 15.7 - lift, 2, 1.05, '#3b2416'); A.ell(fx - 0.4, 15.4 - lift, 1.1, 0.45, '#6a4a32', ['#3b2416']); }
    A.shade(9, 10.4, 6.3, 4.7, NUT);                                   // the nut
    A.shade(9, 13.6, 2.6, 1.6, NUT, null);                             // its point underneath
    A.shade(9.2, 5.2, 7.7, 3.5, CAP);                                  // the cap
    A.fill(1, 1.5, 17.5, 6.6, (x, y) => (Math.round((x + y) * 1.1) % 3 === 0 || Math.round((x - y) * 1.1) % 3 === 0) ? CAP[1] : null, CAP.slice(2));   // its scales
    A.fill(1, 6.4, 17.5, 7.6, (x, y) => y < 7.5 ? CAP[1] : null, CAP.concat(NUT));   // the cap's rim
    A.fill(1, 6.4, 17.5, 6.9, (x, y) => Math.round(x * 2) % 3 === 0 ? CAP[3] : null, [CAP[1]]);
    A.poly([[8.6, 2.2], [9.4, -0.2], [11, 0.2], [10.2, 2.4]], CAP[2]);   // the stem
    A.outline();
    // the face: brows knitted down over beady eyes, a frown, cheeks
    for (const s of [-1, 1]) {
      const ex = 9 + s * 2.9;
      A.ell(ex, 9.6, 1.35, 1.55, '#fff6e0');
      A.ell(ex - s * 0.35, 9.9, 0.75, 0.95, '#1b1530');
      A.px(ex - s * 0.35 - 0.6, 9.2, '#fff6e0', ['#1b1530']);
      A.line(ex + s * 1.8, 7.4, ex - s * 1.2, 8.4, '#3b2416', null, 0.9);
      A.ell(9 + s * 4.6, 11.5, 0.95, 0.55, '#ff9aa2');
    }
    A.line(7.6, 12.9, 8.3, 12.3, '#3b2416'); A.line(8.3, 12.3, 9.7, 12.3, '#3b2416'); A.line(9.7, 12.3, 10.4, 12.9, '#3b2416');
    return A.canvas();
  };
  M.acornA = acorn(0); M.acornB = acorn(1);
  {   // squashed flat: the cap pressed down on a pancaked nut, eyes screwed shut
    const A = mArt(18, 9);
    A.shade(9, 5.6, 8, 2.8, NUT);
    A.shade(9, 2.6, 8.4, 1.9, CAP);
    A.fill(0.5, 3.8, 17.5, 4.6, () => CAP[1], CAP.concat(NUT));
    A.outline();
    for (const s of [-1, 1]) { const ex = 9 + s * 3; A.line(ex - 1.2, 5, ex + 1.2, 6.4, '#1b1530'); A.line(ex - 1.2, 6.4, ex + 1.2, 5, '#1b1530'); }
    M.acornFlat = A.canvas();
  }

  // ── the crow: glossy blue-black, a sharp dark beak and a mean yellow eye, flapping (faces left) ──
  const crow = up => {
    const A = mArt(26, 19);
    A.poly([[18, 9], [25.5, 7.5], [25.5, 12.5], [18, 12.5]], MA.crow[1]);   // tail, fanned
    for (const y of [9, 11]) A.line(20, y, 25, y - 0.5, MA.crow[0], [MA.crow[1]]);
    A.shade(12.5, 10.5, 7.5, 3.9, MA.crow);                                // body
    A.shade(6, 8.6, 3.4, 3.2, MA.crow);                                    // head
    A.poly([[3.2, 7.6], [0, 9.4], [3.2, 10.4]], '#55556e'); A.line(1, 9, 3, 8, '#8a8aa2');   // beak
    A.ell(13, 14, 0.8, 1.2, '#4a4a5e'); A.ell(15, 14, 0.8, 1.2, '#4a4a5e');   // tucked feet
    if (up) {   // wing raised: feathers fingering out at the tip
      A.poly([[9, 9], [12, 2.5], [15, 0.5], [19.5, 1.5], [18, 9]], MA.wing[2]);
      A.shade(14, 6, 5, 4.5, MA.wing, [MA.wing[2]]);
      for (const [x0, x1] of [[13, 13.5], [15.5, 16], [18, 18.5]]) A.line(x0, 8, x1 + 0.5, 1.5, MA.wing[0], MA.wing);
    } else {    // wing down: the downstroke
      A.poly([[9, 11], [18, 10.5], [19.5, 15], [16.5, 18.5], [12.5, 16.5]], MA.wing[2]);
      A.shade(14.5, 13.5, 5, 4, MA.wing, [MA.wing[2]]);
      for (const [x0, x1] of [[13, 13.5], [15.5, 16], [18, 17.5]]) A.line(x0, 11.5, x1, 17.5, MA.wing[0], MA.wing);
    }
    A.outline();
    A.px(5, 8, '#ffd23f'); A.px(6, 8, '#ffd23f'); A.px(5, 8, INK); A.px(5, 7, MA.crow[0]); A.px(6, 7, MA.crow[0]);   // eye under a frown
    A.px(7, 7, '#9a9ad0');                                                 // the gloss on its head
    return A.canvas();
  };
  M.crowUp = crow(true); M.crowDown = crow(false);

  // ── the bee: a striped amber abdomen and stinger, a fuzzy thorax, a dark head with a big shiny eye (faces right).
  //    Its wings are separate, drawn see-through over the top ──
  const bee = angry => {
    const A = mArt(28, 18), ox = 0;
    A.ell(13, 15.5, 1, 1.4, '#ff9f1c');                                    // the pollen basket on its back leg
    A.shade(9 + ox, 10.5, 6.8, 4.6, MA.amber);                             // abdomen
    for (const bx of [6, 10]) A.fill(bx, 5, bx + 1.6, 16, (x, y) => MA.band[y < 9 ? 3 : y < 12 ? 2 : 1], MA.amber);
    A.fill(13.4, 5, 14.6, 16, (x, y) => MA.band[y < 9 ? 3 : 2], MA.amber);
    A.poly([[2.6, 10], [0, 11], [2.6, 12]], '#3a2410');                    // stinger
    A.shade(16.5, 9.6, 3.8, 3.8, MA.fuzz);                                 // thorax
    for (const [x, y] of [[15, 7], [17, 7], [18, 9], [15, 10]]) A.px(x, y, MA.fuzz[4], MA.fuzz);
    A.shade(21.5, 9.8, 3.4, 3.3, MA.beeHead);                              // head
    for (const [x0, y0, x1, y1] of [[15, 13, 14, 16], [17, 13, 17, 16.5], [19, 12.5, 20, 15.5]]) A.line(x0, y0, x1, y1, '#2a1a10');   // legs
    A.outline();
    A.ell(22.4, 9.4, 1.5, 2, angry ? '#8a1424' : '#141428'); A.px(22, 8, '#ffffff'); A.px(23, 10, angry ? '#ff5a6a' : '#3a3a66');   // the eye
    if (angry) A.line(20.5, 6.5, 23.5, 7.5, '#ff4d6d');
    A.line(24, 11.5, 25, 12, '#5a3a1a');                                   // mandibles
    A.line(21, 6.5, 22, 4, INK); A.line(22, 4, 24.5, 3, INK);              // elbowed antennae
    A.line(8, 6.5, 9, 6.5, MA.amber[4], MA.amber);                         // a sheen along its back
    return A.canvas();
  };
  M.bee = bee(false); M.beeAngry = bee(true);
  const wing = up => {
    const A = mArt(28, 18);
    if (up) { A.ell(15.5, 3.8, 2.4, 4.2, '#e4f4ff', null, -0.25); A.ell(12.8, 5, 1.9, 3.2, '#d2e8f8', null, -0.4); A.line(15.5, 1, 16, 7, '#9ab8d4'); }
    else { A.ell(10, 6.4, 5.2, 1.7, '#e4f4ff', null, 0.12); A.ell(8.5, 8, 4, 1.4, '#d2e8f8', null, 0.15); A.line(6, 6.5, 13, 6, '#9ab8d4'); }
    A.outline('#7f9fbd');
    return A.canvas();
  };
  M.beeWingUp = wing(true); M.beeWingDown = wing(false);

  // ── the grasshopper's body: a segmented leaf-green abdomen, a darker wing case, a saddle behind its head, a big eye
  //    (faces right; its legs are drawn live, they kick). Origin (11, 7): its middle ──
  const hopper = () => {
    const A = mArt(24, 13);
    A.shade(9, 7.4, 6.8, 3.3, MA.leaf);                                    // abdomen
    for (const x of [4, 6, 8, 10]) A.line(x, 8.5, x, 10, MA.leaf[1], MA.leaf);   // its segments, underneath
    A.poly([[3, 5.6], [13, 4.8], [14.5, 7], [4, 7.8]], MA.leafD[2]);       // the wing case along its back
    A.line(4, 6, 13, 5.2, MA.leafD[4], [MA.leafD[2]]);
    A.shade(15, 6.8, 2.8, 3.2, MA.leaf);                                   // the saddle
    A.shade(18.6, 6.2, 3.2, 3.6, MA.leafD);                                // head (a shade darker than the body)
    A.line(16, 3.5, 16, 9, MA.leafD[0]);                                   // the crease behind it
    A.ell(19, 10, 1.2, 0.9, MA.leafD[1]);                                  // jaw
    A.outline();
    A.ell(19.6, 5.6, 1.7, 2.1, '#5a3418'); A.ell(20, 6, 1, 1.3, '#2a1608'); A.px(19, 4, '#ffffff'); A.px(19, 5, '#e8c890');   // a big brown compound eye, glinting
    return A.canvas();
  };
  M.hopper = hopper();

  // ── the mole (MOLEBERT), facing right in three-quarters: a velvet pear of a body, softly lit, a cream bib, a long
  //    pink snout with a button nose and whiskers, round shades with a glint (pushed up on his head while he squints
  //    into the light, bursting out), two pink shovel paws; and the earth he digs: the travelling mound and the hole's lip ──
  const VELVET = ['#21161a', '#3a2a2a', '#58423a', '#7a604e', '#9c8068', '#c2a68a'];
  const SNOUT = ['#a8445e', '#cc6680', '#ec8ea4', '#ffb8c8', '#ffe2ea'];
  const BIB = ['#a8866a', '#c8a688', '#e2c6a6', '#f4e0c4', '#fff4e4'];
  const EARTH = ['#4a2412', '#6e3a1e', '#8e5430', '#b06c40', '#d08c58', '#e8ae7a'];
  const mole = squint => {
    const A = mArt(20, 18), cx = 9.6, cy = 10;
    // the body: a pear, wider at the hips, with a cool rim of sky light round its shadowed side
    A.fill(1, 1, 19, 18, (x, y) => {
      const rx = 6.3 + 1.3 * clamp((y - 3) / 11, 0, 1), dx = x - cx, dy = y - cy, u = dx / rx, v = dy / 8.2, d = u * u + v * v;
      if (d > 1) return null;
      const c = softTone(VELVET, -0.5 * u - 0.8 * v + (1 - d) * 0.7);
      const rim = d > 0.8 && u * 0.7 + v * 0.3 > 0.45 ? (d - 0.8) * 2.2 : 0;
      return rim ? lerpColor(c, '#8c8aa8', rim) : c;
    });
    for (const [x, y, r] of [[7.2, 2.4, -0.5], [8.6, 1.9, 0], [10, 2.2, 0.5]]) A.ell(x, y, 0.5, 1, VELVET[3], null, r);   // a tuft on top
    A.fill(1, 1, 19, 18, (x, y, ax, ay) => { const dx = (x - cx - 1.4) / 4.8, dy = (y - cy - 4.8) / 4.4, d = dx * dx + dy * dy; return d <= 1 && A.buf[ay * 20 * A.R + ax] ? softTone(BIB, -0.4 * dx - 0.8 * dy + (1 - d) * 0.6) : null; });   // his cream bib (on the body only)
    A.soft(14.8, 8.7, 3.3, 1.8, SNOUT, null, -0.12);                     // the snout, reaching out past his face
    A.soft(17.6, 8.3, 1.3, 1.2, ['#7a2038', '#a8344e', '#cc4e68', '#ee7890', '#ffb0c0']);   // and its button nose
    A.outline();
    A.ell(18.1, 8.6, 0.3, 0.25, '#4a1020'); A.ell(17.3, 7.7, 0.35, 0.25, '#ffe2ea');
    A.line(13.4, 10.6, 15.2, 10.3, '#4a2a2a', null, 0.4);               // the line of his mouth, a little grin
    A.fill(13.6, 10.6, 15.2, 12.2, (x, y) => y > 10.8 && y < 12 && x > 13.8 && x < 15 && Math.abs(x - 14.4) > 0.12 ? '#fbf6ee' : null);   // two buck teeth
    for (const [y0, y1] of [[9.4, 9.0], [10, 10.6]]) A.line(18.3, y0, 19.6, y1, '#2a1c20', null, 0.34);   // whiskers off the end of the snout
    A.ell(11.8, 9.6, 1.1, 0.55, '#c86a80');                              // a blush
    const shades = (x, y, k) => {                                        // round shades: a rim, a dusky lens, a glint
      for (const [lx, ly, rx, ry] of [[x, y, 2.3 * k, 1.9 * k], [x - 4.6 * k, y - 0.3, 1.8 * k, 1.7 * k]]) {
        A.ell(lx, ly, rx + 0.4, ry + 0.4, '#141220');
        A.fill(lx - rx, ly - ry, lx + rx, ly + ry, (px, py) => { const u = (px - lx) / rx, v = (py - ly) / ry; return u * u + v * v <= 1 ? lerpColor('#2c2a5e', '#6a5aa8', (v + 1) / 2) : null; });
        A.fill(lx - rx, ly - ry, lx + rx, ly + ry, (px, py) => { const u = (px - lx) / rx, v = (py - ly) / ry, w = u + v * 0.9; return u * u + v * v <= 0.8 && w > -0.75 && w < -0.25 ? '#e8f0ff' : null; });
      }
      A.line(x - 2.6 * k, y - 0.6, x - 2.2 * k, y - 0.6, '#141220', null, 0.5);   // the bridge
      A.line(x + 2.4 * k, y - 0.4, x + 3.4 * k, y - 0.9, '#141220', null, 0.5);   // an arm back to his ear
    };
    if (squint) {
      // screwed up against the light: two happy arcs, the shades pushed up on his head
      for (const [ex, ey, w] of [[12, 6.2, 1.4], [7.6, 5.9, 1.1]]) A.fill(ex - w - 0.4, ey - 1.2, ex + w + 0.4, ey + 0.6, (x, y) => { const v = Math.abs(y - (ey - 0.9 + ((x - ex) / w) ** 2 * 0.9)); return Math.abs(x - ex) <= w && v < 0.32 ? '#1a1220' : null; });
      shades(11.6, 2.6, 0.85);
    } else shades(11.8, 6, 1);
    return A.canvas();
  };
  M.mole = mole(false); M.moleSquint = mole(true);
  const claw = () => {   // a pink shovel of a paw, palm out, five pale claws fanned up
    const A = mArt(8, 8);
    for (const [x, r] of [[1.6, -0.5], [3.1, -0.17], [4.9, 0.17], [6.4, 0.5]]) {   // four long digging claws, tapering to a point
      const c = Math.cos(r), sn = Math.sin(r), b = [x, 3.6], tip = [x + sn * 3.4, 3.6 - c * 3.4];
      A.poly([[b[0] - c * 0.75, b[1] - sn * 0.75], tip, [b[0] + c * 0.75, b[1] + sn * 0.75]], '#e8dcc8');
      A.fill(x - 2, 0, x + 2, 4, (px, py) => (px - tip[0]) * c + (py - tip[1]) * sn < -0.15 && Math.hypot(px - tip[0], py - tip[1]) < 3 ? '#fff8ec' : null, ['#e8dcc8']);
    }
    A.soft(4, 5, 3.2, 2.7, SNOUT);
    A.outline();
    A.ell(4, 5.3, 1.3, 0.9, '#ee8ea4'); A.ell(3.5, 4.9, 0.4, 0.25, '#ffe2ea');          // the pad
    return A.canvas();
  };
  M.moleClaw = claw();
  // the earth: a mound of turned soil (small while he tunnels, big and heaving when he's about to burst out), the hole's lip
  const mound = (w, h, seed) => {
    const A = mArt(w + 2, h + 2), cx = (w + 2) / 2;
    A.soft(cx, h + 1.4, w / 2, h + 0.4, EARTH);
    const rnd = mulberry32(seed);
    for (let i = 0; i < w * 0.9; i++) { const x = 2 + rnd() * (w - 2), y = h + 1.4 - Math.sqrt(Math.max(0, 1 - ((x - cx) / (w / 2)) ** 2)) * (h + 0.2) + rnd() * 1.4, r = 0.55 + rnd() * 0.6; A.soft(x, y, r * 1.2, r, EARTH); }
    A.outline('#3a1c0e');
    return A.canvas();
  };
  M.moleMound = mound(12, 3, 7); M.moleMoundBig = mound(14, 5, 11);
  const lip = () => {   // in front of him as he stands in his hole: a lumpy rim of soil
    const A = mArt(24, 5);
    A.soft(12, 4.4, 10.6, 2.4, EARTH);
    const rnd = mulberry32(5);
    for (let i = 0; i < 9; i++) { const x = 3 + i * 2.25 + rnd() * 0.8, r = 0.7 + rnd() * 0.55; A.soft(x, 2.4 + rnd() * 0.6, r * 1.3, r, EARTH); }
    A.outline('#3a1c0e');
    return A.canvas();
  };
  M.moleLip = lip();

  // ── Hedgehog: a rounded chestnut coat of layered, banded quills over soft cream fur. ──
  const hog = step => {
    const A = mArt(30, 25), F = ['#74543c', '#ac8562', '#d4b38c', '#edd5b0', '#fff0d4'];
    const B = ['#30251f', '#4e392b', '#76553a', '#a38055', '#d2b483'];
    for (const [x, lift] of [[7, step ? 0.6 : 0], [11, step ? 0 : 0.5], [18, step ? 0 : 0.5], [22, step ? 0.5 : 0]]) {
      A.soft(x, 23 - lift, 1.7, 1.1, B);
      A.line(x - 0.5, 23 - lift, x + 0.5, 23 - lift, '#c4a07d', null, 0.3);
    }
    A.soft(12.6, 17.4, 10.3, 5.7, B);
    // The outer needles make a dense rounded silhouette; their warm tips catch the light.
    for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
      const u = i / 11, x = 3.4 + u * 15.4 + row * 0.35;
      const y = 16.8 - Math.sin(u * Math.PI) * 5.3 + row * 2.2;
      const lean = -2.8 + u * 2.5, len = 4.7 - row * 0.65 + Math.sin(i * 2.4) * 0.55;
      const tip = [x + lean, y - len], w = 1.25 - row * 0.12;
      A.poly([[x - w, y + 1], [x + w, y + 0.6], tip], B[0]);
      A.poly([[x - w * 0.5, y], [x + w * 0.65, y + 0.4], tip], row === 0 ? B[2] : B[1]);
      A.line(x + lean * 0.5, y - len * 0.52, tip[0], tip[1], '#d4bc8d', null, 0.45);
      A.line(x + lean * 0.85, y - len * 0.85, tip[0], tip[1], '#f6e5bc', null, 0.34);
    }
    A.soft(14.2, 21.2, 7.4, 1.6, F);                  // pale fur under the coat
    A.soft(22, 18.7, 4.5, 4.1, F);                    // forehead and cheek
    A.poly([[23, 17.7], [28.9, 20.2], [28.1, 21.7], [22.4, 22]], F[2]);
    A.soft(25.2, 20.4, 3.2, 1.4, F);
    A.soft(20.3, 16.3, 1.6, 1.9, B);                  // round ear nestled into the quills
    A.ell(20.6, 16.4, 0.8, 1.1, '#c39984');
    for (const [x, y] of [[21.4, 21.6], [22.1, 22], [23.2, 21.8], [24.5, 21.4]]) A.line(x, y, x + 0.65, y - 0.2, '#f7e5c8', null, 0.34);
    A.outline();
    A.ell(28.6, 20.2, 1, 0.85, '#171823'); A.ell(28.3, 19.9, 0.36, 0.24, '#86939b');
    A.ell(23.2, 18.4, 0.85, 1.05, '#171823'); A.ell(22.95, 18.05, 0.28, 0.3, '#fff9df');
    A.line(24.6, 21.3, 26.7, 21.1, '#79553f', null, 0.34);
    return A.canvas();
  };
  M.hogA = hog(0); M.hogB = hog(1);
  return M;
}
