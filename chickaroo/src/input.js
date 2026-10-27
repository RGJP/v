'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 5. INPUT
// ═══════════════════════════════════════════════════════════════════════════
// the keyboard: arrows to move (up jumps, down crouches / stomps), D run / grab / fire, W spin attack, C roll. Not WASD,
// and never Z (awkward for the hands). Space and Enter confirm and skip text ('ok' / 'start'). The play keys are the
// player's to change (Controls, below, and the CONTROLS screen); these fixed ones always work the menus.
const FIXED_KEYS = {
  Space: 'ok', Enter: 'start', NumpadEnter: 'start', Escape: 'pause', KeyF: 'fullscreen',
  KeyQ: 'worldPrev', PageUp: 'worldPrev', KeyE: 'worldNext', PageDown: 'worldNext',
};
const KEYMAP = {
  // (the keyboard's entries are filled in by Controls.apply)
  PadReserve: 'reserve',
  // virtual codes pressed by the on-screen touch controls
  TouchLeft: 'left', TouchRight: 'right', TouchUp: 'up', TouchDown: 'down', TouchJump: 'jump', TouchRun: 'run',
  TouchSpin: 'spin', TouchRoll: 'roll',
  // virtual codes pressed by game controllers (see Pad)
  PadLeft: 'left', PadRight: 'right', PadUp: 'up', PadDown: 'down', PadJump: 'jump', PadRun: 'run',
  PadPause: 'pause', PadStart: 'start', PadBack: 'pause', PadRoll: 'roll', PadSpin: 'spin',
  PadDevWarp: 'devwarp',
  PadWorldPrev: 'worldPrev', PadWorldNext: 'worldNext',
};

