# Entgra App Store — specification-only rebuild

React Store SPA served at `/store/`, implemented from the supplied IoTS product/API/scene Specs and library-independent shared component Specs. No existing Store implementation was read or copied. Shared widgets are implemented locally in `src/shared`; the app does not import any Entgra UI component package.

## Run

```bash
npm ci
STORE_BACKEND=https://localhost:9443 npm start
```

Open **http://localhost:3000/store/**. The dev server proxies `/store-ui-request-handler` and `/api` to `STORE_BACKEND`. Use `STORE_TLS_VERIFY=false` only for a local backend with a self-signed certificate. Without `STORE_BACKEND`, deploy a same-origin reverse proxy for those paths; the SPA needs a real request-handler session and does not fall back to demo data.

```bash
npm run build
npm run lint
npm test
# With the dev server running:
npx playwright install chromium
npm run test:browser
```

`build_prod` and `build_dev` are also available. Build output is **`dist/store/`**. Serve that folder at `/store/`; rewrite SPA page routes to `/store/index.html`. Preserve `/store/public/conf/config.json`, asset paths, `/store-ui-request-handler/*`, and `/api/*` as real endpoints rather than rewriting them to HTML.

## Runtime configuration

Edit `public/conf/config.json` before building (or the corresponding deployed file). It provides the documented request-handler paths, invoker segments, primary color and local logo defaults. Store APIs always use the same-origin invoker with session cookies; no OAuth access token is stored in the browser and no Bearer header is created.

Startup: public config → POST user → GET scopes → deployment UI config → visible device types and optional whitelabel → shell. A 401 redirects to form login or deployment SSO; missing view scopes leave the shell visible with a 403 main pane. Backend/config failures are not presented as successful empty catalogues.

External console URLs are not specified by the source Specs. Supply these application integration settings to enable the corresponding links (values must come from your deployment):

```json
{
  "deploymentLinks": {
    "endpointManager": "<deployment-provided absolute URL>",
    "appPublisher": "<deployment-provided absolute URL>",
    "addPolicy": "<deployment-provided absolute URL>"
  }
}
```

Tenant-domain form behavior, dynamic search schemas and other unresolved details are explicitly tracked in [docs/gap-register.md](docs/gap-register.md).

## Implemented surfaces

- Cookie session login, SSO redirects, logout confirmation, safe return URLs, scope gates, first-visit/restartable tour and persisted en/ja/fr/es locale selection.
- Gradient collapsible sider, header navigator/flag languages/profile, visible device-type strip, local Poppins, favicon, whitelabel/fallback footer.
- Apps infinite catalogue, favourites, WEB_CLIP external action, CUSTOM firmware segment and right-aligned pagination.
- Release identity, lifecycle/Play-synced action gates, favourite, enterprise download, versions, App and Subscription Details tabs.
- In-memory Subscribe hand-off to Device/User/Role/Group install/uninstall pickers, schedule/options/confirmations and failure-retaining selection.
- Review writing/editing/replies/deletion and admin delete-only moderation; subscription counts, identities, status lanes, retry, status update and operation expansion.
- Firmware package releases, searchable detail, Device/Group install modal with applicability buckets and subscriptions modal without New lane.

## Verification

`tests/fixture.cjs` uses synthetic DTOs matching the documented envelopes and fields. `tests/browser.cjs` runs the real SPA in Chromium with test-only intercepted backend responses. It writes screenshots to ignored `.artifacts/`. There is no fixture switch, mock endpoint or fake data path in production code.

See [docs/fidelity-checklist.md](docs/fidelity-checklist.md) for source mapping and verification limits. A live UEM integration pass remains necessary; deployment credentials and a backend were not provided.

Poppins font files are served locally from Google Fonts; Entgra artwork is copied only from the supplied spec repository. Default title: **Entgra App Store**. Default footer: **Unified Endpoint Manager**.
