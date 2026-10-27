'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 2. ENGINE CONSTANTS & TUNING  (units: pixels and frames at a fixed 60 Hz)
// ═══════════════════════════════════════════════════════════════════════════
const TILE = 16, ROWS = 14, VIEW_W = 400, VIEW_H = 224;
const STEP_MS = 1000 / 60;

const WALK_MAX = 1.6, RUN_MAX = 2.75;
const SHELL_SPEED = 2.95;   // a kicked shell: a touch faster than a full sprint, so you can never run into the back of it
// ground: up to walking speed in ~13 frames, on to a full run in ~18 more; letting go stops a walk in ~11 frames
// and a full run in ~20; reversing out of a run takes ~10 (a skid). In the air: steer and turn about half as fast
const ACCEL = 0.125, RUN_ACCEL = 0.065, FRICTION = 0.14, SKID = 0.28;
const AIR_ACCEL = 0.1, AIR_TURN = 0.16;
const JUMP_BASE = 4.9, JUMP_BONUS = 0.22;        // jump speed grows with run speed
const GRAV_HOLD = 0.17, GRAV_APEX = 0.25, GRAV = 0.5, MAX_FALL = 5.5;
const COYOTE = 6, JUMP_BUFFER = 7, STOMP_BOUNCE = 4.4;
const HURT_INSET = 2;                 // px of his box at the sides and top that a foe can graze without hurting him
const LAND_LOOK = JUMP_BUFFER - 1;   // frames of fall ahead in which a jump press waits to jump on landing rather than flapping
// one flap of the wings in mid-air (not underwater): a little boost, well short of a second full jump
const DEEP_DARK = 0.965;   // how dark the deep (def.dark stretches) gets: 1 = pitch black outside Chickaroo's light
const FLAP_LIFT = 3.4, GALE_FLAP_LIFT = 3.7, FLAP_ANIM = 14;
const SMALL_H = 16, BIG_H = 26, PLAYER_W = 12;
// chili power: hold run to charge, release to fire (frames held for each level)
const CHARGE_MID = 32, CHARGE_FULL = 85;
const VOLT_WINDUP = 30, VOLT_RANGE = 260, VOLT_HITS = 15;   // (half a second of wind-up) zaps that connect before the ElecChik hat is spent
const CHILI_DMG = [1, 2, 4];   // boss damage: tap pepper / hot pepper / chili blast
// Power-up suits: collecting one gives the "empowered" form (power 2) with that suit's ability.
// Item kind -> suit; a hit always drops Chickaroo back to plain big, whatever the suit.
const SUIT_OF = { pepper: 'fire', ice: 'ice', gale: 'gale', volt: 'volt', quake: 'quake' };
const SAVE_KEY = 'boyo-save';
const PENDULUM_SWING = 0.62;   // pendulum platform amplitude (radians)
const SUIT_KINDS = ['pepper', 'ice', 'gale', 'volt', 'quake'];
const SUIT_INFO = {
  fire:  { name: 'HOT WINGS', tip: 'RUN: FIRE  HOLD: CHARGE', icon: 'pepperA', color: '#ff8a2a' },
  ice:   { name: 'ChikICE', tip: 'RUN: FREEZE - GRAB & THROW', icon: 'itemIce', color: '#7fd4ff' },
  gale:  { name: 'GlideBoi', tip: 'RUN: GUST  JUMP: FLAP  HOLD: GLIDE', icon: 'itemGale', color: '#9ae8a8' },
  volt:  { name: 'ElecChik', tip: 'RUN: ZAP (HALF SEC WINDUP)', icon: 'itemVolt', color: '#ffe14d' },
  quake: { name: 'Hammeroo', tip: 'RUN: HAMMER SWING', icon: 'itemQuake', color: '#c9c4d8' },
};
// Jumping off the top of the screen: the view rises with Chickaroo once his head is within LIFT_MARGIN px
// of the top, by up to LIFT_MAX px, so he never disappears above it (Game.updateLift)
const LIFT_MARGIN = 10, LIFT_MAX = 56;
const WELCOME_WAIT = 8;                       // frames he stands in the stage, landed and faded in, before 1-1's welcome note (the controls wait too)
const SLEEP_AFTER = 300;                       // frames standing idle (5 s) before Chickaroo dozes off
const SECRET_GLINT = 150, SECRET_FLASH = 26;  // a secret hollow's glint: frames between twinkles (~2.5 s), and how long one lasts
const ICE_MELT = 600;                         // frames before a frozen foe thaws
const POUND_HANG = 7, POUND_SPEED = 8.5;      // ground pound (down in mid-air, anyone)
const HAMMER_SWING = 16, HAMMER_HIT = 5, HAMMER_COOLDOWN = 6;       // quick recovery; the next swing can start just after the hit lands
const CROUCH_SMALL_H = 12, CROUCH_BIG_H = 15;
// roll (tap run while moving on the ground): duration, speed, and the cap a chain of hits can reach
const AUTO_RUN_DELAY = 18;   // keyboard play: frames a direction is held before he breaks into his automatic run
// stomp-jump forgiveness: a jump pressed up to EARLY frames before a stomp, or up to LATE frames
// after it, still gives the full-height bounce
const STOMP_EARLY = 14, STOMP_LATE = 7;
const SPIN_JUMP = 0.9;   // spin jump height relative to a normal jump
const ROLL_T = 26, ROLL_SPEED = 2.9, ROLL_MAX = 3.6, ROLL_COOL = 8;   // ducking hitboxes: both fit under a 1-tile gap
// swimming
const SWIM_MAX = 1.35, SWIM_WALK = 1.0, SWIM_ACCEL = 0.045, SWIM_TURN = 0.08, SWIM_DRAG = 0.015;
// holding run while swimming (or walking the seabed) goes faster
const SWIM_RUN_MAX = 2.1, SWIM_RUN_WALK = 1.5, SWIM_RUN_ACCEL = 0.07;
// a flap under a glider (dandelion seed, brolly, bay leaf): its kick (quick flaps stack, up to the cap), the share of
// gravity a flap rises against (one flap: a floaty bounce of about two tiles); flaps in a quick row before a breather,
// the breather (frames), frames without a flap that count as a breather anyway, frames a press waits out a breather,
// and how high his head may go (px from the top of the screen)
const GLIDE_FLAP = -3.4, GLIDE_FLAP_MAX = -4.6, GLIDE_FLAP_GRAV = 0.35;
const GLIDE_BURST = 3, GLIDE_COOL = 28, GLIDE_CHAIN = 40, GLIDE_BUF = 8, GLIDE_TOP = 0, GLIDE_DIVE = 1.3;
const DANDELION_TIME = 340, DANDELION_WARN = 100;   // ~5.7s flight in 1-1; seed frays and sheds fluff for the final 1.7s
const SWIM_STROKE = -2.5, SWIM_GRAV = 0.075, SWIM_SINK = 1.6;
// quicksand: how fast you sink (px/frame), how fast you can wade, and the weak hop out of it
// (it weakens the deeper you are); you're lost once you're SAND_LOST px from fully under
// hot coals (Ember Citadel): landing on them makes Chickaroo hop straight back up -- a little OW! hop, or a
// big HOTFOOT leap (this much more launch speed than his jump) if jump is held or pressed just before
const COAL_HOP = 3.3, COAL_LEAP = 1.24;
const SAND_SINK = 0.16, SAND_SPEED = 0.8, SAND_JUMP = 3.9, SAND_JUMP_LOSS = 0.08, SAND_LOST = 3;

