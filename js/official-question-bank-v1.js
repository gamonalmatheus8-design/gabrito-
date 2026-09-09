(function(){
'use strict';
if(window.__GABARITO_PRACTICE_BANK_V3__)return;
window.__GABARITO_PRACTICE_BANK_V3__=true;

const VERSION='3.0.1';
const REST_PAGE_SIZE=500;
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
  loaded:false,loading:null,catalog:[],sources:new Map(),exam:'ENEM',area:'ALL',subject:'ALL',topic:'ALL',status:'ALL',
  current:null,selected:null,attempts:[],bookmarks:new Set(),paintToken:0,active:false,cloudLoaded:false
};
const pdfCache=new Map();
let pdfLoader=null;

function cfg(){return window.ESTUDOS_SUPABASE_CONFIG||{}}
function appClient(){return window.estudosSupabase||window.__ESTUDOS_SUPABASE?.client||null}
function fmt(n){return Number(n||0).toLocaleString('pt-BR')}
function pct(a,b){return b?Math.round(a/b*100):0}
function unique(xs){return [...new Set(xs.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'))}
function localAttempts(){const rows=safe(localStorage.getItem(LOCAL_ATTEMPTS),[]);return Array.isArray(rows)?rows:[]}
function localBookmarks(){const rows=safe(localStorage.getItem(LOCAL_BOOKMARKS),[]);return new Set(Array.isArray(rows)?rows:[])}
function saveAttempts(rows){try{localStorage.setItem(LOCAL_ATTEMPTS,JSON.stringify(rows.slice(0,2000)))}catch{}}
function saveBookmarks(){try{localStorage.setItem(LOCAL_BOOKMARKS,JSON.stringify([...state.bookmarks]))}catch{}}

async function rest(table,params={}){
  const c=cfg();
  if(!c.url||!c.publishableKey)throw new Error('Banco de treino ainda não está conectado.');
  const url=new URL(`${String(c.url).replace(/\/$/,'')}/rest/v1/${table}`);
  for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null)url.searchParams.set(k,String(v));
  const res=await fetch(url,{headers:{apikey:c.publishableKey,accept:'application/json'},cache:'no-store'});
  if(!res.ok){const body=await res.text().catch(()=>'');throw new Error(body||`Falha ao carregar ${table}.`)}
  return res.json();
}

async function restPaged(table,params={},pageSize=REST_PAGE_SIZE){
  const rows=[];
  for(let offset=0;;offset+=pageSize){
    const page=await rest(table,{...params,limit:pageSize,offset});
    if(!Array.isArray(page))break;
    rows.push(...page);
    if(page.length<pageSize)break;
  }
  return rows;
}

async function loadCatalog(force=false){
  if(state.loaded&&!force)return;
  if(state.loading&&!force)return state.loading;
  state.loading=(async()=>{
    const [questions,sources]=await Promise.all([
      restPaged('practice_questions',{
        select:'id,source_id,exam,year,application,module,day,original_number,variant,area,subject,topic,skill,content_mode,source_page_number,source_crop,asset_url,correct_answer,difficulty_label,difficulty_value,difficulty_basis,taxonomy_basis,provenance',
        status:'eq.published',order:'year.desc,original_number.asc'
      }),
      restPaged('practice_question_sources',{
        select:'id,source_key,exam,institution,year,application,module,day,booklet,source_page_url,source_pdf_url,answer_key_url,rights_status,rights_note,verified_at',
        order:'year.desc,day.asc'
      })
    ]);
    state.catalog=Array.isArray(questions)?questions:[];
    state.sources=new Map((Array.isArray(sources)?sources:[]).map(x=>[x.id,x]));
    state.attempts=localAttempts();
    state.bookmarks=localBookmarks();
    state.loaded=true;
    window.GABARITO_APP=window.GABARITO_APP||{};
    window.GABARITO_APP.practiceBank='validated-v3';
    window.GABARITO_APP.practiceQuestionCount=state.catalog.length;
    window.GABARITO_APP.practiceBankPageSize=REST_PAGE_SIZE;
    window.GABARITO_APP.authorialQuestionPractice=false;
    await loadCloudHistory().catch(()=>{});
  })().finally(()=>{state.loading=null});
  return state.loading;
}

async function loadCloudHistory(){
  if(state.cloudLoaded)return;
  const client=appClient();if(!client)return;
  const {data:{user}={}}=await client.auth.getUser().catch(()=>({data:{user:null}}));
  if(!user)return;
  const {data,error}=await client.from('practice_attempts')
    .select('question_id,selected_answer,correct_answer,is_correct,response_ms,created_at')
    .eq('user_id',user.id).order('created_at',{ascending:false}).limit(1000);
  if(error)return;
  const local=localAttempts(),seen=new Set(local.map(x=>`${x.question_id}|${x.created_at}`));
  for(const row of data||[])if(!seen.has(`${row.question_id}|${row.created_at}`))local.push(row);
  local.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  state.attempts=local.slice(0,2000);saveAttempts(state.attempts);state.cloudLoaded=true;
}

function installStyles(){
  if($('#gplusPracticeV3Style'))return;
  const s=document.createElement('style');s.id='gplusPracticeV3Style';s.textContent=`
  #practiceV3{display:grid;gap:14px}.pv3-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px;border:1px solid var(--border);border-radius:20px;background:var(--card)}.pv3-kicker{font-size:10px;font-weight:850;letter-spacing:.11em;color:var(--primary)}.pv3-hero h1{font-size:clamp(24px,3vw,34px);margin:5px 0 5px}.pv3-hero p{max-width:760px;margin:0;color:var(--muted);line-height:1.5}.pv3-exams{display:flex;gap:7px;flex-wrap:wrap}.pv3-exams button.active{background:var(--primary);border-color:var(--primary);color:#fff}.pv3-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.pv3-metric{padding:13px 15px;border:1px solid var(--border);border-radius:15px;background:var(--card)}.pv3-metric span{display:block;color:var(--muted);font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.05em}.pv3-metric strong{display:block;font-size:22px;margin-top:4px}.pv3-filter{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;padding:13px;border:1px solid var(--border);border-radius:16px;background:var(--card);align-items:end}.pv3-field label{display:block;font-size:10px;font-weight:750;color:var(--muted);margin-bottom:4px}.pv3-field select{width:100%;min-height:40px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);padding:0 9px}.pv3-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(290px,.7fr);gap:13px;align-items:start}.pv3-card,.pv3-side{border:1px solid var(--border);border-radius:19px;background:var(--card);overflow:hidden}.pv3-card-head{padding:13px 15px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px}.pv3-meta{display:flex;gap:6px;flex-wrap:wrap}.pv3-chip{font-size:10px;border:1px solid var(--border);border-radius:999px;padding:5px 8px;color:var(--muted)}.pv3-chip.primary{color:var(--primary);border-color:color-mix(in srgb,var(--primary) 35%,var(--border))}.pv3-visual{min-height:390px;padding:12px;background:var(--surface-2,rgba(127,127,127,.04));display:grid;gap:8px;place-items:center;overflow:auto}.pv3-visual canvas{display:block;max-width:100%;height:auto;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08)}.pv3-loading{padding:46px 20px;text-align:center;color:var(--muted);line-height:1.5}.pv3-sourcebar{padding:10px 14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:10px;color:var(--muted)}.pv3-sourcebar a{font-weight:750;color:var(--primary)}.pv3-answer{padding:16px}.pv3-qnum{font-size:25px;font-weight:850;margin:1px 0 4px}.pv3-hint{font-size:12px;line-height:1.5;color:var(--muted);margin-bottom:12px}.pv3-options{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.pv3-option{min-height:48px;border:1px solid var(--border);border-radius:12px;background:var(--card);color:var(--text);font-weight:850;font-size:16px;cursor:pointer}.pv3-option:hover{border-color:var(--primary)}.pv3-option.selected{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary) inset}.pv3-option.good{border-color:#24905a;background:color-mix(in srgb,#24905a 8%,var(--card))}.pv3-option.bad{border-color:#c84d4d;background:color-mix(in srgb,#c84d4d 7%,var(--card))}.pv3-feedback{margin-top:11px;padding:12px;border-radius:12px;background:var(--surface-2,rgba(127,127,127,.06));font-size:12px;line-height:1.5}.pv3-feedback.good strong{color:#218052}.pv3-feedback.bad strong{color:#b94141}.pv3-actions{display:flex;gap:7px;margin-top:11px}.pv3-actions .btn{flex:1}.pv3-side{padding:15px}.pv3-side h3{margin:0 0 5px;font-size:15px}.pv3-side p{font-size:11px;color:var(--muted);line-height:1.5;margin:0}.pv3-bars{display:grid;gap:9px;margin-top:13px}.pv3-bar-row{display:grid;grid-template-columns:minmax(80px,1fr) 1.4fr auto;gap:8px;align-items:center;font-size:10px}.pv3-bar{height:7px;border-radius:99px;background:var(--surface-2,rgba(127,127,127,.1));overflow:hidden}.pv3-bar i{display:block;height:100%;border-radius:inherit;background:var(--primary)}.pv3-empty{padding:38px 20px;text-align:center;color:var(--muted);line-height:1.6}.pv3-empty strong{display:block;color:var(--text);font-size:16px;margin-bottom:5px}.pv3-trust{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:10px;color:var(--muted);line-height:1.55}.pv3-bookmarked{color:var(--primary)!important;border-color:var(--primary)!important}
  @media(max-width:1000px){.pv3-filter{grid-template-columns:repeat(3,minmax(0,1fr))}.pv3-layout{grid-template-columns:1fr}.pv3-visual{min-height:330px}}@media(max-width:680px){.pv3-hero{flex-direction:column;padding:16px}.pv3-metrics{grid-template-columns:repeat(2,1fr)}.pv3-filter{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px}.pv3-options{grid-template-columns:repeat(5,1fr)}.pv3-visual{padding:5px;min-height:270px}.pv3-sourcebar{align-items:flex-start;flex-direction:column}}
  `;document.head.appendChild(s);
}

function ensureShell(){
  const page=$('#page-questions');if(!page)return null;
  installStyles();
  if(!$('#practiceV3',page))page.innerHTML=`<div id="practiceV3">
    <section class="pv3-hero"><div><span class="pv3-kicker">BANCO DE TREINO VALIDADO</span><h1>Resolver questões</h1><p>Treino por área, disciplina e assunto com questões que realmente foram aplicadas. Sem cronômetro de prova e sem formato de simulado.</p></div><div class="pv3-exams"><button class="btn btn-secondary active" type="button" data-pv3-exam="ENEM">ENEM</button><button class="btn btn-secondary" type="button" data-pv3-exam="PISM">PISM</button></div></section>
    <section class="pv3-metrics"><div class="pv3-metric"><span>Respondidas</span><strong id="pv3Answered">0</strong></div><div class="pv3-metric"><span>Acertos</span><strong id="pv3Correct">0</strong></div><div class="pv3-metric"><span>Erros</span><strong id="pv3Wrong">0</strong></div><div class="pv3-metric"><span>Aproveitamento</span><strong id="pv3Rate">0%</strong></div></section>
    <section class="pv3-filter"><div class="pv3-field"><label>Área</label><select id="pv3Area"></select></div><div class="pv3-field"><label>Disciplina</label><select id="pv3Subject"></select></div><div class="pv3-field"><label>Assunto</label><select id="pv3Topic"></select></div><div class="pv3-field"><label>Status</label><select id="pv3Status"><option value="ALL">Todas</option><option value="UNSEEN">Não respondidas</option><option value="WRONG">Meus erros</option><option value="BOOKMARKED">Salvas</option></select></div><button class="btn btn-primary" id="pv3New" type="button">Nova questão</button></section>
    <section class="pv3-layout"><div class="pv3-card"><div class="pv3-card-head"><div class="pv3-meta" id="pv3Meta"></div><button class="btn btn-ghost btn-sm" id="pv3Bookmark" type="button">Salvar</button></div><div class="pv3-visual" id="pv3Visual"><div class="pv3-loading">Carregando banco validado…</div></div><div class="pv3-sourcebar" id="pv3Sourcebar"></div><div class="pv3-answer" id="pv3Answer"></div></div><aside class="pv3-side"><h3>Diagnóstico do treino</h3><p id="pv3DiagnosisText">Responda algumas questões para o diagnóstico começar a orientar sua revisão.</p><div class="pv3-bars" id="pv3Bars"></div><div class="pv3-trust" id="pv3Trust">Somente itens publicados após validação de fonte e gabarito.</div></aside></section>
  </div>`;
  bindShell();return page;
}

function bindShell(){
  $$('[data-pv3-exam]').forEach(b=>b.addEventListener('click',()=>{state.exam=b.dataset.pv3Exam;state.area=state.subject=state.topic='ALL';state.status='ALL';$('#pv3Status').value='ALL';refreshControls();pickQuestion(true)}));
  $('#pv3Area')?.addEventListener('change',e=>{state.area=e.target.value;state.subject=state.topic='ALL';refreshControls();pickQuestion(true)});
  $('#pv3Subject')?.addEventListener('change',e=>{state.subject=e.target.value;state.topic='ALL';refreshControls();pickQuestion(true)});
  $('#pv3Topic')?.addEventListener('change',e=>{state.topic=e.target.value;pickQuestion(true)});
  $('#pv3Status')?.addEventListener('change',e=>{state.status=e.target.value;pickQuestion(true)});
  $('#pv3New')?.addEventListener('click',()=>pickQuestion(true));
  $('#pv3Bookmark')?.addEventListener('click',toggleBookmark);
}

function optionHtml(value,label,selected){return `<option value="${esc(value)}" ${selected===value?'selected':''}>${esc(label)}</option>`}
function refreshControls(){
  $$('[data-pv3-exam]').forEach(b=>b.classList.toggle('active',b.dataset.pv3Exam===state.exam));
  const examRows=state.catalog.filter(q=>q.exam===state.exam);
  const areas=unique(examRows.map(q=>q.area));if(state.area!=='ALL'&&!areas.includes(state.area))state.area='ALL';
  const areaRows=examRows.filter(q=>state.area==='ALL'||q.area===state.area);
  const subjects=unique(areaRows.map(q=>q.subject));if(state.subject!=='ALL'&&!subjects.includes(state.subject))state.subject='ALL';
  const subjectRows=areaRows.filter(q=>state.subject==='ALL'||q.subject===state.subject);
  const topics=unique(subjectRows.map(q=>q.topic));if(state.topic!=='ALL'&&!topics.includes(state.topic))state.topic='ALL';
  const a=$('#pv3Area'),s=$('#pv3Subject'),t=$('#pv3Topic');
  if(a)a.innerHTML=optionHtml('ALL','Todas as áreas',state.area)+areas.map(x=>optionHtml(x,x,state.area)).join('');
  if(s)s.innerHTML=optionHtml('ALL','Todas as disciplinas',state.subject)+subjects.map(x=>optionHtml(x,x,state.subject)).join('');
  if(t){t.innerHTML=optionHtml('ALL',topics.length?'Todos os assuntos':'Assunto ainda não classificado',state.topic)+topics.map(x=>optionHtml(x,x,state.topic)).join('');t.disabled=!topics.length}
  renderMetrics();
}

function latestAttempts(){const map=new Map();for(const a of state.attempts)if(!map.has(a.question_id))map.set(a.question_id,a);return map}
function filtered(){
  const latest=latestAttempts();
  return state.catalog.filter(q=>{
    if(q.exam!==state.exam)return false;if(state.area!=='ALL'&&q.area!==state.area)return false;if(state.subject!=='ALL'&&q.subject!==state.subject)return false;if(state.topic!=='ALL'&&q.topic!==state.topic)return false;
    const a=latest.get(q.id);if(state.status==='UNSEEN'&&a)return false;if(state.status==='WRONG'&&(!a||a.is_correct!==false))return false;if(state.status==='BOOKMARKED'&&!state.bookmarks.has(q.id))return false;return true;
  });
}

function pickQuestion(preferUnseen=false){
  state.selected=null;const rows=filtered(),visual=$('#pv3Visual'),answer=$('#pv3Answer');
  if(!rows.length){state.current=null;renderEmpty();return}
  let pool=rows;if(preferUnseen){const latest=latestAttempts(),unseen=rows.filter(q=>!latest.has(q.id));if(unseen.length)pool=unseen}
  if(pool.length>1&&state.current)pool=pool.filter(q=>q.id!==state.current.id)||pool;
  state.current=pool[Math.floor(Math.random()*pool.length)]||rows[0];
  if(visual)visual.innerHTML='<div class="pv3-loading"><b>Abrindo questão oficial…</b><br><small>Localizando somente esta questão na fonte validada.</small></div>';
  if(answer)answer.innerHTML='';
  renderCurrent();
}

function renderEmpty(){
  const visual=$('#pv3Visual'),answer=$('#pv3Answer'),meta=$('#pv3Meta'),source=$('#pv3Sourcebar');
  if(meta)meta.innerHTML='';if(source)source.innerHTML='';if(answer)answer.innerHTML='';
  if(visual)visual.innerHTML=state.exam==='PISM'?'<div class="pv3-empty"><strong>PISM em validação editorial</strong>As questões do PISM só serão liberadas aqui quando cada item tiver gabarito e classificação individual conferidos. Não vamos preencher o banco com conteúdo genérico.</div>':'<div class="pv3-empty"><strong>Nenhuma questão neste filtro</strong>Ajuste área, disciplina, assunto ou status para continuar o treino.</div>';
  renderMetrics();updateBookmarkButton();
}

async function renderCurrent(){
  const q=state.current;if(!q)return;const token=++state.paintToken,src=state.sources.get(q.source_id);
  $('#pv3Meta').innerHTML=`<span class="pv3-chip primary">${esc(q.exam)} ${q.year}</span><span class="pv3-chip">${esc(q.area)}</span><span class="pv3-chip">${esc(q.subject)}</span>${q.topic?`<span class="pv3-chip">${esc(q.topic)}</span>`:''}`;
  $('#pv3Answer').innerHTML=`<div class="pv3-qnum">Questão ${q.original_number}</div><div class="pv3-hint">Leia a questão oficial acima e marque a alternativa. O resultado aparece imediatamente após sua resposta.</div><div class="pv3-options">${['A','B','C','D','E'].map(x=>`<button class="pv3-option" type="button" data-pv3-answer="${x}">${x}</button>`).join('')}</div><div id="pv3Feedback"></div><div class="pv3-actions"><button class="btn btn-primary" type="button" id="pv3Next">Próxima questão</button></div>`;
  $$('[data-pv3-answer]').forEach(b=>b.addEventListener('click',()=>answer(b.dataset.pv3Answer)));
  $('#pv3Next')?.addEventListener('click',()=>pickQuestion(true));
  if(src){$('#pv3Sourcebar').innerHTML=`<span>Questão oficial · ${esc(src.institution)} · ${q.year}${src.booklet?` · ${esc(src.booklet)}`:''}</span><a href="${esc(src.source_page_url)}" target="_blank" rel="noopener">Ver fonte oficial</a>`}
  updateBookmarkButton();renderMetrics();
  try{await renderOfficialCrop(q,src,token)}catch(e){if(token===state.paintToken)renderCropFallback(src,e)}
}

function updateBookmarkButton(){const b=$('#pv3Bookmark'),q=state.current;if(!b)return;const on=Boolean(q&&state.bookmarks.has(q.id));b.textContent=on?'Salva':'Salvar';b.classList.toggle('pv3-bookmarked',on);b.disabled=!q}
async function toggleBookmark(){const q=state.current;if(!q)return;if(state.bookmarks.has(q.id))state.bookmarks.delete(q.id);else state.bookmarks.add(q.id);saveBookmarks();updateBookmarkButton();refreshControls()}

async function answer(letter){
  const q=state.current;if(!q||state.selected)return;state.selected=letter;const correct=String(q.correct_answer||'').toUpperCase();if(!/^[A-E]$/.test(correct))return;
  const ok=letter===correct;$$('[data-pv3-answer]').forEach(b=>{b.disabled=true;b.classList.toggle('selected',b.dataset.pv3Answer===letter);if(b.dataset.pv3Answer===correct)b.classList.add('good');else if(b.dataset.pv3Answer===letter&&!ok)b.classList.add('bad')});
  const f=$('#pv3Feedback');if(f)f.innerHTML=`<div class="pv3-feedback ${ok?'good':'bad'}"><strong>${ok?'Acertou.':'Errou.'}</strong> Gabarito oficial: <b>${correct}</b>.${q.topic?`<br>Assunto: <b>${esc(q.topic)}</b>.`:''}</div>`;
  const row={question_id:q.id,selected_answer:letter,correct_answer:correct,is_correct:ok,response_ms:null,created_at:new Date().toISOString()};state.attempts.unshift(row);saveAttempts(state.attempts);renderMetrics();void saveCloudAttempt(row);
}

async function saveCloudAttempt(row){
  const client=appClient();if(!client)return;try{const {data:{user}}=await client.auth.getUser();if(!user)return;await client.from('practice_attempts').insert({...row,user_id:user.id})}catch{}
}

function renderMetrics(){
  const rows=state.attempts.filter(a=>state.catalog.some(q=>q.id===a.question_id&&q.exam===state.exam));const answered=rows.length,correct=rows.filter(x=>x.is_correct===true).length,wrong=rows.filter(x=>x.is_correct===false).length;
  if($('#pv3Answered'))$('#pv3Answered').textContent=fmt(answered);if($('#pv3Correct'))$('#pv3Correct').textContent=fmt(correct);if($('#pv3Wrong'))$('#pv3Wrong').textContent=fmt(wrong);if($('#pv3Rate'))$('#pv3Rate').textContent=`${pct(correct,answered)}%`;
  renderDiagnosis(rows);
}

function renderDiagnosis(attempts){
  const byId=new Map(state.catalog.map(q=>[q.id,q])),groups=new Map();for(const a of attempts){const q=byId.get(a.question_id);if(!q)continue;const key=q.subject||q.area||'Geral',g=groups.get(key)||{a:0,c:0};g.a++;if(a.is_correct)g.c++;groups.set(key,g)}
  const rows=[...groups].map(([name,g])=>({name,...g,rate:pct(g.c,g.a)})).sort((a,b)=>a.rate-b.rate||b.a-a.a);const text=$('#pv3DiagnosisText'),bars=$('#pv3Bars');
  if(!rows.length){if(text)text.textContent='Responda algumas questões para o diagnóstico começar a orientar sua revisão.';if(bars)bars.innerHTML='';return}
  const weak=rows[0];if(text)text.innerHTML=`Prioridade atual: <b>${esc(weak.name)}</b> · ${weak.rate}% de acerto em ${weak.a} tentativa(s). Use o filtro de disciplina para concentrar o próximo bloco.`;
  if(bars)bars.innerHTML=rows.slice(0,5).map(x=>`<div class="pv3-bar-row"><span>${esc(x.name)}</span><div class="pv3-bar"><i style="width:${x.rate}%"></i></div><b>${x.rate}%</b></div>`).join('');
}

async function loadPdfJs(){
  if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;return window.pdfjsLib}
  if(pdfLoader)return pdfLoader;pdfLoader=new Promise((resolve,reject)=>{const old=document.querySelector('script[data-pv3-pdfjs]');if(old){old.addEventListener('load',()=>resolve(window.pdfjsLib),{once:true});return}const s=document.createElement('script');s.src=PDFJS;s.async=true;s.dataset.pv3Pdfjs='1';s.onload=()=>{if(!window.pdfjsLib)return reject(new Error('Leitor oficial indisponível'));window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;resolve(window.pdfjsLib)};s.onerror=()=>reject(new Error('Não foi possível carregar o leitor oficial'));document.head.appendChild(s)});return pdfLoader
}
function proxy(exam,url){return exam==='PISM'?`/api/pism-pdf?url=${encodeURIComponent(url)}`:`/api/enem-pdf?url=${encodeURIComponent(url)}`}
async function pdfEntry(q,src){
  if(!src?.source_pdf_url)throw new Error('Fonte PDF não disponível.');const key=src.id;if(pdfCache.has(key))return pdfCache.get(key);const lib=await loadPdfJs();const task=lib.getDocument({url:proxy(q.exam,src.source_pdf_url),withCredentials:false,disableRange:true,disableStream:true,disableAutoFetch:true});const doc=await task.promise;const entry={doc,heads:null,scan:null};pdfCache.set(key,entry);return entry
}
function lineGroups(items){
  const lines=[];for(const item of items){const text=String(item.str||'').trim();if(!text)continue;const x=Number(item.transform?.[4]||0),y=Number(item.transform?.[5]||0);let line=lines.find(l=>Math.abs(l.y-y)<2.2);if(!line){line={y,items:[]};lines.push(line)}line.items.push({x,text})}
  return lines.map(l=>({y:l.y,text:l.items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(' ').replace(/\s+/g,' ').trim()})).sort((a,b)=>b.y-a.y)
}
async function scanHeads(entry){
  if(entry.heads)return entry.heads;if(entry.scan)return entry.scan;entry.scan=(async()=>{const heads=[];for(let p=1;p<=entry.doc.numPages;p++){const page=await entry.doc.getPage(p),content=await page.getTextContent(),lines=lineGroups(content.items);for(const line of lines){const m=line.text.match(/^QUEST(?:ÃO|AO|ÃO)\s*0*(\d{1,3})(?:\s|$)/i);if(m){const q=Number(m[1]);if(q>=1&&q<=200&&!heads.some(h=>h.q===q))heads.push({q,page:p,y:line.y})}}if(p%2===0)await wait(0)}heads.sort((a,b)=>a.page-b.page||(b.y-a.y));entry.heads=heads;return heads})();return entry.scan
}
async function renderSegment(entry,pageNo,startY,nextY,host){
  const page=await entry.doc.getPage(pageNo),base=page.getViewport({scale:1}),available=Math.max(300,host.clientWidth||700),scale=Math.min(1.75,Math.max(1.05,available/base.width*1.12)),viewport=page.getViewport({scale}),ratio=Math.min(1.7,window.devicePixelRatio||1),topPoint=viewport.convertToViewportPoint(0,startY),nextPoint=nextY==null?null:viewport.convertToViewportPoint(0,nextY),top=Math.max(0,Math.floor(topPoint[1]-22)),bottom=nextPoint?Math.min(viewport.height,Math.ceil(nextPoint[1]-14)):viewport.height,cropH=Math.max(80,bottom-top),full=document.createElement('canvas');full.width=Math.ceil(viewport.width*ratio);full.height=Math.ceil(viewport.height*ratio);const ctx=full.getContext('2d',{alpha:false});await page.render({canvasContext:ctx,viewport,transform:[ratio,0,0,ratio,0,0]}).promise;const out=document.createElement('canvas');out.width=Math.ceil(viewport.width*ratio);out.height=Math.ceil(cropH*ratio);out.style.width=`${viewport.width}px`;out.style.height=`${cropH}px`;out.setAttribute('role','img');out.setAttribute('aria-label',`Trecho da questão oficial na página ${pageNo}`);const octx=out.getContext('2d',{alpha:false});octx.drawImage(full,0,Math.floor(top*ratio),full.width,Math.floor(cropH*ratio),0,0,out.width,out.height);host.appendChild(out)
}
async function renderOfficialCrop(q,src,token){
  const host=$('#pv3Visual');if(!host||!src)return;const entry=await pdfEntry(q,src),heads=await scanHeads(entry);if(token!==state.paintToken)return;const idx=heads.findIndex(h=>h.q===Number(q.original_number));if(idx<0)throw new Error('Questão não localizada automaticamente.');const cur=heads[idx],next=heads.slice(idx+1).find(h=>h.q!==cur.q)||null;host.innerHTML='';await renderSegment(entry,cur.page,cur.y,next?.page===cur.page?next.y:null,host);if(token!==state.paintToken)return;if(next&&next.page===cur.page+1){const nextPage=await entry.doc.getPage(next.page),vp=nextPage.getViewport({scale:1}),topY=vp.height;await renderSegment(entry,next.page,topY,next.y,host)}
}
function renderCropFallback(src,error){const host=$('#pv3Visual');if(!host)return;host.innerHTML=`<div class="pv3-empty"><strong>Não consegui recortar esta questão automaticamente.</strong>O treino continua disponível pela fonte oficial.${src?.source_page_url?`<br><br><a class="btn btn-secondary" href="${esc(src.source_page_url)}" target="_blank" rel="noopener">Abrir fonte oficial</a>`:''}</div>`;console.warn('[Gabarito+] Banco V3:',error?.message||error)}

async function open(){
  state.active=true;ensureShell();const visual=$('#pv3Visual');if(visual)visual.innerHTML='<div class="pv3-loading"><b>Preparando banco de treino…</b><br><small>Carregando somente questões validadas.</small></div>';
  try{await loadCatalog();refreshControls();if(!state.current||!state.catalog.some(q=>q.id===state.current.id))pickQuestion(true);else renderCurrent()}catch(e){if(visual)visual.innerHTML=`<div class="pv3-empty"><strong>Banco de treino indisponível agora.</strong>${esc(e?.message||'Tente novamente em alguns instantes.')}</div>`;console.error('[Gabarito+] Practice V3:',e)}
}

function install(){
  installStyles();
  window.renderQuestionPage=open;
  window.v42OpenQuestions=()=>window.go?.('questions');
  window.v40OpenFocusedQuestions=()=>window.go?.('questions');
  window.GABARITO_PRACTICE_V3={version:VERSION,open,next:()=>pickQuestion(true),reload:()=>loadCatalog(true),get state(){return{...state,catalog:[...state.catalog],sources:new Map(state.sources),bookmarks:new Set(state.bookmarks)}}};
  window.GABARITO_OFFICIAL_QUESTION_BANK=window.GABARITO_PRACTICE_V3;
  window.GABARITO_APP=window.GABARITO_APP||{};
  window.GABARITO_APP.questionBankMode='validated_practice_v3';
  window.GABARITO_APP.questionRouteOwner='app-go-direct';
  window.GABARITO_APP.questionPracticeSeparatedFromMocks=true;
  window.GABARITO_APP.authorialQuestionPractice=false;
  if(window.app?.page==='questions'||$('#page-questions')?.classList.contains('active'))open();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
