import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reader=fs.readFileSync(path.join(root,'js/enem-document-v32.js'),'utf8');
const api=fs.readFileSync(path.join(root,'api/enem-pdf.mjs'),'utf8');

test('leitor da apresentação evita requisições range e streaming do PDF.js',()=>{
 assert.match(reader,/VERSION='3\.3\.0'/);
 assert.match(reader,/disableRange:true/);
 assert.match(reader,/disableStream:true/);
 assert.match(reader,/disableAutoFetch:true/);
 assert.match(api,/response\.arrayBuffer\(\)/);
 assert.match(api,/Readable\.fromWeb\(response\.body\)/);
});

test('falha externa não expõe mensagem técnica ao usuário',()=>{
 assert.match(reader,/showFriendlyFailure/);
 assert.match(reader,/Caderno oficial temporariamente indisponível/);
 assert.match(reader,/Seu cartão-resposta e seu progresso continuam salvos/);
 assert.match(reader,/Tentar novamente/);
 assert.doesNotMatch(reader,/loading\.innerHTML=.*error\?\.message/);
});
