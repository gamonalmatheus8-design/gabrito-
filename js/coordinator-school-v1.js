(function(){
'use strict';
if(window.__GABARITO_COORDINATOR_SCHOOL_V1__)return;
window.__GABARITO_COORDINATOR_SCHOOL_V1__=true;

const state={context:null,schoolId:null,dashboard:null,loading:false,retry:0};
const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const pct=v=>`${Math.round(num(v)*10)/10}%`;
const icon=name=>`<i data-lucide="${name}" class="icon"></i>`;
const refreshIcons=()=>window.lucide?.createIcons?.();
const notify=message=>typeof window.toast==='function'?window.toast(message):alert(message);

function ensureStyle(){
  if(document.getElementById('gplusCoordinatorSchoolStyle'))return;
  const s=document.createElement('style');
  s.id='gplusCoordinatorSchoolStyle';
  s.textContent=`
  .gplus-school-page{--school-gap:16px}.gplus-school-page .school-head{align-items:center}.gplus-school-selector{min-width:240px}.gplus-school-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:16px}.gplus-school-kpi{padding:16px;min-width:0;background:linear-gradient(180deg,color-mix(in srgb,var(--surface-2) 92%,var(--primary-soft)),var(--surface-2));border:1px solid var(--line);border-radius:15px}.gplus-school-kpi span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800}.gplus-school-kpi strong{display:block;font:800 24px 'Manrope',sans-serif;letter-spacing:-.04em;margin:5px 0 2px}.gplus-school-kpi small{display:block;font-size:9px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gplus-school-hero{position:relative;overflow:hidden;padding:22px;border:1px solid color-mix(in srgb,var(--primary) 18%,var(--line));border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--primary-soft) 62%,var(--surface)),var(--surface) 62%);margin-bottom:16px}.gplus-school-hero:after{content:'';position:absolute;width:220px;height:220px;border-radius:50%;right:-90px;top:-120px;background:color-mix(in srgb,var(--primary) 8%,transparent)}.gplus-school-hero-top{position:relative;z-index:1;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.gplus-school-hero h2{font:800 22px 'Manrope',sans-serif;letter-spacing:-.035em;margin:4px 0 6px}.gplus-school-hero p{font-size:11px;line-height:1.6;color:var(--muted);max-width:68ch;margin:0}.gplus-school-chip{display:inline-flex;align-items:center;gap:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;padding:6px 9px;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--primary);white-space:nowrap}
  .gplus-school-layout{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(320px,.82fr);gap:16px;align-items:start}.gplus-school-stack{display:grid;gap:16px}.gplus-school-section{padding:16px}.gplus-school-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.gplus-school-section-head h3{font:800 15px 'Manrope',sans-serif;margin:0;letter-spacing:-.02em}.gplus-school-section-head span{font-size:9px;color:var(--muted)}.gplus-school-list{display:grid;gap:8px}.gplus-school-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}.gplus-school-row-main{min-width:0}.gplus-school-row-main strong{font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gplus-school-row-main span{font-size:9px;color:var(--muted);display:block;margin-top:3px}.gplus-school-row-right{display:flex;align-items:center;gap:8px;flex:0 0 auto}.gplus-school-score{font:800 13px 'Manrope',sans-serif}.gplus-school-pill{font-size:8px;font-weight:800;padding:5px 7px;border:1px solid var(--line);border-radius:999px;color:var(--muted);white-space:nowrap}
  .gplus-school-bars{display:grid;gap:10px}.gplus-school-bar-item{padding:10px 11px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2)}.gplus-school-bar-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.gplus-school-bar-top strong{font-size:10px}.gplus-school-bar-top b{font:800 11px 'Manrope',sans-serif}.gplus-school-bar{height:6px;border-radius:999px;background:var(--line);overflow:hidden;margin-top:7px}.gplus-school-bar span{display:block;height:100%;background:var(--primary);border-radius:999px}
  .gplus-school-insight{padding:15px;border-radius:14px;border:1px solid color-mix(in srgb,var(--primary) 22%,var(--line));background:color-mix(in srgb,var(--primary-soft) 36%,var(--surface));margin-bottom:16px}.gplus-school-insight span{font-size:9px;color:var(--primary);text-transform:uppercase;letter-spacing:.08em;font-weight:800}.gplus-school-insight strong{font:800 14px 'Manrope',sans-serif;display:block;margin:5px 0 4px}.gplus-school-insight p{font-size:10px;color:var(--muted);line-height:1.55;margin:0}
  .gplus-school-onboarding{max-width:760px;margin:22px auto;padding:24px}.gplus-school-onboarding h2{font:800 22px 'Manrope',sans-serif;margin:0 0 7px}.gplus-school-onboarding p{font-size:11px;color:var(--muted);line-height:1.6}.gplus-school-create{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:end;margin-top:16px}.gplus-school-unlinked{margin-top:16px}.gplus-school-empty{padding:18px;border:1px dashed var(--line-2);border-radius:12px;color:var(--muted);font-size:10px;text-align:center;background:var(--surface-2)}
  .gplus-school-recent-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px}.gplus-school-recent-meta span{font-size:8px!important;border:1px solid var(--line);border-radius:999px;padding:3px 6px;margin:0!important;color:var(--muted)}
  @media(max-width:1100px){.gplus-school-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.gplus-school-layout{grid-template-columns:1fr}}
  @media(max-width:700px){.gplus-school-page .school-head{align-items:flex-start}.gplus-school-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gplus-school-selector{min-width:0;width:100%}.gplus-school-hero-top{flex-direction:column}.gplus-school-create{grid-template-columns:1fr}.gplus-school-create .btn{width:100%}.gplus-school-row{align-items:flex-start}.gplus-school-row-right{flex-direction:column;align-items:flex-end}}
  `;
  document.head.appendChild(s);
}

function ensureShell(){
  if(!document.getElementById('gplusSchoolNav')){
    const classrooms=document.getElementById('gplusClassroomsNav');
    const plan=document.querySelector('.sidebar [data-page="plan"]');
    const btn=document.createElement('button');
    btn.type='button';btn.className='nav-btn';btn.id='gplusSchoolNav';btn.dataset.page='school';btn.hidden=true;
    btn.innerHTML=`${icon('school')}Escola`;
    btn.addEventListener('click',()=>window.go?.('school'));
    (classrooms||plan)?.insertAdjacentElement('afterend',btn);
  }
  if(!document.getElementById('page-school')){
    const section=document.createElement('section');
    section.className='page gplus-school-page';section.id='page-school';
    section.innerHTML=`<div class="header-row school-head"><div><p class="eyebrow">Coordenação</p><h1>Painel da escola</h1><p class="sub">Visão institucional de turmas, alunos, professores, entregas e desempenho.</p></div><div class="header-actions" id="gplusSchoolHeaderActions"></div></div><div id="gplusSchoolRoot"><div class="card card-pad"><div class="notice">Preparando painel da escola…</div></div></div>`;
    document.querySelector('main')?.appendChild(section);
  }
  if(!window.go?.__gplusSchool){
    const base=window.go;
    if(typeof base==='function'){
      const wrapped=function(page,...args){const r=base.call(this,page,...args);if(page==='school')setTimeout(()=>loadContext(true),0);return r};
      wrapped.__gplusSchool=true;window.go=wrapped;
    }
  }
  refreshIcons();
}

function setNav(show){const n=document.getElementById('gplusSchoolNav');if(n)n.hidden=!show}
function root(){return document.getElementById('gplusSchoolRoot')}

async function rpc(name,args={}){
  const client=getClient();if(!client)throw new Error('Conta ainda está conectando.');
  const {data,error}=await client.rpc(name,args);if(error)throw error;return data;
}

function renderHeaderActions(){
  const host=document.getElementById('gplusSchoolHeaderActions');if(!host)return;
  const schools=state.context?.schools||[];
  if(!schools.length){host.innerHTML='';return}
  host.innerHTML=`<select class="select gplus-school-selector" id="gplusSchoolSelect" aria-label="Escola selecionada">${schools.map(s=>`<option value="${esc(s.id)}" ${s.id===state.schoolId?'selected':''}>${esc(s.name)}</option>`).join('')}</select><button class="btn btn-secondary" type="button" id="gplusSchoolRefresh">${icon('refresh-cw')}Atualizar</button>`;
  document.getElementById('gplusSchoolSelect')?.addEventListener('change',e=>{state.schoolId=e.target.value;loadDashboard(true)});
  document.getElementById('gplusSchoolRefresh')?.addEventListener('click',()=>loadContext(true));
  refreshIcons();
}

function renderLoggedOut(){setNav(false);const r=root();if(r)r.innerHTML=`<div class="card gplus-school-onboarding"><h2>Entre na sua conta</h2><p>O painel da escola fica disponível para professores e coordenadores autenticados.</p><button class="btn btn-primary" type="button" id="gplusSchoolOpenAccount">${icon('log-in')}Entrar</button></div>`;document.getElementById('gplusSchoolOpenAccount')?.addEventListener('click',()=>window.openV5Account?.());refreshIcons()}

function renderOnboarding(){
  renderHeaderActions();
  const ctx=state.context||{},unlinked=ctx.unlinked_classrooms||[];const r=root();if(!r)return;
  r.innerHTML=`<div class="card gplus-school-onboarding"><span class="gplus-school-chip">${icon('sparkles')}Configuração institucional</span><h2>Crie a sua escola no Gabarito+</h2><p>Isso ativa a visão de coordenação. Depois você poderá vincular suas turmas existentes e acompanhar tudo em um único painel.</p><form id="gplusSchoolCreateForm" class="gplus-school-create"><div class="form-group"><label class="label" for="gplusSchoolName">Nome da escola</label><input class="field" id="gplusSchoolName" maxlength="120" placeholder="Ex.: Colégio Horizonte" required></div><button class="btn btn-primary" type="submit">${icon('school')}Criar escola</button></form>${unlinked.length?`<div class="gplus-school-unlinked"><div class="notice">Você tem ${unlinked.length} turma(s) existente(s). Depois de criar a escola, poderá vinculá-las sem perder atividades ou resultados.</div></div>`:''}</div>`;
  document.getElementById('gplusSchoolCreateForm')?.addEventListener('submit',createSchool);refreshIcons();
}

async function createSchool(ev){
  ev.preventDefault();const input=document.getElementById('gplusSchoolName');const name=input?.value.trim();if(!name)return;
  const btn=ev.currentTarget.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Criando…'}
  try{const data=await rpc('create_school',{p_name:name});state.schoolId=data?.id||null;notify('Escola criada. Agora vincule suas turmas.');await loadContext(true)}catch(e){console.error('[Gabarito+] criar escola:',e);notify(e?.message||'Não foi possível criar a escola.')}finally{if(btn)btn.disabled=false}
}

function schoolInsight(d){
  const s=d?.summary||{},attention=d?.students_attention||[];const delivery=num(s.delivery_rate),avg=num(s.average_pct);
  if(!num(s.student_count))return {title:'Estrutura pronta para receber alunos',text:'Vincule uma turma ou adicione alunos para começar a formar os indicadores da escola.'};
  if(attention.length)return {title:`${attention.length} aluno(s) merecem atenção`,text:`A escola está com ${pct(delivery)} de entregas e média geral de ${pct(avg)}. Priorize alunos com pendências ou baixo aproveitamento.`};
  if(delivery>=85&&avg>=70)return {title:'A escola está em um bom ritmo',text:`Entregas em ${pct(delivery)} e média geral de ${pct(avg)}. Continue acompanhando as turmas para preservar a consistência.`};
  return {title:'Acompanhe os próximos sinais',text:`Entregas em ${pct(delivery)} e média geral de ${pct(avg)}. O painel vai destacar automaticamente as turmas e alunos que precisam de intervenção.`};
}

function renderDashboard(){
  renderHeaderActions();const d=state.dashboard||{},s=d.summary||{},school=d.school||{},classes=d.classrooms||[],subjects=d.subjects||[],attention=d.students_attention||[],teachers=d.teachers||[],recent=d.recent_assignments||[],unlinked=state.context?.unlinked_classrooms||[];const insight=schoolInsight(d);const r=root();if(!r)return;
  const classHtml=classes.length?classes.map(c=>`<div class="gplus-school-row"><div class="gplus-school-row-main"><strong>${esc(c.name)}</strong><span>${esc(c.teacher_name)} · ${num(c.student_count)} aluno(s) · ${num(c.assignment_count)} atividade(s)</span></div><div class="gplus-school-row-right"><span class="gplus-school-pill">${pct(c.delivery_rate)} entregas</span><span class="gplus-school-score">${pct(c.average_pct)}</span><button class="btn btn-ghost btn-sm" type="button" data-school-open-class="${esc(c.id)}">Abrir</button></div></div>`).join(''):'<div class="gplus-school-empty">Nenhuma turma vinculada ainda.</div>';
  const subjectHtml=subjects.length?subjects.slice(0,8).map(x=>`<div class="gplus-school-bar-item"><div class="gplus-school-bar-top"><strong>${esc(x.subject)}</strong><b>${pct(x.pct)}</b></div><div class="gplus-school-bar"><span style="width:${Math.max(0,Math.min(100,num(x.pct)))}%"></span></div></div>`).join(''):'<div class="gplus-school-empty">As matérias aparecerão após respostas dos alunos.</div>';
  const attentionHtml=attention.length?attention.map(a=>`<div class="gplus-school-row"><div class="gplus-school-row-main"><strong>${esc(a.display_name)}</strong><span>${esc(a.classroom_name)} · ${num(a.pending_count)} pendente(s)</span></div><div class="gplus-school-row-right"><span class="gplus-school-pill">${pct(a.delivery_rate)} entregas</span><span class="gplus-school-score">${pct(a.average_pct)}</span><button class="btn btn-ghost btn-sm" type="button" data-school-open-class="${esc(a.classroom_id)}">Turma</button></div></div>`).join(''):'<div class="gplus-school-empty">Nenhum aluno em atenção neste momento.</div>';
  const teacherHtml=teachers.length?teachers.map(t=>`<div class="gplus-school-row"><div class="gplus-school-row-main"><strong>${esc(t.display_name)}</strong><span>${num(t.classroom_count)} turma(s) como responsável</span></div><span class="gplus-school-pill">Professor</span></div>`).join(''):'<div class="gplus-school-empty">Professores aparecerão quando houver turmas vinculadas.</div>';
  const recentHtml=recent.length?recent.map(a=>`<div class="gplus-school-row"><div class="gplus-school-row-main"><strong>${esc(a.title)}</strong><span>${esc(a.classroom_name)}</span><div class="gplus-school-recent-meta"><span>${num(a.submitted_count)}/${num(a.student_count)} entregas</span><span>${a.status==='closed'?'Encerrada':'Publicada'}</span></div></div><button class="btn btn-ghost btn-sm" type="button" data-school-open-class="${esc(a.classroom_id)}">Abrir</button></div>`).join(''):'<div class="gplus-school-empty">Nenhuma atividade institucional ainda.</div>';
  const unlinkedHtml=unlinked.length?`<section class="card gplus-school-section"><div class="gplus-school-section-head"><div><h3>Turmas fora da escola</h3><span>vincule sem perder os dados existentes</span></div></div><div class="gplus-school-list">${unlinked.map(c=>`<div class="gplus-school-row"><div class="gplus-school-row-main"><strong>${esc(c.name)}</strong><span>${String(c.exam_focus||'').toUpperCase()}${c.school_year?` · ${c.school_year}`:''}</span></div><button class="btn btn-primary btn-sm" type="button" data-school-link-class="${esc(c.id)}">Vincular</button></div>`).join('')}</div></section>`:'';
  r.innerHTML=`<section class="gplus-school-hero"><div class="gplus-school-hero-top"><div><span class="gplus-school-chip">${icon('building-2')}Coordenação</span><h2>${esc(school.name||'Escola')}</h2><p>Uma visão única do desempenho institucional, com prioridades pedagógicas e acompanhamento das turmas em tempo real.</p></div><span class="gplus-school-chip">Plano ${esc(String(school.plan_tier||'pilot').toUpperCase())}</span></div></section><div class="gplus-school-grid"><div class="gplus-school-kpi"><span>Alunos</span><strong>${num(s.student_count)}</strong><small>vinculados às turmas</small></div><div class="gplus-school-kpi"><span>Turmas</span><strong>${num(s.classroom_count)}</strong><small>ativas na escola</small></div><div class="gplus-school-kpi"><span>Professores</span><strong>${num(s.teacher_count)}</strong><small>atuando nas turmas</small></div><div class="gplus-school-kpi"><span>Média geral</span><strong>${pct(s.average_pct)}</strong><small>nas atividades entregues</small></div><div class="gplus-school-kpi"><span>Entregas</span><strong>${pct(s.delivery_rate)}</strong><small>${num(s.pending_count)} pendência(s)</small></div></div><div class="gplus-school-insight"><span>Análise institucional</span><strong>${esc(insight.title)}</strong><p>${esc(insight.text)}</p></div><div class="gplus-school-layout"><div class="gplus-school-stack"><section class="card gplus-school-section"><div class="gplus-school-section-head"><div><h3>Turmas</h3><span>média e taxa de entregas por sala</span></div></div><div class="gplus-school-list">${classHtml}</div></section><section class="card gplus-school-section"><div class="gplus-school-section-head"><div><h3>Alunos que precisam de atenção</h3><span>pendências e baixo aproveitamento</span></div></div><div class="gplus-school-list">${attentionHtml}</div></section>${unlinkedHtml}</div><div class="gplus-school-stack"><section class="card gplus-school-section"><div class="gplus-school-section-head"><div><h3>Desempenho por matéria</h3><span>menor aproveitamento primeiro</span></div></div><div class="gplus-school-bars">${subjectHtml}</div></section><section class="card gplus-school-section"><div class="gplus-school-section-head"><div><h3>Professores</h3><span>e turmas sob responsabilidade</span></div></div><div class="gplus-school-list">${teacherHtml}</div></section><section class="card gplus-school-section"><div class="gplus-school-section-head"><div><h3>Atividades recentes</h3><span>últimas publicações da escola</span></div></div><div class="gplus-school-list">${recentHtml}</div></section></div></div>`;
  bindDashboardActions();refreshIcons();
}

function bindDashboardActions(){
  document.querySelectorAll('[data-school-link-class]').forEach(btn=>btn.addEventListener('click',()=>linkClass(btn.dataset.schoolLinkClass,btn)));
  document.querySelectorAll('[data-school-open-class]').forEach(btn=>btn.addEventListener('click',()=>openClass(btn.dataset.schoolOpenClass)));
}
async function linkClass(classroomId,btn){
  if(!state.schoolId)return;if(btn)btn.disabled=true;
  try{await rpc('link_classroom_to_school',{p_institution_id:state.schoolId,p_classroom_id:classroomId});notify('Turma vinculada à escola.');await loadContext(true)}catch(e){console.error('[Gabarito+] vincular turma:',e);notify(e?.message||'Não foi possível vincular a turma.')}finally{if(btn)btn.disabled=false}
}
function openClass(classroomId){window.go?.('classrooms');setTimeout(()=>{const sel=document.getElementById('gplusTeacherClassSelect');if(sel&&[...sel.options].some(o=>o.value===classroomId)){sel.value=classroomId;sel.dispatchEvent(new Event('change',{bubbles:true}))}},180)}

async function loadDashboard(force=false){
  if(!state.schoolId)return renderOnboarding();
  if(state.loading&&!force)return;state.loading=true;const r=root();if(r)r.innerHTML='<div class="card card-pad"><div class="notice">Atualizando visão da escola…</div></div>';
  try{state.dashboard=await rpc('get_coordinator_school_dashboard',{p_institution_id:state.schoolId});renderDashboard()}catch(e){console.error('[Gabarito+] dashboard escola:',e);if(r)r.innerHTML=`<div class="card card-pad"><div class="notice"><strong>Não foi possível abrir o painel da escola.</strong><br>${esc(e?.message||e)}</div></div>`}finally{state.loading=false}
}

async function loadContext(force=false){
  ensureShell();const client=getClient();if(!client){if(state.retry<12){state.retry++;setTimeout(()=>loadContext(force),450)}return}
  try{const ctx=await rpc('get_school_context');state.context=ctx;state.retry=0;if(!ctx?.authenticated)return renderLoggedOut();const schools=ctx.schools||[];setNav(Boolean(ctx.can_create_school||schools.length));if(!schools.length){state.schoolId=null;state.dashboard=null;return renderOnboarding()}if(!state.schoolId||!schools.some(s=>s.id===state.schoolId))state.schoolId=schools[0].id;await loadDashboard(force)}catch(e){console.warn('[Gabarito+] contexto escola:',e?.message||e);if(state.retry<5){state.retry++;setTimeout(()=>loadContext(force),700)}}
}

function init(){ensureStyle();ensureShell();loadContext(false);const client=getClient();client?.auth?.onAuthStateChange?.(()=>setTimeout(()=>loadContext(true),180));window.addEventListener('gplus:ready',()=>setTimeout(()=>loadContext(false),250));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
