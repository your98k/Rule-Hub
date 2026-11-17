#!/usr/bin/env python3
"""Upstream inventory + conservative three-way updates. Never writes main overrides.
No remote code is executed. Network fixtures use the same validation as live fetches.
"""
import argparse, base64, concurrent.futures, copy, difflib, gzip, hashlib, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request
from pathlib import Path
import yaml
from ruamel.yaml import YAML

ROOT = Path(__file__).resolve().parents[1]
META = {'name','desc','author','homepage','icon','category','date','version','openUrl'}
MISSING = object()
class Blocked(Exception): pass
class UniqueLoader(yaml.SafeLoader): pass
def unique_mapping(loader, node, deep=False):
    result = {}
    for k,v in node.value:
        key=loader.construct_object(k,deep=deep)
        if key in result: raise Blocked('duplicate YAML key: '+str(key))
        result[key]=loader.construct_object(v,deep=deep)
    return result
UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)
def load_yaml(text):
    obj=yaml.load(text,Loader=UniqueLoader)
    if not isinstance(obj,dict): raise Blocked('YAML root must be mapping')
    return obj

def sha(raw): return hashlib.sha256(raw).hexdigest()
def pack(raw): return base64.b64encode(gzip.compress(raw,mtime=0)).decode()
def unpack(text): return gzip.decompress(base64.b64decode(text))
def local_path(root, rel):
    p=(root/rel).resolve()
    if not p.is_relative_to(root.resolve()) or not rel or p==root.resolve(): raise Blocked('path escapes repository')
    return p

def fetch(url):
    def allowed(u):
        p=urllib.parse.urlsplit(u)
        if p.scheme!='https' or p.username or p.password: raise Blocked('HTTPS public sources only')
        if p.hostname not in {'raw.githubusercontent.com','loon.103516.xyz','loonlab.103516.xyz','kelee.one'}: raise Blocked('source host is not allowlisted: '+str(p.hostname))
    allowed(url)
    class Redirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            allowed(newurl)
            return super().redirect_request(req,fp,code,msg,headers,newurl)
    request=urllib.request.Request(url,headers={'User-Agent':'Loon/3.5.1 Rule-Hub-Upstream-Sync/1.0','Cache-Control':'no-cache'})
    with urllib.request.build_opener(Redirect()).open(request,timeout=25) as response:
        raw=response.read(8*1024*1024+1)
        if len(raw)>8*1024*1024: raise Blocked('source exceeds 8 MiB')
        text=raw.decode('utf-8-sig')
        if not text.strip() or text.lstrip().lower().startswith(('<!doctype html','<html')): raise Blocked('empty or HTML source')
        return text.encode('utf-8')

def convert(raw, kind):
    text=raw.decode('utf-8-sig')
    if kind=='loon':
        from loon_adapter import convert_or_raise
        return load_yaml(convert_or_raise(text))
    if kind=='stash':
        return load_yaml(text)
    raise Blocked('source adapter requires manual review: '+kind)

def identity(value, path):
    if isinstance(value,dict):
        if 'match' in value: return ('match',value.get('match'),value.get('type'))
        if 'name' in value: return ('name',value['name'])
        raise Blocked('unkeyed list object at '+path)
    if not isinstance(value,str): raise Blocked('unkeyed list value at '+path)
    if path.endswith('/rules'):
        fields=value.split(',')
        if fields[0] in {'AND','OR','NOT'}: return value
        return tuple(fields[:2]) if fields[0]!='MATCH' else ('MATCH',)
    if path.endswith(('/url-rewrite','/body-rewrite','/header-rewrite')):
        fields=value.split(None,2)
        return tuple(fields[:2]) if not path.endswith('/url-rewrite') else fields[0]
    return value

