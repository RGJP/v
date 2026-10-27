'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-4 GUT FEELING: swallowed by a turtle, and the long way down
// ═══════════════════════════════════════════════════════════════════════════
// A descent stage (def.descent) is a stack of sections, top to bottom. They're stored side by side in def.rooms.
// A section can span several screens, with connected chambers and a camera that follows horizontally.
// Dropping out of the bottom of a room (a pit in its floor) doesn't kill him: play freezes, the screen fades to
// black, he's moved to the top of the next room (same spot across, still falling, a little slower) and it fades
// back in. The camera snaps to the destination while the screen is black.
//   descent: {
//     intro: room 0 is the sky: a 5 s scripted freefall that ends in the turtle's mouth (skipped from a checkpoint)
//     spawn: [col, row]  where the swallow drops him into room 1 (top-centre of the esophagus chute)
//     exits: { roomIndex: { from: [firstCol, lastCol], at: destinationCol } }
//       optional explicit down exits: only that opening leads onward, even in a section several screens wide
//   }
//   cpRows: [row, ...]  the row each checkpoint stands on (instead of the surface of its column)
//   ['flotsam', x, kind, row = 12]  a piece of swallowed junk floating in the acid (its surface at row's top):
//                       'boot', 'can', 'duck', 'crate', 'crab' (half eaten), 'plank' (a ship's), 'glass' (sea glass) --
//                       bobs, dips under your weight, a platform to hop across on (a geyser can blast it away for a while)
const DROP_FADE = 15;                 // frames for each half of the fade (a quarter of a second)
const DROP_VY = 2.2;                  // how fast he's falling as he appears at the top of the next room
const GUT_BLACKOUT = 120;               // 2 s of black after the gulp, before the esophagus
const GUT_OPEN = 258, GUT_SNAP = 300; // the mouth is wide open by this frame; and snaps shut on it
const gutMouthRadiusY = open => Math.max(2, Math.round(open * 52));
const gutThroatY = (y, open) => y + gutMouthRadiusY(open) * 0.3;
const GUT_BONE_BREAK = 140;   // a fish skeleton gives way this many frames after he first lands on it
const BONE_REGROW = 360, BONE_GROW = 30;   // the boss vault's bones grow back 6 s after breaking (fading in over half a second)
const CLOACA_LAND_LINES = [
  'Fantastic. Feet first in turtle effluent.',
  'Awesome. Falling right into prime intestinal sludge.',
  'Wonderful. Knee-deep in vintage turtle manure.',
  'Great. Right into the business end of the digestive tract.',
];
const FECES_SPLASH_COLS = ['#4e2810', '#6e3c18', '#8e5422', '#b8822e', '#d8b040'];

