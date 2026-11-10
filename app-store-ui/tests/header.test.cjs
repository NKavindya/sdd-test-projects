const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
function compile(file, dependencies = {}) {
  const module = { exports: {} };
  const code = babel.transformFileSync(path.join(root, file), {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
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
}
function shell(footerText) {
  const widget = (tag) => ({
    __esModule: true,
    default: ({ children, footerText }) =>
      React.createElement(tag, null, footerText || children),
  });
  const Home = compile('src/scenes/Home/index.js', {
    '@entgra-ui/antd/entgra_ui/components/EntgraSider': widget('aside'),
    '@entgra-ui/antd/entgra_ui/components/EntgraHeader': widget('header'),
    '@entgra-ui/antd/entgra_ui/components/EntgraFooter': widget('footer'),
    '../../common/branding': compile('src/common/branding.js'),
    '../../common/contracts': compile('src/common/contracts.js'),
    '../../services/StoreContext': {
      useStore: () => ({
        config: { defaultPlatformIcons: {} },
        branding: { footerText },
        deviceTypes: [],
        user: { username: 'reviewer' },
        can: () => true,
      }),
    },
    'react-router-dom': {
      Link: ({ children, to }) =>
        React.createElement('a', { href: to }, children),
      Outlet: () => null,
      useLocation: () => ({ pathname: '/store/android/applications' }),
      useNavigate: () => () => {},
    },
    'react-i18next': {
      useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
    },
    'react-joyride': { __esModule: true, default: () => null },
  }).default;
  return renderToStaticMarkup(React.createElement(Home));
}
test('authenticated shell defaults to the exact pack footer and prefers whitelabel text', () => {
  assert.ok(
    shell().includes(
      '<footer>Entgra UEM Server 6.4.5.0-SNAPSHOT | © 2025 , All Rights Reserved.</footer>',
    ),
  );
  assert.ok(shell('Tenant footer').includes('<footer>Tenant footer</footer>'));
  assert.ok(!shell().includes('Unified Endpoint Manager'));
});
test('closed language value includes its flag and profile uses the blue circle and person icon', () => {
  const html = shell();
  assert.match(html, /🇺🇸 English/);
  assert.match(html, /background-color:#4288BA/);
  assert.match(html, /ant-avatar-circle/);
  assert.match(html, /aria-label="user"/);
});
