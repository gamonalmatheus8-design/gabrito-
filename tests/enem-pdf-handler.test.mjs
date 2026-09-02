import test from 'node:test';
import assert from 'node:assert/strict';
import {Writable} from 'node:stream';
import handler from '../api/enem-pdf.mjs';

class MockResponse extends Writable{
 constructor(){super();this.statusCode=0;this.headers=new Map();this.chunks=[]}
 setHeader(name,value){this.headers.set(String(name).toLowerCase(),String(value))}
 _write(chunk,encoding,done){this.chunks.push(Buffer.from(chunk));done()}
 body(){return Buffer.concat(this.chunks)}
}

const pdf=Buffer.from('%PDF-1.7\n');

test('caderno histórico grande usa a cópia oficial RIEP e resposta transmitida',async()=>{
 const originalFetch=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return new Response(pdf,{status:200,headers:{'content-type':'application/pdf','content-length':String(5*1024*1024)}})};
 try{
  const res=new MockResponse();
  await handler({query:{url:'https://download.inep.gov.br/educacao_basica/enem/provas/2019/2019_PV_impresso_D1_CD2.pdf'}},res);
  assert.equal(calls[0],'https://riep.inep.gov.br/bitstreams/ef59158b-11f9-4bf7-a9fc-64d801cd06e7/download');
  assert.equal(res.statusCode,200);
  assert.equal(res.headers.get('x-gabarito-pdf-source'),'riep-primary-streamed');
  assert.equal(res.body().toString(),pdf.toString());
 }finally{globalThis.fetch=originalFetch}
});

test('arquivo histórico pequeno continua validado antes da entrega',async()=>{
 const originalFetch=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return new Response(pdf,{status:200,headers:{'content-type':'application/pdf','content-length':String(pdf.length)}})};
 try{
  const res=new MockResponse();
  await handler({query:{url:'https://download.inep.gov.br/enem/provas_e_gabaritos/2021_GB_impresso_D1_CD2.pdf'}},res);
  assert.equal(calls[0],'https://riep.inep.gov.br/bitstreams/47821341-6f1a-432d-bb3c-656133d94130/download');
  assert.equal(res.statusCode,200);
  assert.equal(res.headers.get('x-gabarito-pdf-source'),'riep-primary-buffered');
  assert.equal(res.body().toString(),pdf.toString());
 }finally{globalThis.fetch=originalFetch}
});

test('falha momentânea do Inep é repetida sem interromper o aluno',async()=>{
 const originalFetch=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));if(calls.length===1)throw new TypeError('conexão encerrada');return new Response(pdf,{status:200,headers:{'content-type':'application/pdf','content-length':String(pdf.length)}})};
 try{
  const res=new MockResponse();
  await handler({query:{url:'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD2.pdf'}},res);
  assert.equal(calls.length,2);
  assert.equal(res.statusCode,200);
  assert.equal(res.body().toString(),pdf.toString());
 }finally{globalThis.fetch=originalFetch}
});
