import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const bootstrap=await readFile(new URL('../js/gabarito-bootstrap.js',import.meta.url),'utf8');
const bank=await readFile(new URL('../js/official-question-bank-v1.js',import.meta.url),'utf8');
const practice=await readFile(new URL('../js/official-practice-v1.js',import.meta.url),'utf8');
const nav=await readFile(new URL('../js/official-practice-navigation-v1.js',import.meta.url),'utf8');
const stability=await readFile(new URL('../js/official-practice-stability-v1.js',import.meta.url),'utf8');

test('bootstrap carrega banco oficial e depois o treino separado',()=>{
  assert.match(bootstrap,/VERSION='3\.8\.0'/);
  assert.match(bootstrap,/official-question-bank-v1\.js/);
  assert.match(bootstrap,/official-practice-v1\.js/);
  assert.ok(bootstrap.indexOf('gabarito-ui.js')<bootstrap.indexOf('official-question-bank-v1.js'));
  assert.ok(bootstrap.indexOf('official-question-bank-v1.js')<bootstrap.indexOf('official-practice-v1.js'));
});

test('Questões tem um único dono de rota e desativa Simulados explicitamente',()=>{
  assert.match(nav,/official-practice-stability-v1\.js\?v=2\.0\.0-20260908/);
  assert.match(nav,/questionNavigation='official-practice-v2'/);
  assert.match(stability,/questionRouteOwner='official-practice-v2'/);
  assert.match(stability,/mocks\?\.classList\.remove\('active'\)/);
  assert.match(stability,/if\(page==='questions'\)return openPractice\(\)/);
  assert.match(stability,/document\.addEventListener\('click',interceptQuestionClick,true\)/);
  assert.match(practice,/questionPracticeSource='official-exams-only'/);
  assert.match(practice,/authorialQuestionPractice=false/);
});

test('Banco oficial continua ancorado no índice oficial ENEM e PISM',()=>{
  assert.match(bank,/official_question_index/);
  assert.match(bank,/official_exam_sources/);
  assert.match(practice,/ENEM/);
  assert.match(practice,/PISM/);
  assert.match(practice,/\/api\/pism-official\?/);
});
