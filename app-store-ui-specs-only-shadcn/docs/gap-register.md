# Local specification gaps

Only the two supplied specification trees were consulted. No Store implementation source was read.

| ID | Specification uncertainty / documented fact | Implementation decision |
|---|---|---|
| ST-GAP-02 | Subscription statistics card is unmounted. | Omitted from the visible tab. |
| ST-GAP-03 | Uninstall User fallback contains literal `R`. | Retained on that documented fallback. |
| ST-GAP-04 | Other versions uses the Android route for every platform. | Retained. |
| ST-GAP-05 | CUSTOM downloads are not enabled. | No firmware download action. |
| LOCAL-01 | Login domain flag, tenant composition, whitelabel payload wrapper, and deployment-specific SSO details are not fully specified. | Default username/password; `isSsoEnable` activates handler SSO. No invented tenant rule. Theme uses the documented fields with defaults. |
| LOCAL-02 | Locale dictionaries and several permission/description strings are referenced but not supplied. | English literals quoted by Specs are the lookup keys and fallback copy. Four local dictionaries translate documented chrome. Unspecified long descriptions are omitted. |
| LOCAL-03 | Exact Windows metadata exclusion keys are not supplied. | Render metadata as supplied, without inventing an exclusion list. |
| LOCAL-04 | Dynamic device-config field retrieval endpoint/DTO is absent from dependency-apis. | Use documented static fields and device filter endpoint. No invented API. |
| LOCAL-05 | Full live deployment and real artifacts are unavailable in this workspace. | Test-only fixture backend is explicitly isolated from production. Live integration remains deployment validation. |
| LOCAL-06 | Firmware group card drill-down is described; full applicable/unmanaged policy is deployment-owned. | Reuse documented hierarchy and firmware group-device endpoint; applicable, inapplicable, unmanaged buckets use exact wire enums. |
| LOCAL-07 | Public config lives under public/conf in source; startup specifies /store/public/conf/config.json. | Ship the same configuration under both public asset paths; bootstrap requests the exact specified startup URL. |

Preferred safe login redirects are same-origin `/store/...`. Token storage is exclusively the handler's session cookie; the browser stores only language and the tour flag.

## Observed session compatibility

The live `GET /store-ui-request-handler/login-user/scopes` response is `{ data: { userScopes: "scope1 scope2 …" } }`, whereas the supplied request-handler Spec describes `data` as a scope string/list. The session adapter accepts the observed `userScopes` DTO alongside the documented string/list. Unsupported or malformed values grant no permissions. The isolated fixture now uses this DTO to prevent regression. No specification repository was modified.
