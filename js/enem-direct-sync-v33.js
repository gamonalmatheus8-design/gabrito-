(function(){
'use strict';
if(window.__GABARITO_ENEM_DIRECT_SYNC_V33__)return;
window.__GABARITO_ENEM_DIRECT_SYNC_V33__=true;

const VERSION='3.3.1';
const SESSION_KEY='gplus_enem_official_v27';
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const $=(s,r=document)=>r.querySelector(s);
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
let pdfLoader=null,state=null,timer=null,observer=null;

function session(){return parse(localStorage.getItem(SESSION_KEY),null)}
function current(){return Number(session()?.current||1)}
function pdfSource(iframe){return String(iframe?.getAttribute('src')||'').split('#')[0]}
function proxy(url){return `/api/enem-pdf?url=${encodeURIComponent(url)}`}

function loadPdfJs(){
  if(window.pdfjsLib){
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;
    return Promise.resolve(window.pdfjsLib);
  }
  if(pdfLoader)return pdfLoader;
  pdfLoader=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-gplus-enem-pdfjs]');
    if(existing){
      const started=Date.now();
      const wait=()=>{
        if(window.pdfjsLib){
          window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;
          resolve(window.pdfjsLib);
        }else if(Date.now()-started>8000)reject(new Error('PDF.js não respondeu.'));
        else setTimeout(wait,50);
      };
      wait();
      return;
    }
    const script=document.createElement('script');
    script.src=PDFJS;
    script.async=true;
    script.dataset.gplusEnemPdfjs='1';
    script.onload=()=>{
      if(!window.pdfjsLib)return reject(new Error('PDF.js indisponível.'));
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;
      resolve(window.pdfjsLib);
    };
    script.onerror=()=>reject(new Error('Falha ao carregar leitor sincronizado.'));
    document.head.appendChild(script);
  });
  return pdfLoader;
}

function markup(source){
  return `<section class="v32-reader gplus-direct-sync-reader" data-source="${source}">
    <div class="v32-reader-top">
      <div>
        <span class="v32-kicker">CADERNO OFICIAL · SINCRONIZAÇÃO DIRETA</span>
        <b class="v32-question-label">Questão ${current()}</b>
      </div>
      <div class="v32-page-actions">
        <button type="button" class="v32-page-btn" data-direct-prev aria-label="Página anterior">‹</button>
        <span class="v32-page-label" aria-live="polite">Carregando…</span>
        <button type="button" class="v32-page-btn" data-direct-next aria-label="Próxima página">›</button>
      </div>
    </div>
    <div class="v32-stage">
      <div class="v32-loading"><span></span><b>Sincronizando caderno e cartão-resposta…</b><small>O Gabarito+ está identificando em qual página fica cada questão.</small></div>
      <canvas class="v32-canvas" hidden></canvas>
    </div>
    <div class="v32-reader-foot">
      <span>Ao trocar de questão, o caderno acompanha. Ao trocar de página, o cartão-resposta acompanha.</span>
      <a href="${source}" target="_blank" rel="noopener">Abrir original no Inep</a>
    </div>
  </section>`;
}

async function buildMaps(doc){
  const qToPage=new Map(),pageToQuestions=new Map();
  const jobs=Array.from({length:doc.numPages},(_,i)=>i+1).map(async pageNumber=>{
    try{
      const page=await doc.getPage(pageNumber);
      const text=(await page.getTextContent()).items.map(x=>x.str).join(' ');
      const questions=[],re=/QUEST(?:ÃO|AO)\s*0*(\d{1,3})/gi;
      let match;
      while((match=re.exec(text))){
        const q=Number(match[1]);
        if(q>=1&&q<=180&&!questions.includes(q))questions.push(q);
      }
      return [pageNumber,questions.sort((a,b)=>a-b)];
    }catch{return [pageNumber,[]]}
  });
  for(const [pageNumber,questions] of await Promise.all(jobs)){
    if(questions.length)pageToQuestions.set(pageNumber,questions);
    for(const q of questions)if(!qToPage.has(q))qToPage.set(q,pageNumber);
  }
  return{qToPage,pageToQuestions};
}

function questionsOnPage(pageNumber){
  const direct=state?.pageToQuestions?.get(Number(pageNumber))||[];
  if(direct.length)return direct;
  return[];
}

function pageLabel(){
  if(!state?.doc)return'';
  const qs=questionsOnPage(state.page);
  const suffix=!qs.length?'':qs.length===1?` · Q${qs[0]}`:` · Q${qs[0]}–${qs[qs.length-1]}`;
  return `Página ${state.page} de ${state.doc.numPages}${suffix}`;
}

