'use strict';
// Magmaw and his vanity collection, painted directly in art pixels with a shared face and materials.
const MAGMAW_ART = new Map();
const MAGMAW_STONE = ['#1d1828','#352234','#562e42','#82475e','#b3788b','#deb0be'];
function paintMagmawHead(A, cx, cy, rx, ry, C, opts = {}) {
  const sx = rx / 14, sy = ry / 11, at = (x, y) => [cx + x * sx, cy + y * sy];
  const poly = (ps, c) => A.poly(ps.map(([x, y]) => at(x, y)), c);
  const line = (a, b, c, w = 0.65) => A.line(...at(...a), ...at(...b), c, null, w * sx);

  // Majestic curved horns with fluted spiral ridges emerging from temples
  for (const side of [-1, 1]) {
    const chip = opts.wear >= 2 || (opts.wear >= 1 && side < 0);
    const tip = chip ? [side * 15, -14] : [side * 16.8, -21.5];
    poly([[side * 8, -6], [side * 13.5, -8], [side * 16.2, -13], tip, [side * 13.5, -15.5], [side * 12.5, -10], [side * 8.5, -8]], opts.horn || '#b8a688');
    poly([[side * 9, -7], [side * 13, -10], [side * 14.5, -15.5], tip, [side * 15.2, -12], [side * 12.8, -8]], opts.hornLight || '#f8eec4');
    // horn spiral ridges
    for (let r = 0; r < (chip ? 3 : 5); r++) {
      const u = (r + 1) / 6;
      const hx = side * (8.5 + (tip[0] / side - 8.5) * u), hy = -7 + (tip[1] - (-7)) * u;
      line([hx - side * 1.4, hy + 0.8], [hx + side * 1.4, hy - 0.8], opts.horn ? '#8a6e50' : '#88705c', 0.55);
    }
    if (chip) line([side * 13.2, -14.2], [side * 16, -13.8], '#ff6e38', 0.85); // glowing hot fracture
  }

  // Head base volume with basalt shading
  A.soft(cx, cy, rx, ry, C);
  A.soft(cx - rx * 0.52, cy + ry * 0.25, rx * 0.35, ry * 0.48, C);
  A.soft(cx + rx * 0.52, cy + ry * 0.25, rx * 0.35, ry * 0.48, C);

  // Broad angular armored brow plates
  poly([[-12.5, -5.5], [-8, -8.5], [-2, -6.5], [-1, -2], [-7, -3]], C[3] || C[2]);
  poly([[12.5, -5.5], [8, -8.5], [2, -6.5], [1, -2], [7, -3]], C[1]);
  line([-8, -8], [-2, -6], '#ffaa44', 0.5); // glowing magma brow rim

  // Heavy snout & muzzle
  A.soft(cx, cy + ry * 0.28, rx * 0.38, ry * 0.28, C);

  // Eyes
  for (const side of [-1, 1]) {
    if (opts.sleep) {
      line([side * 3, -0.7], [side * 8, -1.2], opts.eyeDark || '#1a1424', 1.0);
      continue;
    }
    const ex = cx + side * rx * 0.44, ey = cy - ry * 0.12;
    const eye = opts.carved ? C[1] : '#ffc040';
    A.ell(ex, ey, rx * 0.25, ry * (opts.wear >= 2 ? 0.13 : 0.21), eye);
    if (!opts.carved) {
      A.ell(ex, ey, rx * 0.18, ry * 0.14, '#ffea70'); // inner eye glow
      A.ell(ex + (opts.lookX || 0) * sx, ey + (opts.lookY || 0) * sy, rx * 0.07, ry * 0.17, '#180e22'); // pupil
      A.ell(ex - 0.3 * sx, ey - 0.5 * sy, 0.4 * sx, 0.4 * sy, '#ffffff'); // cornea shine
    } else {
      A.ell(ex + (opts.lookX || 0) * sx, ey + (opts.lookY || 0) * sy, rx * 0.065, ry * 0.16, C[0]);
    }
    line([side * 2, -3.2], [side * 9.5, -5.6], C[0], 1.5);
  }

  // Mouth and fangs
  const my = cy + ry * 0.58, open = opts.mouth;
  A.ell(cx, my, rx * 0.56, ry * (open ? 0.36 : 0.09), opts.carved ? C[0] : '#1c0a18');
  if (open && !opts.carved) {
    // Glowing lava throat
    A.ell(cx, my + ry * 0.16, rx * 0.42, ry * 0.16, '#e04c1a');
    A.ell(cx, my + ry * 0.18, rx * 0.24, ry * 0.09, '#ffcc44');
  }
  // Sharp basalt fangs
  for (const x of [-6, -1.5, 4.5]) {
    poly([[x - 0.8, open ? 3.2 : 5.2], [x + 1.3, open ? 3.2 : 5.2], [x + 0.25, open ? 6.2 : 7.2]], opts.carved ? C[4] || C[3] : '#fff6d5');
  }
  if (open && !opts.carved) {
    // Bottom fangs
    for (const x of [-4, 2]) {
      poly([[x - 0.7, 8.5], [x + 1.1, 8.5], [x + 0.2, 6.2]], '#ffecc0');
    }
  }

  if (opts.scuffed) {
    line([-9, 5], [-6, 6.5], '#ff6e30', 0.75); // glowing scratch
    line([8, 3], [10, 5], C[4] || C[3], 0.5);
  }
}
function magmawBodyArt(state, phase, hit, scuffed) {
  const key=['bossSmooth',state,phase,hit,scuffed].join(':');
  if(MAGMAW_ART.has(key))return MAGMAW_ART.get(key);
  const P=smoothPainter(64,52),{g,path,ell,line,grad,ink}=P;
  const sleep=state==='sleep',wear=sleep?0:Math.max(0,phase-1);
  const crouch=state==='crouch'?4:state==='land'?3:0,raised=state==='roar'||state==='rain';
  const mouth=raised||state==='die'||state==='spit';
  const stone=hit?grad(8,50,'#df9688','#a7515c'):sleep?grad(8,50,'#706780','#343047'):grad(6,50,wear?'#a88392':'#ad7b91',wear?'#4c3c58':'#53344e');
  const shade=hit?'#b55b64':sleep?'#373044':'#65435e', edge=hit?'#f6ceac':sleep?'#9a8ca2':'#dcabb0';
  const molten=wear>=2?'#ffe89a':'#ffb060';
  // Heavy paws, round plated arms and a broad squat silhouette, with the same clean contour as
  // the musicians. Every pose retains the original 64x52 frame and ground/mouth anchors.
  for(const side of [-1,1]) {
    ell(32+side*10,46.8,7,3.2,stone);
    for(const dx of [-2.4,0,2.4])path(`M ${32+side*10+dx-1} 47.3 Q ${32+side*10+dx-1.2} 49.7 ${32+side*10+dx+.8} 49 L ${32+side*10+dx+.9} 47.1 Z`,'#eee0c5');
    const ax=32+side*22,ay=raised?21:38+crouch*.5;
    path(`M ${32+side*12} ${28+crouch*.5} Q ${32+side*21} ${24+crouch*.4} ${ax} ${ay-3} L ${ax+side*3} ${ay+3} Q ${32+side*17} ${43+crouch*.4} ${32+side*11} 38 Z`,stone);
    ell(ax,ay,6.1,6.1,stone);
    for(let i=0;i<3;i++) {
      const x=ax-2.7+i*2.5;
      path(`M ${x-.8} ${ay+1.6} Q ${x-.8} ${ay+4.4} ${x+1} ${ay+4} L ${x+1.3} ${ay+1.7} Z`,'#f3e6cc');
    }
    path(`M ${ax-3.2} ${ay-2} Q ${ax} ${ay-4.8} ${ax+2.7} ${ay-2.7}`,null,edge,.55);
  }
  path(`M 22 ${22+crouch*.5} Q 32 ${17+crouch} 43 ${23+crouch*.5} C 53 30 51 43 44 47 Q 32 51 20 47 C 12 43 11 30 22 ${22+crouch*.5} Z`,stone);
  path(`M 22 ${32+crouch*.4} Q 32 ${27+crouch*.3} 43 ${33+crouch*.4} L 42 42 Q 32 47 22 42 Z`,grad(29,46,hit?'#ecbca2':'#ba8e9b',shade),ink,.65);
  path('M 20 42 Q 32 46 44 42',null,edge,.5);
  const crack=points=>{
    const d=points.map(([x,y],i)=>(i?'L ':'M ')+x+' '+(y+crouch*.35)).join(' ');
    path(d,null,'#3d293f',1.8);
    if(!sleep){path(d,null,wear?'#ff8547':'#df7952',wear?1:.65);path(d,null,molten,wear?.4:.25);}
  };
  for(const points of [[[20,30],[23,33],[22,37]],[[44,31],[41,35],[44,39]],[[30,43],[31,40],[34,38]]])crack(points);
  // Ivory horns curl in smooth, weighty arcs. Chipped ends and molten fractures stay damaged.
  const hy=25+crouch;
  g.save();g.translate(32,hy);
  for(const side of [-1,1]) {
    g.save();g.scale(side,1);
    const broken=wear>=2||(wear===1&&side<0),tip=broken?-14:-22;
    path(`M 8 -6 C 14 -9 17 -13 16 ${tip} C 23 ${tip+5} 22 -9 12 -4 Z`,grad(-22,-4,'#fff1cf','#ac8a6f'));
    path(`M 12 -7 Q 20 -11 17.2 ${tip+2}`,null,'#fff4d6',.6);
    for(let i=0;i<(broken?2:4);i++) {
      const y=-8-i*2.8;path(`M ${14+i*.65} ${y+.8} L ${18+i*.25} ${y-.5}`,null,'#b19378',.5);
    }
    if(broken){path('M 15 -14.2 L 17 -13.4 L 18.7 -14',null,'#754e53',1);line(15.6,-14,18,-13.9,'#ffb06a',.5);}
    g.restore();
  }
  path('M -12 -7 Q 0 -12 12 -7 Q 17 -2 14 6 Q 10 13 0 12 Q -11 13 -15 5 Q -17 -2 -12 -7 Z',stone);
  path('M -12 1 Q -10 9 -3 9',null,edge,.55);
  // Broad snout, tiny charcoal nostrils and deeply set amber eyes.
  for(const side of [-1,1]) {
    const ex=side*6.1;
    if(sleep)path(`M ${ex-2.8} -.8 Q ${ex} .8 ${ex+2.8} -1.1`,null,'#302538',1);
    else {
      const eyeH=wear>=2?1.5:2.1;
      ell(ex,-.9,3.3,eyeH,'#ffbd50');ell(ex,-1.1,2.4,eyeH*.65,'#fff0a1',null);
      ell(ex+side*.15,-.75,.75,eyeH*.85,'#33202e',null);ell(ex-.5,-1.6,.4,.4,'#fff9db',null);
    }
    path(`M ${side*1.2} -3 Q ${side*6} -8 ${side*12.3} -5.5 L ${side*11} -2.4 Q ${side*5.5} -2.8 ${side*2} -.9 Z`,shade);
    path(`M ${side*2} -3.7 Q ${side*6.4} -6.7 ${side*10} -5.3`,null,edge,.6);
  }
  ell(0,3.2,5.7,3.1,stone);
  for(const x of [-2.2,2.2])ell(x,3.2,.9,.6,'#3a2638',null);
  if(mouth) {
    path('M -8 5 Q 0 2.7 8 5 L 7 10 Q 0 14 -7 10 Z','#352033');
    path('M -5.5 9 Q 0 6.8 5.7 9 Q 3 12 -3.1 11.7 Z',grad(8,12,'#e95f40','#ffc771'),null);
    for(const x of [-5.3,-.8,4.1])path(`M ${x-1} 4.8 L ${x+1.5} 4.8 L ${x+.2} 8.5 Z`,'#fff0d0');
    for(const x of [-3.3,2.3])path(`M ${x-1} 10.7 L ${x+1} 10.7 L ${x} 8.8 Z`,'#ffe5b8');
  } else {
    path('M -8 5.7 Q 0 8.7 8 5.5 Q 4 10 -4 9.7 Z','#3a2030');
    for(const x of [-5,-.5,4.3])path(`M ${x-1} 6.8 L ${x+1.4} 6.8 L ${x+.1} 9.4 Z`,'#f3e5cb');
  }
  if(scuffed){path('M -11 4 L -8.7 5.2 L -9 7.4',null,'#573347',1.1);path('M -10.8 4.3 L -9 5.4',null,'#ffad70',.45);}
  g.restore();
  if(wear)for(const points of [[[24,38],[27,40],[26,45]],[[44,29],[46,32],[45,35]]])crack(points);
  if(wear>=2){path('M 18 32 L 22 33.5 L 20 36 Z','#ffb466');crack([[35,43],[38,41],[41,42]]);}
  MAGMAW_ART.set(key,P.art); return P.art;
}
function magmawPortraitArt(lookX,lookY,talk) {
  const ex=Math.round(lookX*3)/3,ey=Math.round(lookY*3)/3,key=['portrait',ex,ey,talk].join(':');
  if(MAGMAW_ART.has(key))return MAGMAW_ART.get(key);
  const A=mArt(32,45), G=['#694018','#a16b27','#d29e48','#efcc7c','#fff0bd'];
  A.line(12,4,16,2,'#77613e',null,0.4);A.line(16,2,20,4,'#77613e',null,0.4);A.line(16,2,16,10,'#bfa175',null,0.4);
  A.poly([[2,9],[30,9],[30,43],[2,43]],G[0]);
  A.poly([[3,10],[29,10],[26,13],[6,13],[6,39],[3,42]],G[3]);
  A.poly([[29,10],[29,42],[3,42],[6,39],[26,39],[26,13]],G[1]);
  A.fill(6,13,26,39,(x,y)=>lerpColor('#743d54','#291f35',(y-13)/26));
  // Painted bust on velvet; the horns, eyes and muzzle mirror the actual boss.
  A.soft(16,36.6,8.9,3.4,MAGMAW_STONE);
  paintMagmawHead(A,16,26.4,7.6,6.1,MAGMAW_STONE,{lookX:ex,lookY:ey,mouth:talk});
  A.line(11,34.5,16,36.3,G[3],null,0.55);A.line(16,36.3,21,34.5,G[3],null,0.55);A.ell(16,36.5,0.7,1,G[4]);
  for(const [x,y] of [[4.4,11.4],[27.6,11.4],[4.4,40.6],[27.6,40.6]]) {
    A.ell(x,y,1.2,1.2,G[2]);A.ell(x-0.3,y-0.3,0.45,0.45,G[4]);
  }
  for(let y=16;y<37;y+=4) for(const x of [4.5,27.5]) A.ell(x,y,0.6,1.1,G[2],null,x<10?-0.4:0.4);
  A.line(8,10.8,24,10.8,G[4],null,0.34);A.line(28.2,14,28.2,37,G[2],null,0.34);
  const img=A.canvas();MAGMAW_ART.set(key,img);return img;
}
function fineMagmawStatue(gold,damaged) {
  const A=mArt(40,144), C=gold ? ['#75501f','#a4772a','#d2aa50','#efcf80','#fff0bb'] : ['#403b51','#625a72','#8c839c','#b5acc1','#dbd5df'];
  // Carved plinth, fluted legs and a proud rounded armoured torso.
  A.poly([[0,122],[40,122],[40,144],[0,144]],C[0]);
  A.poly([[1,123],[39,123],[37,127],[3,127]],C[4]);
  A.poly([[3,127],[37,127],[37,138],[3,138]],C[2]);
  A.poly([[1,139],[39,139],[39,143],[1,143]],C[1]);
  A.line(3,140,36,140,C[3],null,0.4);
  for(const x of [11,29]) {A.soft(x,110,5,12,C);A.soft(x-1,119,7.2,3,C);}
  A.soft(20,85,18.6,24,C);A.soft(20,91,11,13,C);
  for(const side of [-1,1]) {
    A.line(20+side*12,73,20+side*17,63,C[0],null,5);
    A.line(20+side*12,73,20+side*17,63,C[2],null,3.6);
  }
  A.soft(35.4,59,3.7,5.1,C);A.line(35,59,35,48,C[2],null,4.4);A.soft(35,47,3.8,4.4,C);
  paintMagmawHead(A,20,50,12.7,12,C,{carved:true,horn:C[1],hornLight:C[4]});
  // Tall raised arm and the comic number-one glove retain the bridge's full walkable length.
  A.soft(4.4,72,4.1,6,C);A.line(4.3,72,4.3,23,C[1],null,6.2);A.line(2.8,69,2.8,26,C[3],null,0.8);
  const glove=['#8b2447','#bb3e5c','#e56278','#f797a5','#ffd3d7'];
  A.soft(7,17,6.1,7.5,glove);A.soft(4.6,6.7,2.8,6,glove);
  A.line(8.2,13.3,8.2,21.2,'#fff4df',null,1);A.line(6.5,14.8,8.2,13.3,'#fff4df',null,0.7);A.line(6.7,21.2,9.8,21.2,'#fff4df',null,0.7);
  A.poly([[9,130],[31,130],[31,136],[9,136]],'#82602e');A.poly([[10,130.5],[30,130.5],[30,135],[10,135]],'#d9b76d');
  A.line(13,132,26,132,'#fff0bc',null,0.34);A.line(16,133.5,24,133.5,'#a78143',null,0.34);
  // Fissures are incised into the sculpture, with warm polished edges.
  for(const path of [[[10,77],[14,81],[12,86]],[[26,84],[29,89],[26,94]],[[17,68],[20,70],[22,68]]]) for(let i=1;i<path.length;i++) {
    A.line(...path[i-1],...path[i],C[0],null,0.55);A.line(path[i-1][0]+0.4,path[i-1][1],path[i][0]+0.4,path[i][1],C[3],null,0.34);
  }
  if(gold) {
    A.poly([[12,35],[11,28],[16,31],[20,25],[24,31],[29,28],[28,35]],'#d8ae50');
    A.line(12,35,28,35,'#fff0b8',null,0.7);A.ell(20,32,1.1,1.5,'#af415a');
  }
  const img=A.outline().canvas();
  if(damaged) {
    const g=img.getContext('2d');g.setTransform(ART_R,0,0,ART_R,0,0);g.globalCompositeOperation='source-atop';
    for(const path of [[[14,32],[19,39],[16,46],[23,53],[20,59]],[[8,69],[15,76],[12,84],[23,91],[27,100]],[[14,83],[23,79],[32,84],[37,79]],[[4,41],[3,51],[6,58],[3,67]],[[10,104],[14,110],[11,117],[18,123]],[[4,126],[12,130],[18,128],[24,136],[34,139]]]) for(let i=1;i<path.length;i++) {
      fLine(g,path[i-1][0]+0.4,path[i-1][1],path[i][0]+0.4,path[i][1],C[4],2);
      fLine(g,...path[i-1],...path[i],INK,2);
    }
    g.globalCompositeOperation='source-over';
    for(const [x,y,w,h] of [[30,43,6,4],[35,76,5,5],[1,92,3,5],[0,128,4,4],[35,138,5,4]])g.clearRect(x,y,w,h);
  }
  return img;
}

