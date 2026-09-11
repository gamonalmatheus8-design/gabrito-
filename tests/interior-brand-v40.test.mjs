import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const css=fs.readFileSync(path.join(root,'assets/interior-brand-v40.css'),'utf8');
const boot=fs.readFileSync(path.join(root,'js/gabarito-bootstrap.js'),'utf8');

test('interior usa a mesma assinatura cromática da landing',()=>{
  for(const token of ['--bg:#efe9df','--surface:#faf7f1','--text:#17231e','--primary:#1f5d4a','--pism:#a95f3c','--copper:#a95f3c'])assert.match(css,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(css,/#4f46e5|#7c3aed|#8b83ff|#9b96ff/i);
});

test('identidade cobre todas as superfícies principais do produto',()=>{
  for(const token of ['.app-top','.sidebar','.nav-btn','.v39-hero','.btn-primary','.field','.pv3-hero','.pv33-option','.v37-onboarding-shell','.v24-paper','.v25p-paper'])assert.ok(css.includes(token),`faltou ${token}`);
});

test('modo escuro mantém petróleo e cobre sem voltar ao roxo',()=>{
  assert.match(css,/body\.dark\{/);
  assert.match(css,/--bg:#0f1d18/);
  assert.match(css,/--primary:#79b59e/);
  assert.match(css,/--pism:#df9875/);
});

test('bootstrap carrega e promove a identidade v4 depois das camadas antigas',()=>{
  assert.match(boot,/RECOVERY='20260909-practice-v3'/);
  assert.match(boot,/assets\/interior-brand-v40\.css/);
  assert.match(boot,/sand-petrol-copper-v4/);
  assert.match(boot,/finally\{try\{await loadBrandLayer\(\)\}/);
  assert.match(boot,/loadNonCriticalLayers[\s\S]*await loadBrandLayer\(\)/);
  assert.doesNotThrow(()=>new vm.Script(boot,{filename:'js/gabarito-bootstrap.js'}));
});
