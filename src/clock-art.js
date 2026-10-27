'use strict';
// Clockworks miniatures: fine-painted enamel, carved wood, brushed tin and brass.
const CLOCK_ART = new Map();
const CLOCK_BRASS = ['#61431f','#967032','#c7a15a','#e8cd8d','#fff1c2'];
const CLOCK_TIN = ['#3d415b','#6b748d','#9ba9ba','#cbd5df','#f1f2e8'];
function clockArt(key,w,h,paint) {
  if(CLOCK_ART.has(key))return CLOCK_ART.get(key);
  const A=mArt(w,h);paint(A);const img=A.canvas();CLOCK_ART.set(key,img);return img;
}
function paintFineDial(A,x,y,r,hands=true) {
  A.soft(x,y,r,r,CLOCK_BRASS);A.ell(x,y,r-0.9,r-0.9,'#4a464c');
  A.soft(x,y,r-1.5,r-1.5,['#b5b4a4','#d2cfb9','#e7e0c8','#f5eed7','#fff9e4']);
  for(let i=0;i<12;i++) {const a=i*Math.PI/6,rr=r-2.1,lo=rr-(i%3?0.5:1);A.line(x+Math.sin(a)*lo,y-Math.cos(a)*lo,x+Math.sin(a)*rr,y-Math.cos(a)*rr,'#60545a',null,0.34);}
  if(hands){A.line(x,y,x-r*0.38,y-r*0.35,'#393343',null,0.55);A.line(x,y,x+r*0.21,y-r*0.62,'#393343',null,0.4);A.ell(x,y,0.55,0.55,CLOCK_BRASS[3]);}
}
function fineClockBlock(kind,on) {
  return clockArt('block:'+kind+on,16,16,A=>{
    const red=kind==='tick',C=red?['#61273f','#a84a62','#d97b8d','#f3b3b8','#ffe0d1']:['#22495c','#397a96','#75b5c8','#b8e2e2','#e8faf0'];
    if(on){
      A.poly([[1.2,0.5],[14.5,0.5],[15.5,1.6],[15.5,14.5],[14.2,15.5],[1.2,15.5],[0.5,14.1],[0.5,1.6]],C[0]);
      A.poly([[1.3,1.1],[14.1,1.1],[12.5,3],[3,3],[3,12.5],[1.3,14.3]],C[3]);
      A.poly([[14.1,1.1],[14.8,2],[14.8,14.2],[1.3,14.8],[3,12.5],[12.5,12.5],[12.5,3]],C[1]);
      A.poly([[3,3],[12.5,3],[12.5,12.5],[3,12.5]],C[2]);
      paintFineDial(A,8,8,4.7,false);
      A.line(8,8,red?8:5.7,red?5.6:8,'#433a4b',null,0.55);A.line(8,8,red?10.2:8,red?8:10.4,'#433a4b',null,0.45);A.ell(8,8,0.5,0.5,C[1]);
      for(const [x,y] of [[2,2],[14,2],[2,14],[14,14]])A.ell(x,y,0.4,0.4,C[4]);
    }else{
      A.poly([[1.4,1.4],[14.6,1.4],[14.6,14.6],[1.4,14.6]],red?'rgba(217,123,141,0.06)':'rgba(117,181,200,0.06)');
      for(const [x,y,sx,sy] of [[1,1,1,1],[15,1,-1,1],[1,15,1,-1],[15,15,-1,-1]]){
        A.line(x,y,x+sx*3,y,C[2],null,0.55);A.line(x,y,x,y+sy*3,C[2],null,0.55);
      }
      A.ell(8,8,2.5,2.5,red?'rgba(217,123,141,0.12)':'rgba(117,181,200,0.12)');
      A.line(8,8,8,6.3,C[2],null,0.34);A.line(8,8,9.5,8,C[2],null,0.34);
    }
  });
}
function cuckooHouseArt() {
  return clockArt('cuckoo-house',40,58,A=>{
    const W=['#362a28','#594130','#815a3b','#b28b59','#e1c38c'];
    A.poly([[15,43],[25,43],[25,55],[15,55]],W[1]);A.line(16.4,44,16.4,54,W[3],null,0.55);
    A.poly([[6,20],[34,20],[34,47],[6,47]],W[1]);
    A.fill(7,21,33,46,(x,y)=>softTone(W,-(x-15)*0.025-(y-30)*0.018+Math.sin(x*1.1)*0.08));
    A.poly([[2,21],[20,4],[38,21],[36,23],[20,9],[4,23]],W[0]);
    A.poly([[5,20],[20,6.8],[35,20],[31.5,19.3],[20,10.4],[8.5,20]],W[3]);
    for(let i=0;i<6;i++){const y=9+i*1.9,half=(y-5)*0.95;A.line(20-half,y,20,y-2.2,W[2],null,0.55);A.line(20,y-2.2,20+half,y,W[1],null,0.55);}
    A.line(3,21,20,6,W[4],null,0.34);A.line(20,6,37,21,W[3],null,0.34);
    for(const side of [-1,1]) for(let i=0;i<4;i++) A.soft(20+side*(13.5-i*0.2),27+i*4,1.3,2.2,W,null,side*0.4);
    paintFineDial(A,20,34,9.3);
    A.ell(20,18,4.8,5.4,'#221c25');A.poly([[15.2,18],[24.8,18],[24.8,23],[15.2,23]],'#221c25');
    A.line(20,44,20,50,CLOCK_BRASS[2],null,0.5);A.soft(20,51,3.1,1.7,CLOCK_BRASS);
    A.line(8,45,32,45,W[4],null,0.45);
    A.outline();
  });
}
function cuckooBirdArt(open) {
  return clockArt('cuckoo-bird:'+open,38,30,A=>{
    const C=['#362747','#59416f','#8c729c','#b6a1c2','#e2d1df'];
    for(let i=0;i<3;i++)A.poly([[13,21],[3,17+i*2],[4,19+i*2],[13,24]],C[i]);
    A.soft(17,22,8.5,5.5,C);A.soft(24,16.5,5.1,4.8,C);
    A.soft(21,23,4.5,3,['#aa9d8d','#c4bba4','#e1d7b9','#f3ebd0','#fff5df']);
    A.soft(14.7,21.5,4.8,2.5,C,null,-0.3);
    for(let i=0;i<3;i++)A.line(12.5+i,21.3,16.1+i,23.5,C[3],null,0.34);
    A.poly([[28,16],[35,open?14.8:17],[28,open?17:18.8]],'#edbd6a');
    if(open)A.poly([[28,19],[34,20.6],[28,21]],'#ca8948');
    A.ell(25.7,15.5,1.4,1.6,'#f5f0dc');A.ell(26.1,15.5,0.55,0.9,'#282234');
    if(!open)A.line(24.5,14.8,26.8,14.6,C[1],null,0.5);
    A.poly([[20,12],[27.5,12],[25.5,7],[21,6],[17,9],[14,8.5],[11.5,12]],'#bc586f');
    for(const x of [19,22,25])A.line(x,8,x+1.2,11.7,'#e8d9c5',null,0.55);
    A.soft(11,13,2,1.9,['#c1c0b4','#d6d8c9','#f0efdf','#fff6e6','#ffffff']);
    A.line(20,12.3,28,12.3,'#fff2df',null,1);
    A.outline();
  });
}
function alarmClockArt(state,phase=0) {
  return clockArt('alarm:'+state+phase,32,32,A=>{
    const C=['#6b253e','#a34056','#d56977','#ed9d9c','#ffd5bf'];
    for(const x of [10,22]){A.line(x,25,x-1,29,CLOCK_BRASS[1],null,1.8);A.soft(x-1,29,2.5,0.7,CLOCK_BRASS);}
    for(const side of [-1,1]) {
      const x=16+side*(9+(phase?0.5:0));A.line(16+side*6,12,x,8,CLOCK_BRASS[1],null,1.2);
      A.soft(x,8,4.6,3.2,CLOCK_BRASS,null,side*0.4);A.line(x-3.5,10,x+3.5,10,CLOCK_BRASS[0],null,0.55);
    }
    A.line(16,8,16+(state==='ring'?(phase?2:-2):0),3.2,CLOCK_TIN[1],null,0.7);A.soft(16+(state==='ring'?(phase?2:-2):0),3.2,1.4,0.65,CLOCK_TIN);
    A.soft(16,state==='snooze'?7:5.6,3.1,1.1,C);
    A.soft(16,20,10.4,9,C);paintFineDial(A,16,20,7.9,false);
    for(const x of [13.6,18.4]) {
      if(state==='ring'){A.ell(x,18.3,0.75,1.15,'#32303d');A.ell(x-0.2,18,0.23,0.3,'#fff9dc');}
      else A.line(x-0.85,19,x+0.85,19,'#49414a',null,0.55);
    }
    if(state==='ring')A.ell(16,22,1.2,1.1+phase*0.3,'#675046');else A.line(15.2,22.5,16.8,22.5,'#806f60',null,0.34);
    A.line(9,16,9.8,14.8,'#ffe8d1',null,0.34);A.outline();
  });
}
function windupMouseArt(step) {
  return clockArt('mouse:'+step,28,20,A=>{
    const C=CLOCK_TIN;
    A.line(6,14,2.3,12,'#9d7259',null,0.8);A.line(2.3,12,1.6,9.1,'#c6a37c',null,0.55);A.line(1.6,9.1,3.2,8.4,'#c6a37c',null,0.55);
    for(const x of [9,20]) {A.ell(x,17.4,2.1,1.5,'#333449');A.ell(x+(step?0.3:-0.3),17.2,0.7,0.7,C[3]);}
    A.soft(12.7,12.8,7.4,4.7,C);A.soft(20,12.7,4.5,3.3,C);
    A.poly([[20,11],[26,14],[22,15.6],[18,15]],C[2]);A.soft(19.1,8.2,2.8,3.1,C);A.soft(19.2,8.3,1.7,2,['#865366','#ad7a8b','#d1a2aa','#ead1ca','#f4e4d4']);
    A.line(9,9.6,8.2,14.9,C[1],null,0.34);for(const x of [9.5,13.4,16])A.ell(x,13.6,0.34,0.34,C[0]);
    A.outline();A.ell(21.6,11.7,0.65,0.7,'#26303d');A.ell(21.4,11.4,0.2,0.2,'#fff8dc');A.ell(25.1,14,0.65,0.55,'#ba798e');
    for(const dy of [-0.5,0.5])A.line(23,14.8,26.6,14.8+dy,'#dee0d4',null,0.34);
  });
}
function clockStopwatchArt() {
  return clockArt('stopwatch',26,30,A=>{
    A.ell(13,4.1,3.2,2.7,CLOCK_BRASS[1]);A.ell(13,4.1,2,1.5,'#252332');
    A.soft(13,7.1,2.5,1,CLOCK_TIN);paintFineDial(A,13,18,10.7);
    A.line(13,18,17,12,'#ad4859',null,0.45);A.ell(13,18,0.7,0.7,CLOCK_BRASS[4]);A.outline();
  });
}
function clockTinbirdArt(up) {
  return clockArt('tinbird:'+up,26,20,A=>{
    const C=['#25554e','#438779','#78b7a1','#b6dbc4','#edf3d9'];
    A.poly([[17,12],[23,7],[22,12],[25,13],[17,15]],C[1]);A.soft(12,12,7,3.8,C);A.soft(7,10,3.1,3,C);
    A.poly([[4.5,9.4],[1,11],[4.7,11.6]],CLOCK_BRASS[2]);A.soft(12,14,4,1.6,CLOCK_BRASS);
    A.poly(up?[[10,11],[12,3],[17,2],[16,8]]:[[10,11],[16,15],[17,19],[12,17]],C[2]);
    A.line(11,11,up?15:15,up?4:17,C[4],null,0.34);for(const x of [10,15])A.ell(x,12,0.4,0.4,C[0]);
    A.outline();A.ell(6.2,9.4,0.7,0.85,'#f7f1d4');A.ell(6,9.5,0.3,0.5,'#222d34');
  });
}
function jackBoxArt() {
  return clockArt('jack-box',24,20,A=>{
    A.poly([[3,3],[20,3],[20,19],[3,19]],'#263856');A.poly([[4,4],[19,4],[17,6],[6,6]],'#9bb9cf');
    A.poly([[6,6],[17,6],[17,17],[6,17]],'#3d6e97');A.poly([[17,6],[19,4],[19,18],[4,18],[6,17],[17,17]],'#31506d');
    for(const x of [5,18])for(const y of [5,17])A.ell(x,y,0.5,0.5,CLOCK_BRASS[3]);
    const x=11.4,y=11.7;A.poly([[x,y-3],[x+0.8,y-1],[x+3,y-1],[x+1.3,y+0.7],[x+2,y+3],[x,y+1.7],[x-2,y+3],[x-1.3,y+0.7],[x-3,y-1],[x-0.8,y-1]],'#edce89');
    A.outline();
  });
}
function jackHeadArt() {
  return clockArt('jack-head',24,22,A=>{
    A.soft(12,14,5.4,5.1,['#b18472','#cfae8e','#e7ceb0','#f5e5c9','#fff3dc']);
    A.poly([[6,10],[4,3],[11,6],[13,2],[20,4],[18,10]],'#b65777');A.poly([[12,7],[13,2],[20,4],[18,10]],'#75bdc5');
    for(const x of [4,20])A.ell(x,4,1.1,1.1,CLOCK_BRASS[3]);A.ell(12,13.8,1,0.9,'#cf6173');
    A.outline();for(const x of [9.7,14.3])A.ell(x,12.3,0.55,0.8,'#393246');
    A.ell(12,16.3,2.6,0.9,'#72534c');A.line(10.1,16,13.9,16,'#fff6de',null,0.55);
  });
}
function clockTrainArt() {
  return clockArt('train',88,44,A=>{
    const R=['#6c2e42','#a34c5d','#cc7b83','#eaa6a3','#ffd3bc'],B=['#283650','#405c7c','#668fa8','#99c0cb','#d0e1db'];
    A.poly([[12,10],[38,10],[38,34],[12,34]],R[0]);A.fill(13,11,37,33,(x,y)=>softTone(R,-(x-20)*0.035-(y-17)*0.03));
    A.poly([[11,8],[39,8],[39,11],[11,11]],'#364250');A.line(12,8.5,38,8.5,CLOCK_TIN[3],null,0.34);
    A.poly([[17,15],[31,15],[31,23],[17,23]],'#2b3341');A.poly([[18,16],[30,16],[30,22],[18,22]],'#e0d8b1');A.line(24,16,24,22,CLOCK_BRASS[1],null,0.7);
    A.soft(55,26,18.5,7.8,B);for(const x of [46,60]){A.line(x,19,x,33,CLOCK_BRASS[1],null,1.6);A.line(x-0.35,19,x-0.35,32,CLOCK_BRASS[3],null,0.45);}
    A.soft(72.5,26,2.4,7,CLOCK_BRASS);A.poly([[62,19],[62,7],[69,7],[69,19]],B[0]);A.soft(65.5,6.9,5,1.5,CLOCK_TIN);
    A.poly([[12,33],[76,33],[76,36],[12,36]],B[0]);A.line(13,33.4,75,33.4,B[3],null,0.45);
    A.poly([[75,30],[81,35],[74,35]],CLOCK_BRASS[2]);paintFineDial(A,24,29,3.6,false);
    for(const [x,y] of [[14.5,13],[35,13],[14.5,31],[35,31],[51,23],[65,23]])A.ell(x,y,0.4,0.4,CLOCK_BRASS[3]);
    A.outline();
  });
}

