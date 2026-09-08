import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.lazySimulators),'3.7.0');
 const before=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
 for(const needle of ['enem-official-v27.js','enem-history-v28.js','pism-history-v29.js','enem-direct-sync-v36.js','pism-direct-sync-v37.js','enem-mobile-v30.js'])assert.equal(before.some(x=>x.includes(needle)),false,`${needle} não deve carregar no boot`);
 assert.equal(await page.evaluate(()=>Boolean(window.GABARITO_ENEM_DIRECT_SYNC)),false,'sincronizador ENEM não deve rodar no boot global');
 assert.equal(await page.evaluate(()=>Boolean(window.GABARITO_PISM_DIRECT_SYNC)),false,'sincronizador PISM não deve rodar no boot global');
 await page.evaluate(()=>window.go('mocks'));
 await page.waitForFunction(()=>window.GABARITO_APP?.simulatorsLazyReady===true,{timeout:20000});
 await page.waitForSelector('#v28HistoryLibrary',{timeout:7000});
 await page.waitForSelector('#v29PismOfficialHub',{timeout:7000});
 assert.equal(await page.evaluate(()=>window.GABARITO_ENEM_DIRECT_SYNC?.version),'3.6.0');
 assert.equal(await page.evaluate(()=>window.GABARITO_PISM_DIRECT_SYNC?.version),'3.7.0');
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.simulatorsSyncRequired),true);
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.simulatorReader),'official-direct-sync');
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.enemSimulatorReader),'direct-sync-v36');
 assert.equal(await page.evaluate(()=>window.GABARITO_APP?.pismSimulatorReader),'direct-sync-v37');
 const after=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name));
 assert.ok(after.some(x=>x.includes('enem-history-v28.js')));
 assert.ok(after.some(x=>x.includes('pism-history-v29.js')));
 assert.ok(after.some(x=>x.includes('enem-direct-sync-v36.js')));
 assert.ok(after.some(x=>x.includes('pism-direct-sync-v37.js')));
 assert.equal(after.some(x=>x.includes('enem-direct-sync-v35.js')),false);
 assert.equal(after.some(x=>x.includes('enem-document-v32.js')),false,'leitor ENEM antigo não deve competir com o v36');
 if(errors.length)throw new Error('Erros no navegador: '+errors.join(' | '));
}finally{await browser.close()}
