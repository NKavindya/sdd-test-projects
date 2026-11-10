const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const babel = require('@babel/core');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const packs = Object.fromEntries(
  ['en', 'ja', 'fr', 'es'].map((lang) => [
    lang,
    JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          `src/services/internationalization/locales/${lang}.json`,
        ),
        'utf8',
      ),
    ),
  ]),
);

test('all four locale packs cover chrome and preserve interpolation placeholders', () => {
  const placeholders = (text) => (text.match(/{{\w+}}/g) || []).sort();
  for (const [lang, pack] of Object.entries(packs)) {
    assert.deepEqual(
      Object.keys(pack).sort(),
      Object.keys(packs.en).sort(),
      lang,
    );
    for (const key of Object.keys(packs.en)) {
      assert.ok(pack[key].trim(), `${lang}: ${key}`);
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(packs.en[key]),
        `${lang}: ${key}`,
      );
    }
    assert.equal(pack.R, undefined, 'ST-GAP-03 remains literal R');
  }
  for (const lang of ['ja', 'fr', 'es']) {
    for (const key of ['Favourites', 'Home', 'Search Apps', 'Search Devices']) {
      assert.notEqual(packs[lang][key], packs.en[key], `${lang}: ${key}`);
    }
  }
});

// Render the actual wizard with a failed selector resource. Only the resource,
// Store context and Entgra adapters are isolated; options, permissions and the
// error branch execute as shipped. No backend operations run in this test.
function wizardMarkup(action, allowed = true, subscriptionSelection) {
  const subscription = subscriptionSelection !== undefined;
  const file = path.join(
    root,
    subscription
      ? 'src/scenes/Home/scenes/Release/components/Subscriptions.js'
      : 'src/scenes/Home/scenes/Install/components/OperationForm.js',
  );
  const source = babel.transformFileSync(file, {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
  }).code;
  const module = { exports: {} };
  const requireModule = (name) => {
    if (name.endsWith('StoreContext'))
      return {
        useStore: () => ({
          api: {},
          config: { contracts: {} },
          user: { username: 'tester' },
          can: () => allowed,
        }),
      };
    if (name.endsWith('useResource'))
      return {
        useResource: (_, dependencies) =>
          subscription && dependencies.length === 1
            ? {
                data: [
                  {
                    subscriptionType: 'Device',
                    subscriptionCount: 2,
                    unsubscriptionCount: 1,
                  },
                ],
                loading: false,
                error: null,
                reload: () => {},
              }
            : {
                error: new Error('HTTP 500'),
                loading: false,
                data: null,
              },
      };
    if (name.endsWith('common/contracts'))
      return {
        scopes: { devices: 'dm:devices:view' },
        readPath: () => undefined,
      };
    if (name.endsWith('services/api'))
      return { SpecificationGap: class extends Error {} };
    if (name.endsWith('components/States'))
      return {
        useFeedback: () => ({}),
        Permission: () => React.createElement('div', null, 'Permission denied'),
        Warning: () => null,
        ErrorState: () => React.createElement('div', null, 'RESULT-ONLY-ERROR'),
      };
    if (name.endsWith('DeviceSearch'))
      return {
        __esModule: true,
        default: () => React.createElement('div', null, 'Search Devices'),
      };
    if (name.includes('/EntgraTable'))
      return {
        __esModule: true,
        default: (props) =>
          React.createElement(
            'table',
            null,
            React.createElement(
              'thead',
              null,
              React.createElement(
                'tr',
                null,
                props.columns.map((col) =>
                  React.createElement('th', { key: col.name }, col.title),
                ),
              ),
            ),
          ),
      };
    if (name === 'react-i18next')
      return { useTranslation: () => ({ t: (key) => packs.en[key] || key }) };
    if (name === 'react' && subscription)
      return {
        ...React,
        useState: (initial) =>
          React.useState(initial === null ? subscriptionSelection : initial),
      };
    return require(name);
  };
  vm.runInNewContext(
    source,
    { module, exports: module.exports, require: requireModule, console },
    { filename: file },
  );
  return renderToStaticMarkup(
    React.createElement(module.exports.default, {
      action,
      app: { deviceType: 'android', type: 'ENTERPRISE' },
      release: { uuid: 'test' },
    }),
  );
}

test('install and uninstall device errors retain search, table columns and action bar', () => {
  for (const action of ['install', 'uninstall']) {
    const html = wizardMarkup(action);
    assert.match(html, /Search Devices/);
    for (const column of [
      'Device',
      'Model',
      'Owner',
      'Serial Number',
      'Last Updated',
      'Status',
      'Ownership',
      'OS Version',
      'IMEI',
    ])
      assert.ok(html.includes(`<th>${column}</th>`), column);
    assert.match(html, /disabled/);
    assert.match(
      html,
      action === 'install' ? /Schedule Install/ : /Schedule Uninstall/,
    );
    assert.doesNotMatch(html, /RESULT-ONLY-ERROR/);
  }
});

