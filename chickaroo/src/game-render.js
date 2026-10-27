'use strict';
function entityInView(e, cam) {
  if (e.paintsRoom || e.drawOver) {
    return (e.x + (e.w || 16) >= cam - 16 && e.x <= cam + VIEW_W + 16);
  }
  if (e.px != null && e.r != null) {
    return (e.px + e.r >= cam - 32 && e.px - e.r <= cam + VIEW_W + 32);
  }
  if (e.front != null) {
    return (e.front >= cam - 200 && e.front <= cam + VIEW_W + 100);
  }
  const w = e.w != null ? e.w : 16;
  return (e.x + w >= cam - 64 && e.x <= cam + VIEW_W + 64);
}

// Part of class Game (see game.js): GameRender
class GameRender {
  render() {
    const ctx = this.ctx;
    this.menuHits = [];
    const S = ART_R * SCREEN_K;   // the fine screen, as sharp as the display it's on (hires.js)
    if (ctx.canvas.width !== VIEW_W * S) { ctx.canvas.width = VIEW_W * S; ctx.canvas.height = VIEW_H * S; }
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    switch (this.mode) {
      case 'title': this.drawTitle(ctx); break;
      case 'select': this.drawSelect(ctx); break;
      case 'intro': this.drawIntro(ctx); break;
      case 'placeholder':
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        drawText(ctx, 'PLACEHOLDER #' + levelLabel(LEVELS[this.levelIndex]), VIEW_W / 2, VIEW_H / 2 - 4, '#ffffff', { align: 'center' });
        break;
      case 'play': this.drawWorld(ctx); break;
      case 'pause': this.drawWorld(ctx); this.drawPause(ctx); break;
      case 'controls': this.drawControls(ctx); break;
      case 'ready': this.drawWorld(ctx); this.drawReady(ctx); break;
      case 'devwarp': this.drawDevWarp(ctx); break;
      case 'clear':
        this.drawWorld(ctx);
        this.drawClear(ctx);
        break;
      case 'gameover': this.drawGameOver(ctx); break;
    }
    if (this.fade > 0) {
      ctx.globalAlpha = this.fade;
      ctx.fillStyle = '#0b0918';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }

  drawAmbient(ctx) {
    for (const a of this.ambient) {
      ctx.globalAlpha = Math.min(1, (a.life - a.t) / 60, a.t / 30) * (this.ambient.theme === 'cave' ? 0.7 : 0.9);
      if (a.ring) fArc(ctx, a.x + 1.5, a.y + 1.5, 0.9, 1.5, 0, Math.PI * 2 - 0.001, a.c);   // (all fine: hires.js)
      else if (a.rain) fLine(ctx, a.x, a.y, a.x - a.vx * a.w, a.y - a.vy * a.w, a.c, 0.7);   // (5-1's driven rain)
      else if (a.fly) {   // slow, independent glows instead of a whole swarm flashing on the beat
        const age = Math.max(0, Math.min(1, a.t / 90, (a.life - a.t) / 120));
        const pulse = 0.5 + Math.sin(a.t * (0.014 + (a.ph % 1) * 0.006) + a.ph) * 0.5;
        ctx.globalAlpha = age * age * (3 - 2 * age) * pulse * pulse * (3 - 2 * pulse) * 0.5;
        fGlow(ctx, a.x, a.y, 3, a.c, 0.28);
        fBlob(ctx, a.x, a.y, 0.65, '#e4e8ae');
      } else { const w = a.w || (this.ambient.theme === 'meadow' ? 2 : 1); if (w > 1) fEll(ctx, a.x + w / 2, a.y + 0.4, w / 2, 0.4, a.c); else fBlob(ctx, a.x + 0.5, a.y + 0.5, 0.5, a.c); }
    }
    ctx.globalAlpha = 1;
  }

  // 1-1's summer day over the whole scene: a little rosy at dawn, warm gold late on, the sunset's glow, and the cool
  // shade of the cloud while it covers the sun (slow fades only, never a flash)
  drawDayLight(ctx) {
    const w = dayWeights(meadowDay), shade = sunCover(this);
    for (const [c, a] of [['#ffb8a0', 0.07 * w.dawn], ['#ffc070', 0.07 * w.gold], ['#ff8060', 0.14 * w.dusk], ['#4a5a90', 0.16 * shade]]) {
      if (a > 0.002) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    }
    ctx.globalAlpha = 1;
  }

  drawWorld(ctx) {
    const pressureShake = this.gutPressureShake();
    ctx.save();
    if (pressureShake) {
      // Zoom just enough to keep the moving world beyond every screen edge.
      ctx.translate(VIEW_W / 2 + pressureShake.x, VIEW_H / 2 + pressureShake.y);
      ctx.scale(pressureShake.zoom, pressureShake.zoom);
      ctx.translate(-VIEW_W / 2, -VIEW_H / 2);
    }
    if (this.gut && this.gut.intro) { this.drawGutIntro(ctx); this.drawDreamFadeIn(ctx); }   // 3-4's freefall is a scene of its own
    else if (this.gut && this.gut.exit) this.drawGutExit(ctx);                                 // ...and so is its way out, into the sea
    else { this.drawWorldPass(ctx); if (this.gut && this.gut.flush) this.drawGutFlush(ctx); }   // (3-4's flush: over the world, under the dialogue)
    ctx.restore();
    this.drawWorldTop(ctx);
    this.drawGutFade(ctx);
    this.drawFever(ctx);   // 4-1: the bedroom the dream opens and closes in (game-gumbo.js)
  }
  drawWorldPass(ctx) {
    const lv = this.level;
    // Ordinary play uses only the vertical lift; drawWorld applies the pressure-finale shake.
    const sx = 0, sy = Math.round(this.lift || 0);
    const cam = Math.round(this.camX);
    eclipseLight = this.eclipse || 0;
    if (lv.def.day) this.dayCam = Math.max(this.dayCam || 0, cam);   // (the day only ever moves on: walking back left doesn't rewind the sun)
    meadowDay = lv.def.day ? clamp(this.dayCam / (lv.w * TILE - VIEW_W), 0, 1) : null; meadowCloud = lv.def.day ? sunCloud(this) : null;   // (1-1's summer day)
    clockHandT = this.handT || 0;
    if (this.monsoon) { jungleStorm.cloud = this.monsoon.cloud; jungleStorm.bolt = this.monsoon.bolt; jungleStorm.boltX = this.monsoon.boltX; }
    const above = lv.water && !this.wet(cam + VIEW_W / 2);   // a dry stretch of a water level
    if (this.bgT == null || !(this.timeStop > 0)) this.bgT = (this.bgT ?? this.t) + this.t - (this.bgLast ?? this.t);   // the sky's clock: it stops when time does
    this.bgLast = this.t;
    drawBackground(ctx, above ? 'isle' : lv.roomTheme ? lv.roomTheme[clamp(Math.floor((cam + VIEW_W / 2) / TILE), 0, lv.w - 1)] : lv.themeName, cam, this.bgT);
    this.drawAmbient(ctx);
    ctx.save();
    ctx.translate(-cam + sx, sy);
    for (const e of this.entities) if (e.paintsRoom && entityInView(e, cam)) e.draw(ctx, this);   // (3-4's painted rooms: under everything, decor and goal included)
    this.drawDecor(ctx, cam);
    if (above) this.drawSea(ctx, cam);
    if (lv.def.whirlpool) this.drawWhirlpool(ctx, cam);
    for (const e of this.entities) if (e.behindTiles && !e.frontOfScenery && !e.paintsRoom && entityInView(e, cam)) e.draw(ctx, this);
    for (const e of this.entities) if (e.behindTiles && e.frontOfScenery && entityInView(e, cam)) e.draw(ctx, this);
    for (const it of this.items) if (it.emerging && entityInView(it, cam)) it.draw(ctx);
    if (lv.stalks.length) this.drawStalks(ctx);
    if (this.rivers.length) this.drawRiversBehind(ctx, cam);
    for (const pl of this.platforms) if (pl.drawBehind && entityInView(pl, cam)) pl.drawBehind(ctx);   // (whatever stands behind the terrain: the camel's legs)
    this.drawTiles(ctx, cam);
    if (this.gumbo) this.drawGumboTerrainVeg(ctx, cam);   // (4-1: vegetables baked into the cornbread)
    this.drawBayouPartyDecor(ctx, cam);
    if (lv.crumbles.size) this.drawCrumbles(ctx);
    if (lv.def.falls) this.drawFalls(ctx, cam);
    for (const pl of this.platforms) if (entityInView(pl, cam)) pl.draw(ctx, lv.theme, this);
    for (const it of this.items) if (!it.emerging && entityInView(it, cam)) it.draw(ctx);
    if (lv.def.letters) this.drawLetters(ctx);
    for (const e of this.entities) if (!e.behindTiles && !e.drawOver && e !== this.held && entityInView(e, cam)) e.draw(ctx, this);
    for (const f of this.fireballs) f.draw(ctx);
    if (this.warp) {
      // sinking into (or rising out of) a warp pipe: he shows above the rim, and over the log's cut
      // top face only inside the hole, down to its front lip -- so he drops into the opening
      const w = this.warp, hx = w.col * TILE + 6;
      ctx.save(); ctx.beginPath();
      ctx.rect(cam - 20, -100, VIEW_W + 40, w.clipY + 100);
      ctx.rect(hx, w.clipY, 20, 5);
      ctx.clip();
      this.drawPlayer(ctx); ctx.restore();
    } else { if (this.timeStop > 0 || this.timeFx) this.drawTimeStop(ctx, cam); if (this.band) this.drawBand(ctx); this.drawPlayer(ctx); if (this.gumbo) this.drawGumboPlayer(ctx); }
    for (const e of this.entities) if (e.drawFront && entityInView(e, cam)) e.drawFront(ctx, this);   // (in front of him: the balloon's basket)
    this.drawCat(ctx);
    if (this.player.floatT > 0 && this.player.state === 'play') { if (this.player.chute === 'brolly') this.drawBrolly(ctx); else if (this.player.chute === 'leaf') this.drawLeafChute(ctx); else this.drawSeedChute(ctx); }
    if (this.held) this.held.draw(ctx, this);
    if (lv.hasSand) this.drawSand(ctx, cam);   // over everything that sinks into it
    for (const e of this.entities) if (e.drawOverSand && entityInView(e, cam)) e.drawOverSand(ctx, this);   // (the fridge's frost on frozen quicksand)
    if (this.rivers.length) this.drawRivers(ctx, cam);   // likewise for the rivers
    this.drawParticles(ctx);
    ctx.restore();
    if (this.monsoon) this.drawStorm(ctx);
    if (meadowDay != null) this.drawDayLight(ctx);
    if (this.darkness() > 0.01) this.drawDarkness(ctx, cam - sx, sy);
    // shadows (and their ripples) go over the dark so they never vanish into it
    ctx.save();
    ctx.translate(-cam + sx, sy);
    if (lv.glass.length) this.drawGlassOver(ctx, cam);
    if (lv.secrets.length) this.drawSecretGlints(ctx);
    for (const e of this.entities) if (e.drawOver && entityInView(e, cam)) e.draw(ctx, this);
    // something drawn over the dark that belongs behind Chickaroo (his own shadow): draw him over it again
    // (he's in his own pool of light, so the dark never hides him anyway)
    const p = this.player;
    if (p && !this.warp && this.entities.some(e => e.behindPlayer && e.state !== 'sleep' && overlap({ x: e.x - 4, y: e.y - 4, w: e.w + 8, h: e.h + 8 }, p))) this.drawPlayer(ctx);
    ctx.restore();
    if (lv.water && !above) {
      const top = lv.water.top * TILE + sy;
      ctx.globalAlpha = 0.1; ctx.fillStyle = '#1a6fb0'; ctx.fillRect(0, top, VIEW_W, VIEW_H - top);
      const step = 1 / ART_R, crestH = 2 / ART_R;
      ctx.globalAlpha = 0.7; ctx.fillStyle = '#bff4ff'; ctx.beginPath();
      ctx.moveTo(0, top + Math.sin((cam + this.t * 0.7) / 11) * 1.2);
      for (let x = 1; x <= VIEW_W; x++) ctx.lineTo(x, top + Math.sin((x + cam + this.t * 0.7) / 11) * 1.2);
      for (let x = VIEW_W; x >= 0; x--) ctx.lineTo(x, top + Math.sin((x + cam + this.t * 0.7) / 11) * 1.2 + crestH);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'; ctx.beginPath();
      for (let ax = 0; ax < VIEW_W * ART_R; ax++) { const x = ax * step; if (Math.sin((x + cam) * 0.7 + this.t * 0.05) > 0.85) { const yy = top + Math.sin((x + cam + this.t * 0.7) / 11) * 1.2; ctx.rect(x, yy - step, step, step); } }
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (!lv.water && lv.roomTheme && lv.roomTheme[clamp(Math.floor((cam + VIEW_W / 2) / TILE), 0, lv.w - 1)] === 'ocean') {
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#1a6fb0'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }
  // what sits on top of the picture and is never turned over: messages, dialogue, bars
  drawWorldTop(ctx) {
    // (no full-screen flashes, ever: big moments use sound, sparks and on-enemy flashes instead)
    this.drawReserve(ctx);
    this.drawWorldOverlay(ctx);
    if (this.timeStop > 0) this.drawTimeStopHUD(ctx);
    this.drawBayouFinale(ctx);
  }

  drawTiles(ctx, cam) {
    const lv = this.level, tset = getTileset(lv.themeName), ts = tset;
    const c0 = Math.max(0, Math.floor(cam / TILE) - 1), c1 = Math.min(lv.w - 1, c0 + Math.ceil(VIEW_W / TILE) + 2);
    const qf = [0, 0, 0, 1, 2, 1][Math.floor(this.t / 8) % 6];
    const lf = Math.floor(this.t / 10) % 4;
    // Quicksand fills the nicks in neighboring terrain instead of exposing the sky through them.
    // Draw this underneath the terrain so its ragged outline stays visible.
    if (lv.hasSand && THEMES[lv.themeName].roux) this.drawRouxNicks(ctx, cam);   // (4-1's roux: game-gumbo.js)
    else if (lv.hasSand) for (let r = 1; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
      if (lv.get(c, r) !== T.QSAND) continue;
      const sand = fineQuicksandArt(c,r,this.t,lv.get(c,r-1)===T.QSAND);
      if (lv.get(c - 1, r) === T.GROUND) ctx.drawImage(sand, 0, 0, 4, TILE, c * TILE - 4, r * TILE, 4, TILE);
      if (lv.get(c + 1, r) === T.GROUND) ctx.drawImage(sand, TILE - 4, 0, 4, TILE, (c + 1) * TILE, r * TILE, 4, TILE);
    }
    // Lava and its flames continue under the ragged shore before the pillar's rock is painted over them.
    for(let r=1;r<ROWS;r++)for(let c=c0;c<=c1;c++){
      if(lv.get(c,r)!==T.LAVA||lv.theme.acid)continue;
      const deep=lv.get(c,r-1)===T.LAVA,art=deep?ts.lavaDeep:lavaSurfaceArt(c,this.t);
      for(const dir of [-1,1]){
        const k=lv.get(c+dir,r);if(k!==T.GROUND&&k!==T.SOLID)continue;
        ctx.drawImage(art,dir<0?0:12,0,4,TILE,(dir<0?c*TILE-4:(c+1)*TILE),r*TILE,4,TILE);
        if(lv.def.hellfire&&!deep){
          const xx=dir<0?c*TILE-4:(c+1)*TILE;
          ctx.save();ctx.beginPath();ctx.rect(xx,r*TILE-28,4,32);ctx.clip();
          ctx.drawImage(duneFlameArt(Math.floor(this.t/3)%12),dir<0?xx-12:xx,r*TILE+4-30);ctx.restore();
        }
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = lv.tiles[r * lv.w + c];
        if (!t || t === T.HIDDEN || (lv.painted[c] && t !== T.COIN && !(t >= T.QCOIN && t <= T.USED))) continue;
        const ts = lv.roomTheme ? getTileset(lv.roomTheme[c]) : tset;   // (a stage's rooms can have their own tiles)
        let img;
        switch (t) {
          case T.GROUND: {
            const idx = r * lv.w + c;
            img = lv.groundImgs && lv.groundImgs[idx];
            if (!img) {
              const top = r > 0 && (!lv.looksSolid(c, r - 1) || (lv.theme.bodyCap && lv.get(c, r - 1) === T.BODY)), bot = r < ROWS - 1 && !lv.looksSolid(c, r + 1);   // (4-4: furniture stands on a finished floor)
              let key = top ? 'groundTop' : 'ground';
              if (ts.groundBot && bot) key = top ? 'groundBoth' : 'groundBot';
              const m = (!lv.looksSolid(c - 1, r) ? 1 : 0) | (!lv.looksSolid(c + 1, r) ? 2 : 0) | (!ts.groundBot && bot ? 4 : 0);
              const h = (c * 7 + r * 13) ^ (c >> 2);
              img = m ? ts.chip(key, m, h) : (ts[key + (h & 7)] || ts[key]);
              if (!lv.groundImgs) lv.groundImgs = new Array(lv.w * ROWS);
              lv.groundImgs[idx] = img;
            }
            break;
          }
          case T.CRUMBLE: img = ts.crumble; break;
          case T.ICE: {
            if (lv.def.id === '2-2' && c >= 108 && c <= 113) {
              const left = c - c % 2, top = 10 - (left - 108);
              if (r === top && c === Math.max(left, c0)) ctx.drawImage(iceRockSpireArt(32, (12 - top) * TILE, left), left * TILE, top * TILE);
              continue;
            }
            if(lv.def.id==='2-2') {
              let left=c,right=c;
              while(lv.get(left-1,r)===T.ICE)left--;
              while(lv.get(right+1,r)===T.ICE)right++;
              const openLeft=!lv.looksSolid(left-1,r),openRight=!lv.looksSolid(right+1,r);
              let openBottom=true;
              for(let x=left;x<=right;x++){if(lv.looksSolid(x,r+1)){openBottom=false;break;}}
              // Rock continues behind the shelf's chipped lower edge so its natural contour has no sky gaps.
              for(let cc=Math.max(left,c0);cc<=Math.min(right,c1);cc++)if(lv.get(cc,r+1)===T.GROUND) {
                const backing=ts['ground'+(((cc*7+(r+1)*13)^(cc>>2))&7)]||ts.ground;
                ctx.drawImage(backing,0,TILE-7,TILE,7,cc*TILE,r*TILE+TILE-7,TILE,7);
              }
              ctx.drawImage(iceShelfArt((right-left+1)*TILE,TILE,left+r*997,openLeft,openRight,openBottom),left*TILE,r*TILE);
              c=right;continue;
            }
            img = ts.ice;
            break;
          }
          case T.GLASS: this.drawGlassTile(ctx, r * lv.w + c, c, r); continue;
          case T.GLASS_OFF: continue;   // drawn over the dark as a ghostly outline (drawGlassOver)
          case T.TICK: case T.TOCK: {
            const k = t === T.TICK ? 'tick' : 'tock';
            if (SOLID[t]) { img = ts[k + 'On']; break; }
            // about to switch on: flicker the outline into a ghost of the solid block
            if (this.clockWarn && (this.clockWarn >> 2) % 2 === 0) { ctx.globalAlpha = 0.45; ctx.drawImage(ts[k + 'On'], c * TILE, r * TILE); ctx.globalAlpha = 1; continue; }
            img = ts[k + 'Off'];
            break;
          }
          case T.BRICK: case T.MULTI: img = ts.brick; break;
          case T.QCOIN: case T.QPOW: case T.Q1UP: img = ts['q' + qf]; break;
          case T.SEED: img = ts['seed' + qf]; break;
          case T.USED: img = ts.used; break;
          case T.SOLID: {
            if(ts.rockFormation){
              const idx = r * lv.w + c;
              img = lv.solidImgs && lv.solidImgs[idx];
              if (!img) {
                const joined=(x,y)=>{const k=lv.get(x,y);return k===T.SOLID||k===T.GROUND;};
                const mask=(!joined(c,r-1)?1:0)|(!joined(c,r+1)?2:0)|(!joined(c-1,r)?4:0)|(!joined(c+1,r)?8:0);
                img=ts.rockFormation(c,r,mask);
                if (!lv.solidImgs) lv.solidImgs = new Array(lv.w * ROWS);
                lv.solidImgs[idx] = img;
              }
            }else img=ts['solid' + ((((c * 7 + r * 13) ^ (c >> 2)) >>> 0) % (ts.solidN || 4))];   // (the desert's temple stones: eight, six of them carved)
            break;
          }
          case T.PIPE_TL: img = ts.pipeTL; break;
          case T.PIPE_TR: img = ts.pipeTR; break;
          case T.PIPE_L: img = ts.pipeL; break;
          case T.PIPE_R: img = ts.pipeR; break;
          case T.SEMI: {
            const leaf = lv.leaves.get(r * lv.w + c);
            if (leaf) continue;   // beanstalk leaves are drawn with their stalk (drawStalkLeaf)
            const m = (lv.get(c - 1, r) !== T.SEMI ? 1 : 0) | (lv.get(c + 1, r) !== T.SEMI ? 2 : 0);
            img = m ? ts.chipSemi(m, (c * 5 + r * 11) ^ (c >> 1)) : ts.semi;
            break;
          }
          case T.COAL: img = ts['coal' + ((Math.floor(this.t / 9) + (c >> 1)) & 3)]; break;
          case T.LAVA: img = lv.get(c, r - 1) === T.LAVA ? ts.lavaDeep : lv.theme.acid ? ts['lava' + ((lf + c) % 4)] : lavaSurfaceArt(c,this.t); break;
          case T.COIN:   // drifting pollen puff
            drawPollen(ctx, c * TILE + 8 + Math.sin(this.t * 0.04 + c * 1.7 + r) * 2, r * TILE + 8 + Math.sin(this.t * 0.05 + c * 0.9) * 2.5, this.t + c * 9, POLLEN_COL[lv.themeName] || POLLEN_COL.meadow);
            continue;
        }
        if (!img) continue;
        let y = r * TILE;
        for (const b of lv.bumps) if (b.c === c && b.r === r) y -= Math.round(Math.sin((b.t / 10) * Math.PI) * 5);
        let x = c * TILE;
        if (t === T.CRUMBLE) { const cr = lv.crumbles.get(r * lv.w + c); if (cr) { x += (cr.t >> 1) % 2 ? 1 : -1; y += cr.t > 18 ? 1 : 0; } }
        const veil = lv.veil[r * lv.w + c];
        if (veil && lv.secrets[veil - 1].rev > 0) { this.drawHollowCell(ctx, img, c, r, lv.secrets[veil - 1].rev); continue; }
        ctx.drawImage(img, x, y - (img.oy || 0));   // (a fine grassy top stands its blades up over the cell: meadow-fine.js)
        // the view lifted above the top row: a ceiling carries on up instead of showing sky above it
        if (r === 0 && this.lift > 0 && SOLID[t] === 1) for (let k = 1; k * TILE < this.lift + TILE; k++) ctx.drawImage(img, x, y - k * TILE);
      }
    }
    // Lava glow
    if (lv.themeName === 'citadel') {
      ctx.globalAlpha = 0.18 + Math.sin(this.t * 0.05) * 0.04;
      const glow = ctx.createLinearGradient(0, 13 * TILE - 12, 0, 13 * TILE); glow.addColorStop(0, 'rgba(255,106,31,0)'); glow.addColorStop(1, '#ff6a1f'); ctx.fillStyle = glow;   // (a soft glow rising off it)
      for (let c = c0; c <= c1; c++) if (lv.get(c, 13) === T.LAVA) ctx.fillRect(c * TILE, 13 * TILE - 12, TILE, 12);
      ctx.globalAlpha = 1;
    }
    if (lv.def.hellfire) this.drawHellfire(ctx, c0, c1);
    if (lv.theme.acid) this.drawAcid(ctx, c0, c1);
  }
  // Acid (3-4): a sickly green glow hanging over every open surface, bubbles swelling up out of it and popping,
  // and a wisp or two of fumes (all worked out from the clock, no particles to keep)
  drawAcid(ctx, c0, c1) {
    const lv = this.level, t = this.t;
    let glow = null, glowTop = -1;
    for (let c = c0; c <= c1; c++) {
      let r = 1;
      while (r < ROWS && lv.get(c, r) !== T.LAVA) r++;
      if (r >= ROWS || lv.get(c, r - 1)) continue;
      const x0 = c * TILE, top = r * TILE + 4;
      const pulse = 1 + Math.sin(t * 0.05 + c * 0.6) * 0.25;
      if (top !== glowTop) {
        glowTop = top;
        glow = ctx.createLinearGradient(0, top - 30, 0, top); glow.addColorStop(0, 'rgba(42,138,80,0)'); glow.addColorStop(1, '#2a8a50');
      }
      ctx.globalCompositeOperation = 'lighter';   // a soft glow fading upward
      ctx.globalAlpha = 0.07 * pulse; ctx.fillStyle = glow; ctx.fillRect(x0, top - 30, TILE, 30);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      // a bubble: swells on the surface for a while, then pops into a ring
      const per = 90 + (c * 37) % 70, u = ((t + c * 53) % per) / per, bx = x0 + 3 + (c * 7) % 10;
      if (u < 0.8) { const rr = 1 + u * 3; fBlob(ctx, bx + 0.5, top - rr + 1.5, rr + 1, '#1c8a5a'); fBlob(ctx, bx + 0.5, top - rr + 1.5, rr, '#a8ff6a'); fBlob(ctx, bx - 0.2 - rr * 0.3, top - rr * 1.5 + 1.6, 0.45, '#ffffff'); }   // (fine)
      else if (u < 0.9) for (const [dx, dy] of [[-4, -2], [4, -2], [-2, -5], [2, -5], [0, -7]]) fBlob(ctx, bx + dx + 0.5, top + dy + 0.5, 0.55, '#eaff6a');
      // fumes curling up
      const fu = ((t * 0.6 + c * 41) % 120) / 120;
      ctx.globalAlpha = 0.35 * Math.sin(fu * Math.PI);
      fBlob(ctx, x0 + 9 + Math.sin(fu * 9 + c) * 3, top - 5 - fu * 40, 1 + fu * 1.5, '#c8ff9a');
      ctx.globalAlpha = 1;
    }
  }
  // Hellfire (def.hellfire): the lava's surface roars -- a heat haze, licking tongues of flame and
  // embers drifting up off it (all worked out from the clock, no particles to keep)
  drawHellfire(ctx, c0, c1) {
    if(this.level.themeName==='desert'){drawDuneHellfire(this,ctx,c0,c1);return;}
    const lv = this.level, t = this.t;
    let haze = null, hazeTop = -1;
    if (!this._hellfirePts) this._hellfirePts = Array.from({ length: 64 }, () => [0, 0]);
    const pts = this._hellfirePts;
    const layers = [[1, '#c0201a'], [0.7, '#ff6a1f'], [0.35, '#ffd27a']];
    for (let c = c0; c <= c1; c++) {
      let r = 1;
      while (r < ROWS && lv.get(c, r) !== T.LAVA) r++;
      if (r >= ROWS || lv.get(c, r - 1)) continue;   // only the open surface burns
      const x0 = c * TILE, top = r * TILE + 4;
      if (top !== hazeTop) {
        hazeTop = top;
        haze = ctx.createLinearGradient(0, top - 34, 0, top); haze.addColorStop(0, 'rgba(255,106,31,0)'); haze.addColorStop(0.6, '#ff6a1f'); haze.addColorStop(1, '#ffb347');   // (smooth, in fine pixels)
      }
      ctx.globalAlpha = 0.14 + Math.sin(t * 0.06 + c * 0.7) * 0.03; ctx.fillStyle = haze; ctx.fillRect(x0, top - 34, TILE, 34);
      ctx.globalAlpha = 1;
      const tongue = x => 6 + Math.sin(x * 0.37 + t * 0.21) * 4 + Math.sin(x * 0.11 - t * 0.13) * 3 + Math.sin(x * 1.3 + t * 0.4) * 1.6;   // licking tongues of flame
      for (let l = 0; l < 3; l++) {
        const k = layers[l][0], col = layers[l][1];
        let pIdx = 0;
        let pt = pts[pIdx++]; pt[0] = x0; pt[1] = top + 1;
        for (let x = x0; x <= x0 + TILE; x += 1 / ART_R) {
          pt = pts[pIdx++]; pt[0] = x; pt[1] = top - Math.max(2, tongue(x)) * k;
        }
        pt = pts[pIdx++]; pt[0] = x0 + TILE; pt[1] = top + 1;
        pts.length = pIdx;
        fPoly(ctx, pts, col);
      }
      for (let x = x0; x < x0 + TILE; x++) if ((x + (t >> 1)) % 9 === 0) fEll(ctx, x + 0.5, top - tongue(x) - 2.6, 0.6, 1.2, '#ff6a1f');   // a lick breaking free
      for (let k = 0; k < 2; k++) {   // embers floating up, swaying
        const seed = (c * 37 + k * 101) % 97, life = 90 + seed % 50, a = (t + seed * 7) % life;
        const ex = x0 + (seed % 16) + Math.sin((t + seed) * 0.07) * 3, ey = top - 6 - a * 0.9;
        ctx.globalAlpha = 1 - a / life;
        fEll(ctx, ex + 0.5, ey + 0.7, 0.55, seed % 3 === 0 ? 1 : 0.6, a % 12 < 6 ? '#ffd27a' : '#ff6a1f');
      }
      ctx.globalAlpha = 1;
    }
  }

  drawSand(ctx, cam) {
    const lv = this.level, ts = getTileset(lv.themeName);
    if (THEMES[lv.themeName].roux) { this.drawRoux(ctx, cam); return; }   // (4-1's roux is a liquid: game-gumbo.js)
    const c0 = Math.max(0, Math.floor(cam / TILE) - 1), c1 = Math.min(lv.w - 1, c0 + Math.ceil(VIEW_W / TILE) + 2), f = this.t >> 4;
    for (let c = c0; c <= c1; c++) for (let r = 1; r < ROWS; r++) {
      if (lv.get(c, r) !== T.QSAND) continue;
      ctx.drawImage(fineQuicksandArt(c,r,this.t,lv.get(c,r-1)===T.QSAND),c*TILE,r*TILE);
    }
  }
}
mixin(Game, GameRender);
