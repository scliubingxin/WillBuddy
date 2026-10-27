"""Private one-document LibreOfficeKit worker; no socket server or arbitrary UNO."""
import ctypes as C, sys, os, json, pathlib, base64, io, re, html
from PIL import Image
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
def num(v,lo,hi):
 if type(v) is not int or not lo<=v<=hi:raise ValueError('Invalid coordinate/limit')
 return v
base=pathlib.Path(sys.argv[1]).resolve();job=pathlib.Path(sys.argv[2]).resolve();fmt=sys.argv[3]
if fmt not in ['docx','xlsx','pptx']:raise ValueError('Format unavailable')
os.environ['SAL_USE_VCLPLUGIN']='svp';os.environ['SAL_LOG']='-WARN'
libfile=base/'../Frameworks/libmergedlo.dylib' if sys.platform=='darwin' else base/'libsofficeapp.so'
lib=C.CDLL(str(libfile.resolve()),mode=C.RTLD_GLOBAL);hook=lib.libreofficekit_hook_2;hook.argtypes=[C.c_char_p,C.c_char_p];hook.restype=P
kit=hook(str(base).encode(),(job/'profile').as_uri().encode())
if not kit:raise RuntimeError('LibreOfficeKit initialization failed')
def office(name,ret,*args):return method(kit,'LibreOfficeKitClass',name,ret,*args)
doc=office('documentLoad',P,C.c_char_p)(kit,(job/('document.'+fmt)).as_uri().encode())
if not doc:raise RuntimeError('LibreOfficeKit document open failed')
def call(name,ret,*types):return method(doc,'LibreOfficeKitDocumentClass',name,ret,*types)
call('initializeForRendering',None,C.c_char_p)(doc,b'{}')
events={}
@C.CFUNCTYPE(None,C.c_int,C.c_char_p,P)
def callback(kind,payload,data):
 if kind in [1,2,8] and payload:events[str(kind)]=payload[:4096].decode('utf8','replace')
call('registerCallback',None,type(callback),P)(doc,callback,None)
def selection():
 used=P();ptr=call('getTextSelection',P,C.c_char_p,C.POINTER(P))(doc,b'text/plain;charset=utf-8',C.byref(used))
 try:return C.string_at(ptr).decode('utf8','replace')[:12001] if ptr else ''
 finally:
  free=office('freeError',None)
  if ptr:free(ptr)
  if used.value:free(used)
def snapshot(p):
 w=num(p.get('width',900),200,1024);h=num(p.get('height',700),200,900);x=num(p.get('x',0),0,2000000);y=num(p.get('y',0),0,2000000);scale=num(p.get('scale',15),8,30)
 dw=C.c_long();dh=C.c_long();call('getDocumentSize',None,C.POINTER(C.c_long),C.POINTER(C.c_long))(doc,C.byref(dw),C.byref(dh));parts=call('getParts',C.c_int)(doc)
 if not 1<=parts<=100:raise ValueError('Document part limit:100')
 buf=(C.c_ubyte*(w*h*4))();call('setClientZoom',None,*([C.c_int]*4))(doc,w,h,w*scale,h*scale);call('setClientVisibleArea',None,*([C.c_int]*4))(doc,x,y,w*scale,h*scale);call('paintTile',None,P,*([C.c_int]*6))(doc,buf,w,h,x,y,w*scale,h*scale)
 mode=call('getTileMode',C.c_int)(doc);stream=io.BytesIO();Image.frombytes('RGBA',(w,h),bytes(buf),'raw','RGBA' if mode==0 else 'BGRA').save(stream,format='PNG');names=[]
 for part in range(parts):
  ptr=call('getPartName',P,C.c_int)(doc,part)
  try:names.append(C.string_at(ptr).decode('utf8','replace')[:100] if ptr else str(part+1))
  finally:
   if ptr:office('freeError',None)(ptr)
 return {'png':base64.b64encode(stream.getvalue()).decode(),'width':w,'height':h,'x':x,'y':y,'scale':scale,'documentWidth':dw.value,'documentHeight':dh.value,'parts':names,'part':call('getPart',C.c_int)(doc),'selection':selection(),'events':dict(events)}
reply(0,ready=True)
for line in sys.stdin:
 if len(line)>20000:break
 p={}
 try:
  p=json.loads(line);i=p['id'];op=p['op']
  if op=='close':reply(i,closed=True);os._exit(0)
  if op=='snapshot':result=snapshot(p)
  elif op=='mouse':call('postMouseEvent',None,*([C.c_int]*6))(doc,num(p['type'],0,2),num(p['x'],0,2000000),num(p['y'],0,2000000),num(p.get('count',1),1,2),num(p.get('buttons',1),0,1),0);result={}
  elif op=='paste':
   text=p['text']
   if not isinstance(text,str) or not text or len(text)>4000 or '\x00' in text:raise ValueError('Text limit')
   if fmt=='xlsx' and any(cell.lstrip().startswith('=') for row in text.split('\n') for cell in row.split('\t')):raise ValueError('Native spreadsheet formula input is not enabled; use existing bounded formula editor')
   mime=b'text/plain;charset=utf-8'
   if fmt=='xlsx' and ('\t' in text or '\n' in text):
    rows=[line.split('\t') for line in text.replace('\r\n','\n').split('\n')]
    if len(rows)>100 or max(map(len,rows))>32 or sum(map(len,rows))>1000:raise ValueError('Table input limit')
    text='<html><body><table>'+''.join('<tr>'+''.join('<td>'+html.escape(cell)+'</td>' for cell in row)+'</tr>' for row in rows)+'</table></body></html>';mime=b'text/html'
   b=text.encode()
   if not call('paste',C.c_bool,C.c_char_p,C.c_char_p,C.c_size_t)(doc,mime,b,len(b)):raise ValueError('Office rejected paste')
   result={}
  elif op=='command':
   cmd=p['command']
   if cmd not in ['.uno:Bold','.uno:Italic','.uno:Underline','.uno:Undo','.uno:Redo','.uno:SelectAll']:raise ValueError('Command not allowed')
   call('postUnoCommand',None,C.c_char_p,C.c_char_p,C.c_bool)(doc,cmd.encode(),None,False);result={}
  elif op=='range':
   ref=p['ref']
   if not isinstance(ref,str) or not re.fullmatch(r'[A-Z]{1,2}[1-9][0-9]{0,3}(?::[A-Z]{1,2}[1-9][0-9]{0,3})?',ref):raise ValueError('Invalid cell range')
   args=json.dumps({'ToPoint':{'type':'string','value':ref}}).encode();call('postUnoCommand',None,C.c_char_p,C.c_char_p,C.c_bool)(doc,b'.uno:GoToCell',args,False);result={}
  elif op=='part':call('setPart',None,C.c_int)(doc,num(p['part'],0,min(99,call('getParts',C.c_int)(doc)-1)));result={}
  elif op=='save':
   if not call('saveAs',C.c_int,C.c_char_p,C.c_char_p,C.c_char_p)(doc,(job/('edited.'+fmt)).as_uri().encode(),fmt.encode(),None):raise ValueError('Office save failed')
   result={'saved':True}
  else:raise ValueError('Unknown operation')
  reply(i,result=result)
 except Exception as e:reply(p.get('id',-1),error=str(e)[:400])
os._exit(0) # owned process ends without upstream deferred clipboard atexit teardown
