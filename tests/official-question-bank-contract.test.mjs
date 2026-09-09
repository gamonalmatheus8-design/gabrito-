import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const bootstrap=await readFile(new URL('../js/gabarito-bootstrap.js',import.meta.url),'utf8');
const bank=await readFile(new URL('../js/official-question-bank-v1.js',import.meta.url),'utf8');
const practice=await readFile(new URL('../js/official-practice-v1.js',import.meta.url),'utf8');
const nav=await readFile(new URL('../js/official-practice-navigation-v1.js',import.meta.url),'utf8');
const stability=await readFile(new URL('../js/official-practice-stability-v1.js',import.meta.url),'utf8');

test('bootstrap 3.9 carrega Banco V3 antes das camadas de compatibilidade',()=>{
  assert.match(bootstrap,/VERSION='3\.9\.0'/);
  assert.match(bootstrap,/RECOVERY='20260909-practice-v3'/);
  assert.match(bootstrap,/official-question-bank-v1\.js/);
  assert.match(bootstrap,/official-practice-v1\.js/);
  assert.match(bootstrap,/official-practice-navigation-v1\.js/);
  assert.ok(bootstrap.indexOf('gabarito-ui.js')<bootstrap.indexOf('official-question-bank-v1.js'));
  assert.ok(bootstrap.indexOf('official-question-bank-v1.js')<bootstrap.indexOf('official-practice-v1.js'));
});

test('Questões usa navegação nativa sem wrappers, polling ou observadores globais',()=>{
  assert.match(nav,/const VERSION='3\.0\.0'/);
  assert.match(nav,/window\.v40OpenFocusedQuestions=\(\)=>window\.go\?\.\('questions'\)/);
  assert.match(nav,/window\.v42OpenQuestions=\(\)=>window\.go\?\.\('questions'\)/);
  assert.match(nav,/questionNavigation='app-go-direct'/);
  assert.match(stability,/questionRouteOwner='app-go-direct'/);
  assert.match(stability,/questionPracticeSeparatedFromMocks=true/);
  assert.doesNotMatch(nav,/window\.go\s*=/);
  assert.doesNotMatch(stability,/window\.go\s*=/);
  assert.doesNotMatch(nav,/MutationObserver|setInterval/);
  assert.doesNotMatch(stability,/MutationObserver|setInterval/);
  assert.match(practice,/GABARITO_PRACTICE_V3/);
});

test('Banco V3 lê somente questões publicadas da base de treino validada',()=>{
  assert.match(bank,/practice_questions/);
  assert.match(bank,/practice_question_sources/);
  assert.match(bank,/practice_attempts/);
  assert.match(bank,/status:'eq\.published'/);
  assert.match(bank,/questionBankMode='validated_practice_v3'/);
  assert.match(bank,/authorialQuestionPractice=false/);
  assert.doesNotMatch(bank,/official_question_index/);
  assert.doesNotMatch(bank,/official_exam_sources/);
  assert.doesNotMatch(bank,/go\(['"]mocks['"]\)/);
  assert.match(bank,/\/api\/enem-pdf\?url=/);
  assert.match(bank,/\/api\/pism-pdf\?url=/);
});
