# Fidelity and verification

Reference sources: `features/application-mgt/*/{requirements,acceptance}.md`, Store scene specifications, `ui-component-catalog.md`, `branding.md`, `i18n.md`, Store API/request-handler/dependency APIs, and the seven requested shared component SPECs. Feature requirements take precedence over scene wording.

## Implementation coverage

| Surface                 | Implementation / contract                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Toolchain               | Exact pin table in package.json and lockfile; HeroUI/styles 3.2.7, explicit peers, React 19, Tailwind 4 imports in required order, Vite base `/store/`.                                                                                                                                                                        |
| Session                 | Config → handler session/scopes → visible device types/branding; form/SSO/logout, same-origin cookies, 401 recovery, safe Store return, sparse-scope shell.                                                                                                                                                                    |
| Shell                   | Gradient sider, supplied Entgra wordmark, collapse, scope-hidden console links, crosshair/underline jump navigator, searchable language control with Twemoji, primary avatar, device strip, shared sticky HTML footer.                                                                                                         |
| Tour                    | Five documented target areas; `ui-tour-store` set at start; restart via profile; Skip/Back/Next/End progression.                                                                                                                                                                                                               |
| Catalogue               | Published platform filter; Apps/Firmware and favourites separate; chip-based collapsible search; real API artwork; card body release links; heart confirmations; WEB_CLIP external eye; 30-item infinite scroll. Firmware limit 14 / displayed page 12, pager aligned right.                                                   |
| Release                 | Context by UUID/appType; no-release and error states; PUBLISHED and AE gates; scoped actions; enterprise-only download; admin other versions in new tab; App/Subscription Details defaults; category/tag, screenshots/lightbox, description, reviews, metadata.                                                                |
| Install/uninstall       | In-memory release hand-off; cold/reload home; Device/User/Role/Group scope/hide rules; device table/search preserved on errors; searchable identity multiselect; hierarchy; selection/schedule gates; operation options; WEB_CLIP confirmations; AE paths; success stays.                                                      |
| Reviews                 | View/write/admin-delete scope separation; own review edit/delete; meaningful rating/text editor; cancel; community summary/distribution; progressive read-all.                                                                                                                                                                 |
| Subscription monitoring | Counts and zero-count gating, four identities, initial guidance; exact wire statuses; device lanes/search/table/paging; browser-local timestamps; operation details expansion; single/bulk retry and independent status-edit scopes. Statistics unmounted; group identity no-navigation preserved.                             |
| Firmware                | CUSTOM package and paged release table; summary only with carried models; expandable details; Device/Group install modal, Android/CUSTOM targets, applicability and unmanaged confirmation; group cards/paging/drill-down; subscription counts before modal; no User/Role/New in monitoring; Firmware return segment restored. |
| Shared components       | Local EntgraFooter, EntgraHeader, EntgraSider, EntgraTable, EntgraSearchFilter; HeroUI cards, tables, controls, tabs, pagination, dialogs, toasts and empty-state primitives. Intentional accessibility/bug differences listed in gap register.                                                                                |
| i18n                    | Four packs; persisted locale; translated menu, breadcrumbs, search/empty states, buttons, table headings, wizard/device guidance; API data unchanged. Unknown copy/configuration is recorded in gap register.                                                                                                                  |

## Browser checks performed with isolated test backend

- [x] Form login and authenticated Android landing.
- [x] Supplied logo, shell footer, primary avatar, crosshair navigator, Twemoji language control.
- [x] Catalogue name filter, no-match state, clear and refresh.
- [x] Card opens release; favourite confirm saves and refreshes Favourites.
- [x] Subscribe → Install carries name/version; device table loads all required columns.
- [x] Selecting a device enables Install; successful POST displays Done! / Operation triggered! and remains on the wizard.
- [x] Refreshing the wizard returns to catalogue.
- [x] User multiselect enables Install after selecting a directory user.
- [x] Forced device API failure shows the error toast while Search Devices, table headers, and wizard actions remain mounted.
- [x] Subscription Details initial guidance, counts, Device Error lane and retry confirmation.
- [x] Retry succeeds and stays in monitoring.
- [x] Review stars/text save through handler fixture.
- [x] Firmware segment/package release table and install modal with Device/Group and applicability tabs.
- [x] Logout and sparse-scope login: 403 remains in main pane while shell/session stay present.
- [x] Japanese menu, breadcrumbs and Search Apps switch visibly; English restores.
- [x] Browser computed font is Poppins; `document.fonts.check('14px Poppins')` returned true.

## Visual review

Compared the supplied Applications, Install Device and Subscription screenshots. Layout follows the reference's narrow cards, blue gradient sider, white header/content, muted collapsible search bar, release reminder, 220px subscription sidebar and full device-table chrome. HeroUI controls are styled to these reference proportions. Empty illustrations and unspecified assets/copy differ as recorded in the gap register. Pixel identity is not claimed.

## Automated checks

Run `npm run lint`, `npm test`, and `npm run build` with Node 22. The unit tests cover redirect boundaries, handler envelope/DTO separation, catalogue types, subscription paths, lifecycle/Play-synced gates, and transient hand-off tokens. Browser checks use `tests/backend.mjs`, never a hidden mock fallback in runtime.

## Remaining deployment checks

- [x] Live UEM authenticated bootstrap after user SSO sign-in, including a full browser reload; deployed `data.userScopes` shape handled.
- [ ] Session renewal and full logout/re-authentication lifecycle.
- [x] Local UEM certificate trust, Vite proxy, device-type strip, whitelabel footer, catalogue and release/subscription shell.
- [ ] Additional deployment whitelabel variants and production same-origin hosting.
- [ ] Real app/review/subscription inventories and scope combinations beyond the fixture.
- [ ] Live enterprise artifact delivery and Android Enterprise external updates.
- [ ] Real firmware model/applicability results and operation execution.
- [ ] Deployment-specific unknowns in `gap-register.md` resolved by authoritative contracts.
