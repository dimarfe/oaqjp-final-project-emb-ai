import * as T from './vendor/three.js';
import {CAST,SITES,WORLD_HALF} from './canon.js';
export const clamp=T.MathUtils.clamp;
export function random(seed=713){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const smooth=(a,b,v)=>{v=clamp((v-a)/(b-a),0,1);return v*v*(3-2*v)};
const waterSite=SITES[5];
function pathDist(x,z,s){const l=s.x*s.x+s.z*s.z,t=clamp((x*s.x+z*s.z)/l,0,1);return Math.hypot(x-s.x*t,z-s.z*t)}
export function heightAt(x,z){
 const r=Math.hypot(x,z);let h=3+Math.sin(x*.008+Math.cos(z*.008))*7+Math.cos(z*.012-x*.003)*5+Math.sin(x*.031)*Math.cos(z*.021)*1.2;
 h+=35*Math.exp(-((x-140)**2+(z+490)**2)/45000);h+=20*Math.exp(-((x+370)**2+(z+340)**2)/47000);
 const edge=smooth(540,710,r);h+=edge*(10+Math.abs(Math.sin(x*.009)*Math.cos(z*.01))*65+Math.abs(Math.sin(x*.022+z*.018))*17);
 h=T.MathUtils.lerp(h,-14,smooth(750,835,r));
 const lakeD=Math.hypot(x-waterSite.x,z-waterSite.z);h=T.MathUtils.lerp(h,-2.7,1-smooth(99,145,lakeD));
 for(const s of SITES){const d=Math.hypot(x-s.x,z-s.z);let base=s.owner===2?27:s.owner===0?19:s.owner===3?9:3;h=T.MathUtils.lerp(h,base,1-smooth(26,55,d));}
 h=T.MathUtils.lerp(h,2,1-smooth(130,180,r));
 return h;
}
export function waterAt(x,z){return Math.hypot(x-waterSite.x,z-waterSite.z)<126?.15:-5;}
export function regionAt(x,z){let s=null,d=180;for(const a of SITES){const k=Math.hypot(x-a.x,z-a.z);if(k<d){s=a;d=k}}return s;}
export function mesh(parent,g,m,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){const o=new T.Mesh(g,m);o.position.set(...pos);o.scale.set(...scale);o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
export const GEO={box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,16,12),orb:new T.SphereGeometry(1,10,8),cyl:new T.CylinderGeometry(1,1,1,12),cone:new T.ConeGeometry(1,1,12),crystal:new T.OctahedronGeometry(1,0),rock:new T.DodecahedronGeometry(1,1),ring:new T.TorusGeometry(1,.065,5,28)};
export function material(color,opts={}){return new T.MeshStandardMaterial({color,roughness:.75,metalness:.05,...opts})}
function texture(kind,size=256){const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),r=random(917);ctx.fillStyle=kind==='stone'?'#99938a':'#aca99f';ctx.fillRect(0,0,size,size);for(let i=0;i<14000;i++){const x=r()*size,y=r()*size,l=kind==='stone'?60+r()*110:105+r()*100;ctx.fillStyle=`rgba(${l},${l},${l},${r()*.26})`;ctx.fillRect(x,y,r()*3+1,r()*2+1)}if(kind==='stone'){ctx.strokeStyle='#4f4d4777';ctx.lineWidth=1.4;for(let row=0;row<8;row++){let y=row*32;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();for(let j=0;j<4;j++){const x=j*64+(row%2)*32;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+32);ctx.stroke()}}}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
function softSprite(){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const a=g.createRadialGradient(32,32,0,32,32,32);a.addColorStop(0,'#fff');a.addColorStop(.16,'#fff8');a.addColorStop(.45,'#fff2');a.addColorStop(1,'#fff0');g.fillStyle=a;g.fillRect(0,0,64,64);return new T.CanvasTexture(c)}
export function glow(parent,color,size,pos){const m=new T.SpriteMaterial({map:softSprite(),color,transparent:true,depthWrite:false,blending:T.AdditiveBlending});const o=new T.Sprite(m);o.scale.set(size,size,1);o.position.set(...pos);parent.add(o);return o;}
class Batches{
 constructor(root){this.root=root;this.data=new Map();this.dummy=new T.Object3D()}
 add(g,m,p,s=[1,1,1],r=[0,0,0]){const id=g.uuid+m.uuid;if(!this.data.has(id))this.data.set(id,{g,m,list:[]});this.data.get(id).list.push({p,s,r})}
 finish(){const batches=[];for(const{g,m,list}of this.data.values()){const o=new T.InstancedMesh(g,m,list.length);for(let i=0;i<list.length;i++){const d=list[i];this.dummy.position.set(...d.p);this.dummy.scale.set(...d.s);this.dummy.rotation.set(...d.r);this.dummy.updateMatrix();o.setMatrixAt(i,this.dummy.matrix)}o.instanceMatrix.needsUpdate=true;o.castShadow=true;o.receiveShadow=true;o.computeBoundingSphere();this.root.add(o);batches.push(o)}this.data.clear();return batches}
}
function terrainColor(x,z,h){let c=new T.Color(0x62794b);const s=regionAt(x,z);if(s){const amount=1-smooth(70,210,Math.hypot(x-s.x,z-s.z));const palette=[0x717b76,0x4d743c,0xcbdfdf,0x4d3a32,0x68606b,0x8fa587,0x7f8d52];c.lerp(new T.Color(palette[s.owner]),amount)}const r=Math.hypot(x,z);if(r>540)c.lerp(new T.Color(h>62?0xb7c5c6:0x767774),smooth(540,690,r));if(r<127)c=new T.Color(0x8c8b75);let path=999;for(const s of SITES)path=Math.min(path,pathDist(x,z,s));if(path<6&&r>105&&r<550)c.lerp(new T.Color(0xa69b79),1-smooth(3,6,path));const f=.94+Math.sin(x*.09+z*.07)*.055+Math.cos(x*.22-z*.19)*.025;c.multiplyScalar(f);return c;}
function terrain(root,mat){const chunk=WORLD_HALF*2/8,div=24;for(let cz=0;cz<8;cz++)for(let cx=0;cx<8;cx++){const px=-WORLD_HALF+cx*chunk,pz=-WORLD_HALF+cz*chunk;const g=new T.PlaneGeometry(chunk,chunk,div,div);g.rotateX(-Math.PI/2);g.translate(px+chunk/2,0,pz+chunk/2);const a=g.attributes.position,colors=[];for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),h=heightAt(x,z);a.setY(i,h);const c=terrainColor(x,z,h);colors.push(c.r,c.g,c.b)}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();const o=mesh(root,g,mat);o.castShadow=false;}}
function skyObject(){const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sunDir:{value:new T.Vector3(-.35,.42,-.8).normalize()},night:{value:0}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`precision highp float;varying vec3 vP;uniform vec3 sunDir;uniform float night;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
void main(){vec3 d=normalize(vP);float h=max(d.y,0.);vec3 a=mix(vec3(.77,.81,.78),vec3(.19,.43,.59),pow(h,.42));float s=max(dot(d,sunDir),0.);a+=vec3(1.,.57,.24)*pow(s,12.)*.35;a+=vec3(1.,.88,.58)*pow(s,750.)*3.;a=mix(a,vec3(.014,.03,.08)+vec3(.03,.035,.055)*(1.-h),night);float star=step(.998,hash(floor(d*900.)))*pow(max(h,0.),.3);a+=star*night*vec3(.8,.88,1.);gl_FragColor=vec4(a,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});const o=new T.Mesh(new T.SphereGeometry(2800,32,16),mat);o.frustumCulled=false;return o}
function waterMaterial(){return new T.ShaderMaterial({uniforms:{time:{value:0},night:{value:0}},vertexShader:'varying vec3 wP;void main(){vec4 w=modelMatrix*vec4(position,1.);wP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:`precision highp float;varying vec3 wP;uniform float time;uniform float night;void main(){float a=sin(wP.x*.28+time*.65+sin(wP.z*.22))*cos(wP.z*.26-time*.49);float b=sin(wP.z*.09+wP.x*.14-time*.35);vec3 n=normalize(vec3(a*.18,1.,b*.12));vec3 v=normalize(cameraPosition-wP);float f=pow(1.-max(dot(n,v),0.),3.);vec3 c=mix(vec3(.04,.23,.27),vec3(.55,.73,.73),f);float spec=pow(max(dot(reflect(normalize(vec3(.35,-.6,.8)),n),v),0.),100.);c+=vec3(1.,.84,.53)*spec*2.;c+=vec3(.03,.09,.08)*a;c*=1.-night*.65;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});}
export async function buildRealm(scene,onProgress){
 const root=new T.Group();scene.add(root);const batch=new Batches(root),r=random(18941);const stoneTex=texture('stone'),noiseTex=texture('earth');stoneTex.repeat.set(2,3);noiseTex.repeat.set(145,145);
 const mats={stone:material(0x778183,{map:stoneTex,bumpMap:stoneTex,bumpScale:.12}),dark:material(0x344b51,{map:stoneTex,bumpMap:stoneTex,bumpScale:.18}),white:material(0xcad7d7,{roughness:.45}),gold:material(0xbba36c,{metalness:.72,roughness:.31}),bark:material(0x544939,{roughness:.97}),leaf:material(0x3f6640,{roughness:.88}),leaf2:material(0x749447,{roughness:.8}),ice:material(0xb8e5ef,{metalness:.18,roughness:.15}),lava:material(0xff6020,{emissive:0xff4210,emissiveIntensity:1.2,roughness:.36}),grass:material(0x638046,{side:T.DoubleSide,roughness:1}),flower:material(0xeabbe0,{emissive:0x3e1439,roughness:.6}),roof:material(0x364b55,{metalness:.25}),sand:material(0xbbbc9a),terrain:material(0xffffff,{map:noiseTex,bumpMap:noiseTex,bumpScale:1,vertexColors:true,roughness:1})};
 const blockers=[],targets=[],shrines=[],towerLights=[],collectibles=[],lore=[],specials=[],animated=[];
 const put=(g,m,p,s,rot)=>batch.add(g,m,p,s,rot);
 onProgress(.12,'Formando montañas, lagos y siete biomas…');terrain(root,mats.terrain);
 const sky=skyObject();scene.add(sky);const waterMat=waterMaterial();const ocean=mesh(root,new T.PlaneGeometry(5500,5500),waterMat,[0,-5,0],[1,1,1],[-Math.PI/2,0,0]);ocean.castShadow=false;
 const lake=mesh(root,new T.CircleGeometry(127,72),waterMat,[waterSite.x,.15,waterSite.z],[1,1,1],[-Math.PI/2,0,0]);lake.castShadow=false;
 await new Promise(q=>setTimeout(q,5));
 // Monumental hub. The base geometry is batched by material, not one draw call per ornament.
 put(GEO.cyl,mats.stone,[0,1.6,0],[38,.8,38]);put(GEO.cyl,mats.dark,[0,2.03,0],[32,.08,32]);
 for(let ring=0;ring<4;ring++)put(GEO.ring,mats.gold,[0,2.13+ring*.001,0],[12+ring*7,12+ring*7,1],[-Math.PI/2,0,0]);
 for(let i=0;i<7;i++){
  const a=i/7*Math.PI*2,x=Math.sin(a)*82,z=Math.cos(a)*82,base=heightAt(x,z),h=64+(i%3)*14,c=CAST[i];
  put(GEO.cyl,mats.stone,[x,base+2,z],[8,4,8]);put(GEO.cyl,mats.dark,[x,base+h*.5,z],[5.3,h,5.3]);blockers.push({x,z,r:6.7});
  for(let j=0;j<7;j++){const yy=base+10+j*(h-8)/7;put(GEO.cyl,mats.gold,[x,yy,z],[5.6,.3,5.6]);}
  for(let k=0;k<6;k++){const t=k/6*Math.PI*2,dx=Math.sin(t)*5.6,dz=Math.cos(t)*5.6;put(GEO.cyl,mats.stone,[x+dx,base+h*.49,z+dz],[.48,h,.48]);put(GEO.cone,mats.gold,[x+dx,base+h+4,z+dz],[.9,9,.9]);for(let q=0;q<3;q++){put(GEO.box,mats.white,[x+dx*.91,base+15+q*16,z+dz*.91],[.38,9,.38]);}}
  put(GEO.cone,mats.roof,[x,base+h+9,z],[5.6,22,5.6]);put(GEO.cone,mats.gold,[x,base+h+23,z],[1.15,9,1.15]);
  const group=new T.Group();group.position.set(x,base+h+6,z);root.add(group);const gem=mesh(group,new T.OctahedronGeometry(3,0),material(c.color,{emissive:c.color,emissiveIntensity:.12,roughness:.18}),[0,0,0],[1,1.65,1]);const halo=glow(group,c.color,20,[0,0,0]);halo.material.opacity=.12;
  const beam=mesh(group,new T.CylinderGeometry(.45,2,190,14,1,true),new T.MeshBasicMaterial({color:c.color,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}),[0,95,0]);beam.castShadow=false;towerLights.push({gem,halo,beam,group});
 }
 // Residential ring, arched gateways and bridges.
 for(let i=0;i<34;i++){const a=i/34*Math.PI*2,rr=128+r()*38,x=Math.sin(a)*rr,z=Math.cos(a)*rr;let blocked=false;for(const s of SITES)if(pathDist(x,z,s)<11)blocked=true;if(blocked||Math.abs(x)<15&&z>0)continue;const h=7+r()*10,y=heightAt(x,z),w=3+r()*2;put(GEO.box,mats.stone,[x,y+h/2,z],[w*2,h,w*1.5],[0,a,0]);put(GEO.cone,mats.roof,[x,y+h+2.5,z],[w*1.6,6,w*1.6],[0,a+Math.PI/4,0]);put(GEO.box,mats.gold,[x,y+h*.6,z+w*.76],[.8,1.6,.2]);blockers.push({x,z,r:w+1})}
 const hubCrystal=mesh(root,new T.OctahedronGeometry(1,0),material(0x84e7e5,{emissive:0x3bcccc,emissiveIntensity:.8,metalness:.15,roughness:.16}),[0,8,0],[2,4.2,2]);animated.push({o:hubCrystal,base:8,type:'float'});glow(root,0x76eee4,11,[0,7,0]);put(GEO.cyl,mats.gold,[0,3,0],[3,2,3]);specials.push({id:'heart',x:0,z:0,y:3,kind:'heart',name:'Escuchar el corazón de las torres'});
 const archZ=109;for(const x of[-13,13]){put(GEO.box,mats.dark,[x,10,archZ],[4,16,5]);put(GEO.cone,mats.gold,[x,22,archZ],[3,10,3]);blockers.push({x,z:archZ,r:3})}const archG=new T.TorusGeometry(13,1.7,7,30,Math.PI);put(archG,mats.stone,[0,17,archZ],[1,1,1],[0,0,0]);
 onProgress(.3,'Levantando la Ciudad de las Siete Torres…');await new Promise(q=>setTimeout(q,5));
 for(const s of SITES){
  const y=heightAt(s.x,s.z),cc=CAST[s.owner];put(GEO.cyl,mats.stone,[s.x,y-.1,s.z],[27,.25,27]);put(GEO.ring,mats.gold,[s.x,y+.1,s.z],[22,22,1],[-Math.PI/2,0,0]);
  for(let k=0;k<6;k++){const a=k*Math.PI/3,x=s.x+Math.cos(a)*25,z=s.z+Math.sin(a)*25;if(k===1)continue;put(GEO.cyl,mats.stone,[x,y+5,z],[1.25,10,1.25]);put(GEO.cone,mats.gold,[x,y+11,z],[1.4,3,1.4]);blockers.push({x,z,r:1.6})}
  put(GEO.cyl,mats.dark,[s.x,y+1.5,s.z],[3,3,3]);const gm=material(cc.color,{emissive:cc.color,emissiveIntensity:.3,metalness:.2,roughness:.22});const crystal=mesh(root,GEO.crystal,gm,[s.x,y+6,s.z],[1.8,3,1.8]);animated.push({o:crystal,base:y+6,type:'float'});const halo=glow(root,cc.color,12,[s.x,y+6,s.z]);halo.material.opacity=.22;
  shrines.push({...s,y,crystal,halo,name:'Despertar el santuario'});
  for(let j=0;j<3;j++){
   const a=j*Math.PI*2/3-.4,x=s.x+Math.sin(a)*15,z=s.z+Math.cos(a)*15;put(GEO.cyl,mats.stone,[x,y+.5,z],[2.4,1,2.4]);
   const tgroup=new T.Group();tgroup.position.set(x,y+1,z);root.add(tgroup);let core,extra;
   if(s.owner===1){core=mesh(tgroup,GEO.cyl,mats.bark,[0,2,0],[.3,4,.3]);for(let k=0;k<5;k++)mesh(tgroup,GEO.cone,mats.bark,[Math.sin(k)*.7,3+k*.3,Math.cos(k)*.7],[.22,2,.22],[.5,k,.6]);extra=mesh(tgroup,GEO.rock,material(0x4b793d),[0,4,0],[.01,.01,.01]);}
   else if(s.owner===6){core=mesh(tgroup,GEO.ball,material(0x8fa348,{emissive:0x383911}),[0,1.2,0],[.8,.5,.8]);for(let k=0;k<8;k++){const a=k*Math.PI/4;mesh(tgroup,GEO.orb,mats.flower,[Math.sin(a)*1.2,1.1,Math.cos(a)*1.2],[.7,.2,.7])}extra=glow(tgroup,cc.color,4,[0,1.5,0]);extra.material.opacity=.1;}
   else if(s.owner===5||s.owner===2){core=mesh(tgroup,GEO.ring,mats.gold,[0,.3,0],[1.7,1.7,1],[-Math.PI/2,0,0]);extra=mesh(tgroup,GEO.cone,material(cc.color,{transparent:true,opacity:.5,roughness:.14}),[0,1.1,0],[1,2,1]);}
   else{core=mesh(tgroup,GEO.crystal,material(s.owner===3?0xb4deec:0x667683,{emissive:cc.color,emissiveIntensity:.07,metalness:.4,roughness:.25}),[0,2,0],[.9,2,.9]);extra=glow(tgroup,cc.color,5,[0,2,0]);extra.material.opacity=.08;}
   targets.push({id:s.id+'-'+j,site:s.id,owner:s.owner,x,z,y:y+1,group:tgroup,core,extra,charged:false,name:s.noun});
  }
 }
 // Distinct biome landmarks.
 const f=SITES[1];for(let k=0;k<11;k++){const a=k*2.4,rr=46+r()*55,x=f.x+Math.sin(a)*rr,z=f.z+Math.cos(a)*rr,y=heightAt(x,z),h=17+r()*15;put(GEO.cyl,mats.bark,[x,y+h/2,z],[1.2,h,1.2]);for(let j=0;j<4;j++)put(GEO.rock,j%2?mats.leaf:mats.leaf2,[x+Math.sin(j*2)*4,y+h+j*1.8,z+Math.cos(j*2)*4],[8,4.5,7]);blockers.push({x,z,r:2.2})}
 const ice=SITES[2];for(let k=0;k<24;k++){const a=k*2.4,rr=38+r()*63,x=ice.x+Math.sin(a)*rr,z=ice.z+Math.cos(a)*rr,y=heightAt(x,z),h=8+r()*26;put(GEO.crystal,mats.ice,[x,y+h*.38,z],[2+r()*3,h*.6,2+r()*3],[r()*.25,r()*6,r()*.2]);blockers.push({x,z,r:2.2})}
 const fire=SITES[3];for(let k=0;k<30;k++){const a=k/30*Math.PI*2,rr=64+r()*15,x=fire.x+Math.sin(a)*rr,z=fire.z+Math.cos(a)*rr,y=heightAt(x,z),h=8+r()*32;put(GEO.cyl,mats.dark,[x,y+h/2,z],[3,h,3]);}for(let k=0;k<9;k++){const x=fire.x+Math.sin(k)*45,z=fire.z+Math.cos(k)*45;put(GEO.box,mats.lava,[x,heightAt(x,z)+.09,z],[1,.06,12],[0,k,0])}
 const du=SITES[4];for(let k=0;k<9;k++){const a=k/9*Math.PI*2,x=du.x+Math.sin(a)*52,z=du.z+Math.cos(a)*52,y=heightAt(x,z);put(GEO.box,mats.dark,[x,y+9,z],[2,18,2],[0,a,.05]);put(GEO.box,mats.gold,[x+Math.cos(a)*4,y+18,z-Math.sin(a)*4],[10,.8,1.3],[0,a,0]);blockers.push({x,z,r:2})}
 const ga=SITES[6];for(let k=0;k<180;k++){const a=r()*Math.PI*2,rr=30+r()*65,x=ga.x+Math.sin(a)*rr,z=ga.z+Math.cos(a)*rr,y=heightAt(x,z);put(GEO.cone,mats.leaf2,[x,y+.6,z],[.18,1.2,.18]);put(GEO.orb,k%3===0?mats.gold:mats.flower,[x,y+1.1,z],[.38,.16,.38]);}
 onProgress(.48,'Haciendo crecer bosques, cristales y jardines…');await new Promise(q=>setTimeout(q,5));
 // Forest and rocks are deterministic instanced geometry.
 for(let i=0;i<1700;i++){
  const x=(r()-.5)*1500,z=(r()-.5)*1500,rr=Math.hypot(x,z);if(rr<175||rr>735)continue;const s=regionAt(x,z);if(s&&Math.hypot(x-s.x,z-s.z)<40)continue;let pd=100;for(const s of SITES)pd=Math.min(pd,pathDist(x,z,s));if(pd<9)continue;const h=heightAt(x,z);if(h<waterAt(x,z)+1)continue;
  if((s?.owner===2||s?.owner===3)||r()<.28){const sc=2+r()*6;put(GEO.rock,s?.owner===2?mats.ice:mats.stone,[x,h+.2,z],[sc,sc*(.4+r()),sc*.7],[r(),r()*6,r()]);if(sc>4)blockers.push({x,z,r:sc*.62});continue}
  const ht=7+r()*15;put(GEO.cyl,mats.bark,[x,h+ht*.32,z],[.3+ht*.018,ht*.64,.3+ht*.018]);
  if(r()<.62){put(GEO.cone,mats.leaf,[x,h+ht*.6,z],[ht*.24,ht*.77,ht*.24]);put(GEO.cone,mats.leaf2,[x,h+ht*.81,z],[ht*.15,ht*.46,ht*.15]);}
  else {put(GEO.rock,mats.leaf,[x,h+ht*.76,z],[ht*.34,ht*.27,ht*.32]);put(GEO.rock,mats.leaf2,[x+2,h+ht*.82,z+1],[ht*.23,ht*.21,ht*.21]);}
  blockers.push({x,z,r:.65});
 }
 const grassG=new T.PlaneGeometry(1,1);grassG.translate(0,.5,0);for(let i=0;i<7000;i++){const x=(r()-.5)*1280,z=(r()-.5)*1280;if(Math.hypot(x,z)<123)continue;const s=regionAt(x,z);if(s&&(s.owner===2||s.owner===3))continue;if(s&&Math.hypot(x-s.x,z-s.z)<28)continue;const y=heightAt(x,z);if(y<waterAt(x,z)+.15)continue;put(grassG,mats.grass,[x,y,z],[.5+r(),.5+r()*.9,.7],[0,r()*6,0])}
 const collectibleMat=material(0xd9f9dd,{emissive:0x65dac7,emissiveIntensity:1.4,metalness:.1,roughness:.14});
 for(let i=0;i<42;i++){const si=i%7,s=SITES[si],t=.22+Math.floor(i/7)*.125,x=s.x*t+Math.sin(i*3)*9,z=s.z*t+Math.cos(i*2)*9,y=heightAt(x,z);const o=mesh(root,GEO.crystal,collectibleMat,[x,y+1.8,z],[.46,.8,.46]);collectibles.push({id:'echo-'+i,x,z,y,mesh:o,base:y+1.8});}
 const loreText=[
 ['La première lumière','Les sept éléments ne sont pas sept armes : ce sont sept façons de prendre soin du même monde.'],
 ['La memoria de las raíces','Feyre escuchó el latido de una semilla sobre la piedra. Desde entonces, ningún lugar estuvo perdido del todo.'],
 ['La nieve que abriga','Glacial sueña con un palacio de hielo donde nadie sienta frío. La magia cambia cuando cambia la intención.'],
 ['Una llama para crear','Chispa puede encender la noche sin quemar el bosque. El fuego también sirve para reunir a la familia.'],
 ['Dos fuerzas, una promesa','Zeus descubrió que la diferencia entre los elementos no les impide formar parte de una misma luz.'],
 ['El río del cielo','Riven encontró una corriente que no terminaba en el mar, sino entre las estrellas. Su delfín todavía recuerda el camino.'],
 ['La octava estrella','Cuando Sky sonrió, alguien vio una estrella nueva sobre las torres. Nadie ha descubierto todavía su secreto.']
 ];loreText[0]=['La primera luz','Los siete elementos no son siete armas: son siete formas de cuidar del mismo mundo.'];
 for(let i=0;i<7;i++){const s=SITES[i],x=s.x*.65+29,z=s.z*.65-20,y=heightAt(x,z);put(GEO.box,mats.stone,[x,y+1.8,z],[2.2,3.6,.6],[0,i*.4,.05]);lore.push({id:'lore-'+i,x,z,y,name:loreText[i][0],text:loreText[i][1]});}
 // A train of stars travels across the realm. Its station is always accessible.
 const railM=material(0x96bdb7,{metalness:.68,roughness:.32});const pathPoints=[];for(let i=0;i<=150;i++){const a=i/150*Math.PI*2;pathPoints.push(new T.Vector3(Math.sin(a)*565,42+Math.sin(a*2)*12,Math.cos(a)*565))}const curve=new T.CatmullRomCurve3(pathPoints);const track=new T.TubeGeometry(curve,180,.24,5,false);mesh(root,track,railM);
 const train=new T.Group();root.add(train);const trainM=material(0x223a4c,{metalness:.5,roughness:.33});for(let i=0;i<3;i++){mesh(train,GEO.box,trainM,[0,2,-i*6],[3,3.3,5]);mesh(train,GEO.cone,mats.gold,[0,4.1,-i*6],[2.1,1.3,2.9],[0,Math.PI/4,0]);for(let j=0;j<3;j++)mesh(train,GEO.box,material(0xffd990,{emissive:0xffbb54,emissiveIntensity:.7}),[1.53,2.3,-i*6+1.5-j*1.5],[.08,1.1,.8]);}glow(train,0x88e7ff,13,[0,2,3]);
 const stx=-54,stz=57,sty=heightAt(stx,stz);put(GEO.box,mats.stone,[stx,sty+.2,stz],[15,.4,8]);for(const d of[-6,6]){put(GEO.cyl,mats.gold,[stx+d,sty+3,stz],[.22,6,.22]);}put(GEO.box,mats.roof,[stx,sty+6,stz],[16,.4,9]);specials.push({id:'train',x:stx,z:stz,y:sty,kind:'train',name:'Subir al Tren de las Estrellas'});
 // Portal pedestals at the hub point toward every realm.
 const portals=[];for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=Math.sin(a)*44,z=Math.cos(a)*44,y=heightAt(x,z);const g=new T.Group();g.position.set(x,y+3,z);g.rotation.y=a;root.add(g);mesh(g,new T.TorusGeometry(2.5,.2,8,32),mats.gold);const ring=mesh(g,new T.CircleGeometry(2.28,36),new T.MeshBasicMaterial({color:CAST[i].color,transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false}));ring.castShadow=false;glow(g,CAST[i].color,8,[0,0,0]);portals.push({x,z,y,owner:i,ring,name:'Viajar a '+SITES[i].name})}
 const statics=batch.finish();onProgress(.7,'Preparando los guardianes y los poderes…');await new Promise(q=>setTimeout(q,5));
 // Floating motes decorate the hub without hundreds of sprite draw calls.
 const ambientG=new T.BufferGeometry(),ambientA=new Float32Array(240*3);for(let i=0;i<240;i++){ambientA[i*3]=(r()-.5)*460;ambientA[i*3+1]=6+r()*40;ambientA[i*3+2]=(r()-.5)*460}ambientG.setAttribute('position',new T.BufferAttribute(ambientA,3));const motes=new T.Points(ambientG,new T.PointsMaterial({color:0xc5e8d4,size:.4,transparent:true,opacity:.6,depthWrite:false,map:softSprite(),blending:T.AdditiveBlending}));root.add(motes);
 return{root,mats,sky,waterMat,blockers,targets,shrines,towerLights,collectibles,lore,specials,portals,animated,train,curve,statics,motes,
  update(t,dt,night){waterMat.uniforms.time.value=t;waterMat.uniforms.night.value=night;sky.material.uniforms.night.value=night;for(const a of animated){a.o.position.y=a.base+Math.sin(t*.85+a.base)*.4;a.o.rotation.y+=dt*.24;}for(const c of collectibles)if(c.mesh.visible){c.mesh.rotation.y+=dt;c.mesh.position.y=c.base+Math.sin(t*1.5+c.x)*.24}motes.rotation.y=t*.004;const p=curve.getPointAt(t*.006%1),tangent=curve.getTangentAt(t*.006%1);train.position.copy(p);train.rotation.y=Math.atan2(tangent.x,tangent.z);},
  lightTower(i,on){const a=towerLights[i];a.gem.material.emissiveIntensity=on?2.5:.12;a.halo.material.opacity=on?.75:.12;a.beam.material.opacity=on?.12:0;},
  activateTarget(o){o.charged=true;if(o.owner===1)o.extra.scale.set(3,2,3);else if(o.owner===6)o.extra.material.opacity=.75;else if(o.extra.isSprite)o.extra.material.opacity=.8;else{o.extra.material.color.setHex(CAST[o.owner].color);o.extra.scale.set(1.4,2,1.4)}if(o.core.material.emissive){o.core.material=o.core.material.clone();o.core.material.emissive.setHex(CAST[o.owner].color);o.core.material.emissiveIntensity=1.7;}}
 };
}
