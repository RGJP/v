'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 6. ART — sprites (pixel arrays), tiles and backgrounds, all generated in code
// ═══════════════════════════════════════════════════════════════════════════
const INK = '#1b1530';
const withRows = (base, from, rows) => base.slice(0, from).concat(rows, base.slice(from + rows.length));

// Chickaroo: a round, squishy cream chick (plush-toy style): big ball body, tiny orange beak, ringed
// eyes, stubby wings and flat orange feet. Sprites are drawn procedurally into hard pixels (every
// shape is thresholded so nothing is anti-aliased), facing right, lit from the top-left.
const CHICK_PAL = {
  body: '#fff3c9', shade: '#f2d79c', light: '#ffffff', wing: '#ffffff', wingD: '#d9a85e',
  beak: '#ff9d3c', beakD: '#e0702a', foot: '#ffa64a', footD: '#e07a2c', cheek: '#ffa0a8', eye: '#2a2342',
  scarf: null, scarfD: null,
};
const chickPal = o => Object.assign({}, CHICK_PAL, o);
const PAL_FIRE = chickPal({ hat: 'fire' });
const PAL_HOT = chickPal({ body: '#fffbe6', shade: '#ffe9a8', hat: 'fire' });
const SUIT_PALS = {
  ice: chickPal({ hat: 'ice' }),
  gale: chickPal({ hat: 'gale' }),
  volt: chickPal({ hat: 'volt' }),
  quake: chickPal({ hat: 'quake' }),
};
// body size configs: W/H canvas, rx/ry body radii, s scales pixel offsets
// Chickaroo is painted twice as fine as the rest of the art (CHICK_R art pixels per game pixel): he is on screen all the time,
// and the cinematics scale him up
const CHICK_R = ART_R * 2;
const CHICK_SMALL = { W: 26, H: 20, rx: 8, ry: 7.2, s: 1 };
const CHICK_BIG = { W: 30, H: 29, rx: 9.5, ry: 10.5, s: 1.25 };
const CHICK_SMALL_DUCK = { W: 26, H: 14, rx: 8.8, ry: 5.2, s: 1 };
const CHICK_BIG_DUCK = { W: 30, H: 20, rx: 10.2, ry: 7.6, s: 1.25 };
// suits wear a hat, so their canvases get headroom (sprites are bottom-anchored, so nothing shifts)
const CHICK_HAT = Object.assign({}, CHICK_BIG, { H: 35 }), CHICK_HAT_DUCK = Object.assign({}, CHICK_BIG_DUCK, { H: 26 });
// poses: sx/sy squash, lift = body raised above the feet, feet = [dx, lift, rot?] each, wing = [dx, dy, rot],
// lean = face shifts forward, tail = scarf tail [dx, dy], eye = open|blink|shock
const SWIM_FOOT = 40 * Math.PI / 180;   // swim feet turn 40 degrees (counter-clockwise: pose uses -SWIM_FOOT)
const SWIM_KICK = 28 * Math.PI / 180;   // flutter kick: the two stroke frames scissor the feet this far each way
const CHICK_POSES = {
  idle: { sx: 1, sy: 1, lift: 0, feet: [[-3.5, 0], [3.5, 0]], wing: [0, 0.5, -0.35], lean: 0, tail: [0, 0], eye: 'open' },
  relic: { sx: 1, sy: 1, lift: 0, feet: [[-3.5, 0], [3.5, 0]], wing: [0, 0, 0.35], lean: 0, tail: [0, 0], eye: 'lookUp', face: 'front', relic: true },
  blink: { eye: 'blink' },
  // taking a bow to a standing ovation: happy ^ ^ eyes and rosy, blushing cheeks
  blush: { eye: 'happy', blush: true },
  // shoving something heavy: leaning in, feet braced back, eyes squeezed shut  > <
  strain: { sx: 1.04, sy: 0.96, lift: 0, feet: [[-6, 0], [0, 0]], wing: [1, -1, 0.2], lean: 1, tail: [-2, 0], eye: 'strain' },
  run0: { sx: 0.98, sy: 1.02, lift: 1, feet: [[-5, 0], [4, 2]], wing: [0, -1, 0.35], lean: 1, tail: [-2, -1] },
  run1: { sx: 1.04, sy: 0.96, lift: 0, feet: [[-1.5, 0], [1.5, 0]], wing: [0, 0, 0], lean: 1, tail: [-1, 0] },
  run2: { sx: 0.98, sy: 1.02, lift: 1, feet: [[-4, 2], [5, 0]], wing: [0, -1, 0.35], lean: 1, tail: [-2, -1] },
  run3: { sx: 1.04, sy: 0.96, lift: 0, feet: [[-1.5, 0], [1.5, 0]], wing: [0, 0, 0], lean: 1, tail: [-1, 0] },
  spinFront: { sx: 0.95, sy: 1.04, lift: 1.5, feet: [[-3, 2], [3, 2]], wing: [0, -3, 0.9], lean: 0, tail: [-1, 2], face: 'front' },
  // underwater strokes (see drawPlayer): A = wings pulled back, B = gliding
  swimA: { sx: 1.04, sy: 0.96, lift: 1, feet: [[3, 3.5, -SWIM_FOOT + SWIM_KICK], [-4.5, 0.5, -SWIM_FOOT - SWIM_KICK]], wing: [0, -1, 0.7], lean: 1, tail: [-2, 0] },
  swimB: { sx: 0.97, sy: 1.03, lift: 1, feet: [[3, 1.5, -SWIM_FOOT - SWIM_KICK], [-4.5, 2.5, -SWIM_FOOT + SWIM_KICK]], wing: [0, 1, -0.6], lean: 1, tail: [-2, 0] },
  spinBack: { sx: 0.95, sy: 1.04, lift: 1.5, feet: [[-3, 2], [3, 2]], wing: [0, -3, 0.9], lean: 0, tail: [-1, 2], face: 'back' },
  jump: { sx: 0.95, sy: 1.04, lift: 1.5, feet: [[-3, 2], [3.5, 1]], wing: [0, -3, 0.9], lean: 1, tail: [-1, 2] },
  fall: { sx: 1.05, sy: 0.96, lift: 1, feet: [[-5, 0], [5, 0]], wing: [0, -3.5, 1], lean: 0, tail: [-1, -3] },
  skid: { sx: 0.96, sy: 1.02, lift: 0, feet: [[1, 0], [6, 0]], wing: [1, -1, 0.1], lean: -1, tail: [3, -1] },
  crouch: { sx: 1, sy: 1, lift: 0, feet: [[-5, 0], [5, 0]], wing: [0, 0, -0.2], lean: 0, tail: [-1, 0] },
  // dozing: slumped a little, wings drooping, eyes shut (see Game.drawPlayer / SLEEP_AFTER)
  sleep: { sx: 1.04, sy: 0.95, lift: 0, feet: [[-3.5, 0], [3.5, 0]], wing: [0.5, 1.5, -0.6], lean: 0, tail: [0, 1], eye: 'sleep' },
  // teetering on a snowball: wide-eyed, windmilling the wings, weight thrown one way then the other
  teeterA: { sx: 1.02, sy: 0.98, lift: 0, feet: [[-5, 0], [2.5, 1.5]], wing: [0, -4, 1.2], lean: -1, tail: [2, -2], eye: 'shock' },
  teeterB: { sx: 0.98, sy: 1.02, lift: 0.5, feet: [[-2.5, 1.5], [5, 0]], wing: [0.5, -1, 0.3], lean: 1, tail: [-2, -1], eye: 'shock' },
  // the mid-air flap's downstroke: wings beaten down hard, feet tucked
  flap: { sx: 1.04, sy: 0.97, lift: 1.5, feet: [[-3, 2.5], [3, 2.5]], wing: [0, 1.5, -1], lean: 0, tail: [0, -2] },
  // 3-4's freefall, head first (drawn turned upside down): stretched long, wings flailing up and down by turns,
  // feet scissoring, the scarf streaming out behind in the wind, eyes wide on the turtle below
  diveA: { sx: 0.95, sy: 1.06, lift: 2, feet: [[-4, 4], [4, 1]], wing: [0, -4.5, 1.4], lean: 0, tail: [-3, 4], eye: 'shockUp' },
  diveB: { sx: 0.97, sy: 1.04, lift: 2, feet: [[-4, 1], [4, 4]], wing: [0, 2.5, -1.2], lean: 0, tail: [-4, 3], eye: 'shockUp' },
  glide: { sx: 1.02, sy: 0.96, lift: 0.8, feet: [[-3,0.5],[3,0.5]], wing: [-2.3,-1.5,0], lean: 0, tail: [-1,1], eye: 'open' },
  die: { sx: 1, sy: 1, lift: 2, feet: [[-3.5, 3], [3.5, 4]], wing: [0, -3.5, 1], lean: 0, tail: [-1, -3], eye: 'shock' },
};
// the same teeter, wide eyes glancing back over his shoulder (riding a snowball with an avalanche behind)
CHICK_POSES.lookA = Object.assign({}, CHICK_POSES.teeterA, { eye: 'shockBack' });
CHICK_POSES.lookB = Object.assign({}, CHICK_POSES.teeterB, { eye: 'shockBack' });
// ...and fixed dead ahead on where the ball is taking him
CHICK_POSES.aheadA = Object.assign({}, CHICK_POSES.teeterA, { eye: 'shockAhead' });
CHICK_POSES.aheadB = Object.assign({}, CHICK_POSES.teeterB, { eye: 'shockAhead' });
CHICK_POSES.sandA = Object.assign({}, CHICK_POSES.teeterA, { eye: 'shockDown' });
CHICK_POSES.sandB = Object.assign({}, CHICK_POSES.teeterB, { eye: 'shockDown' });

