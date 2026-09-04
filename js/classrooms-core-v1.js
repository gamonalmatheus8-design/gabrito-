(function(){
'use strict';

const VERSION='1.0.0';
const state={
  user:null,
  classrooms:[],
  memberships:[],
  assignments:[],
  submissions:[],
  teacherClassId:null,
  teacherDetail:null,
  loading:false,
  runner:null,
  ready:false
};

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmtDate=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Sem prazo';
const now=()=>Date.now();
const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const notify=message=>typeof window.toast==='function'?window.toast(message):alert(message);

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}
function refreshIcons(){if(window.lucide)window.lucide.createIcons()}
function currentMembership(classroomId){return state.memberships.find(row=>row.classroom_id===classroomId)}
function isTeacherClass(classroom){return classroom.owner_user_id===state.user?.id||currentMembership(classroom.id)?.role==='teacher'}
function isStudentClass(classroom){return currentMembership(classroom.id)?.role==='student'}
function teacherClasses(){return state.classrooms.filter(isTeacherClass)}
function studentClasses(){return state.classrooms.filter(isStudentClass)}
function submissionFor(assignmentId){return state.submissions.find(row=>row.assignment_id===assignmentId)}
function availableAssignment(a){const t=now();return a.status==='published'&&(!a.starts_at||new Date(a.starts_at).getTime()<=t)&&(!a.due_at||new Date(a.due_at).getTime()>=t)}
function studentAssignments(){const ids=new Set(studentClasses().map(c=>c.id));return state.assignments.filter(a=>ids.has(a.classroom_id))}
function pendingAssignments(){return studentAssignments().filter(a=>availableAssignment(a)&&submissionFor(a.id)?.status!=='submitted')}

function ensureShell(){
  if(!$('gplusClassroomsNav')){
    const plan=document.querySelector('.sidebar [data-page="plan"]');
    if(plan){
      const btn=document.createElement('button');
      btn.className='nav-btn';
      btn.id='gplusClassroomsNav';
      btn.dataset.page='classrooms';
      btn.innerHTML=`${icon('users-round')}Turmas <span class="badge" id="gplusClassroomBadge"></span>`;
      btn.addEventListener('click',()=>window.go?.('classrooms'));
      plan.insertAdjacentElement('afterend',btn);
    }
  }

  if(!$('page-classrooms')){
    const main=document.querySelector('main');
    const section=document.createElement('section');
    section.className='page gplus-classrooms-page';
    section.id='page-classrooms';
    section.innerHTML=`
      <div class="header-row gplus-classrooms-head">
        <div>
          <p class="eyebrow">Escola &amp; turma</p>
          <h1>Turmas e atividades</h1>
          <p class="sub">Professor cria, aluno responde e o resultado volta para a turma automaticamente.</p>
        </div>
        <div class="header-actions"><button class="btn btn-secondary" id="gplusClassroomsRefresh">${icon('refresh-cw')}Atualizar</button></div>
      </div>
      <div id="gplusClassroomsRoot"><div class="card card-pad"><div class="notice">Carregando área de turmas…</div></div></div>`;
    main?.appendChild(section);
    $('gplusClassroomsRefresh')?.addEventListener('click',()=>loadAll(true));
  }

  if(!$('gplusAssignmentModal')){
    const modal=document.createElement('div');
    modal.className='gplus-assignment-modal';
    modal.id='gplusAssignmentModal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="gplus-assignment-backdrop" data-close-assignment></div><div class="gplus-assignment-dialog" role="dialog" aria-modal="true" aria-labelledby="gplusAssignmentTitle"><div class="gplus-assignment-top"><div><span class="gplus-kicker">Atividade da turma</span><h2 id="gplusAssignmentTitle">Atividade</h2></div><button class="icon-btn" type="button" data-close-assignment aria-label="Fechar atividade">${icon('x')}</button></div><div id="gplusAssignmentBody"></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-assignment]').forEach(el=>el.addEventListener('click',closeRunner));
  }

  if(!window.go?.__gplusClassrooms){
    const baseGo=window.go;
    if(typeof baseGo==='function'){
      const wrapped=function(page){const result=baseGo(page);if(page==='classrooms')setTimeout(()=>loadAll(false),0);return result};
      wrapped.__gplusClassrooms=true;
      window.go=wrapped;
    }
  }
  refreshIcons();
}

