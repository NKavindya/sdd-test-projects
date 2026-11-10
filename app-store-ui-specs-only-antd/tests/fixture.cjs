// Synthetic API fixtures for browser verification only; never imported by src/.
const app = {
  id: 1,
  name: 'Microsoft Teams',
  type: 'PUBLIC',
  description: 'Description',
  categories: ['Category'],
  tags: ['Tag'],
  rating: 0,
  isFavourite: false,
  deviceType: 'android',
  applicationReleases: [
    {
      uuid: 'release-1',
      version: '1.0',
      currentStatus: 'PUBLISHED',
      packageName: 'fixture.package',
      iconPath: '/store/images/fixture-app.svg',
      description: 'Description',
      metaData: '{}',
      installerPath: '/store/fixture.apk',
    },
  ],
};
const device = {
  id: 42,
  name: 'Pixel 8',
  type: 'android',
  deviceIdentifier: 'device-1',
  lastUpdatedTimeStamp: 1794300000000,
  enrolmentInfo: { owner: 'admin', status: 'ACTIVE', ownership: 'BYOD' },
  deviceInfo: {
    vendor: 'Google',
    deviceModel: 'Pixel 8',
    serial: 'fixture-serial',
    osVersion: '14',
    imei: 'fixture-imei',
  },
};
const allScopes = [
  'am:store:app:view',
  'am:store:app:modify',
  'am:store:app:sub:install',
  'am:store:app:sub:uninstall',
  'am:store:app:review:view',
  'am:store:app:review:update',
  'am:admin:store:app:sub:view',
  'am:admin:store:app:sub:modify',
  'am:admin:store:app:release-versions:view',
  'am:admin:store:app:review:update',
  'am:store:firmware:view',
  'dm:devices:view',
  'um:users:user-details:view',
  'rm:roles:view',
  'gm:groups:view',
  'gm:admin:groups:view',
  'gm:devices:view',
  'dm:device-type:view',
  'dm:conf:view',
  'am:pub:app:update',
];
async function fixture(context, options = {}) {
  const calls = [];
  const state = {
    ...options,
    app: structuredClone(app),
    authenticated: options.authenticated !== false,
    reviews: [],
    scopes: options.scopes || allScopes,
    failDevices: false,
    failMutation: false,
  };
  Object.assign(state.app, options.app || {});
  const result = (route, data, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ data }),
    });
  await context.addInitScript(
    ({ tour }) => {
      if (!tour) localStorage.setItem('ui-tour-store', '1');
    },
    { tour: options.tour },
  );
  await context.route('**/store/images/fixture-app.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="145"><rect width="160" height="145" rx="32" fill="#6264a7"/><text x="80" y="95" text-anchor="middle" font-family="sans-serif" font-size="72" fill="white">T</text></svg>',
    }),
  );
  await context.route('**/store/fixture.apk', (route) =>
    route.fulfill({
      body: 'fixture binary',
      contentType: 'application/octet-stream',
    }),
  );
  await context.route('**/api/device-mgt-config/**', (route) =>
    result(route, { isSsoEnable: options.sso || false }),
  );
  await context.route('**/store-ui-request-handler/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname,
      method = req.method();
    let body;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    calls.push({
      path,
      method,
      body,
      query: Object.fromEntries(url.searchParams),
      headers: req.headers(),
    });
    if (path.endsWith('/login') && method === 'POST') {
      if (String(req.postData()).includes('password=bad'))
        return result(route, 'Invalid Login Details', 401);
      state.authenticated = true;
      return result(route, {});
    }
    if (path.endsWith('/user'))
      return result(
        route,
        state.authenticated ? 'admin' : '',
        state.authenticated ? 200 : 401,
      );
    if (path.endsWith('/logout')) {
      state.authenticated = false;
      return result(route, {});
    }
    if (!state.authenticated) return result(route, '', 401);
    if (path.endsWith('/login-user/scopes')) return result(route, state.scopes);
    if (path.endsWith('/device-types'))
      return result(
        route,
        ['android', 'ios', 'windows'].map((name) => ({
          name,
          deviceTypeMetaDefinition: { storeVisibilityEnabled: true },
        })),
      );
    if (path.endsWith('/whitelabel')) return result(route, {});
    if (path.endsWith('/categories'))
      return result(route, [{ categoryName: 'Category' }]);
    if (path.endsWith('/tags')) return result(route, [{ tagName: 'Tag' }]);
    if (/\/applications\/favourite\/\d+$/.test(path)) {
      state.app.isFavourite = method === 'POST';
      return result(route, {});
    }
    if (/\/applications\/(apps|favourite|firmwares)$/.test(path)) {
      if (state.expiredCatalogue) return result(route, '', 401);
      const firmware = path.endsWith('firmwares');
      const rows = firmware
        ? [
            {
              id: 2,
              name: 'Firmware',
              type: 'CUSTOM',
              description: 'Description',
              categories: ['Category'],
              firmwareModels: ['Pixel 8'],
            },
          ]
        : path.endsWith('favourite') && !state.app.isFavourite
          ? []
          : body.deviceType === 'ios'
            ? []
            : [state.app];
      return result(route, {
        applications: rows,
        pagination: {
          count: rows.length,
          offset: 0,
          limit: 30,
          size: rows.length,
        },
      });
    }
    if (path.endsWith('/applications/2/releases/CUSTOM'))
      return result(route, {
        releases: [
          {
            uuid: 'firmware-1',
            packageName: 'Firmware',
            version: '1.0',
            releaseType: 'PRODUCTION',
            currentStatus: 'RELEASED',
          },
        ],
        pagination: { count: 1 },
      });
    if (/\/applications\/(PUBLIC|ENTERPRISE|WEB_CLIP)\//.test(path))
      return result(route, state.app);
    if (path.includes('/admin/release-versions/'))
      return result(route, [
        { uuid: 'release-2', version: '0.9', state: 'PUBLISHED', rating: 0 },
      ]);
    if (path.endsWith('/devices/filters'))
      return result(route, {
        statuses: ['ACTIVE', 'INACTIVE'],
        ownerships: ['BYOD', 'COPE'],
        deviceTypes: ['android'],
      });
    if (path.endsWith('/device-mgt/v1.0/devices'))
      return result(
        route,
        state.failDevices
          ? 'There was a problem'
          : { devices: [device], count: 1 },
        state.failDevices ? 500 : 200,
      );
    if (path.includes('/groups/hierarchy'))
      return result(route, {
        deviceGroups: [
          { id: 3, name: 'Group', deviceCount: 1, childrenGroups: [] },
        ],
        count: 1,
      });
    if (path.endsWith('/users/search'))
      return result(route, { users: [{ username: 'admin' }], count: 1 });
    if (path.endsWith('/roles'))
      return result(route, { roles: ['Role'], count: 1 });
    if (path.includes('/subscription/') && method === 'POST')
      return result(
        route,
        {},
        state.failMutation
          ? 500
          : !state.scopes.includes('am:store:app:sub:install')
            ? 403
            : 200,
      );
    if (/\/subscription\/release-1\/(devices|USER|ROLE|GROUP)$/.test(path))
      return result(route, {
        data: path.endsWith('/devices') ? [device] : ['admin'],
        recordsFiltered: 1,
      });
    if (path.endsWith('/subscriptions/count'))
      return result(
        route,
        ['Device', 'User', 'Role', 'Group'].map((subscriptionType) => ({
          subscriptionType,
          subscriptionCount: 1,
          unsubscriptionCount: subscriptionType === 'Device' ? 0 : 1,
        })),
      );
    if (path.includes('/subscriptions/') && path.includes('/devices/'))
      return result(route, {
        data: [
          {
            subId: 4,
            deviceId: 42,
            device,
            deviceIdentifier: device.deviceIdentifier,
            type: 'android',
            deviceName: device.name,
            deviceOwner: 'admin',
            status: path.endsWith('/ERROR')
              ? 'ERROR'
              : path.endsWith('/PENDING')
                ? 'PENDING'
                : 'COMPLETED',
            actionType: 'INSTALL',
            actionTriggeredBy: 'admin',
            actionTriggeredTimestamp: 1794300000000,
            deviceStatus: 'ACTIVE',
          },
        ],
        count: 1,
      });
    if (/\/subscriptions\/(user|role|group)$/.test(path))
      return result(route, {
        data: [
          {
            id: 5,
            name: path.endsWith('user')
              ? 'admin'
              : path.endsWith('role')
                ? 'Role'
                : 'Group',
          },
        ],
        count: 1,
      });
    if (path.includes('/operations/'))
      return result(route, {
        DevicesOperations: [
          {
            operationId: 6,
            status: 'COMPLETED',
            actionTriggeredAt: 1794300000000,
          },
        ],
      });
    if (path.includes('/admin/subscription/device/') && method === 'PUT')
      return result(route, {});
    if (path.includes('/firmware/') && path.endsWith('/devices'))
      return result(route, {
        data: [device],
        recordsFiltered: 1,
        recordsTotal: 1,
      });
    if (path.includes('/reviews/')) {
      if (path.endsWith('/app-rating'))
        return result(route, {
          ratingValue: 0,
          noOfUsers: 0,
          ratingVariety: {},
        });
      if (method === 'GET')
        return result(route, {
          data: state.reviews,
          recordsTotal: state.reviews.length,
        });
      if (method === 'DELETE') {
        state.reviews = [];
        return result(route, {});
      }
      state.reviews = [{ id: 7, username: 'admin', ...body }];
      return result(route, state.reviews[0], method === 'POST' ? 201 : 200);
    }
    throw new Error('Undocumented test request: ' + method + ' ' + path);
  });
  return { state, calls };
}
module.exports = { fixture, allScopes, device };
