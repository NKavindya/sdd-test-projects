# Local gap register

This implementation uses only the two requested specification repositories. No existing Store source or sibling test app was read or copied. Neither specification repository was modified.

## Specification unknowns

| ID       | Evidence / uncertainty                                                                                                                                                        | Handling                                                                                                                                                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOCAL-01 | Session/request-handler describes deployment-controlled tenant login but does not name the enabling config field or tenant concatenation rules.                               | Default username/password login. No guessed domain behavior. SSO uses documented `isSsoEnable` and configured handler URIs.                                                                                                                                                                           |
| LOCAL-02 | Play-synced Subscribe must point to Endpoint Manager add-policy, but no exact route is supplied.                                                                              | Normal Subscribe is blocked. Set optional `links.addPolicy` in `public/conf/config.json` to enable the documented external link. No guessed default route.                                                                                                                                            |
| LOCAL-03 | `dm:conf:view` permits dynamic device criteria, but no configuration endpoint or field schema is supplied in dependency-apis.                                                 | Documented device name/owner/status/ownership/serial criteria work. Status and ownership options load from `/devices/filters`. Additional configuration criteria await a contract.                                                                                                                    |
| LOCAL-04 | Whitelabel response DTO, permissions, and nesting are not fully specified.                                                                                                    | Load documented `/whitelabel` through invoker; apply supplied theme fields and fall back to shipped branding. Full deployment DTO compatibility requires real-backend verification.                                                                                                                   |
| LOCAL-05 | Scene says some Windows metadata keys are skipped, without identifying the keys; `metaData` is documented as opaque/JSON.                                                     | Show parsable key/value metadata and package name. No guessed Windows exclusions. Opaque/unparsable metadata produces the documented no-metadata state.                                                                                                                                               |
| LOCAL-06 | Other-versions empty/error control wording, exact review permission explanation, login required-field wording, tour prose, and some picker placeholders are not quoted.       | Omit empty versions control, use documented general error notifications, browser/localized field validation, and existing specification labels. Review explanation follows the described permission outcome. Tour callouts use documented destination names rather than invented instructional prose. |
| LOCAL-07 | Common-filter SPEC refers to two hard-coded value substitutions without naming either value; unused date-range/typeahead criteria have no Store-scene configuration contract. | Implement the Store-used text, single-choice, and date controls. No guessed substitutions, additional criteria, or lookup APIs. Multi-criteria Publisher and subscription-date variants are not mounted by these scenes.                                                                              |
| LOCAL-08 | Subscription lane filter parameter schemas beyond `identifier`, `subscriptionStatus`, paging, and the named scene criteria are incomplete.                                    | Only documented criteria are offered. Verify backend bindings for `deviceName`, `owner`, `triggeredBy`, `actionStatus`, and identity `searchName` against the deployment.                                                                                                                             |
| LOCAL-09 | Precise empty-state illustrations, compact logo icon, and packaged font files are not provided as standalone assets.                                                          | HeroUI empty-state panel with a Lucide package/shield illustration; favicon embeds supplied Entgra wordmark. Poppins loads from Google Fonts. Offline installations should self-host Poppins and Twemoji assets.                                                                                      |
| LOCAL-10 | Release variant query names beyond `appType` are not defined in the route/API contract.                                                                                       | Select release by route UUID. No invented version/subscription query semantics.                                                                                                                                                                                                                       |

## Documented product facts preserved

- ST-GAP-02: statistics percentage card remains unmounted.
- ST-GAP-03: limited-scope User uninstall retains literal `R`; selection stays disabled.
- ST-GAP-04: other versions intentionally open under the hard-coded Android path.
- ST-GAP-05: no CUSTOM firmware download control.
- Safe Store-only login returns follow the preferred ST-SE contract (hardening the recorded ST-GAP-RH-01).
- Cold or refreshed install/uninstall URLs return home. Context lives in memory, not session/local storage or serializable router history.
- Catalogue hearts remain visible without modify scope; release hearts require modify scope and PUBLISHED.
- Uninstall candidate reads use uninstall scope; all mutation POSTs, including uninstall and retry, require install scope.
- Firmware Device picking remains Android/CUSTOM, with Device/Group tabs unaffected by hide-unauthorized.
- Group subscription member clicks do not navigate.

## Intentional shared-widget differences

Accessible buttons/labels replace the source SPEC's inaccessible plain close icons and collapse toggle. Search submits once rather than reproducing the reported duplicate-submit bug. Access and language changes recompute table action states immediately. Chip-removal's documented omission of the name filter is preserved. These differences do not add a product journey.

## Verification boundary

The backend fixture in `tests/backend.mjs` exists only for local QA. It is never imported by the app or enabled automatically. On 2026-11-12, the live local UEM certificate/proxy, authenticated session bootstrap, device types, branding footer, catalogue and release/subscription shell were verified in the browser after the user signed in. Session renewal, live target inventories, firmware compatibility and artifact delivery still require deployment checks. The app has no mock data fallback and does not report failed backend operations as successes.

## Live integration correction (2026-11-12)

The deployed `/login-user/scopes` response is `{data:{userScopes:"space-separated scopes"}}`; the specification describes a string/list directly under `data`. Confirmed against the local backend `PermissionScopeHandler` and `HandlerConstants.USER_SCOPES`. The session parser now accepts both shapes, deduplicates scopes and fails closed for malformed values. The test-only backend uses the deployed shape, and regression tests cover both forms. No scopes or permissions were invented or granted.