// Fine pixels (hires.js) out to a HiRes canvas: an `outline`-px ink line round the silhouette, the empty margin trimmed off in
// whole game pixels (the same off both sides, so it stays centred; only empty rows off the top: sprites are bottom-anchored)
function chickFinish(buf, W, H, R, PAD, outline = 1.5 * R / ART_R) {   // (a fine line: 3 art px at 6x)
  let src = buf;
  for (let n = 0; n < outline; n++) {   // (alternating 4- and 8-neighbour growth: the line stays round, not diamond-cornered)
    const out = src.slice(), at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x], diag = n % 2 === 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!src[y * W + x] && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) || (diag && (at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1))))) out[y * W + x] = INK;
    src = out;
  }
  let minX = W, maxX = -1, minY = H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src[y * W + x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); }
  const side = Math.min(PAD, Math.floor(minX / R), Math.floor((W - 1 - maxX) / R)) * R, top = Math.min(PAD, Math.floor(minY / R)) * R;
  const ow = W - side * 2, oh = H - top, out = makeCanvas(ow, oh), og = out.getContext('2d'), img = og.createImageData(ow, oh), px = new Uint32Array(img.data.buffer), cols = {};
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const c = src[(y + top) * W + x + side];
    if (c) px[y * ow + x] = cols[c] || (cols[c] = (n => (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0)(parseInt(c.slice(1), 16)));
  }
  // a soft edge: one more ring of ink round the silhouette, faded by how much of it is ink next door (so the stair-steps blend away)
  if (R > ART_R) {
    const inkPx = (0xff000000 | (parseInt(INK.slice(5, 7), 16) << 16) | (parseInt(INK.slice(3, 5), 16) << 8) | parseInt(INK.slice(1, 3), 16)) >>> 0, rim = [];
    const has = (x, y) => x >= 0 && y >= 0 && x < ow && y < oh && px[y * ow + x] !== 0;
    for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) if (!px[y * ow + x]) {
      const n = has(x - 1, y) + has(x + 1, y) + has(x, y - 1) + has(x, y + 1), d = has(x - 1, y - 1) + has(x + 1, y - 1) + has(x - 1, y + 1) + has(x + 1, y + 1);
      if (n + d) rim.push([y * ow + x, Math.min(1, (n * 0.3 + d * 0.12) + 0.08)]);
    }
    const a8 = (inkPx & 0xffffff) >>> 0;
    for (const [i, a] of rim) px[i] = ((Math.round(a * 235) << 24) | a8) >>> 0;
  }
  og.putImageData(img, 0, 0);
  return hiRes(out, R);
}
// a hard-pixel shape painter for the fine sprites: shapes are placed in game pixels and filled in art pixels.
// paint(shape, colour, only, dither): `only` = paint just over these colours (null = empty), `dither` = keep that
// ordered share of the pixels (a soft blend between two tones, as in 3-4's bedroom)
function chickPainter(W, H, R) {
  const buf = new Array(W * H).fill(null);
  const scratch = makeCanvas(W, H), sg = scratch.getContext('2d', { willReadFrequently: true });
  const paint = (draw, color, only, dither) => {
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, W, H); sg.setTransform(R, 0, 0, R, 0, 0);
    sg.fillStyle = '#000'; sg.beginPath(); draw(sg); sg.fill();
    const d = sg.getImageData(0, 0, W, H).data;
    for (let i = 0; i < W * H; i++) {
      if (d[i * 4 + 3] < 110 || (only && !only.includes(buf[i]))) continue;
      if (dither !== undefined && 0.5 >= dither) continue;
      buf[i] = color;
    }
  };
  const ell = (x, y, rx, ry, rot = 0) => g => g.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), rot, 0, Math.PI * 2);
  const poly = pts => g => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
  // an arc band (r0..r1) from angle a0 to a1 (clockwise, canvas angles: 0 = right, PI/2 = down)
  const arc = (x, y, r0, r1, a0, a1) => g => { g.arc(x, y, r1, a0, a1); g.arc(x, y, r0, a1, a0, true); g.closePath(); };
  // a thick stroke through the points
  const stroke = (pts, w) => g => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], l = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / l * w / 2, ny = (x1 - x0) / l * w / 2;
      g.moveTo(x0 + nx, y0 + ny); g.lineTo(x1 + nx, y1 + ny); g.lineTo(x1 - nx, y1 - ny); g.lineTo(x0 - nx, y0 - ny); g.closePath();
      g.moveTo(x1 + w / 2, y1); g.arc(x1, y1, w / 2, 0, Math.PI * 2);
    }
    g.moveTo(pts[0][0] + w / 2, pts[0][1]); g.arc(pts[0][0], pts[0][1], w / 2, 0, Math.PI * 2);
  };
  return { buf, paint, ell, poly, arc, stroke };
}

