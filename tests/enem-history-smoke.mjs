import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
 await page.waitForFunction(()=>window.GABARITO_APP?.enemHistory==='2.8.0',{timeout:7000});
 try{await page.waitForSelector('#v37Onboarding.open',{timeout:800});if(await page.locator('#v37Onboarding.open').count())await page.locator('#onSkipBtn').click()}catch{}
 await page.evaluate(()=>window.go('mocks'));
 await page.waitForSelector('#v28HistoryLibrary',{timeout:5000});
 assert.equal(await page.locator('#v28HistoryLibrary .v28-year-card').count(),10);
 const libraryText=await page.locator('#v28HistoryLibrary').innerText();assert.match(libraryText,/2016/);assert.match(libraryText,/2025/);assert.match(libraryText,/20/);
 await page.locator('[data-v28-year="2024"][data-v28-day="1"]').click();
 await page.waitForSelector('#v28Runner #v28Sheet',{timeout:5000});
 assert.equal(await page.locator('#v28Sheet [data-v28-q]').count(),90);
 assert.match(await page.locator('#v28Runner').innerText(),/ENEM 2024 · Dia 1/);
 assert.equal(await page.locator('#v28Runner').getByText('Abrir gabarito oficial').count(),0);
 await page.locator('#v28Sheet [data-v28-letter="A"]').click();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('gplus_enem_history_exam_v28')));assert.equal(stored.answers['1'],'A');assert.equal(stored.year,2024);
 await page.evaluate(()=>{const k='gplus_enem_history_exam_v28',s=JSON.parse(localStorage.getItem(k));s.status='awaiting-score';s.deliveredAt=Date.now();localStorage.setItem(k,JSON.stringify(s));window.GABARITO_ENEM_HISTORY.resume()});
 await page.waitForSelector('#v28ScoreForm',{timeout:4000});
 const keyHref=await page.locator('a').filter({hasText:'Abrir gabarito oficial'}).getAttribute('href');assert.match(keyHref,/2024_GB_impresso_D1_CD2\.pdf$/);
 await page.locator('input[name="area0"]').fill('12');await page.locator('input[name="area1"]').fill('20');await page.locator('#v28ScoreForm button[type="submit"]').click();
 await page.waitForSelector('#v28HistoryLibrary',{timeout:4000});
 const hist=await page.evaluate(()=>JSON.parse(localStorage.getItem('gplus_enem_history_results_v28')));assert.equal(hist[0].total,32);assert.equal(hist[0].year,2024);assert.equal(hist[0].day,1);
}finally{await browser.close()}
