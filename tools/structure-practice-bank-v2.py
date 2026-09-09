#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import shutil
import tempfile
import time
import unicodedata
from collections import defaultdict
from pathlib import Path

import fitz
import requests
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'generated' / 'practice-structured'
ASSET_ROOT = ROOT / 'assets' / 'practice' / 'structured'
CONFIG = ROOT / 'js' / 'supabase-config.js'
EXTRACTION_VERSION = 'structured-v2-20260909'
QUESTION_RE = re.compile(r'^QUESTAO\s*0*(\d{1,3})(?:\s|$)', re.I)
OPTION_RE = re.compile(r'^([A-E])(?:\s*[.)\-:]\s*|\s+)(.*)$', re.I)
OPTION_ONLY_RE = re.compile(r'^([A-E])$', re.I)
FALLBACK_PDFS = {
    (2024, 1): 'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD2.pdf',
    (2024, 2): 'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D2_CD5.pdf',
}


def fold(value: str) -> str:
    value = unicodedata.normalize('NFD', str(value or ''))
    value = ''.join(ch for ch in value if unicodedata.category(ch) != 'Mn')
    return re.sub(r'\s+', ' ', value).strip()


def is_boilerplate(text: str) -> bool:
    t = fold(text)
    if not t:
        return True
    patterns = [
        r'^ENEM20\d{2}(?:ENEM20\d{2})+', r'^\*\d+[A-Z0-9]+\*$',
        r'^(CIENCIAS DA NATUREZA|MATEMATICA|LINGUAGENS|CIENCIAS HUMANAS).*(CADERNO|DIA)',
        r'^QUESTOES?(?: DE)?\s+\d+\s+A\s+\d+', r'^\d{1,2}$'
    ]
    return any(re.match(p, t, re.I) for p in patterns)


def q_number(text: str):
    m = QUESTION_RE.match(fold(text))
    return int(m.group(1)) if m else None


def read_config():
    raw = CONFIG.read_text(encoding='utf-8')
    url_m = re.search(r"url:\s*'([^']+)'", raw)
    key_m = re.search(r"publishableKey:\s*'([^']+)'", raw)
    if not url_m or not key_m:
        raise RuntimeError('Configuração Supabase pública não encontrada.')
    return url_m.group(1).rstrip('/'), key_m.group(1)


def rest_get(base: str, key: str, table: str, params: dict):
    headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'}
    rows, offset, size = [], 0, 500
    while True:
        query = {**params, 'limit': size, 'offset': offset}
        r = requests.get(f'{base}/rest/v1/{table}', headers=headers, params=query, timeout=45)
        r.raise_for_status()
        page = r.json()
        if not isinstance(page, list):
            break
        rows.extend(page)
        if len(page) < size:
            break
        offset += size
    return rows


def _download_once(url: str, dest: Path):
    headers = {'User-Agent': 'Mozilla/5.0 GabaritoPlusEditorial/2.0'}
    with requests.get(url, headers=headers, timeout=(25, 210), stream=True, allow_redirects=True) as r:
        r.raise_for_status()
        with dest.open('wb') as fh:
            for chunk in r.iter_content(1024 * 1024):
                if chunk:
                    fh.write(chunk)
    if dest.read_bytes()[:5] != b'%PDF-':
        raise RuntimeError('Fonte não retornou um PDF válido.')


def download_pdf(src: dict, dest: Path):
    urls = [src.get('source_pdf_url'), FALLBACK_PDFS.get((int(src.get('year') or 0), int(src.get('day') or 0)))]
    urls = [u for i, u in enumerate(urls) if u and u not in urls[:i]]
    errors = []
    for url in urls:
        for attempt in range(4):
            try:
                _download_once(url, dest)
                return url
            except Exception as exc:
                errors.append(f'{url}: {exc}')
                try:
                    dest.unlink()
                except FileNotFoundError:
                    pass
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(' | '.join(errors[-4:]))


