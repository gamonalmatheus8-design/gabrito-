(function(){
'use strict';
function initMore(){
  const nav=document.getElementById('v42MoreNav'),btn=document.getElementById('v42MoreToggle');
  if(!nav||!btn)return;
  const open=nav.classList.contains('open');
  btn.setAttribute('aria-expanded',String(open));
  nav.hidden=!open;
  nav.style.display=open?'block':'none';
}
window.toggleMoreNav=function(force){
  const nav=document.getElementById('v42MoreNav'),btn=document.getElementById('v42MoreToggle');
  if(!nav||!btn)return;
  const current=btn.getAttribute('aria-expanded')==='true'||nav.classList.contains('open');
  const open=typeof force==='boolean'?force:!current;
  btn.setAttribute('aria-expanded',String(open));
  btn.classList.toggle('open',open);
  nav.classList.toggle('open',open);
  nav.hidden=!open;
  nav.style.display=open?'block':'none';
  if(window.lucide)window.lucide.createIcons();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initMore,{once:true});else initMore();
setTimeout(()=>{
  const source=document.getElementById('v7BankSource');
  if(source){const s=window.GABARITO_APP?.bankSource||'local';source.textContent=s.startsWith('supabase')?'Banco Supabase':'Banco local';}
},0);
})();
