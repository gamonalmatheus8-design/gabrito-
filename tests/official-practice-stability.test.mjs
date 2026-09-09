import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Questões V3 usa a navegação nativa do app sem wrappers, polling ou observers',()=>{
  const bank=read('js/official-question-bank-v1.js');
  const nav=read('js/official-practice-navigation-v1.js');
  const stability=read('js/official-practice-stability-v1.js');
  for(const [name,js] of [['bank',bank],['nav',nav],['stability',stability]])assert.doesNotThrow(()=>new vm.Script(js,{filename:name}));
  assert.match(bank,/const VERSION='3\.0\.0'/);
  assert.match(bank,/window\.renderQuestionPage=open/);
  assert.match(nav,/window\.v42OpenQuestions=\(\)=>window\.go\?\.\('questions'\)/);
  assert.match(nav,/window\.v40OpenFocusedQuestions=\(\)=>window\.go\?\.\('questions'\)/);
  assert.match(stability,/questionRouteOwner='app-go-direct'/);
  for(const js of [bank,nav,stability]){
    assert.doesNotMatch(js,/window\.go\s*=/);
    assert.doesNotMatch(js,/MutationObserver/);
    assert.doesNotMatch(js,/setInterval\s*\(/);
    assert.doesNotMatch(js,/interceptQuestionClick/);
  }
});

test('compatibilidade da área Escola não assume a rota Questões',()=>{
  const loader=read('js/classrooms-v1.js');
  const stability=read('js/official-practice-stability-v1.js');
  assert.match(loader,/coordinator-school-v1\.js/);
  assert.match(loader,/official-practice-stability-v1\.js/);
  assert.doesNotMatch(stability,/window\.go\s*=/);
  assert.match(stability,/questionPracticeSeparatedFromMocks=true/);
});
