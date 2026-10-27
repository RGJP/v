'use strict';
// The game's shared sprites, painted fine (hires.js; meadow-art.js's painter mArt: shapes in game pixels, filled in art
// pixels, shaded in clean bands lit from the upper left, one ink line round each). Same sizes and anchors as the old
// pixel maps they replace (sprites.js), so everything that draws them is unchanged. Called once from buildSprites().

const FS = {
  red: ['#5a0610', '#a0101c', '#e01e28', '#ff4a44', '#ff9a90'],
  redB: ['#7a1410', '#c02a18', '#ff4a2a', '#ff7a5a', '#ffc0a0'],
  pink: ['#8a1a4a', '#c23a78', '#ff6aa8', '#ff9ac4', '#ffd4e6'],
  ice: ['#1a5a9a', '#3aa7e8', '#9be8ff', '#d4f6ff', '#ffffff'],
  wood: ['#4a2a12', '#6a4224', '#8a5a32', '#c98a4a', '#e8b47c'],
  gold: ['#7a4a08', '#c8891e', '#ffd166', '#ffe9a0', '#fffbe0'],
  purple: ['#1e0e50', '#3a1c80', '#5a2fb8', '#8f6bff', '#c4b0ff'],
  steel: ['#3a3650', '#6f6a88', '#a9a4bd', '#e2deef', '#ffffff'],
  leaf: ['#1a6a34', '#2f9a49', '#4cd17a', '#9ae8a8', '#d8ffe4'],
  feather: ['#9ab8b0', '#c8e0d8', '#eef8f2', '#ffffff', '#ffffff'],
  cap: ['#2a1060', '#46227f', '#7c46c0', '#a46ae8', '#d0a8ff'],
  stalk: ['#5a6a3a', '#8ea062', '#b8cc8a', '#d9e8b0', '#f4ffd8'],
  shell: ['#1e2660', '#3f4a8f', '#5a68b8', '#7d8bd6', '#b9c3f2'],
  bat: ['#2a1470', '#5233c4', '#7050e8', '#8a6bff', '#c0aaff'],
};

