import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fast=fs.readFileSync(path.join(root,'js/practice-fast-render-v32.js'),'utf8');
const compat=fs.readFileSync(path.join(root,'js/official-practice-v1.js'),'utf8');

test('renderizador rápido tem sintaxe válida e é carregado pela prática oficial',()=>{
  assert.doesNotThrow(()=>new vm.Script(fast,{filename:'js/practice-fast-render-v32.js'}));
  assert.match(fast,/const VERSION='3\.2\.0'/);
  assert.match(compat,/practice-fast-render-v32\.js\?v=\$\{FAST_RENDER_VERSION\}/);
  assert.match(compat,/FAST_RENDER_VERSION='3\.2\.0-20260909'/);
});

test('localizador rápido prioriza página conhecida e evita varrer a prova inteira',()=>{
  assert.match(fast,/source_page_number/);
  assert.match(fast,/const check=async p/);
  assert.match(fast,/estimate=Math\.max/);
  assert.match(fast,/for\(let r=0;r<=9;r\+\+\)/);
  assert.match(fast,/pageHeads:new Map\(\)/);
  assert.match(fast,/located:new Map\(\)/);
});

test('PDF oficial usa streaming progressivo e mantém fallback seguro',()=>{
  assert.match(fast,/disableRange:true,disableStream:false,disableAutoFetch:true/);
  assert.match(fast,/Não foi possível abrir o recorte agora/);
  assert.match(fast,/Abrir fonte oficial/);
  assert.match(fast,/\/api\/enem-pdf\?url=/);
  assert.match(fast,/\/api\/pism-pdf\?url=/);
});

test('experiência não fica com grande área vazia durante carregamento',()=>{
  assert.match(fast,/min-height:180px/);
  assert.match(fast,/pv32-spinner/);
  assert.match(fast,/Localizando a página certa sem varrer a prova inteira/);
});