def equal(a,b): return a is b or (a is not MISSING and b is not MISSING and a==b)
def merge(old,new,current,path=''):
    if equal(old,new): return current
    if equal(current,old) or equal(current,new): return new
    if all(isinstance(x,dict) for x in (old,new,current)):
        out=copy.deepcopy(current)
        for key in dict.fromkeys([*old,*new]):
            if not path and key in META: continue
            result=merge(old.get(key,MISSING),new.get(key,MISSING),current.get(key,MISSING),path+'/'+str(key))
            if result is MISSING: out.pop(key,None)
            else: out[key]=result
        return out
    if all(isinstance(x,list) for x in (old,new,current)):
        # Sequence edits touch ordered intervals. Overlapping local/upstream edits block;
        # unlike a set union this retains deliberate order and catches changed actions.
        def edits(a,b):
            return [(i,j,b[k:l]) for tag,i,j,k,l in difflib.SequenceMatcher(a=[json.dumps(x,sort_keys=True) for x in a],b=[json.dumps(x,sort_keys=True) for x in b],autojunk=False).get_opcodes() if tag!='equal']
        up,loc=edits(old,new),edits(old,current)
        def overlaps(a,b):
            i,j,_=a; k,l,_=b
            return max(i,k)<min(j,l) or (i==j and k<=i<=l) or (k==l and i<=k<=j)
        if any(overlaps(a,b) and a!=b for a in up for b in loc): raise Blocked('overlapping ordered-list edits at '+path)
        out=copy.deepcopy(old)
        changes=[]
        for x in up+loc:
            if x not in changes: changes.append(x)
        for i,j,replacement in sorted(changes,key=lambda x:(x[0],x[1]),reverse=True): out[i:j]=copy.deepcopy(replacement)
        # A locally changed rule and an upstream addition may have different text but
        # the same routing identity; never silently introduce competing entries.
        keys=[identity(v,path) for v in out]
        if len(set(keys))!=len(keys): raise Blocked('ambiguous duplicate ordered-list identity at '+path)
        return out
    raise Blocked('both upstream and local changed '+(path or '/'))

def merge_script(previous, latest, current):
    """Textual three-way merge, no execution; conflicts retain last known good file."""
    with tempfile.TemporaryDirectory() as tmp:
        paths=[]
        for name,text in [('current',current),('base',previous),('next',latest)]:
            p=Path(tmp)/name; p.write_text(text); paths.append(str(p))
        p=subprocess.run(['git','merge-file','-p',*paths],capture_output=True,text=True,timeout=15)
        if p.returncode: raise Blocked('JavaScript upstream/local merge conflict')
        dest=Path(tmp)/'candidate.js';dest.write_text(p.stdout)
        check=subprocess.run(['node','--check',str(dest)],capture_output=True,text=True,timeout=15)
        if check.returncode: raise Blocked('JavaScript syntax failure: '+check.stderr[:300])
        return p.stdout

def validate(obj):
    errors=[]
    if not isinstance(obj,dict): raise Blocked('not a YAML mapping')
    for k in ('name','desc'):
        if not isinstance(obj.get(k),str) or not obj[k]: errors.append('missing string '+k)
    for k in META:
        if k in obj and not isinstance(obj[k],str): errors.append('metadata must be string: '+k)
    if 'open-url' in obj: errors.append('open-url must be openUrl')
    providers=obj.get('script-providers',{})
    h=obj.get('http',{}) or {}
    for entry in h.get('url-rewrite',[]):
        p=entry.split()
        if len(p)!=3 or p[2] not in {'reject','reject-200','reject-dict','reject-array','reject-img','302','307','transparent'}: errors.append('invalid URL rewrite '+entry[:60])
    for item in h.get('script',[]):
        if item.get('name') not in providers: errors.append('undefined script provider '+str(item.get('name')))
        if item.get('type') not in {'request','response'}: errors.append('invalid script phase')
    args=obj.get('arguments',{})
    for key,spec in args.items():
        if not re.fullmatch('[A-Za-z][A-Za-z0-9_]{0,63}',key) or not isinstance(spec,dict): errors.append('invalid argument '+key); continue
        typ=spec.get('type'); default=spec.get('default')
        if not isinstance(spec.get('title'),str): errors.append('missing argument title '+key)
        if typ=='switch' and (('default' in spec and not isinstance(default,bool)) or 'required' in spec): errors.append('invalid switch '+key)
        elif typ=='select':
            vals=[x.get('value') for x in spec.get('options',[]) if isinstance(x,dict)]
            if not vals or any(type(v) not in (str,int) for v in vals) or len({type(v) for v in vals})>1 or len(vals)!=len(set(vals)) or ('default' in spec and default not in vals): errors.append('invalid select '+key)
        elif typ=='input':
            if 'default' in spec and (type(default) is not int if spec.get('value-type')=='integer' else not isinstance(default,str)): errors.append('invalid input '+key)
        elif typ!='switch': errors.append('unknown argument type '+key)
    text=json.dumps(obj,ensure_ascii=False)
    for key in re.findall(r'(?<!\$)\$\{args\.([A-Za-z0-9_]+)(?:\|json)?\}',text):
        if key not in args: errors.append('undefined argument '+key)
    if errors: raise Blocked('; '.join(errors[:8]))

