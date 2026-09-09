import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:20000});
  await page.waitForFunction(()=>window.GABARITO_APP?.questionBankMode==='validated_practice_v3',{timeout:8000});

  const onboarding=page.locator('#v37Onboarding.open');
  if(await onboarding.count()){
    const skip=page.locator('#onSkipBtn');
    assert.equal(await skip.count(),1,'onboarding deve oferecer a ação Agora não');
    await skip.click();
    await page.waitForSelector('#v37Onboarding.open',{state:'detached',timeout:3000});
  }

  const before=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
  assert.equal(before.some(x=>x.includes('enem-official-v27.js')),false,'runner ENEM não deve carregar no boot');
  assert.equal(before.some(x=>x.includes('pism-history-v29.js')),false,'runner PISM não deve carregar no boot');

  const sidebarQuestions=page.locator('.sidebar [data-page="questions"]');
  assert.equal(await sidebarQuestions.count(),1,'deve existir um único botão Questões na sidebar desktop');
  await sidebarQuestions.click();
  await page.waitForSelector('#practiceV3',{state:'visible',timeout:8000});
  await page.waitForSelector('#page-questions.active',{timeout:3000});
  await page.waitForSelector('#pv3Area',{state:'visible',timeout:3000});
  await page.waitForSelector('#pv3Subject',{state:'visible',timeout:3000});
  await page.waitForSelector('#pv3Topic',{state:'visible',timeout:3000});

  assert.equal(await page.evaluate(()=>document.querySelector('#page-mocks')?.classList.contains('active')),false,'Simulados deve permanecer fechado ao clicar em Questões');
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.questionRouteOwner),'app-go-direct');
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.questionPracticeSeparatedFromMocks),true);
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.authorialQuestionPractice),false);
  assert.ok(await page.locator('#practiceV3').getByText('BANCO DE TREINO VALIDADO').count());
  assert.ok(await page.locator('#practiceV3').getByText('Respondidas').count());
  assert.ok(await page.locator('#practiceV3').getByText('Acertos').count());
  assert.ok(await page.locator('#practiceV3').getByText('Erros').count());
  assert.ok(await page.locator('#practiceV3').getByText('Aproveitamento').count());
  assert.ok(await page.locator('#practiceV3').getByText('Diagnóstico do treino').count());

  const after=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
  for(const needle of ['enem-official-v27.js','enem-history-v28.js','pism-history-v29.js']){
    assert.equal(after.some(x=>x.includes(needle)),false,`${needle} não deve ser carregado ao abrir somente Questões`);
  }
  if(errors.length)throw new Error('Erros no navegador: '+errors.join(' | '));
}finally{
  await browser.close();
}
