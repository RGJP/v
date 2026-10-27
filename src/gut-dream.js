'use strict';
// 3-4's opening cutscene, before the freefall: Chickaroo asleep and cosy in a big bed with his teddy bear; the
// camera drifts in, rippling like a dream, right up to the middle of his forehead -- into his head -- then a fade to
// white, and out of the white, the freefall. He's dreaming (for now). Played once per visit (see gut.js, `intro.pre`).
// Part of class Game (see game.js): GameGutDream
const GUT_DREAM = 640;   // frames of cutscene (unskippable: it's short)
const DREAM_R = ART_R, DREAM_W = VIEW_W * DREAM_R, DREAM_H = VIEW_H * DREAM_R;   // the bedroom is painted 3x finer than the game: 1200 x 672 art pixels
const DREAM_HEAD = [662, 436];   // the middle of Chickaroo's head on the pillow (art pixels)
const DREAM_ZOOM = [490, 620], DREAM_WHITE = 490;   // the zoom in to his forehead (from, to); the fade to white starts here

const GUT_OUTRO_LINES = [
  'That was one weird dream.',
  'No more partying with the Bayou folks. Three bowls of gumbo and dancing till dawn? Bad idea.',
  'Next time, one bowl. And a bedtime.',
  'Okay, back to sleep. Better dreams this time, I hope...',
];

// ── the art: the bedroom is painted at DREAM_R x the game's resolution (1200 x 672 art pixels), as hard-edged pixel
// art (every shape thresholded; no dithering: smooth gradients, clean edges). It's baked once into three layers: the room
// behind him, Chickaroo himself (one canvas per face), and the quilt and cats in front of him.
// (the pixel painter, dreamPix, lives in hires.js: every level's fine art is painted with it)

// the window (art pixels): its frame, and the glass inside it
const DW_X0 = 100, DW_X1 = 330, DW_Y0 = 92, DW_Y1 = 326, DG_X0 = 114, DG_X1 = 316, DG_Y0 = 106, DG_Y1 = 312;
const DREAM_STARS = [[132, 124], [168, 150], [196, 118], [140, 176], [236, 128], [182, 198], [262, 214], [228, 236], [150, 224], [296, 190]];
// the quilt's patches: base, shade, light
const DREAM_QUILT = [['#ff8fa3', '#e0687e', '#ffbccb'], ['#ffd166', '#e0a83a', '#ffe7a4'], ['#7fd4ff', '#4fa6e0', '#b6e8ff'], ['#a8e6a0', '#74bc6c', '#d0f6c8'], ['#c8a8ff', '#9a78e0', '#e2d0ff']];
const DQ_Y0 = 464, DQ_Y1 = 512, DQ_FOOT = 556;   // the quilt: its top (from the hem to the foot of the bed), then the drop over the end

// the teddy, tucked in beside him
function dreamTeddy() {
  const P = finePix(64, 64), cx = 32, cy = 38;
  for (const s of [-1, 1]) { P.ell(cx + s * 19, cy - 19, 10, 10, '#a8743e'); P.ell(cx + s * 19, cy - 19, 5.5, 5.5, '#e8c08a'); }
  P.ell(cx, cy, 25, 22, '#a8743e');
  P.ell(cx - 1, cy - 1, 23.5, 20.5, '#c8935a', { only: ['#a8743e'], dither: 0.45 });
  P.ell(cx - 2, cy - 2, 22, 19, '#c8935a', { only: ['#a8743e'] });
  P.ell(cx - 9, cy - 10, 8, 5, '#deae76', { only: ['#c8935a'], rot: -0.4 });
  P.ell(cx, cy + 8, 11, 8, '#f4dcb0'); P.ell(cx + 2, cy + 11, 9, 4, '#e2c494', { only: ['#f4dcb0'] });
  P.ell(cx, cy + 4, 4.5, 3, '#2a1410'); P.rect(cx - 2, cy + 3, 2, 1, '#8a6a5a');
  P.line(cx, cy + 7, cx, cy + 10, '#2a1410'); P.line(cx - 4, cy + 12, cx, cy + 10, '#2a1410'); P.line(cx + 4, cy + 12, cx, cy + 10, '#2a1410');
  // eyes: two happy arcs sewn in dark thread (rounded, like ^ ^ without the points)
  for (const s of [-1, 1]) {
    const ex = cx + s * 10, ey = cy - 2;
    P.fill(ex - 5, ey - 5, ex + 5, ey + 1, (x, y) => { const d = Math.hypot(x + 0.5 - ex, y + 0.5 - ey); return d >= 2.6 && d <= 4.1 && y + 0.5 <= ey ? '#2a1410' : null; });
  }
  return P.outline('#3a2014');
}

