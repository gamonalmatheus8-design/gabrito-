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
 try{await page.waitForSelector('#v37Onboarding.open',{timeout:1000})}catch{}
 if(await page.locator('#v37Onboarding.open').count())await page.locator('#onSkipBtn').click();
 await page.evaluate(()=>window.go('mocks'));
 await page.waitForFunction(()=>window.GABARITO_APP?.simulatorsLazyReady===true,{timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_ENEM_NATIVE?.version==='3.1.0',{timeout:10000});
 await page.waitForFunction(()=>window.GABARITO_ENEM_NATIVE_INTEGRATION?.version==='3.1.0',{timeout:10000});
 await page.waitForFunction(()=>window.GABARITO_ENEM_OFFICIAL?.version==='2.7.0',{timeout:7000});
 await page.evaluate(()=>{
  const rows=[];
  for(let number=1;number<=90;number++)rows.push({
   year:2025,day:1,number,
   ...(number<=5?{language:'Inglês'}:{}),
   area:number<=45?'Linguagens':'Ciências Humanas',
   subject:'Teste automatizado',
   text:`Questão sintética ${number}`,
   options:['Alternativa A','Alternativa B','Alternativa C','Alternativa D','Alternativa E'],
   sourceLabel:'Fixture de teste'
  });
  window.GABARITO_ENEM_NATIVE.register(rows);
  const lang=document.querySelector('#v27Language');
  if(lang)lang.value='Inglês';
  window.GABARITO_ENEM_OFFICIAL.start(1);
 });
 await page.waitForSelector('#v31NativeMount .v31-question',{timeout:7000});
 await page.waitForSelector('#v30EnemDock.show.official',{timeout:7000});
 assert.equal(await page.locator('#v27OfficialRunner iframe').count(),0);
 assert.match(await page.locator('#v31NativeMount').innerText(),/Questão 1/);
 assert.equal(await page.locator('#v31NativeMount [data-v31-letter]').count(),5);
 await page.locator('#v31NativeMount [data-v31-letter="B"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_official_v27')||'{}').answers?.['1']==='B',{timeout:3000});
 assert.match(await page.locator('#v30EnemDock').innerText(),/1\/90 no cartão/i);
 await page.locator('#v30EnemDock [data-v30-next]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_official_v27')||'{}').current===2,{timeout:3000});
 await page.waitForFunction(()=>document.querySelector('#v31NativeMount [data-v31-question="2"]'),{timeout:3000});
 await page.locator('#v31NativeMount [data-v31-review]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gplus_enem_official_v27')||'{}').marked?.includes(2),{timeout:3000});
 await page.locator('#v30EnemDock [data-v30-open]').click();
 await page.waitForSelector('#v30EnemSheetPanel.show',{timeout:3000});
 await page.waitForFunction(()=>document.querySelector('#v30EnemSheetPanel [data-v30-q="2"]')?.classList.contains('marked'),{timeout:3000});
 assert.equal(await page.locator('#v31NativeMount [data-v31-letter="B"]').count(),1);
 if(pageErrors.length)throw new Error('Erros no navegador: '+pageErrors.join(' | '));
}finally{await browser.close()}
