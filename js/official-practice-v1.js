(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__)return;
window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__=true;
const VERSION='3.3.1';
const BOOKMARK_SYNC_VERSION='3.1.1-20260909';
const STANDALONE_VERSION='3.3.0-20260909';
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
function loadBookmarkSync(){
  if(document.querySelector('script[data-gplus-practice-bookmark-sync]'))return;
  const s=document.createElement('script');
  s.src=`/js/practice-bookmark-sync-v31.js?v=${BOOKMARK_SYNC_VERSION}`;
  s.defer=true;
  s.dataset.gplusPracticeBookmarkSync='1';
  document.head.appendChild(s);
}
function loadStandalone(){
  if(document.querySelector('script[data-gplus-practice-standalone]'))return;
  const s=document.createElement('script');
  s.src=`/js/practice-standalone-v33.js?v=${STANDALONE_VERSION}`;
  s.defer=true;
  s.dataset.gplusPracticeStandalone='1';
  document.head.appendChild(s);
}
window.renderQuestionPage=open;
window.GABARITO_OFFICIAL_PRACTICE={version:VERSION,open,newQuestion:next,get state(){return window.GABARITO_PRACTICE_STANDALONE?.state||{}}};
window.GABARITO_APP=window.GABARITO_APP||{};
window.GABARITO_APP.officialPractice='compat-v3.3.1';
window.GABARITO_APP.practiceUsesPdfAsInterface=false;
loadBookmarkSync();
loadStandalone();
})();