(function(){
'use strict';
if(window.__GABARITO_TEACHER_STUDENT_PROFILE_V3__)return;
window.__GABARITO_TEACHER_STUDENT_PROFILE_V3__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const fmtDate=value=>value?new Date(value).toLocaleDateString('pt-BR'):'—';
const fmtDateTime=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
let decorating=false;

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}
function refreshIcons(){if(window.lucide)window.lucide.createIcons()}

function ensureStyle(){
  if(document.getElementById('gplusStudentProfileV3Style'))return;
  const style=document.createElement('style');
  style.id='gplusStudentProfileV3Style';
  style.textContent=`
    .gplus-profile-inline-action{display:inline-flex!important;align-items:center;gap:6px;margin-top:7px!important;padding:0!important;border:0!important;background:transparent!important;color:var(--primary)!important;font-size:10px!important;font-weight:800!important;cursor:pointer!important;line-height:1.35!important}
    .gplus-profile-inline-action .icon{width:13px;height:13px}
    .gplus-profile-click-name{cursor:pointer;text-decoration:none}.gplus-profile-click-name:hover{color:var(--primary)}
    .gplus-profile-v3-modal{position:fixed;inset:0;z-index:260;display:none}.gplus-profile-v3-modal.open{display:grid;place-items:center;padding:18px}
    .gplus-profile-v3-backdrop{position:absolute;inset:0;background:rgba(8,13,23,.72);backdrop-filter:blur(8px)}
    .gplus-profile-v3-dialog{position:relative;z-index:1;width:min(1040px,100%);max-height:92vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.36);padding:20px}
    .gplus-profile-v3-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:15px}.gplus-profile-v3-head span{font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--primary);font-weight:800}.gplus-profile-v3-head h2{font:800 22px 'Manrope',sans-serif;letter-spacing:-.03em;margin:3px 0 0}.gplus-profile-v3-head p{font-size:10px;color:var(--muted);margin:4px 0 0}
    .gplus-profile-v3-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:14px}.gplus-profile-v3-kpi{padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)}.gplus-profile-v3-kpi span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:800}.gplus-profile-v3-kpi strong{display:block;font:800 20px 'Manrope',sans-serif;margin-top:4px}.gplus-profile-v3-kpi small{display:block;font-size:9px;color:var(--muted);margin-top:3px}
    .gplus-profile-v3-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gplus-profile-v3-section{border:1px solid var(--line);border-radius:14px;background:var(--surface-2);padding:14px;min-width:0}.gplus-profile-v3-section h3{font:800 14px 'Manrope',sans-serif;margin:0 0 10px}.gplus-profile-v3-list{display:grid;gap:8px}.gplus-profile-v3-item{padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--surface)}.gplus-profile-v3-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.gplus-profile-v3-top strong{font-size:11px}.gplus-profile-v3-meta{font-size:9px;color:var(--muted);margin-top:3px}.gplus-profile-v3-bar{height:6px;background:var(--line);border-radius:999px;overflow:hidden;margin-top:8px}.gplus-profile-v3-bar span{display:block;height:100%;background:var(--primary);border-radius:999px}.gplus-profile-v3-history{grid-column:1/-1}.gplus-profile-v3-status{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:4px 7px;border:1px solid var(--line);border-radius:999px}.gplus-profile-v3-empty{padding:15px;border:1px dashed var(--line-2);border-radius:11px;color:var(--muted);font-size:10px;text-align:center}
    @media(max-width:820px){.gplus-profile-v3-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.gplus-profile-v3-grid{grid-template-columns:1fr}.gplus-profile-v3-history{grid-column:auto}}
    @media(max-width:620px){.gplus-profile-v3-modal.open{padding:0;align-items:end}.gplus-profile-v3-dialog{width:100%;max-height:95vh;border-radius:20px 20px 0 0;border-bottom:0;padding:16px}}
  `;
  document.head.appendChild(style);
}

function ensureModal(){
  if(document.getElementById('gplusStudentProfileV3Modal'))return;
  const modal=document.createElement('div');
  modal.id='gplusStudentProfileV3Modal';
  modal.className='gplus-profile-v3-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="gplus-profile-v3-backdrop" data-gplus-profile-close></div><div class="gplus-profile-v3-dialog" role="dialog" aria-modal="true" aria-labelledby="gplusStudentProfileV3Title"><div class="gplus-profile-v3-head"><div><span>Perfil individual</span><h2 id="gplusStudentProfileV3Title">Aluno</h2><p id="gplusStudentProfileV3Meta"></p></div><button class="icon-btn" type="button" data-gplus-profile-close aria-label="Fechar perfil do aluno">${icon('x')}</button></div><div id="gplusStudentProfileV3Body"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-gplus-profile-close]').forEach(el=>el.addEventListener('click',closeModal));
  refreshIcons();
}
function openModal(){ensureModal();const m=document.getElementById('gplusStudentProfileV3Modal');m?.classList.add('open');m?.setAttribute('aria-hidden','false')}
function closeModal(){const m=document.getElementById('gplusStudentProfileV3Modal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true')}

