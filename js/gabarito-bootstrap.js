(function(){
'use strict';
const VERSION='2.2.0';
const RECOVERY='20260827c';
const cfg=window.ESTUDOS_SUPABASE_CONFIG||{};
const configured=Boolean(cfg.url&&cfg.publishableKey&&!/SEU-PROJETO|COLE_SUA/i.test(String(cfg.url)+String(cfg.publishableKey)));
window.GABARITO_APP={configured,version:VERSION,bankSource:'starting',bankVersion:VERSION,cloudStatus:configured?'connecting':'not-configured',recovery:RECOVERY};
document.title='Gabarito+ — ENEM & PISM';
const asset=src=>/^https?:/i.test(src)?src:`${src}${src.includes('?')?'&':'?'}v=${encodeURIComponent(VERSION)}&r=${RECOVERY}`;
function loadScript(src,timeoutMs=5000){return new Promise((resolve,reject)=>{const s=document.createElement('script');let done=false,timer=null;const finish=err=>{if(done)return;done=true;if(timer)clearTimeout(timer);err?reject(err):resolve()};s.src=asset(src);s.async=false;s.onload=()=>finish();s.onerror=()=>finish(new Error('Falha ao carregar '+src));if(timeoutMs>0)timer=setTimeout(()=>finish(new Error('Tempo esgotado ao carregar '+src)),timeoutMs);document.head.appendChild(s)})}
function loadStyle(src){return new Promise((resolve,reject)=>{if(document.querySelector(`link[data-gplus-style="${src}"]`))return resolve();const l=document.createElement('link');l.rel='stylesheet';l.href=asset(src);l.dataset.gplusStyle=src;l.onload=resolve;l.onerror=()=>reject(new Error('Falha ao carregar '+src));document.head.appendChild(l)})}
function show(text){const el=document.getElementById('v7BootStatus');if(el)el.textContent=text}
function accountMessage(text){const el=document.getElementById('v5AuthError');if(el)el.textContent=text}
function installCloudPlaceholders(){window.openV5Account=window.openV5Account||function(){const m=document.getElementById('v5AccountModal');m?.classList.add('open');m?.setAttribute('aria-hidden','false');if(configured)accountMessage('Conectando sua conta…')};window.closeV5Account=window.closeV5Account||function(){const m=document.getElementById('v5AccountModal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true')};window.v5AuthTab=window.v5AuthTab||function(tab){document.querySelectorAll('[data-v5tab]').forEach(b=>b.classList.toggle('active',b.dataset.v5tab===tab));document.getElementById('v5LoginForm')?.classList.toggle('hidden',tab!=='login');document.getElementById('v5RegisterForm')?.classList.toggle('hidden',tab!=='register')};const wait=ev=>{ev?.preventDefault?.();accountMessage(configured?'Sua conta ainda está conectando. Tente novamente em alguns segundos.':'O estudo neste dispositivo continua disponível.')};for(const n of ['v5Login','v5Register','v7ResetPassword','v5SyncNow','v5UseCloud','v5UseDevice','v5Logout','v6ChangePassword','v6RevokeOtherSessions','v6ExportAccount','v6DeleteAccount'])if(typeof window[n]!=='function')window[n]=wait;window.v6ToggleAccountSection=window.v6ToggleAccountSection||function(id){document.getElementById(id)?.classList.toggle('hidden')}}
function applyEditorialExclusions(){const ids=new Set((window.GABARITO_ARCHIVED_QUESTION_IDS||[]).map(String));if(!ids.size)return 0;let removed=0;for(const key of ['ENEM_QUESTIONS','PISM_QUESTIONS']){const arr=Array.isArray(window[key])?window[key]:[];const next=arr.filter(q=>!ids.has(String(q?.id)));removed+=arr.length-next.length;window[key]=next}window.GABARITO_APP.localEditorialExclusions=removed;return removed}
async function loadLocalBank(){show('Abrindo conteúdo local…');try{await loadScript('data/editorial-exclusions.js',3000)}catch(e){console.warn('[Gabarito+] Lista editorial local indisponível:',e.message)}await loadScript('data/enem-questions.js',5000);await loadScript('data/pism-questions.js',5000);await loadScript('data/pism-discursives.js',5000);applyEditorialExclusions();window.GABARITO_APP.bankSource='local-reviewed';window.GABARITO_APP.cloudStatus=configured?'account-pending':'offline'}
function applyBank(result){window.ENEM_QUESTIONS=result.questions.filter(q=>q.exam==='ENEM');window.PISM_QUESTIONS=result.questions.filter(q=>q.exam==='PISM');window.PISM_DISCURSIVE=result.discursives;applyEditorialExclusions();window.GABARITO_APP.bankSource=result.fromCache?'supabase-cache':'supabase-primary';window.GABARITO_APP.cloudStatus=result.stale?'cached-offline':'ready';window.GABARITO_APP.bankVersion=result.version||VERSION;window.GABARITO_APP.bankCached=Boolean(result.fromCache);window.GABARITO_APP.bankStale=Boolean(result.stale)}
async function preparePrimaryBank(){try{if(!configured)throw new Error('Banco online não configurado.');await loadScript('js/gabarito-question-source.js',3500);const loader=window.GabaritoQuestionSource.loadDirectCached||window.GabaritoQuestionSource.loadDirect;const result=await loader(cfg,{timeoutMs:5000});applyBank(result);return true}catch(e){window.GABARITO_APP.cloudError=e.message;console.warn('[Gabarito+] Conteúdo online indisponível:',e.message);return false}}
async function connectAccountLayer(){try{if(!configured)return;await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',4500);if(!window.supabase?.createClient)throw new Error('Biblioteca de conta indisponível.');window.estudosSupabase=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});await loadScript('js/gabarito-supabase.js',5000)}catch(e){console.warn('[Gabarito+] Camada de conta indisponível:',e.message);window.GABARITO_APP.cloudStatus='offline'}}
async function loadQualityLayer(){try{await loadStyle('assets/quality-v22.css');await loadScript('js/quality-v22.js',3500)}catch(e){console.warn('[Gabarito+] Camada de qualidade indisponível:',e.message)}}
async function boot(){try{
 installCloudPlaceholders();
 show('Abrindo aplicativo…');
 await loadLocalBank();
 await loadScript('js/question-bank.js',5000);
 await loadScript('js/app.js',5000);
 await loadScript('js/gabarito-ui.js',5000);
 await loadScript('js/v6-release.js',5000);
 try{await loadStyle('assets/commercial-v2.css');await loadScript('js/commercial-v2.js',5000)}catch(e){console.warn('[Gabarito+] Acabamento comercial indisponível:',e.message)}
 await loadQualityLayer();
 const overlay=document.getElementById('v7Boot');if(overlay)overlay.remove();
 window.GABARITO_APP.ready=true;
 setTimeout(connectAccountLayer,50);
}catch(e){console.error('[Gabarito+] Falha de inicialização:',e);window.GABARITO_APP.bootError=e.message;show('Falha ao iniciar. Recarregue a página.')}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
