import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const js=fs.readFileSync(path.join(root,'js/official-question-bank-v1.js'),'utf8');

test('Banco V3 é uma experiência de treino independente dos Simulados',()=>{
  assert.doesNotThrow(()=>new vm.Script(js,{filename:'js/official-question-bank-v1.js'}));
  assert.match(js,/const VERSION='3\.0\.2'/);
  assert.match(js,/practice_questions/);
  assert.match(js,/practice_question_sources/);
  assert.match(js,/practice_attempts/);
  assert.match(js,/status:'eq\.published'/);
  assert.match(js,/window\.renderQuestionPage=open/);
  assert.match(js,/BANCO DE TREINO VALIDADO/);
  assert.match(js,/Sem cronômetro de prova e sem formato de simulado/);
  assert.doesNotMatch(js,/v27OfficialRunner|v28HistoryLibrary|v29PismOfficialHub/);
  assert.doesNotMatch(js,/go\(['"]mocks['"]\)/);
  assert.doesNotMatch(js,/window\.go\s*=/);
  assert.doesNotMatch(js,/MutationObserver/);
  assert.doesNotMatch(js,/setInterval\s*\(/);
});

test('Banco V3 pagina o catálogo validado sem teto de 1000 itens',()=>{
  assert.match(js,/const REST_PAGE_SIZE=500/);
  assert.match(js,/async function restPaged/);
  assert.match(js,/offset\+=pageSize/);
  assert.match(js,/limit:pageSize,offset/);
  assert.match(js,/if\(page\.length<pageSize\)break/);
  assert.match(js,/restPaged\('practice_questions'/);
  assert.match(js,/restPaged\('practice_question_sources'/);
  assert.doesNotMatch(js,/status:'eq\.published',order:'year\.desc,original_number\.asc',limit:1000/);
  assert.match(js,/practiceBankPageSize=REST_PAGE_SIZE/);
});

test('métricas usam índice por id e histórico em nuvem acompanha retenção local',()=>{
  assert.match(js,/catalogById:new Map\(\)/);
  assert.match(js,/state\.catalogById=new Map\(state\.catalog\.map/);
  assert.match(js,/state\.catalogById\.get\(a\.question_id\)\?\.exam===state\.exam/);
  assert.doesNotMatch(js,/state\.attempts\.filter\(a=>state\.catalog\.some/);
  assert.match(js,/const CLOUD_HISTORY_PAGE_SIZE=500/);
  assert.match(js,/const CLOUD_HISTORY_LIMIT=2000/);
  assert.match(js,/\.range\(from,to\)/);
  assert.match(js,/state\.attempts=local\.slice\(0,CLOUD_HISTORY_LIMIT\)/);
});

test('Banco V3 oferece filtros pedagógicos, feedback, diagnóstico e revisão',()=>{
  for(const token of ['Área','Disciplina','Assunto','Não respondidas','Meus erros','Salvas','Nova questão','Respondidas','Acertos','Erros','Aproveitamento'])assert.match(js,new RegExp(token));
  assert.match(js,/Acertou\./);
  assert.match(js,/Errou\./);
  assert.match(js,/Gabarito oficial/);
  assert.match(js,/renderDiagnosis/);
  assert.match(js,/toggleBookmark/);
});

test('conteúdo visual vem da questão oficial individual e não do runner de prova',()=>{
  assert.match(js,/scanHeads/);
  assert.match(js,/renderOfficialCrop/);
  assert.match(js,/\/api\/enem-pdf\?url=/);
  assert.match(js,/\/api\/pism-pdf\?url=/);
  assert.match(js,/Questão oficial/);
  assert.match(js,/Ver fonte oficial/);
});
