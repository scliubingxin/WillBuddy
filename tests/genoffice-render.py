"""Independent Office compatibility render; NOT GenOffice's own renderer."""
import json
from pathlib import Path
import subprocess
import sys
root=Path(sys.argv[1]).resolve()
render=root/'compatibility-render'
render.mkdir(exist_ok=False)
font=subprocess.check_output(['fc-match','-f','%{lang}',':lang=zh-cn'],text=True)
assert 'zh' in font, 'install CJK fonts before visual validation'
results=[]
for task,ext,expected in [('word_edit','docx','复核'),('excel','xlsx','35'),('slides_edit','pptx','复核')]:
    source=next((root/'state').glob('*/'+task+'/result.'+ext))
    out=render/task;out.mkdir()
    profile=out/'profile'
    subprocess.run(['soffice','-env:UserInstallation='+profile.as_uri(),'--headless','--convert-to','pdf','--outdir',str(out),str(source)],check=True,timeout=90,capture_output=True)
    pdf=out/'result.pdf';assert pdf.is_file() and pdf.stat().st_size>0
    text=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True)
    assert expected in text, (task,text)
    subprocess.run(['pdftoppm','-scale-to','1400','-png',str(pdf),str(out/'page')],check=True,timeout=60,capture_output=True)
    pages=sorted(out.glob('page-*.png'));assert pages
    results.append({'task':task,'pages':len(pages),'pdf_text_verified':True})
(root/'render-report.json').write_text(json.dumps({'engine':'LibreOffice + Poppler, not GenOffice rendering','results':results},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False))
