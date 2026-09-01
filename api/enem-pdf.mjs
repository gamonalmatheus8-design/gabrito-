import {Readable} from 'node:stream';

const ALLOWED_HOSTS=new Set(['download.inep.gov.br','riep.inep.gov.br']);
const RIEP_FALLBACKS=new Map([
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/01f19cf0-4be9-48df-9a29-f5fe33bbae07/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/00b05856-bf94-4bfb-b209-65758a35b81b/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/109a33f5-e556-4e51-b9e3-8e0bdf3353d8/download']
]);

function validSource(raw){
 try{
  const url=new URL(String(raw||''));
  if(url.protocol!=='https:'||!ALLOWED_HOSTS.has(url.hostname))return null;
  return url;
 }catch{return null}
}
function candidates(url){
 const primary=url.href;
 const riep=RIEP_FALLBACKS.get(primary);
 return riep?[riep,primary]:[primary];
}
async function requestPdf(target,headers){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{return await fetch(target,{headers,redirect:'follow',signal:controller.signal})}
 finally{clearTimeout(timeout)}
}

export default async function handler(req,res){
 const url=validSource(req.query?.url);
 if(!url)return res.status(400).json({error:'Fonte inválida.'});
 const headers={
  'user-agent':'Mozilla/5.0 (compatible; GabaritoPlus/3.4.1; +https://gabarito-mais.vercel.app/)',
  'accept':'application/pdf,application/octet-stream;q=0.9,*/*;q=0.5'
 };
 if(req.headers.range)headers.range=req.headers.range;
 let response=null,used=null,lastError=null;
 for(const target of candidates(url)){
  try{
   const attempt=await requestPdf(target,headers);
   if(attempt.ok||attempt.status===206){response=attempt;used=target;break}
   lastError=new Error(`Inep respondeu ${attempt.status} em ${new URL(target).hostname}`);
   try{await attempt.body?.cancel()}catch{}
  }catch(error){lastError=error}
 }
 if(!response){
  console.error('[Gabarito+] Falha ao transmitir PDF oficial:',lastError?.message||lastError);
  return res.status(502).json({error:'Não foi possível carregar o caderno oficial agora.'});
 }
 res.statusCode=response.status;
 for(const name of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){
  const value=response.headers.get(name);if(value)res.setHeader(name,value);
 }
 res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Gabarito-Pdf-Source',new URL(used).hostname==='riep.inep.gov.br'?'riep-primary':'inep-download');
 if(!response.body)return res.end();
 Readable.fromWeb(response.body).pipe(res);
}
