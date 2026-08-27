(function(){
'use strict';

function text(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function hideIncompleteAI(){
  document.querySelectorAll('button,a,.btn').forEach(el=>{
    const t=(el.textContent||'').toLowerCase();
    if((t.includes('correção')||t.includes('corrigir'))&&t.includes('ia')) el.classList.add('gplus-unavailable-feature');
  });
  document.querySelectorAll('p,small,span,div').forEach(el=>{
    const t=(el.textContent||'').trim().toLowerCase();
    if(t&&t.length<180&&t.includes('api')&&(t.includes('configur')||t.includes('correção'))) el.classList.add('gplus-unavailable-feature');
  });
}
function simplifyNavigation(){
  document.getElementById('adminLink')?.remove();
  const foot=document.querySelector('.sidebar-foot');
  if(foot){
    foot.classList.add('gplus-status');
    const strong=foot.querySelector('strong'); if(strong) strong.textContent='Gabarito+';
    const status=foot.querySelector('p'); if(status) status.textContent='Progresso salvo';
  }
}
function simplifyAccountCopy(){
  text('v5AccountTitle','Sua conta');
  const onboardingBrand=document.querySelector('.v37-onboarding-brand span');
  if(onboardingBrand) onboardingBrand.textContent='Seu progresso acompanha você em qualquer dispositivo';
  const syncStatus=document.getElementById('v5SyncStatus');
  if(syncStatus&&syncStatus.textContent.trim()==='Local') syncStatus.textContent='Neste dispositivo';
}
function updateHome(){
  const home=document.getElementById('page-home');
  if(!home)return;
  home.classList.add('gplus-home-simplified');
  const stats=typeof totalQStats==='function'?totalQStats():{answered:0};
  const zero=!stats.answered;
  const shell=document.getElementById('v39Home');
  shell?.classList.toggle('gplus-zero-state',zero);
  if(zero){
    text('v39MainTitle','Descubra seu nível em 10 questões.');
    text('v39MainText','O Gabarito+ usa seu primeiro diagnóstico para indicar onde você pode ganhar mais pontos.');
    const btn=document.getElementById('v39PrimaryBtn');
    if(btn){btn.innerHTML='<i data-lucide="play" class="icon"></i>Fazer diagnóstico';btn.onclick=()=>{if(typeof v40OpenFocusedQuestions==='function')v40OpenFocusedQuestions();else if(typeof go==='function')go('questions')}}
  }else{
    text('v39MainTitle','Sua próxima melhor ação.');
    text('v39MainText','Use o Radar de Aprovação e comece pelo ponto com maior retorno agora.');
  }
  if(window.lucide)window.lucide.createIcons();
}
function polish(){
  document.title='Gabarito+ | ENEM e PISM';
  simplifyNavigation();
  simplifyAccountCopy();
  updateHome();
  hideIncompleteAI();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish,{once:true});else polish();
setTimeout(polish,400);
setTimeout(polish,1600);
const observer=new MutationObserver(()=>hideIncompleteAI());
observer.observe(document.documentElement,{childList:true,subtree:true});
})();
