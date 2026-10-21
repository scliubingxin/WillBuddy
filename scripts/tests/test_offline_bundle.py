import importlib.util
import json
from pathlib import Path
import plistlib
import stat
import sys
import tempfile
import unittest
import warnings
import zipfile

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from offline_bundle import EXTRAS,clean_residue,inventory,write_archive,validate_archive

class OfflineBundleTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.stage=Path(self.temp.name);self.app=self.stage/'WillBuddy.app'
        self.bin=self.app/'Contents/MacOS/run';self.bin.parent.mkdir(parents=True);self.bin.write_bytes(b'fixture executable');self.bin.chmod(0o755)
        (self.app/'Contents/link').symlink_to('MacOS/run')
        for name in EXTRAS:(self.stage/name).write_text('fixture')
        (self.stage/'Install-WillBuddy.command').chmod(0o755)
        self.zip=self.stage/'app.zip'
    def tearDown(self):self.temp.cleanup()
    def pack(self):
        entries=inventory(self.stage,self.app);(self.stage/'OFFLINE-MANIFEST.json').write_text(json.dumps({'files':entries}));return write_archive(self.stage,entries,self.zip)
    def test_closed_inventory_and_symlink_permissions(self):
        self.assertEqual(self.pack()['app_entries'],2)
        with zipfile.ZipFile(self.zip) as z:
            self.assertEqual(set(z.namelist()),{'WillBuddy.app/Contents/MacOS/run','WillBuddy.app/Contents/link'}|EXTRAS)
            self.assertTrue(stat.S_ISLNK(z.getinfo('WillBuddy.app/Contents/link').external_attr>>16))
            self.assertEqual(z.read('WillBuddy.app/Contents/link'),b'MacOS/run')
            self.assertTrue(z.getinfo('WillBuddy.app/Contents/MacOS/run').external_attr>>16&0o111)
    def test_known_residue_removed_but_inventory_rejects_it_if_not_cleaned(self):
        (self.app/'.BC.T_bad').write_text('unsealed');(self.app/'.BC.D_bad').symlink_to('Contents');(self.app/'._AppleDouble').write_text('metadata')
        with self.assertRaisesRegex(ValueError,'residual'):inventory(self.stage,self.app)
        self.assertEqual(clean_residue(self.app),3);self.pack()
    def test_extra_file_is_rejected_even_when_every_manifest_hash_still_matches(self):
        self.pack()
        with zipfile.ZipFile(self.zip,'a') as z:z.writestr('WillBuddy.app/Contents/unsealed-extra',b'extra')
        with self.assertRaisesRegex(ValueError,'unexpected'):validate_archive(self.zip)
    def test_residue_added_after_pack_is_rejected(self):
        self.pack()
        with zipfile.ZipFile(self.zip,'a') as z:z.writestr('WillBuddy.app/Contents/.BC.T_extra',b'extra')
        with self.assertRaisesRegex(ValueError,'residual'):validate_archive(self.zip)
    def test_sealed_residue_is_not_silently_removed(self):
        p=self.app/'Contents/.BC.T_sealed';p.write_text('sealed')
        seal=self.app/'Contents/_CodeSignature/CodeResources';seal.parent.mkdir();seal.write_bytes(plistlib.dumps({'files2':{'.BC.T_sealed':{'hash2':b'x'*32}}}))
        with self.assertRaisesRegex(ValueError,'seal references'):clean_residue(self.app)
        self.assertTrue(p.exists())
    def test_escaping_link_case_collision_and_duplicate_zip_paths_rejected(self):
        (self.app/'Contents/escape').symlink_to('../../../outside')
        with self.assertRaisesRegex(ValueError,'symlink'):inventory(self.stage,self.app)
        (self.app/'Contents/escape').unlink();(self.app/'Contents/MacOS/RUN').write_text('collision')
        with self.assertRaisesRegex(ValueError,'colliding'):inventory(self.stage,self.app)
        (self.app/'Contents/MacOS/RUN').unlink();self.pack()
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            with zipfile.ZipFile(self.zip,'a') as z:z.writestr('WillBuddy.app/Contents/MacOS/run',b'fixture executable')
        with self.assertRaisesRegex(ValueError,'duplicate'):validate_archive(self.zip)
    def test_tampering_and_executable_mode_loss_rejected(self):
        self.pack()
        with zipfile.ZipFile(self.zip) as z:rows=[(i,z.read(i)) for i in z.infolist()]
        with zipfile.ZipFile(self.zip,'w') as z:
            for i,b in rows:
                if i.filename.endswith('/MacOS/run'):i.external_attr=(stat.S_IFREG|0o644)<<16
                z.writestr(i,b)
        with self.assertRaisesRegex(ValueError,'mode mismatch'):validate_archive(self.zip)
        self.pack()
        with zipfile.ZipFile(self.zip) as z:rows=[(i,z.read(i)) for i in z.infolist()]
        with zipfile.ZipFile(self.zip,'w') as z:
            for i,b in rows:z.writestr(i,b'changed executable' if i.filename.endswith('/MacOS/run') else b)
        with self.assertRaisesRegex(ValueError,'hash mismatch'):validate_archive(self.zip)

if __name__=='__main__':unittest.main()