function renderLoggedOut(){
  const root=$('gplusClassroomsRoot');
  if(!root)return;
  root.innerHTML=`
    <div class="card gplus-empty-state">
      <div class="gplus-empty-icon">${icon('users-round')}</div>
      <h2>Entre na sua conta para usar turmas</h2>
      <p>O vínculo com professor, atividades e resultados fica associado à sua conta do Gabarito+.</p>
      <button class="btn btn-primary" type="button" id="gplusOpenAccount">${icon('log-in')}Entrar ou criar conta</button>
    </div>`;
  $('gplusOpenAccount')?.addEventListener('click',()=>window.openV5Account?.());
  updateBadge(0);
  refreshIcons();
}

function renderLoading(){
  const root=$('gplusClassroomsRoot');
  if(root)root.innerHTML='<div class="card card-pad"><div class="notice">Atualizando turmas e atividades…</div></div>';
}

function updateBadge(count){
  const badge=$('gplusClassroomBadge');
  if(!badge)return;
  badge.textContent=count>0?String(count):'';
  badge.setAttribute('aria-label',count>0?`${count} atividades pendentes`:'Nenhuma atividade pendente');
}

function render(){
  const root=$('gplusClassroomsRoot');
  if(!root)return;
  if(!state.user)return renderLoggedOut();

  const tClasses=teacherClasses();
  const sClasses=studentClasses();
  const pending=pendingAssignments();
  const submitted=studentAssignments().filter(a=>submissionFor(a.id)?.status==='submitted');
  const studentCount=state.teacherDetail?.members?.length||0;
  updateBadge(pending.length);

  root.innerHTML=`
    <div class="gplus-classroom-metrics">
      <div class="card gplus-metric"><span>Minhas turmas</span><strong>${new Set([...tClasses,...sClasses].map(c=>c.id)).size}</strong><small>${tClasses.length?`${tClasses.length} como professor`:sClasses.length?'como aluno':'nenhuma ainda'}</small></div>
      <div class="card gplus-metric"><span>Atividades pendentes</span><strong>${pending.length}</strong><small>${pending.length?'priorize as com prazo mais curto':'tudo em dia'}</small></div>
      <div class="card gplus-metric"><span>Concluídas</span><strong>${submitted.length}</strong><small>resultados vinculados à conta</small></div>
      <div class="card gplus-metric"><span>Alunos</span><strong>${studentCount}</strong><small>${state.teacherClassId?'na turma selecionada':'selecione uma turma'}</small></div>
    </div>

    <div class="gplus-classroom-grid">
      <div class="gplus-classroom-stack">
        ${renderStudentPanel(sClasses,pending)}
        ${renderStudentHistory(submitted)}
      </div>
      <div class="gplus-classroom-stack">
        ${renderTeacherPanel(tClasses)}
      </div>
    </div>`;

  bindMainActions();
  refreshIcons();
}

function renderStudentPanel(classes,pending){
  const classCards=classes.length?classes.map(c=>`<div class="gplus-class-row"><div><strong>${esc(c.name)}</strong><span>${esc(c.exam_focus==='mixed'?'ENEM + PISM':String(c.exam_focus||'').toUpperCase())}${c.school_year?` · ${c.school_year}`:''}</span></div><span class="gplus-role student">Aluno</span></div>`).join(''):'<div class="gplus-soft-empty">Você ainda não entrou em nenhuma turma.</div>';

  const pendingCards=pending.length?pending.map(a=>{
    const cls=state.classrooms.find(c=>c.id===a.classroom_id);
    const sub=submissionFor(a.id);
    return `<article class="gplus-assignment-card"><div class="gplus-assignment-meta"><span>${esc(cls?.name||'Turma')}</span><span>${a.due_at?`até ${esc(fmtDate(a.due_at))}`:'sem prazo'}</span></div><h3>${esc(a.title)}</h3>${a.description?`<p>${esc(a.description)}</p>`:''}<div class="gplus-assignment-actions"><button class="btn btn-primary btn-sm" type="button" data-start-assignment="${a.id}">${icon(sub?.status==='in_progress'?'play':'clipboard-check')}${sub?.status==='in_progress'?'Continuar':'Começar'}</button></div></article>`;
  }).join(''):'<div class="gplus-soft-empty">Nenhuma atividade pendente.</div>';

  return `<section class="card card-pad gplus-classroom-card"><div class="gplus-section-head"><div><span class="gplus-kicker">Aluno</span><h2>Minha sala</h2></div></div><form class="gplus-join-form" id="gplusJoinForm"><div><label class="label" for="gplusJoinCode">Código da turma</label><input class="field" id="gplusJoinCode" autocomplete="off" maxlength="12" placeholder="Ex.: A1B2C3D4"></div><button class="btn btn-secondary" type="submit">${icon('key-round')}Entrar</button></form><div class="separator"></div><div class="gplus-list-title">Turmas</div><div class="gplus-class-list">${classCards}</div><div class="separator"></div><div class="gplus-list-title">Para fazer</div><div class="gplus-assignment-list">${pendingCards}</div></section>`;
}

