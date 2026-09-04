(function(){
'use strict';
if(window.__GABARITO_TEACHER_SUBMISSIONS_V1__)return;
window.__GABARITO_TEACHER_SUBMISSIONS_V1__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmtDate=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
let timer=null;
let currentAssignment=null;

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}
function refreshIcons(){if(window.lucide)window.lucide.createIcons()}
function notify(message){if(typeof window.toast==='function')window.toast(message);else alert(message)}

function ensureStyle(){
  if(document.getElementById('gplusTeacherSubmissionStyle'))return;
  const style=document.createElement('style');
  style.id='gplusTeacherSubmissionStyle';
  style.textContent=`
    .gplus-submissions-modal{position:fixed;inset:0;z-index:215;display:none}
    .gplus-submissions-modal.open{display:grid;place-items:center;padding:18px}
    .gplus-submissions-backdrop{position:absolute;inset:0;background:rgba(10,15,25,.64);backdrop-filter:blur(7px)}
    .gplus-submissions-dialog{position:relative;z-index:1;width:min(920px,100%);max-height:90vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:20px}
    .gplus-submissions-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:15px;border-bottom:1px solid var(--line);margin-bottom:16px}
    .gplus-submissions-head h2{font:800 21px 'Manrope',sans-serif;letter-spacing:-.03em;margin:3px 0 0}
    .gplus-submissions-kicker{font-size:9px;text-transform:uppercase;letter-spacing:.11em;color:var(--primary);font-weight:800}
    .gplus-submission-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:14px}
    .gplus-submission-metric{padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)}
    .gplus-submission-metric span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:800}
    .gplus-submission-metric strong{display:block;font:800 21px 'Manrope',sans-serif;margin-top:3px}
    .gplus-submission-list{display:grid;gap:8px}
    .gplus-submission-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)}
    .gplus-submission-person{display:flex;gap:10px;align-items:center;min-width:0}
    .gplus-submission-avatar{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);font:800 12px 'Manrope',sans-serif;flex:0 0 auto}
    .gplus-submission-person strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .gplus-submission-person span{display:block;font-size:10px;color:var(--muted);margin-top:3px}
    .gplus-submission-result{display:flex;gap:10px;align-items:center}
    .gplus-submission-score{text-align:right;min-width:66px}
    .gplus-submission-score b{display:block;font:800 15px 'Manrope',sans-serif}
    .gplus-submission-score span{display:block;font-size:9px;color:var(--muted);margin-top:2px}
    .gplus-submission-pending{font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .gplus-submission-empty{padding:18px;border:1px dashed var(--line-2);border-radius:13px;color:var(--muted);font-size:11px;line-height:1.55;text-align:center}
    .gplus-review-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}
    .gplus-review-student strong{display:block;font-size:13px}
    .gplus-review-student span{display:block;font-size:10px;color:var(--muted);margin-top:3px}
    .gplus-teacher-review-list{display:grid;gap:10px}
    .gplus-teacher-review-item{padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
    .gplus-teacher-review-item.good{border-left:4px solid var(--success)}
    .gplus-teacher-review-item.bad{border-left:4px solid var(--danger)}
    .gplus-teacher-review-top{display:flex;justify-content:space-between;gap:12px;align-items:center}
    .gplus-teacher-review-top span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:800}
    .gplus-teacher-review-top strong{font-size:10px}
    .gplus-teacher-review-item.good .gplus-teacher-review-top strong{color:var(--success)}
    .gplus-teacher-review-item.bad .gplus-teacher-review-top strong{color:var(--danger)}
    .gplus-teacher-review-item p{font-size:12px;line-height:1.55;margin:10px 0;white-space:pre-line}
    .gplus-teacher-answer{padding:8px 10px;background:var(--surface);border:1px solid var(--line);border-radius:10px;margin:6px 0}
    .gplus-teacher-answer span{display:block;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:800}
    .gplus-teacher-answer b{display:block;font-size:11px;line-height:1.45;margin-top:3px}
    @media(max-width:700px){.gplus-submissions-modal.open{padding:0;align-items:end}.gplus-submissions-dialog{width:100%;max-height:94vh;border-radius:20px 20px 0 0;border-bottom:0;padding:16px}.gplus-submission-row{grid-template-columns:1fr}.gplus-submission-result{justify-content:space-between}.gplus-submission-score{text-align:left}.gplus-submission-metrics{gap:6px}.gplus-submission-metric{padding:10px}.gplus-submission-metric strong{font-size:18px}}
  `;
  document.head.appendChild(style);
}

function ensureModal(){
  if(document.getElementById('gplusTeacherSubmissionsModal'))return;
  const modal=document.createElement('div');
  modal.id='gplusTeacherSubmissionsModal';
  modal.className='gplus-submissions-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="gplus-submissions-backdrop" data-close-submissions></div><div class="gplus-submissions-dialog" role="dialog" aria-modal="true" aria-labelledby="gplusTeacherSubmissionsTitle"><div class="gplus-submissions-head"><div><span class="gplus-submissions-kicker">Resultados da turma</span><h2 id="gplusTeacherSubmissionsTitle">Entregas da atividade</h2></div><button class="icon-btn" type="button" data-close-submissions aria-label="Fechar resultados">${icon('x')}</button></div><div id="gplusTeacherSubmissionsBody"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-submissions]').forEach(el=>el.addEventListener('click',closeModal));
  refreshIcons();
}