// ── Power-ups: polished materials, fine silhouettes and details painted at ART_R. ──
function finePepper(hot) {
  const A = mArt(16, 15), C = hot ? ['#8b2118','#c93a1d','#f66b29','#ffac58','#ffe1a0'] : ['#660f25','#a92034','#e64042','#ff7968','#ffc3a0'];
  A.fill(0.6, 3, 13.8, 14.7, (x,y) => {
    const t = clamp((y-3.6)/10.5,0,1), mid = 9.5 - 7.3*t*t, r = 3.4*Math.sin(Math.PI*(0.2+t*0.8)) + 0.15;
    const u = (x-mid)/r;
    return Math.abs(u) > 1 || y < 3.8 || y > 14.2 ? null : softTone(C, -u*0.65 - (y-8)*0.04 + Math.sqrt(1-u*u)*0.65);
  });
  A.ell(7.8,6.1,0.55,1.4,'#ffdebc',null,0.35);
  A.ell(6.9,8.5,0.35,0.6,'#ffaf96');
  for (const [x,y,r] of [[8.1,4,2.1],[10.3,3.8,1.8],[11.3,4.4,1.1]]) A.soft(x,y,r,0.65,FS.leaf,null,-0.3);
  A.line(9.6,3.4,10.8,1.2,'#23653b',null,1.1);A.line(10.8,1.2,12,1.3,'#23653b',null,0.8);
  A.line(9.5,3.1,10.5,1.4,'#a9df8d',null,0.34);
  return A.outline().canvas();
}
function fineHeartItem() {
  const A=mArt(16,16), C=FS.pink;
  A.fill(1,1,15,15,(x,y)=>{
    const u=(x-8)/6.8,v=-(y-7.2)/6;
    return (u*u+v*v-1)**3-u*u*v*v*v<=0 ? softTone(C,-u*0.55+v*0.7):null;
  });
  A.ell(4.6,4.1,1.2,0.65,'#fff0f3',null,-0.5);
  return A.outline().canvas();
}
function fineBerryItem() {
  const A=mArt(16,16), C=['#6e152c','#a72b42','#e44858','#fa7b85','#ffc6bd'];
  A.fill(1,4,15,15.5,(x,y)=>{
    const v=(y-5)/10, r=6*Math.sqrt(Math.max(0,1-v))*Math.min(1,(y-3)*0.55),u=(x-8)/Math.max(0.1,r);
    return Math.abs(u)>1||v<0||v>1 ? null:softTone(C,-u*0.6-v*0.3+Math.sqrt(1-u*u)*0.7);
  });
  for(const [x,y] of [[4.3,7],[7.9,7.5],[11.5,7],[5.5,9.7],[10,10],[7.8,12.4]]) {
    A.ell(x,y,0.45,0.65,'#80263b');A.ell(x-0.1,y-0.15,0.24,0.4,'#ffe3a1');
  }
  for(const [x,y,rot] of [[4.7,4.9,-0.4],[7,4,-1],[10,4.3,0.5],[11.7,5.5,0.2]]) A.soft(x,y,2.4,0.8,FS.leaf,null,rot);
  A.line(8,4,8.8,1.3,'#327848',null,0.8);A.ell(4,7.8,0.35,0.9,'#ffe1ce',null,-0.1);
  return A.outline().canvas();
}
let APPLE_ART=null;
function fineAppleItem() {
  if(APPLE_ART)return APPLE_ART;
  const A=mArt(18,18), C=['#75162c','#ab253a','#df3a43','#f97367','#ffc0a0'];
  A.fill(1,4,17,17.5,(x,y)=>{
    const dx=x-9,dy=y-10.3, r=6.8-0.08*Math.max(0,dy),d=dx*dx/(r*r)+dy*dy/39;
    if(d>1||y<5.2+Math.exp(-dx*dx)*0.9)return null;
    return softTone(C,-dx*0.075-dy*0.08+(1-d)*0.65);
  });
  A.line(9,5.9,9.8,1.7,'#65432b',null,1);A.line(9,5.3,9.4,2,'#c69a61',null,0.34);
  A.soft(12.2,3.3,2.7,1.15,FS.leaf,null,-0.4);A.line(10.1,4,13.8,2.9,'#bcdf98',null,0.34);
  A.ell(5.1,8.2,0.7,1.55,'#ffe6ce',null,0.4);A.ell(10.9,14.5,1.4,0.55,'#ed986a');
  APPLE_ART=A.outline().canvas();return APPLE_ART;
}
// A tiny heart drawn at its final companion-marker size, so the notch and lobes stay clear.
let CAT_HEART_ART=null;
function catHeartArt(){
  if(CAT_HEART_ART)return CAT_HEART_ART;
  const A=mArt(9,9),pts=[],curves=[
    [[4.5,2.5],[3.5,.2],[.6,.6],[.7,3]],
    [[.7,3],[.7,4.8],[2.7,6.2],[4.5,8]],
    [[4.5,8],[6.3,6.2],[8.3,4.8],[8.3,3]],
    [[8.3,3],[8.4,.6],[5.5,.2],[4.5,2.5]],
  ];
  for(const c of curves)for(let i=0;i<12;i++){const t=i/12,u=1-t;pts.push([0,1].map(k=>u*u*u*c[0][k]+3*u*u*t*c[1][k]+3*u*t*t*c[2][k]+t*t*t*c[3][k]));}
  A.poly(pts,'#f48fa5');
  A.fill(0,0,9,9,(x,y)=>softTone(['#cf527c','#e97896','#f99fb4','#ffc5cf','#ffe1e5'],1.3-x*.09-y*.17),true);
  A.outline('#8b3e60',1);
  A.ell(2.4,2.15,1,.5,'#fff4f1',null,-.4);A.ell(6.1,2,.4,.3,'#ffd9df');
  return CAT_HEART_ART=A.canvas();
}
function fineIceWand() {
  const A=mArt(16,15);
  A.line(2.4,13.5,8.8,7.2,'#253d62',null,1.6);A.line(2.3,13.1,8.5,7,'#7eb4cb',null,0.65);
  for(let i=0;i<3;i++) A.line(3.1+i*1.25,12.8-i*1.25,4+i*1.25,13.2-i*1.25,'#d8be76',null,0.4);
  A.poly([[9.8,1],[13.9,4.5],[12.1,8],[8,8.8],[6.7,4.7]],'#7edaf2');
  A.poly([[9.8,1],[10.2,5.2],[6.7,4.7]],'#f3fdff');
  A.poly([[9.8,1],[13.9,4.5],[10.2,5.2]],'#c9f8ff');
  A.poly([[10.2,5.2],[13.9,4.5],[12.1,8],[9.2,7.2]],'#3f9ed0');
  A.poly([[6.7,4.7],[10.2,5.2],[9.2,7.2],[8,8.8]],'#b8eff8');
  A.line(7.5,8.8,10.5,7.6,'#b88b35',null,1);A.line(7.4,8.5,10.1,7.5,'#fff1b4',null,0.34);
  A.outline();A.line(9.5,2.2,8.3,4.2,'#ffffff',null,0.34);
  return A.canvas();
}
function fineFeather() {
  const A=mArt(16,15), C=['#347f72','#77bca2','#c4e9cb','#edf8df','#ffffff'];
  A.fill(1,0.7,15,14.4,(x,y)=>{
    const u=(x+y-15.1)/Math.SQRT2,v=(y-x+11.5)/Math.SQRT2;
    const w=2.5*Math.sin(clamp(v/16,0,1)*Math.PI)**0.7;
    return v<0||v>15.5||Math.abs(u)>w ? null:softTone(C,-u*0.5+0.3+Math.sin(v*0.8)*0.08);
  });
  for(let i=0;i<9;i++) {
    const x=12.8-i*0.95,y=2+i*1.05;
    A.line(x,y,x+1.7,y-0.2,'#a2d4b5',null,0.34);A.line(x,y,x-0.6,y-1.5,'#daeecf',null,0.34);
  }
  A.line(13.2,1.5,1.8,13.7,'#4c9b7c',null,0.55);A.line(12.6,1.8,2.1,13.5,'#f4f8d6',null,0.34);
  return A.outline().canvas();
}
function fineVoltOrb() {
  const A=mArt(16,14), C=['#26174b','#483080','#7853b3','#ae8fe1','#e0cbfa'];
  A.soft(8,7,6.3,5.8,C);
  A.ell(8,7,5.15,4.7,'#5e4197');A.soft(7.7,6.6,4.9,4.5,C);
  A.poly([[9.2,2.5],[5.2,7.6],[7.6,7.6],[6.3,11.5],[11.1,5.7],[8.7,5.7]],'#f8d66d');
  A.line(8.7,3.5,6.3,6.9,'#fff9ca',null,0.45);
  A.ell(4.4,4.1,1.05,0.55,'#f9eaff',null,-0.6);A.ell(11.8,9.9,0.4,0.8,'#af9ddd',null,0.5);
  A.outline();return A.canvas();
}
let POWER_MALLET_HEAD=null;
function powerMalletHeadArt() {
  if(POWER_MALLET_HEAD)return POWER_MALLET_HEAD;
  const A=mArt(16,11);
  A.poly([[1,2.5],[3,1],[12.7,1],[15,2.5],[15,8.2],[12.7,10],[3,10],[1,8.2]],'#667285');
  A.poly([[1,2.5],[3,1],[12.7,1],[15,2.5],[12.7,3.4],[3,3.4]],'#d8e4e9');
  A.poly([[3,3.4],[12.7,3.4],[12.7,8],[3,8]],'#a6b7c5');
  A.poly([[3,8],[12.7,8],[15,8.2],[12.7,10],[3,10],[1,8.2]],'#48566d');
  A.soft(2.5,5.4,1.3,3.4,FS.steel);A.soft(13.3,5.4,1.1,3.4,FS.steel);
  A.poly([[7,1],[9,1],[9,10],[7,10]],'#ba853b');
  A.poly([[7,1],[8.4,1],[8.4,9.6],[7,9.6]],'#efc56e');A.line(7.1,1.7,7.1,8.5,'#fff0b7',null,0.34);
  for(const x of [4.5,11]) A.ell(x,5.4,0.45,0.45,'#596d82');
  A.line(3.6,2.1,5.8,2.1,'#ffffff',null,0.34);
  POWER_MALLET_HEAD=A.outline().canvas();return POWER_MALLET_HEAD;
}
function fineMallet() {
  const img=makeHiCanvas(16,16),g=img.getContext('2d');
  fLine(g,8,8,8,15,INK,8);fLine(g,8,8,8,15,'#805130',4);fLine(g,7.7,9,7.7,15,'#d3a264',1);
  g.drawImage(powerMalletHeadArt(),0,0);return img;
}

