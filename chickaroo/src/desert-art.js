'use strict';
// Sunscorch Dunes: native ART_R drawings, in world units, with shared materials and stable pose caches.
const DUNE_ART = new Map();
const DUNE_STONE = ['#714431','#a06c45','#c99661','#e7bd83','#fbe0ae'];
const DUNE_GOLD = ['#674126','#a56b28','#d7a241','#f2d279','#fff1bd'];
const DUNE_CLAY = ['#743d3d','#a55745','#ce8060','#eaa987','#f8d4b4'];
const DUNE_TEAL = ['#154e58','#237c80','#3cb6ad','#81dace','#cff5df'];
function duneBake(key,w,h,paint,outline=2) {
  if(DUNE_ART.has(key))return DUNE_ART.get(key);
  const A=mArt(w,h);paint(A);const img=(outline?A.outline(INK,outline):A).canvas();DUNE_ART.set(key,img);return img;
}
function duneRing(A,cx,cy,rx,ry,c,t=0.4) {
  A.fill(cx-rx,cy-ry,cx+rx,cy+ry,(x,y)=>{const d=Math.hypot((x-cx)/rx,(y-cy)/ry);return d<=1&&d>=1-t/Math.min(rx,ry)?c:null;});
}
function duneSnakeHeadArt(tongue) {
  return duneBake('snakeHead:'+tongue,15,11,A=>{
    A.soft(6.7,6,4.9,2.4,DUNE_STONE);A.soft(8.8,6.3,3,1.7,DUNE_GOLD);
    A.ell(7,7.6,4.7,0.5,'#fce4ae');A.line(7,7.1,11.5,7.1,'#6f4b35',null,0.34);
    A.ell(8.1,5.1,1.1,0.85,'#edca6d');A.ell(8.3,5.1,0.28,0.7,INK);A.ell(8,4.8,0.25,0.24,'#fff6d3');
    A.poly([[6.8,4.5],[7.1,1.7],[8.3,4.4]],'#d8b57b');A.line(6.4,4.2,9,4.5,'#846141',null,0.6);
    A.ell(10.7,6,0.25,0.24,'#4d3529');
    if(tongue){A.line(11.2,7.5,13.2,7.5,'#bc4655',null,0.34);A.line(13,7.5,14.1,6.6,'#e1797b',null,0.34);A.line(13,7.5,14.1,8.4,'#e1797b',null,0.34);}
  });
}
function duneScorpionArt(state,frame,step) {
  return duneBake('scorpion:'+state+':'+frame+':'+step,70,34,A=>{
    const C=['#552d36','#8b3f3f','#bf6553','#e99873','#f7c7a0'];
    for(let i=0;i<4;i++){
      const x=14+i*3.4,sw=Math.sin(step*Math.PI+i)*0.7;
      A.line(x,27,x-2,29.5+sw,C[0],null,0.7);A.line(x-2,29.5+sw,x-1,32,C[2],null,0.55);
      A.line(x,27.5,x+0.8,30.5-sw,C[1],null,0.7);A.line(x+0.8,30.5-sw,x+3,31.6,C[3],null,0.45);
    }
    const u=state==='strike'?frame/7:0,tip=state==='cock'?[23,7]:state==='strike'?[23+36*u,7+13*u]:state==='recover'?[29,12]:[24,10];
    const ctrl=state==='strike'?[20,6]:[7,3],points=[];
    for(let i=0;i<=24;i++){const t=i/24,v=1-t;points.push([16*v*v+2*v*t*ctrl[0]+t*t*tip[0],25*v*v+2*v*t*ctrl[1]+t*t*tip[1]]);}
    points.forEach(([x,y],i)=>A.soft(x,y,2.6-i*0.04,2.3-i*0.03,C));
    for(let i=2;i<points.length-1;i+=4){const [x,y]=points[i];A.line(x-1,y-0.6,x+0.7,y-0.3,'#a25049',null,0.34);}
    A.poly([[tip[0]-1,tip[1]-1.5],[tip[0]+3.4,tip[1]-0.4],[tip[0]+2.9,tip[1]+4],[tip[0]+1.5,tip[1]+1.5]],'#f3d3ac');
    A.soft(21,26,8,4.1,C);for(let i=0;i<4;i++)A.line(15+i*3,23.5,15.4+i*3,27.7,'#854244',null,0.34);
    for(const [x,y] of [[28.5,25],[29,28]]){A.line(26,y,x+2,y-1,C[1],null,0.9);A.soft(x+3,y-0.4,2.5,1.5,C);A.poly([[x+3,y-1.5],[x+7,y-2.8],[x+5,y-0.2],[x+7,y+1.3],[x+3,y+0.8]],C[3]);}
    for(const x of [24,27]){A.ell(x,24.1,0.65,0.7,'#f3deba');A.ell(x+0.2,24.2,0.28,0.45,INK);}
  });
}
function duneSharkArt(finOnly) {
  return duneBake('shark:'+finOnly,34,28,A=>{
    const C=['#574f51','#7c7670','#a7a18b','#d3c9aa','#eee1bb'];
    A.poly([[13,16],[18,3],[19,16]],C[1]);A.poly([[14,15],[18,4],[17.5,16]],C[3]);
    if(finOnly)return;
    A.poly([[8,15],[1,8],[3,17],[1,24],[10,19]],C[1]);A.poly([[3,10],[5,16],[9,16]],C[3]);
    A.soft(19,17,11,5.3,C);A.soft(27,17.7,3.6,3.1,C);
    A.fill(8,18,31,24,(x,y)=>((x-19)/11)**2+((y-17)/5.3)**2<1?'#f7e8c7':null);
    A.poly([[15,19],[21,25],[19,20]],C[1]);A.line(13,13.8,12.6,17.4,C[0],null,0.34);A.line(15,14.2,14.5,17.8,C[0],null,0.34);
    A.ell(25,15.4,1.5,1.4,'#fdf4dc');A.ell(25.6,15.6,0.6,0.9,INK);A.line(23.5,13.9,26.5,14.2,C[0],null,0.55);
    A.poly([[23,19],[30,18.6],[28.5,21],[23,21]],'#53323c');
    for(let i=0;i<4;i++)A.poly([[23.4+i*1.55,19],[24.4+i*1.55,18.9],[24+i*1.55,20.2]],'#fff6e3');
    A.ell(29.4,17,0.3,0.25,'#4c3a34');A.line(10,15,17,13.1,'#ebe0bd',null,0.34);
  });
}
function duneVultureArt(frame,aim,rock) {
  return duneBake('vulture:'+frame+aim+rock,42,32,A=>{
    const C=['#292732','#45404a','#66585a','#908074','#c1aa8d'],flap=Math.sin(frame*Math.PI/4);
    for(const side of [-1,1]){
      A.poly([[21,17],[21+side*8,12-flap*4],[21+side*18,10-flap*6],[21+side*17,17-flap*4],[21+side*7,20]],C[1]);
      for(let i=0;i<6;i++)A.soft(21+side*(6+i*2.2),16-flap*(i+1)*0.8,1.3,4-i*0.22,C,null,side*0.55);
    }
    A.soft(21,19,5.5,5,C);A.soft(24,15.5,3.7,3.1,['#9c9087','#c3b7a4','#e3dac2','#f8eed8','#fff8e6']);
    A.soft(27.5,11.7,2.3,3.8,DUNE_CLAY,null,0.25);A.soft(29,9.2,3.1,2.9,DUNE_CLAY);
    A.poly([[31,9],[35,10],[35,12.8],[33.7,11],[31,11.2]],'#e5ba66');
    A.ell(29.5,8.9,0.9,0.8,'#f5eed9');A.ell(29.8,9,0.35,0.55,INK);A.line(28.4,7.7,30.7,8.1,aim?'#b23f4f':'#714a47',null,0.6);
    for(const x of [19,23]){A.line(x,23,x,27,'#caab75',null,0.6);A.line(x,27,x+2,27.5,'#f3d8a5',null,0.34);}
    if(rock){A.poly([[17,26],[21,24],[25,27],[24,30],[19,31],[16,29]],'#8e7663');A.poly([[17,26],[21,24],[23,26],[19,28]],'#c5ac87');A.line(19,29,22,27,'#5a4e4b',null,0.34);}
  });
}
function duneUrnArt(breakable=false,large=false,color='#c17c58') {
  return duneBake('urn:'+breakable+large+color,18,large?23:17,A=>{
    const h=large?23:17,C=breakable?['#726a69','#a5a098','#d2cbb8','#efe7d3','#fff5df']:['#683c39','#975a47',color,'#e0ad7e','#f4d1a3'];
    const by=h-1;
    A.fill(2,4,16,by,(x,y)=>{
      const u=(y-4)/(by-4),r=4.7*Math.sin(Math.PI*(u*0.78+0.12))+0.6,dx=(x-9)/r;
      return Math.abs(dx)<1?softTone(C,-dx*0.65-u*0.2+Math.sqrt(1-dx*dx)*0.7):null;
    });
    A.soft(9,by-0.7,3.1,0.65,C);A.soft(9,4,4.8,1.3,C);A.ell(9,3.8,3.4,0.65,'#49332e');
    A.line(5.4,7.7,12.4,7.7,breakable?'#b6a77e':'#346f70',null,0.55);
    for(let i=0;i<4;i++)A.poly([[5.5+i*1.8,8.5],[6.3+i*1.8,9.7],[7.1+i*1.8,8.5]],breakable?'#9f967f':'#356d6d');
    A.line(5.9,11.2,6.2,12.8,C[4],null,0.34);A.line(8,by-2,10.6,by-2,C[1],null,0.34);
  },breakable?2:0);
}
function duneCactusArt(h=32,big=false,flower=true) {
  h=Math.round(h);const w=big?60:30;
  return duneBake('cactus:'+h+big+flower,w,h+12,A=>{
    const C=['#244e47','#39795a','#5d9e6a','#92bd7b','#c7d99c'],cx=w/2,bot=h+11,rad=big?7.8:3.2;
    const stem=(x,top,r,bottom)=>{
      A.fill(x-r,top-r,x+r,bottom,(xx,y)=>{
        const u=(xx-x)/r;if(y<top&&u*u+((y-top)/r)**2>1)return null;
        return softTone(C,-u*0.8+0.35+Math.cos(u*15)*0.08);
      });
      for(let yy=top+4;yy<bottom-2;yy+=big?6:4)for(const u of [-0.7,0.3,0.8]){
        const xx=x+u*r;A.ell(xx,yy+u,0.35,0.45,'#e6d8b5');A.line(xx,yy+u,xx+u*1.3,yy-1.1,'#efe3c3',null,0.34);
      }
    };
    for(const [side,at,len] of [[-1,0.36,0.27],[1,0.55,0.25]]){
      const ax=cx+side*(big?20:9),yy=bot-h*at;
      A.soft((cx+ax)/2,yy,Math.abs(cx-ax)/2+rad*0.45,rad*0.42,C);
      stem(ax,yy-h*len,rad*0.43,yy);A.soft(ax,yy,rad*0.43,rad*0.43,C);
    }
    stem(cx,bot-h+rad,rad,bot);
    if(flower){for(let i=0;i<7;i++){const a=i*Math.PI*2/7;A.soft(cx+Math.cos(a)*(big?3.2:1.8),bot-h+Math.sin(a)*1.6,big?2.6:1.4,1.2,['#a53d64','#d76687','#ee9cab','#ffd0c6','#fff0dd']);}A.ell(cx,bot-h,1.3,0.8,'#efd38c');}
  },0);
}
function duneLampArt(teapot=false) {
  return duneBake('lamp:'+teapot,24,15,A=>{
    const C=teapot?['#7f919f','#b7c8ce','#e0e8df','#f9f7e7','#ffffff']:DUNE_GOLD;
    duneRing(A,5,7.5,3.5,3,C[2],1.05);A.soft(11.5,9,7.2,3.8,C);
    A.poly([[15,8],[19.3,6],[22.7,3.4],[22.7,5.7],[20.6,9],[16,10.2]],C[2]);A.line(18,7,22,4.7,C[4],null,0.34);
    A.soft(11.4,5.8,4.5,0.9,C);A.soft(11.4,4,1,1.2,C);A.soft(11,13,4.4,0.65,C);
    A.line(8.1,7.5,13.7,7.5,C[4],null,0.34);A.line(8,10.5,14.5,10.5,C[1],null,0.34);
    if(teapot)for(const x of [8,12,15]){A.ell(x,9,0.8,1,'#407b9c');A.ell(x-0.3,8.4,0.3,0.3,'#b3d8df');}
    else{A.ell(11.8,9.2,1.2,1.25,'#2e928a');A.ell(11.4,8.8,0.45,0.4,'#c0ecdd');}
  });
}
function duneGenieArt(look=0) {
  return duneBake('genie:'+look,36,47,A=>{
    const C=['#334177','#5167ad','#7c9cd5','#b1c9e9','#e0ecf4'];
    A.soft(18,32,6,7,C);A.soft(18.7,37,3.1,3.8,C);A.soft(18,27,12,8,C);
    A.soft(9,31,4,4,C);A.soft(27,31,4,4,C);A.soft(18,33,11,2.5,C);A.line(12,32.4,22,33.5,C[4],null,0.34);
    for(const x of [9,26]){A.soft(x,32.2,1.4,2.4,DUNE_GOLD);A.line(x-0.6,30.5,x-0.6,33.5,DUNE_GOLD[4],null,0.34);}
    for(const x of [9,27])A.soft(x,20,2,2.7,C);A.soft(18,20,8.3,8.2,C);
    A.soft(18,12,9.3,4.8,['#723347','#aa4f60','#d97779','#f1a8a0','#ffd3b7']);
    A.line(10,13,25,12.8,'#f2c788',null,0.8);A.line(11,10.3,21,7.7,'#e1a09a',null,0.45);
    A.poly([[18,10],[16,7.8],[18,5.4],[20,7.8]],'#f6d48b');A.ell(18,7.5,0.65,0.8,'#43c2b7');
    A.soft(21.3,5.8,1.3,4,['#a4b6c6','#cad8dd','#edf0df','#ffffff','#ffffff'],null,0.4);A.line(20.8,8.2,22.7,2.4,'#b4bfb6',null,0.34);
    for(const x of [14,22]){A.ell(x,19,1.55,1.7,'#f9f5df');A.ell(x+look*0.45,19.3,0.65,1,'#243c66');A.ell(x-0.35,18.6,0.3,0.35,'#ffffff');A.line(x-1.5,16.9,x+1.3,17.2,'#384567',null,0.65);}
    A.soft(18,22,1.3,2,C);A.ell(18,25.7,3.3,1.4,'#292a42');A.ell(18,25.2,2.4,0.55,'#fff4dc');
    for(const side of [-1,1]){A.soft(18+side*3,23.6,3.2,0.8,['#25253b','#333345','#434153','#5d5766','#7c7080'],null,side*0.25);A.line(18+side*4.6,23.5,18+side*5.7,22.8,'#303046',null,0.6);}
    duneRing(A,27.6,22.6,1.6,2.2,'#edc879',0.65);
  });
}
function duneFridgeArt(doorStep=0) {
  return duneBake('fridge:'+doorStep,53,53,A=>{
    const C=['#778e9c','#a6bcc6','#d1e0dd','#eef1e3','#fffcee'],cold=['#547e9b','#8db9ca','#bad9db','#dff0e6','#f5f7e9'];
    A.fill(2,3,33,49,(x,y)=>softTone(C,1.2-(x-2)*0.045-y*0.008));A.soft(17.4,3.8,15,2,C);
    A.line(4,17,31,17,'#617889',null,0.65);A.line(30.5,5,30.5,47,'#a0b2b8',null,0.6);
    for(const yy of [8,23]){A.soft(6,yy+2,0.9,3,C);A.line(5.6,yy,5.6,yy+4,'#ffffff',null,0.34);}
    A.poly([[18,27],[21,25],[25,25],[27,23.6],[27,28],[25,27],[21,28]],'#d87967');A.ell(22,26,0.3,0.3,'#562d38');
    for(const x of [5,27])A.soft(x,50,2.3,0.7,['#394451','#515c66','#74818a','#a8afb0','#d8d4c5']);
    if(!doorStep)return;
    for(const [top,bot] of [[5,16],[19,47]]){
      A.fill(4,top,29,bot,(x,y)=>softTone(cold,0.5-(x-4)*0.03));A.line(5,bot-1,28,bot-1,'#688e9f',null,0.55);
      const dw=doorStep/8*14;A.poly([[32,top-1],[32+dw,top+0.7],[32+dw,bot+1],[32,bot]],C[2]);A.line(32+dw-1,top+3,32+dw-1,top+8,C[0],null,0.65);
    }
    for(const yy of [28,38])A.line(5,yy,28,yy,'#eefaf3',null,0.6);
    A.soft(14,11,3.5,2.1,DUNE_CLAY);A.line(16,10,21,8.8,'#f5e5c5',null,1.2);A.ell(21,8.8,1,1,'#fff6e3');
    A.poly([[7,22],[10,20],[12,22],[12,27],[7,27]],'#f9f5df');A.line(7.5,22,11.5,22,'#5886aa',null,0.6);
    A.soft(21,25,3.8,1.4,cold);A.poly([[24,25],[27,23.5],[27,26.5]],'#6195af');A.ell(19,24.7,0.3,0.3,INK);
    A.soft(10,34,1.9,3,['#35734e','#649c5f','#a2c782','#d5e4ad','#eef1cc']);
    A.poly([[17,42],[25,41],[25,46],[17,46]],'#dbb67a');A.line(18,42.5,24,42,'#f8e0a8',null,0.6);A.line(17.5,44,24.5,43.5,'#78a771',null,0.6);
  });
}
function duneCarpetArt(frame) {
  return duneBake('carpet:'+frame,50,12,A=>{
    const wave=x=>Math.sin(frame*Math.PI/6+x*0.17)*0.8;
    A.fill(3,1,47,10,(x,y)=>{const v=y-wave(x);if(v<2||v>8)return null;const edge=x<5||x>45||v<3||v>7;return edge?softTone(DUNE_GOLD,0.8-(v-2)*0.16):softTone(['#612b46','#893b57','#b3596c','#d48686','#ecb1a0'],0.6-(v-3)*0.22);});
    for(let i=0;i<6;i++){const x=8+i*6.5,y=5+wave(x);A.poly([[x-2,y],[x,y-1.5],[x+2,y],[x,y+1.5]],'#3d8b94');A.line(x-1,y,x+1,y,'#badbd3',null,0.34);}
    for(const x of [1,48])for(let i=0;i<4;i++){const y=3+i*1.5+wave(x);A.line(x<25?3:46,y,x,y+0.7,'#e9c987',null,0.34);A.ell(x,y+0.8,0.4,0.45,'#e9c987');}
  });
}
// A tapered limb or neck, shaded across its continuous surface instead of assembled from round stamps.
function duneCamelTube(A,points,radii,C) {
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,maxR=0;
  for(let i=0;i<points.length;i++){
    const px=points[i][0],py=points[i][1],r=radii[i];
    if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py;if(r>maxR)maxR=r;
  }
  const pad=maxR+1,segs=[];
  for(let i=1;i<points.length;i++){
    const ax=points[i-1][0],ay=points[i-1][1],bx=points[i][0],by=points[i][1],dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
    if(!den)continue;
    segs.push([ax,ay,dx,dy,1/den,1/Math.sqrt(den),radii[i-1],radii[i]-radii[i-1]]);
  }
  A.fill(x0-pad,y0-pad,x1+pad,y1+pad,(x,y)=>{
    let best=Infinity,across=0;
    for(let i=0;i<segs.length;i++){
      const s=segs[i],ax=s[0],ay=s[1],dx=s[2],dy=s[3];
      const t=clamp(((x-ax)*dx+(y-ay)*dy)*s[4],0,1),r=s[6]+s[7]*t,invR=1/r;
      const qx=x-ax-t*dx,qy=y-ay-t*dy,d=Math.hypot(qx,qy)*invR;
      if(d<best){best=d;across=(qx*dy-qy*dx)*s[5]*invR;}
    }
    return best<=1?softTone(C,-across*0.55+Math.sqrt(1-best*best)*0.55):null;
  });
}
function duneCamelArt(duck=0,mouth=0,chew=0) {
  const jawStep=mouth===1?0:[0,1,2,1][chew%4];
  return duneBake('camel-refined:'+duck+':'+mouth+':'+jawStep,90,51,A=>{
    const C=['#73503a','#986f49','#ba9263','#d8b585','#efd3a7'];
    const WOOL=['#4e3322','#6b4831','#8c6343','#ad835c','#cca47a'];
    const hy=6+duck*14;
    // Tail hanging off the rump, ending in a dark tufted switch.
    duneCamelTube(A,[[10.2,30.5],[6.8,34.6],[5.2,39.5]],[1.2,0.75,0.48],C);
    A.soft(5.1,41.2,1.15,2.4,WOOL,null,-0.15);
    for(const dx of [-0.4,0.1,0.5])A.line(5.1+dx,40.2,4.8+dx*1.3,43.2,'#422a1c',null,0.34);

    // Far ear (behind head).
    A.soft(66.8,hy-1.1,1.3,2.5,C,null,0.28);

    // Unified camel silhouette & 3D shading: barrel ribcage, tucked flank, two woolly humps,
    // deep J-curved neck, and characteristic Roman-nosed head fused into one seamless body.
    const neckPts=[],neckSegs=[];
    for(let i=0;i<=24;i++){
      const u=i/24,v=1-u;
      // Starts deep inside the chest/shoulder (52, 33.5), dips into a natural camel U/J curve,
      // and rises up to the skull base (67.2, hy+4.2).
      const nx=52*v*v*v + 3*59.5*v*v*u + 3*63.5*v*u*u + 67.2*u*u*u;
      const ny=33.5*v*v*v + 3*(35.8+duck*2)*v*v*u + 3*(hy+16.5)*v*u*u + (hy+4.2)*u*u*u;
      const nr=6.2*v*v + (4.3*2*v*u) + 3.05*u*u;
      neckPts.push([nx,ny,nr]);
      if(i>0){
        const [ax,ay,ar]=neckPts[i-1],dx=nx-ax,dy=ny-ay,den=dx*dx+dy*dy;
        neckSegs.push([ax,ay,ar,dx,dy,1/den,1/Math.sqrt(den),nr-ar,Math.abs(dx)]);
      }
    }

    A.fill(5,Math.min(14,hy-3),85,46,(x,y)=>{
      // 1) Torso distance & surface normal
      let dBody=1e4,nyBody=0,nxBody=0,isHump=0;
      const u=(x-34.5)/27.8;
      if(Math.abs(u)<1&&y>=17&&y<=45){
        const edge=Math.sqrt(1-u*u);
        const h1=4.8*Math.exp(-(((x-19.5)/5.8)**2)),h2=4.5*Math.exp(-(((x-45.5)/6.2)**2));
        const top=32.8-7.8*edge-h1-h2;
        // Realistic camel underline: deep brisket/chest in front, tucked-up abdomen in the rear
        const tuck=2.4*Math.exp(-(((x-23)/9.5)**2))-1.6*Math.exp(-(((x-47)/9)**2));
        const bot=34.2+8.8*edge-tuck;
        const mid=(top+bot)*0.5,rad=Math.max(0.5,(bot-top)*0.5),invRad=1/rad;
        dBody=Math.abs(y-mid)*invRad;
        nyBody=(y-mid)*invRad;
        nxBody=u*0.45;
        if(y<top+3.2&&(h1>1.2||h2>1.2))isHump=clamp((top+3.2-y)/3.2,0,1);
      }
      // 2) Neck distance & surface normal
      let dNeck=1e4,nyNeck=0,nxNeck=0;
      if(x>=44&&x<=73&&y>=hy-2&&y<=42){
        for(let i=0;i<neckSegs.length;i++){
          const s=neckSegs[i],ax=s[0],ay=s[1],dx=s[3],dy=s[4];
          const t=clamp(((x-ax)*dx+(y-ay)*dy)*s[5],0,1),r=s[2]+s[7]*t,invR=1/r;
          const qx=x-ax-t*dx,qy=y-ay-t*dy,d=Math.hypot(qx,qy)*invR;
          if(d<dNeck){
            dNeck=d;
            // Normal pointing down/right in screen space
            nyNeck=(qy*s[8]-qx*dy)*s[6]*invR;
            nxNeck=qx*0.5*invR;
          }
        }
      }
      // 3) Head & muzzle distance
      let dHead=1e4,nyHead=0,nxHead=0;
      if(x>=60&&y>=hy-2&&y<=hy+12){
        const cranium=Math.hypot((x-68.6)/5.6,(y-(hy+3.6))/4.3);
        // Slightly arched Roman nose bridge tapering to a pendulous split lip
        const bridgeY=hy+5.8+Math.max(0,(x-72)*0.18)-Math.sin(clamp((x-69)/11,0,1)*Math.PI)*0.65;
        const muzzle=Math.hypot((x-75.8)/7.2,(y-bridgeY)/3.15);
        const jaw=Math.hypot((x-71.5)/4.8,(y-(hy+6.2))/2.8);
        dHead=Math.min(cranium,muzzle,jaw);
        nyHead=(y-(hy+4.8))/4.5;
        nxHead=(x-71)*0.1;
      }

      if(dBody>1.25&&dNeck>1.25&&dHead>1.25)return null;
      // Smooth polynomial union (smin) so neck, shoulder, chest, and head meld with zero seam
      const smin=(a,b,k)=>{const h=clamp(0.5+0.5*(b-a)/k,0,1);return b*(1-h)+a*h-k*h*(1-h);};
      const dBN=smin(dBody,dNeck,0.22);
      const dAll=smin(dBN,dHead,0.18);
      if(dAll>1)return null;

      // Blend normals smoothly by proximity weight
      const dB2=Math.min(100,dBody*dBody),dN2=Math.min(100,dNeck*dNeck),dH2=Math.min(100,dHead*dHead);
      const wB=1/Math.max(0.001,dB2*dB2),wN=1/Math.max(0.001,dN2*dN2),wH=1/Math.max(0.001,dH2*dH2),wSum=1/(wB+wN+wH);
      const ny=(nyBody*wB+nyNeck*wN+nyHead*wH)*wSum;
      const nx=(nxBody*wB+nxNeck*wN+nxHead*wH)*wSum;
      const rim=Math.sqrt(Math.max(0,1-dAll*dAll));

      // Subtle anatomical crease where the base of the neck sits in front of the shoulder blade,
      // without drawing a dark outline around the top or back of the neck.
      const shoulderCrease=(x>52&&x<59.5&&y>27&&y<37.5)?Math.exp(-(((x-56)/1.6)**2)-(((y-32.5)/4.2)**2))*0.28:0;
      // Subtle flank fold at the groin/stifle
      const flankCrease=(x>21&&x<28&&y>34&&y<41)?Math.exp(-(((x-24.5)/1.8)**2)-(((y-37.5)/3.2)**2))*0.22:0;
      // Ribcage volume highlight
      const barrelLit=Math.exp(-(((x-35)/16)**2)-(((y-31)/5.5)**2))*0.18;

      const shade=-ny*0.78 - nx*0.18 + rim*0.38 + barrelLit - shoulderCrease - flankCrease;
      // Woolly crown on the humps & mane ridge along underside of neck
      const neckWool=(dNeck<0.95&&dBody>1.05&&nyNeck>0.48)?clamp((nyNeck-0.48)*2.2,0,0.65):0;
      const woolMix=Math.max(isHump*0.65,neckWool);
      const baseCol=softTone(C,shade);
      return woolMix>0.05?lerpColor(baseCol,softTone(WOOL,shade+0.15),woolMix):baseCol;
    });

    // Tufted wool texture along the two hump crowns and throat mane.
    for(const [hx,hy0] of [[17.5,20.8],[19.8,20.3],[22,20.9],[43.5,21.2],[45.8,20.6],[48,21.3]]){
      A.line(hx,hy0,hx-0.6,hy0+1.3,'#6b4831',true,0.4);
      A.line(hx+0.5,hy0+0.2,hx+0.2,hy0+1.4,'#efd3a7',true,0.34);
    }
    for(let i=4;i<=16;i+=2){
      const [nx,ny,nr]=neckPts[i];
      A.line(nx+0.8,ny+nr*0.65,nx+1.4,ny+nr*0.88,'#6b4831',true,0.38);
      A.line(nx-nr*0.45,ny-nr*0.2,nx-nr*0.55,ny+0.5,'#efd3a7',true,0.34);
    }
    // Subtle shoulder and hip muscular definition lines (inside the body only).
    A.line(54.8,29.5,56.2,35.5,'#7d583f',true,0.45);
    A.line(55.4,29.5,56.8,35.2,'#e5c596',true,0.34);
    A.line(18.5,31.5,16.8,36.5,'#7d583f',true,0.4);

    // Near ear: small, rounded, furry inside, set back on the cranium.
    A.soft(64.5,hy-1.1,1.4,3.0,C,null,-0.55);
    A.soft(64.6,hy-1.0,0.6,1.9,['#6e4f3b','#896a52','#baa084','#d6bd9d','#e9cfaf'],null,-0.55);
    for(let i=0;i<4;i++)A.line(66.2+i*0.8,hy-0.1,66.4+i*0.8,hy-0.8,'#7c563c',null,0.34);

    // Prominent bony supraorbital brow ridge, large dark camel eye with heavy lid and lashes.
    A.line(67.8,hy+1.5,71.4,hy+2.1,'#efd3a7',true,0.65);
    A.line(67.9,hy+2.0,71.3,hy+2.5,'#6b4831',true,0.45);
    A.ell(69.7,hy+2.9,1.2,mouth===2?0.32:0.72,'#2d2522');
    if(mouth!==2){
      A.ell(69.4,hy+2.6,0.32,0.25,'#fff4d9');
      A.ell(70.2,hy+3.1,0.2,0.16,'#9c7e63');
    }
    for(let i=0;i<3;i++)A.line(68.3+i*0.6,hy+2.1,67.8+i*0.55,hy+1.4,'#573c2b',null,0.34);

    // Diagonal slit nostril and philtrum (split upper lip) characteristic of a camel.
    A.line(78.8,hy+4.7,80.9,hy+5.4,'#efd3a7',true,0.4);
    A.ell(80.1,hy+5.5,0.85,0.34,'#593e2e',null,-0.38);
    const jaw=[0,0.25,0.55,0.25][chew%4],gape=mouth===1?0.85:0.16+jaw*0.3;
    A.ell(79.6,hy+7.8,2.3,gape,'#5c3b31');
    // Pendulous lower lip & chin beard tuft
    A.soft(79.2,hy+8.6+jaw*0.3,2.7,0.78,C);
    A.line(81.2,hy+6.3,81.5,hy+7.5,'#6e4d38',true,0.38);
    A.line(76.8,hy+7.7,79.4,hy+7.4,'#7a5740',true,0.36);
    for(let i=0;i<3;i++)A.line(77.5+i*0.9,hy+9.1+jaw*0.3,77.2+i*0.9,hy+9.8+jaw*0.3,'#8c6343',null,0.34);
  });
}
function duneCamelLegArt(height,frame=0,walking=false) {
  if(!walking)frame=0;
  return duneBake('camel-legs:'+height+':'+frame+':'+walking,80,40,A=>{
    const stand=clamp((height-18)/15,0,1),fold=1-stand;
    // Camels pace: the foreleg and hindleg on each side move together; the far pair is half a cycle away.
    for(const [hip,side,fore] of [[20,0,false],[50,0,true],[15,1,false],[54,1,true]]){
      const C=side?['#73503a','#986f49','#ba9263','#d8b585','#efd3a7']:['#593d2b','#75523a','#916a4b','#ad8660','#c7a279'];
      const PAD=side?['#4f3a2c','#6b503d','#87674f','#a38166','#bfa082']:['#3d2d22','#543f30','#6e5340','#876952','#9e7e65'];
      const u=((frame/24+(side?0:0.5))%1),swing=u>=0.65?(u-0.65)/0.35:0;
      const dx=walking?(u<0.65?7.8-u/0.65*15.6:-7.8+swing*15.6)*stand:0;
      const lift=walking&&swing?Math.sin(swing*Math.PI)*4.2*stand:0;
      const top=9.5,footX=hip+dx+(fore?-5:5)*fold,footY=height-lift-0.9;
      // Hindlegs have a backward-angled hock joint; forelegs have a forward/knobby carpal knee.
      const kneeX=hip+dx*0.42+(fore?1.3:-1.6)+(fore?-3:3)*fold,kneeY=top+(footY-top)*0.48;
      const ankleX=footX+(fore?-0.35:0.25),ankleY=footY-2.1;
      duneCamelTube(A,[[hip,top],[kneeX,kneeY],[ankleX,ankleY],[footX+0.2,footY-0.5]],[2.35,1.25,0.78,0.95],C);
      // Calloused knee/hock joint pad
      A.soft(kneeX,kneeY,1.4,1.35,C);
      A.line(kneeX-0.5,kneeY-0.2,kneeX+0.5,kneeY+0.2,C[0],true,0.34);
      // Broad, two-toed cushioned camel footpad
      A.soft(footX+0.6,footY,2.45,0.95,PAD);
      A.line(footX+1.9,footY-0.1,footX+2.6,footY+0.45,'#3b2a1e',true,0.4);
      A.line(footX-0.6,footY+0.35,footX+2.4,footY+0.45,PAD[0],true,0.34);
    }
  });
}
const WORM_FLESH=['#572a43','#8a455c','#b66b78','#dba0a0','#edc6b0'];
const WORM_SLIME=['#56663b','#83965c','#b4c68b','#dce5b7','#f0f3d4'];
function wormVein(A,x,y,scale=1){
  const pts=[[x,y],[x+2*scale,y+3*scale],[x+scale,y+6*scale],[x+4*scale,y+9*scale]];
  for(let i=1;i<pts.length;i++)A.line(...pts[i-1],...pts[i],'#75495e',true,.45);
  A.line(x+2*scale,y+3*scale,x+5*scale,y+2*scale,'#8d5266',true,.34);
  A.line(x+scale,y+6*scale,x-2*scale,y+7*scale,'#8d5266',true,.34);
}
function duneWormSegmentArt(r,seed=0){
  return duneBake('wetWormSegment:'+r+':'+seed,r*2+4,r*2+4,A=>{
    const c=r+2;A.soft(c,c,r,r,WORM_FLESH);
    for(let i=0;i<4;i++){
      const x=c-r*.7+i*r*.43;A.soft(x,c,1.1,r*.88,['#744251','#a0616e','#c98c93','#e5b4ad','#f2cec0'],true,-.12);
      wormVein(A,x,c-r*.7,.6);
    }
    for(let i=0;i<5;i++){const x=c-r*.5+i*r*.22,y=c+Math.sin(i*2+seed)*r*.4;A.soft(x,y,1.1,.9,WORM_SLIME,true);A.ell(x-.2,y-.25,.3,.25,'#f0efce',true);}
    A.soft(c-r*.4,c-r*.6,r*.38,1.1,WORM_SLIME,true,-.3);
  });
}
function duneWormHeadArt(open=0,look=0){
  return duneBake('vileWormHead:'+open,57,60,A=>{
    A.soft(27,34,21.5,22,WORM_FLESH);A.soft(17,32,8,18,WORM_FLESH);
    for(let i=0;i<5;i++){A.soft(10+i*4,33,1.3,15,['#704052','#a26074','#c78490','#e2afb0','#f1cfbf'],true,-.12);wormVein(A,12+i*6,24+(i%2)*7,.8);}
    A.soft(38,37,12,10+open*1.4,['#5a273c','#86394f','#ba596b','#df8a93','#f2b6ae']);
    A.ell(39,37,9.7,7.5+open*1.4,'#392137');A.soft(39,40+open,6.3,3.1,['#7a374a','#a85562','#cd7b82','#e5a9a6','#f1c8ba']);
    for(let i=0;i<11;i++){
      const a=i*Math.PI/5.5,x=39+Math.cos(a)*9.1,y=37+Math.sin(a)*(7+open*1.3);
      A.poly([[x-.9,y-.4],[x+1,y+.4],[x-Math.cos(a)*(2+i%3*.5),y-Math.sin(a)*(2.7+i%2)]],i%3?'#dacb9f':'#f0dfb6');
    }
    for(const [x,y,rot]of [[23,20,.24],[36,17,-.25]]){
      A.soft(x,y,6,4,WORM_FLESH,null,rot);A.ell(x,y+1,4.2,1.5,'#b9b47b');A.ell(x+1.1,y+1,.6,1.3,'#6b2336');A.ell(x+1,y+.5,.25,.25,'#e8d7b7');
      A.line(x-5,y-1.4,x+4,y+1,'#673247',null,1.1);A.line(x-4,y-2,x+3,y-.3,'#d49a9b',null,.55);
    }
    // Transparent-looking strings of mucus cling to the lip, with pooled wet highlights.
    for(const [x,y,h]of [[32,42,10],[40,44,11],[47,39,9],[15,35,7]]){
      A.line(x,y,x+.5,y+h-1,'#97a66d',null,.8);A.line(x-.2,y,x+.2,y+h-1,'#e7edc1',null,.34);A.soft(x+.5,y+h,1.1,1.9,WORM_SLIME);
    }
    for(const [x,y]of [[15,22],[22,39],[29,28],[13,44],[42,25]]){A.soft(x,y,2.1,1.3,WORM_SLIME,true,-.3);A.ell(x-.5,y-.4,.7,.2,'#edf0ce',true);}
    A.soft(24,47,5.5,1.2,WORM_SLIME,true,.2);
  });
}
function duneWormGibArt(seed=0){
  return duneBake('wormGib:'+seed,14,12,A=>{
    A.poly([[2,3],[5,1],[10,2],[12,5],[10,10],[6,9],[3,11],[1,7]],WORM_FLESH[1]);
    A.soft(7,6,4.6,3.5,WORM_FLESH,true,seed*.6);wormVein(A,4,3,.5);
    A.soft(7,4,2.2,.7,WORM_SLIME,true,seed*.5);A.ell(6,3.7,.7,.25,'#e8ecc8',true);
  });
}
function drawWormBang(ctx,x,y,age){
  if(age>=26)return;
  ctx.save();ctx.translate(x,y);const scale=.8+Math.min(1,age/5)*.3;ctx.scale(scale,scale);ctx.globalAlpha=Math.min(1,(26-age)/10);
  const pts=[];for(let i=0;i<28;i++){const a=i*Math.PI/14,r=i%2?40+(i%3)*5:68+(i%4)*3;pts.push([Math.cos(a)*r,Math.sin(a)*r*.62]);}
  fPoly(ctx,pts,'#5b2835');fPoly(ctx,pts.map(([xx,yy])=>[xx*.95,yy*.95]),'#f7d084');fPoly(ctx,pts.map(([xx,yy])=>[xx*.76,yy*.76]),'#fff0be');
  ctx.scale(2.3,2.3);drawText(ctx,'BANG!',0,-3,'#8f3546',{align:'center',shadow:'#fff8df'});ctx.restore();
}
function duneScarabArt(frame) {
  return duneBake('scarab:'+frame,40,38,A=>{
    const cx=20,fl=0.5+frame/5*0.5;
    for(const side of [-1,1]){
      for(let i=0;i<3;i++){const y=20+i*3;A.line(cx+side*6,y,cx+side*10,y-1,DUNE_GOLD[0],null,0.65);A.line(cx+side*10,y-1,cx+side*12,y+1,DUNE_GOLD[2],null,0.45);}
    }
    A.soft(cx,11,4.2,3.6,DUNE_GOLD);for(let i=0;i<5;i++)A.poly([[16+i*1.7,9],[16.5+i*1.7,5.8],[17.2+i*1.7,9]],DUNE_GOLD[3]);
    A.soft(cx,16,6.4,3.4,DUNE_GOLD);A.soft(cx,24,7.6,8.5,DUNE_GOLD);
    A.line(20,18.5,20,31.6,'#9b682b',null,0.65);
    for(const side of [-1,1])for(let i=0;i<3;i++)A.line(cx+side*(2+i*1.5),20,cx+side*(2.4+i*1.6),28-i*1.3,'#efcf78',null,0.34);
    A.soft(cx,23,2.3,3.4,DUNE_TEAL);A.line(19.4,20.5,19.3,23.8,'#d7f1df',null,0.34);
    A.ell(18,10.7,0.4,0.45,'#214b50');A.ell(22,10.7,0.4,0.45,'#214b50');
  });
}
function duneStoneArt(seed=0) {
  return duneBake('stone:'+seed,16,16,A=>{
    A.fill(0,0,16,16,(x,y)=>{
      const edge=Math.min(x,y,16-x,16-y),chip=(x<2&&y>11+seed%3)||(y<1&&x>11&&x<12.5);
      if(edge<0.35||chip)return '#765240';
      return softTone(DUNE_STONE,0.8-x*0.045-y*0.035+(edge<1?x+y<16?0.6:-0.65:0)+Math.sin(y*1.8+seed+x*0.08)*0.035);
    });
    if(seed<6){duneRelief(A,2,1,12,14,M=>duneGlyphShape(M,seed,0,0,1),2);duneGlyphDetail(A,seed,2,1,1);}   // (a carved, painted hieroglyph)
    else{A.line(4,4,4.8,6,'#bb8c5d',null,0.34);A.line(4.8,6,4.2,7.1,'#bb8c5d',null,0.34);A.line(10,11,12,11.4,'#e7bd83',null,0.34);}
    A.line(1,13.5,3,14.5,'#bc885c',null,0.34);A.line(12.8,4,14,5.2,'#f2cc96',null,0.34);
  },0);
}
function duneColumnArt(part) {
  return duneBake('column:'+part,16,16,A=>{
    const left=part==='TL'||part==='L',cap=part==='TL'||part==='TR',ox=left?0:16;
    A.fill(left?2:0,cap?6:0,left?16:14,16,(x,y)=>{
      const xx=x+ox,u=(xx-16)/13.5;
      return softTone(DUNE_STONE,0.6-u*0.8+Math.cos(xx*1.7)*0.1);
    });
    for(let x=left?5:3;x<15;x+=4.6){A.line(x,cap?7:0,x,16,'#b1845b',null,0.34);A.line(x-0.6,cap?7:0,x-0.6,16,'#f0d1a1',null,0.34);}
    if(cap){A.fill(0,0,16,6.5,(x,y)=>softTone(DUNE_STONE,1-y*0.22));A.line(0,1,16,1,'#fae1b5',null,0.55);A.line(0,5.8,16,5.8,'#8c6046',null,0.6);}
  },0);
}
function duneTempleSectionArt(kind) {
  return duneBake('temple:'+kind,120,176,A=>{
    A.fill(0,0,120,176,(x,y)=>{
      const row=Math.floor(y/18),off=(row%2)*24,sx=(x+off)%48,sy=y%18,edge=Math.min(sx,48-sx,sy,18-sy);
      return softTone(['#4d3b37','#725440','#98754f','#bb9466','#d8b885'],0.2-y*0.002+(edge<0.6?-0.6:edge<1.2?0.25:0)+Math.sin(y*0.8+x*0.03)*0.025);
    });
    // painted borders: a block border of lapis, red and green between bands of ochre, over and under the writing
    for(const yy of [22,127]){
      A.fill(0,yy,120,yy+10,(x,y)=>{
        const base=A.buf[Math.round(y*3)*360+Math.round(x*3)]||DUNE_STONE[2];
        if(y<yy+1.4||y>yy+8.6)return lerpColor(base,PIG.ochre,0.5);
        const k=Math.floor(x/5)%6;return k%2?lerpColor(base,'#efe4cc',0.22):lerpColor(base,[PIG.blue,PIG.red,PIG.green][(k>>1)%3],0.38);
      });
      A.line(0,yy,120,yy,'#4a3428',null,0.5);A.line(0,yy+10,120,yy+10,'#4a3428',null,0.5);
    }
    // the scene in its panel, framed
    A.poly([[37,49],[81,49],[83,102],[35,102]],'#514035');A.fill(38.4,50.4,79.6,100.6,(x,y)=>softTone(['#7c5e48','#977453','#b8936a','#d4b385','#ead0a2'],0.6-y*0.003));
    A.line(38.4,50.6,79.6,50.6,'#e8cfa0',null,0.55);A.line(38.6,50.6,38.6,100,'#e8cfa0',null,0.34);
    dunePanelRelief(A,kind,41,54);
    // columns of carved writing either side, between incised rules
    for(const cx of [4,19,90,105])A.line(cx-1.4,34,cx-1.4,123,'#6a4c38',null,0.34);
    for(const cx of [34,119])A.line(cx-1.4,34,cx-1.4,123,'#6a4c38',null,0.34);
    let n=kind*11;
    for(const cx of [4.6,19.6,90.6,105.6])for(let i=0;i<6;i++){
      const k=(n=(n*7+3)%23)%8,gy=35+i*14.6;
      duneRelief(A,cx,gy,12,14,M=>duneGlyphShape(M,k,0,0,0.92),2,0.42);   // (worn back: the wall's writing, not the blocks in front)
    }
    // a few old cracks
    for(const [x,y] of [[15,142],[103,150],[62,160]]){A.line(x,y,x+2,y+4,'#604739',null,0.34);A.line(x+2,y+4,x+1,y+7,'#604739',null,0.34);}
  },0);
}
function duneFlameArt(frame,seed=0) {
  return duneBake('fire:'+frame+':'+seed,16,30,A=>{
    const ph=frame*Math.PI/6;
    for(let i=0;i<4;i++){
      const base=i*5-1,h=12+Math.sin(ph+i*2+seed)*5+(i%2)*5;
      A.fill(base-5,1,base+6,30,(x,y)=>{
        const u=(30-y)/h;if(u<0||u>=1)return null;
        const mid=base+Math.sin(u*5+ph+i)*2*u,r=3.7*(1-u)**0.65,v=(x-mid)/Math.max(0.05,r);
        if(Math.abs(v)>1)return null;
        const inner=(1-Math.abs(v))*(1-u);
        return softTone(['#9f3036','#da4f30','#f58a3d','#ffd67a','#fff4bc'],inner*2.4-0.7-u*0.25);
      });
    }
  },0);
}
function drawDuneHellfire(game,ctx,c0,c1) {
  const lv=game.level,t=game.t;
  for(let c=c0;c<=c1;c++){
    let r=1;while(r<ROWS&&lv.get(c,r)!==T.LAVA)r++;
    if(r>=ROWS||lv.get(c,r-1))continue;
    const x=c*TILE,top=r*TILE+4;
    fGlow(ctx,x+8,top,28,'#f7793b',0.18+Math.sin(t*0.08+c)*0.025);
    ctx.drawImage(duneFlameArt(Math.floor(t/3)%12,c%2),x,top-30);
    for(let i=0;i<2;i++){
      const seed=c*37+i*53,u=((t+seed)%100)/100,xx=x+((seed%13)+13)%13+Math.sin(u*7+seed)*2,yy=top-5-u*55;
      ctx.globalAlpha=1-u;fEll(ctx,xx,yy,0.35,0.7,'#ffd993');
    }
  }
  ctx.globalAlpha=1;
}
function duneDecorArt(kind,h=12,flower=false,color='#c17c58') {
  return duneBake('decor:'+kind+h+flower+color,40,40,A=>{
    if(kind==='barrel'){
      A.soft(20,32,5,7,['#2b604d','#468561','#6da574','#a3c58d','#d3dfb0']);
      for(let x=16;x<25;x+=2)A.line(x,27,x,36,'#3c7155',null,0.34);
      for(let i=0;i<8;i++){const a=i*Math.PI/4,x=20+Math.cos(a)*4,y=31+Math.sin(a)*5;A.line(x,y,x+Math.cos(a),y+Math.sin(a),'#e4d9ae',null,0.34);}
      if(flower){for(let i=0;i<5;i++)A.soft(20+Math.cos(i*1.26)*2,24+Math.sin(i*1.26),1.3,1,['#ad4c70','#ce718b','#e49ca8','#f2bfbe','#ffded0']);A.ell(20,24,0.8,0.6,'#f1cd82');}
    }else if(kind==='skull'){
      A.soft(20,35,4.8,2.7,['#a99a87','#cec0a4','#e8dcc1','#f8edce','#fff7e2']);
      for(const side of [-1,1]){A.line(20+side*3,34,20+side*6,32.8,'#d6c6a6',null,0.9);A.line(20+side*6,32.8,20+side*7,30.8,'#ebdfc1',null,0.55);A.ell(20+side*2,34.5,0.9,0.7,'#645449');}
      A.poly([[20,35],[19.2,36.3],[20.8,36.3]],'#645449');
    }else if(kind==='dgrass'||kind==='agave'){
      for(let i=0;i<9;i++){const x=20+(i-4)*2.2,yy=39-(6+Math.sin(i*2)*3);if(kind==='agave')A.poly([[19,39],[x,yy-3],[21,39]],i%2?'#6f9775':'#9ab493');else{A.line(20,39,x,yy,'#ab8d57',null,0.45);A.line(x,yy,x+(i-4)*0.3,yy-2,'#d5ba7e',null,0.34);}}
    }else if(kind==='brazier'){
      for(const x of [16,20,24])A.line(x,31,x-1,39,'#746043',null,0.7);
      A.soft(20,28,6.5,2.9,DUNE_GOLD);A.line(14,27,26,27,'#f4d58c',null,0.55);
    }else{
      for(let i=0;i<3;i++){const x=15+i*5;A.poly([[x,38],[x+1,35+i%2],[x+4,36],[x+3,39]],i%2?'#b68861':'#d7ad7b');}
    }
  },0);
}
function drawFineDesertDecor(ctx,d,t) {
  const x=d.x,y=d.y;
  if(d.k==='saguaro'){const img=duneCactusArt(d.h,false,d.a>0.6);ctx.drawImage(img,x-img.width/2,y-img.height);return true;}
  if(d.k==='urn'){const img=duneUrnArt(false,!!d.s,d.c);ctx.drawImage(img,x-9,y-img.height);return true;}
  if(d.k==='brazier'){
    const by=y-56;ctx.save();ctx.globalAlpha=.62;ctx.drawImage(duneWallSconceArt(Math.floor((t+(d.p||0)*5)/9)%4),x-12,by-28);ctx.restore();return true;
  }
  if(['barrel','skull','dgrass','pebble','shards','agave'].includes(d.k)){
    ctx.drawImage(duneDecorArt(d.k,12,d.f,d.c),x-20,y-40);
    return true;
  }
  return false;
}
// A strict side profile facing left: crown, lowered brow, projecting nose and an open arrow throat.
function duneDartTrapArt(charge) {
  return duneBake('dartTrapProfile:'+charge,16,16,A=>{
    const h=clamp(charge/8,0,1),hot=['#851814','#bf241d','#eb432b','#ff7b47','#ffce78'];
    const S=DUNE_STONE.map((c,i)=>lerpColor(c,hot[i],h));
    // Cover the full 16x16 block face so the entire trap block turns glowing red in advance
    A.fill(0,0,16,16,(x,y)=>{
      const edge=Math.min(x,y,16-x,16-y);
      if(edge<0.35)return lerpColor('#765240','#6e1210',h);
      return softTone(S,.55-x*.035-y*.025+(edge<1?x+y<16?.5:-.5:0));
    });
    const face=[[12,1],[7,1],[4,3],[4,5],[2,6],[3,7.5],[.4,8.2],[.4,9.8],[3,10.3],[3,12.4],[1,12.8],[1,14.6],[11,15],[14,12],[14,4]];
    A.poly(face,S[1]);A.poly([[11,2],[7,2],[4.8,3.7],[5,5.8],[3.3,6.4],[4.2,8.5],[2,9],[4.3,9.8],[4.3,12],[10,13.7],[12,11.6],[12,4]],S[2]);
    // Egyptian headdress pleats, all behind the face so it cannot read as a frontal mask.
    for(let i=0;i<4;i++){A.line(11.5+i,3,12+i,12.5,lerpColor('#82583e','#8f1c16',h),null,.5);A.line(11.1+i,3,11.6+i,12,lerpColor('#e7be86','#ffad6e',h),null,.34);}
    A.poly([[3.7,4.2],[9.6,5.4],[8.8,7],[4.3,6.1]],lerpColor('#6b4635','#751612',h));
    A.poly([[4.5,5.3],[8.3,6.1],[5.1,6.6]],charge>4?'#fff4bd':charge?'#ff5232':'#332a28');
    A.line(4.5,4.1,9.1,5.1,lerpColor('#f4d39b','#ffd48a',h),null,.55);
    A.poly([[.6,10.1],[8.8,10.1],[8.2,12.2],[1.2,12.2]],lerpColor('#30272a','#ff3824',h*.85));
    A.poly([[1,12.2],[8.2,12.2],[9.4,13.2],[2,13.4]],lerpColor('#efc48c','#ffba75',h));
    A.ell(3.1,8.9,.5,.35,lerpColor('#704838','#7a1612',h));A.line(7.7,7.9,9.6,9.2,lerpColor('#b18459','#d93b26',h),null,.4);
    A.line(6,14.1,10,14.5,lerpColor('#f3d4a0','#ffd48a',h),null,.45);
    A.line(13.7,1,14,4,lerpColor('#765240','#8a1b16',h),null,.34);
  },0);
}
function duneWallSconceArt(frame=0) {
  return duneBake('recessedWallLamp'+frame,24,32,A=>{
    // A small flame enclosed by a carved niche reads as background lighting,
    // unlike the freestanding braziers and the bright damaging fire artwork.
    A.poly([[3,29],[3,11],[5,6],[9,2],[15,2],[19,6],[21,11],[21,29]],'#a48660');
    A.poly([[5,27],[5,12],[7,7],[10,4],[14,4],[17,7],[19,12],[19,27]],'#694e3b');
    A.poly([[7,26],[7,12],[9,8],[12,6],[15,9],[17,13],[17,26]],'#493c33');
    A.line(4,12,4,27,'#c7a77b',null,.6);A.line(20,13,20,28,'#614c39',null,.6);
    const sway=[-.8,.4,1,-.2][frame];
    A.poly([[8,24],[9,20],[11+sway,15],[11,21],[14+sway*.4,18],[16,24]],'#a86b42');
    A.poly([[10,24],[11,21],[12+sway*.3,19],[12.5,22],[14,24]],'#d2a367');
    A.soft(12,25,8,2,['#5e4a37','#7c6446','#9c8058','#b49a70','#d0b98c']);
    A.line(4,26,20,26,'#c9ae7a',null,.55);A.line(4,29,20,29,'#65503b',null,.6);
  },0);
}
function duneDartArt() {
  return duneBake('dart-huge',28,15,A=>{
    // Thick wooden shaft with bright highlight and dark underside
    A.line(3,7.5,20,7.5,'#6e472b',null,2.4);
    A.line(3,7.2,20,7.2,'#b88858',null,1.5);
    A.line(3.5,6.6,19.5,6.6,'#f2d8a7',null,0.65);
    // Large, high-contrast broadhead arrow tip
    A.poly([[17,2.2],[26.8,7.5],[17,12.8],[19.4,7.5]],'#8fa6b5');
    A.poly([[17,2.2],[26.8,7.5],[19.4,7.5]],'#ffffff');
    A.poly([[18.2,7.5],[26.8,7.5],[17,12.8],[19.4,7.5]],'#5c7382');
    A.line(17.5,2.7,26,7.5,'#ffffff',null,0.55);
    // Bold crimson & gold tail fletching feathers
    for(const side of [-1,1]){
      A.poly([[2,7.5],[0.6,7.5+side*5.2],[6.2,7.5+side*4.0],[8.2,7.5]],'#d9383a');
      A.poly([[2.8,7.5],[1.6,7.5+side*3.8],[5.4,7.5+side*3.0],[6.8,7.5]],'#ff7863');
    }
    // Gold binding bands at head and tail
    A.line(17.5,5.8,17.5,9.2,'#ffd166',null,1.1);
    A.line(7.6,6.1,7.6,8.9,'#ffd166',null,0.9);
    A.line(2,7.5,7.5,7.5,'#fff1bd',null,0.55);
  },2);
}
function duneRockChipArt(s,seed=0) {
  return duneBake('chip:'+s+':'+seed,s+1,s+1,A=>{
    A.poly([[1,0.7],[s*0.7,0],[s,s*0.32],[s-0.4,s*0.82],[s*0.65,s],[0.6,s-0.6],[0,s*0.4]],DUNE_STONE[2]);
    A.poly([[1,0.7],[s*0.7,0],[s,s*0.32],[s*0.4,s*0.4],[0,s*0.4]],DUNE_STONE[3]);
    A.poly([[s*0.4,s*0.4],[s,s*0.32],[s-0.4,s*0.82],[s*0.65,s]],DUNE_STONE[1]);
    A.line(1,1,s*0.62,0.7,DUNE_STONE[4],null,0.34);
  },0);
}

