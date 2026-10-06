const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getCurrentMonthPaymentSummary
} = require('./paymentSummary');

test('calculates current-month and last-month rental, non-rent, and total payments', () => {
  const rows = [
    ['A-001', 'Owner', 'YES', '2026-10', '1000', '', '', '', '', '', '', ''],
    ['A-002', 'Owner', 'NO', '2026-10', '250', '', '', '', '', '', '', ''],
    ['A-003', 'Owner', 'YES', '2026-09', '500', '', '', '', '', '', '', ''],
    ['A-004', 'Owner', 'NO', '2026-09', '150', '', '', '', '', '', '', ''],
    ['A-005', 'Owner', 'NO', '2026-11', '300', '', '', '', '', '', '', '']
  ];

  assert.deepEqual(
    getCurrentMonthPaymentSummary(rows, new Date('2026-10-15T12:00:00Z')),
    {
      currentMonthNonRentPayment: 250,
      currentMonthRentalPayment: 1000,
      currentMonthTotalPayment: 1250,
      lastMonthNonRentPayment: 150,
      lastMonthRentalPayment: 500,
      lastMonthTotalPayment: 650
    }
  );
});

test('returns zero payment totals when no flat has a payment for the month', () => {
  const rows = [
    ['A-001', 'Owner', 'YES', '2026-11', '1000', '', '', '', '', '', '', '']
  ];

  assert.deepEqual(
    getCurrentMonthPaymentSummary(rows, new Date('2026-10-15T12:00:00Z')),
    {
      currentMonthNonRentPayment: 0,
      currentMonthRentalPayment: 0,
      currentMonthTotalPayment: 0,
      lastMonthNonRentPayment: 0,
      lastMonthRentalPayment: 0,
      lastMonthTotalPayment: 0
    }
  );
});
