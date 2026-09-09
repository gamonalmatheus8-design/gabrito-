(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_STABILITY_V2__)return;
window.__GABARITO_OFFICIAL_PRACTICE_STABILITY_V2__=true;

const VERSION='2.0.0';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let installAttempts=0;
let wrappedGoBase=null;

function activateQuestions(){
  const target=document.getElementById('page-questions');
  if(!target)return false;
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el===target));
  const mocks=document.getElementById('page-mocks');
  mocks?.classList.remove('active');
  document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page==='questions'));
  try{localStorage.setItem('study_v2_page','questions')}catch{}
  try{window.toggleDrawer?.(false)}catch{}
  try{window.scrollTo({top:0,behavior:'auto'})}catch{window.scrollTo?.(0,0)}
  return true;
}

async function recoverQuestion(practice){
  activateQuestions();
  for(let i=0;i<24;i++){
    if(!document.getElementById('page-questions')?.classList.contains('active'))activateQuestions();
    if(practice.state?.current)return true;
    const client=window.estudosSupabase||window.__ESTUDOS_SUPABASE?.client;
    if(client){
      try{await practice.newQuestion();if(practice.state?.current){activateQuestions();return true}}catch{}
    }
    await wait(250);
  }
  activateQuestions();
  return false;
}

function openPractice(opts){
  const practice=window.GABARITO_OFFICIAL_PRACTICE;
  if(!practice?.__routeV2OriginalOpen)return;
  const outerGo=window.go;
  const shim=function(page,...args){
    if(page==='questions')return activateQuestions();
    if(typeof outerGo==='function')return outerGo.call(this,page,...args);
  };
  shim.__officialQuestionBankBaseGo=page=>page==='questions'?activateQuestions():undefined;
  let result;
  try{
    window.go=shim;
    result=practice.__routeV2OriginalOpen.call(practice,opts);
  }finally{
    window.go=outerGo;
  }
  activateQuestions();
  Promise.resolve(result).then(()=>activateQuestions()).finally(()=>recoverQuestion(practice));
  return result;
}

function installGo(){
  const current=window.go;
  if(typeof current!=='function')return;
  if(current.__officialPracticeRouteV2)return;
  wrappedGoBase=current;
  const wrapped=function(page,...args){
    if(page==='questions')return openPractice();
    return wrappedGoBase.call(this,page,...args);
  };
  Object.assign(wrapped,current);
  wrapped.__officialPracticeRouteV2=true;
  wrapped.__officialQuestionBankBaseGo=current.__officialQuestionBankBaseGo||current;
  window.go=wrapped;
}

function interceptQuestionClick(ev){
  const trigger=ev.target?.closest?.('[data-page="questions"]');
  if(!trigger)return;
  ev.preventDefault();
  ev.stopPropagation();
  ev.stopImmediatePropagation();
  openPractice();
}

function install(){
  installAttempts+=1;
  const practice=window.GABARITO_OFFICIAL_PRACTICE;
  if(!practice?.open){if(installAttempts<80)setTimeout(install,100);return}
  if(!practice.__routeV2OriginalOpen)practice.__routeV2OriginalOpen=practice.open;
  practice.open=openPractice;
  window.v42OpenQuestions=()=>openPractice();
  window.v40OpenFocusedQuestions=()=>openPractice();
  installGo();
  if(!window.__GABARITO_QUESTION_CLICK_CAPTURE_V2__){
    window.__GABARITO_QUESTION_CLICK_CAPTURE_V2__=true;
    document.addEventListener('click',interceptQuestionClick,true);
  }
  window.GABARITO_APP=window.GABARITO_APP||{};
  window.GABARITO_APP.questionNavigationStability=VERSION;
  window.GABARITO_APP.questionPracticeSeparatedFromMocks=true;
  window.GABARITO_APP.questionRouteOwner='official-practice-v2';
  [350,1200,3000].forEach(ms=>setTimeout(()=>{installGo();window.v42OpenQuestions=()=>openPractice();window.v40OpenFocusedQuestions=()=>openPractice()},ms));
}

install();
})();
