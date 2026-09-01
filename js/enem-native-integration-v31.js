(function(){
'use strict';
const VERSION='3.1.0';
const SESSION_KEY='gplus_enem_official_v27';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
let timer=null,lastSignature='',observer=null;

function session(){return parse(localStorage.getItem(SESSION_KEY),null)}
function persist(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function native(){return window.GABARITO_ENEM_NATIVE}
function signature(s){return s?[s.year,s.day,s.language||'',s.current,JSON.stringify(s.answers||{}),JSON.stringify(s.marked||[])].join('|'):''}
function clickQuestion(q){const b=$(`#v27Sheet [data-q="${Number(q)}"]`);if(!b)return false;b.click();return true}
function choose(q,letter){
 const s=session();if(!s)return;
 if(Number(s.current)!==Number(q))clickQuestion(q);
 const b=$(`#v27Sheet [data-letter="${String(letter)}"]`);if(b)b.click();
 schedule();
}
function navigate(q){if(clickQuestion(q))schedule()}
function toggleReview(q){
 const s=session();if(!s)return;
 const current=new Set((s.marked||[]).map(Number)),n=Number(q);
 current.has(n)?current.delete(n):current.add(n);
 s.marked=Array.from(current).sort((a,b)=>a-b);persist(s);lastSignature='';schedule();
 window.GABARITO_ENEM_MOBILE?.enhance?.();
}
function decorateMarked(s){
 const marks=new Set((s?.marked||[]).map(Number));
 $$(`#v27Sheet [data-q]`).forEach(b=>{const on=marks.has(Number(b.dataset.q));if(b.classList.contains('marked')!==on)b.classList.toggle('marked',on);b.setAttribute('aria-label',(b.getAttribute('aria-label')||`Questão ${b.dataset.q}`).replace(/, marcada para revisão$/,'')+(on?', marcada para revisão':''))});
 $$('#v30EnemSheetPanel [data-v30-q]').forEach(b=>{const on=marks.has(Number(b.dataset.v30Q));if(b.classList.contains('marked')!==on)b.classList.toggle('marked',on)});
}
function mountNative(runner,paper,s){
 const api=native();if(!api)return false;
 const status=api.validateAttempt({year:s.year,day:s.day,language:s.language});
 runner.dataset.v31NativeReady=String(status.complete);
 if(!status.complete)return false;
 if(paper.dataset.v31Native!=='true'){
  paper.dataset.v31Native='true';paper.classList.add('v31-native-paper');
  paper.innerHTML=`<div class="v27-paper-toolbar"><b>Prova oficial · modo nativo</b><span class="v31-native-badge">90 questões no app</span></div><div id="v31NativeMount" class="v31-native-mount"></div>`;
  lastSignature='';
 }
 const mount=$('#v31NativeMount',paper);if(!mount)return false;
 const sig=signature(s);
 if(!mount.dataset.v31Mounted){
  api.mount({host:mount,getSession:session,pdfUrl:s.pdf,onAnswer:choose,onNavigate:navigate,onToggleReview:toggleReview});
  mount.dataset.v31Mounted='true';lastSignature=sig;
 }else if(lastSignature!==sig){api.sync(s);lastSignature=sig}
 return true;
}
function enhance(){
 const runner=$('#v27OfficialRunner'),s=session();
 if(!runner||!s||s.status!=='active'){lastSignature='';return}
 const paper=$('.v27-paper',runner);if(!paper)return;
 decorateMarked(s);
 if(mountNative(runner,paper,s))decorateMarked(session()||s);
 window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.enemNativeIntegration=VERSION;
}
function schedule(){clearTimeout(timer);timer=setTimeout(enhance,45)}
function boot(){
 observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});
 window.addEventListener('storage',e=>{if(e.key===SESSION_KEY)schedule()});
 setTimeout(enhance,500);
 window.GABARITO_ENEM_NATIVE_INTEGRATION={version:VERSION,enhance,toggleReview};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
