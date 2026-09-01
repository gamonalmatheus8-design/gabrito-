import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('camada ENEM mobile 3.0 existe, tem sintaxe válida e é carregada pelo boot',()=>{
 const js=read('js/enem-mobile-v30.js'),css=read('assets/enem-mobile-v30.css'),boot=read('js/gabarito-bootstrap.js');
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'js/enem-mobile-v30.js'}));
 assert.match(js,/const VERSION='3\.0\.0'/);
 assert.match(boot,/assets\/enem-mobile-v30\.css/);
 assert.match(boot,/js\/enem-mobile-v30\.js/);
 assert.match(css,/@media\(max-width:900px\)/);
});

test('mobile integra prova autoral e cartão-resposta sem duplicar estado',()=>{
 const js=read('js/enem-mobile-v30.js'),css=read('assets/enem-mobile-v30.css');
 assert.match(js,/gplus_enem_exam_v24/);
 assert.match(js,/v24EnemRunner \.v24-sheet \[data-jump/);
 assert.match(js,/\[data-mark\]/);
 assert.match(js,/v30-card-status/);
 assert.match(js,/v30-question-grid/);
 assert.match(css,/\.v24-exam-body>\.v24-sheet\{display:none!important\}/);
 assert.match(css,/\.v24-exam-body \.v24-exam-controls\{display:none!important\}/);
 assert.match(css,/\.v30-dock\{position:fixed/);
});

test('prova oficial mantém PDF visível e marca A–E no mesmo fluxo mobile',()=>{
 const js=read('js/enem-mobile-v30.js'),css=read('assets/enem-mobile-v30.css');
 assert.match(js,/gplus_enem_official_v27/);
 assert.match(js,/v27Sheet \[data-letter=/);
 assert.match(js,/v30-quick-letters/);
 assert.match(js,/v30-letter/);
 assert.match(css,/\.v27-workspace>\.v27-sheet\{display:none!important\}/);
 assert.match(css,/\.v30-quick-row/);
 assert.match(css,/\.v27-paper iframe\{height:calc\(100dvh - 290px\)/);
});

test('cartão mobile mantém 45 questões por área e ações essenciais',()=>{
 const js=read('js/enem-mobile-v30.js');
 assert.match(js,/const start=absoluteStart\+\(range\?45:0\),end=start\+44/);
 for(const action of ['data-v30-mark','data-v30-essay','data-v30-exit','data-v30-finish'])assert.match(js,new RegExp(action));
 assert.match(js,/90-answered/);
 assert.match(js,/markedCount/);
});
