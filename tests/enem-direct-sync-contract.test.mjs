import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const loader=await readFile(new URL('../js/lazy-simulators-v32.js',import.meta.url),'utf8');
const host=await readFile(new URL('../js/official-simulators-host.js',import.meta.url),'utf8');
const sync=await readFile(new URL('../js/enem-direct-sync-v35.js',import.meta.url),'utf8');

test('sincronização direta v35 é obrigatória no núcleo dos simulados',()=>{
  assert.match(loader,/loadStyle\('assets\/enem-document-v32\.css'\)/);
  assert.match(loader,/enem-direct-sync-v35\.js/);
  assert.match(loader,/Sincronização obrigatória do caderno ENEM não carregou/);
  assert.match(loader,/simulatorsSyncRequired=true/);
  assert.match(host,/enem-direct-sync-v35\.js/);
});

test('sincronização cobre ENEM atual e histórico',()=>{
  assert.match(sync,/gplus_enem_official_v27/);
  assert.match(sync,/gplus_enem_history_exam_v28/);
  assert.match(sync,/#v27OfficialRunner/);
  assert.match(sync,/#v28Runner/);
  assert.match(sync,/#v27Sheet \[data-q=/);
  assert.match(sync,/#v28Sheet \[data-v28-q=/);
});

test('sincronização é bidirecional, autocorretiva e bloqueia viewer antigo',()=>{
  assert.match(sync,/syncPaperFromQuestion/);
  assert.match(sync,/syncQuestionFromPaper/);
  assert.match(sync,/oldReader\.replaceWith\(host\)/);
  assert.match(sync,/iframe\.replaceWith\(host\)/);
  assert.match(sync,/visibility:hidden!important/);
  assert.match(sync,/setInterval\(\(\)=>\{if\(anyActive\(\)\)schedule\(\)\},500\)/);
  assert.match(sync,/data-direct-sync-version/);
});
