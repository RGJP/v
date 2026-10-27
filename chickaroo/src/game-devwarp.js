'use strict';
// Part of class Game (see game.js): GameDevWarp — the developer warp menu.
// Hidden controller sequence opens a minimap; confirming restarts at the selected position.
class GameDevWarp {
  warpPoints() {
    const def = LEVELS[this.levelIndex], pts = [{ label: 'START', col: def.start, c: '#ffffff' }];
    checkpoints(def).forEach((col, i) => pts.push({ label: 'CHECKPOINT ' + (i + 1), col, c: '#2ec4b6' }));
    if (def.boss) pts.push({ label: 'BOSS ARENA', col: def.boss.wall - 3, c: '#ff5a5f' });
    if (def.goal) pts.push({ label: 'GOAL', col: Math.max(def.start, def.goal.x - 8), c: '#ffd166' });
    return pts.sort((a, b) => a.col - b.col);
  }
  openWarp(again) {
    if ((this.mode !== 'play' && this.mode !== 'pause') || this.fadeCb || !this.level || !this.player) return;
    const p = this.player, id = LEVELS[this.levelIndex].id;
    if (p.state === 'dead' || this.tally) return;
    if (again) { if (this.warpAt && this.warpAt.level === id) this.doWarp(this.warpAt.col); return; }
    this.warpFrom = this.mode;
    if (this.mode === 'play') Music.pause();
    this.mode = 'devwarp'; this.warpRep = 0;
    this.warpCur = this.warpAt && this.warpAt.level === id ? this.warpAt.col : Math.floor((p.x + p.w / 2) / TILE);
    Sound.play('pause');
  }
  closeWarp() {
    Sound.play('select');
    if (this.warpFrom === 'pause') { this.mode = 'pause'; this.menu = 0; } else this.resume();
  }
  setWarpCur(col) { this.warpCur = clamp(Math.round(col), 1, this.level.w - 2); }
  doWarp(col) {
    const def = LEVELS[this.levelIndex], p = this.player;
    this.warpAt = { level: def.id, col };
    Sound.play('confirm');
    this.transition(() => {
      this.power = p.power; this.suit = p.suit; this.useCheckpoint = false;
      Music.remember(def.id);
      this.startLevel();
      this.popup(this.player.x + 6, this.player.y - 12, 'WARP', '#ff8bd8');
    });
  }
  // The lowest row in column x with safe footing (not lava, quicksand or coals) and room for a big
  // Chickaroo above it, so a warp lands on the ground rather than on a floating block; ROWS if none.
  standRow(lv, x) {
    const bad = t => t === T.LAVA || t === T.QSAND || t === T.COAL;
    for (let y = ROWS - 1; y >= 2; y--) {
      if (!lv.solid(x, y) || bad(lv.get(x, y))) continue;
      if (!lv.solid(x, y - 1) && !lv.solid(x, y - 2)) return y;
    }
    return ROWS;
  }
  // The nearest column to `c` where the whole player can stand: [col, row].
  safeSpot(lv, c) {
    for (let d = 0; d < lv.w; d++) for (const x of [c + d, c - d]) {
      if (x < 1 || x >= lv.w - 2) continue;
      const r = this.standRow(lv, x);
      if (r < ROWS && r === this.standRow(lv, x + 1)) return [x, r];
    }
    return [c, lv.surfaceRow(c)];
  }

  updateDevWarp(busy) {
    if (busy) return;
    if (Input.hit('pause') || Input.hit('roll')) { this.closeWarp(); return; }
    const dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    const tap = Input.hit('left') || Input.hit('right');
    this.warpRep = dir && this.warpRep > 0 ? this.warpRep - 1 : 0;
    if (dir && (tap || this.warpRep === 0)) {
      this.warpRep = tap ? 14 : 2;
      this.setWarpCur(this.warpCur + dir * (Input.down('run') ? 8 : 1));
    }
    if (Input.hit('up') || Input.hit('down')) {   // hop to the previous / next marked point
      const pts = this.warpPoints(), up = Input.hit('up');
      const pt = up ? pts.filter(q => q.col < this.warpCur).pop() || pts[pts.length - 1] : pts.find(q => q.col > this.warpCur) || pts[0];
      this.setWarpCur(pt.col); Sound.play('select');
    }
    if (Input.hit('start') || Input.hit('jump') || Input.hit('ok')) this.doWarp(this.warpCur);
  }
  // keyboard extras (from boot.js): 1-9 jump to 10%-90% of the stage, 0 / Home to the start, End to the goal
  warpKey(code) {
    const def = LEVELS[this.levelIndex], m = /^(?:Digit|Numpad)(\d)$/.exec(code);
    if (m) this.setWarpCur(+m[1] ? this.level.w * +m[1] / 10 : def.start);
    else if (code === 'Home') this.setWarpCur(def.start);
    else if (code === 'End') this.setWarpCur(def.goal ? def.goal.x - 8 : this.level.w - 3);
    else return false;
    Sound.play('select');
    return true;
  }
  // clicking the minimap moves the cursor there; clicking the cursor again warps
  tapWarpMap(x, h) {
    const col = clamp(Math.floor((x - h.x) / h.s), 1, this.level.w - 2);
    if (Math.abs(col - this.warpCur) <= Math.max(1, Math.ceil(2 / h.s))) this.doWarp(this.warpCur);
    else { this.setWarpCur(col); Sound.play('select'); }
  }

