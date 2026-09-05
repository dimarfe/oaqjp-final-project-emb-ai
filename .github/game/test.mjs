import puppeteer from 'puppeteer-core';
import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const out='/tmp/game-test-results';await mkdir(out,{recursive:true});
const chrome=['google-chrome','google-chrome-stable','chromium'].map(n=>{try{return execFileSync('which',[n],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
const browser=await puppeteer.launch({executablePath:chrome,headless:true,protocolTimeout:240000,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],report={checks:[],screenshots:[],renderer:'GitHub Actions Chrome / software WebGL; not a physical mobile benchmark'};
let page;
async function capture(name){await page.screenshot({path:out+'/'+name+'.png'});report.screenshots.push(name+'.png')}
try{
 page=await browser.newPage();await page.setViewport({width:1365,height:850,deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|Error/i.test(m.text()))errors.push(m.text().slice(0,3000))});
 await page.goto('http://127.0.0.1:8787/?test=1',{waitUntil:'networkidle0',timeout:120000});
 await capture('01-portada');await page.click('#play');
 await page.waitForFunction(()=>window.gameStatus?.().ready,{timeout:120000});await wait(3500);await capture('02-ciudad');
 report.initial=await page.evaluate(()=>window.gameStatus());
 if(errors.length)throw Error(errors.join('\n'));
 report.checks.push('WebGL 2: mundo y avatar renderizados');
 await page.evaluate(()=>gameTest.quality('low'));
 const names=['Elendil','Feyre','Glacial','Chispa','Zeus','Riven','Sky'];
 for(let i=0;i<7;i++){await page.click(`[data-character="${i}"]`);const n=await page.evaluate(()=>gameStatus().character);if(n!==names[i])throw Error('Cambio de personaje incorrecto '+i)}
 report.checks.push('Siete cambios mediante los retratos del HUD');
 const before=await page.evaluate(()=>gameStatus().position);await page.keyboard.down('KeyW');await wait(1600);await page.keyboard.up('KeyW');const after=await page.evaluate(()=>gameStatus().position);
 if(Math.hypot(after.x-before.x,after.z-before.z)<.2)throw Error('El movimiento no responde');
 report.checks.push('Movimiento real por teclado');
 await page.evaluate(()=>{gameTest.moveTo(0,4);gameTest.interact()});await wait(100);const intro=await page.$eval('#dialog',n=>!n.classList.contains('hidden'));if(!intro)throw Error('El corazón no interactúa');await page.click('#dialogClose');
 report.checks.push('Interacción con el corazón central');
 for(let i=0;i<7;i++){
  await page.evaluate(i=>gameTest.travel(i),i);await wait(300);
  await page.evaluate(()=>{gameTest.cast();gameTest.cast();gameTest.cast();gameTest.interact()});
  const s=await page.evaluate(()=>gameStatus());if(s.shrines!==i+1)throw Error(`Santuario ${i}: ${JSON.stringify(s)}`);
 }
 report.checks.push('21 símbolos activados con sus personajes y 7 santuarios completados');
 await page.evaluate(()=>{gameTest.moveTo(0,4);gameTest.interact()});
 const done=await page.evaluate(()=>gameTest.progress().done);if(!done)throw Error('La aventura no se puede completar');await capture('03-victoria');await page.click('#dialogClose');
 report.checks.push('Final de la aventura alcanzable');
 await page.evaluate(()=>{gameTest.travel(2);gameTest.moveTo(130,-403);gameTest.day('day');gameTest.quality('high');gameTest.camera(.5,.24,8)});await wait(1800);await capture('04-glacial');
 await page.evaluate(()=>{gameTest.travel(5);gameTest.moveTo(-270,408);gameTest.day('sunset');gameTest.camera(.8,.28,9)});await wait(1600);await capture('05-riven');
 await page.evaluate(()=>{gameTest.setCharacter(6);gameTest.moveTo(-8,28);gameTest.day('night');gameTest.camera(0,.31,10)});await wait(1600);await capture('06-sky-noche');
 await page.click('#mapButton');await capture('07-mapa');await page.click('#map [data-close]');
 const remembered=await page.evaluate(()=>gameTest.progress().done);
 await page.reload({waitUntil:'networkidle0',timeout:120000});await page.click('#play');await page.waitForFunction(()=>gameStatus?.().ready,{timeout:120000});
 if(!remembered||!await page.evaluate(()=>gameTest.progress().done))throw Error('El guardado no persiste tras recargar');report.checks.push('Partida conservada después de recargar');
 await page.close();
 const ctx=await browser.createBrowserContext();page=await ctx.newPage();await page.setViewport({width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:8787/?test=1',{waitUntil:'networkidle0',timeout:120000});await page.tap('#play');await page.waitForFunction(()=>gameStatus?.().ready,{timeout:120000});await page.evaluate(()=>gameTest.quality('low'));await wait(1500);
 const visible=await page.$eval('#joystick',n=>{const r=n.getBoundingClientRect();return r.width>0&&getComputedStyle(n.parentElement).display!=='none'});if(!visible)throw Error('Faltan controles de móvil');
 await page.tap('[data-character="2"]');if(await page.evaluate(()=>gameStatus().character)!=='Glacial')throw Error('No cambia por tacto');
 const touchBefore=await page.evaluate(()=>gameStatus().position);const box=await page.$eval('#joystick',n=>{const b=n.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}});
 const cdp=await page.createCDPSession();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x,y:box.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x,y:box.y-35}]});await wait(1800);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const touchAfter=await page.evaluate(()=>gameStatus().position);if(Math.hypot(touchAfter.x-touchBefore.x,touchAfter.z-touchBefore.z)<.15)throw Error('Palanca táctil no mueve');
 await page.tap('#castButton');await wait(250);await capture('08-movil');
 report.checks.push('Viewport móvil horizontal: retratos, magia y movimiento multitáctil');
 report.mobile=await page.evaluate(()=>gameStatus());
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});await wait(1000);await capture('09-movil-vertical');
 report.success=true;
}catch(e){report.success=false;report.error=e.message;try{await capture('ERROR')}catch{};throw e}
finally{report.errors=errors;await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close()}
