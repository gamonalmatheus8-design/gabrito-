/* Gabarito+ V9 — proteção contra Home em branco */
(function(){
'use strict';
const HOME_ID='page-home';
const ROOT_ID='v9AdaptiveHome';
function page(){return document.getElementById(HOME_ID)}
function root(){return document.getElementById(ROOT_ID)}
function healthy(){
 const el=root();
 return !!(el&&el.querySelector('.v9-shell')&&el.textContent.trim().length>20);
}
function showLegacy(reason){
 const p=page();if(!p)return;
 p.classList.remove('v9-adaptive-home','v9-ready');
 const r=root();if(r)r.hidden=true;
 if(reason)console.warn('[Gabarito+ V9] Home adaptativa desativada por segurança:',reason);
}
function showV9(){
 const p=page(),r=root();if(!p||!r||!healthy())return false;
 r.hidden=false;p.classList.add('v9-adaptive-home','v9-ready');return true;
}
function check(){
 if(showV9())return;
 const p=page();if(!p)return;
 if(p.classList.contains('v9-adaptive-home')||p.classList.contains('v9-ready'))showLegacy('renderização incompleta');
}
window.addEventListener('error',event=>{
 const file=String(event.filename||'');
 if(file.includes('v9-adaptive')||file.includes('v9-coach'))showLegacy(event.message||'erro de script');
});
window.addEventListener('unhandledrejection',()=>{if(!healthy())showLegacy('falha assíncrona')});
window.GabaritoV9HomeGuard={check,showLegacy,showV9,healthy};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,400),{once:true});else setTimeout(check,400);
setTimeout(check,1200);
setTimeout(check,3000);
})();
