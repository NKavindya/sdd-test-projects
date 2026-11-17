# Entgra App Publisher — Mantine

A new React SPA at `/app-publisher/`, integrated with the local UEM request handler. No legacy Ant Design source or Ant Design dependencies are included.

## Run locally

Prerequisites: npm, OpenSSL, and a running UEM at `https://localhost:9443`. Node 24 is recommended. A project-local Node 24 development dependency lets npm scripts run on this workstation, whose system Node is older than Vite's supported baseline.

```bash
cd /home/nkavindya/GitRepositories/EntgraUEM/sdd-test-projects/app-publisher-ui-mantine
export UEM_ORIGIN=https://localhost:9443
export NODE_EXTRA_CA_CERTS=/home/nkavindya/GitRepositories/EntgraUEM/entgra-uem-ultimate-6.4.5.0-SNAPSHOT/repository/resources/security/wso2carbon.pem
npm install
npm run dev
```

Open **https://localhost:5173/app-publisher/**. Use `localhost`, rather than `127.0.0.1`, so the backend's host-scoped Secure SSO cookie is available. Sign in through the configured UEM SSO provider. If SSO returns to the backend's existing Publisher on port 9443, return to the preview URL after signing in; the preview probes the shared cookie session.

`predev` generates a 30-day localhost certificate and private key in ignored `.local/`. This preview certificate is separate from the backend PEM. Trust the preview certificate in your development browser/OS, or handle its local warning yourself. Never commit the private key. To regenerate an expired preview certificate, remove the two `.local/localhost*.pem` files and rerun `npm run dev`.

The backend PEM above was already present in the running pack and was verified against UEM. Point `NODE_EXTRA_CA_CERTS` at the appropriate CA/server PEM if the pack moves. Export it **before** npm installation, Vite, or browser tooling. The proxy's HTTPS agent explicitly uses this PEM with certificate verification enabled; there is no `secure: false` or `rejectUnauthorized: false` fallback. Browser trust for UEM and the preview is independent of Node trust.

## Integration and configuration

`public/conf/config.json` is seeded from the product Publisher config requested in the task. It keeps the `publisher`, `store`, and `deviceMgt` invoker keys. Both development and build output support `/app-publisher/public/conf/config.json` (Vite also copies `/conf/config.json`). Deployment must provide SPA route fallback under `/app-publisher/` and a same-origin request-handler reverse proxy.

Vite proxies `/publisher-ui-request-handler` and `/api` to `UEM_ORIGIN`, with cookie forwarding, `changeOrigin`, and domain rewriting for local use. Related authentication and cross-console routes are also proxied. HTTPS on the preview is necessary for UEM's Secure session cookie. The default target is `https://localhost:9443`.

Bootstrap loads configuration, probes `POST /user`, loads scopes, then optional UI configuration/whitelabel. API calls use the configured request-handler `invoke` segments; axios includes cookie credentials and unwraps one `{ data }` envelope. OAuth tokens remain server-side. A managed-API 401 clears the client session. No credentials are persisted in browser storage; only the language preference is stored.

Missing menu scopes hide their entries. Scoped deep links render a permission result. Server authorization remains authoritative. Uploads use sequential 5 MiB multipart chunks plus a final empty chunk and validate/map `relativeTransferLink` before returning an artifact URL.

## Structure and features

- `src/scenes/`: Login, Home shell, Applications, Create/add-release, Release, Firmware, Manage, and ServiceProviders.
- `src/components/`: Mantine implementations of Entgra header, sider, footer, page header, table, search filter, artifact uploader, and EntgraAppCreationForm. The Create scene delegates to the shared creation form.
- `src/services/`: request-handler client, session/scope ownership, async data hooks, contract helpers, and i18next resources (`en`, `es`, `fr`, `ja`; English fallback).
- `public/conf/`: runtime configuration. `public/branding/`: supplied Entgra mark.
- `tests/contracts.test.mjs`: envelope, filter, release-path, safe redirect, and chunk-boundary checks.

The UI includes real application filtering/pagination, details drawer, create variants and add-release, lifecycle/history, release editing, firmware, category/tag operations, and best-effort service-provider connection. AE/VPP are deferred stubs. Read [GAPS.md](GAPS.md) for limits and unverified paths.

Mantine packages are pinned to `9.8.1`, React to `^19.2.0`, and React Router to `7.18.5`. Poppins and `#4288BA` are the base font/color. Tabler supplies icons. The private `entgra-icons-react` package is omitted because its available version declares a React 16 peer dependency.

## Validation

```bash
npm test
npm run typecheck
npm run format:check
npm run build
```

Verified against local UEM on 2026-11-17:

- SSO cookie session, scopes, real Applications Filter responses, drawer and release reads.
- Application-name chip filtering and removing the chip to restore the inventory.
- Created an **unpublished** Web App named **Mantine Smoke 1711**, version `1.0.0`, category Tools, URL `https://entgra.io`; inventory confirmed it. Existing backend media URLs were reused for this create test. This test record remains in UEM.
- Separately uploaded the supplied logo through real upload-link/chunk requests, including the final empty chunk. That upload probe was not submitted as an application.
- Desktop visual smoke of shell, applications, creation, firmware, and manage; lifecycle/review reads. Service-provider catalogue returned HTTP 500 and the UI displayed a recoverable error.

Build and contract tests do not replace backend integration coverage. See GAPS for mutation paths that were not exercised.

## Sources used

Specifications define behavior; skills define implementation workflow. All application files stay in this project.

- UI specs, scene contracts, authorization, branding, and screenshot inventory: `/home/nkavindya/GitRepositories/EntgraUEM/IoTS-specifications/system/modules/proprietary-commons/app-publisher-ui/` (including `AGENTS.md`, README, GAPS, `ui-dependencies.md`, architecture, access, components, theme, and images).
- Request-handler, API contracts, dependency APIs, scopes, and errors: sibling `publisher-api/`.
- Shared component SPECs: `/home/nkavindya/GitRepositories/EntgraLibraries/ui-components-specifications/` (EntgraFooter/Header/Sider/PageHeader/Table/SearchFilter/PublisherFilterForm/AppCreationForm and its Details/Upload/ArtifactUpload subforms).
- Development skills: `/home/nkavindya/GitRepositories/EntgraLibraries/ai-skills/ui-application-development/`, README reading order and all requested standards, spec-driven, dependencies, routing, authentication, API/data, forms, components, design, i18n, accessibility, security, state, testing, and build/release skills.
- Seed only: `/home/nkavindya/GitRepositories/EntgraUEM/proprietary-commons/components/ui/io.entgra.proprietary.commons.application.mgt.publisher.ui/react-app/public/conf/config.json`.
