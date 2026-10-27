'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 5. INPUT
// ═══════════════════════════════════════════════════════════════════════════
const KEYMAP = {
  // the keyboard: arrows to move (up jumps, down crouches / stomps), D run / grab / fire, W spin attack, C roll. Not WASD,
  // and never Z (awkward for the hands). Space and Enter confirm and skip text ('ok' / 'start')
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyK: 'jump',   // (and up)
  KeyD: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyJ: 'run',
  KeyW: 'spin', KeyV: 'spin', KeyI: 'spin',
  KeyC: 'roll', KeyL: 'roll',
  KeyB: 'reserve', PadReserve: 'reserve',
  Space: 'ok',
  KeyP: 'pause', Escape: 'pause', Enter: 'start', NumpadEnter: 'start', KeyF: 'fullscreen',
  // virtual codes pressed by the on-screen touch controls
  TouchLeft: 'left', TouchRight: 'right', TouchJump: 'jump', TouchRun: 'run',
  // virtual codes pressed by game controllers (see Pad)
  PadLeft: 'left', PadRight: 'right', PadUp: 'up', PadDown: 'down', PadJump: 'jump', PadRun: 'run',
  PadPause: 'pause', PadStart: 'start', PadBack: 'pause', PadRoll: 'roll', PadSpin: 'spin',
  PadDevWarp: 'devwarp',
  KeyQ: 'worldPrev', PageUp: 'worldPrev', KeyE: 'worldNext', PageDown: 'worldNext',
  PadWorldPrev: 'worldPrev', PadWorldNext: 'worldNext',
};
const Input = {
  held: Object.create(null), hits: new Set(), codes: new Set(),
  // playing on the keyboard (set by real key presses, cleared by a controller or the touch buttons): he runs on his own,
  // holding a run key and a jump key together on a keyboard being a known pain. Only the speed: grab and fire still need it held
  keyboard: false,
  autoRun() { return this.keyboard; },
  acts: Object.create(null),   // code -> the action it pressed
  down(a) { return (this.held[a] | 0) > 0; },
  hit(a) { return this.hits.has(a); },

  endStep() { this.hits.clear(); },
  reset() { this.held = Object.create(null); this.codes.clear(); this.hits.clear(); this.acts = Object.create(null); },
  press(code) {
    const a = KEYMAP[code];
    if (!a || this.codes.has(code)) return a;
    this.codes.add(code);
    this.acts[code] = a;
    this.held[a] = (this.held[a] | 0) + 1;
    this.hits.add(a);
    return a;
  },
  release(code) {
    if (!this.codes.has(code)) return;
    const a = this.acts[code];
    this.codes.delete(code);
    this.held[a] = Math.max(0, (this.held[a] | 0) - 1);
  },
};