def page_lines(page):
    width = page.rect.width
    raw = page.get_text('dict')
    cols = [[], []]
    for block in raw.get('blocks', []):
        if block.get('type') != 0:
            continue
        for line in block.get('lines', []):
            spans = line.get('spans') or []
            text = ' '.join(re.sub(r'\s+', ' ', s.get('text', '')).strip() for s in spans if str(s.get('text', '')).strip()).strip()
            if not text or is_boilerplate(text):
                continue
            bbox = fitz.Rect(line['bbox'])
            # Centro da linha é mais estável que x0 em alternativas e citações largas.
            center = (bbox.x0 + bbox.x1) / 2
            col = 1 if center > width * 0.5 else 0
            cols[col].append({'text': text, 'bbox': [bbox.x0, bbox.y0, bbox.x1, bbox.y1], 'col': col})
    out = []
    for col in (0, 1):
        cols[col].sort(key=lambda x: (x['bbox'][1], x['bbox'][0]))
        out.extend(cols[col])
    return out


def variant_context(lines, index):
    for i in range(index - 1, max(-1, index - 70), -1):
        t = fold(lines[i]['text']).lower()
        if re.match(r'^espanhol\b', t) or ('lingua estrangeira' in t and 'espanhol' in t):
            return 'espanhol'
        if re.match(r'^ingles\b', t) or ('lingua estrangeira' in t and 'ingles' in t):
            return 'ingles'
    return ''


def all_heads(doc):
    pages, heads = {}, defaultdict(list)
    for pno in range(1, doc.page_count + 1):
        lines = page_lines(doc[pno - 1])
        pages[pno] = lines
        for idx, line in enumerate(lines):
            q = q_number(line['text'])
            if q is not None:
                heads[q].append({'page': pno, 'index': idx, 'col': line['col'], 'ctx': variant_context(lines, idx), 'bbox': line['bbox']})
    return pages, heads


def choose_location(q, heads):
    target = int(q['original_number'])
    hits = list(heads.get(target, []))
    if not hits:
        raise RuntimeError('Número da questão não localizado no caderno.')
    variant = fold(q.get('variant') or '').lower()
    if 'espan' in variant:
        exact = [h for h in hits if h['ctx'] == 'espanhol']
        return exact[0] if exact else (hits[1] if len(hits) > 1 else hits[0])
    if 'ingl' in variant:
        exact = [h for h in hits if h['ctx'] == 'ingles']
        return exact[0] if exact else hits[0]
    neutral = [h for h in hits if h['ctx'] not in ('ingles', 'espanhol')]
    return neutral[0] if neutral else hits[0]


def collect_block(doc, pages, loc):
    collected, segments = [], defaultdict(list)
    pno, index, origin_col = loc['page'], loc['index'] + 1, loc['col']
    for pass_no in range(4):
        if pno > doc.page_count:
            break
        lines = pages[pno]
        start_index = index if pass_no == 0 else 0
        for i in range(start_index, len(lines)):
            line = lines[i]
            # Só considera fim de questão dentro do mesmo fluxo/coluna.
            if q_number(line['text']) is not None and line['col'] == (origin_col if pass_no == 0 else line['col']):
                return collected, segments
            if pass_no == 0 and line['col'] != origin_col:
                continue
            collected.append(line)
            segments[pno].append(line)
        pno += 1
        index = 0
    return collected, segments


def option_start(line):
    text = str(line['text'] or '').strip()
    m = OPTION_RE.match(text)
    if m:
        return m.group(1).upper(), (m.group(2) or '').strip()
    m = OPTION_ONLY_RE.match(text)
    return (m.group(1).upper(), '') if m else None


