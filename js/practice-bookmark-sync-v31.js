(function(){
'use strict';
if(window.__GABARITO_PRACTICE_BOOKMARK_SYNC_V31__)return;
window.__GABARITO_PRACTICE_BOOKMARK_SYNC_V31__=true;

const VERSION='3.1.0';
const LOCAL_KEY='gplus_practice_v3_bookmarks';
const PENDING_KEY='gplus_practice_v3_bookmark_ops';
const MIGRATION_PREFIX='gplus_practice_v3_bookmarks_migrated_';
let syncing=null;

function client(){return window.estudosSupabase||window.__ESTUDOS_SUPABASE?.client||null}
function safe(raw,fallback){try{return JSON.parse(raw)}catch{return fallback}}
function readLocal(){const rows=safe(localStorage.getItem(LOCAL_KEY),[]);return new Set(Array.isArray(rows)?rows.map(String):[])}
function writeLocal(set){try{localStorage.setItem(LOCAL_KEY,JSON.stringify([...set]))}catch{}}
function readPending(){const value=safe(localStorage.getItem(PENDING_KEY),{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
function writePending(value){try{if(Object.keys(value).length)localStorage.setItem(PENDING_KEY,JSON.stringify(value));else localStorage.removeItem(PENDING_KEY)}catch{}}
function sameSet(a,b){if(a.size!==b.size)return false;for(const value of a)if(!b.has(value))return false;return true}
function markPending(questionId,on){const pending=readPending();pending[String(questionId)]=Boolean(on);writePending(pending)}
function clearPending(questionId){const pending=readPending();delete pending[String(questionId)];writePending(pending)}
function appState(){return window.GABARITO_PRACTICE_V3?.state||null}
function setStatus(value){window.GABARITO_APP=window.GABARITO_APP||{};window.GABARITO_APP.practiceBookmarkSync=value}

async function currentUser(c){
  try{const {data:{user}={}}=await c.auth.getUser();return user||null}catch{return null}
}

async function reloadPracticeIfNeeded(before,after){
  if(sameSet(before,after))return;
  const practice=window.GABARITO_PRACTICE_V3;if(!practice?.reload)return;
  try{
    await practice.reload();
    if(document.querySelector('#page-questions.active'))await practice.open();
  }catch(error){console.warn('[Gabarito+] Favoritos: atualização local adiada.',error?.message||error)}
}

async function flushPending(c,user,pending){
  const entries=Object.entries(pending),adds=entries.filter(([,on])=>on).map(([id])=>id),removes=entries.filter(([,on])=>!on).map(([id])=>id);
  let ok=true;
  if(adds.length){
    const {error}=await c.from('practice_bookmarks').upsert(adds.map(question_id=>({user_id:user.id,question_id})),{onConflict:'user_id,question_id'});
    if(error)ok=false;
  }
  if(removes.length){
    const {error}=await c.from('practice_bookmarks').delete().eq('user_id',user.id).in('question_id',removes);
    if(error)ok=false;
  }
  if(ok)writePending({});
  return ok;
}

async function syncAll(){
  if(syncing)return syncing;
  syncing=(async()=>{
    const c=client();if(!c){setStatus('local');return false}
    const user=await currentUser(c);if(!user){setStatus('local');return false}
    setStatus('syncing');
    const {data,error}=await c.from('practice_bookmarks').select('question_id,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1000);
    if(error){setStatus('local-fallback');return false}

    const before=readLocal(),cloud=new Set((data||[]).map(row=>String(row.question_id))),pending=readPending();
    const migrated=localStorage.getItem(MIGRATION_PREFIX+user.id)==='1';
    if(!migrated){for(const id of before)if(!cloud.has(id))pending[id]=true}
    for(const [id,on] of Object.entries(pending)){if(on)cloud.add(id);else cloud.delete(id)}
    writeLocal(cloud);
    await reloadPracticeIfNeeded(before,cloud);

    const ok=await flushPending(c,user,pending);
    if(ok){try{localStorage.setItem(MIGRATION_PREFIX+user.id,'1')}catch{};setStatus('cloud-ready')}
    else setStatus('local-fallback');
    return ok;
  })().finally(()=>{syncing=null});
  return syncing;
}

async function pushOne(questionId,on){
  const id=String(questionId);markPending(id,on);setStatus('syncing');
  const c=client();if(!c){setStatus('local');return false}
  const user=await currentUser(c);if(!user){setStatus('local');return false}
  try{
    const result=on
      ?await c.from('practice_bookmarks').upsert({user_id:user.id,question_id:id},{onConflict:'user_id,question_id'})
      :await c.from('practice_bookmarks').delete().eq('user_id',user.id).eq('question_id',id);
    if(result?.error){setStatus('local-fallback');return false}
    clearPending(id);try{localStorage.setItem(MIGRATION_PREFIX+user.id,'1')}catch{};setStatus('cloud-ready');return true;
  }catch{setStatus('local-fallback');return false}
}

function afterBookmarkClick(){
  queueMicrotask(()=>{
    const state=appState(),id=state?.current?.id;if(!id)return;
    const on=Boolean(state.bookmarks?.has?.(id));
    void pushOne(id,on);
  });
}

function scheduleSync(delay){setTimeout(()=>void syncAll(),delay)}
document.addEventListener('click',event=>{
  if(event.target.closest?.('#pv3Bookmark'))afterBookmarkClick();
  if(event.target.closest?.('#v5LoginBtn,#v5RegisterBtn,[onclick*="v5UseCloud"],[onclick*="v5UseDevice"]'))scheduleSync(900);
});
window.addEventListener('focus',()=>void syncAll(),{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scheduleSync(700);scheduleSync(2400)},{once:true});
else{scheduleSync(700);scheduleSync(2400)}

window.GABARITO_PRACTICE_BOOKMARK_SYNC={version:VERSION,sync:syncAll,push:pushOne};
})();
