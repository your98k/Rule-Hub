#!/usr/bin/env python3
"""Publish only this run's validated candidates; never merge the whole test branch."""
import argparse,hashlib,importlib.util,json,subprocess,sys
from pathlib import Path

def git(root,*args):
 p=subprocess.run(['git','-C',str(root),*args],capture_output=True)
 if p.returncode: raise RuntimeError(p.stderr.decode(errors='replace')[:1000])
 return p.stdout

def digest(data):return hashlib.sha256(data).hexdigest()
def plan(report,source,dest,entries):
 allowed={e['target'] for e in entries if e['mode']=='merge'};result=[]
 rows={r['target']:r for r in report['results']}
 for name in report['changed']:
  if name not in allowed or rows[name]['status']!='updated':raise RuntimeError('candidate not approved: '+name)
  if not name.startswith(('Stash/','Script/')):raise RuntimeError('invalid publish path')
  for root in (source,dest):
   p=(root/name).resolve()
   if not p.is_relative_to(root.resolve()) or not p.is_file():raise RuntimeError('invalid candidate path: '+name)
  row=rows[name];data=(source/name).read_bytes();current=(dest/name).read_bytes()
  if digest(data)!=row.get('after_sha256'):raise RuntimeError('test content changed after validation: '+name)
  if digest(current)==row['after_sha256']:continue
  # Do not promote a pre-existing alternate test implementation or overwrite newer main fixes.
  if digest(current)!=row.get('before_sha256'):raise RuntimeError('main differs from tested base: '+name)
  result.append((name,data))
 return result

def main():
 p=argparse.ArgumentParser();p.add_argument('--test-root',type=Path,required=True);p.add_argument('--main-root',type=Path,required=True);p.add_argument('--report',type=Path,required=True);p.add_argument('--push',action='store_true');a=p.parse_args()
 source=a.test_root.resolve();dest=a.main_root.resolve();r=json.loads(a.report.read_text());manifest=json.loads((source/'upstream/sources.json').read_text())
 # Abort before touching main when either branch moved since checkout/test commit.
 head=git(dest,'rev-parse','HEAD').decode().strip();test_head=git(source,'rev-parse','HEAD').decode().strip()
 if a.push:
  git(dest,'fetch','origin','main');git(source,'fetch','origin','test')
  if git(dest,'rev-parse','origin/main').decode().strip()!=head:raise RuntimeError('main moved; rerun required')
  if git(source,'rev-parse','origin/test').decode().strip()!=test_head:raise RuntimeError('test moved; rerun required')
 candidates=plan(r,source,dest,manifest['entries'])
 if not candidates:print('No validated content updates to publish');return
 spec=importlib.util.spec_from_file_location('sync',Path(__file__).with_name('sync-upstreams.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 for name,data in candidates:
  if name.endswith('.stoverride'):m.grammar_gate(source,name,data.decode())
  else:raise RuntimeError('script publishing requires dedicated behavior tests')
 for name,data in candidates:(dest/name).write_bytes(data)
 git(dest,'add','--',*[name for name,_ in candidates])
 staged=git(dest,'diff','--cached','--name-only').decode().splitlines()
 if set(staged)!={name for name,_ in candidates}:raise RuntimeError('unrelated staged changes')
 git(dest,'-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','sync: publish tested upstream updates')
 if a.push:git(dest,'push','origin','HEAD:refs/heads/main')
 print('Published',len(candidates),'validated files')
if __name__=='__main__':main()