// ── the glowshroom (every world past the meadow's walking foe): a toxic purple cap with glowing lime blotches over a
//    pale stalk with a grumpy face; two walk steps, and squashed flat ──
function fineShroom(step) {
  const A = mArt(18, 20), C = FS.cap, B = FS.stalk;
  for (const [fx, lift] of step ? [[5, 0.5], [13, 0]] : [[5.6, 0], [12.4, 0.5]]) A.ell(fx, 19 - lift, 1.9, 1.05, '#2e2250');
  A.shade(9, 13, 5.6, 4.6, B);                                          // the stalk
  A.shade(9, 5.4, 8.6, 4.6, C); A.fill(0, 8, 18, 9.6, () => C[0], C);    // the cap and its dark rim
  A.fill(0, 9, 18, 9.8, () => '#3a2a4a', B);                              // the gills' shadow on the stalk
  for (const [x, y, r] of [[5.4, 3.6, 1.7], [12.3, 4.4, 1.5], [3.4, 6.6, 1.1], [9.2, 2.4, 1], [14.7, 6.6, 1]]) { A.ell(x, y, r, r * 0.8, '#b6ff6a', C); A.ell(x - r * 0.25, y - r * 0.25, r * 0.45, r * 0.35, '#efffc0', ['#b6ff6a']); }
  A.outline();
  for (const s of [-1, 1]) {   // the face: knitted brows over beady eyes, a frown, a cheek
    const ex = 9 + s * 2.5;
    A.ell(ex, 12.4, 1.15, 1.25, '#ffffff'); A.ell(ex - s * 0.3, 12.6, 0.6, 0.8, INK);
    A.line(ex + s * 1.5, 10.6, ex - s * 1, 11.4, '#3a2a4a', null, 0.8);
    A.ell(9 + s * 4, 14, 0.8, 0.45, '#8fd060');
  }
  A.line(7.8, 15.6, 8.4, 15.1, INK); A.line(8.4, 15.1, 9.6, 15.1, INK); A.line(9.6, 15.1, 10.2, 15.6, INK);
  return A.canvas();
}
function fineShroomFlat() {
  const A = mArt(18, 10), C = FS.cap, B = FS.stalk;
  A.shade(9, 7, 6, 2.4, B); A.shade(9, 4, 8.8, 2.6, C);
  for (const [x, r] of [[5, 1.3], [12, 1.2]]) A.ell(x, 3.4, r, r * 0.6, '#b6ff6a', C);
  A.outline();
  for (const s of [-1, 1]) { const ex = 9 + s * 2.6; A.line(ex - 1, 6.6, ex + 1, 7.8, INK); A.line(ex - 1, 7.8, ex + 1, 6.6, INK); }
  return A.canvas();
}

// ── the shell walker (Shellback in the other worlds): a blue domed shell banded in plates, a red skirt, a little orange
//    head poking out in front (facing right); and its shell, kicked spinning ──
function fineShellback(step) {
  const A = mArt(16, 16), S = FS.shell;
  for (let i = 0; i < 6; i++) { const x = 3 + i * 1.9 + (step && i % 2 ? 0.6 : 0); A.line(x, 12.6, x - 0.4 + (i % 2 ^ step ? 0.6 : 0), 14.6, '#3a2a5a', null, 0.8); }   // legs
  A.ell(13.6, 8.6, 2.1, 2, '#ffb36b'); A.ell(13.2, 8.1, 1.2, 1, '#ffd8a8', ['#ffb36b']);   // head
  A.shade(7, 8, 6.8, 5.4, S); A.fill(0, 10, 15, 13, (x, y) => y > 9.8 ? '#e9e1ff' : null, S);   // the dome
  A.fill(0, 10, 15, 12.4, (x, y) => y > 10 && y < 12 ? '#ff5d73' : null, ['#e9e1ff']);        // its red skirt
  for (const x of [3.4, 7, 10.6]) A.line(x, 3.6, x + 0.3, 9.6, S[1], S, 0.5);                   // the plates
  A.ell(4.4, 4.8, 1.6, 0.9, S[4], S, -0.5);
  A.outline();
  A.ell(14.2, 8.2, 0.55, 0.7, INK); A.px(14.3, 7.6, '#ffffff', [INK]);
  return A.canvas();
}
function fineShell(spin) {
  const A = mArt(16, 10), S = FS.shell;
  A.shade(8, 5.6, 7.4, 4.6, S); A.fill(0, 8, 16, 10, (x, y) => y > 8.6 ? S[0] : null, S);
  for (const x of spin ? [2.4, 6, 9.6, 13.2] : [4.2, 7.8, 11.4]) A.line(x, 1.8, x + (spin ? 0.6 : -0.3), 8.4, S[1], S, 0.6);
  A.ell(4.6, 2.8, 1.8, 0.8, S[4], S, -0.4);
  return A.outline().canvas();
}

// ── the bat (Flutter): purple, round, big pointed wings (up, then down), little fangs and red eyes ──
function fineBat(up) {
  const A = mArt(16, 12), V = FS.bat;
  const wing = s => up
    ? [[8, 5.5], [8 + s * 3, 3.6], [8 + s * 5, 1.2], [8 + s * 7.6, 0.4], [8 + s * 7.8, 4.6], [8 + s * 6.6, 5.6], [8 + s * 5.4, 4.8], [8 + s * 4.4, 6.6]]
    : [[8, 5], [8 + s * 3.6, 4], [8 + s * 6.6, 5.8], [8 + s * 7.8, 9.6], [8 + s * 6.2, 8.4], [8 + s * 5, 9.4], [8 + s * 3.8, 7.6]];
  for (const s of [-1, 1]) { A.poly(wing(s), V[1]); A.poly(wing(s).map(([x, y]) => [8 + (x - 8) * 0.8, y + 0.4]), V[2], [V[1]]); }
  A.shade(8, 6, 3.6, 3.4, V);
  A.poly([[5.6, 3.6], [6.2, 1], [7.4, 3]], V[2]); A.poly([[10.4, 3.6], [9.8, 1], [8.6, 3]], V[2]);   // ears
  A.outline();
  for (const s of [-1, 1]) { A.ell(8 + s * 1.3, 5.4, 0.7, 0.75, '#ffffff'); A.ell(8 + s * 1.2, 5.5, 0.4, 0.5, '#ff4d6d'); }
  A.line(7.4, 7.6, 7.4, 8.4, '#ffffff', null, 0.5); A.line(8.6, 7.6, 8.6, 8.4, '#ffffff', null, 0.5);
  return A.canvas();
}

