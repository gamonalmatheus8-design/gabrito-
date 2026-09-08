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
  await page.waitForFunction(()=>Boolean(window.GABARITO_OFFICIAL_PRACTICE?.open),{timeout:5000});

  const before=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
  assert.equal(before.some(x=>x.includes('enem-official-v27.js')),false,'runner ENEM não deve carregar no boot');
  assert.equal(before.some(x=>x.includes('pism-history-v29.js')),false,'runner PISM não deve carregar no boot');

  await page.evaluate(()=>{window.v42OpenQuestions();});
  await page.waitForSelector('#gplusPractice',{state:'visible',timeout:7000});
  await page.waitForSelector('#page-questions.active',{timeout:3000});

  assert.equal(await page.evaluate(()=>document.querySelector('#page-mocks')?.classList.contains('active')),false,'Simulados deve permanecer fechado ao abrir Questões');
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.questionPracticeMode),'official-single-question');
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.questionPracticeSeparatedFromMocks),true);
  assert.equal(await page.evaluate(()=>window.GABARITO_APP?.authorialQuestionPractice),false);
  assert.ok(await page.locator('#gplusPractice').getByText('TREINO OFICIAL · SEM SIMULADO').count());
  assert.ok(await page.locator('#gplusPractice').getByText('Respondidas').count());
  assert.ok(await page.locator('#gplusPractice').getByText('Acertos').count());
  assert.ok(await page.locator('#gplusPractice').getByText('Erros').count());
  assert.ok(await page.locator('#gplusPractice').getByText('Diagnóstico').count());

  const after=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
  for(const needle of ['enem-official-v27.js','enem-history-v28.js','pism-history-v29.js']){
    assert.equal(after.some(x=>x.includes(needle)),false,`${needle} não deve ser carregado ao abrir somente Questões`);
  }
  if(errors.length)throw new Error('Erros no navegador: '+errors.join(' | '));
}finally{
  await browser.close();
}
