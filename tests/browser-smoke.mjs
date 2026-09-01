import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  async function dismissOnboarding(){
    try{await page.waitForSelector('#v37Onboarding.open',{timeout:1200})}catch{}
    const open=page.locator('#v37Onboarding.open');
    if(await open.count()){
      assert.doesNotMatch(await open.innerText(),/Supabase|banco Supabase/i);
      await page.locator('#onSkipBtn').click();
      await page.waitForFunction(()=>!document.getElementById('v37Onboarding')?.classList.contains('open'),{timeout:3000});
    }
  }
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
  assert.equal(await page.locator('#v7Boot').count(),0,'overlay de boot permaneceu na tela');
  assert.equal(await page.title(),'Gabarito+ — ENEM & PISM');
  assert.equal(await page.evaluate(()=>window.GABARITO_ARCHIVED_QUESTION_IDS?.length),71);
  await page.waitForFunction(()=>window.GABARITO_APP?.qualityLayer==='2.2.0',{timeout:7000});
  await page.waitForFunction(()=>window.GABARITO_APP?.enemSimulator==='2.4.0',{timeout:7000});
  await page.waitForFunction(()=>window.GABARITO_APP?.pismSimulator==='2.5.0',{timeout:7000});
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.pismDiscursiveExpansion),'2.5.0');
  await dismissOnboarding();
  await page.evaluate(()=>window.go('questions'));
  await page.waitForSelector('#page-questions.active',{timeout:5000});
  await page.waitForSelector('#questionCard .q-text',{timeout:5000});
  await page.waitForSelector('#questionCard .v22-question-trust',{timeout:5000});
  await dismissOnboarding();
  await page.evaluate(()=>window.go('mocks'));
  await page.waitForSelector('#discursiveList .card.discursive textarea',{timeout:5000});
  await page.waitForSelector('#v22DiscSummary',{timeout:5000});
  await dismissOnboarding();
  const input=page.locator('#discursiveList .card.discursive textarea').first();await input.fill('Resposta de teste automatizado.');
  const save=page.locator('#discursiveList .card.discursive [data-save]').first();await save.click();
  assert.match(await page.evaluate(()=>localStorage.getItem('gplus_discursive_progress_v22')||''),/Resposta de teste automatizado/);

  // Simulado ENEM completo: valida a montagem real do Dia 1 e a redação integrada.
  await page.waitForSelector('#v24EnemHub [data-start-day="1"]',{timeout:5000});
  await page.locator('#v24ForeignLanguage').selectOption({label:'Inglês'});
  await page.locator('#v24EnemHub [data-start-day="1"]').click();
  await page.waitForSelector('#page-mocks.enem-exam-active #v24EnemRunner',{timeout:5000});
  assert.match(await page.locator('#v24EnemRunner').innerText(),/ENEM · Dia 1/);
  assert.equal(await page.locator('#v24EnemRunner .v24-palette button').count(),90,'Dia 1 deve montar 90 questões');
  assert.equal(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('gplus_enem_exam_v24'));return s.ids.length}),90);
  assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('gplus_enem_exam_v24'));const qs=s.ids.map(id=>QUESTIONS.find(q=>String(q.id)===String(id)));return[qs.slice(0,45).every(q=>q.area==='Linguagens'),qs.slice(45).every(q=>q.area==='Ciências Humanas')]}),[true,true]);
  await page.locator('#v24EnemRunner .v24-option').first().click();
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('gplus_enem_exam_v24')).selections).length),1);
  await page.locator('#v24EnemRunner [data-essay]').click();
  await page.waitForSelector('#v24EssayText',{timeout:5000});
  assert.match(await page.locator('#v24EnemRunner').innerText(),/Proposta de redação/i);
  await page.locator('#v24EssayText').fill('Texto final de teste automatizado para validar a redação integrada ao Dia 1.');
  assert.match(await page.evaluate(()=>JSON.parse(localStorage.getItem('gplus_enem_exam_v24')).essay.final),/Texto final de teste automatizado/);
  await page.evaluate(()=>{localStorage.removeItem('gplus_enem_exam_v24');document.getElementById('page-mocks')?.classList.remove('enem-exam-active')});

  // PISM I: 20 objetivas + 8 discursivas no mesmo caderno de 4 horas.
  await page.waitForSelector('#v25PismHub [data-start="1"]',{timeout:5000});
  await page.locator('#v25PismModule').selectOption('I');
  await page.locator('#v25PismHub [data-start="1"]').click();
  await page.waitForTimeout(250);
  const pismStartState=await page.evaluate(()=>({
    session:localStorage.getItem('gplus_pism_exam_v25'),
    pageClass:document.getElementById('page-mocks')?.className||'',
    runner:Boolean(document.getElementById('v25PismRunner')),
    runnerText:document.getElementById('v25PismRunner')?.innerText?.slice(0,240)||'',
    notices:Array.from(document.querySelectorAll('.toast,.notice,[role="alert"]')).map(x=>x.textContent?.trim()).filter(Boolean).slice(-5),
    pismQuestions:(window.PISM_QUESTIONS||[]).length,
    pismDiscursives:(window.PISM_DISCURSIVE||[]).length,
    pageErrors:window.GABARITO_APP?.pismSimulatorError||null
  }));
  console.log('PISM_START_STATE',JSON.stringify(pismStartState));
  assert.ok(pismStartState.session,`PISM não criou sessão: ${JSON.stringify(pismStartState)}`);
  await page.waitForSelector('#page-mocks.pism-exam-active #v25PismRunner',{timeout:5000});
  assert.equal(await page.locator('#v25PismRunner .v25p-palette button').count(),20);
  assert.equal(await page.locator('#v25PismRunner .v25p-disc-palette button').count(),8);
  assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('gplus_pism_exam_v25'));const qs=s.objectiveIds.map(id=>QUESTIONS.find(q=>String(q.id)===String(id)));return [s.module,s.day,s.deadline-s.startedAt,s.discursives.length,['Português','Geografia','Matemática','Química'].every(sub=>qs.filter(q=>q.subject===sub).length===5)]}),['I',1,14400000,8,true]);
  await page.locator('#v25PismRunner .v25p-option').first().click();
  await page.locator('#v25PismRunner [data-discursive]').click();
  await page.waitForSelector('#v25PismDiscAnswer',{timeout:5000});
  await page.locator('#v25PismDiscAnswer').fill('Resposta discursiva automatizada do PISM I.');
  assert.match(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('gplus_pism_exam_v25')).discursiveAnswers)),/Resposta discursiva automatizada/);
  await page.evaluate(()=>{localStorage.removeItem('gplus_pism_exam_v25');document.getElementById('page-mocks')?.classList.remove('pism-exam-active');window.go('mocks')});

  // PISM III Exatas: 20 objetivas + 10 discursivas específicas da área.
  await page.waitForSelector('#v25PismHub [data-start="2"]',{timeout:5000});
  await page.locator('#v25PismModule').selectOption('III');
  await page.locator('#v25PismArea').selectOption({label:'Exatas'});
  await page.locator('#v25PismHub [data-start="2"]').click();
  await page.waitForSelector('#page-mocks.pism-exam-active #v25PismRunner',{timeout:5000});
  assert.equal(await page.locator('#v25PismRunner .v25p-palette button').count(),20);
  assert.equal(await page.locator('#v25PismRunner .v25p-disc-palette button').count(),10);
  assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('gplus_pism_exam_v25'));const qs=s.objectiveIds.map(id=>QUESTIONS.find(q=>String(q.id)===String(id)));const ds=s.discursives;return [s.module,s.day,s.area,['Física','Química','Geografia','História'].every(sub=>qs.filter(q=>q.subject===sub).length===5),ds.filter(d=>d.subject==='Física').length,ds.filter(d=>d.subject==='Química').length]}),['III',2,'Exatas',true,5,5]);
  await page.evaluate(()=>{localStorage.removeItem('gplus_pism_exam_v25');document.getElementById('page-mocks')?.classList.remove('pism-exam-active')});

  await page.goto(base+'/landing-clean.html',{waitUntil:'domcontentloaded',timeout:10000});
  assert.match(await page.title(),/ENEM e PISM/);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://gabarito-mais.vercel.app/');
  assert.equal(await page.locator('#metodologia').count(),1);
  assert.equal(await page.locator('#editorial').count(),1);
  if(pageErrors.length)throw new Error('Erros no navegador: '+pageErrors.join(' | '));
}finally{await browser.close()}
