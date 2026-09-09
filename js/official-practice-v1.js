(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__)return;
window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__=true;
const VERSION='3.2.0';
const BOOKMARK_SYNC_VERSION='3.1.1-20260909';
const FAST_RENDER_VERSION='3.2.0-20260909';
function open(){return window.GABARITO_PRACTICE_FAST_RENDER?.open?.()||window.GABARITO_PRACTICE_V3?.open?.()||window.go?.('questions')}
function next(){return window.GABARITO_PRACTICE_FAST_RENDER?.next?.()||window.GABARITO_PRACTICE_V3?.next?.()}
function loadBookmarkSync(){
  if(document.querySelector('script[data-gplus-practice-bookmark-sync]'))return;
  const s=document.createElement('script');
  s.src=`/js/practice-bookmark-sync-v31.js?v=${BOOKMARK_SYNC_VERSION}`;
  s.defer=true;
  s.dataset.gplusPracticeBookmarkSync='1';
  document.head.appendChild(s);
}
function loadFastRenderer(){
  if(document.querySelector('script[data-gplus-practice-fast-render]'))return;
  const s=document.createElement('script');
  s.src=`/js/practice-fast-render-v32.js?v=${FAST_RENDER_VERSION}`;
  s.defer=true;
  s.dataset.gplusPracticeFastRender='1';
  document.head.appendChild(s);
}
window.GABARITO_OFFICIAL_PRACTICE={version:VERSION,open,newQuestion:next,get state(){return window.GABARITO_PRACTICE_FAST_RENDER?.state||window.GABARITO_PRACTICE_V3?.state||{}}};
window.GABARITO_APP=window.GABARITO_APP||{};
window.GABARITO_APP.officialPractice='compat-v3.2.0';
loadBookmarkSync();
loadFastRenderer();
})();
