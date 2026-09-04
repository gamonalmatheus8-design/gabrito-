(function(){
'use strict';
if(window.__GABARITO_CLASSROOMS_LOADER_V18__)return;
window.__GABARITO_CLASSROOMS_LOADER_V18__=true;

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

load('/js/classrooms-core-v1.js?v=1.0.1','data-gplus-classrooms-core',()=>{
  load('/js/student-classroom-mode-v1.js?v=1.0.1','data-gplus-student-classroom-mode');
  load('/js/student-join-rpc-v1.js?v=1.0.1','data-gplus-student-join-rpc');
  load('/js/assignment-attachments-v1.js?v=1.0.2','data-gplus-assignment-attachments');
  load('/js/assignment-actions-v2.js?v=2.0.1','data-gplus-assignment-actions');
  load('/js/teacher-submissions-v1.js?v=1.0.1','data-gplus-teacher-submissions');
  load('/js/teacher-activity-stats-v1.js?v=1.0.1','data-gplus-teacher-activity-stats');
  load('/js/teacher-performance-direct-v1.js?v=1.0.0','data-gplus-teacher-performance-direct');
});
})();
