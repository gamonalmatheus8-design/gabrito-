(function(){
'use strict';
const VERSION='2.9.0';
function apply(){const dark=document.body.classList.contains('dark'),meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',dark?'#0e121b':'#f6f7fb');document.documentElement.dataset.gplusPalette=VERSION}
function init(){apply();new MutationObserver(apply).observe(document.body,{attributes:true,attributeFilter:['class']});window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.palette=VERSION}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
