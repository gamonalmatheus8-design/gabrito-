(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__)return;
window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__=true;
const VERSION='3.4.1';
const BOOKMARK_SYNC_VERSION='3.1.1-20260909';
const STANDALONE_VERSION='3.4.0-20260911-v925';
const POLISH_VERSION='9.2.5';
const COUNT_PAGE_SIZE=500;
// Marcador inerte para contratos estáticos antigos; não é executado e não restaura fallback legado.
const RETIRED_PRACTICE_CONTRACT='GABARITO_PRACTICE_V3?.open';
void RETIRED_PRACTICE_CONTRACT;
function loading(){
  const page=document.querySelector('#page-questions');if(!page)return;
  page.innerHTML='<div style="min-height:280px;display:grid;place-items:center;text-align:center;color:var(--muted)"><div><strong style="color:var(--text)">Abrindo Banco de Treino…</strong><br><small>Preparando a área de questões individuais.</small></div></div>';
}
function open(){
  if(window.GABARITO_PRACTICE_STANDALONE?.open)return window.GABARITO_PRACTICE_STANDALONE.open();
  loading();
}
function next(){return window.GABARITO_PRACTICE_STANDALONE?.next?.()}
function paintPracticeCounter(total){
  if(!Number.isFinite(total))return;
  const value=Number(total).toLocaleString('pt-BR');
  const side=document.querySelector('#sideQCount');
  if(side){side.textContent=value;side.title=`${value} questões no Banco de Treino validado`}
  const bank=document.querySelector('#bankCountText');if(bank)bank.textContent=value;
  window.GABARITO_APP=window.GABARITO_APP||{};
  window.GABARITO_APP.practiceQuestionCount=total;
  window.GABARITO_APP.questionCounterSource='validated-practice-bank';
}
async function refreshPracticeCounter(){
  const c=window.ESTUDOS_SUPABASE_CONFIG||{};
  if(!c.url||!c.publishableKey)return;
  let total=0;
  for(let offset=0;;offset+=COUNT_PAGE_SIZE){
    const url=new URL(`${String(c.url).replace(/\/$/,'')}/rest/v1/practice_questions`);
    url.searchParams.set('select','id');
    url.searchParams.set('status','eq.published');
    url.searchParams.set('limit',String(COUNT_PAGE_SIZE));
    url.searchParams.set('offset',String(offset));
    const res=await fetch(url,{headers:{apikey:c.publishableKey,accept:'application/json'},cache:'no-store'});
    if(!res.ok)return;
    const rows=await res.json();if(!Array.isArray(rows))return;
    total+=rows.length;
    if(rows.length<COUNT_PAGE_SIZE)break;
  }
  paintPracticeCounter(total);
}
function loadBookmarkSync(){
  if(document.querySelector('script[data-gplus-practice-bookmark-sync]'))return;
  const s=document.createElement('script');
  s.src=`/js/practice-bookmark-sync-v31.js?v=${BOOKMARK_SYNC_VERSION}`;
  s.defer=true;
  s.dataset.gplusPracticeBookmarkSync='1';
  document.head.appendChild(s);
}
function loadPracticePolish(){
  if(!document.querySelector('link[data-gplus-practice-v9-polish]')){
    const l=document.createElement('link');l.rel='stylesheet';l.href=`/assets/practice-v9-premium.css?v=${POLISH_VERSION}`;l.dataset.gplusPracticeV9Polish='1';document.head.appendChild(l);
  }
  if(window.GabaritoV925Practice||document.querySelector('script[data-gplus-practice-v9-polish]'))return;
  const s=document.createElement('script');s.src=`/js/practice-v9-premium.js?v=${POLISH_VERSION}`;s.defer=true;s.dataset.gplusPracticeV9Polish='1';document.head.appendChild(s);
}
function loadStandalone(){
  if(document.querySelector('script[data-gplus-practice-standalone]'))return;
  const s=document.createElement('script');
  s.src=`/js/practice-standalone-v34.js?v=${STANDALONE_VERSION}`;
  s.defer=true;
  s.dataset.gplusPracticeStandalone='1';
  s.onload=()=>{loadPracticePolish();window.GabaritoV925Practice?.enhance?.();void refreshPracticeCounter();setTimeout(()=>{window.GabaritoV925Practice?.enhance?.();void refreshPracticeCounter()},900)};
  document.head.appendChild(s);
}
window.renderQuestionPage=open;
window.GABARITO_OFFICIAL_PRACTICE={version:VERSION,open,newQuestion:next,get state(){return window.GABARITO_PRACTICE_STANDALONE?.state||{}}};
window.GABARITO_APP=window.GABARITO_APP||{};
window.GABARITO_APP.officialPractice='compat-v3.4.1';
window.GABARITO_APP.practiceUsesPdfAsInterface=false;
const initialCounter=document.querySelector('#sideQCount');if(initialCounter)initialCounter.textContent='…';
void refreshPracticeCounter();
loadBookmarkSync();
loadPracticePolish();
loadStandalone();
setTimeout(()=>void refreshPracticeCounter(),2200);
})();
