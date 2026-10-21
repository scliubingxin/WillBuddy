"""Real GenOffice CLI through the protected local HTTP and DAG, never a fake engine.
Set MUYUN_GENOFFICE_BIN; packaged CLI may use GENOFFICE_NODE for Node 22+.
"""
import hashlib
import base64
import http.client
import json
from pathlib import Path
import re
import sys
import threading
import time
import zipfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'local-runner'))
from engine import Runner, TERMINAL
from server import make_server
from restore_checkpoint import restore

out = Path(sys.argv[1] if len(sys.argv)>1 else 'outputs/genoffice-live').resolve()
out.mkdir(parents=True, exist_ok=False)
runner = Runner(out / 'state', 2)
server = make_server(runner, 0)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
conn = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=10)
conn.request('GET', '/')
page = conn.getresponse().read().decode()
token = re.search(r"const token='([^']+)'", page).group(1)
headers = {'Content-Type': 'application/json', 'X-Muyun-Session': token,
           'Origin': f'http://127.0.0.1:{server.server_port}'}
def call(path, payload=None):
    conn.request('POST' if payload else 'GET', '/api/'+path,
                 json.dumps(payload, ensure_ascii=False).encode() if payload else None, headers)
    response = conn.getresponse()
    raw = response.read()
    assert response.status < 300, raw.decode()[:1000]
    return raw if path.startswith('files/') else json.loads(raw)
def task(ident, action, payload='', deps=(), **extra):
    return {'id':ident, 'kind':'genoffice', 'title':ident, 'action':action,
            'payload':payload, 'dependsOn':list(deps), **extra}
