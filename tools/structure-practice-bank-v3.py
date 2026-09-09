#!/usr/bin/env python3
from __future__ import annotations

import json, os, re, shutil, tempfile, time, unicodedata
from collections import defaultdict
from pathlib import Path

import fitz
import requests
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'generated' / 'practice-structured'
ASSET_ROOT = ROOT / 'assets' / 'practice' / 'structured'
CONFIG = ROOT / 'js' / 'supabase-config.js'
VERSION = 'structured-v3-20260909'
Q_RE = re.compile(r'^QUESTAO\s*0*(\d{1,3})(?:\s|$)', re.I)
OPT_RE = re.compile(r'^([A-E])(?:\s*[.)\-:]\s*|\s+)(.*)$', re.I)
OPT_ONLY_RE = re.compile(r'^([A-E])$', re.I)
FALLBACK_PDFS = {
    (2024, 1): 'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD2.pdf',
    (2024, 2): 'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D2_CD5.pdf',
}


def fold(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s).strip()


def qnum(s):
    m = Q_RE.match(fold(s))
    return int(m.group(1)) if m else None


def boiler(s):
    t = fold(s)
    if not t: return True
    return any(re.match(p, t, re.I) for p in [
        r'^ENEM20\d{2}(?:ENEM20\d{2})+', r'^\*\d+[A-Z0-9]+\*$',
        r'^(CIENCIAS DA NATUREZA|MATEMATICA|LINGUAGENS|CIENCIAS HUMANAS).*(CADERNO|DIA)',
        r'^QUESTOES?(?: DE)?\s+\d+\s+A\s+\d+', r'^\d{1,2}$'
    ])


def config():
    raw = CONFIG.read_text(encoding='utf-8')
    u = re.search(r"url:\s*'([^']+)'", raw)
    k = re.search(r"publishableKey:\s*'([^']+)'", raw)
    if not u or not k: raise RuntimeError('Supabase config ausente')
    return u.group(1).rstrip('/'), k.group(1)


def rest_all(base, key, table, params):
    headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'}
    out, offset = [], 0
    while True:
        r = requests.get(f'{base}/rest/v1/{table}', headers=headers, params={**params, 'limit': 500, 'offset': offset}, timeout=45)
        r.raise_for_status(); page = r.json()
        if not isinstance(page, list): break
        out.extend(page)
        if len(page) < 500: break
        offset += 500
    return out


def download_once(url, dest):
    with requests.get(url, headers={'User-Agent':'Mozilla/5.0 GabaritoPlusEditorial/3.0'}, timeout=(25,210), stream=True, allow_redirects=True) as r:
        r.raise_for_status()
        with dest.open('wb') as f:
            for chunk in r.iter_content(1024*1024):
                if chunk: f.write(chunk)
    if dest.read_bytes()[:5] != b'%PDF-': raise RuntimeError('resposta não é PDF')


def download(src, dest):
    urls = [src.get('source_pdf_url'), FALLBACK_PDFS.get((int(src.get('year') or 0), int(src.get('day') or 0)))]
    urls = [u for i,u in enumerate(urls) if u and u not in urls[:i]]
    errors=[]
    for url in urls:
        for n in range(4):
            try: download_once(url,dest); return url
            except Exception as e:
                errors.append(str(e)); dest.unlink(missing_ok=True); time.sleep(1+n)
    raise RuntimeError('download falhou: '+ ' | '.join(errors[-3:]))