async function renderPage(pageNumber){
  if(!state?.doc||!state.host?.isConnected)return;
  const n=Math.max(1,Math.min(state.doc.numPages,Number(pageNumber)||1));
  state.page=n;
  const page=await state.doc.getPage(n);
  const stage=$('.v32-stage',state.host),canvas=$('.v32-canvas',state.host);
  if(!stage||!canvas)return;
  const base=page.getViewport({scale:1});
  const available=Math.max(300,stage.clientWidth-24);
  const scale=Math.min(1.7,available/base.width);
  const viewport=page.getViewport({scale});
  const ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.floor(viewport.width*ratio);
  canvas.height=Math.floor(viewport.height*ratio);
  canvas.style.width=`${viewport.width}px`;
  canvas.style.height=`${viewport.height}px`;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.setTransform(ratio,0,0,ratio,0,0);
  canvas.hidden=false;
  $('.v32-loading',state.host)?.setAttribute('hidden','');
  if(state.renderTask)try{state.renderTask.cancel()}catch{}
  state.renderTask=page.render({canvasContext:ctx,viewport});
  await state.renderTask.promise.catch(e=>{if(e?.name!=='RenderingCancelledException')throw e});
  const label=$('.v32-page-label',state.host);
  if(label)label.textContent=pageLabel();
  const prev=$('[data-direct-prev]',state.host),next=$('[data-direct-next]',state.host);
  if(prev)prev.disabled=n<=1;
  if(next)next.disabled=n>=state.doc.numPages;
}

async function syncPaperFromQuestion(){
  if(!state?.host?.isConnected)return;
  const q=current();
  const qLabel=$('.v32-question-label',state.host);
  if(qLabel)qLabel.textContent=`Questão ${q}`;
  if(!state.qToPage?.size)return;
  const page=state.qToPage.get(q);
  if(page&&page!==state.page)await renderPage(page);
}

function syncQuestionFromPaper(){
  if(!state?.host?.isConnected)return;
  const qs=questionsOnPage(state.page);
  if(!qs.length)return;
  const active=current();
  if(qs.includes(active))return;
  const target=qs[0];
  const button=$(`#v27Sheet [data-q="${target}"]`);
  if(button)button.click();
}

async function browse(offset){
  if(!state?.doc)return;
  await renderPage(state.page+offset);
  syncQuestionFromPaper();
}

function failure(message){
  if(!state?.host)return;
  const loading=$('.v32-loading',state.host),label=$('.v32-page-label',state.host);
  if(label)label.textContent='Leitor indisponível';
  if(!loading)return;
  loading.removeAttribute('hidden');
  loading.innerHTML=`<b>Não foi possível abrir o caderno sincronizado.</b><small>${String(message||'Tente novamente.')}</small><div class="v32-failure-actions"><button type="button" class="btn btn-primary" data-direct-retry>Tentar novamente</button><a class="btn btn-secondary" href="${state.source}" target="_blank" rel="noopener">Abrir no Inep</a></div>`;
  $('[data-direct-retry]',loading)?.addEventListener('click',()=>connect().catch(()=>{}));
}

async function connect(){
  if(!state?.host?.isConnected)return;
  const loading=$('.v32-loading',state.host);
  if(loading){
    loading.innerHTML='<span></span><b>Sincronizando caderno e cartão-resposta…</b><small>Seu progresso continua salvo.</small>';
    loading.removeAttribute('hidden');
  }
  try{
    const pdfjs=await loadPdfJs();
    const task=pdfjs.getDocument({url:proxy(state.source),withCredentials:false,disableRange:true,disableStream:true,disableAutoFetch:true});
    state.doc=await task.promise;
    await renderPage(1);
    const maps=await buildMaps(state.doc);
    state.qToPage=maps.qToPage;
    state.pageToQuestions=maps.pageToQuestions;
    await syncPaperFromQuestion();
    window.GABARITO_APP=window.GABARITO_APP||{};
    window.GABARITO_APP.directExamSync=VERSION;
  }catch(error){
    console.warn('[Gabarito+] Sincronização direta da prova:',error?.message||error);
    failure(error?.message||error);
  }
}

async function mount(){
  const iframe=$('#v27OfficialRunner .v27-paper iframe');
  if(!iframe)return false;
  const paper=iframe.closest('.v27-paper');
  if(!paper)return false;
  const source=pdfSource(iframe);
  if(!source)return false;
  const holder=document.createElement('div');
  holder.innerHTML=markup(source);
  const host=holder.firstElementChild;
  iframe.replaceWith(host);
  paper.classList.add('v32-native-document','gplus-direct-sync-paper');
  state={paper,host,source,doc:null,page:1,qToPage:null,pageToQuestions:null,renderTask:null};
  $('[data-direct-prev]',host)?.addEventListener('click',()=>browse(-1));
  $('[data-direct-next]',host)?.addEventListener('click',()=>browse(1));
  await connect();
  return true;
}

async function enhance(){
  if(state&&!state.host?.isConnected)state=null;
  if(!state)await mount();
  if(state)await syncPaperFromQuestion();
}

function schedule(){
  clearTimeout(timer);
  timer=setTimeout(()=>enhance().catch(e=>console.warn('[Gabarito+] Sync ENEM:',e?.message||e)),35);
}

function boot(){
  const root=$('#page-mocks')||document.body;
  observer=new MutationObserver(schedule);
  observer.observe(root,{subtree:true,childList:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('storage',e=>{if(e.key===SESSION_KEY)schedule()});
  setTimeout(schedule,120);
  window.GABARITO_ENEM_DIRECT_SYNC={version:VERSION,enhance,sync:syncPaperFromQuestion};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();