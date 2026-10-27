'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-2 MONSOON JUNGLE painted fine (behaviour: enemies-jungle.js). Baked once per pose with mArt (meadow-art.js):
// soft shading, one ink line round each creature; the bits that move every frame (eyes, tongues, jaws, vines,
// stems) are drawn live in fine pixels.
// ═══════════════════════════════════════════════════════════════════════════
const JUNGLE_ART = new Map();
const jungleArt = (key, paint) => JUNGLE_ART.get(key) || (JUNGLE_ART.set(key, paint()), JUNGLE_ART.get(key));
const COCO = ['#2a1406', '#4e2a12', '#7a4a28', '#a8703c', '#d0a070'];
const LEAF = ['#16361f', '#2a5e26', '#4a9638', '#6fc24e', '#b8f080'];

// CHIMPCHUCK: 40 x 38, his feet (bottom middle) at (20, 34), facing +x. arms: 'down' or 'up' (a coconut held over his head)
function chimpArt(up, laugh) {
  return jungleArt('chimpCap:' + up + ':' + laugh, () => {
    const A = mArt(40, 38), INK_C = '#1b1530';
    const FUR = ['#3e1c0a', '#683416', '#924f24', '#bc6d36', '#e09356'];
    const SKIN = ['#a46c44', '#cb9264', '#ebb98a', '#fae0be', '#fff4e4'];
    const CAP = ['#620c14', '#9e1822', '#df2a34', '#ff5458', '#ffa2a4'];

    const seg = (x0, y0, x1, y1, r0, r1, P, bias = 0) => {
      const minX = Math.max(0, Math.floor(Math.min(x0, x1) - Math.max(r0, r1) - 1));
      const maxX = Math.min(39, Math.ceil(Math.max(x0, x1) + Math.max(r0, r1) + 1));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1) - Math.max(r0, r1) - 1));
      const maxY = Math.min(37, Math.ceil(Math.max(y0, y1) + Math.max(r0, r1) + 1));
      const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1, len = Math.sqrt(len2);
      const nx = -dy / len, ny = dx / len;
      // mArt.fill takes opposite corners, not a width and height.
      A.fill(minX, minY, maxX, maxY, (x, y) => {
        const t = clamp(((x - x0) * dx + (y - y0) * dy) / len2, 0, 1);
        const px = x0 + dx * t, py = y0 + dy * t, r = r0 + (r1 - r0) * t;
        const d2 = (x - px) * (x - px) + (y - py) * (y - py);
        if (d2 > r * r) return null;
        const u = ((x - px) * nx + (y - py) * ny) / r;
        const z = Math.sqrt(Math.max(0, 1 - d2 / (r * r)));
        return softTone(P, 0.15 + z * 0.55 - (x - px) / r * 0.25 - (y - py) / r * 0.35 + u * 0.1 + bias);
      });
    };

    // 1. A loose, low tail sweeping behind the haunch, well clear of the ear.
    const tailPts = laugh
      ? [[14, 29.5], [11, 31], [8, 31.8], [5.5, 31.5], [3.5, 30.2], [2.5, 28.2], [2.7, 26.2], [3.6, 24.8], [5, 24.5]]
      : [[14, 30], [11, 31.5], [8, 32.2], [5.5, 31.9], [3.5, 30.8], [2.5, 29], [2.6, 27.2], [3.5, 25.7], [5, 25.2]];
    for (let i = 0; i < tailPts.length - 1; i++) {
      const k0 = i / (tailPts.length - 1), k1 = (i + 1) / (tailPts.length - 1);
      seg(...tailPts[i], ...tailPts[i + 1], 1.75 - k0 * 0.55, 1.75 - k1 * 0.55, FUR, -0.08);
    }
    A.soft(...tailPts[tailPts.length - 1], 1.45, 1.45, FUR);

    // 2. Far arm & hand (drawn behind torso and head for clean depth)
    if (up) {
      seg(22, 22, 26.5, 14.5, 2.1, 1.9, FUR, -0.22);
      seg(26.5, 14.5, 23.8, 7.2, 1.85, 1.65, FUR, -0.18);
      A.soft(23.6, 6.2, 2.2, 1.7, SKIN, null, -0.25);
    } else if (laugh) {
      seg(22.5, 22.5, 28, 24.5, 2.0, 1.8, FUR, -0.22);
      seg(28, 24.5, 26.8, 29.2, 1.75, 1.55, FUR, -0.2);
      A.soft(26.8, 30, 2.0, 1.5, SKIN);
    } else {
      seg(22.5, 22.5, 27.5, 26.5, 2.0, 1.8, FUR, -0.22);
      seg(27.5, 26.5, 26.5, 31.8, 1.75, 1.55, FUR, -0.2);
      A.soft(27.2, 32.6, 2.1, 1.4, SKIN);
    }

    // 3. Far leg & foot
    seg(22, 29, 25.5, 31.2, 2.5, 2.1, FUR, -0.2);
    A.soft(26.8, 33, 3.1, 1.35, SKIN);
    A.ell(28.8, 33.1, 0.9, 0.8, SKIN[3]);

    // 4. Plump pear-shaped cartoony torso & warm cream belly patch
    A.soft(19.2, 26.5, 6.3, 6.6, FUR, null, 0.1);
    A.soft(21.8, 27.2, 3.8, 4.7, SKIN, null, 0.08);
    A.ell(22.5, 28.4, 0.55, 0.45, SKIN[1], true);   // cute little belly button

    // 5. Near leg & grabbing monkey foot
    seg(16.2, 28.8, 13.8, 31.5, 2.8, 2.3, FUR, 0.05);
    A.soft(16.8, 33.1, 3.4, 1.45, SKIN);
    for (const dx of [1.6, 2.6, 3.4]) A.ell(16.8 + dx, 33.2, 0.85, 0.75, SKIN[3]);
    A.line(18.2, 33.6, 19.8, 33.6, SKIN[0], true, 0.35);

    // 6. Big expressive head, back ear, and wide cheeky muzzle
    // Far ear tip peeking on the right
    A.soft(26.5, 15.2, 2.1, 2.5, FUR);
    // Main cranium
    A.soft(19.6, 16.2, 6.8, 6.2, FUR);
    // Big round near ear on the left with warm inner cup
    A.soft(11.8, 17.2, 3.1, 3.4, FUR, null, -0.15);
    A.soft(12.1, 17.3, 1.9, 2.2, SKIN, null, -0.15);
    A.line(11.7, 16.4, 12.7, 17.4, SKIN[0], null, 0.45);
    A.line(12.7, 17.4, 11.9, 18.4, SKIN[0], null, 0.45);

    // Heart-shaped upper face mask (around the eyes) + wide protruding muzzle
    A.soft(21.0, 16.0, 3.5, 3.3, SKIN);
    A.soft(24.6, 16.2, 2.8, 3.0, SKIN);
    A.soft(23.8, 20.0, 5.6, 3.7, SKIN, null, 0.05);

    // 7. Near arm & hand (drawn in front of body, separated with its own subtle dark crease)
    if (up) {
      A.line(15.2, 22.2, 12.2, 14.2, FUR[0], null, 4.4);
      A.line(12.2, 14.2, 15.6, 7.0, FUR[0], null, 3.8);
      seg(15.2, 22.2, 12.2, 14.2, 2.2, 1.95, FUR, 0.1);
      seg(12.2, 14.2, 15.6, 7.0, 1.9, 1.7, FUR, 0.12);
      A.soft(16.2, 6.0, 2.3, 1.75, SKIN, null, 0.25);
    } else if (laugh) {
      // Slapping his knee / holding his belly while cackling
      A.line(15.0, 22.5, 11.8, 26.2, FUR[0], null, 4.3);
      A.line(11.8, 26.2, 17.5, 28.5, FUR[0], null, 3.7);
      seg(15.0, 22.5, 11.8, 26.2, 2.15, 1.9, FUR, 0.08);
      seg(11.8, 26.2, 17.5, 28.5, 1.85, 1.65, FUR, 0.1);
      A.soft(18.6, 28.6, 2.2, 1.65, SKIN, null, 0.1);
    } else {
      // Cocky crouched arm resting forward ready to grab a coconut
      A.line(15.0, 22.5, 11.8, 27.0, FUR[0], null, 4.3);
      A.line(11.8, 27.0, 14.8, 31.8, FUR[0], null, 3.7);
      seg(15.0, 22.5, 11.8, 27.0, 2.15, 1.9, FUR, 0.08);
      seg(11.8, 27.0, 14.8, 31.8, 1.85, 1.65, FUR, 0.1);
      A.soft(15.6, 32.5, 2.2, 1.5, SKIN);
    }

    // 8. Bright red baseball cap cocked jauntily on his head
    // Cap crown dome
    A.fill(11, 6, 28, 14, (x, y) => {
      const dx = (x - 19.2) / 7.4, dy = (y - 12.6) / 5.4;
      if (dx * dx + dy * dy > 1 || y > 12.6 - (x - 19.2) * 0.08) return null;
      const seam = Math.abs(x - 18.8 - (y - 8) * 0.25) < 0.32 || Math.abs(x - 14.8 + (y - 9) * 0.35) < 0.3;
      if (seam && y < 11.8) return CAP[1];
      const light = 0.35 - dx * 0.38 - dy * 0.55;
      return softTone(CAP, light);
    });
    // White front badge / emblem on cap crown for crisp cartoony contrast
    A.ell(22.6, 9.7, 2.1, 1.35, '#fff6e4', null, 0.15);
    // Small red monogram inside the cream front patch.
    A.line(22.9, 9.1, 22.1, 9.2, CAP[1], null, 0.35);
    A.line(22.1, 9.2, 22.0, 10.1, CAP[1], null, 0.35);
    A.line(22.0, 10.1, 22.9, 10.2, CAP[1], null, 0.35);
    // Fine panel stitching and ventilation eyelet.
    A.line(18.6, 7.8, 19.3, 11.6, CAP[3], null, 0.33);
    A.ell(15.3, 10.2, 0.4, 0.35, CAP[0]);
    // Top button on cap
    A.ell(18.2, 7.1, 1.2, 0.75, CAP[0]);
    A.ell(18.2, 6.9, 0.9, 0.5, CAP[3]);
    // Snappy curved red visor jutting forward to the right
    A.poly([[18.5, 11.2], [26.2, 10.6], [32.8, 12.0], [32.2, 13.6], [25.5, 13.0], [18.5, 12.6]], CAP[0]);
    A.poly([[19.0, 11.4], [26.2, 10.9], [32.2, 12.1], [31.5, 13.1], [25.5, 12.5], [19.0, 12.2]], CAP[2]);
    A.line(20.5, 11.4, 30.8, 12.0, CAP[4], null, 0.55);   // bright visor rim highlight
    // Dark headband rim across the brow
    A.line(12.6, 12.6, 25.8, 11.8, CAP[0], null, 0.9);

    // Outline the entire silhouette before crisp facial features
    A.outline();

    // Bake the small facial features as smooth curves at the native art resolution.
    // Rounded strokes and a single tooth band keep the expression clear at game size.
    const art = A.canvas(), g = art.getContext('2d');
    g.save();
    g.scale(ART_R, ART_R);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const oval = (x, y, rx, ry, color) => {
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fillStyle = color; g.fill();
    };
    const curve = (x, y, cx, cy, ex, ey, width = 0.65) => {
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cx, cy, ex, ey);
      g.strokeStyle = INK_C; g.lineWidth = width; g.stroke();
    };
    if (laugh) {
      curve(19.1, 16.2, 20.6, 13.9, 22.1, 16.2, 0.8);
      curve(23.8, 16.2, 25.0, 14.2, 26.3, 16.2, 0.8);
    } else {
      for (const [ex, ey, rx, ry] of [[20.7, 15.8, 1.8, 2.15], [25.1, 15.9, 1.5, 1.95]]) {
        oval(ex, ey, rx + 0.3, ry + 0.3, INK_C);
        oval(ex, ey, rx, ry, '#fff9ec');
        const px = ex + (up ? 0.35 : 0.5), py = ey + (up ? -0.35 : 0.15);
        oval(px, py, 0.8, 1.2, INK_C);
        oval(px - 0.25, py - 0.45, 0.3, 0.35, '#ffffff');
      }
      curve(19.0, 13.0, 20.5, 12.9, 22.2, 13.7, 0.65);
      curve(23.8, 13.8, 25.0, 13.2, 26.4, 13.3, 0.65);
    }
    oval(26.1, 18.5, 0.4, 0.28, FUR[0]);
    oval(27.3, 18.4, 0.4, 0.28, FUR[0]);
    oval(18.6, 19.2, 1.1, 0.65, '#f48c72');

    // One continuous mouth contour: a curved smile or a round, open laugh.
    g.beginPath();
    g.moveTo(19.7, 20.0);
    g.quadraticCurveTo(23.8, 21.0, 27.6, 19.8);
    g.bezierCurveTo(27.1, laugh ? 25.0 : 23.0,
      20.6, laugh ? 25.4 : 23.4, 19.7, 20.0);
    g.closePath();
    g.fillStyle = laugh ? '#69242c' : '#fff9ec'; g.fill();
    g.save(); g.clip();
    if (laugh) {
      oval(24.0, 23.0, 2.0, 0.85, '#f78591');
      g.beginPath(); g.moveTo(19, 19.5); g.lineTo(28, 19.3);
      g.lineTo(28, 21.0); g.quadraticCurveTo(23.7, 22.0, 19, 21.0);
      g.closePath(); g.fillStyle = '#fff9ec'; g.fill();
    }
    g.restore();
    // Rebuild the contour after painting the clipped tongue and upper teeth.
    g.beginPath(); g.moveTo(19.7, 20.0);
    g.quadraticCurveTo(23.8, 21.0, 27.6, 19.8);
    g.bezierCurveTo(27.1, laugh ? 25.0 : 23.0,
      20.6, laugh ? 25.4 : 23.4, 19.7, 20.0);
    g.closePath(); g.strokeStyle = INK_C; g.lineWidth = 0.55; g.stroke();
    g.restore();
    return art;
  });
}
// a coconut, 12 x 12 round (its middle at 6, 6): shaggy brown husk, three dark eyes drawn live as it spins
function coconutArt() {
  return jungleArt('coco', () => {
    const A = mArt(12, 12);
    A.soft(6, 6, 4.6, 4.6, COCO);
    A.fill(1, 1, 11, 11, (x, y) => { const h = Math.sin(Math.floor(x * 3) * 12.9 + Math.floor(y * 1.2) * 78.2) * 43758.5; return h - Math.floor(h) < 0.18 ? COCO[1] : null; }, true);   // fibres
    A.outline();
    A.ell(4.4, 4.2, 1.4, 0.8, COCO[4]);
    return A.canvas();
  });
}
function drawCoconut(ctx, cx, cy, ang) {
  ctx.drawImage(coconutArt(), cx - 6, cy - 6);
  for (let i = 0; i < 3; i++) { const a = ang + i * 2.1, k = Math.sin(a); if (k > 0.85) continue; fEll(ctx, cx + Math.cos(a) * 2.2, cy + k * 2.2, 0.7, 0.7, '#2a1406'); }
}

