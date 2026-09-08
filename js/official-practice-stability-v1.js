(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_STABILITY_V1__)return;
window.__GABARITO_OFFICIAL_PRACTICE_STABILITY_V1__=true;

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function directGo(page){
  const target=document.getElementById(`page-${page}`);
  if(!target)return;
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el===target));
  document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
  if(page==='questions'){
    try{window.scrollTo({top:0,behavior:'auto'})}catch{window.scrollTo?.(0,0)}
  }
}

async function recoverQuestion(practice){
  for(let i=0;i<40;i++){
    if(practice.state?.current)return;
    const client=window.estudosSupabase||window.__ESTUDOS_SUPABASE?.client;
    const visible=document.getElementById('page-questions')?.classList.contains('active');
    if(client&&visible){
      try{await practice.newQuestion();if(practice.state?.current)return}catch{}
    }
    await wait(250);
  }
}

function install(){
  const practice=window.GABARITO_OFFICIAL_PRACTICE;
  if(!practice?.open){setTimeout(install,100);return}
  if(practice.open.__gplusStable)return;

  const originalOpen=practice.open;
  const stableOpen=function(opts){
    const outerGo=window.go;
    const shim=function(page){return directGo(page)};
    shim.__officialQuestionBankBaseGo=directGo;
    let result;
    try{
      window.go=shim;
      result=originalOpen.call(practice,opts);
    }finally{
      window.go=outerGo;
    }
    Promise.resolve(result).finally(()=>recoverQuestion(practice));
    return result;
  };
  stableOpen.__gplusStable=true;
  practice.open=stableOpen;
  window.v42OpenQuestions=()=>practice.open();
  window.v40OpenFocusedQuestions=()=>practice.open();

  window.GABARITO_APP=window.GABARITO_APP||{};
  window.GABARITO_APP.questionNavigationStability='1.0.0';
}

install();
})();
