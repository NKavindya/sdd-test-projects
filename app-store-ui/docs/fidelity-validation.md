# Store fidelity validation — 2026-11-06

Sources: the read-only IoTS-specifications app-store-ui component catalogue,
branding, i18n, GF checklist, scene documentation and product images; store-api
request-handler, api-contract and dependency-apis. No other Store UI source was
used. This file records application verification; it does not amend the Specs.

| Criterion | Implementation | Live acceptance |
| --- | --- | --- |
| GF-01 | Local OFL Poppins Regular/Medium; CSS font inheritance; ConfigProvider Poppins and #4288BA | PASS: computed card and breadcrumb font is Poppins; bundled font assets emit in build |
| GF-02 | Complete en/ja/fr/es packs, persisted language switch, Ant locale, Android/iOS/Windows/Web Apps breadcrumbs | PASS: Japanese, French and Spanish change menus, search and breadcrumbs; product copyright line retained; English restored |
| GF-03 | Shared EntgraFooter after Content, API footerText or exact pack UEM Server copyright line | PASS: visible on Apps, Favourites, Release, Install and Uninstall; mounted in shared shell for all authenticated routes |
| GF-04 | Apps/Favourites Collapse + EntgraSearchFilter; App Name/Category/Tag chip fields; Search/Clear reset offset | PASS: App Name/Category/Tag builder; live Instagram filter returns Instagram; clear restores both apps at page one |
| GF-05 | API release.iconPath image, Typography/Tooltip, lowercase type, react-star-ratings, heart/Popconfirm, WebClip eye | BLOCKED: supplied paths advertise HTTP :9763; verified HTTPS :9443 artifact GET also stalls without an HTTP response |
| GF-06 | EntgraTable, checkbox selection, all nine columns, paging, Search Devices; one notification per device failure; table retained | PASS: live three-device picker/selection/paging; failure/permission regression renders passed |
| GF-07 | Release icon/title/version; exact device intro; action bar above search with Block Uninstall/Schedule Install/Install | Addressed: selection enables Install and schedule requires a date; artwork dependency tracked under GF-05 |
| GF-08 | Identity counts, specified empty Result, selected device status tabs/search/EntgraTable; no StatisticsCard | Addressed: live count sidebar/empty Result pass; zero counts stay disabled per Spec; selected lanes covered by render/transport tests |
| GF-09 | EntgraSider/EntgraHeader/EntgraFooter on authenticated shell shared by every scene | PASS: library shell mounted and visible in live authenticated scenes |
| GF-10 | Firmware Collapse + EntgraSearchFilter with Name and multi Category; visible when content/filter exists | PASS: live Firmware Search/Clear with Name and Category fields; 14/12 paging unchanged |
| GF-11 | Borderless 120px Select with local Twemoji flags/names; blue circular UserOutlined avatar | PASS: all four flags load; closed value, Japanese switch, avatar colours and menu order verified live |
| GF-12 | Firmware Ant Pagination in a flex-end wrapper, 20px top margin; fetch 14 / display 12 retained | PASS: live pager right edge equals wrapper right edge (0px difference); pager is 20px below grid |
| GF-13 | Static/build title Entgra App Store; runtime brand segment followed by App Store; local Entgra favicon | PASS: live document.title is Entgra App Store; /store/favicon.svg loads the approved white Entgra mark on primary blue |
| GF-14 | EntgraHeader aim enabled; searchable 200px borderless/no-arrow Select with destination/breadcrumb options | PASS: computed underline is 1px #d9d9d9, selector has no border/shadow/arrow; both destination options navigate |

Specific Entgra package component imports avoid the package barrel's unrelated
Router v5 consumers; approved matching Router 6.22.0 packages are retained.
Poppins is bundled from the official Google Fonts repository with its OFL license;
there is no external font request at runtime. Buttons retain the approved 10px.

## Verification scope

- Development and production compilation pass. Production emits bundle-size
  advisory warnings; those are not runtime errors.
- Automated checks cover locale key/interpolation parity; device API-error chrome
  for Install/Uninstall; permission replacement; subscription empty/failed lane
  rendering; and lowercase subscribed/unsubscribed + identity path versus uppercase
  operation lane transport. Render checks isolate resource/context/Entgra adapters;
  they do not claim to exercise the backend or visually validate the library.
- Authenticated live verification covers locale switching, catalogue search,
  Favourites, Firmware filters, release navigation, Install device selection and
  scheduling disabled state, Uninstall table chrome, and subscription counts/empty selection. No device
  operation or favourite mutation was submitted.
- Entgra Common filter duplicate sibling keys and deprecated Ant props were
  observed during expanded-filter testing. A scoped build-time compatibility
  loader fixes identities and equivalent prop aliases. Its expected source shape
  is guarded and tested. Fresh port-3001 filter testing reports no console
  warnings/errors. Restart the user's existing port-3000 server to apply the
  Webpack loader; that process was left untouched.
