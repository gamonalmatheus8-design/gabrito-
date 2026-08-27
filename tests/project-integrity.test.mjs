import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('arquivos essenciais da release comercial existem',()=>{
  for(const f of [
    'supabase/schema.sql','js/supabase-config.js','js/gabarito-bootstrap.js','js/gabarito-question-source.js',
    'js/gabarito-supabase.js','js/gabarito-admin.js','js/admin-v2.js','js/commercial-v2.js',
    'js/gabarito-state-bridge.js','js/trust-v3.js','assets/trust-v3.css','assets/commercial-v2.css',
    'assets/landing-trust.css','assets/landing-readability.css','privacy.html','terms.html','service-worker.js','vercel.json'
  ]) assert.ok(fs.existsSync(path.join(root,f)),f);
});

test('service role não está no config público',()=>{
  assert.ok(!/service_role/i.test(read('js/supabase-config.js')));
});

test('scripts novos da release possuem sintaxe JavaScript válida',()=>{
  for(const f of ['js/gabarito-bootstrap.js','js/gabarito-question-source.js','js/commercial-v2.js','js/admin-v2.js','js/gabarito-admin.js','js/gabarito-state-bridge.js','js/trust-v3.js','js/landing-clean.js']){
    assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}),f);
  }
});

test('menu Mais continua funcional',()=>{
  const s=read('js/gabarito-ui.js');
  assert.match(s,/aria-expanded/);
  assert.match(s,/nav\.hidden/);
});

test('inicialização protege elemento opcional removido',()=>{
  const s=read('js/app.js');
  assert.doesNotMatch(s,/getElementById\('bankCountText'\)\.textContent/);
  assert.match(s,/const el=document\.getElementById\('bankCountText'\);if\(el\)el\.textContent/);
});

test('helpers adaptativos usados entre camadas estão exportados',()=>{
  const s=read('js/app.js');
  for(const name of ['relevantQuestions','answerLog','activeErrorIds','dueReviews','weakestRows','prepIndex','missionData'])
    assert.match(s,new RegExp('Object\\.assign\\(window,\\{[^}]*'+name));
});

test('atalho legado de questões possui compatibilidade',()=>{
  assert.match(read('js/app.js'),/window\.v40OpenFocusedQuestions/);
});

test('handlers inline principais possuem implementação',()=>{
  const html=read('index.html');
  const js=['app.js','v6-release.js','gabarito-ui.js','gabarito-supabase.js','gabarito-bootstrap.js','commercial-v2.js']
    .map(f=>read('js/'+f)).join('\n');
  const names=[...html.matchAll(/on(?:click|submit|change|input)="\s*([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
  const missing=[...new Set(names)].filter(name=>!new RegExp(`(?:function\\s+${name}\\s*\\(|window\\.${name}\\s*=|window\\[.{0,20}${name})`).test(js));
  assert.deepEqual(missing,[]);
});

test('versões técnicas estão alinhadas em 2.1.0',()=>{
  const pkg=JSON.parse(read('package.json'));
  const boot=read('js/gabarito-bootstrap.js');
  const sw=read('service-worker.js');
  assert.equal(pkg.version,'2.1.0');
  assert.match(boot,/const VERSION='2\.1\.0'/);
  assert.match(sw,/gabarito-mais-2-1-0-app-shell/);
  assert.match(sw,/const V='2\.1\.0'/);
});

test('Supabase usa cache persistente e fallback local',()=>{
  const source=read('js/gabarito-question-source.js');
  const boot=read('js/gabarito-bootstrap.js');
  assert.match(source,/loadDirectCached/);
  assert.match(source,/indexedDB/);
  assert.match(boot,/loadDirectCached/);
  assert.match(boot,/supabase-cache/);
  assert.match(boot,/supabase-primary/);
  assert.match(boot,/await loadLocalBank\(\)/);
});

test('camada de confiança explica recomendação e completa discursivas',()=>{
  const trust=read('js/trust-v3.js');
  const landing=read('landing-clean.html');
  assert.match(trust,/Confiança da recomendação/);
  assert.match(trust,/Ficha de confiança da questão/);
  assert.match(trust,/Salvar resposta/);
  assert.match(trust,/autoavaliação por critérios/i);
  assert.match(landing,/Metodologia transparente/);
  assert.match(landing,/Sincronização ao entrar na conta/);
});

test('V2 comercial contém diagnóstico, reporte e telemetria mínima',()=>{
  const s=read('js/commercial-v2.js');
  assert.match(s,/diagnostic_started/);
  assert.match(s,/diagnostic_completed/);
  assert.match(s,/question_reported/);
  assert.match(s,/question_reports/);
  assert.match(s,/product_events/);
  assert.doesNotMatch(s,/password/i);
});

test('painel editorial V2 expõe funil e fila de relatos',()=>{
  const html=read('admin.html');
  const js=read('js/admin-v2.js');
  assert.match(html,/id="v2ProductFunnel"/);
  assert.match(html,/id="v2Reports"/);
  assert.match(js,/diagnostic_completed/);
  assert.match(js,/question_reports/);
  assert.match(js,/app_version/);
});

test('documentos legais deixam claro caráter independente e tratamento de dados',()=>{
  const privacy=read('privacy.html');
  const terms=read('terms.html');
  assert.match(privacy,/Métricas de produto/);
  assert.match(privacy,/Relato de problemas em questões/);
  assert.match(terms,/não é um serviço oficial/i);
  assert.match(terms,/não garante aprovação/i);
});

test('cronômetro persistente e gráfico de evolução seguem integrados',()=>{
  const html=read('index.html');
  const js=read('js/app.js');
  assert.match(html,/id="timerDisplay" role="timer"/);
  assert.match(html,/id="evolutionChart" role="img"/);
  assert.match(html,/data-evolution-range="90"/);
  assert.match(js,/study_focus_timer_gabarito/);
  assert.match(js,/window\.finishFocusSession/);
  assert.match(js,/function renderEvolution/);
  assert.match(js,/study_answer_log_v25/);
});
