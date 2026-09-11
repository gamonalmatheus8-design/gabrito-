/* Gabarito+ V9 — Inteligência Adaptativa */
(function(){
'use strict';
const VERSION='9.0.0-alpha.1';
const state={lastContext:null,lastDecision:null};
const safe=(fn,fallback)=>{try{return fn()}catch(e){console.warn('[Gabarito+ V9]',e);return fallback}};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const setIcon=()=>{try{if(window.lucide)window.lucide.createIcons()}catch{}};
function escHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function fmtMinutes(minutes){minutes=Math.max(0,Math.round(num(minutes)));if(typeof window.fmtMin==='function')return window.fmtMin(minutes);return minutes>=60?`${Math.floor(minutes/60)}h ${minutes%60?minutes%60+'m':''}`.trim():`${minutes}m`}
function getToday(){return typeof window.todayISO==='function'?window.todayISO():new Date().toISOString().slice(0,10)}
function getExamContext(){
  const settings=safe(()=>app.settings,{})||{};
  const exam=settings.focusExam==='PISM'?'PISM':'ENEM';
  const module=settings.pismModule||'I';
  const target=exam==='ENEM'?settings.enemDate:settings.pismDate;
  const days=target&&typeof window.dateDiff==='function'?Math.max(0,window.dateDiff(target)):null;
  return{settings,exam,module,target,days};
}
function buildContext(){
  const {settings,exam,module,target,days}=getExamContext();
  const today=getToday();
  const ss=safe(()=>sessions(),[])||[];
  const stats=safe(()=>totalQStats(),{answered:0,correct:0})||{answered:0,correct:0};
  const due=safe(()=>typeof dueReviews==='function'?dueReviews(true):[],[])||[];
  const errors=safe(()=>typeof activeErrorIds==='function'?activeErrorIds():[],[])||[];
  const mastery=safe(()=>typeof masteryRows==='function'?masteryRows(exam,module):[],[])||[];
  const attempted=mastery.filter(x=>num(x.attempts)>0).sort((a,b)=>num(a.score)-num(b.score)||num(b.wrong)-num(a.wrong));
  const unstarted=mastery.filter(x=>!num(x.attempts));
  const todayMin=ss.filter(x=>x&&x.dateISO===today).reduce((sum,x)=>sum+num(x.minutes),0);
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-6);const cut=cutoff.toISOString().slice(0,10);
  const weekMin=ss.filter(x=>(x?.dateISO||'')>=cut).reduce((sum,x)=>sum+num(x.minutes),0);
  const accuracy=stats.answered?Math.round(stats.correct/stats.answered*100):0;
  const streak=safe(()=>typeof updateStreak==='function'?updateStreak():0,0);
  const dailyGoal=Math.max(20,num(settings.dailyGoal)||60);
  return{settings,exam,module,target,days,today,ss,stats,due,errors,mastery,attempted,unstarted,todayMin,weekMin,accuracy,streak,dailyGoal};
}
function chooseDecision(ctx){
  const remaining=Math.max(0,ctx.dailyGoal-ctx.todayMin);
  const sessionMinutes=clamp(remaining||40,25,70);
  const weak=ctx.attempted[0]||null;
  const second=ctx.attempted[1]||null;
  let type='diagnostic';
  let title='Gere seu primeiro diagnóstico confiável.';
  let reason='Ainda há poucos dados para personalizar com segurança. Uma sessão curta de questões já cria uma base melhor para o próximo plano.';
  let primary='Iniciar diagnóstico';
  let subject=null,topic=null;
  if(ctx.due.length){
    type='review';title='Revisões pendentes vêm primeiro.';reason=`Você tem ${ctx.due.length} revisão${ctx.due.length===1?'':'ões'} vencida${ctx.due.length===1?'':'s'}. Recuperar conteúdo no momento certo tende a valer mais do que abrir um assunto novo.`;primary='Revisar agora';
  }else if(ctx.errors.length>=3){
    type='errors';title='Transforme erros recentes em acertos.';reason=`Há ${ctx.errors.length} erro${ctx.errors.length===1?'':'s'} ativo${ctx.errors.length===1?'':'s'} no seu histórico. A prioridade é fechar essas lacunas antes de aumentar o volume.`;primary='Treinar meus erros';
  }else if(weak){
    type='weak-topic';subject=weak.subject;topic=weak.topic;title=`Prioridade: ${weak.topic||weak.subject}.`;reason=`Seu domínio estimado neste ponto está em ${Math.round(num(weak.score))}/100${weak.attempts?` após ${weak.attempts} tentativa${weak.attempts===1?'':'s'}`:''}. É o melhor candidato para uma sessão dirigida agora.`;primary='Começar sessão dirigida';
  }else if(ctx.stats.answered>=5){
    type='mixed';title='Consolide o que já começou.';reason='Você já gerou dados suficientes para sair do modo diagnóstico. Faça um bloco misto e use os próximos resultados para refinar a prioridade por assunto.';primary='Começar bloco misto';
  }
  const theory=clamp(Math.round(sessionMinutes*.25),5,15);
  const practice=clamp(Math.round(sessionMinutes*.5),12,35);
  const recovery=Math.max(8,sessionMinutes-theory-practice);
  const steps=type==='review'?
    [{title:'Revisões vencidas',meta:`${ctx.due.length} pendente${ctx.due.length===1?'':'s'}`,minutes:clamp(Math.round(sessionMinutes*.45),10,30)},{title:'Questões de recuperação',meta:'confirme se o conteúdo voltou',minutes:clamp(Math.round(sessionMinutes*.35),10,25)},{title:'Fechamento',meta:'registre o que ainda travou',minutes:Math.max(5,sessionMinutes-clamp(Math.round(sessionMinutes*.45),10,30)-clamp(Math.round(sessionMinutes*.35),10,25))}]:
    [{title:type==='weak-topic'?'Revisão objetiva':'Aquecimento',meta:type==='weak-topic'?(subject||'assunto prioritário'):'leitura rápida da prioridade',minutes:theory},{title:'Questões dirigidas',meta:type==='errors'?'foco em erros ativos':type==='diagnostic'?'amostra para diagnóstico':'prática com feedback',minutes:practice},{title:'Recuperação',meta:'refaça o que ainda não fixou',minutes:recovery}];
  const confidence=ctx.stats.answered>=30?'alta':ctx.stats.answered>=10?'média':'inicial';
  return{type,title,reason,primary,subject,topic,second,sessionMinutes,steps,confidence};
}
function examLabel(ctx){return ctx.exam==='PISM'?`PISM · Módulo ${ctx.module}`:'ENEM'}
function progressPct(ctx){return clamp(Math.round((ctx.todayMin/ctx.dailyGoal)*100),0,100)}
function weakRows(ctx){
  const rows=ctx.attempted.slice(0,3);
  if(!rows.length)return'<div class="v9-empty">Resolva algumas questões para o Gabarito+ identificar seus pontos de maior retorno.</div>';
  return rows.map(x=>`<div class="v9-topic"><div><b>${escHtml(x.subject)}</b><small>${escHtml(x.topic||'Visão geral')} · ${Math.round(num(x.accuracy)*100)}% de acerto</small></div><span class="v9-score">${Math.round(num(x.score))}/100</span></div>`).join('');
}
function nextReviewText(ctx){
  if(ctx.due.length)return`${ctx.due.length} revisão${ctx.due.length===1?'':'ões'} para hoje`;
  const upcoming=safe(()=>typeof upcomingReviews==='function'?upcomingReviews(7):[],[])||[];
  return upcoming.length?`${upcoming.length} nos próximos 7 dias`:'Nenhuma revisão urgente';
}
function render(){
  const page=document.getElementById('page-home');if(!page)return;
  let root=document.getElementById('v9AdaptiveHome');
  if(!root){root=document.createElement('div');root.id='v9AdaptiveHome';page.insertBefore(root,page.firstChild)}
  page.classList.add('v9-adaptive-home');
  const ctx=buildContext();const decision=chooseDecision(ctx);state.lastContext=ctx;state.lastDecision=decision;
  const daysText=ctx.days==null?'—':`${ctx.days}d`;
  const accText=ctx.stats.answered?`${ctx.accuracy}%`:'—';
  root.innerHTML=`<div class="v9-shell">
    <div class="v9-topbar">
      <div><p class="v9-kicker"><i data-lucide="sparkles" class="icon"></i>Gabarito+ V9 · Inteligência Adaptativa</p><h1 class="v9-title">Seu próximo passo, já decidido.</h1><p class="v9-subtitle">O painel usa seu histórico de questões, erros, revisões e tempo de estudo para reduzir a dúvida sobre o que fazer agora.</p></div>
      <div class="v9-exam-pill"><i data-lucide="target" class="icon"></i>${escHtml(examLabel(ctx))}</div>
    </div>
    <div class="v9-main-grid">
      <section class="v9-card v9-coach">
        <div class="v9-coach-head"><span class="v9-label"><i data-lucide="brain-circuit" class="icon"></i>Coach adaptativo</span><span class="v9-status"><i class="v9-status-dot"></i>Confiança ${escHtml(decision.confidence)}</span></div>
        <div class="v9-priority"><p class="v9-priority-eyebrow">Prioridade da sessão · ${decision.sessionMinutes} min</p><h2>${escHtml(decision.title)}</h2><p class="v9-reason">${escHtml(decision.reason)}</p></div>
        <div class="v9-plan">${decision.steps.map((s,i)=>`<div class="v9-plan-step"><span>Etapa ${i+1} · ${s.minutes} min</span><strong>${escHtml(s.title)}</strong><small>${escHtml(s.meta)}</small></div>`).join('')}</div>
        <div class="v9-actions"><button class="v9-btn v9-btn-primary" type="button" onclick="GabaritoV9.startPrimary()"><i data-lucide="play" class="icon"></i>${escHtml(decision.primary)}</button><button class="v9-btn v9-btn-secondary" type="button" onclick="go('plan')"><i data-lucide="calendar-range" class="icon"></i>Ver plano completo</button></div>
      </section>
      <aside class="v9-side">
        <section class="v9-card v9-metric-card"><span class="v9-label"><i data-lucide="activity" class="icon"></i>Hoje</span><div class="v9-metric-row"><span>Tempo estudado</span><strong>${escHtml(fmtMinutes(ctx.todayMin))}</strong></div><div class="v9-progress" aria-label="Progresso da meta diária"><i style="width:${progressPct(ctx)}%"></i></div><div class="v9-metric-row"><span>Meta diária</span><strong>${escHtml(fmtMinutes(ctx.dailyGoal))}</strong></div><div class="v9-metric-row"><span>Questões respondidas</span><strong>${ctx.stats.answered}</strong></div><div class="v9-metric-row"><span>Aproveitamento</span><strong>${accText}</strong></div></section>
        <section class="v9-card v9-insight"><span class="v9-label"><i data-lucide="calendar-clock" class="icon"></i>Ritmo</span><strong>${escHtml(nextReviewText(ctx))}</strong><p>${ctx.days==null?'Defina sua data de prova para o ritmo considerar a reta final.':`Faltam ${daysText} para sua prova-alvo. Nesta semana você acumulou ${fmtMinutes(ctx.weekMin)} de estudo e está em uma sequência de ${ctx.streak} dia${ctx.streak===1?'':'s'}.`}</p></section>
      </aside>
    </div>
    <div class="v9-lower-grid">
      <section class="v9-card v9-panel"><div class="v9-panel-head"><h3>Onde você ganha mais agora</h3><button class="v9-link" type="button" onclick="go('mastery')">Ver domínio</button></div><div class="v9-topic-list">${weakRows(ctx)}</div></section>
      <section class="v9-card v9-panel"><div class="v9-panel-head"><h3>Leitura do Coach</h3><button class="v9-link" type="button" onclick="GabaritoV9.refresh()">Atualizar análise</button></div><div class="v9-topic-list"><div class="v9-topic"><div><b>Revisões</b><small>conteúdo que já chegou no momento de ser recuperado</small></div><span class="v9-score">${ctx.due.length}</span></div><div class="v9-topic"><div><b>Erros ativos</b><small>questões erradas ainda sem recuperação confirmada</small></div><span class="v9-score">${ctx.errors.length}</span></div><div class="v9-topic"><div><b>Amostra</b><small>volume usado para personalizar as próximas decisões</small></div><span class="v9-score">${ctx.stats.answered}</span></div></div></section>
    </div>
    <div class="v9-footnote"><i data-lucide="shield-check" class="icon"></i><span>Esta primeira camada da V9 usa regras transparentes sobre os dados do próprio aluno. Um provedor de IA externo poderá enriquecer explicações e planejamento depois, sem assumir o controle do gabarito oficial nem dos dados acadêmicos validados.</span></div>
  </div>`;
  setIcon();
}
function configureQuestionFilters(subject,topic,status){
  const set=(id,value)=>{const el=document.getElementById(id);if(!el||value==null)return false;const options=[...el.options].map(o=>o.value||o.textContent);const hit=options.find(x=>String(x).toLowerCase()===String(value).toLowerCase());if(hit!=null){el.value=hit;el.dispatchEvent(new Event('change',{bubbles:true}));return true}return false};
  set('qExam',state.lastContext?.exam||'ENEM');
  if(state.lastContext?.exam==='PISM')set('qModule',state.lastContext.module);
  if(subject)set('qSubject',subject);
  if(topic)set('qTopic',topic);
  if(status)set('qStatus',status);
  if(typeof window.pickQuestion==='function')safe(()=>window.pickQuestion(true));
}
function openQuestions(subject,topic,status){
  if(typeof window.v42OpenQuestions==='function')window.v42OpenQuestions();else if(typeof window.openQuestionMode==='function')window.openQuestionMode(state.lastContext?.exam||'ENEM');else if(typeof window.go==='function')window.go('questions');
  setTimeout(()=>configureQuestionFilters(subject,topic,status),80);
}
function startPrimary(){
  const d=state.lastDecision||chooseDecision(buildContext());
  if(d.type==='review'){if(typeof window.go==='function')window.go('reviews');return}
  if(d.type==='errors'){openQuestions(null,null,'WRONG');return}
  if(d.type==='weak-topic'){openQuestions(d.subject,d.topic,null);return}
  openQuestions(null,null,'UNSEEN');
}
function hook(){
  const baseDash=window.renderDashboard;
  if(typeof baseDash==='function'&&!baseDash.__v9wrapped){const wrapped=function(){const out=baseDash.apply(this,arguments);setTimeout(render,0);return out};wrapped.__v9wrapped=true;window.renderDashboard=wrapped}
  const baseGo=window.go;
  if(typeof baseGo==='function'&&!baseGo.__v9wrapped){const wrapped=function(page){const out=baseGo.apply(this,arguments);if(page==='home')setTimeout(render,0);return out};wrapped.__v9wrapped=true;window.go=wrapped}
  document.querySelector('.exam-switch')?.addEventListener('click',()=>setTimeout(render,0));
  window.addEventListener('storage',()=>setTimeout(render,0));
  window.addEventListener('gplus:ready',()=>setTimeout(render,0),{once:true});
}
window.GabaritoV9={version:VERSION,refresh:render,startPrimary,buildContext:()=>buildContext(),getDecision:()=>state.lastDecision};
hook();render();
})();