def parse_block(lines):
    clean = [dict(x, text=re.sub(r'\s+', ' ', x['text']).strip()) for x in lines if str(x.get('text') or '').strip()]
    candidates = []
    for idx, line in enumerate(clean):
        start = option_start(line)
        if start:
            candidates.append({'index': idx, 'letter': start[0], 'rest': start[1], 'x0': line['bbox'][0]})
    best = None
    for a in [x for x in candidates if x['letter'] == 'A']:
        found, cursor = [a], a['index']
        for letter in 'BCDE':
            pool = [x for x in candidates if x['index'] > cursor and x['index'] <= cursor + 24 and x['letter'] == letter]
            if not pool:
                found = []
                break
            nxt = min(pool, key=lambda x: (abs(x['x0'] - a['x0']), x['index']))
            if abs(nxt['x0'] - a['x0']) > 95:
                found = []
                break
            found.append(nxt)
            cursor = nxt['index']
        if len(found) == 5:
            span = found[-1]['index'] - found[0]['index']
            xspread = max(x['x0'] for x in found) - min(x['x0'] for x in found)
            score = span + xspread * 0.12
            if best is None or score < best[0]:
                best = (score, found)
    if best is None:
        raise RuntimeError('Alternativas A-E não estruturadas com segurança.')
    marks = best[1]
    statement_lines = clean[:marks[0]['index']]
    statement = '\n'.join(x['text'] for x in statement_lines).strip()
    options = []
    for i, mark in enumerate(marks):
        end = marks[i + 1]['index'] if i < 4 else len(clean)
        pieces = ([mark['rest']] if mark['rest'] else []) + [x['text'] for x in clean[mark['index'] + 1:end]]
        options.append(' '.join(x for x in pieces if x).strip())
    if len(statement) < 12:
        raise RuntimeError('Enunciado insuficiente.')
    if len(options) != 5 or any(len(x) < 1 for x in options):
        raise RuntimeError('Questão incompleta.')
    # Sinais fortes de mistura de duas questões/colunas.
    embedded_choices = sum(1 for line in statement.splitlines() if re.match(r'^[A-E](?:\s|[.)-])', line.strip()))
    if embedded_choices >= 3:
        raise RuntimeError('Bloco misturou alternativas de outra questão.')
    if any('QUESTÃO ' in x.upper() or 'QUESTAO ' in fold(x).upper() for x in options):
        raise RuntimeError('Bloco ultrapassou o limite da questão.')
    if any(len(x) > 520 for x in options):
        raise RuntimeError('Alternativa longa demais; provável mistura de coluna.')
    return statement, options


def _render_masked_visual(page, clip, lines, scale=1.8):
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=clip, alpha=False)
    img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
    draw = ImageDraw.Draw(img)
    for line in lines:
        r = fitz.Rect(line['bbox'])
        if not r.intersects(clip):
            continue
        draw.rectangle((max(0, int((r.x0 - clip.x0) * scale) - 4), max(0, int((r.y0 - clip.y0) * scale) - 4), min(img.width, int((r.x1 - clip.x0) * scale) + 4), min(img.height, int((r.y1 - clip.y0) * scale) + 4)), fill='white')
    bg = Image.new('RGB', img.size, 'white')
    diff = ImageChops.difference(img, bg).convert('L')
    mask = diff.point(lambda p: 255 if p > 24 else 0)
    bbox = mask.getbbox()
    if not bbox:
        return None
    crop = img.crop(bbox)
    nonwhite = sum(1 for p in mask.crop(bbox).getdata() if p)
    return crop if crop.width >= 80 and crop.height >= 55 and nonwhite >= 900 else None


