'use strict';
// Winter wildlife and ice, painted at the fine art resolution; shared by both penguin roles.
const WINTER_ART = new Map();
function penguinArt(kind, pose, step = 0) {
  return kind === 'enemy' ? hostilePenguinArt(pose, step) : rescuePenguinArt(pose, step);
}
// PINGROO: the shared rescue penguin, drawn with the musicians' smooth painter.
// A plump pear silhouette, oversized cream face, little flippers and glossy eyes
// stay readable through the cage bars, and across all three rescue poses.
function rescuePenguinArt(pose, step = 0) {
  const key = 'rescue-clean:' + pose + ':' + step;
  if (WINTER_ART.has(key)) return WINTER_ART.get(key);
  const P = smoothPainter(28, 26), {g, path, ell, line, grad, ink} = P;
  const happy = pose === 'happy' || pose === 'wave', wave = pose === 'wave';
  const coat = grad(2, 24, '#657d98', '#263951');
  const wing = grad(7, 21, '#516d8b', '#24364d');
  const cream = grad(5, 23, '#fffef4', '#dbe7e3');
  const orange = grad(21, 25, '#ffd48b', '#df9353');
  // Tiny webbed feet peek out from under his tummy.
  ell(10, 23.6 - step * 0.3, 3.1, 1.15, orange, ink, 0.55, -0.08);
  ell(18, 23.6 + step * 0.15, 3.1, 1.15, orange, ink, 0.55, 0.08);
  line(9, 23.5, 10.5, 23.3, '#fff0c1', 0.35);
  line(17.5, 23.3, 19, 23.5, '#fff0c1', 0.35);
  // Far flippers have rounded, tapered tips, with an eager little raised wave.
  if (wave) {
    path('M 8 13 C 5 12 2.2 8.5 3.4 6.6 C 4.6 5.3 6.6 9 9.4 10.8 Z', wing);
    path('M 4.1 7.7 Q 5.2 10 7.6 11.6', null, '#8298ae', 0.45);
  } else if (happy) {
    path('M 8 12 C 5 11.7 2.2 13 3.1 14.4 Q 5 16 8.7 15.4 Z', wing);
  } else {
    path('M 8.2 11.8 C 4.7 12.3 3.8 16.8 5.1 19.4 Q 6.3 21 8.9 16 Z', wing);
  }
  path(happy ? 'M 20 12 C 23 11.7 25.8 13 24.9 14.4 Q 23 16 19.3 15.4 Z'
    : 'M 19.8 11.8 C 23.3 12.3 24.2 16.8 22.9 19.4 Q 21.7 21 19.1 16 Z', wing);
  // Head and body form one soft, continuous contour, without a seam at the neck.
  path('M 7.4 10.9 C 5.3 5.5 8.5 2.1 13.8 2.1 C 19.7 1.9 22.8 5.8 20.8 11 C 23.7 15.2 24.2 20.2 19.7 22.7 Q 14 25.1 8.4 22.7 C 3.9 20.5 4.9 15 7.4 10.9 Z', coat);
  path('M 10.3 3 Q 11.4 0.8 13 1.6 Q 14.3 2.1 15.3 2.5', coat, ink, 0.55);
  // The cream mask dips between the eyes and flows down into a round bib.
  path('M 14 6.3 C 11.7 3.8 8.5 5.3 8.2 8.5 Q 7.8 11.5 10 12.6 C 7.3 15.2 7.1 20.6 11 22 Q 14 23.2 17.2 22 C 21 20.5 20.5 15.1 18 12.6 Q 20.4 10.8 19.7 7.8 C 19.1 4.9 16.4 4.2 14 6.3 Z', cream, null);
  path('M 10 18.6 Q 10.8 21 13 21.3', null, '#fffdf1', 0.6);
  for (const x of [11, 17]) {
    if (happy) {
      path(`M ${x-1.15} 9.4 Q ${x} 7.6 ${x+1.15} 9.4`, null, ink, 0.65);
    } else {
      ell(x, 8.9, 1.28, 1.7, '#21334b', null);
      ell(x + 0.15, 9.35, 0.72, 0.85, '#344e68', null);
      ell(x - 0.32, 8.25, 0.42, 0.49, '#ffffff', null);
      ell(x + 0.42, 9.7, 0.18, 0.22, '#b2d9e8', null);
    }
  }
  if (!happy) {
    path('M 9.5 6.7 Q 10.7 6.5 11.9 5.9', null, '#3a506a', 0.45);
    path('M 16.1 5.9 Q 17.3 6.5 18.5 6.7', null, '#3a506a', 0.45);
  }
  ell(9.4, 11.3, 1.15, 0.5, '#ecc2b1', null);
  ell(18.6, 11.3, 1.15, 0.5, '#ecc2b1', null);
  // A little rounded bill, with a warm highlight and a smile when he is free.
  path('M 12.2 11.3 Q 14 10.5 15.8 11.3 Q 16 12 14 12.8 Q 12 12 12.2 11.3 Z', '#efb366', '#9e6843', 0.4);
  path('M 12.8 11.4 Q 14 11 15.2 11.4', null, '#ffe5ac', 0.35);
  if (happy) path('M 12.7 13 Q 14 14.1 15.3 13', null, '#9b725b', 0.4);
  WINTER_ART.set(key, P.art);
  return P.art;
}
function icicleArt(h) {
  const key='icicle:'+h;if(WINTER_ART.has(key))return WINTER_ART.get(key);
  const A=mArt(12,h+3), tip=[6.2,h+1.2];
  // Frosty ceiling mounting base: firmly attaches flush against the rock ceiling above
  A.poly([[0.5,0],[11.5,0],[10.5,1.4],[8.9,h*0.35],[8.2,h*0.53],tip,[3,h*0.38],[1.3,0.7]],'#65b8db');
  A.poly([[0.5,0],[6.1,0],[5.7,h*0.2],tip,[3,h*0.38],[1.3,0.7]],'#d4f3f5');
  A.poly([[3.5,0],[6.5,0],[7.5,h*0.22],tip,[5.7,h*0.2]],'#f8fffa');
  A.poly([[6.5,0],[11.5,0],[8.9,h*0.35],tip,[7.5,h*0.22]],'#92d5e6');
  A.line(3.1,1,4.4,h*0.35,'#ffffff',null,0.4);A.line(8.5,2,7.8,h*0.38,'#438fb6',null,0.34);
  A.ell(3.1,0.6,1.8,0.6,'#f5fff7');A.ell(8,0.6,1.8,0.6,'#dcf9f5');
  const img=A.outline('#376b8d',1).canvas();WINTER_ART.set(key,img);return img;
}