function chickSprite(cfg, poseName, pal, eyeOverride = null, mouth = null, style = null) {
  const p = Object.assign({}, CHICK_POSES.idle, CHICK_POSES[poseName]);
  // painted ART_R times finer than the game (hires.js), on a canvas with spare room above and to the sides, so the
  // tuft, wings and hats (and the outline round them) never get clipped; the empty margin is trimmed off at the end.
  // Everything is placed (in game pixels) relative to the centre and the bottom, so the padding moves nothing.
  const R = CHICK_R, PAD = 4, GW = cfg.W + PAD * 2, GH = cfg.H + PAD, W = GW * R, H = GH * R, s = cfg.s;
  const { buf, paint, ell, poly, arc, stroke } = chickPainter(W, H, R);

  const rx = cfg.rx * p.sx, ry = cfg.ry * p.sy, cx = GW / 2 + (p.lean < 0 ? -0.5 : 0);
  const bottom = GH - 3.6 - p.lift, cy = bottom - ry;
  const footY = GH - 2.3;
  const BODY = [pal.body, pal.shade, pal.light];
  const wingDark = pal.wingD;
  const wingShade = pal.shade;
  const wingLight = pal.wing;

  // scarf tail behind the body
  if (pal.scarf) {
    const ty = cy + ry * 0.38;
    paint(poly([[cx - rx * 0.7, ty - 1.2], [cx - rx - 2.5 * s + p.tail[0], ty + p.tail[1] - 1], [cx - rx - 3.5 * s + p.tail[0], ty + p.tail[1] + 2], [cx - rx * 0.7, ty + 2.2]]), pal.scarfD);
  }
  // feet (behind the body)
  p.feet.forEach(([dx, lf, rot = 0]) => {   // optional rot (radians): splayed kicking feet when swimming
    const fx = cx + dx * s + p.lean * 0.5, fy = footY - lf;
    // a stubby little leg up from the foot into the body (behind it), so a foot never floats loose below him
    const hx = cx + clamp(dx * s * 0.55, -rx * 0.6, rx * 0.6), hy = cy + ry * Math.sqrt(1 - ((hx - cx) / rx) ** 2) - 1.2;
    const lx = fx - (pal.mask && !rot ? 1.5 * s : 0), ly = fy - 0.5, lw = 0.6 * s, nl = Math.hypot(hx - lx, hy - ly) || 1, ox = (hy - ly) / nl * lw, oy = -(hx - lx) / nl * lw;
    paint(poly([[lx - ox, ly - oy], [hx - ox, hy - oy], [hx + ox, hy + oy], [lx + ox, ly + oy]]), pal.footD);
    paint(poly([[lx - ox * 0.3, ly - oy * 0.3], [hx - ox * 0.3, hy - oy * 0.3], [hx + ox * 0.5, hy + oy * 0.5], [lx + ox * 0.5, ly + oy * 0.5]]), pal.foot);
    if (pal.mask) {
      // scuba gear: frog flippers seen side-on. The orange foot stays as the ankle, and a webbed
      // green fin grows out of it: narrow at the heel, fanning out to a three-toed scalloped tip.
      // Standing, they lie flat pointing forward; swimming, they trail behind and kick (rot = kick).
      const swim = rot !== 0, ang = swim ? Math.PI * 0.84 + (rot + SWIM_FOOT) : 0;
      const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
      const hx = fx - (swim ? 0 : 1.5 * s), hy = fy, L = (swim ? 6.5 : 5.5) * s, w0 = 0.9, w1 = swim ? 2.4 : 1.6;
      const at = (k, w) => [hx + ux * L * k + nx * w, hy + uy * L * k + ny * w];
      const fin = (grow, col) => paint(poly([at(0, -w0 - grow), at(1, -w1 - grow), at(1.06, 0), at(1, w1 + grow), at(0, w0 + grow)]), col);
      fin(0.7, '#14532f');
      fin(0, '#3fcf74');
      paint(poly([at(0.15, -0.35), at(0.95, -0.35), at(0.95, 0.35), at(0.15, 0.35)]), '#2a9a56');   // centre rib
      for (const w of [-w1 * 0.8, w1 * 0.8]) paint(ell(...at(1, w), 0.75, 0.75), '#3fcf74');      // outer toes
      paint(ell(hx, hy - 0.3, 1.8 * s, 1.2), pal.footD); paint(ell(hx, hy - 0.6, 1.5 * s, 0.9), pal.foot);   // ankle
      return;
    }
    paint(ell(fx, fy, 2.6 * s, 1.4, rot), pal.footD);
    paint(ell(fx - 0.15, fy - 0.35, 2.4 * s, 1.05, rot), pal.foot);
    paint(ell(fx - 0.6 * s, fy - 0.75, 1.2 * s, 0.35, rot), '#ffc98a', [pal.foot]);   // a glint along the top of the foot
  });
  // tuft
  const topY = cy - ry;
  paint(ell(cx + 0.5 + p.lean * 0.4, topY + 0.7, 1.1, 1.9, 0.5), pal.shade);
  paint(ell(cx - 1.4 + p.lean * 0.3, topY + 1.0, 0.9, 1.6, -0.5), pal.shade);
  paint(ell(cx + 0.35 + p.lean * 0.4, topY + 0.85, 0.75, 1.55, 0.5), pal.body, [pal.shade]);
  paint(ell(cx - 1.55 + p.lean * 0.3, topY + 1.1, 0.6, 1.3, -0.5), pal.body, [pal.shade]);
  // far wing, sticking out the other side behind the body
  const wb = p.wing, wy0 = cy + ry * 0.1 + wb[1] * s;
  if (p.relic) for (const side of [-1, 1]) {
    // Small rounded wings at his sides; his upward gaze carries the collection pose.
    const wx = cx + side * rx * 0.95, rot = -side * wb[2];
    paint(ell(wx, wy0, 4.2 * s, 2.3 * s, rot), wingDark);
    paint(ell(wx - 0.2, wy0 - 0.4, 3.5 * s, 1.7 * s, rot), wingShade, [wingDark]);
    paint(ell(wx - 0.4, wy0 - 0.6, 3.1 * s, 1.35 * s, rot), wingLight, [wingShade]);
  }
  else {
  paint(ell(cx + rx * 0.95, wy0, 4 * s, 2.2 * s, -wb[2]), wingDark);
  paint(ell(cx + rx * 0.95 - 0.2, wy0 - 0.4, 3.3 * s, 1.6 * s, -wb[2]), wingShade, [wingDark]);
  paint(ell(cx + rx * 0.95 - 0.4, wy0 - 0.6, 2.9 * s, 1.25 * s, -wb[2]), wingLight, [wingShade], 0.5);
  }
  // scuba tank strapped to his back (behind the body): a yellow cylinder with a silver valve on top
  if (pal.mask) {
    const tx = cx - rx * 0.82, ty = cy - ry * 0.05, th = ry * 0.85, tw = 2.4 * s;
    paint(ell(tx, ty, tw, th), '#b8861a');
    paint(ell(tx - 0.4, ty - 0.3, tw - 0.9, th - 0.9), '#ffc83a', ['#b8861a']);
    paint(poly([[tx - 1.4, ty - th * 0.2], [tx + 0.4, ty - th * 0.2], [tx + 0.4, ty - th * 0.05], [tx - 1.4, ty - th * 0.05]]), '#fff0a8', ['#ffc83a']);
    paint(poly([[tx - 1, ty - th - 2], [tx + 1, ty - th - 2], [tx + 1, ty - th + 0.5], [tx - 1, ty - th + 0.5]]), '#9aa3b5');
  }
  // body: a plush ball. The shade underneath, the body colour nudged up-left with a dithered band between them,
  // and a soft glossy highlight up on the top-left
  paint(ell(cx, cy, rx, ry), pal.shade);
  paint(ell(cx - 0.35, cy - 0.45, rx - 0.45, ry - 0.65), pal.body, [pal.shade], 0.5);
  paint(ell(cx - 0.7, cy - 0.9, rx - 0.9, ry - 1.3), pal.body, [pal.shade]);
  paint(ell(cx - rx * 0.36, cy - ry * 0.52, rx * 0.42, ry * 0.27, -0.5), pal.light, [pal.body], 0.45);
  paint(ell(cx - rx * 0.38, cy - ry * 0.55, rx * 0.28, ry * 0.15, -0.5), pal.light, [pal.body]);
  // scarf band across the lower face
  if (pal.scarf) {
    const by = cy + ry * 0.5;
    paint(poly([[cx - rx - 1, by - 1.5], [cx + rx + 1, by - 1.5], [cx + rx + 1, by + 1.3], [cx - rx - 1, by + 1.3]]), pal.scarf, BODY);
    paint(poly([[cx - rx - 1, by + 0.4], [cx + rx + 1, by + 0.4], [cx + rx + 1, by + 1.3], [cx - rx - 1, by + 1.3]]), pal.scarfD, [pal.scarf]);
  }
  // Worn hats use the same fine material drawings as the standalone and rolling versions.
  if(pal.hat)paintPowerHat(buf,W,H,R,pal.hat,cx+p.lean*0.5,cy-ry,1,1,0,1,p.face==='back');
  // near wing: stuck out from the side of the body like a little arm
  const wx = cx - rx * 0.95 + wb[0] * s, wy = wy0;
  // only where it pokes out past the body, so no seam line runs across the face
  if(!p.relic){
  paint(ell(wx, wy, 4.2 * s, 2.3 * s, wb[2]), wingDark, [null]);
  paint(ell(wx - 0.2, wy - 0.4, 3.5 * s, 1.7 * s, wb[2]), wingShade, [wingDark]);
  paint(ell(wx - 0.4, wy - 0.6, 3.1 * s, 1.35 * s, wb[2]), wingLight, [wingShade], 0.55);
  paint(ell(wx - 0.6, wy - 0.8, 2.5 * s, 1 * s, wb[2]), wingLight, [wingShade]);
  }
  // face: eyes set wide and low, beak between them; the face turns right (3/4 view)
  const fcx = p.face === 'front' ? cx : cx + rx * 0.2 + p.lean * 0.5, ey = cy - ry * 0.02;
  const frontFace = p.face === 'front';
  const e1 = frontFace ? fcx - rx * .34 : Math.round(fcx - rx * 0.36 - 1.5) + 1.5;
  const e2 = frontFace ? fcx + rx * .34 : Math.round(fcx + rx * 0.3 - 1.5) + 1.5, eyeY = Math.round(ey - 1.5) + 1.5;
  const big = s > 1, k = big ? 1.1 : 1, E = pal.eye, WH = '#ffffff';
  const noFace = p.face === 'back';   // spinning: seen from behind, just a plain fluffy back
  const eye = eyeOverride || p.eye;   // expression only: keep the pose, feet and beak
  if (!noFace) {
    // scuba mask (water levels): tinted glass over both eyes, coral frame and strap
    if (pal.mask) {
      const x0 = e1 - 3.5, x1 = e2 + 3.5, y0 = eyeY - 3.5, y1 = eyeY + 3.5;
      paint(poly([[cx - rx - 1, y0 + 2], [x0, y0 + 2], [x0, y0 + 3.4], [cx - rx - 1, y0 + 3.4]]), '#3a3a5a', BODY);   // strap
      paint(poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), '#ff5d73');
      paint(poly([[x0 + 0.7, y0 + 0.7], [x1 - 0.7, y0 + 0.7], [x1 - 0.7, y1 - 0.7], [x0 + 0.7, y1 - 0.7]]), '#bfefff');
      paint(stroke([[x0 + 1.6, y0 + 2.4], [x0 + 3, y0 + 1.2]], 0.45), '#ffffff');
    }
    // cheek (and a proper blush: both cheeks, bigger and redder, taking a bow)
    if (p.blush) {
      paint(ell(e1 - 2.6, eyeY + 2.4, 2.4, 1.2), '#ff6a84', BODY, 0.5); paint(ell(e1 - 2.6, eyeY + 2.4, 1.7, 0.85), '#ff6a84', BODY);
      paint(ell(e2 + 2.2, eyeY + 2.4, 1.6, 1.1), '#ff6a84', BODY, 0.5); paint(ell(e2 + 2.2, eyeY + 2.4, 1.1, 0.75), '#ff6a84', BODY);
    } else {
      paint(ell(e1 - 2.2, eyeY + 2.5, 1.9, 1), pal.cheek, BODY, 0.4); paint(ell(e1 - 2.2, eyeY + 2.5, 1.25, 0.6), pal.cheek, BODY);
    }
    const eyes = (f, a = e1, b = e2) => { f(a, 1); f(b, -1); };
    if (eye === 'sleep') eyes(x => paint(arc(x, eyeY - 0.3, 0.95 * k, 1.6 * k, Math.PI * 0.12, Math.PI * 0.88), E));   // shut, like a contented smile
    else if (eye === 'strain') eyes((x, d) => paint(stroke([[x - 1.2 * d, eyeY - 1.4], [x + 1.1 * d, eyeY], [x - 1.2 * d, eyeY + 1.4]], 0.75), E));   // > <
    else if (eye === 'happy') eyes(x => paint(arc(x, eyeY + 0.9, 0.95 * k, 1.6 * k, Math.PI * 1.12, Math.PI * 1.88), E));   // ^ ^
    else if (eye === 'blink') eyes(x => paint(poly([[x - 1.6, eyeY + 0.6], [x + 1.6, eyeY + 0.6], [x + 1.4, eyeY + 1.3], [x - 1.4, eyeY + 1.3]]), E));
    else if (eye === 'burp') eyes(x => {   // huge white eyes with pinprick pupils: surprised by the size of his own belch
      const r = big ? 4 : 3.4; paint(ell(x, eyeY - 1, r, r * 1.05), E); paint(ell(x, eyeY - 1, r - 0.75, r * 1.05 - 0.75), WH); paint(ell(x, eyeY - 0.6, 0.55, 0.55), E);
    }, e1 - 1, e2 + 1);
    else if (eye.startsWith('shock')) {
      // big wide-open eyes (white ring, tiny pupil); shockBack / shockAhead / shockDown / shockUp: the pupils darted
      // to the back / to the front / down / up (shockUpAhead: toward the Reaper's elevated eyes)
      const [px, py] = { shock: [0, 0], shockBack: [-1, 0], shockAhead: [1, 0], shockUpAhead: [1, -0.75], shockDown: [0, 1], shockUp: [0, -1] }[eye], r = big ? 3.5 : 3;
      const rim = style?.eyeStroke ?? 0.8;
      eyes(x => { paint(ell(x, eyeY, r, r), E); paint(ell(x, eyeY, r - rim, r - rim), WH); paint(ell(x + px * 1.2, eyeY + py * 1.2, 0.75, 0.85), E); });
    } else if (eye === 'lookUp') eyes((x, d) => {
      // His normal eye outline, with full-sized pupils lifted toward the overhead stone.
      paint(ell(x, eyeY, 1.35 * k, 1.7 * k), E);
      paint(ell(x, eyeY, 1.05 * k, 1.4 * k), WH);
      const px = x + d * 0.15, py = eyeY - 0.55 * k;
      paint(ell(px, py, 1.12 * k, 1.5 * k), E, [WH]);
      paint(ell(px - 0.35, py - 0.45, 0.45, 0.45), WH, [E]);
    });
    else eyes(x => {   // small plush eyes, a white glint up-left and a speck of light below
      paint(ell(x, eyeY, 1.35 * k, 1.7 * k), E);
      paint(ell(x - 0.4, eyeY - 0.55, 0.55, 0.55), WH);
      paint(poly([[x + 0.35, eyeY + 0.55], [x + 0.75, eyeY + 0.55], [x + 0.75, eyeY + 0.95], [x + 0.35, eyeY + 0.95]]), WH);
    });
    // beak: light top, darker underside (open for a chew, burp, or jaunty whistle)
    const bx = frontFace ? fcx : Math.round(fcx + 0.5), by = Math.round(ey + 1.5 + (big ? 1 : 0)) + (mouth === 'burp' ? 1 : 0);
    const wide = mouth === 'burp' ? (big ? 8 : 6) : big || p.eye.startsWith('shock') && !mouth ? (big ? 6 : 5) : 4;
    const mx = bx - Math.floor(wide / 2) + wide / 2, hw = wide / 2;
    if (mouth === 'whistleOpen' || mouth === 'whistleMid') {
      const open = mouth === 'whistleOpen', wx = mx + (big ? 1.45 : 1.15);
      const holeR = open ? (big ? 1.35 : 1.08) : (big ? 0.85 : 0.68);
      const lowY = by + (open ? (big ? 3.35 : 2.75) : (big ? 2.15 : 1.75));
      paint(ell(wx + 0.25, lowY, hw * 0.78, big ? 0.95 : 0.8, 0.16), pal.beakD);
      paint(ell(wx + 0.15, by + (open ? -0.1 : 0.25), hw * 0.96, big ? 1.1 : 0.9, -0.24), pal.beak);
      paint(poly([[wx - hw * 0.55, by + (open ? -0.45 : -0.1)], [wx + 0.65, by + (open ? -0.65 : -0.25)], [wx + 0.65, by + (open ? -0.05 : 0.25)], [wx - hw * 0.55, by + (open ? 0.05 : 0.35)]]), '#ffd49a', [pal.beak]);
      paint(ell(wx + (big ? 0.72 : 0.58), by + (open ? (big ? 1.62 : 1.32) : (big ? 1.12 : 0.92)), holeR, holeR * 1.12), '#240b16');
      if (open) paint(ell(wx + (big ? 0.65 : 0.52), lowY - (big ? 0.95 : 0.75), holeR * 0.62, 0.42), '#ff8f99', ['#240b16']);
    } else {
      const gape = mouth === 'burp' ? (big ? 3 : 2) : mouth === 'chewOpen' ? 1 : 0;
      const lowerY = by + (big || wide > 4 ? 2 : 1) + gape;
      paint(ell(mx, lowerY + 0.1, hw * 0.62, 0.75), pal.beakD);
      if (gape) { paint(ell(mx, by + 1.1 + gape / 2, hw * 0.8, gape / 2 + 0.4), '#4a1e28'); if (mouth === 'burp') paint(ell(mx, lowerY - 0.5, hw * 0.55, 0.7), '#ff9399', ['#4a1e28']); }
      paint(ell(mx, by + 0.75, hw, big ? 1.2 : 0.95), pal.beak);
      paint(poly([[mx - hw + 0.8, by + 0.3], [mx - hw + 1.8, by + 0.3], [mx - hw + 1.8, by + 0.65], [mx - hw + 0.8, by + 0.65]]), '#ffd49a', [pal.beak]);
    }
  }
  const img = chickFinish(buf, W, H, R, PAD, style?.outline);
  // Face anchors relative to the sprite's centre and feet, unaffected by transparent trimming.
  img.eyes = [[e1 - GW / 2, eyeY - GH], [e2 - GW / 2, eyeY - GH]];
  return img;
}

