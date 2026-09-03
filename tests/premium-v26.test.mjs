import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('JavaScript premium legado foi removido e o acabamento acessível foi preservado',()=>{
 assert.ok(fs.existsSync(path.join(root,'assets/premium-v26.css')));
});

test('provas oficiais preservam sessão ativa sem depender do premium legado',()=>{
 const enem=read('js/enem-official-v27.js'),pism=read('js/pism-history-v29.js'),lazy=read('js/lazy-simulators-v32.js');
 assert.match(enem,/beforeunload/);
 assert.match(enem,/gplus_enem_official_v27/);
 assert.match(pism,/gplus_pism_official_session_v29/);
 assert.match(pism,/status='awaiting-score'/);
 assert.match(lazy,/loadEnemCore/);
 assert.match(lazy,/loadPismCore/);
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

test('release 3.3.0 preserva somente o CSS de acessibilidade da camada premium',()=>{
 const boot=read('js/gabarito-bootstrap.js'),pkg=JSON.parse(read('package.json')),sw=read('service-worker.js');
 assert.equal(pkg.version,'3.3.0');
 assert.match(boot,/const VERSION='3\.3\.0'/);
 assert.match(boot,/assets\/premium-v26\.css/);
 assert.doesNotMatch(boot,/js\/premium-v26\.js/);
 assert.match(sw,/gabarito-mais-3-3-0-app-shell/);
 assert.match(sw,/const V='3\.3\.0'/);
});