// Each staircase outcrop is one continuous ice rock, without a grid of square faces.
function iceRockSpireArt(w,h,seed) {
  const key='ice-spire:'+w+':'+h+':'+seed;if(WINTER_ART.has(key))return WINTER_ART.get(key);
  const A=mArt(w,h),k=seed%3,top=[[1.2,6],[6,1.5],[14,2.5],[22,0.7],[w-2,4],[w-0.4,h*0.22],[w-2,h*0.47],[w-0.7,h*0.76],[w-3,h-0.4],[3,h-0.4],[0.5,h*0.76],[1.6,h*0.39]];
  A.poly(top,'#81b7ce');
  A.poly([[1.2,6],[6,1.5],[14,2.5],[8,h*0.38],[1.6,h*0.39]],'#d4ecea');
  A.poly([[14,2.5],[22,0.7],[w-2,4],[19,h*0.46],[8,h*0.38]],'#afd8df');
  A.poly([[w-2,4],[w-0.4,h*0.22],[w-2,h*0.47],[19,h*0.46]],'#6da4c0');
  A.poly([[8,h*0.38],[19,h*0.46],[w-0.7,h*0.76],[17,h*0.86],[0.5,h*0.76],[1.6,h*0.39]],'#9bced8');
  A.poly([[0.5,h*0.76],[17,h*0.86],[w-3,h-0.4],[3,h-0.4]],'#6ca8c3');
  A.poly([[6,1.5],[14,2.5],[10,5],[3,7],[1.2,6]],'#edf8f1');
  A.line(6,7,8,h*0.2,'#f0fcf4',null,0.45);A.line(8,h*0.2,6.3,h*0.27,'#e1f7f0',null,0.34);
  A.line(21,h*0.15,18,h*0.34,'#7bb1c5',null,0.34);A.line(18,h*0.34,20,h*0.41,'#7bb1c5',null,0.34);
  A.line(10,h*0.52,16,h*0.63,'#cee9e8',null,0.34);A.line(16,h*0.63,14,h*0.69,'#cee9e8',null,0.34);
  const img=A.canvas();WINTER_ART.set(key,img);return img;
}

