// Isolated contract fixture, never imported by production. No real credentials or device operations.
import http from 'node:http';
const permissions = [
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
];
let favourites = new Set();
let reviews = [];
const calls = [];
const release = {
  uuid: 'spec-release',
  version: '1.0',
  currentStatus: 'PUBLISHED',
  packageName: 'spec.application',
  description: 'Specification contract fixture',
  screenshots: [],
  metaData: '{"Version":"1.0"}',
};
const app = {
  id: 1,
  name: 'Specification application',
  description: 'Specification contract fixture',
  type: 'ENTERPRISE',
  deviceType: 'android',
  rating: 0,
  categories: ['Productivity'],
  tags: ['Work'],
  applicationReleases: [release],
};
const firmware = {
  ...app,
  id: 2,
  name: 'Specification firmware',
  type: 'CUSTOM',
  firmwareModels: ['Specification model'],
  applicationReleases: [
    { ...release, uuid: 'spec-firmware', releaseType: 'PRODUCTION' },
  ],
};
const device = {
  id: 1,
  name: 'Specification device',
  type: 'android',
  deviceIdentifier: 'spec-device',
  lastUpdatedTimeStamp: 1794355200000,
  enrolmentInfo: { owner: 'spec-user', ownership: 'BYOD', status: 'ACTIVE' },
  deviceInfo: {
    vendor: 'Specification',
    deviceModel: 'Model',
    osVersion: '14',
  },
};
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let raw = '';
    for await (const data of req) raw += data;
    const body =
      raw.startsWith('{') || raw.startsWith('[') ? JSON.parse(raw) : raw;
    calls.push({
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body: url.pathname.endsWith('/login') ? '[fixture login]' : body,
    });
    const send = (data, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data }));
    };
    const path = url.pathname;
    const session = req.headers.cookie?.includes('spec-session=1');
    if (path === '/__calls') return send(calls);
    if (path.endsWith('/ui-config')) return send({ isSsoEnable: false });
    if (path.endsWith('/login') && req.method === 'POST') {
      if (!raw.includes('password=valid'))
        return send('Invalid Login Details', 401);
      res.setHeader('set-cookie', [
        'spec-session=1; Path=/; HttpOnly; SameSite=Lax',
        `spec-sparse=${raw.includes('username=spec-sparse') ? '1' : '0'}; Path=/; HttpOnly; SameSite=Lax`,
      ]);
      return send('OK');
    }
    if (!session) return send('Unauthorized', 401);
    if (path.endsWith('/user')) return send('spec-user');
    if (path.endsWith('/logout')) {
      res.setHeader('set-cookie', 'spec-session=; Path=/; Max-Age=0');
      return send('OK');
    }
    if (path.endsWith('/login-user/scopes'))
      return send({
        userScopes: req.headers.cookie?.includes('spec-sparse=1')
          ? ''
          : permissions.join(' '),
      });
    if (path.endsWith('/device-types'))
      return send(
        ['android', 'ios', 'windows'].map((name) => ({
          name,
          deviceTypeMetaDefinition: { storeVisibilityEnabled: true },
        })),
      );
    if (path.endsWith('/whitelabel'))
      return send({ footerText: 'Unified Endpoint Manager' });
    if (path.endsWith('/categories'))
      return send([{ categoryName: 'Productivity' }]);
    if (path.endsWith('/tags')) return send([{ tagName: 'Work' }]);
    if (/\/applications\/(apps|favourite|firmwares)$/.test(path)) {
      let apps = path.endsWith('firmwares') ? [firmware] : [app];
      if (
        body.deviceType === 'ios' ||
        body.deviceType === 'windows' ||
        body.appTypes?.includes('WEB_CLIP')
      )
        apps = [];
      if (path.endsWith('favourite'))
        apps = apps.filter((a) => favourites.has(a.id));
      if (body.appName)
        apps = apps.filter((a) => a.name.includes(body.appName));
      apps = apps.map((a) => ({ ...a, isFavourite: favourites.has(a.id) }));
      return send({ applications: apps, pagination: { count: apps.length } });
    }
    if (path.includes('/applications/favourite/')) {
      req.method === 'POST' ? favourites.add(1) : favourites.delete(1);
      return send(null);
    }
    if (path.includes('/applications/ENTERPRISE/'))
      return send({ ...app, isFavourite: favourites.has(1) });
    if (path.includes('/releases/CUSTOM'))
      return send({
        releases: firmware.applicationReleases,
        pagination: { count: 1 },
      });
    if (path.includes('/release-versions/')) return send([release]);
    if (path.endsWith('/devices/filters'))
      return send({
        statuses: ['ACTIVE', 'INACTIVE'],
        ownerships: ['BYOD', 'COPE'],
      });
    if (path.includes('/users/search'))
      return send({ users: [{ username: 'spec-user' }], count: 1 });
    if (path.endsWith('/roles'))
      return send({ roles: ['spec-role'], count: 1 });
    if (path.includes('/groups/hierarchy'))
      return send({
        deviceGroups: [
          {
            id: 1,
            name: 'spec-group',
            childrenGroups: [{ id: 2, name: 'spec-child' }],
          },
        ],
      });
    if (path.includes('/subscriptions/count'))
      return send(
        ['Device', 'User', 'Role', 'Group'].map((subscriptionType) => ({
          subscriptionType,
          subscriptionCount: 1,
          unsubscriptionCount: 1,
        })),
      );
    if (path.includes('/admin/subscription/') && path.includes('/devices/'))
      return send({
        data: [
          {
            subId: 1,
            deviceId: 1,
            deviceIdentifier: 'spec-device',
            type: 'android',
            deviceName: device.name,
            deviceOwner: 'spec-user',
            status: path.split('/').at(-1),
            actionType: 'INSTALL',
            actionTriggeredBy: 'spec-user',
            actionTriggeredTimestamp: 1794355200000,
            deviceStatus: 'ACTIVE',
            device,
          },
        ],
        count: 1,
      });
    if (
      path.includes('/admin/subscription/') &&
      path.includes('/subscriptions/')
    )
      return send({
        data: [{ id: 1, name: 'spec-user', subscribedBy: 'spec-user' }],
        count: 1,
      });
    if (path.includes('/subscription/') && req.method === 'POST')
      return send({ activities: [] });
    if (path.endsWith('/devices'))
      return path.includes('/firmware/') || path.includes('/subscription/')
        ? send({ data: [device], recordsTotal: 1 })
        : send({ devices: [device], count: 1 });
    if (path.includes('/reviews/')) {
      if (req.method === 'POST') {
        reviews = [{ ...body, id: 1, username: 'spec-user' }];
        return send(body, 201);
      }
      if (req.method === 'PUT') {
        reviews = [{ ...body, id: 1, username: 'spec-user' }];
        return send(reviews[0]);
      }
      if (req.method === 'DELETE') {
        reviews = [];
        return send('OK');
      }
      if (path.endsWith('/app-rating'))
        return send({
          ratingValue: reviews[0]?.rating || 0,
          noOfUsers: reviews.length,
          ratingVariety: { [reviews[0]?.rating || 0]: reviews.length },
        });
      return send({ data: reviews, recordsTotal: reviews.length });
    }
    if (req.method === 'PUT') return send(null);
    send('Unspecified fixture request', 404);
  })
  .listen(9444, '127.0.0.1', () =>
    console.log('Contract fixture listening on http://127.0.0.1:9444'),
  );
