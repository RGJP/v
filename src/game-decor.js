'use strict';
// Part of class Game (see game.js): GameDecor
class GameDecor {
  drawDecor(ctx, cam) {
    const lv = this.level, th = lv.theme, t = this.t;
    if (lv.def.ceiling) drawFineCeiling(ctx, cam);   // (painted fine: cave-fine.js)
    if (lv.def.canopy) this.drawCanopy(ctx, cam);
    for (const z of lv.def.zones || []) {
      if (z[2] === 'temple') this.drawTempleWall(ctx, z[0] * TILE, (z[1] + 1) * TILE, cam);
      else if (z[2] === 'ruins') this.drawRuinsWall(ctx, z[0] * TILE, (z[1] + 1) * TILE, cam);
      else if (z[2] === 'lanterngrotto') drawLanternGrotto(ctx,z[0],z[1],cam,t);
    }
    for (const d of lv.decor) {
      if (d.x < cam - 48 || d.x > cam + VIEW_W + 16 || lv.painted[Math.floor(d.x / TILE)]) continue;
      const x = d.x, y = d.y;
      if (th.fine && drawFineDecor(ctx, d)) continue;   // (painted fine: meadow-fine.js)
      if (drawFineCaveDecor(ctx, d, t)) continue;   // (crystals, roof, mushrooms: cave-fine.js)
      if(lv.themeName==='desert'&&drawFineDesertDecor(ctx,d,t))continue;
      if (STATIC_DECOR.has(d.k)) {   // still scenery: drawn once at 1x, smoothed up to the fine screen and kept (hires.js)
        const q = Object.assign({}, d, { x: DECOR_BOX[0], y: DECOR_BOX[1] });
        for (const k of ['s', 'p']) if (typeof q[k] === 'number') q[k] = Math.round(q[k] * 4) / 4;
        const key = 'decor|' + lv.themeName + '|' + JSON.stringify(q);
        ctx.drawImage(capturedArt(key, DECOR_BOX[2], DECOR_BOX[3], c => this.drawDecorItem(c, q, q.x, q.y, th, 0)), x - DECOR_BOX[0], y - DECOR_BOX[1]);
        continue;
      }
      this.drawDecorItem(ctx, d, x, y, th, t);
    }
    // Checkpoint banner
    checkpoints(lv.def).forEach((cp, i) => {
      const x = cp * TILE + 6, y = cpRow(lv, i) * TILE;
      drawFineBanner(ctx, x, y, this.checkpointReached > i, t);   // (painted fine: meadow-fine.js)
    });

  }
  // one piece of decor at (x, y)
  drawDecorItem(ctx, d, x, y, th, t) {
    const lv = this.level;
    switch (d.k) {
      case 'bush': {   // (all of these in fine pixels: hires.js)
        const s = 0.8 + d.s * 0.4;
        for (const [bx, by, r] of [[10, -2, 9], [22, -6, 11], [34, -2, 9]]) fBlob(ctx, x + bx, y + by, r * s, '#2f8a46');
        for (const [bx, by, r] of [[10, -3, 8], [22, -7, 10], [34, -3, 8]]) fBlob(ctx, x + bx - 0.4, y + by - 0.4, r * s - 0.4, '#47b35c');
        for (const [bx, by, r] of [[8, -6, 3.4], [19, -12, 4.4], [31, -6, 3.2]]) fEll(ctx, x + bx, y + by * s, r * s, r * s * 0.6, '#6ccc7a');
        for (const [bx, by] of [[18.6, -14], [8.4, -8], [31.4, -8]]) fEll(ctx, x + bx, y + by * s, 1.2, 0.7, '#9ae8a4');
        fRect(ctx, x, y - 1, 46, 1, th.top[0]);
        break;
      }
      case 'flower': {
        ctx.strokeStyle = '#2f9a49'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 2.5, y); ctx.quadraticCurveTo(x + 2, y - 3, x + 2.5, y - 6); ctx.stroke();
        fEll(ctx, x + 1.4, y - 2.6, 1, 0.5, '#2f9a49');
        for (let k = 0; k < 5; k++) { const a2 = k / 5 * Math.PI * 2 - 1.57; fEll(ctx, x + 2.5 + Math.cos(a2) * 1.3, y - 7 + Math.sin(a2) * 1.3, 1, 1, d.c); }
        fBlob(ctx, x + 2.5, y - 7, 0.8, '#ffd166');
        break;
      }
      case 'tuft':
        ctx.strokeStyle = '#2f9a49'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath();
        for (const [bx, h, bend] of [[0.5, 2.4, -0.8], [2.5, 4.4, 0.3], [4.5, 3.2, 1]]) { ctx.moveTo(x + bx, y); ctx.quadraticCurveTo(x + bx, y - h * 0.6, x + bx + bend, y - h); }
        ctx.stroke();
        break;
      case 'torch': {
        fRoundRect(ctx, x - 0.2, y - 14, 3.4, 14, 1, '#2a1d33'); fRect(ctx, x + 0.4, y - 13, 0.6, 12, '#4a3a58');
        fRoundRect(ctx, x - 2.2, y - 15.4, 7.4, 2.6, 1, '#8b7193'); fRect(ctx, x - 1.8, y - 15.2, 6.6, 0.6, '#b8a0c0');
        const fl = Math.sin(t * 0.3 + d.p * 3) * 0.6 + Math.sin(t * 0.17 + d.p) * 0.5;
        fGlow(ctx, x + 1.5, y - 20, 12, '#ff8a2a', 0.22);
        fPoly(ctx, [[x - 1, y - 15], [x + 4, y - 15], [x + 4.4, y - 18], [x + 1.5 + fl, y - 23.5 - Math.abs(fl)], [x - 1.4, y - 18]], '#ff6a1f');
        fPoly(ctx, [[x + 0.2, y - 15], [x + 2.8, y - 15], [x + 3, y - 17.4], [x + 1.5 + fl * 0.6, y - 20.6], [x - 0.1, y - 17.4]], '#ffd166');
        fEll(ctx, x + 1.5, y - 16.4, 0.8, 1.1, '#fff6d8');
        break;
      }
      case 'pine': {   // scenery, not a creature: tall, translucent and green-teal (enemies are small and opaque)
        ctx.globalAlpha = 0.6;
        fRoundRect(ctx, x - 1, y - 4, 3, 4, 0.8, '#6a4a3a');
        const tiers = Math.max(3, Math.round(d.h / 7));
        for (let k = 0; k < tiers; k++) {
          const u0 = k / tiers, u1 = (k + 1.5) / tiers, y0 = y - d.h - 3 + u0 * d.h, y1 = y - d.h - 3 + Math.min(1, u1) * d.h, hw = Math.min(1, u1) * 8.4;
          fPoly(ctx, [[x + 0.5, y0 - 1], [x + 0.5 + hw, y1], [x + 0.5 - hw, y1]], '#3f8a78');
          fPoly(ctx, [[x + 0.5 - hw, y1], [x + 0.5 + hw, y1], [x + 0.5 + hw * 0.7, y1 - 1.2], [x + 0.5 - hw * 0.7, y1 - 1.2]], '#cfe3ff');
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'snowtuft':
        fEll(ctx, x + 2.5, y - 1.2, 2.8, 1.6, '#bcd6f5'); fEll(ctx, x + 2.3, y - 1.8, 2.4, 1.4, '#ffffff'); fEll(ctx, x + 1.6, y - 2.4, 0.9, 0.4, '#ffffff');
        break;
      case 'weed': {   // a frond of weed waving in the current
        const pts = [];
        for (let i = 0; i <= d.h; i += 1) pts.push([x + 1 + Math.sin(t * 0.04 + d.p + i * 0.25) * (i / d.h) * 4, y - i]);
        ctx.lineCap = ctx.lineJoin = 'round';
        for (const [wd, col] of [[2, d.c], [0.6, '#9ae8b8']]) { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); }
        for (let i = 4; i < pts.length - 1; i += 4) { const [px, py] = pts[i]; fEll(ctx, px + (i % 8 ? 1.4 : -1.4), py, 1.4, 0.6, d.c); }
        break;
      }
      case 'coral':
      case 'hangcoral': {   // a branching tuft of coral (hanging off the grotto roof, upside down)
        const dn = d.k === 'hangcoral' ? 1 : -1, br = [[2.5, 0, 2.5, 10], [2.5, 6, -1.4, 8.6], [-1.4, 8.6, -1.2, 5], [3.4, 6.4, 7, 7.4], [7, 7.4, 7, 12.6], [2.5, 9.6, 1.6, 13.4]];
        ctx.lineCap = 'round';
        for (const [wd, col] of [[2.2, d.c], [0.6, '#ffffff']]) {
          ctx.strokeStyle = col; ctx.lineWidth = wd; if (wd < 1) ctx.globalAlpha = 0.35; ctx.beginPath();
          for (const [x0, y0, x1, y1] of br) { ctx.moveTo(x + x0 - (wd < 1 ? 0.5 : 0), y + dn * y0); ctx.lineTo(x + x1 - (wd < 1 ? 0.5 : 0), y + dn * y1); }
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        for (const [bx, by] of [[1.6, 13.4], [7, 12.6], [-1.2, 5]]) fBlob(ctx, x + bx, y + dn * by, 1.3, d.c);
        break;
      }
      case 'sandtite': {   // a sandstone drip hanging off the grotto roof, in the rock's own colours
        // rooted 5px up inside the rock (drawn behind the tiles), so it meets the roof's chewed edge
        const L = d.len;
        fPoly(ctx, [[x - 3.6, y - 5], [x + 3.6, y - 5], [x + 3.4, y], [x + 0.6, y + L], [x - 0.2, y + L], [x - 3.4, y]], th.ground[1]);
        fPoly(ctx, [[x - 2.6, y - 5], [x + 2.4, y - 5], [x + 2.2, y], [x + 0.2, y + L - 1.4], [x - 2.4, y]], th.ground[0]);
        fPoly(ctx, [[x - 2.6, y - 5], [x - 1.6, y - 5], [x - 1.4, y], [x - 0.2, y + L * 0.6], [x - 2.4, y]], th.ground[2]);
        break;
      }
      case 'shell': {   // a little scallop half-buried in the sand
        fEll(ctx, x + 2.5, y - 0.4, 3, 2.8, '#c98a7a'); fEll(ctx, x + 2.5, y - 0.6, 2.3, 2.1, '#f0b8a4');
        ctx.strokeStyle = '#c98a7a'; ctx.lineWidth = 0.34; ctx.beginPath(); for (const k of [-1.2, 0, 1.2]) { ctx.moveTo(x + 2.5, y + 0.6); ctx.lineTo(x + 2.5 + k * 1.4, y - 2.4); } ctx.stroke();
        fEll(ctx, x + 1.8, y - 2, 0.8, 0.4, '#ffe2d4');
        break;
      }
      case 'star': {   // a starfish
        const pts = [];
        for (let k = 0; k < 10; k++) { const a2 = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 1.1 : 3; pts.push([x + 2.5 + Math.cos(a2) * r, y - 2.6 + Math.sin(a2) * r * 0.9]); }
        fPoly(ctx, pts, d.c); fBlob(ctx, x + 2.5, y - 2.6, 0.5, '#fff0d0');
        break;
      }
      case 'ruin': {
        // a marble Greek column: stepped base, fluted shaft that tapers a touch toward the top,
        // an Ionic capital with curled volutes -- or, on a broken one, a jagged snapped-off top
        const O = '#5a4e86', M = '#f2eefa', L = '#ffffff', S = '#d6cfe8', D = '#a99fc4';
        const cx = x + 4, h = d.h, top = y - h, broken = d.broken;
        const step = (w, yy, hh) => { fRoundRect(ctx, cx - w / 2 - 0.7, yy - 0.7, w + 1.4, hh + 1.4, 0.8, O); fRect(ctx, cx - w / 2, yy, w, hh, M); fRect(ctx, cx - w / 2, yy, w, 0.6, L); fRect(ctx, cx - w / 2, yy + hh - 0.6, w, 0.6, S); };
        step(16, y - 3, 3); step(12, y - 6, 2);                       // the stylobate steps
        const shaftTop = broken ? top : top + 5, shaftBot = y - 7, half = yy => 4.5 - (shaftBot - yy) / Math.max(1, shaftBot - shaftTop) * 0.8;   // entasis: narrower up top
        const shaft = (grow, col) => fPoly(ctx, [[cx - half(shaftTop) - grow, shaftTop], [cx + half(shaftTop) + grow, shaftTop], [cx + half(shaftBot) + grow, shaftBot + 1], [cx - half(shaftBot) - grow, shaftBot + 1]], col);
        const sh = ctx.createLinearGradient(cx - 4.5, 0, cx + 4.5, 0); sh.addColorStop(0, L); sh.addColorStop(0.3, M); sh.addColorStop(0.75, S); sh.addColorStop(1, D);
        shaft(0.7, O); shaft(0, sh);
        for (const fx of [-2.4, -0.8, 0.8, 2.4]) fRect(ctx, cx + fx - 0.17, shaftTop + 1, 0.34, shaftBot - shaftTop - 1, fx > 1 ? D : S);   // flutes
        step(10, y - 8, 1);                                           // the torus at the foot of the shaft
        if (broken) {   // snapped off: a jagged break, a chip lying at its foot
          const jag = []; for (let i = -4.6; i <= 4.6; i += 1.15) jag.push([cx + i, top + (((Math.round(i * 2) * 7 + h) % 3 + 3) % 3) * 0.9]);
          fPoly(ctx, [[cx - 5, top + 3], ...jag.map(([a2, b2]) => [a2, b2 - 0.7]), [cx + 5, top + 3]], O);
          fPoly(ctx, [[cx - 4.2, top + 3.6], ...jag, [cx + 4.2, top + 3.6]], S);
          fPoly(ctx, [[cx + 7, y - 1], [cx + 8.4, y - 4.4], [cx + 11.6, y - 3.6], [cx + 12, y - 1]], O); fPoly(ctx, [[cx + 7.8, y - 1.4], [cx + 8.8, y - 3.8], [cx + 11, y - 3.2], [cx + 11.2, y - 1.4]], S);
        } else {        // the capital: a moulded neck, a slab, and two scrolled volutes
          step(12, top + 3, 2); step(16, top, 3);
          for (const sd of [-1, 1]) { const vx = cx + sd * 8; fBlob(ctx, vx, top + 4, 2.4, O); fBlob(ctx, vx, top + 4, 1.6, M); fBlob(ctx, vx + sd * 0.3, top + 4.3, 0.7, D); }
        }
        break;
      }
      case 'lamp': {   // gas street lamp with a warm, softly breathing glow
        fRoundRect(ctx, x - 1.2, y - 26, 4.4, 26, 1.2, INK); fRoundRect(ctx, x - 3.2, y - 3.2, 8.4, 3.2, 1, INK);
        fRect(ctx, x - 0.3, y - 26, 2.6, 24, '#4a4590'); fRect(ctx, x + 0.1, y - 26, 0.6, 24, '#7a74c0');
        fGlow(ctx, x + 1, y - 31, 16, '#ffcf6a', 0.26 + Math.sin(t * 0.05 + d.p) * 0.06);
        fPoly(ctx, [[x - 3.6, y - 36.4], [x + 5.6, y - 36.4], [x + 4.6, y - 26.8], [x - 2.6, y - 26.8]], INK);
        fPoly(ctx, [[x - 2.4, y - 39], [x + 4.4, y - 39], [x + 6, y - 36.2], [x - 4, y - 36.2]], INK);
        const pane = ctx.createLinearGradient(0, y - 35, 0, y - 28); pane.addColorStop(0, '#fff6d8'); pane.addColorStop(1, '#ffc850');
        fPoly(ctx, [[x - 2.4, y - 35.4], [x + 4.4, y - 35.4], [x + 3.7, y - 27.8], [x - 1.7, y - 27.8]], pane);
        fRect(ctx, x + 0.67, y - 35.4, 0.67, 7.6, INK); fEll(ctx, x + 1, y - 31, 0.9, 1.6, '#ffffff');
        break;
      }
      case 'cog':
        drawCog(ctx, x, y + 2, d.r, 7, t * 0.02 * d.s, '#8a5a1a', '#4a2e10');
        break;
      case 'rubble':
        fEll(ctx, x + 1.6, y - 1, 1.8, 1.2, th.ground[1]); fEll(ctx, x + 5, y - 0.5, 1.2, 0.7, th.ground[1]); fEll(ctx, x + 1.2, y - 1.6, 0.9, 0.45, th.ground[2]);
        break;
      // ── desert scenery (no ink outlines: only creatures get those) ──
      case 'saguaro': {
        const h = d.h, R = (a, b, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, hh); };
        const arm = (sd, at, len) => {
          const ay = -Math.round(h * at), ax = sd > 0 ? 3 : -7;
          R(ax - 1, ay - 1, 6, 5, '#2f6a3a'); R(ax, ay, 4, 3, '#5aa05a');
          const ux = sd > 0 ? ax + 2 : ax;
          R(ux - 1, ay - len - 1, 5, len + 2, '#2f6a3a'); R(ux, ay - len, 3, len + 1, '#5aa05a'); R(ux, ay - len, 1, len, '#8cd07a');
        };
        arm(-1, 0.35 + d.a * 0.2, 6 + Math.round(d.a * 5));
        if (d.b > 0.3) arm(1, 0.5 + d.b * 0.2, 5 + Math.round(d.b * 4));
        R(-4, -h - 1, 8, h + 1, '#2f6a3a'); R(-3, -h, 6, h, '#5aa05a');
        R(-2, -h, 1, h, '#8cd07a'); R(1, -h + 2, 1, h - 2, '#3f7a44');
        R(-3, -h - 1, 6, 1, '#5aa05a'); R(-2, -h - 2, 4, 1, '#2f6a3a');
        if (d.a > 0.6) { R(-1, -h - 4, 2, 2, '#ff7ab8'); R(0, -h - 3, 1, 1, '#ffd166'); }
        break;
      }
      case 'barrel':
        blob(ctx, x, y - 4, 5, '#2f6a3a'); blob(ctx, x, y - 4, 4, '#4f9a52');
        ctx.fillStyle = '#3a7a44'; ctx.fillRect(x - 2, y - 7, 1, 6); ctx.fillRect(x + 1, y - 7, 1, 6);
        ctx.fillStyle = '#8cd07a'; ctx.fillRect(x - 3, y - 6, 1, 2);
        if (d.f) { ctx.fillStyle = '#ff7ab8'; ctx.fillRect(x - 2, y - 10, 4, 2); ctx.fillRect(x - 1, y - 11, 2, 1); ctx.fillStyle = '#ffd166'; ctx.fillRect(x, y - 10, 1, 1); }
        break;
      case 'skull': {
        const f = d.f;
        ctx.fillStyle = '#d8c8a8'; ctx.fillRect(x - 3, y - 4, 7, 4); ctx.fillRect(x - 2, y - 5, 5, 1);
        ctx.fillStyle = '#fff6e0'; ctx.fillRect(x - 3, y - 4, 6, 1); ctx.fillRect(x - 6, y - 6, 3, 1); ctx.fillRect(x + 4, y - 6, 3, 1); ctx.fillRect(x - 7, y - 7, 1, 1); ctx.fillRect(x + 7, y - 7, 1, 1);
        ctx.fillStyle = '#6a4a3a'; ctx.fillRect(x - 2, y - 3, 1, 1); ctx.fillRect(x + 2, y - 3, 1, 1); ctx.fillRect(x + f, y - 1, 1, 1);
        break;
      }
      case 'dgrass':
        ctx.fillStyle = d.c;
        ctx.fillRect(x, y - 3, 1, 3); ctx.fillRect(x + 2, y - 5, 1, 5); ctx.fillRect(x + 4, y - 4, 1, 4); ctx.fillRect(x + 1, y - 6, 1, 2); ctx.fillRect(x + 5, y - 6, 1, 2);
        break;
      case 'pebble':
        ctx.fillStyle = '#a8642e'; ctx.fillRect(x, y - 2, 3, 2); ctx.fillRect(x + 5, y - 1, 2, 1);
        ctx.fillStyle = '#efbd78'; ctx.fillRect(x, y - 2, 2, 1);
        break;
      case 'urn': {
        const k = d.s ? 1 : 0, w = 4 + k, h = 9 + k * 3;
        for (let i = 0; i < h; i++) {
          const hw = Math.round(w * Math.sin((i + 1) / (h + 1) * Math.PI) + (i < 2 ? 1 : 0));
          ctx.fillStyle = '#4a2410'; ctx.fillRect(x - hw - 1, y - h + i, hw * 2 + 2, 1);
          ctx.fillStyle = d.c; ctx.fillRect(x - hw, y - h + i, hw * 2, 1);
        }
        ctx.fillStyle = '#f0d0a0'; ctx.fillRect(x - w + 1, y - Math.round(h * 0.55), w * 2 - 2, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - w + 2, y - h + 3, 1, Math.round(h / 3));
        break;
      }
      case 'shards':
        ctx.fillStyle = '#c86a3a'; ctx.fillRect(x, y - 2, 3, 2); ctx.fillRect(x + 4, y - 1, 3, 1);
        ctx.fillStyle = '#3a9a90'; ctx.fillRect(x + 7, y - 2, 2, 2);
        break;
      case 'brazier': {
        ctx.fillStyle = '#4a2410'; ctx.fillRect(x - 4, y - 10, 1, 10); ctx.fillRect(x + 3, y - 10, 1, 10); ctx.fillRect(x - 1, y - 10, 1, 10);
        ctx.fillStyle = '#4a2410'; ctx.fillRect(x - 6, y - 14, 13, 5);
        ctx.fillStyle = '#c8891e'; ctx.fillRect(x - 5, y - 13, 11, 3); ctx.fillStyle = '#ffd166'; ctx.fillRect(x - 5, y - 13, 11, 1);
        const f = Math.floor(t / 5 + d.p) % 3;
        ctx.globalAlpha = 0.09; blob(ctx, x, y - 22, 16, '#ff9a3c'); ctx.globalAlpha = 0.14; blob(ctx, x, y - 20, 8, '#ffd166'); ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff6a1f'; ctx.fillRect(x - 3, y - 19 - f, 7, 5 + f); ctx.fillRect(x - 1, y - 22 - f, 3, 3);
        ctx.fillStyle = '#ffd166'; ctx.fillRect(x - 1, y - 18, 3, 3);
        if ((t + d.p * 10) % 24 < 2) this.spark(x + rand(-2, 2), y - 22, '#ffb347', 20, rand(-0.2, 0.2), -0.6);
        break;
      }
      case 'palm': {   // (painted fine: palmArt, ocean-fine.js), swaying in the sea breeze
        const k = Math.floor(((t * 0.025 + d.p) / (Math.PI * 2) % 1 + 1) % 1 * PALM_SWAYS);
        ctx.drawImage(palmArt(d.h, d.lean, k), x - PALM_W / 2, y - d.h - 26);
        break;
      }
      case 'fern': {   // a lush tropical fan of arching fern fronds with curled fiddlehead tips (in fine pixels: hires.js)
        const sc = 0.85 + d.s * 0.55;
        for (const [ang, len, dark] of [[-2.65, 10, true], [-2.15, 13, false], [-1.57, 14.5, false], [-1.0, 13, false], [-0.5, 10, true]]) {
          const L = len * sc, ca = Math.cos(ang), sa = Math.sin(ang);
          ctx.strokeStyle = dark ? '#144422' : '#1b5a2c'; ctx.lineWidth = 0.8; ctx.lineCap = 'round'; ctx.beginPath();
          for (let j = 0; j <= L; j += 0.6) { const k = j / L; ctx.lineTo(x + 0.5 + ca * j, y + sa * j + k * k * 6.5); }
          ctx.stroke();
          for (let j = 1.6; j < L - 0.8; j += 1.35) {
            const k = j / L, fx = x + 0.5 + ca * j, fy = y + sa * j + k * k * 6.5, lw = (1 - k * 0.58) * 2.2;
            fEll(ctx, fx - sa * lw * 0.45, fy + ca * lw * 0.45 + 0.3, lw * 0.65, 0.5, dark ? '#2e7e38' : '#58c84e');
            fEll(ctx, fx + sa * lw * 0.45, fy - ca * lw * 0.45 + 0.3, lw * 0.65, 0.5, dark ? '#24662e' : '#3ea440');
          }
          // Little curled fiddlehead tip
          const tx = x + 0.5 + ca * L, ty = y + sa * L + 6.5;
          fBlob(ctx, tx, ty, 0.85, dark ? '#3ea440' : '#8ef070');
        }
        break;
      }
      case 'monstera': {   // tropical split-leaf philodendron / elephant-ear clump with an exotic hibiscus bloom at its base
        const f = d.f, big = 1.05 + d.s * 0.45;
        for (const [ang, L, dark] of [[-1.57 - f * 1.15, 13, true], [-1.57 + f * 1.35, 12, true], [-1.57 - f * 0.75, 15, false], [-1.57 + f * 0.45, 17, false], [-1.57 + f * 0.95, 13.5, false]]) {
          jungleLeafFine(ctx, x + 0.5, y - 1, ang, L * big, 4.4 * big, dark);
        }
        // Bright tropical hibiscus flower nestled in the clump
        const hx = x + 0.5 + f * 2.5, hy = y - 3.5;
        for (let a = 0; a < 5; a++) {
          const pa = a * Math.PI * 2 / 5 - 0.3;
          fEll(ctx, hx + Math.cos(pa) * 2.0, hy + Math.sin(pa) * 1.8, 1.6, 1.2, a < 2 ? '#ff8ab0' : '#ff3d6e');
        }
        fLine(ctx, hx, hy, hx + f * 2.2, hy - 1.8, '#ffe066', 0.6);
        fBlob(ctx, hx + f * 2.2, hy - 1.8, 0.65, '#fff6b0');
        break;
      }
      case 'bloom': {   // a vibrant tropical bromeliad / heliconia rosette with layered crimson-gold bracts (fine)
        for (const [b, hh, col] of [[-2.1, 6, '#1d5a2e'], [-1.3, 8.5, '#2f8a3e'], [-0.5, 9, '#4fb84e'], [0.5, 9, '#3fa044'], [1.3, 8.5, '#2f8a3e'], [2.1, 6, '#1d5a2e']]) {
          grassBlade(ctx, x + (b < 0 ? -1 : 1), y, hh, b, 2.4, col);
        }
        // Tall tiered tropical flower spike
        fRoundRect(ctx, x - 1.6, y - 11.4, 4.2, 8.4, 1.8, INK);
        for (let k = 0; k < 3; k++) {
          const by = y - 5.2 - k * 2.2, sd = k % 2 ? 1 : -1;
          fPoly(ctx, [[x + 0.5, by + 1.2], [x + 0.5 + sd * 3.2, by - 1.0], [x + 0.5, by - 1.8], [x + 0.5 - sd * 1.4, by + 0.4]], INK);
          fPoly(ctx, [[x + 0.5, by + 0.8], [x + 0.5 + sd * 2.5, by - 0.8], [x + 0.5, by - 1.3], [x + 0.5 - sd * 0.9, by + 0.2]], d.c);
          fEll(ctx, x + 0.5 + sd * 1.2, by - 0.6, 0.7, 0.35, '#ffe878');
        }
        fBlob(ctx, x + 0.5, y - 10.6, 1.1, '#ffe878');
        fBlob(ctx, x + 0.3, y - 10.9, 0.5, '#ffffff');
        break;
      }
      case 'roots': {   // tropical curtain of hanging lianas, aerial roots, and dangling orchid blossoms (fine strokes)
        ctx.lineCap = 'round';
        for (let i = 0; i < d.n.length; i++) {
          const rx = x + i * 5 + 0.5, L = d.n[i] + 2, sw = Math.sin(t * 0.022 + d.p + i) * 1.6;
          ctx.strokeStyle = '#24522c'; ctx.lineWidth = 1.0; ctx.beginPath(); ctx.moveTo(rx, y); ctx.quadraticCurveTo(rx - sw * 0.3, y + L * 0.55, rx + sw, y + L); ctx.stroke();
          ctx.strokeStyle = '#3f8a3c'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(rx - 0.2, y + 1); ctx.quadraticCurveTo(rx - sw * 0.3 - 0.2, y + L * 0.55, rx + sw - 0.2, y + L - 1); ctx.stroke();
          for (let ly = 3.5; ly < L - 1; ly += 4.2) {
            const u = ly / L, lx = rx + sw * u * u, sd = ((ly / 4 | 0) + i) % 2 ? 1 : -1;
            fEll(ctx, lx + sd * 1.5, y + ly, 1.4, 0.65, '#4fae46');
            fEll(ctx, lx + sd * 1.4, y + ly - 0.15, 0.9, 0.35, '#8ee070');
          }
          fEll(ctx, rx + sw, y + L + 0.8, 1.4, 1.1, '#3f9a3e');
          if (i === 1 && L > 7) {   // a small hanging rainforest blossom at the tip of the middle vine
            fBlob(ctx, rx + sw, y + L + 1.4, 1.35, '#ff6aa8');
            fBlob(ctx, rx + sw, y + L + 1.4, 0.6, '#ffe680');
          }
        }
        break;
      }
      case 'pillar': {   // a broken stone column: carved bands, a jagged top and moss on it (fine)
        const h = d.h, sh = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
        sh.addColorStop(0, '#a4c27a'); sh.addColorStop(0.3, '#6f8a4e'); sh.addColorStop(1, '#4a6234');
        fRoundRect(ctx, x - 6, y - 4.4, 12, 4.4, 1.2, INK); fRoundRect(ctx, x - 5.3, y - 3.7, 10.6, 3, 0.8, '#5c7a5e');
        fPoly(ctx, [[x - 5, y - 4], [x - 5, y - h - 2], [x - 1.6, y - h - 1.4], [x - 0.6, y - h + 0.4], [x + 1.2, y - h - 1], [x + 5, y - h - 0.4], [x + 5, y - 4]], INK);
        fPoly(ctx, [[x - 4.3, y - 4], [x - 4.3, y - h - 1.2], [x - 1.8, y - h - 0.7], [x - 0.6, y - h + 1.2], [x + 1.2, y - h - 0.2], [x + 4.3, y - h + 0.3], [x + 4.3, y - 4]], sh);
        for (let k = -h + 6; k < -6; k += 7) { fRect(ctx, x - 4.3, y + k, 8.6, 0.67, '#3a5228'); fRect(ctx, x - 4.3, y + k + 0.67, 8.6, 0.34, '#b8d08a'); }
        for (let k = 0; k < 4; k++) fEll(ctx, x - 3.4 + k * 2.3, y - h + 0.6 + (k % 2) * 0.6, 1.5, 1.2, '#3f8a34');
        fRoundRect(ctx, x - 1.8, y - h + 1.4, 1.2, 4.4, 0.6, '#3f8a34');
        break;
      }
      case 'cattail': {   // a clump of cattails swaying in the evening breeze (in fine pixels: hires.js)
        for (let i = 0; i < d.n; i++) {
          const h = 12 + ((i * 7 + d.x) % 9), sway = Math.sin(t * 0.03 + d.p + i) * 1.5, bx = x + i * 3 - d.n + 0.5;
          ctx.strokeStyle = '#3a5a2a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - h * 0.6, bx + sway, y - h); ctx.stroke();
          fRoundRect(ctx, bx + sway - 1.8, y - h - 5.4, 3.6, 7, 1.6, INK);
          const hg = ctx.createLinearGradient(bx + sway - 1.2, 0, bx + sway + 1.2, 0); hg.addColorStop(0, '#a87a4a'); hg.addColorStop(0.5, '#7a4a24'); hg.addColorStop(1, '#5a3418');
          fRoundRect(ctx, bx + sway - 1.13, y - h - 4.73, 2.27, 5.67, 1.1, hg);
          fRect(ctx, bx + sway - 1 / 6, y - h - 7.4, 1 / 3, 2.4, '#5a7a3a');
        }
        ctx.strokeStyle = '#4a7a34'; ctx.lineWidth = 0.6;
        for (const [lx, h, lean] of [[x - 2.5, 3.4, -1.4], [x + d.n * 3 + 0.5, 4.4, 1.6]]) { ctx.beginPath(); ctx.moveTo(lx, y); ctx.quadraticCurveTo(lx, y - h * 0.7, lx + lean, y - h); ctx.stroke(); }   // a couple of loose blades
        break;
      }
      case 'knee':   // a cypress knee poking up out of the mud: knobbly, lit on its left (fine)
        fRoundRect(ctx, x - 0.67, y - d.h - 1.6, 5.33, d.h + 1.6, 2.2, INK);
        { const kg = ctx.createLinearGradient(x, 0, x + 4, 0); kg.addColorStop(0, '#9a8a74'); kg.addColorStop(0.45, '#6a5a4a'); kg.addColorStop(1, '#4a3e32'); fRoundRect(ctx, x, y - d.h - 0.9, 4, d.h + 0.9, 1.8, kg); }
        fEll(ctx, x + 1.2, y - d.h + 0.4, 0.8, 0.5, '#b8a890');
        break;
      case 'lantern': {   // a paper lantern on a post, swinging gently, glowing warm (in fine pixels: hires.js)
        fRect(ctx, x - 2 / 3, y - 28, 7 / 3, 28, INK); fRect(ctx, x, y - 28, 1, 28, '#6a4a2a');
        fRoundRect(ctx, x - 0.4, y - 29.4, 8.4, 2.4, 0.8, INK); fRect(ctx, x, y - 28.6, 7.4, 1, '#6a4a2a');
        const sw = Math.sin(t * 0.04 + d.p) * 2, lx = x + 6.5 + sw, ly = y - 22;
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(x + 6.5, y - 27); ctx.lineTo(lx, ly - 3); ctx.stroke();
        const pulse = this.band && this.band.members.length && !this.bandHushed() ? Math.max(0, 1 - (this.band.f % BAND_BEAT) / 10) * 0.12 : 0;   // (glowing brighter on the beat)
        fGlow(ctx, lx, ly + 2, 15 + pulse * 10, d.c, 0.32 + Math.sin(t * 0.07 + d.p) * 0.06 + pulse * 1.5);
        fEll(ctx, lx, ly + 2, 5, 5.6, INK);
        const lg = ctx.createRadialGradient(lx - 1, ly + 1, 0.5, lx, ly + 2, 5); lg.addColorStop(0, '#fff3c8'); lg.addColorStop(0.45, d.c); lg.addColorStop(1, lerpColor(d.c, '#000000', 0.35));
        fEll(ctx, lx, ly + 2, 4.3, 4.9, lg);
        for (const ry of [-0.6, 2, 4.6]) fEll(ctx, lx, ly + ry, 4.1 - Math.abs(ry - 2) * 0.35, 0.3, 'rgba(27,21,48,0.35)');   // its paper ribs
        fRoundRect(ctx, lx - 2, ly - 3.4, 4, 1.4, 0.5, INK); fRoundRect(ctx, lx - 2, ly + 6.6, 4, 1.4, 0.5, INK);
        break;
      }
      case 'jshroom':   // a cluster of glowing tropical rainforest cup-fungi / mushrooms (fine)
        for (const [mx, h, r, cTop, cGlow] of [[x + 1.2, 3.8, 2.8, '#ff6e3a', '#ffd480'], [x + 5.2, 2.5, 2.0, '#ff9248', '#ffe49e'], [x + 8.0, 1.8, 1.3, '#ff6e3a', '#ffd480']]) {
          fRoundRect(ctx, mx - 0.55, y - h, 1.1, h, 0.5, '#f2e6cf');
          fEll(ctx, mx, y - h - 0.2, r + 0.5, r * 0.68 + 0.5, '#4a1e0c');
          fEll(ctx, mx, y - h - 0.4, r, r * 0.68, cTop);
          fEll(ctx, mx - r * 0.32, y - h - r * 0.42, r * 0.42, r * 0.24, cGlow);
          fBlob(ctx, mx + r * 0.35, y - h - 0.2, 0.35, cGlow);
        }
        break;
      case 'gsteam': {   // 4-1: a thread of steam curling up out of a crack in the cornbread
        for (let i = 0; i < 3; i++) {
          const u = ((t * 0.008 + d.p + i / 3) % 1), yy = y - 2 - u * 26, xx = x + Math.round(Math.sin(u * 7 + d.p) * 3);
          ctx.globalAlpha = 0.28 * Math.sin(u * Math.PI); fBlob(ctx, xx, yy, 2 + u * 3, '#fff0e0');
        }
        ctx.globalAlpha = 1;
        fEll(ctx, x, y + 0.4, 2.4, 0.7, '#6e3412');
        break;
      }
      case 'gsprig': {   // a sprig of thyme (fine)
        const tx = x + 0.5 + d.f * 2.8;
        ctx.strokeStyle = '#3a6a2a'; ctx.lineWidth = 0.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.quadraticCurveTo(x + 0.5 + d.f * 0.6, y - 4, tx, y - 7.4); ctx.stroke();
        for (const [dx, dy] of [[-1, 2], [1, 3], [-1, 4.2], [1, 5.4], [0, 7.6]]) { const lx = x + 0.5 + d.f * dy * 0.38 + dx * 1.1; fEll(ctx, lx, y - dy, 1, 0.6, '#3a6a2a'); fEll(ctx, lx, y - dy - 0.15, 0.7, 0.35, '#6ab04a'); }
        break;
      }
      case 'gcorn':      // a couple of loose kernels of corn and a peppercorn (fine)
        for (const kx of [x + 1, x + 5]) { fEll(ctx, kx, y - 1.4, 1.3, 1.5, '#9a6a10'); fEll(ctx, kx, y - 1.6, 1, 1.2, '#e8b020'); fEll(ctx, kx - 0.3, y - 2.2, 0.5, 0.4, '#ffe680'); }
        fBlob(ctx, x + 9, y - 1.1, 1.1, '#2a1a14'); fBlob(ctx, x + 8.7, y - 1.5, 0.35, '#6a4a3a');
        break;
      case 'gshrimp': {  // a shrimp tail, curled up where somebody dropped it (fine)
        for (let k = 5; k >= 0; k--) { const sx = x + 1 + d.f * Math.cos(k * 0.5) * 3, sy = y - 1.5 - Math.sin(k * 0.5) * 3, r = 1.5 - k * 0.07; fBlob(ctx, sx, sy, r + 0.5, '#8a2a14'); fBlob(ctx, sx, sy, r, k % 2 ? '#ff9a7a' : '#f07a5a'); fBlob(ctx, sx - 0.3, sy - 0.5, r * 0.4, '#ffd0b8'); }
        fPoly(ctx, [[x + 1 + d.f * 3.6, y - 1], [x + 1 + d.f * 6, y - 2.6], [x + 1 + d.f * 6, y + 0.2]], '#d8502a');
        break;
      }
      case 'villi':   // 3-4, inside: a little clump of stomach-lining fingers, waving about (fine)
        for (let i = 0; i < d.n; i++) {
          const h = 4 + ((i * 5 + d.n) % 4), bx = x + i * 3 + 1, sway = Math.sin(t * 0.06 + d.p + i) * 1.2;
          ctx.strokeStyle = '#7a1e36'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - h * 0.6, bx + sway, y - h); ctx.stroke();
          fBlob(ctx, bx + sway, y - h, 1.2, '#e8788a'); fBlob(ctx, bx + sway - 0.3, y - h - 0.4, 0.45, '#ffc0c8');
        }
        break;
      case 'agave':
        ctx.fillStyle = '#4a8a7a';
        for (const [dx, hh] of [[-5, 4], [-3, 7], [0, 9], [3, 7], [5, 4]]) { ctx.fillRect(x + dx, y - hh, 1, hh); ctx.fillRect(x + Math.sign(dx) * 0 + dx - Math.sign(dx), y - Math.round(hh / 2), 1, Math.round(hh / 2)); }
        ctx.fillStyle = '#7ac8a8'; ctx.fillRect(x, y - 9, 1, 3); ctx.fillRect(x - 3, y - 7, 1, 2); ctx.fillRect(x + 3, y - 7, 1, 2);
        break;
    }
  }
}
// Above the waves (a dry stretch of a water level): the open sea rolling in the gaps between
// the islands and wrecks, drawn behind the tiles so it only shows where there's no ground.
// Chickaroo hanging from a dandelion seed: a thin stalk up from his hands to a fluffy white crown.
GameDecor.prototype.drawSeedChute = function (ctx) {   // (in fine pixels: hires.js)
  const p = this.player;
  const warn = p.floatT != null && p.floatT <= DANDELION_WARN;
  const urgency = warn ? clamp(1 - p.floatT / DANDELION_WARN, 0, 1) : 0;
  const shiver = warn ? Math.sin(this.t * 0.65) * (1.2 + urgency * 2.5) : 0;
  const x = Math.round(p.x + p.w / 2 + Math.sin(this.t * 0.06) * 1.5 + shiver), y = Math.round(p.y) - 2;
  const origAlpha = ctx.globalAlpha;
  if (warn && ((p.floatT >> 2) % 2 === 0)) ctx.globalAlpha *= 0.55;
  fRect(ctx, x, y - 14, 2 / 3, 14, '#c8b890'); fRect(ctx, x, y - 14, 1 / 3, 14, '#efe4c4');
  fEll(ctx, x + 0.3, y - 14.6, 1.4, 1, '#8a7050');
  const count = warn ? Math.max(6, Math.floor(21 * (1 - urgency * 0.7))) : 21;
  for (let i = 0; i < count; i++) {
    const a = Math.PI + (i / 20) * Math.PI, r = 9 + (i % 2) * 0.8, c = Math.cos(a), sn = Math.sin(a);
    fLine(ctx, x + 0.3 + c, y - 15 + sn, x + 0.3 + c * (r - 0.8), y - 15 + sn * (r - 0.8), '#e8eef8');
    fBlob(ctx, x + 0.3 + c * r, y - 15 + sn * r, 0.7, '#ffffff');
  }
  ctx.globalAlpha = origAlpha;
};
// the open sea behind a dry stretch of a water level (fine: a smooth rolling wave line, the water deepening below it,
// a foaming crest with glints running along it, streaks of light drifting on the swell)
let SEA_GRAD = null, SEA_PTS = null;
GameDecor.prototype.drawSea = function (ctx, cam) {
  const t = this.t, base = 12 * TILE + 6, wave = x => base + Math.sin((x + t * 0.6) / 13) * 1.5 + Math.sin((x - t * 0.4) / 7);
  if (!SEA_PTS) SEA_PTS = Array.from({ length: 1500 }, () => [0, 0]);
  let pIdx = 0;
  for (let x = cam - 1; x <= cam + VIEW_W + 1; x += 1 / ART_R) {
    const pt = SEA_PTS[pIdx++]; pt[0] = x; pt[1] = wave(x);
  }
  const body = dy => {
    ctx.beginPath(); ctx.moveTo(cam - 1, VIEW_H);
    for (let i = 0; i < pIdx; i++) ctx.lineTo(SEA_PTS[i][0], SEA_PTS[i][1] + dy);
    ctx.lineTo(cam + VIEW_W + 1, VIEW_H); ctx.fill();
  };
  if (!SEA_GRAD) {
    const gr = ctx.createLinearGradient(0, base - 3, 0, VIEW_H);
    gr.addColorStop(0, '#2c98d8'); gr.addColorStop(0.3, '#1f7fc0'); gr.addColorStop(1, '#10467e');
    SEA_GRAD = gr;
  }
  ctx.fillStyle = SEA_GRAD; body(0);
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#0c3e74'; body(10); ctx.globalAlpha = 1;
  for (let k = 0; k < 14; k++) {   // light on the swell
    const x = cam + ((k * 61 + t * (0.2 + (k % 3) * 0.08)) % (VIEW_W + 20)) - 10, y = base + 5 + ((k * 7) % 19), w = 3 + (k % 4) * 1.5;
    ctx.globalAlpha = 0.18 + (k % 3) * 0.08; fRect(ctx, x, y + Math.sin((x + t * 0.6) / 13) * 1.2, w, 1 / ART_R, '#d8f4ff');
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#a8e4ff'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (let i = 0; i < pIdx; i++) {
    if (i === 0) ctx.moveTo(SEA_PTS[0][0], SEA_PTS[0][1] + 0.35);
    else ctx.lineTo(SEA_PTS[i][0], SEA_PTS[i][1] + 0.35);
  }
  ctx.stroke();
  for (let x = Math.floor(cam); x < cam + VIEW_W; x++) if ((x + (t >> 3)) % 9 < 3) fRect(ctx, x, wave(x) - 1 / ART_R, 1, 2 / ART_R, '#ffffff');   // foam glints
};
// 2-1's underwater whirlpool current around the treasure island: swirling slipstream ribbons and a dense stream of
// clockwise-orbiting bubbles so the vortex current and its direction are immediately readable.
GameDecor.prototype.drawWhirlpool = function (ctx, cam) {
  const w = this.level.def.whirlpool;
  if (!w) return;
  const cx = w.x * TILE, cy = w.y * TILE, rx = w.rx * TILE, ry = w.ry * TILE;
  if (cx + rx * 1.5 < cam || cx - rx * 1.5 > cam + VIEW_W) return;
  const t = this.t, spd = (w.speed || 1.8) * 0.022;
  ctx.save();
  ctx.lineCap = 'round';
  // Swirling current slipstream arcs around the elliptical band (r = 0.72 .. 1.32)
  for (let i = 0; i < 12; i++) {
    const r = 0.74 + (i % 4) * 0.17;
    const a0 = (i * Math.PI / 6 + t * spd * (1.25 - (i % 4) * 0.12)) % (Math.PI * 2);
    const span = 0.42 + (i % 3) * 0.14;
    ctx.globalAlpha = 0.22 + (i % 3) * 0.08;
    ctx.strokeStyle = i % 2 ? '#bff8ff' : '#6fd8ff';
    ctx.lineWidth = i % 3 === 0 ? 1.4 : 0.9;
    ctx.beginPath();
    for (let s = 0; s <= 10; s++) {
      const a = a0 + (s / 10) * span;
      const px = cx + Math.cos(a) * rx * r, py = cy + Math.sin(a) * ry * r;
      s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  // Orbiting ring of 10 lightweight, crisp underwater bubbles racing clockwise in the current (optimized for 60 FPS)
  for (let i = 0; i < 10; i++) {
    const band = 0.72 + (i % 5) * 0.12;
    const wob = Math.sin(t * 0.12 + i * 2.1) * 0.03;
    const a = (i * Math.PI * 2 / 10) + t * spd * (1.35 - (band - 0.72) * 0.35);
    const bx = cx + Math.cos(a) * rx * (band + wob);
    const by = cy + Math.sin(a) * ry * (band + wob);
    const br = 1.3 + (i % 3) * 0.5;
    const pulse = 0.7 + Math.sin(t * 0.1 + i) * 0.2;
    ctx.globalAlpha = pulse * 0.75;
    fArc(ctx, bx, by, Math.max(0.4, br - 0.5), br, 0, Math.PI * 2, '#d6f8ff');
    ctx.globalAlpha = pulse * 0.9;
    fBlob(ctx, bx - br * 0.35, by - br * 0.35, Math.max(0.35, br * 0.3), '#ffffff');
  }
  ctx.restore();
};
mixin(Game, GameDecor);
