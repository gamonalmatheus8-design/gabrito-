import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const loader=await readFile(new URL('../js/lazy-simulators-v32.js',import.meta.url),'utf8');
const host=await readFile(new URL('../js/official-simulators-host.js',import.meta.url),'utf8');
const enem=await readFile(new URL('../js/enem-direct-sync-v36.js',import.meta.url),'utf8');
const pism=await readFile(new URL('../js/pism-direct-sync-v37.js',import.meta.url),'utf8');

test('sincronizadores oficiais são carregados somente ao abrir Simulados',()=>{
  assert.match(loader,/loadScript\('js\/enem-direct-sync-v36\.js'\)/);
  assert.match(loader,/loadScript\('js\/pism-direct-sync-v37\.js'\)/);
  assert.match(loader,/GABARITO_ENEM_DIRECT_SYNC\?\.version!=='3\.6\.0'/);
  assert.match(loader,/GABARITO_PISM_DIRECT_SYNC\?\.version!=='3\.7\.0'/);
  assert.match(loader,/simulatorsSyncRequired=true/);
  assert.doesNotMatch(host,/enem-direct-sync-v3[3456]\.js/);
  assert.doesNotMatch(host,/pism-direct-sync-v37\.js/);
  assert.match(host,/directExamSyncRequested='lazy-only'/);
});

test('ENEM não volta aos leitores concorrentes antigos',()=>{
  assert.doesNotMatch(loader,/enem-native-integration-v31\.js/);
  assert.doesNotMatch(loader,/enem-document-v32\.js/);
  assert.match(loader,/enem-mobile-v30\.js/);
  assert.match(loader,/enemSimulatorReader='direct-sync-v36'/);
});

test('sincronização ENEM cobre prova atual e histórica',()=>{
  assert.match(enem,/gplus_enem_official_v27/);assert.match(enem,/gplus_enem_history_exam_v28/);
  assert.match(enem,/#v27OfficialRunner/);assert.match(enem,/#v28Runner/);
  assert.match(enem,/#v27Sheet \[data-q=/);assert.match(enem,/#v28Sheet \[data-v28-q=/);
});

test('sincronização ENEM é bidirecional e sem loops contínuos',()=>{
  assert.match(enem,/syncPaperFromQuestion/);assert.match(enem,/syncQuestionFromPaper/);assert.match(enem,/iframe\.replaceWith\(host\)/);assert.match(enem,/scheduleEnhance/);
  assert.doesNotMatch(enem,/MutationObserver/);assert.doesNotMatch(enem,/setInterval/);assert.doesNotMatch(enem,/watchdog/);
});

test('PISM sincroniza caderno oficial com cartão e usa proxy UFJF',()=>{
  assert.match(pism,/gplus_pism_official_session_v29/);
  assert.match(pism,/#v29PismOfficialRunner/);
  assert.match(pism,/#v29Sheet \[data-v29-q=/);
  assert.match(pism,/\/api\/pism-pdf\?url=/);
  assert.match(pism,/iframe\.replaceWith\(host\)/);
  assert.match(pism,/GABARITO_PISM_DIRECT_SYNC/);
  assert.doesNotMatch(pism,/MutationObserver/);
  assert.doesNotMatch(pism,/setInterval/);
});

test('mapeamento dos PDFs cede tempo para a interface',()=>{
  assert.match(enem,/function yieldUi/);assert.match(enem,/if\(pageNumber%2===0\)await yieldUi\(\)/);
  assert.match(pism,/function yieldUi/);assert.match(pism,/if\(p%2===0\)await yieldUi\(\)/);
});