// Chickaroo's head and shoulders above the covers (the rest is under the quilt). Faces: sleep, awake, blink, shock
function dreamChick(mode) {
  const P = finePix(110, 100), cx = 55, cy = 60, rx = 37, ry = 34, top = cy - ry, C = CHICK_PAL;
  P.ell(cx + 3, top + 3, 5, 10, C.shade, { rot: 0.5 }); P.ell(cx - 5, top + 4, 4, 8.5, C.shade, { rot: -0.5 });
  P.ell(cx + 3, top + 3, 3.4, 8.4, C.body, { rot: 0.5 }); P.ell(cx - 5, top + 4, 2.6, 7, C.body, { rot: -0.5 });
  P.ell(cx, cy, rx, ry, C.shade);
  P.ell(cx - 2, cy - 3, rx - 2, ry - 3, C.body, { only: [C.shade], dither: 0.5 });
  P.ell(cx - 4, cy - 5, rx - 5, ry - 7, C.body, { only: [C.shade] });
  P.ell(cx - 15, cy - 20, 14, 8.5, C.light, { only: [C.body], rot: -0.5, dither: 0.35 });
  P.ell(cx - 15, cy - 20, 10, 5.5, C.light, { only: [C.body], rot: -0.5 });
  const E = C.eye, ey = cy - 3, skin = [C.body, C.shade, C.light];
  for (const s of [-1, 1]) {
    const ex = cx + s * 13;
    P.ell(cx + s * 23, ey + 9, 8, 4.5, C.cheek, { only: skin, dither: 0.4 }); P.ell(cx + s * 23, ey + 9, 5.5, 3, C.cheek, { only: skin });
    if (mode === 'sleep') P.fill(ex - 8, ey - 6, ex + 8, ey + 6, (x, y) => { const d = Math.hypot(x + 0.5 - ex, y + 0.5 - (ey - 4)); return d >= 5 && d <= 7.4 && y + 0.5 > ey - 1 ? E : null; });
    else if (mode === 'blink') P.rect(ex - 5, ey, 11, 2, E);
    else if (mode === 'shock') { P.ell(ex, ey - 1, 8.5, 9.5, E); P.ell(ex, ey - 1, 7, 8, '#ffffff'); P.ell(ex, ey - 1, 2.2, 2.2, E); }
    else { P.ell(ex, ey, 4.6, 6.2, E); P.ell(ex - 1.5, ey - 2.5, 1.7, 1.7, '#ffffff'); P.rect(ex + 1, ey + 2, 1, 1, '#ffffff'); }
  }
  P.poly([[cx - 4, ey + 7], [cx + 4, ey + 7], [cx, ey + (mode === 'shock' ? 17 : 12)]], C.beakD);
  P.poly([[cx - 6.5, ey + 4], [cx + 6.5, ey + 4], [cx, ey + 10]], C.beak);
  P.rect(cx - 3, ey + 5, 2, 1, '#ffd49a');
  return P.outline(INK);
}

// The real cats curled on the quilt, with the same coats and faces as their
// companions. Their eyes close for the night scene and open in the morning.
function dreamCat(kind, awake = false) {
  const W=124,H=66,A=mArt(W,H,1),K=FINE_CATS[kind],mur=kind==='murray';
  catCoatPart(A,kind,55,40,49,22);
  if(mur)A.soft(63,53,33,9,CAT_WHITE);
  // A ginger-and-black ruff around Beebeez's white bib; Murray's is all white.
  if(!mur)A.soft(87,41,15,19,K.patch);
  A.soft(90,46,mur?15:10,15,CAT_WHITE);
  // Tail curled round the front, patterned but never a white-tipped tail.
  A.fill(1,43,94,65,(x,y)=>{
    const outer=((x-55)/53)**2+((y-42)/22)**2;
    const inner=((x-55)/46)**2+((y-40)/16)**2;
    if(outer>1||inner<1||y<48)return null;
    const light=0.3-(y-49)*0.06;
    return softTone(mur?(Math.sin(x*0.34)>0.65?[K.stripe,K.base[1],K.base[2]]:K.base):(Math.sin(x*0.2)>0.55?K.patch:K.base),light);
  });
  A.soft(87,57,7,4,CAT_WHITE);A.soft(103,58,7,4,CAT_WHITE);
  fineCatFace(A,kind,98,32,4.7,awake);
  A.outline('#1e211e',2);
  fineCatWhiskers(A,98,32,4.7);
  // The bedroom's blitter uses packed colours rather than mArt's CSS colours.
  const P=finePix(W,H);
  P.fill(0,0,W,H,(x,y)=>A.buf[y*W+x]);
  return P;
}

// a drifting Z, s art pixels tall
function dreamZ(s) {
  const P = finePix(s + 4, s + 4), o = 2;
  P.poly([[o, o], [o + s, o], [o + s, o + s * 0.24], [o + s * 0.4, o + s * 0.76], [o + s, o + s * 0.76], [o + s, o + s], [o, o + s], [o, o + s * 0.76], [o + s * 0.6, o + s * 0.24], [o, o + s * 0.24]], '#dce2ff');
  return P.outline('#14184a').canvas();
}

// lamplight (warm, from the bedside lamp) and moonlight (cool, from the window), blended over what's painted;
// in the morning (day) the lamp is off, daylight fills the room and the sun pours in through the window instead
function dreamLight(P, moon, day = false) {
  if (day) {
    const glass = (x, y) => x >= DG_X0 && x < DG_X1 && y >= DG_Y0 && y < DG_Y1;
    P.fill(0, 0, DREAM_W, DREAM_H, (x, y) => glass(x, y) ? null : '#fff2d4', { a: 0.2 });
    if (!moon) return;
    P.ell(215, 230, 220, 220, '#fff0b0', { a: 0.07 });
    P.poly([[DG_X0, DG_Y1], [DG_X1, DG_Y1], [470, 672], [250, 672]], '#fff4c0', { a: 0.08 });
    P.poly([[150, 512], [350, 512], [480, 672], [262, 672]], '#ffe8a0', { a: 0.16 });
    return;
  }
  // the lamp's glow falls off smoothly (no rings)
  P.shine(406, 0, 1200, 672, (x, y) => { const d = Math.hypot((x - 1006) / 600, (y - 330) / 480); return d >= 1 ? 0 : (1 - d) ** 2 * 0.154; }, '#ffb050');
  P.poly([[982, 294], [1030, 294], [1090, 110], [922, 110]], '#ffd080', { a: 0.06 });
  if (!moon) return;
  P.ell(215, 230, 200, 200, '#8094ff', { a: 0.035 });
  P.poly([[DG_X0, DG_Y1], [DG_X1, DG_Y1], [470, 672], [250, 672]], '#b8c8ff', { a: 0.025 });
  P.poly([[150, 512], [350, 512], [480, 672], [262, 672]], '#b8c8ff', { a: 0.07 });
}

