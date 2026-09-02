const ALLOWED_HOSTS=new Set(['download.inep.gov.br','riep.inep.gov.br']);
const RIEP_FALLBACKS=new Map([
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/01f19cf0-4be9-48df-9a29-f5fe33bbae07/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/00b05856-bf94-4bfb-b209-65758a35b81b/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/109a33f5-e556-4e51-b9e3-8e0bdf3353d8/download']
]);
const MAX_PDF_BYTES=40*1024*1024;

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
async function requestPdf(target){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  return await fetch(target,{
   redirect:'follow',
   signal:controller.signal,
   headers:{
    'user-agent':'Mozilla/5.0 (compatible; GabaritoPlus/Presentation; +https://gabarito-mais.vercel.app/)',
    'accept':'application/pdf,application/octet-stream;q=0.9,*/*;q=0.5'
   }
  });
 }finally{clearTimeout(timeout)}
}
function looksLikePdf(bytes){
 return bytes.length>=5&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46&&bytes[4]===0x2d;
}

export default async function handler(req,res){
 const url=validSource(req.query?.url);
 if(!url)return res.status(400).json({error:'Fonte inválida.'});
 let bytes=null,used=null,lastError=null;
 for(const target of candidates(url)){
  try{
   const response=await requestPdf(target);
   if(!response.ok){lastError=new Error(`Origem respondeu ${response.status}`);continue}
   const contentLength=Number(response.headers.get('content-length')||0);
   if(contentLength>MAX_PDF_BYTES){lastError=new Error('Arquivo acima do limite de segurança.');continue}
   const buffer=await response.arrayBuffer();
   const candidate=new Uint8Array(buffer);
   if(candidate.byteLength>MAX_PDF_BYTES||!looksLikePdf(candidate)){lastError=new Error('Resposta recebida não é um PDF válido.');continue}
   bytes=candidate;used=target;break;
  }catch(error){lastError=error}
 }
 if(!bytes){
  console.error('[Gabarito+] Caderno oficial indisponível:',lastError?.message||lastError);
  return res.status(503).json({error:'Caderno oficial temporariamente indisponível.'});
 }
 const body=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 res.statusCode=200;
 res.setHeader('Content-Type','application/pdf');
 res.setHeader('Content-Length',String(body.length));
 res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Gabarito-Pdf-Source',new URL(used).hostname==='riep.inep.gov.br'?'riep-primary-buffered':'inep-download-buffered');
 return res.end(body);
}
