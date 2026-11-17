import test from "node:test";
import assert from "node:assert/strict";
import {
  applicationFilter,
  CHUNK_SIZE,
  chunkRanges,
  parseScopes,
  releasePath,
  safeRedirect,
  TYPE_FILTERS,
  unwrap,
} from "../src/services/contracts.mjs";
test("handler envelopes preserve a nested upstream data array", () => {
  assert.deepEqual(unwrap({ data: { recordsTotal: 1, data: ["review"] } }), {
    recordsTotal: 1,
    data: ["review"],
  });
  assert.equal(unwrap(""), "");
});
test("scope hydration supports documented session and configured list responses", () => {
  assert.deepEqual(
    parseScopes({
      data: { userScopes: "am:pub:app:view  am:pub:app:update\n" },
    }),
    ["am:pub:app:view", "am:pub:app:update"],
  );
  assert.deepEqual(parseScopes({ data: ["am:pub:app:view"] }), [
    "am:pub:app:view",
  ]);
  assert.deepEqual(parseScopes(null), []);
});
test("safe return paths reject other origins, protocol-relative and escaped URLs", () => {
  for (const path of [
    "https://evil.invalid",
    "//evil.invalid",
    "/app-publisher/\\evil.invalid",
    "/app-publisher/\nheader",
    "/elsewhere",
  ])
    assert.equal(safeRedirect(path), "/app-publisher/apps");
  assert.equal(
    safeRedirect("/app-publisher/apps/releases/abc?isPublished=true"),
    "/app-publisher/apps/releases/abc?isPublished=true",
  );
});
test("type filters replace defaults, preserve hyphenated states and calculate offsets", () => {
  assert.deepEqual(
    applicationFilter(
      { appTypes: TYPE_FILTERS["Web app"], appReleaseState: "IN-REVIEW" },
      3,
      20,
    ),
    {
      isNotRetired: true,
      appTypes: ["WEB_CLIP", "WEB_APP"],
      appReleaseState: "IN-REVIEW",
      offset: 40,
      limit: 20,
    },
  );
});
test("firmware tab context cannot be overridden by filter chips", () => {
  assert.deepEqual(
    applicationFilter(
      { deviceType: "ios", appTypes: ["PUBLIC"] },
      2,
      10,
      "android",
    ),
    {
      isNotRetired: true,
      appTypes: ["CUSTOM"],
      deviceType: "android",
      offset: 10,
      limit: 10,
    },
  );
});
test("upload ranges cover each byte once and append exactly one final empty chunk", () => {
  for (const size of [
    0,
    1,
    CHUNK_SIZE - 1,
    CHUNK_SIZE,
    CHUNK_SIZE + 1,
    CHUNK_SIZE * 2,
  ]) {
    const ranges = chunkRanges(size);
    assert.deepEqual(ranges.at(-1), [size, size]);
    assert.equal(
      ranges.reduce((sum, [start, end]) => sum + end - start, 0),
      size,
    );
    assert.ok(ranges.every(([start, end]) => end - start <= CHUNK_SIZE));
    assert.equal(ranges.filter(([start, end]) => start === end).length, 1);
  }
});
test("release create paths distinguish web and platform-specific contracts", () => {
  assert.equal(releasePath("WEB_CLIP", "all", 7), "/applications/web-app/7");
  assert.equal(
    releasePath("CUSTOM", "android", 8),
    "/applications/android/custom-app/8",
  );
  assert.throws(() => releasePath("UNKNOWN", "android", 8));
});
