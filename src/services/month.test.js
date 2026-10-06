const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeMonth } = require('./month');

test('normalizes common month formats', () => {
  assert.equal(normalizeMonth('2026-10'), '2026-10');
  assert.equal(normalizeMonth('10/2026'), '2026-10');
  assert.equal(normalizeMonth('Oct 2026'), '2026-10');
  assert.equal(normalizeMonth('October 2026'), '2026-10');
  assert.equal(normalizeMonth('Oct-2026'), '2026-10');
  assert.equal(normalizeMonth('10/1/2026'), '2026-10');
  assert.equal(normalizeMonth('09/1/2026'), '2026-09');
});

test('returns an empty value for invalid or missing months', () => {
  assert.equal(normalizeMonth(''), '');
  assert.equal(normalizeMonth('not-a-month'), '');
  assert.equal(normalizeMonth('13/1/2026'), '');
  assert.equal(normalizeMonth('10/2/2026'), '');
  assert.equal(normalizeMonth('Oct-0000'), '');
});
