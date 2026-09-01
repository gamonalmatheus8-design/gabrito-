(function(){
'use strict';
const VERSION='3.0.1';
const SESSION_KEY='gplus_enem_history_exam_v28';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
const mobile=()=>window.matchMedia('(max-width: 900px)').matches;
let open=false,rangeIndex=0,timer=null,lastFocus=null;
function state(){return parse(localStorage.getItem(SESSION_KEY),null)}
function visible(el){return Boolean(el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none')}
function active(){const s=state(),runner=$('#v28Runner');return Boolean(mobile()&&s?.status==='active'&&visible(runner))}
function minQ(s){return Number(s.day)===2?91:1}
function maxQ(s){return Number(s.day)===2?180:90}
function current(s){return Number(s.current||minQ(s))}
function selected(s,q=current(s)){return String(s.answers?.[String(q)]||'')}
function answered(s){return Object.keys(s.answers||{}).length}
function click(selector){const el=$(selector,$('#v28Runner')||document);if(!el)return false;el.click();return true}
function ensure(){
 let dock=$('#v301HistoryDock');
 if(!dock){dock=document.createElement('div');dock.id='v301HistoryDock';dock.className='v301-dock';document.body.appendChild(dock)}
 let backdrop=$('#v301HistoryBackdrop');
 if(!backdrop){backdrop=document.createElement('button');backdrop.type='button';backdrop.id='v301HistoryBackdrop';backdrop.className='v301-backdrop';backdrop.setAttribute('aria-label','Fechar cartão-resposta');backdrop.addEventListener('click',closePanel);document.body.appendChild(backdrop)}
 let panel=$('#v301HistoryPanel');
 if(!panel){panel=document.createElement('section');panel.id='v301HistoryPanel';panel.className='v301-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Cartão-resposta da prova oficial do ENEM');document.body.appendChild(panel)}
 return{dock,backdrop,panel};
}
function clear(){const {dock,backdrop,panel}=ensure();dock.classList.remove('show');dock.innerHTML='';backdrop.classList.remove('show');panel.classList.remove('show');panel.innerHTML='';document.body.classList.remove('v301-history-mobile','v301-sheet-open');open=false}
function choose(letter){const s=state();if(!s)return;const button=$(`#v28Sheet [data-v28-letter="${letter}"]`);button?.click();render();if(open)renderPanel()}
function go(q){const button=$(`#v28Sheet [data-v28-q="${q}"]`);button?.click();closePanel();setTimeout(()=>{render();$('.v28-paper')?.scrollIntoView({block:'start',behavior:'smooth'})},25)}
function previous(){const s=state();if(!s)return;go(Math.max(minQ(s),current(s)-1))}
function next(){const s=state();if(!s)return;go(Math.min(maxQ(s),current(s)+1))}
function letter(letterName,isSelected){return `<button type="button" class="v301-letter ${isSelected?'selected':''}" data-v301-letter="${letterName}" aria-label="Marcar alternativa ${letterName}" aria-pressed="${isSelected}">${letterName}</button>`}
function renderDock(){const s=state();if(!s)return;const {dock}=ensure(),q=current(s),pick=selected(s),count=answered(s);dock.classList.add('show');dock.innerHTML=`<div class="v301-quick"><div class="v301-q-now"><span>Questão ${q}</span><b>${pick||'—'}</b></div><div class="v301-letters">${['A','B','C','D','E'].map(l=>letter(l,pick===l)).join('')}</div></div><div class="v301-nav"><button type="button" class="v301-nav-btn" data-v301-prev aria-label="Questão anterior" ${q<=minQ(s)?'disabled':''}>‹</button><button type="button" class="v301-card" data-v301-open><span>Cartão-resposta</span><b>${count}/90 respondidas</b></button><button type="button" class="v301-nav-btn" data-v301-next aria-label="Próxima questão" ${q>=maxQ(s)?'disabled':''}>›</button></div>`;$$('[data-v301-letter]',dock).forEach(b=>b.addEventListener('click',()=>choose(b.dataset.v301Letter)));$('[data-v301-prev]',dock)?.addEventListener('click',previous);$('[data-v301-next]',dock)?.addEventListener('click',next);$('[data-v301-open]',dock)?.addEventListener('click',openPanel)}
function questions(s){const base=minQ(s),start=base+rangeIndex*45,end=start+44,q=current(s);return Array.from({length:45},(_,i)=>start+i).map(n=>{const pick=selected(s,n);return `<button type="button" class="v301-number ${pick?'answered ':''}${n===q?'current':''}" data-v301-q="${n}" aria-label="Questão ${n}${pick?`, alternativa ${pick}`:''}"><span>${n}</span>${pick?`<b>${pick}</b>`:''}</button>`}).join('')}
function renderPanel(){const s=state();if(!s)return;const {panel}=ensure(),q=current(s),pick=selected(s),count=answered(s),base=minQ(s);const labels=Number(s.day)===1?(s.areas||['Área 1','Área 2']):(s.areas||['Área 1','Área 2']);panel.innerHTML=`<div class="v301-grip" aria-hidden="true"></div><div class="v301-head"><div><span>Cartão-resposta</span><h3>ENEM ${s.year} · Dia ${s.day}</h3></div><button type="button" class="v301-close" data-v301-close aria-label="Fechar cartão-resposta">×</button></div><div class="v301-summary"><div><b>${count}/90</b><span>respondidas</span></div><div><b>${90-count}</b><span>em branco</span></div><div><b>Q${q}</b><span>${pick?`marcada ${pick}`:'sem resposta'}</span></div></div><div class="v301-panel-picker"><span>Questão ${q}</span><div>${['A','B','C','D','E'].map(l=>letter(l,pick===l)).join('')}</div></div><div class="v301-ranges"><button type="button" class="${rangeIndex===0?'active':''}" data-v301-range="0"><b>${labels[0]||'Questões'}</b><span>${base}–${base+44}</span></button><button type="button" class="${rangeIndex===1?'active':''}" data-v301-range="1"><b>${labels[1]||'Questões'}</b><span>${base+45}–${base+89}</span></button></div><div class="v301-grid">${questions(s)}</div><div class="v301-legend"><span><i></i>em branco</span><span><i class="answered"></i>respondida</span><span><i class="current"></i>atual</span></div><div class="v301-actions"><button type="button" class="btn btn-secondary" data-v301-exit>Salvar e sair</button><button type="button" class="btn btn-primary" data-v301-finish>Entregar prova</button></div>`;$('[data-v301-close]',panel)?.addEventListener('click',closePanel);$$('[data-v301-letter]',panel).forEach(b=>b.addEventListener('click',()=>choose(b.dataset.v301Letter)));$$('[data-v301-range]',panel).forEach(b=>b.addEventListener('click',()=>{rangeIndex=Number(b.dataset.v301Range);renderPanel()}));$$('[data-v301-q]',panel).forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.v301Q))));$('[data-v301-exit]',panel)?.addEventListener('click',()=>{closePanel();click('[data-v28-exit]')});$('[data-v301-finish]',panel)?.addEventListener('click',()=>{closePanel();click('[data-v28-finish]')})}
function openPanel(){const s=state();if(!s)return;const relative=current(s)-minQ(s)+1;rangeIndex=relative>45?1:0;lastFocus=document.activeElement;open=true;renderPanel();const {backdrop,panel}=ensure();backdrop.classList.add('show');panel.classList.add('show');document.body.classList.add('v301-sheet-open');setTimeout(()=>$('.v301-close',panel)?.focus(),10)}
function closePanel(){open=false;const {backdrop,panel}=ensure();backdrop.classList.remove('show');panel.classList.remove('show');document.body.classList.remove('v301-sheet-open');if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true})}
function render(){if(!active()){clear();return}document.body.classList.add('v301-history-mobile');renderDock();if(open)renderPanel();window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.enemHistoryMobile=VERSION}
function schedule(){clearTimeout(timer);timer=setTimeout(render,20)}
function boot(){ensure();const page=$('#page-mocks');if(page)new MutationObserver(schedule).observe(page,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)closePanel()});setTimeout(render,300);window.GABARITO_ENEM_HISTORY_MOBILE={version:VERSION,render,openPanel,closePanel}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
