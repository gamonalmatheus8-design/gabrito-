import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Writable} from 'node:stream';
import handler from '../api/pism-pdf.mjs';

class MockResponse extends Writable{
 constructor(){super();this.statusCode=0;this.headers=new Map();this.chunks=[]}
 setHeader(name,value){this.headers.set(String(name).toLowerCase(),String(value))}
 _write(chunk,encoding,done){this.chunks.push(Buffer.from(chunk));done()}
 body(){return Buffer.concat(this.chunks)}
}
const pdf=Buffer.from('%PDF-1.7\n');

test('proxy PISM transmite caderno grande diretamente da UFJF',async()=>{
 const originalFetch=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return new Response(pdf,{status:200,headers:{'content-type':'application/pdf','content-length':String(6*1024*1024)}})};
 try{
  const res=new MockResponse(),url='https://www2.ufjf.br/copese/wp-content/uploads/sites/42/2025/12/Pism-1-dia-1.pdf';
  await handler({query:{url}},res);
  assert.deepEqual(calls,[url]);
  assert.equal(res.statusCode,200);
  assert.equal(res.headers.get('x-gabarito-pdf-source'),'ufjf-streamed');
  assert.equal(res.body().toString(),pdf.toString());
 }finally{globalThis.fetch=originalFetch}
});

test('proxy PISM valida PDF pequeno e repete falha temporária',async()=>{
 const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;if(calls===1)throw new TypeError('conexão encerrada');return new Response(pdf,{status:200,headers:{'content-type':'application/pdf','content-length':String(pdf.length)}})};
 try{
  const res=new MockResponse();
  await handler({query:{url:'https://www2.ufjf.br/copese/files/2018/12/PISM-2019-I-DIA-1.pdf'}},res);
  assert.equal(calls,2);
  assert.equal(res.statusCode,200);
  assert.equal(res.headers.get('x-gabarito-pdf-source'),'ufjf-buffered');
  assert.equal(res.body().toString(),pdf.toString());
 }finally{globalThis.fetch=originalFetch}
});

test('proxy PISM fica restrito a PDFs hospedados pela UFJF',()=>{
 const source=fs.readFileSync(new URL('../api/pism-pdf.mjs',import.meta.url),'utf8');
 assert.match(source,/hostname==='ufjf\.br'/);
 assert.match(source,/endsWith\('\.ufjf\.br'\)/);
 assert.match(source,/pathname\.toLowerCase\(\)\.endsWith\('\.pdf'\)/);
 assert.match(source,/MAX_PDF_BYTES/);
 assert.match(source,/SOURCE_ATTEMPTS=2/);
});
