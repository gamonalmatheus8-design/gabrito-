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
 assert.match(js,/const VERSION='3\.0\.1'/);
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
 assert.match(js,/'#v27Sheet'/);
 assert.match(js,/\[data-letter=/);
 assert.match(js,/v30-quick-letters/);
 assert.match(js,/v30-letter/);
 assert.match(css,/:is\(\.v27-workspace>\.v27-sheet,\.v28-workspace>\.v28-sheet\)\{display:none!important\}/);
 assert.match(css,/\.v30-quick-row/);
 assert.match(css,/:is\(\.v27-paper,\.v28-paper\) iframe\{height:calc\(100dvh - 290px\)/);
});

test('biblioteca histórica 2016–2024 também ativa a experiência mobile 3.0',()=>{
 const js=read('js/enem-mobile-v30.js'),css=read('assets/enem-mobile-v30.css');
 assert.match(js,/gplus_enem_history_exam_v28/);
 assert.match(js,/#v28Runner/);
 assert.match(js,/data-v28-letter/);
 assert.match(js,/data-v28-q/);
 assert.match(js,/data-v28-exit/);
 assert.match(js,/data-v28-finish/);
 assert.match(css,/\.v28-workspace>\.v28-sheet/);
 assert.match(css,/\.v28-paper/);
});

test('entrada pública e PWA usam cache-busting da release 3.0.1',()=>{
 const html=read('index.html'),boot=read('js/gabarito-bootstrap.js'),sw=read('service-worker.js'),release=read('js/v6-release.js'),vercel=read('vercel.json');
 assert.match(html,/gabarito-bootstrap\.js\?v=3\.0\.1&r=20260901h/);
 assert.match(boot,/const VERSION='3\.0\.1'/);
 assert.match(boot,/const RECOVERY='20260901h'/);
 assert.match(sw,/gabarito-mais-3-0-1-app-shell/);
 assert.match(sw,/const V='3\.0\.1'/);
 assert.match(release,/service-worker\.js\?v=\$\{SW_VERSION\}&r=\$\{SW_RECOVERY\}/);
 assert.match(vercel,/private, no-store, max-age=0, must-revalidate/);
});

test('cartão mobile mantém 45 questões por área e ações essenciais',()=>{
 const js=read('js/enem-mobile-v30.js');
 assert.match(js,/const start=absoluteStart\+\(range\?45:0\),end=start\+44/);
 for(const action of ['data-v30-mark','data-v30-essay','data-v30-exit','data-v30-finish'])assert.match(js,new RegExp(action));
 assert.match(js,/90-answered/);
 assert.match(js,/markedCount/);
});

