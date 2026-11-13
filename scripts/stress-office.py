#!/usr/bin/env python3
"""Bounded native Office stability run, development only; no user documents.

Each round exercises independent checked Word, Excel and PPT flows. Results are
append-only JSONL, with test output captured only for failed/timed-out rounds.
"""
import argparse,json,subprocess,time,datetime,os,signal
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def run_case(command,cwd,timeout):
 proc=subprocess.Popen(command,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,start_new_session=True)
 try:
  output,_=proc.communicate(timeout=timeout);return proc.returncode,output
 except subprocess.TimeoutExpired:
  # A failed test can leave its native office worker behind. Terminate the
  # isolated process group, then force termination if it ignores SIGTERM.
  try:os.killpg(proc.pid,signal.SIGTERM)
  except ProcessLookupError:pass
  try:output,_=proc.communicate(timeout=3)
  except subprocess.TimeoutExpired:
   try:os.killpg(proc.pid,signal.SIGKILL)
   except ProcessLookupError:pass
   output,_=proc.communicate()
  return -1,output
def main():
 p=argparse.ArgumentParser();p.add_argument('--seconds',type=int,default=1800);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 if not 60<=a.seconds<=7200:raise ValueError('seconds must be 60..7200')
 a.output.parent.mkdir(parents=True,exist_ok=True);started_at=time.monotonic();deadline=started_at+a.seconds;rounds=failures=0
 cases=[('word','desktop/tests/office-word-media.test.mjs'),('excel','desktop/tests/office-cells.test.mjs'),('ppt','desktop/tests/office-presentation.test.mjs')]
 with a.output.open('x',encoding='utf8') as log:
  while time.monotonic()<deadline:
   name,file=cases[rounds%len(cases)];started=time.monotonic()
   code,output=run_case(['node','--test','--test-concurrency=1',file],ROOT,120);detail=output if code else ''
   rounds+=1;failures+=code!=0
   entry={'time_utc':utc(),'round':rounds,'case':name,'seconds':round(time.monotonic()-started,3),'exit_code':code}
   if detail:entry['output_tail']=detail[-16000:]
   log.write(json.dumps(entry,ensure_ascii=False)+'\n');log.flush()
   print(json.dumps({'round':rounds,'case':name,'failures':failures,'elapsed':round(time.monotonic()-started_at,1)},ensure_ascii=False),flush=True)
  print(json.dumps({'completed':True,'rounds':rounds,'failures':failures,'elapsed':round(time.monotonic()-started_at,1)},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
