(function(){
'use strict';
if(window.__GABARITO_PISM_DIRECT_SYNC_V37__)return;
window.__GABARITO_PISM_DIRECT_SYNC_V37__=true;
const VERSION='3.7.0';
const SESSION_KEY='gplus_pism_official_session_v29';
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const $=(s,r=document)=>r.querySelector(s);
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
let state=null,pdfLoader=null;
const timers=new Set();
function session(){return parse(localStorage.getItem(SESSION_KEY),null)}
function active(){const s=session();return s?.status==='active'?s:null}
function current(){return Number(session()?.current||1)}
function clean(raw){return String(raw||'').split('#')[0]}
function proxy(url){return `/api/pism-pdf?url=${encodeURIComponent(url)}`}
function yieldUi(){return new Promise(resolve=>setTimeout(resolve,0))}
function loadPdfJs(){
 if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;return Promise.resolve(window.pdfjsLib)}
 if(pdfLoader)return pdfLoader;
 pdfLoader=new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-gplus-pism-pdfjs-v37],script[src*="pdfjs-dist"][src*="pdf.min.js"]');
  if(existing){const started=Date.now();const wait=()=>{if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;resolve(window.pdfjsLib)}else if(Date.now()-started>10000)reject(new Error('PDF.js não respondeu.'));else setTimeout(wait,80)};wait();return}
  const script=document.createElement('script');script.src=PDFJS;script.async=true;script.dataset.gplusPismPdfjsV37='1';
  script.onload=()=>{if(!window.pdfjsLib)return reject(new Error('PDF.js indisponível.'));window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;resolve(window.pdfjsLib)};
  script.onerror=()=>reject(new Error('Falha ao carregar leitor do PISM.'));document.head.appendChild(script);
 });
 return pdfLoader;
}
function markup(source){return `<section class="v32-reader gplus-pism-direct-sync" data-pism-direct-sync-version="${VERSION}" data-source="${source}"><div class="v32-reader-top"><div><span class="v32-kicker">CADERNO OFICIAL · UFJF/COPESE · SINCRONIZADO</span><b class="v32-question-label">Questão ${current()}</b></div><div class="v32-page-actions"><button type="button" class="v32-page-btn" data-v32-prev aria-label="Página anterior">‹</button><span class="v32-page-label" aria-live="polite">Preparando…</span><button type="button" class="v32-page-btn" data-v32-next aria-label="Próxima página">›</button></div></div><div class="v32-stage"><div class="v32-loading"><span></span><b>Preparando caderno oficial…</b><small>O cartão-resposta e o caderno serão mantidos na mesma questão.</small></div><canvas class="v32-canvas" hidden></canvas></div><div class="v32-reader-foot"><span>Questão ativa sincronizada com o cartão-resposta.</span><a href="${source}" target="_blank" rel="noopener">Abrir original na UFJF</a></div></section>`}
async function extract(doc,pageNumber){try{const page=await doc.getPage(pageNumber),content=await page.getTextContent(),text=content.items.map(x=>x.str).join(' '),out=[],re=/QUEST(?:ÃO|AO)\s*0*(\d{1,2})/gi;let m;while((m=re.exec(text))){const q=Number(m[1]);if(q>=1&&q<=20&&!out.includes(q))out.push(q)}return out.sort((a,b)=>a-b)}catch{return[]}}
async function buildMaps(s){s.qToPage=new Map();s.pageToQuestions=new Map();const label=$('.v32-page-label',s.host);for(let p=1;p<=s.doc.numPages;p++){if(!s.host.isConnected)return;const qs=await extract(s.doc,p);if(qs.length){s.pageToQuestions.set(p,qs);for(const q of qs)if(!s.qToPage.has(q))s.qToPage.set(q,p)}if(label&&p%4===0)label.textContent=`Mapeando ${p}/${s.doc.numPages}`;if(p%2===0)await yieldUi()}}
function questionsOnPage(s,p=s.page){return s.pageToQuestions?.get(Number(p))||[]}
function pageText(s){const qs=questionsOnPage(s),suffix=!qs.length?'':qs.length===1?` · Q${qs[0]}`:` · Q${qs[0]}–${qs.at(-1)}`;return `Página ${s.page} de ${s.doc.numPages}${suffix}`}
async function renderPage(s,pageNumber){if(!s?.doc||!s.host?.isConnected)return;const n=Math.max(1,Math.min(s.doc.numPages,Number(pageNumber)||1));s.page=n;const page=await s.doc.getPage(n),stage=$('.v32-stage',s.host),canvas=$('.v32-canvas',s.host);if(!stage||!canvas)return;const base=page.getViewport({scale:1}),available=Math.max(300,stage.clientWidth-24),scale=Math.min(1.65,available/base.width),viewport=page.getViewport({scale}),ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(ratio,0,0,ratio,0,0);canvas.hidden=false;$('.v32-loading',s.host)?.setAttribute('hidden','');if(s.renderTask)try{s.renderTask.cancel()}catch{}s.renderTask=page.render({canvasContext:ctx,viewport});await s.renderTask.promise.catch(e=>{if(e?.name!=='RenderingCancelledException')throw e});const label=$('.v32-page-label',s.host);if(label)label.textContent=pageText(s);const prev=$('[data-v32-prev]',s.host),next=$('[data-v32-next]',s.host);if(prev)prev.disabled=n<=1;if(next)next.disabled=n>=s.doc.numPages}
async function syncPaper(){if(!state?.host?.isConnected)return;const q=current(),label=$('.v32-question-label',state.host);if(label)label.textContent=`Questão ${q}`;const page=state.qToPage?.get(q);if(page&&page!==state.page)await renderPage(state,page)}
function syncQuestion(){if(!state?.host?.isConnected)return;const qs=questionsOnPage(state);if(!qs.length)return;const q=current();if(qs.includes(q))return;$('#v29Sheet [data-v29-q="'+qs[0]+'"]')?.click()}
async function browse(offset){if(!state?.doc)return;await renderPage(state,state.page+offset);syncQuestion()}
function failure(message){if(!state?.host)return;const loading=$('.v32-loading',state.host),label=$('.v32-page-label',state.host);if(label)label.textContent='Leitor indisponível';if(!loading)return;loading.removeAttribute('hidden');loading.innerHTML=`<b>Não foi possível abrir o caderno sincronizado.</b><small>${String(message||'Tente novamente.')}</small><div class="v32-failure-actions"><button type="button" class="btn btn-pism" data-pism-sync-retry>Tentar novamente</button><a class="btn btn-secondary" href="${state.source}" target="_blank" rel="noopener">Abrir na UFJF</a></div>`;$('[data-pism-sync-retry]',loading)?.addEventListener('click',()=>connect(true).catch(()=>{}))}
async function connect(force=false){if(!state?.host?.isConnected)return;if(state.connecting&&!force)return;if(state.ready&&!force){await syncPaper();return}state.connecting=true;try{const pdfjs=await loadPdfJs();state.doc=await pdfjs.getDocument({url:proxy(state.source),withCredentials:false,disableRange:true,disableStream:true,disableAutoFetch:true}).promise;await renderPage(state,1);await buildMaps(state);await syncPaper();state.ready=true;window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.pismDirectSync=VERSION;window.GABARITO_APP.pismDirectSyncHealthy=true}catch(error){state.ready=false;window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.pismDirectSyncHealthy=false;console.warn('[Gabarito+] Sincronização PISM:',error?.message||error);failure(error?.message||error)}finally{state.connecting=false}}
async function mount(){const s=active(),runner=$('#v29PismOfficialRunner');if(!s||!runner)return false;const paper=$('.v29-paper',runner);if(!paper)return false;const existing=$('.gplus-pism-direct-sync[data-pism-direct-sync-version="'+VERSION+'"]',paper);if(existing&&state?.host===existing){await connect();return true}const iframe=$('iframe',paper),source=clean(iframe?.getAttribute('src')||s.examUrl);if(!source)return false;const holder=document.createElement('div');holder.innerHTML=markup(source);const host=holder.firstElementChild;if(iframe)iframe.replaceWith(host);else paper.appendChild(host);paper.classList.add('v32-native-document','gplus-pism-direct-sync-paper');state={host,paper,source,doc:null,page:1,qToPage:null,pageToQuestions:null,renderTask:null,connecting:false,ready:false};$('[data-v32-prev]',host)?.addEventListener('click',()=>browse(-1));$('[data-v32-next]',host)?.addEventListener('click',()=>browse(1));connect().catch(()=>{});return true}
async function enhance(){if(state&&!state.host?.isConnected)state=null;if(active())await mount()}
function schedule(delays=[0,120,300,700,1400,2800]){for(const delay of delays){const id=setTimeout(()=>{timers.delete(id);enhance().catch(()=>{})},delay);timers.add(id)}}
function onClick(event){const el=event.target?.closest?.('[data-v29-year],[data-v29-resume],#v29Sheet [data-v29-q],#v29Sheet [data-v29-letter]');if(!el)return;if(el.matches('[data-v29-year],[data-v29-resume]'))schedule([100,260,600,1200,2400,4000]);else schedule([0,50])}
function boot(){document.addEventListener('click',onClick,true);window.addEventListener('pageshow',()=>{if(active())schedule([80,250])});window.GABARITO_OFFICIAL_DOCUMENT={version:VERSION,enhance,sync:enhance,activate:schedule};window.GABARITO_PISM_DIRECT_SYNC={version:VERSION,enhance,sync:enhance,activate:schedule};window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.pismDirectSyncModule=VERSION}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