// ── the cave bat (Flutter, hanging kind), painted fine and baked once: facing right (drawn flipped for left), eight
//    frames of the wingbeat (the tips sweep from high over the back, out level, down below the body), and hanging
//    upside down wrapped in its wings (eyes open, or shut for SleepBat). Anchor: the body's middle at (BAT_AX, BAT_AY) ──
const BAT_W = 34, BAT_H = 26, BAT_AX = 17, BAT_AY = 10, BAT_FRAMES = 8;
const BAT_FUR = ['#2e1c18', '#4a3026', '#6a4a3a', '#8a6a52', '#b08c6c'];
const BAT_EAR = ['#7a4448', '#a85e60', '#c88078', '#e8a898', '#ffd0c0'];
let BAT_ART = null;
function batArt() {
  if (BAT_ART) return BAT_ART;
  const X = BAT_AX, Y = BAT_AY;
  const head = (A, hx, hy, down, eyes) => {   // ears (pointing up, or down when hanging), the round head, a pug snout
    const e = down ? -1 : 1;
    for (const [bx, tx, ix] of [[-1.9, -1.7, -0.2], [2.3, 1.6, 0.6]]) {
      A.poly([[hx + bx, hy - e * 1.1], [hx + tx, hy - e * 5.6], [hx + ix, hy - e * 2.2]], BAT_FUR[2]);
      A.poly([[hx + bx * 0.7 + ix * 0.3, hy - e * 1.6], [hx + tx * 0.95, hy - e * 4.7], [hx + ix * 0.8 + bx * 0.2, hy - e * 2.4]], BAT_EAR[3]);
    }
    A.soft(hx, hy, 3, 2.8, BAT_FUR);
    if (!down) A.soft(hx + 2.1, hy + 0.7, 1.25, 0.95, ['#8a5a50', '#a87068', '#c88a80', '#e0a898', '#f4c4b4']);
    else A.soft(hx, hy + 2.2, 1, 0.9, ['#8a5a50', '#a87068', '#c88a80', '#e0a898', '#f4c4b4']);
  };
  const face = (A, hx, hy, down, eyes) => {   // after the outline: eyes (glinting red, or shut), a fang, a nostril
    const pts = down ? [[hx - 1.1, hy + 0.4], [hx + 1.1, hy + 0.4]] : [[hx + 0.9, hy - 0.5]];
    for (const [ex, ey] of pts) {
      if (eyes === 'shut') A.fill(ex - 0.9, ey - 0.6, ex + 0.9, ey + 0.6, (x, y) => Math.abs(x - ex) < 0.75 && Math.abs(y - (ey + (down ? -1 : 1) * ((x - ex) ** 2 * 0.6 - 0.15))) < 0.22 ? '#140a10' : null);
      else { A.ell(ex, ey, 0.85, 0.95, '#140a10'); A.ell(ex + 0.1, ey + 0.15, 0.5, 0.58, '#e8203c'); A.ell(ex - 0.25, ey - 0.35, 0.2, 0.2, '#ffffff'); }
    }
    if (!down) { A.poly([[hx + 1.5, hy + 1.5], [hx + 2.2, hy + 1.5], [hx + 1.8, hy + 2.5]], '#ffffff'); A.ell(hx + 3, hy + 0.4, 0.22, 0.22, '#5a2a30'); }
  };
  const flight = k => {
    const A = mArt(BAT_W, BAT_H), ph = Math.sin(k / BAT_FRAMES * Math.PI * 2), T = -ph * 7, e = -ph * 3;
    for (const sd of [-1, 1]) {   // the far wing (left, behind) then the near one
      const wr = [X + sd * 4.4, Y - 1 + e], tips = [[X + sd * 16, Y + T - 1], [X + sd * 15, Y + T + 4], [X + sd * 12, Y + T + 8]];
      const root = [X + sd * 1.8, Y + 3.4], sh = [X + sd * 1.6, Y - 2];
      const dip = (a, b, u) => [(a[0] + b[0]) / 2 + (wr[0] - (a[0] + b[0]) / 2) * u, (a[1] + b[1]) / 2 + (wr[1] - (a[1] + b[1]) / 2) * u];   // the scallops between the fingers
      const mem = [sh, wr, tips[0], dip(tips[0], tips[1], 0.16), tips[1], dip(tips[1], tips[2], 0.18), tips[2], dip(tips[2], root, 0.14), root];
      const far = sd < 0, MD = far ? '#2a1a26' : '#3c2634', ML = far ? '#5a3c4c' : '#7a5262';
      A.poly(mem, MD);
      A.fill(X - 17, 0, X + 17, BAT_H, (x, y) => lerpColor(ML, MD, clamp(Math.hypot(x - wr[0], y - wr[1]) / 11, 0, 1) * 0.8 + 0.1), [MD]);   // lit near the arm, dusky to the edge
      A.line(sh[0], sh[1], wr[0], wr[1], BAT_FUR[2], null, 0.9);                                   // the arm
      for (const t of tips) A.line(wr[0], wr[1], t[0], t[1], far ? '#7a5a5a' : '#a8807a', null, 0.4);   // finger bones
      A.ell(wr[0] + sd * 0.2, wr[1] - 0.8, 0.45, 0.7, '#e8d8c8');                                   // the thumb claw
    }
    A.soft(X, Y + 0.8, 3, 3.9, BAT_FUR);                                                            // the furry body
    A.soft(X + 0.6, Y + 1.2, 1.7, 2.6, ['#6a4a3a', '#8a6a52', '#a8866a', '#c4a284', '#dcc0a0'], BAT_FUR);   // a paler chest
    for (const sd of [-1, 1]) A.ell(X + sd * 1.1, Y + 5, 0.55, 0.8, BAT_FUR[0]);                  // tucked feet
    head(A, X + 2.4, Y - 4, false);
    A.outline();
    face(A, X + 2.4, Y - 4, false, 'open');
    return A.canvas();
  };
  const hang = eyes => {
    const A = mArt(BAT_W, BAT_H);
    for (const sd of [-1, 1]) A.poly([[X + sd * 0.6, Y - 6.2], [X + sd * 1.4, Y - 6.6], [X + sd * 1.2, Y - 4.6]], '#2a1c18');   // feet gripping the rock
    A.fill(X - 4, Y - 6, X + 4, Y + 6, (x, y) => { const u = (x - X) / (3.7 - Math.max(0, y - Y - 2) * 0.25), v = (y - Y - 0.4) / 5.2; return u * u + v * v <= 1 ? lerpColor('#7a5262', '#2a1a26', clamp(0.25 + (x - X) / 7 + (y - Y) / 14, 0, 1)) : null; });   // the cloak of wings
    const FRONT = ['#4a3026', '#6a4a3a', '#8a6a52', '#a8866a', '#c4a284'];   // his furry front between the folds
    A.fill(X - 3, Y - 4, X + 3, Y + 5, (x, y, ax, ay) => { const u = (x - X + 0.2) / 2.2, v = (y - Y - 0.4) / 3.4, d = u * u + v * v; return d <= 1 && A.buf[ay * BAT_W * A.R + ax] ? softTone(FRONT, -0.5 * u - 0.7 * v + (1 - d) * 0.6) : null; });
    for (const sd of [-1, 1]) A.line(X + sd * 1.9, Y - 4, X + sd * 2.4, Y + 4, sd < 0 ? '#a8807a' : '#5a3c4c', null, 0.4);   // the folded finger bones
    head(A, X, Y + 5, true);
    A.outline();
    face(A, X, Y + 5, true, eyes);
    return A.canvas();
  };
  BAT_ART = { fly: [], hang: hang('open'), sleep: hang('shut') };
  for (let k = 0; k < BAT_FRAMES; k++) BAT_ART.fly.push(flight(k));
  return BAT_ART;
}

