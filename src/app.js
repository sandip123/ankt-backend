require('dotenv').config();

const https = require('https');
const cors = require('cors');
const express = require('express');
const { getMissingConfig } = require('./config/googleSheets');
const apiRoutes = require('./routes');

const app = express();
const port = process.env.PORT || 3000;
const FLAT_STATUS_URL = 'https://ankt-backend.onrender.com/api/flats/A-001';

function pingFlatStatusEndpoint() {
  https.get(FLAT_STATUS_URL, (res) => {
    let responseBody = '';

    res.on('data', (chunk) => {
      responseBody += chunk;
    });

    res.on('end', () => {
      console.log(`[scheduler] GET ${FLAT_STATUS_URL} -> ${res.statusCode}`);

      if (res.statusCode >= 400) {
        console.error(`[scheduler] Flat API error: ${res.statusCode} ${responseBody.slice(0, 200)}`);
      }
    });
  }).on('error', (error) => {
    console.error('[scheduler] Failed to call flat status API:', error.message);
  });
}

const missingConfig = getMissingConfig();
if (missingConfig.length > 0) {
  console.error(`Missing required environment variables: ${missingConfig.join(', ')}`);
}

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Anatkrupa Society API is running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number(error.status) || 500;
  const message = error.expose
    ? error.publicMessage
    : status === 500
      ? 'Server error'
      : error.publicMessage || error.message;

  res.status(status).json({
    success: false,
    message
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`ANKT backend listening on port ${port}`);
    pingFlatStatusEndpoint();
    setInterval(pingFlatStatusEndpoint, 9 * 60 * 1000);
  });
}

module.exports = app;