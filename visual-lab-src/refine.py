from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
s=s.replace("function scalpPoint(theta,phi,out=0){return vec(-.08+(1.68+out)*Math.sin(theta)*Math.sin(phi),1.55+(2.47+out)*Math.cos(theta),.04+(2.02+out)*Math.sin(theta)*Math.cos(phi))}","function scalpPoint(theta,phi,out=0){return vec(-.08+(1.73+out)*Math.sin(theta)*Math.sin(phi),1.75+(2.34+out)*Math.cos(theta),.3+((Math.cos(phi)>0?2.17:2.46)+out)*Math.sin(theta)*Math.cos(phi))}")
s=s.replace('end=1.45-.48*front+.37*back','end=1.48-.60*front+.37*back')
s=s.replace('end=1.32-.44*front+.28*back','end=1.29-.40*front+.20*back')
s=s.replace('c<125','c<180').replace('j<13','j<14')
s=s.replace('len=.31+rand()*.27','len=.27+rand()*.37')
s=s.replace(".028+.20*Math.sin(t*Math.PI)+t*.09",".04+.34*Math.sin(t*Math.PI)+t*.12")
s=s.replace("twist*t+.055*Math.sin(t*Math.PI*2)","twist*t+.08*Math.sin(t*Math.PI*2)")
s=s.replace('0x302017,0x4e3322,0x765437','0x211710,0x332316,0x543924')
s=s.replace('0xa88055','0x665038').replace('roughness:.50,sheen:1','roughness:.63,sheen:.35')
s=s.replace('gs.length<3200','gs.length<1400')
s=s.replace("-.034-rand()*.06","-.012-rand()*.026").replace(".018+rand()*.045",".009+rand()*.016")
s=s.replace('makeEyes();makeMarks(head);','makeMarks(head);')
start=s.index('skin.onBeforeCompile=');end=s.index(';skin.customProgramCacheKey=',start)
s=s[:start]+'''skin.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 vHP;\\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\\nvHP=position;');sh.fragmentShader='varying vec3 vHP;\\n'+sh.fragmentShader;sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float bx=abs(vHP.x+.09);float by=vHP.y;
float beard=(1.-smoothstep(.0,1.00,by))*smoothstep(1.2,1.85,vHP.z)*smoothstep(-1.02,-.48,by);
float lip=(1.-smoothstep(.48,.69,bx))*smoothstep(.15,.25,by)*(1.-smoothstep(.44,.52,by));
float must=(1.-smoothstep(.40,.62,bx))*smoothstep(.49,.59,by)*(1.-smoothstep(.78,.88,by))*smoothstep(1.9,2.1,vHP.z);
float grain=fract(sin(dot(vHP.xy,vec2(1633.7,772.9)))*43758.5453);
diffuseColor.rgb*=mix(vec3(1.),vec3(.22,.20,.18),clamp((beard*(1.-lip)+must*.85)*(.40+grain*.13),0.,.8));`);};''' + s[end+1:]
s=s.replace("const lines=new T.GridHelper(80,40,0x2a4258,0x172b3f);lines.position.y=-4.16;scene.add(lines);",'')
s=s.replace("color:0x0d1a26,roughness:.78","color:0x080e15,roughness:.88")
s=s.replace("head-prototype-03","head-prototype-06")
s=s.replace('active=true;','active=true,dirty=true;')
s=s.replace('function mode(v){','function mode(v){dirty=true;renderer.shadowMap.needsUpdate=true;')
s=s.replace('function setLight(mode){','function setLight(mode){dirty=true;')
s=s.replace('function shot(kind){','function shot(kind){dirty=true;')
s=s.replace('function resize(){','function resize(){dirty=true;')
s=s.replace('magicGroup.visible=e.target.checked','dirty=true;magicGroup.visible=e.target.checked')
s=s.replace('params.wire=e.target.checked','dirty=true;params.wire=e.target.checked')
s=s.replace('renderer.shadowMap.type=T.PCFSoftShadowMap;','renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;')
start=s.index('renderer.setAnimationLoop(()=>{');end=s.index(');}',start)+2
s=s[:start]+'''renderer.setAnimationLoop(()=>{if(!active)return;const moved=controls.update();if(!moved&&!dirty&&!controls.autoRotate)return;renderer.render(scene,camera);dirty=false;$('#metrics').textContent=`${renderer.info.render.triangles.toLocaleString('es-ES')} triángulos · WebGL 2`;});''' + s[end:]
s=s.replace('ESTUDIO DE MATERIALES · ROSTRO PROVISIONAL','MODELO PROVISIONAL · NO ES UNREAL')
p.write_text(s)
p=p.parent/'index.html';s=p.read_text();s=s.replace('Geometría de rostro detallada, piel texturizada, ojos, cabello por hebras y luz','Geometría de rostro detallada, piel texturizada, cabello por hebras y luz');s=s.replace('El parecido con vuestra imagen sigue pendiente de modelado específico.','El parecido con vuestra imagen sigue pendiente de modelado específico. La pose de esta muestra mantiene los ojos cerrados; no dispone de animación facial.');s=s.replace('ESTUDIO DE MATERIALES</span>','MODELO PROVISIONAL · NO ES UNREAL</span>');p.write_text(s)
print('Refinamiento y render bajo demanda aplicados.')