// ── birds (side-on, facing left): eagle (white head and tail), glossy crow, gull (white, grey wings, black tips) ──
const FINE_BIRDS = [
  { head: ['#b8ae98', '#d8d0bc', '#f4f0e6', '#ffffff', '#ffffff'], body: ['#3a2414', '#4a2c18', '#6b4226', '#8a5a36', '#a8764a'], wing: ['#3a2414', '#5a3820', '#7a4e2c', '#9a6a40', '#b88a5a'], tip: '#2a1810', beak: '#ffc23a', eye: INK, tail: '#f4f0e6' },
  { head: ['#16162a', '#22223a', '#3a3a52', '#4a4a6a', '#6a6a90'], body: ['#141426', '#1e1e34', '#2e2e44', '#3e3e5a', '#5a5a82'], wing: ['#181830', '#2a2a48', '#46466a', '#5a5a8a', '#7a7aa8'], tip: '#7a7aa8', beak: '#6a6a80', eye: '#ffd23f', tail: '#34344e' },
  { head: ['#c8d0dc', '#e4e8f0', '#ffffff', '#ffffff', '#ffffff'], body: ['#b8c0d0', '#d8dce6', '#ffffff', '#ffffff', '#ffffff'], wing: ['#7a8498', '#94a0b4', '#a8b2c4', '#c4ccda', '#dfe4ec'], tip: '#2a2a3a', beak: '#ffc23a', eye: INK, tail: '#ffffff' },
];
function fineBird(k, up) {
  const A = mArt(24, 18), B = FINE_BIRDS[k];
  const wing = up ? [[8.6, 8.4], [11, 4], [13.6, 0.8], [18.6, 0.4], [17, 4.6], [16.4, 8.4]] : [[8.4, 9.6], [16.6, 9.6], [17.6, 13.6], [16.4, 17.2], [12, 15.2]];
  A.poly([[17.4, 8.6], [23, 10.4], [22.4, 12.6], [17.4, 11.6]], B.tail);                      // tail
  A.shade(12.4, 10.2, 6.4, 2.6, B.body);                                                        // body
  A.shade(4.6, 9.4, 2.9, 2.5, B.head);                                                          // head
  A.poly([[2.2, 8.8], [-0.2, 10.2], [2.4, 10.8]], B.beak); A.line(0.4, 10, 2.2, 9.6, '#ffffff', [B.beak], 0.34);   // beak
  A.poly(wing, B.wing[2]);
  A.shade(up ? 14 : 13, up ? 4.6 : 13, 4, 4, B.wing, [B.wing[2]]);
  const tips = up ? [[13.6, 0.8], [15.4, 0.5], [17.2, 0.4]] : [[12.6, 15.4], [14.4, 16.4], [16.2, 17]];
  for (const [x, y] of tips) A.ell(x, y + (up ? 0.6 : -0.6), 0.9, 1.1, B.tip, [B.wing[2], B.wing[1], B.wing[3], B.wing[0], B.wing[4]]);
  A.outline();
  A.ell(4.1, 8.8, 0.65, 0.65, B.eye); A.px(3.8, 8.3, '#ffffff', [B.eye]);
  return A.canvas();
}

// ── the snapvine: a chomping log-worm (orange head, eyes up on stalks, a mouth that snaps open), its green stem ──
function fineVine(open) {
  const A = mArt(16, 24), F = ['#7a3010', '#c25a12', '#ff9a3c', '#ffbf72', '#ffe0b0'], L = ['#7a5410', '#d9952e', '#ffcf6a', '#ffe4a0', '#fff6d8'];
  for (let i = 0; i < 4; i++) A.shade(8, 13.6 + i * 3, 3, 1.6, L);       // the stem, in rings
  A.shade(8, 7, 7.4, 4.6, F);
  for (const x of [4.4, 11.6]) { A.ell(x, 1.8, 1.9, 1.9, '#ffffff'); A.ell(x - 0.5, 1.4, 0.8, 0.8, '#ffffff'); }   // eyes on stalks
  if (open) {
    A.ell(8, 7.6, 5.6, 2.6, '#3a0d1f');
    for (const x of [4.2, 6.6, 9.4, 11.8]) { A.poly([[x - 0.6, 5.1], [x + 0.6, 5.1], [x, 6.4]], '#ffffff'); A.poly([[x - 0.6, 10.1], [x + 0.6, 10.1], [x, 8.8]], '#ffffff'); }
  } else {
    A.line(2.6, 7.4, 13.4, 7.4, '#3a0d1f', null, 0.9);
    for (const x of [4, 6.6, 9.4, 12]) A.poly([[x - 0.5, 7.4], [x + 0.5, 7.4], [x, 8.4]], '#ffffff');
  }
  A.outline();
  for (const x of [4.4, 11.6]) { A.ell(x + 0.2, 2, 0.75, 0.9, INK); A.px(x - 0.2, 1.3, '#ffffff', [INK]); }
  return A.canvas();
}

