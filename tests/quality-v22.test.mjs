import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('lista editorial preserva exclusões anteriores e inclui a nova curadoria',()=>{const ctx={};vm.createContext(ctx);vm.runInContext(read('data/editorial-exclusions.js'),ctx);const manifest=JSON.parse(read('data/question-bank-manifest.json'));assert.equal(ctx.GABARITO_ARCHIVED_QUESTION_IDS.length,71+manifest.archived);assert.equal(new Set(ctx.GABARITO_ARCHIVED_QUESTION_IDS).size,ctx.GABARITO_ARCHIVED_QUESTION_IDS.length);for(const id of ['Q008','Q061','Q168','Q397','P300967','E301500','Q113','E301120','P301021','Q110','Q155','Q192','EXP1A-E001'])assert.ok(ctx.GABARITO_ARCHIVED_QUESTION_IDS.includes(id));const published=JSON.parse(read('supabase/seeds/questions.json'));assert.ok(published.every(q=>!ctx.GABARITO_ARCHIVED_QUESTION_IDS.includes(q.id)))});

test('camada de qualidade é isolada e não bloqueia a liberação do app',()=>{const boot=read('js/gabarito-bootstrap.js');assert.match(boot,/await loadLocalBank\(\)/);assert.match(boot,/async function loadQualityLayer\(\)\{try\{/);assert.match(boot,/Camada de qualidade indisponível/);assert.match(boot,/function scheduleIdle\(fn,delay=0\)/);const ready=boot.indexOf('window.GABARITO_APP.ready=true');const quality=boot.indexOf('scheduleIdle(loadQualityLayer,0)');assert.ok(ready>0&&quality>ready,'quality layer deve iniciar somente depois de ready=true')});

test('landing possui SEO, metodologia, transparência e sincronização honesta',()=>{const html=read('landing-clean.html');assert.match(html,/rel="canonical" href="https:\/\/gabarito-mais\.vercel\.app\/"/);assert.match(html,/property="og:image"/);assert.match(html,/id="metodologia"/);assert.match(html,/id="editorial"/);assert.match(html,/Ao entrar, a sincronização entre dispositivos fica disponível/i);assert.match(html,/depoimentos só entram com evidência verificável/i);assert.doesNotMatch(html,/>Gabarito\+ — Supabase</)});

test('camada de confiança explica recomendação, questão e discursiva',()=>{const js=read('js/quality-v22.js');assert.match(js,/Orientação explicável/);assert.match(js,/Confiança:/);assert.match(js,/dificuldade exibida é editorial/i);assert.match(js,/Resposta de referência ainda não publicada/);assert.match(js,/gplus_discursive_progress_v22/);assert.match(js,/Conta e sincronização/)});

test('dashboard fica focado na experiência v39 sem remover o DOM legado',()=>{const css=read('assets/quality-v22.css');assert.match(css,/#page-home > \*:not\(\.header-row\):not\(\.v39-home\)\{display:none!important\}/)});
