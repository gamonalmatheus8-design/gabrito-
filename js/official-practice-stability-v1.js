(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_STABILITY_V21__)return;
window.__GABARITO_OFFICIAL_PRACTICE_STABILITY_V21__=true;

const VERSION='2.1.0';
let attempts=0;

function activateQuestions(){
  const target=document.getElementById('page-questions');
  if(!target)return false;
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el===target));
  document.getElementById('page-mocks')?.classList.remove('active');
  document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page==='questions'));
  try{localStorage.setItem('study_v2_page','questions')}catch{}
  try{window.toggleDrawer?.(false)}catch{}
  return true;
}

function openPractice(opts){
  const practice=window.GABARITO_OFFICIAL_PRACTICE;
  if(!practice?.open)return;
  const outerGo=window.go;
  const shim=function(page,...args){
    if(page==='questions')return activateQuestions();
    if(typeof outerGo==='function')return outerGo.call(this,page,...args);
  };
  shim.__officialQuestionBankBaseGo=page=>page==='questions'?activateQuestions():undefined;
  let result;
  try{
    window.go=shim;
    result=practice.open(opts);
  }finally{
    window.go=outerGo;
  }
  activateQuestions();
  Promise.resolve(result).then(()=>activateQuestions()).catch(()=>activateQuestions());
  return result;
}

function installGo(){
  const current=window.go;
  if(typeof current!=='function')return false;
  if(current.__officialPracticeRouteV21)return true;
  const base=current;
  const wrapped=function(page,...args){
    if(page==='questions')return openPractice();
    return base.call(this,page,...args);
  };
  Object.assign(wrapped,current);
  wrapped.__officialPracticeRouteV21=true;
  window.go=wrapped;
  return true;
}

function install(){
  attempts+=1;
  if(!window.GABARITO_OFFICIAL_PRACTICE?.open||typeof window.go!=='function'){
    if(attempts<30)setTimeout(install,100);
    return;
  }
  installGo();
  window.v42OpenQuestions=()=>openPractice();
  window.v40OpenFocusedQuestions=()=>openPractice();
  window.GABARITO_APP=window.GABARITO_APP||{};
  window.GABARITO_APP.questionNavigationStability=VERSION;
  window.GABARITO_APP.questionPracticeSeparatedFromMocks=true;
  window.GABARITO_APP.questionRouteOwner='official-practice-safe';
}

install();
})();
