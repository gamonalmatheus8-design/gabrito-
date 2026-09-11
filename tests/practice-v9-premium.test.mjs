import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('camada real de prática carrega o acabamento V9.2.5',()=>{
  const official=fs.readFileSync('js/official-practice-v1.js','utf8');
  const polish=fs.readFileSync('js/practice-v9-premium.js','utf8');
  const css=fs.readFileSync('assets/practice-v9-premium.css','utf8');
  assert.match(official,/practice-v9-premium\.css/);
  assert.match(official,/practice-v9-premium\.js/);
  assert.match(official,/POLISH_VERSION='9\.2\.5'/);
  assert.match(polish,/Treine uma questão por vez/);
  assert.match(polish,/data-gpv9-status/);
  assert.match(css,/data-gpv9-filters="closed"/);
  assert.match(css,/\.pv33-statement/);
});
