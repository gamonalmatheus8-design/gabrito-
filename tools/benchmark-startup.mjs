import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const baselineUrl=process.argv[2]||'http://127.0.0.1:3090';
const currentUrl=process.argv[3]||'http://127.0.0.1:3091';
const outDir=process.env.REPORT_DIR||'perf-results';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});

const round=n=>Math.round(Number(n||0)*10)/10;
const median=values=>{const a=[...values].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2};
const pct=(before,after)=>before?round((after-before)/before*100):0;

async function configure(page){
 await page.addInitScript(()=>{
  window.__gplusLongTasks=[];
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__gplusLongTasks.push({start:e.startTime,duration:e.duration})}).observe({entryTypes:['longtask']})}catch{}
 });
 for(const pattern of ['https://fonts.googleapis.com/**','https://fonts.gstatic.com/**','https://unpkg.com/**','https://cdn.jsdelivr.net/**'])await page.route(pattern,r=>r.abort());
}

async function measurePage(page,base,label){
 await configure(page);
 const started=Date.now();
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.GABARITO_APP?.ready===true,{timeout:30000});
 await page.waitForTimeout(120);
 return page.evaluate(({label,wall})=>{
  const nav=performance.getEntriesByType('navigation')[0]||{};
  const resources=performance.getEntriesByType('resource').map(r=>({name:r.name.split('?')[0],duration:r.duration,transferSize:r.transferSize||0,encodedBodySize:r.encodedBodySize||0,decodedBodySize:r.decodedBodySize||0}));
  const local=resources.filter(r=>r.name.startsWith(location.origin));
  const sum=(arr,key)=>arr.reduce((a,x)=>a+Number(x[key]||0),0);
  const questionData=local.filter(r=>/\/data\/(enem-questions|pism-questions)/.test(r.name));
  const appJs=local.find(r=>/\/js\/app\.js$/.test(r.name));
  const longTasks=window.__gplusLongTasks||[];
  return{
   label,
   version:window.GABARITO_APP?.version||null,
   bankSource:window.GABARITO_APP?.bankSource||null,
   cacheHit:Boolean(window.__GABARITO_PERF?.cacheHit),
   readyMs:performance.now(),
   domContentLoadedMs:Number(nav.domContentLoadedEventEnd||0),
   loadEventMs:Number(nav.loadEventEnd||0),
   localEncodedBytes:sum(local,'encodedBodySize'),
   localDecodedBytes:sum(local,'decodedBodySize'),
   questionDataEncodedBytes:sum(questionData,'encodedBodySize'),
   questionDataDecodedBytes:sum(questionData,'decodedBodySize'),
   questionDataResources:questionData.length,
   appJsEncodedBytes:Number(appJs?.encodedBodySize||0),
   appJsDurationMs:Number(appJs?.duration||0),
   longTaskCount:longTasks.length,
   longTaskTotalMs:longTasks.reduce((a,x)=>a+x.duration,0),
   bootstrap:window.GABARITO_APP?.performance||null,
   wallClockMs:Date.now()-wall
  };
 },{label,wall:started});
}

async function coldSamples(base,label,count=3){
 const rows=[];
 for(let i=0;i<count;i++){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1365,height:900}});
  const page=await context.newPage();
  rows.push(await measurePage(page,base,`${label}-cold-${i+1}`));
  await context.close();
 }
 return rows;
}

async function warmSample(base,label,canPrime){
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1365,height:900}});
 const first=await context.newPage();
 await measurePage(first,base,`${label}-prime`);
 if(canPrime){try{await first.waitForFunction(()=>window.GABARITO_APP?.cachePrimeDone===true,{timeout:18000})}catch{await first.waitForTimeout(3000)}}else await first.waitForTimeout(3000);
 await first.close();
 const second=await context.newPage();
 const result=await measurePage(second,base,`${label}-warm`);
 await context.close();
 return result;
}

