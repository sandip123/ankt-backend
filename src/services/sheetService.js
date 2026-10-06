const {
  getSheetsClient,
  getSpreadsheetId
} = require('../config/googleSheets');
const {
  getCurrentMonthPaymentSummary
} = require('./paymentSummary');
const { normalizeMonth } = require('./month');

const userSheetName = process.env.USER_SHEET_NAME || 'user';
const flatSheetName = process.env.FLAT_SHEET_NAME || 'Sheet1';
const logSheetName = process.env.LOG_SHEET_NAME || 'Sheet2';

function createError(status, publicMessage) {
  const error = new Error(publicMessage);
  error.status = status;
  error.publicMessage = publicMessage;
  return error;
}

async function getValues(range, valueRenderOption = 'FORMATTED_VALUE') {
  try {
    const response = await getSheetsClient().spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range,
      valueRenderOption
    });

    return response.data.values || [];
  } catch (error) {
    if (error.status === 404) {
      throw createError(404, 'Sheet not found');
    }

    throw error;
  }
}

async function login(username, password) {
  const users = await getValues(`${userSheetName}!A2:D`);
  const flatRows = await getValues(`${flatSheetName}!A2:H`);

  const user = users.find((row) => {
    const sheetUsername = String(row[1] || '').trim();
    const sheetPassword = String(row[2] || '').trim();

    return sheetUsername.toLowerCase() === username.toLowerCase()
      && sheetPassword === password;
  });

  if (!user) {
    throw createError(401, 'Invalid username or password');
  }

  return {
    id: user[0] || '',
    username: String(user[1] || '').trim(),
    role: String(user[3] || '').trim(),
    ...getCurrentMonthPaymentSummary(flatRows)
  };
}

async function getSummary() {
  const rows = await getValues(`${flatSheetName}!J6:K9`);

  return {
    totalPending: rows[0]?.[1] || '',
    ifChargePenalty: rows[2]?.[1] || '',
    penalty: rows[3]?.[1] || ''
  };
}

function validateSeries(series) {
  const normalizedSeries = String(series || '').trim().toUpperCase();
  const allowedSeries = ['A', 'B1', 'B2', 'SA'];

  if (!normalizedSeries) {
    throw createError(400, 'Series is required');
  }

  if (!allowedSeries.includes(normalizedSeries)) {
    throw createError(400, 'Invalid series');
  }

  return normalizedSeries;
}

async function getFlats(series) {
  const normalizedSeries = validateSeries(series);
  const rows = await getValues(`${flatSheetName}!A2:H`);
  const prefix = `${normalizedSeries}-`;
  const flats = rows
    .map((row) => ({
      flatName: String(row[0] || '').trim(),
      ownerName: String(row[1] || '').trim(),
      isRental: String(row[2] || '').trim(),
      pendingMonths: row[5] || '',
      contact: String(row[7] || '').trim()
    }))
    .filter((flat) => flat.flatName.toUpperCase().startsWith(prefix));

  return {
    series: normalizedSeries,
    count: flats.length,
    flats
  };
}

async function findFlat(flatNo) {
  const normalizedFlatNo = String(flatNo || '').trim();

  if (!normalizedFlatNo) {
    throw createError(400, 'Flat number is required');
  }

  const rows = await getValues(`${flatSheetName}!A2:H`);
  const rowIndex = rows.findIndex((row) => (
    String(row[0] || '').trim().toUpperCase() === normalizedFlatNo.toUpperCase()
  ));

  if (rowIndex === -1) {
    throw createError(404, 'Flat not found');
  }

  return {
    rowNumber: rowIndex + 2,
    flat: {
      flatNo: rows[rowIndex][0] || '',
      ownerName: rows[rowIndex][1] || '',
      isRental: rows[rowIndex][2] || '',
      lastPaidMonth: rows[rowIndex][3] || '',
      monthlyAmount: rows[rowIndex][4] || '',
      pendingMonth: rows[rowIndex][5] || '',
      pendingAmount: rows[rowIndex][6] || '',
      contact: rows[rowIndex][7] || ''
    }
  };
}

function createLogEntry(type, field, previousValue, newValue, updatedBy) {
  return [
    String(type || '').trim(),
    String(field || '').trim(),
    String(previousValue || '').trim(),
    String(newValue || '').trim(),
    new Date().toISOString(),
    String(updatedBy || '').trim() || 'System'
  ];
}

