"""Private one-document LibreOfficeKit worker; no socket server or arbitrary UNO."""
import ctypes as C, sys, os, json, pathlib, base64, io, re, html, hashlib, unicodedata, time
from html.parser import HTMLParser
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
events={};command_result=None;ppt_text_active=False
@C.CFUNCTYPE(None,C.c_int,C.c_char_p,P)
def callback(kind,payload,data):
 global command_result
 if kind==16 and payload:command_result=payload[:4096].decode('utf8','replace')
 if kind in [1,2,8,34] and payload:events[str(kind)]=payload[:4096].decode('utf8','replace')
call('registerCallback',None,type(callback),P)(doc,callback,None)
def selection():
 used=P();ptr=call('getTextSelection',P,C.c_char_p,C.POINTER(P))(doc,b'text/plain;charset=utf-8',C.byref(used))
 try:return C.string_at(ptr).decode('utf8','replace')[:12001] if ptr else ''
 finally:
  free=office('freeError',None)
  if ptr:free(ptr)
  if used.value:free(used)
def table_context():
 if fmt!='docx':return None
 used=P();ptr=call('getTextSelection',P,C.c_char_p,C.POINTER(P))(doc,b'text/html',C.byref(used))
 try:source=C.string_at(ptr) if ptr else b''
 finally:
  if ptr:office('freeError',None)(ptr)
  if used.value:office('freeError',None)(used)
 if not source or len(source)>256000:return None
 class TableSelection(HTMLParser):
  def __init__(self):super().__init__();self.tables=0;self.depth=0;self.rows=[];self.bad=False;self.ignore=0
  def handle_starttag(self,tag,attrs):
   if tag in ['style','head']:self.ignore+=1
   if tag=='table':
    self.tables+=1;self.depth+=1
    if self.depth!=1:self.bad=True
   if tag=='tr' and self.depth:self.rows.append(0)
   if tag in ['td','th'] and self.depth:
    if not self.rows:self.bad=True;return
    self.rows[-1]+=1
    if any(k in ['colspan','rowspan'] and v!='1' for k,v in attrs):self.bad=True
  def handle_endtag(self,tag):
   if tag=='table':self.depth-=1
   if tag in ['style','head']:self.ignore=max(0,self.ignore-1)
  def handle_data(self,data):
   if not self.depth and not self.ignore and data.strip():self.bad=True
 parser=TableSelection()
 try:parser.feed(source.decode('utf8'));parser.close()
 except Exception:return None
 if parser.bad or parser.tables!=1 or parser.depth or not 1<=len(parser.rows)<=30 or not parser.rows or not 1<=max(parser.rows)<=16 or len(set(parser.rows))!=1 or sum(parser.rows)>200:return None
 return {'rows':len(parser.rows),'columns':parser.rows[0],'fingerprint':hashlib.sha256(source).hexdigest()}
