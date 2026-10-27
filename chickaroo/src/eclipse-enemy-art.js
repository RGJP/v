'use strict';
// Eclipse Spire creatures, painted from shapes at ART_R with their own moonlit materials.
const ECLIPSE_ENEMY_ART = new Map();
function eclipseCreatureArt(kind,pose=0) {
  const key=kind+':'+pose;if(ECLIPSE_ENEMY_ART.has(key))return ECLIPSE_ENEMY_ART.get(key);
  const sizes={wick:[26,38],ink:[28,24],thorn:[34,34],moth:[40,44],garg:[28,26],drop:[24,28],corbel:[28,18]};
  const [w,h]=sizes[kind],A=mArt(w,h),cx=w/2;
  const ink=['#151c36','#283359','#465b83','#73a5b5','#b8e6e4'];
  if(kind==='wick'){
    const W=['#a77664','#caa68b','#ead0ae','#f9ead0','#fff9e8'];
    A.soft(8,35.5,2,0.8,W);A.soft(18,35.5-(pose%2)*0.4,2,0.8,W);
    A.soft(13,33.5,10.5,1.65,CLOCK_BRASS);
    if(pose<6){
      A.fill(7,20,19,32.5,(x,y)=>softTone(W,-(x-11)*0.12-(y-24)*0.015));A.soft(13,20.5,6,1.7,W);
      A.soft(9,23,1.5,3.6,W);A.soft(17.5,26,1.1,4.5,W);A.line(13,20,13,17,'#584a43',null,0.55);
      A.poly([[13,18],[9,15],[9.8,11],[12.5,7.8],[13.5+Math.sin(pose)*1.2,4.3],[17,11.7],[17.2,15],[15,18]],'#dc683b');
      A.poly([[13,18],[10.7,14],[13.8,9],[15.4,14.7],[14.4,18]],'#f8b75a');A.soft(13,16.2,1.25,2.2,['#eebd6e','#f2d48b','#fff0b8','#fff5d3','#fffbe7']);
      A.line(11,25,9.4,24,'#72524b',null,0.65);A.line(15,25,16.6,24,'#72524b',null,0.65);
      for(const x of [10.3,15.7]){A.ell(x,25.9,0.85,0.65,'#a95b3c');A.ell(x,25.7,0.4,0.35,'#f2bb67');}
      A.line(11.5,29.4,14.7,29.4,'#8b6c61',null,0.4);
    }else{A.soft(13,31.5,7,1.2,W);A.line(13,31,13,28.5,'#55464a',null,0.55);}
  }else if(kind==='ink'){
    for(let i=0;i<5;i++){
      const x=5.7+i*4.2,wig=Math.sin(pose*Math.PI/2+i)*0.7;
      A.soft(x,20.5,1.9,2.2,ink,null,wig*0.25);A.soft(x+wig,22,1.5,0.7,['#803b69','#a45a84','#d386aa','#edb2c7','#f4d4dd']);
    }
    A.soft(14,12.2,8.6,8.6,ink);A.soft(11.1,7,3.5,1.7,['#4f6f89','#709eac','#a5d6d7','#d0eee3','#f1f8e8']);
    for(const x of [10,18]){A.ell(x,13.2,2,2.4,'#e0c976');A.ell(x+(pose%2?0.5:-0.5),13.5,0.8,1.65,'#182337');A.ell(x-0.3,12.4,0.35,0.4,'#fff9dd');}
    A.ell(14,17.5,0.6,0.45,'#d48fa8');
  }else if(kind==='thorn'){
    const C=['#1a3434','#2c5147','#4b7b5d','#81ac7e','#c9d8a4'],a=pose*Math.PI/12;
    for(let i=0;i<14;i++){
      const ang=a+i*Math.PI/7,ux=Math.cos(ang),uy=Math.sin(ang),r=i%2?13:11.8;
      const root=[17+ux*7.9,17+uy*7.9],tip=[17+ux*r,17+uy*r],nx=-uy,ny=ux;
      A.poly([[root[0]+nx,root[1]+ny],[root[0]-nx,root[1]-ny],tip],'#b4b698');
      A.poly([root,[root[0]+nx,root[1]+ny],tip],i%2?'#e1c2c0':'#f2e7c8');
      if(i%2)A.line(17+ux*(r-1),17+uy*(r-1),...tip,'#c96681',null,0.34);
    }
    A.soft(17,17,9.2,9.2,C);
    for(let i=0;i<7;i++){
      const ang=-a*0.5+i*0.9,r=3+i%3*2, x=17+Math.cos(ang)*r,y=17+Math.sin(ang)*r;
      A.line(x-1,y-2,x+1,y+1,C[i%2?1:3],null,0.55);A.line(x+1,y+1,x-0.5,y+2,C[3],null,0.34);
    }
    for(const [x,y] of [[12,19],[18,11],[22,20]]){A.soft(x,y,0.9,0.9,['#692947','#9d435b','#c86c7b','#efa4ad','#f8d7cb']);}
    for(const x of [17,23]){A.ell(x,16,1.6,1.4,'#dcc785');A.ell(x+0.4,16,0.55,1,'#283c31');A.line(x-1.5,14.3,x+1.5,14.9,C[0],null,0.65);}
  }else if(kind==='moth'){
    const flap=0.65+pose/6*0.35;
    for(const side of [-1,1]){
      const at=(x,y)=>[20+side*x*flap,y],F=['#4c8d80','#80b9a1','#b2d8b8','#d7e9c8','#f0f4d6'];
      A.poly([[1,19],[4,11],[13,5],[17,6],[15.5,14],[9,22]].map(p=>at(...p)),'#b0d6b8');
      A.poly([[1,20],[8,21],[12,26],[8.5,30],[8,39],[6.2,37],[6.7,29],[2,26]].map(p=>at(...p)),'#88b89d');
      A.poly([[2,18],[5,12],[13,6],[15.2,6.8],[11.7,14],[6,20]].map(p=>at(...p)),'#d8eaca');
      A.line(...at(4,12),...at(14,6),'#c987a3',null,0.55);
      for(const p of [[12.5,10],[13.5,14],[9,19],[9,26],[7.2,34]])A.line(...at(1,20),...at(...p),'#80b5a2',null,0.34);
      A.ell(...at(7.3,14.8),1.8*flap,2,'#ac9d6e');A.ell(...at(7.3,14.8),1.2*flap,1.35,'#e7dc9f');A.ell(...at(7.3,14.8),0.5*flap,0.8,'#6a5c72');
      A.ell(...at(6,25),1*flap,0.75,'#ddd8a3');
      A.line(20,18,...at(3,13),'#cdbf8a',null,0.55);A.line(...at(3,13),...at(5,12.5),'#f0dfad',null,0.34);
    }
    A.soft(20,21,1.6,5.2,['#acbca7','#cad3bd','#e5e7d0','#f6f1dc','#fff8e8']);A.soft(20,17,1.6,1.7,['#9d9b86','#c4b99d','#e5d5af','#f2e4c4','#fff2df']);
  }else if(kind==='garg'){
    const C=['#625e68','#8d8790','#b7b1af','#d8d2c6','#eee9d6'];
    for(const side of [-1,1]){
      A.poly([[14+side*7,19],[14+side*12,6],[14+side*9,2],[14+side*4,11]],C[0]);
      A.poly([[14+side*7,17],[14+side*10.4,6],[14+side*8.8,3],[14+side*5.5,11]],C[2]);
      for(let i=0;i<3;i++)A.line(14+side*6.5,15,14+side*(10-i),6+i*2,C[1],null,0.45);
      A.soft(14+side*5.8,21,2.5,2.1,C);
      A.poly([[14+side*3,9],[14+side*5.2,1],[14+side*6,9]],C[3]);
    }
    A.soft(14,17.7,6.8,5,C);A.soft(14,11.8,6,5.6,C);
    const eye=['#81756c','#ad645b','#d47d6b','#f6b393'][pose];
    for(const side of [-1,1]){
      A.ell(14+side*2.8,11.9,1.7,0.8,eye);A.line(14+side,10.3,14+side*4.7,9.3,C[0],null,0.75);
      A.ell(14+side*5.6,22,0.5,0.6,C[4]);A.line(14+side*4,16.7,14+side*4.4,20.3,C[0],null,0.5);
    }
    A.ell(14,15.7,3.1,1.8,pose?'#843f44':'#534951');
    for(const x of [12,16])A.poly([[x-0.5,14.5],[x+0.5,14.5],[x,16.2]],'#f0e3ca');A.line(13.8,11.7,13.8,14.6,C[4],null,0.45);
    A.line(9,17.3,10.2,18.5,C[4],null,0.34);
  }else if(kind==='drop'){
    A.soft(12,18,7,7.3,ink);A.poly([[7,14],[12,2],[17,14]],ink[2]);A.poly([[8,14],[12,2],[12.3,16]],ink[3]);
    A.soft(9.2,15.2,1.5,3,['#567c92','#74aab9','#a4d4d4','#d6ede0','#f0f6e6']);
    if(pose!==2)for(const x of [9.3,14.7]){A.ell(x,18.5,1.2,pose?1.8:1.3,'#e0cd7b');A.ell(x+0.25,19,0.5,0.95,'#1b263b');}
    if(pose===1)A.ell(12,22,0.7,0.8,'#d890b0');
  }else if(kind==='corbel'){
    const C=['#635d69','#8b8490','#b6afa8','#d3cdbd','#eae2cc'];
    A.poly([[2,1],[26,1],[26,6],[22,7],[20,12],[17,16],[11,16],[8,12],[6,7],[2,6]],C[0]);
    A.poly([[3,2],[25,2],[25,5],[3,5]],C[3]);A.poly([[6,6],[22,6],[19,12],[16,15],[12,15],[9,12]],C[2]);
    A.line(7,6,12,14,C[4],null,0.45);A.line(23,3,23,5,C[1],null,0.34);
  }
  const img=A.outline(kind==='moth'?'#3d5258':INK,kind==='moth'?1:2).canvas();ECLIPSE_ENEMY_ART.set(key,img);return img;
}
