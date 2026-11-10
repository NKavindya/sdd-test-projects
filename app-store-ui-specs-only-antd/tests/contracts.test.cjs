const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { code } = require('@babel/core').transformFileSync(
  'src/services/contracts.js',
  { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] },
);
const m = new Module('contracts');
m._compile(code, 'contracts.js');
const c = m.exports;
global.window = { location: { origin: 'http://localhost:3000' } };
test('catalogue uses authoritative app types and paging', () => {
  assert.deepEqual(c.catalogueFilter('android', false, {}, 30), {
    deviceType: 'android',
    appTypes: ['ENTERPRISE', 'PUBLIC', 'WEB_APP'],
    limit: 30,
    offset: 30,
  });
  assert.deepEqual(c.catalogueFilter('web-clip', false, {}, 0).appTypes, [
    'WEB_CLIP',
  ]);
  assert.deepEqual(c.catalogueFilter('android', true, {}, 14).appTypes, [
    'CUSTOM',
  ]);
});
test('installable means PUBLISHED, not RELEASED', () => {
  assert.equal(c.isInstallable({ currentStatus: 'PUBLISHED' }), true);
  assert.equal(c.isInstallable({ currentStatus: 'RELEASED' }), false);
});
test('subscription targets use device identifiers, not numeric IDs', () => {
  assert.deepEqual(
    c.devicePayload([{ id: 42, deviceIdentifier: 'd-1', type: 'android' }]),
    [{ id: 'd-1', type: 'android' }],
  );
});
test('enterprise and identity operation paths preserve API tokens', () => {
  assert.equal(
    c.operationPath('r-1', 'device', 'uninstall'),
    '/subscription/r-1/devices/uninstall',
  );
  assert.equal(
    c.operationPath('r-1', 'user', 'install', true),
    '/subscription/r-1/USER/ent-app-install/install',
  );
});
test('safe returns reject external origins and login loops', () => {
  for (const path of [
    'https://other.test/store/android/applications',
    '//other.test/store/',
    '/elsewhere',
    '/store/login',
  ])
    assert.equal(c.safeReturn(path), '/store/');
  assert.equal(
    c.safeReturn('/store/android/apps/r?appType=PUBLIC'),
    '/store/android/apps/r?appType=PUBLIC',
  );
});
test('all four locale packs exist and contain chrome translations', () => {
  const en = JSON.parse(fs.readFileSync('src/i18n/en.json'));
  for (const language of ['ja', 'fr', 'es']) {
    const pack = JSON.parse(fs.readFileSync(`src/i18n/${language}.json`));
    for (const key of Object.keys(en))
      assert.ok(pack[key], `${language}: ${key}`);
    assert.notEqual(pack['Search Apps'], en['Search Apps']);
  }
});
