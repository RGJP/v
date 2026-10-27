'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// 3-3 BAYOU BOOGIE painted fine (behaviour: enemies-bayou.js, game-bayou.js). Baked once per pose with mArt
// (meadow-art.js): soft shading, one ink line round each figure.
// ═══════════════════════════════════════════════════════════════════════════
const BAYOU_ART = new Map();
const bayouArt = (key, paint) => BAYOU_ART.get(key) || (BAYOU_ART.set(key, paint()), BAYOU_ART.get(key));
// every musician's frame: 68 x 46, his feet (bottom middle) at (30, 42), facing +x
const BAND_W = 68, BAND_H = 46, BAND_OX = 30, BAND_OY = 42;
const FUR = ['#3e3a4c', '#5c586c', '#8e8a9c', '#b8b4c4', '#e4e0ea'], WAIST = ['#5a1420', '#86243a', '#ac404f', '#d8606a', '#f0a0a0'];
const bandFrame = () => { const A = mArt(BAND_W, BAND_H, ART_R * 2); return [A, x => BAND_OX + x, y => BAND_OY + y]; };
function drawBandArt(ctx, x, y, face, img) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (face < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, -BAND_OX, -BAND_OY); ctx.restore();
}

// Smooth cached musician art. Every contour is drawn at 6x, with rounded joins;
// instrument tubing, fingers and facial features keep a consistent fine line weight.
function bandPainter(w=BAND_W,h=BAND_H,ox=BAND_OX,oy=BAND_OY) { return smoothPainter(w,h,ox,oy); }
function bandTrumpet(P, x, y, hit) {
  const {g,path,ell,line,grad}=P; g.save(); g.translate(x,y);
  const gold=grad(-4,6,'#ffe49a','#b87921');
  // A single rounded return loop and a flared bell with a dark, inset opening.
  path('M 4 0 L 14 0 L 14 4 Q 14 5.7 12 5.7 L 6 5.7 Q 4 5.7 4 4 Z',null,P.ink,2.2);
  path('M 4 0 L 14 0 L 14 4 Q 14 5.7 12 5.7 L 6 5.7 Q 4 5.7 4 4 Z',null,gold,1.25);
  line(0,0,17,0,P.ink,2.2); line(0,0,17,0,gold,1.25);
  line(-0.5,-0.6,-0.5,0.6,'#dfe8ed',1);
  path('M 14 -0.7 Q 17 -1 19 -3.1 L 19 3.1 Q 17 1 14 0.7 Z',gold);
  ell(19,0,1.1,3.1,'#aa681d'); ell(19.2,-0.2,0.55,2.2,'#5c3d22',null);
  for (const vx of [6,9,12]) {line(vx,-2.3+(hit?0.6:0),vx,1.2,'#ac782d',0.7);line(vx-0.8,-2.3+(hit?0.6:0),vx+0.8,-2.3+(hit?0.6:0),'#fff1bd',0.8);}
  line(15,-0.55,18,-1.8,'#fff1b8',0.35);g.restore();
}
// RASCAL: clear raccoon mask, rounded ears, ringed tail and a polished marching drum.
function rascalArt(step, hit, shh, shut) {
  return bayouArt('rascalClean'+step+hit+shh+shut,()=>{
    const P=bandPainter(),{g,path,ell,line,grad,ink}=P;
    const fur=grad(-30,0,'#d5d2dc','#747082'), red=grad(-17,0,'#d76470','#832c46');
    path('M -7 -6 C -17 -2 -20 -10 -15 -18 C -12 -22 -10 -17 -11 -13 Q -12 -9 -6 -9 Z',fur);
    g.save();g.clip();for(const y of [-17,-12,-7])line(-19,y,-10,y+2,'#423d50',2.4);g.restore();
    ell(-4+(step?1:0),-1.7,3.3,1.7,fur);ell(5-(step?1:0),-1.7,3.2,1.7,fur);
    path('M -6 -17 Q -9 -13 -7 -5 Q 0 -1 7 -5 L 6 -17 Z',red);
    path('M -2 -17 L 3 -17 L 2 -6 L -1 -6 Z','#fff0dc',null);
    line(-2,-16,-3,-10,'#ffbdac',0.5);ell(-3.8,-8.5,0.55,0.55,'#ffdb80',null);
    ell(-5.8,-28,2.7,3,fur);ell(5.4,-28,2.6,3,fur);
    ell(-5.8,-28,1.4,1.6,'#bd8d9f',null);ell(5.4,-28,1.3,1.6,'#bd8d9f',null);
    path('M -7 -25 Q -10 -20 -6 -17 Q 0 -13 7 -18 Q 10 -22 6 -26 Q 0 -30 -7 -25 Z',fur);
    path('M -7 -23 Q -4 -25 0 -22 Q 4 -25 7 -23 L 6 -19 Q 3 -18 0 -20 Q -3 -18 -6 -19 Z','#3b3549',null);
    ell(0.6,-17.8,4.1,2.4,'#f4efe9',null);
    if(shut||shh){path('M -5 -21 Q -3.5 -19.7 -2 -21',null,'#ede6ef',0.6);path('M 2 -21 Q 3.5 -19.7 5 -21',null,'#ede6ef',0.6);}
    else for(const x of [-3.5,3.6]){ell(x,-21.5,1.5,1.7,'#fff9ec',null);ell(x+0.35,-21.4,0.8,1.1,ink,null);ell(x+0.1,-21.9,0.25,0.3,'#fff',null);}
    ell(0.7,-18.7,1.2,0.8,ink,null);path('M -0.6 -16.7 Q 1 -15.7 2.5 -16.8',null,ink,0.4);
    // Sling passes behind the drum; the cream head stays uncluttered.
    line(-4,-15,8,-6,'#e8ba73',1.4);
    ell(5.1,-8.5,9.2,8.5,red);ell(4.5,-8.6,7.2,6.7,'#f6dca2');ell(4.5,-8.6,6.4,5.9,grad(-14,-2,'#fff9e9','#e7d5b3'),null);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ell(5.1+Math.cos(a)*8.2,-8.5+Math.sin(a)*7.5,0.45,0.55,'#fff1c0',null);}
    path('M -6 -14 Q -10 -14 -9 -10 Q -8 -8 -6 -9',fur);
    const mx=hit?1:-10,my=hit?-8:-23;
    line(-7,-11,mx,my,'#65442d',1.2);line(-7.2,-11.2,mx-0.2,my-0.2,'#d9b479',0.45);
    ell(mx,my,1.8,2,'#fff0d6');ell(-7,-11,1.9,1.6,fur);
    if(shh) {ell(4,-16,1.1,2.5,fur);line(4,-17.5,4,-15.5,'#f5edf1',0.35);}
    return P.art;
  });
}
// RASCAL asleep on his back in profile, like the cave giant: feet left, nose up,
// one visible eye and ear. The drum supports his back; only his belly and paw breathe.
function rascalSleepArt(breath) {
  return bayouArt('rascalProfileZ' + breath, () => {
    const [A, X, Y] = bandFrame(), b = -breath * 0.45;
    const cream = ['#aaa5b0', '#cac6ce', '#e7e3e7', '#f6f1ec', '#ffffff'];
    const mask = ['#211d2d', '#302b40', '#454052', '#5c5569', '#756e80'];
    // Ringed tail trails over the left edge of the drum, behind his legs.
    A.soft(X(-18), Y(-2), 7.2, 2.8, FUR, null, -0.12);
    A.fill(X(-26), Y(-6), X(-10), Y(2), (x) =>
      Math.cos((x - X(-23)) * 1.2) > 0.2 ? '#383244' : null, true);
    // Far leg and its upturned foot, kept darker for a clear side silhouette.
    A.soft(X(-10), Y(-4.5), 6.4, 2.7, FUR);
    A.soft(X(-14), Y(-8), 2.4, 4.2, FUR, null, -0.2);
    // Rounded waistcoat and cream shirt facing upward, with a low supported back.
    A.soft(X(-2.5), Y(-5.5 + b), 10.5, 6.0, WAIST);
    A.soft(X(-2.8), Y(-9.3 + b), 7.4, 3.3, cream);
    A.soft(X(5.4), Y(-5.1), 4.2, 3.8, WAIST);
    A.line(X(0.7), Y(-10.7 + b), X(4.7), Y(-7.8), WAIST[0], null, 0.55);
    A.ell(X(2.7), Y(-9.0 + b), 0.55, 0.55, '#ffd166');
    // Near leg lies along the skin; the sole points left and toes relax upward.
    A.soft(X(-10.3), Y(-3.0), 6.3, 2.7, FUR);
    A.soft(X(-16), Y(-6.4), 2.8, 4.5, FUR, null, -0.18);
    A.soft(X(-17.2), Y(-6.9), 1.3, 3.0, mask);
    for (const ty of [-9.1, -7.6]) A.line(X(-17.8), Y(ty), X(-16.8), Y(ty + 0.1), FUR[3], null, 0.33);
    // Head rests on the drum, face rotated upward rather than facing the viewer.
    A.soft(X(12.4), Y(-6.4), 6.7, 5.7, FUR);
    A.soft(X(12.7), Y(-11), 4.3, 2.8, cream, null, -0.35);
    A.soft(X(15.3), Y(-9.9), 3.5, 2.5, mask, null, -0.55);
    // Pale tapered muzzle and small nose break the upper silhouette.
    A.soft(X(9.3), Y(-10.7), 3.8, 2.8, cream, null, -0.5);
    A.soft(X(11), Y(-13.1), 2.2, 2.9, cream, null, -0.25);
    A.soft(X(11.3), Y(-15.4), 1.6, 1.1, mask);
    A.ell(X(10.8), Y(-15.7), 0.5, 0.27, '#c8c3d0');
    // Only the near ear is fully visible, low on the back of the reclining head.
    A.soft(X(17.4), Y(-4.5), 2.7, 3.0, FUR, null, 0.25);
    A.soft(X(17.6), Y(-4.6), 1.5, 1.8, ['#75566a', '#a77b8a', '#cd9eaa', '#e7bdc4', '#f4d7da']);
    // A relaxed arm across the belly, with the mallet loosely held in his paw.
    A.soft(X(3.8), Y(-6.8 + b), 4.5, 1.9, FUR, null, 0.5);
    A.line(X(-6.5), Y(-12.6 + b), X(4.5), Y(-11.5 + b), '#865a35', null, 0.85);
    A.soft(X(-6.8), Y(-12.7 + b), 1.8, 2.0, cream);
    A.soft(X(-0.7), Y(-10.3 + b), 2.7, 1.8, FUR);
    A.outline();
    // Smooth closed eyelid and tiny open snoring mouth, legible at game size.
    const art = A.canvas(), g = art.getContext('2d');
    g.save(); g.scale(art.r, art.r); g.lineCap = 'round';
    g.beginPath(); g.moveTo(X(13.6), Y(-10.8));
    g.quadraticCurveTo(X(15.3), Y(-9.1), X(16.7), Y(-10.9));
    g.strokeStyle = '#f3edf2'; g.lineWidth = 0.65; g.stroke();
    g.beginPath(); g.ellipse(X(7.8), Y(-11.4), 1.1, 0.7 + (breath + 1) * 0.13, -0.4, 0, Math.PI * 2);
    g.fillStyle = '#302131'; g.fill();
    g.beginPath(); g.moveTo(X(-1.8), Y(-10.2 + b)); g.lineTo(X(-1.4), Y(-9.3 + b));
    g.strokeStyle = FUR[1]; g.lineWidth = 0.35; g.stroke();
    g.restore();
    return art;
  });
}
// BIG LOU: a relaxed bullfrog, porkpie hat and rounded brass sousaphone.
function louArt(step, hit, shh, sad) {
  return bayouArt('louClean'+step+hit+shh+sad,()=>{
    const P=bandPainter(),{path,ell,line,grad,ink}=P;
    const green=grad(-27,0,'#a9d477','#427942'),gold=grad(-35,0,'#ffdf80','#a66b20');
    ell(-9,-1.8-(step?1:0),5,1.8,green);ell(10,-1.8+(step?0.5:0),5,1.8,green);
    path('M -8 -23 C -12 -20 -15 -8 -10 -4 Q 0 1 11 -4 C 16 -9 12 -20 7 -23 Z',green);
    ell(0.7,-10,8.1,6.6,grad(-17,-3,'#fff1bc','#d9ca8e'),null);
    ell(-5.6,-23.5,3.7,3.6,green);ell(6,-23.5,3.7,3.6,green);
    // Wide cheeks and throat sit behind the horn, keeping the frog recognizable.
    ell(1,-18.3,9,4.6,green,null);
    if(hit)ell(9,-17.5,2.6,2.5,'#9acb66',null);
    if(sad)path('M -4 -17 Q 0 -18 4 -17',null,'#365b36',0.7);
    else path('M -6 -17 Q 0 -14.5 6.5 -17',null,'#365b36',0.6);
    // Continuous tubing: a soft U instead of squared-off bars.
    path('M -10 -18 C -17 -4 -7 -2 4 -3 C 15 -3 13 -12 13 -24',null,ink,3.7);
    path('M -10 -18 C -17 -4 -7 -2 4 -3 C 15 -3 13 -12 13 -24',null,gold,2.6);
    path('M -10.4 -17 C -15 -7 -9 -4 -3 -4',null,'#ffeeb0',0.6);
    path('M 10 -23 Q 10 -26 6 -29 Q 11 -35 20 -30 Q 17 -25 15 -23 Z',gold);
    ell(13.4,-29.7,7.1,5.3,gold,ink,0.65,-0.2);
    ell(13.4,-29.6,5.6,3.8,grad(-34,-26,'#70431b','#d69935'),null,0.6,-0.2);
    ell(13.8,-28.8,2.7,1.8,'#68431f',null,0.6,-0.2);
    path('M 8 -31 Q 12 -34 17 -32.8',null,'#fff0b1',0.7);
    line(-4,-11,7,-11,gold,2.2);
    for(const x of [-2,1,4]){line(x,-13.5+(hit?0.6:0),x,-9,'#bc8c37',1);ell(x,-13.5+(hit?0.6:0),1,0.45,'#fff2c6',null);}
    path('M -7 -15 Q -8 -11 -4 -11',null,green,3);ell(-4,-11,2,1.5,green);
    ell(7,-10.7,2.1,1.7,green);
    path('M 6 -11 L 7 -16 Q 7 -18 5 -18',null,gold,1.1);
    // Hat and shades have simple, crisp silhouettes.
    ell(0,-27.3,6.5,1.2,'#534259');
    path('M -4.5 -27.5 L -4 -31 Q 0 -32.3 4 -31 L 4.5 -27.5 Z',grad(-32,-27,'#967b91','#55425e'));
    line(-3.9,-28.4,3.9,-28.4,'#e9b865',0.8);
    for(const x of [-5.6,6]){ell(x,-23.1,2.7,2.3,'#242c34');path(`M ${x-1.5} -23.9 Q ${x-0.3} -24.8 ${x+0.8} -24.1`,null,'#94cac4',0.6);}
    line(-2.8,-23.2,3.2,-23.2,ink,0.8);
    if(shh)ell(2,-17.2,1,2.6,green);
    return P.art;
  });
}
// Discovery: Lou is inside the sideways bell; his two webbed feet kick independently.
function louStuckArt(kick) {
  return bayouArt('louStuckClean'+kick,()=>{
    const P=bandPainter(),{path,ell,line,grad}=P,gold=grad(-25,0,'#ffe295','#af7524'),green=grad(-20,0,'#b4d981','#548745');
    path('M 0 -18 L -12 -18 C -23 -18 -23 -3 -12 -3 L 3 -3',null,P.ink,3.8);
    path('M 0 -18 L -12 -18 C -23 -18 -23 -3 -12 -3 L 3 -3',null,gold,2.7);
    path('M -12 -17 C -20 -17 -21 -6 -14 -4',null,'#fff0b3',0.65);
    line(-15,-10,5,-10,gold,2.2);
    for(const x of [-11,-7,-3]){line(x,-13.3,x,-7,'#af792d',1);ell(x,-13.4,1.2,0.5,'#fff0bd');}
    path('M 1 -15 Q 5 -16 8 -21 Q 16 -24 21 -16 L 21 -3 Q 10 4 6 -4 Q 4 -6 1 -6 Z',gold);
    ell(14,-10,9,10,gold);ell(15,-10,7,8,'#674423');ell(15.5,-10,5.8,6.8,'#3c3025',null);
    // Bent legs emerge from inside the throat, so the stuck pose reads immediately.
    path(`M 16 -13 Q 22 -15 ${24} ${-13+kick*0.4} L 29 ${-17+kick*0.7}`,null,P.ink,4.3);
    path(`M 16 -13 Q 22 -15 ${24} ${-13+kick*0.4} L 29 ${-17+kick*0.7}`,null,green,3.2);
    path(`M 17 -7 Q 22 -4 26 ${-6-kick*0.4} L 29 ${-5-kick*0.7}`,null,P.ink,4.3);
    path(`M 17 -7 Q 22 -4 26 ${-6-kick*0.4} L 29 ${-5-kick*0.7}`,null,green,3.2);
    ell(30,-17+kick*0.7,3.2,1.6,green);ell(30,-5-kick*0.7,3.2,1.6,green);
    for(const y of [-17+kick*0.7,-5-kick*0.7])line(30,y,32,y,'#47723b',0.35);
    ell(-12,-22,6,1.2,'#594560');path('M -16 -22 L -15.5 -26 Q -12 -27 -8.5 -26 L -8 -22 Z',grad(-27,-21,'#997b93','#57445f'));
    line(-15.4,-23,-8.6,-23,'#e9b865',0.8);
    return P.art;
  });
}
// DIZZY: a goose with a long curved neck, blue waistcoat and a straw boater.
function dizzyArt(step, hit, shh, sad, sit) {
  return bayouArt('dizzyClean'+step+hit+shh+sad+sit,()=>{
    const P=bandPainter(),{g,path,ell,line,grad,ink}=P;
    const white=grad(-30,0,'#fffdf1','#bcc2cf'),blue=grad(-18,-2,'#7facc7','#3b587e'),orange=grad(-28,0,'#ffda78','#db8736');
    const hat=(x,y)=>{g.save();g.translate(x,y);ell(0,0,5.8,1.2,'#f5d588');path('M -3.7 -0.3 L -3.4 -3.4 Q 0 -4.3 3.4 -3.4 L 3.7 -0.3 Z',grad(-4,0,'#ffe8aa','#d9aa55'));line(-3.4,-1.1,3.4,-1.1,'#80523c',0.8);g.restore();};
    if(sit){
      ell(-4,-1,4,1,orange);ell(5,-1,4,1,orange);
      path('M -10 -5 Q -13 -11 -6 -13 Q 0 -15 3 -11 C 3 -15 0 -21 5 -23 C 10 -25 12 -20 10 -17 Q 7 -15 7 -9 Q 10 -2 0 -2 Z',white);
      path('M -9 -12 Q -2 -15 2 -11 L 5 -3 Q -4 1 -10 -5 Z',blue);
      path('M 9 -20 Q 13 -20 15 -17 Q 12 -16 9 -17 Z',orange);
      hat(6,-24);
      path('M 6 -19.6 Q 7.4 -18.6 9 -19.3',null,ink,0.6);
      bandTrumpet(P,-7,-5,false);
      ell(-4,-7,4,2,white,ink,0.55,-0.25);ell(5,-6,2.4,1.5,white);
    }else{
      for(const x of [-4+(step?1:0),4-(step?1:0)]){line(x,-6,x,-1.5,'#cb7830',0.9);ell(x+1,-1.1,2.8,0.95,orange);}
      // One continuous neck/body contour avoids the old stack of disconnected ovals.
      path('M -10 -11 Q -13 -17 -6 -19 Q -3 -20 0 -18 C 3 -20 -3 -28 1 -31 C 5 -34 10 -30 8 -26 Q 6 -24 5 -24 C 3 -21 7 -18 7 -12 Q 5 -5 -3 -6 Q -9 -6 -10 -11 Z',white);
      path('M -8 -18 Q -2 -20 2 -17 L 5 -8 Q -4 -3 -10 -10 Z',blue);
      path('M 1 -18 L 3 -15 L 1 -12',null,'#c1d8e3',0.6);
      ell(2,-10,0.5,0.5,'#f4d386',null);
      path('M 7 -28 Q 10 -28 11.4 -26 Q 10 -24.7 7 -25.3 Z',orange);
      hat(3,-32);
      if(sad||shh)path('M 3 -28.4 Q 4.3 -27.5 5.6 -28.4',null,ink,0.55);
      else{ell(4.5,-28.5,1.25,1.5,'#fff',null);ell(4.9,-28.4,0.6,0.95,ink,null);ell(4.7,-28.8,0.2,0.25,'#fff',null);}
      if(!shh){path('M 3 -14 Q 10 -17 20 -19.9',null,ink,2.8);path('M 3 -14 Q 10 -17 20 -19.9',null,white,1.8);bandTrumpet(P,11,-25.5,hit);path('M -5 -15 Q -2 -20 8 -20',null,ink,3.5);path('M -5 -15 Q -2 -20 8 -20',null,white,2.5);ell(9,-20,2.5,1.3,white);ell(20,-19.9,2,1.2,white);}
      else{ell(-5,-13,3.4,4,white,ink,0.55,-0.25);ell(5,-23.1,0.9,2.4,white);}
    }
    return P.art;
  });
}

