import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('hotfix do treino oficial tem sintaxe valida e restaura window.go',()=>{
  const js=read('js/official-practice-stability-v1.js');
  assert.doesNotThrow(()=>new vm.Script(js,{filename:'js/official-practice-stability-v1.js'}));
  assert.match(js,/shim\.__officialQuestionBankBaseGo=directGo/);
  assert.match(js,/window\.go=shim/);
  assert.match(js,/finally\s*\{\s*window\.go=outerGo/);
});

test('loader aplica estabilidade somente depois do wrapper da escola',()=>{
  const loader=read('js/classrooms-v1.js');
  assert.match(loader,/coordinator-school-v1\.js/);
  assert.match(loader,/official-practice-stability-v1\.js/);
  assert.ok(loader.indexOf('coordinator-school-v1.js')<loader.indexOf('official-practice-stability-v1.js'));
});
