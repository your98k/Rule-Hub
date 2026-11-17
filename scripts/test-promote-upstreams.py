#!/usr/bin/env python3
import importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('promote',Path(__file__).with_name('promote-upstreams.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def setup_case(self,tmp):
  root=Path(tmp);s=root/'test';d=root/'main'
  for p in (s,d):(p/'Stash').mkdir(parents=True)
  n='Stash/A.stoverride';(s/n).write_bytes(b'new');(d/n).write_bytes(b'old')
  r={'changed':[n],'results':[{'target':n,'status':'updated','before_sha256':m.digest(b'old'),'after_sha256':m.digest(b'new')}]}
  return s,d,n,r,[{'target':n,'mode':'merge'}]
 def test_publish_only_current_candidates(self):
  with tempfile.TemporaryDirectory() as t:
   s,d,n,r,e=self.setup_case(t);(s/'Stash/WeiBo.stoverride').write_text('alternate')
   self.assertEqual(m.plan(r,s,d,e),[(n,b'new')])
 def test_no_update_no_publish(self):
  with tempfile.TemporaryDirectory() as t:
   s,d,n,r,e=self.setup_case(t);r['changed']=[];self.assertEqual(m.plan(r,s,d,e),[])
 def test_alternate_test_base_blocks(self):
  with tempfile.TemporaryDirectory() as t:
   s,d,n,r,e=self.setup_case(t);(d/n).write_bytes(b'different main')
   with self.assertRaises(RuntimeError):m.plan(r,s,d,e)
 def test_test_changed_after_validation_blocks(self):
  with tempfile.TemporaryDirectory() as t:
   s,d,n,r,e=self.setup_case(t);(s/n).write_bytes(b'tampered')
   with self.assertRaises(RuntimeError):m.plan(r,s,d,e)
 def test_review_not_publishable(self):
  with tempfile.TemporaryDirectory() as t:
   s,d,n,r,e=self.setup_case(t);e[0]['mode']='review'
   with self.assertRaises(RuntimeError):m.plan(r,s,d,e)
 def test_already_published_no_commit(self):
  with tempfile.TemporaryDirectory() as t:
   s,d,n,r,e=self.setup_case(t);(d/n).write_bytes(b'new');self.assertEqual(m.plan(r,s,d,e),[])
if __name__=='__main__':unittest.main(verbosity=2)