function renderStudentHistory(submittedAssignments){
  if(!submittedAssignments.length)return '';
  const cards=submittedAssignments.slice(0,8).map(a=>{
    const sub=submissionFor(a.id);
    const accuracy=sub?.question_count?Math.round((sub.correct_count/sub.question_count)*100):0;
    return `<div class="gplus-history-row"><div><strong>${esc(a.title)}</strong><span>${sub?.submitted_at?`Entregue ${esc(fmtDate(sub.submitted_at))}`:'Concluída'}</span></div><div class="gplus-history-score"><b>${accuracy}%</b><button class="link-btn" type="button" data-review-assignment="${a.id}">Revisar</button></div></div>`;
  }).join('');
  return `<section class="card card-pad gplus-classroom-card"><div class="gplus-section-head"><div><span class="gplus-kicker">Histórico</span><h2>Atividades concluídas</h2></div></div><div class="gplus-history-list">${cards}</div></section>`;
}

function renderTeacherPanel(classes){
  const classOptions=classes.map(c=>`<option value="${c.id}" ${c.id===state.teacherClassId?'selected':''}>${esc(c.name)}</option>`).join('');
  const selected=classes.find(c=>c.id===state.teacherClassId)||null;
  return `<section class="card card-pad gplus-classroom-card"><div class="gplus-section-head"><div><span class="gplus-kicker">Professor</span><h2>Gestão da turma</h2></div><button class="btn btn-secondary btn-sm" type="button" id="gplusToggleCreateClass">${icon('plus')}Nova turma</button></div>
    <form class="gplus-create-class hidden" id="gplusCreateClassForm">
      <div class="form-group"><label class="label" for="gplusClassName">Nome da turma</label><input class="field" id="gplusClassName" maxlength="120" placeholder="Ex.: 3º ano A"></div>
      <div class="field-row"><div class="form-group"><label class="label" for="gplusClassFocus">Foco</label><select class="select" id="gplusClassFocus"><option value="enem">ENEM</option><option value="pism">PISM</option><option value="mixed">ENEM + PISM</option></select></div><div class="form-group"><label class="label" for="gplusClassYear">Ano</label><input class="field" id="gplusClassYear" inputmode="numeric" value="${new Date().getFullYear()}" maxlength="4"></div></div>
      <button class="btn btn-primary" type="submit">${icon('users-round')}Criar turma</button>
    </form>
    ${classes.length?`<div class="form-group"><label class="label" for="gplusTeacherClassSelect">Turma selecionada</label><select class="select" id="gplusTeacherClassSelect">${classOptions}</select></div>${selected?renderTeacherDetail(selected):''}`:'<div class="gplus-soft-empty">Crie sua primeira turma para gerar um código de entrada, enviar atividades e acompanhar os alunos.</div>'}
  </section>`;
}

