import { createClient } from 'npm:@supabase/supabase-js@2'
function clean(v:unknown,max=18000){return String(v??'').trim().slice(0,max)}
function outputText(data:any){let text='';for(const item of data?.output||[])for(const c of item?.content||[])if(c?.type==='output_text'&&c.text)text+=c.text;return text||data?.output_text||''}
Deno.serve(async(req)=>{
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'};if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const auth=req.headers.get('Authorization')||'',url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;const sb=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const {data:{user}}=await sb.auth.getUser();if(!user)throw new Error('Entre na conta para usar a correção por IA.');
    const body=await req.json(),text=clean(body.text),theme=clean(body.theme,500),title=clean(body.title,300);if(text.split(/\s+/).filter(Boolean).length<80)throw new Error('Redação muito curta para correção.');
    const key=Deno.env.get('OPENAI_API_KEY');if(!key)throw new Error('OPENAI_API_KEY não configurada na Edge Function.');const model=Deno.env.get('OPENAI_MODEL')||'gpt-5.6-luna';
    const prompt=`Você é um avaliador pedagógico de redação no formato ENEM. A correção é uma estimativa pedagógica, nunca oficial. Avalie C1 a C5, atribuindo somente 0,40,80,120,160 ou 200. Responda APENAS JSON válido com {"scores":{"c1":0,"c2":0,"c3":0,"c4":0,"c5":0},"competencies":{"c1":"","c2":"","c3":"","c4":"","c5":""},"strengths":[],"priorities":[],"summary":""}. Tema: ${theme}. Título: ${title}. Redação: ${text}`;
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model,input:prompt,max_output_tokens:2200})});const data=await r.json();if(!r.ok)throw new Error(data?.error?.message||'Falha na API de IA.');const raw=outputText(data).trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim(),result=JSON.parse(raw);result.total=Object.values(result.scores||{}).reduce((a:any,b:any)=>Number(a)+Number(b),0);return new Response(JSON.stringify(result),{headers:cors});
  }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Erro interno'}),{status:400,headers:cors})}
})
