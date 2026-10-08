const { normalizeMonth } = require('./month');

function getMonthPaymentTotals(rows, month) {
  const totals = {
    rentalPayment: 0,
    nonRentPayment: 0,
    totalPayment: 0
  };

  rows.forEach((row) => {
    const paymentMonth = normalizeMonth(row[3]);
    if (paymentMonth !== month) {
      return;
    }

    const amount = Number(String(row[4] ?? '').replace(/,/g, '').trim());
    if (!Number.isFinite(amount) || amount < 0) {
      return;
    }

    if (String(row[2] || '').trim().toUpperCase() === 'NO') {
      totals.nonRentPayment += amount;
    } else if (String(row[2] || '').trim().toUpperCase() === 'YES') {
      totals.rentalPayment += amount;
    }
  });

  totals.totalPayment = totals.rentalPayment + totals.nonRentPayment;
  return totals;
}

function getCurrentMonthPaymentSummary(rows, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit'
  }).formatToParts(now);
  const year = Number(parts.find(part => part.type === 'year').value);
  const month = Number(parts.find(part => part.type === 'month').value);
  const currentMonth = `${year}-${String(month).padStart(2, '0')}`;
  const lastMonth = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}`;
  const current = getMonthPaymentTotals(rows, currentMonth);
  const last = getMonthPaymentTotals(rows, lastMonth);

  return {
    currentMonthRentalPayment: current.rentalPayment,
    currentMonthNonRentPayment: current.nonRentPayment,
    currentMonthTotalPayment: current.totalPayment,
    lastMonthRentalPayment: last.rentalPayment,
    lastMonthNonRentPayment: last.nonRentPayment,
    lastMonthTotalPayment: last.totalPayment
  };
}

module.exports = {
  getCurrentMonthPaymentSummary
};