// ── Murray and Beebeez, drawn from their real cats. The same coat and face painters
// are used in the bedroom, so their markings survive every pose and scene.
const FINE_CATS = {
  murray: { base: ['#9e5a2c', '#c38248', '#e5a967', '#f2c38a', '#ffe0b5'], stripe: '#b9763e', eye: '#9caa84', nose: '#e4a0a0' },
  beebeez: { base: ['#101314', '#1b1d1b', '#2b2d27', '#414138', '#5b594a'], patch: ['#775037', '#a87245', '#ce995f', '#e4b67f', '#f3d3a6'], eye: '#c5ad51', nose: '#383332' },
};
const CAT_WHITE = ['#a8aaa0', '#d2d2c6', '#eeede2', '#faf8ef', '#fffdf7'];
// Coordinates are local to each body part. Broad, irregular ginger areas have dark
// islands through them: tortoiseshell rather than separate orange/black halves.
function catCoat(kind, u, v) {
  const K = FINE_CATS[kind], d = u*u + v*v;
  if (d > 1) return null;
  const light = -0.55*u - 0.75*v + (1-d)*0.6;
  if (kind === 'murray') {
    const stripe = Math.sin(u*19 + Math.sin(v*3.8)*1.1);
    return v < 0.55 && stripe > 0.79 ? lerpColor(K.stripe, K.base[2], (1-stripe)*2) : softTone(K.base, light);
  }
  const patch = Math.sin(u*6.2 + Math.sin(v*4)*0.9) + Math.cos(v*8.5-u*2)*0.58;
  const brindle = Math.sin(u*39 + Math.sin(v*8)*1.4 - v*5);
  return softTone(patch + brindle*0.95 > 0.35 ? K.patch : K.base, light);
}
function catCoatPart(A, kind, cx, cy, rx, ry) {
  A.fill(cx-rx, cy-ry, cx+rx, cy+ry, (x,y) => catCoat(kind, (x-cx)/rx, (y-cy)/ry));
}
// A three-quarter face keeps both cats recognisable even at companion size.
// Murray: wide white blaze and pink nose. Beebeez: black mask, fine ginger blaze,
// ginger whisker pads and a white chin; both eyes stay surrounded by dark fur.
function fineCatFace(A, kind, hx, hy, s = 1, awake = true) {
  const K=FINE_CATS[kind], mur=kind==='murray', C=K.base, W=CAT_WHITE;
  const ell=(x,y,rx,ry,pal)=>A.soft(hx+x*s,hy+y*s,rx*s,ry*s,pal);
  const poly=(pts,c)=>A.poly(pts.map(([x,y])=>[hx+x*s,hy+y*s]),c);
  const line=(x,y,x1,y1,c,t=0.3)=>A.line(hx+x*s,hy+y*s,hx+x1*s,hy+y1*s,c,null,t*s);
  const ears=[[[ -3, -1.1],[-2.9,-5.2],[-0.6,-2.3]],[[0.8,-2.2],[3.1,-5],[3.3,-0.9]]];
  ears.forEach((p,i)=>{
    poly(p,!mur&&i?K.patch[2]:C[2]);
    poly(p.map(([x,y])=>[x*0.86,y*0.72-0.25]),mur?'#e5b4a5':'#ad9178');
  });
  ell(0,0,mur?3.7:3.45,mur?3.15:3.25,C);
  if(mur) {
    for(const [x,y,x1,y1] of [[-1.8,-2.5,-1.3,-1],[-0.5,-2.9,-0.2,-1.3],[0.9,-2.8,0.7,-1.4],[2.3,0.4,3,0.2],[-3,0.4,-2.5,0.8]])line(x,y,x1,y1,K.stripe,0.35);
    poly([[-0.2,-2.3],[-0.65,-0.8],[-1.15,0.5],[-2.1,1.4],[-1.8,2.6],[2,2.6],[2.3,1.2],[1.1,0.5],[0.65,-0.7]],W[3]);
    ell(-0.65,1.65,1.7,1.25,W);ell(1.2,1.6,1.65,1.25,W);
  }else{
    poly([[0.1,-3.15],[0.8,-2.7],[0.5,-1.8],[0.85,-0.9],[0.45,-0.45],[-0.05,-1.4]],K.patch[2]);
    poly([[2.85,-1.8],[3.3,-0.6],[3.25,1.5],[2.65,2],[2.4,0.5],[2.8,-0.3]],K.patch[2]);
    ell(-0.7,1.55,1.25,0.65,K.patch);ell(1,1.6,1.3,0.7,K.patch);
    ell(0.25,2.55,1.7,0.65,W);
  }
  for(const [x,y] of [[-1.65,-0.1],[1.65,-0.05]]) {
    if(awake){
      const rx=mur?1.06:0.98, ry=mur?1.14:1.08;
      ell(x,y,rx+0.18,ry+0.15,['#35302a','#4b4437','#594b38']);
      ell(x,y,rx,ry,[mur?'#697761':'#7e733a',K.eye,mur?'#c6c9a1':'#e2cb76']);
      // Wide, softly rounded pupils, as in the reference portraits.
      A.ell(hx+x*s,hy+(y+0.05)*s,(mur?0.57:0.36)*s,0.9*s,'#17201e');
      A.ell(hx+(x-0.25)*s,hy+(y-0.4)*s,0.2*s,0.22*s,'#fffdf4');
    }else{
      line(x-0.8,y+0.1,x,y+0.45,'#252825',0.32);
      line(x,y+0.45,x+0.8,y+0.1,'#252825',0.32);
    }
  }
  poly([[-0.4,1.25],[1,1.25],[0.25,1.95]],K.nose);
  line(0.25,1.95,0.25,2.3,mur?'#ab8079':'#6b6251',0.2);
}
function fineCatWhiskers(A, hx, hy, s = 1) {
  for(const dir of [-1,1])for(const dy of [-0.3,0.35])
    A.line(hx+dir*1.4*s,hy+(1.8+dy)*s,hx+dir*4.4*s,hy+(1.7+dy*2)*s,'#e6e2ce',null,Math.max(0.3,s*0.16));
}
// A sit, four walking steps and a leap, all within the existing 24 x 18 frame.
function fineCat(kind, legs, outline = 2 * CHICK_R / ART_R) {
  const A=mArt(24,18,CHICK_R), K=FINE_CATS[kind], C=K.base, W=CAT_WHITE, mur=kind==='murray';
  const sitting=legs==='sit', hx=sitting?16:18, hy=sitting?6:6.5;
  const bx=sitting?9.5:10, by=sitting?11.6:10.8, rx=sitting?4.8:7, ry=sitting?4.5:3.1;
  const tail=sitting?[[6,14.7],[3.8,15.4],[2,14.6],[1.4,12.5],[1.7,10]]:[[4.3,11],[2.3,9.5],[1.2,7.3],[1.5,5.4],[2.5,4.7]];
  for(let i=1;i<tail.length;i++) {
    const col=mur?(i%2?K.stripe:C[2]):(i===2?K.patch[1]:C[2]);
    A.line(...tail[i-1],...tail[i],col,null,1.35);
    A.line(tail[i-1][0]-0.2,tail[i-1][1]-0.2,tail[i][0]-0.2,tail[i][1]-0.2,C[3],null,0.34);
  }
  const limb=(x,y,foot,lean,front,far=false)=>{
    const P=mur&&front?W:C;
    A.line(x,y,x+lean,foot-0.5,P[far?0:1],null,1.45);
    A.line(x-0.25,y,x+lean-0.25,foot-0.6,P[far?1:3],null,0.55);
    if(!mur&&front)A.line(x,y+1.6,x+lean*0.7,foot-1.5,K.patch[2],null,0.8);
    A.soft(x+lean+0.45,foot,1.2,0.65,W);
  };
  if(!sitting){
    limb(5.5,11.6,16.8,legs[0]==='apart'?-1.6:0.4,false,true);
    limb(14.2,11.3,16.8,legs[1]==='apart'?1.5:-0.1,true,true);
  }
  // Tuck the upper legs under the torso and chest, so their stroke caps never sit on the coat.
  if(sitting){limb(13,11.4,16.8,0.1,true);limb(15.4,10.8,16.8,-0.2,true);}
  else{
    limb(5.1,11.8,16.8,legs[0]==='apart'?1.4:-0.3,false);
    limb(15.6,11.2,16.8,legs[1]==='apart'?-1.3:0.5,true);
  }
  catCoatPart(A,kind,bx,by,rx,ry);
  if(mur)A.soft(bx+1,by+1.5,rx*0.65,1.6,W); // Murray's broad white underside
  if(sitting)catCoatPart(A,kind,8,14,3.8,2.6);
  // Beebeez's warm ginger ruff surrounds her smaller white bib.
  if(!mur)A.soft(hx-2.6,hy+4.7,2.8,3.8,K.patch);
  A.soft(hx-2,hy+4.8,mur?2.5:1.7,mur?3.7:2.7,W,null,-0.2);
  fineCatFace(A,kind,hx,hy);
  A.outline(INK,outline);
  fineCatWhiskers(A,hx,hy);
  return A.canvas();
}
// Beebeez's swatting paw, viewed from the pad side. Toes point up; the wrist enters at the bottom.
let BEEBEEZ_PAW_ART=null;
function beebeezPawArt() {
  if(BEEBEEZ_PAW_ART)return BEEBEEZ_PAW_ART;
  const A=mArt(10,10,CHICK_R),fur=CAT_WHITE;
  const pink=['#a85d73','#c77c90','#e5a1b1','#f4c0c9','#ffe0df'];
  A.soft(5,7.7,1.7,1.6,fur); // a narrow wrist joining the raised arm
  A.soft(5,6,3.35,2.8,fur);
  const toes=[[2.15,3.7,1.15,1.45,-0.4],[3.9,2.65,1.3,1.55,-0.12],[6,2.75,1.3,1.55,0.13],[7.75,3.85,1.15,1.4,0.4]];
  for(const [x,y,rx,ry,rot] of toes)A.soft(x,y,rx,ry,fur,null,rot);
  A.outline(INK,2);
  // Four separate little toe beans sit beyond the large palm pad, away from the wrist.
  for(const [x,y,,,rot] of toes){A.soft(x,y+0.15,0.7,0.85,pink,null,rot);A.ell(x-0.15,y-0.1,0.22,0.22,'#f9d0d3');}
  A.soft(5,6.55,1.9,1.35,pink);
  A.soft(4.1,5.85,0.95,0.85,pink,null,-0.3);A.soft(5.85,5.85,0.95,0.85,pink,null,0.3);
  A.line(4.3,7.1,5.6,7.25,'#c88094',null,0.34);
  return BEEBEEZ_PAW_ART=A.canvas();
}
function fineCatSprites(kind, outline) {
  return {
    walk: [['apart', 'tog'], ['tog', 'tog'], ['tog', 'apart'], ['tog', 'tog']].map(l => fineCat(kind, l, outline)),
    leap: fineCat(kind, ['apart', 'apart'], outline),
    sit: fineCat(kind, 'sit', outline),
  };
}