def cells_context():
 if fmt!='xlsx':return None
 ref=events.get('34','');match=re.fullmatch(r'([A-Z]{1,2})([1-9][0-9]{0,3})(?::([A-Z]{1,2})([1-9][0-9]{0,3}))?',ref)
 if not match:return None
 def col(t):
  n=0
  for c in t:n=n*26+ord(c)-64
  return n
 left=col(match[1]);top=int(match[2]);right=col(match[3] or match[1]);bottom=int(match[4] or match[2]);rows=bottom-top+1;columns=right-left+1
 if min(rows,columns)<1 or right>128 or bottom>5000 or rows>30 or columns>16 or rows*columns>200:return None
 # Confirm the native active cell agrees with the rectangle's top-left. Unknown/drag-end cursors fail closed.
 ptr=call('getCommandValues',P,C.c_char_p)(doc,b'.uno:CellCursor')
 try:cursor=json.loads(C.string_at(ptr)) if ptr else {}
 except Exception:return None
 finally:
  if ptr:office('freeError',None)(ptr)
 try:coords=[int(x.strip()) for x in cursor['commandValues'].split(',')]
 except Exception:return None
 if len(coords)!=6 or coords[-2:]!=[left-1,top-1]:return None
 used=P();ptr=call('getTextSelection',P,C.c_char_p,C.POINTER(P))(doc,b'text/html',C.byref(used))
 try:source=C.string_at(ptr) if ptr else b''
 finally:
  if ptr:office('freeError',None)(ptr)
  if used.value:office('freeError',None)(used)
 if not source or len(source)>256000:return None
 class Shape(HTMLParser):
  def __init__(self):super().__init__();self.tables=0;self.depth=0;self.rows=[];self.bad=False
  def handle_starttag(self,tag,attrs):
   if tag=='table':
    self.tables+=1;self.depth+=1
    if self.depth!=1:self.bad=True
   if tag=='tr' and self.depth:self.rows.append(0)
   if tag in ['td','th'] and self.depth:
    if not self.rows:self.bad=True;return
    self.rows[-1]+=1
    if any(k in ['colspan','rowspan'] and v!='1' for k,v in attrs):self.bad=True
  def handle_endtag(self,tag):
   if tag=='table':self.depth-=1
 parser=Shape()
 try:parser.feed(source.decode('utf8'));parser.close()
 except Exception:return None
 if parser.bad or parser.depth or parser.tables!=1 or parser.rows!=[columns]*rows:return None
 part=call('getPart',C.c_int)(doc)
 if not 0<=part<=99:return None
 canonical=match[1]+match[2]+('' if rows==1 and columns==1 else ':'+(match[3] or match[1])+(match[4] or match[2]))
 return {'ref':canonical,'part':part,'rows':rows,'columns':columns,'fingerprint':hashlib.sha256(str(part).encode()+b'|'+canonical.encode()+b'|'+source).hexdigest()}
def dispatch_completed(command,args,allow_unchanged=False):
 global command_result
 command_result=None
 call('postUnoCommand',None,C.c_char_p,C.c_char_p,C.c_bool)(doc,command,json.dumps(args).encode() if args is not None else None,True)
 deadline=time.monotonic()+2
 while command_result is None and time.monotonic()<deadline:time.sleep(0.002)
 result=json.loads(command_result) if command_result else {}
 if result.get('commandName')!=command.decode() or (not allow_unchanged and result.get('success') is not True) or (allow_unchanged and type(result.get('success')) is not bool):raise ValueError('Native command did not complete')
 # EnterString may report false for unchanged data; only saved XLSX verification can establish success.
def update_cells(p):
 if set(p)!=set(['id','op','cells','values']) or fmt!='xlsx':raise ValueError('Invalid cells request')
 if not isinstance(p['cells'],dict) or any(type(p['cells'].get(k)) is not int for k in ['part','rows','columns']):raise ValueError('Invalid cells metadata')
 current=cells_context()
 if not current or current!=p['cells']:raise ValueError('Native cell selection changed')
 values=p['values']
 if not isinstance(values,list) or len(values)!=current['rows'] or any(not isinstance(row,list) or len(row)!=current['columns'] for row in values):raise ValueError('Cell matrix shape mismatch')
 if len(json.dumps({'values':values},ensure_ascii=False,separators=(',',':')).encode('utf-16-le'))//2>600:raise ValueError('Cell matrix review limit')
 for row in values:
  for value in row:
   literal=isinstance(value,dict)
   if literal:
    if set(value)!=set(['text']):raise ValueError('Invalid literal text fields')
    value=value['text']
   if not isinstance(value,str) or len(value.encode('utf-16-le'))//2>400 or any(ord(c)<32 or 127<=ord(c)<=159 for c in value):raise ValueError('Invalid cell constant')
   start=unicodedata.normalize('NFKC',value).lstrip()
   if not literal and (re.match(r'^[=+@]',start) or start.startswith('-') and not re.fullmatch(r'-[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?',start)):raise ValueError('Formula input forbidden')
 return write_cells(current,values)
