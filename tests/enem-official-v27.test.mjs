import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('js/enem-official-v27.js');
const seq=name=>{const m=js.match(new RegExp(`${name}='([^']+)'`));assert.ok(m,`sequência ${name}`);return m[1].split(/\s+/)};

test('camada ENEM oficial 2.7 existe e tem sintaxe válida',()=>{
 for(const f of ['js/enem-official-v27.js','assets/enem-official-v27.css'])assert.ok(fs.existsSync(path.join(root,f)),f);
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'js/enem-official-v27.js'}));
});

test('modo oficial aponta para o repositório do INEP e atribui CC BY 4.0',()=>{
 assert.match(js,/riep\.inep\.gov\.br\/items\/ca4bcb51-f523-495b-8b49-704c0f155ba8\/full/);
 assert.match(js,/a11f89c6-3693-49f0-8164-2794b5dac372/);
 assert.match(js,/d43be9d0-2316-42bf-9ea7-dc4475645c52/);
 assert.match(js,/creativecommons\.org\/licenses\/by\/4\.0/);
 assert.match(js,/Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira/);
 assert.doesNotMatch(js,/options\s*:/i);
});

test('gabarito do caderno amarelo 2025 tem cobertura integral e anuladas preservadas',()=>{
 const en=seq('D1_EN'),es=seq('D1_ES'),ling=seq('D1_LING'),hum=seq('D1_HUM'),d2=seq('D2');
 assert.equal(en.length,5);assert.equal(es.length,5);assert.equal(ling.length,40);assert.equal(hum.length,45);assert.equal(d2.length,90);
 assert.deepEqual(en,['A','E','D','D','D']);
 assert.deepEqual(es,['D','B','A','C','D']);
 assert.equal(ling.at(-1),'A');
 assert.equal(hum[0],'C');assert.equal(hum.at(-1),'B');
 assert.equal(d2[0],'C');assert.equal(d2.at(-1),'C');
 assert.deepEqual(d2.map((x,i)=>x==='X'?91+i:null).filter(Boolean),[115,121,178]);
});

test('experiência oficial mantém tempo real, cartão-resposta e não inventa TRI',()=>{
 assert.match(js,/minutes:330/);assert.match(js,/minutes:300/);
 assert.match(js,/Cartão-resposta/);assert.match(js,/90 marcadas/);
 assert.match(js,/O ENEM calcula a nota com TRI/);
 assert.match(js,/acertos brutos/);
 assert.match(js,/beforeunload/);
});

test('lazy loader carrega a camada oficial somente ao abrir Simulados',()=>{
 const boot=read('js/gabarito-bootstrap.js'),lazy=read('js/lazy-simulators-v32.js');
 assert.match(lazy,/assets\/enem-official-v27\.css/);
 assert.match(lazy,/js\/enem-official-v27\.js/);
 assert.doesNotMatch(boot,/enem-official-v27/);
 assert.match(boot,/const VERSION='3\.3\.0'/);
});

