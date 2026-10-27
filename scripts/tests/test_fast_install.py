import os, pathlib, subprocess, tempfile, unittest
SCRIPT=pathlib.Path(__file__).resolve().parents[2]/'desktop/installer/Install-WillBuddy.command'
class FastInstall(unittest.TestCase):
 def run_case(self, fail=False, backup=False):
  with tempfile.TemporaryDirectory() as td:
   d=pathlib.Path(td);src=d/'download/WillBuddy.app';dst=d/'Applications/WillBuddy.app';src.mkdir(parents=True);dst.mkdir(parents=True)
   (src/'payload').write_bytes(b'x'*1048576);(dst/'old').write_text('old');before=(src/'payload').stat().st_ino
   if backup:(dst.parent/'WillBuddy.previous.app').mkdir()
   bin=d/'bin';bin.mkdir();stat=bin/'stat';stat.write_text('#!/bin/sh\necho 1\n');stat.chmod(0o755)
   mv=bin/'mv';mv.write_text('#!/bin/sh\ncase "$*" in *install.*/WillBuddy.app*Applications/WillBuddy.app) '+('exit 23' if fail else ':')+';; esac\nexec /bin/mv "$@"\n');mv.chmod(0o755)
   env={**os.environ,'PATH':str(bin)+':'+os.environ['PATH']}
   r=subprocess.run(['bash','-c','source "$1"; install_app_transaction "$2" "$3"','test',str(SCRIPT),str(src),str(dst)],env=env,capture_output=True,text=True)
   if fail or backup:
    self.assertNotEqual(r.returncode,0);self.assertEqual((src/'payload').stat().st_ino,before);self.assertEqual((dst/'old').read_text(),'old')
   else:
    self.assertEqual(r.returncode,0,r.stderr);self.assertFalse(src.exists());self.assertEqual((dst/'payload').stat().st_ino,before);self.assertEqual((dst.parent/'WillBuddy.previous.app/old').read_text(),'old')
 def test_same_volume_preserves_inode_no_runtime_copy(self): self.run_case()
 def test_commit_failure_restores_source_and_old_target(self): self.run_case(fail=True)
 def test_existing_backup_refuses_before_moving_source(self): self.run_case(backup=True)
if __name__=='__main__':unittest.main()
