(()=>{
'use strict';
const root=document;
const cfg=window.ESTUDOS_SUPABASE_CONFIG||{};
const VERSION='9.0.0';
const ANON_KEY='gplus_v2_anon_id';

function anonId(){
  try{
    let id=localStorage.getItem(ANON_KEY);
    if(id)return id;
    id='anon_'+(window.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
    localStorage.setItem(ANON_KEY,id);
    return id;
  }catch(_){return 'anon_landing'}
}

function track(eventName,metadata={}){
  if(!cfg.url||!cfg.publishableKey)return;
  fetch(`${String(cfg.url).replace(/\/$/,'')}/rest/v1/product_events`,{
    method:'POST',
    headers:{apikey:cfg.publishableKey,authorization:`Bearer ${cfg.publishableKey}`,'content-type':'application/json',prefer:'return=minimal'},
    body:JSON.stringify({anonymous_id:anonId(),event_name:eventName,page:'landing-v9',metadata:{version:VERSION,...metadata}}),
    keepalive:true
  }).catch(()=>{});
}

const menu=root.getElementById('menuBtn');
const links=root.getElementById('navLinks');
if(menu&&links){
  menu.addEventListener('click',()=>{
    const open=links.classList.toggle('open');
    menu.setAttribute('aria-expanded',String(open));
  });
  links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    links.classList.remove('open');
    menu.setAttribute('aria-expanded','false');
  }));
}

root.querySelectorAll('a[href="/app"]').forEach(a=>a.addEventListener('click',()=>{
  const placement=a.closest('.hero')?'hero':a.closest('.topbar')?'header':a.closest('.final-card')?'final':a.closest('.route-card')?'route':'product';
  track('landing_start',{placement});
}));

const previewCopy={
  enem:{
    greeting:'Seu próximo passo, já decidido.',
    focusTitle:'Prioridade: Probabilidade',
    focusText:'Seu histórico recente mostra erros ainda sem recuperação confirmada. Um bloco dirigido agora é mais útil do que abrir um assunto novo.',
    time:'45 min',review:'4 revisões',route:'ENEM',routeText:'áreas e dias de prova',reason:'Erros ativos e domínio do assunto puxaram esta prioridade.'
  },
  pism:{
    greeting:'Seu módulo define a rota.',
    focusTitle:'Prioridade: Química · PISM II',
    focusText:'A leitura considera apenas o módulo selecionado e organiza revisão e treino dentro do conteúdo daquela etapa.',
    time:'40 min',review:'3 revisões',route:'PISM II',routeText:'conteúdo do módulo',reason:'Seu módulo, revisões e histórico definiram esta prioridade.'
  }
};

function setText(id,value){const el=root.getElementById(id);if(el)el.textContent=value}
function setPressed(buttons,active){buttons.forEach(btn=>{const on=btn===active;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on))})}

const previewButtons=[...root.querySelectorAll('[data-preview-exam]')];
function renderPreview(exam){
  const copy=previewCopy[exam]||previewCopy.enem;
  setText('demoGreeting',copy.greeting);
  setText('demoFocusTitle',copy.focusTitle);
  setText('demoFocusText',copy.focusText);
  setText('demoTime',copy.time);
  setText('demoReview',copy.review);
  setText('demoRoute',copy.route);
  setText('demoRouteText',copy.routeText);
  setText('demoReason',copy.reason);
}
previewButtons.forEach(btn=>btn.addEventListener('click',()=>{
  setPressed(previewButtons,btn);
  renderPreview(btn.dataset.previewExam);
  track('landing_demo_exam',{exam:btn.dataset.previewExam});
}));

const routes={
  enem:{
    label:'ROTA ENEM',title:'Amplitude sem perder direção.',
    description:'Matemática, Natureza, Humanas e Linguagens permanecem organizadas por áreas e dias de prova, enquanto a V9 prioriza o que o seu histórico pede agora.',
    items:['Áreas e 1º/2º dia organizados','Questões validadas no Banco de Treino','Revisão ligada aos erros','Redação e desempenho no mesmo fluxo']
  },
  pism:{
    label:'ROTA PISM',title:'Módulo certo. Conteúdo certo.',
    description:'PISM I, II e III continuam separados para que a priorização respeite a etapa da prova, o conteúdo do módulo e o formato das questões.',
    items:['PISM I, II e III separados','Objetivas e discursivas organizadas','Prioridade ajustada ao módulo','Histórico e revisões no mesmo lugar']
  }
};
const routeButtons=[...root.querySelectorAll('[data-route]')];
function renderRoute(route){
  const data=routes[route]||routes.enem;
  setText('routeLabel',data.label);
  setText('routeTitle',data.title);
  setText('routeDescription',data.description);
  const list=root.getElementById('routeList');
  if(list)list.innerHTML=data.items.map((item,i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><strong>${item}</strong></div>`).join('');
}
routeButtons.forEach(btn=>btn.addEventListener('click',()=>{
  setPressed(routeButtons,btn);
  renderRoute(btn.dataset.route);
  track('landing_route_view',{route:btn.dataset.route});
}));

const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}
  });
},{threshold:.12}):null;
root.querySelectorAll('.reveal').forEach(el=>observer?observer.observe(el):el.classList.add('visible'));

async function loadValidatedCount(){
  const target=root.getElementById('validatedCount');
  if(!target)return;
  if(!cfg.url||!cfg.publishableKey){target.textContent='351';return}
  try{
    const url=new URL(`${String(cfg.url).replace(/\/$/,'')}/rest/v1/practice_questions`);
    url.searchParams.set('select','id');
    url.searchParams.set('status','eq.published');
    url.searchParams.set('limit','1');
    const res=await fetch(url,{headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,Prefer:'count=exact'},cache:'no-store'});
    if(!res.ok)throw new Error('count');
    const range=res.headers.get('content-range')||'';
    const total=Number(range.split('/')[1]);
    target.textContent=Number.isFinite(total)&&total>0?total.toLocaleString('pt-BR'):'351';
  }catch(_){target.textContent='351'}
}

renderPreview('enem');
renderRoute('enem');
loadValidatedCount();
track('landing_open');
})();