// Rolling: Chickaroo tucked up into a ball of radius r, his features turned by angle `a` (clockwise) and facing `f`
// (1 right, -1 left). The light stays put (top-left) while the beak, eye, wing, feet, tuft and hat go round with the
// roll: that's what makes it read as a ball really rolling. Fine pixels, ink outline, a square canvas centred on it.
const BALL_STEPS = 16;
function chickBall(r, pal, a, f) {
  const R = CHICK_R, GS = Math.ceil(r * 2) + (pal.hat ? 14 : 8), S = GS * R, c = GS / 2;
  const { buf, paint, ell } = chickPainter(S, S, R);
  const ca = Math.cos(a), sa = Math.sin(a);
  const at = (dx, dy) => [c + dx * f * ca - dy * sa, c + dx * f * sa + dy * ca];   // a point on him (facing right, back up) as the ball turns
  const turn = rot => a + rot * f;
  const BODY = [pal.body, pal.shade, pal.light];
  // the feather ball, lit from the top-left whichever way it's turned
  paint(ell(c, c, r, r), pal.shade);
  paint(ell(c - r * 0.08, c - r * 0.09, r * 0.92, r * 0.91), pal.body, [pal.shade], 0.5);
  paint(ell(c - r * 0.16, c - r * 0.18, r * 0.84, r * 0.82), pal.body, [pal.shade]);
  paint(ell(c - r * 0.4, c - r * 0.44, r * 0.42, r * 0.3, -0.6), pal.light, [pal.body], 0.45);
  paint(ell(c - r * 0.4, c - r * 0.44, r * 0.3, r * 0.2, -0.6), pal.light, [pal.body]);
  // the tuft, poking out of the top of his head
  paint(ell(...at(r * 0.15, -r * 0.98), 1.1, 1.8, turn(0.4)), pal.body);
  // ...and bed hair: tousled wisps of fluff sticking out all round the edge, uneven, turning with him (lit like the rest)
  for (const [phi, len] of [[-0.6, 1.7], [0.55, 1.1], [1.5, 1.5], [2.6, 1.2], [3.6, 1.6], [4.6, 1.1], [5.4, 1.4]]) {
    const ux = Math.sin(phi), uy = -Math.cos(phi), d = r + len * 0.15;
    const [x, y] = at(ux * d, uy * d), wa = Math.atan2(y - c, x - c), lit = Math.cos(wa) * -0.6 + Math.sin(wa) * -0.8;
    paint(ell(x, y, len, 1.15, wa + 0.5 * f), lit > 0.2 ? pal.body : pal.shade, [null]);
  }
  // The full hat turns with him while rolling, with extra transparent canvas room for its tip.
  if(pal.hat){const [hx,hy]=at(r*0.05,-r*0.82);paintPowerHat(buf,S,S,R,pal.hat,hx,hy,0.58,0.58,a,f);}
  // feet tucked in under him
  for (const dx of [-0.3, 0.2]) { paint(ell(...at(r * dx, r * 0.84), 1.5, 1, turn(0)), pal.footD); paint(ell(...at(r * dx, r * 0.8), 1.2, 0.7, turn(0)), pal.foot, [pal.footD]); }
  // face tucked down: eye squeezed shut, a blush, beak
  paint(ell(...at(r * 0.36, -r * 0.2), 1.6, 0.6, turn(0.2)), pal.eye, BODY);
  paint(ell(...at(r * 0.1, r * 0.2), 1.3, 0.6, turn(0)), pal.cheek, BODY, 0.6);
  paint(ell(...at(r * 0.8, r * 0.12), 1.4, 1, turn(0.3)), pal.beakD);
  paint(ell(...at(r * 0.8, r * 0.02), 1.8, 1.1, turn(0.3)), pal.beak);
  return chickFinish(buf, S, S, R, 0);
}