def render(current_text,result):
    rt=YAML(); rt.preserve_quotes=True; rt.width=4096
    document=rt.load(current_text)
    def update(dst,src):
        for key in list(dst):
            if key not in src: del dst[key]
        for key,value in src.items():
            if key in dst and dst[key]==value: continue
            if key in dst and isinstance(dst[key],dict) and isinstance(value,dict): update(dst[key],value)
            else: dst[key]=value
    update(document,result)
    import io
    output=io.StringIO(); rt.dump(document,output)
    text=output.getvalue()
    if load_yaml(text)!=result: raise Blocked('roundtrip serialization mismatch')
    return text

_RESOURCE_MODULE = None
_RESOURCE_CACHE = {}

def resource_gate(root, relative, text):
    """Audit only this candidate before it can enter pending or advance state."""
    data=load_yaml(text)
    if not data.get('script-providers'): return
    global _RESOURCE_MODULE
    if _RESOURCE_MODULE is None:
        import importlib.util
        source=Path(__file__).resolve().parent/'upstream-resources.py'
        spec=importlib.util.spec_from_file_location('upstream_resources_gate',source)
        _RESOURCE_MODULE=importlib.util.module_from_spec(spec);spec.loader.exec_module(_RESOURCE_MODULE)
    inspector=_RESOURCE_MODULE
    def cached_fetch(url,headers=None):
        # Cache identity is URL plus provider headers: one host may serve
        # JavaScript to a specific agent and HTML to anything else.
        key=inspector.cache_key(url,headers)
        if key not in _RESOURCE_CACHE:
            try: _RESOURCE_CACHE[key]=(inspector.call_fetcher(inspector.default_fetcher,url,headers),None)
            except Exception as error: _RESOURCE_CACHE[key]=(None,error)
        content,error=_RESOURCE_CACHE[key]
        if error is not None: raise error
        return content
    with tempfile.TemporaryDirectory(prefix='rulehub-candidate-resources-') as directory:
        trial=Path(directory);(trial/'Stash').mkdir()
        (trial/'Stash'/Path(relative).name).write_text(text)
        # Inspect copies of local mirrors; never modify repository provider sources.
        import shutil
        for provider in data.get('script-providers',{}).values():
            url=provider.get('url') if isinstance(provider,dict) else None
            if not isinstance(url,str) or not inspector._self_mirror(url): continue
            rel=inspector._mirror_path(url)
            original=local_path(root,rel); target=local_path(trial,rel)
            if target.exists(): continue
            if original.is_file():
                target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(original,target)
        report=inspector.inspect(trial,cached_fetch)
        if report['errors']:
            details=['{}: {}'.format(row.get('provider',row.get('override','?')),row.get('source_status','error')) for row in report['errors']]
            raise Blocked('candidate resources failed: '+'; '.join(details[:8]))