function renderTeacherDetail(classroom){
  const detail=state.teacherDetail;
  if(!detail||detail.classroomId!==classroom.id)return '<div class="gplus-soft-empty">Carregando dados da turma…</div>';
  const members=detail.members||[];
  const assignments=detail.assignments||[];
  const reports=detail.reports||{};
  const memberRows=members.length?members.map(m=>`<div class="gplus-student-row"><div class="gplus-avatar">${esc((m.display_name||'A').slice(0,1).toUpperCase())}</div><div><strong>${esc(m.display_name||'Aluno')}</strong><span>Entrou ${esc(new Date(m.joined_at).toLocaleDateString('pt-BR'))}</span></div></div>`).join(''):'<div class="gplus-soft-empty">Nenhum aluno entrou ainda. Compartilhe o código da turma.</div>';
  const assignmentRows=assignments.length?assignments.map(a=>{
    const r=reports[a.id]||{submitted:0,avg:0};
    return `<div class="gplus-teacher-assignment"><div><strong>${esc(a.title)}</strong><span>${r.submitted}/${members.length} entregas${r.submitted?` · média ${r.avg}%`:''}${a.due_at?` · prazo ${esc(fmtDate(a.due_at))}`:''}</span></div><button class="btn btn-ghost btn-sm" type="button" data-close-teacher-assignment="${a.id}" ${a.status==='closed'?'disabled':''}>${a.status==='closed'?'Encerrada':'Encerrar'}</button></div>`;
  }).join(''):'<div class="gplus-soft-empty">Nenhuma atividade publicada para esta turma.</div>';

  return `<div class="gplus-class-code"><div><span>Código da turma</span><strong>${esc(classroom.join_code)}</strong></div><button class="btn btn-secondary btn-sm" type="button" data-copy-code="${esc(classroom.join_code)}">${icon('copy')}Copiar</button></div><div class="gplus-teacher-tabs"><div><span>Alunos</span><strong>${members.length}</strong></div><div><span>Atividades</span><strong>${assignments.length}</strong></div><div><span>Entregas</span><strong>${Object.values(reports).reduce((n,r)=>n+(r.submitted||0),0)}</strong></div></div><div class="separator"></div><details class="gplus-create-assignment" open><summary>Criar atividade</summary><form id="gplusCreateAssignmentForm"><div class="form-group"><label class="label" for="gplusAssignmentName">Título</label><input class="field" id="gplusAssignmentName" maxlength="160" placeholder="Ex.: Lista de revisão — Funções"></div><div class="form-group"><label class="label" for="gplusAssignmentDescription">Orientação</label><textarea class="textarea" id="gplusAssignmentDescription" rows="2" maxlength="600" placeholder="Opcional"></textarea></div><div class="gplus-form-grid"><div class="form-group"><label class="label" for="gplusAssignmentExam">Prova</label><select class="select" id="gplusAssignmentExam"><option value="ENEM">ENEM</option><option value="PISM">PISM</option></select></div><div class="form-group"><label class="label" for="gplusAssignmentModule">Módulo</label><select class="select" id="gplusAssignmentModule"><option value="">Todos</option><option value="I">I</option><option value="II">II</option><option value="III">III</option></select></div><div class="form-group"><label class="label" for="gplusAssignmentSubject">Matéria</label><select class="select" id="gplusAssignmentSubject"><option value="">Todas</option></select></div><div class="form-group"><label class="label" for="gplusAssignmentCount">Questões</label><select class="select" id="gplusAssignmentCount"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></div></div><div class="form-group"><label class="label" for="gplusAssignmentDue">Prazo</label><input class="field" type="datetime-local" id="gplusAssignmentDue"></div><button class="btn btn-primary" type="submit">${icon('send')}Publicar atividade</button></form></details><div class="separator"></div><div class="gplus-list-title">Alunos</div><div class="gplus-student-list">${memberRows}</div><div class="separator"></div><div class="gplus-list-title">Atividades da turma</div><div class="gplus-teacher-assignment-list">${assignmentRows}</div>`;
}

function bindMainActions(){
  $('gplusJoinForm')?.addEventListener('submit',joinClassroom);
  $('gplusToggleCreateClass')?.addEventListener('click',()=>$('gplusCreateClassForm')?.classList.toggle('hidden'));
  $('gplusCreateClassForm')?.addEventListener('submit',createClassroom);
  $('gplusTeacherClassSelect')?.addEventListener('change',async event=>{state.teacherClassId=event.target.value;await loadTeacherDetail(state.teacherClassId);render()});
  $('gplusCreateAssignmentForm')?.addEventListener('submit',createAssignment);
  $('gplusAssignmentExam')?.addEventListener('change',populateAssignmentSubjects);
  $('gplusAssignmentModule')?.addEventListener('change',populateAssignmentSubjects);
  populateAssignmentSubjects();
  document.querySelectorAll('[data-start-assignment]').forEach(btn=>btn.addEventListener('click',()=>openRunner(btn.dataset.startAssignment)));
  document.querySelectorAll('[data-review-assignment]').forEach(btn=>btn.addEventListener('click',()=>openReview(btn.dataset.reviewAssignment)));
  document.querySelectorAll('[data-copy-code]').forEach(btn=>btn.addEventListener('click',()=>copyCode(btn.dataset.copyCode)));
  document.querySelectorAll('[data-close-teacher-assignment]').forEach(btn=>btn.addEventListener('click',()=>closeTeacherAssignment(btn.dataset.closeTeacherAssignment)));
}

async function resolveUser(){
  const client=getClient();
  if(!client){state.user=null;return null}
  const {data,error}=await client.auth.getUser();
  if(error&&error.name!=='AuthSessionMissingError')console.warn('[Gabarito+] Turmas auth:',error.message);
  state.user=data?.user||null;
  return state.user;
}

