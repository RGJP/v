'use strict';
// Part of class Game (see game.js): GameControls
// The CONTROLS screen (from the title menu and the pause menu): every play action's two keys or buttons, for whichever
// is being played with -- the keyboard, or a controller. Pick a slot and press what it should be; whatever had that
// key swaps over, so nothing is ever left without one. It reads the keys and buttons themselves (boot.js's keydown,
// Pad.pollControls), not what they're bound to, so a muddled layout can always be put right.
class GameControls {
  // a keyboard or a controller (the touch buttons aren't remappable)
  canRemap() { return Pad.used || !(this.touch && !Input.keyboard); }
  openControls(from) {
    this.ctlFrom = from; this.ctlReturn = this.menu;
    this.mode = 'controls'; this.menu = 0; this.ctlSlot = 0; this.ctlListen = null; this.ctlMsg = null; this.ctlT = 0;
    this.ctlDev = Pad.used ? 'pad' : 'keys';
    Sound.play('confirm');
  }
  closeControls() {
    Pad.muteHeld();
    this.mode = this.ctlFrom; this.menu = this.ctlReturn; this.ctlListen = null;
    Sound.play('select');
  }
  // the view follows whatever was last used (resetting the cursor, the two lists being different lengths)
  ctlSwitch(dev) {
    if (this.ctlDev === dev) return false;
    this.ctlDev = dev; this.menu = 0; this.ctlSlot = 0; this.ctlListen = null; this.ctlMsg = null;
    return true;
  }
  ctlNote(text) { this.ctlMsg = { text, t: 150 }; }
  updateControls() {
    this.ctlT++;
    if (this.ctlMsg && --this.ctlMsg.t <= 0) this.ctlMsg = null;
    if (this.ctlListen && ++this.ctlListen.t > 420) { this.ctlListen = null; Sound.play('select'); }   // (nothing pressed: give up)
    if (!this.ctlListen) this.ctlSwitch(Pad.used ? 'pad' : 'keys');
  }
  ctlRows() { return Controls.actions(this.ctlDev).length + 2; }   // the actions, then RESET TO DEFAULTS and BACK
  ctlMove(d) {
    const n = this.ctlRows(), nA = n - 2;
    if (d === 'up') this.menu = (this.menu + n - 1) % n;
    else if (d === 'down') this.menu = (this.menu + 1) % n;
    else if (this.menu < nA) this.ctlSlot = 1 - this.ctlSlot;
    else return;
    Sound.play('select');
  }
  ctlConfirm() {
    const nA = this.ctlRows() - 2;
    if (this.menu < nA) { this.ctlListen = { t: 0 }; this.ctlMsg = null; Sound.play('confirm'); }
    else if (this.menu === nA) { Controls.reset(this.ctlDev); this.ctlNote('DEFAULTS RESTORED'); Sound.play('confirm'); }
    else this.closeControls();
  }
  ctlClear() {
    const A = Controls.actions(this.ctlDev);
    if (this.menu >= A.length) return;
    if (Controls.clear(this.ctlDev, A[this.menu][0], this.ctlSlot)) Sound.play('select');
    else { this.ctlNote(this.ctlDev === 'pad' ? 'EVERY ACTION NEEDS A BUTTON' : 'EVERY ACTION NEEDS A KEY'); Sound.play('swDeny'); }
  }
  ctlBind(code) {
    const dev = this.ctlDev, A = Controls.actions(dev), a = A[this.menu][0];
    this.ctlListen = null;
    if (Controls.assign(dev, a, this.ctlSlot, code)) { Sound.play('confirm'); return; }
    // (it was another action's only key, and this slot had nothing to give it back)
    const other = A.find(([b]) => Controls.binds(dev)[b].includes(code));
    this.ctlNote(Controls.name(dev, code) + ' IS ' + (other ? other[1] : '') + "'S ONLY " + (dev === 'pad' ? 'BUTTON' : 'KEY'));
    Sound.play('swDeny');
  }
  // a key went down (boot.js; repeat: held down)
  controlsKey(code, repeat) {
    if (this.fadeCb) return;
    if (this.ctlListen) {
      if (repeat) return;
      if (code === 'Escape') { this.ctlListen = null; Sound.play('select'); return; }
      if (this.ctlDev !== 'keys') return;
      if (KEY_UNBINDABLE.test(code)) { this.ctlNote("THAT KEY CAN'T BE USED"); Sound.play('swDeny'); return; }
      this.ctlBind(code);
      return;
    }
    Pad.used = false; Input.keyboard = true; Input.touch = false;
    if (this.ctlSwitch('keys')) return;   // (the first key just brings up the keyboard's list)
    const m = KEYMAP[code];
    const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[code] || (['up', 'down', 'left', 'right'].includes(m) ? m : null);
    if (dir) { this.ctlMove(dir); return; }
    if (repeat) return;
    if (code === 'Escape' || code === 'Backspace' || m === 'pause') this.closeControls();
    else if (code === 'Delete') this.ctlClear();
    else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space' || m === 'jump') this.ctlConfirm();
  }
  // a controller's newly pressed buttons and directions (Pad.pollControls). Cross / A picks, Square / X clears, Circle /
  // B goes back -- always, whatever they're bound to
  controlsPad(pressed, dirs) {
    if (this.fadeCb || (!pressed.length && !dirs.length)) return;
    if (this.ctlListen) {
      if (this.ctlDev !== 'pad') return;
      if (dirs.length || pressed.includes('touchpad')) { this.ctlListen = null; Sound.play('select'); return; }
      const b = pressed.find(k => PAD_BUTTONS.includes(k));
      if (b) this.ctlBind(b);
      return;
    }
    Pad.used = true; Input.keyboard = Input.touch = false;
    if (this.ctlSwitch('pad')) return;
    for (const d of dirs) this.ctlMove(d);
    if (pressed.includes('south')) this.ctlConfirm();
    else if (pressed.includes('east') || pressed.includes('touchpad') || pressed.includes('options')) this.closeControls();
    else if (pressed.includes('west')) this.ctlClear();
  }
  controlsTap(h) {
    if (this.ctlListen) { this.ctlListen = null; Sound.play('select'); return; }
    if (!h) return;
    this.menu = h.i;
    if (h.slot != null) this.ctlSlot = h.slot;
    this.ctlConfirm();
  }

