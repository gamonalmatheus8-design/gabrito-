import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 async function dismissOnboarding(){
  try{await page.waitForSelector('#v37Onboarding.open',{timeout:1000})}catch{}
  if(await page.locator('#v37Onboarding.open').count())await page.locator('#onSkipBtn').click();
 }
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
 await page.waitForFunction(()=>window.GABARITO_APP?.premiumPolish==='2.6.0',{timeout:7000});
 await dismissOnboarding();
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.gplusVersion),'2.6.0');
 await page.evaluate(()=>window.go('mocks'));
 await page.waitForSelector('#v24EnemHub [data-start-day="1"]',{timeout:5000});
 await page.locator('#v24ForeignLanguage').selectOption({label:'Inglês'});
 await page.evaluate(()=>document.querySelector('#v24EnemHub [data-start-day="1"]')?.click());
 await page.waitForSelector('#page-mocks.enem-exam-active #v24EnemRunner',{timeout:5000});
 await page.waitForFunction(()=>document.body.classList.contains('v26-exam-focus'),{timeout:3000});
 await page.waitForSelector('#v24EnemRunner .v26-save-status',{timeout:3000});
 const minHeight=await page.locator('#v24EnemRunner .v24-option').first().evaluate(el=>parseFloat(getComputedStyle(el).minHeight));
 assert.ok(minHeight>=44,`área de toque abaixo de 44px: ${minHeight}`);
 await page.locator('#v24EnemRunner .v24-option').first().click();
 await page.waitForFunction(()=>document.querySelector('.v26-save-status')?.textContent.includes('Salvo'),{timeout:3000});
 await page.evaluate(()=>{
  localStorage.removeItem('gplus_enem_exam_v24');
  const runner=document.getElementById('v24EnemRunner');
  runner.innerHTML='<section class="v24-result"><h2>Resultado do teste</h2><div class="v24-area-results"><div class="v24-area-result">Linguagens\n18/45</div><div class="v24-area-result">Ciências Humanas\n34/45</div></div><div class="v24-result-actions"></div></section>';
  window.GABARITO_PREMIUM?.enhance?.();
 });
 await page.waitForSelector('.v24-result [data-v26-plan]',{timeout:4000});
 const planText=await page.locator('.v24-result [data-v26-plan]').innerText();
 assert.match(planText,/Plano pós-ENEM/i);
 assert.match(planText,/Linguagens/i);
 assert.match(planText,/Prioridade alta/i);
 await page.evaluate(()=>{
  const button=document.createElement('button');button.innerHTML='<i data-lucide="x"></i>';button.id='v26A11yProbe';document.body.appendChild(button);window.GABARITO_PREMIUM.enhance();
 });
 assert.equal(await page.locator('#v26A11yProbe').getAttribute('aria-label'),'Fechar');
 if(pageErrors.length)throw new Error('Erros no navegador: '+pageErrors.join(' | '));
}finally{await browser.close()}
