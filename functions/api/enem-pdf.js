const ALLOWED_HOSTS=new Set(['download.inep.gov.br','riep.inep.gov.br']);
const RIEP_FIRST=new Map([
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D1_CD2.pdf','https://riep.inep.gov.br/bitstreams/01f19cf0-4be9-48df-9a29-f5fe33bbae07/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/00b05856-bf94-4bfb-b209-65758a35b81b/download'],
 ['https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D2_CD5.pdf','https://riep.inep.gov.br/bitstreams/109a33f5-e556-4e51-b9e3-8e0bdf3353d8/download']
]);

function parseSource(request){
 const raw=new URL(request.url).searchParams.get('url');
 try{
  const u=new URL(String(raw||''));
  if(u.protocol!=='https:'||!ALLOWED_HOSTS.has(u.hostname))return null;
  return u.href;
 }catch{return null}
}

async function fetchPdf(target,request){
 const headers=new Headers({
  'user-agent':'Mozilla/5.0 (compatible; GabaritoPlus/Cloudflare; +https://gabarito-mais.vercel.app/)',
  'accept':'application/pdf,application/octet-stream;q=0.9,*/*;q=0.5'
 });
 const range=request.headers.get('range');
 if(range)headers.set('range',range);
 return fetch(target,{headers,redirect:'follow'});
}

export async function onRequestGet({request}){
 const source=parseSource(request);
 if(!source)return new Response(JSON.stringify({error:'Fonte inválida.'}),{status:400,headers:{'content-type':'application/json; charset=utf-8'}});
 const preferred=RIEP_FIRST.get(source);
 const candidates=preferred?[preferred,source]:[source];
 let upstream=null,used=null;
 for(const target of candidates){
  try{
   const response=await fetchPdf(target,request);
   if(response.ok||response.status===206){upstream=response;used=target;break}
   try{await response.body?.cancel()}catch{}
  }catch{}
 }
 if(!upstream)return new Response(JSON.stringify({error:'Não foi possível carregar o caderno oficial agora.'}),{status:502,headers:{'content-type':'application/json; charset=utf-8'}});
 const headers=new Headers();
 for(const name of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){
  const value=upstream.headers.get(name);if(value)headers.set(name,value);
 }
 headers.set('cache-control','public, max-age=3600, s-maxage=86400');
 headers.set('x-content-type-options','nosniff');
 headers.set('x-gabarito-pdf-source',new URL(used).hostname==='riep.inep.gov.br'?'riep-primary':'inep-download');
 headers.set('access-control-allow-origin','*');
 return new Response(upstream.body,{status:upstream.status,headers});
}
