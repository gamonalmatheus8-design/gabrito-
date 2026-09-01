import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const js=fs.readFileSync(path.join(root,'api/enem-pdf.mjs'),'utf8');

test('ENEM 2024 usa RIEP antes do host download sem redirect no navegador',()=>{
 assert.match(js,/return riep\?\[riep,primary\]:\[primary\]/);
 assert.doesNotMatch(js,/statusCode=307/);
 assert.doesNotMatch(js,/EDGE_ALIASES/);
 assert.match(js,/riep-primary/);
 assert.match(js,/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/);
});
