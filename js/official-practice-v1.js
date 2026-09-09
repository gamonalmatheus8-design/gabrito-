(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__)return;
window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__=true;
const VERSION='3.0.1';
const BOOKMARK_SYNC_VERSION='3.1.0-20260909';
function open(){return window.GABARITO_PRACTICE_V3?.open?.()||window.go?.('questions')}
function next(){return window.GABARITO_PRACTICE_V3?.next?.()}
function loadBookmarkSync(){
  if(document.querySelector('script[data-gplus-practice-bookmark-sync]'))return;
  const s=document.createElement('script');
  s.src=`/js/practice-bookmark-sync-v31.js?v=${BOOKMARK_SYNC_VERSION}`;
  s.defer=true;
  s.dataset.gplusPracticeBookmarkSync='1';
  document.head.appendChild(s);
}
window.GABARITO_OFFICIAL_PRACTICE={version:VERSION,open,newQuestion:next,get state(){return window.GABARITO_PRACTICE_V3?.state||{}}};
window.GABARITO_APP=window.GABARITO_APP||{};
window.GABARITO_APP.officialPractice='compat-v3.0.1';
loadBookmarkSync();
})();
