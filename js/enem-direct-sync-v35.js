(function(){
'use strict';
if(window.__GABARITO_ENEM_DIRECT_SYNC_V35__)return;
window.__GABARITO_ENEM_DIRECT_SYNC_V35__=true;
window.__GABARITO_ENEM_DIRECT_SYNC_V34__=true;
window.__GABARITO_ENEM_DIRECT_SYNC_V33__=true;

const VERSION='3.5.0';
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const $=(s,r=document)=>r.querySelector(s);
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
const configs={
  v27:{key:'gplus_enem_official_v27',runner:'#v27OfficialRunner',paper:'.v27-paper',qButton:q=>`#v27Sheet [data-q="${Number(q)}"]`},
  v28:{key:'gplus_enem_history_exam_v28',runner:'#v28Runner',paper:'.v28-paper',qButton:q=>`#v28Sheet [data-v28-q="${Number(q)}"]`}
};
const states=new Map();
let pdfLoader=null,timer=null,observer=null,watchdog=null;

function session(kind){return parse(localStorage.getItem(configs[kind].key),null)}
function activeSession(kind){const s=session(kind);return s&&s.status==='active'?s:null}
function current(kind){return Number(session(kind)?.current||1)}
function cleanSource(raw){return String(raw||'').split('#')[0]}
function proxy(url){return `/api/enem-pdf?url=${encodeURIComponent(url)}`}
function anyActive(){return Object.keys(configs).some(activeSession)}

function ensureGuardStyle(){
  if(document.getElementById('gplusDirectSyncGuardV35'))return;
  const style=document.createElement('style');
  style.id='gplusDirectSyncGuardV35';
  style.textContent=`
    #v27OfficialRunner .v27-paper>iframe,#v28Runner .v28-paper>iframe{visibility:hidden!important}
    .gplus-direct-sync-reader[data-direct-sync-version="${VERSION}"]{visibility:visible!important}
  `;
  document.head.appendChild(style);
}

function loadPdfJs(){
  if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;return Promise.resolve(window.pdfjsLib)}
  if(pdfLoader)return pdfLoader;
  pdfLoader=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-gplus-enem-pdfjs-v35],script[src*="pdfjs-dist"][src*="pdf.min.js"]');
    if(existing){
      const started=Date.now();
      const wait=()=>{
        if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;resolve(window.pdfjsLib)}
        else if(Date.now()-started>10000)reject(new Error('PDF.js não respondeu.'));
        else setTimeout(wait,60);
      };
      wait();return;
    }
    const script=document.createElement('script');
    script.src=PDFJS;script.async=true;script.dataset.gplusEnemPdfjsV35='1';
    script.onload=()=>{if(!window.pdfjsLib)return reject(new Error('PDF.js indisponível.'));window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;resolve(window.pdfjsLib)};
    script.onerror=()=>reject(new Error('Falha ao carregar o leitor sincronizado.'));
    document.head.appendChild(script);
  });
  return pdfLoader;
}

function markup(kind,source){
  return `<section class="v32-reader gplus-direct-sync-reader" data-direct-sync="${kind}" data-direct-sync-version="${VERSION}" data-source="${source}">
    <div class="v32-reader-top">
      <div><span class="v32-kicker">CADERNO OFICIAL · LEITOR GABARITO+ · SINCRONIZADO</span><b class="v32-question-label">Questão ${current(kind)}</b></div>
      <div class="v32-page-actions">
        <button type="button" class="v32-page-btn" data-direct-prev data-v32-prev aria-label="Página anterior">‹</button>
        <span class="v32-page-label" aria-live="polite">Carregando…</span>
        <button type="button" class="v32-page-btn" data-direct-next data-v32-next aria-label="Próxima página">›</button>
      </div>
    </div>
    <div class="v32-stage">
      <div class="v32-loading"><span></span><b>Sincronizando caderno e cartão-resposta…</b><small>Identificando automaticamente em qual página fica cada questão.</small></div>
      <canvas class="v32-canvas" hidden></canvas>
    </div>
    <div class="v32-reader-foot"><span>Questão e página permanecem vinculadas nos dois sentidos.</span><a href="${source}" target="_blank" rel="noopener">Abrir original no Inep</a></div>
  </section>`;
}