// Hedgehog (Spikelet), side-on facing right, low on four short paws (27x14): a mantle of
// quills raked back over the body (Q/q, pale tips T), a pale face (F/f) with a long snout
// and black nose (N), cream belly (B), dark paws (P).
const HEDGEHOG = [
  '.....T...T...T.............',
  '...T.KT.KT.KT.T............',
  '..KTKqQKqQKqQKTK...........',
  '.TKqQQqQQqQQqQQqK..........',
  '.KQQqQQqQQqQQqQQqK.........',
  'TKqQQqQQqQQqQQqQQqKKK......',
  'KQQqQQqQQqQQqQQqQKfFFKK....',
  'TqQQqQQqQQqQQqQQKfFFFFFK...',
  'KQqQQqQQqQQqQQqKfFFKWFFFK..',
  'KQQqQQqQQqQQqQQKfFFKKFFFFKK',
  'KKQQqQQqQQqQQqKfFFFFFFFFFNN',
  '.KBBBBBBBBBBBBBKffFFFFfffKK',
  '..KKPPKKPPKKKKKPPKPPKKKK...',
  '...KPPK.KPPK...KPPKPPK.....',
  '...KKKK.KKKK...KKKKKKK.....',
];
const HEDGEHOG_FEET_B = ['..KKKPPKKPPKKKKKKPPKPPKKK..', '....KPPK.KPPK....KPPKPPK...', '....KKKK.KKKK....KKKKKKK...'];
// Glowshroom: the cave's own walker, a scowling little mushroom (18x20, slanted brows, tiny eyes, frown) with a bioluminescent spotted cap
const GLOWSHROOM = [
  '.....KKKKKKKK.....',
  '...KKLLLLLLLLKK...',
  '..KLLLSSLLLLLLcK..',
  '.KLLSSSSLLLSSLLcK.',
  'KLLLSSSSLLLSSSLccK',
  'KLLLLSSLLLLLSSLccK',
  'KCLLLLLLLLLLLLcccK',
  'KCLLLSSLLLLSSLcccK',
  '.KccccccccccccccK.',
  '...KbbbbbbbbbbK...',
  '...KBBBBBBBBBBK...',
  '...KBKKBBBBKKBK...',
  '...KBBWKBBKWBBK...',
  '...KBPBBBBBBPBK...',
  '...KBBBKKKKBBBK...',
  '...KBBKBBBBKBBK...',
  '....KBBBBBBBbK....',
  '.....KKKKKKKK.....',
  '....KDDK..KDDK....',
  '....KKKK..KKKK....',
];
const GLOWSHROOM_FEET_B = ['...KDDK....KDDK...', '...KKKK....KKKK...'];   // its second walk step
// Grumblet: a grumpy walking acorn (cap C/c/L fixed, body A/a tinted per theme)
const GRUMBLET = [   // 18 x 17: a touch bigger than most foes, so its mean little face reads cleanly
  '.........KK.......',
  '.........KcK......',
  '.....KKKKKKKKK....',
  '...KKCLCLCLCLCKK..',
  '..KCLCLCLCLCLCLcK.',
  '..KCCCCCCCCCCCCcK.',
  '..KKKKKKKKKKKKKKK.',
  '...KAKKAAAAKKAaK..',   // eyebrows: \ /
  '...KAWWKAAKWWAaK..',
  '...KAWKWAAWKWAaK..',   // 3x3 eyes, pupils in the middle
  '...KAWKWAAWKWAaK..',
  '...KPAAAAAAAAPaK..',
  '....KAAAKKKAAaK...',
  '.....KaaaaaaaK....',
  '......KKKKKKK.....',
  '....KDDK...KDDK...',
  '....KKKK...KKKK...',
];
const GRUMBLET_FEET_B = ['...KDDK.....KDDK..', '...KKKK.....KKKK..'];   // second step of the walk cycle
// Shellback: an armoured pill bug, facing right; curls into a banded ball when stomped
const SHELLBACK = [
  '................',
  '................',
  '....KKKKKKK.....',
  '..KKLGgLGgLKK...',
  '.KLGgGGgGGgGLK..',
  'KGGgGGgGGgGGgGK.',
  'KGGgGGgGGgGGgKKK',
  'KGGgGGgGGgGGKSSK',
  'KGGgGGgGGgGGKSWK',
  'KGGgGGgGGgGGKSKK',
  'KRRRRRRRRRRRKSSK',
  '.KRRRRRRRRRRRKK.',
  '..KKKKKKKKKKKK..',
  '..KDKDKDKDKDK...',
  '..KK.KK.KK.KK...',
  '................',
];
const SHELLBACK_LEGS_B = ['...KDKDKDKDKDK..', '...KK.KK.KK.KK..', '................'];
const SHELL = [
  '.....KKKKKK.....',
  '...KKLGgGGgKK...',
  '..KLGgGGgGGgGK..',
  '.KLGgGGgGGgGGgK.',
  '.KGgGGgGGgGGgGK.',
  'KGGgGGgGGgGGgGGK',
  'KGGgGGgGGgGGgGGK',
  '.KGgGGgGGgGGgGK.',
  '..KgGGgGGgGGgK..',
  '...KKKKKKKKKK...',
];
const SHELL_B = [
  '.....KKKKKK.....',
  '...KKLgGGgGKK...',
  '..KLgGGgGGgGGK..',
  '.KLgGGgGGgGGgGK.',
  '.KgGGgGGgGGgGGK.',
  'KGgGGgGGgGGgGGgK',
  'KGgGGgGGgGGgGGgK',
  '.KgGGgGGgGGgGGK.',
  '..KGGgGGgGGgGK..',
  '...KKKKKKKKKK...',
];
const FLUTTER_UP = [
  '.K............K.',
  'KVK..........KVK',
  'KVVK..K..K..KVVK',
  'KVVVKKVKKVKKVVVK',
  'KVVVVVVVVVVVVVVK',
  '.KVVVVWRVWRVVVK.',
  '..KVVVVVVVVVVK..',
  '...KvVVKKVVvK...',
  '....KvVVVVvK....',
  '.....KKVVKK.....',
  '.......KK.......',
  '................',
];
const FLUTTER_DOWN = [
  '................',
  '......K..K......',
  '.....KVKKVK.....',
  '....KVVVVVVK....',
  '...KVVWRWRVVK...',
  '..KVVVVVVVVVVK..',
  '.KVVVKVVVVKVVVK.',
  'KVVVK.KVVK.KVVVK',
  'KVVK...KK...KVVK',
  'KVK..........KVK',
  'KK............KK',
  '................',
];
// Broad-winged bird art, side-on facing left. Palette keys: H head, E eye, Y beak, B body, b belly shade, G wing, X wing tips, T tail.
const BIRD_UP = [
  '..............K.K.K.....',
  '.............KXKXKXK....',
  '............KXGXGXGK....',
  '...........KGGGGGGK.....',
  '..........KGGGGGGGK.....',
  '.........KGGGGGGGK......',
  '...KKK..KGGGGGGGK.......',
  '..KHHHKKGGGGGGGK........',
  '.KYHEHHKBBBBBBBBKKKK....',
  'KYYKHHHBBBBBBBBBBBTTK...',
  '.K.KHHBBBBBBBBBBBKTTTK..',
  '....KKbbbbbbbbbbKKTTTTK.',
  '......KKKKKKKKKKK.KKKKK.',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];
