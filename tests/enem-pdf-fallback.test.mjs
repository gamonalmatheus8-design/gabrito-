import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const api=fs.readFileSync(path.join(root,'api/enem-pdf.mjs'),'utf8');

test('proxy ENEM aceita apenas hosts oficiais e possui fallback RIEP de 2016 a 2024',()=>{
 assert.match(api,/download\.inep\.gov\.br/);
 assert.match(api,/riep\.inep\.gov\.br/);
 assert.match(api,/2024_PV_impresso_D1_CD2\.pdf/);
 assert.match(api,/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/);
 assert.match(api,/2024_PV_impresso_D2_CD5\.pdf/);
 assert.match(api,/00b05856-bf94-4bfb-b209-65758a35b81b/);
 assert.match(api,/RIEP_FALLBACKS/);
 assert.match(api,/X-Gabarito-Pdf-Source/);
 for(const year of [2016,2017,2018,2019,2020,2021,2022,2023,2024])assert.match(api,new RegExp(String(year)));
 assert.match(api,/dcb0d85d-5da4-48ee-b49a-e34db65c9c8b/);
 assert.match(api,/6f6e6a08-9f0b-4365-9f52-a24c5e4ab2e7/);
});

test('proxy mantém timeout, limite de tamanho e não vira proxy aberto',()=>{
 assert.match(api,/ALLOWED_HOSTS/);
 assert.match(api,/url\.protocol!==['"]https:['"]/);
 assert.match(api,/setTimeout\(\(\)=>controller\.abort\(\),20000\)/);
 assert.match(api,/SOURCE_ATTEMPTS=2/);
 assert.match(api,/MAX_PDF_BYTES/);
 assert.match(api,/looksLikePdf/);
});

test('proxy mantém buffer para arquivos menores e transmite cadernos grandes',()=>{
 assert.match(api,/response\.arrayBuffer\(\)/);
 assert.match(api,/Content-Length/);
 assert.match(api,/res\.statusCode=200/);
 assert.match(api,/STREAM_PDF_BYTES/);
 assert.match(api,/Readable\.fromWeb/);
 assert.doesNotMatch(api,/headers\.range/);
});
