(function(){
'use strict';
if(window.__GABARITO_PRACTICE_STANDALONE_V34__)return;
window.__GABARITO_PRACTICE_STANDALONE_V34__=true;

const VERSION='3.4.0';
const PAGE_SIZE=500;
const HISTORY_LIMIT=2000;
const HISTORY_PAGE_SIZE=500;
const LOCAL_ATTEMPTS='gplus_practice_v3_attempts';
const LOCAL_BOOKMARKS='gplus_practice_v3_bookmarks';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(raw,fallback)=>{try{return JSON.parse(raw)}catch{return fallback}};

const state={
  loaded:false,loading:null,catalog:[],catalogById:new Map(),sources:new Map(),
  exam:'ENEM',year:'ALL',area:'ALL',subject:'ALL',topic:'ALL',status:'ALL',
  current:null,currentContent:null,selected:null,attempts:[],bookmarks:new Set(),
  paintToken:0,cloudLoaded:false,unavailable:new Set()
};
const contentCache=new Map();

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
    window.GABARITO_APP.practiceBank='standalone-v3.4-stored';
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
  if($('#gplusPracticeStandaloneV34Style'))return;
  const s=document.createElement('style');
  s.id='gplusPracticeStandaloneV34Style';
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
  .pv34-asset-wrap{display:grid;place-items:center;margin:16px 0 18px;padding:10px;border:1px solid var(--border);border-radius:13px;background:#fff;overflow:hidden}
  .pv34-asset{display:block;max-width:100%;height:auto;max-height:760px;object-fit:contain}
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
  if(!$('#practiceV3[data-mode="standalone-v34"]',page)){
    page.innerHTML=`<div id="practiceV3" data-mode="standalone-v34">
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

async function getContent(q){
  const key=String(q.id);
  if(contentCache.has(key))return contentCache.get(key);
  const stored=storedContent(q);
  if(!stored)throw new Error('Questão aguardando conteúdo estruturado no Banco de Treino.');
  contentCache.set(key,stored);return stored;
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
  if(host)host.innerHTML='<div class="pv33-loading"><div><div class="pv33-spinner"></div><strong>Preparando questão…</strong><br><small>Carregando enunciado, alternativas e recursos individuais do Banco de Treino.</small></div></div>';
  try{
    const content=await getContent(q);
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
    ${q.asset_url?`<div class="pv34-asset-wrap"><img class="pv34-asset" src="${esc(q.asset_url)}" alt="Imagem individual da questão ${esc(q.original_number)} do ${esc(q.exam)} ${esc(q.year)}" loading="eager" decoding="async"></div>`:''}
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
  const q=rows[Math.floor(Math.random()*rows.length)];
  try{await getContent(q)}catch{}
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
  window.GABARITO_APP.questionBankMode='validated_practice_standalone_v34';
  window.GABARITO_APP.questionRouteOwner='app-go-direct';
  window.GABARITO_APP.questionPracticeSeparatedFromMocks=true;
  window.GABARITO_APP.authorialQuestionPractice=false;
  window.GABARITO_APP.practiceUsesPdfAsInterface=false;
  setTimeout(syncCounter,0);setTimeout(syncCounter,700);
  if(window.app?.page==='questions'||$('#page-questions')?.classList.contains('active'))void open();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();