(function(){
'use strict';
let accountRole='student';
const roleLabels={student:'Estudante',teacher:'Professor',admin:'Administrador'};
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
function applyAccountRole(){
 const user=window.__ESTUDOS_SUPABASE?.user;
 if(!user)return;
 const el=document.getElementById('v5UserRole');
 if(el)el.textContent=roleLabels[accountRole]||'Estudante';
 document.documentElement.dataset.gplusAccountRole=accountRole;
}
async function refreshAccountRole(){
 const cloud=window.__ESTUDOS_SUPABASE,client=cloud?.client,user=cloud?.user;
 if(!client||!user)return;
 try{
  const {data,error}=await client.rpc('get_my_account_role');
  if(error)throw error;
  const next=String(data||'student').toLowerCase();
  accountRole=['student','teacher','admin'].includes(next)?next:'student';
  applyAccountRole();
  window.dispatchEvent(new CustomEvent('gplus:account-role',{detail:{role:accountRole}}));
 }catch(error){console.warn('[Gabarito+] papel da conta:',error?.message||error)}
}
function patchAccountModal(){
 const base=window.openV5Account;
 if(typeof base!=='function'||base.__gplusAccountRole)return;
 const wrapped=function(...args){const result=base.apply(this,args);setTimeout(()=>{applyAccountRole();void refreshAccountRole()},0);return result};
 wrapped.__gplusAccountRole=true;
 window.openV5Account=wrapped;
}
function initAccountRole(){
 patchAccountModal();
 void refreshAccountRole();
 setTimeout(patchAccountModal,250);
 setTimeout(()=>{patchAccountModal();void refreshAccountRole()},900);
 const client=window.__ESTUDOS_SUPABASE?.client;
 if(client&&!client.__gplusRoleListener){
  client.__gplusRoleListener=true;
  client.auth.onAuthStateChange(()=>setTimeout(()=>{patchAccountModal();void refreshAccountRole()},60));
 }
 window.GabaritoAccountRole={get role(){return accountRole},refresh:refreshAccountRole};
}
function initMore(){
 polishPublicShell();
 initAccountRole();
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
 initAccountRole();
 const source=document.getElementById('v7BankSource');
 if(source){
  const s=window.GABARITO_APP?.bankSource||'local';
  source.textContent=String(s).startsWith('supabase')?'Conteúdo atualizado':'Modo offline';
  source.title=String(s).startsWith('supabase')?'Seu banco de estudos está atualizado.':'O conteúdo essencial continua disponível neste dispositivo.';
  source.dataset.gplusReady='true';
 }
},0);
})();
