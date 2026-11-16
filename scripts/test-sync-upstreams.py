#!/usr/bin/env python3
import copy,importlib.util,json,sys,tempfile,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
spec=importlib.util.spec_from_file_location('sync',HERE/'sync-upstreams.py');sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)

class MergeTests(unittest.TestCase):
 def test_independent_dict_edits(self):
  a={'http':{'mitm':['a.test']},'rules':['DOMAIN,a.test,REJECT']}
  b=copy.deepcopy(a);b['rules'].append('DOMAIN,b.test,REJECT')
  c=copy.deepcopy(a);c['http']['max-size']=99
  result=sync.merge(a,b,c)
  self.assertEqual(result['http']['max-size'],99);self.assertEqual(result['rules'],b['rules'])
 def test_order_and_local_fix_preserved(self):
  old={'rules':['DOMAIN,a.test,REJECT','DOMAIN,b.test,REJECT','DOMAIN,c.test,REJECT']}
  new={'rules':['DOMAIN,a.test,REJECT','DOMAIN,b.test,REJECT','DOMAIN,c.test,REJECT','DOMAIN,d.test,REJECT']}
  current={'rules':['DOMAIN,a.test,DIRECT','DOMAIN,b.test,REJECT','DOMAIN,c.test,REJECT']}
  self.assertEqual(sync.merge(old,new,current)['rules'],current['rules']+['DOMAIN,d.test,REJECT'])
 def test_conflicting_rule_blocks(self):
  with self.assertRaises(sync.Blocked):sync.merge({'rules':['DOMAIN,a.test,REJECT']},{'rules':['DOMAIN,a.test,DIRECT']},{'rules':['DOMAIN,a.test,REJECT-DROP']})
 def test_delete_upstream_retains_independent_local(self):
  self.assertEqual(sync.merge({'a':1},{},{'a':1,'b':2}),{'b':2})
 def test_delete_conflicts_local_fix(self):
  with self.assertRaises(sync.Blocked):sync.merge({'a':1},{},{'a':2})
 def test_concurrent_insert_blocks(self):
  with self.assertRaises(sync.Blocked):sync.merge({'rules':['DOMAIN,a.test,REJECT']},{'rules':['DOMAIN,a.test,REJECT','DOMAIN,b.test,REJECT']},{'rules':['DOMAIN,a.test,REJECT','DOMAIN,c.test,REJECT']})
 def test_metadata_preserved(self):
  self.assertEqual(sync.merge({'name':'old','rules':[]},{'name':'new','rules':['DOMAIN,a.test,REJECT']},{'name':'custom','rules':[]})['name'],'custom')
 def test_roundtrip_merge_modifiers(self):
  text="name: test\ndesc: test\nrules: #!append\n  - DOMAIN,a.test,REJECT\nhttp:\n  mitm: #!replace\n    - api.test\n"
  doc=sync.load_yaml(text);doc['rules'].append('DOMAIN,b.test,REJECT')
  out=sync.render(text,doc)
  self.assertIn('#!append',out);self.assertIn('#!replace',out)
 def test_yaml_duplicate_blocks(self):
  with self.assertRaises(sync.Blocked):sync.load_yaml('name: a\nname: b\n')
 def test_open_url_alias_blocks(self):
  with self.assertRaises(sync.Blocked):sync.validate({'name':'a','desc':'b','open-url':'x'})
 def test_select_boolean_blocks(self):
  with self.assertRaises(sync.Blocked):sync.validate({'name':'a','desc':'b','arguments':{'x':{'title':'X','type':'select','options':[{'value':False}]}}})
 def test_missing_provider_blocks(self):
  with self.assertRaises(sync.Blocked):sync.validate({'name':'a','desc':'b','http':{'script':[{'name':'missing','type':'response'}]}})
 def test_path_escape_blocks(self):
  with self.assertRaises(sync.Blocked):sync.local_path(Path('/tmp/work'),'../oops')
 def test_bad_source_url_blocks(self):
  for url in ['http://example.com/a','https://127.0.0.1/a','https://raw.githubusercontent.com@evil.test/a']:
   with self.assertRaises(sync.Blocked):sync.fetch(url)
 def test_fetch_failure_retains_state_and_output(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'upstream').mkdir();(root/'Stash').mkdir()
   text='name: a\ndesc: b\n';(root/'Stash/A.stoverride').write_text(text)
   (root/'upstream/sources.json').write_text(json.dumps({'entries':[{'target':'Stash/A.stoverride','mode':'merge','adapter':'stash','url':'https://raw.githubusercontent.com/a/b/main/a'}]}))
   original={'version':1,'sources':{}};(root/'upstream/sync-state.json').write_text(json.dumps(original))
   def bad(url):raise OSError('offline')
   report=sync.run(root,bad,True)
   self.assertEqual(report['results'][0]['status'],'fetch-error');self.assertEqual((root/'Stash/A.stoverride').read_text(),text)
   self.assertEqual(json.loads((root/'upstream/sync-state.json').read_text()),original)
 def test_enroll_never_replaces_custom_override(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'upstream').mkdir();(root/'Stash').mkdir()
   text='name: custom\ndesc: b\nrules: []\n';(root/'Stash/A.stoverride').write_text(text)
   (root/'upstream/sources.json').write_text(json.dumps({'entries':[{'target':'Stash/A.stoverride','mode':'merge','adapter':'stash','url':'https://raw.githubusercontent.com/a/b/main/a'}]}))
   report=sync.run(root,lambda _:b'name: upstream\ndesc: upstream\nrules: []\n',True)
   self.assertEqual(report['results'][0]['status'],'enrolled');self.assertEqual((root/'Stash/A.stoverride').read_text(),text)
 def test_inventory_gap_fails(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'upstream').mkdir();(root/'Stash').mkdir();(root/'Stash/Missing.stoverride').write_text('name: a')
   (root/'upstream/sources.json').write_text('{"entries":[]}')
   with self.assertRaises(sync.Blocked):sync.run(root,lambda _:b'',True)