// A frozen floor is one continuous shelf of weathered ice. Facets and fissures cross tile boundaries;
// only the exposed shoreline gets chipped away. The level's flat collision surface stays unchanged.
function iceShelfArt(w,h,seed,openLeft=false,openRight=false,openBottom=false) {
  const key=['ice-shelf',w,h,seed,openLeft,openRight,openBottom].join(':');
  if(WINTER_ART.has(key))return WINTER_ART.get(key);
  const A=mArt(w,h),rng=mulberry32(seed*7919+137),knots=[[0,openLeft?2.1:0.35]];
  for(let x=10+rng()*9;x<w-5;x+=11+rng()*18)knots.push([x,0.15+rng()*2.15]);
  knots.push([w,openRight?1.8:0.35]);
  const bottomKnots=knots.map(([x])=>[x,0.5+rng()*3.3]);
  const bottomAt=x=>{let i=1;while(i<bottomKnots.length-1&&bottomKnots[i][0]<x)i++;const [ax,ay]=bottomKnots[i-1],[bx,by]=bottomKnots[i];return ay+(by-ay)*(x-ax)/(bx-ax);};
  const topAt=x=>{
    let i=1;while(i<knots.length-1&&knots[i][0]<x)i++;
    const [ax,ay]=knots[i-1],[bx,by]=knots[i];return ay+(by-ay)*(x-ax)/(bx-ax);
  };
  A.fill(0,0,w,h,(x,y)=>{
    const top=topAt(x),u=y/h;
    const left=openLeft?1.1+Math.sin(u*7+seed)*0.65:0;
    const right=openRight?w-1.1-Math.sin(u*8+seed*0.7)*0.65:w;
    const bot=h-bottomAt(x)*(openBottom?0.7:1);
    if(y<top||y>bot||x<left||x>right)return null;
    return softTone(['#598da9','#7dafc5','#a5cfd9','#d0e9e9','#eef8f1'],0.85-u*1.15+Math.sin(x*0.017+seed)*0.12);
  });
  const silhouette=A.buf.map(Boolean);
  // Broad, irregular planes belong to a single slab, rather than a row of glazed square blocks.
  for(let x=-8;x<w;){
    const span=23+rng()*43,end=x+span,pivot=x+span*(0.3+rng()*0.35),seam=h*(0.34+rng()*0.28);
    A.poly([[x,topAt(clamp(x,0,w))+0.5],[end,topAt(clamp(end,0,w))+0.6],[pivot,seam],[x-4,h*(0.45+rng()*0.35)]],rng()>0.5?'#b9dfe3':'#aed8df');
    A.poly([[end,1],[end+8,h*0.64],[pivot+span*0.3,h],[pivot,seam]],rng()>0.5?'#8bbccd':'#93c5d3');
    if(rng()>0.35)A.poly([[x-4,h*0.8],[pivot,seam],[pivot+span*0.3,h],[x+span*0.06,h]],rng()>0.5?'#83b7ca':'#74aac1');
    if(rng()>0.35){
      const sx=pivot-2,sy=seam+0.2;
      A.line(sx,sy,sx+3,h*0.79,'#d7eeeb',null,0.34);
      A.line(sx+3,h*0.79,sx+1.6,h*0.91,'#d7eeeb',null,0.34);
      A.line(sx+3,h*0.79,sx+5.5,h*0.74,'#acd3dc',null,0.34);
    }
    x=end;
  }
  // A thin frosted lip follows the uneven crest, with a few scuffed glints along its upper face.
  for(let i=1;i<knots.length;i++){
    const [x0,y0]=knots[i-1],[x1,y1]=knots[i];
    A.poly([[x0,y0],[x1,y1],[x1,y1+0.7],[x0,y0+0.85]],'#effaf2');
    A.line(x0+1.5,y0+1.9,Math.min(x1,x0+6),y0+1.5,'#d4eceb',null,0.34);
  }
  for(let i=0;i<A.buf.length;i++)if(!silhouette[i])A.buf[i]=null;
  const img=A.canvas();WINTER_ART.set(key,img);return img;
}

