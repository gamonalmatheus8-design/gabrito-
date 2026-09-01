import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('catálogo oficial cobre exatamente 2016 a 2025',()=>{
 const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('data/enem-official-catalog-v28.js'),ctx);
 const years=ctx.window.GABARITO_ENEM_CATALOG.years;
 assert.deepEqual(Array.from(years,x=>x.year),[2025,2024,2023,2022,2021,2020,2019,2018,2017,2016]);
 assert.equal(years.length,10);
 for(const y of years){assert.match(y.source,new RegExp(`/enem/provas-e-gabaritos/${y.year}$`));assert.ok(y.days[1]);assert.ok(y.days[2])}
});

test('2016 preserva estrutura histórica e 2017/2018 preservam mudança de duração',()=>{
 const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('data/enem-official-catalog-v28.js'),ctx);const by=Object.fromEntries(ctx.window.GABARITO_ENEM_CATALOG.years.map(y=>[y.year,y]));
 assert.equal(by[2016].days[1].minutes,270);assert.deepEqual(Array.from(by[2016].days[1].areas),['Ciências Humanas','Ciências da Natureza']);
 assert.equal(by[2016].days[2].minutes,330);assert.deepEqual(Array.from(by[2016].days[2].areas),['Linguagens','Matemática']);assert.equal(by[2016].days[2].hasEssay,true);
 assert.equal(by[2017].days[2].minutes,270);assert.equal(by[2018].days[2].minutes,300);
});

test('2016–2024 apontam prova e gabarito oficiais do Inep e 2025 delega ao motor validado',()=>{
 const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('data/enem-official-catalog-v28.js'),ctx);const years=ctx.window.GABARITO_ENEM_CATALOG.years;
 assert.equal(years[0].delegate2025,true);
 for(const y of years.filter(x=>x.year<2025))for(const d of [1,2]){const x=y.days[d];assert.match(x.pdf,/^https:\/\/download\.inep\.gov\.br\//);assert.match(x.key,/^https:\/\/download\.inep\.gov\.br\//);assert.ok(x.pdf.includes(String(y.year)));assert.ok(x.key.includes(String(y.year)))}
});

test('motor histórico mantém gabarito oculto até entrega e registra evolução',()=>{
 const js=read('js/enem-history-v28.js'),css=read('assets/enem-history-v28.css');
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'js/enem-history-v28.js'}));
 assert.match(js,/BIBLIOTECA OFICIAL · 10 EDIÇÕES/);assert.match(js,/gplus_enem_history_exam_v28/);assert.match(js,/gplus_enem_history_results_v28/);assert.match(js,/Abrir gabarito oficial/);assert.match(js,/awaiting-score/);assert.match(js,/20/);assert.match(js,/window\.GABARITO_ENEM_OFFICIAL\?\.start/);
 assert.match(css,/v28-years/);assert.match(css,/v28-number-grid/);assert.match(css,/@media\(max-width:640px\)/);
});