class CandidateResourceTests(unittest.TestCase):
 def setUp(self):
  from unittest.mock import patch
  import importlib.util
  spec=importlib.util.spec_from_file_location('gate_resources',HERE/'upstream-resources.py')
  self.resources=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.resources)
  sync._RESOURCE_MODULE=self.resources;sync._RESOURCE_CACHE.clear()
  self.patch=patch
 def test_bad_candidate_keeps_output_and_baseline(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);(root/'Stash').mkdir();(root/'upstream').mkdir();(root/'scripts').mkdir()
   import shutil
   shutil.copyfile(HERE/'check-overrides.py',root/'scripts/check-overrides.py')
   local='name: A\ndesc: fixture\nauthor: your98k\nicon: https://example.com/icon.png\nrules: []\n'
   target=root/'Stash/A.stoverride';target.write_text(local)
   url='https://raw.githubusercontent.com/fixture/source/main/a'
   old=local.encode();state={'version':1,'sources':{'Stash/A.stoverride':{'sha256':sync.sha(old),'snapshot':sync.pack(old),'url':url,'adapter':'stash'}}}
   (root/'upstream/sync-state.json').write_text(json.dumps(state))
   (root/'upstream/sources.json').write_text(json.dumps({'entries':[{'target':'Stash/A.stoverride','url':url,'adapter':'stash','mode':'merge'}]}))
   new=local+'script-providers:\n  added:\n    url: https://example.com/broken.js\n'
   with self.patch.object(self.resources,'default_fetcher',return_value=b'<!doctype html><html>error</html>'):
    result=sync.run(root,lambda _:new.encode(),True)
   self.assertEqual(result['results'][0]['status'],'blocked',result)
   self.assertIn('candidate resources failed',result['results'][0]['detail'])
   self.assertEqual(target.read_text(),local)
   self.assertEqual(json.loads((root/'upstream/sync-state.json').read_text()),state)
 def test_mirror_stays_local_and_remote_cache_is_shared(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);(root/'Script').mkdir();(root/'Script/a.js').write_text('$done({});')
   text='name: a\ndesc: b\nscript-providers:\n  local:\n    url: https://raw.githubusercontent.com/your98k/Rule-Hub/refs/heads/main/Script/a.js\n  remote:\n    url: https://example.com/a.js\n'
   calls=[]
   with self.patch.object(self.resources,'default_fetcher',side_effect=lambda u:(calls.append(u),b'$done({});')[1]):
    sync.resource_gate(root,'Stash/A.stoverride',text)
    sync.resource_gate(root,'Stash/B.stoverride',text)
   self.assertEqual(calls,['https://example.com/a.js'])
 def test_missing_mirror_blocks(self):
  with tempfile.TemporaryDirectory() as directory:
   text='name: a\ndesc: b\nscript-providers:\n  local:\n    url: https://raw.githubusercontent.com/your98k/Rule-Hub/main/Script/missing.js\n'
   with self.assertRaises(sync.Blocked):sync.resource_gate(Path(directory),'Stash/A.stoverride',text)

if __name__=='__main__':
 unittest.main(verbosity=2)