async function buildMaps(doc){
  const qToPage=new Map(),pageToQuestions=new Map();
  let cursor=1;
  const worker=async()=>{
    while(true){
      const pageNumber=cursor++;
      if(pageNumber>doc.numPages)return;
      try{
        const page=await doc.getPage(pageNumber);
        const text=(await page.getTextContent()).items.map(x=>x.str).join(' ');
        const found=[],re=/QUEST(?:ÃO|AO)\s*0*(\d{1,3})/gi;let m;
        while((m=re.exec(text))){const q=Number(m[1]);if(q>=1&&q<=180&&!found.includes(q))found.push(q)}
        found.sort((a,b)=>a-b);
        if(found.length)pageToQuestions.set(pageNumber,found);
        for(const q of found)if(!qToPage.has(q))qToPage.set(q,pageNumber);
      }catch{}
    }
  };
  await Promise.all(Array.from({length:Math.min(4,Math.max(1,doc.numPages))},worker));
  return{qToPage,pageToQuestions};
}

function questionsOnPage(state,pageNumber=state.page){return state.pageToQuestions?.get(Number(pageNumber))||[]}
function pageText(state){
  if(!state.doc)return'';
  const qs=questionsOnPage(state);
  const suffix=!qs.length?'':qs.length===1?` · Q${qs[0]}`:` · Q${qs[0]}–${qs[qs.length-1]}`;
  return`Página ${state.page} de ${state.doc.numPages}${suffix}`;
}

async function renderPage(state,pageNumber){
  if(!state?.doc||!state.host?.isConnected)return;
  const n=Math.max(1,Math.min(state.doc.numPages,Number(pageNumber)||1));
  state.page=n;
  const page=await state.doc.getPage(n),stage=$('.v32-stage',state.host),canvas=$('.v32-canvas',state.host);
  if(!stage||!canvas)return;
  const base=page.getViewport({scale:1}),available=Math.max(300,stage.clientWidth-24),scale=Math.min(1.7,available/base.width),viewport=page.getViewport({scale});
  const ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(ratio,0,0,ratio,0,0);canvas.hidden=false;
  $('.v32-loading',state.host)?.setAttribute('hidden','');
  if(state.renderTask)try{state.renderTask.cancel()}catch{}
  state.renderTask=page.render({canvasContext:ctx,viewport});
  await state.renderTask.promise.catch(e=>{if(e?.name!=='RenderingCancelledException')throw e});
  const label=$('.v32-page-label',state.host);if(label)label.textContent=pageText(state);
  const prev=$('[data-direct-prev]',state.host),next=$('[data-direct-next]',state.host);if(prev)prev.disabled=n<=1;if(next)next.disabled=n>=state.doc.numPages;
}

async function syncPaperFromQuestion(state){
  if(!state?.host?.isConnected)return;
  const q=current(state.kind),label=$('.v32-question-label',state.host);if(label)label.textContent=`Questão ${q}`;
  if(!state.qToPage?.size)return;
  const page=state.qToPage.get(q);
  if(page&&page!==state.page)await renderPage(state,page);
  state.lastQuestion=q;
}

function syncQuestionFromPaper(state){
  if(!state?.host?.isConnected)return;
  const qs=questionsOnPage(state);if(!qs.length)return;
  const active=current(state.kind);if(qs.includes(active))return;
  const button=$(configs[state.kind].qButton(qs[0]));if(button)button.click();
}

async function browse(state,offset){if(!state?.doc)return;await renderPage(state,state.page+offset);syncQuestionFromPaper(state)}

function failure(state,message){
  if(!state?.host)return;
  const loading=$('.v32-loading',state.host),label=$('.v32-page-label',state.host);if(label)label.textContent='Leitor indisponível';if(!loading)return;
  loading.removeAttribute('hidden');
  loading.innerHTML=`<b>Não foi possível abrir o caderno sincronizado.</b><small>${String(message||'Tente novamente.')}</small><div class="v32-failure-actions"><button type="button" class="btn btn-primary" data-direct-retry>Tentar novamente</button><a class="btn btn-secondary" href="${state.source}" target="_blank" rel="noopener">Abrir no Inep</a></div>`;
  $('[data-direct-retry]',loading)?.addEventListener('click',()=>connect(state,true).catch(()=>{}));
}