def cell_lines(page, col):
    w,h = page.rect.width,page.rect.height
    # Divide no centro físico da folha; pequena folga interna evita trazer texto da coluna vizinha.
    clip = fitz.Rect(0,0,w*0.505,h) if col==0 else fitz.Rect(w*0.495,0,w,h)
    d = page.get_text('dict', clip=clip, sort=True)
    lines=[]
    for b in d.get('blocks',[]):
        if b.get('type') != 0: continue
        for ln in b.get('lines',[]):
            spans=ln.get('spans') or []
            text=' '.join(re.sub(r'\s+',' ',str(s.get('text') or '')).strip() for s in spans if str(s.get('text') or '').strip()).strip()
            if not text or boiler(text): continue
            r=fitz.Rect(ln['bbox'])
            # Linhas do miolo só entram na coluna que contém a maior parte de sua caixa.
            cx=(r.x0+r.x1)/2
            if col==0 and cx>w*0.54: continue
            if col==1 and cx<w*0.46: continue
            lines.append({'text':text,'bbox':[r.x0,r.y0,r.x1,r.y1],'col':col})
    lines.sort(key=lambda x:(x['bbox'][1],x['bbox'][0]))
    return clip, lines


def build_cells(doc):
    cells=[]; heads=defaultdict(list); ordered=[]
    for pno in range(1,doc.page_count+1):
        page=doc[pno-1]
        for col in (0,1):
            clip,lines=cell_lines(page,col)
            ci=len(cells); cells.append({'page':pno,'col':col,'clip':clip,'lines':lines})
            for idx,line in enumerate(lines):
                n=qnum(line['text'])
                if n is None: continue
                ctx=''
                for j in range(idx-1,max(-1,idx-70),-1):
                    t=fold(lines[j]['text']).lower()
                    if 'espanhol' in t or 'lengua espanola' in t or 'lingua espanhola' in t: ctx='espanhol'; break
                    if 'ingles' in t or 'lingua inglesa' in t or 'english' in t: ctx='ingles'; break
                hit={'n':n,'cell':ci,'index':idx,'page':pno,'col':col,'ctx':ctx,'bbox':line['bbox']}
                heads[n].append(hit); ordered.append(hit)
    ordered.sort(key=lambda h:(h['cell'],h['bbox'][1]))
    order_pos={id(h):i for i,h in enumerate(ordered)}
    return cells,heads,ordered,order_pos


def locate(q,heads,ordered):
    hits=list(heads.get(int(q['original_number']),[]))
    if not hits: raise RuntimeError('número não localizado')
    v=fold(q.get('variant') or '').lower()
    if 'espan' in v:
        exact=[h for h in hits if h['ctx']=='espanhol']; loc=exact[0] if exact else hits[-1]
    elif 'ingl' in v:
        exact=[h for h in hits if h['ctx']=='ingles']; loc=exact[0] if exact else hits[0]
    else:
        loc=hits[0]
    pos=next((i for i,h in enumerate(ordered) if h is loc),None)
    nxt=ordered[pos+1] if pos is not None and pos+1<len(ordered) else None
    return loc,nxt


def collect(cells,loc,nxt):
    end_cell=nxt['cell'] if nxt else len(cells)-1
    out=[]; segments=[]
    for ci in range(loc['cell'],end_cell+1):
        cell=cells[ci]; lines=cell['lines']
        start=loc['index']+1 if ci==loc['cell'] else 0
        end=nxt['index'] if nxt and ci==nxt['cell'] else len(lines)
        chosen=lines[start:end]
        if chosen:
            out.extend(chosen); segments.append({'cell':cell,'lines':chosen})
    return out,segments


def opt_start(line):
    t=str(line['text'] or '').strip(); m=OPT_RE.match(t)
    if m:return m.group(1).upper(),(m.group(2) or '').strip()
    m=OPT_ONLY_RE.match(t); return (m.group(1).upper(),'') if m else None


