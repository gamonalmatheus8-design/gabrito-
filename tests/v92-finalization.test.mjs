import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('V9.2 carrega QA final antes das camadas de acabamento/estabilidade e mantém IA congelada',async()=>{
  const ui=await read('js/gabarito-ui.js');
  assert.match(ui,/v9-final-qa\.js/);
  assert.match(ui,/loadFinalQa\(\(\)=>\{loadProductLayer\(\);loadStabilityLayer\(\)\}\)/);
  assert.doesNotMatch(ui,/v9-coach-ai\.js/);
});

test('QA final protege estado móvel, rotas e filtros de simulados',async()=>{
  const qa=await read('js/v9-final-qa.js');
  assert.match(qa,/pagehide/);
  assert.match(qa,/visibilitychange/);
  assert.match(qa,/repairRoute/);
  assert.match(qa,/syncMockSubjects/);
  assert.match(qa,/gplus_v92_mock_resume/);
  assert.match(qa,/gplus_v92_essay_state/);
});

test('app mantém todas as áreas críticas da experiência final',async()=>{
  const html=await read('index.html');
  for(const id of ['page-home','page-questions','page-reviews','page-plan','page-mocks','page-essay','questionCard','reviewQueueList','weeklyPlan','mockConfig','essayText']){
    assert.match(html,new RegExp(`id=["']${id}["']`),`faltando ${id}`);
  }
});

test('service worker está na mesma release final',async()=>{
  const sw=await read('service-worker.js');
  assert.match(sw,/const V='9\.2\.2'/);
  assert.match(sw,/v9-2-2/);
});