// ---- game controllers (DualSense, DualShock, Xbox, ... via the Gamepad API) ----
// Polled once per frame and turned into the same virtual key codes the keyboard uses,
// so every screen works with a controller without special cases.
//   Cross = jump    Circle = roll    Triangle = spin jump    Square / L1 / R1 / L2 / R2 = run / fire
//   D-pad or left stick = move (and navigate menus, with auto-repeat)
//   Options = pause in game, confirm in menus    Create = reserve swap    Touchpad = back / pause
const PAD_DEAD_ON = 0.45, PAD_DEAD_OFF = 0.3;      // stick hysteresis: no flicker at the edge
const PAD_RUMBLE = {
  umbraUnravel:[380,.65,.35],umbraFracture:[65,.15,.35],umbraShatter:[520,.95,.8],umbraDust:[120,0,.15],
  hammerHit: [90, 0.7, 0.85],   // a firm, short impact that finishes before the next chained hit
  stomp: [70, 0.15, 0.45], break: [90, 0.35, 0.6], spring: [130, 0.25, 0.7], power: [160, 0, 0.35],
  shrink: [260, 0.6, 0.8], die: [420, 1, 1], burn: [420, 1, 1], zap: [220, 0.5, 0.9],
  roar: [650, 0.9, 0.5], pound: [220, 0.9, 0.6], thunder: [320, 1, 0.8], freeze: [60, 0, 0.35], volt: [80, 0.2, 0.6], shatter: [70, 0.2, 0.4], roll: [70, 0.1, 0.35], spin: [50, 0, 0.25], shot: [120, 0.3, 0.6], blast: [380, 1, 0.8], charged: [60, 0, 0.4], firework: [160, 0.6, 0.3], crumble: [80, 0.2, 0.35], kick: [45, 0, 0.3], thud: [70, 0.3, 0.35], stompland: [80, 0.35, 0.4], swGrab: [60, 0, 0.3], swFuse: [110, 0.3, 0.5], swSplit: [90, 0.4, 0.4], swThud: [50, 0.2, 0.2], podfire: [120, 0.4, 0.5], gulp: [60, 0.1, 0.3], drum: [90, 0.5, 0.4],
};
const Pad = {
  used: false,                 // last input came from a controller (switches on-screen button names)
  stick: { left: false, right: false, up: false, down: false },
  rep: { up: 0, down: 0 }, menuCode: null,
  // PlayStation pads get PlayStation button names; anything else (Razer Kishi, Xbox, 8BitDo...) gets Xbox-style names
  isPS() { const gp = this.list()[0]; return !gp || /054c|dualsense|dualshock|playstation|wireless controller/i.test(gp.id || ''); },
  rx: 0, ry: 0,   // right stick, dead zone removed (steers a held Superwing prop)
  warpSequence: { index: 0, at: 0, held: {} },
  resetWarpSequence() { this.warpSequence = { index: 0, at: 0, held: {} }; },
  checkWarpSequence(game, buttons, now) {
    const s = this.warpSequence, keys = ['r3'];
    const pressed = keys.filter(key => buttons[key] && !s.held[key]);
    s.held = Object.fromEntries(keys.map(key => [key, !!buttons[key]]));
    if (game.mode !== 'play' || !game.player || game.player.state !== 'play') { s.index = 0; return false; }
    if (s.index && now - s.at > 3000) s.index = 0;
    if (pressed.length !== 1) { if (pressed.length > 1) s.index = 0; return false; }
    const key = pressed[0];
    if (key === keys[0]) { s.at = now; s.index++; }
    else { s.index = key === keys[0] ? 1 : 0; if (s.index) s.at = now; }
    if (s.index < 4) return false;
    s.index = 0;
    return true;
  },
  list() {
    try {
      if (!navigator.getGamepads) return [];
      const raw = navigator.getGamepads();
      if (!raw) return [];
      const res = [];
      for (let i = 0; i < raw.length; i++) { const g = raw[i]; if (g && g.connected) res.push(g); }
      return res;
    } catch (e) { return []; }
  },
  read(gp) {
    const b = i => { const x = gp.buttons[i]; return !!x && (x.pressed || x.value > 0.5); };
    const ax = i => gp.axes[i] || 0;
    if (gp.mapping === 'standard') {
      return {
        jump: b(0), roll: b(1), spin: b(3), run: b(2) || b(4) || b(5) || b(6) || b(7), sq: b(2),
        l1: b(4), r1: b(5), l2: b(6), r2: b(7),
        menu: b(9), create: b(8), back: b(17), l3: b(10), r3: b(11),
        left: b(14), right: b(15), up: b(12), down: b(13), lx: ax(0), ly: ax(1), rx: ax(2), ry: ax(3),
      };
    }
    // Raw layout (e.g. Firefox on Linux): cross, circle, triangle, square, L1, R1, L2, R2, create,
    // options; the d-pad is a hat on axes 6/7.
    const hx = gp.axes.length > 7 ? ax(6) : 0, hy = gp.axes.length > 7 ? ax(7) : 0;
    return {
      jump: b(0), roll: b(1), spin: b(2), run: b(3) || b(4) || b(5) || b(6) || b(7), sq: b(3),
      l1: b(4), r1: b(5), l2: b(6), r2: b(7),
      menu: b(9), create: b(8), back: false, l3: b(11), r3: b(12),
      left: hx < -0.5, right: hx > 0.5, up: hy < -0.5, down: hy > 0.5, lx: ax(0), ly: ax(1), rx: ax(3), ry: ax(4),
    };
  },
  set(code, on) {
    if (on && !Input.codes.has(code)) { Input.press(code); this.used = true; Input.keyboard = false; Sound.unlock(); }
    else if (!on && Input.codes.has(code)) Input.release(code);
  },
  releaseAll() {
    for (const c of ['PadLeft', 'PadRight', 'PadUp', 'PadDown', 'PadJump', 'PadRun', 'PadRoll', 'PadSpin', 'PadPause', 'PadStart', 'PadBack', 'PadReserve',
      'PadDevWarp', 'PadWorldPrev', 'PadWorldNext']) this.set(c, false);
    this.rx = this.ry = 0;
    this.menuCode = null;
    this.titleInputHeld = false;
    this.resetWarpSequence();
  },
  poll(game) {
    const pads = this.list();
    if (!pads.length) { this.resetWarpSequence(); this.rx = this.ry = 0; this.titleInputHeld = false; if ([...Input.codes].some(c => c.startsWith('Pad'))) this.releaseAll(); return; }
    const w = { jump: false, roll: false, spin: false, run: false, sq: false, l1: false, r1: false, l2: false, r2: false, menu: false, create: false, back: false, l3: false, r3: false, left: false, right: false, up: false, down: false };
    let lx = 0, ly = 0, rx = 0, ry = 0;
    for (const gp of pads) {
      const r = this.read(gp);
      for (const k in w) w[k] = w[k] || r[k];
      if (Math.abs(r.lx) > Math.abs(lx)) lx = r.lx;
      if (Math.abs(r.ly) > Math.abs(ly)) ly = r.ly;
      if (Math.abs(r.rx) > Math.abs(rx)) rx = r.rx;
      if (Math.abs(r.ry) > Math.abs(ry)) ry = r.ry;
    }
    const dz = v => Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8;
    this.rx = dz(rx); this.ry = dz(ry);
    if (this.rx || this.ry) { this.used = true; Input.keyboard = false; }
    const titleInput = game.mode === 'title' && (Object.values(w).some(Boolean) || Math.abs(lx) > PAD_DEAD_ON || Math.abs(ly) > PAD_DEAD_ON || this.rx !== 0 || this.ry !== 0);
    if (titleInput && !this.titleInputHeld && game.goFullscreen) game.goFullscreen();
    this.titleInputHeld = titleInput;
    const st = this.stick;
    st.left = lx < -(st.left ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.right = lx > (st.right ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.up = ly < -(st.up ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.down = ly > (st.down ? PAD_DEAD_OFF : PAD_DEAD_ON);
    const now = performance.now();
    const warp = this.checkWarpSequence(game, { r3: w.r3 }, now);
    const inPlay = game.mode === 'play';
    // in play, up would jump - except while hanging from a vine, where up climbs (like down, the
    // stick has to point clearly up so a sloppy diagonal push still just pumps the swing)
    const onVine = inPlay && !!(game.player && game.player.vine);
    // ...and while carrying a shell, where up tosses it straight up; and on DJINNY's magic carpet (3-1),
    // where up steers it higher
    const carrying = inPlay && !!game.held;
    const onCarpet = inPlay && !!(game.player && typeof Carpet !== 'undefined' && game.player.platform instanceof Carpet);
    const onLadder = inPlay && !!(game.player && (game.player.ladder || game.nearLadder));   // (up climbs a ladder)
    const up = inPlay ? (onVine || carrying || onCarpet || onLadder) && (w.up || (ly < -0.6 && -ly > Math.abs(lx))) : w.up || st.up;
    const down = w.down || (inPlay ? ly > 0.6 && ly > Math.abs(lx) : st.down);
    this.set('PadLeft', w.left || st.left);
    this.set('PadRight', w.right || st.right);
    this.set('PadUp', up);
    this.set('PadDown', down);
    this.set('PadJump', w.jump);
    this.set('PadRun', w.run);
    this.set('PadWorldPrev', game.mode === 'select' && w.l1);
    this.set('PadWorldNext', game.mode === 'select' && w.r1);
    this.set('PadRoll', w.roll);
    this.set('PadSpin', w.spin);
    this.set('PadReserve', w.create && inPlay);
    this.set('PadBack', w.back);
    this.set('PadDevWarp', warp);
    // Options: pause during play, confirm everywhere else (decided when pressed)
    if (w.menu && !this.menuCode) { this.menuCode = inPlay || game.mode === 'pause' ? 'PadPause' : 'PadStart'; this.set(this.menuCode, true); }
    else if (!w.menu && this.menuCode) { this.set(this.menuCode, false); this.menuCode = null; }
    // menu auto-repeat when a direction is held
    for (const [d, on] of [['up', up && !inPlay], ['down', down && !inPlay]]) {
      if (!on) this.rep[d] = 0;
      else if (!this.rep[d]) this.rep[d] = now + 380;
      else if (now >= this.rep[d]) { Input.hits.add(d); this.rep[d] = now + 110; }
    }
  },
  rumble(name) {
    const fx = PAD_RUMBLE[name];
    if (!fx || !this.used) return;
    for (const gp of this.list()) {
      const a = gp.vibrationActuator;
      if (!a || !a.playEffect) continue;
      try {
        const r = a.playEffect(a.type || 'dual-rumble', { startDelay: 0, duration: fx[0], strongMagnitude: fx[1], weakMagnitude: fx[2] });
        if (r && r.catch) r.catch(() => {});
      } catch (e) { /* rumble unsupported */ }
    }
  },
};

