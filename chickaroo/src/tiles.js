'use strict';
// ---- tiles ----------------------------------------------------------------
function rects(c, color, list) { c.fillStyle = color; for (const r of list) c.fillRect(r[0], r[1], r[2] || 1, r[3] || 1); }

// Puffy cloud edge: how many pixels each column is scalloped in by.
const CLOUD_EDGE = [3, 2, 1, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0, 1, 1, 2];
function paintGround(c, th, top, bottom, v = 0) {
  const [b, d, l] = th.ground;
  c.fillStyle = b; c.fillRect(0, 0, 16, 16);
  if (th.style === 'reef') {
    const rng = mulberry32(301 + v * 97 + (top ? 500 : 0));
    // 1. Clean beige reef stone base with subtle, sparse sandstone flecks (like 'dirt')
    rects(c, d, [[1, 6, 3, 2], [9, 2, 2, 2], [12, 9, 3, 2], [4, 12, 2, 2], [7, 8, 2, 1], [14, 14, 2, 1], [0, 1, 1, 2]].filter(() => rng() < 0.65));
    rects(c, l, [[2, 5, 2], [9, 1, 2], [12, 8, 2], [4, 11], [11, 13], [6, 3]].filter(() => rng() < 0.65));
    // 2. Sparse accents: only some tiles get a wisp of sea-moss or a single seashell, leaving plenty of open beige stone
    if (v === 1 || v === 5) {
      // A single delicate sea-moss wisp in a crevice
      let mx = 3 + ((v * 3) % 8), my = (top ? 7 : 3) + (v % 5);
      for (let k = 0; k < 4; k++) {
        c.fillStyle = k === 0 ? '#2f9a6a' : '#4cc28a';
        c.fillRect(mx, my, 1, 1);
        mx += k % 2 === 0 ? 1 : 0; my += 1;
      }
    }
    if (v === 2 || v === 6) {
      // One little scallop shell set in the stone: a ribbed fan over a small hinge
      const bx = 4 + ((v * 3) % 7), by = (top ? 8 : 4) + (v % 6);
      c.fillStyle = d; c.fillRect(bx, by + 3, 5, 1); c.fillRect(bx + 1, by + 4, 3, 1);   // its shadow in the rock
      c.fillStyle = '#f2b8a8'; c.fillRect(bx + 1, by, 3, 1); c.fillRect(bx, by + 1, 5, 2); c.fillRect(bx + 2, by + 3, 1, 1);
      c.fillStyle = '#c97a6a'; c.fillRect(bx + 1, by + 1, 1, 2); c.fillRect(bx + 3, by + 1, 1, 2);   // ribs
      c.fillStyle = '#fff0e8'; c.fillRect(bx + 1, by, 1, 1); c.fillRect(bx + 2, by + 1, 1, 1);      // shine
    }
    if (v === 4) {
      // A tiny embedded pink shell fleck
      c.fillStyle = '#e88a9a'; c.fillRect(9, top ? 10 : 6, 2, 1);
      c.fillStyle = '#ffe8f0'; c.fillRect(9, top ? 9 : 5, 1, 1);
    }
    if (top) {
      const [g, gd, gl] = th.top;
      c.fillStyle = g; c.fillRect(0, 0, 16, 5);
      rects(c, gd, [[0, 5, 16], [1, 6], [4, 6, 1, 2], [6, 6], [10, 6, 2, 1], [13, 6, 1, 2], [3, 3], [9, 2], [14, 3]]);
      rects(c, gl, [[0, 0, 16], [3, 1, 2], [8, 1, 2], [12, 1, 2]]);
      // Only every 4th top tile gets a small tuft of green sea-moss on the lip
      if (v === 1 || v === 5) {
        const mx = v === 1 ? 5 : 10;
        rects(c, '#2f9a6a', [[mx, 4, 3, 2], [mx + 1, 6, 1, 1]]);
        rects(c, '#4cc28a', [[mx + 1, 4, 1, 1]]);
      }
    }
    return;
  }
  if (th.style === 'flesh') {
    // stomach lining: soft folds running across, a wet sheen, the odd vein; slime glistening on top
    const rng = mulberry32(733 + v * 59);
    for (const [y, a] of [[3, 0], [8, 1.7], [13, 3.1]]) for (let x = 0; x < 16; x++) {
      const yy = y + Math.round(Math.sin(x * 0.45 + a + v) * 1.2);
      c.fillStyle = d; c.fillRect(x, yy, 1, 2);
      c.fillStyle = l; c.fillRect(x, yy - 1, 1, 1);
    }
    if (v === 1 || v === 4) { c.fillStyle = '#8a3ac0'; c.globalAlpha = 0.45; for (let k = 0; k < 6; k++) c.fillRect(2 + k * 2, 5 + ((k * 5 + v) % 4), 2, 1); c.globalAlpha = 1; }
    for (let i = 0; i < 4; i++) { c.fillStyle = '#ffd0d8'; c.globalAlpha = 0.5; c.fillRect(1 + Math.floor(rng() * 14), 1 + Math.floor(rng() * 14), 1, 1); }
    c.globalAlpha = 1;
    if (top) {
      const drip = [4, 4, 5, 7, 5, 4, 4, 4, 5, 4, 6, 8, 6, 4, 4, 5];
      for (let x = 0; x < 16; x++) {
        const e = drip[(x + v * 5) % 16];
        c.fillStyle = th.top[1]; c.fillRect(x, 0, 1, e + 1);
        c.fillStyle = th.top[0]; c.fillRect(x, 0, 1, e);
      }
      rects(c, th.top[2], [[0, 0, 16, 1], [3, 1, 3, 1], [10, 2, 2, 1]]);
      rects(c, '#ffffff', [[4, 1, 1, 1], [11, 2, 1, 1]]);
    }
    return;
  }
  if (th.style === 'cornbread') {
    // golden cornbread crumb: little dark pores (a few with a lit rim), now and then a kernel of corn;
    // on top, a thick baked crust, brown and blistered, with a wavy underside
    const rng = mulberry32(911 + v * 37 + (top ? 300 : 0));
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng() * 15), y = Math.floor(rng() * 14) + 2, w = rng() < 0.35 ? 2 : 1;
      c.fillStyle = d; c.fillRect(x, y, w, 1);
      if (i % 3 === 0) { c.fillStyle = l; c.fillRect(x, y + 1, w, 1); }
    }
    // kernels of corn baked in (one or two a tile), and now and then a fleck of green chili
    for (let k = 0; k < (v % 3 ? 1 : 0); k++) {
      const kx = 2 + ((v * 5 + k * 7) % 11), ky = (top ? 9 : 3) + ((v * 3 + k * 5) % (top ? 5 : 10));
      rects(c, '#a8761a', [[kx, ky + 1, 3, 1]]); rects(c, '#ffd23a', [[kx, ky - 1, 3, 2]]); rects(c, '#fff6b0', [[kx, ky - 1, 1, 1]]);
    }
    if (v % 4 === 2) rects(c, '#5a9a2a', [[(v * 7) % 13 + 1, top ? 13 : 9, 2, 1]]);
    if (top) {
      const [g, gd, gl] = th.top;
      for (let x = 0; x < 16; x++) {
        const e = 5 + Math.round(Math.sin(x * 0.9 + v) * 1);
        c.fillStyle = gd; c.fillRect(x, 0, 1, e + 1);
        c.fillStyle = g; c.fillRect(x, 0, 1, e);
      }
      rects(c, gl, [[0, 0, 16, 1], [2, 1, 3, 1], [9, 2, 2, 1], [13, 1, 2, 1]]);
      rects(c, gd, [[5, 2, 2, 1], [11, 3, 1, 1], [1, 3, 1, 1], [7, 4, 1, 1]]);
    }
    return;
  }
  if (th.style === 'cloud') {
    rects(c, d, [[3, 12, 4, 1], [11, 10, 3, 1], [12, 11, 2, 1], [7, 15, 3, 1], [1, 7, 1, 2]]);
    rects(c, l, [[2, 3, 4, 2], [9, 5, 3, 2], [5, 8, 2, 1], [12, 2, 2, 1]]);
    for (let x = 0; x < 16; x++) {
      if (top) { const e = CLOUD_EDGE[x]; c.clearRect(x, 0, 1, e); rects(c, th.top[2], [[x, e, 1, 2]]); }
      if (bottom) { const e = CLOUD_EDGE[(x + 7) % 16]; c.clearRect(x, 16 - e, 1, e); rects(c, d, [[x, 15 - e, 1, 1]]); }
    }
    return;
  }
  if (th.style === 'snow') {
    // frosty stone under a thick, lumpy snow cap
    rects(c, d, [[0, 10, 4, 3], [6, 3, 5, 2], [11, 9, 4, 3], [2, 5, 2, 2], [8, 13, 5, 2], [13, 1, 3, 2]]);
    rects(c, l, [[1, 1, 3, 1], [7, 8, 3, 1], [12, 6, 2, 1], [3, 12, 2, 1]]);
    if (top) {
      const drip = [1, 2, 3, 2, 1, 1, 2, 4, 2, 1, 1, 3, 2, 1, 2, 1];
      for (let x = 0; x < 16; x++) {
        c.fillStyle = th.top[1]; c.fillRect(x, 0, 1, 4 + drip[x] + 1);
        c.fillStyle = th.top[0]; c.fillRect(x, 0, 1, 4 + drip[x]);
      }
      rects(c, '#e6f2ff', [[2, 2, 3, 1], [9, 3, 4, 1]]);
    }
    return;
  }
  if (th.style === 'sand') {
    // layered sandstone: soft strata bands, a pebble, a tiny fossil shell
    rects(c, d, [[0, 4, 16, 1], [0, 11, 16, 1], [3, 5, 5, 1], [10, 12, 4, 1], [12, 7, 2, 2], [4, 14, 2, 1], [1, 8, 2, 1]]);
    rects(c, l, [[0, 3, 16, 1], [0, 10, 16, 1], [6, 7, 3, 1], [1, 13, 2, 1], [13, 1, 2, 1], [12, 6, 2, 1]]);
    rects(c, '#f6dca8', [[8, 14, 3, 1], [9, 13, 1, 1], [7, 15, 1, 1]]);
    if (top) {
      // a cap of loose sand: wavy lower edge and wind ripples
      const edge = [5, 5, 6, 6, 6, 5, 5, 4, 4, 5, 5, 6, 6, 5, 5, 5];
      for (let x = 0; x < 16; x++) {
        c.fillStyle = th.top[1]; c.fillRect(x, 0, 1, edge[x] + 1);
        c.fillStyle = th.top[0]; c.fillRect(x, 0, 1, edge[x]);
      }
      rects(c, th.top[2], [[0, 0, 16, 1], [2, 2, 4, 1], [9, 3, 4, 1], [13, 1, 2, 1]]);
      rects(c, th.top[1], [[4, 3, 3, 1], [11, 4, 2, 1], [0, 2, 1, 1]]);
    }
    return;
  }
  if (th.style === 'rock') {
    // irregular stone with the odd crystal fleck
    rects(c, d, [[0, 10, 4, 3], [6, 3, 5, 2], [11, 9, 4, 3], [2, 5, 2, 2], [8, 13, 5, 2], [13, 1, 3, 2], [5, 8, 1, 2]]);
    rects(c, l, [[1, 1, 3, 1], [7, 8, 3, 1], [12, 6, 2, 1], [3, 12, 2, 1], [9, 1, 1, 1]]);
    rects(c, '#5ef2ff', [[9, 11]]); rects(c, '#ff7ad9', [[4, 7]]);
  } else if (th.style === 'dirt') {
    rects(c, d, [[1, 6, 3, 2], [9, 2, 2, 2], [12, 9, 3, 2], [4, 12, 2, 2], [7, 8, 2, 1], [14, 14, 2, 1], [0, 1, 1, 2]]);
    rects(c, l, [[2, 5, 2], [9, 1, 2], [12, 8, 2], [4, 11], [11, 13], [6, 3]]);
  } else {
    rects(c, d, [[0, 7, 16], [0, 15, 16], [15, 0, 1, 7], [7, 8, 1, 7], [4, 3], [11, 11], [12, 4]]);
    rects(c, l, [[0, 0, 15], [0, 0, 1, 7], [0, 8, 7], [8, 8, 7], [8, 8, 1, 7]]);
  }
  if (!top) return;
  const [g, gd, gl] = th.top;
  if (th.style === 'dirt') {
    c.fillStyle = g; c.fillRect(0, 0, 16, 5);
    rects(c, gd, [[0, 5, 16], [1, 6], [4, 6, 1, 2], [6, 6], [10, 6, 2, 1], [13, 6, 1, 2], [3, 3], [9, 2], [14, 3]]);
    rects(c, gl, [[0, 0, 16], [3, 1, 2], [8, 1, 2], [12, 1, 2]]);
  } else {
    c.fillStyle = gd; c.fillRect(0, 0, 16, 3);
    c.fillStyle = g; c.fillRect(0, 0, 16, 2);
    rects(c, gd, [[2, 3, 1, 2], [6, 3], [9, 3, 1, 3], [13, 3, 1, 2]]);
    rects(c, gl, [[1, 0], [5, 0, 2], [11, 0], [14, 0]]);
  }
}
// Breakable blocks are wooden crates: a framed box of three planks with a diagonal brace.
// 4-1's solid blocks: plates of cast iron, black and seasoned, with a dull sheen and rivets
function paintIron(c, v) {
  c.fillStyle = '#121014'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#2e2a30'; c.fillRect(1, 1, 14, 14);
  rects(c, '#4a444e', [[1, 1, 14, 1], [1, 1, 1, 14]]);
  rects(c, '#1e1a20', [[1, 14, 14, 1], [14, 1, 1, 14]]);
  rects(c, '#5a5460', [[3, 3, 5, 1], [3, 4, 2, 1]]);   // the sheen
  if (v % 2) rects(c, '#3a2a24', [[9, 9, 3, 2], [10, 11, 1, 1]]);   // a speck of rust (it's well loved)
  for (const [x, y] of [[3, 12], [12, 3], [12, 12]]) { rects(c, '#121014', [[x, y + 1, 2, 1]]); rects(c, '#6a646e', [[x, y, 2, 1]]); }
}
// 4-1's crates: big stale croutons, toasted dark at the edges, pocked, a fleck or two of parsley
function paintCrouton(c, th) {
  const [b, d, l] = th.brick;
  c.fillStyle = '#4a2408'; c.fillRect(1, 0, 14, 16); c.fillRect(0, 1, 16, 14);
  c.fillStyle = d; c.fillRect(1, 1, 14, 14);
  c.fillStyle = b; c.fillRect(2, 2, 12, 11);
  rects(c, l, [[2, 2, 11, 1], [2, 2, 1, 10], [5, 5, 3, 1], [9, 8, 2, 1], [4, 10, 2, 1]]);
  rects(c, d, [[5, 6, 2, 1], [10, 4, 2, 1], [8, 9, 1, 1], [11, 11, 2, 1], [3, 8, 1, 1], [7, 12, 2, 1]]);
  rects(c, '#5ab048', [[11, 6, 1, 1], [4, 12, 1, 1]]); rects(c, '#2f7a2a', [[12, 6, 1, 1]]);
  rects(c, '#f8d8a0', [[13, 2, 1, 1], [2, 13, 1, 1]]);   // salt
}
function paintBrick(c, th) {
  if (th.brickStyle === 'crouton') { paintCrouton(c, th); return; }
  const [b, d, l] = th.brick;   // plank, frame/seams, grain highlight
  c.fillStyle = '#2e1a0c'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = d; c.fillRect(1, 1, 14, 14);
  rects(c, l, [[1, 1, 14, 1], [1, 1, 1, 14]]);
  c.fillStyle = b; c.fillRect(3, 3, 10, 10);
  rects(c, d, [[3, 6, 10, 1], [3, 9, 10, 1]]);                          // plank seams
  rects(c, l, [[4, 4, 3, 1], [10, 4, 2, 1], [6, 7, 3, 1], [4, 10, 2, 1], [9, 11, 3, 1]]);   // grain
  for (let i = 0; i < 9; i++) rects(c, d, [[3 + i, 11 - i, 2, 1]]);        // diagonal brace
  for (let i = 0; i < 8; i++) rects(c, l, [[4 + i, 11 - i, 1, 1]]);
  rects(c, '#f3e2bd', [[2, 2], [13, 2], [2, 13], [13, 13]]);              // nails
}
// Mystery blocks: a rounded amber block with a four-point sparkle that twinkles (frames 0-2).
const SPARK = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'];
function paintQuestion(c, f) {
  const edge = '#7a3f12';
  c.fillStyle = edge; c.fillRect(1, 0, 14, 16); c.fillRect(0, 1, 16, 14);
  c.fillStyle = ['#ffb347', '#ffc062', '#ffcf80'][f]; c.fillRect(1, 1, 14, 14);
  rects(c, '#ffe2a8', [[2, 1, 12, 1], [1, 2, 1, 12]]);
  rects(c, '#e08a2a', [[2, 14, 12, 1], [14, 2, 1, 12]]);
  const col = ['#fff6dc', '#ffffff', '#ffffff'][f];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (SPARK[y][x] === '#') {
    rects(c, '#c46a1a', [[5 + x, 5 + y]]);
    rects(c, col, [[4 + x, 4 + y]]);
  }
  if (f === 2) rects(c, '#ffffff', [[3, 3], [12, 11]]);
}
// Seed block: a green crate with a sprouting seed. Bump it and a beanstalk grows out of the top.
function paintSeed(c, f) {
  c.fillStyle = '#1f5a2a'; c.fillRect(1, 0, 14, 16); c.fillRect(0, 1, 16, 14);
  c.fillStyle = ['#5fd068', '#6fdc76', '#80e886'][f]; c.fillRect(1, 1, 14, 14);
  rects(c, '#b6f59a', [[2, 1, 12, 1], [1, 2, 1, 12]]);
  rects(c, '#2f9a49', [[2, 14, 12, 1], [14, 2, 1, 12]]);
  // seed with a two-leaf sprout
  rects(c, '#5a341a', [[6, 9, 4, 4], [5, 10, 6, 2]]);
  rects(c, '#c4914f', [[6, 10, 2, 1]]);
  rects(c, '#1f5a2a', [[7, 5 - (f >> 1), 1, 4 + (f >> 1)]]);
  rects(c, '#fff6dc', [[4, 4 - (f >> 1), 3, 2], [9, 3 - (f >> 1), 3, 2]]);
  rects(c, '#2f9a49', [[4, 5 - (f >> 1), 3, 1], [9, 4 - (f >> 1), 3, 1]]);
}
// Beanstalk leaf: a two-tile semi-solid ledge, base (next to the stalk) and tip, pointing away
function paintLeaf(c, right, tip) {
  const L = (x, y, w, col) => { c.fillStyle = col; c.fillRect(right ? x : 16 - x - w, y, w, 1); };
  if (!tip) {
    L(0, 0, 16, '#1f5a2a'); L(0, 1, 16, '#1f5a2a'); L(0, 2, 16, '#1f5a2a'); L(0, 3, 16, '#1f5a2a'); L(0, 4, 16, '#1f5a2a'); L(2, 5, 14, '#1f5a2a');
    L(0, 1, 16, '#7be08a'); L(0, 2, 16, '#5fd068'); L(0, 3, 16, '#3fae4a'); L(3, 4, 13, '#2f9a49');
    L(1, 1, 9, '#b6f59a'); L(0, 2, 16, '#2f9a49'); L(0, 2, 1, '#1f5a2a');
  } else {
    L(0, 0, 13, '#1f5a2a'); L(0, 1, 15, '#1f5a2a'); L(0, 2, 16, '#1f5a2a'); L(0, 3, 14, '#1f5a2a'); L(0, 4, 10, '#1f5a2a'); L(0, 5, 5, '#1f5a2a');
    L(0, 1, 12, '#7be08a'); L(0, 2, 14, '#2f9a49'); L(0, 3, 12, '#3fae4a'); L(0, 4, 6, '#2f9a49');
    L(2, 1, 6, '#b6f59a');
  }
}
function paintUsed(c) {
  c.fillStyle = '#4a2e1c'; c.fillRect(1, 0, 14, 16); c.fillRect(0, 1, 16, 14);
  c.fillStyle = '#a67c52'; c.fillRect(1, 1, 14, 14);
  rects(c, '#7a5535', [[2, 14, 12, 1], [14, 2, 1, 12]]);
  rects(c, '#c9a073', [[2, 1, 12, 1], [1, 2, 1, 12]]);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (SPARK[y][x] === '#') rects(c, '#8f6743', [[4 + x, 4 + y]]);
}
// Meadow solid block: a hay bale. Golden straw packed in streaky layers, bound by two twine bands,
// a few loose stalks poking out, darker where the bale is pressed underneath.
function paintHay(c) {
  const rng = mulberry32(77);
  c.fillStyle = '#6a4210'; c.fillRect(0, 0, 16, 16);                                   // outline
  for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) {
    const r = rng();
    let col = y < 3 ? '#ffe08a' : y > 12 ? '#c8902a' : r < 0.18 ? '#f0b840' : r < 0.32 ? '#ffd860' : '#e8a830';
    if (((x * 3 + y * 7) % 11 === 0) && y > 2) col = '#b87a1a';                           // short straw streaks
    c.fillStyle = col; c.fillRect(x, y, 1, 1);
  }
  for (let x = 1; x < 15; x++) if (rng() < 0.5) { c.fillStyle = '#fff0b0'; c.fillRect(x, 1 + (x % 2), 1, 1); }   // sunlit top
  // two twine bands
  for (const bx of [4, 11]) { c.fillStyle = '#8a3a1a'; c.fillRect(bx, 1, 1, 14); c.fillStyle = '#c86a3a'; c.fillRect(bx - 1, 1, 1, 14); }
  c.fillStyle = '#6a2a10'; c.fillRect(3, 7, 2, 1); c.fillRect(10, 7, 2, 1);           // knots
  // loose stalks sticking out of the edges
  c.fillStyle = '#ffd860'; c.fillRect(0, 4, 1, 1); c.fillRect(15, 9, 1, 1); c.fillRect(7, 0, 1, 1); c.fillRect(13, 15, 1, 1);
}
function paintSolid(c, th, v = 0) {
  const [b, d, l] = th.block;
  if (th.solid === 'hay') { paintHay(c); return; }
  if (th.solid === 'gristle') { paintGristle(c, th, v); return; }
  if (th.solid === 'sandbag') { paintSandbags(c); return; }
  if (th.solid === 'iron') { paintIron(c, v); return; }
  if (th.style === 'sand') {
    // a carved sandstone block with a watchful eye glyph cut into it
    c.fillStyle = '#5a3418'; c.fillRect(0, 0, 16, 16);
    c.fillStyle = d; c.fillRect(1, 1, 14, 14);
    c.fillStyle = b; c.fillRect(1, 1, 13, 13);
    rects(c, l, [[1, 1, 13, 1], [1, 1, 1, 13]]);
    rects(c, d, [[5, 5, 6, 1], [4, 6, 1, 3], [11, 6, 1, 3], [5, 9, 6, 1], [7, 6, 2, 3], [3, 11, 10, 1]]);
    rects(c, l, [[5, 10, 6, 1], [12, 6, 1, 3], [9, 6, 1, 3], [3, 12, 10, 1]]);
    return;
  }
  paintStone(c, th, v);
}
// The bayou levee: two courses of burlap sandbags per tile, the lower one staggered half a bag over
function paintSandbags(c) {
  c.fillStyle = '#3a2818'; c.fillRect(0, 0, 16, 16);
  for (const [y, off] of [[0, 0], [8, 8]]) for (const x0 of [off - 16, off]) {
    const x = x0 + 1;
    c.fillStyle = '#7a5a3a'; c.fillRect(x, y + 1, 14, 6); c.fillRect(x + 1, y, 12, 8);
    c.fillStyle = '#9a7e58'; c.fillRect(x + 1, y + 1, 12, 5); c.fillRect(x, y + 2, 14, 3);
    c.fillStyle = '#b89c70'; c.fillRect(x + 2, y + 1, 9, 1);
    c.fillStyle = '#7a6040'; for (let i = 2; i < 13; i += 2) c.fillRect(x + i, y + 4, 1, 1);   // burlap weave
    c.fillStyle = '#5a4026'; c.fillRect(x + 12, y + 2, 1, 4);                               // the tied end
  }
}
// A hewn stone block: worn, rounded corners and chipped edges, a pitted grainy face, uneven light
// along the top-left and shadow along the bottom-right, and the odd hairline crack. Seeded per
// variant, so neighbouring blocks don't look stamped from one mould.
function paintStone(c, th, v) {
  const [b, d, l] = th.block, rng = mulberry32(hashStr(th.block.join() + v)), o = '#1a1428';
  const W = 16, inside = [];
  // the outline: a square with each corner rounded off and a few random bites out of the edges
  for (let y = 0; y < W; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const cx = Math.min(x, W - 1 - x), cy = Math.min(y, W - 1 - y);
      row.push(!(cx + cy < 2 || (cx === 0 && cy < 3 && rng() < 0.5)));
    }
    inside.push(row);
  }
  for (let i = 0; i < 3; i++) {   // chips knocked out of the edges
    const side = Math.floor(rng() * 4), at = 3 + Math.floor(rng() * 10), len = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < len; k++) {
      const [x, y] = side === 0 ? [at + k, 0] : side === 1 ? [at + k, W - 1] : side === 2 ? [0, at + k] : [W - 1, at + k];
      if (x < W && y < W) inside[y][x] = false;
    }
  }
  const isIn = (x, y) => x >= 0 && y >= 0 && x < W && y < W && inside[y][x];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (!inside[y][x]) continue;
    const edge = !isIn(x - 1, y) || !isIn(x + 1, y) || !isIn(x, y - 1) || !isIn(x, y + 1);
    if (edge) { c.fillStyle = o; c.fillRect(x, y, 1, 1); continue; }
    // light from the top-left: bevel bands, then grainy noise over the face
    const lit = !isIn(x - 2, y) || !isIn(x, y - 2), shade = !isIn(x + 2, y) || !isIn(x, y + 2);
    const n = rng();
    let col = b;
    if (lit) col = n < 0.75 ? l : b;
    else if (shade) col = n < 0.8 ? d : b;
    else if (n < 0.12) col = d;
    else if (n < 0.2) col = l;
    c.fillStyle = col; c.fillRect(x, y, 1, 1);
  }
  // a couple of pits (dark with a lit lip below-right)
  for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
    const x = 4 + Math.floor(rng() * 8), y = 4 + Math.floor(rng() * 8);
    c.fillStyle = d; c.fillRect(x, y, 2, 1); c.fillRect(x, y + 1, 1, 1);
    c.fillStyle = l; c.fillRect(x + 1, y + 1, 1, 1);
  }
  // a hairline crack wandering in from one edge
  if (rng() < 0.7) {
    let x = rng() < 0.5 ? 2 : 13, y = 3 + Math.floor(rng() * 6);
    const dx = x < 8 ? 1 : -1;
    for (let k = 0; k < 6; k++) {
      c.fillStyle = o; c.fillRect(x, y, 1, 1);
      x += dx; if (rng() < 0.5) y += rng() < 0.5 ? 1 : -1;
      if (!isIn(x, y)) break;
    }
  }
}
// Hollow logs (stand-ins for tubes): cut-wood rim with rings and a dark hollow on top, grooved
// bark below, a tuft of moss on the rim.
const LOG = { o: '#2a160a', bark: '#8a5530', barkD: '#5a341a', barkL: '#b57a44', cut: '#f0c98a', ring: '#c4914f', hole: '#3a200c', moss: '#5fd068', mossD: '#2f9a49' };
// Desert stand-in: a fluted sandstone column with a broad capital.
const COLUMN = { o: '#5a2e10', b: '#f0c27a', l: '#ffe2a8', d: '#c98f4a', s: '#b9773a' };
function paintColumn(c, part) {
  const K = COLUMN;
  if (part === 'TL' || part === 'TR') {
    const left = part === 'TL';
    c.fillStyle = K.o; c.fillRect(0, 0, 16, 7);
    c.fillStyle = K.b; c.fillRect(left ? 1 : 0, 1, 15, 5);
    c.fillStyle = K.l; c.fillRect(left ? 1 : 0, 1, 15, 1);
    c.fillStyle = K.s; c.fillRect(left ? 1 : 0, 4, 15, 2);
    rects(c, K.d, left ? [[4, 2, 3, 1], [10, 3, 4, 1]] : [[2, 3, 4, 1], [9, 2, 3, 1]]);
  }
  const y0 = part === 'TL' || part === 'TR' ? 7 : 0;
  if (part === 'TL' || part === 'L') {
    rects(c, K.o, [[2, y0, 1, 16 - y0]]); rects(c, K.b, [[3, y0, 13, 16 - y0]]);
    rects(c, K.l, [[4, y0, 2, 16 - y0]]); rects(c, K.d, [[8, y0, 1, 16 - y0], [13, y0, 1, 16 - y0]]);
  } else {
    rects(c, K.b, [[0, y0, 13, 16 - y0]]);
    rects(c, K.d, [[3, y0, 1, 16 - y0], [8, y0, 1, 16 - y0]]); rects(c, K.s, [[10, y0, 3, 16 - y0]]);
    rects(c, K.o, [[13, y0, 1, 16 - y0]]);
  }
}
// Quicksand: churning sand with a slow rippling surface and drifting swirls (frames 0-3).
// In a theme with `roux` (4-1) it's a glossy dark roux instead, a bubble swelling on its surface.
function paintQuicksand(c, f, top, th) {
  const roux = th && th.roux;
  const base = roux ? '#7a3a14' : '#b9783e', dark = roux ? '#4e220a' : '#8a5226', lite = roux ? '#b8662a' : '#e0a862';
  for (let x = 0; x < 16; x++) {
    const s = top ? 3 + Math.round(Math.sin((x + f * 4) / 16 * Math.PI * 2) * 1.2) : 0;
    c.fillStyle = base; c.fillRect(x, s, 1, 16 - s);
    if (top) { c.fillStyle = roux ? '#3a1806' : '#6a3a18'; c.fillRect(x, s - 1, 1, 1); c.fillStyle = roux ? '#e09048' : lite; c.fillRect(x, s, 1, 1); c.fillStyle = roux ? '#9a4c1c' : '#a0662e'; c.fillRect(x, s + 2, 1, 1); }
  }
  if (roux && top) {   // a bubble rising through, swelling, then gone (frame 3)
    const r = [1, 2, 2, 0][f], bx = 10;
    if (r) { rects(c, dark, [[bx - r, 4 - r, r * 2 + 1, 1], [bx - r - 1, 5 - r, 1, r], [bx + r + 1, 5 - r, 1, r]]); rects(c, '#f0b070', [[bx - r + 1, 5 - r, 1, 1]]); }
  }
  const o = f * 4;
  rects(c, dark, [[(2 + o) % 13, top ? 8 : 3, 3, 1], [(4 + o) % 13 + 1, top ? 9 : 4, 1, 1], [(9 + o) % 13, 12, 3, 1], [(8 + o) % 13, 11, 1, 1]]);
  rects(c, lite, [[(6 + o) % 14, top ? 6 : 8, 2, 1], [(12 + o) % 14, 14, 1, 1]]);
  // slow spiral eddies
  rects(c, dark, [[(5 + o) % 12 + 1, top ? 11 : 9, 4, 1], [(5 + o) % 12 + 1, top ? 12 : 10, 1, 1], [(5 + o) % 12 + 4, top ? 10 : 8, 1, 1]]);
}
// Ocean stand-in: a coral tube -- ribbed pink-orange stone, dotted with polyps, with a flared,
// knobbly lip around a dark opening (the same rows 2-4 as the log's hole, so eels and warps fit).
const CORAL = { o: '#4a1420', b: '#f07a6a', l: '#ffb8a0', d: '#b8484a', rim: '#ff9a84', hole: '#2a0a14', polyp: '#fff0d8' };
function paintCoralTube(c, part) {
  const K = CORAL;
  if (part === 'TL' || part === 'TR') {
    const left = part === 'TL';
    c.fillStyle = K.o; c.fillRect(0, 0, 16, 16);
    c.fillStyle = K.rim; c.fillRect(left ? 1 : 0, 1, 15, 5);
    c.fillStyle = K.hole; c.fillRect(left ? 5 : 0, 2, 11, 3);
    c.fillStyle = K.d; c.fillRect(left ? 4 : 0, 4, 12, 1);                          // inner shadow of the lip
    rects(c, K.l, left ? [[2, 1, 2, 1], [1, 2, 2, 2], [6, 1, 3, 1]] : [[9, 1, 3, 1], [13, 2, 2, 1]]);
    rects(c, K.o, left ? [[1, 0, 2, 1], [8, 0, 1, 1]] : [[5, 0, 1, 1], [12, 0, 2, 1]]); // knobbly edge
    c.fillStyle = K.b; c.fillRect(left ? 2 : 0, 6, 14, 9);
    rects(c, K.l, left ? [[3, 6, 2, 9]] : []);
    rects(c, K.d, left ? [[2, 9, 14, 1], [2, 13, 14, 1]] : [[0, 9, 13, 1], [0, 13, 13, 1], [10, 6, 3, 9]]);
    rects(c, K.polyp, left ? [[7, 7, 1, 1], [11, 11, 1, 1], [5, 11, 1, 1]] : [[3, 7, 1, 1], [6, 11, 1, 1], [1, 10, 1, 1]]);
  } else {
    const left = part === 'L';
    c.fillStyle = K.o; c.fillRect(left ? 2 : 13, 0, 1, 16);
    c.fillStyle = K.b; c.fillRect(left ? 3 : 0, 0, 13, 16);
    if (left) rects(c, K.l, [[4, 0, 2, 16]]); else rects(c, K.d, [[9, 0, 4, 16]]);
    // growth rings, slightly wavy, and scattered polyps
    rects(c, K.d, left ? [[3, 3, 13, 1], [3, 10, 13, 1], [6, 4, 4, 1]] : [[0, 3, 13, 1], [0, 10, 13, 1], [4, 11, 3, 1]]);
    rects(c, K.polyp, left ? [[8, 6, 1, 1], [12, 13, 1, 1], [6, 14, 1, 1]] : [[2, 6, 1, 1], [5, 14, 1, 1], [7, 7, 1, 1]]);
  }
}
function paintPipe(c, part, th) {
  if (th && th.style === 'sand') { paintColumn(c, part); return; }
  if (th && th.pipe === 'coral') { paintCoralTube(c, part); return; }
  const L = LOG;
  if (part === 'TL' || part === 'TR') {
    const left = part === 'TL';
    c.fillStyle = L.o; c.fillRect(0, 0, 16, 16);
    c.fillStyle = L.cut; c.fillRect(left ? 1 : 0, 1, 15, 5);
    c.fillStyle = L.hole; c.fillRect(left ? 6 : 0, 2, 10, 3);
    rects(c, L.ring, left ? [[3, 2, 1, 3], [1, 5, 15, 1]] : [[12, 2, 1, 3], [0, 5, 15, 1]]);
    c.fillStyle = L.bark; c.fillRect(left ? 1 : 0, 6, 15, 9);
    rects(c, L.barkD, left ? [[5, 7, 1, 8], [10, 6, 1, 6], [13, 9, 1, 6]] : [[2, 6, 1, 7], [7, 8, 1, 7], [12, 6, 1, 9]]);
    rects(c, L.barkL, left ? [[2, 6, 2, 9], [7, 9, 1, 4]] : [[4, 7, 1, 5]]);
    rects(c, L.mossD, left ? [[1, 0, 5, 1], [2, 1, 2, 1]] : [[9, 0, 5, 1], [11, 1, 2, 1]]);
    rects(c, L.moss, left ? [[2, 0, 3, 1]] : [[10, 0, 3, 1]]);
  } else if (part === 'L') {
    rects(c, L.o, [[2, 0, 1, 16]]); rects(c, L.bark, [[3, 0, 13, 16]]);
    rects(c, L.barkL, [[4, 0, 2, 16]]);
    rects(c, L.barkD, [[8, 0, 1, 9], [8, 12, 1, 4], [12, 3, 1, 13], [15, 0, 1, 6]]);
  } else {
    rects(c, L.bark, [[0, 0, 13, 16]]);
    rects(c, L.barkD, [[3, 0, 1, 11], [7, 4, 1, 12], [11, 0, 2, 16]]);
    rects(c, L.o, [[13, 0, 1, 16]]);
  }
}
// Semi-solid ledge: a plank walkway. Each tile is one weathered board -- lit top edge, wood grain,
// a nail at each end, a seam where it meets the next -- with just a soft shadow under it (no braces).
// 3-4: a block of gristle, pale and knobbly, with a pink sheen and a dark rim
function paintGristle(c, th, v) {
  const [b, d, l] = th.block, rng = mulberry32(41 + v * 17);
  c.fillStyle = '#5a1828'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = d; c.fillRect(1, 1, 14, 14);
  c.fillStyle = b; c.fillRect(1, 1, 13, 13);
  rects(c, l, [[2, 1, 11, 1], [1, 2, 1, 11]]);
  for (let i = 0; i < 5; i++) { const x = 2 + Math.floor(rng() * 10), y = 2 + Math.floor(rng() * 10); rects(c, l, [[x, y, 2, 1]]); rects(c, d, [[x, y + 1, 2, 1]]); }   // knobbles
  c.fillStyle = '#ff9aaa'; c.globalAlpha = 0.35; c.fillRect(2, 9, 11, 3); c.globalAlpha = 1;
  rects(c, '#5a1828', [[0, 0, 1, 1], [15, 0, 1, 1], [0, 15, 1, 1], [15, 15, 1, 1]]);
}
// a rib of bone to stand on: a rounded ivory bar, lit along the top, with a knuckle of a joint in each tile
function paintBone(c, th) {
  const [b, d, l] = th.semi;
  c.fillStyle = '#4a1424'; c.globalAlpha = 0.4; c.fillRect(0, 7, 16, 1); c.globalAlpha = 1;   // its shadow on the lining
  c.fillStyle = '#5a3a30'; c.fillRect(0, 0, 16, 7);
  c.fillStyle = d; c.fillRect(0, 1, 16, 5);
  c.fillStyle = b; c.fillRect(0, 1, 16, 3);
  c.fillStyle = l; c.fillRect(0, 1, 16, 1);
  rects(c, '#5a3a30', [[6, 0, 4, 1], [6, 6, 4, 1]]);                 // the joint swells out top and bottom
  rects(c, b, [[6, 0, 4, 1]]); rects(c, l, [[7, 0, 2, 1]]); rects(c, d, [[6, 6, 4, 1]]);
  rects(c, d, [[3, 3, 2, 1], [12, 2, 1, 1]]);                        // pits in the bone
}
function paintSemi(c, th) {
  if (th.semiStyle === 'bone') { paintBone(c, th); return; }
  const [b, d, l] = th.semi;
  const rng = mulberry32(hashStr(th.accent || 'semi'));
  c.fillStyle = d; c.globalAlpha = 0.35; c.fillRect(0, 6, 16, 1); c.globalAlpha = 1;   // the shadow under the plank
  // the board
  c.fillStyle = d; c.fillRect(0, 0, 16, 6);
  c.fillStyle = b; c.fillRect(0, 1, 15, 4);
  c.fillStyle = l; c.fillRect(0, 1, 15, 1);                                   // sunlit top edge
  for (let y = 2; y <= 4; y++) for (let x = 0; x < 15; x++) {                 // grain: long streaks, a knot
    const r = rng();
    if ((x + y * 5) % 7 === 0 && r < 0.8) { c.fillStyle = d; c.globalAlpha = 0.45; c.fillRect(x, y, 2, 1); c.globalAlpha = 1; }
  }
  c.fillStyle = d; c.fillRect(8, 3, 2, 1); c.fillRect(9, 2, 1, 1);
  c.fillStyle = d; c.fillRect(15, 0, 1, 6);                                   // seam to the next board
  // nail heads
  c.fillStyle = d; c.fillRect(2, 2, 1, 1); c.fillRect(12, 2, 1, 1);
  c.fillStyle = '#e8e8f0'; c.fillRect(2, 2, 1, 1); c.globalAlpha = 0.6; c.fillRect(12, 2, 1, 1); c.globalAlpha = 1;
  c.fillStyle = d; c.fillRect(2, 3, 1, 1); c.fillRect(12, 3, 1, 1);
}
// molten lava -- or, in a theme with `acid` (3-4), glowing green stomach acid (body, crest, depths, bubbles)
const ACID_COL = ['#46d890', '#eaffc0', '#167a66', '#ffffff'], LAVA_COL = ['#ff6a1f', '#ffd27a', '#d8361a', '#ffe9a0'];
function paintLava(c, f, th) {
  const [b, crest, deep, bub] = th && th.acid ? ACID_COL : LAVA_COL;
  if (th && th.acid) {   // acid: a flat, glassy surface with slow ripples rather than lava's churning crest
    c.fillStyle = b; c.fillRect(0, 4, 16, 12);
    c.fillStyle = deep; c.fillRect(0, 11, 16, 5);
    c.fillStyle = crest; c.fillRect(0, 4, 16, 1);
    c.fillStyle = '#8af0b8'; for (let x = 0; x < 16; x++) if ((x + f * 3) % 8 < 3) c.fillRect(x, 5, 1, 1);
    c.fillStyle = '#7ae8a8'; c.fillRect((f * 4 + 2) % 12, 7, 4, 1); c.fillRect((f * 4 + 9) % 12, 9, 3, 1);   // ripples
    rects(c, bub, [[(f * 5) % 14 + 1, 8], [(f * 9 + 6) % 14 + 1, 13]]);
    return;
  }
  for (let x = 0; x < 16; x++) {
    const s = 4 + Math.round(Math.sin((x + f * 4) / 16 * Math.PI * 2) * 1.5);
    rects(c, b, [[x, s, 1, 16 - s]]);
    rects(c, crest, [[x, s]]);
    rects(c, deep, [[x, 11, 1, 5]]);
  }
  rects(c, bub, [[(f * 5) % 14 + 1, 8], [(f * 9 + 6) % 14 + 1, 12]]);
}
function paintCrumble(c, th) {
  if (th && th.crumbleStyle === 'cracker') {   // 4-1: a saltine cracker, docked with holes and salted
    c.fillStyle = '#a07838'; c.fillRect(0, 0, 16, 16);
    c.fillStyle = '#f0d49a'; c.fillRect(1, 1, 14, 14);
    rects(c, '#fff0c8', [[1, 1, 14, 1], [1, 1, 1, 14]]);
    rects(c, '#d8b070', [[1, 14, 14, 1], [14, 1, 1, 14]]);
    for (const [x, y] of [[4, 4], [8, 4], [12, 4], [4, 8], [8, 8], [12, 8], [4, 12], [8, 12], [12, 12]]) rects(c, '#b8904a', [[x - 1, y - 1, 1, 1]]);
    rects(c, '#ffffff', [[6, 3], [10, 6], [3, 10], [11, 11]]);
    return;
  }
  c.fillStyle = '#9aa8cc'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#e6ecfb'; c.fillRect(1, 1, 14, 14);
  rects(c, '#ffffff', [[1, 1, 14, 1], [1, 1, 1, 14]]);
  rects(c, '#c3cde8', [[1, 14, 14, 1], [14, 1, 1, 14]]);
  // cracks
  rects(c, '#9aa8cc', [[4, 1, 1, 3], [5, 4, 1, 2], [4, 6, 1, 2], [11, 8, 1, 3], [10, 11, 1, 2], [12, 10, 2, 1], [7, 9, 2, 1]]);
}
function paintIce(c) {
  c.fillStyle = '#3f78b8'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#8fd0ff'; c.fillRect(1, 1, 14, 14);
  rects(c, '#b8e4ff', [[1, 1, 14, 3], [1, 1, 2, 14]]);
  rects(c, '#ffffff', [[1, 1, 14, 1], [3, 6, 1, 1], [4, 5, 1, 1], [5, 4, 1, 1], [9, 10, 1, 1], [10, 9, 1, 1], [11, 8, 1, 1]]);
  rects(c, '#5fa8e0', [[2, 14, 13, 1], [14, 2, 1, 13], [7, 11, 2, 1], [12, 5, 1, 2]]);
}
// Clock blocks: TICK (rose) and TOCK (teal). Solid ones are chunky blocks with a little clock face;
// switched-off ones are just a dashed outline so you can still read where they'll be.
const CLOCK_COL = { tick: ['#ff5d8f', '#a8264f', '#ffc0d4'], tock: ['#3fc8f0', '#16608a', '#bff0ff'] };
function paintClockBlock(c, kind, on) {
  const [b, d, l] = CLOCK_COL[kind];
  if (on) {
    c.fillStyle = INK; c.fillRect(0, 0, 16, 16);
    c.fillStyle = d; c.fillRect(1, 1, 14, 14);
    c.fillStyle = b; c.fillRect(1, 1, 13, 13);
    rects(c, l, [[1, 1, 13, 1], [1, 1, 1, 13]]);
    // clock face
    rects(c, '#fff6e0', [[5, 4, 6, 8], [4, 5, 8, 6]]);
    rects(c, d, [[5, 3, 6, 1], [5, 12, 6, 1], [3, 5, 1, 6], [12, 5, 1, 6], [4, 4], [11, 4], [4, 11], [11, 11]]);
    rects(c, INK, kind === 'tick' ? [[7, 5, 2, 3], [7, 7, 3, 2]] : [[7, 7, 2, 4], [5, 7, 3, 2]]);
  } else {
    c.fillStyle = b;
    for (let i = 0; i < 16; i += 4) { c.fillRect(i, 0, 2, 1); c.fillRect(i + 2, 15, 2, 1); c.fillRect(0, i + 2, 1, 2); c.fillRect(15, i, 1, 2); }
    c.globalAlpha = 0.18; c.fillRect(1, 1, 14, 14); c.globalAlpha = 1;
    rects(c, b, [[7, 7, 2, 2]]);
  }
}
// Hot coals: a bed of charcoal lumps with glowing seams that pulse (frame f of 4), embers on top.
function paintCoal(c, f) {
  c.fillStyle = '#2a1a22'; c.fillRect(0, 0, 16, 16);
  const glow = ['#a3361a', '#d8501a', '#ff7a2a', '#d8501a'][f], hot = ['#ff7a2a', '#ffb347', '#ffe08a', '#ffb347'][f];
  // lumps: dark rounded rocks with a lit rim
  for (const [x, y, w, h] of [[0, 2, 6, 5], [6, 1, 5, 5], [11, 2, 5, 6], [2, 8, 6, 5], [8, 7, 6, 6], [0, 13, 4, 3], [12, 12, 4, 4], [5, 13, 6, 3]]) {
    rects(c, '#3a2a34', [[x, y, w, h]]);
    rects(c, '#54404c', [[x + 1, y, w - 2, 1]]);
  }
  // the glowing seams between the lumps
  rects(c, glow, [[0, 7, 6, 1], [6, 6, 5, 1], [11, 8, 5, 1], [8, 13, 4, 1], [6, 2, 1, 4], [11, 3, 1, 4], [7, 8, 1, 5], [2, 13, 3, 1], [4, 13, 1, 3]]);
  rects(c, hot, [[2, 7, 2, 1], [8, 6, 1, 1], [13, 8, 1, 1], [7, 10, 1, 1], [9, 13, 1, 1]]);
  // a crust of embers on the top edge
  rects(c, glow, [[0, 0, 16, 1], [1, 1, 3, 1], [9, 1, 2, 1]]);
  rects(c, hot, [[(f * 5) % 14 + 1, 0, 2, 1], [(f * 9 + 7) % 14 + 1, 0, 1, 1]]);
}
function paintLavaDeep(c, th) {
  const [b, , deep] = th && th.acid ? ACID_COL : LAVA_COL;
  c.fillStyle = deep; c.fillRect(0, 0, 16, 16);
  rects(c, b, [[2, 3, 3, 1], [10, 9, 3, 1]]);
}
// Pollen puffs (the collectible): a soft glowing fluff ball with fine fibres that slowly turn.
// Each world tints them: golden pollen, cave spores, sky fluff, sea spores, citadel embers.
const POLLEN_COL = { meadow: '#ffd166', cave: '#7ff0e2', sky: '#fff0a0', ocean: '#bffaff', citadel: '#ffb347', clock: '#ffe08a', eclipse: '#d8c8ff', desert: '#ff9ad0', jungle: '#c8ff7a', bayou: '#e8ff7a', gut: '#ffe0a0', gumbo: '#ffb84a' };
// a puff of pollen: a soft glow, grains drifting round it, a shiny bead in the middle. Baked in fine pixels (hires.js) at
// 8 turns of its grains (they repeat every eighth of a turn), per colour and size
const POLLEN_ART = new Map();
function pollenArt(col, k, step) {
  const key = col + k + '|' + step;
  let img = POLLEN_ART.get(key);
  if (img) return img;
  const S = 18, c = makeHiCanvas(S, S), g = c.getContext('2d'), x = S / 2, y = S / 2;
  const rim = lerpColor(col, '#000000', 0.25), light = lerpColor(col, '#ffffff', 0.45);
  g.globalAlpha = 0.18; fBlob(g, x, y, 7 * k, col);
  g.globalAlpha = 0.32; fBlob(g, x, y, 5 * k, col);
  g.globalAlpha = 1;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + step / 8 * Math.PI / 4, r = (i % 2 ? 5 : 6) * k;
    fBlob(g, x + Math.cos(a) * r, y + Math.sin(a) * r, 0.55, col);
    fRect(g, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), 1 / 3, 1 / 3, '#ffffff');
  }
  fBlob(g, x, y, Math.max(2, 3 * k) + 0.6, rim);
  fBlob(g, x, y, Math.max(2, 3 * k), col);
  fBlob(g, x - 0.5, y - 0.5, Math.max(1.2, 2 * k), light);
  fBlob(g, x - 0.9, y - 0.9, 0.7, '#ffffff');
  POLLEN_ART.set(key, img = c);
  return img;
}
function drawPollen(ctx, x, y, t, col, k = 1) {
  const step = Math.floor(((t * 0.02) % (Math.PI / 4)) / (Math.PI / 4) * 8) & 7;
  ctx.drawImage(pollenArt(col, Math.round(k * 8) / 8, step), fSnap(x) - 9, fSnap(y) - 9);
}

