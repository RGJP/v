'use strict';
// ---- backgrounds (pre-rendered tileable parallax layers) -------------------
const BG_W = 512;
// a sky: the colours top to bottom as one smooth gradient, painted fine (hires.js; it used to be bands with a dither
// between them)
function bandSky(colors) {
  const R = ART_R, c = makeCanvas(VIEW_W * R, VIEW_H * R), g = c.getContext('2d'), H = VIEW_H * R;
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1) * (colors.length - 1), i = Math.min(colors.length - 2, Math.floor(t));
    g.fillStyle = lerpColor(colors[i], colors[i + 1], t - i); g.fillRect(0, y, VIEW_W * R, 1);
  }
  return hiRes(c, R);
}
function periodic(x, terms) {
  let v = 0;
  for (const [a, k, p] of terms) v += a * Math.sin((x / BG_W) * Math.PI * 2 * k + p);
  return v;
}
function ridgeLayer(baseY, terms, fill, edge, extra) {
  const c = makeCanvas(BG_W, VIEW_H), g = c.getContext('2d');
  for (let x = 0; x < BG_W; x++) {
    const top = Math.round(baseY - periodic(x, terms));
    g.fillStyle = fill; g.fillRect(x, top, 1, VIEW_H - top);
    if (edge) { g.fillStyle = edge; g.fillRect(x, top, 1, 2); }
    if (extra) extra(g, x, top);
  }
  return c;
}
function wrapDraw(g, w, fn) { fn(0); fn(-w); fn(w); }
const isFineCtx = ctx => { if (!ctx.getTransform) return false; const m = ctx.getTransform(); return Math.hypot(m.a, m.b) >= 2; };   // (rotated or not)
// ridgeLayer, painted fine (a HiRes whose context draws in game units): the ridge an art column at a time
function ridgeLayerFine(baseY, terms, fill, edge, extra) {
  const R = ART_R, c = makeHiCanvas(BG_W, VIEW_H), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (let ax = 0; ax < BG_W * R; ax++) {
    const top = Math.round((baseY - periodic(ax / R, terms)) * R);
    g.fillStyle = fill; g.fillRect(ax, top, 1, VIEW_H * R - top);
    if (edge) { g.fillStyle = edge; g.fillRect(ax, top, 1, 2 * R); }
  }
  g.setTransform(R, 0, 0, R, 0, 0);
  if (extra) for (let x = 0; x < BG_W; x++) extra(g, x, Math.round(baseY - periodic(x, terms)));
  return c;
}

