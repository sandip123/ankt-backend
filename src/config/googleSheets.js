const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
let sheetsClient;

function getSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const authOptions = {
    scopes
  };

  if (credentials) {
    authOptions.credentials = JSON.parse(credentials);
  } else {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
      || path.resolve(process.cwd(), 'credentials', 'service-account.json');

    if (!fs.existsSync(keyFile)) {
      const error = new Error(`Google credentials file not found: ${keyFile}`);
      error.status = 500;
      error.publicMessage = 'Google service-account credentials are not configured';
      error.expose = true;
      throw error;
    }

    authOptions.keyFile = keyFile;
  }

  const auth = new google.auth.GoogleAuth(authOptions);
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function getSpreadsheetId() {
  if (!process.env.SPREADSHEET_ID) {
    const error = new Error('SPREADSHEET_ID is not configured');
    error.status = 500;
    error.publicMessage = 'Spreadsheet is not configured';
    throw error;
  }

  return process.env.SPREADSHEET_ID;
}

module.exports = {
  getSheetsClient,
  getSpreadsheetId
};