// Crumbly edges: copy a tile and chew its exposed sides (mask bits: 1 left, 2 right, 4 bottom)
// into a ragged, slightly damaged profile, with a darker rim and the odd crack so the terrain
// doesn't look razor cut. Variants are seeded, so a given spot always looks the same.
function chipTile(src, th, mask, seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const rng = mulberry32(seed), dark = th.ground[1];
  const profile = () => {
    const a = []; let d = rng() < 0.5 ? 0 : 1;
    for (let i = 0; i < 16; i++) {
      const r = rng(); d += r < 0.34 ? -1 : r < 0.68 ? 1 : 0;
      if (rng() < 0.14) d += 2;                       // the odd bigger bite
      d = Math.max(0, Math.min(4, d)); a.push(d);
    }
    return a;
  };
  const rim = (x, y) => { if (rng() < 0.85) { g.fillStyle = dark; g.fillRect(x, y, 1, 1); } };
  if (mask & 1) { const pr = profile(); for (let y = 0; y < 16; y++) { g.clearRect(0, y, pr[y], 1); rim(pr[y], y); if (rng() < 0.12) rim(pr[y] + 1 + (rng() < 0.5 ? 1 : 0), y); } }
  if (mask & 2) { const pr = profile(); for (let y = 0; y < 16; y++) { g.clearRect(16 - pr[y], y, pr[y], 1); rim(15 - pr[y], y); if (rng() < 0.12) rim(14 - pr[y] - (rng() < 0.5 ? 1 : 0), y); } }
  if (mask & 4) { const pr = profile(); for (let x = 0; x < 16; x++) { g.clearRect(x, 16 - pr[x], 1, pr[x]); rim(x, 15 - pr[x]); if (rng() < 0.12) rim(x, 14 - pr[x]); } }
  return c;
}
// Same idea for the wooden ledge tile: ragged, splintered ends.
function chipSemi(src, th, mask, seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const rng = mulberry32(seed), dark = th.semi[1];
  let d = rng() < 0.5 ? 0 : 1;
  const walk = () => { const r = rng(); d += r < 0.35 ? -1 : r < 0.7 ? 1 : 0; d = Math.max(0, Math.min(2, d)); return d; };
  if (mask & 1) { d = 1; for (let y = 0; y < 6; y++) { const k = walk(); g.clearRect(0, y, k, 1); if (k && rng() < 0.7) { g.fillStyle = dark; g.fillRect(k, y, 1, 1); } } }
  if (mask & 2) { d = 1; for (let y = 0; y < 6; y++) { const k = walk(); g.clearRect(16 - k, y, k, 1); if (k && rng() < 0.7) { g.fillStyle = dark; g.fillRect(15 - k, y, 1, 1); } } }
  return c;
}

