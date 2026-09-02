import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ui=fs.readFileSync(path.join(root,'js/gabarito-ui.js'),'utf8');

test('interface pública remove link editorial e linguagem técnica',()=>{
 assert.match(ui,/document\.getElementById\('adminLink'\)\?\.remove\(\)/);
 assert.match(ui,/document\.title='Gabarito\+ — ENEM & PISM'/);
 assert.match(ui,/Seu progresso/);
 assert.match(ui,/Conteúdo atualizado/);
 assert.match(ui,/Modo offline/);
});
