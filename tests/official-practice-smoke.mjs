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
  await page.waitForFunction(()=>window.GABARITO_APP?.questionBankMode==='validated_practice_standalone_v34',{timeout:10000});

  async function dismissOnboarding(){
    try{await page.waitForSelector('#v37Onboarding.open',{state:'visible',timeout:1800})}catch{}
    const onboarding=page.locator('#v37Onboarding.open');
    if(await onboarding.count()){
      const skip=page.locator('#onSkipBtn');
      assert.equal(await skip.count(),1,'onboarding deve oferecer a ação Agora não');
      await skip.click();
      await page.waitForSelector('#v37Onboarding.open',{state:'hidden',timeout:3000});
    }
  }
  await dismissOnboarding();

  const before=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
  assert.equal(before.some(x=>x.includes('enem-official-v27.js')),false,'runner ENEM não deve carregar no boot');
  assert.equal(before.some(x=>x.includes('pism-history-v29.js')),false,'runner PISM não deve carregar no boot');

  await dismissOnboarding();
  const sidebarQuestions=page.locator('.sidebar [data-page="questions"]');
  assert.equal(await sidebarQuestions.count(),1,'deve existir um único botão Questões na sidebar desktop');
  await sidebarQuestions.click();
  await page.waitForSelector('#practiceV3[data-mode="standalone-v34"]',{state:'visible',timeout:8000});
  await page.waitForSelector('#page-questions.active',{timeout:3000});
  await page.waitForSelector('#pv3Year',{state:'visible',timeout:3000});
  await page.waitForSelector('#pv3Area',{state:'visible',timeout:3000});
  await page.waitForSelector('#pv3Subject',{state:'visible',timeout:3000});
  await page.waitForSelector('#pv3Topic',{state:'visible',timeout:3000});

  assert.equal(await page.evaluate(()=>document.querySelector('#page-mocks')?.classList.contains('active')),false,'Simulados deve permanecer fechado ao clicar em Questões');
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.questionRouteOwner),'app-go-direct');
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.questionPracticeSeparatedFromMocks),true);
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.authorialQuestionPractice),false);
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.practiceUsesPdfAsInterface),false);
  assert.ok(await page.locator('#practiceV3').getByText('BANCO DE TREINO').count());
  assert.ok(await page.locator('#practiceV3').getByText('Questões para praticar').count());
  assert.ok(await page.locator('#practiceV3').getByText('Respondidas').count());
  assert.ok(await page.locator('#practiceV3').getByText('Acertos').count());
  assert.ok(await page.locator('#practiceV3').getByText('Erros').count());
  assert.ok(await page.locator('#practiceV3').getByText('Aproveitamento').count());
  assert.ok(await page.locator('#practiceV3').getByText('Diagnóstico do treino').count());
  assert.equal(await page.locator('#practiceV3 canvas').count(),0,'Questões não deve reutilizar a prova em canvas/PDF');

  await page.waitForFunction(()=>window.GABARITO_APP?.questionCounterSource==='validated-practice-bank',{timeout:5000});
  const counter=await page.locator('#sideQCount').textContent();
  assert.equal(String(counter||'').trim(),'351','contador deve refletir o banco curado publicado');

  const after=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
  assert.equal(after.some(x=>x.includes('practice-fast-render-v32.js')),false,'renderizador antigo não deve ser carregado');
  assert.equal(after.some(x=>x.includes('practice-standalone-v34.js')),true,'camada standalone 3.4 deve ser carregada');
  assert.equal(after.some(x=>x.includes('practice-standalone-v33.js')),false,'camada standalone antiga não deve ser carregada');
  assert.equal(after.some(x=>x.includes('pdfjs-dist')),false,'área Questões não deve carregar PDF.js');
  for(const needle of ['enem-official-v27.js','enem-history-v28.js','pism-history-v29.js']){
    assert.equal(after.some(x=>x.includes(needle)),false,`${needle} não deve ser carregado ao abrir somente Questões`);
  }
  if(errors.length)throw new Error('Erros no navegador: '+errors.join(' | '));
}finally{
  await browser.close();
}
