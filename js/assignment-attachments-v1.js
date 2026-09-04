(function(){
'use strict';
if(window.__GABARITO_ASSIGNMENT_ATTACHMENTS_V1__)return;
window.__GABARITO_ASSIGNMENT_ATTACHMENTS_V1__=true;

const BUCKET='assignment-attachments';
const MAX_FILE_BYTES=10*1024*1024;
const MAX_FILES_PER_ASSIGNMENT=5;
const MIME_BY_EXT={
  pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt:'text/plain',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'
};
const cache=new Map();
const byId=new Map();
let timer=null,refreshing=false;
const getClient=()=>window.__ESTUDOS_SUPABASE?.client||window.estudosSupabase||null;
const notify=message=>typeof window.toast==='function'?window.toast(message):alert(message);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const icon=name=>`<i data-lucide="${name}" class="icon"></i>`;

function ensureAssets(){
  if(!document.querySelector('link[data-gplus-assignment-attachments-css]')){
    const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/assignment-attachments-v1.css?v=1.0.0';l.dataset.gplusAssignmentAttachmentsCss='1';document.head.appendChild(l);
  }
  if(!document.getElementById('gplusAttachmentInput')){
    const input=document.createElement('input');input.type='file';input.id='gplusAttachmentInput';input.hidden=true;input.multiple=true;
    input.accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp';
    input.addEventListener('change',onFilesSelected);document.body.appendChild(input);
  }
}

function formatBytes(bytes){
  const n=Number(bytes)||0;if(n<1024)return`${n} B`;if(n<1048576)return`${Math.round(n/1024)} KB`;return`${(n/1048576).toFixed(n<10485760?1:0)} MB`;
}
function extOf(name){const p=String(name||'').toLowerCase().split('.');return p.length>1?p.pop():''}
function safeStorageName(name){
  const ext=extOf(name);const raw=ext?String(name).slice(0,-(ext.length+1)):String(name);
  const base=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'arquivo';
  return`${crypto.randomUUID()}-${base}${ext?'.'+ext:''}`;
}
function visibleAssignmentIds(){
  const set=new Set();
  document.querySelectorAll('[data-start-assignment],[data-review-assignment],[data-close-teacher-assignment]').forEach(el=>{
    const id=el.dataset.startAssignment||el.dataset.reviewAssignment||el.dataset.closeTeacherAssignment;if(id)set.add(id);
  });
  return[...set];
}
function signature(list){return(list||[]).map(x=>`${x.id}:${x.file_name}:${x.size_bytes}`).join('|')}

function attachmentListHtml(list,{teacher=false,compact=false}={}){
  if(!list?.length)return'';
  return`<div class="gplus-attachment-list ${compact?'compact':''}">${list.map(a=>`<div class="gplus-attachment-item"><div class="gplus-attachment-file">${icon('paperclip')}<div><strong>${esc(a.file_name)}</strong><span>${esc(formatBytes(a.size_bytes))}</span></div></div><div class="gplus-attachment-buttons"><button type="button" class="btn btn-ghost btn-sm" data-gplus-attachment-download="${a.id}">${icon('download')}Baixar</button>${teacher?`<button type="button" class="icon-btn gplus-attachment-delete" data-gplus-attachment-delete="${a.id}" aria-label="Remover ${esc(a.file_name)}">${icon('trash-2')}</button>`:''}</div></div>`).join('')}</div>`;
}
function setHolder(holder,list,opts){
  const sig=signature(list)+(opts.teacher?'|t':'|s')+(opts.compact?'|c':'');
  if(holder.dataset.signature===sig)return;holder.dataset.signature=sig;holder.innerHTML=attachmentListHtml(list,opts);
}
function renderDom(){
  document.querySelectorAll('.gplus-teacher-assignment').forEach(row=>{
    const close=row.querySelector('[data-close-teacher-assignment]');if(!close)return;const id=close.dataset.closeTeacherAssignment;
    let actions=row.querySelector('.gplus-attachment-actions');
    if(!actions){actions=document.createElement('div');actions.className='gplus-attachment-actions';close.insertAdjacentElement('beforebegin',actions)}
    if(!actions.querySelector('[data-gplus-attachment-upload]'))actions.innerHTML=`<button type="button" class="btn btn-secondary btn-sm" data-gplus-attachment-upload="${id}">${icon('paperclip')}Anexar</button>`;
    let holder=row.querySelector('.gplus-attachment-holder');if(!holder){holder=document.createElement('div');holder.className='gplus-attachment-holder';row.appendChild(holder);row.classList.add('gplus-attachment-row')}
    setHolder(holder,cache.get(id)||[],{teacher:true});
  });
  document.querySelectorAll('.gplus-assignment-card').forEach(card=>{
    const start=card.querySelector('[data-start-assignment]');if(!start)return;const id=start.dataset.startAssignment;
    let holder=card.querySelector('.gplus-attachment-holder');if(!holder){holder=document.createElement('div');holder.className='gplus-attachment-holder student';const actions=card.querySelector('.gplus-assignment-actions');actions?.insertAdjacentElement('beforebegin',holder)}
    setHolder(holder,cache.get(id)||[],{teacher:false});
  });
  document.querySelectorAll('.gplus-history-row').forEach(row=>{
    const review=row.querySelector('[data-review-assignment]');if(!review)return;const id=review.dataset.reviewAssignment;const list=cache.get(id)||[];
    let holder=row.querySelector('.gplus-attachment-holder');if(!holder){holder=document.createElement('div');holder.className='gplus-attachment-holder compact';row.appendChild(holder);row.classList.add('gplus-attachment-row')}
    setHolder(holder,list,{teacher:false,compact:true});
  });
  if(window.lucide)window.lucide.createIcons();
}

async function refreshAttachments(){
  if(refreshing)return;ensureAssets();const client=getClient();const ids=visibleAssignmentIds();if(!client||!ids.length){renderDom();return}
  refreshing=true;
  try{
    const {data,error}=await client.from('assignment_attachments').select('id,assignment_id,file_name,storage_path,mime_type,size_bytes,created_at').in('assignment_id',ids).order('created_at',{ascending:true});
    if(error)throw error;cache.clear();byId.clear();for(const id of ids)cache.set(id,[]);for(const item of data||[]){if(!cache.has(item.assignment_id))cache.set(item.assignment_id,[]);cache.get(item.assignment_id).push(item);byId.set(item.id,item)}renderDom();
  }catch(error){console.warn('[Gabarito+] Anexos:',error?.message||error)}finally{refreshing=false}
}
function scheduleRefresh(delay=160){clearTimeout(timer);timer=setTimeout(refreshAttachments,delay)}

async function onFilesSelected(event){
  const input=event.currentTarget;const assignmentId=input.dataset.assignmentId;const files=[...(input.files||[])];input.value='';if(!assignmentId||!files.length)return;
  const client=getClient();if(!client)return;const {data:userData}=await client.auth.getUser();const user=userData?.user;if(!user){notify('Entre na conta para anexar arquivos.');return}
  const current=cache.get(assignmentId)||[];const slots=Math.max(0,MAX_FILES_PER_ASSIGNMENT-current.length);
  if(!slots){notify('Esta atividade já possui o limite de 5 anexos.');return}
  const chosen=files.slice(0,slots);if(files.length>slots)notify(`Somente ${slots} arquivo(s) serão enviados. O limite é 5 por atividade.`);
  let sent=0;
  for(const file of chosen){
    const ext=extOf(file.name),mime=MIME_BY_EXT[ext];
    if(!mime){notify(`Formato não permitido: ${file.name}`);continue}
    if(file.size<=0||file.size>MAX_FILE_BYTES){notify(`${file.name}: o arquivo deve ter até 10 MB.`);continue}
    const displayName=String(file.name||'arquivo').slice(0,180);const path=`${assignmentId}/${user.id}/${safeStorageName(file.name)}`;
    try{
      const {error:uploadError}=await client.storage.from(BUCKET).upload(path,file,{contentType:mime,cacheControl:'3600',upsert:false});if(uploadError)throw uploadError;
      const {error:metaError}=await client.from('assignment_attachments').insert({assignment_id:assignmentId,uploaded_by:user.id,file_name:displayName,storage_path:path,mime_type:mime,size_bytes:file.size});
      if(metaError){await client.storage.from(BUCKET).remove([path]).catch(()=>{});throw metaError}sent++;
    }catch(error){console.error('[Gabarito+] Falha no anexo:',error);notify(`Não foi possível enviar ${file.name}: ${error?.message||error}`)}
  }
  if(sent)notify(`${sent} anexo(s) enviado(s) para a atividade.`);await refreshAttachments();
}

async function downloadAttachment(id){
  const item=byId.get(id);const client=getClient();if(!item||!client)return;
  try{const {data,error}=await client.storage.from(BUCKET).download(item.storage_path);if(error)throw error;const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=item.file_name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}catch(error){notify(`Não foi possível baixar o anexo: ${error?.message||error}`)}
}
async function deleteAttachment(id){
  const item=byId.get(id);const client=getClient();if(!item||!client)return;if(!confirm(`Remover o anexo “${item.file_name}”?`))return;
  try{const {error:storageError}=await client.storage.from(BUCKET).remove([item.storage_path]);if(storageError)throw storageError;const {error:dbError}=await client.from('assignment_attachments').delete().eq('id',item.id);if(dbError)throw dbError;notify('Anexo removido.');await refreshAttachments()}catch(error){notify(`Não foi possível remover o anexo: ${error?.message||error}`)}
}

function onClick(event){
  const upload=event.target.closest?.('[data-gplus-attachment-upload]');if(upload){const input=document.getElementById('gplusAttachmentInput');if(input){input.dataset.assignmentId=upload.dataset.gplusAttachmentUpload;input.click()}return}
  const download=event.target.closest?.('[data-gplus-attachment-download]');if(download){downloadAttachment(download.dataset.gplusAttachmentDownload);return}
  const del=event.target.closest?.('[data-gplus-attachment-delete]');if(del){deleteAttachment(del.dataset.gplusAttachmentDelete)}
}

function init(){
  ensureAssets();document.addEventListener('click',onClick);const observer=new MutationObserver(()=>scheduleRefresh());observer.observe(document.body,{childList:true,subtree:true});
  const client=getClient();client?.auth?.onAuthStateChange?.(()=>scheduleRefresh(80));scheduleRefresh(50);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
