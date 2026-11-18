import "./typescript-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AxiosError } from "axios";
const {
  integrationAccess,
  enterpriseSyncPath,
  enterpriseResultKey,
  playApproveUrl,
} = await import("../src/services/platformContracts.ts");
const { configureApi, http } = await import("../src/services/api.ts");
const { platformApi } = await import("../src/services/platformIntegrations.ts");
const config = JSON.parse(
  readFileSync(new URL("../public/conf/config.json", import.meta.url)),
);
configureApi(config);
let calls = [];
let body;
let failure = 0;
http.defaults.adapter = async (request) => {
  calls.push(request);
  if (failure)
    throw new AxiosError("test failure", undefined, request, undefined, {
      status: failure,
      data: { message: "upstream error" },
      config: request,
    });
  return {
    status: 200,
    statusText: "OK",
    headers: {},
    config: request,
    data: { data: body },
  };
};
test.beforeEach(() => {
  calls = [];
  body = undefined;
  failure = 0;
});
test("AE token is loaded through Android gateway with all flags and encoded host", async () => {
  body = { token: "embed-test-token" };
  assert.equal(
    await platformApi.enterpriseToken("https://localhost:5173"),
    "embed-test-token",
  );
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url, "https://localhost");
  assert.equal(
    url.pathname,
    "/publisher-ui-request-handler/invoke/device-mgt/android/v1.0/enterprise/store-url",
  );
  for (const flag of [
    "approveApps",
    "searchEnabled",
    "isPrivateAppsEnabled",
    "isWebAppEnabled",
    "isOrganizeAppPageVisible",
    "isManagedConfigEnabled",
  ])
    assert.equal(url.searchParams.get(flag), "true");
  assert.equal(url.searchParams.get("host"), "https://localhost:5173");
  assert.equal(calls[0].withCredentials, true);
});
test("optional token failures and malformed payloads leave token unset", async () => {
  for (const status of [404, 403, 500, 401]) {
    failure = status;
    assert.equal(
      await platformApi.enterpriseToken("https://localhost:5173"),
      null,
    );
  }
  failure = 0;
  for (const value of [
    undefined,
    {},
    { token: null },
    { token: 123 },
    { token: "" },
  ]) {
    body = value;
    assert.equal(
      await platformApi.enterpriseToken("https://localhost:5173"),
      null,
    );
  }
});
test("empty package never sends a request; package values stay a single encoded parameter", async () => {
  for (const value of ["", "  \t "])
    assert.throws(() => platformApi.importAndroidPackage(value));
  assert.equal(calls.length, 0);
  const path = enterpriseSyncPath(" com.example.app&x=1 ");
  const url = new URL(path, "https://localhost");
  assert.equal(
    url.searchParams.get("approveAppPackage"),
    "com.example.app&x=1",
  );
  assert.equal(url.searchParams.has("x"), false);
  await platformApi.importAndroidPackage("com.example.app");
  assert.match(
    calls[0].url,
    /\/device-mgt\/android\/v1.0\/enterprise\/products\/sync\?/,
  );
});
test("token and scopes independently gate import, approve, VPP and MCM", () => {
  assert.deepEqual(integrationAccess([], null), {
    androidImport: false,
    androidApprove: false,
    appleVpp: false,
    managedConfigurations: false,
  });
  assert.equal(
    integrationAccess(["and:enterprise:view"], null).androidImport,
    false,
  );
  assert.equal(integrationAccess([], "token").androidImport, false);
  assert.equal(integrationAccess([], "token").androidApprove, true);
  assert.equal(
    integrationAccess(["and:enterprise:view"], "token").androidImport,
    true,
  );
  assert.equal(
    integrationAccess(["am:store:vpp:assets:modify"], null).appleVpp,
    true,
  );
  assert.equal(
    integrationAccess(["and:enterprise:view"], "token").managedConfigurations,
    false,
  );
  assert.equal(
    integrationAccess(["and:enterprise:modify"], "token").managedConfigurations,
    true,
  );
});
test("approve iframe has exactly the documented Google URL and parameters", () => {
  const url = new URL(playApproveUrl("a+b&other=bad"));
  assert.equal(
    url.origin + url.pathname,
    "https://play.google.com/work/embedded/search",
  );
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    token: "a+b&other=bad",
    mode: "APPROVE",
    showsearchbox: "TRUE",
  });
});
test("AE statuses produce exact Spec English and every integration key exists in all locales", () => {
  const en = JSON.parse(
    readFileSync(
      new URL(
        "../src/services/internationalization/locales/en.json",
        import.meta.url,
      ),
    ),
  );
  for (const [status, message] of [
    [200, "Apps synced successfully!"],
    [404, "Could not find the package: {{package}}"],
    [
      409,
      "An application with the same package name already exists and is on the latest version: {{package}}",
    ],
    [500, "Error occurred while syncing the apps."],
    [0, "Error occurred while syncing the apps."],
  ])
    assert.equal(en[enterpriseResultKey(status)], message);
  for (const locale of ["es", "fr", "ja"]) {
    const pack = JSON.parse(
      readFileSync(
        new URL(
          `../src/services/internationalization/locales/${locale}.json`,
          import.meta.url,
        ),
      ),
    );
    for (const key of Object.keys(en).filter((key) =>
      /^(ae|vpp|platform)\./.test(key),
    ))
      assert.ok(pack[key], `${locale}:${key}`);
  }
});
test("VPP metadata and assets sync use their configured invoker segments", async () => {
  body = { metaValue: "configured" };
  assert.deepEqual(await platformApi.depMetadata(), {
    metaValue: "configured",
  });
  await platformApi.syncVpp();
  assert.equal(
    calls[0].url,
    config.serverConfig.invoker.uri +
      config.serverConfig.invoker.deviceMgt +
      "/metadata/DEP_META_KEY",
  );
  assert.equal(
    calls[1].url,
    config.serverConfig.invoker.uri +
      config.serverConfig.invoker.store +
      "/vpp/assets/sync",
  );
  assert.ok(calls.every((call) => call.method === "get"));
});

