import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
async function ready(page){
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
 try{await page.waitForSelector('#v37Onboarding.open',{timeout:1000})}catch{}
 if(await page.locator('#v37Onboarding.open').count())await page.locator('#onSkipBtn').click();
 await page.evaluate(()=>window.go('mocks'));
 await page.waitForSelector('#v28HistoryLibrary',{timeout:7000});
}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://riep.inep.gov.br/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>INEP mock</title>'}));
 await ready(page);
 await page.locator('#v28Lang2025').selectOption('Inglês');
 await page.locator('#v28HistoryLibrary [data-v28-year="2025"][data-v28-day="1"]').click();
 await page.waitForSelector('#v27OfficialRunner',{timeout:5000});
 await page.waitForSelector('#v30EnemDock.show.official',{timeout:5000});
 assert.equal(await page.locator('#v30EnemDock .v30-quick-letters [data-v30-letter]').count(),5);
 await page.locator('#v30EnemDock .v30-quick-letters [data-v30-letter="C"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_official_v27')||'{}').answers?.['1']==='C',{timeout:3000});
 assert.match(await page.locator('#v30EnemDock').innerText(),/1\/90 no cartão/i);
 if(errors.length)throw new Error('Erros no ENEM oficial mobile: '+errors.join(' | '));
 await context.close();
}finally{
 await browser.close();
}