// Frostwind's diving hunters are distinct from the rounded, pale rescue penguins.
function hostilePenguinArt(pose,step=0) {
  const key='hostile-penguin:'+pose+':'+step;if(WINTER_ART.has(key))return WINTER_ART.get(key);
  const A=mArt(28,24),C=['#10192b','#203148','#35516b','#577b93','#94b4c0'],bill=['#744032','#ad6540','#df9853','#f3c27c','#ffe1a5'];
  const slide=pose==='slide',headX=slide?21:15,headY=slide?12:7.5;
  if(slide){
    A.soft(13,16.5,9.5,4.2,C);A.poly([[4,15],[1,10],[9,13]],C[1]);A.poly([[6,18],[3,22],[18,20]],C[1]);
    A.soft(14,18.4,7,1.7,['#647f87','#8ea5a3','#b1bfb3','#ced2bc','#e4e1c7']);
    A.poly([[13,15],[8,21],[20,17]],C[2]);A.line(10,19,16,16,C[3],null,0.34);
    A.soft(21,13,4.4,4.7,C);A.line(17,13,17.5,19,'#843647',null,1.6);A.poly([[17,18],[11,22],[10,20],[16,16]],'#b04e5b');
  }else{
    for(const [x,y] of [[10,22-step*0.4],[18,22+step*0.2]]){A.soft(x,y,2.5,0.8,bill);for(let i=0;i<2;i++)A.poly([[x+i,y-0.3],[x+i+0.8,y-0.3],[x+i+1.2,y+0.5]],'#eee0b9');}
    A.soft(14,15.6,6.4,6.7,C);
    A.poly([[10,12],[17,11],[18.6,19.8],[14.2,21],[10.8,19]],'#aab8ad');
    A.poly([[9,12],[5,19],[6,21],[10.5,16]],C[1]);A.poly([[20,12],[23,18],[23,20],[18,17]],C[1]);
    A.soft(15,7.8,4.8,5.4,C);A.poly([[11,5],[9,1],[14,3.7],[16,1.4],[17.5,5]],C[1]);
    A.line(9.4,12.5,20,12,'#9d3e4f',null,1.7);A.line(10,12,19,11.7,'#d67c7d',null,0.45);A.poly([[10.5,13],[7,17],[9,18],[12,13]],'#a74555');
  }
  // Narrow amber eyes under sharply sloping brows make their threat readable before the dive.
  const ex=headX+1.3,ey=headY+0.1;
  A.poly([[ex-2.2,ey-1.1],[ex+1.7,ey+0.2],[ex+1,ey+1.1],[ex-1.8,ey+0.8]],'#e3b750');
  A.line(ex+0.4,ey-0.1,ex+0.4,ey+0.8,'#1b2430',null,0.45);
  A.line(ex-2.5,ey-1.6,ex+1.8,ey-0.15,'#0c1324',null,1.05);
  A.poly([[headX+2.5,headY+2],[27,headY+3.2],[headX+2.5,headY+4]],bill[2]);
  A.line(headX+3,headY+3.2,25.5,headY+3.4,'#795242',null,0.34);
  A.poly([[headX-2,headY+2],[headX+0.7,headY+3],[headX+1,headY+5],[headX-2.7,headY+4]],'#8a9d9b');
  const img=A.outline('#111a2b',2).canvas();WINTER_ART.set(key,img);return img;
}
