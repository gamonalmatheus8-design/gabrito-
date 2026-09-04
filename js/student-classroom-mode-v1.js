(function(){
'use strict';
if(window.__GABARITO_STUDENT_CLASSROOM_MODE_V1__)return;
window.__GABARITO_STUDENT_CLASSROOM_MODE_V1__=true;

let accountRole='student';
let timer=null;
let observer=null;
const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;

function ensureStyle(){
  if(document.getElementById('gplusStudentClassroomStyle'))return;
  const style=document.createElement('style');
  style.id='gplusStudentClassroomStyle';
  style.textContent=`
    #page-classrooms.gplus-student-account .gplus-classroom-grid{grid-template-columns:minmax(0,1fr)}
    #page-classrooms.gplus-student-account .gplus-student-join-help{margin:-5px 0 14px;color:var(--muted);font-size:11px;line-height:1.55}
    #page-classrooms.gplus-student-account .gplus-join-form{padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
    #page-classrooms.gplus-student-account .gplus-join-form .btn{min-width:132px}
    #page-classrooms.gplus-student-account .gplus-classroom-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}
    @media(max-width:700px){
      #page-classrooms.gplus-student-account .gplus-classroom-metrics{grid-template-columns:1fr 1fr}
      #page-classrooms.gplus-student-account .gplus-classroom-metrics .gplus-metric:nth-child(3){grid-column:1/-1}
    }
  `;
  document.head.appendChild(style);
}

function schedule(){
  clearTimeout(timer);
  timer=setTimeout(applyRoleUI,70);
}

function applyRoleUI(){
  const page=document.getElementById('page-classrooms');
  if(!page)return;
  const grid=page.querySelector('.gplus-classroom-grid');
  const stacks=grid?[...grid.querySelectorAll(':scope > .gplus-classroom-stack')]:[];
  const metrics=[...page.querySelectorAll('.gplus-classroom-metrics .gplus-metric')];
  const joinForm=page.querySelector('#gplusJoinForm');
  const studentCard=joinForm?.closest('.gplus-classroom-card');
  const headSub=page.querySelector('.gplus-classrooms-head .sub');

  if(accountRole==='student'){
    page.classList.add('gplus-student-account');
    if(stacks[0])stacks[0].hidden=false;
    if(stacks[1])stacks[1].hidden=true;
    if(metrics[3])metrics[3].hidden=true;
    if(headSub)headSub.textContent='Entre na turma do seu professor, receba atividades e acompanhe seus resultados.';

    if(studentCard){
      const kicker=studentCard.querySelector('.gplus-kicker');
      const title=studentCard.querySelector('h2');
      if(kicker)kicker.textContent='Aluno';
      if(title)title.textContent='Entrar em uma turma';
      if(!studentCard.querySelector('.gplus-student-join-help')){
        const help=document.createElement('p');
        help.className='gplus-student-join-help';
        help.textContent='Digite o código que o professor enviou para você. Depois de entrar, as atividades da turma aparecerão aqui.';
        joinForm?.insertAdjacentElement('beforebegin',help);
      }
      const input=studentCard.querySelector('#gplusJoinCode');
      if(input){
        input.placeholder='Código enviado pelo professor';
        input.setAttribute('aria-label','Código da turma enviado pelo professor');
      }
      const button=joinForm?.querySelector('button[type="submit"]');
      if(button&&!button.dataset.studentLabelApplied){
        button.dataset.studentLabelApplied='1';
        button.innerHTML='<i data-lucide="log-in" class="icon"></i>Entrar na turma';
      }
    }
  }else{
    page.classList.remove('gplus-student-account');
    if(stacks[1])stacks[1].hidden=false;
    if(metrics[3])metrics[3].hidden=false;
  }

  if(window.lucide)window.lucide.createIcons();
}

async function resolveRole(){
  const client=getClient();
  if(!client){accountRole='student';schedule();return}
  try{
    const {data,error}=await client.rpc('get_my_account_role');
    if(error)throw error;
    accountRole=String(data||'student').toLowerCase();
  }catch(error){
    console.warn('[Gabarito+] Papel da conta em Turmas:',error?.message||error);
    accountRole='student';
  }
  schedule();
}

async function waitForClient(){
  let attempts=0;
  while(!getClient()&&attempts<80){
    await new Promise(resolve=>setTimeout(resolve,125));
    attempts++;
  }
}

async function init(){
  ensureStyle();
  observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  await waitForClient();
  const client=getClient();
  client?.auth?.onAuthStateChange?.(()=>setTimeout(resolveRole,50));
  await resolveRole();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
