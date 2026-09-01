import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Vercel expõe aliases oficiais do ENEM 2024 no edge',()=>{
 const cfg=JSON.parse(read('vercel.json'));
 const pairs=new Map((cfg.routes||[]).filter(r=>r.src&&r.dest).map(r=>[r.src,r.dest]));
 assert.equal(pairs.get('^/official/enem/2024/d1\\.pdf$'),'https://riep.inep.gov.br/bitstreams/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/download');
 assert.equal(pairs.get('^/official/enem/2024/gabarito-d1\\.pdf$'),'https://riep.inep.gov.br/bitstreams/01f19cf0-4be9-48df-9a29-f5fe33bbae07/download');
 assert.equal(pairs.get('^/official/enem/2024/d2\\.pdf$'),'https://riep.inep.gov.br/bitstreams/00b05856-bf94-4bfb-b209-65758a35b81b/download');
 assert.equal(pairs.get('^/official/enem/2024/gabarito-d2\\.pdf$'),'https://riep.inep.gov.br/bitstreams/109a33f5-e556-4e51-b9e3-8e0bdf3353d8/download');
});

test('proxy preserva sessão antiga e redireciona 2024 para o edge',()=>{
 const api=read('api/enem-pdf.mjs');
 assert.match(api,/EDGE_ALIASES/);
 assert.match(api,/2024_PV_impresso_D1_CD2\.pdf','\/official\/enem\/2024\/d1\.pdf/);
 assert.match(api,/res\.statusCode=307/);
 assert.match(api,/X-Gabarito-Pdf-Source','vercel-edge-riep/);
});