def visual_asset(doc, q, loc, segments):
    rendered = []
    for pno, lines in sorted(segments.items()):
        if not lines:
            continue
        page = doc[pno - 1]
        col = loc['col'] if pno == loc['page'] else max(set(x['col'] for x in lines), key=lambda c: sum(1 for x in lines if x['col'] == c))
        relevant = [x for x in lines if x['col'] == col] or lines
        y0, y1 = max(0, min(x['bbox'][1] for x in relevant) - 5), min(page.rect.height, max(x['bbox'][3] for x in relevant) + 5)
        if y1 - y0 < 35:
            continue
        x0, x1 = (0, page.rect.width * 0.54) if col == 0 else (page.rect.width * 0.46, page.rect.width)
        crop = _render_masked_visual(page, fitz.Rect(x0, y0, x1, y1), relevant)
        if crop:
            rendered.append(crop)
    if not rendered:
        return None
    width, gap = max(x.width for x in rendered), 12
    canvas = Image.new('RGB', (width, sum(x.height for x in rendered) + gap * (len(rendered) - 1)), 'white')
    y = 0
    for img in rendered:
        canvas.paste(img, ((width - img.width) // 2, y)); y += img.height + gap
    rel_dir = Path(str(q['year'])) / f"d{q.get('day') or 0}"
    out_dir = ASSET_ROOT / rel_dir; out_dir.mkdir(parents=True, exist_ok=True)
    name = re.sub(r'[^A-Za-z0-9_.-]+', '-', q['source_question_key']) + '.webp'
    dest = out_dir / name
    canvas.save(dest, 'WEBP', quality=84, method=6)
    return '/' + str(dest.relative_to(ROOT)).replace(os.sep, '/')


def write_ndjson(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')


def main():
    OUT.mkdir(parents=True, exist_ok=True); ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    for p in OUT.glob('*.ndjson'):
        p.unlink()
    base, key = read_config()
    sources = rest_get(base, key, 'practice_question_sources', {'select': 'id,source_key,exam,institution,year,application,module,day,booklet,source_pdf_url,answer_key_url,rights_status,verified_at', 'order': 'year.asc,day.asc'})
    questions = rest_get(base, key, 'practice_questions', {'select': 'id,source_id,source_question_key,exam,year,application,module,day,original_number,variant,area,subject,topic,skill,correct_answer,status', 'status': 'eq.published', 'order': 'year.asc,day.asc,original_number.asc'})
    by_source = defaultdict(list)
    for q in questions: by_source[str(q['source_id'])].append(q)
    source_map = {str(s['id']): s for s in sources}
    successes, failures, per_source = [], [], []
    tmp = Path(tempfile.mkdtemp(prefix='gplus-structure-v2-'))
    try:
        for source_id, qs in sorted(by_source.items(), key=lambda item: (source_map.get(item[0], {}).get('year', 0), source_map.get(item[0], {}).get('day', 0))):
            src = source_map.get(source_id)
            if not src:
                failures.extend({'source_question_key': q['source_question_key'], 'error': 'Fonte ausente.'} for q in qs); continue
            pdf_path = tmp / f"{src['source_key']}.pdf"
            try:
                actual_url = download_pdf(src, pdf_path)
                doc = fitz.open(pdf_path); pages, heads = all_heads(doc)
            except Exception as exc:
                failures.extend({'source_question_key': q['source_question_key'], 'error': f'Falha na fonte: {exc}'} for q in qs); continue
            src_ok = src_fail = 0
            for q in qs:
                loc = None; block = []; segments = defaultdict(list)
                try:
                    loc = choose_location(q, heads)
                    block, segments = collect_block(doc, pages, loc)
                    statement, options = parse_block(block)
                    asset_url = visual_asset(doc, q, loc, segments)
                    successes.append({'id': q['id'], 'source_question_key': q['source_question_key'], 'statement_text': statement, 'options': options, 'asset_url': asset_url, 'source_page_number': loc['page'], 'content_mode': 'licensed_text', 'extraction_version': EXTRACTION_VERSION, 'provenance_patch': {'structured_extraction': EXTRACTION_VERSION, 'structured_from_source_key': src['source_key'], 'structured_page': loc['page'], 'structured_method': 'pdf_text_plus_visual_mask', 'download_url_used': actual_url}})
                    src_ok += 1
                except Exception as exc:
                    failures.append({'id': q.get('id'), 'source_question_key': q['source_question_key'], 'year': q['year'], 'day': q.get('day'), 'original_number': q['original_number'], 'variant': q.get('variant') or '', 'page': loc['page'] if loc else None, 'error': str(exc), 'block_preview': [x['text'] for x in block[:70]]})
                    src_fail += 1
            per_source.append({'source_key': src['source_key'], 'questions': len(qs), 'structured': src_ok, 'failed': src_fail, 'download_url_used': actual_url})
            doc.close()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    grouped = defaultdict(list)
    for row in successes:
        m = re.match(r'ENEM-(\d{4})-D(\d)', row['source_question_key'], re.I)
        grouped[f"{m.group(1)}-d{m.group(2)}" if m else 'other'].append(row)
    for name, rows in grouped.items(): write_ndjson(OUT / f'{name}.ndjson', rows)
    write_ndjson(OUT / 'failures.ndjson', failures)
    report = {'extraction_version': EXTRACTION_VERSION, 'published_questions': len(questions), 'structured': len(successes), 'failed': len(failures), 'with_visual_asset': sum(1 for x in successes if x.get('asset_url')), 'coverage_percent': round(100 * len(successes) / max(1, len(questions)), 2), 'per_source': per_source}
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
