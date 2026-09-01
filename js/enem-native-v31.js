(function(){
'use strict';
const VERSION='3.1.0';
const DATA_KEY='GABARITO_ENEM_OFFICIAL_NATIVE_QUESTIONS';
const LETTERS=['A','B','C','D','E'];
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const norm=s=>String(s??'').trim();
let activeMount=null;

function rangeForDay(day){return Number(day)===1?[1,90]:[91,180]}
function normalizeLanguage(value){
 const v=norm(value).toLowerCase();
 if(!v)return'';
 if(v.startsWith('esp'))return'espanhol';
 if(v.startsWith('ing'))return'inglês';
 return v;
}
function safeUrl(value){
 const raw=norm(value);if(!raw)return'';
 if(raw.startsWith('/')||raw.startsWith('./')||raw.startsWith('../'))return raw;
 try{const u=new URL(raw,location.href);return['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}
}
function normalizeQuestion(row){
 if(!row||typeof row!=='object')return null;
 const year=Number(row.year),day=Number(row.day),number=Number(row.number);
 const options=Array.isArray(row.options)?row.options.map(x=>norm(x)):[];
 return{
  year,day,number,
  language:normalizeLanguage(row.language),
  area:norm(row.area),subject:norm(row.subject),
  text:norm(row.text),supportText:norm(row.supportText||row.support_text),
  imageUrl:safeUrl(row.imageUrl||row.image_url),imageAlt:norm(row.imageAlt||row.image_alt),
  options,
  sourceLabel:norm(row.sourceLabel||row.source_label||'INEP'),
  sourceUrl:safeUrl(row.sourceUrl||row.source_url)
 };
}
function validQuestion(q){
 if(!q||!Number.isInteger(q.year)||q.year<1998)return false;
 if(![1,2].includes(q.day)||!Number.isInteger(q.number))return false;
 const [start,end]=rangeForDay(q.day);if(q.number<start||q.number>end)return false;
 if(!q.text||q.options.length!==5||q.options.some(x=>!x))return false;
 if(q.day===1&&q.number<=5&&!['inglês','espanhol'].includes(q.language))return false;
 return true;
}
function rowKey(q){return[q.year,q.day,q.number,q.language||'-'].join('|')}
function rawRows(){return Array.isArray(window[DATA_KEY])?window[DATA_KEY]:[]}
function register(rows){
 const current=rawRows().map(normalizeQuestion).filter(validQuestion);
 const map=new Map(current.map(q=>[rowKey(q),q]));
 for(const row of Array.isArray(rows)?rows:[]){const q=normalizeQuestion(row);if(validQuestion(q))map.set(rowKey(q),q)}
 window[DATA_KEY]=Array.from(map.values());
 return window[DATA_KEY].length;
}
function languageMatches(q,language){
 if(q.day!==1||q.number>5)return true;
 return q.language===normalizeLanguage(language||'Inglês');
}
function getAttemptQuestions(meta={}){
 const year=Number(meta.year),day=Number(meta.day),language=meta.language||'Inglês';
 const rows=rawRows().map(normalizeQuestion).filter(validQuestion).filter(q=>q.year===year&&q.day===day&&languageMatches(q,language));
 const byNumber=new Map();for(const q of rows)if(!byNumber.has(q.number))byNumber.set(q.number,q);
 return Array.from(byNumber.values()).sort((a,b)=>a.number-b.number);
}
function validateAttempt(meta={}){
 const rows=getAttemptQuestions(meta),[start,end]=rangeForDay(meta.day),numbers=new Set(rows.map(q=>q.number)),missing=[];
 for(let q=start;q<=end;q++)if(!numbers.has(q))missing.push(q);
 return{complete:rows.length===90&&missing.length===0,count:rows.length,missing,questions:rows};
}
function hasCompleteAttempt(meta={}){return validateAttempt(meta).complete}
function marked(session,q){return new Set((session?.marked||[]).map(Number)).has(Number(q))}
function selected(session,q){return String(session?.answers?.[String(q)]||'')}
function questionIndex(rows,q){const i=rows.findIndex(x=>x.number===Number(q));return i<0?0:i}
function sourceMarkup(q){
 if(!q.sourceLabel&&!q.sourceUrl)return'';
 const label=esc(q.sourceLabel||'Fonte oficial');
 return q.sourceUrl?`<a class="v31-source" href="${esc(q.sourceUrl)}" target="_blank" rel="noopener">${label}</a>`:`<span class="v31-source">${label}</span>`;
}
function imageMarkup(q){return q.imageUrl?`<figure class="v31-media"><img src="${esc(q.imageUrl)}" alt="${esc(q.imageAlt||'Imagem de apoio da questão')}" loading="lazy"></figure>`:''}
function unavailableMarkup(meta,status,pdfUrl){
 const missing=status.missing.length?`${status.missing.slice(0,8).join(', ')}${status.missing.length>8?'…':''}`:'—';
 return`<section class="v31-unavailable" aria-live="polite"><span class="v31-kicker">MODO NATIVO</span><h3>Conteúdo oficial estruturado ainda não está completo.</h3><p>O runner encontrou <strong>${status.count}/90</strong> questões válidas para ENEM ${esc(meta.year)} · Dia ${esc(meta.day)}. Ele não substitui itens ausentes por questões autorais.</p><small>Primeiros itens pendentes: ${esc(missing)}</small>${pdfUrl?`<a class="btn btn-secondary" href="${esc(pdfUrl)}" target="_blank" rel="noopener">Abrir caderno oficial do INEP</a>`:''}</section>`;
}
function render(){
 if(!activeMount?.host?.isConnected)return;
 const cfg=activeMount,s=typeof cfg.getSession==='function'?cfg.getSession():cfg.session;
 if(!s){cfg.host.innerHTML='';return}
 const meta={year:s.year,day:s.day,language:s.language},status=validateAttempt(meta);
 if(!status.complete){cfg.host.dataset.nativeReady='false';cfg.host.innerHTML=unavailableMarkup(meta,status,cfg.pdfUrl);return}
 const rows=status.questions,index=questionIndex(rows,s.current),q=rows[index],letter=selected(s,q.number),review=marked(s,q.number),first=index===0,last=index===rows.length-1;
 cfg.host.dataset.nativeReady='true';
 cfg.host.innerHTML=`<article class="v31-question" data-v31-question="${q.number}"><header class="v31-question-head"><div><span class="v31-kicker">${esc(q.area||`ENEM ${s.year}`)}</span><h3>Questão ${q.number}</h3><p>${esc(q.subject||`Dia ${s.day}`)} · ${index+1} de 90</p></div><button type="button" class="v31-review ${review?'active':''}" data-v31-review aria-pressed="${review}">${review?'★ Revisar':'☆ Marcar para revisão'}</button></header><div class="v31-progress" aria-hidden="true"><i style="width:${Math.round((index+1)/90*100)}%"></i></div><div class="v31-content">${q.supportText?`<div class="v31-support">${esc(q.supportText)}</div>`:''}${imageMarkup(q)}<div class="v31-statement">${esc(q.text)}</div><div class="v31-options" role="radiogroup" aria-label="Alternativas da questão ${q.number}">${q.options.map((text,i)=>{const l=LETTERS[i],on=letter===l;return`<button type="button" class="v31-option ${on?'selected':''}" data-v31-letter="${l}" role="radio" aria-checked="${on}"><b>${l}</b><span>${esc(text)}</span></button>`}).join('')}</div></div><footer class="v31-question-foot"><div>${sourceMarkup(q)}</div><nav aria-label="Navegação da prova"><button type="button" class="btn btn-secondary" data-v31-prev ${first?'disabled':''}>Anterior</button><button type="button" class="btn btn-primary" data-v31-next ${last?'disabled':''}>Próxima</button></nav></footer></article>`;
 $$('[data-v31-letter]',cfg.host).forEach(b=>b.addEventListener('click',()=>{cfg.onAnswer?.(q.number,b.dataset.v31Letter);sync()}));
 $('[data-v31-review]',cfg.host)?.addEventListener('click',()=>{cfg.onToggleReview?.(q.number);sync()});
 $('[data-v31-prev]',cfg.host)?.addEventListener('click',()=>{if(!first){cfg.onNavigate?.(rows[index-1].number);sync();cfg.host.scrollIntoView({behavior:'smooth',block:'start'})}});
 $('[data-v31-next]',cfg.host)?.addEventListener('click',()=>{if(!last){cfg.onNavigate?.(rows[index+1].number);sync();cfg.host.scrollIntoView({behavior:'smooth',block:'start'})}});
}
function mount(config={}){
 if(!config.host)throw new Error('Host do ENEM nativo não informado.');
 activeMount={...config};render();return activeMount.host.dataset.nativeReady==='true';
}
function sync(session){if(activeMount&&session)activeMount.session=session;render()}
function unmount(){if(activeMount?.host)activeMount.host.innerHTML='';activeMount=null}

register(rawRows());
window.GABARITO_APP=window.GABARITO_APP||{};
window.GABARITO_APP.enemNative=VERSION;
window.GABARITO_ENEM_NATIVE={version:VERSION,register,getAttemptQuestions,validateAttempt,hasCompleteAttempt,mount,sync,unmount,rangeForDay};
})();
