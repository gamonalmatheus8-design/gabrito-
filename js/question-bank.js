(function(){
const CUSTOM='study_admin_questions_v3',DISABLED='study_admin_disabled_v3';
function load(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function raw(){return [...(window.ENEM_QUESTIONS||[]),...(window.PISM_QUESTIONS||[])]}
function localCustom(){const v=load(CUSTOM,[]);return Array.isArray(v)?v:[]}
function serverCustom(){const v=window.SERVER_EDITORIAL?.custom;return Array.isArray(v)?v:[]}
function custom(){const map=new Map(serverCustom().map(q=>[String(q.id),{...q}]));for(const q of localCustom())if(q&&q.id)map.set(String(q.id),{...q});return [...map.values()]}
function disabled(){const local=load(DISABLED,[]),server=Array.isArray(window.SERVER_EDITORIAL?.disabled)?window.SERVER_EDITORIAL.disabled:[];return [...new Set([...server,...(Array.isArray(local)?local:[])].map(String))]}
function statusOf(q){return String(q?.editorialStatus||'publicada').toLowerCase()}
function isPublished(q){return statusOf(q)==='publicada'}
function merged(){
  const map=new Map(raw().map(q=>[String(q.id),{...q}]));
  for(const q of custom()) if(q&&q.id) map.set(String(q.id),{...q});
  return [...map.values()];
}
function getAll(){const off=new Set(disabled().map(String));return merged().filter(q=>!off.has(String(q.id))&&isPublished(q))}
function getEditorialAll(){const off=new Set(disabled().map(String));return merged().map(q=>({...q,_disabled:off.has(String(q.id))}))}
function validateQuestion(q){
  const errors=[];
  if(!q||typeof q!=='object')return['Questão inválida.'];
  for(const k of ['id','exam','area','subject','topic','difficulty','text','skill','explanation']) if(!String(q[k]??'').trim()) errors.push(`Campo obrigatório: ${k}.`);
  if(!['ENEM','PISM'].includes(q.exam))errors.push('Prova deve ser ENEM ou PISM.');
  if(q.exam==='PISM'&&!['I','II','III'].includes(String(q.module)))errors.push('PISM exige módulo I, II ou III.');
  if(!Array.isArray(q.options)||q.options.length!==5||q.options.some(x=>!String(x??'').trim()))errors.push('Informe cinco alternativas preenchidas.');
  if(Array.isArray(q.options)){const exact=q.options.map(x=>String(x).trim());if(new Set(exact).size!==exact.length)errors.push('Existem alternativas exatamente duplicadas.');}
  if(!Number.isInteger(Number(q.answer))||Number(q.answer)<0||Number(q.answer)>4)errors.push('Gabarito deve estar entre A e E.');
  if(!['Fácil','Médio','Difícil'].includes(q.difficulty))errors.push('Dificuldade inválida.');
  if(!['rascunho','revisada','publicada'].includes(statusOf(q)))errors.push('Status editorial inválido.');
  return errors;
}
function getStats(){const editorial=getEditorialAll(),active=getAll();return{editorial:editorial.length,active:active.length,disabled:editorial.filter(q=>q._disabled).length,drafts:editorial.filter(q=>statusOf(q)!=='publicada').length,custom:custom().length}}
window.QuestionBank={
  getAll,getEditorialAll,getBase:raw,getCustom:custom,getDisabled:disabled,getStats,validateQuestion,isPublished,statusOf,
  saveCustom(v){save(CUSTOM,Array.isArray(v)?v:[]);if(typeof window.syncEditorialV5==='function')window.syncEditorialV5()},
  saveDisabled(v){save(DISABLED,[...new Set((Array.isArray(v)?v:[]).map(String))]);if(typeof window.syncEditorialV5==='function')window.syncEditorialV5()},
  keys:{CUSTOM,DISABLED}
};
})();
