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
    'js/gabarito-supabase.js','js/gabarito-admin.js','js/admin-v2.js','js/commercial-v2.js','js/quality-v22.js',
    'js/enem-simulator-v24.js','assets/enem-simulator-v24.css','js/pism-simulator-v25.js','assets/pism-simulator-v25.css','data/pism-discursives-v25.js',
    'assets/commercial-v2.css','assets/quality-v22.css','data/editorial-exclusions.js','privacy.html','terms.html','service-worker.js','vercel.json'
  ]) assert.ok(fs.existsSync(path.join(root,f)),f);
});

test('service role não está no config público',()=>{assert.ok(!/service_role/i.test(read('js/supabase-config.js')))});

test('scripts críticos possuem sintaxe JavaScript válida',()=>{for(const f of ['js/gabarito-bootstrap.js','js/gabarito-question-source.js','js/commercial-v2.js','js/admin-v2.js','js/gabarito-admin.js','js/quality-v22.js','js/landing-clean.js','js/enem-simulator-v24.js','js/pism-simulator-v25.js','data/pism-discursives-v25.js','data/editorial-exclusions.js'])assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}),f)});

test('menu Mais continua funcional',()=>{const s=read('js/gabarito-ui.js');assert.match(s,/aria-expanded/);assert.match(s,/nav\.hidden/)});

test('inicialização protege elemento opcional removido',()=>{const s=read('js/app.js');assert.doesNotMatch(s,/getElementById\('bankCountText'\)\.textContent/);assert.match(s,/const el=document\.getElementById\('bankCountText'\);if\(el\)el\.textContent/)});

test('helpers adaptativos usados entre camadas estão exportados',()=>{const s=read('js/app.js');for(const name of ['relevantQuestions','answerLog','activeErrorIds','dueReviews','weakestRows','prepIndex','missionData'])assert.match(s,new RegExp('Object\\.assign\\(window,\\{[^}]*'+name))});

test('atalho legado de questões possui compatibilidade',()=>{assert.match(read('js/app.js'),/window\.v40OpenFocusedQuestions/)});