async function connect(state,force=false){
  if(!state?.host?.isConnected||state.connecting&&!force)return;
  state.connecting=true;
  const loading=$('.v32-loading',state.host);if(loading){loading.innerHTML='<span></span><b>Sincronizando caderno e cartão-resposta…</b><small>Seu progresso continua salvo.</small>';loading.removeAttribute('hidden')}
  try{
    const pdfjs=await loadPdfJs();
    const task=pdfjs.getDocument({url:proxy(state.source),withCredentials:false,disableRange:true,disableStream:true,disableAutoFetch:true});
    state.doc=await task.promise;
    await renderPage(state,1);
    const maps=await buildMaps(state.doc);state.qToPage=maps.qToPage;state.pageToQuestions=maps.pageToQuestions;
    await syncPaperFromQuestion(state);
    state.ready=true;
    window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.directExamSync=VERSION;window.GABARITO_APP.directExamSyncHealthy=true;
  }catch(error){
    state.ready=false;window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.directExamSyncHealthy=false;
    console.warn(`[Gabarito+] Sincronização ${state.kind}:`,error?.message||error);failure(state,error?.message||error);
  }finally{state.connecting=false}
}

function sourceFor(kind,paper){
  const iframe=$('iframe',paper),fromFrame=cleanSource(iframe?.getAttribute('src'));if(fromFrame)return fromFrame;
  const own=$('[data-direct-sync]',paper),fromReader=cleanSource(own?.dataset?.source);if(fromReader)return fromReader;
  return cleanSource(activeSession(kind)?.pdf||session(kind)?.pdf||'');
}

async function mount(kind){
  const cfg=configs[kind],runner=$(cfg.runner),s=activeSession(kind);if(!runner||!s)return false;
  const paper=$(cfg.paper,runner);if(!paper)return false;
  const currentReader=$(`[data-direct-sync="${kind}"]`,paper);
  if(currentReader?.dataset?.directSyncVersion===VERSION){
    const existingState=states.get(kind);
    if(existingState?.host===currentReader)return true;
  }
  const source=sourceFor(kind,paper);if(!source)return false;
  const holder=document.createElement('div');holder.innerHTML=markup(kind,source);const host=holder.firstElementChild;
  const iframe=$('iframe',paper),oldReader=$('.v32-reader',paper),oldDirect=$('[data-direct-sync]',paper);
  if(oldDirect)oldDirect.replaceWith(host);else if(iframe)iframe.replaceWith(host);else if(oldReader)oldReader.replaceWith(host);else{const toolbar=paper.querySelector(':scope > div:first-child');toolbar?.insertAdjacentElement('afterend',host)||paper.prepend(host)}
  paper.classList.add('v32-native-document','gplus-direct-sync-paper');
  const state={kind,paper,host,source,doc:null,page:1,qToPage:null,pageToQuestions:null,renderTask:null,lastQuestion:current(kind),connecting:false,ready:false};states.set(kind,state);
  $('[data-direct-prev]',host)?.addEventListener('click',()=>browse(state,-1));$('[data-direct-next]',host)?.addEventListener('click',()=>browse(state,1));
  connect(state).catch(()=>{});
  return true;
}

async function enhance(){
  for(const [kind,state] of states)if(!state.host?.isConnected)states.delete(kind);
  for(const kind of Object.keys(configs)){
    if(!activeSession(kind))continue;
    const runner=$(configs[kind].runner),paper=runner?$(configs[kind].paper,runner):null;
    if(!runner||!paper)continue;
    const own=$(`[data-direct-sync="${kind}"][data-direct-sync-version="${VERSION}"]`,paper);
    if(!own||!states.get(kind)?.host?.isConnected)await mount(kind);
    const state=states.get(kind);if(state)await syncPaperFromQuestion(state);
  }
}

function schedule(){clearTimeout(timer);timer=setTimeout(()=>enhance().catch(e=>console.warn('[Gabarito+] Sync ENEM:',e?.message||e)),25)}
function onRelevantClick(event){
  const t=event.target?.closest?.('#v27Sheet [data-q],#v28Sheet [data-v28-q],#v27Sheet [data-letter],#v28Sheet [data-v28-letter]');
  if(t)setTimeout(schedule,0);
}
function boot(){
  ensureGuardStyle();
  const root=$('#page-mocks')||document.body;
  observer=new MutationObserver(schedule);observer.observe(root,{subtree:true,childList:true});
  document.addEventListener('click',onRelevantClick,true);
  window.addEventListener('resize',schedule,{passive:true});
  for(const cfg of Object.values(configs))window.addEventListener('storage',e=>{if(e.key===cfg.key)schedule()});
  watchdog=setInterval(()=>{if(anyActive())schedule()},500);
  setTimeout(schedule,50);
  window.GABARITO_ENEM_DIRECT_SYNC={version:VERSION,enhance,sync:enhance,force:async()=>{await enhance()}};
  window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.directExamSyncModule=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