// ---- remappable controls (the CONTROLS screen: game-controls.js) ----
// Every play action has two slots (main and alternate) per device, saved in the browser. Moving left / right on a
// controller stays on the d-pad and left stick.
const KEY_ACTIONS = [
  ['left', 'MOVE LEFT'], ['right', 'MOVE RIGHT'], ['up', 'UP / JUMP'], ['down', 'CROUCH / STOMP'], ['jump', 'JUMP'],
  ['run', 'GRAB / FIRE'], ['spin', 'SPIN ATTACK'], ['roll', 'ROLL'], ['reserve', 'SWAP ITEM'], ['pause', 'PAUSE'],
];
const PAD_ACTIONS = [
  ['jump', 'JUMP'], ['run', 'RUN / FIRE'], ['spin', 'SPIN JUMP'], ['roll', 'ROLL'], ['reserve', 'SWAP ITEM'], ['pause', 'PAUSE'],
];
const KEY_DEFAULTS = {
  left: ['ArrowLeft', null], right: ['ArrowRight', null], up: ['ArrowUp', null], down: ['ArrowDown', null], jump: ['KeyK', null],
  run: ['KeyD', 'ShiftLeft'], spin: ['KeyW', 'KeyI'], roll: ['KeyC', 'KeyL'], reserve: ['KeyB', null], pause: ['KeyP', null],
};
const PAD_DEFAULTS = {
  jump: ['south', null], run: ['west', 'r1'], spin: ['north', null], roll: ['east', null], reserve: ['create', null], pause: ['options', null],
};
// the controller buttons that can be bound (the d-pad moves; a PlayStation touchpad always goes back)
const PAD_BUTTONS = ['south', 'east', 'west', 'north', 'l1', 'r1', 'l2', 'r2', 'l3', 'r3', 'create', 'options'];
const PAD_NAMES = {
  ps: { south: 'CROSS', east: 'CIRCLE', west: 'SQUARE', north: 'TRIANGLE', l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', l3: 'L3', r3: 'R3', create: 'CREATE', options: 'OPTIONS' },
  xb: { south: 'A', east: 'B', west: 'X', north: 'Y', l1: 'LB', r1: 'RB', l2: 'LT', r2: 'RT', l3: 'LS', r3: 'RS', create: 'VIEW', options: 'MENU' },
};
// keys that can't be bound: Esc backs out of the screen, and the browser and system keep the rest
const KEY_UNBINDABLE = /^(Escape|Tab|Meta|OS|Control|Alt|ContextMenu|CapsLock|NumLock|ScrollLock|Pause|PrintScreen|F\d+$|Unidentified)/;
const KEY_NAMES = {
  ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', ShiftLeft: 'L SHIFT', ShiftRight: 'R SHIFT',
  NumpadEnter: 'NUM ENTER', Backquote: 'BACKQUOTE', BracketLeft: 'L BRACKET', BracketRight: 'R BRACKET', Semicolon: 'SEMICOLON',
  Quote: 'QUOTE', Backslash: 'BACKSLASH', IntlBackslash: 'BACKSLASH', Comma: 'COMMA', Period: 'PERIOD', Slash: 'SLASH',
  Minus: 'MINUS', Equal: 'EQUALS', Backspace: 'BACKSPACE', Delete: 'DELETE', Insert: 'INSERT', PageUp: 'PAGE UP', PageDown: 'PAGE DOWN',
  NumpadAdd: 'NUM +', NumpadSubtract: 'NUM -', NumpadMultiply: 'NUM *', NumpadDivide: 'NUM /', NumpadDecimal: 'NUM .',
};
const Controls = {
  keys: null, pad: null,
  actions(dev) { return dev === 'pad' ? PAD_ACTIONS : KEY_ACTIONS; },
  binds(dev) { return dev === 'pad' ? this.pad : this.keys; },
  load() {
    const read = (key, def, ok) => {
      let saved = null;
      try { saved = JSON.parse(safeStorage.get(key) || 'null'); } catch (e) { saved = null; }
      const out = {};
      for (const a in def) {
        const v = saved && Array.isArray(saved[a]) ? saved[a].slice(0, 2).map(c => (ok(c) ? c : null)) : null;
        out[a] = v && v.some(Boolean) ? [v[0] || null, v[1] || null] : def[a].slice();
      }
      return out;
    };
    this.keys = read('chickaroo-keys', KEY_DEFAULTS, c => typeof c === 'string' && !KEY_UNBINDABLE.test(c));
    this.pad = read('chickaroo-pad', PAD_DEFAULTS, c => PAD_BUTTONS.includes(c));
    this.apply();
  },
  save() {
    safeStorage.set('chickaroo-keys', JSON.stringify(this.keys));
    safeStorage.set('chickaroo-pad', JSON.stringify(this.pad));
    this.apply();
  },
  // the keyboard's half of KEYMAP: the fixed keys, then the player's (a bound key wins over a fixed one)
  apply() {
    for (const c of Object.keys(KEYMAP)) if (!/^(Pad|Touch)/.test(c)) delete KEYMAP[c];
    Object.assign(KEYMAP, FIXED_KEYS);
    for (const [a] of KEY_ACTIONS) for (const c of this.keys[a]) if (c) KEYMAP[c] = a;
  },
  // put code in an action's slot. Whatever had it before gets this slot's old one (a swap), so no action is left
  // with nothing; false if that would happen (the slot was empty and the other action had nothing else)
  assign(dev, action, slot, code) {
    const B = this.binds(dev), old = B[action][slot];
    if (old === code) return true;
    for (const [a] of this.actions(dev)) {
      const i = B[a].indexOf(code);
      if (i < 0) continue;
      if (a !== action && !old && !B[a][1 - i]) return false;
      B[a][i] = old;
    }
    B[action][slot] = code;
    this.tidy(B);
    this.save();
    return true;
  },
  // empty a slot, as long as the action keeps its other one
  clear(dev, action, slot) {
    const B = this.binds(dev);
    if (!B[action][slot] || !B[action][1 - slot]) return false;
    B[action][slot] = null;
    this.tidy(B);
    this.save();
    return true;
  },
  reset(dev) {
    const D = dev === 'pad' ? PAD_DEFAULTS : KEY_DEFAULTS, B = {};
    for (const a in D) B[a] = D[a].slice();
    if (dev === 'pad') this.pad = B; else this.keys = B;
    this.save();
  },
  // (the main slot is never left empty while the alternate has something)
  tidy(B) { for (const a in B) if (!B[a][0] && B[a][1]) B[a] = [B[a][1], null]; },
  keyName(c) {
    if (!c) return '-';
    if (KEY_NAMES[c]) return KEY_NAMES[c];
    return c.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'NUM ').replace(/([a-z])([A-Z0-9])/g, '$1 $2').toUpperCase();
  },
  padName(b) { return b ? PAD_NAMES[Pad.isPS() ? 'ps' : 'xb'][b] : '-'; },
  name(dev, c) { return dev === 'pad' ? this.padName(c) : this.keyName(c); },
  // the button for an action, for prompts and tips: its main slot, or both ('SQUARE / R1')
  label(dev, action, both = false) {
    const s = this.binds(dev)[action].filter(Boolean);
    return (both ? s : s.slice(0, 1)).map(c => this.name(dev, c)).join(' / ') || '-';
  },
  padDown(w, action) { return this.pad[action].some(b => b && w[b]); },
};
Controls.load();

