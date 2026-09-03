import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const classrooms = await readFile(new URL('../js/classrooms-v1.js', import.meta.url), 'utf8');
const commercial = await readFile(new URL('../js/commercial-v2.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../assets/classrooms-v1.css', import.meta.url), 'utf8');

test('area de turmas e carregada pela camada comercial', () => {
  assert.match(commercial, /classrooms-v1\.js/);
  assert.match(commercial, /classrooms-v1\.css/);
  assert.match(commercial, /loadClassrooms\(\)/);
});

test('fluxo do aluno usa RPCs de correcao segura no servidor', () => {
  for (const rpc of ['start_assignment','get_assignment_questions','submit_assignment_answer','finish_assignment','get_assignment_review']) {
    assert.match(classrooms, new RegExp(`rpc\\(['\"]${rpc}['\"]`));
  }
  assert.doesNotMatch(classrooms, /from\(['\"]assignment_answers['\"]\)\.insert/);
  assert.doesNotMatch(classrooms, /from\(['\"]assignment_submissions['\"]\)\.insert/);
});

test('professor cria atividade pelo fluxo transacional do banco', () => {
  assert.match(classrooms, /create_assignment_from_filters/);
  assert.match(classrooms, /from\(['\"]classrooms['\"]\)\.insert/);
  assert.match(classrooms, /data-copy-code/);
  assert.match(classrooms, /assignment_submissions/);
});

test('interface possui navegacao, modo professor, modo aluno e adaptacao mobile', () => {
  assert.match(classrooms, /id='page-classrooms'|id="page-classrooms"|page-classrooms/);
  assert.match(classrooms, /Professor/);
  assert.match(classrooms, /Aluno/);
  assert.match(classrooms, /join-classroom/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /gplus-assignment-modal/);
});
