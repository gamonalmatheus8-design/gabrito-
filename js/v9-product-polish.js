/* Gabarito+ V9.2 — acabamento progressivo da Home */
(function(){
'use strict';
const VERSION='9.2.0';
let scheduled=false,observer=null;
const safe=(fn,fallback)=>{try{return fn()}catch{return fallback}};
const text=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value};
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmtMin=value=>{const n=Math.max(0,Math.round(Number(value)||0));return n>=60?`${Math.floor(n/60)}h${n%60?` ${n%60}m`:''}`:`${n} min`};

function data(){
 const ctx=safe(()=>window.GabaritoV9?.buildContext?.(),null);
 const decision=safe(()=>window.GabaritoV9?.getDecision?.(),null);
 if(!ctx||!decision)return null;
 return{ctx,decision};
}
function icon(name){return `<i data-lucide="${name}" class="icon" aria-hidden="true"></i>`}
function daysLabel(ctx){
 if(ctx.days==null)return 'Data não definida';
 if(ctx.days===0)return 'Prova hoje';
 return `${ctx.days} dia${ctx.days===1?'':'s'} para a prova`;
}
function remainingLabel(ctx){
 const remaining=Math.max(0,(Number(ctx.dailyGoal)||0)-(Number(ctx.todayMin)||0));
 return remaining?`${fmtMin(remaining)} restantes`:'Meta concluída';
}
function ensureContextStrip(root,ctx){
 let strip=root.querySelector('.v9-context-strip');
 if(!strip){
  strip=document.createElement('div');
  strip.className='v9-context-strip';
  const top=root.querySelector('.v9-topbar');
  if(top)top.insertAdjacentElement('afterend',strip);else root.prepend(strip);
 }
 const items=[
  ['clock-3','Meta de hoje',remainingLabel(ctx)],
  ['brain','Revisões',ctx.due?.length?`${ctx.due.length} pendente${ctx.due.length===1?'':'s'}`:'Em dia'],
  ['rotate-ccw','Erros ativos',ctx.errors?.length?`${ctx.errors.length} para recuperar`:'Nenhum urgente'],
  ['calendar-days','Reta final',daysLabel(ctx)]
 ];
 const html=items.map(([ico,label,value])=>`<div class="v9-context-item"><div class="v9-context-icon">${icon(ico)}</div><div><span>${esc(label)}</span><strong>${esc(value)}</strong></div></div>`).join('');
 if(strip.innerHTML!==html)strip.innerHTML=html;
}
function improveCopy(root,decision){
 text(root.querySelector('.v9-title'),'Seu plano de hoje.');
 text(root.querySelector('.v9-subtitle'),'O Gabarito+ organiza seus sinais de estudo e coloca a próxima ação mais útil no topo.');
 const eyebrow=root.querySelector('.v9-priority-eyebrow');
 if(eyebrow)text(eyebrow,`Sessão recomendada · ${decision.sessionMinutes} min`);
 const label=root.querySelector('.v9-coach .v9-label');
 if(label){
  const existing=label.querySelector('.icon')?.outerHTML||icon('brain-circuit');
  const html=`${existing}Coach de estudos`;
  if(label.innerHTML!==html)label.innerHTML=html;
 }
 const foot=root.querySelector('.v9-footnote span');
 if(foot)text(foot,'A recomendação usa apenas sinais do seu próprio histórico de estudo. Gabaritos e conteúdo oficial permanecem separados da camada adaptativa.');
}
function improveAccessibility(root,decision){
 const primary=root.querySelector('.v9-btn-primary');
 if(primary){primary.setAttribute('aria-label',`${decision.primary}. Sessão recomendada de ${decision.sessionMinutes} minutos.`)}
 const progress=root.querySelector('.v9-progress');
 if(progress){progress.setAttribute('role','progressbar');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100')}
 const status=root.querySelector('.v9-status');
 if(status)status.setAttribute('aria-live','polite');
 root.querySelectorAll('.v9-topic').forEach(el=>el.setAttribute('role','group'));
}
function apply(){
 const root=document.getElementById('v9AdaptiveHome');
 if(!root||root.hidden||!root.querySelector('.v9-shell'))return;
 const state=data();if(!state)return;
 const {ctx,decision}=state;
 root.dataset.productPolish=VERSION;
 improveCopy(root,decision);
 ensureContextStrip(root,ctx);
 improveAccessibility(root,decision);
 safe(()=>window.lucide?.createIcons?.());
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;apply()},80)}
function boot(){
 apply();
 const home=document.getElementById('page-home');
 if(home){observer=new MutationObserver(schedule);observer.observe(home,{childList:true,subtree:true})}
 window.addEventListener('gplus:ready',schedule);
 window.addEventListener('storage',schedule);
 document.querySelector('.exam-switch')?.addEventListener('click',()=>setTimeout(schedule,120));
 setTimeout(apply,500);setTimeout(apply,1800);
}
window.GabaritoV9Product={version:VERSION,refresh:apply};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
