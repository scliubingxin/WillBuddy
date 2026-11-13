import importlib.util, pathlib, sys, tempfile, time, unittest
MODULE=pathlib.Path(__file__).resolve().parents[1]/'stress-office.py'
spec=importlib.util.spec_from_file_location('office_stress',MODULE);stress=importlib.util.module_from_spec(spec);spec.loader.exec_module(stress)
class StressRunnerTests(unittest.TestCase):
 def test_success_and_timeout_are_observable(self):
  with tempfile.TemporaryDirectory() as directory:
   code,out=stress.run_case([sys.executable,'-c','print("ok")'],directory,2)
   self.assertEqual(code,0);self.assertIn('ok',out)
   started=time.monotonic();code,out=stress.run_case([sys.executable,'-u','-c','import time;print("started");time.sleep(30)'],directory,0.2)
   self.assertEqual(code,-1);self.assertIn('started',out);self.assertLess(time.monotonic()-started,5)
 def test_timeout_stops_spawned_child_before_it_writes(self):
  with tempfile.TemporaryDirectory() as directory:
   marker=pathlib.Path(directory)/'must-not-exist'
   child='import time,pathlib;time.sleep(1);pathlib.Path('+repr(str(marker))+').write_text("leak")'
   parent='import subprocess,sys,time;subprocess.Popen([sys.executable,"-c",'+repr(child)+']);print("started",flush=True);time.sleep(30)'
   code,out=stress.run_case([sys.executable,'-u','-c',parent],directory,0.3)
   self.assertEqual(code,-1);self.assertIn('started',out);time.sleep(1.1);self.assertFalse(marker.exists())