// Paint the view separately so every shape is clipped to the glass. Exact sky-colour
// masks leave holes in the buildings when the sky uses a smooth gradient.
function paintDreamWindow(day, rng) {
  const P = finePix(DG_X1 - DG_X0, DG_Y1 - DG_Y0), X0 = 0, Y0 = 0, X1 = P.w, Y1 = P.h;
  if (day) {   // a sunny morning: blue sky, the sun, a couple of clouds, the town's red roofs, a tree in leaf
    const SKY = ['#4aa8ec', '#62b6f0', '#7cc4f4', '#9ad2f6', '#bce2f8'];
    P.vgrad(X0, Y0, X1 - X0, Y1 - Y0, SKY);
    const SX = 268 - DG_X0, SY = 146 - DG_Y0;
    P.ell(SX, SY, 46, 46, '#fff6c8', { a: 0.18 }); P.ell(SX, SY, 32, 32, '#fff6c8', { a: 0.25 });
    P.ell(SX, SY, 18, 18, '#ffe27a'); P.ell(SX - 3, SY - 3, 13, 13, '#fff4b8');
    for (const [cx, cy, rx, ry] of [[156, 150, 24, 8], [172, 142, 14, 9], [142, 146, 11, 7], [228, 192, 20, 6], [240, 186, 11, 7]]) P.ell(cx - DG_X0, cy - DG_Y0, rx, ry, '#ffffff');
    for (const [cx, cy, rx] of [[156, 155, 22], [228, 196, 18]]) P.ell(cx - DG_X0, cy - DG_Y0, rx, 3, '#dceefa', { only: ['#ffffff'] });
    let hx = X0 - 6;
    while (hx < X1) {
      const hw = 26 + ((rng() * 22) | 0), hh = 22 + ((rng() * 36) | 0), base = Y1, top = base - hh, roof = ['#c0503a', '#d0783a', '#a04a5a'][(rng() * 3) | 0];
      P.rect(hx, top, hw, hh, rng() < 0.5 ? '#f0d8b0' : '#e2c49a');
      P.poly([[hx - 2, top + 2], [hx + hw / 2, top - 12], [hx + hw + 2, top + 2]], roof);
      if (rng() < 0.5) P.rect(hx + hw - 9, top - 14, 5, 12, roof);
      for (let k = 0; k < 2; k++) if (rng() < 0.55) { const wx = hx + 5 + ((rng() * (hw - 12)) | 0), wy = top + 6 + ((rng() * (hh - 14)) | 0); P.rect(wx, wy, 4, 5, '#5a7ab8'); P.rect(wx, wy, 1, 2, '#c8e0ff'); rng(); }
      hx += hw + 2;
    }
    P.ell(X0 + 10, Y1 - 52, 22, 18, '#3a8a3a'); P.ell(X0 + 28, Y1 - 66, 18, 16, '#4aa048'); P.ell(X0 + 22, Y1 - 72, 9, 7, '#7ac868');
    P.rect(X0 + 14, Y1 - 40, 5, 40, '#6a4a2a');
  } else {
    P.vgrad(X0, Y0, X1 - X0, Y1 - Y0, ['#05071e', '#090e30', '#0f1848', '#182862', '#233876']);
    for (let i = 0; i < 46; i++) P.rect(X0 + ((rng() * (X1 - X0)) | 0), Y0 + ((rng() * 150) | 0), 1, 1, rng() < 0.4 ? '#c8ccff' : '#6a72b0');
    const MX = 252 - DG_X0, MY = 150 - DG_Y0;
    P.ell(MX, MY, 50, 50, '#9fb0ff', { a: 0.05 }); P.ell(MX, MY, 38, 38, '#9fb0ff', { a: 0.06 });
    const moonA = P.inEll(MX, MY, 24, 24), moonB = P.inEll(MX + 11, MY - 7, 22, 22);
    P.fill(MX - 26, MY - 26, MX + 26, MY + 26, (x, y) => moonA(x, y) && !moonB(x, y) ? (P.inEll(MX - 3, MY + 2, 20, 21)(x, y) ? '#fff6d2' : '#e8d49a') : null);
    let hx = X0 - 6;
    while (hx < X1) {
      const hw = 26 + ((rng() * 22) | 0), hh = 22 + ((rng() * 36) | 0), base = Y1, top = base - hh;
      P.poly([[hx, base], [hx, top], [hx + hw / 2, top - 12], [hx + hw, top], [hx + hw, base]], '#070a22');
      if (rng() < 0.5) P.rect(hx + hw - 9, top - 14, 5, 12, '#070a22');
      for (let k = 0; k < 2; k++) if (rng() < 0.55) P.rect(hx + 5 + ((rng() * (hw - 12)) | 0), top + 6 + ((rng() * (hh - 14)) | 0), 4, 5, rng() < 0.7 ? '#ffcf6a' : '#8a6a3a');
      hx += hw + 2;
    }
    P.ell(X0 + 10, Y1 - 52, 22, 18, '#05081c'); P.ell(X0 + 28, Y1 - 66, 18, 16, '#05081c'); P.rect(X0 + 14, Y1 - 40, 5, 40, '#05081c');
  }
  return P;
}

