"""Private preview-only LibreOfficeKit process; one document open at a time."""
import ctypes as C, sys, os, json, pathlib, re
P=C.c_void_p
ABI=json.loads(pathlib.Path(__file__).with_name('ABI.json').read_text())['classes']
class Handle(C.Structure):_fields_=[('pClass',P)]
def method(obj,cls,name,ret,*args):
 vt=C.cast(obj,C.POINTER(Handle)).contents.pClass;idx=ABI[cls].index(name)+1
 if (idx+1)*C.sizeof(P)>C.c_size_t.from_address(vt).value:raise ValueError('LibreOfficeKit ABI unavailable')
 ptr=P.from_address(vt+idx*C.sizeof(P)).value
 if not ptr:raise ValueError('LibreOfficeKit method unavailable')
 return C.CFUNCTYPE(ret,P,*args)(ptr)
def reply(i,**data):print('WBKIT '+json.dumps({'id':i,**data},ensure_ascii=False),flush=True)
base=pathlib.Path(sys.argv[1]).resolve();root=pathlib.Path(sys.argv[2]).resolve()
os.environ['SAL_USE_VCLPLUGIN']='svp';os.environ['SAL_LOG']='-WARN'
libfile=base/'../Frameworks/libmergedlo.dylib' if sys.platform=='darwin' else base/'libsofficeapp.so'
lib=C.CDLL(str(libfile.resolve()),mode=C.RTLD_GLOBAL);hook=lib.libreofficekit_hook_2;hook.argtypes=[C.c_char_p,C.c_char_p];hook.restype=P
kit=hook(str(base).encode(),(root/'profile').as_uri().encode())
if not kit:raise RuntimeError('LibreOfficeKit initialization failed')
def office(name,ret,*args):return method(kit,'LibreOfficeKitClass',name,ret,*args)
reply(0,ready=True)
for line in sys.stdin:
 if len(line)>1024:break
 p={};doc=None
 try:
  p=json.loads(line);i=p['id'];op=p['op']
  if op=='reset':
   jobs=root/'jobs'
   if set(p)!=set(['id','op']) or jobs.is_symlink() or not jobs.is_dir() or any(jobs.iterdir()):raise ValueError('Residual preview job data prevents reuse')
   reply(i,result={'clean':True});continue
  if op!='render' or set(p)!=set(['id','op','jobId','format']):raise ValueError('Invalid preview request')
  name=p['jobId'];fmt=p['format']
  if not isinstance(name,str) or not re.fullmatch('[a-f0-9]{32}',name) or fmt not in ['docx','xlsx','pptx']:raise ValueError('Invalid preview job')
  jobs=(root/'jobs').resolve();job=(jobs/name).resolve()
  if job.parent!=jobs or not job.is_dir():raise ValueError('Invalid job directory')
  source=job/('document.'+fmt);output=job/'output'/'document.pdf'
  if source.is_symlink() or not source.is_file() or output.exists() or output.parent.is_symlink() or output.parent.resolve().parent!=job:raise ValueError('Invalid preview paths')
  doc=office('documentLoad',P,C.c_char_p)(kit,source.as_uri().encode())
  if not doc:raise ValueError('LibreOfficeKit document open failed')
  call=lambda n,r,*a:method(doc,'LibreOfficeKitDocumentClass',n,r,*a)
  call('initializeForRendering',None,C.c_char_p)(doc,b'{}')
  if not call('saveAs',C.c_int,C.c_char_p,C.c_char_p,C.c_char_p)(doc,output.as_uri().encode(),b'pdf',None):raise ValueError('Office PDF export failed')
  call('destroy',None)(doc);doc=None
  reply(i,result={'saved':True})
 except Exception as e:
  if doc:
   try:method(doc,'LibreOfficeKitDocumentClass','destroy',None)(doc)
   except Exception:pass
  reply(p.get('id',-1),error=str(e)[:300])
os._exit(0)
