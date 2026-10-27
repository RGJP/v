'use strict';
// How 1-2's sleeping giant looks: a big, soft, lavender cave-dweller in an emerald-and-brass striped nightcap, flat on his back and seen
// from the side -- feet sticking up at the left, his belly a round hill in the middle, his head at the right with his
// face to the cave roof, snoring through an open mouth (the Z's come out of it) and blowing a bubble out of his nose.
// Crisp pixel art with ink outlines, painted once (finePix, hires.js) ART_R times finer than the game, in three
// layers so his belly (and the hand resting on it) can breathe while his feet and head stay put.
// Coordinates are world pixels from his heel on the floor: x to the right, y up is negative.
const SNORER_ART = { ox: 8, oy: 60, w: 186, h: 64 };   // the art canvas, with his heel at (ox, oy)
const SNORER_W = 128, SNORER_H = 44;                   // his body, for bouncing on
const SNORER_MOUTH = [104, -33];                       // where the Z's come out
const SNORER_NOSE = [117, -46];                        // where the bubble grows
const SN = {
  fur: '#8a78c0', furD: '#5c4a92', furL: '#b4a6e2', belly: '#efe2cc', bellyD: '#cdb69a', bellyL: '#fff8ea',
  skin: '#f2c0aa', skinD: '#c98a82', skinS: '#dca294', nose: '#e8808e', noseL: '#ffc4ca', cap: '#1f9a5e', capD: '#0e5c38', capL: '#5ad89a', gold: '#e0b040', goldD: '#9a7020', goldL: '#ffe48a',
  pom: '#ffe48a', pomD: '#c8962e', blush: '#ff8aa0',
};
let snorerArt;
function snorerPaint() {
  if (snorerArt) return snorerArt;
  const { ox, oy, w, h } = SNORER_ART;
  // each layer is painted ART_R times finer than the game (hires.js); shapes are still placed in world pixels
  const R = ART_R, layer = () => {
    const P = finePix(w * R, h * R), X = x => (x + ox) * R, Y = y => (y + oy) * R;
    const at = pts => pts.map(([x, y]) => [X(x), Y(y)]);
    return {
      P,
      ell: (x, y, rx, ry, c, o) => P.ell(X(x), Y(y), rx * R, ry * R, c, o),
      rect: (x, y, rw, rh, c, o) => P.rect(X(x), Y(y), rw * R, rh * R, c, o),
      poly: (pts, c, o) => P.poly(at(pts), c, o),
      line: (x0, y0, x1, y1, c, o) => { for (let i = 0; i < R - 1; i++) for (let j = 0; j < R - 1; j++) P.line(X(x0) + i, Y(y0) + j, X(x1) + i, Y(y1) + j, c, o); },
      fill: (f, o) => P.fill(0, 0, w * R, h * R, (x, y) => f(x / R - ox, y / R - oy), o),
      // nothing below the floor; then the ink outline round it all (and anything that goes over the ink)
      done(over) { P.buf.fill(0, oy * R * w * R); P.outline(INK); P.outline(INK); if (over) over(P, X, Y); return P.hi(); },
    };
  };
  // a shaded round lump: shade all over, the colour itself up and to the left of it, a soft light on top
  const lump = (L, x, y, rx, ry, base, dark, light) => {
    L.ell(x, y, rx, ry, dark);
    L.ell(x - 1, y - 1, rx - 1, ry - 1, base, { only: [dark], dither: 0.5 });
    L.ell(x - 2, y - 2, rx - 2.5, ry - 2.5, base, { only: [dark] });
    if (light) L.ell(x - rx * 0.3, y - ry * 0.4, rx * 0.45, ry * 0.3, light, { only: [base], dither: 0.45 });
  };
  // a limb: a rounded bar from (x0, y0) to (x1, y1), r thick either side, shaded underneath
  const limb = (L, x0, y0, x1, y1, r, base, dark) => {
    const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    const bar = (rr, c, o) => { L.poly([[x0 + nx * rr, y0 + ny * rr], [x1 + nx * rr, y1 + ny * rr], [x1 - nx * rr, y1 - ny * rr], [x0 - nx * rr, y0 - ny * rr]], c, o); L.ell(x0, y0, rr, rr, c, o); L.ell(x1, y1, rr, rr, c, o); };
    bar(r, dark); L.poly([[x0 - nx * r * 0.2, y0 - ny * r * 0.2 - 1], [x1 - nx * r * 0.2, y1 - ny * r * 0.2 - 1], [x1 - nx * (r - 1), y1 - ny * (r - 1)], [x0 - nx * (r - 1), y0 - ny * (r - 1)]], base, { only: [dark] });
  };

  // ── his legs, lying along the floor, and his feet sticking up (soles to the left, toes curled over) ──
  const legs = layer();
  lump(legs, 30, -7, 20, 8, SN.furD, '#4a3a7a');                     // the far leg, in shadow
  lump(legs, 16, -17, 6, 15, SN.furD, '#4a3a7a');
  legs.ell(13, -17, 3.5, 11, SN.skinD); legs.ell(13, -18, 2.5, 9, SN.skinS);   // its sole, in shadow...
  for (const [x, y] of [[10, -31], [15, -33], [20, -31]]) { legs.ell(x, y, 3, 3, SN.skinD); legs.ell(x - 0.5, y - 0.5, 2.2, 2.2, SN.skinS); }   // ...and its toes, just like the near foot's
  lump(legs, 27, -6, 21, 8, SN.fur, SN.furD, SN.furL);               // the near leg
  lump(legs, 8, -16, 7, 16, SN.fur, SN.furD, SN.furL);
  legs.ell(5, -16, 4, 12, SN.skinD); legs.ell(5, -17, 3, 10, SN.skin);   // the sole of his foot
  legs.ell(5, -16, 1.5, 5, '#ffd8c6');
  for (const [x, y] of [[2, -32], [7, -34], [12, -32]]) { legs.ell(x, y, 3, 3, SN.skinD); legs.ell(x - 0.5, y - 0.5, 2.2, 2.2, SN.skin); }   // toes

  // ── his belly: a round furry hill with a cream tummy, his hand resting on top of it ──
  const body = layer();
  lump(body, 66, -2, 38, 40, SN.fur, SN.furD, SN.furL);
  body.ell(97, -8, 15, 12, SN.furD); body.ell(96, -9, 13.5, 10.5, SN.fur, { only: [SN.furD] });   // his chest, sloping down to his head
  body.ell(66, -6, 30, 34, SN.bellyD, { only: [SN.fur, SN.furD, SN.furL] });
  body.ell(64, -8, 28, 32, SN.belly, { only: [SN.bellyD] });
  body.ell(57, -26, 13, 7, SN.bellyL, { only: [SN.belly], dither: 0.5 });
  body.line(66, -27, 69, -27, SN.bellyD); body.line(65, -26, 66, -26, SN.bellyD);           // his belly button
  limb(body, 101, -12, 84, -29, 6, SN.fur, SN.furD);                  // his arm, from his shoulder up onto his tummy
  lump(body, 79, -32, 8, 6, SN.fur, SN.furD, SN.furL);                // his hand, resting on it
  for (const x of [73, 77, 81]) body.line(x, -30, x, -27, SN.furD);
  const bodyCv = body.done();

  // ── his head, face up: chin, open mouth, a big round nose, a closed eye, his ear; the nightcap trailing off ──
  const head = layer();
  lump(head, 116, -16, 21, 17, SN.fur, SN.furD, SN.furL);
  head.ell(107, -26, 13, 9, SN.skinD);                               // his muzzle
  head.ell(106, -27, 12, 8, SN.skin, { only: [SN.skinD] });
  head.ell(102, -30, 5, 2.5, '#ffd8c6', { only: [SN.skin] });
  lump(head, 117, -38, 7, 6, SN.nose, '#b85a6a', SN.noseL);          // his big nose, pointing at the roof
  head.ell(121, -23, 5, 3, SN.blush, { only: [SN.fur, SN.furL, SN.furD], a: 0.6 });
  lump(head, 121, -9, 6, 7, SN.furD, '#4a3a7a'); head.ell(121, -10, 3, 4, SN.skinD);   // his ear
  head.ell(125, -32, 5, 2.5, SN.furD);                               // a bushy brow
  // the nightcap: over the back of his head, then trailing off to the right, its pompom on the floor
  head.poly([[131, -34], [139, -32], [155, -21], [167, -8], [163, -4], [147, -8], [138, -4], [133, -14]], SN.capD);
  head.poly([[132, -33], [139, -31], [154, -21], [164, -9], [147, -11], [137, -8], [134, -16]], SN.cap, { only: [SN.capD] });
  // brass stripes round it, across the way it trails
  head.fill((x, y) => Math.floor((x * 0.8 + y * 0.6) / 4) % 2 === 0 ? SN.gold : null, { only: [SN.cap] });
  head.fill((x, y) => Math.floor((x * 0.8 + y * 0.6) / 4) % 2 === 0 ? SN.goldD : null, { only: [SN.capD] });
  head.line(137, -29, 153, -19, SN.capL, { only: [SN.cap] }); head.line(137, -29, 153, -19, SN.goldL, { only: [SN.gold] });   // the light along its top
  head.poly([[129, -35], [134, -36], [140, -6], [135, -4]], SN.pomD);                     // its fluffy band
  head.poly([[130, -34], [133, -35], [138, -7], [135, -6]], SN.pom, { only: [SN.pomD] });
  lump(head, 168, -5, 5, 5, SN.pom, SN.pomD);
  // the closed eye goes on top of the outline (a line of ink, not a shape): asleep, a contented arc and two lashes
  const headCv = head.done((P, X, Y) => {
    P.fill(X(119), Y(-31), X(128), Y(-25), (x, y) => { const d = Math.hypot(x + 0.5 - X(123.6), (y + 0.5 - Y(-30.4)) * 1.4); return d > 2.6 * R && d < 3.5 * R && y > Y(-28.6) ? INK : null; });
    for (const [x0, x1] of [[121, 120.4], [124.2, 124.2]]) P.line(X(x0), Y(-26.6), X(x1), Y(-25.4), INK), P.line(X(x0) + 1, Y(-26.6), X(x1) + 1, Y(-25.4), INK);
  });
  return (snorerArt = { legs: legs.done(), body: bodyCv, head: headCv });
}

