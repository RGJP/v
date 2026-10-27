'use strict';
// Who's talking: the name shown on the dialogue box (an entity can also set its own `speakerName`)
const SPEAKER_NAMES = {
  Boss: 'MAGMAW', Magmini: 'MAGMAW', Portrait: 'MAGMAW', Chef: 'THE CHEF', Gobbler: 'THE GOBBLER',
  Prisoner: 'PINGROO', Umbraroo: 'EVIL UMBRAROO', Cuckoo: 'KOOKOO', Jack: 'JACK', Alarm: 'ALARM CLOCK', Snorer: 'SLEEPING GIANT', Brolly: 'PARASOL PETE', Sulkcloud: 'SULKY CLOUD', Sproutpot: 'SPROUTPOT', Sheep: 'SHEEP', Bloom: 'CHLORO-PHIL', HighStriker: 'BARNABY', StormCloud: 'STORMY',
};
const speakerName = e => e.speakerName || SPEAKER_NAMES[e.constructor.name] || '???';
const CHICK_VOICE = { speakerName: 'CHICKAROO', remove: true };
const CHICK_SHOCK = { speakerName: 'CHICKAROO', remove: true, shock: true };   // the same, with eyes wide while it's on screen   // Chickaroo thinking aloud (no marker over anyone)
const CHICK_SHOCK_UP = { speakerName: 'CHICKAROO', remove: true, shock: 'shockUp', shockUp: true };
const DIALOG_CPS = 1.5;   // letters typed per frame
const CAM_GLIDE = 8, CAM_EASE = 0.25;   // a camera pan's top speed (px a frame) and how gently it speeds up / slows down: see glideCam
const DIALOG_RANGE = 20 * TILE;   // run this far from where a line was said and it's dropped (no pile-up for speedrunners)
// Part of class Game (see game.js): GameEntities
class GameEntities {
  // ---------- entities -------------------------------------------------------
  spawnEntities() {
    const right = this.camX + VIEW_W + 32;
    while (this.spawnQueue.length && this.spawnQueue[0].x <= right) {
      const s = this.spawnQueue.shift();
      if (s.r < this.camX - 64) continue;
      const e = this.makeEntity(s.def);
      if (e) {
        this.entities.push(e);
        // A long frozen crossing can scroll a new cog column or flock into view. Seed its
        // already-frozen footholds once; the ordinary update stays frozen until time resumes.
        if (this.timeStop > 0 && (e instanceof Gearfall || e instanceof Tinbirds)) e.update(this);
      }
    }
  }
  // Respawning at a checkpoint must never drop him into a face full of foes: anything hostile and mobile
  // that's standing in the few tiles around him is moved away to the nearest open ground on the side it
  // came from (or, with nowhere to go, simply goes). Fixed things (spikes, plants, turrets) are left alone.
  clearSpawnZone() {
    const p = this.player, lv = this.level, px = p.x + p.w / 2, py = p.y + p.h / 2, X = 6 * TILE, Y = 4 * TILE;
    for (const e of this.entities) {
      if (e.dead || e.remove || e.passive || e.friendly || e.bossHazard || e === this.boss || !e.hitbox) continue;
      if (e instanceof Spring || e instanceof Firebar || !(e.walker || (e.vx && Math.abs(e.vx) > 0.01))) continue;
      const hb = e.hitbox();
      if (!hb || Math.abs(hb.x + hb.w / 2 - px) > X || Math.abs(hb.y + hb.h / 2 - py) > Y) continue;
      const side = hb.x + hb.w / 2 >= px ? 1 : -1, r0 = Math.floor(e.y / TILE), r1 = Math.floor((e.y + e.h - 1) / TILE);
      let moved = false;
      for (let k = 8; k <= 22 && !moved; k++) {
        const c = Math.floor(px / TILE) + side * k, nx = c * TILE + (TILE - e.w) / 2;
        if (c < 1 || c >= lv.w - 1) break;
        let clear = true;
        for (let r = r0; r <= r1 && clear; r++) if (lv.solid(c, r) || lv.solid(Math.floor((nx + e.w) / TILE), r)) clear = false;
        const floor = lv.solid(c, r1 + 1) || lv.get(c, r1 + 1) === T.SEMI;
        if (clear && (floor || !e.walker)) { e.x = nx; moved = true; }
      }
      if (!moved) e.remove = true;
    }
  }
  makeEntity(d) {
    const row = d[2] == null ? 11 : d[2];
    switch (d[0]) {
      case 'clockfinale': return new ClockworkFinale(this, d[1], d[2]);
      case 'pickup': {
        const item = new Item(d[3], d[1], row);
        item.emerge = 16; item.y = item.baseY - 16;
        this.items.push(item);
        return null;
      }
      case 'grumblet': return new Grumblet(d[1], row, this.level.themeName);
      case 'shellback': return new Shellback(d[1], row);
      case 'spikelet': return new Spikelet(d[1], row);
      case 'flutter': return new Flutter(d[1], d[2] == null ? 4 : d[2], !!d[3], d[4]);
      case 'woodworm':
      case 'snapvine': {
        const c = d[1];
        for (let r = 0; r < ROWS; r++) {
          if (this.level.get(c, r) === T.PIPE_TL) return new Snapvine(c, r, this.level.theme.pipe === 'coral');
          if (this.level.get(c, r) === T.PIPE_TR) return new Snapvine(c - 1, r, this.level.theme.pipe === 'coral');
        }
        return null;
      }
      case 'firebar': return new Firebar(d[1], d[2], d[3] || 6, d[4] || 0.04);
      case 'ember': return new Ember(d[1], d[2]);
      case 'boss': return (this.boss = new Boss(d[1]));
      case 'umbra': return (this.boss = new Umbraroo(d[1]));
      case 'moonlamp': return new Moonlamp(d[1], d[2] == null ? 5 : d[2], d[3], d[4], d[5]);
      case 'echo': return new Echo(d[1], d[2]);
      case 'reflection': return new Reflection(d[1], d[2], d[3], d[4], d[5]);
      case 'plate': return new ShadePlate(d[1], row, d[3]);
      case 'gate': return new ShadeGate(d[1], d[2], d[3], d[4], d[5]);
      case 'keeper': return new ShadeKeeper(d[1], d[2]);
      case 'slab': return new SigilSlab(d[1], row);
      case 'sigil': return new Sigil(d[1], d[2], d[3], d[4], d[5]);
      case 'sigbtn': return new SigilButton(d[1], row, d[3]);
      case 'spring': return new Spring(d[1], row);
      case 'sunflower': return new Sunflower(d[1], row);
      case 'snorer': return new Snorer(d[1], row);
      case 'chime': return new Chime(d[1], row, d[3], d[4], this.level.chimePuzzles.get(d[3])?.counts.get(d[1]) ?? d[5]);
      case 'slate': return new Slate(d[1], row, this.level.chimePuzzles.get(d[4])?.clue ?? d[3], d[4]);
      case 'sleepbat': return new SleepBat(d[1], d[2] == null ? 1 : d[2]);
      case 'sheep': return new Sheep(d[1], row);
      case 'bloom': return new Bloom(d[1], d[2], d[3], d[4]);
      case 'caterpillar': return new Caterpillar(d[1], row);
      case 'dandelion': return new Dandelion(d[1], row);
      case 'slideguin': return new Slideguin(d[1], row);
      case 'vane': return new Weathervane(d[1], row, d[3] || 1, d[4]);
      case 'avalanche': return new Avalanche(d[1], d[2], d[3]);
      case 'icicle': return new Icicle(d[1], d[2] == null ? 4 : d[2]);
      case 'finlet': return new Finlet(d[1], d[2] == null ? 6 : d[2], d[3]);
      case 'jellop': return new Jellop(d[1], d[2] == null ? 6 : d[2]);
      case 'stone': return new Stone(d[1], row);
      case 'urchin': return new Urchin(d[1], row, d[3]);
      case 'crab': return new Crab(d[1], row, d[3]);
      case 'puffer': return new Pufferfish(d[1], d[2] == null ? 6 : d[2]);
      case 'buzzbee': return new Buzzbee(d[1], d[2] == null ? 8 : d[2], d[3]);
      case 'hopsprig': return new Hopsprig(d[1], row);
      case 'molebert': return new Molebert(d[1], row);
      case 'sidewinder': return new Sidewinder(d[1], row);
      case 'scorpling': return new Scorpling(d[1], row);
      case 'tumbler': return new Tumbleweed(d[1] * TILE + 1, (row + 1) * TILE - 14, -1);
      case 'tumbleweeds': return new TumbleSpawner(d[1], d[2], d[3]);
      case 'dunefin': return new Dunefin(this.level, d[1], d[2]);
      case 'sign': return new Signpost(d[1], d[2], d[3] == null ? 11 : d[3], d[4] || 0, d[5] !== 'nopost');
      case 'lamp': return new Lamp(d);
      case 'clay': return new Pot(d[1], this.level.surfaceRow(d[1]));
      case 'ladder': return new Ladder(d[1], d[2], d[3]);
      case 'worm': return new Sandworm(d[1], d[2], d[3]);
      case 'bigcactus': return new BigCactus(d[1]);
      case 'crumble': return new CrumbleMesa(d[1], d[2], d[3]);
      case 'camelgate': return new CamelGate(d[1], d[2], d[3]);
      case 'vulturk': return new Vulturk(d[1], d[2]);
      case 'dartrap': return new DartTrap(d[1], d[2], d[3], d[4], d[5]);
      case 'vine': return new Vine(d[1], d[2], d[3]);
      case 'gulpod': return new Gulpod(d[1], d[2], d[3], d[4], d[5], d[6]);
      case 'chimpchuck': return new Chimpchuck(d[1], row);
      case 'chamelurk': return new Chamelurk(d[1], row);
      case 'thumpdrum': return new Thumpdrum(d[1], row);
      case 'brolly': return new Brolly(d[1], d[2] == null ? 3 : d[2], d[3]);
      case 'puffinch': return new Puffinch(d[1], d[2] == null ? 8 : d[2], d[3]);
      case 'sulk': return new Sulkcloud(d[1], d[2] == null ? 8 : d[2], d[3], d[4]);
      case 'pot': return new Sproutpot(d[1], d[2], d[3], d[4]);
      case 'clap': {
        const c = new Clapper(d[1], d[2] == null ? 12 : d[2], d[3], d[4]);
        c.added = true;
        this.platforms.push(c.L, c.R);
        return c;
      }
      case 'hoop': return new SkyHoop(d[1], d[2] == null ? 3 : d[2]);
      case 'rainbow': return new RainbowStar(d[1], row, d[3]);
      case 'striker': return new HighStriker(d[1], row);
      case 'fairgate': return new FairGate(d[1], d[2], d[3]);
      case 'fairarch': return new FairArch(d[1], row);
      case 'balloon': return new Balloon(d[1], row, d[3]);
      case 'storm': return new StormCloud(d[1], d[2] == null ? 1 : d[2], d[3] || 0);
      case 'portrait': return new Portrait(d[1], d[2] == null ? 4 : d[2], d[3]);
      case 'kiln': return new Kiln(d[1], d[2], d[3], d[4]);
      case 'statue': return new Statue(d[1], row, d[3], d[4]);
      case 'chef': return new Chef(d[1], row, d[3], d[4]);
      case 'gobbler': return new Gobbler(d[1], row);
      case 'cuckoo': return new Cuckoo(d[1], row, d[3]);
      case 'alarm': return new Alarm(d[1], row);
      case 'windup': return new Windup(d[1], row);
      case 'jack': return new Jack(d[1], row);
      case 'stopwatch': return new Stopwatch(d[1], row, d[3]);
      case 'gearfall': return new Gearfall(d[1], d[2], d[3], d[4], d[5]);
      case 'tinbirds': return new Tinbirds(d[1], d[2], d[3], d[4], d[5], d[6]);
      case 'clockface': return new ClockFace(d[1], d[2], d[3], d[4]);
      case 'mainspring': return new Mainspring(d[1]);
      case 'wick': return new Wickwisp(d[1], row);
      case 'inkling': return new Inkling(d[1], row);
      case 'thorn': return new Thornback(d[1], row);
      case 'moth': return new Gloomoth(d[1], d[2] == null ? 5 : d[2]);
      case 'gargoyle': return new Gargling(d[1], row);
      case 'gullet': return new Gullet(d[1], d[2], d[3]);
      case 'acid': return new AcidLake(d[1], d[2], d[3], d[4]);
      case 'geyser': return new Geyser(d[1], d[2], d[3]);
      case 'hopper': return new Hopper(d[1], d[2], d[3], d[4]);
      case 'enzyme': return new EnzymeBubble(d[1], row, d[3], d[4]);
      case 'inkdrip': return new InkDrip(d[1], row);
      case 'vent': return new MethaneVent(d[1], d[2], d[3], d[4], d[5], d[6]);
      case 'stink': return new StinkPocket(d[1], d[2], d[3], d[4]);
      case 'prickle': return new Prickle(d[1], row, d[3]);
      case 'blob': return new Blobule(d[1], row);
      case 'fluke': return new Fluke(d[1], row);
      case 'fuzz': return new FuzzString(d[1], d[2], d[3], d[4]);
      case 'fizz': return new Fizzbag(d[1], row);
      case 'plop': return new Plopstone(d[1], row);
      case 'bag': return new PlasticBag(d[1], row, d[3]);
      case 'villus': return new Villus(d[1], row);
      case 'bacillus': return new Bacillus(d[1], row, d[3]);
      case 'ceilingbac': return new CeilingBacillus(d[1], row);
      case 'bubbles': return new BubbleColumn(d[1], d[2], d[3], d[4]);
      case 'spout': return new Spout(d[1], d[2], d[3], d[4], d[5], d[6]);
      case 'sphincter': return new Sphincter(d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8]);
      case 'debris': {
        if (this.brokenBones && this.level && this.level.gutBoneCells && !d[4]) {
          const key = this.level.gutBoneCells.get(row * this.level.w + Math.floor(d[1]));
          if (key != null && this.brokenBones.has(key)) return null;
        }
        return new GutDebris(d[1], row, d[3], d[4]);
      }
      case 'heap': return new DebrisHeap(d[1], d[2], d[3], d[4]);
      case 'squatter': return new Squatter(d[1], row);
      case 'parasite': return new ParasiticWorm(d[1], row, d[3],d[4]);
      case 'plug': return new GristlePlug(d[1], d[2], d[3], d[4]);
      case 'papillae': return new Papillae(d[1], d[2], d[3], d[4]);
      case 'throatring': return new ThroatRing(d[1], d[2], d[3]);
      case 'feces': return new FecalMatter(d[1], row, d[3]);
      case 'cloacolith': return (this.boss = new Cloacolith(d[1], row));
      case 'cloacavent': return new CloacaVent(d[1]);
      case 'vault': return new VaultDecor(d[1], d[2]);
      case 'drip': return new Gloomdrop(d[1], d[2] == null ? 2 : d[2]);
      case 'bandmate': return new Bandmate(d[1], row, d[3]);
      case 'staff': return new NoteStaff(d[1], d[2], d[3], d[4]);
      case 'hush': return new MamaHush(d[1], d[2], d[3]);
      case 'bopper': return new Bopper(d[1], row);
      case 'skeeter': return new Skeeter(d[1], d[2] == null ? 8 : d[2]);
      case 'dance': return new DanceFloor(d[1], d[2], d[3]);
      case 'bandstand': return new Bandstand(d[1]);
      case 'crowd': return new Crowd(d[1], d[2], d[3]);
      case 'simmer': return new Simmer(d[1], d[2], d[3], d[4], d[5]);
      case 'okra': return new OkraSlice(d[1], row, d[3], d[4]);
      case 'slime': return new SlimePuddle(d[1], row, d[3]);
      case 'steam': return new SteamVent(d[1], d[2], d[3], d[4], d[5], d[6]);
      case 'bayleaf': return new BayLeaf(d[1], d[2] == null ? 6 : d[2]);
      case 'cleaver': return new Cleaver(d[1], d[2], d[3], d[4], d[5], d[6]);
      case 'board': return new CuttingBoard(d[1], d[2], d[3]);
      case 'surge': return new Surge(d[1], d[2], d[3], d[4], d[5], d[6]);
      case 'stockpot': return new StockPot(d[1], d[2], d[3], d[4], d[5], d[6], d[7]);
      case 'ladle': return new Ladle(d[1], d[2], d[3], d[4]);
      case 'vegslope': return new VegSlope(d[1], d[2], d[3], d[4]);
      case 'crawdad': return new Crawdad(d[1], row);
      case 'andouille': return new Andouille(d[1] * TILE + 1, (row + 1) * TILE - 16, d[3] || -1);
      case 'andouilles': return new AndouilleSpawner(d[1], d[2], d[3]);
      case 'spitter': return new OkraSpitter(d[1], row);
      case 'onion': return new Onion(d[1], d[2] == null ? 5 : d[2]);
      case 'celery': return new Celery(d[1], row);
      case 'pepper': return new BellPepper(d[1], row);
      case 'trinity': return new TrinityTalk(d[1]);
      case 'prisoner': return this.freed.has(d[1] + ',' + row) ? null : new Prisoner(d[1], row);
    }
    console.warn('CHICKAROO: unknown entity', d[0]);
    return null;
  }
  enemyInteractions() {
    const ents = this.entities, p = this.player;
    for (let i = 0; i < ents.length; i++) {
      const a = ents[i];
      if (a.dead || a.remove) continue;
      for (let j = i + 1; j < ents.length; j++) {
        const b = ents[j];
        if (b.dead || b.remove) continue;
        if (a === this.held || b === this.held) continue;
        if (Math.abs(a.x - b.x) > 48) continue;
        const aSlide = a instanceof Shellback && (a.state === 'slide' || a.state === 'toss');
        const bSlide = b instanceof Shellback && (b.state === 'slide' || b.state === 'toss');
        if (aSlide || bSlide) {
          const s = aSlide ? a : b, o = aSlide ? b : a;
          Sound.src = s;   // (a kicked shell bowling things over off screen is heard only on screen)
          const ob = o.hitbox();
          if (!ob || !overlap(s, ob)) continue;
          if (o instanceof Chime) { o.ring(this); continue; }
          if (!(o.shellKill || (s.stone && o.stoneKill))) continue;
          if (aSlide && bSlide) { a.flipKill(this, -Math.sign(a.vx)); b.flipKill(this, -Math.sign(b.vx)); Sound.play('kick'); continue; }
          o.flipKill(this, Math.sign(s.vx));
          const v = STOMP_SCORES[Math.min(s.combo++, STOMP_SCORES.length - 1)];
          this.addScore(v, o.cx, o.y);
          Sound.play('kick');
          if (s.stone) { s.shatter(this); break; }
        } else if (a.walker && b.walker && overlap(a, b)) {
          if (a.x < b.x) { if (a.vx > 0) a.vx = -a.vx; if (b.vx < 0) b.vx = -b.vx; }
          else { if (a.vx < 0) a.vx = -a.vx; if (b.vx > 0) b.vx = -b.vx; }
        }
      }
    }
    Sound.src = null;
    const h = this.held;
    if (h) {
      for (const e of ents) {
        if (e === h || e.dead || !(e.shellKill || (h.stone && e.stoneKill))) continue;
        const eb = e.hitbox();
        if (!eb || !overlap(h, eb)) continue;
        e.flipKill(this, p.facing);
        if (h.stone) h.shatter(this);
        else { h.flipKill(this, -p.facing); this.held = null; }   // a carried shell or stone is spent
        this.addScore(1000, e.cx, e.y);
        Sound.play('kick');
        break;
      }
    }
    if (p.state !== 'play' || p.inPod) return;
    for (const e of ents) {
      if (e.dead || e.remove || !e.touches(p)) continue;
      if (p.roll > 0 && this.rollHit(e)) continue;
      if (p.spin && this.spinHit(e)) continue;
      e.onTouch(this, p);
      if (p.state !== 'play') break;
    }
  }
  // The view's lift (px): it rises quickly as he heads off the top of the screen, and settles back down
  // more gently as he comes back into view
  updateLift(snap) {
    const p = this.player, want = p && p.state !== 'dead' && !p.hidden && !this.gut ? clamp(LIFT_MARGIN - p.y, 0, LIFT_MAX) : 0;
    const lift = this.lift || 0;
    this.lift = snap ? want : lift + (want - lift) * (want > lift ? 0.3 : 0.12);
    if (this.lift < 0.25) this.lift = 0;
  }
  updateCamera(snap) {
    this.updateLift(snap);
    const p = this.player, lv = this.level;
    const max = lv.w * TILE - VIEW_W;
    if (this.wormImpact) {
      const scene = this.wormImpact, k = Math.min(1, scene.t / 30), ease = k * k * (3 - 2 * k);
      this.camX = clamp(scene.from + (scene.focus - VIEW_W / 2 - scene.from) * ease, 0, max);
      this.camPx = p.x + p.w / 2;
      return;
    }
    if (this.arenaCam != null) {
      const want = this.arenaMax != null ? clamp(p.x + p.w / 2 - VIEW_W / 2, this.arenaCam, this.arenaMax) : this.arenaCam;
      this.camX = snap ? want : this.camGlide ? this.glideCam(want) : this.camX + (want - this.camX) * 0.08;
      this.camX = clamp(this.camX, 0, max);
      return;
    }
    // Locked to the player's centre. The camera first moves by exactly the player's displacement
    // (zero lag at any speed, nothing to swing back when stopping or turning), then eases out
    // whatever error is left (jumps into view, respawns, arena exit) with a gentle spring.
    const px = p.x + p.w / 2, anchor = px - VIEW_W * 0.5;
    const room = lv.rooms.length && lv.rooms.find(r => px >= r.a * TILE && px < (r.b + 1) * TILE);   // (3-4: the view keeps to the room he's in)
    const [lo, hi] = lv.water && lv.water.dry ? this.roomAt(px) : room ? [room.a * TILE, (room.b + 1) * TILE] : [0, lv.w * TILE];
    if (snap || this.camPx == null) this.camX = anchor;
    else {
      this.camX += px - this.camPx;
      if (this.camGlide) { this.camX = this.glideCam(anchor); if (Math.abs(anchor - this.camX) < 1 && Math.abs(this.camV) < 0.1) this.camGlide = false; }   // (gliding home after a camera pan)
      else this.camX += (anchor - this.camX) * 0.1;
      if (Math.abs(anchor - this.camX) < 0.25) this.camX = anchor;   // (settled exactly: a leftover sliver would make him shimmer a pixel against the scenery)
    }
    this.camPx = px;
    this.camX = clamp(this.camX, lo, Math.min(max, hi - VIEW_W));
  }
  // A gentle camera move (g.camGlide, for a pan to show something off and back): it gathers speed slowly (CAM_EASE px a
  // frame, each frame), cruises at no more than CAM_GLIDE, and brakes just in time to stop dead on the spot. Nothing
  // lurches: no motion sickness.
  glideCam(want) {
    const d = want - this.camX, v = this.camV || 0;
    if (Math.abs(d) < 0.5 && Math.abs(v) < CAM_EASE * 2) { this.camV = 0; return want; }
    const goal = Math.sign(d) * Math.min(CAM_GLIDE, Math.sqrt(2 * CAM_EASE * Math.abs(d)));   // (as fast as it can still stop in time)
    this.camV = v + clamp(goal - v, -CAM_EASE, CAM_EASE);
    return this.camX + this.camV;
  }


  // ---------- particles ---------------------------------------------------------
  updateParticles() {
    if (this.hudPulse > 0) this.hudPulse--;
    const frozen = this.timeStop > 0 && this.mode === 'play';
    const ps = this.particles;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const q = ps[i];
      if (q.kind === 'pollen') { this.updatePollen(q); if (!q.dead) ps[w++] = q; continue; }
      if (frozen && q.kind !== 'text' && !q.live) { if (!q.dead) ps[w++] = q; continue; }   // stopped time: sparks and dust hang in the air
      q.t++;
      if (q.kind === 'hat') { q.rot += q.vr; if (q.t % 2 === 0 && q.t < 40) ps.push({ kind: 'px', x: q.x + rand(-2, 2), y: q.y + rand(-2, 2), vx: rand(-0.4, 0.4), vy: rand(0, 0.6), g: -0.02, life: 22, t: 0, color: q.t % 4 ? '#ffffff' : '#fff0a8', size: 1 + (q.t % 3 === 0) }); }
      q.x += q.vx; q.y += q.vy; q.vy += q.g || 0;
      if((q.kind==='wormGoo'||q.kind==='wormGib')&&q.y>=12*TILE){q.y=12*TILE;q.vx*=.7;if(q.kind==='wormGoo'){q.vy=0;q.g=0;q.splat=true;}else{q.vy=-Math.abs(q.vy)*.25;if(Math.abs(q.vy)<.5){q.vy=0;q.g=0;}}}
      if (q.drag) { q.vx *= q.drag; q.vy *= q.drag; }
      if (q.t >= q.life) { q.dead = true; if (q.onEnd) q.onEnd(q); }
      if (!q.dead) ps[w++] = q;
    }
    ps.length = w;
    this.updateDialog();
  }
  updatePollen(q) {
    q.t++;
    if (q.t > q.delay) {
      const tx = this.camX + 95, ty = 6 - (this.lift || 0);   // the counter icon, in world space
      const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(9, 1.5 + (q.t - q.delay) * 0.3);
      q.vx += (dx / d * sp - q.vx) * 0.22; q.vy += (dy / d * sp - q.vy) * 0.22;
      if (d < 8) { q.dead = true; this.hudPulse = 10; return; }
    } else { q.vy += 0.2; q.vx *= 0.95; }
    q.x += q.vx; q.y += q.vy;
    this.particles.push({ kind: 'px', x: q.x + rand(-1, 1), y: q.y + rand(-1, 1), vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15), life: 20, t: 0, color: q.t % 3 ? q.color : '#ffffff', size: q.t % 2 ? 2 : 1 });
    if (q.t >= q.life) q.dead = true;
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ kind: 'px', x: x + rand(-4, 4), y: y - 2, vx: rand(-0.8, 0.8), vy: rand(-0.9, -0.2), g: 0.02, drag: 0.92, life: 20 + rand(0, 10), t: 0, color: '#f4efe4', size: 2 });
    }
  }
  spark(x, y, color, life = 16, vx = rand(-0.5, 0.5), vy = rand(-1, 0)) {
    this.particles.push({ kind: 'px', x, y, vx, vy, g: 0.03, life, t: 0, color, size: 1 });
  }
  sparkle(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, drag: 0.9, life: 18, t: 0, color: i % 2 ? '#fff3b0' : '#ffd23f' });
    }
  }
  burst(x, y, colors, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(0.8, 2.6);
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.04, drag: 0.95, life: 30 + rand(0, 20), t: 0, color: colors[i % colors.length] });
    }
  }
  popup(x, y, text, color = '#ffffff', life = 45) {
    this.particles.push({ kind: 'text', x, y, vx: 0, vy: -0.6, life, t: 0, text, color });
  }

  // Dialogue: a classic text box (see drawDialog) with the speaker's name, typed out a couple of
  // letters a frame. One line at a time: a speaker's new line replaces their current one; another
  // speaker's line waits its turn in a short queue.
  // Tips (game.say) use the same box under a lightbulb, but always give way to someone talking.
  // `hold` lines are real dialogue: the game waits on them (see holdDialog) until jump dismisses them;
  // everything else (quips, chatter, OW!s) just times out on its own while play goes on.
  speak(speaker, text, color = '#ffffff', hold = false) {   // text: a line, or a list to pick one from at random
    if(this.dialog?.uninterruptible)return;
    if (this.hushed() && !(speaker instanceof Cat)) return;   // (the cat companion always has something to say)
    text = String(oneOf(text)).toUpperCase();
    const line = { speaker, name: speakerName(speaker), text, color, hold, t: 0, at: this.player ? this.player.x : null, life: Math.ceil(text.length / DIALOG_CPS) + clamp(60 + text.length * 2, 90, 150) };
    const q = (this.dialogQ || []).filter(l => l.speaker !== speaker);
    const d = this.dialog;
    if (d && d.tip) {
      if (d.replayAfterSpeech !== false) { d.t = 0; q.unshift(d); }
      this.dialog = line;
    }   // Most tips return after speech; a one-time tip already on show is finished.
    else if (!d || d.speaker === speaker) this.dialog = line;
    else { q.splice(q.findIndex(l => l.tip) < 0 ? q.length : q.findIndex(l => l.tip), 0, line); if (q.length > 5) q.pop(); }
    this.dialogQ = q;
  }
  // a `quiet` stage (2-4) tells its story without words: nobody but the cat talks and no tips show, start to finish
  hushed() { const lv = this.level; return !!(lv && lv.def.quiet && this.mode === 'play'); }
  saying(speaker) { return (this.dialog && this.dialog.speaker === speaker) || (this.dialogQ || []).some(l => l.speaker === speaker); }
  // {JUMP} {RUN} {ROLL} {SPIN} {DOWN} in a tip become the button for whatever he's playing with (null: a tip about a
  // button he hasn't got, skipped altogether)
  buttonText(s) {
    const pad = Pad.used, ps = pad && Pad.isPS(), touch = this.touch && !pad;
    const N = pad ? { JUMP: ps ? 'CROSS' : 'A', RUN: ps ? 'SQUARE' : 'X', ROLL: ps ? 'CIRCLE' : 'B', SPIN: ps ? 'TRIANGLE' : 'Y', DOWN: 'DOWN' }
      : touch ? { JUMP: 'A', RUN: 'B', ROLL: 'ROLL', SPIN: 'SPIN', DOWN: 'DOWN' } : { JUMP: 'UP', RUN: 'D', ROLL: 'C', SPIN: 'W', DOWN: 'DOWN' };
    let missing = false;
    const out = s.replace(/\{(\w+)\}/g, (m, k) => { if (!N[k]) missing = true; return N[k] || k; });
    return missing ? null : out;
  }
  // hold: a lesson rather than a passing tip -- play waits while it's read, and jump goes on (1-1's signsHold)
  tipLine(title, text, color = '#ffd166', life = null, hold = false, allowQuiet = false) {
    if (this.hushed() && !allowQuiet) return;
    title = this.buttonText(String(title || '').toUpperCase()); text = this.buttonText(String(text || '').toUpperCase());
    if (title == null || text == null) return;
    const all = [this.dialog].concat(this.dialogQ || []);
    if (all.some(l => l && l.tip && l.title === title && l.text === text)) return;
    const n = title.length + text.length;
    // tips never pause play (just information, not someone talking): typed out, then up long enough to
    // read comfortably; no `at`, so running on doesn't hurry them off
    const duration = life ? Math.ceil(life * 0.75) : Math.ceil(n / DIALOG_CPS) + Math.ceil(clamp(90 + n * 3, 180, 360) * 0.75);
    const line = { tip: true, hold, title, text, color, t: 0, at: null, life: duration };
    if (hold && this.dialog && !this.dialog.hold) { this.dialog.t = 0; (this.dialogQ = this.dialogQ || []).unshift(this.dialog); this.dialog = line; }   // (a lesson goes first)
    else if (!this.dialog) this.dialog = line;
    else { (this.dialogQ = this.dialogQ || []).push(line); if (this.dialogQ.length > 5) this.dialogQ.shift(); }
    return line;
  }
  // A held line on show freezes play: it types out, jump fills it in at once, then jump again
  // dismisses it (and brings on the next one, if any is waiting)
  // what moves a held line on: jump -- or, for a lesson (a held tip), any of the action buttons
  goOn(d) { return Input.hit('jump') || Input.hit('ok') || Input.hit('start') || (d.tip && (Input.hit('run') || Input.hit('roll') || Input.hit('spin') || Input.hit('start'))); }
  holdDialog() {
    const p = this.player;
    if (p) { p.sx += (1 - p.sx) * 0.2; p.sy += (1 - p.sy) * 0.2; }   // (he finishes his landing squash while play waits)
    const d = this.dialog, n = d.text.length + (d.title ? d.title.length + 1 : 0) + 8, done = Math.ceil(n / DIALOG_CPS);   // + a little slack for line breaks
    if (d.t < done) {
      d.t++;
      const shown = Math.floor(d.t * DIALOG_CPS);
      if (shown <= d.text.length && d.t % 3 === 0 && d.text[shown - 1] !== ' ') Sound.play('blip');
      if (this.goOn(d) && d.t > 2) d.t = done;
    } else if (this.goOn(d)) {
      Sound.play('select');
      this.dialog = (this.dialogQ || []).shift() || null;
      this.talking = !!this.dialog;
    }
    if (this.dialog && this.dialog.t > 8) this.dialog.life = Math.max(this.dialog.life, this.dialog.t + 10);   // no fading out while waiting
  }
  updateDialog() {
    // lines said back where Chickaroo has long since run on from: queued ones are dropped, the one on
    // show hurries off (a quick fade), so running straight through never stacks up a backlog
    const p = this.player, far = l => !l.uninterruptible && l.at != null && p && Math.abs(p.x - l.at) > DIALOG_RANGE;
    if (this.dialogQ && this.dialogQ.some(far)) this.dialogQ = this.dialogQ.filter(l => !far(l));
    if (this.dialog && far(this.dialog)) this.dialog.life = Math.min(this.dialog.life, this.dialog.t + 10);
    const d = this.dialog;
    if (d && this.timeStop > 0 && !d.tip && this.mode === 'play') { this.talking = true; return; }   // stopped time: whoever's talking freezes mid-word
    if (d) {
      d.t++;
      const shown = Math.floor(d.t * DIALOG_CPS);
      if (shown <= d.text.length && d.t % 3 === 0 && d.text[shown - 1] !== ' ') Sound.play('blip');
      if (d.t >= d.life && !(d.hold && this.mode === 'play')) {   // next in line, skipping any said so far back it'd barely get a moment on screen
        const q = this.dialogQ || [];
        while (q.length && q[0].at != null && p && Math.abs(p.x - q[0].at) > DIALOG_RANGE * 0.6) q.shift();
        this.dialog = q.shift() || null;
      }
    }
    // banners and tips wait their turn while someone's talking (one thing at a time)
    this.talking = !!this.dialog;
  }

  updateAmbient() {
    const titleLike = this.mode === 'title' || this.mode === 'select';
    let theme = titleLike ? 'meadow' : this.level ? this.level.themeName : 'meadow';
    if (!titleLike && this.level && this.level.water && this.player && !this.wet(this.player.x)) theme = 'sky';   // above the waves
    if (this.ambient.theme !== theme) { this.ambient = []; this.ambient.theme = theme; }
    const A = this.ambient;
    // Midnight Clockworks already has a busy sky, so it keeps only a few slow motes
    const calm = theme === 'clock' || theme === 'jungle';
    const cap = calm ? 7 : 22, rate = calm ? 0.04 : 0.12;
    if (A.length < cap && Math.random() < rate) {
      if (theme === 'meadow') A.push({ x: rand(0, VIEW_W + 60), y: -4, vx: rand(-0.6, -0.2), vy: rand(0.2, 0.45), t: 0, life: 600, c: Math.random() < 0.5 ? '#ffd1e3' : '#ffffff', ph: rand(0, 6) });
      else if (theme === 'cave') A.push({ x: rand(0, VIEW_W), y: rand(40, VIEW_H), vx: rand(-0.1, 0.1), vy: rand(-0.25, -0.05), t: 0, life: 400, c: Math.random() < 0.6 ? '#5ef2ff' : '#ff7ad9', ph: rand(0, 6) });
      else if (theme === 'snow') A.push({ x: rand(-60, VIEW_W + 60), y: -4, vx: rand(-0.2, 0.2), vy: rand(0.3, 0.8), t: 0, life: 700, c: '#ffffff', ph: rand(0, 6), w: Math.random() < 0.3 ? 2 : 1 });
      else if (theme === 'ocean') A.push({ x: rand(0, VIEW_W), y: VIEW_H + 2, vx: 0, vy: rand(-0.7, -0.3), t: 0, life: 520, c: '#cdefff', ph: rand(0, 6), ring: true });
      else if (theme === 'sky') A.push({ x: VIEW_W + rand(0, 40), y: rand(16, VIEW_H - 30), vx: rand(-3.2, -1.6), vy: 0, t: 0, life: 300, c: '#ffffff', ph: rand(0, 6), w: 4 + Math.floor(rand(0, 10)) });
      else if (theme === 'eclipse') A.push({ x: rand(0, VIEW_W), y: VIEW_H + 2, vx: rand(-0.15, 0.15), vy: rand(-0.5, -0.2), t: 0, life: 420, c: Math.random() < 0.5 ? '#c9b8ff' : '#6a5aa8', ph: rand(0, 6) });
      else if (theme === 'desert') A.push({ x: VIEW_W + rand(0, 40), y: rand(60, VIEW_H - 8), vx: rand(-2.4, -0.9), vy: rand(-0.12, 0.08), t: 0, life: 360, c: Math.random() < 0.6 ? '#f6d8a0' : '#e8b070', ph: rand(0, 6), w: Math.random() < 0.3 ? 2 : 1 });
      else if (theme === 'jungle') A.push({ x: rand(0, VIEW_W + 60), y: -4, vx: rand(-0.4, -0.1), vy: rand(0.25, 0.45), t: 0, life: 700, c: Math.random() < 0.5 ? '#6fcf5a' : '#3f9a4a', ph: rand(0, 6), w: 2 });
      else if (theme === 'bayou') A.push({ x: rand(0, VIEW_W), y: rand(70, VIEW_H - 24), vx: rand(-0.25, 0.25), vy: rand(-0.12, 0.06), t: 0, life: 520, c: Math.random() < 0.7 ? '#e8ff7a' : '#ffd166', ph: rand(0, 6), fly: true });
      else if (theme === 'gumbo') A.push({ x: rand(0, VIEW_W), y: VIEW_H + 2, vx: rand(-0.2, 0.2), vy: rand(-0.6, -0.25), t: 0, life: 420, c: ['#ff6a3a', '#ffd166', '#6ab04a', '#ff6a3a'][Math.floor(rand(0, 4))], ph: rand(0, 6) });   // flecks of paprika, gold and parsley drifting up
      else if (theme === 'clock') A.push({ x: rand(0, VIEW_W), y: rand(20, VIEW_H - 20), vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.05), t: 0, life: 420, c: Math.random() < 0.55 ? '#ffe08a' : '#c9b8ff', ph: rand(0, 6) });
      else A.push({ x: rand(0, VIEW_W), y: VIEW_H + 2, vx: rand(-0.2, 0.2), vy: rand(-0.9, -0.4), t: 0, life: 360, c: Math.random() < 0.6 ? '#ff8a2a' : '#ffd166', ph: rand(0, 6) });
    }
    const wind = this.mode === 'play' ? (this.windForce || 0) * 4 : 0;
    if (this.timeStop > 0 && !titleLike) return;
    for (const a of A) { a.t++; a.x += a.vx + Math.sin(a.t * 0.04 + a.ph) * 0.25 + wind; a.y += a.vy; }
    for (let i = A.length - 1; i >= 0; i--) if (A[i].t > A[i].life || A[i].y < -10 || A[i].y > VIEW_H + 10 || A[i].x < -80 || A[i].x > VIEW_W + 80 || (A[i].ring && A[i].y < 18)) A.splice(i, 1);
  }

  // ═════════════════════════════ RENDERING ═══════════════════════════════════
  // A tap/click on the canvas, in game pixels. Menu items are directly tappable.
  tap(x, y) {
    Sound.unlock();
    if (this.fadeCb) return;
    if (this.mode === 'placeholder') { this.openSelect(); Music.play('title'); return; }
    const h = this.menuHits.find(m => x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h);
    if (this.mode === 'select') { if (h) this.tapSelect(h); return; }
    if (h && h.bar && x >= h.bar.x - 4) {
      this.menu = h.i;
      const v = Math.max(0, Math.min(1, (x - h.bar.x) / h.bar.w));
      Sound.setVol(h.bar.kind, v);
      if (h.bar.kind === 'sfx') Sound.play('coin');
      return;
    }
    if (h && h.map) { this.tapWarpMap(x, h); return; }
    if (h) { this.menu = h.i; Input.hits.add('start'); return; }
    if (this.mode === 'title' && !this.titleConfirm) { this.menu = 0; Input.hits.add('start'); }
    else if (this.mode === 'intro' || this.mode === 'clear' || this.mode === 'ready') Input.hits.add('start');
  }

}
mixin(Game, GameEntities);
