(function(){
'use strict';
if(window.__GABARITO_ASSIGNMENT_ACTIONS_V2__)return;
window.__GABARITO_ASSIGNMENT_ACTIONS_V2__=true;
window.__GABARITO_ASSIGNMENT_TITLE_EDIT_V1__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const notify=message=>typeof window.toast==='function'?window.toast(message):alert(message);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=value=>Number.isFinite(Number(value))?Number(value):0;
let timer=null;

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}
function refreshIcons(){if(window.lucide)window.lucide.createIcons()}

function ensurePerformanceUi(){
  if(!document.getElementById('gplusAssignmentPerformanceStyle')){
    const style=document.createElement('style');
    style.id='gplusAssignmentPerformanceStyle';
    style.textContent=`
      .gplus-performance-direct-btn{white-space:nowrap}
      .gplus-assignment-performance-modal{position:fixed;inset:0;z-index:245;display:none}
      .gplus-assignment-performance-modal.open{display:grid;place-items:center;padding:18px}
      .gplus-assignment-performance-backdrop{position:absolute;inset:0;background:rgba(10,15,25,.68);backdrop-filter:blur(8px)}
      .gplus-assignment-performance-dialog{position:relative;z-index:1;width:min(980px,100%);max-height:90vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.3);padding:20px}
      .gplus-assignment-performance-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:15px}
      .gplus-assignment-performance-top span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--primary);font-weight:800}
      .gplus-assignment-performance-top h2{font:800 21px 'Manrope',sans-serif;letter-spacing:-.03em;margin:3px 0 0}
      .gplus-assignment-performance-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:16px}
      .gplus-assignment-performance-box{padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)}
      .gplus-assignment-performance-box span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:800}
      .gplus-assignment-performance-box strong{display:block;font:800 21px 'Manrope',sans-serif;margin-top:4px}
      .gplus-assignment-performance-box small{display:block;font-size:9px;color:var(--muted);margin-top:2px}
      .gplus-assignment-performance-section{margin-top:15px}
      .gplus-assignment-performance-section-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:9px}
      .gplus-assignment-performance-section-head strong{font:800 14px 'Manrope',sans-serif}
      .gplus-assignment-performance-section-head span{font-size:10px;color:var(--muted)}
      .gplus-assignment-performance-list{display:grid;gap:8px}
      .gplus-assignment-performance-question{padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}
      .gplus-assignment-performance-question-top{display:flex;justify-content:space-between;gap:12px;align-items:center}
      .gplus-assignment-performance-question-top strong{font-size:11px}
      .gplus-assignment-performance-question-top b{font:800 13px 'Manrope',sans-serif}
      .gplus-assignment-performance-question-meta{font-size:9px;color:var(--muted);margin-top:3px}
      .gplus-assignment-performance-bar{height:6px;border-radius:999px;background:var(--line);overflow:hidden;margin-top:8px}
      .gplus-assignment-performance-bar span{display:block;height:100%;background:var(--primary);border-radius:999px}
      .gplus-assignment-performance-empty{padding:18px;border:1px dashed var(--line-2);border-radius:13px;color:var(--muted);font-size:11px;text-align:center}
      @media(max-width:760px){.gplus-assignment-performance-modal.open{padding:0;align-items:end}.gplus-assignment-performance-dialog{width:100%;max-height:94vh;border-radius:20px 20px 0 0;border-bottom:0;padding:16px}.gplus-assignment-performance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gplus-performance-direct-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }
  if(!document.getElementById('gplusAssignmentPerformanceModal')){
    const modal=document.createElement('div');
    modal.id='gplusAssignmentPerformanceModal';
    modal.className='gplus-assignment-performance-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="gplus-assignment-performance-backdrop" data-close-assignment-performance></div><div class="gplus-assignment-performance-dialog" role="dialog" aria-modal="true" aria-labelledby="gplusAssignmentPerformanceTitle"><div class="gplus-assignment-performance-top"><div><span>Professor</span><h2 id="gplusAssignmentPerformanceTitle">Desempenho da atividade</h2></div><button class="icon-btn" type="button" data-close-assignment-performance aria-label="Fechar desempenho">${icon('x')}</button></div><div id="gplusAssignmentPerformanceBody"></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-assignment-performance]').forEach(el=>el.addEventListener('click',closePerformance));
  }
  refreshIcons();
}

function closePerformance(){
  const modal=document.getElementById('gplusAssignmentPerformanceModal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden','true');
}

function ensureActions(){
  document.querySelectorAll('.gplus-teacher-assignment').forEach(row=>{
    const close=row.querySelector('[data-close-teacher-assignment]');
    if(!close)return;
    const assignmentId=close.dataset.closeTeacherAssignment;

    let actions=row.querySelector('.gplus-attachment-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.className='gplus-attachment-actions';
      close.insertAdjacentElement('beforebegin',actions);
    }

    if(!actions.querySelector('[data-open-assignment-performance]')){
      const performance=document.createElement('button');
      performance.type='button';
      performance.className='btn btn-primary btn-sm gplus-performance-direct-btn';
      performance.dataset.openAssignmentPerformance=assignmentId;
      performance.innerHTML=`${icon('chart-column')}Ver desempenho`;
      actions.appendChild(performance);
    }

    if(!actions.querySelector('[data-edit-assignment-title]')){
      const edit=document.createElement('button');
      edit.type='button';
      edit.className='btn btn-ghost btn-sm gplus-edit-assignment-title';
      edit.dataset.editAssignmentTitle=assignmentId;
      edit.innerHTML=`${icon('pencil')}Editar nome`;
      actions.appendChild(edit);
    }

    if(!actions.querySelector('[data-gplus-attachment-upload]')){
      const upload=document.createElement('button');
      upload.type='button';
      upload.className='btn btn-secondary btn-sm';
      upload.dataset.gplusAttachmentUpload=assignmentId;
      upload.innerHTML=`${icon('paperclip')}Anexar`;
      actions.appendChild(upload);
    }
  });
  refreshIcons();
}

function schedule(delay=60){clearTimeout(timer);timer=setTimeout(ensureActions,delay)}

async function editTitle(button){
  const client=getClient();
  if(!client){notify('Não foi possível acessar sua conta agora.');return}
  const assignmentId=button.dataset.editAssignmentTitle;
  const row=button.closest('.gplus-teacher-assignment');
  const titleEl=row?.querySelector('strong');
  const currentTitle=String(titleEl?.textContent||'').trim();
  const nextTitle=window.prompt('Novo nome da atividade:',currentTitle);
  if(nextTitle===null)return;
  const title=nextTitle.trim();
  if(title.length<2){notify('O nome da atividade precisa ter pelo menos 2 caracteres.');return}
  if(title.length>160){notify('O nome da atividade pode ter no máximo 160 caracteres.');return}
  if(title===currentTitle)return;

  button.disabled=true;
  try{
    const {error}=await client.from('assignments').update({title}).eq('id',assignmentId);
    if(error)throw error;
    if(titleEl)titleEl.textContent=title;
    notify('Nome da atividade atualizado.');
    if(window.GabaritoClassrooms?.refresh)await window.GabaritoClassrooms.refresh();
  }catch(error){
    console.error('[Gabarito+] Editar atividade:',error);
    notify(`Não foi possível alterar o nome: ${error?.message||error}`);
  }finally{
    button.disabled=false;
    schedule();
  }
}

async function openPerformance(button){
  const client=getClient();
  const assignmentId=button.dataset.openAssignmentPerformance;
  const row=button.closest('.gplus-teacher-assignment');
  const titleText=row?.querySelector('strong')?.textContent?.trim()||'Atividade';
  if(!client||!assignmentId){notify('Não foi possível abrir o desempenho agora.');return}

  ensurePerformanceUi();
  const modal=document.getElementById('gplusAssignmentPerformanceModal');
  const title=document.getElementById('gplusAssignmentPerformanceTitle');
  const body=document.getElementById('gplusAssignmentPerformanceBody');
  if(title)title.textContent=titleText;
  if(body)body.innerHTML='<div class="notice">Calculando o desempenho da atividade…</div>';
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden','false');

  try{
    const {data,error}=await client.rpc('get_teacher_assignment_statistics',{p_assignment_id:assignmentId});
    if(error)throw error;
    const stats=data||{};
    const questions=Array.isArray(stats.question_stats)?stats.question_stats:[];
    const answered=questions.filter(q=>num(q.answered_count)>0);
    const hardest=answered.slice().sort((a,b)=>num(a.correct_pct)-num(b.correct_pct)||num(a.position)-num(b.position)).slice(0,8);
    const participation=num(stats.total_students)?Math.round(num(stats.submitted_count)/num(stats.total_students)*100):0;
    const questionHtml=hardest.map(q=>{
      const pct=Math.max(0,Math.min(100,num(q.correct_pct)));
      return `<div class="gplus-assignment-performance-question"><div class="gplus-assignment-performance-question-top"><div><strong>Questão ${num(q.position)} · ${esc(q.subject||'')}</strong><div class="gplus-assignment-performance-question-meta">${esc(q.topic||'Sem assunto')} · ${num(q.error_count)} erro(s) em ${num(q.answered_count)} resposta(s)</div></div><b>${pct}%</b></div><div class="gplus-assignment-performance-bar"><span style="width:${pct}%"></span></div></div>`;
    }).join('');

    if(body)body.innerHTML=`
      <div class="gplus-assignment-performance-grid">
        <div class="gplus-assignment-performance-box"><span>Entregas</span><strong>${num(stats.submitted_count)}/${num(stats.total_students)}</strong><small>${participation}% da turma</small></div>
        <div class="gplus-assignment-performance-box"><span>Média</span><strong>${num(stats.average_pct)}%</strong><small>aproveitamento</small></div>
        <div class="gplus-assignment-performance-box"><span>Maior resultado</span><strong>${num(stats.highest_pct)}%</strong><small>melhor entrega</small></div>
        <div class="gplus-assignment-performance-box"><span>Menor resultado</span><strong>${num(stats.lowest_pct)}%</strong><small>entre as entregas</small></div>
        <div class="gplus-assignment-performance-box"><span>Pendentes</span><strong>${num(stats.pending_count)}</strong><small>ainda sem entrega</small></div>
        <div class="gplus-assignment-performance-box"><span>Em andamento</span><strong>${num(stats.in_progress_count)}</strong><small>atividade iniciada</small></div>
        <div class="gplus-assignment-performance-box"><span>Tempo médio</span><strong>${num(stats.average_duration_minutes)} min</strong><small>por entrega</small></div>
        <div class="gplus-assignment-performance-box"><span>Questões analisadas</span><strong>${answered.length}</strong><small>com respostas</small></div>
      </div>
      <section class="gplus-assignment-performance-section"><div class="gplus-assignment-performance-section-head"><strong>Questões com mais dificuldade</strong><span>menor taxa de acerto primeiro</span></div><div class="gplus-assignment-performance-list">${questionHtml||'<div class="gplus-assignment-performance-empty">Ainda não há respostas suficientes para analisar as questões.</div>'}</div></section>`;
    refreshIcons();
  }catch(error){
    console.error('[Gabarito+] Desempenho da atividade:',error);
    if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível carregar o desempenho.</strong><br>${esc(error?.message||error)}</div>`;
  }
}

function onClick(event){
  const performance=event.target.closest?.('[data-open-assignment-performance]');
  if(performance){openPerformance(performance);return}
  const edit=event.target.closest?.('[data-edit-assignment-title]');
  if(edit){editTitle(edit);return}
}

function init(){
  ensurePerformanceUi();
  document.addEventListener('click',onClick);
  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.body,{childList:true,subtree:true});
  schedule(20);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
