# Remaining gaps and verification limits

These are explicit limits of this implementation. Backend errors remain visible; unsupported features do not fabricate endpoints.

## Highest development impact

1. **Service-provider catalogue fails locally.** The documented identity-server catalogue route returns HTTP 500. The list surface and connect modal use request-handler APIs and show retryable failures. Connection fields are best-effort from `publisher-api/api-contract.md`; provider connection, attachment/detachment, and create-through-provider need successful backend responses and verified DTOs before acceptance.
2. **Unverified mutation paths.** The Web App create path and an actual artifact upload succeeded. Public/Enterprise/Custom create, binary add-release, Windows package/certificate cases, release edits/deletes, lifecycle transitions, category/tag mutations, and role-restricted sessions were not exercised end-to-end. Existing local data was not changed to test destructive operations. These need suitable accounts, packages, and disposable records.
3. **Platform-specific inputs.** OS versions use manual range inputs because the authoritative dependency specs do not give a complete lookup contract. Windows-specific metadata inputs are present, but certificate/package combinations and generated metadata require backend validation with representative artifacts. Binary/package parsing is not reproduced from legacy source.

## Deferred product integrations

- **Android Enterprise / Apple VPP:** scope-gated menu stubs only, per upstream UI GAPS and the task. Synchronization, iframe/consent, organizations, tokens, and associated API operations are deferred.
- **Hide / managed configurations:** configuration flags gate disabled entries. No undocumented API is called. Enable once authoritative contracts are supplied.
- **Paid pricing:** creates default to `subMethod=FREE`, `price=0`. Existing paid apps display their subscription type. No purchase/pricing workflow is invented.
- **Skip Release:** preserves the button and submits the documented wrapper with an empty release array. Backend validation is surfaced. No alternate create endpoint is assumed.

## UI and acceptance limits

- Desktop shell/applications/create/firmware/manage were visually inspected against the supplied reference scenes. Mantine controls replace AntD; this is not a pixel-perfect assertion. Narrow layouts use a collapsible navigation shell and horizontal table scrolling, and a 390px mobile header/navigation smoke check passed. A complete keyboard/screen-reader audit remains outstanding.
- English is the working language. Spanish/French/Japanese resources provide shell translations and English fallback; complete translated form and error copy requires product translations.
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