def write_cells(current,values):
 match=re.match(r'([A-Z]+)([0-9]+)',current['ref']);left=0
 for c in match[1]:left=left*26+ord(c)-64
 top=int(match[2])
 def label(n):
  result=''
  while n:n,k=divmod(n-1,26);result=chr(65+k)+result
  return result
 def dispatch(command,args):return dispatch_completed(command,args,command==b'.uno:EnterString')
 for y,row in enumerate(values):
  for x,value in enumerate(row):
   call('resetSelection',None)(doc)
   dispatch(b'.uno:GoToCell',{'ToPoint':{'type':'string','value':label(left+x)+str(top+y)}})
   ptr=call('getCommandValues',P,C.c_char_p)(doc,b'.uno:CellCursor')
   try:cursor=json.loads(C.string_at(ptr)) if ptr else {};coordinates=[int(v.strip()) for v in cursor.get('commandValues','').split(',')]
   finally:
    if ptr:office('freeError',None)(ptr)
   if len(coordinates)!=6 or coordinates[-2:]!=[left+x-1,top+y-1] or events.get('34')!=label(left+x)+str(top+y) or call('getPart',C.c_int)(doc)!=current['part']:raise ValueError('Native cell cursor did not reach target '+str(coordinates)+' '+events.get('34','')+' expected '+label(left+x)+str(top+y))
   dispatch(b'.uno:EnterString',{'StringName':{'type':'string','value':(('='+value['formula']) if 'formula' in value else ("'"+value['text'] if value['text'] else "")) if isinstance(value,dict) else value}})
 dispatch(b'.uno:GoToCell',{'ToPoint':{'type':'string','value':current['ref']}})
 return {}
def set_formula(p):
 if fmt!='xlsx' or set(p)!=set(['id','op','cells','formula']):raise ValueError('Invalid formula request')
 current=cells_context()
 if not isinstance(p['cells'],dict) or any(type(p['cells'].get(k)) is not int for k in ['part','rows','columns']) or not current or current!=p['cells'] or current['rows']!=1 or current['columns']!=1:raise ValueError('Native single cell selection changed')
 formula=p['formula']
 if not isinstance(formula,str) or formula.startswith('=') or not 0<len(formula)<=400 or not formula.isascii() or re.search(r'[^A-Z0-9$.()+*/^%,:<>=-]',formula):raise ValueError('Formula characters forbidden')
 tokens=re.findall(r'(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:E[+-]?[0-9]+)?|\$?[A-Z]{1,2}\$?[1-9][0-9]{0,3}|[A-Z]+|[()+*/^%,:<>=-]',formula)
 if ''.join(tokens)!=formula or len(tokens)>200:raise ValueError('Formula token budget or syntax')
 functions={'SUM','AVERAGE','MIN','MAX','COUNT','IF','ROUND'};depth=0;references=0
 def ref(t):
  m=re.fullmatch(r'\$?([A-Z]{1,2})\$?([1-9][0-9]{0,3})',t)
  if not m:return None
  col=0
  for c in m[1]:col=col*26+ord(c)-64
  row=int(m[2])
  if col>128 or row>5000:raise ValueError('Formula reference out of bounds')
  return col,row
 for i,t in enumerate(tokens):
  coord=ref(t)
  if coord:references+=1
  elif re.fullmatch('[A-Z]+',t) and not (t in functions and i+1<len(tokens) and tokens[i+1]=='(') and t not in ['TRUE','FALSE']:raise ValueError('Formula function/name forbidden')
  if t=='(':
   depth+=1
   if depth>40:raise ValueError('Formula depth')
  elif t==')':
   depth-=1
   if depth<0:raise ValueError('Formula parentheses')
  elif t==':':
   a=ref(tokens[i-1]) if i else None;b=ref(tokens[i+1]) if i+1<len(tokens) else None
   if not a or not b or b[0]<a[0] or b[1]<a[1]:raise ValueError('Formula range syntax')
   references+=(b[0]-a[0]+1)*(b[1]-a[1]+1)-2
  if references>10000:raise ValueError('Formula reference budget')
 if depth:raise ValueError('Formula parentheses')
 return write_cells(current,[[{'formula':formula}]])