// the room behind him: wall, window and curtains, the headboard, pillow and teddy, the bedside table, the floor
function paintDreamBack(day = false) {
  const P = finePix(DREAM_W, DREAM_H), rng = mulberry32(3104), W = DREAM_W;
  // the wall: striped paper with little flowers, a cornice, the skirting board
  P.vgrad(0, 0, W, 478, day ? ['#3a4890', '#424f9a', '#4a58a4', '#5260ac'] : ['#181b42', '#1e2254', '#242962', '#2a306e']);
  P.fill(0, 0, W, 478, x => x % 40 < 20 ? '#ffffff' : null, { a: 0.03 });
  P.fill(0, 0, W, 478, x => x % 40 === 0 ? '#000000' : null, { a: 0.12 });
  for (let y = 36, r = 0; y < 470; y += 44, r++) for (let x = (r % 2) * 20 + 10; x < W; x += 40) {
    P.rect(x - 1, y - 3, 3, 7, '#3a4290'); P.rect(x - 3, y - 1, 7, 3, '#3a4290'); P.rect(x, y, 1, 1, '#7070c0');
  }
  P.rect(0, 0, W, 10, '#121436'); P.rect(0, 10, W, 3, '#2e3478'); P.rect(0, 13, W, 1, '#0e1030');
  P.rect(0, 478, W, 22, '#cdb995'); P.rect(0, 478, W, 3, '#eadcbc'); P.rect(0, 486, W, 1, '#a8946e'); P.rect(0, 497, W, 3, '#6e5c40');
  // the floorboards, wider as they come towards us
  for (let y = 500, hgt = 12, row = 0; y < DREAM_H; y += hgt, hgt = Math.round(hgt * 1.14 + 1), row++) {
    P.rect(0, y, W, hgt, row % 2 ? '#553522' : '#5d3c27'); P.rect(0, y, W, 1, '#6e4a31'); P.rect(0, y + hgt - 2, W, 2, '#3a2216');
    for (let x = (rng() * 220) | 0; x < W; x += 170 + ((rng() * 160) | 0)) P.rect(x, y, 2, hgt - 2, '#3a2216');
    for (let i = 0; i < 16; i++) P.rect((rng() * W) | 0, y + 2 + ((rng() * Math.max(1, hgt - 5)) | 0), 16 + ((rng() * 54) | 0), 1, '#6a4630');
  }
  // a round rug in front of the bed
  P.ell(690, 642, 336, 44, '#2e1228');
  for (const [c, rx, ry] of [['#6a2e5e', 332, 40], ['#8a4478', 318, 35], ['#6a2e5e', 302, 30], ['#a8649a', 288, 26], ['#8a4478', 232, 20], ['#c088b4', 216, 17], ['#8a4478', 150, 11]]) P.ell(690, 642, rx, ry, c);
  for (let x = 380; x <= 1000; x += 8) { const y = 642 + Math.sqrt(Math.max(0, 1 - ((x - 690) / 336) ** 2)) * 44; P.rect(x, y, 2, 4, '#c088b4'); }
  // the window: night sky, a crescent moon, the rooftops of the town
  P.rect(DW_X0 - 3, DW_Y0 - 3, DW_X1 - DW_X0 + 6, DW_Y1 - DW_Y0 + 6, '#1a1428');
  P.rect(DW_X0, DW_Y0, DW_X1 - DW_X0, DW_Y1 - DW_Y0, '#d8c6a2');
  P.rect(DW_X0, DW_Y0, DW_X1 - DW_X0, 3, '#f0e2c4'); P.rect(DW_X0, DW_Y0, 3, DW_Y1 - DW_Y0, '#f0e2c4');
  P.rect(DW_X0, DW_Y1 - 3, DW_X1 - DW_X0, 3, '#a8946e'); P.rect(DW_X1 - 3, DW_Y0, 3, DW_Y1 - DW_Y0, '#a8946e');
  P.rect(DG_X0 - 3, DG_Y0 - 3, DG_X1 - DG_X0 + 6, DG_Y1 - DG_Y0 + 6, '#8a7656');
  P.blit(paintDreamWindow(day, rng), DG_X0, DG_Y0);
  P.poly([[DG_X0 + 30, DG_Y0], [DG_X0 + 54, DG_Y0], [DG_X0 + 10, DG_Y0 + 70], [DG_X0, DG_Y0 + 70], [DG_X0, DG_Y0 + 48]], '#ffffff', { a: 0.05 });
  P.poly([[DG_X0 + 62, DG_Y0], [DG_X0 + 70, DG_Y0], [DG_X0 + 30, DG_Y0 + 64], [DG_X0 + 22, DG_Y0 + 64]], '#ffffff', { a: 0.04 });
  P.rect(212, DG_Y0, 7, DG_Y1 - DG_Y0, '#d8c6a2'); P.rect(218, DG_Y0, 1, DG_Y1 - DG_Y0, '#a8946e');
  P.rect(DG_X0, 206, DG_X1 - DG_X0, 6, '#d8c6a2'); P.rect(DG_X0, 211, DG_X1 - DG_X0, 1, '#a8946e'); P.rect(DG_X0, 206, DG_X1 - DG_X0, 1, '#f0e2c4');
  P.rect(DW_X0 - 14, DW_Y1, DW_X1 - DW_X0 + 28, 9, '#e6d6b4'); P.rect(DW_X0 - 14, DW_Y1, DW_X1 - DW_X0 + 28, 2, '#fff2d6');
  P.rect(DW_X0 - 14, DW_Y1 + 9, DW_X1 - DW_X0 + 28, 4, '#8a7656'); P.rect(DW_X0 - 10, DW_Y1 + 13, DW_X1 - DW_X0 + 20, 6, '#000000', { a: 0.3 });
  // the curtains, gathered by tie-backs, and their rod
  for (const mir of [false, true]) {
    const X = x => mir ? 430 - x : x;
    const edges = y => y < 252 ? [70 - 2 * (y - 78) / 174, 148 - 36 * ((y - 78) / 174) ** 2] : [68 - 4 * (y - 252) / 128, 112 + 22 * Math.sqrt((y - 252) / 128)];
    P.fill(30, 76, 400, 384, (x, y) => {
      const xx = mir ? 430 - x : x, [l, r] = edges(y);
      if (xx < l || xx > r) return null;
      if (xx - l < 2 || r - xx < 2 || y > 377) return '#36122a';
      const f = Math.sin((xx - l) / (r - l) * Math.PI * 4.5);
      return f > 0.62 ? '#a64c74' : f > 0.4 ? (0.5 < 0.5 ? '#a64c74' : '#7e3058') : f < -0.45 ? '#5a1e40' : '#7e3058';
    });
    P.ell(X(92), 253, 25, 8, '#2a1020'); P.ell(X(92), 252, 23, 6, '#e0b464'); P.ell(X(92), 250, 20, 3, '#f6d68a', { only: ['#e0b464'] }); P.rect(X(92) - 4, 246, 8, 12, '#b08a3a');
  }
  P.rect(50, 69, 330, 8, '#3a2410'); P.rect(52, 70, 326, 6, '#a07a3a'); P.rect(52, 70, 326, 2, '#e0bc6a');
  for (const x of [46, 384]) { P.ell(x, 73, 8, 8, '#3a2410'); P.ell(x, 73, 7, 7, '#d8b060'); P.rect(x - 3, 69, 3, 2, '#fff0a8'); }
  for (let x = 62; x < 372; x += 12) if (x < 150 || x > 280) P.rect(x, 74, 4, 6, '#b08a3a');
  // the headboard: carved posts, an arched top rail, slats
  const wood = (x, y, w, h) => { P.rect(x, y, w, h, '#2e180c'); P.rect(x + 2, y + 2, w - 4, h - 4, '#7a4a2c'); P.rect(x + 2, y + 2, w - 4, 3, '#b07640'); P.rect(x + 2, y + 2, 3, h - 4, '#93603a'); P.rect(x + w - 6, y + 2, 4, h - 4, '#5a321c'); };
  P.fill(514, 262, 866, 456, (x, y) => {
    const top = 300 - 28 * Math.sin(Math.PI * (x - 514) / 352);
    if (y < top) return null;
    if (y < top + 3) return '#2e180c';
    if (y < top + 9) return y < top + 5 ? '#c08448' : '#93603a';
    if (y < top + 12) return '#4a2814';
    const s = (x - 514) % 32;
    return s < 3 ? '#3e2010' : s < 5 ? '#9a6438' : s > 28 ? '#5a321c' : '#7a4a2c';
  });
  wood(482, 266, 34, 206); wood(864, 266, 34, 206);
  for (const x of [499, 881]) {
    P.ell(x, 262, 21, 9, '#2e180c'); P.ell(x, 261, 19, 7, '#93603a'); P.rect(x - 6, 244, 12, 12, '#2e180c'); P.rect(x - 4, 246, 8, 10, '#7a4a2c');
    P.ell(x, 236, 12, 12, '#2e180c'); P.ell(x, 236, 10.5, 10.5, '#a8703e'); P.ell(x - 3, 232, 4, 3, '#d8a060');
  }
  // the sheet, the pillow, the teddy
  P.rect(500, 420, 380, 48, '#d8d8ee');
  P.ell(690, 432, 156, 41, '#3e4270'); P.ell(690, 431, 153, 38, '#c4c8e6');
  P.ell(686, 426, 147, 32, '#e8eaff', { only: ['#c4c8e6'] }); P.ell(672, 418, 112, 19, '#ffffff', { only: ['#e8eaff'], dither: 0.5 });
  P.blit(dreamTeddy(), 692, 402);
  // the bedside table: books, an alarm clock, the lamp
  wood(952, 466, 12, 44); wood(1048, 466, 12, 44); P.rect(950, 506, 112, 6, '#000000', { a: 0.35 });
  wood(946, 410, 120, 62);
  P.rect(958, 424, 96, 36, '#2e180c'); P.rect(960, 426, 92, 32, '#6a3e24'); P.rect(960, 426, 92, 2, '#93603a'); P.ell(1006, 442, 4, 4, '#2e180c'); P.ell(1006, 441, 3, 3, '#e8c070');
  P.rect(936, 400, 140, 14, '#2e180c'); P.rect(938, 402, 136, 10, '#9a6438'); P.rect(938, 402, 136, 2, '#c8904e'); P.rect(938, 410, 136, 2, '#6a3e24');
  P.rect(946, 384, 48, 16, '#1a1428'); P.rect(947, 392, 46, 8, '#2e3a8a'); P.rect(947, 392, 46, 1, '#5a6ac8'); P.rect(950, 385, 40, 7, '#a83a3a'); P.rect(950, 385, 40, 1, '#e06a6a'); P.rect(988, 386, 2, 5, '#f4ead0');
  P.ell(1056, 389, 14, 13, '#1a1018'); P.ell(1056, 389, 12, 11, '#e04050'); P.ell(1056, 389, 8.5, 8, '#fff6e0'); P.line(1056, 389, 1056, 383, '#2a1a10'); P.line(1056, 389, 1060, 391, '#2a1a10');
  for (const s of [-1, 1]) { P.ell(1056 + s * 8, 376, 5, 4, '#1a1018'); P.ell(1056 + s * 8, 376, 3.5, 2.5, '#ffd166'); P.rect(1056 + s * 8 - 1, 398, 3, 3, '#1a1018'); }
  P.ell(1006, 402, 21, 7, '#3a2408'); P.ell(1006, 400, 19, 5, '#d4a94a'); P.ell(1002, 399, 8, 2, '#fff0a8');
  P.rect(1002, 346, 8, 55, '#3a2408'); P.rect(1003, 346, 6, 55, '#b08a3a'); P.rect(1004, 346, 2, 55, '#f0d080');
  const L = day ? ['#8a6a3a', '#e6cc96', '#eedaac', '#f4e4bc', '#c8a46a', '#f0e2c0'] : ['#9a5e1e', '#ffcf72', '#ffe6a4', '#fff6d4', '#e8a448', '#fff4cc'];   // (switched off in the morning)
  P.poly([[968, 352], [1044, 352], [1031, 292], [981, 292]], L[0]);
  P.poly([[971, 350], [1041, 350], [1029, 294], [983, 294]], L[1]);
  P.poly([[988, 348], [1026, 348], [1019, 296], [995, 296]], L[2]); P.poly([[998, 346], [1014, 346], [1011, 298], [1001, 298]], L[3]);
  P.rect(970, 346, 74, 5, L[4]); P.rect(980, 292, 52, 3, L[4]);
  if (!day) P.ell(1006, 352, 30, 5, L[5]);
  // the shadow under the bed
  P.ell(690, 614, 256, 16, '#000000', { a: 0.4 }); P.rect(486, 556, 408, 56, '#0e0806', { a: 0.55 });
  dreamLight(P, true, day);
  return P;
}

