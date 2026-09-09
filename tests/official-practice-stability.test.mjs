import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('rota Questões v2 tem sintaxe válida, isola Simulados e restaura window.go',()=>{
  const js=read('js/official-practice-stability-v1.js');
  assert.doesNotThrow(()=>new vm.Script(js,{filename:'js/official-practice-stability-v1.js'}));
  assert.match(js,/const VERSION='2\.0\.0'/);
  assert.match(js,/mocks\?\.classList\.remove\('active'\)/);
  assert.match(js,/shim\.__officialQuestionBankBaseGo=page=>page==='questions'\?activateQuestions\(\):undefined/);
  assert.match(js,/window\.go=shim/);
  assert.match(js,/finally\s*\{\s*window\.go=outerGo/);
  assert.match(js,/document\.addEventListener\('click',interceptQuestionClick,true\)/);
  assert.match(js,/questionRouteOwner='official-practice-v2'/);
});

test('loader aplica estabilidade v2 depois do wrapper da escola',()=>{
  const loader=read('js/classrooms-v1.js');
  assert.match(loader,/coordinator-school-v1\.js/);
  assert.match(loader,/official-practice-stability-v1\.js\?v=2\.0\.0-20260908/);
  assert.ok(loader.indexOf('coordinator-school-v1.js')<loader.indexOf('official-practice-stability-v1.js'));
});
