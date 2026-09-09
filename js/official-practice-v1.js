(function(){
'use strict';
if(window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__)return;
window.__GABARITO_OFFICIAL_PRACTICE_COMPAT_V3__=true;
const VERSION='3.0.0';
function open(){return window.GABARITO_PRACTICE_V3?.open?.()||window.go?.('questions')}
function next(){return window.GABARITO_PRACTICE_V3?.next?.()}
window.GABARITO_OFFICIAL_PRACTICE={version:VERSION,open,newQuestion:next,get state(){return window.GABARITO_PRACTICE_V3?.state||{}}};
window.GABARITO_APP=window.GABARITO_APP||{};
window.GABARITO_APP.officialPractice='compat-v3';
})();