const Input = {
  held: Object.create(null), hits: new Set(), codes: new Set(),
  // playing on the keyboard (set by real key presses, cleared by a controller or the touch buttons): he runs on his own,
  // holding a run key and a jump key together on a keyboard being a known pain. Only the speed: grab and fire still need it held
  keyboard: false,
  // on the touch buttons too (set by a touch, cleared by keys or a controller), unless switched off with the AUTO chip
  touch: false, touchAutoRun: safeStorage.get('chickaroo-autorun') !== '0',
  autoRun() { return this.keyboard || (this.touch && this.touchAutoRun); },
  acts: Object.create(null),   // code -> the action it pressed
  swallow: new Set(),          // keys pressed on the CONTROLS screen: ignored until they're let go
  down(a) { return (this.held[a] | 0) > 0; },
  hit(a) { return this.hits.has(a); },

  endStep() { this.hits.clear(); },
  reset() { this.held = Object.create(null); this.codes.clear(); this.hits.clear(); this.acts = Object.create(null); this.swallow.clear(); },
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
// so every screen works with a controller without special cases. The face buttons, shoulders, Create and Options
// do what Controls.pad says (by default: Cross = jump, Circle = roll, Triangle = spin jump, Square / R1 = run / fire,
// Create = reserve swap, Options = pause)
//   D-pad or left stick = move (and navigate menus, with auto-repeat)
//   the pause button pauses in game and confirms in menus    Touchpad = back / pause
// in play, up is a jump of its own -- except hanging from a vine (up climbs), carrying a shell (up tosses it straight
// up), on DJINNY's magic carpet (3-1, up steers it higher) and at a ladder (up climbs it)
function upSteers(game) {
  const p = game.player;
  return !!p && (!!p.vine || !!game.held || !!p.ladder || !!game.nearLadder || (typeof Carpet !== 'undefined' && p.platform instanceof Carpet));
}

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
  rep: { up: 0, down: 0, left: 0, right: 0 }, menuCode: null,
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
    // Chrome on Android lays every controller out in the standard order, even one it reports as unmapped (a Razer
    // Kishi in the phone's port, say): read as raw, its left and top face buttons came out swapped (run <-> spin)
    if (gp.mapping === 'standard' || /android/i.test(navigator.userAgent)) {
      return {
        south: b(0), east: b(1), west: b(2), north: b(3),
        l1: b(4), r1: b(5), l2: b(6), r2: b(7),
        options: b(9), create: b(8), touchpad: b(17), l3: b(10), r3: b(11),
        left: b(14), right: b(15), up: b(12), down: b(13), lx: ax(0), ly: ax(1), rx: ax(2), ry: ax(3),
      };
    }
    // Raw layout (e.g. Firefox on Linux, desktop): cross, circle, triangle, square, L1, R1, L2, R2, create,
    // options; the d-pad is a hat on axes 6/7.
    const hx = gp.axes.length > 7 ? ax(6) : 0, hy = gp.axes.length > 7 ? ax(7) : 0;
    return {
      south: b(0), east: b(1), north: b(2), west: b(3),
      l1: b(4), r1: b(5), l2: b(6), r2: b(7),
      options: b(9), create: b(8), touchpad: false, l3: b(11), r3: b(12),
      left: hx < -0.5, right: hx > 0.5, up: hy < -0.5, down: hy > 0.5, lx: ax(0), ly: ax(1), rx: ax(3), ry: ax(4),
    };
  },
  set(code, on) {
    if (on && !Input.codes.has(code)) { Input.press(code); this.used = true; Input.keyboard = Input.touch = false; Sound.unlock(); }
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
    const w = { south: false, east: false, west: false, north: false, l1: false, r1: false, l2: false, r2: false, options: false, create: false, touchpad: false, l3: false, r3: false, left: false, right: false, up: false, down: false };
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
    if (this.rx || this.ry) { this.used = true; Input.keyboard = Input.touch = false; }
    // buttons still held from the CONTROLS screen do nothing until they're let go
    for (const k of this.mute) if (w[k]) w[k] = false; else this.mute.delete(k);
    const titleInput = game.mode === 'title' && (Object.values(w).some(Boolean) || Math.abs(lx) > PAD_DEAD_ON || Math.abs(ly) > PAD_DEAD_ON || this.rx !== 0 || this.ry !== 0);
    if (titleInput && !this.titleInputHeld && game.goFullscreen) game.goFullscreen();
    this.titleInputHeld = titleInput;
    const st = this.stick;
    st.left = lx < -(st.left ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.right = lx > (st.right ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.up = ly < -(st.up ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.down = ly > (st.down ? PAD_DEAD_OFF : PAD_DEAD_ON);
    const now = performance.now();
    if (game.mode === 'controls') { this.pollControls(game, w, now); return; }
    this.prev = w;
    const warp = this.checkWarpSequence(game, { r3: w.r3 }, now);
    const inPlay = game.mode === 'play';
    // in play, up would jump - except where it climbs or steers (upSteers; like down, the stick has to point
    // clearly up so a sloppy diagonal push still just pumps a vine swing)
    const up = inPlay ? upSteers(game) && (w.up || (ly < -0.6 && -ly > Math.abs(lx))) : w.up || st.up;
    const down = w.down || (inPlay ? ly > 0.6 && ly > Math.abs(lx) : st.down);
    this.set('PadLeft', w.left || st.left);
    this.set('PadRight', w.right || st.right);
    this.set('PadUp', up);
    this.set('PadDown', down);
    const act = a => Controls.padDown(w, a);
    this.set('PadJump', act('jump'));
    this.set('PadRun', act('run'));
    this.set('PadWorldPrev', game.mode === 'select' && w.l1);
    this.set('PadWorldNext', game.mode === 'select' && w.r1);
    this.set('PadRoll', act('roll'));
    this.set('PadSpin', act('spin'));
    this.set('PadReserve', act('reserve') && inPlay);
    this.set('PadBack', w.touchpad);
    this.set('PadDevWarp', warp);
    // the pause button (Options): pause during play, confirm everywhere else (decided when pressed)
    const menu = act('pause');
    if (menu && !this.menuCode) { this.menuCode = inPlay || game.mode === 'pause' ? 'PadPause' : 'PadStart'; this.set(this.menuCode, true); }
    else if (!menu && this.menuCode) { this.set(this.menuCode, false); this.menuCode = null; }
    // menu auto-repeat when a direction is held
    for (const [d, on] of [['up', up && !inPlay], ['down', down && !inPlay]]) {
      if (!on) this.rep[d] = 0;
      else if (!this.rep[d]) this.rep[d] = now + 380;
      else if (now >= this.rep[d]) { Input.hits.add(d); this.rep[d] = now + 110; }
    }
  },
  prev: {}, mute: new Set(),
  // the CONTROLS screen reads the buttons themselves, not what they're bound to (so a muddled layout can always be
  // put right): it gets each newly pressed button and d-pad / stick direction (with menu auto-repeat)
  pollControls(game, w, now) {
    if ([...Input.codes].some(c => c.startsWith('Pad'))) this.releaseAll();
    const pressed = Object.keys(w).filter(k => w[k] && !this.prev[k] && !['left', 'right', 'up', 'down'].includes(k));
    const st = this.stick, dirs = [];
    for (const d of ['up', 'down', 'left', 'right']) {
      const on = w[d] || st[d], was = this.prev['dir' + d];
      if (!on) this.rep[d] = 0;
      else if (!was) { dirs.push(d); this.rep[d] = now + 380; }
      else if (this.rep[d] && now >= this.rep[d]) { dirs.push(d); this.rep[d] = now + 110; }
      w['dir' + d] = on;
    }
    this.prev = w;
    game.controlsPad(pressed, dirs);
  },
  // leaving the CONTROLS screen: whatever's held there stays quiet until it's let go
  muteHeld() { for (const k of PAD_BUTTONS.concat('touchpad')) if (this.prev[k]) this.mute.add(k); },
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


// ---- on-screen touch controls (wired up in boot.js) ----
// The stick's raw direction is kept here and turned into virtual key codes once per frame, so up can follow the same
// rule as a controller's (upSteers) as he grabs and lets go of vines and ladders without the thumb moving.
const Touch = {
  stick: { left: false, right: false, up: false, down: false },
  set(code, on) {
    if (on && !Input.codes.has(code)) { Input.press(code); Input.keyboard = false; Input.touch = true; Pad.used = false; }
    else if (!on && Input.codes.has(code)) Input.release(code);
  },
  poll(game) {
    const st = this.stick, inPlay = game.mode === 'play';
    this.set('TouchLeft', st.left);
    this.set('TouchRight', st.right);
    this.set('TouchUp', st.up && (!inPlay || upSteers(game)));
    this.set('TouchDown', st.down);
  },
  releaseAll() {
    this.stick = { left: false, right: false, up: false, down: false };
    for (const c of ['TouchLeft', 'TouchRight', 'TouchUp', 'TouchDown', 'TouchJump', 'TouchRun', 'TouchSpin', 'TouchRoll']) this.set(c, false);
  },
  toggleAutoRun() {
    Input.touchAutoRun = !Input.touchAutoRun;
    safeStorage.set('chickaroo-autorun', Input.touchAutoRun ? '1' : '0');
    return Input.touchAutoRun;
  },
};