class GameGut {
  initGut() {
    const def = this.level.def;
    if (!def.descent) { this.gut = null; return; }
    Sound.stopSamples();   // (a restart cuts any cracking still playing)
    this.gut = { drop: null, fade: 0, intro: null, sealed: new Set(), seals: [] };
    if (this.bonesLevel !== def.id) { this.bonesLevel = def.id; this.brokenBones = new Set(); }
    const lv = this.level;
    lv.gutBones = new Map(); lv.gutBoneCells = new Map();
    for (const [, x0, x1] of def.entities.filter(e => e[0] === 'gullet')) {
      for (let r = 0; r < ROWS; r++) for (let c = x0; c <= x1; c++) {
        if (lv.get(c, r) !== T.SEMI) continue;
        let e = c; while (e < x1 && lv.get(e + 1, r) === T.SEMI) e++;
        const key = r * lv.w + c;
        // a skeleton holding a checkpoint flag never crumbles; one in the boss's vault crumbles but grows back
        const fixed = (def.checkpoint || []).some((cc, i) => cc >= c - 1 && cc <= e + 1 && cpRow(lv, i) === r);
        const regrow = !!def.boss && c >= def.boss.wall && e <= def.boss.right;
        const gone = this.brokenBones.has(key);
        lv.gutBones.set(key, { key, c, e, r, t: -1, gone, fall: -1, fixed, regrow, back: 0 });
        for (let x = c; x <= e; x++) {
          lv.gutBoneCells.set(r * lv.w + x, key);
          if (gone) lv.set(x, r, T.EMPTY);
        }
        c = e;
      }
    }
    // the opening (the bedroom dream, then the freefall into the turtle's mouth). A dev warp skips the dream, and the fall
    // too unless it landed him up in the sky (room 0), where the fall is the only way in
    const warpedIn = this.devWarped && this.gutRoom(this.player.x + this.player.w / 2)[0] > 0;
    if (def.descent.intro && !this.checkpointReached && !warpedIn) {
      const p = this.player, skipDream = this.respawns || this.devWarped;
      this.gut.intro = { t: 0, x: VIEW_W / 2, y: 64, mouth: 0, headY: VIEW_H + 160, gone: false, chomp: 0, pre: skipDream ? GUT_DREAM : 0, dreamed: !skipDream };
      p.x = VIEW_W / 2 - p.w / 2; p.y = 64; p.vx = 0; p.vy = 0; p.hidden = true;   // (no sound effects up here: just the stage's music)
    }
    // paint the room he starts in and the next one now, while the stage loads (and the turtle's head if he's about
    // to be swallowed); the rest are painted in the black of each drop (gutPaintAhead), so none of them hitches
    if (this.gut.intro) trtPrebakeIntro();
    this.gutPaintAhead(this.gutRoom(this.player.x + this.player.w / 2)[0]);
  }
  // Once he's well down a room, its entrance in the ceiling closes like a sphincter behind him: no going back up.
  updateGutSeals() {
    const G = this.gut, lv = this.level, p = this.player;
    for (const S of G.seals) S.t++;
    // swallowed, and it's sinking in: said once, when he's standing on the first checkpoint's ledge (not while still falling past it)
    // the acid chamber: he smells it before he sees it (a quip; play carries on)
    if (!this.smellSaid && p.state === 'play' && p.x > 148 * TILE && p.x < 175 * TILE) { this.smellSaid = true; this.speak(CHICK_VOICE, 'THAT SMELL...', '#ffd166'); }
    G.landT = p.onGround && !G.drop ? (G.landT || 0) + 1 : 0;   // frames he's been standing since landing
    const settled = G.landT >= 20 && Math.abs(p.sx - 1) < 0.03 && Math.abs(p.sy - 1) < 0.03;   // (the landing squash has finished)
    if (!this.gotLine && G.fell && this.checkpointReached >= 1 && p.state === 'play' && settled) {
      this.gotLine = true;
      const lines = [
        'Oh. My. Goodness.',
        'Just got swallowed by Gargle the Turtle.',
        'I gotta get outta here!',
        "I'm trapped, only one way out now...",
      ];
      this.speak(CHICK_SHOCK_UP, lines[0], '#ffd166', true);
      for (let i = 1; i < lines.length; i++) {
        const text = lines[i].toUpperCase();
        this.dialogQ.push({
          speaker: CHICK_SHOCK_UP,
          name: speakerName(CHICK_SHOCK_UP),
          text,
          color: '#ffd166',
          hold: true,
          t: 0,
          at: p.x,
          life: Math.ceil(text.length / DIALOG_CPS) + clamp(60 + text.length * 2, 90, 150),
        });
      }
    }
    if (!this.cloacaSaid && p.state === 'play' && p.onGround && !G.drop && p.x >= lv.def.rooms[8][0] * TILE && p.x <= (lv.def.rooms[8][0] + 11) * TILE) {
      this.cloacaSaid = true;
      this.speak(CHICK_VOICE, CLOACA_LAND_LINES, '#ffd166');
    }
    // Watery brown-yellow splashes when landing or walking on the fecal matter in Room 8 (col 421..470)
    if (p.state === 'play' && !G.drop && p.x >= lv.def.rooms[8][0] * TILE && p.x < lv.def.boss.wall * TILE) {
      const footY = p.y + p.h, rBelow = Math.floor((footY + 1) / TILE);
      const cL = Math.floor((p.x + 2) / TILE), cR = Math.floor((p.x + p.w - 2) / TILE);
      const onFeces = p.onGround && !p.platform && (
        lv.get(cL, rBelow) === T.SOLID || lv.get(cR, rBelow) === T.SOLID ||
        this.entities.some(e => e instanceof FecalMatter && Math.abs((p.x + p.w / 2) - (e.x + 8)) < 14 && Math.abs(footY - (e.row + 1) * TILE) < 6)
      );
      if (onFeces && !G.wasOnFeces) {
        // Landing splash into the wet fecal mound!
        const fx = p.x + p.w / 2;
        for (let i = 0; i < 8; i++) {
          const side = (i & 1) ? 1 : -1;
          this.particles.push({
            kind: 'px', x: fx + rand(-5, 5), y: footY - 1,
            vx: side * rand(0.5, 1.9), vy: rand(-2.4, -0.8), g: 0.14,
            life: 18 + Math.floor(rand(0, 10)), t: 0,
            color: FECES_SPLASH_COLS[i % FECES_SPLASH_COLS.length], size: (i % 3 === 0) ? 2 : 1,
          });
        }
        if (fx > this.camX && fx < this.camX + VIEW_W) Sound.play('plop');
      } else if (onFeces && Math.abs(p.vx) > 0.25 && this.t % 4 === 0) {
        // Walking/running squelch splashes kicking up watery brown-yellow droplets
        const fx = p.x + p.w / 2, dir = Math.sign(p.vx) || p.facing;
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            kind: 'px', x: fx + rand(-4, 4), y: footY - 1,
            vx: -dir * rand(0.3, 1.3) + rand(-0.4, 0.4), vy: rand(-1.9, -0.6), g: 0.13,
            life: 14 + Math.floor(rand(0, 8)), t: 0,
            color: FECES_SPLASH_COLS[(this.t + i) % FECES_SPLASH_COLS.length], size: i === 0 ? 2 : 1,
          });
        }
      }
      G.wasOnFeces = onFeces;
    } else {
      G.wasOnFeces = false;
    }
    if (G.sayIn > 0 && !G.drop && --G.sayIn === 0) { G.litterSaid = true; this.speak(CHICK_VOICE, 'POOR GUY SWALLOWED A PLASTIC BAG! ...AND HE HAS WORMS. YIKES.', '#ffd166', true); }   // (a held line: play waits while he reads)
    if (p.state !== 'play' || p.y < TILE + 1) return;
    const [i, room] = this.gutRoom(p.x + p.w / 2);
    if (!room || room.th === 'sky' || G.sealed.has(i)) return;
    G.sealed.add(i);
    let c = room.a;
    while (c <= room.b) {   // every stretch of open ceiling in the room's top row
      if (lv.solid(c, 0)) { c++; continue; }
      let e = c; while (e < room.b && !lv.solid(e + 1, 0)) e++;
      for (let x = c; x <= e; x++) lv.set(x, 0, T.BODY);
      G.seals.push({ a: c, b: e, t: 0 });
      c = e + 1;
    }
  }
  // the sphincter's two fleshy lips drawing shut over the gap (a puckered lump stays once it's closed)
  drawGutSeal(ctx, S) {   // two lips of mucosa sliding shut across the top (in fine pixels: hires.js)
    const w = (S.b - S.a + 1) * TILE, x0 = S.a * TILE, k = Math.min(1, S.t / 8), e = k * k * (3 - 2 * k), half = w / 2 * (1 - e);
    const depth = px => 3 + 4 * (1 - Math.abs(px - w / 2) / (w / 2));
    for (const sd of [-1, 1]) {
      const lip = (grow, sub) => { ctx.beginPath(); const x1 = sd < 0 ? 0 : w, x2 = w / 2 + sd * half; ctx.moveTo(x0 + x1, 0);
        const step = sd < 0 ? 1 / ART_R : -1 / ART_R;   // (from the wall in toward the middle)
        for (let px = x1; sd < 0 ? px <= x2 : px >= x2; px += step) ctx.lineTo(x0 + px, Math.max(0.6, depth(px) - sub + grow));
        ctx.lineTo(x0 + x2, 0); ctx.fill(); };
      ctx.fillStyle = '#5a1428'; lip(1, 0); ctx.fillStyle = '#a8304a'; lip(0, 1); ctx.fillStyle = '#c8425a'; lip(0, 3);
      if (half > 0.5) fEll(ctx, x0 + w / 2 + sd * half, depth(w / 2 + sd * half) - 1.4, 1.4, 0.6, '#ffc4d0');   // the wet lip
    }
    if (k >= 1) fRect(ctx, x0 + w / 2 - 1 / 3, 0, 2 / 3, 7, '#3a0a18');   // the seam where the lips meet
  }
  // the cracking stops the instant it isn't being updated (paused, a dialogue box, a death, a fade): nothing creaks on unheard
  hushBones() {
    if (this.level && this.level.gutBones) for (const b of this.level.gutBones.values()) if (b.snd) { b.snd.pause(); b.snd = null; }
  }
  updateGutBones() {
    if (!this.gut) return;
    this.boneSndT = this.t;
    this.updateGutSeals();
    const lv = this.level, p = this.player;
    const loaded = new Set();   // the skeletons with his weight on them this frame: only those keep cracking
    if (p.state === 'play' && p.onGround && !p.platform) {
      const r = Math.floor((p.y + p.h + 1) / TILE);
      for (let c = Math.floor(p.x / TILE); c <= Math.floor((p.x + p.w - 0.01) / TILE); c++) {
        const bone = lv.gutBones.get(lv.gutBoneCells.get(r * lv.w + c));
        if (bone && !bone.gone) {
          loaded.add(bone);
          if (bone.t < 0 && !bone.fixed) bone.t = 0;
        }
      }
    }
    for (const bone of lv.gutBones.values()) {
      if (bone.snd && (bone.gone || !loaded.has(bone))) { bone.snd.pause(); bone.snd = null; }
      if (bone.gone) {
        if (bone.fall >= 0 && bone.fall < 120) bone.fall++;   // (the rubble falling away)
        if (bone.regrow && ++bone.back >= BONE_REGROW && !this.boneUnder(bone, p)) this.regrowBone(bone);   // (the vault's grow back; the rest stay broken)
        continue;
      }
      if (bone.grow > 0) bone.grow--;
      bone.load = loaded.has(bone);
      if (!bone.load && bone.snd) { bone.snd.pause(); bone.snd = null; }   // stepped off: the cracking stops at once
      if (bone.t < 0 || !bone.load) continue;
      if ((bone.t + 6) % 52 === 0 && (bone.e + 1) * TILE > this.camX && bone.c * TILE < this.camX + VIEW_W) { if (bone.snd) bone.snd.pause(); bone.snd = Sound.play('boneCreak') || null; }   // a cracking sound as it weakens   // (stepped off: the damage stays but stops spreading)
      const left = bone.c * TILE, wide = (bone.e + 1 - bone.c) * TILE, k = bone.t / GUT_BONE_BREAK;
      if (k > 0.45 && bone.t % 5 === 0) {   // flakes and grit trickling off it as it weakens
        this.particles.push({ kind: 'px', x: left + rand(0, wide), y: bone.r * TILE + 3, vx: rand(-0.2, 0.2), vy: rand(0, 0.4), g: 0.12,
          life: 30, t: 0, color: ['#f2e8d2', '#c4b292', '#fff0cf'][bone.t % 3], size: 1 });
      }
      if (++bone.t < GUT_BONE_BREAK) continue;
      bone.gone = true; bone.fall = 0; bone.back = 0; if (!bone.regrow) this.brokenBones.add(bone.key);
      for (let c = bone.c; c <= bone.e; c++) lv.set(c, bone.r, T.EMPTY);
      this.shake = Math.max(this.shake, 4);
      for (let i = 0; i < wide / 2; i++) this.particles.push({   // a cloud of bone dust
        kind: 'px', x: left + rand(0, wide), y: bone.r * TILE + rand(-2, 6), vx: rand(-1.1, 1.1), vy: rand(-1.6, 0.2), g: 0.06, drag: 0.96,
        life: rand(30, 60), t: 0, color: ['#f2e8d2', '#c4b292', '#fff0cf', '#a89878'][i % 4], size: i % 3 ? 2 : 3,
      });
      if (p.onGround && !p.platform && Math.abs(p.y + p.h - bone.r * TILE) < 1 &&
          p.x + p.w > bone.c * TILE && p.x < (bone.e + 1) * TILE) {
        p.onGround = false; p.vy = Math.max(p.vy, 0.3);
      }
      if ((bone.e + 1) * TILE > this.camX && bone.c * TILE < this.camX + VIEW_W) { Sound.play('crumble'); Sound.play('thud'); }
    }
  }
  // is he in the space a broken bone would grow back into?
  boneUnder(bone, p) { return p.x + p.w > bone.c * TILE && p.x < (bone.e + 1) * TILE && p.y < (bone.r + 1) * TILE && p.y + p.h > bone.r * TILE - 2; }
  // a vault bone knits back together where it was, fading in
  regrowBone(bone) {
    const lv = this.level;
    bone.gone = false; bone.t = -1; bone.fall = -1; bone.back = 0; bone.grow = BONE_GROW;
    for (let c = bone.c; c <= bone.e; c++) lv.set(c, bone.r, T.SEMI);
    if ((bone.e + 1) * TILE > this.camX && bone.c * TILE < this.camX + VIEW_W) Sound.play('boneCreak');
    for (let i = 0; i < (bone.e + 1 - bone.c) * 4; i++) this.particles.push({ kind: 'px', x: rand(bone.c * TILE, (bone.e + 1) * TILE), y: bone.r * TILE + rand(-3, 5), vx: 0, vy: rand(-0.4, -0.1), life: 24, t: 0, color: '#f2e8d2', size: 1 });
  }
  // Paint room i and the one after it, if they aren't yet (and on the way into the vault, the boss and the sea
  // finale): a room's picture takes a good fraction of a second, so it's done while the screen is black.
  // (The headless tests hardly draw anything; they skip this and anything drawn is painted when it's needed.)
  // Room i's picture is painted now if it isn't yet (finishing one already under way); the next one's is queued and
  // painted a few milliseconds a frame while he plays this one (gutBakeTick), so a drop never waits on it
  gutPaintAhead(i) {
    if (window.CHICKAROO_HEADLESS || i < 0) return;
    const lv = this.level, def = lv.def, Q = GULLET_QUEUE;
    lv.rooms.slice(i, i + 2).forEach((room, k) => {
      for (const d of def.entities) {
        const key = def.id + ':' + d[1];
        if (d[0] !== 'gullet' || d[1] > room.b || d[2] < room.a || GULLET_ART.has(key)) continue;
        if (!Q.has(key)) Q.set(key, new Gullet(d[1], d[2], d[3]).bakeSteps(lv));
        if (k === 0) { const it = Q.get(key); let r; while (!(r = it.next()).done); GULLET_ART.set(key, r.value); Q.delete(key); }
      }
      if (def.boss && def.boss.wall <= room.b && def.boss.right >= room.a) trtPrebakeFinale();
    });
  }
  gutBakeTick() {   // (from updateGut: about 2.2 ms of the queued painting a frame)
    const Q = GULLET_QUEUE;
    if (!Q.size || window.CHICKAROO_HEADLESS) return;
    const t0 = performance.now(), [key, it] = Q.entries().next().value;
    while (performance.now() - t0 < 2.2) { const r = it.next(); if (r.done) { GULLET_ART.set(key, r.value); Q.delete(key); return; } }
  }
  // the room (from def.rooms) holding px, and its index
  gutRoom(px) {
    const rooms = this.level.rooms, c = Math.floor(px / TILE);
    const i = rooms.findIndex(r => c >= r.a && c <= r.b);
    return [i, rooms[i]];
  }
  // He's crossed the bottom of the screen: if there's a room under this one, take him down to it.
  gutDrop(p) {
    const [i, room] = this.gutRoom(p.x + p.w / 2), next = this.level.rooms[i + 1];
    if (!room || !next || this.gut.drop) return !!this.gut.drop;
    const exit = this.level.def.descent.exits && this.level.def.descent.exits[i];
    const cx = p.x + p.w / 2;
    if (exit && (cx < exit.from[0] * TILE || cx >= (exit.from[1] + 1) * TILE)) return false;
    const rel = p.x - (exit ? exit.from[0] : room.a) * TILE;
    this.gut.drop = { t: 0, to: () => {
      p.x = clamp((exit ? exit.at : next.a) * TILE + rel, (next.a + 1) * TILE, next.b * TILE - p.w);
      p.y = -p.h - 2; p.prevY = p.y; p.vy = DROP_VY; p.vx *= 0.4; p.platform = null; p.onGround = false;
    } };
    return true;
  }
  // Each frame (from updatePlay): the fade between rooms, the freefall intro, the bowel-movement flush, the sea, and the outro.
  updateGut() {
    const G = this.gut, p = this.player;
    if (G.intro) { this.updateGutIntro(G.intro); if (!G.drop) return true; }   // (once he's swallowed, the fade to black runs over the freefall scene)
    this.settleQuake();
    if (G.outro) { this.updateGutOutro(G.outro); return true; }
    if (G.exit) { this.updateGutExit(G.exit); return true; }     // (the vault's finale: gut-vault.js)
    if (G.flush) { this.updateGutFlush(G.flush); return true; }
    this.gutBakeTick();
    if (!G.drop) return false;
    const d = G.drop;
    if (d.hold > 0 && d.t === DROP_FADE) {   // dwell in the black before the room appears
      d.hold--; G.fade = 1;
      if (p.invuln > 0) p.invuln--;
      return true;
    }
    d.t++;
    G.fade = d.t <= DROP_FADE ? d.t / DROP_FADE : Math.max(0, 1 - (d.t - DROP_FADE) / DROP_FADE);
    if (d.t === DROP_FADE) {   // black: swap rooms
      d.to();
      this.updateCamera(true); this.camPx = null; this.updateCamera(true);
      this.gutPaintAhead(this.gutRoom(p.x + p.w / 2)[0]);   // (painting the room while it's black)
      this.spawnEntities();
      this.trail = null;
      if (this.gutRoom(p.x + p.w / 2)[0] === 3 && !G.litterSaid) G.sayIn = 30;   // (half a second after he's landed in the litter well)
    }
    if (d.t >= DROP_FADE * 2) { G.drop = null; G.fade = 0; }
    if (p.invuln > 0) p.invuln--;
    return true;
  }

  // The freefall: the sky rushing past, a little drift left and right, then the turtle comes up under him
  updateGutIntro(I) {
    const p = this.player;
    if (I.pre < GUT_DREAM) { this.updateGutDream(I); return; }   // (the cutscene first: gut-dream.js)
    I.t++;
    // Share the drawn throat's position with the swallow path.
    const rise = clamp((I.t - 190) / 55, 0, 1), ease = rise * rise * (3 - 2 * rise);
    I.headY = VIEW_H + 160 - ease * 236;
    I.mouth = I.t < 236 ? 0 : I.t < GUT_SNAP ? Math.min(1, (I.t - 236) / 18) : Math.max(0, 1 - (I.t - GUT_SNAP) / 3);
    const dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    if (I.t < GUT_OPEN) {   // a subtle drift under his control
      p.vx += (dir * 1.2 - p.vx) * 0.08;
      I.x = clamp(I.x + p.vx, 80, VIEW_W - 80);
      if (dir) p.facing = dir;
      I.y = 64 + Math.sin(I.t * 0.07) * 3;
    } else {                // sucked down into the open mouth
      const k = Math.min(1, (I.t - GUT_OPEN) / (GUT_SNAP - GUT_OPEN - 6));
      if (!I.swallowStart) I.swallowStart = { x: I.x, y: I.y };
      I.sink = k;
      I.x = I.swallowStart.x + (VIEW_W / 2 - I.swallowStart.x) * (1 - Math.pow(1 - k, 3));
      I.y = I.swallowStart.y + (gutThroatY(I.headY, I.mouth) - I.swallowStart.y) * k * k;
      if (k >= 1) I.gone = true;
    }
    if (I.t === GUT_SNAP) I.chomp = 10;
    // the cartoon whistle of the fall, fading out as he's sucked into the mouth
    if (I.t === 1) { I.whistle = Sound.sample(['music/fallw.mp3'], 0.17); I.whistleVol = I.whistle ? I.whistle.volume : 0; }
    if (I.whistle) {
      const fade = clamp(1 - (I.t - (GUT_OPEN - 20)) / (GUT_SNAP - GUT_OPEN + 20), 0, 1);
      I.whistle.volume = I.whistleVol * fade;
      if (fade <= 0) { I.whistle.pause(); I.whistle = null; }
    }
    if (I.chomp > 0) I.chomp--;
    p.x = I.x - p.w / 2; p.y = I.y;
    this.updateParticles();
    if (I.gone && !I.fading) {   // gulp: the moment he's in the mouth the screen fades to black (the scene stays as it is until it's black)
      I.fading = true;
      const [col, row] = this.level.def.descent.spawn;
      this.gut.drop = { t: 0, hold: GUT_BLACKOUT, to: () => {
        this.gut.intro = null; this.gut.fell = true;   // (he really did just arrive by being swallowed)
        p.hidden = false; p.x = col * TILE + (TILE - p.w) / 2; p.y = row * TILE - p.h; p.prevY = p.y; p.vx = 0; p.vy = DROP_VY; p.onGround = false;
      } };
    }
  }
  // A broken skeleton: its picture, cut into pieces, tumbling away
  drawBoneRubble(ctx, A, B, bone, X) {
    if (!B.dbr) {
      const rng = mulberry32(B.key * 31 + 5);
      B.dbr = B.pieces.map(([px]) => ({
        delay: Math.min(10, Math.abs(px - B.mid) * 0.05 + rng() * 3), vx: (px - B.mid) * 0.012 + rng() * 1.2 - 0.6, vy: -rng() * 2.2, vr: (rng() - 0.5) * 0.3,
      }));
    }
    B.pieces.forEach(([px, py, w, h], i) => {
      const D = B.dbr[i], f = bone.fall - D.delay;
      let x = px, y = py, rot = 0;
      if (f >= 0) { x = px + D.vx * f; y = py + D.vy * f + 0.11 * f * f; rot = D.vr * f; }
      if (y > VIEW_H + 8) return;
      ctx.save(); ctx.translate(Math.round(X + x + w / 2), Math.round(y + h / 2)); ctx.rotate(rot);
      ctx.drawImage(A.bonePic, px, py, w, h, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }

  // the black between rooms (drawn over the world), plus the waking-up dream outro
  drawGutFade(ctx) {
    if (!this.gut) return;
    if (this.gut.outro) this.drawGutOutro(ctx, this.gut.outro);
    if (!(this.gut.fade > 0)) return;
    ctx.globalAlpha = this.gut.fade; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  }

  // ── the freefall, drawn on its own (it isn't the tile world) ──────────────
  drawGutIntro(ctx, force = false) {
    const I = this.gut.intro, t = I.t, p = this.player;
    if (I.pre < GUT_DREAM && !force) { this.drawGutDream(ctx, I); return; }
    // the sky, darker up high
    const sky = ['#3a78d8', '#4a88e0', '#5c98e6', '#70a8ec', '#86b8f0', '#9ec8f4', '#b8d8f8'];
    if (!this.freefallSky) this.freefallSky = bandSky(sky);   // (one smooth gradient: backgrounds.js)
    ctx.drawImage(this.freefallSky, 0, 0);
    // clouds rushing up past him: three layers, the nearer the faster (he's falling fast)
    for (const [n, sp, s, col, hi] of [[5, 2.2, 0.6, '#d6e6fa', '#eef6ff'], [4, 4.5, 1, '#e6f0fc', '#ffffff'], [3, 8, 1.5, '#f2f8ff', '#ffffff']]) {
      for (let i = 0; i < n; i++) {
        const span = VIEW_H + 120 * s, y = VIEW_H + 60 * s - ((t * sp + i * span / n + i * 37) % span), x = (i * 131 + n * 57) % (VIEW_W + 60) - 30;
        for (const [dx, dy, r] of [[0, 0, 14], [16, -5, 16], [34, 0, 12], [-14, 4, 9], [48, 4, 9]]) fBlob(ctx, x + dx * s, y + dy * s + 3, r * s, col);   // (fine: hires.js)
        for (const [dx, dy, r] of [[0, -2, 10], [16, -7, 12], [34, -2, 8]]) fBlob(ctx, x + dx * s, y + dy * s, r * s, hi);
      }
    }
    // speed lines
    for (let i = 0; i < 14; i++) { const x = (i * 53 + 17) % VIEW_W, y = VIEW_H - ((t * 11 + i * 67) % (VIEW_H + 40)); ctx.globalAlpha = 0.5; fRect(ctx, x, y, 2 / 3, 14 + (i % 3) * 6, '#ffffff'); }
    ctx.globalAlpha = 1;
    // the turtle, rising to meet him, mouth to the sky
    this.drawGutTurtle(ctx, VIEW_W / 2, I.headY, I.mouth, I);
    // Chickaroo, falling head first: upside down, wings flailing, eyes wide and fixed on what's coming up under him
    // (pupils at the top of his eyes -- the bottom of the screen, the way he's turned)
    if (!I.gone) {
      const set = p.power === 0 ? SPR.small : p.power === 1 ? SPR.big : SPR.fire, img = set[(t >> 2) % 2 ? 'diveA' : 'diveB'];
      // (an exact half turn keeps the pixels crisp; he only tumbles off-angle once he's being sucked in)
      const sink = I.sink || 0, depth = clamp((sink - 0.7) / 0.3, 0, 1);
      const sway = Math.round(Math.sin(t * 0.15) * 1.5 * (1 - sink));
      // His centre reaches the black throat; shrink into its depth during the final approach.
      ctx.save(); ctx.translate(Math.round(I.x) + sway, Math.round(I.y + img.height / 2 * (1 - sink * sink))); ctx.rotate(Math.PI + (t >= GUT_OPEN ? (t - GUT_OPEN) * 0.06 : 0));
      ctx.scale(1 - depth, 1 - depth);
      if (p.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
      ctx.globalAlpha = 0.7 * (1 - sink);
      for (const dx of [-9, 9]) fRoundRect(ctx, I.x + dx, I.y - 4 - (t * 3 + dx + 99) % 8, 0.7, 6, 0.35, '#ffffff');   // wind streaming up past him
      ctx.globalAlpha = 1;
    }
  }
  // the giant turtle's head, face on, as it comes up out of the clouds with its jaws open to the sky: its front
  // flippers spread over the shell, its eyes rolled toward him. (cx, y): the middle of its mouth; open 0..1.
  // The pictures are painted in turtle-art.js; the mouth is the nearest painted size, squeezed to fit.
  drawGutTurtle(ctx, cx, y, open, I) {
    if (y > VIEW_H + 150) return;
    cx = Math.round(cx); y = Math.round(y);
    ctx.drawImage(cloArt('trtHead', trtBakeHead), cx - TRT_HEAD.ox, y - TRT_HEAD.oy);
    const look = Math.round(clamp((I.x - cx) / 120, -1, 1) * 4) / 4;
    for (const sd of [-1, 1]) ctx.drawImage(cloArt('trtEye' + sd + ':' + look, () => trtBakeEye(sd, look)), cx + sd * 138 - 32, y - 24 - 26);
    const ry = gutMouthRadiusY(open);
    if (ry <= 4) { const img = cloArt('trtShut', trtBakeShut); ctx.drawImage(img, cx - TRT_MOUTH_RX - TRT_RIM - 2, y - 20); }
    else {
      const R = TRT_MOUTHS.reduce((best, r) => r >= ry && r < best ? r : best, TRT_MOUTHS[0]), img = cloArt('trtMouth' + R, () => trtBakeMouth(R));
      const h = Math.round(img.height * (ry + TRT_RIM) / (R + TRT_RIM));
      ctx.drawImage(img, cx - (img.width - 1) / 2, y - Math.round(h / 2), img.width, h);
      if (ry > 18) {   // strings of spit stretched between the jaws, sagging toward the throat
        ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ffe8ee'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';   // (fine strokes)
        for (const [sx, ph] of [[-66, 0], [24, 2.1], [74, 4]]) {
          const top = y - ry + 4, len = ry * 2 - 8;
          ctx.beginPath(); for (let k = 0; k <= len; k += 1) { const u = k / len; ctx.lineTo(cx + sx + 0.5 + Math.sin(u * Math.PI) * (6 + Math.sin(I.t * 0.1 + ph) * 2), top + k); } ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    if (I.chomp > 0) for (const [dx, dy] of [[-120, -30], [118, -26], [-90, -56], [94, -52], [0, -64]]) { const px = cx + dx + 1.5, py = y + dy + 1.5; fPoly(ctx, [[px, py - 3], [px + 0.8, py - 0.8], [px + 3, py], [px + 0.8, py + 0.8], [px, py + 3], [px - 0.8, py + 0.8], [px - 3, py], [px - 0.8, py - 0.8]], '#ffffff'); }   // (sparkles: fine)
  }

}
mixin(Game, GameGut);

// Swallowed reef remains, drawn in local coordinates with lit volumes, chipped rims,
// fine shell ribs and translucent tissue. Each cluster's crown follows its platform top.
function drawGutRemains(ctx, x, y, w, kind, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(w / 40, 1);
  const line = (points, color, width = 0.65) => {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (const p of points.slice(1)) ctx.lineTo(...p);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke();
  };
  const shape = (points, color) => {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (const p of points.slice(1)) ctx.lineTo(...p);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };
  const oval = (cx, cy, rx, ry, light, dark, angle = 0) => {
    const grad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx * .4, cy + ry);
    grad.addColorStop(0, light); grad.addColorStop(.5, dark); grad.addColorStop(1, '#182b22');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2); ctx.fill();
  };
  if (kind === 'seagrass') {
    // Thin, yellowed plastic caught beneath a dense bale, with folded handles.
    shape([[21,4],[28,1],[37,3],[39,12],[33,16],[24,13],[22,8]], 'rgba(215,228,206,.42)');
    line([[26,4],[24,-2],[28,-4],[30,3],[33,4],[34,-2],[37,-1],[36,6]], 'rgba(239,245,216,.7)', 1);
    for (let i = 0; i < 5; i++) line([[25+i*2,5],[28+i,10],[26+i*2,13]], 'rgba(241,243,219,.45)');
    oval(18,4,18,6,'#82996a','#32452c');
    for (let i = 0; i < 37; i++) {
      const a = i * 2.399, cx = 18 + Math.sin(a)*13, cy = 3 + Math.cos(a*1.7)*3;
      line([[cx-8,cy+3],[cx-3,cy-2],[cx+4,cy-3],[cx+9,cy+1],[cx+5,cy+5]], ['#9eab65','#647d40','#bdba7b','#3c6037'][i%4], .8);
    }
    // Ghost net: irregular diamond mesh, broken ends and knotted intersections.
    for (let i = 0; i < 6; i++) {
      line([[i*6,1],[i*6+7,6],[i*6+3,11]], '#9aa797', .55);
      line([[i*6+5,0],[i*6-1,6],[i*6+5,10]], '#627f78', .65);
      oval(i*6+5,5, .8,.6,'#d4d2b0','#788775');
    }
  } else if (kind === 'crab') {
    // Jointed blue swimmer legs and serrated, crushed olive-blue carapace.
    for (const side of [-1,1]) for (let i = 0; i < 3; i++) {
      const a = 20 + side*13;
      line([[a,2+i*2],[a+side*5,-2+i*3],[a+side*7,2+i*3]], '#3d7180', 1.7);
      line([[a,1+i*2],[a+side*5,-3+i*3]], '#a6c2bb', .55);
    }
    oval(20,3,18,6,'#b4bda1','#376574');
    shape([[1,2],[5,-1],[4,-3],[11,-2],[15,-4],[23,-3],[28,-2],[34,-3],[34,0],[39,2],[33,4],[7,5]], '#688c8b');
    line([[5,0],[12,-2],[21,-2],[29,0],[35,1]], '#c2ccb4', .85);
    line([[23,-3],[20,0],[24,2],[19,4],[22,7]], '#152e38', 1.2);
    line([[24,-3],[21,0],[25,2]], '#e0cfac', .6);
    for (let i=0;i<22;i++) oval(7+(i*7.3)%27,1+(i*1.7)%5,.45,.3,'#bad0bc','#497782');
    // Broken urchin test: the dark cavity, chalky rim and five dotted radial bands.
    oval(8,5,7,5,'#d0b4ba','#715568'); oval(8,3,3.5,2,'#493440','#1c2226');
    for(let j=0;j<5;j++) for(let i=0;i<4;i++) {
      const a=j*Math.PI*2/5; oval(8+Math.cos(a)*(3+i),5+Math.sin(a)*(2+i*.6),.45,.45,'#e1cdc0','#9c8585');
    }
    // Clam and mussel cluster: ridged valves with pearly chipped lips.
    for (let i=0;i<5;i++) {
      const cx=23+i*3, cy=6+(i%2)*2;
      oval(cx,cy,3,2.3,i%2?'#8b9fbc':'#d5c5a1',i%2?'#263448':'#796a58',-.5);
      for(let j=0;j<3;j++) line([[cx-2+j,cy-1],[cx+j*.5,cy+1.5]], '#adb3ac', .4);
    }
  } else if (kind === 'conch') {
    // Collapsed jellyfish bell and torn, glowing oral arms below the shell.
    for(let i=0;i<6;i++) {
      const a=5+i*2.7;
      line([[a,7],[a+Math.sin(t*.035+i)*2,11],[a-2,15],[a+1,18]], 'rgba(114,226,228,.45)', 1);
    }
    oval(12,7,11,3,'#a2f1e3','#426b80');
    for(let i=0;i<8;i++) oval(4+i*2.2,7+Math.sin(i)*1.2,.6,.45,'#d2fff5','#70ccc9');
    // Porous barrel sponge chunk, an open tubular cavity with an eroded rim.
    oval(32,4,8,6,'#be9770','#77533c'); oval(32,0,6,2.7,'#e0b78c','#916a4a'); oval(32,0,3.8,1.5,'#4e362c','#2c3028');
    for(let i=0;i<24;i++) oval(26+(i*3.7)%13,2+(i*2.3)%6,.55,.7,'#584b35','#423d2b');
    // Conch spire, flared pink aperture, growth ribs and worn ivory tips.
    shape([[0,4],[7,1],[12,-3],[17,-1],[20,-4],[27,-1],[30,4],[25,8],[12,8]], '#c7b292');
    oval(19,3,11,5,'#f0dfb9','#a88c71');
    shape([[20,1],[26,-2],[28,1],[27,6],[21,8],[17,6]], '#e0a38e');
    oval(23,4,3,2.8,'#a16b60','#503f3a', .6);
    line([[27,-1],[28,3],[26,7],[21,8]], '#ffddbd', 1);
    for(let i=0;i<7;i++) line([[5+i*2,-.5-i*.16],[8+i*2,3],[7+i*2,6]], i%2?'#e4cfad':'#8f7964', .65);
    for(let i=0;i<4;i++) shape([[8+i*4,0],[10+i*4,-3-i%2],[12+i*4,1]], '#e6d5b4');
  } else if (kind === 'stone') {
    // Smooth gastroliths, abraded facets, mineral veins and wet highlights.
    oval(22,5,17,5,'#87958a','#424e45');
    oval(12,3,11,4,'#b6b29d','#646e66'); oval(28,2,11,4,'#9b9f95','#515f5b');
    line([[4,2],[10,1],[16,3],[20,3]], '#d5cfb1', .8);
    line([[23,-.5],[27,1],[30,0],[35,2]], '#c7cbb5', .6);
    for(let i=0;i<24;i++) oval(5+(i*7.7)%30,1+(i*2.3)%6,.4,.35,'#b3b39e','#45544c');
  }
  // Reflected acid along wet undersides, interrupted instead of a rectangular outline.
  line([[3,8],[9,9],[15,8]], 'rgba(193,244,119,.55)', .7);
  line([[25,9],[32,8],[36,8]], 'rgba(193,244,119,.4)', .7);
  ctx.restore();
}

// ── floating junk: stepping stones across the acid ─────────────────────────
// The turtle has eaten some odd things. They float, bob, and dip under Chickaroo's weight (and come back up).
// A geyser under one blasts it into the air; it splashes back, dissolves, and a while later bobs back up.
const FLOTSAM = { boot: 22, can: 18, duck: 18, crate: 26, crab: 36, plank: 40, glass: 16, seagrass: 36, conch: 40 };
const FLOT_GONE = 120, FLOT_RISE = 40;
class Flotsam {
  constructor(col, kind = 'crate', row = 12) {
    this.kind = kind; this.w = FLOTSAM[kind] || 22; this.h = 8;
    this.x = col * TILE + (TILE - this.w) / 2;   // (centred on the column; a fractional column is fine)
    this.rest = row * TILE + 4 - this.h;
    this.y = this.prevY = this.rest; this.dx = 0; this.dy = 0; this.t = col * 23; this.sink = 0;
    this.fly = null; this.gone = 0; this.rise = 0; this.ghost = false; this.home = this.x;
  }
  // a geyser's blast: up it goes, tumbling
  blast(g) {
    if (this.fly || this.gone || this.rise) return;
    this.fly = { vx: rand(-0.8, 0.8), vy: -5.2, a: 0, va: rand(-0.25, 0.25) }; this.ghost = true;
    // Flotsam respawns after each geyser blast; leave that cycle silent under the music.
  }
  update(g) {
    this.t++;
    const oy = this.y;
    if (this.fly) {   // in the air, then back into the acid with a hiss: dissolved
      const F = this.fly;
      F.vy = Math.min(F.vy + 0.22, 5); this.x += F.vx; this.y += F.vy; F.a += F.va;
      if (F.vy > 0 && this.y > this.rest + 6) {
        this.fly = null; this.gone = FLOT_GONE;
        for (let i = 0; i < 8; i++) g.particles.push({ kind: 'px', x: this.x + rand(0, this.w), y: this.rest + this.h, vx: rand(-0.6, 0.6), vy: rand(-1.6, -0.4), g: 0.08, life: 30, t: 0, color: i % 2 ? '#e8ff9a' : '#9ae04a', size: 2 });
      }
    } else if (this.gone) {
      if (--this.gone === 0) { this.rise = FLOT_RISE; this.x = this.home; }
    } else if (this.rise) {   // bobbing back up where it was
      this.rise--; this.y = this.rest + this.rise * 0.4;
      if (this.rise < 8) this.ghost = false;
    } else {
      const on = g.player.platform === this && g.player.onGround;
      this.sink += ((on ? 3 : 0) - this.sink) * 0.12;
      this.y = this.rest + Math.sin(this.t * 0.05) * 1.2 + this.sink;
    }
    this.prevY = oy; this.dy = this.fly || this.gone ? 0 : this.y - oy; this.dx = 0;
  }
  draw(ctx) {
    if (this.gone) return;
    if (this.fly) {   // tumbling through the air
      ctx.save(); ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y + 4)); ctx.rotate(this.fly.a); ctx.translate(-Math.round(this.x + this.w / 2), -Math.round(this.y + 4));
      this.drawKind(ctx); ctx.restore(); return;
    }
    this.drawKind(ctx);
    // a green ring of acid where it meets the surface, fizzing
    const w = this.w, x = Math.round(this.x);
    fEll(ctx, x + w / 2, this.rest + this.h - 0.4, w / 2 + 2, 0.7, '#e8ff9a');   // (fine)
    if ((this.t >> 3) % 3 === 0) fBlob(ctx, x + ((this.t >> 2) % w) + 0.5, this.rest + this.h - 2.5, 0.5, '#f4ffd0');
  }
  drawKind(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), w = this.w, k = this.kind;
    if (['seagrass', 'crab', 'conch'].includes(k)) {
      drawGutRemains(ctx, x, y, w, k, this.t); return;
    }
    ctx.drawImage(flotsamArt(k, w), x - 4, y - 10);   // (painted fine)
  }
}
// the floating junk, painted fine (w + 8 x 22; the junk's top-left at (4, 10), its waterline along y 18)
const FLOT_ART = {};
function flotsamArt(k, w) {
  const key = k + w;
  return FLOT_ART[key] || (FLOT_ART[key] = (() => {
    const A = mArt(w + 8, 22), X = 4, Y = 10, box = (x0, y0, x1, y1, pal, r = 1) => A.fill(X + x0 - 1, Y + y0 - 1, X + x1 + 1, Y + y1 + 1, (x, y) => {
      const lx = x - X, ly = y - Y, cx = Math.max(x0 + r, Math.min(x1 - r, lx)), cy = Math.max(y0 + r, Math.min(y1 - r, ly));
      return Math.hypot(lx - cx, ly - cy) <= r ? softTone(pal, 1 - (ly - y0) / (y1 - y0) * 1.6 - (lx - x0) / (x1 - x0) * 0.3) : null; });
    if (k === 'boot') {   // an old leather boot on its side, sole up, laces trailing
      const L = ['#3a2010', '#5a3418', '#7a4a28', '#a8703c', '#d09858'];
      box(0, -4, 13, 8, L, 2); box(0, 2.5, w, 8, L, 2); A.fill(X, Y + 6.8, X + w, Y + 8, () => '#3a2010', L);
      A.outline();
      for (const [lx, ly] of [[3, -2], [7, -2]]) A.ell(X + lx + 0.5, Y + ly + 0.5, 0.6, 0.6, '#e8d8b0');
      A.line(X + 3, Y + 0.5, X + 8, Y + 0.5, '#e8d8b0', null, 0.6);
    } else if (k === 'can') {   // a tin can on its side, its label half peeled
      box(0, -2, w, 8, ['#4a5460', '#6a7480', '#b8c0c8', '#e4e8ec', '#ffffff'], 2.5);
      box(4, 0, 13, 6, ['#7a1a12', '#a8281e', '#d84a3a', '#f07a62', '#ffb8a0'], 0.6);
      A.outline(); A.line(X + 5, Y + 1.4, X + 12, Y + 1.4, '#ffd166', null, 0.6);
    } else if (k === 'duck') {   // a rubber duck, very calm about all this
      const D = ['#a87a10', '#e8a820', '#ffd23a', '#fff09a', '#fffbe0'];
      A.soft(X + w / 2 - 1, Y + 4, w / 2 + 0.6, 4.4, D); A.soft(X + w - 4, Y - 3.6, 4, 4, D);
      A.poly([[X + w - 0.6, Y - 4], [X + w + 3.4, Y - 2.6], [X + w - 0.4, Y - 1]], '#ff8a2a');
      A.outline(); A.ell(X + w - 3.4, Y - 4.6, 0.7, 0.8, INK); A.ell(X + 4, Y + 2.6, 2.4, 0.8, '#e8a820');
    } else if (k === 'plank') {   // a ship's plank: salt-bleached, nail heads, a few barnacles
      box(0, -1, w, 8, ['#4a3a24', '#7a6648', '#a08a6a', '#c8b490', '#e4d6b8'], 1);
      A.line(X + 9, Y + 1.5, X + 15, Y + 1.5, '#7a6648', null, 0.5); A.line(X + 26, Y + 5.5, X + 33, Y + 5.5, '#7a6648', null, 0.5);
      for (const [bx, by] of [[16, -2], [23.5, -1.4]]) A.soft(X + bx, Y + by, 1.8, 1.2, ['#8a8478', '#b8b0a0', '#e8e4d8', '#f6f4ee', '#ffffff']);
      A.outline();
      for (const nx of [4, w - 4]) for (const ny of [1, 6]) A.ell(X + nx, Y + ny, 0.8, 0.8, '#5a5a62');
    } else if (k === 'glass') {   // a lump of sea glass, frosted green, the light coming through it
      A.fill(X - 1, Y - 4, X + w + 1, Y + 9, (x, y) => { const u = (x - X - w / 2) / (w / 2 + 0.5), v = (y - Y - 2.5) / 5.8; return u * u + v * v <= 1 && Math.abs(u) + Math.abs(v) < 1.3 ? softTone(['#1e6a48', '#3a8a64', '#5ab88a', '#a8f0c8', '#e8fff0'], -0.6 * u - 0.9 * v + 0.4) : null; });
      A.outline(); A.ell(X + 3, Y - 1, 1.2, 0.7, '#ffffff');
    } else {   // a wooden crate, swollen with acid
      const W2 = ['#4a2c10', '#6a4420', '#a87a44', '#d0a066', '#ecc890'];
      box(0, -5, w, 8, W2, 0.8);
      A.fill(X, Y - 5, X + w, Y + 8, (x, y) => Math.abs(y - Y + 1) < 0.4 || Math.abs(y - Y - 3) < 0.4 ? W2[1] : (Math.abs(x - X - 3) < 1 || Math.abs(x - X - w + 3) < 1) ? W2[3] : null, W2);
      A.outline();
    }
    return A.canvas();
  })());
}

// ── the esophagus: papillae and the throat ring ─────────────────────────────
// A sea turtle's gullet is lined with hundreds of stiff, backward-pointing spikes (esophageal papillae) that let food
// down and stop it, and the sea water swallowed with it, coming back up. Here they bristle from every wall face of
// the chute: brush a wall and they jab you.
//   ['papillae', x0, x1, r0, r1]  spikes on every wall face (solid next to open) in those columns and rows (none
//                                 right over a bone ledge, so a ledge is always safe to stand on)
//   ['throatring', x, row, w]     the ring of muscle at the bottom, around a gap w tiles wide in `row`
const PAP_DEPTH = 8;                                             // how far into the chute the spikes can jab (the art reaches a bit further)

class Papillae extends Enemy {
  constructor(x0, x1, r0, r1) {
    super(x0 * TILE, r0 * TILE, (x1 - x0 + 1) * TILE, (r1 - r0 + 1) * TILE);
    this.x0 = x0; this.x1 = x1; this.r0 = r0; this.r1 = r1; this.faces = null;
    this.passive = true; this.behindTiles = false;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  build(lv) {   // every wall face in the area: [x of the wall's surface, row, dir it points (1 right, -1 left)]
    this.faces = [];
    for (let r = this.r0; r <= this.r1; r++) for (let c = this.x0; c < this.x1; c++) {
      const a = lv.solid(c, r), b = lv.solid(c + 1, r);
      if (a === b) continue;
      const dir = a ? 1 : -1, open = a ? c + 1 : c;
      if (lv.get(open, r + 1) === T.SEMI || lv.get(open, r) === T.SEMI) continue;   // (a ledge's own wall end is safe)
      this.faces.push([(c + 1) * TILE, r, dir]);
    }
  }
  hitbox() { return null; }
  touches() { return false; }
  update(g) {
    this.t++;
    if (!this.faces) this.build(g.level);
    const p = g.player;
    if (p.state !== 'play' || p.invuln > 0) return;
    for (const [fx, r, dir] of this.faces) {
      const box = { x: dir > 0 ? fx : fx - PAP_DEPTH, y: r * TILE + 2, w: PAP_DEPTH, h: TILE - 2 };
      if (!overlap(box, p)) continue;
      g.hurtPlayer();
      p.vx = dir * 2.2; p.airMax = Math.max(p.airMax || 0, 2.2);   // jabbed away from the wall
      g.burst(dir > 0 ? fx + 3 : fx - 3, r * TILE + 8, ['#ffe0e6', '#e8788a'], 5);
      return;
    }
  }
  draw(ctx, g) {   // (painted fine: papillaArt)
    if (!this.faces) return;
    const gullet = g.entities.find(e => e instanceof Gullet);
    for (const [fx0, r, dir] of this.faces) {
      for (let i = 0; i < 2; i++) {
        const fx = fx0 + (gullet ? dir * 2 * gullet.squeeze(r * TILE + 8, g.t) : 0);   // pushed in as the wave passes
        const by = r * TILE + 5 + i * 8, sway = Math.round(Math.sin(this.t * 0.05 + r * 1.3 + i * 2) * 0.7);
        ctx.save(); ctx.translate(fSnap(fx), by); if (dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(papillaArt(sway), -1, -10); ctx.restore();
      }
    }
    if (gullet) gullet.drawMucus(ctx, g);   // the slime runs down over them
  }
}
// a papilla (pointing right from the wall at x 1, its root's middle at y 10; 14 x 16): keratin like a fingernail, a pale
// horny cone growing out of a pink root, swept up and out to a hard translucent point, ridged as it grows
const PAPILLA_ART = {};
function papillaArt(sway) {
  return PAPILLA_ART[sway] || (PAPILLA_ART[sway] = (() => {
    const A = mArt(14, 16), L = 10, rise = 6 - sway, by = 10;
    A.fill(1, 0, 12, 16, (x, y) => {
      const u = (x - 1) / L; if (u < 0 || u > 1) return null;
      const top = by - 3.5 - (rise - 3.5) * u, bot = by + 3.5 - (rise + 3.5) * u * u;
      if (y < top || y > bot) return null;
      const v = (y - top) / Math.max(0.5, bot - top), ridge = Math.abs(((u * L) % 2) - 1) < 0.18 && v > 0.55;
      return u < 0.2 ? lerpColor('#f4b8b0', '#a8505a', v) : u > 0.8 ? lerpColor('#ffffff', '#e8dcc0', v) : ridge ? '#d4bf98' : softTone(['#a88c64', '#c8b08a', '#efe0c0', '#fff6e4', '#ffffff'], 1.1 - v * 1.8);
    });
    A.outline('#3a1a16');
    return A.canvas();
  })());
}

class ThroatRing extends Enemy {
  constructor(col, row, w = 3) {
    super(col * TILE, row * TILE, w * TILE, TILE);
    this.col = col; this.row = row; this.n = w;
    this.passive = true; this.behindTiles = false;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  update() { this.t++; }
  draw(ctx) {
    const y = this.y, w = this.w, cx = this.x + w / 2, half = w / 2, pulse = Math.sin(this.t * 0.08);
    // a sphincter of muscle seen side-on: two fat, rounded lips either side of the hole, gently pulsing, and the
    // black of the gullet below them
    const gap = half - 2 + pulse * 0.6;   // (in fine pixels: hires.js)
    fRect(ctx, cx - gap, y + 2, gap * 2, TILE - 2, '#12040a');
    for (const sd of [-1, 1]) {
      const lx = cx + sd * (gap + 9), ly = y + 7.5;
      const lip = ctx.createRadialGradient(lx - sd * 3, ly - 3, 1, lx, ly, 10); lip.addColorStop(0, '#f0a0b0'); lip.addColorStop(0.45, '#c85a72'); lip.addColorStop(1, '#8a2a44');
      fEll(ctx, lx, ly, 11.4, 8.4, '#4a1222'); fEll(ctx, lx, ly, 10.4, 7.4, lip); fEll(ctx, lx - sd * 2, ly - 4.2, 4, 1, '#ffc0cc');
      ctx.strokeStyle = '#8a2a44'; ctx.lineWidth = 0.6; ctx.lineCap = 'round'; ctx.beginPath();
      for (const k of [-6, -2, 2, 6]) { ctx.moveTo(lx + k + 0.5, ly + 1.6); ctx.quadraticCurveTo(lx + k * 0.8 + 0.5, ly + 4, lx + k * 0.6 + 0.5, ly + 6.2); }   // folds of muscle
      ctx.stroke();
    }
  }
}

// ── the gullet, painted: one organic picture instead of repeating tiles ─────
//   ['gullet', x0, x1]  paints those columns (one room) as a cut through the turtle's gullet: the walls in the layers
//                       real tissue has, by how far each pixel is from the open throat (a wet glistening edge, folded
//                       red mucosa, pale submucosa with bluish veins, deep red muscle fading to dark); the open tube as
//                       its far wall, with long folds down it; and the bone ledges as swallowed fish skeletons lodged
//                       across it. Over that, live: a slow peristalsis wave squeezing down, mucus beads sliding down
//                       the walls and dripping, a wet sheen. (The tiles and decor in those columns aren't drawn.)
const GULLET_ART = new Map(), GULLET_QUEUE = new Map();   // x0 -> the baked pictures (they never change); rooms being painted ahead
const BAYER4 = new Array(16).fill(0);   // (once an ordered dither; now none: clean bands of tone, like the rest of the fine game)
const ghash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function gnoise(x, y) {   // smooth value noise, 0..1
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = ghash(xi, yi), b = ghash(xi + 1, yi), c = ghash(xi, yi + 1), d = ghash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const GUL = {
  edgeTop: hex('#ffc4d0'), edgeSide: hex('#e8647c'), edgeBot: hex('#a42c46'), glint: hex('#ffffff'),
  muc: [hex('#7e1c32'), hex('#a8304a'), hex('#c8425a'), hex('#e0607a')],                 // the mucosa, crease to crest
  sub: [hex('#d88a92'), hex('#ecaab0')], vein: [hex('#5a5aa8'), hex('#7c7cc8')],           // submucosa and its veins
  mus: [hex('#5e0e1e'), hex('#7a1626'), hex('#94202e'), hex('#ac2c3a')],                 // muscle, fibre by fibre
  deep: [hex('#5e0e1e'), hex('#420816'), hex('#2c0510'), hex('#1c030a')],                // ...fading into the dark
  tube: [hex('#0e0308'), hex('#18050d'), hex('#240913'), hex('#320d1a'), hex('#421322'), hex('#541a2c')],
  bone: hex('#f2e8d2'), boneShade: hex('#c4b292'), boneHi: hex('#fffcf2'), boneInk: hex('#3a1a16'),
  mucW: 9, subW: 15, musW: 34, far: 'folds',
};
// Each part of the gut is painted the same way, in its own tissue: `far` is the pattern on the far wall of the open
// space (long folds down the gullet, the stomach's thick meandering rugae, the pylorus's rings of muscle, the small
// intestine's velvety circular folds, the colon's bulging pouches)
const GUT_STYLES = {
  gullet: GUL,
  stomach: Object.assign({}, GUL, {
    edgeTop: hex('#ffb8c0'), edgeSide: hex('#e05468'), edgeBot: hex('#962238'),
    muc: [hex('#741428'), hex('#9a2440'), hex('#bc3450'), hex('#d8526c')],
    tube: [hex('#0c0206'), hex('#16040b'), hex('#220812'), hex('#300c19'), hex('#401222'), hex('#52182c')],
    mucW: 12, subW: 17, far: 'rugae',
  }),
  pylorus: Object.assign({}, GUL, {
    muc: [hex('#7a1a30'), hex('#a42e48'), hex('#c4405a'), hex('#dc5c76')],
    mus: [hex('#6e1426'), hex('#82182c'), hex('#962230'), hex('#a82a38')],
    mucW: 7, subW: 11, musW: 40, far: 'rings', fibre: 0.5,
  }),
  ileum: Object.assign({}, GUL, {
    edgeTop: hex('#ffd0dc'), edgeSide: hex('#f07a94'), edgeBot: hex('#b03a58'),
    muc: [hex('#8e2a48'), hex('#b8405e'), hex('#d85a78'), hex('#f07e98')],
    sub: [hex('#e8a0b0'), hex('#f6bccb')],
    tube: [hex('#100308'), hex('#1c0610'), hex('#2a0b18'), hex('#3a1122'), hex('#4c182e'), hex('#60203a')],
    mucW: 11, subW: 16, far: 'plicae', velvet: true,
  }),
  colon: Object.assign({}, GUL, {
    edgeTop: hex('#f0c0a0'), edgeSide: hex('#c8705a'), edgeBot: hex('#7a3424'),
    muc: [hex('#5e2420'), hex('#7c3428'), hex('#9a4834'), hex('#b46446')],
    sub: [hex('#c0907a'), hex('#d2a690')], vein: [hex('#4e5e34'), hex('#6e7e46')],
    mus: [hex('#4a1814'), hex('#5e2018'), hex('#742a1e'), hex('#8a3626')],
    deep: [hex('#4a1814'), hex('#341010'), hex('#22090a'), hex('#140506')],
    tube: [hex('#0a0604'), hex('#130c08'), hex('#1e140c'), hex('#2a1e12'), hex('#382818'), hex('#48341e')],
    far: 'haustra',
  }),
  cloaca: Object.assign({}, GUL, {
    edgeTop: hex('#e8b498'), edgeSide: hex('#b85c48'), edgeBot: hex('#68241a'),
    muc: [hex('#4e1a18'), hex('#6e2824'), hex('#8e3830'), hex('#aa4e42')],
    sub: [hex('#b87c6a'), hex('#cc9280')], vein: [hex('#445830'), hex('#627842')],
    mus: [hex('#3c1012'), hex('#54181a'), hex('#6e2224'), hex('#882e30')],
    deep: [hex('#3c1012'), hex('#2a0b0c'), hex('#1a0608'), hex('#0e0304')],
    tube: [hex('#080404'), hex('#120908'), hex('#1c100d'), hex('#281812'), hex('#362018'), hex('#462a1e')],
    mucW: 8, subW: 13, musW: 42, far: 'rings', fibre: 0.65,
  }),
};
// what the turtle's hindgut packs into hard mounds (S tiles in a painted room): crusty, pale on top, full of seeds
const DUNG = { crust: hex('#e2d0a6'), crustHi: hex('#f4e8c8'), body: [hex('#4e3e2a'), hex('#64503a'), hex('#7c684a'), hex('#94805c')], deep: hex('#2e2418'), seed: hex('#6a8a3a'), fleck: hex('#d8b84a') };
// In the Cloaca Vault: realistic dark, moist, coiled brown fecal matter (no yellow/white flecks)
const FECES_PAL = {
  crust: hex('#5e3416'), crustHi: hex('#9e6432'),
  body: [hex('#241106'), hex('#381c0c'), hex('#502a12'), hex('#6c3b1a')],
  deep: hex('#180a03'), seed: hex('#2e3c14'), fleck: hex('#301808'),
};

// Packed fecal material: irregular compressed strands, torn fibres, fissures and small
// wet highlights. Continuous world coordinates keep every face free of tile seams.
function fecalSurface(x,y,u,v,depth=8){
  const macro=gnoise(x*.11,y*.13),grain=gnoise(x*.85,y*.9),fibre=gnoise(x*.4,y*1.5);
  const phase=y*.68+Math.sin(x*.16)*1.4+gnoise(x*.09,y*.11)*3;
  const ridge=Math.sin(phase),crease=Math.max(0,-ridge-.48);
  let light=.48-u*.32-v*.22+(macro-.5)*.55+(grain-.5)*.15+(fibre-.5)*.1+ridge*.14-crease*.5;
  const crack=Math.abs(Math.sin(x*.34+y*.19+gnoise(x*.2,y*.2)*5));
  if(crack<.07&&macro>.43)light-=.22;
  const pore=ghash(Math.floor(x*1.3),Math.floor(y*1.3));
  if(pore<.025)light-=.18;
  if(depth<1.4)light+=u<.1?.12:-.09;
  if(ridge>.9&&macro>.57&&fibre>.63)light+=.2;
  return clamp(light,0,1);
}
const FECAL_TONES=['#201109','#3b2313','#60401f','#7f582f','#a17b49'].map(hex);

// the far wall's pattern at (wx, y): [brightness offset, phase 0..1 across the fold (for the wave's lit ring)]
function gutFar(kind, wx, y, mid) {
  let u;
  if (kind === 'rugae') u = (y + Math.sin(wx * 0.045) * 9 + Math.sin(wx * 0.11 + y * 0.02) * 3 + (gnoise(wx * 0.03, y * 0.05) - 0.5) * 14) / 17;
  else if (kind === 'rings') u = (y + Math.sin(wx * 0.025) * 2 + (gnoise(wx * 0.04, y * 0.1) - 0.5) * 3) / 11;
  else if (kind === 'plicae') u = (y - (wx - mid) * (wx - mid) * 0.0016 + (gnoise(wx * 0.05, y * 0.05) - 0.5) * 6) / 13;
  else if (kind === 'haustra') {   // pouches: rounded bulges between creases
    const a = Math.sin(wx * 0.06 + Math.sin(y * 0.03) * 0.8), c = Math.sin(y * 0.075 + Math.sin(wx * 0.02) * 1.2);
    const k = (a * 0.5 + 0.5) * (c * 0.5 + 0.5);
    return [k * 1.6 - 0.5 - (Math.abs(c) < 0.12 ? 0.7 : 0) + (ghash(wx, y) < 0.03 ? 0.6 : 0), k];
  } else u = (wx + Math.sin(y * 0.045 + wx * 0.013) * 4 + (gnoise(wx * 0.05, y * 0.02) - 0.5) * 9) / 13;
  const fr = u - Math.floor(u);
  let k = fr < 0.16 ? 1.1 : fr < 0.26 ? 0.5 : fr > 0.55 && fr < 0.68 ? -0.9 : 0;   // a fold's crest, its flank, the crease
  if (kind === 'plicae' && ghash(wx, y) < 0.18) k += 0.6;   // the velvet of the villi
  return [k, fr];
}
// a fish skeleton lodged across the gullet as a ledge (painted fine): L game px of spine (its top, at y 7 in the art, is
// what he stands on) with vertebrae and ribs swept back toward the tail, the skull half buried in the wall at the
// `dir` end -- a wedge with a big eye socket and a gaping jaw of needle teeth -- and a forked fan of a tail at the other.
// The art is L + 24 wide, 24 tall, the spine's left end at (12, 7)
const FISH_BONE_ART = new Map();
function fishBoneArt(L, dir) {
  const key = L + ':' + dir;
  if (FISH_BONE_ART.has(key)) return FISH_BONE_ART.get(key);
  const A = mArt(L + 24, 24), a = 12, z = 12 + L, y = 7, BONE = ['#8a765a', '#b8a280', '#d8c8a6', '#f2e8d2', '#fffcf2'];
  const headX = dir < 0 ? a - 4 : z + 4, tailX = dir < 0 ? z - 3 : a + 3;
  for (let x = a + 7; x < z - 7; x += 4) {   // ribs, curving down and back toward the tail
    const u = dir < 0 ? (x - a) / L : (z - x) / L, len = 3 + 8 * Math.sin(Math.min(1, u * 1.15) * Math.PI);
    let px = x, py = y + 2;
    for (let k = 0; k < len; k += 0.5) { const nx = x - dir * (k * k / 22), ny = y + 3 + k; A.line(px, py, nx, ny, BONE[2], null, 0.75 - k / len * 0.35); px = nx; py = ny; }
  }
  A.fill(a - 1, y - 1, z + 1, y + 4, (x, yy) => yy >= y && yy < y + 3 ? softTone(BONE, 1.1 - (yy - y) * 0.9) : null);   // the spine
  for (let x = a + 7; x < z - 7; x += 4) A.soft(x, y + 1.5, 1.2, 1.9, BONE);                                   // vertebrae
  A.fill(headX - 15, y - 6, headX + 15, y + 12, (x, yy) => {   // the skull: a wedge, its snout into the wall
    const k = (x - headX) * dir + 10; if (k < 0 || k > 15) return null;
    const top = y - 4 + Math.max(0, k - 9) * 0.6, bot = y + 7 - Math.max(0, k - 8) * 0.7;
    return yy >= top && yy <= bot ? softTone(BONE, 1.2 - (yy - top) / (bot - top) * 1.6 - (k > 12 ? 0.3 : 0)) : null;
  });
  A.line(headX + dir * -2, y + 10, headX + dir * 4.5, y + 8, BONE[2], null, 1);                               // the lower jaw
  A.fill(a - 6, y + 4, z + 6, y + 14, (x, yy) => { const k = (x - headX) * dir; return k > -9 && k < -3 && yy > y + 7.6 && yy < y + 8.8 ? '#3a1a16' : null; });   // the gape
  for (let k = 0; k < 7; k++) { const x = tailX - dir * k; A.line(tailX, y + 1.5, x, y + 1 - k * 0.7, BONE[3], null, 0.6); A.line(tailX, y + 1.5, x, y + 2 + k * 0.8, BONE[2], null, 0.6); }   // the tail's rays
  A.outline('#3a1a16');
  const ex = headX + dir * -2, ey = y + 0.5;
  A.ell(ex + dir * 0.5, ey, 1.6, 1.5, '#3a1a16');                                                               // the eye socket
  for (let k = 0; k < 4; k++) { const tx = headX + dir * (-8.5 + k * 1.6); A.poly([[tx - 0.4, y + 7.6], [tx + 0.4, y + 7.6], [tx, y + 9]], '#fffcf2'); }   // needle teeth
  FISH_BONE_ART.set(key, A.canvas());
  return FISH_BONE_ART.get(key);
}
class Gullet extends Enemy {
  constructor(x0, x1, style = 'gullet') {
    super(x0 * TILE, 0, (x1 - x0 + 1) * TILE, VIEW_H);
    this.x0 = x0; this.x1 = x1; this.style = style;
    this.passive = true; this.behindTiles = true; this.paintsRoom = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return null; }
  touches() { return false; }
  waveY(t) { return (t * 0.75) % (VIEW_H + 160) - 60; }
  squeeze(y, t) { const u = (y - this.waveY(t)) / 40; return Math.exp(-(((u + 0.1) / 0.38) ** 2)); }   // how hard the wave is squeezing at y, 0..1
  claim(lv) { for (let c = this.x0; c <= this.x1; c++) lv.painted[c] = 1; }
  update(g) { this.t++; this.claim(g.level); }
  // Bake the room once: a distance field from the open throat decides every wall pixel's layer. Painted at the fine
  // screen's scale (S art px to a game px: hires.js), every tone blended smoothly along its ramp. A generator, yielding
  // after each row of the work: the next room is painted a few milliseconds a frame while he plays (gutBakeTick)
  bake(lv) { const it = this.bakeSteps(lv); let r; while (!(r = it.next()).done); return r.value; }
  *bakeSteps(lv) {
    const S = ART_R, W = this.w, H = VIEW_H, X0 = this.x0 * TILE, FW = W * S, FH = H * S, N = FW * FH;
    // open: anything that isn't wall (a ledge or the throat ring's gap is open: the tube shows behind them)
    // Secret pockets are passable, but still belong to the unbroken flesh texture until entered.
    const solidPx = (x, y) => { const c = Math.floor((X0 + x) / TILE), r = Math.floor(y / TILE), t = lv.get(c, r); return y >= 0 && y < H && lv.looksSolid(c, r) && t !== T.BODY && !(t >= T.QCOIN && t <= T.USED); };   // (question blocks stay ordinary yellow blocks, not flesh)
    const P = GUT_STYLES[this.style] || GUL, wall = new Uint8Array(N), dung = new Uint8Array(N);
    // calcified dung ('S'): and a secret hollow tucked into a mound is painted as that mound too, so it doesn't show
    const dungMemo = new Map(), isDung = (c, r) => { const k = r * 1000 + c; if (!dungMemo.has(k)) dungMemo.set(k, lv.get(c, r) === T.SOLID || (!!lv.secretAt(c, r) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => lv.get(c + a, r + b) === T.SOLID))); return dungMemo.get(k); };
    for (let y = 0; y < FH; y++, yield) for (let x = 0; x < FW; x++) {
      const gx = (x + 0.5) / S, gy = (y + 0.5) / S;
      wall[y * FW + x] = solidPx(gx, gy) ? 1 : 0;
      if (isDung(Math.floor((X0 + gx) / TILE), Math.floor(gy / TILE))) dung[y * FW + x] = 1;
    }
    // organic outlines: corners round off and straight edges wobble a little (blur the tile mask, threshold with noise)
    {
      const R = 4 * S, src = wall.slice(), material = dung.slice();
      const materialAt=(xx,yy)=>xx>=0&&xx<FW&&yy>=0&&yy<FH&&material[yy*FW+xx];
      const at = (x, y) => x < 0 || x >= FW ? 1 : src[clamp(y, 0, FH - 1) * FW + x];
      const PW = FW + 2 * R, PH = FH + 2 * R, I = new Float32Array((PW + 1) * (PH + 1));
      for (let y = 0; y < PH; y++, (y % 8 ? 0 : yield)) for (let x = 0; x < PW; x++) I[(y + 1) * (PW + 1) + x + 1] = at(x - R, y - R) + I[y * (PW + 1) + x + 1] + I[(y + 1) * (PW + 1) + x] - I[y * (PW + 1) + x];
      const A = (2 * R + 1) * (2 * R + 1);
      for (let y = 0; y < FH; y++, yield) for (let x = 0; x < FW; x++) {
        const x1 = x + 2 * R + 1, y1 = y + 2 * R + 1, sum = I[y1 * (PW + 1) + x1] - I[y * (PW + 1) + x1] - I[y1 * (PW + 1) + x] + I[y * (PW + 1) + x];
        const i=y*FW+x,wx=X0+(x+.5)/S,gy=(y+.5)/S,ratio=sum/A;
        const fecal=this.style==='cloaca'&&(material[i]||materialAt(x-R,y)||materialAt(x+R,y)||materialAt(x,y-R)||materialAt(x,y+R));
        const rough=fecal&&ratio>.1&&ratio<.9?(gnoise(wx*.49,gy*.36)-.5)*.3+Math.sin(gy*.8+wx*.13)*.055:0;
        wall[i]=ratio>.5+(gnoise(wx*.11,gy*.11)-.5)*.3+rough?1:0;
        // Any outward rounding inherits the pillar's material, so no flesh-colored backing leaks out.
        if(wall[i]&&!src[i]&&fecal)dung[i]=1;
      }
    }
    // the slime slides: slabs of tissue under each slope's surface
    for (const sl of lv.def.entities.filter(e => e[0] === 'slide' && e[1] >= this.x0 && e[1] <= this.x1 + 1)) {
      const [ax, ay, bx, by] = [sl[1] * TILE - X0, sl[2] * TILE, sl[3] * TILE - X0, sl[4] * TILE];
      for (let x = Math.max(0, Math.min(ax, bx) * S); x < Math.min(FW, Math.max(ax, bx) * S); x++) {
        const top = Math.round((ay + (by - ay) * ((x + 0.5) / S - ax) / (bx - ax)) * S);
        for (let y = top; y < Math.min(FH, top + SLIDE_THICK * S); y++) if (y >= 0) wall[y * FW + x] = 1;
      }
    }
    // two chamfer passes each way: dW (in the walls) = distance to the nearest open pixel, dO (in the tube) = to the nearest wall
    const field = function* (mine) {
      const d = new Float32Array(N).fill(1e5);
      for (let i = 0; i < N; i++) if (wall[i] !== mine) d[i] = 0;
      const at = (x, y) => x < 0 || x >= FW || y < 0 || y >= FH ? 1e5 : d[y * FW + x];
      for (let y = 0; y < FH; y++, yield) for (let x = 0; x < FW; x++) {
        const i = y * FW + x; if (!d[i]) continue;
        d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.41, at(x + 1, y - 1) + 1.41);
      }
      for (let y = FH - 1; y >= 0; y--, (y % 4 ? 0 : yield)) for (let x = FW - 1; x >= 0; x--) {
        const i = y * FW + x; if (!d[i]) continue;
        d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.41, at(x - 1, y + 1) + 1.41);
      }
      for (let i = 0; i < N; i++) d[i] /= S;   // (in game px)
      return d;
    };
    const dW = yield* field(1), dO = yield* field(0);
    const fecalForms=lv.def.map.filter(c=>c[0]==='rect'&&c[5]==='S'&&c[1]<=this.x1&&c[3]>=this.x0)
      .map(c=>({left:c[1]*TILE,right:(c[3]+1)*TILE,top:c[2]*TILE,bottom:(c[4]+1)*TILE}));
    const pic = makeCanvas(FW, FH), pg = pic.getContext('2d'), img = pg.createImageData(FW, FH), px = img.data;
    const put = (i, c, a = 255) => { px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = a; };
    const ramp = (pal, t) => { t = clamp(t, 0, 0.9999) * (pal.length - 1); const k = Math.floor(t), u = t - k, a = pal[k], b = pal[k + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };
    const isWall = (x, y) => x < 0 || x >= FW ? 1 : wall[clamp(y, 0, FH - 1) * FW + x];   // (the walls carry on up and down out of sight)
    // masks for the live layers: the rim the wave flushes, the tube lit and shadowed by its ring, the wet sheen
    const layer = () => { const c = makeCanvas(FW, FH); return [c, c.getContext('2d').createImageData(FW, FH)]; };
    const [rim, rimD] = layer(), [lit, litD] = layer(), [shade, shadeD] = layer(), [gloss, glossD] = layer();
    const mput = (D, i, c, a) => { D.data[i * 4] = c[0]; D.data[i * 4 + 1] = c[1]; D.data[i * 4 + 2] = c[2]; D.data[i * 4 + 3] = a; };
    for (let y = 0; y < FH; y++, yield) for (let x = 0; x < FW; x++) {
      const i = y * FW + x, wx = X0 + (x + 0.5) / S, gy = (y + 0.5) / S;
      if (wall[i]) {
        // the layers follow the cut, wobbling a little so they never look ruled
        const d = dW[i] + (gnoise(wx * 0.07, gy * 0.07) - 0.5) * 5 + (gnoise(wx * 0.23, gy * 0.23) - 0.5) * 1.5;
        if (dung[i]) {   // a calcified mound or realistic coiled fecal mass: crust, mottled brown inside, seeds/corn and grit baked in
          if(this.style==='cloaca'){
            const form=fecalForms.find(f=>wx>=f.left-5&&wx<f.right+5&&gy>=f.top-5&&gy<f.bottom+5);
            const u=form?(wx-(form.left+form.right)/2)/((form.right-form.left)/2):0;
            const v=form?(gy-form.top)/Math.max(8,form.bottom-form.top):0;
            const tone=clamp(fecalSurface(wx,gy,u,v,dW[i])+(dW[i]<1.1?.09:0),0,1);
            put(i,ramp(FECAL_TONES,tone));
            if(dW[i]<1.4&&gnoise(wx*.6,gy*.3)>.47)mput(glossD,i,hex('#c6a36c'),145);
            continue;
          }
          const DP = this.style === 'cloaca' ? FECES_PAL : DUNG;
          const coil = this.style === 'cloaca' ? Math.sin(gy * 0.45 + gnoise(wx * 0.08, gy * 0.08) * 3.5) * 0.35 : 0;
          const n = gnoise(wx * 0.15, gy * 0.15) + coil, cx = Math.floor(wx * 0.7), cy = Math.floor(gy * 0.7), sd = ghash(cx, cy);
          const inSeed = Math.hypot(wx * 0.7 - cx - 0.5, gy * 0.7 - cy - 0.5) < 0.34;
          const up = !isWall(x, y - S);
          put(i, dW[i] < 1.5 ? (up ? DP.crustHi : DP.crust) : dW[i] < 3.5 ? DP.crust : inSeed && sd < 0.03 ? DP.seed : inSeed && sd > 0.985 ? DP.fleck : ramp(DP.body, n * 1.05 - Math.min(d, 40) / 90 + 0.1));
          if (up && dW[i] < 1.5 && this.style === 'cloaca') mput(glossD, i, DP.crustHi, 200);
          continue;
        }
        if (dW[i] < 1.5) {   // the wet edge: lit where it faces up, dark underneath
          const up = !isWall(x, y - S) || !isWall(x, y - 2 * S), down = !isWall(x, y + S);
          put(i, up ? (ghash(x + X0 * S, y) < 0.05 ? P.glint : P.edgeTop) : down ? P.edgeBot : P.edgeSide);
          if (up) mput(glossD, i, P.glint, 255);
          mput(rimD, i, P.edgeTop, 255);
        } else if (d < P.mucW) {   // mucosa: thick folds running along the cut, creased between
          const f = Math.sin(d * 1.15 + gnoise(wx * 0.05, gy * 0.05) * 7) + (P.velvet && ghash(x + X0 * S, y) < 0.2 ? 0.9 : 0);   // (velvety with villi, in the small intestine)
          put(i, ramp(P.muc, (f + 1.1) / 2.2));
          if (dW[i] < 3) mput(glossD, i, P.edgeTop, 120);
          mput(rimD, i, P.muc[3], 255);
        } else if (d < P.subW) {  // submucosa: paler, loose, threaded with bluish veins
          const v = Math.abs(gnoise(wx * 0.045 + 9, gy * 0.045) - 0.5), v2 = Math.abs(gnoise(wx * 0.11, gy * 0.11 + 5) - 0.5);
          put(i, v < 0.025 ? P.vein[0] : v < 0.04 || v2 < 0.015 ? P.vein[1] : ramp(P.sub, gnoise(wx * 0.3, gy * 0.3)));
          mput(rimD, i, P.muc[2], 200);
        } else if (d < P.musW) {  // muscle: bundles of fibre wrapping round the tube
          const fb = P.fibre || 1, sv = Math.sin((wx * 0.35 + gy * 0.9) * fb + gnoise(wx * 0.04, gy * 0.04) * 9) + (gnoise(wx * 0.5, gy * 0.12) - 0.5) * 0.9;
          put(i, ramp(P.mus, (sv + 1.1) / 2.2));
        } else put(i, ramp(P.deep, (d - P.musW) / 36));   // ...and on into the dark
      } else {
        // the far wall of the open space, darker where it curves away near the walls and deeper down; each part
        // of the gut has its own pattern of folds on it
        const sO = dO[i], n = gnoise(wx * 0.08, gy * 0.03), [k0, fr] = gutFar(P.far, wx, gy, X0 + W / 2);
        const k = Math.min(1, sO / 34) * 3.2 + 1.4 - (gy / H) * 1.6 + (n - 0.5) * 0.8 + k0;
        put(i, ramp(P.tube, k / 5.5));
        mput(litD, i, P.muc[fr < 0.2 ? 2 : 1], 255); mput(shadeD, i, P.tube[0], 255);
      }
    }
    // Fish skeletons have their own layer: a broken fish must reveal the untouched tissue behind it.
    const bones = [], fishes = [];
    const bone = new Uint8Array(W * H);   // (in game px: where the cracks can run and what the pieces cut out)   // 1 bone, 2 shade, 3 highlight, 4 rib (no outline), 9 the eye socket
    const B = (x, y, k = 1) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H && (!bone[y * W + x] || k === 3)) bone[y * W + x] = k; };
    for (const { key, c, e, r } of lv.gutBones.values()) {
      if (c < this.x0 || c > this.x1) continue;
      const dir = lv.solid(e + 1, r) && !lv.solid(c - 1, r) ? 1 : -1;   // which way the head points (into the wall)
      const a = (c - this.x0) * TILE, z = (e + 1 - this.x0) * TILE, y = r * TILE, L = z - a;
      const sx = Math.max(0, a - 10), sy = Math.max(0, y - 6);
      fishes.push({ a, y, L, dir });
      bones.push({ key, sx, sy, w: Math.min(W, z + 10) - sx, h: Math.min(H, y + 17) - sy });
      const headX = dir < 0 ? a - 4 : z + 4, tailX = dir < 0 ? z - 3 : a + 3;
      for (let x = a; x < z; x++) { B(x, y, 3); B(x, y + 1); B(x, y + 2, 2); }   // the spine (its top is what he stands on)
      for (let x = a + 7; x < z - 7; x += 4) {    // vertebrae, and a rib off each, swept back toward the tail
        const u = dir < 0 ? (x - a) / L : (z - x) / L, len = Math.round(3 + 8 * Math.sin(Math.min(1, u * 1.15) * Math.PI));
        B(x, y + 1, 2);
        for (let k = 0; k < len; k++) B(x - dir * Math.round(k * k / 22), y + 3 + k, 4);
      }
      // the skull: a wedge with a big eye socket and a gaping jaw of needle teeth, half buried in the wall
      for (let k = 0; k < 15; k++) {
        const hx = headX + dir * (k - 10), top = y - 4 + Math.round(Math.max(0, k - 9) * 0.6), bot = y + 7 - Math.round(Math.max(0, k - 8) * 0.7);
        for (let yy = top; yy <= bot; yy++) B(hx, yy, yy === top ? 3 : yy > bot - 2 ? 2 : 1);
      }
      for (let k = 0; k < 7; k++) { B(headX + dir * (k - 2), y + 10 + Math.round(k * -0.3)); if (k & 1) B(headX + dir * (k - 2), y + 9, 3); }   // the lower jaw
      for (let k = 0; k < 6; k++) B(headX + dir * (k - 9), y + 8 + (k > 3 ? 1 : 0), 2);
      const ex = headX + dir * -2, ey = y;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [1, -1], [-1, 1], [2, 0], [2, 1]]) bone[(ey + dy) * W + ex + dx * dir] = 9;   // the socket
      // the tail: a forked fan of rays
      for (let k = 0; k < 8; k++) { B(tailX - dir * k, y + 1 - Math.round(k * 0.7), k > 5 ? 1 : 2); B(tailX - dir * k, y + 2 + Math.round(k * 0.8)); }
      for (let k = 2; k < 7; k += 2) for (let j = 1; j < k; j++) B(tailX - dir * k, y + 1 - Math.round(k * 0.7) + j * 1.4, 2);
      // Cracks that creep through it once he's on it (revealed by the timer, see drawGutBones), and the pieces
      // it breaks into: the picture itself cut into little squares that fall with it.
      const rng = mulberry32(key * 7919 + 17), solidAt = (xx, yy) => xx >= 0 && xx < W && yy >= 0 && yy < H && bone[yy * W + xx] > 0 && bone[yy * W + xx] < 9;
      const cracks = [], seeds = [];
      let reach = 0;
      for (let sx0 = a + 6 + Math.floor(rng() * 8); sx0 < z - 6; sx0 += 15 + Math.floor(rng() * 10)) seeds.push([sx0, y, Math.floor(rng() * 70)]);
      seeds.push([headX + dir * -4, y - 3, Math.floor(rng() * 70)]);   // one across the skull
      for (const [cx, cy, d0] of seeds) {
        let xx = cx, yy = cy, d = d0;
        for (let n = 0; n < 16; n++) {   // down through the spine and along a rib
          if (solidAt(xx, yy)) { cracks.push([xx, yy, d]); reach = Math.max(reach, d); }
          d += 2; yy += 1; if (rng() < 0.4) xx += rng() < 0.5 ? -1 : 1;
          if (!solidAt(xx, yy)) { xx -= dir; if (!solidAt(xx, yy)) break; }
        }
        for (const side of [-1, 1]) {   // and lengthways along the spine
          if (rng() < 0.4) continue;
          let lx = cx, ld = d0 + 3;
          for (let n = 0, m = 3 + Math.floor(rng() * 6); n < m; n++, ld += 2) {
            lx += side; const ly = y + 1 + (rng() < 0.2 ? 1 : 0);
            if (!solidAt(lx, ly)) break;
            cracks.push([lx, ly, ld]); reach = Math.max(reach, ld);
          }
        }
      }
      const pieces = [];
      for (let py = sy; py < sy + (Math.min(H, y + 17) - sy); py += 6) for (let px = sx; px < sx + (Math.min(W, z + 10) - sx); px += 6) {
        let any = false;
        for (let dy = -1; dy < 7 && !any; dy++) for (let dx = -1; dx < 7; dx++) if (solidAt(px + dx, py + dy)) { any = true; break; }
        if (any) pieces.push([px, py, Math.min(6, W - px), Math.min(6, H - py)]);
      }
      const entry = bones[bones.length - 1];
      entry.cracks = cracks; entry.reach = reach; entry.pieces = pieces; entry.mid = (a + z) / 2;
    }
    const bonePic = makeHiCanvas(W, H), bg = bonePic.getContext('2d');
    for (const F of fishes) bg.drawImage(fishBoneArt(F.L, F.dir), F.a - 12, F.y - 7);   // (painted fine: fishBoneArt)
    pg.putImageData(img, 0, 0);
    for (const [c, D] of [[rim, rimD], [lit, litD], [shade, shadeD], [gloss, glossD]]) c.getContext('2d').putImageData(D, 0, 0);
    // where mucus can run: every stretch of wall face, top to bottom, and whether it drips off the end
    const runs = [];
    for (let c = this.x0; c < this.x1; c++) for (const side of [1, -1]) {
      let r0 = -1;
      for (let r = 0; r <= ROWS; r++) {
        const face = r < ROWS && lv.looksSolid(side > 0 ? c : c + 1, r) && !lv.looksSolid(side > 0 ? c + 1 : c, r) && lv.get(side > 0 ? c + 1 : c, r) !== T.SEMI;
        if (face && r0 < 0) r0 = r;
        if (!face && r0 >= 0) {
          const fx = (c + 1 - this.x0) * TILE + (side > 0 ? 0 : -2);
          let floor = r; while (floor < ROWS && !lv.solid(side > 0 ? c + 1 : c, floor)) floor++;
          runs.push({ x: fx, y0: r0 * TILE, y1: r * TILE, floor: floor * TILE, side, fecal: lv.get(side>0?c:c+1,r0)===T.SOLID });
          r0 = -1;
        }
      }
    }
    // Coral Deep's hollow renderer needs each cell's actual terrain art. Sample the continuous
    // flesh painting so the closed pocket has exactly the same texture and outline as its surroundings.
    const hollows = [];
    for (const s of lv.secrets) for (let r = s.r0; r <= s.r1; r++) for (let c = Math.max(this.x0, s.c0); c <= Math.min(this.x1, s.c1); c++) {
      const cell = makeHiCanvas(TILE, TILE);
      cell.getContext('2d').drawImage(pic, (c - this.x0) * TILE * S, r * TILE * S, TILE * S, TILE * S, 0, 0, TILE, TILE);
      hollows.push({ c, r, cell });
    }
    // Exact open-space spans preserve the same organic contour when liquid fills the chamber.
    const liquidRows = [];
    for (let y = 0; y < FH; y++) {   // exact art-pixel rows, with spans in game units
      const spans = [], fy = y;
      for (let x = 0; x < FW;) {
        if (wall[fy * FW + x]) { x++; continue; }
        const start = x;
        while (x < FW && !wall[fy * FW + x]) x++;
        spans.push([start / S, (x - start) / S]);
      }
      liquidRows.push(spans);
    }
    return { pic: hiRes(pic, S), rim: hiRes(rim, S), lit: hiRes(lit, S), shade: hiRes(shade, S), gloss: hiRes(gloss, S), runs, hollows, bonePic, bones, liquidRows, liquidScale: S };
  }
  draw(ctx, g) {
    this.claim(g.level);
    if (this.x + this.w < g.camX - 16 || this.x > g.camX + VIEW_W + 16) return;
    let A = GULLET_ART.get(g.level.def.id + ':' + this.x0);
    if (!A) {   // (not painted yet: finish it now -- carrying on with the one under way, if it's queued)
      const key = g.level.def.id + ':' + this.x0, it = GULLET_QUEUE.get(key);
      if (it) { let r; while (!(r = it.next()).done); A = r.value; GULLET_QUEUE.delete(key); } else A = this.bake(g.level);
      GULLET_ART.set(key, A);
    }
    const X = this.x, t = g.t, W = this.w, H = VIEW_H;
    ctx.drawImage(A.pic, X, 0);
    // the peristalsis: a ring of muscle squeezing down the tube every few seconds -- the walls flush and swell in
    // (the papillae lean out with them), the far wall bulges into the light with a shadow under it, and it rolls
    // on down to the throat
    const visLeft = Math.max(0, Math.floor(g.camX - X));
    const visRight = Math.min(W, Math.ceil(g.camX + VIEW_W - X));
    const visW = visRight - visLeft;
    if (visW > 0) {
      const wy = this.waveY(t);
      for (let y = Math.max(0, Math.floor(wy - 40) & ~1); y < Math.min(H, wy + 48); y += 2) {
        const u = (y - wy) / 40, k1 = Math.exp(-(((u + 0.1) / 0.38) ** 2)), k2 = Math.exp(-(((u - 0.62) / 0.26) ** 2));
        if (k1 > 0.04) {
          ctx.globalAlpha = 0.45 * k1; ctx.drawImage(A.rim, visLeft, y, visW, 2, X + visLeft, y, visW, 2);
          ctx.globalAlpha = 0.5 * k1; ctx.drawImage(A.lit, visLeft, y, visW, 2, X + visLeft, y, visW, 2);
        }
        if (k2 > 0.04) {
          ctx.globalAlpha = 0.55 * k2; ctx.drawImage(A.shade, visLeft, y, visW, 2, X + visLeft, y, visW, 2);
        }
      }
    }
    // a faint wet sheen sliding slowly across the walls
    const sx = (t * 0.5) % (W + 240) - 120;
    if (X + sx + 40 >= g.camX && X + sx - 70 <= g.camX + VIEW_W) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(X + sx, 0); ctx.lineTo(X + sx + 40, 0); ctx.lineTo(X + sx - 30, H); ctx.lineTo(X + sx - 70, H); ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 0.35; ctx.drawImage(A.gloss, X, 0); ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const B of A.bones) {
      const bone = g.level.gutBones.get(B.key);
      if (!bone) continue;
      if (bone.gone) { if (bone.fall >= 0 && bone.fall < 120) g.drawBoneRubble(ctx, A, B, bone, X); continue; }
      const k = bone.t >= 0 ? bone.t / GUT_BONE_BREAK : -1;
      const shake = k > 0.7 && bone.load ? ((bone.t >> 1) % 2 ? 1 : -1) : 0, sag = k > 0.85 && bone.load ? 1 : 0;
      if (bone.grow > 0) ctx.globalAlpha = 1 - bone.grow / BONE_GROW;
      ctx.drawImage(A.bonePic, B.sx, B.sy, B.w, B.h, X + B.sx + shake, B.sy + sag, B.w, B.h);
      ctx.globalAlpha = 1;
      if (k > 0) {   // the fractures spreading, thicker the longer he stands there
        const reach = B.reach * Math.min(1, k * 1.15 + 0.04);
        ctx.fillStyle = '#5a3426'; ctx.beginPath();   // (in fine pixels: hires.js)
        for (const q of B.cracks) if (q[2] <= reach) ctx.rect(X + q[0] + shake + 1 / 6, q[1] + sag + 1 / 6, 2 / 3, 2 / 3);
        ctx.fill();
        if (k > 0.55) {   // as it gets bad the cracks run wide and a pale seam shows along the top
          ctx.fillStyle = '#3a1a16'; ctx.beginPath();
          for (const q of B.cracks) if (q[2] <= reach - 8 && q[2] % 3 === 0) ctx.rect(X + q[0] + shake + 2 / 3, q[1] + sag + 1 / 3, 2 / 3, 1 / 3);
          ctx.fill();
        }
      }
    }
    if(this.style==='cloaca')for(const R of A.runs)if(R.fecal){
      const span=R.y1-R.y0;if(span<6)continue;
      const y=R.y0+4+((t*.1+R.x*.37)%Math.max(1,span-6));
      const x=X+R.x+R.side*.3+Math.sin(y*.27)*.7;
      ctx.save();ctx.globalAlpha=.48;fLine(ctx,x,y-4,x+.2,y,'#ad8d58',.45);
      fEll(ctx,x+.2,y+.3,.65,1.05,'#c4a36d');fBlob(ctx,x,y-.1,.23,'#e5c995');ctx.restore();
    }
    for (const S of g.gut.seals) if (S.a * TILE >= X && S.b * TILE < X + W) g.drawGutSeal(ctx, S);
    for (const { c, r, cell } of A.hollows) {
      const secret = g.level.secretAt(c, r);
      if (secret && secret.rev > 0) {
        ctx.save();
        const cap = r === secret.r0 ? secret.cap : 0;
        ctx.beginPath(); ctx.rect(c * TILE, r * TILE + cap, TILE, TILE - cap); ctx.clip();
        g.drawHollowCell(ctx, cell, c, r, secret.rev);
        ctx.restore();
      }
    }
  }
  // mucus: beads sliding down the wall faces (over the papillae: Papillae.draw calls this), gathering at the bottom
  // of each and dripping off
  drawMucus(ctx, g) {
    const A = GULLET_ART.get(g.level.def.id + ':' + this.x0), X = this.x, t = g.t;
    if (!A) return;
    for (let n = 0; n < A.runs.length; n++) {
      const R = A.runs[n], len = R.y1 - R.y0, fall = R.floor - R.y1;
      for (let j = 0; j < 1 + (len > 64 ? 1 : 0); j++) {
        const sp = 0.18 + ghash(n, j) * 0.14, cyc = len / sp + 40 + fall / 1.5 + 90 * ghash(j, n), f = (t + ghash(n * 7, j) * cyc) % cyc;
        const bx = X + R.x + 1;   // (in fine pixels: hires.js)
        if (f < len / sp) {   // sliding (slow, then quicker as it fattens)
          const y = R.y0 + f * sp * (0.6 + 0.4 * f * sp / len);
          ctx.globalAlpha = 0.45; fRoundRect(ctx, bx - 0.8, y - 7, 1.6, 6, 0.8, '#ffb8c6'); ctx.globalAlpha = 1;   // its wet trail
          fEll(ctx, bx, y + 0.4, 1.1, 1.5, '#ffd8e0'); fBlob(ctx, bx + (R.side > 0 ? -0.4 : 0.4), y - 0.3, 0.35, '#ffffff');
        } else if (f < len / sp + 40) {   // swelling at the lip...
          const k = (f - len / sp) / 40, y = R.y1 - 1;
          fEll(ctx, bx, y + 1 + k, 1.1, 1 + k, '#ffd8e0'); fBlob(ctx, bx - 0.4, y + 0.8, 0.35, '#ffffff');
        } else if (fall > 0) {            // ...and dropping, to splat on whatever's below
          const ft = f - len / sp - 40, y = R.y1 + 2 + 0.05 * ft * ft, dx = bx + R.side * 2;
          if (y < R.floor - 1) { fEll(ctx, dx, y + 1.5, 0.9, 1.5, '#ffd8e0'); fBlob(ctx, dx - 0.3, y + 0.8, 0.3, '#ffffff'); }
          else if (y < R.floor + 6) { fEll(ctx, dx, R.floor - 0.4, 1.6, 0.5, '#ffd8e0'); fBlob(ctx, dx - 2.4, R.floor - 0.6, 0.45, '#ffd8e0'); fBlob(ctx, dx + 2.6, R.floor - 0.6, 0.45, '#ffd8e0'); }
        }
      }
    }
  }
}
