(function(){
'use strict';
if(window.__GABARITO_TEACHER_CLASSROOM_LAYOUT_V1__)return;
window.__GABARITO_TEACHER_CLASSROOM_LAYOUT_V1__=true;
let timer=null;

function arrange(){
  const cards=document.querySelectorAll('#page-classrooms .gplus-classroom-card');
  for(const card of cards){
    const tabs=card.querySelector('.gplus-teacher-tabs');
    const list=card.querySelector('.gplus-teacher-assignment-list');
    const create=card.querySelector('.gplus-create-assignment');
    if(!tabs||!list||!create)continue;

    create.removeAttribute('open');
    const title=list.previousElementSibling;
    if(title?.classList.contains('gplus-list-title')&&title.textContent.trim().toLowerCase().includes('atividades')){
      const anchor=tabs.nextElementSibling;
      if(anchor&&title.previousElementSibling!==tabs){
        anchor.parentNode.insertBefore(title,anchor);
        anchor.parentNode.insertBefore(list,anchor);
      }
    }
  }
}

function schedule(delay=60){clearTimeout(timer);timer=setTimeout(arrange,delay)}
function init(){
  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.body,{childList:true,subtree:true});
  schedule(20);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
