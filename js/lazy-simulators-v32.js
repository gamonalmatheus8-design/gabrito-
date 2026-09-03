(function(){
'use strict';
const VERSION='3.3.0';
const RECOVERY='20260903-perf1';
const $=(s,r=document)=>r.querySelector(s);
let corePromise=null,enhancePromise=null,ready=false,failed=null;
const loadedScripts=new Set();
const loadedStyles=new Set();
const asset=src=>/^https?:/i.test(src)?src:`${src}${src.includes('?')?'&':'?'}v=${encodeURIComponent(window.GABARITO_APP?.version||VERSION)}&r=${RECOVERY}`;
function loadScript(src,timeoutMs=7000){
 if(loadedScripts.has(src))return Promise.resolve();
 const stale=document.querySelector(`script[data-gplus-lazy="${src}"]`);if(stale)stale.remove();
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');let done=false,timer=null;
  const finish=err=>{if(done)return;done=true;if(timer)clearTimeout(timer);if(err){s.remove();reject(err)}else{loadedScripts.add(src);s.dataset.loaded='1';resolve()}};
  s.src=asset(src);s.async=true;s.dataset.gplusLazy=src;s.onload=()=>finish();s.onerror=()=>finish(new Error('Falha ao carregar '+src));
  if(timeoutMs>0)timer=setTimeout(()=>finish(new Error('Tempo esgotado ao carregar '+src)),timeoutMs);
  document.head.appendChild(s);
 });
}
function loadStyle(src){
 if(loadedStyles.has(src))return Promise.resolve();
 const stale=document.querySelector(`link[data-gplus-lazy-style="${src}"]`);if(stale)stale.remove();
 return new Promise((resolve,reject)=>{
  const l=document.createElement('link');l.rel='stylesheet';l.href=asset(src);l.dataset.gplusLazyStyle=src;
  l.onload=()=>{loadedStyles.add(src);l.dataset.loaded='1';resolve()};l.onerror=()=>{l.remove();reject(new Error('Falha ao carregar '+src))};document.head.appendChild(l);
 });
}
function statusHost(){
 const page=$('#page-mocks');if(!page)return null;
 let host=$('#gplusLazySimStatus',page);
 if(!host){host=document.createElement('div');host.id='gplusLazySimStatus';host.className='card';host.style.cssText='margin:0 0 16px;padding:16px;display:none';const anchor=$('#v24EnemHub',page)||page.firstElementChild;anchor?page.insertBefore(host,anchor):page.prepend(host)}
 return host;
}
function setStatus(state,text){
 const host=statusHost();if(!host)return;
 host.dataset.state=state;host.style.display=state==='ready'?'none':'block';
 if(state==='loading')host.innerHTML=`<strong>Abrindo simulados oficiais…</strong><p style="margin:6px 0 0;color:var(--muted)">${text||'Carregando somente o necessário para ENEM e PISM.'}</p>`;
 else if(state==='error')host.innerHTML=`<strong>Não foi possível abrir os simulados.</strong><p style="margin:6px 0 10px;color:var(--muted)">${text||'Tente novamente.'}</p><button type="button" class="btn btn-primary" data-lazy-retry>Tentar novamente</button>`;
 host.querySelector('[data-lazy-retry]')?.addEventListener('click',()=>{corePromise=null;enhancePromise=null;failed=null;ensureLoaded(true).catch(()=>{})});
}
async function loadEnemCore(){
 await Promise.all([loadStyle('assets/enem-official-v27.css'),loadStyle('assets/enem-history-v28.css')]);
 await loadScript('js/enem-official-v27.js');
 await loadScript('data/enem-official-catalog-v28.js');
 await loadScript('js/enem-history-v28.js');
}
async function loadPismCore(){
 await Promise.all([loadStyle('assets/pism-history-v29.css'),loadScript('data/pism-official-catalog-v29.js')]);
 await loadScript('js/pism-history-v29.js');
}
async function loadEnhancements(){
 if(enhancePromise)return enhancePromise;
 enhancePromise=(async()=>{
  try{
   await Promise.all([loadStyle('assets/enem-native-v31.css'),loadStyle('assets/enem-document-v32.css'),loadStyle('assets/enem-mobile-v30.css')]);
   await loadScript('data/enem-official-native-v31.js');
   await loadScript('js/enem-native-v31.js');
   await loadScript('js/enem-native-integration-v31.js');
   await loadScript('js/enem-document-v32.js');
   await loadScript('js/enem-mobile-v30.js');
   window.GABARITO_APP.simulatorEnhancementsReady=true;
  }catch(e){
   console.warn('[Gabarito+] Melhorias de simulados carregadas parcialmente:',e.message);
   window.GABARITO_APP.simulatorEnhancementError=e.message;
  }
 })();
 return enhancePromise;
}
async function ensureLoaded(force=false){
 if(ready&&!force)return true;
 if(corePromise&&!force)return corePromise;
 failed=null;setStatus('loading','As bibliotecas oficiais são carregadas sob demanda para deixar o início do app mais rápido.');
 corePromise=(async()=>{
  try{
   await Promise.all([loadEnemCore(),loadPismCore()]);
   await new Promise(r=>setTimeout(r,520));
   ready=true;window.GABARITO_APP.simulatorsLazyReady=true;window.GABARITO_APP.simulatorsLoadedAt=Date.now();setStatus('ready');
   try{window.GABARITO_ENEM_HISTORY?.enhance?.()}catch{}
   loadEnhancements().catch(()=>{});
   return true;
  }catch(e){
   failed=e;corePromise=null;window.GABARITO_APP.simulatorsLazyError=e.message;setStatus('error',e.message);throw e;
  }
 })();
 return corePromise;
}
function wrapGo(){
 if(typeof window.go!=='function'||window.go.__gplusLazySimulators)return;
 const base=window.go;
 const wrapped=function(page,...args){const result=base.call(this,page,...args);if(page==='mocks')ensureLoaded().catch(()=>{});return result};
 Object.assign(wrapped,base);wrapped.__gplusLazySimulators=true;window.go=wrapped;
}
function init(){
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.lazySimulators=VERSION;
 wrapGo();
 if($('#page-mocks')?.classList.contains('active')||localStorage.getItem('study_v2_page')==='mocks')ensureLoaded().catch(()=>{});
 const observer=new MutationObserver(()=>{if(!window.go?.__gplusLazySimulators)wrapGo()});observer.observe(document.documentElement,{subtree:true,childList:true});
 window.GABARITO_SIMULATORS_LAZY={version:VERSION,ensureLoaded,get ready(){return ready},get failed(){return failed}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
