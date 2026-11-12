// Test-only request-handler fixture. Never imported by the application.
import { createServer } from 'node:http';
const release = {
  uuid: 'release-one',
  version: '1.0',
  packageName: 'io.entgra.test',
  currentStatus: 'PUBLISHED',
  iconPath: '/store/images/favicon.svg',
  description: 'Store contract test release.',
  screenshots: [],
  metaData: '{"Version":"1.0"}',
};
const app = {
  id: 1,
  name: 'Contract Test App',
  type: 'ENTERPRISE',
  deviceType: 'android',
  categories: ['Business'],
  tags: ['Test'],
  applicationReleases: [release],
  isFavourite: false,
  rating: 3,
};
const device = {
  id: 1,
  name: 'Test Device',
  type: 'android',
  deviceIdentifier: 'test-device',
  lastUpdatedTimeStamp: 1794384000000,
  enrolmentInfo: { owner: 'test-user', ownership: 'BYOD', status: 'ACTIVE' },
  deviceInfo: {
    vendor: 'Test',
    deviceModel: 'Device',
    serial: 'TEST-001',
    osVersion: '14',
    imei: '000000000000000',
  },
};
const grants = [
  'am:store:app:view',
  'am:store:app:modify',
  'am:store:app:sub:install',
  'am:store:app:sub:uninstall',
  'am:store:app:review:view',
  'am:store:app:review:update',
  'am:admin:store:app:sub:view',
  'am:admin:store:app:sub:modify',
  'am:admin:store:app:release-versions:view',
  'am:store:firmware:view',
  'dm:device-type:view',
  'dm:devices:view',
  'um:users:user-details:view',
  'rm:roles:view',
  'gm:groups:view',
  'am:pub:app:update',
];
let logged = false;
let sparse = false;
let review;
let failDevices = false;
const server = createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  res.setHeader('Content-Type', 'application/json');
  function reply(data, status = 200) {
    res.statusCode = status;
    res.end(JSON.stringify({ data }));
  }
  if (path.endsWith('/ui-config')) return reply({ isSsoEnable: false });
  if (path.endsWith('/login')) {
    const form = new URLSearchParams(body);
    logged = form.get('password') === 'test';
    sparse = form.get('username') === 'sparse';
    return reply(
      logged ? 'test-user' : 'Invalid Login Details',
      logged ? 200 : 401,
    );
  }
  if (path.endsWith('/logout')) {
    logged = false;
    return reply(null);
  }
  if (path === '/test/fail-devices') {
    failDevices = !failDevices;
    return reply(failDevices);
  }
  if (!logged) return reply('Unauthorized', 401);
  if (path.endsWith('/user')) return reply('test-user');
  if (path.endsWith('/login-user/scopes'))
    return reply({
      userScopes: (sparse ? ['dm:device-type:view'] : grants).join(' '),
    });
  if (path.endsWith('/device-types'))
    return reply(
      ['android', 'ios', 'windows'].map((name, id) => ({
        id,
        name,
        deviceTypeMetaDefinition: { storeVisibilityEnabled: true },
      })),
    );
  if (path.endsWith('/whitelabel'))
    return reply({ footerText: 'Unified Endpoint Manager' });
  if (path.endsWith('/categories'))
    return reply([{ categoryName: 'Business' }]);
  if (path.endsWith('/tags')) return reply([{ tagName: 'Test' }]);
  if (path.endsWith('/release-versions/release-one')) return reply([]);
  if (path.includes('/reviews/')) {
    if (path.endsWith('app-rating'))
      return reply({ ratingValue: 3, noOfUsers: 1, ratingVariety: { 3: 1 } });
    if (req.method === 'POST' || req.method === 'PUT') {
      review = { id: 1, username: 'test-user', ...JSON.parse(body) };
      return reply(review, 201);
    }
    if (req.method === 'DELETE') {
      review = undefined;
      return reply(null);
    }
    return reply({
      data: review ? [review] : [],
      recordsTotal: review ? 1 : 0,
    });
  }
  if (path.endsWith('/subscriptions/count'))
    return reply(
      ['Device', 'User', 'Role', 'Group'].map((subscriptionType) => ({
        subscriptionType,
        subscriptionCount: 1,
        unsubscriptionCount: 1,
      })),
    );
  if (path.includes('/admin/subscription/'))
    return reply({
      count: 1,
      data: path.includes('/devices/')
        ? [
            {
              subId: 1,
              device,
              deviceId: 1,
              deviceName: device.name,
              deviceIdentifier: device.deviceIdentifier,
              type: 'android',
              deviceOwner: 'test-user',
              status: path.split('/').pop(),
              actionType: 'INSTALL',
              deviceStatus: 'ACTIVE',
            },
          ]
        : [{ id: 1, name: 'test-user', owner: 'test-user', deviceCount: 1 }],
    });
  if (path.includes('/subscription/') && req.method === 'POST')
    return reply({
      activities: [],
      errorDeviceIdentifiers: [],
      ignoredDeviceIdentifiers: [],
    });
  if (path.endsWith('/devices/filters'))
    return reply({
      deviceTypes: ['android'],
      ownerships: ['BYOD'],
      statuses: ['ACTIVE'],
    });
  if (path.endsWith('/devices') || path.includes('/firmware/')) {
    if (failDevices) return reply('Device request test failure', 500);
    return reply({
      devices: [device],
      count: 1,
      data: [device],
      recordsTotal: 1,
      recordsFiltered: 1,
    });
  }
  if (path.endsWith('/users/search'))
    return reply({ users: [{ username: 'test-user' }], count: 1 });
  if (path.endsWith('/roles')) return reply({ roles: ['test-role'], count: 1 });
  if (path.endsWith('/groups/hierarchy'))
    return reply({
      deviceGroups: [{ id: 1, name: 'test-group', childrenGroups: [] }],
      count: 1,
    });
  if (path.includes('/applications/favourite/')) {
    app.isFavourite = req.method === 'POST';
    return reply(null);
  }
  if (path.includes('/releases/CUSTOM'))
    return reply({
      releases: [
        { ...release, uuid: 'firmware-one', releaseType: 'PRODUCTION' },
      ],
      pagination: { count: 1, limit: 10, offset: 0, size: 1 },
    });
  if (path.includes('/applications/ENTERPRISE/')) return reply(app);
  if (
    path.endsWith('/apps') ||
    path.endsWith('/favourite') ||
    path.endsWith('/firmwares')
  ) {
    const f = JSON.parse(body || '{}');
    const firmware = path.endsWith('/firmwares');
    const a = firmware
      ? {
          ...app,
          id: 2,
          name: 'Test Firmware',
          type: 'CUSTOM',
          firmwareModels: ['Test model'],
        }
      : app;
    const applications =
      f.deviceType === 'ios' ||
      f.offset > 0 ||
      (path.endsWith('/favourite') && !app.isFavourite) ||
      (f.appName && !a.name.includes(f.appName))
        ? []
        : [a];
    return reply({
      applications,
      pagination: {
        count: applications.length,
        limit: f.limit,
        offset: f.offset,
        size: applications.length,
      },
    });
  }
  reply('Not in test fixture', 404);
});
server.listen(9444, '127.0.0.1', () =>
  console.log('Test backend at http://127.0.0.1:9444'),
);
