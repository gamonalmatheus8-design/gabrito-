import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.route('https://riep.inep.gov.br/**',route=>route.abort());
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
 await page.waitForFunction(()=>window.GABARITO_APP?.enemOfficial==='2.7.0',{timeout:7000});
 await page.waitForFunction(()=>window.GABARITO_APP?.enemHistory==='2.8.0',{timeout:7000});
 await page.waitForFunction(()=>window.GABARITO_ENEM_MOBILE?.version==='3.0.1',{timeout:7000});
 try{await page.waitForSelector('#v37Onboarding.open',{timeout:1000})}catch{}
 if(await page.locator('#v37Onboarding.open').count())await page.locator('#onSkipBtn').click();
 await page.evaluate(()=>window.go('mocks'));
 await page.waitForSelector('#v28HistoryLibrary',{timeout:5000});
 assert.match(await page.locator('#v28HistoryLibrary').innerText(),/ENEM 2016–2025/i);
 assert.match(await page.locator('#v24EnemHub .v24-enem-head').innerText(),/Treino estilo ENEM/i);
 await page.locator('#v28Lang2025').selectOption('Inglês');
 await page.locator('#v28HistoryLibrary [data-v28-year="2025"][data-v28-day="1"]').click();
 await page.waitForSelector('#v27OfficialRunner iframe',{timeout:5000});
 await page.waitForSelector('#v30EnemDock.show.official',{timeout:5000});
 assert.equal(await page.evaluate(()=>document.querySelector('#page-mocks')?.classList.contains('v27-official-active')),true);
 const src=await page.locator('#v27OfficialRunner iframe').getAttribute('src');
 assert.match(src,/a11f89c6-3693-49f0-8164-2794b5dac372/);
 assert.equal(await page.locator('#v27Sheet [data-q]').count(),90);
 assert.equal(await page.locator('#v27Sheet [data-letter]').count(),5);
 assert.equal(await page.locator('#v27Sheet').evaluate(el=>getComputedStyle(el).display),'none');
 assert.equal(await page.locator('#v30EnemDock .v30-quick-letters [data-v30-letter]').count(),5);
 await page.locator('#v30EnemDock .v30-quick-letters [data-v30-letter="A"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_official_v27')||'{}').answers?.['1']==='A',{timeout:3000});
 assert.match(await page.locator('#v30EnemDock').innerText(),/1\/90 no cartão/i);
 const keys=await page.evaluate(()=>({en:window.GABARITO_ENEM_OFFICIAL.answerKey(1,1,'Inglês'),es:window.GABARITO_ENEM_OFFICIAL.answerKey(1,1,'Espanhol'),ann:window.GABARITO_ENEM_OFFICIAL.answerKey(2,115,null)}));
 assert.deepEqual(keys,{en:'A',es:'D',ann:null});
 if(pageErrors.length)throw new Error('Erros no navegador: '+pageErrors.join(' | '));
}finally{await browser.close()}