  drawDevWarp(ctx) {
    const lv = this.level, cur = this.warpCur, def = lv.def;
    // preview the stage around the cursor
    const camX = this.camX;
    this.camX = clamp(cur * TILE + 8 - VIEW_W / 2, 0, lv.w * TILE - VIEW_W);
    this.drawWorld(ctx);
    const [spot, row] = this.safeSpot(lv, cur), sx = spot * TILE + 2 - this.camX, sy = row * TILE;
    this.camX = camX;
    const bob = Math.round(Math.sin(this.t / 8) * 2);
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#ff8bd8'; ctx.fillRect(sx, sy - SMALL_H, PLAYER_W, SMALL_H); ctx.globalAlpha = 1;
    drawText(ctx, 'V', sx + 1, sy - SMALL_H - 12 + bob, '#ff8bd8', { shadow: INK });

    // the panel: title, minimap, info, help
    const px = 6, pw = VIEW_W - 12, py = 3, ph = 14 + ROWS * 2 + 24;   // up top and slim, so the stage shows through
    ctx.globalAlpha = 0.5; this.drawPanel(ctx, px, py, pw, ph, '#ff8bd8'); ctx.globalAlpha = 1;
    drawText(ctx, 'DEV WARP', px + 8, py + 5, '#ff8bd8', { shadow: INK });
    drawText(ctx, def.name, px + pw - 8, py + 5, '#b8b2d8', { align: 'right', shadow: INK });
    const s = Math.min(2, (pw - 16) / lv.w), mw = Math.ceil(lv.w * s), mx = Math.round(VIEW_W / 2 - mw / 2), my = py + 15, rh = 2;
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#15112b'; ctx.fillRect(mx, my, mw, ROWS * rh); ctx.globalAlpha = 1;
    if (lv.water) { ctx.fillStyle = '#1a3f6b'; ctx.fillRect(mx, my + lv.water.top * rh, mw, (ROWS - lv.water.top) * rh); }
    const cw = Math.max(1, Math.ceil(s));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < lv.w; c++) {
      const t = lv.get(c, r);
      if (!t) continue;
      ctx.fillStyle = t === T.LAVA ? '#ff5a3c' : t === T.COAL ? '#ff9f43' : t === T.QSAND ? '#c9a24a' : t === T.COIN ? '#ffd166'
        : t === T.SEMI ? '#6c6896' : SOLID[t] ? '#9a94c8' : '#4a4570';
      ctx.fillRect(mx + Math.floor(c * s), my + r * rh, cw, rh);
    }
    for (const pt of this.warpPoints()) { ctx.fillStyle = pt.c; ctx.fillRect(mx + Math.floor(pt.col * s), my - 4, cw, 3); }
    const p = this.player;
    ctx.fillStyle = '#7be08a'; ctx.fillRect(mx + Math.floor((p.x + p.w / 2) / TILE * s) - 1, my - 4, 3, 3);   // where you are now
    // cursor: the screen-wide window it previews, and the column itself (blinking)
    const vx = mx + Math.floor(clamp(cur - VIEW_W / TILE / 2, 0, lv.w - VIEW_W / TILE) * s), vw = Math.round(VIEW_W / TILE * s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(vx, my - 1, vw, 1); ctx.fillRect(vx, my + ROWS * rh, vw, 1);
    ctx.fillRect(vx, my - 1, 1, ROWS * rh + 2); ctx.fillRect(vx + vw - 1, my - 1, 1, ROWS * rh + 2);
    if (Math.floor(this.t / 12) % 2 === 0) { ctx.fillStyle = '#ff8bd8'; ctx.fillRect(mx + Math.floor(cur * s), my - 2, cw, ROWS * rh + 4); }
    this.menuHits.push({ x: mx, y: my - 6, w: mw, h: ROWS * rh + 10, i: 0, map: true, s });

    const near = this.warpPoints().filter(q => q.col <= cur).pop();
    const info = 'COL ' + cur + ' / ' + lv.w + '  ' + Math.round(cur / lv.w * 100) + '%' + (near ? '   PAST ' + near.label : '');
    drawText(ctx, info, VIEW_W / 2, my + ROWS * rh + 3, '#ffffff', { align: 'center', shadow: INK });
    drawText(ctx, '<> MOVE  SHIFT FAST  UP/DN MARKS  1-9  ENTER GO  ESC', VIEW_W / 2, py + ph - 10, '#b8b2d8', { align: 'center' });
  }
}
mixin(Game, GameDevWarp);