def parse(lines):
    clean=[dict(x,text=re.sub(r'\s+',' ',x['text']).strip()) for x in lines if str(x.get('text') or '').strip()]
    cand=[]
    for i,l in enumerate(clean):
        s=opt_start(l)
        if s:cand.append({'index':i,'letter':s[0],'rest':s[1],'x':l['bbox'][0]})
    best=None
    for a in [x for x in cand if x['letter']=='A']:
        found=[a];cur=a['index']
        for letter in 'BCDE':
            pool=[x for x in cand if cur<x['index']<=cur+26 and x['letter']==letter]
            if not pool: found=[];break
            nx=min(pool,key=lambda x:(abs(x['x']-a['x']),x['index']))
            if abs(nx['x']-a['x'])>105: found=[];break
            found.append(nx);cur=nx['index']
        if len(found)==5:
            score=(found[-1]['index']-found[0]['index'])+.1*(max(x['x'] for x in found)-min(x['x'] for x in found))
            if best is None or score<best[0]:best=(score,found)
    if not best:raise RuntimeError('alternativas textuais não reconhecidas')
    marks=best[1]
    statement='\n'.join(x['text'] for x in clean[:marks[0]['index']]).strip()
    options=[]
    for i,m in enumerate(marks):
        end=marks[i+1]['index'] if i<4 else len(clean)
        parts=([m['rest']] if m['rest'] else [])+[x['text'] for x in clean[m['index']+1:end]]
        options.append(' '.join(p for p in parts if p).strip())
    if len(statement)<12 or any(not x for x in options):raise RuntimeError('conteúdo textual incompleto')
    if any('QUESTAO ' in fold(x).upper() for x in options):raise RuntimeError('limite inválido')
    if any(len(x)>650 for x in options):raise RuntimeError('alternativa suspeita')
    embedded=sum(1 for line in statement.splitlines() if re.match(r'^[A-E](?:\s|[.)-])',line.strip()))
    if embedded>=3:raise RuntimeError('mistura de alternativas')
    return statement,options