// a crisp filled ellipse, in fine pixels (hires.js)
const snorerEll = (ctx, cx, cy, rx, ry, col) => fEll(ctx, cx, cy, rx + 0.5, ry + 0.5, col);

// Drawn with the origin at his heel on the floor. His belly rises and falls with every breath (and squashes when
// he's bounced on); the snore throws his mouth wide open, and pops the bubble in his nose.
function drawSnorer(ctx, giant) {
  const { ox, oy } = SNORER_ART, A = snorerPaint(), k = giant.t % SNORE_PERIOD;
  const breath = k < 110 ? Math.sin(k / 110 * Math.PI / 2) : Math.cos((k - 110) / 30 * Math.PI / 2);
  const squash = giant.squash > 0 ? Math.sin(giant.squash / 14 * Math.PI) * 0.16 : 0;
  ctx.globalAlpha = 0.35; snorerEll(ctx, 70, 0, 74, 3, '#0c0818'); ctx.globalAlpha = 1;   // his shadow on the floor
  ctx.drawImage(A.legs, -ox, -oy);
  ctx.save(); ctx.scale(1, 1 + breath * 0.07 - squash); ctx.drawImage(A.body, -ox, -oy); ctx.restore();
  ctx.drawImage(A.head, -ox, -oy);
  // the mouth: a dark O, gaping wide on the snore
  const [mx, my] = SNORER_MOUTH, open = k >= 108 ? 1.5 + Math.sin((k - 108) / 32 * Math.PI) * 3 : 1 + breath * 0.6;
  snorerEll(ctx, mx, my + 1, 5, open + 1, INK);
  snorerEll(ctx, mx, my + 1, 4, open, '#3a1830');
  if (open > 2) snorerEll(ctx, mx, my + open * 0.6, 2, open * 0.35, '#e8788a');
  // the nose bubble: swelling with each breath in, gone with the snore
  if (k < 108) {
    const r = 1 + k / 108 * 5, [nx, ny] = SNORER_NOSE, cx = nx - r * 0.3, cy = ny - r + 1;
    ctx.globalAlpha = 0.35; fBlob(ctx, cx, cy, r, '#cfe8ff'); ctx.globalAlpha = 0.9;
    fArc(ctx, cx, cy, r - 0.45, r + 0.2, 0, Math.PI * 2 - 0.001, '#e8f6ff');
    fEll(ctx, cx - r * 0.4, cy - r * 0.4, 0.7, 0.5, '#ffffff');
    ctx.globalAlpha = 1;
  }
}