// ── the temple's hieroglyphs, carved as real sunken relief ─────────────────────────────────────────────
// Each glyph is a set of painted shapes (a mask) cut into the stone: the cut wall on the upper left falls into shadow, the
// lip on the lower right catches the light, and the floor of the cut keeps its faded mineral paint (lapis, turquoise,
// ochre, red, black, gypsum white). Fine painted details go on after (duneGlyphDetail).
const PIG = { blue: '#2f64a8', turq: '#2f9a92', red: '#b03a2a', ochre: '#c8902a', yellow: '#e0b048', black: '#2a2018', white: '#efe4cc', green: '#4a8a3a', clay: '#c86a3a' };
function duneRelief(A, x0, y0, w, h, paint, depth = 2, f = 1) {   // f: how strongly it's cut and painted (1: freshly)
  const M = mArt(w, h); paint(M);
  const R = A.R, AW = Math.ceil(A.w * R), AH = Math.ceil(A.h * R), MW = Math.ceil(w * R), MH = Math.ceil(h * R), ox = Math.round(x0 * R), oy = Math.round(y0 * R);
  const at = (i, j) => (i >= 0 && j >= 0 && i < MW && j < MH ? M.buf[j * MW + i] : null), out = [];
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const c = at(i, j), X = ox + i, Y = oy + j;
    if (!c || X < 0 || Y < 0 || X >= AW || Y >= AH) continue;
    const base = A.buf[Y * AW + X] || DUNE_STONE[2];
    let col;
    if (!at(i - depth, j - depth) || !at(i - depth, j) || !at(i, j - depth)) col = lerpColor(base, '#3a2418', 0.5 * f);        // the cut wall, in shadow
    else if (!at(i + 1, j + 1) || !at(i + 1, j) || !at(i, j + 1)) col = lerpColor(base, '#fff0d0', 0.4 * f);                // the lit lip
    else col = lerpColor(lerpColor(base, c, 0.68 * f), '#2a1a10', (0.06 + ((i * 7 + j * 13) % 11) * 0.006) * f);            // faded paint on the floor of the cut
    out.push(Y * AW + X, col);
  }
  for (let k = 0; k < out.length; k += 2) A.buf[out[k]] = out[k + 1];
}
// a glyph's shapes in its 12 x 14 box (s: scale), into a mask
function duneGlyphShape(M, kind, x, y, s = 1) {
  const P = (u, v) => [x + u * s, y + v * s], E = (u, v, rx, ry, c, rot = 0) => M.ell(x + u * s, y + v * s, rx * s, ry * s, c, null, rot);
  const Po = (pts, c) => M.poly(pts.map(([u, v]) => P(u, v)), c), Ln = (u0, v0, u1, v1, c, t = 1) => M.line(...P(u0, v0), ...P(u1, v1), c, null, t * s);
  const ring = (u, v, rx, ry, t, c) => M.fill(x + (u - rx - 1) * s, y + (v - ry - 1) * s, x + (u + rx + 1) * s, y + (v + ry + 1) * s, (px, py) => { const d = Math.hypot((px - x - u * s) / (rx * s), (py - y - v * s) / (ry * s)); return d <= 1 && d >= 1 - t / Math.min(rx, ry) ? c : null; });
  switch (kind % 8) {
    case 0:   // the owl (m)
      Po([[2.4, 9.6], [0.8, 13.4], [4.4, 12.2]], PIG.ochre); E(5.6, 8.6, 3.4, 4.4, PIG.ochre, 0.15); E(7.8, 4.3, 2.7, 2.5, PIG.ochre);
      Po([[6, 2.6], [6.4, 0.5], [7.4, 2.2]], PIG.ochre); Po([[8.4, 2.2], [9.4, 0.5], [9.8, 2.8]], PIG.ochre); E(8.3, 4.5, 1.8, 1.6, PIG.white);
      Ln(5, 12.4, 4.6, 13.8, PIG.black, 0.6); Ln(7, 12.4, 7.4, 13.8, PIG.black, 0.6); break;
    case 1: {   // the horned viper (f)
      let pu = 0.6, pv = 11.4;
      for (let u = 1; u <= 9.6; u += 0.6) { const v = 11.4 - Math.sin(u * 0.85) * 1.5; Ln(pu, pv, u, v, PIG.yellow, 0.7 + u * 0.1); pu = u; pv = v; }
      Ln(pu, pv, 10.6, 9.4, PIG.yellow, 1.7); E(10.8, 8.8, 1.8, 1.25, PIG.yellow, -0.4); Po([[10, 7.8], [9.8, 6.2], [10.8, 7.6]], PIG.yellow); Po([[11.2, 7.6], [11.8, 6], [12, 7.8]], PIG.yellow);
      break;
    }
    case 2:   // the sacred ibis: white body, black head and neck, the long curved bill
      Po([[1.4, 6.2], [0, 8.6], [2.6, 8]], PIG.black); E(5, 7, 3.6, 2.5, PIG.white, 0.2);
      Ln(7.4, 5.8, 8.8, 2.8, PIG.black, 1.1); E(9.3, 2.6, 1.25, 1.1, PIG.black);
      Ln(10.2, 2.8, 11.4, 4.4, PIG.black, 0.55); Ln(11.4, 4.4, 11.9, 7.2, PIG.black, 0.5);
      Ln(4.4, 9.2, 4, 13.8, PIG.black, 0.5); Ln(6, 9.2, 6.6, 13.8, PIG.black, 0.5); break;
    case 3:   // the wedjat, the eye of Horus
      Po([[0.8, 3.4], [11.2, 2.4], [11.2, 3.6], [0.8, 4.4]], PIG.blue);
      Po([[1.2, 6.6], [3.8, 5], [8.2, 5], [10.8, 6.6], [8.2, 8.2], [3.8, 8.2]], PIG.white); E(6, 6.6, 1.6, 1.6, PIG.black);
      Ln(10.6, 6.6, 12, 6.4, PIG.blue, 0.8); Ln(5, 8, 4.4, 12.6, PIG.blue, 0.8);
      Ln(7.4, 8, 8.8, 10, PIG.blue, 0.7); Ln(8.8, 10, 10, 12.2, PIG.blue, 0.7); Ln(10, 12.2, 11.2, 12.6, PIG.blue, 0.7); Ln(11.2, 12.6, 11.6, 11.4, PIG.blue, 0.7); Ln(11.6, 11.4, 11, 10.6, PIG.blue, 0.6); break;
    case 4:   // the ankh, in turquoise faience
      ring(6, 3.8, 2.6, 3.3, 1.2, PIG.turq); Po([[1.6, 7], [10.4, 7], [10.4, 8.6], [1.6, 8.6]], PIG.turq); Po([[5.1, 8.4], [6.9, 8.4], [7.3, 13.8], [4.7, 13.8]], PIG.turq); break;
    case 5:   // the reed leaf (i) over the water ripple (n)
      Po([[5.2, 0.4], [7, 2.4], [6.6, 7.2], [5.4, 7.6], [4.8, 3]], PIG.green);
      for (const v0 of [9.8, 12]) for (let u = 0; u < 12; u++) Ln(u, v0 + (u % 2) * 1.2, u + 1, v0 + ((u + 1) % 2) * 1.2, PIG.blue, 0.75);
      break;
    case 6:   // the bread loaf (t) over the mouth (r)
      M.fill(x + 1 * s, y + 1 * s, x + 11 * s, y + 5.6 * s, (px, py) => { const u = (px - x) / s, v = (py - y) / s; return ((u - 6) / 4.8) ** 2 + ((v - 5.6) / 4.4) ** 2 <= 1 ? PIG.clay : null; });
      Po([[1.2, 10.2], [6, 8], [10.8, 10.2], [6, 12.4]], PIG.red); break;
    default:  // the quail chick (w)
      E(6, 8.4, 3.4, 3.2, PIG.ochre); E(8.8, 4.4, 1.9, 1.8, PIG.ochre); Po([[10.4, 4.2], [12, 4.8], [10.4, 5.4]], PIG.ochre);
      Ln(5, 11.2, 4.4, 13.8, PIG.black, 0.5); Ln(7, 11.2, 7.6, 13.8, PIG.black, 0.5); Ln(2.8, 8, 0.6, 7, PIG.ochre, 0.9);
  }
}
// the painted details that go on after a glyph is carved: eyes, feathers, scales, the weave of a basket
function duneGlyphDetail(A, kind, x, y, s = 1) {
  const D = (u0, v0, u1, v1, c = PIG.black, t = 0.34) => A.line(x + u0 * s, y + v0 * s, x + u1 * s, y + v1 * s, c, null, t), Dot = (u, v, r, c = PIG.black) => A.ell(x + u * s, y + v * s, r * s, r * s, c);
  switch (kind % 8) {
    case 0: Dot(7.6, 4.3, 0.45); Dot(9, 4.3, 0.45); D(8.3, 5, 8.3, 6); for (let i = 0; i < 3; i++) D(3.4 + i * 0.6, 7 + i * 1.6, 6.4 + i * 0.4, 8 + i * 1.6, '#7a5020'); break;
    case 1: for (let u = 2; u < 10; u += 1.6) Dot(u, 11.4 - Math.sin(u * 0.85) * 1.5, 0.3, '#6a4818'); Dot(11.2, 8.6, 0.32); break;
    case 2: Dot(9.4, 2.4, 0.3, '#fff0d0'); D(3, 6.4, 7, 7.4, '#8a8070'); D(2.6, 7.4, 6.4, 8.2, '#8a8070'); break;
    case 3: D(1.2, 6.6, 3.8, 5); D(3.8, 5, 8.2, 5); D(8.2, 5, 10.8, 6.6); D(1.2, 6.6, 3.8, 8.2); D(3.8, 8.2, 8.2, 8.2); D(8.2, 8.2, 10.8, 6.6); Dot(5.5, 6.1, 0.35, '#f0f0f0'); break;
    case 4: D(1.8, 7.4, 10.2, 7.4, '#9ae0d8'); D(5.4, 9, 5.6, 13.4, '#9ae0d8'); break;
    case 5: D(5.6, 1.6, 5.8, 7, '#2a5a20'); break;
    case 6: for (let u = 3; u < 10; u += 1.6) D(u, 2, u, 5.4, '#8a4020'); D(2.4, 10.2, 9.6, 10.2, '#5a1a10'); break;
    default: Dot(9.2, 4.1, 0.3); for (let i = 0; i < 3; i++) D(4 + i, 7.4 + i * 0.8, 7.4, 8.2 + i * 0.8, '#7a5020');
  }
}
// a big painted relief scene for a wall panel, w 36 x h 44 at (x, y). kind: 0 Horus the falcon, 1 the winged scarab,
// 2 the wedjat over a neb basket, 3 a royal cartouche, 4 Anubis on his shrine
function dunePanelRelief(A, kind, x, y) {
  duneRelief(A, x, y, 36, 44, M => {
    const x = 0, y = 0;   // (the mask is the panel's own: its shapes in panel coordinates)
    const E = (u, v, rx, ry, c, rot = 0) => M.ell(x + u, y + v, rx, ry, c, null, rot), Po = (pts, c) => M.poly(pts.map(([u, v]) => [x + u, y + v]), c), Ln = (a, b, c2, d, col, t = 1) => M.line(x + a, y + b, x + c2, y + d, col, null, t);
    const ring = (u, v, rx, ry, t, c) => M.fill(x + u - rx - 1, y + v - ry - 1, x + u + rx + 1, y + v + ry + 1, (px, py) => { const d = Math.hypot((px - x - u) / rx, (py - y - v) / ry); return d <= 1 && d >= 1 - t / Math.min(rx, ry) ? c : null; });
    if (kind === 0) {   // Horus: a falcon in profile under the sun disk, the uraeus on it
      E(20, 6, 4.6, 4.6, PIG.red); Po([[24, 3.4], [26, 2], [25.6, 6.4]], PIG.yellow);
      Po([[11, 30], [7, 39], [13.6, 37], [15.6, 31]], PIG.blue);
      E(17.4, 26, 6, 8.6, PIG.ochre, 0.35);
      Po([[13, 18.6], [22, 19], [24, 25], [20.4, 33], [11, 36], [9, 31]], PIG.blue); Po([[11.4, 28.4], [20.6, 30], [18.4, 34], [11, 36]], PIG.green);
      E(21.2, 14.2, 3.7, 3.4, PIG.ochre); Po([[19, 11.2], [24, 11.4], [23.4, 13], [19, 13.4]], PIG.blue);
      Po([[24.2, 13], [26.8, 14.4], [24.8, 16.8], [23.6, 15]], PIG.black);
      Ln(16, 34, 15.4, 41.4, PIG.yellow, 0.9); Ln(19.4, 34, 20.4, 41.4, PIG.yellow, 0.9); Ln(12.6, 41.6, 17.4, 41.6, PIG.yellow, 0.8); Ln(18, 41.6, 22.8, 41.6, PIG.yellow, 0.8);
    } else if (kind === 1) {   // Khepri: the scarab rolling up the sun on outspread wings
      E(18, 6.4, 4.8, 4.8, PIG.red);
      for (const s of [-1, 1]) {
        Po([[18 + s * 3, 18], [18 + s * 17.4, 13.6], [18 + s * 18, 19.6], [18 + s * 15, 25.6], [18 + s * 3, 25]], PIG.green);
        Po([[18 + s * 3, 18.4], [18 + s * 13, 15.4], [18 + s * 13.4, 20.4], [18 + s * 11, 24.4], [18 + s * 3, 24.4]], PIG.blue);
        Po([[18 + s * 3, 18.8], [18 + s * 8, 17], [18 + s * 8.4, 21], [18 + s * 3, 22.6]], PIG.red);
        for (const [a, b] of [[4, 23], [5.4, 27], [5, 31]]) Ln(18 + s * 3, b, 18 + s * (a + 3), b + 2.6, PIG.black, 0.7);
      }
      E(18, 13.8, 2.6, 2.2, PIG.black); E(18, 18.2, 4.2, 2.8, PIG.blue); E(18, 25.4, 4.8, 6.2, PIG.blue);
      E(18, 37.6, 3.8, 3.8, PIG.red);
    } else if (kind === 2) {   // the wedjat, large, over a neb basket
      duneGlyphShape(M, 3, x + 2, y + 2, 2.65);
      M.fill(x + 2, y + 34, x + 34, y + 43, (px, py) => { const u = (px - x - 18) / 16, v = (py - y - 34) / 8.6; return v >= 0 && u * u + v * v <= 1 ? PIG.ochre : null; });
    } else if (kind === 3) {   // a cartouche: the king's name inside a knotted rope, on a shen bar
      ring(18, 20, 11.4, 18.4, 1.5, PIG.ochre);
      Po([[7, 38.6], [29, 38.6], [29, 41.6], [7, 41.6]], PIG.ochre);
      E(18, 6.4, 2.8, 2.8, PIG.red);
      duneGlyphShape(M, 5, x + 14.5, y + 10.4, 0.6); duneGlyphShape(M, 0, x + 14.5, y + 19.2, 0.6); duneGlyphShape(M, 6, x + 14.5, y + 28, 0.6);
    } else {   // Anubis: the black jackal lying on his shrine, a red ribbon at his neck
      Po([[3, 28], [33, 28], [33, 41.4], [3, 41.4]], PIG.ochre); Po([[2, 26.4], [34, 26.4], [33, 28.4], [3, 28.4]], PIG.yellow);
      E(16.6, 22.6, 9, 4.2, PIG.black); E(10.6, 21.4, 4.6, 4.8, PIG.black);
      Po([[23.4, 20], [26.6, 13.4], [30.4, 16], [27.4, 23]], PIG.black); E(28.2, 16, 3, 2.6, PIG.black);
      Po([[30, 14.8], [35, 16.6], [34.4, 18.2], [30, 18.2]], PIG.black);
      Po([[26.6, 14.4], [26.6, 8.6], [28.6, 13.6]], PIG.black); Po([[28.4, 13.8], [29.6, 8.6], [30.4, 14.2]], PIG.black);
      Po([[23.4, 23.6], [33, 24.2], [33, 26.2], [23.4, 26.2]], PIG.black); Ln(7, 22.6, 3.4, 27.6, PIG.black, 1.3);
      Po([[24.6, 19.6], [28.4, 18.6], [27.6, 20.6], [25, 21.4]], PIG.red);
    }
  }, 3, 0.85);
  // painted details
  const D = (a, b, c2, d, col = PIG.black, t = 0.34) => A.line(x + a, y + b, x + c2, y + d, col, null, t), Dot = (u, v, r, col = PIG.black) => A.ell(x + u, y + v, r, r, col);
  if (kind === 0) { Dot(22, 13.6, 0.9); Dot(21.7, 13.3, 0.3, '#fff0d0'); D(22, 14.6, 21, 18, PIG.black, 0.6); for (let i = 0; i < 4; i++) D(12 + i * 2.4, 21 + i, 15 + i * 2, 33 - i, '#1a3a68'); for (let i = 0; i < 4; i++) D(12 + i * 2, 30, 13 + i * 2, 35, '#2a5a20'); }
  else if (kind === 1) { for (const s of [-1, 1]) for (let i = 0; i < 6; i++) D(18 + s * (4 + i * 2.2), 15.4 + i * 0.2, 18 + s * (4 + i * 2.2), 24.6, '#1a2a48'); D(18, 21, 18, 31, '#1a2a48', 0.5); Dot(16.8, 13.4, 0.4, '#e0b048'); Dot(19.2, 13.4, 0.4, '#e0b048'); }
  else if (kind === 2) { duneGlyphDetail(A, 3, x + 2, y + 2, 2.65); for (let u = 5; u < 32; u += 2.4) D(u, 34.4, u + 1.4, 41.6, '#7a5020'); D(3, 36.6, 33, 36.6, '#7a5020'); }
  else if (kind === 3) { duneGlyphDetail(A, 5, x + 14.5, y + 10.4, 0.6); duneGlyphDetail(A, 0, x + 14.5, y + 19.2, 0.6); duneGlyphDetail(A, 6, x + 14.5, y + 28, 0.6); for (let v = 4; v < 37; v += 2.2) { D(6.8, v, 7.6, v + 1, '#7a5020'); D(28.4, v, 29.2, v + 1, '#7a5020'); } }
  else { Dot(29.4, 15.4, 0.5, '#e0b048'); for (let u = 6; u < 32; u += 5) D(u, 29, u, 41, '#8a6020', 0.5); D(4, 34, 32, 34, '#8a6020', 0.5); D(9, 19.6, 21, 19, '#5a5048'); }
}

