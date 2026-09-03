import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage();
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
 try{await page.waitForSelector('#v37Onboarding.open',{timeout:1000})}catch{}
 if(await page.locator('#v37Onboarding.open').count())await page.locator('#onSkipBtn').click();
 await page.evaluate(()=>window.go('mocks'));
 await page.waitForSelector('#v24EnemHub',{timeout:5000});
 await page.waitForSelector('#v28HistoryLibrary',{timeout:7000});
 await page.waitForSelector('#v29PismOfficialHub',{timeout:7000});
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.officialSimulatorsHost),'3.1.0');
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.enemSimulator),undefined);
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.pismSimulator),undefined);
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.premiumPolish),undefined);
 assert.equal(await page.locator('#discursiveList').isHidden(),true);
 assert.equal(await page.locator('#discModule').isHidden(),true);
 assert.ok((await page.locator('#v28HistoryLibrary [data-v28-year]').count())>=10,'Biblioteca oficial do ENEM deve listar as edições');
 assert.ok((await page.locator('#v29PismOfficialHub [data-v29-year]').count())>=10,'Biblioteca oficial do PISM deve listar as edições');
 if(pageErrors.length)throw new Error('Erros no navegador: '+pageErrors.join(' | '));
}finally{
 await browser.close();
}
