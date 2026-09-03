(function(){
'use strict';
const VERSION='3.3.0';
const $=(s,r=document)=>r.querySelector(s);
function hideLegacyDiscursives(){
 const moduleSelect=$('#discModule');
 const header=moduleSelect?.closest('.header-row');
 if(header){header.hidden=true;header.setAttribute('aria-hidden','true')}
 const list=$('#discursiveList');
 if(list){list.hidden=true;list.setAttribute('aria-hidden','true');list.innerHTML=''}
 if(typeof window.renderDiscursive==='function')window.renderDiscursive=function(){};
}
function ensureOfficialHosts(){
 const page=$('#page-mocks');if(!page)return;
 const anchor=$('.mock-cards',page)||$('#mockConfig',page)||page.firstElementChild;
 let enem=$('#v24EnemHub',page);
 if(!enem){
  enem=document.createElement('section');
  enem.id='v24EnemHub';
  enem.className='gplus-official-host gplus-enem-official-host';
  enem.setAttribute('aria-label','Provas oficiais do ENEM');
  anchor?page.insertBefore(enem,anchor):page.appendChild(enem);
 }
 let pism=$('#v25PismHub',page);
 if(!pism){
  pism=document.createElement('section');
  pism.id='v25PismHub';
  pism.className='gplus-official-host gplus-pism-official-host';
  pism.hidden=true;
  pism.setAttribute('aria-hidden','true');
  enem.insertAdjacentElement('afterend',pism);
 }
}
function init(){
 hideLegacyDiscursives();
 ensureOfficialHosts();
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.officialSimulatorsHost=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