function decorateRows(){
  if(decorating)return;
  decorating=true;
  try{
    const classroomId=document.getElementById('gplusTeacherClassSelect')?.value||'';
    const rows=[...document.querySelectorAll('#page-classrooms .gplus-student-list .gplus-student-row')];
    rows.forEach((row,index)=>{
      const info=row.children?.[1]||row.querySelector('div:last-child');
      if(!info)return;
      row.dataset.gplusProfileRowIndex=String(index);
      row.dataset.gplusProfileClassroomId=classroomId;
      const name=info.querySelector('strong');
      if(name){name.classList.add('gplus-profile-click-name');name.dataset.gplusProfileName='1';name.title='Abrir perfil do aluno'}
      if(!info.querySelector('[data-gplus-profile-open]')){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='gplus-profile-inline-action';
        btn.dataset.gplusProfileOpen='1';
        btn.dataset.rowIndex=String(index);
        btn.dataset.classroomId=classroomId;
        btn.innerHTML=`${icon('chart-no-axes-combined')}Ver aluno`;
        info.appendChild(btn);
      }else{
        const btn=info.querySelector('[data-gplus-profile-open]');
        btn.dataset.rowIndex=String(index);btn.dataset.classroomId=classroomId;
      }
    });
    refreshIcons();
  }finally{decorating=false}
}

async function resolveStudent(classroomId,index){
  const client=getClient();
  if(!client)throw new Error('Conta ainda está conectando. Atualize e tente novamente.');
  const {data,error}=await client.from('classroom_members').select('user_id,joined_at').eq('classroom_id',classroomId).eq('role','student').order('joined_at',{ascending:true});
  if(error)throw error;
  const member=(data||[])[Number(index)];
  if(!member?.user_id)throw new Error('Não foi possível identificar este aluno.');
  return member;
}

