(function(){
'use strict';
const VERSION='3.2.1';
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const V27_KEY='gplus_enem_official_v27';
const V28_KEY='gplus_enem_history_exam_v28';
const $=(s,r=document)=>r.querySelector(s);
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
const readers=new Map();
let loader=null,timer=null;

function loadPdfJs(){
 if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=PDFJS;script.async=true;
  script.onload=()=>{if(!window.pdfjsLib)return reject(new Error('PDF.js indisponível.'));window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;resolve(window.pdfjsLib)};
  script.onerror=()=>reject(new Error('Falha ao carregar leitor de documentos.'));
  document.head.appendChild(script);
 });
 return loader;
}
function proxy(url){return `/api/enem-pdf?url=${encodeURIComponent(url)}`}
function session(kind){return parse(localStorage.getItem(kind==='v27'?V27_KEY:V28_KEY),null)}
function findSource(iframe){const raw=iframe?.getAttribute('src')||'';return raw.split('#')[0]}
function current(kind){return Number(session(kind)?.current||1)}
function structuredNativeReady(kind){
 if(kind!=='v27')return false;
 const s=session(kind),api=window.GABARITO_ENEM_NATIVE;
 if(!s||!api?.validateAttempt)return false;
 try{return Boolean(api.validateAttempt({year:s.year,day:s.day,language:s.language}).complete)}catch{return false}
}
function readerMarkup(source){return `<section class="v32-reader" data-source="${source}"><div class="v32-reader-top"><div><span class="v32-kicker">CADERNO OFICIAL · LEITOR GABARITO+</span><b class="v32-question-label">Questão</b></div><div class="v32-page-actions"><button type="button" class="v32-page-btn" data-v32-prev aria-label="Página anterior">‹</button><span class="v32-page-label">Carregando…</span><button type="button" class="v32-page-btn" data-v32-next aria-label="Próxima página">›</button></div></div><div class="v32-stage"><div class="v32-loading"><span></span><b>Preparando caderno oficial…</b><small>Sem barra de PDF e sem sair do Gabarito+.</small></div><canvas class="v32-canvas" hidden></canvas></div><div class="v32-reader-foot"><span>Conteúdo oficial do Inep renderizado dentro do aplicativo.</span><a href="${source}" target="_blank" rel="noopener">Abrir original</a></div></section>`}
async function buildQuestionMap(doc){
 const map=new Map();
 for(let p=1;p<=doc.numPages;p++){
  try{
   const page=await doc.getPage(p),content=await page.getTextContent(),text=content.items.map(x=>x.str).join(' ');
   const re=/QUEST(?:ÃO|AO)\s*0*(\d{1,3})/gi;let m;
   while((m=re.exec(text))){const q=Number(m[1]);if(q>=1&&q<=180&&!map.has(q))map.set(q,p)}
  }catch{}
 }
 return map;
}
async function renderPage(state,pageNumber){
 if(!state?.doc)return;
 const n=Math.max(1,Math.min(state.doc.numPages,Number(pageNumber)||1));state.page=n;
 const page=await state.doc.getPage(n),stage=$('.v32-stage',state.host),canvas=$('.v32-canvas',state.host),label=$('.v32-page-label',state.host);
 if(!stage||!canvas)return;
 const base=page.getViewport({scale:1}),available=Math.max(300,stage.clientWidth-24),scale=Math.min(1.7,available/base.width),viewport=page.getViewport({scale});
 const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
 const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(ratio,0,0,ratio,0,0);canvas.hidden=false;$('.v32-loading',state.host)?.setAttribute('hidden','');
 if(state.task)try{state.task.cancel()}catch{}
 state.task=page.render({canvasContext:ctx,viewport});await state.task.promise.catch(e=>{if(e?.name!=='RenderingCancelledException')throw e});
 if(label)label.textContent=`Página ${n} de ${state.doc.numPages}`;
 const prev=$('[data-v32-prev]',state.host),next=$('[data-v32-next]',state.host);if(prev)prev.disabled=n<=1;if(next)next.disabled=n>=state.doc.numPages;
}
async function syncQuestion(state){
 const q=current(state.kind),label=$('.v32-question-label',state.host);if(label)label.textContent=`Questão ${q}`;
 const target=state.qmap?.get(q);if(target&&target!==state.page)await renderPage(state,target);
}
function showFriendlyFailure(state){
 const loading=$('.v32-loading',state.host),label=$('.v32-page-label',state.host);
 if(label)label.textContent='Tente novamente';
 if(!loading)return;
 loading.removeAttribute('hidden');
 loading.innerHTML=`<b>Caderno oficial temporariamente indisponível.</b><small>Seu cartão-resposta e seu progresso continuam salvos. Tente novamente ou abra a fonte oficial.</small><div class="v32-failure-actions"><button type="button" class="btn btn-primary" data-v32-retry>Tentar novamente</button><a class="btn btn-secondary" href="${state.source}" target="_blank" rel="noopener">Abrir no Inep</a></div>`;
 $('[data-v32-retry]',loading)?.addEventListener('click',()=>window.location.reload());
}
async function mount(iframe,kind){
 if(structuredNativeReady(kind)){window.GABARITO_ENEM_NATIVE_INTEGRATION?.enhance?.();return}
 const source=findSource(iframe);if(!source)return;
 const paper=iframe.closest(kind==='v27'?'.v27-paper':'.v28-paper');if(!paper)return;
 if(readers.has(paper)){await syncQuestion(readers.get(paper));return}
 const holder=document.createElement('div');holder.innerHTML=readerMarkup(source);const host=holder.firstElementChild;iframe.replaceWith(host);paper.classList.add('v32-native-document');
 const state={host,paper,kind,source,doc:null,page:1,qmap:null,task:null};readers.set(paper,state);
 $('[data-v32-prev]',host)?.addEventListener('click',()=>renderPage(state,state.page-1));$('[data-v32-next]',host)?.addEventListener('click',()=>renderPage(state,state.page+1));
 try{
  const pdfjs=await loadPdfJs(),task=pdfjs.getDocument({url:proxy(source),withCredentials:false,disableRange:true,disableStream:true,disableAutoFetch:true});state.doc=await task.promise;
  await renderPage(state,1);syncQuestion(state);
  buildQuestionMap(state.doc).then(map=>{state.qmap=map;syncQuestion(state)});
 }catch(error){
  console.warn('[Gabarito+] Caderno oficial não carregou:',error?.message||error);
  showFriendlyFailure(state);
 }
}
async function enhance(){
 for(const [paper,state] of readers)if(!state.host.isConnected)readers.delete(paper);
 const v27=$('#v27OfficialRunner .v27-paper iframe');
 if(v27){
  if(structuredNativeReady('v27'))window.GABARITO_ENEM_NATIVE_INTEGRATION?.enhance?.();
  else await mount(v27,'v27');
 }
 const v28=$('#v28Runner .v28-paper iframe');if(v28)await mount(v28,'v28');
 for(const state of readers.values())if(state.host.isConnected)syncQuestion(state);
 window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.enemDocument=VERSION;
}
function activeReaderOrIframe(){if($('#v27OfficialRunner .v27-paper iframe,#v28Runner .v28-paper iframe'))return true;for(const state of readers.values())if(state.host.isConnected)return true;return false}
function schedule(){if(!activeReaderOrIframe())return;clearTimeout(timer);timer=setTimeout(enhance,40)}
function boot(){
 const root=$('#page-mocks')||document.body;new MutationObserver(schedule).observe(root,{subtree:true,childList:true});
 window.addEventListener('resize',()=>{if(activeReaderOrIframe())schedule()},{passive:true});
 setTimeout(enhance,400);window.GABARITO_ENEM_DOCUMENT={version:VERSION,enhance}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
