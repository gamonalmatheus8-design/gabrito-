import {Readable} from 'node:stream';

const ALLOWED_HOSTS=new Set(['download.inep.gov.br','riep.inep.gov.br']);

function validSource(raw){
 try{
  const url=new URL(String(raw||''));
  if(url.protocol!=='https:'||!ALLOWED_HOSTS.has(url.hostname))return null;
  return url;
 }catch{return null}
}

export default async function handler(req,res){
 const url=validSource(req.query?.url);
 if(!url)return res.status(400).json({error:'Fonte inválida.'});
 try{
  const headers={'user-agent':'GabaritoPlus/3.2 (+https://gabarito-mais.vercel.app/)'};
  if(req.headers.range)headers.range=req.headers.range;
  const response=await fetch(url,{headers,redirect:'follow'});
  if(!response.ok&&response.status!==206)return res.status(response.status).end();
  res.statusCode=response.status;
  for(const name of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){
   const value=response.headers.get(name);if(value)res.setHeader(name,value);
  }
  res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!response.body)return res.end();
  Readable.fromWeb(response.body).pipe(res);
 }catch(error){
  console.error('[Gabarito+] Falha ao transmitir PDF oficial:',error?.message||error);
  return res.status(502).json({error:'Não foi possível carregar o caderno oficial agora.'});
 }
}
