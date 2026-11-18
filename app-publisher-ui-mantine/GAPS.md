# Remaining gaps and verification limits

These are explicit limits of this implementation. Backend errors remain visible; unsupported features do not fabricate endpoints.

## Highest development impact

1. **Service-provider catalogue fails locally.** The documented identity-server catalogue route returns HTTP 500. The list surface and connect modal use request-handler APIs and show retryable failures. Connection fields are best-effort from `publisher-api/api-contract.md`; provider connection, attachment/detachment, and create-through-provider need successful backend responses and verified DTOs before acceptance.
2. **Unverified mutation paths.** The Web App create path and an actual artifact upload succeeded. Public/Enterprise/Custom create, binary add-release, Windows package/certificate cases, release edits/deletes, lifecycle transitions, category/tag mutations, and role-restricted sessions were not exercised end-to-end. Existing local data was not changed to test destructive operations. These need suitable accounts, packages, and disposable records.
3. **Platform-specific inputs.** OS versions use manual range inputs because the authoritative dependency specs do not give a complete lookup contract. Windows-specific metadata inputs are present, but certificate/package combinations and generated metadata require backend validation with representative artifacts. Binary/package parsing is not reproduced from legacy source.

## Remaining product limits

- **AE / VPP environment acceptance:** token bootstrap, package import, Play approve modal, VPP metadata/sync, and the MCM drawer journey are implemented. Verification depends on tenant enrollment, DEP setup, Google SDK availability, and the signed-in scopes; see the evidence below.
- **Hide:** the existing flag-gated disabled action remains; its API contract is still unverified.
- **Optional AE page editor:** the registered route is scope-gated and lists Play-synced apps through the documented Publisher Filter. Full store-layout/cluster DTOs remain unverified in dependency-apis §4.3, so layout mutation controls are not fabricated. Configurations AE is modal-only.
- **Paid pricing:** creates default to `subMethod=FREE`, `price=0`. Existing paid apps display their subscription type. No purchase/pricing workflow is invented.
- **Skip Release:** preserves the button and submits the documented wrapper with an empty release array. Backend validation is surfaced. No alternate create endpoint is assumed.

## UI and acceptance limits

- Desktop shell/applications/create/firmware/manage were visually inspected against the supplied reference scenes. Mantine controls replace AntD; this is not a pixel-perfect assertion. Narrow layouts use a collapsible navigation shell and horizontal table scrolling, and a 390px mobile header/navigation smoke check passed. A complete keyboard/screen-reader audit remains outstanding.
- New AE/VPP/MCM copy is keyed and translated in en/es/fr/ja with English fallback. Existing non-integration forms and errors still have the earlier translation gaps.
- Release reviews include API-backed pagination, aggregate rating and star distribution. A one-review response was verified locally; multiple-page acceptance needs additional records. Writing or moderating reviews is outside Publisher scope.
- Dynamic whitelabel/ui-config responses are optional and scope-gated. Exact tenant-brand override combinations and language configuration need additional tenant samples.
- Firmware includes device types returned by the documented API. A Publisher-specific visibility policy beyond that API is not sufficiently specified.
- `entgra-icons-react@1.0.0` is available from Nexus but declares React 16 peers. Tabler and the supplied Entgra mark are used with React 19; a compatible private icon package is needed before enabling it.
- Shared creation behavior lives in EntgraAppCreationForm and ArtifactUpload; it is not published as a reusable package. No legacy shared-component bugs are intentionally reproduced.

## Local environment

- UEM SSO currently returns to the installed Publisher on port 9443. After authentication, returning to `https://localhost:5173/app-publisher/` correctly detects the cookie session. A registered preview callback would make this seamless.
- Backend trust is enabled with the PEM documented in README. The browser's separate preview/UEM certificate trust must be configured by the developer.
- One unpublished integration-test app, **Mantine Smoke 1711**, remains in local UEM. A separate upload probe also transferred the provided logo. No lifecycle publication or deletion was performed.

## Source references

Primary deferred behavior: IoTS `app-publisher-ui/GAPS.md`, `ui-dependencies.md`, scene contracts under `components/`, and `publisher-api/{api-contract,dependency-apis,request-handler}.md`. The user-supplied explicit decisions resolve hide-vs-result, filter mappings, chunk size/finalization, skip-release error handling, free pricing, and screenshot precedence; those are implemented decisions, not open questions.

## AE / VPP verification (2026-11-17)

- The existing authenticated HTTPS preview returned an AE token. Configurations → Android Enterprise opened the modal without changing the current URL, and the live Google Play catalogue rendered.
- The two-step import page rendered correctly. Blank input stayed on Application with **Please enter the package name**. A real request for existing package `com.microsoft.teams` displayed the Spec generic error Result (**Error occurred while syncing the apps.**); no successful live import is claimed. Deterministic adapter tests cover the 200/404/409/other status mappings.
- The VPP instructional page, Apple Business Manager link, and YouTube tutorial rendered. The current session did not meet the metadata/scope condition for the Sync Apps button, so a successful live VPP sync was not verified. Adapter tests verify the exact DEP metadata and Store sync paths.
- French language switching changed the new VPP copy in place, then English was restored. New integration keys have entries in all four locale packs.
- Managed Configurations for the Teams AE app loaded the live Google MCM form through `gapi.iframes`. The initial `/managed-configs/package/com.microsoft.teams` read and SDK opening worked. Existing profiles were not saved/deleted during smoke testing; transport tests verify POST/PUT/DELETE payloads, URL encoding, and event parsing. A gapi/initial-read failure disables that drawer action and offers retry in the modal; no failing path was observed in this environment.
- The requested canonical constitutions clone required GitHub authentication. The available local fork's React/TypeScript guides were used; obtain canonical repository access to verify that fork against the organization revision.