// CHAMELURK: 30 x 18, the box's left foot at (7, 16) (it's 18 wide), facing +x. hot: flushed orange and teal, else moss
const CHAM_CAMO = [['#1e5226', '#348e3c', '#5cc850', '#8ef074', '#d4ffba'], '#a8ff78'];
const CHAM_HOT = [['#7a2408', '#c24a1a', '#ff8a3c', '#ffb070', '#ffe0b8'], '#3fd8c8'];
function chamArt(hot) {
  return jungleArt('chamVis:' + hot, () => {
    const A = mArt(30, 18), X = x => 7 + x, Y = y => 16 + y, [B, STRIPE] = hot ? CHAM_HOT : CHAM_CAMO;
    for (let i = 0; i < 18; i++) {   // the tail, curled up tight behind
      const a = i * 0.5, r = 3.4 - i * 0.16;
      A.ell(X(2.4 - Math.cos(a) * r), Y(-4.4 - Math.sin(a) * r), 1.3 - i * 0.04, 1.3 - i * 0.04, B[i % 3 ? 2 : 1]);
    }
    for (const [lx, d] of [[5, -1], [12.5, 1]]) { A.line(X(lx), Y(-4), X(lx + d * 1.2), Y(-0.6), B[1], null, 1.1); A.ell(X(lx + d * 1.2), Y(-0.6), 1.2, 0.6, B[1]); }   // legs
    A.soft(X(8.6), Y(-6.4), 6.6, 3.8, B);                                                              // body
    A.fill(X(2), Y(-11), X(15), Y(-3), (x, y) => Math.abs(((x - X(0)) % 3.2) - 1.6) < 0.45 && y > Y(-8.4) ? B[1] : null, true);   // bands
    for (let k = 0; k < 6; k++) A.poly([[X(3.4 + k * 1.9), Y(-9.6)], [X(4.3 + k * 1.9), Y(-11.4)], [X(5.2 + k * 1.9), Y(-9.6)]], STRIPE);   // the crest
    A.soft(X(15.8), Y(-6.6), 3.8, 3.4, B);                                                             // head...
    A.poly([[X(12.6), Y(-8.6)], [X(14.6), Y(-12.8)], [X(17.6), Y(-9.4)]], B[1]);                       // ...and its casque
    A.line(X(14), Y(-5.4), X(19.2), Y(-5.6), B[1], null, 0.4);                                          // the jaw line
    A.outline();
    A.line(X(4), Y(-8.6), X(13), Y(-8.6), STRIPE, null, 0.4);
    return A.canvas();
  });
}

