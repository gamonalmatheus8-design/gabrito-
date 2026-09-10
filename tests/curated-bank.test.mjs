import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const seed=JSON.parse(read('supabase/seeds/questions.json'));
const manifest=JSON.parse(read('data/question-bank-manifest.json'));
const ctx={window:{},setTimeout,clearTimeout};
for(const f of ['data/enem-questions.js','data/pism-questions.js','data/pism-questions-v25.js','data/editorial-exclusions.js','js/gabarito-question-source.js'])vm.runInNewContext(read(f),ctx);
const source=ctx.window.GabaritoQuestionSource;
test('fallback local e seed contêm exatamente o mesmo conteúdo revisado',()=>{
 const local=JSON.parse(JSON.stringify([...ctx.window.ENEM_QUESTIONS,...ctx.window.PISM_QUESTIONS])).sort((a,b)=>a.id.localeCompare(b.id));
 assert.deepEqual(local,[...seed].sort((a,b)=>a.id.localeCompare(b.id)));
 assert.equal(local.length,manifest.published);
 assert.equal(new Set(local.map(q=>q.id)).size,local.length);
 assert.ok(local.every(q=>q.editorialStatus==='publicada'&&!ctx.window.GABARITO_ARCHIVED_QUESTION_IDS.includes(q.id)));
});
test('validação não confunde letras maiúsculas genéticas e rejeita alternativas repetidas',()=>{
 const q={...seed[0],options:['AA','Aa','aa','AB','ab']};
 assert.doesNotThrow(()=>source.validate([q],[],1));
 assert.throws(()=>source.validate([{...q,options:['AA','AA','aa','AB','ab']}],[],1),/inválida/);
 assert.throws(()=>source.validate([{...q,explanation:' '}],[],1),/inválida/);
 assert.throws(()=>source.validate([q],[],2),/incompleto/);
});
test('paginação remota continua além de mil itens e confere o total declarado',async()=>{
 const rows=Array.from({length:1207},(_,i)=>({...seed[i%seed.length],id:'PAGE-'+i,editorial_status:'publicada'}));
 const ranges=[];
 const client={from(table){return{select(){return this},eq(){return this},order(){return this},range(a,b){ranges.push([table,a,b]);return Promise.resolve({data:table==='questions'?rows.slice(a,b+1):[],error:null})},in(){return Promise.resolve({data:[{key:'autoral_question_count',value:'1207'},{key:'question_bank_version',value:'test'}],error:null})}}}};
 const result=await source.load(client);
 assert.equal(result.questions.length,1207);
 assert.ok(ranges.some(([t,a])=>t==='questions'&&a===1000));
});
