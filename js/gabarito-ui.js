(function(){
'use strict';
const V9_VERSION='9.2.1';
function polishPublicShell(){
 document.title='Gabarito+ V9 — ENEM & PISM';
 document.getElementById('adminLink')?.remove();
 const foot=document.querySelector('.sidebar-foot');
 if(foot){
  const title=foot.querySelector('strong');
  if(title)title.textContent='Seu progresso';
  const source=document.getElementById('v7BankSource');
  if(source&&!source.dataset.gplusReady)source.textContent='Conteúdo disponível';
 }
}
function loadStyle(src,key){
 if(document.querySelector(`link[data-gplus-layer="${key}"]`))return;
 const link=document.createElement('link');
 link.rel='stylesheet';link.href=`${src}?v=${encodeURIComponent(V9_VERSION)}`;link.dataset.gplusLayer=key;document.head.appendChild(link);
}
function loadScript(src,key,onload,onerror){
 const existing=document.querySelector(`script[data-gplus-layer="${key}"]`);
 if(existing){if(onload)existing.addEventListener('load',onload,{once:true});return existing}
 const script=document.createElement('script');script.src=`${src}?v=${encodeURIComponent(V9_VERSION)}`;script.async=false;script.dataset.gplusLayer=key;
 if(onload)script.onload=onload;if(onerror)script.onerror=onerror;document.head.appendChild(script);return script;
}
function loadGuard(){
 loadStyle('/assets/v9-home-guard.css','v9-home-guard-style');
 if(window.GabaritoV9HomeGuard)return Promise.resolve();
 return new Promise(resolve=>{
  const existing=document.querySelector('script[data-gplus-layer="v9-home-guard-script"]');
  if(existing){if(window.GabaritoV9HomeGuard)return resolve();existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>resolve(),{once:true});setTimeout(resolve,800);return}
  loadScript('/js/v9-home-guard.js','v9-home-guard-script',()=>resolve(),()=>resolve());
 });
}
function loadProductLayer(){
 loadStyle('/assets/v9-product-polish.css','v9-product-polish-style');
 if(window.GabaritoV9Product||document.querySelector('script[data-gplus-layer="v9-product-polish-script"]'))return;
 loadScript('/js/v9-product-polish.js','v9-product-polish-script',null,()=>console.warn('[Gabarito+] O acabamento visual da V9 não pôde ser carregado.'));
}
function loadStabilityLayer(){
 loadStyle('/assets/v9-stability.css','v9-stability-style');
 if(window.GabaritoV92||document.querySelector('script[data-gplus-layer="v9-stability-script"]'))return;
 loadScript('/js/v9-stability.js','v9-stability-script',null,()=>console.warn('[Gabarito+] A camada de estabilidade da V9 não pôde ser carregada.'));
}
function loadPostLayers(){
 /* A IA externa fica intencionalmente congelada nesta fase. */
 loadProductLayer();
 loadStabilityLayer();
}
async function loadV9Layer(){
 await loadGuard();
 loadStyle('/assets/v9-adaptive.css','v9-base-style');
 loadStyle('/assets/v9-refine.css','v9-refine-style');
 loadStyle('/assets/v9-product-polish.css','v9-product-polish-style');
 loadStyle('/assets/v9-stability.css','v9-stability-style');
 if(window.GabaritoV9){setTimeout(()=>window.GabaritoV9HomeGuard?.check?.(),0);loadPostLayers();return}
 const existing=document.querySelector('script[data-gplus-layer="v9-base-script"]');
 if(existing){
  existing.addEventListener('load',()=>{setTimeout(()=>window.GabaritoV9HomeGuard?.check?.(),0);loadPostLayers()},{once:true});
  setTimeout(()=>{window.GabaritoV9HomeGuard?.check?.();if(window.GabaritoV9)loadPostLayers()},300);return;
 }
 loadScript('/js/v9-adaptive.js','v9-base-script',()=>{setTimeout(()=>window.GabaritoV9HomeGuard?.check?.(),0);loadPostLayers()},()=>{console.warn('[Gabarito+] A camada adaptativa V9 não pôde ser carregada.');window.GabaritoV9HomeGuard?.showLegacy?.('falha ao carregar a V9')});
}
function initMore(){
 polishPublicShell();
 const nav=document.getElementById('v42MoreNav'),btn=document.getElementById('v42MoreToggle');
 if(nav&&btn){const open=nav.classList.contains('open');btn.setAttribute('aria-expanded',String(open));nav.hidden=!open;nav.style.display=open?'block':'none'}
 loadV9Layer();
}
window.toggleMoreNav=function(force){
 polishPublicShell();
 const nav=document.getElementById('v42MoreNav'),btn=document.getElementById('v42MoreToggle');if(!nav||!btn)return;
 const current=btn.getAttribute('aria-expanded')==='true'||nav.classList.contains('open'),open=typeof force==='boolean'?force:!current;
 btn.setAttribute('aria-expanded',String(open));btn.classList.toggle('open',open);nav.classList.toggle('open',open);nav.hidden=!open;nav.style.display=open?'block':'none';
 if(window.lucide)window.lucide.createIcons();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initMore,{once:true});else initMore();
setTimeout(()=>{
 polishPublicShell();
 const source=document.getElementById('v7BankSource');
 if(source){const s=window.GABARITO_APP?.bankSource||'local';source.textContent=String(s).startsWith('supabase')?'Conteúdo atualizado':'Modo offline';source.title=String(s).startsWith('supabase')?'Seu banco de estudos está atualizado.':'O conteúdo essencial continua disponível neste dispositivo.';source.dataset.gplusReady='true'}
 loadV9Layer();
},0);
})();