// ── the bayou's instruments ──
// a drum standing in the swamp (w x 26; its top-left at (1, 1)): shell, chrome lugs, hoops, the skin (dip: pressed in)
function drumArt(bass, w, dip) {
  return bayouArt('drum' + bass + w + dip, () => {
    const A = mArt(w + 2, 26), sh = bass ? 18 : 12, top = 1 + dip, X0 = 1, X1 = w + 1;
    const SHELL = bass ? ['#5a1410', '#8a2420', '#d84a3a', '#ff8a6a', '#ffc0a8'] : ['#14305a', '#1e4a8a', '#3a7ad8', '#7ab8ff', '#c0e0ff'];
    A.fill(X0, top + 2.6, X1, top + 3 + sh, (x, y) => softTone(SHELL, 1.2 - (y - top - 3) / sh * 2 - Math.abs(x - (X0 + X1) / 2) / w * 0.6));
    for (let i = 4; i < w - 2; i += 6) { A.line(X0 + i, top + 3, X0 + i, top + 3 + sh, '#c8ccd8', null, 0.7); A.soft(X0 + i + 0.4, top + 6.6, 1.1, 1.1, ['#7a7e8a', '#a8acb8', '#d8dce8', '#f0f2f8', '#ffffff']); }   // chrome lugs
    const hoop = y => A.fill(X0, y, X1, y + 2.4, (x, yy) => softTone(['#6a6e7a', '#a8acb8', '#c8ccd8', '#eceef4', '#ffffff'], 1.4 - (yy - y)));
    hoop(top); hoop(top + sh + 2.6);
    A.fill(X0 + 0.6, top - 0.6, X1 - 0.6, top + 0.8, () => dip ? '#ffffff' : '#f4efe4');   // the skin
    if (!bass) for (let i = 2; i < w - 2; i += 3) A.line(X0 + i, top + sh + 3.4, X0 + i + 1.6, top + sh + 3.4, '#d8dce8', null, 0.4);   // snare wires
    if (bass) A.soft(X0 + w / 2, top + 3 + sh / 2, 4.2, 4.2, ['#a8781a', '#d8a02a', '#ffd166', '#fff0a0', '#ffffff']);   // the bass drum's gold badge
    A.outline();
    return A.canvas();
  });
}
// ── the bayou's critters and its people ──
const TOAD = ['#3a3418', '#5a4a22', '#8a7a3a', '#b8a85a', '#e0d490'], GATOR = ['#1e3018', '#2a4224', '#4a6a3a', '#7a9a5a', '#a8c488'];
// a frame for small critters: 36 x 30, feet (bottom middle) at (18, 26), facing +x
const critFrame = () => { const A = mArt(36, 30); return [A, x => 18 + x, y => 26 + y]; };
function drawCritArt(ctx, x, y, face, img) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (face < 0) ctx.scale(-1, 1); ctx.drawImage(img, -18, -26); ctx.restore(); }
// the hopping toad (Bopper): warty, cream-bellied, goggle-eyed; legs tucked or kicked out in the air; its throat sac puffing (sac 0..2)
function bopperArt(air, sac) {
  return bayouArt('bop' + air + sac, () => {
    const [A, X, Y] = critFrame();
    if (air) { A.soft(X(-8), Y(-3), 3.6, 1.4, TOAD, null, 0.3); A.soft(X(-9.6), Y(-1), 2.4, 1.2, TOAD); }
    else for (const fx of [-6, 6]) A.soft(X(fx), Y(-1.6), 2.8, 1.8, TOAD);
    A.soft(X(0), Y(-6), 6.6, 4.8, TOAD); A.soft(X(0.4), Y(-9.4), 5, 2.6, TOAD);
    for (const ex of [-3, 4]) A.soft(X(ex), Y(-11), 2.3, 2.2, TOAD);
    A.fill(X(-6), Y(-8), X(6), Y(-1), (x, y) => { const u = (x - X(0.5)) / 5.4, v = (y - Y(-3.4)) / 2.6; return u * u + v * v <= 1 ? '#e8d8a0' : null; }, true);
    A.fill(X(-7), Y(-12), X(7), Y(-3), (x, y) => { const h = Math.sin(Math.floor(x * 0.7) * 12.9 + Math.floor(y * 0.7) * 78.2) * 43758.5; return h - Math.floor(h) < 0.08 ? TOAD[1] : null; }, [TOAD[2], TOAD[3]]);   // warts
    if (sac) A.soft(X(4), Y(-3.4), 2.6 + sac * 0.6, 2.4 + sac * 0.5, ['#a89040', '#c8b058', '#f0d880', '#fff0b0', '#ffffff']);
    A.outline();
    for (const ex of [-3, 4]) { A.ell(X(ex), Y(-11.2), 1.4, 1.3, '#fff3b0'); A.ell(X(ex + 0.4), Y(-11), 0.6, 0.9, INK); }
    A.line(X(1), Y(-5.8), X(6), Y(-6.2), TOAD[1], null, 0.4);
    return A.canvas();
  });
}
// the mosquito (Skeeter): a striped body, a long needle of a proboscis, glassy buzzing wings (hot: flushed red, locking on)
function skeeterArt(wing, hot, dive) {
  return bayouArt('skeet' + wing + hot + dive, () => {
    const [A, X, Y] = critFrame(), B = hot ? ['#5a1420', '#8a2a3a', '#c83a4a', '#f06a7a', '#ffb0b8'] : ['#2a2238', '#4a3e5a', '#6a5a7a', '#9a8aaa', '#cabcd8'];
    for (const lx of [-4, -1, 2]) A.line(X(lx), Y(-5), X(lx - 1), Y(0.6), '#3a3448', null, 0.4);
    A.soft(X(-2.6), Y(-6), 4.8, 2.2, B, null, 0.15); A.soft(X(4), Y(-7.4), 2.2, 2, B);
    A.fill(X(-8), Y(-9), X(2), Y(-3), (x) => Math.abs(((x - X(-6)) % 2.4) - 1.2) < 0.4 ? B[4] : null, true);   // stripes
    A.line(X(6), Y(-6.4), X(12), Y(-5.8), dive || hot ? '#ff5d73' : '#c87a8a', null, 0.5);                 // the needle
    A.outline();
    A.ell(X(4.8), Y(-8), 0.8, 0.8, '#ff5d73');
    const W = ['#c8d8f0', '#dce8fc', '#e6f0ff', '#f4f8ff', '#ffffff'];
    A.soft(X(-3), Y(-11 - wing), 3.4, 1.5, W, [null], -0.3); A.soft(X(1), Y(-11.6 + wing), 3.4, 1.5, W, [null], 0.3);   // (behind: only where nothing's painted)
    return A.canvas();
  });
}
// SNAPJAW's jaws (32 x 14; the hinge at (2, 8), the snout toward +x): upper (with nostrils and teeth over the lip) or lower
function gatorJawArt(upper, open) {
  return bayouArt('jaw' + upper + open, () => {
    const A = mArt(34, 16), Y0 = 8;
    if (upper) {
      A.fill(1, 0, 32, Y0 + 1, (x, y) => { const u = (x - 2) / 29, top = Y0 - 7 + u * 1.5; return y >= top && y <= Y0 && u >= 0 && u <= 1 ? softTone(GATOR, 1.2 - (y - top) * 0.5) : null; });
      A.soft(29, Y0 - 5.4, 2.6, 1.6, GATOR); A.ell(29.4, Y0 - 5.6, 0.6, 0.4, GATOR[0]);
      A.outline();
      for (let i = 4; i < 28; i += 4) A.poly([[2 + i, Y0], [3.6 + i, Y0], [2.8 + i, Y0 + 1.8]], '#ffffff');
    } else {
      A.fill(1, Y0, 32, Y0 + 6, (x, y) => { const u = (x - 2) / 29; return y >= Y0 && y <= Y0 + 4.6 - u * 1 && u >= 0 && u <= 1 ? (y > Y0 + 3 ? '#d8d0a0' : softTone(GATOR, 0.6 - (y - Y0) * 0.3)) : null; });
      if (open) A.fill(3, Y0 - 2, 30, Y0 + 1, (x, y) => y > Y0 - 1.6 ? '#e86a7a' : null);
      A.outline();
      if (open) for (let i = 4; i < 28; i += 4) A.poly([[2 + i, Y0 - 1.6], [3.6 + i, Y0 - 1.6], [2.8 + i, Y0 - 3.4]], '#ffffff');
    }
    return A.canvas();
  });
}
// MAMA HUSH: smooth contours at the musicians' 6x resolution, with a clear scowl and one
// oversized rolling pin. Window and party poses share the same old mouse's face.
const MAMA_CIG_X = 14.8, MAMA_CIG_Y = -5.5;
function paintMamaHead(P, cx, cy, happy = false) {
  const {g,path,ell,line,grad,ink} = P;
  g.save(); g.translate(cx, cy);
  const fur = grad(-10,9,'#d2c9c7','#8b7d85'), muzzle = grad(1,9,'#f0dfcf','#c1a7a3');
  // Big bare ears, a lopsided silver bun, and two stubborn wisps.
  for (const side of [-1,1]) {
    ell(side*8.3,-5.4,4.3,4.8,fur);
    ell(side*8.5,-5.3,2.8,3.3,grad(-9,-2,'#e6b6b6','#b4788d'),null);
    path(`M ${side*9.6} -7 Q ${side*6.5} -6.6 ${side*8.8} -3.5`,null,'#aa798a',.45);
  }
  ell(-2.8,-9,4.8,3.8,grad(-13,-5,'#eee7df','#9b919e'));
  path('M -6.5 -9 Q -4 -12 -1.5 -10 Q 1 -8 -2.3 -7.1',null,'#faf1e6',.55);
  path('M -4 -11.3 Q -3 -13 0 -12.2',null,'#aaa0aa',.4);
  path('M -6 -6 Q -3 -10 3 -7 Q 9 -5 8.5 1 L 7 6 Q 3 10 -3 7.8 Q -9 7 -8.2 .3 Q -8 -4 -6 -6 Z',fur);
  path('M -6 -5.4 Q -3 -8 -1 -5.3 Q 1 -8 4 -5',null,'#eee4d9',1.2);
  // Sagging cheeks, old-lady eye bags and a long, crooked mouse muzzle.
  ell(-5.5,3,2.4,3.1,grad(0,6,'#c7b6b7','#a18b98'),null);
  ell(5.8,3.5,2.5,3.1,grad(0,7,'#d4b9b5','#a18b98'),null);
  path('M -4.5 3 Q -1.2 .4 4 2.5 Q 6.5 2.9 8.4 4.1 Q 9.7 6 6.5 7.5 Q .7 10 -3.2 7 Q -5.5 6.5 -4.5 3 Z',muzzle);
  // Thin burgundy reading glasses ride low below a pair of ferocious white brows.
  for (const side of [-1,1]) {
    const x = side*3.4;
    ell(x,.8,2.75,1.9,'#e3d7c7','#543b4e',.65);
    if (happy) path(`M ${x-1.4} .8 Q ${x} -.2 ${x+1.4} .8`,null,ink,.5);
    else {
      ell(x+.25,.8,.6,.85,'#302631',null);
      line(x-1.8,-.1,x+1.7,.35,'#96848d',.7);
    }
    path(`M ${side*6.2} -3.1 Q ${side*3.8} -4.4 ${side*.9} -1.7`,null,'#f0e5df',1.25);
    path(`M ${side*5.8} 3 Q ${side*4.2} 4 ${side*2.4} 3.5`,null,'#9e808d',.45);
    line(side*7,.3,side*9,1.1,'#796570',.4);
  }
  path('M -.8 .7 Q 0 .2 .8 .7',null,'#543b4e',.55);
  line(-5,-4.8,-2.8,-4.4,'#9b8691',.4);
  line(1.1,-4.7,3,-5,'#9b8691',.4);
  ell(7.5,4.2,1.75,1.2,grad(3,6,'#b57983','#775165'));
  ell(7.2,3.8,.65,.3,'#e1b2ae',null);
  if (happy) path('M -.8 6 Q 1.2 8.8 4.2 6.1',null,'#704956',.65);
  else {
    path('M -1.8 5.8 Q .5 4.8 4.7 5.9 L 3.6 8.1 Q -.7 8.9 -1.8 5.8 Z','#583242',null);
    path('M -.8 5.8 L .9 5.9 L .7 7.2 L -.6 7.1 Z','#fff0d9',null);
  }
  for (const side of [-1,1]) {
    path(`M ${side*5.8} 4.4 Q ${side*8.6} 3 ${side*11.6} 3.7`,null,'#e3d1c6',.35);
    line(side*6.2,5.2,side*11.3,6.5,'#bda7ac',.35);
  }
  // The cigarette stays at the corner of her mouth; the live smoke begins at its glowing tip.
  line(3.4,6.3,MAMA_CIG_X,8.5,ink,1.9);
  line(3.4,6.3,MAMA_CIG_X,8.5,'#eee4d0',1.15);
  line(3.4,6.3,5.6,6.7,'#bd8d58',1.25);
  line(13.3,8.2,MAMA_CIG_X,8.5,'#9f9290',1.25);
  ell(MAMA_CIG_X,8.5,.55,.6,'#ed8b59',null);
  g.restore();
}
function mamaNightie(P, cx, bottom) {
  const {path,line,ell,grad} = P;
  path(`M ${cx-6} ${bottom-12} Q ${cx-11} ${bottom-10} ${cx-10} ${bottom} L ${cx+10} ${bottom} Q ${cx+10} ${bottom-11} ${cx+5} ${bottom-12} Z`,grad(bottom-13,bottom,'#a79dbd','#665876'));
  path(`M ${cx-6} ${bottom-12} L ${cx} ${bottom-9} L ${cx-3.3} ${bottom-6} L ${cx-8} ${bottom-10} Z`,'#e3d6cb');
  path(`M ${cx+5} ${bottom-12} L ${cx} ${bottom-9} L ${cx+3.3} ${bottom-6} L ${cx+7.5} ${bottom-10} Z`,'#f2e2cf');
  for (const y of [bottom-6,bottom-2.5]) ell(cx,y,.6,.65,'#e9d2ac',null);
  for (const x of [-6,6]) line(cx+x,bottom-6,cx+x*1.15,bottom-1,'#baadca',.45);
}
function mamaWindowArt(shake) {
  return bayouArt('mamaCleanWindow'+shake,()=>{
    const P=bandPainter(40,36,0,0),{path,grad}=P;
    mamaNightie(P,20,35);
    path('M 11 24 Q 6 23 6 30 L 12 33 Z',grad(23,34,'#a79dbd','#766482'));
    path('M 27 25 Q 33 23 33 30 L 28 33 Z',grad(23,34,'#a79dbd','#766482'));
    paintMamaHead(P,20,16,false);
    return P.art;
  });
}
function mamaWindowGestureArt(shake) {
  return bayouArt('mamaCleanGesture'+shake,()=>{
    const P=bandPainter(40,36,0,0),{g,path,ell,line,grad}=P;
    const gy=27+shake*.3, hand=grad(gy-3,gy+3,'#e8c9b6','#b99394');
    path(`M 11 25 Q 6 23 6 ${gy+2} Q 8 ${gy+5} 12 ${gy+3} L 14 29 Z`,grad(24,34,'#b3a4c6','#776284'));
    path(`M 7 ${gy-1} L 10 ${gy-1} L 10 ${gy+3} L 7 ${gy+2} Z`,'#e4d5c8');
    g.save(); g.translate(9,gy); g.rotate(-.22+shake*.065);
    // Broad maple barrel, rounded shoulders, two narrow handles: unmistakably a dough roller.
    path('M -.8 -24 Q 0 -24.8 .8 -24 L .8 -20 L -.8 -20 Z','#a9703c');
    path('M -1.1 -20 Q -2.8 -20 -2.8 -18 L -2.8 -7 Q -2.8 -5 -1 -5 L 1 -5 Q 2.8 -5 2.8 -7 L 2.8 -18 Q 2.8 -20 1.1 -20 Z',grad(-20,-5,'#edd4a1','#c38b4c'));
    path('M -.8 -5 L .8 -5 L .8 1 Q 0 2 -.8 1 Z','#aa7440');
    line(-1.6,-17.8,-1.6,-7.4,'#fff0c9',.6);
    path('M .7 -18 Q -.2 -14 .9 -10',null,'#b38049',.35);
    ell(0,-2.2,2.1,2.3,hand);
    ell(1.7,-3,1.05,1.6,hand);
    for (const y of [-2.7,-1.5]) path(`M -1.5 ${y} Q -.5 ${y+.5} .7 ${y+.2}`,null,'#a77981',.4);
    g.restore(); return P.art;
  });
}
function mamaShelfArt(happy,sway) {
  return bayouArt('mamaCleanShelf'+happy+sway,()=>{
    const P=bandPainter(40,40,0,0),{path,line,ell,grad}=P;
    path('M 13 31 Q 4 30 6 36 Q 9 39 11 35',null,'#c6959f',1.6);
    mamaNightie(P,20,37);
    for (const x of [16,24]) ell(x,38,2.7,1.2,grad(36,40,'#e2d5bd','#9f8c89'));
    for (const side of [-1,1]) {
      const x=20+side*10,y=happy?19:29;
      line(20+side*6,27,x,y,'#84708f',4);
      ell(x,y,2,1.8,grad(y-2,y+2,'#e8c9b6','#b99394'));
    }
    paintMamaHead(P,20,15,!!happy); return P.art;
  });
}
function mamaSmokeCloudArt() {
  return bayouArt('mamaComedySmoke',()=>{
    const P=bandPainter(72,48,0,0),{path,ell,grad}=P;
    const cloud=grad(4,43,'#f6eee2','#b3afb7');
    path('M 9 33 C 0 31 1 20 11 19 C 7 8 20 2 28 10 C 30 -1 48 1 49 12 C 62 4 72 14 65 24 C 78 31 67 45 57 39 C 50 49 37 46 33 40 C 22 49 11 43 12 37 Q 7 39 9 33 Z',cloud,'#9996a5',.6);
    path('M 9 26 Q 8 19 17 21 Q 23 22 20 29',null,'#e7dfd6',1.1);
    path('M 28 17 Q 31 9 40 14 Q 48 18 42 24 Q 38 28 34 23',null,'#faf2e6',1.2);
    path('M 49 32 Q 57 37 61 30',null,'#d4ced0',.8);
    ell(27,34,9,2.5,'#e4dbd6',null);
    return P.art;
  });
}
function drawMamaSmoke(ctx,x,y,t,ceiling=null) {
  // Nine bounded, cached cauliflower clouds: several times her head size, with a comic curl.
  const cloud=mamaSmokeCloudArt();
  ctx.save(); ctx.lineCap='round'; ctx.strokeStyle='#d8d0cc'; ctx.lineWidth=.75;
  ctx.globalAlpha*=.45; ctx.beginPath();ctx.moveTo(x,y);
  ctx.bezierCurveTo(x-3,y-6,x+9+Math.sin(t*.035)*2,y-9,x+5,y-16);ctx.stroke();ctx.restore();
  for (let i=8;i>=0;i--) {
    const u=((t+i*24)%216)/216, fade=Math.min(1,u/.12,(1-u)/.25);
    const w=6+u*76, h=w*2/3, xx=x+u*37+Math.sin(u*7+i*.35)*u*7;
    const yy=Math.max(ceiling==null?-Infinity:ceiling+h/2,y-u*69);
    ctx.save();ctx.globalAlpha*=Math.max(0,fade)*.48;
    ctx.drawImage(cloud,xx-w/2,yy-h/2,w,h);ctx.restore();
  }
  fGlow(ctx,x,y,2,'#ff9c5c',.2);
}
// Party guests share the musicians' smooth 6x contours, shaded volumes and expressive faces.
// The larger transparent frame leaves room for raised claws, hats and a properly held firefly jar.
const FAN_W=36, FAN_H=38, FAN_OX=18, FAN_OY=36, FAN_JAR_X=11, FAN_JAR_Y=-24;
function fanArt(kind, arms, puff, hat) {
  return bayouArt('fanClean:'+kind+':'+arms+':'+puff+':'+hat,()=>{
    const P=bandPainter(FAN_W,FAN_H,FAN_OX,FAN_OY),{g,path,ell,line,grad,ink}=P;
    if (kind===0) {
      const skin=grad(-21,0,'#b5ca75','#607944'), belly=grad(-10,-1,'#f7e6b1','#c9be7c');
      for (const side of [-1,1]) {
        ell(side*5,-1.6,3.6,1.6,skin);
        for (const dx of [-1,1]) line(side*5+dx,-1.1,side*5+dx*1.5,-.4,'#7d9350',.35);
        const hx=side*(arms?9.3:8), hy=arms?-16:-6;
        path(`M ${side*5.5} -10 Q ${side*10} -10 ${hx} ${hy}`,null,ink,2.9);
        path(`M ${side*5.5} -10 Q ${side*10} -10 ${hx} ${hy}`,null,skin,1.8);
        ell(hx,hy,1.8,2,skin);
        if(arms)for(const n of [-1,0,1])line(hx+n*.9,hy-.5,hx+n*1.2,hy-2.8,'#acc977',.7);
      }
      path('M -6 -13 Q -10 -8 -6 -3 Q 0 1 6 -3 Q 10 -9 6 -13 Z',skin);
      ell(0,-6.4,4.8+puff*.6,4.1+puff*.45,belly,null);
      // Broad toad cheeks and little warts distinguish this fellow from the band's tuba frog.
      path('M -6 -18 Q 0 -21 6 -18 Q 10 -14 7 -10 Q 0 -7 -7 -10 Q -10 -14 -6 -18 Z',skin);
      for(const x of [-4.4,4.4]) {
        ell(x,-17.1,3,3.4,skin);ell(x,-17,2,2.5,'#fff4cf',null);
        ell(x+.35,-16.8,.8,1.4,ink,null);ell(x+.1,-17.4,.3,.4,'#fff',null);
      }
      for(const [x,y]of[[-7,-12.7],[6.8,-13.8],[-3,-10.4]])ell(x,y,.65,.5,'#738b47',null);
      path('M -4.6 -12 Q 0 -9.3 4.8 -12 Q 1 -7.7 -2.3 -9.4 Z','#573c3b',null);
      path('M -1.6 -9.5 Q 0 -10.6 1.7 -9.3',null,'#dc9b88',.65);
      path('M -4 -20.4 L 0 -29 L 4 -20.4 Q 0 -18.9 -4 -20.4 Z',hat);
      g.save();g.clip();for(const y of [-26,-22.8])line(-4,y,4,y+2.1,'#fff3d8',1.1);g.restore();
      ell(0,-29.2,1.2,1.2,'#ffe1a0');
      path('M -3.3 -7.4 L 0 -6.1 L -3.2 -4.6 Z',hat);path('M 3.3 -7.4 L 0 -6.1 L 3.2 -4.6 Z',hat);ell(0,-6.1,.75,.8,'#ffe1a0');
    } else if (kind===1) {
      const shell=grad(-21,0,'#f99d78','#b94c49');
      // Fine feelers, six jointed legs, and a scalloped tail fan behind the shell.
      for(const side of [-1,1]) {
        path(`M ${side*2} -18 Q ${side*3} -25 ${side*8} -27`,null,'#c87868',.55);
        for(let i=0;i<3;i++)path(`M ${side*(3+i)} ${-8+i*2} L ${side*(7+i)} ${-6+i*2} L ${side*(8+i)} ${-3+i*1.3}`,null,'#c16e59',.75);
      }
      path('M -3 -4 Q -7 -1 -5 0 L 0 -1 L 5 0 Q 7 -1 3 -4 Z',shell);
      ell(0,-8,5.7,7,shell);
      for(const y of [-8,-5.5,-3.3])path(`M -4 ${y} Q 0 ${y+1.7} 4 ${y}`,null,'#9d4747',.5);
      ell(0,-15,4.8,5.8,grad(-21,-10,'#ffbb83','#da6d55'));
      for(const side of [-1,1]) {
        line(side*2.3,-17,side*2.8,-21,'#a94e49',1.2);
        ell(side*2.8,-21,1.85,2.3,'#fff1cf');ell(side*2.8+.2,-20.8,.7,1.1,ink,null);
        ell(side*2.8,-21.5,.25,.35,'#fff',null);
        const x=side*9,y=arms?(side<0?-19:-17):(side<0?-13:-11);
        path(`M ${side*4} -13 Q ${side*8} -10 ${x} ${y+3}`,null,ink,2.7);
        path(`M ${side*4} -13 Q ${side*8} -10 ${x} ${y+3}`,null,shell,1.7);
        g.save();g.translate(x,y);g.scale(side,1);
        path('M -2.5 3 C -5.5 1 -4.7 -4 -1.5 -6 L -.8 -1 L 1.3 -5.7 C 5.6 -3.7 5 1.5 2.1 3.5 Q 0 5 -2.5 3 Z',grad(-6,5,'#ffc393','#d36556'));
        path('M -3 -2 Q -4 0 -1.9 1',null,'#ffe2b0',.6);g.restore();
      }
      path('M -2 -13.3 Q 0 -11.7 2 -13.3',null,ink,.55);
      path('M -2.8 -10.5 L 0 -9 L -2.6 -7.7 Z',hat);path('M 2.8 -10.5 L 0 -9 L 2.6 -7.7 Z',hat);ell(0,-9,.6,.65,'#ffe2af');
    } else {
      const fur=grad(-26,0,'#c2bbc9','#827a91'), cream=grad(-24,-12,'#fff0dc','#cfc0c2');
      path('M -5 -5 C -12 -4 -16 -10 -14 -12 C -12 -15 -9 -11 -11 -9',null,'#c78f9c',1.5);
      for(const x of [-3.4,3.4])ell(x,-1.6,2.8,1.5,grad(-3,0,'#e2b6af','#b18394'));
      path('M -5 -13 Q -8 -7 -4 -3 Q 0 -1 5 -3 Q 8 -8 5 -13 Z',fur);
      path('M -5 -12 L -1.3 -10 L -1 -3 L -5 -4 Z',hat);
      path('M 5 -12 L 1.3 -10 L 1 -3 L 5 -4 Z',lerpColor(hat,'#554066',.25));
      line(0,-9,0,-3,'#fff0d1',.6);ell(0,-6.3,.5,.6,'#edcf9e',null);
      const lx=arms?-9.3:-7.7,ly=arms?-16.5:-5.3;
      path(`M -5 -11 Q -9 -10 ${lx} ${ly}`,null,ink,2.8);
      path(`M -5 -11 Q -9 -10 ${lx} ${ly}`,null,fur,1.7);ell(lx,ly,1.6,1.8,'#d9b1b4');
      for(const side of [-1,1]){ell(side*5.5,-24,2.9,3.2,'#696174');ell(side*5.5,-24,1.7,2,'#d69fa9',null);}
      path('M -6 -22 Q -5 -26 0 -24 Q 5 -26 6 -21 Q 5 -16 1 -13 L -1 -13 Q -6 -16 -6 -22 Z',cream);
      path('M -5.7 -21 Q -2.4 -23 -.7 -20 L -2.1 -18.5 L -5.5 -18.4 Z','#b4a7ba',null);
      path('M 5.7 -21 Q 2.4 -23 .7 -20 L 2.1 -18.5 L 5.5 -18.4 Z','#b4a7ba',null);
      for(const x of [-2.8,2.8]){ell(x,-20.3,1.05,1.4,ink,null);ell(x-.25,-20.8,.3,.4,'#fff',null);}
      ell(0,-14.9,1.5,1,'#d68b9b');ell(-.35,-15.2,.45,.22,'#f8c6be',null);
      path('M -1.7 -13.5 Q 0 -11.8 1.8 -13.7',null,ink,.45);
      for(const side of [-1,1])line(side*2,-15.5,side*6.5,-16.3,'#e6d6d4',.3);
      const jy=FAN_JAR_Y-(arms?2:0),hx=FAN_JAR_X-2.8,hy=jy+3.5;
      path(`M 4.5 -11 Q 8 -13 ${hx} ${hy}`,null,ink,3.3);
      path(`M 4.5 -11 Q 8 -13 ${hx} ${hy}`,null,fur,2.1);
      g.drawImage(jarArt(),FAN_JAR_X-5,jy-5);
      ell(hx,hy,1.8,2.1,'#dfb8b5');
      for(const dy of [-.6,.5])path(`M ${hx-.9} ${hy+dy} Q ${hx+.5} ${hy+dy+.6} ${hx+1.7} ${hy+dy+.2}`,null,'#aa7c8b',.35);
    }
    return P.art;
  });
}
// Smooth glass, cork and a warm firefly. The possum's gripping fingers are painted over this jar.
let JAR_ART=null;
function jarArt() {
  if(JAR_ART)return JAR_ART;
  const P=bandPainter(10,13,0,0),{path,ell,line,grad}=P;
  path('M 2.2 3.2 L 7.8 3.2 L 8.6 5 L 8.6 11 Q 5 13 1.4 11 L 1.4 5 Z',grad(3,12,'#d6edf0','#7899ae'));
  path('M 2.5 5 L 7.5 5 L 7.5 10.6 Q 5 11.8 2.5 10.6 Z','#b2cdbb',null);
  ell(5,3.1,3.1,1.1,'#e6c39c');ell(5,1.9,2.7,1.2,grad(.5,3,'#d8b27c','#9b7352'));
  line(3.2,5.3,3.2,9.6,'#f3f6eb',.55);ell(6.3,6.3,.55,1.1,'#edf6e9',null);
  ell(5.1,8,1.2,1.5,'#f2e6a2',null);ell(5.7,7.4,.75,.7,'#fff8c6',null);
  line(4.8,7.5,4.1,6.8,'#6c7a61',.3);
  return(JAR_ART=P.art);
}
// MAMA HUSH's shack on stilts (128 x 112; the window's middle at x 64): plank walls, a corrugated tin roof with rust,
// the wooden sign above is a level entity; window, shutters and light are drawn live over it
let SHACK_ART = null;
function shackArt() {
  if (SHACK_ART) return SHACK_ART;
  const A = mArt(128, 112), L = 20, R = 108, top = 4, floor = 72;
  for (const sx of [L + 6, L + 40, R - 10]) A.fill(sx, floor, sx + 4, 112, (x) => softTone(['#3a2a1c', '#5a4430', '#7a6040', '#9a8060', '#b8a080'], 1 - (x - sx) * 0.4));   // stilts
  A.fill(L, top + 10, R, floor + 1, (x, y) => { const k = ((y - top - 10) % 5) / 5, p = Math.floor((y - top - 10) / 5); return k > 0.82 ? '#5a4430' : softTone(['#4a3424', '#6a4e36', '#8a6a4a', '#a88660', '#c8a680'], 0.6 - k * 0.6 + (p % 3 ? 0 : -0.25) + (Math.sin(x * 0.7 + p * 3) * 0.1)); });   // plank walls
  A.fill(L - 7, top + 2, R + 7, top + 9, (x, y) => softTone(['#5a6470', '#7a8490', '#9aa4b0', '#c8d0d8', '#eef2f6'], Math.sin(x * 1.6) * 0.8 + 0.4 - (y - top - 2) * 0.12));   // corrugated tin
  for (let i = L - 4; i < R + 4; i += 23) A.soft(i + 2, top + 4.5, 2.6, 1.4, ['#6a2a10', '#8a3a1a', '#b86a3a', '#d8905a', '#f0b080']);   // rust patches
  A.outline();
  return (SHACK_ART = A.canvas());
}
