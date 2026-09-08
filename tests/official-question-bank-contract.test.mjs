import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const bootstrap=await readFile(new URL('../js/gabarito-bootstrap.js',import.meta.url),'utf8');
const bank=await readFile(new URL('../js/official-question-bank-v1.js',import.meta.url),'utf8');
const practice=await readFile(new URL('../js/official-practice-v1.js',import.meta.url),'utf8');
const nav=await readFile(new URL('../js/official-practice-navigation-v1.js',import.meta.url),'utf8');

test('bootstrap carrega banco oficial e depois o treino separado',()=>{
  assert.match(bootstrap,/VERSION='3\.8\.0'/);
  assert.match(bootstrap,/official-question-bank-v1\.js/);
  assert.match(bootstrap,/official-practice-v1\.js/);
  assert.ok(bootstrap.indexOf('gabarito-ui.js')<bootstrap.indexOf('official-question-bank-v1.js'));
  assert.ok(bootstrap.indexOf('official-question-bank-v1.js')<bootstrap.indexOf('official-practice-v1.js'));
});

test('Questões não volta para o banco autoral nem abre Simulados',()=>{
  assert.match(nav,/if\(page==='questions'\)return practice\.open\(\)/);
  assert.match(nav,/window\.v42OpenQuestions=\(\)=>practice\.open\(\)/);
  assert.match(nav,/window\.v40OpenFocusedQuestions=\(\)=>practice\.open\(\)/);
  assert.match(practice,/questionPracticeSource='official-exams-only'/);
  assert.match(practice,/authorialQuestionPractice=false/);
  assert.match(practice,/baseGo\('questions'\)/);
  assert.doesNotMatch(practice,/baseGo\('mocks'\)/);
});

test('Banco oficial continua ancorado no índice oficial ENEM e PISM',()=>{
  assert.match(bank,/official_question_index/);
  assert.match(bank,/official_exam_sources/);
  assert.match(practice,/ENEM/);
  assert.match(practice,/PISM/);
  assert.match(practice,/\/api\/pism-official\?/);
});
