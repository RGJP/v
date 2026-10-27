'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 9. GAME
// ═══════════════════════════════════════════════════════════════════════════
// Where an entity's art starts, so it spawns before any of it scrolls into view: usually its own
// column, but the clapping gloves reach far left of theirs (open hand + its cloud), and a clock face
// is centred on its column.
function spawnLeft(e) {
  if (e[0] === 'clap') return (e[1] - (e[3] || 4)) * TILE - GLOVE_W - 40;
  if (e[0] === 'clockface') return (e[1] - e[3]) * TILE - 16;
  if (e[0] === 'sigil') return e[1] * TILE - SIG_HALF - 16;
  if (e[0] === 'hush') return (e[2] - 12) * TILE;   // (MAMA HUSH keeps watch over her whole stretch of swamp)
  if (e[0] === 'cloacolith') return (e[1] - 20) * TILE;
  if (e[0] === 'bloom') return (e[1] - e[2] - 2) * TILE;   // (a giant sunflower bows a long way)
  return e[1] * TILE;
}
// Where it ends: entities that span a stretch of the stage (the sealed sigil and its door, the mirror floor, the
// shadow keeper) still spawn when Chickaroo starts (at a checkpoint) part way along them.
function spawnRight(e) {
  if (e[0] === 'clockfinale') return e[2] * TILE;
  if (e[0] === 'reflection' || e[0] === 'keeper' || e[0] === 'papillae' || e[0] === 'gullet' || e[0] === 'vault' || e[0] === 'heap') return e[2] * TILE;
  if (e[0] === 'sigil') return (e[3] + 2) * TILE;
  if (e[0] === 'hush') return e[3] * TILE;
  if (e[0] === 'staff') return (e[1] + e[2]) * TILE;
  if (e[0] === 'fuzz' || e[0] === 'acid') return e[2] * TILE;
  if (e[0] === 'simmer' || e[0] === 'board' || e[0] === 'surge' || e[0] === 'stockpot') return (e[2] + 1) * TILE;   // (4-1's stretches of pot)
  if (e[0] === 'ladle') return (e[3] + 1) * TILE;
  if (e[0] === 'stink') return e[3] * TILE;
  if (e[0] === 'crowd') return e[2] * TILE;
  if (e[0] === 'bandstand') return (e[1] + 9) * TILE;
  if (e[0] === 'bloom') return (e[1] + e[2] + 2) * TILE;
  return spawnLeft(e);
}
// A dev warp spawn: this many frames (5 s) of invincibility, so landing in spikes or on enemies can't kill him
const DEV_GOD = 300;
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.mode = 'title';
    this.t = 0; this.menu = 0;
    this.top = parseInt(safeStorage.get('boyo-top') || safeStorage.get('omira-top') || '0', 10) || 0;
    this.shield = false; this.lives = 3; this.score = 0; this.coins = 0; this.power = 0; this.suit = null; this.reservePower = null; this.levelIndex = 0;
    this.fade = 1; this.fadeTarget = 0; this.fadeCb = null;
    this.ambient = []; this.particles = [];
    this.titleCam = 0; this.shake = 0;
    this.player = null; this.level = null;
    this.menuHits = []; this.touch = false;
    this.reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.save = this.loadSave(); this.practice = false;
    Music.play('title');
  }

  // ---------- flow ----------------------------------------------------------
  transition(cb) {
    if (this.fadeCb) return;
    this.fadeTarget = 1; this.fadeCb = cb;
  }
  updateFade() {
    if (this.fadeTarget === 1) {
      this.fade = Math.min(1, this.fade + 0.07);
      if (this.fade >= 1) { const cb = this.fadeCb; this.fadeCb = null; this.fadeTarget = 0; if (cb) cb(); }
    } else this.fade = Math.max(0, this.fade - 0.07);
  }
  saveTop() {
    if (this.score > this.top) { this.top = this.score; safeStorage.set('boyo-top', String(this.top)); }
  }
  // ---------- saved progress (localStorage) ---------------------------------
  // The run is saved at the start of every level and when a life is lost, so closing the tab or
  // rebooting resumes on the level you were playing (including one picked from LEVEL SELECT).
  loadSave() {
    try {
      const o = JSON.parse(safeStorage.get(SAVE_KEY) || 'null');
      if (!o || !Number.isInteger(o.level) || o.level < 0 || o.level >= LEVELS.length) return null;
      const power = clamp(o.power | 0, 0, 2);
      // Saves from before the campaign reorder used positions 10, 11 and 12 for bayou, gut and gumbo.
      const level = o.campaignOrder === 2 ? o.level : ({ 10: 12, 11: 10, 12: 11 }[o.level] ?? o.level);
      return {
        level, lives: clamp(o.lives | 0, 1, 99), score: Math.max(0, o.score | 0), coins: clamp(o.coins | 0, 0, 99), power,
        suit: power === 2 ? (SUIT_INFO[o.suit] ? o.suit : 'fire') : null,
        reservePower: Object.hasOwn(SUIT_OF, o.reservePower) ? o.reservePower : null,
      };
    } catch (e) { return null; }
  }
  writeSave(o) { safeStorage.set(SAVE_KEY, JSON.stringify(o)); this.save = this.loadSave(); }
  clearSave() { safeStorage.set(SAVE_KEY, 'null'); this.save = null; }
  persist() {
    this.writeSave({ campaignOrder: 2, level: this.levelIndex, lives: this.lives, score: this.score, coins: this.coins, power: this.power, suit: this.suit, reservePower: this.reservePower });
  }
  newGame(practice = false) {
    this.shield = false; this.lives = 3; this.score = 0; this.coins = 0; this.power = 0; this.suit = null; this.reservePower = null; this.levelIndex = 0;
    this.practice = practice;
    if (!practice) this.clearSave();
    this.enterLevel();
  }
  // CONTINUE: back to the last stage played, with the lives, score and powers it was saved with
  continueGame() {
    const s = this.save;
    if (!s) { this.newGame(); return; }
    Object.assign(this, { lives: s.lives, score: s.score, coins: s.coins, power: s.power, suit: s.suit, reservePower: s.reservePower, levelIndex: s.level, practice: false });
    this.enterLevel();
  }
  enterLevel() {
    if (this.goFullscreen) this.goFullscreen();   // (boot.js: fullscreen whenever a level loads)
    this.smellSaid = false;
    this.cloacaSaid = false;
    this.tapeSaid = 0;                               // 3-4's tapeworm quips
    this.gotLine = false;                            // 3-4's first spoken line (see updateGutSeals)
    this.pollenLevel = null;
    this.levelFrames = 0;                            // time in this level (a fresh visit or restart zeroes it; deaths don't)
    this.statuesLevel = null;
    this.bonesLevel = null;                          // fish skeletons stay broken until a fresh level visit
    this.lettersLevel = null;
    this.catLevel = null;
    if (LEVELS[this.levelIndex].freshStart) { this.power = 0; this.suit = null; this.reservePower = null; this.shield = false; }   // (3-4: swallowed with nothing but his feathers)
    this.snapshot = { score: this.score, coins: this.coins, power: this.power, suit: this.suit, reservePower: this.reservePower, shield: this.shield, lives: this.lives };
    this.useCheckpoint = false;
    this.warpAt = null;                              // developer warp respawn spot: a fresh visit forgets it
    this.freedLevel = null;
    this.respawns = 0;                               // 3-4: deaths this visit (the little dog laughs at each)
    this.wishLevel = null;                           // DJINNY's wishes (3-1) are granted afresh on a fresh visit
    this.potsLevel = null;                           // the temple pots (3-1) are whole again on a fresh visit
    this.signsLevel = null;                          // area signs show again on a fresh visit
    this.seenCine = new Set();                       // one-time cutscenes (the statue dominoes) play once per visit
    this.clockTold = false;                          // broken-clock explanation: once per visit, including checkpoint respawns
    this.stoneTold = false;                          // the loose-stone tip shows once per visit
    this.batWarned = false;                          // the sleeping-bats warning shows again on a fresh visit                          // a fresh visit: every prisoner is caged again
    Music.memo = null;
    if (!LEVELS[this.levelIndex].dev) this.persist();
    this.toIntro();
  }
  titleItems() {
    return [
      this.save ? { label: 'CONTINUE - ' + LEVELS[this.save.level].name, act: 'continue' } : { label: 'PLAY', act: 'play' },
      { label: 'LEVEL SELECT', act: 'select' },
    ].concat(this.canRemap() ? [{ label: 'CONTROLS', act: 'controls' }] : []);
  }
  titleSelectIdx() { return 1; }
  toIntro() { if (LEVELS[this.levelIndex].placeholder) { this.startLevel(); return; } this.mode = 'intro'; this.introT = 0; Music.stop(); }
  toTitle() { Sound.stopSamples(); Sound.resumeAll(); Music.memo = null; this.saveTop(); this.mode = 'title'; this.menu = 0; this.titleConfirm = false; this.particles = []; Music.shuffle('title'); Music.play('title'); }
  toGameOver() {
    this.saveTop();
    this.writeSave({ campaignOrder: 2, level: this.levelIndex, lives: 3, score: 0, coins: 0, power: 0, suit: null });   // 'continue' restarts the level on 3 lives
    this.mode = 'gameover'; this.menu = 0; Music.play('gameover');
  }
  pause() { this.mode = 'pause'; this.menu = 0; this.pauseConfirm = null; Music.pause(); Sound.pauseAll(); }
  resume() { this.mode = 'play'; Sound.resumeAll(); if (!(this.timeStop > 0) && !(this.gut && (this.gut.exit || this.gut.outro)) && !(this.gumbo && (this.gumbo.intro || this.gumbo.outro))) Music.resume(this.musicNow(), this.bossMusic ? 1.18 : 1); }
  // what should be playing: the stage's track, or its boss track once the fight's on
  musicNow() { const t = this.level && this.level.def.bossMusic; return this.bossMusic && t ? t : this.levelMusic; }
  // a boss fight starts: its own track takes over from the stage's (or, without one, the stage's track speeds up)
  startBossMusic() {
    this.bossMusic = true;
    const t = this.level.def.bossMusic;
    if (t && MUSIC_FILES[t]) { Music.shuffle(t); Music.play(t); }
    else Music.play(this.levelMusic, 1.18);
  }   // (stopped time keeps the music stopped too)

  startLevel() {
    Sound.stopSamples(); Sound.resumeAll();
    const def = LEVELS[this.levelIndex];
    if (def.placeholder) {
      Music.stop(); BandAudio.stop();
      this.level = this.player = this.boss = this.cat = this.band = this.gut = this.gumbo = null;
      this.entities = []; this.platforms = []; this.spawnQueue = []; this.items = []; this.fireballs = []; this.particles = []; this.ambient = [];
      this.dialog = null; this.dialogQ = []; this.timeStop = 0; this.timeFx = null;
      this.mode = 'placeholder'; this.placeholderT = 0;
      return;
    }
    if (this.statuesLevel !== def.id) { this.fallenStatues = new Set(); this.statuesLevel = def.id; }
    // freed prisoners stay freed through deaths and respawns in this level (no farming the bonus)
    if (this.freedLevel !== def.id) { this.freed = new Set(); this.freedLevel = def.id; }
    if (this.sigilLevel !== def.id) { this.sigils = new Map(); this.sigilLevel = def.id; }
    if (this.lettersLevel !== def.id) { this.lettersGot = new Set(); this.lettersLevel = def.id; }   // C K R letters: likewise
    if (this.signsLevel !== def.id) { this.signsSeen = new Set(); this.signsLevel = def.id; }       // area signs: shown once, not on every respawn
    // Keep every pollen source's state through deaths, including partly emptied multi crates.
    const keepPollen = this.pollenLevel === def.id && this.level?.def.id === def.id;
    const pollenState = keepPollen ? this.level.pollenCells.map(i => [i, this.level.tiles[i], this.level.multi.get(i)]) : [];
    if (!keepPollen) this.levelPollen = 0;
    this.pollenLevel = def.id;
    this.fireworksT = 0;
    const lv = this.level = new Level(def);
    for (const [i, tile, remaining] of pollenState) {
      lv.tiles[i] = tile;
      if (remaining !== undefined) lv.multi.set(i, remaining);
    }
    // shield crates: about one crate in five, shuffled every time the stage starts (at least one if there are any)
    const crates = [];
    for (let i = 0; i < lv.tiles.length; i++) if (lv.tiles[i] === T.BRICK) crates.push(i % lv.w + Math.floor(i / lv.w) * lv.w);
    this.shieldCrates = new Set();
    for (let n = crates.length ? Math.max(1, Math.round(crates.length / 5)) : 0; n > 0 && crates.length; n--) this.shieldCrates.add(crates.splice(Math.floor(Math.random() * crates.length), 1)[0]);
    this.levelMusic = def.music;
    this.entities = []; this.items = []; this.fireballs = []; this.particles = [];
    this.boss = null; this.arenaCam = null; this.arenaMax = null; this.camGlide = false; this.camV = 0; this.camPx = null; this.held = null;
    this.windT = 0; this.windForce = 0; this.windPhase = 'calm'; this.windDir = 1; this.windLock = 0; this.windMul = 1; this.snowTold = false; this.bossMusic = false;
    this.cinema = 0; this.dayCam = 0; this.bloomRide = null; this.ride = null; this.wormImpact = null; this.lampReveal = null; this.pauseConfirm = null; this.statuesDown = this.fallenStatues.size; this.dialog = null; this.dialogQ = []; this.talking = false;
    this.trail = null; this.trailBase = 0; this.eclipse = 0; this.deep = 0; this.warp = null; this.banner = null;
    this.clockPhase = 0; this.clockT = 0; this.clockWarn = 0; this.clockJump = false; this.handT = this.t; this.clockMsgT = 0;
    setClockPhase(0);
    this.timeStop = 0; this.timeFx = null;
    this.camelCoin = false;   // 3-1: the gold coin for HUMPHREY's fare, carried from its block to the camel
    this.placeCat();   // the orange cat companion, about 60% of the way along (game-cat.js)
    // monsoon jungle: the weather cycle and its rivers (set up before the lily pads that float on them)
    this.monsoon = def.monsoon ? { t: -(def.monsoon.delay || 0), phase: 'dry', flood: 0, cloud: 0, rain: 0, bolt: 0, boltX: 200, told: false } : null;
    this.rivers = (def.rivers || []).map(([x0, x1, lo, hi]) => ({ a: x0 * TILE, b: (x1 + 1) * TILE, lo: lo * TILE, hi: hi * TILE, y: lo * TILE }));
    const platLike = e => e[0] === 'platform' || e[0] === 'lanternmoth' || e[0] === 'sandspout' || e[0] === 'lilypad' || e[0] === 'logator' || e[0] === 'snowball' || e[0] === 'whale' || e[0] === 'mallow' || e[0] === 'train' || e[0] === 'camel'
      || e[0] === 'drum' || e[0] === 'valve' || e[0] === 'rest' || e[0] === 'gator' || e[0] === 'flotsam' || e[0] === 'flipflop' || e[0] === 'slide' || e[0] === 'tapeworm' || e[0] === 'tide' || e[0] === 'raft' || e[0] === 'dome' || e[0] === 'ferris' || e[0] === 'qghost' || e[0] === 'pup' || e[0] === 'drawer';
    this.platforms = def.entities.filter(platLike).map(e => e[0] === 'sandspout' ? new SandSpout(e[1], e[2], e[3], e[4], e[5])
      : e[0] === 'lanternmoth' ? new LanternMoth(e[1], e[2], e[3], e[4], e[5], e[6])
      : e[0] === 'lilypad' ? new LilyPad(lv, e[1], e[2])
      : e[0] === 'snowball' ? new Snowball(e[1], e[2] == null ? 11 : e[2], e[3] === 'fling')
      : e[0] === 'whale' ? new SkyWhale(e[1], e[2], e[3])
      : e[0] === 'logator' ? new Logator(e[1], e[2], e[3], e[4])
      : e[0] === 'mallow' ? new Mallow(e[1], e[2], e[3])
      : e[0] === 'train' ? new ToyTrain(e[1], e[2], e[3], e[4])
      : e[0] === 'camel' ? new Camel(e[1], e[2])
      : e[0] === 'drum' ? new Drumhead(e[1], e[2], e[3], e[4])
      : e[0] === 'valve' ? new Valve(e[1], e[2])
      : e[0] === 'rest' ? new RestBlock(e[1], e[2])
      : e[0] === 'gator' ? new Snapjaw(e[1], e[2])
      : e[0] === 'flotsam' ? new Flotsam(e[1], e[2], e[3])
      : e[0] === 'flipflop' ? new FlipFlop(e[1], e[2])
      : e[0] === 'slide' ? new Slide(e[1], e[2], e[3], e[4])
      : e[0] === 'tapeworm' ? new Tapeworm(e[1], e[2], e[3])
      : e[0] === 'tide' ? new Tide(e[1], e[2], e[3], e[4])
      : e[0] === 'raft' ? new CornRaft(e[1], e[2], e[3], e[4], e[5], e[6])
      : e[0] === 'dome' ? new RouxDome(e[1], e[2], e[3])
      : e[0] === 'ferris' ? new FerrisWheel(e[1], e[2], e[3], e[4], e[5])
      : new Platform(e[1], e[2], e[3], e[4], e[5], e[6], e[7]));
    this.platforms = this.platforms.flatMap(pl => [pl].concat(pl.extra || []));   // (SNAPJAW's head is a second platform)
    this.spawnQueue = def.entities.filter(e => !platLike(e)).map(e => ({ def: e, x: spawnLeft(e), r: spawnRight(e) })).sort((a, b) => a.x - b.x);
    // Restore bridges before placing the player, including statues behind the checkpoint camera.
    this.spawnQueue = this.spawnQueue.filter(s => {
      if (s.def[0] !== 'statue' || !this.fallenStatues.has((s.def[1] + 2) * TILE)) return true;
      const statue = this.makeEntity(s.def);
      statue.land(this, true);
      this.entities.push(statue);
      return false;
    });
    const cps = checkpoints(def);
    let n = Math.min(this.useCheckpoint || 0, cps.length);   // how many were passed
    let col = n ? cps[n - 1] : def.start, row = n && def.cpRows ? def.cpRows[n - 1] : null;
    this.devGod = 0;
    const warp = this.warpAt && this.warpAt.level === def.id ? this.warpAt.col : null;   // developer warp, unless a later checkpoint was passed
    this.devWarped = warp != null && warp >= col;   // (a warp skips the stage's opening cutscene: gut.js, game-gumbo.js)
    if (this.devWarped) { this.devGod = DEV_GOD; [col, row] = this.safeSpot(lv, warp); n = cps.filter(c => c <= col).length; }
    this.levelStartT = this.t;
    const p = this.player = {
      x: col * TILE + 2, y: 0, w: PLAYER_W, h: this.power ? BIG_H : SMALL_H, vx: 0, vy: 0,
      power: this.power, suit: this.power === 2 ? (this.suit || 'fire') : null, facing: 1, onGround: false, coyote: 0, jumpBuf: 0, jumping: false, airMax: WALK_MAX,
      invuln: this.devGod > 0 ? this.devGod : 0, anim: 0, sx: 1, sy: 1, state: 'play', platform: null, skid: false, combo: 0,
      prevY: 0, fallV: 0, hidden: false, deadT: 0, celebT: 0, springAir: false, stroke: 0, crouch: false, charge: 0, spin: false, spinQueued: false, holdGrace: 0, pressT: -99, stompT: -99, stompY: 0, stompSmall: false,
      roll: 0, rollDir: 1, rollSpeed: 0, rollCool: 0, rollSpin: 0, sand: 0,
      flaps: 0, flapT: 0, gustCool: 0, cool: 0, voltWindup: 0, voltHits: this.power === 2 && this.suit === 'volt' ? VOLT_HITS : 0, gliding: false, pounding: false, poundT: 0, wand: 0, hammerT: 0,
      vine: null, vineR: 0, vineCool: 0, inPod: null, blast: 0,
    };
    p.y = (row == null ? lv.surfaceRow(col) : row) * TILE - p.h;
    p.prevY = p.y;
    this.checkpointReached = n;
    this.tip = null;
    this.freezeT = 0; this.freezeFrom = 0; this.tally = false; this.tallyT = 0;
    this.shake = 0; this.look = 0;
    this.updateCamera(true);
    this.spawnQueue = this.spawnQueue.filter(s => s.r >= this.camX - 32);
    this.initBand();   // 3-3: the live band (game-bayou.js)
    this.initGut();    // 3-4: the descent (gut.js)
    this.initGumbo();  // 4-1: the gumbo fever dream (game-gumbo.js)
    // back at a checkpoint after a death: hold still until jump, so nothing ambushes him mid-fade
    this.mode = n && this.useCheckpoint ? 'ready' : 'play'; this.readyT = 0;
    if (this.mode === 'ready') { this.spawnEntities(); this.clearSpawnZone(); }   // (so whatever's waiting nearby is on show while he gets ready, but never right on top of him)
    const memo = Music.memo; Music.memo = null;
    const carryMusic = memo && memo.level === def.id && memo.name === def.music;
    const music = { name: carryMusic ? def.music : this.levelMusic, at: carryMusic ? memo.pos : 0 };
    if (carryMusic) Music.picked[def.music] = memo.idx;   // respawn: same track, same spot
    else Music.shuffle(this.levelMusic);
    this.readyMusic = this.mode === 'ready' ? music : null;
    if (this.readyMusic) Music.stop();   // checkpoint confirmation waits in silence; queue the track only when play resumes
    else Music.play(music.name, 1, music.at);
  }
  finishLevel() {
    this.power = this.player.power; this.suit = this.player.suit;
    this.saveTop();
    this.mode = 'clear'; this.clearT = 0;
  }
  afterDeath() {
    this.lives--; this.respawns++;
    this.power = 0; this.suit = null;
    if (this.lives > 0 && !LEVELS[this.levelIndex].dev) this.persist();
    if (this.lives <= 0) this.toGameOver();
    else { this.useCheckpoint = this.checkpointReached; this.toIntro(); }
  }

}
