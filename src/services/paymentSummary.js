function getMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthPaymentTotals(rows, month) {
  const totals = {
    rentalPayment: 0,
    nonRentPayment: 0,
    totalPayment: 0
  };

  rows.forEach((row) => {
    const paymentMonth = String(row[3] || '').trim();
    if (paymentMonth !== month) {
      return;
    }

    const amount = Number(row[4]);
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
  const currentMonth = getMonthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = getMonthKey(lastMonthDate);
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