def render_segments(doc,segments,mask_text,filename):
    pieces=[]
    for seg in segments:
        cell=seg['cell'];lines=seg['lines'];page=doc[cell['page']-1]
        if not lines:continue
        y0=max(0,min(x['bbox'][1] for x in lines)-7);y1=min(page.rect.height,max(x['bbox'][3] for x in lines)+7)
        clip=fitz.Rect(cell['clip'].x0,y0,cell['clip'].x1,y1)
        scale=1.9;pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),clip=clip,alpha=False)
        img=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
        if mask_text:
            draw=ImageDraw.Draw(img)
            for line in lines:
                r=fitz.Rect(line['bbox'])
                draw.rectangle((max(0,int((r.x0-clip.x0)*scale)-4),max(0,int((r.y0-clip.y0)*scale)-4),min(img.width,int((r.x1-clip.x0)*scale)+4),min(img.height,int((r.y1-clip.y0)*scale)+4)),fill='white')
            bg=Image.new('RGB',img.size,'white');diff=ImageChops.difference(img,bg).convert('L');mask=diff.point(lambda p:255 if p>24 else 0);box=mask.getbbox()
            if not box:continue
            nonwhite=sum(1 for p in mask.crop(box).getdata() if p)
            img=img.crop(box)
            if img.width<80 or img.height<55 or nonwhite<900:continue
        pieces.append(img)
    if not pieces:return None
    width=max(i.width for i in pieces);gap=12;height=sum(i.height for i in pieces)+gap*(len(pieces)-1)
    canvas=Image.new('RGB',(width,height),'white');y=0
    for img in pieces:canvas.paste(img,((width-img.width)//2,y));y+=img.height+gap
    filename.parent.mkdir(parents=True,exist_ok=True);canvas.save(filename,'WEBP',quality=86,method=6)
    return '/'+str(filename.relative_to(ROOT)).replace(os.sep,'/')


def asset_path(q,suffix=''):
    d=ASSET_ROOT/str(q['year'])/f"d{q.get('day') or 0}"
    stem=re.sub(r'[^A-Za-z0-9_.-]+','-',q['source_question_key'])+suffix+'.webp'
    return d/stem


def write_ndjson(path,rows):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',encoding='utf-8') as f:
        for row in rows:f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')


def main():
    OUT.mkdir(parents=True,exist_ok=True);ASSET_ROOT.mkdir(parents=True,exist_ok=True)
    for p in OUT.glob('*.ndjson'):p.unlink()
    base,key=config()
    sources=rest_all(base,key,'practice_question_sources',{'select':'id,source_key,exam,institution,year,application,module,day,booklet,source_pdf_url,answer_key_url,rights_status,rights_note,verified_at','order':'year.asc,day.asc'})
    qs=rest_all(base,key,'practice_questions',{'select':'id,source_id,source_question_key,exam,year,application,module,day,original_number,variant,area,subject,topic,skill,correct_answer,status','status':'eq.published','order':'year.asc,day.asc,original_number.asc'})
    by=defaultdict(list)
    for q in qs:by[str(q['source_id'])].append(q)
    sm={str(s['id']):s for s in sources};rows=[];failures=[];stats=[];tmp=Path(tempfile.mkdtemp(prefix='gplus-v3-'))
    try:
        for sid,group in sorted(by.items(),key=lambda x:(sm.get(x[0],{}).get('year',0),sm.get(x[0],{}).get('day',0))):
            src=sm[sid];pdf=tmp/(src['source_key']+'.pdf')
            try:
                used=download(src,pdf);doc=fitz.open(pdf);cells,heads,ordered,_=build_cells(doc)
            except Exception as e:
                failures.extend({'source_question_key':q['source_question_key'],'error':f'fonte: {e}'} for q in group);continue
            text_ok=visual_fallback=hard_fail=0
            for q in group:
                try:
                    loc,nxt=locate(q,heads,ordered);block,segments=collect(cells,loc,nxt)
                    try:
                        statement,options=parse(block)
                        visual=render_segments(doc,segments,True,asset_path(q))
                        mode='licensed_text';text_ok+=1;fallback=False
                    except Exception as text_error:
                        # Fallback é uma imagem SOMENTE da questão individual, nunca do caderno inteiro.
                        visual=render_segments(doc,segments,False,asset_path(q,'-question'))
                        if not visual:raise text_error
                        statement='Consulte a questão individual apresentada na imagem e assinale a alternativa correta.'
                        options=[f'Alternativa {x}' for x in 'ABCDE']
                        mode='official_crop';visual_fallback+=1;fallback=True
                    rows.append({'id':q['id'],'source_question_key':q['source_question_key'],'statement_text':statement,'options':options,'asset_url':visual,'source_page_number':loc['page'],'content_mode':mode,'extraction_version':VERSION,'visual_fallback':fallback,'provenance_patch':{'structured_extraction':VERSION,'structured_from_source_key':src['source_key'],'structured_page':loc['page'],'structured_method':'individual_question_visual' if fallback else 'column_geometry_text_plus_visual','download_url_used':used,'rights_note':src.get('rights_note')}})
                except Exception as e:
                    hard_fail+=1;failures.append({'id':q.get('id'),'source_question_key':q['source_question_key'],'year':q['year'],'day':q.get('day'),'original_number':q['original_number'],'variant':q.get('variant') or '','error':str(e)})
            stats.append({'source_key':src['source_key'],'questions':len(group),'text_structured':text_ok,'visual_fallback':visual_fallback,'failed':hard_fail,'download_url_used':used})
            doc.close()
    finally:shutil.rmtree(tmp,ignore_errors=True)
    grouped=defaultdict(list)
    for r in rows:
        m=re.match(r'ENEM-(\d{4})-D(\d)',r['source_question_key'],re.I);grouped[f'{m.group(1)}-d{m.group(2)}' if m else 'other'].append(r)
    for name,data in grouped.items():write_ndjson(OUT/(name+'.ndjson'),data)
    write_ndjson(OUT/'failures.ndjson',failures)
    report={'extraction_version':VERSION,'published_questions':len(qs),'ready':len(rows),'text_structured':sum(1 for r in rows if not r['visual_fallback']),'visual_fallback':sum(1 for r in rows if r['visual_fallback']),'failed':len(failures),'coverage_percent':round(100*len(rows)/max(1,len(qs)),2),'per_source':stats}
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
