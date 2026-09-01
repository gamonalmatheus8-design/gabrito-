import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('camada premium 2.6 existe e possui sintaxe válida',()=>{
 for(const file of ['js/premium-v26.js','assets/premium-v26.css'])assert.ok(fs.existsSync(path.join(root,file)),file);
 assert.doesNotThrow(()=>new vm.Script(read('js/premium-v26.js'),{filename:'js/premium-v26.js'}));
});

test('2.6 protege prova ativa, melhora acessibilidade e cria plano pós-prova',()=>{
 const js=read('js/premium-v26.js');
 assert.match(js,/const VERSION='2\.6\.0'/);
 assert.match(js,/beforeunload/);
 assert.match(js,/gplus_enem_exam_v24/);
 assert.match(js,/gplus_pism_exam_v25/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/Plano pós-ENEM/);
 assert.match(js,/Plano pós-PISM/);
 assert.match(js,/Treinar ponto mais fraco/);
 assert.match(js,/Salvo neste dispositivo/);
 assert.match(js,/data-start-day/);
 assert.match(js,/setTimeout\(enhance,180\)/);
});

test('acabamento premium cobre mobile, foco visível e movimento reduzido',()=>{
 const css=read('assets/premium-v26.css');
 assert.match(css,/focus-visible/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/v26-exam-focus/);
 assert.match(css,/position:sticky;bottom:0/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/v26-post-plan/);
});

test('release atual preserva a camada premium 2.6',()=>{
 const boot=read('js/gabarito-bootstrap.js'),pkg=JSON.parse(read('package.json')),sw=read('service-worker.js');
 assert.equal(pkg.version,'3.0.1');
 assert.match(boot,/const VERSION='3\.0\.1'/);
 assert.match(boot,/assets\/premium-v26\.css/);
 assert.match(boot,/js\/premium-v26\.js/);
 assert.match(sw,/gabarito-mais-3-0-1-app-shell/);
 assert.match(sw,/const V='3\.0\.1'/);
});

