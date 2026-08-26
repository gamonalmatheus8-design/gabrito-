(function(root){
'use strict';
const EXPECTED={questions:3375,enem:2220,pism:1155,discursives:52};
const QUESTION_COLUMNS='id,exam,module,area,subject,topic,difficulty,text,options,answer,explanation,skill,source,editorial_status,variant_family,variant_type';
const DISCURSIVE_COLUMNS='id,module,subject,topic,prompt,rubric,editorial_status';

function timeout(promise,ms){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo limite do banco Supabase excedido.')),ms)})]).finally(()=>clearTimeout(timer));
}
function question(row){return{id:String(row.id),exam:row.exam,module:row.module??null,area:row.area,subject:row.subject,topic:row.topic,difficulty:row.difficulty,text:row.text,options:row.options,answer:Number(row.answer),explanation:row.explanation,skill:row.skill,source:row.source||'Banco Supabase',editorialStatus:row.editorial_status||'publicada',variantFamily:row.variant_family||String(row.id),variantType:row.variant_type||'Supabase'}}
function discursive(row){return{id:String(row.id),module:row.module,subject:row.subject,topic:row.topic,prompt:row.prompt,rubric:Array.isArray(row.rubric)?row.rubric:[]}}
async function page(client,table,columns,from,to){
  const {data,error}=await client.from(table).select(columns).eq('editorial_status','publicada').order('id',{ascending:true}).range(from,to);
  if(error)throw error;
  return Array.isArray(data)?data:[];
}
async function all(client,table,columns,pageSize=1000){
  const rows=[];
  for(let from=0;;from+=pageSize){const batch=await page(client,table,columns,from,from+pageSize-1);rows.push(...batch);if(batch.length<pageSize)break}
  return rows;
}
function validate(questions,discursives){
  const enem=questions.filter(q=>q.exam==='ENEM').length,pism=questions.filter(q=>q.exam==='PISM').length;
  if(questions.length!==EXPECTED.questions||enem!==EXPECTED.enem||pism!==EXPECTED.pism||discursives.length!==EXPECTED.discursives)throw new Error(`Banco Supabase incompleto (${questions.length} objetivas, ${discursives.length} discursivas).`);
  if(new Set(questions.map(q=>q.id)).size!==questions.length)throw new Error('Banco Supabase contém IDs duplicados.');
  if(questions.some(q=>!Array.isArray(q.options)||q.options.length!==5||!Number.isInteger(q.answer)||q.answer<0||q.answer>4))throw new Error('Banco Supabase contém questão inválida.');
}
async function load(client,{timeoutMs=9000}={}){
  if(!client)throw new Error('Cliente Supabase ausente.');
  return timeout((async()=>{
    const [rawQuestions,rawDiscursives,meta]=await Promise.all([
      all(client,'questions',QUESTION_COLUMNS),
      all(client,'pism_discursives',DISCURSIVE_COLUMNS),
      client.from('app_meta').select('key,value').in('key',['question_bank_version','app_version'])
    ]);
    if(meta.error)throw meta.error;
    const questions=rawQuestions.map(question),discursives=rawDiscursives.map(discursive);
    validate(questions,discursives);
    const values=Object.fromEntries((meta.data||[]).map(x=>[x.key,x.value]));
    return{questions,discursives,version:values.question_bank_version||values.app_version||null};
  })(),timeoutMs);
}
root.GabaritoQuestionSource={load,validate,EXPECTED};
})(typeof window!=='undefined'?window:globalThis);
