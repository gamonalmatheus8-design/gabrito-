(function(){
'use strict';
if(window.__GABARITO_ASSIGNMENT_ACTIONS_V2__)return;
window.__GABARITO_ASSIGNMENT_ACTIONS_V2__=true;
window.__GABARITO_ASSIGNMENT_TITLE_EDIT_V1__=true;

const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const notify=message=>typeof window.toast==='function'?window.toast(message):alert(message);
let timer=null;

function icon(name){return `<i data-lucide="${name}" class="icon"></i>`}

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
  if(window.lucide)window.lucide.createIcons();
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

function onClick(event){
  const edit=event.target.closest?.('[data-edit-assignment-title]');
  if(edit){editTitle(edit);return}
}

function init(){
  document.addEventListener('click',onClick);
  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.body,{childList:true,subtree:true});
  schedule(20);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