def format_cells(p):
 if fmt!='xlsx' or set(p)!=set(['id','op','cells','format']):raise ValueError('Invalid cells format request')
 if not isinstance(p['cells'],dict) or any(type(p['cells'].get(k)) is not int for k in ['part','rows','columns']):raise ValueError('Invalid cells metadata')
 current=cells_context()
 if not current or current!=p['cells']:raise ValueError('Native cell selection changed')
 data=p['format']
 if not isinstance(data,dict) or not data or set(data)-set(['fontSize','fontColor','backgroundColor']):raise ValueError('Invalid cell format properties')
 for key in ['fontColor','backgroundColor']:
  if key in data and (not isinstance(data[key],str) or not re.fullmatch(r'#[0-9A-Fa-f]{6}',data[key])):raise ValueError('Invalid cell color')
 size=data.get('fontSize')
 if 'fontSize' in data and (isinstance(size,bool) or not isinstance(size,(float,int)) or not 6<=size<=96 or size*2!=int(size*2)):raise ValueError('Invalid cell font size')
 if size is not None:dispatch_completed(b'.uno:FontHeight',{'FontHeight.Height':{'type':'float','value':size}},True)
 for command,key in [('Color','fontColor'),('BackgroundColor','backgroundColor')]:
  if key in data:dispatch_completed(('.uno:'+command).encode(),{command:{'type':'long','value':int(data[key][1:],16)}},True)
 return {}
def history():
 result={}
 for name in ['undo','redo']:
  ptr=call('getCommandValues',P,C.c_char_p)(doc,('.uno:'+name.title()+'Count').encode())
  try:
   raw=C.string_at(ptr) if ptr else b''
   result[name]=int(raw) if re.fullmatch(rb'[0-9]{1,7}',raw) and int(raw)<=1000000 else None
  finally:
   if ptr:office('freeError',None)(ptr)
 return result
def snapshot(p):
 global ppt_text_active
 if fmt=='pptx' and call('getSelectionType',C.c_int)(doc)==1:ppt_text_active=True
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
 return {'png':base64.b64encode(stream.getvalue()).decode(),'width':w,'height':h,'x':x,'y':y,'scale':scale,'documentWidth':dw.value,'documentHeight':dh.value,'parts':names,'part':call('getPart',C.c_int)(doc),'selection':selection(),'selectionType':call('getSelectionType',C.c_int)(doc),'events':dict(events),'history':history(),'table':table_context(),'cells':cells_context()}
