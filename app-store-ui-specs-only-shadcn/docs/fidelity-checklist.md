# Store fidelity and validation

Sources: `IoTS-specifications/features/application-mgt/`, the Store scene/branding/API Specs, and the listed `@entgra/component-specs` contracts. Existing Store implementations were not read. Reference images inspected: catalogue with apps, release overview, Install Device, and Subscription Details.

## Implemented surfaces

- [x] `/store/` SPA, form login, deployment-configured SSO, session cookie invoker, safe return paths, scopes and mid-session 401 handling.
- [x] Shared sider/header/footer, logo assets, favicon, primary `#4288BA`, Poppins, navigation jump, language flags, profile, collapse and five-step Joyride.
- [x] Applications/Favourites infinite batches of 30, chip filters, favourite confirmation, WEB_CLIP eye, loading/empty/API-error/403 distinctions.
- [x] Firmware CUSTOM catalogue, filter controls and bottom-right pagination (12 displayed / 14 fetched).
- [x] Release details, PUBLISHED/Play-synced/action-scope gates, favourite, enterprise artifact download, versions, App and Subscription Details tabs.
- [x] Install/uninstall hand-off map, cold/refresh return home, Device/User/Role/Group targeting, schedule/selection gates, options, AE paths, success stays on wizard.
- [x] Reviews teaser, own review create/edit/delete, replies, admin delete, rating summary and read-all.
- [x] Subscription identity counts, subscribed/unsubscribed wire values, status lanes, filtering, device links, operation rows, single/bulk retry and scoped status edit.
- [x] Firmware detail/release expansion, modal install, Device/Group paths, matching buckets and group-device drill-down, modal subscriptions without New/User/Role, breadcrumb segment restoration.
- [x] Local shared widgets built without Ant Design or private Entgra UI dependencies.

## Verification performed

- TypeScript: `npm run typecheck`.
- ESLint with TypeScript parser: `npm run lint`.
- Business-rule tests: `npm test` covers platform app types, PUBLISHED gate, safe redirects, schedule/selection gating, and exact subscription status wire values.
- Production compilation: Vite 8.3.7 on Node 22.23.4.
- Browser checks with isolated request-handler fixtures: required login fields, invalid credentials, successful login, catalogue, favourite confirmation/mutation, release hand-off, Device install, schedule disabled without datetime/enabled with datetime, success retaining wizard, refresh returning home, Japanese chrome and flags, English restoration, Joyride restart/skip, review save, subscription empty selection, Error retry confirmation, firmware detail/modals, hidden New lane, restored Firmware segment, group-device install, logout cancel/confirm, and authenticated sparse-scope 403.
- Browser computed breadcrumb font: `Poppins, sans-serif`; browser title: `Entgra App Store`.
- Screenshot: `docs/store-preview.jpg` (synthetic contract data).

## Deployment validation still required

- [ ] Live UEM session/SSO/IdP redirects and deployment-specific tenant configuration.
- [ ] Actual backend data across all personas, full pagination volumes and network-error cases.
- [ ] Cross-origin artifact host CORS/download behaviour and real whitelabel URLs.
- [ ] Native device operations, firmware applicability policy, and actual retry/status transitions.

No real device operation was performed. The fixture backend is test-only and is not imported into the application bundle. Runtime configuration targets the real request handler by default. See `gap-register.md` for unresolved source details and documented product quirks.