  drawControls(ctx) {
    if (this.ctlFrom === 'pause') this.drawWorld(ctx); else this.drawTitleScene(ctx);
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
    const dev = this.ctlDev, A = Controls.actions(dev), B = Controls.binds(dev), gap = 12, ps = Pad.isPS();
    const listH = (A.length + (dev === 'pad' ? 1 : 0)) * gap + 3 + 2 * gap;
    const h = 44 + listH + 20, x0 = 50, w = 300, y0 = Math.round((VIEW_H - h) / 2);
    this.drawPanel(ctx, x0, y0, w, h);
    drawText(ctx, 'CONTROLS', VIEW_W / 2, y0 + 7, '#ffffff', { align: 'center', scale: 2, shadow: INK });
    drawText(ctx, dev === 'pad' ? (ps ? 'PLAYSTATION CONTROLLER' : 'CONTROLLER') : 'KEYBOARD', VIEW_W / 2, y0 + 25, '#9fd8f0', { align: 'center', small: true });
    const cols = [236, 304], cw = 62, lx = x0 + 16;
    drawText(ctx, 'MAIN', cols[0], y0 + 35, '#8a83b0', { align: 'center', small: true });
    drawText(ctx, 'ALT', cols[1], y0 + 35, '#8a83b0', { align: 'center', small: true });
    let y = y0 + 44;
    if (dev === 'pad') {   // (moving isn't remappable on a controller)
      drawText(ctx, 'MOVE', lx, y, '#8a83b0', { shadow: INK });
      drawText(ctx, 'D-PAD / LEFT STICK', (cols[0] + cols[1]) / 2, y + 1, '#8a83b0', { align: 'center', small: true });
      y += gap;
    }
    A.forEach(([a, label], i) => {
      const on = i === this.menu;
      this.menuHits.push({ x: lx - 4, y: y - 3, w: cols[0] - cw / 2 - lx, h: gap, i, slot: 0 });
      drawText(ctx, label, lx, y, on ? '#ffd166' : '#b8b2d8', { shadow: INK });
      cols.forEach((cx, s) => {
        const sel = on && s === this.ctlSlot, listen = sel && this.ctlListen, code = B[a][s];
        this.menuHits.push({ x: cx - cw / 2, y: y - 3, w: cw, h: gap, i, slot: s });
        if (sel) {
          ctx.fillStyle = listen ? 'rgba(46,196,182,0.35)' : 'rgba(255,209,102,0.28)';
          ctx.fillRect(cx - cw / 2, y - 2, cw, 11);
        }
        const txt = listen ? (Math.floor(this.ctlT / 16) % 2 ? '' : '...') : Controls.name(dev, code);
        const small = textWidth(txt) > cw - 4;
        drawText(ctx, txt, cx, y + (small ? 1 : 0), listen ? '#ffd166' : code ? '#ffffff' : '#4a5a78', { align: 'center', small, shadow: small ? null : INK });
      });
      y += gap;
    });
    y += 3;
    ['RESET TO DEFAULTS', 'BACK'].forEach((s, k) => {
      const i = A.length + k, on = i === this.menu, tw = textWidth(s);
      this.menuHits.push({ x: VIEW_W / 2 - tw / 2 - 18, y: y - 3, w: tw + 36, h: gap, i });
      drawText(ctx, s, VIEW_W / 2, y, on ? '#ffd166' : '#b8b2d8', { align: 'center', shadow: INK });
      if (on) this.drawSelectionArrows(ctx, VIEW_W / 2 - tw / 2 - 12, VIEW_W / 2 + tw / 2 + 6, y, '#ffd166');
      y += gap;
    });
    // the line along the bottom: what the buttons do here, or what's being waited for
    const hint = this.ctlListen
      ? (dev === 'pad' ? 'PRESS A BUTTON  -  D-PAD: CANCEL' : 'PRESS A KEY  -  ESC: CANCEL')
      : dev === 'pad'
        ? (ps ? 'CROSS: CHANGE   SQUARE: CLEAR   CIRCLE: BACK' : 'A: CHANGE   X: CLEAR   B: BACK')
        : 'ENTER: CHANGE   DELETE: CLEAR   ESC: BACK';
    const msg = this.ctlMsg && !this.ctlListen;
    drawText(ctx, msg ? this.ctlMsg.text : hint, VIEW_W / 2, y0 + h - 12, msg ? '#ff8a8a' : '#9fd8f0', { align: 'center', small: true });
  }
}
mixin(Game, GameControls);
