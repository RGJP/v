"use strict";
// The title uses a bundled display face, painted directly at the fine screen's native resolution.
// Rainbow fills, a fine bevel and short extrusion keep it playful while every curve stays smooth.
const LOGO_COLORS = [
  ['#ffe3e8', '#ff8a9a', '#ff5d73', '#d63a57', '#8a1f38'],   // C  strawberry
  ['#fff0e0', '#ffbf80', '#ff9a3c', '#d9701a', '#8a400c'],   // H  tangerine
  ['#fffbe0', '#ffe48a', '#ffd166', '#e8a72a', '#9a6210'],   // I  sunflower
  ['#faffdf', '#e2f58a', '#b9d94b', '#829b2c', '#485b18'],   // C  lime
  ['#effde0', '#b8f08a', '#7ed957', '#4fa834', '#2a6418'],   // K  leaf
  ['#e0fffb', '#7ff0e2', '#2ec4b6', '#1c978b', '#0f5c55'],   // A  lagoon
  ['#e6f6ff', '#8fd0ff', '#4fb3ff', '#2f86d6', '#1a4c8a'],   // R  sky
  ['#f0e8ff', '#c4a8ff', '#9a74ff', '#6f4ad6', '#3c2280'],   // O  violet
  ['#ffe6fb', '#ff9ef0', '#f45fd8', '#c23aa8', '#6e1a5e'],   // O  orchid
];

let logoLetters = null;
function getLogoLetters() {
  if (logoLetters) return logoLetters;
  const R = ART_R, pad = 2 * R, depthX = R, depthY = 2 * R, faceH = 31 * R, edge = 1.3 * R;
  const font = '700 100px "Chickaroo Display", sans-serif';
  const measure = makeCanvas(1, 1).getContext('2d'); measure.font = font;
  const cap = measure.measureText('H').actualBoundingBoxAscent || 72;
  const chars = [...'CHICKAROO'];
  const metrics = chars.map(ch => {
    const m = measure.measureText(ch);
    const left = m.actualBoundingBoxLeft || 0, right = m.actualBoundingBoxRight || m.width;
    return { left, width: left + right };
  });
  const target = 330 * R - chars.length * (pad * 2 + depthX) - (chars.length - 1) * 2 * R;
  const sx = target / metrics.reduce((n, m) => n + m.width, 0), sy = faceH / cap;
  const tinted = (mask, color) => {
    const c = makeCanvas(mask.width, mask.height), g = c.getContext('2d');
    g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  };
  logoLetters = chars.map((ch, i) => {
    const m = metrics[i], W = Math.ceil(m.width * sx + pad * 2 + depthX), H = Math.ceil(faceH + pad * 2 + depthY);
    const mask = makeCanvas(W, H), mg = mask.getContext('2d');
    mg.font = font; mg.fillStyle = '#ffffff';
    mg.translate(pad + m.left * sx, pad + faceH); mg.scale(sx, sy); mg.fillText(ch, 0, 0);
    const out = makeCanvas(W, H), g = out.getContext('2d');
    const outline = makeCanvas(W, H), og = outline.getContext('2d');
    // Grow the smooth type outline around both the face and its extrusion.
    for (let e = 0; e <= depthY; e++) for (let a = 0; a < 32; a++) {
      const angle = a / 32 * Math.PI * 2;
      og.drawImage(mask, e * depthX / depthY + Math.cos(angle) * edge, e + Math.sin(angle) * edge);
    }
    g.drawImage(tinted(outline, INK), 0, 0);
    const [shine, light, base, shade, deep] = LOGO_COLORS[i];
    const extrude = makeCanvas(W, H), eg = extrude.getContext('2d');
    for (let e = 1; e <= depthY; e++) eg.drawImage(mask, e * depthX / depthY, e);
    g.drawImage(tinted(extrude, deep), 0, 0);
    const face = makeCanvas(W, H), fg = face.getContext('2d');
    fg.drawImage(mask, 0, 0); fg.globalCompositeOperation = 'source-in';
    const grad = fg.createLinearGradient(0, pad, 0, pad + faceH);
    [[0, light], [0.35, base], [0.78, base], [1, shade]].forEach(([at, col]) => grad.addColorStop(at, col));
    fg.fillStyle = grad; fg.fillRect(0, 0, W, H); g.drawImage(face, 0, 0);
    // A narrow highlight follows the actual letter contour instead of a low-resolution cell grid.
    const bevel = makeCanvas(W, H), bg = bevel.getContext('2d');
    bg.drawImage(mask, 0, 0); bg.globalCompositeOperation = 'destination-out'; bg.drawImage(mask, 0.6 * R, 0.8 * R);
    g.globalAlpha = 0.85; g.drawImage(tinted(bevel, shine), 0, 0); g.globalAlpha = 1;
    return hiRes(out);
  });
  return logoLetters;
}
// each letter's silhouette in ink, for the soft shadow it casts on the sky
let logoShadows = null;
function getLogoShadows() {
  return logoShadows || (logoShadows = getLogoLetters().map(c => {
    const src = c.canvas || c, s = makeCanvas(src.width, src.height), g = s.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = INK; g.fillRect(0, 0, src.width, src.height);
    return c.canvas ? hiRes(s, c.r) : s;
  }));
}
function drawLogo(ctx, cx, y, t) {
  const L = getLogoLetters(), S = getLogoShadows(), gap = 2;
  const total = L.reduce((a, c) => a + c.width, 0) + gap * (L.length - 1);
  let x = Math.round(cx - total / 2);
  L.forEach((c, i) => {
    const arc = -Math.sin(i / (L.length - 1) * Math.PI) * 3;
    const ly = Math.round(y + arc + Math.sin(t * 0.035 - i * 0.45));
    ctx.globalAlpha = 0.18; ctx.drawImage(S[i], x + 1, ly + 4); ctx.globalAlpha = 1;
    ctx.drawImage(c, x, ly);
    x += c.width + gap;
  });
  // twinkles around the logo
  for (const [dx, dy, ph] of [[-total / 2 - 10, 10, 0], [total / 2 + 8, 4, 1.7], [total / 2 + 14, 40, 3.1], [-total / 2 - 4, 44, 4.4]]) {
    const k = Math.sin(t * 0.08 + ph);
    if (k < 0.2) continue;
    const sx = Math.round(cx + dx), sy = Math.round(y + dy), r = k > 0.8 ? 4 : 3;   // (a slim four-point star, in fine pixels)
    fRect(ctx, sx - r + 0.33, sy + 0.33, r * 2 + 0.33, 1 / 3, '#ffffff'); fRect(ctx, sx + 0.33, sy - r + 0.33, 1 / 3, r * 2 + 0.33, '#ffffff');
    fRect(ctx, sx - 0.34, sy - 0.34, 4 / 3, 4 / 3, '#ffffff'); fRect(ctx, sx, sy, 2 / 3, 2 / 3, '#fff3b0');
  }
}


