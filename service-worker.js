const CACHE='gabarito-mais-2-4-0-app-shell';
const V='2.4.0';
const RECOVERY='20260901a';
const stamp=u=>`${u}${u.includes('?')?'&':'?'}v=${V}&r=${RECOVERY}`;
const CORE=['/offline.html','/manifest.webmanifest','/assets/icons/icon-192.png','/assets/icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{await caches.delete(CACHE);const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(u=>cache.add(stamp(u))));await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{})}return response}catch(error){const cached=await caches.match(request);if(cached)return cached;if(request.mode==='navigate'){const offline=await caches.match(stamp('/offline.html'))||await caches.match('/offline.html');if(offline)return offline}throw error}})())});