test('handlers inline principais possuem implementação',()=>{const html=read('index.html');const js=['app.js','v6-release.js','gabarito-ui.js','gabarito-supabase.js','gabarito-bootstrap.js','commercial-v2.js','enem-simulator-v24.js','pism-simulator-v25.js'].map(f=>read('js/'+f)).join('\n');const names=[...html.matchAll(/on(?:click|submit|change|input)="\s*([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);const missing=[...new Set(names)].filter(name=>!new RegExp(`(?:function\\s+${name}\\s*\\(|window\\.${name}\\s*=|window\\[.{0,20}${name})`).test(js));assert.deepEqual(missing,[])});

test('versões técnicas estão alinhadas em 2.5.0',()=>{const pkg=JSON.parse(read('package.json'));const boot=read('js/gabarito-bootstrap.js');const sw=read('service-worker.js');assert.equal(pkg.version,'2.5.0');assert.match(boot,/const VERSION='2\.5\.0'/);assert.match(sw,/gabarito-mais-2-5-0-app-shell/);assert.match(sw,/const V='2\.5\.0'/)});

test('simulador ENEM replica os dois dias e mantém resultado bruto sem falsa TRI',()=>{const s=read('js/enem-simulator-v24.js'),boot=read('js/gabarito-bootstrap.js');assert.match(s,/DAY_MINUTES=\{1:330,2:300\}/);assert.match(s,/DAY_AREAS=\{1:\['Linguagens','Ciências Humanas'\],2:\['Ciências da Natureza','Matemática'\]\}/);assert.match(s,/buildLinguagens/);assert.match(s,/45/);assert.match(s,/Redação/);assert.match(s,/Rascunho/);assert.match(s,/Folha final/);assert.match(s,/cartão-resposta/i);assert.match(s,/não são convertidos aqui em uma nota oficial/i);assert.match(boot,/assets\/enem-simulator-v24\.css/);assert.match(boot,/js\/enem-simulator-v24\.js/)});

test('simulador PISM replica módulos, dois dias, discursivas e pontuação do edital 2027',()=>{const s=read('js/pism-simulator-v25.js'),boot=read('js/gabarito-bootstrap.js'),extra=read('data/pism-discursives-v25.js');assert.match(s,/const MINUTES=240/);assert.match(s,/I:\{1:\['Português','Geografia','Matemática','Química'\],2:\['Literatura','Biologia','Física','História'\]\}/);assert.match(s,/III:\{1:\['Português','Literatura','Biologia','Matemática'\],2:\['Física','Química','Geografia','História'\]\}/);for(const area of ['Economia e Administração','Exatas','Humanas','Saúde'])assert.match(s,new RegExp(area));assert.match(s,/'Português':4,'Matemática':4,'Sociologia':2/);assert.match(s,/'Geografia':4,'História':4,'Filosofia':2/);assert.match(s,/'Português':5,'Matemática':5/);assert.match(s,/'Física':5,'Química':5/);assert.match(s,/20 objetivas/);assert.match(s,/5 pontos cada/);assert.match(s,/autocorreção/i);assert.match(s,/pontuação oficial depende da banca da UFJF/i);assert.match(extra,/P25D3-PORT-05/);assert.match(extra,/P25D3-QUI-05/);assert.match(boot,/data\/pism-discursives-v25\.js/);assert.match(boot,/assets\/pism-simulator-v25\.css/);assert.match(boot,/js\/pism-simulator-v25\.js/)});

test('banco local PISM sustenta cinco famílias únicas por disciplina após exclusões editoriais',()=>{const ctx={window:{GABARITO_APP:{}}};vm.createContext(ctx);vm.runInContext(read('data/editorial-exclusions.js'),ctx);vm.runInContext(read('data/pism-questions.js'),ctx);const archived=new Set((ctx.window.GABARITO_ARCHIVED_QUESTION_IDS||[]).map(String));const qs=(ctx.window.PISM_QUESTIONS||[]).filter(q=>!archived.has(String(q.id)));const req={I:['Português','Geografia','Matemática','Química','Literatura','Biologia','Física','História'],II:['Português','Geografia','Matemática','Química','Literatura','Biologia','Física','História'],III:['Português','Literatura','Biologia','Matemática','Física','Química','Geografia','História']};const deficits=[];for(const [mod,subjects] of Object.entries(req))for(const subject of subjects){const fam=new Set(qs.filter(q=>String(q.module)===mod&&q.subject===subject).map(q=>String(q.variantFamily||q.id)));if(fam.size<5)deficits.push(`${mod}/${subject}:${fam.size}`)}assert.deepEqual(deficits,[],`Famílias insuficientes: ${deficits.join(', ')}`)});

test('banco discursivo local sustenta todos os cadernos do PISM',()=>{const ctx={window:{GABARITO_APP:{}}};vm.createContext(ctx);vm.runInContext(read('data/pism-discursives.js'),ctx);vm.runInContext(read('data/pism-discursives-v25.js'),ctx);const ds=ctx.window.PISM_DISCURSIVE||[],need={I:{Português:2,Geografia:2,Matemática:2,Química:2,Literatura:2,Biologia:2,Física:2,História:2},II:{Português:2,Geografia:2,Matemática:2,Química:2,Literatura:2,Biologia:2,Física:2,História:2},III:{Português:5,Matemática:5,Literatura:5,Biologia:5,Física:5,Química:5,Geografia:5,História:5,Filosofia:2,Sociologia:2}},deficits=[];for(const [mod,subjects] of Object.entries(need))for(const [subject,n] of Object.entries(subjects)){const count=ds.filter(d=>String(d.module)===mod&&d.subject===subject).length;if(count<n)deficits.push(`${mod}/${subject}:${count}/${n}`)}assert.deepEqual(deficits,[],`Discursivas insuficientes: ${deficits.join(', ')}`)});

test('boot usa fallback local sem bloquear e aplica exclusões editoriais',()=>{const boot=read('js/gabarito-bootstrap.js');assert.match(boot,/await loadLocalBank\(\)/);assert.match(boot,/data\/editorial-exclusions\.js/);assert.match(boot,/applyEditorialExclusions\(\)/);assert.match(boot,/loadQualityLayer/);assert.match(boot,/Camada de qualidade indisponível/)});

test('Supabase mantém cache persistente disponível para evolução futura',()=>{const source=read('js/gabarito-question-source.js');const boot=read('js/gabarito-bootstrap.js');assert.match(source,/loadDirectCached/);assert.match(source,/indexedDB/);assert.match(boot,/loadDirectCached/);assert.match(boot,/supabase-cache/);assert.match(boot,/supabase-primary/)});

test('V2 comercial contém diagnóstico, reporte e telemetria mínima',()=>{const s=read('js/commercial-v2.js');assert.match(s,/diagnostic_started/);assert.match(s,/diagnostic_completed/);assert.match(s,/question_reported/);assert.match(s,/question_reports/);assert.match(s,/product_events/);assert.doesNotMatch(s,/password/i)});

test('painel editorial V2 expõe funil e fila de relatos',()=>{const html=read('admin.html');const js=read('js/admin-v2.js');assert.match(html,/id="v2ProductFunnel"/);assert.match(html,/id="v2Reports"/);assert.match(js,/diagnostic_completed/);assert.match(js,/question_reports/);assert.match(js,/app_version/)});

test('documentos legais deixam claro caráter independente e tratamento de dados',()=>{const privacy=read('privacy.html');const terms=read('terms.html');assert.match(privacy,/Métricas de produto/);assert.match(privacy,/Relato de problemas em questões/);assert.match(terms,/não é um serviço oficial/i);assert.match(terms,/não garante aprovação/i)});

test('cronômetro persistente e gráfico de evolução seguem integrados',()=>{const html=read('index.html');const js=read('js/app.js');assert.match(html,/id="timerDisplay" role="timer"/);assert.match(html,/id="evolutionChart" role="img"/);assert.match(html,/data-evolution-range="90"/);assert.match(js,/study_focus_timer_gabarito/);assert.match(js,/window\.finishFocusSession/);assert.match(js,/function renderEvolution/);assert.match(js,/study_answer_log_v25/)});