const BIRD_DOWN = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '...KKK..................',
  '..KHHHK.................',
  '.KYHEHHKKKKKKKKKKKKK....',
  'KYYKHHHBBBBBBBBBBBTTK...',
  '.K.KHHBBGGGGGGGBBKTTTK..',
  '....KKbKGGGGGGGGKKTTTTK.',
  '.......KGGGGGGGGK.KKKKK.',
  '........KGGGGGGGGK......',
  '.........KGGGGGGGK......',
  '..........KXGXGXGK......',
  '...........KXKXKXK......',
  '............K.K.K.......',
];
// Snapvine: a chomping log-worm that pops out of hollow logs
const VINE_OPEN = [
  '...KKK....KKK...',
  '..KWWWK..KWWWK..',
  '..KWKWKKKKWKWK..',
  '.KFFFFFFFFFFFFK.',
  'KFFfFFFFFFFFfFFK',
  'KFFKKKKKKKKKKFFK',
  'KFKWMWMMMMWMWKFK',
  'KFKMMMMMMMMMMKFK',
  'KFKWMWMMMMWMWKFK',
  'KFFKKKKKKKKKKFFK',
  '.KFFfFFFFFFfFFK.',
  '..KKFFFFFFFFKK..',
];
const VINE_SHUT = [
  '...KKK....KKK...',
  '..KWWWK..KWWWK..',
  '..KWKWKKKKWKWK..',
  '.KFFFFFFFFFFFFK.',
  'KFFfFFFFFFFFfFFK',
  'KFFFFFFFFFFFFFFK',
  'KFFKKKKKKKKKKFFK',
  'KFFKWKWKWKWKKFFK',
  'KFFFKKKKKKKKFFFK',
  'KFFfFFFFFFFFfFFK',
  '.KFFfFFFFFFfFFK.',
  '..KKFFFFFFFFKK..',
];
const VINE_STEM = [
  '.....KKKKKK.....',
  '....KLLLLLlK....',
  '....KLLLLLlK....',
  '.....KKKKKK.....',
  '....KLLLLLlK....',
  '....KLLLLLlK....',
  '.....KKKKKK.....',
  '....KLLLLLlK....',
  '....KLLLLLlK....',
  '.....KKKKKK.....',
  '....KLLLLLlK....',
  '....KLLLLLlK....',
];
const HEART = [
  '................',
  '................',
  '..KKKK....KKKK..',
  '.KRRRRK..KRRRRK.',
  'KRWWRRRKKRRRRRrK',
  'KRWRRRRRRRRRRRrK',
  'KRRRRRRRRRRRRRrK',
  'KRRRRRRRRRRRRRrK',
  '.KRRRRRRRRRRRrK.',
  '..KRRRRRRRRRrK..',
  '...KRRRRRRRrK...',
  '....KRRRRRrK....',
  '.....KRRRrK.....',
  '......KRrK......',
  '.......KK.......',
  '................',
];
const PEPPER = [
  '................',
  '.........KK.....',
  '........KLLK....',
  '.......KLLK.....',
  '.....KKKLKKK....',
  '....KOOOOOOOK...',
  '...KOOWWOOOOK...',
  '...KOWOOOOOOK...',
  '..KOOOOOOOOK....',
  '..KOOOOOOOOK....',
  '..KOOOOOOOK.....',
  '.KOOOOOOOK......',
  '.KOOOOOOK.......',
  'KYOOOOKK........',
  'KYYKKK..........',
  'KK..............',
];

const ICEWAND = [
  '................',
  '..........K.....',
  '.........KWK....',
  '........KWWBK...',
  '..K....KWWBBBK..',
  '.KWK..KWWBWBbbK.',
  '..K....KBBBbbK..',
  '........KBbbK...',
  '.........KbK....',
  '........KKK.....',
  '.......KDdK.....',
  '......KYYK...K..',
  '.....KDdK...KWK.',
  '....KDdK.....K..',
  '...KDdK.........',
  '..KDdK..........',
];
const FEATHER = [
  '................',
  '..........KKKK..',
  '.........KgggVK.',
  '.......KKgggVLK.',
  '......KgggGVLLK.',
  '.....KgGGGVLLLK.',
  '....KgGGGVLLLK..',
  '....KgGGVLLLLK..',
  '...KggGVVLLLLK..',
  '...KgGVVLLLLK...',
  '...KgVVLLLLK....',
  '...KgVLLLLK.....',
  '..KVVLLLKK......',
  '..KVKKKK........',
  '.KVK............',
  '..K.............',
];
const VOLTORB = [
  '................',
  '.....KKKKKK.....',
  '...KKppppppKK...',
  '..KpppQQYWYppK..',
  '..KpQQQQWYPPpK..',
  '.KppQQQWYPPPppK.',
  '.KpQQQPWYYYPPpK.',
  '.KpQQPPPWYYPPpK.',
  '.KpQPPPPWYPPPpK.',
  '.KpPPPPWYPPPPpK.',
  '.KppPPWYPPPPppK.',
  '..KpPPYPPPPPpK..',
  '..KpppPPPPpppK..',
  '...KKppppppKK...',
  '.....KKKKKK.....',
  '................',
];
const MALLET = [
  '...KKKKKKKKKKK..',
  '..KLLLLLLLLLssK.',
  '..KLSSSSmSSSssK.',
  '..KLSSSSmSSSssK.',
  '..KLSSSSmSSSssK.',
  '..KLSSSSmSSSssK.',
  '..KsssssmsssssK.',
  '..KsssssssssssK.',
  '...KKKKKKKKKKK..',
  '......KDdK......',
  '......KDdK......',
  '......KDdK......',
  '......KDdK......',
  '......KDdK......',
  '......KDdK......',
  '.......KK.......',
];

function sprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const col = pal[rows[y][x]];
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return smoothUp(c);   // (lifted to the fine screen: hires.js)
}

