'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 1. LEVEL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
/*
  A level is plain data. The screen is 14 tiles tall (rows 0-13); the normal
  ground surface is row 12 (rows 12-13 are filled). Columns run left → right.

  Fields
    id, name, theme ('meadow' | 'cave' | 'sky' | 'citadel' | 'ocean' | 'snow' | 'clock' | 'eclipse' | 'desert' | 'jungle' | 'bayou' | 'gumbo'), music (song name),
    width (columns), start (column), checkpoint (column, or a list of columns; optional), hint (text)
    letters: [[x, y], [x, y], [x, y]]  where the C, K and R letter eggs float (tile column, row). Collect
          all three in one go at a stage for a big bonus and a fireworks show; they stay collected
          through deaths, but not into the next attempt at the stage
    secrets: [[c0, r0, c1, r1, cap = 0], ...]  secret hollows (DKC style); optional solid roof thickness in pixels:
          that block of tiles is drawn as rock but
          isn't solid; stepping (or swimming) in turns its rock see-through over a little cavity. Put an egg
          inside one and it stays hidden till the hollow opens. Its only clue is a small glint that winks
          on its open faces every few seconds (until it's found), so give it at least one face onto open space
    goal: { type: 'exit', x } walks off the right edge; boss exits open after defeat.
          finale: true preserves the special Gut, Gumbo, and Bayou endings.
    ceiling: true   draw a jagged rock overhang with stalactites along the top (scenery only)
    wind: { calm, warn, gust, force }  frames of calm, warning and gust per cycle; gusts push
          the player by `force` px/frame and alternate direction each cycle
    water: { top }  whole level is underwater below row `top`: swimming physics, no stomping
    currents: [[x0, x1, fx, fy], ...]  water flow over columns x0-x1 (fx pushes sideways in
          px/frame, fy accelerates up (-) or down (+); fy < 0 renders as a bubble vent)
    clock: { period, jumpFrom }  TICK/TOCK blocks swap every `period` frames (with warning
          ticks); from column `jumpFrom` on they swap on every jump instead
    signs: [[x, title, line, colour?, { grow }?], ...]  a tip the first time Chickaroo reaches column x ({JUMP} {RUN} {ROLL}
                    {SPIN} {DOWN} name the player's buttons; grow: true also makes him big, if he's small); signsHold: true makes
                    them lessons that pause play until jump (once he's standing still on the ground)
    quiet: true     no dialogue or tips anywhere in the stage, boss included (only the cat companion still talks)
    day: true       (meadow) one summer's day: the sky goes from dawn to sunset and the sun crosses it as he goes
    sun: [x0, x1, period]  (with day) a bank of cloud drifts over the sun once every `period` frames while the camera's over
                    columns x0-x1, hiding it most of the time (a bloom with `sun` only bows to him while it's hidden)
    scalding: [x0, x1]  (4-1) roux in these columns is boiling broth: drawn red, it scalds on contact (no grace period)
    catAt: col      where the cat companion waits (default: the nearest ground to 60% of the way along);
                    or [col, row] to sit it right on top of that tile (e.g. on a row of blocks)
    catKind: 'murray'  which cat waits there (default: Murray or Beebeez at random)
    catLine: '...'  what Chickaroo says on finding it (a held line: play waits for jump; then the cat says hello)
    welcome: ['...', ...]   a note from the author, shown once a session when the stage is started from the top: once he's
                            landed and the screen is clear, play pauses for it, a page per entry (jump turns the page); '\n'
                            breaks a line
    catHits: 7      how many hits the cat lands before it leaves (default 4)
    bossMusic: 'boss14'  the boss fight's own track (MUSIC_FILES), swapped in when the fight starts
    boss: { trigger, wall, right }  boss arena: crossing column `trigger` seals column
          `wall` and locks the camera there; `right` is the arena's solid right wall
    theme 'eclipse' is dark: only the space around Chickaroo, lit moonlamps and fireballs is
          fully lit, and the sky's eclipse clears as UMBRAROO is worn down
    zones: [[x0, x1, kind], ...]  stretches with their own scenery: 'temple' (carved back wall,
          urns and braziers instead of cacti), 'oasis' (palms and agaves) in the desert; 'ruins'
          (an overgrown stone wall with a carved idol face) in the jungle
    canopy: true    draw a leafy canopy along the top of the screen (vines hang from it)
    hellfire: true  the stage's lava burns: flame tongues, a heat haze and embers rising off its surface
    snowballStops: [[x0, x1], ...]  a snowball bursts once its leading edge reaches these columns, even in mid-air (so a hop cannot carry it past)
    monsoon: { start, delay, dry, warn, rise, flood, fall }  frames of each part of the weather cycle: a
          dry spell, storm clouds gathering, the downpour (every river rises), the flood, the water
          draining away. `delay` adds extra dry frames before the first storm; with `start` (a column)
          the skies hold until Chickaroo gets there, and the first storm gathers `delay` frames later
    rivers: [[x0, x1, lowRow, highRow], ...]  water over columns x0-x1, its surface at lowRow in the
          dry spell and highRow in a flood (fractional rows are fine). Chickaroo can wade; water
          over his head drowns him (so does sinking into a bottomless river), and the rising water
          sweeps enemies off a riverbed. Needs `monsoon` to ever rise. The water fills tunnels under
          overhangs too, so a riverbed passage is only safe in the dry spell
    band: true      the stage's music is the live band of 3-3 (bayou-music.js): just crickets until musicians
                    ('bandmate') join the parade, each adding his part -- and the bayou plays along (see
                    enemies-bayou.js for 'drum', 'valve', 'rest', 'staff', 'hush', 'gator' and friends)
    falls: [[col, row, side], ...]  waterfalls spilling off the lip of tile (col, row) on its side
          (-1 left, 1 right) down to the river below; the monsoon swells them (scenery only)

  map commands (applied in order, later ones overwrite earlier ones)
    ['ground', x0, x1, topRow = 12]   solid ground from topRow down to the bottom
    ['row', x, y, 'chars']            place tiles by character, '.' = leave as is
    ['rect', x0, y0, x1, y1, 'char']  fill a rectangle with one tile character
    ['pipe', x, height]               2-wide hollow log standing on row 12
    ['stairs', x, n, dir]             staircase n wide on row 12; dir 1 = up, -1 = down
    ['coins', x, y, n]                horizontal row of pollen puffs (the collectible)
    ['lava', x0, x1]                  lava surface in row 13 (use inside a pit)
    ['power', x, y, kind]             power-up block giving 'berry' | 'ice' | 'gale' | 'volt' | 'quake' | 'pepper' | 'rand'
                                      (or 'coin': a gold coin, the camel's fare -- see 'camel')
                                      (always that power, at any size; a plain 'M' block gives a berry; 'rand' = a random suit)
    ['seed', x, y, topRow = 2]        seed block: bump it and a beanstalk grows up to topRow, unfurling
                                      two-tile leaf ledges on alternating sides (both sides at the top)

  tile characters
    X ground   B brick   ? star block (coin)   M power-up block   U 1-UP block
    N multi-pollen crate   S solid block  - semi-solid ledge (jump through from below)
    h hidden 1-UP block  o pollen puff
    C crumbling cloud (gives way shortly after being stood on, then reforms)
    I ice (solid and slippery: slow to get going, slow to stop)
    T TICK block / K TOCK block: exactly one of the two kinds is solid at a time (see `clock`)
    G seed block (prefer the 'seed' command, which also sets how high the beanstalk grows)
    H hot coals: solid, but nobody stands still on them -- every landing bounces Chickaroo back up (OW!);
      with jump held the bounce is a HOTFOOT leap, higher than any normal jump
    = solid, but never drawn: under something that draws itself (e.g. a toppled statue)
    V moonglass: solid only while a lit moonlamp shines on it (a lamp lights the glass below it, within its
      `reach` columns); otherwise just a faint dotted outline. It flickers as its lamp is about to go out
    Q quicksand: not solid. Anything in it sinks slowly; Chickaroo can wade (slowly) and hop out
      with weak jumps, and is lost once it closes over his head. Fill pools 2 rows deep (rows 12-13)
    . (in 'rect') clears tiles back to empty

  entities (x = column, row = the row the enemy stands in, default 11)
    ['grumblet', x, row]      walking acorn in the meadow, a hermit crab underwater, a glowshroom everywhere else;
                              falls off ledges, stompable
    ['shellback', x, row]     pill bug, turns at ledges; stomp → it curls into a kickable/carryable ball
    ['spikelet', x, row]      hedgehog — tall quills on top: cannot be stomped (use fire, a rolled bug, or roll into it from either side)
    ['flutter', x, row, hang, look] bat that swoops toward the player (look: 'bat' | 'eagle' | 'crow' | 'gull'; default mixed)
    ['buzzbee', x, row = 8, 'hover'?]  bee: when you come level with it, it winds up and darts straight
                              at you (duck or jump it), then flies home over your head; 'hover' bees never
                              charge (a row of them makes a stomp-bounce bridge)
    ['hopsprig', x, row]      grasshopper: squats, then leaps at the player in a high arc (never into a pit)
    ['caterpillar', x, row]   chubby rainbow inchworm: arches and stretches along, turning at ledges; every few
                              seconds it bristles with stinging spines (no stomping then), otherwise stompable
    ['molebert', x, row]      mole: tunnels under the turf toward the player (a moving mound), rumbles, then
                              bursts up (that hurts); stompable once it's out. Stays on its own stretch of ground
    meadow (1-1):
    ['sunflower', x, row]     a sunflower whose face follows Chickaroo (scenery)
    ['sheep', x, row]         sheep: stomp it for a huge BAA! bounce. He walks right past them (a bleat as he brushes by);
                              get ahead and the flock trots after him, each keeping its space from the next; it steps
                              down but stops at a real drop. Little pink hearts float off their heads
    ['dandelion', x, row]     giant puffball: touch it to float off under a seed
    ['bloom', x, len, kind = 'lift', opts]  a giant sunflower on a stem `len` tiles long, standing on the ground in column x
                              (or rising out of the depths if there is none). It bows to Chickaroo when he's near, its head
                              (a platform) offered to him; hop on and it carries him, by kind: 'lift' straightens up,
                              'pass' swings over the top to bow the other way, 'fling' throws him at the top (WHEEE),
                              'lover' bows to the real sun (toward opts.dir) whenever it's out, 'rise' never bows: hop on
                              and its stem grows straight up till its head is at row opts.top (to an egg), then sinks
                              back once he's off. opts: bow (degrees, 62),
                              side (bows only to -1/1), reach (tiles), sun: true (forgets him while the sun's out: a ride
                              stops dead), sleepy: true (with him aboard it nods off forward and sinks), still: true
                              (scenery: watches him, never bows or carries), sayAt: [col, line] (said once he reaches col), say / ride / sunLine / sunReply / flingLine (lines
                              on its first bow, his first ride, the sun coming out, his reply, a fling)
    ['snapvine', pipeX]       chomping worm living in the hollow log at column pipeX
    ['firebar', x, y, length, speed]  rotating chain of fire around block (x, y)
    ['ember', x, jump = 7.2]  lava bubble leaping out of a lava pit (`jump`: launch speed; 10.5 leaps high over a bridge)
    ['platform', x, y, widthTiles, 'h'|'v', rangeTiles, periodFrames, phase0to1]
                              'p' = pendulum swinging on a rod of length rangeTiles from pivot (x, y);
                              'c' = gear wheel: circles pivot (x, y) at radius rangeTiles
    ['spring', x, row]        springboard; jump while it squashes for a big launch
    ['finlet', x, row, 'red'?]  fish swimming left; red ones weave up and down
    ['jellop', x, row]        jellyfish that sinks, then jets toward the player
    ['urchin', x, row, kind?] spiky sea urchin creeping along the floor: never attacks, but hurts to touch and can't
                              be stomped. kind 'purple' | 'red' (short spines) | 'black' (long spines, reach
                              farther) | 'green' (small); default picked from the column
    ['stone', x, row]         loose stone: carry and throw it like a curled-up pill bug (hold run); underwater it
                              flies almost straight, then sinks to rest. Knocks out fish, octopuses, urchins, crabs
    ['crab', x, row, color?]  reef crab scuttling sideways with its claws raised (so: no stomping); never attacks,
                              just hurts to touch. color 'red' | 'orange' | 'blue'
    ['slideguin', x, row]     penguin that belly-slides at you when you're level with it
    ['icicle', x, row]        hangs under an overhang; shakes when you pass beneath, then drops
    snow (2-2):
    ['snowball', x, row, 'fling'?]  giant snowball resting in `row`: bump it (or walk on top of it) and it rolls away,
                              growing; ride on top. It flattens foes, scoops pollen, bursts crates, hops 1-tile
                              steps, and shatters on a wall ('fling' ones throw their rider high and forward)
    ['vane', x, row, dir = 1, force = 1.6]  weathervane on a pole standing in `row`: touch it and every gust
                              blows toward `dir` from then on, `force` times stronger and more often
    ['avalanche', x, untilX, speed]  passing column x sets off an avalanche that chases Chickaroo at
                              `speed` px/frame (staying close behind him); being caught is fatal. It
                              swallows foes and crashes at column untilX
    cave (1-2):
    ['sleepbat', x, row = 1]  bat asleep on the cave roof: sprint or roll nearby and it wakes
                              with a shriek (and wakes its neighbours) and swoops like a flutter
    ['chime', x, row, key, note]  singing crystal (note 0 = biggest / lowest). Ring every chime of a `key`
                              lowest to highest and a solid bridge sings into place at the level's
                              chimes[key] = [x0, x1, row]; a wrong note resets the set
    ['chime', x, row, key, 'red'|'orange'|'yellow', times]  counting crystal, rung one at a time in turn (left to right, or with
                              chimes[key].randomCounts: random counts and a random order, the awake one is next): ring exactly `times` (one too
                              many resets it); all right → chimes[key] = { wall: [col, r0, r1], bridge: [x0, x1, row] }
                              crumbles the wall, then builds the bridge
    ['slate', x, row, text, key]  carved stone tablet, blank (a few motes drifting off it) until touched; touching it reveals the counts
                              in `text` ('3 2 1') as cells of little pips, never digits, and wakes the chimes of `key` (they
                              don't respond until then)
    ['snorer', x, row]        sleeping giant: every snore puffs a rideable Z platform up out of his mouth;
                              his belly is a bouncy bed (bouncing just makes him mumble)
    ['lanternmoth', x, row, endX, endRow, archTiles = 2, speed = 1.9]  a sleeping, rideable moth; its back wakes
                              under a passenger and flies an arch to the other bank. Jump freely; an abandoned moth returns
                              to the nearest bank. A second boarding flies back. Used in 1-2's lantern grotto.
    ['boss', x]               MAGMAW, sleeps until the player crosses boss.trigger
    ['moonlamp', x, row, dur, reach, auto]  hanging lantern; touch it (or hit it with fire, volt or a gust) to light
                              it for `dur` frames (default 150): its light cone burns any shadow that passes through,
                              and it makes the moonglass below it solid within `reach` columns (default 4).
                              auto: true puts it on a timer instead (on `dur` frames, off `dur`, repeating; it
                              sputters just before coming on, and can't be lit by hand)
    ['echo', x, untilX]       Chickaroo's shadow comes loose when the player passes column x and
                              replays their path a little behind; it sinks away past untilX
    sky (1-3):
    ['brolly', x, row = 3, lowRow]  PARASOL PETE bobbing under his umbrella between row and lowRow: stomp the brolly to
                              steal it and float for five seconds (blinks before expiring); he comes back with a spare
    ['puffinch', x, row = 8, 'fly'?]  round bird patrolling (or flying left, 'fly'); stomp it and it puffs up into a
                              rising balloon you ride, until it goes PFFFT
    ['sulk', x, row = 9, x0, x1]  sulky raincloud trailing Chickaroo within columns x0-x1; stomp it and it cries a
                              downpour that waters any 'pot' below it
    ['pot', x, topRow = 2, row = 11, thirstyLine]  thirsty seedling in a pot; watered, it grows a beanstalk up to topRow
    ['clap', x, row = 12, gap = 4, phase]  two cloud gloves meeting at column x's left edge, tops at `row`, open `gap`
                              tiles either side; their tops are platforms, the clap launches riders sky-high
                              (BRAVO!) and squishes anything caught between them
    ['whale', x, row, untilX] sky whale whose back (8 tiles, top at `row`) is a platform: step on and it swims to
                              untilX; stand on its blowhole when it spouts to be shot up
    ['hoop', x, row = 3]      golden sky hoop: fly through it for a rising note and points; all of a stage's hoops = 1-UP
    ['puffinch', x, row, 'wave'] like 'fly', but swooping up and down as it comes
    ['rainbow', x, row, untilX]  rainbow star: Chickaroo runs on a rainbow road at the height he last stood until
                              he reaches untilX; it extends only to the right (down drops through it)
    ['prisoner', x, row]      a little penguin locked in a cage (standing in `row`), calling "HELP ME!" now and
                              then; touch the cage to free it for a big bonus. Put it somewhere hard to reach
    ['umbra', x]              EVIL UMBRAROO, the shadow boss: its shadows trail you closely (stop and they catch you); burn them in lamplight, 3 phases x 3; wakes on boss.trigger
    eclipse (2-4) also:
    ['reflection', x0, x1, [fadeFrom, fadeTo], loose, until]  the floor over x0-x1 is black mirror-glass with
                              Chickaroo's reflection in it, copying him exactly; from column fadeFrom to fadeTo it slowly
                              turns into his violet shadow, and past column `loose` it rises out of the floor under him
                              and follows him as his shadow (an echo that fades past `until`)
    ['plate', x, row, key]    shadow lock plate: too light for Chickaroo, but his shadow (replaying his steps) holds it
                              down exactly as long as he stood on it (a record dot, then a play arrow)
    ['gate', x, top, bot, key, linger = 45]  portcullis in column x over rows top-bot (put something solid above):
                              open while a plate of `key` is held, and `linger` frames after
    ['keeper', x0, x1]        while Chickaroo is between the columns and no shadow is loose, a new one rises behind
                              him after a couple of seconds (so the shadow locks always have a shadow)
    ['slab', x, row]          a weathered stone slab with the whole sigil carved on it (its lower right corner broken off)
    ['sigil', x, row, doorX, start, links]  the sealed sigil, hanging centred on column x's left edge: four carved stones
                              turned the wrong way, and a stone door filling columns doorX-doorX+1 (rows 0-11) that opens
                              when every stone is the right way up. start: [TL, TR, BR, BL] quarter turns clockwise from
                              right; links: which stones each button turns (default [[0], [1], [2], [3]])
    ['sigbtn', x, row, n]     floor button n for the sigil: each press turns its stones a quarter turn clockwise
    clock (2-3):
    ['clockfinale', x, endX]  jump-wound wheels and their level brass shoes over a bottomless pit;
                              the final landing pedal unfolds the exit bridge (terrain/pollen in map)
    ['cuckoo', x, row, opts]  KOOKOO's cuckoo clock on a post (2 tiles wide). opts (all optional):
                              say: [line, ...] said one after another when Chickaroo comes within `near` tiles (default 7;
                              a line can be a list: one at random), hold: true makes them real dialogue; once per visit.
                              reach, dir, period, phase, out: a bridge clock -- every `period` frames the bird shoots out
                              `reach` tiles toward `dir` on a lattice arm (a walkable bridge) and calls for `out` frames;
                              quip: lines for its first pop with Chickaroo nearby
    ['alarm', x, row]         alarm clock asleep; goes off (RIIING!) when you come near and hops after you. Stomp it to
                              SNOOZE: then it's a springboard (hold jump for a big bounce) until it goes off again
    ['windup', x, row]        tin mouse: winds up, zooms at you, runs down, winds up again; stompable
    ['jack', x, row]          jack-in-the-box: stand on the lid, the crank plays a tune by itself, then POP:
                              a huge launch that isn't a jump (the broken clock doesn't flip). Sink it in a 1-tile notch
                              (row 12) to walk straight onto it
    ['train', x, endX, row, calls]  wind-up toy train on a toy track (rails along the top of row+1, too thin to stand on)
                              from column x to endX: stand on it and tap run to wind it up; it runs while wound.
                              calls: [[column, line], ...] Kookoo shouts as the front passes each column with you aboard
                              (once per visit)
    ['stopwatch', x, row, dur]  the Master Stopwatch: touch it and time stops for `dur` frames (default 330) for
                              everything but Chickaroo
    ['gearfall', x, period, phase, speed, r]  cogs pouring down column x into the void, one every `period` frames;
                              each cog's top is a platform (stop time and they're stepping stones)
    ['tinbirds', x0, x1, row, every, speed, until]  a stream of clockwork birds flying left from x1 to x0 around `row`
                              (no more come once Chickaroo passes column `until`): harmless, stompable (a bridge of bounces)
    ['clockface', x, row, r, hands]  a great clock face (radius r tiles) behind the tiles, centred on tile (x, row);
                              hands: [[length (tiles), frames per turn, start (hours), dir], ...] -- each hand is a platform
                              you ride round (steep ones are slides), and the brass hub is always safe
    ['mainspring', x]         passing column x, the town's mainspring snaps and bounces away (set clock.jumpFrom to x)
    citadel (1-4):
    ['portrait', x, row = 4, text]  a framed portrait of MAGMAW on the wall (top at `row`); its eyes follow
                              Chickaroo and it says `text` as he passes (a list of lines: one picked at random each time)
    ['mallow', x, range = 0, period = 300]  giant marshmallow floating in a lava pit (a platform), drifting
                              `range` tiles right and back. Standing on it roasts it: golden (it puffs up taller),
                              brown, charred, then it catches fire and sinks; a fresh one bobs up a few seconds later
    ['kiln', x0, row, x1, phase = 0]  the stone pillar over columns x0-x1 (top at `row`) heats up on a short
                              cycle: cool, a pulsing warning glow, then red-hot (standing on it hurts) and back
    ['statue', x, row, 'gold'?]  MAGMAW statue, 9 tiles tall, on columns x and x+1 of the ground in `row`. Lean on
                              it and it topples right, becoming a bridge 9 tiles long (2 tiles
                              above its base). Its head knocks over a statue standing 9 tiles on: a chain of them
                              falls like dominoes (the first time, the camera follows it). A gold one gives a 1-UP
    ['chef', x, row, toX, toRow]  the cook: flips a rideable pancake from his pan to tile (toX, toRow) every 2.5 s
    ['gobbler', x, row]       MAGMAW's food taster (3 tiles wide): eats the pancakes that reach his mouth -- and
                              Chickaroo, if he's riding one or touches him -- then spits him high up and to the right
    desert (3-1):
    ['sidewinder', x, row]    sand snake; sidewinds along, glides over quicksand, climbs any wall in its way and drops off
                              ledges, but never leaves the screen (turns back at its edge and at bottomless drops); stompable
    ['scorpling', x, row]     scorpion; turns at ledges, cocks its tail when you're in front of it, then
                              jabs it forward (the stinger hurts from every side; only a roll beats it)
    ['tumbler', x, row]       a single grumpy tumbleweed bouncing left; stomp or burn it
    ['tumbleweeds', x, untilX, every]  while Chickaroo is between the two columns, a tumbleweed rolls
                              in from the right edge of the screen every `every` frames
    ['dunefin', x0, x1]       sand shark patrolling the quicksand pool between the two columns; its fin
                              shakes, then it leaps at you. Stompable only while it's out of the sand
    ['vulturk', x, untilX]    vulture that tails you overhead and drops a boulder (which then rolls) when
                              it's right above you; leaves past untilX
    ['dartrap', x, row, dir, period, phase]  carved face on the solid block at (x, row): its eyes glow,
                              then it spits a dart (dir -1 = left). Darts can be stomped
    ['sandspout', x, rows, period, phase, baseRow = 12]  sand geyser 2 tiles wide (columns x, x+1): rumbles,
                              then erupts `rows` tiles high and holds; stand on top to ride it. baseRow 14
                              makes it rise out of a bottomless gap
    ['sign', x, 'LINE|LINE', row = 11, lift = 0, 'nopost']  wooden signpost standing in `row` ('nopost': just the board, e.g. on a roof) ('|' breaks lines; keep them short and funny);
                              `lift` px of extra post raises the board (clear of something standing in front of it)
    ['camel', x, untilX]      HUMPHREY the camel, kneeling at column x (a platform): climb into the saddle and he stands
                              and plods right over anything (quicksand too) while you ride, kneeling again at untilX.
                              Rock hanging down to row 8 over his path scrapes a standing rider off (duck under it);
                              he spits at critters ahead of him (anything a fireball, stomp or roll would beat).
                              He won't get up without his fare: carry the gold coin (a 'coin' power block) to him
    ['camelgate', x, top = 0, bot = 11]  HUMPHREY's toll gate: a solid carved slab in column x that sinks into the
                              sand once he's been paid
    ['lamp', x, row, wish, ...]  DJINNY's lamp: touch it and the genie grants a wish (once per visit; after a death
                              the wish is simply waiting):
                              'fridge', fridgeCol, x0, x1: a fridge drops at fridgeCol (2 wide, on the ground) and its
                                cold freezes the quicksand in columns x0-x1 to ice; it cracks, then thaws from the fridge
                                outward; walk back up to the fridge and it opens again
                              'carpet', col, row, endCol, landRow: a flying carpet that hovers until you fly it: on board the
                                arrows steer it every way (and don't walk or jump); rock stops it; past endCol it lands on landRow
                              'teapot': GRAMPS, a grumpy scorpion in a nightcap, gives a 1-UP to make you go away
                              'farewell': DJINNY says farewell after the third wish and goes to sleep
    ['worm', x, untilX, speed]  GRUBBLE the sandworm: passing column x he bursts up behind and chases (like the
                              avalanche: caught = out), arcing in and out of the sand; he bonks on the bigcactus at untilX
    ['bigcactus', x]          a giant saguaro (scenery) for GRUBBLE to bonk his nose on
    ['crumble', x0, x1, top]  the rock over columns x0-x1 from row `top` down (a mesa) cracks up as soon as you land on it
                              and crumbles away two seconds later; a few seconds on it rises back
    bayou (3-3): see the top of enemies-bayou.js ('bandmate', 'drum', 'valve', 'rest', 'staff', 'hush', 'bopper',
                 'skeeter', 'gator', 'dance', 'bandstand', 'crowd'); 'crab' with 'red' makes a fine crawdad
      gumbo (4-1, theme 'gumbo'): Q is hot roux (linger and it scalds: a hit, and a yelp up out of it), B a stale crouton
    (hot sauce bursts through them), C a saltine that crumbles, S cast iron. fever: true opens the stage in his bed and
    ends it there (game-gumbo.js). Set pieces (gumbo.js):
    ['simmer', x0, x1, topRow = 4, every = 80, surfRow = 12]  the roux over columns x0-x1 sends up big bubbles that rise to
                              topRow: land on one to bounce (higher with jump held); it pops half a second later
    ['okra', x, row, drift = 0, period = 240]  a springy slice of okra floating on the roux (drifting `drift` tiles right
                              and back); bouncing on it slimes his feet
    ['slime', x, row, w = 2]  a puddle of okra goo: slimed, he runs faster but slides like on ice
    ['steam', x, top, period = 0, phase = 0, w = 2, row = 11]  a vent (or a boiling spot in the roux) blowing a column of
                              steam up to row `top` that lifts him; period 0 = always on, else it hisses, then blows.
                              Cooks crawdads
    ['bayleaf', x, row = 6]   a dried bay leaf hanging in the air: catch it mid-air to glide (down glides faster); in steam it soars
    ['cleaver', x, w = 3, h = 3, period = 200, phase = 0, floor = 12]  a giant saw-edged cleaver over columns x..x+w-1 chopping
                    down to row `floor`: warns (shiver, shadow, glint), slams down, stays stuck a beat as a wall of steel, then
                    lifts. Its teeth, top and bottom, bite; its flat sides don't. Phase staggers a row into a rhythm. Slices sausages
    ['board', x0, x1, row = 12]  a wooden cutting board laid flush on the floor (scenery)
    ['surge', x0, x1, low = 13.4, high = 9, period = 420, phase = 0]  the broth over columns x0-x1 heaves up from row
                              `low` to row `high` and back (bubbling hard first); it scalds
    ['raft', x, row, w, range = 0, period = 300, phase = 0]  a slab of cornbread floating on the roux (a platform)
    ['stockpot', x0, x1, rim = 6, rimL, rimR, spoons = 1, wallL = 0]  a giant cast-iron pot behind columns x0-x1: its far wall and
                    rolled rim, and giant ladles / spoons left in it (scenery). wallL: its left side is a solid wall from
                    the rim down (hop up onto its handle, a ledge, and over). Both sides share `rim`; rimL/rimR are legacy slots.
    ['ladle', x0, row0, x1, row1]  the giant ladle: its bowl at (x0, row0) and its handle a slope up to (x1, row1), where
                              the alarm clock stands on the rim. Ringing it ends the stage
    ['vegslope', x0, row0, x1, row1]  a heap of gumbo vegetables to walk up, from the floor at (x0, row0) to a ledge at (x1, row1)
    and its critters (enemies-gumbo.js): 'crawdad', 'andouille' (+ 'andouilles' x, untilX, every), 'spitter', 'onion',
    'celery', 'pepper', 'trinity'
  jungle (3-2):
    ['vine', x, len, row = 0]  swinging vine hanging `len` tiles from tile (x, row): jump into it to grab
                              on, left/right pumps, up/down climbs, jump lets go (down + jump drops)
    ['gulpod', x, row, angle, 'aim'|'sweep'|'auto', sweep, period]  carnivorous bulb that swallows
                              Chickaroo and spits him out at `angle` degrees (0 = right, -90 = up): 'aim'
                              fires on jump, 'sweep' swings its aim by +-sweep degrees every `period`
                              frames (fire on jump), 'auto' fires by itself
    ['lilypad', x, widthTiles]  floats on its river (rests on the riverbed when it's dry); every pad wears a
                              pink lily, the sign that it's safe to land on
    ['logator', x0, x1, period, phase]  crocodile log drifting on the river between the columns; you can
                              ride it, but it dives now and then (bubbles first) and snaps at anything ahead
    ['chimpchuck', x, row]    monkey that lobs coconuts at you in high arcs; stompable
    ['thumpdrum', x, row]     mean-faced drum that slowly stomps around (takes 3 stomps); every 3 seconds it squats, hops and
                              slams down, sending a shockwave along the ground (jump it). Stompable; each stomp it shrugs off
                              makes it angrier: faster, thumping more often, and at the last it charges you
    ['chamelurk', x, row]     camouflaged chameleon (only its eyes show); reveals itself with a "!"
                              when you're close in front of it, rears back, then lashes its tongue. Stompable (a bonus if it's still hidden)
*/
const LEVELS = [
  {
    id: '1-1', name: 'SUNLIT MEADOW', theme: 'meadow', music: 'meadow', day: true,
    welcome: [
      "Welcome to Chickaroo's adventure. Built around exploration and intuitive discovery, there's no hand-holding here - test every button, experiment with your surroundings, and trust your instincts! Careful! Things will get harder. TAKE YOUR TIME.",
      "Chickaroo is a solo passion project and lots of time went into making it fun and unique. Thank you so much for playing!\nDesigned to be played with a Gamepad.\nHave fun and enjoy the ride!\n\nGood Luck!",
    ],
    // One summer's day, dawn at the start and sunset at the meadow's exit (`day`: the sky and the sun move on as he goes).
    // The giant sunflowers ('bloom') follow the brightest thing in the meadow, and that's Chickaroo: they bow down to
    // him and carry him. Nothing is explained; each idea turns up first where it's safe to try.
    //  1. dawn: the meadow waking; the first bloom bows to him and lifts him up a bank too tall to jump
    //  2. the relay: two blooms hand him across a bottomless ravine, swinging him high over the top (pollen on the arc)
    //  3. the flock: a hedge too tall to flap over. The sheep keep their personal space: nudge the flock up to the
    //     hedge, bounce off one (BAA!), flap at the top. The C egg floats high just past it
    //  4. a gentle climb, a step at a time, to the dandelion's knoll, a tall sunflower watching him go
    //  5. dandelion valley: catch a seed off the knoll and float the whole valley; a crow on the far side
    //  6. the long relay: three blooms hand him across a wider ravine, quietly
    //  7. the bee meadow in the golden afternoon: critters, crates, the hedgehog moat, the K egg high over it (a rising bloom in the moat grows him up to it)
    //  8. sunset: hop onto the first of three drowsy blooms and they carry him over the pond, hands off: each swings him
    //     over the top to the next, leaning back to meet it (the R egg on the hop to the second); the third sets him
    //     down on the far shore; walk off to the right into the forest interlude
    letters: [[158, 3.4], [415, 1.4], [459, 2.3]],   // all in plain sight (it's the first stage): C (high just past the hedge), K (high over the moat: the rising bloom carries him up to it), R (on the drowsy blooms' relay: they carry him through it)
    width: 500, start: 3, checkpoint: [116, 152, 258, 384, 440],
    catAt: 381,   // (on the far ledge of the long relay)
    map: [
      // 1. dawn: a few gentle steps, then the bank (8 tiles: too tall to flap)
      ['ground', 0, 40], ['ground', 17, 22, 11], ['row', 9, 8, 'BMB'], ['power', 10, 8, 'berry'],   // (the strawberry: big Chickaroo) ['coins', 9, 6, 3], ['coins', 18, 9, 4],
      ['ground', 41, 56, 4], ['coins', 44, 3, 4],
      // 2. the relay: down off the bank to the ravine's edge, the ravine, the far ledge; pollen strung along the bloom's arc
      ['ground', 57, 59, 6], ['ground', 60, 65, 9],
      ['coins', 69, 4, 1], ['coins', 72, 2, 1], ['coins', 75, 1, 2], ['coins', 79, 1, 1], ['coins', 82, 2, 1], ['coins', 85, 4, 1],
      ['coins', 93, 4, 1], ['coins', 96, 2, 1], ['coins', 99, 1, 2], ['coins', 103, 1, 1], ['coins', 106, 2, 1], ['coins', 109, 4, 1],
      ['ground', 114, 118, 9],   // (the bloom's head stops just short of it) ['ground', 119, 120, 10], ['ground', 121, 122, 11],
      // 3. the flock's meadow and the hedge
      ['ground', 123, 150], ['ground', 151, 154, 4], ['coins', 126, 9, 3], ['coins', 151, 3, 4],
      // 4. the meadow below, then a gentle climb, one step at a time, to the dandelion's knoll
      ['ground', 155, 175],
      ['ground', 176, 181, 11], ['ground', 182, 187, 10], ['ground', 188, 193, 9], ['ground', 194, 212, 8],
      ['coins', 178, 9, 2], ['coins', 184, 8, 2], ['coins', 190, 7, 2], ['coins', 199, 6, 3],
      // 5. dandelion valley (bottomless), pollen floating in the air
      ['coins', 216, 6, 3], ['coins', 222, 5, 3],
      ['ground', 232, 289], ['coins', 236, 10, 3], ['coins', 249, 10, 3], ['ground', 290, 292, 11], ['ground', 293, 295, 10], ['row', 266, 8, '?M?'], ['coins', 276, 9, 4],
      // 6. the long relay: the ravine the three blooms cross
      ['ground', 296, 305, 9], ['coins', 302, 7, 3],
      ['coins', 312, 2, 1], ['coins', 315, 1, 2], ['coins', 319, 1, 1], ['coins', 336, 2, 1], ['coins', 339, 1, 2], ['coins', 343, 1, 1],
      ['coins', 360, 2, 1], ['coins', 363, 1, 2], ['coins', 367, 1, 1],
      ['ground', 378, 384, 9], ['ground', 385, 386, 10], ['ground', 387, 388, 11],
      // 7. the bee meadow: rolling ground, a crate stash, the hedgehog moat and the mound beyond
      ['ground', 389, 412], ['ground', 396, 400, 11], ['row', 394, 7, 'BNB'], ['coins', 397, 9, 3],
      ['ground', 413, 425, 13], ['ground', 426, 439, 9], ['coins', 418, 11, 7], ['coins', 427, 7, 2], ['coins', 431, 7, 3],
      // 8. sunset: the shore, the pond (bottomless), and an open walk into the forest
      ['ground', 440, 450, 8], ['coins', 442, 6, 3],
      ['coins', 454, 3, 1], ['coins', 464, 3, 1], ['coins', 469, 3, 1], ['coins', 474, 3, 1],   // (on the ride)
      ['ground', 481, 499],
    ],
    entities: [
      // 1.
      ['sunflower', 5], ['sunflower', 12], ['sunflower', 24], ['sunflower', 33],
      ['grumblet', 29],
      ['bloom', 37, 9, 'lift', { bow: 76, side: -1, say: ['OOH! A LITTLE SUN!', 'OOOH! A TINY SUN!'] }],
      // 2.
      ['bloom', 77, 12, 'pass', { bow: 64, ride: 'WHEEE!', worldQuips: true }],
      ['bloom', 101, 12, 'pass', { bow: 64 }],
      // 3.
      ['sheep', 127, 11], ['sheep', 132, 11], ['sheep', 137, 11],
      // 4.
      ['molebert', 162], ['grumblet', 168], ['sunflower', 172],
      ['bloom', 170, 6, 'lift', { still: true }],   // (scenery: it just watches him)
      ['sunflower', 196, 7], ['caterpillar', 202, 7], ['grumblet', 207, 7],
      // 5.
      ['dandelion', 210, 7],
      ['flutter', 242, 7, false, 'crow'], ['hopsprig', 264], ['buzzbee', 272, 6], ['grumblet', 281], ['sunflower', 260], ['sunflower', 286],
      // 6.
      ['bloom', 317, 12, 'pass', { bow: 64, sayAt: [305, 'AHH, WHAT A NICE DAY.'], worldQuips: true }],
      ['bloom', 341, 12, 'pass', { bow: 64 }],
      ['bloom', 365, 12, 'pass', { bow: 64 }],
      // 7.
      ['shellback', 392], ['spikelet', 402], ['buzzbee', 387, 5.5],
      ['spikelet', 421, 12],
      ['bloom', 410, 5, 'lift', { still: true }],   // (scenery: a big one, just watching him)
      ['bloom', 415, 3, 'rise', { top: 2.6 }],   // (in the moat, right under the K egg: hop on and it grows straight up to it)
      ['caterpillar', 434, 8], ['sunflower', 437, 8],
      // 8.
      ['bloom', 454, 10, 'lift', { bow: 22, side: -1, sleepy: true, relay: 'start' }],   // (hop on: the drowsy blooms carry him across, hands off)
      ['bloom', 464, 10, 'lift', { sleepy: true, relay: true }],
      ['bloom', 474, 10, 'lift', { sleepy: true, relay: 'end' }],   // (the last: it nods deep and sets him down on the shore)
      ['sunflower', 497],
    ],
    goal: { type: 'exit', x: 500 },
  },
  {
    id: '1-2', name: 'HOLLOW CAVERNS', theme: 'cave', music: 'cave',
    letters: [[48, 7], [110, 7], [350, 2.5]],   // R: the high moth roost in the lantern grotto
    width: 500, start: 3, checkpoint: [137, 213, 300, 377],
    hint: 'SHHH... THE CAVE IS SLEEPING',
    ceiling: true,
    // A cave that is fast asleep, and wants to stay that way:
    //  1. the old tunnels: hedgehogs, pill bugs and snapvines (warm-up)
    //  2. the bat roost: a ceiling of sleeping bats. Sprint and they wake, shrieking,
    //     one after another -- tiptoe through (the K egg is up where you'd have to jump for it)
    //  3. the singing crystals: a wall blocks the chasm. Each attempt rolls fresh ring counts (1–5, no two alike) and a fresh ring
    //     order (never just left to right); the slate lists the counts in that order, and the crystal whose turn it is
    //     wakes up (lit, eyes open). Solve them to crumble the wall and sing a bridge
    //  4. the snoring giant: every snore puffs out a big Z you can ride up the sheer cliff;
    //     bounce on his belly and he mumbles in his sleep
    //  5. the lantern-moth grotto: 160 columns of glowing fungi, living ferries, little islands and high detours.
    //     Land on a moth's furry back to wake it; it carries him along an arching flight, with controls free.
    //     The first crossing has a safe floor; later crossings offer stepping stones and an optional R roost.
    //  6. the lava choir: the same idea with four crystals (blue, green, yellow, red), fresh counts
    //     and a shuffled colour order on the slate, a wall, and a bridge sung over the lava
    //  7. the last roost, with a hedgehog on the floor beneath it, then the exit
    zones: [[215, 374, 'lanterngrotto']],
    chimes: { a: { wall: [158, 0, 11], bridge: [159, 170, 12], randomCounts: [1, 5] }, b: { wall: [399, 0, 11], bridge: [400, 413, 10], randomCounts: [1, 5] } },
    map: [
      // 1. the old tunnels
      ['ground', 0, 40], ['ground', 44, 80], ['ground', 87, 134],
      // a low rock roof and rock steps
      ['rect', 0, 0, 13, 4, 'X'], ['stairs', 8, 3, 1], ['rect', 11, 9, 11, 11, 'S'],
      ['coins', 5, 10, 3], ['coins', 14, 9, 2],
      ['rect', 22, 10, 23, 11, 'S'], ['coins', 22, 8, 2],
      ['row', 28, 8, 'BBNBB'],
      ['coins', 41, 8, 3],
      ['row', 48, 8, 'BBBB'],
      ['row', 58, 8, '------'], ['coins', 59, 6, 4],
      ['pipe', 66, 3], ['pipe', 72, 2],
      ['row', 76, 8, '?'],
      ['power', 84, 4, 'quake'],   // hammer power-up above the moving platform
      // 2. the bat roost: pollen on the floor for those who walk
      ['coins', 93, 11, 4], ['coins', 104, 11, 4], ['coins', 116, 11, 4], ['row', 128, 8, '?U?'],
      // 3. the singing crystals and the chasm
      ['ground', 135, 158], ['rect', 158, 0, 158, 11, 'S'],
      // a broad stone platform supports the yellow crystal's whole cluster (solid 3x2 base to floor)
      ['rect', 144, 10, 146, 11, 'S'], ['rect', 150, 7, 154, 7, '-'],
      ['coins', 150, 4, 5], ['coins', 160, 9, 10],
      // 4. the snoring giant and the cliff
      ['ground', 171, 192], ['ground', 193, 214, 3], ['coins', 196, 2, 6],
      // 5a. Descend into the jade glow; the first moth waits above a harmless practice hollow.
      ['ground', 215, 219, 5], ['ground', 220, 224, 7], ['ground', 225, 232, 9],
      ['coins', 216, 3, 3], ['coins', 222, 5, 2], ['coins', 227, 7, 3],
      ['ground', 233, 249, 13], ['ground', 246, 249, 12], ['ground', 250, 251, 11],
      ['ground', 252, 268, 9], ['coins', 237, 6, 3], ['coins', 243, 5, 3], ['coins', 250, 6, 2],
      ['row', 258, 6, 'B?B'], ['power', 259, 6, 'berry'], ['coins', 262, 7, 3],
      // 5b. A longer flight rises through the glowworm curtains; small islands catch missed jumps.
      ['ground', 273, 276, 12], ['ground', 283, 286, 11], ['ground', 291, 294, 10],
      ['row', 280, 4, '----'], ['coins', 277, 5, 3], ['coins', 282, 2, 2], ['coins', 287, 5, 3],
      ['ground', 295, 309, 8], ['coins', 297, 6, 3], ['row', 302, 5, 'BNB'],
      // 5c. Drop with a moth into a lower basin, then hop off to a little mushroom island.
      ['ground', 314, 317, 12], ['ground', 322, 325, 12], ['ground', 328, 336, 10],
      ['coins', 314, 6, 3], ['coins', 321, 7, 3], ['coins', 330, 8, 3],
      // 5d. The last moth climbs beneath an optional high roost and its R egg, then descends to daylight-green stone.
      ['ground', 341, 344, 12], ['ground', 350, 353, 11], ['ground', 358, 361, 12],
      ['row', 349, 4, '---'], ['coins', 344, 5, 3], ['coins', 354, 5, 3], ['coins', 361, 6, 2],
      ['ground', 365, 370, 9], ['ground', 371, 372, 10], ['ground', 373, 374, 11],
      ['ground', 375, 399],
      // 6. the lava choir, moved together with its gate, slate, crystals and bridge
      ['rect', 399, 0, 399, 11, 'S'], ['rect', 396, 10, 396, 11, 'S'], ['row', 386, 8, '-----'], ['coins', 401, 8, 12],
      ['lava', 400, 413],
      // 7. the last roost
      ['ground', 414, 499], ['row', 440, 8, 'B?B?B'],
      ['pipe', 456, 2], ['pipe', 464, 3],
      ['coins', 472, 9, 5],
    ],
    entities: [
      ['grumblet', 17], ['grumblet', 19],
      ['flutter', 31, 2, true],
      ['spikelet', 52], ['spikelet', 56],
      ['shellback', 60, 7],
      ['snapvine', 66], ['snapvine', 72],
      ['platform', 82, 7, 3, 'v', 4, 200, 0],
      ['sleepbat', 94, 1], ['sleepbat', 98, 2], ['sleepbat', 102, 1], ['sleepbat', 107, 2],
      ['sleepbat', 112, 1], ['sleepbat', 117, 2], ['sleepbat', 121, 1], ['sleepbat', 125, 2],
      ['chime', 140, 11, 'a', 'orange', 3], ['chime', 145, 9, 'a', 'yellow', 2], ['chime', 156, 11, 'a', 'red', 1],
      ['slate', 152, 6, '3 2 1', 'a'],
      ['grumblet', 148],
      ['snorer', 182, 11],
      ['grumblet', 176],
      ['lanternmoth', 231, 8.5, 255, 8.5, 2, 1.9],
      ['lanternmoth', 268, 8.5, 298, 7.5, 2.3, 2.05],
      ['lanternmoth', 308, 7.5, 331, 9.5, 1.2, 1.95],
      ['lanternmoth', 336, 9.5, 367, 8.5, 3.4, 2.1],
      ['grumblet', 264, 8], ['shellback', 305, 7], ['grumblet', 333, 9],
      ['chime', 381, 11, 'b', 'blue', 2], ['chime', 385, 11, 'b', 'green', 4], ['chime', 392, 11, 'b', 'yellow', 1], ['chime', 396, 9, 'b', 'red', 3],
      ['slate', 388, 7, '2 4 1 3', 'b'],
      ['ember', 403, 10.5], ['ember', 406, 10.5], ['ember', 410, 10.5],
      ['sleepbat', 420, 1], ['sleepbat', 424, 2], ['sleepbat', 428, 1], ['sleepbat', 432, 2],
      ['spikelet', 430],
      ['grumblet', 446], ['grumblet', 448],
      ['snapvine', 456], ['snapvine', 464],
      ['shellback', 476], ['spikelet', 480],
    ],
    goal: { type: 'exit', x: 488 },
  },
  {
    id: '1-3', name: 'CLOUDTOP HEIGHTS', theme: 'sky', music: 'sky',
    letters: [[47, 1], [111, 3], [221, 1]],   // the C, K, R letter coins (column, row), tucked away somewhere hard
    width: 630, start: 3, checkpoint: [101, 156, 271, 370, 392, 521],
    catAt: [525, 10],   // clear of the balloon's dock and the rainbow star
    hint: 'UP HERE, EVERYTHING IS A RIDE',
    // Above the clouds, nothing is quite solid and everything wants to take you somewhere:
    //  1. Parasol Pete: a grumpy little man floating under a brolly. Stomp the brolly to steal it and
    //     drift across the first chasm (he always has a spare)
    //  2. puffinches: stomp one and it puffs up into a balloon -- ride it up to the C island
    //  3. Sulky's garden: a sulky raincloud follows you about. Lure it over the thirsty pot and stomp
    //     it: it bawls, the rain grows a beanstalk, and you climb the cloud wall (a second pot hides a 1-UP)
    //  4. Applause Canyon: giant cloud gloves clap over the chasms. Ride a hand in and the clap throws
    //     you high (BRAVO! -- the K is up there); don't get caught between them
    //  5. the sky whale: step onto its back and it swims you over the void; stand on the blowhole
    //     when it spouts to be shot up to the pollen (and the R)
    //  6. the CLOUD FAIR (fair.js): five suspended Ferris wheels over an empty chasm. Running jumps and a late flap
    //     carry him between cars, then the last wheel reaches the high walkway. TRY YOUR STRENGTH at
    //     BARNABY's High Striker: ground-pound the pad -- a pound is as hard as the drop it starts from, so only
    //     one from the high walkway rings the bell. The bell opens the gate to the balloon dock
    //  7. the balloon crossing: fly the hot-air balloon yourself (hold jump to burn, left / right ease the drift)
    //     between cloud pillars and past STORMY, Sulky's big brother, who isn't happy about what you did to him
    //  8. Rainbow Run: grab the rainbow star and run straight across the open sky on your own rainbow
    map: [
      // 1. Parasol Pete's chasm
      ['ground', 0, 16], ['row', 5, 10, '---'], ['row', 8, 8, '---'], ['coins', 11, 9, 3],
      ['coins', 5, 9, 3],
      ['coins', 19, 8, 1], ['coins', 21, 7, 1], ['coins', 23, 7, 1], ['coins', 25, 8, 1], ['coins', 27, 9, 1],
      // 2. the puffinch and the C island
      ['ground', 31, 104], ['row', 33, 8, 'B?B'], ['power', 34, 8, 'rand'],
      ['rect', 44, 3, 49, 3, 'X'], ['coins', 44, 2, 3],
      // 3. Sulky's garden: the cloud wall, and a secret cloud over the second pot
      ['rect', 66, 4, 68, 11, 'X'], ['coins', 66, 3, 3],
      ['rect', 86, 5, 91, 5, 'X'], ['coins', 88, 4, 3], ['row', 87, 1, 'U'],
      ['row', 96, 8, '?B?'], ['power', 98, 8, 'rand'],
      // 4. Applause Canyon: three chasms bridged by clapping hands
      ['coins', 111, 6, 1], ['coins', 111, 5, 1],
      ['ground', 119, 128], ['row', 122, 8, 'B?B'], ['power', 123, 8, 'rand'],
      ['ground', 141, 141, 11],
      ['ground', 154, 159], ['stairs', 160, 3, 1], ['ground', 163, 165, 9],
      // 5. the whale road: pollen strung across the sky above the void
      ['coins', 184, 8, 3], ['coins', 196, 8, 3], ['coins', 208, 8, 3],
      ['coins', 220, 8, 3], ['coins', 232, 8, 3],
      // 6. the CLOUD FAIR: five wheels spanning a bare 93-column pit, then the High Striker and dock gate
      ['ground', 250, 272, 10], ['ground', 366, 396, 10], ['coins', 252, 8, 3],
      ['row', 264, 7, '?M?'], ['power', 265, 7, 'rand'],
      // Varied pollen arcs around each wheel's circle:
      ['coins', 282, 3, 2], ['coins', 283, 5, 2],                                   // wheel 1: upper-right descending curve
      ['coins', 299, 2, 3], ['coins', 302, 3, 2],                                   // wheel 2: high apex crest
      ['coins', 322, 6, 2], ['coins', 320, 8, 3],                                   // wheel 3: lower-right swoop
      ['coins', 336, 6, 2], ['coins', 337, 4, 2],                                   // wheel 4: ascending left curve
      ['coins', 359, 3, 3], ['coins', 362, 4, 2],                                   // wheel 5: forward crest toward high walkway
      ['rect', 366, 3, 369, 9, 'X'], ['coins', 366, 2, 4],    // the wall
      ['row', 370, 3, '----------'], ['coins', 372, 2, 6],     // the high walkway, out over the striker...
      ['row', 373, 7, '--'], ['row', 370, 5, '--'],           // ...and the way back up for another go
      ['coins', 385, 6, 3],
      // 7. the balloon crossing: cloud pillars to steer between, STORMY's lightning to time
      ['coins', 401, 8, 4],
      ['rect', 410, 0, 412, 2, 'X'], ['rect', 410, 9, 412, 13, 'X'], ['coins', 409, 7, 5],    // through the middle
      ['rect', 426, 0, 428, 6, 'X'], ['coins', 424, 10, 6],                                     // under
      ['rect', 442, 0, 444, 1, 'X'], ['rect', 442, 8, 444, 13, 'X'], ['coins', 440, 5, 6],    // over the top
      ['coins', 458, 8, 3],                                                                      // between STORMY's bolts
      ['rect', 474, 0, 476, 4, 'X'], ['rect', 474, 11, 476, 13, 'X'], ['coins', 472, 8, 6],   // low
      ['rect', 487, 0, 489, 2, 'X'], ['rect', 487, 9, 489, 13, 'X'], ['coins', 485, 6, 6],    // and through
      ['ground', 500, 519, 10], ['coins', 504, 8, 3],
      // 8. Rainbow Run
      ['ground', 520, 532, 10],
      // Three long void crossings: the islands are beyond a full running jump.
      // Walk out, climb four tiles to the high island, then drop five tiles onto the low one.
      ['coins', 533, 9, 19],
      ['rect', 554, 6, 555, 6, 'X'], ['coins', 554, 5, 2],
      ['coins', 557, 5, 17],
      ['rect', 576, 11, 577, 11, 'X'], ['coins', 576, 10, 2],
      ['coins', 579, 10, 17],
      ['ground', 597, 629], ['row', 602, 8, '?B?B?'], ['stairs', 610, 4, 1], ['ground', 614, 629, 8],
      ['power', 604, 8, 'rand'],
    ],
    entities: [
      ['grumblet', 12],
      ['brolly', 15, 4, 9],
      ['grumblet', 36], ['puffinch', 41, 8], ['flutter', 54, 6, false, 'crow'],
      ['sulk', 56, 9, 51, 100], ['pot', 64, 2], ['pot', 84, 3, 11, 'Wateeeeer...'],
      ['grumblet', 74], ['shellback', 79], ['grumblet', 92],
      ['flutter', 80, 5, false, 'eagle'], ['flutter', 98, 6, false, 'crow'],   // birds of the high sky
      ['clap', 112, 12, 4, 0],
      ['flutter', 126, 6, false, 'eagle'], ['grumblet', 126],
      ['clap', 135, 11, 3, 0], ['clap', 148, 11, 3, 0.5],
      ['brolly', 141, 3, 9],   // dips within a normal held jump from the row-11 gloves/island
      ['whale', 167, 9, 242],
      // Six timed blowhole phrases: catch the rising ring, the high one, then the lower one as the jet sags.
      // Two-column spacing fits each trio on one spout; the longer gaps leave time to land and prime the next.
      ['hoop', 178, 3.5], ['hoop', 180, 2.75], ['hoop', 182, 4.25],
      ['hoop', 190, 3.5], ['hoop', 192, 2.75], ['hoop', 194, 4.25],
      ['hoop', 202, 3.5], ['hoop', 204, 2.75], ['hoop', 206, 4.25],
      ['hoop', 214, 3.5], ['hoop', 216, 2.75], ['hoop', 218, 4.25],
      ['hoop', 226, 3.5], ['hoop', 228, 2.75], ['hoop', 230, 4.25],
      ['hoop', 238, 3.5], ['hoop', 240, 2.75], ['hoop', 242, 4.25],
      // the CLOUD FAIR
      ['fairarch', 256, 9], ['grumblet', 262, 9], ['grumblet', 271, 9],
      // Lower hubs keep the full wheel and its hanging cars centered on screen.
      ['ferris', 280, 5.5, 4, 760, true], ['ferris', 300, 5.5, 4, 760, true],
      ['ferris', 320, 5.5, 4, 760, true], ['ferris', 340, 5.5, 4, 760, true], ['ferris', 360, 5.5, 4, 760, true],
      ['striker', 380, 9],
      ['fairgate', 390, 3, 9],
      ['balloon', 394, 9, 501],
      // the balloon crossing (no birds: he can't stomp anything from a basket)
      ['storm', 419, 1, 0.1], ['storm', 434, 1, 0.58],
      ['storm', 449, 1, 0.28], ['storm', 458, 1, 0.78],
      ['storm', 467, 1, 0.18], ['storm', 480, 1, 0.65], ['storm', 494, 1, 0.36],
      ['rainbow', 529, 9, 597],   // stop at the landing platform's left edge
      // Stagger birds along the three long rainbow crossings.
      ['flutter', 541, 8, false, 'crow'], ['flutter', 552, 3, false, 'gull'],
      ['flutter', 563, 4, false, 'eagle'], ['flutter', 575, 8, false, 'gull'],
      ['flutter', 594, 7, false, 'crow'],
      ['flutter', 585, 10, false, 'crow'], ['flutter', 601, 5, false, 'eagle'],
      ['grumblet', 602], ['shellback', 606], ['flutter', 613, 4, false, 'crow'],

    ],
    goal: { type: 'exit', x: 630 },
  },
  {
    id: '1-4', name: 'EMBER CITADEL', theme: 'citadel', music: 'citadel', bossMusic: 'boss14',
    letters: [[61, 5.2], [166, 3], [274, 3]],   // the C, K, R letter coins (column, row), tucked away somewhere hard
    width: 327, start: 2, checkpoint: [114, 187, 278],
    coalBoost: [[14, 29, 1.12]],   // [first column, last column, held-leap multiplier]: extra clearance at the gatehouse
    hint: 'MAGMAW IS HOME. PLEASE MIND HIS THINGS',
    // MAGMAW's castle -- and MAGMAW is very, very proud of it. His portraits watch you all the way in.
    //  1. the front door and the heated floors: hot coals bounce you about (OW!); hold jump on them
    //     for a HOTFOOT leap, the only way up the gatehouse wall
    //  2. the marshmallow moat: giant marshmallows bob in the lava. Stand on one and it roasts under you:
    //     golden (it puffs up -- the C is up there), brown, charred... then it goes up in flames
    //  3. the hall of statues: MAGMAW THE MAGNIFICENT, nine tiles of vanity. Push one over to bridge the
    //     lava -- then push the first of the four in the lake and watch them go down like dominoes
    //     (he hears every one of them fall; the gold one is worth a life)
    //  4. the kitchen: the chef flips pancakes clear across the pit to the boss's food taster. Ride one
    //     in... and get eaten. BLEH! TASTES LIKE CHICKEN! -- spat up onto the cliff behind him
    //  5. the floor is lava: a field of coal pillars to hotfoot across (a caged penguin down by the lava)
    //  6. MAGMAW's bedroom (do not disturb)
    map: [
      // 1. the front door and the heated floors
      // the entrance hall: the ice block under the welcome portrait (kept low, so nobody uses it as a
      // stepping stone past the coals), then steps up to a long balcony to walk along or under
      ['ground', 0, 33], ['power', 4, 8, 'ice'], ['stairs', 6, 3, 1], ['row', 9, 9, '-----'],
      ['coins', 9, 11, 5], ['coins', 10, 7, 3],
      // a long bed of coals before the wall: too far to roll-jump (+ flap) over from the balcony, so it's
      // the HOTFOOT leap (with the wall at 29 a perfect roll-jump + late flap still just makes it; 30 = margin)
      ['row', 14, 12, 'HHHHHHHHHHHHHHHH'], ['coins', 16, 7, 4], ['coins', 22, 6, 3],
      ['rect', 30, 5, 33, 11, 'X'], ['coins', 30, 4, 4],
      // 2. the long marshmallow moat: first half has a kiln pillar and high pollen perch;
      //    second half mixes in twin stepped kilns, crumbling cloud ledges, and a firebar bridge
      ['lava', 34, 113], ['rect', 50, 9, 52, 13, 'X'],
      ['rect', 88, 10, 89, 13, 'X'], ['rect', 92, 8, 93, 13, 'X'],
      // High pollen ledges over the stone pillars; an isolated middle perch sits in a gap
      // between marshmallows. Long gaps between ledges keep the crossing on the marshmallows.
      ['row', 50, 6, '---'], ['coins', 50, 5, 3], ['coins', 50, 4, 3], ['coins', 50, 3, 2],
      ['row', 72, 7, '--'], ['coins', 72, 6, 2],
      // Second half upper route: crumbling cloud steps and a high reward over the twin kilns
      ['row', 80, 8, 'CC'], ['coins', 80, 7, 2],
      ['row', 89, 5, '---'], ['row', 90, 2, '?'], ['coins', 89, 4, 3], ['coins', 90, 3, 2],
      ['row', 100, 7, 'CC'], ['coins', 100, 6, 2],
      // Free-floating rewards between marshmallows: a running jump plus a late wing flap.
      ['coins', 44, 5, 1], ['coins', 64, 5, 1], ['coins', 84, 5, 1], ['coins', 105, 5, 1],
      // 3. the hall of statues: one statue over a gap, then the domino lake
      ['ground', 114, 136], ['row', 120, 8, 'B?B'], ['row', 127, 8, '?'], ['coins', 129, 9, 3],
      ['lava', 137, 144],
      ['ground', 145, 152],
      ['lava', 153, 186], ['ground', 160, 161], ['ground', 169, 170], ['ground', 178, 179],
      ['coins', 156, 8, 3], ['coins', 164, 8, 3], ['coins', 173, 8, 3], ['coins', 182, 8, 3],
      // 4. the kitchen: a stove of coals, the chef at the pit, the taster in front of the cliff
      ['ground', 187, 205], ['row', 190, 8, '?M?'], ['power', 191, 8, 'rand'],
      ['row', 196, 12, 'HHHHH'],
      ['lava', 206, 221], ['ground', 222, 224],
      ['coins', 210, 4, 1], ['coins', 212, 3, 1], ['coins', 214, 3, 1], ['coins', 216, 4, 1],
      ['rect', 225, 4, 239, 13, 'X'], ['coins', 229, 3, 4],
      // 5. the floor is lava: coal pillars, a low ledge with a caged penguin
      ['lava', 240, 277],
      ['rect', 242, 10, 243, 13, 'X'], ['row', 242, 9, 'HH'],
      ['rect', 247, 8, 248, 13, 'X'], ['row', 247, 7, 'HH'],
      ['rect', 252, 10, 253, 13, 'X'], ['row', 252, 9, 'HH'],
      ['rect', 257, 7, 258, 13, 'X'], ['row', 257, 6, 'HH'],
      ['row', 259, 12, 'SSS'],   // the caged penguin's ledge, down low just over the lava
      ['rect', 263, 11, 264, 13, 'X'], ['row', 263, 10, 'HH'],
      ['rect', 268, 9, 269, 13, 'X'], ['row', 268, 8, 'HH'],
      ['rect', 273, 11, 274, 13, 'X'], ['row', 273, 10, 'HH'],
      // pollen just over each pillar's coals: every bounce on a pillar picks it up
      ['coins', 242, 7, 2], ['coins', 247, 5, 2], ['coins', 252, 7, 2], ['coins', 257, 4, 2], ['coins', 263, 8, 2], ['coins', 268, 6, 2], ['coins', 273, 8, 2],
      // 6. the way to the bedroom
      ['ground', 278, 326], ['row', 284, 8, '?M?'], ['power', 285, 8, 'rand'], ['coins', 291, 9, 4],
      // boss arena: columns 302-326, walls at both ends, ledges to dodge on
      ['rect', 326, 0, 326, 11, 'S'],
      ['row', 306, 9, '----'], ['row', 321, 9, '----'],
      ['row', 307, 6, 'M'], ['power', 307, 6, 'rand'], ['row', 322, 6, '?'],
      ['coins', 311, 7, 2], ['coins', 317, 7, 2],
    ],
    entities: [
      ['portrait', 4, 4, [
        'WELCOME TO MY CITADEL! NO HEROES. NO SALESMEN. I HAD THE FLOORS HEATED. YOU\'RE WELCOME.',
        'OH, A VISITOR. WIPE YOUR FEET. ACTUALLY, DON\'T - THE FLOORS ARE HEATED. ENJOY!',
        'WELCOME, LITTLE CHICK! MIND THE FLOORS. I HAD THEM HEATED. WITH LAVA.',
        'THE MAGNIFICENT MAGMAW WELCOMES YOU! THE HEATED FLOORS ARE COMPLIMENTARY.',
        'NO HEROES ALLOWED. ARE YOU A HERO? YOU LOOK MORE LIKE A SNACK. WARM FLOORS AHEAD!',
        'WELCOME! SHOES OFF, PLEASE. ON SECOND THOUGHT... KEEP THEM ON. HEATED FLOORS.',
        'A GUEST? HOW RARE. DO TRY THE FLOORS - I HAD THEM HEATED. NOBODY STANDS STILL FOR LONG.',
        'HEROES: NO. SALESMEN: NO. CHICKS: ...FINE. THE FLOORS ARE HOT, BY THE WAY.',
        'YOU HAVE ENTERED THE CITADEL OF THE GREAT MAGMAW. PLEASE ENJOY MY UNDERFLOOR HEATING.',
        'WELCOME TO MY HUMBLE CASTLE. KIDDING. IT\'S AMAZING. EVEN THE FLOORS ARE HEATED.',
        'NO NEED TO KNOCK, COME IN! I HAD THE FLOORS HEATED JUST FOR YOU. MOSTLY FOR ME.',
      ]],
      ['mallow', 36], ['mallow', 41, 2, 260], ['mallow', 46],
      ['kiln', 50, 9, 52],
      ['mallow', 55, 3, 300], ['mallow', 61], ['mallow', 66, 2, 240], ['mallow', 70],
      ['ember', 39, 10], ['ember', 48, 10], ['ember', 53, 10], ['ember', 64, 10],   // high leapers, in the gaps between marshmallows
      ['mallow', 74, 3, 240], ['mallow', 80], ['mallow', 84, 2, 220],
      ['kiln', 88, 10, 89, 0], ['kiln', 92, 8, 93, 0.5],
      ['mallow', 96, 4, 260], ['mallow', 103, 2, 220], ['mallow', 109],
      ['ember', 78, 10], ['ember', 90, 10.5], ['ember', 101, 10], ['ember', 107, 10],
      ['shellback', 119], ['grumblet', 125], ['spikelet', 131],
      ['portrait', 128, 3, [
        'THAT STATUE? THAT\'S ME. ACTUAL SIZE.',
        'BEHOLD! A LIFE-SIZE ME. THE SCULPTOR SAID I WAS TOO HANDSOME TO CARVE.',
        'THAT\'S ME, IN STONE. HANDSOME, ISN\'T IT? DON\'T TOUCH IT.',
        'A STATUE OF ME. I POSED FOR NINE HOURS. WORTH IT.',
        'NINE TILES OF PURE MAGNIFICENCE. YES, IT\'S ME.',
        'THE STATUE IS ME. THE NOSE IS MY BEST FEATURE. ALSO THE REST OF ME.',
        'LOOK UPON MY STATUE AND DESPAIR! ...OR JUST ADMIRE IT. ADMIRING IS FINE.',
        'THAT\'S ME. CARVED FROM SOLID ROCK. LIKE MY ABS.',
        'I HAD A STATUE MADE OF ME. THEN ANOTHER. THEN ANOTHER. YOU\'LL SEE.',
        'PLEASE DON\'T LEAN ON MY STATUE. IT\'S VERY TALL AND VERY WOBBLY.',
      ]],
      ['statue', 135, 11],
      ['statue', 151, 11], ['statue', 160, 11], ['statue', 169, 11], ['statue', 178, 11, 'gold'],
      ['ember', 157, 10.5], ['ember', 174, 10.5],
      ['portrait', 192, 3, [
        'CHEF! WHERE ARE MY PANCAKES?!',
        'I SMELL PANCAKES. WHY CAN\'T I TASTE PANCAKES?!',
        'CHEF! THE TASTER IS EATING THEM ALL AGAIN!',
        'BREAKFAST WAS DUE AN HOUR AGO, CHEF!',
        'EVERY DAY: PANCAKES FLY OUT. ZERO PANCAKES ARRIVE.',
        'I PAY THAT TASTER TO TASTE, NOT TO EAT!',
        'CHEF! SHORT STACK! TODAY!',
        'THE KITCHEN. MY PANCAKES GO IN... AND NEVER COME OUT.',
        'WHO TAUGHT MY CHEF TO THROW FOOD?!',
        'CHEF! STOP FLIPPING THEM OVER THE LAVA!',
      ]],
      ['grumblet', 198],
      ['chef', 203, 11, 222, 11], ['gobbler', 222, 11],
      ['ember', 245, 10.2], ['ember', 255, 10.2], ['ember', 271, 10.2],   // high leapers
      ['prisoner', 260, 11],
      ['shellback', 287], ['grumblet', 290], ['spikelet', 295],
      ['boss', 315],
    ],
    boss: { trigger: 308, wall: 302, right: 326 },
    goal: { type: 'exit', x: 327, boss: true },   // MAGMINI's departure opens the arena's right wall
  },
  {
    id: '2-1', name: 'CORAL DEEP', theme: 'ocean', music: 'ocean',
    // the C, K, R eggs are hidden inside the rock here (the level that introduces secret hollows): one
    // in the side of the hanging pillar near the start, one in the reef wall by the warp pipe, one in the trench
    letters: [[38.5, 2.4], [191, 6.4], [385, 4.4]],
    secrets: [[38, 2, 39, 3], [190, 6, 192, 7], [384, 4, 386, 5]],
    catAt: [209, 8],   // the cat companion waits on the three ? blocks just past the warp pipe on Shipwreck Isle
    width: 520, start: 2, checkpoint: [116, 206, 354],
    hint: 'TAP JUMP TO SWIM - NO STOMPING UNDERWATER',
    // three rooms: the reef (0-199), SHIPWRECK ISLE up above the waves (200-339, reached by warp
    // pipe; stomping works up there) and the MIDNIGHT TRENCH + whirlpool back down below (340+)
    water: { top: 1, dry: [[200, 339]] },
    warps: [[186, 203], [325, 344]],
    dark: [[362, 411]],
    darkOpacity: 0.985,   // Midnight Trench: deeper surroundings, with the same clear light around Chickaroo
    signs: [
      [341, 'MIDNIGHT TRENCH', 'STAY SHARP IN THE DARK', '#bffaff'],
    ],
    whirlpool: { x: 422.5, y: 6.5, rx: 5.5, ry: 4.5, speed: 1.8 },
    currents: [
      [46, 60, -0.5, 0],        // undertow pushing back
      [103, 104, 0, -0.24],     // bubble vent: ride it over the trench
      [106, 110, 0, 0.07],      // downdraft into the trench
      [151, 165, 0.6, 0],       // fast lane (with a school swimming against it)
      [438, 465, 0.75, 0],           // the riptide (a school swims against it)
    ],
    map: [
      // ── the reef: Chickaroo starts inside an intricate coral grotto cave and emerges out into the reef ──
      ['ground', 0, 22],
      // Cave roof & walls: enclosed entrance on the left, vaulted central dome, stalactites, and arched right exit
      ['rect', 0, 0, 15, 3, 'X'], ['rect', 0, 4, 1, 8, 'X'], ['rect', 2, 4, 4, 5, 'X'],
      ['rect', 5, 4, 6, 4, 'X'], ['rect', 11, 4, 15, 5, 'X'], ['rect', 13, 6, 15, 7, 'X'], ['rect', 15, 8, 15, 9, 'X'],
      // Sculpted floor terraces, rock pillar, and a tucked upper alcove inside the cave
      ['rect', 0, 11, 2, 11, 'X'], ['rect', 6, 10, 7, 11, 'X'], ['rect', 12, 11, 13, 11, 'X'],
      ['row', 8, 8, '--'], ['row', 9, 5, '?'], ['coins', 8, 7, 2], ['coins', 4, 9, 2], ['coins', 11, 9, 2],
      ['coins', 17, 7, 4],
      ['ground', 25, 45],
      ['rect', 30, 8, 31, 11, 'X'], ['coins', 30, 6, 2],
      ['rect', 37, 1, 39, 5, 'X'],
      ['row', 41, 8, 'B?B'],
      ['ground', 46, 70], ['coins', 48, 5, 4], ['coins', 54, 8, 4],
      ['pipe', 54, 2],
      ['rect', 61, 1, 70, 4, 'X'],                  // low tunnel
      ['ground', 76, 99],
      ['row', 80, 8, '-----'], ['coins', 80, 7, 5],
      ['ground', 88, 90, 4], ['coins', 88, 2, 3],    // reef wall: squeeze over the top
      ['rect', 103, 4, 104, 11, 'o'],              // a pollen column up the bubble vent: dive to its foot, ride it up
      ['ground', 113, 150],
      ['pipe', 120, 3], ['row', 125, 8, '?N?'], ['power', 125, 8, 'volt'],
      ['rect', 131, 1, 150, 3, 'X'],                 // low ceiling
      ['rect', 136, 8, 139, 9, 'X'], ['coins', 136, 7, 4],
      ['ground', 151, 199],
      ['pipe', 161, 3],
      ['rect', 158, 9, 160, 11, 'X'], ['coins', 153, 5, 4], ['coins', 162, 3, 3],
      ['row', 172, 8, 'B?B'], ['row', 178, 5, 'h'],
      ['pipe', 186, 2], ['coins', 186, 7, 2],        // warp pipe: down to go up!
      ['rect', 190, 1, 199, 13, 'X'],                // the reef's end wall
      // ── SHIPWRECK ISLE (dry) ──
      ['ground', 200, 224], ['pipe', 203, 2], ['row', 208, 8, '?U?'],
      ['ground', 229, 242], ['coins', 225, 9, 4],
      ['row', 244, 5, '-----'], ['coins', 244, 4, 5],
      // the wreck, run aground with its bow in the air. Walk in under the prow into the hold (a pill bug
      // down there to bowl through the cargo), hop up through the deck, then climb the rigging past the
      // gulls to the crow's nest (the K). Out over the stern, the anchor swings you on across the water
      ['ground', 249, 276],   // a strip of beach either side of the wreck
      ['rect', 254, 8, 254, 9, 'S'], ['rect', 255, 6, 255, 9, 'S'],       // the prow, overhanging the way in
      ['row', 256, 7, '---------------'],                                 // the deck (256-270)
      ['rect', 259, 10, 260, 11, 'B'], ['row', 264, 11, 'BNB'], ['row', 269, 11, 'B'],   // cargo in the hold
      ['row', 266, 8, '?'],
      ['coins', 261, 10, 2], ['coins', 257, 6, 4],
      ['rect', 263, 3, 263, 6, 'S'],                                      // the mast
      ['row', 259, 5, '---'], ['row', 265, 4, '---'],                     // rigging
      ['row', 261, 2, '-----'],                                           // the crow's nest
      ['coins', 259, 4, 3], ['coins', 265, 3, 3],
      ['row', 268, 4, 'SSS'], ['rect', 271, 4, 271, 11, 'S'],             // the stern cabin
      ['coins', 268, 6, 3],
      ['coins', 279, 5, 3], ['coins', 284, 3, 3],
      ['ground', 289, 314], ['row', 294, 8, 'B?BMB'], ['power', 297, 8, 'pepper'],
      ['stairs', 309, 4, 1], ['coins', 316, 7, 5],
      ['ground', 322, 339], ['pipe', 325, 3], ['coins', 325, 7, 2],
      // ── MIDNIGHT TRENCH ──
      ['ground', 340, 361], ['pipe', 344, 2], ['row', 349, 8, '?M?'], ['power', 350, 8, 'pepper'],
      ['pipe', 357, 3],
      ['coins', 354, 9, 3],
      ['ground', 362, 412],
      ['rect', 366, 1, 368, 7, 'X'], ['coins', 364, 10, 7],        // under the first fang
      ['rect', 373, 6, 375, 11, 'X'], ['coins', 372, 3, 5],         // over the second
      ['rect', 380, 1, 389, 5, 'X'], ['rect', 383, 10, 386, 11, 'X'], ['coins', 379, 8, 11],   // the gullet
      ['rect', 393, 5, 395, 11, 'X'], ['coins', 392, 2, 5],
      ['rect', 400, 1, 402, 6, 'X'], ['coins', 399, 10, 5], ['row', 406, 4, 'h'],
      ['coins', 408, 8, 3],
      // the whirlpool: a treasure pillar ringed with pollen
      ['ground', 413, 519],
      ['rect', 421, 4, 423, 8, 'X'],   // central island; the orbit stays completely unobstructed
      ['coins', 428, 6, 1], ['coins', 427, 7, 1], ['coins', 427, 8, 1], ['coins', 426, 9, 1], ['coins', 425, 10, 1],
      ['coins', 424, 10, 1], ['coins', 423, 10, 1], ['coins', 422, 11, 1], ['coins', 421, 10, 1], ['coins', 420, 10, 1],
      ['coins', 419, 10, 1], ['coins', 418, 9, 1], ['coins', 417, 8, 1], ['coins', 417, 7, 1], ['coins', 417, 6, 1],
      ['coins', 417, 5, 1], ['coins', 417, 4, 1], ['coins', 418, 3, 1], ['coins', 419, 2, 1], ['coins', 420, 2, 1],
      ['coins', 421, 2, 1], ['coins', 422, 2, 1], ['coins', 423, 2, 1], ['coins', 424, 2, 1], ['coins', 425, 2, 1],
      ['coins', 426, 3, 1], ['coins', 427, 4, 1], ['coins', 427, 5, 1],
      ['row', 432, 8, 'B?B'],
      ['rect', 440, 9, 442, 11, 'X'], ['rect', 450, 1, 452, 5, 'X'], ['rect', 458, 8, 459, 11, 'X'],
      ['pipe', 445, 2],
      ['coins', 444, 6, 4], ['coins', 454, 9, 3],
      // pufferfish reef before the pearl clam: coral outcrops and inflating pufferfish
      ['rect', 474, 8, 475, 11, 'X'], ['coins', 472, 4, 4],
      ['rect', 485, 1, 486, 5, 'X'], ['coins', 484, 9, 4],
      ['rect', 496, 8, 497, 11, 'X'], ['coins', 495, 4, 4],
    ],
    entities: [
      ['finlet', 18, 6], ['finlet', 28, 9], ['finlet', 34, 4, 'red'],
      ['urchin', 33, 11], ['jellop', 43, 5],
      ['finlet', 52, 6], ['finlet', 58, 9],
      ['urchin', 66, 11, 'red'], ['finlet', 74, 9],
      ['jellop', 84, 8], ['finlet', 96, 4, 'red'],
      ['finlet', 108, 7, 'red'], ['finlet', 112, 4],
      ['snapvine', 54], ['snapvine', 120], ['snapvine', 161], ['snapvine', 357], ['snapvine', 445],
      ['jellop', 129, 6],
      ['urchin', 141, 11], ['finlet', 149, 9],
      ['finlet', 163, 5], ['finlet', 167, 9], ['finlet', 171, 6, 'red'],
      ['jellop', 180, 5],
      // loose stones to carry and throw (they fly straight underwater and knock critters out)
      ['stone', 9, 11], ['stone', 86, 11], ['stone', 128, 11], ['stone', 145, 11], ['stone', 170, 11],
      ['stone', 356, 11], ['stone', 378, 11], ['stone', 435, 11], ['stone', 468, 11],
      // the reef floor: a few urchins and crabs, well spaced. They never attack, but don't touch!
      // (crabs hold their claws up: no stomping them)
      ['crab', 50, 11, 'blue'], ['crab', 79, 11, 'red'], ['crab', 116, 11, 'orange'],
      ['urchin', 156, 11, 'black'], ['crab', 177, 11, 'red'],
      // isle: crabs on the beach, bees and grasshoppers, anchors swinging off the wreck
      ['grumblet', 211], ['grumblet', 232], ['spring', 241, 11],   // springs you up onto the plank over the gap
      ['platform', 244, 10, 3, 'h', 2, 220, 0],      // driftwood
      ['shellback', 257, 11], ['grumblet', 267, 6],  // a pill bug in the hold, a crab on deck
      ['flutter', 262, 3, false, 'gull'], ['flutter', 279, 5, false, 'gull'],   // gulls round the rigging
      // seabirds all along the isle: gulls wheeling over the beach and the two sea gaps, the odd eagle
      ['flutter', 216, 4, false, 'gull'], ['flutter', 227, 3, false, 'gull'], ['flutter', 237, 5, false, 'eagle'],
      ['flutter', 245, 3, false, 'gull'], ['flutter', 252, 4, false, 'gull'], ['flutter', 288, 3, false, 'eagle'],
      ['flutter', 306, 4, false, 'gull'], ['flutter', 328, 3, false, 'gull'],
      ['platform', 282, 1, 3, 'p', 7, 200, 0],   // an anchor swinging on its chain
      ['buzzbee', 296, 5],
      ['grumblet', 292], ['shellback', 300],
      ['buzzbee', 316, 9, 'hover'], ['buzzbee', 318, 9, 'hover'], ['buzzbee', 320, 9, 'hover'],   // a stomp-bounce bridge
      // trench: pitch dark but for Chickaroo's own light
      ['jellop', 370, 6], ['urchin', 371, 11, 'purple'], ['jellop', 378, 9], ['finlet', 391, 9, 'red'],
      ['urchin', 390, 11, 'red'], ['jellop', 397, 4], ['crab', 405, 11, 'blue'],
      // whirlpool + riptide + pufferfish gauntlet before the clam
      ['urchin', 430, 11, 'green'], ['jellop', 435, 5],
      ['finlet', 448, 6], ['finlet', 450, 8], ['finlet', 454, 7, 'red'], ['finlet', 460, 4], ['finlet', 463, 9],
      ['urchin', 456, 11, 'black'], ['crab', 464, 11, 'orange'],
      ['puffer', 471, 7], ['puffer', 479, 5], ['puffer', 485, 8], ['puffer', 492, 6], ['puffer', 501, 7],
    ],
    goal: { type: 'exit', x: 520 },
  },
  {
    id: '2-2', name: 'FROSTWIND PEAKS', theme: 'snow', music: 'snow',
    letters: [[95, 7], [291, 7], [564, 6]],   // the C, K, R letter coins (column, row), tucked away somewhere hard
    catAt: [132, 8],
    snowballStops: [[281, 281], [560, 566]],   // the cliff past the snowball hill and the summit staircase always end the ride
    width: 590, start: 3, checkpoint: [104, 292, 362],
    hint: 'MIND THE WIND - ICE IS SLIPPERY!',
    wind: { calm: 220, warn: 70, gust: 130, force: 0.6, tailwindAt: 295, tailwindMul: 1.6 },
    map: [
      ['ground', 0, 24], ['coins', 14, 9, 4],
      // a snowy hill to climb, the ice block hanging over the summit
      ['ground', 6, 12, 11], ['ground', 7, 11, 10], ['ground', 8, 10, 9], ['power', 9, 5, 'ice'], ['coins', 6, 9, 2], ['coins', 11, 7, 2],
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
      // ledges over the chasm (the wind matters here)
      ['row', 152, 10, '---'], ['row', 156, 8, '---'], ['row', 160, 10, '---'], ['coins', 156, 7, 3],
      ['ground', 164, 189], ['row', 170, 8, 'B?B'], ['row', 176, 12, 'IIIIII'],
      // SNOWBALL HILL: a giant snowball waits on the summit. ride it down through the crates and
      // the penguins it flattens; it bursts on the cliff and flings its rider up to the high pollen
      ['stairs', 186, 4, 1], ['ground', 190, 196, 8], ['stairs', 197, 4, -1], ['ground', 201, 280],
      ['coins', 205, 10, 6], ['rect', 215, 10, 216, 11, 'B'], ['coins', 218, 9, 5],
      ['rect', 228, 10, 229, 11, 'B'], ['coins', 231, 10, 5],
      // a crevasse: hop the ball over it (pollen hangs over the gap for riders)
      ['rect', 238, 12, 240, 13, '.'], ['coins', 237, 6, 5],
      // a frozen terrace: the ball bumps up the step and bowls through the crate wall on top
      ['ground', 245, 262, 11], ['coins', 247, 9, 4], ['rect', 253, 9, 254, 10, 'B'], ['coins', 256, 8, 4],
      ['rect', 267, 12, 269, 13, '.'], ['coins', 266, 6, 5], ['coins', 272, 10, 4],
      ['row', 277, 9, '--'],
      ['ground', 281, 290, 7], ['coins', 280, 3, 6],
      // TAILWIND GORGE: regular strong gusts carry Chickaroo across without an item trigger
      ['ground', 291, 301], ['stairs', 298, 2, 1], ['ground', 300, 307, 10], ['row', 291, 8, '?M?'], ['power', 292, 8, 'gale'],
      ['row', 318, 10, '------'], ['row', 334, 10, '------'], ['coins', 312, 6, 3], ['coins', 327, 6, 3], ['coins', 343, 6, 3],
      ['ground', 350, 352, 10], ['stairs', 353, 2, -1], ['ground', 353, 410],
      // a quiet frozen pond before the storm
      ['row', 358, 12, 'IIIIIIIIII'], ['row', 366, 8, 'B?B'], ['coins', 373, 9, 4],
      // AVALANCHE RUN: the mountain lets go. ride the snowball (hop the gaps!) or run for your life, then climb!
      ['rect', 392, 0, 406, 3, 'X'], ['coins', 394, 9, 12],
      ['ground', 415, 450], ['row', 416, 12, 'IIIIII'], ['rect', 424, 10, 424, 11, 'B'], ['coins', 426, 8, 4],
      ['rect', 436, 0, 446, 2, 'X'], ['coins', 437, 9, 8],
      ['coins', 450, 6, 4], ['ground', 453, 466], ['ground', 458, 466, 11], ['rect', 460, 9, 461, 10, 'B'],
      ['coins', 467, 5, 5], ['ground', 471, 480], ['coins', 473, 9, 6],
      // ...and on down the mountain: more gaps to hop, a step up, an icicle overhang, a crate wall
      ['coins', 481, 7, 3], ['ground', 484, 494], ['ground', 489, 494, 11], ['coins', 489, 8, 6],
      ['coins', 495, 6, 4], ['ground', 499, 507], ['rect', 499, 0, 507, 2, 'X'], ['coins', 500, 9, 7],
      ['coins', 508, 7, 2], ['ground', 510, 520], ['rect', 514, 10, 515, 11, 'B'], ['coins', 517, 9, 3],
      ['coins', 521, 6, 4], ['ground', 525, 535], ['ground', 529, 535, 11], ['coins', 530, 8, 5],
      ['coins', 536, 7, 3], ['ground', 539, 566],
      // the summit: the avalanche spends itself on the run-out, then a short climb to a ledge and the way
      // back DOWN: big ice pillars, each lower than the last, the snowflake on the biggest at the bottom.
      // The first step is 2 tiles tall; snowballStops makes these steps shatter every ball. On foot
      ['stairs', 560, 4, 1], ['rect', 560, 11, 560, 11, '.'], ['ground', 564, 569, 8],
      ['ground', 567, 589], ['ground', 572, 575, 9], ['ground', 578, 581, 10], ['ground', 584, 589, 11],
      ['coins', 563, 5, 4], ['coins', 573, 6, 2], ['coins', 579, 7, 2],
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
      ['slideguin', 172], ['grumblet', 182],
      ['snowball', 193, 7, 'fling'],
      ['grumblet', 208], ['spikelet', 212], ['slideguin', 222], ['grumblet', 225], ['spikelet', 234],
      ['grumblet', 249, 10], ['shellback', 258, 10], ['slideguin', 261, 10], ['spikelet', 274], ['grumblet', 276],
      ['flutter', 326, 3, false], ['flutter', 340, 2, false],
      ['slideguin', 370], ['grumblet', 378],
      ['avalanche', 384, 548, 2.35], ['snowball', 386, 11],
      ['grumblet', 396], ['icicle', 399, 4], ['icicle', 403, 4], ['slideguin', 408],
      ['spikelet', 420], ['slideguin', 429],
      ['icicle', 439, 3], ['icicle', 442, 3], ['grumblet', 444],
      ['slideguin', 456], ['spikelet', 458, 10], ['grumblet', 454],
      ['spikelet', 476], ['slideguin', 478],
      ['grumblet', 486], ['spikelet', 491, 10], ['icicle', 501, 3], ['icicle', 505, 3],
      ['slideguin', 512], ['grumblet', 518], ['slideguin', 527], ['spikelet', 532, 10],
    ],
    goal: { type: 'exit', x: 587 },
  },
  {
    id: '2-3', name: 'MIDNIGHT CLOCKWORKS', theme: 'clock', music: 'clock',
    letters: [[30, 2], [183, 2], [593, 5]],   // the C, K, R letter coins (column, row), tucked away somewhere hard
    width: 674, start: 3, checkpoint: [122, 272, 397, 498, 610],
    hint: 'BLOCKS SWAP ON THE CHIME - LISTEN FOR THE TICKS',
    // timed TICK/TOCK until the mainspring snaps at column 498 (the fourth checkpoint flag); after that they swap on every jump
    clock: { period: 180, jumpFrom: 498 },
    map: [
      // ── ACT 1: CLOCKMAKERS' ROW. Kookoo has overslept; the clock keeps time ──────────────────────
      ['ground', 0, 33], ['row', 6, 9, 'KKK'], ['power', 7, 5, 'berry'],
      // two gates that are never open together: just too tall to jump (even with a flap), so wait for the swap
      ['rect', 15, 1, 15, 11, 'T'], ['coins', 16, 10, 3], ['rect', 19, 1, 19, 11, 'K'],
      ['row', 22, 9, 'KK'], ['row', 25, 7, 'TT'], ['coins', 24, 4, 4],
      // an alarm clock asleep under a high shelf: snooze it and bounce
      ['row', 28, 5, '----'], ['coins', 28, 4, 4],
      // a bridge over the void that's never all there at once: hop on the chime
      ['row', 34, 12, 'TTTTKKKKTTTT'], ['coins', 38, 9, 4],
      ['ground', 46, 66], ['row', 55, 8, 'B?B'],
      // THE CUCKOO CROSSING: three cuckoo clocks on pillars; their birds are the bridges
      ['ground', 82, 83, 11], ['ground', 99, 100, 9], ['ground', 113, 115, 11],
      ['coins', 69, 7, 3], ['coins', 86, 6, 3], ['coins', 103, 4, 2],
      ['ground', 116, 132], ['row', 124, 8, '?M?'], ['power', 125, 8, 'rand'],
      // pendulum gallery
      ['coins', 138, 6, 2], ['coins', 145, 6, 2], ['coins', 151, 7, 2],
      // ── ACT 2: THE TOY WORKSHOP ─────────────────────────────────────────────────────────────────
      ['ground', 154, 195],
      // a jack-in-the-box up to a high toy shelf, three alarm clocks asleep further along underneath it
      ['row', 173, 4, '------------'], ['coins', 174, 3, 9],
      // THE TOY TRAIN: a long ride over the void. Tap run on it to wind it up (a turn at a time, so you can
      // creep it along), duck in the tunnels and under the clock gates
      ['rect', 202, 0, 204, 8, 'X'], ['rect', 212, 0, 215, 8, 'X'],
      ['coins', 197, 7, 4], ['coins', 207, 7, 4], ['coins', 218, 7, 3],
      // clock gates: hanging pillars tipped with a TICK block just above the train's roof. While the tips
      // are solid nothing gets through; switched off, there's just room to duck under -- so time it
      ['rect', 225, 0, 225, 8, 'X'], ['row', 225, 9, 'T'], ['rect', 231, 0, 231, 8, 'X'], ['row', 231, 9, 'T'],
      ['rect', 237, 0, 237, 8, 'X'], ['row', 237, 9, 'T'],
      ['coins', 228, 6, 1], ['coins', 228, 7, 1], ['coins', 228, 8, 1], ['coins', 234, 6, 1], ['coins', 234, 7, 1], ['coins', 234, 8, 1],
      // the long tunnel (pollen at ducking height), then bats on the home stretch
      ['rect', 242, 0, 251, 8, 'X'], ['coins', 243, 9, 8],
      ['coins', 254, 5, 3], ['coins', 259, 6, 3],
      ['ground', 264, 327], ['row', 275, 8, 'B?B'],
      // toy shelves
      ['row', 284, 9, '-----'], ['row', 289, 6, '-----'], ['row', 294, 3, '------'], ['row', 291, 2, 'h'],
      ['coins', 285, 8, 3], ['coins', 290, 5, 3], ['coins', 295, 2, 4],
      ['row', 301, 6, 'KK'], ['row', 305, 9, 'TT'], ['coins', 301, 5, 2], ['coins', 305, 8, 2],
      // ── ACT 3: THE STOPPED HOUR ─────────────────────────────────────────────────────────────────
      // The freeze crossings are 22–28 tiles wide: use the stopped cogs, birds and cuckoo arm.
      // the Master Stopwatch, and a waterfall of cogs
      ['coins', 329, 3, 1], ['coins', 332, 4, 1], ['coins', 349, 3, 1],
      ['ground', 352, 361],
      // a flock of tin birds over a chasm
      ['coins', 366, 5, 2], ['coins', 384, 5, 2],
      ['ground', 390, 407], ['row', 400, 8, '?M?'], ['power', 401, 8, 'rand'],
      // the long cuckoo: stop time while his bridge is out
      ['coins', 411, 7, 4],
      ['ground', 434, 440],
      // the great cascade, with a stopwatch on an island halfway
      ['row', 463, 10, 'SSS'], ['coins', 442, 4, 1], ['coins', 461, 3, 1], ['coins', 468, 3, 1], ['coins', 471, 4, 1], ['coins', 487, 3, 1],
      // ── ACT 4: THE CLOCK BREAKS. Every jump flips the blocks (a bounce, a pop or a flap doesn't) ──
      ['ground', 490, 522],
      ['rect', 509, 4, 509, 11, 'T'], ['rect', 513, 4, 513, 11, 'K'], ['coins', 510, 10, 3],
      // hopscotch
      ['row', 524, 10, 'KKK'], ['row', 528, 8, 'TTT'], ['row', 532, 10, 'KKK'], ['coins', 528, 6, 3],
      ['ground', 538, 558], ['row', 545, 8, 'B?B'],
      // a bridge of TICK blocks: one hop and it's gone (roll, don't hop)
      ['row', 559, 12, 'TTTTTTTTTTTTTTTT'], ['coins', 561, 11, 12],   // (pollen at rolling height)
      // walk onto the jack-in-the-box (a pop isn't a hop), over the wall, then walk down the steps
      ['ground', 575, 587], ['rect', 582, 12, 582, 12, '.'], ['rect', 585, 3, 587, 11, 'S'],
      ['row', 588, 4, 'TTTT'], ['row', 592, 7, 'TTTT'], ['row', 596, 10, 'TTTTT'], ['row', 588, 12, 'KKKKKKKKKKKKK'],
      ['coins', 588, 3, 4], ['coins', 592, 6, 4], ['coins', 596, 9, 5],
      // ── ACT 5: THE LAST WINDING (622 - 660) ─────────────────────────────────────────────────────
      ['ground', 601, 621],
      ['coins', 615, 8, 3],
      // Every real jump winds three widely spaced wheels by one notch. Only their brass treads
      // cross the pit: no floor, recovery ledges or stationary platforms between the wheels.
      ['ground', 622, 624],
      ['coins', 627, 8, 3], ['coins', 634, 8, 3],
      ['coins', 639, 5, 3], ['coins', 645, 7, 3], ['coins', 650, 6, 3],
      // The final landing pedal raises the portcullis and unfolds the bridge to the exit.
      ['row', 657, 8, '--'], ['rect', 659, 0, 659, 13, '='],
      ['ground', 660, 674], ['coins', 662, 10, 3],
    ],
    entities: [
      // act 1
      ['grumblet', 21], ['alarm', 30],
      ['windup', 53], ['alarm', 58], ['windup', 61],
      ['cuckoo', 65, 11, { reach: 9, period: 220, phase: 0 }],
      ['cuckoo', 82, 10, { reach: 9, period: 220, phase: 0.35 }],
      ['cuckoo', 99, 8, { reach: 6, period: 220, phase: 0.7 }],
      ['alarm', 128], ['alarm', 130],
      ['platform', 136, 0, 3, 'p', 9, 200, 0], ['platform', 143, 0, 3, 'p', 9, 200, 0.1], ['platform', 150, 0, 3, 'p', 9, 200, 0.2],
      // act 2
      ['windup', 162],
      ['jack', 170], ['alarm', 178], ['alarm', 180], ['alarm', 182], ['windup', 182, 3], ['windup', 185],
      ['train', 190, 266, 11],
      ['flutter', 220, 3, false, 'bat'], ['flutter', 254, 3, false, 'bat'], ['flutter', 260, 2, false, 'bat'],
      ['windup', 277], ['grumblet', 281],
      ['windup', 286, 8], ['windup', 291, 5], ['windup', 296, 2], ['alarm', 307], ['windup', 315],
      // act 3
      ['cuckoo', 319, 11, { near: 6, say: [
        'The watches freeze time, thread lightly...',
      ] }],
      ['stopwatch', 325],
      ['gearfall', 329, 28, 0, 2], ['gearfall', 333, 34, 0.5, 2], ['gearfall', 337, 30, 0.25, 2],
      ['gearfall', 341, 28, 0.7, 2], ['gearfall', 345, 34, 0.15, 2], ['gearfall', 349, 30, 0.6, 2],
      ['stopwatch', 361, 11, 560],
      ['tinbirds', 358, 392, 8, 17, 2.7, 390],
      ['alarm', 392],
      ['cuckoo', 406, 11, { reach: 24, period: 200, phase: 0, out: 26 }],
      ['stopwatch', 402],
      ['stopwatch', 439],
      ['gearfall', 442, 28, 0, 2.1], ['gearfall', 446, 34, 0.4, 2.1], ['gearfall', 450, 30, 0.7, 2.1],
      ['gearfall', 454, 28, 0.2, 2.1], ['gearfall', 458, 34, 0.6, 2.1], ['gearfall', 461, 30, 0.35, 2.1],
      ['stopwatch', 465, 9],
      ['gearfall', 468, 30, 0.7, 2.2], ['gearfall', 472, 34, 0.2, 2.2], ['gearfall', 476, 38, 0.55, 2.2],
      ['gearfall', 480, 30, 0.1, 2.2], ['gearfall', 484, 34, 0.65, 2.2], ['gearfall', 487, 38, 0.35, 2.2],
      // act 4
      ['windup', 500],
      ['mainspring', 498],
      ['grumblet', 517],
      ['windup', 548], ['windup', 551],
      ['windup', 565], ['windup', 571],
      ['jack', 582, 12],
      ['clockfinale', 622, 660],
    ],
    goal: { type: 'exit', x: 674 },
  },
  {
    id: '2-4', name: 'ECLIPSE SPIRE', theme: 'eclipse', music: 'eclipse', bossMusic: 'boss24',
    letters: [[70, 3], [263, 2], [344, 3]],   // the C egg moves with the first glass bridge
    width: 476, start: 3, checkpoint: [108, 180, 266, 314, 400],
    hint: 'YOUR SHADOW IS LOOSE - LET IT HOLD THE DOORS',
    quiet: true,   // the stage tells its story in pictures, apart from the boss fight's RUN! prompt
    catAt: 39,     // the cat companion waits on top of the rampart (the glass staircase climb)
    map: [
      // ── ACT 1: THE MOONLIT STEPS. Lamplight makes moonglass solid ───────────────────────────────
      // moonlit courtyard, with a first moonlamp to play with
      ['ground', 0, 34], ['coins', 14, 9, 4],
      // a broken colonnade
      ['rect', 6, 10, 6, 11, 'S'], ['rect', 9, 9, 9, 11, 'S'], ['rect', 12, 10, 12, 11, 'S'],
      ['coins', 6, 8, 1], ['coins', 12, 8, 1],
      ['row', 22, 8, 'B?B'], ['coins', 27, 6, 3],
      // the rampart: far too tall to jump. One lamp lights a staircase of glass, and not long to climb it
      ['ground', 35, 50], ['rect', 38, 5, 40, 11, 'X'], ['row', 34, 10, 'VV'], ['row', 37, 8, 'V'], ['coins', 38, 3, 3],
      ['ground', 51, 64], ['row', 55, 8, '?B?'], ['power', 56, 8, 'volt'], ['coins', 59, 9, 3],
      // the first glass bridge now follows the rampart and its landing
      ['row', 65, 12, 'VVVVVVVVVVVV'], ['coins', 68, 9, 2], ['coins', 71, 9, 3],
      ['row', 70, 8, '-'],   // a perch for the C egg above the glass
      // the relay: a long chasm of glass under four lamps. Keep lighting the next one
      ['row', 77, 12, 'VVVVVVVVVVVVVVVVVVVVVVVV'], ['coins', 79, 9, 4], ['coins', 88, 8, 4], ['coins', 96, 9, 3],
      ['ground', 101, 118], ['row', 112, 8, 'B?B'],
      // ── ACT 2: THE MIRROR GALLERY. A floor polished like a mirror, and a reflection with ideas ───
      ['ground', 119, 177], ['rect', 119, 0, 177, 1, 'S'],
      ['row', 126, 8, 'B?B'], ['coins', 124, 9, 3], ['coins', 134, 9, 3],
      ['rect', 151, 11, 151, 11, 'S'], ['coins', 147, 7, 4], ['coins', 158, 9, 3],
      // ── ACT 3: THE SHADOW LOCKS. Only a shadow can hold a plate down, and it holds it as long as you did ──
      ['ground', 178, 241],
      // lock 1: the lesson
      ['rect', 186, 0, 190, 1, 'S'], ['coins', 182, 9, 3],
      // lock 2: the race -- a long way to the gate, so run
      ['rect', 219, 0, 223, 1, 'S'], ['rect', 203, 11, 203, 11, 'S'], ['rect', 210, 11, 211, 11, 'S'], ['rect', 216, 11, 216, 11, 'S'],
      ['coins', 198, 9, 4], ['coins', 206, 8, 3], ['coins', 213, 8, 2],
      // lock 3: a lamp right over the plate (and some pollen right over the lamp...)
      ['rect', 231, 0, 235, 1, 'S'], ['coins', 227, 6, 3],
      // lock 4: a glass bridge between the plate and the gate
      ['row', 242, 12, 'VVVVVV'], ['coins', 243, 9, 4],
      ['ground', 248, 311], ['rect', 249, 0, 253, 1, 'S'],
      // Pingroo's ledge: glass steps up to it, while the lamp lasts
      ['row', 254, 10, 'VV'], ['row', 256, 8, 'VV'], ['row', 258, 5, 'SSSSSS'],
      // the way up to the sealed door
      ['row', 270, 8, '?M?'], ['power', 271, 8, 'rand'],
      ['stairs', 280, 3, 1], ['ground', 283, 286, 9], ['stairs', 287, 3, -1], ['coins', 283, 7, 4],
      // ── ACT 4: THE SEALED SIGIL. A broken slab shows the picture; the door wants it put back together ──
      ['ground', 312, 340], ['row', 327, 8, 'B?B'], ['coins', 331, 9, 3],
      // a glass pit, with a perch over it (and the R egg high above the perch)
      ['row', 341, 12, 'VVVVVV'], ['row', 344, 8, '-'], ['coins', 342, 9, 2],
      ['ground', 347, 455], ['row', 352, 9, '---'], ['coins', 352, 8, 3], ['coins', 359, 9, 3],
      // the sigil chamber: a lintel to hang it from, two ledges, four buttons, and the door at the far end
      ['rect', 366, 0, 391, 1, 'S'], ['row', 373, 8, '---'], ['row', 384, 8, '---'],
      // ── ACT 5: THE CROWN OF THE SPIRE ───────────────────────────────────────────────────────
      ['row', 404, 8, '?M?'], ['power', 405, 8, 'rand'], ['row', 411, 7, 'h'], ['coins', 408, 9, 4],
      ['stairs', 415, 4, 1], ['ground', 419, 422, 8], ['stairs', 423, 4, -1], ['coins', 419, 6, 4],
      // EVIL UMBRAROO's hall: the open top of the spire, nothing overhead but the eclipse. Wider than the
      // screen, a tower of ledges in three tiers (low, mid, a perch at the top) to run loops up and over
      // with the shadows on your heels, and moonlamps hung at every height (lead the shadows through them)
      ['ground', 456, 475], ['rect', 475, 0, 475, 11, 'S'],
      ['row', 434, 9, '-----'], ['row', 451, 9, '-----'], ['row', 468, 9, '-----'],
      ['row', 442, 6, '-----'], ['row', 460, 6, '-----'],
      ['row', 450, 3, '-------'],
      ['power', 444, 9, 'rand'],   // low, under the left-middle ledge: just clear of a big Chickaroo's head
      ['coins', 435, 7, 3], ['coins', 452, 7, 3], ['coins', 469, 7, 3], ['coins', 443, 4, 3], ['coins', 461, 4, 3], ['coins', 451, 1, 5],
    ],
    entities: [
      // act 1
      ['moonlamp', 17, 7],
      ['wick', 20], ['wick', 25], ['inkling', 31],
      ['moonlamp', 35, 7, 480, 2],   // lights both glass steps on the relocated rampart
      ['wick', 44], ['thorn', 47],
      ['gargoyle', 52, 6], ['wick', 56], ['thorn', 59], ['moth', 61, 3],
      ['moonlamp', 67, 8, 420], ['moonlamp', 73, 8, 420],
      ['moonlamp', 78, 8, 300], ['moonlamp', 84, 7, 300], ['moonlamp', 90, 8, 300], ['moonlamp', 96, 7, 300],
      ['moth', 82, 3], ['moth', 88, 2], ['moth', 95, 3],
      ['moth', 98, 4],
      // act 2: the mirror gallery
      ['reflection', 120, 176, [128, 164], 168, 263],   // a faithful reflection that slowly turns into his shadow
      // ink drops clinging to the gallery roof (they fall as you pass under), and things on the floor
      ['drip', 126, 2], ['drip', 142, 2], ['drip', 158, 2], ['drip', 166, 2],
      ['wick', 137], ['inkling', 147], ['wick', 160],
      // act 3: the shadow locks
      ['keeper', 172, 250],
      // (your shadow is harmless now, so the threat here is everything else: moths fluttering after you
      // while you wait on a plate or at a gate, and things on the floor in the way of the race)
      ['plate', 183, 11, 'a'], ['gate', 188, 2, 11, 'a'], ['moth', 191, 3],
      ['plate', 194, 11, 'b'], ['gate', 221, 2, 11, 'b', 75],
      ['wick', 207], ['thorn', 213],
      ['plate', 228, 11, 'c'], ['moonlamp', 228, 7, 120, 4, true], ['gate', 233, 2, 11, 'c'],   // on 2s / off 2s: get the shadow onto the plate while it's dark ['moth', 231, 3],
      ['plate', 239, 11, 'd'], ['moonlamp', 243, 8, 300], ['gate', 251, 2, 11, 'd'], ['wick', 249],
      ['moonlamp', 253, 7, 420],
      ['prisoner', 261, 4],
      ['wick', 277], ['gargoyle', 285, 4], ['thorn', 292], ['inkling', 290], ['moth', 294, 3], ['wick', 297],
      // act 4: the sealed sigil
      ['slab', 320], ['moonlamp', 324, 7],
      ['inkling', 334], ['moth', 338, 3],
      ['moonlamp', 342, 8, 300, 5],
      ['thorn', 356], ['wick', 362], ['gargoyle', 358, 6],
      // one button, one stone -- but none of them is under the stone it turns: the left floor button turns the top right
      // stone, the left ledge the bottom right, the right ledge the bottom left, the right floor the top left
      ['sigil', 380, 4, 392, [2, 1, 1, 3], [[1], [2], [3], [0]]],
      ['sigbtn', 374, 11, 0], ['sigbtn', 374, 7, 1], ['sigbtn', 385, 7, 2], ['sigbtn', 385, 11, 3],
      ['moth', 378, 3],
      // act 5
      ['wick', 411], ['inkling', 420, 7], ['wick', 413], ['moth', 418, 3], ['thorn', 428],
      ['umbra', 432],
      // the hall's lamps: two over the floor, one over each low side ledge, one over each mid ledge, one at the top
      ['moonlamp', 447, 8], ['moonlamp', 457, 8], ['moonlamp', 436, 6], ['moonlamp', 470, 6], ['moonlamp', 444, 3], ['moonlamp', 462, 3], ['moonlamp', 453, 0],
    ],
    boss: { trigger: 433, wall: 431, right: 475 },
    goal: { type: 'exit', x: 476, boss: true },   // the hall opens after UMBRAROO finishes dissolving
  },
  {
    id: '3-1', name: 'SUNSCORCH DUNES', theme: 'desert', music: 'desert',
    // the C, K, R eggs are tucked into secret hollows: up in the first low arch over the camel's path,
    // in the side of the hanging temple pillar, and in the rock outcrop just before the worm crossing
    letters: [[89.5, 7.4], [262.5, 5.4], [538.5, 10.4]],
    secrets: [[89, 7, 90, 8], [262, 5, 263, 6], [538, 10, 539, 11]],
    width: 745, start: 3, checkpoint: [173, 237, 347, 490, 541],
    hint: 'QUICKSAND SINKS YOU - HOLD JUMP TO HOP OUT',
    zones: [[240, 296, 'temple'], [298, 346, 'oasis']],
    hellfire: true,   // its lava (the carpet ride's sea) roars with flames and embers
    catAt: [227, 8],   // waiting on the middle block after the frozen sand bridge
    // A tour of the dunes with DJINNY, a genie whose wishes are never quite right: a camel ride across the
    // quicksand marsh, a lake frozen solid by a fridge, the sun temple, the mirage oasis, a flying carpet over hellfire
    // over the sand sea, vulture canyon, a gruesome sandworm chase, and DJINNY's sleepy farewell.
    map: [
      // the dune gate: a little pyramid, the first sand pool, the first geyser
      ['ground', 0, 34],
      ['stairs', 7, 3, 1], ['stairs', 10, 3, -1], ['coins', 13, 9, 3],
      ['rect', 17, 12, 19, 13, 'Q'], ['coins', 17, 9, 3],
      ['ground', 23, 26, 11], ['row', 28, 8, 'B?B'],
      // the camel's fare: a coin block high up by the sky. Bump it from the one-tile stepping stone right under
      // it (a stretch to leap onto from the sand step), and the coin pops out on top: then get up there for it
      ['power', 21, 3, 'coin'], ['row', 21, 7, '-'],
      ['rect', 35, 12, 42, 13, 'Q'], ['coins', 37, 4, 4],
      ['ground', 43, 72], ['row', 46, 8, '----'], ['coins', 46, 7, 4], ['row', 54, 8, '?B?'],
      // HUMPHREY's crossing: a quicksand marsh, scorpions on little sand islands, and low rock arches
      // hanging over his path (duck, or be scraped off his back)
      ['rect', 73, 12, 167, 13, 'Q'],
      ['ground', 80, 82, 11], ['ground', 96, 98, 11], ['ground', 110, 112, 11],
      ['rect', 88, 0, 91, 8, 'X'], ['rect', 103, 0, 105, 8, 'X'],
      ['coins', 84, 7, 3], ['coins', 93, 6, 4], ['coins', 107, 7, 3], ['coins', 114, 6, 4],
      // the long second half of the ride: more islands, a double arch (stay ducked), critters coming up behind
      ['ground', 124, 126, 11], ['ground', 140, 142, 11], ['ground', 156, 158, 11],
      ['rect', 131, 0, 133, 8, 'X'], ['rect', 147, 0, 148, 8, 'X'], ['rect', 151, 0, 152, 8, 'X'],
      ['coins', 120, 6, 3], ['coins', 128, 7, 3], ['coins', 136, 6, 4], ['coins', 144, 7, 2], ['coins', 160, 6, 4],
      // the fridge: DJINNY's lamp, and a long lake of quicksand nobody could wade across
      ['ground', 168, 188], ['row', 172, 8, 'B?B'],
      ['rect', 189, 12, 220, 13, 'Q'],
      ['coins', 194, 9, 3], ['coins', 203, 8, 3], ['coins', 212, 9, 3],
      ['ground', 221, 238], ['row', 226, 8, '?M?'],
      // the sun temple: carved roof, dart traps in the walls, a sand pit with a geyser up to the vault
      ['ground', 239, 297], ['rect', 242, 0, 295, 2, 'S'], ['rect', 241, 1, 241, 2, 'S'], ['rect', 296, 1, 296, 2, 'S'],
      ['pipe', 248, 2], ['row', 251, 8, 'BMB'], ['power', 252, 8, 'rand'],
      ['rect', 261, 3, 263, 6, 'S'], ['coins', 256, 9, 3],
      ['rect', 268, 9, 271, 11, 'S'],
      ['rect', 272, 12, 277, 13, 'Q'], ['rect', 273, 1, 277, 2, '.'], ['row', 273, 5, '-----'], ['coins', 273, 3, 5],
      ['rect', 282, 3, 283, 8, 'S'],
      ['pipe', 287, 3], ['row', 291, 8, 'B?B'],
      // the mirage oasis: those palms promised water. it's quicksand, and something swims in it
      ['ground', 298, 305], ['rect', 306, 12, 324, 13, 'Q'], ['row', 316, 5, '---'], ['coins', 313, 2, 6],
      ['ground', 325, 356], ['row', 330, 8, '?M?'], ['row', 336, 8, '----'], ['row', 339, 5, '---'], ['coins', 339, 4, 3],
      // the sea of hellfire, crossed on DJINNY's flying carpet: steer through the rock gates (fall in and you're toast)
      ['rect', 357, 12, 449, 13, 'L'],
      ['rect', 366, 7, 367, 13, 'X'],                                  // low pillar: fly over
      ['rect', 378, 0, 379, 6, 'X'],                                   // hanging rock: fly under
      ['rect', 390, 0, 391, 3, 'X'], ['rect', 390, 9, 391, 13, 'X'],   // a gate: through the middle
      ['rect', 403, 5, 404, 13, 'X'],                                  // tall pillar: fly high
      ['rect', 415, 0, 416, 7, 'X'],                                   // long drop of rock: fly low
      ['rect', 424, 6, 425, 13, 'X'], ['rect', 433, 0, 434, 6, 'X'],   // a slalom: over, then under
      ['rect', 443, 0, 444, 4, 'X'], ['rect', 443, 10, 444, 13, 'X'],  // the last gate
      // pollen threaded through each hoop: fly through the ring and you sweep up the whole line
      ['coins', 370, 6, 5], ['coins', 382, 7, 5], ['coins', 394, 4, 5], ['coins', 407, 7, 5],
      ['coins', 417, 8, 5], ['coins', 427, 7, 5], ['coins', 436, 6, 5],
      ['ground', 450, 468], ['row', 458, 8, 'B?B'], ['row', 461, 5, '---'],   // (hop up from the blocks: high enough to stomp the vulture)
      // vulture canyon: mesas over bottomless gaps, geysers from the deep
      ['ground', 472, 476, 9], ['ground', 481, 485, 8], ['coins', 478, 5, 2], ['coins', 482, 6, 3],
      // ...then it opens out: a mesa that holds (catch your breath), two geysers out of step under a high ledge, a
      // stair of crumbling mesas stepping down past a geyser to a second high shelf, another rest, and one slow last geyser
      ['ground', 489, 492, 9], ['coins', 490, 6, 2],
      ['row', 496, 3, '--------'], ['coins', 497, 2, 6], ['coins', 497, 6, 4],                // (up off the first geyser's crown at its peak)
      ['ground', 505, 508, 7], ['ground', 516, 517, 9], ['ground', 520, 521, 10],
      ['row', 512, 4, '----'], ['coins', 512, 3, 4],
      ['coins', 518, 7, 2], ['ground', 523, 525, 10], ['coins', 528, 4, 3],
      ['ground', 532, 675], ['ground', 536, 539, 9],
      // GRUBBLE's dunes: the worm chase. sand pits to leap, dune humps.
      // No blocks out here (no time to stop and bump anything), just a little pollen on the way
      ['rect', 560, 12, 562, 13, 'Q'], ['ground', 567, 570, 11], ['rect', 576, 12, 579, 13, 'Q'],
      ['ground', 584, 588, 11], ['ground', 585, 587, 10], ['rect', 593, 12, 595, 13, 'Q'],
      ['ground', 602, 605, 11], ['rect', 610, 12, 613, 13, 'Q'], ['ground', 618, 620, 11],
      ['rect', 626, 12, 628, 13, 'Q'], ['ground', 633, 637, 11], ['ground', 634, 636, 10], ['ground', 635, 635, 9],
      ['rect', 642, 12, 645, 13, 'Q'], ['ground', 650, 652, 11], ['rect', 656, 12, 658, 13, 'Q'],
      ['coins', 556, 9, 2], ['coins', 572, 8, 2], ['coins', 585, 7, 2], ['coins', 606, 8, 2], ['coins', 622, 9, 2],
      ['coins', 639, 8, 2], ['coins', 654, 9, 2],
      // the end of the road: a "lamp", a clear first pyramid, and a snake-filled tall one with the scarab up by the sky
      // Thirteen extra tiles (208px, about half a screen) of empty ground after the cactus.
      ['ground', 676, 744], ['coins', 699, 9, 3],
      ['stairs', 703, 4, 1], ['rect', 707, 8, 709, 11, 'S'], ['stairs', 710, 4, -1], ['coins', 706, 6, 5],
      ['stairs', 718, 7, 1], ['rect', 725, 5, 727, 11, 'S'], ['stairs', 728, 7, -1],
    ],
    entities: [
      ['sidewinder', 14], ['sidewinder', 22], ['sidewinder', 31],
      ['sandspout', 38, 5, 260, 0.1],
      ['scorpling', 50], ['sidewinder', 58],
      ['camel', 64, 172], ['camelgate', 72],   // no coin, no ride: the toll gate only opens once he's paid
      ['sign', 81, 'DUCK!', 10], ['scorpling', 81, 10], ['scorpling', 97, 10], ['scorpling', 111, 10],
      ['flutter', 100, 3, false, 'eagle'], ['flutter', 116, 4, false, 'eagle'],
      // Low-flying eagles can swoop into HUMPHREY's trailing clouds.
      ['flutter', 88, 9, false, 'eagle'], ['flutter', 120, 9, false, 'eagle'],
      ['flutter', 145, 10, false, 'eagle'], ['flutter', 164, 9, false, 'eagle'],
      ['scorpling', 125, 10], ['sidewinder', 141, 10], ['scorpling', 157, 10], ['sidewinder', 126, 10],
      ['flutter', 129, 8, false, 'eagle'],
      ['lamp', 182, 11, 'fridge', 186, 189, 220],
      ['sidewinder', 230], ['scorpling', 235],
      ['sidewinder', 254],
      ['clay', 243], ['clay', 244], ['clay', 256], ['clay', 264], ['clay', 265], ['clay', 279], ['clay', 280], ['clay', 294],   // breakable pots, green pollen in each
      ['dartrap', 268, 11, -1, 110, 0], ['dartrap', 261, 4, -1, 150, 0.5],
      ['sandspout', 274, 6, 220, 0.3],
      ['dartrap', 282, 8, -1, 120, 0.25],
      ['sidewinder', 289], ['scorpling', 293],
      ['sandspout', 308, 5, 250, 0], ['sandspout', 314, 7, 250, 0.33], ['sandspout', 320, 5, 250, 0.66],
      ['dunefin', 306, 324],
      ['sidewinder', 332], ['scorpling', 338], ['sidewinder', 344],
      ['lamp', 352, 11, 'carpet', 354, 10, 448, 12],
      ['sign', 366, 'SPEED LIMIT|2 HUMPS', 6],
      ['hoop', 372, 6], ['hoop', 384, 7], ['hoop', 396, 4], ['hoop', 409, 7], ['hoop', 419, 8], ['hoop', 429, 7], ['hoop', 438, 6],
      ['vulturk', 362, 446], ['flutter', 400, 9, false, 'eagle'], ['flutter', 422, 3, false, 'eagle'],
      ['scorpling', 462],
      ['sandspout', 477, 6, 200, 0, 14], ['sandspout', 486, 6, 180, 0.5, 14],
      ['vulturk', 468, 492],
      ['crumble', 472, 476, 9], ['crumble', 481, 485, 8],   // the two mesas give way two seconds after you land on them
      // the long half of the canyon: geysers out of step (hop crown to crown as the next one rises, or go up and over)
      ['sandspout', 494, 7, 260, 0, 14], ['sandspout', 500, 7, 260, 0.45, 14],
      ['crumble', 505, 508, 7], ['crumble', 516, 517, 9], ['crumble', 520, 521, 10],
      ['sandspout', 513, 6, 240, 0.2, 14],
      ['sandspout', 527, 7, 300, 0.6, 14],
      ['vulturk', 500, 530],
      ['sign', 545, 'WORM|CROSSING'],
      ['worm', 550, 668, 2.15],
      ['sidewinder', 566], ['sidewinder', 590], ['scorpling', 603, 10], ['sidewinder', 630], ['scorpling', 651, 10],
      ['bigcactus', 670],
      ['lamp', 695, 11, 'farewell'],
      // Keep the first pyramid clear for the lamp; swarm the scarab pyramid's steps, crest and approaches.
      ['sidewinder', 715], ['sidewinder', 716],
      ['sidewinder', 719, 9], ['sidewinder', 721, 7], ['sidewinder', 723, 5],
      ['sidewinder', 728, 4], ['sidewinder', 730, 6], ['sidewinder', 733, 9],
      ['sidewinder', 738], ['sidewinder', 741],
    ],
    goal: { type: 'exit', x: 745 },   // over the last pyramid, then off the right edge
  },
  {
    id: '3-2', name: 'MONSOON JUNGLE', theme: 'jungle', music: 'jungle',
    letters: [[112, 7], [170, 5], [304.5, 10]],   // the C, K, R letter coins (column, row), tucked away somewhere hard
    width: 420, start: 3, checkpoint: [90, 175, 254, 322], canopy: true,
    hint: 'GRAB VINES MID-AIR: PUMP LEFT/RIGHT, JUMP TO LET GO',
    // the skies stay clear through the treetops; the first storm breaks as you reach the rivers
    monsoon: { start: 128, delay: 150, dry: 380, warn: 180, rise: 180, flood: 300, fall: 140 },
    rivers: [[29, 35, 12.4, 12.4], [61, 84, 13.5, 13.5], [131, 145, 13.7, 12.1], [148, 162, 13.7, 9.4], [205, 225, 13.7, 10.0],
      [227, 248, 13.7, 10.6], [257, 280, 13.7, 9.3], [293, 316, 13.6, 12.2], [346, 387, 13.7, 12.5]],
    falls: [[147, 9, 1], [163, 6, -1], [191, 8, -1], [256, 9, 1], [281, 6, -1], [288, 6, 1], [332, 5, -1], [345, 5, 1]],
    zones: [[390, 419, 'ruins']],
    map: [
      // ── trailhead: a berry, and a chameleon in plain sight (if you look for the eyes)
      ['ground', 0, 28], ['coins', 14, 9, 3],
      // a tree stump and a low branch, a berry block up among the leaves
      ['pipe', 6, 2], ['row', 9, 8, '----'], ['row', 11, 4, 'M'], ['coins', 9, 7, 2],
      // ── first swing over a shallow creek (miss and you just wade out)
      ['ground', 29, 35, 13], ['coins', 30, 12, 5], ['row', 30, 8, 'o'], ['row', 32, 8, 'o'], ['row', 34, 8, 'o'],
      ['ground', 36, 60], ['row', 42, 8, 'B?B'], ['pipe', 54, 3], ['coins', 46, 10, 3],
      // ── the gorge: three vines over a bottomless river, each shorter and quicker than the last
      // pollen on the swing arcs: every puff is within reach of some vine's swing
      ['row', 64, 8, 'o'], ['row', 66, 9, 'o'], ['row', 68, 8, 'o'], ['row', 70, 8, 'o'], ['row', 72, 8, 'o'], ['row', 74, 8, 'o'], ['row', 76, 8, 'o'],
      ['row', 79, 7, 'o'], ['row', 81, 7, 'o'], ['row', 83, 7, 'o'],
      // the hidden 1-UP: land past the gorge, hop up the two planks, bump the block over the high one
      ['row', 87, 8, '--'], ['row', 90, 5, '----'], ['row', 91, 2, 'U'], ['coins', 92, 4, 2],
      // ── coconut canopy: the low road under the monkeys, or the plank walk across the treetops
      ['ground', 85, 130], ['ground', 85, 92, 11],
      ['row', 96, 7, '-----'], ['coins', 96, 6, 5],
      ['row', 108, 5, '----'], ['coins', 108, 4, 4], ['row', 109, 1, 'N'],
      ['row', 118, 4, '---'], ['coins', 102, 10, 3], ['row', 112, 8, 'B?B'], ['pipe', 124, 3],
      // ── rain country: the first storm. Shallow creek, then the lock - the cliff is out of
      // reach until the flood floats the lily pads up to it
      ['ground', 131, 145, 13], ['coins', 133, 8, 2], ['coins', 137, 7, 2], ['coins', 141, 8, 2], ['row', 139, 4, 'h'],
      ['ground', 146, 146, 10], ['ground', 147, 147, 9],
      ['ground', 148, 162, 13], ['coins', 150, 6, 3], ['coins', 155, 5, 3],
      ['ground', 163, 170, 6], ['coins', 164, 4, 3],
      ['ground', 171, 190], ['row', 178, 8, 'BMB'],
      // ── drum hill: a thumpdrum stomping about up here (the storm keeps its own time)
      ['ground', 191, 204, 8],
      // ── dry run: a riverbed tunnel under the rock; it floods to the roof
      ['ground', 205, 225], ['ground', 220, 225, 10], ['rect', 208, 0, 219, 7, 'X'], ['rect', 208, 4, 208, 7, 'S'], ['rect', 219, 4, 219, 7, 'S'], ['row', 209, 7, 'SSSSSSSSSS'], ['coins', 209, 11, 3], ['coins', 214, 11, 3],
      // ── the gully: chameleons all along the riverbed - wade through them, or call a flash flood
      ['ground', 226, 226, 10], ['ground', 227, 248, 13], ['coins', 229, 8, 3], ['coins', 235, 7, 3], ['coins', 241, 8, 3],
      ['ground', 249, 256, 9],
      // ── race the rain: pads rise to the cliff beyond
      ['ground', 257, 280, 13], ['coins', 261, 5, 6], ['coins', 271, 5, 4],
      ['ground', 281, 288, 6], ['coins', 283, 4, 4],
      // ── croc creek: logs to ride (two of them aren't logs), vines in reach when the water's up
      ['ground', 289, 292, 9],
      ['coins', 298, 6, 3], ['coins', 311, 6, 3],
      ['ground', 317, 326, 11], ['row', 320, 7, '?B?'],
      // ── gulpod gardens: the only way up the mesa, then pod to pod over the great river
      ['ground', 327, 331], ['ground', 332, 345, 5], ['coins', 335, 3, 3], ['coins', 341, 3, 3], ['power', 338, 1, 'rand'],
      ['coins', 350, 6, 2], ['coins', 356, 7, 2], ['coins', 362, 7, 2], ['coins', 369, 6, 2], ['coins', 376, 7, 2],
      // ── the banana temple
      ['ground', 388, 419], ['row', 391, 8, 'B?B'],
      ['stairs', 395, 4, 1], ['rect', 399, 8, 402, 11, 'S'], ['stairs', 403, 4, -1], ['coins', 399, 6, 4],
    ],
    entities: [
      ['chamelurk', 18],
      ['vine', 32, 7.5],
      ['thumpdrum', 44, 11],
      ['chimpchuck', 48, 11],
      ['snapvine', 55],
      ['vine', 66, 7.5], ['vine', 74, 6.5], ['vine', 81, 5.5],
      ['chamelurk', 101], ['vine', 104, 5], ['chimpchuck', 106, 11], ['chamelurk', 114], ['thumpdrum', 117, 11], ['chimpchuck', 120, 3], ['chimpchuck', 123, 8],
      ['lilypad', 133, 2], ['lilypad', 137, 2], ['lilypad', 141, 2], ['chamelurk', 139, 12],
      ['lilypad', 150, 2], ['lilypad', 155, 2], ['lilypad', 160, 2], ['vine', 156, 6], ['chimpchuck', 167, 5],
      ['chamelurk', 182], ['chimpchuck', 186, 11],
      ['thumpdrum', 198, 7],
      ['chamelurk', 212], ['chamelurk', 217],
      ['lilypad', 229, 2], ['lilypad', 234, 2], ['lilypad', 239, 2], ['lilypad', 244, 2],
      ['chamelurk', 232, 12], ['chamelurk', 237, 12], ['chamelurk', 242, 12],
      ['thumpdrum', 252, 8],
      ['lilypad', 261, 2], ['lilypad', 266, 2], ['lilypad', 271, 2], ['lilypad', 276, 2], ['chimpchuck', 284, 5],
      ['logator', 293, 303, 480, 0], ['lilypad', 304, 2], ['logator', 306, 316, 520, 0.45],
      ['vine', 298, 7.5], ['vine', 311, 7.5],
      ['chimpchuck', 322, 10], ['chamelurk', 325, 10],
      ['gulpod', 328, 10, -70, 'aim'],
      ['chamelurk', 337, 4],
      ['gulpod', 347, 7, -20, 'sweep', 35, 130],
      ['gulpod', 354, 5, 26.57, 'auto'],
      ['gulpod', 360, 8, -26.57, 'auto'],
      ['lilypad', 358, 2], ['lilypad', 362, 2],
      ['gulpod', 366, 5, -25, 'sweep', 45, 110],
      ['gulpod', 373, 7, 0, 'sweep', 40, 90],
      ['gulpod', 380, 6, -48, 'aim'],
      ['thumpdrum', 390, 11],
      ['chimpchuck', 405, 9], ['chimpchuck', 410, 11],   // penultimate temple step and banana approach, with room between them
    ],
    goal: { type: 'exit', x: 413 },
  },
  {
    id: '3-4', name: 'GUT FEELING', theme: 'gut', music: 'gut', bossMusic: 'boss34',
    // Swallowed by a turtle, and the long way down. A descent stage (see gut.js): sections lead down with a fade
    // between them; the stomach has three connected chambers to explore horizontally. Room 0 is the sky (the freefall into the
    // turtle's mouth); then three screens of esophagus, the stomach, the pyloric mill, the small intestine,
    // the fermentation chamber, and the Cloaca Vault (two screens of digested fecal matter + Cloacolith's vault; beating
    // him sets off the turtle's bowel movement, which blasts him out into the sea and back to his bed: gut-vault.js).
    freshStart: true,   // no powerups carried in from the stage before
    width: 519, start: 12, checkpoint: [35, 115, 150, 177, 288, 317, 336, 362, 435, 477], cpRows: [3, 5, 9, 11, 11, 11, 5, 12, 10, 11],
    rooms: [[0, 24, 'sky'], [25, 49, 'gut'], [50, 74, 'gut'], [75, 99, 'gut'], [100, 174, 'gut'], [175, 249, 'gut'], [250, 334, 'gut'], [335, 430, 'gut'], [431, 518, 'gut']],
    secrets: [[117, 5, 119, 6, 3], [283, 2, 285, 3, 3], [339, 10, 340, 11]],   // hidden pocket with a thin, solid flesh roof; enter from below
    letters: [[118, 5.5], [284, 2.7], [339.5, 10.5]],   // C (stomach pocket), K (the lump on the intestine's ceiling), R (hidden in the colon's landing mound)
    descent: { intro: true, spawn: [36, 0], exits: {
      1: { from: [38, 41], at: 63 },
      2: { from: [54, 57], at: 89 },
      3: { from: [88, 91], at: 113 },
      4: { from: [171, 172], at: 177 },
      5: { from: [235, 240], at: 259 },
      6: { from: [329, 331], at: 336 },
      7: { from: [425, 427], at: 434 },
    } },
    boss: { trigger: 488, wall: 484, right: 518 },
    // Murray, waiting by the checkpoint in the pylorus (and Chickaroo has something to say about that first)
    catAt: [178, 11], catKind: 'murray', catLine: 'Murray ?! How did you get in here?', catHits: 7,   // (he stays for 7 hits in here)
    map: [
      // ── ROOM 1: THE ESOPHAGUS CHUTE & PAPILLAE PIT. The gullet snakes down between walls bristling with
      // backward-pointing spikes; weave down the bones (left, right, left) and drop through the
      // throat ring at the bottom
      ['rect', 25, 0, 32, 2, 'X'], ['rect', 42, 0, 49, 2, 'X'],      // the top of the gullet
      ['rect', 25, 3, 31, 10, 'X'], ['rect', 43, 3, 49, 8, 'X'], ['rect', 42, 9, 49, 10, 'X'],
      ['rect', 25, 11, 34, 12, 'X'], ['rect', 42, 11, 49, 12, 'X'],  // it funnels down to the ring
      ['rect', 25, 13, 37, 13, 'X'], ['rect', 42, 13, 49, 13, 'X'],  // (the ring's gap: columns 38-41)
      // the bones: each one's open end hangs over the next, on the other side -- left, right, left, then the ring
      ['row', 32, 3, '------'], ['row', 36, 6, '-------'], ['row', 32, 9, '-----'],
      ['coins', 37, 1, 2], ['coins', 39, 4, 2], ['coins', 34, 7, 2], ['coins', 39, 11, 2],   // (pollen down the open middle, on the way down: clear of the spikes)
      // ── ROOM 2: THE LEFTWARD BEND. Broad shelves step down from the right-hand inlet to a left-hand drain.
      ['rect', 50, 0, 62, 0, 'X'], ['rect', 67, 0, 74, 3, 'X'],
      ['rect', 50, 2, 51, 10, 'X'], ['rect', 71, 4, 74, 7, 'X'], ['rect', 65, 8, 74, 10, 'X'],
      ['row', 61, 3, '----------'], ['row', 56, 6, '-------'], ['row', 52, 9, '--'],
      ['rect', 50, 11, 53, 13, 'X'], ['rect', 58, 11, 74, 13, 'X'],
      ['coins', 64, 2, 2], ['coins', 58, 5, 3], ['coins', 54, 8, 2], ['coins', 55, 11, 2],
      // ── ROOM 3: THE SWALLOWED LITTER WELL. A roomy final fall with small bone islands and harmless bags to stomp.
      // The lower walls funnel both routes into the stomach's landing opening.
      ['rect', 75, 0, 88, 0, 'X'], ['rect', 94, 0, 99, 0, 'X'],
      ['rect', 75, 2, 77, 8, 'X'], ['rect', 97, 2, 99, 8, 'X'],
      ['row', 89, 3, '----'], ['row', 83, 6, '---'], ['row', 93, 7, '----'], ['row', 85, 10, '---'],
      ['rect', 75, 9, 80, 10, 'X'], ['rect', 95, 9, 99, 10, 'X'],
      ['rect', 75, 11, 84, 12, 'X'], ['rect', 93, 11, 99, 12, 'X'],
      ['rect', 75, 13, 87, 13, 'X'], ['rect', 92, 13, 99, 13, 'X'],
      ['coins', 90, 2, 2], ['coins', 83, 5, 2], ['coins', 93, 6, 2],
      // ── ROOM 4: THE STOMACH. Three spacious chambers connected horizontally. The first two have firm floors;
      // the last holds the acid crossing and its four floating objects. Only its gastrolith drain plug leads down.
      // Landing chamber: keep the C egg inside the original flesh fold, with its thin, solid roof.
      ['rect', 100, 0, 100, 13, 'X'], ['rect', 101, 0, 111, 0, 'X'], ['rect', 118, 0, 124, 0, 'X'],
      ['rect', 112, 5, 123, 6, 'X'], ['rect', 101, 12, 126, 13, 'X'],
      ['rect', 117, 11, 119, 11, 'X'],   // (the one low step under the secret pocket, to reach it)
      ['coins', 106, 9, 1], ['coins', 111, 9, 1], ['coins', 114, 8, 2], ['coins', 117, 7, 3], ['coins', 103, 6, 2],
      ['power', 108, 8, 'rand'],   // a power-up block on the left of the landing chamber, a jump up from the floor
      // A broad middle chamber: a high ceiling, a flat floor and generous headroom in both passages.
      ['rect', 125, 0, 126, 2, 'X'],
      ['rect', 127, 0, 148, 1, 'X'], ['rect', 127, 12, 148, 13, 'X'],
      ['coins', 128, 9, 3], ['coins', 134, 8, 2], ['coins', 138, 9, 3], ['coins', 143, 8, 2],
      // Acid chamber: a safe checkpoint terrace, four close stepping stones, and the one down exit at the far end.
      ['rect', 149, 0, 151, 2, 'X'], ['rect', 149, 9, 153, 13, 'X'],
      ['rect', 152, 0, 173, 1, 'X'], ['rect', 174, 0, 174, 13, 'X'], ['rect', 154, 10, 155, 13, 'X'],
      ['coins', 158, 9, 1], ['coins', 162, 9, 1], ['coins', 166, 9, 2], ['coins', 171, 9, 1],
      // ── ROOM 5: THE PYLORIC MILL. Three airy chambers: a landing hall, the rolling-stone gallery,
      // and the final valve shaft. Raised folds and bone balconies give room to jump over the grinders.
      // Landing hall: nine tiles of headroom, a clear checkpoint and a hopper in the far fold.
      ['rect', 175, 0, 175, 13, 'X'], ['rect', 176, 0, 176, 1, 'X'], ['rect', 182, 0, 199, 1, 'X'],
      ['rect', 176, 11, 199, 13, 'X'], ['rect', 198, 8, 199, 10, 'X'],
      ['row', 187, 7, '-----'], ['row', 194, 8, '----'],
      ['coins', 182, 9, 3], ['coins', 188, 5, 3], ['coins', 195, 6, 2],
      // Gallery: a broad floor below two elevated refuges, with open passages at both ends.
      ['rect', 200, 0, 224, 1, 'X'], ['rect', 200, 11, 224, 13, 'X'],
      ['rect', 205, 10, 207, 10, 'X'], ['rect', 223, 8, 224, 10, 'X'],
      ['row', 203, 7, '-----'], ['row', 213, 6, '-----'], ['row', 219, 8, '----'],
      ['coins', 203, 5, 3], ['coins', 210, 9, 2], ['coins', 214, 4, 3], ['coins', 220, 6, 2],
      // Valve chamber: a wide approach and a six-tile shaft; only this opening leads onward.
      ['rect', 225, 0, 248, 1, 'X'], ['rect', 249, 0, 249, 13, 'X'],
      ['rect', 225, 10, 228, 13, 'X'], ['rect', 229, 8, 234, 13, 'X'], ['rect', 241, 8, 248, 13, 'X'],
      ['row', 226, 8, '---'], ['row', 231, 5, '----'], ['row', 244, 5, '----'],
      ['coins', 226, 6, 2], ['coins', 232, 3, 2], ['coins', 245, 3, 2], ['coins', 237, 11, 2],
      // ── ROOM 6: THE SMALL INTESTINE, an extended villi crossing followed by two more tricks. ACT 1 THE VILLI (250-291): the bile pool is crossed on
      // six springy fingers over twenty columns of bile; hold jump on the last ones for a big launch up to the high shelf (the third letter lives there).
      // ACT 2 THE TAPEWORM (292-315): a sleeping tapeworm lies across the bile and its rippling body is the bridge.
      // ACT 3 THE VALVES (316-334): two muscular gates that clench shut on a rhythm; the way down is the hole past them.
      ['rect', 250, 0, 250, 13, 'X'], ['rect', 332, 0, 334, 13, 'X'],
      ['rect', 251, 0, 258, 1, 'X'], ['rect', 266, 0, 331, 1, 'X'],              // the ceiling (the inlet from the mill is 259-265)
      ['rect', 251, 12, 265, 13, 'X'],                                           // the landing floor
      ['rect', 286, 11, 291, 13, 'X'],                                           // the checkpoint terrace after the villi
      ['rect', 284, 7, 286, 8, 'X'],                                             // the high shelf
      ['rect', 282, 2, 286, 3, 'X'],                                             // a lump of flesh hanging from the ceiling above it: the third letter is hidden inside
      ['rect', 316, 11, 328, 13, 'X'],                                           // the floor of the valve hall (the hole is 329-331)
      ['coins', 273, 8, 1], ['coins', 276, 6, 2], ['coins', 279, 7, 2],
      ['coins', 265, 9, 1], ['coins', 270, 6, 2], ['coins', 283, 5, 2], ['coins', 268, 8, 1],
      ['coins', 295, 8, 3], ['coins', 302, 7, 3], ['coins', 309, 8, 3],
      ['coins', 322, 8, 2], ['coins', 327, 9, 1],
      // ── ROOM 7: THE COLON, three screens, three tricks. ACT 1 THE FLORA (335-360): wide basins where bacteria multiply
      // until stomped, separated by a raised dung fold. ACT 2 THE UPDRAFT (361-387): plumes of gas rising from a sludge pool
      // that float you up across wide stepped shelves. ACT 3 THE TIDE (388-427): a muscle raft ferries you over the sludge lake.
      ['rect', 335, 0, 335, 13, 'X'], ['rect', 428, 0, 430, 13, 'X'],
      ['rect', 339, 0, 427, 1, 'X'],                                             // the ceiling (the inlet from the intestine is 336-338)
      ['rect', 336, 5, 340, 13, 'S'],                                            // the landing mound (checkpoint)
      ['rect', 341, 12, 360, 13, 'X'],                                           // act 1's floor
      ['rect', 349, 10, 353, 11, 'S'], ['rect', 350, 9, 352, 9, 'S'],            // stepped dung divide between the two flora basins
      ['power', 345, 8, 'pepper'],                                               // pepper block over the first basin
      ['rect', 361, 12, 365, 13, 'X'],                                           // act 2: the arrival ledge (checkpoint at 362)
      ['rect', 369, 8, 374, 9, 'S'],                                             // act 2: broad lower dung shelf, reached on the first plume
      ['rect', 378, 6, 383, 7, 'X'],                                             // broad upper shelf, reached on the second plume
      ['rect', 385, 12, 387, 13, 'X'],                                           // the landing floor before the near shore
      ['rect', 388, 11, 391, 13, 'S'],                                           // act 3: the near shore of the sludge lake
      ['rect', 423, 11, 424, 13, 'X'],                                           // the far shore (the hole is 425-427)
      ['coins', 344, 9, 2], ['coins', 350, 7, 3], ['coins', 356, 9, 2],
      ['coins', 366, 8, 2], ['coins', 371, 6, 2], ['coins', 375, 5, 2], ['coins', 380, 4, 3],
      ['coins', 395, 8, 2], ['coins', 403, 7, 2], ['coins', 411, 8, 2], ['coins', 419, 8, 2],
      // ── ROOM 8: THE CLOACA VAULT (431-518) ──
      // First 2 screens (431-480): heavily muscular terminal chamber packed with realistic brown digested fecal matter
      // and bubbling brown fecal sludge pools to signal we are near the exit.
      ['rect', 431, 0, 431, 13, 'X'],
      ['rect', 432, 0, 433, 1, 'X'], ['rect', 437, 0, 480, 1, 'X'],               // ceiling of the fecal passage (inlet from colon is 434-436)
      ['rect', 431, 10, 437, 13, 'S'],                                            // landing mound merges into the left wall (checkpoint at 435)
      ['rect', 438, 12, 441, 13, 'X'],
      ['rect', 442, 9, 445, 13, 'S'],                                             // tall coiled fecal pile
      ['rect', 448, 10, 449, 13, 'S'],                                            // fecal island in the first sludge pool (446-450)
      ['rect', 451, 11, 456, 13, 'S'],                                            // broad fecal bank
      ['rect', 457, 12, 462, 13, 'X'],
      ['rect', 459, 10, 461, 11, 'S'],                                            // stepped fecal heap
      ['rect', 465, 10, 466, 13, 'S'], ['rect', 468, 9, 469, 13, 'S'],            // fecal stepping mounds across second sludge pool (463-469)
      ['rect', 470, 11, 474, 13, 'S'], ['rect', 471, 9, 473, 10, 'S'],            // final fecal heap before the boss threshold
      ['rect', 475, 11, 480, 13, 'X'],                                            // muscular terrace before the vault (checkpoint at 477)
      ['power', 476, 7, 'rand'],                                                  // power-up block before Cloacolith
      ['coins', 439, 9, 2], ['coins', 443, 7, 2], ['coins', 448, 8, 2], ['coins', 453, 9, 2],
      ['coins', 460, 8, 2], ['coins', 465, 8, 2], ['coins', 468, 7, 2], ['coins', 472, 7, 2],
      // The approach (481-483): the roof comes down low, then opens out into the vault; the floor steps down to its floor
      ['rect', 481, 0, 483, 3, 'X'],
      ['rect', 481, 12, 482, 13, 'X'], ['rect', 483, 13, 483, 13, 'X'],
      // THE VAULT (484-518): a screen and a half, high roof, flat floor for his rolls, three bones to dodge on
      // (they crack under you like every bone in here, and grow back). The bones keep clear of both walls, so
      // the way down onto his battery is always open. Column 484 is the gate that clenches shut behind you;
      // 518 is the cloaca (it gives way in the flush).
      ['rect', 484, 0, 517, 0, 'X'],
      ['rect', 484, 13, 518, 13, 'X'],
      ['row', 492, 9, '---'], ['row', 498, 6, '-------'], ['row', 508, 9, '---'],
      ['rect', 518, 0, 518, 12, 'X'],
    ],
    entities: [
      ['gullet', 25, 49], ['papillae', 25, 49, 1, 12],
      // The deeper esophagus screens: the bend, then the litter well.
      ['gullet', 50, 74], ['papillae', 50, 74, 2, 10],
      ['gullet', 75, 99], ['papillae', 75, 99, 8, 12],
      ['bag', 89, 9, 'up'],   // the one bag, at the low opening, rising out of it
      ['parasite', 75.5, 1, 1, 'left'], ['parasite', 97.5, 1, -1, 'right'],
      // room 4: the stomach
      ['gullet', 100, 174, 'stomach'], ['acid', 156, 173, 12],
      ['flotsam', 158, 'seagrass'], ['flotsam', 162, 'crab'], ['flotsam', 166.5, 'conch'], ['flipflop', 171, 12],
      ['bag', 107, 4],
      // Encounters on each floor and fold; leave the landing and checkpoint terrace clear.
      ['blob', 105, 11], ['squatter', 115, 11], ['fluke', 121, 7],
      ['blob', 130, 11], ['squatter', 135, 11], ['fluke', 138, 2],
      ['squatter', 146, 11], ['bag', 144, 5],
      ['bag', 160, 5],
      ['parasite', 134, 11],
      // room 5: the pyloric mill
      ['gullet', 175, 249, 'pylorus'], ['sphincter', 235, 6, 8, 8, 220, 90, 90, 'h'], ['sphincter', 235, 6, 12, 12, 220, 90, 190, 'h'],
      ['hopper', 198, 10, -1, 180], ['hopper', 175, 10, 1, 0], ['hopper', 223, 10, -1, 140], ['hopper', 249, 7, -1, 160],   // (175 is a drain: the landing hall's stones roll into that hole in the far wall)
      // the gallery: more stones, from both sides of the low fold and the left wall, so the floor is never quiet
      ['hopper', 199, 10, 1, 210], ['hopper', 205, 10, -1, 190], ['hopper', 207, 10, 1, 150],
      // and the rubbish of the turtle's last meals, lying about (eye candy): a few in the gallery, and some pepper throughout the stage
      ['debris', 201, 11, 'jelly'], ['debris', 206, 10, 'bag'], ['debris', 210, 11, 'stones'], ['debris', 213, 11, 'urchin'], ['debris', 217, 11, 'crab'],
      ['debris', 221, 11, 'conch'], ['debris', 204, 7, 'grass'], ['debris', 215, 6, 'bag'], ['debris', 209, 2, 'grass', 1], ['debris', 221, 2, 'net', 1],
      ['debris', 32, 11, 'jelly'], ['debris', 42, 3, 'net', 1], ['debris', 53, 11, 'grass'], ['debris', 61, 11, 'clam'],
      ['debris', 70, 8, 'bag'], ['debris', 67, 3, 'net', 1], ['debris', 78, 9, 'grass'], ['debris', 86, 13, 'net'],
      // more pepper down the throat
      ['debris', 34, 3, 'stones'], ['debris', 39, 6, 'bag'], ['debris', 34, 9, 'clam'],
      ['debris', 63, 3, 'stones'], ['debris', 58, 6, 'clam'], ['debris', 61, 6, 'conch'], ['debris', 60, 11, 'crab'], ['debris', 66, 11, 'bag'],
      ['debris', 72, 11, 'urchin'], ['debris', 66, 8, 'clam'], ['debris', 56, 0, 'net', 1], ['debris', 60, 0, 'grass', 1],
      ['debris', 76, 9, 'bag'], ['debris', 97, 9, 'crab'], ['debris', 80, 11, 'stones'], ['debris', 82, 11, 'conch'], ['debris', 95, 11, 'sponge'],
      ['debris', 90, 3, 'clam'], ['debris', 84, 6, 'urchin'], ['debris', 94, 7, 'conch'], ['debris', 86, 10, 'crab'],
      ['debris', 80, 0, 'net', 1], ['debris', 86, 0, 'bag', 1], ['debris', 95, 0, 'grass', 1],
      ['debris', 103, 12, 'grass'], ['debris', 118, 11, 'conch'], ['debris', 127, 12, 'grass'], ['debris', 140, 12, 'stones'],
      ['debris', 153, 9, 'urchin'], ['debris', 125, 3, 'grass', 1], ['debris', 141, 2, 'net', 1], ['debris', 154, 2, 'net', 1],
      ['debris', 172, 2, 'bag', 1], ['debris', 180, 11, 'sponge'], ['debris', 190, 11, 'crab'], ['debris', 225, 10, 'jelly'],
      ['debris', 241, 8, 'net'], ['debris', 182, 2, 'grass', 1], ['debris', 194, 2, 'grass', 1], ['debris', 225, 2, 'grass', 1],
      ['debris', 242, 2, 'bag', 1], ['debris', 252, 12, 'conch'], ['debris', 262, 12, 'net'], ['debris', 285, 5, 'stones'],
      ['debris', 322, 11, 'conch'], ['debris', 258, 2, 'bag', 1], ['debris', 317, 2, 'grass', 1],
      
      
      ['parasite', 189, 6], ['parasite', 214, 5],
      // room 6: the small intestine
      ['gullet', 250, 334, 'ileum'],
      // a big heap of the turtle's leftovers piled up in the bottom left corner of the landing (scenery)
      ['heap', 251, 258, 12, 3],
      ['debris', 259, 12, 'conch'], ['debris', 260, 12, 'stones'],
      // act 1: the villi over the bile
      ['acid', 266, 285, 12, 'bile'],
      ['villus', 267, 10], ['villus', 270, 9], ['villus', 273, 10],
      ['villus', 276, 9], ['villus', 279, 10], ['villus', 283, 10],
      ['parasite', 254, 11], ['fluke', 256, 2], ['fluke', 268, 2],
      // act 2: the tapeworm over the bile
      ['acid', 292, 315, 12, 'bile'], ['tapeworm', 292, 11, 8],
      ['fluke', 298, 2], ['fluke', 305, 2], ['fluke', 311, 2],
      // act 3: the valves
      ['sphincter', 319, 2, 2, 10, 300, 130, 0], ['sphincter', 325, 2, 2, 10, 300, 130, 150],
      ['parasite', 317, 10], ['fluke', 327, 2],
      // the roof of the small intestine drips ink: purple beads that fall on him (sticky and dirty, never hurt), clear of the flukes
      ['inkdrip', 253, 2], ['inkdrip', 289, 2], ['inkdrip', 294, 2], ['inkdrip', 301, 2], ['inkdrip', 308, 2], ['inkdrip', 315, 2], ['inkdrip', 322, 2], ['inkdrip', 330, 2],
      // room 7: the colon
      ['gullet', 335, 430, 'colon'],
      // (the turtle's leftovers, sprinkled about)
      ['debris', 339, 5, 'jelly'], ['debris', 351, 9, 'stones'], ['debris', 364, 12, 'sponge'], ['debris', 386, 12, 'grass'],
      ['debris', 345, 2, 'net', 1], ['debris', 358, 2, 'grass', 1],
      ['debris', 372, 2, 'grass', 1], 
      
      // act 1: the flora (two wide basins separated by a stepped dung mound where a parasite patrols)
      ['bacillus', 346, 11], ['parasite', 351, 8], ['bacillus', 357, 11, -1], ['fluke', 356, 2],
      // act 2: the updraft. Plumes of gas rise out of the sludge: ride them up across wide stepped shelves
      ['acid', 366, 384, 12, 'sludge'], ['bubbles', 366, 12, 4, 2], ['bubbles', 375, 12, 3, 2],
      ['bacillus', 372, 7, -1], ['fluke', 379, 2], ['parasite', 381, 5, -1],
      // act 3: the tide over the sludge (well-spaced beats of spouts, ceiling colonies, and flukes)
      ['debris', 389, 11, 'jelly'], ['debris', 423, 11, 'crab'], ['debris', 406, 2, 'net', 1], ['debris', 414, 2, 'grass', 1], ['debris', 424, 2, 'bag', 1],
      ['acid', 392, 422, 12, 'sludge'], ['tide', 392, 417, 11, 6],
      // Clinging green colonies, flukes, and sludge geysers alternate cleanly across the voyage.
      ['ceilingbac', 395, 2], ['spout', 399, 2, 6, 260, 60, 0],
      ['fluke', 404, 2], ['spout', 408, 2, 5, 260, 60, 110],
      ['ceilingbac', 413, 2], ['spout', 417, 2, 6, 260, 60, 210],
      ['fluke', 420, 2],
      ['parasite', 389, 10],
      // room 8: the cloaca vault (2 screens of digested fecal matter, the approach, and Cloacolith's vault)
      ['gullet', 431, 518, 'cloaca'],
      ['acid', 446, 450, 12, 'sludge'], ['acid', 463, 469, 12, 'sludge'],
      ['feces', 436, 10, 'coil'], ['feces', 439, 12, 'mound'], ['feces', 443.5, 9, 'tall'],
      ['feces', 448.5, 10, 'coil'], ['feces', 452.5, 11, 'wide'], ['feces', 455, 11, 'coil'],
      ['feces', 458, 12, 'mound'], ['feces', 460, 10, 'tall'], ['feces', 465.5, 10, 'coil'],
      ['feces', 468.5, 9, 'mound'], ['feces', 472, 9, 'tall'], ['feces', 474, 11, 'wide'], ['feces', 479, 11, 'coil'],
      ['debris', 433, 10, 'grass'], ['debris', 434, 10, 'conch'], ['debris', 436, 10, 'clam'], ['debris', 437, 10, 'urchin'],
      ['debris', 439, 12, 'crab'], ['debris', 440, 12, 'conch'], ['debris', 441, 12, 'stones'],
      ['debris', 442, 9, 'sponge'], ['debris', 443, 9, 'bag'], ['debris', 444, 9, 'crab'], ['debris', 445, 9, 'net'],
      ['debris', 448, 10, 'conch'], ['debris', 449, 10, 'urchin'],
      ['debris', 451, 11, 'clam'], ['debris', 452, 11, 'grass'], ['debris', 454, 11, 'stones'], ['debris', 455, 11, 'crab'], ['debris', 456, 11, 'sponge'],
      ['debris', 458, 12, 'net'], ['debris', 459, 10, 'conch'], ['debris', 460, 10, 'urchin'], ['debris', 461, 10, 'bag'], ['debris', 462, 12, 'crab'],
      ['debris', 465, 10, 'stones'], ['debris', 466, 10, 'clam'], ['debris', 468, 9, 'grass'], ['debris', 469, 9, 'conch'],
      ['debris', 470, 11, 'sponge'], ['debris', 471, 9, 'crab'], ['debris', 472, 9, 'urchin'], ['debris', 473, 9, 'net'], ['debris', 474, 11, 'clam'],
      ['debris', 476, 11, 'stones'], ['debris', 478, 11, 'urchin'], ['debris', 479, 11, 'conch'],
      ['debris', 444, 2, 'bag', 1], ['debris', 457, 2, 'net', 1], ['debris', 473, 2, 'grass', 1],
      ['bacillus', 440, 11], ['parasite', 454, 10], ['fluke', 445, 2],
      ['bacillus', 460, 9], ['fluke', 466, 2], ['parasite', 476, 10],
      ['debris', 479, 11, 'net'], ['debris', 482, 12, 'bag'], ['debris', 482, 4, 'grass', 1],
      // the vault: its hoard, nerves and gate; Cloacolith asleep on his junk; the cloaca for a right wall
      ['vault', 484, 518],
      ['pickup', 501, 6, 'gale'],   // loose feather on the upper center platform
      ['cloacolith', 500, 12],
      ['cloacavent', 518],
    ],
    goal: { type: 'crystal', x: 515, finale: true },
  },
  {
    id: '4-1', name: 'GUMBO FEVER', theme: 'gumbo', music: 'gumbo', fever: true,
    // Three bowls of gumbo before bed (see the end of 3-4), and now he's dreaming he's IN it. A cast-iron fever dream:
    //  1. the kitchen bayou (0-100): hot roux to hop across, simmer bubbles to bounce on, okra slime (a slippy, speedy
    //     run-up for the long jump), sausage slices rolling about, the first steam vent
    //  2. the boiling stockpot (100-245): down into a giant pot. Cornbread rafts and steam geysers over a roux lake,
    //     crawdads guarding narrow perches (one strolls into a steam vent), a field of bubbles, okra spitters
    //  3. the chopping board (245-350): giant saw-edged cleavers chop down in rhythm (teeth top and bottom) -- a stuck
    //     blade is a wall; wait for it to lift and dash underneath. Each one is chopping a vegetable (juice flies); a row
    //     of them out of step; sausages rolling in get sliced
    //  4. the vapor flight (350-480): a roux basin with no end in sight. Ride the steam, dodge the
    //     onions' tear gas, bounce on the bubbles
    //  5. the master pot (480-570): the Holy Trinity (onion, celery, bell pepper) on perches over a broth that heaves
    //  6. the ladle (570-600): up its handle to the rim, where an alarm clock is ticking. Ring it, and he wakes up
    // the C, K, R eggs: in the shoulder of the first cornbread mesa, in a pocket in the high island over the bubble
    // field, and up inside the floating island in the vapor flight (a steam draft floats you up into it)
    skyWalls: [[429, 434]],   // (the R egg's island: its rock goes on up past the top of the screen; no climbing onto/into it from above)
    letters: [[70.5, 9.4], [183.5, 3.4], [431.5, 1.5]],
    secrets: [[70, 9, 71, 10], [183, 3, 184, 4], [431, 1, 432, 2, 3]],
    width: 600, start: 3, checkpoint: [96, 251, 351, 481],
    hint: 'HOT ROUX SCALDS - KEEP HOPPING',
    scalding: [490, 591],   // the master pot's roux is boiling broth: red, and it scalds on contact (no grace)
    signs: [[27, 'JUMP HIGHER', 'REMEMBER TO HOLD {JUMP} ON CERTAIN ITEMS TO JUMP MUCH HIGHER!']],   // (where the first simmer bubbles come up)
    map: [
      // ── 1. the kitchen bayou
      ['ground', 0, 14], ['row', 9, 8, 'B?M?B'],
      ['rect', 15, 12, 17, 13, 'Q'],
      ['ground', 18, 30], ['coins', 21, 9, 3],
      ['rect', 31, 12, 38, 13, 'Q'], ['coins', 32, 6, 2], ['coins', 36, 5, 2],   // (up where the bubbles bounce you)
      ['ground', 39, 50], ['coins', 41, 10, 3],
      ['rect', 51, 12, 60, 13, 'Q'], ['coins', 53, 7, 2], ['coins', 56, 6, 2], ['coins', 59, 7, 1],   // the long roux: a slimed run-up clears it
      ['ground', 61, 105],
      ['ground', 66, 71, 8], ['coins', 67, 6, 3],                    // a cornbread mesa (the C egg is in its shoulder)
      ['row', 76, 8, '?B?'],
      ['rect', 89, 5, 94, 6, 'X'], ['coins', 89, 4, 6],              // up where the steam goes
      // ── 2. the boiling stockpot
      ['ground', 106, 110, 9],
      ['rect', 111, 12, 114, 13, 'Q'],
      ['ground', 115, 118, 11],
      ['rect', 119, 12, 149, 13, 'Q'], ['coins', 121, 8, 3], ['coins', 130, 7, 4],
      ['rect', 140, 5, 145, 6, 'X'], ['coins', 140, 3, 6],           // high up: the crawdad's perch
      // three crawdad perches, six wide: room for a crawdad to patrol, and for him to pick his moment
      ['ground', 150, 155, 10], ['rect', 156, 12, 158, 13, 'Q'],
      ['ground', 159, 164, 9], ['rect', 165, 12, 167, 13, 'Q'],
      ['ground', 168, 173, 10],
      ['rect', 174, 12, 193, 13, 'Q'],                               // the bubble field
      ['rect', 179, 3, 184, 5, 'X'], ['coins', 179, 2, 4],           // the high island (the K egg is in its far end)
      ['coins', 175, 7, 2], ['coins', 176, 5, 2], ['coins', 187, 6, 2], ['coins', 191, 8, 2],
      ['ground', 194, 197, 10],
      ['rect', 198, 12, 208, 13, 'Q'], ['coins', 201, 8, 4],
      ['ground', 209, 212, 9],
      ['rect', 213, 12, 219, 13, 'Q'],
      ['ground', 220, 224, 11],
      ['rect', 225, 12, 243, 13, 'Q'],
      ['ground', 244, 245],                                          // the kitchen floor the pot stands on
      ['rect', 226, 5, 231, 6, 'X'], ['coins', 227, 3, 4],
      ['rect', 233, 6, 243, 7, 'X'], ['coins', 235, 5, 6],
      // ── 3. the chopping board: giant saw-edged cleavers chop down in rhythm. Wait for one to lift, and dash under it
      ['ground', 246, 258, 8], ['row', 247, 4, '?M?'], ['coins', 249, 6, 2],
      ['ground', 259, 345],                                          // the board, all the way along
      ['coins', 268, 11, 2], ['coins', 275, 11, 2], ['row', 268, 6, 'U'],   // (a 1-UP between the first two blades)
      ['coins', 285, 11, 2], ['coins', 292, 11, 2], ['coins', 299, 11, 2], ['coins', 306, 11, 2],   // (a pair in each safe spot between the blades)
      ['coins', 317, 9, 4], ['coins', 331, 11, 2], ['coins', 338, 11, 2],
      // ── 4. the vapor flight
      ['ground', 346, 350], ['ground', 351, 359, 10],
      ['rect', 360, 12, 469, 13, 'Q'],
      ['rect', 372, 8, 376, 9, 'X'], ['coins', 372, 7, 5],
      ['coins', 364, 3, 3], ['coins', 368, 1, 2],                    // (up the first draft)
      ['rect', 390, 6, 393, 7, 'X'], ['coins', 397, 1, 3],
      ['coins', 403, 5, 2], ['coins', 408, 4, 2],
      ['rect', 412, 9, 416, 10, 'X'],
      ['rect', 429, 0, 434, 2, 'X'],                                 // the floating island (the R egg is up inside it)
      ['coins', 422, 6, 3], ['coins', 436, 4, 3],
      ['rect', 438, 7, 441, 8, 'X'],
      ['coins', 447, 1, 3], ['coins', 453, 6, 2], ['coins', 459, 5, 2],
      ['rect', 452, 5, 455, 6, 'X'],
      ['ground', 470, 484, 9], ['row', 476, 5, '?M?'],
      // ── 5. the master pot
      ['ground', 485, 489],
      ['rect', 490, 12, 563, 13, 'Q'],                               // the cauldron's floor: roux (the broth heaves up out of it)
      ['row', 492, 8, '-----'], ['coins', 493, 6, 3],
      ['rect', 499, 7, 503, 8, 'X'],
      ['row', 506, 5, '----'], ['coins', 506, 3, 4],
      ['rect', 512, 8, 519, 9, 'X'],
      ['row', 520, 3, '----'], ['coins', 520, 1, 4],                 // (where the bell pepper's slam throws you)
      ['rect', 526, 6, 529, 7, 'X'],
      ['row', 533, 8, '----'], ['coins', 533, 6, 4],
      ['rect', 539, 8, 544, 9, 'X'],
      ['rect', 549, 8, 553, 9, 'X'],
      ['row', 556, 6, '----'], ['coins', 556, 4, 4],
      ['ground', 562, 567, 9],
      // ── 6. the ladle
      ['rect', 568, 12, 591, 13, 'Q'], ['coins', 571, 8, 2], ['coins', 574, 8, 2], ['coins', 584, 6, 2],
      ['ground', 592, 599, 5],                                       // the counter beside the pot, level with its straight rim
    ],
    entities: [
      // 1. the kitchen bayou
      ['andouilles', 20, 100, 200],                                 // sausages roll in from the right, one at a time
      ['simmer', 31, 38, 3, 70],
      ['slime', 44, 11, 3],
      ['okra', 56, 11],
      ['steam', 86, 3, 220, 0],
      // 2. the boiling stockpot
      ['vegslope', 99, 12, 106, 9],                                  // a heap of vegetables up to the pot's ledge
      ['stockpot', 106, 243, 6],
      ['spitter', 117, 10],
      ['raft', 121, 11, 3], ['steam', 126, 3, 240, 0], ['raft', 129, 11, 3, 3, 300], ['steam', 138, 2, 240, 0.5], ['raft', 143, 11, 3, 3, 260, 0.5],
      ['crawdad', 143, 4],
      ['crawdad', 152, 9], ['crawdad', 162, 8], ['crawdad', 169, 9], ['steam', 171, 4, 200, 0.3, 2, 9],   // (the third one strolls into the vent)
      ['simmer', 174, 193, 3, 55], ['okra', 176, 11], ['okra', 182, 11], ['okra', 187, 11, 2], ['okra', 191, 11],
      ['spitter', 196, 9], ['raft', 200, 11, 3, 5, 320], ['spitter', 211, 8],
      ['okra', 216, 11],
      ['steam', 222, 2, 180, 0, 2, 10], ['crawdad', 229, 4], ['crawdad', 240, 5],
      // 3. the chopping board
      ['board', 259, 345],
      ['cleaver', 264, 3, 2, 220, 0],                                // the first: a short blade, a slow chop (learn it)
      ['cleaver', 271, 3, 3, 200, 0.15], ['cleaver', 278, 3, 3, 200, 0.45],
      ['cleaver', 288, 3, 3, 200, 0], ['cleaver', 295, 3, 3, 200, 0.35], ['cleaver', 302, 3, 3, 200, 0.7],   // (a row out of step: pick your moments)
      ['andouilles', 313, 345, 230],
      ['celery', 309], ['celery', 314], ['celery', 320],   // (a little thicket of them between the blades)
      ['cleaver', 326, 3, 3, 170, 0], ['cleaver', 333, 3, 3, 170, 0.66], ['cleaver', 340, 3, 3, 170, 0.33],
      // 4. the vapor flight
      ['okra', 363, 11], ['steam', 366, 1],
      ['simmer', 378, 388, 3, 60], ['onion', 381, 2], ['okra', 383, 11],
      ['steam', 398, 1],
      ['okra', 402, 11], ['okra', 407, 11, 2],
      ['crawdad', 414, 8], ['onion', 420, 3],
      ['simmer', 418, 428, 2, 50], ['okra', 422, 11], ['okra', 427, 11, 1], ['okra', 434, 11],
      ['steam', 431, 2, 300],                                        // lift into the egg's hollow, then stop so he can drop out
      ['okra', 445, 11], ['steam', 447, 1],
      ['simmer', 448, 468, 3, 55], ['okra', 461, 11], ['onion', 458, 2],
      // 5. the master pot
      ['stockpot', 490, 591, 5, 5, 5, 0, 1],   // (no loose utensils in this one: the real ladle's at its far end; its side's a wall: hop up on the handle and over)
      ['surge', 490, 561, 12.25, 9.6, 420, 0],   // (at rest, its surface is the floor's: one liquid)
      ['onion', 498, 3], ['celery', 501, 6],
      ['pepper', 516, 7],
      ['onion', 531, 2],
      ['celery', 543, 7], ['pepper', 551, 7],
      // 6. the ladle
      ['dome', 569, 11], ['dome', 572, 11], ['dome', 575, 11],      // bubbles of roux to hop across to it
      ['ladle', 578, 11, 591, 5],
    ],
    goal: { type: 'alarm', x: 594, finale: true },
  },
  {
    id: '3-3', name: 'BAYOU BOOGIE', theme: 'bayou', music: 'bayou', band: true,
    // the C, K, R eggs: up where only a bass drum's BOOM throws you, high over the tuba valves (a valve's
    // kick), and down a soft spot in the island between the two staves
    letters: [[96, 3], [183, 1.6], [373.5, 11]],
    secrets: [[373, 11, 374, 11]],
    width: 470, start: 3, checkpoint: [104, 206, 288, 372],
    hint: 'EVERY PARADE NEEDS A BAND',
    catAt: 106,   // (the cat companion waits just past the checkpoint on the cliff top)
    // Firefly parade night on the bayou, and the band's asleep. Only the crickets keep time -- until
    // Chickaroo wakes RASCAL (drums), pops BIG LOU out of his own tuba, and coaxes DIZZY off the dock.
    // Every musician adds his part to the music, and the swamp plays along: drums that bounce you
    // sky-high, tuba valves pumping to the bass line, MAMA HUSH's silences (when only the rests are solid),
    // and the trumpet's tune turning into a bridge note by note. The band rides along on a shelf up in the
    // corner of the view; at the crowd they jump down for the closing musical number.
    rivers: [[17, 20, 12.4, 12.4], [37, 44, 12.4, 12.4], [67, 98, 12.4, 12.4], [164, 199, 12.4, 12.4], [220, 235, 12.4, 12.4],
      [244, 284, 12.4, 12.4], [308, 367, 12.4, 12.4], [377, 436, 12.4, 12.4]],
    map: [
      // ── moonrise dock: crickets, toads hopping in time, the first gator
      ['ground', 0, 16], ['row', 8, 9, '---'],
      ['ground', 21, 36], ['row', 24, 8, 'B?M?B'], ['coins', 29, 10, 3],
      ['ground', 45, 66], ['row', 51, 8, '?B?'], ['coins', 56, 9, 3],
      // ── RASCAL's drum line: drums standing in the swamp, then the cliff only a BOOM reaches
      ['coins', 70, 7, 2], ['coins', 79, 7, 2], ['coins', 88, 6, 2], ['coins', 93, 4, 2],
      ['ground', 99, 112, 4], ['coins', 102, 2, 4],
      ['ground', 113, 139], ['row', 117, 8, 'B?B?B'], ['power', 119, 8, 'rand'], ['coins', 124, 10, 3],
      // the drum ladder: snare up to the stump, bass up to the plateau
      ['ground', 134, 137, 8], ['ground', 140, 150, 3], ['coins', 143, 1, 5],
      // ── BIG LOU, and the tuba valves
      ['ground', 151, 163], ['row', 160, 8, '?'],
      ['coins', 167, 7, 2], ['coins', 173, 6, 2], ['coins', 179, 5, 2], ['coins', 185, 6, 2], ['coins', 191, 7, 2], ['coins', 196, 6, 2],
      ['ground', 200, 215, 5], ['coins', 204, 3, 4],
      // ── gator alley: two of them, head to head
      ['ground', 216, 219], ['coins', 222, 9, 3], ['coins', 231, 9, 3],
      // ── MAMA HUSH's stretch: valves when the band plays, rests when it doesn't
      ['ground', 236, 243], ['coins', 255, 8, 2], ['coins', 259, 7, 2], ['coins', 273, 7, 2], ['coins', 277, 6, 2], ['coins', 281, 7, 2],
      // ── DIZZY's dock, and the two staves
      ['ground', 285, 307], ['row', 291, 8, '?M?'], ['row', 297, 11, '----'],
      // Short landings divide the doubled score into low, high and descending phrases.
      ['row', 336, 9, '---'], ['row', 365, 7, '---'],
      ['row', 405, 8, '---'], ['row', 434, 10, '---'],
      ['coins', 341, 5, 2], ['coins', 352, 3, 2], ['coins', 362, 5, 2],
      ['coins', 411, 9, 2], ['coins', 422, 8, 2], ['coins', 432, 9, 2],
      ['ground', 368, 376, 11], ['coins', 369, 8, 3],
      // ── the big finish: the crowd, the levee, the bandstand
      ['ground', 437, 469], ['row', 441, 8, 'B?B'],
    ],
    entities: [
      ['bopper', 12], ['bopper', 31], ['crab', 34, 11, 'red'],
      ['gator', 38, 43],
      ['skeeter', 50, 4], ['bopper', 55],
      ['drum', 61, 10, 'bass'], ['bandmate', 61, 9, 'drums'],
      // the drum line, tuned to the song: bouncing in place on any of these is one bounce per beat at 118 BPM
      // (bass x0.82, snare x1.0: about 31 frames in the air either way); the last bass drum still BOOMs
      // you up onto the cliff (x1.2)
      ['drum', 68, 11, 'bass', 0.82], ['drum', 73, 10, 'snare', 1], ['drum', 77, 11, 'bass', 0.82], ['drum', 82, 9, 'snare', 1],
      ['drum', 86, 10, 'bass', 0.82], ['drum', 91, 8, 'snare', 1], ['drum', 95, 9, 'bass', 1.2],
      ['skeeter', 84, 2],   // (just the one over the drum line, well above the bounces)
      ['bopper', 118], ['crab', 122, 11, 'red'], ['bopper', 126], ['skeeter', 129, 3],
      ['drum', 131, 10, 'snare'], ['drum', 135, 6, 'bass'],
      ['bandmate', 156, 11, 'tuba'],
      ['valve', 165, 0], ['valve', 168, 1], ['valve', 171, 2], ['valve', 174, 3], ['valve', 177, 4], ['valve', 180, 5],
      ['valve', 183, 6], ['valve', 186, 7], ['valve', 189, 8], ['valve', 192, 9], ['valve', 195, 10],
      ['skeeter', 188, 2],
      ['gator', 221, 226], ['gator', 234, 229],
      ['hush', 237, 238, 285],   // (her shack stands on the bank at the start of her stretch, so you see it coming)
      ['sign', 240, 'NO MUSIC|NO DANCING|NO FUN', 3, 6, 'nopost'],   // (sitting on MAMA HUSH's roof, over her window)
      ['valve', 245, 0], ['valve', 248, 1], ['valve', 251, 2], ['rest', 255, 10], ['rest', 259, 9],
      ['valve', 263, 0], ['valve', 266, 1], ['valve', 269, 2], ['rest', 273, 9], ['rest', 277, 8], ['rest', 281, 9],
      ['skeeter', 258, 2],
      ['bopper', 289], ['crab', 294, 11, 'red'],
      ['bandmate', 300, 10, 'trumpet'],
      ['staff', 308, 29, 14, 11], ['staff', 338, 29, 11, 8],
      ['bopper', 370, 10],
      ['staff', 377, 29, 7, 10], ['staff', 407, 29, 7, 11.5],
      ['skeeter', 386, 2], ['skeeter', 398, 2],
      ['crowd', 448, 463], ['dance', 454.5, 448.375, 460.375],
    ],
    goal: { type: 'note', x: 460, finale: true },
  },
];
