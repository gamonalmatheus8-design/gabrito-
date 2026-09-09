import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sync=read('js/practice-bookmark-sync-v31.js');
const compat=read('js/official-practice-v1.js');

test('sincronizador de favoritas tem sintaxe válida e é carregado pela prática V3',()=>{
  assert.doesNotThrow(()=>new vm.Script(sync,{filename:'js/practice-bookmark-sync-v31.js'}));
  assert.match(sync,/const VERSION='3\.1\.1'/);
  assert.match(compat,/practice-bookmark-sync-v31\.js\?v=\$\{BOOKMARK_SYNC_VERSION\}/);
  assert.match(compat,/BOOKMARK_SYNC_VERSION='3\.1\.1-20260909'/);
});

test('favoritos são local-first e sincronizam somente os dados do usuário autenticado',()=>{
  assert.match(sync,/gplus_practice_v3_bookmarks/);
  assert.match(sync,/gplus_practice_v3_bookmark_ops/);
  assert.match(sync,/c\.from\('practice_bookmarks'\)/);
  assert.match(sync,/\.eq\('user_id',user\.id\)/);
  assert.match(sync,/\.upsert\(/);
  assert.match(sync,/\.delete\(\)\.eq\('user_id',user\.id\)/);
  assert.match(sync,/onConflict:'user_id,question_id'/);
  assert.match(sync,/markPending/);
  assert.match(sync,/clearPending/);
  assert.match(sync,/local-fallback/);
});

test('favoritos em nuvem são paginados e não ficam limitados aos primeiros 1000',()=>{
  assert.match(sync,/const CLOUD_PAGE_SIZE=500/);
  assert.match(sync,/async function readCloud/);
  assert.match(sync,/\.range\(from,from\+CLOUD_PAGE_SIZE-1\)/);
  assert.match(sync,/if\(page\.length<CLOUD_PAGE_SIZE\)break/);
  assert.doesNotMatch(sync,/\.order\('created_at',\{ascending:false\}\)\.limit\(1000\)/);
});

test('sincronização não interfere na rota e não usa loops contínuos',()=>{
  assert.doesNotMatch(sync,/window\.go\s*=/);
  assert.doesNotMatch(sync,/MutationObserver/);
  assert.doesNotMatch(sync,/setInterval\s*\(/);
  assert.match(sync,/window\.addEventListener\('focus'/);
  assert.match(sync,/queueMicrotask/);
});
