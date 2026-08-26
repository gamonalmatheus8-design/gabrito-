import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('arquivos Supabase essenciais existem',()=>{for(const f of ['supabase/schema.sql','js/supabase-config.js','js/gabarito-bootstrap.js','js/gabarito-supabase.js','js/gabarito-admin.js'])assert.ok(fs.existsSync(path.join(root,f)),f)});
test('service role não está no config público',()=>{const s=fs.readFileSync(path.join(root,'js/supabase-config.js'),'utf8');assert.ok(!/service_role/i.test(s))});
test('menu Mais continua funcional',()=>{const s=fs.readFileSync(path.join(root,'js/gabarito-ui.js'),'utf8');assert.match(s,/aria-expanded/);assert.match(s,/nav\.hidden/)});


test('Gabarito+ 1.1 evita crash de inicialização por elemento removido',()=>{
  const s=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.doesNotMatch(s,/getElementById\('bankCountText'\)\.textContent/);
  assert.match(s,/const el=document\.getElementById\('bankCountText'\);if\(el\)el\.textContent/);
});

test('helpers adaptativos usados entre camadas estão exportados',()=>{
  const s=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  for(const name of ['relevantQuestions','answerLog','activeErrorIds','dueReviews','weakestRows','prepIndex','missionData']) assert.match(s,new RegExp('Object\\.assign\\(window,\\{[^}]*'+name));
});

test('atalho legado de questões possui compatibilidade',()=>{
  const s=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.match(s,/window\.v40OpenFocusedQuestions/);
});

test('todos os handlers inline principais possuem implementação',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=['app.js','v6-release.js','gabarito-ui.js','gabarito-supabase.js','gabarito-bootstrap.js'].map(f=>fs.readFileSync(path.join(root,'js',f),'utf8')).join('\n');
  const names=[...html.matchAll(/on(?:click|submit|change|input)="\s*([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
  const missing=[...new Set(names)].filter(name=>!new RegExp(`(?:function\\s+${name}\\s*\\(|window\\.${name}\\s*=|window\\[.{0,20}${name})`).test(js));
  assert.deepEqual(missing,[]);
});

test('assets Gabarito+ 1.1 são versionados contra cache PWA antigo',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const boot=fs.readFileSync(path.join(root,'js/gabarito-bootstrap.js'),'utf8');
  const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  assert.match(html,/styles\.css\?v=1\.1\.0/);
  assert.match(html,/gabarito-bootstrap\.js\?v=1\.1\.0/);
  assert.match(boot,/const VERSION='1\.1\.0'/);
  assert.match(sw,/gabarito-mais-1-1-0-shell-1/);
});

test('Supabase é a fonte principal e o banco local é somente fallback',()=>{
  const boot=fs.readFileSync(path.join(root,'js/gabarito-bootstrap.js'),'utf8');
  assert.match(boot,/GabaritoQuestionSource\.load/);
  assert.match(boot,/bankSource='supabase-primary'/);
  assert.match(boot,/catch\(e\)[\s\S]*await loadLocalBank\(\)/);
});

test('cronômetro persistente e gráfico de evolução estão integrados',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert.match(html,/id="timerDisplay" role="timer"/);
  assert.match(html,/id="evolutionChart" role="img"/);
  assert.match(html,/data-evolution-range="90"/);
  assert.match(js,/study_focus_timer_gabarito/);
  assert.match(js,/window\.finishFocusSession/);
  assert.match(js,/function renderEvolution/);
  assert.match(js,/study_answer_log_v25/);
});