const T = {
  EMPTY: 0, GROUND: 1, BRICK: 2, QCOIN: 3, QPOW: 4, Q1UP: 5, USED: 6, SOLID: 7,
  PIPE_TL: 8, PIPE_TR: 9, PIPE_L: 10, PIPE_R: 11, SEMI: 12, LAVA: 13, MULTI: 14, HIDDEN: 15, COIN: 16,
  CRUMBLE: 17, PEDESTAL: 18, ICE: 19, TICK: 20, TOCK: 21, SEED: 22, QSAND: 23, COAL: 24, BODY: 25,   // BODY: solid but never drawn (something else draws it, e.g. a toppled statue)
  GLASS: 26, GLASS_OFF: 27,        // moonglass (2-4): solid only while a lit moonlamp shines on it (Game.updateGlass)
};
const TILE_CHARS = { X: 1, B: 2, '?': 3, M: 4, U: 5, S: 7, '-': 12, L: 13, N: 14, h: 15, o: 16, C: 17, I: 19, T: 20, K: 21, G: 22, Q: 23, H: 24, V: 27, '=': 25 };   // ('=': solid but never drawn -- something else draws it)
const SOLID = new Uint8Array(32);
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 17, 18, 19, 20, 22, 24, 25, 26].forEach(t => { SOLID[t] = 1; });
// TICK / TOCK clock blocks swap solidity on the level's clock (Game.updateClock), so their SOLID
// entries change at runtime. Only one level is live at a time; startLevel resets them.
function setClockPhase(ph) { SOLID[20] = ph ? 0 : 1; SOLID[21] = ph ? 1 : 0; }

const STOMP_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];