- Documented artifact origin for this pack is HTTP
  `http://localhost:9763/api/application-mgt/v1.0/artifact/…`
  (`ArtifactDownloadProtocol=http`). Live GET on that origin and on same-path
  HTTPS `:9443` both stall with no HTTP response; APIM `:8280`/`:8243` returns 404.
  There is no alternate documented working transport. Artwork retains API paths;
  GF-05 stays BLOCKED; this covers the wizard artwork dependency as well. No placeholder artwork was invented.
- Screenshots: /tmp/entgra-install-fidelity.png and
  /tmp/entgra-subscriptions-fidelity.png. They show current runtime data and the
  unresolved blank artwork; they are not claimed as completed visual parity.

## Preserved behaviour and limits

ST-GAP-02…05 are unchanged, including no subscription percentage card, literal R,
and Group identity no-op. Firmware fetches 14/displays 12 and retains Android/CUSTOM.
Firmware subscriptions retain written Device/Group lanes (user decision).

The updated contract now confirms lowercase `subscribed` / `unsubscribed`,
lowercase identity paths, and uppercase COMPLETED/PENDING/ERROR/NEW lanes. Runtime
configuration supplies those values; there is no remaining enum blocker.

Model/vendor, serial, OS and IMEI detail paths are not defined in the supplied
Device DTO contract; only documented base/enrolment fields are mapped. The detail
columns show specified placeholders until those paths are supplied. Whitelabel
metadata, artifact downloads, scheduling units and AE external-update behaviour
remain separately recorded in gap-register.md; this fidelity work does not guess
those contracts or trigger device installation/uninstallation during verification.

## Final checks

28 individual regression checks pass across four Node test files. ESLint and
Prettier checks pass. The isolated dev server compiles successfully with verified
TLS; the production build passes with only three bundle-size advisories.

A catalogue pagination race observed during Clear was corrected: infinite-scroll
must not advance while the displayed list is empty between filter responses.
Live verification confirms Instagram-only search followed by both apps after Clear.

No pending device selections remain. Temporary verification tabs/server were
closed; the user-owned port-3000 server was left running. The latest verification
leaves Favourites in English. Keep the existing NODE_EXTRA_CA_CERTS setup.

## Updated pack footer, header and favourites

The exact default footer is `Entgra UEM Server 6.4.5.0-SNAPSHOT | © 2025 , All Rights Reserved.`
Whitelabel footerText still takes precedence. React-twemoji 0.5.0 renders four
unmodified, local official flag SVGs; graphics license and attribution are shipped.
Computed avatar background is rgb(66,136,186), glyph colour white. Japanese
switching changes chrome; the full pack footer is retained and English restored.

Artifact icon/screenshot/installer URLs remain exactly as returned, including
HTTP :9763. The earlier HTTPS-origin rewrite and artifact invoker guard are gone.
A fresh GET to the API-provided HTTP icon URL timed out after six seconds with no
HTTP headers. GF-05 is an artifact-service blocker, with no alternate URL or TLS bypass.

The favourites spinner fix stops on short, empty and duplicate-only batches,
even if the reported count is larger. Only one request can advance each page;
responses are locally tagged with their requested page to prevent stale merges.
Firmware fetch-14/display-12/manual paging remains unchanged. The live Favourites
page showed its Instagram card with zero active .ant-spin-spinning elements.

New evidence: /tmp/entgra-header-locale-updated.png,
/tmp/entgra-header-profile-updated.png and /tmp/entgra-favourites-fixed.png.

## GF-12–14 verification

Updated Specs and the Firmware/Navigator reference screenshots were reviewed.
The navigator uses Ant 5's `variant="borderless"` and `suffixIcon={null}` as the
warning-free equivalents of `bordered={false}` and `showArrow={false}`. Its
option labels retain plain strings for searching, with a separate translated
Home > destination line in the dropdown. The EntgraHeader provides AimOutlined.

The favicon SVG wraps the supplied, unchanged `logo-white-cropped.png` on the
documented primary blue; no new logo artwork or whitelabel API fields were invented.
Static HTML and Webpack title agree. Runtime whitelabel appTitle, when supplied,
replaces the brand segment and retains the App Store suffix. The local favicon
is the fallback while whitelabel metadata mapping remains unspecified.

Live port-3000 smoke verified firmware pager geometry, exact footer, loaded
Twemoji flags, Japanese chrome switching and English restoration, blue/white
avatar and username → Start UI Tour → Logout order. Favourites showed zero
active spinners. Browser warning/error logs were empty. Production compilation,
all four regression files, ESLint and Prettier pass; production retains three
bundle-size advisories. API/invoker paths, TLS validation and ST-GAP behaviour
are unchanged.

Evidence: /tmp/entgra-firmware-gf12.png and /tmp/entgra-navigator-gf14.png.

A fresh GET of the live Teams API icon URL on HTTP :9763 timed out after
6.002 seconds, HTTP 000, zero bytes received. GF-05 remains BLOCKED by the
artifact service. Final Favourites view contains one Instagram card, zero active
spinners and no browser warnings/errors. The user's original tab/server stay open.
