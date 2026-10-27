'use strict';
// Part of class Game (see game.js): GameClock -- the Master Stopwatch's time stop (Midnight Clockworks).
// While `timeStop` runs, everything but Chickaroo stands still: platforms, foes (stomp one and it hangs
// in mid-air until time starts again), fireballs, sparks and the clock blocks' timer,
// even the music and whoever's talking. Only things marked `timeless` (the stopwatch itself) keep going.
// The world drains to grey from where the stopwatch stands, and the colour floods back when it ends.
const TIMESTOP_WARN = 90;   // the last frames of a time stop: the ticking speeds up and HUD bar turns red
class GameClock {
  stopTime(dur, x, y) {
    this.timeStop = this.timeStopMax = dur;
    this.timeFx = { x, y, t: 0, out: false };
    Music.pause();
    Sound.play('timeStop');
  }
  updateTimeStop() {
    if (this.timeFx) { this.timeFx.t++; if (this.timeFx.out && this.timeFx.t > 40) this.timeFx = null; }
    if (!(this.timeStop > 0)) return;
    const k = --this.timeStop;
    if (k > 0 && k % (k < TIMESTOP_WARN ? 15 : 30) === 0) Sound.play(k % 30 ? 'tock' : 'clockWarn');
    if (k === 0) this.startTime();
  }
  startTime() {
    const p = this.player;
    this.timeStop = 0;
    this.timeFx = { x: p.x + p.w / 2, y: p.y + p.h / 2, t: 0, out: true };
    Sound.play('timeGo');
    if (p.state === 'play') Music.resume(this.musicNow(), 1);
  }
  // Drawn over the world but under Chickaroo: grey inside the ripple while time's stopped (spreading from
  // the stopwatch), and a ripple of colour spreading back out from Chickaroo once it starts again.
  drawTimeStop(ctx, cam) {
    const fx = this.timeFx;
    if (!(this.timeStop > 0) && !fx) return;
    const out = fx && fx.out, t = fx ? fx.t : 999, R = out ? t * 14 : t * 16;
    ctx.save();
    const needClip = fx && R < 700;
    if (needClip) {
      ctx.beginPath();   // stopping: grey inside the ring; starting again: grey outside it
      if (!out) ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2);
      else { ctx.rect(cam - 8, -8 - LIFT_MAX, VIEW_W + 16, VIEW_H + 16 + LIFT_MAX); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); }
      ctx.clip('evenodd');
    }
    // Steady grey overlay without flashing or strobing effects for visual comfort and accessibility
    ctx.fillStyle = 'rgba(118, 128, 158, 0.44)';
    ctx.fillRect(cam - 8, -8 - LIFT_MAX, VIEW_W + 16, VIEW_H + 16 + LIFT_MAX);
    ctx.restore();
    // the edge of the ripple: a bright ring
    if (fx && R < 700) {
      ctx.globalAlpha = Math.max(0, 1 - t / 45);
      ctx.strokeStyle = out ? '#ffe08a' : '#bff4ff'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.stroke();   // (a smooth ring: fine)
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(fx.x, fx.y, Math.max(0, R - 0.6), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // a little banner at the top while time stands still: how long is left
  drawTimeStopHUD(ctx) {
    if (!(this.timeStop > 0) || this.mode !== 'play') return;
    const u = this.timeStop / this.timeStopMax, w = 90, x = Math.round(VIEW_W / 2 - w / 2), y = 34;
    const warn = this.timeStop < TIMESTOP_WARN;
    drawText(ctx, 'TIME STOPPED', VIEW_W / 2, y, '#bff4ff', { align: 'center', shadow: INK });
    fRoundRect(ctx, x - 1, y + 9, w + 2, 5, 2.4, INK);   // (fine: hires.js)
    if (w * u > 1) { fRoundRect(ctx, x, y + 10, w * u, 3, 1.5, warn ? '#ff8a8a' : '#7af0ff'); fRoundRect(ctx, x + 0.6, y + 10.3, Math.max(0, w * u - 1.2), 0.8, 0.4, '#ffffff'); }
  }
}
mixin(Game, GameClock);
