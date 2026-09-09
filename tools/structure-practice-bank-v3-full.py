#!/usr/bin/env python3
from pathlib import Path

base=Path(__file__).with_name('structure-practice-bank-v3.py')
source=base.read_text(encoding='utf-8')
old="""statement,options=parse(block)\n                        visual=render_segments(doc,segments,True,asset_path(q))\n                        mode='licensed_text';text_ok+=1;fallback=False"""
new="""statement,options=parse(block)\n                        visual=render_segments(doc,segments,True,asset_path(q))\n                        full_visual=render_segments(doc,segments,False,asset_path(q,'-question'))\n                        mode='licensed_text';text_ok+=1;fallback=False"""
source=source.replace(old,new)
old2="""visual=render_segments(doc,segments,False,asset_path(q,'-question'))\n                        if not visual:raise text_error"""
new2="""visual=render_segments(doc,segments,False,asset_path(q,'-question'))\n                        full_visual=visual\n                        if not visual:raise text_error"""
source=source.replace(old2,new2)
old3="""'asset_url':visual,'source_page_number':loc['page']"""
new3="""'asset_url':visual,'full_question_asset_url':full_visual,'source_page_number':loc['page']"""
source=source.replace(old3,new3)
if source==base.read_text(encoding='utf-8') or 'full_question_asset_url' not in source:
    raise SystemExit('Não foi possível aplicar o patch de fallback integral ao extrator v3.')
ns={'__name__':'__main__','__file__':str(base)}
exec(compile(source,str(base),'exec'),ns,ns)
