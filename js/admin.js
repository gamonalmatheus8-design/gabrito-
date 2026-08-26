
let v5EditorialSyncTimer=null;
let v6AdminCsrf=null;
async function v6AdminSession(){if(v6AdminCsrf)return v6AdminCsrf;const r=await fetch('/api/admin/me',{credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Sessão administrativa inválida.');v6AdminCsrf=d.csrf;return v6AdminCsrf}
window.syncEditorialV5=function(){clearTimeout(v5EditorialSyncTimer);v5EditorialSyncTimer=setTimeout(async()=>{try{const csrf=await v6AdminSession(),custom=JSON.parse(localStorage.getItem('study_admin_questions_v3')||'[]'),disabled=JSON.parse(localStorage.getItem('study_admin_disabled_v3')||'[]');const r=await fetch('/api/admin/editorial',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({custom,disabled})});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'Falha ao publicar banco.')}const meta=document.getElementById('editorialMeta');if(meta)meta.textContent+=' · servidor sincronizado'}catch(e){console.error(e);alert('O painel salvou localmente, mas não conseguiu sincronizar com o servidor: '+e.message)}},250)};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let editing=null;
function all(){return QuestionBank.getEditorialAll()}
function active(){return QuestionBank.getAll()}
function refreshFilters(){
  const qs=all(),area=$('#area'),sub=$('#subject'),exam=$('#exam').value,oa=area.value,os=sub.value;
  const scope=qs.filter(q=>exam==='ALL'||q.exam===exam);
  const areas=[...new Set(scope.map(q=>q.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  area.innerHTML='<option value="ALL">Todas as áreas</option>'+areas.map(x=>`<option>${esc(x)}</option>`).join('');
  area.value=areas.includes(oa)?oa:'ALL';
  const subjects=[...new Set(scope.filter(q=>area.value==='ALL'||q.area===area.value).map(q=>q.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  sub.innerHTML='<option value="ALL">Todas as matérias</option>'+subjects.map(x=>`<option>${esc(x)}</option>`).join('');
  sub.value=subjects.includes(os)?os:'ALL';
}
function render(){
  const qs=all(),act=active(),custom=QuestionBank.getCustom(),term=$('#search').value.trim().toLowerCase(),exam=$('#exam').value,area=$('#area').value,subject=$('#subject').value;
  $('#mTotal').textContent=act.length;$('#mEnem').textContent=act.filter(q=>q.exam==='ENEM').length;$('#mPism').textContent=act.filter(q=>q.exam==='PISM').length;$('#mCustom').textContent=custom.length;
  const disabled=QuestionBank.getDisabled().length,drafts=qs.filter(q=>!QuestionBank.isPublished(q)).length;
  const meta=$('#editorialMeta');if(meta)meta.textContent=`${qs.length} registros editoriais · ${disabled} desativado(s) · ${drafts} não publicado(s)`;
  const families=new Set(qs.map(q=>`${q.exam}|${q.module||''}|${q.variantFamily||q.id}`)).size,published=qs.filter(q=>!q._disabled&&QuestionBank.isPublished(q)).length,review=qs.filter(q=>!q._disabled&&!QuestionBank.isPublished(q)).length,alerts=qs.filter(q=>QuestionBank.validateQuestion(q).length||!q.explanation||q.explanation.trim().length<25||new Set(q.options||[]).size<5).length;[['#hFamilies',families],['#hPublished',published],['#hReview',review],['#hAlerts',alerts]].forEach(([id,v])=>{const el=$(id);if(el)el.textContent=v});
  const rows=qs.filter(q=>(exam==='ALL'||q.exam===exam)&&(area==='ALL'||q.area===area)&&(subject==='ALL'||q.subject===subject)&&(!term||`${q.id} ${q.subject} ${q.topic} ${q.text}`.toLowerCase().includes(term))).slice(0,700);
  $('#table').innerHTML=rows.map(q=>`<div class="row ${q._disabled?'disabled-row':''}"><b>${esc(q.id)}</b><span>${esc(q.exam)}</span><span>${q.module?`M${esc(q.module)}`:'—'}</span><span>${esc(q.area||'—')}</span><span>${esc(q.subject)}</span><span><b>${esc(q.topic)}</b> <small class="status ${esc(QuestionBank.statusOf(q))}">${q._disabled?'desativada':esc(QuestionBank.statusOf(q))}</small><br><span class="muted">${esc(q.text.slice(0,105))}${q.text.length>105?'…':''}</span></span><button data-edit="${esc(q.id)}">${q._disabled?'Restaurar':'Editar'}</button></div>`).join('')||'<p>Nenhuma questão.</p>'
}
function open(q=null){
  editing=q;$('#editor').classList.add('open');$('#editorTitle').textContent=q?`Editar ${q.id}`:'Nova questão';
  $('#fId').value=q?.id||`CUSTOM-${Date.now()}`;$('#fExam').value=q?.exam||'ENEM';$('#fModule').value=q?.module||'';$('#fArea').value=q?.area||'';$('#fSubject').value=q?.subject||'';$('#fTopic').value=q?.topic||'';$('#fDifficulty').value=q?.difficulty||'Médio';$('#fSkill').value=q?.skill||'';$('#fText').value=q?.text||'';
  const opts=q?.options||['','','','',''];for(let i=0;i<5;i++)$('#o'+i).value=opts[i]||'';
  $('#fAnswer').value=String(q?.answer??0);$('#fStatus').value=q?.editorialStatus||'rascunho';$('#fExplanation').value=q?.explanation||'';
  $('#disableBtn').style.display=q?'inline-block':'none';$('#disableBtn').textContent=q?._disabled?'Reativar questão':'Desativar questão';
}
function data(){return{id:$('#fId').value.trim(),exam:$('#fExam').value,module:$('#fExam').value==='PISM'?($('#fModule').value||'I'):null,area:$('#fArea').value.trim(),subject:$('#fSubject').value.trim(),topic:$('#fTopic').value.trim(),difficulty:$('#fDifficulty').value,skill:$('#fSkill').value.trim(),text:$('#fText').value.trim(),options:[0,1,2,3,4].map(i=>$('#o'+i).value.trim()),answer:Number($('#fAnswer').value),explanation:$('#fExplanation').value.trim(),source:'Painel editorial V6.0',editorialStatus:$('#fStatus').value,variantFamily:editing?.variantFamily||$('#fId').value.trim(),variantType:'Personalizada'}}
function saveQ(){
  const q=data(),errors=QuestionBank.validateQuestion(q);if(errors.length)return alert(errors.join('\n'));
  if(!editing&&all().some(x=>String(x.id)===String(q.id))&&!confirm(`O ID ${q.id} já existe. Deseja sobrescrever esse registro editorial?`))return;
  const a=QuestionBank.getCustom(),i=a.findIndex(x=>String(x.id)===String(q.id));if(i>=0)a[i]=q;else a.push(q);QuestionBank.saveCustom(a);
  $('#editor').classList.remove('open');editing=null;refreshFilters();render();alert(q.editorialStatus==='publicada'?'Questão salva e publicada. Recarregue o app principal para vê-la.':'Questão salva no painel editorial. Ela só aparecerá para o estudante quando o status for “publicada”.')
}
function duplicate(){if(!editing)return;const q={...editing,id:`CUSTOM-${Date.now()}`,source:'Duplicada no painel editorial V6.0',editorialStatus:'rascunho',_disabled:false};open(q)}
function toggleDisabled(){if(!editing)return;const d=QuestionBank.getDisabled(),id=String(editing.id),isOff=d.includes(id);if(isOff){QuestionBank.saveDisabled(d.filter(x=>x!==id))}else{if(!confirm(`Desativar ${id} no banco do estudante?`))return;QuestionBank.saveDisabled([...d,id])}$('#editor').classList.remove('open');editing=null;refreshFilters();render()}
$('#newBtn').onclick=()=>open();$('#closeEditor').onclick=()=>{$('#editor').classList.remove('open');editing=null};$('#saveBtn').onclick=saveQ;$('#duplicateBtn').onclick=duplicate;$('#disableBtn').onclick=toggleDisabled;
$('#fExam').addEventListener('change',()=>{$('#fModule').disabled=$('#fExam').value!=='PISM';if($('#fExam').value!=='PISM')$('#fModule').value=''})
$('#table').onclick=e=>{const id=e.target.dataset.edit;if(!id)return;const q=all().find(x=>String(x.id)===String(id));if(q?._disabled){editing=q;toggleDisabled();return}open(q)};
['search','exam','area','subject'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',()=>{if(id==='exam'||id==='area')refreshFilters();render()}));
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({version:'6.0',exportedAt:new Date().toISOString(),custom:QuestionBank.getCustom(),disabled:QuestionBank.getDisabled()},null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='banco_editorial_v6.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#importFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result),custom=Array.isArray(d.custom)?d.custom:[],bad=custom.flatMap((q,i)=>QuestionBank.validateQuestion(q).map(msg=>`Item ${i+1}: ${msg}`));if(bad.length)return alert('Importação cancelada:\n'+bad.slice(0,12).join('\n'));if(Array.isArray(d.custom))QuestionBank.saveCustom(d.custom);if(Array.isArray(d.disabled))QuestionBank.saveDisabled(d.disabled);refreshFilters();render();alert('Banco editorial importado com sucesso.')}catch{alert('JSON inválido')}};r.readAsText(f);e.target.value=''};
refreshFilters();render();

async function loadV6AdminOps(){
  try{
    const csrf=await v6AdminSession();
    const [sr,ar,qr]=await Promise.all([fetch('/api/admin/stats',{credentials:'same-origin'}),fetch('/api/admin/audit',{credentials:'same-origin'}),fetch('/api/admin/question-analytics',{credentials:'same-origin'})]);
    const stats=await sr.json().catch(()=>({})),auditData=await ar.json().catch(()=>({})),qa=await qr.json().catch(()=>({}));
    if(sr.ok){[['#v6Users',stats.users],['#v6Synced',stats.syncedAccounts],['#v6Sessions',stats.activeSessions],['#v6ServerVersion',stats.version]].forEach(([id,v])=>{const el=$(id);if(el)el.textContent=v??'—'})}
    const list=$('#v6AuditList');if(list&&ar.ok){list.innerHTML=(auditData.events||[]).slice(0,80).map(e=>`<div class="v6-audit-row"><span>${new Date(e.at).toLocaleString('pt-BR')}</span><b>${esc(e.action)}</b><code>${esc(e.userId||'sistema')}</code></div>`).join('')||'<p class="muted">Ainda não há eventos registrados.</p>'}
    const qaBox=$('#v6QuestionAnalytics'),meta=$('#v6AnalyticsMeta');if(meta&&qr.ok)meta.textContent=`${qa.participatingUsers||0} estudante(s) com dados · ${qa.questionsWithData||0} questão(ões) analisadas`;
    if(qaBox&&qr.ok){qaBox.innerHTML=(qa.rows||[]).slice(0,30).map(r=>`<div class="v6-qa-row"><b>${esc(r.id)}</b><span>${r.wrong} erro(s) em ${r.attempts} tentativa(s)</span><span class="v6-qa-acc ${r.accuracy<45?'low':''}">${r.accuracy}% acerto</span><span>${r.users} usuário(s)</span></div>`).join('')||'<p class="muted">Ainda não há respostas sincronizadas suficientes.</p>'}
    void csrf;
  }catch(e){const list=$('#v6AuditList');if(list)list.textContent=e.message}
}
$('#v6RefreshAudit')?.addEventListener('click',loadV6AdminOps);$('#v6RefreshAnalytics')?.addEventListener('click',loadV6AdminOps);
setTimeout(loadV6AdminOps,120);
