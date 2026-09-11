import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('V9.2.3 carrega a experiência premium de Questões', async () => {
  const [ui, js, css, index] = await Promise.all([
    read('js/gabarito-ui.js'),
    read('js/v9-questions-premium.js'),
    read('assets/v9-questions-premium.css'),
    read('index.html')
  ]);
  assert.match(ui, /v9-questions-premium\.js/);
  assert.match(ui, /v9-questions-premium\.css/);
  assert.match(js, /GabaritoV923Questions/);
  assert.match(js, /Filtros avançados/);
  assert.match(js, /UNSEEN/);
  assert.match(js, /WRONG/);
  assert.match(css, /v923-question-header/);
  assert.match(css, /@media\(max-width:720px\)/);
  for (const id of ['page-questions','questionCard','qStatus','qSearch','qFiltered','qAccuracy']) {
    assert.match(index, new RegExp(`id=["']${id}["']`));
  }
});