reply(0,ready=True)
for line in sys.stdin:
 if len(line)>20000:break
 p={}
 try:
  p=json.loads(line);i=p['id'];op=p['op']
  if op in ['part','command','paste']:ppt_text_active=False
  if op=='close':reply(i,closed=True);os._exit(0)
  if op=='snapshot':result=snapshot(p)
  elif op=='history':result=history()
  elif op=='cells_context':result={'cells':cells_context()}
  elif op=='cells':result=update_cells(p)
  elif op=='cells_format':result=format_cells(p)
  elif op=='formula':result=set_formula(p)
  elif op=='table_context':result={'table':table_context(),'cells':cells_context()}
  elif op=='navigate':
   # include/vcl/keycodes.hxx + offapi/com/sun/star/awt/Key.idl.
   keys={'ArrowDown':1024,'ArrowUp':1025,'ArrowLeft':1026,'ArrowRight':1027,'Home':1028,'End':1029}
   if fmt not in ['docx','pptx'] or set(p)-set(['id','op','key','shift','control']) or p.get('key') not in keys or type(p.get('shift')) is not bool or type(p.get('control')) is not bool:raise ValueError('Invalid Word navigation key')
   if fmt=='pptx':
    if call('getSelectionType',C.c_int)(doc)==1:ppt_text_active=True
    if not ppt_text_active:raise ValueError('PPT text edit selection required')
   code=keys[p['key']]+(0x1000 if p['shift'] else 0)+(0x2000 if p['control'] else 0)
   # LOK_KEYEVENT_KEYINPUT=0, LOK_KEYEVENT_KEYUP=1. Always release; charCode is zero.
   key_event=call('postKeyEvent',None,C.c_int,C.c_int,C.c_int)
   key_event(doc,0,0,code);key_event(doc,1,0,code);result={}
  elif op=='mouse':
   ppt_text_active=False
   call('postMouseEvent',None,*([C.c_int]*6))(doc,num(p['type'],0,2),num(p['x'],0,2000000),num(p['y'],0,2000000),num(p.get('count',1),1,2),num(p.get('buttons',1),0,1),0);result={}
  elif op=='paste':
   text=p['text']
   if fmt=='docx' and 'expectedSelection' in p:
    if set(p)-set(['id','op','text','expectedSelection']) or not p['expectedSelection'] or selection()!=p['expectedSelection']:raise ValueError('Word native text selection changed')
   if fmt=='pptx' and 'expectedSelection' in p:
    if set(p)-set(['id','op','text','expectedSelection','part']) or type(p.get('part')) is not int or call('getPart',C.c_int)(doc)!=p['part'] or call('getSelectionType',C.c_int)(doc)!=1 or not p['expectedSelection'] or selection()!=p['expectedSelection']:raise ValueError('PPT native text selection changed')
   if not isinstance(text,str) or len(text)>4000 or '\x00' in text:raise ValueError('Text limit')
   if not text:
    # Empty text is permitted only for a confirmed native text selection.
    # Never allow a bare Delete command to affect a shape, cell, or document.
    if fmt not in ['pptx','docx'] or 'expectedSelection' not in p:raise ValueError('Text limit')
    dispatch_completed(b'.uno:Delete',None,True);reply(i,result={});continue
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
   if cmd in ['.uno:Undo','.uno:Redo']:
    before=history();name=cmd[5:].lower();other='redo' if name=='undo' else 'undo'
    if not before.get(name) or before.get(other) is None:raise ValueError('No undo/redo action available')
    dispatch_completed(cmd.encode(),None,True)
    after=history()
    if after.get(name)!=before[name]-1 or after.get(other)!=before[other]+1:raise ValueError('Native history did not complete the requested action')
   else:call('postUnoCommand',None,C.c_char_p,C.c_char_p,C.c_bool)(doc,cmd.encode(),None,False)
   result={}
  elif op=='border':
   table=table_context();border=p.get('border',{})
   if not table or p.get('tableFingerprint')!=table['fingerprint']:raise ValueError('Real bounded Word table selection changed')
   if not isinstance(border,dict) or set(border)!=set(['color','width','padding']):raise ValueError('Invalid border properties')
   color=border['color'];width=border['width'];padding=border['padding']
   if not isinstance(color,str) or not re.fullmatch(r'#[0-9A-Fa-f]{6}',color) or isinstance(width,bool) or not isinstance(width,(int,float)) or not 0.5<=width<=3 or width*4!=int(width*4):raise ValueError('Invalid border style')
   if isinstance(padding,bool) or not isinstance(padding,(int,float)) or not 0<=padding<=12 or padding*2!=int(padding*2):raise ValueError('Invalid padding')
   def typed(t,v):return {'type':t,'value':v}
   def line():return typed('com.sun.star.table.BorderLine2',{'Color':typed('com.sun.star.util.Color',int(color[1:],16)),'InnerLineWidth':typed('short',0),'OuterLineWidth':typed('short',round(width*2540/72)),'LineDistance':typed('short',0),'LineStyle':typed('short',0),'LineWidth':typed('unsigned long',0)})
   args={'BorderOuter':typed('[]any',[line(),line(),line(),line()]+[typed('long',round(padding*2540/72)) for _ in range(5)])}
   call('postUnoCommand',None,C.c_char_p,C.c_char_p,C.c_bool)(doc,b'.uno:BorderOuter',json.dumps(args).encode(),False);result={}
  elif op=='ppt_format':
   if fmt!='pptx' or set(p)-set(['id','op','part','expectedSelection','fontSize','fontColor']) or type(p.get('part')) is not int or call('getPart',C.c_int)(doc)!=p['part'] or call('getSelectionType',C.c_int)(doc)!=1 or not isinstance(p.get('expectedSelection'),str) or not p['expectedSelection'] or selection()!=p['expectedSelection']:raise ValueError('PPT native text selection changed')
   size=p.get('fontSize');color=p.get('fontColor')
   if size is None and color is None:raise ValueError('PPT format required')
   if 'fontSize' in p and (isinstance(size,bool) or not isinstance(size,(float,int)) or not 6<=size<=96 or size*2!=int(size*2)):raise ValueError('PPT font size must be 6-96 half points')
   if 'fontColor' in p and (not isinstance(color,str) or not re.fullmatch(r'#[0-9A-Fa-f]{6}',color)):raise ValueError('Invalid PPT color')
   if size is not None:dispatch_completed(b'.uno:FontHeight',{'FontHeight.Height':{'type':'float','value':size}},True)
   if color is not None:dispatch_completed(b'.uno:Color',{'Color':{'type':'long','value':int(color[1:],16)}},True)
   result={}
  elif op=='format':
   if fmt!='docx' or not isinstance(p.get('expectedSelection'),str) or not p['expectedSelection'] or selection()!=p['expectedSelection']:raise ValueError('Word native selection changed')
   name=p.get('fontName');asian=p.get('fontNameAsian');size=p.get('fontSize');color=p.get('fontColor');background=p.get('backgroundColor')
   if set(p)-set(['id','op','expectedSelection','fontName','fontNameAsian','fontSize','fontColor','backgroundColor']):raise ValueError('Invalid format properties')
   for key in ['fontColor','backgroundColor']:
    if key in p and (not isinstance(p[key],str) or not re.fullmatch(r'#[0-9A-Fa-f]{6}',p[key])):raise ValueError('Invalid format color')
   if name is None and asian is None and size is None and color is None and background is None:raise ValueError('Format required')
   for name_value in [name,asian]:
    if name_value is not None and (not isinstance(name_value,str) or not 1<=len(name_value)<=80 or name_value!=name_value.strip() or any(ord(c)<32 or ord(c)==127 for c in name_value) or any(c in name_value for c in '<>:/\\')):raise ValueError('Invalid font name')
   if size is not None and (isinstance(size,bool) or not isinstance(size,(float,int)) or not 6<=size<=96 or size*2!=int(size*2)):raise ValueError('Font size must be 6-96 pt in half points')
   if name is not None:dispatch_completed(b'.uno:CharFontName',{'CharFontName.FamilyName':{'type':'string','value':name}},True)
   if asian is not None:dispatch_completed(b'.uno:CharFontNameCJK',{'CharFontNameCJK.FamilyName':{'type':'string','value':asian}},True)
   if size is not None:dispatch_completed(b'.uno:FontHeight',{'FontHeight.Height':{'type':'float','value':size}},True)
   for command,value in [('Color',color),('CharBackColor',background)]:
    if value is not None:dispatch_completed(('.uno:'+command).encode(),{command:{'type':'long','value':int(value[1:],16)}},True)
   result={}
  elif op=='range':
   ref=p['ref']
   if not isinstance(ref,str) or not re.fullmatch(r'[A-Z]{1,2}[1-9][0-9]{0,3}(?::[A-Z]{1,2}[1-9][0-9]{0,3})?',ref):raise ValueError('Invalid cell range')
   args=json.dumps({'ToPoint':{'type':'string','value':ref}}).encode();call('postUnoCommand',None,C.c_char_p,C.c_char_p,C.c_bool)(doc,b'.uno:GoToCell',args,False);result={}
  elif op=='part':call('setPart',None,C.c_int)(doc,num(p['part'],0,min(99,call('getParts',C.c_int)(doc)-1)));result={}
  elif op=='export_pdf':
   if set(p)!=set(['id','op']):raise ValueError('PDF export takes no arguments')
   if not call('saveAs',C.c_int,C.c_char_p,C.c_char_p,C.c_char_p)(doc,(job/'output/document.pdf').as_uri().encode(),b'pdf',None):raise ValueError('Office PDF export failed')
   result={'saved':True}
  elif op=='save':
   if not call('saveAs',C.c_int,C.c_char_p,C.c_char_p,C.c_char_p)(doc,(job/('edited.'+fmt)).as_uri().encode(),fmt.encode(),None):raise ValueError('Office save failed')
   result={'saved':True}
  else:raise ValueError('Unknown operation')
  reply(i,result=result)
 except Exception as e:reply(p.get('id',-1),error=str(e)[:400])
os._exit(0) # owned process ends without upstream deferred clipboard atexit teardown
