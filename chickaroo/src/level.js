'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 7. LEVEL COMPILER — turns registry data into a tile grid
// ═══════════════════════════════════════════════════════════════════════════
class Level {
  constructor(def) {
    this.def = def;
    this.w = def.width;
    this.themeName = def.theme;
    this.theme = THEMES[def.theme];
    // rooms: stretches of the stage with their own look ([x0, x1, theme]).
    // The camera keeps to the room Chickaroo is in (Game.updateCamera), so it never shows two at once
    this.rooms = (def.rooms || []).map(([a, b, th]) => ({ a, b, th }));
    // tileThemes: stretches with their own tiles and decor ([x0, x1, theme]), the camera free to cross them (4-3's offices)
    const tileThemes = (def.tileThemes || []).map(([a, b, th]) => ({ a, b, th }));
    this.roomTheme = this.rooms.length || tileThemes.length ? Array.from({ length: this.w }, (_, x) => (this.rooms.find(r => x >= r.a && x <= r.b) || tileThemes.find(r => x >= r.a && x <= r.b) || { th: def.theme }).th) : null;
    this.tiles = new Uint8Array(this.w * ROWS);
    this.veil = new Uint8Array(this.w * ROWS);
    this.painted = new Uint8Array(this.w);       // columns an entity paints as one picture (3-4's gullet): no tiles or decor drawn there   // secret hollows: 1 + the index of the secret a fake-rock cell belongs to
    this.multi = new Map();
    this.powerKinds = new Map();   // power-up block kinds ('berry', 'ice', ..., 'rand'); unlisted = berry
    this.crumbles = new Map();
    this.seedTops = new Map(); this.stalks = []; this.leaves = new Map();   // beanstalks (see Game.updateStalks)
    this.water = def.water || null;
    this.bumps = [];
    this.skyGates = new Map();   // locked fair barriers continue above the tile grid
    // Roll once per attempt so crystals and their slate share a clue even when spawned separately.
    this.chimePuzzles = new Map();
    for (const [key, cfg] of Object.entries(def.chimes || {})) {
      if (!cfg.randomCounts) continue;
      const [min, max] = cfg.randomCounts;
      const crystals = def.entities.filter(e => e[0] === 'chime' && e[3] === key).sort((a, b) => a[1] - b[1]);
      // every crystal of the set gets its own count: no two the same (so the range must have enough numbers)
      const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const counts = new Map(crystals.map((e, i) => [e[1], pool[i % pool.length]]));
      // a fresh ring order every attempt (never just left to right); the slate gives the counts in that order,
      // and the crystal whose turn it is wakes up to show it's the one (Chime.active)
      const order = crystals.map(e => e[1]);
      do {
        for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      } while (order.length > 1 && order.every((c, i) => i === 0 || c > order[i - 1]));
      const clue = order.map(col => counts.get(col)).join(' ');
      this.chimePuzzles.set(key, { counts, order, clue });
    }
    for (const cmd of def.map) this.apply(cmd);
    for (const [c0, c1] of def.skyWalls || []) for (let c = c0; c <= c1; c++) this.skyGates.set(c, 0);   // floating islands whose rock continues up past the top of the screen: nobody can get above them
    // secret hollows (def.secrets): rock you can swim/walk right into. The cells look like ground (and
    // the rock around them is edged as if they were), but aren't solid; see Game.updateSecrets.
    this.secrets = (def.secrets || []).map(([c0, r0, c1, r1, cap = 0], k) => {
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { this.set(c, r, this.get(c,r)===T.SOLID?T.SOLID:T.GROUND); this.veil[r * this.w + c] = k + 1; }
      return { c0, r0, c1, r1, cap, rev: 0, found: false, faces: [] };
    });
    this.secretCaps = this.secrets.filter(s => s.cap > 0).map(s => ({ x: s.c0 * TILE, y: s.r0 * TILE, w: (s.c1 - s.c0 + 1) * TILE, h: s.cap }));
    // the faces of a hollow that show to open space: where its glint can catch the light
    for (const s of this.secrets) for (let r = s.r0; r <= s.r1; r++) for (let c = s.c0; c <= s.c1; c++) {
      for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!this.looksSolid(c + dc, r + dr)) s.faces.push({ c, r, dc, dr });
    }
    const g = def.goal;
    const walkOff = g.type === 'exit';
    this.exitOpen = !g.boss;
    if (walkOff && g.boss) this.skyGates.set(def.boss.right, 11);
    // the pedestal stands on whatever ground is under the goal (normally row 12, so the pedestal is row 11);
    // goalLift is how far above that usual spot it sits, in px (the goal art is drawn shifted by it)
    const prow = g.row != null ? g.row - 1 : Math.min(11, this.surfaceRow(g.x) - 1);   // (goal.row: stands on the ledge at that row instead)
    this.goalLift = (prow - 11) * TILE;
    if (!walkOff && !g.finale && g.type === 'crystal' && !g.boss) for (let i = -1; i <= 1; i++) this.set(g.x + i, prow, T.SOLID);
    else if (!walkOff && !g.finale && g.type !== 'crystal') for (let i = -1; i <= 1; i++) this.set(g.x + i, prow, T.PEDESTAL);   // drawn by drawPedestal
    this.goalY = g.y != null ? g.y : GOAL_Y[g.type] || 150;   // (goal.y: where its centre hangs, if not the usual spot)
    this.crystalOn = !walkOff && !g.boss && !g.finale;   // (exit and finale stages have no crystal)
    this.crystalX = g.x * TILE + 8;
    this.goalLine = walkOff ? this.w * TILE + 16 : (g.x - 1) * TILE;   // let his wings leave the screen too
    this.genDecor();
    this.hasSand = this.tiles.includes(T.QSAND);
    this.glassT = new Map();   // when each moonglass cell last switched (for the fade-in flash)
    this.glass = [];   // moonglass cells (2-4), switched on and off by the lamplight (Game.updateGlass)
    for (let i = 0; i < this.tiles.length; i++) if (this.tiles[i] === T.GLASS_OFF) this.glass.push(i);
    // every bit of pollen in the stage (loose puffs, star blocks, 8 per multi-pollen crate): the % complete counts against it
    this.pollenTotal = 0;
    this.pollenCells = [];
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i], n = t === T.COIN || t === T.QCOIN ? 1 : t === T.MULTI ? 8 : 0;
      this.pollenTotal += n;
      if (n) this.pollenCells.push(i);
    }
    this.pollenTotal += (def.entities || []).filter(e => e[0] === 'clay').length;   // (3-1's temple pots each hold one)
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
      case 'lava': { const [x0, x1, top = 13] = a; for (let x = x0; x <= x1; x++) for (let y = top; y <= 13; y++) this.set(x, y, T.LAVA); break; }
      case 'seed': { const [x, y, top = 2] = a; this.set(x, y, T.SEED); this.seedTops.set(y * this.w + x, top); break; }
      default: console.warn('CHICKAROO: unknown map command', op);
    }
  }
  // (the tiles are stored as they are drawn; with gravity flipped the game reads them through a mirror, row r <-> 13 - r)
  idx(x, y) { return y * this.w + x; }   // the storage index of the cell the game calls (x, y)
  set(x, y, t) {
    if (x >= 0 && x < this.w && y >= 0 && y < ROWS) {
      this.tiles[y * this.w + x] = t;
      if (this.groundImgs) this.groundImgs[y * this.w + x] = null;
      if (this.solidImgs) this.solidImgs[y * this.w + x] = null;
    }
  }
  get(x, y) { return x < 0 || x >= this.w || y < 0 || y >= ROWS ? 0 : this.tiles[y * this.w + x]; }
  solid(x, y) {
    if (x < 0) return true;
    if (x >= this.w) return this.def.goal.type !== 'exit' || !this.exitOpen;
    if (this.skyGates.has(x) && y <= this.skyGates.get(x)) return true;
    if (y < 0 || y >= ROWS) return false;
    const i = y * this.w + x;
    return SOLID[this.tiles[i]] === 1 && !this.veil[i];
  }
  // solid, or a secret hollow's fake rock: what the tile art edges against, so a hollow shows no seam
  looksSolid(x, y) { return this.solid(x, y) || (x >= 0 && x < this.w && y >= 0 && y < ROWS && this.veil[y * this.w + x] > 0); }
  secretAt(c, r) { const k = c >= 0 && c < this.w && r >= 0 && r < ROWS ? this.veil[r * this.w + c] : 0; return k ? this.secrets[k - 1] : null; }
  surfaceRow(x) { for (let y = 1; y < ROWS; y++) if (this.solid(x, y) && !this.solid(x, y - 1)) return y; return ROWS; }
  genDecor() {
    const rng = mulberry32(hashStr(this.def.id));
    const d = this.decor = [];
    for (let x = 1; x < this.w - 1; x++) {
      // dry stretches of a water level are tropical islands: palms and agaves, like an oasis
      const dry = this.water && (this.water.dry || []).some(z => x >= z[0] && x <= z[1]);
      const theme = dry ? 'desert' : this.roomTheme ? this.roomTheme[x] : this.themeName;
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
          // the starting grotto: a sandy cave, mostly bare rock -- a few swaying weeds, the odd coral
          // for colour, pebbles and shells in the sand
          const grotto = x <= 16 && y >= 5;
          if (r < (grotto ? 0.2 : 0.14)) d.push({ k: 'weed', x: x * TILE + Math.floor(rng() * 10), y: y * TILE, h: 10 + Math.floor(rng() * (grotto ? 14 : 22)), p: rng() * 6, c: rng() < 0.5 ? '#2f9a6a' : '#4cc28a' });
          else if (r < (grotto ? 0.28 : 0.22)) d.push({ k: 'coral', x: x * TILE + 4, y: y * TILE, c: ['#ff7a8a', '#ffa25a', '#c77dff'][Math.floor(rng() * 3)] });
          else if (r < (grotto ? 0.34 : 0.27)) d.push({ k: 'star', x: x * TILE + Math.floor(rng() * 10), y: y * TILE, c: rng() < 0.5 ? '#ff8a5a' : '#ffd166' });
          else if (grotto && r < 0.5) d.push({ k: 'shell', x: x * TILE + Math.floor(rng() * 10), y: y * TILE, f: rng() < 0.5 });
          if (grotto) continue;
        } else if (theme === 'sky') {
          if (r < 0.05) d.push({ k: 'ruin', x: x * TILE + 4, y: y * TILE, h: 34 + Math.floor(rng() * 26), broken: rng() < 0.45 });
          else if (r < 0.16) d.push({ k: 'flower', x: x * TILE + Math.floor(rng() * 10), y: y * TILE + 2, c: rng() < 0.5 ? '#fff1a8' : '#b4a2ff' });
        } else if (theme === 'eclipse') {
          if (r < 0.08) d.push({ k: 'crystal', x: x * TILE + Math.floor(rng() * 8) + 2, y: y * TILE, c: ['#c9b8ff', '#e8eeff', '#8f86d0'][Math.floor(rng() * 3)], p: rng() * 6, s: 1 });
          else if (r < 0.16) d.push({ k: 'rubble', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        } else if (theme === 'desert') {
          const zone = (this.def.zones || []).find(z => x >= z[0] && x <= z[1]), kind = dry ? 'oasis' : zone ? zone[2] : 'dunes';
          const px = x * TILE + Math.floor(rng() * 10);
          if (kind === 'temple') {
            if (r < 0.08) d.push({ k: 'brazier', x: x * TILE + 7, y: y * TILE, p: rng() * 6 });
            else if (r < 0.2) { rng(); rng(); }   // (the temple's pots are breakable now: ['clay', col] entities, dunes.js)
            else if (r < 0.28) d.push({ k: 'shards', x: px, y: y * TILE });
          } else if (kind === 'oasis') {
            if (r < 0.12 && this.get(x + 1, y) === T.GROUND && [1, 2, 3, 4, 5].every(k => !this.get(x, y - k) && !this.get(x + 1, y - k))) { d.push({ k: 'palm', x: x * TILE + 8, y: y * TILE, h: 40 + Math.floor(rng() * 22), lean: rng() < 0.5 ? -1 : 1, p: rng() * 6 }); x += 2; }
            else if (r < 0.3) d.push({ k: 'agave', x: px, y: y * TILE });
            else if (r < 0.42) d.push({ k: 'dgrass', x: px, y: y * TILE, c: '#8ab84a' });
          } else {
            if (r < 0.045 && this.get(x + 1, y) === T.GROUND) { d.push({ k: 'saguaro', x: x * TILE + 8, y: y * TILE, h: 20 + Math.floor(rng() * 16), a: rng(), b: rng() }); x += 2; }
            else if (r < 0.11) d.push({ k: 'barrel', x: px + 2, y: y * TILE, f: rng() < 0.6 });
            else if (r < 0.13) d.push({ k: 'skull', x: px, y: y * TILE, f: rng() < 0.5 ? 1 : -1 });
            else if (r < 0.25) d.push({ k: 'dgrass', x: px, y: y * TILE, c: '#c49a4a' });
            else if (r < 0.31) d.push({ k: 'pebble', x: px, y: y * TILE });
          }
        } else if (theme === 'jungle') {
          if ((this.def.rivers || []).some(rv => x >= rv[0] && x <= rv[1])) break;   // nothing grows in the riverbeds
          const px = x * TILE + Math.floor(rng() * 10);
          const ruins = (this.def.zones || []).some(z => z[2] === 'ruins' && x >= z[0] && x <= z[1]);
          if (ruins && r < 0.12) { d.push({ k: 'pillar', x: x * TILE + 8, y: y * TILE, h: 10 + Math.floor(rng() * 16) }); x += 2; }
          else if (r < 0.05 && this.get(x + 1, y) === T.GROUND && !this.get(x + 1, y - 1)) { d.push({ k: 'monstera', x: x * TILE + 8, y: y * TILE, s: rng(), f: rng() < 0.5 ? 1 : -1 }); x += 1; }
          else if (r < 0.13) d.push({ k: 'fern', x: px + 2, y: y * TILE, s: rng() });
          else if (r < 0.17) d.push({ k: 'bloom', x: px, y: y * TILE, c: ['#ff5d8f', '#ffb347', '#c77dff'][Math.floor(rng() * 3)] });
          else if (r < 0.2) d.push({ k: 'jshroom', x: px, y: y * TILE });
        } else if (theme === 'bayou') {
          if ((this.def.rivers || []).some(rv => x >= rv[0] && x <= rv[1])) break;
          const px = x * TILE + Math.floor(rng() * 10);
          if (r < 0.06 && !this.get(x, y - 2)) d.push({ k: 'lantern', x: x * TILE + 8, y: y * TILE, p: rng() * 6, c: ['#ffb84a', '#ff7a8a', '#9ae86a'][Math.floor(rng() * 3)] });
          else if (r < 0.16) d.push({ k: 'cattail', x: px, y: y * TILE, n: 2 + Math.floor(rng() * 3), p: rng() * 6 });
          else if (r < 0.22) d.push({ k: 'knee', x: px, y: y * TILE, h: 4 + Math.floor(rng() * 6) });
          else if (r < 0.3) d.push({ k: 'fern', x: px + 2, y: y * TILE, s: rng() * 0.6 });
          else if (r < 0.34) d.push({ k: 'jshroom', x: px, y: y * TILE });
        } else if (theme === 'gumbo') {
          const px = x * TILE + Math.floor(rng() * 10);
          if (r < 0.07 && !this.get(x, y - 2)) d.push({ k: 'gsteam', x: x * TILE + 8, y: y * TILE, p: rng() * 6 });
          else if (r < 0.16) d.push({ k: 'gsprig', x: px, y: y * TILE, f: rng() < 0.5 ? 1 : -1 });
          else if (r < 0.22) d.push({ k: 'gcorn', x: px, y: y * TILE });
          else if (r < 0.25) d.push({ k: 'gshrimp', x: px, y: y * TILE, f: rng() < 0.5 ? 1 : -1 });
        } else if (theme === 'gut') {
          const px = x * TILE + Math.floor(rng() * 10);
          if (r < 0.32) d.push({ k: 'villi', x: px, y: y * TILE, n: 2 + Math.floor(rng() * 3), p: rng() * 6 });
        } else if (theme === 'clock') {
          if (r < 0.05) d.push({ k: 'lamp', x: x * TILE + 6, y: y * TILE, p: rng() * 6 });
          else if (r < 0.12) d.push({ k: 'cog', x: x * TILE + 8, y: y * TILE, r: 4 + Math.floor(rng() * 3), s: rng() < 0.5 ? 1 : -1 });
        } else {
          if (r < 0.06) d.push({ k: 'torch', x: x * TILE + 6, y: y * TILE, p: rng() * 6 });
          else if (r < 0.14) d.push({ k: 'rubble', x: x * TILE + Math.floor(rng() * 10), y: y * TILE });
        }
        break;
      }
      if (theme === 'ocean' && x <= 15) {
        for (let y = 1; y < ROWS - 1; y++) {
          if (this.get(x, y) !== T.GROUND || this.get(x, y + 1) !== T.EMPTY) continue;
          // the grotto roof drips with sandstone; just now and then a tuft of coral clings on
          const r = rng();
          if (r < 0.3) d.push({ k: 'sandtite', x: x * TILE + 3 + Math.floor(rng() * 9), y: (y + 1) * TILE, len: 4 + Math.floor(rng() * 7) });
          else if (r < 0.37) d.push({ k: 'hangcoral', x: x * TILE + 4, y: (y + 1) * TILE, c: ['#ff7a8a', '#ffa25a', '#c77dff'][Math.floor(rng() * 3)] });
        }
      }
      if (theme === 'jungle') {
        for (let y = 1; y < ROWS - 1; y++) {
          if (!this.solid(x, y) || this.get(x, y + 1) !== T.EMPTY || !this.solid(x, y - 1)) continue;
          if (rng() < 0.7) d.push({ k: 'roots', x: x * TILE + 2 + Math.floor(rng() * 3), y: (y + 1) * TILE, n: [0, 1, 2].map(() => 3 + Math.floor(rng() * 9)), p: rng() * 6 });
        }
      }
      if (this.def.ceiling && rng() < 0.45) {
        const sx = x * TILE + Math.floor(rng() * 10) + 2;
        if (rng() < 0.3) d.push({ k: 'hangcrystal', x: sx, y: caveCeilingH(sx), len: 6 + Math.floor(rng() * 8), c: ['#5ef2ff', '#ff7ad9', '#a58bff'][Math.floor(rng() * 3)], p: rng() * 6 });
        else d.push({ k: 'stalactite', x: sx, y: caveCeilingH(sx) - 1, len: 5 + Math.floor(rng() * 14) });
      }
    }
    // Give every snow pine a full tile of footing on both sides. Keep its original patch of
    // ground, moving edge trees inward; very narrow shelves are better left bare.
    const pines = [];
    this.decor = d.filter(tree => {
      if (tree.k !== 'pine') return true;
      const row = tree.y / TILE, col = Math.floor(tree.x / TILE);
      const surface = c => this.get(c, row) === T.GROUND && this.get(c, row - 1) === T.EMPTY;
      let left = col, right = col;
      while (left > 0 && surface(left - 1)) left--;
      while (right < this.w - 1 && surface(right + 1)) right++;
      const lo = left * TILE + TILE, hi = (right + 1) * TILE - TILE;
      if (lo > hi) return false;
      tree.x = clamp(tree.x, lo, hi);
      if (pines.some(p => p.y === tree.y && Math.abs(p.x - tree.x) < 24)) return false;
      pines.push(tree);
      return true;
    });
  }
}

