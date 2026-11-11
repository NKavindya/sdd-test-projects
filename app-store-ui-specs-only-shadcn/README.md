# Entgra App Store

Specification-only React Store SPA using local shadcn/ui components and Tailwind CSS. No existing Store source was consulted and neither specification repository was modified.

## Run

Use Node **22.12 or newer** (the pinned Vite/i18n toolchain requires it).

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/store/`. Vite proxies `/store-ui-request-handler` and `/api` to `https://localhost:9443`. Set `ENTGRA_BACKEND` to change the development proxy origin. Production deploys `dist/` under `/store/` on the request handler's origin with SPA fallback to `index.html`.

Edit `public/conf/config.json` and its startup-path copy `public/public/conf/config.json` together for deployment. Runtime config exposes public URL/branding settings only. The SPA sends same-origin session cookies, never browser-held OAuth tokens.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Isolated contract preview

This is optional test tooling. It never runs in the production bundle or provides a production login bypass.

```sh
npm run test:backend
# separate terminal:
ENTGRA_BACKEND=http://127.0.0.1:9444 npm run dev
```

Fixture login: username `spec-user`, password `valid`. Use `spec-sparse` with the same fixture password to verify authenticated 403 behaviour. All data is synthetic and operations affect only fixture memory. It implements the documented handler envelopes and selector DTOs. Restart it to reset fixture state.

## Implementation map

- `src/services/`: typed DTOs, cookie request-handler client, config/session/scopes bootstrap.
- `src/shared/`: local Entgra footer, header, sider, table (TanStack v9), Store/common/status filter variants.
- `src/components/ui/`: shadcn CLI generated primitives, Radix dialog composition.
- `src/scenes/`: catalogue/favourites, release/reviews/subscriptions, hand-off-only wizards, firmware detail/modals.
- `src/i18n/`: English, Japanese, French and Spanish resources. English Spec literals are fallback values.
- `docs/gap-register.md`: source uncertainties and documented product limitations.
- `docs/fidelity-checklist.md`: validation and fidelity evidence.

Install/uninstall hand-offs live in memory; refresh/cold URL intentionally returns home. Empty catalogues, API errors, and missing-scope 403 results are distinct. Firmware remains separate from WEB_CLIP.