async function loadAll(force=false){
  ensureShell();
  if(state.loading)return;
  const root=$('gplusClassroomsRoot');
  if(force||!state.ready)renderLoading();
  state.loading=true;
  try{
    const client=getClient();
    if(!client){state.user=null;state.ready=true;renderLoggedOut();return}
    await resolveUser();
    if(!state.user){state.classrooms=[];state.memberships=[];state.assignments=[];state.submissions=[];state.teacherDetail=null;state.ready=true;renderLoggedOut();return}

    const [{data:classrooms,error:ce},{data:memberships,error:me}]=await Promise.all([
      client.from('classrooms').select('id,name,join_code,exam_focus,school_year,owner_user_id,status,created_at').eq('status','active').order('created_at',{ascending:false}),
      client.from('classroom_members').select('classroom_id,role,joined_at').eq('user_id',state.user.id)
    ]);
    if(ce)throw ce;if(me)throw me;
    state.classrooms=classrooms||[];state.memberships=memberships||[];
    const ids=state.classrooms.map(c=>c.id);
    if(ids.length){
      const [{data:assignments,error:ae},{data:submissions,error:se}]=await Promise.all([
        client.from('assignments').select('id,classroom_id,title,description,exam,module,status,starts_at,due_at,created_at').in('classroom_id',ids).order('created_at',{ascending:false}),
        client.from('assignment_submissions').select('assignment_id,student_id,status,started_at,submitted_at,correct_count,question_count,duration_ms').eq('student_id',state.user.id)
      ]);
      if(ae)throw ae;if(se)throw se;
      state.assignments=assignments||[];state.submissions=submissions||[];
    }else{state.assignments=[];state.submissions=[]}

    const t=teacherClasses();
    if(t.length){
      if(!state.teacherClassId||!t.some(c=>c.id===state.teacherClassId))state.teacherClassId=t[0].id;
      await loadTeacherDetail(state.teacherClassId);
    }else{state.teacherClassId=null;state.teacherDetail=null}
    state.ready=true;render();
  }catch(error){
    console.error('[Gabarito+] Turmas:',error);
    if(root)root.innerHTML=`<div class="card card-pad"><div class="notice"><strong>Não foi possível atualizar as turmas.</strong><br>${esc(humanError(error))}</div></div>`;
  }finally{state.loading=false}
}

async function loadTeacherDetail(classroomId){
  const client=getClient();if(!client||!state.user||!classroomId)return;
  const {data:memberRows,error:memberError}=await client.from('classroom_members').select('user_id,joined_at,role').eq('classroom_id',classroomId).eq('role','student').order('joined_at',{ascending:true});
  if(memberError)throw memberError;
  const ids=(memberRows||[]).map(row=>row.user_id);
  let profiles=[];
  if(ids.length){const {data,error}=await client.from('profiles').select('id,display_name').in('id',ids);if(error)throw error;profiles=data||[]}
  const profileMap=new Map(profiles.map(p=>[p.id,p]));
  const members=(memberRows||[]).map(row=>({user_id:row.user_id,joined_at:row.joined_at,display_name:profileMap.get(row.user_id)?.display_name||'Aluno'}));
  const {data:assignments,error:assignmentError}=await client.from('assignments').select('id,title,status,due_at,created_at').eq('classroom_id',classroomId).order('created_at',{ascending:false});
  if(assignmentError)throw assignmentError;
  const assignmentIds=(assignments||[]).map(a=>a.id);let submissions=[];
  if(assignmentIds.length){const {data,error}=await client.from('assignment_submissions').select('assignment_id,student_id,status,correct_count,question_count,submitted_at').in('assignment_id',assignmentIds);if(error)throw error;submissions=data||[]}
  const reports={};
  for(const a of assignments||[]){const rows=submissions.filter(s=>s.assignment_id===a.id&&s.status==='submitted');const scores=rows.filter(r=>r.question_count>0).map(r=>r.correct_count/r.question_count*100);reports[a.id]={submitted:rows.length,avg:scores.length?Math.round(scores.reduce((x,y)=>x+y,0)/scores.length):0}}
  state.teacherDetail={classroomId,members,assignments:assignments||[],submissions,reports};
}

async function joinClassroom(event){
  event.preventDefault();const client=getClient();const input=$('gplusJoinCode');const code=input?.value.trim().toUpperCase();
  if(!client||!state.user)return window.openV5Account?.();
  if(!/^[A-Z0-9]{6,12}$/.test(code||'')){notify('Digite um código de turma válido.');return}
  const button=event.submitter;button&&(button.disabled=true);
  try{const {data,error}=await client.functions.invoke('join-classroom',{body:{code}});if(error)throw error;if(data?.error)throw new Error(data.error);if(input)input.value='';notify(data?.already_member?'Você já faz parte desta turma.':'Turma adicionada à sua conta.');await loadAll(true)}catch(error){notify(humanError(error))}finally{button&&(button.disabled=false)}
}

