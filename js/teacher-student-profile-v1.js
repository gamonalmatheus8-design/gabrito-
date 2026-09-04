(function(){
'use strict';
if(window.__GABARITO_TEACHER_STUDENT_PROFILE_V1__)return;
window.__GABARITO_TEACHER_STUDENT_PROFILE_V1__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=value=>Number.isFinite(Number(value))?Number(value):0;
let timer=null,inFlight=false,cachedClassroom='',cachedMembers=[];

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}
function refreshIcons(){if(window.lucide)window.lucide.createIcons()}
function fmtDate(value){return value?new Date(value).toLocaleDateString('pt-BR'):'—'}
function fmtDateTime(value){return value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—'}
function notify(message){if(typeof window.toast==='function')window.toast(message);else alert(message)}

function ensureStyle(){
  if(document.getElementById('gplusTeacherStudentProfileStyle'))return;
  const style=document.createElement('style');
  style.id='gplusTeacherStudentProfileStyle';
  style.textContent=`
  .gplus-student-row{cursor:pointer;transition:border-color .16s ease,background .16s ease}.gplus-student-row:hover{border-color:color-mix(in srgb,var(--primary) 38%,var(--line));background:color-mix(in srgb,var(--primary-soft) 35%,var(--surface-2))}.gplus-student-row strong[data-gplus-student-name]{color:var(--text);text-decoration:none}.gplus-student-profile-btn{margin-left:auto;white-space:nowrap;flex:0 0 auto}
  .gplus-student-modal{position:fixed;inset:0;z-index:245;display:none}.gplus-student-modal.open{display:grid;place-items:center;padding:18px}.gplus-student-backdrop{position:absolute;inset:0;background:rgba(10,15,25,.7);backdrop-filter:blur(8px)}.gplus-student-dialog{position:relative;z-index:1;width:min(1040px,100%);max-height:92vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.32);padding:20px}.gplus-student-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:15px}.gplus-student-top span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--primary);font-weight:800}.gplus-student-top h2{font:800 22px 'Manrope',sans-serif;letter-spacing:-.03em;margin:3px 0 0}.gplus-student-top p{font-size:10px;color:var(--muted);margin:4px 0 0}
  .gplus-student-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:16px}.gplus-student-kpi{padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)}.gplus-student-kpi span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:800}.gplus-student-kpi strong{display:block;font:800 21px 'Manrope',sans-serif;margin-top:4px}.gplus-student-kpi small{display:block;font-size:9px;color:var(--muted);margin-top:2px}
  .gplus-student-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:12px}.gplus-student-section{border:1px solid var(--line);border-radius:14px;background:var(--surface-2);padding:14px;min-width:0}.gplus-student-section-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:11px}.gplus-student-section-head strong{font:800 14px 'Manrope',sans-serif}.gplus-student-section-head span{font-size:9px;color:var(--muted)}
  .gplus-evolution-chart{height:190px;position:relative;border-radius:12px;background:var(--surface);border:1px solid var(--line);padding:10px}.gplus-evolution-chart svg{width:100%;height:145px;display:block}.gplus-evolution-labels{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(60px,1fr);gap:5px;overflow:auto;padding-top:4px}.gplus-evolution-labels div{font-size:8px;color:var(--muted);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gplus-evolution-empty{height:190px;display:grid;place-items:center;border:1px dashed var(--line-2);border-radius:12px;color:var(--muted);font-size:11px;background:var(--surface)}
  .gplus-subject-list,.gplus-student-history{display:grid;gap:8px}.gplus-subject-row,.gplus-history-item{padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--surface)}.gplus-subject-top,.gplus-history-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.gplus-subject-top strong,.gplus-history-top strong{font-size:11px}.gplus-subject-top b,.gplus-history-score{font:800 12px 'Manrope',sans-serif}.gplus-subject-meta,.gplus-history-meta{font-size:9px;color:var(--muted);margin-top:3px}.gplus-subject-bar{height:6px;background:var(--line);border-radius:999px;overflow:hidden;margin-top:8px}.gplus-subject-bar span{display:block;height:100%;background:var(--primary);border-radius:999px}.gplus-history-status{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:4px 7px;border-radius:999px;border:1px solid var(--line)}.gplus-history-status.submitted{color:var(--success);background:color-mix(in srgb,var(--success) 9%,var(--surface))}.gplus-history-status.in_progress{color:var(--warning);background:color-mix(in srgb,var(--warning) 9%,var(--surface))}.gplus-history-status.pending{color:var(--muted);background:var(--surface-2)}.gplus-history-right{display:flex;align-items:center;gap:8px;flex:0 0 auto}.gplus-profile-empty{padding:16px;border:1px dashed var(--line-2);border-radius:11px;color:var(--muted);font-size:11px;text-align:center;background:var(--surface)}
  @media(max-width:850px){.gplus-student-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.gplus-student-grid{grid-template-columns:1fr}.gplus-student-profile-btn{width:auto}}@media(max-width:620px){.gplus-student-modal.open{padding:0;align-items:end}.gplus-student-dialog{width:100%;max-height:95vh;border-radius:20px 20px 0 0;border-bottom:0;padding:16px}.gplus-student-summary{grid-template-columns:1fr 1fr}.gplus-student-profile-btn{font-size:0;padding:9px}.gplus-student-profile-btn .icon{margin:0}}
  `;
  document.head.appendChild(style);
}

function ensureModal(){
  if(document.getElementById('gplusTeacherStudentProfileModal'))return;
  const modal=document.createElement('div');
  modal.id='gplusTeacherStudentProfileModal';
  modal.className='gplus-student-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="gplus-student-backdrop" data-close-student-profile></div><div class="gplus-student-dialog" role="dialog" aria-modal="true" aria-labelledby="gplusTeacherStudentProfileTitle"><div class="gplus-student-top"><div><span>Perfil individual</span><h2 id="gplusTeacherStudentProfileTitle">Aluno</h2><p id="gplusTeacherStudentProfileMeta"></p></div><button class="icon-btn" type="button" data-close-student-profile aria-label="Fechar perfil do aluno">${icon('x')}</button></div><div id="gplusTeacherStudentProfileBody"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-student-profile]').forEach(el=>el.addEventListener('click',closeModal));
  refreshIcons();
}
function openModal(){ensureModal();const m=document.getElementById('gplusTeacherStudentProfileModal');m?.classList.add('open');m?.setAttribute('aria-hidden','false')}
function closeModal(){const m=document.getElementById('gplusTeacherStudentProfileModal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true')}

async function getMembers(classroomId){
  const client=getClient();if(!client)return [];
  if(cachedClassroom===classroomId&&cachedMembers.length)return cachedMembers;
  const {data,error}=await client.from('classroom_members').select('user_id,joined_at').eq('classroom_id',classroomId).eq('role','student').order('joined_at',{ascending:true});
  if(error)throw error;
  cachedClassroom=classroomId;cachedMembers=data||[];return cachedMembers;
}

async function ensureStudentLinks(){
  if(inFlight)return;
  const select=document.getElementById('gplusTeacherClassSelect');
  const rows=[...document.querySelectorAll('#page-classrooms .gplus-student-list .gplus-student-row')];
  const classroomId=select?.value;
  if(!classroomId||!rows.length)return;
  inFlight=true;
  try{
    const members=await getMembers(classroomId);
    rows.forEach((row,index)=>{
      const member=members[index];if(!member)return;
      row.dataset.gplusStudentId=member.user_id;
      row.dataset.gplusClassroomId=classroomId;
      const name=row.querySelector('strong');
      if(name){name.dataset.gplusStudentName='1';name.title='Abrir perfil do aluno'}
      if(!row.querySelector('[data-open-student-profile]')){
        const btn=document.createElement('button');
        btn.type='button';btn.className='btn btn-ghost btn-sm gplus-student-profile-btn';
        btn.dataset.openStudentProfile=member.user_id;btn.dataset.classroomId=classroomId;
        btn.innerHTML=`${icon('chart-no-axes-combined')}Ver aluno`;
        row.appendChild(btn);
      }
    });
    refreshIcons();
  }catch(error){console.warn('[Gabarito+] Perfil do aluno:',error?.message||error)}finally{inFlight=false}
}
function schedule(delay=100){clearTimeout(timer);timer=setTimeout(ensureStudentLinks,delay)}

function evolutionChart(points){
  if(!points.length)return '<div class="gplus-evolution-empty">A evolução aparecerá após a primeira atividade entregue.</div>';
  const w=620,h=145,padX=28,padY=18;
  const coords=points.map((p,i)=>{const x=points.length===1?w/2:padX+i*(w-padX*2)/(points.length-1);const y=padY+(100-num(p.pct))*(h-padY*2)/100;return{x,y,pct:num(p.pct)}});
  const line=coords.map(p=>`${p.x},${p.y}`).join(' ');
  const dots=coords.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--primary)"/><text x="${p.x}" y="${Math.max(12,p.y-9)}" text-anchor="middle" font-size="11" fill="currentColor">${p.pct}%</text>`).join('');
  return `<div class="gplus-evolution-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolução do aproveitamento"><line x1="${padX}" y1="${padY}" x2="${w-padX}" y2="${padY}" stroke="var(--line)"/><line x1="${padX}" y1="${h/2}" x2="${w-padX}" y2="${h/2}" stroke="var(--line)"/><line x1="${padX}" y1="${h-padY}" x2="${w-padX}" y2="${h-padY}" stroke="var(--line)"/><polyline points="${line}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg><div class="gplus-evolution-labels">${points.map(p=>`<div title="${esc(p.title)}">${esc(p.title)}</div>`).join('')}</div></div>`;
}