// swap the fine sprites in (buildSprites, sprites.js)
function fineSprites() {
  SPR.pepperA = finePepper(false); SPR.pepperB = finePepper(true);
  SPR.heart = fineHeartItem();
  SPR.itemIce = fineIceWand(); SPR.itemGale = fineFeather(); SPR.itemVolt = fineVoltOrb(); SPR.itemQuake = fineMallet();
  const shroom = [fineShroom(0), fineShroom(1), fineShroomFlat()];
  for (const th of Object.keys(SPR.grumblet)) if (th !== 'meadow') { SPR.grumblet[th] = shroom[0]; SPR.grumbletB[th] = shroom[1]; SPR.grumbletFlat[th] = shroom[2]; }
  const M = meadowArt();
  SPR.grumblet.meadow = M.acornA; SPR.grumbletB.meadow = M.acornB; SPR.grumbletFlat.meadow = M.acornFlat;
  SPR.hedgehogA = M.hogA; SPR.hedgehogB = M.hogB;
  SPR.shellbackA = fineShellback(0); SPR.shellbackB = fineShellback(1);
  SPR.shell = fineShell(0); SPR.shellB = fineShell(1);
  SPR.flutterUp = fineBat(true); SPR.flutterDown = fineBat(false);
  SPR.birdUp = [0, 1, 2].map(k => fineBird(k, true)); SPR.birdDown = [0, 1, 2].map(k => fineBird(k, false));
  SPR.vineOpen = fineVine(true); SPR.vineShut = fineVine(false);
}

// ── a sleeper's Z (Chickaroo dozing, bats, a snoring drummer, alarm clocks, a genie...), painted fine: a puffy rounded
//    letter, its strokes softly lit from above, an ink line round it. `size`: its height in game px (the art is size + 2
//    square, the letter inset 1); drawn with drawZ at the letter's top-left, like drawText ──
const Z_ART = new Map();
function zArt(size, color = '#edf3ff') {
  const key = size + color;
  if (Z_ART.has(key)) return Z_ART.get(key);
  const A = mArt(size + 2, size + 2), th = Math.max(1.25, size * 0.24), m = 1 + th / 2, e = 1 + size - th / 2;
  const seg = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, u = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(x - ax - dx * u, y - ay - dy * u); };
  const top = lerpColor(color, '#ffffff', 0.7), low = lerpColor(color, '#8a90c8', 0.35);
  A.fill(0, 0, size + 2, size + 2, (x, y) => {
    const d = Math.min(seg(x, y, m, m, e, m), seg(x, y, e, m, m, e), seg(x, y, m, e, e, e));
    return d <= th / 2 ? lerpColor(top, low, clamp((y - 1) / size * 0.8 + (d / (th / 2)) * 0.25, 0, 1)) : null;
  });
  A.outline();
  Z_ART.set(key, A.canvas());
  return Z_ART.get(key);
}
function drawZ(ctx, x, y, color, size = 7) { ctx.drawImage(zArt(size, color), x - 1, y - 1); }

