import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.lazySimulators),'3.3.0');
 const before=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
 for(const needle of ['enem-official-v27.js','enem-history-v28.js','pism-history-v29.js','enem-native-v31.js','enem-document-v32.js','enem-mobile-v30.js']){
  assert.equal(before.some(x=>x.includes(needle)),false,`${needle} não deve carregar no boot`);
 }
 assert.equal(await page.evaluate(()=>Boolean(window.GABARITO_ENEM_HISTORY)),false,'biblioteca ENEM não deve existir antes de abrir Simulados');
 assert.equal(await page.evaluate(()=>Boolean(window.GABARITO_PISM_OFFICIAL)),false,'biblioteca PISM não deve existir antes de abrir Simulados');
 await page.evaluate(()=>window.go('mocks'));
 await page.waitForFunction(()=>window.GABARITO_APP?.simulatorsLazyReady===true,{timeout:20000});
 await page.waitForSelector('#v28HistoryLibrary',{timeout:7000});
 await page.waitForSelector('#v29PismOfficialHub',{timeout:7000});
 assert.ok(await page.evaluate(()=>Boolean(window.GABARITO_ENEM_HISTORY)),'biblioteca oficial ENEM deve carregar sob demanda');
 assert.ok(await page.evaluate(()=>Boolean(window.GABARITO_PISM_OFFICIAL)),'biblioteca oficial PISM deve carregar sob demanda');
 const after=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
 assert.ok(after.some(x=>x.includes('enem-history-v28.js')),'ENEM histórico deve ser baixado ao abrir Simulados');
 assert.ok(after.some(x=>x.includes('pism-history-v29.js')),'PISM histórico deve ser baixado ao abrir Simulados');
 if(errors.length)throw new Error('Erros no navegador: '+errors.join(' | '));
}finally{await browser.close()}