function renderProfile(data){
  const student=data?.student||{},s=data?.summary||{},evo=Array.isArray(data?.evolution)?data.evolution:[],subjects=Array.isArray(data?.subjects)?data.subjects:[],history=Array.isArray(data?.history)?data.history:[];
  const title=document.getElementById('gplusTeacherStudentProfileTitle');
  const meta=document.getElementById('gplusTeacherStudentProfileMeta');
  const body=document.getElementById('gplusTeacherStudentProfileBody');
  if(title)title.textContent=student.display_name||'Aluno';
  if(meta)meta.textContent=`Na turma desde ${fmtDate(student.joined_at)}`;
  const delta=num(s.evolution_delta);const deltaText=delta>0?`+${delta} pp`:delta<0?`${delta} pp`:'0 pp';
  const subjectHtml=subjects.slice(0,6).map(item=>`<div class="gplus-subject-row"><div class="gplus-subject-top"><div><strong>${esc(item.subject)}</strong><div class="gplus-subject-meta">${num(item.error_count)} erro(s) · ${num(item.answered_count)} resposta(s)</div></div><b>${num(item.pct)}%</b></div><div class="gplus-subject-bar"><span style="width:${Math.max(0,Math.min(100,num(item.pct)))}%"></span></div></div>`).join('');
  const statusLabel={submitted:'Entregue',in_progress:'Em andamento',pending:'Pendente'};
  const historyHtml=history.map(item=>`<div class="gplus-history-item"><div class="gplus-history-top"><div><strong>${esc(item.title)}</strong><div class="gplus-history-meta">${item.status==='submitted'?`Entregue ${fmtDateTime(item.submitted_at)}`:item.status==='in_progress'?`Iniciada ${fmtDateTime(item.started_at)}`:item.due_at?`Prazo ${fmtDateTime(item.due_at)}`:'Ainda não iniciada'}${item.duration_minutes!=null?` · ${num(item.duration_minutes)} min`:''}</div></div><div class="gplus-history-right">${item.pct!=null?`<span class="gplus-history-score">${num(item.pct)}%</span>`:''}<span class="gplus-history-status ${esc(item.status)}">${statusLabel[item.status]||item.status}</span></div></div></div>`).join('');
  if(body)body.innerHTML=`
    <div class="gplus-student-summary">
      <div class="gplus-student-kpi"><span>Média geral</span><strong>${num(s.average_pct)}%</strong><small>atividades entregues</small></div>
      <div class="gplus-student-kpi"><span>Entregues</span><strong>${num(s.submitted_count)}/${num(s.total_assignments)}</strong><small>${num(s.pending_count)} pendente(s)</small></div>
      <div class="gplus-student-kpi"><span>Melhor resultado</span><strong>${num(s.best_pct)}%</strong><small>melhor atividade</small></div>
      <div class="gplus-student-kpi"><span>Último resultado</span><strong>${num(s.last_pct)}%</strong><small>atividade mais recente</small></div>
      <div class="gplus-student-kpi"><span>Evolução</span><strong>${deltaText}</strong><small>primeira → última entrega</small></div>
    </div>
    <div class="gplus-student-grid">
      <section class="gplus-student-section"><div class="gplus-student-section-head"><strong>Evolução nas atividades</strong><span>aproveitamento por entrega</span></div>${evolutionChart(evo)}</section>
      <section class="gplus-student-section"><div class="gplus-student-section-head"><strong>Matérias com mais dificuldade</strong><span>menor aproveitamento primeiro</span></div><div class="gplus-subject-list">${subjectHtml||'<div class="gplus-profile-empty">Ainda não há respostas suficientes para analisar matérias.</div>'}</div></section>
    </div>
    <section class="gplus-student-section" style="margin-top:12px"><div class="gplus-student-section-head"><strong>Histórico de atividades</strong><span>entregues, em andamento e pendentes</span></div><div class="gplus-student-history">${historyHtml||'<div class="gplus-profile-empty">Nenhuma atividade disponível nesta turma.</div>'}</div></section>`;
}

async function openProfile(classroomId,studentId){
  const client=getClient();if(!client){notify('Não foi possível acessar os dados do aluno agora.');return}
  openModal();const body=document.getElementById('gplusTeacherStudentProfileBody');if(body)body.innerHTML='<div class="notice">Montando o perfil do aluno…</div>';
  try{const {data,error}=await client.rpc('get_teacher_student_dashboard',{p_classroom_id:classroomId,p_student_id:studentId});if(error)throw error;renderProfile(data||{})}catch(error){console.error('[Gabarito+] perfil individual:',error);if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível carregar o perfil.</strong><br>${esc(error?.message||error)}</div>`}
}

function onClick(event){
  const btn=event.target.closest?.('[data-open-student-profile]');
  if(btn){openProfile(btn.dataset.classroomId,btn.dataset.openStudentProfile);return}
  const row=event.target.closest?.('.gplus-student-row');
  if(row&&event.target.closest?.('strong[data-gplus-student-name]'))openProfile(row.dataset.gplusClassroomId,row.dataset.gplusStudentId);
}
function init(){ensureStyle();ensureModal();document.addEventListener('click',onClick);const observer=new MutationObserver(()=>schedule());observer.observe(document.body,{childList:true,subtree:true});schedule(40)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
