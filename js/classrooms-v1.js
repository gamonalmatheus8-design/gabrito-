(function(){
'use strict';
if(window.__GABARITO_CLASSROOMS_LOADER_V11__)return;
window.__GABARITO_CLASSROOMS_LOADER_V11__=true;

function load(src,attr,onload){
  const existing=document.querySelector(`script[${attr}]`);
  if(existing){if(onload)setTimeout(onload,0);return existing}
  const s=document.createElement('script');
  s.src=src;
  s.defer=true;
  s.setAttribute(attr,'1');
  if(onload)s.addEventListener('load',onload,{once:true});
  document.head.appendChild(s);
  return s;
}

load('/js/classrooms-core-v1.js?v=1.0.0','data-gplus-classrooms-core',()=>{
  load('/js/assignment-attachments-v1.js?v=1.0.0','data-gplus-assignment-attachments');
});
})();
