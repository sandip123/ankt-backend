const { google } = require('googleapis');

const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
let sheetsClient;

function getMissingConfig() {
  return [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'SPREADSHEET_ID'
  ].filter((name) => !process.env[name]);
}

function createConfigError(missing) {
  const error = new Error(`Missing Google Sheets configuration: ${missing.join(', ')}`);
  error.status = 500;
  error.publicMessage = `Google Sheets configuration is missing: ${missing.join(', ')}`;
  error.expose = true;
  return error;
}

function getSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  const missing = getMissingConfig();
  if (missing.length > 0) {
    throw createConfigError(missing);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      project_id: process.env.GOOGLE_PROJECT_ID,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function getSpreadsheetId() {
  if (!process.env.SPREADSHEET_ID) {
    throw createConfigError(['SPREADSHEET_ID']);
  }

  return process.env.SPREADSHEET_ID;
}

module.exports = {
  getSheetsClient,
  getSpreadsheetId,
  getMissingConfig
};