test("MCM create/update URLs and events reject malformed IDs", async () => {
  const { managedConfigurationUrl, managedConfigurationEvent } =
    await import("../src/services/platformContracts.ts");
  const create = new URL(
    managedConfigurationUrl("token+&", "com.example.test"),
  );
  assert.deepEqual(Object.fromEntries(create.searchParams), {
    token: "token+&",
    packageName: "com.example.test",
  });
  const update = new URL(
    managedConfigurationUrl("token", "com.example.test", "config/&id"),
  );
  assert.equal(update.searchParams.get("mcmId"), "config/&id");
  assert.equal(update.searchParams.get("canDelete"), "true");
  assert.deepEqual(
    managedConfigurationEvent({ mcmId: "id", name: "Profile" }),
    { mcmId: "id", name: "Profile" },
  );
  assert.deepEqual(managedConfigurationEvent({ mcmId: "id" }), {
    mcmId: "id",
    name: "",
  });
  for (const value of [null, {}, { mcmId: 1 }, { mcmId: "  " }])
    assert.throws(() => managedConfigurationEvent(value));
});
test("MCM uses contracted read, POST, PUT and encoded DELETE with only documented fields", async () => {
  body = { mcmId: "old-profile" };
  assert.deepEqual(await platformApi.managedConfiguration("com.example/app"), {
    mcmId: "old-profile",
  });
  const payload = {
    mcmId: "new-profile",
    profileName: "Work Profile",
    packageName: "com.example.app",
  };
  await platformApi.saveManagedConfiguration(false, payload);
  await platformApi.saveManagedConfiguration(true, payload);
  await platformApi.deleteManagedConfiguration("new/profile");
  assert.ok(
    calls[0].url.endsWith("/managed-configs/package/com.example%2Fapp"),
  );
  assert.deepEqual(
    calls.map((call) => call.method),
    ["get", "post", "put", "delete"],
  );
  for (const index of [1, 2]) {
    assert.ok(calls[index].url.endsWith("/managed-configs"));
    assert.deepEqual(JSON.parse(calls[index].data), payload);
  }
  assert.ok(calls[3].url.endsWith("/managed-configs/mcm/new%2Fprofile"));
});

test("optional token errors preserve session; managed API 401 still expires it", async () => {
  const originalWindow = globalThis.window;
  const events = [];
  globalThis.window = { dispatchEvent: (event) => events.push(event.type) };
  try {
    failure = 401;
    assert.equal(
      await platformApi.enterpriseToken("https://localhost:5173"),
      null,
    );
    assert.deepEqual(events, []);
    await assert.rejects(
      platformApi.syncVpp(),
      (error) => error.status === 401,
    );
    assert.deepEqual(events, ["publisher:unauthorized"]);
  } finally {
    globalThis.window = originalWindow;
  }
});
test("Google client script loads once for concurrent MCM openings and uses gapi.iframes", async () => {
  const { loadManagedConfigurationClient } =
    await import("../src/services/googleManagedConfigurations.ts");
  const originalWindow = globalThis.window,
    originalDocument = globalThis.document;
  const scripts = [];
  const iframeApi = { CROSS_ORIGIN_IFRAMES_FILTER: {}, getContext: () => ({}) };
  globalThis.window = { setTimeout, clearTimeout };
  globalThis.document = {
    createElement: () => ({ remove() {} }),
    head: { appendChild: (script) => scripts.push(script) },
  };
  try {
    const first = loadManagedConfigurationClient(),
      second = loadManagedConfigurationClient();
    assert.equal(first, second);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, "https://apis.google.com/js/client.js");
    let loadedModule;
    window.gapi = {
      load: (module, callback) => {
        loadedModule = module;
        window.gapi.iframes = iframeApi;
        callback();
      },
    };
    scripts[0].onload();
    assert.equal(await first, iframeApi);
    assert.equal(await second, iframeApi);
    assert.equal(loadedModule, "gapi.iframes");
    assert.equal(await loadManagedConfigurationClient(), iframeApi);
    assert.equal(scripts.length, 1);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
