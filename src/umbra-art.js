'use strict';
// Umbraroo is painted at its final display size. The giant never enlarges a small sprite.
const UMBRA_ART = new Map();
// A horned shadow with a narrow face, hunched shoulders, hooked hands and torn wisps.
// Paint both sizes independently at their display resolution, including the little echoes' grins.
function umbrarooArt(w, h, pose = 'idle', step = 0, giant = false, damage = 0) {
  const stage = giant ? Math.min(3, Math.floor(damage / 3)) : 0;
  const key = ['wraith', w, h, pose, step, giant, stage].join(':');
  if (UMBRA_ART.has(key)) return UMBRA_ART.get(key);
  const { art: img, g: c, path } = smoothPainter(w, h);
  c.scale(w / 100, h / 100);
  const crouch = pose === 'crouch', air = pose === 'jump';
  const lean = pose === 'skid' ? -2 : pose === 'run' ? Math.sin(step * Math.PI / 2) * 1.4 : 0;
  const sy = crouch ? .78 : 1, oy = crouch ? 21 : 0;
  const gait = pose === 'run' ? Math.sin(step * Math.PI / 2) * 5 : 0;
  c.translate(lean, oy); c.scale(1, sy);
  const paint = (d, fill, rim = '#49344e', width = .55) => path(d, fill, rim, width);
  const grad = (x, y, xx, yy, stops) => {
    const g = c.createLinearGradient(x, y, xx, yy);
    stops.forEach((v, i) => g.addColorStop(i / (stops.length - 1), v)); return g;
  };
  const smoke = grad(8, 50, 70, 97, ['#302238', '#110d1c', '#090813']);
  // Torn mantle streams away from the shoulders, leaving long transparent gaps.
  paint('M 31 43 C 16 48 20 64 8 68 Q 14 70 18 67 C 15 77 7 82 2 80 Q 6 91 20 86 L 14 95 Q 28 94 39 80 L 66 79 Q 78 93 94 96 L 86 84 Q 95 86 98 78 C 88 81 89 65 80 60 L 86 61 Q 82 48 68 43 Z', smoke, '#34263e');
  // Split, pointed legs remain readable when the small shadow replays a jump or run.
  for (const [side, lift] of [[-1, air ? 6 : gait], [1, air ? 9 : -gait]]) {
    c.save(); c.translate(50, 0); c.scale(side, 1);
    paint(`M 3 73 L 18 73 Q 13 86 ${21 + lift} ${89 - lift} Q ${32 + lift} ${92 - lift} 31 ${96 - lift} L 12 ${97 - lift} Q 5 92 4 85 L -1 91 Z`, '#0d0a17', '#3c2a43');
    c.restore();
  }
  // Broad shoulders pinch to a waist instead of forming a round body.
  const body = grad(21, 42, 70, 86, [stage > 1 ? '#302337' : '#3a2a43', '#1a1125', '#090812']);
  paint('M 37 43 L 28 44 L 18 53 L 27 58 L 31 72 L 28 83 L 39 79 L 47 91 L 54 80 L 68 85 L 64 72 L 72 56 L 81 52 L 70 44 L 62 43 Z', body, '#5a3d5b', .65);
  paint('M 31 48 Q 40 58 47 58 L 50 77 L 43 70 L 39 75 Q 37 60 31 48 Z', '#21162c', null);
  paint('M 67 48 L 57 60 L 54 77 L 61 69 Q 61 58 67 48 Z', '#0a0813', null);
  // Long bent forearms end in three separate hooked fingers, rather than round wings.
  for (const side of [-1, 1]) {
    c.save(); c.translate(50, 0); c.scale(side, 1);
    paint('M 20 47 Q 30 47 33 59 L 38 70 L 34 79 Q 34 72 30 69 L 29 78 L 24 84 Q 28 74 24 72 L 22 81 L 17 85 Q 21 73 19 69 L 13 63 Q 11 57 20 47 Z', grad(15, 47, 33, 81, ['#302139', '#100b1c', '#080711']), '#50344e');
    paint('M 25 55 Q 28 61 29 66', null, '#654257', .65);
    c.restore();
  }
  // Back-swept horns curl to sharp, uneven tips. Inner rims catch a little violet light.
  for (const side of [-1, 1]) {
    c.save(); c.translate(50, 0); c.scale(side, 1);
    paint('M 13 27 Q 26 22 29 12 Q 31 7 26 2 Q 41 8 34 24 L 26 36 Z', grad(34, 5, 14, 35, ['#68506d', '#34243e', '#100c1b']), '#6c4868', .6);
    paint('M 28 8 Q 35 18 24 27', null, '#92718a', .65);
    c.restore();
  }
  // A jagged cheek line, high brow and pointed chin carve the face out of the darkness.
  paint('M 29 24 L 40 20 L 48 15 L 54 20 L 66 19 L 75 26 L 72 35 L 80 40 L 71 41 L 74 46 L 65 45 L 60 53 L 50 59 L 40 53 L 34 46 L 25 49 L 29 41 L 21 38 L 28 33 Z', grad(29, 21, 68, 55, ['#3b2b44', '#1a1127', '#0a0814']), '#6b4564', .65);
  paint('M 30 25 L 42 23 L 49 28 L 46 35 L 34 32 Z', '#100b1b', null);
  paint('M 53 28 L 65 22 L 72 26 L 67 34 L 55 36 Z', '#0b0815', null);
  paint('M 31 27 L 42 27 L 48 32 M 54 32 L 64 26 L 70 26', null, '#79516f', .7);
  // Narrow, slanted red eyes are baked into both sizes; the giant adds a live halo.
  for (const side of [-1, 1]) {
    c.save(); c.translate(50, 0); c.scale(side, 1);
    paint('M 5 34 Q 11 28 19 30 Q 15 36 7 37 Z', '#f12d4b', '#9c1d3a', .45);
    paint('M 8 35 L 16 32 L 13 35 Z', '#ffb5a1', null);
    paint('M 11 32 L 12 35', null, '#fff0d0', .45);
    c.restore();
  }
  // The smile hooks high into the cheeks, with irregular red-lit needle teeth.
  const mouth = 'M 30 39 Q 48 47 70 37 Q 64 52 50 53 Q 38 51 30 39 Z';
  paint(mouth, '#020106', '#a02645', .65);
  c.save(); path(mouth, null, null); c.clip();
  const top = t => [30 + 40 * t, (1-t)*(1-t)*39 + 2*(1-t)*t*47 + t*t*37];
  const bottom = t => [32 + 36 * t, (1-t)*(1-t)*41 + 2*(1-t)*t*64 + t*t*39];
  for (let i = 0; i < (giant ? 9 : 6); i++) {
    const n = giant ? 9 : 6, t = (i + .5) / n, dt = .36 / n;
    for (const lower of [false, true]) {
      const edge = lower ? bottom : top;
      const a = edge(t-dt), b = edge(t+dt), tip = edge(t);
      const len = (lower ? -1 : 1) * (3.3 + (i % 3) * .75);
      paint(`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${tip[0]-.35} ${tip[1]+len} Z`, lower ? '#c52748' : '#ff6572', null);
    }
  }
  c.restore();
  paint('M 35 47 Q 49 57 65 45', null, '#67253e', .55);
  // Eye metadata follows the very same pose transform as the painted face.
  img.eyes = [38, 62].map(x => [w * (x + lean) / 100, h * (oy + 33.5 * sy) / 100, w * .065]);
  UMBRA_ART.set(key, img);
  return img;
}
function umbraFlameArt(frame, variant = 0) {
  variant = variant >= 1 ? 1 : 0;
  const key = 'flame:' + frame + ':' + variant;
  if (UMBRA_ART.has(key)) return UMBRA_ART.get(key);
  const img = makeHiCanvas(32, 34), c = img.getContext('2d'), phase = frame * Math.PI / 6;
  const fill = c.createLinearGradient(0, 6, 0, 34);
  fill.addColorStop(0, '#a94b70'); fill.addColorStop(0.35, '#582441'); fill.addColorStop(1, '#160d24');
  c.fillStyle = fill; c.strokeStyle = '#86405f'; c.lineWidth = 0.45;
  for (let i = 0; i < 5; i++) {
    const x = i * 8 - 1, h = 15 + Math.sin(phase + i * 1.7 + variant) * 6 + i % 2 * 5;
    const tip = x + Math.sin(phase + i) * 3;
    c.beginPath(); c.moveTo(x - 6, 34);
    c.bezierCurveTo(x - 7, 26, tip - 3, 34 - h + 8, tip, 34 - h);
    c.bezierCurveTo(tip + 1, 34 - h + 10, x + 7, 26, x + 6, 34);
    c.closePath(); c.fill(); c.stroke();
  }
  UMBRA_ART.set(key, img); return img;
}
function umbraSpark(ctx,x,y,size,col,alpha=1) {
  ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=col;ctx.beginPath();
  ctx.moveTo(x,y-size);ctx.quadraticCurveTo(x+size*0.17,y-size*0.17,x+size,y);
  ctx.quadraticCurveTo(x+size*0.17,y+size*0.17,x,y+size);
  ctx.quadraticCurveTo(x-size*0.17,y+size*0.17,x-size,y);
  ctx.quadraticCurveTo(x-size*0.17,y-size*0.17,x,y-size);ctx.fill();ctx.restore();
}

