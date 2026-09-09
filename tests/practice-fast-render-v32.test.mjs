import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const standalone=fs.readFileSync(path.join(root,'js/practice-standalone-v34.js'),'utf8');
const compat=fs.readFileSync(path.join(root,'js/official-practice-v1.js'),'utf8');

test('área standalone tem sintaxe válida e é carregada pela prática oficial',()=>{
  assert.doesNotThrow(()=>new vm.Script(standalone,{filename:'js/practice-standalone-v34.js'}));
  assert.match(standalone,/const VERSION='3\.4\.0'/);
  assert.match(compat,/practice-standalone-v34\.js\?v=\$\{STANDALONE_VERSION\}/);
  assert.match(compat,/STANDALONE_VERSION='3\.4\.0-20260909'/);
  assert.doesNotMatch(compat,/practice-fast-render-v32/);
});

test('Questões deixa de usar a prova oficial como interface',()=>{
  assert.match(standalone,/practiceUsesPdfAsInterface=false/);
  assert.match(standalone,/practicePresentation='standalone-question'/);
  assert.match(standalone,/Questões individuais, com enunciado e alternativas dentro do Gabarito\+/);
  assert.doesNotMatch(standalone,/renderSegment\s*\(/);
  assert.doesNotMatch(standalone,/createElement\(['"]canvas['"]\)/);
  assert.doesNotMatch(standalone,/Trecho da questão oficial/);
});

test('conteúdo vem pronto do banco e não baixa PDF no navegador',()=>{
  assert.match(standalone,/function normalizedOptions/);
  assert.match(standalone,/statement_text,options,asset_url/);
  assert.match(standalone,/function storedContent/);
  assert.match(standalone,/Questão aguardando conteúdo estruturado no Banco de Treino/);
  assert.match(standalone,/q\.asset_url/);
  assert.doesNotMatch(standalone,/pdfjs-dist|getTextContent\(|\/api\/enem-pdf\?url=|\/api\/pism-pdf\?url=/);
  assert.match(standalone,/Fonte validada/);
});

test('contador usa somente o Banco de Treino validado',()=>{
  assert.match(standalone,/function syncCounter/);
  assert.match(standalone,/sideQCount/);
  assert.match(standalone,/questionCounterSource='validated-practice-bank'/);
  assert.match(standalone,/practiceQuestionCount=n/);
  assert.doesNotMatch(standalone,/QUESTIONS\.length/);
});

test('treino preserva filtros, respostas, salvas e diagnóstico',()=>{
  for(const token of ['Ano','Área','Disciplina','Assunto','Não respondidas','Meus erros','Salvas','Nova questão','Respondidas','Acertos','Erros','Aproveitamento'])assert.match(standalone,new RegExp(token));
  assert.match(standalone,/toggleBookmark/);
  assert.match(standalone,/saveCloudAttempt/);
  assert.match(standalone,/renderDiagnosis/);
  assert.match(standalone,/Gabarito:/);
});
