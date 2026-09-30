const {
  getSheetsClient,
  getSpreadsheetId
} = require('../config/googleSheets');

const userSheetName = process.env.USER_SHEET_NAME || 'user';
const flatSheetName = process.env.FLAT_SHEET_NAME || 'Sheet1';

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
    role: String(user[3] || '').trim()
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
  const rows = await getValues(`${flatSheetName}!A2:A`);
  const prefix = `${normalizedSeries}-`;
  const flats = rows
    .map((row) => String(row[0] || '').trim())
    .filter((flat) => flat.toUpperCase().startsWith(prefix));

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

async function updateFlat(flatNo, updates) {
  const { rowNumber } = await findFlat(flatNo);
  const isRental = String(updates.isRental || '').trim();

  if (isRental && !['YES', 'NO'].includes(isRental.toUpperCase())) {
    throw createError(400, 'Is Rental must be Yes or No');
  }

  const data = [
    { range: `${flatSheetName}!B${rowNumber}`, values: [[String(updates.ownerName || '').trim()]] },
    { range: `${flatSheetName}!C${rowNumber}`, values: [[isRental]] },
    { range: `${flatSheetName}!D${rowNumber}`, values: [[String(updates.lastPaidMonth || '').trim()]] },
    { range: `${flatSheetName}!H${rowNumber}`, values: [[String(updates.contact || '').trim()]] }
  ];

  await getSheetsClient().spreadsheets.values.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data
    }
  });

  return { flatNo: String(flatNo).trim() };
}

module.exports = {
  login,
  getSummary,
  getFlats,
  findFlat,
  updateFlat
};
