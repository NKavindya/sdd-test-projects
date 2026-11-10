const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { before, test } = require('node:test');

let contracts;
before(async () => {
  const source = await fs.readFile(
    path.join(__dirname, '../src/common/contracts.js'),
    'utf8',
  );
  contracts = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
});

test('handler payload is decoded once, preserving DTO data arrays', () => {
  const dto = { data: [{ id: 1 }], recordsTotal: 1 };
  assert.equal(contracts.unwrapHandler({ data: { data: dto } }), dto);
  assert.throws(() => contracts.unwrapHandler({ data: dto.recordsTotal }));
  assert.equal(contracts.unwrapHandler({ data: '' }), undefined);
});

test('scopes accept documented lists and whitespace-separated strings', () => {
  const expected = ['am:store:app:view', 'am:store:app:sub:install'];
  assert.deepEqual(contracts.normalizeScopes(expected.join(' \n ')), expected);
  assert.deepEqual(contracts.normalizeScopes(expected), expected);
  assert.throws(() => contracts.normalizeScopes({ scopes: expected }));
});

test('authenticated startup accepts the live PermissionScopeHandler envelope', () => {
  const payload = contracts.unwrapHandler({
    data: {
      data: {
        userScopes: 'am:store:app:view dm:device-type:view',
      },
    },
  });
  assert.deepEqual(contracts.normalizeScopes(payload), [
    'am:store:app:view',
    'dm:device-type:view',
  ]);
});

test('empty scope grants remain empty and malformed grants are rejected', () => {
  assert.deepEqual(contracts.normalizeScopes({ userScopes: '' }), []);
  assert.deepEqual(contracts.normalizeScopes({ userScopes: [] }), []);
  assert.throws(() => contracts.normalizeScopes({ userScopes: null }));
  assert.throws(() => contracts.normalizeScopes({ userScopes: [true] }));
  assert.throws(() => contracts.normalizeScopes({ admin: true }));
});

test('app installability uses PUBLISHED, separately from firmware RELEASED', () => {
  const config = { appStates: { published: 'PUBLISHED' } };
  assert.equal(
    contracts.isInstallable({ currentStatus: 'PUBLISHED' }, config),
    true,
  );
  assert.equal(
    contracts.isInstallable({ currentStatus: 'RELEASED' }, config),
    false,
  );
});

test('Play-synced detection is separate from the general enterprise flag', () => {
  assert.equal(
    contracts.isPlaySynced({ categories: ['GooglePlaySyncedApp'] }),
    true,
  );
  assert.equal(
    Boolean(contracts.isPlaySynced({ isAndroidEnterpriseApp: true })),
    false,
  );
});

test('web clips use their own catalogue type', () => {
  assert.deepEqual(contracts.appTypes('web-clip'), ['WEB_CLIP']);
  assert.deepEqual(contracts.appTypes('android'), [
    'ENTERPRISE',
    'PUBLIC',
    'WEB_APP',
  ]);
});

test('login return stays within same-origin Store routes', () => {
  const origin = 'https://localhost:9443';
  assert.equal(
    contracts.safeReturn('/store/android/applications?name=a', origin),
    '/store/android/applications?name=a',
  );
  for (const target of [
    '//example.com/store/',
    'https://example.com/store/',
    '/endpoint-mgt/',
    'javascript:alert(1)',
  ]) {
    assert.equal(contracts.safeReturn(target, origin), '/store/');
  }
});

test('SSO always supplies the absolute Store return URL required by the callback', () => {
  const origin = 'http://localhost:3000';
  const uri = '/store-ui-request-handler/ssoLogin';
  const result = new URL(contracts.ssoLoginUrl(uri, '/store/', origin));
  assert.equal(result.origin, origin);
  assert.equal(result.pathname, uri);
  assert.equal(result.searchParams.get('redirect'), `${origin}/store/`);
});

test('SSO preserves release query parameters and the frontend port', () => {
  const origin = 'https://localhost:3001';
  const target = '/store/android/apps/release-id?appType=ENTERPRISE';
  const result = new URL(
    contracts.ssoLoginUrl('/store-ui-request-handler/ssoLogin', target, origin),
  );
  assert.equal(result.searchParams.get('redirect'), origin + target);
});

test('SSO never accepts an external or missing post-login target', () => {
  const origin = 'http://localhost:3000';
  for (const value of [
    undefined,
    '',
    '//example.com/store/',
    '/endpoint-mgt/',
  ]) {
    const result = new URL(
      contracts.ssoLoginUrl(
        '/store-ui-request-handler/ssoLogin?redirect=https://example.com/',
        value,
        origin,
      ),
    );
    assert.equal(result.searchParams.get('redirect'), `${origin}/store/`);
  }
});

test('AE identity install preserves request shape and operation flags', () => {
  assert.deepEqual(
    contracts.operationRequest({
      uuid: 'release-id',
      kind: 'User',
      action: 'install',
      identities: ['alice'],
      enterprise: true,
      timestamp: 123,
      blockUninstall: true,
      disableReexecute: true,
      requiresUpdatingExternal: true,
    }),
    {
      method: 'POST',
      url: '/subscription/release-id/USER/ent-app-install/install',
      data: ['alice'],
      params: {
        timestamp: 123,
        'block-uninstall': true,
        'disable-operation-re-executing': true,
        requiresUpdatingExternal: true,
      },
    },
  );
});

test('device uninstall omits install-only flags', () => {
  const request = contracts.operationRequest({
    uuid: 'release-id',
    kind: 'Device',
    action: 'uninstall',
    identities: [{ id: 'device-id', type: 'android' }],
    blockUninstall: true,
    disableReexecute: true,
  });
  assert.equal(request.url, '/subscription/release-id/devices/uninstall');
  assert.deepEqual(request.params, {});
  assert.deepEqual(request.data, [{ id: 'device-id', type: 'android' }]);
});

test('API artifact URLs preserve their advertised protocol, origin, path and query', () => {
  const path =
    '/api/application-mgt/v1.0/artifact/1/release/icon?fileName=icon.png';
  const url = `http://localhost:9763${path}`;
  assert.equal(contracts.imageUrl(url), url);
  assert.equal(contracts.imageUrl(path), path);
  assert.equal(
    contracts.imageUrl('https://example.com/icon.png'),
    'https://example.com/icon.png',
  );
  assert.equal(contracts.imageUrl('javascript:alert(1)'), undefined);
  assert.equal(contracts.imageUrl(''), undefined);
});
