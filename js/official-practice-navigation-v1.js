(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_NAV_V1__)return;
window.__GABARITO_OFFICIAL_PRACTICE_NAV_V1__=true;
const VERSION='1.0.0';
let attempts=0;
function install(){
 attempts+=1;
 const practice=window.GABARITO_OFFICIAL_PRACTICE;
 const current=window.go;
 if(!practice?.open||typeof current!=='function'){if(attempts<80)setTimeout(install,100);return}
 if(current.__officialPracticeNavigation)return;
 const base=current.__officialQuestionBankBaseGo||current;
 const wrapped=function(page,...args){
  if(page==='questions')return practice.open();
  return base.call(this,page,...args);
 };
 Object.assign(wrapped,current);
 wrapped.__officialPracticeNavigation=true;
 wrapped.__officialQuestionBankBaseGo=base;
 window.go=wrapped;
 window.v42OpenQuestions=()=>practice.open();
 window.v40OpenFocusedQuestions=()=>practice.open();
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.questionNavigation='official-practice';
 window.GABARITO_APP.questionPracticeSeparatedFromMocks=true;
}
window.addEventListener('gplus:ready',install);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.GABARITO_OFFICIAL_PRACTICE_NAV={version:VERSION,install};
})();