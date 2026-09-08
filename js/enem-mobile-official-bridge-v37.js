(function(){
'use strict';
if(window.__GABARITO_ENEM_MOBILE_OFFICIAL_BRIDGE_V37__)return;
window.__GABARITO_ENEM_MOBILE_OFFICIAL_BRIDGE_V37__=true;
const VERSION='3.7.0';
const timers=new Set();

function mobileEnhance(){
  try{window.GABARITO_ENEM_MOBILE?.enhance?.()}catch(e){console.warn('[Gabarito+] Cartão mobile ENEM:',e?.message||e)}
}
function schedule(delays=[100,220,420,700]){
  for(const delay of delays){
    const id=setTimeout(()=>{timers.delete(id);mobileEnhance()},delay);
    timers.add(id);
  }
}
function relevant(target){
  return target?.closest?.('[data-v27-start],[data-v27-resume],[data-v28-year][data-v28-day],[data-v28-resume]');
}
function onClick(event){if(relevant(event.target))schedule()}
function wrapOfficialApi(){
  const api=window.GABARITO_ENEM_OFFICIAL;
  if(!api||api.__mobileBridgeV37)return false;
  for(const name of ['start','resume']){
    const base=api[name];
    if(typeof base!=='function')continue;
    api[name]=function(...args){const result=base.apply(this,args);schedule();return result};
  }
  api.__mobileBridgeV37=true;
  return true;
}
function init(){
  document.addEventListener('click',onClick,true);
  wrapOfficialApi();
  // A API oficial já deve existir aqui; este retry curto cobre apenas ordem de scripts.
  setTimeout(wrapOfficialApi,120);
  setTimeout(wrapOfficialApi,320);
  window.GABARITO_APP=window.GABARITO_APP||{};
  window.GABARITO_APP.enemMobileOfficialBridge=VERSION;
  window.GABARITO_ENEM_MOBILE_OFFICIAL_BRIDGE={version:VERSION,enhance:mobileEnhance,schedule};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