const SPR = {};
const ENEMY_TINT = {   // acorn body colour per world
  meadow: { A: '#d19a5a', a: '#9a6232' },
  cave: { A: '#7d8fe0', a: '#4a5aa8' },
  sky: { A: '#a58be8', a: '#6a50b8' },
  ocean: { A: '#5fc9b8', a: '#2f8a80' },
  snow: { A: '#c9a27a', a: '#8a6440' },
  citadel: { A: '#c98a8a', a: '#8a4a5a' },
  clock: { A: '#b88ae0', a: '#6e4aa0' },
  eclipse: { A: '#9a9ac8', a: '#5a5a8a' },
  desert: { A: '#e0a860', a: '#a8703c' },
  jungle: { A: '#8ac24a', a: '#4e8a2a' },
  bayou: { A: '#9a8a5a', a: '#5a4a2a' },
  gut: { A: '#e88a9a', a: '#a84a5a' },
  gumbo: { A: '#d8924a', a: '#9a5a24' },
};
// HUD life icon: the small chick shrunk to fit the 9px top strip (same palette as CHICK_PAL)
const LIFE_ICON = [
  '....KKKKK....',
  '...KLLBBBK...',
  '..KLBBBBBBK..',
  '.KBBEBBBEBBK.',
  'KWKBEBbBEBKWK',
  'KWWKcBdBcKWWK',
  '.KKSBBBBBSKK.',
  '...KSSSSSK...',
  '...KFFKFFK...',
];
function buildSprites() {
  const FRAMES = ['idle', 'relic', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'skid', 'blink', 'blush', 'sleep', 'spinFront', 'spinBack', 'swimA', 'swimB', 'strain', 'teeterA', 'teeterB', 'lookA', 'lookB', 'aheadA', 'aheadB', 'flap', 'diveA', 'diveB', 'glide'];
  // Every frame is painted the first time it is read, then cached (building all ~2,200 up front took ~2s of boot).
  const lazy = (obj, key, build) => Object.defineProperty(obj, key, {
    configurable: true, enumerable: true,
    get() { const v = build(); Object.defineProperty(obj, key, { value: v, writable: true, configurable: true, enumerable: true }); return v; },
    set(v) { Object.defineProperty(obj, key, { value: v, writable: true, configurable: true, enumerable: true }); },
  });
  const VARIANTS = { happy: 'happy', hotFoot: 'strain', shock: 'shock', shockBack: 'shockBack', shockAhead: 'shockAhead', shockUpAhead: 'shockUpAhead', shockDown: 'shockDown', shockUp: 'shockUp' };
  // (hotFoot / shock...: wide-eyed, sinking in quicksand, fleeing, glancing back over his shoulder...)
  const cinemaStyle = { outline: CHICK_R / ART_R, eyeStroke: 0.35 };
  const makeSet = (art, duck, pal, mask, style = null) => {
    const set = {};
    if (mask) lazy(set, 'mask', mask);
    if (!style) lazy(set, 'cinema', () => makeSet(art, duck, pal, null, cinemaStyle));
    for (const [name, eye] of Object.entries(VARIANTS)) {
      const v = set[name] = {};
      for (const k of FRAMES) lazy(v, k, () => chickSprite(art, k, pal, eye, null, style));
      lazy(v, 'talk', () => chickSprite(art, 'idle', pal, eye, 'chewOpen', style));
    }
    for (const mouth of ['chewOpen', 'chewClosed', 'burp', 'whistleOpen', 'whistleMid']) {
      const v = set[mouth] = {}, eye = mouth === 'burp' ? 'burp' : mouth.startsWith('whistle') ? 'happy' : null;
      for (const k of FRAMES) lazy(v, k, () => chickSprite(art, k, pal, eye, mouth, style));
      lazy(v, 'crouch', () => chickSprite(duck, 'crouch', pal, eye, mouth, style));
    }
    for (const k of FRAMES) lazy(set, k, () => chickSprite(art, k, pal, null, null, style));
    lazy(set, 'crouch', () => chickSprite(duck, 'crouch', pal, null, null, style));
    // rolling: the ball, at BALL_STEPS turns each way (ball[f > 0 ? 0 : 1][k]), and its radius
    set.ballR = duck === CHICK_SMALL_DUCK ? 6 : 7.5;
    lazy(set, 'ball', () => [1, -1].map(f => Array.from({ length: BALL_STEPS }, (_, k) => chickBall(set.ballR, pal, k / BALL_STEPS * Math.PI * 2, f))));
    return set;
  };
  // every set has a .mask twin wearing scuba gear, used in water levels
  const make = (pal, masked) => makeSet(pal.hat ? CHICK_HAT : CHICK_BIG, pal.hat ? CHICK_HAT_DUCK : CHICK_BIG_DUCK, pal,
    masked ? null : () => make(Object.assign({}, pal, { mask: true }), true));
  const makeSmall = (pal, withMask) => makeSet(CHICK_SMALL, CHICK_SMALL_DUCK, pal,
    withMask ? () => makeSmall(Object.assign({}, pal, { mask: true })) : null);
  const smallSet = makeSmall(CHICK_PAL, true);
  const bigSet = make(CHICK_PAL), fireSet = make(PAL_FIRE), hotSet = make(PAL_HOT);
  lazy(hotSet, 'blink', () => hotSet.idle); lazy(hotSet.mask, 'blink', () => hotSet.mask.idle);
  SPR.small = smallSet; SPR.big = bigSet; SPR.fire = fireSet; SPR.hot = hotSet;
  SPR.suit = { fire: fireSet };
  for (const [name, pal] of Object.entries(SUIT_PALS)) SPR.suit[name] = make(pal);
  SPR.die = chickSprite(CHICK_SMALL, 'die', CHICK_PAL);
  { const c = CHICK_PAL;
    SPR.lifeIcon = sprite(LIFE_ICON, { K: INK, B: c.body, S: c.shade, L: c.light, W: c.wing, E: c.eye, b: c.beak, d: c.beakD, c: c.cheek, F: c.foot });
    // ...but better: a close crop of his own face from the idle sprite (eyes, beak and cheeks), found by
    // looking for the eye pixels, so the icon always matches him exactly
    try {
      const src = SPR.small.idle, R = src.r || 1, cv = src.canvas || src, w = cv.width, h = cv.height, px = cv.getContext('2d').getImageData(0, 0, w, h).data;
      const er = parseInt(c.eye.slice(1, 3), 16), eg = parseInt(c.eye.slice(3, 5), 16), eb = parseInt(c.eye.slice(5, 7), 16);
      let x0 = w, x1 = -1, y0 = h;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (px[i + 3] && px[i] === er && px[i + 1] === eg && px[i + 2] === eb) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
      }
      if (x1 >= 0) {   // (in game pixels: the art may be fine, hires.js)
        const IW = 12, IH = 9, icon = makeHiCanvas(IW, IH, R);   // (12 wide: the 13th column was a stray bit of head outline)
        icon.getContext('2d').drawImage(src, -Math.round((x0 + x1 + 1) / 2 / R - 6), -(Math.floor(y0 / R) - 3));
        SPR.lifeIcon = icon;
      }
    } catch (e) { /* keep the drawn icon */ }
  }

  SPR.grumblet = {}; SPR.grumbletB = {}; SPR.grumbletFlat = {};
  for (const th of Object.keys(ENEMY_TINT)) {
    const pal = Object.assign({ K: INK, W: '#fff6e0', D: '#3b2416', P: '#ff9aa2', C: '#7a4a24', c: '#4e2c16', L: '#a8703c' }, ENEMY_TINT[th]);
    SPR.grumblet[th] = sprite(GRUMBLET, pal);
    SPR.grumbletB[th] = sprite(withRows(GRUMBLET, 15, GRUMBLET_FEET_B), pal);
    SPR.grumbletFlat[th] = sprite(GRUMBLET.filter((_, i) => i % 2 === 1), pal);
  }
  // the cave gets its own critter instead of a recoloured acorn
  const shroomPal = { K: INK, C: '#a46ae8', c: '#46227f', L: '#7c46c0', S: '#b6ff6a', B: '#d9e8b0', b: '#8ea062', W: '#ffffff', P: '#8fd060', D: '#2e2250' };   // a toxic purple cap with glowing lime blotches
  SPR.grumblet.cave = sprite(GLOWSHROOM, shroomPal);
  SPR.grumbletB.cave = sprite(withRows(GLOWSHROOM, 18, GLOWSHROOM_FEET_B), shroomPal);
  SPR.grumbletFlat.cave = sprite(GLOWSHROOM.filter((_, i) => i % 2 === 1), shroomPal);
  // the acorn belongs to the meadow; every other world gets the glowshroom instead of a recoloured acorn
  for (const th of Object.keys(ENEMY_TINT)) if (th !== 'meadow') {
    SPR.grumblet[th] = SPR.grumblet.cave; SPR.grumbletB[th] = SPR.grumbletB.cave; SPR.grumbletFlat[th] = SPR.grumbletFlat.cave;
  }
  const shellPal = { K: INK, G: '#7d8bd6', g: '#3f4a8f', L: '#b9c3f2', R: '#e9e1ff', S: '#ffb36b', W: '#ffffff', D: '#3a2a5a' };
  const hogPal = { K: INK, Q: '#5a3f30', q: '#8a6a50', T: '#5a3f30', F: '#e8c39a', f: '#b98a62', B: '#f6e3c0', P: '#4a3328', N: '#1a1020', W: '#ffffff' };
  SPR.hedgehogA = sprite(HEDGEHOG, hogPal);
  SPR.hedgehogB = sprite(withRows(HEDGEHOG, 12, HEDGEHOG_FEET_B), hogPal);
  SPR.shellbackA = sprite(SHELLBACK, shellPal);
  SPR.shellbackB = sprite(withRows(SHELLBACK, 12, SHELLBACK_LEGS_B), shellPal);
  SPR.shell = sprite(SHELL, shellPal);
  SPR.shellB = sprite(SHELL_B, shellPal);
  const batPal = { K: INK, V: '#8a6bff', v: '#5233c4', W: '#ffffff', R: '#ff4d6d' };
  SPR.flutterUp = sprite(FLUTTER_UP, batPal);
  SPR.flutterDown = sprite(FLUTTER_DOWN, batPal);
  // skin 0 is the bat; 1 eagle (white head + tail), 2 crow (glossy black), 3 seagull (white, grey wings, black tips)
  const birdPals = [
    { K: INK, H: '#f4f0e6', E: INK, Y: '#ffc23a', B: '#6b4226', b: '#4a2c18', G: '#7a4e2c', X: '#3a2414', T: '#f4f0e6' },
    { K: INK, H: '#3a3a52', E: '#ffd23f', Y: '#6a6a80', B: '#2e2e44', b: '#22223a', G: '#46466a', X: '#7a7aa8', T: '#34344e' },
    { K: INK, H: '#ffffff', E: INK, Y: '#ffc23a', B: '#ffffff', b: '#d8dce6', G: '#a8b2c4', X: '#2a2a3a', T: '#ffffff' },
  ];
  SPR.birdUp = birdPals.map(pal => sprite(BIRD_UP, pal));
  SPR.birdDown = birdPals.map(pal => sprite(BIRD_DOWN, pal));
  const vinePal = { K: INK, F: '#ff9a3c', f: '#c25a12', W: '#ffffff', M: '#3a0d1f', L: '#ffcf6a', l: '#d9952e' };
  SPR.vineOpen = sprite(VINE_OPEN.concat(VINE_STEM), vinePal);
  SPR.vineShut = sprite(VINE_SHUT.concat(VINE_STEM), vinePal);
  SPR.berry = fineBerry();   // (painted fine: below)
  SPR.heart = sprite(HEART, { K: INK, R: '#ff6aa8', r: '#c23a78', W: '#ffffff' });
  SPR.pepperA = sprite(PEPPER, { K: INK, O: '#ff3b2f', Y: '#ffb347', W: '#ffe0d0', L: '#4cd17a' });
  SPR.pepperB = sprite(PEPPER, { K: INK, O: '#ff6a2f', Y: '#ffd166', W: '#ffffff', L: '#4cd17a' });
  SPR.itemIce = sprite(ICEWAND, { K: INK, W: '#ffffff', B: '#9be8ff', b: '#3aa7e8', D: '#c98a4a', d: '#8a5a32', Y: '#ffd166' });
  SPR.itemGale = sprite(FEATHER, { K: INK, V: '#ffffff', G: '#9ae8a8', g: '#3fbf79', L: '#d8ffe4' });
  SPR.itemVolt = sprite(VOLTORB, { K: INK, P: '#5a2fb8', p: '#3a1c80', Q: '#8f6bff', Y: '#ffe14d', W: '#ffffff' });
  SPR.itemQuake = sprite(MALLET, { K: INK, S: '#a9a4bd', L: '#e2deef', s: '#6f6a88', m: '#ffd166', D: '#c98a4a', d: '#8a5a32' });
  fineSprites();   // (the fine versions of all of these: sprites-fine.js)
}

// The boost berry, painted fine (hires.js, meadow-art.js's painter): a plump strawberry, glossy and lit from the upper
// left, golden seeds pressed into it, a leafy green cap and a stalk
function fineBerry() {
  return fineBerryItem();
}

// Draw a sprite anchored at its bottom-centre, with optional flip / squash.
function drawSprite(ctx, img, cx, bottom, flip, sx = 1, sy = 1, vflip = false) {
  if (!flip && !vflip && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) {
    ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(bottom - img.height));
    return;
  }
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottom));
  ctx.scale(flip ? -sx : sx, vflip ? -sy : sy);
  ctx.drawImage(img, -img.width / 2, vflip ? 0 : -img.height);
  ctx.restore();
}

