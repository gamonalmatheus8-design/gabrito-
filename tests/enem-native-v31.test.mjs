import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('runner ENEM nativo 3.1 existe e tem sintaxe válida',()=>{
 const files=['data/enem-official-native-v31.js','js/enem-native-v31.js','js/enem-native-integration-v31.js'];
 for(const f of files){assert.ok(fs.existsSync(path.join(root,f)),f);assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}))}
 assert.ok(fs.existsSync(path.join(root,'assets/enem-native-v31.css')));
});

test('runner só ativa prova nativa quando existem 90 itens oficiais válidos',()=>{
 const js=read('js/enem-native-v31.js'),data=read('data/enem-official-native-v31.js');
 assert.match(js,/rows\.length===90&&missing\.length===0/);
 assert.match(js,/q\.options\.length!==5/);
 assert.match(js,/languageMatches/);
 assert.match(data,/não converte questões autorais em oficiais/);
 assert.doesNotMatch(js,/<iframe/i);
});

test('questão nativa oferece resposta, navegação e marcação para revisão',()=>{
 const js=read('js/enem-native-v31.js'),integration=read('js/enem-native-integration-v31.js');
 assert.match(js,/v31-option/);
 assert.match(js,/data-v31-prev/);
 assert.match(js,/data-v31-next/);
 assert.match(js,/data-v31-review/);
 assert.match(integration,/gplus_enem_official_v27/);
 assert.match(integration,/data-letter/);
 assert.match(integration,/data-q/);
 assert.match(integration,/marked/);
});

test('integração preserva o PDF atual como fallback até o acervo nativo ficar completo',()=>{
 const integration=read('js/enem-native-integration-v31.js'),official=read('js/enem-official-v27.js');
 assert.match(integration,/if\(!status\.complete\)return false/);
 assert.match(official,/<iframe/);
 assert.match(integration,/v31NativeReady/);
});

test('lazy loader carrega dados, runner e integração antes da camada mobile',()=>{
 const lazy=read('js/lazy-simulators-v32.js'),boot=read('js/gabarito-bootstrap.js');
 const official=lazy.indexOf("js/enem-official-v27.js");
 const data=lazy.indexOf("data/enem-official-native-v31.js");
 const native=lazy.indexOf("js/enem-native-v31.js");
 const integration=lazy.indexOf("js/enem-native-integration-v31.js");
 const mobile=lazy.indexOf("js/enem-mobile-v30.js");
 assert.ok(official>=0&&data>official&&native>data&&integration>native&&mobile>integration);
 assert.match(lazy,/assets\/enem-native-v31\.css/);
 assert.doesNotMatch(boot,/enem-native-v31/);
});