const bgCache = new Map();
function getBackground(name) {
  if (bgCache.has(name)) return bgCache.get(name);
  let bg;
  const rng = mulberry32(hashStr(name));
  if (name === 'meadow') {
    bg = meadowFineBackground();   // (painted fine: meadow-fine.js)
  } else if (name === 'cave') {
    bg = caveFineBackground();   // (painted fine: cave-fine.js)
  } else if (name === 'snow') {
    bg = snowFineBackground();   // (painted fine: snow-fine.js)
  } else if (name === 'ocean') {
    bg = oceanFineBackground();   // (painted fine: ocean-fine.js)
  } else if (name === 'sky') {
    bg = skyFineBackground();   // (painted fine: sky-fine.js)
  } else if (name === 'clock') {
    bg = clockFineBackground();   // (painted fine: clock-fine.js)
  } else if (name === 'eclipse') {
    bg = eclipseFineBackground();   // (painted fine: eclipse-fine.js)
  } else if (name === 'desert') {
    bg = desertFineBackground();   // (painted fine: desert-fine.js)
  } else if (name === 'jungle') {
    bg = jungleFineBackground();   // (painted fine: jungle-fine.js)
  } else if (name === 'bayou') {
    // (painted fine: its canvases are ART_R times finer, hires.js; shapes are smooth paths on them)
    // far: a hazy violet treeline across the water, and a paddle steamer heading home, lights on
    const far = ridgeLayerFine(150, [[6, 3, 0.4], [4, 7, 1.9], [2, 17, 0.6]], '#4a2e5e', '#5e3a6e', (g, x, top) => {
      if ((x * 11) % 37 < 3) fEll(g, x + 0.5, top - 1.5 - (x % 5) * 0.5, 1.2, 2.4 + (x % 5) * 0.5, '#4a2e5e');   // a few taller trees
    });
    {
      const g = far.getContext('2d'), bx = 300, wy = 146, boat = '#3a2250';
      fPoly(g, [[bx - 2, wy - 6], [bx + 36, wy - 6], [bx + 33, wy], [bx + 1, wy]], boat);                 // the hull
      fRoundRect(g, bx + 4, wy - 11, 24, 5.4, 1, boat); fRoundRect(g, bx + 8, wy - 15, 14, 4.4, 1, boat);  // the decks
      for (const sx of [10, 16]) { fRoundRect(g, bx + sx, wy - 25, 2.2, 10.4, 0.6, boat); fEll(g, bx + sx + 1.1, wy - 25.4, 1.8, 0.8, boat); }   // twin stacks
      fBlob(g, bx + 31, wy - 6, 5, boat);                                                                      // the paddle wheel
      g.strokeStyle = '#5a3a72'; g.lineWidth = 0.35;
      for (let k = 0; k < 6; k++) { const a2 = k / 6 * Math.PI; g.beginPath(); g.moveTo(bx + 31 - Math.cos(a2) * 4.4, wy - 6 - Math.sin(a2) * 4.4); g.lineTo(bx + 31 + Math.cos(a2) * 4.4, wy - 6 + Math.sin(a2) * 4.4); g.stroke(); }
      for (let i = 0; i < 6; i++) { fGlow(g, bx + 7 + i * 4, wy - 8.6, 2.6, '#ffd98a', 0.35); fRoundRect(g, bx + 6 + i * 4, wy - 9.2, 1.8, 1.2, 0.4, '#ffd98a'); }   // lit windows
      for (let i = 0; i < 3; i++) fRoundRect(g, bx + 10 + i * 4, wy - 13.2, 1.8, 1.2, 0.4, '#ffd98a');
      for (const sx of [10, 16]) { fGlow(g, bx + sx + 1.1, wy - 26, 3, '#ff6a5a', 0.5); fBlob(g, bx + sx + 1.1, wy - 26, 0.7, '#ff8a7a'); }   // lamps up the stacks
      const mist=g.createLinearGradient(0,132,0,178);mist.addColorStop(0,'rgba(224,184,216,0)');mist.addColorStop(.45,'rgba(224,184,216,.22)');mist.addColorStop(1,'rgba(224,184,216,0)');
      g.fillStyle=mist;g.fillRect(0,132,BG_W,46);   // mist low over the water
    }
    // mid: bald cypresses, flat crowns dripping Spanish moss, knobby knees at their feet
    const trees = makeHiCanvas(BG_W, VIEW_H);
    {
      const g = trees.getContext('2d'), T = '#2a1c3e', M = '#3e3054';
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(i * BG_W / 5 + rng() * 40), w = 5 + Math.floor(rng() * 4), crown = 34 + Math.floor(rng() * 40);
        const drapes = [0, 1, 2, 3, 4, 5].map(() => [Math.floor(rng() * 50) - 25, 10 + Math.floor(rng() * 26)]);
        wrapDraw(g, BG_W, off => {
          const cx = x + off;
          g.fillStyle = T; g.beginPath();   // the trunk, flaring into buttresses at its foot
          g.moveTo(cx, crown); g.lineTo(cx, VIEW_H - 40); g.quadraticCurveTo(cx - 2, VIEW_H - 14, cx - 16, VIEW_H);
          g.lineTo(cx + w + 16, VIEW_H); g.quadraticCurveTo(cx + w + 2, VIEW_H - 14, cx + w, VIEW_H - 40); g.lineTo(cx + w, crown); g.closePath(); g.fill();
          for (const [dx, h] of [[-26, 6], [-15, 4], [w + 12, 5], [w + 24, 3]]) fRoundRect(g, cx + dx, VIEW_H - 22 - h, 3, h + 22, 1.4, T);   // knees
          for (const [dx, dy, r] of [[-20, 4, 9], [-6, -3, 12], [w + 6, -2, 12], [w + 20, 4, 9], [w >> 1, -8, 10]]) fBlob(g, cx + dx, crown + dy, r, T);   // the flat crown
          fRoundRect(g, cx - 28, crown + 2, w + 56, 5, 2.4, T);
          g.strokeStyle = M; g.lineCap = 'round';   // Spanish moss: long strands, thinning as they hang
          for (const [dx, len] of drapes) for (let k = 0; k < 2; k++) {
            const sx = cx + (w >> 1) + dx + k * 1.4;
            g.lineWidth = 1.4 - k * 0.5; g.beginPath(); g.moveTo(sx, crown + 6);
            for (let y = 0; y <= len - k * 4; y += 1) g.lineTo(sx + Math.sin(y * 0.3 + dx) * 1.5, crown + 6 + y);
            g.stroke();
          }
        });
      }
    }
    // near: reeds and cattails, and the still water mirroring the sunset
    const reeds = makeHiCanvas(BG_W, VIEW_H);
    {
      const g=reeds.getContext('2d'),wg=g.createLinearGradient(0,174,0,204);
      wg.addColorStop(0,'rgba(58,40,72,0)');wg.addColorStop(.55,'rgba(58,40,72,.6)');wg.addColorStop(1,'#2a1e38');
      g.fillStyle=wg;g.fillRect(0,174,BG_W,VIEW_H-174);
      for (let x = 0; x < BG_W; x += 3) if ((x * 7) % 13 < 5) fRoundRect(g, x, 192 + (x * 5) % 24, 4 + (x % 9), 2 / 3, 0.3, (x * 3) % 7 < 3 ? '#f0a070' : '#c86a6a');   // the sunset on the water
      for (let x = 4; x < BG_W; x += 5 + Math.floor(rng() * 9)) {
        const h = 10 + Math.floor(rng() * 18), bend = rng() * 1.2 - 0.6;
        const cattail = rng() < 0.35;
        wrapDraw(g, BG_W, off => {
          grassBlade(g, x + off, 190, h, bend, 1, '#1a1228');
          if (cattail) { const tx = x + off + bend * h * 0.4; fRoundRect(g, tx - 1.2, 190 - h - 1, 2.6, 6, 1.2, '#3a2418'); fRect(g, tx - 1 / 6, 190 - h - 4, 1 / 3, 3, '#1a1228'); }
        });
      }
    }
    bg = {
      sky: bandSky(['#1c1636', '#2a2050', '#422a66', '#6e3a76', '#a85270', '#de8262', '#f4b070']),
      layers: [{ c: far, f: 0.06 }, { c: trees, f: 0.18 }, { c: reeds, f: 0.36 }],
      live: drawBayouSky,
    };
  } else if (name === 'gumbo') {
    // (painted fine: its canvases are ART_R times finer, hires.js; smooth shapes on them)
    // 4-1: a giant stovetop at dusk, seen through the haze of the kitchen. Kept quiet on purpose (the stage in front is
    // busy): a few big shapes, each only a shade off the glow behind it, and nothing tall cutting through the play field.
    const sky = makeHiCanvas(VIEW_W, VIEW_H);
    {
      const g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, VIEW_H), C = ['#2c0a0c', '#3e100e', '#5a1810', '#7e2612', '#a83a18', '#cc5420', '#e6722c', '#f28c3a'];
      C.forEach((c, i) => gr.addColorStop(i / (C.length - 1), c));
      g.fillStyle = gr; g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // smoke hanging under the ceiling in long lazy ribbons, darker than the sky, the lowest one warmed by the fire
    const smoke = makeHiCanvas(BG_W, VIEW_H);
    {
      const g = smoke.getContext('2d');
      for (const [base, thick, amp, k, ph, a] of [[14, 18, 6, 2, 0.4, 0.2], [42, 11, 5, 3, 2.1, 0.14], [68, 7, 4, 2, 4.0, 0.1]]) {
        const mid = x => base + periodic(x, [[amp, k, ph], [amp * 0.4, k * 2 + 1, ph * 1.7]]);
        const half = x => Math.max(0.5, thick * (0.55 + 0.45 * Math.sin((x / BG_W) * Math.PI * 2 * (k + 1) + ph))) / 2;   // thins and swells
        g.globalAlpha = a; g.fillStyle = '#1a0406'; g.beginPath();
        for (let x = 0; x <= BG_W; x += 1) g.lineTo(x, mid(x) - half(x));
        for (let x = BG_W; x >= 0; x -= 1) g.lineTo(x, mid(x) + half(x));
        g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
    }
    // far: the stovetop, a row of big stockpots simmering on their burners, steam curling up out of them
    const stove = makeHiCanvas(BG_W, VIEW_H);
    {
      const g = stove.getContext('2d'), TOP = 172, P = '#8a3016', PL = '#a8441e', PD = '#6a220c', RIM = '#c4562a';
      const steam = makeHiCanvas(BG_W, VIEW_H), sg = steam.getContext('2d');   // painted solid, laid down see-through once
      const metal = (x, w) => { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, PD); gr.addColorStop(0.12, PL); gr.addColorStop(0.3, P); gr.addColorStop(0.85, PD); gr.addColorStop(1, '#5a1a08'); return gr; };
      const pot = (x, w, h, seed) => {
        const top = TOP - h;
        fEll(g, x + w / 2, TOP + 1, w / 2 + 6, 2.2, '#f08634'); fEll(g, x + w / 2, TOP + 0.6, w / 2 - 2, 1, '#ffb246');   // the burner's glow
        for (const s of [-1, 1]) { g.strokeStyle = P; g.lineWidth = 2.4; g.beginPath(); g.ellipse(s < 0 ? x - 1 : x + w + 1, top + 10, 5, 4, 0, s < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, s < 0 ? Math.PI * 1.5 : Math.PI * 0.5); g.stroke(); }   // loop handles
        fRoundRect(g, x, top, w, h, 3, metal(x, w));
        fRoundRect(g, x - 2, top - 3, w + 4, 3.6, 1.6, PD); fRect(g, x - 1, top - 3, w + 2, 2 / 3, RIM);   // the rim
        for (let i = 0; i < 30; i++) {   // a soft plume, wandering a little as it climbs and spreads
          const up = i * 4, cx = x + w / 2 + Math.sin(i * 0.28 + seed) * (2 + up * 0.14), r = w * 0.14 + up * 0.13;
          fBlob(sg, cx, top - 4 - up, r, '#ffe0b0');
        }
      };
      const bottle = (x, h) => {   // a tall bottle: round shoulders, a long neck, a cork, a label barely there
        const top = TOP - h;
        g.fillStyle = metal(x, 16); g.beginPath();
        g.moveTo(x + 4.6, top); g.lineTo(x + 11.4, top); g.lineTo(x + 11, top + 6); g.lineTo(x + 11, top + 12);
        g.quadraticCurveTo(x + 16, top + 14, x + 16, top + 22); g.lineTo(x + 16, TOP); g.lineTo(x, TOP); g.lineTo(x, top + 22);
        g.quadraticCurveTo(x, top + 14, x + 5, top + 12); g.lineTo(x + 5, top + 6); g.closePath(); g.fill();
        fRoundRect(g, x + 3, top + 30, 10, 10, 1, PD);
      };
      wrapDraw(g, BG_W, o => {
        pot(o + 30, 92, 50, 0); bottle(o + 164, 58);
        pot(o + 236, 66, 34, 2); pot(o + 352, 104, 62, 4.5);
      });
      g.fillStyle = '#5c1c0e'; g.fillRect(0, TOP + 2, BG_W, VIEW_H - TOP - 2);
      sg.globalCompositeOperation = 'destination-out';   // thinning out to nothing as it rises
      const fade = sg.createLinearGradient(0, 20, 0, 130); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      sg.fillStyle = fade; sg.fillRect(0, 0, BG_W, TOP);
      g.globalAlpha = 0.11; g.drawImage(steam, 0, 0); g.globalAlpha = 1;
    }
    // near: giant bunches of celery and the odd vegetable lying on the counter, softened by the haze
    const counter = makeHiCanvas(BG_W, VIEW_H);
    {
      const g = counter.getContext('2d'), BASE = 198, S = '#4e421c', M = '#605a24', L = '#76702e', LF = '#48461c', LL = '#5a5824';
      const bunch = (x, n, h) => {
        for (let i = 0; i < n; i++) {
          const lean = (i - (n - 1) / 2) * 0.13 + (rng() - 0.5) * 0.05, hh = h * (0.8 + rng() * 0.25), w = 6;
          const bx = x + i * 3 - n * 1.5, tx = bx + lean * hh + w / 2, ty = BASE - hh;
          const gr = g.createLinearGradient(bx, 0, bx + w, 0); gr.addColorStop(0, L); gr.addColorStop(0.4, M); gr.addColorStop(1, S);
          g.fillStyle = S; g.beginPath(); g.moveTo(bx - 1, BASE); g.lineTo(bx - 1 + lean * hh, ty); g.lineTo(bx + w + 1 + lean * hh, ty); g.lineTo(bx + w + 1, BASE); g.fill();
          g.fillStyle = gr; g.beginPath(); g.moveTo(bx, BASE); g.lineTo(bx + lean * hh, ty); g.lineTo(bx + w + lean * hh, ty); g.lineTo(bx + w, BASE); g.fill();
          for (const a of [-1.1, -0.4, 0.3, 1.0]) {   // a few thin stems, each ending in a small jagged leaf
            const sa = a + lean * 2, len = 6 + Math.floor(rng() * 5), ex = tx + Math.sin(sa) * len, ey = ty - Math.cos(sa) * len;
            g.strokeStyle = S; g.lineWidth = 0.8; g.beginPath(); g.moveTo(tx, ty); g.lineTo(ex, ey); g.stroke();
            fBlob(g, ex, ey, 3, LF); fBlob(g, ex + Math.cos(sa) * 3, ey + Math.sin(sa) * 3 + 1, 2, LF); fBlob(g, ex - Math.cos(sa) * 3, ey - Math.sin(sa) * 3 + 1, 2, LF);
            fEll(g, ex - 0.4, ey - 1.4, 1.2, 0.5, LL);
          }
        }
      };
      const crock = (x) => {   // a stoneware crock of wooden spoons (nothing that could pass for one of the stage's critters)
        for (const [dx, a, len] of [[-5, -0.32, 34], [1, 0.05, 40], [6, 0.38, 30]]) {
          const sx = x + dx, sy = BASE - 18, ex = sx + Math.sin(a) * len, ey = sy - Math.cos(a) * len;
          g.strokeStyle = '#7a3a18'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
          g.save(); g.translate(ex + Math.sin(a) * 3, ey - Math.cos(a) * 3); g.rotate(a); fEll(g, 0, 0, 3.6, 5, '#7a3a18'); fEll(g, -1, -1, 1.2, 2.4, '#8e4a20'); g.restore();   // the bowl
        }
        const cg = g.createLinearGradient(x - 11, 0, x + 11, 0); cg.addColorStop(0, '#7c3418'); cg.addColorStop(0.25, '#6a2a14'); cg.addColorStop(1, '#4a1a0c');
        fRoundRect(g, x - 11, BASE - 22, 22, 22, 3, cg); fRoundRect(g, x - 12, BASE - 24, 24, 3, 1.2, '#6a2a14'); fRect(g, x - 11, BASE - 24, 22, 2 / 3, '#8a4220');
        fRect(g, x - 11, BASE - 14, 22, 1.4, '#5a2210');
      };
      wrapDraw(g, BG_W, o => { bunch(o + 70, 5, 70); crock(o + 200); bunch(o + 330, 4, 52); crock(o + 456); });
      g.fillStyle = '#4a160c'; g.fillRect(0, BASE, BG_W, VIEW_H - BASE); fRect(g, 0, BASE, BG_W, 2 / 3, '#7a2c14');
    }
    bg = {
      sky,
      layers: [{ c: smoke, f: 0.02, drift: 0.04 }, { c: stove, f: 0.05 }, { c: counter, f: 0.1 }],
      live: drawGumboSky,
    };
  } else if (name === 'isle') {
    bg = isleFineBackground();   // (painted fine: ocean-fine.js)
  } else if (name === 'gut') {
    // 3-4, inside the turtle: the dim red vault of a stomach. Far off, the pale arches of his ribs; nearer, folds
    // of lining hanging down like curtains, with veins in them; a heartbeat you can see (drawGutSky)
    const ribs = makeCanvas(BG_W, VIEW_H);
    {
      const g = ribs.getContext('2d');
      for (let i = 0; i < 4; i++) wrapDraw(g, BG_W, off => {
        const cx = i * 128 + 64 + off;
        for (let a = 0; a <= Math.PI; a += 0.01) {
          const x = Math.round(cx + Math.cos(a) * 58), y = Math.round(170 - Math.sin(a) * 140);
          g.fillStyle = '#4a1222'; g.fillRect(x - 3, y, 7, 3);
          g.fillStyle = '#6a2232'; g.fillRect(x - 2, y, 4, 1);
        }
      });
    }
    const folds = makeCanvas(BG_W, VIEW_H);
    {
      const g = folds.getContext('2d');
      for (let i = 0; i < 9; i++) wrapDraw(g, BG_W, off => {
        const cx = i * 57 + 20 + off, len = 50 + Math.floor(rng() * 70), w = 14 + Math.floor(rng() * 12);
        for (let y = 0; y < len; y++) {
          const k = 1 - y / len, hw = Math.max(1, Math.round(w * Math.sqrt(k))), sway = Math.round(Math.sin(y * 0.08 + i) * 3);
          g.fillStyle = '#5a1828'; g.fillRect(cx - hw + sway, y, hw * 2, 1);
          g.fillStyle = '#7a2a3a'; g.fillRect(cx - hw + sway + 1, y, Math.max(1, hw - 2), 1);
          if (y % 9 === 4) { g.fillStyle = '#8a3ac0'; g.globalAlpha = 0.35; g.fillRect(cx + sway - 1, y, 2, 3); g.globalAlpha = 1; }   // a vein
        }
      });
      g.fillStyle = '#3a0c18'; g.fillRect(0, 0, BG_W, 6);
    }
    bg = {
      sky: bandSky(['#1e0610', '#280a16', '#330e1c', '#3e1222', '#4a1628', '#561a2e', '#621e34']),
      layers: [{ c: ribs, f: 0.05 }, { c: folds, f: 0.15 }],
      live: drawGutSky,
    };
  } else {
    bg = citadelFineBackground();   // (1-4: painted fine, citadel-fine.js)
  }
  // everything still painted at 1x is lifted to the fine screen (hires.js): the parallax layers wrap sideways
  if (name !== 'meadow') for (const k of Object.keys(bg)) {
    const v = bg[k];
    if (k === 'layers') for (const L of v) { if (L.c && !(L.c instanceof HiRes) && L.c.getContext) L.c = smoothUp(L.c, ART_R, 'wrapx'); }
    else if (v && !(v instanceof HiRes) && v.getContext && v.width) bg[k] = smoothUp(v, ART_R, v.width === BG_W ? 'wrapx' : 'clamp');
  }
  bgCache.set(name, bg);
  return bg;
}
// A cog: solid disc with square teeth, a hub hole and spokes, turned by `a`.
// a cog: square teeth round a rim, a hub with four spokes (in fine pixels: hires.js; on a 1x canvas, as before)
const DRAW_COG_CACHE = new Map();
function drawCog(ctx, cx, cy, r, teeth, a, col, hole) {
  const fine = ctx.getTransform && Math.abs(ctx.getTransform().a) >= 2;
  if (fine) {
    const period = Math.PI * 2 / teeth, step = ((Math.round((a % period) / period * 24) % 24) + 24) % 24;
    const spStep = ((Math.round((a % (Math.PI / 2)) / (Math.PI / 2) * 24) % 24) + 24) % 24;
    const key = r + ':' + teeth + ':' + col + ':' + hole + ':' + step + ':' + spStep;
    let img = DRAW_COG_CACHE.get(key);
    if (!img) {
      const pad = Math.ceil(r + 5), sz = pad * 2, hc = makeHiCanvas(sz, sz), g = hc.getContext('2d');
      const qa = step / 24 * period, sa = spStep / 24 * (Math.PI / 2);
      for (let i = 0; i < teeth; i++) {
        const ang = qa + i * period, c = Math.cos(ang), sn = Math.sin(ang), w = Math.min(2.2, Math.PI * r / teeth * 0.45), ux = -sn * w, uy = c * w;
        fPoly(g, [[pad + c * (r - 1) + ux, pad + sn * (r - 1) + uy], [pad + c * (r + 3.6) + ux * 0.8, pad + sn * (r + 3.6) + uy * 0.8], [pad + c * (r + 3.6) - ux * 0.8, pad + sn * (r + 3.6) - uy * 0.8], [pad + c * (r - 1) - ux, pad + sn * (r - 1) - uy]], col);
      }
      fBlob(g, pad, pad, r + 0.4, col); fBlob(g, pad, pad, r * 0.7, hole);
      for (let i = 0; i < 4; i++) { const ang = sa + i * Math.PI / 2; fLine(g, pad, pad, pad + Math.cos(ang) * r * 0.72, pad + Math.sin(ang) * r * 0.72, col, 5); }
      fBlob(g, pad, pad, Math.max(2, r * 0.22), col);
      img = { hc, pad };
      DRAW_COG_CACHE.set(key, img);
    }
    ctx.drawImage(img.hc, fSnap(cx - img.pad), fSnap(cy - img.pad));
    return;
  }
  ctx.fillStyle = col;
  for (let i = 0; i < teeth; i++) {
    const ang = a + i * Math.PI * 2 / teeth;
    for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(cx + Math.cos(ang) * (r + k) - 2), Math.round(cy + Math.sin(ang) * (r + k) - 2), 4, 4);
  }
  blob(ctx, cx, cy, r, col);
  blob(ctx, cx, cy, Math.round(r * 0.7), hole);
  ctx.fillStyle = col;
  for (let i = 0; i < 4; i++) {
    const ang = a + i * Math.PI / 2;
    for (let k = 0; k < r * 0.7; k += 2) ctx.fillRect(Math.round(cx + Math.cos(ang) * k - 1), Math.round(cy + Math.sin(ang) * k - 1), 3, 3);
  }
  blob(ctx, cx, cy, Math.max(2, Math.round(r * 0.22)), col);
}
// Midnight Clockworks sky: a full moon that is also a clock face (its hands really turn) and big
// dark gears grinding away between the skyline layers.
// Called just before parallax layer `layerIdx` is drawn: the moon sits over the stars, the gears
// over the towers.
// The clock face's hands keep their own time (Game.handT), which stands still once the clock breaks.
let clockHandT = 0;
function drawClockSky(ctx, layerIdx, cam, t) {
  if (layerIdx === 1) {
    // a giant grandfather clock looming behind the city skyline (the towers hide its feet): its case drawn once and
    // painted at the fine resolution, with its hands and pendulum live
    const cx = 318, fy = 60;
    ctx.drawImage(grandfatherClockArt(), cx - 32, 0);
    const swing = Math.sin(clockHandT * 0.022) * 3.2;
    fLine(ctx, cx, 108, cx + swing, 171, '#a3834e', 2);
    fEll(ctx, cx + swing, 171, 5.3, 6.4, '#8e7444');fEll(ctx, cx + swing - 0.5, 170.4, 4.1, 5.1, '#c5ac6c');fEll(ctx, cx + swing - 1.5, 168.5, 1.5, 2, '#e4d39a');
    const hand = (a, len, w) => fLine(ctx, cx + 0.5, fy + 0.5, cx + 0.5 + Math.cos(a) * len, fy + 0.5 + Math.sin(a) * len, '#2a1d40', w);
    const ht = clockHandT;                                                    // stops when the clock breaks
    hand(ht * 0.0006 - Math.PI / 2 + 1.1, 8, 5);
    hand(ht * 0.0072 - Math.PI / 2, 12, 3);
    fBlob(ctx, cx + 0.5, fy + 0.5, 2, '#7a5a22'); fBlob(ctx, cx, fy, 0.8, '#f0d48a');
  } else if (layerIdx === 2) {
    // distant gears (slow parallax), alternating spin so neighbours mesh
    for (let i = 0; i < 4; i++) {
      const span = 640, x = ((i * 170 + 60 - cam * 0.2) % span + span) % span - 120, y = 150 + (i % 2) * 34, r = i % 2 ? 26 : 38;
      drawCog(ctx, x, y, r, i % 2 ? 10 : 14, (i % 2 ? -1 : 1) * t * (i % 2 ? 0.012 : 0.008), '#1d1945', '#2c205c');
    }
  }
}
// Eclipse Spire sky: a black moon over the sun, its corona streaming. `eclipseLight` (0..1, set by
// the game each frame) slides the moon off as UMBRAROO is worn down, warming the sky toward dawn.
let eclipseLight = 0;
function drawEclipseSky(ctx, layerIdx, cam, t) {
  if (layerIdx !== 1) return;
  const L = eclipseLight, sx = 300, sy = 56;
  if (L > 0.01) {
    ctx.globalAlpha = L * 0.45; ctx.fillStyle = '#4a3a86'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 6; i++) { ctx.globalAlpha = L * 0.07 * (i + 1); ctx.fillStyle = '#ff9a8a'; ctx.fillRect(0, 110 + i * 18, VIEW_W, VIEW_H); }
    ctx.globalAlpha = 1;
  }
  // corona rays: fine streamers that shimmer, fading as the sun returns (in fine pixels: hires.js)
  const baseAlpha = (1 - L) * 0.45;
  if (baseAlpha > 0.005) {
    ctx.fillStyle = '#e8dcff';
    const buckets = 8, s = 1 / 3;
    const bucketPaths = [[], [], [], [], [], [], [], []];
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8 + Math.sin(t * 0.004 + i) * 0.06, len = 34 + ((i * 7) % 5) * 5 + Math.sin(t * 0.03 + i * 1.7) * 3;
      const cosA = Math.cos(a), sinA = Math.sin(a);
      for (let r = 26; r < len; r += s) {
        const u = 1 - (r - 26) / (len - 26);
        const b = Math.min(buckets - 1, Math.max(0, Math.floor(u * buckets)));
        bucketPaths[b].push(fSnap(sx + cosA * r), fSnap(sy + sinA * r));
      }
    }
    for (let b = 0; b < buckets; b++) {
      const pts = bucketPaths[b];
      if (!pts.length) continue;
      ctx.globalAlpha = baseAlpha * ((b + 0.5) / buckets);
      ctx.beginPath();
      for (let j = 0; j < pts.length; j += 2) {
        ctx.rect(pts[j], pts[j + 1], s, s);
      }
      ctx.fill();
    }
  }
  ctx.globalAlpha = 0.10 + L * 0.12; blob(ctx, sx, sy, 46, '#f4e8ff');
  ctx.globalAlpha = 0.18 + L * 0.2; blob(ctx, sx, sy, 32, '#fff3d8');
  ctx.globalAlpha = 1;
  blob(ctx, sx, sy, 24, '#fff6e0');
  if (L < 0.98) {
    const mx = sx - L * 58, my = sy + L * 12;
    blob(ctx, mx, my, 24, '#0b0618');
    // the diamond ring: one bright bead where the sun peeks past the moon's edge
    const bx = Math.round(mx + 22 + L * 2), by = Math.round(my - 8);
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.08) * 0.2; fBlob(ctx, bx, by, 4, '#ffffff'); ctx.globalAlpha = 1;
    fRect(ctx, bx - 6, by + 1 / 3, 13, 1 / 3, '#ffffff'); fRect(ctx, bx + 1 / 3, by - 6, 1 / 3, 13, '#ffffff'); fBlob(ctx, bx + 0.5, by + 0.5, 1, '#ffffff');
  }
}
// Sunscorch sky: buzzards circling far off, and a mirage shimmering along the horizon.
function drawDesertSky(ctx, layerIdx, cam, t) {
  if (layerIdx === 1) {
    const cx = ((240 - cam * 0.05) % 560 + 560) % 560 - 80;   // far-off vultures circling (in fine pixels: hires.js)
    for (let i = 0; i < 3; i++) {
      const a = t * 0.008 + i * 2.1, x = cx + Math.cos(a) * 34, y = 78 + Math.sin(a) * 9, up = Math.sin(t * 0.2 + i * 2) * 0.8;
      fLine(ctx, x - 3.4, y - up, x, y + 0.5, '#6a4e5e', 2); fLine(ctx, x, y + 0.5, x + 3.4, y - up, '#6a4e5e', 2);
    }
  } else if (layerIdx === 3) {
    ctx.fillStyle = '#fff6dc';
    const s = 1 / 3;
    for (let k = 0; k < 4; k++) {   // heat shimmer: thin wavering lines (fine: hires.js)
      ctx.globalAlpha = 0.14 - k * 0.025;
      ctx.beginPath();
      for (let x = 0; x < VIEW_W; x += s) {
        ctx.rect(x, fSnap(156 + k * 3 + Math.sin(x * 0.07 + t * 0.05 + k) * 1.5), s, s);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
// A grass blade rooted at (x, y): `h` px tall, `w` px wide at the base and tapering to a point,
// curving sideways by `bend` (px of lean per px of height at the tip). Stepped in half pixels so the
// blade is one unbroken stroke at any lean.
function grassBlade(ctx, x, y, h, bend, w, col, tip) {
  if (isFineCtx(ctx)) {   // (on a fine canvas: a smooth blade, hires.js)
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i <= h; i += 1 / 3) {
      const k = i / h, bx = x + bend * k * k * h * 0.6, wd = Math.max(1 / 3, w * (1 - k));
      ctx.rect(fSnap(bx - wd / 2), fSnap(y - i), fSnap(wd) || 1 / ART_R, 1 / ART_R);
    }
    ctx.fill();
    if (tip) fRect(ctx, x + bend * h * 0.6, y - h, 2 / 3, 2 / 3, tip);
    return;
  }
  ctx.fillStyle = col;
  for (let i = 0; i <= h; i += 0.5) {
    const k = i / h, bx = x + bend * k * k * h * 0.6, wd = Math.max(1, Math.round(w * (1 - k)));
    ctx.fillRect(Math.round(bx - (wd - 1) / 2), Math.round(y - i), wd, 1);
  }
  if (tip) { ctx.fillStyle = tip; ctx.fillRect(Math.round(x + bend * h * 0.6), Math.round(y - h), 1, 1); }
}
// Monsoon Jungle sky: storm clouds roll in over it as the monsoon builds (`jungleStorm`, set by
// the game each frame), with the odd far-off lightning bolt.
const jungleStorm = { cloud: 0, bolt: 0, boltX: 200 };
function drawJungleSky(ctx, layerIdx, cam, t) {
  if (layerIdx !== 0) return;
  const S = jungleStorm, k = S.cloud;
  if (k < 0.01) return;
  ctx.globalAlpha = 0.5 * k; ctx.fillStyle = '#3a4a58'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  // a heavy bank of cloud sagging down from the top, drifting slowly
  for (let i = 0; i < 9; i++) {
    const x = ((i * 61 - t * 0.15 - cam * 0.03) % 540 + 540) % 540 - 70, y = -14 + Math.round(k * 30) + (i % 3) * 7;
    ctx.globalAlpha = 0.9 * k; blob(ctx, x, y, 26 + (i % 4) * 5, '#4a5866');
    ctx.globalAlpha = 0.9 * k; blob(ctx, x + 8, y - 4, 20 + (i % 3) * 4, '#5a6876');
  }
  ctx.globalAlpha = 1;
  if (S.bolt > 0) {
    // a jagged, branching bolt way off in the distance (no full-screen flash)
    const rngB = mulberry32(Math.floor(S.boltX * 7)); let x = S.boltX, y = 20;
    ctx.globalAlpha = Math.min(1, S.bolt / 8); ctx.fillStyle = '#f2f8ff';
    while (y < 130) { const nx = x + Math.round(rngB() * 10 - 5), ny = y + 6 + Math.floor(rngB() * 6); plotLine(ctx, x, y, nx, ny, Math.min(1, S.bolt / 8)); x = nx; y = ny; }
    ctx.globalAlpha = 1;
  }
}
// Bayou dusk: stars coming out up top, and a big honey moon rising over the swamp
function drawBayouSky(ctx, layerIdx, cam, t) {
  if (layerIdx !== 0) return;
  for (let i = 0; i < 46; i++) {
    const x = ((i * 89 + 13) % 431 - cam * 0.01 + 431) % 431 - 15, y = (i * 37) % 70 + 3;
    const tw = Math.sin(t * 0.03 + i * 1.7);
    if (tw < -0.6) continue;
    const c = i % 5 ? '#d8c8ff' : '#fff3c8'; ctx.globalAlpha = 0.5 + tw * 0.4; fBlob(ctx, x + 0.5, y + 0.5, 0.6, c);   // (fine: hires.js)
    if (i % 11 === 0 && tw > 0.7) { fRect(ctx, x - 1.4, y + 1 / 3, 3.8, 1 / 3, c); fRect(ctx, x + 1 / 3, y - 1.4, 1 / 3, 3.8, c); }
  }
  ctx.globalAlpha = 1;   // (left at the last star's twinkle, every layer behind would pulse with it)
  const mx = 300 - cam * 0.008, my = 62;   // (the moon drifts by, ever so slowly: no jumps)
  fGlow(ctx, mx, my, 40, '#ffe8b0', 0.4);   // (a smooth halo: hires.js)
  blob(ctx, mx, my, 16, '#ffe8b0'); blob(ctx, mx + 3, my - 2, 13, '#fff4d0');
  for (const [dx, dy, r] of [[-5, 4.5, 2.2], [5.5, -7, 1.6], [7.5, 7, 1.6], [-2, -4, 1.2]]) fEll(ctx, mx + dx, my + dy, r, r * 0.8, '#f0d898');   // its seas
}


// The fever dream's sky: small embers drifting through the firelight.
function drawGumboSky(ctx, layerIdx, cam, t) {
  if (layerIdx === 1) {   // embers drifting up out of the fire: tiny, slow, fading (never a flash)
    for (let i = 0; i < 16; i++) {
      const life = 260 + (i * 41) % 200, u = ((t + i * 89) % life) / life;
      const x = ((i * 61 + 13 - cam * 0.25) % VIEW_W + VIEW_W) % VIEW_W + Math.sin(t * 0.02 + i * 1.7) * 8, y = VIEW_H - 10 - u * 190;
      ctx.globalAlpha = 0.7 * Math.sin(u * Math.PI); fEll(ctx, x + 0.5, y + 0.6, 0.55, i % 4 === 0 ? 0.9 : 0.55, i % 3 ? '#ffb040' : '#ffe08a');   // (fine)
    }
    ctx.globalAlpha = 1;
  }
}

function drawBackground(ctx, name, cam, t) {
  const bg = getBackground(name);
  ctx.drawImage(bg.sky, 0, 0);
  for (let i = 0; i < bg.layers.length; i++) {
    const L = bg.layers[i];
    if (bg.live) { ctx.save(); bg.live(ctx, i, cam, t); ctx.restore(); }   // (sealed off: no alpha or style a live sky leaves behind can touch the layers)
    // (bg.shift / bg.lift: extra scroll and rise per layer, for a background that moves by itself -- 3-4's turtle walking)
    const raw = -Math.round((cam * L.f + t * (L.drift || 0) + (bg.shift ? bg.shift(i) : 0)) * ART_R) / ART_R;   // (to the art pixel: smooth parallax on the fine screen)
    const off = ((raw % BG_W) + BG_W) % BG_W, dy = bg.lift ? Math.round(bg.lift(i)) : 0;
    ctx.drawImage(L.c, off - BG_W, dy);
    ctx.drawImage(L.c, off, dy);
  }
  if (bg.live) { ctx.save(); bg.live(ctx, bg.layers.length, cam, t); ctx.restore(); }   // (and once more over the top of them all)
}

// 1-1 is one summer's day, dawn at the start and sunset at the goal: how far along he is (0-1), set each frame by the
// game (null anywhere else, the title screen included), and the screen x of the cloud drifting over the sun (or null)
let meadowDay = null, meadowCloud = null;
function dayWeights(day) {   // how much of the dawn / golden-hour / sunset sky shows (eased: the afternoon slides into sunset)
  const ease = (a, b) => { const u = clamp((day - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  return { dawn: 1 - ease(0, 0.16), gold: ease(0.45, 0.66) * (1 - ease(0.86, 0.99)), dusk: ease(0.64, 0.97) };
}
// where the sun hangs on screen: it rises at the left, crosses high and sets behind the far hills at the right
function sunScreen(day) { return { x: Math.round(46 + 316 * day), y: Math.round(150 - Math.sin(Math.PI * Math.min(1.06, day * 1.04 + 0.02)) * 116) }; }
function drawMeadowSky(ctx, layerIdx, cam, t) {
  if (meadowDay == null) return;
  const bg = getBackground('meadow'), w = dayWeights(meadowDay);
  if (layerIdx === 0) {
    for (const k of ['dawn', 'gold', 'dusk']) if (w[k] > 0) { ctx.globalAlpha = w[k]; ctx.drawImage(bg[k], 0, 0); }
    ctx.globalAlpha = 1;
    const noon = ['#ffc040', '#ffe680', '#fffbe0'], dawn = ['#ff9a5a', '#ffc880', '#fff0c8'], dusk = ['#ff7a3a', '#ffb060', '#ffe0a0'];
    const s = sunScreen(meadowDay), col = noon.map((c, i) => lerpColor(lerpColor(c, dawn[i], w.dawn), dusk[i], w.dusk));   // (it warms gradually, never a jump)
    for (const [r, a] of [[24, 0.07], [20, 0.09], [17, 0.12]]) { ctx.globalAlpha = a; fBlob(ctx, s.x, s.y, r, col[2]); }   // a soft glow, see-through
    ctx.globalAlpha = 1;
    ctx.drawImage(meadowSun(col), s.x - 24, s.y - 24);   // (painted fine: meadow-fine.js)
    if (meadowCloud != null) {   // the cloud that keeps drifting over it (1-1's sun-gazing blooms)
      const cx = Math.round(meadowCloud), cy = s.y + 4;   // (a long bank of cloud: it hides the sun most of the time)
      const puffs = [];
      for (let dx = -200; dx <= 200; dx += 14) {
        const k = 1 - Math.abs(dx) / 230;
        puffs.push([dx, 6, Math.round(8 + k * 12)]);                                                   // the flat-ish base
        if ((dx / 14) % 2 === 0) puffs.push([dx + 5, Math.round(-4 - k * 10), Math.round(6 + k * 11)]);   // billows on top
      }
      for (const [dx, dy, r] of puffs) blob(ctx, cx + dx, cy + dy + 3, r, '#c4d6ee');
      for (const [dx, dy, r] of puffs) blob(ctx, cx + dx, cy + dy, r, '#ffffff');
    }
  } else if (layerIdx === bg.layers.length) {
    // the light over the far scenery: peach at dawn, warm gold, then a sunset glow
    const tint = [['#ffb0a0', 0.16 * w.dawn], ['#ffc060', 0.1 * w.gold], ['#ff7a5a', 0.22 * w.dusk]];
    for (const [c, a] of tint) if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    ctx.globalAlpha = 1;
  }
}

// Inside the turtle: the stomach walls glow and dim with every heartbeat, and bubbles of gas wobble up
function drawGutSky(ctx, layerIdx, cam, t) {
  if (layerIdx === 1) {
    const beat = t % 70, k = beat < 8 ? beat / 8 : beat < 14 ? 1 - (beat - 8) / 6 : beat < 22 ? (beat - 14) / 8 * 0.6 : beat < 30 ? 0.6 - (beat - 22) / 8 * 0.6 : 0;
    ctx.globalAlpha = 0.1 * k; ctx.fillStyle = '#ff4a6a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  }
  if (layerIdx === 2) {
    for (let i = 0; i < 12; i++) {
      const life = 300 + (i * 53) % 200, u = ((t + i * 97) % life) / life;
      const x = (i * 71 + 30) % VIEW_W + Math.sin(t * 0.05 + i) * 4, y = VIEW_H - u * (VIEW_H + 20), r = 2 + (i % 3);
      ctx.globalAlpha = 0.25 * Math.sin(u * Math.PI); blob(ctx, x, y, r, '#c8ff9a'); ctx.globalAlpha = 0.4 * Math.sin(u * Math.PI);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), 1, 1); ctx.globalAlpha = 1;
    }
  }
}

// Where each stage treasure hovers (centre y), and its sparkle colours when grabbed.
// treasures stand on a 1-tile pedestal (row 11), so their tops are at 11 * TILE
const GOAL_Y = { lantern: 11 * TILE - 28, honey: 11 * TILE - 30, hourglass: 11 * TILE - 30, snowflake: 11 * TILE - 30, flower: 11 * TILE - 30, geode: 11 * TILE - 26, feather: 11 * TILE - 34, pearl: 11 * TILE - 12, scarab: 11 * TILE - 28, banana: 11 * TILE - 26, note: 11 * TILE - 30, crystal: 150 };

// A level's checkpoint columns in order (def.checkpoint is one column or a list of them).
const checkpoints = def => [].concat(def.checkpoint || []).sort((a, b) => a - b);
// the row checkpoint i stands on: def.cpRows says, or else the surface of its column
const cpRow = (lv, i) => lv.def.cpRows && lv.def.cpRows[i] != null ? lv.def.cpRows[i] : lv.surfaceRow(checkpoints(lv.def)[i]);

// Height in px of the decorative cave ceiling at world x.
const caveCeilingH = x => 16 + Math.round(Math.sin(x * 0.07) * 4 + Math.sin(x * 0.19 + 1) * 2 + Math.sin(x * 0.013) * 5);

