(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_NAV_V2__)return;
window.__GABARITO_OFFICIAL_PRACTICE_NAV_V2__=true;
const VERSION='2.0.0';
let attempts=0;

function loadRouteOwner(){
 if(document.querySelector('script[data-gplus-official-practice-stability]'))return;
 const s=document.createElement('script');
 s.src='/js/official-practice-stability-v1.js?v=2.0.0-20260908';
 s.defer=true;
 s.setAttribute('data-gplus-official-practice-stability','1');
 document.head.appendChild(s);
}

function install(){
 attempts+=1;
 const practice=window.GABARITO_OFFICIAL_PRACTICE;
 if(!practice?.open){if(attempts<80)setTimeout(install,100);return}
 loadRouteOwner();
 window.v42OpenQuestions=()=>window.GABARITO_OFFICIAL_PRACTICE?.open?.();
 window.v40OpenFocusedQuestions=()=>window.GABARITO_OFFICIAL_PRACTICE?.open?.();
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.questionNavigation='official-practice-v2';
 window.GABARITO_APP.questionPracticeSeparatedFromMocks=true;
}
window.addEventListener('gplus:ready',install);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.GABARITO_OFFICIAL_PRACTICE_NAV={version:VERSION,install};
})();
