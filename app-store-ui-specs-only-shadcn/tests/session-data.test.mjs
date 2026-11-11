import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const source = readFileSync(
  new URL('../src/services/session-data.ts', import.meta.url),
  'utf8',
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { normalizeScopes } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
test('live request-handler userScopes DTO normalizes without startup crash', () => {
  assert.deepEqual(
    normalizeScopes({ userScopes: 'am:store:app:view dm:device-type:view' }),
    ['am:store:app:view', 'dm:device-type:view'],
  );
});
test('documented strings/lists, empty scopes, and duplicates are handled', () => {
  assert.deepEqual(
    normalizeScopes(' am:store:app:view,dm:devices:view\n am:store:app:view '),
    ['am:store:app:view', 'dm:devices:view'],
  );
  assert.deepEqual(
    normalizeScopes(['am:store:app:view', 'am:store:app:view', '']),
    ['am:store:app:view'],
  );
  assert.deepEqual(normalizeScopes({ userScopes: ['dm:devices:view'] }), [
    'dm:devices:view',
  ]);
  assert.deepEqual(normalizeScopes({ userScopes: '' }), []);
});
test('malformed payloads fail closed without granting permissions or throwing', () => {
  for (const value of [
    undefined,
    null,
    42,
    {},
    { unexpected: 'am:store:app:view' },
    { userScopes: 42 },
    { userScopes: { 'am:store:app:view': true } },
  ])
    assert.deepEqual(normalizeScopes(value), []);
  assert.deepEqual(normalizeScopes([null, 42, {}, 'dm:devices:view']), [
    'dm:devices:view',
  ]);
});
