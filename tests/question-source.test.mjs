import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await import(pathToFileURL(path.join(root,'js/gabarito-question-source.js')).href);
const source=globalThis.GabaritoQuestionSource;
const questions=JSON.parse(fs.readFileSync(path.join(root,'supabase/seeds/questions.json'),'utf8'));
const discursives=JSON.parse(fs.readFileSync(path.join(root,'supabase/seeds/pism-discursives.json'),'utf8'));

function dbRows(){
  return questions.map(x=>({...x,editorial_status:x.editorialStatus,variant_family:x.variantFamily,variant_type:x.variantType}));
}
function clientFor({fail=false,partial=false}={}){
  const tables={questions:dbRows(),pism_discursives:discursives.map(x=>({...x,editorial_status:'publicada'})),app_meta:[{key:'question_bank_version',value:'1.1.0'}]};
  if(partial)tables.questions=tables.questions.slice(0,1000);
  return{from(table){return{select(){return this},eq(){return this},order(){return this},range(from,to){return Promise.resolve(fail?{data:null,error:new Error('offline')}:{data:tables[table].slice(from,to+1),error:null})},in(){return Promise.resolve({data:tables[table],error:null})}}}};
}

test('carrega Supabase paginado e converte os campos editoriais',async()=>{
  const result=await source.load(clientFor(),{timeoutMs:2000});
  assert.equal(result.questions.length,3375);
  assert.equal(result.questions.filter(x=>x.exam==='ENEM').length,2220);
  assert.equal(result.questions.filter(x=>x.exam==='PISM').length,1155);
  assert.equal(result.discursives.length,52);
  assert.equal(result.questions[0].editorialStatus,'publicada');
  assert.equal(result.version,'1.1.0');
});

test('rejeita banco remoto parcial para permitir fallback seguro',async()=>{
  await assert.rejects(()=>source.load(clientFor({partial:true}),{timeoutMs:2000}),/incompleto/);
});

test('propaga indisponibilidade remota para permitir fallback local',async()=>{
  await assert.rejects(()=>source.load(clientFor({fail:true}),{timeoutMs:2000}),/offline/);
});
