import {Readable} from 'node:stream';

const MAX_PDF_BYTES=50*1024*1024;
const STREAM_PDF_BYTES=4*1024*1024;
const SOURCE_ATTEMPTS=2;

function validSource(raw){
 try{
  const url=new URL(String(raw||''));
  const official=url.hostname==='ufjf.br'||url.hostname.endsWith('.ufjf.br');
  if(url.protocol!=='https:'||!official||!url.pathname.toLowerCase().endsWith('.pdf'))return null;
  return url;
 }catch{return null}
}
async function requestPdf(target){
 let lastError=null;
 for(let attempt=1;attempt<=SOURCE_ATTEMPTS;attempt++){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(target,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (compatible; GabaritoPlus/PISM; +https://gabarito-mais.vercel.app/)','accept':'application/pdf,application/octet-stream;q=0.9,*/*;q=0.5'}});
   if(response.ok||(response.status<500&&response.status!==429)||attempt===SOURCE_ATTEMPTS)return response;
   lastError=new Error(`Origem respondeu ${response.status}`);
   try{await response.body?.cancel()}catch{}
  }catch(error){lastError=error;if(attempt===SOURCE_ATTEMPTS)throw error}
  finally{clearTimeout(timeout)}
 }
 throw lastError||new Error('Origem indisponível.');
}
function looksLikePdf(bytes){return bytes.length>=5&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46&&bytes[4]===0x2d}
function setHeaders(res,length,mode){
 res.statusCode=200;
 res.setHeader('Content-Type','application/pdf');
 res.setHeader('Content-Length',String(length));
 res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Gabarito-Pdf-Source',`ufjf-${mode}`);
}

export default async function handler(req,res){
 const url=validSource(req.query?.url);
 if(!url)return res.status(400).json({error:'Fonte inválida.'});
 try{
  const response=await requestPdf(url.href);
  if(!response.ok)throw new Error(`UFJF respondeu ${response.status}`);
  const contentLength=Number(response.headers.get('content-length')||0);
  if(contentLength>MAX_PDF_BYTES)throw new Error('Arquivo acima do limite de segurança.');
  if(contentLength>STREAM_PDF_BYTES&&response.body){
   setHeaders(res,contentLength,'streamed');
   await new Promise((resolve,reject)=>{const stream=Readable.fromWeb(response.body);stream.once('error',reject);res.once('finish',resolve);stream.pipe(res)});
   return;
  }
  const candidate=new Uint8Array(await response.arrayBuffer());
  if(candidate.byteLength>MAX_PDF_BYTES||!looksLikePdf(candidate))throw new Error('Resposta recebida não é um PDF válido.');
  const body=Buffer.from(candidate.buffer,candidate.byteOffset,candidate.byteLength);
  setHeaders(res,body.length,'buffered');
  return res.end(body);
 }catch(error){
  console.error('[Gabarito+] Caderno PISM indisponível:',error?.message||error);
  return res.status(503).json({error:'Caderno oficial temporariamente indisponível.'});
 }
}
