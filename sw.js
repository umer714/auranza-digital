/* AURANZA service worker: network-first HTML, cache static same-origin assets, safe offline fallback. */
const CACHE_NAME='auranza-shell-v1';
const OFFLINE_URL='/offline.html';
const SHELL_URLS=['/','/index.html','/site.webmanifest','/icon.svg',OFFLINE_URL];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL_URLS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('auranza-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET') return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin) return;
 if(req.mode==='navigate'){
   event.respondWith(fetch(req).then(response=>{
     if(response && response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));}
     return response;
   }).catch(async()=>{
     const cached=await caches.match(req);
     return cached || await caches.match(OFFLINE_URL) || await caches.match('/');
   }));
   return;
 }
 if(['style','script','image','font'].includes(req.destination)){
   event.respondWith(caches.match(req).then(cached=>{
     const network=fetch(req).then(response=>{
       if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));}
       return response;
     }).catch(()=>cached);
     return cached || network;
   }));
 }
});