function summarize(cold,warm){return{
 cold:{
  readyMs:round(median(cold.map(x=>x.readyMs))),
  wallClockMs:round(median(cold.map(x=>x.wallClockMs))),
  appJsDurationMs:round(median(cold.map(x=>x.appJsDurationMs))),
  localEncodedBytes:Math.round(median(cold.map(x=>x.localEncodedBytes))),
  questionDataEncodedBytes:Math.round(median(cold.map(x=>x.questionDataEncodedBytes))),
  longTaskTotalMs:round(median(cold.map(x=>x.longTaskTotalMs))),
  longTaskCount:round(median(cold.map(x=>x.longTaskCount)))
 },
 warm:{readyMs:round(warm.readyMs),wallClockMs:round(warm.wallClockMs),appJsDurationMs:round(warm.appJsDurationMs),localEncodedBytes:warm.localEncodedBytes,questionDataEncodedBytes:warm.questionDataEncodedBytes,longTaskTotalMs:round(warm.longTaskTotalMs),longTaskCount:warm.longTaskCount,cacheHit:warm.cacheHit,bankSource:warm.bankSource}
}}

try{
 const baselineCold=await coldSamples(baselineUrl,'baseline');
 const currentCold=await coldSamples(currentUrl,'current');
 const baselineWarm=await warmSample(baselineUrl,'baseline',false);
 const currentWarm=await warmSample(currentUrl,'current',true);
 const baseline=summarize(baselineCold,baselineWarm),current=summarize(currentCold,currentWarm);
 const comparison={
  generatedAt:new Date().toISOString(),
  baselineUrl,currentUrl,
  baseline,current,
  delta:{
   coldReadyPct:pct(baseline.cold.readyMs,current.cold.readyMs),
   coldAppJsPct:pct(baseline.cold.appJsDurationMs,current.cold.appJsDurationMs),
   coldBytesPct:pct(baseline.cold.localEncodedBytes,current.cold.localEncodedBytes),
   warmReadyPct:pct(baseline.warm.readyMs,current.warm.readyMs),
   warmBytesPct:pct(baseline.warm.localEncodedBytes,current.warm.localEncodedBytes),
   warmLongTaskPct:pct(baseline.warm.longTaskTotalMs,current.warm.longTaskTotalMs)
  },
  raw:{baselineCold,currentCold,baselineWarm,currentWarm}
 };
 await fs.mkdir(outDir,{recursive:true});
 await fs.writeFile(path.join(outDir,'startup-comparison.json'),JSON.stringify(comparison,null,2));
 const md=`# Gabarito+ — benchmark de inicialização\n\nGerado em ${comparison.generatedAt}. Valores frios são medianas de 3 execuções em contextos novos do Chromium. A medição quente reutiliza o mesmo perfil para capturar cache HTTP/IndexedDB.\n\n| Métrica | Baseline | Atual | Variação |\n|---|---:|---:|---:|\n| Cold ready | ${baseline.cold.readyMs} ms | ${current.cold.readyMs} ms | ${comparison.delta.coldReadyPct}% |\n| Cold app.js | ${baseline.cold.appJsDurationMs} ms | ${current.cold.appJsDurationMs} ms | ${comparison.delta.coldAppJsPct}% |\n| Cold bytes locais | ${baseline.cold.localEncodedBytes} | ${current.cold.localEncodedBytes} | ${comparison.delta.coldBytesPct}% |\n| Warm ready | ${baseline.warm.readyMs} ms | ${current.warm.readyMs} ms | ${comparison.delta.warmReadyPct}% |\n| Warm bytes locais | ${baseline.warm.localEncodedBytes} | ${current.warm.localEncodedBytes} | ${comparison.delta.warmBytesPct}% |\n| Warm long tasks | ${baseline.warm.longTaskTotalMs} ms | ${current.warm.longTaskTotalMs} ms | ${comparison.delta.warmLongTaskPct}% |\n\nCache atual: **${current.warm.cacheHit?'hit':'miss'}** · fonte: **${current.warm.bankSource||'—'}**.\n`;
 await fs.writeFile(path.join(outDir,'startup-comparison.md'),md);
 console.log('GABARITO_PERF_COMPARISON '+JSON.stringify({baseline,current,delta:comparison.delta}));
 console.log(md);
}finally{
 await browser.close();
}