// THUMPDRUM: 36 x 28, the top of its box at (18, 2) from the middle; a goblet drum, redder for each stomp (hurt 0-2),
// its face glaring the way he is (px: -1, 0, 1) and angrier with rage
const DRUM_BOWL = [['#4a1e0c', '#7a3a1c', '#a24e26', '#d27a3e', '#f0b080'], ['#4a120c', '#7a1e16', '#c83a26', '#e86a4a', '#ffa080'], ['#4a0808', '#8a1010', '#e82020', '#ff6040', '#ffa080']];
function thumpArt(hurt, rage, px) {
  return jungleArt('thump' + hurt + rage + px, () => {
    const A = mArt(36, 28), X = x => 18 + x, Y = y => 2 + y, P = DRUM_BOWL[hurt];
    const half = y => y < 10 ? 14 - Math.max(0, y - 6) * 0.4 : y < 13 ? 12.4 - (y - 10) * 1.3 : y < 18 ? 8.5 - (y - 13) * 0.6 : 5.5 + (y - 18) * 2.1;
    A.fill(X(-15), Y(3), X(15), Y(21.6), (x, y) => {
      const yy = y - Y(0), hw = half(yy), u = (x - X(0)) / hw;
      if (Math.abs(u) > 1 || yy > 21.6) return null;
      return softTone(P, 0.55 - u * 0.6 - (1 - Math.sqrt(1 - u * u)) * 0.6 - (yy > 13 ? 0.45 : 0) - Math.max(0, yy - 18) * 0.05);
    });
    A.fill(X(-14), Y(4), X(14), Y(8), (x, y) => { const s = Math.abs(((x - X(0) + 40) % 3) - 1.5); return Math.abs(y - Y(5.1 + s * 0.9)) < 0.45 ? '#ffd166' : null; }, true);   // a painted zig-zag band
    for (let k = -3; k <= 3; k++) A.line(X(k * 3.2), Y(13.6), X(k * 1.7), Y(18.4), '#e8d0a0', true, 0.34);   // the lacing down to the foot
    A.outline();
    for (const sd of [-1, 1]) {   // the mean face
      const ex = sd * 4.4;
      A.ell(X(ex), Y(10.6), 2.6, 1.8, ['#fff6dc', '#ffc8b4', '#ff4a2a'][rage]);
      A.ell(X(ex + px * 0.9), Y(10.9), 1.1, 1.2, rage > 1 ? '#fff6dc' : INK);
      A.line(X(sd * 7.4), Y(7.2 + (rage ? 0.4 : 0)), X(sd * 1.6), Y(9 + (rage > 1 ? 0.8 : 0)), INK, null, rage ? 1.3 : 0.9);   // brows diving to the middle
    }
    if (rage) { A.fill(X(-6.6), Y(14), X(6.6), Y(17.6), (x, y) => Math.abs(x - X(0)) < 6.4 - Math.abs(y - Y(15.8)) * 0.4 ? INK : null); A.fill(X(-5.6), Y(14.8), X(5.6), Y(16.8), (x) => Math.abs(((x - X(0) + 30) % 2) - 1) < 0.25 ? null : '#fff6dc'); }
    else { A.ell(X(0), Y(15.3), 5.6, 1.5, INK); A.ell(X(0), Y(15.6), 4.4, 0.6, '#c24a1a'); for (const tx of [-4, -1, 2]) A.poly([[X(tx), Y(14.4)], [X(tx + 1.6), Y(14.4)], [X(tx + 0.8), Y(15.4)]], '#fff6dc'); }
    return A.canvas();
  });
}

