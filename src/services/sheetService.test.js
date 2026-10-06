const test = require('node:test');
const assert = require('node:assert/strict');
const configPath = require.resolve('../config/googleSheets');
const writes = [];
const client = { spreadsheets: { values: {
  get: async ({ range }) => ({ data: { values: range.endsWith('!A2:H')
    ? [['A-001', 'Owner', 'No', 'Dec-2025', '300', '10', '3000', '123']]
    : [] } }),
  batchUpdate: async (request) => { writes.push(request); }
} } };
require.cache[configPath] = { id: configPath, filename: configPath, loaded: true,
  exports: { getSheetsClient: () => client, getSpreadsheetId: () => 'test-sheet' } };
const { updateFlat } = require('./sheetService');

test('payment from the app writes the new month and its audit log together', async () => {
  writes.length = 0;
  await updateFlat('A-001', { lastPaidMonth: '01/1/2026' });
  assert.equal(writes.length, 1);
  const data = writes[0].requestBody.data;
  assert.equal(data.length, 2);
  assert.match(data[0].range, /!D2$/);
  assert.deepEqual(data[0].values, [['01/1/2026']]);
  assert.deepEqual(data[1].values[0].slice(0, 5),
    ['A-001', 'payment', 'lastPaidMonth', 'Dec-2025', '01/1/2026']);
});

test('equivalent paid months do not write or create payment logs', async () => {
  writes.length = 0;
  await updateFlat('A-001', { lastPaidMonth: '12/1/2025' });
  assert.equal(writes.length, 0);
});

test('owner and contact updates preserve the paid month and calculated fields', async () => {
  writes.length = 0;
  await updateFlat('A-001', { ownerName: 'New owner', contact: '' });
  const data = writes[0].requestBody.data;
  assert.equal(data.length, 4);
  assert.match(data[0].range, /!B2$/);
  assert.match(data[1].range, /!H2$/);
  assert.deepEqual(data[1].values, [['']]);
});

test('invalid dates fail before any sheet writes', async () => {
  writes.length = 0;
  await assert.rejects(updateFlat('A-001', { lastPaidMonth: 'invalid' }),
    { status: 400 });
  assert.equal(writes.length, 0);
});