async function createClassroom(event){
  event.preventDefault();const client=getClient();if(!client||!state.user)return;
  const name=$('gplusClassName')?.value.trim();const focus=$('gplusClassFocus')?.value||'mixed';const year=Number($('gplusClassYear')?.value)||new Date().getFullYear();
  if(!name||name.length<2){notify('Digite um nome para a turma.');return}
  const button=event.submitter;button&&(button.disabled=true);
  try{const {data,error}=await client.from('classrooms').insert({owner_user_id:state.user.id,name,exam_focus:focus,school_year:year}).select('id,name').single();if(error)throw error;state.teacherClassId=data.id;notify('Turma criada. O código já pode ser compartilhado.');await loadAll(true)}catch(error){notify(humanError(error))}finally{button&&(button.disabled=false)}
}

function localQuestionSubjects(exam,module){
  try{const all=window.QuestionBank?.getAll?.()||[];return [...new Set(all.filter(q=>q.exam===exam&&(!module||q.module===module)).map(q=>q.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))}catch{return[]}
}
function populateAssignmentSubjects(){
  const select=$('gplusAssignmentSubject');if(!select)return;const exam=$('gplusAssignmentExam')?.value||'ENEM';const module=exam==='PISM'?$('gplusAssignmentModule')?.value||'':'';const old=select.value;const subjects=localQuestionSubjects(exam,module);select.innerHTML='<option value="">Todas</option>'+subjects.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');if(subjects.includes(old))select.value=old;const moduleSelect=$('gplusAssignmentModule');if(moduleSelect)moduleSelect.disabled=exam!=='PISM';
}

async function createAssignment(event){
  event.preventDefault();const client=getClient();if(!client||!state.user||!state.teacherClassId)return;
  const title=$('gplusAssignmentName')?.value.trim();const description=$('gplusAssignmentDescription')?.value.trim()||'';const exam=$('gplusAssignmentExam')?.value||'ENEM';const module=exam==='PISM'?$('gplusAssignmentModule')?.value||null:null;const subject=$('gplusAssignmentSubject')?.value||null;const count=Number($('gplusAssignmentCount')?.value)||10;const dueRaw=$('gplusAssignmentDue')?.value;const due=dueRaw?new Date(dueRaw).toISOString():null;
  if(!title||title.length<2){notify('Dê um título para a atividade.');return}
  const button=event.submitter;button&&(button.disabled=true);
  try{const {data,error}=await client.rpc('create_assignment_from_filters',{p_classroom_id:state.teacherClassId,p_title:title,p_description:description,p_exam:exam,p_module:module,p_subject:subject,p_question_count:count,p_due_at:due});if(error)throw error;if(!data?.ok)throw new Error('Não foi possível criar a atividade.');notify(`Atividade publicada com ${data.question_count} questões.`);await loadAll(true)}catch(error){notify(humanError(error))}finally{button&&(button.disabled=false)}
}

async function closeTeacherAssignment(id){
  const client=getClient();if(!client)return;if(!confirm('Encerrar esta atividade? Os alunos não poderão iniciar uma nova tentativa.'))return;
  try{const {error}=await client.from('assignments').update({status:'closed'}).eq('id',id);if(error)throw error;notify('Atividade encerrada.');await loadAll(true)}catch(error){notify(humanError(error))}
}

async function copyCode(code){
  try{await navigator.clipboard.writeText(code);notify('Código da turma copiado.')}catch{notify(`Código da turma: ${code}`)}
}

async function openRunner(assignmentId){
  const client=getClient();if(!client||!state.user)return window.openV5Account?.();
  const assignment=state.assignments.find(a=>a.id===assignmentId);if(!assignment)return;
  const modal=$('gplusAssignmentModal');const body=$('gplusAssignmentBody');$('gplusAssignmentTitle').textContent=assignment.title;modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');if(body)body.innerHTML='<div class="notice">Preparando atividade…</div>';
  try{
    const {data:start,error:startError}=await client.rpc('start_assignment',{p_assignment_id:assignmentId});if(startError)throw startError;
    if(start?.status==='submitted')return openReview(assignmentId);
    const [{data:questions,error:questionError},{data:answers,error:answerError}]=await Promise.all([
      client.rpc('get_assignment_questions',{p_assignment_id:assignmentId}),
      client.from('assignment_answers').select('question_id,selected_answer').eq('assignment_id',assignmentId).eq('student_id',state.user.id)
    ]);
    if(questionError)throw questionError;if(answerError)throw answerError;if(!questions?.length)throw new Error('Esta atividade ainda não possui questões.');
    state.runner={assignmentId,assignment,questions,answers:new Map((answers||[]).map(a=>[a.question_id,a.selected_answer])),index:0,startedAt:now(),questionStartedAt:now(),saving:false};
    renderRunner();
  }catch(error){if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível abrir a atividade.</strong><br>${esc(humanError(error))}</div>`}
}

function renderRunner(){
  const body=$('gplusAssignmentBody');const r=state.runner;if(!body||!r)return;const q=r.questions[r.index];const selected=r.answers.get(q.question_id);const answered=r.answers.size;const total=r.questions.length;const progress=Math.round(answered/total*100);
  body.innerHTML=`<div class="gplus-runner-progress"><div><span>${answered}/${total} respondidas</span><strong>Questão ${r.index+1} de ${total}</strong></div><div class="progress"><span style="width:${progress}%"></span></div></div><div class="gplus-runner-meta"><span class="tag ${String(q.exam).toLowerCase()}">${esc(q.exam)}</span>${q.module?`<span class="tag">Módulo ${esc(q.module)}</span>`:''}<span class="tag">${esc(q.subject)}</span><span class="tag">${esc(q.topic)}</span></div><div class="gplus-runner-question">${esc(q.question_text)}</div><div class="options gplus-runner-options">${(Array.isArray(q.options)?q.options:[]).map((option,index)=>`<button class="option ${Number(selected)===index?'selected':''}" type="button" data-assignment-answer="${index}" ${r.saving?'disabled':''}><span class="option-letter">${String.fromCharCode(65+index)}</span><span>${esc(option)}</span></button>`).join('')}</div><div class="gplus-runner-nav"><button class="btn btn-secondary" type="button" id="gplusRunnerPrev" ${r.index===0?'disabled':''}>${icon('arrow-left')}Anterior</button><div class="gplus-runner-dots">${r.questions.map((item,index)=>`<button type="button" class="${index===r.index?'active':''} ${r.answers.has(item.question_id)?'done':''}" data-runner-index="${index}" aria-label="Ir para questão ${index+1}">${index+1}</button>`).join('')}</div><button class="btn btn-secondary" type="button" id="gplusRunnerNext" ${r.index===total-1?'disabled':''}>Próxima${icon('arrow-right')}</button></div><div class="separator"></div><div class="gplus-runner-finish"><span>${total-answered?`${total-answered} ainda sem resposta`:'Todas respondidas'}</span><button class="btn btn-primary" type="button" id="gplusRunnerFinish">${icon('check-circle-2')}Entregar atividade</button></div>`;
  body.querySelectorAll('[data-assignment-answer]').forEach(btn=>btn.addEventListener('click',()=>saveRunnerAnswer(Number(btn.dataset.assignmentAnswer))));
  body.querySelectorAll('[data-runner-index]').forEach(btn=>btn.addEventListener('click',()=>{r.index=Number(btn.dataset.runnerIndex);r.questionStartedAt=now();renderRunner()}));
  $('gplusRunnerPrev')?.addEventListener('click',()=>{if(r.index>0){r.index--;r.questionStartedAt=now();renderRunner()}});
  $('gplusRunnerNext')?.addEventListener('click',()=>{if(r.index<total-1){r.index++;r.questionStartedAt=now();renderRunner()}});
  $('gplusRunnerFinish')?.addEventListener('click',finishRunner);
  refreshIcons();
}

async function saveRunnerAnswer(index){
  const client=getClient();const r=state.runner;if(!client||!r||r.saving)return;const q=r.questions[r.index];r.saving=true;renderRunner();
  try{const {error}=await client.rpc('submit_assignment_answer',{p_assignment_id:r.assignmentId,p_question_id:q.question_id,p_selected_answer:index,p_duration_ms:Math.max(0,now()-r.questionStartedAt)});if(error)throw error;r.answers.set(q.question_id,index);if(r.index<r.questions.length-1)r.index++;r.questionStartedAt=now()}catch(error){notify(humanError(error))}finally{r.saving=false;renderRunner()}
}

async function finishRunner(){
  const client=getClient();const r=state.runner;if(!client||!r)return;const missing=r.questions.length-r.answers.size;if(missing&& !confirm(`Ainda faltam ${missing} questões. Entregar mesmo assim?`))return;const btn=$('gplusRunnerFinish');btn&&(btn.disabled=true);
  try{const {data,error}=await client.rpc('finish_assignment',{p_assignment_id:r.assignmentId,p_duration_ms:Math.max(0,now()-r.startedAt)});if(error)throw error;notify(`Atividade entregue: ${data.correct_count}/${data.question_count} acertos.`);await loadAll(true);await openReview(r.assignmentId)}catch(error){notify(humanError(error));btn&&(btn.disabled=false)}
}

async function openReview(assignmentId){
  const client=getClient();if(!client||!state.user)return;const assignment=state.assignments.find(a=>a.id===assignmentId);const modal=$('gplusAssignmentModal');const body=$('gplusAssignmentBody');if(assignment)$('gplusAssignmentTitle').textContent=assignment.title;modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');if(body)body.innerHTML='<div class="notice">Montando sua revisão…</div>';
  try{const {data,error}=await client.rpc('get_assignment_review',{p_assignment_id:assignmentId});if(error)throw error;const rows=data||[];const correct=rows.filter(r=>r.correct).length;const wrong=rows.filter(r=>!r.correct);const focus=[...new Map(wrong.map(r=>[`${r.subject}|${r.topic}`,{subject:r.subject,topic:r.topic}])).values()].slice(0,4);if(body)body.innerHTML=`<div class="gplus-review-summary"><div><span>Resultado</span><strong>${correct}/${rows.length}</strong></div><div><span>Aproveitamento</span><strong>${rows.length?Math.round(correct/rows.length*100):0}%</strong></div><div><span>Revisar</span><strong>${wrong.length}</strong></div></div>${focus.length?`<div class="gplus-review-focus"><span>Prioridades de revisão</span><div>${focus.map(f=>`<b>${esc(f.subject)} · ${esc(f.topic)}</b>`).join('')}</div></div>`:''}<div class="gplus-review-list">${rows.map((row,index)=>renderReviewRow(row,index)).join('')}</div>`;refreshIcons()}catch(error){if(body)body.innerHTML=`<div class="notice"><strong>Não foi possível abrir a revisão.</strong><br>${esc(humanError(error))}</div>`}
}

function renderReviewRow(row,index){
  const options=Array.isArray(row.options)?row.options:[];const picked=row.selected_answer==null?'Em branco':`${String.fromCharCode(65+Number(row.selected_answer))}. ${options[Number(row.selected_answer)]||''}`;const correct=`${String.fromCharCode(65+Number(row.correct_answer))}. ${options[Number(row.correct_answer)]||''}`;
  return `<article class="gplus-review-item ${row.correct?'good':'bad'}"><div class="gplus-review-item-head"><span>Questão ${index+1}</span><strong>${row.correct?'Acertou':'Revisar'}</strong></div><p>${esc(row.question_text)}</p><div class="gplus-review-answer"><span>Sua resposta</span><b>${esc(picked)}</b></div>${row.correct?'':`<div class="gplus-review-answer"><span>Resposta correta</span><b>${esc(correct)}</b></div>`}${row.explanation?`<div class="notice">${esc(row.explanation)}</div>`:''}</article>`;
}

function closeRunner(){const modal=$('gplusAssignmentModal');modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');state.runner=null}

function humanError(error){
  const raw=String(error?.message||error?.error_description||error||'Erro inesperado.');
  const map={classroom_not_found:'Código de turma não encontrado.',invalid_code:'Código de turma inválido.',assignment_closed:'O prazo desta atividade terminou.',assignment_not_started:'Esta atividade ainda não começou.',submission_not_in_progress:'Esta atividade já foi entregue ou não foi iniciada.',not_enough_questions:'Não há questões suficientes com esses filtros. Amplie matéria ou módulo.',due_date_must_be_future:'Escolha um prazo no futuro.',not_allowed:'Sua conta não tem permissão para esta ação.',not_authenticated:'Entre na sua conta para continuar.'};
  for(const [key,value] of Object.entries(map))if(raw.includes(key))return value;
  return raw.replace(/^Error:\s*/,'');
}

async function waitForApp(){
  ensureShell();
  let attempts=0;
  while(!getClient()&&attempts<80){await new Promise(resolve=>setTimeout(resolve,125));attempts++}
  if(getClient()){
    const client=getClient();
    client.auth.onAuthStateChange(()=>setTimeout(()=>loadAll(true),50));
  }
  await loadAll(false);
}

window.GabaritoClassrooms={version:VERSION,refresh:()=>loadAll(true),openAssignment:openRunner};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForApp,{once:true});else waitForApp();
})();