// LILY PAD: a thick round pad seen almost edge-on, w wide, with the notch cut in its rim and the pink water lily
// that says it's safe; (w + 4) x 18, the pad's top-left at (2, 9)
function lilyArt(w) {
  return jungleArt('lily' + w, () => {
    const A = mArt(w + 4, 18), X = x => 2 + x, Y = y => 9 + y, mid = w / 2;
    A.fill(X(0), Y(-1), X(w), Y(8), (x, y) => {
      const u = (x - X(mid)) / mid, e = 1 - u * u;
      if (e <= 0) return null;
      const yy = y - Y(0), top = 3.6 - 2.6 * Math.sqrt(e), bot = 4 + 3 * Math.sqrt(e), notch = Math.abs(x - X(mid + 3)) < 1.6 + (yy - top) * 0.15 && yy < 4.2;
      if (yy < top || yy > bot || notch) return null;
      if (yy < 4.2) { const vein = Math.abs(Math.sin(Math.atan2(yy - 3.2, (x - X(mid)) * 0.18) * 7)) < 0.12; return vein ? '#3f9a3a' : softTone(['#2f8a3a', '#3fa040', '#5cc04e', '#8ee070', '#c8f8a0'], 0.7 - (yy - top) / 4 - u * 0.25); }
      return softTone(['#16361f', '#1e5a2a', '#2f8a3a', '#4fb84a', '#8ee070'], 0.35 - (yy - 4.2) / 3.4 - u * 0.2);
    });
    A.outline();
    const fx = X(7), fy = Y(0.4), PINK = ['#c8508a', '#e878b0', '#ff9ad0', '#ffc8e6', '#fff0f8'];
    for (const [a, r] of [[-2.2, 3.2], [-0.95, 3.2], [-1.57, 3.8], [-2.8, 2.6], [-0.35, 2.6]]) A.soft(fx + Math.cos(a) * r * 0.6, fy + Math.sin(a) * r * 0.7, 1.4, r * 0.55, PINK, null, a + Math.PI / 2);
    A.ell(fx, fy - 0.6, 3.6, 1.2, PINK[2]);
    A.ell(fx, fy - 1.6, 1.2, 0.9, '#ffd166');
    for (let pass = 0; pass < 2; pass++) { const src = A.buf.slice(), W = (w + 4) * A.R, H = 18 * A.R; for (let yy = 0; yy < Math.round(fy * A.R); yy++) for (let xx = Math.round((fx - 5) * A.R); xx < Math.round((fx + 5) * A.R); xx++) { const k = yy * W + xx; if (!src[k] && ((src[k - 1]) || (src[k + 1]) || (yy > 0 && src[k - W]) || (yy < H - 1 && src[k + W]))) A.buf[k] = INK; } }   // (the lily's own ink line, above the pad)
    return A.canvas();
  });
}

// LOGATOR's knobbly back and tail, 62 x 20: the body's top-left (the box) at (14, 5), facing +x
function logatorArt(w) {
  return jungleArt('croc' + w, () => {
    const A = mArt(w + 18, 20), X = x => 14 + x, Y = y => 5 + y, BARK = ['#2a3416', '#3e4a22', '#6a7a3a', '#8a9a48', '#b8c86a'];
    A.poly([[X(1), Y(0.6)], [X(-13), Y(5.2)], [X(-13), Y(6.4)], [X(1), Y(9.6)]], BARK[1]);           // the tail
    A.fill(X(-13), Y(0), X(1), Y(10), (x, y) => Math.abs(((x - X(0) + 40) % 3) - 1.5) < 0.4 ? BARK[0] : null, true);
    A.fill(X(0), Y(-2), X(w), Y(11), (x, y) => {   // the log-like back: broad and rounded, lit from above
      const yy = y - Y(0), u = (x - X(w / 2)) / (w / 2), k = 1 - u * u * u * u;
      const top = -1 + (1 - k) * 4 - (Math.abs(((x - X(0) + 40) % 5) - 2.5) < 1.1 && x > X(3) && x < X(w - 4) ? 1.6 : 0);
      if (yy < top || yy > 10.6 - (1 - k) * 2) return null;
      if (yy > 7.6) return yy > 9.6 ? '#8a8a3a' : '#c8c060';
      return softTone(BARK, 0.8 - (yy - top) / 5);
    });
    A.fill(X(0), Y(-3), X(w), Y(7), (x, y) => { const h = Math.sin(Math.floor(x * 1.4) * 12.9 + Math.floor(y * 1.4) * 78.2) * 43758.5; return h - Math.floor(h) < 0.09 ? BARK[1] : null; }, true);   // scutes
    A.soft(X(w - 1.6), Y(-2.2), 3, 2.2, BARK);                                                          // the eye's bump
    A.outline();
    return A.canvas();
  });
}