def grammar_gate(root,relative,text):
    validate(load_yaml(text))
    for line in text.splitlines():
        if re.match(r'^(?:'+ '|'.join(META) +r'):\s*#!(?:replace|append)',line): raise Blocked('metadata merge modifier')
    with tempfile.TemporaryDirectory() as tmp:
        dest=Path(tmp)/Path(relative).name; dest.write_text(text)
        cmd=[sys.executable,str(root/'scripts/check-overrides.py'),tmp]
        result=subprocess.run(cmd,capture_output=True,text=True,timeout=120)
        if result.returncode: raise Blocked('repository checks: '+result.stdout[-1600:])
        # Compile jq expressions for default/all enum/boolean values; execute no remote JS.
        data=load_yaml(text)
        defaults={k:s.get('default',False if s.get('type')=='switch' else '') for k,s in data.get('arguments',{}).items()}
        variants=[defaults]
        for k,s in data.get('arguments',{}).items():
            for v in ([False,True] if s.get('type')=='switch' else [x['value'] for x in s.get('options',[])]): variants.append({**defaults,k:v})
        if len(variants)>256: raise Blocked('argument matrix exceeds 256 cases')
        for row in (data.get('http') or {}).get('body-rewrite',[]):
            parts=row.split(None,2)
            if len(parts)!=3 or parts[1] not in {'request-jq','response-jq'}: continue
            for args in variants:
                def subst(m):
                    value=args[m[1]]
                    return json.dumps(value,ensure_ascii=False) if m[2] else str(value).lower() if isinstance(value,bool) else str(value)
                expr=re.sub(r'(?<!\$)\$\{args\.(\w+)(\|json)?\}',subst,parts[2])
                p=subprocess.run(['jq','-n',expr],capture_output=True,text=True,timeout=10)
                if p.returncode in (2,3): raise Blocked('jq compile failure: '+p.stderr[:300])
        for provider in data.get('script-providers',{}).values():
            if 'payload' in provider:
                script=Path(tmp)/'payload.js'; script.write_text(provider['payload'])
                p=subprocess.run(['node','--check',str(script)],capture_output=True,text=True,timeout=15)
                if p.returncode: raise Blocked('inline JavaScript syntax error: '+p.stderr[:300])
    resource_gate(root,relative,text)

