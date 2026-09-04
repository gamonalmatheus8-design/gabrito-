(function(){
'use strict';
if(window.__GABARITO_TEACHER_PERFORMANCE_DIRECT_V1__)return;
window.__GABARITO_TEACHER_PERFORMANCE_DIRECT_V1__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=value=>Number.isFinite(Number(value))?Number(value):0;
let timer=null;
let currentAssignmentId=null;

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}
function refreshIcons(){if(window.lucide)window.lucide.createIcons()}
function notify(message){if(typeof window.toast==='function')window.toast(message);else alert(message)}

function ensureStyle(){
  if(document.getElementById('gplusTeacherPerformanceDirectStyle'))return;
  const style=document.createElement('style');
  style.id='gplusTeacherPerformanceDirectStyle';
  style.textContent=`
    .gplus-teacher-assignment{flex-wrap:wrap}
    .gplus-performance-direct-btn{margin-left:auto;white-space:nowrap}
    .gplus-performance-modal{position:fixed;inset:0;z-index:235;display:none}
    .gplus-performance-modal.open{display:grid;place-items:center;padding:18px}
    .gplus-performance-backdrop{position:absolute;inset:0;background:rgba(10,15,25,.68);backdrop-filter:blur(8px)}
    .gplus-performance-dialog{position:relative;z-index:1;width:min(980px,100%);max-height:90vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.3);padding:20px}
    .gplus-performance-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:15px}
    .gplus-performance-top span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--primary);font-weight:800}
    .gplus-performance-top h2{font:800 21px 'Manrope',sans-serif;letter-spacing:-.03em;margin:3px 0 0}
    .gplus-performance-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:16px}
    .gplus-performance-box{padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)}
    .gplus-performance-box span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:800}
    .gplus-performance-box strong{display:block;font:800 21px 'Manrope',sans-serif;margin-top:4px}
    .gplus-performance-box small{display:block;font-size:9px;color:var(--muted);margin-top:2px}
    .gplus-performance-section{margin-top:15px}
    .gplus-performance-section-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:9px}
    .gplus-performance-section-head strong{font:800 14px 'Manrope',sans-serif}
    .gplus-performance-section-head span{font-size:10px;color:var(--muted)}
    .gplus-performance-question-list{display:grid;gap:8px}
    .gplus-performance-question{padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}
    .gplus-performance-question-top{display:flex;justify-content:space-between;gap:12px;align-items:center}
    .gplus-performance-question-top strong{font-size:11px}
    .gplus-performance-question-top b{font:800 13px 'Manrope',sans-serif}
    .gplus-performance-question-meta{font-size:9px;color:var(--muted);margin-top:3px}
    .gplus-performance-bar{height:6px;border-radius:999px;background:var(--line);overflow:hidden;margin-top:8px}
    .gplus-performance-bar span{display:block;height:100%;background:var(--primary);border-radius:999px}
    .gplus-performance-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
    .gplus-performance-empty{padding:18px;border:1px dashed var(--line-2);border-radius:13px;color:var(--muted);font-size:11px;text-align:center}
    @media(max-width:760px){.gplus-performance-modal.open{padding:0;align-items:end}.gplus-performance-dialog{width:100%;max-height:94vh;border-radius:20px 20px 0 0;border-bottom:0;padding:16px}.gplus-performance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gplus-performance-direct-btn{width:100%;margin-left:0}}
  `;
  document.head.appendChild(style);
}

function ensureModal(){
  if(document.getElementById('gplusTeacherPerformanceDirectModal'))return;
  const modal=document.createElement('div');
  modal.id='gplusTeacherPerformanceDirectModal';
  modal.className='gplus-performance-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="gplus-performance-backdrop" data-close-performance></div><div class="gplus-performance-dialog" role="dialog" aria-modal="true" aria-labelledby="gplusTeacherPerformanceDirectTitle"><div class="gplus-performance-top"><div><span>Professor</span><h2 id="gplusTeacherPerformanceDirectTitle">Desempenho da atividade</h2></div><button class="icon-btn" type="button" data-close-performance aria-label="Fechar desempenho">${icon('x')}</button></div><div id="gplusTeacherPerformanceDirectBody"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-performance]').forEach(el=>el.addEventListener('click',closeModal));
  refreshIcons();
}

function closeModal(){
  const modal=document.getElementById('gplusTeacherPerformanceDirectModal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden','true');
  currentAssignmentId=null;
}

function openModal(){
  ensureModal();
  const modal=document.getElementById('gplusTeacherPerformanceDirectModal');
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden','false');
}

function assignmentInfo(row){
  const closer=row.querySelector('[data-close-teacher-assignment]');
  const id=closer?.dataset.closeTeacherAssignment;
  const title=row.querySelector('strong')?.textContent?.trim()||'Atividade';
  return id?{id,title}:null;
}