try:
    assert call('capabilities')['genoffice']['ready'], 'GenOffice not installed'
    prepared=call('genoffice-plan', {'action':'create_docx','payload':'# 幕云AI计划验收'})
    assert prepared['tasks'][0]['action']=='create_docx'
    tasks = [
        task('word','create_docx','# 幕云AI验收\n\n采购金额为 35 元。\n\n| 项目 | 金额 |\n| --- | --- |\n| 设备 | 35 |'),
        task('excel','create_xlsx', [['项目','金额'],['设备',12],['轴承',23],['合计','=SUM(B2:B3)']]),
        task('slides','create_pptx',[{'op':'addElement','target':{'slide':0},'kind':'textbox',
             'offset':{'x':914400,'y':914400,'cx':7000000,'cy':1800000},
             'paragraphs':[{'runs':[{'text':'幕云AI · 文档操作验收','fontSize':28}]}]}]),
        task('word_edit','docs_apply',[{'op':'insert_content','html':'<p>已完成复核。</p>'}],['word']),
        task('word_read','docs_read',deps=['word_edit']),
        task('word_check','docs_check',deps=['word_edit']),
        task('excel_read','sheet_read',deps=['excel']),
        task('excel_check','sheet_check',deps=['excel']),
        task('plain_excel','create_xlsx', [['项目','金额'],['设备',12],['轴承',23]]),
        task('excel_edit','sheet_apply',[{'op':'set_cell','address':'B2','value':20}],['plain_excel']),
        task('excel_after','sheet_read',deps=['excel_edit']),
        task('formula_edit','sheet_apply',[{'op':'set_cell','address':'B2','value':20}],['excel']),
        task('formula_after','sheet_read',deps=['formula_edit']),
        task('cross_excel','create_xlsx', {'sheets':[
            {'name':'明细','rows':[['项目','金额'],['设备',12],['轴承',23]]},
            {'name':'汇总','rows':[['指标','值'],['总额','=SUM(明细!B2:B3)'],['设备加倍','=明细!B2*2']]}
        ]}),
        task('cross_edit','sheet_apply',[{'op':'set_cell','sheet':'明细','address':'B2','value':20}],['cross_excel']),
        task('slides_read','slides_read',deps=['slides']),
        task('slides_audit','slides_audit',deps=['slides']),
        task('slides_edit','slides_apply',[{'op':'addElement','target':{'slide':0},'kind':'textbox',
             'offset':{'x':914400,'y':3500000,'cx':7000000,'cy':1000000},
             'paragraphs':[{'runs':[{'text':'复核通过','fontSize':20}]}]}],['slides']),
        task('structure','info',deps=['word']),
        task('word_markdown','convert',deps=['word_edit'],to='md'),
        task('word_preview','render',deps=['word_edit']),
        task('excel_preview','render',deps=['formula_edit']),
        task('slides_preview','render',deps=['slides_edit']),
    ]
    acceptance = [
        {'id':'edited_word', 'task':'word_edit', 'type':'artifact_exists', 'extension':'.docx', 'minBytes':1000},
        {'id':'word_content', 'task':'word_markdown', 'type':'text_contains', 'extension':'.md', 'value':'已完成复核'},
        {'id':'formula_result', 'task':'formula_after', 'type':'json_equals', 'extension':'.json',
         'path':['detail','rows',3,1], 'expected':43},
        {'id':'edited_slides', 'task':'slides_edit', 'type':'artifact_exists', 'extension':'.pptx', 'minBytes':1000},
    ]
    plan=call('validate',{'plan':{'name':'GenOffice 中文文档实测','tasks':tasks,'acceptance':acceptance}})
    run=call('run',{'plan':plan})
    deadline=time.monotonic()+180
    while time.monotonic()<deadline:
        runner.tick()
        run=next(r for r in call('state')['runs'] if r['id']==run['id'])
        if run['status'] in TERMINAL:break
        time.sleep(.1)
    results=[{'id':t['id'],'status':t['status'],'error':t.get('error')} for t in run['tasks']]
    print(json.dumps(results,ensure_ascii=False))
    assert run['status']=='succeeded', results
    assert run['acceptance']['status']=='passed', run['acceptance']
    assert len(run['acceptance']['results'])==4
    files=[]
    for t in run['tasks']:
        for relative in t['result']['files']:
            raw=call('files/'+relative)
            assert raw==runner.artifact(relative).read_bytes()
            files.append({'task':t['id'],'name':Path(relative).name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
    word=next(t for t in run['tasks'] if t['id']=='word_edit')
    with zipfile.ZipFile(runner.artifact(word['result']['files'][0])) as z:
        assert z.testzip() is None
        xml=z.read('word/document.xml').decode()
        assert '已完成复核' in xml and '35' in xml
    read=next(t for t in run['tasks'] if t['id']=='excel_read')
    report=runner.artifact(read['result']['files'][0]).read_text()
    assert '35' in report and 'SUM(B2:B3)' in report, report[:1000]
    edited=next(t for t in run['tasks'] if t['id']=='excel_after')
    edited_report=json.loads(runner.artifact(edited['result']['files'][0]).read_text())
    assert edited_report['detail']['rows'][1][1]==20, 'edited value must equal 20'
    formula_edit=next(t for t in run['tasks'] if t['id']=='formula_edit')
    formula_edit_report=json.loads(runner.artifact(next(path for path in formula_edit['result']['files'] if path.endswith('genoffice-report.json'))).read_text())
    assert formula_edit_report['detail']['formula_refresh']['count']==1
    recalculated=next(t for t in run['tasks'] if t['id']=='formula_after')
    recalculated_report=json.loads(runner.artifact(recalculated['result']['files'][0]).read_text())
    assert recalculated_report['detail']['rows'][1][1]==20
    assert recalculated_report['detail']['rows'][3][1]==43, 'SUM cache must be recalculated to 43'
    cross_edit=next(t for t in run['tasks'] if t['id']=='cross_edit')
    cross_report=json.loads(runner.artifact(next(path for path in cross_edit['result']['files'] if path.endswith('genoffice-report.json'))).read_text())
    refresh=cross_report['detail']['formula_refresh']
    assert refresh['count']==2 and refresh['sheets']==['汇总']
    changes={(item['sheet'],item['cell']):(item['before'],item['after']) for item in refresh['cache_changes']}
    assert changes[('汇总','B2')]==('35','43'), changes
    assert changes[('汇总','B3')]==('24','40'), changes
    slide=next(t for t in run['tasks'] if t['id']=='slides_edit')
    with zipfile.ZipFile(runner.artifact(slide['result']['files'][0])) as z:
        assert z.testzip() is None
        assert '复核通过' in z.read('ppt/slides/slide1.xml').decode()
    checkpoints = []
    by_id = {t['id']: t for t in run['tasks']}
    dependencies = {'word_edit':'word', 'excel_edit':'plain_excel', 'formula_edit':'excel',
                    'cross_edit':'cross_excel', 'slides_edit':'slides'}
    for edit_id, source_id in dependencies.items():
        edited_task = by_id[edit_id]
        checkpoint_path = runner.artifact(next(path for path in edited_task['result']['files'] if path.endswith('edit-checkpoint.zip')))
        result_path = runner.artifact(next(path for path in edited_task['result']['files']
                                           if Path(path).suffix in {'.docx','.xlsx','.pptx'}))
        source_path = runner.artifact(next(path for path in by_id[source_id]['result']['files']
                                           if Path(path).suffix == result_path.suffix))
        with zipfile.ZipFile(checkpoint_path) as archive:
            manifest = json.loads(archive.read('MANIFEST.json'))
            original = archive.read(manifest['before']['path'])
            assert original == source_path.read_bytes()
            assert hashlib.sha256(result_path.read_bytes()).hexdigest() == manifest['after']['sha256']
        restored = out / f'restored-{edit_id}{result_path.suffix}'
        restored_result = restore(checkpoint_path, result_path, restored)
        assert restored.read_bytes() == source_path.read_bytes()
        conflict = out / f'conflict-{edit_id}{result_path.suffix}'
        conflict.write_bytes(result_path.read_bytes() + b'conflict')
        refused = False
        try:
            restore(checkpoint_path, conflict, out / f'must-not-exist-{edit_id}{result_path.suffix}')
        except ValueError as error:
            refused = '新修改' in str(error)
        assert refused
        checkpoints.append({'task': edit_id, 'before_sha256': manifest['before']['sha256'],
                            'after_sha256': manifest['after']['sha256'],
                            'restore_sha256': restored_result['sha256'], 'conflict_refused': refused})
    # The upload/plan endpoint is separately validated with actual generated OOXML.
    upload=call('genoffice-plan', {'action':'info','input':{'extension':'.docx',
        'base64':base64.b64encode(runner.artifact(word['result']['files'][0]).read_bytes()).decode()}})
    assert upload['tasks'][0]['input']['extension']=='.docx'
    previews = {}
    for task_id in ('word_preview', 'excel_preview', 'slides_preview'):
        preview = next(t for t in run['tasks'] if t['id'] == task_id)
        page_files = [path for path in preview['result']['files'] if path.endswith('.png')]
        assert page_files and all(runner.artifact(path).read_bytes().startswith(b'\x89PNG') for path in page_files)
        preview_report = json.loads(runner.artifact(next(path for path in preview['result']['files'] if path.endswith('genoffice-report.json'))).read_text())
        assert preview_report['detail']['engine'] == 'LibreOffice + Poppler'
        assert preview_report['detail']['pages'] == len(page_files)
        previews[task_id] = {'pages': len(page_files), 'engine': preview_report['detail']['engine'],
                             'files': page_files}
    rejected_plan = call('validate', {'plan': {'name':'不达标成果拒绝实测',
        'tasks':[{'id':'draft','kind':'document','title':'验收失败样例','text':'这是待复核草稿','dependsOn':[]}],
        'acceptance':[{'id':'approval','task':'draft','type':'text_contains','extension':'.fodt','value':'已批准发布'}]}})
    rejected = call('run', {'plan': rejected_plan})
    deadline = time.monotonic()+10
    while time.monotonic()<deadline:
        runner.tick()
        rejected = next(r for r in call('state')['runs'] if r['id']==rejected['id'])
        if rejected['status'] in TERMINAL: break
        time.sleep(.05)
    assert rejected['status']=='failed' and rejected['tasks'][0]['status']=='succeeded'
    assert rejected['acceptance']['status']=='failed'
    assert '未包含' in rejected['acceptance']['results'][0]['error']
    report={'passed':True,'scope':'real GenOffice CLI via authenticated loopback HTTP/DAG, no models',
            'tasks':results,'files':files,
            'acceptance':{'positive':run['acceptance'],
                          'negative':rejected['acceptance'],
                          'negative_task_status':rejected['tasks'][0]['status']},
            'formula_known_answers':{'same_sheet':{'before':35,'after':43},
                                     'cross_sheet':{'sum_before':35,'sum_after':43,'double_before':24,'double_after':40}},
            'browser_e2e':False,
            'office_previews':previews,
            'edit_checkpoints':checkpoints,
            'genoffice_native_render':'not executed; compatibility previews use LibreOffice + Poppler',
            'model_requests':0}
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))
finally:
    conn.close();server.shutdown();server.server_close();runner.close()
