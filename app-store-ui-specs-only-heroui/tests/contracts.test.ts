import test from 'node:test';
import assert from 'node:assert/strict';
// Compiled into a temporary folder by tests/run.mjs; imports stay browser-independent.
import {
  safeRedirect,
  normalizeScopes,
  buildSsoLoginUrl,
  unwrap,
  catalogueFilter,
  subscriptionPath,
  installable,
  playSynced,
} from '../src/services/contracts.ts';
import type { Application } from '../src/services/model.ts';
test('session scopes accept the deployed handler userScopes payload', () => {
  const raw = unwrap({
    data: { userScopes: 'am:store:app:view dm:device-type:view' },
  });
  assert.deepEqual(normalizeScopes(raw), [
    'am:store:app:view',
    'dm:device-type:view',
  ]);
});
test('session scopes also accept documented strings/lists and fail closed on malformed data', () => {
  assert.deepEqual(normalizeScopes('  am:store:app:view,dm:devices:view  '), [
    'am:store:app:view',
    'dm:devices:view',
  ]);
  assert.deepEqual(
    normalizeScopes(['am:store:app:view', 'am:store:app:view']),
    ['am:store:app:view'],
  );
  for (const input of [
    null,
    undefined,
    42,
    {},
    { userScopes: null },
    { userScopes: { 'am:store:app:view': true } },
  ])
    assert.deepEqual(normalizeScopes(input), []);
});
test('SSO entry provides the callback redirect and preserves the SPA origin', () => {
  const target = '/store/android/apps/release-one?appType=ENTERPRISE';
  const login = new URL(
    buildSsoLoginUrl(
      '/store-ui-request-handler/ssoLogin',
      'http://localhost:5173',
      target,
    ),
  );
  assert.equal(login.pathname, '/store-ui-request-handler/ssoLogin');
  assert.equal(
    login.searchParams.get('redirect'),
    'http://localhost:5173' + target,
  );
});
test('SSO entry always supplies a safe default and retains configured parameters', () => {
  for (const target of [
    null,
    'https://outside.example/store/',
    '//outside.example',
  ]) {
    const login = new URL(
      buildSsoLoginUrl(
        '/store-ui-request-handler/ssoLogin?deployment=store',
        'https://localhost:9443',
        target,
      ),
    );
    assert.equal(
      login.searchParams.get('redirect'),
      'https://localhost:9443/store/',
    );
    assert.equal(login.searchParams.get('deployment'), 'store');
  }
});
test('login returns only to same-origin Store paths', () => {
  for (const input of [
    'https://evil.example',
    '//evil.example',
    '/storehouse',
    '/store/\\evil',
    '/store/\nnext',
  ])
    assert.equal(safeRedirect(input), '/store/');
  assert.equal(
    safeRedirect('/store/android/apps/id?appType=ENTERPRISE'),
    '/store/android/apps/id?appType=ENTERPRISE',
  );
});
test('handler envelopes do not strip PaginationResult.data', () => {
  assert.deepEqual(unwrap({ data: { devices: [], count: 0 } }), {
    devices: [],
    count: 0,
  });
  assert.deepEqual(unwrap({ data: [], recordsTotal: 0 }), {
    data: [],
    recordsTotal: 0,
  });
});
test('catalogue keeps WEB_CLIP and CUSTOM separate and resets caller offset', () => {
  assert.deepEqual(catalogueFilter('web-clip', false, 0).appTypes, [
    'WEB_CLIP',
  ]);
  assert.deepEqual(catalogueFilter('android', true, 0).appTypes, ['CUSTOM']);
  assert.deepEqual(catalogueFilter('android', false, 30).appTypes, [
    'ENTERPRISE',
    'PUBLIC',
    'WEB_APP',
  ]);
});
test('subscription targets use uppercase identities and devices identifier arrays', () => {
  assert.equal(
    subscriptionPath('id', 'device', 'uninstall'),
    '/subscription/id/devices/uninstall',
  );
  assert.equal(
    subscriptionPath('id', 'role', 'install', true),
    '/subscription/id/ROLE/ent-app-install/install',
  );
});
test('release gates use exact PUBLISHED lifecycle and Play category', () => {
  const a = {
    applicationReleases: [{ currentStatus: 'PUBLISHED' }],
    categories: ['GooglePlaySyncedApp'],
  } as Application;
  assert.equal(installable(a), true);
  assert.equal(playSynced(a), true);
  assert.equal(
    installable({
      ...a,
      applicationReleases: [
        { ...a.applicationReleases[0], currentStatus: 'RELEASED' },
      ],
    }),
    false,
  );
});

test('handler metadata is unwrapped while subscription result data is retained', () => {
  assert.deepEqual(
    unwrap({ data: { name: 'app' }, code: 200, status: 'success' }),
    { name: 'app' },
  );
  assert.deepEqual(unwrap({ applicationUUID: 'one', data: [], count: 0 }), {
    applicationUUID: 'one',
    data: [],
    count: 0,
  });
});

test('wizard hand-offs require a token created in the current runtime', async () => {
  const { createHandoff, getHandoff } =
    await import('../src/services/handoff.ts');
  const app = {
    id: 1,
    name: 'Test',
    applicationReleases: [],
  } as unknown as Application;
  assert.equal(getHandoff(undefined), undefined);
  assert.equal(getHandoff('cold-url-token'), undefined);
  const token = createHandoff(app);
  assert.equal(getHandoff(token), app);
});
