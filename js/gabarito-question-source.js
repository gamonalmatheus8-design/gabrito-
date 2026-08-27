(function(root){
'use strict';
const MINIMUM={questions:3375,enem:2220,pism:1155,discursives:52};
const QUESTION_COLUMNS='id,exam,module,area,subject,topic,difficulty,text,options,answer,explanation,skill,source,editorial_status,variant_family,variant_type';
const DISCURSIVE_COLUMNS='id,module,subject,topic,prompt,rubric,editorial_status';
const PAGE_SIZE=1000;

function timeout(promise,ms){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo limite do banco de questões excedido.')),ms)})]).finally(()=>clearTimeout(timer));
}
function question(row){return{id:String(row.id),exam:row.exam,module:row.module??null,area:row.area,subject:row.subject,topic:row.topic,difficulty:row.difficulty,text:row.text,options:row.options,answer:Number(row.answer),explanation:row.explanation,skill:row.skill,source:row.source||'Banco Gabarito+',editorialStatus:row.editorial_status||'publicada',variantFamily:row.variant_family||String(row.id),variantType:row.variant_type||'Original'}}
function discursive(row){return{id:String(row.id),module:row.module,subject:row.subject,topic:row.topic,prompt:row.prompt,rubric:Array.isArray(row.rubric)?row.rubric:[]}}
function validate(questions,discursives){
  const enem=questions.filter(q=>q.exam==='ENEM').length,pism=questions.filter(q=>q.exam==='PISM').length;
  if(questions.length<MINIMUM.questions||enem<MINIMUM.enem||pism<MINIMUM.pism||discursives.length<MINIMUM.discursives)throw new Error(`Banco de questões incompleto (${questions.length} objetivas, ${discursives.length} discursivas).`);
  if(new Set(questions.map(q=>q.id)).size!==questions.length)throw new Error('Banco de questões contém IDs duplicados.');
  if(questions.some(q=>!Array.isArray(q.options)||q.options.length!==5||!Number.isInteger(q.answer)||q.answer<0||q.answer>4))throw new Error('Banco de questões contém questão inválida.');
  return{questions:questions.length,enem,pism,discursives:discursives.length};
}
function normalize(rawQuestions,rawDiscursives,metaRows){
  const questions=rawQuestions.map(question),discursives=rawDiscursives.map(discursive);
  const counts=validate(questions,discursives);
  const values=Object.fromEntries((metaRows||[]).map(x=>[x.key,x.value]));
  return{questions,discursives,counts,version:values.question_bank_version||values.app_version||null};
}

async function clientPage(client,table,columns,from,to){
  const {data,error}=await client.from(table).select(columns).eq('editorial_status','publicada').order('id',{ascending:true}).range(from,to);
  if(error)throw error;
  return Array.isArray(data)?data:[];
}
async function clientAll(client,table,columns,pageSize=PAGE_SIZE){
  const rows=[];
  for(let from=0;;from+=pageSize){const batch=await clientPage(client,table,columns,from,from+pageSize-1);rows.push(...batch);if(batch.length<pageSize)break}
  return rows;
}
async function load(client,{timeoutMs=9000}={}){
  if(!client)throw new Error('Conexão com o banco ausente.');
  return timeout((async()=>{
    const [rawQuestions,rawDiscursives,meta]=await Promise.all([
      clientAll(client,'questions',QUESTION_COLUMNS),
      clientAll(client,'pism_discursives',DISCURSIVE_COLUMNS),
      client.from('app_meta').select('key,value').in('key',['question_bank_version','app_version'])
    ]);
    if(meta.error)throw meta.error;
    return normalize(rawQuestions,rawDiscursives,meta.data||[]);
  })(),timeoutMs);
}

function restHeaders(key){return{apikey:key,authorization:`Bearer ${key}`,accept:'application/json'}}
async function restGet(base,key,path,params,signal){
  const u=new URL(`${base.replace(/\/$/,'')}/rest/v1/${path}`);
  for(const [k,v] of Object.entries(params||{}))u.searchParams.set(k,String(v));
  const r=await fetch(u,{headers:restHeaders(key),signal,cache:'no-store'});
  if(!r.ok)throw new Error(`Supabase ${path}: HTTP ${r.status}`);
  const data=await r.json();
  return Array.isArray(data)?data:[];
}
async function restAll(base,key,table,columns,signal,pageSize=PAGE_SIZE){
  const rows=[];
  for(let offset=0;;offset+=pageSize){
    const batch=await restGet(base,key,table,{select:columns,editorial_status:'eq.publicada',order:'id.asc',limit:pageSize,offset},signal);
    rows.push(...batch);
    if(batch.length<pageSize)break;
  }
  return rows;
}
async function loadDirect(config,{timeoutMs=8000}={}){
  const base=String(config?.url||'').trim(),key=String(config?.publishableKey||'').trim();
  if(!base||!key)throw new Error('Supabase não configurado.');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new Error('Tempo limite do banco online excedido.')),timeoutMs);
  try{
    const [rawQuestions,rawDiscursives,metaRows]=await Promise.all([
      restAll(base,key,'questions',QUESTION_COLUMNS,controller.signal),
      restAll(base,key,'pism_discursives',DISCURSIVE_COLUMNS,controller.signal),
      restGet(base,key,'app_meta',{select:'key,value',key:'in.(question_bank_version,app_version)'},controller.signal)
    ]);
    return normalize(rawQuestions,rawDiscursives,metaRows);
  }catch(e){
    if(e?.name==='AbortError')throw new Error('Tempo limite do banco online excedido.');
    throw e;
  }finally{clearTimeout(timer)}
}

root.GabaritoQuestionSource={load,loadDirect,validate,EXPECTED:MINIMUM,MINIMUM};
})(typeof window!=='undefined'?window:globalThis);
