(function(){
'use strict';
if(window.__GABARITO_TEACHER_ACTIVITY_STATS_V1__)return;
window.__GABARITO_TEACHER_ACTIVITY_STATS_V1__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let timer=null;
let currentAssignmentId=null;

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}
function refreshIcons(){if(window.lucide)window.lucide.createIcons()}
function notify(message){if(typeof window.toast==='function')window.toast(message);else alert(message)}

function ensureStyle(){
  if(document.getElementById('gplusTeacherActivityStatsStyle'))return;
  const style=document.createElement('style');
  style.id='gplusTeacherActivityStatsStyle';
  style.textContent=`
    .gplus-activity-stats-card{margin:12px 0 4px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
    .gplus-activity-stats-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}
    .gplus-activity-stats-head span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--primary);font-weight:800}
    .gplus-activity-stats-head strong{display:block;font:800 14px 'Manrope',sans-serif;margin-top:2px}
    .gplus-activity-stats-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
    .gplus-activity-stats-hint{font-size:10px;color:var(--muted);line-height:1.45;margin-top:8px}
    .gplus-stats-modal{position:fixed;inset:0;z-index:220;display:none}
    .gplus-stats-modal.open{display:grid;place-items:center;padding:18px}
    .gplus-stats-backdrop{position:absolute;inset:0;background:rgba(10,15,25,.66);backdrop-filter:blur(7px)}
    .gplus-stats-dialog{position:relative;z-index:1;width:min(980px,100%);max-height:90vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:20px}
    .gplus-stats-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:15px}
    .gplus-stats-top span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--primary);font-weight:800}
    .gplus-stats-top h2{font:800 21px 'Manrope',sans-serif;letter-spacing:-.03em;margin:3px 0 0}
    .gplus-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:15px}
    .gplus-stat-box{padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)}
    .gplus-stat-box span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:800}
    .gplus-stat-box strong{display:block;font:800 21px 'Manrope',sans-serif;margin-top:4px}
    .gplus-stat-box small{display:block;font-size:9px;color:var(--muted);margin-top:2px}
    .gplus-stats-section{margin-top:15px}
    .gplus-stats-section-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:9px}
    .gplus-stats-section-head strong{font:800 14px 'Manrope',sans-serif}
    .gplus-stats-section-head span{font-size:10px;color:var(--muted)}
    .gplus-question-stat-list{display:grid;gap:8px}
    .gplus-question-stat{padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}
    .gplus-question-stat-top{display:flex;justify-content:space-between;gap:12px;align-items:center}
    .gplus-question-stat-top strong{font-size:11px}
    .gplus-question-stat-top b{font:800 13px 'Manrope',sans-serif}
    .gplus-question-stat-meta{font-size:9px;color:var(--muted);margin-top:3px}
    .gplus-question-stat-bar{height:6px;border-radius:999px;background:var(--line);overflow:hidden;margin-top:8px}
    .gplus-question-stat-bar span{display:block;height:100%;background:var(--primary);border-radius:999px}
    .gplus-stats-empty{padding:18px;border:1px dashed var(--line-2);border-radius:13px;color:var(--muted);font-size:11px;text-align:center}
    .gplus-stats-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px;padding-top:14px;border-top:1px solid var(--line)}
    @media(max-width:760px){.gplus-activity-stats-controls{grid-template-columns:1fr}.gplus-activity-stats-controls .btn{width:100%}.gplus-stats-modal.open{padding:0;align-items:end}.gplus-stats-dialog{width:100%;max-height:94vh;border-radius:20px 20px 0 0;border-bottom:0;padding:16px}.gplus-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

function ensureModal(){
  if(document.getElementById('gplusTeacherActivityStatsModal'))return;
  const modal=document.createElement('div');
  modal.id='gplusTeacherActivityStatsModal';
  modal.className='gplus-stats-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="gplus-stats-backdrop" data-close-activity-stats></div><div class="gplus-stats-dialog" role="dialog" aria-modal="true" aria-labelledby="gplusTeacherActivityStatsTitle"><div class="gplus-stats-top"><div><span>Desempenho da atividade</span><h2 id="gplusTeacherActivityStatsTitle">Estatísticas</h2></div><button class="icon-btn" type="button" data-close-activity-stats aria-label="Fechar estatísticas">${icon('x')}</button></div><div id="gplusTeacherActivityStatsBody"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-activity-stats]').forEach(el=>el.addEventListener('click',closeModal));
  refreshIcons();
}

function openModal(){ensureModal();const modal=document.getElementById('gplusTeacherActivityStatsModal');modal?.classList.add('open');modal?.setAttribute('aria-hidden','false')}
function closeModal(){const modal=document.getElementById('gplusTeacherActivityStatsModal');modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');currentAssignmentId=null}

function getAssignmentsFromCard(card){
  return [...card.querySelectorAll('.gplus-teacher-assignment')].map(row=>{
    const close=row.querySelector('[data-close-teacher-assignment]');
    const id=close?.dataset.closeTeacherAssignment;
    const title=row.querySelector('strong')?.textContent?.trim();
    return id&&title?{id,title}:null;
  }).filter(Boolean);
}

function ensurePanel(){
  const page=document.getElementById('page-classrooms');
  if(!page)return;
  const teacherCards=[...page.querySelectorAll('.gplus-classroom-card')].filter(card=>card.querySelector('.gplus-teacher-tabs'));
  for(const card of teacherCards){
    const tabs=card.querySelector('.gplus-teacher-tabs');
    if(!tabs)continue;
    const assignments=getAssignmentsFromCard(card);
    let panel=card.querySelector('.gplus-activity-stats-card');
    if(!panel){
      panel=document.createElement('section');
      panel.className='gplus-activity-stats-card';
      tabs.insertAdjacentElement('afterend',panel);
    }
    const current=panel.querySelector('select')?.value||assignments[0]?.id||'';
    panel.innerHTML=`<div class="gplus-activity-stats-head"><div><span>Professor</span><strong>Estatísticas da atividade</strong></div>${icon('chart-no-axes-combined')}</div>${assignments.length?`<div class="gplus-activity-stats-controls"><select class="select" data-gplus-stats-assignment>${assignments.map(a=>`<option value="${esc(a.id)}" ${a.id===current?'selected':''}>${esc(a.title)}</option>`).join('')}</select><button class="btn btn-primary btn-sm" type="button" data-open-activity-stats>${icon('chart-column')}Abrir estatísticas</button></div><div class="gplus-activity-stats-hint">Veja entregas, média, maior e menor resultado, tempo médio e as questões com mais erros.</div>`:'<div class="gplus-stats-empty">Crie uma atividade para acompanhar as estatísticas da turma.</div>'}`;
  }
  refreshIcons();
}

function schedule(delay=80){clearTimeout(timer);timer=setTimeout(ensurePanel,delay)}

function number(value){const n=Number(value);return Number.isFinite(n)?n:0}

async function openStats(button){
  const card=button.closest('.gplus-classroom-card');
  const select=card?.querySelector('[data-gplus-stats-assignment]');
  const assignmentId=select?.value;
  const assignmentTitle=select?.selectedOptions?.[0]?.textContent||'Atividade';
  const client=getClient();
  if(!assignmentId||!client){notify('Não foi possível abrir as estatísticas agora.');return}
  currentAssignmentId=assignmentId;
  openModal();
  const title=document.getElementById('gplusTeacherActivityStatsTitle');
  const body=document.getElementById('gplusTeacherActivityStatsBody');
  if(title)title.textContent=assignmentTitle;
  if(body)body.innerHTML='<div class="notice">Calculando estatísticas…</div>';
  try{
    const {data,error}=await client.rpc('get_teacher_assignment_statistics',{p_assignment_id:assignmentId});
    if(error)throw error;
    const stats=data||{};
    const questions=Array.isArray(stats.question_stats)?stats.question_stats:[];
    const answeredQuestions=questions.filter(q=>number(q.answered_count)>0);
    const hardest=answeredQuestions.slice().sort((a,b)=>number(a.correct_pct)-number(b.correct_pct)||number(a.position)-number(b.position)).slice(0,6);
    const participation=number(stats.total_students)?Math.round(number(stats.submitted_count)/number(stats.total_students)*100):0;
    const questionHtml=hardest.map(q=>{
      const pct=number(q.correct_pct);
      return `<div class="gplus-question-stat"><div class="gplus-question-stat-top"><div><strong>Questão ${number(q.position)} · ${esc(q.subject||'')}</strong><div class="gplus-question-stat-meta">${esc(q.topic||'Sem assunto')} · ${number(q.error_count)} erro(s) em ${number(q.answered_count)} resposta(s)</div></div><b>${pct}%</b></div><div class="gplus-question-stat-bar" aria-label="${pct}% de acertos"><span style="width:${Math.max(0,Math.min(100,pct))}%"></span></div></div>`;
    }).join('');
    if(body)body.innerHTML=`
      <div class="gplus-stats-grid">
        <div class="gplus-stat-box"><span>Entregas</span><strong>${number(stats.submitted_count)}/${number(stats.total_students)}</strong><small>${participation}% da turma</small></div>
        <div class="gplus-stat-box"><span>Média</span><strong>${number(stats.average_pct)}%</strong><small>aproveitamento</small></div>
        <div class="gplus-stat-box"><span>Maior resultado</span><strong>${number(stats.highest_pct)}%</strong><small>melhor entrega</small></div>
        <div class="gplus-stat-box"><span>Menor resultado</span><strong>${number(stats.lowest_pct)}%</strong><small>entre as entregas</small></div>
        <div class="gplus-stat-box"><span>Pendentes</span><strong>${number(stats.pending_count)}</strong><small>ainda sem entrega</small></div>
        <div class="gplus-stat-box"><span>Em andamento</span><strong>${number(stats.in_progress_count)}</strong><small>atividade iniciada</small></div>
        <div class="gplus-stat-box"><span>Tempo médio</span><strong>${number(stats.average_duration_minutes)} min</strong><small>por entrega</small></div>
        <div class="gplus-stat-box"><span>Questões analisadas</span><strong>${answeredQuestions.length}</strong><small>com respostas</small></div>
      </div>
      <section class="gplus-stats-section"><div class="gplus-stats-section-head"><strong>Questões com mais dificuldade</strong><span>menor taxa de acerto primeiro</span></div><div class="gplus-question-stat-list">${questionHtml||'<div class="gplus-stats-empty">Ainda não há respostas suficientes para analisar as questões.</div>'}</div></section>
      <div class="gplus-stats-actions"><button class="btn btn-secondary" type="button" data-open-deliveries-from-stats>${icon('clipboard-list')}Ver entregas dos alunos</button></div>`;
    refreshIcons();
  }catch(error){
    console.error('[Gabarito+] Estatísticas da atividade:',error);
    if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível calcular as estatísticas.</strong><br>${esc(error?.message||error)}</div>`;
  }
}

function openDeliveries(){
  if(!currentAssignmentId)return;
  const target=document.querySelector(`[data-view-submissions="${CSS.escape(currentAssignmentId)}"]`);
  closeModal();
  if(target)target.click();else notify('Atualize a turma e tente abrir as entregas novamente.');
}

function onClick(event){
  const open=event.target.closest?.('[data-open-activity-stats]');
  if(open){openStats(open);return}
  if(event.target.closest?.('[data-open-deliveries-from-stats]')){openDeliveries();return}
}

function init(){
  ensureStyle();ensureModal();
  document.addEventListener('click',onClick);
  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.body,{childList:true,subtree:true});
  schedule(30);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