function duneSandStreamArt(frame) {
  return duneBake('sandStream:'+frame,32,48,A=>{
    const phase=frame*Math.PI/8,C=['#aa7d49','#c59858','#dcb375','#eccb92','#f8dfae'];
    A.fill(0,0,32,48,(x,y)=>{
      const sway=Math.sin(y*Math.PI/24+phase)*.8+Math.sin(y*Math.PI/8-phase)*.3;
      const width=10.3+Math.sin(y*Math.PI/12+phase)*.6,u=(x-16-sway)/width;
      if(Math.abs(u)>1)return null;
      const flow=Math.sin(x*1.3+Math.sin(y*Math.PI/24+phase)*.8+phase);
      return softTone(C,-u*.48+Math.sqrt(Math.max(0,1-u*u))*.35+flow*.12);
    });
    for(let i=0;i<24;i++){const x=8+((i*17)%16),y=((i*13+frame*3)%48);A.line(x,y,x+.3,y+1.4,i%3?'#e6c58e':'#f9e3b8',true,.34);}
  },0);
}
function duneSandCrownArt(frame) {
  return duneBake('sandCrown:'+frame,36,12,A=>{
    const C=['#a47743','#c69857','#dcba7c','#efd49d','#fff0c6'];
    A.fill(1,0,35,11,(x,y)=>{
      const top=.55+Math.sin(x*.6+frame*.15)*.3,bottom=8.7-Math.pow((x-18)/17,2)*3+Math.sin(x*.7+frame*.3)*.3;
      if(y<top||y>bottom||Math.abs(x-18)>16.2-Math.abs(y-4)*.25)return null;
      return softTone(C,.95-y*.23-(x-15)*.025);
    });
    for(let i=0;i<30;i++){const x=3+(i*19)%30,y=1+(i*7)%7;A.ell(x,y,.2,.2,i%3?'#e6c48a':'#b38b55',true);}
  });
}
