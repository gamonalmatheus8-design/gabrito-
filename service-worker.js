const CACHE='gabarito-mais-2-1-0-app-shell';
const V='2.1.0';
const ver=u=>`${u}${u.includes('?')?'&':'?'}v=${V}`;
const CORE=[
 '/index.html','/landing-clean.html','/offline.html','/privacy.html','/terms.html','/manifest.webmanifest',
 ver('/assets/styles.css'),ver('/assets/product-polish.css'),ver('/assets/commercial-v2.css'),ver('/assets/trust-v3.css'),
 ver('/assets/landing-clean.css'),ver('/assets/landing-trust.css'),ver('/assets/landing-readability.css'),
 '/assets/icons/icon-192.png','/assets/icons/icon-512.png',
 ver('/js/supabase-config.js'),ver('/js/gabarito-bootstrap.js'),ver('/js/gabarito-question-source.js'),
 ver('/js/gabarito-supabase.js'),ver('/js/gabarito-ui.js'),ver('/js/question-bank.js'),ver('/js/app.js'),
 ver('/js/gabarito-state-bridge.js'),ver('/js/v6-release.js'),ver('/js/product-polish.js'),ver('/js/commercial-v2.js'),
 ver('/js/trust-v3.js'),ver('/js/landing-clean.js')
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(CORE.map(u=>c.add(u)))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
async function networkFirst(request,fallback){try{const res=await fetch(request);if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(request,copy))}return res}catch{return await caches.match(request)||await caches.match(fallback)||Response.error()}}
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
 if(r.mode==='navigate'){
   const isApp=u.origin===location.origin&&(u.pathname==='/app'||u.pathname==='/app/'||u.pathname==='/index.html');
   const isLanding=u.origin===location.origin&&u.pathname==='/';
   e.respondWith(networkFirst(r,isApp?'/index.html':isLanding?'/landing-clean.html':'/offline.html'));return;
 }
 if(u.origin!==location.origin)return;
 if(/\/js\//.test(u.pathname)){e.respondWith(networkFirst(r));return}
 if(/\/data\//.test(u.pathname)){
   e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}return res}).catch(()=>caches.match(r)));
   return;
 }
 e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}return res})));
});
