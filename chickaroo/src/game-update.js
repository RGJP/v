'use strict';
// Part of class Game (see game.js): GameUpdate
class GameUpdate {
  // ---------- update ---------------------------------------------------------
  update() {
    const frozen = this.mode === 'pause' || (this.mode === 'controls' && this.ctlFrom === 'pause');   // (the world stands still)
    if (!frozen) this.t++;
    Sound.src = null;   // (in case last frame broke off mid-update)
    if (this.gut && this.t - (this.boneSndT || 0) > 1) this.hushBones();   // (3-4: no fish-skeleton cracking while the bones aren't updating)
    this.updateFade();
    const busy = !!this.fadeCb;
    if (!busy && this.mode === 'play' && !(this.band && this.band.finale) && Input.hit('devwarp')) { this.openWarp(false); return; }
    const confirm = Input.hit('start') || Input.hit('jump') || Input.hit('ok');
    switch (this.mode) {
      case 'title': {
        if (busy) break;
        if (this.titleConfirm) {   // the walkthrough's spoiler warning: YES / NO (NO first)
          if (Input.hit('pause') || Input.hit('roll')) { this.titleConfirm = false; this.walkBlocked = false; this.menu = this.titleReturn; Sound.play('select'); break; }
          if (Input.hit('up') || Input.hit('down') || Input.hit('left') || Input.hit('right')) { this.menu = 1 - this.menu; Sound.play('select'); }
          if (confirm) {
            if (this.menu === 0 && !this.openWalkthrough()) { this.walkBlocked = true; Sound.play('select'); break; }
            Sound.play(this.menu === 0 ? 'confirm' : 'select');
            this.titleConfirm = false; this.walkBlocked = false; this.menu = this.titleReturn;
          }
          break;
        }
        const items = this.titleItems(), n = items.length;
        this.menu = Math.min(this.menu, n - 1);
        if (Input.hit('up')) { this.menu = (this.menu + n - 1) % n; Sound.play('select'); }
        if (Input.hit('down')) { this.menu = (this.menu + 1) % n; Sound.play('select'); }
        if (confirm) {
          const act = (items[this.menu] || items[0]).act;
          if (act === 'continue') { Sound.play('confirm'); this.transition(() => this.continueGame()); }
          else if (act === 'play') { Sound.play('confirm'); this.transition(() => this.newGame()); }
          else if (act === 'select') { Sound.play('confirm'); this.openSelect(); }
          else if (act === 'controls') this.openControls('title');
          else if (act === 'walkthrough') { this.titleConfirm = true; this.walkBlocked = false; this.titleReturn = this.menu; this.menu = 1; Sound.play('select'); }
        }
        break;
      }
      case 'select':
        if (!busy) this.updateSelect();
        break;
      case 'placeholder':
        this.placeholderT++;
        if (!busy && this.placeholderT > 12 && (confirm || Input.hit('pause') || Input.hit('roll'))) { this.openSelect(); Music.play('title'); }
        return;
      case 'intro':
        this.introT++;
        if (!busy && (this.introT > 150 || (this.introT > 30 && confirm))) this.transition(() => this.startLevel());
        break;
      case 'play': this.updatePlay(busy); break;
      case 'ready':   // respawned at a checkpoint: the world waits until jump (see drawReady)
        if (busy) break;
        this.readyT++;
        if (this.readyT > 12 && confirm) {
          this.mode = 'play';
          if (this.readyMusic) { Music.play(this.readyMusic.name, 1, this.readyMusic.at); this.readyMusic = null; }
        }
        break;
      case 'devwarp': this.updateDevWarp(busy); break;
      case 'controls': if (!busy) this.updateControls(); break;
      case 'pause': {
        if (busy) break;
        if (this.pauseConfirm) {
          if (Input.hit('pause') || Input.hit('roll')) { this.pauseConfirm = null; this.menu = this.pauseReturn; Sound.play('select'); break; }
          if (Input.hit('up') || Input.hit('down') || Input.hit('left') || Input.hit('right')) { this.menu = 1 - this.menu; Sound.play('select'); }
          if (confirm) {
            const action = this.pauseConfirm, yes = this.menu === 0;
            this.pauseConfirm = null; this.menu = this.pauseReturn;
            if (yes) {
              Sound.play('confirm');
              if (action === 'restart') this.transition(() => {
                Object.assign(this, this.snapshot);
                this.enterLevel();
              });
              else this.transition(() => this.toTitle());
            } else Sound.play('select');
          }
          break;
        }
        if (Input.hit('pause')) { this.resume(); break; }
        const rows = this.pauseRows(), n = rows.length;   // resume, restart, (controls,) quit, music vol, sfx vol
        this.menu = Math.min(this.menu, n - 1);
        if (Input.hit('up')) { this.menu = (this.menu + n - 1) % n; Sound.play('select'); }
        if (Input.hit('down')) { this.menu = (this.menu + 1) % n; Sound.play('select'); }
        const row = rows[this.menu];
        if (row === 'music' || row === 'sfx') {
          const dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
          this.volRep = dir && this.volRep > 0 ? this.volRep - 1 : 0;
          if (dir && (Input.hit('left') || Input.hit('right') || this.volRep === 0)) {
            if (!(Input.hit('left') || Input.hit('right'))) this.volRep = 4; else this.volRep = 14;
            Sound.setVol(row, (row === 'music' ? Sound.musicVol : Sound.sfxVol) + dir * 0.05);
            if (row === 'sfx') Sound.play('coin');
          }
        }
        if (confirm) {
          if (row === 'resume') this.resume();
          else if (row === 'restart' || row === 'quit') {
            this.pauseConfirm = row;
            this.pauseReturn = this.menu; this.menu = 1; Sound.play('select');
          } else if (row === 'controls') this.openControls('pause');
        }
        break;
      }
      case 'clear':
        this.clearT++;
        if (this.band) this.updateBand(true);   // (3-3's band plays on through the clear screen)
        if (this.gut && this.gut.outro) this.gut.outro.t++;   // (3-4's bedroom keeps breathing peacefully through the clear screen)
        if (this.gumbo && this.gumbo.outro) this.gumbo.outro.t++;   // (and 4-1's)
        this.updateParticles();
        if (!busy && this.clearT > 60 && (confirm || this.clearT > 420)) {
          if (LEVELS[this.levelIndex].dev) this.transition(() => this.toTitle());
          else if (LEVELS[this.levelIndex].id === '3-3') this.transition(() => { this.clearSave(); this.toTitle(); });
          else if (this.levelIndex + 1 < LEVELS.length) this.transition(() => this.advanceLevel());
          else this.transition(() => this.toTitle());
        }
        break;
      case 'gameover':
        if (busy) break;
        if (Input.hit('up') || Input.hit('down')) { this.menu = 1 - this.menu; Sound.play('select'); }
        if (confirm) {
          Sound.play('confirm');
          if (this.menu === 0) this.transition(() => { this.lives = 3; this.score = 0; this.coins = 0; this.power = 0; this.suit = null; this.enterLevel(); });
          else this.transition(() => this.toTitle());
        }
        break;
    }
    if (!frozen) this.updateAmbient();
  }

