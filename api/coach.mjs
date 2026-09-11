const MODEL=process.env.OPENAI_MODEL||'gpt-5.6-luna';
const MAX_TEXT=90;
const num=(value,min=0,max=10000)=>Math.max(min,Math.min(max,Number(value)||0));
const text=value=>String(value||'').trim().slice(0,MAX_TEXT);

function sanitize(body={}){
 const context=body.context||{};
 const decision=body.decision||{};
 const weakTopics=Array.isArray(context.weakTopics)?context.weakTopics.slice(0,4).map(item=>({
  subject:text(item?.subject),topic:text(item?.topic),score:num(item?.score,0,100),accuracy:num(item?.accuracy,0,100),attempts:num(item?.attempts,0,500),wrong:num(item?.wrong,0,500)
 })):[];
 const steps=Array.isArray(decision.steps)?decision.steps.slice(0,4).map(item=>({title:text(item?.title),minutes:num(item?.minutes,3,90),meta:text(item?.meta)})):[];
 return{
  context:{
   exam:context.exam==='PISM'?'PISM':'ENEM',module:text(context.module)||'I',days:context.days==null?null:num(context.days,0,1000),todayMin:num(context.todayMin,0,1000),dailyGoal:num(context.dailyGoal,20,300),weekMin:num(context.weekMin,0,5000),accuracy:num(context.accuracy,0,100),answered:num(context.answered,0,100000),streak:num(context.streak,0,3650),dueCount:num(context.dueCount,0,10000),errorCount:num(context.errorCount,0,10000),upcomingCount:num(context.upcomingCount,0,10000),weakTopics
  },
  decision:{type:text(decision.type),subject:text(decision.subject),topic:text(decision.topic),sessionMinutes:num(decision.sessionMinutes,20,120),primary:text(decision.primary),steps}
 };
}

function outputText(data){
 if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text;
 for(const item of data?.output||[]){
  for(const part of item?.content||[]){
   if(part?.type==='output_text'&&typeof part.text==='string')return part.text;
  }
 }
 return'';
}

const schema={
 type:'object',additionalProperties:false,
 properties:{
  title:{type:'string'},reason:{type:'string'},insight:{type:'string'},checkpoint:{type:'string'},confidence:{type:'string',enum:['inicial','média','alta']},
  signals:{type:'array',minItems:2,maxItems:4,items:{type:'string'}},
  session_steps:{type:'array',minItems:3,maxItems:3,items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},minutes:{type:'integer',minimum:3,maximum:90},purpose:{type:'string'}},required:['title','minutes','purpose']}}
 },
 required:['title','reason','insight','checkpoint','confidence','signals','session_steps']
};

function normalizeAnalysis(value,payload){
 const source=value&&typeof value==='object'?value:{};
 const fallbackSteps=payload.decision.steps.slice(0,3);
 const steps=Array.isArray(source.session_steps)&&source.session_steps.length===3?source.session_steps:fallbackSteps.map(step=>({title:step.title,minutes:step.minutes,purpose:step.meta||'Executar a etapa recomendada.'}));
 const totalTarget=payload.decision.sessionMinutes;
 let total=steps.reduce((sum,step)=>sum+num(step?.minutes,3,90),0);
 const normalized=steps.map((step,index)=>({
  title:text(step?.title)||`Etapa ${index+1}`,
  minutes:Math.max(3,Math.round(num(step?.minutes,3,90))),
  purpose:text(step?.purpose)||'Executar a etapa recomendada.'
 }));
 if(total&&Math.abs(total-totalTarget)>8){
  const factor=totalTarget/total;
  normalized.forEach(step=>{step.minutes=Math.max(3,Math.round(step.minutes*factor))});
  const adjusted=normalized.reduce((sum,step)=>sum+step.minutes,0);
  normalized[normalized.length-1].minutes=Math.max(3,normalized[normalized.length-1].minutes+(totalTarget-adjusted));
 }
 const confidence=['inicial','média','alta'].includes(source.confidence)?source.confidence:'inicial';
 return{
  title:text(source.title)||'Continue pela prioridade recomendada.',
  reason:String(source.reason||'').trim().slice(0,380)||'A recomendação usa seu histórico recente para organizar a próxima sessão.',
  insight:String(source.insight||'').trim().slice(0,260)||'Seu histórico já permite organizar uma próxima ação objetiva.',
  checkpoint:String(source.checkpoint||'').trim().slice(0,220)||'Ao terminar, verifique se os erros diminuíram e se o conteúdo ficou mais claro.',
  confidence,
  signals:(Array.isArray(source.signals)?source.signals:[]).slice(0,4).map(item=>String(item||'').trim().slice(0,120)).filter(Boolean),
  session_steps:normalized
 };
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'AI_NOT_CONFIGURED'});
 const payload=sanitize(req.body||{});
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),16000);
 try{
  const response=await fetch('https://api.openai.com/v1/responses',{
   method:'POST',signal:controller.signal,
   headers:{'authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},
   body:JSON.stringify({
    model:MODEL,
    store:false,
    reasoning:{effort:'low'},
    input:[
     {role:'system',content:[{type:'input_text',text:'Você é o Gabarito+ Coach, um tutor de planejamento para ENEM e PISM. Muitos usuários são adolescentes. Use linguagem clara, respeitosa e sem pressão. Não prometa aprovação, nota, desempenho futuro ou diagnóstico psicológico. Não incentive privação de sono, estudo excessivo ou punição por erros. Nunca altere gabaritos oficiais nem afirme que uma questão oficial está errada. A decisão determinística recebida define o tipo de ação, assunto e duração total; sua função é explicar melhor a prioridade e refinar a sessão sem mudar essa direção. Seja breve, específico e acionável em português do Brasil. A soma dos minutos dos 3 passos deve ficar próxima da duração total recebida.'}]},
     {role:'user',content:[{type:'input_text',text:JSON.stringify(payload)}]}
    ],
    text:{format:{type:'json_schema',name:'gabarito_coach',strict:true,schema}},
    max_output_tokens:700
   })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   console.error('[Gabarito+ Coach] OpenAI error',response.status,data?.error?.code||data?.error?.type||'unknown');
   return res.status(response.status===429?429:502).json({error:'AI_UPSTREAM_ERROR'});
  }
  const raw=outputText(data);
  if(!raw)return res.status(502).json({error:'AI_EMPTY_RESPONSE'});
  let parsed;
  try{parsed=JSON.parse(raw)}catch{return res.status(502).json({error:'AI_INVALID_RESPONSE'})}
  const analysis=normalizeAnalysis(parsed,payload);
  return res.status(200).json({ok:true,model:MODEL,analysis,generatedAt:new Date().toISOString()});
 }catch(error){
  console.error('[Gabarito+ Coach] request failed',error?.name||error?.message||'unknown');
  return res.status(error?.name==='AbortError'?504:502).json({error:'AI_UNAVAILABLE'});
 }finally{clearTimeout(timeout)}
}
