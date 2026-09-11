import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('V9.2.4 carrega o workspace de Questões diretamente pelo bootstrap', async () => {
  const bootstrap = await readFile(new URL('../js/gabarito-bootstrap.js', import.meta.url), 'utf8');
  const sw = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');

  assert.match(bootstrap, /const VERSION='9\.2\.4'/);
  assert.match(bootstrap, /loadQuestionsWorkspace/);
  assert.match(bootstrap, /assets\/v9-questions-premium\.css/);
  assert.match(bootstrap, /js\/v9-questions-premium\.js/);
  assert.match(bootstrap, /questionsWorkspaceMs/);
  assert.match(sw, /const V='9\.2\.4'/);
});