const tilesetCache = new Map();
function getTileset(name) {
  if (tilesetCache.has(name)) return tilesetCache.get(name);
  const th = THEMES[name], set = {};
  const mk = (key, fn) => { const cv = makeCanvas(16, 16); fn(cv.getContext('2d')); set[key] = cv; };
  mk('ground', c => paintGround(c, th, false, false, 0));
  mk('groundTop', c => paintGround(c, th, true, false, 0));
  for (let v = 0; v < 8; v++) {
    mk('ground' + v, c => paintGround(c, th, false, false, v));
    mk('groundTop' + v, c => paintGround(c, th, true, false, v));
  }
  if (th.style === 'cloud') {
    mk('groundBot', c => paintGround(c, th, false, true));
    mk('groundBoth', c => paintGround(c, th, true, true));
  }
  mk('crumble', c => paintCrumble(c, th));
  mk('ice', paintIce);
  mk('brick', c => paintBrick(c, th));
  for (let f = 0; f < 3; f++) mk('q' + f, c => paintQuestion(c, f));
  mk('used', paintUsed);
  for (let f = 0; f < 3; f++) mk('seed' + f, c => paintSeed(c, f));
  for (const tip of [0, 1]) { mk('leafR' + tip, c => paintLeaf(c, true, tip)); mk('leafL' + tip, c => paintLeaf(c, false, tip)); }
  mk('solid', c => paintSolid(c, th));
  for (let v = 0; v < 4; v++) mk('solid' + v, c => paintSolid(c, th, v));
  for (const p of ['TL', 'TR', 'L', 'R']) mk('pipe' + p, c => paintPipe(c, p, th));
  for (let f = 0; f < 4; f++) { mk('qsand' + f, c => paintQuicksand(c, f, true, th)); mk('qsandDeep' + f, c => paintQuicksand(c, f, false, th)); }
  mk('semi', c => paintSemi(c, th));
  for (let f = 0; f < 4; f++) mk('lava' + f, c => paintLava(c, f, th));
  mk('lavaDeep', c => paintLavaDeep(c, th));
  for (let f = 0; f < 4; f++) mk('coal' + f, c => paintCoal(c, f));
  for (const k of ['tick', 'tock']) { mk(k + 'On', c => paintClockBlock(c, k, true)); mk(k + 'Off', c => paintClockBlock(c, k, false)); }
  // chipped variants, made on demand: set.chip('groundTop', mask, h) / set.chipSemi(mask, h)
  const chips = new Map();
  set.chip = (key, mask, h) => {
    const v = h & 7, srcKey = set[key + v] ? key + v : key;
    const k = srcKey + '_' + mask;
    if (!chips.has(k)) chips.set(k, chipTile(set[srcKey], th, mask, hashStr(name + k)));
    return chips.get(k);
  };
  set.chipSemi = (mask, h) => {
    const k = 'semi' + mask + '_' + (h & 3);
    if (!chips.has(k)) chips.set(k, chipSemi(set.semi, th, mask, hashStr(name + k)));
    return chips.get(k);
  };
  // lift every tile to the fine screen (hires.js): smoothed, the edges carrying on as if into the next tile. The chipped
  // edges are cut from the 1x tiles, then smoothed
  const raw = {};
  for (const k of Object.keys(set)) if (set[k] && set[k].getContext && !(set[k] instanceof HiRes)) { raw[k] = set[k]; set[k] = smoothUp(set[k], ART_R, 'clamp'); }
  set.chip = (key, mask, h) => {
    const v = h & 7, srcKey = raw[key + v] ? key + v : key;
    const k = srcKey + '_' + mask;
    if (!chips.has(k)) chips.set(k, smoothUp(chipTile(raw[srcKey], th, mask, hashStr(name + k)), ART_R, 'clamp'));
    return chips.get(k);
  };
  set.chipSemi = (mask, h) => {
    const k = 'semi' + mask + '_' + (h & 3);
    if (!chips.has(k)) chips.set(k, smoothUp(chipSemi(raw.semi, th, mask, hashStr(name + k)), ART_R, 'clamp'));
    return chips.get(k);
  };
  // the mystery block, the spent one and the crate are painted fine in every world (meadow-fine.js; 4-1 keeps its croutons)
  for (let f = 0; f < 3; f++) set['q' + f] = paintFineQuestion(f);
  set.used = paintFineUsed();
  if (th.brickStyle !== 'crouton') set.brick = paintFineCrate(th);
  fineSharedTiles(set, th);   // (the stone block, log stump, lava, ledge, crumbling and clear ice: fine-ground.js)
  if(name==='desert'){for(let v=0;v<8;v++)set['solid'+v]=duneStoneArt(v);set.solidN=8;set.solid=set.solid0;for(const part of ['TL','TR','L','R'])set['pipe'+part]=duneColumnArt(part);}
  if (th.fine) fineMeadowTiles(set, th, name);   // (painted fine: meadow-fine.js)
  else if (th.fineGround) fineGroundTiles(set, th, name);   // (painted fine: fine-ground.js)
  tilesetCache.set(name, set);
  return set;
}

