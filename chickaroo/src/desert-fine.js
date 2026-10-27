'use strict';
// Sunscorch panorama (3-1), painted fine as layered illustration, hazier the farther off: a wide warm sky with high
// wisps of cloud; a far range of mesas; the three great pyramids (gold capstone and all) with the Sphinx, nose patched
// up with a sticking plaster, a bird on his head; a dune ridge with a camel caravan (the last camel carries a tourist's
// beach umbrella and suitcase), an obelisk with a stork's nest, a ruined colonnade and a little oasis camp, washing on
// the line; and near dunes with the stone legs of a vanished king, his toppled head half-buried (somebody's sunglasses
// left on it), a lost signpost that can't make up its mind, a cactus in a straw hat, and footprints that give up.
// Soft edges and low contrast: it stays behind the stage. (BG_W wide and seamless; live: vultures and heat shimmer.)
function desertFineBackground() {
  const rng = mulberry32(hashStr('sunscorch-panorama'));
  const layer = () => { const c = makeHiCanvas(BG_W, VIEW_H); return [c, c.getContext('2d')]; };
  const path = (g, pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  const vgrad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
  // a ridge across the whole panorama (seamless): filled from its top edge down, a lighter rim along the top
  const ridge = (g, baseY, terms, fill, rim) => {
    const pts = [[0, VIEW_H]];
    for (let x = 0; x <= BG_W; x += 1 / 3) pts.push([x, baseY - periodic(x, terms)]);
    pts.push([BG_W, VIEW_H]); path(g, pts, fill);
    if (rim) { g.strokeStyle = rim; g.lineWidth = 0.7; g.beginPath(); for (let x = 0; x <= BG_W; x += 1 / 3) g.lineTo(x, baseY - periodic(x, terms) + 0.35); g.stroke(); }
    return x => baseY - periodic(((x % BG_W) + BG_W) % BG_W, terms);
  };

  // ── the sky: deep blue high up to a hot pale gold at the horizon, and thin wisps of cirrus ──
  const sky = makeHiCanvas(VIEW_W, VIEW_H), sg = sky.getContext('2d');
  sg.fillStyle = vgrad(sg, 0, VIEW_H, ['#3470a2', '#5f97bd', '#9cc0cc', '#dcd5b8', '#f4d6a2', '#f6cf98']); sg.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let i = 0; i < 9; i++) {
    const x = rng() * VIEW_W, y = 18 + rng() * 60, w = 30 + rng() * 60;
    sg.globalAlpha = 0.12 + rng() * 0.1; sg.strokeStyle = '#ffffff'; sg.lineCap = 'round';
    for (let k = 0; k < 3; k++) { sg.lineWidth = 1.4 - k * 0.4; sg.beginPath(); sg.moveTo(x + k * 6, y + k * 1.6); sg.quadraticCurveTo(x + w * 0.5 + k * 4, y - 3 + k, x + w - k * 5, y + 1 + k * 1.2); sg.stroke(); }
  }
  sg.globalAlpha = 1;

  // ── the sun, very far off ──
  const [sun, su] = layer();
  fGlow(su, 365, 43, 70, '#ffe5a9', 0.4); fGlow(su, 365, 43, 32, '#fff2c7', 0.45);
  su.fillStyle = '#fff6d6'; su.beginPath(); su.arc(365, 43, 17, 0, Math.PI * 2); su.fill();

  // ── far: a long range of mesas and buttes, banded with strata, lost in the haze ──
  const [far, fg] = layer();
  const mesas = [[30, 112, 46], [120, 120, 30], [205, 108, 60], [318, 118, 36], [420, 110, 54]];
  for (const [mx, top, hw] of mesas) wrapDraw(fg, BG_W, off => {
    const x = mx + off, pts = [[x - hw - 22, 160], [x - hw - 4, top + 8], [x - hw + 2, top + 2], [x - hw * 0.4, top], [x + hw * 0.5, top + 1], [x + hw - 1, top + 3], [x + hw + 5, top + 12], [x + hw + 26, 160]];
    path(fg, pts, vgrad(fg, top, 160, ['#d9b6a6', '#cfa496', '#d8b4a0']));
    fg.save(); fg.beginPath(); pts.forEach(([a, b], i) => i ? fg.lineTo(a, b) : fg.moveTo(a, b)); fg.closePath(); fg.clip();
    path(fg, [[x + hw * 0.15, top], [x + hw + 5, top + 12], [x + hw + 26, 160], [x + hw * 0.2, 160]], 'rgba(160,110,120,0.22)');   // the shaded side
    fg.strokeStyle = 'rgba(150,100,100,0.25)'; fg.lineWidth = 0.5;
    for (let s = top + 5; s < 160; s += 5 + (s % 3)) { fg.beginPath(); fg.moveTo(x - hw - 30, s); fg.lineTo(x + hw + 30, s + Math.sin(s) * 0.8); fg.stroke(); }   // strata
    fg.restore();
  });
  fg.fillStyle = vgrad(fg, 128, 166, ['rgba(240,214,170,0)', 'rgba(240,214,170,0.75)']); fg.fillRect(0, 128, BG_W, 40);

  // ── the pyramids and the Sphinx ──
  const [pyr, pg] = layer();
  const pyramid = (x, base, h, cap) => {
    const hw = h * 0.95, ax = x, ay = base - h;
    path(pg, [[ax, ay], [ax - hw, base], [ax + hw * 0.18, base]], vgrad(pg, ay, base, ['#f2dcb6', '#e6c49a', '#dbb48a']));   // the sunlit face
    path(pg, [[ax, ay], [ax + hw * 0.18, base], [ax + hw, base]], vgrad(pg, ay, base, ['#c9977e', '#b88674', '#b07f70']));   // the face in shade
    pg.save(); pg.beginPath(); pg.moveTo(ax, ay); pg.lineTo(ax - hw, base); pg.lineTo(ax + hw, base); pg.closePath(); pg.clip();
    pg.strokeStyle = 'rgba(120,80,60,0.18)'; pg.lineWidth = 0.4;
    for (let y = ay + 3; y < base; y += 2.2) { pg.beginPath(); pg.moveTo(ax - hw, y); pg.lineTo(ax + hw, y); pg.stroke(); }   // the courses of stone
    for (let k = 0; k < 7; k++) { const y = ay + 6 + rng() * (h - 8), u = (y - ay) / h; fEll(pg, ax - hw * u * (0.2 + rng() * 0.7), y, 1.2, 0.5, 'rgba(150,100,80,0.35)'); }   // worn patches
    pg.restore();
    pg.strokeStyle = '#fff2d6'; pg.lineWidth = 0.4; pg.beginPath(); pg.moveTo(ax, ay); pg.lineTo(ax - hw, base); pg.stroke();   // the lit arris
    if (cap) { path(pg, [[ax, ay], [ax - 3.4, ay + 3.6], [ax + 0.7, ay + 3.6]], '#ffd27a'); path(pg, [[ax, ay], [ax + 0.7, ay + 3.6], [ax + 3.4, ay + 3.6]], '#d8a040'); fGlow(pg, ax - 0.6, ay + 1.4, 5, '#fff3c0', 0.6); }
  };
  const sphinx = (x, base) => {
    const body = '#d9b48c', dark = '#bb9070';
    path(pg, [[x - 26, base], [x - 24, base - 7], [x - 10, base - 9], [x + 2, base - 9], [x + 6, base - 6], [x + 15, base - 4], [x + 18, base]], body);   // the lion's back and haunch
    path(pg, [[x + 4, base - 2.4], [x + 22, base - 2], [x + 22, base], [x + 4, base]], dark);   // forepaws, stretched out
    path(pg, [[x + 2, base - 9], [x + 2, base - 18], [x + 5, base - 21.4], [x + 11, base - 21], [x + 13, base - 16], [x + 12, base - 9]], body);   // the head-cloth (nemes)...
    pg.strokeStyle = 'rgba(120,80,60,0.45)'; pg.lineWidth = 0.4;
    for (let k = 0; k < 4; k++) { pg.beginPath(); pg.moveTo(x + 2.4, base - 17 + k * 2.2); pg.lineTo(x + 5, base - 16 + k * 2.2); pg.stroke(); }   // ...striped
    path(pg, [[x + 7, base - 19], [x + 11.6, base - 18.4], [x + 12, base - 12], [x + 8, base - 11]], '#e8c8a0');   // the face
    fEll(pg, x + 10, base - 16.6, 0.6, 0.35, '#7a5040');                                                                       // a weary eye
    fRoundRect(pg, x + 11.4, base - 15.6, 2.4, 1.3, 0.5, '#f4e6d0'); fRect(pg, x + 12.1, base - 15.4, 0.8, 0.9, '#d8c0a0');   // the sticking plaster where his nose was
    pg.strokeStyle = '#5a4030'; pg.lineWidth = 0.35; pg.beginPath(); pg.moveTo(x + 9.6, base - 13.4); pg.lineTo(x + 11.2, base - 13.2); pg.stroke();   // a long-suffering mouth
    fEll(pg, x + 7.4, base - 22.2, 1.3, 0.9, '#5a5a6a'); fEll(pg, x + 8.4, base - 22.8, 0.6, 0.55, '#5a5a6a'); path(pg, [[x + 9, base - 22.9], [x + 10.2, base - 22.6], [x + 9, base - 22.4]], '#e0a040');   // a little bird on his head
  };
  wrapDraw(pg, BG_W, off => { pyramid(70 + off, 150, 44, true); pyramid(118 + off, 150, 34, false); pyramid(150 + off, 150, 20, false); sphinx(178 + off, 150); });
  wrapDraw(pg, BG_W, off => { pyramid(390 + off, 150, 26, false); pyramid(412 + off, 150, 16, false); });
  // a far oasis: a smudge of palms with a glint of water
  wrapDraw(pg, BG_W, off => {
    const ox = 300 + off;
    fEll(pg, ox, 149.4, 16, 1.6, 'rgba(120,170,180,0.6)'); fEll(pg, ox - 3, 149, 7, 0.5, 'rgba(230,250,250,0.5)');
    for (const [dx, h] of [[-9, 13], [-4, 17], [3, 15], [8, 11]]) {
      pg.strokeStyle = '#8a8a62'; pg.lineWidth = 0.8; pg.beginPath(); pg.moveTo(ox + dx, 149); pg.quadraticCurveTo(ox + dx + 1, 149 - h * 0.6, ox + dx + 1.6, 149 - h); pg.stroke();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.62; pg.strokeStyle = '#7f9a6a'; pg.lineWidth = 0.9; pg.beginPath(); pg.moveTo(ox + dx + 1.6, 149 - h); pg.quadraticCurveTo(ox + dx + 1.6 + Math.cos(a) * 4, 149 - h + Math.sin(a) * 2.4, ox + dx + 1.6 + Math.cos(a) * 6.4, 149 - h + Math.sin(a) * 1.2 + 3); pg.stroke(); }
    }
  });
  pg.fillStyle = vgrad(pg, 138, 158, ['rgba(244,220,178,0)', 'rgba(244,220,178,0.55)']); pg.fillRect(0, 138, BG_W, 22);

  // ── mid: a long dune ridge with a caravan on it, an obelisk, a ruined colonnade, an oasis camp ──
  const [mid, mg] = layer();
  const midTop = ridge(mg, 166, [[7, 2, 0.6], [4, 5, 1.4], [1.6, 11, 0.2]], vgrad(mg, 150, VIEW_H, ['#e4bf8e', '#d8ad7c', '#c99a6c']), '#f6dcb0');
  mg.save(); mg.globalAlpha = 0.18; mg.strokeStyle = '#a87a54'; mg.lineWidth = 0.4;   // wind ripples
  for (let y = 160; y < VIEW_H; y += 3.2) { mg.beginPath(); for (let x = 0; x <= BG_W; x += 2) mg.lineTo(x, Math.max(midTop(x) + 2, y + Math.sin(x * 0.09 + y) * 1.2)); mg.stroke(); }
  mg.restore();
  const camel = (x, y, pack) => {   // a camel in profile, walking right, a rider or a load on its hump
    const c = '#6a4c3a';
    fEll(mg, x, y - 7, 5.4, 2.6, c); fEll(mg, x - 0.6, y - 9.4, 2.6, 2.2, c);                         // body and hump
    mg.strokeStyle = c; mg.lineWidth = 1.1; mg.lineCap = 'round';
    mg.beginPath(); mg.moveTo(x + 4.4, y - 8); mg.quadraticCurveTo(x + 7.4, y - 9, x + 7.6, y - 12.4); mg.stroke();   // neck
    fEll(mg, x + 8.4, y - 12.6, 1.5, 0.9, c);                                                               // head
    mg.lineWidth = 0.7; for (const [a, b] of [[-3.6, -4.6], [-2.6, -1.8], [2.6, 3.6], [3.6, 2.4]]) { mg.beginPath(); mg.moveTo(x + a, y - 5.6); mg.lineTo(x + b, y); mg.stroke(); }   // legs, mid-stride
    if (pack === 'rider') { fEll(mg, x - 0.6, y - 13.4, 1, 2, '#3e5a7a'); fBlob(mg, x - 0.4, y - 15.8, 0.9, '#f0e6d0'); }
    else if (pack === 'bags') { fRoundRect(mg, x - 3.4, y - 13.6, 5.4, 3.4, 0.8, '#a8603a'); fRoundRect(mg, x - 2.6, y - 15.6, 3.6, 2.2, 0.6, '#c89a50'); }
    else {   // the tourist's camel: a suitcase, and a striped beach umbrella open over it all
      fRoundRect(mg, x - 3.2, y - 13.4, 4.6, 3.2, 0.6, '#3a6ad8'); fRect(mg, x - 1.4, y - 14.2, 1, 0.8, '#3a3a3a');
      mg.strokeStyle = '#5a5a5a'; mg.lineWidth = 0.4; mg.beginPath(); mg.moveTo(x - 0.4, y - 12); mg.lineTo(x - 1.4, y - 20); mg.stroke();
      for (let k = 0; k < 4; k++) path(mg, [[x - 1.4, y - 20.6], [x - 6.6 + k * 2.6, y - 18.4], [x - 4 + k * 2.6, y - 18.4]], k % 2 ? '#ffffff' : '#e8463a');
    }
  };
  wrapDraw(mg, BG_W, off => { [[40, 'rider'], [55, 'bags'], [70, 'rider'], [86, 'tourist']].forEach(([x, pk]) => camel(x + off, midTop(x) + 1, pk)); });
  wrapDraw(mg, BG_W, off => {   // the obelisk, a stork nesting on top
    const x = 236 + off, b = midTop(236) + 2, h = 46;
    path(mg, [[x - 3.6, b], [x - 2.4, b - h], [x, b - h - 4], [x + 2.4, b - h], [x + 3.6, b]], vgrad(mg, b - h, b, ['#e6cba4', '#d0ae86']));
    path(mg, [[x, b - h - 4], [x + 2.4, b - h], [x + 3.6, b], [x + 0.4, b]], 'rgba(150,100,80,0.35)');
    mg.strokeStyle = 'rgba(110,70,50,0.45)'; mg.lineWidth = 0.35;
    for (let y = b - h + 3; y < b - 3; y += 2.6) { mg.beginPath(); mg.moveTo(x - 1, y); mg.lineTo(x + 0.6, y + (y % 2 ? 0.4 : -0.3)); mg.stroke(); }   // a column of glyphs
    fEll(mg, x, b - h - 3.6, 3.4, 1.2, '#8a6a44'); fEll(mg, x - 0.6, b - h - 6.2, 1.4, 1.8, '#f4f0e8'); fEll(mg, x + 0.2, b - h - 8, 0.8, 0.7, '#f4f0e8');
    mg.strokeStyle = '#e07a3a'; mg.lineWidth = 0.4; mg.beginPath(); mg.moveTo(x + 0.8, b - h - 8); mg.lineTo(x + 2.8, b - h - 7.6); mg.stroke();
  });
  wrapDraw(mg, BG_W, off => {   // a ruined colonnade: columns standing, broken and fallen, a lintel still across two of them
    const x0 = 300 + off, b = midTop(320) + 3;
    for (const [dx, h, broken] of [[0, 30, false], [11, 30, false], [22, 19, true], [33, 26, true]]) {
      const x = x0 + dx;
      fRoundRect(mg, x - 2.6, b - h, 5.2, h, 0.6, '#e2c6a0'); fRect(mg, x + 0.8, b - h, 1.8, h, 'rgba(150,100,80,0.3)');
      for (let y = b - h + 4; y < b; y += 4) fRect(mg, x - 2.6, y, 5.2, 0.35, 'rgba(120,80,60,0.3)');
      if (broken) path(mg, [[x - 2.6, b - h], [x - 1, b - h - 2], [x + 0.6, b - h - 0.6], [x + 2.6, b - h - 1.8], [x + 2.6, b - h]], '#e2c6a0');
      else fRoundRect(mg, x - 3.4, b - h - 2, 6.8, 2, 0.4, '#ecd4ae');
    }
    fRoundRect(mg, x0 - 4, b - 34, 19, 3, 0.5, '#ecd4ae');   // the lintel
    fRoundRect(mg, x0 + 40, b - 4.6, 14, 4.4, 2, '#dcc098');  // a fallen drum
  });
  wrapDraw(mg, BG_W, off => {   // an oasis camp: two striped tents, palms, and the washing out to dry
    const x0 = 430 + off, b = midTop(440) + 2;
    for (const [dx, h] of [[-12, 22], [14, 18], [20, 25]]) {
      const x = x0 + dx;
      mg.strokeStyle = '#8a6a44'; mg.lineWidth = 1; mg.beginPath(); mg.moveTo(x, b); mg.quadraticCurveTo(x + 1.6, b - h * 0.6, x + 2.2, b - h); mg.stroke();
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; mg.strokeStyle = k % 2 ? '#5f8a4a' : '#6f9a54'; mg.lineWidth = 1.3; mg.beginPath(); mg.moveTo(x + 2.2, b - h); mg.quadraticCurveTo(x + 2.2 + Math.cos(a) * 6, b - h + Math.sin(a) * 3.4, x + 2.2 + Math.cos(a) * 9.4, b - h + Math.sin(a) * 1.4 + 4); mg.stroke(); }
    }
    for (const [dx, w, c] of [[-4, 9, '#c8503a'], [6, 7, '#3a6aa8']]) {
      path(mg, [[x0 + dx - w, b], [x0 + dx, b - w * 0.9], [x0 + dx + w, b]], c);
      mg.save(); mg.beginPath(); mg.moveTo(x0 + dx - w, b); mg.lineTo(x0 + dx, b - w * 0.9); mg.lineTo(x0 + dx + w, b); mg.closePath(); mg.clip();
      for (let k = -w; k < w; k += 2.4) fRect(mg, x0 + dx + k, b - w, 1.1, w, 'rgba(255,240,220,0.55)');
      mg.restore(); path(mg, [[x0 + dx - 1, b], [x0 + dx, b - 3.4], [x0 + dx + 1, b]], '#3a2418');
    }
    mg.strokeStyle = '#5a4a3a'; mg.lineWidth = 0.3; mg.beginPath(); mg.moveTo(x0 - 10, b - 16); mg.quadraticCurveTo(x0 + 2, b - 13, x0 + 15, b - 16); mg.stroke();   // the washing line, palm to palm
    for (const [dx, c, w] of [[-6, '#ffffff', 2.4], [-2, '#e8b030', 2], [2.6, '#ff8fb8', 3], [7.4, '#ffffff', 2]]) fRect(mg, x0 + dx, b - 14.8 + Math.abs(dx) * 0.04, w, 2.6, c);
  });
  mg.fillStyle = vgrad(mg, 150, 175, ['rgba(244,220,178,0)', 'rgba(244,220,178,0.25)']); mg.fillRect(0, 150, BG_W, 25);

  // ── near: big rippled dunes, the stone legs and toppled head of a forgotten king, and odds and ends ──
  const [near, ng] = layer();
  const nearTop = ridge(ng, 184, [[6, 2, 1.7], [3, 4, 0.2], [1.6, 9, 2.4]], vgrad(ng, 170, VIEW_H, ['#e8be86', '#d6a46c', '#c08c5a']), '#fae2b8');
  ng.save(); ng.globalAlpha = 0.22; ng.strokeStyle = '#a06e44'; ng.lineWidth = 0.5;
  for (let y = 174; y < VIEW_H; y += 3.6) { ng.beginPath(); for (let x = 0; x <= BG_W; x += 2) ng.lineTo(x, Math.max(nearTop(x) + 2, y + Math.sin(x * 0.07 + y * 0.6) * 1.6)); ng.stroke(); }
  ng.restore();
  wrapDraw(ng, BG_W, off => {   // two vast stone legs, standing on nothing but sand
    const x = 120 + off, b = nearTop(120) + 4, S = '#dcbc92', D = 'rgba(140,90,60,0.35)';
    for (const dx of [0, 13]) {
      path(ng, [[x + dx - 3.6, b], [x + dx - 3, b - 30], [x + dx + 3.4, b - 30], [x + dx + 3.8, b]], S); fRect(ng, x + dx + 1.4, b - 30, 2.4, 30, D);
      path(ng, [[x + dx - 4, b], [x + dx - 4, b - 3], [x + dx + 8, b - 3], [x + dx + 9, b]], S);   // a foot
      path(ng, [[x + dx - 4, b - 32], [x + dx - 2, b - 30], [x + dx, b - 33.4], [x + dx + 2, b - 30.4], [x + dx + 4, b - 32]], S);   // snapped off at the knee
    }
    // his head, toppled over and half sunk in the sand, a pair of sunglasses left on his brow
    const hx = x + 52, hb = nearTop(x + 52 - off) + 5;
    path(ng, [[hx - 11, hb], [hx - 12, hb - 10], [hx - 8, hb - 17], [hx + 2, hb - 19], [hx + 10, hb - 14], [hx + 12, hb - 6], [hx + 12, hb]], S);
    path(ng, [[hx + 2, hb - 19], [hx + 10, hb - 14], [hx + 12, hb - 6], [hx + 12, hb], [hx + 5, hb]], D);
    for (let k = 0; k < 4; k++) fRect(ng, hx - 10.6 + k * 0.5, hb - 12 + k * 2.4, 5, 0.5, 'rgba(120,80,60,0.4)');   // the head-cloth's stripes
    fEll(ng, hx + 1, hb - 9.6, 1.6, 0.6, '#7a5040');                                    // a stony eye, gazing at nothing
    fRoundRect(ng, hx - 2.6, hb - 13.4, 3.6, 2, 0.8, '#2a2030'); fRoundRect(ng, hx + 1.8, hb - 13, 3.6, 2, 0.8, '#2a2030'); fRect(ng, hx + 0.8, hb - 12.6, 1.2, 0.4, '#2a2030');   // sunglasses
    fEll(ng, hx - 1.6, hb - 13, 0.8, 0.4, 'rgba(255,255,255,0.5)');
    fEll(ng, hx + 5, hb - 6.6, 1.4, 0.8, '#b8906a');                                    // a chipped nose (this one he kept)
  });
  wrapDraw(ng, BG_W, off => {   // a saguaro in a straw sun hat
    const x = 352 + off, b = nearTop(352) + 4, G = '#7a9a62';
    fRoundRect(ng, x - 2.6, b - 24, 5.2, 24, 2.6, G);
    for (const [s, ay, h] of [[-1, 12, 8], [1, 16, 6]]) { fRoundRect(ng, x + s * 2 + (s < 0 ? -5 : 0), b - ay, 5, 2.6, 1.3, G); fRoundRect(ng, x + s * 5.6 - 1.3, b - ay - h, 2.6, h + 2, 1.3, G); }
    ng.strokeStyle = 'rgba(70,100,60,0.5)'; ng.lineWidth = 0.35; for (const dx of [-1, 1]) { ng.beginPath(); ng.moveTo(x + dx, b - 22); ng.lineTo(x + dx, b - 1); ng.stroke(); }
    fEll(ng, x, b - 24.4, 5.6, 1.1, '#e8c060'); fEll(ng, x, b - 25.8, 2.8, 1.8, '#e8c060'); fRect(ng, x - 2.8, b - 25.4, 5.6, 0.6, '#c8503a');
  });
  wrapDraw(ng, BG_W, off => {   // footprints that wander off, then just... stop. A lost flip-flop.
    for (let k = 0; k < 9; k++) { const x = 400 + off + k * 6, y = nearTop(400 + k * 6) + 6 + (k % 2) * 2; fEll(ng, x, y, 1.1, 0.6, 'rgba(150,100,60,0.45)'); }
    const fx = 460 + off, fy = nearTop(460) + 7; fEll(ng, fx, fy, 2.2, 0.8, '#e8463a'); fRect(ng, fx - 0.4, fy - 1, 0.6, 1, '#ffffff');
    fEll(ng, 30 + off, nearTop(30) + 6, 3, 1.2, '#f0e6d0'); fEll(ng, 33.4 + off, nearTop(30) + 5.2, 1.6, 1.2, '#f0e6d0'); fEll(ng, 32.6 + off, nearTop(30) + 5.2, 0.4, 0.4, '#5a4030');   // a bleached old skull
  });

  ng.fillStyle = 'rgba(246,224,184,0.22)'; ng.fillRect(0, 0, BG_W, VIEW_H);   // (a touch of haze: it's still scenery)
  return { sky, layers: [{ c: sun, f: 0.02 }, { c: far, f: 0.06 }, { c: pyr, f: 0.12 }, { c: mid, f: 0.22 }, { c: near, f: 0.38 }], live: drawDesertSky };
}