const KILN_PILLAR_ART = new Map();
function kilnPillarArt(w, h, step) {
  const key=[w,h,step].join(':');
  if(KILN_PILLAR_ART.has(key))return KILN_PILLAR_ART.get(key);
  const heat=step/16,A=mArt(w,h);
  A.fill(0,0,w,h,(x,y)=>{
    const row=Math.floor(y/8.5), yy=y-row*8.5, xx=((x+(row%2)*8)%16+16)%16;
    const seam=yy<0.65||xx<0.55, edge=xx<1.2||yy<1.3;
    const cold=seam?'#2b2939':edge?'#8b8391':lerpColor('#716879','#474150',clamp(yy/10+x/w*0.3,0,1));
    const hot=seam?'#ac3025':edge?'#ffba70':lerpColor('#ff8c4b','#a6362e',clamp(y/h*0.65+x/w*0.25,0,1));
    return lerpColor(cold,hot,heat);
  });
  A.poly([[0,0],[w,0],[w-1.2,2],[1.2,2]],lerpColor('#a29aaa','#ffe6a2',heat));
  A.line(1.2,0.5,w-1.5,0.5,lerpColor('#c9bdc9','#fff5c8',heat),null,0.34);
  for(let i=0;i<w/11;i++) {
    const x=5+i*11.3, path=[[x,3],[x+0.7,7],[x-1.2,10.5],[x+0.5,15],[x-1,20],[x+1.2,24.8],[x,30]];
    for(let j=1;j<path.length;j++) {
      if(path[j][1]>=h)break;
      A.line(...path[j-1],...path[j],lerpColor('#383040','#d44b2a',heat),null,1.2);
      if(heat>0.2) A.line(...path[j-1],...path[j],lerpColor('#8c352e','#ffdc84',heat),null,0.35+heat*0.35);
    }
    if(heat>0.5&&h>18)A.line(x-1,10.5,x-3.6,13.7,'#fba454',null,0.34);
  }
  const img=A.canvas();KILN_PILLAR_ART.set(key,img);return img;
}