function closeModal(){
  const modal=document.getElementById('gplusTeacherSubmissionsModal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden','true');
  currentAssignment=null;
}

function openModal(){
  ensureModal();
  const modal=document.getElementById('gplusTeacherSubmissionsModal');
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden','false');
}

function ensureButtons(){
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
    if(actions.querySelector('[data-view-submissions]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='btn btn-secondary btn-sm';
    button.dataset.viewSubmissions=assignmentId;
    button.innerHTML=`${icon('clipboard-list')}Ver entregas`;
    actions.prepend(button);
  });
  refreshIcons();
}

function schedule(delay=70){clearTimeout(timer);timer=setTimeout(ensureButtons,delay)}

function percent(submission){
  return submission?.question_count?Math.round((Number(submission.correct_count||0)/Number(submission.question_count))*100):0;
}

async function openSubmissions(assignmentId){
  const client=getClient();
  if(!client){notify('Não foi possível acessar os resultados agora.');return}
  openModal();
  const body=document.getElementById('gplusTeacherSubmissionsBody');
  const title=document.getElementById('gplusTeacherSubmissionsTitle');
  if(body)body.innerHTML='<div class="notice">Carregando entregas…</div>';
  try{
    const {data:assignment,error:assignmentError}=await client.from('assignments').select('id,title,classroom_id,due_at').eq('id',assignmentId).single();
    if(assignmentError)throw assignmentError;
    currentAssignment=assignment;
    if(title)title.textContent=assignment.title||'Entregas da atividade';

    const [{data:memberRows,error:memberError},{data:submissions,error:submissionError}]=await Promise.all([
      client.from('classroom_members').select('user_id,joined_at').eq('classroom_id',assignment.classroom_id).eq('role','student').order('joined_at',{ascending:true}),
      client.from('assignment_submissions').select('assignment_id,student_id,status,submitted_at,correct_count,question_count,duration_ms').eq('assignment_id',assignmentId)
    ]);
    if(memberError)throw memberError;if(submissionError)throw submissionError;

    const members=memberRows||[];
    const ids=members.map(row=>row.user_id);
    let profiles=[];
    if(ids.length){
      const {data,error}=await client.from('profiles').select('id,display_name').in('id',ids);
      if(error)throw error;
      profiles=data||[];
    }
    const profileMap=new Map(profiles.map(p=>[p.id,p]));
    const submissionMap=new Map((submissions||[]).map(s=>[s.student_id,s]));
    const delivered=(submissions||[]).filter(s=>s.status==='submitted');
    const average=delivered.length?Math.round(delivered.reduce((sum,s)=>sum+percent(s),0)/delivered.length):0;
    const pending=Math.max(0,members.length-delivered.length);

    const rows=members.map(member=>{
      const profile=profileMap.get(member.user_id);
      const name=profile?.display_name||'Aluno';
      const sub=submissionMap.get(member.user_id);
      const initial=esc(name.slice(0,1).toUpperCase());
      if(sub?.status==='submitted'){
        const pct=percent(sub);
        return `<div class="gplus-submission-row"><div class="gplus-submission-person"><div class="gplus-submission-avatar">${initial}</div><div><strong>${esc(name)}</strong><span>Entregue ${esc(fmtDate(sub.submitted_at))}</span></div></div><div class="gplus-submission-result"><div class="gplus-submission-score"><b>${pct}%</b><span>${Number(sub.correct_count||0)}/${Number(sub.question_count||0)} acertos</span></div><button class="btn btn-primary btn-sm" type="button" data-view-submission-review="${esc(member.user_id)}">${icon('search')}Ver respostas</button></div></div>`;
      }
      return `<div class="gplus-submission-row"><div class="gplus-submission-person"><div class="gplus-submission-avatar">${initial}</div><div><strong>${esc(name)}</strong><span>Ainda não entregou</span></div></div><span class="gplus-submission-pending">Pendente</span></div>`;
    }).join('');

    if(body)body.innerHTML=`<div class="gplus-submission-metrics"><div class="gplus-submission-metric"><span>Entregues</span><strong>${delivered.length}/${members.length}</strong></div><div class="gplus-submission-metric"><span>Média da turma</span><strong>${average}%</strong></div><div class="gplus-submission-metric"><span>Pendentes</span><strong>${pending}</strong></div></div><div class="gplus-submission-list">${rows||'<div class="gplus-submission-empty">Nenhum aluno está vinculado a esta turma ainda.</div>'}</div>`;
    refreshIcons();
  }catch(error){
    console.error('[Gabarito+] Entregas do professor:',error);
    if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível carregar as entregas.</strong><br>${esc(error?.message||error)}</div>`;
  }
}

async function openSubmissionReview(studentId){
  const client=getClient();
  if(!client||!currentAssignment)return;
  const body=document.getElementById('gplusTeacherSubmissionsBody');
  if(body)body.innerHTML='<div class="notice">Carregando respostas do aluno…</div>';
  try{
    const [{data:rows,error},{data:profile,error:profileError},{data:submission,error:submissionError}]=await Promise.all([
      client.rpc('get_teacher_submission_review',{p_assignment_id:currentAssignment.id,p_student_id:studentId}),
      client.from('profiles').select('id,display_name').eq('id',studentId).single(),
      client.from('assignment_submissions').select('correct_count,question_count,submitted_at,duration_ms').eq('assignment_id',currentAssignment.id).eq('student_id',studentId).single()
    ]);
    if(error)throw error;if(profileError)throw profileError;if(submissionError)throw submissionError;
    const questions=rows||[];
    const pct=percent(submission);
    const name=profile?.display_name||'Aluno';
    const questionHtml=questions.map((row,index)=>{
      const options=Array.isArray(row.options)?row.options:[];
      const selected=row.selected_answer==null?'Em branco':`${String.fromCharCode(65+Number(row.selected_answer))}. ${options[Number(row.selected_answer)]||''}`;
      const answer=`${String.fromCharCode(65+Number(row.correct_answer))}. ${options[Number(row.correct_answer)]||''}`;
      return `<article class="gplus-teacher-review-item ${row.correct?'good':'bad'}"><div class="gplus-teacher-review-top"><span>Questão ${index+1} · ${esc(row.subject||'')}</span><strong>${row.correct?'Acertou':'Errou'}</strong></div><p>${esc(row.question_text)}</p><div class="gplus-teacher-answer"><span>Resposta do aluno</span><b>${esc(selected)}</b></div>${row.correct?'':`<div class="gplus-teacher-answer"><span>Resposta correta</span><b>${esc(answer)}</b></div>`}${row.explanation?`<div class="notice">${esc(row.explanation)}</div>`:''}</article>`;
    }).join('');
    if(body)body.innerHTML=`<div class="gplus-review-toolbar"><button class="btn btn-secondary btn-sm" type="button" data-back-submissions>${icon('arrow-left')}Voltar às entregas</button><div class="gplus-review-student"><strong>${esc(name)} · ${pct}%</strong><span>${Number(submission.correct_count||0)}/${Number(submission.question_count||0)} acertos · entregue ${esc(fmtDate(submission.submitted_at))}</span></div></div><div class="gplus-teacher-review-list">${questionHtml||'<div class="gplus-submission-empty">Nenhuma resposta registrada.</div>'}</div>`;
    refreshIcons();
  }catch(error){
    console.error('[Gabarito+] Revisão do professor:',error);
    if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível abrir as respostas.</strong><br>${esc(error?.message||error)}</div><div style="margin-top:10px"><button class="btn btn-secondary btn-sm" type="button" data-back-submissions>Voltar</button></div>`;
  }
}

function onClick(event){
  const submissions=event.target.closest?.('[data-view-submissions]');
  if(submissions){openSubmissions(submissions.dataset.viewSubmissions);return}
  const review=event.target.closest?.('[data-view-submission-review]');
  if(review){openSubmissionReview(review.dataset.viewSubmissionReview);return}
  const back=event.target.closest?.('[data-back-submissions]');
  if(back&&currentAssignment){openSubmissions(currentAssignment.id);return}
}

function init(){
  ensureStyle();
  ensureModal();
  document.addEventListener('click',onClick);
  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.body,{childList:true,subtree:true});
  schedule(20);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
