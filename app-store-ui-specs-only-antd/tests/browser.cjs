const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { fixture, allScopes } = require('./fixture.cjs');
const base = process.env.STORE_TEST_URL || 'http://localhost:3000';
const artifacts = '.artifacts';
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  let passed = 0;
  async function test(name, options, run) {
    if (
      process.env.STORE_TEST_FILTER &&
      !new RegExp(process.env.STORE_TEST_FILTER).test(name)
    )
      return;
    const context = await browser.newContext({
      viewport: { width: 1854, height: 965 },
    });
    const { state, calls } = await fixture(context, options);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await run(page, state, calls);
      assert.deepEqual(errors, []);
      passed++;
      console.log('PASS ' + name);
    } catch (e) {
      await page.screenshot({
        path: artifacts + '/failure.png',
        fullPage: true,
      });
      throw new Error(name + ': ' + e.stack);
    } finally {
      await context.close();
    }
  }
  const goto = (page, path = '/store/') => page.goto(base + path);
  const ready = (page) =>
    page.getByText('Microsoft Teams', { exact: true }).first().waitFor();
  async function release(page) {
    await goto(page);
    await ready(page);
    await page.locator('.app-card').first().click();
    await page
      .getByRole('button', { name: 'Subscribe', exact: true })
      .waitFor();
  }
  async function wizard(page, action = 'Install') {
    await release(page);
    await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
    await page.getByRole('menuitem', { name: action, exact: true }).click();
    await page.getByRole('cell', { name: 'Pixel 8', exact: true }).waitFor();
  }
  await test(
    'catalogue shell, font, filters and language',
    {},
    async (page, state, calls) => {
      await goto(page);
      await ready(page);
      assert.equal(new URL(page.url()).pathname, '/store/android/applications');
      await page.evaluate(() => document.fonts.ready);
      assert.match(
        await page
          .locator('.app-name')
          .evaluate((el) => getComputedStyle(el).fontFamily),
        /Poppins/,
      );
      assert.equal(
        await page.evaluate(() => document.fonts.check('14px Poppins')),
        true,
      );
      assert.equal(await page.title(), 'Entgra App Store');
      await page
        .getByText('Unified Endpoint Manager', { exact: true })
        .waitFor();
      await page.screenshot({ path: artifacts + '/catalogue.png' });
      await page.getByText('Search Apps', { exact: true }).click();
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByText('App Name', { exact: true }).click();
      await page.getByPlaceholder('App Name').fill('Teams');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.waitForTimeout(150);
      assert.equal(
        calls.filter((c) => c.path.endsWith('/applications/apps')).at(-1).body
          .appName,
        'Teams',
      );
      await page.locator('.language').click();
      await page.getByText('Japanese', { exact: true }).click();
      await page.getByText('アプリを検索', { exact: true }).waitFor();
      await page.getByText('お気に入り', { exact: true }).waitFor();
      await page.reload();
      await page.getByText('アプリを検索', { exact: true }).waitFor();
      assert.ok(calls.every((c) => !c.headers.authorization));
    },
  );
  await test('favourite confirmation and last removal', {}, async (page) => {
    await goto(page);
    await ready(page);
    await page
      .getByRole('button', { name: 'Add to favourite', exact: true })
      .click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(
      await page
        .getByRole('button', { name: 'Add to favourite', exact: true })
        .count(),
      1,
    );
    await page
      .getByRole('button', { name: 'Add to favourite', exact: true })
      .click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page
      .getByRole('button', { name: 'Remove from favourite', exact: true })
      .waitFor();
    await page.getByText('Favourites', { exact: true }).first().click();
    await page
      .getByRole('button', { name: 'Remove from favourite', exact: true })
      .click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByText('No apps, yet.', { exact: true }).waitFor();
  });
  await test(
    'device install and schedule gating',
    {},
    async (page, state, calls) => {
      await wizard(page);
      const install = page.getByRole('button', {
        name: 'Install',
        exact: true,
      });
      assert.equal(await install.isDisabled(), true);
      await page
        .locator('.ant-table-tbody input[type=checkbox]')
        .first()
        .check();
      await page.getByLabel('Schedule Install', { exact: true }).check();
      assert.equal(await install.isDisabled(), true);
      await page.getByLabel('Schedule Install', { exact: true }).uncheck();
      await install.click();
      await page
        .getByText('Done! Operation triggered!', { exact: true })
        .waitFor();
      assert.match(page.url(), /\/install$/);
      const call = calls.find((c) => c.path.endsWith('/devices/install'));
      assert.deepEqual(call.body, [{ id: 'device-1', type: 'android' }]);
      assert.equal(call.query.timestamp, '0');
      await page.screenshot({ path: artifacts + '/install.png' });
      await page.reload();
      await ready(page);
      assert.match(page.url(), /\/applications$/);
    },
  );
  await test(
    'user, role and group install selectors',
    {},
    async (page, state, calls) => {
      await wizard(page);
      for (const [tab, value] of [
        ['User', 'admin'],
        ['Role', 'Role'],
        ['Group', 'Group'],
      ]) {
        await page.getByRole('tab', { name: tab, exact: true }).click();
        if (tab === 'Group')
          await page.locator('.ant-tree-checkbox').first().click();
        else {
          await page.locator('.identity-select').click();
          await page
            .locator('.ant-select-item-option-content')
            .filter({ hasText: new RegExp('^' + value + '$') })
            .click();
          await page.keyboard.press('Escape');
        }
        await page
          .getByRole('button', { name: 'Install', exact: true })
          .click();
        await page.waitForTimeout(100);
        assert.ok(
          calls.some((c) =>
            c.path.endsWith('/' + tab.toUpperCase() + '/install'),
          ),
        );
      }
    },
  );
  await test(
    'uninstall candidates and submit use separate contract',
    {},
    async (page, state, calls) => {
      await wizard(page, 'Uninstall');
      await page
        .locator('.ant-table-tbody input[type=checkbox]')
        .first()
        .check();
      await page
        .getByRole('button', { name: 'Uninstall', exact: true })
        .click();
      await page
        .getByText('Done! Operation triggered!', { exact: true })
        .waitFor();
      assert.ok(
        calls.some(
          (c) =>
            c.method === 'GET' &&
            c.path.endsWith('/subscription/release-1/devices'),
        ),
      );
      assert.ok(
        calls.some(
          (c) => c.method === 'POST' && c.path.endsWith('/devices/uninstall'),
        ),
      );
    },
  );
  await test('API failure keeps picker chrome', {}, async (page, state) => {
    state.failDevices = true;
    await release(page);
    await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Install', exact: true }).click();
    await page
      .getByText('There was a problem', { exact: true })
      .first()
      .waitFor();
    await page.getByText('Search Devices', { exact: true }).waitFor();
    await page
      .getByRole('columnheader', { name: 'Device', exact: true })
      .waitFor();
  });
  await test(
    'subscription lanes, retries, status edit and identities',
    {},
    async (page, state, calls) => {
      await release(page);
      await page
        .getByRole('tab', { name: 'Subscription Details', exact: true })
        .click();
      await page
        .getByText('Select to view details.', { exact: true })
        .waitFor();
      await page.screenshot({ path: artifacts + '/subscriptions.png' });
      await page
        .locator('.subscription-sidebar .ant-card')
        .first()
        .getByRole('button', { name: 'Installed: 1', exact: true })
        .click();
      await page.getByRole('tab', { name: 'Error', exact: true }).click();
      await page
        .getByRole('cell', { name: 'Pixel 8', exact: false })
        .first()
        .waitFor();
      assert.equal(
        await page
          .getByRole('button', { name: 'Retry Installation', exact: true })
          .isDisabled(),
        true,
      );
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await page.getByRole('button', { name: 'Yes', exact: true }).click();
      await page
        .getByText('Done! Installation retry successful!', { exact: true })
        .waitFor();
      assert.ok(
        calls.some(
          (c) =>
            c.path.endsWith('/devices/ERROR') &&
            c.query.subscriptionStatus === 'subscribed',
        ),
      );
      await page.getByRole('tab', { name: 'Pending', exact: true }).click();
      await page.getByRole('button', { name: 'Error', exact: true }).click();
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      await page
        .getByText('Operation updated successfully', { exact: true })
        .waitFor();
      assert.ok(
        calls.some((c) => c.method === 'PUT' && c.body.status === 'ERROR'),
      );
      for (const index of [1, 2, 3]) {
        await page
          .locator('.subscription-sidebar .ant-card')
          .nth(index)
          .getByRole('button', { name: 'Installed: 1', exact: true })
          .click();
        await page.waitForTimeout(100);
        assert.ok(
          calls.some((c) =>
            c.path.endsWith(
              '/subscriptions/' + ['device', 'user', 'role', 'group'][index],
            ),
          ),
        );
      }
    },
  );
  await test('reviews save and cancel', {}, async (page) => {
    await release(page);
    await page
      .getByRole('button', { name: 'Write a Review', exact: true })
      .click();
    await page.locator('.ant-drawer .star-container').nth(3).click();
    await page.locator('.ant-drawer textarea').fill('Review fixture');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Review fixture', { exact: true }).first().waitFor();
    await page
      .getByRole('button', { name: 'Write a Review', exact: true })
      .click();
    await page.locator('.ant-drawer textarea').fill('Discard fixture');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(
      await page.getByText('Discard fixture', { exact: true }).count(),
      0,
    );
  });
  await test(
    'firmware detail and modal flows',
    {},
    async (page, state, calls) => {
      await goto(page);
      await ready(page);
      await page.getByText('Firmware', { exact: true }).first().click();
      await page.locator('.firmware-card').first().click();
      await page.getByRole('button', { name: 'Install', exact: true }).click();
      await page.getByRole('cell', { name: 'Pixel 8', exact: true }).waitFor();
      await page
        .getByRole('tab', { name: 'Inapplicable Devices', exact: true })
        .click();
      assert.equal(
        await page
          .getByRole('button', { name: 'Install', exact: true })
          .last()
          .isDisabled(),
        true,
      );
      await page
        .getByRole('tab', { name: 'Unmanaged Devices', exact: true })
        .click();
      await page
        .locator('.ant-modal .ant-table-tbody input[type=checkbox]')
        .first()
        .check();
      await page
        .getByRole('button', { name: 'Install', exact: true })
        .last()
        .click();
      await page
        .getByText(
          'Are you sure you want to install this firmware on unmanaged devices?',
          { exact: true },
        )
        .waitFor();
      await page.getByRole('button', { name: 'Yes', exact: true }).click();
      await page
        .getByText('Done! Operation triggered!', { exact: true })
        .waitFor();
      assert.match(page.url(), /\/firmware\/2$/);
      await page
        .getByRole('button', { name: 'Subscription Details', exact: true })
        .click();
      await page
        .locator('.ant-modal .subscription-sidebar .ant-card')
        .first()
        .getByRole('button', { name: 'Installed: 1', exact: true })
        .click();
      await page.getByRole('tab', { name: 'Completed', exact: true }).waitFor();
      assert.equal(
        await page.getByRole('tab', { name: 'New', exact: true }).count(),
        0,
      );
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      await page.getByRole('button', { name: 'Firmware', exact: true }).click();
      await page.locator('.firmware-card').first().waitFor();
      assert.ok(
        calls.some((c) => c.path.includes('/firmware/firmware-1/devices')),
      );
    },
  );
  await test(
    'sparse scopes preserve shell and block content',
    { scopes: [] },
    async (page) => {
      await goto(page);
      await page.getByText('403', { exact: true }).waitFor();
      await page
        .getByText("You don't have permission to view apps.", { exact: true })
        .waitFor();
      await page
        .getByText('Unified Endpoint Manager', { exact: true })
        .waitFor();
      assert.match(page.url(), /\/applications$/);
    },
  );
  await test(
    'catalogue heart and release scope asymmetry',
    { scopes: ['am:store:app:view', 'dm:device-type:view'] },
    async (page) => {
      await goto(page);
      await ready(page);
      assert.equal(
        await page
          .getByRole('button', { name: 'Add to favourite', exact: true })
          .count(),
        1,
      );
      await page.locator('.app-card').first().click();
      await page
        .getByText(
          'Some permissions are not given to manage subscriptions for a release',
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page
          .getByRole('button', { name: 'Add to favourite', exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page
          .getByRole('button', { name: 'Subscribe', exact: true })
          .isDisabled(),
        true,
      );
    },
  );
  await test(
    'nonpublished defaults to subscription tab',
    {
      app: {
        applicationReleases: [
          { uuid: 'release-1', version: '1.0', currentStatus: 'RELEASED' },
        ],
      },
    },
    async (page) => {
      await release(page);
      assert.equal(
        await page
          .getByRole('tab', { name: 'Subscription Details', exact: true })
          .getAttribute('aria-selected'),
        'true',
      );
      assert.equal(
        await page
          .getByRole('button', { name: 'Subscribe', exact: true })
          .isDisabled(),
        true,
      );
    },
  );
  await test(
    'Play-synced Subscribe never opens wizard',
    {
      app: {
        isAndroidEnterpriseApp: true,
        categories: ['GooglePlaySyncedApp'],
      },
    },
    async (page) => {
      await release(page);
      assert.equal(
        await page
          .getByRole('button', { name: 'Subscribe', exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page
          .getByRole('menuitem', { name: 'Install', exact: true })
          .count(),
        0,
      );
    },
  );
  await test('missing appType and cold wizard routes', {}, async (page) => {
    await goto(page, '/store/android/apps/release-1');
    await page
      .getByRole('heading', { name: 'No Releases Found', exact: true })
      .waitFor();
    await goto(page, '/store/android/apps/release-1/uninstall');
    await ready(page);
    assert.match(page.url(), /\/applications$/);
  });
  await test(
    'anonymous deep link, invalid login and safe return',
    { authenticated: false },
    async (page) => {
      await goto(page, '/store/android/apps/release-1?appType=PUBLIC');
      await page.getByLabel('Username', { exact: true }).fill('admin');
      await page.getByLabel('Password', { exact: true }).fill('bad');
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await page.getByText('Invalid Login Details', { exact: true }).waitFor();
      await page.getByLabel('Password', { exact: true }).fill('valid');
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await page
        .getByRole('button', { name: 'Subscribe', exact: true })
        .waitFor();
      assert.match(page.url(), /\/apps\/release-1/);
    },
  );
  await test('mid-session 401 returns to login', {}, async (page, state) => {
    await goto(page);
    await ready(page);
    state.authenticated = false;
    await page.getByText('Favourites', { exact: true }).first().click();
    await page.getByLabel('Username', { exact: true }).waitFor();
    assert.match(page.url(), /\/login\?redirect=/);
  });
  await test(
    'tour flag set on start and restart',
    { tour: true },
    async (page) => {
      await goto(page);
      await page.getByRole('button', { name: 'Skip', exact: true }).waitFor();
      assert.equal(
        await page.evaluate(() => localStorage.getItem('ui-tour-store')),
        '1',
      );
      await page.getByRole('button', { name: 'Skip', exact: true }).click();
      await page.getByRole('button', { name: 'admin', exact: true }).click();
      await page
        .getByRole('menuitem', { name: 'Start UI Tour', exact: true })
        .click();
      await page.getByRole('button', { name: 'Skip', exact: true }).waitFor();
    },
  );
  await test('logout cancellation and confirmation', {}, async (page) => {
    await goto(page);
    await ready(page);
    await page.getByRole('button', { name: 'admin', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await ready(page);
    await page.getByRole('button', { name: 'admin', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
    await page.getByRole('button', { name: 'OK', exact: true }).click();
    await page.getByLabel('Username', { exact: true }).waitFor();
  });
  await test(
    'hide scopes remove consoles and unauthorized app tabs',
    {
      scopes: [
        'am:store:app:view',
        'am:store:app:sub:install',
        'dm:device-type:view',
        'dm:hide:unauthorized:functions',
        'dm:hide:endpoint:mgt',
        'dm:hide:app:publisher',
      ],
    },
    async (page) => {
      await release(page);
      assert.equal(
        await page.getByText('Endpoint Manager', { exact: true }).count(),
        0,
      );
      assert.equal(
        await page.getByText('App Publisher', { exact: true }).count(),
        0,
      );
      await page
        .getByRole('button', { name: 'Subscribe', exact: true })
        .click();
      await page
        .getByRole('menuitem', { name: 'Install', exact: true })
        .click();
      await page.getByRole('tab', { name: 'User', exact: true }).waitFor();
      assert.equal(
        await page.getByRole('tab', { name: 'Device', exact: true }).count(),
        0,
      );
      assert.equal(
        await page.getByRole('tab', { name: 'Role', exact: true }).count(),
        0,
      );
      assert.equal(
        await page
          .getByRole('button', { name: 'Install', exact: true })
          .isEnabled(),
        true,
      );
    },
  );
  await test(
    'uninstall scope alone opens candidates but mutation can be rejected',
    { scopes: allScopes.filter((s) => s !== 'am:store:app:sub:install') },
    async (page, state, calls) => {
      await wizard(page, 'Uninstall');
      await page
        .locator('.ant-table-tbody input[type=checkbox]')
        .first()
        .check();
      await page
        .getByRole('button', { name: 'Uninstall', exact: true })
        .click();
      await page
        .getByText('There was a problem', { exact: true })
        .first()
        .waitFor();
      assert.match(page.url(), /\/uninstall$/);
      assert.equal(
        await page
          .locator('.ant-table-tbody input[type=checkbox]')
          .first()
          .isChecked(),
        true,
      );
      assert.ok(
        calls.some(
          (c) => c.method === 'POST' && c.path.endsWith('/devices/uninstall'),
        ),
      );
    },
  );
  await test(
    'non Play-synced Android Enterprise uses enterprise POST',
    { app: { isAndroidEnterpriseApp: true } },
    async (page, state, calls) => {
      await wizard(page);
      await page
        .locator('.ant-table-tbody input[type=checkbox]')
        .first()
        .check();
      await page.getByRole('button', { name: 'Install', exact: true }).click();
      await page
        .getByText('Done! Operation triggered!', { exact: true })
        .waitFor();
      assert.ok(
        calls.some(
          (c) =>
            c.path.endsWith('/devices/ent-app-install/install') &&
            c.query.requiresUpdatingExternal === 'true',
        ),
      );
    },
  );
  await test(
    'enterprise download is independent of install scope',
    {
      scopes: ['am:store:app:view', 'dm:device-type:view'],
      app: { type: 'ENTERPRISE' },
    },
    async (page, state, calls) => {
      await release(page);
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download', exact: true }).click();
      const download = await pending;
      assert.equal(await download.failure(), null);
      assert.match(page.url(), /\/apps\/release-1/);
      assert.equal(
        calls.some(
          (c) => c.path.includes('/subscription/') && c.method === 'POST',
        ),
        false,
      );
    },
  );
  await test(
    'WEB_CLIP install asks confirmation and uninstall warns',
    { app: { type: 'WEB_CLIP' } },
    async (page, state, calls) => {
      await wizard(page);
      assert.equal(
        await page.getByLabel('Block Uninstall', { exact: true }).count(),
        0,
      );
      await page
        .locator('.ant-table-tbody input[type=checkbox]')
        .first()
        .check();
      await page.getByRole('button', { name: 'Install', exact: true }).click();
      await page
        .getByText('Are you sure you want to install?', { exact: true })
        .waitFor();
      assert.equal(
        calls.some(
          (c) => c.method === 'POST' && c.path.endsWith('/devices/install'),
        ),
        false,
      );
      await page.getByRole('button', { name: 'No', exact: true }).click();
      await page
        .getByRole('link', { name: 'Microsoft Teams', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Subscribe', exact: true })
        .click();
      await page
        .getByRole('menuitem', { name: 'Uninstall', exact: true })
        .click();
      await page
        .getByText(
          'Web clips cannot be uninstalled on the latest versions of Android OS.',
          { exact: true },
        )
        .waitFor();
    },
  );
  await test(
    'SSO enabled anonymous visit redirects to handler',
    { authenticated: false, sso: true },
    async (page) => {
      await goto(page, '/store/android/applications');
      await page.waitForURL('**/store-ui-request-handler/ssoLogin?redirect=*');
      assert.equal(
        await page.getByRole('button', { name: 'Login', exact: true }).count(),
        0,
      );
    },
  );
  await test('brand logo links to the Store root', {}, async (page) => {
    await goto(page);
    await ready(page);
    assert.equal(await page.locator('a.logo').getAttribute('href'), '/store/');
    await page.locator('a.logo').click();
    await ready(page);
    assert.match(page.url(), /\/store\/android\/applications$/);
  });
  await browser.close();
  console.log(`${passed} browser scenarios passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