  // A stage's `welcome` note (1-1): once a session, when it's started from the top (the controls wait for it). Once he's
  // in, landed and the screen has faded in, play pauses for it: a page at a time on a solid box (easy to read) at the top
  // of the screen, clear of him and the meadow; jump turns the page.
  updateWelcome() {
    const p = this.player;
    if (p.x > 12 * TILE || this.devWarped) { this.welcomed = true; return; }   // (a checkpoint, or a dev warp: not this time)
    if (p.state !== 'play' || !p.onGround || this.fade > 0 || this.dialog) { this.welcomeT = 0; return; }
    if ((this.welcomeT = (this.welcomeT || 0) + 1) < WELCOME_WAIT) return;
    this.welcomed = true;
    const pages = this.level.def.welcome.map(text => ({ speaker: null, name: 'R THE DEV', text: text.toUpperCase(), color: '#ffd166', hold: true, t: 0, at: null, life: 1e9, background: '#0b0918' }));
    this.dialog = pages.shift(); this.dialogQ = pages.concat(this.dialogQ || []);
    Sound.play('appear');
  }
  updatePlay(busy) {
    const p = this.player;
    if (this.band && this.band.finale) { this.updateBayouFinale(); return; }
    if (!busy && Input.hit('pause') && p.state !== 'dead' && !this.tally) { this.pause(); return; }
    if (this.dialog && this.dialog.hold && p.state !== 'dead' && !busy) { this.holdDialog(); return; }   // dialogue: play waits for it
    if (p.state !== 'dead' && !this.tally && !busy) this.levelFrames++;
    if (this.lampReveal) {
      const lamp = this.lampReveal;
      lamp.update(this);
      this.updateParticles(); this.updateCamera(false);
      if (lamp.state === 'gone' || lamp.state === 'asleep') this.lampReveal = null;
      return;
    }
    if (this.wormImpact) {
      const scene = this.wormImpact;
      scene.t++; scene.worm.update(this);
      if (scene.cactus) scene.cactus.update(this);
      this.shake *= 0.85;
      this.updateParticles(); this.updateCamera(false);
      if (scene.worm.remove) {
        this.entities = this.entities.filter(e => !e.remove);
        this.wormImpact = null;
      }
      return;
    }
    this.shake *= 0.85;
    if (this.band && p.state !== 'dead') this.updateBand();   // 3-3: the band keeps the beat everything else follows
    if (this.gut && this.updateGut()) return;   // 3-4: the freefall, or the fade from one room down to the next (gut.js)
    if (this.gumbo && this.updateFever()) return;   // 4-1: the dream's opening in his bed, or its ending (game-gumbo.js)
    if (this.freezeT > 0) { this.freezeT--; this.updateParticles(); return; }
    if (p.state === 'dead') { this.updateDeath(); this.updateParticles(); return; }
    if (!busy && Input.hit('reserve')) this.swapReserve();

    const lv0 = this.level;
    if (this.monsoon) this.updateMonsoon();
    const frozen = this.timeStop > 0;   // the Master Stopwatch: everything but Chickaroo stands still (see game-clock.js)
    Sound.view = [this.camX - 24, this.camX + VIEW_W + 24];   // (off-screen things stay quiet: see Sound.audible)
    for (const pl of this.platforms) { if (frozen && !pl.timeless) { pl.dx = 0; pl.dy = 0; pl.prevY = pl.y; } else { Sound.src = pl; pl.update(this); } }
    Sound.src = null;
    for (let i = this.platforms.length - 1; i >= 0; i--) if (this.platforms[i].remove) { if (p.platform === this.platforms[i]) p.platform = null; this.platforms.splice(i, 1); }
    this.spawnEntities();
    this.updatePlayer();
    if (this.gumbo) this.updateGumbo();   // 4-1: slime, hot sauce, onion tears, hot roux (game-gumbo.js)
    {   // idle timer: standing still with nothing held for SLEEP_AFTER frames sends Chickaroo to sleep
      const held = Object.keys(Input.held).some(k => Input.held[k] > 0);
      if (p.state === 'play' && p.onGround && !held && Math.abs(p.vx) < 0.05 && !p.crouch && !(p.roll > 0) && !p.charge && !this.held) p.idleT = (p.idleT || 0) + 1;
      else p.idleT = 0;
    }
    if (this.trail) this.recordTrail();
    for (const e of this.entities) { if (frozen && !e.timeless) continue; Sound.src = e; if (e.dead) e.updateDead(this); else e.update(this); }
    Sound.src = null;
    if (this.rivers.length) this.drownCheck();
    this.enemyInteractions();
    if (this.cat || this.catPickups.length) this.updateCat();
    if (this.level.def.welcome && !this.welcomed) this.updateWelcome();
    for (const it of this.items) {
      it.update(this);
      if (!it.emerging && p.state === 'play' && overlap(it, p)) { it.remove = true; this.collectItem(it); }
    }
    if (!frozen) for (const f of this.fireballs) { Sound.src = f; f.update(this); }
    Sound.src = null;
    const lv = this.level;
    if (!frozen) { this.updateCrumbles(); this.updateGutBones(); }
    if (lv.stalks.length && !frozen) this.updateStalks();
    if (lv.def.wind && !frozen) this.updateWind();
    if (this.timeStop > 0 || this.timeFx) this.updateTimeStop();
    if (lv.def.clock) this.updateClock();
    if (lv.water && this.wet(p.x + p.w / 2)) { this.currentFx(); this.breathFx(); }
    if (lv.glass.length && !frozen) this.updateGlass();
    if (lv.secrets.length) this.updateSecrets();
    if (lv.def.letters) this.updateLetters();
    if (this.fireworksT > 0) this.updateFireworks();
    if (lv.def.dark) this.updateDeep();
    if (lv.def.signs && p.state === 'play') this.signCheck();
    if (lv.themeName === 'eclipse') {
      // the eclipse clears a little with every blow to UMBRAROO, and fully once it falls
      const bo = this.boss, awake = bo && bo.state !== 'sleep';
      const want = !awake ? 0 : bo.remove || bo.state === 'die' ? 1 : (1 - bo.hp / bo.maxHp) * 0.55;
      this.eclipse += (want - this.eclipse) * 0.03;
    }
    for (const b of lv.bumps) b.t++;
    if (lv.bumps.length) lv.bumps = lv.bumps.filter(b => b.t < 10);
    this.updateParticles();

    if (this.tally && ++this.tallyT > 80) { this.tally = false; this.finishLevel(); }
    this.updateCamera(false);
    for (let i = this.entities.length - 1; i >= 0; i--) if (this.entities[i].remove) this.entities.splice(i, 1);
    for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i].remove) this.items.splice(i, 1);
    for (let i = this.fireballs.length - 1; i >= 0; i--) if (this.fireballs[i].remove) this.fireballs.splice(i, 1);
  }

  updatePlayer() {
    const p = this.player, lv = this.level;
    p.prevX = p.x;
    if (p.finaleLocked) {
      if (p.finaleBounce > 0) {
        p.prevY = p.y; p.finaleBounce--;
        this.physics(p, { dir: 0, run: false, jumpHeld: false, jumpHit: false });
        if (p.onGround || !p.finaleBounce) { p.finaleBounce = 0; p.vx = p.vy = 0; }
      } else p.vx = p.vy = 0;
      p.idleT = 0; p.invuln = 9999;
      p.sx += (1 - p.sx) * 0.2; p.sy += (1 - p.sy) * 0.2;
      return;   // Watch the last-hit sequence; actors, effects and boss timing keep running.
    }
    p.prevY = p.y;
    if (this.devGod > 0) { this.devGod--; if (p.invuln < 2) p.invuln = 2; }   // (a dev warp spawn: nothing hurts him for a while)
    if (p.invuln > 0) p.invuln--;
    if (p.hotFoot > 0) p.hotFoot--;
    if (p.chewT > 0) { p.chewT--; p.chewPhase = (p.chewPhase || 0) + 1; }
    if (p.burpT > 0) p.burpT--;
    if (p.sticky > 0) p.sticky--;
    p.sx += (1 - p.sx) * 0.2; p.sy += (1 - p.sy) * 0.2;
    switch (p.state) {
      case 'play': {
        if (p.seedLift) {
          const flower = p.seedLift, targetY = flower.y + 24;
          p.vx = p.vy = 0; p.onGround = false; p.platform = null;
          const blocked = sweepY(lv, p, -Math.min(2.5, Math.max(0, p.y - targetY)));
          if (blocked || !flower.ready) p.seedLift = null;
          else if (p.y <= targetY) { p.seedLift = null; flower.onTouch(this, p); }
          break;
        }
        if (p.inPod) break;                                 // swallowed: the gulp pod holds (and fires) him
        if (p.vineCool > 0) p.vineCool--;
        if (p.vine) {
          this.swingVine(p);
          if (p.state === 'play') this.checkPlayerTiles();
          if (p.state === 'play') this.checkGoal();
          break;
        }
        if (this.tryWarp(p)) break;
        if (this.bloomRide && p.state === 'play') {   // 1-1's sunset relay: the blooms carry him, hands off (blooms.js)
          if (p.roll > 0) this.endRoll(p);
          this.bloomRide.step(this, p);
          if (p.state === 'play') this.checkPlayerTiles();
          break;
        }
        if (this.ride && p.state === 'play') {   // a ride that flies him itself (1-3's hot-air balloon: fair.js)
          if (p.roll > 0) this.endRoll(p);
          this.ride.step(this, p);
          if (p.state === 'play') this.checkPlayerTiles();
          break;
        }
        if (this.climbLadder(p)) {
          if (p.state === 'play') this.checkPlayerTiles();
          if (p.state === 'play') this.checkGoal();
          break;
        }
        if (this.cinema > 0) this.cinema--;
        // riding a pancake in flight: no getting off -- he's going all the way to the Gobbler (centred on it)
        const cake = p.platform instanceof Pancake && p.platform.state === 'fly' ? p.platform : null;
        if (cake) { p.vx = 0; p.x += (cake.x + cake.w / 2 - (p.x + p.w / 2)) * 0.2; }
        const locked = this.cinema > 0 || this.camGlide || !!cake ||   // (camGlide: held still till a camera pan's back on him)
          (this.level.def.welcome && !this.welcomed);   // (1-1's welcome note on its way: no running in ahead of it)
        this.updateCrouch(p);
        if (!locked) this.tryRoll(p);
        // keyboard auto-run winds up: a direction held AUTO_RUN_DELAY frames before he breaks into a run (taps stay a walk)
        const kdir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
        p.autoRunT = Input.autoRun() && kdir && kdir === p.autoRunDir ? (p.autoRunT || 0) + 1 : 0; p.autoRunDir = kdir;
        const steer = p.platform instanceof Carpet;   // on DJINNY's carpet (3-1) the arrows fly it: up doesn't jump, left / right don't walk
        const ctl = locked ? { dir: 0, run: false, jumpHit: false, jumpHeld: false, spinHit: false } : {
          dir: steer ? 0 : ((Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0)) * (p.teary > 0 ? -1 : 1),   // (on the carpet, left / right fly it instead; 4-1's onion tears swap them)
          run: Input.down('run') || p.autoRunT > AUTO_RUN_DELAY,   // (on a keyboard he runs on his own, after a moment)
          jumpHit: Input.hit('jump') || (Input.hit('up') && !this.held && !steer),   // up while carrying tosses the shell instead
          jumpHeld: Input.down('jump') || (Input.down('up') && !steer) || Input.down('spin'),
          spinHit: Input.hit('spin'),
        };
        this.physics(p, ctl);
        if (p.floatT > 0) this.floatSeed(p, ctl);
        if (lv.water && lv.water.dry) {
          const [lo, hi] = this.roomAt(p.x + p.w / 2);
          const exitRoom = lv.def.goal.type === 'exit' && lv.exitOpen && hi === lv.w * TILE;
          if (p.x < lo) { p.x = lo; p.vx = 0; }
          if (!exitRoom && p.x + p.w > hi) { p.x = hi - p.w; p.vx = 0; }
        }
        this.tickRoll(p);
        if (this.windForce && p.state === 'play') sweepX(this.level, p, this.windForce * (p.onGround ? 0.7 : 1));
        if (!locked) this.updatePowers(p);
        if (p.state === 'play') this.checkPlayerTiles();
        if (p.state === 'play') this.checkGoal();
        break;
      }
      case 'warp': this.updateWarp(p); break;
      case 'celebrate':
        this.physics(p, { dir: 0, run: false, jumpHit: false, jumpHeld: false });
        p.celebT++;
        if (p.celebT === 150) { p.state = 'done'; this.startTally(); }
        break;
      case 'done':
        if (!p.hidden) this.physics(p, { dir: 0, run: false, jumpHit: false, jumpHeld: false });
        p.celebT++;   // keep holding the discovery pose until the clear screen
        break;
    }
    // Checkpoint
    const cp = checkpoints(lv.def)[this.checkpointReached];
    if (cp && p.state === 'play' && p.x > cp * TILE) {
      this.checkpointReached++;
      Sound.play('checkpoint');
      const cr = cpRow(lv, this.checkpointReached - 1);
      this.popup(cp * TILE + 8, cr * TILE - 40, 'CHECKPOINT');
      this.burst(cp * TILE + 8, cr * TILE - 24, ['#2ec4b6', '#ffd166', '#ffffff'], 12);
    }
  }

  // Core platforming physics. `ctl` is {dir, run, jumpHit, jumpHeld}.
  physics(p, ctl) {
    const lv = this.level;
    this.unstick(p);
    if (p.platform) { sweepX(lv, p, p.platform.dx); p.y += p.platform.dy; }
    if (p.dropT > 0) p.dropT--;
    if (p.onGround && ctl.jumpHit && !ctl.spinHit && Input.down('down')) {
      const foot = p.y + p.h, row = Math.round(foot / TILE);
      const cols = [Math.floor(p.x / TILE), Math.floor((p.x + p.w - 0.01) / TILE)];
      const ledge = Math.abs(foot - row * TILE) < 1 && cols.some(c => lv.get(c, row) === T.SEMI) && !cols.some(c => lv.solid(c, row));
      if ((p.platform && !p.platform.body) || ledge) {
        p.dropPlatform = p.platform; p.dropY = foot; p.dropT = 20;
        p.onGround = false; p.platform = null; p.coyote = p.jumpBuf = p.holdGrace = 0;
        p.jumping = p.spin = p.spinQueued = p.pounding = false; p.vy = 1;
        ctl = { ...ctl, jumpHit: false, jumpHeld: false, spinHit: false };
      }
    }

    if (this.wet(p.x + p.w / 2)) this.swim(p, ctl);
    else {
      // Horizontal: momentum with walk/run caps, skidding and friction
      // ducking on the ground: no walking (just turn around), slide on with reduced friction.
      // If forced to crouch under a low ceiling (or if directing left/right while crouched), allow crawling out!
      const rolling = p.roll > 0;
      const crawl = p.crouch && p.onGround;
      const duckingStill = crawl && Input.down('down') && !ctl.dir;
      const dir = rolling || duckingStill || p.blast > 0 ? 0 : ctl.dir;
      if (crawl && ctl.dir) p.facing = ctl.dir;
      if (rolling) {
        if (p.onGround) { const target = p.rollDir * p.rollSpeed * (p.roll < 6 ? 0.6 + p.roll * 0.066 : 1); p.vx += (target - p.vx) * 0.25; }
        p.skid = false; p.airMax = Math.abs(p.vx);
      } else if (p.onGround) {
        // (4-1's okra slime: quicker, but slippy)
        const baseSpeed = crawl ? (ctl.run ? 1.4 : 0.85) : (ctl.run ? RUN_MAX : WALK_MAX);
        const max = baseSpeed * (p.fluke ? FLUKE_RUN : 1) * (p.sticky > 0 ? STICKY_RUN : 1) * (p.slimy > 0 ? SLIME_RUN : 1);   // (a fluke on his back, or enzyme goo, slows him down)
        const ice = this.onIce(p) || (p.platform && p.platform.slick) || (p.slimy > 0) ? 1 : 0;   // ice (or 3-4's slime chutes, 4-1's okra slime): weak grip both ways
        p.skid = false;
        if (dir !== 0) {
          p.facing = dir;
          const sp = Math.abs(p.vx);
          if (p.vx * dir < 0) {
            p.vx += dir * SKID * (ice ? 0.3 : 1); p.skid = true;
            if (this.t % 5 === 0) this.dust(p.x + p.w / 2, p.y + p.h, 1);
          } else if (sp <= max) p.vx = dir * Math.min(max, sp + (crawl ? ACCEL * 0.6 : (sp < WALK_MAX ? ACCEL : RUN_ACCEL)) * (ice ? 0.4 : 1));
          else p.vx -= Math.sign(p.vx) * Math.min(FRICTION * (ice ? 0.15 : 1), sp - max);
        } else {
          const s = Math.abs(p.vx) - (crawl ? FRICTION * 0.5 : FRICTION) * (ice ? 0.15 : 1);
          if (ice && Math.abs(p.vx) > 0.6 && this.t % 4 === 0) this.spark(p.x + p.w / 2, p.y + p.h - 1, '#e6f6ff', 14, -p.vx * 0.2, -0.3);
          p.vx = s > 0 ? Math.sign(p.vx) * s : 0;
        }
        p.airMax = Math.max(WALK_MAX, Math.abs(p.vx));
        p.anim += Math.abs(p.vx) * 0.11;
      } else if (dir !== 0) {
        const turn = p.springAir ? SPRING_AIR_TURN : AIR_TURN, accel = p.springAir ? SPRING_AIR_ACCEL : AIR_ACCEL;
        if (p.vx * dir < 0) p.vx += dir * turn;
        else if (Math.abs(p.vx) < p.airMax) p.vx = dir * Math.min(p.airMax, Math.abs(p.vx) + accel);
        p.facing = dir;
      } else if (p.springAir) {
        p.vx *= SPRING_AIR_DRAG;          // let go of the stick to settle over a landing spot
      }
      if (p.sand > 0) { p.vx = clamp(p.vx, -SAND_SPEED, SAND_SPEED); p.skid = false; }   // wading

      // Jump: buffer + coyote time; jump height scales with horizontal speed
      if (p.vy >= 0) p.sheepBounce = false;
      if (ctl.jumpHit || ctl.spinHit) {
        p.jumpBuf = JUMP_BUFFER; p.spinQueued = !!ctl.spinHit && !this.held; p.pressT = this.t;
        // pressed just AFTER a small stomp bounce: upgrade it to the full jump
        if (p.stompSmall && this.t - p.stompT <= STOMP_LATE && p.vy < 0) {
          // top up to the same total rise as a full jump, counting what we've already climbed
          const vFull = (JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS), hFull = vFull * vFull / (2 * GRAV_HOLD);
          const left = Math.max(10, hFull - Math.max(0, p.stompY - p.y));
          p.vy = Math.min(p.vy, -Math.min(vFull, Math.sqrt(2 * GRAV_HOLD * left)));
          p.holdGrace = 34; p.jumping = true; p.stompSmall = false; p.jumpBuf = 0;
        }
      } else if (p.jumpBuf > 0) p.jumpBuf--;
      if (p.onGround || rolling) p.coyote = COYOTE; else if (p.coyote > 0) p.coyote--;
      if (p.jumpBuf > 0 && p.coyote > 0) {
        if (rolling) { this.endRoll(p); p.crouch = false; }       // roll-jump: keep the speed
        // out of quicksand only a weak hop, weaker the deeper you've sunk
        const v = p.sand > 0 ? Math.max(2.2, SAND_JUMP - p.sand * SAND_JUMP_LOSS) : (JUMP_BASE + Math.min(Math.abs(p.vx), ROLL_MAX) * JUMP_BONUS);   // (no taller than a roll-jump, however fast: 4-1's hot sauce)
        if (p.sand > 0) this.sandPuff(p.x + p.w / 2, p.y + p.h - p.sand, 5, -1.6);
        p.vy = -v * (p.spinQueued ? SPIN_JUMP : 1) * (p.fluke ? FLUKE_JUMP : 1) * (p.sticky > 0 ? STICKY_JUMP : 1);
        if (p.platform && p.platform.lift && p.platform.dy < 0) p.vy += p.platform.dy * p.platform.lift;   // off a rising tuba valve: it adds its kick
        p.spin = p.spinQueued; p.spinQueued = false;
        if (p.spin) { this.standUp(p); Sound.play('spin'); }
        p.jumping = true; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.platform = null;
        if (this.clockJump) {
          this.setClock(1 - this.clockPhase); Sound.play('clockSwap');
          for (const e of this.entities) if (e.onClockJump) e.onClockJump(this);
        }   // the broken clock ticks on every real jump; flaps and bounces don't wind the final wheels
        p.airMax = Math.max((ctl.run || Math.abs(p.vx) > WALK_MAX + 0.05) ? RUN_MAX : WALK_MAX, Math.abs(p.vx));
        p.sx = 0.78; p.sy = 1.24;
        if (!p.spin) Sound.play(p.power ? 'jumpBig' : 'jump');
        this.dust(p.x + p.w / 2, p.y + p.h, 3);
      }
      // a flap of the wings: one little boost per hop (stronger with the gale feather). A press just
      // before touching down is left in the buffer to jump on landing instead.
      if (p.onGround || rolling) p.flaps = 0;
      else if (ctl.jumpHit && p.jumpBuf === JUMP_BUFFER && !p.sheepBounce && !p.flaps && !p.spin && !p.pounding && !p.blast && !p.vine && !p.floatT && !this.aboutToLand(p)) {
        const gale = p.power === 2 && p.suit === 'gale';
        p.vy = Math.min(p.vy, -(gale ? GALE_FLAP_LIFT : FLAP_LIFT));
        p.flaps = 1; p.flapT = FLAP_ANIM; p.jumping = true; p.holdGrace = 0; p.jumpBuf = 0; p.coyote = 0;
        p.sx = 0.9; p.sy = 1.15;
        Sound.play('flap');
        for (let i = 0; i < 6; i++) this.spark(p.x + p.w / 2 + rand(-8, 8), p.y + p.h, i % 2 ? '#ffffff' : gale ? '#9ae8a8' : '#fff3b0', 20, rand(-0.6, 0.6), rand(0.2, 1));
      }
      if (p.flapT > 0) p.flapT--;

      // Gravity: light while rising with jump held, heavy otherwise (variable height)
      if (p.holdGrace > 0) p.holdGrace--;
      if (!ctl.jumpHeld && !p.holdGrace) p.jumping = false;
      if (p.sheepBounce) p.jumping = false;
      let g = p.vy < 0 && p.jumping ? GRAV_HOLD : GRAV;
      if (p.jumping && Math.abs(p.vy) < 1) g = Math.min(g, GRAV_APEX);
      if (p.blast > 0) { p.blast--; p.rollSpin += Math.hypot(p.vx, p.vy) / 8 * (p.vx < 0 ? -1 : 1); }   // shot from a gulp pod: a straight flight
      else p.vy = Math.min(p.vy + g, MAX_FALL);
      if (p.sand > 0 && p.vy > SAND_SINK) p.vy = SAND_SINK;   // quicksand: a slow, steady sink
      // gale feather: hold jump while falling to glide
      p.gliding = p.power === 2 && p.suit === 'gale' && ctl.jumpHeld && p.vy > 0.75 && !p.onGround && !p.pounding && !p.blast;
      if (p.gliding) { p.vy = 0.75; p.airMax = Math.max(p.airMax, 1.7); }
      // quake mallet: hang for a beat, then slam straight down
      if (p.pounding && p.vy < 0) p.pounding = false;   // bounced off something (a stomp, a sheep, a spring): the pound is over
      if (p.pounding) { p.vx = 0; p.vy = ++p.poundT <= POUND_HANG ? 0 : POUND_SPEED; }
    }

    const ox = p.x;
    if (sweepX(lv, p, p.vx)) {
      // Ledge assist: if we clip a ledge corner by a few pixels while falling, pop up onto it.
      let assisted = false;
      if (p.sand > 0 && p.sand <= 6) {
        // barely sunk: step up out of the sand onto the bank
        const sx = p.x, sy = p.y;
        p.x = ox; p.y -= p.sand + 0.5;
        if (!this.overlapsSolid(p) && !sweepX(lv, p, p.vx)) { assisted = true; p.sand = 0; }
        else { p.x = sx; p.y = sy; }
      }
      // (on the way up too: a jump that clips a ledge's corner with its feet carries on over it, keeping its speed
      // and its rise, instead of stalling against the side)
      if (!assisted && !p.onGround) {
        const bottom = p.y + p.h, top = Math.floor((bottom - 0.01) / TILE) * TILE;
        if (bottom - top <= 6) {
          const sx = p.x, sy = p.y;
          p.x = ox; p.y = top - p.h;
          if (!this.overlapsSolid(p) && !sweepX(lv, p, p.vx)) { assisted = true; if (p.vy >= 0) p.vy = 0.01; }
          else { p.x = sx; p.y = sy; }
        }
      }
      if (!assisted) { p.vx = 0; p.skid = false; p.blast = 0; }
    }

    // Vertical, resolved by hand: semi-solids, moving platforms, hidden blocks,
    // head-bonks and corner correction.
    const prevTop = p.y, prevBottom = p.y + p.h;
    p.y += p.vy;
    let landed = false;
    const prevPlat = p.platform;
    p.platform = null;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    if (p.vy > 0) {
      let landY = Infinity, plat = null, smashed = false;
      const r = Math.floor((p.y + p.h) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (p.spin && p.power > 0 && lv.get(c, r) === T.BRICK) { lv.set(c, r, T.EMPTY); this.breakBrick(c, r); smashed = true; continue; }
        if (lv.solid(c, r) || (lv.get(c, r) === T.SEMI && !(p.dropT > 0 && Math.abs(r * TILE - p.dropY) < 1) && prevBottom <= r * TILE + 0.5)) { landY = r * TILE; break; }
      }
      for (const cap of lv.secretCaps) {
        if (p.x + p.w > cap.x && p.x < cap.x + cap.w && prevBottom <= cap.y + 0.5 && p.y + p.h >= cap.y) landY = Math.min(landY, cap.y);
      }
      for (const pl of this.platforms) {
        if (p.dropT > 0 && (pl === p.dropPlatform || Math.abs(pl.y - p.dropY) < 1)) continue;
        if (!pl.ghost && p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1 && (prevBottom <= Math.max(pl.y, pl.prevY) + 1 || (pl.stepUp && p.onGround && prevBottom <= pl.y + pl.h + 2)) && p.y + p.h >= pl.y && (pl.y < landY || (pl.y <= landY && (pl === prevPlat || plat === null)))) {
          landY = pl.y; plat = pl;
        }
      }
      if (smashed) {
        // spin-smashing a crate pops Chickaroo back up off the debris, still spinning (classic)
        // same launch as the spin jump itself (same speed formula, same hold-to-rise)
        p.y = r * TILE - p.h; p.vy = -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS) * SPIN_JUMP; p.jumping = true; p.platform = null;
        this.dust(p.x + p.w / 2, r * TILE, 5);
      } else if (landY !== Infinity) { p.fallV = p.vy; p.y = landY - p.h; landed = true; p.platform = plat; }
    } else if (p.vy < 0) {
      for (const cap of lv.secretCaps) {
        if (p.x + p.w > cap.x && p.x < cap.x + cap.w && prevTop >= cap.y + cap.h - 0.5 && p.y < cap.y + cap.h) {
          p.y = cap.y + cap.h; p.vy = 0.8; p.jumping = false; p.blast = 0;
        }
      }
      const r = Math.floor(p.y / TILE);
      const blocking = [];
      for (let c = c0; c <= c1; c++) {
        if (lv.solid(c, r) || (lv.get(c, r) === T.HIDDEN && prevTop >= (r + 1) * TILE - 0.5)) blocking.push(c);
      }
      if (blocking.length) {
        let corrected = false;
        if (blocking.length === 1 && c0 !== c1 && lv.get(blocking[0], r) !== T.HIDDEN) {
          const c = blocking[0];
          if (c === c0) { const o = (c + 1) * TILE - p.x; if (o <= 5) { p.x += o; corrected = true; } }
          else { const o = p.x + p.w - c * TILE; if (o <= 5) { p.x -= o; corrected = true; } }
        }
        if (!corrected) {
          p.y = (r + 1) * TILE;
          p.vy = 0.8;
          p.jumping = false; p.blast = 0;
          const pc = Math.floor((p.x + p.w / 2) / TILE);
          this.hitBlock(blocking.includes(pc) ? pc : blocking[0], r);
        }
      }
    }
    if (this.wet(p.x + p.w / 2) && p.y < lv.water.top * TILE) { p.y = lv.water.top * TILE; if (p.vy < 0) p.vy = 0; }
    const was = p.onGround;
    p.onGround = landed;
    // quicksand: wading counts as standing (you can hop), but you keep sinking
    const wasSand = p.sand;
    p.sand = landed || this.wet(p.x + p.w / 2) ? 0 : this.sandDepth(p.x + p.w / 2, p.y + p.h);
    if (p.sand > 0 && p.vy >= 0) {
      p.onGround = true; p.jumping = false; p.combo = 0; p.springAir = false; p.spin = false; p.pounding = false; p.platform = null;
      if (!wasSand) { this.sandPuff(p.x + p.w / 2, p.y + p.h - p.sand, 8, -1.8); Sound.play('sandsink'); }
      else if (this.t % (Math.abs(p.vx) > 0.2 ? 5 : 14) === 0) this.sandPuff(p.x + p.w / 2 + rand(-5, 5), p.y + p.h - p.sand, 1);
    }
    if (landed) {
      if (!was) {
        const imp = p.fallV;
        p.sx = 1 + Math.min(0.3, imp * 0.06); p.sy = 1 - Math.min(0.25, imp * 0.05);
        if (imp > 3.5) this.dust(p.x + p.w / 2, p.y + p.h, 4);
      }
      p.vy = 0; p.jumping = false; p.combo = 0; p.springAir = false; p.spin = false; p.blast = 0;
      if (p.podFlight) { p.podFlight = false; p.vx = clamp(p.vx, -WALK_MAX, WALK_MAX); }   // touch down from a pod shot without skating off
      if (p.pounding) this.poundLand(p);
      if (!p.platform) this.coalHop(p, ctl);
    }
  }
  // Hot coals: nobody stands still on these. Every landing bounces Chickaroo straight back up: a
  // little OW! hop, or -- with jump held (or pressed just before touching down) -- a big HOTFOOT
  // leap, higher than any normal jump. Some ledges in the Ember Citadel can only be reached that way.
  coalHop(p, ctl) {
    const lv = this.level, r = Math.round((p.y + p.h) / TILE);
    let hot = false;
    for (let c = Math.floor(p.x / TILE); c <= Math.floor((p.x + p.w - 0.01) / TILE); c++) if (lv.get(c, r) === T.COAL) hot = true;
    if (!hot) return;
    if (p.roll > 0) this.endRoll(p);
    const leap = ctl.jumpHeld || p.jumpBuf > 0, x = p.x + p.w / 2, y = p.y + p.h;
    p.onGround = false; p.platform = null; p.coyote = 0; p.jumpBuf = 0; p.holdGrace = 0;
    p.airMax = Math.max(ctl.run ? RUN_MAX : WALK_MAX, Math.abs(p.vx));
    if (leap) {
      const boost = (lv.def.coalBoost || []).find(([from, to]) => x >= from * TILE && x < (to + 1) * TILE)?.[2] || 1;
      p.vy = -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS) * COAL_LEAP * boost; p.jumping = true;
      Sound.play('ow'); Sound.play('jumpBig');
      this.burst(x, y, ['#ff6a1f', '#ffd166', '#ffe08a'], 8);
      if (!lv.leapTold) { lv.leapTold = true; this.popup(x, p.y - 8, 'HOTFOOT!', '#ffd166'); }
    } else {
      p.vy = -COAL_HOP; p.jumping = false;
      Sound.play('ow');
      const n = (lv.ows = (lv.ows || 0) + 1);
      if (n % 3 === 1) this.popup(x, p.y - 6, ['OW!', 'OUCH!', 'HOT HOT!', 'OW OW!', 'EEP!'][(n >> 2) % 5], '#ffb347');
    }
    this.hotFootReaction(p);
    // the tip only for someone still hopping about the same coals 3 s after first landing on them
    // (anyone who's worked out the leap is long gone by then)
    if (!lv.coalFirst) lv.coalFirst = { t: this.t, x };
    else if (!lv.coalTold && this.t - lv.coalFirst.t >= 180 && Math.abs(x - lv.coalFirst.x) < 12 * TILE) {
      lv.coalTold = true; this.say('HOT COALS!', 'HOLD JUMP FOR A BIG HOTFOOT LEAP', '#ffb347');
    }
  }

  // Shared visual reaction for hot coals and hot liquid; the caller controls damage and movement.
  hotFootReaction(p) {
    const x = p.x + p.w / 2, y = p.y + p.h;
    p.hotFoot = 24;
    p.sx = 0.8; p.sy = 1.25;
    for (let i = 0; i < 5; i++) this.particles.push({ kind: 'px', x: x + rand(-5, 5), y: y - 1, vx: rand(-0.5, 0.5), vy: rand(-1.4, -0.4), g: -0.01, drag: 0.95, life: 26 + rand(0, 12), t: 0, color: i % 2 ? '#8a7a8a' : '#c8b8b8', size: 2 });
  }

  // Falling onto the floor (or a semi-solid ledge, a platform, a foe to stomp) soon enough that a jump pressed now is
  // still in the buffer when he lands: about to land anyway, so the press is a jump on landing, not a flap. It looks
  // ahead along his actual fall (LAND_LOOK frames of it), so a fast fall gets the same window as a slow one.
  aboutToLand(p) {
    if (p.vy <= 0) return false;
    let d = 0, v = p.vy;
    for (let k = 0; k < LAND_LOOK; k++) { v = Math.min(v + GRAV, MAX_FALL); d += v; }
    d = Math.max(d, 10);
    const lv = this.level, foot = p.y + p.h;
    for (let r = Math.floor(foot / TILE); r <= Math.floor((foot + d) / TILE); r++) {
      if (r * TILE < foot - 0.5) continue;   // (a row he's already level with isn't a floor under him)
      for (const x of [p.x + 1, p.x + p.w - 1]) { const c = Math.floor(x / TILE); if (lv.solid(c, r) || lv.get(c, r) === T.SEMI) return true; }
    }
    if (this.platforms.some(pl => !pl.ghost && p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1 && pl.y >= foot - 1 && pl.y <= foot + d)) return true;
    const below = { x: p.x, y: foot, w: p.w, h: Math.max(14, d) };
    return this.entities.some(e => { if (!e.stompable || e.dead) return false; const hb = e.hitbox(); return !!hb && overlap(below, hb); });
  }
  // Underwater: slow drift, every jump press is a swim stroke, gentle sinking, and
  // currents push the player around. Collisions are shared with land physics.
  swim(p, ctl) {
    const lv = this.level, dir = ctl.dir;
    const max = ctl.run ? (p.onGround ? SWIM_RUN_WALK : SWIM_RUN_MAX) : (p.onGround ? SWIM_WALK : SWIM_MAX);
    const accel = ctl.run ? SWIM_RUN_ACCEL : SWIM_ACCEL;
    p.skid = false;
    if (dir) {
      p.facing = dir;
      if (p.vx * dir < 0) p.vx += dir * SWIM_TURN;
      else if (Math.abs(p.vx) <= max) p.vx = dir * Math.min(max, Math.abs(p.vx) + accel);
      else p.vx -= Math.sign(p.vx) * SWIM_DRAG;
    } else {
      const sp = Math.abs(p.vx) - (p.onGround ? FRICTION : SWIM_DRAG);
      p.vx = sp > 0 ? Math.sign(p.vx) * sp : 0;
    }
    if (p.onGround) p.anim += Math.abs(p.vx) * 0.11;
    if (p.stroke > 0) p.stroke--;
    if (ctl.jumpHit) {
      p.vy = Math.min(p.vy, SWIM_STROKE);
      p.onGround = false; p.platform = null; p.stroke = 14;
      p.sx = 0.85; p.sy = 1.15;
      Sound.play('swim');
      this.spark(p.x + p.w / 2, p.y + 4, '#cdefff', 24, rand(-0.3, 0.3), -0.6);
    }
    p.jumping = false;
    p.vy = Math.min(p.vy + SWIM_GRAV, SWIM_SINK);
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    if(this.whirlpoolFlow(p,ctl))return;
    for (const [x0, x1, fx, fy, y0 = 0, y1 = ROWS - 1] of lv.def.currents || []) {
      if (cx < x0 * TILE || cx >= (x1 + 1) * TILE || cy < y0 * TILE || cy >= (y1 + 1) * TILE) continue;
      if (fx) sweepX(lv, p, fx);
      if (fy) { p.vy = clamp(p.vy + fy, -3, SWIM_SINK + 0.6); if (fy < 0) p.onGround = false; }
    }
  }
  // Drifting under a glider (dandelion seed, PETE's brolly, 4-1's bay leaf -- all the same): a slow, gentle fall with
  // a light breeze, steerable. Brollies and dandelion seeds expire after their float timer; bay leaves stay until his
  // feet touch down or he grabs a vine; down glides faster, never lets go. Jump flaps for a floaty bounce up, on the very frame it's pressed: as many as he likes, up to the
  // top of the screen, but at most GLIDE_BURST in a quick row before a short breather (a press during it is kept and
  // flaps the moment it's over).
  floatSeed(p, ctl) {
    const isBrolly = p.chute === 'brolly', isLeaf = p.chute === 'leaf';
    const isSeed = p.chute === 'seed' || (!p.chute && p.chute !== 'leaf');
    if (isLeaf && --p.floatT <= 0) {   // the bay leaf dries out like the brolly (updateGumbo crumbles it)
      Sound.play('whoosh');
      p.vy = Math.max(0, p.vy);
      p.floatT = 0; p.chute = null; p.flapN = p.flapCool = p.flapGap = p.flapBuf = 0; p.flapRise = false;
      return;
    }
    if ((isBrolly || isSeed) && --p.floatT <= 0) {
      this.burst(p.x + p.w / 2, p.y - 18, isBrolly ? ['#ffffff', '#ff4d6d'] : ['#ffffff', '#f4f6ff', '#e0d8c0'], 14);
      Sound.play('whoosh');
      p.vy = Math.max(0, p.vy);
      p.floatT = 0; p.chute = null; p.flapN = p.flapCool = p.flapGap = p.flapBuf = 0; p.flapRise = false;
      return;
    }
    if (p.onGround || p.vine) { p.floatT = 0; p.chute = null; p.flapN = p.flapCool = p.flapGap = p.flapBuf = 0; p.flapRise = false; return; }
    if (isBrolly && p.floatT === BROLLY_WARN) {
      this.popup(p.x + p.w / 2, p.y - 32, 'BROLLY GIVING OUT!', '#ffd166');
      Sound.play('bump');
    }
    if (isLeaf && p.floatT === LEAF_WARN) {
      this.popup(p.x + p.w / 2, p.y - 32, 'LEAF GIVING OUT!', '#ffd166');
      Sound.play('bump');
    }
    if (isSeed && p.floatT === DANDELION_WARN) {
      this.popup(p.x + p.w / 2, p.y - 32, 'SEED GIVING OUT!', '#ffd166');
      Sound.play('bump');
    }
    if (isSeed && p.floatT <= DANDELION_WARN && (p.floatT % 4 === 0)) {
      this.particles.push({ kind: 'px', x: p.x + p.w / 2 + rand(-6, 6), y: p.y - 14 + rand(-2, 2), vx: rand(-0.4, 0.4), vy: rand(-0.2, 0.6), life: 24, t: 0, color: '#ffffff', size: 1 });
    }
    p.flapN |= 0; p.flapCool |= 0; p.flapGap |= 0; p.flapBuf |= 0;
    if (p.flapCool > 0) p.flapCool--;
    if (p.flapBuf > 0) p.flapBuf--;
    if (++p.flapGap > GLIDE_CHAIN) p.flapN = 0;   // (a breather of his own: the next flap starts a fresh burst)
    if (ctl.jumpHit) p.flapBuf = GLIDE_BUF;
    if (p.flapBuf > 0 && !p.flapCool) {
      // a flap of the wings: a soft bounce up under the glider (flaps in quick succession stack, up to a cap)
      p.vy = Math.max(GLIDE_FLAP_MAX, Math.min(p.vy, 0) + GLIDE_FLAP); p.jumping = false; p.flapRise = true;
      p.flapBuf = 0; p.flapGap = 0;
      if (++p.flapN >= GLIDE_BURST) { p.flapN = 0; p.flapCool = GLIDE_COOL; }
      for (let i = 0; i < 4; i++) this.particles.push({ kind: 'px', x: p.x + p.w / 2 + rand(-6, 6), y: p.y + p.h, vx: rand(-0.4, 0.4), vy: rand(0.3, 0.9), life: 18, t: 0, color: '#ffffff', size: 1 });
      p.sx = 0.9; p.sy = 1.12;
      Sound.play('flap');
    }
    // (capped below the fall speed less the gravity physics() adds next frame, so he really falls this slowly; on the
    // way up from a flap, most of that gravity is taken back again, so the bounce rises and eases off gently)
    if (p.vy >= 0) p.flapRise = false;
    if (p.flapRise) p.vy -= GRAV * (1 - GLIDE_FLAP_GRAV);
    const sinkEase = (isSeed && p.floatT <= DANDELION_WARN) ? (1 - p.floatT / DANDELION_WARN) * 0.08 : 0;
    const dive = Input.down('down') ? GLIDE_DIVE : 0;   // down never lets go or pounds: it just glides down faster
    p.vy = Math.min(p.vy, 0.28 + sinkEase + dive + Math.sin(this.t * 0.05) * 0.06 - GRAV);
    // the top of the screen: any rise eases to a stop just as his head reaches it (the next frame's gravity included)
    if (p.vy < 0) p.vy = Math.max(p.vy, -Math.max(0, p.y - GLIDE_TOP) * 0.25 - GRAV);
    const target = ctl.dir ? ctl.dir * 1.6 : p.chute === 'leaf' ? 0 : 1.2;   // the breeze carries him right (not under 4-1's bay leaf); steering flies him either way at the same speed
    p.vx += (target - p.vx) * 0.06;
    if (ctl.dir) p.facing = ctl.dir;
    if (this.t % 9 === 0) this.particles.push({ kind: 'px', x: p.x + p.w / 2 + rand(-8, 8), y: p.y - 12, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.1), life: 30, t: 0, color: '#ffffff', size: 1 });
  }
  onIce(p) {
    const lv = this.level, r = Math.floor((p.y + p.h + 1) / TILE);
    for (let c = Math.floor(p.x / TILE); c <= Math.floor((p.x + p.w - 0.01) / TILE); c++) if (lv.get(c, r) === T.ICE) return true;
    return false;
  }
  // Wind cycle: calm -> warning -> gust (ramping in and out). Gusts alternate direction.
  updateWind() {
    const wind = this.level.def.wind;
    if (wind.tailwindAt != null && this.player.x + this.player.w / 2 >= wind.tailwindAt * TILE && !this.windLock) {
      this.windLock = 1; this.windMul = wind.tailwindMul || 1;
      this.windDir = 1; this.windT = 0;
    }
    // Tailwind sections retain the normal warning and gust cycle.
    const w = this.level.def.wind, calm = this.windLock ? Math.min(w.calm, 100) : w.calm, cyc = calm + w.warn + w.gust, k = (++this.windT) % cyc;
    if (k === 1) this.windDir = this.windLock || (this.windDir === -1 ? 1 : -1);
    this.windPhase = k < calm ? 'calm' : k < calm + w.warn ? 'warn' : 'gust';
    if (k === calm) Sound.play('gustWarn');
    if (k === calm + w.warn) Sound.play('gust');
    const gk = k - calm - w.warn;
    const ramp = this.windPhase === 'gust' ? Math.max(0, Math.min(1, gk / 20, (w.gust - gk) / 20)) : 0;
    this.windForce = this.windDir * w.force * this.windMul * ramp;
    if (this.windPhase !== 'calm' && this.t % (this.windPhase === 'gust' ? 1 : 4) === 0) {
      const fromX = this.windDir > 0 ? this.camX - 10 : this.camX + VIEW_W + 10;
      this.particles.push({ kind: 'px', x: fromX, y: rand(16, VIEW_H - 16), vx: this.windDir * rand(4, 7), vy: rand(-0.2, 0.2), life: 90, t: 0, color: '#e6f2ff', size: 1, streak: this.windPhase === 'gust' ? 8 : 4 });
    }
  }
  // Duck while down is held on the ground (SMW): a shorter hitbox. A crouch-jump stays
  // crouched until landing, and we only stand back up where there is headroom.
  // Roll, DKC-style: press roll on the ground to tuck into a fast, low, spinning
  // ball that bowls over stompable enemies (each hit extends and speeds up the roll). Jumping
  // out of a roll -- even just after rolling off a ledge -- gives a fast, long jump.
  tryRoll(p) {
    if (p.rollCool > 0) p.rollCool--;
    // mashing roll mid-roll keeps the ball going: each press refills the roll timer
    if (p.roll > 0 && Input.hit('roll')) { p.roll = Math.max(p.roll, ROLL_T); return; }   // (silently: the sound is the roll starting)
    if (p.roll > 0 ||p.rollCool > 0 || !Input.hit('roll')) return;
    if (!p.onGround || this.held || this.wet(p.x + p.w / 2) || p.sand > 0) return;   // (ducking is fine: roll out of a duck -- and never stuck crouched in a low tunnel)
    const dir = ((Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0)) || p.facing;
    p.roll = ROLL_T; p.rollDir = dir; p.facing = dir; p.skid = false; p.rollAge = 0;
    p.rollSpeed = Math.min(ROLL_MAX, Math.max(ROLL_SPEED, Math.abs(p.vx) + 0.3));
    const low = p.power ? CROUCH_BIG_H : CROUCH_SMALL_H;
    p.y += p.h - low; p.h = low;
    Sound.play('roll');
    this.dust(p.x + p.w / 2, p.y + p.h, 5);
  }
  tickRoll(p) {
    if (p.roll <= 0) return;
    p.rollAge = (p.rollAge || 0) + 1;
    p.rollSpin += p.vx / (p.power ? 8.5 : 7);   // (turning just as fast as it rolls along the ground: no slipping)
    if (p.onGround && this.t % 6 === 0) this.dust(p.x + p.w / 2 - p.rollDir * 5, p.y + p.h, 1);
    // rolling into a wooden crate smashes it, and the roll carries on through
    const lv = this.level, c = Math.floor((p.rollDir > 0 ? p.x + p.w + 1 : p.x - 1) / TILE);
    for (let r = Math.floor(p.y / TILE); r <= Math.floor((p.y + p.h - 1) / TILE); r++) {
      this.smashCrate(c, r);
    }
    // rolled into a wall: a soft bump (a squash against it, a puff, a thud; no bouncing back) and the roll's over
    const wc = Math.floor((p.rollDir > 0 ? p.x + p.w + 0.5 : p.x - 0.5) / TILE);
    for (let r = Math.floor(p.y / TILE); r <= Math.floor((p.y + p.h - 1) / TILE); r++) {
      if (!lv.solid(wc, r)) continue;
      p.vx = 0; this.endRoll(p);
      p.sx = 0.86; p.sy = 1.1;
      this.dust(p.rollDir > 0 ? p.x + p.w : p.x, p.y + p.h - 4, 3);
      Sound.play('bump');
      return;
    }
    if (--p.roll <= 0) this.endRoll(p);
  }
  // Uncurl: back to full height where there is room, otherwise stay ducked.
  endRoll(p) {
    if (p.roll > 0 || p.rollSpeed) { p.roll = 0; p.rollCool = ROLL_COOL; }
    p.rollSpeed = 0;
    const full = p.power ? BIG_H : SMALL_H;
    if (p.h === full || p.crouch) return;
    const oy = p.y, oh = p.h;
    p.y = oy + oh - full; p.h = full;
    if (this.overlapsSolid(p)) { p.y = oy; p.h = oh; p.crouch = true; }
  }
  // Ladders (enemies-misc.js): in front of one, up grabs it (so does down, standing at its top). On it
  // there's no gravity: up/down climb, left/right step off, jump lets go. Off the top he stands at its head.
  climbLadder(p) {
    const up = Input.down('up'), down = Input.down('down'), cx = p.x + p.w / 2;
    let L = p.ladder;
    if (!L) {
      const near = this.entities.find(e => e instanceof Ladder && Math.abs(cx - e.cx) < 8 && p.y + p.h > e.y - 2 && p.y < e.y + e.h - 4);
      this.nearLadder = !!near;
      if (!near || !(up || down) || this.held || p.roll > 0 || p.inPod || p.vine) return false;
      const atTop = p.y + p.h <= near.y + 2;
      if (up && atTop) return false;                       // at the top already: up is just a jump
      if (down && !up && !(atTop && p.onGround)) return false;   // down grabs it only from the top
      L = p.ladder = near;
      p.vx = 0; p.vy = 0; p.climbA = 0; p.jumping = false; p.pounding = false; p.charge = 0;
      if (p.crouch) { p.crouch = false; const h = p.power ? BIG_H : SMALL_H; p.y += p.h - h; p.h = h; }
    }
    this.nearLadder = true;
    p.prevY = p.y; p.onGround = false; p.platform = null; p.coyote = 0; p.vx = 0; p.vy = 0;
    p.x += (L.cx - p.w / 2 - p.x) * 0.4;                    // hands on the rails
    if (Input.hit('jump') || Input.hit('spin')) {            // let go with a hop
      p.ladder = null; p.vy = -JUMP_BASE * 0.75; p.jumping = true;
      const dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
      if (dir) { p.vx = dir * 1.2; p.facing = dir; }
      Sound.play('jump');
      return true;
    }
    const side = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    if (side && !up && !down) { p.ladder = null; p.vx = side * 0.8; p.facing = side; return false; }   // step off sideways
    const dy = (down ? 1 : 0) - (up ? 1 : 0);
    if (dy) { p.y += dy * LADDER_SPEED; p.climbA += LADDER_SPEED; }
    if (p.y + p.h <= L.y) { p.y = L.y - p.h; p.ladder = null; p.onGround = true; return true; }   // over the top: standing at its head
    const foot = L.y + L.h;
    if (p.y + p.h >= foot) { p.y = foot - p.h; if (down) p.ladder = null; }                         // feet on the ground below
    return true;
  }
  // Spin jump landing on an enemy: stompable foes vanish in a puff of smoke; spiky ones (hedgehogs,
  // urchins, log-worms) are a safe springboard. Fire, hazards and the boss work as usual.
  spinHit(e) {
    const p = this.player;
    if (e.passive) return false;                    // lamps and cages: a spin just touches them
    if (e.spinSafe > this.t) return true;           // just bounced off it: still overlapping on the way up never hurts
    const hb = e.hitbox();
    if (!hb || !(p.vy > 0 && p.prevY + p.h <= hb.y + Math.max(8, hb.h * 0.5))) return false;   // (coming down onto its top half)
    if (e.bossHazard || e.fireHit || e instanceof Firebar || e instanceof Ember || e instanceof Spring) return false;
    if ((e.stompable || e instanceof Shellback) && !e.stone) {
      if (e instanceof Thumpdrum) {
        e.stomp(this, p);
      } else {
        e.dead = true; e.remove = true;
        for (let i = 0; i < 10; i++) this.particles.push({ kind: 'px', x: e.cx + rand(-6, 6), y: e.y + e.h / 2 + rand(-5, 5), vx: rand(-0.8, 0.8), vy: rand(-1, 0.2), drag: 0.92, life: 26, t: 0, color: i % 3 ? '#f4efe4' : '#ffffff', size: 3 });
        this.stompScore(e);
        Sound.play('stomp');
      }
    } else {                                                      // bounce off the spikes, unhurt
      this.burst(p.x + p.w / 2, p.y + p.h, ['#ffffff', '#ffd166'], 6);
      Sound.play('bump');
    }
    // every spin-bounce is as high as a full regular jump, held or not -- and he's lifted clear of it, with a moment's
    // grace, so no spiky foe ever gets a hit in on the bounce
    p.y = Math.min(p.y, hb.y - p.h); p.prevY = p.y;
    p.vy = -(JUMP_BASE + Math.min(Math.abs(p.vx), ROLL_MAX) * JUMP_BONUS); p.jumping = true; p.holdGrace = 34; p.onGround = false; p.platform = null;
    if (!(e.stompable || e instanceof Shellback) || e.stone) {
      // spiky bounce already got a bump sound above, but ensure it's audible
    }
    Sound.play('spring');
    e.spinSafe = this.t + 12;
    this.rainbowBounce(p);
    return true;
  }
  // A rolling Chickaroo bowls over anything he could stomp (plus rollKill foes like hedgehogs). Returns true if it handled the touch.
  rollHit(e) {
    const p = this.player;
    if (e instanceof Shellback && e.state === 'shell') {
      // holding run: scoop it up (the roll ends); otherwise bowl it away
      if (Input.down('run') && !this.held) { this.endRoll(p); this.pickUp(e); } else e.kick(this, p);
      return true;
    }
    if (!(e.stompable || e.rollKill) || e.bossHazard) return false;   // spiky things and hazards still hurt (unless rollKill)
    if (e.rollGuard && e.rollGuard(p)) return false;                   // (a crawdad's pincers, out in front: they win)
    // rollFrontOnly foes (2-4's thornback) only go down when hit in the face: from behind you roll into the spikes
    if (e.rollFrontOnly && (p.x + p.w / 2 - e.cx) * (e.vx < 0 ? -1 : 1) <= 0) return false;
    if (e instanceof Grumblet) e.squash(this);   // flattened just like a stomp (so a glowshroom still gasses)
    else if (e.rollSnuff) e.snuff(this);          // (a wickwisp: bowled over and snuffed out into a puddle of wax)
    else { e.flipKill(this, p.rollDir); this.stompScore(e); Sound.play('kick'); }
    this.burst(e.cx, e.y + e.h / 2, ['#ffffff', '#ffd166', '#f4efe4'], 8);
    this.shake = Math.max(this.shake, 1.5);
    p.roll = Math.max(p.roll, 16);                               // chain: keep rolling...
    p.rollSpeed = Math.min(ROLL_MAX, p.rollSpeed + 0.2);         // ...and a little faster
    return true;
  }
  updateCrouch(p) {
    if (p.roll > 0) return;
    let want = p.crouch;
    if (this.wet(p.x + p.w / 2)) want = false;
    else if (p.onGround) want = Input.down('down') && !(p.sand > 0);
    if (want === p.crouch) return;
    const full = p.power ? BIG_H : SMALL_H, low = p.power ? CROUCH_BIG_H : CROUCH_SMALL_H;
    if (want) { p.y += p.h - low; p.h = low; p.crouch = true; return; }
    const oy = p.y, oh = p.h;
    p.y = oy + oh - full; p.h = full;
    if (this.overlapsSolid(p)) { p.y = oy; p.h = oh; return; }   // no room to stand yet
    p.crouch = false;
  }
  standUp(p) {
    if (!p.crouch) return;
    const full = p.power ? BIG_H : SMALL_H;
    p.y += p.h - full; p.h = full; p.crouch = false;
  }
  // Clock blocks. Timed mode: the phase flips every `period` frames with three warning ticks.
  // Past `jumpFrom` the clockwork is broken: time stands still and every jump flips the phase
  // instead.
  updateClock() {
    const ck = this.level.def.clock, p = this.player;
    if (this.clockMsgT > 0) this.clockMsgT--;
    if (p.state !== 'play') return;
    const col = Math.floor((p.x + p.w / 2) / TILE);
    this.clockJump = ck.jumpFrom != null && col >= ck.jumpFrom;
    if (this.timeStop > 0) return;       // time itself is stopped: so is the clock
    if (!this.clockJump) this.handT++;   // a broken clock's hands stop dead
    if (this.clockJump) {
      this.clockWarn = 0;
      const spring = this.entities.find(e => e instanceof Mainspring && e.trig === ck.jumpFrom * TILE);
      if (!this.clockTold && (!spring || spring.state === 'gone')) {
        this.clockTold = true; Sound.play('bell');
        this.tipLine('CLOCK IS FUBAR. RIP.', 'BLOCKS NOW SWAP WHEN YOU JUMP', '#ffd166', null, true);
      }
      return;
    }
    const k = ++this.clockT % ck.period, left = ck.period - k;
    if (left === 45 || left === 30 || left === 15) Sound.play('clockWarn');
    this.clockWarn = left <= 45 && k ? left : 0;
    if (k === 0) { this.setClock(1 - this.clockPhase); Sound.play('clockSwap'); }
  }
  setClock(ph) {
    this.clockPhase = ph; setClockPhase(ph);
    // blocks that pop into existence around the player lift them out on top (or nudge them below)
    const p = this.player;
    if (!p || p.state !== 'play' || !this.overlapsSolid(p)) return;
    const y0 = p.y;
    const x0 = p.x;
    for (let d = 1; d <= 40; d++) { p.y = y0 - d; if (!this.overlapsSolid(p)) { p.vy = Math.min(p.vy, 0); return; } }
    p.y = y0;
    for (let d = 1; d <= 16; d++) for (const s of [-p.facing, p.facing]) { p.x = x0 + s * d; if (!this.overlapsSolid(p)) return; }
    p.x = x0;
    for (let d = 1; d <= 24; d++) { p.y = y0 + d; if (!this.overlapsSolid(p)) return; }
    p.y = y0;
  }
  overlapsSolid(p) {
    const lv = this.level;
    if (lv.secretCaps.some(cap => overlap(p, cap))) return true;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (lv.solid(c, r)) return true;
    return false;
  }
  // If growing pushed the player into a ceiling, slide sideways to the nearest free spot.
  unstick(p) {
    if (!this.overlapsSolid(p)) return;
    const x = p.x;
    for (let d = 1; d <= 24; d++) {
      for (const s of [-1, 1]) {
        p.x = x + s * d;
        if (!this.overlapsSolid(p)) return;
      }
    }
    p.x = x;
  }

}
mixin(Game, GameUpdate);