// One native-resolution design per power, shared by worn hats, rolling poses and dropped hats.
const POWER_HAT_PIXELS=new Map(),POWER_HAT_ART=new Map();
function powerHatPixels(hat,back=false) {
  const key=hat+':'+back;if(POWER_HAT_PIXELS.has(key))return POWER_HAT_PIXELS.get(key);
  const A=mArt(24,18),gold=['#795028','#b4853c','#d9b05d','#f2d796','#fff0c4'];
  const shadePoly=(pts,C)=>{A.poly(pts,C[2]);A.fill(0,0,24,18,(x,y)=>softTone(C,1.1-x*0.035-y*0.055),[C[2]]);};
  if(hat==='fire'){
    const C=['#721a2c','#a82a3c','#d84647','#ef7770','#ffb8a0'];
    A.soft(12,11.3,7.5,4.4,C);A.soft(12,15,8,1.1,C);
    for(const [x,rot] of [[8,-0.35],[12,0],[16,0.35]]){
      for(let i=0;i<8;i++){const y=8+i*0.8,xx=x+Math.sin(i/8*Math.PI)*rot*2;A.line(xx,y,xx+0.15,y+0.45,'#ba3940',null,0.34);}
    }
    A.soft(8.1,9,1.7,0.65,['#f27f78','#f8a096','#ffd1b5','#ffe0c8','#fff0dd'],null,-0.3);
    for(let i=0;i<5;i++){const an=i*Math.PI*2/5;A.soft(12+Math.cos(an)*2,7.4+Math.sin(an)*0.6,2,0.65,['#25593c','#427d48','#6ca75e','#a2ce80','#d6e6aa'],null,an*0.3);}
    A.line(12,7,12.8,3.7,'#407343',null,1.15);A.line(12.8,3.7,15,2.7,'#51864b',null,0.9);A.line(15,2.7,15.5,3.6,'#51864b',null,0.7);
    A.soft(16,4.9,2.4,0.8,['#356440','#578a4b','#82b266','#b5d592','#dcebc0'],null,-0.4);A.line(14.5,5.4,17.5,4.3,'#d1df9b',null,0.34);
    A.line(6,15.3,18.7,15.3,'#f19183',null,0.34);
  }else if(hat==='ice'){
    const C=['#345c7c','#4b84a3','#73b1c7','#a2d4df','#d8f0ef'];
    A.soft(12,10.5,7.3,5.2,C);
    for(let row=0;row<3;row++)for(let col=0;col<8;col++){
      const x=6.2+col*1.6+(row%2)*0.4,y=7.3+row*2;
      if(((x-12)/6.8)**2+((y-10.5)/4.8)**2>0.9)continue;
      A.line(x-0.35,y,x,y+0.6,'#5393b0',null,0.34);A.line(x,y+0.6,x+0.4,y,'#b8e2e5',null,0.34);
    }
    A.fill(4,13,20,16.5,(x,y)=>softTone(['#a2b9be','#c5d5d0','#e5ebdd','#f8f5e6','#fffced'],0.7-(y-13)*0.23-(x-9)*0.035));
    A.soft(12,16,8,0.75,['#97afb9','#bfd0d1','#e2e9df','#f6f3e7','#fffbea']);
    for(let x=5;x<20;x+=1.1)A.line(x,13.5,x,15.2,'#c4d6d3',null,0.34);
    if(!back){A.line(13.7,13.5,13.7,15.7,'#5a9fb9',null,0.34);A.line(12.7,14,14.6,15.2,'#5a9fb9',null,0.34);A.line(12.7,15.2,14.6,14,'#5a9fb9',null,0.34);}
    const pom=['#aec5cb','#d0deda','#edf0e5','#fff9ed','#ffffff'];A.soft(11.3,4.3,2.2,2.1,pom);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;A.soft(11.3+Math.cos(a)*1.7,4.3+Math.sin(a)*1.5,0.7,0.7,pom);}
  }else if(hat==='gale'){
    const C=['#204d40','#326d4c','#5b9b69','#91bf8b','#c6deb2'];
    shadePoly([[3,12.2],[5,9.2],[10,7.3],[15,8],[19.2,12],[20,15],[6,15.5]],C);
    A.soft(12.3,12.1,7.2,3.1,C);A.poly([[4.8,14.5],[19,14.1],[21,15.5],[18,16.3],[5,16]],'#477a50');
    A.line(6,14,19,13.5,'#8e6947',null,0.9);A.line(7,13.8,18,13.3,'#d6bb7d',null,0.34);
    // Curved feather with split barbs instead of a flat white sliver.
    shadePoly([[7.8,12],[4.7,8.7],[2.8,4.5],[3.5,1.5],[5.8,3.8],[7.2,7],[7,10]],['#829d98','#b0c8b8','#d5e5cc','#f1f2dc','#fff9e8']);
    A.line(7.2,12,3.9,2.8,'#8fae9d',null,0.34);
    for(let i=0;i<5;i++){const y=4+i*1.4,x=4.1+(y-3)*0.34;A.line(x,y,x+1.1,y-0.5,'#b8cfc0',null,0.34);}
    A.soft(7.6,12.3,1.15,1.2,gold);A.ell(7.6,12.3,0.55,0.65,'#83b8a4');
    A.line(12.4,8.9,15.4,11.1,'#a8cea0',null,0.34);
  }else if(hat==='volt'){
    const C=['#292047','#463565','#70528e','#a181b5','#d0b3d8'];
    A.soft(12,15.2,9,1.55,C);
    shadePoly([[5.6,2.3],[8.1,3.1],[8.2,6.9],[12.5,9.9],[17.9,14.8],[6.1,14.8],[8.5,9],[7.4,5.5]],C);
    A.poly([[8.1,3.1],[8.2,6.9],[12.5,9.9],[16.3,14.2],[12.3,13.5],[9.2,8]],'#9270a6');
    A.line(7.5,13.5,17.5,14.2,'#d4b47d',null,1.1);A.line(8.2,13.2,16.7,13.8,'#f5dfa6',null,0.34);
    if(!back)A.poly([[12.7,8],[10.7,10.5],[12,10.6],[11.4,12.6],[14.1,9.7],[12.7,9.9]],'#f5d68a');
    const star=[];for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?0.55:1.4;star.push([5.8+Math.cos(a)*r,2.1+Math.sin(a)*r]);}A.poly(star,'#f7de9b');
    A.ell(5.6,1.8,0.25,0.25,'#fff9de');A.line(4.8,15.2,8.1,15.7,'#ac8abb',null,0.34);
  }else if(hat==='quake'){
    const C=['#785a30','#aa803a','#d6ac51','#edd08a','#fae8b3'];
    A.soft(11.9,11.4,7.4,4.5,C);A.soft(12,15.5,8.7,1,C);
    A.line(7.8,8.5,7.1,13.9,'#b48c46',null,0.55);A.line(11.4,7.5,11.4,13.9,'#f9e6b2',null,0.65);A.line(15,8.5,15.8,14,'#b48c46',null,0.55);
    A.line(5,14.4,19,14.4,'#8d7048',null,0.7);A.line(5,16.3,20.2,16,'#f7e3ad',null,0.34);
    if(!back){
      A.soft(17.3,12.2,2.65,2.5,['#4b505c','#777f89','#a9b7bb','#d6dfd9','#f3f2df']);
      A.soft(17.3,12.2,1.8,1.65,['#b59559','#dfc47d','#f5df9d','#fff2ca','#fffce8']);
      A.ell(16.8,11.7,0.65,0.55,'#fffef3');A.line(18,12.2,18.4,12.7,'#f2d68d',null,0.34);
    }else{A.line(8,13.5,16,13.5,'#a48656',null,0.55);A.ell(12,13.5,0.7,0.45,'#ecce8d');}
  }
  POWER_HAT_PIXELS.set(key,A);return A;
}
// Rasterize directly into the chick's native pixel buffer; poses and rolls share the exact same art.
function paintPowerHat(buf,W,H,R,hat,hx,hy,sx=1,sy=1,angle=0,facing=1,back=false) {
  const A=powerHatPixels(hat,back),cs=Math.cos(angle),sn=Math.sin(angle),bound=Math.hypot(12*sx,12*sy)+1;
  for(let ay=Math.max(0,Math.floor((hy-bound)*R));ay<Math.min(H,Math.ceil((hy+bound)*R));ay++)for(let ax=Math.max(0,Math.floor((hx-bound)*R));ax<Math.min(W,Math.ceil((hx+bound)*R));ax++){
    const dx=(ax+0.5)/R-hx,dy=(ay+0.5)/R-hy;
    const x=((dx*cs+dy*sn)/sx)*facing+12,y=(-dx*sn+dy*cs)/sy+12;
    const xx=Math.floor(x*A.R),yy=Math.floor(y*A.R);if(xx<0||yy<0||xx>=A.w*A.R||yy>=A.h*A.R)continue;
    const col=A.buf[yy*A.w*A.R+xx];if(col)buf[ay*W+ax]=col;
  }
}
function powerHatArt(hat) {
  if(POWER_HAT_ART.has(hat))return POWER_HAT_ART.get(hat);
  const src=powerHatPixels(hat),A=mArt(src.w,src.h);for(let i=0;i<src.buf.length;i++)A.buf[i]=src.buf[i];
  const img=A.outline().canvas();POWER_HAT_ART.set(hat,img);return img;
}