// in front of him: the quilt (its folded-back hem, the patchwork top, the drop over the end), the bed's foot, the cats
function paintDreamFront(day = false, catsAwake = day) {
  const P = finePix(DREAM_W, DREAM_H);
  const span = v => [500 - 18 * v, 880 + 18 * v];
  const patch = (x, y, ci, ri, fu, fr, pw, ph, drop) => {
    const Q = DREAM_QUILT[((ci + ri * 3) % 5 + 5) % 5], du = Math.min(fu, 1 - fu) * pw, dr = Math.min(fr, 1 - fr) * ph;
    if (du < 1.2) return y % 4 < 2 ? '#fff6ee' : Q[1];
    if (dr < 1) return x % 6 < 3 ? '#fff6ee' : Q[1];
    if ((fu > 0.5 && du < 4) || (fr > 0.5 && dr < 3) || drop) return (drop && dr > 3 && du > 4 && 0.5 < 0.5) ? Q[0] : Q[1];
    if ((fu < 0.5 && du < 4) || (fr < 0.5 && dr < 3)) return Q[2];
    return Q[0];
  };
  P.fill(470, DQ_Y0, 910, DQ_Y1, (x, y) => {
    const v = (y - DQ_Y0) / (DQ_Y1 - DQ_Y0), [l, r] = span(v);
    if (x < l || x >= r) return null;
    const cu = (x - l) / (r - l) * 8, rv = Math.pow(v, 0.85) * 3, ci = Math.floor(cu), ri = Math.floor(rv);
    return patch(x, y, ci, ri, cu - ci, rv - ri, (r - l) / 8, (DQ_Y1 - DQ_Y0) / 3, false);
  });
  P.fill(480, DQ_Y1, 900, DQ_FOOT + 4, (x, y) => {
    const [l, r] = span(1), bot = DQ_FOOT + 3 * Math.sin(x * 0.07);
    if (x < l || x >= r || y > bot) return null;
    if (y < DQ_Y1 + 3) return '#ffffff';
    if (y > bot - 2) return '#3a2030';
    const cu = (x - l) / (r - l) * 8, rv = (y - DQ_Y1) / 22, ci = Math.floor(cu), ri = Math.floor(rv);
    return patch(x, y, ci, 3 + ri, cu - ci, rv - ri, (r - l) / 8, 22, true);
  });
  // the shapes of him and the teddy under the covers
  P.ell(662, 478, 54, 14, '#ffffff', { a: 0.16 }); P.ell(668, 494, 50, 10, '#000000', { a: 0.12 }); P.ell(724, 476, 28, 9, '#ffffff', { a: 0.12 });
  // the sheet folded back over the top
  P.fill(498, 446, 882, 468, (x, y) => {
    const top = 452 + Math.round(1.5 * Math.sin(x * 0.09));
    if (y < top) return null;
    if (y < top + 2) return '#ffffff';
    if (y >= 461 && y < 464) return '#8fa8e8';
    return y > 465 ? '#c4c6e4' : '#f0eeff';
  });
  // the foot of the bed
  P.rect(472, DQ_FOOT - 2, 436, 26, '#2e180c'); P.rect(474, DQ_FOOT, 432, 22, '#7a4a2c'); P.rect(474, DQ_FOOT + 16, 432, 6, '#5a321c');
  for (const x of [478, 880]) { P.rect(x, DQ_FOOT + 22, 24, 36, '#2e180c'); P.rect(x + 2, DQ_FOOT + 22, 20, 34, '#7a4a2c'); P.rect(x + 2, DQ_FOOT + 22, 4, 34, '#a8703e'); }
  // the cats, curled up on the quilt either side of him
  P.blit(dreamCat('murray', catsAwake), 512, 446); P.blit(dreamCat('beebeez', catsAwake), 768, 450, true);   // (up and about in the morning, or woken in the night)
  P.outline(INK);
  P.rect(474, DQ_FOOT, 432, 2, '#b07640');
  dreamLight(P, false, day);
  return P;
}

