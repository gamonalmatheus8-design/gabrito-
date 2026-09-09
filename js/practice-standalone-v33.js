(function(){
'use strict';
if(window.__GABARITO_PRACTICE_STANDALONE_V33__)return;
window.__GABARITO_PRACTICE_STANDALONE_V33__=true;

const VERSION='3.3.0';
const PAGE_SIZE=500;
const HISTORY_LIMIT=2000;
const HISTORY_PAGE_SIZE=500;
const LOCAL_ATTEMPTS='gplus_practice_v3_attempts';
const LOCAL_BOOKMARKS='gplus_practice_v3_bookmarks';
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(raw,fallback)=>{try{return JSON.parse(raw)}catch{return fallback}};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const state={
  loaded:false,loading:null,catalog:[],catalogById:new Map(),sources:new Map(),
  exam:'ENEM',year:'ALL',area:'ALL',subject:'ALL',topic:'ALL',status:'ALL',
  current:null,currentContent:null,selected:null,attempts:[],bookmarks:new Set(),
  paintToken:0,cloudLoaded:false,unavailable:new Set()
};
const pdfCache=new Map();
const contentCache=new Map();
let pdfLoader=null;

function cfg(){return window.ESTUDOS_SUPABASE_CONFIG||{}}
function client(){return window.estudosSupabase||window.__ESTUDOS_SUPABASE?.client||null}
function fmt(n){return Number(n||0).toLocaleString('pt-BR')}
function pct(a,b){return b?Math.round(a/b*100):0}
function fold(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function unique(xs){return [...new Set(xs.filter(v=>v!==null&&v!==undefined&&v!==''))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'))}
function localAttempts(){const x=safe(localStorage.getItem(LOCAL_ATTEMPTS),[]);return Array.isArray(x)?x:[]}
function localBookmarks(){const x=safe(localStorage.getItem(LOCAL_BOOKMARKS),[]);return new Set(Array.isArray(x)?x.map(String):[])}
function saveAttempts(){try{localStorage.setItem(LOCAL_ATTEMPTS,JSON.stringify(state.attempts.slice(0,HISTORY_LIMIT)))}catch{}}
function saveBookmarks(){try{localStorage.setItem(LOCAL_BOOKMARKS,JSON.stringify([...state.bookmarks]))}catch{}}

async function rest(table,params={}){
  const c=cfg();
  if(!c.url||!c.publishableKey)throw new Error('Banco de treino ainda não está conectado.');
  const url=new URL(`${String(c.url).replace(/\/$/,'')}/rest/v1/${table}`);
  for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null)url.searchParams.set(k,String(v));
  const res=await fetch(url,{headers:{apikey:c.publishableKey,accept:'application/json'},cache:'no-store'});
  if(!res.ok)throw new Error(`Falha ao carregar ${table}.`);
  return res.json();
}
async function restPaged(table,params={},pageSize=PAGE_SIZE){
  const rows=[];
  for(let offset=0;;offset+=pageSize){
    const page=await rest(table,{...params,limit:pageSize,offset});
    if(!Array.isArray(page))break;
    rows.push(...page);
    if(page.length<pageSize)break;
  }
  return rows;
}

function syncCounter(){
  const n=state.catalog.length;
  const side=$('#sideQCount');
  if(side){side.textContent=fmt(n);side.title=`${fmt(n)} questões no Banco de Treino validado`}
  const bank=$('#bankCountText');if(bank)bank.textContent=fmt(n);
  window.GABARITO_APP=window.GABARITO_APP||{};
  window.GABARITO_APP.practiceQuestionCount=n;
  window.GABARITO_APP.questionCounterSource='validated-practice-bank';
}

async function loadCatalog(force=false){
  if(state.loaded&&!force)return;
  if(state.loading&&!force)return state.loading;
  state.loading=(async()=>{
    const [questions,sources]=await Promise.all([
      restPaged('practice_questions',{
        select:'id,source_id,exam,year,application,module,day,original_number,variant,area,subject,topic,skill,content_mode,statement_text,options,asset_url,source_page_number,correct_answer,difficulty_label,provenance',
        status:'eq.published',order:'year.desc,original_number.asc'
      }),
      restPaged('practice_question_sources',{
        select:'id,source_key,exam,institution,year,application,module,day,booklet,source_page_url,source_pdf_url,answer_key_url,rights_status,rights_note,verified_at',
        order:'year.desc,day.asc'
      })
    ]);
    state.catalog=Array.isArray(questions)?questions:[];
    state.catalogById=new Map(state.catalog.map(q=>[String(q.id),q]));
    state.sources=new Map((Array.isArray(sources)?sources:[]).map(s=>[String(s.id),s]));
    state.attempts=localAttempts();
    state.bookmarks=localBookmarks();
    state.loaded=true;
    syncCounter();
    window.GABARITO_APP=window.GABARITO_APP||{};
    window.GABARITO_APP.practiceBank='standalone-v3.3';
    window.GABARITO_APP.practicePresentation='standalone-question';
    window.GABARITO_APP.practiceUsesPdfAsInterface=false;
    window.GABARITO_APP.authorialQuestionPractice=false;
    await loadCloudHistory().catch(()=>{});
  })().finally(()=>{state.loading=null});
  return state.loading;
}

async function loadCloudHistory(){
  if(state.cloudLoaded)return;
  const c=client();if(!c)return;
  const {data:{user}={}}=await c.auth.getUser().catch(()=>({data:{user:null}}));
  if(!user)return;
  const cloud=[];
  for(let from=0;from<HISTORY_LIMIT;from+=HISTORY_PAGE_SIZE){
    const to=Math.min(from+HISTORY_PAGE_SIZE-1,HISTORY_LIMIT-1);
    const {data,error}=await c.from('practice_attempts')
      .select('question_id,selected_answer,correct_answer,is_correct,response_ms,created_at')
      .eq('user_id',user.id).order('created_at',{ascending:false}).range(from,to);
    if(error)return;
    const page=Array.isArray(data)?data:[];
    cloud.push(...page);
    if(page.length<HISTORY_PAGE_SIZE)break;
  }
  const local=localAttempts(),seen=new Set(local.map(x=>`${x.question_id}|${x.created_at}`));
  for(const row of cloud)if(!seen.has(`${row.question_id}|${row.created_at}`))local.push(row);
  local.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  state.attempts=local.slice(0,HISTORY_LIMIT);saveAttempts();state.cloudLoaded=true;
}

function installStyles(){
  if($('#gplusPracticeStandaloneV33Style'))return;
  const s=document.createElement('style');
  s.id='gplusPracticeStandaloneV33Style';
  s.textContent=`
  #practiceV3{display:grid;gap:14px}
  .pv3-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:18px 20px;border:1px solid var(--border);border-radius:18px;background:var(--card)}
  .pv3-kicker{display:block;font-size:10px;font-weight:850;letter-spacing:.1em;color:var(--primary);margin-bottom:4px}
  .pv3-hero h1{margin:0 0 5px;font-size:clamp(23px,3vw,32px)}
  .pv3-hero p{margin:0;max-width:760px;color:var(--muted);line-height:1.5}
  .pv3-exams{display:flex;gap:7px}.pv3-exams button.active{background:var(--primary);border-color:var(--primary);color:#fff}
  .pv3-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
  .pv3-metric{padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:var(--card)}
  .pv3-metric span{display:block;font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:800;letter-spacing:.04em}
  .pv3-metric strong{display:block;font-size:21px;margin-top:3px}
  .pv3-filter{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;align-items:end;padding:12px;border:1px solid var(--border);border-radius:16px;background:var(--card)}
  .pv3-field label{display:block;font-size:10px;font-weight:800;color:var(--muted);margin-bottom:4px}
  .pv3-field select{width:100%;min-height:40px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);padding:0 9px}
  .pv3-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.65fr);gap:13px;align-items:start}
  .pv3-card,.pv3-side{border:1px solid var(--border);border-radius:18px;background:var(--card);overflow:hidden}
  .pv3-card-head{padding:12px 15px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px}
  .pv3-meta{display:flex;gap:6px;flex-wrap:wrap}.pv3-chip{font-size:10px;border:1px solid var(--border);border-radius:999px;padding:5px 8px;color:var(--muted)}
  .pv3-chip.primary{color:var(--primary);border-color:color-mix(in srgb,var(--primary) 35%,var(--border))}
  .pv33-question{padding:22px 22px 18px}.pv33-number{font-size:12px;font-weight:850;color:var(--muted);margin-bottom:13px}
  .pv33-statement{font-size:16px;line-height:1.65;color:var(--text);white-space:pre-line}
  .pv33-options{display:grid;gap:9px;margin-top:20px}
  .pv33-option{display:grid;grid-template-columns:34px 1fr;gap:11px;align-items:flex-start;width:100%;text-align:left;padding:12px 13px;border:1px solid var(--border);border-radius:13px;background:var(--card);color:var(--text);cursor:pointer;line-height:1.45}
  .pv33-option:hover{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 3%,var(--card))}
  .pv33-letter{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--surface-2,rgba(127,127,127,.08));font-weight:850}
  .pv33-option.selected{border-color:var(--primary)}.pv33-option.good{border-color:#25845a;background:color-mix(in srgb,#25845a 7%,var(--card))}
  .pv33-option.bad{border-color:#bd4747;background:color-mix(in srgb,#bd4747 6%,var(--card))}
  .pv33-feedback{margin-top:13px;padding:12px 13px;border-radius:12px;background:var(--surface-2,rgba(127,127,127,.06));font-size:12px;line-height:1.5}
  .pv33-actions{display:flex;gap:8px;margin-top:15px}.pv33-actions .btn{flex:1}
  .pv33-source{padding:10px 15px;border-top:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:10px;color:var(--muted)}
  .pv33-source a{font-weight:800;color:var(--primary)}
  .pv33-loading{min-height:250px;display:grid;place-items:center;text-align:center;padding:30px;color:var(--muted);line-height:1.55}
  .pv33-spinner{width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:pv33spin .75s linear infinite;margin:0 auto 11px}
  @keyframes pv33spin{to{transform:rotate(360deg)}}
  .pv3-side{padding:15px}.pv3-side h3{font-size:15px;margin:0 0 5px}.pv3-side p{margin:0;font-size:11px;line-height:1.5;color:var(--muted)}
  .pv3-bars{display:grid;gap:9px;margin-top:13px}.pv3-bar-row{display:grid;grid-template-columns:minmax(80px,1fr) 1.3fr auto;gap:8px;align-items:center;font-size:10px}
  .pv3-bar{height:7px;border-radius:99px;background:var(--surface-2,rgba(127,127,127,.1));overflow:hidden}.pv3-bar i{display:block;height:100%;background:var(--primary);border-radius:inherit}
  .pv3-trust{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:10px;line-height:1.5;color:var(--muted)}
  .pv3-empty{padding:38px 20px;text-align:center;color:var(--muted);line-height:1.55}.pv3-empty strong{display:block;color:var(--text);font-size:16px;margin-bottom:5px}
  .pv3-bookmarked{color:var(--primary)!important;border-color:var(--primary)!important}
  @media(max-width:1050px){.pv3-filter{grid-template-columns:repeat(3,minmax(0,1fr))}.pv3-layout{grid-template-columns:1fr}}
  @media(max-width:680px){.pv3-hero{flex-direction:column;padding:15px}.pv3-metrics{grid-template-columns:repeat(2,1fr)}.pv3-filter{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px}.pv33-question{padding:18px 14px}.pv33-statement{font-size:15px}.pv33-option{grid-template-columns:31px 1fr;padding:11px}.pv33-source{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(s);
}

function ensureShell(){
  const page=$('#page-questions');if(!page)return null;
  installStyles();
  if(!$('#practiceV3[data-mode="standalone-v33"]',page)){
    page.innerHTML=`<div id="practiceV3" data-mode="standalone-v33">
      <section class="pv3-hero">
        <div><span class="pv3-kicker">BANCO DE TREINO</span><h1>Questões para praticar</h1><p>Questões individuais, com enunciado e alternativas dentro do Gabarito+. A prova oficial é usada somente como fonte de validação e não aparece como interface de treino.</p></div>
        <div class="pv3-exams"><button class="btn btn-secondary active" type="button" data-pv3-exam="ENEM">ENEM</button><button class="btn btn-secondary" type="button" data-pv3-exam="PISM">PISM</button></div>
      </section>
      <section class="pv3-metrics">
        <div class="pv3-metric"><span>Respondidas</span><strong id="pv3Answered">0</strong></div>
        <div class="pv3-metric"><span>Acertos</span><strong id="pv3Correct">0</strong></div>
        <div class="pv3-metric"><span>Erros</span><strong id="pv3Wrong">0</strong></div>
        <div class="pv3-metric"><span>Aproveitamento</span><strong id="pv3Rate">0%</strong></div>
      </section>
      <section class="pv3-filter">
        <div class="pv3-field"><label>Ano</label><select id="pv3Year"></select></div>
        <div class="pv3-field"><label>Área</label><select id="pv3Area"></select></div>
        <div class="pv3-field"><label>Disciplina</label><select id="pv3Subject"></select></div>
        <div class="pv3-field"><label>Assunto</label><select id="pv3Topic"></select></div>
        <div class="pv3-field"><label>Status</label><select id="pv3Status"><option value="ALL">Todas</option><option value="UNSEEN">Não respondidas</option><option value="WRONG">Meus erros</option><option value="BOOKMARKED">Salvas</option></select></div>
        <button class="btn btn-primary" id="pv3New" type="button">Nova questão</button>
      </section>
      <section class="pv3-layout">
        <div class="pv3-card">
          <div class="pv3-card-head"><div class="pv3-meta" id="pv3Meta"></div><button class="btn btn-ghost btn-sm" id="pv3Bookmark" type="button">Salvar</button></div>
          <div id="pv3QuestionHost"><div class="pv33-loading"><div><div class="pv33-spinner"></div>Preparando banco de treino…</div></div></div>
          <div class="pv33-source" id="pv3Sourcebar"></div>
        </div>
        <aside class="pv3-side"><h3>Diagnóstico do treino</h3><p id="pv3DiagnosisText">Responda algumas questões para o diagnóstico começar a orientar sua revisão.</p><div class="pv3-bars" id="pv3Bars"></div><div class="pv3-trust">O contador considera apenas o Banco de Treino validado, não o banco autoral antigo.</div></aside>
      </section>
    </div>`;
    bindShell();
  }
  return page;
}

function bindShell(){
  $$('[data-pv3-exam]').forEach(b=>b.addEventListener('click',()=>{
    state.exam=b.dataset.pv3Exam;state.year=state.area=state.subject=state.topic='ALL';state.status='ALL';
    refreshControls();pickQuestion(true);
  }));
  $('#pv3Year')?.addEventListener('change',e=>{state.year=e.target.value;state.area=state.subject=state.topic='ALL';refreshControls();pickQuestion(true)});
  $('#pv3Area')?.addEventListener('change',e=>{state.area=e.target.value;state.subject=state.topic='ALL';refreshControls();pickQuestion(true)});
  $('#pv3Subject')?.addEventListener('change',e=>{state.subject=e.target.value;state.topic='ALL';refreshControls();pickQuestion(true)});
  $('#pv3Topic')?.addEventListener('change',e=>{state.topic=e.target.value;pickQuestion(true)});
  $('#pv3Status')?.addEventListener('change',e=>{state.status=e.target.value;pickQuestion(true)});
  $('#pv3New')?.addEventListener('click',()=>pickQuestion(true));
  $('#pv3Bookmark')?.addEventListener('click',toggleBookmark);
}

function optionHtml(value,label,current){return `<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`}

function refreshControls(){
  $$('[data-pv3-exam]').forEach(b=>b.classList.toggle('active',b.dataset.pv3Exam===state.exam));
  const examRows=state.catalog.filter(q=>q.exam===state.exam&&!state.unavailable.has(String(q.id)));
  const years=unique(examRows.map(q=>q.year)).sort((a,b)=>Number(b)-Number(a));
  if(state.year!=='ALL'&&!years.map(String).includes(String(state.year)))state.year='ALL';
  const yearRows=examRows.filter(q=>state.year==='ALL'||String(q.year)===String(state.year));
  const areas=unique(yearRows.map(q=>q.area));if(state.area!=='ALL'&&!areas.includes(state.area))state.area='ALL';
  const areaRows=yearRows.filter(q=>state.area==='ALL'||q.area===state.area);
  const subjects=unique(areaRows.map(q=>q.subject));if(state.subject!=='ALL'&&!subjects.includes(state.subject))state.subject='ALL';
  const subjectRows=areaRows.filter(q=>state.subject==='ALL'||q.subject===state.subject);
  const topics=unique(subjectRows.map(q=>q.topic));if(state.topic!=='ALL'&&!topics.includes(state.topic))state.topic='ALL';
  if($('#pv3Year'))$('#pv3Year').innerHTML=optionHtml('ALL','Todos os anos',state.year)+years.map(y=>optionHtml(String(y),String(y),state.year)).join('');
  if($('#pv3Area'))$('#pv3Area').innerHTML=optionHtml('ALL','Todas as áreas',state.area)+areas.map(x=>optionHtml(x,x,state.area)).join('');
  if($('#pv3Subject'))$('#pv3Subject').innerHTML=optionHtml('ALL','Todas as disciplinas',state.subject)+subjects.map(x=>optionHtml(x,x,state.subject)).join('');
  if($('#pv3Topic')){$('#pv3Topic').innerHTML=optionHtml('ALL',topics.length?'Todos os assuntos':'Sem assunto neste filtro',state.topic)+topics.map(x=>optionHtml(x,x,state.topic)).join('');$('#pv3Topic').disabled=!topics.length}
  if($('#pv3Status'))$('#pv3Status').value=state.status;
  renderMetrics();syncCounter();
}

function latestAttempts(){const m=new Map();for(const a of state.attempts)if(!m.has(String(a.question_id)))m.set(String(a.question_id),a);return m}
function filtered(){
  const latest=latestAttempts();
  return state.catalog.filter(q=>{
    const id=String(q.id);if(state.unavailable.has(id))return false;
    if(q.exam!==state.exam)return false;
    if(state.year!=='ALL'&&String(q.year)!==String(state.year))return false;
    if(state.area!=='ALL'&&q.area!==state.area)return false;
    if(state.subject!=='ALL'&&q.subject!==state.subject)return false;
    if(state.topic!=='ALL'&&q.topic!==state.topic)return false;
    const a=latest.get(id);
    if(state.status==='UNSEEN'&&a)return false;
    if(state.status==='WRONG'&&(!a||a.is_correct!==false))return false;
    if(state.status==='BOOKMARKED'&&!state.bookmarks.has(id))return false;
    return true;
  });
}

function pickQuestion(preferUnseen=false,depth=0){
  state.selected=null;state.currentContent=null;
  let rows=filtered();
  if(!rows.length){renderEmpty();return}
  if(preferUnseen){const latest=latestAttempts(),u=rows.filter(q=>!latest.has(String(q.id)));if(u.length)rows=u}
  if(rows.length>1&&state.current)rows=rows.filter(q=>String(q.id)!==String(state.current.id));
  state.current=rows[Math.floor(Math.random()*rows.length)]||rows[0];
  void renderCurrent(depth);
}

function renderEmpty(){
  state.current=null;
  if($('#pv3Meta'))$('#pv3Meta').innerHTML='';
  if($('#pv3Sourcebar'))$('#pv3Sourcebar').innerHTML='';
  updateBookmarkButton();
  const host=$('#pv3QuestionHost');if(!host)return;
  host.innerHTML=state.exam==='PISM'
    ?'<div class="pv3-empty"><strong>PISM ainda em preparação</strong>O treino só será liberado quando as questões estiverem estruturadas e validadas individualmente.</div>'
    :'<div class="pv3-empty"><strong>Nenhuma questão disponível neste filtro</strong>Ajuste ano, área, disciplina, assunto ou status.</div>';
}

function normalizedOptions(value){
  if(Array.isArray(value))return value.map(x=>String(x??'').trim()).filter(Boolean);
  if(value&&typeof value==='object')return ['A','B','C','D','E'].map(k=>String(value[k]??value[k.toLowerCase()]??'').trim()).filter(Boolean);
  return [];
}
function storedContent(q){
  const statement=String(q.statement_text||'').trim(),options=normalizedOptions(q.options);
  return statement&&options.length===5?{statement,options,origin:'stored'}:null;
}

async function loadPdfJs(){
  if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;return window.pdfjsLib}
  if(pdfLoader)return pdfLoader;
  pdfLoader=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-pv33-pdfjs]');
    if(existing){existing.addEventListener('load',()=>resolve(window.pdfjsLib),{once:true});existing.addEventListener('error',()=>reject(new Error('Leitor de fonte indisponível.')),{once:true});return}
    const s=document.createElement('script');s.src=PDFJS;s.async=true;s.dataset.pv33Pdfjs='1';
    s.onload=()=>{if(!window.pdfjsLib)return reject(new Error('Leitor de fonte indisponível.'));window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;resolve(window.pdfjsLib)};
    s.onerror=()=>reject(new Error('Não foi possível preparar esta questão.'));
    document.head.appendChild(s);
  });
  return pdfLoader;
}
function proxy(exam,url){return exam==='PISM'?`/api/pism-pdf?url=${encodeURIComponent(url)}`:`/api/enem-pdf?url=${encodeURIComponent(url)}`}
async function pdfEntry(q,src){
  if(!src?.source_pdf_url)throw new Error('Fonte da questão não disponível.');
  const key=String(src.id);
  if(pdfCache.has(key))return pdfCache.get(key);
  const lib=await loadPdfJs();
  const task=lib.getDocument({url:proxy(q.exam,src.source_pdf_url),withCredentials:false,disableRange:true,disableStream:false,disableAutoFetch:true});
  const doc=await task.promise;
  const entry={doc,pages:new Map(),locations:new Map()};
  pdfCache.set(key,entry);return entry;
}
function qNumber(text){
  const t=fold(text);
  let m=t.match(/^Quest\s*ao\s*0*(\d{1,3})(?:\s|$)/i);
  if(!m)m=t.match(/^Questao\s*0*(\d{1,3})(?:\s|$)/i);
  return m?Number(m[1]):null;
}
function isBoilerplate(text){
  const t=fold(text);
  if(!t)return true;
  if(/^ENEM20\d{2}(?:ENEM20\d{2})+/i.test(t))return true;
  if(/^\*\d+[A-Z0-9]+\*$/i.test(t))return true;
  if(/^(CIENCIAS DA NATUREZA|MATEMATICA|LINGUAGENS|CIENCIAS HUMANAS).*(CADERNO|DIA)/i.test(t))return true;
  if(/^Quest(oes|oes de)\s+\d+\s+a\s+\d+/i.test(t))return true;
  if(/^\d{1,2}$/.test(t))return true;
  return false;
}
function makeColumnLines(items,width){
  const buckets=[[],[]];
  for(const item of items){
    const text=String(item.str||'').replace(/\s+/g,' ').trim();if(!text)continue;
    const x=Number(item.transform?.[4]||0),y=Number(item.transform?.[5]||0);
    const col=x>width*.52?1:0;
    let line=buckets[col].find(l=>Math.abs(l.y-y)<2.4);
    if(!line){line={y,items:[]};buckets[col].push(line)}
    line.items.push({x,text});
  }
  const out=[];
  for(let col=0;col<2;col++){
    const lines=buckets[col].map(l=>({col,y:l.y,text:l.items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(' ').replace(/\s+/g,' ').trim()})).sort((a,b)=>b.y-a.y);
    out.push(...lines);
  }
  return out.filter(l=>!isBoilerplate(l.text));
}
async function pageData(entry,p){
  if(entry.pages.has(p))return entry.pages.get(p);
  const page=await entry.doc.getPage(p),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
  const lines=makeColumnLines(content.items,viewport.width);
  const data={lines,heads:lines.map((line,index)=>({q:qNumber(line.text),index,line})).filter(x=>x.q!==null)};
  entry.pages.set(p,data);return data;
}
function variantContext(lines,index){
  for(let i=index-1;i>=0&&i>=index-45;i--){
    const t=fold(lines[i].text).toLowerCase();
    if(/^espanhol\b/.test(t)||/lingua estrangeira.*espanhol/.test(t))return 'espanhol';
    if(/^ingles\b/.test(t)||/lingua estrangeira.*ingles/.test(t))return 'ingles';
  }
  return '';
}
function variantMatches(q,lines,index){
  const v=fold(q.variant||'').toLowerCase();if(!v)return true;
  const ctx=variantContext(lines,index);
  if(v.includes('espan'))return ctx==='espanhol';
  if(v.includes('ingl'))return ctx==='ingles';
  return true;
}
async function findLocation(entry,q){
  const target=Number(q.original_number),cacheKey=`${target}|${q.variant||''}`;
  if(entry.locations.has(cacheKey))return entry.locations.get(cacheKey);
  const n=entry.doc.numPages,preferred=Number(q.source_page_number||0);
  const check=async p=>{
    if(p<1||p>n)return null;
    const data=await pageData(entry,p);
    const hits=data.heads.filter(h=>h.q===target&&variantMatches(q,data.lines,h.index));
    return hits.length?{page:p,index:hits[0].index,data}:null;
  };
  if(preferred>0){
    for(const p of [preferred,preferred-1,preferred+1]){const hit=await check(p);if(hit){entry.locations.set(cacheKey,hit);return hit}}
  }
  const start=q.exam==='ENEM'?(Number(q.day)===2?91:1):1;
  const end=q.exam==='ENEM'?(Number(q.day)===2?180:90):Math.max(60,target);
  const ratio=Math.max(0,Math.min(1,(target-start)/Math.max(1,end-start)));
  const estimate=Math.max(1,Math.min(n,Math.round(2+ratio*Math.max(1,n-4))));
  const seen=new Set();
  for(let r=0;r<=12;r++){
    for(const p of r===0?[estimate]:[estimate-r,estimate+r]){
      if(p<1||p>n||seen.has(p))continue;seen.add(p);
      const hit=await check(p);if(hit){entry.locations.set(cacheKey,hit);return hit}
    }
    await wait(0);
  }
  for(let p=1;p<=n;p++){
    if(seen.has(p))continue;
    const hit=await check(p);if(hit){entry.locations.set(cacheKey,hit);return hit}
    if(p%3===0)await wait(0);
  }
  throw new Error('Não consegui estruturar esta questão agora.');
}
async function collectBlock(entry,loc){
  const lines=[];
  let p=loc.page,index=loc.index+1;
  for(let pass=0;pass<3&&p<=entry.doc.numPages;pass++,p++,index=0){
    const data=pass===0?loc.data:await pageData(entry,p);
    for(let i=index;i<data.lines.length;i++){
      if(qNumber(data.lines[i].text)!==null)return lines;
      lines.push(data.lines[i].text);
    }
  }
  return lines;
}
function optionStart(text){
  const t=String(text||'').trim();
  const m=t.match(/^([A-E])(?:[\s.)\-:]+)(.*)$/);
  return m?{letter:m[1],rest:String(m[2]||'').trim()}:null;
}
function parseBlock(lines){
  const clean=lines.map(x=>String(x||'').replace(/\s+/g,' ').trim()).filter(Boolean);
  const candidates=clean.map((text,index)=>({index,text,start:optionStart(text)})).filter(x=>x.start);
  let marks=null;
  for(const a of candidates.filter(x=>x.start.letter==='A')){
    const found=[a];let cursor=a.index;
    for(const letter of ['B','C','D','E']){
      const next=candidates.find(x=>x.index>cursor&&x.index<=cursor+12&&x.start.letter===letter);
      if(!next){found.length=0;break}
      found.push(next);cursor=next.index;
    }
    if(found.length===5){marks=found;break}
  }
  if(!marks)throw new Error('Alternativas ainda não estruturadas.');
  const statement=clean.slice(0,marks[0].index).join('\n').trim();
  const options=[];
  for(let i=0;i<5;i++){
    const start=marks[i],end=i<4?marks[i+1].index:clean.length;
    const pieces=[start.start.rest,...clean.slice(start.index+1,end)].filter(Boolean);
    options.push(pieces.join(' ').trim());
  }
  if(statement.length<12||options.length!==5||options.some(x=>x.length<1))throw new Error('Questão incompleta para treino.');
  return {statement,options,origin:'source-text'};
}
async function getContent(q,src){
  const key=String(q.id);
  if(contentCache.has(key))return contentCache.get(key);
  const stored=storedContent(q);if(stored){contentCache.set(key,stored);return stored}
  const entry=await pdfEntry(q,src),loc=await findLocation(entry,q),lines=await collectBlock(entry,loc),parsed=parseBlock(lines);
  contentCache.set(key,parsed);return parsed;
}

async function renderCurrent(depth=0){
  const q=state.current;if(!q)return;
  const token=++state.paintToken,src=state.sources.get(String(q.source_id)),host=$('#pv3QuestionHost');
  if($('#pv3Meta'))$('#pv3Meta').innerHTML=`<span class="pv3-chip primary">${esc(q.exam)} ${esc(q.year)}</span>${q.variant?`<span class="pv3-chip">${esc(q.variant)}</span>`:''}<span class="pv3-chip">${esc(q.area)}</span><span class="pv3-chip">${esc(q.subject)}</span>${q.topic?`<span class="pv3-chip">${esc(q.topic)}</span>`:''}`;
  if($('#pv3Sourcebar')){
    const note=src?.rights_note?` · ${esc(src.rights_note.replace(/.*licença\s*/i,'licença '))}`:'';
    $('#pv3Sourcebar').innerHTML=`<span>Fonte validada: ${esc(src?.institution||'INEP')}${note}</span>${src?.source_page_url?`<a href="${esc(src.source_page_url)}" target="_blank" rel="noopener">Fonte</a>`:''}`;
  }
  updateBookmarkButton();renderMetrics();
  if(host)host.innerHTML='<div class="pv33-loading"><div><div class="pv33-spinner"></div><strong>Preparando questão…</strong><br><small>Montando enunciado e alternativas no formato de treino.</small></div></div>';
  try{
    const content=await getContent(q,src);
    if(token!==state.paintToken)return;
    state.currentContent=content;renderStandaloneQuestion(q,content);
    setTimeout(()=>void preloadNext(),120);
  }catch(error){
    if(token!==state.paintToken)return;
    state.unavailable.add(String(q.id));refreshControls();
    if(depth<5&&filtered().length){pickQuestion(true,depth+1);return}
    if(host)host.innerHTML='<div class="pv3-empty"><strong>Este filtro ainda tem itens em conversão.</strong>Escolha outro assunto ou clique em Nova questão para continuar.</div>';
    console.warn('[Gabarito+] Treino standalone:',error?.message||error);
  }
}

function renderStandaloneQuestion(q,content){
  const host=$('#pv3QuestionHost');if(!host)return;
  host.innerHTML=`<div class="pv33-question">
    <div class="pv33-number">Questão ${esc(q.original_number)}${q.variant?` · ${esc(q.variant)}`:''}</div>
    <div class="pv33-statement">${esc(content.statement)}</div>
    <div class="pv33-options">${content.options.map((text,i)=>`<button type="button" class="pv33-option" data-pv3-answer="${String.fromCharCode(65+i)}"><span class="pv33-letter">${String.fromCharCode(65+i)}</span><span>${esc(text)}</span></button>`).join('')}</div>
    <div id="pv3Feedback"></div>
    <div class="pv33-actions"><button class="btn btn-primary" type="button" id="pv3Next">Próxima questão</button></div>
  </div>`;
  $$('[data-pv3-answer]',host).forEach(b=>b.addEventListener('click',()=>answer(b.dataset.pv3Answer)));
  $('#pv3Next',host)?.addEventListener('click',()=>pickQuestion(true));
  if(window.lucide)window.lucide.createIcons();
}

async function preloadNext(){
  const rows=filtered().filter(q=>String(q.id)!==String(state.current?.id));
  if(!rows.length)return;
  const q=rows[Math.floor(Math.random()*rows.length)],src=state.sources.get(String(q.source_id));
  try{await getContent(q,src)}catch{}
}

function updateBookmarkButton(){
  const b=$('#pv3Bookmark'),q=state.current;if(!b)return;
  const on=Boolean(q&&state.bookmarks.has(String(q.id)));
  b.textContent=on?'Salva':'Salvar';b.classList.toggle('pv3-bookmarked',on);b.disabled=!q;
}
function toggleBookmark(){
  const q=state.current;if(!q)return;
  const id=String(q.id);if(state.bookmarks.has(id))state.bookmarks.delete(id);else state.bookmarks.add(id);
  saveBookmarks();updateBookmarkButton();refreshControls();
}

async function answer(letter){
  const q=state.current;if(!q||state.selected)return;
  const correct=String(q.correct_answer||'').toUpperCase();if(!/^[A-E]$/.test(correct))return;
  state.selected=letter;const ok=letter===correct;
  $$('[data-pv3-answer]').forEach(b=>{
    b.disabled=true;b.classList.toggle('selected',b.dataset.pv3Answer===letter);
    if(b.dataset.pv3Answer===correct)b.classList.add('good');
    else if(b.dataset.pv3Answer===letter&&!ok)b.classList.add('bad');
  });
  const f=$('#pv3Feedback');
  if(f)f.innerHTML=`<div class="pv33-feedback"><strong>${ok?'Acertou.':'Errou.'}</strong> Gabarito: <b>${correct}</b>.${q.topic?`<br>Assunto: <b>${esc(q.topic)}</b>.`:''}</div>`;
  const row={question_id:String(q.id),selected_answer:letter,correct_answer:correct,is_correct:ok,response_ms:null,created_at:new Date().toISOString()};
  state.attempts.unshift(row);state.attempts=state.attempts.slice(0,HISTORY_LIMIT);saveAttempts();renderMetrics();void saveCloudAttempt(row);
}
async function saveCloudAttempt(row){
  const c=client();if(!c)return;
  try{const {data:{user}={}}=await c.auth.getUser();if(user)await c.from('practice_attempts').insert({...row,user_id:user.id})}catch{}
}

function renderMetrics(){
  const rows=state.attempts.filter(a=>state.catalogById.get(String(a.question_id))?.exam===state.exam);
  const answered=rows.length,correct=rows.filter(x=>x.is_correct===true).length,wrong=rows.filter(x=>x.is_correct===false).length;
  if($('#pv3Answered'))$('#pv3Answered').textContent=fmt(answered);
  if($('#pv3Correct'))$('#pv3Correct').textContent=fmt(correct);
  if($('#pv3Wrong'))$('#pv3Wrong').textContent=fmt(wrong);
  if($('#pv3Rate'))$('#pv3Rate').textContent=`${pct(correct,answered)}%`;
  renderDiagnosis(rows);
}
function renderDiagnosis(attempts){
  const groups=new Map();
  for(const a of attempts){
    const q=state.catalogById.get(String(a.question_id));if(!q)continue;
    const key=q.subject||q.area||'Geral',g=groups.get(key)||{a:0,c:0};g.a++;if(a.is_correct)g.c++;groups.set(key,g);
  }
  const rows=[...groups].map(([name,g])=>({name,...g,rate:pct(g.c,g.a)})).sort((a,b)=>a.rate-b.rate||b.a-a.a);
  const text=$('#pv3DiagnosisText'),bars=$('#pv3Bars');
  if(!rows.length){if(text)text.textContent='Responda algumas questões para o diagnóstico começar a orientar sua revisão.';if(bars)bars.innerHTML='';return}
  const weak=rows[0];if(text)text.innerHTML=`Prioridade atual: <b>${esc(weak.name)}</b> · ${weak.rate}% de acerto em ${weak.a} tentativa(s).`;
  if(bars)bars.innerHTML=rows.slice(0,5).map(x=>`<div class="pv3-bar-row"><span>${esc(x.name)}</span><div class="pv3-bar"><i style="width:${x.rate}%"></i></div><b>${x.rate}%</b></div>`).join('');
}

async function open(){
  ensureShell();syncCounter();
  const host=$('#pv3QuestionHost');if(host)host.innerHTML='<div class="pv33-loading"><div><div class="pv33-spinner"></div>Carregando Banco de Treino…</div></div>';
  try{
    await loadCatalog();state.bookmarks=localBookmarks();await loadCloudHistory().catch(()=>{});
    refreshControls();
    if(!state.current||!state.catalogById.has(String(state.current.id))||state.unavailable.has(String(state.current.id)))pickQuestion(true);
    else void renderCurrent();
  }catch(error){
    if(host)host.innerHTML=`<div class="pv3-empty"><strong>Banco de Treino indisponível agora.</strong>${esc(error?.message||'Tente novamente em instantes.')}</div>`;
    console.error('[Gabarito+] Standalone practice:',error);
  }
}

async function reload(){
  state.loaded=false;state.cloudLoaded=false;state.bookmarks=localBookmarks();
  await loadCatalog(true);refreshControls();return open();
}

function install(){
  installStyles();
  const api={version:VERSION,open,next:()=>pickQuestion(true),reload,get state(){return{...state,catalog:[...state.catalog],catalogById:new Map(state.catalogById),sources:new Map(state.sources),bookmarks:new Set(state.bookmarks)}}};
  window.GABARITO_PRACTICE_STANDALONE=api;
  window.GABARITO_PRACTICE_V3=api;
  window.renderQuestionPage=open;
  window.v42OpenQuestions=()=>window.go?.('questions');
  window.v40OpenFocusedQuestions=()=>window.go?.('questions');
  window.GABARITO_APP=window.GABARITO_APP||{};
  window.GABARITO_APP.questionBankMode='validated_practice_standalone_v33';
  window.GABARITO_APP.questionRouteOwner='app-go-direct';
  window.GABARITO_APP.questionPracticeSeparatedFromMocks=true;
  window.GABARITO_APP.authorialQuestionPractice=false;
  window.GABARITO_APP.practiceUsesPdfAsInterface=false;
  setTimeout(syncCounter,0);setTimeout(syncCounter,700);
  if(window.app?.page==='questions'||$('#page-questions')?.classList.contains('active'))void open();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();