// Faceted shadow motes: dark centres, a violet rim and a small reflected glint, without drawn streaks.
function umbraDarkGlint(ctx,x,y,size,alpha=1) {
  ctx.save();ctx.globalAlpha*=alpha;
  fGlow(ctx,x,y,size*4,'#80518c',0.22);
  umbraSpark(ctx,x,y,size,'#694367',0.85);
  umbraSpark(ctx,x+size*0.12,y+size*0.15,size*0.82,'#100b1b');
  umbraSpark(ctx,x-size*0.26,y-size*0.28,size*0.3,'#d6b7df',0.85);
  ctx.restore();
}
function umbraSoulGather(ctx,hx,hy,tx,ty,progress,time) {
  const strength=Math.sin(Math.PI*clamp(progress,0,1));
  fGlow(ctx,tx,ty,22,'#3c204d',0.45*strength);
  fGlow(ctx,tx,ty,12,'#9e649e',0.18*strength);
  for(let i=0;i<26;i++){
    const u=((time*0.027+i*0.618)%1),a=i*2.4+time*0.04;
    const spread=Math.sin(u*Math.PI)*(5+(i%4)*3);
    const x=hx+(tx-hx)*u+Math.cos(a)*spread;
    const y=hy+(ty-hy)*u+Math.sin(a)*spread;
    umbraDarkGlint(ctx,x,y,0.75+(i%4)*0.47,strength*(0.35+u*0.5));
  }
  for(let i=0;i<9;i++){
    const a=i*2.4+time*0.055,r=(1-progress)*15+3;
    umbraDarkGlint(ctx,tx+Math.cos(a)*r,ty+Math.sin(a)*r*0.7,1.1+(i%3)*0.5,strength*0.8);
  }
}
function umbraDamageMagic(ctx,cx,cy,rays,progress,time) {
  const fade=1-progress,travel=1-Math.pow(1-progress,2);
  fGlow(ctx,cx,cy,22+travel*30,'#4a215e',fade*0.5);
  for(let i=0;i<rays.length;i++)for(let j=0;j<4;j++){
    const ray=rays[i],a=ray.a+j*0.22+Math.sin(time*0.03+i)*0.12;
    const r=ray.r*travel*(0.35+j*0.23);
    umbraDarkGlint(ctx,cx+Math.cos(a)*r,cy+Math.sin(a)*r,1.0+(j%3)*0.9,fade*(0.65+j*0.08));
  }
}

// One soft sprite shared by every detonation; the dust itself uses batched fine pixels.
function umbraDustCloudArt() {
  const key='death-cloud';if(UMBRA_ART.has(key))return UMBRA_ART.get(key);
  const image=makeHiCanvas(64,64),c=image.getContext('2d');
  const glow=c.createRadialGradient(32,32,1,32,32,32);
  glow.addColorStop(0,'rgba(255,245,255,1)');glow.addColorStop(.22,'rgba(232,201,255,.85)');
  glow.addColorStop(.5,'rgba(162,110,213,.42)');glow.addColorStop(1,'rgba(64,35,91,0)');
  c.fillStyle=glow;c.fillRect(0,0,64,64);UMBRA_ART.set(key,image);return image;
}