// day: 4-1's sunny morning version of the room (the cats awake, the lamp off)
function bakeDreamArt(day = false) {
  const back = paintDreamBack(day).canvas(), g = back.getContext('2d');
  g.imageSmoothingEnabled = false;
  const chick = {};
  for (const m of ['sleep', 'awake', 'blink', 'shock']) chick[m] = dreamChick(m).canvas();
  return { back, front: paintDreamFront(day).canvas(), frontCatsUp: day ? null : paintDreamFront(false, true).canvas(), chick, z: [dreamZ(12), dreamZ(18), dreamZ(26)], catZ: dreamZ(9), day };
}
class GameGutDream {
  // one frame of the cutscene (called from updateGutIntro while intro.pre < GUT_DREAM)
  updateGutDream(I) {
    I.pre++;
    if (I.pre === 540) Sound.play('whoosh');
  }
  // the bedroom, composed each frame into its own canvas (art pixels; so the camera can zoom and ripple it): the
  // baked room, Chickaroo's face of the moment, the quilt and cats over him, then the little things that move
  // sweat: 0 for none, else 0..1 through the big nervous sweat drop's moment on the side of his head
  // day: 4-1's sunny morning (no stars; the cats are awake). catsUp: the cats woken in the night (3-4's ending)
  drawDreamRoom(ctx, t, awakeMode = 'sleep', sweat = 0, day = false, catsUp = false) {
    const A = day ? this.dreamDayArt || (this.dreamDayArt = bakeDreamArt(true)) : this.dreamArt || (this.dreamArt = bakeDreamArt()), R = DREAM_R;
    ctx.drawImage(A.back, 0, 0);
    if (!day) DREAM_STARS.forEach(([x, y], i) => {   // a slow, soft twinkle
      const k = Math.sin(t * 0.04 + i * 1.7);
      ctx.fillStyle = k > 0.3 ? '#ffffff' : '#9aa4e0'; ctx.fillRect(x, y, 1, 1);
      if (k > 0.3) { ctx.fillStyle = '#7a86c8'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
    });
    const isAwake = awakeMode === 'shock' || awakeMode === 'awake';
    const face = awakeMode === 'awake' ? (t % 90 < 6 ? 'blink' : 'awake') : awakeMode === 'shock' ? 'shock' : 'sleep';
    const sitUp = awakeMode === 'shock' ? -14 : awakeMode === 'awake' ? -8 : 0, [hx, hy] = DREAM_HEAD;
    ctx.drawImage(A.chick[face], hx - 55, hy - 60 + sitUp);
    ctx.drawImage(catsUp && A.frontCatsUp ? A.frontCatsUp : A.front, 0, 0);
    this.dreamForehead = [hx / R, (hy - 18 + sitUp) / R];   // what the camera zooms in on (game pixels)
    if (awakeMode === 'shock') {   // sweat drops popping off his head as he jolts awake
      ctx.fillStyle = '#bff4ff';
      for (const [dx, dy] of [[-48, -22], [46, -26], [-36, -44], [40, -48]]) { ctx.fillRect(hx + dx, hy + sitUp + dy, 3, 6); ctx.fillRect(hx + dx + 1, hy + sitUp + dy - 2, 1, 2); }
    }
    if (sweat > 0) {   // one big nervous sweat drop on the side of his head, sliding down a little, then gone
      const k = sweat, sx = hx + 33, sy = hy - 30 + sitUp + Math.round(k * 14), drop = (x, y) => {
        const dx = x + 0.5 - sx, dy = y + 0.5 - sy;
        return dy >= 0 ? dx * dx + dy * dy <= 121 : Math.abs(dx) <= 11 * (1 + dy / 24) && dy > -24;   // round below, a point on top
      };
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      for (let y = sy - 26; y <= sy + 13; y++) for (let x = sx - 13; x <= sx + 13; x++) {
        if (drop(x, y)) { ctx.fillStyle = drop(x - 1, y) && drop(x + 1, y) && drop(x, y - 1) && drop(x, y + 1) ? (y > sy + 4 ? '#6cc4f0' : '#9ae0ff') : INK; ctx.fillRect(x, y, 1, 1); }
      }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 6, sy - 2, 3, 6); ctx.fillRect(sx - 4, sy - 8, 2, 4);   // its shine
      ctx.globalAlpha = 1;
    }
    // the cats' own little z's, and his big drifting Z's (while he's asleep)
    if (!day && !catsUp) for (const [x, y, ph, dir] of [[606, 452, 0, 1], [780, 456, 2.1, -1]]) for (let i = 0; i < 2; i++) {
      const age = t - 20 - ph * 20 - i * 60; if (age < 0) continue;
      const k = (age % 120) / 120;
      ctx.globalAlpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      ctx.drawImage(A.catZ, Math.round(x + dir * k * 30), Math.round(y - k * 56));
    }
    ctx.globalAlpha = 1;
    if (!isAwake) {
      for (let i = 0; i < 4; i++) {
        const age = t - 50 - i * 45; if (age < 0) continue;
        const k = (age % 180) / 180, x = hx + 30 + k * 100 + Math.sin(k * 8 + i) * 10, y = hy - 40 - k * 150;
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        ctx.drawImage(A.z[(k > 0.33) + (k > 0.66)], Math.round(x), Math.round(y));
      }
      ctx.globalAlpha = 1;
    }
    // a dark vignette
    const W = DREAM_W, H = DREAM_H;
    for (let i = 0; i < 6; i++) { const d = (6 + i * 4) * R; ctx.globalAlpha = day ? 0.03 : 0.08; ctx.fillStyle = '#05061a'; ctx.fillRect(0, 0, W, d); ctx.fillRect(0, H - d, W, d); ctx.fillRect(0, 0, d, H); ctx.fillRect(W - d, 0, d, H); }
    ctx.globalAlpha = 1;
  }
  // the cutscene's own screen: the canvas is made DREAM_R times finer (drawing still goes in game units), so the fine room isn't squashed back down and blurred; render() puts it back
  dreamHiRes(ctx) {
    const cv = ctx.canvas;
    const S = DREAM_R * SCREEN_K;   // (as sharp as the display: render())
    if (cv.width !== VIEW_W * S) { cv.width = VIEW_W * S; cv.height = VIEW_H * S; }
    ctx.imageSmoothingEnabled = false; ctx.setTransform(S, 0, 0, S, 0, 0);
  }
  // the whole cutscene on the screen: asleep, then the camera drifting in to his forehead, and a fade to white
  drawGutDream(ctx, I) {
    const t = I.pre, W = VIEW_W, H = VIEW_H;
    this.dreamHiRes(ctx);
    const room = this.dreamRoomCv || (this.dreamRoomCv = makeCanvas(W * DREAM_R, H * DREAM_R)), rc = room.getContext('2d');
    rc.imageSmoothingEnabled = false; rc.setTransform(1, 0, 0, 1, 0, 0);
    this.drawDreamRoom(rc, t);
    // the zoom: slow at first, then rushing in, with the spot it's aiming at drawn to the middle of the screen
    const [fx, fy] = this.dreamForehead, u = clamp((t - DREAM_ZOOM[0]) / (DREAM_ZOOM[1] - DREAM_ZOOM[0]), 0, 1);
    const e = u * u * (3 - 2 * u), zk = u * u * u, s = 1 + 11 * zk, amp = e * 5;
    const ax = fx + (W / 2 - fx) * e, ay = fy + (H / 2 - fy) * e;   // where the forehead lands on screen
    const dx = ax - fx * s, dy = ay - fy * s;
    ctx.fillStyle = '#05061a'; ctx.fillRect(0, 0, W, H);
    if (u <= 0) ctx.drawImage(room, 0, 0, W, H);
    else {   // in strips, each nudged sideways on a wave: the room ripples like a dream
      const step = Math.max(1, Math.round(2 / s * 2) / 2);
      for (let y = 0; y < H; y += step) {
        const top = dy + y * s, h = step * s;
        if (top + h < 0 || top > H) continue;
        ctx.drawImage(room, 0, y * DREAM_R, W * DREAM_R, step * DREAM_R, Math.round(dx + Math.sin(y * 0.07 + t * 0.25) * amp), Math.floor(top), Math.round(W * s), Math.ceil(h) + 1);
      }
    }
    // in from black at the very start; out to white at the end
    if (t < 50) { ctx.globalAlpha = 1 - t / 50; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (t > DREAM_WHITE) { const k = Math.min(1, (t - DREAM_WHITE) / (GUT_DREAM - DREAM_WHITE - 10)); ctx.globalAlpha = k * k; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  // out of the white, into the freefall (only after the cutscene)
  drawDreamFadeIn(ctx) {
    const I = this.gut.intro;
    if (!I.dreamed || I.pre < GUT_DREAM || I.t >= 45) return;
    const k = 1 - I.t / 45;
    ctx.globalAlpha = k * k; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  }

  // Waking up from the dream: out of the white the sea faded into (gut-vault.js starts this at t = 64)
  updateGutOutro(O) {
    O.t++;
    this.player.hidden = true;
    if (O.t === 65) {
      Music.stop();
      O.awake = 'sleep';
    }
    if (O.t === 145) {
      // Chickaroo jolts awake in bed!
      O.awake = 'shock';
      Sound.play('hop');
    }
    if (O.t === 153) O.catsUp = true;   // (his yell wakes the cats a beat later)
    if (O.t === 205 && !O.spoke) {   // (once the scream has faded away)
      O.spoke = true; O.awake = 'awake'; O.line = 0; O.wait = 0;
    }
    if (O.spoke && !O.sleepT) {
      // Held lines use the game's normal dialogue flow: jump finishes typing, then dismisses the line.
      // While a line is open updatePlay routes input through holdDialog and leaves the cutscene waiting.
      if (!this.dialog && O.line < GUT_OUTRO_LINES.length) {
        if (O.wait++ >= (O.line ? 24 : 0)) {
          this.speak(CHICK_VOICE, GUT_OUTRO_LINES[O.line++], '#ffd166', true);
          if (this.dialog) this.dialog.background = 'rgba(11,9,24,1)';
          O.wait = 0;
        }
      } else if (!this.dialog && O.line >= GUT_OUTRO_LINES.length) {
        O.awake = 'sleep'; O.sleepT = 1;
        Sound.play('land');
      }
    }
    if (O.sleepT > 0) {
      O.sleepT++;
      if (O.sleepT === 40) O.catsUp = false;   // (and they settle back down a moment after he does)
      if (O.sleepT >= 170 && this.mode === 'play') {   // (a moment in full black first)
        this.addScore(5000);
        this.startTally(); this.tally = false;
        this.finishLevel();
      }
    }
  }

  drawGutOutro(ctx, O) {
    const W = VIEW_W, H = VIEW_H;
    this.dreamHiRes(ctx);
    // Bedroom scene: camera zooms OUT from his forehead (reversing the intro dream ripple),
    // then he wakes up, delivers his line, and goes back to sleep peacefully.
    const bt = O.t - 65;
    const room = this.dreamRoomCv || (this.dreamRoomCv = makeCanvas(W * DREAM_R, H * DREAM_R)), rc = room.getContext('2d');
    rc.imageSmoothingEnabled = false; rc.setTransform(1, 0, 0, 1, 0, 0);
    this.drawDreamRoom(rc, bt + 120, O.awake || 'sleep', O.t >= 150 && O.t < 240 ? (O.t - 150) / 90 : 0, false, !!O.catsUp);
    const [fx, fy] = this.dreamForehead || [DREAM_HEAD[0] / DREAM_R, 140];
    const u = clamp(1 - bt / 70, 0, 1);
    const e = u * u * (3 - 2 * u), zk = u * u * u, s = 1 + 11 * zk, amp = e * 5;
    const ax = fx + (W / 2 - fx) * e, ay = fy + (H / 2 - fy) * e;
    const dx = ax - fx * s, dy = ay - fy * s;
    ctx.fillStyle = '#05061a'; ctx.fillRect(0, 0, W, H);
    if (u <= 0) ctx.drawImage(room, 0, 0, W, H);
    else {
      const step = Math.max(1, Math.round(2 / s * 2) / 2);
      for (let y = 0; y < H; y += step) {
        const top = dy + y * s, h = step * s;
        if (top + h < 0 || top > H) continue;
        ctx.drawImage(room, 0, y * DREAM_R, W * DREAM_R, step * DREAM_R, Math.round(dx + Math.sin(y * 0.07 + bt * 0.25) * amp), Math.floor(top), Math.round(W * s), Math.ceil(h) + 1);
      }
    }
    // Fade in from dream-white right at the start of the bedroom zoom-out
    if (bt < 35) {
      const k = 1 - bt / 35;
      ctx.globalAlpha = k * k;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    // the scream as he jolts awake: a big AAAHH! popping out above his head, trembling, then fading
    if (O.t >= 145 && O.t < 200 && !this.dialog) {
      const k = O.t - 145, pop = k < 6 ? 1.5 - k / 12 : 1, a = O.t > 186 ? (200 - O.t) / 14 : 1;
      const tx = fx + ((k >> 1) % 2 ? 1 : -1) * (k < 40 ? 1 : 0), ty = fy - 62;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(tx, ty); ctx.scale(pop, pop);
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]]) drawText(ctx, 'AAAHH!', ox, oy - 10, INK, { scale: 3, align: 'center' });
      drawText(ctx, 'AAAHH!', 0, -10, '#ffd166', { scale: 3, align: 'center' });
      ctx.restore();
    }
    // Draw the dialogue box on top of the bedroom scene while Chickaroo speaks
    if (this.dialog && this.mode === 'play') this.drawDialog(ctx);
    // Let the last line finish, then dim gently as he falls asleep before stage clear.
    if (O.sleepT > 30) {
      const k = clamp((O.sleepT - 30) / 120, 0, 1);
      ctx.globalAlpha = k * k * (3 - 2 * k);   // all the way to black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
}
mixin(Game, GameGutDream);
