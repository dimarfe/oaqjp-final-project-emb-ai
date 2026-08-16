const CACHE='mi-mundo-magico-v2-ai-context-1';
const CORE=[
  './','index.html','styles.css','app.js','ai-context.js','manifest.webmanifest','assets/icon.svg','assets/default-avatar.svg',
  '../chunks/image-00.txt','../chunks/image-01.txt','../chunks/image-02.txt','../chunks/image-03.txt','../chunks/image-04.txt'
];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return response;
  }).catch(()=>caches.match(event.request).then(response=>response||caches.match('./'))));
});
