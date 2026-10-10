const test = require('node:test');
const assert = require('node:assert/strict');
const configPath = require.resolve('../config/googleSheets');
const writes = [];
let logRows = [];
const client = { spreadsheets: { values: {
  get: async ({ range }) => ({ data: { values: range.endsWith('!A2:H')
    ? [['A-001', 'Owner', 'No', 'Dec-2025', '300', '10', '3000', '123']]
    : range.endsWith('!A2:G') ? logRows : [] } }),
  batchUpdate: async (request) => { writes.push(request); }
} } };
require.cache[configPath] = { id: configPath, filename: configPath, loaded: true,
  exports: { getSheetsClient: () => client, getSpreadsheetId: () => 'test-sheet' } };
const { getFlatLogs, updateFlat } = require('./sheetService');

test('flat logs return the expected shape with payment entries and no other entries', async () => {
  logRows = [
    ['A-001', 'payment', 'lastPaidMonth', 'Dec-2025', '01/1/2026', '2026-10-10T10:00:00.000Z', 'Admin'],
    ['A-001', 'payment', 'receipt_no', '', 'RCPT-42', '2026-10-10T10:00:00.000Z', 'Admin'],
    ['A-001', 'other', 'ownerName', 'Old owner', 'New owner', '2026-10-10T10:00:00.000Z', 'Admin']
  ];
  const result = await getFlatLogs('A-001');
  assert.deepEqual(result, {
    flatNo: 'A-001',
    paymentLog: [
      {
        type: 'payment',
        field: 'lastPaidMonth',
        previousValue: 'Dec-2025',
        newValue: '01/1/2026',
        updatedAt: '2026-10-10T10:00:00.000Z',
        updatedBy: 'Admin'
      },
      {
        type: 'payment',
        field: 'receipt_no',
        previousValue: '',
        newValue: 'RCPT-42',
        updatedAt: '2026-10-10T10:00:00.000Z',
        updatedBy: 'Admin'
      }
    ],
    otherLog: []
  });
  logRows = [];
});

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

test('payment receipt is only logged with the last paid month update', async () => {
  writes.length = 0;
  await updateFlat('A-001', { lastPaidMonth: '01/1/2026', receipt_no: 'RCPT-42' });
  const data = writes[0].requestBody.data;
  assert.equal(data.length, 3);
  assert.deepEqual(data[1].values[0].slice(0, 5),
    ['A-001', 'payment', 'lastPaidMonth', 'Dec-2025', '01/1/2026']);
  assert.deepEqual(data[2].values[0].slice(0, 5),
    ['A-001', 'payment', 'receipt_no', '', 'RCPT-42']);
  assert.equal(data[1].values[0][5], data[2].values[0][5]);
  assert.equal(data.some(({ range }) => /receipt_no/i.test(range)), false);
});

test('equivalent paid months do not write or create payment logs', async () => {
  writes.length = 0;
  await updateFlat('A-001', { lastPaidMonth: '12/1/2025' });
  assert.equal(writes.length, 0);
});

test('owner and contact updates do not create other logs', async () => {
  writes.length = 0;
  await updateFlat('A-001', { ownerName: 'New owner', contact: '' });
  const data = writes[0].requestBody.data;
  assert.equal(data.length, 2);
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
