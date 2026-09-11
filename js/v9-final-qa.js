/* Gabarito+ V9.2.2 — QA final e autorrecuperação */
(function(){
'use strict';
const VERSION='9.2.2';
const ACTIVE_KEY='study_v2_page';
const SETTINGS_KEY='study_v2_settings';
const MOCK_KEY='gplus_v92_mock_resume';
const ESSAY_STATE_KEY='gplus_v92_essay_state';
const ESSAY_DRAFT_KEY='study_essay_draft_v2';
const safe=(fn,fallback)=>{try{return fn()}catch(e){console.warn('[Gabarito+ Final QA]',e);return fallback}};

/* As camadas V9 observavam toda a subárvore da Home. O Lucide troca <i> por <svg>,
   o que podia disparar recalculações repetidas. Durante o boot, reduzimos esses observers
   à inserção/remoção de filhos diretos; depois restauramos o comportamento nativo. */
const nativeObserve=window.MutationObserver?.prototype?.observe;
let observePatched=false;
if(nativeObserve){
  observePatched=true;
  MutationObserver.prototype.observe=function(target,options){
    if(target?.id==='page-home'&&options?.childList&&options?.subtree){
      return nativeObserve.call(this,target,{...options,subtree:false});
    }
    return nativeObserve.call(this,target,options);
  };
  setTimeout(()=>{
    if(observePatched&&MutationObserver.prototype.observe!==nativeObserve){
      MutationObserver.prototype.observe=nativeObserve;
    }
    observePatched=false;
  },2500);
}

function readSettings(){
  return safe(()=>JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'),{})||{};
}
function pageNames(){
  return [...document.querySelectorAll('.page[id^="page-"]')].map(el=>el.id.slice(5));
}
function repairRoute(){
  const pages=pageNames();
  if(!pages.length)return false;
  const saved=localStorage.getItem(ACTIVE_KEY)||'home';
  const target=pages.includes(saved)?saved:'home';
  if(target!==saved)try{localStorage.setItem(ACTIVE_KEY,target)}catch{}
  const active=document.querySelector('.page.active');
  if(!active||!pages.includes(active.id.slice(5))){
    if(typeof window.go==='function')safe(()=>window.go(target));
    else document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id===`page-${target}`));
  }
  return true;
}
function syncA11y(){
  const main=document.querySelector('main');if(main&&!main.id)main.id='mainContent';
  const active=document.querySelector('.page.active')?.id?.replace(/^page-/,'')||localStorage.getItem(ACTIVE_KEY)||'home';
  document.querySelectorAll('[data-page]').forEach(el=>{
    if(el.dataset.page===active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
  });
  const focus=readSettings().focusExam==='PISM'?'PISM':'ENEM';
  document.querySelectorAll('.exam-switch [data-exam]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.exam===focus)));
  const qExam=document.getElementById('qExam')?.value||focus;
  document.querySelectorAll('[data-qexam-switch]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.getAttribute('data-qexam-switch')===qExam)));
  const more=document.getElementById('v42MoreToggle');if(more)more.setAttribute('aria-haspopup','true');
}
function syncMockSubjects(){
  const examEl=document.getElementById('mockExam'),moduleEl=document.getElementById('mockModule'),subjectEl=document.getElementById('mockSubject');
  if(!examEl||!moduleEl||!subjectEl)return;
  const exam=examEl.value==='PISM'?'PISM':'ENEM',module=moduleEl.value||'ALL';
  moduleEl.disabled=exam!=='PISM';
  const current=subjectEl.value||'ALL';
  const bank=safe(()=>window.QuestionBank?.getAll?.()||[],[]);
  const subjects=[...new Set(bank.filter(q=>q.exam===exam&&(exam!=='PISM'||module==='ALL'||q.module===module)).map(q=>q.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  subjectEl.innerHTML='<option value="ALL">Todas</option>'+subjects.map(s=>`<option value="${String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}">${String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');
  subjectEl.value=subjects.includes(current)?current:'ALL';
}
function bindMockFilters(){
  for(const id of ['mockExam','mockModule']){
    const el=document.getElementById(id);if(!el||el.dataset.v92QaBound)return;
    el.dataset.v92QaBound='1';el.addEventListener('change',syncMockSubjects);
  }
  syncMockSubjects();
}
function persistTransient(){
  /* pagehide/visibilitychange são mais confiáveis que beforeunload em navegadores móveis. */
  safe(()=>{
    if(typeof app!=='undefined'&&app?.mock){
      const copy=JSON.parse(JSON.stringify(app.mock));
      sessionStorage.setItem(MOCK_KEY,JSON.stringify({...copy,savedAt:Date.now()}));
    }
  });
  safe(()=>{
    const text=document.getElementById('essayText'),title=document.getElementById('essayTitle');
    if(!text||!title)return;
    const state={text:text.value,title:title.value,theme:document.getElementById('essayTheme')?.textContent||'',scores:[1,2,3,4,5].map(i=>Math.max(0,Math.min(200,Number(document.getElementById('essayC'+i)?.value)||0))),savedAt:Date.now()};
    localStorage.setItem(ESSAY_STATE_KEY,JSON.stringify(state));
    localStorage.setItem(ESSAY_DRAFT_KEY,state.text);
  });
}
function health(){
  const required=['page-home','page-questions','page-reviews','page-plan','page-mocks','page-essay','questionCard','reviewQueueList','weeklyPlan','mockConfig','essayText'];
  const missing=required.filter(id=>!document.getElementById(id));
  const pages=pageNames(),active=document.querySelector('.page.active')?.id?.replace(/^page-/,'')||null;
  const saved=localStorage.getItem(ACTIVE_KEY)||'home';
  return{version:VERSION,ok:missing.length===0&&!!active&&pages.includes(active),missing,active,savedRouteValid:pages.includes(saved),questions:safe(()=>window.QuestionBank?.getAll?.().length,0)||0};
}
function boot(){
  document.title='Gabarito+ V9 — ENEM & PISM';
  document.body.dataset.gplusVersion=VERSION;
  document.querySelectorAll('.ai-correction-card').forEach(el=>el.hidden=true);
  repairRoute();syncA11y();bindMockFilters();
  document.addEventListener('click',()=>setTimeout(()=>{repairRoute();syncA11y();},0),true);
  window.addEventListener('storage',()=>setTimeout(()=>{repairRoute();syncA11y();syncMockSubjects();},0));
  window.addEventListener('pagehide',persistTransient);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persistTransient();else{repairRoute();syncA11y()}});
  setTimeout(()=>{repairRoute();syncA11y();bindMockFilters();},500);
  setTimeout(()=>{repairRoute();syncA11y();bindMockFilters();const h=health();if(!h.ok)console.warn('[Gabarito+ Final QA] Health check:',h);},1800);
}
window.GabaritoV92Final={version:VERSION,health,repairRoute,syncMockSubjects,persistTransient};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
