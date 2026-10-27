'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 10. BOOT & FIXED-TIMESTEP LOOP
// ═══════════════════════════════════════════════════════════════════════════
let game = null;
async function boot() {
  // Canvas glyphs are cached: load the bundled faces before any artwork or text is baked.
  if (!window.CHICKAROO_HEADLESS) await FONTS_READY;
  const canvas = document.getElementById('game');
  buildSprites();
  game = new Game(canvas);
  // Bake the 4-1 bedroom while the title screen is idle, so its first cutscene frame
  // doesn't pause to create the detailed room art.
  const warmFeverRoom = () => { if (!game.dreamArt) game.dreamArt = bakeDreamArt(); };
  if (window.requestIdleCallback) window.requestIdleCallback(warmFeverRoom, { timeout: 1500 });
  else setTimeout(warmFeverRoom, 500);

  const root = document.documentElement;
  let refit = null;
  const markTouch = () => {
    if (root.classList.contains('touch')) return;
    root.classList.add('touch'); game.touch = true;
    if (refit) refit();
  };
  if ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window) markTouch();

  // ---- responsive scaling: as big as fits, keeping the shape. (It used to snap to whole-number scales so the big 1x
  // pixels stayed even, which left wide bars round it; the screen is fine now, hires.js, so any scale looks right.)
  // Fullscreen and touch landscape go edge to edge: no margin, no frame, and when the screen's shape is within a few
  // percent of the game's (16:9 vs 400:224), it's stretched that last little bit rather than leave a sliver of bar.
  const fit = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const touch = root.classList.contains('touch'), portrait = vh > vw;
    const full = !!(document.fullscreenElement || document.webkitFullscreenElement) || (touch && !portrait);
    root.classList.toggle('portrait', touch && portrait);
    root.classList.toggle('edge', full);
    let aw = vw - 24, ah = vh - 24;
    if (touch && portrait) { aw = vw - 8; ah = Math.max(120, vh - 64 - 230); }
    else if (full) { aw = vw; ah = vh; }
    const f = Math.min(aw / VIEW_W, ah / VIEW_H);
    let w = VIEW_W * f, h = VIEW_H * f;
    if (full && aw / w < 1.04) w = aw;   // (a near fit: fill it)
    if (full && ah / h < 1.04) h = ah;
    canvas.style.width = (full ? w : Math.floor(w)) + 'px';
    canvas.style.height = (full ? h : Math.floor(h)) + 'px';
    // how sharp: the screen is drawn in whole steps of the art (1200, 2400 or 3600 px wide, SCREEN_K in hires.js) up
    // to what the display really shows, so art stays on whole pixels and text is drawn at full resolution; the
    // browser then smooths the last little bit of scaling (never stretching pixels unevenly)
    const dpr = window.devicePixelRatio || 1, shown = w * dpr;
    SCREEN_K = Math.max(1, Math.min(2, Math.ceil(shown / (VIEW_W * ART_R) - 0.1)));
    canvas.classList.toggle('smooth', VIEW_W * ART_R * SCREEN_K >= shown * 0.95);
  };
  refit = fit; game.refit = fit;
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 150));

  // ---- fullscreen
  const fsBtn = document.getElementById('fs'), toast = document.getElementById('toast');
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFs = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  let toastT = 0;
  const showToast = msg => {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 3200);
  };
  const toggleFullscreen = () => {
    Sound.unlock();
    try {
      if (fsElement()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (!canFs) { showToast('Fullscreen: use Share → Add to Home Screen'); return; }
      const req = (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
      const lock = () => { if (root.classList.contains('touch') && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); };
      if (req && req.then) req.then(lock).catch(() => showToast('Fullscreen was blocked by the browser')); else lock();
    } catch (e) { showToast('Fullscreen is not available here'); }
  };
  // Request directly during title input, while the browser's user activation is still available.
  // Loading a level also retries it (Game.enterLevel); unsupported requests are quietly ignored.
  let fsPending = false;
  game.goFullscreen = () => {
    if (fsElement() || !canFs || fsPending) return;
    fsPending = true;
    try {
      const req = (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
      if (req && req.then) req.then(() => { fsPending = false; }, () => { fsPending = false; });
      else fsPending = false;
    } catch (e) { fsPending = false; }
  };
  const onFsChange = () => { if (fsBtn) fsBtn.classList.toggle('on', !!fsElement()); setTimeout(fit, 60); };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  if (fsBtn) fsBtn.addEventListener('click', () => { toggleFullscreen(); fsBtn.blur(); });

  // Scroll the stage grid vertically with a mouse wheel or trackpad.
  let selectWheel = 0;
  canvas.addEventListener('wheel', e => {
    if (game.mode !== 'select') { selectWheel = 0; return; }
    e.preventDefault();
    selectWheel += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? VIEW_H : 1);
    if (Math.abs(selectWheel) < 40) return;
    const n = game.selectLevels().length, row = Math.floor(game.menu / 4);
    const nextRow = clamp(row + Math.sign(selectWheel), 0, Math.ceil(n / 4) - 1);
    if (nextRow !== row) { game.menu = Math.min(n - 1, nextRow * 4 + game.menu % 4); Sound.play('select'); }
    selectWheel = 0;
  }, { passive: false });

  // ---- keyboard
  window.addEventListener('keydown', e => {
    Sound.unlock();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (game && game.mode === 'devwarp' && !e.repeat && game.warpKey(e.code)) { e.preventDefault(); return; }
    const a = KEYMAP[e.code];
    if (!a) return;
    if (game.mode === 'title' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && a !== 'fullscreen' && e.code !== 'Escape') game.goFullscreen();
    Pad.used = false; Input.keyboard = true;   // (keyboard play: auto-run)
    e.preventDefault();
    if (Input.codes.has(e.code)) return;
    Input.press(e.code);
    if (a === 'fullscreen') toggleFullscreen();
  });
  window.addEventListener('keyup', e => {
    if (KEYMAP[e.code] && !e.ctrlKey && !e.metaKey && !e.altKey) e.preventDefault();
    Input.release(e.code);
  });
  const autoPause = () => {
    Input.reset();
    if (game.mode === 'play' && game.player && game.player.state === 'play') game.pause();
  };
  window.addEventListener('blur', autoPause);
  const padName = gp => (gp.id || '').split('(')[0].trim() || 'Controller';
  window.addEventListener('gamepadconnected', e => { Pad.used = true; showToast(padName(e.gamepad) + ' connected'); });
  window.addEventListener('gamepaddisconnected', e => {
    Pad.releaseAll();
    showToast(padName(e.gamepad) + ' disconnected');
    if (!Pad.list().length) { Pad.used = false; autoPause(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  let titlePointerPending = false;
  window.addEventListener('pointerdown', e => {
    Sound.unlock();
    if (game.mode !== 'title' || (fsBtn && fsBtn.contains(e.target))) return;
    // Mouse activation is available on press; touch and pen activation arrives on release.
    if (e.pointerType === 'touch' || e.pointerType === 'pen') titlePointerPending = true;
    else game.goFullscreen();
  });
  const finishTitlePointer = () => {
    Sound.unlock();
    if (titlePointerPending) { titlePointerPending = false; game.goFullscreen(); }
  };
  window.addEventListener('pointerup', finishTitlePointer);
  window.addEventListener('touchend', finishTitlePointer);
  window.addEventListener('pointercancel', () => { titlePointerPending = false; });
  const pauseBtn = document.getElementById('pause');
  if (pauseBtn) pauseBtn.addEventListener('click', () => { Sound.unlock(); Input.hits.add('pause'); pauseBtn.blur(); });

  // ---- tap / click the canvas to use menus
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') markTouch();
    const r = canvas.getBoundingClientRect();
    game.tap(((e.clientX - r.left) / r.width) * VIEW_W, ((e.clientY - r.top) / r.height) * VIEW_H);
  });

  // ---- multi-touch controls: a D-pad zone and an A/B zone (slide a thumb between A and B to press both)
  const setVirtual = (code, on) => {
    if (on && !Input.codes.has(code)) { Input.press(code); Input.keyboard = false; }
    else if (!on && Input.codes.has(code)) Input.release(code);
  };
  const zone = (el, classify, apply) => {
    if (!el) return;
    const ptrs = new Map();
    const update = () => apply([...ptrs.values()]);
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); markTouch(); Sound.unlock();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      ptrs.set(e.pointerId, classify(e)); update();
    });
    el.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) { ptrs.set(e.pointerId, classify(e)); update(); } });
    const end = e => { if (ptrs.delete(e.pointerId)) update(); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, end));
    el.addEventListener('contextmenu', e => e.preventDefault());
  };
  const dpad = document.getElementById('dpad');
  zone(dpad, e => {
    const r = dpad.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    return { l: dx < -0.12, r: dx > 0.12 };
  }, list => {
    const l = list.some(p => p.l), r = list.some(p => p.r);
    setVirtual('TouchLeft', l && !r); setVirtual('TouchRight', r && !l);
    dpad.classList.toggle('left', l && !r); dpad.classList.toggle('right', r && !l);
  });
  const btns = document.getElementById('btns'), bA = document.getElementById('bA'), bB = document.getElementById('bB');
  zone(btns, e => {
    const ra = bA.getBoundingClientRect(), rb = bB.getBoundingClientRect(), rad = ra.width / 2;
    const da = Math.hypot(e.clientX - (ra.left + rad), e.clientY - (ra.top + rad));
    const db = Math.hypot(e.clientX - (rb.left + rad), e.clientY - (rb.top + rad));
    let a = da < rad * 1.35, b = db < rad * 1.35;
    if (!a && !b) { if (da < db) a = true; else b = true; }
    return { a, b };
  }, list => {
    const a = list.some(p => p.a), b = list.some(p => p.b);
    setVirtual('TouchJump', a); setVirtual('TouchRun', b);
    bA.classList.toggle('on', a); bB.classList.toggle('on', b);
  });
  document.addEventListener('gesturestart', e => e.preventDefault());

  let acc = 0, last = performance.now(), renderSlow = 0;
  function frame(now) {
    let dt = Math.min(250, now - last);
    last = now;
    // Keep display resolution stable. Transient slow frames must not permanently blur the art.
    // vsync snap: a display frame within a millisecond of a whole number of game steps counts as exactly that many.
    // A 60 Hz display's timestamps wobble either side of 16.67 ms; unsnapped, that now and then runs no update in one
    // frame and two in the next (a visible hitch); snapped, it's exactly one update per frame, every frame
    for (let n = 1; n <= 4; n++) if (Math.abs(dt - n * STEP_MS) < 1) { dt = n * STEP_MS; break; }
    acc += dt;
    let steps = 0;
    try {
      Pad.poll(game);
      while (acc >= STEP_MS && steps < 5) {
        game.update();
        Input.endStep();
        acc -= STEP_MS;
        steps++;
      }
      if (steps === 5) acc = 0;
      const t0 = performance.now();
      game.render();
      const rDur = performance.now() - t0;
      if (rDur > 14 && SCREEN_K > 1) {
        if (++renderSlow > 30) { SCREEN_K = Math.max(1, SCREEN_K - 1); renderSlow = 0; }
      } else if (renderSlow > 0) {
        renderSlow--;
      }
      if (root.classList.contains('loading') && game.fade === 0) {
        root.classList.remove('loading');
        const loader = document.getElementById('loading');
        if (loader) loader.remove();
      }
      Music.update();
    } catch (err) {
      acc = 0;
      console.error('CHICKAROO frame error:', err);   // keep the loop alive no matter what
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Debug / test hook (harmless in normal play)
if (window.CHICKAROO_HEADLESS) window.CHICKAROO = { SPR, LEVELS, sunOut, Input, Pad, Sound, Music, get game() { return game; }, boot, Level, T, TILE };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
