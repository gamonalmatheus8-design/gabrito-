(function(){
'use strict';
const VERSION='2.0.0';let installPrompt=null;
function q(id){return document.getElementById(id)}
function updateOnline(){const el=q('v6NetworkStatus');if(!el)return;el.textContent=navigator.onLine?'Online':'Offline';el.dataset.state=navigator.onLine?'ok':'warn'}
function loadProductPolish(){if(!document.querySelector('link[data-gplus-polish]')){const l=document.createElement('link');l.rel='stylesheet';l.href=`/assets/product-polish.css?v=${VERSION}`;l.dataset.gplusPolish='1';document.head.appendChild(l)}if(!document.querySelector('script[data-gplus-polish]')){const s=document.createElement('script');s.src=`/js/product-polish.js?v=${VERSION}`;s.defer=true;s.dataset.gplusPolish='1';document.head.appendChild(s)}}
window.v6InstallApp=async function(){if(!installPrompt){const msg=q('v6InstallMessage');if(msg)msg.textContent='A instalação será oferecida pelo navegador quando estiver disponível. Você também pode usar “Instalar aplicativo” no menu do navegador.';return}installPrompt.prompt();await installPrompt.userChoice.catch(()=>null);installPrompt=null;const btn=q('v6InstallBtn');if(btn)btn.classList.add('hidden')};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const btn=q('v6InstallBtn');if(btn)btn.classList.remove('hidden')});window.addEventListener('appinstalled',()=>{installPrompt=null;const msg=q('v6InstallMessage');if(msg)msg.textContent='Aplicativo instalado neste dispositivo.'});window.addEventListener('online',updateOnline);window.addEventListener('offline',updateOnline);
function initV7Release(){updateOnline();loadProductPolish();const toast=q('toast');if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite')}const main=document.querySelector('main');if(main&&!main.id)main.id='mainContent'}
if('serviceWorker' in navigator){const reg=()=>navigator.serviceWorker.register(`/service-worker.js?v=${VERSION}`,{updateViaCache:'none'}).then(r=>r.update().catch(()=>{})).catch(()=>{});if(document.readyState==='complete')reg();else window.addEventListener('load',reg,{once:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initV7Release,{once:true});else initV7Release();
})();
