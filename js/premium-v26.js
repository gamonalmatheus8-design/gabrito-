(function(){
'use strict';
const VERSION='2.6.0';
const EXAM_KEYS=['gplus_enem_exam_v24','gplus_pism_exam_v25'];
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const safeParse=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node};
let enhanceTimer=null;
let saveTimer=null;

function activeExam(){
 for(const key of EXAM_KEYS){
  const session=safeParse(localStorage.getItem(key));
  if(session&&session.status==='active'&&Number(session.deadline||0)>Date.now())return session;
 }
 return null;
}

function installUnloadGuard(){
 window.addEventListener('beforeunload',event=>{
  if(!activeExam())return;
  event.preventDefault();
  event.returnValue='';
 });
}

function ensureLiveRegion(){
 if($('#v26LiveRegion'))return;
 const live=el('div','v26-sr-only');live.id='v26LiveRegion';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.appendChild(live);
}
function announce(text){const live=$('#v26LiveRegion');if(live)live.textContent=text}

function enhanceAccessibility(){
 $$('button').forEach(button=>{
  const visible=clean(button.textContent);
  if(!button.getAttribute('aria-label')&&!visible){
   const title=button.getAttribute('title')||button.dataset.label||button.dataset.close||'';
   const icon=button.querySelector('[data-lucide]')?.getAttribute('data-lucide')||'';
   const fallback=/x|close/i.test(icon)?'Fechar':/menu/i.test(icon)?'Abrir menu':/chevron-left|arrow-left/i.test(icon)?'Voltar':/chevron-right|arrow-right/i.test(icon)?'Avançar':'Ação';
   button.setAttribute('aria-label',clean(title)||fallback);
  }
  if(button.matches('.v24-option,.v25p-option'))button.setAttribute('aria-pressed',button.classList.contains('selected')?'true':'false');
  if(button.matches('.v24-mark,[data-mark]'))button.setAttribute('aria-pressed',button.classList.contains('active')?'true':'false');
 });
 $$('input').forEach(input=>{
  if(input.type==='email'){input.autocomplete=input.autocomplete||'email';if(!input.getAttribute('aria-label'))input.setAttribute('aria-label','E-mail')}
  if(input.type==='password'){
   const hint=/nova|new|register|cadastro/i.test(`${input.id} ${input.name} ${input.placeholder}`)?'new-password':'current-password';
   input.autocomplete=input.autocomplete||hint;if(!input.getAttribute('aria-label'))input.setAttribute('aria-label','Senha');
  }
 });
 $$('.v24-palette button').forEach(button=>{if(!button.getAttribute('aria-label'))button.setAttribute('aria-label',`Questão ${clean(button.textContent)}`)});
 $$('.v25p-palette button').forEach(button=>{if(!button.getAttribute('aria-label'))button.setAttribute('aria-label',`Questão ${clean(button.textContent)}`)});
 $$('.v25p-disc-palette button').forEach(button=>{if(!button.getAttribute('aria-label'))button.setAttribute('aria-label',`Discursiva ${clean(button.textContent).replace(/^D/i,'')}`)});
}

function syncFocusMode(){
 const page=$('#page-mocks');
 const active=Boolean(page&&(page.classList.contains('enem-exam-active')||page.classList.contains('pism-exam-active')));
 document.body.classList.toggle('v26-exam-focus',active);
}

function ensureSaveBadge(){
 const configs=[['#v24EnemRunner','.v24-clock'],['#v25PismRunner','.v25p-clock']];
 configs.forEach(([runnerSel,clockSel])=>{
  const runner=$(runnerSel);if(!runner||!runner.offsetParent)return;
  const clock=$(clockSel,runner);if(!clock||$('.v26-save-status',clock))return;
  const badge=el('small','v26-save-status','Salvo neste dispositivo');clock.appendChild(badge);
 });
}
function markSaved(){
 clearTimeout(saveTimer);
 $$('.v26-save-status').forEach(node=>{node.textContent='Salvando…';node.classList.add('saving')});
 saveTimer=setTimeout(()=>{$$('.v26-save-status').forEach(node=>{node.textContent='Salvo agora';node.classList.remove('saving')});announce('Progresso salvo neste dispositivo')},260);
}

function parsePerformanceCard(node){
 const text=clean(node.innerText||node.textContent);
 const match=text.match(/(\d+)\s*\/\s*(\d+)/);
 if(!match)return null;
 const correct=Number(match[1]),total=Number(match[2]);if(!total)return null;
 const lines=String(node.innerText||'').split(/\n+/).map(clean).filter(Boolean);
 const fromLines=lines.find(line=>!line.includes(match[0])&&!/^\d+[.,]?\d*%?$/.test(line)&&!/acerto|quest/i.test(line.toLowerCase()));
 const fallbackName=clean(text.replace(match[0],' ').replace(/\b\d+(?:[.,]\d+)?%\b/g,' ').replace(/\b(acertos?|questões?|objetivas?|respondidas?)\b/gi,' '));
 const name=fromLines||fallbackName||'Desempenho';
 return{name:name.slice(0,60),correct,total,percent:Math.round(correct/total*100)};
}
function performanceItems(root,kind){
 const selector=kind==='ENEM'?'.v24-area-result':'.v25p-subject-results>div';
 return $$(selector,root).map(parsePerformanceCard).filter(Boolean).sort((a,b)=>a.percent-b.percent);
}
function tier(item){
 if(item.percent<55)return{label:'Prioridade alta',text:'Revise os conceitos-base e faça uma sessão curta de questões focadas antes do próximo simulado.'};
 if(item.percent<75)return{label:'Consolidar',text:'Revise os erros, refaça questões do mesmo tema e busque estabilidade acima de 75%.'};
 return{label:'Manter',text:'Bom domínio. Faça revisão espaçada e preserve esse desempenho enquanto ataca áreas mais fracas.'};
}
function makeActionButton(text,primary,handler){
 const b=el('button',primary?'btn btn-primary':'btn btn-secondary',text);b.type='button';b.addEventListener('click',handler);return b;
}
function addPostExamPlan(root,kind){
 if(!root||$('[data-v26-plan]',root))return;
 const items=performanceItems(root,kind);if(!items.length)return;
 const section=el('section','v26-post-plan');section.dataset.v26Plan='true';
 const head=el('div','v26-post-head');
 const copy=el('div');copy.append(el('span','v26-kicker','PRÓXIMO PASSO'),el('h3','',kind==='ENEM'?'Plano pós-ENEM':'Plano pós-PISM'),el('p','','Transforme o resultado em uma sequência curta de revisão, questões dirigidas e nova tentativa.'));
 const badge=el('div','v26-plan-badge',`${items[0].percent}% · menor desempenho`);head.append(copy,badge);section.appendChild(head);
 const grid=el('div','v26-plan-grid');
 items.slice(0,Math.min(3,items.length)).forEach((item,index)=>{
  const t=tier(item),card=el('article','v26-plan-card');if(index===0)card.classList.add('priority');
  const top=el('div','v26-plan-card-top');top.append(el('strong','',item.name),el('b','',`${item.correct}/${item.total}`));
  card.append(top,el('span','v26-tier',t.label),el('p','',t.text));grid.appendChild(card);
 });
 section.appendChild(grid);
 if(kind==='PISM'){
  const pending=$$('.v25p-review-head select',root).filter(select=>!String(select.value||'').trim()).length;
  if(pending){const note=el('div','v26-plan-note',`Ainda há ${pending} discursiva${pending===1?'':'s'} sem autocorreção. Finalize os critérios antes de comparar este caderno com o próximo.`);section.appendChild(note)}
 }
 const actions=el('div','v26-plan-actions');
 actions.append(makeActionButton('Treinar ponto mais fraco',true,()=>{if(typeof window.go==='function')window.go('questions')}),makeActionButton('Voltar aos simulados',false,()=>{if(typeof window.go==='function')window.go('mocks')}));
 section.appendChild(actions);
 const target=$(kind==='ENEM'?'.v24-result-actions':'.v25p-result-actions',root);if(target)target.before(section);else root.appendChild(section);
}

function enhanceResults(){
 $$('.v24-result').forEach(root=>addPostExamPlan(root,'ENEM'));
 $$('.v25p-result').forEach(root=>addPostExamPlan(root,'PISM'));
}

function enhance(){
 syncFocusMode();
 enhanceAccessibility();
 ensureSaveBadge();
 enhanceResults();
 document.documentElement.dataset.gplusVersion=VERSION;
 if(window.GABARITO_APP)window.GABARITO_APP.premiumPolish=VERSION;
}
function scheduleEnhance(){clearTimeout(enhanceTimer);enhanceTimer=setTimeout(enhance,90)}

function installInteractionHooks(){
 document.addEventListener('input',event=>{if(event.target.matches('#v24EssayText,#v25PismDiscAnswer'))markSaved()},{passive:true});
 document.addEventListener('click',event=>{if(event.target.closest('.v24-option,.v25p-option,[data-mark],[data-obj-jump],[data-disc-jump]'))markSaved()},{passive:true});
}
function boot(){
 ensureLiveRegion();installUnloadGuard();installInteractionHooks();enhance();
 const observer=new MutationObserver(scheduleEnhance);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});
 window.GABARITO_PREMIUM={version:VERSION,enhance,activeExam};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
