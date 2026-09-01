(function(){
'use strict';
const VERSION='3.0.0';
const AUTHORIAL_KEY='gplus_enem_exam_v24';
const OFFICIAL_KEY='gplus_enem_official_v27';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isMobile=()=>window.matchMedia('(max-width: 900px)').matches;
let panelOpen=false;
let range=0;
let enhanceTimer=null;
let observer=null;
let lastFocus=null;

function authorial(){return parse(localStorage.getItem(AUTHORIAL_KEY),null)}
function official(){return parse(localStorage.getItem(OFFICIAL_KEY),null)}
function visible(el){return Boolean(el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none')}
function mode(){
 if(!isMobile())return null;
 const off=$('#v27OfficialRunner');
 if(visible(off)&&$('.v27-workspace',off)&&official()?.status==='active')return'official';
 const aut=$('#v24EnemRunner');
 if(visible(aut)&&$('.v24-exam-body',aut)&&authorial()?.status==='active')return'authorial';
 return null;
}
function state(kind){return kind==='official'?official():authorial()}
function currentNumber(kind,s){return kind==='official'?Number(s.current||1):Number(s.index||0)+1}
function selectedLetter(kind,s){
 const q=currentNumber(kind,s);
 if(kind==='official')return String(s.answers?.[String(q)]||'');
 const id=s.ids?.[q-1],value=s.selections?.[id];
 return Number.isInteger(value)?String.fromCharCode(65+value):'';
}
function answeredCount(kind,s){return kind==='official'?Object.keys(s.answers||{}).length:Object.keys(s.selections||{}).length}
function markedCount(kind,s){return kind==='authorial'?(s.marked||[]).length:0}
function isMarked(s,q){return kindId(s,q)&&new Set((s.marked||[]).map(String)).has(kindId(s,q))}
function kindId(s,q){return s?.ids?.[q-1]?String(s.ids[q-1]):''}
function letterButton(kind,letter,selected){return`<button type="button" class="v30-letter ${selected===letter?'selected':''}" data-v30-letter="${letter}" aria-label="Marcar alternativa ${letter}" aria-pressed="${selected===letter}">${letter}</button>`}

function ensureShell(){
 let dock=$('#v30EnemDock');
 if(!dock){dock=document.createElement('div');dock.id='v30EnemDock';dock.className='v30-dock';dock.setAttribute('aria-live','polite');document.body.appendChild(dock)}
 let backdrop=$('#v30EnemSheetBackdrop');
 if(!backdrop){backdrop=document.createElement('button');backdrop.type='button';backdrop.id='v30EnemSheetBackdrop';backdrop.className='v30-backdrop';backdrop.setAttribute('aria-label','Fechar cartão-resposta');document.body.appendChild(backdrop);backdrop.addEventListener('click',closePanel)}
 let panel=$('#v30EnemSheetPanel');
 if(!panel){panel=document.createElement('section');panel.id='v30EnemSheetPanel';panel.className='v30-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Cartão-resposta do ENEM');document.body.appendChild(panel)}
 return{dock,backdrop,panel};
}
function clearShell(){
 const {dock,backdrop,panel}=ensureShell();
 dock.classList.remove('show','official');dock.innerHTML='';
 backdrop.classList.remove('show');panel.classList.remove('show');panel.innerHTML='';
 document.body.classList.remove('v30-sheet-open','v30-enem-mobile-active');
 panelOpen=false;
}
function trigger(selector,kind){
 const root=kind==='official'?$('#v27OfficialRunner'):$('#v24EnemRunner');
 const el=$(selector,root||document);if(!el)return false;el.click();return true;
}
function afterNav(kind){
 closePanel();
 setTimeout(()=>{
  enhance();
  if(kind==='authorial')$('.v24-paper-head')?.scrollIntoView({behavior:'smooth',block:'start'});
 },80);
}
function goQuestion(kind,q){
 if(kind==='official'){
  const button=$(`#v27Sheet [data-q="${q}"]`);if(button)button.click();
 }else{
  const button=$(`#v24EnemRunner .v24-sheet [data-jump="${q-1}"]`);if(button)button.click();
 }
 afterNav(kind);
}
function chooseOfficial(letter){
 const button=$(`#v27Sheet [data-letter="${letter}"]`);if(button)button.click();
 setTimeout(enhance,30);
}
function previous(kind){
 const s=state(kind);if(!s)return;
 if(kind==='authorial'){trigger('[data-prev]',kind);setTimeout(()=>afterNav(kind),20);return}
 const q=Math.max(s.day===1?1:91,Number(s.current)-1);const button=$(`#v27Sheet [data-q="${q}"]`);button?.click();setTimeout(enhance,30);
}
function next(kind){
 const s=state(kind);if(!s)return;
 if(kind==='authorial'){trigger('[data-next]',kind);setTimeout(()=>afterNav(kind),20);return}
 const q=Math.min(s.day===1?90:180,Number(s.current)+1);const button=$(`#v27Sheet [data-q="${q}"]`);button?.click();setTimeout(enhance,30);
}
function toggleMark(){trigger('[data-mark]','authorial');setTimeout(enhance,30)}
function openPanel(){
 const kind=mode(),s=state(kind);if(!kind||!s)return;
 lastFocus=document.activeElement;
 const q=currentNumber(kind,s),relative=kind==='official'&&s.day===2?q-90:q;
 range=relative>45?1:0;
 panelOpen=true;
 renderPanel(kind,s);
 const {backdrop,panel}=ensureShell();
 backdrop.classList.add('show');panel.classList.add('show');document.body.classList.add('v30-sheet-open');
 setTimeout(()=>$('.v30-close',panel)?.focus(),20);
}
function closePanel(){
 panelOpen=false;
 const {backdrop,panel}=ensureShell();backdrop.classList.remove('show');panel.classList.remove('show');document.body.classList.remove('v30-sheet-open');
 if(lastFocus&&lastFocus.isConnected)lastFocus.focus({preventScroll:true});
}
function panelQuestions(kind,s){
 const absoluteStart=kind==='official'&&s.day===2?91:1;
 const start=absoluteStart+(range?45:0),end=start+44;
 const current=currentNumber(kind,s);
 let html='';
 for(let q=start;q<=end;q++){
  const relative=kind==='official'?q:q;
  let answered=false,marked=false,letter='';
  if(kind==='official'){letter=String(s.answers?.[String(q)]||'');answered=Boolean(letter)}
  else{const id=s.ids?.[q-1];const v=s.selections?.[id];answered=Number.isInteger(v);letter=answered?String.fromCharCode(65+v):'';marked=new Set((s.marked||[]).map(String)).has(String(id))}
  html+=`<button type="button" class="v30-q ${answered?'answered ':''}${marked?'marked ':''}${current===relative?'current':''}" data-v30-q="${relative}" aria-label="Questão ${relative}${letter?`, alternativa ${letter}`:''}${marked?', marcada para revisão':''}"><span>${relative}</span>${letter?`<b>${letter}</b>`:''}</button>`;
 }
 return html;
}
function renderPanel(kind,s){
 const {panel}=ensureShell();
 const answered=answeredCount(kind,s),marked=markedCount(kind,s),q=currentNumber(kind,s),selected=selectedLetter(kind,s);
 const base=kind==='official'&&s.day===2?90:0;
 const firstLabel=`${base+1}–${base+45}`,secondLabel=`${base+46}–${base+90}`;
 const area1=s.day===1?'Linguagens':'Natureza',area2=s.day===1?'Humanas':'Matemática';
 panel.innerHTML=`<div class="v30-panel-grip" aria-hidden="true"></div><div class="v30-panel-head"><div><span>Cartão-resposta</span><h3>ENEM · Dia ${s.day}</h3></div><button type="button" class="v30-close" data-v30-close aria-label="Fechar cartão-resposta">×</button></div><div class="v30-summary"><div><b>${answered}/90</b><span>respondidas</span></div><div><b>${90-answered}</b><span>em branco</span></div>${kind==='authorial'?`<div><b>${marked}</b><span>revisar</span></div>`:`<div><b>Q${q}</b><span>${selected?`marcada ${selected}`:'sem resposta'}</span></div>`}</div>${kind==='official'?`<div class="v30-panel-picker"><span>Questão ${q}</span><div>${['A','B','C','D','E'].map(l=>letterButton(kind,l,selected)).join('')}</div></div>`:''}<div class="v30-range-tabs"><button type="button" class="${range===0?'active':''}" data-v30-range="0"><b>${area1}</b><span>${firstLabel}</span></button><button type="button" class="${range===1?'active':''}" data-v30-range="1"><b>${area2}</b><span>${secondLabel}</span></button></div><div class="v30-question-grid">${panelQuestions(kind,s)}</div><div class="v30-legend"><span><i></i>em branco</span><span><i class="answered"></i>respondida</span>${kind==='authorial'?'<span><i class="marked"></i>revisar</span>':''}</div><div class="v30-panel-actions">${kind==='authorial'?`<button type="button" class="btn btn-secondary" data-v30-mark>${isMarked(s,q)?'Remover revisão':'Marcar para revisão'}</button>${s.day===1?'<button type="button" class="btn btn-secondary" data-v30-essay>Redação</button>':''}`:''}<button type="button" class="btn btn-secondary" data-v30-exit>Salvar e sair</button><button type="button" class="btn btn-primary" data-v30-finish>Entregar prova</button></div>`;
 $('[data-v30-close]',panel)?.addEventListener('click',closePanel);
 $$('[data-v30-range]',panel).forEach(b=>b.addEventListener('click',()=>{range=Number(b.dataset.v30Range);renderPanel(kind,state(kind)||s)}));
 $$('[data-v30-q]',panel).forEach(b=>b.addEventListener('click',()=>goQuestion(kind,Number(b.dataset.v30Q))));
 $$('[data-v30-letter]',panel).forEach(b=>b.addEventListener('click',()=>{chooseOfficial(b.dataset.v30Letter);setTimeout(()=>{const fresh=state(kind);if(fresh)renderPanel(kind,fresh)},40)}));
 $('[data-v30-mark]',panel)?.addEventListener('click',()=>{toggleMark();setTimeout(()=>{const fresh=state(kind);if(fresh)renderPanel(kind,fresh)},50)});
 $('[data-v30-essay]',panel)?.addEventListener('click',()=>{closePanel();trigger('[data-essay]','authorial')});
 $('[data-v30-exit]',panel)?.addEventListener('click',()=>{closePanel();trigger(kind==='official'?'[data-v27-exit]':'[data-exit]',kind)});
 $('[data-v30-finish]',panel)?.addEventListener('click',()=>{closePanel();trigger(kind==='official'?'[data-v27-finish]':'[data-finish]',kind)});
}
function renderDock(kind,s){
 const {dock}=ensureShell();
 const q=currentNumber(kind,s),selected=selectedLetter(kind,s),answered=answeredCount(kind,s),marked=kind==='authorial'&&isMarked(s,q);
 const min=kind==='official'&&s.day===2?91:1,max=kind==='official'&&s.day===2?180:90;
 dock.classList.toggle('official',kind==='official');dock.classList.add('show');
 const quick=kind==='official'?`<div class="v30-quick-row"><div class="v30-quick-label"><span>Q${q}</span><b>${selected||'—'}</b></div><div class="v30-quick-letters">${['A','B','C','D','E'].map(l=>letterButton(kind,l,selected)).join('')}</div></div>`:'';
 dock.innerHTML=`${quick}<div class="v30-nav-row"><button type="button" class="v30-nav-icon" data-v30-prev aria-label="Questão anterior" ${q<=min?'disabled':''}>‹</button><button type="button" class="v30-card-status" data-v30-open><span>Questão ${q}</span><b>${answered}/90 no cartão${selected?` · ${selected}`:''}</b></button>${kind==='authorial'?`<button type="button" class="v30-review ${marked?'active':''}" data-v30-review aria-label="${marked?'Remover marcação de revisão':'Marcar para revisão'}">${marked?'★':'☆'}</button>`:''}<button type="button" class="v30-nav-icon" data-v30-next aria-label="Próxima questão" ${q>=max?'disabled':''}>›</button></div>`;
 $('[data-v30-prev]',dock)?.addEventListener('click',()=>previous(kind));
 $('[data-v30-next]',dock)?.addEventListener('click',()=>next(kind));
 $('[data-v30-open]',dock)?.addEventListener('click',openPanel);
 $('[data-v30-review]',dock)?.addEventListener('click',toggleMark);
 $$('[data-v30-letter]',dock).forEach(b=>b.addEventListener('click',()=>chooseOfficial(b.dataset.v30Letter)));
}
function enhance(){
 const kind=mode();
 if(!kind){clearShell();return}
 const s=state(kind);if(!s){clearShell();return}
 document.body.classList.add('v30-enem-mobile-active');
 renderDock(kind,s);
 if(panelOpen)renderPanel(kind,s);
 window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.enemMobile=VERSION;
}
function schedule(){clearTimeout(enhanceTimer);enhanceTimer=setTimeout(enhance,35)}
function boot(){
 ensureShell();
 const page=$('#page-mocks');if(page){observer=new MutationObserver(schedule);observer.observe(page,{subtree:true,childList:true})}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panelOpen)closePanel()});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('orientationchange',schedule,{passive:true});
 setTimeout(enhance,280);
 window.GABARITO_ENEM_MOBILE={version:VERSION,enhance,openPanel,closePanel};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
