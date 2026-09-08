(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_QUESTION_BANK_V1__)return;
window.__GABARITO_OFFICIAL_QUESTION_BANK_V1__=true;

const VERSION='1.0.0';
const $=(s,r=document)=>r.querySelector(s);
let active=false;
let token=0;
let originalGo=null;
let originalSetFocusExam=null;

function currentExam(){
 const explicit=String(window.app?.settings?.focusExam||'').toUpperCase();
 if(explicit==='PISM'||explicit==='ENEM')return explicit;
 const button=$('.exam-switch button.active');
 return button?.dataset?.exam==='PISM'?'PISM':'ENEM';
}

function installStyles(){
 if($('#gplusOfficialBankStyle'))return;
 const style=document.createElement('style');
 style.id='gplusOfficialBankStyle';
 style.textContent=`
  .gplus-official-bank-intro{margin-bottom:18px;padding:22px;border:1px solid var(--border);border-radius:20px;background:var(--card);display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:var(--shadow-sm)}
  .gplus-official-bank-copy{min-width:0}.gplus-official-bank-copy span{display:inline-flex;font-size:11px;font-weight:800;letter-spacing:.12em;color:var(--primary);margin-bottom:7px}.gplus-official-bank-copy h1{font-size:clamp(22px,3vw,34px);margin:0 0 7px}.gplus-official-bank-copy p{margin:0;color:var(--muted);max-width:760px;line-height:1.55}
  .gplus-official-bank-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.gplus-official-bank-actions button{white-space:nowrap}
  .gplus-official-bank-exam.active{background:var(--primary);border-color:var(--primary);color:#fff}
  .gplus-official-bank-trust{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.gplus-official-bank-trust b{font-size:12px;border:1px solid var(--border);border-radius:999px;padding:6px 9px;font-weight:700;background:var(--surface-2,rgba(127,127,127,.06))}
  .gplus-official-bank-status{margin-top:10px;font-size:12px;color:var(--muted)}
  #page-mocks.enem-exam-active #gplusOfficialBankIntro,#page-mocks.pism-exam-active #gplusOfficialBankIntro{display:none!important}
  body.gplus-official-bank-mode [data-page="questions"]{font-weight:800}
  @media(max-width:760px){.gplus-official-bank-intro{align-items:flex-start;flex-direction:column;padding:17px}.gplus-official-bank-actions{justify-content:flex-start;width:100%}.gplus-official-bank-actions .btn{flex:1}.gplus-official-bank-copy h1{font-size:24px}}
 `;
 document.head.appendChild(style);
}

function hideNode(el){
 if(!el||el.id==='gplusOfficialBankIntro'||el.dataset.gplusBankHidden==='1')return;
 el.dataset.gplusBankHidden='1';
 el.dataset.gplusBankDisplay=el.style.display||'';
 el.style.display='none';
}

function restoreHidden(){
 document.querySelectorAll('[data-gplus-bank-hidden="1"]').forEach(el=>{
  el.style.display=el.dataset.gplusBankDisplay||'';
  delete el.dataset.gplusBankHidden;
  delete el.dataset.gplusBankDisplay;
 });
}

function isolate(target){
 const page=$('#page-mocks');
 if(!page||!target)return;
 restoreHidden();
 let node=target;
 while(node&&node!==page){
  const parent=node.parentElement;
  if(!parent)break;
  Array.from(parent.children).forEach(child=>{if(child!==node&&child.id!=='gplusOfficialBankIntro')hideNode(child)});
  node=parent;
 }
}

function markQuestionNav(){
 document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page==='questions'));
 const count=$('#sideQCount');
 if(count){count.textContent='OFICIAL';count.title='Somente provas oficiais INEP e UFJF/COPESE'}
 const source=$('#v7BankSource');
 if(source)source.textContent='Banco oficial · INEP / UFJF';
}

function introMarkup(exam,status='Carregando biblioteca oficial…'){
 return `<div class="gplus-official-bank-copy"><span>BANCO OFICIAL · SEM QUESTÕES AUTORAIS</span><h1>Questões reais de ENEM e PISM.</h1><p>Esta área usa exclusivamente cadernos de provas que realmente foram aplicados. Selecione uma edição e depois navegue pelo número da questão no cartão-resposta.</p><div class="gplus-official-bank-trust"><b>ENEM · INEP · 2016–2025</b><b>PISM · UFJF/COPESE · 2017–2026</b><b>gabarito oficial após entrega</b></div><div class="gplus-official-bank-status" id="gplusOfficialBankStatus">${status}</div></div><div class="gplus-official-bank-actions"><button type="button" class="btn btn-secondary gplus-official-bank-exam ${exam==='ENEM'?'active':''}" data-gplus-bank-exam="ENEM">ENEM</button><button type="button" class="btn btn-secondary gplus-official-bank-exam ${exam==='PISM'?'active':''}" data-gplus-bank-exam="PISM">PISM</button><button type="button" class="btn btn-ghost" data-gplus-bank-sim>Simulados</button></div>`;
}

