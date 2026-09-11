/* Gabarito+ V9.2 — caminho rápido para filtros de questões */
(function(){
'use strict';
const VERSION='9.2.1';
const STATS='study_question_stats_v2',FAV='study_favorites_v2',ANSWERS='study_answer_log_v25';
const safe=(fn,fallback)=>{try{return fn()}catch{return fallback}};
const all=()=>safe(()=>window.QuestionBank?.getAll?.()||[],[]);
const familyKey=q=>`${q.exam}|${q.module||''}|${q.variantFamily||q.id}`;
let statsRaw='',stats={},familyMap=new Map(),answerRaw='',activeSet=new Set(),structureCache=new Map(),searchIndex=new Map();
function refreshStats(){const raw=localStorage.getItem(STATS)||'{}';if(raw===statsRaw)return;statsRaw=raw;try{stats=JSON.parse(raw)||{}}catch{stats={}}familyMap=new Map();for(const q of all()){const x=stats[q.id];if(!x)continue;const key=familyKey(q),row=familyMap.get(key)||{attempts:0,correct:0,wrong:0};row.attempts+=Number(x.attempts)||0;row.correct+=Number(x.correct)||0;row.wrong+=Number(x.wrong)||0;familyMap.set(key,row)}}
function refreshActive(){const raw=localStorage.getItem(ANSWERS)||'[]';if(raw===answerRaw)return;answerRaw=raw;let log=[];try{log=JSON.parse(raw)||[]}catch{}const last={};for(const row of log){if(row?.id==null)continue;const id=String(row.id);if(!last[id]||(Number(row.ts)||0)>(Number(last[id].ts)||0))last[id]=row}refreshStats();activeSet=new Set();for(const q of all()){const x=stats[q.id];if((Number(x?.wrong)||0)>0&&(!last[String(q.id)]||last[String(q.id)].ok===false))activeSet.add(String(q.id))}}
function searchText(q){const id=String(q.id);if(searchIndex.has(id))return searchIndex.get(id);const text=`${q.subject||''} ${q.topic||''} ${q.skill||''} ${q.text||''}`.toLocaleLowerCase('pt-BR');searchIndex.set(id,text);return text}
function structural(){const value=id=>document.getElementById(id)?.value||'ALL',ex=value('qExam'),mod=value('qModule'),area=value('qArea'),sub=value('qSubject'),dif=value('qDifficulty'),top=value('qTopic'),key=[ex,mod,area,sub,dif,top].join('|');if(structureCache.has(key))return structureCache.get(key);const pool=all().filter(q=>(ex==='ALL'||q.exam===ex)&&(mod==='ALL'||q.module===mod)&&(area==='ALL'||q.area===area)&&(sub==='ALL'||q.subject===sub)&&(dif==='ALL'||q.difficulty===dif)&&(top==='ALL'||q.topic===top));structureCache.set(key,pool);return pool}
function unique(pool){const seen=new Set(),out=[];for(const q of pool){const key=familyKey(q);if(seen.has(key))continue;seen.add(key);out.push(q)}return out}
function filtered(){refreshStats();refreshActive();const status=document.getElementById('qStatus')?.value||'ALL',query=String(document.getElementById('qSearch')?.value||'').trim().toLocaleLowerCase('pt-BR'),fav=new Set(safe(()=>JSON.parse(localStorage.getItem(FAV)||'[]').map(String),[]));return unique(structural().filter(q=>{const fam=familyMap.get(familyKey(q));if(status==='UNSEEN'&&(fam?.attempts||0)>0)return false;if(status==='WRONG'&&!activeSet.has(String(q.id)))return false;if(status==='FAV'&&!fav.has(String(q.id)))return false;if(query&&!searchText(q).includes(query))return false;return true}))}
function install(){const current=window.filteredQuestions;if(typeof current!=='function'||current.__v92fast)return;const fn=function(){return safe(filtered,current)};fn.__v92fast=true;window.filteredQuestions=fn;window.addEventListener('storage',()=>{statsRaw='';answerRaw='';structureCache.clear()});}
window.GabaritoV92QuestionSpeed={version:VERSION,refresh:()=>{statsRaw='';answerRaw='';structureCache.clear()},filtered};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,320),{once:true});else setTimeout(install,320);
})();
