(function(){
'use strict';
const VERSION='1.2.1';
const cfg=window.ESTUDOS_SUPABASE_CONFIG||{};
const configured=Boolean(cfg.url&&cfg.publishableKey&&!/SEU-PROJETO|COLE_SUA/i.test(String(cfg.url)+String(cfg.publishableKey)));
window.GABARITO_APP={configured,bankSource:'starting',bankVersion:VERSION,cloudStatus:configured?'connecting':'not-configured'};
const asset=src=>/^https?:/i.test(src)?src:`${src}${src.includes('?')?'&':'?'}v=${encodeURIComponent(VERSION)}`;

function loadScript(src,timeoutMs=0){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    let done=false,timer=null;
    const finish=(err)=>{if(done)return;done=true;if(timer)clearTimeout(timer);err?reject(err):resolve()};
    s.src=asset(src);s.async=false;s.onload=()=>finish();s.onerror=()=>finish(new Error('Falha ao carregar '+src));
    if(timeoutMs>0)timer=setTimeout(()=>finish(new Error('Tempo esgotado ao carregar '+src)),timeoutMs);
    document.head.appendChild(s);
  });
}
function show(text){const el=document.getElementById('v7BootStatus');if(el)el.textContent=text}
function accountMessage(text){const el=document.getElementById('v5AuthError');if(el)el.textContent=text}
function installCloudPlaceholders(){
  window.openV5Account=window.openV5Account||function(){const m=document.getElementById('v5AccountModal');m?.classList.add('open');m?.setAttribute('aria-hidden','false');if(configured)accountMessage('Conectando sua conta…')};
  window.closeV5Account=window.closeV5Account||function(){const m=document.getElementById('v5AccountModal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true')};
  window.v5AuthTab=window.v5AuthTab||function(tab){document.querySelectorAll('[data-v5tab]').forEach(b=>b.classList.toggle('active',b.dataset.v5tab===tab));document.getElementById('v5LoginForm')?.classList.toggle('hidden',tab!=='login');document.getElementById('v5RegisterForm')?.classList.toggle('hidden',tab!=='register')};
  const wait=ev=>{ev?.preventDefault?.();accountMessage(configured?'Sua conta ainda está conectando. Tente novamente em alguns segundos.':'O estudo neste dispositivo continua disponível.')};
  for(const n of ['v5Login','v5Register','v7ResetPassword','v5SyncNow','v5UseCloud','v5UseDevice','v5Logout','v6ChangePassword','v6RevokeOtherSessions','v6ExportAccount','v6DeleteAccount'])if(typeof window[n]!=='function')window[n]=wait;
  window.v6ToggleAccountSection=window.v6ToggleAccountSection||function(id){document.getElementById(id)?.classList.toggle('hidden')};
}

async function loadLocalBank(){
  show('Preparando questões…');
  await loadScript('data/enem-questions.js');
  await loadScript('data/pism-questions.js');
  await loadScript('data/pism-discursives.js');
  window.GABARITO_APP.bankSource='local-fallback';
}

function applyBank(result){
  window.ENEM_QUESTIONS=result.questions.filter(q=>q.exam==='ENEM');
  window.PISM_QUESTIONS=result.questions.filter(q=>q.exam==='PISM');
  window.PISM_DISCURSIVE=result.discursives;
  window.GABARITO_APP.bankSource='supabase-primary';
  window.GABARITO_APP.cloudStatus='ready';
  window.GABARITO_APP.bankVersion=result.version||VERSION;
}

async function preparePrimaryBank(){
  try{
    if(!configured)throw new Error('Banco online não configurado.');
    show('Carregando banco de questões…');
    await loadScript('js/gabarito-question-source.js');
    const result=await window.GabaritoQuestionSource.loadDirect(cfg,{timeoutMs:8000});
    applyBank(result);
    return true;
  }catch(e){
    window.GABARITO_APP.cloudStatus='offline';
    window.GABARITO_APP.cloudError=e.message;
    console.warn('[Gabarito+] Banco online indisponível; ativando fallback local:',e.message);
    await loadLocalBank();
    return false;
  }
}

async function connectAccountLayer(){
  try{
    if(!configured)return;
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',4500);
    if(!window.supabase?.createClient)throw new Error('Biblioteca de conta indisponível.');
    window.estudosSupabase=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    await loadScript('js/gabarito-supabase.js');
  }catch(e){
    console.warn('[Gabarito+] Camada de conta indisponível:',e.message);
    window.GABARITO_APP.cloudStatus=window.GABARITO_APP.bankSource==='supabase-primary'?'bank-ready-account-offline':'offline';
  }
}

async function boot(){
  try{
    installCloudPlaceholders();
    await preparePrimaryBank();
    await loadScript('js/question-bank.js');
    await loadScript('js/app.js');
    await loadScript('js/gabarito-ui.js');
    await loadScript('js/v6-release.js');
    const overlay=document.getElementById('v7Boot');if(overlay)overlay.remove();
    setTimeout(connectAccountLayer,0);
  }catch(e){
    console.error(e);show('Não foi possível iniciar o aplicativo: '+e.message);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
