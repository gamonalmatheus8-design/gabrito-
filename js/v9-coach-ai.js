/* Gabarito+ V9 — AI Coach enhancement */
(function(){
'use strict';
const VERSION='9.1.0';
const CACHE_KEY='gplus_v9_ai_coach_cache';
let busy=false,scheduled=false;
const safe=(fn,fallback)=>{try{return fn()}catch{return fallback}};
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const number=value=>Number.isFinite(Number(value))?Number(value):0;

function payload(){
 const ctx=window.GabaritoV9?.buildContext?.();
 const decision=window.GabaritoV9?.getDecision?.();
 if(!ctx||!decision)return null;
 const upcoming=safe(()=>typeof upcomingReviews==='function'?upcomingReviews(7):[],[])||[];
 return{
  context:{
   exam:ctx.exam,module:ctx.module,days:ctx.days,todayMin:ctx.todayMin,dailyGoal:ctx.dailyGoal,weekMin:ctx.weekMin,accuracy:ctx.accuracy,answered:ctx.stats?.answered||0,streak:ctx.streak,dueCount:ctx.due?.length||0,errorCount:ctx.errors?.length||0,upcomingCount:upcoming.length,
   weakTopics:(ctx.attempted||[]).slice(0,4).map(x=>({subject:x.subject,topic:x.topic,score:Math.round(number(x.score)),accuracy:Math.round(number(x.accuracy)*100),attempts:number(x.attempts),wrong:number(x.wrong)}))
  },
  decision:{type:decision.type,subject:decision.subject||'',topic:decision.topic||'',sessionMinutes:decision.sessionMinutes,primary:decision.primary,steps:(decision.steps||[]).map(x=>({title:x.title,minutes:x.minutes,meta:x.meta}))}
 };
}
function fingerprint(data){
 const source=JSON.stringify(data);let hash=2166136261;
 for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return `${new Date().toISOString().slice(0,10)}-${(hash>>>0).toString(36)}`;
}
function readCache(fp){
 try{const data=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return data?.fingerprint===fp&&data?.result?data.result:null}catch{return null}
}
function writeCache(fp,result){try{localStorage.setItem(CACHE_KEY,JSON.stringify({fingerprint:fp,result,storedAt:Date.now()}))}catch{}}
function modelName(model){const value=String(model||'');return /gpt-6-astra/i.test(value)?'GPT-6 Astra':(value||'IA')}
function iconRefresh(){try{window.lucide?.createIcons?.()}catch{}}
function setState(el,state){el.dataset.aiState=state}

function slot(){
 const actions=document.querySelector('#v9AdaptiveHome .v9-actions');
 if(!actions)return null;
 let el=document.getElementById('v9AiCoach');
 if(!el){el=document.createElement('section');el.id='v9AiCoach';el.className='v9-ai-card';actions.insertAdjacentElement('afterend',el)}
 return el;
}
function renderIdle(el,fp=''){if(el.dataset.aiState===`idle:${fp}`)return;setState(el,`idle:${fp}`);
 el.innerHTML=`<div class="v9-ai-head"><span class="v9-ai-label"><i data-lucide="sparkles" class="icon"></i>Análise avançada</span><span class="v9-ai-chip">opcional</span></div><div class="v9-ai-idle"><div><strong>Aprofunde o plano com IA.</strong><p>O plano acima já funciona sozinho. A IA usa apenas dados agregados do seu estudo para explicar melhor a prioridade e refinar esta sessão.</p></div><button class="v9-ai-btn" type="button" onclick="GabaritoV9AI.run()"><i data-lucide="brain-circuit" class="icon"></i>Refinar com IA</button></div>`;
 iconRefresh();
}
function renderLoading(el){setState(el,'loading');
 el.innerHTML=`<div class="v9-ai-head"><span class="v9-ai-label"><i data-lucide="sparkles" class="icon"></i>Análise avançada</span><span class="v9-ai-chip active">analisando</span></div><div class="v9-ai-loading"><i></i><div><strong>Cruzando seus sinais de estudo…</strong><p>Erros, revisões, domínio e ritmo entram nesta leitura.</p></div></div>`;
}
function renderUnavailable(el,message){setState(el,'unavailable');
 el.innerHTML=`<div class="v9-ai-head"><span class="v9-ai-label"><i data-lucide="sparkles" class="icon"></i>Análise avançada</span><span class="v9-ai-chip muted">indisponível</span></div><div class="v9-ai-idle"><div><strong>Seu plano local continua ativo.</strong><p>${esc(message||'A análise avançada não respondeu agora. Você pode continuar com a sessão calculada acima.')}</p></div><button class="v9-ai-btn secondary" type="button" onclick="GabaritoV9AI.run(true)">Tentar novamente</button></div>`;
 iconRefresh();
}
function applyToMain(result){
 const analysis=result?.analysis;if(!analysis)return;
 const title=document.querySelector('#v9AdaptiveHome .v9-priority h2');
 const reason=document.querySelector('#v9AdaptiveHome .v9-reason');
 const status=document.querySelector('#v9AdaptiveHome .v9-status');
 const plan=document.querySelector('#v9AdaptiveHome .v9-plan');
 if(title)title.textContent=analysis.title;
 if(reason)reason.textContent=analysis.reason;
 if(status)status.innerHTML=`<i class="v9-status-dot"></i>IA · confiança ${esc(analysis.confidence)}`;
 if(plan&&Array.isArray(analysis.session_steps)&&analysis.session_steps.length){
  plan.innerHTML=analysis.session_steps.map((step,index)=>`<div class="v9-plan-step"><span>Etapa ${index+1} · ${Math.round(number(step.minutes))} min</span><strong>${esc(step.title)}</strong><small>${esc(step.purpose)}</small></div>`).join('');
 }
 document.getElementById('v9AdaptiveHome')?.classList.add('v9-ai-enhanced');
}
function renderResult(el,result,fp){if(el.dataset.aiState===`result:${fp}`)return;setState(el,`result:${fp}`);
 const a=result.analysis||{};
 applyToMain(result);
 el.innerHTML=`<div class="v9-ai-head"><span class="v9-ai-label"><i data-lucide="sparkles" class="icon"></i>Leitura do Coach</span><span class="v9-ai-chip active">${esc(modelName(result.model))}</span></div><div class="v9-ai-result"><div class="v9-ai-insight"><span>O que o Coach percebeu</span><strong>${esc(a.insight)}</strong></div><div class="v9-ai-signals">${(a.signals||[]).map(item=>`<span><i></i>${esc(item)}</span>`).join('')}</div><div class="v9-ai-check"><div><span>Cheque ao terminar</span><strong>${esc(a.checkpoint)}</strong></div><button class="v9-ai-link" type="button" onclick="GabaritoV9AI.run(true)">Atualizar análise</button></div></div>`;
 iconRefresh();
}
function ensure(){
 const el=slot();if(!el)return;
 const data=payload();if(!data){renderIdle(el);return}
 const fp=fingerprint(data),cached=readCache(fp);
 if(cached){renderResult(el,cached,fp);return}
 if(!busy)renderIdle(el,fp);
}
async function run(force=false){
 if(busy)return;
 const el=slot(),data=payload();if(!el||!data)return;
 const fp=fingerprint(data);
 if(!force){const cached=readCache(fp);if(cached){renderResult(el,cached,fp);return}}
 busy=true;renderLoading(el);
 try{
  const response=await fetch('/api/coach',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),cache:'no-store'});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
   if(body?.error==='AI_NOT_CONFIGURED')renderUnavailable(el,'A análise com IA ainda não foi ativada neste ambiente. O Coach local continua funcionando normalmente.');
   else if(response.status===429)renderUnavailable(el,'A IA recebeu muitas solicitações agora. Tente novamente em alguns minutos.');
   else renderUnavailable(el,'A análise avançada está temporariamente indisponível.');
   return;
  }
  writeCache(fp,body);renderResult(el,body,fp);
 }catch{renderUnavailable(el,'Não foi possível conectar à análise avançada agora.');}
 finally{busy=false}
}
function scheduleEnsure(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;ensure()},80)}
function boot(){
 ensure();
 const home=document.getElementById('page-home');
 if(home)new MutationObserver(scheduleEnsure).observe(home,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleEnsure()});
}
window.GabaritoV9AI={version:VERSION,run,refresh:()=>run(true),ensure};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,140),{once:true});else setTimeout(boot,140);
})();