// GULPOD's trap: two leaf lobes hinged at the back, gaping by `open` (half-angle) or shut and chewing (chew, px);
// 36 x 46 in the trap's own frame (u along its aim, v across), the pod's middle at (14, 23)
function podArt(open, chew) {
  return jungleArt('pod' + open + ':' + chew, () => {
    const A = mArt(36, 46), U = 14, V = 23, L = POD_LOBE, ry = 7 + chew, oc = Math.cos(open), os = Math.sin(open);
    const lobe = (u, v) => {
      const pu = u + POD_HINGE, pv = v;
      for (const sg of [-1, 1]) {
        const uu = pu * oc + pv * os * sg, vv = -pu * os * sg + pv * oc, d = vv * sg;
        if (d < -0.4 || uu < 0) continue;
        const k = (uu - L / 2) / (L / 2), kv = d / ry;
        if (k * k + kv * kv <= 1) return [sg, d, uu, k];
      }
      return null;
    };
    A.fill(0, 0, 36, 46, (x, y) => {
      const u = x - U, v = y - V, q = lobe(u, v);
      if (!q) { const pu = u + POD_HINGE; return open > 0.05 && pu > 0 && pu < 8 && Math.abs(Math.atan2(v, pu)) < open ? (pu < 3 ? '#3a0a16' : '#6a1424') : null; }   // the throat
      const [sg, d, uu, k] = q;
      if (d < 0.7) return '#ff8a96';                                                     // the wet rim
      if (d < 2.2) return softTone(['#8a1428', '#b02038', '#d8324e', '#f05a6a', '#ff8a96'], 0.7 - d / 2.2);   // the red inner face
      if (((uu + d * 0.8) % 4.5) < 0.5 && uu > 2 && uu < L - 2 && d < ry - 1.4) return '#3a7a30';   // veins fanning to the rim
      return softTone(LEAF, (sg < 0 ? 0.95 : 0.75) - (d - 2.2) / (ry - 2) * 0.9 - Math.abs(k) * 0.2);
    });
    A.soft(U - POD_HINGE, V, 3, 3, ['#16361f', '#2a5e26', '#3f8634', '#6fbf4a', '#a0e070']);            // the hinge's knuckle
    A.outline();
    for (const sg of [-1, 1]) for (let k = 0; k < 9; k++) {   // cilia along each rim, reaching across the gap
      const uu = 2.5 + k * 2, len = 3 + (k % 3 === 1 ? 1 : 0) + (k > 1 && k < 7 ? 1 : 0);
      const at = j => { const lu = uu + j * 0.45, lv = -sg * (j - 0.3), pu = lu * oc - lv * os * sg, pv = lu * os * sg + lv * oc; return [U + pu - POD_HINGE, V + pv]; };
      const [x0, y0] = at(0.2), [x1, y1] = at(len);
      A.line(x0 - 0.5, y0 - 0.2, x1 - 0.5, y1 - 0.2, '#16361f', null, 0.67);
      A.line(x0 - 0.5, y0 - 0.5, x1 - 0.5, y1 - 0.5, '#b8e070', null, 0.34);
      A.ell(x1, y1 - 0.3, 0.45, 0.45, '#f0ffa8');
    }
    return A.canvas();
  });
}