def run(root,fetcher=fetch,apply=False,selected=None):
    config=json.loads((root/'upstream/sources.json').read_text())
    state_path=root/'upstream/sync-state.json'
    state=json.loads(state_path.read_text()) if state_path.exists() else {'version':1,'sources':{}}
    entries=config['entries']; targets={e['target'] for e in entries}
    actual={str(p.relative_to(root)) for p in (root/'Stash').glob('*.stoverride')}
    missing=actual-targets
    # Only explicitly listed test fixtures are exempt from the full inventory check.
    unknown=missing-set(config.get('test_only',[]))
    if unknown: raise Blocked('inventory missing overrides: '+','.join(sorted(unknown)))
    extra_rows=[{'target':x,'mode':'test-only','status':'test-only','detail':'Existing test fixture outside main inventory; preserved'} for x in sorted(missing)]
    report={'version':1,'results':extra_rows,'changed':[]}; pending={}; newstate=copy.deepcopy(state)
    active=[e for e in entries if e.get('url') and (not selected or e['target'] in selected)]
    urls=sorted({e['url'] for e in active})
    def download(url):
        try: return fetcher(url),None
        except Exception as error: return None,str(error)[:500]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        fetched=dict(zip(urls,pool.map(download,urls)))
    for entry in entries:
        target=entry['target']; status={'target':target,'mode':entry['mode']}
        if selected and target not in selected: continue
        if not entry.get('url'):
            status.update(status='local-only',detail=entry.get('reason','source not verified')); report['results'].append(status); continue
        raw,error=fetched[entry['url']]
        if error: status.update(status='fetch-error',detail=error); report['results'].append(status); continue
        old=state['sources'].get(target); digest=sha(raw)
        if old and (old['url']!=entry['url'] or old['adapter']!=entry['adapter']):
            status.update(status='blocked',detail='source identity changed; explicit re-enrollment required'); report['results'].append(status); continue
        if old and old['sha256']==digest:
            queued=old.get('pending_publish')
            if queued:
                target_file=local_path(root,target)
                if not target_file.is_file() or sha(target_file.read_bytes())!=queued['after_sha256']:
                    status.update(status='blocked',detail='pending candidate changed after validation')
                else:
                    try:
                        grammar_gate(root,target,target_file.read_text())
                        pending[target]=target_file.read_text()
                        status.update(status='updated',retry_publish=True,**queued)
                    except Exception as error:
                        status.update(status='blocked',detail=str(error)[:2500])
            else: status['status']='unchanged'
            report['results'].append(status); continue
        if old and entry['mode'] in {'review','external','specialized'}:
            status.update(status='review-required',detail='upstream changed; local/specialized adaptation retained',upstream_sha256=digest)
            report['results'].append(status); continue
        try:
            path=local_path(root,target)
            if not path.is_file(): raise Blocked('target does not exist')
            text=path.read_text()
            current=load_yaml(text) if old is not None and entry['mode']=='merge' and target.endswith('.stoverride') else None
            # Initial run pins exact upstream bytes only, never treats the local adaptation
            # as an upstream baseline and never replaces current overrides on enrollment.
            if old is None:
                baseline={'sha256':digest,'snapshot':pack(raw),'url':entry['url'],'adapter':entry['adapter']}
                if entry['mode']=='merge' and entry['adapter']!='javascript':
                    converted=convert(raw,entry['adapter']); validate(converted)
                    baseline['converted_sha256']=sha(json.dumps(converted,sort_keys=True).encode())
                newstate['sources'][target]=baseline
                status['status']='enrolled'; report['results'].append(status); continue
            if old['url']!=entry['url'] or old['adapter']!=entry['adapter']: raise Blocked('source identity changed; explicit re-enrollment required')
            if entry['mode']!='merge': raise Blocked('unknown update mode')
            if entry['adapter']=='javascript':
                if not entry.get('tests'):
                    raise Blocked('JavaScript behavioral fixtures not registered; review required')
                out=merge_script(unpack(old['snapshot']).decode(),raw.decode(),text)
                # Tests are repository-owned static commands, not upstream-provided commands.
                for test in entry['tests']:
                    if not isinstance(test,list) or not test or test[0] not in {'node','python3'}: raise Blocked('invalid fixture command')
                    with tempfile.TemporaryDirectory() as trial:
                        candidate=Path(trial)/'candidate.js';candidate.write_text(out)
                        command=[arg.replace('{candidate}',str(candidate)) for arg in test]
                        result=subprocess.run(command,cwd=root,capture_output=True,text=True,timeout=60)
                        if result.returncode: raise Blocked('JavaScript behavioral fixture failed: '+result.stdout[-500:]+result.stderr[-500:])
                if out!=text: pending[target]=out
            else:
                previous=convert(unpack(old['snapshot']),entry['adapter']); latest=convert(raw,entry['adapter'])
                validate(latest)
                merged=merge(previous,latest,current)
                # Metadata belongs to the repository even on an otherwise clean upstream diff.
                for key in META:
                    if key in current: merged[key]=current[key]
                    else: merged.pop(key,None)
                out=text if merged==current else render(text,merged)
                if out!=text: grammar_gate(root,target,out); pending[target]=out
            newstate['sources'][target]={'sha256':digest,'snapshot':pack(raw),'url':entry['url'],'adapter':entry['adapter']}
            status['status']='updated' if out!=text else 'baseline-advanced'
            if out!=text:
                status['before_sha256']=sha(text.encode())
                status['after_sha256']=sha(out.encode())
                newstate['sources'][target]['pending_publish']={'before_sha256':status['before_sha256'],'after_sha256':status['after_sha256']}
        except Exception as error:
            status.update(status='blocked',detail=str(error)[:2500])
        report['results'].append(status)
    # Prepare every candidate before writing anything. Failed items keep both old output
    # and old baseline, so they are retried instead of being silently marked synced.
    report['changed']=sorted(pending)
    report['counts']={s:sum(x['status']==s for x in report['results']) for s in sorted({x['status'] for x in report['results']})}
    if apply:
        for relative,text in pending.items(): local_path(root,relative).write_text(text)
        if newstate!=state: state_path.write_text(json.dumps(newstate,ensure_ascii=False,indent=2)+'\n')
    return report

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--apply',action='store_true'); parser.add_argument('--root',type=Path,default=ROOT); parser.add_argument('--only',action='append'); parser.add_argument('--report',default='upstream/sync-report.json'); args=parser.parse_args()
    for tool in ('jq','node'):
        import shutil
        if not shutil.which(tool): raise SystemExit('required tool missing: '+tool)
    result=run(args.root.resolve(),apply=args.apply,selected=set(args.only or []))
    report_path=local_path(args.root,args.report); report_path.parent.mkdir(parents=True,exist_ok=True)
    report_path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result['counts'],ensure_ascii=False)); print('changed:',len(result['changed']))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:
            f.write('## 上游同步\n\n'+json.dumps(result['counts'],ensure_ascii=False)+'\n\n')
            for row in result['results']:
                if row['status'] in {'blocked','fetch-error','review-required'}: f.write('- `'+row['target']+'`: '+row['status']+' — '+row.get('detail','').replace('\n',' ')[:300]+'\n')
    # Mixed batches can still land valid files in test; failures stay visible as a red job.
    return 2 if any(x['status'] in {'blocked','fetch-error','review-required'} for x in result['results']) else 0
if __name__=='__main__': sys.exit(main())
