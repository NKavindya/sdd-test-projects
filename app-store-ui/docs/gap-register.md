# Implementation integration gaps

The specification repository is unchanged. This record tracks work still needed
in the new application; it does not amend product behaviour or define new APIs.

| Area | Missing input / remaining work | Effect |
| --- | --- | --- |
| Device details | Model/vendor, serial, OS and IMEI property paths inside `deviceInfo` / `properties` are not specified | Known base fields are mapped; detail columns retain the specified missing-value placeholders until paths are confirmed |
| Scheduling | Timestamp units and conversion contract | Scheduled operations cannot be verified |
| AE operations | Confirmed `requiresUpdatingExternal` behaviour | Non-Play-synced AE mutations remain unverified |
| Artifacts | Documented origin is HTTP `localhost:9763` + `/api/application-mgt/v1.0/artifact/…` (`application-mgt.xml` `ArtifactDownloadProtocol=http`). That transport and same-path HTTPS `:9443` both stall with no HTTP response; gateway `:8280`/`:8243` returns 404. No alternate documented working origin | Icons/screenshots stay blank; enterprise downloads unverified. UI keeps API paths; no TLS bypass / invented endpoint |
| Whitelabel | Metadata response schema | Full runtime branding remains incomplete; default footer now uses the exact specified Entgra UEM Server 6.4.5.0-SNAPSHOT copyright line |
| Firmware | Validate pagination mapping and implement complete group-device subview | Firmware journey is not acceptance-complete |
| Visual verification | Working artwork and nonzero subscription fixture | Fonts, languages, shell, filters and Install selection verified live; full reference-image parity and positive subscription lanes remain open |
| Verification | Authenticated users, scoped fixtures, working backend trust and missing visual references | End-to-end acceptance remains outstanding |

Confirmed user decisions: matching router packages at 6.22.0, 10px button radius,
Device/Group firmware subscription identities. Preserve ST-GAP-02 through
ST-GAP-05 and the documented Android/CUSTOM firmware behaviour.

## Resolved against the running server

- Post-login startup error: the live scope endpoint returns
  `{ "data": { "userScopes": "scope …" } }`, matching the referenced backend
  `PermissionScopeHandler` and `HandlerConstants.USER_SCOPES`. The decoder now
  accepts this explicit shape after removing the handler envelope. Empty grants
  remain empty; unrelated objects, null grants and non-string entries still
  fail validation. Authenticated startup, Android catalogue, Teams release,
  Favourites and iOS Favourites empty state were verified in the existing
  browser session without mutations. No console errors/warnings were observed
  on those paths. This verifies the reported startup regression, not every
  installation, scheduling or subscription journey listed as outstanding above.

- SSO callback HTTP 500: the referenced backend `SsoLoginHandler` saves the
  `redirect` query parameter in the session as `redirectUrl`;
  `SsoLoginCallbackHandler.java:101` dereferences that attribute without a null
  check. The SPA previously omitted the parameter. Both initial SSO login and
  mid-session reauthentication now supply an absolute, same-origin `/store/…`
  return URL, including the frontend port. No backend code or deployed UEM
  configuration was modified. The server's lack of a null guard remains a
  backend robustness issue; authenticated callback completion requires a fresh
  login to verify. A fresh isolated request with the generated return URL was
  verified against UEM: HTTP 302 to `/oauth2/authorize`, without following the
  authorization flow or replaying an old authorization code. All 11 contract
  tests, lint, formatting, and the development build passed.
- Startup device types: the newly available specification
  `system/modules/proprietary-commons/store-api/dependency-apis.md` documents
  `GET /device-types` as a root array. Runtime configuration now supplies that
  mapping, and the visibility flag is read from
  `deviceTypeMetaDefinition.storeVisibilityEnabled`.

- Local TLS: the user supplied `wso2carbon.pem`, a self-signed localhost leaf.
  Its SHA-256 fingerprint was verified as
  `1E:1B:CD:EB:0A:46:47:21:50:C5:55:42:A9:CC:02:F3:94:81:E5:DD:1E:6E:A4:93:C8:2B:02:3C:BE:03:B4:4C`.
  Passing this file through `NODE_EXTRA_CA_CERTS` enables verified TLS without a
  certificate bypass. Session probe returns the expected anonymous 401.
- UI configuration: the documented direct endpoint returns raw JSON with
  `isSsoEnable` at the root; this deployment currently returns `true`. Runtime
  `contracts.uiConfig.root` is therefore the empty path. Authenticated startup
  also loads this configuration so logout uses the correct SSO branch.
- Verified through the dev proxy: anonymous session probe HTTP 401 and public
  UI configuration HTTP 200. Browser startup reaches the configured SSO
  authorization endpoint. The browser's independent trust store still reports
  `NET::ERR_CERT_AUTHORITY_INVALID`; no browser warning was bypassed. Full SSO
  authentication and authenticated scene verification remain pending browser
  trust and the remaining contracts above.

## Fidelity changes (2026-11-06)

- Bundled the specified Poppins font from Google Fonts (OFL included), filled
  en/ja/fr/es locale packs, localized platform breadcrumb labels and Ant chrome.
- Mounted EntgraSider/Header/Footer on the shared authenticated shell; footer uses
  whitelabel text when available and the documented fallback otherwise.
- Mounted EntgraSearchFilter inside Apps, Firmware and Device Collapse panels.
- Added documented reference API bindings and server-provided device filter enums.
- Install/Uninstall keep EntgraTable, search and options on device failures, issue
  one notification per failed request, and clear failed selections.
- Subscription panes keep lanes/table on errors. The updated API contract and
  user confirmation supply subscribed/unsubscribed queries, lowercase identity
  paths and uppercase operation lanes; runtime mappings and transport tests now
  enforce those values.
- The package barrel imports unrelated Router v5 consumers. Specific component
  entry imports avoid those modules while retaining approved Router 6.22.0.
- ST-GAP-02…05, firmware fetch-14/display-12 and Android/CUSTOM remain unchanged.
