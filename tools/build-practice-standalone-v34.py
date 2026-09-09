#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
src=(ROOT/'js'/'practice-standalone-v33.js').read_text(encoding='utf-8')

src=src.replace('window.__GABARITO_PRACTICE_STANDALONE_V33__','window.__GABARITO_PRACTICE_STANDALONE_V34__')
src=src.replace("const VERSION='3.3.0';","const VERSION='3.4.0';")
src=src.replace("const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';\nconst WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';\n",'')
src=src.replace("const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));\n",'')
src=src.replace("const pdfCache=new Map();\n",'')
src=src.replace("let pdfLoader=null;\n",'')
src=src.replace("gplusPracticeStandaloneV33Style","gplusPracticeStandaloneV34Style")
src=src.replace('data-mode="standalone-v33"','data-mode="standalone-v34"')
src=src.replace("window.GABARITO_APP.practiceBank='standalone-v3.3';","window.GABARITO_APP.practiceBank='standalone-v3.4-stored';")
src=src.replace("window.GABARITO_APP.questionBankMode='validated_practice_standalone_v33';","window.GABARITO_APP.questionBankMode='validated_practice_standalone_v34';")

start=src.index('async function loadPdfJs(){')
end=src.index('async function renderCurrent(depth=0){')
stored_only="""async function getContent(q){
  const key=String(q.id);
  if(contentCache.has(key))return contentCache.get(key);
  const stored=storedContent(q);
  if(!stored)throw new Error('Questão aguardando conteúdo estruturado no Banco de Treino.');
  contentCache.set(key,stored);return stored;
}

"""
src=src[:start]+stored_only+src[end:]

needle="  .pv33-statement{font-size:16px;line-height:1.65;color:var(--text);white-space:pre-line}\n"
asset_css="""  .pv33-statement{font-size:16px;line-height:1.65;color:var(--text);white-space:pre-line}
  .pv34-asset-wrap{display:grid;place-items:center;margin:16px 0 18px;padding:10px;border:1px solid var(--border);border-radius:13px;background:#fff;overflow:hidden}
  .pv34-asset{display:block;max-width:100%;height:auto;max-height:760px;object-fit:contain}
"""
if needle not in src:raise SystemExit('CSS base não encontrado')
src=src.replace(needle,asset_css,1)

old="""    <div class=\"pv33-statement\">${esc(content.statement)}</div>
    <div class=\"pv33-options\">"""
new="""    <div class=\"pv33-statement\">${esc(content.statement)}</div>
    ${q.asset_url?`<div class=\"pv34-asset-wrap\"><img class=\"pv34-asset\" src=\"${esc(q.asset_url)}\" alt=\"Imagem individual da questão ${esc(q.original_number)} do ${esc(q.exam)} ${esc(q.year)}\" loading=\"eager\" decoding=\"async\"></div>`:''}
    <div class=\"pv33-options\">"""
if old not in src:raise SystemExit('Render da questão não encontrado')
src=src.replace(old,new,1)

src=src.replace('const q=rows[Math.floor(Math.random()*rows.length)],src=state.sources.get(String(q.source_id));\n  try{await getContent(q,src)}catch{}','const q=rows[Math.floor(Math.random()*rows.length)];\n  try{await getContent(q)}catch{}')
src=src.replace('const content=await getContent(q,src);','const content=await getContent(q);')
src=src.replace('Montando enunciado e alternativas no formato de treino.','Carregando enunciado, alternativas e recursos individuais do Banco de Treino.')

for banned in ['pdfjs-dist','/api/enem-pdf','/api/pism-pdf','getDocument({url:proxy','loadPdfJs','pdfEntry(']:
    if banned in src:raise SystemExit(f'Dependência proibida permaneceu no v3.4: {banned}')
if 'q.asset_url' not in src or "const VERSION='3.4.0'" not in src:
    raise SystemExit('Build v3.4 incompleto')

out=ROOT/'js'/'practice-standalone-v34.js'
out.write_text(src,encoding='utf-8')
print(f'Gerado {out.relative_to(ROOT)} sem PDF.js e sem proxy de prova.')