// THE RUINS (zone 'ruins'): the overgrown stone wall behind the end of the stage, its top broken off in ragged steps
// (highest in the middle), moss creeping down it, and the great carved idol watching over the middle. Painted once,
// x0..x1 wide and down to the floor (bot); dim and green so it stays behind the action. idol: its middle, from x0
function ruinsArt(x0, x1, bot, topAt, idol, fy) {
  return jungleArt('ruins' + x0 + ':' + x1, () => {
    const img = makeHiCanvas(x1 - x0, bot), g = img.getContext('2d'), hash = n => (((n * 2654435761) >>> 0) % 1000) / 1000;
    for (let x = x0; x < x1; x += 8) {
      const top = topAt(x), lx = x - x0;
      if (top >= bot) continue;
      fRect(g, lx, top, 8, bot - top, '#2e4436');                                                   // the mortar behind
      for (let y = top; y < bot; y += 8) {
        const off = ((y >> 3) % 2) * 8, h = hash(x * 31 + y), a = (x + off) % 16 === 0;
        const c = h < 0.12 ? '#58745c' : h < 0.5 ? '#4a6450' : '#46604c';
        fRoundRect(g, lx + (a ? 0.4 : 0), y + 0.3, 8 - (a ? 0.4 : 0), 7.4, 1, c);                 // a worn block
        fRect(g, lx + (a ? 0.8 : 0.2), y + 0.6, 7, 0.6, '#5e7c62');                                 // lit along its top
        if (h > 0.8) fEll(g, lx + 2 + h * 4, y + 4, 1.4, 0.8, '#3c5442');                          // a pit worn in it
      }
      fRect(g, lx, top, 8, 1, '#66845e');
    }
    for (let x = x0; x < x1; x += 8) {   // moss spilling over the broken top, and the odd long drip of it
      const top = topAt(x), lx = x - x0;
      if (top >= bot) continue;
      for (let k = 0; k < 4; k++) fEll(g, lx + 1 + k * 2, top + 1.4 + hash(x + k) * 0.8, 1.6, 1.4, '#3f6a3a');
      const drip = hash(x * 7 + 3) < 0.35 ? 4 + Math.floor(hash(x * 13) * 22) : 2, dx = lx + 3 + (x >> 3) % 4;
      fRoundRect(g, dx - 0.8, top + 1, 2, drip + 2, 1, '#3f6a3a'); fBlob(g, dx + 0.2, top + drip + 3, 1.3, '#3f6a3a'); fRect(g, dx - 0.4, top + 2, 0.4, drip, '#5a8a4c');
    }
    // the idol: a broad stone head, deep-set eyes, wide nose, heavy lips and ear spools
    const cx = idol, S = '#58765c', SL = '#6c8c68', SD = '#2c4032', DEEP = '#1c2a22';
    const face = g.createLinearGradient(cx - 30, 0, cx + 30, 0); face.addColorStop(0, '#6c8c68'); face.addColorStop(0.45, S); face.addColorStop(1, '#425e48');
    for (const sd of [-1, 1]) { fRoundRect(g, cx + sd * 31 - 3, fy + 25, 6, 20, 2.4, SD); fRoundRect(g, cx + sd * 31 - 2, fy + 26, 4, 18, 1.8, S); fBlob(g, cx + sd * 31, fy + 35, 2.2, SD); fBlob(g, cx + sd * 31, fy + 35, 1, DEEP); }   // ear spools
    fRoundRect(g, cx - 30, fy, 60, 72, 5, SD); fRoundRect(g, cx - 29, fy + 1, 58, 70, 4.4, face);
    fRoundRect(g, cx - 27, fy + 1.4, 54, 1.4, 0.7, SL);
    fRoundRect(g, cx - 26, fy + 11, 52, 5, 2, SD); fRoundRect(g, cx - 25, fy + 11.6, 50, 1.2, 0.6, SL);   // the heavy brow
    for (const sd of [-1, 1]) { const ex = cx + sd * 13; fEll(g, ex, fy + 22.5, 8.4, 5.2, SD); fEll(g, ex, fy + 23, 6.4, 3.4, DEEP); }   // deep-set eyes
    g.fillStyle = SD; g.beginPath(); g.moveTo(cx - 4, fy + 25); g.lineTo(cx + 4, fy + 25); g.lineTo(cx + 9, fy + 42); g.quadraticCurveTo(cx, fy + 46, cx - 9, fy + 42); g.closePath(); g.fill();   // the nose
    g.fillStyle = SL; g.beginPath(); g.moveTo(cx - 3, fy + 26); g.lineTo(cx + 1, fy + 26); g.lineTo(cx + 2, fy + 40); g.lineTo(cx - 7, fy + 41); g.closePath(); g.fill();
    for (const sd of [-1, 1]) fEll(g, cx + sd * 4.6, fy + 42, 1.6, 1, DEEP);
    fRoundRect(g, cx - 16, fy + 50, 32, 10, 5, SD); fEll(g, cx, fy + 52.6, 13.6, 2.2, SL); fRoundRect(g, cx - 14, fy + 54.6, 28, 1.2, 0.6, DEEP); fEll(g, cx, fy + 57.4, 12.6, 1.8, S);   // the lips
    for (let i = 0; i < 5; i++) fRoundRect(g, cx - 24 + i * 12, fy + 64, 6, 2.2, 1, SD);           // chin carving
    for (let k = 0; k < 14; k++) fEll(g, cx - 27 + k * 4.2, fy + 2.6 + hash(k) * 1.2, 2.6, 1.8, '#3f6a3a');   // moss along its crown
    g.lineCap = 'round';
    for (const [vx, len] of [[-22, 30], [-9, 14], [6, 22], [19, 40], [25, 12]]) {   // vines creeping over it
      g.strokeStyle = '#2f5a30'; g.lineWidth = 0.9; g.beginPath();
      for (let y = 0; y <= len; y += 1) g.lineTo(cx + vx + Math.sin(y * 0.3 + vx) * 1.2, fy + 3 + y);
      g.stroke();
      for (let y = 6; y < len; y += 7) fEll(g, cx + vx + Math.sin(y * 0.3 + vx) * 1.2 + (y % 14 ? 1.4 : -1.4), fy + 3 + y, 1.4, 0.8, '#4f8a42');
      fEll(g, cx + vx, fy + 3 + len + 0.6, 1.8, 1.3, '#4f8a42');
    }
    return img;
  });
}
// a broad jungle leaf from (x, y) at angle `ang`, `len` long and `wid` half-wide, the tip drooping (fine shapes)
function jungleLeafFine(ctx, x, y, ang, len, wid, dark = false) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const side = o => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const k = i / 16, d = k * len, droop = k * k * len * 0.34;
      // Tropical monstera / split philodendron fenestrations along the leaf margin
      const fen = (i === 5 || i === 9 || i === 12) ? 0.42 : 1;
      const hw = Math.sin(Math.PI * Math.min(1, Math.pow(k, 0.8) * 1.08)) * wid * fen * o;
      pts.push([x + c * d - s * hw, y + s * d + droop + c * hw]);
    }
    return pts;
  };
  const up = side(-1), dn = side(1), mid = side(0);
  const path = (a, b) => { ctx.beginPath(); a.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); for (let i = b.length - 1; i >= 0; i--) ctx.lineTo(...b[i]); ctx.closePath(); };
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.strokeStyle = dark ? '#10341e' : '#184e26'; ctx.lineWidth = 1.2; path(up, dn); ctx.stroke();
  ctx.fillStyle = dark ? '#2a783c' : '#4ec44e'; path(up, mid); ctx.fill();
  ctx.fillStyle = dark ? '#1f6030' : '#389e3e'; path(mid, dn); ctx.fill();
  ctx.strokeStyle = dark ? '#58b45a' : '#9cf078'; ctx.lineWidth = 0.55;
  ctx.beginPath(); mid.slice(1).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
}

