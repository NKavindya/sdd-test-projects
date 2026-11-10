# Fidelity and verification checklist

## Source traceability

| Capability            | Authoritative source                                                                                                                   | Local implementation                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Runtime/theme/library | `system/ui-dependencies.md`, `architecture-store-ui.md`, `scope-store-ui.md`; UI `branding.md`, `i18n.md`, `ui-component-catalog.md`   | `webpack.config.js`, `public/conf/config.json`, `App.jsx`, `theme/store.less`, `i18n/` |
| Session/shell         | `features/application-mgt/session/`; UI `components/login/`, `components/home/`, permissions/personas                                  | `scenes/Login.jsx`, `scenes/Shell.jsx`, `services/api.js`                              |
| Catalogue/favourites  | `features/application-mgt/applications/`, `favourites/`; UI `components/applications/`, `favourites/`                                  | `scenes/catalogue/`, `shared/Favourite.jsx`                                            |
| Release/download      | UI `components/release/`; `features/application-mgt/download/`                                                                         | `scenes/release/Release.jsx`, `services/api.js`                                        |
| Install/uninstall     | `features/application-mgt/install/`, `uninstall/`; corresponding UI scene folders                                                      | `scenes/operations/`                                                                   |
| Reviews               | `features/application-mgt/reviews/`; UI release reviews                                                                                | `scenes/release/Reviews.jsx`                                                           |
| Subscriptions         | `features/application-mgt/subscriptions/`; UI release subscriptions                                                                    | `scenes/release/Subscriptions.jsx`                                                     |
| Firmware              | `features/application-mgt/firmware/`; UI firmware/list scenes                                                                          | `scenes/firmware/`, catalogue firmware segment                                         |
| Backend               | `store-api/request-handler.md`, `api-contract.md`, `dependency-apis.md`, `scopes.md`, `error-handling.md`                              | `services/api.js`, `services/contracts.js`                                             |
| Reusable components   | `@entgra/component-specs/{EntgraFooter,EntgraHeader,EntgraSider,EntgraTable,EntgraSearchFilter}/SPEC.md`, Store/Common filter variants | `shared/Entgra*.jsx`                                                                   |

## Visual review

Reference images were inspected from the provided UI `images/` folder. Browser fixture screenshots are generated under `.artifacts/` for comparison; test artwork is synthetic, while production artwork comes from API `iconPath` values.

- [x] Sider gradient, wordmark, expandable App Store group, selected row, collapse.
- [x] Crosshair and underlined jump selector; flag/name language selector and blue profile avatar.
- [x] API-ordered visible device types and appended Web Apps.
- [x] Breadcrumb, segmented catalogue modes, collapsed search and chip/tile builders.
- [x] Soft cards with supplied icon, name tooltip, lowercase type, stars, favourite confirm.
- [x] Poppins fonts ship locally; computed card typography and loaded font checked in Chromium.
- [x] Shell footer appears across route families and modal parents; whitelabel text/fallback implementation.
- [x] Install device chrome includes table, selection, search and independent operation action bar.
- [x] Subscription sidebar and initial guidance; no unwired statistics tiles.
- [x] Firmware catalogue pagination aligns right.
- [ ] Live whitelabel/domain and deployment-specific imagery comparison (backend unavailable).

## Functional checks

Contract tests cover app-type filters, installable lifecycle, safe return URLs, device identifiers, subscription paths and four locale packs. Browser scenarios cover real component interactions against a synthetic request-handler contract:

- [x] Catalogue, filters, locale switch/persistence, loaded font and no browser Bearer header.
- [x] Favourite cancellation, add, and removal of the last favourite.
- [x] Device installation and schedule-without-date gate; success stays; reload returns home.
- [x] User, Role and Group install selection/submission.
- [x] Uninstall candidate GET and uninstall POST paths.
- [x] API device failure preserves search/table chrome.
- [x] Subscription identity lists, exact lane/query tokens, single retry and status edit.
- [x] Review save/cancel and required stars/comment.
- [x] Firmware detail/install/subscriptions; inapplicable disabled; unmanaged confirm; New hidden; Firmware return selection.
- [x] Sparse scopes and catalogue/release favourite asymmetry.
- [x] Non-PUBLISHED default tab and Play-synced wizard gate.
- [x] Missing appType and cold wizard URLs.
- [x] Invalid login and authenticated safe return; mid-session 401.
- [x] First tour flag and profile restart; logout cancel/confirm.
- [ ] Live UEM end-to-end, real IdP SSO, gateway scope enforcement, cross-origin artifact CORS and production routing.

The unchecked items and partial contracts are tracked explicitly in `gap-register.md`; fixture verification does not establish live-backend compatibility.

## Verification result

Production build and ESLint pass. Six contract tests pass. A full run of 24 Chromium scenarios passed; the additional logo-root scenario and affected firmware/subscription scenarios passed after final fixes (25 distinct browser scenarios checked). Test screenshots were inspected against the supplied catalogue, Install Device, Subscription Details, and firmware package references. Tests use synthetic DTOs and artwork; no live backend or IdP verification is claimed.
