# Entgra UEM App Store

React 18 application served under `/store/`, using Webpack, Ant Design and the
Entgra request-handler session model. Requirements live in the attached
`IoTS-specifications` repository.

## Local development

```sh
npm ci
npm run dev
```

Open <http://localhost:3000/store/>. `npm start` is equivalent to `npm run dev`.
The development proxy forwards `/store-ui-request-handler` and `/api` to
`https://localhost:9443`. Override the upstream using `UEM_ORIGIN` if necessary.

### Trust the UEM certificate

The proxy verifies the UEM server certificate. For an internal or self-signed
certificate, obtain the approved PEM CA certificate from the deployment owner
and start Node with it:

```sh
NODE_EXTRA_CA_CERTS=/absolute/path/to/approved-uem-ca.pem npm run dev
```

Restart the dev server after setting this variable: Node reads extra CA trust at
process startup. Browser certificate trust alone does not configure Node's
certificate trust. `DEPTH_ZERO_SELF_SIGNED_CERT` indicates this trust is missing;
it is not a Webpack compilation failure. Certificate verification remains enabled.

For the current local UEM installation, the user-supplied, fingerprint-verified
certificate is:

```sh
NODE_EXTRA_CA_CERTS=/home/nkavindya/GitRepositories/EntgraUEM/entgra-uem-ultimate-6.4.5.0-SNAPSHOT/repository/resources/security/wso2carbon.pem npm run dev
```

This trusts the supplied certificate for this Node process only, without modifying
system trust. The browser must separately trust the UEM certificate if SSO opens
the upstream HTTPS origin.

When session cookies require HTTPS on the frontend, provide an approved local
certificate and key using `STORE_TLS_CERT` and `STORE_TLS_KEY`. The dev server
then uses HTTPS. Do not commit certificate private keys.

### Fonts

Poppins Regular and Medium are bundled locally under `public/fonts/`, with the
Google Fonts OFL license. CSS imports them through Webpack and ConfigProvider
sets Poppins with primary colour `#4288BA`. No external font service is needed at
runtime. Four complete locale packs (en/ja/fr/es) are initialized before rendering;
the header Select updates application and Ant Design chrome and remembers the choice.

## Checks

```sh
npm run lint
npm run format:check
npm test
npm run build_dev
npm run build_prod
```

Builds are emitted to `dist/`. Deploy that directory under `/store/` with SPA
history fallback and the configured same-origin request handler.

## Integration status

A successful build does not establish backend readiness. The default runtime
configuration contains the documented backend paths, but the specification does
not yet supply every response mapping. `src/services/api.js` explicitly requires
confirmed mappings instead of guessing backend DTO fields.

The public UI-config response root has been confirmed against the running server
and is configured. Startup device types use the `/device-types` root-array
contract documented in `store-api/dependency-apis.md`.
Device, user, role, group, category and tag bindings now follow dependency-apis.md.
Whitelabel metadata still has a response-schema gap; the documented HTTP :9763 artifact backend stalls. Artifact URLs are used exactly as returned. See [the integration gap register](docs/gap-register.md).

The mandatory Entgra shell, filters and tables are integrated. See
[the fidelity checklist](docs/fidelity-validation.md) for implementation evidence
and the live acceptance checks that still require a signed-in session.

### SSO callback HTTP 500

The handler requires a `redirect` parameter on `/ssoLogin`; it stores this in
the session and reads it after the OAuth callback. The application now supplies
a validated absolute Store URL for initial login and reauthentication, preserving
the frontend port and release query parameters.

After updating the application, restart the dev server and begin again at
`http://localhost:3000/store/`. Do not refresh or replay a previous
`ssoLoginCallback?code=…` URL: authorization codes are single-use.

### Entgra filter compatibility

`build/entgra-filter-keys.cjs` scopes a build-time compatibility patch to the
4.2.0 library Common filter. It gives sibling Form.Items unique React keys and
uses equivalent Ant 5 prop names to avoid duplicate-key/deprecation warnings.
The library files in node_modules are unchanged. The patch fails explicitly if
its expected Form.Item structure changes. Restart the dev server after changing
Webpack configuration or this loader; a running server retains its loader cache.