// Tropical rainforest panorama (3-2), painted fine from scratch: deep moody emerald-teal rainforest sky, dark volcanic
// karst peaks, a mid-canopy of tall tropical coconut & fan palms (no round lollipop trees),
// and a deep-green near-layer of banana leaves and undergrowth that stays cleanly behind the foreground action.
function jungleFineBackground() {
  const rng = mulberry32(hashStr('monsoon-tropical-jungle-dark'));
  const layer = () => { const c = makeHiCanvas(BG_W, VIEW_H); return [c, c.getContext('2d')]; };
  const path = (g, pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  const vgrad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };

  // ── Sky: deep, moody tropical rainforest canopy sky (rich dark teal-emerald, never bleeding into foreground) ──
  const sky = makeHiCanvas(VIEW_W, VIEW_H), sg = sky.getContext('2d');
  sg.fillStyle = vgrad(sg, 0, VIEW_H, ['#0f343c', '#16464a', '#1e5854', '#286a5c', '#327860', '#3d8464']);
  sg.fillRect(0, 0, VIEW_W, VIEW_H);
  // Subtle filtered sun-haze & dark humid rainforest clouds
  fGlow(sg, 310, 48, 64, '#7ac49a', 0.16);
  for (const [cx, cy, w] of [[75, 38, 46], [195, 28, 58], [390, 42, 50]]) {
    sg.globalAlpha = 0.14;
    for (let k = -2; k <= 2; k++) fEll(sg, cx + k * (w * 0.22), cy + Math.abs(k) * 1.8, w * 0.28, 5.5 - Math.abs(k) * 0.9, '#68b08c');
  }
  sg.globalAlpha = 1;

  // ── Far layer: dark emerald volcanic karst peaks and jungle plateaus ──
  const [far, fg] = layer();
  const karsts = [[38, 68, 34], [96, 86, 28], [168, 54, 44], [244, 82, 32], [326, 62, 40], [418, 76, 36]];
  for (const [kx, top, hw] of karsts) wrapDraw(fg, BG_W, off => {
    const x = kx + off;
    const pts = [
      [x - hw - 18, 168], [x - hw - 6, top + 28], [x - hw + 2, top + 8],
      [x - hw * 0.35, top], [x + hw * 0.3, top + 2],
      [x + hw - 2, top + 10], [x + hw + 8, top + 32], [x + hw + 20, 168]
    ];
    path(fg, pts, vgrad(fg, top, 168, ['#1e5048', '#17423a', '#11342e']));
    // Subtle rim light on right ridge face
    path(fg, [[x - hw * 0.1, top + 1], [x + hw * 0.3, top + 2], [x + hw - 2, top + 10], [x + hw + 14, 168], [x + 4, 168]], 'rgba(90,165,130,0.09)');
  });
  // Rolling distant rainforest hills & dark valley mist
  const farHillTerms = [[14, 2, 0.6], [8, 5, 1.8], [4, 11, 0.5]];
  const farPts = [[0, VIEW_H]];
  for (let x = 0; x <= BG_W; x += 1) farPts.push([x, 138 - periodic(x, farHillTerms)]);
  farPts.push([BG_W, VIEW_H]);
  path(fg, farPts, vgrad(fg, 118, 185, ['#164236', '#0f3026']));
  fg.fillStyle = vgrad(fg, 130, 178, ['rgba(45,105,82,0)', 'rgba(45,105,82,0.28)', 'rgba(25,70,52,0.12)']);
  fg.fillRect(0, 130, BG_W, 48);

  // ── Mid layer: authentic tropical palm grove, traveler's palms, and giant tree-ferns (no round blob trees) ──
  const [trees, tg] = layer();
  // Continuous dark mid-ground jungle ridge
  const midTerms = [[10, 2, 1.1], [5, 6, 0.4], [3, 13, 2.0]];
  const midPts = [[0, VIEW_H]];
  for (let x = 0; x <= BG_W; x += 1) midPts.push([x, 156 - periodic(x, midTerms)]);
  midPts.push([BG_W, VIEW_H]);
  path(tg, midPts, vgrad(tg, 140, VIEW_H, ['#123828', '#0c281c']));

  // Helper: curved tropical coconut/feather palm with ringed trunk and drooping pinnate fronds
  const drawTropicalPalm = (g, px, py, h, lean, scale, colTrunk, colRing, colFrondD, colFrondL) => {
    const tx = px + lean, ty = py - h, cx = px + lean * 0.38, cy = py - h * 0.52;
    // Tapered curved trunk with tropical ring segments
    const steps = 18;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const m0 = 1 - t0, m1 = 1 - t1;
      const x0 = m0 * m0 * px + 2 * m0 * t0 * cx + t0 * t0 * tx;
      const y0 = m0 * m0 * py + 2 * m0 * t0 * cy + t0 * t0 * ty;
      const x1 = m1 * m1 * px + 2 * m1 * t1 * cx + t1 * t1 * tx;
      const y1 = m1 * m1 * py + 2 * m1 * t1 * cy + t1 * t1 * ty;
      const w = (2.8 - t0 * 1.4) * scale;
      g.strokeStyle = i % 2 ? colTrunk : colRing;
      g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    // Crown of arching pinnate palm fronds
    const fronds = [
      [-2.85, 22, -0.45, false], [-2.35, 28, -0.55, false], [-1.85, 26, -0.35, true],
      [-1.30, 26, 0.35, true], [-0.80, 28, 0.55, true], [-0.30, 22, 0.45, false],
      [2.65, 16, -0.35, false], [0.45, 16, 0.35, false]
    ];
    for (const [ang, len0, bend, lit] of fronds) {
      const len = len0 * scale, ca = Math.cos(ang), sa = Math.sin(ang);
      const col = lit ? colFrondL : colFrondD;
      const fx1 = tx + ca * len * 0.55, fy1 = ty + sa * len * 0.55 - 3 * scale;
      const fx2 = tx + ca * len + bend * 6 * scale, fy2 = ty + sa * len + len * 0.38;
      // Central rachis stem
      g.strokeStyle = col; g.lineWidth = 1.2 * scale; g.lineCap = 'round';
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(fx1, fy1, fx2, fy2); g.stroke();
      // Hanging feather leaflets along the frond
      g.fillStyle = col;
      for (let j = 2; j <= 11; j++) {
        const u = j / 12, mu = 1 - u;
        const rx = mu * mu * tx + 2 * mu * u * fx1 + u * u * fx2;
        const ry = mu * mu * ty + 2 * mu * u * fy1 + u * u * fy2;
        const lLen = Math.sin(u * Math.PI) * 5.8 * scale;
        const lAng = ang + (ang < -1.57 ? -1.1 : 1.1) + u * (ang < -1.57 ? -0.3 : 0.3);
        const lx = rx + Math.cos(lAng) * lLen, ly = ry + Math.sin(lAng) * lLen + lLen * 0.45;
        g.beginPath();
        g.moveTo(rx - 0.5 * scale, ry);
        g.lineTo(lx, ly);
        g.lineTo(rx + 0.5 * scale, ry + 0.4 * scale);
        g.closePath();
        g.fill();
      }
    }
  };

  // Helper: fan-shaped Traveler's Palm (Ravenala) silhouette for unmistakable tropical variety
  const drawTravelerPalm = (g, px, py, h, scale, colD, colL) => {
    const ty = py - h;
    g.strokeStyle = colD; g.lineWidth = 2.4 * scale; g.lineCap = 'round';
    g.beginPath(); g.moveTo(px, py); g.lineTo(px, ty); g.stroke();
    for (let i = -5; i <= 5; i++) {
      const ang = -Math.PI / 2 + i * 0.21;
      const len = (19 - Math.abs(i) * 1.1) * scale;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const ex = px + ca * len, ey = ty + sa * len + Math.abs(i) * 0.8 * scale;
      g.strokeStyle = i >= 0 ? colL : colD; g.lineWidth = 0.85 * scale;
      g.beginPath(); g.moveTo(px, ty + Math.abs(i) * 0.5 * scale); g.lineTo(ex, ey); g.stroke();
      // Broad paddle blade at the outer half of each stalk
      const bx0 = px + ca * len * 0.38, by0 = ty + sa * len * 0.38;
      const nx = -sa * 2.1 * scale, ny = ca * 2.1 * scale;
      path(g, [[bx0, by0], [ (bx0 + ex) * 0.5 + nx, (by0 + ey) * 0.5 + ny ], [ex, ey], [ (bx0 + ex) * 0.5 - nx, (by0 + ey) * 0.5 - ny ]], i >= 0 ? colL : colD);
    }
  };

  // Place tall & medium tropical palms across the mid layer in dark, non-distracting rainforest greens
  const palmSpots = [
    [28, 178, 86, -12, 1.05], [64, 180, 62, 9, 0.82],
    [118, 176, 94, 14, 1.12], [156, 182, 58, -8, 0.78],
    [214, 178, 88, -15, 1.06], [262, 180, 68, 11, 0.86],
    [318, 176, 92, 13, 1.10], [362, 182, 64, -10, 0.82],
    [422, 178, 84, -11, 1.00]
  ];
  for (const [px, py, h, lean, sc] of palmSpots) {
    wrapDraw(tg, BG_W, off => drawTropicalPalm(tg, px + off, py, h, lean, sc, '#0e2c20', '#143828', '#143c2a', '#1d5038'));
  }
  for (const [px, py, h, sc] of [[92, 176, 48, 0.9], [186, 178, 54, 1.0], [290, 176, 50, 0.92], [394, 178, 52, 0.95]]) {
    wrapDraw(tg, BG_W, off => drawTravelerPalm(tg, px + off, py, h, sc, '#113424', '#194632'));
  }

  // ── Near layer: deep dark-green tropical undergrowth, banana leaf fans & split monsteras ──
  const [brush, bg] = layer();
  const brushTerms = [[6, 3, 0.4], [4, 8, 1.3], [2.5, 15, 0.6]];
  const topAt = x => 182 - periodic(((x % BG_W) + BG_W) % BG_W, brushTerms);
  // Deep shadow foliage mass
  const bPts = [[0, VIEW_H]];
  for (let x = 0; x <= BG_W; x += 1) bPts.push([x, topAt(x) - 4]);
  bPts.push([BG_W, VIEW_H]);
  path(bg, bPts, '#0a2216');

  // Broad tropical banana leaves rising out of the brush (dark emerald tones so foreground sprites pop)
  const drawBananaLeaf = (g, x, y, ang, len, wid, cTop, cBot, cRib) => {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const side = o => {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const k = i / 14, d = k * len, droop = k * k * len * 0.28;
        const notch = (i === 6 || i === 10) ? 0.55 : 1;
        const hw = Math.sin(Math.PI * Math.pow(k, 0.75)) * wid * notch * o;
        pts.push([x + ca * d - sa * hw, y + sa * d + droop + ca * hw]);
      }
      return pts;
    };
    const up = side(-1), dn = side(1), mid = side(0);
    const fillHalf = (a, b, col) => { g.fillStyle = col; g.beginPath(); a.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); for (let i = b.length - 1; i >= 0; i--) g.lineTo(...b[i]); g.closePath(); g.fill(); };
    fillHalf(up, mid, cTop); fillHalf(mid, dn, cBot);
    g.strokeStyle = cRib; g.lineWidth = 0.55; g.beginPath();
    mid.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
  };

  for (let x = 14; x < BG_W; x += 36) {
    const by = topAt(x) + 2;
    wrapDraw(bg, BG_W, off => {
      const cx = x + off;
      drawBananaLeaf(bg, cx, by, -2.15, 22, 4.8, '#143e28', '#0e2e1e', '#1f5838');
      drawBananaLeaf(bg, cx, by, -1.0, 24, 5.2, '#18482e', '#113422', '#246440');
      drawBananaLeaf(bg, cx, by + 2, -2.55, 16, 3.8, '#103220', '#0b2417', '#1a4a30');
      drawBananaLeaf(bg, cx, by + 2, -0.6, 17, 3.8, '#143e28', '#0e2e1e', '#1f5838');
    });
  }

  // Foreground scalloped undergrowth ridge in deep rainforest green
  const fPts = [[0, VIEW_H]];
  for (let x = 0; x <= BG_W; x += 1) fPts.push([x, topAt(x) + 1]);
  fPts.push([BG_W, VIEW_H]);
  path(bg, fPts, vgrad(bg, 172, VIEW_H, ['#123622', '#091e13']));

  return {
    sky,
    layers: [{ c: far, f: 0.07 }, { c: trees, f: 0.2 }, { c: brush, f: 0.4 }],
    live: drawJungleSky,
  };
}

