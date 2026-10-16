'use strict';
/*
 * BOYO — a platformer inspired by the classic 16-bit greats (an homage, not a copy).
 * Pure HTML5 Canvas + Web Audio. Every sprite, tile and sound is generated in code.
 *
 * File layout
 *   1. LEVEL REGISTRY   ← add new levels here (pure data, no engine code)
 *   2. Engine constants & tuning
 *   3. Utilities, pixel font
 *   4. Sound (SFX + music sequencer)
 *   5. Input
 *   6. Art: sprites, tiles, backgrounds
 *   7. Level compiler
 *   8. Entities
 *   9. Game (state machine, physics, rendering)
 *  10. Boot / fixed-timestep loop
 */
(function () {

// ═══════════════════════════════════════════════════════════════════════════
// 1. LEVEL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
/*
  A level is plain data. The screen is 14 tiles tall (rows 0-13); the normal
  ground surface is row 12 (rows 12-13 are filled). Columns run left → right.

  Fields
    id, name, theme ('meadow' | 'cave' | 'sky' | 'citadel' | 'ocean' | 'snow'), music (song name), time,
    width (columns), start (column), checkpoint (column, optional), hint (text)
    goal: { type, x }  the stage treasure Boyo grabs to finish, fitting its world:
          'flower' (meadow sunflower), 'geode' (cave gem), 'feather' (sky), 'pearl' (ocean clam),
          'snowflake' (snow)
          { type: 'crystal', x } (final-goal crystal on a 3-wide pedestal)
    ceiling: true   draw a jagged rock overhang with stalactites along the top (scenery only)
          { type: 'crystal', x, boss: true } (crystal stays hidden until the boss falls)
    wind: { calm, warn, gust, force }  frames of calm, warning and gust per cycle; gusts push
          the player by `force` px/frame and alternate direction each cycle
    water: { top }  whole level is underwater below row `top`: swimming physics, no stomping
    currents: [[x0, x1, fx, fy], ...]  water flow over columns x0-x1 (fx pushes sideways in
          px/frame, fy accelerates up (-) or down (+); fy < 0 renders as a bubble vent)
    boss: { trigger, wall, right }  boss arena: crossing column `trigger` seals column
          `wall` and locks the camera there; `right` is the arena's solid right wall

  map commands (applied in order, later ones overwrite earlier ones)
    ['ground', x0, x1, topRow = 12]   solid ground from topRow down to the bottom
    ['row', x, y, 'chars']            place tiles by character, '.' = leave as is
    ['rect', x0, y0, x1, y1, 'char']  fill a rectangle with one tile character
    ['pipe', x, height]               2-wide hollow log standing on row 12
    ['stairs', x, n, dir]             staircase n wide on row 12; dir 1 = up, -1 = down
    ['coins', x, y, n]                horizontal row of pollen puffs (the collectible)
    ['lava', x0, x1]                  lava surface in row 13 (use inside a pit)
    ['power', x, y, kind]             power-up block giving 'ice' | 'gale' | 'volt' | 'quake' | 'pepper' | 'rand'
                                      (a plain 'M' block gives a berry, or a chili pepper once big)

  tile characters
    X ground   B brick   ? star block (coin)   M power-up block   U 1-UP block
    N multi-pollen crate   S solid block  - semi-solid ledge (jump through from below)
    h hidden 1-UP block  o pollen puff
    C crumbling cloud (gives way shortly after being stood on, then reforms)
    I ice (solid and slippery: slow to get going, slow to stop)

  entities (x = column, row = the row the enemy stands in, default 11)
    ['grumblet', x, row]      walking acorn; falls off ledges, stompable
    ['shellback', x, row]     pill bug, turns at ledges; stomp → it curls into a kickable/carryable ball
    ['spikelet', x, row]      hedgehog — cannot be stomped (use fire or a rolled bug)
    ['flutter', x, row, hang] bat that swoops toward the player
    ['snapvine', pipeX]       chomping worm living in the hollow log at column pipeX
    ['firebar', x, y, length, speed]  rotating chain of fire around block (x, y)
    ['ember', x]              lava bubble leaping out of a lava pit
    ['platform', x, y, widthTiles, 'h'|'v', rangeTiles, periodFrames, phase0to1]
    ['spring', x, row]        springboard; jump while it squashes for a big launch
    ['stormlet', x, untilX]   storm cloud that tails the player and fires lightning; leaves past untilX
    ['finlet', x, row, 'red'?]  fish swimming left; red ones weave up and down
    ['jellop', x, row]        jellyfish that sinks, then jets toward the player
    ['urchin', x, row]        spiky sea urchin: crawls along the floor and now and then fires a spike at you
    ['slideguin', x, row]     penguin that belly-slides at you when you're level with it
    ['icicle', x, row]        hangs under an overhang; shakes when you pass beneath, then drops
    ['boss', x]               MAGMAW, sleeps until the player crosses boss.trigger
*/
const LEVELS = [
  {
    id: '1-1', name: 'SUNLIT MEADOW', theme: 'meadow', music: 'meadow', time: 400,
    width: 212, start: 3, checkpoint: 97,
    hint: 'HOLD RUN TO SPRINT AND JUMP FARTHER',
    map: [
      ['ground', 0, 30], ['row', 9, 8, '?B?'], ['coins', 13, 9, 3],
      ['ground', 18, 24, 10], ['row', 20, 6, 'M'],
      ['pipe', 28, 2],
      ['ground', 33, 50], ['row', 35, 8, '------'], ['coins', 35, 7, 6],
      ['ground', 40, 44, 9], ['row', 42, 5, 'N'],
      ['pipe', 48, 4],
      ['ground', 54, 75], ['row', 57, 8, 'B?B?B'], ['row', 59, 4, '?'],
      ['ground', 66, 70, 10], ['row', 72, 6, 'h'],
      ['ground', 79, 100],
      ['row', 82, 9, '---'], ['row', 86, 7, '---'], ['row', 90, 5, '----'], ['coins', 90, 4, 4],
      ['ground', 104, 140], ['pipe', 108, 3], ['row', 113, 8, '?M?'], ['power', 114, 8, 'ice'], ['row', 118, 8, 'BBNBB'], ['coins', 118, 6, 5],
      ['ground', 124, 128, 10], ['ground', 129, 133, 8], ['ground', 134, 138, 10], ['coins', 129, 6, 5],
      ['ground', 144, 160], ['row', 147, 9, '----'], ['row', 152, 6, '----'], ['coins', 152, 5, 4],
      ['ground', 164, 211], ['pipe', 168, 2], ['row', 172, 8, 'B?B'],
    ],
    entities: [
      ['grumblet', 15], ['grumblet', 22, 9],
      ['grumblet', 38], ['grumblet', 46], ['snapvine', 48],
      ['shellback', 58], ['grumblet', 62], ['grumblet', 64], ['grumblet', 68, 9],
      ['grumblet', 85], ['shellback', 94],
      ['snapvine', 108], ['grumblet', 112], ['grumblet', 115], ['shellback', 122], ['grumblet', 131, 7],
      ['grumblet', 150], ['grumblet', 153],
      ['shellback', 170], ['grumblet', 175], ['grumblet', 177],
    ],
    goal: { type: 'flower', x: 196 },
  },
  {
    id: '1-2', name: 'HOLLOW CAVERNS', theme: 'cave', music: 'cave', time: 300,
    width: 200, start: 3, checkpoint: 88,
    hint: 'SPIKELETS CANNOT BE STOMPED - JUMP OVER',
    ceiling: true,
    map: [
      ['ground', 0, 40], ['ground', 44, 80], ['ground', 87, 130], ['ground', 134, 161], ['ground', 170, 199],
      ['row', 10, 8, '?M?'], ['power', 11, 8, 'quake'],
      ['rect', 22, 10, 23, 11, 'S'], ['coins', 22, 8, 2],
      ['row', 28, 8, 'BBNBB'],
      ['coins', 41, 8, 3],
      ['row', 48, 8, 'BBBB'],
      ['row', 58, 8, '------'], ['coins', 59, 6, 4],
      ['pipe', 66, 3], ['pipe', 72, 2],
      ['row', 76, 8, '?'],
      ['row', 95, 9, '----'], ['row', 100, 6, '----'], ['coins', 100, 5, 2], ['row', 102, 3, 'U'],
      ['row', 110, 8, 'B?BMB'],
      ['pipe', 138, 2], ['pipe', 145, 3],
      ['coins', 163, 7, 5],
    ],
    entities: [
      ['grumblet', 17], ['grumblet', 19],
      ['flutter', 31, 2, true],
      ['spikelet', 52], ['spikelet', 56],
      ['shellback', 60, 7],
      ['snapvine', 66], ['snapvine', 72],
      ['platform', 82, 7, 3, 'v', 4, 200, 0],
      ['flutter', 93, 2, true], ['flutter', 99, 2, true],
      ['spikelet', 108], ['spikelet', 113],
      ['grumblet', 117], ['grumblet', 119],
      ['snapvine', 138], ['snapvine', 145],
      ['shellback', 150], ['spikelet', 156],
      ['platform', 162, 10, 3, 'h', 5, 240, 0],
    ],
    goal: { type: 'geode', x: 188 },
  },
  {
    id: '1-3', name: 'CLOUDTOP HEIGHTS', theme: 'sky', music: 'sky', time: 350,
    width: 200, start: 3, checkpoint: 90,
    hint: 'PRESS JUMP ON A SPRING FOR A BIG BOUNCE',
    map: [
      ['ground', 0, 13], ['row', 6, 8, '?M?'], ['power', 7, 8, 'gale'],
      ['row', 14, 12, 'CCCCCCC'], ['coins', 15, 9, 5],
      ['ground', 21, 33], ['row', 25, 8, 'B?B'],
      // spring up to a bonus island, or drop to the low road
      ['rect', 36, 9, 41, 10, 'X'],
      ['rect', 43, 4, 49, 5, 'X'], ['coins', 44, 2, 5], ['row', 46, 0, 'U'],
      ['rect', 44, 11, 51, 12, 'X'],
      ['row', 54, 10, 'CCC'], ['row', 58, 8, 'CCC'],
      ['rect', 63, 9, 72, 10, 'X'], ['row', 66, 5, 'BNB'],
      ['ground', 85, 99], ['coins', 86, 9, 3], ['row', 91, 8, '?M?'], ['power', 92, 8, 'pepper'],
      ['ground', 100, 103, 4], ['coins', 100, 2, 4],          // cloud pillar: spring over it
      ['rect', 117, 10, 125, 11, 'X'],
      ['row', 128, 9, 'CCC'], ['row', 132, 7, 'CCC'], ['row', 136, 9, 'CCC'],
      ['ground', 140, 152], ['row', 143, 8, '-----'], ['coins', 143, 7, 5], ['row', 149, 4, '?'],
      ['rect', 155, 11, 157, 12, 'X'],
      ['rect', 160, 5, 165, 6, 'X'], ['coins', 160, 3, 6],
      ['row', 167, 12, 'CCCCCCC'],
      ['ground', 174, 199],
    ],
    entities: [
      ['grumblet', 11],
      ['grumblet', 27], ['grumblet', 29], ['shellback', 32],
      ['spring', 40, 8],
      ['grumblet', 48, 10],
      ['flutter', 56, 4, false],
      ['stormlet', 64, 104],
      ['grumblet', 69, 8],
      ['platform', 74, 9, 3, 'h', 7, 260, 0],
      ['grumblet', 93], ['shellback', 95],
      ['spring', 97],
      ['platform', 106, 6, 3, 'v', 4, 200, 0], ['platform', 111, 6, 3, 'v', 4, 200, 0.5],
      ['spikelet', 122, 9],
      ['flutter', 134, 3, false],
      ['grumblet', 145], ['grumblet', 147], ['spikelet', 150],
      ['spring', 156, 10],
      ['flutter', 170, 6, false],
      ['shellback', 175],
    ],
    goal: { type: 'feather', x: 189 },
  },
  {
    id: '1-4', name: 'EMBER CITADEL', theme: 'citadel', music: 'citadel', time: 400,
    width: 212, start: 2, checkpoint: 120,
    hint: 'WATCH THE FIRE AND TIME YOUR JUMPS',
    map: [
      ['ground', 0, 14], ['lava', 15, 17], ['ground', 18, 34], ['lava', 35, 60],
      ['rect', 38, 10, 40, 13, 'X'], ['rect', 43, 8, 45, 13, 'X'], ['rect', 48, 10, 50, 13, 'X'],
      ['ground', 61, 90], ['lava', 91, 118], ['rect', 107, 9, 110, 13, 'X'],
      ['ground', 119, 145], ['lava', 146, 152], ['rect', 148, 8, 150, 13, 'X'], ['rect', 153, 8, 156, 13, 'X'],
      ['ground', 157, 211],
      ['row', 5, 8, '?M?'], ['power', 6, 8, 'ice'],
      ['row', 24, 8, 'S'],
      ['coins', 35, 8, 3], ['coins', 41, 6, 2], ['coins', 46, 5, 2],
      ['row', 68, 8, 'S'],
      ['row', 76, 8, 'B?B'],
      ['row', 82, 8, '?M?'], ['power', 83, 8, 'volt'],
      ['coins', 95, 4, 3], ['coins', 104, 5, 3],
      ['row', 124, 8, 'BBNBB'],
      ['row', 138, 8, 'S'],
      ['stairs', 141, 4, 1], ['rect', 145, 8, 145, 11, 'S'],
      ['coins', 146, 6, 2], ['coins', 151, 6, 2],
      ['stairs', 157, 4, -1],
      ['row', 175, 8, '?M?'], ['power', 176, 8, 'quake'],
      // boss arena: columns 187-211, walls at both ends, ledges to dodge on
      ['rect', 211, 0, 211, 11, 'S'],
      ['row', 191, 9, '----'], ['row', 206, 9, '----'],
      ['row', 192, 6, 'M'], ['power', 192, 6, 'rand'], ['row', 207, 6, '?'],
      ['coins', 196, 7, 2], ['coins', 202, 7, 2],
    ],
    entities: [
      ['ember', 16],
      ['firebar', 24, 8, 6, 0.04],
      ['spikelet', 31],
      ['ember', 41], ['ember', 47],
      ['platform', 51, 10, 3, 'h', 7, 280, 0],
      ['firebar', 68, 8, 5, -0.05],
      ['shellback', 73], ['grumblet', 80], ['grumblet', 86],
      ['flutter', 88, 6, false],
      ['platform', 93, 6, 2, 'v', 5, 220, 0],
      ['platform', 98, 6, 2, 'v', 5, 220, 0.5],
      ['platform', 102, 6, 2, 'v', 5, 220, 0.15],
      ['ember', 96], ['ember', 105],
      ['platform', 111, 9, 3, 'h', 5, 260, 0],
      ['spikelet', 129], ['spikelet', 133], ['shellback', 136],
      ['firebar', 138, 8, 6, 0.05],
      ['ember', 146], ['ember', 151],
      ['grumblet', 165], ['grumblet', 167], ['grumblet', 169], ['spikelet', 172],
      ['boss', 200],
    ],
    boss: { trigger: 189, wall: 187, right: 211 },
    goal: { type: 'crystal', x: 205, boss: true },
  },
  {
    id: '2-1', name: 'CORAL DEEP', theme: 'ocean', music: 'ocean', time: 400,
    width: 200, start: 3, checkpoint: 116,
    hint: 'TAP JUMP TO SWIM - NO STOMPING UNDERWATER',
    water: { top: 1 },
    currents: [
      [46, 60, -0.5, 0],        // undertow pushing back
      [103, 104, 0, -0.24],     // bubble vent: ride it over the trench
      [106, 110, 0, 0.07],      // downdraft into the trench
      [151, 165, 0.6, 0],       // fast lane (with a school swimming against it)
    ],
    map: [
      ['ground', 0, 20], ['row', 8, 8, '?M?'], ['power', 9, 8, 'volt'], ['coins', 13, 6, 4],
      ['ground', 25, 45],
      ['rect', 30, 8, 31, 11, 'X'], ['coins', 30, 6, 2],
      ['rect', 37, 1, 39, 5, 'X'],
      ['row', 41, 8, 'B?B'],
      ['ground', 46, 70], ['coins', 48, 5, 4], ['coins', 54, 8, 4],
      ['rect', 61, 1, 70, 6, 'X'],                  // low tunnel
      ['ground', 76, 99],
      ['row', 80, 8, '-----'], ['coins', 80, 7, 5],
      ['ground', 88, 90, 3], ['coins', 88, 2, 3],    // reef wall: squeeze over the top
      ['coins', 103, 4, 2],
      ['ground', 113, 150],
      ['pipe', 120, 3], ['row', 125, 8, '?N?'],
      ['rect', 131, 1, 150, 4, 'X'],                 // low ceiling
      ['rect', 136, 8, 139, 9, 'X'], ['coins', 136, 7, 4],
      ['rect', 144, 6, 147, 7, 'X'],
      ['ground', 151, 199],
      ['rect', 158, 9, 160, 11, 'X'], ['coins', 153, 5, 4], ['coins', 162, 3, 3],
      ['row', 172, 8, 'B?B'], ['row', 178, 5, 'h'],
    ],
    entities: [
      ['finlet', 18, 6], ['finlet', 28, 9], ['finlet', 34, 4, 'red'],
      ['urchin', 33, 11], ['jellop', 43, 5],
      ['finlet', 52, 6], ['finlet', 58, 9],
      ['urchin', 64, 11], ['urchin', 68, 11], ['finlet', 74, 9],
      ['jellop', 84, 8], ['urchin', 92, 11], ['finlet', 96, 4, 'red'],
      ['finlet', 108, 7, 'red'], ['finlet', 112, 4],
      ['snapvine', 120],
      ['jellop', 129, 6],
      ['urchin', 141, 11], ['jellop', 142, 8], ['finlet', 149, 9],
      ['urchin', 159, 8],
      ['finlet', 163, 5], ['finlet', 165, 7], ['finlet', 167, 9], ['finlet', 171, 6, 'red'],
      ['jellop', 180, 5], ['urchin', 185, 11],
    ],
    goal: { type: 'pearl', x: 192 },
  },
  {
    id: '2-2', name: 'FROSTWIND PEAKS', theme: 'snow', music: 'snow', time: 400,
    width: 210, start: 3, checkpoint: 104,
    hint: 'MIND THE WIND - ICE IS SLIPPERY!',
    wind: { calm: 220, warn: 70, gust: 130, force: 0.6 },
    map: [
      ['ground', 0, 24], ['row', 8, 8, '?M?'], ['power', 9, 8, 'ice'], ['coins', 14, 9, 4],
      ['ground', 25, 44], ['row', 25, 12, 'IIIIIIIIIIIIIIIIIIII'], ['row', 34, 8, 'B?B'], ['coins', 33, 6, 5],
      // wind gaps between snowy outcrops
      ['ground', 48, 52, 10], ['ground', 56, 59, 9], ['ground', 63, 67, 10],
      ['coins', 53, 6, 3], ['coins', 60, 5, 3],
      // icicle corridor under a rock overhang
      ['ground', 71, 100], ['rect', 74, 0, 92, 3, 'X'], ['coins', 76, 9, 15],
      ['row', 95, 8, '?N?'],
      // ice staircase, then a moving platform over a gap
      ['ground', 101, 120], ['rect', 108, 10, 109, 11, 'I'], ['rect', 110, 8, 111, 11, 'I'], ['rect', 112, 6, 113, 11, 'I'],
      ['coins', 110, 6, 2], ['coins', 112, 4, 2],
      // frozen lake with penguins and more icicles
      ['ground', 127, 150], ['row', 127, 12, 'IIIIIIIIIIIIIIIIIIIIIIII'], ['rect', 136, 0, 146, 2, 'X'],
      ['row', 130, 8, 'BB?BB'], ['coins', 130, 6, 5],
      // ledges over the last chasm (the wind matters here)
      ['row', 152, 10, '---'], ['row', 156, 8, '---'], ['row', 160, 10, '---'], ['coins', 156, 7, 3],
      ['ground', 164, 209], ['row', 170, 8, 'B?B'], ['row', 176, 12, 'IIIIII'],
    ],
    entities: [
      ['slideguin', 20], ['grumblet', 30], ['slideguin', 40],
      ['flutter', 58, 3, false],
      ['icicle', 76, 4], ['icicle', 79, 4], ['icicle', 82, 4], ['icicle', 85, 4], ['icicle', 88, 4], ['icicle', 91, 4],
      ['slideguin', 97],
      ['spikelet', 116],
      ['platform', 121, 9, 3, 'h', 3, 220, 0],
      ['slideguin', 134], ['icicle', 138, 3], ['icicle', 141, 3], ['icicle', 144, 3], ['slideguin', 147],
      ['flutter', 158, 3, false],
      ['slideguin', 172], ['grumblet', 182], ['slideguin', 188],
    ],
    goal: { type: 'snowflake', x: 196 },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2. ENGINE CONSTANTS & TUNING  (units: pixels and frames at a fixed 60 Hz)
// ═══════════════════════════════════════════════════════════════════════════
const TILE = 16, ROWS = 14, VIEW_W = 400, VIEW_H = 224;
const STEP_MS = 1000 / 60;

const WALK_MAX = 1.6, RUN_MAX = 2.75;
const ACCEL = 0.075, RUN_ACCEL = 0.045, FRICTION = 0.07, SKID = 0.2;
const AIR_ACCEL = 0.07, AIR_TURN = 0.11;
const JUMP_BASE = 4.9, JUMP_BONUS = 0.22;        // jump speed grows with run speed
const GRAV_HOLD = 0.17, GRAV_APEX = 0.25, GRAV = 0.5, MAX_FALL = 5.5;
const COYOTE = 6, JUMP_BUFFER = 7, STOMP_BOUNCE = 4.4;
const SMALL_H = 16, BIG_H = 26, PLAYER_W = 12;
// chili power: hold run to charge, release to fire (frames held for each level)
const CHARGE_MID = 32, CHARGE_FULL = 85;
const CHILI_DMG = [1, 2, 4];   // boss damage: tap pepper / hot pepper / chili blast
// Power-up suits: collecting one gives the "empowered" form (power 2) with that suit's ability.
// Item kind -> suit; a hit always drops Boyo back to plain big, whatever the suit.
const SUIT_OF = { pepper: 'fire', ice: 'ice', gale: 'gale', volt: 'volt', quake: 'quake' };
const SAVE_KEY = 'boyo-save';
const SUIT_KINDS = ['pepper', 'ice', 'gale', 'volt', 'quake'];
const SUIT_INFO = {
  fire:  { name: 'CHILI PEPPER', tip: 'RUN: FIRE  HOLD: CHARGE', icon: 'pepperA', color: '#ff8a2a' },
  ice:   { name: 'ICE WAND', tip: 'RUN: FREEZE - GRAB & THROW', icon: 'itemIce', color: '#7fd4ff' },
  gale:  { name: 'GALE FEATHER', tip: 'RUN: GUST  JUMP: FLAP  HOLD: GLIDE', icon: 'itemGale', color: '#9ae8a8' },
  volt:  { name: 'VOLT ORB', tip: 'RUN: ZAP  HOLD: STORM', icon: 'itemVolt', color: '#ffe14d' },
  quake: { name: 'QUAKE MALLET', tip: 'DOWN IN AIR: GROUND POUND', icon: 'itemQuake', color: '#c9c4d8' },
};
const TIP_FRAMES = 180;                       // how long a power-up's controls hint stays up
const ICE_MELT = 600;                         // frames before a frozen foe thaws
const POUND_HANG = 7, POUND_SPEED = 8.5;      // quake mallet ground pound
const CROUCH_SMALL_H = 12, CROUCH_BIG_H = 15;
// roll (tap run while moving on the ground): duration, speed, and the cap a chain of hits can reach
const DANCES = 6;        // number of victory dances
// stomp-jump forgiveness: a jump pressed up to EARLY frames before a stomp, or up to LATE frames
// after it, still gives the full-height bounce
const STOMP_EARLY = 14, STOMP_LATE = 7;
const SPIN_JUMP = 0.9;   // spin jump height relative to a normal jump
const ROLL_T = 26, ROLL_SPEED = 2.9, ROLL_MAX = 3.6, ROLL_COOL = 8;   // ducking hitboxes: both fit under a 1-tile gap
// swimming
const SWIM_MAX = 1.35, SWIM_WALK = 1.0, SWIM_ACCEL = 0.045, SWIM_TURN = 0.08, SWIM_DRAG = 0.015;
// holding run while swimming (or walking the seabed) goes faster
const SWIM_RUN_MAX = 2.1, SWIM_RUN_WALK = 1.5, SWIM_RUN_ACCEL = 0.07;
const SWIM_STROKE = -2.5, SWIM_GRAV = 0.075, SWIM_SINK = 1.6;

const T = {
  EMPTY: 0, GROUND: 1, BRICK: 2, QCOIN: 3, QPOW: 4, Q1UP: 5, USED: 6, SOLID: 7,
  PIPE_TL: 8, PIPE_TR: 9, PIPE_L: 10, PIPE_R: 11, SEMI: 12, LAVA: 13, MULTI: 14, HIDDEN: 15, COIN: 16,
  CRUMBLE: 17, PEDESTAL: 18, ICE: 19,
};
const TILE_CHARS = { X: 1, B: 2, '?': 3, M: 4, U: 5, S: 7, '-': 12, L: 13, N: 14, h: 15, o: 16, C: 17, I: 19 };
const SOLID = new Uint8Array(32);
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 17, 18, 19].forEach(t => { SOLID[t] = 1; });

const STOMP_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];

// ═══════════════════════════════════════════════════════════════════════════
// 3. UTILITIES & PIXEL FONT
// ═══════════════════════════════════════════════════════════════════════════
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, '0');

function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
// Crisp filled circle built from horizontal spans (no anti-aliasing).
function blob(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}
const safeStorage = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
};

// 5x7 bitmap font. Each glyph is 7 rows of 5-bit masks (bit 4 = leftmost pixel).
const FONT = {
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [28, 18, 17, 17, 17, 18, 28], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  ' ': [0, 0, 0, 0, 0, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '>': [8, 4, 2, 1, 2, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2], '+': [0, 4, 4, 31, 4, 4, 0], '=': [0, 0, 31, 0, 31, 0, 0],
  '*': [0, 17, 10, 4, 10, 17, 0], '&': [12, 18, 20, 8, 21, 18, 13],
  '←': [0, 4, 8, 31, 8, 4, 0], '→': [0, 4, 2, 31, 2, 4, 0], '↑': [4, 14, 21, 4, 4, 4, 0],
  '↓': [0, 4, 4, 4, 21, 14, 4],
};
const glyphCache = new Map();
function glyph(ch, color) {
  const key = ch + color;
  let c = glyphCache.get(key);
  if (c) return c;
  c = makeCanvas(5, 7);
  const g = c.getContext('2d');
  g.fillStyle = color;
  const rows = FONT[ch] || FONT['?'];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if ((rows[y] >> (4 - x)) & 1) g.fillRect(x, y, 1, 1);
  glyphCache.set(key, c);
  return c;
}
const textWidth = (s, scale = 1) => (s.length * 6 - 1) * scale;
function drawText(ctx, str, x, y, color = '#ffffff', o = {}) {
  const s = o.scale || 1;
  str = String(str).toUpperCase();
  if (o.align === 'center') x -= textWidth(str, s) / 2;
  else if (o.align === 'right') x -= textWidth(str, s);
  x = Math.round(x); y = Math.round(y);
  for (const ch of str) {
    if (ch !== ' ') {
      if (o.shadow) ctx.drawImage(glyph(ch, o.shadow), x + s, y + s, 5 * s, 7 * s);
      ctx.drawImage(glyph(ch, color), x, y, 5 * s, 7 * s);
    }
    x += 6 * s;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SOUND — synthesized SFX and a lookahead music sequencer
// ═══════════════════════════════════════════════════════════════════════════
function loadVol(k) {
  const v = parseFloat(safeStorage.get(k));
  return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
}

const Sound = {
  ctx: null, master: null, sfx: null, music: null, noiseBuf: null,
  // player volume sliders, 0..1 (50% each by default); scaled so 50/50 is an even mix
  musicVol: loadVol('boyo-vol-music'), sfxVol: loadVol('boyo-vol-sfx'),
  musicGain() { return this.musicVol * 0.6; },
  sfxGain() { return this.sfxVol * 2.2; },
  setVol(kind, v) {
    v = Math.max(0, Math.min(1, Math.round(v * 20) / 20));
    if (kind === 'music') this.musicVol = v; else this.sfxVol = v;
    safeStorage.set('boyo-vol-' + kind, String(v));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'music') this.music.gain.setTargetAtTime(this.musicGain(), t, 0.02);
    else this.sfx.gain.setTargetAtTime(this.sfxGain(), t, 0.02);
  },
  muted: false,                      // no mute toggle any more: the pause-menu volume sliders do that job
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = this.sfxGain(); this.sfx.connect(this.master);
      this.music = ctx.createGain(); this.music.gain.value = this.musicGain(); this.music.connect(this.master);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  setMuted(m) {
    this.muted = m;
    safeStorage.set('boyo-muted', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.02);
  },
  tone(f, t0, dur, o = {}) {
    const ctx = this.ctx;
    if (!ctx || !f) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.attack || 0.004));
    if (o.sustain) g.gain.setValueAtTime(v * 0.8, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.bus || this.sfx);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },
  noise(t0, dur, o = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.value = o.freq || 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol == null ? 0.2 : o.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfx);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  },
  seq(notes, step, o = {}) {
    const t = this.ctx.currentTime + 0.005;
    notes.forEach((n, i) => { if (n) this.tone(n, t + i * step, o.dur || step * 1.15, o); });
  },
  play(name) {
    Pad.rumble(name);
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'jump': this.tone(260, t, 0.16, { type: 'triangle', slide: 640, vol: 0.22 }); this.tone(520, t, 0.05, { vol: 0.04 }); break;
      case 'jumpBig': this.tone(190, t, 0.18, { type: 'triangle', slide: 480, vol: 0.24 }); this.tone(380, t, 0.05, { vol: 0.04 }); break;
      case 'coin': this.tone(1175, t, 0.16, { type: 'sine', slide: 1760, vol: 0.18 }); this.tone(2349, t + 0.06, 0.22, { type: 'sine', vol: 0.06 }); this.noise(t, 0.08, { filter: 'highpass', freq: 5000, vol: 0.04 }); break;
      case 'stomp': this.tone(520, t, 0.12, { slide: 110, vol: 0.2 }); this.noise(t, 0.07, { freq: 1500, vol: 0.15 }); break;
      case 'kick': this.tone(880, t, 0.05, { vol: 0.14 }); this.tone(440, t + 0.04, 0.08, { vol: 0.14 }); break;
      case 'bump': this.tone(140, t, 0.1, { type: 'triangle', slide: 70, vol: 0.4 }); break;
      case 'break': this.noise(t, 0.28, { freq: 1100, vol: 0.4 }); this.tone(180, t, 0.15, { slide: 50, vol: 0.2, type: 'triangle' }); break;
      case 'appear': this.tone(180, t, 0.25, { type: 'sine', slide: 520, vol: 0.3 }); this.noise(t + 0.18, 0.05, { freq: 3000, vol: 0.06 }); break;
      case 'power': this.tone(330, t, 0.45, { type: 'triangle', slide: 1320, vol: 0.22 }); this.seq([0, 0, 0, 1760, 0, 2093, 0, 2637], 0.05, { type: 'sine', vol: 0.07 }); break;
      case 'oneup': this.seq([880, 1109, 1319, 1760, 1319, 1760], 0.07, { type: 'triangle', vol: 0.2, dur: 0.1 }); break;
      case 'shrink': this.tone(700, t, 0.4, { type: 'triangle', slide: 160, vol: 0.25 }); this.tone(705, t, 0.4, { slide: 170, vol: 0.03 }); break;
      case 'fire': this.tone(900, t, 0.1, { type: 'triangle', slide: 300, vol: 0.2 }); this.noise(t, 0.08, { filter: 'highpass', freq: 2000, vol: 0.06 }); break;
      case 'chargeUp': this.tone(220, t, 0.5, { type: 'sawtooth', slide: 660, vol: 0.05 }); this.tone(440, t, 0.5, { type: 'triangle', slide: 1320, vol: 0.1 }); break;
      case 'charged': this.seq([1319, 1760, 2637], 0.05, { type: 'triangle', vol: 0.16, dur: 0.12 }); break;
      case 'chargeHum': this.tone(1760, t, 0.06, { type: 'sine', vol: 0.05 }); break;
      case 'shot': this.tone(700, t, 0.22, { type: 'sawtooth', slide: 140, vol: 0.12 }); this.noise(t, 0.2, { freq: 1800, vol: 0.18 }); break;
      case 'blast': this.tone(160, t, 0.7, { type: 'sawtooth', slide: 40, vol: 0.25 }); this.noise(t, 0.6, { freq: 900, vol: 0.4 }); this.tone(1200, t, 0.35, { type: 'square', slide: 200, vol: 0.06 }); break;
      case 'die': [0, 0.3, 0.6].forEach((d, i) => this.tone([392, 370, 349][i], t + d, 0.26, { type: 'triangle', slide: [370, 349, 330][i], vol: 0.24 })); this.tone(330, t + 0.9, 0.9, { type: 'triangle', slide: 220, vol: 0.24 }); break;
      case 'tick': this.tone(1568, t, 0.03, { vol: 0.05 }); break;
      case 'pause': this.seq([784, 1175], 0.09, { type: 'triangle', vol: 0.2, dur: 0.16 }); break;
      case 'select': this.tone(880, t, 0.05, { vol: 0.09 }); break;
      case 'confirm': this.seq([660, 990, 1320], 0.055, { vol: 0.1 }); break;
      case 'checkpoint': this.seq([784, 988, 1175, 1568], 0.075, { type: 'triangle', vol: 0.25 }); break;
      case 'hurry': this.seq([1568, 1175, 1568, 1175, 1568, 1175], 0.08, { type: 'triangle', vol: 0.2 }); break;
      case 'sizzle': this.noise(t, 0.18, { filter: 'highpass', freq: 3000, vol: 0.06 }); break;
      case 'firework': this.noise(t, 0.5, { freq: 600, vol: 0.28 }); this.tone(90, t, 0.3, { type: 'sine', slide: 40, vol: 0.3 }); break;
      case 'crystal': this.seq([523, 659, 784, 1047, 1319, 1568, 2093], 0.08, { type: 'triangle', vol: 0.22, dur: 0.7 }); break;
      case 'spin': this.tone(500, t, 0.22, { type: 'triangle', slide: 1300, vol: 0.18 }); this.noise(t, 0.18, { filter: 'bandpass', freq: 2600, vol: 0.12 }); break;
      case 'gustWarn': this.tone(380, t, 0.9, { type: 'sine', slide: 950, vol: 0.08 }); break;
      case 'gust': this.noise(t, 1.4, { freq: 650, vol: 0.22 }); this.noise(t, 1.0, { filter: 'highpass', freq: 3000, vol: 0.05 }); break;
      case 'slide': this.noise(t, 0.25, { filter: 'highpass', freq: 2500, vol: 0.1 }); this.tone(500, t, 0.15, { type: 'triangle', slide: 300, vol: 0.12 }); break;
      case 'crack': this.tone(2200, t, 0.05, { vol: 0.08 }); this.noise(t, 0.08, { filter: 'highpass', freq: 4000, vol: 0.1 }); break;
      case 'spike': this.tone(700, t, 0.12, { type: 'triangle', slide: 1500, vol: 0.12 }); this.noise(t, 0.06, { filter: 'highpass', freq: 5000, vol: 0.08 }); break;
      case 'iceshot': this.tone(1568, t, 0.12, { type: 'sine', slide: 2600, vol: 0.14 }); this.tone(2093, t + 0.05, 0.12, { type: 'sine', vol: 0.07 }); this.noise(t, 0.06, { filter: 'highpass', freq: 7000, vol: 0.06 }); break;
      case 'freeze': this.noise(t, 0.22, { filter: 'highpass', freq: 6000, vol: 0.2 }); this.seq([2637, 2093, 1568, 2093, 3136], 0.045, { type: 'sine', vol: 0.1 }); this.tone(300, t, 0.12, { type: 'triangle', slide: 120, vol: 0.12 }); break;
      case 'whoosh': this.noise(t, 0.34, { filter: 'bandpass', freq: 1300, vol: 0.2 }); this.tone(280, t, 0.28, { type: 'sine', slide: 760, vol: 0.08 }); break;
      case 'flap': this.noise(t, 0.12, { filter: 'bandpass', freq: 2200, vol: 0.14 }); this.tone(520, t, 0.1, { type: 'triangle', slide: 840, vol: 0.1 }); break;
      case 'volt': this.noise(t, 0.14, { filter: 'bandpass', freq: 3200, vol: 0.28 }); this.tone(1100, t, 0.14, { type: 'sawtooth', slide: 180, vol: 0.1 }); this.tone(2200, t, 0.05, { type: 'square', vol: 0.05 }); break;
      case 'thunder': this.noise(t, 0.8, { filter: 'lowpass', freq: 520, vol: 0.5 }); this.tone(70, t, 0.6, { type: 'sawtooth', slide: 32, vol: 0.28 }); this.noise(t, 0.2, { filter: 'bandpass', freq: 3000, vol: 0.3 }); this.tone(1400, t, 0.2, { type: 'sawtooth', slide: 150, vol: 0.1 }); break;
      case 'pound': this.tone(130, t, 0.3, { type: 'sine', slide: 38, vol: 0.55 }); this.noise(t, 0.35, { filter: 'lowpass', freq: 600, vol: 0.5 }); this.noise(t, 0.12, { freq: 2500, vol: 0.2 }); break;
      case 'shatter': this.noise(t, 0.3, { filter: 'highpass', freq: 2500, vol: 0.25 }); this.tone(1800, t, 0.12, { type: 'triangle', slide: 900, vol: 0.1 }); break;
      case 'roll': this.noise(t, 0.2, { filter: 'bandpass', freq: 900, vol: 0.22 }); this.tone(200, t, 0.16, { type: 'triangle', slide: 110, vol: 0.2 }); break;
      case 'swim': this.tone(420, t, 0.12, { type: 'triangle', slide: 760, vol: 0.14 }); this.noise(t, 0.06, { freq: 2500, vol: 0.04 }); break;
      case 'spring': this.tone(220, t, 0.28, { type: 'triangle', slide: 980, vol: 0.3 }); this.tone(440, t, 0.12, { slide: 1400, vol: 0.06 }); break;
      case 'crumble': this.noise(t, 0.22, { freq: 900, vol: 0.22 }); break;
      case 'zap': this.noise(t, 0.3, { filter: 'highpass', freq: 2500, vol: 0.28 }); this.tone(1800, t, 0.25, { type: 'sawtooth', slide: 120, vol: 0.08 }); break;
      case 'charge': this.tone(300, t, 0.6, { type: 'sawtooth', slide: 900, vol: 0.04 }); break;
      case 'roar': this.tone(150, t, 0.8, { type: 'sawtooth', slide: 50, vol: 0.2 }); this.noise(t, 0.7, { freq: 500, vol: 0.3 }); break;
      case 'burn': this.noise(t, 0.4, { filter: 'highpass', freq: 1200, vol: 0.2 }); break;
    }
  },
};

const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midiOf = n => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12; };
const freqOf = midi => 440 * Math.pow(2, (midi - 69) / 12);

/* Songs: `mel` is "NOTE:eighths" tokens ('R' = rest, '|' = bar line for readability).
   `bass` is one root note per 8-eighth bar, expanded with `bassPat` (semitone offsets).
   `drums` is an 8-step pattern per bar: k = kick, s = snare, h = hat. */
const SONGS = {
  meadow: {
    bpm: 150, lead: 'sq', drums: 'k.h.s.hh', bassPat: [0, 7, 12, 7],
    mel: 'C5 E5 G5 E5 A5:2 G5:2 | F5 E5 D5 E5 C5:4 | D5 F5 A5 F5 B5:2 A5:2 | G5 F5 E5 D5 G4:4 |' +
         'C5 E5 G5 C6 B5:2 A5:2 | G5 A5 F5 D5 E5:4 | F5:2 A5:2 G5 F5 E5 D5 | C5:2 G4 C5 R:4 |' +
         'E5:2 E5 F5 G5:2 E5:2 | F5:2 F5 G5 A5:4 | G5:2 G5 A5 B5:2 G5:2 | C6:6 R:2 |' +
         'A5 G5 F5 E5 F5:2 D5:2 | G5 F5 E5 D5 E5:2 C5:2 | D5 E5 F5 D5 G5:2 B4:2 | C5:6 R:2',
    bass: ['C3', 'C3', 'D3', 'G2', 'C3', 'A2', 'F2', 'C3', 'C3', 'F2', 'G2', 'C3', 'F2', 'C3', 'G2', 'C3'],
  },
  cave: {
    bpm: 112, lead: 'pl', drums: 'k...s..h', bassPat: [0, 12, 7, 12],
    mel: 'A4:2 C5 E5 A5:2 G5:2 | E5:2 D5 C5 D5:4 | F4:2 A4 C5 F5:2 E5:2 | D5:2 C5 B4 E5:4 |' +
         'A4 B4 C5 D5 E5:2 A5:2 | G5 F5 E5 D5 C5:4 | D5:2 F5:2 E5:2 C5:2 | B4:2 G#4:2 A4:4',
    bass: ['A2', 'A2', 'F2', 'E2', 'A2', 'C3', 'D3', 'E2'],
  },
  citadel: {
    bpm: 168, lead: 'sq', drums: 'khskkhsh', bassPat: [0, 12, 0, 12, 0, 12, 0, 12],
    mel: 'D5 R D5 F5 A5:2 F5:2 | G5 F5 E5 F5 D5:4 | A#4 R A#4 D5 F5:2 D5:2 | E5 D5 C#5 D5 A4:4 |' +
         'D5 F5 A5 D6 C6:2 A5:2 | A#5 A5 G5 F5 E5:4 | F5 G5 A5 A#5 A5:2 G5:2 | F5 E5 C#5 E5 D5:4',
    bass: ['D2', 'D2', 'A#1', 'A1', 'D2', 'G2', 'F2', 'A1'],
  },
  // Cloudtop: a breezy, open tune in F major on the plucked lead.
  sky: {
    bpm: 136, lead: 'pl', drums: 'k..hk.s.', bassPat: [0, 7, 12, 7],
    mel: 'F5:2 A5 C6 A5:2 G5 F5 | E5:2 G5 C6 G5:4 | D5:2 F5 A5 D6:2 C6 A5 | A#5:2 A5 G5 C5:4 |' +
         'F5 G5 A5 C6 D6:2 C6:2 | A#5 A5 G5 A5 F5:4 | G5 A5 A#5 D6 C6:2 A5:2 | G5:2 E5:2 F5:4',
    bass: ['F2', 'C3', 'D3', 'A#2', 'F2', 'A#2', 'G2', 'C3'],
  },
  // Frostwind Peaks: a crisp, chiming tune in E minor.
  snow: {
    bpm: 118, lead: 'pl', drums: 'k..h..h.', bassPat: [0, 7, 12, 7],
    mel: 'E5:2 G5 B5 E6:2 D6 B5 | C6:2 B5 A5 G5:4 | A5:2 C6 E6 D6:2 B5 G5 | F#5:2 A5 B5 B4:4 |' +
         'E5 F#5 G5 A5 B5:2 E6:2 | D6 C6 B5 A5 G5:4 | A5 B5 C6 A5 B5:2 F#5:2 | E5:6 R:2',
    bass: ['E2', 'C3', 'A2', 'B2', 'E2', 'G2', 'A2', 'E2'],
  },
  // Coral Deep: a slow, flowing tune in G major on the echoing pluck.
  ocean: {
    bpm: 104, lead: 'pl', drums: 'k...h..h', bassPat: [0, 7, 12, 7],
    mel: 'B4 D5 G5:2 F#5 E5 D5:2 | E5 G5 C6:2 B5 A5 G5:2 | A5:2 F#5 D5 E5:2 F#5 G5 | A5:6 R:2 |' +
         'B4 D5 G5:2 A5 B5 C6:2 | B5 A5 G5:2 E5 F#5 G5:2 | A5 B5 A5 G5 F#5:2 D5:2 | G5:6 R:2',
    bass: ['G2', 'C3', 'D3', 'D3', 'G2', 'E2', 'D2', 'G2'],
  },
  title: null, // filled below (meadow at a gentler tempo)
  // Level clear: a bright rising fanfare in D major, resolving onto a long D.
  clear: {
    bpm: 150, lead: 'sq', loop: false, bassPat: [0, 7, 12, 7],
    mel: 'D5 F#5 A5 D6:2 A5 F#5 A5 | G5 B5 D6 G6:2 F#6 E6 D6 | E6:2 D6 C#6 D6:2 B5:2 | A5 B5 C#6 A5 D6:4',
    bass: ['D3', 'G3', 'A2', 'D3'],
  },
  // Game over: a slow, wistful descent in A minor that is left unresolved, then settles.
  gameover: {
    bpm: 92, lead: 'tri', loop: false, bassPat: [0, 12],
    mel: 'A4:2 G4:2 F4:2 E4:2 | F4 E4 D4 E4 C4:4 | D4:2 C4:2 B3:2 E4:2 | A3:6 R:2',
    bass: ['A2', 'D3', 'G2', 'A2'],
  },
};
SONGS.title = Object.assign({}, SONGS.meadow, { bpm: 128, drums: 'k...s...' });

const songCache = new Map();
function compileSong(name) {
  if (songCache.has(name)) return songCache.get(name);
  const def = SONGS[name];
  const ev = [];
  let len = 0;
  if (def.mel) {
    let t = 0;
    for (const tok of def.mel.split(/[\s|]+/)) {
      if (!tok) continue;
      const [n, d] = tok.split(':');
      const dur = d ? parseFloat(d) : 1;
      if (n !== 'R') ev.push({ t, f: freqOf(midiOf(n)), d: dur, i: def.lead || 'sq' });
      t += dur;
    }
    len = Math.max(len, t);
  }
  if (def.bass) {
    const step = 8 / def.bassPat.length;
    let t = 0;
    for (const root of def.bass) {
      const m = midiOf(root);
      for (const iv of def.bassPat) { ev.push({ t, f: freqOf(m + iv), d: step * 0.9, i: 'tri' }); t += step; }
    }
    len = Math.max(len, t);
  }
  if (def.drums) {
    const bars = Math.round(len / 8);
    for (let b = 0; b < bars; b++) for (let k = 0; k < 8; k++) {
      const ch = def.drums[k];
      if (ch !== '.') ev.push({ t: b * 8 + k, d: 1, i: ch });
    }
  }
  ev.sort((a, b) => a.t - b.t);
  const song = { ev, len, spe: 60 / def.bpm / 2, loop: def.loop !== false };
  songCache.set(name, song);
  return song;
}

// Songs composed outside the game: name → [mp3, alt mp3]. They fade in, fade out before the end, then loop.
// Each level has two tracks (main + alt) to fight listening fatigue; one is picked at random.
const MUSIC_FILES = {
  meadow: ['music/1-1.mp3', 'music/1-1alt.mp3'],
  title: ['music/1-1.mp3', 'music/1-1alt.mp3'],   // title screen borrows the 1-1 tracks
  cave: ['music/1-2.mp3', 'music/1-2alt.mp3'],
  sky: ['music/1-3.mp3', 'music/1-3alt.mp3'],
  citadel: ['music/1-4.mp3', 'music/1-4alt.mp3'],
  ocean: ['music/2-1.mp3'],
  snow: ['music/2-2.mp3'],
};
const MUSIC_FADE_IN = 2.0, MUSIC_FADE_OUT = 3.0;

const Music = {
  want: null, song: null, gain: null, start: 0, idx: 0, loop: 0, rate: 1, el: null,
  play(name, rate = 1, at = 0) {
    if (this.el && this.fileName === name && !this.suspended) return;   // mp3 already playing: keep it going (no restart, no speed change)
    this.stop();
    this.want = { name, rate, at };
  },
  // Remember which mp3 track was playing and how far in, so the level's restart after a death can
  // carry on from the same spot (see Game.startLevel).
  remember(level) {
    this.memo = this.el && this.fileName ? { level, name: this.fileName, idx: this.picked[this.fileName], pos: this.el.currentTime } : null;
  },
  // Pause menu: an mp3 track keeps its place; generated music just stops.
  pause() {
    if (this.el) { this.el.pause(); this.suspended = true; } else this.stop();
  },
  resume(name, rate = 1) {
    if (this.el && this.suspended) {
      this.suspended = false; this.rampStart = performance.now();
      this.el.play().catch(() => {});
    } else this.play(name, rate);
  },
  stop() {
    this.suspended = false; this.rampStart = 0;
    if (this.el) {
      const el = this.el, v0 = el.volume;
      this.el = null;
      let n = 0;
      const iv = setInterval(() => {
        el.volume = Math.max(0, v0 * (1 - ++n / 10));
        if (n >= 10) { clearInterval(iv); el.pause(); el.removeAttribute('src'); el.load(); }
      }, 30);
    }
    if (this.gain && Sound.ctx) {
      const g = this.gain;
      g.gain.setTargetAtTime(0, Sound.ctx.currentTime, 0.03);
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* already gone */ } }, 500);
    }
    this.gain = null; this.song = null; this.want = null;
  },
  suspended: false, rampStart: 0,
  picked: Object.create(null),
  shuffle(name) { delete this.picked[name]; },        // next play() of this song re-rolls main/alt
  trackFor(name) {
    const list = MUSIC_FILES[name];
    return list[this.picked[name] ?? (this.picked[name] = Math.floor(Math.random() * list.length))];
  },
  beginFile(w) {
    this.fileName = w.name;
    const el = this.el = new Audio(this.trackFor(w.name));
    // mp3 tracks always play at normal speed (no hurry-up / boss speed-up)
    el.volume = 0;
    if (w.at > 0) {                                       // resume part-way through (after a death)
      el.addEventListener('loadedmetadata', () => { try { el.currentTime = Math.min(w.at, Math.max(0, el.duration - 4)); } catch (e) { /* not seekable */ } }, { once: true });
      this.rampStart = performance.now();
    }
    el.addEventListener('ended', () => {
      if (this.el !== el) return;
      this.shuffle(w.name);                             // new roll each loop: main or alt
      el.src = this.trackFor(w.name);
      el.play().catch(() => {});
    });
    el.play().catch(() => {});
  },
  updateFile() {
    const el = this.el;
    if (!el || el.paused || !isFinite(el.duration)) return;
    const t = el.currentTime, left = (el.duration - t) / el.playbackRate;
    let f = Math.min(1, t / MUSIC_FADE_IN, left / MUSIC_FADE_OUT);
    f = Math.max(0, f); f = f * f * (3 - 2 * f);              // smoothstep
    if (this.rampStart) f *= Math.min(1, (performance.now() - this.rampStart) / 500);   // ease back in after a pause
    el.volume = Sound.muted ? 0 : Math.min(1, f * Sound.musicGain());
  },
  begin() {
    const w = this.want;
    this.song = compileSong(w.name);
    this.rate = w.rate;
    this.gain = Sound.ctx.createGain();
    this.gain.connect(Sound.music);
    this.start = Sound.ctx.currentTime + 0.08;
    this.idx = 0; this.loop = 0;
  },
  update() {
    const ctx = Sound.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.el) { this.updateFile(); return; }
    if (this.want && MUSIC_FILES[this.want.name]) { this.beginFile(this.want); this.want = null; return; }
    if (this.want && !this.song) this.begin();
    const s = this.song;
    if (!s || !s.ev.length) return;
    const spe = s.spe / this.rate, now = ctx.currentTime, ahead = now + 0.2;
    for (let guard = 0; guard < 512; guard++) {
      const e = s.ev[this.idx];
      let time = this.start + (this.loop * s.len + e.t) * spe;
      if (time < now - 0.25) { this.start += now + 0.05 - time; time = now + 0.05; } // tab was hidden: resync
      if (time > ahead) break;
      this.note(e, time, spe);
      if (++this.idx >= s.ev.length) {
        this.idx = 0; this.loop++;
        if (!s.loop) { this.song = null; this.want = null; break; }
      }
    }
  },
  note(e, time, spe) {
    const dur = e.d * spe, bus = this.gain;
    switch (e.i) {
      case 'sq': Sound.tone(e.f, time, dur * 0.95, { type: 'square', vol: 0.05, sustain: true, bus }); break;
      case 'pl':
        Sound.tone(e.f, time, Math.max(0.25, dur), { type: 'triangle', vol: 0.2, bus });
        Sound.tone(e.f * 2, time, 0.12, { type: 'square', vol: 0.02, bus });
        Sound.tone(e.f, time + 0.27, Math.max(0.25, dur), { type: 'triangle', vol: 0.07, bus });
        break;
      case 'tri': Sound.tone(e.f, time, dur, { type: 'triangle', vol: 0.17, sustain: true, bus }); break;
      case 'k': Sound.tone(150, time, 0.12, { type: 'sine', slide: 45, vol: 0.32, bus }); break;
      case 's': Sound.noise(time, 0.09, { filter: 'bandpass', freq: 1800, vol: 0.13, bus }); break;
      case 'h': Sound.noise(time, 0.03, { filter: 'highpass', freq: 7000, vol: 0.06, bus }); break;
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. INPUT
// ═══════════════════════════════════════════════════════════════════════════
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
  ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyJ: 'run',
  KeyC: 'roll', KeyL: 'roll', KeyV: 'spin', KeyI: 'spin',
  KeyP: 'pause', Escape: 'pause', Enter: 'start', NumpadEnter: 'start', KeyF: 'fullscreen',
  // virtual codes pressed by the on-screen touch controls
  TouchLeft: 'left', TouchRight: 'right', TouchJump: 'jump', TouchRun: 'run',
  // virtual codes pressed by game controllers (see Pad)
  PadLeft: 'left', PadRight: 'right', PadUp: 'up', PadDown: 'down', PadJump: 'jump', PadRun: 'run',
  PadPause: 'pause', PadStart: 'start', PadBack: 'pause', PadRoll: 'roll', PadSpin: 'spin',
};
const Input = {
  held: Object.create(null), hits: new Set(), codes: new Set(),
  down(a) { return (this.held[a] | 0) > 0; },
  hit(a) { return this.hits.has(a); },
  endStep() { this.hits.clear(); },
  reset() { this.held = Object.create(null); this.codes.clear(); },
  press(code) {
    const a = KEYMAP[code];
    if (!a || this.codes.has(code)) return a;
    this.codes.add(code);
    this.held[a] = (this.held[a] | 0) + 1;
    this.hits.add(a);
    return a;
  },
  release(code) {
    const a = KEYMAP[code];
    if (!a || !this.codes.has(code)) return;
    this.codes.delete(code);
    this.held[a] = Math.max(0, (this.held[a] | 0) - 1);
  },
};

// ---- game controllers (DualSense, DualShock, Xbox, ... via the Gamepad API) ----
// Polled once per frame and turned into the same virtual key codes the keyboard uses,
// so every screen works with a controller without special cases.
//   Cross = jump    Circle = roll    Triangle = spin jump    Square / L1 / R1 / L2 / R2 = run / fire
//   D-pad or left stick = move (and navigate menus, with auto-repeat)
//   Options = pause in game, confirm in menus    Create / touchpad = back / pause
const PAD_DEAD_ON = 0.45, PAD_DEAD_OFF = 0.3;      // stick hysteresis: no flicker at the edge
const PAD_RUMBLE = {
  stomp: [70, 0.15, 0.45], break: [90, 0.35, 0.6], spring: [130, 0.25, 0.7], power: [160, 0, 0.35],
  shrink: [260, 0.6, 0.8], die: [420, 1, 1], burn: [420, 1, 1], zap: [220, 0.5, 0.9],
  roar: [650, 0.9, 0.5], pound: [220, 0.9, 0.6], thunder: [320, 1, 0.8], freeze: [60, 0, 0.35], volt: [80, 0.2, 0.6], shatter: [70, 0.2, 0.4], roll: [70, 0.1, 0.35], spin: [50, 0, 0.25], shot: [120, 0.3, 0.6], blast: [380, 1, 0.8], charged: [60, 0, 0.4], firework: [160, 0.6, 0.3], crumble: [80, 0.2, 0.35], kick: [45, 0, 0.3],
};
const Pad = {
  used: false,                 // last input came from a controller (switches on-screen button names)
  stick: { left: false, right: false, up: false, down: false },
  rep: { up: 0, down: 0 }, menuCode: null,
  // PlayStation pads get PlayStation button names; anything else (Razer Kishi, Xbox, 8BitDo...) gets Xbox-style names
  isPS() { const gp = this.list()[0]; return !gp || /054c|dualsense|dualshock|playstation|wireless controller/i.test(gp.id || ''); },
  list() {
    try { return navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(g => g && g.connected) : []; }
    catch (e) { return []; }
  },
  read(gp) {
    const b = i => { const x = gp.buttons[i]; return !!x && (x.pressed || x.value > 0.5); };
    const ax = i => gp.axes[i] || 0;
    if (gp.mapping === 'standard') {
      return {
        jump: b(0), roll: b(1), spin: b(3), run: b(2) || b(4) || b(5) || b(6) || b(7),
        menu: b(9), back: b(8) || b(17),
        left: b(14), right: b(15), up: b(12), down: b(13), lx: ax(0), ly: ax(1),
      };
    }
    // Raw layout (e.g. Firefox on Linux): cross, circle, triangle, square, L1, R1, L2, R2, create,
    // options; the d-pad is a hat on axes 6/7.
    const hx = gp.axes.length > 7 ? ax(6) : 0, hy = gp.axes.length > 7 ? ax(7) : 0;
    return {
      jump: b(0), roll: b(1), spin: b(2), run: b(3) || b(4) || b(5) || b(6) || b(7),
      menu: b(9), back: b(8),
      left: hx < -0.5, right: hx > 0.5, up: hy < -0.5, down: hy > 0.5, lx: ax(0), ly: ax(1),
    };
  },
  set(code, on) {
    if (on && !Input.codes.has(code)) { Input.press(code); this.used = true; Sound.unlock(); }
    else if (!on && Input.codes.has(code)) Input.release(code);
  },
  releaseAll() {
    for (const c of ['PadLeft', 'PadRight', 'PadUp', 'PadDown', 'PadJump', 'PadRun', 'PadRoll', 'PadSpin', 'PadPause', 'PadStart', 'PadBack']) this.set(c, false);
    this.menuCode = null;
  },
  poll(game) {
    const pads = this.list();
    if (!pads.length) { if ([...Input.codes].some(c => c.startsWith('Pad'))) this.releaseAll(); return; }
    const w = { jump: false, roll: false, spin: false, run: false, menu: false, back: false, left: false, right: false, up: false, down: false };
    let lx = 0, ly = 0;
    for (const gp of pads) {
      const r = this.read(gp);
      for (const k in w) w[k] = w[k] || r[k];
      if (Math.abs(r.lx) > Math.abs(lx)) lx = r.lx;
      if (Math.abs(r.ly) > Math.abs(ly)) ly = r.ly;
    }
    const st = this.stick;
    st.left = lx < -(st.left ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.right = lx > (st.right ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.up = ly < -(st.up ? PAD_DEAD_OFF : PAD_DEAD_ON);
    st.down = ly > (st.down ? PAD_DEAD_OFF : PAD_DEAD_ON);
    const inPlay = game.mode === 'play';
    const up = (w.up || st.up) && !inPlay;   // in play, up would jump
    const down = w.down || (inPlay ? ly > 0.6 && ly > Math.abs(lx) : st.down);
    this.set('PadLeft', w.left || st.left);
    this.set('PadRight', w.right || st.right);
    this.set('PadUp', up);
    this.set('PadDown', down);
    this.set('PadJump', w.jump);
    this.set('PadRun', w.run);
    this.set('PadRoll', w.roll);
    this.set('PadSpin', w.spin);
    this.set('PadBack', w.back);
    // Options: pause during play, confirm everywhere else (decided when pressed)
    if (w.menu && !this.menuCode) { this.menuCode = inPlay || game.mode === 'pause' ? 'PadPause' : 'PadStart'; this.set(this.menuCode, true); }
    else if (!w.menu && this.menuCode) { this.set(this.menuCode, false); this.menuCode = null; }
    // menu auto-repeat when a direction is held
    const now = performance.now();
    for (const [d, on] of [['up', up], ['down', down && !inPlay]]) {
      if (!on) this.rep[d] = 0;
      else if (!this.rep[d]) this.rep[d] = now + 380;
      else if (now >= this.rep[d]) { Input.hits.add(d); this.rep[d] = now + 110; }
    }
  },
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

// ═══════════════════════════════════════════════════════════════════════════
// 6. ART — sprites (pixel arrays), tiles and backgrounds, all generated in code
// ═══════════════════════════════════════════════════════════════════════════
const INK = '#1b1530';
const withRows = (base, from, rows) => base.slice(0, from).concat(rows, base.slice(from + rows.length));

// Boyo: a cheerful kid in a striped beanie with a pom-pom, white tee and denim overalls. 20px
// wide, facing right, lit from the top-left. Beanie: C/R/c red, Y yellow, G/g teal ribbed cuff.
// H/h hair, S/s skin, T/t tee, O/o denim, B/b shoes.
const PAL_BOYO = {
  K: INK, C: '#e63946', R: '#ff8f98', c: '#a32436', y: '#d9952e', G: '#2ec4b6', g: '#168479', H: '#8a5a32', h: '#55351c',
  S: '#ffd7ae', s: '#e9a978', W: '#ffffff', P: '#ff9aa2',
  T: '#f7f3ea', t: '#c9c3b6', O: '#3b78e0', o: '#27509e', Y: '#ffd166', B: '#9a5a30', b: '#5a3118',
};
const PAL_FIRE = Object.assign({}, PAL_BOYO, {
  C: '#fff1dc', R: '#ffffff', c: '#d9b48c', G: '#ff4f5e', g: '#b8263a', O: '#ff7a3c', o: '#b8401a', T: '#fff8e8', Y: '#ffe066',
});
// fully charged chili power: everything glows white-hot
const PAL_HOT = Object.assign({}, PAL_FIRE, {
  C: '#ffffff', R: '#ffffff', c: '#ffe9b0', G: '#ffd166', g: '#ff9a3c', O: '#ffd166', o: '#ff8a2a', T: '#ffffff', t: '#ffe0a0', Y: '#ffffff',
});

const suitPal = o => Object.assign({}, PAL_FIRE, o);
const SUIT_PALS = {
  ice: suitPal({ C: '#e6f8ff', R: '#ffffff', c: '#9fc9e0', G: '#3aa7e8', g: '#1f6fb0', O: '#5fc9ff', o: '#2f86c8', T: '#f4fbff', t: '#bcd8e8', Y: '#ffffff' }),
  gale: suitPal({ C: '#b9f3a8', R: '#e8ffd8', c: '#6fbf62', G: '#2fb36b', g: '#1a7a4a', O: '#4cd18a', o: '#2a9a62', T: '#f7fff0', t: '#c8e0c0', Y: '#fff1a8' }),
  volt: suitPal({ C: '#ffe14d', R: '#fff7a8', c: '#c9a000', G: '#7a3cff', g: '#4a1fb0', O: '#8f5bff', o: '#5a2fc0', T: '#fff9d6', t: '#e0d48a', Y: '#ffffff' }),
  quake: suitPal({ C: '#c9c4d8', R: '#efecf8', c: '#8a86a0', G: '#a0692f', g: '#6b4423', O: '#7d7691', o: '#544e6a', T: '#e8e4f0', t: '#b0aac0', Y: '#ffd166' }),
};

const HEAD = [
  '........KKK.........',
  '.......KYWYK........',
  '.......KYYyK........',
  '.....KKKKKKKKK......',
  '....KCRRCCCCCcK.....',
  '...KCRCCCCCCCCcK....',
  '..KYYYYYYYYYYYyyK...',
  '..KGgGgGgGgGgGgGK...',
  '..KHHSSSSSSSKWSSK...',
  '..KHhSSSSSSSKKSSK...',
  '..KHhSSPPSSSSSSSK...',
  '..KHhSSSSSSSSSSSK...',
  '...KhsSSSSSSSSSK....',
  '.....KsssssssK......',
];
const HEAD_BLINK = withRows(HEAD, 8, ['..KHHSSSSSSSSSSSK...']);
const HEAD_SHOCK = withRows(HEAD, 8, ['..KHHSSSSSKKWKSSK...', '..KHhSSSSSKKKKSSK...', '..KHhSSPPSSSSSSSK...', '..KHhSSSSSSSSSSSK...']);

// small body: 3 torso rows (tee + overalls bib, arms) and 3 leg rows (shorts, legs, shoes)
const S_TORSO = {
  idle: ['.....KTTTTTTTK......', '...KSKOOYOOOOKSK....', '....KKOOOOOOOKK.....'],
  runA: ['.....KTTTTTTTK.KSK..', '...KSKOOYOOOOKTK....', '....KKOOOOOOOK......'],
  runB: ['..KSKKTTTTTTTK......', '...KTKOOYOOOOKSK....', '....KKOOOOOOOK......'],
  jump: ['..KSKKTTTTTTTK.KSK..', '....KKOOYOOOOKK.....', '.....KOOOOOOOK......'],
  fall: ['..KSKKTTTTTTTKSK....', '....KKOOYOOOOKK.....', '.....KOOOOOOOK......'],
  skid: ['.....KTTTTTTTK......', '....KKOOYOOOOKSK....', '.....KOOOOOOOK......'],
};
const shortsLegs = rows => rows.map((r, i) => (i === 0 ? r.replace(/c/g, 'o').replace(/C/g, 'O') : i === 1 ? r.replace(/B/g, 'S') : r));
const S_LEGS = Object.fromEntries(Object.entries({
  idle: ['......KcCCCcK.......', '......KBK.KBK.......', '.....KBbK.KBbK......'],
  run0: ['.....KcCCCCcK.......', '....KBK....KBK......', '...KBbK.....KBbK....'],
  run1: ['......KcCCCcK.......', '......KBKKBK........', '.......KBbK.........'],
  run2: ['.....KcCCCCcK.......', '.....KBK..KBK.......', '....KBbK...KBbK.....'],
  run3: ['......KcCCCcK.......', '.......KBKBK........', '......KBbK..........'],
  jump: ['......KcCCCcK.......', '......KBBK.KBK......', '.......KbK..KBK.....'],
  fall: ['......KcCCCcK.......', '.....KBK..KBK.......', '.....KbK..KbK.......'],
  skid: ['.....KcCCCcK........', '....KBK.KBK.........', '...KBbK.KBbK........'],
}).map(([k, v]) => [k, shortsLegs(v)]));
// ducking: head on a squashed body
const S_CROUCH = ['...KSKTTTTTTTKSK....', '...KBBKOOOOOOKBBK...'];
const B_CROUCH = ['....KTTTTTTTTTK.....', '...KSKOOYOOOOKSK....', '...KOOOOOOOOOOOK....', '..KBBBKKKKKKKBBBK...'];
const S_DIE_BODY = [
  '..KSKKTTTTTTTKSK....', '....KKOOYOOOOKK.....', '.....KOOOOOOOK......',
  '.....KOOOOOOOK......', '.....KSSK.KSSK......', '....KBBbK.KBBbK.....',
];

// big body: 10 torso rows and 5 leg rows
const B_TORSO = [
  '....KTTTTTTTTTK.....', '...KTTKOTTTOKTTK....', '...KSKKOTTTOKKSK....', '....KTTOOYOOTTK.....',
  '....KTTOOOOOTtK.....', '.....KOOOOOOOOK.....', '.....KOOOOOOOoK.....', '.....KOOOOOOOoK.....',
  '.....KOOOKKOOoK.....', '.....KOOK..KOoK.....',
];
const B_TORSO_JUMP = withRows(B_TORSO, 0, [
  '..KSKKTTTTTTTTK.KSK.', '...KTKKOTTTOKKTSK...', '....KKKOTTTOKK......', '....KTTOOYOOTTK.....', '....KTTOOOOOTtK.....',
]);
const B_TORSO_RUN = withRows(B_TORSO, 1, ['...KTTKOTTTOKTTK....', '..KSKKKOTTTOKK.KSK..', '.....KTTOOYOOTK.....', '.....KTTOOOOOtK.....']);
const bigLegs = rows => rows.map((r, i) => (i < 3 ? r.replace(/B/g, 'S') : r));
const B_LEGS = Object.fromEntries(Object.entries({
  idle: ['.....KBBK.KBBK......', '.....KBBK.KBBK......', '.....KBBK.KBBK......', '....KBBbK.KBBbK.....', '....KKKKK.KKKKK.....'],
  run0: ['....KBBK...KBBK.....', '...KBBK.....KBBK....', '...KBBK.....KBBK....', '..KBBbK......KBBbK..', '..KKKKK......KKKKK..'],
  run1: ['.....KBBKBBK........', '......KBBBK.........', '......KBBK..........', '......KBBbK.........', '......KKKKK.........'],
  run2: ['.....KBBK.KBBK......', '....KBBK...KBBK.....', '....KBBK...KBBK.....', '...KBBbK....KBBbK...', '...KKKKK....KKKKK...'],
  run3: ['......KBBKBBK.......', '.......KBBBK........', '........KBBK........', '........KBBbK.......', '........KKKKK.......'],
  jump: ['.....KBBK..KBBK.....', '....KBBK....KBK.....', '....KBBK....KBK.....', '...KBBbK.....KK.....', '...KKKKK............'],
  skid: ['.....KBBKBBK........', '....KBBKBBK.........', '....KBBKBBK.........', '...KBBbKBBbK........', '...KKKKKKKKK........'],
}).map(([k, v]) => [k, bigLegs(v)]));

// Grumblet: a grumpy walking acorn (cap C/c/L fixed, body A/a tinted per theme)
const GRUMBLET = [
  '.......KK.......',
  '.......KcK......',
  '....KKKKKKKK....',
  '..KKCLCLCLCCKK..',
  '.KCLCLCLCLCLCcK.',
  '.KCCCCCCCCCCCcK.',
  '.KKKKKKKKKKKKKK.',
  '..KAAAAAAAAAAK..',
  '..KAWWAAAAWWaK..',
  '..KAWKAAAAWKaK..',
  '..KAPAAAAAAPaK..',
  '...KAAAKKAAaK...',
  '....KaaaaaaK....',
  '.....KKKKKK.....',
  '...KDDK..KDDK...',
  '...KKKK..KKKK...',
];
const GRUMBLET_FEET_B = ['..KDDK....KDDK..', '..KKKK....KKKK..'];   // second step of the walk cycle
// Shellback: an armoured pill bug, facing right; curls into a banded ball when stomped
const SHELLBACK = [
  '................',
  '................',
  '....KKKKKKK.....',
  '..KKLGgLGgLKK...',
  '.KLGgGGgGGgGLK..',
  'KGGgGGgGGgGGgGK.',
  'KGGgGGgGGgGGgKKK',
  'KGGgGGgGGgGGKSSK',
  'KGGgGGgGGgGGKSWK',
  'KGGgGGgGGgGGKSKK',
  'KRRRRRRRRRRRKSSK',
  '.KRRRRRRRRRRRKK.',
  '..KKKKKKKKKKKK..',
  '..KDKDKDKDKDK...',
  '..KK.KK.KK.KK...',
  '................',
];
const SHELLBACK_LEGS_B = ['...KDKDKDKDKDK..', '...KK.KK.KK.KK..', '................'];
const SHELL = [
  '.....KKKKKK.....',
  '...KKLGgGGgKK...',
  '..KLGgGGgGGgGK..',
  '.KLGgGGgGGgGGgK.',
  '.KGgGGgGGgGGgGK.',
  'KGGgGGgGGgGGgGGK',
  'KGGgGGgGGgGGgGGK',
  '.KGgGGgGGgGGgGK.',
  '..KgGGgGGgGGgK..',
  '...KKKKKKKKKK...',
];
const SHELL_B = [
  '.....KKKKKK.....',
  '...KKLgGGgGKK...',
  '..KLgGGgGGgGGK..',
  '.KLgGGgGGgGGgGK.',
  '.KgGGgGGgGGgGGK.',
  'KGgGGgGGgGGgGGgK',
  'KGgGGgGGgGGgGGgK',
  '.KgGGgGGgGGgGGK.',
  '..KGGgGGgGGgGK..',
  '...KKKKKKKKKK...',
];
const FLUTTER_UP = [
  '.K............K.',
  'KVK..........KVK',
  'KVVK..K..K..KVVK',
  'KVVVKKVKKVKKVVVK',
  'KVVVVVVVVVVVVVVK',
  '.KVVVVWRVWRVVVK.',
  '..KVVVVVVVVVVK..',
  '...KvVVKKVVvK...',
  '....KvVVVVvK....',
  '.....KKVVKK.....',
  '.......KK.......',
  '................',
];
const FLUTTER_DOWN = [
  '................',
  '......K..K......',
  '.....KVKKVK.....',
  '....KVVVVVVK....',
  '...KVVWRWRVVK...',
  '..KVVVVVVVVVVK..',
  '.KVVVKVVVVKVVVK.',
  'KVVVK.KVVK.KVVVK',
  'KVVK...KK...KVVK',
  'KVK..........KVK',
  'KK............KK',
  '................',
];
// Snapvine: a chomping log-worm that pops out of hollow logs
const VINE_OPEN = [
  '...KKK....KKK...',
  '..KWWWK..KWWWK..',
  '..KWKWKKKKWKWK..',
  '.KFFFFFFFFFFFFK.',
  'KFFfFFFFFFFFfFFK',
  'KFFKKKKKKKKKKFFK',
  'KFKWMWMMMMWMWKFK',
  'KFKMMMMMMMMMMKFK',
  'KFKWMWMMMMWMWKFK',
  'KFFKKKKKKKKKKFFK',
  '.KFFfFFFFFFfFFK.',
  '..KKFFFFFFFFKK..',
];
const VINE_SHUT = [
  '...KKK....KKK...',
  '..KWWWK..KWWWK..',
  '..KWKWKKKKWKWK..',
  '.KFFFFFFFFFFFFK.',
  'KFFfFFFFFFFFfFFK',
  'KFFFFFFFFFFFFFFK',
  'KFFKKKKKKKKKKFFK',
  'KFFKWKWKWKWKKFFK',
  'KFFFKKKKKKKKFFFK',
  'KFFfFFFFFFFFfFFK',
  '.KFFfFFFFFFfFFK.',
  '..KKFFFFFFFFKK..',
];
const VINE_STEM = [
  '.....KKKKKK.....',
  '....KLLLLLlK....',
  '....KLLLLLlK....',
  '.....KKKKKK.....',
  '....KLLLLLlK....',
  '....KLLLLLlK....',
  '.....KKKKKK.....',
  '....KLLLLLlK....',
  '....KLLLLLlK....',
  '.....KKKKKK.....',
  '....KLLLLLlK....',
  '....KLLLLLlK....',
];
// Power-ups: boost berry (grow), heart (1-UP), chili pepper (fire)
const BERRY = [
  '................',
  '.......KK.......',
  '......KLLK......',
  '....KKLLLLKK....',
  '...KRRKLLKRRK...',
  '..KRRRRKKRRRRK..',
  '.KRRWRRRRRRRRRK.',
  '.KRWWRRYRRRRYRK.',
  '.KRRRRRRRRRRRrK.',
  '.KRRYRRRRYRRRrK.',
  '..KRRRRRRRRRrK..',
  '..KrRRYRRRYrrK..',
  '...KrRRRRRrrK...',
  '....KrrrrrrK....',
  '.....KKrrKK.....',
  '.......KK.......',
];
const HEART = [
  '................',
  '................',
  '..KKKK....KKKK..',
  '.KRRRRK..KRRRRK.',
  'KRWWRRRKKRRRRRrK',
  'KRWRRRRRRRRRRRrK',
  'KRRRRRRRRRRRRRrK',
  'KRRRRRRRRRRRRRrK',
  '.KRRRRRRRRRRRrK.',
  '..KRRRRRRRRRrK..',
  '...KRRRRRRRrK...',
  '....KRRRRRrK....',
  '.....KRRRrK.....',
  '......KRrK......',
  '.......KK.......',
  '................',
];
const PEPPER = [
  '................',
  '.........KK.....',
  '........KLLK....',
  '.......KLLK.....',
  '.....KKKLKKK....',
  '....KOOOOOOOK...',
  '...KOOWWOOOOK...',
  '...KOWOOOOOOK...',
  '..KOOOOOOOOK....',
  '..KOOOOOOOOK....',
  '..KOOOOOOOK.....',
  '.KOOOOOOOK......',
  '.KOOOOOOK.......',
  'KYOOOOKK........',
  'KYYKKK..........',
  'KK..............',
];

const ICEWAND = [
  '................',
  '..........K.....',
  '.........KWK....',
  '........KWWBK...',
  '..K....KWWBBBK..',
  '.KWK..KWWBWBbbK.',
  '..K....KBBBbbK..',
  '........KBbbK...',
  '.........KbK....',
  '........KKK.....',
  '.......KDdK.....',
  '......KYYK...K..',
  '.....KDdK...KWK.',
  '....KDdK.....K..',
  '...KDdK.........',
  '..KDdK..........',
];
const FEATHER = [
  '................',
  '..........KKKK..',
  '.........KgggVK.',
  '.......KKgggVLK.',
  '......KgggGVLLK.',
  '.....KgGGGVLLLK.',
  '....KgGGGVLLLK..',
  '....KgGGVLLLLK..',
  '...KggGVVLLLLK..',
  '...KgGVVLLLLK...',
  '...KgVVLLLLK....',
  '...KgVLLLLK.....',
  '..KVVLLLKK......',
  '..KVKKKK........',
  '.KVK............',
  '..K.............',
];
const VOLTORB = [
  '................',
  '.....KKKKKK.....',
  '...KKppppppKK...',
  '..KpppQQYWYppK..',
  '..KpQQQQWYPPpK..',
  '.KppQQQWYPPPppK.',
  '.KpQQQPWYYYPPpK.',
  '.KpQQPPPWYYPPpK.',
  '.KpQPPPPWYPPPpK.',
  '.KpPPPPWYPPPPpK.',
  '.KppPPWYPPPPppK.',
  '..KpPPYPPPPPpK..',
  '..KpppPPPPpppK..',
  '...KKppppppKK...',
  '.....KKKKKK.....',
  '................',
];
const MALLET = [
  '...KKKKKKKKKKK..',
  '..KLLLLLLLLLssK.',
  '..KLSSSSmSSSssK.',
  '..KLSSSSmSSSssK.',
  '..KLSSSSmSSSssK.',
  '..KLSSSSmSSSssK.',
  '..KsssssmsssssK.',
  '..KsssssssssssK.',
  '...KKKKKKKKKKK..',
  '........KDdK....',
  '.......KDdK.....',
  '......KDdK......',
  '.....KDdK.......',
  '....KDdK........',
  '...KDdK.........',
  '....KK..........',
];

function sprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const col = pal[rows[y][x]];
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return c;
}

const SPR = {};
const ENEMY_TINT = {   // acorn body colour per world
  meadow: { A: '#d19a5a', a: '#9a6232' },
  cave: { A: '#7d8fe0', a: '#4a5aa8' },
  sky: { A: '#a58be8', a: '#6a50b8' },
  ocean: { A: '#5fc9b8', a: '#2f8a80' },
  snow: { A: '#c9a27a', a: '#8a6440' },
  citadel: { A: '#c98a8a', a: '#8a4a5a' },
};
function buildSprites() {
  const smallSet = {}, bigSet = {}, fireSet = {}, hotSet = {};
  const smallTorso = { run0: 'runA', run1: 'runB', run2: 'runA', run3: 'runB' };
  for (const k of ['idle', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'skid']) {
    smallSet[k] = sprite(HEAD.concat(S_TORSO[smallTorso[k] || k], S_LEGS[k]), PAL_BOYO);
    const torso = k === 'jump' ? B_TORSO_JUMP : k.startsWith('run') ? B_TORSO_RUN : B_TORSO;
    const legs = B_LEGS[k === 'fall' ? 'idle' : k];
    bigSet[k] = sprite(HEAD.concat(torso, legs), PAL_BOYO);
    fireSet[k] = sprite(HEAD.concat(torso, legs), PAL_FIRE);
    hotSet[k] = sprite(HEAD.concat(torso, legs), PAL_HOT);
  }
  smallSet.crouch = sprite(HEAD.concat(S_CROUCH), PAL_BOYO);
  bigSet.crouch = sprite(HEAD.concat(B_CROUCH), PAL_BOYO);
  fireSet.crouch = sprite(HEAD.concat(B_CROUCH), PAL_FIRE);
  hotSet.crouch = sprite(HEAD.concat(B_CROUCH), PAL_HOT);
  smallSet.blink = sprite(HEAD_BLINK.concat(S_TORSO.idle, S_LEGS.idle), PAL_BOYO);
  bigSet.blink = sprite(HEAD_BLINK.concat(B_TORSO, B_LEGS.idle), PAL_BOYO);
  fireSet.blink = sprite(HEAD_BLINK.concat(B_TORSO, B_LEGS.idle), PAL_FIRE);
  hotSet.blink = hotSet.idle;
  SPR.small = smallSet; SPR.big = bigSet; SPR.fire = fireSet; SPR.hot = hotSet;
  SPR.suit = { fire: fireSet };
  for (const [name, pal] of Object.entries(SUIT_PALS)) {
    const set = {};
    for (const k of ['idle', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'skid']) {
      const torso = k === 'jump' ? B_TORSO_JUMP : k.startsWith('run') ? B_TORSO_RUN : B_TORSO;
      set[k] = sprite(HEAD.concat(torso, B_LEGS[k === 'fall' ? 'idle' : k]), pal);
    }
    set.crouch = sprite(HEAD.concat(B_CROUCH), pal);
    set.blink = sprite(HEAD_BLINK.concat(B_TORSO, B_LEGS.idle), pal);
    SPR.suit[name] = set;
  }
  SPR.die = sprite(HEAD_SHOCK.concat(S_DIE_BODY), PAL_BOYO);
  SPR.lifeIcon = sprite(HEAD, PAL_BOYO);

  SPR.grumblet = {}; SPR.grumbletB = {}; SPR.grumbletFlat = {};
  for (const th of Object.keys(ENEMY_TINT)) {
    const pal = Object.assign({ K: INK, W: '#fff6e0', D: '#3b2416', P: '#ff9aa2', C: '#7a4a24', c: '#4e2c16', L: '#a8703c' }, ENEMY_TINT[th]);
    SPR.grumblet[th] = sprite(GRUMBLET, pal);
    SPR.grumbletB[th] = sprite(withRows(GRUMBLET, 14, GRUMBLET_FEET_B), pal);
    SPR.grumbletFlat[th] = sprite(GRUMBLET.filter((_, i) => i % 2 === 1), pal);
  }
  const shellPal = { K: INK, G: '#7d8bd6', g: '#3f4a8f', L: '#b9c3f2', R: '#e9e1ff', S: '#ffb36b', W: '#ffffff', D: '#3a2a5a' };
  SPR.shellbackA = sprite(SHELLBACK, shellPal);
  SPR.shellbackB = sprite(withRows(SHELLBACK, 12, SHELLBACK_LEGS_B), shellPal);
  SPR.shell = sprite(SHELL, shellPal);
  SPR.shellB = sprite(SHELL_B, shellPal);
  const batPal = { K: INK, V: '#8a6bff', v: '#5233c4', W: '#ffffff', R: '#ff4d6d' };
  SPR.flutterUp = sprite(FLUTTER_UP, batPal);
  SPR.flutterDown = sprite(FLUTTER_DOWN, batPal);
  const vinePal = { K: INK, F: '#ff9a3c', f: '#c25a12', W: '#ffffff', M: '#3a0d1f', L: '#ffcf6a', l: '#d9952e' };
  SPR.vineOpen = sprite(VINE_OPEN.concat(VINE_STEM), vinePal);
  SPR.vineShut = sprite(VINE_SHUT.concat(VINE_STEM), vinePal);
  SPR.berry = sprite(BERRY, { K: INK, R: '#ff4d5e', r: '#b8263a', W: '#ffffff', Y: '#ffe08a', L: '#4cd17a' });
  SPR.heart = sprite(HEART, { K: INK, R: '#ff6aa8', r: '#c23a78', W: '#ffffff' });
  SPR.pepperA = sprite(PEPPER, { K: INK, O: '#ff3b2f', Y: '#ffb347', W: '#ffe0d0', L: '#4cd17a' });
  SPR.pepperB = sprite(PEPPER, { K: INK, O: '#ff6a2f', Y: '#ffd166', W: '#ffffff', L: '#4cd17a' });
  SPR.itemIce = sprite(ICEWAND, { K: INK, W: '#ffffff', B: '#9be8ff', b: '#3aa7e8', D: '#c98a4a', d: '#8a5a32', Y: '#ffd166' });
  SPR.itemGale = sprite(FEATHER, { K: INK, V: '#ffffff', G: '#9ae8a8', g: '#3fbf79', L: '#d8ffe4' });
  SPR.itemVolt = sprite(VOLTORB, { K: INK, P: '#5a2fb8', p: '#3a1c80', Q: '#8f6bff', Y: '#ffe14d', W: '#ffffff' });
  SPR.itemQuake = sprite(MALLET, { K: INK, S: '#a9a4bd', L: '#e2deef', s: '#6f6a88', m: '#ffd166', D: '#c98a4a', d: '#8a5a32' });
}

// Draw a sprite anchored at its bottom-centre, with optional flip / squash.
function drawSprite(ctx, img, cx, bottom, flip, sx = 1, sy = 1, vflip = false) {
  if (!flip && !vflip && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) {
    ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(bottom - img.height));
    return;
  }
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottom));
  ctx.scale(flip ? -sx : sx, vflip ? -sy : sy);
  ctx.drawImage(img, -img.width / 2, vflip ? 0 : -img.height);
  ctx.restore();
}

const THEMES = {
  meadow: {
    style: 'dirt', accent: '#7be08a',
    ground: ['#c47a48', '#8a4c2a', '#e6a771'], top: ['#5fd068', '#2f9a49', '#b6f59a'],
    brick: ['#c98a4a', '#7a4a24', '#e8b47c'], block: ['#d39a62', '#8a5530', '#f6cb98'],
    semi: ['#c08850', '#6b4224', '#e8b47c'], plat: ['#d39a62', '#6b4224', '#f6cb98'],
    castle: ['#d8a27a', '#7a4630', '#f3cba6'],
  },
  cave: {
    style: 'rock', accent: '#59e6d8',
    ground: ['#3a3478', '#221d4e', '#5a52a8'], top: ['#59e6d8', '#2a9c9a', '#c2fff7'],
    brick: ['#9a6a42', '#4e2e1a', '#c4935e'], block: ['#5a5ea8', '#2a2d62', '#9499e0'],
    semi: ['#a8744a', '#563820', '#d8a476'], plat: ['#7a5ad8', '#3a2580', '#b8a2ff'],
    castle: ['#6a78c8', '#2a3070', '#a6b2f0'],
  },
  sky: {
    style: 'cloud', accent: '#9fe3ff',
    ground: ['#e1eafb', '#aebedf', '#ffffff'], top: ['#ffffff', '#d5e1f6', '#ffffff'],
    brick: ['#e0aa5e', '#8a5a28', '#f6d699'], block: ['#cfc2ee', '#6a5a9a', '#f1ebff'],
    semi: ['#ffffff', '#a9b9de', '#ffffff'], plat: ['#e8dcff', '#7a68b0', '#ffffff'],
    castle: ['#d9cdf5', '#6a5a9a', '#ffffff'],
  },
  snow: {
    style: 'snow', accent: '#bfe9ff',
    ground: ['#5d6f99', '#3f4d75', '#8a9ac4'], top: ['#ffffff', '#bcd6f5', '#ffffff'],
    brick: ['#b08a6a', '#5a4030', '#d8c0a8'], block: ['#9fb8dc', '#4f6a9a', '#e0ecff'],
    semi: ['#e8f2ff', '#8aa8d0', '#ffffff'], plat: ['#cfe3ff', '#5f7aa8', '#ffffff'],
    castle: ['#9fb8dc', '#4f6a9a', '#e0ecff'],
  },
  ocean: {
    style: 'dirt', accent: '#5ef2e0',
    ground: ['#d9b77a', '#a07c45', '#f0d59a'], top: ['#f4dfa8', '#c9a96a', '#fff3cf'],
    brick: ['#b8a07e', '#6a5440', '#ddcaa8'], block: ['#5fb3b3', '#24686e', '#9fe0dc'],
    semi: ['#ff9a7a', '#9a4a3a', '#ffd0b8'], plat: ['#7fd1c7', '#2a6e6a', '#c9f5ef'],
    castle: ['#5fb3b3', '#24686e', '#9fe0dc'],
  },
  citadel: {
    style: 'stone', accent: '#ff8a3c',
    ground: ['#5a4663', '#2a1d33', '#8b7193'], top: ['#ff7a3c', '#a3361a', '#ffd08a'],
    brick: ['#8a5a3a', '#4a2a1a', '#b8845a'], block: ['#776a82', '#352b40', '#ab9db6'],
    semi: ['#80809a', '#3a3a52', '#b8b8d0'], plat: ['#8a8aa6', '#383850', '#c4c4dc'],
    castle: ['#6e5a76', '#2a1d33', '#a28aa8'],
  },
};

// ---- tiles ----------------------------------------------------------------
function rects(c, color, list) { c.fillStyle = color; for (const r of list) c.fillRect(r[0], r[1], r[2] || 1, r[3] || 1); }

// Puffy cloud edge: how many pixels each column is scalloped in by.
const CLOUD_EDGE = [3, 2, 1, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0, 1, 1, 2];
function paintGround(c, th, top, bottom) {
  const [b, d, l] = th.ground;
  c.fillStyle = b; c.fillRect(0, 0, 16, 16);
  if (th.style === 'cloud') {
    rects(c, d, [[3, 12, 4, 1], [11, 10, 3, 1], [12, 11, 2, 1], [7, 15, 3, 1], [1, 7, 1, 2]]);
    rects(c, l, [[2, 3, 4, 2], [9, 5, 3, 2], [5, 8, 2, 1], [12, 2, 2, 1]]);
    for (let x = 0; x < 16; x++) {
      if (top) { const e = CLOUD_EDGE[x]; c.clearRect(x, 0, 1, e); rects(c, th.top[2], [[x, e, 1, 2]]); }
      if (bottom) { const e = CLOUD_EDGE[(x + 7) % 16]; c.clearRect(x, 16 - e, 1, e); rects(c, d, [[x, 15 - e, 1, 1]]); }
    }
    return;
  }
  if (th.style === 'snow') {
    // frosty stone under a thick, lumpy snow cap
    rects(c, d, [[0, 10, 4, 3], [6, 3, 5, 2], [11, 9, 4, 3], [2, 5, 2, 2], [8, 13, 5, 2], [13, 1, 3, 2]]);
    rects(c, l, [[1, 1, 3, 1], [7, 8, 3, 1], [12, 6, 2, 1], [3, 12, 2, 1]]);
    if (top) {
      const drip = [1, 2, 3, 2, 1, 1, 2, 4, 2, 1, 1, 3, 2, 1, 2, 1];
      for (let x = 0; x < 16; x++) {
        c.fillStyle = th.top[1]; c.fillRect(x, 0, 1, 4 + drip[x] + 1);
        c.fillStyle = th.top[0]; c.fillRect(x, 0, 1, 4 + drip[x]);
      }
      rects(c, '#e6f2ff', [[2, 2, 3, 1], [9, 3, 4, 1]]);
    }
    return;
  }
  if (th.style === 'rock') {
    // irregular stone with the odd crystal fleck
    rects(c, d, [[0, 10, 4, 3], [6, 3, 5, 2], [11, 9, 4, 3], [2, 5, 2, 2], [8, 13, 5, 2], [13, 1, 3, 2], [5, 8, 1, 2]]);
    rects(c, l, [[1, 1, 3, 1], [7, 8, 3, 1], [12, 6, 2, 1], [3, 12, 2, 1], [9, 1, 1, 1]]);
    rects(c, '#5ef2ff', [[9, 11]]); rects(c, '#ff7ad9', [[4, 7]]);
  } else if (th.style === 'dirt') {
    rects(c, d, [[1, 6, 3, 2], [9, 2, 2, 2], [12, 9, 3, 2], [4, 12, 2, 2], [7, 8, 2, 1], [14, 14, 2, 1], [0, 1, 1, 2]]);
    rects(c, l, [[2, 5, 2], [9, 1, 2], [12, 8, 2], [4, 11], [11, 13], [6, 3]]);
  } else {
    rects(c, d, [[0, 7, 16], [0, 15, 16], [15, 0, 1, 7], [7, 8, 1, 7], [4, 3], [11, 11], [12, 4]]);
    rects(c, l, [[0, 0, 15], [0, 0, 1, 7], [0, 8, 7], [8, 8, 7], [8, 8, 1, 7]]);
  }
  if (!top) return;
  const [g, gd, gl] = th.top;
  if (th.style === 'dirt') {
    c.fillStyle = g; c.fillRect(0, 0, 16, 5);
    rects(c, gd, [[0, 5, 16], [1, 6], [4, 6, 1, 2], [6, 6], [10, 6, 2, 1], [13, 6, 1, 2], [3, 3], [9, 2], [14, 3]]);
    rects(c, gl, [[0, 0, 16], [3, 1, 2], [8, 1, 2], [12, 1, 2]]);
  } else {
    c.fillStyle = gd; c.fillRect(0, 0, 16, 3);
    c.fillStyle = g; c.fillRect(0, 0, 16, 2);
    rects(c, gd, [[2, 3, 1, 2], [6, 3], [9, 3, 1, 3], [13, 3, 1, 2]]);
    rects(c, gl, [[1, 0], [5, 0, 2], [11, 0], [14, 0]]);
  }
}
// Breakable blocks are wooden crates: a framed box of three planks with a diagonal brace.
function paintBrick(c, th) {
  const [b, d, l] = th.brick;   // plank, frame/seams, grain highlight
  c.fillStyle = '#2e1a0c'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = d; c.fillRect(1, 1, 14, 14);
  rects(c, l, [[1, 1, 14, 1], [1, 1, 1, 14]]);
  c.fillStyle = b; c.fillRect(3, 3, 10, 10);
  rects(c, d, [[3, 6, 10, 1], [3, 9, 10, 1]]);                          // plank seams
  rects(c, l, [[4, 4, 3, 1], [10, 4, 2, 1], [6, 7, 3, 1], [4, 10, 2, 1], [9, 11, 3, 1]]);   // grain
  for (let i = 0; i < 9; i++) rects(c, d, [[3 + i, 11 - i, 2, 1]]);        // diagonal brace
  for (let i = 0; i < 8; i++) rects(c, l, [[4 + i, 11 - i, 1, 1]]);
  rects(c, '#f3e2bd', [[2, 2], [13, 2], [2, 13], [13, 13]]);              // nails
}
// Mystery blocks: a rounded amber block with a four-point sparkle that twinkles (frames 0-2).
const SPARK = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'];
function paintQuestion(c, f) {
  const edge = '#7a3f12';
  c.fillStyle = edge; c.fillRect(1, 0, 14, 16); c.fillRect(0, 1, 16, 14);
  c.fillStyle = ['#ffb347', '#ffc062', '#ffcf80'][f]; c.fillRect(1, 1, 14, 14);
  rects(c, '#ffe2a8', [[2, 1, 12, 1], [1, 2, 1, 12]]);
  rects(c, '#e08a2a', [[2, 14, 12, 1], [14, 2, 1, 12]]);
  const col = ['#fff6dc', '#ffffff', '#ffffff'][f];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (SPARK[y][x] === '#') {
    rects(c, '#c46a1a', [[5 + x, 5 + y]]);
    rects(c, col, [[4 + x, 4 + y]]);
  }
  if (f === 2) rects(c, '#ffffff', [[3, 3], [12, 11]]);
}
function paintUsed(c) {
  c.fillStyle = '#4a2e1c'; c.fillRect(1, 0, 14, 16); c.fillRect(0, 1, 16, 14);
  c.fillStyle = '#a67c52'; c.fillRect(1, 1, 14, 14);
  rects(c, '#7a5535', [[2, 14, 12, 1], [14, 2, 1, 12]]);
  rects(c, '#c9a073', [[2, 1, 12, 1], [1, 2, 1, 12]]);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (SPARK[y][x] === '#') rects(c, '#8f6743', [[4 + x, 4 + y]]);
}
function paintSolid(c, th) {
  const [b, d, l] = th.block;
  c.fillStyle = d; c.fillRect(0, 0, 16, 16);
  c.fillStyle = b; c.fillRect(1, 1, 14, 14);
  rects(c, l, [[1, 1, 14, 2], [1, 1, 2, 14]]);
  rects(c, d, [[3, 13, 12, 2], [13, 3, 2, 12]]);
  rects(c, l, [[5, 5, 2], [5, 5, 1, 2]]);
}
// Hollow logs (stand-ins for tubes): cut-wood rim with rings and a dark hollow on top, grooved
// bark below, a tuft of moss on the rim.
const LOG = { o: '#2a160a', bark: '#8a5530', barkD: '#5a341a', barkL: '#b57a44', cut: '#f0c98a', ring: '#c4914f', hole: '#3a200c', moss: '#5fd068', mossD: '#2f9a49' };
function paintPipe(c, part) {
  const L = LOG;
  if (part === 'TL' || part === 'TR') {
    const left = part === 'TL';
    c.fillStyle = L.o; c.fillRect(0, 0, 16, 16);
    c.fillStyle = L.cut; c.fillRect(left ? 1 : 0, 1, 15, 5);
    c.fillStyle = L.hole; c.fillRect(left ? 6 : 0, 2, 10, 3);
    rects(c, L.ring, left ? [[3, 2, 1, 3], [1, 5, 15, 1]] : [[12, 2, 1, 3], [0, 5, 15, 1]]);
    c.fillStyle = L.bark; c.fillRect(left ? 1 : 0, 6, 15, 9);
    rects(c, L.barkD, left ? [[5, 7, 1, 8], [10, 6, 1, 6], [13, 9, 1, 6]] : [[2, 6, 1, 7], [7, 8, 1, 7], [12, 6, 1, 9]]);
    rects(c, L.barkL, left ? [[2, 6, 2, 9], [7, 9, 1, 4]] : [[4, 7, 1, 5]]);
    rects(c, L.mossD, left ? [[1, 0, 5, 1], [2, 1, 2, 1]] : [[9, 0, 5, 1], [11, 1, 2, 1]]);
    rects(c, L.moss, left ? [[2, 0, 3, 1]] : [[10, 0, 3, 1]]);
  } else if (part === 'L') {
    rects(c, L.o, [[2, 0, 1, 16]]); rects(c, L.bark, [[3, 0, 13, 16]]);
    rects(c, L.barkL, [[4, 0, 2, 16]]);
    rects(c, L.barkD, [[8, 0, 1, 9], [8, 12, 1, 4], [12, 3, 1, 13], [15, 0, 1, 6]]);
  } else {
    rects(c, L.bark, [[0, 0, 13, 16]]);
    rects(c, L.barkD, [[3, 0, 1, 11], [7, 4, 1, 12], [11, 0, 2, 16]]);
    rects(c, L.o, [[13, 0, 1, 16]]);
  }
}
function paintSemi(c, th) {
  const [b, d, l] = th.semi;
  c.fillStyle = d; c.fillRect(0, 0, 16, 6);
  c.fillStyle = b; c.fillRect(0, 1, 16, 4);
  rects(c, l, [[0, 1, 16]]);
  rects(c, d, [[7, 1, 1, 4], [15, 1, 1, 4], [2, 6, 3, 1], [3, 7, 2, 1], [4, 8, 1, 2], [11, 6, 3, 1], [11, 7, 2, 1], [11, 8, 1, 2]]);
}
function paintLava(c, f) {
  for (let x = 0; x < 16; x++) {
    const s = 4 + Math.round(Math.sin((x + f * 4) / 16 * Math.PI * 2) * 1.5);
    rects(c, '#ff6a1f', [[x, s, 1, 16 - s]]);
    rects(c, '#ffd27a', [[x, s]]);
    rects(c, '#d8361a', [[x, 11, 1, 5]]);
  }
  rects(c, '#ffe9a0', [[(f * 5) % 14 + 1, 8], [(f * 9 + 6) % 14 + 1, 12]]);
}
function paintCrumble(c) {
  c.fillStyle = '#9aa8cc'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#e6ecfb'; c.fillRect(1, 1, 14, 14);
  rects(c, '#ffffff', [[1, 1, 14, 1], [1, 1, 1, 14]]);
  rects(c, '#c3cde8', [[1, 14, 14, 1], [14, 1, 1, 14]]);
  // cracks
  rects(c, '#9aa8cc', [[4, 1, 1, 3], [5, 4, 1, 2], [4, 6, 1, 2], [11, 8, 1, 3], [10, 11, 1, 2], [12, 10, 2, 1], [7, 9, 2, 1]]);
}
function paintIce(c) {
  c.fillStyle = '#3f78b8'; c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#8fd0ff'; c.fillRect(1, 1, 14, 14);
  rects(c, '#b8e4ff', [[1, 1, 14, 3], [1, 1, 2, 14]]);
  rects(c, '#ffffff', [[1, 1, 14, 1], [3, 6, 1, 1], [4, 5, 1, 1], [5, 4, 1, 1], [9, 10, 1, 1], [10, 9, 1, 1], [11, 8, 1, 1]]);
  rects(c, '#5fa8e0', [[2, 14, 13, 1], [14, 2, 1, 13], [7, 11, 2, 1], [12, 5, 1, 2]]);
}
function paintLavaDeep(c) {
  c.fillStyle = '#d8361a'; c.fillRect(0, 0, 16, 16);
  rects(c, '#ff6a1f', [[2, 3, 3, 1], [10, 9, 3, 1]]);
}
// Pollen puffs (the collectible): a soft glowing fluff ball with fine fibres that slowly turn.
// Each world tints them: golden pollen, cave spores, sky fluff, sea spores, citadel embers.
const POLLEN_COL = { meadow: '#ffd166', cave: '#7ff0e2', sky: '#fff0a0', ocean: '#bffaff', citadel: '#ffb347' };
function drawPollen(ctx, x, y, t, col, k = 1) {
  x = Math.round(x); y = Math.round(y);
  ctx.globalAlpha = 0.22; blob(ctx, x, y, Math.round(7 * k), col);
  ctx.globalAlpha = 0.4; blob(ctx, x, y, Math.round(5 * k), col);
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + t * 0.02, r = (i % 2 ? 5 : 6) * k;
    ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
    ctx.fillRect(Math.round(x + Math.cos(a) * (r - 2)), Math.round(y + Math.sin(a) * (r - 2)), 1, 1);
  }
  blob(ctx, x, y, Math.max(2, Math.round(3 * k)), col);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2);
}

// Crumbly edges: copy a tile and chew its exposed sides (mask bits: 1 left, 2 right, 4 bottom)
// into a ragged, slightly damaged profile, with a darker rim and the odd crack so the terrain
// doesn't look razor cut. Variants are seeded, so a given spot always looks the same.
function chipTile(src, th, mask, seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const rng = mulberry32(seed), dark = th.ground[1];
  const profile = () => {
    const a = []; let d = rng() < 0.5 ? 0 : 1;
    for (let i = 0; i < 16; i++) {
      const r = rng(); d += r < 0.34 ? -1 : r < 0.68 ? 1 : 0;
      if (rng() < 0.14) d += 2;                       // the odd bigger bite
      d = Math.max(0, Math.min(4, d)); a.push(d);
    }
    return a;
  };
  const rim = (x, y) => { if (rng() < 0.85) { g.fillStyle = dark; g.fillRect(x, y, 1, 1); } };
  if (mask & 1) { const pr = profile(); for (let y = 0; y < 16; y++) { g.clearRect(0, y, pr[y], 1); rim(pr[y], y); if (rng() < 0.12) rim(pr[y] + 1 + (rng() < 0.5 ? 1 : 0), y); } }
  if (mask & 2) { const pr = profile(); for (let y = 0; y < 16; y++) { g.clearRect(16 - pr[y], y, pr[y], 1); rim(15 - pr[y], y); if (rng() < 0.12) rim(14 - pr[y] - (rng() < 0.5 ? 1 : 0), y); } }
  if (mask & 4) { const pr = profile(); for (let x = 0; x < 16; x++) { g.clearRect(x, 16 - pr[x], 1, pr[x]); rim(x, 15 - pr[x]); if (rng() < 0.12) rim(x, 14 - pr[x]); } }
  return c;
}
// Same idea for the wooden ledge tile: ragged, splintered ends.
function chipSemi(src, th, mask, seed) {
  const c = makeCanvas(16, 16), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const rng = mulberry32(seed), dark = th.semi[1];
  let d = rng() < 0.5 ? 0 : 1;
  const walk = () => { const r = rng(); d += r < 0.35 ? -1 : r < 0.7 ? 1 : 0; d = Math.max(0, Math.min(2, d)); return d; };
  if (mask & 1) { d = 1; for (let y = 0; y < 6; y++) { const k = walk(); g.clearRect(0, y, k, 1); if (k && rng() < 0.7) { g.fillStyle = dark; g.fillRect(k, y, 1, 1); } } }
  if (mask & 2) { d = 1; for (let y = 0; y < 6; y++) { const k = walk(); g.clearRect(16 - k, y, k, 1); if (k && rng() < 0.7) { g.fillStyle = dark; g.fillRect(15 - k, y, 1, 1); } } }
  return c;
}

const tilesetCache = new Map();
function getTileset(name) {
  if (tilesetCache.has(name)) return tilesetCache.get(name);
  const th = THEMES[name], set = {};
  const mk = (key, fn) => { const cv = makeCanvas(16, 16); fn(cv.getContext('2d')); set[key] = cv; };
  mk('ground', c => paintGround(c, th, false));
  mk('groundTop', c => paintGround(c, th, true));
  if (th.style === 'cloud') {
    mk('groundBot', c => paintGround(c, th, false, true));
    mk('groundBoth', c => paintGround(c, th, true, true));
  }
  mk('crumble', paintCrumble);
  mk('ice', paintIce);
  mk('brick', c => paintBrick(c, th));
  for (let f = 0; f < 3; f++) mk('q' + f, c => paintQuestion(c, f));
  mk('used', paintUsed);
  mk('solid', c => paintSolid(c, th));
  for (const p of ['TL', 'TR', 'L', 'R']) mk('pipe' + p, c => paintPipe(c, p));
  mk('semi', c => paintSemi(c, th));
  for (let f = 0; f < 4; f++) mk('lava' + f, c => paintLava(c, f));
  mk('lavaDeep', paintLavaDeep);
  // chipped variants, made on demand: set.chip('groundTop', mask, h) / set.chipSemi(mask, h)
  const chips = new Map();
  set.chip = (key, mask, h) => {
    const k = key + mask + '_' + (h & 3);
    if (!chips.has(k)) chips.set(k, chipTile(set[key], th, mask, hashStr(name + k)));
    return chips.get(k);
  };
  set.chipSemi = (mask, h) => {
    const k = 'semi' + mask + '_' + (h & 3);
    if (!chips.has(k)) chips.set(k, chipSemi(set.semi, th, mask, hashStr(name + k)));
    return chips.get(k);
  };
  tilesetCache.set(name, set);
  return set;
}

// ---- backgrounds (pre-rendered tileable parallax layers) -------------------
const BG_W = 512;
function bandSky(colors) {
  const c = makeCanvas(VIEW_W, VIEW_H), g = c.getContext('2d');
  const band = Math.ceil(VIEW_H / colors.length);
  colors.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * band, VIEW_W, band); });
  // 2-row dither between bands for a soft-but-pixel transition
  for (let i = 1; i < colors.length; i++) {
    g.fillStyle = colors[i];
    for (let x = 0; x < VIEW_W; x += 2) g.fillRect(x + (i % 2), i * band - 1, 1, 1);
    g.fillStyle = colors[i - 1];
    for (let x = 0; x < VIEW_W; x += 2) g.fillRect(x + ((i + 1) % 2), i * band, 1, 1);
  }
  return c;
}
function periodic(x, terms) {
  let v = 0;
  for (const [a, k, p] of terms) v += a * Math.sin((x / BG_W) * Math.PI * 2 * k + p);
  return v;
}
function ridgeLayer(baseY, terms, fill, edge, extra) {
  const c = makeCanvas(BG_W, VIEW_H), g = c.getContext('2d');
  for (let x = 0; x < BG_W; x++) {
    const top = Math.round(baseY - periodic(x, terms));
    g.fillStyle = fill; g.fillRect(x, top, 1, VIEW_H - top);
    if (edge) { g.fillStyle = edge; g.fillRect(x, top, 1, 2); }
    if (extra) extra(g, x, top);
  }
  return c;
}
function wrapDraw(g, w, fn) { fn(0); fn(-w); fn(w); }

const bgCache = new Map();
function getBackground(name) {
  if (bgCache.has(name)) return bgCache.get(name);
  let bg;
  const rng = mulberry32(hashStr(name));
  if (name === 'meadow') {
    const mountains = ridgeLayer(150, [[22, 2, 0.5], [12, 5, 1.7], [5, 11, 0.2]], '#a2b9e8', '#c9d8f6', (g, x, top) => {
      if (top < 112) { g.fillStyle = '#f2f6ff'; g.fillRect(x, top, 1, 4 + (x % 3)); }
    });
    const clouds = makeCanvas(BG_W, VIEW_H);
    {
      const g = clouds.getContext('2d');
      const list = [[40, 34, 1], [170, 60, 0.75], [300, 26, 1.15], [430, 52, 0.85]];
      for (const [cx, cy, s] of list) wrapDraw(g, BG_W, off => {
        const parts = [[0, 0, 12], [14, -5, 14], [30, 0, 11], [-12, 3, 8], [42, 4, 8]];
        for (const [dx, dy, r] of parts) blob(g, cx + off + dx * s, cy + dy * s + 2, Math.round(r * s), '#d6e9fb');
        for (const [dx, dy, r] of parts) blob(g, cx + off + dx * s, cy + dy * s, Math.round(r * s), '#ffffff');
      });
    }
    const hills = ridgeLayer(176, [[16, 3, 0], [9, 7, 2], [4, 13, 1]], '#58b96b', '#86dc8f', (g, x, top) => {
      if ((x * 7 + top) % 23 === 0) { g.fillStyle = '#3f9a55'; g.fillRect(x, top + 8 + (x % 11), 2, 2); }
    });
    bg = {
      sky: bandSky(['#4a9cf0', '#5aa9f2', '#6db6f4', '#82c3f6', '#99d0f8', '#b3ddfa', '#cde9fb']),
      layers: [{ c: mountains, f: 0.12 }, { c: clouds, f: 0.2, drift: 0.08 }, { c: hills, f: 0.4 }],
    };
  } else if (name === 'cave') {
    // pointed crystal prism; up = tip at the top (growing from below), otherwise hanging down
    const shard = (g, x, base, h, w, lean, cols, up) => {
      const tip = Math.max(3, Math.round(h * 0.3));
      for (let i = 0; i < h; i++) {
        const ww = i < tip ? Math.max(1, Math.round(w * (i + 1) / tip)) : w;
        const y = up ? base - h + i : base + h - 1 - i;
        const xo = Math.round(x + lean * (1 - i / h)) - (ww >> 1);
        g.fillStyle = cols[2]; g.fillRect(xo, y, ww, 1);
        g.fillStyle = cols[1]; g.fillRect(xo, y, Math.max(1, ww - Math.ceil(ww / 3)), 1);
        g.fillStyle = cols[0]; g.fillRect(xo, y, Math.max(1, Math.floor(ww / 3)), 1);
      }
    };
    const cluster = (g, x, base, sc, cols, up) => {
      for (const [dx, k, lean] of [[-1, 0.45, -6], [1.05, 0.4, 5], [-0.55, 0.65, -4], [0.6, 0.7, 3], [0, 1, 0]]) {
        shard(g, x + dx * 7 * sc, base, Math.round(26 * sc * k), Math.max(3, Math.round(7 * sc * k)), lean * sc, cols, up);
      }
    };
    // soft radial glow: stacked discs, each a little smaller and adding a little light
    const glowAt = (g, x, y, r, col, a) => { for (let k = 0; k < 6; k++) { g.globalAlpha = a * 0.45; blob(g, x, y, Math.max(1, Math.round(r * (1 - k * 0.16))), col); } g.globalAlpha = 1; };
    const CY = ['#bffaff', '#5ef2ff', '#2aa3c6'], MG = ['#ffd0f4', '#ff7ad9', '#b23aa0'], VI = ['#e0d0ff', '#a58bff', '#6a4fd0'], AM = ['#fff0c0', '#ffc75e', '#c27a1a'];
    const MUTE = ['#4d3d9e', '#382b80', '#271d5e'];
    // far: soft colour glows and giant dim crystal formations
    const far = makeCanvas(BG_W, VIEW_H);
    {
      const g = far.getContext('2d');
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(i * BG_W / 7 + rng() * 40), y = 50 + Math.floor(rng() * 110);
        wrapDraw(g, BG_W, off => glowAt(g, x + off, y, 30 + Math.floor(rng() * 20), [CY, MG, VI][i % 3][1], 0.05));
      }
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(i * BG_W / 5 + 30 + rng() * 30), sc = 1.8 + rng() * 1.2;
        wrapDraw(g, BG_W, off => cluster(g, x + off, VIEW_H - 14, sc, MUTE, true));
      }
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(i * BG_W / 4 + 70 + rng() * 30), sc = 1.2 + rng() * 0.8;
        wrapDraw(g, BG_W, off => cluster(g, x + off, 0, sc, MUTE, false));
      }
    }
    // mid: dark rock spires and stalactites studded with glowing crystal clusters
    const mid = makeCanvas(BG_W, VIEW_H);
    {
      const g = mid.getContext('2d');
      g.fillStyle = '#17113f';
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(i * BG_W / 6 + rng() * 40), w = 18 + Math.floor(rng() * 16), h = 50 + Math.floor(rng() * 60);
        wrapDraw(g, BG_W, off => { for (let y = 0; y < h; y++) { const ww = Math.max(2, Math.round(w * (0.35 + 0.65 * y / h))); g.fillRect(x + off - (ww >> 1), VIEW_H - h + y, ww, 1); } });
      }
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(i * BG_W / 8 + rng() * 30), w = 10 + Math.floor(rng() * 12), h = 20 + Math.floor(rng() * 45);
        wrapDraw(g, BG_W, off => { for (let y = 0; y < h; y++) { const ww = Math.max(1, Math.round(w * (1 - y / h))); g.fillRect(x + off - (ww >> 1), y, ww, 1); } });
      }
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(i * BG_W / 6 + rng() * 40), base = VIEW_H - 40 - Math.floor(rng() * 50), cols = [CY, MG, VI, AM][i % 4];
        wrapDraw(g, BG_W, off => { glowAt(g, x + off, base - 10, 20, cols[1], 0.08); cluster(g, x + off, base, 0.55 + rng() * 0.25, cols, true); });
      }
    }
    // near: rocky floor ridge with small bright crystals
    const near = ridgeLayer(204, [[8, 3, 0], [5, 8, 1], [3, 19, 2]], '#0e0a2a', '#1d1650', (g, x, top) => {
      if ((x * 11) % 47 === 0) { const cols = [CY, MG, VI][x % 3]; glowAt(g, x, top - 4, 9, cols[1], 0.1); shard(g, x, top + 1, 10 + (x % 7), 4, 0, cols, true); }
    });
    bg = { sky: bandSky(['#07051a', '#0b0824', '#110c30', '#170f3c', '#1d1348', '#231654', '#2a1a5e']), layers: [{ c: far, f: 0.08 }, { c: mid, f: 0.22 }, { c: near, f: 0.4 }] };
  } else if (name === 'snow') {
    // stars + rippling aurora
    const aurora = makeCanvas(BG_W, VIEW_H);
    {
      const g = aurora.getContext('2d');
      for (let i = 0; i < 70; i++) { g.fillStyle = rng() < 0.3 ? '#ffffff' : '#9fb8e8'; g.fillRect(Math.floor(rng() * BG_W), Math.floor(rng() * 110), 1, 1); }
      for (const [y0, amp, col, a] of [[38, 12, '#5ef2a0', 0.16], [58, 9, '#c77dff', 0.11]]) {
        for (let x = 0; x < BG_W; x++) {
          const y = Math.round(y0 + periodic(x, [[amp, 2, 0.3], [amp * 0.4, 5, 1.7]]));
          for (let k = 0; k < 22; k++) { g.globalAlpha = a * (1 - k / 22); g.fillStyle = col; g.fillRect(x, y + k, 1, 1); }
        }
      }
      g.globalAlpha = 1;
    }
    const peaks = ridgeLayer(150, [[26, 2, 0.8], [14, 5, 2.1], [6, 11, 0.4]], '#34466f', '#4a5f8f', (g, x, top) => {
      g.fillStyle = '#e8f2ff'; g.fillRect(x, top, 1, Math.max(2, Math.round((150 - top) * 0.35) + 3));
    });
    const pines = makeCanvas(BG_W, VIEW_H);
    {
      const g = pines.getContext('2d');
      // distant forest: tall, hazy blue-violet firs, much lower contrast than anything you can touch
      g.fillStyle = '#2b3d68'; g.fillRect(0, 205, BG_W, VIEW_H - 205);
      for (let i = 0; i < 15; i++) {
        const x = Math.floor(i * BG_W / 15 + rng() * 20), h = 46 + Math.floor(rng() * 40), base = 208;
        wrapDraw(g, BG_W, off => {
          for (let y = 0; y < h; y++) {
            const w = Math.max(1, Math.round((y / h) * 11 + ((y % 7) < 2 ? 1 : 0)));
            g.fillStyle = '#2b3d68'; g.fillRect(x + off - w, base - h + y, w * 2 + 1, 1);
            if (y % 7 === 0 && y > 2) { g.fillStyle = '#4a6598'; g.fillRect(x + off - w, base - h + y, w * 2 + 1, 1); }
          }
        });
      }
      for (let k = 0; k < 22; k++) { g.globalAlpha = 0.28 * (1 - k / 22); g.fillStyle = '#7f9bd0'; g.fillRect(0, 208 - k, BG_W, 1); }   // ground mist
      g.globalAlpha = 1;
    }
    bg = {
      sky: bandSky(['#0b1030', '#101a45', '#16285a', '#1d3a6e', '#244d80', '#2c6190', '#3a76a0']),
      layers: [{ c: aurora, f: 0.03, drift: 0.04 }, { c: peaks, f: 0.12 }, { c: pines, f: 0.35 }],
    };
  } else if (name === 'ocean') {
    const rays = makeCanvas(BG_W, VIEW_H);
    {
      const g = rays.getContext('2d');
      g.fillStyle = '#bff4ff';
      for (let i = 0; i < 6; i++) {
        const x0 = Math.floor(i * BG_W / 6 + rng() * 30), w = 10 + Math.floor(rng() * 14);
        wrapDraw(g, BG_W, off => {
          for (let y = 0; y < 150; y++) { g.globalAlpha = 0.09 * (1 - y / 150); g.fillRect(x0 + off + Math.floor(y * 0.35), y, w, 1); }
        });
      }
      g.globalAlpha = 1;
    }
    const far = ridgeLayer(176, [[18, 2, 0.4], [10, 5, 1.3], [5, 13, 2]], '#124a78', '#1a5a8a', (g, x, top) => {
      if ((x * 13) % 37 === 0) { g.fillStyle = '#145282'; for (let y = 0; y < 30 + (x % 20); y++) g.fillRect(x + Math.round(Math.sin(y * 0.2 + x) * 1.5), top - y, 2, 1); }
    });
    const reef = ridgeLayer(196, [[10, 3, 1], [6, 7, 0.3], [4, 17, 2.1]], '#0c3560', '#15477a', (g, x, top) => {
      if ((x * 7) % 29 === 0) {
        g.fillStyle = (x % 3) ? '#7a3a6a' : '#2f6a5a';
        const h = 10 + (x % 14);
        g.fillRect(x, top - h, 2, h); g.fillRect(x - 3, top - h + 3, 3, 2); g.fillRect(x + 2, top - h + 6, 3, 2);
      }
    });
    bg = {
      sky: bandSky(['#2a86c0', '#2476b0', '#1f67a0', '#1a5990', '#154b80', '#113e70', '#0d3262']),
      layers: [{ c: rays, f: 0.06, drift: 0.05 }, { c: far, f: 0.15 }, { c: reef, f: 0.35 }],
    };
  } else if (name === 'sky') {
    const sun = makeCanvas(BG_W, VIEW_H);
    {
      const g = sun.getContext('2d');
      g.globalAlpha = 0.12; blob(g, 96, 52, 44, '#fff6c8'); g.globalAlpha = 0.22; blob(g, 96, 52, 28, '#fff6c8'); g.globalAlpha = 1;
      blob(g, 96, 52, 18, '#fffbe6');
    }
    // distant floating islands: flat tops, tapering rocky undersides
    const isles = makeCanvas(BG_W, VIEW_H);
    {
      const g = isles.getContext('2d');
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(i * BG_W / 5 + rng() * 40), y = 70 + Math.floor(rng() * 60), w = 26 + Math.floor(rng() * 30);
        wrapDraw(g, BG_W, off => {
          g.fillStyle = '#8fb2e6';
          for (let j = 0; j < w / 2; j++) { const ww = Math.round(w * (1 - j / (w / 2))); g.fillRect(x + off + ((w - ww) >> 1), y + 4 + j, ww, 1); }
          g.fillStyle = '#b7d1f4'; g.fillRect(x + off, y, w, 5);
          g.fillStyle = '#d6e7fb'; g.fillRect(x + off, y, w, 1);
          g.fillStyle = '#8fb2e6';
          for (let k = 0; k < 2; k++) { const cx = x + off + 6 + k * (w - 14); g.fillRect(cx, y - 7, 3, 7); g.fillRect(cx - 1, y - 8, 5, 1); }
        });
      }
    }
    const cloudSea = (baseY, n, rMin, rMax, shade, fill) => {
      const c = makeCanvas(BG_W, VIEW_H), g = c.getContext('2d');
      g.fillStyle = fill; g.fillRect(0, baseY + 6, BG_W, VIEW_H - baseY);
      for (let i = 0; i < n; i++) {
        const x = Math.floor(i * BG_W / n + rng() * 12), r = rMin + Math.floor(rng() * (rMax - rMin)), y = baseY + Math.floor(rng() * 6);
        wrapDraw(g, BG_W, off => { blob(g, x + off, y + 2, r, shade); blob(g, x + off, y, r, fill); });
      }
      return c;
    };
    bg = {
      sky: bandSky(['#2f6fd6', '#3c80e0', '#4f93ea', '#66a8f2', '#84bdf7', '#a6d2fb', '#c8e5fd']),
      layers: [
        { c: sun, f: 0.02 }, { c: isles, f: 0.1 },
        { c: cloudSea(176, 22, 10, 18, '#c3d8f5', '#e4effd'), f: 0.25, drift: 0.04 },
        { c: cloudSea(198, 16, 12, 22, '#d6e4f8', '#ffffff'), f: 0.45, drift: 0.1 },
      ],
    };
  } else {
    const moon = makeCanvas(BG_W, VIEW_H);
    {
      const g = moon.getContext('2d');
      g.globalAlpha = 0.15; blob(g, 330, 62, 40, '#ff8a5a'); g.globalAlpha = 1;
      blob(g, 330, 62, 26, '#ffb38a'); blob(g, 322, 55, 5, '#e8906a'); blob(g, 340, 70, 7, '#e8906a'); blob(g, 336, 48, 3, '#e8906a');
    }
    const spires = makeCanvas(BG_W, VIEW_H);
    {
      const g = spires.getContext('2d');
      for (let i = 0; i < 9; i++) {
        const x = Math.floor(i * BG_W / 9 + rng() * 20), w = 14 + Math.floor(rng() * 14), h = 60 + Math.floor(rng() * 70);
        wrapDraw(g, BG_W, off => {
          g.fillStyle = '#2b0d1f'; g.fillRect(x + off, VIEW_H - h, w, h);
          for (let j = 0; j < w / 2 + 2; j++) g.fillRect(x + off + j, VIEW_H - h - (w / 2 + 2) + j, w - j * 2, 1);
          g.fillStyle = '#ff9a3c';
          for (let wy = VIEW_H - h + 14; wy < VIEW_H - 30; wy += 18) if (rng() < 0.7) g.fillRect(x + off + (w >> 1) - 1, wy, 2, 4);
        });
      }
    }
    const walls = makeCanvas(BG_W, VIEW_H);
    {
      const g = walls.getContext('2d');
      const top = 138;
      g.fillStyle = '#3d1426'; g.fillRect(0, top, BG_W, VIEW_H - top);
      for (let x = 0; x < BG_W; x += 16) g.fillRect(x, top - 8, 8, 8);
      g.fillStyle = '#2a0c1a';
      for (let x = 24; x < BG_W; x += 64) { g.fillRect(x, top + 22, 16, 30); for (let j = 0; j < 8; j++) g.fillRect(x + j / 2 + 0.5 | 0, top + 14 + j, 16 - (j | 0), 1); }
      g.fillStyle = '#4e1a30';
      for (let y = top + 6; y < VIEW_H; y += 10) for (let x = (y / 10 % 2) * 12; x < BG_W; x += 24) g.fillRect(x, y, 10, 1);
    }
    bg = { sky: bandSky(['#12050c', '#1c0812', '#2a0c18', '#3d1020', '#57161f', '#7a2318', '#a1361a']), layers: [{ c: moon, f: 0.03 }, { c: spires, f: 0.18 }, { c: walls, f: 0.42 }] };
  }
  bgCache.set(name, bg);
  return bg;
}
function drawBackground(ctx, name, cam, t) {
  const bg = getBackground(name);
  ctx.drawImage(bg.sky, 0, 0);
  for (const L of bg.layers) {
    const raw = -Math.round(cam * L.f + t * (L.drift || 0));
    const off = ((raw % BG_W) + BG_W) % BG_W;
    ctx.drawImage(L.c, off - BG_W, 0);
    ctx.drawImage(L.c, off, 0);
  }
}

// Where each stage treasure hovers (centre y), and its sparkle colours when grabbed.
// treasures stand on a 1-tile pedestal (row 11), so their tops are at 11 * TILE
const GOAL_Y = { snowflake: 11 * TILE - 30, flower: 11 * TILE - 34, geode: 11 * TILE - 26, feather: 11 * TILE - 34, pearl: 11 * TILE - 12, crystal: 150 };
const GOAL_FX = {
  flower: ['#ffd166', '#fff3b0', '#ff9a3c', '#7be08a', '#ffffff'],
  geode: ['#ff7ad9', '#c77dff', '#5ef2ff', '#ffffff', '#ffd0f4'],
  feather: ['#ffd166', '#ffffff', '#9fe3ff', '#fff3b0', '#ffb347'],
  snowflake: ['#ffffff', '#bfe9ff', '#8fd0ff', '#e6f6ff', '#c77dff'],
  pearl: ['#fff0fb', '#ffffff', '#ff9ad5', '#bffff6', '#e6d8ff'],
  crystal: ['#bffff6', '#5ef2ff', '#ffffff', '#ff7ad9', '#ffd166'],
};

// Height in px of the decorative cave ceiling at world x.
const caveCeilingH = x => 16 + Math.round(Math.sin(x * 0.07) * 4 + Math.sin(x * 0.19 + 1) * 2 + Math.sin(x * 0.013) * 5);

// ═══════════════════════════════════════════════════════════════════════════
// 7. LEVEL COMPILER — turns registry data into a tile grid
// ═══════════════════════════════════════════════════════════════════════════
class Level {
  constructor(def) {
    this.def = def;
    this.w = def.width;
    this.themeName = def.theme;
    this.theme = THEMES[def.theme];
    this.tiles = new Uint8Array(this.w * ROWS);
    this.multi = new Map();
    this.powerKinds = new Map();   // power-up block kinds ('ice', 'gale', ..., 'rand'); unlisted = chili
    this.crumbles = new Map();
    this.water = def.water || null;
    this.bumps = [];
    for (const cmd of def.map) this.apply(cmd);
    const g = def.goal;
    if (g.type === 'crystal' && !g.boss) for (let i = -1; i <= 1; i++) this.set(g.x + i, 11, T.SOLID);
    else if (g.type !== 'crystal') for (let i = -1; i <= 1; i++) this.set(g.x + i, 11, T.PEDESTAL);   // drawn by drawPedestal
    this.goalY = GOAL_Y[g.type] || 150;
    this.crystalOn = !g.boss;
    this.crystalX = g.x * TILE + 8;
    this.goalLine = (g.x - 1) * TILE;
    this.genDecor();
  }
  apply(cmd) {
    const [op, ...a] = cmd;
    switch (op) {
      case 'ground': { const [x0, x1, top = 12] = a; for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) this.set(x, y, T.GROUND); break; }
      case 'row': { const [x, y, s] = a; for (let i = 0; i < s.length; i++) { const t = TILE_CHARS[s[i]]; if (t !== undefined) this.set(x + i, y, t); } break; }
      case 'rect': { const [x0, y0, x1, y1, ch] = a; const t = TILE_CHARS[ch] || 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t); break; }
      case 'pipe': {
        const [x, h] = a, top = 12 - h;
        this.set(x, top, T.PIPE_TL); this.set(x + 1, top, T.PIPE_TR);
        for (let y = top + 1; y < 12; y++) { this.set(x, y, T.PIPE_L); this.set(x + 1, y, T.PIPE_R); }
        break;
      }
      case 'stairs': { const [x, n, dir] = a; for (let i = 0; i < n; i++) { const hgt = dir > 0 ? i + 1 : n - i; for (let y = 12 - hgt; y < 12; y++) this.set(x + i, y, T.SOLID); } break; }
      case 'coins': { const [x, y, n] = a; for (let i = 0; i < n; i++) this.set(x + i, y, T.COIN); break; }
      case 'power': { const [x, y, kind] = a; this.set(x, y, T.QPOW); this.powerKinds.set(y * this.w + x, kind); break; }
      case 'lava': { const [x0, x1] = a; for (let x = x0; x <= x1; x++) this.set(x, 13, T.LAVA); break; }
      default: console.warn('BOYO: unknown map command', op);
    }
  }
  set(x, y, t) { if (x >= 0 && x < this.w && y >= 0 && y < ROWS) this.tiles[y * this.w + x] = t; }
  get(x, y) { return x < 0 || x >= this.w || y < 0 || y >= ROWS ? 0 : this.tiles[y * this.w + x]; }
  solid(x, y) {
    if (x < 0 || x >= this.w) return true;      // level edges are walls
    if (y < 0 || y >= ROWS) return false;
    return SOLID[this.tiles[y * this.w + x]] === 1;
  }
  surfaceRow(x) { for (let y = 1; y < ROWS; y++) if (this.solid(x, y) && !this.solid(x, y - 1)) return y; return ROWS; }
  genDecor() {
    const rng = mulberry32(hashStr(this.def.id));
    const d = this.decor = [];
    const theme = this.themeName;
    for (let x = 1; x < this.w - 1; x++) {
      if (this.def.goal && Math.abs(x - this.def.goal.x) < 11 && x > this.def.goal.x - 2) continue;
      for (let y = 2; y < ROWS; y++) {
        if (this.get(x, y) !== T.GROUND || this.get(x, y - 1) !== T.EMPTY) continue;
        const r = rng();
        if (theme === 'meadow') {
          if (r < 0.07 && this.get(x + 1, y) === T.GROUND && this.get(x + 2, y) === T.GROUND && !this.get(x + 1, y - 1) && !this.get(x + 2, y - 1)) { d.push({ k: 'bush', x: x * TILE, y: y * TILE, s: rng() }); x += 3; }
          else if (r < 0.2) d.push({ k: 'flower', x: x * TILE + Math.floor(rng() * 10), y: y * TILE, c: ['#ff7aa8', '#fff1a8', '#ffffff', '#b4a2ff'][Math.floor(rng() * 4)] });
          else if (r < 0.32) d.push({ k: 'tuft', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        } else if (theme === 'cave') {
          if (r < 0.15) d.push({ k: 'crystal', x: x * TILE + Math.floor(rng() * 8) + 2, y: y * TILE, c: ['#5ef2ff', '#5ef2ff', '#ff7ad9', '#a58bff', '#ffc75e'][Math.floor(rng() * 5)], p: rng() * 6, s: rng() < 0.3 ? 2 : 1 });
          else if (r < 0.2) d.push({ k: 'shroomlet', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        } else if (theme === 'snow') {
          if (r < 0.06) d.push({ k: 'pine', x: x * TILE + Math.floor(rng() * 8), y: y * TILE, h: 24 + Math.floor(rng() * 12) });
          else if (r < 0.16) d.push({ k: 'snowtuft', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        } else if (theme === 'ocean') {
          if (r < 0.14) d.push({ k: 'weed', x: x * TILE + Math.floor(rng() * 10), y: y * TILE, h: 10 + Math.floor(rng() * 22), p: rng() * 6, c: rng() < 0.5 ? '#2f9a6a' : '#4cc28a' });
          else if (r < 0.22) d.push({ k: 'coral', x: x * TILE + 4, y: y * TILE, c: ['#ff7a8a', '#ffa25a', '#c77dff'][Math.floor(rng() * 3)] });
          else if (r < 0.27) d.push({ k: 'star', x: x * TILE + Math.floor(rng() * 10), y: y * TILE, c: rng() < 0.5 ? '#ff8a5a' : '#ffd166' });
        } else if (theme === 'sky') {
          if (r < 0.05) d.push({ k: 'ruin', x: x * TILE + 4, y: y * TILE, h: 6 + Math.floor(rng() * 10) });
          else if (r < 0.16) d.push({ k: 'flower', x: x * TILE + Math.floor(rng() * 10), y: y * TILE + 2, c: rng() < 0.5 ? '#fff1a8' : '#b4a2ff' });
        } else {
          if (r < 0.06) d.push({ k: 'torch', x: x * TILE + 6, y: y * TILE, p: rng() * 6 });
          else if (r < 0.14) d.push({ k: 'rubble', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        }
        break;
      }
      if (this.def.ceiling && rng() < 0.45) {
        const sx = x * TILE + Math.floor(rng() * 10) + 2;
        if (rng() < 0.3) d.push({ k: 'hangcrystal', x: sx, y: caveCeilingH(sx), len: 6 + Math.floor(rng() * 8), c: ['#5ef2ff', '#ff7ad9', '#a58bff'][Math.floor(rng() * 3)], p: rng() * 6 });
        else d.push({ k: 'stalactite', x: sx, y: caveCeilingH(sx) - 1, len: 5 + Math.floor(rng() * 14) });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. ENTITIES
// ═══════════════════════════════════════════════════════════════════════════
// Axis-separated tile collision. Moves are always < 1 tile per frame, so only the
// leading edge needs checking — no tunnelling is possible.
function sweepX(lv, e, dx) {
  if (!dx) return 0;
  e.x += dx;
  const top = Math.floor(e.y / TILE), bot = Math.floor((e.y + e.h - 0.01) / TILE);
  if (dx > 0) {
    const c = Math.floor((e.x + e.w - 0.01) / TILE);
    for (let r = top; r <= bot; r++) if (lv.solid(c, r)) { e.x = c * TILE - e.w; return 1; }
  } else {
    const c = Math.floor(e.x / TILE);
    for (let r = top; r <= bot; r++) if (lv.solid(c, r)) { e.x = (c + 1) * TILE; return -1; }
  }
  return 0;
}
function sweepY(lv, e, dy) {
  const prevBottom = e.y + e.h;
  e.y += dy;
  const c0 = Math.floor(e.x / TILE), c1 = Math.floor((e.x + e.w - 0.01) / TILE);
  if (dy > 0) {
    const r = Math.floor((e.y + e.h) / TILE);
    for (let c = c0; c <= c1; c++) {
      if (lv.solid(c, r) || (lv.get(c, r) === T.SEMI && prevBottom <= r * TILE + 0.5)) { e.y = r * TILE - e.h; return 1; }
    }
  } else if (dy < 0) {
    const r = Math.floor(e.y / TILE);
    for (let c = c0; c <= c1; c++) if (lv.solid(c, r)) { e.y = (r + 1) * TILE; return -1; }
  }
  return 0;
}

class Enemy {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.t = 0;
    this.dead = false; this.remove = false; this.flipped = false; this.deadT = 0;
    this.stompable = true; this.fireKill = true; this.shellKill = true; this.bumpKill = true;
    this.walker = false; this.onGround = false;
  }
  get cx() { return this.x + this.w / 2; }
  hitbox() { return this; }
  touches(p) { const b = this.hitbox(); return !!b && overlap(b, p); }
  onTouch(g, p) {
    if (this.stompable && g.isStomp(p, this)) this.stomp(g, p);
    else g.hurtPlayer();
  }
  stomp(g, p) { this.flipKill(g, 0); g.bounce(p); g.stompScore(this); Sound.play('stomp'); }
  flipKill(g, dir) {
    this.dead = true; this.flipped = true; this.deadT = 0;
    this.vy = -4.5; this.vx = dir * 1.2;
  }
  updateDead() {
    this.deadT++;
    if (this.flipped) {
      this.vy = Math.min(this.vy + 0.3, 6);
      this.x += this.vx; this.y += this.vy;
      if (this.y > VIEW_H + 32) this.remove = true;
    } else if (this.deadT > 30) this.remove = true;
  }
  walk(g, smart) {
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx;
    const r = sweepY(lv, this, this.vy);
    if (r === 1) {
      this.vy = 0; this.onGround = true;
      if (smart && this.vx) {
        const ac = this.vx > 0 ? Math.floor((this.x + this.w + 1) / TILE) : Math.floor((this.x - 1) / TILE);
        const br = Math.floor((this.y + this.h + 1) / TILE);
        if (!lv.solid(ac, br) && lv.get(ac, br) !== T.SEMI) this.vx = -this.vx;
      }
    } else {
      this.onGround = false;
      if (r === -1) this.vy = 0;
    }
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 160) this.remove = true;
  }
}

class Grumblet extends Enemy {
  constructor(col, row, theme) {
    super(col * TILE + 1, (row + 1) * TILE - 15, 14, 15);
    this.vx = -0.5; this.walker = true; this.theme = theme;
  }
  update(g) { this.t++; this.walk(g, false); }
  stomp(g, p) {
    this.dead = true; this.squashed = true; this.deadT = 0; this.vx = 0;
    g.bounce(p); g.stompScore(this); Sound.play('stomp');
    g.dust(this.cx, this.y + this.h, 6); g.shake = Math.max(g.shake, 1.5);
  }
  draw(ctx) {
    if (this.squashed) { drawSprite(ctx, SPR.grumbletFlat[this.theme], this.cx, this.y + this.h, false); return; }
    // step the feet; face the way it's walking (no flipping back and forth)
    const img = Math.floor(this.t / 10) % 2 ? SPR.grumbletB[this.theme] : SPR.grumblet[this.theme];
    drawSprite(ctx, img, this.cx, this.y + this.h, this.vx < 0, 1, 1, this.flipped);
  }
}

class Shellback extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 15, 14, 15);
    this.vx = -0.55; this.walker = true; this.state = 'walk'; this.shellT = 0; this.grace = 0; this.combo = 0;
  }
  update(g) {
    this.t++;
    if (this.grace > 0) this.grace--;
    if (this.state === 'held') { this.updateHeld(g); return; }
    if (this.state === 'toss') {
      // thrown straight up: flies with gravity, lands as a resting shell
      const lv = g.level;
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) this.vx = -this.vx * 0.5;
      const r = sweepY(lv, this, this.vy);
      if (r === 1) { this.state = 'shell'; this.walker = true; this.vx = 0; this.vy = 0; }
      else if (r === -1) this.vy = 0.5;
      if (this.y > VIEW_H + 32) this.remove = true;
      return;
    }
    if (this.state === 'walk') this.walk(g, true);
    else if (this.state === 'shell') {
      this.vx = 0;
      this.walk(g, false);
      if (++this.shellT > 480) {
        this.state = 'walk';
        this.vx = g.player.x + g.player.w / 2 < this.cx ? -0.55 : 0.55;
      }
    } else {
      const lv = g.level;
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) {
        this.vx = -this.vx;
        if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('bump');
      }
      if (sweepY(lv, this, this.vy)) this.vy = 0;
      if (this.y > VIEW_H + 32 || this.x > g.camX + VIEW_W + 64 || this.x + this.w < g.camX - 64) this.remove = true;
    }
  }
  // Carrying (hold run on a resting shell). The shell rides in front of the player and is
  // thrown when run is released: kick by default, straight up with up held, set down with down.
  holdPos(p) {
    this.x = p.facing > 0 ? p.x + p.w - 5 : p.x - this.w + 5;
    this.y = p.y + p.h - this.h - (p.power ? 7 : 2);
  }
  updateHeld(g) {
    const p = g.player;
    this.shellT++;
    if (p.state !== 'play') { g.dropHeld(); return; }
    this.holdPos(p);
    if (this.shellT > 480) {          // the turtle wakes up in the player's hands
      g.held = null;
      this.state = 'walk'; this.walker = true; this.vx = p.facing * 0.55; this.y = p.y + p.h - this.h;
      g.hurtPlayer();
      return;
    }
    if (!Input.down('run')) g.throwHeld();
  }
  kick(g, p) {
    const dir = p.x + p.w / 2 < this.cx ? 1 : -1;
    this.state = 'slide'; this.walker = false; this.grace = 12; this.combo = 0;
    this.vx = 3.8 * dir;
    sweepX(g.level, this, dir > 0 ? (p.x + p.w) - this.x + 1 : (p.x - this.w) - this.x - 1);
    Sound.play('kick');
    g.addScore(400, this.cx, this.y);
  }
  onTouch(g, p) {
    const stomp = g.isStomp(p, this);
    if (this.state === 'walk') {
      if (stomp) {
        this.state = 'shell'; this.vx = 0; this.shellT = 0;
        g.bounce(p); g.stompScore(this); Sound.play('stomp'); g.dust(this.cx, this.y + this.h, 5);
      } else g.hurtPlayer();
    } else if (this.state === 'shell') {
      if (this.grace > 0) return;
      if (!stomp && Input.down('run') && !g.held) g.pickUp(this);
      else { this.kick(g, p); if (stomp) g.bounce(p); }
    } else if (this.state === 'toss') {
      if (Input.down('run') && !g.held) g.pickUp(this);   // catch it on the way down
    } else if (this.grace <= 0) {
      if (stomp) {
        this.state = 'shell'; this.walker = true; this.vx = 0; this.shellT = 0;
        g.bounce(p); g.addScore(100, this.cx, this.y); Sound.play('stomp');
      } else g.hurtPlayer();
    }
  }
  touches(p) { return this.state !== 'held' && super.touches(p); }
  draw(ctx) {
    if (this.state === 'walk' && !this.dead) {
      const img = Math.floor(this.t / 9) % 2 ? SPR.shellbackB : SPR.shellbackA;
      drawSprite(ctx, img, this.cx, this.y + this.h, this.vx < 0);
    } else {
      const shake = (this.state === 'shell' || this.state === 'held') && this.shellT > 400 ? (Math.floor(this.t / 2) % 2 ? 1 : -1) : 0;
      const rolling = (this.state === 'slide' || this.state === 'toss') && Math.floor(this.t / 3) % 2;
      drawSprite(ctx, rolling ? SPR.shellB : SPR.shell, this.cx + shake, this.y + this.h, this.vx < 0, 1, 1, this.flipped);
    }
  }
}

class Spikelet extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 14, 14, 14);
    this.vx = -0.6; this.walker = true; this.stompable = false;
  }
  update(g) { this.t++; this.walk(g, false); }
  // A grumpy hedgehog whose back is a fan of big outlined spikes with red danger tips, so it
  // reads instantly as "don't stomp me".
  draw(ctx) {
    const f = this.vx < 0 ? -1 : 1, step = (this.t >> 3) % 2;
    const by = Math.round(this.y + this.h + 1), cx = Math.round(this.cx);
    if (this.flipped) { ctx.save(); ctx.translate(0, by * 2 - this.h); ctx.scale(1, -1); }
    const bx = cx - f, bcy = by - 7;
    // spikes: fanned over the back (behind the head), outline first, then shaft + tip
    const bristle = (this.t >> 4) % 2;
    const spikes = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 - f * (-0.4 + i * 0.52);           // from just above the head, sweeping back
      spikes.push([a, 14 + (i % 2) + (i === 5 ? -2 : 0) + bristle]);
    }
    // each spike tapers from a thick base at the body edge to a sharp point
    const width = (k, len) => (k < len - 5 ? 2 : k < len - 1 ? 1 : 0);
    for (const [a, len] of spikes) for (let k = 5; k <= len; k++) {
      const px = Math.round(bx + Math.cos(a) * k), py = Math.round(bcy + Math.sin(a) * k), w = width(k, len);
      ctx.fillStyle = INK; ctx.fillRect(px - w - 1, py - w - 1, w * 2 + 3, w * 2 + 3);
    }
    for (const [a, len] of spikes) for (let k = 5; k <= len; k++) {
      const px = Math.round(bx + Math.cos(a) * k), py = Math.round(bcy + Math.sin(a) * k), w = width(k, len);
      ctx.fillStyle = k >= len - 2 ? '#ff4d6d' : '#fff3d6';
      ctx.fillRect(px - w, py - w, w * 2 + 1, w * 2 + 1);
      if (w > 1) { ctx.fillStyle = '#d9c4ff'; ctx.fillRect(px + 1, py - 1, 1, 3); }
    }
    // feet
    ctx.fillStyle = INK; ctx.fillRect(bx - 5 + step, by - 3, 4, 3); ctx.fillRect(bx + 2 - step, by - 3, 4, 3);
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(bx - 4 + step, by - 3, 2, 2); ctx.fillRect(bx + 3 - step, by - 3, 2, 2);
    // body
    blob(ctx, bx, bcy, 7, INK); blob(ctx, bx, bcy, 6, '#7a4fd0'); blob(ctx, bx - f * 2, bcy - 2, 3, '#9a74e8');
    // snout, nose, eye, brow
    const sx = bx + f * 6, sy = by - 5;
    blob(ctx, sx, sy, 3, INK); blob(ctx, sx, sy, 2, '#ffcf9a');
    ctx.fillStyle = '#ff6a8a'; ctx.fillRect(sx + f * 3 - (f < 0 ? 1 : 0), sy - 1, 2, 2);
    const ex = bx + f * 3 - (f < 0 ? 1 : 0), ey = by - 10;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(ex, ey, 2, 3);
    ctx.fillStyle = INK; ctx.fillRect(ex + (f > 0 ? 1 : 0), ey + 1, 1, 2); ctx.fillRect(ex - 1, ey - 1, 4, 1);
    if (this.flipped) ctx.restore();
  }
}

class Flutter extends Enemy {
  constructor(col, row, hang) {
    super(col * TILE + 1, row * TILE + 2, 14, 11);
    this.hang = hang; this.state = 'idle'; this.baseY = this.y; this.dir = -1;
  }
  update(g) {
    this.t++;
    const p = g.player, pcx = p.x + p.w / 2;
    if (this.state === 'idle') {
      if (!this.hang) this.y = this.baseY + Math.sin(this.t * 0.05) * 3;
      if (Math.abs(pcx - this.cx) < 120) { this.state = 'fly'; this.dir = pcx < this.cx ? -1 : 1; this.t = 0; }
      return;
    }
    this.vx = this.dir * 1.0;
    this.x += this.vx;
    const ty = clamp(p.y + p.h / 2 - 8, 40, 176);
    this.baseY += clamp(ty - this.baseY, -0.7, 0.7);
    this.y = this.baseY + Math.sin(this.t * 0.09) * 12;
    if ((this.dir > 0 && this.cx - pcx > 90) || (this.dir < 0 && pcx - this.cx > 90)) this.dir = -this.dir;
    if (this.x + this.w < g.camX - 160) this.remove = true;
  }
  draw(ctx) {
    if (this.state === 'idle' && this.hang) { drawSprite(ctx, SPR.flutterDown, this.cx, this.y + this.h, false, 1, 1, true); return; }
    const img = Math.floor(this.t / 6) % 2 ? SPR.flutterDown : SPR.flutterUp;
    drawSprite(ctx, img, this.cx, this.y + this.h, this.dir > 0, 1, 1, this.flipped);
  }
}

class Snapvine extends Enemy {
  constructor(pipeCol, topRow) {
    super(pipeCol * TILE + 8, topRow * TILE, 16, 24);
    this.baseY = topRow * TILE; this.off = 24; this.state = 'wait'; this.timer = 60;
    this.stompable = false; this.bumpKill = false; this.behindTiles = true;
  }
  update(g) {
    this.t++;
    const p = g.player;
    switch (this.state) {
      case 'wait':
        if (--this.timer <= 0) {
          if (Math.abs(p.x + p.w / 2 - (this.x + 8)) < 30) this.timer = 30;
          else this.state = 'up';
        }
        break;
      case 'up': this.off -= 0.75; if (this.off <= 0) { this.off = 0; this.state = 'out'; this.timer = 80; } break;
      case 'out': if (--this.timer <= 0) this.state = 'down'; break;
      case 'down': this.off += 0.75; if (this.off >= 24) { this.off = 24; this.state = 'wait'; this.timer = 80; } break;
    }
    this.y = this.baseY - 24 + this.off;
  }
  hitbox() {
    if (this.off >= 21) return null;
    const top = this.y + 2;
    return { x: this.x + 3, y: top, w: 10, h: this.baseY - top };
  }
  draw(ctx) { drawSprite(ctx, Math.floor(this.t / 10) % 2 ? SPR.vineOpen : SPR.vineShut, this.x + 8, this.y + 24, false, 1, 1, this.flipped); }
}

class Firebar extends Enemy {
  constructor(col, row, len, speed) {
    super(col * TILE, row * TILE, 16, 16);
    this.px = col * TILE + 8; this.py = row * TILE + 8; this.len = len; this.speed = speed;
    this.a = -Math.PI / 2;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update() { this.t++; this.a += this.speed; }
  hitbox() { return null; }
  touches(p) {
    const bx0 = p.x + 2, by0 = p.y + 2, bx1 = p.x + p.w - 2, by1 = p.y + p.h - 2;
    for (let i = 1; i < this.len; i++) {
      const x = this.px + Math.cos(this.a) * i * 8, y = this.py + Math.sin(this.a) * i * 8;
      const nx = clamp(x, bx0, bx1), ny = clamp(y, by0, by1);
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < 12) return true;
    }
    return false;
  }
  onTouch(g) { g.hurtPlayer(); }
  draw(ctx) {
    for (let i = 0; i < this.len; i++) {
      const x = this.px + Math.cos(this.a) * i * 8, y = this.py + Math.sin(this.a) * i * 8;
      blob(ctx, x, y, 4, (this.t + i) % 6 < 3 ? '#ff6a1f' : '#ff8a2a');
      blob(ctx, x, y, 2, '#ffe08a');
    }
  }
}

class Ember extends Enemy {
  constructor(col) {
    super(col * TILE + 2, VIEW_H + 8, 12, 14);
    this.baseY = VIEW_H + 8; this.wait = 20 + (col * 37) % 70;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    if (this.wait > 0) {
      if (--this.wait === 0) {
        this.vy = -7.2;
        if (this.x > g.camX && this.x < g.camX + VIEW_W) Sound.play('sizzle');
      }
      return;
    }
    this.vy += 0.25;
    this.y += this.vy;
    if (this.vy < 0 && this.t % 3 === 0) g.spark(this.x + 6 + rand(-3, 3), this.y + 14, '#ff8a2a', 18);
    if (this.y >= this.baseY && this.vy > 0) { this.y = this.baseY; this.vy = 0; this.wait = 110; }
  }
  hitbox() { return this.y < VIEW_H ? { x: this.x + 1, y: this.y + 1, w: 10, h: 12 } : null; }
  draw(ctx) {
    if (this.y >= VIEW_H) return;
    const cx = this.x + 6, cy = this.y + 7, down = this.vy > 0;
    blob(ctx, cx, cy + (down ? -6 : 6), 3, '#ff6a1f');
    blob(ctx, cx, cy, 6, '#e8401a');
    blob(ctx, cx, cy, 5, '#ff8a2a');
    blob(ctx, cx, cy - (down ? -1 : 1), 3, '#ffe08a');
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(cx - 3), Math.round(cy - 1), 2, 2);
    ctx.fillRect(Math.round(cx + 1), Math.round(cy - 1), 2, 2);
  }
}

// ── Ocean world ─────────────────────────────────────────────────────────────
// Fish: swims left at a steady pace; red ones weave up and down. Warm colours and a
// thick outline so they read clearly against the blue water.
class Finlet extends Enemy {
  constructor(col, row, kind) {
    super(col * TILE, row * TILE + 1, 20, 14);
    this.red = kind === 'red'; this.vx = this.red ? -0.85 : -0.6; this.baseY = this.y;
    this.stompable = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    this.x += this.vx;
    this.y = this.baseY + (this.red ? Math.sin(this.t * 0.045) * 16 : Math.sin(this.t * 0.08) * 2);
    if (this.x + this.w < g.camX - 64) this.remove = true;
  }
  hitbox() { return { x: this.x + 2, y: this.y + 2, w: this.w - 5, h: this.h - 4 }; }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), flap = (this.t >> 3) % 2, cx = x + 8, cy = y + 7;
    const [back, base, belly, fin] = this.red
      ? ['#b3123a', '#ff3b5c', '#ffb3c0', '#7a0f2a']
      : ['#d9600a', '#ffa31a', '#ffe3a0', '#c2410a'];
    if (this.flipped) { ctx.save(); ctx.translate(0, y * 2 + this.h); ctx.scale(1, -1); }
    // tail (behind the body, on the right since fish swim left)
    for (let i = 0; i < 5; i++) {
      const h = 2 + i * 2 - (flap ? 1 : 0);
      ctx.fillStyle = INK; ctx.fillRect(x + 15 + i, cy - h / 2 - 1, 1, h + 2);
      if (i < 4) { ctx.fillStyle = fin; ctx.fillRect(x + 15 + i, cy - h / 2, 1, h); }
    }
    // dorsal fin
    ctx.fillStyle = INK; ctx.fillRect(x + 5, y - 1, 7, 3); ctx.fillRect(x + 7, y - 2, 4, 1);
    ctx.fillStyle = fin; ctx.fillRect(x + 6, y, 5, 2); ctx.fillRect(x + 8, y - 1, 2, 1);
    // body: outline, then dark back / base / light belly
    for (let dy = -6; dy <= 6; dy++) {
      const hw = Math.round(8.5 * Math.sqrt(Math.max(0, 1 - (dy / 6.6) ** 2)));
      ctx.fillStyle = INK; ctx.fillRect(cx - hw - 1, cy + dy, hw * 2 + 3, 1);
    }
    for (let dy = -5; dy <= 5; dy++) {
      const hw = Math.round(7.5 * Math.sqrt(Math.max(0, 1 - (dy / 5.6) ** 2)));
      ctx.fillStyle = dy <= -3 ? back : dy >= 2 ? belly : base;
      ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
    // stripe and side fin
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 3, cy - 4, 2, 8);
    ctx.fillStyle = INK; ctx.fillRect(cx + 2, cy - 4, 1, 8); ctx.fillRect(cx + 5, cy - 4, 1, 8);
    ctx.fillStyle = fin; ctx.fillRect(cx - 1, cy + 1 + flap, 3, 2);
    // big angry eye, mouth with a tooth
    ctx.fillStyle = INK; ctx.fillRect(x + 1, cy - 4, 6, 6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, cy - 3, 4, 4);
    ctx.fillStyle = INK; ctx.fillRect(x + 2, cy - 2, 2, 3);
    ctx.fillRect(x + 1, cy - 5, 3, 1); ctx.fillRect(x + 4, cy - 4, 3, 1);
    ctx.fillRect(x, cy + 3, 4, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, cy + 4, 1, 1); ctx.fillRect(x + 3, cy + 4, 1, 1);
    if (this.flipped) ctx.restore();
  }
}

// Jellyfish: sinks slowly, then jets up and sideways toward the player in pulses.
// Glows hot pink so it stands out from the reef.
class Jellop extends Enemy {
  constructor(col, row) {
    super(col * TILE - 1, row * TILE, 18, 18);
    this.state = 'sink'; this.timer = 50;
    this.stompable = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return { x: this.x + 2, y: this.y + 1, w: this.w - 4, h: this.h - 5 }; }
  update(g) {
    this.t++;
    const p = g.player, lv = g.level, pcx = p.x + p.w / 2, top = lv.water ? lv.water.top * TILE : 0;
    if (this.state === 'sink') {
      this.vy = Math.min(this.vy + 0.03, 0.4); this.vx *= 0.9;
      if (--this.timer <= 0) {
        if (Math.abs(pcx - this.cx) < 150) {
          this.state = 'pulse'; this.timer = 36;
          this.vy = p.y + p.h / 2 < this.y + 20 ? -1.9 : -0.9;
          this.vx = Math.sign(pcx - this.cx) * 1.1;
        } else this.timer = 20;
      }
    } else {
      this.vy = Math.min(this.vy + 0.05, 0.4); this.vx *= 0.97;
      if (--this.timer <= 0) { this.state = 'sink'; this.timer = 45; }
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < top) { this.y = top; this.vy = 0; }
    if (lv.solid(Math.floor(this.cx / TILE), Math.floor((this.y + this.h) / TILE))) { this.y = Math.floor((this.y + this.h) / TILE) * TILE - this.h; this.vy = 0; }
    if (this.x + this.w < g.camX - 64) this.remove = true;
  }
  draw(ctx) {
    const cx = Math.round(this.cx), y = Math.round(this.y), sq = this.state === 'pulse' && this.timer > 26 ? 2 : 0;
    ctx.globalAlpha = 0.16 + Math.sin(this.t * 0.1) * 0.06; blob(ctx, cx, y + 8, 14, '#ff6ad5'); ctx.globalAlpha = 1;
    // tentacles: outlined, swaying
    for (let i = 0; i < 4; i++) {
      const tx = cx - 6 + i * 4;
      for (let j = 0; j < 9 + sq * 2; j += 2) {
        const ox = Math.round(Math.sin(this.t * 0.15 + i * 1.3 + j * 0.5) * 1.2);
        ctx.fillStyle = INK; ctx.fillRect(tx + ox - 1, y + 12 + j, 3, 2);
      }
      for (let j = 0; j < 9 + sq * 2; j += 2) {
        const ox = Math.round(Math.sin(this.t * 0.15 + i * 1.3 + j * 0.5) * 1.2);
        ctx.fillStyle = j < 4 ? '#ff5cc8' : '#ffb3e6'; ctx.fillRect(tx + ox, y + 12 + j, 1, 2);
      }
    }
    // dome
    blob(ctx, cx, y + 8 + sq, 9 - sq, INK);
    blob(ctx, cx, y + 8 + sq, 8 - sq, '#ff3fb4');
    blob(ctx, cx - 1, y + 6 + sq, 5 - sq, '#ff8fd6');
    ctx.fillStyle = INK; ctx.fillRect(cx - 8 + sq, y + 12, 17 - sq * 2, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 4, y + 2 + sq, 3, 2); ctx.fillRect(cx - 5, y + 4 + sq, 1, 2);
    // eyes
    ctx.fillStyle = INK; ctx.fillRect(cx - 4, y + 8, 2, 3); ctx.fillRect(cx + 2, y + 8, 2, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 4, y + 8, 1, 1); ctx.fillRect(cx + 2, y + 8, 1, 1);
  }
}

// Sea urchin: a spiky hazard that crawls slowly along the sea floor (turning at walls and ledges)
// and now and then bristles, then fires a spike at Boyo. Fireballs fizzle on it.
class Urchin extends Enemy {
  constructor(col, row) {
    super(col * TILE, (row + 1) * TILE - 16, 16, 16);
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
    this.beamKill = true;
    this.walker = true; this.dir = Math.random() < 0.5 ? -1 : 1;
    this.aim = 0; this.cool = 70 + Math.floor(Math.random() * 90);
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.aim > 0) {                                      // bristling: stand still, then fire
      this.vx = 0; this.walk(g, true);
      if (--this.aim === 0) this.shoot(g);
      return;
    }
    this.vx = this.dir * 0.28; this.walk(g, true);
    if (this.vx) this.dir = Math.sign(this.vx);
    if (this.x > g.camX && this.x + this.w < g.camX + VIEW_W && --this.cool <= 0) {
      const near = p.state === 'play' && Math.abs(p.x - this.x) < 150 && Math.abs(p.y - this.y) < 90;
      if (near) { this.aim = 28; this.cool = 150 + Math.floor(Math.random() * 120); Sound.play('spike'); }
      else this.cool = 40;
    }
  }
  shoot(g) {
    const p = g.player, cx = this.cx, cy = this.y + 9;
    const a = Math.atan2(p.y + p.h / 2 - cy, p.x + p.w / 2 - cx);
    g.entities.push(new UrchinSpike(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, Math.cos(a) * 1.7, Math.sin(a) * 1.7));
    g.spark(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, '#ffd166', 14);
    Sound.play('spike');
  }
  hitbox() { return { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 2 }; }
  draw(ctx) {
    const aiming = this.aim > 0, shake = aiming ? (this.t % 2 ? 1 : -1) : 0;
    const cx = Math.round(this.cx) + shake, cy = Math.round(this.y + 9), len = aiming ? 15 : 11 + ((this.t >> 4) % 2);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + 0.26;
      if (Math.sin(a) > 0.6) continue;                       // no spikes into the ground
      for (let k = 5; k <= len; k++) {
        const px = Math.round(cx + Math.cos(a) * k), py = Math.round(cy + Math.sin(a) * k), w = k < 8 ? 2 : 1;
        ctx.fillStyle = INK; ctx.fillRect(px - w, py - w, w * 2 + 1, w * 2 + 1);
      }
      for (let k = 5; k <= len; k++) {
        const px = Math.round(cx + Math.cos(a) * k), py = Math.round(cy + Math.sin(a) * k);
        ctx.fillStyle = k >= len - 2 ? (aiming ? '#ffffff' : '#ffd166') : '#c77dff';
        ctx.fillRect(px, py, 1, 1); if (k < 8) ctx.fillRect(px - 1, py, 2, 1);
      }
    }
    blob(ctx, cx, cy, 7, INK); blob(ctx, cx, cy, 6, '#7a2fa8'); blob(ctx, cx - 1, cy - 2, 3, '#a24fd6');
    ctx.fillStyle = '#e0b3ff'; ctx.fillRect(cx - 3, cy - 4, 2, 1);
    // angry eyes
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 4, cy, 3, 3); ctx.fillRect(cx + 1, cy, 3, 3);
    ctx.fillStyle = INK; ctx.fillRect(cx - 3, cy + 1, 2, 2); ctx.fillRect(cx + 1, cy + 1, 2, 2);
    ctx.fillRect(cx - 5, cy - 1, 3, 1); ctx.fillRect(cx + 2, cy - 1, 3, 1);
  }
}

// A spike fired by an urchin: flies straight, hurts on touch, vanishes against walls.
class UrchinSpike extends Enemy {
  constructor(x, y, vx, vy) {
    super(x - 4, y - 4, 8, 8);
    this.vx = vx; this.vy = vy; this.ang = Math.atan2(vy, vx); this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    this.x += this.vx; this.y += this.vy;
    if (g.level.solid(Math.floor(this.cx / TILE), Math.floor((this.y + 4) / TILE)) || this.t > 220 || this.y > VIEW_H || this.y < -16 || this.x < g.camX - 24 || this.x > g.camX + VIEW_W + 24) {
      g.burst(this.cx, this.y + 4, ['#c77dff', '#ffd166'], 4);
      this.remove = true;
    } else if (this.t % 4 === 0) g.spark(this.cx, this.y + 4, '#c77dff', 12, 0, -0.2);
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(Math.round(this.cx), Math.round(this.y + 4));
    ctx.rotate(this.ang);
    ctx.fillStyle = INK; ctx.fillRect(-6, -2, 12, 5);
    ctx.fillStyle = '#7a2fa8'; ctx.fillRect(-5, -1, 7, 3);
    ctx.fillStyle = '#c77dff'; ctx.fillRect(-5, -1, 7, 1);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(2, -1, 4, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(5, 0, 1, 1);
    ctx.restore();
  }
}

// ── Snow world ────────────────────────────────────────────────────────────────
// Penguin: waddles about; when you're level with it and in front, it flops onto its belly and
// slides at you (much farther on ice). Stompable either way.
class Slideguin extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 16, 14, 16);
    this.vx = -0.4; this.walker = true; this.state = 'walk'; this.cool = 60;
  }
  update(g) {
    this.t++;
    const p = g.player, lv = g.level;
    if (this.state === 'walk') {
      this.walk(g, true);
      if (this.cool > 0) this.cool--;
      const dx = p.x + p.w / 2 - this.cx, dy = Math.abs(p.y + p.h - (this.y + this.h));
      if (!this.cool && this.onGround && dy < 20 && Math.abs(dx) < 130 && Math.sign(dx) === Math.sign(this.vx || -1)) {
        this.state = 'slide'; this.vx = Math.sign(dx) * 2.6;
        this.y += 6; this.h = 10;                                  // belly down
        if (this.x > g.camX && this.x < g.camX + VIEW_W) Sound.play('slide');
      }
      return;
    }
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx * 0.8;
    const r = sweepY(lv, this, this.vy);
    if (r === 1) { this.vy = 0; this.onGround = true; } else { this.onGround = false; if (r === -1) this.vy = 0; }
    const ice = lv.get(Math.floor(this.cx / TILE), Math.floor((this.y + this.h + 1) / TILE)) === T.ICE;
    if (this.onGround) this.vx *= ice ? 0.998 : 0.982;
    if (this.onGround && this.t % 3 === 0) g.spark(this.cx - Math.sign(this.vx) * 6, this.y + this.h, '#e6f6ff', 12, -this.vx * 0.2, -0.4);
    if (Math.abs(this.vx) < 0.5 && this.onGround) {
      this.state = 'walk'; this.y -= 6; this.h = 16; this.vx = Math.sign(this.vx || -1) * 0.4; this.cool = 90;
    }
    if (this.y > VIEW_H + 32 || this.x + this.w < g.camX - 160) this.remove = true;
  }
  draw(ctx) {
    const f = this.vx < 0 ? -1 : 1, x = Math.round(this.cx), by = Math.round(this.y + this.h);
    if (this.flipped) { ctx.save(); ctx.translate(0, by * 2 - this.h); ctx.scale(1, -1); }
    if (this.state === 'slide') {
      // lying on its belly: long body, head in front, flippers trailing
      for (let i = -8; i <= 8; i++) { const hh = Math.round(4 * Math.sqrt(Math.max(0, 1 - (i / 8.5) ** 2))); ctx.fillStyle = INK; ctx.fillRect(x + i, by - 2 - hh * 2, 1, hh * 2 + 2); }
      for (let i = -7; i <= 7; i++) { const hh = Math.round(3.4 * Math.sqrt(Math.max(0, 1 - (i / 7.6) ** 2))); ctx.fillStyle = '#3d5fa8'; ctx.fillRect(x + i, by - 2 - hh * 2 + 1, 1, hh * 2); ctx.fillStyle = '#f4f8ff'; ctx.fillRect(x + i, by - 3, 1, 2); }
      ctx.fillStyle = '#ff4d5e'; ctx.fillRect(x + f * 4 - 1, by - 9, 2, 6); ctx.fillRect(x + f * 4 - f * 3 - 1, by - 3, 3, 2);   // scarf
      ctx.fillStyle = '#ffb347'; ctx.fillRect(x + f * 8 - (f < 0 ? 2 : 0), by - 6, 3, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + f * 5 - (f < 0 ? 1 : 0), by - 8, 2, 2);
      ctx.fillStyle = INK; ctx.fillRect(x + f * 6 - (f < 0 ? 1 : 0), by - 8, 1, 2);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(x - f * 9 - 1, by - 4, 2, 2);
    } else {
      const step = (this.t >> 3) % 2;
      blob(ctx, x, by - 8, 7, INK); blob(ctx, x, by - 8, 6, '#3d5fa8');
      blob(ctx, x + f, by - 7, 4, '#f4f8ff');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + f * 2 - 1, by - 12, 2, 2); ctx.fillStyle = INK; ctx.fillRect(x + f * 3 - (f < 0 ? 1 : 0), by - 12, 1, 2);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(x + f * 5 - (f < 0 ? 2 : 0), by - 10, 3, 2);
      ctx.fillStyle = '#ff9aa2'; ctx.fillRect(x + f * 3 - (f < 0 ? 0 : 1), by - 9, 1, 1);
      ctx.fillStyle = '#ff4d5e'; ctx.fillRect(x - 5, by - 7, 11, 2); ctx.fillRect(x - f * 6 - (f > 0 ? 1 : 0), by - 6, 2, 4);   // scarf
      ctx.fillStyle = '#1b1f33'; ctx.fillRect(x - f * 6 - (f > 0 ? 1 : 0), by - 9 + step, 2, 5);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(x - 4 + step, by - 2, 3, 2); ctx.fillRect(x + 1 - step, by - 2, 3, 2);
    }
    if (this.flipped) ctx.restore();
  }
}

// Icicle: hangs under an overhang. When you pass underneath it shakes, then drops and shatters.
// Hurts on contact; a fireball melts it.
class Icicle extends Enemy {
  constructor(col, row) {
    super(col * TILE + 4, row * TILE, 8, 14);
    this.state = 'hang'; this.timer = 0;
    this.stompable = this.shellKill = this.bumpKill = false; this.walker = false;
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'hang') {
      if (p.state === 'play' && Math.abs(p.x + p.w / 2 - this.cx) < 30 && p.y > this.y) { this.state = 'shake'; this.timer = 28; Sound.play('crack'); }
      return;
    }
    if (this.state === 'shake') { if (--this.timer <= 0) this.state = 'fall'; return; }
    this.vy = Math.min(this.vy + 0.35, 6); this.y += this.vy;
    const lv = g.level, c = Math.floor(this.cx / TILE), r = Math.floor((this.y + this.h) / TILE);
    if (lv.solid(c, r) || lv.get(c, r) === T.SEMI) {
      for (let i = 0; i < 10; i++) g.particles.push({ kind: 'px', x: this.cx + rand(-3, 3), y: r * TILE - 2, vx: rand(-1.6, 1.6), vy: rand(-2.4, -0.6), g: 0.2, life: 30, t: 0, color: i % 2 ? '#ffffff' : '#9fdcff', size: 2 });
      if (this.x > g.camX - 16 && this.x < g.camX + VIEW_W) Sound.play('shatter');
      this.remove = true;
    } else if (this.y > VIEW_H) this.remove = true;
  }
  draw(ctx) {
    const jx = this.state === 'shake' ? ((this.t >> 1) % 2 ? 1 : -1) : 0, x = Math.round(this.cx) + jx, y = Math.round(this.y);
    for (let i = 0; i < this.h; i++) {
      const w = Math.max(0, Math.round(4 * (1 - i / this.h)));
      ctx.fillStyle = INK; ctx.fillRect(x - w - 1, y + i, w * 2 + 2, 1);
      ctx.fillStyle = i < 3 ? '#ffffff' : '#bfe9ff'; ctx.fillRect(x - w, y + i, w * 2, 1);
      if (w > 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - w + 1, y + i, 1, 1); }
    }
    ctx.fillStyle = INK; ctx.fillRect(x - 1, y + this.h, 1, 1);
  }
}

// ── Sky world ────────────────────────────────────────────────────────────────
// Springboard, Mario-style: the player lands on it and rides the coil down, then
// gets launched. Jump pressed or held during the squash = big launch, otherwise a
// small hop. Launch heights are fixed (normal gravity, no hold-to-float), so the
// bounce is the same every time. The launch is always straight up (no carried momentum).
const SPRING_BIG = -12, SPRING_SMALL = -7, SPRING_DOWN = 8, SPRING_UP = 4;
// air control after a big spring launch: acceleration, turn-around, and drag with no input
const SPRING_AIR_ACCEL = 0.15, SPRING_AIR_TURN = 0.24, SPRING_AIR_DRAG = 0.94;
class Spring extends Enemy {
  constructor(col, row) {
    super(col * TILE + 1, (row + 1) * TILE - 12, 14, 12);
    this.rest = this.y; this.comp = 0; this.stretch = 0; this.rider = null;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  touches(p) {
    if (this.rider || !overlap(this, p)) return false;
    if (p.vy > 0 && p.prevY + p.h <= this.rest + 8) return true;            // landing on top
    const pc = p.x + p.w / 2;                                                 // or walking onto it
    return p.onGround && Math.abs(p.y + p.h - (this.rest + 12)) < 2 && pc > this.x + 2 && pc < this.x + this.w - 2;
  }
  onTouch(g, p) {
    // a jump pressed just before landing (still in the jump buffer) counts too
    g.endRoll(p);
    this.rider = p; this.ride = 0; this.big = Input.down('jump') || Input.down('spin') || p.jumpBuf > 0;
    p.spin = false;
    p.vx = 0; p.vy = 0; p.combo = 0; p.platform = null; p.jumpBuf = 0;
    p.x = clamp(p.x, this.x - p.w + 6, this.x + this.w - 6);
  }
  update(g) {
    this.t++;
    if (this.stretch > 0) this.stretch--;
    const p = this.rider;
    if (!p) { this.comp = 0; return; }
    if (p.state !== 'play') { this.rider = null; return; }
    this.ride++;
    if (Input.down('jump') || Input.hit('jump') || Input.hit('up')) this.big = true;
    this.comp = this.ride <= SPRING_DOWN ? Math.round(this.ride * 7 / SPRING_DOWN)
      : Math.round(7 * (1 - (this.ride - SPRING_DOWN) / SPRING_UP));
    p.vx = 0; p.vy = 0; p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
    p.y = this.rest + this.comp - p.h;
    p.sx = 1 + this.comp * 0.03; p.sy = 1 - this.comp * 0.03;
    if (this.ride >= SPRING_DOWN + SPRING_UP) {
      this.rider = null; this.comp = 0; this.stretch = 8;
      p.vy = this.big ? SPRING_BIG : SPRING_SMALL;
      p.vx = 0;                        // always launch straight up; the player steers from there
      p.jumping = false;               // fixed arc: no hold-to-float on top of the launch
      p.airMax = RUN_MAX;
      p.springAir = this.big;          // big launch: strong steering until we land (see physics)
      p.sx = 0.75; p.sy = 1.3;
      g.dust(this.cx, this.rest + 12, this.big ? 6 : 3);
      Sound.play(this.big ? 'spring' : 'jump');
    }
  }
  draw(ctx) {
    const x = Math.round(this.x), base = Math.round(this.rest + 12);
    const top = base - 12 + this.comp - (this.stretch > 4 ? 3 : this.stretch > 0 ? 1 : 0);
    ctx.fillStyle = INK; ctx.fillRect(x, base - 3, 14, 3);
    ctx.fillStyle = '#8a8aa6'; ctx.fillRect(x + 1, base - 2, 12, 1);
    for (let y = top + 3, i = 0; y < base - 3; y += 2, i++) {
      ctx.fillStyle = INK; ctx.fillRect(x + 2 + (i % 2) * 2, y, 8, 2);
      ctx.fillStyle = '#d9dceb'; ctx.fillRect(x + 3 + (i % 2) * 2, y, 6, 1);
    }
    ctx.fillStyle = INK; ctx.fillRect(x, top, 14, 4);
    ctx.fillStyle = '#ff5d73'; ctx.fillRect(x + 1, top + 1, 12, 2);
    ctx.fillStyle = '#ffa0ad'; ctx.fillRect(x + 1, top + 1, 12, 1);
  }
}

// Storm cloud: tails the player from above, flickers while charging (and stops
// moving, so the strike point is telegraphed), then fires a bolt straight down.
class Stormlet extends Enemy {
  constructor(col, until) {
    super(col * TILE, 32, 22, 12);
    this.until = until * TILE; this.state = 'drift'; this.timer = 90; this.baseY = 32; this.boltLen = 0;
    this.shellKill = this.bumpKill = false;
  }
  bolt() { return { x: this.cx - 3, y: this.y + this.h, w: 6, h: this.boltLen }; }
  aim(lv) {
    const c = Math.floor(this.cx / TILE), top = this.y + this.h;
    let end = VIEW_H + 16;
    for (let r = Math.floor(top / TILE) + 1; r < ROWS; r++) if (lv.solid(c, r) || lv.get(c, r) === T.SEMI) { end = r * TILE; break; }
    this.boltLen = end - top;
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'leave') { this.y -= 1.2; this.x += 0.6; if (this.y < -30) this.remove = true; return; }
    if (p.x > this.until) { this.state = 'leave'; return; }
    if (this.state === 'drift') this.x += clamp(p.x + p.w / 2 - this.cx, -1.4, 1.4);
    this.x = clamp(this.x, g.camX + 4, g.camX + VIEW_W - this.w - 4);
    this.y = this.baseY + Math.round(Math.sin(this.t * 0.06) * 3);
    switch (this.state) {
      case 'drift':
        if (--this.timer <= 0) { this.state = 'charge'; this.timer = 40; this.aim(g.level); Sound.play('charge'); }
        break;
      case 'charge':
        if (this.t % 4 === 0) g.spark(this.cx + rand(-8, 8), this.y + this.h, '#ffe066', 12, rand(-0.4, 0.4), rand(0.2, 0.8));
        if (--this.timer <= 0) {
          this.state = 'zap'; this.timer = 16; this.aim(g.level);
          Sound.play('zap'); g.shake = Math.max(g.shake, 1.5);
          if (this.y + this.h + this.boltLen < VIEW_H) g.burst(this.cx, this.y + this.h + this.boltLen, ['#fff6a8', '#ffffff', '#9fe3ff'], 8);
        }
        break;
      case 'zap':
        if (--this.timer <= 0) { this.state = 'drift'; this.timer = 100 + Math.floor(rand(0, 50)); this.boltLen = 0; }
        break;
    }
  }
  touches(p) { return overlap(this, p) || (this.state === 'zap' && overlap(this.bolt(), p)); }
  onTouch(g, p) {
    if (overlap(this, p) && g.isStomp(p, this)) this.stomp(g, p);
    else g.hurtPlayer();
  }
  draw(ctx) {
    const cx = this.cx, y = this.y, charging = this.state === 'charge', lit = charging && this.t % 6 < 3;
    if (this.state === 'zap') {
      const top = y + this.h;
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff6a8'; ctx.fillRect(Math.round(cx) - 5, Math.round(top), 10, Math.round(this.boltLen)); ctx.globalAlpha = 1;
      for (let s = 0; s < this.boltLen; s += 8) {
        const ox = ((s / 8 + (this.t >> 1)) % 2 ? 2 : -2), h = Math.min(8, this.boltLen - s);
        ctx.fillStyle = '#fff6a8'; ctx.fillRect(Math.round(cx + ox) - 2, Math.round(top + s), 4, h);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx + ox) - 1, Math.round(top + s), 2, h);
      }
    } else if (charging && this.boltLen > 0 && this.y + this.h + this.boltLen < VIEW_H) {
      // strike marker on the ground below
      ctx.fillStyle = lit ? '#ffe066' : '#fff6a8';
      const gy = Math.round(y + this.h + this.boltLen);
      ctx.fillRect(Math.round(cx) - 4, gy - 1, 8, 1); ctx.fillRect(Math.round(cx) - 1, gy - 3, 2, 2);
    }
    const dark = lit ? '#fff1a8' : '#46507a', body = lit ? '#ffe066' : '#7480aa', hi = lit ? '#ffffff' : '#a3add0';
    const yy = this.flipped ? y : y;
    blob(ctx, cx - 6, yy + 7, 6, dark); blob(ctx, cx + 6, yy + 7, 6, dark); blob(ctx, cx, yy + 4, 8, dark);
    blob(ctx, cx - 6, yy + 7, 5, body); blob(ctx, cx + 6, yy + 7, 5, body); blob(ctx, cx, yy + 4, 7, body);
    ctx.fillStyle = hi; ctx.fillRect(Math.round(cx) - 5, Math.round(yy) - 1, 5, 2); ctx.fillRect(Math.round(cx) - 9, Math.round(yy) + 4, 3, 1);
    // angry eyes
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx) - 5, Math.round(yy) + 5, 3, 3); ctx.fillRect(Math.round(cx) + 2, Math.round(yy) + 5, 3, 3);
    ctx.fillStyle = INK;
    if (this.flipped) { ctx.fillRect(Math.round(cx) - 5, Math.round(yy) + 6, 3, 1); ctx.fillRect(Math.round(cx) + 2, Math.round(yy) + 6, 3, 1); }
    else {
      ctx.fillRect(Math.round(cx) - 4, Math.round(yy) + 6, 2, 2); ctx.fillRect(Math.round(cx) + 2, Math.round(yy) + 6, 2, 2);
      ctx.fillRect(Math.round(cx) - 6, Math.round(yy) + 4, 3, 1); ctx.fillRect(Math.round(cx) + 3, Math.round(yy) + 4, 3, 1);
    }
    // rain wisps under it
    ctx.fillStyle = '#9fc3ff';
    for (let i = 0; i < 3; i++) { const ry = (this.t + i * 5) % 12; ctx.fillRect(Math.round(cx) - 7 + i * 6, Math.round(yy) + 13 + ry, 1, 2); }
  }
}

// ── Boss: MAGMAW, guardian of the Ember Citadel crystal ─────────────────────
// Stomp it (4 dmg) or burn it (1 dmg per fireball) out of 12 HP. Every stomp
// stuns it and pushes it into a nastier phase: fire spit, leap + ground flames,
// and finally falling embers.
class BossShot extends Enemy {
  constructor(x, y, vx, vy) {
    super(x - 5, y - 5, 10, 10);
    this.vx = vx; this.vy = vy; this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    this.x += this.vx; this.y += this.vy;
    if (this.t % 2 === 0) g.spark(this.cx, this.y + 5, '#ff8a2a', 14);
    if (g.level.solid(Math.floor(this.cx / TILE), Math.floor((this.y + 5) / TILE)) || this.y > VIEW_H || this.y < -24 || this.x < g.camX - 24 || this.x > g.camX + VIEW_W + 24) {
      g.burst(this.cx, this.y + 5, ['#ff6a1f', '#ffd166'], 5);
      this.remove = true;
    }
  }
  draw(ctx) {
    const cx = this.cx, cy = this.y + 5;
    blob(ctx, cx, cy, 5, '#e8401a');
    blob(ctx, cx, cy, 4, '#ff8a2a');
    blob(ctx, cx, cy, 2, '#ffe08a');
  }
}

class FlameWave extends Enemy {
  constructor(x, dir, speed) {
    super(x, 12 * TILE - 12, 14, 12);
    this.vx = dir * speed; this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  update(g) {
    this.t++;
    if (sweepX(g.level, this, this.vx)) { g.burst(this.cx, this.y + 6, ['#ff6a1f', '#ffd166'], 6); this.remove = true; return; }
    if (this.t % 3 === 0) g.spark(this.x + rand(2, 12), this.y + 10, '#ffd166', 12, rand(-0.3, 0.3), rand(-1.2, -0.4));
  }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = '#e8401a'; ctx.fillRect(x, y + 8, 14, 4);
    for (let i = 0; i < 3; i++) {
      const h = 6 + (((this.t >> 2) + i) % 3) * 2;
      ctx.fillStyle = '#ff6a1f'; ctx.fillRect(x + i * 5, y + 12 - h, 4, h);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(x + i * 5 + 1, y + 12 - h + 3, 2, h - 3);
    }
  }
}

class EmberDrop extends Enemy {
  constructor(cx) {
    super(cx - 5, -16, 10, 12);
    this.warn = 34; this.bossHazard = true;
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  hitbox() { return this.warn > 0 ? null : this; }
  update(g) {
    this.t++;
    if (this.warn > 0) { this.warn--; return; }
    this.vy = Math.min(this.vy + 0.18, 4.6);
    this.y += this.vy;
    const lv = g.level, c = Math.floor(this.cx / TILE), r = Math.floor((this.y + this.h) / TILE);
    if (lv.solid(c, r) || (lv.get(c, r) === T.SEMI && this.y + this.h - this.vy <= r * TILE + 0.5)) {
      g.burst(this.cx, r * TILE - 2, ['#ff6a1f', '#ffd166', '#e8401a'], 8);
      if (this.x > g.camX && this.x < g.camX + VIEW_W) Sound.play('sizzle');
      this.remove = true;
    } else if (this.t % 2 === 0) g.spark(this.cx + rand(-2, 2), this.y, '#ff8a2a', 14);
  }
  draw(ctx) {
    const cx = this.cx;
    if (this.warn > 0) {
      ctx.globalAlpha = this.warn % 8 < 4 ? 0.26 : 0.12;
      ctx.fillStyle = '#ff6a1f'; ctx.fillRect(Math.round(cx) - 4, 34, 8, 12 * TILE - 34);
      ctx.globalAlpha = 1;
      blob(ctx, cx, 38, 3, this.warn % 8 < 4 ? '#ffd166' : '#ff6a1f');
      return;
    }
    ctx.fillStyle = '#ff6a1f'; ctx.fillRect(Math.round(cx) - 1, Math.round(this.y) - 8, 2, 8);
    blob(ctx, cx, this.y + 6, 6, '#e8401a');
    blob(ctx, cx, this.y + 6, 5, '#ff8a2a');
    blob(ctx, cx, this.y + 6, 3, '#ffe08a');
  }
}

class Boss extends Enemy {
  constructor(col) {
    super(col * TILE, 12 * TILE - 34, 36, 34);
    this.maxHp = this.hp = 12; this.shown = 0;
    this.state = 'sleep'; this.timer = 0; this.face = -1; this.flash = 0; this.last = '';
    this.stompable = this.fireKill = this.shellKill = this.bumpKill = false;
  }
  get phase() { return this.hp > 8 ? 1 : this.hp > 4 ? 2 : 3; }
  setState(s, n = 0) { this.state = s; this.timer = n; }
  hitbox() {
    if (this.state === 'sleep' || this.state === 'die') return null;
    return { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 2 };
  }
  touches(p) {
    const s = this.state;
    if (s === 'sleep' || s === 'roar' || s === 'stun' || s === 'die') return false;
    return overlap(this.hitbox(), p);
  }
  onTouch(g, p) {
    if (!g.isStomp(p, this)) { g.hurtPlayer(); return; }
    g.bounce(p);
    p.vy = -6; p.vx = (p.x + p.w / 2 < this.cx ? -1 : 1) * 2;
    g.addScore(1000, this.cx, this.y - 6);
    g.dust(this.cx, this.y + this.h, 8);
    Sound.play('stomp');
    this.hurt(g, 4);
  }
  iceHit(g) { this.fireHit(g, 2); }          // magma-blooded: the frost bolt hurts
  fireHit(g, dmg = 1) {
    if (this.state === 'roar') return;
    this.flash = 8 + dmg * 4; Sound.play('kick');
    g.addScore(100 * dmg, this.cx, this.y - 6);
    if (dmg > 2) g.shake = Math.max(g.shake, 5);
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) this.die(g);
  }
  hurt(g, dmg) {
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 24; this.vx = 0; g.shake = Math.max(g.shake, 5);
    if (this.hp <= 0) this.die(g); else this.setState('stun', 80);
  }
  wake(g) {
    const b = g.level.def.boss;
    this.setState('roar');
    g.arenaCam = b.wall * TILE;
    g.bossMusic = true;
    Music.play(g.levelMusic, 1.18);
    Sound.play('roar');
  }
  die(g) {
    this.setState('die');
    this.vx = 0; this.flash = 0;
    g.bossMusic = false;
    g.clearBossHazards();
    Music.stop();
    Sound.play('roar');
    g.flash = 0.6; g.shake = 6;
  }
  pick() {
    const pool = [['leap', 'spit'], ['spit', 'leap', 'leap'], ['rain', 'leap', 'spit', 'leap']][this.phase - 1];
    let a;
    do a = pool[Math.floor(Math.random() * pool.length)]; while (a === this.last);
    this.last = a;
    if (a === 'leap') this.setState('crouch', 26);
    else if (a === 'spit') this.setState('spit', 56);
    else this.setState('rain', 120);
  }
  shoot(g, p) {
    const mx = this.cx + this.face * 14, my = this.y + 18;
    const ang = Math.atan2(p.y + p.h / 2 - my, p.x + p.w / 2 - mx);
    const n = this.phase === 1 ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * 0.32;
      g.entities.push(new BossShot(mx, my, Math.cos(a) * 2.3, Math.sin(a) * 2.3));
    }
    Sound.play('fire');
  }
  land(g) {
    const sp = 1.4 + this.phase * 0.3;
    g.entities.push(new FlameWave(this.x - 14, -1, sp), new FlameWave(this.x + this.w, 1, sp));
    g.shake = Math.max(g.shake, 6);
    g.dust(this.cx - 10, this.y + this.h, 6); g.dust(this.cx + 10, this.y + this.h, 6);
    Sound.play('break');
    this.vx = 0;
    this.setState('land', [70, 45, 25][this.phase - 1] / 2 + 14);
  }
  update(g) {
    const p = g.player, b = g.level.def.boss, ph = this.phase;
    const floorY = 12 * TILE - this.h, pcx = p.x + p.w / 2;
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.state === 'sleep') {
      if (p.state === 'play' && p.x > b.trigger * TILE) this.wake(g);
      return;
    }
    this.shown += (Math.min(this.hp / this.maxHp, this.state === 'roar' ? this.timer / 80 : 1) - this.shown) * 0.1;

    if (this.y < floorY || this.vy < 0) {
      this.vy += 0.42; this.y += this.vy;
      if (this.y >= floorY) { this.y = floorY; this.vy = 0; if (this.state === 'air') this.land(g); }
    }
    switch (this.state) {
      case 'roar': {
        this.timer++;
        const row = this.timer >> 1;
        if (!(this.timer & 1) && row <= 11) { g.level.set(b.wall, row, T.SOLID); if (row % 3 === 0) Sound.play('bump'); }
        if (this.timer % 14 === 0) g.shake = Math.max(g.shake, 3);
        if (this.timer >= 80) this.setState('walk', 60);
        break;
      }
      case 'walk':
        this.face = pcx < this.cx ? -1 : 1;
        this.x += this.face * [0.55, 0.8, 1.05][ph - 1];
        if (--this.timer <= 0) this.pick();
        break;
      case 'crouch':
        this.face = pcx < this.cx ? -1 : 1;
        if (--this.timer <= 0) {
          this.vx = clamp((pcx - this.cx) / 42, -2.6, 2.6);
          this.vy = -8.8;
          this.setState('air');
        }
        break;
      case 'air': this.x += this.vx; break;
      case 'land': if (--this.timer <= 0) this.setState('walk', [70, 45, 25][ph - 1]); break;
      case 'spit':
        this.face = pcx < this.cx ? -1 : 1;
        if (this.timer === 26 || (ph === 3 && this.timer === 10)) this.shoot(g, p);
        if (--this.timer <= 0) this.setState('walk', [100, 70, 45][ph - 1]);
        break;
      case 'rain':
        if (this.timer > 24 && this.timer % 14 === 0) {
          const lo = (b.wall + 2) * TILE, hi = (b.right - 1) * TILE;
          const x = Math.random() < 0.5 ? pcx + rand(-30, 30) : rand(lo, hi);
          g.entities.push(new EmberDrop(clamp(x, lo, hi)));
        }
        if (this.timer % 20 === 0) g.shake = Math.max(g.shake, 1.5);
        if (--this.timer <= 0) this.setState('walk', 45);
        break;
      case 'stun':
        if (--this.timer <= 0) this.setState('walk', 50);
        break;
      case 'die':
        this.timer++;
        if (this.timer % 5 === 0) g.burst(this.x + rand(0, this.w), this.y + rand(0, this.h), ['#ff6a1f', '#ffd166', '#ffffff', '#e8401a'], 6);
        if (this.timer % 20 === 0) { Sound.play('firework'); g.shake = Math.max(g.shake, 4); }
        if (this.timer >= 110) { g.bossDefeated(this); this.remove = true; }
        break;
    }
    this.x = clamp(this.x, (b.wall + 1) * TILE, b.right * TILE - this.w);
  }
  draw(ctx) {
    const s = this.state, sleeping = s === 'sleep';
    // hit / dying: a steady warm tint (no white, no rapid strobing)
    const hit = this.flash > 0 || (s === 'die' && (this.timer >> 4) % 2 === 0);
    const dark = hit ? '#a8584a' : sleeping ? '#2a2036' : '#3d2536';
    const mid = hit ? '#d98a74' : sleeping ? '#3a2d48' : '#5e3547';
    const lite = hit ? '#f0b09a' : sleeping ? '#4b3c5c' : '#8a5063';
    const c = s === 'crouch' ? 4 : s === 'land' ? 3 : 0;
    const up = s === 'roar' || s === 'rain';
    const mouthOpen = up || s === 'die' || (s === 'spit' && this.timer <= 44 && this.timer >= 6);
    const jx = s === 'stun' ? (this.t % 4 < 2 ? -1 : 1) : s === 'die' ? (this.t % 3) - 1 : 0;
    ctx.save();
    ctx.translate(Math.round(this.cx) + jx, Math.round(this.y + this.h));
    ctx.scale(this.face < 0 ? -1 : 1, 1);
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    if (!sleeping) {
      ctx.globalAlpha = 0.10 + Math.sin(this.t * 0.08) * 0.04;
      blob(ctx, 0, -18, 28, '#ff6a1f');
      ctx.globalAlpha = 1;
    }
    // feet, body
    R(-14, -6, 11, 6, dark); R(3, -6, 11, 6, dark); R(-14, -6, 11, 1, lite); R(3, -6, 11, 1, lite);
    const by = -18 + (c >> 1);
    blob(ctx, 0, by, 16, dark);
    blob(ctx, 0, by - 1, 14, mid);
    R(-8, -30 + c, 8, 2, lite); R(-12, -26 + c, 2, 3, lite);
    // lava belly and cracks
    if (!sleeping) {
      const pulse = Math.sin(this.t * 0.1) > 0;
      blob(ctx, 0, -9 + c, 6, '#e8401a');
      blob(ctx, 0, -9 + c, 4, pulse ? '#ffd166' : '#ff8a2a');
      R(-12, -24 + c, 1, 6, '#ff8a2a'); R(-11, -18 + c, 2, 1, '#ff8a2a');
      R(11, -26 + c, 1, 5, '#ff8a2a'); R(9, -21 + c, 2, 1, '#ff8a2a'); R(-4, -32 + c, 1, 2, '#ff8a2a');
    }
    // horns
    for (const sg of [-1, 1]) {
      for (const [x, y, w, h] of [[9, -34, 4, 4], [12, -38, 3, 4], [14, -42, 2, 4]]) {
        R(sg > 0 ? x : -x - w, y + c, w, h, hit ? '#ffffff' : '#e6d8b0');
      }
    }
    // arms
    for (const sg of [-1, 1]) {
      if (up) { R(sg * 17 - 1, -34, 2, 14, dark); blob(ctx, sg * 17, -36, 3, mid); }
      else blob(ctx, sg * 17, -12 + c, 4, mid);
    }
    // face
    if (sleeping) {
      R(-9, -24 + c, 6, 1, INK); R(3, -24 + c, 6, 1, INK);
    } else {
      R(-9, -26 + c, 6, 4, '#ffe08a'); R(3, -26 + c, 6, 4, '#ffe08a');
      R(-4, -25 + c, 2, 3, INK); R(8, -25 + c, 2, 3, INK);
      R(-10, -31 + c, 3, 2, INK); R(-7, -30 + c, 3, 2, INK); R(-4, -29 + c, 2, 2, INK);
      R(7, -31 + c, 3, 2, INK); R(4, -30 + c, 3, 2, INK); R(2, -29 + c, 2, 2, INK);
    }
    if (mouthOpen) {
      R(-8, -19 + c, 16, 8, INK); R(-6, -14 + c, 12, 3, '#ff6a1f');
      R(-7, -19 + c, 3, 2, '#fff3c4'); R(4, -19 + c, 3, 2, '#fff3c4'); R(-1, -19 + c, 2, 2, '#fff3c4');
    } else {
      R(-8, -16 + c, 16, 2, INK);
      R(-6, -17 + c, 2, 2, '#fff3c4'); R(0, -17 + c, 2, 2, '#fff3c4'); R(5, -17 + c, 2, 2, '#fff3c4');
    }
    ctx.restore();
    if (s === 'stun') {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 0.12 + i * 2.1, x = this.cx + Math.cos(a) * 14, y = this.y - 8 + Math.sin(a) * 4;
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
      }
    }
  }
}

class Item {
  constructor(kind, col, row) {
    this.kind = kind;
    this.x = col * TILE + 1; this.w = 14; this.h = 16;
    this.baseY = row * TILE; this.y = this.baseY;
    this.emerge = 0; this.vx = 0; this.vy = 0; this.t = 0; this.remove = false;
  }
  get emerging() { return this.emerge < 16; }
  update(g) {
    this.t++;
    if (this.emerging) {
      this.emerge += 0.5;
      this.y = this.baseY - this.emerge;
      if (!this.emerging && !SUIT_OF[this.kind]) this.vx = 1.1;
      return;
    }
    if (SUIT_OF[this.kind]) { this.y = this.baseY - 16 + Math.round(Math.sin(this.t * 0.1)); return; }
    const lv = g.level;
    this.vy = Math.min(this.vy + 0.3, 5);
    if (sweepX(lv, this, this.vx)) this.vx = -this.vx;
    if (sweepY(lv, this, this.vy)) this.vy = 0;
    if (this.y > VIEW_H + 20 || this.x + this.w < g.camX - 64) this.remove = true;
  }
  draw(ctx) {
    const suit = SUIT_OF[this.kind];
    let img = this.kind === 'berry' ? SPR.berry : this.kind === 'oneup' ? SPR.heart : (Math.floor(this.t / 6) % 2 ? SPR.pepperB : SPR.pepperA);
    if (suit && suit !== 'fire' && !this.emerging) {
      img = SPR[SUIT_INFO[suit].icon];
      ctx.globalAlpha = 0.22 + Math.sin(this.t * 0.15) * 0.08; blob(ctx, this.x + 7, this.y + 8, 11, SUIT_INFO[suit].color); ctx.globalAlpha = 1;
    } else if (suit && suit !== 'fire') img = SPR[SUIT_INFO[suit].icon];
    drawSprite(ctx, img, this.x + 7, this.y + 16, false);
  }
}

class Fireball {
  constructor(x, y, dir) { this.x = x; this.y = y; this.w = 8; this.h = 8; this.vx = dir * 4.2; this.vy = 1.5; this.t = 0; this.remove = false; }
  update(g) {
    this.t++;
    const lv = g.level;
    this.vy = lv.water ? 0 : Math.min(this.vy + 0.4, 5);
    if (lv.water && this.t % 3 === 0) g.spark(this.x + 4, this.y + 4, '#cdefff', 16, 0, -0.4);
    if (sweepX(lv, this, this.vx)) { this.pop(g); return; }
    const r = sweepY(lv, this, this.vy);
    if (r === 1) this.vy = -3.4; else if (r === -1) this.vy = 1;
    if (this.y > VIEW_H || this.x < g.camX - 16 || this.x > g.camX + VIEW_W + 16) { this.remove = true; return; }
    for (const e of g.entities) {
      if (e.dead || !(e.fireKill || e.fireHit)) continue;
      const b = e.hitbox();
      if (b && overlap(this, b)) {
        if (e.fireHit) { e.fireHit(g, CHILI_DMG[0]); this.pop(g); return; }
        e.flipKill(g, Math.sign(this.vx));
        g.addScore(200, e.cx, e.y);
        Sound.play('kick');
        this.pop(g);
        return;
      }
    }
  }
  pop(g) {
    this.remove = true;
    for (let i = 0; i < 6; i++) g.spark(this.x + 4, this.y + 4, i % 2 ? '#ffd166' : '#ff8a2a', 14, rand(-1.5, 1.5), rand(-1.5, 1.5));
  }
  draw(ctx) {
    const cx = this.x + 4, cy = this.y + 4;
    ctx.globalAlpha = 0.5; blob(ctx, cx - Math.sign(this.vx) * 3, cy, 4, '#ff8a2a'); ctx.globalAlpha = 1;
    drawSpun(ctx, SPR.pepperA, cx, cy, 11, this.t * 0.45 * Math.sign(this.vx));
  }
}

// Draw a sprite centred at (cx, cy), scaled to `size` px and rotated by `a` radians.
function drawSpun(ctx, img, cx, cy, size, a) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(a);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// Charged chili shots. Level 1 "hot pepper": a big chili flying straight, pierces three foes.
// Level 2 "chili blast": a huge blazing chili with a fire beam behind it that pierces everything
// (even fire-proof critters), smashes blocks in its path and hits the boss hard.
class ChiliShot {
  constructor(x, y, dir, level) {
    this.level = level; this.dir = dir;
    this.w = level === 2 ? 28 : 14; this.h = level === 2 ? 20 : 10;
    this.x = x - (dir > 0 ? 0 : this.w); this.y = y - this.h / 2;
    this.x0 = this.x;
    this.vx = dir * (level === 2 ? 5.2 : 5); this.t = 0; this.remove = false;
    this.pierce = level === 2 ? Infinity : 3; this.hits = new Set(); this.bumped = new Set();
  }
  update(g) {
    this.t++;
    const lv = g.level;
    this.x += this.vx;
    const big = this.level === 2, cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    // trail
    for (let i = 0; i < (big ? 4 : 2); i++) {
      g.particles.push({ kind: 'px', x: cx - this.dir * rand(4, this.w / 2 + 4), y: cy + rand(-this.h / 2, this.h / 2), vx: -this.dir * rand(0.5, 1.5), vy: rand(-0.6, 0.3), g: -0.02, life: big ? 26 : 16, t: 0, color: ['#ff3b2f', '#ff8a2a', '#ffd166', '#ffffff'][i % 4], size: big ? 2 : 1 });
    }
    if (big && this.t % 3 === 0) g.particles.push({ kind: 'pep', x: cx - this.dir * 10, y: cy + rand(-8, 8), vx: -this.dir * rand(0.4, 1.2), vy: rand(-1.2, 1.2), g: 0.05, life: 40, t: 0, spin: rand(-0.4, 0.4) });
    // terrain: blocks in a blast's path get hit; anything else stops the shot
    const c0 = Math.floor(this.x / TILE), c1 = Math.floor((this.x + this.w - 0.01) / TILE);
    const r0 = Math.floor(this.y / TILE), r1 = Math.floor((this.y + this.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = lv.get(c, r);
      if (!lv.solid(c, r)) continue;
      const block = t === T.BRICK || t === T.MULTI || t === T.QCOIN || t === T.QPOW || t === T.Q1UP;
      if (big && block) { const k = r * lv.w + c; if (!this.bumped.has(k)) { this.bumped.add(k); g.hitBlock(c, r); } continue; }
      if (big && t === T.USED) continue;
      this.pop(g); return;
    }
    if (this.x > g.camX + VIEW_W + 40 || this.x + this.w < g.camX - 40) { this.remove = true; return; }
    // foes
    for (const e of g.entities) {
      if (e.dead || this.hits.has(e)) continue;
      if (!(e.fireKill || e.fireHit || (big && e.beamKill))) continue;
      const b = e.hitbox();
      if (!b || !overlap(this, b)) continue;
      this.hits.add(e);
      if (e.fireHit) { e.fireHit(g, CHILI_DMG[this.level]); this.pop(g); return; }
      e.flipKill(g, this.dir);
      g.addScore(big ? 500 : 300, e.cx, e.y);
      g.burst(e.cx, e.y + e.h / 2, ['#ff8a2a', '#ffd166', '#ffffff'], 8);
      Sound.play('kick');
      if (--this.pierce <= 0) { this.pop(g); return; }
    }
  }
  pop(g) {
    this.remove = true;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2, big = this.level === 2;
    g.burst(cx, cy, ['#ff3b2f', '#ff8a2a', '#ffd166', '#ffffff'], big ? 30 : 12);
    if (big) { g.shake = Math.max(g.shake, 4); Sound.play('break'); }
  }
  draw(ctx) {
    const big = this.level === 2, cx = this.x + this.w / 2, cy = this.y + this.h / 2, t = this.t, d = this.dir;
    if (big) {
      // fire beam stretching back toward where it was fired
      const len = Math.min(110, Math.abs(this.x - this.x0) + 10);
      for (let i = len; i > 0; i -= 4) {
        const k = i / len, r = Math.max(2, Math.round(9 * (1 - k)) + ((t + i) % 8 < 4 ? 1 : 0));
        const bx = cx - d * i, by = cy + Math.sin(i * 0.25 - t * 0.6) * 3 * k;
        ctx.globalAlpha = 0.85 - k * 0.6;
        blob(ctx, bx, by, r + 1, '#ff3b2f'); blob(ctx, bx, by, r, k < 0.4 ? '#ffd166' : '#ff8a2a');
      }
      ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.35 + (t % 6 < 3 ? 0.15 : 0); blob(ctx, cx, cy, 18, '#ffd166'); ctx.globalAlpha = 1;
      blob(ctx, cx, cy, 12, '#ff6a1f'); blob(ctx, cx, cy, 9, '#ffd166'); blob(ctx, cx, cy, 5, '#ffffff');
      drawSpun(ctx, SPR.pepperB, cx + d * 2, cy, 30, d > 0 ? -Math.PI * 0.75 : Math.PI * 0.25);
    } else {
      for (let i = 1; i <= 4; i++) { ctx.globalAlpha = 0.6 - i * 0.12; blob(ctx, cx - d * i * 5, cy, 5 - i, '#ff8a2a'); }
      ctx.globalAlpha = 0.4; blob(ctx, cx, cy, 9, '#ffb347'); ctx.globalAlpha = 1;
      drawSpun(ctx, t % 4 < 2 ? SPR.pepperA : SPR.pepperB, cx, cy, 18, d > 0 ? -Math.PI * 0.75 : Math.PI * 0.25);
    }
  }
}

// ═══ Power-up suits: ice wand, gale feather, volt orb ═══════════════════════
// Which foes can be frozen: anything that walks, flies or swims. Hazards, the boss and things
// built into the scenery (log-worms, springs, icicles) are left alone.
function canFreeze(e) {
  if (e.dead || e.remove || e.bossHazard) return false;
  if (e instanceof IceBlock || e instanceof Boss || e instanceof Firebar || e instanceof Ember || e instanceof Spring ||
      e instanceof Stormlet || e instanceof Icicle || e instanceof Snapvine) return false;
  if (e instanceof Shellback && e.state !== 'walk' && e.state !== 'shell') return false;
  return true;
}

// A frozen foe: a block of ice with the critter inside. Leave it and it thaws out again; walk
// into it to kick it sliding, hold run to pick it up and throw it (up = lob, down = set it down).
// A thrown block bowls over the foes it hits, bursts on walls and smashes bricks.
class IceBlock extends Shellback {
  constructor(inner) {
    super(0, 0);
    this.inner = inner;
    this.w = Math.max(inner.w + 2, 14); this.h = Math.max(inner.h + 2, 14);
    this.x = inner.x + inner.w / 2 - this.w / 2; this.y = inner.y + inner.h - this.h;
    this.vx = 0; this.vy = Math.max(0, inner.vy || 0); this.state = 'shell'; this.walker = true;
    this.stompable = false; this.melt = 0; this.grace = 18; this.seed = Math.random() * 6;
  }
  update(g) {
    this.t++;
    if (this.grace > 0) this.grace--;
    const lv = g.level;
    if (this.state === 'held') { this.updateHeld(g); return; }
    if (this.state === 'slide') {
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) { this.crash(g); return; }
      if (sweepY(lv, this, this.vy)) this.vy = 0;
      if (this.t % 2 === 0) g.spark(this.cx - Math.sign(this.vx) * 6, this.y + this.h - 2, '#e6f8ff', 14, 0, -0.3);
      if (this.combo >= 2) { this.shatter(g); return; }          // spent after a couple of foes
      if (this.y > VIEW_H + 32 || this.x > g.camX + VIEW_W + 64 || this.x + this.w < g.camX - 64) this.remove = true;
      return;
    }
    if (this.state === 'toss') {
      this.vy = Math.min(this.vy + 0.3, 5);
      if (sweepX(lv, this, this.vx)) this.vx = -this.vx * 0.5;
      const r = sweepY(lv, this, this.vy);
      if (r === 1) { this.state = 'shell'; this.walker = true; this.vx = 0; this.vy = 0; this.grace = 8; }
      else if (r === -1) this.vy = 0.5;
      if (this.y > VIEW_H + 32) this.remove = true;
      return;
    }
    this.vx = 0; this.walk(g, false);
    if (++this.melt > ICE_MELT) this.thaw(g);
    else if (this.melt > ICE_MELT - 150 && this.t % 9 === 0) g.spark(this.x + rand(2, this.w - 2), this.y + this.h - 2, '#9be8ff', 18, 0, 0.3);
  }
  updateHeld(g) {
    const p = g.player;
    this.melt += 0.5;
    if (p.state !== 'play') { g.dropHeld(); return; }
    this.holdPos(p);
    if (this.melt > ICE_MELT) { this.shatter(g); return; }
    if (!Input.down('run')) g.throwHeld();
  }
  kick(g, p) {
    const dir = p.x + p.w / 2 < this.cx ? 1 : -1;
    this.state = 'slide'; this.walker = false; this.grace = 12; this.combo = 0; this.vx = 3.8 * dir;
    sweepX(g.level, this, dir > 0 ? (p.x + p.w) - this.x + 1 : (p.x - this.w) - this.x - 1);
    Sound.play('kick');
  }
  onTouch(g, p) {
    const stomp = g.isStomp(p, this);
    if (this.state === 'slide') {
      if (this.grace > 0) return;
      if (stomp) { this.state = 'shell'; this.walker = true; this.vx = 0; this.grace = 12; g.bounce(p); Sound.play('stomp'); }
      else g.hurtPlayer();
      return;
    }
    if (this.grace > 0) return;
    if (this.state === 'toss') { if (Input.down('run') && !g.held) g.pickUp(this); return; }
    if (stomp) { g.bounce(p); this.grace = 6; Sound.play('bump'); g.spark(this.cx, this.y, '#ffffff', 14); }
    else if (Input.down('run') && !g.held) g.pickUp(this);
    else this.kick(g, p);
  }
  flipKill(g) { this.shatter(g); }
  // burst on a wall; bricks in the way go with it
  crash(g) {
    const lv = g.level, dir = Math.sign(this.vx);
    const c = dir > 0 ? Math.floor((this.x + this.w + 0.5) / TILE) : Math.floor((this.x - 0.5) / TILE);
    for (let r = Math.floor(this.y / TILE); r <= Math.floor((this.y + this.h - 1) / TILE); r++) {
      if (lv.get(c, r) === T.BRICK) { lv.set(c, r, T.EMPTY); g.breakBrick(c, r); }
    }
    this.shatter(g);
  }
  shatter(g) {
    if (this.dead) return;
    this.dead = true; this.remove = true;
    if (g.held === this) g.held = null;
    const cx = this.cx, cy = this.y + this.h / 2;
    for (let i = 0; i < 14; i++) g.particles.push({ kind: 'px', x: cx + rand(-5, 5), y: cy + rand(-5, 5), vx: rand(-2.2, 2.2), vy: rand(-3, 0.5), g: 0.25, life: 36, t: 0, color: ['#ffffff', '#bff0ff', '#7fd4ff'][i % 3], size: 2 });
    g.burst(cx, cy, ['#ffffff', '#bff0ff'], 8);
    g.shake = Math.max(g.shake, 1.5);
    Sound.play('shatter');
  }
  thaw(g) {
    const e = this.inner;
    e.x = this.cx - e.w / 2; e.y = this.y + this.h - e.h; e.vy = 0; e.dead = false; e.remove = false;
    g.entities.push(e);
    this.remove = true;
    for (let i = 0; i < 8; i++) g.spark(this.cx + rand(-6, 6), this.y + rand(0, this.h), '#e6f8ff', 22, rand(-0.3, 0.3), rand(-0.9, -0.2));
    Sound.play('select');
  }
  draw(ctx, g) {
    const e = this.inner;
    e.x = this.x + (this.w - e.w) / 2; e.y = this.y + this.h - e.h - 1;
    const warn = this.state !== 'slide' && this.state !== 'toss' && this.melt > ICE_MELT - 150;
    const wob = warn && Math.floor(this.t / 2) % 2 ? 1 : 0;
    ctx.save();
    ctx.translate(wob, 0);
    e.draw(ctx, g);
    const x = Math.round(this.x), y = Math.round(this.y), w = this.w, h = this.h;
    ctx.fillStyle = '#2a6fb0';                                    // outline
    ctx.fillRect(x + 1, y - 1, w - 2, 1); ctx.fillRect(x + 1, y + h, w - 2, 1);
    ctx.fillRect(x - 1, y + 1, 1, h - 2); ctx.fillRect(x + w, y + 1, 1, h - 2);
    ctx.globalAlpha = warn ? 0.3 : 0.4; ctx.fillStyle = '#9be8ff';
    ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e6fbff'; ctx.fillRect(x + 1, y, w - 2, 1); ctx.fillRect(x, y + 1, 1, h - 2);
    ctx.fillStyle = '#4fb4ec'; ctx.fillRect(x + 1, y + h - 1, w - 2, 1); ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
    ctx.fillStyle = '#ffffff';                                    // shine
    ctx.fillRect(x + 2, y + 2, 3, 1); ctx.fillRect(x + 2, y + 3, 1, 3); ctx.fillRect(x + w - 5, y + h - 4, 2, 1);
    const gl = Math.floor((this.t * 0.5 + this.seed * 3) % (w + h + 12)) - 6;   // moving glint
    for (let i = 0; i < 4; i++) { const gx = gl - i, gy = i; if (gx > 1 && gx < w - 1 && gy > 0 && gy < h - 1) ctx.fillRect(x + gx, y + gy, 1, 1); }
    if (warn) {                                                   // cracks as it melts
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 1, 1, 3); ctx.fillRect(x + 5, y + 4, 1, 2); ctx.fillRect(x + w - 6, y + h - 5, 1, 3);
    }
    ctx.restore();
  }
}

// Frost bolt: freezes the first foe it touches into an IceBlock (the boss just takes a chill).
class IceBolt {
  constructor(x, y, dir) {
    this.x = x; this.y = y; this.w = 8; this.h = 8; this.dir = dir; this.vx = dir * 4.6;
    this.t = 0; this.remove = false; this.level = 9;
  }
  update(g) {
    this.t++;
    if (sweepX(g.level, this, this.vx)) { this.pop(g); return; }
    if (this.t % 2 === 0) g.spark(this.x + 4 - this.dir * 3, this.y + 4 + rand(-2, 2), this.t % 4 ? '#ffffff' : '#9be8ff', 18, -this.dir * 0.3, rand(-0.2, 0.4));
    if (this.x < g.camX - 24 || this.x > g.camX + VIEW_W + 24 || this.y > VIEW_H) { this.remove = true; return; }
    for (const e of g.entities) {
      if (e.dead || e.remove) continue;
      const b = e.hitbox();
      if (!b || !overlap(this, b)) continue;
      if (e.iceHit) { e.iceHit(g); this.pop(g); return; }
      if (!canFreeze(e)) continue;
      g.freezeEnemy(e);
      this.pop(g);
      return;
    }
  }
  pop(g) {
    this.remove = true;
    for (let i = 0; i < 7; i++) g.spark(this.x + 4, this.y + 4, i % 2 ? '#ffffff' : '#7fd4ff', 18, rand(-1.4, 1.4), rand(-1.4, 1.4));
  }
  draw(ctx) {
    const cx = Math.round(this.x + 4), cy = Math.round(this.y + 4), d = this.dir;
    ctx.globalAlpha = 0.35; blob(ctx, cx - d * 4, cy, 3, '#9be8ff'); blob(ctx, cx - d * 8, cy, 2, '#cdefff'); ctx.globalAlpha = 1;
    ctx.fillStyle = '#9be8ff';
    if (this.t % 6 < 3) { ctx.fillRect(cx - 1, cy - 4, 2, 8); ctx.fillRect(cx - 4, cy - 1, 8, 2); }
    else { for (let i = -3; i <= 3; i++) { ctx.fillRect(cx + i, cy + i, 1, 1); ctx.fillRect(cx + i, cy - i, 1, 1); } ctx.fillRect(cx - 2, cy - 2, 4, 4); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }
}

// Gale gust: a pulse of wind that hurls foes away, sends shells and ice sliding, blows enemy
// shots off course and scoops up pollen in its path.
class Gust {
  constructor(x, y, dir) {
    this.dir = dir; this.w = 20; this.h = 28; this.x = x - (dir > 0 ? 0 : this.w); this.y = y - this.h / 2;
    this.vx = dir * 3.4; this.t = 0; this.remove = false; this.level = 9; this.hits = new Set();
  }
  update(g) {
    this.t++;
    const lv = g.level, d = this.dir;
    this.x += this.vx;
    if (this.t > 38 || lv.solid(Math.floor((this.x + (d > 0 ? this.w : 0)) / TILE), Math.floor((this.y + this.h / 2) / TILE))) { this.remove = true; return; }
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    for (let i = 0; i < 2; i++) g.particles.push({ kind: 'px', x: cx - d * rand(0, 8), y: cy + rand(-12, 12), vx: -d * rand(0.2, 1), vy: rand(-0.2, 0.2), life: 14, t: 0, color: i ? '#ffffff' : '#d8ffe4', size: 1, streak: 4 });
    for (let r = Math.floor(this.y / TILE); r <= Math.floor((this.y + this.h) / TILE); r++) {
      for (let c = Math.floor(this.x / TILE); c <= Math.floor((this.x + this.w) / TILE); c++) {
        if (lv.get(c, r) === T.COIN) { lv.set(c, r, T.EMPTY); g.addCoin(); g.addScore(200); g.pollenFly(c * TILE + 8, r * TILE + 8, 0, -1.5, 0); }
      }
    }
    for (const e of g.entities) {
      if (e.dead || e.remove || this.hits.has(e) || e === g.held) continue;
      const b = e.hitbox();
      if (!b || !overlap(this, b)) continue;
      this.hits.add(e);
      if (e.bossHazard) { e.remove = true; g.burst(e.cx, e.y + e.h / 2, ['#ffffff', '#d8ffe4'], 6); Sound.play('kick'); continue; }
      if (e instanceof Shellback && e.state === 'shell') {
        e.state = 'slide'; e.walker = false; e.grace = 0; e.combo = 0; e.vx = 3.8 * d; Sound.play('kick');
        continue;
      }
      if (e.fireHit) { e.fireHit(g, 1); continue; }
      if (!e.fireKill) continue;
      e.flipKill(g, d);
      g.addScore(200, e.cx, e.y);
      g.burst(e.cx, e.y + e.h / 2, ['#ffffff', '#d8ffe4', '#9ae8a8'], 8);
      Sound.play('kick');
    }
  }
  draw(ctx) {
    const d = this.dir, cx = this.x + this.w / 2, cy = this.y + this.h / 2, a = 1 - this.t / 44;
    ctx.fillStyle = '#ffffff';
    for (let k = -1; k <= 1; k++) {
      for (let i = 0; i < 11; i++) {
        ctx.globalAlpha = Math.max(0, a * (1 - i / 12));
        const x = cx - d * (i * 1.6 - 6), y = cy + k * 8 + Math.sin(i * 0.55 - this.t * 0.7 + k) * 2.5 + Math.abs(k) * (i * 0.15);
        ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
      }
    }
    ctx.globalAlpha = a * 0.3; blob(ctx, cx, cy, 11, '#d8ffe4'); ctx.globalAlpha = 1;
  }
}

// Lightning: jagged polylines drawn pixel by pixel, flickering for a few frames.
function plotLine(ctx, x0, y0, x1, y1, a) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
    ctx.globalAlpha = 0.35 * a; ctx.fillStyle = '#7ad7ff'; ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}
function boltLine(ctx, a, b, alpha) {
  const [x0, y0] = a, [x1, y1] = b;
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9));
  const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const k = i / n, j = i === n ? 0 : rand(-5, 5);
    const x = x0 + (x1 - x0) * k + nx / nl * j, y = y0 + (y1 - y0) * k + ny / nl * j;
    plotLine(ctx, px, py, x, y, alpha);
    px = x; py = y;
  }
}
class Zap {
  constructor(pts) { this.pts = pts; this.t = 0; this.remove = false; this.level = 9; }
  update() { if (++this.t > 9) this.remove = true; }
  draw(ctx) {
    const a = 1 - this.t / 10;
    for (let i = 0; i + 1 < this.pts.length; i++) boltLine(ctx, this.pts[i], this.pts[i + 1], a);
    const [x, y] = this.pts[this.pts.length - 1];
    ctx.globalAlpha = a * 0.5; blob(ctx, x, y, 6, '#fff6a0'); ctx.globalAlpha = 1;
  }
}
// A bolt from the sky onto one foe (the full-charge thunderstorm fires a volley of these).
class Strike {
  constructor(e, x, y, delay) { this.e = e; this.x = x; this.y = y; this.delay = delay; this.t = 0; this.remove = false; this.level = 9; }
  update(g) {
    this.t++;
    if (this.t === this.delay) {
      const e = this.e;
      if (e && !e.dead && !e.remove) {
        const b = e.hitbox();
        if (b) { this.x = b.x + b.w / 2; this.y = b.y + b.h / 2; }
        g.voltHit(e, true);
      }
      g.burst(this.x, this.y, ['#fff6a0', '#7ad7ff', '#ffffff'], 8);
      Sound.play('volt');
    }
    if (this.t > this.delay + 9) this.remove = true;
  }
  draw(ctx) {
    if (this.t < this.delay) return;
    const a = 1 - (this.t - this.delay) / 10;
    boltLine(ctx, [this.x, 0], [this.x, this.y], a);
    ctx.globalAlpha = a * 0.6; blob(ctx, this.x, this.y, 8, '#fff6a0'); ctx.globalAlpha = 1;
  }
}

class Platform {
  constructor(col, row, wt, axis, range, period, phase = 0) {
    this.x0 = col * TILE; this.y0 = row * TILE; this.w = wt * TILE; this.h = 8;
    this.axis = axis; this.range = range * TILE; this.period = period; this.phase = phase; this.t = 0;
    this.dx = 0; this.dy = 0;
    // ragged ends: per-row insets (0-2px) from a seeded random walk
    const rng = mulberry32(hashStr(col + ',' + row + ',' + axis)), walk = () => { const a = []; let d = 1; for (let i = 0; i < 8; i++) { const r = rng(); d += r < 0.35 ? -1 : r < 0.7 ? 1 : 0; d = Math.max(0, Math.min(2, d)); a.push(d); } return a; };
    this.jagL = walk(); this.jagR = walk();
    this.place();
    this.prevY = this.y;
  }
  place() {
    const k = 0.5 - 0.5 * Math.cos((this.t / this.period + this.phase) * Math.PI * 2);
    this.x = this.axis === 'h' ? this.x0 + this.range * k : this.x0;
    this.y = this.axis === 'v' ? this.y0 + this.range * k : this.y0;
  }
  update() {
    const ox = this.x, oy = this.y;
    this.t++;
    this.place();
    this.dx = this.x - ox; this.dy = this.y - oy; this.prevY = oy;
  }
  draw(ctx, th) {
    const [b, d, l] = th.plat;
    const x = Math.round(this.x), y = Math.round(this.y);
    for (let yy = 0; yy < this.h; yy++) {
      const a = this.jagL[yy], w = this.w - a - this.jagR[yy];
      ctx.fillStyle = d; ctx.fillRect(x + a, y + yy, w, 1);
      if (yy >= 1 && yy <= 4 && w > 2) { ctx.fillStyle = yy === 1 ? l : b; ctx.fillRect(x + a + 1, y + yy, w - 2, 1); }
    }
    ctx.fillStyle = d;
    for (let i = 4; i < this.w - 2; i += 8) ctx.fillRect(x + i, y + 3, 2, 2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. GAME
// ═══════════════════════════════════════════════════════════════════════════
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.mode = 'title';
    this.t = 0; this.menu = 0;
    this.top = parseInt(safeStorage.get('boyo-top') || safeStorage.get('omira-top') || '0', 10) || 0;
    this.lives = 3; this.score = 0; this.coins = 0; this.power = 0; this.suit = null; this.levelIndex = 0;
    this.fade = 1; this.fadeTarget = 0; this.fadeCb = null;
    this.ambient = []; this.particles = [];
    this.titleCam = 0; this.flash = 0; this.shake = 0;
    this.player = null; this.level = null;
    this.menuHits = []; this.touch = false;
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
      return {
        level: o.level, lives: clamp(o.lives | 0, 1, 99), score: Math.max(0, o.score | 0), coins: clamp(o.coins | 0, 0, 99), power,
        suit: power === 2 ? (SUIT_INFO[o.suit] ? o.suit : 'fire') : null,
      };
    } catch (e) { return null; }
  }
  writeSave(o) { safeStorage.set(SAVE_KEY, JSON.stringify(o)); this.save = this.loadSave(); }
  clearSave() { safeStorage.set(SAVE_KEY, 'null'); this.save = null; }
  persist() {
    this.writeSave({ level: this.levelIndex, lives: this.lives, score: this.score, coins: this.coins, power: this.power, suit: this.suit });
  }
  newGame(practice = false) {
    this.lives = 3; this.score = 0; this.coins = 0; this.power = 0; this.suit = null; this.levelIndex = 0;
    this.practice = practice;
    if (!practice) this.clearSave();
    this.enterLevel();
  }
  continueGame() {
    const s = this.save;
    if (!s) { this.newGame(); return; }
    Object.assign(this, { lives: s.lives, score: s.score, coins: s.coins, power: s.power, suit: s.suit, levelIndex: s.level, practice: false });
    this.enterLevel();
  }
  enterLevel() {
    this.snapshot = { score: this.score, coins: this.coins, power: this.power, suit: this.suit };
    this.useCheckpoint = false;
    Music.memo = null;
    this.persist();
    this.toIntro();
  }
  titleItems() {
    const items = this.save
      ? [{ label: 'CONTINUE ' + LEVELS[this.save.level].id, act: 'continue' }, { label: 'NEW GAME', act: 'new' }]
      : [{ label: 'START GAME', act: 'new' }];
    items.push({ label: 'LEVEL SELECT', act: 'select' });
    return items;
  }
  titleSelectIdx() { return this.save ? 2 : 1; }
  toIntro() { this.mode = 'intro'; this.introT = 0; this.time = LEVELS[this.levelIndex].time; Music.stop(); }
  toTitle() { Music.memo = null; this.saveTop(); this.mode = 'title'; this.menu = 0; this.particles = []; Music.shuffle('title'); Music.play('title'); }
  toGameOver() {
    this.saveTop();
    this.writeSave({ level: this.levelIndex, lives: 3, score: 0, coins: 0, power: 0, suit: null });   // 'continue' restarts the level on 3 lives
    this.mode = 'gameover'; this.menu = 0; Music.play('gameover');
  }
  pause() { this.mode = 'pause'; this.menu = 0; Sound.play('pause'); Music.pause(); }
  resume() { this.mode = 'play'; Music.resume(this.levelMusic, this.hurry ? 1.3 : this.bossMusic ? 1.18 : 1); }

  startLevel() {
    const def = LEVELS[this.levelIndex];
    const lv = this.level = new Level(def);
    this.levelMusic = def.music;
    this.entities = []; this.items = []; this.fireballs = []; this.particles = [];
    this.boss = null; this.arenaCam = null; this.camPx = null; this.held = null;
    this.windT = 0; this.windForce = 0; this.windPhase = 'calm'; this.windDir = 1; this.bossMusic = false;
    this.platforms = def.entities.filter(e => e[0] === 'platform').map(e => new Platform(e[1], e[2], e[3], e[4], e[5], e[6], e[7]));
    this.spawnQueue = def.entities.filter(e => e[0] !== 'platform').map(e => ({ def: e, x: e[1] * TILE })).sort((a, b) => a.x - b.x);
    const col = this.useCheckpoint && def.checkpoint ? def.checkpoint : def.start;
    const p = this.player = {
      x: col * TILE + 2, y: 0, w: PLAYER_W, h: this.power ? BIG_H : SMALL_H, vx: 0, vy: 0,
      power: this.power, suit: this.power === 2 ? (this.suit || 'fire') : null, facing: 1, onGround: false, coyote: 0, jumpBuf: 0, jumping: false, airMax: WALK_MAX,
      invuln: 0, anim: 0, sx: 1, sy: 1, state: 'play', platform: null, skid: false, combo: 0,
      prevY: 0, fallV: 0, hidden: false, deadT: 0, celebT: 0, springAir: false, stroke: 0, crouch: false, charge: 0, spin: false, spinQueued: false, holdGrace: 0, pressT: -99, stompT: -99, stompY: 0, stompSmall: false,
      roll: 0, rollDir: 1, rollSpeed: 0, rollCool: 0, rollSpin: 0,
      flaps: 0, gustCool: 0, cool: 0, gliding: false, pounding: false, poundT: 0, wand: 0,
    };
    p.y = lv.surfaceRow(col) * TILE - p.h;
    p.prevY = p.y;
    this.time = def.time; this.timeAcc = 0; this.hurry = false;
    this.checkpointReached = this.useCheckpoint && !!def.checkpoint;
    this.tip = null;
    this.freezeT = 0; this.freezeFrom = 0; this.tally = false; this.tallyT = 0;
    this.flash = 0; this.shake = 0; this.look = 0;
    this.updateCamera(true);
    this.spawnQueue = this.spawnQueue.filter(s => s.x >= this.camX - 32);
    this.mode = 'play';
    const memo = Music.memo; Music.memo = null;
    if (memo && memo.level === def.id && memo.name === def.music) { Music.picked[def.music] = memo.idx; Music.play(def.music, 1, memo.pos); }   // respawn: same track, same spot
    else { Music.shuffle(def.music); Music.play(def.music); }
  }
  finishLevel() {
    this.power = this.player.power; this.suit = this.player.suit;
    this.saveTop();
    this.mode = 'clear'; this.clearT = 0;
  }
  afterDeath() {
    this.lives--;
    this.power = 0; this.suit = null;
    if (this.lives > 0) this.persist();
    if (this.lives <= 0) this.toGameOver();
    else { this.useCheckpoint = this.checkpointReached; this.toIntro(); }
  }

  // ---------- update ---------------------------------------------------------
  update() {
    this.t++;
    this.updateFade();
    const busy = !!this.fadeCb;
    const confirm = Input.hit('start') || Input.hit('jump');
    switch (this.mode) {
      case 'title': {
        this.titleCam += 0.6;
        if (busy) break;
        const items = this.titleItems(), n = items.length;
        if (Input.hit('up')) { this.menu = (this.menu + n - 1) % n; Sound.play('select'); }
        if (Input.hit('down')) { this.menu = (this.menu + 1) % n; Sound.play('select'); }
        if (confirm) {
          const act = (items[this.menu] || items[0]).act;
          if (act === 'continue') { Sound.play('confirm'); this.transition(() => this.continueGame()); }
          else if (act === 'new') { Sound.play('confirm'); this.transition(() => this.newGame()); }
          else if (act === 'select') { Sound.play('confirm'); this.mode = 'select'; this.menu = 0; }
        }
        break;
      }
      case 'select': {
        this.titleCam += 0.6;
        if (busy) break;
        const n = LEVELS.length + 1;   // levels + BACK
        if (Input.hit('pause') || Input.hit('roll')) { this.mode = 'title'; this.menu = this.titleSelectIdx(); Sound.play('select'); break; }
        if (Input.hit('up')) { this.menu = (this.menu + n - 1) % n; Sound.play('select'); }
        if (Input.hit('down')) { this.menu = (this.menu + 1) % n; Sound.play('select'); }
        if (confirm) {
          if (this.menu === LEVELS.length) { this.mode = 'title'; this.menu = this.titleSelectIdx(); Sound.play('select'); }
          else { Sound.play('confirm'); const i = this.menu; this.transition(() => { this.newGame(true); this.levelIndex = i; this.enterLevel(); }); }
        }
        break;
      }
      case 'intro':
        this.introT++;
        if (!busy && (this.introT > 150 || (this.introT > 30 && confirm))) this.transition(() => this.startLevel());
        break;
      case 'play': this.updatePlay(busy); break;
      case 'pause': {
        if (busy) break;
        if (Input.hit('pause')) { this.resume(); break; }
        if (Input.hit('up')) { this.menu = (this.menu + 4) % 5; Sound.play('select'); }
        if (Input.hit('down')) { this.menu = (this.menu + 1) % 5; Sound.play('select'); }
        if (this.menu === 2 || this.menu === 3) {
          const dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
          this.volRep = dir && this.volRep > 0 ? this.volRep - 1 : 0;
          if (dir && (Input.hit('left') || Input.hit('right') || this.volRep === 0)) {
            if (!(Input.hit('left') || Input.hit('right'))) this.volRep = 4; else this.volRep = 14;
            Sound.setVol(this.menu === 2 ? 'music' : 'sfx', (this.menu === 2 ? Sound.musicVol : Sound.sfxVol) + dir * 0.05);
            if (this.menu === 3) Sound.play('coin');
          }
        }
        if (confirm) {
          if (this.menu === 0) this.resume();
          else if (this.menu === 1) this.transition(() => {
            Object.assign(this, { score: this.snapshot.score, coins: this.snapshot.coins, power: this.snapshot.power, suit: this.snapshot.suit });
            this.useCheckpoint = false; this.toIntro();
          });
          else if (this.menu === 4) this.transition(() => this.toTitle());
        }
        break;
      }
      case 'clear':
        this.clearT++;
        this.updateParticles();
        if (!busy && this.clearT > 60 && (confirm || this.clearT > 420)) {
          if (this.levelIndex + 1 < LEVELS.length) this.transition(() => { this.levelIndex++; this.enterLevel(); });
          else this.transition(() => { this.clearSave(); this.toTitle(); });   // newest level: more are on the way
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
    this.updateAmbient();
  }

  updatePlay(busy) {
    const p = this.player;
    if (!busy && Input.hit('pause') && p.state !== 'dead' && !this.tally) { this.pause(); return; }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - 0.02);
    this.shake *= 0.85;
    if (this.freezeT > 0) { this.freezeT--; this.updateParticles(); return; }
    if (p.state === 'dead') { this.updateDeath(); this.updateParticles(); return; }

    for (const pl of this.platforms) pl.update();
    this.spawnEntities();
    this.updatePlayer();
    for (const e of this.entities) { if (e.dead) e.updateDead(this); else e.update(this); }
    this.enemyInteractions();
    for (const it of this.items) {
      it.update(this);
      if (!it.emerging && p.state === 'play' && overlap(it, p)) { it.remove = true; this.collectItem(it); }
    }
    for (const f of this.fireballs) f.update(this);
    const lv = this.level;
    this.updateCrumbles();
    if (lv.def.wind) this.updateWind();
    if (lv.water) this.currentFx();
    for (const b of lv.bumps) b.t++;
    lv.bumps = lv.bumps.filter(b => b.t < 10);
    this.updateParticles();

    if (this.tip && ++this.tip.t > TIP_FRAMES) this.tip = null;
    if (p.state === 'play' && ++this.timeAcc >= 24) {
      this.timeAcc = 0;
      this.time--;
      if (this.time === 100 && !this.hurry) { this.hurry = true; Sound.play('hurry'); Music.play(this.levelMusic, 1.3); }
      if (this.time <= 0) { this.time = 0; this.killPlayer('time'); }
    }
    if (this.tally) {
      if (this.time > 0) {
        const d = Math.min(this.time, 2);
        this.time -= d; this.score += d * 50;
        if (this.t % 3 === 0) Sound.play('tick');
      } else if (++this.tallyT > 80) { this.tally = false; this.finishLevel(); }
    }
    this.updateCamera(false);
    this.entities = this.entities.filter(e => !e.remove);
    this.items = this.items.filter(i => !i.remove);
    this.fireballs = this.fireballs.filter(f => !f.remove);
  }

  updatePlayer() {
    const p = this.player, lv = this.level;
    p.prevY = p.y;
    if (p.invuln > 0) p.invuln--;
    p.sx += (1 - p.sx) * 0.2; p.sy += (1 - p.sy) * 0.2;
    switch (p.state) {
      case 'play': {
        this.updateCrouch(p);
        this.tryRoll(p);
        const ctl = {
          dir: (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0),
          run: Input.down('run'),
          jumpHit: Input.hit('jump') || Input.hit('up'),
          jumpHeld: Input.down('jump') || Input.down('up') || Input.down('spin'),
          spinHit: Input.hit('spin'),
        };
        this.physics(p, ctl);
        this.tickRoll(p);
        if (this.windForce && p.state === 'play') sweepX(this.level, p, this.windForce * (p.onGround ? 0.7 : 1));
        this.updatePowers(p);
        if (p.state === 'play') this.checkPlayerTiles();
        if (p.state === 'play') this.checkGoal();
        break;
      }
      case 'celebrate':
        this.physics(p, { dir: 0, run: false, jumpHit: false, jumpHeld: false });
        p.celebT++;
        if (p.celebT % 12 === 0) { const [hx, hy] = this.heldGoalPos(); this.burst(hx + rand(-10, 10), hy + rand(-10, 10), GOAL_FX[lv.def.goal.type] || GOAL_FX.crystal, 6); }
        if (p.celebT === 150) { p.state = 'done'; this.startTally(); }
        break;
      case 'done':
        if (!p.hidden) this.physics(p, { dir: 0, run: false, jumpHit: false, jumpHeld: false });
        p.celebT++;   // keep dancing while the bonus counts up
        break;
    }
    // Checkpoint
    const cp = lv.def.checkpoint;
    if (cp && !this.checkpointReached && p.state === 'play' && p.x > cp * TILE) {
      this.checkpointReached = true;
      Sound.play('checkpoint');
      this.popup(cp * TILE + 8, lv.surfaceRow(cp) * TILE - 40, 'CHECKPOINT');
      this.burst(cp * TILE + 8, lv.surfaceRow(cp) * TILE - 24, ['#2ec4b6', '#ffd166', '#ffffff'], 12);
    }
  }

  // Core platforming physics. `ctl` is {dir, run, jumpHit, jumpHeld}.
  physics(p, ctl) {
    const lv = this.level;
    this.unstick(p);
    if (p.platform) { sweepX(lv, p, p.platform.dx); p.y += p.platform.dy; }

    if (lv.water) this.swim(p, ctl);
    else {
      // Horizontal: momentum with walk/run caps, skidding and friction
      // ducking on the ground: no walking (just turn around), slide on with reduced friction
      const rolling = p.roll > 0;
      const dir = rolling || (p.crouch && p.onGround) ? 0 : ctl.dir;
      if (p.crouch && p.onGround && ctl.dir) p.facing = ctl.dir;
      if (rolling) {
        if (p.onGround) { const target = p.rollDir * p.rollSpeed * (p.roll < 6 ? 0.6 + p.roll * 0.066 : 1); p.vx += (target - p.vx) * 0.25; }
        p.skid = false; p.airMax = Math.abs(p.vx);
      } else if (p.onGround) {
        const max = ctl.run ? RUN_MAX : WALK_MAX;
        const ice = this.onIce(p) ? 1 : 0;   // ice: weak grip both ways
        p.skid = false;
        if (dir !== 0) {
          p.facing = dir;
          const sp = Math.abs(p.vx);
          if (p.vx * dir < 0) {
            p.vx += dir * SKID * (ice ? 0.3 : 1); p.skid = true;
            if (this.t % 5 === 0) this.dust(p.x + p.w / 2, p.y + p.h, 1);
          } else if (sp <= max) p.vx = dir * Math.min(max, sp + (sp < WALK_MAX ? ACCEL : RUN_ACCEL) * (ice ? 0.4 : 1));
          else p.vx -= Math.sign(p.vx) * Math.min(FRICTION * (ice ? 0.15 : 1), sp - max);
        } else {
          const s = Math.abs(p.vx) - (p.crouch ? FRICTION * 0.5 : FRICTION) * (ice ? 0.15 : 1);
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

      // Jump: buffer + coyote time; jump height scales with horizontal speed
      if (ctl.jumpHit || ctl.spinHit) {
        p.jumpBuf = JUMP_BUFFER; p.spinQueued = !!ctl.spinHit && !this.held; p.pressT = this.t;
        // pressed just AFTER a small stomp bounce: upgrade it to the full jump
        if (p.stompSmall && this.t - p.stompT <= STOMP_LATE && p.vy < 0) {
          // top up to the same total rise as a full jump, counting what we've already climbed
          const vFull = JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS, hFull = vFull * vFull / (2 * GRAV_HOLD);
          const left = Math.max(10, hFull - Math.max(0, p.stompY - p.y));
          p.vy = Math.min(p.vy, -Math.min(vFull, Math.sqrt(2 * GRAV_HOLD * left)));
          p.holdGrace = 34; p.jumping = true; p.stompSmall = false; p.jumpBuf = 0;
        }
      } else if (p.jumpBuf > 0) p.jumpBuf--;
      if (p.onGround || rolling) p.coyote = COYOTE; else if (p.coyote > 0) p.coyote--;
      if (p.jumpBuf > 0 && p.coyote > 0) {
        if (rolling) { this.endRoll(p); p.crouch = false; }       // roll-jump: keep the speed
        p.vy = -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS) * (p.spinQueued ? SPIN_JUMP : 1);
        p.spin = p.spinQueued; p.spinQueued = false;
        if (p.spin) { this.standUp(p); Sound.play('spin'); }
        p.jumping = true; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.platform = null;
        p.airMax = Math.max((ctl.run || Math.abs(p.vx) > WALK_MAX + 0.05) ? RUN_MAX : WALK_MAX, Math.abs(p.vx));
        p.sx = 0.78; p.sy = 1.24;
        if (!p.spin) Sound.play(p.power ? 'jumpBig' : 'jump');
        this.dust(p.x + p.w / 2, p.y + p.h, 3);
      }

      // Gravity: light while rising with jump held, heavy otherwise (variable height)
      if (p.holdGrace > 0) p.holdGrace--;
      if (!ctl.jumpHeld && !p.holdGrace) p.jumping = false;
      let g = p.vy < 0 && p.jumping ? GRAV_HOLD : GRAV;
      if (p.jumping && Math.abs(p.vy) < 1) g = Math.min(g, GRAV_APEX);
      p.vy = Math.min(p.vy + g, MAX_FALL);
      // gale feather: hold jump while falling to glide
      p.gliding = p.power === 2 && p.suit === 'gale' && ctl.jumpHeld && p.vy > 0.75 && !p.onGround && !p.pounding;
      if (p.gliding) { p.vy = 0.75; p.airMax = Math.max(p.airMax, 1.7); }
      // quake mallet: hang for a beat, then slam straight down
      if (p.pounding) { p.vx = 0; p.vy = ++p.poundT <= POUND_HANG ? 0 : POUND_SPEED; }
    }

    const ox = p.x;
    if (sweepX(lv, p, p.vx)) {
      // Ledge assist: if we clip a ledge corner by a few pixels while falling, pop up onto it.
      let assisted = false;
      if (!p.onGround && p.vy >= 0) {
        const bottom = p.y + p.h, top = Math.floor((bottom - 0.01) / TILE) * TILE;
        if (bottom - top <= 6) {
          const sx = p.x, sy = p.y;
          p.x = ox; p.y = top - p.h;
          if (!this.overlapsSolid(p) && !sweepX(lv, p, p.vx)) { assisted = true; p.vy = 0.01; }
          else { p.x = sx; p.y = sy; }
        }
      }
      if (!assisted) { p.vx = 0; p.skid = false; }
    }

    // Vertical, resolved by hand: semi-solids, moving platforms, hidden blocks,
    // head-bonks and corner correction.
    const prevTop = p.y, prevBottom = p.y + p.h;
    p.y += p.vy;
    let landed = false;
    p.platform = null;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    if (p.vy > 0) {
      let landY = Infinity, plat = null, smashed = false;
      const r = Math.floor((p.y + p.h) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (p.pounding && lv.get(c, r) === T.BRICK) { lv.set(c, r, T.EMPTY); this.breakBrick(c, r); continue; }   // slam through
        if (p.spin && p.power > 0 && lv.get(c, r) === T.BRICK) { lv.set(c, r, T.EMPTY); this.breakBrick(c, r); smashed = true; continue; }
        if (lv.solid(c, r) || (lv.get(c, r) === T.SEMI && prevBottom <= r * TILE + 0.5)) { landY = r * TILE; break; }
      }
      for (const pl of this.platforms) {
        if (p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1 && prevBottom <= Math.max(pl.y, pl.prevY) + 1 && p.y + p.h >= pl.y && pl.y < landY) {
          landY = pl.y; plat = pl;
        }
      }
      if (smashed) {
        // spin-smashing a crate pops Boyo back up off the debris, still spinning (classic)
        // same launch as the spin jump itself (same speed formula, same hold-to-rise)
        p.y = r * TILE - p.h; p.vy = -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS) * SPIN_JUMP; p.jumping = true; p.platform = null;
        this.dust(p.x + p.w / 2, r * TILE, 5);
      } else if (landY !== Infinity) { p.fallV = p.vy; p.y = landY - p.h; landed = true; p.platform = plat; }
    } else if (p.vy < 0) {
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
          p.jumping = false;
          const pc = Math.floor((p.x + p.w / 2) / TILE);
          this.hitBlock(blocking.includes(pc) ? pc : blocking[0], r);
        }
      }
    }
    if (lv.water && p.y < lv.water.top * TILE) { p.y = lv.water.top * TILE; if (p.vy < 0) p.vy = 0; }
    const was = p.onGround;
    p.onGround = landed;
    if (landed) {
      if (!was) {
        const imp = p.fallV;
        p.sx = 1 + Math.min(0.3, imp * 0.06); p.sy = 1 - Math.min(0.25, imp * 0.05);
        if (imp > 3.5) this.dust(p.x + p.w / 2, p.y + p.h, 4);
      }
      p.vy = 0; p.jumping = false; p.combo = 0; p.springAir = false; p.spin = false;
      if (p.pounding) this.poundLand(p);
    }
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
    for (const [x0, x1, fx, fy] of lv.def.currents || []) {
      if (cx < x0 * TILE || cx >= (x1 + 1) * TILE) continue;
      if (fx) sweepX(lv, p, fx);
      if (fy) { p.vy = clamp(p.vy + fy, -3, SWIM_SINK + 0.6); if (fy < 0) p.onGround = false; }
    }
  }
  onIce(p) {
    const lv = this.level, r = Math.floor((p.y + p.h + 1) / TILE);
    for (let c = Math.floor(p.x / TILE); c <= Math.floor((p.x + p.w - 0.01) / TILE); c++) if (lv.get(c, r) === T.ICE) return true;
    return false;
  }
  // Wind cycle: calm -> warning -> gust (ramping in and out). Gusts alternate direction.
  updateWind() {
    const w = this.level.def.wind, cyc = w.calm + w.warn + w.gust, k = (++this.windT) % cyc;
    if (k === 1) this.windDir = this.windDir === -1 ? 1 : -1;
    this.windPhase = k < w.calm ? 'calm' : k < w.calm + w.warn ? 'warn' : 'gust';
    if (k === w.calm) Sound.play('gustWarn');
    if (k === w.calm + w.warn) Sound.play('gust');
    const gk = k - w.calm - w.warn;
    const ramp = this.windPhase === 'gust' ? Math.max(0, Math.min(1, gk / 20, (w.gust - gk) / 20)) : 0;
    this.windForce = this.windDir * w.force * ramp;
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
    if (p.roll > 0 || p.rollCool > 0 || !Input.hit('roll')) return;
    if (!p.onGround || p.crouch || this.held || this.level.water) return;
    const dir = ((Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0)) || p.facing;
    p.roll = ROLL_T; p.rollDir = dir; p.facing = dir; p.skid = false;
    p.rollSpeed = Math.min(ROLL_MAX, Math.max(ROLL_SPEED, Math.abs(p.vx) + 0.3));
    const low = p.power ? CROUCH_BIG_H : CROUCH_SMALL_H;
    p.y += p.h - low; p.h = low;
    Sound.play('roll');
    this.dust(p.x + p.w / 2, p.y + p.h, 5);
  }
  tickRoll(p) {
    if (p.roll <= 0) return;
    p.rollSpin += 0.5 * p.rollDir;
    if (p.onGround && this.t % 3 === 0) this.dust(p.x + p.w / 2 - p.rollDir * 4, p.y + p.h, 1);
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
  // Spin jump landing on an enemy: stompable foes vanish in a puff of smoke; spiky ones (hedgehogs,
  // urchins, log-worms) are a safe springboard. Fire, hazards and the boss work as usual.
  spinHit(e) {
    const p = this.player;
    if (!(p.vy > 0 && p.prevY + p.h <= e.y + 8)) return false;
    if (e.bossHazard || e.fireHit || e instanceof Firebar || e instanceof Ember || e instanceof Spring || e instanceof Stormlet) return false;
    if (e.stompable || e instanceof Shellback) {
      e.dead = true; e.remove = true;
      for (let i = 0; i < 10; i++) this.particles.push({ kind: 'px', x: e.cx + rand(-6, 6), y: e.y + e.h / 2 + rand(-5, 5), vx: rand(-0.8, 0.8), vy: rand(-1, 0.2), drag: 0.92, life: 26, t: 0, color: i % 3 ? '#f4efe4' : '#ffffff', size: 3 });
      this.stompScore(e);
      Sound.play('stomp');
    } else {                                                      // bounce off the spikes, unhurt
      this.burst(p.x + p.w / 2, p.y + p.h, ['#ffffff', '#ffd166'], 6);
      Sound.play('bump');
    }
    // every spin-bounce is a full spin jump again (same speed formula, same hold-to-rise)
    p.vy = -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS) * SPIN_JUMP; p.jumping = true; p.onGround = false;
    return true;
  }
  // A rolling Boyo bowls over anything he could stomp. Returns true if it handled the touch.
  rollHit(e) {
    const p = this.player;
    if (e instanceof Shellback && e.state === 'shell') {
      // holding run: scoop it up (the roll ends); otherwise bowl it away
      if (Input.down('run') && !this.held) { this.endRoll(p); this.pickUp(e); } else e.kick(this, p);
      return true;
    }
    if (!e.stompable || e.bossHazard) return false;            // spiky things and hazards still hurt
    e.flipKill(this, p.rollDir);
    this.stompScore(e);
    Sound.play('kick');
    this.burst(e.cx, e.y + e.h / 2, ['#ffffff', '#ffd166', '#f4efe4'], 8);
    this.shake = Math.max(this.shake, 1.5);
    p.roll = Math.max(p.roll, 16);                               // chain: keep rolling...
    p.rollSpeed = Math.min(ROLL_MAX, p.rollSpeed + 0.2);         // ...and a little faster
    return true;
  }
  updateCrouch(p) {
    if (p.roll > 0) return;
    let want = p.crouch;
    if (this.level.water) want = false;
    else if (p.onGround) want = Input.down('down');
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
  overlapsSolid(p) {
    const lv = this.level;
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

  checkPlayerTiles() {
    const p = this.player, lv = this.level;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = lv.get(c, r);
      if (t === T.COIN) {
        lv.set(c, r, T.EMPTY);
        this.addCoin(); this.addScore(200);
        this.pollenFly(c * TILE + 8, r * TILE + 8, 0, -1.5, 0);
      } else if (t === T.LAVA && p.y + p.h > r * TILE + 6) {
        this.killPlayer('lava');
        return;
      }
    }
    if (p.y > VIEW_H + 4) this.killPlayer('pit');
  }

  checkGoal() {
    const p = this.player, lv = this.level, g = lv.def.goal;
    if (p.x + p.w < lv.goalLine - 0.5) return;
    if (g.boss && (!lv.crystalOn || this.t - lv.crystalAppear < 60)) return;
    // grab the stage treasure: hold it up high while the fanfare plays
    this.endRoll(p); this.standUp(p); this.dropHeld();
    p.state = 'celebrate'; p.celebT = 0; p.vx = 0; p.charge = 0;
    p.dance = Math.floor(Math.random() * DANCES);   // a different silly dance each time
    Sound.play('crystal');
    this.flash = 0.8; this.shake = 3;
    this.addScore(5000, lv.crystalX, lv.goalY - 24);
    this.burst(lv.crystalX, lv.goalY, GOAL_FX[g.type] || GOAL_FX.crystal, 40);
  }
  // Where the treasure is drawn while Boyo holds it above his head.
  // Held well clear of his head (and loosely following the dance) so it never clips him.
  heldGoalPos() {
    const p = this.player, d = this.dancePose(p);
    return [p.x + p.w / 2 + Math.round(d.dx * 0.6), p.y - 24 + Math.min(0, d.dy) + Math.round(Math.sin(this.t * 0.12) * 2)];
  }
  // Victory dances (visual only; Boyo's position doesn't change). Returns the sprite frame,
  // facing flip, offsets and squash for this moment of the chosen dance.
  dancePose(p) {
    const t = p.celebT || 0, R = (f, flip, dx = 0, dy = 0, sx = 1, sy = 1) => ({ f, flip, dx, dy, sx, sy });
    // Everything here is deliberately slow and smooth: poses hold for 10+ frames and the facing
    // flips at most every ~half second, so it reads as dancing rather than twitching.
    switch (p.dance) {
      case 0: {   // the wiggle: hips side to side
        const k = Math.sin(t * 0.14);
        return R((t / 14 | 0) % 2 ? 'run1' : 'idle', (t / 40 | 0) % 2 === 0, Math.round(k * 3), 0, 1 + k * 0.06, 1 - k * 0.04);
      }
      case 1: {   // slow twirl (front, side, front, other side), crouch, star pose
        const c = t % 96;
        if (c < 48) { const q = c / 12 | 0; return R('jump', q === 2, 0, 0, q % 2 ? 0.8 : 1, 1.03); }   // right, front, left, front
        if (c < 64) return R('crouch', false, 0, 0, 1.1, 0.92);
        return R('jump', false, 0, -Math.round(Math.sin((c - 64) / 32 * Math.PI) * 8), 0.95, 1.08);
      }
      case 2: {   // moonwalk: faces one way, glides the other
        const dx = Math.round(Math.sin(t * 0.04) * 10), moving = Math.cos(t * 0.04);
        return R('run' + (3 - ((t / 10 | 0) & 3)), moving > 0, dx);
      }
      case 3: {   // the robot: held poses on the beat
        const poses = ['idle', 'crouch', 'skid', 'jump', 'idle', 'fall', 'skid', 'crouch'], i = (t / 16 | 0) % poses.length;
        return R(poses[i], (i >> 1) % 2 === 1, 0, poses[i] === 'jump' ? -3 : 0, (t % 16) < 2 ? 1.08 : 1, (t % 16) < 2 ? 0.94 : 1);
      }
      case 4: {   // happy hops, switching sides every hop
        const h = Math.abs(Math.sin(t * 0.16));
        return R(h > 0.35 ? 'jump' : 'idle', Math.floor(t * 0.16 / Math.PI) % 2 === 1, 0, -Math.round(h * 9), h < 0.3 ? 1.12 : 0.96, h < 0.3 ? 0.9 : 1.05);
      }
      default: {  // the flail: big joyful arm-waving, smooth sway instead of jitter
        const k = Math.sin(t * 0.18);
        return R((t / 12 | 0) % 2 ? 'fall' : 'jump', (t / 24 | 0) % 2 === 0, Math.round(k * 2), -Math.round(Math.abs(k) * 3), 1 + k * 0.08, 1 - k * 0.08);
      }
    }
  }
  // Visible flow for water currents: streaks for sideways flow, bubbles for vents.
  currentFx() {
    const lv = this.level, top = lv.water.top * TILE;
    for (const [x0, x1, fx, fy] of lv.def.currents || []) {
      const a = x0 * TILE, b = (x1 + 1) * TILE;
      if (b < this.camX || a > this.camX + VIEW_W) continue;
      if (fx) this.particles.push({ kind: 'px', x: rand(a, b), y: rand(top + 4, VIEW_H - 20), vx: fx * 5, vy: 0, life: 26, t: 0, color: '#e6fbff', size: 1, streak: 6 });
      if (fy < 0) this.particles.push({ kind: 'px', x: rand(a, b - 2), y: VIEW_H - rand(0, 40), vx: rand(-0.3, 0.3), vy: fy * rand(9, 14), life: 80, t: 0, color: '#e6fbff', size: this.t % 3 ? 1 : 2 });
      if (fy > 0 && this.t % 4 === 0) this.particles.push({ kind: 'px', x: rand(a, b), y: rand(top, top + 60), vx: 0, vy: fy * 18, life: 50, t: 0, color: '#8fd8ff', size: 1 });
    }
  }
  // Crumbling clouds: standing on one starts a shake, then it drops away and reforms later.
  updateCrumbles() {
    const p = this.player, lv = this.level;
    if (p.state === 'play' && p.onGround && !p.platform) {
      const r = Math.floor((p.y + p.h + 1) / TILE);
      for (let c = Math.floor(p.x / TILE); c <= Math.floor((p.x + p.w - 0.01) / TILE); c++) {
        const k = r * lv.w + c;
        if (lv.get(c, r) === T.CRUMBLE && !lv.crumbles.has(k)) lv.crumbles.set(k, { c, r, t: 0, gone: false });
      }
    }
    for (const [k, cr] of lv.crumbles) {
      cr.t++;
      if (!cr.gone && cr.t >= 30) {
        lv.set(cr.c, cr.r, T.EMPTY); cr.gone = true; cr.t = 0;
        for (let i = 0; i < 8; i++) {
          this.particles.push({ kind: 'px', x: cr.c * TILE + rand(1, 13), y: cr.r * TILE + rand(1, 13), vx: rand(-0.8, 0.8), vy: rand(-1.5, 0), g: 0.2, life: 40, t: 0, color: i % 2 ? '#e6ecfb' : '#9aa8cc', size: 3 });
        }
        if (cr.c * TILE > this.camX - 16 && cr.c * TILE < this.camX + VIEW_W) Sound.play('crumble');
      } else if (cr.gone && cr.t >= 240 && !overlap(p, { x: cr.c * TILE, y: cr.r * TILE, w: TILE, h: TILE })) {
        lv.set(cr.c, cr.r, T.CRUMBLE); lv.crumbles.delete(k);
        this.burst(cr.c * TILE + 8, cr.r * TILE + 8, ['#ffffff', '#cfe0ff'], 5);
      }
    }
  }
  clearBossHazards() {
    for (const e of this.entities) if (e.bossHazard) { this.burst(e.cx, e.y + e.h / 2, ['#ff6a1f', '#ffd166'], 5); e.remove = true; }
  }
  bossDefeated(b) {
    const lv = this.level;
    this.addScore(10000, b.cx, b.y - 10);
    this.flash = 1; this.shake = 8;
    this.burst(b.cx, b.y + b.h / 2, ['#ff6a1f', '#ffd166', '#ffffff', '#e8401a', '#ff7ad9'], 60);
    lv.crystalOn = true; lv.crystalAppear = this.t;
    Sound.play('crystal');
    Music.play(this.levelMusic);
  }
  startTally() { this.tally = true; this.tallyT = 0; this.bonus = this.time * 50; }

  // ---------- blocks ---------------------------------------------------------
  hitBlock(c, r) {
    const lv = this.level, p = this.player, t = lv.get(c, r);
    const bump = () => { lv.bumps.push({ c, r, t: 0 }); this.bumpAbove(c, r); };
    switch (t) {
      case T.BRICK:
        if (p.power > 0) { lv.set(c, r, T.EMPTY); this.breakBrick(c, r); this.bumpAbove(c, r); }
        else { bump(); Sound.play('bump'); }
        break;
      case T.QCOIN: lv.set(c, r, T.USED); bump(); this.coinPop(c, r); break;
      case T.QPOW:
        lv.set(c, r, T.USED); bump();
        let kind = lv.powerKinds.get(r * lv.w + c);
        if (kind === 'rand') kind = SUIT_KINDS[Math.floor(Math.random() * SUIT_KINDS.length)];
        this.items.push(new Item(p.power === 0 ? 'berry' : (kind || 'pepper'), c, r));
        Sound.play('appear');
        break;
      case T.Q1UP: case T.HIDDEN:
        lv.set(c, r, T.USED); bump();
        this.items.push(new Item('oneup', c, r));
        Sound.play('appear');
        break;
      case T.MULTI: {
        const k = r * lv.w + c;
        const n = (lv.multi.has(k) ? lv.multi.get(k) : 8) - 1;
        lv.multi.set(k, n);
        if (n <= 0) lv.set(c, r, T.USED);
        bump(); this.coinPop(c, r);
        break;
      }
      default: Sound.play('bump');
    }
  }
  bumpAbove(c, r) {
    const top = r * TILE, x0 = c * TILE, x1 = x0 + TILE;
    for (const e of this.entities) {
      if (e.dead || !e.bumpKill) continue;
      if (e.x < x1 && e.x + e.w > x0 && Math.abs(e.y + e.h - top) < 5) {
        e.flipKill(this, e.cx < x0 + 8 ? -1 : 1);
        this.addScore(100, e.cx, e.y);
        Sound.play('kick');
      }
    }
    for (const it of this.items) {
      if (it.emerging || SUIT_OF[it.kind]) continue;
      if (it.x < x1 && it.x + it.w > x0 && Math.abs(it.y + it.h - top) < 5) {
        it.vy = -4;
        it.vx = (it.x + 7 < x0 + 8 ? -1 : 1) * (Math.abs(it.vx) || 1.1);
      }
    }
    if (this.level.get(c, r - 1) === T.COIN) { this.level.set(c, r - 1, T.EMPTY); this.coinPop(c, r - 1); }
  }
  breakBrick(c, r) {
    const x = c * TILE, y = r * TILE;
    [[-1.4, -5.5, 0, 0], [1.4, -5.5, 8, 0], [-1.2, -3.5, 0, 8], [1.2, -3.5, 8, 8]].forEach(([vx, vy, ox, oy]) => {
      this.particles.push({ kind: 'frag', x: x + ox, y: y + oy, vx, vy, g: 0.3, life: 70, t: 0 });
    });
    this.addScore(50);
    this.shake = Math.max(this.shake, 2);
    Sound.play('break');
  }
  coinPop(c, r) {
    this.addCoin(); this.addScore(200);
    this.pollenFly(c * TILE + 8, r * TILE - 4, 0, -4.5, 14);   // puffs up out of the block first
    this.popup(c * TILE + 8, r * TILE - 18, '200');
  }
  // A collected pollen puff: drifts free for `delay` frames, then homes in on the HUD counter,
  // leaving a soft fading trail behind it.
  pollenFly(x, y, vx, vy, delay) {
    const col = POLLEN_COL[this.level ? this.level.themeName : 'meadow'] || POLLEN_COL.meadow;
    this.particles.push({ kind: 'pollen', x, y, vx, vy, t: 0, life: 150, delay, color: col });
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      this.particles.push({ kind: 'px', x, y, vx: Math.cos(a) * 1.1, vy: Math.sin(a) * 1.1, drag: 0.9, life: 22, t: 0, color: i % 2 ? '#ffffff' : col, size: 2 });
    }
  }

  // ---------- scoring & items --------------------------------------------------
  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.popup(x, y, String(n));
  }
  addCoin() {
    this.coins++;
    Sound.play('coin');
    if (this.coins >= 100) { this.coins -= 100; this.oneUp(); }
  }
  oneUp(x, y) {
    this.lives = Math.min(99, this.lives + 1);
    Sound.play('oneup');
    const p = this.player;
    this.popup(x !== undefined ? x : p.x + p.w / 2, y !== undefined ? y : p.y - 4, '1UP', '#7be08a');
  }
  collectItem(it) {
    const p = this.player;
    if (it.kind === 'oneup') { this.oneUp(it.x + 7, it.y); return; }
    this.addScore(1000, p.x + p.w / 2, p.y - 4);
    Sound.play('power');
    const suit = SUIT_OF[it.kind];
    const target = suit ? 2 : Math.max(1, p.power);
    if (suit) {
      p.suit = suit; p.charge = 0; p.pounding = false;
      this.tip = { suit, t: 0 };           // controls hint, shown on screen for a few seconds (see drawHUD)
    }
    if (target !== p.power) {
      this.freezeFrom = p.power;
      p.power = target;
      const h = p.crouch ? CROUCH_BIG_H : BIG_H;
      p.y += p.h - h; p.h = h;
      this.freezeT = 40;
    }
    this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffd166', '#ffffff', '#2ec4b6'], 14);
  }
  stompScore(e) {
    const p = this.player;
    if (p.combo >= STOMP_SCORES.length) this.oneUp(e.cx, e.y);
    else this.addScore(STOMP_SCORES[p.combo], e.cx, e.y);
    p.combo++;
  }
  isStomp(p, e) { return !this.level.water && p.vy > 0 && p.prevY + p.h <= e.y + 8; }
  // Stomp bounce. Pressing (or holding) jump in sync with the stomp turns it into a full-height
  // jump; a jump pressed up to a few frames early counts too (it's still in the jump buffer).
  bounce(p) {
    const held = Input.down('jump') || Input.down('up'), jump = held || this.t - p.pressT <= STOMP_EARLY;
    p.vy = jump ? -(JUMP_BASE + Math.abs(p.vx) * JUMP_BONUS) : -STOMP_BOUNCE;
    p.stompT = this.t; p.stompSmall = !jump;
    p.holdGrace = jump ? 34 : 0;            // a well-timed tap still gets the whole rise (full-jump height)
    p.stompY = p.y;
    p.jumping = true; p.onGround = false; p.platform = null; p.jumpBuf = 0;
    p.sx = 0.85; p.sy = 1.2;
  }
  hurtPlayer() {
    const p = this.player;
    if (p.invuln > 0 || p.state !== 'play') return;
    this.dropHeld(); this.endRoll(p);
    // one step down per hit: chili -> big -> small -> out
    if (p.power > 0) {
      this.freezeFrom = p.power; p.power--; this.freezeT = 40; p.charge = 0; p.pounding = false;
      if (p.power < 2) p.suit = null;
      if (p.power === 0) {
        const h = p.crouch ? CROUCH_SMALL_H : SMALL_H;
        p.y += p.h - h; p.h = h;
      }
      p.invuln = 130;
      Sound.play('shrink');
      this.shake = 2.5;
    } else this.killPlayer('hit');
  }
  killPlayer(kind) {
    const p = this.player;
    if (p.state === 'dead') return;
    this.dropHeld();
    p.crouch = false; p.charge = 0; p.roll = 0; p.rollSpeed = 0; p.pounding = false; p.suit = null;
    p.state = 'dead'; p.deathKind = kind; p.deadT = 0; p.vx = 0; p.vy = 0;
    p.y = Math.min(p.y + p.h - SMALL_H, VIEW_H + 40); p.h = SMALL_H; p.power = 0;
    Music.remember(this.level.def.id);
    Music.stop();
    Sound.play(kind === 'lava' ? 'burn' : 'die');
    if (kind === 'lava') { Sound.play('die'); this.burst(p.x + p.w / 2, 13 * TILE, ['#ff6a1f', '#ffd166', '#e8401a'], 16); }
    this.shake = kind === 'pit' ? 0 : 3;
  }
  updateDeath() {
    const p = this.player;
    p.deadT++;
    if (p.deathKind !== 'pit') {
      if (p.deadT === 24) p.vy = -6.2;
      if (p.deadT > 24) { p.vy = Math.min(p.vy + 0.28, 6); p.y += p.vy; }
    }
    if (p.deadT === 170) this.transition(() => this.afterDeath());
  }
  pickUp(sh) {
    this.held = sh;
    sh.state = 'held'; sh.walker = false; sh.vx = 0; sh.vy = 0;
    sh.holdPos(this.player);
    Sound.play('select');
  }
  // Put the shell somewhere it isn't stuck in a wall (fall back to the player's centre).
  placeHeld(sh) {
    const p = this.player, lv = this.level;
    const c0 = Math.floor(sh.x / TILE), c1 = Math.floor((sh.x + sh.w - 0.01) / TILE);
    const r0 = Math.floor(sh.y / TILE), r1 = Math.floor((sh.y + sh.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (lv.solid(c, r)) { sh.x = p.x + p.w / 2 - sh.w / 2; return; }
  }
  throwHeld() {
    const sh = this.held, p = this.player;
    if (!sh) return;
    this.held = null;
    this.placeHeld(sh);
    sh.shellT = Math.min(sh.shellT, 400);
    if (Input.down('up')) {
      sh.state = 'toss'; sh.walker = false; sh.vy = -7; sh.vx = p.vx * 0.5; sh.grace = 20;
      Sound.play('kick');
    } else if (Input.down('down')) {
      // set it down just in front, with a moment's grace so we don't kick it immediately
      sh.state = 'shell'; sh.walker = true; sh.vx = 0; sh.vy = 0; sh.grace = 20;
      sh.x = p.facing > 0 ? p.x + p.w : p.x - sh.w; sh.y = p.y + p.h - sh.h;
      this.placeHeld(sh);
      Sound.play('select');
    } else {
      sh.state = 'slide'; sh.walker = false; sh.grace = 14; sh.combo = 0;
      sh.vx = 3.8 * p.facing; sh.vy = 0;
      Sound.play('kick');
      this.addScore(400, sh.cx, sh.y);
    }
  }
  dropHeld() {
    const sh = this.held;
    if (!sh) return;
    this.held = null;
    this.placeHeld(sh);
    sh.state = 'shell'; sh.walker = true; sh.vx = 0; sh.vy = 0;
  }
  // Chili power (fire form): tap run to toss a pepper; keep holding to charge, release to fire a
  // hot pepper (half charge) or a chili blast (full charge). Carrying a shell blocks it.
  updateChili(p) {
    if (p.power !== 2 || this.held || p.state !== 'play') { p.charge = 0; return; }
    if (Input.hit('run')) this.throwFire();
    if (Input.down('run')) {
      p.charge++;
      if (p.charge === CHARGE_MID) Sound.play('chargeUp');
      if (p.charge === CHARGE_FULL) { Sound.play('charged'); this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffffff', '#ffd166'], 10); }
      if (p.charge > CHARGE_FULL && p.charge % 24 === 0) Sound.play('chargeHum');
      if (p.charge > 12) {
        // sparks drawn in toward Boyo
        const full = p.charge >= CHARGE_FULL, n = full ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), r = rand(16, 26), sx = p.x + p.w / 2 + Math.cos(a) * r, sy = p.y + p.h / 2 + Math.sin(a) * r;
          this.particles.push({ kind: 'px', x: sx, y: sy, vx: -Math.cos(a) * r / 14, vy: -Math.sin(a) * r / 14, life: 14, t: 0, color: full ? (i ? '#ffffff' : '#ffd166') : '#ff8a2a', size: 1 });
        }
      }
    } else {
      if (p.charge >= CHARGE_MID) this.fireCharged(p, p.charge >= CHARGE_FULL ? 2 : 1);
      p.charge = 0;
    }
  }
  fireCharged(p, level) {
    const x = p.facing > 0 ? p.x + p.w : p.x, y = p.y + p.h / 2 - (p.crouch ? 0 : 2);
    this.fireballs.push(new ChiliShot(x, y, p.facing, level));
    if (level === 2) {
      Sound.play('blast');
      this.shake = Math.max(this.shake, 5); this.flash = Math.max(this.flash, 0.25);
      this.burst(x, y, ['#ff3b2f', '#ff8a2a', '#ffd166', '#ffffff'], 18);
    } else {
      Sound.play('shot');
      this.burst(x, y, ['#ff8a2a', '#ffd166'], 8);
    }
  }
  throwFire() {
    if (this.held) return;
    if (this.fireballs.filter(f => !f.level).length >= 2) return;
    const p = this.player;
    this.fireballs.push(new Fireball(p.facing > 0 ? p.x + p.w : p.x - 8, p.y + 6, p.facing));
    Sound.play('fire');
  }

  // ---------- suits ------------------------------------------------------------
  updatePowers(p) {
    if (p.cool > 0) p.cool--;
    if (p.wand > 0) p.wand--;
    if (p.power !== 2 || p.state !== 'play') { p.charge = 0; p.pounding = false; return; }
    if (p.suit !== 'quake') p.pounding = false;
    switch (p.suit) {
      case 'ice': this.updateIce(p); break;
      case 'gale': this.updateGale(p); break;
      case 'volt': this.updateVolt(p); break;
      case 'quake': this.updateQuake(p); break;
      default: this.updateChili(p);
    }
  }
  // Ice wand: tap run to shoot a frost bolt; frozen foes become blocks (see IceBlock).
  updateIce(p) {
    p.charge = 0;
    if (this.held || !Input.hit('run')) return;
    if (this.fireballs.filter(f => f instanceof IceBolt).length >= 2) return;
    const x = p.facing > 0 ? p.x + p.w : p.x - 8, y = p.y + (p.crouch ? 3 : 8);
    this.fireballs.push(new IceBolt(x, y, p.facing));
    p.wand = 8;
    Sound.play('iceshot');
    for (let i = 0; i < 5; i++) this.spark(x + 4, y + 4, i % 2 ? '#ffffff' : '#7fd4ff', 16, p.facing * rand(0.3, 1.5), rand(-0.8, 0.8));
  }
  freezeEnemy(e) {
    const ib = new IceBlock(e);
    e.dead = true; e.remove = true;
    this.entities.push(ib);
    this.addScore(100, e.cx, e.y);
    this.burst(e.cx, e.y + e.h / 2, ['#ffffff', '#bff0ff', '#7fd4ff'], 12);
    Sound.play('freeze');
  }
  // Gale feather: tap run to loose a gust, tap jump once in the air to flap, hold jump to glide.
  updateGale(p) {
    p.charge = 0;
    const lv = this.level;
    if (p.onGround || lv.water) p.flaps = 0;
    if (p.gustCool > 0) p.gustCool--;
    if (!p.onGround && !lv.water && Input.hit('jump') && p.flaps < 1 && p.vy > 0.3 && !p.spin && !p.pounding) {
      p.vy = -3.7; p.flaps++; p.jumping = false; p.sx = 0.9; p.sy = 1.15;
      Sound.play('flap');
      for (let i = 0; i < 6; i++) this.spark(p.x + p.w / 2 + rand(-8, 8), p.y + p.h, i % 2 ? '#ffffff' : '#9ae8a8', 20, rand(-0.6, 0.6), rand(0.2, 1));
    }
    if (p.gliding && this.t % 5 === 0) this.spark(p.x + p.w / 2 + rand(-9, 9), p.y + 8, '#d8ffe4', 16, -p.facing * 0.4, rand(-0.2, 0.3));
    if (!this.held && Input.hit('run') && p.gustCool === 0) {
      p.gustCool = 24; p.wand = 8;
      this.fireballs.push(new Gust(p.facing > 0 ? p.x + p.w : p.x, p.y + p.h / 2 - 1, p.facing));
      Sound.play('whoosh');
    }
  }
  // Volt orb: tap run for a lightning zap that arcs to the nearest foes; hold run to charge a
  // thunderstorm that strikes every foe on screen.
  updateVolt(p) {
    if (this.held) { p.charge = 0; return; }
    if (Input.hit('run') && p.cool === 0) this.fireVolt(p);
    if (Input.down('run')) {
      p.charge++;
      if (p.charge === CHARGE_MID) Sound.play('chargeUp');
      if (p.charge === CHARGE_FULL) { Sound.play('charged'); this.burst(p.x + p.w / 2, p.y + p.h / 2, ['#ffffff', '#7ad7ff', '#fff6a0'], 10); }
      if (p.charge > 12) {
        const full = p.charge >= CHARGE_FULL, a = rand(0, Math.PI * 2), r = rand(14, 24);
        this.particles.push({ kind: 'px', x: p.x + p.w / 2 + Math.cos(a) * r, y: p.y + p.h / 2 + Math.sin(a) * r, vx: -Math.cos(a) * r / 12, vy: -Math.sin(a) * r / 12, life: 12, t: 0, color: full ? '#ffffff' : '#7ad7ff', size: 1 });
      }
    } else {
      if (p.charge >= CHARGE_FULL) this.thunderStorm(p);
      p.charge = 0;
    }
  }
  voltTargets() {
    const out = [];
    for (const e of this.entities) {
      if (e.dead || e.remove || e.bossHazard || e === this.held || !(e.fireKill || e.fireHit)) continue;
      const b = e.hitbox();
      if (!b) continue;
      const x = b.x + b.w / 2, y = b.y + b.h / 2;
      if (x < this.camX - 8 || x > this.camX + VIEW_W + 8) continue;
      out.push({ e, x, y });
    }
    return out;
  }
  voltHit(e, big) {
    if (e.fireHit) e.fireHit(this, big ? 3 : 1);
    else e.flipKill(this, Math.sign(e.cx - this.player.x) || 1);
    this.addScore(big ? 300 : 200, e.cx, e.y);
    this.burst(e.cx, e.y + e.h / 2, ['#fff6a0', '#7ad7ff', '#ffffff'], 8);
  }
  fireVolt(p) {
    const dir = p.facing, ox = p.x + p.w / 2 + dir * 5, oy = p.y + (p.crouch ? 5 : 9);
    const all = this.voltTargets();
    const front = all.filter(c => (c.x - ox) * dir > -10 && Math.abs(c.x - ox) < 140 && Math.abs(c.y - oy) < 70)
      .sort((a, b) => Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy));
    const pts = [[ox, oy]];
    if (front.length) {
      let cur = front[0];
      const hit = [cur];
      while (hit.length < 3) {
        const next = all.filter(c => !hit.includes(c) && Math.hypot(c.x - cur.x, c.y - cur.y) < 64)
          .sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y))[0];
        if (!next) break;
        hit.push(next); cur = next;
      }
      for (const c of hit) { pts.push([c.x, c.y]); this.voltHit(c.e, false); }
    } else pts.push([ox + dir * 60, oy + rand(-8, 8)]);
    this.fireballs.push(new Zap(pts));
    p.cool = 12; p.wand = 8;
    this.burst(ox, oy, ['#fff6a0', '#7ad7ff'], 5);
    Sound.play('volt');
  }
  thunderStorm(p) {
    const list = this.voltTargets().sort((a, b) => a.x - b.x).slice(0, 12);
    list.forEach((c, i) => this.fireballs.push(new Strike(c.e, c.x, c.y, 2 + i * 4)));
    if (!list.length) for (let i = 0; i < 3; i++) this.fireballs.push(new Strike(null, this.camX + rand(40, VIEW_W - 40), 12 * TILE, 2 + i * 5));
    this.flash = Math.max(this.flash, 0.55); this.shake = Math.max(this.shake, 4);
    Sound.play('thunder');
  }
  // Quake mallet: press down in mid-air to ground pound. Smashes bricks, flattens anything it lands
  // on (even spiky foes) and the shockwave topples every grounded foe nearby.
  updateQuake(p) {
    p.charge = 0;
    if (p.pounding) {
      if (p.poundT > POUND_HANG) {
        this.spark(p.x + p.w / 2 + rand(-4, 4), p.y + rand(0, p.h), this.t % 2 ? '#ffd166' : '#c9c4d8', 12, rand(-0.3, 0.3), -1.5);
      } else if (p.poundT === 1) Sound.play('flap');
      return;
    }
    if (!p.onGround && !this.level.water && !this.held && Input.hit('down')) {
      p.pounding = true; p.poundT = 0; p.spin = false; p.jumping = false; p.vx = 0; p.sx = 1.15; p.sy = 0.85;
    }
  }
  poundHit(e) {
    const p = this.player;
    if (e.bossHazard || e.fireHit || !(e.fireKill || e.stompable || e instanceof Urchin)) return false;
    e.flipKill(this, Math.sign(e.cx - (p.x + p.w / 2)) || 1);
    this.stompScore(e);
    Sound.play('stomp');
    this.burst(e.cx, e.y + e.h / 2, ['#ffd166', '#c9c4d8', '#ffffff'], 8);
    return true;
  }
  poundLand(p) {
    p.pounding = false; p.poundT = 0;
    const cx = p.x + p.w / 2, by = p.y + p.h;
    this.shake = Math.max(this.shake, 6); this.flash = Math.max(this.flash, 0.1);
    p.sx = 1.3; p.sy = 0.7;
    Sound.play('pound');
    for (let i = -8; i <= 8; i++) {
      if (!i) continue;
      this.particles.push({ kind: 'px', x: cx + i * 2, y: by - 2, vx: i * 0.28, vy: rand(-0.6, -0.1), g: 0.03, drag: 0.94, life: 26, t: 0, color: i % 2 ? '#f4efe4' : '#c9c4d8', size: 2 });
    }
    this.burst(cx, by - 2, ['#ffd166', '#c9c4d8', '#8a86a0'], 14);
    for (const e of this.entities) {
      if (e.dead || e.remove || e.bossHazard) continue;
      const eb = e.hitbox();
      if (!eb || Math.abs(eb.x + eb.w / 2 - cx) > 60 || Math.abs(eb.y + eb.h - by) > 14) continue;
      if (e.fireHit) { e.fireHit(this, 3); continue; }
      if (!(e.fireKill || e.stompable || e instanceof Urchin)) continue;
      e.flipKill(this, eb.x + eb.w / 2 < cx ? -1 : 1);
      this.addScore(200, e.cx, e.y);
      this.burst(e.cx, e.y + e.h / 2, ['#ffd166', '#c9c4d8', '#ffffff'], 6);
    }
  }

  // ---------- entities -------------------------------------------------------
  spawnEntities() {
    const right = this.camX + VIEW_W + 32;
    while (this.spawnQueue.length && this.spawnQueue[0].x <= right) {
      const s = this.spawnQueue.shift();
      if (s.x < this.camX - 64) continue;
      const e = this.makeEntity(s.def);
      if (e) this.entities.push(e);
    }
  }
  makeEntity(d) {
    const row = d[2] == null ? 11 : d[2];
    switch (d[0]) {
      case 'grumblet': return new Grumblet(d[1], row, this.level.themeName);
      case 'shellback': return new Shellback(d[1], row);
      case 'spikelet': return new Spikelet(d[1], row);
      case 'flutter': return new Flutter(d[1], d[2] == null ? 4 : d[2], !!d[3]);
      case 'snapvine':
        for (let r = 0; r < ROWS; r++) if (this.level.get(d[1], r) === T.PIPE_TL) return new Snapvine(d[1], r);
        return null;
      case 'firebar': return new Firebar(d[1], d[2], d[3] || 6, d[4] || 0.04);
      case 'ember': return new Ember(d[1]);
      case 'boss': return (this.boss = new Boss(d[1]));
      case 'spring': return new Spring(d[1], row);
      case 'slideguin': return new Slideguin(d[1], row);
      case 'icicle': return new Icicle(d[1], d[2] == null ? 4 : d[2]);
      case 'finlet': return new Finlet(d[1], d[2] == null ? 6 : d[2], d[3]);
      case 'jellop': return new Jellop(d[1], d[2] == null ? 6 : d[2]);
      case 'urchin': return new Urchin(d[1], row);
      case 'stormlet': return new Stormlet(d[1], d[2]);
    }
    console.warn('BOYO: unknown entity', d[0]);
    return null;
  }
  enemyInteractions() {
    const ents = this.entities, p = this.player;
    for (let i = 0; i < ents.length; i++) {
      const a = ents[i];
      if (a.dead) continue;
      for (let j = i + 1; j < ents.length; j++) {
        const b = ents[j];
        if (b.dead) continue;
        if (a === this.held || b === this.held) continue;
        const aSlide = a instanceof Shellback && (a.state === 'slide' || a.state === 'toss');
        const bSlide = b instanceof Shellback && (b.state === 'slide' || b.state === 'toss');
        if (aSlide || bSlide) {
          const s = aSlide ? a : b, o = aSlide ? b : a;
          const ob = o.hitbox();
          if (!ob || !o.shellKill || !overlap(s, ob)) continue;
          if (aSlide && bSlide) { a.flipKill(this, -Math.sign(a.vx)); b.flipKill(this, -Math.sign(b.vx)); Sound.play('kick'); continue; }
          o.flipKill(this, Math.sign(s.vx));
          const v = STOMP_SCORES[Math.min(s.combo++, STOMP_SCORES.length - 1)];
          this.addScore(v, o.cx, o.y);
          Sound.play('kick');
        } else if (a.walker && b.walker && overlap(a, b)) {
          if (a.x < b.x) { if (a.vx > 0) a.vx = -a.vx; if (b.vx < 0) b.vx = -b.vx; }
          else { if (a.vx < 0) a.vx = -a.vx; if (b.vx > 0) b.vx = -b.vx; }
        }
      }
    }
    const h = this.held;
    if (h) {
      for (const e of ents) {
        if (e === h || e.dead || !e.shellKill) continue;
        const eb = e.hitbox();
        if (!eb || !overlap(h, eb)) continue;
        e.flipKill(this, p.facing); h.flipKill(this, -p.facing);
        this.held = null;
        this.addScore(1000, e.cx, e.y);
        Sound.play('kick');
        break;
      }
    }
    if (p.state !== 'play') return;
    for (const e of ents) {
      if (e.dead || !e.touches(p)) continue;
      if (p.pounding && p.poundT > POUND_HANG && this.poundHit(e)) continue;
      if (p.roll > 0 && this.rollHit(e)) continue;
      if (p.spin && this.spinHit(e)) continue;
      e.onTouch(this, p);
      if (p.state !== 'play') break;
    }
  }
  updateCamera(snap) {
    const p = this.player, lv = this.level;
    const max = lv.w * TILE - VIEW_W;
    if (this.arenaCam != null) {
      this.camX = snap ? this.arenaCam : this.camX + (this.arenaCam - this.camX) * 0.08;
      this.camX = clamp(this.camX, 0, max);
      return;
    }
    // Locked to the player's centre. The camera first moves by exactly the player's displacement
    // (zero lag at any speed, nothing to swing back when stopping or turning), then eases out
    // whatever error is left (jumps into view, respawns, arena exit) with a gentle spring.
    const px = p.x + p.w / 2, anchor = px - VIEW_W * 0.5;
    if (snap || this.camPx == null) this.camX = anchor;
    else {
      this.camX += px - this.camPx;
      this.camX += (anchor - this.camX) * 0.1;
    }
    this.camPx = px;
    this.camX = clamp(this.camX, 0, max);
  }


  // ---------- particles ---------------------------------------------------------
  updateParticles() {
    if (this.hudPulse > 0) this.hudPulse--;
    for (const q of this.particles) {
      if (q.kind === 'pollen') { this.updatePollen(q); continue; }
      q.t++;
      q.x += q.vx; q.y += q.vy; q.vy += q.g || 0;
      if (q.drag) { q.vx *= q.drag; q.vy *= q.drag; }
      if (q.t >= q.life) { q.dead = true; if (q.onEnd) q.onEnd(q); }
    }
    this.particles = this.particles.filter(q => !q.dead);
  }
  updatePollen(q) {
    q.t++;
    if (q.t > q.delay) {
      const tx = this.camX + 95, ty = 6;               // the counter icon, in world space
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
  popup(x, y, text, color = '#ffffff') {
    this.particles.push({ kind: 'text', x, y, vx: 0, vy: -0.6, life: 45, t: 0, text, color });
  }

  updateAmbient() {
    const theme = this.mode === 'title' ? 'meadow' : this.level ? this.level.themeName : 'meadow';
    if (this.ambient.theme !== theme) { this.ambient = []; this.ambient.theme = theme; }
    const A = this.ambient;
    if (A.length < 22 && Math.random() < 0.12) {
      if (theme === 'meadow') A.push({ x: rand(0, VIEW_W + 60), y: -4, vx: rand(-0.6, -0.2), vy: rand(0.2, 0.45), t: 0, life: 600, c: Math.random() < 0.5 ? '#ffd1e3' : '#ffffff', ph: rand(0, 6) });
      else if (theme === 'cave') A.push({ x: rand(0, VIEW_W), y: rand(40, VIEW_H), vx: rand(-0.1, 0.1), vy: rand(-0.25, -0.05), t: 0, life: 400, c: Math.random() < 0.6 ? '#5ef2ff' : '#ff7ad9', ph: rand(0, 6) });
      else if (theme === 'snow') A.push({ x: rand(-60, VIEW_W + 60), y: -4, vx: rand(-0.2, 0.2), vy: rand(0.3, 0.8), t: 0, life: 700, c: '#ffffff', ph: rand(0, 6), w: Math.random() < 0.3 ? 2 : 1 });
      else if (theme === 'ocean') A.push({ x: rand(0, VIEW_W), y: VIEW_H + 2, vx: 0, vy: rand(-0.7, -0.3), t: 0, life: 520, c: '#cdefff', ph: rand(0, 6), ring: true });
      else if (theme === 'sky') A.push({ x: VIEW_W + rand(0, 40), y: rand(16, VIEW_H - 30), vx: rand(-3.2, -1.6), vy: 0, t: 0, life: 300, c: '#ffffff', ph: rand(0, 6), w: 4 + Math.floor(rand(0, 10)) });
      else A.push({ x: rand(0, VIEW_W), y: VIEW_H + 2, vx: rand(-0.2, 0.2), vy: rand(-0.9, -0.4), t: 0, life: 360, c: Math.random() < 0.6 ? '#ff8a2a' : '#ffd166', ph: rand(0, 6) });
    }
    const wind = this.mode === 'play' ? (this.windForce || 0) * 4 : 0;
    for (const a of A) { a.t++; a.x += a.vx + Math.sin(a.t * 0.04 + a.ph) * 0.25 + wind; a.y += a.vy; }
    for (let i = A.length - 1; i >= 0; i--) if (A[i].t > A[i].life || A[i].y < -10 || A[i].y > VIEW_H + 10 || A[i].x < -80 || A[i].x > VIEW_W + 80 || (A[i].ring && A[i].y < 18)) A.splice(i, 1);
  }

  // ═════════════════════════════ RENDERING ═══════════════════════════════════
  // A tap/click on the canvas, in game pixels. Menu items are directly tappable.
  tap(x, y) {
    Sound.unlock();
    if (this.fadeCb) return;
    const h = this.menuHits.find(m => x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h);
    if (h && h.bar && x >= h.bar.x - 4) {
      this.menu = h.i;
      const v = Math.max(0, Math.min(1, (x - h.bar.x) / h.bar.w));
      Sound.setVol(h.bar.kind, v);
      if (h.bar.kind === 'sfx') Sound.play('coin');
      return;
    }
    if (h) { this.menu = h.i; Input.hits.add('start'); return; }
    if (this.mode === 'title') { this.menu = 0; Input.hits.add('start'); }
    else if (this.mode === 'intro' || this.mode === 'clear') Input.hits.add('start');
  }

  render() {
    const ctx = this.ctx;
    this.menuHits = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    switch (this.mode) {
      case 'title': this.drawTitle(ctx); break;
      case 'select': this.drawSelect(ctx); break;
      case 'intro': this.drawIntro(ctx); break;
      case 'play': this.drawWorld(ctx); break;
      case 'pause': this.drawWorld(ctx); this.drawPause(ctx); break;
      case 'clear': this.drawWorld(ctx); this.drawClear(ctx); break;
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
      ctx.fillStyle = a.c;
      if (a.ring) {
        const x = Math.round(a.x), y = Math.round(a.y);
        ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1); ctx.fillRect(x + 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + 2, 1, 1);
      } else ctx.fillRect(Math.round(a.x), Math.round(a.y), a.w || (this.ambient.theme === 'meadow' ? 2 : 1), 1);
    }
    ctx.globalAlpha = 1;
  }

  drawWorld(ctx) {
    const lv = this.level;
    let sx = 0, sy = 0;
    if (this.shake > 0.4) { sx = Math.round(rand(-1, 1) * this.shake); sy = Math.round(rand(-1, 1) * this.shake); }
    const cam = Math.round(this.camX);
    drawBackground(ctx, lv.themeName, cam, this.t);
    this.drawAmbient(ctx);
    ctx.save();
    ctx.translate(-cam + sx, sy);
    this.drawDecor(ctx, cam);
    if (lv.water) {
      for (const [x0, x1, , fy] of lv.def.currents || []) {
        if (fy >= 0) continue;
        ctx.globalAlpha = 0.1 + Math.sin(this.t * 0.1) * 0.03; ctx.fillStyle = '#e6fbff';
        ctx.fillRect(x0 * TILE, lv.water.top * TILE, (x1 - x0 + 1) * TILE, VIEW_H);
        ctx.globalAlpha = 1;
      }
    }
    for (const e of this.entities) if (e.behindTiles) e.draw(ctx, this);
    for (const it of this.items) if (it.emerging) it.draw(ctx);
    this.drawTiles(ctx, cam);
    for (const pl of this.platforms) pl.draw(ctx, lv.theme);
    for (const it of this.items) if (!it.emerging) it.draw(ctx);
    for (const e of this.entities) if (!e.behindTiles && e !== this.held) e.draw(ctx, this);
    for (const f of this.fireballs) f.draw(ctx);
    this.drawPlayer(ctx);
    if (this.held) this.held.draw(ctx, this);
    this.drawParticles(ctx);
    ctx.restore();
    if (lv.water) {
      const top = lv.water.top * TILE;
      ctx.globalAlpha = 0.1; ctx.fillStyle = '#1a6fb0'; ctx.fillRect(0, top, VIEW_W, VIEW_H - top);
      ctx.globalAlpha = 0.7; ctx.fillStyle = '#bff4ff';
      for (let x = 0; x < VIEW_W; x++) ctx.fillRect(x, top + Math.round(Math.sin((x + cam + this.t * 0.7) / 11) * 1.2), 1, 1);
      ctx.globalAlpha = 1;
    }
    if (this.flash > 0) {
      // photosensitivity-safe: a faint warm wash instead of a full-screen white flash
      ctx.globalAlpha = Math.min(this.flash, 1) * 0.2;
      ctx.fillStyle = '#ffe6d0'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    this.drawHUD(ctx);
  }

  drawTiles(ctx, cam) {
    const lv = this.level, ts = getTileset(lv.themeName);
    const c0 = Math.max(0, Math.floor(cam / TILE) - 1), c1 = Math.min(lv.w - 1, c0 + Math.ceil(VIEW_W / TILE) + 2);
    const qf = [0, 0, 0, 1, 2, 1][Math.floor(this.t / 8) % 6];
    const lf = Math.floor(this.t / 10) % 4;
    for (let r = 0; r < ROWS; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = lv.tiles[r * lv.w + c];
        if (!t || t === T.HIDDEN) continue;
        let img;
        switch (t) {
          case T.GROUND: {
            const top = r > 0 && !lv.solid(c, r - 1), bot = r < ROWS - 1 && !lv.solid(c, r + 1);
            let key = top ? 'groundTop' : 'ground';
            if (ts.groundBot && bot) key = top ? 'groundBoth' : 'groundBot';
            const m = (!lv.solid(c - 1, r) ? 1 : 0) | (!lv.solid(c + 1, r) ? 2 : 0) | (!ts.groundBot && bot ? 4 : 0);
            img = m ? ts.chip(key, m, (c * 7 + r * 13) ^ (c >> 2)) : ts[key];
            break;
          }
          case T.CRUMBLE: img = ts.crumble; break;
          case T.ICE: img = ts.ice; break;
          case T.BRICK: case T.MULTI: img = ts.brick; break;
          case T.QCOIN: case T.QPOW: case T.Q1UP: img = ts['q' + qf]; break;
          case T.USED: img = ts.used; break;
          case T.SOLID: img = ts.solid; break;
          case T.PIPE_TL: img = ts.pipeTL; break;
          case T.PIPE_TR: img = ts.pipeTR; break;
          case T.PIPE_L: img = ts.pipeL; break;
          case T.PIPE_R: img = ts.pipeR; break;
          case T.SEMI: {
            const m = (lv.get(c - 1, r) !== T.SEMI ? 1 : 0) | (lv.get(c + 1, r) !== T.SEMI ? 2 : 0);
            img = m ? ts.chipSemi(m, (c * 5 + r * 11) ^ (c >> 1)) : ts.semi;
            break;
          }
          case T.LAVA: img = lv.get(c, r - 1) === T.LAVA ? ts.lavaDeep : ts['lava' + ((lf + c) % 4)]; break;
          case T.COIN:   // drifting pollen puff
            drawPollen(ctx, c * TILE + 8 + Math.sin(this.t * 0.04 + c * 1.7 + r) * 2, r * TILE + 8 + Math.sin(this.t * 0.05 + c * 0.9) * 2.5, this.t + c * 9, POLLEN_COL[lv.themeName] || POLLEN_COL.meadow);
            continue;
        }
        if (!img) continue;
        let y = r * TILE;
        for (const b of lv.bumps) if (b.c === c && b.r === r) y -= Math.round(Math.sin((b.t / 10) * Math.PI) * 5);
        let x = c * TILE;
        if (t === T.CRUMBLE) { const cr = lv.crumbles.get(r * lv.w + c); if (cr) { x += (cr.t >> 1) % 2 ? 1 : -1; y += cr.t > 18 ? 1 : 0; } }
        ctx.drawImage(img, x, y);
      }
    }
    // Lava glow
    if (lv.themeName === 'citadel') {
      ctx.globalAlpha = 0.18 + Math.sin(this.t * 0.05) * 0.04;
      ctx.fillStyle = '#ff6a1f';
      for (let c = c0; c <= c1; c++) if (lv.get(c, 13) === T.LAVA) ctx.fillRect(c * TILE, 13 * TILE - 10, TILE, 10);
      ctx.globalAlpha = 1;
    }
  }

  drawDecor(ctx, cam) {
    const lv = this.level, th = lv.theme, t = this.t;
    if (lv.def.ceiling) {
      for (let x = cam - 2; x < cam + VIEW_W + 2; x++) {
        const h = caveCeilingH(x);
        ctx.fillStyle = '#120d30'; ctx.fillRect(x, 0, 1, h);
        ctx.fillStyle = '#2a2160'; ctx.fillRect(x, h - 2, 1, 2);
        if ((x * 7) % 23 === 0) { ctx.fillStyle = '#3d2f85'; ctx.fillRect(x, h - 6, 2, 1); }
      }
    }
    for (const d of lv.decor) {
      if (d.x < cam - 48 || d.x > cam + VIEW_W + 16) continue;
      const x = d.x, y = d.y;
      switch (d.k) {
        case 'bush': {
          const s = 0.8 + d.s * 0.4;
          blob(ctx, x + 10, y - 2, Math.round(9 * s), '#2f8a46');
          blob(ctx, x + 22, y - 6, Math.round(11 * s), '#2f8a46');
          blob(ctx, x + 34, y - 2, Math.round(9 * s), '#2f8a46');
          blob(ctx, x + 10, y - 3, Math.round(8 * s), '#47b35c');
          blob(ctx, x + 22, y - 7, Math.round(10 * s), '#47b35c');
          blob(ctx, x + 34, y - 3, Math.round(8 * s), '#47b35c');
          ctx.fillStyle = '#7bd889';
          ctx.fillRect(x + 18, y - 14, 3, 2); ctx.fillRect(x + 8, y - 8, 2, 2); ctx.fillRect(x + 31, y - 8, 2, 1);
          ctx.fillStyle = th.top[0]; ctx.fillRect(x, y - 1, 46, 1);
          break;
        }
        case 'flower':
          ctx.fillStyle = '#2f9a49'; ctx.fillRect(x + 2, y - 5, 1, 5);
          ctx.fillStyle = d.c; ctx.fillRect(x + 1, y - 7, 3, 1); ctx.fillRect(x + 2, y - 8, 1, 3);
          ctx.fillStyle = '#ffd166'; ctx.fillRect(x + 2, y - 7, 1, 1);
          break;
        case 'tuft':
          ctx.fillStyle = '#2f9a49';
          ctx.fillRect(x, y - 2, 1, 2); ctx.fillRect(x + 2, y - 4, 1, 4); ctx.fillRect(x + 4, y - 3, 1, 3);
          break;
        case 'crystal': {
          const k = d.s || 1, glow = 0.16 + Math.sin(t * 0.05 + d.p) * 0.08;
          ctx.globalAlpha = glow; blob(ctx, x + 2, y - 5 * k, 7 * k, d.c); ctx.globalAlpha = 1;
          for (const [dx, h, w] of [[0, 9, 3], [4, 6, 2], [-3, 5, 2], [7, 3, 2]]) {
            const hh = h * k, ww = w * (k > 1 ? 2 : 1), sx = x + dx * k;
            ctx.fillStyle = INK; ctx.fillRect(sx - 1, y - hh, ww + 2, hh); ctx.fillRect(sx, y - hh - 1, ww, 1);
            ctx.fillStyle = d.c; ctx.fillRect(sx, y - hh, ww, hh);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, y - hh, 1, Math.ceil(hh / 2));
          }
          break;
        }
        case 'hangcrystal': {
          ctx.globalAlpha = 0.14 + Math.sin(t * 0.05 + d.p) * 0.07; blob(ctx, x, y + d.len / 2, 8, d.c); ctx.globalAlpha = 1;
          for (let i = 0; i < d.len; i++) {
            const w = Math.max(1, Math.round(4 * (1 - i / d.len)));
            ctx.fillStyle = INK; ctx.fillRect(x - (w >> 1) - 1, y + i, w + 2, 1);
            ctx.fillStyle = i < 2 ? '#ffffff' : d.c; ctx.fillRect(x - (w >> 1), y + i, w, 1);
          }
          break;
        }
        case 'shroomlet':
          ctx.fillStyle = '#c2fff7'; ctx.fillRect(x + 1, y - 3, 1, 3);
          ctx.fillStyle = '#59e6d8'; ctx.fillRect(x, y - 5, 3, 2);
          break;
        case 'stalactite':
          ctx.fillStyle = '#120d30';
          for (let i = 0; i < d.len; i++) { const w = Math.max(1, Math.round(5 * (1 - i / d.len))); ctx.fillRect(x - (w >> 1), y + i, w, 1); }
          break;
        case 'torch': {
          ctx.fillStyle = '#2a1d33'; ctx.fillRect(x, y - 14, 3, 14);
          ctx.fillStyle = '#8b7193'; ctx.fillRect(x - 2, y - 15, 7, 2);
          const f = Math.floor(t / 5 + d.p) % 3;
          ctx.globalAlpha = 0.08; blob(ctx, x + 1, y - 20, 10, '#ff8a2a'); ctx.globalAlpha = 0.12; blob(ctx, x + 1, y - 19, 5, '#ffb347'); ctx.globalAlpha = 1;
          ctx.fillStyle = '#ff6a1f'; ctx.fillRect(x - 1, y - 20 - f, 5, 5 + f);
          ctx.fillStyle = '#ffd166'; ctx.fillRect(x, y - 19, 3, 3);
          break;
        }
        case 'pine': {
          // scenery, not a creature: tall, translucent and green-teal (enemies are small and opaque)
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < d.h; i++) {
            const w = Math.max(1, Math.round((i / d.h) * 8));
            ctx.fillStyle = i % 5 === 0 ? '#cfe3ff' : '#3f8a78'; ctx.fillRect(x - w, y - d.h + i - 3, w * 2 + 1, 1);
          }
          ctx.fillStyle = '#6a4a3a'; ctx.fillRect(x - 1, y - 3, 3, 3);
          ctx.globalAlpha = 1;
          break;
        }
        case 'snowtuft':
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y - 2, 5, 2); ctx.fillRect(x + 1, y - 3, 3, 1);
          ctx.fillStyle = '#bcd6f5'; ctx.fillRect(x, y - 1, 5, 1);
          break;
        case 'weed':
          ctx.fillStyle = d.c;
          for (let i = 0; i < d.h; i += 2) ctx.fillRect(Math.round(x + Math.sin(t * 0.04 + d.p + i * 0.25) * (i / d.h) * 4), y - i - 2, 2, 2);
          break;
        case 'coral':
          ctx.fillStyle = d.c;
          ctx.fillRect(x + 2, y - 10, 2, 10); ctx.fillRect(x - 2, y - 8, 2, 5); ctx.fillRect(x - 2, y - 4, 4, 2);
          ctx.fillRect(x + 6, y - 12, 2, 6); ctx.fillRect(x + 4, y - 7, 4, 2); ctx.fillRect(x + 1, y - 13, 2, 3);
          ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.4; ctx.fillRect(x + 1, y - 13, 1, 1); ctx.fillRect(x + 6, y - 12, 1, 1); ctx.globalAlpha = 1;
          break;
        case 'star':
          ctx.fillStyle = d.c;
          ctx.fillRect(x + 2, y - 5, 1, 4); ctx.fillRect(x, y - 3, 5, 1); ctx.fillRect(x + 1, y - 1, 1, 1); ctx.fillRect(x + 3, y - 1, 1, 1);
          break;
        case 'ruin': {
          ctx.fillStyle = '#6a5a9a'; ctx.fillRect(x - 1, y - d.h, 9, d.h);
          ctx.fillStyle = '#cfc2ee'; ctx.fillRect(x, y - d.h, 7, d.h);
          ctx.fillStyle = '#f1ebff'; ctx.fillRect(x, y - d.h, 2, d.h);
          ctx.fillStyle = '#a99bd6'; ctx.fillRect(x + 3, y - d.h + 2, 1, d.h - 2); ctx.fillRect(x + 5, y - d.h + 2, 1, d.h - 2);
          ctx.fillStyle = '#6a5a9a'; ctx.fillRect(x - 2, y - 3, 11, 3);
          ctx.fillStyle = '#e1d8f8'; ctx.fillRect(x - 1, y - 3, 9, 1);
          break;
        }
        case 'rubble':
          ctx.fillStyle = th.ground[1]; ctx.fillRect(x, y - 2, 3, 2); ctx.fillRect(x + 4, y - 1, 2, 1);
          ctx.fillStyle = th.ground[2]; ctx.fillRect(x, y - 2, 2, 1);
          break;
      }
    }
    // Checkpoint banner
    const cp = lv.def.checkpoint;
    if (cp) {
      const x = cp * TILE + 6, y = lv.surfaceRow(cp) * TILE;
      ctx.fillStyle = '#e8f0ff'; ctx.fillRect(x, y - 30, 2, 30);
      ctx.fillStyle = INK; ctx.fillRect(x + 2, y - 30, 1, 30);
      const lit = this.checkpointReached;
      const wave = lit ? Math.floor(t / 8) % 2 : 0;
      ctx.fillStyle = lit ? '#2ec4b6' : '#6e6a88';
      ctx.fillRect(x + 2, y - 29, 10, 7); ctx.fillRect(x + 12, y - 28 + wave, 2, 5);
      ctx.fillStyle = lit ? '#ffd166' : '#a4a0bc'; ctx.fillRect(x + 5, y - 27, 3, 3);
      blob(ctx, x + 1, y - 31, 2, lit ? '#ffd166' : '#a4a0bc');
    }
    // Goal
    const g = lv.def.goal;
    if (g.type !== 'crystal') this.drawGoal(ctx, lv);
    else if (lv.crystalOn) {
      const ky = g.boss ? Math.min(150, (t - lv.crystalAppear) * 3 - 30) : 150;
      this.drawCrystal(ctx, lv.crystalX, ky + Math.sin(t * 0.05) * 3, this.player && this.player.state === 'done' ? 1.3 : 1);
    }
  }
  // Stage treasures. The base (stem, geode, cloud nest, clam) stays put; the treasure itself
  // hovers above it, and once grabbed it is drawn held over Boyo's head.
  drawGoal(ctx, lv) {
    const type = lv.def.goal.type, x = lv.crystalX, t = this.t, p = this.player;
    const held = p && (p.state === 'celebrate' || p.state === 'done');
    this.drawPedestal(ctx, lv, x);
    const base = 11 * TILE;
    // soft beacon glow so the goal reads from a distance
    if (!held) { ctx.globalAlpha = 0.1 + Math.sin(t * 0.06) * 0.04; blob(ctx, x, lv.goalY, 26, (GOAL_FX[type] || GOAL_FX.crystal)[0]); ctx.globalAlpha = 1; }
    if (type === 'flower') {
      // tall stem with two leaves
      ctx.fillStyle = INK; ctx.fillRect(x - 2, base - 26, 4, 26);
      ctx.fillStyle = '#3f9a55'; ctx.fillRect(x - 1, base - 26, 2, 26);
      for (const [dx, dy, dir] of [[-1, -12, -1], [1, -18, 1]]) {
        for (let i = 0; i < 7; i++) { const h = 3 - Math.abs(i - 3) * 0.6; ctx.fillStyle = INK; ctx.fillRect(x + dx + dir * i - (dir < 0 ? 1 : 0), base + dy - Math.round(h) - 1, 1, Math.round(h) * 2 + 2); }
        for (let i = 1; i < 6; i++) { const h = 3 - Math.abs(i - 3) * 0.6; ctx.fillStyle = '#5fd068'; ctx.fillRect(x + dx + dir * i - (dir < 0 ? 1 : 0), base + dy - Math.round(h), 1, Math.round(h) * 2); }
      }
      if (held) { ctx.fillStyle = '#3f9a55'; ctx.fillRect(x - 2, base - 28, 4, 2); }
    } else if (type === 'geode') {
      // a cracked-open geode rock with a crystal lining
      for (let i = -13; i <= 13; i++) {
        const h = Math.round(Math.sqrt(169 - i * i) * 0.9);
        ctx.fillStyle = INK; ctx.fillRect(x + i, base - h - 1, 1, h + 1);
        ctx.fillStyle = Math.abs(i) > 9 ? '#4a4466' : '#6e6a88'; ctx.fillRect(x + i, base - h, 1, h);
      }
      for (let i = -8; i <= 8; i++) {
        const h = Math.round(Math.sqrt(64 - i * i) * 0.9);
        ctx.fillStyle = '#2a1640'; ctx.fillRect(x + i, base - h - 3, 1, h);
        if (i % 2 === 0 && h > 2) { ctx.fillStyle = i % 4 ? '#c77dff' : '#ff7ad9'; ctx.fillRect(x + i, base - h - 3, 1, 2); }
      }
    } else if (type === 'feather') {
      // a little cloud nest
      for (const [dx, dy, r] of [[-9, -4, 6], [0, -6, 8], [9, -4, 6]]) blob(ctx, x + dx, base + dy, r + 1, '#aebedf');
      for (const [dx, dy, r] of [[-9, -5, 6], [0, -7, 8], [9, -5, 6]]) blob(ctx, x + dx, base + dy, r, '#ffffff');
      ctx.fillStyle = '#8a5a32'; ctx.fillRect(x - 7, base - 10, 14, 1); ctx.fillRect(x - 5, base - 9, 3, 1); ctx.fillRect(x + 3, base - 9, 3, 1);
    } else if (type === 'snowflake') {
      // a little drift of snow with ice shards poking out
      for (const [dx, r] of [[-8, 5], [0, 7], [8, 5]]) { blob(ctx, x + dx, base - 2, r + 1, '#bcd6f5'); blob(ctx, x + dx, base - 3, r, '#ffffff'); }
      for (const [dx, h] of [[-5, 7], [3, 9], [8, 5]]) { ctx.fillStyle = INK; ctx.fillRect(x + dx - 1, base - h - 3, 4, h); ctx.fillStyle = '#9fdcff'; ctx.fillRect(x + dx, base - h - 2, 2, h - 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + dx, base - h - 2, 1, 2); }
    } else if (type === 'pearl') {
      this.drawClam(ctx, x, !held);
    }
    // the treasure itself
    const [hx, hy] = held ? this.heldGoalPos() : [x, lv.goalY + Math.round(Math.sin(t * 0.05) * 2)];
    if (held) { ctx.globalAlpha = 0.25; blob(ctx, hx, hy, 14, (GOAL_FX[type] || GOAL_FX.crystal)[0]); ctx.globalAlpha = 1; }
    if (type === 'flower') this.drawSunflower(ctx, hx, hy, t);
    else if (type === 'geode') this.drawGem(ctx, hx, hy, t);
    else if (type === 'feather') this.drawFeather(ctx, hx, hy, t);
    else if (type === 'pearl' && held) this.drawPearlOrb(ctx, hx, hy, t);
    else if (type === 'snowflake') this.drawSnowflake(ctx, hx, hy, t);
  }
  // A carved stone plinth in the world's own stone, with gold trim: it makes the stage
  // treasure read as a prize on display. Occupies the 3 pedestal tiles on row 11.
  drawPedestal(ctx, lv, x) {
    const [b, d, l] = lv.theme.block, top = 11 * TILE, gold = '#ffd166', goldD = '#c8891e';
    const R = (x0, y0, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x0, y0, w, h); };
    // base step
    R(x - 24, top + 11, 48, 5, INK); R(x - 23, top + 12, 46, 4, d); R(x - 23, top + 12, 46, 1, b);
    // fluted column
    R(x - 19, top + 4, 38, 8, INK); R(x - 18, top + 4, 36, 8, b);
    for (let i = -14; i <= 14; i += 7) { R(x + i, top + 5, 1, 6, d); R(x + i + 1, top + 5, 1, 6, l); }
    // top slab with gold trim and an emblem
    R(x - 24, top - 1, 48, 6, INK); R(x - 23, top, 46, 4, b); R(x - 23, top, 46, 1, l);
    R(x - 23, top + 3, 46, 1, gold); R(x - 23, top + 4, 46, 1, goldD);
    R(x - 3, top + 6, 6, 4, INK); R(x - 2, top + 7, 4, 2, gold); R(x - 1, top + 7, 1, 1, '#fff3b0');
    if ((this.t >> 4) % 4 === 0) R(x + 20, top - 3, 1, 3, '#ffffff');
  }
  drawSnowflake(ctx, x, y, t) {
    x = Math.round(x); y = Math.round(y);
    const rot = t * 0.01;
    const arm = (col, w) => {
      for (let i = 0; i < 6; i++) {
        const a = rot + i * Math.PI / 3, cs = Math.cos(a), sn = Math.sin(a);
        for (let k = 2; k <= 11; k++) { ctx.fillStyle = col; ctx.fillRect(Math.round(x + cs * k) - w, Math.round(y + sn * k) - w, w * 2 + 1, w * 2 + 1); }
        for (const [k, len] of [[6, 3], [9, 2]]) for (const side of [-1, 1]) {
          const b = a + side * 0.9;
          for (let j = 1; j <= len; j++) { ctx.fillStyle = col; ctx.fillRect(Math.round(x + cs * k + Math.cos(b) * j) - w, Math.round(y + sn * k + Math.sin(b) * j) - w, w * 2 + 1, w * 2 + 1); }
        }
      }
    };
    arm(INK, 1); arm('#bfe9ff', 0);
    blob(ctx, x, y, 3, INK); blob(ctx, x, y, 2, '#ffffff');
    if (t % 40 < 20) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 10, y - 12, 1, 3); ctx.fillRect(x + 9, y - 11, 3, 1); }
  }
  drawSunflower(ctx, x, y, t) {
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * 0.01;
      blob(ctx, x + Math.cos(a) * 8, y + Math.sin(a) * 8, 4, INK);
    }
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * 0.01;
      blob(ctx, x + Math.cos(a) * 8, y + Math.sin(a) * 8, 3, i % 2 ? '#ffd166' : '#ffc23d');
    }
    blob(ctx, x, y, 6, INK); blob(ctx, x, y, 5, '#8a4a1e'); blob(ctx, x - 1, y - 1, 3, '#a8622a');
    ctx.fillStyle = '#5a2e10';
    for (const [dx, dy] of [[-2, 1], [1, -2], [2, 2], [-1, -1], [0, 3]]) ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1);
    if (t % 40 < 20) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + 9), Math.round(y - 12), 1, 3); ctx.fillRect(Math.round(x + 8), Math.round(y - 11), 3, 1); }
  }
  drawGem(ctx, x, y, t) {
    x = Math.round(x); y = Math.round(y);
    // faceted diamond-cut gem
    const rows = 16;
    for (let i = 0; i < rows; i++) {
      const w = i < 5 ? 5 + i * 2 : Math.max(1, 13 - (i - 5) * 1.2 | 0);
      ctx.fillStyle = INK; ctx.fillRect(x - (w >> 1) - 1, y - 7 + i, w + 2, 1);
    }
    ctx.fillStyle = INK; ctx.fillRect(x - 2, y - 8, 5, 1);
    for (let i = 0; i < rows - 1; i++) {
      const w = i < 5 ? 5 + i * 2 : Math.max(1, 13 - (i - 5) * 1.2 | 0) - 2;
      if (w <= 0) continue;
      const x0 = x - (w >> 1);
      ctx.fillStyle = i < 5 ? '#ff9ae6' : '#c43aa8'; ctx.fillRect(x0, y - 6 + i, w, 1);
      ctx.fillStyle = i < 5 ? '#ffd0f4' : '#ff7ad9'; ctx.fillRect(x0, y - 6 + i, Math.max(1, w >> 1), 1);
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 5, 2, 1); ctx.fillRect(x - 4, y - 4, 1, 2);
    if (t % 36 < 18) { ctx.fillRect(x + 6, y - 9, 1, 3); ctx.fillRect(x + 5, y - 8, 3, 1); }
  }
  drawFeather(ctx, x, y, t) {
    // a long golden feather: pointed tip, widest above the middle, notched barbs, bare quill
    const sway = Math.sin(t * 0.06) * 0.2;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(0.55 + sway);
    const half = i => {
      const k = (i + 13) / 21;                     // 0 at the tip, 1 at the base of the vane
      if (k < 0 || k > 1) return -1;
      return Math.round(Math.sin(Math.min(1, k * 1.35) * Math.PI * 0.5) * 4.5 * (k > 0.75 ? (1 - k) * 4 : 1));
    };
    const notch = i => i === -2 || i === 4;          // little splits in the vane
    for (let i = -14; i <= 9; i++) {
      const w = half(i);
      if (w < 0) continue;
      ctx.fillStyle = INK;
      if (notch(i)) ctx.fillRect(-1, i, 3, 1);
      else ctx.fillRect(-w - 1, i, w * 2 + 3, 1);
    }
    for (let i = -13; i <= 8; i++) {
      const w = half(i) - 1;
      if (w < 0 || notch(i)) continue;
      ctx.fillStyle = '#ffc23d'; ctx.fillRect(-w, i, w * 2 + 1, 1);
      ctx.fillStyle = '#fff0a8'; ctx.fillRect(-w, i, w, 1);
      ctx.fillStyle = '#e8a72a'; ctx.fillRect(w, i, 1, 1);
    }
    // quill (shaft) running through and past the vane
    ctx.fillStyle = INK; ctx.fillRect(-1, -12, 3, 26);
    ctx.fillStyle = '#fff6dc'; ctx.fillRect(0, -12, 1, 25);
    ctx.restore();
    if (t % 44 < 22) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - 10), Math.round(y - 11), 1, 3); ctx.fillRect(Math.round(x - 11), Math.round(y - 10), 3, 1); }
  }
  drawPearlOrb(ctx, x, y, t) {
    blob(ctx, x, y, 6, '#d9cfe8'); blob(ctx, x, y, 5, '#f7f2ff'); blob(ctx, x - 2, y - 2, 2, '#ffffff');
    if (t % 40 < 20) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + 4), Math.round(y - 7), 1, 3); ctx.fillRect(Math.round(x + 3), Math.round(y - 6), 3, 1); }
  }
  drawClam(ctx, x, withPearl) {
    const t = this.t, base = 11 * TILE;
    // open upper shell, fanned ridges
    for (let i = -13; i <= 13; i++) {
      const h = Math.round(Math.sqrt(169 - i * i));
      ctx.fillStyle = INK; ctx.fillRect(x + i, base - 15 - h, 1, 1);
      ctx.fillStyle = (Math.floor((i + 13) / 3) % 2) ? '#e6a3d9' : '#c97bbd';
      ctx.fillRect(x + i, base - 14 - h, 1, h);
    }
    if (withPearl) this.drawPearlOrb(ctx, x, base - 12 + Math.round(Math.sin(t * 0.05) * 1), t);
    // lower shell
    for (let i = -14; i <= 14; i++) {
      const h = Math.round(Math.sqrt(196 - i * i) * 0.45);
      ctx.fillStyle = INK; ctx.fillRect(x + i, base - h - 1, 1, 1);
      ctx.fillStyle = (Math.floor((i + 14) / 3) % 2) ? '#b86aa8' : '#d48cc4';
      ctx.fillRect(x + i, base - h, 1, h);
    }
  }
  drawCrystal(ctx, x, y, s) {
    const t = this.t;
    ctx.globalAlpha = 0.12 + Math.sin(t * 0.06) * 0.05;
    blob(ctx, x, y, Math.round(30 * s), '#5ef2ff');
    ctx.globalAlpha = 0.18;
    blob(ctx, x, y, Math.round(18 * s), '#bffff6');
    ctx.globalAlpha = 1;
    const h = 14;
    for (let i = -h; i <= h; i++) {
      const w = Math.round((h - Math.abs(i)) * 0.6);
      ctx.fillStyle = i < -4 ? '#bffff6' : i < 4 ? '#5ef2ff' : '#2bb3c6';
      ctx.fillRect(Math.round(x - w), Math.round(y + i), w * 2 + 1, 1);
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - 2), Math.round(y - 8), 1, 6);
    if (t % 30 < 15) { ctx.fillRect(Math.round(x + 5), Math.round(y - 12), 1, 3); ctx.fillRect(Math.round(x + 4), Math.round(y - 11), 3, 1); }
    // pedestal trim
    ctx.fillStyle = '#ffd166';
    if (this.level && this.level.crystalX === x && !this.level.def.goal.boss) ctx.fillRect(x - 24, 11 * TILE, 48, 2);
  }

  drawPlayer(ctx) {
    const p = this.player;
    if (!p || p.hidden) return;
    if (p.state === 'dead') { drawSprite(ctx, SPR.die, p.x + p.w / 2, p.y + p.h + 1, false); return; }
    if (p.invuln > 0 && this.freezeT === 0 && (p.invuln >> 2) % 2 === 0) return;
    let power = p.power;
    if (this.freezeT > 0) power = Math.floor(this.freezeT / 4) % 2 ? this.freezeFrom : p.power;
    const full = p.charge >= CHARGE_FULL;
    if (p.charge >= CHARGE_MID && p.state === 'play') {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, pulse = Math.sin(this.t * (full ? 0.5 : 0.3));
      const volt = p.suit === 'volt';
      ctx.globalAlpha = full ? 0.35 + pulse * 0.12 : 0.22 + pulse * 0.08;
      blob(ctx, cx, cy, full ? 20 + Math.round(pulse * 2) : 15, volt ? (full ? '#fff6a0' : '#7ad7ff') : full ? '#ffd166' : '#ff8a2a');
      ctx.globalAlpha = full ? 0.5 : 0.3; blob(ctx, cx, cy, full ? 12 : 9, volt ? '#ffffff' : full ? '#ffffff' : '#ffb347');
      ctx.globalAlpha = 1;
    }
    const suit = p.suit || 'fire';
    const set = power === 0 ? SPR.small : power === 1 ? SPR.big : suit === 'fire' ? (full && (this.t >> 2) % 2 ? SPR.hot : SPR.fire) : SPR.suit[suit];
    if (p.roll > 0 && p.state === 'play') {
      const img = set.crouch, cx = p.x + p.w / 2, cy = p.y + p.h - img.height / 2 + 1;
      for (let i = 2; i >= 0; i--) {
        ctx.save();
        ctx.globalAlpha = i ? 0.25 / i : 1;
        ctx.translate(Math.round(cx - p.rollDir * i * 6), Math.round(cy));
        ctx.rotate(p.rollSpin - i * 0.5 * p.rollDir);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      }
      return;
    }
    if (p.state === 'celebrate' || (p.state === 'done' && !p.hidden)) {
      const d = this.dancePose(p);
      drawSprite(ctx, set[d.f], p.x + p.w / 2 + d.dx, p.y + p.h + d.dy, d.flip, d.sx, d.sy);
      return;
    }
    let f = this.t % 200 < 7 ? 'blink' : 'idle', bob = 0;
    if (p.crouch) f = 'crouch';
    else if (p.pounding) f = 'fall';
    else if (!p.onGround && this.level && this.level.water) f = p.stroke > 6 ? 'jump' : 'run' + (Math.floor(this.t / 9) % 4);
    else if (!p.onGround && p.spin) f = 'jump';
    else if (!p.onGround) f = p.vy > 1 ? 'fall' : 'jump';
    else if (p.skid) f = 'skid';
    else if (Math.abs(p.vx) > 0.15) { const k = Math.floor(p.anim) % 4; f = 'run' + k; bob = k % 2; }
    const whirl = p.spin && !p.onGround && p.state === 'play';
    if (whirl) {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, a0 = this.t * 0.6;
      for (let i = 0; i < 10; i++) {
        const a = a0 + i * 0.35, r = p.power ? 15 : 12;
        ctx.globalAlpha = 0.15 + i * 0.07; ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.45), 2, 1);
      }
      ctx.globalAlpha = 1;
    }
    const ccx = p.x + p.w / 2, flip = whirl ? (this.t >> 2) % 2 === 0 : p.facing < 0;
    const gale = power === 2 && suit === 'gale' && !p.onGround && p.state === 'play';
    if (gale) this.drawWings(ctx, p, p.gliding ? 0 : Math.sin(this.t * 0.5) * 2);
    if (power === 2 && suit === 'quake' && p.state === 'play') this.drawHeldIcon(ctx, p, SPR.itemQuake, 13, p.pounding ? -3 : 1, p.pounding ? 0 : -0.5, true);
    drawSprite(ctx, set[f], ccx, p.y + p.h - bob, flip, whirl ? 0.92 : p.sx, p.sy);
    if (power === 2 && p.state === 'play') {
      if (suit === 'ice' || suit === 'volt') this.drawHeldIcon(ctx, p, suit === 'ice' ? SPR.itemIce : SPR.itemVolt, suit === 'ice' ? 11 : 8, 4 - (p.wand > 0 ? 3 : 0), p.wand > 0 ? -0.5 : 0.35, false);
    }
    if (p.pounding && p.poundT > POUND_HANG) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffd166';
      for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(ccx - 3 + i * 3), Math.round(p.y - 8 - i * 3), 1, 7);
      ctx.globalAlpha = 1;
    }
  }
  // Small prop (wand, mallet, orb) held out in front of Boyo's hand.
  drawHeldIcon(ctx, p, img, size, dx, rot, behind) {
    const hx = p.x + p.w / 2 + p.facing * (p.w / 2 + dx - (behind ? 8 : 0)), hy = p.y + (p.crouch ? 6 : 12) + (behind ? -4 : 0);
    ctx.save();
    ctx.translate(Math.round(hx), Math.round(hy));
    ctx.scale(p.facing, 1);
    ctx.rotate(rot);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  // Gale feather wings: a fan of feathers either side of Boyo, flapping or held out to glide.
  drawWings(ctx, p, bob) {
    const cx = p.x + p.w / 2, cy = p.y + 8 + bob;
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const len = 9 - k, y = cy - 3 + k * 3 + (p.gliding ? 0 : bob * (k - 1) * 0.5);
        ctx.fillStyle = INK; ctx.fillRect(Math.round(s > 0 ? cx + 4 : cx - 4 - len - 1), Math.round(y - 1), len + 1, 4);
        ctx.fillStyle = k % 2 ? '#d8ffe4' : '#ffffff'; ctx.fillRect(Math.round(s > 0 ? cx + 4 : cx - 4 - len), Math.round(y), len, 2);
        ctx.fillStyle = '#9ae8a8'; ctx.fillRect(Math.round(s > 0 ? cx + 4 + len - 2 : cx - 4 - len), Math.round(y), 2, 2);
      }
    }
  }

  drawParticles(ctx) {
    for (const q of this.particles) {
      const x = Math.round(q.x), y = Math.round(q.y);
      switch (q.kind) {
        case 'px':
          ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
          ctx.fillStyle = q.color; ctx.fillRect(x, y, q.streak || q.size, q.size);
          break;
        case 'spark': {
          ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
          ctx.fillStyle = q.color;
          ctx.fillRect(x, y, 1, 1);
          if (q.t < q.life * 0.6) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
          break;
        }
        case 'frag': {
          const [b, d] = this.level.theme.brick;
          ctx.fillStyle = d; ctx.fillRect(x, y, 8, 8);
          ctx.fillStyle = b; ctx.fillRect(x + 1, y + 1, 6, 5);
          break;
        }
        case 'pollen': drawPollen(ctx, q.x, q.y, this.t * 3, q.color, 0.8); break;
        case 'pep': ctx.globalAlpha = Math.max(0, 1 - q.t / q.life); drawSpun(ctx, SPR.pepperA, x, y, 8, q.t * q.spin); break;
        case 'text':
          ctx.globalAlpha = q.t > q.life - 12 ? (q.life - q.t) / 12 : 1;
          drawText(ctx, q.text, x, y, q.color, { align: 'center', shadow: INK });
          break;
      }
      ctx.globalAlpha = 1;
    }
  }

  drawHUD(ctx) {
    const sh = INK, val = '#ffffff', lbl = '#9fd8f0', y = 2;
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, 11); ctx.globalAlpha = 1;
    drawText(ctx, pad(this.score, 6), 8, y, val, { shadow: sh });
    const pl = this.player;
    if (pl && pl.power === 2 && pl.suit && this.mode !== 'title' && this.mode !== 'select') {
      const inf = SUIT_INFO[pl.suit], icon = SPR[inf.icon];
      ctx.drawImage(icon, 0, 0, icon.width, icon.height, 56, 1, 9, 9);
    }
    const cx = 92;
    drawPollen(ctx, cx + 3, y + 3, this.t, POLLEN_COL[this.level ? this.level.themeName : 'meadow'] || POLLEN_COL.meadow, this.hudPulse > 0 ? 0.75 : 0.55);
    drawText(ctx, '*' + pad(this.coins, 2), cx + 8, y, val, { shadow: sh });
    drawText(ctx, 'STAGE', 158, y, lbl, { shadow: sh });
    drawText(ctx, LEVELS[this.levelIndex].id, 194, y, val, { shadow: sh });
    const time = this.time || 0;
    const hurry = this.mode === 'play' && time <= 100 && Math.floor(this.t / 15) % 2 === 0;
    drawText(ctx, 'TIME', 254, y, lbl, { shadow: sh });
    drawText(ctx, pad(time, 3), 284, y, hurry ? '#ff5d73' : val, { shadow: sh });
    ctx.drawImage(SPR.lifeIcon, 3, 5, 15, 8, 337, 1, 15, 8);
    drawText(ctx, '*' + pad(this.lives, 2), 355, y, val, { shadow: sh });
    if (this.mode === 'play' && this.level && this.level.def.wind && this.windPhase !== 'calm' && (this.windPhase === 'gust' || (this.t >> 3) % 2)) {
      const txt = this.windDir < 0 ? '<<< WIND' : 'WIND >>>';
      drawText(ctx, txt, VIEW_W / 2, 15, this.windPhase === 'gust' ? '#ffffff' : '#9fe3ff', { align: 'center', shadow: sh });
    }
    if (this.tip && this.mode !== 'title') {
      const inf = SUIT_INFO[this.tip.suit], k = this.tip.t, a = Math.min(1, k / 12, (TIP_FRAMES - k) / 20);
      const w = Math.max(textWidth(inf.name, 2), textWidth(inf.tip)) + 24, x = Math.round(VIEW_W / 2 - w / 2), y0 = 40;
      ctx.globalAlpha = Math.max(0, a);
      this.drawPanel(ctx, x, y0, w, 36, inf.color);
      drawText(ctx, inf.name, VIEW_W / 2, y0 + 6, inf.color, { align: 'center', scale: 2, shadow: sh });
      drawText(ctx, inf.tip, VIEW_W / 2, y0 + 24, '#ffffff', { align: 'center', shadow: sh });
      ctx.globalAlpha = 1;
    }
    const bo = this.boss;
    if (bo && bo.state !== 'sleep' && !bo.remove) {
      const bw = 160, bx = VIEW_W / 2 - bw / 2, bt = 24, fw = Math.round(bw * bo.shown);
      drawText(ctx, 'MAGMAW', VIEW_W / 2, 14, '#ff8a2a', { align: 'center', shadow: sh });
      ctx.fillStyle = INK; ctx.fillRect(bx - 2, bt - 2, bw + 4, 9);
      ctx.fillStyle = '#4a1a2a'; ctx.fillRect(bx, bt, bw, 5);
      ctx.fillStyle = bo.flash > 0 ? '#ffb59c' : '#ff5d73'; ctx.fillRect(bx, bt, fw, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx, bt, fw, 1);
      ctx.fillStyle = INK; ctx.fillRect(bx + Math.round(bw / 3) - 1, bt, 1, 5); ctx.fillRect(bx + Math.round(bw * 2 / 3) - 1, bt, 1, 5);
    }
  }

  drawPanel(ctx, x, y, w, h, border = '#2ec4b6') {
    ctx.fillStyle = 'rgba(11,9,24,0.88)';
    ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4); ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = border;
    ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
    ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  }
  drawMenu(ctx, items, sel, cx, y, gap = 12) {
    items.forEach((s, i) => {
      const on = i === sel;
      const tw = textWidth(s);
      this.menuHits.push({ x: cx - tw / 2 - 18, y: y + i * gap - 3, w: tw + 36, h: gap, i });
      drawText(ctx, s, cx, y + i * gap, on ? '#ffd166' : '#b8b2d8', { align: 'center', shadow: INK });
      if (on && Math.floor(this.t / 16) % 2 === 0) {
        const w = textWidth(s);
        drawText(ctx, '>', cx - w / 2 - 12, y + i * gap, '#ffd166');
        drawText(ctx, '<', cx + w / 2 + 6, y + i * gap, '#ffd166');
      }
    });
  }

  drawGroundStrip(ctx, theme, cam) {
    const ts = getTileset(theme);
    const off = -(Math.round(cam) % TILE);
    for (let x = off; x < VIEW_W; x += TILE) { ctx.drawImage(ts.groundTop, x, 12 * TILE); ctx.drawImage(ts.ground, x, 13 * TILE); }
  }

  drawTitle(ctx) {
    drawBackground(ctx, 'meadow', this.titleCam, this.t);
    this.drawAmbient(ctx);
    this.drawGroundStrip(ctx, 'meadow', this.titleCam);
    // little scene: Boyo idling, a Grumblet pacing
    const bob = Math.floor(this.t / 30) % 2;
    drawSprite(ctx, bob ? SPR.small.idle : SPR.small.idle, 62, 12 * TILE, false);
    const gx = 330 + Math.sin(this.t * 0.01) * 26;
    drawSprite(ctx, Math.floor(this.t / 10) % 2 ? SPR.grumbletB.meadow : SPR.grumblet.meadow, gx, 12 * TILE, Math.cos(this.t * 0.01) < 0);
    ctx.drawImage(getTileset('meadow')['q' + [0, 0, 0, 1, 2, 1][Math.floor(this.t / 8) % 6]], 54, 8 * TILE);
    // logo
    drawLogo(ctx, VIEW_W / 2, 14, this.t);
    const saved = !!this.save;
    this.drawMenu(ctx, this.titleItems().map(i => i.label), this.menu, VIEW_W / 2, saved ? 78 : 82, saved ? 11 : 12);
    // controls card
    const rows = Pad.used
      ? (Pad.isPS()
        ? [['D-PAD / L-STICK', 'MOVE'], ['CROSS', 'JUMP'], ['SQUARE / R1', 'RUN / FIRE'], ['CIRCLE', 'ROLL'], ['TRIANGLE', 'SPIN JUMP'], ['OPTIONS', 'PAUSE'], ['CREATE', 'BACK']]
        : [['D-PAD / L-STICK', 'MOVE'], ['A', 'JUMP'], ['X / RB', 'RUN / FIRE'], ['B', 'ROLL'], ['Y', 'SPIN JUMP'], ['MENU', 'PAUSE'], ['VIEW', 'BACK']])
      : this.touch
      ? [['← → PAD', 'MOVE'], ['A BUTTON', 'JUMP'], ['B BUTTON', 'RUN / FIRE'], ['THUMB ON A+B', 'RUN + JUMP'], ['TAP MENUS', 'SELECT']]
      : [['← → / A D', 'MOVE'], ['SPACE / Z / ↑ / W', 'JUMP'], ['SHIFT / X', 'RUN / FIRE'], ['C / L', 'ROLL'], ['V / I', 'SPIN JUMP'], ['P / ESC', 'PAUSE'], ['F', 'FULLSCREEN']];
    const gap = rows.length > 6 ? 11 : 12;
    const cy0 = saved ? 122 : 116;
    this.drawPanel(ctx, 106, cy0, 188, 6 + gap * rows.length, '#3a3170');
    rows.forEach(([k, a], i) => {
      drawText(ctx, k, 116, cy0 + 5 + i * gap, '#ffffff');
      drawText(ctx, a, 284, cy0 + 5 + i * gap, '#2ec4b6', { align: 'right' });
    });
    drawText(ctx, 'TOP ' + pad(this.top, 6), VIEW_W / 2, 208, '#ffffff', { align: 'center', shadow: INK });
  }

  drawSelect(ctx) {
    drawBackground(ctx, 'meadow', this.titleCam, this.t);
    this.drawAmbient(ctx);
    this.drawGroundStrip(ctx, 'meadow', this.titleCam);
    this.drawPanel(ctx, 70, 28, 260, 28 + LEVELS.length * 16 + 34, '#3a3170');
    drawText(ctx, 'LEVEL SELECT', VIEW_W / 2, 38, '#ffffff', { align: 'center', scale: 2, shadow: INK });
    const items = LEVELS.map(l => l.id + '  ' + l.name).concat('BACK');
    this.drawMenu(ctx, items, this.menu, VIEW_W / 2, 66, 16);
  }

  drawIntro(ctx) {
    const def = LEVELS[this.levelIndex], th = THEMES[def.theme];
    ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + this.t * 0.2) % VIEW_W, y = (i * 53) % VIEW_H;
      ctx.fillStyle = i % 3 ? '#221c44' : '#3a3170'; ctx.fillRect(Math.round(x), y, 1, 1);
    }
    this.drawHUD(ctx);
    drawText(ctx, 'STAGE ' + def.id, VIEW_W / 2, 72, '#ffffff', { align: 'center', scale: 2, shadow: INK });
    drawText(ctx, def.name, VIEW_W / 2, 96, th.accent, { align: 'center', shadow: INK });
    drawSprite(ctx, SPR.small.idle, VIEW_W / 2 - 18, 134, false);
    drawText(ctx, '* ' + this.lives, VIEW_W / 2 - 4, 124, '#ffffff');
    if (this.useCheckpoint) drawText(ctx, 'RESUMING FROM CHECKPOINT', VIEW_W / 2, 150, '#8a83b0', { align: 'center' });
    if (def.hint) drawText(ctx, 'TIP: ' + def.hint, VIEW_W / 2, 190, '#ffd166', { align: 'center' });
  }

  drawPause(ctx) {
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 11, VIEW_W, VIEW_H - 11); ctx.globalAlpha = 1;
    this.drawPanel(ctx, 110, 40, 180, 130);
    drawText(ctx, 'PAUSED', VIEW_W / 2, 50, '#ffffff', { align: 'center', scale: 2, shadow: INK });
    const labels = ['RESUME', 'RESTART LEVEL', null, null, 'QUIT TO TITLE'];
    const y0 = 76, gap = 16;
    labels.forEach((s, i) => {
      const y = y0 + i * gap, on = i === this.menu;
      if (s) {
        const tw = textWidth(s);
        this.menuHits.push({ x: VIEW_W / 2 - tw / 2 - 18, y: y - 3, w: tw + 36, h: gap, i });
        drawText(ctx, s, VIEW_W / 2, y, on ? '#ffd166' : '#b8b2d8', { align: 'center', shadow: INK });
        if (on && Math.floor(this.t / 16) % 2 === 0) {
          drawText(ctx, '>', VIEW_W / 2 - tw / 2 - 12, y, '#ffd166');
          drawText(ctx, '<', VIEW_W / 2 + tw / 2 + 6, y, '#ffd166');
        }
        return;
      }
      const kind = i === 2 ? 'music' : 'sfx', v = kind === 'music' ? Sound.musicVol : Sound.sfxVol;
      const bx = 188, bw = 88, col = on ? '#ffd166' : '#b8b2d8';
      drawText(ctx, kind === 'music' ? 'MUSIC' : 'SFX', 126, y, col, { shadow: INK });
      ctx.fillStyle = '#2a2450'; ctx.fillRect(bx, y + 1, bw, 5);
      ctx.fillStyle = on ? '#ffd166' : '#2ec4b6'; ctx.fillRect(bx, y + 1, Math.round(bw * v), 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + Math.round(bw * v) - 1, y - 1, 3, 9);
      this.menuHits.push({ x: 120, y: y - 3, w: 160, h: gap, i, bar: { x: bx, w: bw, kind } });
    });
  }

  drawClear(ctx) {
    const def = LEVELS[this.levelIndex], next = LEVELS[this.levelIndex + 1];
    const a = Math.min(1, this.clearT / 20);
    ctx.globalAlpha = a;
    this.drawPanel(ctx, 100, 48, 200, 128, '#ffd166');
    drawText(ctx, 'STAGE CLEAR!', VIEW_W / 2, 60, '#ffd166', { align: 'center', scale: 2, shadow: INK });
    drawText(ctx, 'STAGE ' + def.id + '  ' + def.name, VIEW_W / 2, 84, '#bfe9ff', { align: 'center' });
    drawText(ctx, 'TIME BONUS', 116, 102, '#ffffff'); drawText(ctx, '+' + (this.bonus || 0), 284, 102, '#7be08a', { align: 'right' });
    drawText(ctx, 'POLLEN', 116, 114, '#ffffff'); drawText(ctx, '*' + pad(this.coins, 2), 284, 114, '#ffd23f', { align: 'right' });
    drawText(ctx, 'SCORE', 116, 126, '#ffffff'); drawText(ctx, pad(this.score, 6), 284, 126, '#ffffff', { align: 'right' });
    if (next) drawText(ctx, 'NEXT: ' + next.id + ' ' + next.name, VIEW_W / 2, 144, THEMES[next.theme].accent, { align: 'center' });
    else drawText(ctx, 'MORE WORLDS COMING SOON!', VIEW_W / 2, 144, '#ffd166', { align: 'center' });
    if (this.clearT > 60 && Math.floor(this.t / 20) % 2 === 0) drawText(ctx, Pad.used ? (Pad.isPS() ? 'PRESS CROSS' : 'PRESS A') : 'PRESS ENTER', VIEW_W / 2, 160, '#b8b2d8', { align: 'center' });
    ctx.globalAlpha = 1;
  }

  drawGameOver(ctx) {
    ctx.fillStyle = '#0b0918'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(ctx, 'GAME OVER', VIEW_W / 2, 60, '#ff5d73', { align: 'center', scale: 3, shadow: '#3a0d1d' });
    drawText(ctx, 'SCORE  ' + pad(this.score, 6), VIEW_W / 2, 104, '#ffffff', { align: 'center' });
    drawText(ctx, 'TOP    ' + pad(this.top, 6), VIEW_W / 2, 116, '#ffd166', { align: 'center' });
    this.drawMenu(ctx, ['CONTINUE FROM ' + LEVELS[this.levelIndex].id, 'QUIT TO TITLE'], this.menu, VIEW_W / 2, 146, 14);
    drawSprite(ctx, SPR.die, VIEW_W / 2, 196, false);
  }

}

// Title logo: classic square block letters (even 2-cell strokes, hard corners), one beanie
// colour each, with a glossy top, a 3D extrusion and a clean outline. Built once; drawn per letter so they bob.
const LOGO_GLYPHS = {
  B: ['#######.', '##....##', '##....##', '#######.', '##....##', '##....##', '#######.'],
  O: ['########', '##....##', '##....##', '##....##', '##....##', '##....##', '########'],
  Y: ['##....##', '##....##', '##....##', '.######.', '...##...', '...##...', '...##...'],
};
// [shine, light, base, shade, extrusion] per letter
const LOGO_COLORS = [
  ['#ffe3e8', '#ff8a9a', '#ff5d73', '#d63a57', '#8a1f38'],
  ['#fffbe0', '#ffe48a', '#ffd166', '#e8a72a', '#9a6210'],
  ['#e0fffb', '#7ff0e2', '#2ec4b6', '#1c978b', '#0f5c55'],
  ['#e6f6ff', '#8fd0ff', '#4fb3ff', '#2f86d6', '#1a4c8a'],
];
let logoLetters = null;
function getLogoLetters() {
  if (logoLetters) return logoLetters;
  const S = 6, P = 2, EX = 4;   // cell size, outline thickness, extrusion depth
  logoLetters = 'BOYO'.split('').map((ch, i) => {
    const rows = LOGO_GLYPHS[ch], cols = rows[0].length, gw = cols * S, gh = rows.length * S;
    const on = (x, y) => y >= 0 && y < rows.length && x >= 0 && x < cols && rows[y][x] === '#';
    const [shine, light, base, shade, deep] = LOGO_COLORS[i];
    const mask = color => {
      const m = makeCanvas(gw, gh), g = m.getContext('2d');
      g.fillStyle = color;
      for (let y = 0; y < rows.length; y++) for (let x = 0; x < cols; x++) {
        if (!on(x, y)) continue;
        g.fillRect(x * S, y * S, S, S);
      }
      return m;
    };
    const c = makeCanvas(gw + P * 2, gh + P * 2 + EX), g = c.getContext('2d');
    // outline: the silhouette stamped in a rounded brush, stretched down over the extrusion
    const ink = mask(INK);
    for (let dy = -P; dy <= P + EX; dy++) for (let dx = -P; dx <= P; dx++) g.drawImage(ink, P + dx, P + dy);
    // 3D extrusion
    const ext = mask(deep);
    for (let dy = 1; dy <= EX; dy++) g.drawImage(ext, P, P + dy);
    // face: light top, base middle, shade bottom, glossy shine on top/left edges
    const face = mask('#ffffff'), fg = face.getContext('2d');
    fg.globalCompositeOperation = 'source-atop';
    fg.fillStyle = light; fg.fillRect(0, 0, gw, gh);
    fg.fillStyle = base; fg.fillRect(0, Math.round(gh * 0.34), gw, gh);
    fg.fillStyle = shade; fg.fillRect(0, Math.round(gh * 0.78), gw, gh);
    fg.fillStyle = shine;
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < cols; x++) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1)) fg.fillRect(x * S + (on(x - 1, y) ? 0 : 2), y * S + 1, S - (on(x - 1, y) ? 0 : 2) - (on(x + 1, y) ? 0 : 2), 1);
      if (!on(x - 1, y) && y * S < gh * 0.6) fg.fillRect(x * S + 1, y * S + (on(x, y - 1) ? 0 : 2), 1, S - (on(x, y - 1) ? 0 : 2));
    }
    g.drawImage(face, P, P);
    return c;
  });
  return logoLetters;
}
function drawLogo(ctx, cx, y, t) {
  const L = getLogoLetters(), gap = 3;
  const total = L.reduce((a, c) => a + c.width, 0) + gap * (L.length - 1);
  let x = Math.round(cx - total / 2);
  L.forEach((c, i) => {
    const bob = Math.round(Math.sin(t * 0.07 - i * 0.8) * 3);
    ctx.drawImage(c, x, y + bob);
    x += c.width + gap;
  });
  // twinkles around the logo
  for (const [dx, dy, ph] of [[-total / 2 - 10, 10, 0], [total / 2 + 8, 4, 1.7], [total / 2 + 14, 40, 3.1], [-total / 2 - 4, 44, 4.4]]) {
    const k = Math.sin(t * 0.08 + ph);
    if (k < 0.2) continue;
    const sx = Math.round(cx + dx), sy = Math.round(y + dy), r = k > 0.8 ? 3 : 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - r, sy, r * 2 + 1, 1); ctx.fillRect(sx, sy - r, 1, r * 2 + 1);
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(sx, sy, 1, 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. BOOT & FIXED-TIMESTEP LOOP
// ═══════════════════════════════════════════════════════════════════════════
let game = null;
function boot() {
  const canvas = document.getElementById('game');
  buildSprites();
  game = new Game(canvas);

  const root = document.documentElement;
  let refit = null;
  const markTouch = () => {
    if (root.classList.contains('touch')) return;
    root.classList.add('touch'); game.touch = true;
    if (refit) refit();
  };
  if ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window) markTouch();

  // ---- responsive scaling: integer scale on desktop, fill the screen on touch devices
  const fit = () => {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    const touch = root.classList.contains('touch'), portrait = vh > vw;
    root.classList.toggle('portrait', touch && portrait);
    let aw = vw - 24, ah = vh - 24;
    if (touch && portrait) { aw = vw - 8; ah = Math.max(120, vh - 64 - 230); }
    else if (touch) { aw = vw; ah = vh; }
    const s = Math.floor(Math.min((aw * dpr) / VIEW_W, (ah * dpr) / VIEW_H));
    let w, h;
    if (s >= 1 && !touch) { w = (VIEW_W * s) / dpr; h = (VIEW_H * s) / dpr; }
    else { const f = Math.min(aw / VIEW_W, ah / VIEW_H); w = VIEW_W * f; h = VIEW_H * f; }
    canvas.style.width = Math.floor(w) + 'px';
    canvas.style.height = Math.floor(h) + 'px';
  };
  refit = fit;
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
  const onFsChange = () => { if (fsBtn) fsBtn.classList.toggle('on', !!fsElement()); setTimeout(fit, 60); };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  if (fsBtn) fsBtn.addEventListener('click', () => { toggleFullscreen(); fsBtn.blur(); });

  // ---- keyboard
  window.addEventListener('keydown', e => {
    Sound.unlock();
    const a = KEYMAP[e.code];
    if (!a) return;
    Pad.used = false;
    e.preventDefault();
    if (Input.codes.has(e.code)) return;
    Input.press(e.code);
    if (a === 'fullscreen') toggleFullscreen();
  });
  window.addEventListener('keyup', e => {
    if (KEYMAP[e.code]) e.preventDefault();
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
  window.addEventListener('pointerdown', () => Sound.unlock());
  window.addEventListener('touchend', () => Sound.unlock());
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
    if (on && !Input.codes.has(code)) Input.press(code);
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

  let acc = 0, last = performance.now();
  function frame(now) {
    acc += Math.min(250, now - last);
    last = now;
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
      game.render();
      Music.update();
    } catch (err) {
      acc = 0;
      console.error('BOYO frame error:', err);   // keep the loop alive no matter what
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Debug / test hook (harmless in normal play)
window.BOYO = { SPR, LEVELS, Input, Pad, Sound, Music, get game() { return game; }, boot, Level, T, TILE };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
