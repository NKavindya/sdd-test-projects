// The count can include rows outside the visible result. A short, empty or
// duplicate-only page ends infinite scrolling even if that count is larger.
export function mergeCataloguePage(
  previous,
  incoming,
  page,
  total,
  firmware = false,
) {
  const additions = incoming.filter(
    (app) => !previous.some((item) => item.id === app.id),
  );
  const cards = page === 1 || firmware ? incoming : [...previous, ...additions];
  return {
    cards,
    hasMore:
      !firmware &&
      incoming.length === 30 &&
      cards.length < total &&
      (page === 1 || additions.length > 0),
  };
}