function jungleBananaArt(){
  return jungleArt('naturalBananaGentle',()=>{
    const A=mArt(32,42),pts=[];
    for(let i=0;i<=64;i++){const u=i/64,v=1-u;pts.push([10*v*v*v+18*3*v*v*u+20*3*v*u*u+12*u*u*u,7+30*u]);}
    A.fill(1,4,31,39,(x,y)=>{
      let best=1e9,side=0,along=0;
      for(let i=0;i<64;i++){
        const [ax,ay]=pts[i],[bx,by]=pts[i+1],dx=bx-ax,dy=by-ay,q=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1),u=(i+q)/64;
        const r=.65+4.3*Math.pow(Math.sin(Math.PI*u),.65),px=ax+dx*q,py=ay+dy*q,d=Math.hypot(x-px,y-py)/r;
        if(d<best){best=d;side=((x-px)*dy-(y-py)*dx)/(Math.hypot(dx,dy)*r);along=u;}
      }
      if(best>1)return null;
      const ridge=Math.abs(side+.22)<.06?.12:Math.abs(side-.48)<.06?-.15:0;
      return softTone(['#9b762c','#c5a138','#e5c852','#f5dd79','#fceba6'],-side*.65+Math.sqrt(1-best*best)*.55+ridge-Math.abs(along-.5)*.12);
    });
    A.poly([[9.4,8],[8.8,5],[9,1.8],[11.2,1.5],[11,4.5],[11.7,7]],'#85834a');A.line(9.7,2,9.8,4.7,'#d1c18a',null,.5);
    A.soft(12.3,36.8,1.1,.9,['#594837','#7b6540','#9b8250','#b8a26f','#d0ba89']);
    for(const [x,y]of [[13,14],[16,21],[16,28],[14,33]])A.ell(x,y,.2,.32,'#bd9848',true);
    return A.outline('#685837',1).canvas();
  });
}
function jungleSpringCrackArt(){
  return jungleArt('springRockCrack',()=>{
    const A=mArt(28,34),C=['#33261e','#513726','#765038','#946b49','#b28a60'];
    A.poly([[10,1],[18,5],[16,9],[24,12],[20,17],[24,22],[18,27],[20,32],[11,30],[8,24],[10,18],[9,13],[12,8]],C[2]);
    A.poly([[11,3],[16,7],[14,12],[21,15],[16,19],[21,23],[15,27],[13,30],[10,23],[12,17],[11,12],[13,8]],C[0]);
    A.poly([[10,17],[16,16],[19,20],[16,24],[9,24],[6,21]],'#1c211d');
    A.poly([[10,16],[15,14],[18,15],[15,17],[10,18]],C[4]);A.poly([[10,24],[16,24],[19,22],[18,26],[12,28],[9,26]],C[3]);
    A.line(17,11,22,7,C[1],null,.6);A.line(22,7,21,4,C[1],null,.34);A.line(20,24,25,27,C[1],null,.45);
    A.soft(13,6,2.7,1.1,['#2d4b2c','#42683c','#61834b','#7b9f5c','#a1b87a'],true,-.4);
    A.soft(18,28,2.2,1.2,['#304a2d','#446641','#63824e','#84a06b','#a1bb80'],true,.2);
    return A.canvas();
  });
}