async function getFlatLogs(flatNo) {
  const normalizedFlatNo = String(flatNo || '').trim();
  const rows = await getValues(`${logSheetName}!A2:G`);
  const logRows = rows.filter((row) => (
    String(row[0] || '').trim().toUpperCase() === normalizedFlatNo.toUpperCase()
  ));
  const paymentLog = logRows
    .filter((row) => String(row[0] || '').trim().toUpperCase() === normalizedFlatNo.toUpperCase()
      && String(row[1] || '').trim().toLowerCase() === 'payment')
    .map((row) => ({
      type: row[1],
      field: row[2],
      previousValue: row[3],
      newValue: row[4],
      updatedAt: row[5],
      updatedBy: row[6]
    }));
  const otherLog = logRows
    .filter((row) => String(row[0] || '').trim().toUpperCase() === normalizedFlatNo.toUpperCase()
      && String(row[1] || '').trim().toLowerCase() === 'other')
    .map((row) => ({
      type: row[1],
      field: row[2],
      previousValue: row[3],
      newValue: row[4],
      updatedAt: row[5],
      updatedBy: row[6]
    }));

  return {
    flatNo: normalizedFlatNo,
    paymentLog,
    otherLog
  };
}

async function updateFlat(flatNo, updates) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw createError(400, 'Flat updates are required');
  }
  const { rowNumber, flat } = await findFlat(flatNo);
  const isRental = String(updates.isRental || '').trim();
  if (updates.lastPaidMonth !== undefined && updates.lastPaidMonth !== null
    && !normalizeMonth(updates.lastPaidMonth)) {
    throw createError(400, 'Last paid month must be a valid month and year');
  }

  if (isRental && !['YES', 'NO'].includes(isRental.toUpperCase())) {
    throw createError(400, 'Is Rental must be Yes or No');
  }

  const fields = [
    { column: 'B', field: 'ownerName', value: String(updates.ownerName || '').trim(), previousValue: flat.ownerName },
    { column: 'C', field: 'isRental', value: isRental, previousValue: flat.isRental },
    { column: 'D', field: 'lastPaidMonth', value: String(updates.lastPaidMonth || '').trim(), previousValue: flat.lastPaidMonth },
    { column: 'E', field: 'monthlyAmount', value: String(updates.monthlyAmount || '').trim(), previousValue: flat.monthlyAmount },
    { column: 'F', field: 'pendingMonth', value: String(updates.pendingMonth || '').trim(), previousValue: flat.pendingMonth },
    { column: 'G', field: 'pendingAmount', value: String(updates.pendingAmount || '').trim(), previousValue: flat.pendingAmount },
    { column: 'H', field: 'contact', value: String(updates.contact || '').trim(), previousValue: flat.contact }
  ];

  const data = [];
  const logEntries = [];

  fields.forEach(({ column, field, value, previousValue }) => {
    if (updates[field] === undefined || updates[field] === null) {
      return;
    }

    const normalizedValue = String(value).trim();
    const normalizedPreviousValue = String(previousValue || '').trim();
    const valuesAreEqual = field === 'lastPaidMonth'
      ? Boolean(normalizeMonth(normalizedValue))
        && normalizeMonth(normalizedValue) === normalizeMonth(normalizedPreviousValue)
      : normalizedValue === normalizedPreviousValue;

    if (valuesAreEqual) {
      return;
    }

    data.push({ range: `${flatSheetName}!${column}${rowNumber}`, values: [[normalizedValue]] });
    logEntries.push(createLogEntry(
      field === 'lastPaidMonth' || field === 'monthlyAmount' ? 'payment' : 'other',
      field,
      normalizedPreviousValue,
      normalizedValue,
      updates.updatedBy
    ));
  });

  if (data.length > 0) {
    const logRows = await getValues(`${logSheetName}!A2:G`);
    const nextLogRow = logRows.length + 2;
    logEntries.forEach((entry, index) => {
      data.push({
        range: `${logSheetName}!A${nextLogRow + index}:G${nextLogRow + index}`,
        values: [[flat.flatNo, ...entry]]
      });
    });

    await getSheetsClient().spreadsheets.values.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data
      }
    });
  }

  return { flatNo: String(flatNo).trim() };
}

module.exports = {
  login,
  getSummary,
  getFlats,
  findFlat,
  updateFlat,
  getFlatLogs
};
