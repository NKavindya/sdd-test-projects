import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const source = readFileSync(
  new URL('../src/services/rules.ts', import.meta.url),
  'utf8',
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const rules = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
test('ST-AP platform filters keep WEB_CLIP and firmware CUSTOM separate', () => {
  assert.deepEqual(rules.catalogueTypes('web-clip'), ['WEB_CLIP']);
  assert.deepEqual(rules.catalogueTypes('android'), [
    'ENTERPRISE',
    'PUBLIC',
    'WEB_APP',
  ]);
  assert.deepEqual(rules.catalogueTypes('web-clip', true), ['CUSTOM']);
});
test('only PUBLISHED releases are app-installable', () => {
  for (const status of ['CREATED', 'RELEASED', 'IN-REVIEW', 'RETIRED'])
    assert.equal(rules.isInstallable({ currentStatus: status }), false);
  assert.equal(rules.isInstallable({ currentStatus: 'PUBLISHED' }), true);
});
test('safe return rejects external, protocol-relative, and non-store targets', () => {
  for (const path of [
    'https://evil.example/store/',
    '//evil.example/store/',
    '/publisher/',
    'javascript:alert(1)',
    '/store-other/foo',
  ])
    assert.equal(rules.safeStorePath(path, 'https://uem.example'), '/store/');
  assert.equal(
    rules.safeStorePath(
      '/store/android/apps/123?appType=PUBLIC',
      'https://uem.example',
    ),
    '/store/android/apps/123?appType=PUBLIC',
  );
});
test('install/uninstall require selection and enabled schedule time', () => {
  assert.equal(rules.selectionReady([], false, ''), false);
  assert.equal(rules.selectionReady(['alice'], true, ''), false);
  assert.equal(rules.selectionReady(['alice'], false, ''), true);
  assert.equal(rules.selectionReady(['alice'], true, '2026-11-12T09:00'), true);
});
test('admin subscription query is lowercase subscribed/unsubscribed', () => {
  assert.equal(rules.subscriptionWireStatus('Installed'), 'subscribed');
  assert.equal(rules.subscriptionWireStatus('Uninstalled'), 'unsubscribed');
});
