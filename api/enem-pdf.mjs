import {Readable} from 'node:stream';

const ALLOWED_HOSTS=new Set(['download.inep.gov.br','riep.inep.gov.br']);
const RIEP_FALLBACKS=new Map([
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/01f19cf0-4be9-48df-9a29-f5fe33bbae07/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/00b05856-bf94-4bfb-b209-65758a35b81b/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/109a33f5-e556-4e51-b9e3-8e0bdf3353d8/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2023_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/6f6e6a08-9f0b-4365-9f52-a24c5e4ab2e7/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2023_GB_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/4856d28d-13ae-4e11-9bcb-39216d0c59e0/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2023_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/3f2f049c-3994-4c95-966c-1ab61663b668/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2023_GB_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/f1271f05-582e-4b47-8e03-6fb13066c24f/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2022_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/7d656252-c499-42dc-93c9-ea825cce7a0e/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2022_GB_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/814cfdd5-8a8e-4359-a025-ce60761e7caa/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2022_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/481e4c70-e485-4d0b-ac11-82746e24bc16/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2022_GB_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/06c1b02d-a528-4f3d-beb2-8db7048158a7/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2021_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/0ec029ac-140b-424a-9c62-f96095c25d3c/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2021_GB_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/47821341-6f1a-432d-bb3c-656133d94130/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2021_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/a02b1c40-7302-4c9a-87de-0020c2fb8a90/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2021_GB_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/f32b34c5-b593-481c-b40a-952863887456/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2020_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/c7f9eb38-a261-4c58-a1f0-21b68d7be34e/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2020_GB_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/8c08b085-47b9-46d7-a46b-4ad4a208a1f1/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2020_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/4782e683-ec5e-4b69-9a5d-814f6731e7e5/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2020_GB_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/06936523-5181-4b5d-bcd5-aaae3f770b4e/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/provas/2019/2019_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/ef59158b-11f9-4bf7-a9fc-64d801cd06e7/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/gabaritos/2019/gabarito_1_dia_caderno_2_amarelo_aplicacao_regular.pdf','https://riep.inep.gov.br/bitstreams/3abcf776-6e65-49e4-8643-dd60dab28f48/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/provas/2019/2019_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/83cc051d-2bc9-4894-8690-dd9f24b1fb2e/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/gabaritos/2019/gabarito_2_dia_caderno_5_amarelo_aplicacao_regular.pdf','https://riep.inep.gov.br/bitstreams/4bbfd08c-5f81-4148-a8df-deb876ea296a/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/provas/2018/2018_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/7287a7af-b8a1-46dd-900a-3e9b45de386b/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/gabaritos/2018/GAB_ENEM_2018_DIA_1_AMARELO.pdf','https://riep.inep.gov.br/bitstreams/2eb9440d-6d3c-48c2-9747-d9235b056e3b/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/provas/2018/2DIA_05_AMARELO_BAIXA.pdf','https://riep.inep.gov.br/bitstreams/eef2de95-259a-4ddd-ba29-9c03695623e1/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/gabaritos/2018/GAB_ENEM_2018_DIA_2_AMARELO.pdf','https://riep.inep.gov.br/bitstreams/258048d1-b6a0-451e-95ac-28ca1ddf9922/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/provas/2017/cad_2_prova_amarelo_5112017.pdf','https://riep.inep.gov.br/bitstreams/68354e24-fce6-4f84-8e71-82a90d9d3229/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/gabaritos/2017/cad_2_gabarito_amarelo_5112017.pdf','https://riep.inep.gov.br/bitstreams/aafa2a97-ddff-40a4-8087-caf416569f50/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/provas/2017/2017_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/d98168a5-c580-423b-a0c0-df55cb79c8af/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/gabaritos/2017/cad_5_gabarito_amarelo_12112017.pdf','https://riep.inep.gov.br/bitstreams/f46699fc-5303-49c5-af88-5922e55189b9/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/provas/2016/2016_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/dcb0d85d-5da4-48ee-b49a-e34db65c9c8b/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/gabaritos/2016/GAB_ENEM_2016_DIA_1_02_AMARELO.pdf','https://riep.inep.gov.br/bitstreams/178f4a17-af6a-469f-89f5-1400c64cf043/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/provas/2016/2016_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/b2b444d8-dd24-4e19-89b6-7c629e4c40ff/download'],
 ['https://download.inep.gov.br/educacao_basica/enem/gabaritos/2016/GAB_ENEM_2016_DIA_2_05_AMARELO.pdf','https://riep.inep.gov.br/bitstreams/ea4f9461-71cb-4dbf-b5e8-a68d6e7e102b/download']
]);
const MAX_PDF_BYTES=40*1024*1024;
const STREAM_PDF_BYTES=4*1024*1024;
const SOURCE_ATTEMPTS=2;

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
 let lastError=null;
 for(let attempt=1;attempt<=SOURCE_ATTEMPTS;attempt++){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(target,{
    redirect:'follow',
    signal:controller.signal,
    headers:{
     'user-agent':'Mozilla/5.0 (compatible; GabaritoPlus/Presentation; +https://gabarito-mais.vercel.app/)',
     'accept':'application/pdf,application/octet-stream;q=0.9,*/*;q=0.5'
    }
   });
   if(response.ok||(response.status<500&&response.status!==429)||attempt===SOURCE_ATTEMPTS)return response;
   lastError=new Error(`Origem respondeu ${response.status}`);
   try{await response.body?.cancel()}catch{}
  }catch(error){lastError=error;if(attempt===SOURCE_ATTEMPTS)throw error}
  finally{clearTimeout(timeout)}
 }
 throw lastError||new Error('Origem indisponível.');
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
   if(contentLength>STREAM_PDF_BYTES&&response.body){
    res.statusCode=200;
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Length',String(contentLength));
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Gabarito-Pdf-Source',new URL(target).hostname==='riep.inep.gov.br'?'riep-primary-streamed':'inep-download-streamed');
    await new Promise((resolve,reject)=>{const stream=Readable.fromWeb(response.body);stream.once('error',reject);res.once('finish',resolve);stream.pipe(res)});
    return;
   }
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
