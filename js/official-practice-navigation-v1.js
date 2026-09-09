(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_NAV_V21__)return;
window.__GABARITO_OFFICIAL_PRACTICE_NAV_V21__=true;
const VERSION='2.1.0';
let attempts=0;

function install(){
 attempts+=1;
 const practice=window.GABARITO_OFFICIAL_PRACTICE;
 if(!practice?.open){if(attempts<80)setTimeout(install,100);return}
 window.v42OpenQuestions=()=>window.GABARITO_OFFICIAL_PRACTICE?.open?.();
 window.v40OpenFocusedQuestions=()=>window.GABARITO_OFFICIAL_PRACTICE?.open?.();
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.questionNavigation='official-practice-v2.1';
 window.GABARITO_APP.questionPracticeSeparatedFromMocks=true;
}
window.addEventListener('gplus:ready',install);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.GABARITO_OFFICIAL_PRACTICE_NAV={version:VERSION,install};
})();