function grandfatherClockArt() {
  return clockArt('grandfather-case',64,250,A=>{
    const W=['#211d36','#352b4c','#504162','#786181','#a68a9d'],B=['#59442e','#82673f','#b89a5e','#d8c186','#f1e0b4'];
    // Tall walnut case, with curved crown moulding and turned brass-capped pilasters.
    A.poly([[13,86],[51,86],[51,243],[13,243]],W[0]);
    A.fill(15,87,49,241,(x,y)=>softTone(W,-(x-25)*0.035+Math.sin(x*0.7+y*0.018)*0.1));
    A.poly([[8,31],[10,26],[54,26],[56,31],[56,89],[8,89]],W[0]);
    A.fill(10,29,54,87,(x,y)=>softTone(W,-(x-24)*0.026-(y-44)*0.005+Math.sin(x*0.9+y*0.04)*0.08));
    for(const side of [-1,1]){
      const x=32+side*21.5;
      A.soft(x,58,1.65,26,W);A.soft(x,33,2.5,1.2,B);A.soft(x,84,2.5,1.2,B);
      A.line(x-0.35,37,x-0.35,81,W[3],null,0.4);
    }
    for(let i=0;i<3;i++){
      const y=27-i*2.3;
      A.poly([[5+i*2,y],[15+i,y-4],[24,y-4],[32,y-9],[40,y-4],[49-i,y-4],[59-i*2,y],[58-i*2,y+1.7],[6+i*2,y+1.7]],W[i?2:0]);
      A.line(13+i,y-2.5,23,y-2.5,W[3],null,0.34);A.line(41,y-2.5,51-i,y-2.5,W[2],null,0.34);
    }
    A.soft(32,15.5,2.1,2.6,B);A.line(32,11.5,32,13.4,B[3],null,0.7);
    A.poly([[5,88],[59,88],[57,94],[7,94]],W[0]);A.line(7,89,57,89,W[3],null,0.65);
    A.poly([[19,105],[22,101],[42,101],[45,105],[45,199],[42,203],[22,203],[19,199]],B[0]);
    A.poly([[20.5,105.5],[23,102.5],[41,102.5],[43.5,105.5],[43.5,198],[41,201.5],[23,201.5],[20.5,198]],'#171a30');
    A.line(21.5,109,21.5,194,'#42465e',null,0.4);A.line(24,108,24,142,'#4b4962',null,0.34);
    for(const [x,y] of [[26,129],[38.5,143]]){
      A.line(x,105,x,y,B[1],null,0.34);
      for(let yy=106;yy<y;yy+=2)A.ell(x,yy,0.35,0.6,B[2]);
      A.soft(x,y+8,2,8,B);A.line(x-0.7,y+2,x-0.7,y+12,B[4],null,0.34);
    }
    A.poly([[17,211],[47,211],[47,237],[17,237]],W[0]);A.poly([[18.5,212.5],[45.5,212.5],[45.5,235.5],[18.5,235.5]],W[1]);
    for(const x of [18.5,45.5])A.line(x,214,x,233,W[3],null,0.34);
    A.soft(46.5,151,0.9,1.2,B);A.poly([[11,240],[53,240],[55,247],[9,247]],W[0]);A.line(11,242,53,242,W[3],null,0.7);
    // The dial stays centred at (32,60), matching the animated hands and the mainspring scene.
    A.soft(32,60,19.7,19.7,B);A.ell(32,60,18,18,'#3a3446');
    A.soft(32,60,17.2,17.2,['#a89d81','#c8b99a','#ddd0ad','#eaddbd','#f5ebce']);
    for(let i=0;i<60;i++){
      const a=i*Math.PI/30,r=i%5?15.2:13.3;
      A.line(32+Math.sin(a)*r,60-Math.cos(a)*r,32+Math.sin(a)*16,60-Math.cos(a)*16,'#554555',null,i%5?0.34:0.65);
    }
    A.fill(20,48,44,72,(x,y)=>{const d=Math.hypot(x-32,y-60);return d>11.1&&d<11.45?'#d1c09c':null;});
    for(const [x,y] of [[32,48],[44,60],[32,72],[20,60]])A.ell(x,y,0.7,0.7,'#917756');
    A.line(18.2,49.7,22,45.9,'#e9d49e',null,0.34);
  });
}
