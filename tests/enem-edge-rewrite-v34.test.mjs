import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('ENEM 2024 usa aliases same-origin que evitam a função serverless',()=>{
 const cfg=JSON.parse(read('vercel.json'));
 const pairs=new Map((cfg.routes||[]).filter(r=>r.src&&r.dest).map(r=>[r.src,r.dest]));
 assert.equal(pairs.get('^/official/enem/2024/d1\\.pdf$'),'https://riep.inep.gov.br/bitstreams/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/download');
 assert.equal(pairs.get('^/official/enem/2024/d2\\.pdf$'),'https://riep.inep.gov.br/bitstreams/00b05856-bf94-4bfb-b209-65758a35b81b/download');
});

test('leitor mapeia sessão antiga de 2024 para alias da Vercel',()=>{
 const js=read('js/enem-document-v32.js');
 assert.match(js,/2024_PV_impresso_D1_CD2\.pdf/);
 assert.match(js,/\/official\/enem\/2024\/d1\.pdf/);
 assert.match(js,/2024_PV_impresso_D2_CD5\.pdf/);
 assert.match(js,/\/official\/enem\/2024\/d2\.pdf/);
});