function renderProfile(data){
  const student=data?.student||{},s=data?.summary||{},subjects=Array.isArray(data?.subjects)?data.subjects:[],history=Array.isArray(data?.history)?data.history:[],evolution=Array.isArray(data?.evolution)?data.evolution:[];
  const title=document.getElementById('gplusStudentProfileV3Title');
  const meta=document.getElementById('gplusStudentProfileV3Meta');
  const body=document.getElementById('gplusStudentProfileV3Body');
  if(title)title.textContent=student.display_name||'Aluno';
  if(meta)meta.textContent=`Na turma desde ${fmtDate(student.joined_at)}`;
  const delta=num(s.evolution_delta);const deltaText=delta>0?`+${delta} pp`:delta<0?`${delta} pp`:'0 pp';
  const evolutionHtml=evolution.length?evolution.map(item=>`<div class="gplus-profile-v3-item"><div class="gplus-profile-v3-top"><strong>${esc(item.title||'Atividade')}</strong><b>${num(item.pct)}%</b></div><div class="gplus-profile-v3-bar"><span style="width:${Math.max(0,Math.min(100,num(item.pct)))}%"></span></div></div>`).join(''):'<div class="gplus-profile-v3-empty">A evolução aparecerá após as atividades entregues.</div>';
  const subjectsHtml=subjects.length?subjects.slice(0,8).map(item=>`<div class="gplus-profile-v3-item"><div class="gplus-profile-v3-top"><strong>${esc(item.subject||'Matéria')}</strong><b>${num(item.pct)}%</b></div><div class="gplus-profile-v3-meta">${num(item.error_count)} erro(s) · ${num(item.answered_count)} resposta(s)</div><div class="gplus-profile-v3-bar"><span style="width:${Math.max(0,Math.min(100,num(item.pct)))}%"></span></div></div>`).join(''):'<div class="gplus-profile-v3-empty">Ainda não há respostas suficientes para analisar matérias.</div>';
  const statusLabel={submitted:'Entregue',in_progress:'Em andamento',pending:'Pendente'};
  const historyHtml=history.length?history.map(item=>`<div class="gplus-profile-v3-item"><div class="gplus-profile-v3-top"><div><strong>${esc(item.title||'Atividade')}</strong><div class="gplus-profile-v3-meta">${item.status==='submitted'?`Entregue ${fmtDateTime(item.submitted_at)}`:item.status==='in_progress'?`Iniciada ${fmtDateTime(item.started_at)}`:item.due_at?`Prazo ${fmtDateTime(item.due_at)}`:'Ainda não iniciada'}${item.duration_minutes!=null?` · ${num(item.duration_minutes)} min`:''}</div></div><div style="display:flex;align-items:center;gap:8px">${item.pct!=null?`<b>${num(item.pct)}%</b>`:''}<span class="gplus-profile-v3-status">${statusLabel[item.status]||esc(item.status||'—')}</span></div></div></div>`).join(''):'<div class="gplus-profile-v3-empty">Nenhuma atividade disponível nesta turma.</div>';
  if(body)body.innerHTML=`<div class="gplus-profile-v3-kpis"><div class="gplus-profile-v3-kpi"><span>Média geral</span><strong>${num(s.average_pct)}%</strong><small>atividades entregues</small></div><div class="gplus-profile-v3-kpi"><span>Entregues</span><strong>${num(s.submitted_count)}/${num(s.total_assignments)}</strong><small>${num(s.pending_count)} pendente(s)</small></div><div class="gplus-profile-v3-kpi"><span>Melhor resultado</span><strong>${num(s.best_pct)}%</strong><small>melhor atividade</small></div><div class="gplus-profile-v3-kpi"><span>Último resultado</span><strong>${num(s.last_pct)}%</strong><small>atividade mais recente</small></div><div class="gplus-profile-v3-kpi"><span>Evolução</span><strong>${deltaText}</strong><small>primeira → última entrega</small></div></div><div class="gplus-profile-v3-grid"><section class="gplus-profile-v3-section"><h3>Evolução nas atividades</h3><div class="gplus-profile-v3-list">${evolutionHtml}</div></section><section class="gplus-profile-v3-section"><h3>Matérias com mais dificuldade</h3><div class="gplus-profile-v3-list">${subjectsHtml}</div></section><section class="gplus-profile-v3-section gplus-profile-v3-history"><h3>Histórico de atividades</h3><div class="gplus-profile-v3-list">${historyHtml}</div></section></div>`;
}

async function openProfile(classroomId,index){
  if(!classroomId){alert('Selecione uma turma primeiro.');return}
  openModal();
  const body=document.getElementById('gplusStudentProfileV3Body');
  if(body)body.innerHTML='<div class="notice">Carregando perfil do aluno…</div>';
  try{
    const member=await resolveStudent(classroomId,index);
    const client=getClient();
    const {data,error}=await client.rpc('get_teacher_student_dashboard',{p_classroom_id:classroomId,p_student_id:member.user_id});
    if(error)throw error;
    renderProfile(data||{});
  }catch(error){
    console.error('[Gabarito+] perfil individual v3:',error);
    if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível carregar o perfil.</strong><br>${esc(error?.message||error)}</div>`;
  }
}

function onClick(event){
  const btn=event.target.closest?.('[data-gplus-profile-open]');
  if(btn){event.preventDefault();event.stopPropagation();openProfile(btn.dataset.classroomId,btn.dataset.rowIndex);return}
  const name=event.target.closest?.('[data-gplus-profile-name]');
  if(name){const row=name.closest('.gplus-student-row');openProfile(row?.dataset.gplusProfileClassroomId,row?.dataset.gplusProfileRowIndex)}
}

function init(){
  ensureStyle();ensureModal();decorateRows();
  document.addEventListener('click',onClick);
  const observer=new MutationObserver(()=>setTimeout(decorateRows,30));
  observer.observe(document.body,{subtree:true,childList:true});
  setInterval(decorateRows,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
