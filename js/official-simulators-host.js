(function(){
'use strict';
const VERSION='3.3.1';
const DIRECT_SYNC_VERSION='3.3.1-20260905';
const $=(s,r=document)=>r.querySelector(s);

function hideLegacyDiscursives(){
 const moduleSelect=$('#discModule');
 const header=moduleSelect?.closest('.header-row');
 if(header){header.hidden=true;header.setAttribute('aria-hidden','true')}
 const list=$('#discursiveList');
 if(list){list.hidden=true;list.setAttribute('aria-hidden','true');list.innerHTML=''}
 if(typeof window.renderDiscursive==='function')window.renderDiscursive=function(){};
}

function ensureDirectExamSync(){
 if(!document.querySelector('link[data-gplus-direct-exam-sync]')){
   const l=document.createElement('link');
   l.rel='stylesheet';
   l.href=`/assets/enem-document-v32.css?v=${DIRECT_SYNC_VERSION}`;
   l.dataset.gplusDirectExamSync='1';
   document.head.appendChild(l);
 }
 if(!document.querySelector('script[data-gplus-direct-exam-sync]')){
   const s=document.createElement('script');
   s.src=`/js/enem-direct-sync-v33.js?v=${DIRECT_SYNC_VERSION}`;
   s.defer=true;
   s.dataset.gplusDirectExamSync='1';
   document.head.appendChild(s);
 }
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
 ensureDirectExamSync();
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.officialSimulatorsHost=VERSION;
 window.GABARITO_APP.directExamSyncRequested=DIRECT_SYNC_VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();