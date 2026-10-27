'use strict';
// Part of class Game (see game.js): GameSky -- the Cloudtop Heights (1-3) rides that live on the
// player: the rainbow road, and floating down under Parasol Pete's stolen brolly.
class GameSky {
  // A rainbow star was touched: (re)start the road at the height Chickaroo is at.
  startRainbow(until) {
    const p = this.player;
    let road = this.platforms.find(pl => pl instanceof RainbowRoad);
    if (!road) { road = new RainbowRoad(); this.platforms.push(road); }
    if (!road.on) { road.front = p.x; road.origin = p.x; road.lastX = p.x; }
    road.on = true; road.complete = false; road.until = Math.max(road.until, until); road.drop = null;
    road.level = road.y = road.prevY = Math.min(p.y + p.h + (p.onGround ? 0 : 2), 12 * TILE);
    this.burst(p.x + p.w / 2, p.y + p.h / 2, RAINBOW_COLS, 18);
    this.popup(p.x + p.w / 2, p.y - 14, 'RAINBOW ROAD!', '#ffe14d');
    if (!this.level.rainbowTold) { this.level.rainbowTold = true; this.say('RAINBOW ROAD!', 'RUN RIGHT - DOWN DROPS THROUGH', '#ffe14d'); }
    Sound.play('power'); Sound.play('tada');
  }
  // An enemy bounce is a landing too: the road resumes at that safe height, even
  // when the stomp happened below the previous ribbon. Existing heights stay solid.
  rainbowBounce(p) {
    const road = this.platforms.find(pl => pl instanceof RainbowRoad && pl.on && !pl.complete);
    if (road && p.x >= road.front - .01) road.level = Math.min(p.y + p.h, 12 * TILE);
  }
  // Chickaroo hanging from Pete's brolly (drawn instead of the dandelion seed while p.chute is 'brolly')
  drawBrolly(ctx) {
    // a hair-thin stick down from the canopy, ending in a little hook that curls into his beak from the
    // front (he holds everything in his beak)
    const p = this.player, f = p.facing, warning = p.floatT <= BROLLY_WARN;
    const sway = Math.round(Math.sin(this.t * (warning ? 0.9 : 0.06)) * (warning ? 3 : 1.5));
    const bx = Math.round(p.x + p.w / 2 + f * 4), beakY = Math.round(p.power ? p.y + p.h * 0.62 : p.y + 6);
    const x = bx + f * 3, y = Math.round(p.y) - 2;   // the stick stays put in his beak; only the canopy sways
    ctx.save();
    if (warning && (p.floatT >> 2) % 2) ctx.globalAlpha *= 0.35;
    drawBrollyCanopy(ctx, x + sway, y - 8, this.t, true);
    ctx.restore();
    ctx.strokeStyle = '#4a2a12'; ctx.lineWidth = 0.67; ctx.lineCap = 'round'; ctx.beginPath();   // the stick, and the hook curling in (fine)
    ctx.moveTo(x + 0.5, y - 7); ctx.lineTo(x + 0.5, beakY - 0.5); ctx.quadraticCurveTo(x + 0.5, beakY + 1, x + 0.5 - f * 1.6, beakY + 0.7); ctx.quadraticCurveTo(x + 0.5 - f * 3, beakY + 0.2, x + 0.5 - f * 2.8, beakY - 0.6);
    ctx.stroke();
  }
}
mixin(Game, GameSky);
