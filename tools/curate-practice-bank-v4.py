#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'generated'/'practice-curated-v4'
V1='ee84c57e70d870935e470bccdae40db534f5c59c'
V2='cc8e3b696dbc3eaa3e0afc7de7653251cd78506f'
FILES=['2024-d1.ndjson','2024-d2.ndjson','2025-d1.ndjson','2025-d2.ndjson']
VERSION='curated-v4-20260909'


def fold(s):
    s=unicodedata.normalize('NFD',str(s or ''))
    s=''.join(c for c in s if unicodedata.category(c)!='Mn')
    return re.sub(r'\s+',' ',s).strip().lower()


def git_show(ref,path):
    try:return subprocess.check_output(['git','show',f'{ref}:{path}'],cwd=ROOT,text=True,encoding='utf-8',stderr=subprocess.DEVNULL)
    except Exception:return ''


def load_version(ref):
    rows={}
    for name in FILES:
        raw=git_show(ref,f'generated/practice-structured/{name}')
        for line in raw.splitlines():
            if not line.strip():continue
            try:
                row=json.loads(line);rows[row['source_question_key']]=row
            except Exception:pass
    return rows


def load_worktree():
    rows={}
    for name in FILES:
        p=ROOT/'generated'/'practice-structured'/name
        if not p.exists():continue
        for line in p.read_text(encoding='utf-8').splitlines():
            if not line.strip():continue
            try:
                row=json.loads(line);rows[row['source_question_key']]=row
            except Exception:pass
    return rows


def garbage(text):
    t=fold(text)
    if not t:return False
    if len(re.findall(r'enem20\d{2}',t))>=2:return True
    bad=['| caderno ',' caderno 2 |','linguagens, codigos e suas tecnologias e redacao','ciencias da natureza e suas tecnologias |','matematica e suas tecnologias |']
    return any(x in t for x in bad)


def safe(row):
    if not row:return False
    statement=str(row.get('statement_text') or '').strip();options=row.get('options')
    if len(statement)<20 or not isinstance(options,list) or len(options)!=5:return False
    if any(not str(x).strip() for x in options):return False
    if any(fold(x).startswith('alternativa ') and len(fold(x))<20 for x in options):return False
    if garbage(statement) or any(garbage(x) for x in options):return False
    if any('questao ' in fold(x) for x in options):return False
    if any(len(str(x))>520 for x in options):return False
    embedded=sum(1 for line in statement.splitlines() if re.match(r'^\s*[A-E](?:\s|[.)-])',line,re.I))
    return embedded<3


def similarity(a,b):
    if not safe(a) or not safe(b):return 0.0
    return sum(SequenceMatcher(None,fold(x),fold(y)).ratio() for x,y in zip(a['options'],b['options']))/5


def candidate_score(row,source,key):
    statement=str(row.get('statement_text') or '');options=row.get('options') or []
    score=min(len(statement),1800)/30+sum(min(len(str(x)),220) for x in options)/60
    score += 3 if source=='v1' else 2 if source=='v2' else -8
    k=key.lower()
    if '-es-' in k and source=='v2':score+=5
    elif re.search(r'-q00[1-5]$',k) and source=='v1':score+=5
    return score


def visual_row(v3):
    if not v3:return None
    asset=v3.get('full_question_asset_url') or (v3.get('asset_url') if '-question.webp' in str(v3.get('asset_url') or '') else None)
    if not asset:return None
    return {
        **v3,'asset_url':asset,
        'statement_text':'Leia a questão individual apresentada na imagem e assinale a alternativa correta.',
        'options':['Alternativa A','Alternativa B','Alternativa C','Alternativa D','Alternativa E'],
        'content_mode':'official_crop','curation_version':VERSION,'curation_source':'v3-individual-image',
        'curation_confidence':'visual-exact','visual_fallback':True,
    }


def curate(key,sets):
    valid=[(name,row) for name,row in sets.items() if safe(row)];v3=sets.get('v3')
    if safe(sets.get('v1')) and safe(sets.get('v2')):
        sim=similarity(sets['v1'],sets['v2'])
        if sim>=0.72:
            chosen=max([('v1',sets['v1']),('v2',sets['v2'])],key=lambda p:candidate_score(p[1],p[0],key));confidence='high-agreement'
        else:
            chosen=max(valid,key=lambda p:candidate_score(p[1],p[0],key)) if valid else None;confidence='single-best'
    else:
        chosen=max(valid,key=lambda p:candidate_score(p[1],p[0],key)) if valid else None;confidence='single-best'
    if v3 and v3.get('visual_fallback') and not (safe(sets.get('v1')) and safe(sets.get('v2')) and similarity(sets['v1'],sets['v2'])>=0.72):chosen=None
    if chosen:
        source,row=chosen;asset=(v3 or {}).get('asset_url') or row.get('asset_url')
        if asset and '-question.webp' in asset:asset=None
        return {**row,'asset_url':asset,'content_mode':'licensed_text','curation_version':VERSION,'curation_source':source,'curation_confidence':confidence,'visual_fallback':False}
    fallback=visual_row(v3)
    if fallback:return fallback
    if safe(v3):return {**v3,'content_mode':'licensed_text','curation_version':VERSION,'curation_source':'v3-text','curation_confidence':'medium','visual_fallback':False}
    return None


def write_ndjson(path,rows):
    with path.open('w',encoding='utf-8') as f:
        for row in rows:f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')


def main():
    subprocess.run(['git','fetch','--no-tags','origin',V1,V2],cwd=ROOT,check=False,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    OUT.mkdir(parents=True,exist_ok=True)
    for p in OUT.glob('*'):p.unlink()
    versions={'v1':load_version(V1),'v2':load_version(V2),'v3':load_worktree()}
    keys=sorted(versions['v3']);curated=[];rejected=[]
    for key in keys:
        row=curate(key,{name:data.get(key) for name,data in versions.items()})
        (curated if row else rejected).append(row if row else key)
    byfile=defaultdict(list)
    for row in curated:
        m=re.match(r'ENEM-(\d{4})-D(\d)',row['source_question_key'],re.I);byfile[f'{m.group(1)}-d{m.group(2)}.ndjson' if m else 'other.ndjson'].append(row)
    for name,rows in byfile.items():write_ndjson(OUT/name,rows)
    report={'curation_version':VERSION,'input':len(keys),'ready':len(curated),'rejected':len(rejected),'text_ready':sum(not r.get('visual_fallback') for r in curated),'visual_fallback':sum(bool(r.get('visual_fallback')) for r in curated),'coverage_percent':round(100*len(curated)/max(1,len(keys)),2),'sources':dict(sorted({s:sum(r.get('curation_source')==s for r in curated) for s in set(r.get('curation_source') for r in curated)}.items())),'rejected_keys':rejected}
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
    if rejected:raise SystemExit(f'{len(rejected)} questões sem conteúdo seguro')

if __name__=='__main__':main()
