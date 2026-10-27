'use strict';
// Part of class Game (see game.js): GameGoals
class GameGoals {
  drawGoal() {}
  drawMothLantern(ctx, x, y, t) {
    fGlow(ctx, x, y + 3, 15, '#d9efb6', 0.18 + Math.sin(t * 0.08) * 0.025);
    ctx.drawImage(caveLanternArt(), fSnap(x - 14), fSnap(y - 20));
    const my = y + 2.8 + Math.sin(t * 0.09) * 0.6, flap = 1.8 + (Math.sin(t * 0.32) + 1) * 0.7;
    fGlow(ctx, x, my, 6.5, '#fff3b8', 0.65);
    for (const side of [-1, 1]) {
      fEll(ctx, x + side * 1.8, my - 0.8, flap, 1.65, '#d6e6b8');
      fEll(ctx, x + side * 1.6, my - 1.1, flap * 0.78, 1.1, '#fff3cb');
      fEll(ctx, x + side * 1.3, my + 1, flap * 0.66, 1, '#b8cfa4');
      fLine(ctx, x, my - 0.8, x + side * 1.3, my - 2.5, '#fff5d5', 1);
    }
    fEll(ctx, x, my, 0.55, 1.65, '#f7dfa3');
    fBlob(ctx, x, my - 1.2, 0.55, '#fff9dc');
  }
  drawGoldNote(ctx, x, y, t) {
    const ox = Math.round(x), oy = Math.round(y);
    ctx.save(); ctx.translate(ox, oy); ctx.rotate(Math.sin(t * 0.08) * 0.12);
    const shape = () => {
      ctx.beginPath(); ctx.ellipse(-4, 9, 7, 5, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(1, -15, 3, 25);
      ctx.beginPath(); ctx.moveTo(1, -16); ctx.bezierCurveTo(10, -12, 14, -6, 10, 3); ctx.bezierCurveTo(10, -4, 7, -8, 1, -9); ctx.closePath(); ctx.fill();
    };
    ctx.fillStyle = INK; ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(-4, 9, 7, 5, -0.4, 0, Math.PI * 2); ctx.stroke(); ctx.strokeRect(1, -15, 3, 25);
    ctx.beginPath(); ctx.moveTo(1, -16); ctx.bezierCurveTo(10, -12, 14, -6, 10, 3); ctx.bezierCurveTo(10, -4, 7, -8, 1, -9); ctx.closePath(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#e8a72a'; shape();
    ctx.save(); ctx.translate(-0.7, -0.7); ctx.fillStyle = '#ffc23d'; shape(); ctx.restore();
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(2, -13, 1, 18);
    ctx.beginPath(); ctx.ellipse(-6, 7, 3, 1.5, -0.4, 0, Math.PI * 2); ctx.fill();
    // the glint sweeping up it now and then
    const k = (t % 120) / 120;
    if (k < 0.4) { ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffffff'; const gy = 14 - k / 0.4 * 32; ctx.fillRect(-10, Math.round(gy), 22, 2); ctx.globalAlpha = 1; }
    ctx.restore();
    const spark = (dx, dy, ph) => {
      const q = (t + ph) % 60;
      if (q > 24) return;
      const r = q < 12 ? 1 + (q >> 2) : 4 - ((q - 12) >> 2);
      fSparkle(ctx, ox + dx + 0.5, oy + dy + 0.5, r + 0.5);
    };
    spark(14, -12, 0); spark(-13, -4, 22); spark(12, 12, 40);
  }
  // The golden banana of the monsoon jungle: one big, glossy banana standing upright, its stem straight
  // up top, with a glint sweeping down it and sparkles popping around it.
  drawBanana(ctx,x,y,t){
    ctx.drawImage(jungleBananaArt(),Math.round(x)-16,Math.round(y)-21);
    if(t%90<14)umbraSpark(ctx,x+8,y-13,1.3,'#fff4c4');
  }
  // The golden scarab of the dunes: a jewelled beetle with a turquoise inlay, polished wings closed.
  drawScarab(ctx, x, y, t) {
    ctx.drawImage(duneScarabArt(0),x-20,y-20);
    if(t%40<20)umbraSpark(ctx,x+11,y-12,1.6,'#fff8da');
  }
  // A carved stone plinth in the world's own stone, with gold trim: it makes the stage
  // treasure read as a prize on display. Occupies the 3 pedestal tiles on row 11.
  drawPedestal(ctx, lv, x) {
    ctx.drawImage(finePedestal(lv.theme), x - 25, 11 * TILE - 2);   // (painted fine: meadow-fine.js)
    if ((this.t >> 4) % 4 === 0) fRect(ctx, x + 20, 11 * TILE - 3, 1 / 3, 3, '#ffffff');
  }
  // The sun temple's inner wall: big sandstone courses, carved picture panels and shafts of dusty
  // light slanting in through cracks in the roof. Drawn behind everything in a 'temple' zone.
  // Its ends aren't straight cuts: each course steps a little further out than the one above, so
  // the facade slopes out from under the roof to the sand like the side of a pyramid.
  drawTempleWall(ctx, x0, x1, cam) {
    const top = 16, bot = 12 * TILE, eTop = 48, step = 3, flare = ((bot - eTop) >> 3) * step;
    const lx = y => x0 + TILE - Math.max(0, (y - eTop) >> 3) * step, rx = y => x1 + Math.max(0, (y - eTop) >> 3) * step;
    const a = Math.max(x0 + TILE - flare, cam - 16), b = Math.min(x1 + flare, cam + VIEW_W + 16);
    if (a >= b) return;
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    ctx.save();
    ctx.beginPath();
    for (let y = top; y < bot; y += 8) ctx.rect(lx(y), y, rx(y) - lx(y), 8);
    ctx.clip();
    this.drawTempleWallFace(ctx, x0, x1, a, b, top, bot, R);
    ctx.restore();
    // sunlit stone lip along the stepped ends
    for (let y = eTop; y < bot; y += 8) {
      const l = lx(y), r = rx(y);
      fRoundRect(ctx, l, y, step, 8, 0.8, '#a8703e'); fRect(ctx, l, y, step, 0.67, '#c08a52'); fRect(ctx, l + 2, y + 1, 0.67, 7, '#5e3618');   // (fine: hires.js)
      fRoundRect(ctx, r - step, y, step, 8, 0.8, '#8e5a32'); fRect(ctx, r - step, y, step, 0.67, '#c08a52'); fRect(ctx, r - 2.67, y + 1, 0.67, 7, '#5e3618');
    }
  }
  drawTempleWallFace(ctx, x0, x1, a, b, top, bot, R) {
    for(let x=x0-64,k=0;x<b;x+=120,k++)if(x+120>a)ctx.drawImage(duneTempleSectionArt(k%5),x,top);
    for(let bx=x0+96;bx<x1-32;bx+=176){
      if(bx+80<a||bx-20>b)continue;
      const beam=ctx.createLinearGradient(0,40,0,bot);beam.addColorStop(0,'rgba(255,229,176,0.16)');beam.addColorStop(1,'rgba(255,229,176,0.015)');
      ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(bx,40);ctx.lineTo(bx+8,40);ctx.lineTo(bx+65,bot);ctx.lineTo(bx+38,bot);ctx.closePath();ctx.fill();
      for(let i=0;i<6;i++){const u=((this.t*0.3+i*37)%(bot-60));ctx.save();ctx.globalAlpha=0.35;fEll(ctx,bx+5+u*0.35+Math.sin(u*0.1+i)*3,52+u,0.35,0.4,'#ffe9bc');ctx.restore();}
    }
  }

  // Jungle ruins (zone 'ruins'): an overgrown stone wall behind the level, its top broken off in
  // ragged steps (highest in the middle), moss creeping down it, and a great carved idol face
  // watching over the middle. Kept dim and green so it stays behind the action.
  drawRuinsWall(ctx, x0, x1, cam) {
    const a = Math.max(x0, cam - 16), b = Math.min(x1, cam + VIEW_W + 16);
    if (a >= b) return;
    const bot = 12 * TILE, hash = n => (((n * 2654435761) >>> 0) % 1000) / 1000;
    const topAt = x => { const k = (x - x0) / (x1 - x0); return Math.min(bot, Math.round((44 + (1 - Math.sin(k * Math.PI)) * 160 + hash(x >> 3) * 22) / 8) * 8); };
    const cx = Math.round((x0 + x1) / 2 / 8) * 8 - 72, fy = 44;
    ctx.drawImage(ruinsArt(x0, x1, bot, topAt, cx - x0, fy), x0, 0);   // (painted fine once: jungle-fine.js)
    for (const sd of [-1, 1]) if ((this.t + (sd > 0 ? 40 : 0)) % 300 < 6) fEll(ctx, cx + sd * 13 + 0.5, fy + 23, 1.6, 1, '#ffe9a0');   // stone pupils, catching the light now and then
  }
  drawHourglass(ctx, x, y, t) {   // (in fine pixels: hires.js)
    x = Math.round(x) + 0.5; y = Math.round(y);
    const k = (t % 300) / 300, bulb = sd => [[x - 7.2, y + sd * 9], [x + 7.2, y + sd * 9], [x + 6, y + sd * 5], [x + 1.2, y + sd * 0.6], [x - 1.2, y + sd * 0.6], [x - 6, y + sd * 5]];
    for (const sd of [-1, 1]) fPoly(ctx, bulb(sd).map(([px, py]) => [x + (px - x) * 1.16, y + (py - y) * 1.05]), INK);
    for (const sd of [-1, 1]) fPoly(ctx, bulb(sd), '#3a3478');
    const sand = (y0, y1, col) => { ctx.save(); ctx.beginPath(); for (const sd of [-1, 1]) bulb(sd).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.clip(); fRect(ctx, x - 8, y0, 16, y1 - y0, col); ctx.restore(); };
    sand(y - 7 * (1 - k) - 0.6, y, '#ffd166');                     // the top bulb emptying...
    sand(y + 9 - 7 * k, y + 9, '#ffb347');                         // ...and the bottom one filling
    if (k < 0.97) fRect(ctx, x - 0.33, y, 0.67, 9 - 7 * k, '#ffe08a');
    for (const sd of [-1, 1]) { ctx.strokeStyle = '#bff0ff'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x - 5.4, y + sd * 7.6); ctx.lineTo(x - 4.4, y + sd * 4.6); ctx.stroke(); }   // glass catching the light
    for (const sd of [-1, 1]) { fRoundRect(ctx, x - 9.5, y + sd * 10.5 - 1.5, 19, 3, 1.2, INK); fRoundRect(ctx, x - 8.6, y + sd * 10.5 - 0.6, 17.2, 1.2, 0.6, '#ffd166'); }
    for (const sd of [-1, 1]) { fRoundRect(ctx, x + sd * 7.4 - 1.2, y - 9, 2.4, 18, 0.8, INK); fRect(ctx, x + sd * 7.4 - 0.4, y - 9, 0.8, 18, '#c8891e'); }
    if ((t >> 4) % 4 === 0) fSparkle(ctx, x - 2.5, y - 5.5, 1.6);
  }
  drawSnowflake(ctx, x, y, t) {   // (painted fine: snowflakeArt), turning slowly, a sparkle winking at its tip
    const k = Math.floor((t * 0.01 / (Math.PI / 3)) % 1 * FLAKE_TURNS);
    ctx.drawImage(snowflakeArt(k), Math.round(x) - 15, Math.round(y) - 15);
    if (t % 40 < 20) { fRect(ctx, x + 10.3, y - 12.3, 1 / 3, 3.6, '#ffffff'); fRect(ctx, x + 8.7, y - 10.7, 3.6, 1 / 3, '#ffffff'); fBlob(ctx, x + 10.5, y - 10.5, 0.6, '#ffffff'); }
  }
  drawHoneyJar(ctx, x, y, t) {
    x = Math.round(x); y = Math.round(y);
    const art = honeyJarArt();
    ctx.drawImage(art, x - HONEY_OX, y - HONEY_OY);
    // a glint sliding slowly down the glass now and then, and a little sparkle: it's a treasure
    const g = t % 220;
    if (g < 40) { ctx.globalAlpha = Math.sin(g / 40 * Math.PI) * 0.8; fRect(ctx, x - 7.7, y - 4 + g / 5, 2 / 3, 2, '#fffbe8'); ctx.globalAlpha = 1; }
    if (t % 48 < 24) { fRect(ctx, x + 13.3, y - 11, 1 / 3, 5, '#ffffff'); fRect(ctx, x + 11.3, y - 8.7, 4.4, 1 / 3, '#ffffff'); fBlob(ctx, x + 13.5, y - 8.5, 0.7, '#ffffff'); }
  }
  // 1-1's honey jar has company: butterflies fluttering all about it (drawn round wherever the jar is, even held high)
  drawButterflies(ctx, x, y, t) {
    for (let i = 0; i < BUTTERFLIES.length; i++) {
      const [c1, c2, sp, ph, rx, ry] = BUTTERFLIES[i], k = t * sp + ph;
      const bx = Math.round(x + Math.sin(k) * rx + Math.sin(k * 2.3) * 4), by = Math.round(y - 10 + Math.sin(k * 1.7 + 1) * ry + Math.sin(t * 0.09 + i) * 2);
      const dir = Math.cos(k) >= 0 ? 1 : -1, open = ((t + i * 5) >> 3) % 3;   // (wings: open, half, closed up)
      const w = [3, 2, 1][open];   // (in fine pixels: hires.js)
      for (const sd of [-1, 1]) {
        const fx = bx + 0.5 + sd * (w * 0.55 + 0.4), hx = bx + 0.5 + sd * (w * 0.4 + 0.3);
        fEll(ctx, fx, by - 0.8, w * 0.6 + 0.9, 2, INK); fEll(ctx, hx, by + 1.6, w * 0.45 + 0.7, 1.4, INK);
        fEll(ctx, fx, by - 0.8, w * 0.6 + 0.3, 1.5, c1); fEll(ctx, hx, by + 1.6, w * 0.45 + 0.2, 0.95, c2);
        if (w > 1) fBlob(ctx, fx + sd * w * 0.35, by - 1.4, 0.55, '#ffffff');   // a pale wingtip spot
      }
      fRect(ctx, bx + 0.17, by - 3, 2 / 3, 5, INK); fLine(ctx, bx + 0.5, by - 3, bx + 0.5 + dir * 1.3, by - 4.6, INK);   // body and a feeler
    }
  }
  drawSunflower(ctx, x, y, t) {
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * 0.01;
      fEll(ctx, x + Math.cos(a) * 8.4, y + Math.sin(a) * 8.4, 4.4, 4.4, INK);   // (fine: hires.js)
    }
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * 0.01;
      fEll(ctx, x + Math.cos(a) * 8.4, y + Math.sin(a) * 8.4, 3.4, 3.4, i % 2 ? '#ffd166' : '#ffc23d');
      fEll(ctx, x + Math.cos(a) * 9.2 - 0.6, y + Math.sin(a) * 9.2 - 0.6, 1.2, 1, '#fff0b0');
    }
    fBlob(ctx, x, y, 6.4, INK); fBlob(ctx, x, y, 5.5, '#8a4a1e'); fBlob(ctx, x - 1, y - 1, 3.4, '#a8622a');
    for (const [dx, dy] of [[-2, 1], [1, -2], [2, 2], [-1, -1], [0, 3]]) fBlob(ctx, x + dx + 0.5, y + dy + 0.5, 0.55, '#5a2e10');
    if (t % 40 < 20) fSparkle(ctx, x + 9.5, y - 10.5, 2.4);
  }
  // A natural amethyst rosette: broad bevelled blades growing out of a mineral matrix.
  // Rasterise the facets on the pixel grid, like the rest of the cave's sprites.
  drawCrystalCluster(ctx, x, y, t) {   // (in fine pixels: hires.js)
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    const poly = (points, color) => fPoly(ctx, points, color);
    const blade = (bx, by, tx, ty, w, rose = false) => {
      const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      const pt = (u, v) => [bx + dx * u + nx * v, by + dy * u + ny * v];
      const A = pt(0, -w * 0.36), B = pt(0.77, -w * 0.5), C = pt(1, -w * 0.13), D = pt(0.96, w * 0.28), E = pt(0.73, w * 0.5), F = pt(0, w * 0.36), R = pt(0.76, 0), Q = pt(0, 0);
      poly([A, B, C, D, E, F], INK);
      // Dark perimeter, a bright termination, and three distinct lengthwise faces.
      const inset = points => points.map(([px, py]) => [px * 0.87 + bx * 0.13, py * 0.94 + by * 0.06]);
      poly(inset([A, B, C, R, Q]), rose ? '#f4aed5' : '#c7b6ff');
      poly(inset([Q, R, D, E, F]), rose ? '#b95a9f' : '#7860c4');
      poly(inset([B, C, D, R]), rose ? '#ffe0ef' : '#f0e4ff');
      poly([pt(0.12, -1), pt(0.73, -1), pt(0.87, 0), pt(0.12, 1)], rose ? '#e687c8' : '#a58aeb');
      poly([pt(0.31, -w * 0.26), pt(0.6, -w * 0.26), pt(0.66, -w * 0.12), pt(0.37, -w * 0.12)], '#fff0ff');
    };
    // Unequal, splayed blades rather than the puzzle chimes' three upright spikes.
    blade(-3, 7, -16, -7, 8);
    blade(2, 7, 11, -16, 9, true);
    blade(-2, 8, -6, -20, 11);
    blade(3, 8, 19, -2, 8);
    blade(-4, 9, -16, 1, 7, true);
    blade(0, 10, 3, -10, 10, true);
    poly([[-14, 7], [-9, 5], [-4, 8], [3, 7], [9, 6], [15, 9], [12, 13], [4, 15], [-8, 14], [-15, 11]], INK);
    poly([[-13, 8], [-8, 7], [-3, 10], [4, 8], [11, 8], [13, 10], [7, 13], [-7, 12], [-13, 10]], '#68516f');
    poly([[-12, 8], [-8, 7], [-3, 10], [-8, 10]], '#b49aaa');
    poly([[1, 10], [7, 8], [11, 9], [6, 11]], '#94728f');
    for (const [px, py, col] of [[-10, 10, '#deafd3'], [-6, 12, '#a18aae'], [-2, 11, '#392a4c'], [3, 12, '#d3bad8'], [9, 10, '#ead3e8'], [0, 13, '#453153']]) fEll(ctx, px + 1, py + 0.5, 1.1, 0.6, col);
    blade(-5, 11, -8, 3, 5);
    blade(5, 12, 10, 5, 5, true);
    // A few restrained, staggered glints pick out the polished crystal faces.
    for (const [sx, sy, phase] of [[-8, -17, 0], [13, -11, 29], [-16, 0, 57]]) {
      const k = (t + phase) % 100;
      if (k >= 18) continue;
      const r = k < 9 ? 1 + (k / 4 | 0) : 1 + ((17 - k) / 4 | 0);
      fRect(ctx, sx - r + 1 / 3, sy + 1 / 3, r * 2 + 1 / 3, 1 / 3, '#fff5ff'); fRect(ctx, sx + 1 / 3, sy - r + 1 / 3, 1 / 3, r * 2 + 1 / 3, '#fff5ff'); fRect(ctx, sx, sy, 2 / 3, 2 / 3, '#fff5ff');
    }
    ctx.restore();
  }
  drawPearlOrb(ctx, x, y, t) {
    const orb = ctx.createRadialGradient(x - 2, y - 2, 0.5, x, y, 6); orb.addColorStop(0, '#ffffff'); orb.addColorStop(0.45, '#f7f2ff'); orb.addColorStop(0.85, '#e0d4f0'); orb.addColorStop(1, '#c8b8dc');   // (fine)
    fBlob(ctx, x + 0.5, y + 0.5, 6.2, '#b8a8cc'); fBlob(ctx, x + 0.5, y + 0.5, 5.6, orb); fEll(ctx, x + 2.4, y + 3, 1.6, 0.8, '#ffd8f0');
    if (t % 40 < 20) fSparkle(ctx, x + 4.5, y - 5.5, 2.2);
  }
  drawClam(ctx, x, withPearl) {
    const t = this.t, base = 11 * TILE, lip = base - 7;
    const half = (cx, cy, rx, ry, top, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, top ? Math.PI : 0, top ? Math.PI * 2 : Math.PI); ctx.closePath(); ctx.fill(); };
    // mirrored so the hinge sits on the right and the clam opens toward Chickaroo
    ctx.save(); ctx.translate(x * 2, 0); ctx.scale(-1, 1);
    // upper shell: hinged at the back of the lower one and propped open, fan ridges radiating from the hinge
    ctx.save();
    ctx.translate(x - 14, lip);
    ctx.rotate(-0.8 + Math.sin(t * 0.04) * 0.04);
    half(14, 0, 16, 13, true, INK);
    half(14, -0.5, 15, 12, true, '#d48cc4');
    half(14, -0.5, 13, 3, false, '#7a3a6e');   // dark inside of the lid
    for (let i = 1; i < 8; i++) {
      const a = Math.PI + i * Math.PI / 8;
      ctx.strokeStyle = i % 2 ? '#e6a3d9' : '#b86aa8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(14, -1); ctx.lineTo(14 + Math.cos(a) * 13, Math.sin(a) * 10.5); ctx.stroke();
    }
    ctx.fillStyle = INK; ctx.fillRect(-1, -2, 4, 4); ctx.fillStyle = '#b86aa8'; ctx.fillRect(0, -1, 2, 2);   // hinge
    ctx.restore();
    // lower shell: a ridged bowl with a dark pink lining where the pearl rests
    half(x, lip, 16, 8, false, INK);
    half(x, lip, 15, 7, false, '#d48cc4');
    for (let i = -12; i <= 12; i += 4) { ctx.fillStyle = '#b86aa8'; ctx.fillRect(x + i, lip + 1, 2, Math.round(Math.sqrt(1 - (i / 15) ** 2) * 6)); }
    ctx.fillStyle = INK; ctx.fillRect(x - 16, lip - 1, 32, 2);
    ctx.fillStyle = '#7a3a6e'; ctx.beginPath(); ctx.ellipse(x, lip, 13, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c2e8'; ctx.fillRect(x - 14, lip + 1, 28, 1);
    ctx.restore();
    if (withPearl) this.drawPearlOrb(ctx, x, lip - 5 + Math.round(Math.sin(t * 0.05) * 1), t);
  }
  // The final treasure: a big brilliant-cut diamond. Slow god-rays wheel behind it, its facets
  // (a flat table, a crown of bevels, a pavilion fanning down to the point) catch a band of light
  // that sweeps back and forth across them, and four-point sparkles pop around it.
  drawCrystal(ctx,x,y,s=1) {
    void ctx; void x; void y; void s;

  }

}
// The honey jar (1-1's treasure), baked once, pixel by pixel: amber honey glowing through rounded glass (brightest in
// the middle, deep at the edges and the bottom), a gingham cloth over the lid tied with twine,
// a few bubbles caught in the honey, and the gleam of the glass.
const HONEY_OX = 12, HONEY_OY = 18;
// 2-2's treasure: a six-armed ice crystal, each arm a faceted blade with two pairs of side branches and a little plate at
// its tip, glassy (white along each ridge, ice-blue to its edges), a glowing hexagonal heart. 30 x 30, centred; k: its
// turn, 0..FLAKE_TURNS-1 over a sixth of a circle (it looks the same every 60 degrees)
const FLAKE_TURNS = 20, FLAKE_ART = [];
function snowflakeArt(k) {
  if (FLAKE_ART[k]) return FLAKE_ART[k];
  const A = mArt(30, 30), c = 15, rot = k / FLAKE_TURNS * Math.PI / 3;
  const ICE = ['#3a7ab8', '#6aaee8', '#9fd6ff', '#cdeeff', '#ffffff'];
  const blade = (x0, y0, a, len, w, tone) => {   // a tapered blade from (x0, y0) along a: lit along its ridge
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
    A.fill(x0 - len - 2, y0 - len - 2, x0 + len + 2, y0 + len + 2, (x, y) => {
      const along = (x - x0) * ca + (y - y0) * sa, across = (x - x0) * px + (y - y0) * py;
      if (along < -0.2 || along > len) return null;
      const half = w * (1 - along / len * 0.75) * (along > len - w ? (len - along) / w : 1);
      if (Math.abs(across) > half) return null;
      return softTone(ICE, tone + 0.9 - Math.abs(across) / Math.max(0.3, half) * 1.4 - (across > 0 ? 0.35 : 0));
    });
  };
  for (let i = 0; i < 6; i++) {
    const a = rot + i * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
    blade(c, c, a, 12.2, 1.25, 0.2);
    for (const [kk, len] of [[5.6, 3.8], [8.8, 2.6]]) for (const sd of [-1, 1]) blade(c + ca * kk, c + sa * kk, a + sd * 0.95, len, 0.7, 0);
    A.fill(c + ca * 11 - 2, c + sa * 11 - 2, c + ca * 11 + 2, c + sa * 11 + 2, (x, y) => Math.abs((x - c - ca * 11) * ca + (y - c - sa * 11) * sa) + Math.abs((x - c - ca * 11) * -sa + (y - c - sa * 11) * ca) < 1.5 ? ICE[3] : null);   // the plate at its tip
  }
  A.fill(c - 4, c - 4, c + 4, c + 4, (x, y) => {   // the hexagonal heart
    const dx = x - c, dy = y - c; let inside = true;
    for (let i = 0; i < 6; i++) { const a = rot + Math.PI / 6 + i * Math.PI / 3; if (dx * Math.cos(a) + dy * Math.sin(a) > 3.1) inside = false; }
    return inside ? softTone(ICE, 1.2 - Math.hypot(dx, dy) / 3 - (dx + dy) * 0.08) : null;
  });
  A.outline();
  A.ell(c - 0.8, c - 0.9, 0.9, 0.6, '#ffffff');
  return (FLAKE_ART[k] = A.canvas());
}
const BUTTERFLIES = [   // wing colours, speed, phase, how far it roams (x, y)
  ['#ff9ac8', '#ff6aa8', 0.021, 0, 26, 12], ['#c9a8ff', '#9a78f0', 0.017, 2.1, 30, 15],
  ['#9ad8ff', '#5ab0f0', 0.025, 4.2, 22, 10], ['#fff07a', '#ffc83a', 0.019, 5.3, 32, 14],
];
let HONEY_ART = null;
function honeyJarArt() {
  if (HONEY_ART) return HONEY_ART;
  if (THEMES.meadow.fine) return (HONEY_ART = fineHoneyJar());   // (painted fine: meadow-fine.js)
  const W = 25, H = 32, buf = new Array(W * H).fill(null);
  const set = (dx, dy, c) => { const px = dx + HONEY_OX, py = dy + HONEY_OY; if (px >= 0 && py >= 0 && px < W && py < H) buf[py * W + px] = c; };
  const body = (dx, dy) => (Math.abs(dx + 0.5) / 10) ** 4 + (Math.abs(dy - 3) / 10.5) ** 4 <= 1 && dy >= -7;
  const HONEY = ['#7a3608', '#9a4a0c', '#bc6210', '#d87e16', '#ee9a20', '#f8b630', '#ffd04c', '#ffe27e'];
  for (let dy = -16; dy <= 14; dy++) for (let dx = -12; dx <= 12; dx++) {
    if (body(dx, dy)) {
      const inner = body(dx - 1, dy) && body(dx + 1, dy) && body(dx, dy + 1);
      if (!inner) { set(dx, dy, dy < -5 ? '#d8cfb8' : '#8a4a10'); continue; }   // the glass wall (clear above the honey)
      if (dy < -5) { set(dx, dy, '#efe6cf'); continue; }                        // the air gap under the lid
      if (dy === -5) { set(dx, dy, Math.abs(dx) < 7 ? '#ffe9a0' : '#f8c040'); continue; }   // the honey's surface
      // glows brightest a little up and left of centre, deepening to the sides and the bottom
      const glow = 7.2 - Math.hypot((dx + 1.5) * 0.55, (dy - 2) * 0.42) - Math.max(0, dy - 8) * 0.35;
      set(dx, dy, HONEY[clamp(Math.round(glow), 0, 7)]);
    } else if (dy >= -10 && dy <= -8 && Math.abs(dx + 0.5) <= 7.5) set(dx, dy, dy === -8 ? '#d8cfb8' : '#c9a46a');   // the neck and lid rim
  }
  // the cloth over the lid: red gingham, gathered into a dome and hanging in little scallops
  for (let dy = -16; dy <= -7; dy++) for (let dx = -10; dx <= 10; dx++) {
    const half = dy === -16 ? 4 : dy === -15 ? 6.5 : dy <= -11 ? 8 : 9.5;
    if (Math.abs(dx + 0.5) > half) continue;
    if (dy >= -8 && ((dx + 12) % 4 === 3 || (dy === -7 && (dx + 12) % 4 !== 1))) continue;   // the scalloped hem
    const a = ((dx + 12) >> 1) % 2, b = ((dy + 16) >> 1) % 2;
    let c = a && b ? '#d8404a' : a || b ? '#f28a90' : '#fff6f0';
    if (dx > 4 && c !== '#d8404a') c = a || b ? '#e07078' : '#f2dcd8';   // in shade on the right
    set(dx, dy, c);
  }
  for (let dx = -8; dx <= 8; dx++) set(dx, -11, dx % 3 === 0 ? '#a07c44' : '#d8b878');   // the twine...
  set(6, -10, '#d8b878'); set(7, -9, '#d8b878'); set(5, -9, '#a07c44'); set(7, -8, '#a07c44');   // ...and its knot
  // bubbles caught in the honey, and the glass catching the light
  for (const [dx, dy] of [[6, -2], [5, 10], [-5, 11], [7, 6]]) set(dx, dy, '#ffe9a0');
  for (let dy = -4; dy <= 7; dy++) set(-8, dy, dy < 5 ? '#fff4d6' : '#ffe2a0');
  set(-7, -4, '#fff4d6'); set(-7, -3, '#fff4d6'); set(8, 2, '#ffe9a8'); set(8, 3, '#ffe9a8'); set(-4, 12, '#ffd04c'); set(-3, 12, '#ffd04c');
  // ink outline round it all
  const out = makeCanvas(W, H), og = out.getContext('2d');
  const on = (px, py) => px >= 0 && py >= 0 && px < W && py < H && buf[py * W + px];
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const c = buf[py * W + px] || ((on(px - 1, py) || on(px + 1, py) || on(px, py - 1) || on(px, py + 1)) ? INK : null);
    if (c) { og.fillStyle = c; og.fillRect(px, py, 1, 1); }
  }
  return (HONEY_ART = out);
}

mixin(Game, GameGoals);


