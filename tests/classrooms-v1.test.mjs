import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loader = await readFile(new URL('../js/classrooms-v1.js', import.meta.url), 'utf8');
const classrooms = await readFile(new URL('../js/classrooms-core-v1.js', import.meta.url), 'utf8');
const studentMode = await readFile(new URL('../js/student-classroom-mode-v1.js', import.meta.url), 'utf8');
const studentJoin = await readFile(new URL('../js/student-join-rpc-v1.js', import.meta.url), 'utf8');
const attachments = await readFile(new URL('../js/assignment-attachments-v1.js', import.meta.url), 'utf8');
const teacherSubmissions = await readFile(new URL('../js/teacher-submissions-v1.js', import.meta.url), 'utf8');
const commercial = await readFile(new URL('../js/commercial-v2.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../assets/classrooms-v1.css', import.meta.url), 'utf8');
const attachmentCss = await readFile(new URL('../assets/assignment-attachments-v1.css', import.meta.url), 'utf8');

test('area de turmas e carregada pela camada comercial', () => {
  assert.match(commercial, /classrooms-v1\.js/);
  assert.match(commercial, /classrooms-v1\.css/);
  assert.match(commercial, /loadClassrooms\(\)/);
  assert.match(loader, /classrooms-core-v1\.js/);
  assert.match(loader, /student-classroom-mode-v1\.js/);
  assert.match(loader, /student-join-rpc-v1\.js/);
  assert.match(loader, /assignment-attachments-v1\.js/);
  assert.match(loader, /teacher-submissions-v1\.js/);
});

test('aluno entra na turma pelo codigo usando rpc autenticada', () => {
  assert.match(classrooms, /gplusJoinForm/);
  assert.match(classrooms, /gplusJoinCode/);
  assert.match(studentJoin, /join_classroom_by_code/);
  assert.match(studentJoin, /client\.auth\.getUser/);
  assert.match(studentJoin, /stopImmediatePropagation/);
  assert.match(studentJoin, /GabaritoClassrooms\?\.refresh/);
  assert.match(studentMode, /get_my_account_role/);
  assert.match(studentMode, /Entrar em uma turma/);
  assert.match(studentMode, /Código enviado pelo professor/);
  assert.match(studentMode, /stacks\[1\]\.hidden=true/);
});

test('fluxo do aluno usa RPCs de correcao segura no servidor', () => {
  for (const rpc of ['start_assignment','get_assignment_questions','submit_assignment_answer','finish_assignment','get_assignment_review']) assert.match(classrooms, new RegExp(`rpc\\(['\"]${rpc}['\"]`));
  assert.doesNotMatch(classrooms, /from\(['\"]assignment_answers['\"]\)\.insert/);
  assert.doesNotMatch(classrooms, /from\(['\"]assignment_submissions['\"]\)\.insert/);
});

test('professor cria atividade pelo fluxo transacional do banco', () => {
  assert.match(classrooms, /create_assignment_from_filters/);
  assert.match(classrooms, /from\(['\"]classrooms['\"]\)\.insert/);
  assert.match(classrooms, /data-copy-code/);
  assert.match(classrooms, /assignment_submissions/);
});

test('professor visualiza entregas e respostas dos alunos', () => {
  assert.match(teacherSubmissions, /Ver entregas/);
  assert.match(teacherSubmissions, /assignment_submissions/);
  assert.match(teacherSubmissions, /classroom_members/);
  assert.match(teacherSubmissions, /get_teacher_submission_review/);
  assert.match(teacherSubmissions, /Ver respostas/);
  assert.match(teacherSubmissions, /Média da turma/);
  assert.match(teacherSubmissions, /Ainda não entregou/);
});

test('interface possui navegacao, modo professor, modo aluno e adaptacao mobile', () => {
  assert.match(classrooms, /page-classrooms/);
  assert.match(classrooms, /Professor/);
  assert.match(classrooms, /Aluno/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /gplus-assignment-modal/);
});

test('anexos usam storage privado e metadados da atividade', () => {
  assert.match(attachments, /assignment-attachments/);
  assert.match(attachments, /assignment_attachments/);
  assert.match(attachments, /\.upload\(/);
  assert.match(attachments, /\.download\(/);
  assert.match(attachments, /MAX_FILE_BYTES=10\*1024\*1024/);
  assert.match(attachments, /data-gplus-attachment-upload/);
  assert.match(attachments, /data-gplus-attachment-download/);
  assert.match(attachmentCss, /gplus-attachment-item/);
});
