#!/usr/bin/env python3
"""Offline positive/negative fixtures; no live service or upstream JS executes."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
from unittest.mock import patch

import yaml

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('resources', HERE / 'upstream-resources.py')
resources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(resources)


class ResourceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='resource-tests-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'Stash').mkdir()
        (self.root / 'Script').mkdir()

    def override(self, providers, name='A'):
        (self.root / 'Stash' / (name + '.stoverride')).write_text(
            yaml.safe_dump({'name': name, 'desc': 'fixture', 'script-providers': providers}, allow_unicode=True), encoding='utf-8')

    def no_fetch(self, url):
        raise AssertionError('network must not be used: ' + url)

    def test_inline_and_mirror_no_network(self):
        (self.root / 'Script/local.js').write_text('$done({});\n')
        urls = [
            'https://raw.githubusercontent.com/your98k/Rule-Hub/main/Script/local.js',
            'https://raw.githubusercontent.com/your98k/Rule-Hub/refs/heads/main/Script/local.js',
            'https://raw.githubusercontent.com/your98k/Rule-Hub/refs/tags/v1/Script/local.js',
            'https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Script/local.js',
            'https://fastly.jsdelivr.net/gh/your98k/Rule-Hub@main/Script/local.js',
            'https://github.com/your98k/Rule-Hub/raw/refs/heads/main/Script/local.js',
        ]
        self.override({str(i): {'url': u} for i, u in enumerate(urls)} | {'embedded': {'payload': '$done({});\n'}})
        report = resources.inspect(self.root, self.no_fetch)
        self.assertEqual(report['summary']['errors'], 0)
        self.assertEqual(report['summary']['by_status'], {'self-mirror': 6, 'inline': 1})
        self.assertTrue(all(r['node_check'] == 'passed' for r in report['resources']))

    def test_external_dedup_pinned_and_no_execution(self):
        # A runtime side effect would create this file; --check must never do so.
        sentinel = self.root / 'executed'
        code = ('require("node:fs").writeFileSync(' + json.dumps(str(sentinel)) + ', "bad");\n').encode()
        url = 'https://raw.githubusercontent.com/owner/project/' + 'a' * 40 + '/script.js'
        self.override({'a': {'url': url}, 'b': {'url': url}})
        calls = []
        report = resources.inspect(self.root, lambda u: (calls.append(u), code)[1])
        self.assertEqual(calls, [url])
        self.assertFalse(sentinel.exists())
        self.assertEqual(report['summary']['errors'], 0)
        self.assertTrue(all(r['source_type'] == 'pinned' for r in report['resources']))
        self.assertTrue(all(r['sha256'] == resources._sha(code) for r in report['resources']))

    def test_url_and_payload_are_two_observations(self):
        self.override({'a': {'url': 'https://example.com/a.js', 'payload': '$done({});'}})
        report = resources.inspect(self.root, lambda _: b'const newer = 1;')
        self.assertEqual(len(report['resources']), 2)
        self.assertEqual({r['source_type'] for r in report['resources']}, {'direct', 'inline'})

    def test_failures_preserve_only_same_source(self):
        url = 'https://example.com/a.js'
        self.override({'a': {'url': url}})
        previous = resources.inspect(self.root, lambda _: b'$done({});')
        cases = [('html', b'<!DOCTYPE html><html>login</html>'), ('empty', b''),
                 ('invalid-encoding', b'\xff'), ('node-check-failed', b'const = ;')]
        for expected, body in cases:
            with self.subTest(expected=expected):
                result = resources.inspect(self.root, lambda _: body, previous)
                row = result['resources'][0]
                self.assertEqual(row['source_status'], expected)
                self.assertTrue(row['baseline_preserved'])
                self.assertEqual(row['sha256'], previous['resources'][0]['sha256'])
                previous = result  # Repeated failures keep the last good hash.
        def missing(_):
            raise urllib.error.HTTPError(url, 404, 'missing', {}, None)
        result = resources.inspect(self.root, missing, previous)
        self.assertEqual(result['resources'][0]['source_status'], 'not-found')
        self.assertTrue(result['resources'][0]['baseline_preserved'])
        self.override({'a': {'url': 'https://example.com/changed.js'}})
        row = resources.inspect(self.root, missing, previous)['resources'][0]
        self.assertIsNone(row['sha256'])
        self.assertFalse(row['baseline_preserved'])
        self.assertTrue(row['previous_source_changed'])

    def test_private_credentials_protocol_and_traversal(self):
        urls = ['http://example.com/a.js', 'https://user:pass@example.com/a.js',
                'https://127.0.0.1/a.js', 'https://10.1.1.1/a.js', 'https://169.254.169.254/a.js',
                'https://[::1]/a.js', 'https://localhost/a.js', 'https://foo.local/a.js',
                'https://raw.githubusercontent.com/your98k/Rule-Hub/main/%2e%2e/outside.js']
        self.override({str(i): {'url': u} for i, u in enumerate(urls)})
        report = resources.inspect(self.root, self.no_fetch)
        self.assertEqual(report['summary']['errors'], len(urls))
        self.assertFalse(any(r['source_status'] in resources.SUCCESS for r in report['resources']))

    def test_private_dns_and_redirect_fail(self):
        private = [(2, 1, 6, '', ('192.168.1.1', 443))]
        with patch.object(resources.socket, 'getaddrinfo', return_value=private):
            with self.assertRaises(resources.SourceError):
                resources.default_fetcher('https://example.com/a.js')
        public = [(2, 1, 6, '', ('93.184.216.34', 443))]
        class FakeOpener:
            def __init__(self, redirect):
                self.redirect = redirect
            def open(self, request, timeout):
                return self.redirect.redirect_request(request, None, 302, '', {}, 'https://127.0.0.1/internal')
        with patch.object(resources.socket, 'getaddrinfo', return_value=public), patch.object(
                resources.urllib.request, 'build_opener', side_effect=lambda redirect: FakeOpener(redirect)):
            with self.assertRaises(resources.SourceError):
                resources.default_fetcher('https://example.com/a.js')

    def test_missing_invalid_duplicate_and_symlink(self):
        self.override({'missing': {'path': './cache.js'}, 'bad': 'text', 'mirror': {
            'url': 'https://raw.githubusercontent.com/your98k/Rule-Hub/main/Script/gone.js'}})
        (self.root / 'Stash/Duplicate.stoverride').write_text('name: a\nname: b\n')
        report = resources.inspect(self.root, self.no_fetch)
        self.assertEqual(report['summary']['errors'], 4)
        self.assertEqual(len(report['override_errors']), 1)
        with tempfile.TemporaryDirectory() as outside:
            source = Path(outside) / 'outside.js'
            source.write_text('$done({});')
            (self.root / 'Script/link.js').symlink_to(source)
            self.override({'a': {'url': 'https://raw.githubusercontent.com/your98k/Rule-Hub/main/Script/link.js'}})
            row = resources.inspect(self.root, self.no_fetch)['resources'][0]
            self.assertEqual(row['source_status'], 'self-mirror-invalid')

    def test_parallel_bound(self):
        count = 0
        peak = 0
        lock = threading.Lock()
        barrier = threading.Barrier(8)
        self.override({str(i): {'url': f'https://example.com/{i}.js'} for i in range(8)})
        def fetch(_):
            nonlocal count, peak
            with lock:
                count += 1
                peak = max(peak, count)
            barrier.wait(timeout=10)
            with lock:
                count -= 1
            return b'$done({});'
        report = resources.inspect(self.root, fetch)
        self.assertEqual(report['summary']['errors'], 0)
        self.assertEqual(peak, 8)

    def test_cli_report_and_state(self):
        self.override({'a': {'payload': '$done({});'}})
        command = [sys.executable, '-B', str(HERE / 'upstream-resources.py'), '--root', str(self.root),
                   '--report', 'upstream/resource-report.json', '--state', 'upstream/resource-state.json']
        first = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(first.returncode, 0, first.stderr)
        before = (self.root / 'upstream/resource-state.json').read_bytes()
        second = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(before, (self.root / 'upstream/resource-state.json').read_bytes())
        self.assertEqual(before, (self.root / 'upstream/resource-report.json').read_bytes())


if __name__ == '__main__':
    unittest.main(verbosity=2)