function ensureButtons(){
  const rows=document.querySelectorAll('#page-classrooms .gplus-teacher-assignment');
  for(const row of rows){
    if(row.querySelector('.gplus-performance-direct-btn'))continue;
    const info=assignmentInfo(row);
    if(!info)continue;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='btn btn-primary btn-sm gplus-performance-direct-btn';
    btn.dataset.gplusPerformanceAssignment=info.id;
    btn.dataset.gplusPerformanceTitle=info.title;
    btn.innerHTML=`${icon('chart-column')}Ver desempenho`;
    const close=row.querySelector('[data-close-teacher-assignment]');
    if(close)row.insertBefore(btn,close);else row.appendChild(btn);
  }
  refreshIcons();
}

function schedule(delay=80){clearTimeout(timer);timer=setTimeout(ensureButtons,delay)}

async function openPerformance(button){
  const assignmentId=button.dataset.gplusPerformanceAssignment;
  const titleText=button.dataset.gplusPerformanceTitle||'Atividade';
  const client=getClient();
  if(!assignmentId||!client){notify('Não foi possível abrir o desempenho agora.');return}
  currentAssignmentId=assignmentId;
  openModal();
  const title=document.getElementById('gplusTeacherPerformanceDirectTitle');
  const body=document.getElementById('gplusTeacherPerformanceDirectBody');
  if(title)title.textContent=titleText;
  if(body)body.innerHTML='<div class="notice">Calculando o desempenho da atividade…</div>';
  try{
    const {data,error}=await client.rpc('get_teacher_assignment_statistics',{p_assignment_id:assignmentId});
    if(error)throw error;
    const stats=data||{};
    const questions=Array.isArray(stats.question_stats)?stats.question_stats:[];
    const answered=questions.filter(q=>num(q.answered_count)>0);
    const hardest=answered.slice().sort((a,b)=>num(a.correct_pct)-num(b.correct_pct)||num(a.position)-num(b.position)).slice(0,8);
    const participation=num(stats.total_students)?Math.round(num(stats.submitted_count)/num(stats.total_students)*100):0;
    const qHtml=hardest.map(q=>{
      const pct=Math.max(0,Math.min(100,num(q.correct_pct)));
      return `<div class="gplus-performance-question"><div class="gplus-performance-question-top"><div><strong>Questão ${num(q.position)} · ${esc(q.subject||'')}</strong><div class="gplus-performance-question-meta">${esc(q.topic||'Sem assunto')} · ${num(q.error_count)} erro(s) em ${num(q.answered_count)} resposta(s)</div></div><b>${pct}%</b></div><div class="gplus-performance-bar"><span style="width:${pct}%"></span></div></div>`;
    }).join('');
    if(body)body.innerHTML=`
      <div class="gplus-performance-grid">
        <div class="gplus-performance-box"><span>Entregas</span><strong>${num(stats.submitted_count)}/${num(stats.total_students)}</strong><small>${participation}% da turma</small></div>
        <div class="gplus-performance-box"><span>Média</span><strong>${num(stats.average_pct)}%</strong><small>aproveitamento da turma</small></div>
        <div class="gplus-performance-box"><span>Maior resultado</span><strong>${num(stats.highest_pct)}%</strong><small>melhor entrega</small></div>
        <div class="gplus-performance-box"><span>Menor resultado</span><strong>${num(stats.lowest_pct)}%</strong><small>entre as entregas</small></div>
        <div class="gplus-performance-box"><span>Pendentes</span><strong>${num(stats.pending_count)}</strong><small>ainda sem entrega</small></div>
        <div class="gplus-performance-box"><span>Em andamento</span><strong>${num(stats.in_progress_count)}</strong><small>atividade iniciada</small></div>
        <div class="gplus-performance-box"><span>Tempo médio</span><strong>${num(stats.average_duration_minutes)} min</strong><small>por entrega</small></div>
        <div class="gplus-performance-box"><span>Questões analisadas</span><strong>${answered.length}</strong><small>com respostas</small></div>
      </div>
      <section class="gplus-performance-section"><div class="gplus-performance-section-head"><strong>Questões com mais dificuldade</strong><span>menor taxa de acerto primeiro</span></div><div class="gplus-performance-question-list">${qHtml||'<div class="gplus-performance-empty">Ainda não há respostas suficientes para analisar as questões.</div>'}</div></section>
      <div class="gplus-performance-actions"><button class="btn btn-secondary" type="button" data-gplus-open-deliveries>${icon('clipboard-list')}Ver alunos e respostas</button></div>`;
    refreshIcons();
  }catch(error){
    console.error('[Gabarito+] desempenho da atividade:',error);
    if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível carregar o desempenho.</strong><br>${esc(error?.message||error)}</div>`;
  }
}

function openDeliveries(){
  if(!currentAssignmentId)return;
  const selector=`[data-view-submissions="${CSS.escape(currentAssignmentId)}"]`;
  const target=document.querySelector(selector);
  if(target){closeModal();target.click();return}
  notify('A lista de entregas ainda está carregando. Clique em Atualizar e tente novamente.');
}

function onClick(event){
  const performance=event.target.closest?.('[data-gplus-performance-assignment]');
  if(performance){openPerformance(performance);return}
  if(event.target.closest?.('[data-gplus-open-deliveries]')){openDeliveries();return}
}

function init(){
  ensureStyle();ensureModal();
  document.addEventListener('click',onClick);
  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.body,{childList:true,subtree:true});
  schedule(20);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
