import * as T from '../vendor/engine.js';
import {CAST} from './canon.js';
import {GEO,mesh,material,random,glow} from './realm.js';
function cluster(parent,g,m,parts){const a=new T.InstancedMesh(g,m,parts.length),d=new T.Object3D();parts.forEach((o,i)=>{d.position.set(...o.p);d.scale.set(...o.s);d.rotation.set(...(o.r||[0,0,0]));d.updateMatrix();a.setMatrixAt(i,d.matrix)});a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
function line(parent,points,color,opacity=1){const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const l=new T.Line(g,new T.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(l);return l;}
function wingShape(scale=1){const s=new T.Shape();s.moveTo(.08,0);s.bezierCurveTo(.36,.26,1.45,1.07,1.2,.25);s.bezierCurveTo(1.06,-.12,.68,-.47,.24,-.26);s.quadraticCurveTo(.03,-.15,.08,0);const g=new T.ShapeGeometry(s,14);g.scale(scale,scale,scale);return g;}
export function makeAvatar(index){
 const c=CAST[index],root=new T.Group(),body=new T.Group();root.add(body);const scale=c.height/1.95;body.scale.setScalar(scale);
 const skin=material(c.skin,{roughness:.73}),cloth=material(c.cloth,{roughness:.78}),hair=material(c.hair,{roughness:.9}),dark=material(0x182b34),gold=material(0xc5a66e,{metalness:.65,roughness:.3}),magic=material(c.color,{emissive:c.color,emissiveIntensity:1.5,roughness:.18}),r=random(137+index*503);
 const isGirl=[1,2,3].includes(index),isBaby=index===6;
 if(isBaby){body.scale.setScalar(.62);body.position.y=.38;}
 const profile=[new T.Vector2(.22,0),new T.Vector2(.26,.1),new T.Vector2(.2,.27),new T.Vector2(isGirl?.26:.31,.49),new T.Vector2(isGirl?.25:.29,.59),new T.Vector2(.16,.63)];
 mesh(body,new T.LatheGeometry(profile,20),index===0?skin:cloth,[0,.88,0],[1,1,.68]);
 mesh(body,GEO.ball,cloth,[0,.83,0],[.235,.17,.18]);mesh(body,GEO.cyl,skin,[0,1.57,0],[.078,.13,.07]);
 const head=new T.Group();head.position.y=isBaby?1.52:1.78;body.add(head);head.scale.setScalar(isBaby?1.28:1);
 mesh(head,GEO.ball,skin,[0,0,0],[.153,.205,.154]);mesh(head,GEO.ball,skin,[0,-.105,.075],[.112,.09,.093]);
 // Small facial details. Faces are original 3D interpretations rather than projected photographs.
 const eyeWhite=material(0xd7d6c9,{roughness:.43}),iris=material(index===0?0x534234:0x436572,{roughness:.24});
 for(const sign of[-1,1]){mesh(head,GEO.orb,skin,[sign*.158,-.008,0],[.035,.057,.027]);mesh(head,GEO.orb,eyeWhite,[sign*.062,.033,.139],[.035,.017,.013]);mesh(head,GEO.orb,iris,[sign*.063,.033,.15],[.012,.013,.006]);mesh(head,GEO.orb,dark,[sign*.063,.033,.155],[.005,.008,.003]);mesh(head,GEO.orb,hair,[sign*.063,.067,.14],[.042,.008,.009],[0,0,sign*-.07]);}
 mesh(head,GEO.orb,skin,[0,-.018,.154],[.027,.048,.035]);mesh(head,GEO.orb,material(0x9e6559,{roughness:.8}),[0,-.09,.15],[.048,.009,.009]);
 if(index===0){mesh(head,new T.SphereGeometry(1,16,10,0,Math.PI*2,1.1,1.6),hair,[0,-.045,.034],[.145,.172,.135]);mesh(head,GEO.orb,hair,[0,-.066,.16],[.057,.013,.01]);}
 const locks=[];for(let i=0;i<(index===1?76:index===3?38:28);i++){
  const a=i*2.4,rad=index===1?.17:.13;let x=Math.sin(a)*rad,y=.12+Math.cos(i)*.045,z=Math.cos(a)*rad;
  let len=.065+r()*.035;
  if(index===1||index===3){const back=i%3!==0;if(back){x=Math.sin(a)*(.18+r()*.06);z=-.055-Math.abs(Math.cos(a))*.12;y=.14-(i/(index===1?76:38))*.66;len=index===1?.063:.14;}}
  if(index===2){y=.12-(i%6)*.032;z=-.04+Math.cos(a)*.14;len=.085;}
  locks.push({p:[x,y,z],s:[.061,len,.051],r:[r()*.6,r()*6,r()-.5]});
 }
 cluster(head,GEO.orb,hair,locks);
 if(index===2||index===5){cluster(head,GEO.orb,hair,Array.from({length:8},(_,i)=>({p:[(i-3.5)*.033,.12,.14],s:[.03,.067,.039],r:[.2,0,-.15+i*.045]})));}
 // Articulated limbs. Pivot animation is independent for each arm and leg.
 const limbs=[];for(const side of[-1,1]){
  const leg=new T.Group();leg.position.set(side*.128,.83,0);body.add(leg);mesh(leg,GEO.cyl,cloth,[0,-.22,0],[.086,.42,.082]);const knee=new T.Group();knee.position.y=-.43;leg.add(knee);mesh(knee,GEO.cyl,index===2?skin:cloth,[0,-.16,0],[.069,.35,.065]);mesh(knee,GEO.ball,dark,[0,-.36,.047],[.086,.078,.14]);limbs.push({pivot:leg,knee,side,type:'leg'});
  const arm=new T.Group();arm.position.set(side*.27,1.42,0);body.add(arm);mesh(arm,GEO.ball,index===0?skin:cloth,[side*.025,-.04,0],[.108,.13,.099]);mesh(arm,GEO.cyl,index===0?skin:cloth,[side*.035,-.21,0],[.07,.35,.07],[0,0,side*.08]);const elbow=new T.Group();elbow.position.set(side*.055,-.39,0);arm.add(elbow);mesh(elbow,GEO.cyl,index===0?skin:cloth,[0,-.15,0],[.056,.3,.056]);mesh(elbow,GEO.ball,skin,[0,-.32,0],[.057,.078,.029]);for(let f=0;f<4;f++)mesh(elbow,GEO.cyl,skin,[(f-1.5)*.024,-.4,.002],[.01,.085,.01]);mesh(elbow,GEO.ball,skin,[-side*.062,-.325,.003],[.025,.043,.018],[0,0,-side*.3]);mesh(elbow,GEO.cyl,gold,[0,-.24,0],[.064,.044,.064]);limbs.push({pivot:arm,knee:elbow,side,type:'arm'});
 }
 mesh(body,GEO.cyl,gold,[0,.98,0],[.226,.045,.166]);mesh(body,GEO.crystal,magic,[0,1.39,.195],[.04,.065,.018]);
 let cape=null; if(index!==0&&index!==6&&index!==2){const g=new T.PlaneGeometry(.63,.97,5,7);g.translate(0,-.46,0);cape=mesh(body,g,new T.MeshStandardMaterial({color:c.cloth,side:T.DoubleSide,roughness:.8}),[0,1.48,-.19]);cape.userData.original=g.attributes.position.array.slice();}
 const details=[];if([1,6].includes(index)){for(let i=0;i<24;i++){const a=i*2.4;details.push({p:[Math.sin(a)*.24,.91+r()*.58,Math.cos(a)*.19],s:[.06,.12,.018],r:[.25,a,r()*1.3]})}cluster(body,GEO.orb,material(0x568d43),details)}
 // Elemental tracery follows the original colour identities.
 const tracery=[];const col=index===4?0x71caff:c.color;
 for(let i=0;i<7;i++){const side=i%2?1:-1;tracery.push([side*(.08+.025*i),1.08+i*.055,.173],[side*(.14+.015*i),1.1+i*.055,.175],[side*(.08+.025*i),1.16+i*.055,.18]);}
 for(let i=0;i<tracery.length-2;i+=3)line(body,tracery.slice(i,i+3),col,.95);
 if(index===4||index===3)line(body,[[-.18,.99,.18],[-.09,1.14,.19],[-.15,1.25,.2],[.04,1.38,.2]],0xff8844);
 let wings=null;if(index===2){wings=new T.Group();wings.position.set(0,1.4,-.15);body.add(wings);const m=new T.MeshPhysicalMaterial({color:0xb2ebfc,metalness:.16,roughness:.17,transparent:true,opacity:.48,side:T.DoubleSide,depthWrite:false});for(const sign of[-1,1]){const w=mesh(wings,wingShape(.8),m,[0,0,0],[sign,1,1],[0,sign*.23,sign*.15]);w.castShadow=false;line(wings,[[0,0,0],[sign*.8,.42,0],[sign*.54,-.17,0],[0,0,0]],0xcdeaff,.8)}}
 const aura=new T.Group();aura.visible=false;root.add(aura);const ring=mesh(aura,GEO.ring,new T.MeshBasicMaterial({color:c.color,transparent:true,opacity:.65,depthWrite:false}),[0,1,0],[1.05,1.05,1],[Math.PI/2,0,0]);ring.castShadow=false;
 let leaf=null;if(isBaby){leaf=new T.Group();leaf.position.y=.32;root.add(leaf);mesh(leaf,GEO.ball,material(0x74964e),[0,0,0],[.6,.06,.9],[0,0,.03]);line(leaf,[[0,.07,-.75],[0,.09,0],[0,.07,.83]],0xc6d078);for(let k=0;k<6;k++)line(leaf,[[0,.075,-.57+k*.21],[k%2?.43:-.43,.065,-.65+k*.21]],0xa6c269);}
 root.userData.index=index;
 return {root,body,head,limbs,aura,ring,wings,leaf,castTime:0,
 update(t,dt,moving,sprint,casting,evolved,swimming=false){const run=Math.sin(t*(sprint?13:9));for(const l of limbs){if(isBaby){l.pivot.rotation.x=l.type==='arm'?Math.sin(t*2+l.side)*.22:-.45;l.knee.rotation.x=l.type==='leg'?-.65:0;continue;}if(l.type==='leg'){l.pivot.rotation.x=moving?run*l.side*(sprint?.72:.42):Math.sin(t*1.4)*.017;l.knee.rotation.x=moving?Math.max(0,-run*l.side)*.5:0;}else{l.pivot.rotation.x=casting?-.85:(moving?-run*l.side*.35:.07);l.pivot.rotation.z=l.side*(casting?-.35:-.03);l.knee.rotation.x=casting?-.65:-.12;}}
 body.position.y=(isBaby?.35:0)+(moving?Math.abs(run)*.028:Math.sin(t*1.8)*.008);head.rotation.y=Math.sin(t*.47)*.035;if(wings)wings.children.forEach((w,i)=>{if(w.isMesh)w.rotation.y=Math.sin(t*(moving?9:3.3))*(moving?.42:.14)*(i%2?-1:1)});if(cape){const a=cape.geometry.attributes.position,original=cape.userData.original;for(let i=0;i<a.count;i++){const y=original[i*3+1],depth=clamp(-y,0,1);a.setZ(i,Math.sin(t*3.3+i*.7)*depth*.07-(moving?.15:0)*depth);}a.needsUpdate=true;cape.geometry.computeVertexNormals();}aura.visible=evolved;ring.rotation.z=t;ring.position.y=.9+Math.sin(t*2)*.3;if(leaf)leaf.rotation.z=Math.sin(t*1.4)*.04;
 },handPos(){return new T.Vector3(.4,1.25*scale+.2,.65).applyAxisAngle(new T.Vector3(0,1,0),root.rotation.y).add(root.position)}
 };
}
const clamp=T.MathUtils.clamp;
function animalLeg(parent,mat,x,z){const o=new T.Group();o.position.set(x,.51,z);parent.add(o);mesh(o,GEO.cyl,mat,[0,-.25,0],[.105,.5,.11]);mesh(o,GEO.orb,mat,[0,-.49,.04],[.15,.1,.2]);return o;}
export function makeCompanion(index){const root=new T.Group(),body=new T.Group();root.add(body);const legs=[],wings=[];let wingSpeed=2;
 if([2,3,4,6].includes(index)){
  const col=index===2?0xdde3df:index===3?0x593822:index===4?0x1c2833:0x75563c,m=material(col,{roughness:.93}),nose=material(0x131a20,{roughness:.4});mesh(body,GEO.ball,m,[0,.69,0],[.46,.5,.7]);mesh(body,GEO.ball,m,[0,.94,.54],[.39,.36,.36]);mesh(body,GEO.ball,m,[0,.83,.87],[.23,.19,.19]);mesh(body,GEO.orb,nose,[0,.86,1.03],[.11,.076,.055]);for(const side of[-1,1]){mesh(body,GEO.ball,m,[side*.29,1.21,.48],[.13,.16,.1]);mesh(body,GEO.orb,nose,[side*.16,1.02,.84],[.03,.035,.025]);legs.push(animalLeg(body,m,side*.29,.38),animalLeg(body,m,side*.29,-.42));}if(index===6){const leaf=material(0x709850);for(let i=0;i<7;i++)mesh(body,GEO.orb,leaf,[Math.sin(i)*.37,.89,-.5+i*.14],[.08,.14,.028],[0,i,0]);}if(index===4)line(body,[[-.3,1,.5],[-.45,.91,.2],[-.3,.81,.05],[-.43,.67,-.1]],0x7bcbff);if(index===3)line(body,[[.33,1,.54],[.43,.87,.3],[.32,.68,.1],[.4,.62,-.3]],0xff9c4a);root.scale.setScalar(index===6?.75:1);
 }else if(index===5){const m=material(0x53899f,{metalness:.12,roughness:.26});mesh(body,GEO.ball,m,[0,0,0],[.27,.31,.95]);mesh(body,GEO.ball,m,[0,.03,.74],[.23,.23,.35]);mesh(body,GEO.ball,m,[0,-.09,1.01],[.13,.12,.33]);for(const side of[-1,1]){mesh(body,GEO.orb,material(0x0a2236),[side*.18,.095,.86],[.032,.03,.024]);mesh(body,GEO.cone,m,[side*.35,-.12,.15],[.16,.62,.11],[0,0,side*1.12]);mesh(body,GEO.ball,m,[side*.26,0,-.83],[.4,.085,.2],[0,side*.3,side*.05]);}mesh(body,GEO.cone,m,[0,.33,-.13],[.16,.45,.11],[0,0,-.18]);}
 else if(index===0){const m=material(0xc27f32,{metalness:.35,roughness:.37}),fire=material(0xffaf49,{emissive:0xff6222,emissiveIntensity:.62});mesh(body,GEO.ball,m,[0,0,0],[.21,.35,.43]);mesh(body,GEO.ball,m,[0,.25,.35],[.17,.2,.2]);mesh(body,GEO.cone,fire,[0,.24,.58],[.07,.2,.07],[Math.PI/2,0,0]);for(const sign of[-1,1]){const w=new T.Group();w.position.set(sign*.13,.1,0);body.add(w);for(let i=0;i<9;i++)mesh(w,GEO.orb,i%2?m:fire,[sign*(.13+i*.11),-i*.035,-i*.06],[.095,.07,.45+i*.02],[0,sign*-.4,0]);w.userData.side=sign;wings.push(w);}for(let i=0;i<7;i++)mesh(body,GEO.orb,fire,[(i-3)*.055,-.05,-.57],[.065,.044,.52],[.16,(i-3)*.07,0]);wingSpeed=5.5;}
 else {const m=material(0x14292c,{metalness:.28,roughness:.59}),bone=material(0x606759,{metalness:.28});mesh(body,GEO.ball,m,[0,0,0],[.53,.54,1.2]);mesh(body,GEO.ball,m,[0,.33,1.01],[.3,.55,.5]);mesh(body,GEO.ball,m,[0,.63,1.43],[.35,.25,.6]);mesh(body,GEO.cone,bone,[-.25,1.02,1.13],[.13,.65,.13],[.38,0,-.12]);mesh(body,GEO.cone,bone,[.25,1.02,1.13],[.13,.65,.13],[.38,0,.12]);for(const side of[-1,1]){mesh(body,GEO.orb,material(0x86cd79,{emissive:0x6eaa50,emissiveIntensity:1}),[side*.3,.68,1.67],[.057,.043,.03]);const w=new T.Group();w.position.set(side*.35,.29,-.1);body.add(w);const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(side*.8,1.2);shape.lineTo(side*2.4,.65);shape.lineTo(side*1.7,-.25);shape.lineTo(side*.85,-.45);shape.lineTo(0,0);mesh(w,new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:0x294442,roughness:.7,side:T.DoubleSide,transparent:true,opacity:.88}));line(w,[[0,0,.03],[side*.8,1.2,.03],[side*2.4,.65,.03]],0x728677);w.userData.side=side;wings.push(w);legs.push(animalLeg(body,m,side*.42,.55),animalLeg(body,m,side*.4,-.65));}const points=[new T.Vector3(0,0,-.6),new T.Vector3(0,-.2,-1.5),new T.Vector3(.4,-.1,-2.3),new T.Vector3(.55,.2,-2.75)];mesh(body,new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.12,7,false),m);root.scale.setScalar(1.1);}
 return{root,body,update(t,dt,moving){for(let i=0;i<legs.length;i++)legs[i].rotation.x=moving?Math.sin(t*7+i)*.3:0;for(const w of wings)w.rotation.z=Math.sin(t*wingSpeed)*.28*w.userData.side;if(index===5)body.rotation.z=Math.sin(t*2)*.06;body.position.y=Math.sin(t*2)*([0,1,5].includes(index)?.2:.025);}};
}
