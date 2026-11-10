const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { before, test } = require('node:test');
let merge;
before(async () => {
  const source = await fs.readFile(
    path.join(__dirname, '../src/common/catalogue.js'),
    'utf8',
  );
  merge = (
    await import(
      `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
    )
  ).mergeCataloguePage;
});
const batch = (start, length) =>
  Array.from({ length }, (_, index) => ({ id: start + index }));
test('a short favourites page stops even if count includes other applications', () => {
  const result = merge([], [{ id: 7 }], 1, 200);
  assert.equal(result.cards.length, 1);
  assert.equal(result.hasMore, false);
});
test('a full page continues and a short final page stops at its actual rows', () => {
  const first = merge([], batch(1, 30), 1, 100);
  assert.equal(first.hasMore, true);
  const last = merge(first.cards, batch(31, 2), 2, 100);
  assert.equal(last.cards.length, 32);
  assert.equal(last.hasMore, false);
});
test('empty and duplicate-only pages stop without deleting previously loaded cards', () => {
  const cards = batch(1, 30);
  for (const next of [[], cards]) {
    const result = merge(cards, next, 2, 1000);
    assert.deepEqual(result.cards, cards);
    assert.equal(result.hasMore, false);
  }
});
test('filter reset replaces previous cards and count completion stops paging', () => {
  const result = merge(batch(1, 30), batch(51, 30), 1, 30);
  assert.deepEqual(result.cards, batch(51, 30));
  assert.equal(result.hasMore, false);
});
test('firmware retains fourteen fetched rows for the twelve-row display and manual paging', () => {
  const result = merge([], batch(1, 14), 1, 40, true);
  assert.equal(result.cards.length, 14);
  assert.equal(result.hasMore, false);
});
