# Entgra App Store — specification-driven HeroUI implementation

React/TypeScript Store SPA at `/store/`, implemented from the requested IoTS and shared component specifications. All runtime/library versions follow `system/ui-dependencies.md`, including HeroUI/styles 3.2.7 and explicit React Aria peers. No private Entgra packages are needed.

## Run

Use **Node >=22.12** (the specified i18n packages require Node 22).

```bash
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally `http://localhost:5173/store/`. A running UEM request handler and a valid Store account are required for real content. Vite chooses another port if 5173 is occupied.

```bash
npm run build
npm run preview
npm run lint
npm run test
npm run format
```

`lint` combines strict TypeScript checks (including unused declarations) with ESLint checks for JavaScript tooling. Tests exercise response envelopes, safe redirects, catalogue type separation, lifecycle gates, and subscription request paths.

## Backend and TLS

The dev server proxies `/store-ui-request-handler` and the specified direct bootstrap/asset `/api` paths to `https://localhost:9443`. Set `UEM_ORIGIN` or `STORE_BACKEND` to override the origin; `UEM_ORIGIN` takes precedence.

```bash
NODE_EXTRA_CA_CERTS=/absolute/path/uem-ca.pem UEM_ORIGIN=https://localhost:9443 npm run dev
```

Use the PEM CA that signed the local UEM certificate; its hostname must match the origin. Restart Node/Vite after changing the CA. TLS certificate verification stays enabled. The app never disables verification and never stores OAuth access/refresh tokens. Store, Publisher filter, and Device Management calls use the same-origin request-handler invoker with session cookies. Download artwork/artifacts use the URLs returned by the backend.

Production hosting must serve the build at `/store/`, provide SPA history fallback to `/store/index.html`, and route the handler/API paths to UEM on the same origin. `vite preview` serves the build for local inspection; use dev mode for the backend proxy. The runtime config is served from `/store/conf/config.json` (the specification permits an equivalent deployed public-conf path).

## Runtime configuration

Edit `public/conf/config.json` before building. It contains the documented handler/session paths, invoker API segments, branding defaults, and app identity. An optional `search` list can define jump destinations (`title`, Store `path`, required `scopes`). Optional `links.addPolicy` supplies the deployment's exact Endpoint Manager add-policy URL; the specifications do not give that route. There are no OAuth secrets in public configuration.

Language choices persist as `store-language`; first-tour completion is `ui-tour-store`. The four JSON packs live in `src/i18n/`. Google Fonts loads Poppins, and `react-twemoji` supplies language flags. For offline networks, host those assets locally.

SSO entry includes an encoded `redirect` parameter containing a validated Store URL on the frontend's origin. The request handler stores this as `redirectUrl` and uses it after the OAuth callback. This also returns to the correct frontend port during Vite development. If an earlier attempt failed at `SsoLoginCallbackHandler.java:101` because `redirectUrl` was missing, open the frontend's `/store/` URL to begin a fresh flow; do not reuse the old callback URL.

## App structure

- `src/shared/`: Entgra shell, footer, table, catalogue/common filters, accessible HeroUI controls.
- `src/scenes/`: login, catalogue/favourites, release, reviews, install/uninstall, subscription monitoring, firmware package/modals.
- `src/services/`: typed DTOs, request-handler client, scope/session state, transient wizard hand-offs.
- `docs/gap-register.md`: specification unknowns, preserved product quirks, intentional widget differences.
- `docs/fidelity-checklist.md`: acceptance and verification record.

## Test-only browser fixture

This fixture lets developers verify UI behavior without changing a UEM deployment. It is separate from production and is not a demo mode in the app.

```bash
node tests/backend.mjs
# In another terminal:
STORE_BACKEND=http://127.0.0.1:9444 npm run dev
```

Use fixture credentials `test-user` / `test`, or `sparse` / `test` for a session without app-view scope. Fixture state lives only in its process. Stop both processes after QA. Its sample app/devices/reviews are test data only; this does not validate a live UEM deployment.

If npm omits a platform-native optional dependency and Vite reports a missing native binding, reinstall with Node 22 using `npm ci --include=optional`. Keep the lockfile and all specified pins aligned.
