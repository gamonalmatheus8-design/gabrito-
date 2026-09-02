import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('Cloudflare Pages expõe proxy same-origin do ENEM',()=>{
 const fn=read('functions/api/enem-pdf.js');
 assert.match(fn,/export async function onRequestGet/);
 assert.match(fn,/RIEP_FIRST/);
 assert.match(fn,/71aaf57d-a5b7-4300-bd8b-fcf2ec490570/);
 assert.match(fn,/x-gabarito-pdf-source/);
 assert.doesNotMatch(fn,/res\.statusCode=307/);
});

test('Cloudflare Pages preserva landing e rota do aplicativo',()=>{
 const redirects=read('_redirects');
 assert.match(redirects,/^\/ \/landing-clean\.html 200/m);
 assert.match(redirects,/^\/app \/index\.html 200/m);
});
