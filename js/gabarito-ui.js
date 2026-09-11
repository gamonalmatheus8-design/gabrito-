(function(){
'use strict';
const V9_VERSION='9.1.0';
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
 const link=document.createElement('link');link.rel='stylesheet';link.href=`${src}?v=${encodeURIComponent(V9_VERSION)}`;link.dataset.gplusLayer=key;document.head.appendChild(link);
}
function loadAiLayer(){
 loadStyle('/assets/v9-refine.css','v9-refine-style');
 if(window.GabaritoV9AI||document.querySelector('script[data-gplus-layer="v9-ai-script"]'))return;
 const ai=document.createElement('script');ai.src=`/js/v9-coach-ai.js?v=${encodeURIComponent(V9_VERSION)}`;ai.async=false;ai.dataset.gplusLayer='v9-ai-script';ai.onerror=()=>console.warn('[Gabarito+] O Coach avançado não pôde ser carregado.');document.head.appendChild(ai);
}
function loadV9Layer(){
 loadStyle('/assets/v9-adaptive.css','v9-base-style');
 loadStyle('/assets/v9-refine.css','v9-refine-style');
 if(window.GabaritoV9){loadAiLayer();return}
 const existing=document.querySelector('script[data-gplus-layer="v9-base-script"]');
 if(existing){existing.addEventListener('load',loadAiLayer,{once:true});setTimeout(()=>{if(window.GabaritoV9)loadAiLayer()},120);return}
 const script=document.createElement('script');script.src=`/js/v9-adaptive.js?v=${encodeURIComponent(V9_VERSION)}`;script.async=false;script.dataset.gplusLayer='v9-base-script';script.onload=loadAiLayer;script.onerror=()=>console.warn('[Gabarito+] A camada adaptativa V9 não pôde ser carregada.');document.head.appendChild(script);
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
 if(source){
  const s=window.GABARITO_APP?.bankSource||'local';
  source.textContent=String(s).startsWith('supabase')?'Conteúdo atualizado':'Modo offline';
  source.title=String(s).startsWith('supabase')?'Seu banco de estudos está atualizado.':'O conteúdo essencial continua disponível neste dispositivo.';
  source.dataset.gplusReady='true';
 }
 loadV9Layer();
},0);
})();
