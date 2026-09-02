(function(){
'use strict';
function polishPublicShell(){
 document.title='Gabarito+ — ENEM & PISM';
 document.getElementById('adminLink')?.remove();
 const foot=document.querySelector('.sidebar-foot');
 if(foot){
  const title=foot.querySelector('strong');
  if(title)title.textContent='Seu progresso';
  const source=document.getElementById('v7BankSource');
  if(source&&!source.dataset.gplusReady)source.textContent='Conteúdo disponível';
 }
}
function initMore(){
 polishPublicShell();
 const nav=document.getElementById('v42MoreNav'),btn=document.getElementById('v42MoreToggle');
 if(!nav||!btn)return;
 const open=nav.classList.contains('open');btn.setAttribute('aria-expanded',String(open));nav.hidden=!open;nav.style.display=open?'block':'none';
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
},0);
})();
