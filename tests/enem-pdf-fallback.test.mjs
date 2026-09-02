import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const api=fs.readFileSync(path.join(root,'api/enem-pdf.mjs'),'utf8');

test('proxy ENEM aceita apenas hosts oficiais e possui fallback RIEP 2024',()=>{
 assert.match(api,/download\.inep\.gov\.br/);
 assert.match(api,/riep\.inep\.gov\.br/);
 assert.match(api,/2024_PV_impresso_D1_CD2\.pdf/);
 assert.match(api,/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/);
 assert.match(api,/2024_PV_impresso_D2_CD5\.pdf/);
 assert.match(api,/00b05856-bf94-4bfb-b209-65758a35b81b/);
 assert.match(api,/RIEP_FALLBACKS/);
 assert.match(api,/X-Gabarito-Pdf-Source/);
});

test('proxy mantém timeout, limite de tamanho e não vira proxy aberto',()=>{
 assert.match(api,/ALLOWED_HOSTS/);
 assert.match(api,/url\.protocol!==['"]https:['"]/);
 assert.match(api,/setTimeout\(\(\)=>controller\.abort\(\),20000\)/);
 assert.match(api,/MAX_PDF_BYTES/);
 assert.match(api,/looksLikePdf/);
});

test('proxy entrega PDF completo em resposta 200 sem streaming parcial',()=>{
 assert.match(api,/response\.arrayBuffer\(\)/);
 assert.match(api,/Content-Length/);
 assert.match(api,/res\.statusCode=200/);
 assert.doesNotMatch(api,/Readable\.fromWeb/);
 assert.doesNotMatch(api,/headers\.range/);
});