test('missing device permission replaces the picker with permission messaging', () => {
  const html = wizardMarkup('install', false);
  assert.match(html, /Permission denied/);
  assert.doesNotMatch(html, /<table/);
});

test('subscription empty selection uses specified copy and shows both count labels', () => {
  const html = wizardMarkup('install', true, null);
  assert.match(html, /Select to view details\./);
  assert.match(html, /Please select a device, group, role, or user/);
  assert.match(html, /Installed:/);
  assert.match(html, /Uninstalled:/);
});

test('selected subscription retains all four status lanes, search and table on errors', () => {
  const html = wizardMarkup('install', true, {
    kind: 'Device',
    uninstalled: false,
  });
  for (const label of [
    'Completed',
    'Pending',
    'Error',
    'New',
    'Search Devices',
  ])
    assert.ok(html.includes(label), label);
  assert.match(html, /<table/);
  assert.doesNotMatch(html, /RESULT-ONLY-ERROR/);
  assert.doesNotMatch(html, /Percentage|StatisticsCard/);
});

test('admin subscription transport separates lowercase identity/query from uppercase lane', async () => {
  const compile = (file, dependencies = {}) => {
    const module = { exports: {} };
    const code = babel.transformFileSync(path.join(root, file), {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    }).code;
    vm.runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        require: (name) => dependencies[name] || require(name),
        URL,
        URLSearchParams,
      },
      { filename: file },
    );
    return module.exports;
  };
  const requests = [];
  const dto = { count: 1, data: [{ subId: 2 }] };
  const http = {
    get: async (url, options) => {
      requests.push({ url, ...options });
      return { data: 'installer-bytes' };
    },
    request: async (request) => {
      requests.push(request);
      return { data: { data: dto } };
    },
  };
  const { createApi } = compile('src/services/api.js', {
    axios: { __esModule: true, default: { create: () => http } },
    '../common/contracts': compile('src/common/contracts.js'),
  });
  const config = JSON.parse(
    fs.readFileSync(path.join(root, 'public/conf/config.json'), 'utf8'),
  );
  const api = createApi(config);
  for (const [kind, state, lane] of [
    ['Device', 'subscribed', 'COMPLETED'],
    ['User', 'unsubscribed', 'ERROR'],
  ]) {
    const result = await api.subscriptions(
      'release-id',
      kind,
      { subscriptionStatus: state, offset: 0, limit: 10 },
      lane,
    );
    const request = requests.at(-1);
    assert.equal(request.method, 'GET');
    assert.ok(
      request.url.endsWith(
        `/subscriptions/${kind.toLowerCase()}/devices/${lane}`,
      ),
    );
    assert.equal(request.params.subscriptionStatus, state);
    assert.equal(result, dto, 'handler is unwrapped once');
  }
  const installer =
    'http://localhost:9763/api/application-mgt/v1.0/artifact/1/hash/installer?fileName=app.apk';
  assert.equal(await api.download(installer), 'installer-bytes');
  assert.equal(
    requests.at(-1).url,
    installer,
    'artifact URL must not become a Store invoker request',
  );
  assert.equal(requests.at(-1).responseType, 'blob');
  assert.throws(() =>
    api.subscriptions(
      'id',
      'Device',
      { subscriptionStatus: 'INSTALLED' },
      'COMPLETED',
    ),
  );
});

test('Entgra 4.2 filter compatibility retains fields and uses unique React identities', () => {
  const patch = require('../build/entgra-filter-keys.cjs');
  const source = fs.readFileSync(
    path.join(
      root,
      'node_modules/@entgra-ui/antd/entgra_ui/components/EntgraSearchFilter/EntgraCommonFilterForm/index.js',
    ),
    'utf8',
  );
  const patched = patch(source);
  assert.equal(
    (patched.match(/key: '(?:filter|value)-' \+ field.key/g) || []).length,
    7,
  );
  assert.equal(
    (patched.match(/name: \[field.name, '(?:filter|value)'\]/g) || []).length,
    7,
  );
  assert.doesNotMatch(
    patched,
    /bodyStyle:|dropdownMatchSelectWidth:|bordered: false/,
  );
  assert.match(patched, /callback\(\{\}, \{\}\)/);
  assert.throws(() => patch('unrecognized vendor source'), /needs review/);
  babel.parseSync(patched);
});
