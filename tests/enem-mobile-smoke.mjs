import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true});

async function ready(page){
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
 await page.waitForFunction(()=>window.GABARITO_ENEM_MOBILE?.version==='3.0.0',{timeout:7000});
 try{await page.waitForSelector('#v37Onboarding.open',{timeout:1000})}catch{}
 if(await page.locator('#v37Onboarding.open').count())await page.locator('#onSkipBtn').click();
 await page.evaluate(()=>window.go('mocks'));
}

let authorialContext=null,officialContext=null;
try{
 authorialContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const authorial=await authorialContext.newPage(),errors=[];authorial.on('pageerror',e=>errors.push(e.message));
 await ready(authorial);
 await authorial.waitForSelector('#v24EnemHub [data-start-day="1"]',{timeout:5000});
 await authorial.locator('#v24ForeignLanguage').selectOption({label:'Inglês'});
 await authorial.locator('#v24EnemHub [data-start-day="1"]').click();
 await authorial.waitForSelector('#v30EnemDock.show',{timeout:5000});
 assert.equal(await authorial.locator('#v24EnemRunner .v24-sheet').evaluate(el=>getComputedStyle(el).display),'none');
 assert.match(await authorial.locator('#v30EnemDock').innerText(),/Questão 1/i);
 assert.match(await authorial.locator('#v30EnemDock').innerText(),/0\/90 no cartão/i);
 await authorial.locator('#v24EnemRunner .v24-option').first().click();
 await authorial.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('gplus_enem_exam_v24')||'{}');return Object.keys(s.selections||{}).length===1},{timeout:3000});
 await authorial.waitForFunction(()=>document.querySelector('#v30EnemDock')?.innerText.includes('1/90 no cartão'),{timeout:3000});
 await authorial.locator('#v30EnemDock [data-v30-open]').click();
 await authorial.waitForSelector('#v30EnemSheetPanel.show',{timeout:3000});
 assert.equal(await authorial.locator('#v30EnemSheetPanel [data-v30-q]').count(),45);
 assert.match(await authorial.locator('#v30EnemSheetPanel [data-v30-q="1"]').innerText(),/A/);
 await authorial.locator('#v30EnemSheetPanel [data-v30-q="2"]').click();
 await authorial.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_exam_v24')||'{}').index===1,{timeout:3000});
 await authorial.waitForSelector('#v30EnemSheetPanel',{state:'hidden',timeout:3000});
 await authorial.locator('#v30EnemDock [data-v30-review]').click();
 await authorial.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_exam_v24')||'{}').marked?.length===1,{timeout:3000});
 await authorial.locator('#v30EnemDock [data-v30-open]').click();
 await authorial.waitForSelector('#v30EnemSheetPanel.show',{timeout:3000});
 assert.match(await authorial.locator('#v30EnemSheetPanel').innerText(),/1\s*revisar/i);
 assert.ok(await authorial.locator('#v30EnemSheetPanel [data-v30-essay]').count(),'Redação deve estar acessível pelo cartão no Dia 1');
 if(errors.length)throw new Error('Erros no treino ENEM mobile: '+errors.join(' | '));
 await authorialContext.close();authorialContext=null;

 officialContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const official=await officialContext.newPage(),officialErrors=[];official.on('pageerror',e=>officialErrors.push(e.message));
 await official.route('https://riep.inep.gov.br/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>INEP mock</title>'}));
 await ready(official);
 await official.waitForSelector('#v27OfficialBlock [data-v27-start="1"]',{timeout:5000});
 await official.locator('#v27OfficialBlock [data-v27-start="1"]').click();
 await official.waitForSelector('#v27OfficialRunner',{timeout:5000});
 await official.waitForSelector('#v30EnemDock.show.official',{timeout:5000});
 assert.equal(await official.locator('#v27OfficialRunner .v27-sheet').evaluate(el=>getComputedStyle(el).display),'none');
 assert.equal(await official.locator('#v30EnemDock .v30-quick-letters [data-v30-letter]').count(),5);
 await official.locator('#v30EnemDock .v30-quick-letters [data-v30-letter="C"]').click();
 await official.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_official_v27')||'{}').answers?.['1']==='C',{timeout:3000});
 assert.ok(await official.locator('#v30EnemDock .v30-quick-letters [data-v30-letter="C"]').evaluate(el=>el.classList.contains('selected')));
 assert.match(await official.locator('#v30EnemDock').innerText(),/1\/90 no cartão/i);
 await official.locator('#v30EnemDock [data-v30-next]').click();
 await official.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_official_v27')||'{}').current===2,{timeout:3000});
 await official.locator('#v30EnemDock [data-v30-open]').click();
 await official.waitForSelector('#v30EnemSheetPanel.show',{timeout:3000});
 assert.equal(await official.locator('#v30EnemSheetPanel [data-v30-q]').count(),45);
 assert.match(await official.locator('#v30EnemSheetPanel [data-v30-q="1"]').innerText(),/C/);
 assert.equal(await official.locator('#v30EnemSheetPanel .v30-panel-picker [data-v30-letter]').count(),5);
 if(officialErrors.length)throw new Error('Erros na prova oficial ENEM mobile: '+officialErrors.join(' | '));
}finally{
 if(authorialContext)await authorialContext.close();
 if(officialContext)await officialContext.close();
 await browser.close();
}
