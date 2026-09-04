(function(){
'use strict';
if(window.__GABARITO_TEACHER_STUDENT_PROFILE_V2__)return;
window.__GABARITO_TEACHER_STUDENT_PROFILE_V2__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=value=>Number.isFinite(Number(value))?Number(value):0;
let timer=null,loading=false,lastClassroom='',membersCache=[];

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}
function icons(){if(window.lucide)window.lucide.createIcons()}
function fmtDate(value){return value?new Date(value).toLocaleDateString('pt-BR'):'—'}
function fmtDateTime(value){return value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—'}
function notify(message){if(typeof window.toast==='function')window.toast(message);else alert(message)}

function ensureStyles(){
  if(document.getElementById('gplusStudentProfileV2Style'))return;
  const style=document.createElement('style');
  style.id='gplusStudentProfileV2Style';
  style.textContent=`
    .gplus-student-row[data-gplus-profile-ready="1"]{cursor:pointer}
    .gplus-student-row[data-gplus-profile-ready="1"]>div:nth-child(2){min-width:0}
    .gplus-student-row [data-gplus-student-name]{cursor:pointer}
    .gplus-student-profile-inline{display:inline-flex!important;align-items:center;gap:6px;margin-top:7px;padding:6px 9px!important;width:auto!important;font-size:10px!important}
    .gplus-student-profile-modal{position:fixed;inset:0;z-index:280;display:none;place-items:center;padding:18px}
    .gplus-student-profile-modal.open{display:grid}
    .gplus-student-profile-backdrop{position:absolute;inset:0;background:rgba(4,8,16,.72);backdrop-filter:blur(8px)}
    .gplus-student-profile-dialog{position:relative;z-index:1;width:min(1020px,100%);max-height:92vh;overflow:auto;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:0 26px 90px rgba(0,0,0,.35);padding:20px}
    .gplus-student-profile-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:14px}
    .gplus-student-profile-head span{display:block;color:var(--primary);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
    .gplus-student-profile-head h2{margin:3px 0 0;font:800 22px 'Manrope',sans-serif;letter-spacing:-.03em}
    .gplus-student-profile-head p{margin:4px 0 0;color:var(--muted);font-size:10px}
    .gplus-student-profile-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:14px}
    .gplus-student-profile-kpi{border:1px solid var(--line);border-radius:13px;background:var(--surface-2);padding:12px}
    .gplus-student-profile-kpi span{display:block;color:var(--muted);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
    .gplus-student-profile-kpi strong{display:block;margin-top:4px;font:800 20px 'Manrope',sans-serif}
    .gplus-student-profile-kpi small{display:block;margin-top:2px;color:var(--muted);font-size:8px}
    .gplus-student-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .gplus-student-profile-section{border:1px solid var(--line);border-radius:14px;background:var(--surface-2);padding:13px;min-width:0}
    .gplus-student-profile-section h3{margin:0 0 10px;font:800 13px 'Manrope',sans-serif}
    .gplus-student-evolution,.gplus-student-subjects,.gplus-student-history-v2{display:grid;gap:8px}
    .gplus-student-evo-row,.gplus-student-subject-row,.gplus-student-history-row-v2{border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:10px}
    .gplus-student-evo-top,.gplus-student-subject-top,.gplus-student-history-top-v2{display:flex;justify-content:space-between;gap:10px;align-items:center}
    .gplus-student-evo-top strong,.gplus-student-subject-top strong,.gplus-student-history-top-v2 strong{font-size:10px}
    .gplus-student-evo-top b,.gplus-student-subject-top b,.gplus-student-history-score-v2{font:800 12px 'Manrope',sans-serif}
    .gplus-student-bar{height:6px;margin-top:7px;border-radius:999px;background:var(--line);overflow:hidden}
    .gplus-student-bar span{display:block;height:100%;border-radius:999px;background:var(--primary)}
    .gplus-student-meta-v2{margin-top:3px;color:var(--muted);font-size:8px}
    .gplus-student-status-v2{display:inline-block;padding:3px 6px;border:1px solid var(--line);border-radius:999px;font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .gplus-student-history-right-v2{display:flex;align-items:center;gap:7px;flex:0 0 auto}
    .gplus-student-profile-empty{padding:14px;border:1px dashed var(--line-2);border-radius:10px;color:var(--muted);font-size:10px;text-align:center;background:var(--surface)}
    @media(max-width:800px){.gplus-student-profile-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.gplus-student-profile-grid{grid-template-columns:1fr}}
    @media(max-width:620px){.gplus-student-profile-modal.open{align-items:end;padding:0}.gplus-student-profile-dialog{width:100%;max-height:95vh;border-radius:18px 18px 0 0;border-bottom:0;padding:15px}}
  `;
  document.head.appendChild(style);
}

function ensureModal(){
  if(document.getElementById('gplusStudentProfileModalV2'))return;
  const modal=document.createElement('div');
  modal.id='gplusStudentProfileModalV2';
  modal.className='gplus-student-profile-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="gplus-student-profile-backdrop" data-close-profile-v2></div><div class="gplus-student-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="gplusStudentProfileTitleV2"><div class="gplus-student-profile-head"><div><span>Perfil individual</span><h2 id="gplusStudentProfileTitleV2">Aluno</h2><p id="gplusStudentProfileMetaV2"></p></div><button class="icon-btn" type="button" data-close-profile-v2 aria-label="Fechar perfil do aluno">${icon('x')}</button></div><div id="gplusStudentProfileBodyV2"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-profile-v2]').forEach(el=>el.addEventListener('click',closeModal));
  icons();
}
function openModal(){ensureModal();const modal=document.getElementById('gplusStudentProfileModalV2');modal?.classList.add('open');modal?.setAttribute('aria-hidden','false')}
function closeModal(){const modal=document.getElementById('gplusStudentProfileModalV2');modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true')}

async function getMembers(classroomId){
  const client=getClient();
  if(!client)return [];
  if(lastClassroom===classroomId&&membersCache.length)return membersCache;
  const {data,error}=await client.from('classroom_members').select('user_id,joined_at').eq('classroom_id',classroomId).eq('role','student').order('joined_at',{ascending:true});
  if(error)throw error;
  lastClassroom=classroomId;
  membersCache=data||[];
  return membersCache;
}

async function hydrateRows(){
  if(loading)return;
  const select=document.getElementById('gplusTeacherClassSelect');
  const classroomId=select?.value;
  const rows=[...document.querySelectorAll('#page-classrooms .gplus-student-list > .gplus-student-row')];
  if(!classroomId||!rows.length)return;
  loading=true;
  try{
    const members=await getMembers(classroomId);
    rows.forEach((row,index)=>{
      const member=members[index];
      if(!member)return;
      row.dataset.gplusStudentId=member.user_id;
      row.dataset.gplusClassroomId=classroomId;
      row.dataset.gplusProfileReady='1';
      const info=row.children[1]||row;
      const name=info.querySelector('strong');
      if(name){name.dataset.gplusStudentName='1';name.title='Abrir perfil do aluno'}
      let button=info.querySelector('[data-open-student-profile-v2]');
      if(!button){
        button=document.createElement('button');
        button.type='button';
        button.className='btn btn-ghost btn-sm gplus-student-profile-inline';
        button.dataset.openStudentProfileV2=member.user_id;
        button.dataset.classroomId=classroomId;
        button.innerHTML=`${icon('chart-no-axes-combined')}Ver aluno`;
        info.appendChild(button);
      }else{
        button.dataset.openStudentProfileV2=member.user_id;
        button.dataset.classroomId=classroomId;
      }
    });
    icons();
  }catch(error){console.warn('[Gabarito+] perfil individual:',error?.message||error)}finally{loading=false}
}
function schedule(delay=80){clearTimeout(timer);timer=setTimeout(hydrateRows,delay)}

function statusLabel(status){return status==='submitted'?'Entregue':status==='in_progress'?'Em andamento':'Pendente'}
function renderProfile(data){
  const student=data?.student||{};
  const summary=data?.summary||{};
  const evolution=Array.isArray(data?.evolution)?data.evolution:[];
  const subjects=Array.isArray(data?.subjects)?data.subjects:[];
  const history=Array.isArray(data?.history)?data.history:[];
  const title=document.getElementById('gplusStudentProfileTitleV2');
  const meta=document.getElementById('gplusStudentProfileMetaV2');
  const body=document.getElementById('gplusStudentProfileBodyV2');
  if(title)title.textContent=student.display_name||'Aluno';
  if(meta)meta.textContent=`Na turma desde ${fmtDate(student.joined_at)}`;
  const delta=num(summary.evolution_delta);
  const deltaText=delta>0?`+${delta} pp`:delta<0?`${delta} pp`:'0 pp';
  const evolutionHtml=evolution.map(item=>`<div class="gplus-student-evo-row"><div class="gplus-student-evo-top"><strong>${esc(item.title)}</strong><b>${num(item.pct)}%</b></div><div class="gplus-student-bar"><span style="width:${Math.max(0,Math.min(100,num(item.pct)))}%"></span></div><div class="gplus-student-meta-v2">${fmtDateTime(item.submitted_at)}</div></div>`).join('');
  const subjectsHtml=subjects.slice(0,8).map(item=>`<div class="gplus-student-subject-row"><div class="gplus-student-subject-top"><strong>${esc(item.subject)}</strong><b>${num(item.pct)}%</b></div><div class="gplus-student-bar"><span style="width:${Math.max(0,Math.min(100,num(item.pct)))}%"></span></div><div class="gplus-student-meta-v2">${num(item.error_count)} erro(s) · ${num(item.correct_count)} acerto(s) · ${num(item.answered_count)} resposta(s)</div></div>`).join('');
  const historyHtml=history.map(item=>`<div class="gplus-student-history-row-v2"><div class="gplus-student-history-top-v2"><div><strong>${esc(item.title)}</strong><div class="gplus-student-meta-v2">${item.status==='submitted'?`Entregue ${fmtDateTime(item.submitted_at)}`:item.status==='in_progress'?`Iniciada ${fmtDateTime(item.started_at)}`:item.due_at?`Prazo ${fmtDateTime(item.due_at)}`:'Ainda não iniciada'}${item.duration_minutes!=null?` · ${num(item.duration_minutes)} min`:''}</div></div><div class="gplus-student-history-right-v2">${item.pct!=null?`<span class="gplus-student-history-score-v2">${num(item.pct)}%</span>`:''}<span class="gplus-student-status-v2">${statusLabel(item.status)}</span></div></div></div>`).join('');
  if(body)body.innerHTML=`
    <div class="gplus-student-profile-kpis">
      <div class="gplus-student-profile-kpi"><span>Média geral</span><strong>${num(summary.average_pct)}%</strong><small>atividades entregues</small></div>
      <div class="gplus-student-profile-kpi"><span>Entregues</span><strong>${num(summary.submitted_count)}/${num(summary.total_assignments)}</strong><small>${num(summary.pending_count)} pendente(s)</small></div>
      <div class="gplus-student-profile-kpi"><span>Melhor resultado</span><strong>${num(summary.best_pct)}%</strong><small>melhor atividade</small></div>
      <div class="gplus-student-profile-kpi"><span>Último resultado</span><strong>${num(summary.last_pct)}%</strong><small>atividade mais recente</small></div>
      <div class="gplus-student-profile-kpi"><span>Evolução</span><strong>${deltaText}</strong><small>primeira → última entrega</small></div>
    </div>
    <div class="gplus-student-profile-grid">
      <section class="gplus-student-profile-section"><h3>Evolução nas atividades</h3><div class="gplus-student-evolution">${evolutionHtml||'<div class="gplus-student-profile-empty">A evolução aparecerá após a primeira atividade entregue.</div>'}</div></section>
      <section class="gplus-student-profile-section"><h3>Matérias com mais dificuldade</h3><div class="gplus-student-subjects">${subjectsHtml||'<div class="gplus-student-profile-empty">Ainda não há respostas suficientes para analisar matérias.</div>'}</div></section>
    </div>
    <section class="gplus-student-profile-section" style="margin-top:12px"><h3>Histórico de atividades</h3><div class="gplus-student-history-v2">${historyHtml||'<div class="gplus-student-profile-empty">Nenhuma atividade disponível nesta turma.</div>'}</div></section>`;
}

async function openProfile(classroomId,studentId){
  if(!classroomId||!studentId)return;
  const client=getClient();
  if(!client){notify('Não foi possível acessar os dados do aluno agora.');return}
  openModal();
  const body=document.getElementById('gplusStudentProfileBodyV2');
  if(body)body.innerHTML='<div class="notice">Montando o perfil do aluno…</div>';
  try{
    const {data,error}=await client.rpc('get_teacher_student_dashboard',{p_classroom_id:classroomId,p_student_id:studentId});
    if(error)throw error;
    renderProfile(data||{});
  }catch(error){
    console.error('[Gabarito+] perfil individual:',error);
    if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível carregar o perfil.</strong><br>${esc(error?.message||error)}</div>`;
  }
}

function onClick(event){
  const button=event.target.closest?.('[data-open-student-profile-v2]');
  if(button){event.preventDefault();event.stopPropagation();openProfile(button.dataset.classroomId,button.dataset.openStudentProfileV2);return}
  const name=event.target.closest?.('[data-gplus-student-name]');
  if(name){const row=name.closest('.gplus-student-row');if(row)openProfile(row.dataset.gplusClassroomId,row.dataset.gplusStudentId)}
}

function init(){
  ensureStyles();ensureModal();
  document.addEventListener('click',onClick);
  document.addEventListener('change',event=>{if(event.target?.id==='gplusTeacherClassSelect'){lastClassroom='';membersCache=[];schedule(100)}});
  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.body,{childList:true,subtree:true});
  schedule(30);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
