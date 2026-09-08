import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const loader=await readFile(new URL('../js/lazy-simulators-v32.js',import.meta.url),'utf8');
const host=await readFile(new URL('../js/official-simulators-host.js',import.meta.url),'utf8');
const sync=await readFile(new URL('../js/enem-direct-sync-v36.js',import.meta.url),'utf8');

test('sincronização direta v36 é carregada somente ao abrir Simulados',()=>{
  assert.match(loader,/loadScript\('js\/enem-direct-sync-v36\.js'\)/);
  assert.match(loader,/version!=='3\.6\.0'/);
  assert.match(loader,/simulatorsSyncRequired=true/);
  assert.doesNotMatch(host,/enem-direct-sync-v3[3456]\.js/);
  assert.match(host,/directExamSyncRequested='lazy-only'/);
});

test('há apenas um leitor oficial no loader',()=>{
  assert.doesNotMatch(loader,/enem-native-integration-v31\.js/);
  assert.doesNotMatch(loader,/enem-document-v32\.js/);
  assert.match(loader,/enem-mobile-v30\.js/);
  assert.match(loader,/simulatorReader='direct-sync-v36'/);
});

test('sincronização cobre ENEM atual e histórico',()=>{
  assert.match(sync,/gplus_enem_official_v27/);
  assert.match(sync,/gplus_enem_history_exam_v28/);
  assert.match(sync,/#v27OfficialRunner/);
  assert.match(sync,/#v28Runner/);
  assert.match(sync,/#v27Sheet \[data-q=/);
  assert.match(sync,/#v28Sheet \[data-v28-q=/);
});

test('sincronização v36 é bidirecional e sem loops contínuos',()=>{
  assert.match(sync,/syncPaperFromQuestion/);
  assert.match(sync,/syncQuestionFromPaper/);
  assert.match(sync,/iframe\.replaceWith\(host\)/);
  assert.match(sync,/oldReader\.replaceWith\(host\)/);
  assert.match(sync,/scheduleEnhance/);
  assert.doesNotMatch(sync,/MutationObserver/);
  assert.doesNotMatch(sync,/setInterval/);
  assert.doesNotMatch(sync,/watchdog/);
});

test('mapeamento do PDF cede tempo para a interface',()=>{
  assert.match(sync,/function yieldUi/);
  assert.match(sync,/if\(pageNumber%2===0\)await yieldUi\(\)/);
  assert.doesNotMatch(sync,/Promise\.all\(Array\.from\(\{length:Math\.min\(4/);
});
