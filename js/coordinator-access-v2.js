(function(){
'use strict';
if(window.__GABARITO_COORDINATOR_ACCESS_V2__)return;
window.__GABARITO_COORDINATOR_ACCESS_V2__=true;

const role=()=>String(window.__ESTUDOS_SUPABASE?.role||'student').toLowerCase();
const isCoordinator=()=>['coordinator','school_admin'].includes(role());
const notify=message=>typeof window.toast==='function'?window.toast(message):console.info('[Gabarito+]',message);

function patchRoleLabel(){
  const el=document.getElementById('v5UserRole');
  if(!el)return;
  if(isCoordinator())el.textContent='Coordenador';
}

function leaveSchoolIfBlocked(){
  if(isCoordinator())return;
  const page=document.getElementById('page-school');
  if(page?.classList.contains('active')){
    const home=document.getElementById('page-home');
    if(typeof window.go==='function')window.go('home');
    else{page.classList.remove('active');home?.classList.add('active')}
  }
}

function enforce(){
  const nav=document.getElementById('gplusSchoolNav');
  if(nav)nav.hidden=!isCoordinator();
  const page=document.getElementById('page-school');
  if(page)page.setAttribute('aria-hidden',isCoordinator()?'false':'true');
  patchRoleLabel();
  leaveSchoolIfBlocked();
}

function wrapGo(){
  const base=window.go;
  if(typeof base!=='function'||base.__gplusCoordinatorOnly)return;
  const wrapped=function(page,...args){
    if(page==='school'&&!isCoordinator()){
      notify('Acesso exclusivo do coordenador.');
      return base.call(this,'home',...args);
    }
    return base.call(this,page,...args);
  };
  wrapped.__gplusCoordinatorOnly=true;
  window.go=wrapped;
}

function init(){
  wrapGo();
  enforce();
  const observer=new MutationObserver(()=>{wrapGo();enforce()});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  const client=window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase;
  client?.auth?.onAuthStateChange?.(()=>setTimeout(()=>{wrapGo();enforce()},180));
  window.addEventListener('gplus:ready',()=>setTimeout(()=>{wrapGo();enforce()},220));
  setInterval(()=>{wrapGo();enforce()},1200);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