function renderIntro(exam,status){
 const page=$('#page-mocks');
 if(!page)return null;
 let intro=$('#gplusOfficialBankIntro');
 if(!intro){intro=document.createElement('section');intro.id='gplusOfficialBankIntro';intro.className='gplus-official-bank-intro card';page.insertBefore(intro,page.firstChild)}
 intro.innerHTML=introMarkup(exam,status);
 intro.querySelectorAll('[data-gplus-bank-exam]').forEach(btn=>btn.addEventListener('click',()=>switchExam(btn.dataset.gplusBankExam)));
 intro.querySelector('[data-gplus-bank-sim]')?.addEventListener('click',()=>{
  exitBank();
  if(typeof originalGo==='function')originalGo('mocks');
 });
 return intro;
}

function setStatus(text){const el=$('#gplusOfficialBankStatus');if(el)el.textContent=text}

async function waitForTarget(exam,myToken){
 const selector=exam==='PISM'?'#v29PismOfficialHub':'#v28HistoryLibrary';
 const deadline=Date.now()+16000;
 while(Date.now()<deadline){
  if(myToken!==token||!active)return null;
  let target=$(selector);
  if(target)return target;
  if(exam==='ENEM')window.GABARITO_ENEM_HISTORY?.enhance?.();
  await new Promise(resolve=>setTimeout(resolve,180));
 }
 return null;
}

async function openBank(exam=currentExam()){
 exam=exam==='PISM'?'PISM':'ENEM';
 active=true;
 token+=1;
 const myToken=token;
 installStyles();
 document.body.classList.add('gplus-official-bank-mode');
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.questionBankMode='official_v2';
 window.GABARITO_APP.questionPracticeSource='official-exams-only';
 window.GABARITO_APP.authorialQuestionPractice=false;
 if(typeof originalGo==='function')originalGo('mocks');
 markQuestionNav();
 renderIntro(exam,'Carregando biblioteca oficial…');
 const target=await waitForTarget(exam,myToken);
 if(myToken!==token||!active)return;
 if(!target){
  setStatus('Não foi possível carregar a biblioteca oficial. Tente novamente ou abra Simulados.');
  return;
 }
 isolate(target);
 renderIntro(exam,exam==='ENEM'?'Pronto: escolha um ano e um dia do ENEM.':'Pronto: escolha módulo, área, ano e dia do PISM.');
 markQuestionNav();
 setTimeout(()=>{if(active&&target.isConnected)target.scrollIntoView({block:'start',behavior:'auto'})},80);
 if(window.lucide)window.lucide.createIcons();
}

function exitBank(){
 if(!active)return;
 active=false;
 token+=1;
 restoreHidden();
 $('#gplusOfficialBankIntro')?.remove();
 document.body.classList.remove('gplus-official-bank-mode');
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.questionBankVisible=false;
}

function switchExam(exam){
 if(exam!=='ENEM'&&exam!=='PISM')return;
 if(typeof originalSetFocusExam==='function')originalSetFocusExam(exam);
 openBank(exam);
}

function installNavigation(){
 if(typeof window.go!=='function')return false;
 if(window.go.__officialQuestionBankV1)return true;
 originalGo=window.go;
 const wrapped=function(page,...args){
  if(page==='questions')return openBank();
  if(active)exitBank();
  return originalGo.call(this,page,...args);
 };
 Object.assign(wrapped,originalGo);
 wrapped.__officialQuestionBankV1=true;
 window.go=wrapped;

 originalSetFocusExam=typeof window.setFocusExam==='function'?window.setFocusExam:null;
 if(originalSetFocusExam&&!originalSetFocusExam.__officialQuestionBankV1){
  const setExam=function(exam,...args){
   const result=originalSetFocusExam.call(this,exam,...args);
   if(active)setTimeout(()=>openBank(exam),0);
   return result;
  };
  setExam.__officialQuestionBankV1=true;
  window.setFocusExam=setExam;
 }
 window.v42OpenQuestions=()=>openBank();
 window.v40OpenFocusedQuestions=()=>openBank();
 return true;
}

function init(){
 installStyles();
 installNavigation();
 window.GABARITO_APP=window.GABARITO_APP||{};
 window.GABARITO_APP.officialQuestionBank=VERSION;
 window.GABARITO_APP.questionBankMode='official_v2';
 window.GABARITO_APP.questionPracticeSource='official-exams-only';
 window.GABARITO_APP.authorialQuestionPractice=false;
 const count=$('#sideQCount');if(count)count.textContent='OFICIAL';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