const THEMES = {
  meadow: {
    style: 'dirt', accent: '#7be08a', solid: 'hay', fine: true,
    ground: ['#c47a48', '#8a4c2a', '#e6a771'], top: ['#5fd068', '#2f9a49', '#b6f59a'],
    brick: ['#c98a4a', '#7a4a24', '#e8b47c'], block: ['#d39a62', '#8a5530', '#f6cb98'],
    semi: ['#c08850', '#6b4224', '#e8b47c'], plat: ['#d39a62', '#6b4224', '#f6cb98'],
    castle: ['#d8a27a', '#7a4630', '#f3cba6'],
  },
  cave: {
    style: 'rock', accent: '#59e6d8', fineGround: { body: 'cobble', cap: 'crust', up: 1 }, gem: ['#5ef2ff', '#bffaff'],
    ground: ['#3c3a55', '#232135', '#5d597c'], top: ['#59e6d8', '#2a9c9a', '#c2fff7'],
    brick: ['#9a6a42', '#4e2e1a', '#c4935e'], block: ['#616280', '#2f3045', '#9b9db9'],
    semi: ['#a8744a', '#563820', '#d8a476'], plat: ['#75689b', '#372f53', '#b5acd2'],
    castle: ['#757b9b', '#31334d', '#afb4cd'],
  },
  sky: {
    style: 'cloud', accent: '#9fe3ff', fineGround: { body: 'puffs', cap: 'puffTop', under: 'puffBottom', up: 1, chip: 'puff' },
    ground: ['#e1eafb', '#aebedf', '#ffffff'], top: ['#ffffff', '#d5e1f6', '#ffffff'],
    brick: ['#e0aa5e', '#8a5a28', '#f6d699'], block: ['#cfc2ee', '#6a5a9a', '#f1ebff'],
    semi: ['#ffffff', '#a9b9de', '#ffffff'], plat: ['#e8dcff', '#7a68b0', '#ffffff'],
    castle: ['#d9cdf5', '#6a5a9a', '#ffffff'],
  },
  snow: {
    style: 'snow', accent: '#bfe9ff', fineGround: { body: 'cobble', cap: 'snowTop', up: 3 },
    ground: ['#5d6f99', '#3f4d75', '#8a9ac4'], top: ['#ffffff', '#bcd6f5', '#ffffff'],
    brick: ['#b08a6a', '#5a4030', '#d8c0a8'], block: ['#9fb8dc', '#4f6a9a', '#e0ecff'],
    semi: ['#e8f2ff', '#8aa8d0', '#ffffff'], plat: ['#cfe3ff', '#5f7aa8', '#ffffff'],
    castle: ['#9fb8dc', '#4f6a9a', '#e0ecff'],
  },
  ocean: {
    style: 'reef', accent: '#5ef2e0', pipe: 'coral', fineGround: { body: 'sand', cap: 'sandTop', up: 0 },
    ground: ['#d9b77a', '#a07c45', '#f0d59a'], top: ['#f4dfa8', '#c9a96a', '#fff3cf'],
    brick: ['#b8a07e', '#6a5440', '#ddcaa8'], block: ['#5fb3b3', '#24686e', '#9fe0dc'],
    semi: ['#ff9a7a', '#9a4a3a', '#ffd0b8'], plat: ['#7fd1c7', '#2a6e6a', '#c9f5ef'],
    castle: ['#5fb3b3', '#24686e', '#9fe0dc'],
  },
  citadel: {
    style: 'stone', accent: '#ff8a3c', fineGround: { body: 'bricks', cap: 'embers', up: 0 },
    ground: ['#5a4663', '#2a1d33', '#8b7193'], top: ['#ff7a3c', '#a3361a', '#ffd08a'],
    brick: ['#8a5a3a', '#4a2a1a', '#b8845a'], block: ['#776a82', '#352b40', '#ab9db6'],
    semi: ['#80809a', '#3a3a52', '#b8b8d0'], plat: ['#8a8aa6', '#383850', '#c4c4dc'],
    castle: ['#6e5a76', '#2a1d33', '#a28aa8'],
  },
  clock: {
    style: 'stone', accent: '#ffd166', fineGround: { body: 'bricks', cap: 'embers', up: 0 },
    ground: ['#3d3a6b', '#22204a', '#5e5a9a'], top: ['#d9a441', '#8a5a1a', '#ffe08a'],
    brick: ['#9a6a42', '#4e2e1a', '#c4935e'], block: ['#6a64a8', '#2e2a62', '#a29ce0'],
    semi: ['#c8891e', '#6a4210', '#ffd166'], plat: ['#d9a441', '#6a4210', '#ffe08a'],
    castle: ['#6a64a8', '#2e2a62', '#a29ce0'],
  },
  eclipse: {
    style: 'stone', accent: '#c9b8ff', fineGround: { body: 'bricks', cap: 'embers', up: 0 },
    ground: ['#3a3552', '#1f1b33', '#5d577e'], top: ['#b8c4e8', '#6a76a8', '#eef2ff'],
    brick: ['#6a6488', '#34304a', '#9a94b8'], block: ['#5a5480', '#2a2648', '#8f88c0'],
    semi: ['#9aa4c8', '#4a5078', '#dfe6ff'], plat: ['#a8b2d8', '#4a5078', '#e8eeff'],
    castle: ['#5a5480', '#2a2648', '#8f88c0'],
  },
  desert: {
    style: 'sand', accent: '#ffb347', fineGround: { body: 'strata', cap: 'sandTop', up: 0 },
    ground: ['#d9984e', '#a8642e', '#efbd78'], top: ['#f6d58e', '#d9a456', '#fff1c8'],
    brick: ['#d0844a', '#7a3a1c', '#f0ad78'], block: ['#e8b86a', '#9a6030', '#fbe0a8'],
    semi: ['#b87840', '#5e3418', '#e0a868'], plat: ['#d89a58', '#6e3e1c', '#f6cb98'],
    castle: ['#e8b86a', '#9a6030', '#fbe0a8'],
  },
  bayou: {
    style: 'dirt', accent: '#ffcf6a', solid: 'sandbag', fineGround: { body: 'soil', cap: 'grass', up: 4 },
    ground: ['#4e3a2e', '#2e2018', '#6a5040'], top: ['#5a8a3a', '#34582a', '#9ac85a'],
    brick: ['#9a7044', '#4e3418', '#c89a64'], block: ['#6a7a5a', '#3a4430', '#9aa880'],
    semi: ['#8a6a48', '#4a3420', '#b8946a'], plat: ['#9a7a52', '#4e3a22', '#c8a878'],
    castle: ['#6a7a5a', '#3a4430', '#9aa880'],
  },
  // 3-4: inside the turtle. Folds of stomach lining for walls and floors, ribs of bone to stand on, pools of green acid
  gut: {
    style: 'flesh', accent: '#ff9ab0', solid: 'gristle', semiStyle: 'bone', acid: true,
    ground: ['#b8445a', '#7a1e36', '#e0707e'], top: ['#f4a0b0', '#c25a70', '#ffe0e6'],
    brick: ['#c98a4a', '#7a4a24', '#e8b47c'], block: ['#f0dcc8', '#b09078', '#fff6ea'],
    semi: ['#efe4cc', '#a8987a', '#ffffff'], plat: ['#efe4cc', '#a8987a', '#ffffff'],
    castle: ['#b8445a', '#7a1e36', '#e0707e'],
  },
  // 4-1: the gumbo fever dream. Cornbread mesas for ground (a baked crust on top), cast iron for solid
  // blocks, stale croutons for crates, saltine crackers that crumble, and roux for quicksand
  gumbo: {
    style: 'cornbread', accent: '#ff8a3a', solid: 'iron', brickStyle: 'crouton', crumbleStyle: 'cracker', roux: true, fineGround: { body: 'cornbread', cap: 'bakedCrust', up: 0 },
    ground: ['#eebc4c', '#b07c24', '#ffe080'], top: ['#c8742a', '#7a3a10', '#eaa050'],
    brick: ['#c8823a', '#7a4418', '#e8b060'], block: ['#3a343a', '#1e1a20', '#6a646e'],
    semi: ['#c8925a', '#7a4a24', '#e8b880'], plat: ['#d8a050', '#7a4a1c', '#f4cc80'],
    castle: ['#3a343a', '#1e1a20', '#6a646e'],
    puff: ['#7a3a14', '#c8763a'],   // (what roux splashes up: see sandPuff)
  },
  jungle: {
    style: 'dirt', accent: '#8ee070', fineGround: { body: 'soil', cap: 'grass', up: 4 },
    ground: ['#7a4a2e', '#4e2c18', '#9a6440'], top: ['#3fae4a', '#1f6e34', '#8ee070'],
    brick: ['#a8743e', '#5a3418', '#d0a066'], block: ['#6f8a4e', '#3a5228', '#a4c27a'],
    semi: ['#8a5a32', '#4a2c14', '#b8844e'], plat: ['#8ab84a', '#3a6a28', '#c8f08a'],
    castle: ['#6f8a4e', '#3a5228', '#a4c27a'],
  },
};


// A power-up hat on its own (centred on the origin, about 12 wide), for when a hit knocks it off
function drawHatIcon(ctx, hat) {
  ctx.drawImage(powerHatArt(hat), -12, -12);
}
