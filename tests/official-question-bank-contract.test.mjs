import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const bootstrap=await readFile(new URL('../js/gabarito-bootstrap.js',import.meta.url),'utf8');
const bank=await readFile(new URL('../js/official-question-bank-v1.js',import.meta.url),'utf8');

test('bootstrap carrega banco oficial depois da UI pública',()=>{
  assert.match(bootstrap,/VERSION='3\.7\.0'/);
  assert.match(bootstrap,/official-question-bank-v1\.js/);
  assert.ok(bootstrap.indexOf('gabarito-ui.js')<bootstrap.indexOf('official-question-bank-v1.js'));
});

test('Questões não volta para o banco autoral',()=>{
  assert.match(bank,/if\(page==='questions'\)return openBank\(\)/);
  assert.match(bank,/window\.v42OpenQuestions=\(\)=>openBank\(\)/);
  assert.match(bank,/window\.v40OpenFocusedQuestions=\(\)=>openBank\(\)/);
  assert.match(bank,/questionPracticeSource='official-exams-only'/);
  assert.match(bank,/authorialQuestionPractice=false/);
});

test('Banco oficial exige bibliotecas reais ENEM e PISM',()=>{
  assert.match(bank,/#v28HistoryLibrary/);
  assert.match(bank,/#v29PismOfficialHub/);
  assert.match(bank,/INEP/);
  assert.match(bank,/UFJF\/COPESE/);
});
