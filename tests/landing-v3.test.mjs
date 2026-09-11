import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'landing-clean.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/landing-clean.css'),'utf8');
const js=fs.readFileSync(path.join(root,'js/landing-clean.js'),'utf8');
const vercel=fs.readFileSync(path.join(root,'vercel.json'),'utf8');

test('landing v3 é a página pública servida na raiz',()=>{
  assert.match(vercel,/"src": "\^\/\$"/);
  assert.match(vercel,/"dest": "\/landing-clean\.html"/);
  assert.match(html,/landing-clean\.css\?v=3\.1\.0/);
  assert.match(html,/landing-clean\.js\?v=3\.0\.1/);
});

test('landing v3 preserva direção minimalista e estrutura comercial curta',()=>{
  for(const token of ['Estude o que mais importa','Demonstração','Três coisas que precisam funcionar muito bem','ENEM e PISM não deveriam parecer a mesma preparação','Pare de decidir o que estudar'])assert.match(html,new RegExp(token));
  assert.doesNotMatch(html,/questões autorais/i);
  assert.doesNotMatch(html,/FAQ/);
});

test('landing usa identidade areia, verde petróleo e cobre sem roxo SaaS',()=>{
  assert.match(css,/--bg:#efe9df/);
  assert.match(css,/--accent:#1f5d4a/);
  assert.match(css,/--copper:#a95f3c/);
  assert.match(css,/--dark:#173f34/);
  for(const legacy of ['#5b55e7','#6962ed','#4f49d2','#5650cc','#a9a6ff'])assert.doesNotMatch(css,new RegExp(legacy,'i'));
  assert.match(html,/theme-color" content="#efe9df"/);
});

test('contador usa somente o Banco de Treino validado',()=>{
  assert.match(js,/practice_questions/);
  assert.match(js,/status','eq\.published/);
  assert.doesNotMatch(js,/rest\/v1\/questions\?/);
  assert.doesNotMatch(js,/editorial_status/);
});

test('interações ENEM e PISM permanecem funcionais e acessíveis',()=>{
  assert.match(html,/data-preview-exam="enem"/);
  assert.match(html,/data-preview-exam="pism"/);
  assert.match(html,/data-route="enem"/);
  assert.match(html,/data-route="pism"/);
  assert.match(js,/setAttribute\('aria-pressed'/);
  assert.match(js,/landing_demo_exam/);
  assert.match(js,/landing_route_view/);
});

test('landing mantém transparência editorial e sincronização honesta',()=>{
  assert.match(html,/id="metodologia"/);
  assert.match(html,/id="editorial"/);
  assert.match(html,/Ao entrar, a sincronização entre dispositivos fica disponível/i);
  assert.match(html,/Depoimentos só entram com evidência verificável/i);
});

test('javascript da landing v3 tem sintaxe válida',()=>{
  assert.doesNotThrow(()=>new vm.Script(js,{filename:'js/landing-clean.js'}));
  assert.match(js,/const VERSION='3\.0\.1'/);
});

test('css da landing tem responsividade e redução de movimento',()=>{
  assert.match(css,/@media \(max-width:680px\)/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.live-demo/);
  assert.match(css,/\.benefit-grid/);
  assert.match(css,/\.transparency-card/);
});
